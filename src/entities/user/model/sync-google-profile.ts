import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '~/shared/firebase.client'

interface GoogleProfileIdentity {
  uid: string
  email?: string | null
  displayName?: string | null
  photoURL?: string | null
}

export async function syncGoogleProfile(identity: GoogleProfileIdentity): Promise<void> {
  const userRef = doc(db, 'users', identity.uid)
  const snapshot = await getDoc(userRef)
  const displayName = String(identity.displayName || identity.email || '').trim()
  const email = String(identity.email || '').trim()
  const photoURL = String(identity.photoURL || '').trim()

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      ...(displayName ? { displayName } : {}),
      ...(email ? { email } : {}),
      ...(photoURL ? { photoURL } : {}),
      role: 'member',
      joinedAt: serverTimestamp()
    })
    return
  }

  const current = snapshot.data()
  const updates: Record<string, unknown> = {}
  if (displayName && current.displayName !== displayName) updates.displayName = displayName
  if (email && current.email !== email) updates.email = email
  if (photoURL && current.photoURL !== photoURL) updates.photoURL = photoURL

  if (Object.keys(updates).length) {
    await setDoc(userRef, updates, { merge: true })
  }
}

