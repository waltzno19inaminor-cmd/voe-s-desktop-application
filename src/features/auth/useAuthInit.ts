import { useAuthStore } from "~/entities/user/auth.store";
import { onAuthStateChanged } from "firebase/auth";
import { auth as firebaseAuth } from "~/shared/firebase.client";

export const useAuthInit = async () => {
    const auth = useAuthStore();


   let readyTimeout: any = null
   

    onAuthStateChanged(firebaseAuth, (user) => {
        
    auth.setUser(user ? {
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