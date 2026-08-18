import type { TradeLike } from './tradeMetrics'

export interface AssetTradeAggregate {
  key: string
  ticker: string
  tradeCount: number
  pnl: number
}

export const aggregateTradesByAsset = (
  trades: TradeLike[],
  resolveTicker: (trade: TradeLike) => string,
  getPnl: (trade: TradeLike) => number
): AssetTradeAggregate[] => {
  const aggregates = new Map<string, AssetTradeAggregate>()

  trades
    .filter(trade => !trade?.isCore && !trade?.isNote && !trade?.isScenario)
    .forEach((trade, index) => {
      const ticker = resolveTicker(trade)
      const key = ticker.toUpperCase()
      const existing = aggregates.get(key)
      if (existing) {
        existing.tradeCount += 1
        existing.pnl += getPnl(trade)
        return
      }
      aggregates.set(key, { key: `${key}-${index}`, ticker, tradeCount: 1, pnl: getPnl(trade) })
    })

  return Array.from(aggregates.values()).sort((left, right) => {
    if (right.tradeCount !== left.tradeCount) return right.tradeCount - left.tradeCount
    return right.pnl - left.pnl
  })
}

export const interpolateRgbStops = (stops: Array<[number, number, number]>, ratio: number) => {
  const safeRatio = Math.min(1, Math.max(0, ratio))
  const segmentCount = stops.length - 1
  const scaledRatio = safeRatio * segmentCount
  const segmentIndex = Math.min(segmentCount - 1, Math.floor(scaledRatio))
  const segmentRatio = scaledRatio - segmentIndex
  const from = stops[segmentIndex]!
  const to = stops[segmentIndex + 1]!
  const channels = from.map((channel, index) => Math.round(channel + (to[index]! - channel) * segmentRatio))
  return `rgb(${channels.join(' ')})`
}

export const getAssetHeatmapColor = (pnl: number, maxPositivePnl: number, maxNegativeMagnitude: number) => {
  const lossStops: Array<[number, number, number]> = [[55, 65, 81], [127, 29, 29], [220, 38, 38], [255, 31, 31]]
  const profitStops: Array<[number, number, number]> = [[55, 65, 81], [20, 83, 45], [22, 163, 74], [0, 230, 118]]
  if (pnl < 0) return interpolateRgbStops(lossStops, maxNegativeMagnitude ? Math.abs(pnl) / maxNegativeMagnitude : 0)
  if (pnl > 0) return interpolateRgbStops(profitStops, maxPositivePnl ? pnl / maxPositivePnl : 1)
  return '#374151'
}

