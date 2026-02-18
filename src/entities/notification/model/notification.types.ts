export interface Notification {
  id: string

  type: NotificationType

  actorId?: string       
 
  actorLabel?: string    
  target: {
    entity: EntityType  
    id: string
  }

  context?: {
    threadId?: string
    threadTitle?: string
    threadAuthor?: string
    threadAuthorId?: string
  }

  createdAt: string
  isRead: boolean
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
