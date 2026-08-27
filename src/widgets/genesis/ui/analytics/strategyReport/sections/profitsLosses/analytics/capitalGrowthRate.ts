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
