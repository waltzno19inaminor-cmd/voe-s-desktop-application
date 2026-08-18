import { ref } from 'vue'
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import { auth, db } from '~/shared/firebase.client'
import { loadFromDisk, removeFromDisk, saveToDisk } from '~/shared/diskStorage'

export type AccessActivationState = 'checking' | 'requires_key' | 'granted' | 'error'

const DEFAULT_ACCESS_WORKER_URL = 'https://exgenesis-access-worker.waltzno19inaminor.workers.dev'
const MAX_ACCESS_KEY_ATTEMPTS = 5
const ACCESS_KEY_LOCK_MS = 15 * 60 * 1000
const OFFLINE_ACCESS_CACHE_KEY = 'access_activation_offline_v1'
const OFFLINE_ACCESS_GRACE_MS = 30 * 24 * 60 * 60 * 1000
const accessState = ref<AccessActivationState>('checking')
const accessError = ref('')
const accessLockRemainingSeconds = ref(0)
const accessAttemptFailedCount = ref(0)
const isOffline = ref(typeof navigator !== 'undefined' ? !navigator.onLine : false)
const offlineAccessRestored = ref(false)
let accessUnsubscribe: (() => void) | null = null
let accessAttemptsUnsubscribe: (() => void) | null = null
let accessLockTimer: ReturnType<typeof setInterval> | null = null
let activeUserId = ''
let activeLockUntilMs = 0
let networkListenersAttached = false

type CachedAccessState = {
  userId: string
  isActivated: true
  checkedAt: number
  expiresAt?: number | null
}

function getAccessWorkerUrl(): string {
  const configured = String(import.meta.env.VITE_ACCESS_WORKER_URL || '').trim()
  return (configured || DEFAULT_ACCESS_WORKER_URL).replace(/\/$/, '')
}

function getAccessErrorMessage(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return 'Unable to activate access. Please try again.'
}

function getAccessAttemptsRef(userId: string) {
  return doc(db, 'users', userId, 'accessKeyAttempts', 'state')
}

function toMillis(value: unknown): number {
  if (!value) return 0
  if (value instanceof Timestamp) return value.toMillis()
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'object' && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis()
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime()
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function isValidCachedAccess(value: unknown, userId: string): value is CachedAccessState {
  if (!value || typeof value !== 'object') return false
  const cached = value as Partial<CachedAccessState>
  if (cached.userId !== userId || cached.isActivated !== true) return false
  if (!Number.isFinite(cached.checkedAt) || !cached.checkedAt) return false
  if (Date.now() - cached.checkedAt > OFFLINE_ACCESS_GRACE_MS) return false
  if (cached.expiresAt && Date.now() >= cached.expiresAt) return false
  return true
}

async function readValidCachedAccess(userId: string): Promise<CachedAccessState | null> {
  const cached = await loadFromDisk<CachedAccessState>(OFFLINE_ACCESS_CACHE_KEY)
  return isValidCachedAccess(cached, userId) ? cached : null
}

async function persistGrantedAccess(userId: string, expiresAt?: unknown) {
  const expiresAtMs = toMillis(expiresAt)
  const payload: CachedAccessState = {
    userId,
    isActivated: true,
    checkedAt: Date.now(),
    expiresAt: expiresAtMs > 0 ? expiresAtMs : null
  }
  await saveToDisk(OFFLINE_ACCESS_CACHE_KEY, payload)
}

async function restoreOfflineAccess(userId: string, force = false) {
  const cached = await readValidCachedAccess(userId).catch(() => null)
  if (activeUserId !== userId || !cached) return false

  offlineAccessRestored.value = true
  if (force || isOffline.value) {
    accessState.value = 'granted'
    accessError.value = ''
  }
  return true
}

function attachNetworkListeners() {
  if (networkListenersAttached || typeof window === 'undefined') return
  networkListenersAttached = true

  const updateNetworkState = () => {
    isOffline.value = !window.navigator.onLine
    if (isOffline.value && activeUserId) {
      void restoreOfflineAccess(activeUserId, true)
    }
  }

  updateNetworkState()
  window.addEventListener('online', updateNetworkState)
  window.addEventListener('offline', updateNetworkState)
}

function updateAccessLockRemaining() {
  accessLockRemainingSeconds.value = Math.max(0, Math.ceil((activeLockUntilMs - Date.now()) / 1000))
}

function ensureAccessLockTimer() {
  if (accessLockTimer || typeof window === 'undefined') return
  accessLockTimer = window.setInterval(updateAccessLockRemaining, 1000)
}

function stopAccessLockTimer() {
  if (!accessLockTimer) return
  clearInterval(accessLockTimer)
  accessLockTimer = null
}

async function readAccessAttemptLock(userId: string): Promise<number> {
  const snapshot = await getDoc(getAccessAttemptsRef(userId))
  const data = snapshot.data()
  const lockedUntilMs = toMillis(data?.lockedUntil)
  activeLockUntilMs = lockedUntilMs
  accessAttemptFailedCount.value = Number(data?.failedCount || 0)
  updateAccessLockRemaining()
  return accessLockRemainingSeconds.value
}

async function recordAccessAttemptFailure(userId: string, forceLock = false) {
  const snapshot = await getDoc(getAccessAttemptsRef(userId))
  const data = snapshot.data()
  const previousFailedCount = Math.max(0, Number(data?.failedCount || 0))
  const failedCount = forceLock ? MAX_ACCESS_KEY_ATTEMPTS : Math.min(MAX_ACCESS_KEY_ATTEMPTS, previousFailedCount + 1)
  const shouldLock = failedCount >= MAX_ACCESS_KEY_ATTEMPTS
  const lockedUntil = shouldLock ? new Date(Date.now() + ACCESS_KEY_LOCK_MS) : null

  await setDoc(getAccessAttemptsRef(userId), {
    failedCount,
    lockedUntil: lockedUntil ? Timestamp.fromDate(lockedUntil) : null,
    lastFailedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true })

  activeLockUntilMs = lockedUntil?.getTime() || 0
  accessAttemptFailedCount.value = failedCount
  updateAccessLockRemaining()
}

async function resetAccessAttemptFailure(userId: string) {
  await setDoc(getAccessAttemptsRef(userId), {
    failedCount: 0,
    lockedUntil: null,
    updatedAt: serverTimestamp()
  }, { merge: true })

  activeLockUntilMs = 0
  accessAttemptFailedCount.value = 0
  updateAccessLockRemaining()
}

export function useAccessActivation() {
  const beginAccessListener = (userId?: string | null, options: { force?: boolean } = {}) => {
    const normalizedUserId = String(userId || '').trim()
    attachNetworkListeners()
    if (accessUnsubscribe && activeUserId === normalizedUserId && !options.force) return

    accessUnsubscribe?.()
    accessAttemptsUnsubscribe?.()
    accessUnsubscribe = null
    accessAttemptsUnsubscribe = null
    activeUserId = normalizedUserId
    activeLockUntilMs = 0
    accessAttemptFailedCount.value = 0
    accessLockRemainingSeconds.value = 0
    accessError.value = ''

    if (!normalizedUserId) {
      accessState.value = 'checking'
      stopAccessLockTimer()
      return
    }

    ensureAccessLockTimer()
    accessState.value = 'checking'
    offlineAccessRestored.value = false
    void restoreOfflineAccess(normalizedUserId)
    accessUnsubscribe = onSnapshot(
      doc(db, 'users', normalizedUserId, 'access', 'state'),
      (snapshot) => {
        const data = snapshot.data()
        if (data?.isActivated === true) {
          accessState.value = 'granted'
          accessError.value = ''
          offlineAccessRestored.value = false
          void persistGrantedAccess(normalizedUserId, data?.expiresAt).catch((error) => {
            console.warn('[Access] Unable to cache confirmed access:', error)
          })
        } else if (snapshot.metadata.fromCache || isOffline.value) {
          // A local Firestore snapshot is not authoritative. This matters in
          // Tauri/WebView environments where navigator.onLine can stay true
          // even though the network is unavailable.
          void restoreOfflineAccess(normalizedUserId, true).then((restored) => {
            if (restored) return
            accessState.value = 'requires_key'
            accessError.value = ''
          })
        } else {
          accessState.value = 'requires_key'
          accessError.value = ''
          offlineAccessRestored.value = false
          void removeFromDisk(OFFLINE_ACCESS_CACHE_KEY).catch((error) => {
            console.warn('[Access] Unable to clear revoked access cache:', error)
          })
        }
      },
      () => {
        void restoreOfflineAccess(normalizedUserId, true).then((restored) => {
          if (restored) return
          accessState.value = 'error'
          accessError.value = 'Unable to verify your access status.'
        })
      }
    )

    accessAttemptsUnsubscribe = onSnapshot(
      getAccessAttemptsRef(normalizedUserId),
      (snapshot) => {
        const data = snapshot.data()
        accessAttemptFailedCount.value = Number(data?.failedCount || 0)
        activeLockUntilMs = toMillis(data?.lockedUntil)
        updateAccessLockRemaining()
      },
      () => {
        activeLockUntilMs = 0
        accessLockRemainingSeconds.value = 0
      }
    )
  }

  const stopAccessListener = () => {
    accessUnsubscribe?.()
    accessAttemptsUnsubscribe?.()
    accessUnsubscribe = null
    accessAttemptsUnsubscribe = null
    activeUserId = ''
    activeLockUntilMs = 0
    accessAttemptFailedCount.value = 0
    accessLockRemainingSeconds.value = 0
    accessError.value = ''
    accessState.value = 'checking'
    offlineAccessRestored.value = false
    stopAccessLockTimer()
  }

  const retryAccessCheck = () => {
    beginAccessListener(activeUserId, { force: true })
  }

  const activateAccessKey = async (key: string): Promise<boolean> => {
    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== activeUserId) {
      accessState.value = 'error'
      accessError.value = 'Your authentication session has expired. Please sign in again.'
      return false
    }

    accessError.value = ''
    try {
      let lockRemainingSeconds = 0
      try {
        lockRemainingSeconds = await readAccessAttemptLock(currentUser.uid)
      } catch (error) {
        console.warn('[Access] Unable to read local activation attempt lock:', error)
      }

      if (lockRemainingSeconds > 0) {
        accessError.value = 'Activation is temporarily locked. Please wait before trying again.'
        accessState.value = 'requires_key'
        return false
      }

      const idToken = await currentUser.getIdToken()
      const response = await fetch(`${getAccessWorkerUrl()}/v1/redeem`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key })
      })
      const payload = await response.json().catch(() => ({})) as { activated?: boolean; error?: unknown }
      if (!response.ok || payload.activated !== true) {
        accessError.value = getAccessErrorMessage(payload.error)
        try {
          await recordAccessAttemptFailure(currentUser.uid, response.status === 429)
        } catch (error) {
          console.warn('[Access] Unable to record failed activation attempt:', error)
        }
        accessState.value = 'requires_key'
        return false
      }

      try {
        await resetAccessAttemptFailure(currentUser.uid)
      } catch (error) {
        console.warn('[Access] Unable to reset activation attempts:', error)
      }
      accessState.value = 'granted'
      offlineAccessRestored.value = false
      await persistGrantedAccess(currentUser.uid)
      return true
    } catch {
      accessError.value = 'Unable to reach the access service. Please try again.'
      accessState.value = 'requires_key'
      return false
    }
  }

  return {
    accessState,
    accessError,
    accessLockRemainingSeconds,
    accessAttemptFailedCount,
    isOffline,
    offlineAccessRestored,
    beginAccessListener,
    stopAccessListener,
    retryAccessCheck,
    activateAccessKey
  }
}
