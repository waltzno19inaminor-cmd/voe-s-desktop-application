import { ref, computed } from 'vue'
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '~/shared/firebase.client'
import type { TournamentEvent, TournamentParticipant } from './tournament.types'

export const DEFAULT_TOURNAMENT: TournamentEvent = {
  id: 'apex_protocol_2026',
  title: 'GENESIS // APEX TACTICAL CUP',
  subtitle: 'CHAMPIONSHIP OF AUTONOMOUS LOGIC & VOLUMETRIC TRADING PROTOCOLS',
  description: 'An elite competitive trading protocol evaluation. Operators pit their most advanced strategies, scenario trees, and risk management matrices against algorithmic benchmarks in real-time global markets. Top performers receive reified status, custom neural telemetry links, and priority algorithmic pool allocations.',
  imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
  bannerUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80',
  announceDate: '2026-07-20T00:00:00Z',
  startDate: '2026-08-01T00:00:00Z',
  endDate: '2026-08-15T00:00:00Z',
  prizePool: '$250,000 ARCHIVE ALLOCATION + REIFIED OPERATOR BADGE',
  status: 'announced'
}

export const currentTournament = ref<TournamentEvent | null>({ ...DEFAULT_TOURNAMENT })
export const isTournamentLoading = ref(false)
export const isRegistering = ref(false)
export const isUserRegistered = ref(false)

let tournamentUnsubscribe: (() => void) | null = null
let participantUnsubscribe: (() => void) | null = null

export function initTournamentListener() {
  if (tournamentUnsubscribe) return

  const tournamentRef = doc(db, 'tournaments', 'apex_protocol_2026')

  tournamentUnsubscribe = onSnapshot(tournamentRef, async (docSnap) => {
    if (docSnap.exists()) {
      currentTournament.value = docSnap.data() as TournamentEvent
    } else {
      // Automatically seed if missing in Firestore
      await seedDefaultTournament()
    }
    isTournamentLoading.value = false
  }, (err) => {
    console.warn('[Tournament] Error listening to tournament, utilizing default telemetry:', err)
    if (!currentTournament.value) {
      currentTournament.value = { ...DEFAULT_TOURNAMENT }
    }
    isTournamentLoading.value = false
  })
}

export function initParticipantListener(userId?: string) {
  if (participantUnsubscribe) {
    participantUnsubscribe()
    participantUnsubscribe = null
  }
  isUserRegistered.value = false

  if (!userId) return

  const participantRef = doc(db, 'tournaments', 'apex_protocol_2026', 'participants', userId)
  participantUnsubscribe = onSnapshot(participantRef, (docSnap) => {
    isUserRegistered.value = docSnap.exists()
  }, (err) => {
    console.warn('[Tournament] Error listening to participant:', err)
  })
}

export async function seedDefaultTournament() {
  try {
    const tournamentRef = doc(db, 'tournaments', 'apex_protocol_2026')
    await setDoc(tournamentRef, DEFAULT_TOURNAMENT, { merge: true })
    currentTournament.value = { ...DEFAULT_TOURNAMENT }
  } catch (err) {
    console.error('[Tournament] Failed to seed default tournament:', err)
  }
}

export async function registerForTournament(userId: string, userEmail?: string) {
  if (!userId) return
  
  isRegistering.value = true
  try {
    const participantRef = doc(db, 'tournaments', 'apex_protocol_2026', 'participants', userId)
    const participantData: TournamentParticipant = {
      userId,
      userEmail: userEmail || '',
      registeredAt: new Date().toISOString(),
      status: 'active'
    }
    await setDoc(participantRef, participantData, { merge: true })
    isUserRegistered.value = true
  } catch (err) {
    console.error('[Tournament] Error registering for tournament:', err)
    throw err
  } finally {
    isRegistering.value = false
  }
}

function toMillis(dateVal: any): number {
  if (!dateVal) return 0
  if (typeof dateVal === 'number') return dateVal
  if (typeof dateVal === 'object' && 'seconds' in dateVal) return dateVal.seconds * 1000 + (dateVal.nanoseconds || 0) / 1000000
  if (typeof dateVal === 'object' && typeof dateVal.toDate === 'function') return dateVal.toDate().getTime()
  const parsed = new Date(dateVal).getTime()
  return isNaN(parsed) ? 0 : parsed
}

export const isEventAnnounced = computed(() => {
  if (!currentTournament.value) return false
  const now = Date.now()
  const announceTime = toMillis(currentTournament.value.announceDate)
  const endTime = toMillis(currentTournament.value.endDate)
  return (!announceTime || now >= announceTime) && (!endTime || now <= endTime)
})

export const isRegistrationOpen = computed(() => {
  if (!currentTournament.value) return false
  const now = Date.now()
  const startTime = toMillis(currentTournament.value.startDate)
  const endTime = toMillis(currentTournament.value.endDate)
  return (!startTime || now >= startTime) && (!endTime || now <= endTime)
})

export function terminateTournamentListeners() {
  if (tournamentUnsubscribe) {
    tournamentUnsubscribe()
    tournamentUnsubscribe = null
  }
  if (participantUnsubscribe) {
    participantUnsubscribe()
    participantUnsubscribe = null
  }
}
