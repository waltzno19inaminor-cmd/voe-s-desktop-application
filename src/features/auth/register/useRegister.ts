import { useAuthStore } from "~/entities/user/auth.store";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth as firebaseAuth, db } from "~/shared/firebase.client";
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'



export async function createUser(email: string, password: string) {
  const auth = useAuthStore()
  auth.setLoading(true)

  try {
    const result = await createUserWithEmailAndPassword(
      firebaseAuth,
      email,
      password
    )

    const user = result.user

   
    auth.setUser({
      uid: user.uid,
      email: user.email,
      displayName: user.email,
      photoURL: null
    })

  
    await setDoc(
      doc(db, 'users', user.uid),
      {
        displayName: user.email,
        email: user.email,
        role: 'member',
        joinedAt: serverTimestamp()
      }
    )

  } catch (error: any) {
    auth.setError(error.message ?? 'Registration failed')
  } finally {
    auth.setLoading(false)
  }
}


export function confirmPassword(password: string, passwordConfirm: string) {
    if (password !== passwordConfirm) {
        return false;
    }
    return true;
}