import { useAuthStore } from "~/entities/user/auth.store";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";
import { auth as firebaseAuth } from "~/shared/firebase.client";
import { getCachedAvatarUrl } from '~/entities/user/model/user-avatar'

export const useAuthInit = async () => {
    const auth = useAuthStore();

    let readyTimeout: any = null

    if (typeof window !== 'undefined') {
        const updateNetworkState = () => auth.setOffline(!window.navigator.onLine)
        updateNetworkState()
        window.addEventListener('online', updateNetworkState)
        window.addEventListener('offline', updateNetworkState)
    }
    
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
   

    onAuthStateChanged(firebaseAuth, (user) => {
    const profile = user ? {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        avatarUrl: null,
        joinedAt: user.metadata.creationTime
    } : null

    // setUser assigns the persisted Firebase identity synchronously before
    // attempting the optional Firestore profile enrichment.
    void auth.setUser(profile)

    if (user) {
        void getCachedAvatarUrl(user.photoURL)
            .then((avatarUrl) => auth.setAvatarUrl(user.uid, avatarUrl))
            .catch(() => {})
    }

    clearTimeout(readyTimeout)

    readyTimeout = setTimeout(() => {
        auth.setAuthReady(true)
    }, 100)
    })

    

}
