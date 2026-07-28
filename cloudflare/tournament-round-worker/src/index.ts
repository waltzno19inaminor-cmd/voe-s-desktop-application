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
  yahooSymbol: string
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
  yahooSymbol: string
  session: MarketSession
  direction: PredictionDirection
  startPrice: number
  endPrice: number
  referencePrice: number
  sessionHigh: number
  sessionHighAt: Date
  sessionLow: number
  sessionLowAt: Date
  resolutionEndsAt: Date
}

interface TournamentRunResult {
  tournamentId: string
  status: 'settled' | 'cancelled' | 'skipped' | 'failed'
  reason?: string
  seasonId?: string
  closedRoundId?: string
  cancelledRoundId?: string
  openedRoundId?: string
  predictionsProcessed?: number
  usersUpdated?: number
  assetResults?: Record<string, PredictionDirection>
}

interface RunReport {
  dryRun: boolean
  startedAt: string
  finishedAt: string
  tournaments: TournamentRunResult[]
}

const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore'
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const YAHOO_CHART_ENDPOINT = 'https://query1.finance.yahoo.com/v8/finance/chart'
const MINUTE_MS = 60 * 1000
const MAX_ATOMIC_WRITES = 450

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

    if (url.pathname !== '/run' || request.method !== 'POST') {
      return jsonResponse({ error: 'Not found' }, 404)
    }

    const authorization = request.headers.get('Authorization')
    if (!env.MANUAL_RUN_TOKEN || authorization !== `Bearer ${env.MANUAL_RUN_TOKEN}`) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    try {
      const dryRun = url.searchParams.get('dryRun') === 'true'
      const report = await runDailySettlement(env, dryRun)
      return jsonResponse(report)
    } catch (error) {
      console.error('[Tournament Worker] Manual run failed:', serializeError(error))
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

  const nextRoundDay = getNextUtcCalendarDay(nowMs)
  const tradingHolidays = readTradingHolidays(season.data.tradingHolidays)
  if (!isTradingDay(nextRoundDay, tradingHolidays)) {
    return {
      tournamentId,
      seasonId: season.id,
      status: 'skipped',
      reason: `Next calendar day ${formatUtcDate(nextRoundDay)} is not a trading day; keeping the current round opened.`
    }
  }

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
    4,
    async ({ asset, resolutionEndsAtMs: assetResolutionEndsAtMs }) => (
      resolveAssetDirection(asset, startsAt.getTime(), endsAt.getTime(), assetResolutionEndsAtMs)
    )
  )
  const resolutionsByAssetId = new Map(resolutions.map((resolution) => [resolution.assetId, resolution]))

  const predictions = await firestore.listDocuments(
    `tournaments/${tournamentId}/seasons/${season.id}/rounds/${round.id}`,
    'predictions'
  )
  const userDeltas = calculateUserDeltas({
    predictions,
    resolutionsByAssetId,
    startsAtMs: startsAt.getTime(),
    endsAtMs: endsAt.getTime(),
    pointsPerCorrect: parsePositiveInteger(env.POINTS_PER_CORRECT, 25),
    pointsPerIncorrect: parseNegativeInteger(env.POINTS_PER_INCORRECT, -25)
  })

  const leaderboardDocuments = await firestore.listDocuments(
    `tournaments/${tournamentId}/seasons/${season.id}`,
    'leaderboard'
  )
  const leaderboardByUserId = new Map(leaderboardDocuments.map((entry) => [entry.id, entry]))

  const writes: FirestoreWrite[] = []
  for (const [userId, delta] of userDeltas) {
    const existing = leaderboardByUserId.get(userId)
    const currentPoints = readFiniteNumber(existing?.data.points, 0)
    const currentTotal = readFiniteNumber(
      existing?.data.totalPredictions ?? existing?.data.predictionsCount,
      0
    )
    const currentCorrect = readFiniteNumber(existing?.data.correctPredictions, 0)
    const fields = {
      userId,
      points: Math.max(0, currentPoints + delta.points),
      totalPredictions: currentTotal + delta.totalPredictions,
      correctPredictions: currentCorrect + delta.correctPredictions,
      lastScoredRoundId: round.id
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
  }

  const serializedResults = Object.fromEntries(
    resolutions.map((resolution) => [
      resolution.assetId,
      {
        asset: resolution.asset,
        yahooSymbol: resolution.yahooSymbol,
        session: resolution.session,
        direction: resolution.direction,
        startPrice: resolution.startPrice,
        endPrice: resolution.endPrice,
        referencePrice: resolution.referencePrice,
        sessionHigh: resolution.sessionHigh,
        sessionHighAt: resolution.sessionHighAt,
        sessionLow: resolution.sessionLow,
        sessionLowAt: resolution.sessionLowAt,
        resolutionEndsAt: resolution.resolutionEndsAt,
        timeWindowMinutes
      }
    ])
  )

  writes.push(makeUpdateWrite({
    name: round.name,
    fields: {
      status: 'closed',
      results: serializedResults,
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
    assetResults: Object.fromEntries(
      resolutions.map((resolution) => [resolution.assetId, resolution.direction])
    )
  }
}

function calculateUserDeltas(input: {
  predictions: FirestoreDocument[]
  resolutionsByAssetId: Map<string, AssetResolution>
  startsAtMs: number
  endsAtMs: number
  pointsPerCorrect: number
  pointsPerIncorrect: number
}): Map<string, { points: number; totalPredictions: number; correctPredictions: number }> {
  const result = new Map<string, { points: number; totalPredictions: number; correctPredictions: number }>()
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

    const uniqueKey = `${userId}:${assetId}`
    if (seenPredictions.has(uniqueKey)) {
      throw new Error(`Duplicate prediction for ${uniqueKey}.`)
    }
    seenPredictions.add(uniqueKey)

    const resolution = input.resolutionsByAssetId.get(assetId)
    if (!resolution) {
      throw new Error(`Prediction ${predictionDocument.id} references disallowed asset ${assetId}.`)
    }

    const isCorrect = prediction === resolution.direction
    const current = result.get(userId) || {
      points: 0,
      totalPredictions: 0,
      correctPredictions: 0
    }
    current.totalPredictions += 1
    if (isCorrect) {
      current.correctPredictions += 1
      current.points += input.pointsPerCorrect
    } else {
      current.points += input.pointsPerIncorrect
    }
    result.set(userId, current)
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

  const candles = await fetchYahooCandles(asset, startsAtMs, cutoffMs)
  const startCandle = findExactMinuteCandle(candles, startsAtMs)
  const endCandle = findExactMinuteCandle(candles, endsAtMs)

  if (!startCandle) {
    throw new Error(`${asset.symbol}: Yahoo has no exact 1-minute candle at startsAt.`)
  }
  if (!endCandle) {
    throw new Error(`${asset.symbol}: Yahoo has no exact 1-minute candle at endsAt.`)
  }

  const referencePrice = (startCandle.open + endCandle.open) / 2
  const postVotingCandles = candles.filter((candle) => {
    return candle.timestampMs >= floorToMinute(endsAtMs)
      && candle.timestampMs < cutoffMs
  })

  if (!postVotingCandles.length) {
    throw new Error(`${asset.symbol}: no candles between endsAt and the market-session close.`)
  }

  const sessionHigh = Math.max(...postVotingCandles.map((candle) => candle.high))
  const sessionLow = Math.min(...postVotingCandles.map((candle) => candle.low))
  const highCandle = postVotingCandles.find((candle) => candle.high === sessionHigh)
  const lowCandle = postVotingCandles.find((candle) => candle.low === sessionLow)

  if (!highCandle || !lowCandle) {
    throw new Error(`${asset.symbol}: failed to locate session extrema.`)
  }

  const reachedAboveReference = sessionHigh > referencePrice
  const reachedBelowReference = sessionLow < referencePrice
  let direction: PredictionDirection

  if (reachedAboveReference && !reachedBelowReference) {
    direction = 'LONG'
  } else if (!reachedAboveReference && reachedBelowReference) {
    direction = 'SHORT'
  } else if (!reachedAboveReference && !reachedBelowReference) {
    throw new Error(`${asset.symbol}: price never moved away from the reference price.`)
  } else if (highCandle.timestampMs === lowCandle.timestampMs) {
    throw new Error(
      `${asset.symbol}: high and low occurred in the same minute; 1-minute Yahoo data cannot determine order safely.`
    )
  } else {
    direction = lowCandle.timestampMs < highCandle.timestampMs ? 'SHORT' : 'LONG'
  }

  return {
    assetId: asset.assetId,
    asset: asset.symbol,
    yahooSymbol: asset.yahooSymbol,
    session: asset.session,
    direction,
    startPrice: startCandle.open,
    endPrice: endCandle.open,
    referencePrice,
    sessionHigh,
    sessionHighAt: new Date(highCandle.timestampMs),
    sessionLow,
    sessionLowAt: new Date(lowCandle.timestampMs),
    resolutionEndsAt: new Date(cutoffMs)
  }
}

async function fetchYahooCandles(
  asset: ResolvedAsset,
  startsAtMs: number,
  cutoffMs: number
): Promise<YahooCandle[]> {
  const query = new URLSearchParams({
    period1: String(Math.floor((startsAtMs - MINUTE_MS) / 1000)),
    period2: String(Math.ceil((cutoffMs + 2 * MINUTE_MS) / 1000)),
    interval: '1m',
    includePrePost: asset.session === 'NYSE' ? 'false' : 'true',
    events: 'div,splits',
    lang: 'en-US',
    region: 'US'
  })
  const url = `${YAHOO_CHART_ENDPOINT}/${encodeURIComponent(asset.yahooSymbol)}?${query}`
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`${asset.symbol}: Yahoo request failed with HTTP ${response.status}.`)
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
      `${asset.symbol}: Yahoo error ${payload.chart.error.code || ''} ${payload.chart.error.description || ''}`.trim()
    )
  }

  const chart = payload.chart?.result?.[0]
  const timestamps = chart?.timestamp || []
  const quote = chart?.indicators?.quote?.[0]
  if (!timestamps.length || !quote) {
    throw new Error(`${asset.symbol}: Yahoo returned no chart data.`)
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
    throw new Error(`${asset.symbol}: Yahoo returned only empty candles.`)
  }

  return candles.sort((left, right) => left.timestampMs - right.timestampMs)
}

function resolveAllowedAsset(rawAsset: unknown, index: number): ResolvedAsset {
  const raw = requireObject(rawAsset, `allowedAssets[${index}]`)
  const symbol = requireString(raw.symbol || raw.name, `allowedAssets[${index}].symbol`).trim()
  const type = String(raw.type || 'Other').trim()
  const yahooSymbol = requireString(raw.yahooSymbol, `${symbol}.yahooSymbol`).trim()
  const session = normalizeMarketSession(
    requireString(raw.session, `${symbol}.session`).trim().toUpperCase()
  )

  return {
    assetId: normalizeAssetId(symbol),
    symbol,
    type,
    yahooSymbol,
    session
  }
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

function findExactMinuteCandle(candles: YahooCandle[], targetMs: number): YahooCandle | undefined {
  const minute = floorToMinute(targetMs)
  return candles.find((candle) => floorToMinute(candle.timestampMs) === minute)
}

function floorToMinute(millis: number): number {
  return Math.floor(millis / MINUTE_MS) * MINUTE_MS
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
