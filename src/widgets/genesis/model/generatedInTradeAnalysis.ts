export type GeneratedTradeDirection = 'LONG' | 'SHORT'

export interface GeneratedOhlcCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export interface GeneratedInTradeAnalysisInput {
  direction?: unknown
  entry?: unknown
  exit?: unknown
  startTime?: unknown
  endTime?: unknown
  assetKind?: unknown
}

interface TimeframeDefinition {
  id: string
  durationMs: number
}

interface AnalysisCandleSet {
  timeframe: TimeframeDefinition
  candles: GeneratedOhlcCandle[]
  startsAtEntry: boolean
  endsAtExit: boolean
}

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const IN_TRADE_NOISE_PCT = 0.5

export const GENERATED_IN_TRADE_ANALYSIS_VERSION = 2

const TIMEFRAMES: TimeframeDefinition[] = [
  { id: '1m', durationMs: MINUTE_MS },
  { id: '15m', durationMs: 15 * MINUTE_MS },
  { id: '1h', durationMs: HOUR_MS },
  { id: '4h', durationMs: 4 * HOUR_MS },
  { id: '1d', durationMs: DAY_MS }
]

const SESSION_DAY_SECONDS: Record<string, number> = {
  stock: 8 * 3600,
  stocks: 8 * 3600,
  forex: 24 * 3600,
  crypto: 24 * 3600,
  xstock: 24 * 3600,
  xstocks: 24 * 3600,
  metal: 23 * 3600,
  metals: 23 * 3600,
  commodity: 23 * 3600,
  commodities: 23 * 3600,
  index: 23 * 3600,
  indices: 23 * 3600,
  unknown: 24 * 3600
}

const toPositiveNumber = (value: unknown): number => {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : Number.NaN
}

const toTimestamp = (value: unknown): number => {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN
  const timestamp = new Date(String(value || '')).getTime()
  return Number.isFinite(timestamp) ? timestamp : Number.NaN
}

const normalizeDirection = (value: unknown): GeneratedTradeDirection | null => {
  const normalized = String(value || '').trim().toUpperCase()
  if (normalized.includes('SHORT')) return 'SHORT'
  if (normalized.includes('LONG')) return 'LONG'
  return null
}

const getTimeframe = (id: string): TimeframeDefinition => {
  const known = TIMEFRAMES.find(timeframe => timeframe.id === id)
  if (known) return known

  const match = String(id || '').trim().toLowerCase().match(/^(\d+)(m|h|d)$/)
  const amount = Number(match?.[1])
  const unitMs = match?.[2] === 'd' ? DAY_MS : match?.[2] === 'h' ? HOUR_MS : MINUTE_MS
  return {
    id,
    durationMs: Number.isFinite(amount) && amount > 0 ? amount * unitMs : MINUTE_MS
  }
}

const normalizeCandle = (candle: any): GeneratedOhlcCandle | null => {
  const normalized = {
    time: Number(candle?.time),
    open: Number(candle?.open),
    high: Number(candle?.high),
    low: Number(candle?.low),
    close: Number(candle?.close)
  }
  const prices = [normalized.open, normalized.high, normalized.low, normalized.close]
  if (!Number.isFinite(normalized.time) || !prices.every(price => Number.isFinite(price) && price > 0)) return null
  if (normalized.high < Math.max(normalized.open, normalized.close, normalized.low)) return null
  if (normalized.low > Math.min(normalized.open, normalized.close, normalized.high)) return null
  return normalized
}

const normalizeCandles = (
  candles: unknown,
  timeframe: TimeframeDefinition,
  startTime: number,
  endTime: number
): GeneratedOhlcCandle[] => {
  return (Array.isArray(candles) ? candles : [])
    .map(normalizeCandle)
    .filter((candle): candle is GeneratedOhlcCandle => Boolean(candle))
    .filter(candle => {
      if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return true
      return candle.time < endTime && candle.time + timeframe.durationMs > startTime
    })
    .sort((left, right) => left.time - right.time)
}

/**
 * Yahoo can return a finer series that starts after the actual entry candle.
 * Prefer the most precise series that covers both trade boundaries; otherwise
 * minimize uncovered boundary time before considering nominal resolution.
 */
const selectAnalysisCandles = (
  candlesByTimeframe: Record<string, unknown>,
  startTime: number,
  endTime: number
): AnalysisCandleSet | null => {
  const candidates = Object.entries(candlesByTimeframe || {})
    .map(([id, rawCandles]) => {
      const timeframe = getTimeframe(id)
      const candles = normalizeCandles(rawCandles, timeframe, startTime, endTime)
      if (!candles.length) return null

      const first = candles[0]
      const last = candles[candles.length - 1]
      const hasRange = Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime
      const startsAtEntry = !hasRange || (first.time <= startTime && first.time + timeframe.durationMs > startTime)
      const endsAtExit = !hasRange || (last.time < endTime && last.time + timeframe.durationMs >= endTime)
      const startGapMs = !hasRange
        ? 0
        : startsAtEntry
          ? Math.max(0, startTime - first.time)
          : Math.max(0, first.time - startTime)
      const endGapMs = !hasRange
        ? 0
        : endsAtExit
          ? Math.max(0, last.time + timeframe.durationMs - endTime)
          : Math.max(0, endTime - (last.time + timeframe.durationMs))

      return { timeframe, candles, startsAtEntry, endsAtExit, startGapMs, endGapMs }
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))

  if (!candidates.length) return null

  candidates.sort((left, right) => {
    const leftBoundaryMisses = Number(!left.startsAtEntry) + Number(!left.endsAtExit)
    const rightBoundaryMisses = Number(!right.startsAtEntry) + Number(!right.endsAtExit)
    if (leftBoundaryMisses !== rightBoundaryMisses) return leftBoundaryMisses - rightBoundaryMisses
    if (left.startGapMs !== right.startGapMs) return left.startGapMs - right.startGapMs
    if (left.endGapMs !== right.endGapMs) return left.endGapMs - right.endGapMs
    return left.timeframe.durationMs - right.timeframe.durationMs
  })

  return candidates[0]
}

const getCandleWindow = (
  candles: GeneratedOhlcCandle[],
  index: number,
  timeframe: TimeframeDefinition,
  startTime: number,
  endTime: number
): { start: number; end: number } | null => {
  const current = candles[index]?.time
  if (!Number.isFinite(current)) return null

  const nominalEnd = current + timeframe.durationMs
  const windowStart = Number.isFinite(startTime) ? Math.max(current, startTime) : current
  const windowEnd = Number.isFinite(endTime) ? Math.min(nominalEnd, endTime) : nominalEnd
  return windowEnd > windowStart ? { start: windowStart, end: windowEnd } : null
}

const getCandleEvidence = (
  candle: GeneratedOhlcCandle,
  direction: GeneratedTradeDirection,
  lossLimit: number,
  profitLimit: number
) => {
  const hasLoss = direction === 'LONG' ? candle.low <= lossLimit : candle.high >= lossLimit
  const hasProfit = direction === 'LONG' ? candle.high >= profitLimit : candle.low <= profitLimit
  const state = hasLoss && hasProfit ? 'both' : hasLoss ? 'loss' : hasProfit ? 'profit' : 'noise'
  return { hasLoss, hasProfit, state }
}

const summarizePathCleanliness = (states: string[]) => {
  if (!states.length) return { score: Number.NaN, flips: Number.NaN, noiseSharePct: Number.NaN }

  let flips = 0
  let previousMeaningful = ''
  let meaningfulCount = 0
  let noiseCount = 0
  let ambiguousCount = 0

  states.forEach((state) => {
    if (state === 'noise') {
      noiseCount += 1
      return
    }

    meaningfulCount += 1
    if (state === 'both') {
      ambiguousCount += 1
      if (previousMeaningful) flips += 1
      previousMeaningful = ''
      return
    }

    if (previousMeaningful && previousMeaningful !== state) flips += 1
    previousMeaningful = state
  })

  const noiseSharePct = (noiseCount / states.length) * 100
  const score = meaningfulCount
    ? Math.round(Math.min(100, Math.max(0, 100 - (flips * 22) - (ambiguousCount * 18) - (noiseSharePct * 0.25))))
    : 0

  return { score, flips, noiseSharePct }
}

const classifyPathShape = ({
  states,
  firstImpulse,
  maePct,
  mfePct,
  captureRatio
}: {
  states: string[]
  firstImpulse: string | null
  maePct: number
  mfePct: number
  captureRatio: number
}) => {
  const pathCleanliness = summarizePathCleanliness(states)
  if (pathCleanliness.flips >= 3) return 'CHOPPY_PATH'
  if (firstImpulse === 'AMBIGUOUS') return 'TWO_SIDED_INTRABAR'
  if (Math.abs(maePct) < IN_TRADE_NOISE_PCT && mfePct < IN_TRADE_NOISE_PCT) return 'NOISE_RANGE'
  if (firstImpulse === 'LOSS' && mfePct >= IN_TRADE_NOISE_PCT) return 'ADVERSE_THEN_RECOVERY'
  if (firstImpulse === 'PROFIT' && Math.abs(maePct) >= IN_TRADE_NOISE_PCT) return 'FAVORABLE_THEN_PULLBACK'
  if (mfePct >= IN_TRADE_NOISE_PCT && Number.isFinite(captureRatio) && captureRatio >= 65) return 'CLEAN_TREND_CAPTURE'
  if (mfePct >= IN_TRADE_NOISE_PCT && Number.isFinite(captureRatio) && captureRatio < 35) return 'LATE_EXIT_AFTER_MFE'
  return firstImpulse === 'PROFIT' ? 'FAVORABLE_FIRST' : firstImpulse === 'LOSS' ? 'ADVERSE_FIRST' : 'NOISE_RANGE'
}

export const buildGeneratedInTradeAnalysis = (
  candlesByTimeframe: Record<string, unknown> | null | undefined,
  input: GeneratedInTradeAnalysisInput
) => {
  const direction = normalizeDirection(input.direction)
  const entryPrice = toPositiveNumber(input.entry)
  const exitPrice = toPositiveNumber(input.exit)
  const startTime = toTimestamp(input.startTime)
  const endTime = toTimestamp(input.endTime)
  const selected = selectAnalysisCandles(candlesByTimeframe || {}, startTime, endTime)

  if (!direction || !Number.isFinite(entryPrice) || !selected?.candles.length) return null

  const { timeframe, candles, startsAtEntry, endsAtExit } = selected
  const highs = candles.map(candle => candle.high)
  const lows = candles.map(candle => candle.low)

  // Every OHLC wick is real market evidence. Candle colour says nothing about
  // whether its high/low happened, so it must never filter MAE/MFE extrema.
  const maxPrice = Math.max(entryPrice, ...highs)
  const minPrice = Math.min(entryPrice, ...lows)
  const lossLimit = direction === 'LONG'
    ? entryPrice * (1 - (IN_TRADE_NOISE_PCT / 100))
    : entryPrice * (1 + (IN_TRADE_NOISE_PCT / 100))
  const profitLimit = direction === 'LONG'
    ? entryPrice * (1 + (IN_TRADE_NOISE_PCT / 100))
    : entryPrice * (1 - (IN_TRADE_NOISE_PCT / 100))

  let meaningfulLossSeconds = 0
  let meaningfulProfitSeconds = 0
  let meaningfulLossStartTime: number | null = null
  let meaningfulLossEndTime: number | null = null
  let meaningfulProfitStartTime: number | null = null
  let meaningfulProfitEndTime: number | null = null
  let firstImpulse: 'LOSS' | 'PROFIT' | 'AMBIGUOUS' | null = null
  let intrabarSequenceAmbiguous = false
  const states: string[] = []
  const pathSegments: Array<{ state: string; start: number; end: number }> = []

  candles.forEach((candle, index) => {
    const evidence = getCandleEvidence(candle, direction, lossLimit, profitLimit)
    const window = getCandleWindow(candles, index, timeframe, startTime, endTime)
    const stepSeconds = window ? Math.max(0, (window.end - window.start) / 1000) : 0

    if (evidence.hasLoss) {
      meaningfulLossSeconds += stepSeconds
      if (window) {
        meaningfulLossStartTime ??= window.start
        meaningfulLossEndTime = window.end
      }
    }
    if (evidence.hasProfit) {
      meaningfulProfitSeconds += stepSeconds
      if (window) {
        meaningfulProfitStartTime ??= window.start
        meaningfulProfitEndTime = window.end
      }
    }

    if (evidence.state === 'both') intrabarSequenceAmbiguous = true
    if (!firstImpulse && evidence.state !== 'noise') {
      firstImpulse = evidence.state === 'both'
        ? 'AMBIGUOUS'
        : evidence.state === 'loss' ? 'LOSS' : 'PROFIT'
    }

    states.push(evidence.state)
    if (window) {
      const previous = pathSegments[pathSegments.length - 1]
      if (previous?.state === evidence.state && window.start <= previous.end + 1) {
        previous.end = window.end
      } else {
        pathSegments.push({ state: evidence.state, start: window.start, end: window.end })
      }
    }
  })

  const rawMaePct = direction === 'LONG'
    ? ((minPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - maxPrice) / entryPrice) * 100
  const rawMfePct = direction === 'LONG'
    ? ((maxPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - minPrice) / entryPrice) * 100
  const maePct = rawMaePct <= -IN_TRADE_NOISE_PCT ? rawMaePct : 0
  const mfePct = rawMfePct >= IN_TRADE_NOISE_PCT ? rawMfePct : 0
  const maxFavorableMove = direction === 'LONG' ? maxPrice - entryPrice : entryPrice - minPrice
  const realizedMove = Number.isFinite(exitPrice)
    ? direction === 'LONG' ? exitPrice - entryPrice : entryPrice - exitPrice
    : Number.NaN
  const captureRatio = maxFavorableMove > 0 && rawMfePct >= IN_TRADE_NOISE_PCT && Number.isFinite(realizedMove) && realizedMove > 0
    ? (realizedMove / maxFavorableMove) * 100
    : Number.NaN
  const pathCleanliness = summarizePathCleanliness(states)
  const firstMeaningfulSegment = pathSegments.find(segment => segment.state !== 'noise')
  const entryHeatEndTime = firstMeaningfulSegment?.state === 'loss' ? firstMeaningfulSegment.start : null
  const entryHeatSeconds = entryHeatEndTime !== null && Number.isFinite(startTime)
    ? Math.max(0, (entryHeatEndTime - startTime) / 1000)
    : Number.NaN
  const adverseBeforeProfit = meaningfulProfitStartTime === null
    ? null
    : meaningfulLossStartTime === null
      ? false
      : meaningfulLossStartTime === meaningfulProfitStartTime
        ? null
        : meaningfulLossStartTime < meaningfulProfitStartTime
  const assetKind = String(input.assetKind || 'unknown').trim().toLowerCase()

  return {
    version: GENERATED_IN_TRADE_ANALYSIS_VERSION,
    source: 'generated',
    ohlcPolicy: 'full_wick_boundary_aware_v2',
    timeframe: timeframe.id,
    noisePct: IN_TRADE_NOISE_PCT,
    sessionDaySeconds: SESSION_DAY_SECONDS[assetKind] || SESSION_DAY_SECONDS.unknown,
    direction,
    entry: entryPrice,
    exit: Number.isFinite(exitPrice) ? exitPrice : null,
    tradeStartTime: Number.isFinite(startTime) ? startTime : null,
    tradeEndTime: Number.isFinite(endTime) ? endTime : null,
    startsAtEntry,
    endsAtExit,
    intrabarSequenceAmbiguous,
    maxPrice,
    minPrice,
    meaningfulLossSeconds,
    meaningfulProfitSeconds,
    meaningfulLossStartTime,
    meaningfulLossEndTime,
    meaningfulProfitStartTime,
    meaningfulProfitEndTime,
    firstImpulseDirection: firstImpulse,
    entryHeatSeconds: Number.isFinite(entryHeatSeconds) ? entryHeatSeconds : null,
    entryHeatEndTime,
    adverseBeforeProfit,
    pathCleanlinessScore: Number.isFinite(pathCleanliness.score) ? pathCleanliness.score : null,
    pathFlipCount: Number.isFinite(pathCleanliness.flips) ? pathCleanliness.flips : null,
    pathNoiseSharePct: Number.isFinite(pathCleanliness.noiseSharePct) ? pathCleanliness.noiseSharePct : null,
    pathSegments,
    maxMeaningfulDrawdownPct: maePct,
    maxFavorableExcursionPct: mfePct,
    profitCaptureRatio: Number.isFinite(captureRatio) ? captureRatio : null,
    pricePathShape: classifyPathShape({ states, firstImpulse, maePct, mfePct, captureRatio })
  }
}

export const getGeneratedCandlesByTimeframe = (marketData: any): Record<string, unknown> | null => {
  if (!marketData || typeof marketData !== 'object') return null
  if (marketData.candlesByTimeframe && typeof marketData.candlesByTimeframe === 'object') {
    return marketData.candlesByTimeframe
  }

  const direct = Object.fromEntries(
    Object.entries(marketData).filter(([, candles]) => Array.isArray(candles))
  )
  return Object.keys(direct).length ? direct : null
}

export const buildTradeGeneratedInTradeAnalysis = (trade: any) => {
  const metrics = trade?.tradeStudyMetrics || trade?.studyMetrics || {}
  const storedAnalysis = metrics.generatedInTradeAnalysis || trade?.generatedInTradeAnalysis || null
  const marketData = metrics.generatedMarketData || trade?.generatedMarketData || null
  const recalculated = buildGeneratedInTradeAnalysis(getGeneratedCandlesByTimeframe(marketData), {
    direction: trade?.side || trade?.direction || storedAnalysis?.direction,
    entry: trade?.averageEntry ?? trade?.entry,
    exit: trade?.averageExit ?? trade?.exit,
    startTime: trade?.date || trade?.entryTime || trade?.openDate,
    endTime: trade?.dateExit || trade?.exitTime || trade?.closeDate,
    assetKind: trade?.assetType || trade?.instrumentType || 'unknown'
  })

  return recalculated || storedAnalysis
}
