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
    .find(value => value !== null)

  const profitInCurrency = toFiniteTradeNumber(trade.profitInCurrency)
  if (profitInCurrency !== null && !(profitInCurrency === 0 && ((result !== null && result !== 0) || (cashFallback !== null && cashFallback !== 0)))) {
    return profitInCurrency
  }

  if (cashFallback !== null) return cashFallback

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
 */
export const getTradeReturnPct = (trade: any, balanceBeforeTrade = 1000): number | null => {
  if (!trade) return null

  const storedPercent = getStoredTradePercent(trade)
  if (storedPercent !== null) return storedPercent

  const result = toFiniteTradeNumber(trade.result)
  const hasCashValue = ['profitInCurrency', 'pnlNum', 'pnl', 'profit', 'netProfit']
    .some((key) => toFiniteTradeNumber(trade[key]) !== null)
  const unit = String(trade.resultUnit || trade.resultType || trade.resultMode || '').trim().toLowerCase()

  // Older diary records used `result` as a percentage when no cash PnL was
  // stored. Preserve that meaning instead of dividing it by capital again.
  if (result !== null && !hasCashValue && (unit.includes('%') || unit.includes('percent') || Math.abs(result) <= 100)) {
    return result
  }

  const balance = toFiniteTradeNumber(balanceBeforeTrade)
  if (balance === null || balance <= 0) return null

  return (getTradeCashPnl(trade, balance) / balance) * 100
}
