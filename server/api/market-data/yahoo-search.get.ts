export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = String(query.q || '').trim().toUpperCase()

  if (!search || search.length > 96 || !/^[A-Z0-9.\-/_: ]+$/.test(search)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Yahoo search query'
    })
  }

  const params = new URLSearchParams({
    q: search,
    quotesCount: '20',
    newsCount: '0',
    enableFuzzyQuery: 'true'
  })
  const hosts = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']
  let lastError: unknown = null

  for (const host of hosts) {
    try {
      return await $fetch(`${host}/v1/finance/search?${params.toString()}`, {
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
    statusMessage: lastError instanceof Error ? lastError.message : 'Yahoo search proxy failed'
  })
})
