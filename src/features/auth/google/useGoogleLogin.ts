import { useAuthStore } from "~/entities/user/auth.store";
import { auth as firebaseAuth, db } from "~/shared/firebase.client";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'


export const googleLogin = async () => {
  const auth = useAuthStore()
  auth.setLoading(true)

  try {
    const provider = new GoogleAuthProvider()
    
    // Check if running in Tauri
    const isTauri = !!(window as any).__TAURI__

    if (isTauri) {
      // Use redirect for desktop app
      await signInWithRedirect(firebaseAuth, provider)
      // The result is handled in useAuthInit or a getRedirectResult call, 
      // but for now let's just trigger the redirect.
      return 
    } else {
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


    // user variable is no longer available here, and logic is handled in branches
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
