import { useAuthStore } from "~/entities/user/auth.store";
import { auth as firebaseAuth } from "~/shared/firebase.client";
import { signInWithEmailAndPassword } from "firebase/auth";

export const loginUser = async (email: string, password: string) => {
    const auth = useAuthStore();

    auth.setLoading(true);
    try {

        const result = await signInWithEmailAndPassword(firebaseAuth, email, password);

        const user = result.user

        auth.setUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
        });

    } catch (error: any) {
        auth.setError(error.message);
    } finally {
        auth.setLoading(false);
    }
};
