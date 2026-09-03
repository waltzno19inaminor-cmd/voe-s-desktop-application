import { initializeApp } from "firebase/app";
import { getToken, initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from "firebase/app-check";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
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
const appCheckSiteKey = String(import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || '').trim();
let appCheckInstance: AppCheck | null = null;

if (typeof window !== 'undefined' && appCheckSiteKey) {
    if (import.meta.env.DEV) {
        (self as typeof self & { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true
    });
}

// Access-changing requests send this token to the Worker. The Worker can be
// configured to fail closed when it is absent or invalid, which prevents a
// Firebase ID token alone from being enough to mint a free/trial entitlement.
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

export const auth = getAuth(app);
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
if (typeof window !== 'undefined') {
    void setPersistence(auth, browserLocalPersistence).catch((error) => {
        console.warn('[Firebase] Unable to enable local auth persistence:', error);
    });
}
