import type { FirestoreDataConverter } from 'firebase/firestore'
import type { Thread } from '~/entities/thread/model/thread.types'
import type { Reply } from '~/entities/reply/model/reply.types'
import type { ThreadLink } from '~/entities/threadLink/model/threadLink.types'
import type { Diary, DiaryEntry } from '~/entities/diary/model/diary.types'
import { Timestamp } from 'firebase/firestore'

export const threadConverter: FirestoreDataConverter<Thread> = {
  toFirestore(thread) {
    const { id, ...data } = thread
    return data
  },

  fromFirestore(snapshot) {
    return {
      id: snapshot.id,
      ...(snapshot.data() as Omit<Thread, 'id'>),
    }
  },
}


export const replyConverter: FirestoreDataConverter<Reply> = {
  toFirestore(reply) {
    const { id, ...data } = reply
    return data
  },

  fromFirestore(snapshot) {
    return {
      id: snapshot.id,
      ...(snapshot.data() as Omit<Reply, 'id'>),
    }
  },
}

export const threadLinkConverter: FirestoreDataConverter<ThreadLink> = {
  toFirestore(link) {
    const { id, ...data } = link
    return data
  },

  fromFirestore(snapshot) {
    return {
      id: snapshot.id,
      ...(snapshot.data() as Omit<ThreadLink, 'id'>),
    }
  },
}
export const diaryConverter: FirestoreDataConverter<Diary> = {
  toFirestore(diary) {
    const { id, ...data } = diary
    // Ensure entries is an array and map it. Cast to any[] to avoid complex FieldValue types issues
    const entries = Array.isArray(diary.entries) ? diary.entries : []
    return {
      ...data,
      entries: entries.map((entry: any) => ({
        ...entry,
        date: entry.date ? Timestamp.fromDate(entry.date) : null
      }))
    }
  },
  fromFirestore(snapshot, options) {
    const data = snapshot.data(options)
    return {
      id: snapshot.id,
      authorId: data.authorId,
      entries: (data.entries || []).map((entry: any) => ({
        ...entry,
        date: entry.date instanceof Timestamp ? entry.date.toDate() : new Date(entry.date)
      }))
    }
  },
}
