import {
  getTradeCashPnl,
  getTradeReturnPct,
  isClosedTradeForMetrics,
  toFiniteTradeNumber
} from '~/widgets/genesis/model/tradePnl'
import { getTradePlannedStopRiskDollars } from '~/widgets/genesis/model/tradeRisk'

export type TradeLike = Record<string, any>

export const getTradeTimelineTimestamp = (trade: TradeLike | null | undefined): number => {
  const rawDate = trade?.date || trade?.dateObj || trade?.createdAt || trade?.dateExit || trade?.dateEntryStr || trade?.dateTime
  const timestamp = rawDate instanceof Date ? rawDate.getTime() : new Date(rawDate || '').getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

export const getTradeExitTimestamp = (trade: TradeLike | null | undefined): number => {
  const rawDate = trade?.dateExit || trade?.exitTime || trade?.date || trade?.entryTime
  const timestamp = rawDate instanceof Date ? rawDate.getTime() : new Date(rawDate || '').getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

export const getTradeDurationMs = (trade: TradeLike | null | undefined): number => {
  const start = new Date(trade?.date || trade?.entryTime || '').getTime()
  const end = new Date(trade?.dateExit || trade?.exitTime || '').getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return Number.NaN
  return end - start
}

export const getTradeDurationHours = (trade: TradeLike | null | undefined): number => {
  const durationMs = getTradeDurationMs(trade)
  return Number.isFinite(durationMs) ? durationMs / 3_600_000 : Number.NaN
}

export const getTradeDurationDays = (trade: TradeLike | null | undefined): number => {
  const durationMs = getTradeDurationMs(trade)
  return Number.isFinite(durationMs) ? durationMs / 86_400_000 : Number.NaN
}

export const getTradePnl = (trade: TradeLike | null | undefined, initialCapital = 1000): number => {
  return getTradeCashPnl(trade, initialCapital)
}

export const getTradeResultPercent = (
  trade: TradeLike | null | undefined,
  balanceBeforeTrade = 1000
): number => {
  return getTradeReturnPct(trade, balanceBeforeTrade) ?? Number.NaN
}

export const getTradeBalanceBefore = (
  trades: TradeLike[],
  trade: TradeLike,
  initialCapital = 1000
): number => {
  const currentTimestamp = getTradeTimelineTimestamp(trade) || getTradeExitTimestamp(trade)
  const currentId = String(trade?.id || '')

  return trades
    .filter((candidate) => {
      if (!isClosedTradeForMetrics(candidate)) return false
      if (currentId && String(candidate?.id || '') === currentId) return false
      const exitTimestamp = getTradeExitTimestamp(candidate)
      return exitTimestamp > 0 && exitTimestamp < currentTimestamp
    })
    .reduce((balance, candidate) => balance + getTradePnl(candidate, initialCapital), initialCapital)
}

export const getTradeRiskReward = (trade: TradeLike | null | undefined): number => {
  const entry = toFiniteTradeNumber(trade?.entry)
  const stopLoss = toFiniteTradeNumber(trade?.stopLoss)
  const takeProfit = toFiniteTradeNumber(trade?.takeProfit)
  if (entry === null || stopLoss === null || takeProfit === null) return Number.NaN
  if (entry <= 0 || stopLoss <= 0 || takeProfit <= 0) return Number.NaN

  const side = String(trade?.side || trade?.direction || '').toLowerCase()
  const isShort = side.includes('short') || side.includes('sell')
  const risk = isShort ? stopLoss - entry : entry - stopLoss
  const reward = isShort ? entry - takeProfit : takeProfit - entry
  return risk > 0 && reward > 0 ? reward / risk : Number.NaN
}

export const getTradeRealizedR = (
  trade: TradeLike | null | undefined,
  initialCapital = 1000
): number => {
  const stored = toFiniteTradeNumber(trade?.realizedR ?? trade?.rMultiple)
  if (stored !== null) return stored

  const plannedRisk = getTradePlannedStopRiskDollars(trade)
  const fallbackRisk = toFiniteTradeNumber(trade?.risk)
  const risk = plannedRisk > 0 && Number.isFinite(plannedRisk) ? plannedRisk : fallbackRisk
  const pnl = getTradePnl(trade, initialCapital)
  return risk !== null && risk > 0 ? pnl / risk : 0
}

export const buildEquityCurve = (trades: TradeLike[], initialCapital = 0) => {
  let balance = initialCapital
  return [...trades]
    .filter(isClosedTradeForMetrics)
    .sort((left, right) => getTradeExitTimestamp(left) - getTradeExitTimestamp(right))
    .map((trade) => {
      balance += getTradePnl(trade, initialCapital)
      return { id: String(trade?.id || ''), balance, trade }
    })
}

export const formatTradeDurationCompact = (trade: TradeLike | null | undefined, unavailable = '--'): string => {
  const durationMs = getTradeDurationMs(trade)
  if (!Number.isFinite(durationMs)) return unavailable
  if (durationMs < 60_000) return '<1M'

  const totalMinutes = Math.floor(durationMs / 60_000)
  const totalHours = Math.floor(totalMinutes / 60)
  const totalDays = Math.floor(totalHours / 24)
  const totalWeeks = Math.floor(totalDays / 7)
  const totalMonths = Math.floor(totalDays / 30)
  const totalYears = Math.floor(totalDays / 365)

  if (totalYears > 0) {
    const remainingMonths = Math.floor((totalDays % 365) / 30)
    return remainingMonths > 0 ? `${totalYears}Y ${remainingMonths}MO` : `${totalYears}Y`
  }
  if (totalMonths > 0) {
    const remainingWeeks = Math.floor((totalDays % 30) / 7)
    return remainingWeeks > 0 ? `${totalMonths}MO ${remainingWeeks}W` : `${totalMonths}MO`
  }
  if (totalWeeks >= 2) {
    const remainingDays = totalDays % 7
    return remainingDays > 0 ? `${totalWeeks}W ${remainingDays}D` : `${totalWeeks}W`
  }
  if (totalDays > 0) {
    const remainingHours = totalHours % 24
    return remainingHours > 0 ? `${totalDays}D ${remainingHours}H` : `${totalDays}D`
  }
  const remainingMinutes = totalMinutes % 60
  return totalHours > 0 ? `${totalHours}H ${remainingMinutes}M` : `${remainingMinutes}M`
}
