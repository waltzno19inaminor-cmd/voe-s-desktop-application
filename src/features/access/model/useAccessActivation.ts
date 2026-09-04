import { ref } from 'vue'
import { doc, getDoc, getDocFromServer, onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import { auth, db, getFirebaseAppCheckToken } from '~/shared/firebase.client'
import { loadFromDisk, removeFromDisk, saveToDisk } from '~/shared/diskStorage'
import {
  capabilitiesForPlan,
  isAccessPlan,
  normalizeAccessCapabilities,
  NO_ACCESS_CAPABILITIES,
  type AccessCapabilities,
  type AccessCapability,
  type AccessPlan
} from './accessEntitlements'

export type AccessActivationState = 'checking' | 'requires_key' | 'granted' | 'error'

const DEFAULT_ACCESS_WORKER_URL = 'https://auth.gandr.site'
const MAX_ACCESS_KEY_ATTEMPTS = 5
const ACCESS_KEY_LOCK_MS = 15 * 60 * 1000
const OFFLINE_ACCESS_CACHE_KEY = 'access_activation_offline_v2'
const OFFLINE_ACCESS_GRACE_MS = 30 * 24 * 60 * 60 * 1000
const accessState = ref<AccessActivationState>('checking')
const accessError = ref('')
const accessPlan = ref<AccessPlan>('none')
const accessCapabilities = ref<AccessCapabilities>(NO_ACCESS_CAPABILITIES)
const accessLockRemainingSeconds = ref(0)
const accessAttemptFailedCount = ref(0)
const freeTrialUsed = ref(false)
const freeTrialStatusKnown = ref(false)
const isOffline = ref(typeof navigator !== 'undefined' ? !navigator.onLine : false)
const offlineAccessRestored = ref(false)
const isAccountBlocked = ref(false)
const accountBlockedUntil = ref<number | null>(null)
let accessUnsubscribe: (() => void) | null = null
let userUnsubscribe: (() => void) | null = null
let accessAttemptsUnsubscribe: (() => void) | null = null
let accessTrialUnsubscribe: (() => void) | null = null
let accessLockTimer: ReturnType<typeof setInterval> | null = null
let accessExpiryTimer: ReturnType<typeof setTimeout> | null = null
let accountBlockExpiryTimer: ReturnType<typeof setTimeout> | null = null
let activeUserId = ''
let activeLockUntilMs = 0
let networkListenersAttached = false

type CachedAccessState = {
  userId: string
  isActivated: true
  checkedAt: number
  plan: Exclude<AccessPlan, 'none'>
  capabilities: AccessCapabilities
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

function clearAccessEntitlement() {
  accessPlan.value = 'none'
  accessCapabilities.value = NO_ACCESS_CAPABILITIES
}

function setAccessEntitlement(plan: Exclude<AccessPlan, 'none'>, capabilities?: unknown) {
  accessPlan.value = plan
  accessCapabilities.value = normalizeAccessCapabilities(capabilities, plan)
}

function resolveAccessPlan(data: Record<string, unknown> | undefined): Exclude<AccessPlan, 'none'> {
  // Existing valid access documents predate plans. Treating them as paid keeps
  // active customers online while the Worker begins issuing explicit plans.
  return isAccessPlan(data?.plan) ? data.plan : 'paid'
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
  if (!isAccessPlan(cached.plan)) return false
  if (!cached.capabilities || typeof cached.capabilities !== 'object') return false
  if (!Number.isFinite(cached.checkedAt) || !cached.checkedAt) return false
  if (Date.now() - cached.checkedAt > OFFLINE_ACCESS_GRACE_MS) return false
  if (cached.expiresAt && Date.now() >= cached.expiresAt) return false
  return true
}

async function readValidCachedAccess(userId: string): Promise<CachedAccessState | null> {
  const cached = await loadFromDisk<CachedAccessState>(OFFLINE_ACCESS_CACHE_KEY)
  return isValidCachedAccess(cached, userId) ? cached : null
}

async function persistGrantedAccess(
  userId: string,
  plan: Exclude<AccessPlan, 'none'>,
  capabilities: AccessCapabilities,
  expiresAt?: unknown
) {
  const expiresAtMs = toMillis(expiresAt)
  const payload: CachedAccessState = {
    userId,
    isActivated: true,
    checkedAt: Date.now(),
    plan,
    capabilities,
    expiresAt: expiresAtMs > 0 ? expiresAtMs : null
  }
  await saveToDisk(OFFLINE_ACCESS_CACHE_KEY, payload)
}

async function restoreOfflineAccess(userId: string, force = false) {
  const cached = await readValidCachedAccess(userId).catch(() => null)
  if (activeUserId !== userId || !cached) return false

  offlineAccessRestored.value = true
  setAccessEntitlement(cached.plan, cached.capabilities)
  scheduleAccessExpiry(userId, cached.expiresAt || 0)
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

function stopAccessExpiryTimer() {
  if (!accessExpiryTimer) return
  clearTimeout(accessExpiryTimer)
  accessExpiryTimer = null
}

function stopAccountBlockExpiryTimer() {
  if (!accountBlockExpiryTimer) return
  clearTimeout(accountBlockExpiryTimer)
  accountBlockExpiryTimer = null
}

function expireAccessLocally(userId: string) {
  if (activeUserId !== userId) return
  accessState.value = 'requires_key'
  clearAccessEntitlement()
  accessError.value = 'Your access period has expired. Please enter a new activation key.'
  offlineAccessRestored.value = false
  void removeFromDisk(OFFLINE_ACCESS_CACHE_KEY).catch((error) => {
    console.warn('[Access] Unable to clear expired access cache:', error)
  })
}

function blockAccessLocally(userId: string) {
  if (activeUserId !== userId) return
  stopAccessExpiryTimer()
  accessState.value = 'requires_key'
  clearAccessEntitlement()
  accessError.value = 'This account has been blocked. Please contact support.'
  offlineAccessRestored.value = false
  void removeFromDisk(OFFLINE_ACCESS_CACHE_KEY).catch((error) => {
    console.warn('[Access] Unable to clear blocked access cache:', error)
  })
}

function scheduleAccountBlockExpiry(userId: string, untilMs: number) {
  const remaining = untilMs - Date.now()
  if (remaining <= 0) {
    if (activeUserId !== userId) return
    isAccountBlocked.value = false
    accountBlockedUntil.value = null
    accessState.value = 'requires_key'
    accessError.value = ''
    return
  }

  accountBlockExpiryTimer = setTimeout(() => {
    if (activeUserId !== userId) return
    scheduleAccountBlockExpiry(userId, untilMs)
  }, Math.min(remaining, 2_147_000_000))
}

function applyAccountBlockState(userId: string, data: Record<string, unknown> | undefined) {
  stopAccountBlockExpiryTimer()
  const untilMs = toMillis(data?.blockedUntil)
  const isActiveBlock = data?.isBlocked === true && (!untilMs || untilMs > Date.now())
  isAccountBlocked.value = isActiveBlock
  accountBlockedUntil.value = isActiveBlock && untilMs > 0 ? untilMs : null

  if (!isActiveBlock) return
  blockAccessLocally(userId)

  if (untilMs > Date.now()) {
    scheduleAccountBlockExpiry(userId, untilMs)
  }
}

function applyAccessDocumentState(
  userId: string,
  data: Record<string, unknown> | undefined,
  fromCache = false
) {
  if (isAccountBlocked.value) {
    blockAccessLocally(userId)
  } else if (data?.isActivated === true) {
    const expiresAtMs = toMillis(data?.expiresAt)
    if (expiresAtMs > 0 && Date.now() >= expiresAtMs) {
      expireAccessLocally(userId)
    } else {
      const plan = resolveAccessPlan(data)
      setAccessEntitlement(plan, data?.capabilities)
      accessState.value = 'granted'
      accessError.value = ''
      offlineAccessRestored.value = false
      void persistGrantedAccess(userId, plan, accessCapabilities.value, data?.expiresAt).catch((error) => {
        console.warn('[Access] Unable to cache confirmed access:', error)
      })
      scheduleAccessExpiry(userId, expiresAtMs)
    }
  } else if (fromCache || isOffline.value) {
    stopAccessExpiryTimer()
    void restoreOfflineAccess(userId, true).then((restored) => {
      if (restored) return
      accessState.value = 'requires_key'
      clearAccessEntitlement()
      accessError.value = ''
    })
  } else {
    stopAccessExpiryTimer()
    accessState.value = 'requires_key'
    clearAccessEntitlement()
    accessError.value = ''
    offlineAccessRestored.value = false
    void removeFromDisk(OFFLINE_ACCESS_CACHE_KEY).catch((error) => {
      console.warn('[Access] Unable to clear revoked access cache:', error)
    })
  }
}

function scheduleAccessExpiry(userId: string, expiresAtMs: number) {
  stopAccessExpiryTimer()
  if (!expiresAtMs) return
  const remaining = expiresAtMs - Date.now()
  if (remaining <= 0) {
    expireAccessLocally(userId)
    return
  }
  // setTimeout accepts at most a signed 32-bit millisecond delay.
  accessExpiryTimer = setTimeout(() => scheduleAccessExpiry(userId, expiresAtMs), Math.min(remaining, 2_147_000_000))
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

async function getAccessRequestHeaders(idToken: string): Promise<Record<string, string>> {
  const appCheckToken = await getFirebaseAppCheckToken()
  return {
    Authorization: `Bearer ${idToken}`,
    ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {})
  }
}

function applyGrantedResponse(payload: { plan?: unknown; capabilities?: unknown; expiresAt?: unknown }, userId: string) {
  const plan = isAccessPlan(payload.plan) ? payload.plan : 'paid'
  setAccessEntitlement(plan, payload.capabilities)
  accessState.value = 'granted'
  offlineAccessRestored.value = false
  const expiresAtMs = toMillis(payload.expiresAt)
  return persistGrantedAccess(userId, plan, accessCapabilities.value, expiresAtMs || undefined)
    .then(() => scheduleAccessExpiry(userId, expiresAtMs))
}

export function useAccessActivation() {
  const canAccess = (capability: AccessCapability) => (
    accessState.value === 'granted' && accessCapabilities.value[capability] === true
  )

  const beginAccessListener = (userId?: string | null, options: { force?: boolean } = {}) => {
    const normalizedUserId = String(userId || '').trim()
    attachNetworkListeners()
    if (accessUnsubscribe && activeUserId === normalizedUserId && !options.force) return

    accessUnsubscribe?.()
    userUnsubscribe?.()
    accessAttemptsUnsubscribe?.()
    accessTrialUnsubscribe?.()
    stopAccessExpiryTimer()
    stopAccountBlockExpiryTimer()
    accessUnsubscribe = null
    userUnsubscribe = null
    accessAttemptsUnsubscribe = null
    accessTrialUnsubscribe = null
    activeUserId = normalizedUserId
    isAccountBlocked.value = false
    accountBlockedUntil.value = null
    activeLockUntilMs = 0
    accessAttemptFailedCount.value = 0
    freeTrialUsed.value = false
    freeTrialStatusKnown.value = false
    accessLockRemainingSeconds.value = 0
    accessError.value = ''
    clearAccessEntitlement()

    if (!normalizedUserId) {
      accessState.value = 'checking'
      stopAccessLockTimer()
      return
    }

    ensureAccessLockTimer()
    accessState.value = 'checking'
    clearAccessEntitlement()
    offlineAccessRestored.value = false
    void restoreOfflineAccess(normalizedUserId)
    userUnsubscribe = onSnapshot(
      doc(db, 'users', normalizedUserId),
      (snapshot) => {
        const wasBlocked = isAccountBlocked.value
        applyAccountBlockState(normalizedUserId, snapshot.data())

        // The admin panel restores the profile and license in two writes. If
        // the license snapshot arrives first, read the final server state once
        // the block flag is removed so access resumes without a restart.
        if (wasBlocked && !isAccountBlocked.value) {
          void getDocFromServer(doc(db, 'users', normalizedUserId, 'access', 'state'))
            .then((accessSnapshot) => {
              if (activeUserId !== normalizedUserId) return
              applyAccessDocumentState(normalizedUserId, accessSnapshot.data(), false)
            })
            .catch(() => {
              // The regular listener remains active and will retry naturally.
            })
        }
      },
      () => {
        // Do not revoke access because a profile read transiently failed.
      }
    )
    accessUnsubscribe = onSnapshot(
      doc(db, 'users', normalizedUserId, 'access', 'state'),
      (snapshot) => {
        applyAccessDocumentState(normalizedUserId, snapshot.data(), snapshot.metadata.fromCache)
      },
      () => {
        void restoreOfflineAccess(normalizedUserId, true).then((restored) => {
          if (restored) return
          accessState.value = 'error'
          clearAccessEntitlement()
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

    accessTrialUnsubscribe = onSnapshot(
      doc(db, 'users', normalizedUserId, 'accessTrials', 'first'),
      (snapshot) => {
        freeTrialUsed.value = snapshot.exists()
        freeTrialStatusKnown.value = true
      },
      () => {
        // Do not show the trial button again merely because the network failed
        // after we have already learned that the account used it.
      }
    )
  }

  const stopAccessListener = () => {
    accessUnsubscribe?.()
    userUnsubscribe?.()
    accessAttemptsUnsubscribe?.()
    accessTrialUnsubscribe?.()
    accessUnsubscribe = null
    userUnsubscribe = null
    accessAttemptsUnsubscribe = null
    accessTrialUnsubscribe = null
    stopAccessExpiryTimer()
    stopAccountBlockExpiryTimer()
    activeUserId = ''
    isAccountBlocked.value = false
    accountBlockedUntil.value = null
    activeLockUntilMs = 0
    accessAttemptFailedCount.value = 0
    freeTrialUsed.value = false
    freeTrialStatusKnown.value = false
    accessLockRemainingSeconds.value = 0
    accessError.value = ''
    accessState.value = 'checking'
    clearAccessEntitlement()
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
    if (isAccountBlocked.value) {
      blockAccessLocally(currentUser.uid)
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

      const idToken = await currentUser.getIdToken(true)
      const response = await fetch(`${getAccessWorkerUrl()}/v1/redeem`, {
        method: 'POST',
        headers: {
          ...await getAccessRequestHeaders(idToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key })
      })
      const payload = await response.json().catch(() => ({})) as {
        activated?: boolean
        plan?: unknown
        capabilities?: unknown
        expiresAt?: unknown
        error?: unknown
      }
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
      await applyGrantedResponse(payload, currentUser.uid)
      return true
    } catch {
      accessError.value = 'Unable to reach the access service. Please try again.'
      accessState.value = 'requires_key'
      return false
    }
  }

  const activateFreeTrial = async (): Promise<boolean> => {
    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== activeUserId) {
      accessState.value = 'error'
      accessError.value = 'Your authentication session has expired. Please sign in again.'
      return false
    }
    if (isAccountBlocked.value) {
      blockAccessLocally(currentUser.uid)
      return false
    }
    accessError.value = ''
    try {
      const idToken = await currentUser.getIdToken(true)
      const response = await fetch(`${getAccessWorkerUrl()}/v1/trial`, {
        method: 'POST', headers: await getAccessRequestHeaders(idToken)
      })
      const payload = await response.json().catch(() => ({})) as {
        activated?: boolean
        plan?: unknown
        capabilities?: unknown
        expiresAt?: unknown
        error?: unknown
      }
      if (!response.ok || payload.activated !== true) {
        accessError.value = getAccessErrorMessage(payload.error)
        accessState.value = 'requires_key'
        return false
      }
      await applyGrantedResponse(payload, currentUser.uid)
      return true
    } catch {
      accessError.value = 'Unable to reach the access service. Please try again.'
      accessState.value = 'requires_key'
      return false
    }
  }

  const activateFreePlan = async (): Promise<boolean> => {
    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== activeUserId) {
      accessState.value = 'error'
      clearAccessEntitlement()
      accessError.value = 'Your authentication session has expired. Please sign in again.'
      return false
    }
    if (isAccountBlocked.value) {
      blockAccessLocally(currentUser.uid)
      return false
    }

    accessError.value = ''
    try {
      const idToken = await currentUser.getIdToken(true)
      const response = await fetch(`${getAccessWorkerUrl()}/v1/free`, {
        method: 'POST', headers: await getAccessRequestHeaders(idToken)
      })
      const payload = await response.json().catch(() => ({})) as {
        activated?: boolean
        plan?: unknown
        capabilities?: unknown
        expiresAt?: unknown
        error?: unknown
      }
      if (!response.ok || payload.activated !== true) {
        accessError.value = getAccessErrorMessage(payload.error)
        accessState.value = 'requires_key'
        clearAccessEntitlement()
        return false
      }

      await applyGrantedResponse(payload, currentUser.uid)
      return true
    } catch {
      accessError.value = 'Unable to reach the access service. Please try again.'
      accessState.value = 'requires_key'
      clearAccessEntitlement()
      return false
    }
  }

  return {
    accessState,
    accessError,
    accessPlan,
    accessCapabilities,
    canAccess,
    accessLockRemainingSeconds,
    accessAttemptFailedCount,
    freeTrialUsed,
    freeTrialStatusKnown,
    isOffline,
    offlineAccessRestored,
    isAccountBlocked,
    accountBlockedUntil,
    beginAccessListener,
    stopAccessListener,
    retryAccessCheck,
    activateAccessKey,
    activateFreeTrial,
    activateFreePlan
  }
}
