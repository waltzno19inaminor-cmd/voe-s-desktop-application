export type EquityMapTrade = Record<string, any>

export type EquityMapPoint = {
  index: number
  pnl: number
  equity: number
  highWater: number
  drawdown: number
  timestamp: number
  trade: EquityMapTrade
}

export type EquityMapZone = {
  id: string
  kind: 'period' | 'drawdown'
  startIndex: number
  endIndex: number
  value?: number
}

export type EquityMapMarker = {
  id: string
  kind: 'top' | 'bottom'
  index: number
  value: number
}

export type EquityStabilityMapModel = {
  points: EquityMapPoint[]
  periods: EquityMapZone[]
  drawdowns: EquityMapZone[]
  extremes: EquityMapMarker[]
}

import { detectRealDrawdownPeriods } from './drawdownPeriods'

const finite = (value: unknown): number | null => {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const timestampOf = (trade: EquityMapTrade): number => {
  const raw = trade?.dateExit ?? trade?.exitTime ?? trade?.date ?? trade?.entryTime ?? trade?.createdAt
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  const timestamp = new Date(raw ?? '').getTime()
  return Number.isFinite(timestamp) ? timestamp : Number.NaN
}

export const buildEquityStabilityMap = (
  trades: EquityMapTrade[],
  getTradePnl: (trade: EquityMapTrade) => number
): EquityStabilityMapModel => {
  const ordered = trades
    .map((trade, sourceIndex) => ({ trade, sourceIndex, timestamp: timestampOf(trade), pnl: finite(getTradePnl(trade)) }))
    .filter(item => item.pnl !== null)
    .sort((a, b) => {
      if (Number.isFinite(a.timestamp) && Number.isFinite(b.timestamp)) return a.timestamp - b.timestamp
      if (Number.isFinite(a.timestamp)) return -1
      if (Number.isFinite(b.timestamp)) return 1
      return a.sourceIndex - b.sourceIndex
    })

  let equity = 0
  let highWater = 0
  const points: EquityMapPoint[] = ordered.map((item, index) => {
    equity += item.pnl ?? 0
    highWater = Math.max(highWater, equity)
    return {
      index,
      pnl: item.pnl ?? 0,
      equity,
      highWater,
      drawdown: Math.max(0, highWater - equity),
      timestamp: item.timestamp,
      trade: item.trade
    }
  })

  const partCount = points.length >= 20 ? 4 : 2
  const partSize = Math.max(1, Math.ceil(points.length / partCount))
  const periods: EquityMapZone[] = Array.from({ length: partCount }, (_, index) => {
    const startIndex = index * partSize
    const endIndex = Math.min(points.length - 1, (index + 1) * partSize - 1)
    return { id: `period-${index + 1}`, kind: 'period', startIndex, endIndex }
  }).filter(zone => zone.startIndex <= zone.endIndex)

  const drawdowns: EquityMapZone[] = detectRealDrawdownPeriods(points).map(period => ({
    id: period.id,
    kind: 'drawdown',
    // Include the preceding high-water point so the painted span starts at
    // the actual peak from which the decline begins.
    startIndex: Math.max(0, period.startIndex - 1),
    // Render only the peak-to-trough decline. The recovery remains part of
    // the analytical period, but should not be painted as a falling zone.
    endIndex: period.bottomIndex,
    value: period.depth
  }))

  const extremes: EquityMapMarker[] = []
  if (points.length >= 8) {
    const count = Math.max(1, Math.ceil(points.length * 0.05))
    const byPnl = [...points].sort((a, b) => a.pnl - b.pnl)
    byPnl.slice(0, count).forEach(point => extremes.push({ id: `bottom-${point.index}`, kind: 'bottom', index: point.index, value: point.pnl }))
    byPnl.slice(-count).forEach(point => extremes.push({ id: `top-${point.index}`, kind: 'top', index: point.index, value: point.pnl }))
  }

  return { points, periods, drawdowns, extremes }
}
