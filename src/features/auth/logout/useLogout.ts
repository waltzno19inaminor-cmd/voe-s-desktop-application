import { useAuthStore } from "~/entities/user/auth.store";
import { auth as firebaseAuth } from "~/shared/firebase.client";
import { signOut } from "firebase/auth";

export const logout = async () => {
    const auth = useAuthStore();
    try {
        await signOut(firebaseAuth)
        auth.clearUser()
        return true
    } catch (error: any) {
        auth.setError(error.message)
        return false
    }
}