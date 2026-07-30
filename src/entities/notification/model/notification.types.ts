import type { Timestamp } from 'firebase/firestore'

export type NotificationTime = Timestamp | Date | string | null

/** A document in users/{userId}/notifications. */
export interface Notification {
  id: string
  type: NotificationType

  /** Human-readable message shown in the notification centre. */
  content: string
  /** Set by Firestore with serverTimestamp when the notification is created. */
  createdAt: NotificationTime
  isRead: boolean
  readAt?: NotificationTime

  actorId?: string       
 
  actorLabel?: string    
  target?: {
    entity: EntityType  
    id: string
  }

  context?: {
    threadId?: string
    threadTitle?: string
    threadAuthor?: string
    threadAuthorId?: string
  }

}

export type EntityType =
  | 'thread'
  | 'reply'
  | 'user'


export type NotificationType =
  | 'reply_to_you'
  | 'reply_to_thread'
  | 'thread_created'
  | 'mentioned'
  | 'saved'
  | 'followed'
  | 'system'
  | 'tournament'
  | 'leaderboard'
