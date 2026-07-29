import { useAuthStore } from "~/entities/user/auth.store";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";
import { auth as firebaseAuth } from "~/shared/firebase.client";
import { ensureStoredUserAvatar } from '~/entities/user/model/user-avatar'

export const useAuthInit = async () => {
    const auth = useAuthStore();


    let readyTimeout: any = null
    
    // Check for redirect result (for Tauri/Mobile flows)
    getRedirectResult(firebaseAuth).then(async (result) => {
        if (result && result.user) {
            const user = result.user
             auth.setUser({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                joinedAt: user.metadata.creationTime
            })
            // Imported dynamically or from a shared helper to avoid circular dep if needed, 
            // but for now assuming we can move ensureUserDocument to a shared place or just import it.
            // checking if we can import ensureUserDocument from useGoogleLogin without issues.
        }
    }).catch(error => {
        console.error("Redirect auth error:", error)
    })
   

    onAuthStateChanged(firebaseAuth, async (user) => {
    if (user) {
      try {
        await ensureStoredUserAvatar(user)
      } catch (error) {
        console.warn('[Auth] Unable to cache the Google avatar:', error)
      }
    }

    await auth.setUser(user ? {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        joinedAt: user.metadata.creationTime
    } : null)

    clearTimeout(readyTimeout)

    readyTimeout = setTimeout(() => {
        auth.setAuthReady(true)
    }, 100)
    })

    

}
