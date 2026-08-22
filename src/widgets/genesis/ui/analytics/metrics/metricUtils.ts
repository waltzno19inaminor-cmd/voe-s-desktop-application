import type { MetricComputationResult } from '~/entities/metric'

export const parseFiniteMetricNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

export const parsePositiveMetricNumber = (value: unknown): number | null => {
  const parsed = parseFiniteMetricNumber(value)
  return parsed !== null && parsed > 0 ? parsed : null
}

export const createUnavailableMetricResult = (
  locale: 'ru' | 'en',
  reason?: string
): MetricComputationResult => {
  const isRu = locale === 'ru'
  return {
    rawValue: null,
    formattedValue: 'N/A',
    status: 'neutral',
    evaluationText: reason || (isRu ? 'Недостаточно данных' : 'Insufficient Data'),
    evalClass: 'text-gray-400',
    benchmarkText: isRu ? 'Требуются валидные входные данные' : 'Valid inputs required',
    benchmarks: [],
    progress: 0,
    colorVal: '#9ca3af'
  }
}

export const getPositiveTradeLevels = (trade: any) => {
  return {
    entry: parsePositiveMetricNumber(trade?.entry),
    stopLoss: parsePositiveMetricNumber(trade?.stopLoss ?? trade?.sl),
    takeProfit: parsePositiveMetricNumber(trade?.takeProfit ?? trade?.tp)
  }
}

export const getValidTradeRiskReward = (trade: any): number | null => {
  const { entry, stopLoss, takeProfit } = getPositiveTradeLevels(trade)
  if (entry === null || stopLoss === null || takeProfit === null) return null

  const side = String(trade?.side || trade?.direction || '').toLowerCase()
  const isShort = side.includes('short') || side.includes('sell')
  const risk = isShort ? stopLoss - entry : entry - stopLoss
  const reward = isShort ? entry - takeProfit : takeProfit - entry
  return risk > 0 && reward > 0 ? reward / risk : null
}

export const getConditionIdentity = (condition: any) => {
  if (typeof condition === 'string') return condition.toLowerCase()
  return String(
    condition?.id ??
    condition?.info?.id ??
    condition?.name ??
    condition?.label ??
    condition?.info?.name ??
    ''
  ).toLowerCase()
}

export const getEntryRequiredConditionSnapshot = (trade: any) => {
  const directSnapshot = trade?.boardRequiredConditionsEntry
  if (Array.isArray(directSnapshot) && directSnapshot.length > 0) return directSnapshot

  const scenarioSnapshot = trade?.boardScenarioEntry?.info?.requiredConditions
  if (Array.isArray(scenarioSnapshot) && scenarioSnapshot.length > 0) return scenarioSnapshot

  const legacyConditions = trade?.boardScenarioEntry?.info?.conditions
  if (Array.isArray(legacyConditions) && legacyConditions.length > 0) {
    return legacyConditions.filter((condition: any) => (
      condition?.info?.priority === 'REQUIRED' ||
      condition?.priority === 'REQUIRED'
    ))
  }

  const scenarioConditions = Array.isArray(trade?.scenarios)
    ? trade.scenarios.flatMap((scenario: any) => scenario?.conditions || [])
    : []
  return scenarioConditions.filter((condition: any) => (
    condition?.info?.priority === 'REQUIRED' ||
    condition?.priority === 'REQUIRED' ||
    condition?.required === true
  ))
}

export const getEntryExecutedConditions = (trade: any) => {
  if (Array.isArray(trade?.boardConditions) && trade.boardConditions.length > 0) return trade.boardConditions

  const scenarioExecuted = trade?.boardScenarioEntry?.info?.conditions
  if (Array.isArray(scenarioExecuted)) return scenarioExecuted

  if (Array.isArray(trade?.conditions)) return trade.conditions

  return Array.isArray(trade?.scenarios)
    ? trade.scenarios.flatMap((scenario: any) => scenario?.conditions || [])
    : []
}

export const getRequiredConditionStats = (trade: any) => {
  const required = getEntryRequiredConditionSnapshot(trade)
  const executedKeys = new Set(getEntryExecutedConditions(trade).map(getConditionIdentity).filter(Boolean))
  const used = required.filter((condition: any) => executedKeys.has(getConditionIdentity(condition))).length
  return { used, total: required.length, ratio: required.length > 0 ? (used / required.length) * 100 : null }
}

export const getActiveConditionCount = (trade: any) => {
  const executed = getEntryExecutedConditions(trade)
  return executed.length > 0 ? executed.length : getEntryRequiredConditionSnapshot(trade).length
}
