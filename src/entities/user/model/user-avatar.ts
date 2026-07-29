import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { db, fireStorage } from '~/shared/firebase.client'

type AvatarSourceUser = {
  uid: string
  photoURL?: string | null
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const avatarSyncRequests = new Map<string, Promise<string | null>>()

export async function ensureStoredUserAvatar(user: AvatarSourceUser): Promise<string | null> {
  const existingRequest = avatarSyncRequests.get(user.uid)
  if (existingRequest) return existingRequest

  const request = syncStoredUserAvatar(user).finally(() => avatarSyncRequests.delete(user.uid))
  avatarSyncRequests.set(user.uid, request)
  return request
}

async function syncStoredUserAvatar(user: AvatarSourceUser): Promise<string | null> {
  const sourceUrl = String(user.photoURL || '').trim()
  if (!user.uid || !isGoogleAvatarUrl(sourceUrl)) return null

  const userRef = doc(db, 'users', user.uid)
  const userSnapshot = await getDoc(userRef)
  const existingAvatarUrl = String(userSnapshot.data()?.avatarUrl || '').trim()
  if (existingAvatarUrl) return existingAvatarUrl

  const response = await fetchGoogleAvatar(sourceUrl)
  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() || ''
  if (!contentType.startsWith('image/')) throw new Error('Google avatar response is not an image.')

  const image = await response.blob()
  if (!image.size || image.size > MAX_AVATAR_BYTES) {
    throw new Error('Google avatar exceeds the 2 MB profile-avatar limit.')
  }

  const avatarRef = storageRef(fireStorage, `avatars/${user.uid}/profile.${getAvatarExtension(contentType)}`)
  await uploadBytes(avatarRef, image, { contentType })
  const avatarUrl = await getDownloadURL(avatarRef)

  await setDoc(userRef, {
    avatarUrl,
    avatarSourceUrl: sourceUrl,
    avatarUpdatedAt: serverTimestamp()
  }, { merge: true })

  return avatarUrl
}

async function fetchGoogleAvatar(url: string): Promise<Response> {
  let lastStatus = 0
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, { cache: 'force-cache' })
    if (response.ok) return response
    lastStatus = response.status
    if (response.status !== 429 || attempt === 2) break
    await new Promise<void>((resolve) => setTimeout(resolve, 800 * (attempt + 1)))
  }
  throw new Error(`Google avatar download failed with HTTP ${lastStatus || 'unknown'}.`)
}

function isGoogleAvatarUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (
      url.hostname === 'lh3.googleusercontent.com'
      || url.hostname.endsWith('.googleusercontent.com')
    )
  } catch {
    return false
  }
}

function getAvatarExtension(contentType: string): string {
  if (contentType === 'image/png') return 'png'
  if (contentType === 'image/webp') return 'webp'
  if (contentType === 'image/gif') return 'gif'
  return 'jpg'
}
