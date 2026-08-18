import globalAssets from '~/shared/data/global_assets.json'

const FALLBACK_RATES: Record<string, number> = {
  EUR: 0.92,
  GBP: 0.78,
  JPY: 155,
  AUD: 1.53,
  CAD: 1.37,
  CHF: 0.90,
  NZD: 1.66
}

const parsePositive = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN
}

const normalizeSymbol = (value: unknown) => String(value || '').trim().toUpperCase()

const resolveAsset = (trade: any) => {
  const raw = normalizeSymbol(trade?.asset || trade?.symbol || trade?.ticker)
  const compact = raw.replace(/[^A-Z0-9]/g, '')
  return (globalAssets as any[]).find((asset) => {
    const symbol = normalizeSymbol(asset?.symbol)
    return symbol === raw || symbol.replace(/[^A-Z0-9]/g, '') === compact
  })
}

const getRate = (currency: string) => {
  const normalized = normalizeSymbol(currency || 'USD')
  if (normalized === 'USD') return 1

  try {
    const cached = typeof localStorage !== 'undefined'
      ? JSON.parse(localStorage.getItem('genesis_forex_rates') || '{}')
      : {}
    const cachedRate = Number(cached?.[normalized])
    if (Number.isFinite(cachedRate) && cachedRate > 0) return cachedRate
  } catch {
    // Use the deterministic fallback below when local storage is unavailable.
  }

  return FALLBACK_RATES[normalized] || 1
}

const isForexTrade = (trade: any, assetData: any) => {
  if (assetData) return String(assetData.type || '').toLowerCase() === 'forex'
  const symbol = normalizeSymbol(trade?.asset || trade?.symbol || trade?.ticker)
  return symbol.includes('/') || /^[A-Z]{6}$/.test(symbol.replace(/[^A-Z]/g, ''))
}

const getDirection = (trade: any) => {
  const side = normalizeSymbol(trade?.side || trade?.direction)
  return side.includes('SHORT') || side.includes('SELL') ? 'SHORT' : 'LONG'
}

const getQuantity = (trade: any, entry: number) => {
  const size = parsePositive(trade?.size)
  if (Number.isFinite(size)) return size

  const sizeInCurrency = parsePositive(trade?.sizeInCurrency)
  return Number.isFinite(sizeInCurrency) && entry > 0 ? sizeInCurrency / entry : Number.NaN
}

/** Returns the planned stop-loss exposure in USD, or NaN if it is unknowable. */
export const getTradePlannedStopRiskDollars = (trade: any) => {
  const entry = parsePositive(trade?.entry)
  const stopLoss = parsePositive(trade?.stopLoss)
  if (!Number.isFinite(entry) || !Number.isFinite(stopLoss)) return Number.NaN

  const quantity = getQuantity(trade, entry)
  if (!Number.isFinite(quantity) || quantity <= 0) return Number.NaN

  const direction = getDirection(trade)
  const stopDistance = direction === 'SHORT' ? stopLoss - entry : entry - stopLoss
  if (stopDistance <= 0) return Number.NaN
  const priceMove = direction === 'SHORT' ? entry - stopLoss : stopLoss - entry
  const assetData = resolveAsset(trade)

  if (isForexTrade(trade, assetData)) {
    const symbol = normalizeSymbol(trade?.asset || trade?.symbol || trade?.ticker).replace(/[^A-Z]/g, '')
    const base = symbol.substring(0, 3)
    const quote = symbol.substring(3, 6)
    const isJpy = quote === 'JPY'
    const pips = isJpy ? priceMove * 100 : priceMove * 10000
    const pipValue = quantity * 10

    if (quote === 'USD') return Math.abs(pips * pipValue)
    if (isJpy) return Math.abs((pips * pipValue * 100) / getRate('JPY'))
    if (base === 'USD') return Math.abs((pips * pipValue) / stopLoss)
    return Math.abs((pips * pipValue) / getRate(quote))
  }

  if (assetData?.contractSize) {
    const rawRisk = Math.abs(priceMove) * quantity * Number(assetData.contractSize)
    const currency = normalizeSymbol(assetData.currency || 'USD')
    return currency === 'USD' ? rawRisk : rawRisk / getRate(currency)
  }

  return Math.abs(priceMove) * quantity
}
