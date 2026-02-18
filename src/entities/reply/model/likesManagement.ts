import { doc, runTransaction, serverTimestamp, increment, collection, getDoc } from 'firebase/firestore'
import { db } from '@/shared/firebase.client'

export async function likeReply(replyId: string, userId: string) {
  const replyRef = doc(db, 'replies', replyId)
  const likeRef = doc(db, 'replies', replyId, 'likes', userId)

  await runTransaction(db, async (transaction) => {
    const likeSnap = await transaction.get(likeRef)

    if (likeSnap.exists()) {
      return
    }

    transaction.set(likeRef, {
      createdAt: serverTimestamp()
    })

    transaction.update(replyRef, {
      likes: increment(1)
    })
  })
}




export async function isReplyLikedByUser(replyId: string, userId: string) {
  const likeRef = doc(db, 'replies', replyId, 'likes', userId)
  const snap = await getDoc(likeRef)
  return snap.exists()
}



export async function removeLike(replyId: string, userId: string) {
  const replyRef = doc(db, 'replies', replyId)
  const likeRef = doc(db, 'replies', replyId, 'likes', userId)

  await runTransaction(db, async (transaction) => {
    const likeSnap = await transaction.get(likeRef)

    if (!likeSnap.exists()) {
      return
    }

    transaction.delete(likeRef)

    transaction.update(replyRef, {
      likes: increment(-1)
    })
  })
}