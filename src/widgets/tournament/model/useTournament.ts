import { ref, computed } from 'vue'
import { doc, collection, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '~/shared/firebase.client'
import type { TournamentEvent, TournamentParticipant } from './tournament.types'

export const DEFAULT_TOURNAMENT: TournamentEvent = {
  id: 'apex_protocol_2026',
  title: 'GENESIS // APEX TACTICAL CUP',
  subtitle: 'CHAMPIONSHIP OF AUTONOMOUS LOGIC & VOLUMETRIC TRADING PROTOCOLS',
  description: 'An elite competitive trading protocol evaluation. Operators pit their most advanced strategies, scenario trees, and risk management matrices against algorithmic benchmarks in real-time global markets. Top performers receive reified status, custom neural telemetry links, and priority algorithmic pool allocations.',
  titleRu: 'GENESIS // ТАКТИЧЕСКИЙ КУБОК APEX',
  subtitleRu: 'ЧЕМПИОНАТ АВТОНОМНОЙ ЛОГИКИ И ОБЪЕМНЫХ ТОРГОВЫХ ПРОТОКОЛОВ',
  descriptionRu: 'Элитарная оценка конкурентных торговых протоколов. Операторы выставляют свои передовые стратегии, деревья сценариев и матрицы риск-менеджмента против алгоритмических бенчмарков на реальных рынках. Лидеры получают подтвержденный статус, нейро-телеметрические каналы и приоритет в распределении пула.',
  rules: [
    "Autonomous scenario & risk execution precision: All operations must adhere strictly to predefined algorithmic risk boundaries and scenario trees.",
    "Maximum adherence to predefined stop-loss protocols: Breaching daily drawdown or stop-loss parameters results in immediate synchronization lock and tactical disqualification.",
    "Minimal cognitive friction during volatile market phases: Emotional overrides and manual impulse actions penalize the operator's evaluation score.",
    "Verified credential synchronization: Participants must maintain verified exchange credential linkage throughout the evaluation window.",
    "Transparent volumetric telemetry: All executed trades must broadcast full execution logs, entry hypotheses, and exit criteria to the Genesis archive."
  ],
  rulesRu: [
    "Точное исполнение автономных сценариев и риск-менеджмента: Все операции должны строго соответствовать заданным алгоритмическим границам риска и деревьям сценариев.",
    "Безусловное соблюдение протоколов стоп-лосс: Превышение дневной просадки или нарушение стоп-лосс параметров ведет к немедленной блокировке синхронизации и дисквалификации.",
    "Минимальное когнитивное трение в фазах волатильного рынка: Эмоциональное вмешательство и импульсивные ручные действия снижают итоговый оценочный балл оператора.",
    "Подтверждённая синхронность учетных данных: Участники обязаны поддерживать верифицированную привязку биржевых аккаунтов на протяжении всего периода оценки.",
    "Прозрачная объемная телеметрия: Все совершенные сделки должны транслировать полные логи исполнения, торговые гипотезы и критерии выхода в архив Genesis."
  ],
  imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
  bannerUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80',
  announceDate: '2026-07-20T00:00:00Z',
  startDate: '2026-08-01T00:00:00Z',
  endDate: '2026-08-15T00:00:00Z',
  prizePool: '$250,000 ARCHIVE ALLOCATION + REIFIED OPERATOR BADGE',
  prizePoolRu: '$250,000 АЛЛОКАЦИЯ АРХИВА + СТАТУС ВЕРИФИЦИРОВАННОГО ОПЕРАТОРА',
  status: 'announced',
  type: 'limited'
}

export const allTournaments = ref<TournamentEvent[]>([{ ...DEFAULT_TOURNAMENT }])
export const currentTournament = computed(() => allTournaments.value[0] || { ...DEFAULT_TOURNAMENT })
export const isTournamentLoading = ref(false)
export const isRegistering = ref(false)
export const isUserRegistered = ref(false)

let tournamentUnsubscribe: (() => void) | null = null
let participantUnsubscribe: (() => void) | null = null

export function initTournamentListener() {
  if (tournamentUnsubscribe) return

  const tournamentsCol = collection(db, 'tournaments')

  tournamentUnsubscribe = onSnapshot(tournamentsCol, async (snapshot) => {
    if (!snapshot.empty) {
      const docsData: TournamentEvent[] = []
      snapshot.forEach((docSnap) => {
        docsData.push({ ...docSnap.data(), id: docSnap.id } as TournamentEvent)
      })
      allTournaments.value = docsData
    } else {
      // Automatically seed if missing in Firestore
      await seedDefaultTournament()
    }
    isTournamentLoading.value = false
  }, (err) => {
    console.warn('[Tournament] Error listening to tournaments collection, utilizing default telemetry:', err)
    if (!allTournaments.value || allTournaments.value.length === 0) {
      allTournaments.value = [{ ...DEFAULT_TOURNAMENT }]
    }
    isTournamentLoading.value = false
  })
}

export function initParticipantListener(userId?: string, eventId?: string) {
  if (participantUnsubscribe) {
    participantUnsubscribe()
    participantUnsubscribe = null
  }
  isUserRegistered.value = false

  if (!userId) return

  const targetEventId = eventId || allTournaments.value[0]?.id || 'apex_protocol_2026'
  const participantRef = doc(db, 'tournaments', targetEventId, 'participants', userId)

  participantUnsubscribe = onSnapshot(participantRef, (snapshot) => {
    isUserRegistered.value = snapshot.exists()
  }, (err) => {
    isUserRegistered.value = false
    console.warn('[Tournament] Error listening to participant registration:', err)
  })
}

export async function seedDefaultTournament() {
  try {
    const tournamentRef = doc(db, 'tournaments', 'apex_protocol_2026')
    await setDoc(tournamentRef, DEFAULT_TOURNAMENT, { merge: true })
    allTournaments.value = [{ ...DEFAULT_TOURNAMENT }]
  } catch (err) {
    console.error('[Tournament] Failed to seed default tournament:', err)
  }
}

export function toMillis(dateVal: any): number {
  if (!dateVal) return 0
  if (typeof dateVal === 'number') return dateVal
  if (typeof dateVal === 'object' && 'seconds' in dateVal) return dateVal.seconds * 1000 + (dateVal.nanoseconds || 0) / 1000000
  if (typeof dateVal === 'object' && typeof dateVal.toDate === 'function') return dateVal.toDate().getTime()
  const parsed = new Date(dateVal).getTime()
  return isNaN(parsed) ? 0 : parsed
}

export async function registerForTournament(userId: string, userEmail?: string, eventId?: string) {
  if (!userId) {
    throw new Error('A signed-in user is required to register for a tournament.')
  }

  const targetEventId = eventId || allTournaments.value[0]?.id || 'apex_protocol_2026'
  const participantRef = doc(db, 'tournaments', targetEventId, 'participants', userId)

  await setDoc(participantRef, {
    userId,
    registeredAt: serverTimestamp(),
    ...(userEmail ? { userEmail } : {}),
    status: 'active'
  })

  isUserRegistered.value = true
}

export function checkRegistrationOpen(event?: TournamentEvent | null): boolean {
  if (!event) return false
  const now = Date.now()
  const startTime = toMillis(event.startDate)
  const endTime = toMillis(event.endDate)
  return (!startTime || now >= startTime) && (!endTime || now <= endTime)
}

export const isEventAnnounced = computed(() => {
  if (!currentTournament.value) return false
  const now = Date.now()
  const announceTime = toMillis(currentTournament.value.announceDate)
  const endTime = toMillis(currentTournament.value.endDate)
  return (!announceTime || now >= announceTime) && (!endTime || now <= endTime)
})

export const isRegistrationOpen = computed(() => {
  return checkRegistrationOpen(currentTournament.value)
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
