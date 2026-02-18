import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/shared/firebase.client'

import type { Thread } from '~/entities/thread/model/thread.types'
import type { Reply } from '~/entities/reply/model/reply.types'
import type { ThreadLink } from '~/entities/threadLink/model/threadLink.types'

export async function fetchAllThreads(): Promise<Thread[]> {
  const snapshot = await getDocs(collection(db, 'threads'))

  return snapshot.docs.map(doc => {
    const data = doc.data() as Omit<Thread, 'id'>

    return {
      id: doc.id,
      ...data
    }
  })
}

export async function fetchAllThreadLinks(): Promise<ThreadLink[]> {
  const snapshot = await getDocs(collection(db, 'threadLinks'))

  return snapshot.docs.map(doc => {
    const data = doc.data() as Omit<ThreadLink, 'id'>

    return {
      id: doc.id,
      ...data
    }
  })
}

export async function fetchAllReplies(): Promise<Reply[]> {
  const snapshot = await getDocs(collection(db, 'replies'))

  return snapshot.docs.map(doc => {
    const data = doc.data() as Omit<Reply, 'id'>

    return {
      id: doc.id,
      ...data
    }
  })
}
