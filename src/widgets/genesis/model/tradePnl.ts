export const toFiniteTradeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value)
  return Number.isFinite(parsed) ? parsed : null
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
