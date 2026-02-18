import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from 'firebase/firestore'
import { db } from '@/shared/firebase.client'
import type { Notification } from '@/entities/notification/model/notification.types'

type SendNotificationPayload = {
  toUserId: string

  type: Notification['type']

  actorId?: string
  actorLabel?: string

  target: Notification['target']
  context?: Notification['context']
}




export async function sendNotification(payload: SendNotificationPayload) {
  const {
    toUserId,
    type,
    actorId,
    actorLabel,
    target,
    context,
  } = payload

  if (!toUserId || !type || !target) {
    throw new Error('Invalid notification payload')
  }
  if(actorId === toUserId) return;
  if(actorId === context?.threadAuthorId) return;

  const userRef = doc(db, 'users', toUserId)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    throw new Error(`User ${toUserId} not found`)
  }

  const notification: Omit<Notification, 'id'> = {
    type,
    target,
    createdAt: new Date().toISOString(),
    isRead: false,
    ...(actorId && { actorId }),
    ...(actorLabel && { actorLabel }),
    ...(context && { context }),
  }

  await addDoc(
    collection(userRef, 'notifications'),
    {
      ...notification,
      createdAt: serverTimestamp(),
    }
  )
}
