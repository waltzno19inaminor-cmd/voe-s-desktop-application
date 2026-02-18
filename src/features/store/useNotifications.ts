import { defineStore } from 'pinia'
import { collection, onSnapshot, updateDoc, getDocs, query, where, writeBatch} from 'firebase/firestore'
import { db } from '~/shared/firebase.client'
import type { Notification } from '~/entities/notification/model/notification.types'
import type { Unsubscribe } from 'firebase/firestore'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: [] as Notification[],
    isListening: false,
    isReady: false,

    _buffer: [] as Notification[],
    _debounceTimer: null as ReturnType<typeof setTimeout> | null,
    unsubscribe: null as Unsubscribe | null,
  }),

  actions: {
    subscribe(userId: string) {
      if (!userId || this.isListening) return

      const col = collection(db, 'users', userId, 'notifications')

      this.unsubscribe = onSnapshot(col, (snapshot) => {
     
        this._buffer = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Notification[]

        
        if (this._debounceTimer) {
          clearTimeout(this._debounceTimer)
        }

        this._debounceTimer = setTimeout(() => {
          this.notifications = this._buffer
          this.isReady = true
        }, 250)
      })

      this.isListening = true
    },

    unsubscribeFromNotifications() {
      if (this.unsubscribe) {
        this.unsubscribe()
        this.unsubscribe = null
      }

      if (this._debounceTimer) {
        clearTimeout(this._debounceTimer)
        this._debounceTimer = null
      }

      this.notifications = []
      this._buffer = []
      this.isListening = false
      this.isReady = false
    },

   async readAllNotifications(userId: string) {
      this.notifications = this.notifications.map(notification => ({
        ...notification,
        isRead: true
      }))

      const col = collection(db, 'users', userId, 'notifications')
      const q = query(col, where('isRead', '==', false))
      const snapshot = await getDocs(q)

      const batch = writeBatch(db)

      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isRead: true })
      })

      await batch.commit()
    }

  },
})
