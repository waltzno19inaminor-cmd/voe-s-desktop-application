import { orderEquityMapTrades, type EquityMapTrade } from '../../../../robustnessEquityMap/equityStabilityMap'

export type CapitalGrowthRatePoint = {
  index: number
  asset: string
  tradeRatePct: number
  rollingRatePct: number
  pnl: number
  equity: number
}

export type CapitalGrowthRateModel = {
  points: CapitalGrowthRatePoint[]
  rollingWindow: number
}

export type CapitalGrowthRateGroup = {
  id: string
  name: string
  trades: number
  frequency: number
  averageRate: number
  maxRate: number
  minRate: number
  contribution: number
}

export type CapitalGrowthRateBreakdown = {
  scenarios: CapitalGrowthRateGroup[]
  conditions: CapitalGrowthRateGroup[]
}

const safeCapital = (value: number) => Number.isFinite(value) && Math.abs(value) > 1e-9 ? Math.abs(value) : 1000

const resolveAsset = (trade: EquityMapTrade): string => {
  const value = trade?.asset ?? trade?.symbol ?? trade?.ticker ?? trade?.label
    ?? trade?.trade?.asset ?? trade?.trade?.symbol ?? trade?.trade?.ticker ?? trade?.trade?.label
  const asset = String(value ?? 'UNKNOWN')
    .split('[')[0]!
    .split('|')[0]!
    .trim()
    .toUpperCase()

  return asset || 'UNKNOWN'
}

const identity = (value: any): string => typeof value === 'string' ? value.trim().toLowerCase() : String(
  value?.id ?? value?.info?.id ?? value?.name ?? value?.label ?? value?.info?.name ?? ''
).trim().toLowerCase()

const displayName = (value: any): string => typeof value === 'string' ? value.trim() : String(
  value?.info?.customName ?? value?.info?.name ?? value?.name ?? value?.label ?? value?.id ?? ''
).trim()

const uniqueNamedValues = (values: any[]): Array<{ id: string; name: string }> => {
  const unique = new Map<string, string>()
  values.forEach(value => {
    const id = identity(value)
    const name = displayName(value)
    if (id && name && !unique.has(id)) unique.set(id, name)
  })
  return [...unique.entries()].map(([id, name]) => ({ id, name }))
}

const scenarioValues = (trade: EquityMapTrade) => uniqueNamedValues([
  trade?.boardScenarioEntry,
  trade?.boardScenarioExit
].filter(Boolean))

const conditionValues = (trade: EquityMapTrade) => {
  const values: any[] = []
  if (Array.isArray(trade?.boardConditions)) values.push(...trade.boardConditions)
  if (Array.isArray(trade?.boardScenarioEntry?.info?.conditions)) values.push(...trade.boardScenarioEntry.info.conditions)
  if (Array.isArray(trade?.boardScenarioExit?.info?.conditions)) values.push(...trade.boardScenarioExit.info.conditions)
  return uniqueNamedValues(values)
}

const finalizeGroups = (
  groups: Map<string, { name: string; rates: number[]; pnl: number }>,
  totalTrades: number,
  initialCapital: number
): CapitalGrowthRateGroup[] => [...groups.entries()]
  .map(([id, group]) => ({
    id,
    name: group.name,
    trades: group.rates.length,
    frequency: totalTrades ? group.rates.length / totalTrades * 100 : 0,
    averageRate: group.rates.reduce((sum, value) => sum + value, 0) / group.rates.length,
    maxRate: Math.max(...group.rates),
    minRate: Math.min(...group.rates),
    contribution: group.pnl / initialCapital * 100
  }))
  .sort((a, b) => b.frequency - a.frequency || a.name.localeCompare(b.name))

export const buildCapitalGrowthBreakdown = (
  trades: EquityMapTrade[],
  getTradePnl: (trade: EquityMapTrade) => number,
  initialCapital = 1000
): CapitalGrowthRateBreakdown => {
  const ordered = orderEquityMapTrades(trades, getTradePnl)
  const capital = safeCapital(initialCapital)
  let equity = capital
  const scenarios = new Map<string, { name: string; rates: number[]; pnl: number }>()
  const conditions = new Map<string, { name: string; rates: number[]; pnl: number }>()

  ordered.forEach(item => {
    const rate = item.pnl / safeCapital(equity) * 100
    equity += item.pnl

    const addToGroups = (
      groups: Map<string, { name: string; rates: number[]; pnl: number }>,
      values: Array<{ id: string; name: string }>
    ) => values.forEach(({ id, name }) => {
      const group = groups.get(id) ?? { name, rates: [], pnl: 0 }
      group.rates.push(rate)
      group.pnl += item.pnl
      groups.set(id, group)
    })

    addToGroups(scenarios, scenarioValues(item.trade))
    addToGroups(conditions, conditionValues(item.trade))
  })

  return {
    scenarios: finalizeGroups(scenarios, ordered.length, capital),
    conditions: finalizeGroups(conditions, ordered.length, capital)
  }
}

export const buildCapitalGrowthRate = (
  trades: EquityMapTrade[],
  getTradePnl: (trade: EquityMapTrade) => number,
  initialCapital = 1000,
  rollingWindow = 10
): CapitalGrowthRateModel => {
  const ordered = orderEquityMapTrades(trades, getTradePnl)
  const window = Math.max(1, Math.min(Math.floor(rollingWindow), Math.max(1, ordered.length)))
  const capital = safeCapital(initialCapital)
  let equity = capital
  const tradeRates: number[] = []

  const points = ordered.map((item, index) => {
    const tradeRatePct = item.pnl / safeCapital(equity) * 100
    equity += item.pnl
    tradeRates.push(tradeRatePct)
    const recentRates = tradeRates.slice(-window)
    const rollingRatePct = recentRates.reduce((sum, value) => sum + value, 0) / recentRates.length
    return { index, asset: resolveAsset(item.trade), tradeRatePct, rollingRatePct, pnl: item.pnl, equity }
  })

  return { points, rollingWindow: window }
}
