import { defineStore } from 'pinia'
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  increment,
  deleteDoc,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore'
import { db } from '@/shared/firebase.client'

import type { Reply } from '~/entities/reply/model/reply.types'
import type { Thread } from '~/entities/thread/model/thread.types'
import type { ThreadLink } from '~/entities/threadLink/model/threadLink.types'
import type { Diary, DiaryEntry } from '~/entities/diary/model/diary.types'
import { getCachedAvatarUrl } from '~/entities/user/model/user-avatar'


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
    userLikedThreadIds: new Set<string>(),
    userSavedThreadIds: new Set<string>(),
  }),

  actions: {
    // DEDICATED DIARY ACTIONS
    addDiaryEntry(authorId: string, entry: DiaryEntry) {
      // Trigger deep reactivity by modifying the existing array, or creating a new map instance
      const currentDiary = this.diaries.get(authorId) || []
      const newDiary = [...currentDiary, entry]
      
      this.diaries.set(authorId, newDiary)
      this.diaries = new Map(this.diaries) // FORCE REACTIVITY MAP UPDATE
      
      // Also keep user profile in sync if it exists
      const user = this.users.get(authorId)
      if (user) {
        this.users.set(authorId, { ...user, diary: newDiary })
        this.users = new Map(this.users) // FORCE REACTIVITY MAP UPDATE
      }
    },
    removeDiaryEntry(authorId: string, entryId: number) {
        const currentDiary = this.diaries.get(authorId) || []
        const newDiary = currentDiary.filter((_, index) => index !== entryId)
        
        this.diaries.set(authorId, newDiary)
        this.diaries = new Map(this.diaries)

        const user = this.users.get(authorId)
        if (user) {
          this.users.set(authorId, { ...user, diary: newDiary })
          this.users = new Map(this.users)
        }
      },
    clearDiary(authorId: string, strategyId?: string) {
      const currentDiary = this.diaries.get(authorId) || []
      let newDiary: DiaryEntry[] = []

      if (strategyId) {
          newDiary = currentDiary.filter((e: DiaryEntry) => e.strategyId !== strategyId)
      }

      this.diaries.set(authorId, newDiary)
      this.diaries = new Map(this.diaries)

      const user = this.users.get(authorId)
      if (user) {
        this.users.set(authorId, { ...user, diary: newDiary })
        this.users = new Map(this.users)
      }
    },
    updateDiaryEntryVisuals(authorId: string, entryId: number, newNotes: string, newImages: any[]) {
        const currentDiary = this.diaries.get(authorId) || []
        if (currentDiary[entryId]) {
            currentDiary[entryId].notes = newNotes;
            currentDiary[entryId].images = newImages;
            this.diaries.set(authorId, [...currentDiary])
            this.diaries = new Map(this.diaries)
            
            const user = this.users.get(authorId)
            if (user) {
                this.users.set(authorId, { ...user, diary: [...currentDiary] })
                this.users = new Map(this.users)
            }
        }
    },
    updateDiaryEntryNote(authorId: string, entryId: number, newNote: string) {
        const currentDiary = this.diaries.get(authorId) || []
        if (currentDiary[entryId]) {
            currentDiary[entryId].notes = newNote;
            this.diaries.set(authorId, [...currentDiary])
            this.diaries = new Map(this.diaries)
            
            const user = this.users.get(authorId)
            if (user) {
                this.users.set(authorId, { ...user, diary: [...currentDiary] })
                this.users = new Map(this.users)
            }
        }
    },

      addReply(reply: Reply) {
        const currentList = this.replies.get(reply.threadId) || []
        const newList = [...currentList, reply]

        this.replies.set(reply.threadId, newList)
        this.replies = new Map(this.replies)
      },

      async createReply(threadId: string, replyData: Omit<Reply, 'id' | 'threadId' | 'createdAt'>) {
        try {
          const replyRef = doc(collection(db, 'replies'))
          const newReply: Reply = {
            ...replyData,
            id: replyRef.id,
            threadId,
            createdAt: serverTimestamp()
          }
          await setDoc(replyRef, newReply)
          
          const threadRef = doc(db, 'threads', threadId)
          await updateDoc(threadRef, {
            repliesCount: increment(1)
          })

          this.addReply({
            ...newReply,
            createdAt: new Date() // Temporary local date
          })
          
          const thread = this.threads.get(threadId)
          if (thread) {
            thread.repliesCount = (thread.repliesCount || 0) + 1
          }

          return newReply
        } catch (e) {
          console.error("Error creating reply", e)
          throw e
        }
      },

      async softDeleteReply(reply: Reply) {
        try {
          const replyRef = doc(db, 'replies', reply.id)
          await updateDoc(replyRef, {
            status: 'hidden',
            'content.text': 'Комментарий удален автором',
            'content.blocks': []
          })
          
          const list = this.replies.get(reply.threadId)
          if (list) {
            const index = list.findIndex(r => r.id === reply.id)
            const r = list[index]
            if (index !== -1 && r) {
              r.status = 'hidden'
              if (!r.content) r.content = { text: '', blocks: [] }
              r.content.text = 'Комментарий удален автором'
              r.content.blocks = []
            }
          }
        } catch (e) {
          console.error("Error soft deleting reply", e)
          throw e
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

      async deleteThreadPermanently(threadId: string): Promise<void> {
        this.loading = true
        try {
          const threadRef = doc(db, 'threads', threadId)
          const outgoingLinksQuery = query(
            collection(db, 'threadLinks').withConverter(threadLinkConverter),
            where('fromThreadId', '==', threadId)
          )
          const outgoingLinksSnap = await getDocs(outgoingLinksQuery)

          await Promise.all(outgoingLinksSnap.docs.map(linkDoc => deleteDoc(doc(db, 'threadLinks', linkDoc.id))))
          await deleteDoc(threadRef)

          this.threads.delete(threadId)
          this.replies.delete(threadId)
          this.threadLinks.delete(threadId)
          outgoingLinksSnap.docs.forEach((linkDoc) => {
            const link = linkDoc.data()
            this.threadLinks.delete(link.toThreadId)
          })
          this.allThreadLinks.clear()
          this.threads = new Map(this.threads)
        } finally {
          this.loading = false
        }
      },

      addThread(thread: Thread) {
        this.threads.set(thread.id, thread)
        this.threads = new Map(this.threads)
      },

      async createThread(threadData: Omit<Thread, 'id'> & Record<string, any>): Promise<Thread> {
        this.loading = true
        try {
          const threadRef = doc(collection(db, 'threads'))
          const thread = {
            id: threadRef.id,
            ...threadData
          } as Thread & Record<string, any>

          await setDoc(threadRef, thread)
          this.threads.set(thread.id, thread)
          this.threads = new Map(this.threads)

          return thread
        } finally {
          this.loading = false
        }
      },

      async updateThread(threadId: string, threadData: Partial<Thread> & Record<string, any>): Promise<Thread> {
        this.loading = true
        try {
          const threadRef = doc(db, 'threads', threadId)
          await updateDoc(threadRef, threadData)

          const currentThread = this.threads.get(threadId)
          const updatedThread = {
            ...(currentThread || {}),
            ...threadData,
            id: threadId
          } as Thread

          this.threads.set(threadId, updatedThread)
          this.threads = new Map(this.threads)

          return updatedThread
        } finally {
          this.loading = false
        }
      },

      async toggleThreadLike(userId: string, threadId: string): Promise<{ isLiked: boolean, likesCount: number }> {
        if (!userId || !threadId) throw new Error('User and thread identifiers are required.')

        try {
          const threadRef = doc(db, 'threads', threadId)
          const userLikeRef = doc(db, 'users', userId, 'likedThreads', threadId)
          const result = await runTransaction(db, async (transaction) => {
            const [threadSnapshot, likeSnapshot] = await Promise.all([
              transaction.get(threadRef),
              transaction.get(userLikeRef)
            ])

            if (!threadSnapshot.exists()) {
              throw new Error('Thread does not exist.')
            }

            const currentLikes = Math.max(0, Number(threadSnapshot.data().likesCount || 0))
            const wasLiked = likeSnapshot.exists()
            const isLiked = !wasLiked
            const likesCount = isLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1)

            if (isLiked) {
              transaction.set(userLikeRef, { likedAt: serverTimestamp(), threadId })
            } else {
              transaction.delete(userLikeRef)
            }

            transaction.update(threadRef, { likesCount })
            return { isLiked, likesCount }
          })

          const nextLikedThreadIds = new Set(this.userLikedThreadIds)
          if (result.isLiked) nextLikedThreadIds.add(threadId)
          else nextLikedThreadIds.delete(threadId)
          this.userLikedThreadIds = nextLikedThreadIds

          const thread = this.threads.get(threadId)
          if (thread) {
            this.threads.set(threadId, { ...thread, likesCount: result.likesCount })
            this.threads = new Map(this.threads)
          }

          return result
        } catch (error) {
          console.error("Error toggling like:", error)
          throw error
        }
      },

      async toggleThreadSave(userId: string, threadId: string, isSaving: boolean) {
        if (!userId || !threadId) return
        
        try {
          const userSaveRef = doc(db, 'users', userId, 'savedThreads', threadId)
          if (isSaving) {
            await setDoc(userSaveRef, { savedAt: serverTimestamp(), threadId })
            this.userSavedThreadIds.add(threadId)
          } else {
            await deleteDoc(userSaveRef)
            this.userSavedThreadIds.delete(threadId)
          }
        } catch (error) {
          console.error("Error toggling save:", error)
          throw error
        }
      },
      async isThreadLiked(userId: string, threadId: string): Promise<boolean> {
        if (!userId || !threadId) return false
        try {
          const snap = await getDoc(doc(db, 'users', userId, 'likedThreads', threadId))
          return snap.exists()
        } catch {
          return false
        }
      },

      async isThreadSaved(userId: string, threadId: string): Promise<boolean> {
        if (!userId || !threadId) return false
        try {
          const snap = await getDoc(doc(db, 'users', userId, 'savedThreads', threadId))
          return snap.exists()
        } catch {
          return false
        }
      },

      async fetchUserInteractions(userId: string) {
        if (!userId) return;
        try {
          const likesSnap = await getDocs(collection(db, 'users', userId, 'likedThreads'));
          const savedSnap = await getDocs(collection(db, 'users', userId, 'savedThreads'));
          
          this.userLikedThreadIds.clear();
          likesSnap.forEach(d => this.userLikedThreadIds.add(d.id));
          
          this.userSavedThreadIds.clear();
          savedSnap.forEach(d => this.userSavedThreadIds.add(d.id));
        } catch (e) {
          console.error('Error fetching user interactions', e);
        }
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
      this.threads = new Map(this.threads)
      return thread
    },

    async fetchThreadList(limitCount = 30, orderField = 'lastActivityAt'): Promise<void> {
      this.loading = true

      try {
        const q = query(
          collection(db, 'threads').withConverter(threadConverter),
          orderBy(orderField, 'desc'),
          limit(limitCount)
        )

        const snap = await getDocs(q)

        snap.forEach(d => {
          const thread = d.data()
          this.threads.set(thread.id, thread)
        })
        this.threads = new Map(this.threads)

      } finally {
        this.loading = false
      }
    },

    async fetchFollowedThreads(followedIds: string[], limitCount = 30): Promise<void> {
      if (!followedIds || followedIds.length === 0) return;
      this.loading = true

      try {
        const chunks = []
        for (let i = 0; i < followedIds.length; i += 10) {
           chunks.push(followedIds.slice(i, i + 10))
        }

        for (const chunk of chunks) {
            const q = query(
                collection(db, 'threads').withConverter(threadConverter),
                where('authorId', 'in', chunk),
                orderBy('lastActivityAt', 'desc'),
                limit(limitCount)
            )

            const snap = await getDocs(q)

            snap.forEach(d => {
                const thread = d.data()
                this.threads.set(thread.id, thread)
            })
        }
      } finally {
        this.loading = false
      }
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

    updateReplyLikeState(threadId: string, replyId: string, isLiked: boolean, wasLiked: boolean) {
      if (isLiked === wasLiked) return

      const currentReplies = this.replies.get(threadId)
      if (!currentReplies) return

      const likesDelta = isLiked ? 1 : -1
      const updatedReplies = currentReplies.map((reply) => reply.id === replyId
        ? { ...reply, likes: Math.max(0, Number(reply.likes || 0) + likesDelta) }
        : reply)

      this.replies.set(threadId, updatedReplies)
      this.replies = new Map(this.replies)
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
      const avatarUrl = await getCachedAvatarUrl(user?.photoURL || user?.photoUrl).catch(() => null)
      const resolvedUser = avatarUrl ? { ...user, avatarUrl } : user
      this.users.set(userId, resolvedUser)
      this.users = new Map(this.users)
      return resolvedUser
      }finally{
        this.loading = false
      }
    },


    async fetchThreadLinks(threadId: string): Promise<ThreadLink[]> {
      if (this.threadLinks.has(threadId)) {
        return this.threadLinks.get(threadId)!
      }

      // Fetch links where this thread is the source
      const qFrom = query(
        collection(db, 'threadLinks').withConverter(threadLinkConverter),
        where('fromThreadId', '==', threadId)
      )
      // Fetch links where this thread is the target
      const qTo = query(
        collection(db, 'threadLinks').withConverter(threadLinkConverter),
        where('toThreadId', '==', threadId)
      )

      const [snapFrom, snapTo] = await Promise.all([getDocs(qFrom), getDocs(qTo)])

      const links: ThreadLink[] = []
      snapFrom.forEach(d => links.push(d.data()))
      snapTo.forEach(d => {
        // Avoid duplicates (shouldn't happen but be safe)
        if (!links.find(l => l.id === d.id)) links.push(d.data())
      })

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

    async syncContributionThreadLinks(fromThreadId: string, toThreadIds: string[]): Promise<ThreadLink[]> {
      const uniqueTargetIds = Array.from(new Set(toThreadIds.filter(id => id && id !== fromThreadId))).slice(0, 3)
      const linksCollection = collection(db, 'threadLinks').withConverter(threadLinkConverter)
      const existingQuery = query(
        linksCollection,
        where('fromThreadId', '==', fromThreadId)
      )
      const existingSnap = await getDocs(existingQuery)
      const existingContributionLinks = existingSnap.docs
        .map(d => d.data())
        .filter(link => link.type === 'extends')

      await Promise.all(existingContributionLinks.map(link => deleteDoc(doc(db, 'threadLinks', link.id))))

      const createdLinks = await Promise.all(uniqueTargetIds.map(async (toThreadId) => {
        const linkRef = doc(collection(db, 'threadLinks'))
        const link: ThreadLink = {
          id: linkRef.id,
          fromThreadId,
          toThreadId,
          type: 'extends'
        }
        await setDoc(linkRef.withConverter(threadLinkConverter), link)
        return link
      }))

      this.threadLinks.delete(fromThreadId)
      uniqueTargetIds.forEach(threadId => this.threadLinks.delete(threadId))
      existingContributionLinks.forEach(link => this.threadLinks.delete(link.toThreadId))
      this.allThreadLinks.clear()

      return createdLinks
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
