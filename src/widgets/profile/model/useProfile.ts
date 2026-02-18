import { ref } from 'vue'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '~/shared/firebase.client'

export const isSubmitting = ref(false)
export const status = ref<'idle' | 'success' | 'error'>('idle')

export async function changeBio(
  authorId: string,
  profileId: string,
  bio: string
) {
  if (authorId !== profileId) return
  if (!bio.trim()) return

  isSubmitting.value = true
  status.value = 'idle'

  try {
    const userRef = doc(db, 'users', authorId)

    await updateDoc(userRef, {
      bio: bio.trim()
    })

    status.value = 'success'
  } catch (e) {
    console.error(e)
    status.value = 'error'
  } finally {
    isSubmitting.value = false
  }
}
