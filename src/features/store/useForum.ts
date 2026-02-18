import { defineStore } from 'pinia'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from '@/shared/firebase.client'

import type { Reply } from '~/entities/reply/model/reply.types'
import type { Thread } from '~/entities/thread/model/thread.types'
import type { ThreadLink } from '~/entities/threadLink/model/threadLink.types'
import type { Diary, DiaryEntry } from '~/entities/diary/model/diary.types'


import { threadConverter, replyConverter, threadLinkConverter, diaryConverter } from '~/composables/typeConverters'

export const useForumStore = defineStore('forum', {
  state: () => ({
    threads: new Map<string, Thread>(),
    replies: new Map<string, Reply[]>(),
    users: new Map<string, any>(),
    threadLinks: new Map<string, ThreadLink[]>(),
    allThreadLinks: new Map<string, ThreadLink[]>(),
    diaries: new Map<string, DiaryEntry[]>(),
    quotes: new Map(),
    loading: false,
  }),

  actions: {
    removeDiaryEntry(authorId: string, entryId: number) {
        const user = this.users.get(authorId)
        if (!user) return

        const currentDiary = user.diary || []

        const newDiary = currentDiary.filter((entry: DiaryEntry, index: number) => index !== entryId)

        const updatedUser = {
          ...user,
          diary: newDiary
        }

        this.users.set(authorId, updatedUser)
      },
    addDiaryEntry(authorId: string, entry: DiaryEntry) {
        if(this.loading) return;
        this.loading = true;

        try{
          const user = this.users.get(authorId)
          if (!user) return

          const currentDiary = user.diary || []

          const newDiary = [...currentDiary, entry]

          const updatedUser = {
            ...user,
            diary: newDiary
          }

            this.users.set(authorId, updatedUser)
          }finally{
            this.loading = false;
          }
      },

      async addReply(reply: Reply) {
        if(this.loading) return;
        this.loading = true;
        try {
          const currentList = this.replies.get(reply.threadId) || [];
    
          const newList = [...currentList, reply];
        
          this.replies.set(reply.threadId, newList);
        }finally{
          this.loading = false;
        }
      },

      removeReply(threadId: string, replyId: string) {
        const list = this.replies.get(threadId)
        if (!list) return

        this.replies.set(
          threadId,
          list.filter(reply => reply.id !== replyId)
        )
      },

      async removeThread(threadId: string) {
        this.threads.delete(threadId)
        this.replies.delete(threadId)
        this.threadLinks.delete(threadId)
      },
      getAuthor(userId: string) {
        const user = this.users.get(userId)
       
        if (!user) return 'anonymous'
 
        return user
      },

    async fetchThread(id: string): Promise<Thread | null> {
      if (this.threads.has(id)) {
        return this.threads.get(id)!
      }

      const ref = doc(db, 'threads', id).withConverter(threadConverter)
      const snap = await getDoc(ref)
      if (!snap.exists()) return null

      const thread = snap.data()
      this.threads.set(thread.id, thread)
      return thread
    },

    async fetchThreadList(limitCount = 30): Promise<void> {
      this.loading = true

      const q = query(
        collection(db, 'threads').withConverter(threadConverter),
        orderBy('lastActivityAt', 'desc'),
        limit(limitCount)
      )

      const snap = await getDocs(q)

      snap.forEach(d => {
        const thread = d.data()
        this.threads.set(thread.id, thread)
      })

      this.loading = false
    },

    async fetchQuotes(){
      const q = query(
        collection(db, 'quotes')
      )

      const snap = await getDocs(q)

      
      snap.forEach(d => {
        const quote = d.data()
        this.quotes.set(d.id, quote)
      })
    },


    async fetchReplies(threadId: string): Promise<Reply[]> {
    const q = query(
        collection(db, 'replies').withConverter(replyConverter),
        where('threadId', '==', threadId)
    )

    const snap = await getDocs(q)

    const list: Reply[] = snap.docs.map(d => d.data())

    this.replies.set(threadId, list)
    return list
    },

    async fetchUser(userId: string) {
      this.loading = true
      try{
      if (this.users.has(userId)) {
        return this.users.get(userId)
      }

      const snap = await getDoc(doc(db, 'users', userId))
      if (!snap.exists()) return null

      const user = snap.data()
      this.users.set(userId, user)
      return user
      }finally{
        this.loading = false
      }
    },


    async fetchThreadLinks(threadId: string): Promise<ThreadLink[]> {
      if (this.threadLinks.has(threadId)) {
        return this.threadLinks.get(threadId)!
      }

      const q = query(
        collection(db, 'threadLinks').withConverter(threadLinkConverter),
        where('fromThreadId', '==', threadId)
      )

      const snap = await getDocs(q)
      const links: ThreadLink[] = []

      snap.forEach(d => links.push(d.data()))

      this.threadLinks.set(threadId, links)
      return links
    },
    async fetchAllThreadLinks() {
      const q = query(
        collection(db, 'threadLinks').withConverter(threadLinkConverter)
      )

      const snap = await getDocs(q)
      const links: ThreadLink[] = []

      snap.forEach(d => {
        const link = d.data()
        links.push(link)
      })

      this.allThreadLinks.set('all', links)

      return links
    },

    clearThread(threadId: string) {
      this.replies.delete(threadId)
      this.threadLinks.delete(threadId)
    },

    reset() {
      this.threads.clear()
      this.replies.clear()
      this.users.clear()
      this.threadLinks.clear()
    },
  },
})


