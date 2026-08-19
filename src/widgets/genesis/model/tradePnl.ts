export const toFiniteTradeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const getStoredTradePercent = (trade: any): number | null => {
  const percentKeys = ['profitInPercent', 'pnlPercent', 'resultPercent'] as const
  for (const key of percentKeys) {
    const value = toFiniteTradeNumber(trade?.[key])
    if (value !== null) return value
  }
  return null
}

export const hasFiniteTradePnl = (trade: any): boolean => {
  if (!trade) return false

  const keys = ['profitInCurrency', 'pnlNum', 'pnl', 'profit', 'netProfit', 'result'] as const
  return keys.some((key) => toFiniteTradeNumber(trade[key]) !== null) || getStoredTradePercent(trade) !== null
}

export const isClosedTradeForMetrics = (trade: any): boolean => {
  if (!trade) return false
  if (trade.isProjection) return true
  if (trade.isClosed === false) return false

  const status = String(trade.status || '').trim().toLowerCase()
  if (['open', 'active', 'pending', 'draft'].includes(status)) return false

  return true
}

export const getTradeCashPnl = (trade: any, initialDeposit = 1000): number => {
  if (!trade) return 0

  const result = toFiniteTradeNumber(trade.result)
  const cashKeys = ['pnlNum', 'pnl', 'profit', 'netProfit'] as const
  const cashFallback = cashKeys
    .map(key => toFiniteTradeNumber(trade[key]))
    .find((value): value is number => value !== null)

  const profitInCurrency = toFiniteTradeNumber(trade.profitInCurrency)
  if (profitInCurrency !== null && !(profitInCurrency === 0 && ((result !== null && result !== 0) || (cashFallback !== undefined && cashFallback !== 0)))) {
    return profitInCurrency
  }

  if (cashFallback !== undefined) return cashFallback

  const storedPercent = getStoredTradePercent(trade)
  if (storedPercent !== null && initialDeposit > 0) {
    return (storedPercent / 100) * initialDeposit
  }

  if (result !== null) {
    const unit = String(trade.resultUnit || trade.resultType || trade.resultMode || '').trim().toLowerCase()
    const shouldTreatAsPercent = unit.includes('%') ||
      unit.includes('percent') ||
      Math.abs(result) <= 100

    return shouldTreatAsPercent && initialDeposit > 0
      ? (result / 100) * initialDeposit
      : result
  }

  return 0
}

/**
 * Returns the trade return in percent using the value saved with the trade
 * when available. Legacy records may only have `result`; those records are
 * interpreted using the same fallback rules as getTradeCashPnl.
 *
 * When balanceBeforeTrade is <= 0 (e.g. account capital fell to 0 or negative),
 * initialDeposit is used as the base denominator to avoid division by zero or
 * flipping the sign of profits/losses.
 */
export const getTradeReturnPct = (
  trade: any,
  balanceBeforeTrade = 1000,
  initialDeposit = 1000
): number | null => {
  if (!trade) return null

  const balance = toFiniteTradeNumber(balanceBeforeTrade)
  const deposit = toFiniteTradeNumber(initialDeposit) ?? 1000
  const validDeposit = deposit > 0 ? deposit : 1000

  const cashKeys = ['profitInCurrency', 'pnlNum', 'pnl', 'profit', 'netProfit'] as const
  const hasCashValue = cashKeys.some((key) => toFiniteTradeNumber(trade[key]) !== null)

  // Prioritize actual cash PnL when available. This prevents corrupted saved `profitInPercent`
  // (e.g. -15000% caused by historical division by clamped capital=1) from overriding real calculation.
  if (hasCashValue) {
    const cashPnl = getTradeCashPnl(trade, (balance !== null && balance > 0) ? balance : validDeposit)
    const denominator = (balance !== null && balance > 0) ? balance : validDeposit
    return (cashPnl / denominator) * 100
  }

  const storedPercent = getStoredTradePercent(trade)
  if (storedPercent !== null) return storedPercent

  const result = toFiniteTradeNumber(trade.result)
  const unit = String(trade.resultUnit || trade.resultType || trade.resultMode || '').trim().toLowerCase()

  // Older diary records used `result` as a percentage when no cash PnL was stored.
  if (result !== null && (unit.includes('%') || unit.includes('percent') || Math.abs(result) <= 100)) {
    return result
  }

  const cashPnl = getTradeCashPnl(trade, (balance !== null && balance > 0) ? balance : validDeposit)
  const denominator = (balance !== null && balance > 0) ? balance : validDeposit

  return (cashPnl / denominator) * 100
}
