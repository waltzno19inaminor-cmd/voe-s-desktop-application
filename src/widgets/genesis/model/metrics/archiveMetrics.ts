import { isClosedTradeForMetrics } from '~/widgets/genesis/model/tradePnl'
import {
  buildEquityCurve,
  getTradePnl,
  getTradeRealizedR,
  getTradeTimelineTimestamp,
  type TradeLike
} from './tradeMetrics'

export const buildArchiveMetrics = (trades: TradeLike[], initialCapital = 1000) => {
  const closedTrades = trades.filter(isClosedTradeForMetrics)
  const getPnl = (trade: TradeLike) => isClosedTradeForMetrics(trade) ? getTradePnl(trade, initialCapital) : 0
  const getR = (trade: TradeLike) => isClosedTradeForMetrics(trade) ? getTradeRealizedR(trade, initialCapital) : 0
  const totalPnl = closedTrades.reduce((sum, trade) => sum + getPnl(trade), 0)
  const totalR = closedTrades.reduce((sum, trade) => sum + getR(trade), 0)

  return {
    closedTrades,
    totalPnl,
    totalR,
    winRate: closedTrades.length ? closedTrades.filter(trade => getPnl(trade) > 0).length / closedTrades.length : 0,
    avgR: closedTrades.length ? totalR / closedTrades.length : 0,
    getPnl,
    getR
  }
}

export const groupArchiveTradesByMonth = (
  trades: TradeLike[],
  initialCapital: number,
  locale: string
) => {
  const getPnl = (trade: TradeLike) => isClosedTradeForMetrics(trade) ? getTradePnl(trade, initialCapital) : 0
  const getR = (trade: TradeLike) => isClosedTradeForMetrics(trade) ? getTradeRealizedR(trade, initialCapital) : 0
  const getTime = getTradeTimelineTimestamp
  const groups: Record<string, any> = {}

  Array.from(trades).sort((left, right) => getTime(right) - getTime(left)).forEach((trade) => {
    const timestamp = getTime(trade)
    const key = timestamp
      ? new Date(timestamp).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' }).toUpperCase()
      : locale === 'ru' ? 'НЕИЗВЕСТНАЯ ДАТА' : 'UNKNOWN DATE'

    groups[key] ||= { month: key, trades: [], totalPnl: 0, totalR: 0, ts: timestamp }
    groups[key].trades.push(trade)
    groups[key].totalPnl += getPnl(trade)
    groups[key].totalR += getR(trade)
  })

  return Object.values(groups).sort((left: any, right: any) => right.ts - left.ts)
}

export const buildArchiveEquityCurve = (trades: TradeLike[], initialCapital = 0) => {
  return buildEquityCurve(trades, initialCapital).map(({ id, balance }) => ({ id, balance }))
}

export const buildSparklinePath = (balances: number[]) => {
  if (!balances.length) return ''
  const min = Math.min(...balances)
  const max = Math.max(...balances)
  const range = max - min || 1
  const stepX = 100 / Math.max(1, balances.length - 1)
  return balances.map((balance, index) => {
    const x = index * stepX
    const y = 18 - ((balance - min) / range) * 16
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

export const getSparklineEndY = (balances: number[]) => {
  if (!balances.length) return 10
  const min = Math.min(...balances)
  const max = Math.max(...balances)
  const range = max - min || 1
  return 18 - ((balances[balances.length - 1]! - min) / range) * 16
}
