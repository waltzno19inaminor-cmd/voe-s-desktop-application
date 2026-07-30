import type { Timestamp } from 'firebase/firestore'

export type NotificationTime = Timestamp | Date | string | null

export type EntityType =
  | 'thread'
  | 'reply'
  | 'user'

export type EventNotificationSubtype = 'points' | 'prize'

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
  | 'event'

interface NotificationBase {
  id: string
  type: Exclude<NotificationType, 'event'>

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

interface EventNotificationBase extends Omit<NotificationBase, 'type'> {
  type: 'event'
  subtype: EventNotificationSubtype
  eventName: string
  /** Ordinal number of the season, stored as a Firestore int64. */
  season: number
  /** Ordinal number of the round, stored as a Firestore int64. */
  round: number
}

export interface EventPointsNotification extends EventNotificationBase {
  subtype: 'points'
  /** Points awarded to the user, stored as a Firestore int64. */
  points: number
  prize?: never
}

export interface EventPrizeNotification extends EventNotificationBase {
  subtype: 'prize'
  prize: string
  points?: never
}

export type EventNotification = EventPointsNotification | EventPrizeNotification

/** A document in users/{userId}/notifications. */
export type Notification =
  | NotificationBase
  | EventNotification

export type NonEventNotificationType = Exclude<NotificationType, 'event'>
