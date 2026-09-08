import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';

// Run the real browser Firebase Auth SDK with a WKWebView-like custom origin.
// Network and browser-only popup DOM are unavailable, as they can be in .app.
const { outputFiles } = await build({
  stdin: {
    contents: `
      export { auth } from './src/shared/firebase.client.ts';
      export { onAuthStateChanged, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'iife',
  globalName: 'fixture',
  define: { 'import.meta.env': '{}' },
  plugins: [{
    name: 'optional-regression-baseline',
    setup(plugin) {
      if (!process.argv.includes('--previous')) return;
      plugin.onLoad({ filter: /firebase\.client\.ts$/ }, () => ({
        contents: execFileSync('git', ['show', 'HEAD:src/shared/firebase.client.ts'], { encoding: 'utf8' }),
        loader: 'ts',
      }));
    },
  }, {
    name: 'unrelated-firebase-services',
    setup(plugin) {
      plugin.onResolve({ filter: /^firebase\/(firestore|storage)$/ }, args => ({ path: args.path, namespace: 'stub' }));
      plugin.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: `
        export const getFirestore = () => ({});
        export const initializeFirestore = () => ({});
        export const persistentLocalCache = () => ({});
        export const getStorage = () => ({});
      ` }));
    },
  }],
});

let domRequests = 0;
let networkRequests = 0;
let allowFixtureCredential = false;
const now = Math.floor(Date.now() / 1000);
const fixtureToken = ['header', Buffer.from(JSON.stringify({ sub: 'fixture-user', iat: now, exp: now + 3600, auth_time: now })).toString('base64url'), 'signature'].join('.');
const stored = new Map();
const context = vm.createContext({
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  URL, URLSearchParams, TextEncoder, TextDecoder,
  crypto: webcrypto,
  btoa, atob,
  location: { href: 'tauri://localhost/', protocol: 'tauri:', hostname: 'localhost' },
  navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15', onLine: true },
  __TAURI_INTERNALS__: {},
  addEventListener() {}, removeEventListener() {},
  localStorage: {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
    removeItem: key => stored.delete(key),
  },
  document: {
    visibilityState: 'visible',
    createElement() { domRequests++; throw new Error('Browser popup iframe is unavailable in this fixture'); },
  },
  fetch: async url => {
    networkRequests++;
    if (allowFixtureCredential) {
      const body = url.includes('accounts:lookup')
        ? { users: [{ localId: 'fixture-user', email: 'fixture@example.test', emailVerified: true, providerUserInfo: [{ providerId: 'google.com', rawId: 'fixture-google' }] }] }
        : { localId: 'fixture-user', idToken: fixtureToken, refreshToken: 'fixture-refresh', expiresIn: '3600', providerId: 'google.com' };
      return { ok: true, json: async () => body };
    }
    return { ok: false, json: async () => ({ error: { message: 'INVALID_IDP_RESPONSE' } }) };
  },
});
vm.runInContext('window = globalThis; self = globalThis;', context);
vm.runInContext(outputFiles[0].text, context);
const { auth, onAuthStateChanged, GoogleAuthProvider, signInWithCredential } = context.fixture;
const deadline = setTimeout(() => { console.error('Desktop auth initialization hung'); process.exit(1); }, 5000);
try {
  await new Promise(resolve => {
    const stop = onAuthStateChanged(auth, user => { assert.equal(user, null); stop(); resolve(); });
  });
  await assert.rejects(signInWithCredential(auth, GoogleAuthProvider.credential('test-only-invalid-token')),
    error => error.code === 'auth/invalid-credential');
  assert.equal(networkRequests, 1, 'Credential exchange must reach Firebase instead of waiting on a popup iframe');
  assert.equal(domRequests, 0, 'Native sign-in must not load browser popup/redirect DOM');
  assert.equal(auth.currentUser, null, 'Invalid credentials must not authenticate');
  allowFixtureCredential = true;
  const result = await signInWithCredential(auth, GoogleAuthProvider.credential('fixture-google-token'));
  assert.equal(result.user.uid, 'fixture-user');
  assert.equal(auth.currentUser.uid, 'fixture-user');
  assert.ok([...stored.keys()].some(key => key.startsWith('firebase:authUser:')), 'Desktop session must persist in localStorage');
  assert.equal(domRequests, 0);
  console.log('PASS: desktop Auth initializes on tauri://localhost without popup DOM, rejects invalid credentials, and completes/persists a sign-in with a simulated Firebase response.');
} finally {
  clearTimeout(deadline);
}
