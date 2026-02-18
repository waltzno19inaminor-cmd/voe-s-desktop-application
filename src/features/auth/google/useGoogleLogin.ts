import { useAuthStore } from "~/entities/user/auth.store";
import { auth as firebaseAuth, db } from "~/shared/firebase.client";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signInWithCredential } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'


import { open } from '@tauri-apps/plugin-shell';
import { start } from '@fabianlars/tauri-plugin-oauth';

export const googleLogin = async () => {
  const auth = useAuthStore()
  auth.setLoading(true)

  try {
    // Check if running in Tauri
    const isTauri = !!(window as any).__TAURI__
    console.log("Is Tauri environment:", isTauri)

    if (isTauri) {
      try {
        console.log("Starting Google Native Login...")
        
        // 1. Start local server
        const port = await start();
        console.log(`OAuth server started on port ${port}`);
        
        // 2. Configuration
        const clientId = "YOUR_GOOGLE_CLIENT_ID_HERE"; // User must provide this
        const redirectUri = `http://localhost:${port}`;
        const scope = "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid";
        const responseType = "code"; 
        
        // 3. Open Browser
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${encodeURIComponent(scope)}`;
        await open(authUrl);

        // 4. Listen for valid redirect
        const code = await new Promise<string>((resolve, reject) => {
            // @ts-ignore
            import('@fabianlars/tauri-plugin-oauth').then(module => {
                if (module.onUrl) {
                    module.onUrl((url: string) => {
                       console.log("Received URL:", url)
                       // Parse code from URL
                       const urlObj = new URL(url);
                       const code = urlObj.searchParams.get("code");
                       if (code) resolve(code);
                       else reject("No code found in redirect URL");
                    }).catch((err: any) => reject(err));
                } else {
                    reject("onUrl method not found in oauth plugin");
                }
            })
        });

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

      } catch (e: any) {
        console.error("Google Native Login Error:", e)
        auth.setError("Native Login failed: " + e.message)
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
