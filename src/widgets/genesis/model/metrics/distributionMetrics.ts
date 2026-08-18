import type { TradeLike } from './tradeMetrics'

export type DistributionMetricMode = 'pnl' | 'score'

export interface DistributionBar {
  id: string | number
  trade: TradeLike
  pnl: number
  value: number
  asset: string
  height: number
  opacity: number
  label: string
}

export const buildTradeDistributionBars = ({
  trades,
  mode,
  getPnl,
  getScore,
  formatValue
}: {
  trades: TradeLike[]
  mode: DistributionMetricMode
  getPnl: (trade: TradeLike) => number
  getScore: (trade: TradeLike) => number
  formatValue: (value: number, withMetricLabel: boolean) => string
}): DistributionBar[] => {
  const rows = trades
    .map((trade) => ({
      trade,
      pnl: getPnl(trade),
      value: mode === 'score' ? getScore(trade) : getPnl(trade)
    }))
    .sort((left, right) => mode === 'score' ? right.value - left.value : left.value - right.value)

  const maxAbsValue = Math.max(1, ...rows.map(row => Math.abs(row.value)))
  return rows.map((row, index) => {
    const normalized = mode === 'score'
      ? Math.min(Math.max(row.value / 100, 0), 1)
      : Math.abs(row.value) / maxAbsValue
    const asset = String(row.trade?.asset || row.trade?.symbol || 'UNKNOWN').toUpperCase()
    return {
      id: row.trade?.id || `${asset}-${index}`,
      trade: row.trade,
      pnl: row.pnl,
      value: row.value,
      asset,
      height: Math.max(3, normalized * 100),
      opacity: mode === 'score' ? Math.min(1, 0.18 + normalized * 0.72) : Math.min(1, 0.45 + normalized * 0.55),
      label: `${asset} ${formatValue(row.value, mode === 'score')}`
    }
  })
}

export const getDistributionStats = (bars: Array<{ value: number }>) => {
  const values = bars.map(bar => bar.value)
  return values.length
    ? { count: values.length, min: Math.min(...values), max: Math.max(...values) }
    : { count: 0, min: 0, max: 0 }
}

