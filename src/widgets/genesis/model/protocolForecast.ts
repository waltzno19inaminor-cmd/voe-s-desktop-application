import type { DiaryEntry } from '~/entities/diary/model/diary.types'
import { HISTORICAL_FORECAST_FILES } from './protocolForecastFiles'

type HistoricalSourceTier = 'primary' | 'auxiliary'

export interface ProtocolForecastInput {
  trades: DiaryEntry[]
  currentCapital: number
  horizonTrades?: number
  windowTrades?: number
  topMatches?: number
}

export interface ProtocolForecastMetrics {
  tradeCount: number
  winRate: number
  profitFactor: number
  expectancyPct: number
  averageAbsReturnPct: number
  medianAbsReturnPct: number
  averagePositiveReturnPct: number
  averageNegativeReturnPctAbs: number
  payoffRatio: number
  averageRiskReward: number | null
  volatilityPct: number
  maxDrawdownPct: number
  currentDrawdownPct: number
  recentReturnPct: number
  recentDrawdownPct: number
  maxLossStreak: number
  currentLossStreak: number
  tradeFrequencyPerWeek: number
  averageDurationHours: number
  recoveryFactor: number
  ulcerIndex: number
  downsideDeviationPct: number
  sortinoLike: number
  equitySlope: number
  returnSkewness: number
  symbolConcentrationTop1: number
  tailLossCvar95: number
}

export interface LifecycleForecastResult {
  status: 'ready' | 'insufficient-data'
  confidence: 'low' | 'medium' | 'high'
  confidenceScore: number
  message: string
  quantiles: {
    p10: number
    p25: number
    p50: number
    p75: number
    p90: number
  }
  capitalQuantiles: {
    p10: number
    p25: number
    p50: number
    p75: number
    p90: number
  }
  probabilityProfit: number
  probabilityDrawdownOver10: number
  matchesCount: number
  sourceFilesCount: number
  medianTradeCount: number
  medianDurationDays: number
  medianMaxDrawdownPct: number
  strengthFactorP50: number
  baseQuantiles: {
    p10: number
    p25: number
    p50: number
    p75: number
    p90: number
  }
}

export interface TacticalForecastDiagnostics {
  userPerTradeExpectancyPct: number
  userPerTradeExpectancyUsd: number
  userAverageWinPct: number
  userAverageLossPctAbs: number
  amplitudeScaleP50: number
  historicalShapePreviewQuantiles: {
    p10: number
    p25: number
    p50: number
    p75: number
    p90: number
  }
  periods: Array<{
    horizonTrades: number
    userLinearEstimatePct: number
    historicalShapeP50Pct: number
    userScaledP50Pct: number
  }>
}

export interface ProtocolForecastResult {
  status: 'ready' | 'insufficient-data'
  confidence: 'low' | 'medium' | 'high'
  confidenceScore: number
  message: string
  horizonTrades: number
  currentCapital: number
  metrics: ProtocolForecastMetrics
  quantiles: {
    p10: number
    p25: number
    p50: number
    p75: number
    p90: number
  }
  capitalQuantiles: {
    p10: number
    p25: number
    p50: number
    p75: number
    p90: number
  }
  previewHorizonTrades: number
  previewQuantiles: {
    p10: number
    p25: number
    p50: number
    p75: number
    p90: number
  }
  previewCapitalQuantiles: {
    p10: number
    p25: number
    p50: number
    p75: number
    p90: number
  }
  previewPeakCapitalQuantiles: {
    p10: number
    p50: number
    p90: number
  }
  previewTroughCapitalQuantiles: {
    p10: number
    p50: number
    p90: number
  }
  previewPath: Array<{
    tradeIndex: number
    capital: {
      p10: number
      p25: number
      p50: number
      p75: number
      p90: number
    }
  }>
  probabilityProfit: number
  probabilityDrawdownOver10: number
  simulationsCount: number
  matchesCount?: number
  sourceFilesCount?: number
  amplitudeCalibrationFactor?: number
  amplitudeCalibrationWeight?: number
  tacticalDiagnostics: TacticalForecastDiagnostics
  lifecycle: LifecycleForecastResult
}

interface PreparedTrade {
  timestamp: number
  entryTimestamp: number
  asset: string
  profit: number
  returnPct: number
  durationHours: number
  riskReward: number | null
}

interface ParsedStatementRow {
  originalIndex: number
  timestamp: number
  entryTimestamp: number
  action: string
  symbol: string
  profit: number
  kind: 'trade' | 'cashflow'
  riskReward: number | null
  durationHours: number
}

interface HistoricalTimeline {
  sourceFile: string
  sourceTier: HistoricalSourceTier
  trades: PreparedTrade[]
}

interface HistoricalWindow {
  sourceFile: string
  sourceTier: HistoricalSourceTier
  features: ProtocolForecastMetrics
  futureReturnPct: number
  futureMaxDrawdownPct: number
  futureReturnsPath: number[]
}

interface HistoricalLifecycleProfile {
  sourceFile: string
  sourceTier: HistoricalSourceTier
  features: ProtocolForecastMetrics
  totalReturnPct: number
  maxDrawdownPct: number
  tradeCount: number
  durationDays: number
}

interface Normalizer {
  key: FeatureKey
  median: number
  iqr: number
}

interface ForecastRegime {
  windowTrades: number
  horizonTrades: number
}

interface ForecastCandidate {
  regime: ForecastRegime
  userWindow: PreparedTrade[]
  userMetrics: ProtocolForecastMetrics
  historicalWindows: HistoricalWindow[]
  matches: Array<{
    window: HistoricalWindow
    distance: number
  }>
  sourceFilesCount: number
  medianDistance: number
  score: number
}

type FeatureKey = keyof Pick<
  ProtocolForecastMetrics,
  | 'winRate'
  | 'profitFactor'
  | 'expectancyPct'
  | 'payoffRatio'
  | 'averageRiskReward'
  | 'volatilityPct'
  | 'maxDrawdownPct'
  | 'currentDrawdownPct'
  | 'recentReturnPct'
  | 'recentDrawdownPct'
  | 'maxLossStreak'
  | 'currentLossStreak'
  | 'tradeFrequencyPerWeek'
  | 'averageDurationHours'
  | 'recoveryFactor'
  | 'ulcerIndex'
  | 'downsideDeviationPct'
  | 'sortinoLike'
  | 'equitySlope'
  | 'returnSkewness'
  | 'symbolConcentrationTop1'
  | 'tailLossCvar95'
>

const DEFAULT_HORIZON_TRADES = 20
const DEFAULT_WINDOW_TRADES = 20
const DEFAULT_TOP_MATCHES = 80
const DEFAULT_LIFECYCLE_MATCHES = 48
const MAX_WINDOWS_PER_FILE = 8
const MIN_USER_TRADES = 8
const AUXILIARY_HISTORICAL_FILE = '/data/historical/historical_data.csv'
const AUXILIARY_SOURCE_DISTANCE_MULTIPLIER = 1.18
const AUXILIARY_SOURCE_CONFIDENCE_MULTIPLIER = 0.9
const AUXILIARY_SOURCE_CANDIDATE_MULTIPLIER = 0.88
const AUXILIARY_RETURN_CAP_PCT = 35
const PRIMARY_DURATION_BONUS_MULTIPLIER = 0.94
const PRIMARY_DURATION_PENALTY_MULTIPLIER = 1.08
const AMPLITUDE_SCALE_MIN = 0.35
const AMPLITUDE_SCALE_MAX = 4.5
const FORECAST_REGIMES: ForecastRegime[] = [
  { windowTrades: 20, horizonTrades: 20 },
  { windowTrades: 10, horizonTrades: 10 }
]

const TACTICAL_FEATURE_WEIGHTS: Record<FeatureKey, number> = {
  expectancyPct: 0.8,
  profitFactor: 1.25,
  winRate: 1.0,
  payoffRatio: 1.05,
  averageRiskReward: 0.7,
  volatilityPct: 0.85,
  maxDrawdownPct: 1.25,
  currentDrawdownPct: 1.1,
  recentReturnPct: 0.65,
  recentDrawdownPct: 1.1,
  maxLossStreak: 1.0,
  currentLossStreak: 0.9,
  tradeFrequencyPerWeek: 0.45,
  averageDurationHours: 0.45,
  recoveryFactor: 0.75,
  ulcerIndex: 0.9,
  downsideDeviationPct: 0.95,
  sortinoLike: 0.7,
  equitySlope: 0.75,
  returnSkewness: 0.4,
  symbolConcentrationTop1: 0.35,
  tailLossCvar95: 0.9
}

const LIFECYCLE_FEATURE_WEIGHTS: Record<FeatureKey, number> = {
  expectancyPct: 0.95,
  profitFactor: 1.3,
  winRate: 0.95,
  payoffRatio: 1.1,
  averageRiskReward: 0.75,
  volatilityPct: 0.75,
  maxDrawdownPct: 1.35,
  currentDrawdownPct: 0.3,
  recentReturnPct: 0.25,
  recentDrawdownPct: 0.25,
  maxLossStreak: 0.9,
  currentLossStreak: 0.25,
  tradeFrequencyPerWeek: 0.55,
  averageDurationHours: 0.5,
  recoveryFactor: 0.95,
  ulcerIndex: 1.0,
  downsideDeviationPct: 1.0,
  sortinoLike: 0.85,
  equitySlope: 0.9,
  returnSkewness: 0.4,
  symbolConcentrationTop1: 0.4,
  tailLossCvar95: 0.95
}

let historicalTimelinesPromise: Promise<HistoricalTimeline[]> | null = null
const historicalWindowsPromises = new Map<string, Promise<HistoricalWindow[]>>()
let historicalLifecycleProfilesPromise: Promise<HistoricalLifecycleProfile[]> | null = null

export function calculateCurrentCapital(trades: DiaryEntry[], startingCapital: number) {
  const baseCapital = finitePositive(startingCapital) ? startingCapital : 1000
  const totalProfit = trades
    .filter(isRealizedDiaryTrade)
    .reduce((sum, trade) => sum + readDiaryTradeProfit(trade), 0)
  const capital = baseCapital + totalProfit

  return Number.isFinite(capital) ? capital : baseCapital
}

export function createEmptyProtocolForecast(params?: {
  currentCapital?: number
  horizonTrades?: number
  message?: string
}): ProtocolForecastResult {
  const currentCapital = Number.isFinite(params?.currentCapital) ? Number(params?.currentCapital) : 0
  const horizonTrades = params?.horizonTrades ?? DEFAULT_HORIZON_TRADES

  return emptyForecast({
    currentCapital,
    horizonTrades,
    metrics: createEmptyMetrics(),
    message: params?.message ?? 'Загружаю историческую базу прогноза.'
  })
}

export async function calculateProtocolForecast(input: ProtocolForecastInput): Promise<ProtocolForecastResult> {
  const topMatches = input.topMatches ?? DEFAULT_TOP_MATCHES
  const currentCapital = Number.isFinite(input.currentCapital) ? input.currentCapital : 0
  const userTrades = prepareUserTrades(input.trades, currentCapital)
  const regimes = resolveForecastRegimes(input)
  const minimumRequiredTrades = Math.max(
    MIN_USER_TRADES,
    Math.min(...regimes.map((regime) => regime.windowTrades))
  )
  const largestWindowTrades = Math.max(...regimes.map((regime) => regime.windowTrades))
  const initialHorizonTrades = regimes[0]?.horizonTrades ?? DEFAULT_HORIZON_TRADES
  const initialWindow = userTrades.slice(Math.max(0, userTrades.length - largestWindowTrades))
  const initialMetrics = calculateMetrics(initialWindow)
  const lifecycleFallback = createEmptyLifecycleForecast(currentCapital)

  if (currentCapital <= 0) {
    return emptyForecast({
      currentCapital,
      horizonTrades: initialHorizonTrades,
      metrics: initialMetrics,
      message: 'Текущий капитал меньше или равен нулю, прогноз недоступен.',
      lifecycle: lifecycleFallback
    })
  }

  if (userTrades.length < minimumRequiredTrades) {
    return emptyForecast({
      currentCapital,
      horizonTrades: initialHorizonTrades,
      metrics: initialMetrics,
      message: `Недостаточно закрытых сделок выбранного протокола для сравнения с исторической базой. Нужно хотя бы ${minimumRequiredTrades}.`,
      lifecycle: createEmptyLifecycleForecast(
        currentCapital,
        `Недостаточно закрытых сделок выбранного протокола для lifecycle-анализа. Нужно хотя бы ${minimumRequiredTrades}.`
      )
    })
  }

  const lifecycleForecast = await safeBuildLifecycleForecast(userTrades, currentCapital)
  const candidate = await selectForecastCandidate(userTrades, regimes, topMatches)
  if (!candidate) {
    return emptyForecast({
      currentCapital,
      horizonTrades: initialHorizonTrades,
      metrics: initialMetrics,
      message: 'Историческая база myfxbook/mql4/mql5/historical_data пока не дает подходящего tactical-слоя 20/10 для этого профиля.',
      lifecycle: lifecycleForecast
    })
  }

  try {
    const { regime, userWindow, userMetrics, matches, sourceFilesCount, medianDistance } = candidate
    const matchWeights = buildMatchWeights(matches)
    const amplitudeCalibration = calculateAmplitudeCalibration(userWindow, userMetrics, matches)
    const rawFuturePaths = matches.map((match) => match.window.futureReturnsPath)
    const calibratedFuturePaths = matches.map((match) => reshapeFuturePathForUser(
      match.window.futureReturnsPath,
      userMetrics,
      match.window.features,
      amplitudeCalibration.weight
    ))
    const futureReturns = calibratedFuturePaths.map(compoundReturns)
    const futureCapitals = futureReturns.map((returnPct) => currentCapital * (1 + returnPct / 100))
    const futureDrawdowns = matches.map((match) => calibrateFutureDrawdown(
      match.window.futureMaxDrawdownPct,
      userMetrics,
      match.window.features,
      amplitudeCalibration.weight
    ))
    const basePreview = buildPreviewForecast(currentCapital, rawFuturePaths, 10, matchWeights)
    const preview = buildPreviewForecast(currentCapital, calibratedFuturePaths, 10, matchWeights)
    const auxiliaryMatchShare = percentage(matches.filter((match) => match.window.sourceTier === 'auxiliary').length, matches.length) / 100
    const probabilityProfit = weightedPercentage(futureReturns.map((value) => value > 0), matchWeights)
    const probabilityDrawdownOver10 = weightedPercentage(futureDrawdowns.map((value) => value <= -10), matchWeights)
    const confidenceScore = calculateConfidenceScore({
      userTrades: userWindow.length,
      windowTrades: regime.windowTrades,
      matches: matches.length,
      sourceFiles: sourceFilesCount,
      medianDistance,
      auxiliaryMatchShare
    })

    return {
      status: 'ready',
      confidence: confidenceLabel(confidenceScore),
      confidenceScore,
      message: auxiliaryMatchShare > 0
        ? `Прогноз построен по похожим историческим окнам на слое ${regime.windowTrades}/${regime.horizonTrades}, включая ослабленный execution-source historical_data.csv, с персональной калибровкой амплитуды ${formatSignedPercent(amplitudeCalibration.averageScalePct)}.`
        : `Прогноз построен по похожим историческим окнам на слое ${regime.windowTrades}/${regime.horizonTrades} с персональной калибровкой амплитуды ${formatSignedPercent(amplitudeCalibration.averageScalePct)}.`,
      horizonTrades: regime.horizonTrades,
      currentCapital,
      metrics: userMetrics,
      quantiles: {
        p10: weightedQuantile(futureReturns, matchWeights, 0.1),
        p25: weightedQuantile(futureReturns, matchWeights, 0.25),
        p50: weightedQuantile(futureReturns, matchWeights, 0.5),
        p75: weightedQuantile(futureReturns, matchWeights, 0.75),
        p90: weightedQuantile(futureReturns, matchWeights, 0.9)
      },
      capitalQuantiles: {
        p10: weightedQuantile(futureCapitals, matchWeights, 0.1),
        p25: weightedQuantile(futureCapitals, matchWeights, 0.25),
        p50: weightedQuantile(futureCapitals, matchWeights, 0.5),
        p75: weightedQuantile(futureCapitals, matchWeights, 0.75),
        p90: weightedQuantile(futureCapitals, matchWeights, 0.9)
      },
      previewHorizonTrades: preview.previewHorizonTrades,
      previewQuantiles: preview.previewQuantiles,
      previewCapitalQuantiles: preview.previewCapitalQuantiles,
      previewPeakCapitalQuantiles: preview.previewPeakCapitalQuantiles,
      previewTroughCapitalQuantiles: preview.previewTroughCapitalQuantiles,
      previewPath: preview.previewPath,
      probabilityProfit,
      probabilityDrawdownOver10,
      simulationsCount: matches.length,
      matchesCount: matches.length,
      sourceFilesCount,
      amplitudeCalibrationFactor: amplitudeCalibration.averageScale,
      amplitudeCalibrationWeight: amplitudeCalibration.weight,
      tacticalDiagnostics: buildTacticalDiagnostics({
        userMetrics,
        currentCapital,
        regime,
        amplitudeScaleP50: amplitudeCalibration.averageScale,
        basePreviewQuantiles: basePreview.previewQuantiles,
        scaledPreviewQuantiles: preview.previewQuantiles,
        fullHistoricalShapeP50Pct: weightedQuantile(matches.map((match) => match.window.futureReturnPct), matchWeights, 0.5),
        fullUserScaledP50Pct: weightedQuantile(futureReturns, matchWeights, 0.5)
      }),
      lifecycle: lifecycleForecast
    }
  } catch (error) {
    console.error('[protocolForecast] Tactical forecast failed:', error)
    return emptyForecast({
      currentCapital,
      horizonTrades: candidate.regime.horizonTrades,
      metrics: candidate.userMetrics,
      message: 'Не удалось собрать tactical forecast. Lifecycle Forecast сохранен отдельно.',
      tacticalDiagnostics: createEmptyTacticalDiagnostics(),
      lifecycle: lifecycleForecast
    })
  }
}

function resolveForecastRegimes(input: ProtocolForecastInput): ForecastRegime[] {
  if (Number.isFinite(input.windowTrades) || Number.isFinite(input.horizonTrades)) {
    return [{
      windowTrades: Number.isFinite(input.windowTrades) ? Number(input.windowTrades) : DEFAULT_WINDOW_TRADES,
      horizonTrades: Number.isFinite(input.horizonTrades) ? Number(input.horizonTrades) : DEFAULT_HORIZON_TRADES
    }]
  }

  return FORECAST_REGIMES
}

async function selectForecastCandidate(
  userTrades: PreparedTrade[],
  regimes: ForecastRegime[],
  topMatches: number
): Promise<ForecastCandidate | null> {
  const candidates = await Promise.all(regimes.map((regime) => buildForecastCandidate(userTrades, regime, topMatches)))
  const viableCandidates = candidates.filter((candidate): candidate is ForecastCandidate => Boolean(candidate))

  if (!viableCandidates.length) {
    return null
  }

  viableCandidates.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score
    return right.regime.windowTrades - left.regime.windowTrades
  })

  return viableCandidates[0] ?? null
}

async function buildForecastCandidate(
  userTrades: PreparedTrade[],
  regime: ForecastRegime,
  topMatches: number
): Promise<ForecastCandidate | null> {
  if (userTrades.length < regime.windowTrades || regime.windowTrades < MIN_USER_TRADES) {
    return null
  }

  const userWindow = userTrades.slice(Math.max(0, userTrades.length - regime.windowTrades))
  const userMetrics = calculateMetrics(userWindow)
  const historicalWindows = await loadHistoricalWindows(regime.windowTrades, regime.horizonTrades)

  if (!historicalWindows.length) {
    return null
  }

  const normalizers = buildNormalizers(historicalWindows, TACTICAL_FEATURE_WEIGHTS)
  const matches = selectNearestWindows(userMetrics, historicalWindows, normalizers, topMatches, TACTICAL_FEATURE_WEIGHTS)
  if (!matches.length) {
    return null
  }

  const sourceFilesCount = new Set(matches.map((match) => match.window.sourceFile)).size
  const medianDistance = quantile(matches.map((match) => match.distance), 0.5)
  const auxiliaryMatchShare = percentage(matches.filter((match) => match.window.sourceTier === 'auxiliary').length, matches.length) / 100

  return {
    regime,
    userWindow,
    userMetrics,
    historicalWindows,
    matches,
    sourceFilesCount,
    medianDistance,
    score: calculateCandidateScore({
      regime,
      windowsCount: historicalWindows.length,
      sourceFilesCount,
      matchesCount: matches.length,
      medianDistance,
      auxiliaryMatchShare
    })
  }
}

function prepareUserTrades(trades: DiaryEntry[], currentCapital: number): PreparedTrade[] {
  const realizedTrades = trades
    .filter(isRealizedDiaryTrade)
    .map((trade) => ({
      timestamp: parseDate(trade.dateExit),
      entryTimestamp: parseDate(trade.date),
      asset: String(trade.asset || 'UNKNOWN').toUpperCase(),
      profit: readDiaryTradeProfit(trade),
      riskReward: Number.isFinite(Number(trade.riskReward)) ? Number(trade.riskReward) : calculateRiskReward(trade),
      durationHours: calculateDurationHours(parseDate(trade.date), parseDate(trade.dateExit))
    }))
    .sort((left, right) => left.timestamp - right.timestamp)

  const totalProfit = sum(realizedTrades.map((trade) => trade.profit))
  let equity = finitePositive(currentCapital - totalProfit) ? currentCapital - totalProfit : Math.max(currentCapital, 1)

  return realizedTrades.map((trade) => {
    const baseEquity = equity > 0 ? equity : 0
    equity += trade.profit

    return {
      ...trade,
      returnPct: baseEquity > 0 ? (trade.profit / baseEquity) * 100 : 0
    }
  })
}

async function loadHistoricalWindows(windowTrades: number, horizonTrades: number) {
  const cacheKey = `${windowTrades}:${horizonTrades}`

  if (!historicalWindowsPromises.has(cacheKey)) {
    historicalWindowsPromises.set(cacheKey, buildHistoricalWindows(windowTrades, horizonTrades))
  }

  return historicalWindowsPromises.get(cacheKey) ?? []
}

async function buildHistoricalWindows(windowTrades: number, horizonTrades: number): Promise<HistoricalWindow[]> {
  const timelines = await loadHistoricalTimelines()
  return timelines
    .filter((timeline) => timeline.trades.length >= windowTrades + horizonTrades)
    .flatMap((timeline) => buildWindowsForTimeline(timeline, windowTrades, horizonTrades))
}

async function loadHistoricalTimelines(): Promise<HistoricalTimeline[]> {
  if (typeof fetch !== 'function' || typeof window === 'undefined') {
    return []
  }

  if (!historicalTimelinesPromise) {
    const allHistoricalFiles = [...HISTORICAL_FORECAST_FILES, AUXILIARY_HISTORICAL_FILE]
    historicalTimelinesPromise = Promise.allSettled(
      allHistoricalFiles.map(async (file) => {
        const response = await fetch(encodeURI(file))
        if (!response.ok) {
          return null
        }

        return parseHistoricalTimeline(await response.text(), file)
      })
    ).then((settled) => settled
      .filter((result): result is PromiseFulfilledResult<HistoricalTimeline | null> => result.status === 'fulfilled')
      .map((result) => result.value)
      .filter((timeline): timeline is HistoricalTimeline => Boolean(timeline)))
  }

  return historicalTimelinesPromise
}

function buildWindowsForTimeline(
  timeline: HistoricalTimeline,
  windowTrades: number,
  horizonTrades: number
): HistoricalWindow[] {
  const windows: HistoricalWindow[] = []
  const step = Math.max(1, Math.floor(windowTrades / 3))

  for (let start = 0; start + windowTrades + horizonTrades <= timeline.trades.length; start += step) {
    const window = timeline.trades.slice(start, start + windowTrades)
    const future = timeline.trades.slice(start + windowTrades, start + windowTrades + horizonTrades)

    windows.push({
      sourceFile: timeline.sourceFile,
      sourceTier: timeline.sourceTier,
      features: calculateMetrics(window),
      futureReturnPct: compoundReturns(future.map((trade) => trade.returnPct)),
      futureMaxDrawdownPct: maxDrawdownFromReturns(future.map((trade) => trade.returnPct)),
      futureReturnsPath: future.map((trade) => trade.returnPct)
    })
  }

  return windows
}

function parseHistoricalTimeline(csvText: string, file: string): HistoricalTimeline | null {
  if (file === AUXILIARY_HISTORICAL_FILE) {
    return parseAuxiliaryHistoricalTimeline(csvText, file)
  }

  const lines = getStatementLines(csvText)
  if (lines.length < 2) {
    return null
  }

  const sourceKind = file.startsWith('/data/mql5/')
    ? 'mql5'
    : file.startsWith('/data/mql4/')
      ? 'mql4'
      : 'myfxbook'
  const delimiter = sourceKind === 'myfxbook' ? ',' : ';'
  const header = splitCsvLine(lines[0] || '', delimiter).map((value) => value.replace(/^\uFEFF/, '').trim())
  const headerMap = new Map<string, number>()
  header.forEach((name, index) => headerMap.set(name, index))

  const rows = sourceKind === 'myfxbook'
    ? parseMyfxbookRows(lines, delimiter, headerMap)
    : parseMqlRows(lines, delimiter, headerMap, sourceKind)

  const trades = rowsToPreparedTrades(rows)
  return trades.length ? { sourceFile: file, sourceTier: 'primary', trades } : null
}

function parseAuxiliaryHistoricalTimeline(csvText: string, file: string): HistoricalTimeline | null {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) {
    return null
  }

  const header = splitCsvLine(lines[0] || '', ',').map((value) => value.replace(/^\uFEFF/, '').trim())
  const headerMap = new Map<string, number>()
  header.forEach((name, index) => headerMap.set(name, index))

  const coinIndex = headerMap.get('Coin') ?? -1
  const pnlIndex = headerMap.get('Closed PnL') ?? -1
  const sizeUsdIndex = headerMap.get('Size USD') ?? -1
  const timestampIstIndex = headerMap.get('Timestamp IST') ?? -1
  const directionIndex = headerMap.get('Direction') ?? -1

  if (coinIndex === -1 || pnlIndex === -1 || sizeUsdIndex === -1 || timestampIstIndex === -1) {
    return null
  }

  const trades = lines.slice(1).flatMap((line): PreparedTrade[] => {
    const cells = splitCsvLine(line, ',')
    const profit = parseNumber(cells[pnlIndex] ?? '0')
    if (!Number.isFinite(profit) || profit === 0) return []

    const sizeUsd = Math.abs(parseNumber(cells[sizeUsdIndex] ?? '0'))
    if (!(sizeUsd > 0)) return []

    const timestamp = parseDayMonthTimestamp(cells[timestampIstIndex] ?? '')
    if (!Number.isFinite(timestamp)) return []

    const asset = String(cells[coinIndex] ?? 'UNKNOWN').trim().toUpperCase()
    const direction = String(cells[directionIndex] ?? '').trim().toLowerCase()
    if (direction.includes('conversion') || direction.includes('deleveraging')) return []

    const returnPct = clamp((profit / sizeUsd) * 100, -AUXILIARY_RETURN_CAP_PCT, AUXILIARY_RETURN_CAP_PCT)

    return [{
      timestamp,
      entryTimestamp: timestamp,
      asset: asset || 'UNKNOWN',
      profit,
      returnPct,
      durationHours: 0,
      riskReward: null
    }]
  })

  trades.sort((left, right) => left.timestamp - right.timestamp)
  return trades.length ? { sourceFile: file, sourceTier: 'auxiliary', trades } : null
}

function parseMyfxbookRows(lines: string[], delimiter: string, headerMap: Map<string, number>): ParsedStatementRow[] {
  const actionIndex = headerMap.get('Action') ?? -1
  const symbolIndex = headerMap.get('Symbol') ?? -1
  const profitIndex = headerMap.get('Profit') ?? -1
  const riskRewardIndex = headerMap.get('Risk:Reward') ?? -1
  const durationIndex = headerMap.get('Duration (DD:HH:MM:SS)') ?? -1
  const openDateIndex = headerMap.get('Open Date') ?? -1
  const closeDateIndex = headerMap.get('Close Date') ?? -1

  if (actionIndex === -1 || profitIndex === -1) {
    return []
  }

  return lines.slice(1).flatMap((line, offset): ParsedStatementRow[] => {
    if (!line.trim()) return []
    const cells = splitCsvLine(line, delimiter)
    const action = (cells[actionIndex] ?? '').trim()
    const symbol = symbolIndex >= 0 ? (cells[symbolIndex] ?? '').trim() : ''
    const closeDate = closeDateIndex >= 0 ? (cells[closeDateIndex] ?? '').trim() : ''
    const openDate = openDateIndex >= 0 ? (cells[openDateIndex] ?? '').trim() : ''
    const isCashFlow = isCashFlowAction(action)

    if (symbol.toUpperCase() === 'SUMMAR') return []
    if (!isCashFlow && !closeDate) return []

    const timestamp = parseMyfxbookTimestamp(closeDate || openDate)
    if (!Number.isFinite(timestamp)) return []

    const riskRewardRaw = riskRewardIndex >= 0 ? String(cells[riskRewardIndex] ?? '').trim() : ''

    return [{
      originalIndex: offset + 1,
      timestamp,
      entryTimestamp: parseMyfxbookTimestamp(openDate),
      action,
      symbol,
      profit: parseNumber(cells[profitIndex] ?? '0'),
      kind: isCashFlow ? 'cashflow' : 'trade',
      riskReward: riskRewardRaw ? parseNumber(riskRewardRaw) : null,
      durationHours: durationIndex >= 0 ? parseDurationToHours(cells[durationIndex] ?? '') : 0
    }]
  })
}

function parseMqlRows(
  lines: string[],
  delimiter: string,
  headerMap: Map<string, number>,
  sourceKind: 'mql4' | 'mql5'
): ParsedStatementRow[] {
  const typeIndex = headerMap.get('Type') ?? 1
  const symbolIndex = headerMap.get('Symbol') ?? 3
  const profitIndex = headerMap.get('Profit') ?? (sourceKind === 'mql5' ? 10 : 11)
  const closeTimeIndex = sourceKind === 'mql5' ? 6 : 7
  const commentIndex = headerMap.get('Comment') ?? -1

  return lines.slice(1).flatMap((line, offset): ParsedStatementRow[] => {
    if (!line.trim()) return []
    const cells = splitCsvLine(line, delimiter)
    const action = (cells[typeIndex] ?? '').trim()
    if (!action) return []

    const comment = commentIndex >= 0 ? (cells[commentIndex] ?? '').trim() : ''
    if (comment.toLowerCase().includes('cancel')) return []

    const isCashFlow = action.toLowerCase() === 'balance'
    const symbol = symbolIndex >= 0 ? (cells[symbolIndex] ?? '').trim() : ''
    const openTime = (cells[0] ?? '').trim()
    const closeTime = (cells[closeTimeIndex] ?? '').trim()
    const isTradeAction = action.toLowerCase() === 'buy' || action.toLowerCase() === 'sell'

    if (!isCashFlow && (!isTradeAction || symbol.toLowerCase() === 'archived')) return []
    if (!isCashFlow && !closeTime) return []

    const timestamp = parseMqlTimestamp(isCashFlow ? openTime : closeTime)
    if (!Number.isFinite(timestamp)) return []

    return [{
      originalIndex: offset + 1,
      timestamp,
      entryTimestamp: parseMqlTimestamp(openTime),
      action,
      symbol,
      profit: parseNumber(cells[profitIndex] ?? '0'),
      kind: isCashFlow ? 'cashflow' : 'trade',
      riskReward: null,
      durationHours: calculateDurationHours(parseMqlTimestamp(openTime), timestamp)
    }]
  })
}

function rowsToPreparedTrades(rows: ParsedStatementRow[]): PreparedTrade[] {
  const timelineRows = rows.slice().sort((left, right) => {
    if (left.timestamp !== right.timestamp) return left.timestamp - right.timestamp
    return left.originalIndex - right.originalIndex
  })
  const leadingCashflowCount = countLeadingCashflows(timelineRows)
  const initialCapital = timelineRows
    .slice(0, leadingCashflowCount)
    .reduce((total, row) => total + row.profit, 0)

  let equity = finitePositive(initialCapital) ? initialCapital : 1000
  const trades: PreparedTrade[] = []

  for (const row of timelineRows.slice(leadingCashflowCount)) {
    const baseEquity = equity > 0 ? equity : 0
    equity += row.profit

    if (row.kind !== 'trade') {
      continue
    }

    if (baseEquity <= 0) {
      continue
    }

    trades.push({
      timestamp: row.timestamp,
      entryTimestamp: row.entryTimestamp,
      asset: row.symbol || 'UNKNOWN',
      profit: row.profit,
      returnPct: (row.profit / baseEquity) * 100,
      durationHours: row.durationHours,
      riskReward: row.riskReward
    })
  }

  return trades
}

function calculateMetrics(trades: PreparedTrade[]): ProtocolForecastMetrics {
  const returns = trades.map((trade) => trade.returnPct).filter(Number.isFinite)
  const absoluteReturns = returns.map((value) => Math.abs(value))
  const profits = trades.map((trade) => trade.profit)
  const winningProfits = profits.filter((profit) => profit > 0)
  const losingProfits = profits.filter((profit) => profit < 0)
  const positiveReturns = returns.filter((value) => value > 0)
  const negativeReturnsAbs = returns.filter((value) => value < 0).map((value) => Math.abs(value))
  const grossProfit = sum(winningProfits)
  const grossLoss = Math.abs(sum(losingProfits))
  const averageWin = average(winningProfits)
  const averageLoss = Math.abs(average(losingProfits))
  const equityValues = buildRelativeEquity(returns)
  const recentReturns = returns.slice(Math.max(0, returns.length - 30))
  const recentEquityValues = buildRelativeEquity(recentReturns)
  const rrValues = trades
    .map((trade) => trade.riskReward)
    .filter((value): value is number => value !== null && Number.isFinite(value) && value > 0)

  return {
    tradeCount: trades.length,
    winRate: percentage(winningProfits.length, trades.length),
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    expectancyPct: average(returns),
    averageAbsReturnPct: average(absoluteReturns),
    medianAbsReturnPct: quantile(absoluteReturns, 0.5),
    averagePositiveReturnPct: average(positiveReturns),
    averageNegativeReturnPctAbs: average(negativeReturnsAbs),
    payoffRatio: averageLoss > 0 ? averageWin / averageLoss : averageWin > 0 ? Infinity : 0,
    averageRiskReward: rrValues.length ? average(rrValues) : null,
    volatilityPct: standardDeviation(returns),
    maxDrawdownPct: calculateMaxDrawdownPct(equityValues),
    currentDrawdownPct: calculateCurrentDrawdownPct(equityValues),
    recentReturnPct: compoundReturns(recentReturns),
    recentDrawdownPct: calculateMaxDrawdownPct(recentEquityValues),
    maxLossStreak: calculateMaxLossStreak(profits),
    currentLossStreak: calculateCurrentLossStreak(profits),
    tradeFrequencyPerWeek: calculateTradeFrequencyPerWeek(trades),
    averageDurationHours: average(trades.map((trade) => trade.durationHours).filter(Number.isFinite)),
    recoveryFactor: Math.abs(calculateMaxDrawdownPct(equityValues)) > 0
      ? compoundReturns(returns) / Math.abs(calculateMaxDrawdownPct(equityValues))
      : 0,
    ulcerIndex: calculateUlcerIndex(equityValues),
    downsideDeviationPct: downsideDeviation(returns),
    sortinoLike: downsideDeviation(returns) > 0 ? average(returns) / downsideDeviation(returns) : 0,
    equitySlope: calculateSlope(equityValues),
    returnSkewness: skewness(returns),
    symbolConcentrationTop1: calculateSymbolConcentration(trades),
    tailLossCvar95: calculateTailLossCvar95(returns)
  }
}

function calculateAmplitudeCalibration(
  userWindow: PreparedTrade[],
  userMetrics: ProtocolForecastMetrics,
  matches: Array<{ window: HistoricalWindow; distance: number }>
) {
  const userReturns = userWindow
    .map((trade) => Math.abs(trade.returnPct))
    .filter(Number.isFinite)
  const userAmplitudePct = readAmplitudeMetric(userMetrics)
  const userAmplitudeIqr = userReturns.length
    ? quantile(userReturns, 0.75) - quantile(userReturns, 0.25)
    : 0
  const sampleWeight = clamp((userWindow.length - 8) / 22, 0, 1)
  const stabilityWeight = clamp(1 - userAmplitudeIqr / Math.max(userAmplitudePct * 2.5, 0.25), 0, 1)
  const weight = clamp(sampleWeight * 0.65 + stabilityWeight * 0.35, 0, 0.92)

  const matchWeights = buildMatchWeights(matches)
  const scales = matches
    .map((match) => calculateBlendedAmplitudeScale(userAmplitudePct, readAmplitudeMetric(match.window.features), weight))
  const averageScale = weightedAverage(scales, matchWeights, 1)

  return {
    userAmplitudePct,
    weight,
    averageScale,
    averageScalePct: (averageScale - 1) * 100
  }
}

function readAmplitudeMetric(metrics: ProtocolForecastMetrics) {
  const medianAbs = finitePositive(metrics.medianAbsReturnPct) ? metrics.medianAbsReturnPct : 0
  const averageAbs = finitePositive(metrics.averageAbsReturnPct) ? metrics.averageAbsReturnPct : 0
  const volatility = finitePositive(metrics.volatilityPct) ? metrics.volatilityPct : 0
  const amplitude = medianAbs * 0.5 + averageAbs * 0.35 + volatility * 0.15
  return amplitude > 0 ? amplitude : Math.max(averageAbs, medianAbs, volatility, 0.01)
}

function calculateBlendedAmplitudeScale(userAmplitudePct: number, historicalAmplitudePct: number, weight: number) {
  if (!(userAmplitudePct > 0) || !(historicalAmplitudePct > 0)) {
    return 1
  }

  const rawScale = clamp(userAmplitudePct / historicalAmplitudePct, AMPLITUDE_SCALE_MIN, AMPLITUDE_SCALE_MAX)
  return 1 + (rawScale - 1) * weight
}

function reshapeFuturePathForUser(
  futureReturnsPath: number[],
  userMetrics: ProtocolForecastMetrics,
  historicalMetrics: ProtocolForecastMetrics,
  weight: number
) {
  const positiveScale = calculateBlendedAmplitudeScale(
    userMetrics.averagePositiveReturnPct,
    historicalMetrics.averagePositiveReturnPct,
    weight
  )
  const negativeScale = calculateBlendedAmplitudeScale(
    userMetrics.averageNegativeReturnPctAbs,
    historicalMetrics.averageNegativeReturnPctAbs,
    weight
  )
  const volatilityScale = calculateBlendedAmplitudeScale(
    Math.max(userMetrics.volatilityPct, userMetrics.averageAbsReturnPct),
    Math.max(historicalMetrics.volatilityPct, historicalMetrics.averageAbsReturnPct),
    weight * 0.4
  )

  return futureReturnsPath.map((returnPct) => {
    if (returnPct > 0) {
      return returnPct * positiveScale * volatilityScale
    }
    if (returnPct < 0) {
      return returnPct * negativeScale * volatilityScale
    }
    return 0
  })
}

function calibrateFutureDrawdown(
  futureDrawdownPct: number,
  userMetrics: ProtocolForecastMetrics,
  historicalMetrics: ProtocolForecastMetrics,
  weight: number
) {
  if (futureDrawdownPct >= 0) {
    return futureDrawdownPct
  }

  const drawdownScale = calculateBlendedAmplitudeScale(
    Math.max(Math.abs(userMetrics.maxDrawdownPct), userMetrics.averageNegativeReturnPctAbs),
    Math.max(Math.abs(historicalMetrics.maxDrawdownPct), historicalMetrics.averageNegativeReturnPctAbs),
    weight
  )
  return futureDrawdownPct * drawdownScale
}

function buildPreviewForecast(
  currentCapital: number,
  calibratedFuturePaths: number[][],
  requestedHorizonTrades: number,
  weights?: number[]
) {
  const previewHorizonTrades = Math.max(1, Math.min(
    requestedHorizonTrades,
    ...calibratedFuturePaths.map((path) => path.length).filter((length) => length > 0)
  ))

  const previewReturns = calibratedFuturePaths.map((path) => compoundReturns(path.slice(0, previewHorizonTrades)))
  const previewCapitals = previewReturns.map((returnPct) => currentCapital * (1 + returnPct / 100))
  const previewCapitalPaths = calibratedFuturePaths.map((path) =>
    buildCapitalPathFromReturns(currentCapital, path.slice(0, previewHorizonTrades))
  )

  const previewPath = Array.from({ length: previewHorizonTrades }, (_, index) => {
    const capitalValues = previewCapitalPaths
      .map((path) => path[index + 1] ?? currentCapital)
      .filter(Number.isFinite)

    return {
      tradeIndex: index + 1,
      capital: {
        p10: weightedQuantile(capitalValues, weights, 0.1),
        p25: weightedQuantile(capitalValues, weights, 0.25),
        p50: weightedQuantile(capitalValues, weights, 0.5),
        p75: weightedQuantile(capitalValues, weights, 0.75),
        p90: weightedQuantile(capitalValues, weights, 0.9)
      }
    }
  })

  const peakCapitals = previewCapitalPaths.map((path) => Math.max(...path))
  const troughCapitals = previewCapitalPaths.map((path) => Math.min(...path))

  return {
    previewHorizonTrades,
    previewQuantiles: {
      p10: weightedQuantile(previewReturns, weights, 0.1),
      p25: weightedQuantile(previewReturns, weights, 0.25),
      p50: weightedQuantile(previewReturns, weights, 0.5),
      p75: weightedQuantile(previewReturns, weights, 0.75),
      p90: weightedQuantile(previewReturns, weights, 0.9)
    },
    previewCapitalQuantiles: {
      p10: weightedQuantile(previewCapitals, weights, 0.1),
      p25: weightedQuantile(previewCapitals, weights, 0.25),
      p50: weightedQuantile(previewCapitals, weights, 0.5),
      p75: weightedQuantile(previewCapitals, weights, 0.75),
      p90: weightedQuantile(previewCapitals, weights, 0.9)
    },
    previewPeakCapitalQuantiles: {
      p10: weightedQuantile(peakCapitals, weights, 0.1),
      p50: weightedQuantile(peakCapitals, weights, 0.5),
      p90: weightedQuantile(peakCapitals, weights, 0.9)
    },
    previewTroughCapitalQuantiles: {
      p10: weightedQuantile(troughCapitals, weights, 0.1),
      p50: weightedQuantile(troughCapitals, weights, 0.5),
      p90: weightedQuantile(troughCapitals, weights, 0.9)
    },
    previewPath
  }
}

async function buildLifecycleForecast(userTrades: PreparedTrade[], currentCapital: number): Promise<LifecycleForecastResult> {
  const profiles = await loadHistoricalLifecycleProfiles()
  if (!profiles.length) {
    return createEmptyLifecycleForecast(currentCapital, 'Историческая база myfxbook/mql4/mql5 пока не дает lifecycle-профилей.')
  }

  const userMetrics = calculateMetrics(userTrades)
  const normalizers = buildLifecycleNormalizers(profiles)
  const matches = selectNearestLifecycleProfiles(userMetrics, profiles, normalizers, DEFAULT_LIFECYCLE_MATCHES)
  if (!matches.length) {
    return createEmptyLifecycleForecast(currentCapital, 'Не найдено похожих полных lifecycle-профилей в базе myfxbook/mql4/mql5.')
  }

  const weights = buildMatchWeights(matches)
  const baseReturns = matches.map((match) => match.profile.totalReturnPct)
  const adjustedReturns = matches.map((match) => {
    const strength = calculateLifecycleStrength(userMetrics, match.profile.features)
    return adjustSignedOutcome(match.profile.totalReturnPct, strength)
  })
  const adjustedCapitals = adjustedReturns.map((returnPct) => currentCapital * (1 + returnPct / 100))
  const adjustedDrawdowns = matches.map((match) =>
    adjustLifecycleDrawdown(match.profile.maxDrawdownPct, userMetrics, match.profile.features)
  )
  const sourceFilesCount = new Set(matches.map((match) => match.profile.sourceFile)).size
  const medianDistance = weightedQuantile(matches.map((match) => match.distance), weights, 0.5)
  const confidenceScore = calculateConfidenceScore({
    userTrades: userTrades.length,
    windowTrades: Math.max(userTrades.length, MIN_USER_TRADES),
    matches: matches.length,
    sourceFiles: sourceFilesCount,
    medianDistance,
    auxiliaryMatchShare: percentage(matches.filter((match) => match.profile.sourceTier === 'auxiliary').length, matches.length) / 100
  })
  const strengthFactors = matches.map((match) => calculateLifecycleStrength(userMetrics, match.profile.features))

  return {
    status: 'ready',
    confidence: confidenceLabel(confidenceScore),
    confidenceScore,
    message: 'Lifecycle Forecast использует полные результаты похожих файлов myfxbook/mql4/mql5 и масштабирует итог под профиль пользователя.',
    quantiles: {
      p10: weightedQuantile(adjustedReturns, weights, 0.1),
      p25: weightedQuantile(adjustedReturns, weights, 0.25),
      p50: weightedQuantile(adjustedReturns, weights, 0.5),
      p75: weightedQuantile(adjustedReturns, weights, 0.75),
      p90: weightedQuantile(adjustedReturns, weights, 0.9)
    },
    capitalQuantiles: {
      p10: weightedQuantile(adjustedCapitals, weights, 0.1),
      p25: weightedQuantile(adjustedCapitals, weights, 0.25),
      p50: weightedQuantile(adjustedCapitals, weights, 0.5),
      p75: weightedQuantile(adjustedCapitals, weights, 0.75),
      p90: weightedQuantile(adjustedCapitals, weights, 0.9)
    },
    probabilityProfit: weightedPercentage(adjustedReturns.map((value) => value > 0), weights),
    probabilityDrawdownOver10: weightedPercentage(adjustedDrawdowns.map((value) => value <= -10), weights),
    matchesCount: matches.length,
    sourceFilesCount,
    medianTradeCount: weightedQuantile(matches.map((match) => match.profile.tradeCount), weights, 0.5),
    medianDurationDays: weightedQuantile(matches.map((match) => match.profile.durationDays), weights, 0.5),
    medianMaxDrawdownPct: weightedQuantile(adjustedDrawdowns, weights, 0.5),
    strengthFactorP50: weightedQuantile(strengthFactors, weights, 0.5),
    baseQuantiles: {
      p10: weightedQuantile(baseReturns, weights, 0.1),
      p25: weightedQuantile(baseReturns, weights, 0.25),
      p50: weightedQuantile(baseReturns, weights, 0.5),
      p75: weightedQuantile(baseReturns, weights, 0.75),
      p90: weightedQuantile(baseReturns, weights, 0.9)
    }
  }
}

async function safeBuildLifecycleForecast(userTrades: PreparedTrade[], currentCapital: number) {
  try {
    return await buildLifecycleForecast(userTrades, currentCapital)
  } catch (error) {
    console.error('[protocolForecast] Lifecycle forecast failed:', error)
    const errorMessage = error instanceof Error && error.message
      ? error.message
      : 'unknown lifecycle error'
    return createEmptyLifecycleForecast(currentCapital, `Не удалось собрать lifecycle forecast по myfxbook/mql4/mql5 cycles: ${errorMessage}`)
  }
}

async function loadHistoricalLifecycleProfiles(): Promise<HistoricalLifecycleProfile[]> {
  if (!historicalLifecycleProfilesPromise) {
    historicalLifecycleProfilesPromise = loadHistoricalTimelines().then((timelines) => timelines
      .filter((timeline) => timeline.sourceTier === 'primary')
      .filter((timeline) => timeline.trades.length >= MIN_USER_TRADES)
      .map((timeline): HistoricalLifecycleProfile => {
        const totalReturnPct = compoundReturns(timeline.trades.map((trade) => trade.returnPct))
        const maxDrawdownPct = maxDrawdownFromReturns(timeline.trades.map((trade) => trade.returnPct))
        const firstTimestamp = timeline.trades[0]?.entryTimestamp ?? timeline.trades[0]?.timestamp ?? 0
        const lastTimestamp = lastItem(timeline.trades)?.timestamp ?? firstTimestamp
        const durationDays = Math.max((lastTimestamp - firstTimestamp) / 86400000, 1)

        return {
          sourceFile: timeline.sourceFile,
          sourceTier: timeline.sourceTier,
          features: calculateMetrics(timeline.trades),
          totalReturnPct,
          maxDrawdownPct,
          tradeCount: timeline.trades.length,
          durationDays
        }
      })
      .filter((profile) =>
        Number.isFinite(profile.totalReturnPct) &&
        Number.isFinite(profile.maxDrawdownPct) &&
        Number.isFinite(profile.tradeCount) &&
        Number.isFinite(profile.durationDays)
      ))
  }

  return historicalLifecycleProfilesPromise
}

function buildLifecycleNormalizers(profiles: HistoricalLifecycleProfile[]): Normalizer[] {
  return featureKeys(LIFECYCLE_FEATURE_WEIGHTS).map((key) => {
    const values = profiles
      .map((profile) => readFeature(profile.features, key))
      .filter(Number.isFinite)

    return {
      key,
      median: quantile(values, 0.5),
      iqr: Math.max(quantile(values, 0.75) - quantile(values, 0.25), 0.0001)
    }
  })
}

function selectNearestLifecycleProfiles(
  userMetrics: ProtocolForecastMetrics,
  profiles: HistoricalLifecycleProfile[],
  normalizers: Normalizer[],
  topMatches: number
) {
  return profiles
    .map((profile) => ({
      profile,
      distance: calculateMetricsDistance(userMetrics, profile.features, profile.sourceTier, normalizers, LIFECYCLE_FEATURE_WEIGHTS)
    }))
    .filter((match) => Number.isFinite(match.distance))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, topMatches)
}

function calculateLifecycleStrength(userMetrics: ProtocolForecastMetrics, historicalMetrics: ProtocolForecastMetrics) {
  const amplitudeScale = calculateBlendedAmplitudeScale(
    readAmplitudeMetric(userMetrics),
    readAmplitudeMetric(historicalMetrics),
    0.82
  )
  const profitFactorDelta = boundedMetricDelta(logLikeMetric(userMetrics.profitFactor), logLikeMetric(historicalMetrics.profitFactor), 0.4)
  const winRateDelta = boundedMetricDelta(userMetrics.winRate, historicalMetrics.winRate, 12)
  const payoffDelta = boundedMetricDelta(logLikeMetric(userMetrics.payoffRatio), logLikeMetric(historicalMetrics.payoffRatio), 0.35)
  const expectancyDelta = boundedMetricDelta(userMetrics.expectancyPct, historicalMetrics.expectancyPct, 2)
  const drawdownDelta = boundedMetricDelta(Math.abs(historicalMetrics.maxDrawdownPct), Math.abs(userMetrics.maxDrawdownPct), 12)
  const sortinoDelta = boundedMetricDelta(userMetrics.sortinoLike, historicalMetrics.sortinoLike, 0.75)
  const qualityBias = profitFactorDelta * 0.25 +
    winRateDelta * 0.15 +
    payoffDelta * 0.15 +
    expectancyDelta * 0.15 +
    drawdownDelta * 0.2 +
    sortinoDelta * 0.1
  const qualityScale = clamp(1 + qualityBias * 0.35, 0.72, 1.42)

  return clamp(qualityScale * (1 + (amplitudeScale - 1) * 0.55), 0.55, 2.4)
}

function adjustSignedOutcome(baseReturnPct: number, strength: number) {
  if (!Number.isFinite(baseReturnPct) || !Number.isFinite(strength) || strength <= 0) {
    return baseReturnPct
  }

  if (baseReturnPct >= 0) {
    return baseReturnPct * strength
  }

  return baseReturnPct / strength
}

function adjustLifecycleDrawdown(
  baseDrawdownPct: number,
  userMetrics: ProtocolForecastMetrics,
  historicalMetrics: ProtocolForecastMetrics
) {
  if (!(baseDrawdownPct < 0)) {
    return baseDrawdownPct
  }

  const amplitudeDelta = boundedMetricDelta(readAmplitudeMetric(userMetrics), readAmplitudeMetric(historicalMetrics), Math.max(readAmplitudeMetric(historicalMetrics), 0.75))
  const drawdownDelta = boundedMetricDelta(Math.abs(userMetrics.maxDrawdownPct), Math.abs(historicalMetrics.maxDrawdownPct), 10)
  const scale = clamp(1 + amplitudeDelta * 0.35 + drawdownDelta * 0.3, 0.65, 2.3)
  return baseDrawdownPct * scale
}

function buildTacticalDiagnostics(params: {
  userMetrics: ProtocolForecastMetrics
  currentCapital: number
  regime: ForecastRegime
  amplitudeScaleP50: number
  basePreviewQuantiles: ProtocolForecastResult['previewQuantiles']
  scaledPreviewQuantiles: ProtocolForecastResult['previewQuantiles']
  fullHistoricalShapeP50Pct: number
  fullUserScaledP50Pct: number
}): TacticalForecastDiagnostics {
  const makePeriod = (horizonTrades: number, historicalShapeP50Pct: number, userScaledP50Pct: number) => ({
    horizonTrades,
    userLinearEstimatePct: compoundReturns(Array.from({ length: horizonTrades }, () => params.userMetrics.expectancyPct)),
    historicalShapeP50Pct,
    userScaledP50Pct
  })

  const periods = [
    makePeriod(10, params.basePreviewQuantiles.p50, params.scaledPreviewQuantiles.p50)
  ]

  if (params.regime.horizonTrades !== 10) {
    periods.push(makePeriod(params.regime.horizonTrades, params.fullHistoricalShapeP50Pct, params.fullUserScaledP50Pct))
  }

  return {
    userPerTradeExpectancyPct: params.userMetrics.expectancyPct,
    userPerTradeExpectancyUsd: params.currentCapital * (params.userMetrics.expectancyPct / 100),
    userAverageWinPct: params.userMetrics.averagePositiveReturnPct,
    userAverageLossPctAbs: params.userMetrics.averageNegativeReturnPctAbs,
    amplitudeScaleP50: params.amplitudeScaleP50,
    historicalShapePreviewQuantiles: params.basePreviewQuantiles,
    periods
  }
}

function boundedMetricDelta(userValue: number, historicalValue: number, scale: number) {
  if (!Number.isFinite(userValue) || !Number.isFinite(historicalValue) || !(scale > 0)) {
    return 0
  }

  return clamp((userValue - historicalValue) / scale, -1, 1)
}

function logLikeMetric(value: number) {
  if (value === Number.POSITIVE_INFINITY) {
    return Math.log1p(10)
  }

  if (!Number.isFinite(value) || value <= 0) {
    return 0
  }

  return Math.log1p(value)
}

function createEmptyLifecycleForecast(currentCapital: number, message = 'Lifecycle Forecast пока недоступен.') : LifecycleForecastResult {
  return {
    status: 'insufficient-data',
    confidence: 'low',
    confidenceScore: 0,
    message,
    quantiles: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 },
    capitalQuantiles: {
      p10: currentCapital,
      p25: currentCapital,
      p50: currentCapital,
      p75: currentCapital,
      p90: currentCapital
    },
    probabilityProfit: 0,
    probabilityDrawdownOver10: 0,
    matchesCount: 0,
    sourceFilesCount: 0,
    medianTradeCount: 0,
    medianDurationDays: 0,
    medianMaxDrawdownPct: 0,
    strengthFactorP50: 1,
    baseQuantiles: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 }
  }
}

function createEmptyTacticalDiagnostics(): TacticalForecastDiagnostics {
  return {
    userPerTradeExpectancyPct: 0,
    userPerTradeExpectancyUsd: 0,
    userAverageWinPct: 0,
    userAverageLossPctAbs: 0,
    amplitudeScaleP50: 1,
    historicalShapePreviewQuantiles: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 },
    periods: []
  }
}

function buildMatchWeights(matches: Array<{ distance: number }>) {
  if (!matches.length) return []

  const distanceScale = Math.max(quantile(matches.map((match) => match.distance), 0.35), 0.2)
  const rawWeights = matches.map((match, index) => {
    const distance = Number.isFinite(match.distance) ? match.distance : distanceScale * 4
    const closenessWeight = Math.exp(-Math.pow(distance / distanceScale, 2))
    const rankWeight = 1 / Math.sqrt(index + 1)
    return Math.max(closenessWeight * rankWeight, 0.000001)
  })

  const total = sum(rawWeights)
  if (!(total > 0)) {
    return matches.map(() => 1 / matches.length)
  }

  return rawWeights.map((weight) => weight / total)
}

function buildNormalizers(windows: HistoricalWindow[], weights: Record<FeatureKey, number>): Normalizer[] {
  return featureKeys(weights).map((key) => {
    const values = windows
      .map((window) => readFeature(window.features, key))
      .filter(Number.isFinite)

    return {
      key,
      median: quantile(values, 0.5),
      iqr: Math.max(quantile(values, 0.75) - quantile(values, 0.25), 0.0001)
    }
  })
}

function selectNearestWindows(
  userMetrics: ProtocolForecastMetrics,
  windows: HistoricalWindow[],
  normalizers: Normalizer[],
  topMatches: number,
  weights: Record<FeatureKey, number>
) {
  const ranked = windows
    .map((window) => ({
      window,
      distance: calculateDistance(userMetrics, window, normalizers, weights)
    }))
    .filter((match) => Number.isFinite(match.distance))
    .sort((left, right) => left.distance - right.distance)

  const perFileCount = new Map<string, number>()
  const selected: typeof ranked = []

  for (const match of ranked) {
    const currentCount = perFileCount.get(match.window.sourceFile) ?? 0
    if (currentCount >= MAX_WINDOWS_PER_FILE) {
      continue
    }

    selected.push(match)
    perFileCount.set(match.window.sourceFile, currentCount + 1)

    if (selected.length >= topMatches) {
      break
    }
  }

  return selected
}

function calculateDistance(
  userMetrics: ProtocolForecastMetrics,
  window: HistoricalWindow,
  normalizers: Normalizer[],
  weights: Record<FeatureKey, number>
) {
  return calculateMetricsDistance(userMetrics, window.features, window.sourceTier, normalizers, weights, userMetrics.averageDurationHours)
}

function calculateMetricsDistance(
  userMetrics: ProtocolForecastMetrics,
  targetMetrics: ProtocolForecastMetrics,
  sourceTier: HistoricalSourceTier,
  normalizers: Normalizer[],
  weights: Record<FeatureKey, number>,
  userDurationHours = userMetrics.averageDurationHours
) {
  let weightedSum = 0
  let weightSum = 0

  for (const normalizer of normalizers) {
    const key = normalizer.key
    if (key === 'averageDurationHours' && sourceTier === 'auxiliary') {
      continue
    }

    const userValue = readFeature(userMetrics, key)
    const windowValue = readFeature(targetMetrics, key)

    if (!Number.isFinite(userValue) || !Number.isFinite(windowValue)) {
      continue
    }

    const weight = weights[key]
    const diff = clamp((userValue - windowValue) / normalizer.iqr, -5, 5)
    weightedSum += weight * diff * diff
    weightSum += weight
  }

  if (weightSum <= 0) {
    return Number.POSITIVE_INFINITY
  }

  const distance = Math.sqrt(weightedSum / weightSum)
  if (sourceTier === 'auxiliary') {
    return distance * AUXILIARY_SOURCE_DISTANCE_MULTIPLIER
  }

  return distance * calculatePrimaryDurationMultiplier(userDurationHours, targetMetrics.averageDurationHours)
}

function readFeature(metrics: ProtocolForecastMetrics, key: FeatureKey) {
  const value = metrics[key]
  if (value === Number.POSITIVE_INFINITY) return 10
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.NaN
}

function calculatePrimaryDurationMultiplier(userDurationHours: number, windowDurationHours: number) {
  if (!(userDurationHours > 0) || !(windowDurationHours > 0)) {
    return 1
  }

  const ratio = Math.max(userDurationHours, windowDurationHours) / Math.min(userDurationHours, windowDurationHours)
  if (ratio <= 1.5) {
    return PRIMARY_DURATION_BONUS_MULTIPLIER
  }

  if (ratio <= 3) {
    return 1
  }

  return PRIMARY_DURATION_PENALTY_MULTIPLIER
}

function featureKeys(weights: Record<FeatureKey, number>) {
  return Object.keys(weights) as FeatureKey[]
}

function emptyForecast(params: {
  currentCapital: number
  horizonTrades: number
  metrics: ProtocolForecastMetrics
  message: string
  lifecycle?: LifecycleForecastResult
  tacticalDiagnostics?: TacticalForecastDiagnostics
}): ProtocolForecastResult {
  return {
    status: 'insufficient-data',
    confidence: 'low',
    confidenceScore: 0,
    message: params.message,
    horizonTrades: params.horizonTrades,
    currentCapital: params.currentCapital,
    metrics: params.metrics,
    quantiles: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 },
    capitalQuantiles: {
      p10: params.currentCapital,
      p25: params.currentCapital,
      p50: params.currentCapital,
      p75: params.currentCapital,
      p90: params.currentCapital
    },
    previewHorizonTrades: 10,
    previewQuantiles: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 },
    previewCapitalQuantiles: {
      p10: params.currentCapital,
      p25: params.currentCapital,
      p50: params.currentCapital,
      p75: params.currentCapital,
      p90: params.currentCapital
    },
    previewPeakCapitalQuantiles: {
      p10: params.currentCapital,
      p50: params.currentCapital,
      p90: params.currentCapital
    },
    previewTroughCapitalQuantiles: {
      p10: params.currentCapital,
      p50: params.currentCapital,
      p90: params.currentCapital
    },
    previewPath: [],
    probabilityProfit: 0,
    probabilityDrawdownOver10: 0,
    simulationsCount: 0,
    matchesCount: 0,
    sourceFilesCount: 0,
    tacticalDiagnostics: params.tacticalDiagnostics ?? createEmptyTacticalDiagnostics(),
    lifecycle: params.lifecycle ?? createEmptyLifecycleForecast(params.currentCapital)
  }
}

function createEmptyMetrics(): ProtocolForecastMetrics {
  return {
    tradeCount: 0,
    winRate: 0,
    profitFactor: 0,
    expectancyPct: 0,
    averageAbsReturnPct: 0,
    medianAbsReturnPct: 0,
    averagePositiveReturnPct: 0,
    averageNegativeReturnPctAbs: 0,
    payoffRatio: 0,
    averageRiskReward: null,
    volatilityPct: 0,
    maxDrawdownPct: 0,
    currentDrawdownPct: 0,
    recentReturnPct: 0,
    recentDrawdownPct: 0,
    maxLossStreak: 0,
    currentLossStreak: 0,
    tradeFrequencyPerWeek: 0,
    averageDurationHours: 0,
    recoveryFactor: 0,
    ulcerIndex: 0,
    downsideDeviationPct: 0,
    sortinoLike: 0,
    equitySlope: 0,
    returnSkewness: 0,
    symbolConcentrationTop1: 0,
    tailLossCvar95: 0
  }
}

function calculateRiskReward(trade: DiaryEntry) {
  const entry = Number(trade.entry)
  const stopLoss = Number(trade.stopLoss)
  const takeProfit = Number(trade.takeProfit)

  if (![entry, stopLoss, takeProfit].every(Number.isFinite)) {
    return null
  }

  const risk = Math.abs(entry - stopLoss)
  const reward = Math.abs(takeProfit - entry)

  return risk > 0 ? reward / risk : null
}

function countLeadingCashflows(rows: ParsedStatementRow[]) {
  let count = 0

  for (const row of rows) {
    if (row.kind === 'cashflow') {
      count += 1
      continue
    }

    break
  }

  return count
}

function getStatementLines(csvText: string) {
  const lines: string[] = []

  for (const line of csvText.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (isSecondaryStatementSection(trimmed)) break
    lines.push(line)
  }

  return lines
}

function splitCsvLine(line: string, delimiter = ',') {
  const cells: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        quoted = !quoted
      }
      continue
    }

    if (character === delimiter && !quoted) {
      cells.push(current)
      current = ''
      continue
    }

    current += character
  }

  cells.push(current)
  return cells
}

function parseNumber(value: string) {
  const normalized = String(value).trim().replace(/\s+/g, '').replace(/,/g, '')
  if (!normalized) return 0

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseMyfxbookTimestamp(value: string) {
  const raw = String(value).trim()
  if (!raw) return Number.NaN

  const [datePart = '', timePart = '00:00'] = raw.split(/\s+/)
  const [month = 0, day = 0, year = 0] = datePart.split('/').map((segment) => Number(segment))
  const [hours = 0, minutes = 0] = timePart.split(':').map((segment) => Number(segment))

  if (!isValidDateParts(year, month, day, hours, minutes, 0)) {
    return Number.NaN
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime()
}

function parseMqlTimestamp(value: string) {
  const raw = String(value).trim()
  if (!raw) return Number.NaN

  const match = raw.match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/)
  if (!match) return Number.NaN

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hours = Number(match[4])
  const minutes = Number(match[5])
  const seconds = Number(match[6])

  if (!isValidDateParts(year, month, day, hours, minutes, seconds)) {
    return Number.NaN
  }

  return new Date(year, month - 1, day, hours, minutes, seconds, 0).getTime()
}

function parseDayMonthTimestamp(value: string) {
  const raw = String(value).trim()
  if (!raw) return Number.NaN

  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/)
  if (!match) return Number.NaN

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const hours = Number(match[4])
  const minutes = Number(match[5])

  if (!isValidDateParts(year, month, day, hours, minutes, 0)) {
    return Number.NaN
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime()
}

function isValidDateParts(year: number, month: number, day: number, hours: number, minutes: number, seconds: number) {
  return Number.isFinite(year) &&
    Number.isFinite(month) &&
    Number.isFinite(day) &&
    Number.isFinite(hours) &&
    Number.isFinite(minutes) &&
    Number.isFinite(seconds) &&
    year >= 1900 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31 &&
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59 &&
    seconds >= 0 &&
    seconds <= 59
}

function parseDurationToHours(value: string) {
  const raw = String(value).trim()
  if (!raw) return 0

  const parts = raw.split(':').map((segment) => Number(segment))
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return 0
  }

  const [days = 0, hours = 0, minutes = 0, seconds = 0] = parts
  return days * 24 + hours + minutes / 60 + seconds / 3600
}

function parseDate(value: Date | string | undefined) {
  if (!value) return Number.NaN
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : Number.NaN
}

function calculateDurationHours(start: number, end: number) {
  return Number.isFinite(start) && Number.isFinite(end) && end >= start
    ? (end - start) / 3600000
    : 0
}

function isCashFlowAction(action: string) {
  const normalized = action.toLowerCase()
  return normalized.includes('deposit') || normalized.includes('withdrawal') || normalized === 'balance'
}

function isSecondaryStatementSection(value: string) {
  const normalized = value.toLowerCase()
  return normalized === 'open trades' || normalized === 'open orders'
}

function isRealizedDiaryTrade(trade: DiaryEntry) {
  return Number.isFinite(parseDate(trade.date)) &&
    Number.isFinite(parseDate(trade.dateExit)) &&
    Number.isFinite(Number(trade.profitInCurrency))
}

function readDiaryTradeProfit(trade: DiaryEntry) {
  const profit = Number(trade.profitInCurrency)
  return Number.isFinite(profit) ? profit : 0
}

function buildRelativeEquity(returns: number[]) {
  let equity = 100
  const values = [equity]

  for (const returnPct of returns) {
    equity *= 1 + returnPct / 100
    values.push(equity)
  }

  return values
}

function buildCapitalPathFromReturns(startCapital: number, returns: number[]) {
  let capital = startCapital
  const values = [capital]

  for (const returnPct of returns) {
    capital *= 1 + returnPct / 100
    values.push(capital)
  }

  return values
}

function compoundReturns(returns: number[]) {
  return (returns.reduce((equity, returnPct) => equity * (1 + returnPct / 100), 1) - 1) * 100
}

function maxDrawdownFromReturns(returns: number[]) {
  return calculateMaxDrawdownPct(buildRelativeEquity(returns))
}

function calculateMaxDrawdownPct(equityValues: number[]) {
  let peak = equityValues[0] ?? 0
  let maxDrawdown = 0

  for (const equity of equityValues) {
    if (equity > peak) peak = equity
    const drawdown = peak > 0 ? ((equity - peak) / peak) * 100 : 0
    if (drawdown < maxDrawdown) maxDrawdown = drawdown
  }

  return maxDrawdown
}

function calculateCurrentDrawdownPct(equityValues: number[]) {
  const peak = maxInArray(equityValues)
  const current = lastItem(equityValues) ?? peak
  return peak > 0 ? ((current - peak) / peak) * 100 : 0
}

function calculateMaxLossStreak(profits: number[]) {
  let current = 0
  let max = 0

  for (const profit of profits) {
    if (profit < 0) {
      current += 1
      max = Math.max(max, current)
    } else {
      current = 0
    }
  }

  return max
}

function calculateCurrentLossStreak(profits: number[]) {
  let streak = 0

  for (let index = profits.length - 1; index >= 0; index -= 1) {
    if ((profits[index] ?? 0) < 0) {
      streak += 1
      continue
    }

    break
  }

  return streak
}

function calculateTradeFrequencyPerWeek(trades: PreparedTrade[]) {
  if (trades.length < 2) return trades.length

  const firstDate = trades[0]?.entryTimestamp ?? trades[0]?.timestamp ?? 0
  const lastDate = lastItem(trades)?.timestamp ?? firstDate
  const weeks = Math.max((lastDate - firstDate) / (7 * 86400000), 1 / 7)

  return trades.length / weeks
}

function calculateUlcerIndex(equityValues: number[]) {
  let peak = equityValues[0] ?? 0
  const squaredDrawdowns: number[] = []

  for (const equity of equityValues) {
    peak = Math.max(peak, equity)
    const drawdown = peak > 0 ? Math.min(0, ((equity - peak) / peak) * 100) : 0
    squaredDrawdowns.push(drawdown * drawdown)
  }

  return Math.sqrt(average(squaredDrawdowns))
}

function downsideDeviation(values: number[]) {
  const downside = values.filter((value) => value < 0)
  if (!downside.length) return 0
  return Math.sqrt(average(downside.map((value) => value * value)))
}

function calculateSlope(values: number[]) {
  if (values.length < 2) return 0
  const first = values[0] ?? 0
  const last = lastItem(values) ?? first
  return first > 0 ? ((last - first) / first) / (values.length - 1) * 100 : 0
}

function skewness(values: number[]) {
  if (values.length < 3) return 0

  const mean = average(values)
  const deviation = standardDeviation(values)
  if (deviation === 0) return 0

  return average(values.map((value) => Math.pow((value - mean) / deviation, 3)))
}

function calculateSymbolConcentration(trades: PreparedTrade[]) {
  if (!trades.length) return 0

  const counts = new Map<string, number>()
  trades.forEach((trade) => counts.set(trade.asset, (counts.get(trade.asset) ?? 0) + 1))
  return (maxInArray(Array.from(counts.values())) / trades.length) * 100
}

function calculateTailLossCvar95(values: number[]) {
  const sorted = values.slice().sort((left, right) => left - right)
  if (!sorted.length) return 0

  const count = Math.max(1, Math.ceil(sorted.length * 0.05))
  return average(sorted.slice(0, count))
}

function calculateConfidenceScore(params: {
  userTrades: number
  windowTrades: number
  matches: number
  sourceFiles: number
  medianDistance: number
  auxiliaryMatchShare: number
}) {
  const sampleScore = clamp(params.userTrades / Math.max(params.windowTrades, MIN_USER_TRADES), 0, 1)
  const matchScore = clamp(params.matches / DEFAULT_TOP_MATCHES, 0, 1)
  const sourceScore = clamp(params.sourceFiles / 30, 0, 1)
  const distanceScore = clamp(1 - params.medianDistance / 4, 0, 1)
  const confidence = Math.round((sampleScore * 0.25 + matchScore * 0.25 + sourceScore * 0.25 + distanceScore * 0.25) * 100)

  return Math.round(confidence * (1 - params.auxiliaryMatchShare * (1 - AUXILIARY_SOURCE_CONFIDENCE_MULTIPLIER)))
}

function calculateCandidateScore(params: {
  regime: ForecastRegime
  windowsCount: number
  sourceFilesCount: number
  matchesCount: number
  medianDistance: number
  auxiliaryMatchShare: number
}) {
  const regimeScore = clamp(params.regime.windowTrades / DEFAULT_WINDOW_TRADES, 0, 1)
  const windowsScore = clamp(params.windowsCount / 500, 0, 1)
  const sourceScore = clamp(params.sourceFilesCount / 40, 0, 1)
  const matchScore = clamp(params.matchesCount / DEFAULT_TOP_MATCHES, 0, 1)
  const distanceScore = clamp(1 - params.medianDistance / 4, 0, 1)
  const rawScore = regimeScore * 0.35 +
    windowsScore * 0.15 +
    sourceScore * 0.2 +
    matchScore * 0.15 +
    distanceScore * 0.15

  return rawScore * (1 - params.auxiliaryMatchShare * (1 - AUXILIARY_SOURCE_CANDIDATE_MULTIPLIER))
}

function confidenceLabel(score: number): ProtocolForecastResult['confidence'] {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

function quantile(values: number[], percentile: number) {
  if (!values.length) return 0

  const sorted = values.slice().sort((left, right) => left - right)
  const position = (sorted.length - 1) * percentile
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  const weight = position - lower

  return (sorted[lower] ?? 0) * (1 - weight) + (sorted[upper] ?? 0) * weight
}

function weightedQuantile(values: number[], weights: number[] | undefined, percentile: number) {
  if (!values.length) return 0
  if (!weights || weights.length !== values.length) {
    return quantile(values, percentile)
  }

  const pairs = values
    .map((value, index) => ({ value, weight: Math.max(weights[index] ?? 0, 0) }))
    .filter((pair) => Number.isFinite(pair.value) && Number.isFinite(pair.weight))
    .sort((left, right) => left.value - right.value)

  if (!pairs.length) return 0

  const totalWeight = sum(pairs.map((pair) => pair.weight))
  if (!(totalWeight > 0)) {
    return quantile(values, percentile)
  }

  const target = clamp(percentile, 0, 1) * totalWeight
  let cumulative = 0

  for (const pair of pairs) {
    cumulative += pair.weight
    if (cumulative >= target) {
      return pair.value
    }
  }

  return pairs[pairs.length - 1]?.value ?? 0
}

function percentage(count: number, total: number) {
  return total > 0 ? (count / total) * 100 : 0
}

function weightedPercentage(flags: boolean[], weights: number[]) {
  if (!flags.length) return 0
  if (weights.length !== flags.length) {
    return percentage(flags.filter(Boolean).length, flags.length)
  }

  const totalWeight = sum(weights)
  if (!(totalWeight > 0)) {
    return percentage(flags.filter(Boolean).length, flags.length)
  }

  const positiveWeight = sum(flags.map((flag, index) => flag ? (weights[index] ?? 0) : 0))
  return (positiveWeight / totalWeight) * 100
}

function average(values: number[]) {
  if (!values.length) return 0
  return sum(values) / values.length
}

function weightedAverage(values: number[], weights: number[], fallback = 0) {
  if (!values.length || weights.length !== values.length) {
    return values.length ? average(values.filter(Number.isFinite)) : fallback
  }

  let weightedSum = 0
  let totalWeight = 0

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    const weight = weights[index]
    if (!Number.isFinite(value) || !Number.isFinite(weight) || weight <= 0) {
      continue
    }

    weightedSum += value * weight
    totalWeight += weight
  }

  return totalWeight > 0 ? weightedSum / totalWeight : fallback
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0

  const mean = average(values)
  return Math.sqrt(average(values.map((value) => Math.pow(value - mean, 2))))
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function maxInArray(values: number[]) {
  let max = Number.NEGATIVE_INFINITY

  for (const value of values) {
    if (Number.isFinite(value) && value > max) {
      max = value
    }
  }

  return Number.isFinite(max) ? max : 0
}

function finitePositive(value: number) {
  return Number.isFinite(value) && value > 0
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function lastItem<T>(values: T[]) {
  return values.length ? values[values.length - 1] : undefined
}

function formatSignedPercent(value: number) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}
