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

export type CapitalSidePerformance = {
  side: 'long' | 'short'
  trades: number
  distribution: number
  winRate: number | null
  returnRate: number
}

export type CapitalAssetPerformance = {
  id: string
  asset: string
  trades: number
  frequency: number
  pnl: number
  winRate: number | null
  returnRate: number
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

const resolveSide = (trade: EquityMapTrade): 'long' | 'short' | null => {
  const value = trade?.side ?? trade?.direction ?? trade?.positionSide
    ?? trade?.trade?.side ?? trade?.trade?.direction ?? trade?.trade?.positionSide
  const side = String(value ?? '').trim().toLowerCase()
  if (side.includes('short') || side.includes('sell')) return 'short'
  if (side.includes('long') || side.includes('buy')) return 'long'
  return null
}

export const buildCapitalSidePerformance = (
  trades: EquityMapTrade[],
  getTradePnl: (trade: EquityMapTrade) => number,
  initialCapital = 1000
): CapitalSidePerformance[] => {
  const ordered = orderEquityMapTrades(trades, getTradePnl)
  const capital = safeCapital(initialCapital)
  const groups = new Map<'long' | 'short', { trades: number; wins: number; pnl: number }>([
    ['long', { trades: 0, wins: 0, pnl: 0 }],
    ['short', { trades: 0, wins: 0, pnl: 0 }]
  ])

  ordered.forEach(item => {
    const side = resolveSide(item.trade)
    if (!side) return
    const group = groups.get(side)!
    group.trades += 1
    group.wins += item.pnl > 0 ? 1 : 0
    group.pnl += item.pnl
  })

  const classifiedTrades = [...groups.values()].reduce((sum, group) => sum + group.trades, 0)
  if (!classifiedTrades) return []

  return (['long', 'short'] as const).map(side => {
    const group = groups.get(side)!
    return {
      side,
      trades: group.trades,
      distribution: group.trades / classifiedTrades * 100,
      winRate: group.trades ? group.wins / group.trades * 100 : null,
      returnRate: group.pnl / capital * 100
    }
  })
}

export const buildCapitalAssetPerformance = (
  trades: EquityMapTrade[],
  getTradePnl: (trade: EquityMapTrade) => number,
  initialCapital = 1000
): CapitalAssetPerformance[] => {
  const ordered = orderEquityMapTrades(trades, getTradePnl)
  const capital = safeCapital(initialCapital)
  const groups = new Map<string, { asset: string; trades: number; wins: number; pnl: number }>()

  ordered.forEach(item => {
    const asset = resolveAsset(item.trade)
    const group = groups.get(asset) ?? { asset, trades: 0, wins: 0, pnl: 0 }
    group.trades += 1
    group.wins += item.pnl > 0 ? 1 : 0
    group.pnl += item.pnl
    groups.set(asset, group)
  })

  return [...groups.values()]
    .map(group => ({
      id: group.asset,
      asset: group.asset,
      trades: group.trades,
      frequency: ordered.length ? group.trades / ordered.length * 100 : 0,
      pnl: group.pnl,
      winRate: group.trades ? group.wins / group.trades * 100 : null,
      returnRate: group.pnl / capital * 100
    }))
    .sort((a, b) => b.trades - a.trades || b.pnl - a.pnl || a.asset.localeCompare(b.asset))
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
