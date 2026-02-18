import type { NotificationType } from '~/entities/notification/model/notification.types';

export function convertNotificationType(type: NotificationType) {
    if(type === 'reply_to_you') return 'replied to you'
    if(type === 'reply_to_thread') return 'replied to your thread'
    if(type === 'thread_created') return 'created new thread'
    if(type === 'mentioned') return 'mentioned you'
    if(type === 'followed') return 'followed you'
    if(type === 'saved') return 'saved your thread'
    if(type === 'system') return 'System notification'
}