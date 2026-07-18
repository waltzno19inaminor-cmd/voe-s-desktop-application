import type { DiaryEntry } from '~/entities/diary/model/diary.types'
import { HISTORICAL_FORECAST_FILES } from './protocolForecastFiles'

type PatternForecastConfidence = 'low' | 'medium' | 'high'

interface PreparedTrade {
  timestamp: number
  entryTimestamp: number
  asset: string
  profit: number
  returnPct: number
  durationHours: number
}

interface ParsedStatementRow {
  originalIndex: number
  timestamp: number
  entryTimestamp: number
  action: string
  symbol: string
  profit: number
  kind: 'trade' | 'cashflow'
  durationHours: number
}

interface StructuralBlock {
  phase: 'impulse-up' | 'drawdown' | 'recovery' | 'range'
  startTradeIndex: number
  endTradeIndex: number
  tradeCount: number
  returnPct: number
  averageDurationHours: number
  winRate: number
  averageAbsReturnPct: number
  peakRunupPct: number
  troughDrawdownPct: number
  maxWinStreak: number
  maxLossStreak: number
  startEquity: number
  endEquity: number
}

interface StyleProfile {
  averageDurationHours: number
  medianAbsReturnPct: number
  averageAbsReturnPct: number
  averageRR: number
  tradeFrequencyPerWeek: number
  expectancyPct: number
  winRate: number
  averageWinPct: number
  averageLossPctAbs: number
  maxDrawdownPct: number
}

interface HistoricalPatternTimeline {
  sourceFile: string
  trades: PreparedTrade[]
  blocks: StructuralBlock[]
  style: StyleProfile
  initialCapital: number
  finalCapital: number
  finalReturnPct: number
  netCashFlow: number
}

interface PatternMatch {
  sourceFile: string
  distance: number
  styleScore: number
  patternScore: number
  future10Returns: number[]
  future20Returns: number[]
  futureToEndReturns: number[]
  future10ReturnPct: number
  future20ReturnPct: number
  futureToEndReturnPct: number
  totalFileReturnPct: number
  matchedBlocks: StructuralBlock[]
  remainingTrades: number
  matchedPhaseLabel: string
  matchedMedianAbsReturnPct: number
}

export interface PatternForecastInput {
  trades: DiaryEntry[]
  initialCapital: number
  includeAverageRR?: boolean
}

export interface PatternForecastBlockView {
  phase: StructuralBlock['phase']
  tradeCount: number
  returnPct: number
  averageDurationHours: number
  winRate: number
  firstCloseTimestamp: number
  lastCloseTimestamp: number
}

export interface PatternForecastHorizonResult {
  horizonTrades: number
  p25: number
  p50: number
  p75: number
  probabilityPositive: number
  userLinearEstimatePct: number
  medianPeakPct: number
  medianTroughPct: number
}

export interface PatternForecastOutcomeGroup {
  key: 'loss' | 'flat' | 'mid' | 'high' | 'elite'
  label: string
  affinityScore: number
  matchesCount: number
}

export interface PatternForecastMatchSummary {
  sourceFile: string
  fileLabel: string
  sourceGroup: 'mql4' | 'mql5' | 'myfxbook'
  styleScore: number
  patternScore: number
  matchedAverageRR: number
  continuation10Pct: number
  continuation20Pct: number
  continuationToEndPct: number
  totalFileReturnPct: number
  matchedPhaseLabel: string
  blocks: PatternForecastBlockView[]
}

export interface PatternForecastResult {
  status: 'ready' | 'insufficient-data'
  confidence: PatternForecastConfidence
  confidenceScore: number
  message: string
  currentCapital: number
  styleProfile: StyleProfile & {
    styleLabel: string
  }
  currentPattern: {
    sequenceLabel: string
    blocks: PatternForecastBlockView[]
  }
  tactical: {
    matchesCount: number
    sourceFilesCount: number
    averageStyleScore: number
    averagePatternScore: number
    horizons: PatternForecastHorizonResult[]
  }
  lifecycle: {
    strongestGroupKey: PatternForecastOutcomeGroup['key']
    strongestGroupLabel: string
    strongestGroupAffinity: number
    affinityAbove30: number
    affinityPositive: number
    medianContinuationToEndPct: number
    medianFullFileReturnPct: number
    medianRemainingTrades: number
    groups: PatternForecastOutcomeGroup[]
  }
  topMatches: PatternForecastMatchSummary[]
}

const MIN_USER_TRADES = 8
const MAX_MATCHES = 60
const MAX_MATCHES_PER_FILE = 2
const HORIZONS = [10, 20] as const

export const PATTERN_FORECAST_LIMITS = {
  minUserTrades: MIN_USER_TRADES,
  historicalProfiles: 216,
  maxMatches: MAX_MATCHES,
  maxMatchesPerFile: MAX_MATCHES_PER_FILE,
  horizons: HORIZONS,
  confidenceTradeTarget: 40,
  confidenceBlockTarget: 3,
  confidenceSourceFileTarget: 25
} as const

let historicalPatternTimelinesPromise: Promise<HistoricalPatternTimeline[]> | null = null

export function calculatePatternForecastCurrentCapital(trades: DiaryEntry[], initialCapital: number) {
  const baseCapital = finitePositive(initialCapital) ? initialCapital : 1000
  const totalProfit = trades
    .filter(isRealizedDiaryTrade)
    .reduce((sum, trade) => sum + readDiaryTradeProfit(trade), 0)
  const capital = baseCapital + totalProfit
  return Number.isFinite(capital) ? capital : baseCapital
}

export function createEmptyPatternForecast(params?: {
  currentCapital?: number
  message?: string
}): PatternForecastResult {
  return {
    status: 'insufficient-data',
    confidence: 'low',
    confidenceScore: 0,
    message: params?.message ?? 'Pattern forecast is not ready yet.',
    currentCapital: Number.isFinite(params?.currentCapital) ? Number(params?.currentCapital) : 0,
    styleProfile: {
      averageDurationHours: 0,
      medianAbsReturnPct: 0,
      averageAbsReturnPct: 0,
      averageRR: 0,
      tradeFrequencyPerWeek: 0,
      expectancyPct: 0,
      winRate: 0,
      averageWinPct: 0,
      averageLossPctAbs: 0,
      maxDrawdownPct: 0,
      styleLabel: 'Unknown'
    },
    currentPattern: {
      sequenceLabel: 'No pattern',
      blocks: []
    },
    tactical: {
      matchesCount: 0,
      sourceFilesCount: 0,
      averageStyleScore: 0,
      averagePatternScore: 0,
      horizons: HORIZONS.map((horizonTrades) => ({
        horizonTrades,
        p25: 0,
        p50: 0,
        p75: 0,
        probabilityPositive: 0,
        userLinearEstimatePct: 0,
        medianPeakPct: 0,
        medianTroughPct: 0
      }))
    },
    lifecycle: {
      strongestGroupKey: 'flat',
      strongestGroupLabel: '0% to 15%',
      strongestGroupAffinity: 0,
      affinityAbove30: 0,
      affinityPositive: 0,
      medianContinuationToEndPct: 0,
      medianFullFileReturnPct: 0,
      medianRemainingTrades: 0,
      groups: buildOutcomeGroups([], [])
    },
    topMatches: []
  }
}

export async function calculatePatternForecast(input: PatternForecastInput): Promise<PatternForecastResult> {
  const currentCapital = calculatePatternForecastCurrentCapital(input.trades, input.initialCapital)
  const userTrades = prepareUserTrades(input.trades, input.initialCapital)
  const includeAverageRR = Boolean(input.includeAverageRR)

  if (userTrades.length < MIN_USER_TRADES) {
    return createEmptyPatternForecast({
      currentCapital,
      message: 'Not enough closed trades to detect a stable structural pattern.'
    })
  }

  const userStyle = calculateStyleProfile(userTrades)
  const userBlocks = buildStructuralBlocks(userTrades)
  const userPatternBlocks = userBlocks.slice()

  if (!userPatternBlocks.length) {
    return createEmptyPatternForecast({
      currentCapital,
      message: 'Unable to segment the user history into structural blocks yet.'
    })
  }

  const timelines = await loadHistoricalPatternTimelines()
  const matches = selectPatternMatches(userPatternBlocks, userStyle, timelines, includeAverageRR)

  if (!matches.length) {
    return createEmptyPatternForecast({
      currentCapital,
      message: 'No style-compatible historical patterns were found in myfxbook/mql4/mql5.'
    })
  }

  const weights = buildMatchWeights(matches)
  const scaleFactor = calculateUserScaleFactor(userStyle, matches, weights)
  const confidenceScore = calculateConfidenceScore({
    userTrades: userTrades.length,
    userBlocks: userPatternBlocks.length,
    matches: matches.length,
    sourceFiles: new Set(matches.map((match) => match.sourceFile)).size,
    averageStyleScore: weightedAverage(matches.map((match) => match.styleScore), weights, 0),
    medianDistance: weightedQuantile(matches.map((match) => match.distance), weights, 0.5)
  })

  const tacticalHorizons = HORIZONS.map((horizonTrades) => buildTacticalHorizon(
    horizonTrades,
    userStyle,
    matches,
    weights,
    scaleFactor
  ))
  const continuationValues = matches.map((match) => match.futureToEndReturnPct)
  const lifecycleGroups = buildOutcomeGroups(continuationValues, weights)
  const strongestGroup = lifecycleGroups.slice().sort((left, right) => right.affinityScore - left.affinityScore)[0] ?? lifecycleGroups[0]

  return {
    status: 'ready',
    confidence: confidenceLabel(confidenceScore),
    confidenceScore,
    message: 'Pattern forecast compares the current structural phase of the user with style-compatible historical phases from myfxbook/mql4/mql5.',
    currentCapital,
    styleProfile: {
      ...userStyle,
      styleLabel: classifyTradingStyle(userStyle.averageDurationHours)
    },
    currentPattern: {
      sequenceLabel: userBlocks.map((block) => phaseTitle(block.phase)).join(' -> '),
      blocks: userBlocks.map((block) => toBlockView(block, userTrades))
    },
    tactical: {
      matchesCount: matches.length,
      sourceFilesCount: new Set(matches.map((match) => match.sourceFile)).size,
      averageStyleScore: weightedAverage(matches.map((match) => match.styleScore), weights, 0),
      averagePatternScore: weightedAverage(matches.map((match) => match.patternScore), weights, 0),
      horizons: tacticalHorizons
    },
    lifecycle: {
      strongestGroupKey: strongestGroup?.key ?? 'flat',
      strongestGroupLabel: strongestGroup?.label ?? '0% to 15%',
      strongestGroupAffinity: strongestGroup?.affinityScore ?? 0,
      affinityAbove30: sumByWeights(
        matches.map((match) => match.futureToEndReturnPct >= 30),
        weights
      ),
      affinityPositive: sumByWeights(
        matches.map((match) => match.futureToEndReturnPct > 0),
        weights
      ),
      medianContinuationToEndPct: weightedQuantile(continuationValues, weights, 0.5),
      medianFullFileReturnPct: weightedQuantile(matches.map((match) => match.totalFileReturnPct), weights, 0.5),
      medianRemainingTrades: weightedQuantile(matches.map((match) => match.remainingTrades), weights, 0.5),
      groups: lifecycleGroups
    },
    topMatches: buildDiverseTopMatches(matches, 5).map((match) => ({
      sourceFile: match.sourceFile,
      fileLabel: compactFileLabel(match.sourceFile),
      sourceGroup: detectSourceGroup(match.sourceFile),
      styleScore: match.styleScore * 100,
      patternScore: match.patternScore * 100,
      matchedAverageRR: timelines.find((item) => item.sourceFile === match.sourceFile)?.style.averageRR ?? 0,
      continuation10Pct: match.future10ReturnPct,
      continuation20Pct: match.future20ReturnPct,
      continuationToEndPct: match.futureToEndReturnPct,
      totalFileReturnPct: match.totalFileReturnPct,
      matchedPhaseLabel: match.matchedPhaseLabel,
      blocks: match.matchedBlocks.map((block) => {
        const timeline = timelines.find((item) => item.sourceFile === match.sourceFile)
        return toBlockView(block, timeline?.trades ?? [])
      })
    }))
  }
}

async function loadHistoricalPatternTimelines(): Promise<HistoricalPatternTimeline[]> {
  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    return []
  }

  if (!historicalPatternTimelinesPromise) {
    historicalPatternTimelinesPromise = Promise.allSettled(
      HISTORICAL_FORECAST_FILES.map(async (file) => {
        const response = await fetch(encodeURI(file))
        if (!response.ok) return null
        return parseHistoricalPatternTimeline(await response.text(), file)
      })
    ).then((results) => results
      .filter((result): result is PromiseFulfilledResult<HistoricalPatternTimeline | null> => result.status === 'fulfilled')
      .map((result) => result.value)
      .filter((timeline): timeline is HistoricalPatternTimeline => Boolean(timeline)))
  }

  return historicalPatternTimelinesPromise
}

function parseHistoricalPatternTimeline(csvText: string, file: string): HistoricalPatternTimeline | null {
  const lines = getStatementLines(csvText)
  if (lines.length < 2) return null

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

  return rowsToHistoricalPatternTimeline(rows, file)
}

function rowsToHistoricalPatternTimeline(rows: ParsedStatementRow[], sourceFile: string): HistoricalPatternTimeline | null {
  const timelineRows = rows.slice().sort((left, right) => {
    if (left.timestamp !== right.timestamp) return left.timestamp - right.timestamp
    return left.originalIndex - right.originalIndex
  })
  if (!timelineRows.length) return null

  const sourceKind = detectSourceKind(sourceFile)
  const leadingCashflowCount = sourceKind === 'myfxbook'
    ? countInitialCashflowsBeforeFirstTrade(timelineRows)
    : countLeadingCashflows(timelineRows)
  const leadingCashflows = timelineRows.slice(0, leadingCashflowCount)
  const initialCapitalRaw = sum(leadingCashflows.map((row) => row.profit))
  const initialCapital = finitePositive(initialCapitalRaw) ? initialCapitalRaw : 1000

  let equity = initialCapital
  let netCashFlow = 0
  const trades: PreparedTrade[] = []

  for (const row of timelineRows.slice(leadingCashflowCount)) {
    const baseEquity = equity > 0 ? equity : initialCapital
    equity += row.profit

    if (row.kind === 'cashflow') {
      netCashFlow += row.profit
      continue
    }

    if (!(baseEquity > 0)) {
      continue
    }

    trades.push({
      timestamp: row.timestamp,
      entryTimestamp: row.entryTimestamp,
      asset: row.symbol || 'UNKNOWN',
      profit: row.profit,
      returnPct: (row.profit / baseEquity) * 100,
      durationHours: row.durationHours
    })
  }

  if (trades.length < MIN_USER_TRADES) return null

  const blocks = buildStructuralBlocks(trades)
  if (!blocks.length) return null

  return {
    sourceFile,
    trades,
    blocks,
    style: calculateStyleProfile(trades),
    initialCapital,
    finalCapital: equity,
    netCashFlow,
    finalReturnPct: initialCapital > 0 ? ((equity - initialCapital - netCashFlow) / initialCapital) * 100 : compoundReturns(trades.map((trade) => trade.returnPct))
  }
}

function selectPatternMatches(
  userBlocks: StructuralBlock[],
  userStyle: StyleProfile,
  timelines: HistoricalPatternTimeline[],
  includeAverageRR = false
): PatternMatch[] {
  const candidates: PatternMatch[] = []

  for (const timeline of timelines) {
    const styleScore = calculateStyleCompatibility(userStyle, timeline.style, includeAverageRR)
    if (styleScore < 0.18) continue

    const compareLength = Math.min(userBlocks.length, timeline.blocks.length)
    if (compareLength <= 0) continue

    const userComparableBlocks = userBlocks.slice(userBlocks.length - compareLength)

    for (let endIndex = compareLength - 1; endIndex < timeline.blocks.length; endIndex += 1) {
      const matchedBlocks = timeline.blocks.slice(endIndex - compareLength + 1, endIndex + 1)
      const lastMatchedBlock = matchedBlocks[matchedBlocks.length - 1]
      if (!lastMatchedBlock) continue

      const futureTrades = timeline.trades.slice(lastMatchedBlock.endTradeIndex + 1)
      if (!futureTrades.length) continue

      const shapeDistance = comparePatternShapeSequences(userComparableBlocks, matchedBlocks)
      const shapeScore = 1 / (1 + shapeDistance)
      if (shapeScore < 0.18) continue

      const qualityDistance = comparePatternQualitySequences(userComparableBlocks, matchedBlocks)
      const stylePenalty = (1 - styleScore) * 1.1
      const distance = shapeDistance * 1.75 + stylePenalty + qualityDistance * 0.8

      candidates.push({
        sourceFile: timeline.sourceFile,
        distance,
        styleScore,
        patternScore: 1 / (1 + shapeDistance + qualityDistance * 0.45),
        future10Returns: futureTrades.slice(0, 10).map((trade) => trade.returnPct),
        future20Returns: futureTrades.slice(0, 20).map((trade) => trade.returnPct),
        futureToEndReturns: futureTrades.map((trade) => trade.returnPct),
        future10ReturnPct: compoundReturns(futureTrades.slice(0, 10).map((trade) => trade.returnPct)),
        future20ReturnPct: compoundReturns(futureTrades.slice(0, 20).map((trade) => trade.returnPct)),
        futureToEndReturnPct: compoundReturns(futureTrades.map((trade) => trade.returnPct)),
        totalFileReturnPct: timeline.finalReturnPct,
        matchedBlocks,
        remainingTrades: futureTrades.length,
        matchedPhaseLabel: matchedBlocks.map((block) => phaseTitle(block.phase)).join(' -> '),
        matchedMedianAbsReturnPct: calculateStyleProfile(
          timeline.trades.slice(
            matchedBlocks[0]?.startTradeIndex ?? 0,
            (lastMatchedBlock.endTradeIndex ?? 0) + 1
          )
        ).medianAbsReturnPct
      })
    }
  }

  const sorted = candidates.sort((left, right) => left.distance - right.distance)
  const cappedByFile = new Map<string, number>()
  const selected: PatternMatch[] = []

  for (const match of sorted) {
    const currentCount = cappedByFile.get(match.sourceFile) ?? 0
    if (currentCount >= MAX_MATCHES_PER_FILE) continue
    cappedByFile.set(match.sourceFile, currentCount + 1)
    selected.push(match)
    if (selected.length >= MAX_MATCHES) break
  }

  return selected
}

function comparePatternShapeSequences(userBlocks: StructuralBlock[], historicalBlocks: StructuralBlock[]) {
  const weights = userBlocks.map((_, index) => 1 + index * 0.45)
  let distance = 0
  let weightSum = 0

  userBlocks.forEach((userBlock, index) => {
    const historicalBlock = historicalBlocks[index]
    if (!historicalBlock) return

    const weight = weights[index] ?? 1
    const phaseDistance = comparePhase(userBlock.phase, historicalBlock.phase)
    const tradeCountDistance = normalizedDifference(userBlock.tradeCount, historicalBlock.tradeCount, 5)
    const phaseTransitionDistance = index > 0
      ? comparePhase(userBlocks[index - 1]?.phase ?? userBlock.phase, historicalBlocks[index - 1]?.phase ?? historicalBlock.phase)
      : 0

    distance += (
      phaseDistance * 2.1 +
      phaseTransitionDistance * 0.65 +
      tradeCountDistance * 0.3
    ) * weight
    weightSum += weight
  })

  return weightSum > 0 ? distance / weightSum : Number.POSITIVE_INFINITY
}

function comparePatternQualitySequences(userBlocks: StructuralBlock[], historicalBlocks: StructuralBlock[]) {
  const weights = userBlocks.map((_, index) => 1 + index * 0.35)
  let distance = 0
  let weightSum = 0

  userBlocks.forEach((userBlock, index) => {
    const historicalBlock = historicalBlocks[index]
    if (!historicalBlock) return

    const weight = weights[index] ?? 1
    const returnDistance = normalizedDifference(userBlock.returnPct, historicalBlock.returnPct, 8)
    const winRateDistance = normalizedDifference(userBlock.winRate, historicalBlock.winRate, 30)
    const magnitudeDistance = normalizedDifference(userBlock.averageAbsReturnPct, historicalBlock.averageAbsReturnPct, 3)
    const streakDistance = normalizedDifference(
      userBlock.maxLossStreak + userBlock.maxWinStreak,
      historicalBlock.maxLossStreak + historicalBlock.maxWinStreak,
      3
    )

    distance += (
      returnDistance * 1.25 +
      winRateDistance * 0.85 +
      magnitudeDistance * 0.55 +
      streakDistance * 0.65
    ) * weight
    weightSum += weight
  })

  return weightSum > 0 ? distance / weightSum : Number.POSITIVE_INFINITY
}

function buildTacticalHorizon(
  horizonTrades: number,
  userStyle: StyleProfile,
  matches: PatternMatch[],
  weights: number[],
  scaleFactor: number
): PatternForecastHorizonResult {
  const scaledOutcomes = matches.map((match) => {
    const path = (horizonTrades <= 10 ? match.future10Returns : match.future20Returns)
      .map((returnPct) => returnPct * scaleFactor)
    const capitalPath = buildRelativeEquity(path)
    const peak = maxInArray(capitalPath)
    const trough = minInArray(capitalPath)
    return {
      returnPct: compoundReturns(path),
      peakPct: peak - 100,
      troughPct: trough - 100
    }
  })

  const returns = scaledOutcomes.map((item) => item.returnPct)
  const peaks = scaledOutcomes.map((item) => item.peakPct)
  const troughs = scaledOutcomes.map((item) => item.troughPct)
  const userLinearEstimatePct = compoundFromAverage(userStyle.expectancyPct, horizonTrades)

  return {
    horizonTrades,
    p25: weightedQuantile(returns, weights, 0.25),
    p50: weightedQuantile(returns, weights, 0.5),
    p75: weightedQuantile(returns, weights, 0.75),
    probabilityPositive: sumByWeights(returns.map((value) => value > 0), weights),
    userLinearEstimatePct,
    medianPeakPct: weightedQuantile(peaks, weights, 0.5),
    medianTroughPct: weightedQuantile(troughs, weights, 0.5)
  }
}

function buildOutcomeGroups(values: number[], weights: number[]): PatternForecastOutcomeGroup[] {
  const groups = [
    { key: 'loss', label: '< 0%', test: (value: number) => value < 0 },
    { key: 'flat', label: '0% to 15%', test: (value: number) => value >= 0 && value < 15 },
    { key: 'mid', label: '15% to 30%', test: (value: number) => value >= 15 && value < 30 },
    { key: 'high', label: '30% to 60%', test: (value: number) => value >= 30 && value < 60 },
    { key: 'elite', label: '60%+', test: (value: number) => value >= 60 }
  ] as const

  return groups.map((group) => {
    const matchesCount = values.filter((value) => group.test(value)).length
    return {
      key: group.key,
      label: group.label,
      affinityScore: sumByWeights(values.map((value) => group.test(value)), weights),
      matchesCount
    }
  })
}

function calculateUserScaleFactor(userStyle: StyleProfile, matches: PatternMatch[], weights: number[]) {
  const matchedAmplitude = weightedAverage(matches.map((match) => match.matchedMedianAbsReturnPct), weights, userStyle.medianAbsReturnPct || 0.5)
  if (!(userStyle.medianAbsReturnPct > 0) || !(matchedAmplitude > 0)) {
    return 1
  }
  const raw = clamp(userStyle.medianAbsReturnPct / matchedAmplitude, 0.7, 1.6)
  return 1 + (raw - 1) * 0.55
}

function calculateStyleProfile(trades: PreparedTrade[]): StyleProfile {
  const returns = trades.map((trade) => trade.returnPct).filter(Number.isFinite)
  const positiveReturns = returns.filter((value) => value > 0)
  const negativeReturnsAbs = returns.filter((value) => value < 0).map((value) => Math.abs(value))
  const equity = buildRelativeEquity(returns)
  const averageWinPct = average(positiveReturns)
  const averageLossPctAbs = average(negativeReturnsAbs)

  return {
    averageDurationHours: average(trades.map((trade) => trade.durationHours).filter(Number.isFinite)),
    medianAbsReturnPct: quantile(returns.map((value) => Math.abs(value)), 0.5),
    averageAbsReturnPct: average(returns.map((value) => Math.abs(value))),
    averageRR: averageLossPctAbs > 0 ? averageWinPct / averageLossPctAbs : 0,
    tradeFrequencyPerWeek: calculateTradeFrequencyPerWeek(trades),
    expectancyPct: average(returns),
    winRate: percentage(positiveReturns.length, returns.length),
    averageWinPct,
    averageLossPctAbs,
    maxDrawdownPct: calculateMaxDrawdownPct(equity)
  }
}

function buildStructuralBlocks(trades: PreparedTrade[]): StructuralBlock[] {
  if (!trades.length) return []

  const returns = trades.map((trade) => trade.returnPct)
  const absMedian = quantile(returns.map((value) => Math.abs(value)), 0.5)
  const swingThreshold = Math.max(absMedian * 2.2, 1.4)
  const equityValues = buildRelativeEquity(returns)

  let pivotIndex = 0
  let trend: 'unknown' | 'up' | 'down' = 'unknown'
  let extremeIndex = 0
  let extremeEquity = equityValues[0] ?? 100
  const rawSegments: Array<{ startPoint: number; endPoint: number }> = []

  for (let pointIndex = 1; pointIndex < equityValues.length; pointIndex += 1) {
    const equity = equityValues[pointIndex] ?? extremeEquity
    const pivotEquity = equityValues[pivotIndex] ?? 100
    const changeFromPivot = pivotEquity > 0 ? ((equity - pivotEquity) / pivotEquity) * 100 : 0

    if (trend === 'unknown') {
      if (changeFromPivot >= swingThreshold) {
        trend = 'up'
        extremeIndex = pointIndex
        extremeEquity = equity
        continue
      }
      if (changeFromPivot <= -swingThreshold) {
        trend = 'down'
        extremeIndex = pointIndex
        extremeEquity = equity
        continue
      }
      if (equity >= extremeEquity) {
        extremeIndex = pointIndex
        extremeEquity = equity
      } else if (equity <= extremeEquity) {
        extremeIndex = pointIndex
        extremeEquity = equity
      }
      continue
    }

    if (trend === 'up') {
      if (equity >= extremeEquity) {
        extremeIndex = pointIndex
        extremeEquity = equity
      }

      const drawdownFromExtreme = extremeEquity > 0 ? ((equity - extremeEquity) / extremeEquity) * 100 : 0
      if (drawdownFromExtreme <= -swingThreshold) {
        rawSegments.push({ startPoint: pivotIndex, endPoint: extremeIndex })
        pivotIndex = extremeIndex
        trend = 'down'
        extremeIndex = pointIndex
        extremeEquity = equity
      }
      continue
    }

    if (equity <= extremeEquity) {
      extremeIndex = pointIndex
      extremeEquity = equity
    }

    const reboundFromExtreme = extremeEquity > 0 ? ((equity - extremeEquity) / extremeEquity) * 100 : 0
    if (reboundFromExtreme >= swingThreshold) {
      rawSegments.push({ startPoint: pivotIndex, endPoint: extremeIndex })
      pivotIndex = extremeIndex
      trend = 'up'
      extremeIndex = pointIndex
      extremeEquity = equity
    }
  }

  if (!rawSegments.length) {
    rawSegments.push({ startPoint: 0, endPoint: trades.length })
  } else if ((rawSegments[rawSegments.length - 1]?.endPoint ?? 0) < trades.length) {
    rawSegments.push({ startPoint: pivotIndex, endPoint: trades.length })
  }

  const blocks = rawSegments
    .map((segment, index) => createBlockFromSegment(segment, trades, equityValues, swingThreshold, rawSegments[index - 1]))
    .filter((block): block is StructuralBlock => Boolean(block))

  return mergeTinyBlocks(blocks, swingThreshold)
}

function createBlockFromSegment(
  segment: { startPoint: number; endPoint: number },
  trades: PreparedTrade[],
  equityValues: number[],
  swingThreshold: number,
  previousSegment?: { startPoint: number; endPoint: number }
): StructuralBlock | null {
  const startTradeIndex = segment.startPoint
  const endTradeIndex = Math.max(segment.endPoint - 1, startTradeIndex)
  const blockTrades = trades.slice(startTradeIndex, endTradeIndex + 1)
  if (!blockTrades.length) return null

  const returns = blockTrades.map((trade) => trade.returnPct)
  const blockReturnPct = compoundReturns(returns)
  const startEquity = equityValues[startTradeIndex] ?? 100
  const endEquity = equityValues[endTradeIndex + 1] ?? startEquity
  const localPath = buildRelativeEquity(returns)
  const previousPeakEquity = previousSegment
    ? maxInArray(equityValues.slice(previousSegment.startPoint, previousSegment.endPoint + 1))
    : startEquity

  let phase: StructuralBlock['phase'] = 'range'
  if (Math.abs(blockReturnPct) < swingThreshold * 0.7) {
    phase = 'range'
  } else if (blockReturnPct < 0) {
    phase = 'drawdown'
  } else if (previousSegment && endEquity < previousPeakEquity * 0.995) {
    phase = 'recovery'
  } else {
    phase = 'impulse-up'
  }

  return {
    phase,
    startTradeIndex,
    endTradeIndex,
    tradeCount: blockTrades.length,
    returnPct: blockReturnPct,
    averageDurationHours: average(blockTrades.map((trade) => trade.durationHours).filter(Number.isFinite)),
    winRate: percentage(blockTrades.filter((trade) => trade.profit > 0).length, blockTrades.length),
    averageAbsReturnPct: average(returns.map((value) => Math.abs(value))),
    peakRunupPct: maxInArray(localPath) - 100,
    troughDrawdownPct: minInArray(localPath) - 100,
    maxWinStreak: calculateMaxStreak(blockTrades.map((trade) => trade.profit > 0)),
    maxLossStreak: calculateMaxStreak(blockTrades.map((trade) => trade.profit < 0)),
    startEquity,
    endEquity
  }
}

function mergeTinyBlocks(blocks: StructuralBlock[], swingThreshold: number) {
  if (blocks.length <= 1) return blocks

  const merged: StructuralBlock[] = []

  for (const block of blocks) {
    const previous = merged[merged.length - 1]
    const tinyBlock = block.tradeCount <= 2 || Math.abs(block.returnPct) < swingThreshold * 0.65
    if (!previous || !tinyBlock || previous.phase !== block.phase) {
      merged.push(block)
      continue
    }

    merged[merged.length - 1] = {
      ...previous,
      endTradeIndex: block.endTradeIndex,
      tradeCount: previous.tradeCount + block.tradeCount,
      returnPct: compoundReturns([previous.returnPct, block.returnPct]),
      averageDurationHours: average([previous.averageDurationHours, block.averageDurationHours]),
      winRate: average([previous.winRate, block.winRate]),
      averageAbsReturnPct: average([previous.averageAbsReturnPct, block.averageAbsReturnPct]),
      peakRunupPct: Math.max(previous.peakRunupPct, block.peakRunupPct),
      troughDrawdownPct: Math.min(previous.troughDrawdownPct, block.troughDrawdownPct),
      maxWinStreak: Math.max(previous.maxWinStreak, block.maxWinStreak),
      maxLossStreak: Math.max(previous.maxLossStreak, block.maxLossStreak),
      endEquity: block.endEquity
    }
  }

  return merged
}

function prepareUserTrades(trades: DiaryEntry[], initialCapital: number): PreparedTrade[] {
  const sortedTrades = trades
    .filter(isRealizedDiaryTrade)
    .slice()
    .sort((left, right) => parseDate(left.dateExit) - parseDate(right.dateExit))

  const baseCapital = finitePositive(initialCapital) ? initialCapital : 1000
  let equity = baseCapital

  return sortedTrades.flatMap((trade): PreparedTrade[] => {
    const timestamp = parseDate(trade.dateExit)
    const entryTimestamp = parseDate(trade.date)
    const profit = readDiaryTradeProfit(trade)
    if (!Number.isFinite(timestamp) || !Number.isFinite(entryTimestamp)) return []

    const baseEquity = equity > 0 ? equity : baseCapital
    equity += profit

    return [{
      timestamp,
      entryTimestamp,
      asset: String(trade.asset || 'UNKNOWN').toUpperCase(),
      profit,
      returnPct: baseEquity > 0 ? (profit / baseEquity) * 100 : 0,
      durationHours: calculateDurationHours(entryTimestamp, timestamp)
    }]
  })
}

function calculateStyleCompatibility(
  userStyle: StyleProfile,
  targetStyle: StyleProfile,
  includeAverageRR = false
) {
  const durationScore = ratioScore(userStyle.averageDurationHours, targetStyle.averageDurationHours, 0.25)
  const amplitudeScore = ratioScore(userStyle.medianAbsReturnPct, targetStyle.medianAbsReturnPct, 0.1)
  const drawdownScore = ratioScore(Math.abs(userStyle.maxDrawdownPct), Math.abs(targetStyle.maxDrawdownPct), 1)
  const rrScore = ratioScore(userStyle.averageRR, targetStyle.averageRR, 0.15)
  const compatibility = includeAverageRR
    ? durationScore * 0.43 + amplitudeScore * 0.31 + drawdownScore * 0.1 + rrScore * 0.16
    : durationScore * 0.5 + amplitudeScore * 0.36 + drawdownScore * 0.14

  if (durationScore < 0.08 || amplitudeScore < 0.08) {
    return 0
  }

  return compatibility
}

function parseMyfxbookRows(lines: string[], delimiter: string, headerMap: Map<string, number>): ParsedStatementRow[] {
  const actionIndex = headerMap.get('Action') ?? -1
  const symbolIndex = headerMap.get('Symbol') ?? -1
  const profitIndex = headerMap.get('Profit') ?? -1
  const durationIndex = headerMap.get('Duration (DD:HH:MM:SS)') ?? -1
  const openDateIndex = headerMap.get('Open Date') ?? -1
  const closeDateIndex = headerMap.get('Close Date') ?? -1

  if (actionIndex === -1 || profitIndex === -1) return []

  return lines.slice(1).flatMap((line, offset): ParsedStatementRow[] => {
    if (!line.trim()) return []
    const cells = splitCsvLine(line, delimiter)
    const action = (cells[actionIndex] ?? '').trim()
    const symbol = symbolIndex >= 0 ? (cells[symbolIndex] ?? '').trim() : ''
    if (symbol.toUpperCase() === 'SUMMAR') return []

    const openDate = openDateIndex >= 0 ? (cells[openDateIndex] ?? '').trim() : ''
    const closeDate = closeDateIndex >= 0 ? (cells[closeDateIndex] ?? '').trim() : ''
    const isCashFlow = isCashFlowAction(action)
    if (!isCashFlow && !closeDate) return []

    const timestamp = parseMyfxbookTimestamp(closeDate || openDate)
    if (!Number.isFinite(timestamp)) return []

    return [{
      originalIndex: offset + 1,
      timestamp,
      entryTimestamp: parseMyfxbookTimestamp(openDate),
      action,
      symbol,
      profit: parseNumber(cells[profitIndex] ?? '0'),
      kind: isCashFlow ? 'cashflow' : 'trade',
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

    const comment = commentIndex >= 0 ? String(cells[commentIndex] ?? '').trim().toLowerCase() : ''
    if (comment.includes('cancel')) return []

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
      durationHours: calculateDurationHours(parseMqlTimestamp(openTime), timestamp)
    }]
  })
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

function countInitialCashflowsBeforeFirstTrade(rows: ParsedStatementRow[]) {
  const firstTradeIndex = rows.findIndex((row) => row.kind === 'trade')
  if (firstTradeIndex <= 0) return Math.max(firstTradeIndex, 0)

  return rows
    .slice(0, firstTradeIndex)
    .every((row) => row.kind === 'cashflow')
    ? firstTradeIndex
    : 0
}

function detectSourceKind(sourceFile: string): 'myfxbook' | 'mql4' | 'mql5' {
  if (sourceFile.startsWith('/data/mql5/')) return 'mql5'
  if (sourceFile.startsWith('/data/mql4/')) return 'mql4'
  return 'myfxbook'
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

  if (!isValidDateParts(year, month, day, hours, minutes, 0)) return Number.NaN
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

  if (!isValidDateParts(year, month, day, hours, minutes, seconds)) return Number.NaN
  return new Date(year, month - 1, day, hours, minutes, seconds, 0).getTime()
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
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return 0

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

function compoundReturns(returns: number[]) {
  return (returns.reduce((equity, returnPct) => equity * (1 + returnPct / 100), 1) - 1) * 100
}

function compoundFromAverage(expectancyPct: number, trades: number) {
  if (!Number.isFinite(expectancyPct) || trades <= 0) return 0
  return (Math.pow(1 + expectancyPct / 100, trades) - 1) * 100
}

function calculateTradeFrequencyPerWeek(trades: PreparedTrade[]) {
  if (trades.length < 2) return trades.length
  const firstDate = trades[0]?.entryTimestamp ?? trades[0]?.timestamp ?? 0
  const lastDate = trades[trades.length - 1]?.timestamp ?? firstDate
  const weeks = Math.max((lastDate - firstDate) / (7 * 86400000), 1 / 7)
  return trades.length / weeks
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

function calculateMaxStreak(values: boolean[]) {
  let current = 0
  let max = 0
  for (const value of values) {
    if (value) {
      current += 1
      max = Math.max(max, current)
    } else {
      current = 0
    }
  }
  return max
}

function comparePhase(left: StructuralBlock['phase'], right: StructuralBlock['phase']) {
  if (left === right) return 0
  if ((left === 'impulse-up' && right === 'recovery') || (left === 'recovery' && right === 'impulse-up')) return 0.35
  if (left === 'range' || right === 'range') return 0.7
  return 1
}

function normalizedDifference(left: number, right: number, floor = 1) {
  const scale = Math.max((Math.abs(left) + Math.abs(right)) / 2, floor)
  return Math.abs(left - right) / scale
}

function ratioDistance(left: number, right: number, floor = 0.1) {
  const safeLeft = Math.abs(left) + floor
  const safeRight = Math.abs(right) + floor
  return Math.abs(Math.log(safeLeft / safeRight))
}

function ratioScore(left: number, right: number, floor = 0.1) {
  return Math.exp(-ratioDistance(left, right, floor))
}

function confidenceLabel(score: number): PatternForecastConfidence {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

function calculateConfidenceScore(params: {
  userTrades: number
  userBlocks: number
  matches: number
  sourceFiles: number
  averageStyleScore: number
  medianDistance: number
}) {
  const tradeScore = clamp(params.userTrades / 40, 0, 1)
  const blockScore = clamp(params.userBlocks / 3, 0, 1)
  const matchScore = clamp(params.matches / MAX_MATCHES, 0, 1)
  const fileScore = clamp(params.sourceFiles / 25, 0, 1)
  const styleScore = clamp(params.averageStyleScore, 0, 1)
  const distanceScore = clamp(1 - params.medianDistance / 2.5, 0, 1)

  return Math.round((
    tradeScore * 0.2 +
    blockScore * 0.15 +
    matchScore * 0.2 +
    fileScore * 0.15 +
    styleScore * 0.15 +
    distanceScore * 0.15
  ) * 100)
}

function buildMatchWeights(matches: PatternMatch[]) {
  const raw = matches.map((match) => Math.exp(-match.distance / 0.85) * Math.max(match.styleScore, 0.05))
  const total = sum(raw)
  if (!(total > 0)) {
    return matches.map(() => 1 / Math.max(matches.length, 1))
  }
  return raw.map((value) => value / total)
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

function weightedQuantile(values: number[], weights: number[], percentile: number) {
  if (!values.length) return 0
  const pairs = values
    .map((value, index) => ({ value, weight: Math.max(weights[index] ?? 0, 0) }))
    .filter((pair) => Number.isFinite(pair.value) && Number.isFinite(pair.weight))
    .sort((left, right) => left.value - right.value)
  if (!pairs.length) return 0

  const totalWeight = sum(pairs.map((pair) => pair.weight))
  if (!(totalWeight > 0)) return quantile(values, percentile)

  const threshold = totalWeight * percentile
  let cumulative = 0
  for (const pair of pairs) {
    cumulative += pair.weight
    if (cumulative >= threshold) return pair.value
  }
  return pairs[pairs.length - 1]?.value ?? 0
}

function weightedAverage(values: number[], weights: number[], fallback = 0) {
  if (!values.length || values.length !== weights.length) return values.length ? average(values) : fallback
  let weightedSum = 0
  let weightSum = 0
  values.forEach((value, index) => {
    const weight = weights[index] ?? 0
    if (!Number.isFinite(value) || !Number.isFinite(weight)) return
    weightedSum += value * weight
    weightSum += weight
  })
  return weightSum > 0 ? weightedSum / weightSum : fallback
}

function sumByWeights(flags: boolean[], weights: number[]) {
  if (!flags.length || flags.length !== weights.length) return 0
  let total = 0
  let positive = 0
  weights.forEach((weight, index) => {
    const safeWeight = Math.max(weight ?? 0, 0)
    total += safeWeight
    if (flags[index]) positive += safeWeight
  })
  return total > 0 ? (positive / total) * 100 : 0
}

function average(values: number[]) {
  const valid = values.filter(Number.isFinite)
  return valid.length ? sum(valid) / valid.length : 0
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function percentage(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0
}

function finitePositive(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function maxInArray(values: number[]) {
  let max = Number.NEGATIVE_INFINITY
  for (const value of values) {
    if (value > max) max = value
  }
  return Number.isFinite(max) ? max : 0
}

function minInArray(values: number[]) {
  let min = Number.POSITIVE_INFINITY
  for (const value of values) {
    if (value < min) min = value
  }
  return Number.isFinite(min) ? min : 0
}

function classifyTradingStyle(durationHours: number) {
  if (durationHours < 4) return 'Scalp / Intraday'
  if (durationHours < 48) return 'Intraday / Short Swing'
  if (durationHours < 240) return 'Swing'
  return 'Position / Long Swing'
}

function phaseTitle(phase: StructuralBlock['phase']) {
  if (phase === 'impulse-up') return 'Impulse'
  if (phase === 'drawdown') return 'Drawdown'
  if (phase === 'recovery') return 'Recovery'
  return 'Range'
}

function compactFileLabel(sourceFile: string) {
  const segments = sourceFile.split('/')
  return segments.slice(-2).join('/')
}

function toBlockView(block: StructuralBlock, trades: PreparedTrade[]): PatternForecastBlockView {
  const firstTrade = trades[block.startTradeIndex]
  const lastTrade = trades[block.endTradeIndex]

  return {
    phase: block.phase,
    tradeCount: block.tradeCount,
    returnPct: block.returnPct,
    averageDurationHours: block.averageDurationHours,
    winRate: block.winRate,
    firstCloseTimestamp: Number.isFinite(firstTrade?.timestamp) ? Number(firstTrade.timestamp) : Number.NaN,
    lastCloseTimestamp: Number.isFinite(lastTrade?.timestamp) ? Number(lastTrade.timestamp) : Number.NaN
  }
}

function detectSourceGroup(sourceFile: string): 'mql4' | 'mql5' | 'myfxbook' {
  if (sourceFile.includes('/data/mql4/')) return 'mql4'
  if (sourceFile.includes('/data/mql5/')) return 'mql5'
  return 'myfxbook'
}

function buildDiverseTopMatches(matches: PatternMatch[], limit: number) {
  const selected: PatternMatch[] = []
  const selectedKeys = new Set<string>()
  const desiredGroups: Array<'mql4' | 'mql5' | 'myfxbook'> = ['mql4', 'mql5', 'myfxbook']

  for (const group of desiredGroups) {
    const groupMatch = matches.find((match) => detectSourceGroup(match.sourceFile) === group)
    if (!groupMatch) continue

    const key = `${groupMatch.sourceFile}:${groupMatch.matchedPhaseLabel}:${groupMatch.distance}`
    if (selectedKeys.has(key)) continue

    selected.push(groupMatch)
    selectedKeys.add(key)
    if (selected.length >= limit) {
      return selected
    }
  }

  for (const match of matches) {
    const key = `${match.sourceFile}:${match.matchedPhaseLabel}:${match.distance}`
    if (selectedKeys.has(key)) continue

    selected.push(match)
    selectedKeys.add(key)
    if (selected.length >= limit) break
  }

  return selected
}
