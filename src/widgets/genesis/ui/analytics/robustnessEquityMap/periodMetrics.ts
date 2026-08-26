import { getTradePlannedStopRiskDollars } from '~/widgets/genesis/model/tradeRisk'
import { getTradeRealizedR, getTradeRiskReward, getTradeDurationHours } from '~/widgets/genesis/model/metrics/tradeMetrics'
import { orderEquityMapTrades, type EquityMapTrade, type EquityMapZone } from './equityStabilityMap'

export type PeriodMetricItem = {
  id: string
  name: string
  trades: number
  winRate: number | null
  pnl: number
  averagePnl: number | null
}

export type PeriodMetrics = {
  periodId: string
  periodStartIndex: number
  periodEndIndex: number
  pnl: number
  totalR: number | null
  averageR: number | null
  winRate: number | null
  averageTrade: number | null
  tradeCount: number
  averageDurationHours: number | null
  stopLossDistance: number | null
  takeProfitDistance: number | null
  risk: number | null
  reward: number | null
  plannedRiskReward: number | null
  scenarios: PeriodMetricItem[]
  conditions: PeriodMetricItem[]
}

const finite = (value: unknown): number | null => {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const mean = (values: number[]): number | null => values.length
  ? values.reduce((sum, value) => sum + value, 0) / values.length
  : null

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

const summarizeGroups = (
  entries: Array<{ trade: EquityMapTrade; pnl: number }>,
  getValues: (trade: EquityMapTrade) => Array<{ id: string; name: string }>
): PeriodMetricItem[] => {
  const groups = new Map<string, { name: string; pnls: number[] }>()
  entries.forEach(({ trade, pnl }) => {
    getValues(trade).forEach(({ id, name }) => {
      const group = groups.get(id) ?? { name, pnls: [] }
      group.pnls.push(pnl)
      groups.set(id, group)
    })
  })

  return [...groups.entries()]
    .map(([id, group]) => ({
      id,
      name: group.name,
      trades: group.pnls.length,
      winRate: group.pnls.length ? group.pnls.filter(pnl => pnl > 0).length / group.pnls.length * 100 : null,
      pnl: group.pnls.reduce((sum, pnl) => sum + pnl, 0),
      averagePnl: mean(group.pnls)
    }))
    .sort((a, b) => b.trades - a.trades || a.name.localeCompare(b.name))
}

const averagePositive = (values: Array<number | null>): number | null => mean(values.filter((value): value is number => value !== null && value > 0))

export const calculatePeriodMetrics = (
  trades: EquityMapTrade[],
  period: EquityMapZone | null | undefined,
  getTradePnl: (trade: EquityMapTrade) => number,
  initialCapital = 1000
): PeriodMetrics | null => {
  if (!period) return null
  const ordered = orderEquityMapTrades(trades, getTradePnl)
  const entries = ordered
    .slice(Math.max(0, period.startIndex), Math.min(ordered.length, period.endIndex + 1))
    .map(item => ({ trade: item.trade, pnl: item.pnl }))

  const pnls = entries.map(entry => entry.pnl)
  const realizedRs = entries.map(entry => {
    const hasRData = ['realizedR', 'rMultiple'].some(key => finite(entry.trade?.[key]) !== null)
      || ['entry', 'stopLoss', 'sl', 'exit', 'exitPrice'].every(key => finite(entry.trade?.[key]) !== null)
    return hasRData ? finite(getTradeRealizedR(entry.trade, initialCapital)) : null
  }).filter((value): value is number => value !== null)

  const stopLossDistances = entries.map(({ trade }) => {
    const entry = finite(trade?.entry)
    const stop = finite(trade?.stopLoss ?? trade?.sl)
    return entry !== null && stop !== null && entry > 0 && stop > 0 ? Math.abs(entry - stop) : null
  })
  const takeProfitDistances = entries.map(({ trade }) => {
    const entry = finite(trade?.entry)
    const target = finite(trade?.takeProfit ?? trade?.tp)
    return entry !== null && target !== null && entry > 0 && target > 0 ? Math.abs(target - entry) : null
  })
  const risks = entries.map(({ trade }) => {
    const plannedRisk = getTradePlannedStopRiskDollars(trade)
    const storedRisk = finite(trade?.risk ?? trade?.riskPerTrade ?? trade?.riskPerTradeValue)
    return Number.isFinite(plannedRisk) && plannedRisk > 0 ? plannedRisk : storedRisk
  })
  const rewards = entries.map(({ trade }, index) => {
    const risk = risks[index]
    const rr = finite(trade?.riskReward ?? trade?.riskRewardRatio ?? trade?.plannedRiskReward) ?? getTradeRiskReward(trade)
    if (risk !== null && risk > 0 && Number.isFinite(rr) && rr > 0) return risk * rr
    return takeProfitDistances[index]
  })
  const riskRewards = entries.map(({ trade }) => {
    const direct = finite(trade?.riskReward ?? trade?.riskRewardRatio ?? trade?.plannedRiskReward)
    const derived = getTradeRiskReward(trade)
    return direct !== null && direct > 0 ? direct : Number.isFinite(derived) ? derived : null
  })

  return {
    periodId: period.id,
    periodStartIndex: period.startIndex,
    periodEndIndex: period.endIndex,
    pnl: pnls.reduce((sum, pnl) => sum + pnl, 0),
    totalR: realizedRs.length ? realizedRs.reduce((sum, value) => sum + value, 0) : null,
    averageR: mean(realizedRs),
    winRate: pnls.length ? pnls.filter(pnl => pnl > 0).length / pnls.length * 100 : null,
    averageTrade: mean(pnls),
    tradeCount: pnls.length,
    averageDurationHours: mean(entries.map(({ trade }) => getTradeDurationHours(trade)).filter(Number.isFinite)),
    stopLossDistance: averagePositive(stopLossDistances),
    takeProfitDistance: averagePositive(takeProfitDistances),
    risk: averagePositive(risks),
    reward: averagePositive(rewards),
    plannedRiskReward: averagePositive(riskRewards),
    scenarios: summarizeGroups(entries, scenarioValues),
    conditions: summarizeGroups(entries, conditionValues)
  }
}
