import { defineStore } from 'pinia'
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, where, writeBatch } from 'firebase/firestore'
import { db } from '~/shared/firebase.client'
import type { Notification } from '~/entities/notification/model/notification.types'
import type { Unsubscribe } from 'firebase/firestore'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: [] as Notification[],
    isListening: false,
    isReady: false,
    activeUserId: null as string | null,

    _buffer: [] as Notification[],
    _debounceTimer: null as ReturnType<typeof setTimeout> | null,
    unsubscribe: null as Unsubscribe | null,
  }),

  getters: {
    unreadCount: (state) => state.notifications.filter((notification) => !notification.isRead).length,
  },

  actions: {
    subscribe(userId: string) {
      if (!userId) return
      if (this.isListening && this.activeUserId === userId) return
      if (this.isListening) this.unsubscribeFromNotifications()

      this.activeUserId = userId
      this.isReady = false
      this.notifications = []
      this._buffer = []

      const col = collection(db, 'users', userId, 'notifications')
      const notificationsQuery = query(col, orderBy('createdAt', 'desc'), limit(50))

      this.unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {

        this._buffer = snapshot.docs.map((notificationDoc) => {
          const data = notificationDoc.data() as Omit<Notification, 'id'> & { content?: string }

          return {
            id: notificationDoc.id,
            ...data,
            contentRu: data.contentRu || data.content || 'У вас новое уведомление.',
            contentEn: data.contentEn || data.content || 'You have a new notification.',
            isRead: Boolean(data.isRead),
          }
        })

        
        if (this._debounceTimer) {
          clearTimeout(this._debounceTimer)
        }

        this._debounceTimer = setTimeout(() => {
          this.notifications = this._buffer
          this.isReady = true
        }, 250)
      }, (error) => {
        this.isListening = false
        this.isReady = true
        this.notifications = []
        this._buffer = []
        this.unsubscribe = null

        if (this._debounceTimer) {
          clearTimeout(this._debounceTimer)
          this._debounceTimer = null
        }

        if (error?.code !== 'permission-denied') {
          console.warn('[Notifications] Snapshot listener stopped:', error)
        }
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
      this.activeUserId = null
    },

    async markNotificationAsRead(notificationId: string) {
      if (!this.activeUserId) return
      const notification = this.notifications.find((item) => item.id === notificationId)
      if (!notification || notification.isRead) return

      this.notifications = this.notifications.map((item) => (
        item.id === notificationId ? { ...item, isRead: true } : item
      ))

      await writeBatch(db)
        .update(doc(db, 'users', this.activeUserId, 'notifications', notificationId), {
          isRead: true,
          readAt: serverTimestamp(),
        })
        .commit()
    },

    async readAllNotifications(userId = this.activeUserId || '') {
      if (!userId || !this.unreadCount) return
      this.notifications = this.notifications.map(notification => ({
        ...notification,
        isRead: true,
      }))

      const col = collection(db, 'users', userId, 'notifications')
      const q = query(col, where('isRead', '==', false))
      const snapshot = await getDocs(q)

      const batch = writeBatch(db)

      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isRead: true, readAt: serverTimestamp() })
      })

      await batch.commit()
    }

  },
})
