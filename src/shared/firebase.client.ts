import { initializeApp } from "firebase/app";
import { CustomProvider, getToken, initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from "firebase/app-check";
import { browserLocalPersistence, getAuth, initializeAuth, setPersistence } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, type Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBIyST2glGpq6guZ8-yTlegn_wGRTeKw8s",
    authDomain: "voes-a88f4.firebaseapp.com",
    projectId: "voes-a88f4",
    storageBucket: "voes-a88f4.firebasestorage.app",
    messagingSenderId: "79915571390",
    appId: "1:79915571390:web:fe7659ef2933e1167826ef",
    measurementId: "G-2THWFQZF51"
};

const app = initializeApp(firebaseConfig);
export const isDesktopAuth = typeof window !== 'undefined'
    && Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

const appCheckSiteKey = String(import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || '').trim();
const appCheckWorkerUrl = String(import.meta.env.VITE_ACCESS_WORKER_URL || 'https://auth.gandr.site').trim().replace(/\/$/, '');
const firebaseAppId = firebaseConfig.appId;
let appCheckInstance: AppCheck | null = null;

type DesktopAppCheckKeyMaterial = { privateKey: JsonWebKey; publicKey: JsonWebKey };
const DESKTOP_APPCHECK_KEY_STORAGE = 'jlj.desktop.app-check-key.v1';

async function getDesktopAppCheckKeyMaterial(): Promise<DesktopAppCheckKeyMaterial> {
    const stored = window.localStorage.getItem(DESKTOP_APPCHECK_KEY_STORAGE);
    if (stored) {
        try {
            const parsed = JSON.parse(stored) as DesktopAppCheckKeyMaterial;
            if (parsed.privateKey?.kty === 'EC' && parsed.publicKey?.kty === 'EC') return parsed;
        } catch { /* Generate a new key below. */ }
    }
    const pair = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']
    ) as CryptoKeyPair;
    const material = {
        privateKey: await crypto.subtle.exportKey('jwk', pair.privateKey),
        publicKey: await crypto.subtle.exportKey('jwk', pair.publicKey)
    } satisfies DesktopAppCheckKeyMaterial;
    window.localStorage.setItem(DESKTOP_APPCHECK_KEY_STORAGE, JSON.stringify(material));
    return material;
}

async function getDesktopAppCheckToken() {
    const keyMaterial = await getDesktopAppCheckKeyMaterial();
    const privateKey = await crypto.subtle.importKey(
        'jwk', keyMaterial.privateKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
    );
    const requestToken = async (body: Record<string, unknown>) => {
        const response = await fetch(`${appCheckWorkerUrl}/v1/app-check/token`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        const payload = await response.json().catch(() => ({})) as {
            challenge?: string; token?: string; expiresAt?: number; error?: string;
        };
        if (!response.ok) throw new Error(payload.error || `App Check token request failed (${response.status})`);
        return payload;
    };
    const platform = navigator.userAgent.includes('Windows') ? 'windows' : 'macos';
    const base = { appId: firebaseAppId, platform, publicKey: keyMaterial.publicKey };
    const challengeResponse = await requestToken(base);
    if (!challengeResponse.challenge) throw new Error('App Check challenge was not returned.');
    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(challengeResponse.challenge)
    );
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    const tokenResponse = await requestToken({ ...base, challenge: challengeResponse.challenge, signature: signatureBase64 });
    if (!tokenResponse.token || !Number.isFinite(tokenResponse.expiresAt)) throw new Error('App Check token response is invalid.');
    return { token: tokenResponse.token, expireTimeMillis: tokenResponse.expiresAt * 1000 };
}

// The packaged Tauri WebView uses the custom `tauri://localhost` origin, which
// is not a browser domain that reCAPTCHA Enterprise can attest. Firebase Auth
// would then fail its credential request with auth/network-request-failed.
// Desktop authentication uses the native OAuth PKCE flow, while the Firebase
// SDK still receives a token from the desktop custom provider below. Browser
// builds keep the existing reCAPTCHA Enterprise protection.
if (typeof window !== 'undefined' && isDesktopAuth) {
    appCheckInstance = initializeAppCheck(app, {
        provider: new CustomProvider({ getToken: getDesktopAppCheckToken }),
        isTokenAutoRefreshEnabled: true
    });
} else if (typeof window !== 'undefined' && appCheckSiteKey) {
    // A development token must be registered for this exact Firebase app.
    // It is never enabled in production builds.
    if (import.meta.env.DEV) {
        const appCheckDebugToken = String(import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN || '').trim();
        (self as typeof self & { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string }).FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugToken || true;
    }

    appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true
    });
}

// Only access-changing Worker calls use this token. A missing or invalid token
// must never result in the Worker granting an entitlement.
export async function getFirebaseAppCheckToken(): Promise<string | null> {
    if (!appCheckInstance) return null;
    try {
        const result = await getToken(appCheckInstance, false);
        return result.token || null;
    } catch (error) {
        console.warn('[Firebase] Unable to obtain an App Check token:', error);
        return null;
    }
}

// Native OAuth receives a Google credential through a system deep link.
// getAuth() also installs the browser popup/redirect resolver, which starts a
// cross-origin iframe proactively in Safari/WKWebView. That iframe is not part
// of native sign-in and can block Auth initialization on a custom-scheme origin.
// Keep the same local persistence so existing desktop sessions are preserved.
export const auth = isDesktopAuth
    ? initializeAuth(app, { persistence: browserLocalPersistence })
    : getAuth(app);
let dbInstance: Firestore;

if (typeof window !== 'undefined') {
    try {
        dbInstance = initializeFirestore(app, {
            localCache: persistentLocalCache(),
            experimentalAutoDetectLongPolling: true
        });
    } catch (error) {
        // Another Firebase module may have initialized Firestore first, or
        // the current WebView may not support IndexedDB persistence.
        console.warn('[Firebase] Persistent Firestore cache unavailable:', error);
        dbInstance = getFirestore(app);
    }
} else {
    dbInstance = getFirestore(app);
}

export const db = dbInstance;
export const fireStorage = getStorage(app);

// Keep an already authenticated operator signed in across app restarts.
// This is intentionally only the Firebase session; offline entitlement is
// handled separately and is restored only for this persisted user.
if (typeof window !== 'undefined' && !isDesktopAuth) {
    void setPersistence(auth, browserLocalPersistence).catch((error) => {
        console.warn('[Firebase] Unable to enable local auth persistence:', error);
    });
}
