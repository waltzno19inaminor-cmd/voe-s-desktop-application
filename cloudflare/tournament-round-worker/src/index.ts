interface Env {
  FIREBASE_PROJECT_ID: string
  FIREBASE_CLIENT_EMAIL: string
  FIREBASE_PRIVATE_KEY: string
  MANUAL_RUN_TOKEN: string
  POINTS_PER_CORRECT?: string
  POINTS_PER_INCORRECT?: string
  MARKET_DATA_DELAY_MINUTES?: string
}

interface FirestoreValue {
  nullValue?: null
  booleanValue?: boolean
  integerValue?: string
  doubleValue?: number
  timestampValue?: string
  stringValue?: string
  arrayValue?: { values?: FirestoreValue[] }
  mapValue?: { fields?: Record<string, FirestoreValue> }
}

interface FirestoreDocumentResponse {
  name: string
  fields?: Record<string, FirestoreValue>
  createTime?: string
  updateTime?: string
}

interface FirestoreDocument {
  id: string
  name: string
  path: string
  data: Record<string, unknown>
  createTime?: string
  updateTime?: string
}

interface FirestoreWrite {
  update: {
    name: string
    fields: Record<string, FirestoreValue>
  }
  updateMask: {
    fieldPaths: string[]
  }
  updateTransforms?: Array<{
    fieldPath: string
    setToServerValue: 'REQUEST_TIME'
  }>
  currentDocument?: {
    exists?: boolean
    updateTime?: string
  }
}

type PredictionDirection = 'LONG' | 'SHORT'
type MarketSession = 'UTC_24H' | 'NYSE'

interface ResolvedAsset {
  assetId: string
  symbol: string
  type: string
  yahooSymbolCandidates: string[]
  session: MarketSession
}

interface YahooCandle {
  timestampMs: number
  open: number
  high: number
  low: number
  close: number
}

interface AssetResolution {
  assetId: string
  asset: string
  direction: PredictionDirection
  initialPrice: number
  finalPrice: number
}

interface AssetVoteSummary {
  assetId: string
  longVotes: number
  shortVotes: number
  winnerShare: number
  difficultyMultiplier: number
  pointsForCorrect: number
}

interface LeaderboardAssetStat {
  assetId: string
  asset: string
  totalPredictions: number
  correctPredictions: number
  missedPredictions: number
  pointsEarned: number
}

interface UserScoreDelta {
  points: number
  totalPredictions: number
  correctPredictions: number
  missedPredictions: number
  assetStats: Map<string, LeaderboardAssetStat>
}

interface TournamentRunResult {
  tournamentId: string
  status: 'settled' | 'cancelled' | 'recalculated' | 'skipped' | 'failed'
  reason?: string
  seasonId?: string
  closedRoundId?: string
  cancelledRoundId?: string
  recalculatedRoundId?: string
  openedRoundId?: string
  predictionsProcessed?: number
  usersUpdated?: number
  roundsRebuilt?: number
  seasonPrizesAwarded?: number
  specialPrizesAwarded?: number
  assetResults?: Record<string, PredictionDirection>
}

interface LeaderboardRow {
  userId: string
  points: number
}

interface SeasonWinRecord {
  seasonIds: string[]
  seasonOrdinals: number[]
}

interface SpecialPrizeAwardPlan {
  writes: FirestoreWrite[]
  userIds: string[]
}

interface SeasonPrizeAwardPlan {
  writes: FirestoreWrite[]
  prizeByUserId: Map<string, AwardedSeasonPrize>
}

interface AwardedSeasonPrize {
  rank: number
  prizeName: string
  prize: Record<string, unknown>
}

interface RunReport {
  dryRun: boolean
  startedAt: string
  finishedAt: string
  tournaments: TournamentRunResult[]
}

interface RebuiltLeaderboardEntry {
  userId: string
  points: number
  totalPredictions: number
  correctPredictions: number
  missedPredictions: number
  assetStats: Map<string, LeaderboardAssetStat>
}

const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore'
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const YAHOO_CHART_ENDPOINTS = [
  'https://query1.finance.yahoo.com/v8/finance/chart',
  'https://query2.finance.yahoo.com/v8/finance/chart'
] as const
const MINUTE_MS = 60 * 1000
const CANDLE_INTERVAL_MINUTES = 30
const CANDLE_INTERVAL_MS = CANDLE_INTERVAL_MINUTES * MINUTE_MS
const MAX_ATOMIC_WRITES = 450
const YAHOO_MAX_ATTEMPTS = 4
const APEX_PROTOCOL_TOURNAMENT_ID = 'apex_protocol_2026'
const SPECIAL_PRIZE_TYPE_LICENSE_KEY = 'license-key'
const SPECIAL_PRIZE_REQUIRED_SEASON_WINS = 2
const MISSED_PREDICTION_PENALTY = -5
const MAX_DIFFICULTY_MULTIPLIER = 2

let cachedGoogleToken: { value: string; expiresAtMs: number } | null = null

export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      runDailySettlement(env, false, controller.scheduledTime)
        .then((report) => console.log(JSON.stringify({
          trigger: 'cron',
          scheduledTime: new Date(controller.scheduledTime).toISOString(),
          report
        })))
        .catch((error) => console.error('[Tournament Worker] Scheduled run failed:', serializeError(error)))
    )
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return jsonResponse({ ok: true, service: 'tournament-round-worker' })
    }

    if (
      (url.pathname !== '/run' && url.pathname !== '/recalculate-last-round')
      || request.method !== 'POST'
    ) {
      return jsonResponse({ error: 'Not found' }, 404)
    }

    const authorization = request.headers.get('Authorization')
    if (!env.MANUAL_RUN_TOKEN || authorization !== `Bearer ${env.MANUAL_RUN_TOKEN}`) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    try {
      const dryRun = url.searchParams.get('dryRun') === 'true'
      const tournamentId = url.searchParams.get('tournamentId') || undefined
      const report = url.pathname === '/recalculate-last-round'
        ? await runLastRoundRecalculation(env, dryRun, Date.now(), tournamentId)
        : await runDailySettlement(env, dryRun)
      return jsonResponse(report)
    } catch (error) {
      console.error(`[Tournament Worker] Manual ${url.pathname} failed:`, serializeError(error))
      return jsonResponse({ error: serializeError(error) }, 500)
    }
  }
}

async function runDailySettlement(env: Env, dryRun: boolean, nowMs = Date.now()): Promise<RunReport> {
  validateEnv(env)

  const startedAt = new Date(nowMs)
  const firestore = new FirestoreRestClient(env)
  const tournamentDocuments = await firestore.listDocuments('', 'tournaments')
  const tournamentResults: TournamentRunResult[] = []

  for (const tournament of tournamentDocuments) {
    try {
      tournamentResults.push(await settleTournament({
        env,
        firestore,
        tournament,
        dryRun,
        nowMs
      }))
    } catch (error) {
      console.error(`[Tournament Worker] ${tournament.id} failed:`, serializeError(error))
      tournamentResults.push({
        tournamentId: tournament.id,
        status: 'failed',
        reason: serializeError(error)
      })
    }
  }

  return {
    dryRun,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    tournaments: tournamentResults
  }
}

async function runLastRoundRecalculation(
  env: Env,
  dryRun: boolean,
  nowMs = Date.now(),
  onlyTournamentId?: string
): Promise<RunReport> {
  validateEnv(env)

  const startedAt = new Date(nowMs)
  const firestore = new FirestoreRestClient(env)
  const tournamentDocuments = await firestore.listDocuments('', 'tournaments')
  const selectedTournaments = onlyTournamentId
    ? tournamentDocuments.filter((tournament) => tournament.id === onlyTournamentId)
    : tournamentDocuments
  const tournamentResults: TournamentRunResult[] = []

  if (onlyTournamentId && !selectedTournaments.length) {
    return {
      dryRun,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      tournaments: [{
        tournamentId: onlyTournamentId,
        status: 'skipped',
        reason: 'Tournament not found.'
      }]
    }
  }

  for (const tournament of selectedTournaments) {
    try {
      tournamentResults.push(await recalculateTournamentLatestPassedRound({
        env,
        firestore,
        tournament,
        dryRun,
        nowMs
      }))
    } catch (error) {
      console.error(`[Tournament Worker] ${tournament.id} recalculation failed:`, serializeError(error))
      tournamentResults.push({
        tournamentId: tournament.id,
        status: 'failed',
        reason: serializeError(error)
      })
    }
  }

  return {
    dryRun,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    tournaments: tournamentResults
  }
}

async function settleTournament(input: {
  env: Env
  firestore: FirestoreRestClient
  tournament: FirestoreDocument
  dryRun: boolean
  nowMs: number
}): Promise<TournamentRunResult> {
  const { env, firestore, tournament, dryRun, nowMs } = input
  const tournamentId = tournament.id
  const seasons = await firestore.listDocuments(`tournaments/${tournamentId}`, 'seasons')
  const openedSeasons = seasons.filter((season) => normalizeStatus(season.data.status) === 'opened')

  if (!openedSeasons.length) {
    return { tournamentId, status: 'skipped', reason: 'No opened season.' }
  }
  if (openedSeasons.length > 1) {
    throw new Error(`Expected one opened season, found ${openedSeasons.length}.`)
  }

  const season = openedSeasons[0]
  const seasonOrdinal = seasons.findIndex((entry) => entry.id === season.id) + 1
  if (seasonOrdinal < 1) {
    throw new Error(`Could not determine ordinal for opened season ${season.id}.`)
  }
  const rounds = await firestore.listDocuments(
    `tournaments/${tournamentId}/seasons/${season.id}`,
    'rounds'
  )
  const openedRounds = rounds.filter((round) => normalizeStatus(round.data.status) === 'opened')

  if (!openedRounds.length) {
    return {
      tournamentId,
      seasonId: season.id,
      status: 'skipped',
      reason: 'No opened round.'
    }
  }
  if (openedRounds.length > 1) {
    throw new Error(`Expected one opened round, found ${openedRounds.length}.`)
  }

  const round = openedRounds[0]
  const roundOrdinal = rounds.findIndex((entry) => entry.id === round.id) + 1
  if (roundOrdinal < 1) {
    throw new Error(`Could not determine ordinal for opened round ${round.id}.`)
  }
  const startsAt = requireDate(round.data.startsAt, 'round.startsAt')
  const endsAt = requireDate(round.data.endsAt, 'round.endsAt')
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new Error('round.endsAt must be later than round.startsAt.')
  }
  const timeWindowMinutes = requirePositiveInteger(season.data.timeWindow, 'season.timeWindow')
  const resolutionEndsAtMs = endsAt.getTime() + timeWindowMinutes * MINUTE_MS
  if (!Number.isSafeInteger(resolutionEndsAtMs)) {
    throw new Error('season.timeWindow produces an invalid resolution end time.')
  }

  const tradingHolidays = readTradingHolidays(season.data.tradingHolidays)
  const nextRoundDay = findNextTradingDay(
    getNextUtcCalendarDay(endsAt.getTime()),
    tradingHolidays
  )

  const nextStartsAt = moveToUtcCalendarDay(startsAt, nextRoundDay)
  const nextEndsAt = moveToUtcCalendarDay(endsAt, nextRoundDay)
  const nextRoundId = createRoundId(nextStartsAt)
  const nextRoundName = firestore.documentName(
    `tournaments/${tournamentId}/seasons/${season.id}/rounds/${nextRoundId}`
  )

  const cancellationReason = readCancellationReason(round.data)
  if (cancellationReason) {
    const cancellationWrites: FirestoreWrite[] = [
      makeUpdateWrite({
        name: round.name,
        fields: {
          status: 'cancelled',
          cancelReason: cancellationReason,
          nextRoundId
        },
        serverTimestampFields: ['cancelledAt'],
        precondition: requireUpdateTime(round, 'opened round')
      }),
      makeUpdateWrite({
        name: nextRoundName,
        fields: {
          status: 'opened',
          startsAt: nextStartsAt,
          endsAt: nextEndsAt,
          previousRoundId: round.id
        },
        serverTimestampFields: ['createdAt'],
        precondition: { exists: false }
      })
    ]

    if (!dryRun) {
      await firestore.commit(cancellationWrites)
    }

    return {
      tournamentId,
      seasonId: season.id,
      status: 'cancelled',
      cancelledRoundId: round.id,
      openedRoundId: nextRoundId,
      reason: cancellationReason
    }
  }

  const allowedAssets = requireArray(tournament.data.allowedAssets, 'tournament.allowedAssets')
    .map(resolveAllowedAsset)
  ensureUniqueAssetIds(allowedAssets)

  const resolutionWindows = allowedAssets.map((asset) => {
    const marketSessionCloseMs = getMarketSessionCloseMs(asset.session, endsAt.getTime())
    if (resolutionEndsAtMs > marketSessionCloseMs) {
      throw new Error(
        `${asset.symbol}: season.timeWindow extends past the ${asset.session} session close. ` +
        'Shorten timeWindow or make round.endsAt earlier.'
      )
    }

    return {
      asset,
      resolutionEndsAtMs
    }
  })
  const dataDelayMs = parseNonNegativeInteger(env.MARKET_DATA_DELAY_MINUTES, 0) * MINUTE_MS

  if (nowMs < resolutionEndsAtMs + dataDelayMs) {
    return {
      tournamentId,
      seasonId: season.id,
      status: 'skipped',
      reason: `Market data is not final yet. Earliest settlement: ${new Date(resolutionEndsAtMs + dataDelayMs).toISOString()}.`
    }
  }

  const resolutions = await mapWithConcurrency(
    resolutionWindows,
    1,
    async ({ asset, resolutionEndsAtMs: assetResolutionEndsAtMs }) => (
      resolveAssetDirection(asset, startsAt.getTime(), endsAt.getTime(), assetResolutionEndsAtMs)
    )
  )
  const resolutionsByAssetId = new Map(resolutions.map((resolution) => [resolution.assetId, resolution]))

  const predictions = await firestore.listDocuments(
    `tournaments/${tournamentId}/seasons/${season.id}/rounds/${round.id}`,
    'predictions'
  )
  const leaderboardDocuments = await firestore.listDocuments(
    `tournaments/${tournamentId}/seasons/${season.id}`,
    'leaderboard'
  )
  const scoring = calculateUserDeltas({
    predictions,
    allowedAssets,
    resolutionsByAssetId,
    leaderboardUserIds: leaderboardDocuments.map((entry) => entry.id),
    startsAtMs: startsAt.getTime(),
    endsAtMs: endsAt.getTime(),
    pointsPerCorrect: parsePositiveInteger(env.POINTS_PER_CORRECT, 25),
    pointsPerIncorrect: parseNegativeInteger(env.POINTS_PER_INCORRECT, -25)
  })
  const userDeltas = scoring.userDeltas

  const leaderboardByUserId = new Map(leaderboardDocuments.map((entry) => [entry.id, entry]))
  const eventNameEn = requireString(tournament.data.title, 'tournament.title')
  const eventNameRu = readOptionalString(tournament.data.titleRu) || eventNameEn

  const seasonPrizePlan = await buildSeasonPrizeAwardPlan({
    firestore,
    tournament,
    season,
    leaderboardDocuments,
    userDeltas,
    nowMs,
    eventNameRu,
    eventNameEn,
    seasonOrdinal,
    roundOrdinal
  })

  const writes: FirestoreWrite[] = []
  for (const [userId, delta] of userDeltas) {
    const existing = leaderboardByUserId.get(userId)
    const currentPoints = readFiniteNumber(existing?.data.points, 0)
    const currentTotal = readFiniteNumber(
      existing?.data.totalPredictions ?? existing?.data.predictionsCount,
      0
    )
    const currentCorrect = readFiniteNumber(existing?.data.correctPredictions, 0)
    const currentMissed = readFiniteNumber(existing?.data.missedPredictions, 0)
    const assetStats = mergeLeaderboardAssetStats(existing?.data.assetStats, delta.assetStats)
    const fields = {
      userId,
      points: Math.max(0, currentPoints + delta.points),
      totalPredictions: currentTotal + delta.totalPredictions,
      correctPredictions: currentCorrect + delta.correctPredictions,
      missedPredictions: currentMissed + delta.missedPredictions,
      assetStats,
      lastScoredRoundId: round.id
    }
    const seasonPrize = seasonPrizePlan.prizeByUserId.get(userId)
    if (seasonPrize) {
      Object.assign(fields, {
        prize: seasonPrize.prizeName,
        prizeRank: seasonPrize.rank
      })
    }

    writes.push(makeUpdateWrite({
      name: existing?.name || firestore.documentName(
        `tournaments/${tournamentId}/seasons/${season.id}/leaderboard/${userId}`
      ),
      fields,
      serverTimestampFields: existing ? ['updatedAt'] : ['createdAt', 'updatedAt'],
      precondition: existing?.updateTime
        ? { updateTime: existing.updateTime }
        : { exists: false }
    }))

    if (delta.points > 0) {
      writes.push(makeUpdateWrite({
        name: firestore.documentName(
          `users/${userId}/notifications/event_points_${tournamentId}_${season.id}_${round.id}`
        ),
        fields: {
          type: 'event',
          subtype: 'points',
          contentRu: 'За верные прогнозы в раунде вам начислены очки.',
          contentEn: 'Points have been awarded for your correct predictions.',
          eventNameRu,
          eventNameEn,
          season: seasonOrdinal,
          round: roundOrdinal,
          points: delta.points,
          isRead: false
        },
        serverTimestampFields: ['createdAt'],
        precondition: { exists: false }
      }))
    }
  }

  writes.push(...seasonPrizePlan.writes)

  const specialPrizePlan = await buildSpecialPrizeAwardPlan({
    firestore,
    tournament,
    seasons,
    currentSeasonId: season.id,
    currentSeasonLeaderboard: leaderboardDocuments,
    currentSeasonDeltas: userDeltas,
    nowMs,
    eventNameRu,
    eventNameEn,
    seasonOrdinal,
    roundOrdinal
  })
  writes.push(...specialPrizePlan.writes)

  const assetResults = resolutions.map((resolution) => {
    return {
      asset: resolution.asset,
      initialPrice: resolution.initialPrice,
      finalPrice: resolution.finalPrice,
      verdict: resolution.direction,
      ...scoring.voteSummariesByAssetId.get(resolution.assetId)
    }
  })

  writes.push(makeUpdateWrite({
    name: round.name,
    fields: {
      status: 'closed',
      assetResults,
      nextRoundId
    },
    serverTimestampFields: ['resolvedAt'],
    precondition: requireUpdateTime(round, 'opened round')
  }))

  writes.push(makeUpdateWrite({
    name: nextRoundName,
    fields: {
      status: 'opened',
      startsAt: nextStartsAt,
      endsAt: nextEndsAt,
      previousRoundId: round.id
    },
    serverTimestampFields: ['createdAt'],
    precondition: { exists: false }
  }))

  if (writes.length > MAX_ATOMIC_WRITES) {
    throw new Error(
      `Atomic settlement requires ${writes.length} writes; safety limit is ${MAX_ATOMIC_WRITES}.`
    )
  }

  if (!dryRun) {
    await firestore.commit(writes)
  }

  return {
    tournamentId,
    seasonId: season.id,
    status: 'settled',
    closedRoundId: round.id,
    openedRoundId: nextRoundId,
    predictionsProcessed: predictions.length,
    usersUpdated: userDeltas.size,
    seasonPrizesAwarded: seasonPrizePlan.prizeByUserId.size,
    specialPrizesAwarded: specialPrizePlan.userIds.length,
    assetResults: Object.fromEntries(
      resolutions.map((resolution) => [resolution.assetId, resolution.direction])
    )
  }
}

async function recalculateTournamentLatestPassedRound(input: {
  env: Env
  firestore: FirestoreRestClient
  tournament: FirestoreDocument
  dryRun: boolean
  nowMs: number
}): Promise<TournamentRunResult> {
  const { env, firestore, tournament, dryRun, nowMs } = input
  const tournamentId = tournament.id
  const seasons = await firestore.listDocuments(`tournaments/${tournamentId}`, 'seasons')
  const openedSeasons = seasons.filter((season) => normalizeStatus(season.data.status) === 'opened')

  if (!openedSeasons.length) {
    return { tournamentId, status: 'skipped', reason: 'No opened season.' }
  }
  if (openedSeasons.length > 1) {
    throw new Error(`Expected one opened season, found ${openedSeasons.length}.`)
  }

  const season = openedSeasons[0]
  const timeWindowMinutes = requirePositiveInteger(season.data.timeWindow, 'season.timeWindow')
  const dataDelayMs = parseNonNegativeInteger(env.MARKET_DATA_DELAY_MINUTES, 0) * MINUTE_MS
  const allowedAssets = requireArray(tournament.data.allowedAssets, 'tournament.allowedAssets')
    .map(resolveAllowedAsset)
  ensureUniqueAssetIds(allowedAssets)

  const rounds = await firestore.listDocuments(
    `tournaments/${tournamentId}/seasons/${season.id}`,
    'rounds'
  )
  const passedRounds = rounds
    .map((round) => {
      const startsAt = requireDate(round.data.startsAt, `${round.id}.startsAt`)
      const endsAt = requireDate(round.data.endsAt, `${round.id}.endsAt`)
      const resolutionEndsAtMs = endsAt.getTime() + timeWindowMinutes * MINUTE_MS
      return { round, startsAt, endsAt, resolutionEndsAtMs }
    })
    .filter((entry) => {
      const status = normalizeStatus(entry.round.data.status)
      return status !== 'cancelled'
        && status !== 'canceled'
        && entry.endsAt.getTime() > entry.startsAt.getTime()
        && input.nowMs >= entry.resolutionEndsAtMs + dataDelayMs
    })
    .sort((left, right) => {
      const byEnd = left.endsAt.getTime() - right.endsAt.getTime()
      return byEnd || left.startsAt.getTime() - right.startsAt.getTime()
    })

  if (!passedRounds.length) {
    return {
      tournamentId,
      seasonId: season.id,
      status: 'skipped',
      reason: 'No passed round is ready for recalculation.'
    }
  }

  const targetRound = passedRounds[passedRounds.length - 1]!
  const leaderboardDocuments = await firestore.listDocuments(
    `tournaments/${tournamentId}/seasons/${season.id}`,
    'leaderboard'
  )
  const participantDocuments = await firestore.listDocuments(
    `tournaments/${tournamentId}`,
    'participants'
  )
  const enrolledAtByUserId = buildTournamentEnrollmentMap(leaderboardDocuments, participantDocuments)
  const rebuiltLeaderboard = new Map<string, RebuiltLeaderboardEntry>()
  for (const userId of enrolledAtByUserId.keys()) {
    rebuiltLeaderboard.set(userId, createEmptyRebuiltLeaderboardEntry(userId))
  }

  let predictionsProcessed = 0
  const assetResultsByAssetId = new Map<string, PredictionDirection>()

  for (const passedRound of passedRounds) {
    const resolutions = await resolveRoundResolutions({
      allowedAssets,
      round: passedRound.round,
      startsAtMs: passedRound.startsAt.getTime(),
      endsAtMs: passedRound.endsAt.getTime(),
      resolutionEndsAtMs: passedRound.resolutionEndsAtMs
    })
    const resolutionsByAssetId = new Map(resolutions.map((resolution) => [resolution.assetId, resolution]))
    const predictions = await firestore.listDocuments(
      `tournaments/${tournamentId}/seasons/${season.id}/rounds/${passedRound.round.id}`,
      'predictions'
    )
    predictionsProcessed += predictions.length

    const eligibleUserIds = getEligibleLeaderboardUserIdsForRound(
      enrolledAtByUserId,
      rebuiltLeaderboard,
      passedRound.endsAt.getTime()
    )
    const scoring = calculateUserDeltas({
      predictions,
      allowedAssets,
      resolutionsByAssetId,
      leaderboardUserIds: eligibleUserIds,
      startsAtMs: passedRound.startsAt.getTime(),
      endsAtMs: passedRound.endsAt.getTime(),
      pointsPerCorrect: parsePositiveInteger(env.POINTS_PER_CORRECT, 25),
      pointsPerIncorrect: parseNegativeInteger(env.POINTS_PER_INCORRECT, -25)
    })

    applyRecalculatedRoundDeltas(rebuiltLeaderboard, scoring.userDeltas)
    if (passedRound.round.id === targetRound.round.id) {
      for (const resolution of resolutions) {
        assetResultsByAssetId.set(resolution.assetId, resolution.direction)
      }
    }
  }

  const leaderboardByUserId = new Map(leaderboardDocuments.map((entry) => [entry.id, entry]))
  const writes: FirestoreWrite[] = []
  for (const entry of rebuiltLeaderboard.values()) {
    const existing = leaderboardByUserId.get(entry.userId)
    writes.push(makeUpdateWrite({
      name: existing?.name || firestore.documentName(
        `tournaments/${tournamentId}/seasons/${season.id}/leaderboard/${entry.userId}`
      ),
      fields: {
        userId: entry.userId,
        points: entry.points,
        totalPredictions: entry.totalPredictions,
        correctPredictions: entry.correctPredictions,
        missedPredictions: entry.missedPredictions,
        assetStats: Array.from(entry.assetStats.values())
          .sort((left, right) => left.asset.localeCompare(right.asset)),
        lastScoredRoundId: targetRound.round.id,
        lastRecalculatedRoundId: targetRound.round.id
      },
      serverTimestampFields: existing ? ['updatedAt', 'recalculatedAt'] : ['createdAt', 'updatedAt', 'recalculatedAt'],
      precondition: existing?.updateTime
        ? { updateTime: existing.updateTime }
        : { exists: false }
    }))
  }

  if (writes.length > MAX_ATOMIC_WRITES) {
    throw new Error(
      `Leaderboard recalculation requires ${writes.length} writes; safety limit is ${MAX_ATOMIC_WRITES}.`
    )
  }

  if (!dryRun && writes.length) {
    await firestore.commit(writes)
  }

  return {
    tournamentId,
    seasonId: season.id,
    status: 'recalculated',
    recalculatedRoundId: targetRound.round.id,
    predictionsProcessed,
    usersUpdated: rebuiltLeaderboard.size,
    roundsRebuilt: passedRounds.length,
    assetResults: Object.fromEntries(assetResultsByAssetId)
  }
}

async function buildSeasonPrizeAwardPlan(input: {
  firestore: FirestoreRestClient
  tournament: FirestoreDocument
  season: FirestoreDocument
  leaderboardDocuments: FirestoreDocument[]
  userDeltas: Map<string, UserScoreDelta>
  nowMs: number
  eventNameRu: string
  eventNameEn: string
  seasonOrdinal: number
  roundOrdinal: number
}): Promise<SeasonPrizeAwardPlan> {
  if (!isSeasonCompleteForPrizeAward(input.season, input.nowMs)) {
    return { writes: [], prizeByUserId: new Map() }
  }
  if (input.season.data.prizesAwarded === true || input.season.data.prizesAwardedAt instanceof Date) {
    return { writes: [], prizeByUserId: new Map() }
  }

  const prizes = readSeasonPrizeMap(input.season.data.prizes)
  if (!prizes.size) return { writes: [], prizeByUserId: new Map() }

  const recipients = selectSeasonPrizeRecipients(
    buildEffectiveLeaderboardRows(input.leaderboardDocuments, input.userDeltas)
  )
  if (!recipients.length) return { writes: [], prizeByUserId: new Map() }

  const prizeByUserId = new Map<string, AwardedSeasonPrize>()
  for (const recipient of recipients) {
    const { row, prizeRank } = recipient
    const prize = getSeasonPrizeForRank(prizes, prizeRank)
    if (!prize) continue

    const prizeName = getPrizeDisplayName(prize)
    if (!prizeName) continue

    prizeByUserId.set(row.userId, {
      rank: prizeRank,
      prizeName,
      prize
    })
  }

  if (!prizeByUserId.size) return { writes: [], prizeByUserId }

  const grantedAt = new Date(input.nowMs)
  const userDocuments = new Map<string, FirestoreDocument | null>()
  for (const userId of prizeByUserId.keys()) {
    userDocuments.set(userId, await input.firestore.getDocument(`users/${userId}`))
  }

  const winners = Array.from(prizeByUserId.entries()).map(([userId, awarded]) => ({
    userId,
    rank: awarded.rank,
    prize: awarded.prizeName
  }))
  const writes: FirestoreWrite[] = [
    makeUpdateWrite({
      name: input.season.name,
      fields: {
        prizesAwarded: true,
        prizeWinners: winners
      },
      serverTimestampFields: ['prizesAwardedAt'],
      precondition: requireUpdateTime(input.season, 'season')
    })
  ]

  for (const [userId, awarded] of prizeByUserId) {
    const userDocument = userDocuments.get(userId) || null
    const existingStatuses = readUserStatuses(userDocument?.data.status)
    const grantedStatus = createGrantedStatus(awarded.prize, grantedAt)

    writes.push(makeUpdateWrite({
      name: userDocument?.name || input.firestore.documentName(`users/${userId}`),
      fields: {
        status: mergeUserStatuses(existingStatuses, grantedStatus)
      },
      precondition: userDocument?.updateTime
        ? { updateTime: userDocument.updateTime }
        : { exists: false }
    }))

    writes.push(makeUpdateWrite({
      name: input.firestore.documentName(
        `users/${userId}/notifications/event_prize_${input.tournament.id}_${input.season.id}`
      ),
      fields: {
        type: 'event',
        subtype: 'prize',
        contentRu: `Вы получили сезонную награду: ${awarded.prizeName}.`,
        contentEn: `You have received a seasonal reward: ${awarded.prizeName}.`,
        eventNameRu: input.eventNameRu,
        eventNameEn: input.eventNameEn,
        season: input.seasonOrdinal,
        round: input.roundOrdinal,
        prize: awarded.prizeName,
        isRead: false
      },
      serverTimestampFields: ['createdAt'],
      precondition: { exists: false }
    }))
  }

  return { writes, prizeByUserId }
}

async function buildSpecialPrizeAwardPlan(input: {
  firestore: FirestoreRestClient
  tournament: FirestoreDocument
  seasons: FirestoreDocument[]
  currentSeasonId: string
  currentSeasonLeaderboard: FirestoreDocument[]
  currentSeasonDeltas: Map<string, UserScoreDelta>
  nowMs: number
  eventNameRu: string
  eventNameEn: string
  seasonOrdinal: number
  roundOrdinal: number
}): Promise<SpecialPrizeAwardPlan> {
  if (input.tournament.id !== APEX_PROTOCOL_TOURNAMENT_ID) {
    return { writes: [], userIds: [] }
  }

  const specialPrizes = readSpecialPrizeArray(input.tournament.data.specialPrize)
  const prizeIndex = specialPrizes.findIndex((prize) => (
    normalizeSpecialPrizeValue(prize.type) === SPECIAL_PRIZE_TYPE_LICENSE_KEY
    && normalizeStatus(prize.status) === 'active'
  ))
  if (prizeIndex < 0) return { writes: [], userIds: [] }

  const prize = specialPrizes[prizeIndex]!
  const alreadyAwardedUserIds = readSpecialPrizeWinnerIds(prize.winners)
  const seasonWins = await calculateSeasonWins({
    firestore: input.firestore,
    tournamentId: input.tournament.id,
    seasons: input.seasons,
    currentSeasonId: input.currentSeasonId,
    currentSeasonLeaderboard: input.currentSeasonLeaderboard,
    currentSeasonDeltas: input.currentSeasonDeltas,
    nowMs: input.nowMs
  })
  const eligibleUserIds = Array.from(seasonWins.entries())
    .filter(([, record]) => record.seasonIds.length >= SPECIAL_PRIZE_REQUIRED_SEASON_WINS)
    .map(([userId]) => userId)
    .filter((userId) => !alreadyAwardedUserIds.has(userId))
    .sort()

  if (!eligibleUserIds.length) return { writes: [], userIds: [] }

  const updatedSpecialPrizes = specialPrizes.map((entry, index) => {
    if (index !== prizeIndex) return entry
    return {
      ...entry,
      winners: Array.from(new Set([
        ...Array.from(alreadyAwardedUserIds),
        ...eligibleUserIds
      ])).sort()
    }
  })
  const writes: FirestoreWrite[] = [
    makeUpdateWrite({
      name: input.tournament.name,
      fields: {
        specialPrize: updatedSpecialPrizes
      },
      serverTimestampFields: ['specialPrizeUpdatedAt'],
      precondition: requireUpdateTime(input.tournament, 'tournament')
    })
  ]

  for (const userId of eligibleUserIds) {
    writes.push(makeUpdateWrite({
      name: input.firestore.documentName(
        `users/${userId}/notifications/event_prize_${input.tournament.id}_special_license_key`
      ),
      fields: {
        type: 'event',
        subtype: 'prize',
        contentRu: 'Вы получили специальную награду. Лицензионный ключ приложения будет направлен на почту, через которую вы зарегистрировались.',
        contentEn: 'You have received a special prize. The application license key will be sent to the email address used for registration.',
        eventNameRu: input.eventNameRu,
        eventNameEn: input.eventNameEn,
        season: input.seasonOrdinal,
        round: input.roundOrdinal,
        prize: 'Application license key',
        isRead: false
      },
      serverTimestampFields: ['createdAt']
    }))
  }

  return { writes, userIds: eligibleUserIds }
}

async function calculateSeasonWins(input: {
  firestore: FirestoreRestClient
  tournamentId: string
  seasons: FirestoreDocument[]
  currentSeasonId: string
  currentSeasonLeaderboard: FirestoreDocument[]
  currentSeasonDeltas: Map<string, UserScoreDelta>
  nowMs: number
}): Promise<Map<string, SeasonWinRecord>> {
  const result = new Map<string, SeasonWinRecord>()

  for (let index = 0; index < input.seasons.length; index += 1) {
    const season = input.seasons[index]!
    if (!isSeasonCompleteForSpecialPrize(season, input.nowMs)) continue

    const leaderboardDocuments = season.id === input.currentSeasonId
      ? input.currentSeasonLeaderboard
      : await input.firestore.listDocuments(
          `tournaments/${input.tournamentId}/seasons/${season.id}`,
          'leaderboard'
        )
    const leaderboard = season.id === input.currentSeasonId
      ? buildEffectiveLeaderboardRows(leaderboardDocuments, input.currentSeasonDeltas)
      : buildEffectiveLeaderboardRows(leaderboardDocuments)
    const winners = getSeasonFirstPlaceUserIds(leaderboard)

    for (const userId of winners) {
      const existing = result.get(userId) || { seasonIds: [], seasonOrdinals: [] }
      existing.seasonIds.push(season.id)
      existing.seasonOrdinals.push(index + 1)
      result.set(userId, existing)
    }
  }

  return result
}

function buildEffectiveLeaderboardRows(
  documents: FirestoreDocument[],
  deltas?: Map<string, UserScoreDelta>
): LeaderboardRow[] {
  const rows = new Map<string, LeaderboardRow>()

  for (const document of documents) {
    const userId = document.id
    rows.set(userId, {
      userId,
      points: Math.max(0, readFiniteNumber(document.data.points, 0))
    })
  }

  if (deltas) {
    for (const [userId, delta] of deltas) {
      const current = rows.get(userId)
      rows.set(userId, {
        userId,
        points: Math.max(0, (current?.points || 0) + delta.points)
      })
    }
  }

  return Array.from(rows.values())
}

function selectSeasonPrizeRecipients(rows: LeaderboardRow[]): Array<{
  row: LeaderboardRow
  prizeRank: number
}> {
  const rankedRows = rows
    .filter((row) => row.points > 0)
    .sort((left, right) => (
      right.points - left.points
      || left.userId.localeCompare(right.userId)
    ))

  if (!rankedRows.length) return []

  const allRowsShareTopScore = rankedRows.length > 1
    && rankedRows.every((row) => row.points === rankedRows[0]!.points)
  const recipients: Array<{ row: LeaderboardRow; prizeRank: number }> = []
  let index = 0

  while (index < rankedRows.length) {
    const groupStartIndex = index
    const points = rankedRows[index]!.points
    const group: LeaderboardRow[] = []

    while (index < rankedRows.length && rankedRows[index]!.points === points) {
      group.push(rankedRows[index]!)
      index += 1
    }

    const competitionRank = groupStartIndex + 1
    if (competitionRank > 3) continue

    const prizeRank = allRowsShareTopScore
      || group.length > 2
      || (competitionRank > 1 && group.length > 1)
      ? 3
      : competitionRank

    for (const row of group) {
      recipients.push({ row, prizeRank: Math.min(3, Math.max(1, prizeRank)) })
    }
  }

  return recipients
}

function getSeasonFirstPlaceUserIds(rows: LeaderboardRow[]): string[] {
  const maxPoints = rows.reduce((max, row) => Math.max(max, row.points), 0)
  if (maxPoints <= 0) return []

  const winners = rows
    .filter((row) => row.points === maxPoints)
    .map((row) => row.userId)
    .sort()

  return winners.length <= 2 ? winners : []
}

function isSeasonCompleteForSpecialPrize(season: FirestoreDocument, nowMs: number): boolean {
  if (normalizeStatus(season.data.status) === 'closed') return true
  const endsAt = season.data.endsAt
  return endsAt instanceof Date && Number.isFinite(endsAt.getTime()) && endsAt.getTime() <= nowMs
}

function isSeasonCompleteForPrizeAward(season: FirestoreDocument, nowMs: number): boolean {
  return isSeasonCompleteForSpecialPrize(season, nowMs)
}

function readSeasonPrizeMap(value: unknown): Map<number, Record<string, unknown>> {
  const result = new Map<number, Record<string, unknown>>()
  if (value === undefined || value === null) return result

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      const normalized = normalizeSeasonPrizeEntry(entry, index + 1)
      if (normalized) result.set(normalized.rank, normalized.prize)
    })
    return result
  }

  const record = requireObject(value, 'season.prizes')
  for (const [key, entry] of Object.entries(record)) {
    const fallbackRank = parsePrizeRank(key)
    const normalized = normalizeSeasonPrizeEntry(entry, fallbackRank)
    if (normalized) result.set(normalized.rank, normalized.prize)
  }
  return result
}

function normalizeSeasonPrizeEntry(
  entry: unknown,
  fallbackRank: number
): { rank: number; prize: Record<string, unknown> } | null {
  const object = requireObject(entry, `season.prizes[${fallbackRank}]`)
  const wrapperKeys = Object.keys(object).filter((key) => /^prize-\d+$/i.test(key))
  if (wrapperKeys.length === 1 && Object.keys(object).length === 1) {
    const wrapperKey = wrapperKeys[0]!
    return normalizeSeasonPrizeEntry(object[wrapperKey], parsePrizeRank(wrapperKey))
  }

  const rank = parsePrizeRank(
    object.id
      ?? object.key
      ?? object.rank
      ?? object.place
      ?? object.position
      ?? object.name
      ?? fallbackRank
  )
  if (!Number.isInteger(rank) || rank < 1 || rank > 3) return null
  return { rank, prize: object }
}

function parsePrizeRank(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  const match = String(value || '').match(/(?:prize[-_ ]?)?([1-3])$/i)
  return match ? Number(match[1]) : 0
}

function getSeasonPrizeForRank(
  prizes: Map<number, Record<string, unknown>>,
  rank: number
): Record<string, unknown> | null {
  const exact = prizes.get(rank)
  if (exact) return exact
  if (rank === 3) return prizes.get(2) || null
  return null
}

function getPrizeDisplayName(prize: Record<string, unknown>): string {
  return String(prize.prize || prize.name || prize.title || '').trim()
}

function readUserStatuses(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is Record<string, unknown> => (
      Boolean(entry)
      && typeof entry === 'object'
      && !Array.isArray(entry)
    ))
    .map((entry) => ({ ...entry }))
}

function createGrantedStatus(prize: Record<string, unknown>, grantedAt: Date): Record<string, unknown> {
  const status: Record<string, unknown> = {
    ...prize,
    granted: grantedAt
  }
  if (status.isSelected === undefined) {
    status.isSelected = false
  }
  if (status.name === undefined) {
    const prizeName = getPrizeDisplayName(prize)
    if (prizeName) status.name = prizeName
  }
  return status
}

function mergeUserStatuses(
  existingStatuses: Record<string, unknown>[],
  grantedStatus: Record<string, unknown>
): Record<string, unknown>[] {
  const grantedKey = getStatusIdentityKey(grantedStatus)
  if (grantedKey && existingStatuses.some((status) => getStatusIdentityKey(status) === grantedKey)) {
    return existingStatuses
  }
  return [...existingStatuses, grantedStatus]
}

function getStatusIdentityKey(status: Record<string, unknown>): string {
  return String(status.name || status.prize || '').trim().toLowerCase()
}

function readSpecialPrizeArray(value: unknown): Record<string, unknown>[] {
  if (value === undefined || value === null) return []
  return requireArray(value, 'tournament.specialPrize').map((entry, index) => (
    requireObject(entry, `tournament.specialPrize[${index}]`)
  ))
}

function readSpecialPrizeWinnerIds(value: unknown): Set<string> {
  if (value === undefined || value === null) return new Set()
  return new Set(requireArray(value, 'specialPrize.winners')
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim()
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        return String((entry as Record<string, unknown>).userId || '').trim()
      }
      return ''
    })
    .filter(Boolean))
}

function normalizeSpecialPrizeValue(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

function calculateUserDeltas(input: {
  predictions: FirestoreDocument[]
  allowedAssets: ResolvedAsset[]
  resolutionsByAssetId: Map<string, AssetResolution>
  leaderboardUserIds: string[]
  startsAtMs: number
  endsAtMs: number
  pointsPerCorrect: number
  pointsPerIncorrect: number
}): {
  userDeltas: Map<string, UserScoreDelta>
  voteSummariesByAssetId: Map<string, AssetVoteSummary>
} {
  const predictionByUserAndAsset = new Map<string, {
    userId: string
    assetId: string
    prediction: PredictionDirection
  }>()
  const voteCountsByAssetId = new Map<string, Record<PredictionDirection, number>>()
  const participantIds = new Set(input.leaderboardUserIds)
  const seenPredictions = new Set<string>()

  for (const predictionDocument of input.predictions) {
    const userId = requireString(predictionDocument.data.userId, `${predictionDocument.id}.userId`)
    const assetId = normalizeAssetId(
      requireString(predictionDocument.data.assetId, `${predictionDocument.id}.assetId`)
    )
    const prediction = normalizePredictionDirection(predictionDocument.data.predict)
    const predictTime = requireDate(
      predictionDocument.data.predictTime,
      `${predictionDocument.id}.predictTime`
    )

    if (predictTime.getTime() < input.startsAtMs || predictTime.getTime() >= input.endsAtMs) {
      throw new Error(`Prediction ${predictionDocument.id} is outside the round voting interval.`)
    }

    const resolution = input.resolutionsByAssetId.get(assetId)
    if (!resolution) {
      throw new Error(`Prediction ${predictionDocument.id} references disallowed asset ${assetId}.`)
    }

    const uniqueKey = `${userId}:${assetId}`
    if (seenPredictions.has(uniqueKey)) {
      throw new Error(`Duplicate prediction for ${uniqueKey}.`)
    }
    seenPredictions.add(uniqueKey)
    predictionByUserAndAsset.set(uniqueKey, { userId, assetId, prediction })
    participantIds.add(userId)

    const voteCounts = voteCountsByAssetId.get(assetId) || { LONG: 0, SHORT: 0 }
    voteCounts[prediction] += 1
    voteCountsByAssetId.set(assetId, voteCounts)
  }

  const voteSummariesByAssetId = new Map<string, AssetVoteSummary>()
  for (const asset of input.allowedAssets) {
    const resolution = input.resolutionsByAssetId.get(asset.assetId)
    if (!resolution) continue
    const voteCounts = voteCountsByAssetId.get(asset.assetId) || { LONG: 0, SHORT: 0 }
    voteSummariesByAssetId.set(asset.assetId, createAssetVoteSummary({
      assetId: asset.assetId,
      direction: resolution.direction,
      longVotes: voteCounts.LONG,
      shortVotes: voteCounts.SHORT,
      pointsPerCorrect: input.pointsPerCorrect
    }))
  }

  const result = new Map<string, UserScoreDelta>()
  const allowedAssetIds = input.allowedAssets.map((asset) => asset.assetId)
  for (const userId of participantIds) {
    const current = result.get(userId) || {
      points: 0,
      totalPredictions: 0,
      correctPredictions: 0,
      missedPredictions: 0,
      assetStats: new Map<string, LeaderboardAssetStat>()
    }
    for (const assetId of allowedAssetIds) {
      const resolution = input.resolutionsByAssetId.get(assetId)
      if (!resolution) continue

      const uniqueKey = `${userId}:${assetId}`
      const predictionRecord = predictionByUserAndAsset.get(uniqueKey)
      const assetStat = current.assetStats.get(assetId) || {
        assetId,
        asset: resolution.asset,
        totalPredictions: 0,
        correctPredictions: 0,
        missedPredictions: 0,
        pointsEarned: 0
      }

      if (!predictionRecord) {
        current.points += MISSED_PREDICTION_PENALTY
        current.missedPredictions += 1
        assetStat.missedPredictions += 1
        assetStat.pointsEarned += MISSED_PREDICTION_PENALTY
        current.assetStats.set(assetId, assetStat)
        continue
      }

      const voteSummary = voteSummariesByAssetId.get(assetId)
      const isCorrect = predictionRecord.prediction === resolution.direction
      const pointsEarned = isCorrect
        ? voteSummary?.pointsForCorrect || input.pointsPerCorrect
        : input.pointsPerIncorrect

      current.points += pointsEarned
      current.totalPredictions += 1
      assetStat.totalPredictions += 1
      assetStat.pointsEarned += pointsEarned
      if (isCorrect) {
        current.correctPredictions += 1
        assetStat.correctPredictions += 1
      }
      current.assetStats.set(assetId, assetStat)
    }
    result.set(userId, current)
  }

  return { userDeltas: result, voteSummariesByAssetId }
}

function createAssetVoteSummary(input: {
  assetId: string
  direction: PredictionDirection
  longVotes: number
  shortVotes: number
  pointsPerCorrect: number
}): AssetVoteSummary {
  const totalVotes = input.longVotes + input.shortVotes
  const winningVotes = input.direction === 'LONG' ? input.longVotes : input.shortVotes
  const winnerShare = totalVotes > 0 ? winningVotes / totalVotes : 0
  const difficultyMultiplier = winnerShare >= 0.5 || totalVotes === 0
    ? 1
    : Math.min(MAX_DIFFICULTY_MULTIPLIER, 1 + (0.5 - winnerShare) * 2)

  return {
    assetId: input.assetId,
    longVotes: input.longVotes,
    shortVotes: input.shortVotes,
    winnerShare,
    difficultyMultiplier,
    pointsForCorrect: Math.round(input.pointsPerCorrect * difficultyMultiplier)
  }
}

function mergeLeaderboardAssetStats(
  existingValue: unknown,
  deltaStats: Map<string, LeaderboardAssetStat>
): LeaderboardAssetStat[] {
  const merged = new Map<string, LeaderboardAssetStat>()

  if (Array.isArray(existingValue)) {
    for (const value of existingValue) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue
      const source = value as Record<string, unknown>
      const assetIdSource = typeof source.assetId === 'string'
        ? source.assetId
        : typeof source.asset === 'string'
          ? source.asset
          : ''
      const assetId = normalizeAssetId(assetIdSource)
      if (!assetId) continue
      const totalPredictions = Math.max(0, readFiniteNumber(source.totalPredictions, 0))
      const correctPredictions = Math.min(
        totalPredictions,
        Math.max(0, readFiniteNumber(source.correctPredictions, 0))
      )
      const missedPredictions = Math.max(0, readFiniteNumber(source.missedPredictions, 0))
      const pointsEarned = readFiniteNumber(source.pointsEarned, 0)
      merged.set(assetId, {
        assetId,
        asset: typeof source.asset === 'string' && source.asset.trim() ? source.asset.trim() : assetId,
        totalPredictions,
        correctPredictions,
        missedPredictions,
        pointsEarned
      })
    }
  }

  for (const [assetId, delta] of deltaStats) {
    const existing = merged.get(assetId)
    merged.set(assetId, {
      assetId,
      asset: delta.asset || existing?.asset || assetId,
      totalPredictions: (existing?.totalPredictions || 0) + delta.totalPredictions,
      correctPredictions: (existing?.correctPredictions || 0) + delta.correctPredictions,
      missedPredictions: (existing?.missedPredictions || 0) + delta.missedPredictions,
      pointsEarned: (existing?.pointsEarned || 0) + delta.pointsEarned
    })
  }

  return Array.from(merged.values()).sort((left, right) => left.asset.localeCompare(right.asset))
}

function createEmptyRebuiltLeaderboardEntry(userId: string): RebuiltLeaderboardEntry {
  return {
    userId,
    points: 0,
    totalPredictions: 0,
    correctPredictions: 0,
    missedPredictions: 0,
    assetStats: new Map<string, LeaderboardAssetStat>()
  }
}

function buildTournamentEnrollmentMap(
  leaderboardDocuments: FirestoreDocument[],
  participantDocuments: FirestoreDocument[]
): Map<string, number> {
  const result = new Map<string, number>()
  const setEarliest = (userId: string, enrolledAtMs: number) => {
    if (!userId) return
    const existing = result.get(userId)
    if (existing === undefined || enrolledAtMs < existing) {
      result.set(userId, enrolledAtMs)
    }
  }

  for (const participant of participantDocuments) {
    const userId = typeof participant.data.userId === 'string' && participant.data.userId.trim()
      ? participant.data.userId.trim()
      : participant.id
    setEarliest(userId, readEnrollmentTimeMs(participant))
  }

  for (const entry of leaderboardDocuments) {
    const userId = typeof entry.data.userId === 'string' && entry.data.userId.trim()
      ? entry.data.userId.trim()
      : entry.id
    setEarliest(userId, readEnrollmentTimeMs(entry))
  }

  return result
}

function readEnrollmentTimeMs(document: FirestoreDocument): number {
  const registeredAt = document.data.registeredAt
  if (registeredAt instanceof Date && Number.isFinite(registeredAt.getTime())) {
    return registeredAt.getTime()
  }

  const createdAt = document.data.createdAt
  if (createdAt instanceof Date && Number.isFinite(createdAt.getTime())) {
    return createdAt.getTime()
  }

  if (document.createTime) {
    const parsed = Date.parse(document.createTime)
    if (Number.isFinite(parsed)) return parsed
  }

  return Number.NEGATIVE_INFINITY
}

function getEligibleLeaderboardUserIdsForRound(
  enrolledAtByUserId: Map<string, number>,
  rebuiltLeaderboard: Map<string, RebuiltLeaderboardEntry>,
  roundEndsAtMs: number
): string[] {
  const result = new Set<string>()

  for (const [userId, enrolledAtMs] of enrolledAtByUserId) {
    if (!Number.isFinite(enrolledAtMs) || enrolledAtMs <= roundEndsAtMs) {
      result.add(userId)
    }
  }

  for (const userId of rebuiltLeaderboard.keys()) {
    if (!enrolledAtByUserId.has(userId)) result.add(userId)
  }

  return Array.from(result)
}

function applyRecalculatedRoundDeltas(
  rebuiltLeaderboard: Map<string, RebuiltLeaderboardEntry>,
  userDeltas: Map<string, UserScoreDelta>
): void {
  for (const [userId, delta] of userDeltas) {
    const current = rebuiltLeaderboard.get(userId) || createEmptyRebuiltLeaderboardEntry(userId)
    current.points = Math.max(0, current.points + delta.points)
    current.totalPredictions += delta.totalPredictions
    current.correctPredictions += delta.correctPredictions
    current.missedPredictions += delta.missedPredictions

    for (const [assetId, assetDelta] of delta.assetStats) {
      const existing = current.assetStats.get(assetId)
      current.assetStats.set(assetId, {
        assetId,
        asset: assetDelta.asset || existing?.asset || assetId,
        totalPredictions: (existing?.totalPredictions || 0) + assetDelta.totalPredictions,
        correctPredictions: (existing?.correctPredictions || 0) + assetDelta.correctPredictions,
        missedPredictions: (existing?.missedPredictions || 0) + assetDelta.missedPredictions,
        pointsEarned: (existing?.pointsEarned || 0) + assetDelta.pointsEarned
      })
    }

    rebuiltLeaderboard.set(userId, current)
  }
}

async function resolveRoundResolutions(input: {
  allowedAssets: ResolvedAsset[]
  round: FirestoreDocument
  startsAtMs: number
  endsAtMs: number
  resolutionEndsAtMs: number
}): Promise<AssetResolution[]> {
  const storedResolutions = readStoredRoundAssetResults(input.round.data.assetResults)
  const hasAllStoredResolutions = input.allowedAssets.every((asset) => storedResolutions.has(asset.assetId))

  if (hasAllStoredResolutions) {
    return input.allowedAssets.map((asset) => storedResolutions.get(asset.assetId)!)
  }

  return mapWithConcurrency(
    input.allowedAssets,
    1,
    async (asset) => resolveAssetDirection(
      asset,
      input.startsAtMs,
      input.endsAtMs,
      input.resolutionEndsAtMs
    )
  )
}

function readStoredRoundAssetResults(value: unknown): Map<string, AssetResolution> {
  const result = new Map<string, AssetResolution>()
  if (!Array.isArray(value)) return result

  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const source = entry as Record<string, unknown>
    const assetSource = typeof source.assetId === 'string' && source.assetId.trim()
      ? source.assetId
      : typeof source.asset === 'string'
        ? source.asset
        : ''
    const assetId = normalizeAssetId(assetSource)
    if (!assetId) continue

    const directionSource = source.verdict ?? source.direction
    const direction = normalizePredictionDirection(directionSource)
    const asset = typeof source.asset === 'string' && source.asset.trim()
      ? source.asset.trim()
      : assetId

    result.set(assetId, {
      assetId,
      asset,
      direction,
      initialPrice: readFiniteNumber(source.initialPrice, 0),
      finalPrice: readFiniteNumber(source.finalPrice, 0)
    })
  }

  return result
}

async function resolveAssetDirection(
  asset: ResolvedAsset,
  startsAtMs: number,
  endsAtMs: number,
  cutoffMs: number
): Promise<AssetResolution> {
  if (cutoffMs <= endsAtMs) {
    throw new Error(`${asset.symbol}: resolution cutoff must be later than endsAt.`)
  }
  if (!isThirtyMinuteBoundary(startsAtMs) || !isThirtyMinuteBoundary(endsAtMs) || !isThirtyMinuteBoundary(cutoffMs)) {
    throw new Error(
      `${asset.symbol}: startsAt, endsAt and endsAt + timeWindow must fall exactly on a 30-minute UTC boundary.`
    )
  }

  const { candles } = await fetchYahooCandles(asset, startsAtMs, cutoffMs)
  const startCandle = findInitialCandle(candles, startsAtMs)
  const finalCandle = findCandleEndingAt(candles, cutoffMs)

  if (!startCandle) {
    throw new Error(
      `${asset.symbol}: Yahoo has no exact 30-minute candle ending at startsAt or starting at startsAt.`
    )
  }
  if (!finalCandle) {
    throw new Error(`${asset.symbol}: Yahoo has no exact 30-minute candle closing at endsAt + timeWindow.`)
  }

  const initialPrice = startCandle.close
  const finalPrice = finalCandle.close
  if (finalPrice === initialPrice) {
    throw new Error(`${asset.symbol}: final close equals initial close; no fair verdict can be assigned.`)
  }

  return {
    assetId: asset.assetId,
    asset: asset.symbol,
    direction: finalPrice > initialPrice ? 'LONG' : 'SHORT',
    initialPrice,
    finalPrice
  }
}

async function fetchYahooCandles(
  asset: ResolvedAsset,
  startsAtMs: number,
  cutoffMs: number
): Promise<{ candles: YahooCandle[]; yahooSymbol: string }> {
  let lastCandidateError: Error | null = null

  for (const yahooSymbol of asset.yahooSymbolCandidates) {
    try {
      const candles = await fetchYahooCandlesForSymbol(asset, yahooSymbol, startsAtMs, cutoffMs)
      return { candles, yahooSymbol }
    } catch (error) {
      if (error instanceof YahooChartRequestError && error.status !== 404) throw error
      lastCandidateError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw new Error(
    `${asset.symbol}: none of the Yahoo symbol candidates returned market data ` +
    `(${asset.yahooSymbolCandidates.join(', ')}). ${lastCandidateError?.message || ''}`.trim()
  )
}

async function fetchYahooCandlesForSymbol(
  asset: ResolvedAsset,
  yahooSymbol: string,
  startsAtMs: number,
  cutoffMs: number
): Promise<YahooCandle[]> {
  const query = new URLSearchParams({
    period1: String(Math.floor((startsAtMs - CANDLE_INTERVAL_MS) / 1000)),
    period2: String(Math.ceil((cutoffMs + CANDLE_INTERVAL_MS) / 1000)),
    interval: '30m',
    includePrePost: asset.session === 'NYSE' ? 'false' : 'true',
    events: 'div,splits',
    lang: 'en-US',
    region: 'US'
  })
  let response: Response | null = null
  let lastStatus = 0

  for (let attempt = 0; attempt < YAHOO_MAX_ATTEMPTS; attempt += 1) {
    const endpoint = YAHOO_CHART_ENDPOINTS[attempt % YAHOO_CHART_ENDPOINTS.length]
    const url = `${endpoint}/${encodeURIComponent(yahooSymbol)}?${query}`
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ExGenesisTournamentWorker/1.0 (+https://exgenesis.app)'
      }
    })

    if (response.ok) break
    lastStatus = response.status

    if (response.status !== 429 && response.status < 500) break

    if (attempt < YAHOO_MAX_ATTEMPTS - 1) {
      await waitForYahooRetry(response, attempt)
    }
  }

  if (!response?.ok) {
    throw new YahooChartRequestError(
      `${asset.symbol} (${yahooSymbol}): Yahoo request failed with HTTP ${lastStatus || 'unknown'} after ${YAHOO_MAX_ATTEMPTS} attempts.`,
      lastStatus
    )
  }

  const payload = await response.json() as {
    chart?: {
      error?: { code?: string; description?: string } | null
      result?: Array<{
        timestamp?: number[]
        indicators?: {
          quote?: Array<{
            open?: Array<number | null>
            high?: Array<number | null>
            low?: Array<number | null>
            close?: Array<number | null>
          }>
        }
      }> | null
    }
  }

  if (payload.chart?.error) {
    throw new Error(
      `${asset.symbol} (${yahooSymbol}): Yahoo error ${payload.chart.error.code || ''} ${payload.chart.error.description || ''}`.trim()
    )
  }

  const chart = payload.chart?.result?.[0]
  const timestamps = chart?.timestamp || []
  const quote = chart?.indicators?.quote?.[0]
  if (!timestamps.length || !quote) {
    throw new Error(`${asset.symbol} (${yahooSymbol}): Yahoo returned no chart data.`)
  }

  const candles: YahooCandle[] = []
  for (let index = 0; index < timestamps.length; index += 1) {
    const open = quote.open?.[index]
    const high = quote.high?.[index]
    const low = quote.low?.[index]
    const close = quote.close?.[index]
    if (![open, high, low, close].every(isFiniteNumber)) continue

    candles.push({
      timestampMs: timestamps[index] * 1000,
      open: open as number,
      high: high as number,
      low: low as number,
      close: close as number
    })
  }

  if (!candles.length) {
    throw new Error(`${asset.symbol} (${yahooSymbol}): Yahoo returned only empty candles.`)
  }

  return candles.sort((left, right) => left.timestampMs - right.timestampMs)
}

class YahooChartRequestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'YahooChartRequestError'
    this.status = status
  }
}

async function waitForYahooRetry(response: Response, attempt: number): Promise<void> {
  const retryAfterSeconds = Number(response.headers.get('Retry-After'))
  const retryAfterMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
    ? retryAfterSeconds * 1000
    : 1_000 * 2 ** attempt
  const jitterMs = Math.floor(Math.random() * 400)
  await new Promise<void>((resolve) => setTimeout(resolve, retryAfterMs + jitterMs))
}

function resolveAllowedAsset(rawAsset: unknown, index: number): ResolvedAsset {
  const raw = requireObject(rawAsset, `allowedAssets[${index}]`)
  const symbol = requireString(raw.symbol || raw.name, `allowedAssets[${index}].symbol`).trim()
  const type = String(raw.type || 'Other').trim()
  const name = String(raw.name || '').trim()
  const yahooSymbol = typeof raw.yahooSymbol === 'string' ? raw.yahooSymbol.trim() : ''
  const session = normalizeMarketSession(
    requireString(raw.session, `${symbol}.session`).trim().toUpperCase()
  )
  const yahooSymbolCandidates = buildYahooSymbolCandidates({ symbol, name, type, yahooSymbol })

  if (!yahooSymbolCandidates.length) {
    throw new Error(`${symbol}: unable to derive a Yahoo ticker. Add yahooSymbol to allowedAssets.`)
  }

  return {
    assetId: normalizeAssetId(symbol),
    symbol,
    type,
    yahooSymbolCandidates,
    session
  }
}

function buildYahooSymbolCandidates(input: {
  symbol: string
  name: string
  type: string
  yahooSymbol: string
}): string[] {
  const candidates = new Set<string>()
  const rawSymbol = normalizeYahooSymbol(input.symbol)
  const rawName = normalizeYahooSymbol(input.name)
  const compactSymbol = normalizeAssetId(input.symbol)
  const compactName = normalizeAssetId(input.name)
  const type = input.type.trim().toLowerCase()
  const parts = input.symbol.split(/[\/_:-]/).map(normalizeYahooSymbol).filter(Boolean)

  const add = (value: unknown) => {
    const normalized = normalizeYahooSymbol(value)
    if (normalized) candidates.add(normalized)
  }

  // An explicit mapping is immutable tournament configuration and is always preferred.
  add(input.yahooSymbol)

  const commodityMap: Record<string, string> = {
    XAU: 'GC=F', XAUUSD: 'GC=F', GOLD: 'GC=F', GC: 'GC=F',
    XAG: 'SI=F', XAGUSD: 'SI=F', SILVER: 'SI=F', SI: 'SI=F',
    XPT: 'PL=F', XPTUSD: 'PL=F', PLATINUM: 'PL=F',
    XPD: 'PA=F', XPDUSD: 'PA=F', PALLAD: 'PA=F', PALLADIUM: 'PA=F',
    COPPER: 'HG=F', HG: 'HG=F',
    OIL: 'CL=F', WTI: 'CL=F', USOIL: 'CL=F', CL: 'CL=F',
    BRENT: 'BZ=F', UKOIL: 'BZ=F',
    NATGAS: 'NG=F', NG: 'NG=F', NATURALGAS: 'NG=F',
    SOYBN: 'ZS=F', SOYBEAN: 'ZS=F', SOYBEANS: 'ZS=F',
    WHEAT: 'ZW=F', CORN: 'ZC=F', COFFEE: 'KC=F', SUGAR: 'SB=F',
    COTTON: 'CT=F', COCOA: 'CC=F', LIVCAT: 'LE=F', FDRCAT: 'GF=F',
    LNHOG: 'HE=F', RICE: 'ZR=F', LUMBER: 'LBR=F',
    HEATO: 'HO=F', GASOLN: 'RB=F', ORNGJ: 'OJ=F'
  }
  const indexMap: Record<string, string> = {
    SPX: '^GSPC', SP500: '^GSPC', SPX500: '^GSPC', US500: '^GSPC',
    NASDAQ: '^IXIC', NDX: '^NDX', NAS100: '^NDX', US100: '^NDX',
    DJI: '^DJI', DOW: '^DJI', US30: '^DJI', RUT: '^RUT', US2000: '^RUT',
    DAX: '^GDAXI', DAX40: '^GDAXI', DE40: '^GDAXI', GER40: '^GDAXI',
    FTSE: '^FTSE', FTSE100: '^FTSE', UK100: '^FTSE', NIKKEI: '^N225',
    NIKKEI225: '^N225', JP225: '^N225', JPN225: '^N225', HSI: '^HSI',
    HANGSENG: '^HSI', HK50: '^HSI', STOXX50: '^STOXX50E', EU50: '^STOXX50E',
    EUSTX50: '^STOXX50E', CAC: '^FCHI', CAC40: '^FCHI', FRA40: '^FCHI',
    ASX200: '^AXJO', AUS200: '^AXJO'
  }

  add(commodityMap[compactSymbol] || commodityMap[compactName])
  add(indexMap[compactSymbol] || indexMap[compactName])

  if (type === 'forex' || /^[A-Z]{6}$/.test(compactSymbol)) {
    const base = parts[0] || compactSymbol.slice(0, 3)
    const quote = parts[1] || compactSymbol.slice(3, 6)
    if (base && quote) add(`${base}${quote}=X`)
  }

  if (type === 'crypto') {
    const base = (parts[0] || compactSymbol.replace(/(?:USDT|USDC|USD)$/, '')).replace(/^XBT$/, 'BTC')
    if (base) {
      add(`${base}-USD`)
      add(`${base}-USDC`)
    }
  }

  // Stocks are already Yahoo-compatible in the global assets registry.
  add(rawSymbol)
  if (rawSymbol.includes('.')) add(rawSymbol.replace('.', '-'))
  add(rawName)

  return Array.from(candidates)
}

function normalizeYahooSymbol(value: unknown): string {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '')
}

function normalizeMarketSession(value: string): MarketSession {
  if (value === 'NYSE' || value === 'UTC_24H') return value
  throw new Error(`Unsupported market session "${value}". Use NYSE or UTC_24H.`)
}

function getMarketSessionCloseMs(session: MarketSession, endsAtMs: number): number {
  if (session === 'UTC_24H') {
    const endsAt = new Date(endsAtMs)
    return Date.UTC(
      endsAt.getUTCFullYear(),
      endsAt.getUTCMonth(),
      endsAt.getUTCDate(),
      23,
      59,
      0,
      0
    )
  }

  const parts = getTimeZoneDateParts(endsAtMs, 'America/New_York')
  return zonedDateTimeToUtcMs({
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: 16,
    minute: 0,
    second: 0,
    timeZone: 'America/New_York'
  })
}

function getTimeZoneDateParts(millis: number, timeZone: string): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23'
  }).formatToParts(new Date(millis))
  const result: Record<string, number> = {}

  for (const part of parts) {
    if (part.type !== 'literal') result[part.type] = Number(part.value)
  }

  return {
    year: result.year,
    month: result.month,
    day: result.day,
    hour: result.hour || 0,
    minute: result.minute || 0,
    second: result.second || 0
  }
}

function zonedDateTimeToUtcMs(input: {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  timeZone: string
}): number {
  const wallClockAsUtc = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour,
    input.minute,
    input.second
  )
  let utcMillis = wallClockAsUtc

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actualParts = getTimeZoneDateParts(utcMillis, input.timeZone)
    const actualWallClockAsUtc = Date.UTC(
      actualParts.year,
      actualParts.month - 1,
      actualParts.day,
      actualParts.hour,
      actualParts.minute,
      actualParts.second
    )
    utcMillis += wallClockAsUtc - actualWallClockAsUtc
  }

  return utcMillis
}

class FirestoreRestClient {
  private readonly projectId: string
  private readonly env: Env

  constructor(env: Env) {
    this.env = env
    this.projectId = env.FIREBASE_PROJECT_ID
  }

  documentName(path: string): string {
    return `projects/${this.projectId}/databases/(default)/documents/${path}`
  }

  async getDocument(path: string): Promise<FirestoreDocument | null> {
    const accessToken = await getGoogleAccessToken(this.env)
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(this.projectId)}/databases/(default)/documents/${encodeFirestorePath(path)}`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    })
    if (response.status === 404) return null

    const payload = await readJsonResponse(response)
    if (!response.ok) {
      throw new Error(`Firestore get ${path} failed: ${response.status} ${JSON.stringify(payload)}`)
    }
    return decodeDocument(payload as FirestoreDocumentResponse)
  }

  async listDocuments(parentPath: string, collectionId: string): Promise<FirestoreDocument[]> {
    const accessToken = await getGoogleAccessToken(this.env)
    const collectionPath = [parentPath, collectionId].filter(Boolean).join('/')
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(this.projectId)}/databases/(default)/documents/${encodeFirestorePath(collectionPath)}`
    const documents: FirestoreDocument[] = []
    let pageToken = ''

    do {
      const url = new URL(baseUrl)
      url.searchParams.set('pageSize', '300')
      if (pageToken) url.searchParams.set('pageToken', pageToken)

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json'
        }
      })
      const payload = await readJsonResponse(response)
      if (!response.ok) {
        throw new Error(`Firestore list ${collectionPath} failed: ${response.status} ${JSON.stringify(payload)}`)
      }

      const page = payload as {
        documents?: FirestoreDocumentResponse[]
        nextPageToken?: string
      }
      for (const document of page.documents || []) {
        documents.push(decodeDocument(document))
      }
      pageToken = page.nextPageToken || ''
    } while (pageToken)

    return documents
  }

  async commit(writes: FirestoreWrite[]): Promise<void> {
    const accessToken = await getGoogleAccessToken(this.env)
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(this.projectId)}/databases/(default)/documents:commit`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ writes })
    })
    const payload = await readJsonResponse(response)

    if (!response.ok) {
      throw new Error(`Firestore atomic commit failed: ${response.status} ${JSON.stringify(payload)}`)
    }
  }
}

async function getGoogleAccessToken(env: Env): Promise<string> {
  if (cachedGoogleToken && cachedGoogleToken.expiresAtMs - Date.now() > 60_000) {
    return cachedGoogleToken.value
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  const assertion = await createServiceAccountJwt({
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKeyPem: env.FIREBASE_PRIVATE_KEY,
    issuedAtSeconds: nowSeconds - 30,
    expiresAtSeconds: nowSeconds + 3300
  })
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  })
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  })
  const payload = await readJsonResponse(response) as {
    access_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  }

  if (!response.ok || !payload.access_token) {
    throw new Error(
      `Google OAuth token exchange failed: ${response.status} ${payload.error || ''} ${payload.error_description || ''}`.trim()
    )
  }

  cachedGoogleToken = {
    value: payload.access_token,
    expiresAtMs: Date.now() + (payload.expires_in || 3600) * 1000
  }
  return cachedGoogleToken.value
}

async function createServiceAccountJwt(input: {
  clientEmail: string
  privateKeyPem: string
  issuedAtSeconds: number
  expiresAtSeconds: number
}): Promise<string> {
  const header = base64UrlEncodeText(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64UrlEncodeText(JSON.stringify({
    iss: input.clientEmail,
    sub: input.clientEmail,
    aud: GOOGLE_TOKEN_ENDPOINT,
    scope: FIRESTORE_SCOPE,
    iat: input.issuedAtSeconds,
    exp: input.expiresAtSeconds
  }))
  const unsignedToken = `${header}.${payload}`
  const privateKey = await importPrivateKey(input.privateKeyPem)
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  )

  return `${unsignedToken}.${base64UrlEncodeBytes(new Uint8Array(signature))}`
}

async function importPrivateKey(privateKeyPem: string): Promise<CryptoKey> {
  const normalizedPem = privateKeyPem.replace(/\\n/g, '\n')
  const base64 = normalizedPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '')

  if (!base64) throw new Error('FIREBASE_PRIVATE_KEY is empty or invalid.')

  const binary = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
  return crypto.subtle.importKey(
    'pkcs8',
    binary,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  )
}

function decodeDocument(document: FirestoreDocumentResponse): FirestoreDocument {
  const path = document.name.split('/documents/')[1] || ''
  return {
    id: path.split('/').at(-1) || '',
    name: document.name,
    path,
    data: decodeFields(document.fields || {}),
    createTime: document.createTime,
    updateTime: document.updateTime
  }
}

function decodeFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeValue(value)])
  )
}

function decodeValue(value: FirestoreValue): unknown {
  if ('nullValue' in value) return null
  if ('booleanValue' in value) return value.booleanValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('timestampValue' in value) return new Date(value.timestampValue as string)
  if ('stringValue' in value) return value.stringValue
  if ('arrayValue' in value) {
    return (value.arrayValue?.values || []).map(decodeValue)
  }
  if ('mapValue' in value) {
    return decodeFields(value.mapValue?.fields || {})
  }
  return undefined
}

function encodeFields(fields: Record<string, unknown>): Record<string, FirestoreValue> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, encodeValue(value)])
  )
}

function encodeValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Cannot encode a non-finite Firestore number.')
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value }
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } }
  }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: encodeFields(value as Record<string, unknown>)
      }
    }
  }
  throw new Error(`Unsupported Firestore value type: ${typeof value}.`)
}

function makeUpdateWrite(input: {
  name: string
  fields: Record<string, unknown>
  serverTimestampFields?: string[]
  precondition?: { exists?: boolean; updateTime?: string }
}): FirestoreWrite {
  const serverTimestampFields = input.serverTimestampFields || []
  return {
    update: {
      name: input.name,
      fields: encodeFields(input.fields)
    },
    updateMask: {
      fieldPaths: Object.keys(input.fields)
    },
    ...(serverTimestampFields.length
      ? {
          updateTransforms: serverTimestampFields.map((fieldPath) => ({
            fieldPath,
            setToServerValue: 'REQUEST_TIME' as const
          }))
        }
      : {}),
    ...(input.precondition ? { currentDocument: input.precondition } : {})
  }
}

function findCandleEndingAt(candles: YahooCandle[], endMs: number): YahooCandle | undefined {
  const startsAtMs = endMs - CANDLE_INTERVAL_MS
  return candles.find((candle) => candle.timestampMs === startsAtMs)
}

function findInitialCandle(candles: YahooCandle[], startsAtMs: number): YahooCandle | undefined {
  return findCandleEndingAt(candles, startsAtMs)
    || candles.find((candle) => candle.timestampMs === startsAtMs)
}

function isThirtyMinuteBoundary(millis: number): boolean {
  const date = new Date(millis)
  return date.getUTCMinutes() % CANDLE_INTERVAL_MINUTES === 0
    && date.getUTCSeconds() === 0
    && date.getUTCMilliseconds() === 0
}

function getNextUtcCalendarDay(nowMs: number): Date {
  const now = new Date(nowMs)
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  ))
}

function moveToUtcCalendarDay(source: Date, targetDay: Date): Date {
  return new Date(Date.UTC(
    targetDay.getUTCFullYear(),
    targetDay.getUTCMonth(),
    targetDay.getUTCDate(),
    source.getUTCHours(),
    source.getUTCMinutes(),
    source.getUTCSeconds(),
    source.getUTCMilliseconds()
  ))
}

function readTradingHolidays(value: unknown): Set<string> {
  if (value === undefined || value === null) return new Set()

  return new Set(requireArray(value, 'season.tradingHolidays').map((item, index) => {
    const date = requireString(item, `season.tradingHolidays[${index}]`).trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`season.tradingHolidays[${index}] must use YYYY-MM-DD.`)
    }
    const parsed = new Date(`${date}T00:00:00.000Z`)
    if (!Number.isFinite(parsed.getTime()) || formatUtcDate(parsed) !== date) {
      throw new Error(`season.tradingHolidays[${index}] is not a real calendar date.`)
    }
    return date
  }))
}

function isTradingDay(date: Date, tradingHolidays: Set<string>): boolean {
  const dayOfWeek = date.getUTCDay()
  return dayOfWeek !== 0 && dayOfWeek !== 6 && !tradingHolidays.has(formatUtcDate(date))
}

function findNextTradingDay(firstCandidate: Date, tradingHolidays: Set<string>): Date {
  let candidate = firstCandidate

  for (let attempt = 0; attempt < 370; attempt += 1) {
    if (isTradingDay(candidate, tradingHolidays)) return candidate
    candidate = getNextUtcCalendarDay(candidate.getTime())
  }

  throw new Error('Could not find a trading day within the next 370 calendar days.')
}

function formatUtcDate(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('-')
}

function createRoundId(startsAt: Date): string {
  return `round_${startsAt.toISOString().replace(/[-:.]/g, '').replace('T', '_').replace('Z', 'Z')}`
}

function ensureUniqueAssetIds(assets: ResolvedAsset[]): void {
  if (!assets.length) throw new Error('tournament.allowedAssets must not be empty.')
  const seen = new Set<string>()
  for (const asset of assets) {
    if (!asset.assetId) throw new Error(`${asset.symbol}: normalized assetId is empty.`)
    if (seen.has(asset.assetId)) throw new Error(`Duplicate allowed assetId ${asset.assetId}.`)
    seen.add(asset.assetId)
  }
}

function normalizeAssetId(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function normalizeStatus(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

function normalizePredictionDirection(value: unknown): PredictionDirection {
  const direction = String(value || '').trim().toUpperCase()
  if (direction === 'LONG' || direction === 'SHORT') return direction
  throw new Error(`Invalid prediction direction "${direction}".`)
}

function readCancellationReason(round: Record<string, unknown>): string | null {
  const action = String(round.settlementAction || '').trim().toLowerCase()
  if (!action) return null
  if (action !== 'cancel') {
    throw new Error('round.settlementAction must be "cancel" when specified.')
  }

  const reason = round.cancelReason
  if (reason === undefined || reason === null || String(reason).trim() === '') {
    return 'Cancelled by tournament administrator.'
  }
  return String(reason).trim()
}

function requireDate(value: unknown, fieldName: string): Date {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error(`${fieldName} must be a Firestore Timestamp.`)
  }
  return value
}

function requireArray(value: unknown, fieldName: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${fieldName} must be an array.`)
  return value
}

function requireObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object.`)
  }
  return value as Record<string, unknown>
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string.`)
  }
  return value
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized || undefined
}

function requirePositiveInteger(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${fieldName} must be a positive integer.`)
  }
  return value
}

function requireUpdateTime(
  document: FirestoreDocument,
  label: string
): { updateTime: string } {
  if (!document.updateTime) throw new Error(`${label} has no Firestore updateTime.`)
  return { updateTime: document.updateTime }
}

function readFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`Expected a positive integer, received "${value}".`)
  }
  return parsed
}

function parseNonNegativeInteger(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Expected a non-negative integer, received "${value}".`)
  }
  return parsed
}

function parseNegativeInteger(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed > -1) {
    throw new Error(`Expected a negative integer, received "${value}".`)
  }
  return parsed
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function encodeFirestorePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

function base64UrlEncodeText(value: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(value))
}

function base64UrlEncodeBytes(value: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < value.length; index += chunkSize) {
    binary += String.fromCharCode(...value.subarray(index, index + chunkSize))
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await mapper(items[currentIndex], currentIndex)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  )
  return results
}

function validateEnv(env: Env): void {
  requireString(env.FIREBASE_PROJECT_ID, 'FIREBASE_PROJECT_ID')
  requireString(env.FIREBASE_CLIENT_EMAIL, 'FIREBASE_CLIENT_EMAIL')
  requireString(env.FIREBASE_PRIVATE_KEY, 'FIREBASE_PRIVATE_KEY')
}

function serializeError(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  })
}
