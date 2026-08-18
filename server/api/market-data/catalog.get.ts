import { promises as fs } from 'node:fs'
import { dirname, resolve } from 'node:path'
import globalAssets from '../../../src/shared/data/global_assets.json'

type CatalogAsset = {
  provider: 'BYBIT' | 'BINANCE' | 'KRAKEN' | 'YAHOO_LOCAL' | 'XSTOCKS'
  market?: string
  symbol: string
  base?: string
  quote?: string
  type: string
  name?: string
  aliases: string[]
}

const catalogPath = () => resolve(process.cwd(), 'public/data/market-data/api_asset_catalog.json')
const normalize = (value: unknown) => String(value || '').trim().toUpperCase()
const compact = (value: unknown) => normalize(value).replace(/[^A-Z0-9]/g, '')

const classifyLocalAsset = (asset: any) => {
  const type = String(asset?.type || '').trim().toLowerCase()
  const name = String(asset?.name || '').trim().toLowerCase()
  const description = String(asset?.description || '').trim().toLowerCase()
  if (type === 'xstocks' || name.includes('tokenized stock') || description.includes('tokenized crypto stock')) return 'xstock'
  if (type === 'crypto') return 'crypto'
  if (type === 'forex') return 'forex'
  if (type === 'stocks' || type === 'stock') return 'stock'
  if (type === 'commodities' || type === 'commodity') return 'commodity'
  if (type === 'metals' || type === 'metal') return 'metal'
  if (type === 'indices' || type === 'index' || type === 'indexes') return 'index'
  return type || 'unknown'
}

const stripKnownQuote = (symbol: string) => {
  const normalized = compact(symbol)
  for (const quote of ['USDT', 'USDC', 'FDUSD', 'BUSD', 'USD', 'PERP']) {
    if (normalized.endsWith(quote) && normalized.length > quote.length) return normalized.slice(0, -quote.length)
  }
  return normalized
}

const unique = (items: unknown[]) => Array.from(new Set(items.map(item => normalize(item)).filter(Boolean)))

async function fetchJson(url: string) {
  const response = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' } })
  if (!response.ok) throw new Error(`${url} HTTP ${response.status}`)
  return response.json()
}

async function collectBybit() {
  const categories = ['spot', 'linear', 'inverse']
  const assets: CatalogAsset[] = []

  for (const category of categories) {
    let cursor = ''
    do {
      const params = new URLSearchParams({ category, limit: '1000' })
      if (cursor) params.set('cursor', cursor)
      const payload = await fetchJson(`https://api.bybit.com/v5/market/instruments-info?${params.toString()}`)
      if (payload?.retCode !== 0) throw new Error(payload?.retMsg || `Bybit ${category} instruments failed`)
      const list = Array.isArray(payload?.result?.list) ? payload.result.list : []
      list.forEach((item: any) => {
        const symbol = normalize(item.symbol)
        const base = normalize(item.baseCoin || item.baseCurrency)
        const quote = normalize(item.quoteCoin || item.quoteCurrency || item.settleCoin)
        if (!symbol) return
        assets.push({
          provider: 'BYBIT',
          market: category,
          symbol,
          base,
          quote,
          type: 'crypto_or_xstock',
          name: symbol,
          aliases: unique([symbol, `${base}${quote}`, `${base}/${quote}`, base])
        })
      })
      cursor = String(payload?.result?.nextPageCursor || '')
    } while (cursor)
  }

  return assets
}

async function collectBinance() {
  const payload = await fetchJson('https://api.binance.com/api/v3/exchangeInfo')
  const symbols = Array.isArray(payload?.symbols) ? payload.symbols : []
  return symbols
    .filter((item: any) => item?.status === 'TRADING')
    .map((item: any) => {
      const symbol = normalize(item.symbol)
      const base = normalize(item.baseAsset)
      const quote = normalize(item.quoteAsset)
      return {
        provider: 'BINANCE',
        market: 'spot',
        symbol,
        base,
        quote,
        type: 'crypto_or_xstock',
        name: symbol,
        aliases: unique([symbol, `${base}${quote}`, `${base}/${quote}`, base])
      } satisfies CatalogAsset
    })
}

async function collectKraken() {
  const payload = await fetchJson('https://api.kraken.com/0/public/AssetPairs')
  if (Array.isArray(payload?.error) && payload.error.length) throw new Error(payload.error.join(', '))
  return Object.entries(payload?.result || {}).map(([key, value]: [string, any]) => {
    const symbol = normalize(value?.altname || key)
    const wsname = normalize(value?.wsname)
    const base = normalize(value?.base)
    const quote = normalize(value?.quote)
    return {
      provider: 'KRAKEN',
      market: 'spot',
      symbol,
      base,
      quote,
      type: 'crypto',
      name: wsname || symbol,
      aliases: unique([key, symbol, wsname, base, `${base}${quote}`])
    } satisfies CatalogAsset
  })
}

async function collectBackedXStocks() {
  const assets: CatalogAsset[] = []
  let page = 0

  do {
    const payload = await fetchJson(`https://api.backed.fi/api/v2/public/assets?page=${page}&limit=100`)
    const nodes = Array.isArray(payload?.nodes) ? payload.nodes : []
    nodes.forEach((item: any) => {
      const symbol = normalize(item?.symbol)
      const underlying = normalize(item?.underlyingSymbol)
      const name = String(item?.name || item?.description || symbol).trim()
      if (!symbol) return

      assets.push({
        provider: 'XSTOCKS',
        market: 'reference',
        symbol,
        base: underlying,
        quote: 'USD',
        type: 'xstock',
        name,
        aliases: unique([
          symbol,
          underlying,
          `${underlying}X`,
          name,
          item?.description,
          item?.isin,
          item?.underlyingIsin
        ])
      })
    })

    if (!payload?.page?.hasNextPage) break
    page = Number(payload?.page?.currentPage || page) + 1
  } while (page < 50)

  return assets
}

function yahooSymbolForLocalAsset(asset: any) {
  const symbol = normalize(asset?.symbol)
  const type = classifyLocalAsset(asset)
  const base = stripKnownQuote(symbol)
  const commodityMap: Record<string, string> = {
    XAU: 'GC=F', XAUUSD: 'GC=F', GOLD: 'GC=F',
    XAG: 'SI=F', XAGUSD: 'SI=F', SILVER: 'SI=F',
    XPT: 'PL=F', XPTUSD: 'PL=F', PLATINUM: 'PL=F',
    XPD: 'PA=F', XPDUSD: 'PA=F', PALLAD: 'PA=F', PALLADIUM: 'PA=F',
    OIL: 'CL=F', WTI: 'CL=F', USOIL: 'CL=F', BRENT: 'BZ=F', UKOIL: 'BZ=F',
    NATGAS: 'NG=F', NATURALGAS: 'NG=F',
    SOYBN: 'ZS=F', SOYBEAN: 'ZS=F', SOYBEANS: 'ZS=F',
    WHEAT: 'ZW=F', CORN: 'ZC=F',
    COFFEE: 'KC=F', SUGAR: 'SB=F', COTTON: 'CT=F',
    COPPER: 'HG=F', HG: 'HG=F',
    COCOA: 'CC=F',
    LIVCAT: 'LE=F', LIVECATTLE: 'LE=F',
    FDRCAT: 'GF=F', FEEDERCATTLE: 'GF=F',
    LN_HOG: 'HE=F', LNHOG: 'HE=F', LEANHOGS: 'HE=F',
    ORNG_J: 'OJ=F', ORNGJ: 'OJ=F', ORANGEJUICE: 'OJ=F',
    RICE: 'ZR=F', ROUGHRICE: 'ZR=F',
    LUMBER: 'LBR=F',
    PLATIN: 'PL=F',
    HEAT_O: 'HO=F', HEATO: 'HO=F', HEATINGOIL: 'HO=F',
    GASOLN: 'RB=F', GASOLINE: 'RB=F', RBOBGASOLINE: 'RB=F'
  }
  const indexMap: Record<string, string> = {
    SPX: '^GSPC', SP500: '^GSPC', SPX500: '^GSPC', US500: '^GSPC',
    NASDAQ: '^IXIC', NDX: '^NDX', NAS100: '^NDX', US100: '^NDX',
    DJI: '^DJI', DOW: '^DJI', US30: '^DJI',
    RUT: '^RUT', RUSSELL2000: '^RUT', US2000: '^RUT',
    DAX: '^GDAXI', DAX40: '^GDAXI', DE40: '^GDAXI', GER40: '^GDAXI',
    FTSE: '^FTSE', FTSE100: '^FTSE', UK100: '^FTSE',
    NIKKEI: '^N225', NIKKEI225: '^N225', JP225: '^N225', JPN225: '^N225',
    HSI: '^HSI', HANGSENG: '^HSI', HK50: '^HSI',
    STOXX50: '^STOXX50E', EU50: '^STOXX50E', EUSTX50: '^STOXX50E',
    CAC: '^FCHI', CAC40: '^FCHI', FRA40: '^FCHI',
    ASX200: '^AXJO', AUS200: '^AXJO'
  }
  if (commodityMap[symbol] || commodityMap[base]) return commodityMap[symbol] || commodityMap[base]
  if (indexMap[symbol] || indexMap[base]) return indexMap[symbol] || indexMap[base]
  if (type === 'forex' && symbol.length === 6) return `${symbol}=X`
  if (type === 'xstock') return base.endsWith('X') ? base.slice(0, -1) : base
  if (type === 'crypto') return `${base === 'XBT' ? 'BTC' : base}-USD`
  return symbol.replace('.', '-')
}

function collectYahooLocal() {
  return (globalAssets as any[]).map((asset) => {
    const symbol = normalize(asset?.symbol)
    const type = classifyLocalAsset(asset)
    const yahooSymbol = yahooSymbolForLocalAsset(asset)
    const base = stripKnownQuote(symbol)
    const underlying = type === 'xstock' && base.endsWith('X') ? base.slice(0, -1) : base
    return {
      provider: 'YAHOO_LOCAL',
      market: 'chart',
      symbol: yahooSymbol,
      base: underlying,
      quote: type === 'forex' ? '' : 'USD',
      type,
      name: String(asset?.name || symbol),
      aliases: unique([symbol, yahooSymbol, underlying, asset?.name, asset?.description])
    } satisfies CatalogAsset
  })
}

async function buildCatalog() {
  const results = await Promise.allSettled([
    collectBybit(),
    collectBinance(),
    collectKraken(),
    collectBackedXStocks()
  ])
  const providerAssets = results.flatMap(result => result.status === 'fulfilled' ? result.value : [])
  const assets = [...providerAssets, ...collectYahooLocal()]
  const sources = assets.reduce<Record<string, number>>((acc, item) => {
    acc[item.provider] = (acc[item.provider] || 0) + 1
    return acc
  }, {})

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    note: 'Yahoo does not expose a comprehensive public bulk symbol list here; YAHOO_LOCAL entries are generated from the app asset registry.',
    sources,
    assets
  }
}

export default defineEventHandler(async (event) => {
  const refresh = String(getQuery(event).refresh || '') === '1'
  const file = catalogPath()

  if (!refresh) {
    try {
      return JSON.parse(await fs.readFile(file, 'utf8'))
    } catch {}
  }

  const catalog = await buildCatalog()
  await fs.mkdir(dirname(file), { recursive: true })
  await fs.writeFile(file, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
  return catalog
})
