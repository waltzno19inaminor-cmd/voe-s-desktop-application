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
    // Check if running in Tauri (uses internals for v2 compatibility)
    const isTauri = !!(window as any).__TAURI_INTERNALS__

    if (isTauri) {
      try {
        auth.setError("Debug: Initializing Deep Link Login...")
        console.log("Starting Google Deep Link Login...")
        
        // 1. Configuration
        // IMPORTANT: You must add this redirect URI to Google Console: com.voe.app://google-auth
        const clientId = "79915571390-v910mjv94lmgod0nrcu1vj9ctb3tdm22.apps.googleusercontent.com"; 
        // Use Reversed Client ID Scheme for iOS/macOS (Standard Google practice)
        const reversedClientId = "com.googleusercontent.apps.79915571390-v910mjv94lmgod0nrcu1vj9ctb3tdm22";
        const redirectUri = `${reversedClientId}:/oauth2callback`; 
        
        console.log("Using Redirect URI:", redirectUri);

        const scope = "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid";
        const responseType = "code"; 
        
        // --- PKCE Implementation ---
        const generateRandomString = (length: number) => {
            const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
            let text = '';
            for (let i = 0; i < length; i++) {
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            }
            return text;
        };

        const sha256 = async (plain: string) => {
            const encoder = new TextEncoder();
            const data = encoder.encode(plain);
            const hash = await window.crypto.subtle.digest('SHA-256', data);
            return hash;
        };

        const base64urlencode = (a: ArrayBuffer) => {
             const bytes = new Uint8Array(a);
             let str = '';
             for (const byte of bytes) {
                 str += String.fromCharCode(byte);
             }
            return btoa(str)
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
        };

        const generateCodeChallenge = async (v: string) => {
            const hashed = await sha256(v);
            return base64urlencode(hashed);
        };

        const codeVerifier = generateRandomString(128);
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        // ---------------------------

        // 2. Setup Listener BEFORE opening browser
        auth.setError("Debug: Setting up Deep Link listener...")
        
        const codePromise = new Promise<string>((resolve, reject) => {
            const handleDeepLinkUrl = (url: string) => {
                if (url.startsWith(reversedClientId)) {
                    const urlObj = new URL(url);
                    const code = urlObj.searchParams.get("code");
                    const error = urlObj.searchParams.get("error");
                    if (code) {
                        resolve(code);
                    } else if (error) {
                          reject(new Error("Google Error: " + error));
                    }
                }
            }

            // @ts-ignore
            const unlistenPromise = onOpenUrl((urls) => {
                console.log("Deep Link received:", urls);
                auth.setError("Debug: Deep link received! Processing...");
                for (const url of urls) {
                    handleDeepLinkUrl(url);
                }
            });

            // Listen for single-instance event (Windows)
            import('@tauri-apps/api/event').then(({ listen }) => {
                listen('single-instance', (event: any) => {
                    const { payload } = event;
                    // payload is [args, cwd]
                    const args = payload[0] as string[];
                    console.log("Single instance deep link received:", args);
                    auth.setError("Debug: Single instance deep link received! Processing...");
                    
                    // The deep link URL is usually the second argument on Windows
                    const url = args.find(a => a.startsWith(reversedClientId));
                    if (url) {
                        handleDeepLinkUrl(url);
                    }
                });
            });
            
            // Timeout after 3 minutes
            setTimeout(() => {
                // Check if promise already resolved? 
                // The Promise constructor doesn't provide state checking, 
                // but checking connection is fine.
                // Just reject, if already resolved it's ignored.
                reject(new Error("Login timed out."));
            }, 180000);
        });

        // 3. Open Browser & Add PKCE params
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${encodeURIComponent(scope)}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
        
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
                code_verifier: codeVerifier // PKCE Verifier
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
            joinedAt: user.metadata.creationTime || null
        })

        await ensureUserDocument(user)
        auth.setError(null); 

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
