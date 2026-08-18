export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const symbol = String(query.symbol || '').trim().toUpperCase()
  const interval = String(query.interval || '').trim()
  const range = String(query.range || '5d').trim()
  const period1 = Number(query.period1)
  const period2 = Number(query.period2)
  const includePrePost = String(query.includePrePost ?? 'true').toLowerCase() !== 'false'

  const allowedIntervals = new Set(['1m', '15m', '30m', '60m'])
  const allowedRanges = new Set(['1d', '5d', '7d', '1mo'])
  const hasPeriodRange = Number.isFinite(period1) && Number.isFinite(period2) && period2 > period1

  if (!symbol || !allowedIntervals.has(interval) || (!hasPeriodRange && !allowedRanges.has(range))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Yahoo chart query'
    })
  }

  const params = new URLSearchParams({
    interval,
    includePrePost: includePrePost ? 'true' : 'false',
    events: 'div,splits'
  })
  if (hasPeriodRange) {
    params.set('period1', String(Math.floor(period1)))
    params.set('period2', String(Math.ceil(period2)))
  } else {
    params.set('range', range)
  }

  const encodedSymbol = encodeURIComponent(symbol)
  const hosts = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']
  let lastError: unknown = null

  for (const host of hosts) {
    try {
      return await $fetch(`${host}/v8/finance/chart/${encodedSymbol}?${params.toString()}`, {
        headers: {
          accept: 'application/json',
          'user-agent': 'Mozilla/5.0'
        }
      })
    } catch (error) {
      lastError = error
    }
  }

  throw createError({
    statusCode: 502,
    statusMessage: lastError instanceof Error ? lastError.message : 'Yahoo chart proxy failed'
  })
})
