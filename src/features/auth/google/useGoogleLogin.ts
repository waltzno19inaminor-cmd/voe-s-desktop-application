import { useAuthStore } from "~/entities/user/auth.store";
import { auth as firebaseAuth, db } from "~/shared/firebase.client";
import { GoogleAuthProvider, signInWithPopup, signInWithCredential } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

import { open } from '@tauri-apps/plugin-shell';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';

export const googleLogin = async () => {
  const auth = useAuthStore()
  auth.setLoading(true)

  try {
    // Check if running in Tauri
    const isTauri = !!(window as any).__TAURI__

    if (isTauri) {
      try {
        auth.setError("Debug: Initializing Deep Link Login...")
        console.log("Starting Google Deep Link Login...")
        
        // 1. Configuration
        // IMPORTANT: You must add this redirect URI to Google Console: com.voe.app://google-auth
        const clientId = "YOUR_GOOGLE_CLIENT_ID_HERE"; 
        
        if (clientId === "YOUR_GOOGLE_CLIENT_ID_HERE") {
            const msg = "CONFIGURATION ERROR: You must replace 'YOUR_GOOGLE_CLIENT_ID_HERE' in src/features/auth/google/useGoogleLogin.ts with your actual Google Client ID.";
            console.error(msg);
            auth.setError(msg);
            throw new Error(msg);
        }

        const redirectUri = "com.voe.app://google-auth"; 
        console.log("Using Redirect URI:", redirectUri); // Debug Log 
        const scope = "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid";
        const responseType = "code"; 
        
        // 2. Setup Listener BEFORE opening browser
        auth.setError("Debug: Setting up Deep Link listener...")
        
        const codePromise = new Promise<string>((resolve, reject) => {
            const unlistenPromise = onOpenUrl((urls) => {
                console.log("Deep Link received:", urls);
                auth.setError("Debug: Deep link received! Processing...");
                
                for (const url of urls) {
                    if (url.startsWith("com.voe.app://")) {
                        const urlObj = new URL(url);
                        const code = urlObj.searchParams.get("code");
                        if (code) {
                            resolve(code);
                            return; // Stop processing
                        }
                    }
                }
                // If loop finishes without code, we might keep waiting or reject? 
                // For now, keep waiting.
            });
            
            // Timeout after 60 seconds
            setTimeout(() => {
                reject(new Error("Login timed out. Did you approve the app?"));
            }, 60000);
        });

        // 3. Open Browser
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${encodeURIComponent(scope)}`;
        console.log("Opening URL:", authUrl);
        auth.setError("Debug: Opening Browser...")
        await open(authUrl);
        
        // 4. Wait for code
        auth.setError("Debug: Waiting for you to login in browser...")
        const code = await codePromise;
        auth.setError(`Debug: Got code. Exchanging...`)

        // 5. Exchange Code for Token
        const tokenUrl = "https://oauth2.googleapis.com/token";
        const response = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code: code,
                client_id: clientId,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Token exchange failed: ${errText}`);
        }

        const data = await response.json();
        const { id_token, access_token } = data;

        // 6. Sign in with Credential
        const credential = GoogleAuthProvider.credential(id_token, access_token);
        const result = await signInWithCredential(firebaseAuth, credential);
        const user = result.user;

         auth.setUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            joinedAt: user.metadata.creationTime
        })

        await ensureUserDocument(user)
        auth.setError(null); // Clear debug messages on success at the very end (or let redirect handle it)

      } catch (e: any) {
        console.error("Google Deep Link Login Error:", e)
        auth.setError("Login failed: " + e.message)
        throw e
      }
    } else {
       const provider = new GoogleAuthProvider()
       // Use popup for web
       const result = await signInWithPopup(firebaseAuth, provider)
       const user = result.user
       
       auth.setUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        joinedAt: user.metadata.creationTime
      })

      await ensureUserDocument(user)
    }

  } catch (error: any) {
    auth.setError(error.message)
  } finally {
    auth.setLoading(false)
  }
}


export async function ensureUserDocument(user: any) {
  const userRef = doc(db, 'users', user.uid)
  const snap = await getDoc(userRef)

  if (!snap.exists()) {
    await setDoc(userRef, {
      displayName: user.displayName || user.email,
      email: user.email,
      photoURL: user.photoURL || null,
      role: 'member',
      joinedAt: serverTimestamp()
    })
  }
}
