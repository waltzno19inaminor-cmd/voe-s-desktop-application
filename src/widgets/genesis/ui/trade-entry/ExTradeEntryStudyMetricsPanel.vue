<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useI18n } from '~/shared/i18n/useI18n'
import { useGenesisTrades, useGenesisMatrixData } from '~/entities/genesis'
import ExPanel from '~/shared/ui/ExPanel.vue'

const genesisTrades = useGenesisTrades()
const genesisMatrix = useGenesisMatrixData()


const { locale } = useI18n()

const {
  side,
  asset,
  isDark,
  currentAssetData,
  isForex,
  showTradeStudyMetrics,
  tradeStudyMetrics,
  entry,
  exit,
  stopLoss,
  takeProfit,
  openDate,
  exitDate,
  isClosed,
  entryMethodEnabled,
  exitMethodEnabled,
  averageEntry,
  averageExit,
  commitState,
  initialTrade,
  persistGeneratedTradeStudyMetrics
} = inject('tradeState')

const props = defineProps({
  surface: {
    type: String,
    default: 'modal'
  },
  visible: {
    type: Boolean,
    default: true
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  storedMarketData: {
    type: Object,
    default: null
  }
})

const isChartSurface = computed(() => props.surface === 'chart')

const usesThreeDecimalTradePrice = computed(() => {
  const assetType = String(currentAssetData?.value?.type || initialTrade?.assetType || '')
    .trim()
    .toLowerCase()
  return ['stocks', 'stock', 'xstocks', 'xstock', 'crypto', 'cryptocurrency'].includes(assetType)
})

const copy = {
  en: {
    title: 'TRADE_STUDY_METRICS',
    subtitle: 'Manual post-trade dataset',
    reset: 'RESET',
    pageMarket: 'MARKET_DATA',
    pageManual: 'MANUAL_METRICS',
    generate: 'GENERATE DATA',
    generating: 'GENERATING...',
    generateChart: 'GENERATE CHART',
    cooldownButton: 'WAIT {time}',
    apiCooldownHint: 'API requests are paused for {time}. You can always generate the chart through trade edit mode.',
    minimumDurationButton: 'MIN 5M',
    minimumDurationExceeded: 'The minimum entry-to-exit duration for generated market data is 5 minutes. Extend the trade duration to generate the chart.',
    rangeTooLongButton: 'MAX 61D',
    dateRangeLimitExceeded: 'The maximum entry-to-exit range for generated market data is 61 days. Shorten the trade duration to generate the chart.',
    dailyTimeframeOnly: 'For trades longer than 3 days, generated market data uses daily candles only.',
    noAsset: 'Select an asset in the commit footer first',
    selectedAsset: 'Selected asset',
    generatedSource: 'Resolved API symbol',
    noCandles: 'No generated candle data yet',
    chartUnavailable: 'No generated chart data is available for this trade.',
    chartHint: 'Wheel to zoom. Drag to pan.',
    apiError: 'Unable to resolve or load public OHLC data for this asset.',
    warning: 'Generated data may differ slightly from the data you used while trading. It will be automatically adjusted to your entered values for a more precise analysis.',
    ohlc: {
      open: 'O',
      high: 'H',
      low: 'L',
      close: 'C'
    },
    boolOn: 'YES',
    boolOff: 'NO',
    groups: {
      pricePath: 'PRICE_PATH',
      news: 'NEWS_CONTEXT'
    },
    fields: {
      priceDroppedBelowEntryLong: 'Price fell below entry point',
      priceBelowEntryLongMovePercent: 'How much price fell from entry, %',
      priceRoseAboveEntryShort: 'Price rose above entry point',
      priceAboveEntryShortMovePercent: 'How much price rose from entry, %',
      hadNews: 'News during trade'
    },
    placeholders: {
      durationDays: 'ex. 0',
      durationHours: 'ex. 1',
      durationMinutes: 'ex. 25',
      durationSeconds: 'ex. 30',
      percentMove: 'ex. 1.2'
    },
    duration: {
      belowLong: 'How long price stayed below entry',
      aboveShort: 'How long price stayed above entry',
      days: 'Days',
      hours: 'Hours',
      minutes: 'Minutes',
      seconds: 'Seconds'
    },
    units: {
      money: '$',
      forex: 'POINTS'
    }
  },
  ru: {
    title: 'МЕТРИКИ_ИЗУЧЕНИЯ_СДЕЛКИ',
    subtitle: 'Ручной набор данных после сделки',
    reset: 'СБРОС',
    pageMarket: 'РЫНОЧНЫЕ_ДАННЫЕ',
    pageManual: 'РУЧНЫЕ_МЕТРИКИ',
    generate: 'СГЕНЕРИРОВАТЬ ДАННЫЕ',
    generating: 'ГЕНЕРАЦИЯ...',
    generateChart: 'СГЕНЕРИРОВАТЬ ГРАФИК',
    cooldownButton: 'ПАУЗА {time}',
    apiCooldownHint: 'API-запросы остановлены на {time}. Вы всегда можете сгенерировать график через режим редактирования сделки.',
    minimumDurationButton: 'МИН. 5М',
    minimumDurationExceeded: 'Минимальная длительность сделки от входа до выхода для генерации рыночного графика — 5 минут. Увеличьте длительность сделки, чтобы построить график.',
    rangeTooLongButton: 'МАКС. 61Д',
    dateRangeLimitExceeded: 'Максимальный диапазон от входа до выхода для генерации рыночных данных — 61 день. Сократите длительность сделки, чтобы сгенерировать график.',
    dailyTimeframeOnly: 'Для сделок длиннее 3 дней генерируются только дневные свечи 1D.',
    noAsset: 'Сначала выберите актив в нижнем footer с commit',
    selectedAsset: 'Выбранный актив',
    generatedSource: 'Символ API',
    noCandles: 'Сгенерированных свечей пока нет',
    chartUnavailable: 'Для этой сделки нет сохранённых данных графика.',
    chartHint: 'Колесо - zoom. Перетаскивание - pan.',
    apiError: 'Не удалось найти или загрузить публичные OHLC данные для этого актива.',
    warning: 'Полученные данные могут немного отличаться от тех, что вы использовали для торговли. Они будут подстроены автоматически под введенные вами значения для более точного анализа.',
    ohlc: {
      open: 'O',
      high: 'H',
      low: 'L',
      close: 'C'
    },
    boolOn: 'ДА',
    boolOff: 'НЕТ',
    groups: {
      pricePath: 'ПУТЬ_ЦЕНЫ',
      news: 'НОВОСТИ_И_КОНТЕКСТ'
    },
    fields: {
      priceDroppedBelowEntryLong: 'Цена упала ниже точки входа',
      priceBelowEntryLongMovePercent: 'Как сильно цена упала от точки входа, %',
      priceRoseAboveEntryShort: 'Цена выросла выше точки входа',
      priceAboveEntryShortMovePercent: 'Как сильно цена выросла от точки входа, %',
      hadNews: 'Были новости'
    },
    placeholders: {
      durationDays: 'напр. 0',
      durationHours: 'напр. 1',
      durationMinutes: 'напр. 25',
      durationSeconds: 'напр. 30',
      percentMove: 'напр. 1.2'
    },
    duration: {
      belowLong: 'Как долго цена была ниже входа',
      aboveShort: 'Как долго цена была выше входа',
      days: 'Дни',
      hours: 'Часы',
      minutes: 'Минуты',
      seconds: 'Секунды'
    },
    units: {
      money: '$',
      forex: 'ПУНКТЫ'
    }
  }
}

const ui = () => copy[locale.value] || copy.en

const studyPages = [
  { id: 'manual', number: 1 }
]

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const MAX_API_CANDLES = 1000
const API_ERROR_COOLDOWN_MS = MINUTE_MS
const DAILY_TIMEFRAME_ONLY_AFTER_MS = 3 * DAY_MS
const MIN_GENERATED_MARKET_DATA_RANGE_MS = 5 * MINUTE_MS
const MAX_GENERATED_MARKET_DATA_RANGE_MS = 61 * DAY_MS

const timeframeOptions = [
  { id: '1d', label: '1D', durationMs: DAY_MS, binanceInterval: '1d', bybitInterval: 'D', krakenInterval: '1440', yahooInterval: '1d' },
  { id: '4h', label: '4H', durationMs: 4 * HOUR_MS, binanceInterval: '4h', bybitInterval: '240', krakenInterval: '240', yahooInterval: '60m' },
  { id: '1h', label: '1H', durationMs: HOUR_MS, binanceInterval: '1h', bybitInterval: '60', krakenInterval: '60', yahooInterval: '60m' },
  { id: '15m', label: '15M', durationMs: 15 * MINUTE_MS, binanceInterval: '15m', bybitInterval: '15', krakenInterval: '15', yahooInterval: '15m' },
  { id: '1m', label: '1M', durationMs: MINUTE_MS, binanceInterval: '1m', bybitInterval: '1', krakenInterval: '1', yahooInterval: '1m' }
]
const YAHOO_ONLY_MARKET_KINDS = new Set(['forex', 'index', 'commodity', 'metal'])

const activeStudyPage = ref('manual')
const activeGeneratedTimeframe = ref('4h')
const generatedMarketData = ref({})
const resolvedMarketSymbol = ref('')
const resolvedMarketProvider = ref('')
const generatedSourceAsset = ref('')
const generationState = ref('idle')
const generationError = ref('')
const apiCooldownUntil = ref(0)
const apiCooldownNow = ref(Date.now())
const hoveredCandle = ref(null)
const chartCrosshair = ref(null)
const chartCanvas = ref(null)
const chartViewport = ref({ start: 0, end: 0 })
const priceViewport = ref(null)
const isChartDragging = ref(false)
const chartDragMode = ref('plot')
const lastChartPointerX = ref(0)
const lastChartPointerY = ref(0)
const marketCatalog = ref(null)
const generatedChartClearedManually = ref(false)

let binanceSymbolsPromise = null
const yahooSearchCache = new Map()
let resizeObserver = null
let apiCooldownInterval = null

const groups = [
  {
    id: 'pricePath',
    fields: [
      { key: 'priceDroppedBelowEntryLong', type: 'boolean' },
      { key: 'priceRoseAboveEntryShort', type: 'boolean' }
    ]
  },
  {
    id: 'news',
    fields: [
      { key: 'hadNews', type: 'boolean' }
    ]
  }
]

const durationFieldGroups = {
  priceDroppedBelowEntryLong: {
    titleKey: 'belowLong',
    moveField: { key: 'priceBelowEntryLongMovePercent', labelKey: 'priceBelowEntryLongMovePercent' },
    fields: [
      { key: 'priceBelowEntryLongDurationDays', unitKey: 'days', placeholderKey: 'durationDays' },
      { key: 'priceBelowEntryLongDurationHours', unitKey: 'hours', placeholderKey: 'durationHours' },
      { key: 'priceBelowEntryLongDurationMinutes', unitKey: 'minutes', placeholderKey: 'durationMinutes' },
      { key: 'priceBelowEntryLongDurationSeconds', unitKey: 'seconds', placeholderKey: 'durationSeconds' }
    ]
  },
  priceRoseAboveEntryShort: {
    titleKey: 'aboveShort',
    moveField: { key: 'priceAboveEntryShortMovePercent', labelKey: 'priceAboveEntryShortMovePercent' },
    fields: [
      { key: 'priceAboveEntryShortDurationDays', unitKey: 'days', placeholderKey: 'durationDays' },
      { key: 'priceAboveEntryShortDurationHours', unitKey: 'hours', placeholderKey: 'durationHours' },
      { key: 'priceAboveEntryShortDurationMinutes', unitKey: 'minutes', placeholderKey: 'durationMinutes' },
      { key: 'priceAboveEntryShortDurationSeconds', unitKey: 'seconds', placeholderKey: 'durationSeconds' }
    ]
  }
}

const splitFields = (fields) => {
  const midpoint = Math.ceil(fields.length / 2)
  return [fields.slice(0, midpoint), fields.slice(midpoint)]
}

const usesForexPriceFormat = computed(() => {
  return Boolean(isForex?.value || currentAssetData?.value?.type === 'Forex')
})

const selectedTradeAsset = computed(() => String(asset?.value || '').trim())

const parseTradePrice = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : Number.NaN
}

const getDateTimestamp = (value) => {
  const timestamp = new Date(value || 0).getTime()
  return Number.isFinite(timestamp) ? timestamp : Number.NaN
}

const tradeTimeRange = computed(() => {
  const start = getDateTimestamp(openDate?.value)
  const end = getDateTimestamp(exitDate?.value)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  return { start, end }
})

const tradeDurationMs = computed(() => {
  if (!tradeTimeRange.value) return 0
  return tradeTimeRange.value.end - tradeTimeRange.value.start
})

const isGeneratedMarketDataRangeTooShort = computed(() => {
  const duration = tradeDurationMs.value
  return Number.isFinite(duration) && duration > 0 && duration < MIN_GENERATED_MARKET_DATA_RANGE_MS
})

const isGeneratedMarketDataRangeTooLong = computed(() => {
  const duration = tradeDurationMs.value
  return Number.isFinite(duration) && duration > MAX_GENERATED_MARKET_DATA_RANGE_MS
})

const isDailyTimeframeOnlyRange = computed(() => {
  const duration = tradeDurationMs.value
  return Number.isFinite(duration) && duration > DAILY_TIMEFRAME_ONLY_AFTER_MS && !isGeneratedMarketDataRangeTooLong.value
})

const availableTimeframeOptions = computed(() => {
  const duration = tradeDurationMs.value
  if (!Number.isFinite(duration) || duration <= 0) return []
  if (isGeneratedMarketDataRangeTooShort.value) return []
  if (isGeneratedMarketDataRangeTooLong.value) return []
  if (isDailyTimeframeOnlyRange.value) return timeframeOptions.filter(timeframe => timeframe.id === '1d')
  if (duration < 15 * MINUTE_MS) return timeframeOptions.filter(timeframe => timeframe.id === '1m')
  return timeframeOptions.filter(timeframe => timeframe.id !== '1m' && timeframe.id !== '1d' && duration >= timeframe.durationMs)
})

const availableTimeframeIds = computed(() => new Set(availableTimeframeOptions.value.map(timeframe => timeframe.id)))

const isTimeframeSelectable = (timeframe) => {
  if (props.readOnly) return Boolean(generatedMarketData.value?.[timeframe?.id]?.length)
  return availableTimeframeIds.value.has(timeframe?.id)
}

const selectGeneratedTimeframe = (timeframe) => {
  if (!isTimeframeSelectable(timeframe)) return
  activeGeneratedTimeframe.value = timeframe.id
}

const apiCooldownRemainingMs = computed(() => {
  return Math.max(0, apiCooldownUntil.value - apiCooldownNow.value)
})

const isApiCooldownActive = computed(() => apiCooldownRemainingMs.value > 0)

const apiCooldownRemainingLabel = computed(() => {
  const seconds = Math.max(1, Math.ceil(apiCooldownRemainingMs.value / 1000))
  return locale.value === 'ru' ? `${seconds} сек` : `${seconds}s`
})

const apiCooldownHint = computed(() => {
  if (!isApiCooldownActive.value) return ''
  return ui().apiCooldownHint.replace('{time}', apiCooldownRemainingLabel.value)
})

const generateMarketDataButtonLabel = computed(() => {
  if (generationState.value === 'loading') return ui().generating
  if (isGeneratedMarketDataRangeTooShort.value) return ui().minimumDurationButton
  if (isGeneratedMarketDataRangeTooLong.value) return ui().rangeTooLongButton
  if (isApiCooldownActive.value) return ui().cooldownButton.replace('{time}', apiCooldownRemainingLabel.value)
  return ui().generateChart
})

const canGenerateMarketData = computed(() => {
  return Boolean(selectedTradeAsset.value && tradeTimeRange.value && availableTimeframeOptions.value.length) && !isGeneratedMarketDataRangeTooShort.value && !isGeneratedMarketDataRangeTooLong.value && commitState?.value !== 'loading' && generationState.value !== 'loading' && !isApiCooldownActive.value
})

const generatedChartCandles = computed(() => {
  if (!props.readOnly && !availableTimeframeIds.value.has(activeGeneratedTimeframe.value)) return []
  return generatedMarketData.value?.[activeGeneratedTimeframe.value] || []
})

const getGeneratedTimeframeIds = (candlesByTimeframe = generatedMarketData.value) => {
  const knownIds = timeframeOptions
    .map(timeframe => timeframe.id)
    .filter(id => candlesByTimeframe?.[id]?.length && (props.readOnly || availableTimeframeIds.value.has(id)))
  const customIds = Object.keys(candlesByTimeframe || {})
    .filter(id => candlesByTimeframe?.[id]?.length && !knownIds.includes(id) && (props.readOnly || availableTimeframeIds.value.has(id)))
  return [...knownIds, ...customIds]
}

const getTimeframeOption = (id) => {
  return timeframeOptions.find(timeframe => timeframe.id === id) || {
    id,
    label: String(id || '').toUpperCase(),
    durationMs: MINUTE_MS
  }
}

const chartTimeframeOptions = computed(() => {
  const generatedIds = getGeneratedTimeframeIds()
  if (!generatedIds.length) return availableTimeframeOptions.value
  return generatedIds.map(getTimeframeOption)
})

const marketDataStatusMessage = computed(() => {
  if (isGeneratedMarketDataRangeTooShort.value) return ui().minimumDurationExceeded
  if (isGeneratedMarketDataRangeTooLong.value) return ui().dateRangeLimitExceeded
  if (generationError.value) return `${ui().apiError} ${generationError.value}`
  if (isDailyTimeframeOnlyRange.value) return ui().dailyTimeframeOnly
  return ui().warning
})

const chartAssetHeading = computed(() => {
  return cleanAssetDisplayLabel(generatedSourceAsset.value || selectedTradeAsset.value) || 'ASSET'
})

const chartLevelOverlays = computed(() => {
  const entryPrice = parseTradePrice(entryMethodEnabled?.value ? averageEntry?.value : entry?.value)
  const exitPrice = parseTradePrice(isClosed?.value && exitMethodEnabled?.value ? averageExit?.value : exit?.value)
  const levels = [
    { id: 'entry', label: 'ENTRY', value: entryPrice, color: 'rgba(255,255,255,0.72)' },
    { id: 'stop', label: 'STOP', value: parseTradePrice(stopLoss?.value), color: 'rgba(251,113,133,0.82)' },
    { id: 'take', label: 'TAKE', value: parseTradePrice(takeProfit?.value), color: 'rgba(110,231,183,0.82)' },
    { id: 'exit', label: 'EXIT', value: exitPrice, color: 'rgba(251,191,36,0.82)' }
  ]
  return levels.filter(level => Number.isFinite(level.value))
})

const displayedOhlcCandle = computed(() => {
  const candles = generatedChartCandles.value
  return hoveredCandle.value || candles[candles.length - 1] || null
})

const hoveredOhlcLabel = computed(() => {
  if (!displayedOhlcCandle.value) return ''
  return `O: ${formatPrice(displayedOhlcCandle.value.open)} H: ${formatPrice(displayedOhlcCandle.value.high)} L: ${formatPrice(displayedOhlcCandle.value.low)} C: ${formatPrice(displayedOhlcCandle.value.close)} · ${formatCandleTime(displayedOhlcCandle.value.time)}`
})

const normalizeApiSymbol = (value) => {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

const normalizeYahooSymbol = (value) => {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '')
}

const cleanAssetDisplayLabel = (value) => {
  return String(value || '').replace(/^\s*(?:актив|asset)\s*[:=]\s*/iu, '').trim()
}

const getAssetType = () => String(currentAssetData?.value?.type || '').trim().toLowerCase()

const getAssetName = () => String(currentAssetData?.value?.name || '').trim()

const getAssetDescription = () => String(currentAssetData?.value?.description || '').trim()

const normalizeSearchToken = (value) => normalizeApiSymbol(value)

const getSelectedAssetKind = () => {
  if (isLikelyXStockAsset.value) return 'xstock'
  if (isLikelyCryptoAsset.value) return 'crypto'
  const type = getAssetType()
  if (type === 'forex') return 'forex'
  if (['stocks', 'stock'].includes(type)) return 'stock'
  if (['commodities', 'commodity'].includes(type)) return 'commodity'
  if (['metals', 'metal'].includes(type)) return 'metal'
  if (['indices', 'index', 'indexes'].includes(type)) return 'index'
  return type || 'unknown'
}

const isYahooOnlyMarketKind = (kind) => YAHOO_ONLY_MARKET_KINDS.has(kind)

const isLikelyXStockAsset = computed(() => {
  const type = getAssetType()
  const name = getAssetName().toLowerCase()
  const description = getAssetDescription().toLowerCase()
  return type === 'xstocks' || name.includes('tokenized stock') || description.includes('tokenized crypto stock')
})

const isLikelyCryptoAsset = computed(() => {
  return getAssetType() === 'crypto' && !isLikelyXStockAsset.value
})

const pushCandidate = (set, value) => {
  const symbol = normalizeApiSymbol(value)
  if (symbol) set.add(symbol)
}

const stripKnownQuote = (symbol) => {
  const normalized = normalizeApiSymbol(symbol)
  const quotes = ['USDT', 'USDC', 'FDUSD', 'BUSD', 'USD', 'PERP']
  for (const quote of quotes) {
    if (normalized.endsWith(quote) && normalized.length > quote.length) {
      return normalized.slice(0, -quote.length)
    }
  }
  return normalized
}

const buildBinanceSymbolCandidates = () => {
  const candidates = new Set()
  const rawAsset = selectedTradeAsset.value
  const assetData = currentAssetData?.value || {}
  const rawParts = String(rawAsset).split(/[\/:_-]/).filter(Boolean)
  const directValues = [rawAsset, assetData.symbol, assetData.ticker]

  directValues.forEach(value => pushCandidate(candidates, value))
  if (rawParts.length >= 2) {
    pushCandidate(candidates, `${rawParts[0]}${rawParts[1]}`)
    pushCandidate(candidates, `${rawParts[0]}USDT`)
    pushCandidate(candidates, `${rawParts[0]}USDC`)
  }

  const bases = new Set()
  directValues.forEach(value => {
    const base = stripKnownQuote(value)
    if (base) bases.add(base)
  })
  if (rawParts[0]) bases.add(stripKnownQuote(rawParts[0]))

  const aliasMap = {
    XBT: 'BTC',
    BTCUSD: 'BTC',
    ETHUSD: 'ETH',
    SOLUSD: 'SOL',
    XRPUSD: 'XRP',
    BNBUSD: 'BNB',
    GOLD: 'PAXG',
    XAU: 'PAXG',
    XAUUSD: 'PAXG'
  }

  Array.from(bases).forEach(base => {
    const mappedBase = aliasMap[base] || base
    ;['USDT', 'USDC', 'FDUSD', 'BTC', 'ETH'].forEach(quote => {
      pushCandidate(candidates, `${mappedBase}${quote}`)
    })
    if (mappedBase.endsWith('X') && mappedBase.length > 2) {
      ;['USDT', 'USDC'].forEach(quote => pushCandidate(candidates, `${mappedBase.slice(0, -1)}${quote}`))
    }
  })

  return Array.from(candidates)
}

const getTokenizedStockBase = (symbol) => {
  const normalized = stripKnownQuote(symbol)
  return normalized.endsWith('X') && normalized.length > 1 ? normalized.slice(0, -1) : normalized
}

const levenshteinDistance = (a, b) => {
  if (a === b) return 0
  if (!a) return b.length
  if (!b) return a.length
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  const current = new Array(b.length + 1)
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      )
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j]
  }
  return previous[b.length]
}

const similarityScore = (a, b) => {
  const left = normalizeSearchToken(a)
  const right = normalizeSearchToken(b)
  if (!left || !right) return 0
  if (left === right) return 1
  const distance = levenshteinDistance(left, right)
  return Math.max(0, 1 - (distance / Math.max(left.length, right.length)))
}

const loadMarketCatalog = async (refresh = false) => {
  if (marketCatalog.value && !refresh) return marketCatalog.value

  const endpoint = refresh ? '/api/market-data/catalog?refresh=1' : '/api/market-data/catalog'
  try {
    const response = await fetch(endpoint)
    marketCatalog.value = await readJsonResponse(response, 'Market catalog')
    return marketCatalog.value
  } catch (error) {
    if (refresh) throw error
    const response = await fetch('/data/market-data/api_asset_catalog.json')
    if (!response.ok) throw error
    marketCatalog.value = await readJsonResponse(response, 'Local market catalog')
    return marketCatalog.value
  }
}

const getCatalogAssetTypeScore = (catalogAsset, wantedKind) => {
  const itemType = String(catalogAsset?.type || '').toLowerCase()
  if (wantedKind === 'xstock') {
    if (itemType === 'xstock') return 90
    if (itemType === 'crypto_or_xstock') return 60
    if (catalogAsset?.provider === 'YAHOO_LOCAL') return 50
    return -80
  }
  if (wantedKind === 'crypto') {
    if (itemType === 'crypto') return 90
    if (itemType === 'crypto_or_xstock') return 65
    return -70
  }
  if (wantedKind && wantedKind !== 'unknown') {
    if (itemType === wantedKind) return 90
    if (catalogAsset?.provider === 'YAHOO_LOCAL') return 25
    return -45
  }
  return 0
}

const getCatalogProviderScore = (catalogAsset, wantedKind) => {
  const provider = catalogAsset?.provider
  if (wantedKind === 'xstock') {
    if (provider === 'XSTOCKS') return 42
    if (provider === 'BYBIT') return 30
    if (provider === 'BINANCE') return 20
    if (provider === 'YAHOO_LOCAL') return 10
  }
  if (wantedKind === 'crypto') {
    if (provider === 'BYBIT') return 30
    if (provider === 'BINANCE') return 22
    if (provider === 'KRAKEN') return 14
    if (provider === 'YAHOO_LOCAL') return 5
  }
  return provider === 'YAHOO_LOCAL' ? 10 : 0
}

const scoreCatalogAsset = (catalogAsset) => {
  const selectedSymbol = normalizeSearchToken(selectedTradeAsset.value)
  const selectedBase = isLikelyXStockAsset.value
    ? getTokenizedStockBase(selectedTradeAsset.value)
    : stripKnownQuote(selectedTradeAsset.value)
  const wantedKind = getSelectedAssetKind()
  const aliases = [
    catalogAsset?.symbol,
    catalogAsset?.base,
    catalogAsset?.name,
    ...(Array.isArray(catalogAsset?.aliases) ? catalogAsset.aliases : [])
  ].filter(Boolean)

  let bestAliasScore = 0
  aliases.forEach(alias => {
    const normalizedAlias = normalizeSearchToken(alias)
    if (!normalizedAlias) return
    if (normalizedAlias === selectedSymbol) bestAliasScore = Math.max(bestAliasScore, 120)
    if (selectedBase && normalizedAlias === normalizeSearchToken(selectedBase)) bestAliasScore = Math.max(bestAliasScore, 92)
    if (normalizedAlias.includes(selectedSymbol) || selectedSymbol.includes(normalizedAlias)) bestAliasScore = Math.max(bestAliasScore, 74)
    bestAliasScore = Math.max(bestAliasScore, similarityScore(selectedSymbol, normalizedAlias) * 64)
    if (selectedBase) bestAliasScore = Math.max(bestAliasScore, similarityScore(selectedBase, normalizedAlias) * 58)
  })

  return bestAliasScore + getCatalogAssetTypeScore(catalogAsset, wantedKind) + getCatalogProviderScore(catalogAsset, wantedKind)
}

const findCatalogMatch = (catalog, allowedProviders = null) => {
  const allowed = Array.isArray(allowedProviders) && allowedProviders.length
    ? new Set(allowedProviders)
    : null
  const assets = Array.isArray(catalog?.assets) ? catalog.assets : []
  const scored = assets
    .filter(asset => !allowed || allowed.has(asset?.provider))
    .map(asset => ({ asset, score: scoreCatalogAsset(asset) }))
    .filter(item => item.score >= 100)
    .sort((a, b) => b.score - a.score)
  return scored[0]?.asset || null
}

const resolveCatalogMarketAsset = async (allowedProviders = null) => {
  let match = findCatalogMatch(await loadMarketCatalog(false), allowedProviders)
  if (match) return match
  match = findCatalogMatch(await loadMarketCatalog(true), allowedProviders)
  return match
}

const resolveXStockReferenceAsset = async () => {
  try {
    return await resolveCatalogMarketAsset(['XSTOCKS'])
  } catch {
    return null
  }
}

const buildBybitSymbolCandidates = () => {
  const candidates = new Set()
  const rawAsset = selectedTradeAsset.value
  const assetData = currentAssetData?.value || {}
  const rawParts = String(rawAsset).split(/[\/:_-]/).filter(Boolean)
  const directValues = [rawAsset, assetData.symbol, assetData.ticker]
  const aliasMap = { XBT: 'BTC' }

  directValues.forEach(value => pushCandidate(candidates, value))
  if (rawParts.length >= 2) pushCandidate(candidates, `${rawParts[0]}${rawParts[1]}`)

  const bases = new Set()
  directValues.forEach(value => {
    const base = isLikelyXStockAsset.value ? getTokenizedStockBase(value) : stripKnownQuote(value)
    if (base) bases.add(aliasMap[base] || base)
  })
  if (rawParts[0]) {
    const rawBase = isLikelyXStockAsset.value ? getTokenizedStockBase(rawParts[0]) : stripKnownQuote(rawParts[0])
    if (rawBase) bases.add(aliasMap[rawBase] || rawBase)
  }

  Array.from(bases).forEach(base => {
    ;['USDT', 'USDC'].forEach(quote => {
      pushCandidate(candidates, `${base}${quote}`)
      if (isLikelyXStockAsset.value) pushCandidate(candidates, `${base}X${quote}`)
    })
  })

  return Array.from(candidates)
}

const buildKrakenPairCandidates = () => {
  const candidates = new Set()
  const rawAsset = selectedTradeAsset.value
  const assetData = currentAssetData?.value || {}
  const rawParts = String(rawAsset).split(/[\/:_-]/).filter(Boolean)
  const directValues = [rawAsset, assetData.symbol, assetData.ticker]
  const aliasMap = {
    BTC: 'XBT',
    XBT: 'XBT',
    DOGE: 'XDG'
  }

  const bases = new Set()
  directValues.forEach(value => {
    const base = stripKnownQuote(value)
    if (base) bases.add(aliasMap[base] || base)
  })
  if (rawParts[0]) {
    const base = stripKnownQuote(rawParts[0])
    if (base) bases.add(aliasMap[base] || base)
  }

  const quoteCandidates = rawParts[1]
    ? [normalizeApiSymbol(rawParts[1]), 'USD', 'USDT', 'USDC', 'EUR']
    : ['USD', 'USDT', 'USDC', 'EUR']

  Array.from(bases).forEach(base => {
    quoteCandidates.forEach(quote => {
      if (!quote || quote === base) return
      candidates.add(`${base}${quote}`)
      candidates.add(`${base}/${quote}`)
      candidates.add(`X${base}Z${quote}`)
    })
  })

  return Array.from(candidates)
}

const pushYahooCandidate = (set, value) => {
  const symbol = normalizeYahooSymbol(value)
  if (symbol) set.add(symbol)
}

const pushYahooXStockCandidate = (set, value) => {
  const symbol = normalizeYahooSymbol(value)
  if (!symbol) return

  if (symbol.includes('-')) pushYahooCandidate(set, symbol)

  const compact = normalizeApiSymbol(symbol)
  if (!compact) return

  const base = compact.endsWith('USD') && compact.length > 3
    ? compact.slice(0, -3)
    : compact

  if (!base) return
  if (base.endsWith('X')) {
    pushYahooCandidate(set, `${base}-USD`)
    return
  }

  if (/\d/.test(base)) {
    pushYahooCandidate(set, `${base}-USD`)
    return
  }

  pushYahooCandidate(set, `${base}X-USD`)
}

const pushYahooXStockEquityFallback = (set, value) => {
  const compact = normalizeApiSymbol(value)
  if (!compact) return

  let base = compact.endsWith('USD') && compact.length > 3
    ? compact.slice(0, -3)
    : compact
  if (base.endsWith('X') && base.length > 1) base = base.slice(0, -1)
  pushYahooCandidate(set, base)
}

const addYahooXStockBaseValues = (set, value) => {
  const compact = normalizeApiSymbol(value)
  if (!compact) return

  const base = compact.endsWith('USD') && compact.length > 3
    ? compact.slice(0, -3)
    : compact
  if (!base) return

  set.add(base)
  if (base.endsWith('X') && base.length > 1) set.add(base.slice(0, -1))
  else set.add(`${base}X`)
}

const cleanXStockSearchName = (value) => {
  return String(value || '')
    .replace(/\btokenized\b/ig, ' ')
    .replace(/\bstock\b/ig, ' ')
    .replace(/\bxstock\b/ig, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const addYahooXStockSearchPhrase = (set, value) => {
  const phrase = cleanXStockSearchName(value)
  if (!phrase) return
  set.add(phrase)
  set.add(`${phrase} tokenized stock xStock`)
}

const addYahooXStockSearchQuery = (set, value) => {
  const query = String(value || '').trim()
  const compact = normalizeApiSymbol(query)
  if (!query || !compact) return
  if (/^[A-Z]{2}[A-Z0-9]{10}$/.test(compact)) return
  if (compact.length > 18) return
  set.add(query)
}

const getYahooXStockSearchContext = (referenceAsset = null) => {
  const rawAsset = selectedTradeAsset.value
  const assetData = currentAssetData?.value || {}
  const rawParts = String(rawAsset).split(/[\/:_-]/).filter(Boolean)
  const tokens = new Set()
  const queries = new Set()

  ;[
    rawAsset,
    assetData.symbol,
    assetData.ticker,
    getBaseAssetSymbol(),
    rawParts[0],
    referenceAsset?.symbol,
    referenceAsset?.base,
    ...(Array.isArray(referenceAsset?.aliases) ? referenceAsset.aliases : [])
  ]
    .filter(Boolean)
    .forEach(value => {
      addYahooXStockBaseValues(tokens, value)
      addYahooXStockSearchQuery(queries, value)
    })

  ;[
    referenceAsset?.name,
    assetData.name,
    getAssetName()
  ]
    .filter(Boolean)
    .forEach(value => addYahooXStockSearchPhrase(queries, value))

  return {
    tokens: Array.from(tokens),
    queries: Array.from(queries)
  }
}

const fetchYahooSearch = async (query) => {
  const normalizedQuery = String(query || '').trim().replace(/\s+/g, ' ').toUpperCase()
  if (!normalizedQuery) return []
  if (yahooSearchCache.has(normalizedQuery)) return yahooSearchCache.get(normalizedQuery)

  const params = new URLSearchParams({ q: normalizedQuery })
  let lastError = null

  try {
    const response = await fetch(`/api/market-data/yahoo-search?${params.toString()}`)
    const payload = await readJsonResponse(response, 'Yahoo search proxy')
    const quotes = Array.isArray(payload?.quotes) ? payload.quotes : []
    yahooSearchCache.set(normalizedQuery, quotes)
    return quotes
  } catch (error) {
    lastError = error
  }

  if (isTauriRuntime()) {
    const nativeParams = {
      q: normalizedQuery,
      quotesCount: '20',
      newsCount: '0',
      enableFuzzyQuery: 'true'
    }
    const hosts = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']
    for (const host of hosts) {
      try {
        const payload = parseJsonText(
          await invoke('ibkr_fetch_xml', {
            url: `${host}/v1/finance/search`,
            params: nativeParams
          }),
          `Yahoo search native ${host}`
        )
        const quotes = Array.isArray(payload?.quotes) ? payload.quotes : []
        yahooSearchCache.set(normalizedQuery, quotes)
        return quotes
      } catch (error) {
        lastError = error
      }
    }
  }

  throw lastError || new Error('Yahoo search request failed')
}

const scoreYahooXStockQuote = (quote, searchTokens) => {
  const symbol = normalizeYahooSymbol(quote?.symbol)
  const compactSymbol = normalizeApiSymbol(symbol)
  if (!symbol || !compactSymbol) return 0

  const quoteType = String(quote?.quoteType || '').toUpperCase()
  const typeDisp = String(quote?.typeDisp || '').toLowerCase()
  const name = `${quote?.shortname || ''} ${quote?.longname || ''}`.toLowerCase()
  const isCryptoCurrency = quoteType === 'CRYPTOCURRENCY' || typeDisp.includes('cryptocurrency')
  const looksXStock = name.includes('xstock')
  const looksTokenized = looksXStock || name.includes('tokenized') || name.includes('stock token')
  let score = 0

  if (isCryptoCurrency) score += 80
  if (symbol.endsWith('-USD') || compactSymbol.endsWith('USD')) score += 36
  if (looksXStock) score += 70
  else if (looksTokenized) score += 34
  if (!isCryptoCurrency && !looksTokenized) score -= 70

  searchTokens.forEach(value => {
    const token = normalizeApiSymbol(value)
    if (!token) return
    const tokenWithUsd = `${token}USD`
    if (compactSymbol === tokenWithUsd) score += 140
    if (compactSymbol.startsWith(tokenWithUsd)) score += 120
    if (compactSymbol.startsWith(token)) score += token.length <= 1 ? 20 : 105
    if (compactSymbol.includes(token)) score += token.length <= 1 ? 8 : 28
    if (similarityScore(token, compactSymbol.replace(/USD$/, '')) > 0.84) score += 26
  })

  return score
}

const resolveYahooXStockSearchCandidates = async (referenceAsset = null) => {
  const { queries, tokens } = getYahooXStockSearchContext(referenceAsset)
  const quotes = []

  for (const value of queries) {
    try {
      quotes.push(...await fetchYahooSearch(value))
    } catch {}
  }

  const uniqueSymbols = new Set()
  return quotes
    .map(quote => ({
      symbol: normalizeYahooSymbol(quote?.symbol),
      score: scoreYahooXStockQuote(quote, tokens)
    }))
    .filter(item => {
      if (!item.symbol || item.score < 120 || uniqueSymbols.has(item.symbol)) return false
      uniqueSymbols.add(item.symbol)
      return true
    })
    .sort((a, b) => b.score - a.score)
    .map(item => item.symbol)
}

const getBaseAssetSymbol = () => {
  const rawAsset = selectedTradeAsset.value
  const rawParts = String(rawAsset).split(/[\/:_-]/).filter(Boolean)
  return stripKnownQuote(rawParts[0] || rawAsset)
}

const buildYahooSymbolCandidates = async () => {
  const candidates = new Set()
  const rawAsset = selectedTradeAsset.value
  const assetData = currentAssetData?.value || {}
  const assetType = getAssetType()
  const assetName = getAssetName()
  const rawSymbol = normalizeYahooSymbol(rawAsset)
  const base = getBaseAssetSymbol()
  const rawParts = String(rawAsset).split(/[\/:_-]/).filter(Boolean).map(normalizeYahooSymbol)
  const isTokenizedStock = assetName.toLowerCase().includes('tokenized stock') || assetType === 'xstocks'

  const directValues = [rawAsset, assetData.symbol, assetData.ticker]
  if (isTokenizedStock) {
    const xstockReference = await resolveXStockReferenceAsset()
    const searchedSymbols = await resolveYahooXStockSearchCandidates(xstockReference)
    searchedSymbols.forEach(symbol => pushYahooCandidate(candidates, symbol))

    const tokenizedValues = [...directValues, rawSymbol, base, rawParts[0], xstockReference?.symbol, xstockReference?.base].filter(Boolean)
    tokenizedValues
      .forEach(value => pushYahooXStockCandidate(candidates, value))
    tokenizedValues
      .forEach(value => pushYahooXStockEquityFallback(candidates, value))
    return Array.from(candidates)
  }

  directValues.forEach(value => pushYahooCandidate(candidates, value))

  const commodityMap = {
    XAU: 'GC=F',
    XAUUSD: 'GC=F',
    GOLD: 'GC=F',
    GC: 'GC=F',
    XAG: 'SI=F',
    XAGUSD: 'SI=F',
    SILVER: 'SI=F',
    SI: 'SI=F',
    XPT: 'PL=F',
    XPTUSD: 'PL=F',
    PLATINUM: 'PL=F',
    XPD: 'PA=F',
    XPDUSD: 'PA=F',
    PALLAD: 'PA=F',
    PALLADIUM: 'PA=F',
    OIL: 'CL=F',
    WTI: 'CL=F',
    USOIL: 'CL=F',
    CL: 'CL=F',
    BRENT: 'BZ=F',
    UKOIL: 'BZ=F',
    NATGAS: 'NG=F',
    NG: 'NG=F',
    NATURALGAS: 'NG=F',
    SOYBN: 'ZS=F',
    SOYBEAN: 'ZS=F',
    SOYBEANS: 'ZS=F',
    WHEAT: 'ZW=F',
    CORN: 'ZC=F',
    COFFEE: 'KC=F',
    SUGAR: 'SB=F',
    COTTON: 'CT=F',
    COPPER: 'HG=F',
    HG: 'HG=F',
    COCOA: 'CC=F',
    LIVCAT: 'LE=F',
    LIVECATTLE: 'LE=F',
    FDRCAT: 'GF=F',
    FEEDERCATTLE: 'GF=F',
    LN_HOG: 'HE=F',
    LNHOG: 'HE=F',
    LEANHOGS: 'HE=F',
    ORNG_J: 'OJ=F',
    ORNGJ: 'OJ=F',
    ORANGEJUICE: 'OJ=F',
    RICE: 'ZR=F',
    ROUGHRICE: 'ZR=F',
    LUMBER: 'LBR=F',
    PLATIN: 'PL=F',
    HEAT_O: 'HO=F',
    HEATO: 'HO=F',
    HEATINGOIL: 'HO=F',
    GASOLN: 'RB=F',
    GASOLINE: 'RB=F',
    RBOBGASOLINE: 'RB=F'
  }

  const indexMap = {
    SPX: '^GSPC',
    SP500: '^GSPC',
    SPX500: '^GSPC',
    US500: '^GSPC',
    NASDAQ: '^IXIC',
    NDX: '^NDX',
    NAS100: '^NDX',
    US100: '^NDX',
    DJI: '^DJI',
    DOW: '^DJI',
    US30: '^DJI',
    RUT: '^RUT',
    RUSSELL2000: '^RUT',
    US2000: '^RUT',
    DAX: '^GDAXI',
    DAX40: '^GDAXI',
    DE40: '^GDAXI',
    GER40: '^GDAXI',
    FTSE: '^FTSE',
    FTSE100: '^FTSE',
    UK100: '^FTSE',
    NIKKEI: '^N225',
    NIKKEI225: '^N225',
    JP225: '^N225',
    JPN225: '^N225',
    HSI: '^HSI',
    HANGSENG: '^HSI',
    HK50: '^HSI',
    STOXX50: '^STOXX50E',
    EU50: '^STOXX50E',
    EUSTX50: '^STOXX50E',
    CAC: '^FCHI',
    CAC40: '^FCHI',
    FRA40: '^FCHI',
    ASX200: '^AXJO',
    AUS200: '^AXJO'
  }

  const mapped = commodityMap[rawSymbol] || commodityMap[base] || indexMap[rawSymbol] || indexMap[base]
  if (mapped) pushYahooCandidate(candidates, mapped)

  if (assetType === 'forex' || rawParts.length >= 2) {
    const left = rawParts[0] || base
    const right = rawParts[1] || (rawSymbol.endsWith('USD') ? 'USD' : '')
    if (left && right) pushYahooCandidate(candidates, `${left}${right}=X`)
    if (rawSymbol.length === 6) pushYahooCandidate(candidates, `${rawSymbol}=X`)
  }

  if (isLikelyCryptoAsset.value) {
    const cryptoBase = base === 'XBT' ? 'BTC' : base
    ;['USD', 'USDC'].forEach(quote => pushYahooCandidate(candidates, `${cryptoBase}-${quote}`))
  }

  if (assetType === 'crypto' && rawSymbol.endsWith('X')) {
    if (rawSymbol.endsWith('X') && rawSymbol.length > 1) pushYahooCandidate(candidates, rawSymbol.slice(0, -1))
    if (base.endsWith('X') && base.length > 1) pushYahooCandidate(candidates, base.slice(0, -1))
  }

  pushYahooCandidate(candidates, base)
  if (base.includes('.')) pushYahooCandidate(candidates, base.replace('.', '-'))

  return Array.from(candidates)
}

const fetchJsonWithFallback = async (path) => {
  const hosts = ['https://api.binance.com', 'https://api1.binance.com', 'https://api2.binance.com']
  let lastError = null
  for (const host of hosts) {
    try {
      const response = await fetch(`${host}${path}`)
      return await readJsonResponse(response, `Binance ${host}`)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError || new Error('Public API request failed')
}

const parseJsonText = (text, label) => {
  const trimmed = String(text || '').trim()
  if (!trimmed) throw new Error(`${label} returned an empty response`)
  if (!/^[\[{]/.test(trimmed)) throw new Error(`${label} returned a non-JSON response`)
  try {
    return JSON.parse(trimmed)
  } catch (error) {
    throw new Error(`${label} returned invalid JSON`)
  }
}

const readJsonResponse = async (response, label) => {
  const text = await response.text()
  if (!response.ok) {
    const detail = text ? ` - ${text.slice(0, 160)}` : ''
    throw new Error(`${label} HTTP ${response.status}${detail}`)
  }
  return parseJsonText(text, label)
}

const isTauriRuntime = () => {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__)
}

const getBinanceTradableSymbols = async () => {
  if (!binanceSymbolsPromise) {
    binanceSymbolsPromise = fetchJsonWithFallback('/api/v3/exchangeInfo').then(payload => {
      const symbols = Array.isArray(payload?.symbols) ? payload.symbols : []
      return new Set(
        symbols
          .filter(item => item?.status === 'TRADING' && item?.isSpotTradingAllowed !== false)
          .map(item => item.symbol)
      )
    })
  }
  return binanceSymbolsPromise
}

const resolveBinanceSymbol = async () => {
  const tradableSymbols = await getBinanceTradableSymbols()
  const candidates = buildBinanceSymbolCandidates()
  return candidates.find(candidate => tradableSymbols.has(candidate)) || ''
}

const isUsableOhlcCandle = (candle) => {
  if (!Number.isFinite(candle?.time)) return false
  const values = [candle.open, candle.high, candle.low, candle.close]
  return values.every(value => Number.isFinite(value) && value > 0) && candle.high >= candle.low
}

const parseKlineCandles = (rows) => {
  return (Array.isArray(rows) ? rows : [])
    .map(row => ({
      time: Number(row[0]),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5])
    }))
    .filter(isUsableOhlcCandle)
}

const parseBybitKlineCandles = (payload) => {
  if (payload?.retCode !== 0) throw new Error(payload?.retMsg || 'Bybit kline error')
  const rows = Array.isArray(payload?.result?.list) ? payload.result.list : []
  return rows
    .map(row => ({
      time: Number(row[0]),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5] || 0)
    }))
    .filter(isUsableOhlcCandle)
    .sort((a, b) => a.time - b.time)
}

const parseKrakenOhlcCandles = (payload) => {
  if (Array.isArray(payload?.error) && payload.error.length) {
    throw new Error(payload.error.join(', '))
  }

  const result = payload?.result || {}
  const pairKey = Object.keys(result).find(key => key !== 'last' && Array.isArray(result[key]))
  const rows = pairKey ? result[pairKey] : []

  return rows
    .map(row => ({
      time: Number(row[0]) * 1000,
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[6] || 0)
    }))
    .filter(isUsableOhlcCandle)
    .sort((a, b) => a.time - b.time)
}

const getMarketRequestRange = () => {
  const range = tradeTimeRange.value
  if (!range) return null
  const padding = clamp((range.end - range.start) * 0.12, 2 * MINUTE_MS, 6 * HOUR_MS)
  return {
    start: Math.max(0, Math.floor(range.start - padding)),
    end: Math.ceil(range.end + padding)
  }
}

const getTimeframeLimit = (timeframe) => {
  const range = getMarketRequestRange()
  if (!range) return timeframe.id === '1m' ? 120 : 288
  return clamp(Math.ceil((range.end - range.start) / timeframe.durationMs) + 8, 2, MAX_API_CANDLES)
}

const filterCandlesToTradeWindow = (candles, timeframe) => {
  const range = tradeTimeRange.value
  if (!range) return candles
  return candles.filter(candle => {
    const candleStart = candle.time
    const candleEnd = candleStart + timeframe.durationMs
    return candleStart < range.end && candleEnd > range.start
  })
}

const parseYahooChartCandles = (payload) => {
  const result = payload?.chart?.result?.[0]
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : []
  const quote = result?.indicators?.quote?.[0] || {}
  const opens = quote.open || []
  const highs = quote.high || []
  const lows = quote.low || []
  const closes = quote.close || []
  const volumes = quote.volume || []

  return timestamps
    .map((timestamp, index) => ({
      time: Number(timestamp) * 1000,
      open: Number(opens[index]),
      high: Number(highs[index]),
      low: Number(lows[index]),
      close: Number(closes[index]),
      volume: Number(volumes[index] || 0)
    }))
    .filter(isUsableOhlcCandle)
}

const getYahooChartTimeZone = (payload) => {
  const meta = payload?.chart?.result?.[0]?.meta || {}
  return meta.exchangeTimezoneName || meta.timezone || 'UTC'
}

const getLocalDateKey = (timestamp, timeZone) => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(timestamp))
  } catch {
    return new Date(timestamp).toISOString().slice(0, 10)
  }
}

const aggregateCandles = (candles, bucketMs) => {
  const buckets = new Map()
  candles.forEach(candle => {
    const bucketTime = Math.floor(candle.time / bucketMs) * bucketMs
    const bucket = buckets.get(bucketTime)
    if (!bucket) {
      buckets.set(bucketTime, { ...candle, time: bucketTime })
      return
    }
    bucket.high = Math.max(bucket.high, candle.high)
    bucket.low = Math.min(bucket.low, candle.low)
    bucket.close = candle.close
    bucket.volume += candle.volume || 0
  })
  return Array.from(buckets.values()).sort((a, b) => a.time - b.time)
}

const aggregateCandlesByLocalSession = (candles, bucketMs, timeZone = 'UTC') => {
  const sessions = new Map()
  candles
    .slice()
    .sort((a, b) => a.time - b.time)
    .forEach(candle => {
      const dayKey = getLocalDateKey(candle.time, timeZone)
      if (!sessions.has(dayKey)) sessions.set(dayKey, [])
      sessions.get(dayKey).push(candle)
    })

  return Array.from(sessions.values())
    .flatMap(sessionCandles => {
      const sessionStart = sessionCandles[0]?.time
      if (!Number.isFinite(sessionStart)) return []
      const buckets = new Map()
      sessionCandles.forEach(candle => {
        const bucketTime = sessionStart + Math.floor((candle.time - sessionStart) / bucketMs) * bucketMs
        const bucket = buckets.get(bucketTime)
        if (!bucket) {
          buckets.set(bucketTime, { ...candle, time: bucketTime })
          return
        }
        bucket.high = Math.max(bucket.high, candle.high)
        bucket.low = Math.min(bucket.low, candle.low)
        bucket.close = candle.close
        bucket.volume += candle.volume || 0
      })
      return Array.from(buckets.values())
    })
    .sort((a, b) => a.time - b.time)
}

const shouldUseYahooRegularSession = () => getSelectedAssetKind() === 'stock'

const fetchYahooChart = async (symbol, interval, options = {}) => {
  const requestRange = getMarketRequestRange()
  if (!requestRange) throw new Error('Invalid trade time range')
  const includePrePost = options.includePrePost !== false
  const params = new URLSearchParams({
    interval,
    period1: String(Math.floor(requestRange.start / 1000)),
    period2: String(Math.ceil(requestRange.end / 1000)),
    includePrePost: includePrePost ? 'true' : 'false'
  })
  const proxyParams = new URLSearchParams(params)
  proxyParams.set('symbol', symbol)
  let lastError = null

  try {
    const response = await fetch(`/api/market-data/yahoo-chart?${proxyParams.toString()}`)
    const payload = await readJsonResponse(response, 'Yahoo proxy')
    const apiError = payload?.chart?.error
    if (apiError) throw new Error(apiError.description || apiError.code || 'Yahoo chart error')
    return payload
  } catch (error) {
    lastError = error
  }

  if (isTauriRuntime()) {
    const encodedSymbol = encodeURIComponent(symbol)
    const hosts = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']
    for (const host of hosts) {
      try {
        const payload = parseJsonText(
          await invoke('ibkr_fetch_xml', {
            url: `${host}/v8/finance/chart/${encodedSymbol}`,
            params: Object.fromEntries(params.entries())
          }),
          `Yahoo native ${host}`
        )
        const apiError = payload?.chart?.error
        if (apiError) throw new Error(apiError.description || apiError.code || 'Yahoo chart error')
        return payload
      } catch (error) {
        lastError = error
      }
    }
  }

  throw lastError || new Error('Yahoo chart request failed')
}

const loadYahooMarketData = async (preferredSymbol = '') => {
  const candidates = preferredSymbol ? [preferredSymbol] : await buildYahooSymbolCandidates()
  const useRegularSession = shouldUseYahooRegularSession()
  let lastError = null

  for (const symbol of candidates) {
    try {
      const marketData = {}
      let hourlyPayload = null
      let hourly = null
      let hourlyTimeZone = 'UTC'
      for (const timeframe of availableTimeframeOptions.value) {
        if (timeframe.id === '4h' || timeframe.id === '1h') {
          if (!hourly) {
            hourlyPayload = await fetchYahooChart(symbol, '60m', { includePrePost: !useRegularSession })
            hourly = parseYahooChartCandles(hourlyPayload)
            hourlyTimeZone = getYahooChartTimeZone(hourlyPayload)
          }
          const candles = timeframe.id === '4h'
            ? (useRegularSession
              ? aggregateCandlesByLocalSession(hourly, timeframe.durationMs, hourlyTimeZone)
              : aggregateCandles(hourly, timeframe.durationMs))
            : hourly
          marketData[timeframe.id] = adjustCandlesToStudyMetrics(filterCandlesToTradeWindow(candles, timeframe))
          continue
        }
        const candles = parseYahooChartCandles(await fetchYahooChart(symbol, timeframe.yahooInterval, { includePrePost: !useRegularSession }))
        marketData[timeframe.id] = adjustCandlesToStudyMetrics(filterCandlesToTradeWindow(candles, timeframe))
      }

      if (Object.values(marketData).some(candles => candles?.length)) {
        return {
          provider: 'YAHOO',
          symbol,
          candlesByTimeframe: marketData
        }
      }
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('No Yahoo market data candidates matched')
}

const loadBinanceMarketData = async (preferredSymbol = '') => {
  const symbol = preferredSymbol || await resolveBinanceSymbol()
  if (!symbol) throw new Error(`No Binance market for ${selectedTradeAsset.value}`)
  const requestRange = getMarketRequestRange()
  if (!requestRange) throw new Error('Invalid trade time range')

  const timeframeEntries = await Promise.all(availableTimeframeOptions.value.map(async timeframe => {
    const params = new URLSearchParams({
      symbol,
      interval: timeframe.binanceInterval,
      startTime: String(requestRange.start),
      endTime: String(requestRange.end),
      limit: String(getTimeframeLimit(timeframe))
    })
    const rows = await fetchJsonWithFallback(`/api/v3/klines?${params.toString()}`)
    return [timeframe.id, adjustCandlesToStudyMetrics(filterCandlesToTradeWindow(parseKlineCandles(rows), timeframe))]
  }))

  return {
    provider: 'BINANCE',
    symbol,
    candlesByTimeframe: Object.fromEntries(timeframeEntries)
  }
}

const fetchBybitKlines = async ({ category, symbol, timeframe }) => {
  const requestRange = getMarketRequestRange()
  if (!requestRange) throw new Error('Invalid trade time range')
  const params = new URLSearchParams({
    category,
    symbol,
    interval: timeframe.bybitInterval,
    start: String(requestRange.start),
    end: String(requestRange.end),
    limit: String(getTimeframeLimit(timeframe))
  })
  const response = await fetch(`https://api.bybit.com/v5/market/kline?${params.toString()}`)
  return parseBybitKlineCandles(await readJsonResponse(response, 'Bybit kline'))
}

const loadBybitMarketData = async (preferredAsset = null) => {
  const candidates = buildBybitSymbolCandidates()
  const categories = isLikelyXStockAsset.value ? ['spot'] : ['spot', 'linear']
  const candidateMarkets = preferredAsset?.symbol
    ? [{ category: preferredAsset.market || 'spot', symbol: preferredAsset.symbol }]
    : categories.flatMap(category => candidates.map(symbol => ({ category, symbol })))
  let lastError = null

  for (const { category, symbol } of candidateMarkets) {
    try {
      const timeframeEntries = await Promise.all(availableTimeframeOptions.value.map(async timeframe => {
        const candles = await fetchBybitKlines({ category, symbol, timeframe })
        return [timeframe.id, adjustCandlesToStudyMetrics(filterCandlesToTradeWindow(candles, timeframe))]
      }))
      const candlesByTimeframe = Object.fromEntries(timeframeEntries)
      if (Object.values(candlesByTimeframe).some(candles => candles?.length)) {
        return {
          provider: `BYBIT_${String(category).toUpperCase()}`,
          symbol,
          candlesByTimeframe
        }
      }
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('No Bybit market data candidates matched')
}

const fetchKrakenOhlc = async ({ pair, timeframe }) => {
  const requestRange = getMarketRequestRange()
  if (!requestRange) throw new Error('Invalid trade time range')
  const params = new URLSearchParams({
    pair,
    interval: timeframe.krakenInterval,
    since: String(Math.floor(requestRange.start / 1000))
  })
  const response = await fetch(`https://api.kraken.com/0/public/OHLC?${params.toString()}`)
  return filterCandlesToTradeWindow(parseKrakenOhlcCandles(await readJsonResponse(response, 'Kraken OHLC')), timeframe)
}

const loadKrakenMarketData = async (preferredSymbol = '') => {
  const candidates = preferredSymbol ? [preferredSymbol] : buildKrakenPairCandidates()
  let lastError = null

  for (const pair of candidates) {
    try {
      const timeframeEntries = await Promise.all(availableTimeframeOptions.value.map(async timeframe => {
        const candles = await fetchKrakenOhlc({ pair, timeframe })
        return [timeframe.id, adjustCandlesToStudyMetrics(candles)]
      }))
      const candlesByTimeframe = Object.fromEntries(timeframeEntries)
      if (Object.values(candlesByTimeframe).some(candles => candles?.length)) {
        return {
          provider: 'KRAKEN',
          symbol: pair,
          candlesByTimeframe
        }
      }
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('No Kraken market data candidates matched')
}

const loadCatalogMatchedMarketData = async (catalogAsset) => {
  if (!catalogAsset?.provider || !catalogAsset?.symbol) throw new Error('Catalog asset is incomplete')
  if (catalogAsset.provider === 'BYBIT') return loadBybitMarketData(catalogAsset)
  if (catalogAsset.provider === 'BINANCE') return loadBinanceMarketData(catalogAsset.symbol)
  if (catalogAsset.provider === 'KRAKEN') return loadKrakenMarketData(catalogAsset.symbol)
  if (catalogAsset.provider === 'YAHOO_LOCAL') return loadYahooMarketData(catalogAsset.symbol)
  throw new Error(`Unsupported catalog provider ${catalogAsset.provider}`)
}

const loadPublicMarketData = async () => {
  if (!availableTimeframeOptions.value.length) throw new Error('Trade duration is too short or invalid')
  const wantedKind = getSelectedAssetKind()
  let preferredCatalogProviders = null
  let loaders = [loadYahooMarketData, loadBinanceMarketData]

  if (isYahooOnlyMarketKind(wantedKind)) {
    preferredCatalogProviders = ['YAHOO_LOCAL']
    loaders = [loadYahooMarketData]
  } else if (wantedKind === 'crypto') {
    preferredCatalogProviders = ['BYBIT', 'BINANCE', 'KRAKEN']
    loaders = [loadBybitMarketData, loadBinanceMarketData, loadKrakenMarketData]
  } else if (isLikelyXStockAsset.value) {
    // xStocks use the public market history of their underlying equity.
    // The local catalog keeps the exact mapping, e.g. NFLXX -> NFLX,
    // so resolve it before trying fuzzy Yahoo symbol candidates.
    preferredCatalogProviders = ['YAHOO_LOCAL']
    loaders = [loadYahooMarketData]
  }

  let lastError = null
  const catalogMatch = await resolveCatalogMarketAsset(preferredCatalogProviders)
  if (catalogMatch) {
    try {
      return await loadCatalogMatchedMarketData(catalogMatch)
    } catch (error) {
      lastError = error
    }
  }

  for (const loader of loaders) {
    try {
      const result = await loader()
      if (Object.values(result?.candlesByTimeframe || {}).some(candles => candles?.length)) {
        return result
      }
    } catch (error) {
      lastError = error
    }
  }
  throw lastError || new Error('No public market data provider matched')
}

const syncActiveGeneratedTimeframe = () => {
  const generatedIds = getGeneratedTimeframeIds()
  if (generatedIds.length) {
    if (!generatedIds.includes(activeGeneratedTimeframe.value)) {
      activeGeneratedTimeframe.value = generatedIds[0]
    }
    return
  }

  const available = availableTimeframeOptions.value
  if (!available.length) return
  if (!available.some(timeframe => timeframe.id === activeGeneratedTimeframe.value)) {
    activeGeneratedTimeframe.value = available[0].id
  }
}

const selectFirstGeneratedTimeframe = (candlesByTimeframe) => {
  const preferred = availableTimeframeOptions.value.find(timeframe => candlesByTimeframe?.[timeframe.id]?.length)
  if (preferred) {
    activeGeneratedTimeframe.value = preferred.id
    return
  }

  const generatedIds = getGeneratedTimeframeIds(candlesByTimeframe)
  if (generatedIds.length) activeGeneratedTimeframe.value = generatedIds[0]
}

const parsePositiveMetric = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : Number.NaN
}

const IN_TRADE_NOISE_PCT = 0.5
const IN_TRADE_SESSION_DAY_SECONDS = {
  stock: 8 * 3600,
  forex: 24 * 3600,
  crypto: 24 * 3600,
  xstock: 24 * 3600,
  metal: 23 * 3600,
  commodity: 23 * 3600,
  index: 23 * 3600,
  unknown: 24 * 3600
}

const getInTradeSessionDaySeconds = () => {
  return IN_TRADE_SESSION_DAY_SECONDS[getSelectedAssetKind()] || IN_TRADE_SESSION_DAY_SECONDS.unknown
}

const getGeneratedAnalysisDirection = () => {
  const raw = String(side?.value || '').toUpperCase()
  if (raw.includes('SHORT')) return 'SHORT'
  if (raw.includes('LONG')) return 'LONG'
  return null
}

const getGeneratedAnalysisCandles = (candlesByTimeframe) => {
  const finest = [...timeframeOptions]
    .reverse()
    .find(timeframe => candlesByTimeframe?.[timeframe.id]?.length)
  return {
    timeframe: finest || null,
    candles: finest ? candlesByTimeframe[finest.id] : []
  }
}

const getGeneratedAnalysisCandleWindow = (candles, index, timeframe) => {
  const current = Number(candles[index]?.time)
  const next = Number(candles[index + 1]?.time)
  const nominalStepSeconds = ((timeframe?.durationMs || MINUTE_MS) / 1000)
  const range = tradeTimeRange.value
  if (Number.isFinite(current) && range) {
    const candleStart = current
    const candleEnd = current + (nominalStepSeconds * 1000)
    const overlapStart = Math.max(candleStart, range.start)
    const overlapEnd = Math.min(candleEnd, range.end)
    return overlapEnd > overlapStart ? { start: overlapStart, end: overlapEnd } : null
  }
  if (Number.isFinite(current) && Number.isFinite(next) && next > current) {
    return { start: current, end: current + Math.min(next - current, nominalStepSeconds * 1000) }
  }
  const previous = Number(candles[index - 1]?.time)
  if (Number.isFinite(current) && Number.isFinite(previous) && current > previous) {
    return { start: current, end: current + Math.min(current - previous, nominalStepSeconds * 1000) }
  }
  return Number.isFinite(current) ? { start: current, end: current + (nominalStepSeconds * 1000) } : null
}

const getBodyAwareExtremePrices = (candles, entryPrice) => {
  const confirmedHighs = []
  const confirmedLows = []
  let countedIndex = 0

  candles.forEach(candle => {
    const open = Number(candle.open)
    const close = Number(candle.close)
    const high = Number(candle.high)
    const low = Number(candle.low)
    if (![open, close, high, low].every(Number.isFinite)) return

    const isFirstCountedCandle = countedIndex === 0
    countedIndex += 1

    if (isFirstCountedCandle) {
      if (close >= open) confirmedHighs.push(high)
      if (close <= open) confirmedLows.push(low)
      return
    }

    const crossesEntry = low < entryPrice && high > entryPrice
    const entirelyAboveEntry = low >= entryPrice
    const entirelyBelowEntry = high <= entryPrice

    if (entirelyAboveEntry || (crossesEntry && close >= open)) {
      confirmedHighs.push(high)
    }
    if (entirelyBelowEntry || (crossesEntry && close <= open)) {
      confirmedLows.push(low)
    }
  })

  return {
    maxPrice: confirmedHighs.length ? Math.max(...confirmedHighs) : entryPrice,
    minPrice: confirmedLows.length ? Math.min(...confirmedLows) : entryPrice
  }
}

const classifyGeneratedPathShape = ({ states, firstImpulse, maePct, mfePct, captureRatio }) => {
  const flips = states.reduce((count, state, index) => {
    if (!index || state === 'noise' || states[index - 1] === 'noise') return count
    return state !== states[index - 1] ? count + 1 : count
  }, 0)

  if (flips >= 3) return 'CHOPPY_PATH'
  if (Math.abs(maePct) < IN_TRADE_NOISE_PCT && mfePct < IN_TRADE_NOISE_PCT) return 'NOISE_RANGE'
  if (firstImpulse === 'LOSS' && mfePct >= IN_TRADE_NOISE_PCT) return 'ADVERSE_THEN_RECOVERY'
  if (firstImpulse === 'PROFIT' && Math.abs(maePct) >= IN_TRADE_NOISE_PCT) return 'FAVORABLE_THEN_PULLBACK'
  if (mfePct >= IN_TRADE_NOISE_PCT && Number.isFinite(captureRatio) && captureRatio >= 65) return 'CLEAN_TREND_CAPTURE'
  if (mfePct >= IN_TRADE_NOISE_PCT && Number.isFinite(captureRatio) && captureRatio < 35) return 'LATE_EXIT_AFTER_MFE'
  return firstImpulse === 'PROFIT' ? 'FAVORABLE_FIRST' : 'ADVERSE_FIRST'
}

const classifyGeneratedCandleState = (candle, direction, entryPrice, lossLimit, profitLimit) => {
  const open = Number(candle.open)
  const close = Number(candle.close)
  const high = Number(candle.high)
  const low = Number(candle.low)
  if (![open, close, high, low].every(Number.isFinite)) return 'noise'

  const isBullish = close >= open
  const isBearish = close <= open
  const isLong = direction === 'LONG'
  const isLoss = isLong
    ? low <= lossLimit && (high <= entryPrice || close <= entryPrice || isBearish)
    : high >= lossLimit && (low >= entryPrice || close >= entryPrice || isBullish)
  const isProfit = isLong
    ? high >= profitLimit && (low >= entryPrice || close >= entryPrice || isBullish)
    : low <= profitLimit && (high <= entryPrice || close <= entryPrice || isBearish)

  if (isLoss && isProfit) {
    if (isLong) return close >= entryPrice || isBullish ? 'profit' : 'loss'
    return close <= entryPrice || isBearish ? 'profit' : 'loss'
  }
  if (isLoss) return 'loss'
  if (isProfit) return 'profit'
  return 'noise'
}

const summarizePathCleanliness = (states) => {
  const validStates = states.filter(Boolean)
  const stateCount = validStates.length
  if (!stateCount) return { score: Number.NaN, flips: Number.NaN, noiseSharePct: Number.NaN }

  let flips = 0
  let previousMeaningful = ''
  let meaningfulCount = 0
  let noiseCount = 0

  validStates.forEach((state) => {
    if (state === 'noise') {
      noiseCount += 1
      return
    }
    meaningfulCount += 1
    if (previousMeaningful && previousMeaningful !== state) flips += 1
    previousMeaningful = state
  })

  const noiseSharePct = (noiseCount / stateCount) * 100
  const score = meaningfulCount
    ? Math.round(Math.min(100, Math.max(0, 100 - (flips * 22) - (noiseSharePct * 0.25))))
    : 0

  return { score, flips, noiseSharePct }
}

const buildGeneratedInTradeAnalysis = (candlesByTimeframe) => {
  const entryPrice = parsePositiveMetric(entryMethodEnabled?.value ? averageEntry?.value : entry?.value)
  const exitPrice = parsePositiveMetric(isClosed?.value && exitMethodEnabled?.value ? averageExit?.value : exit?.value)
  const direction = getGeneratedAnalysisDirection()
  const { timeframe, candles } = getGeneratedAnalysisCandles(candlesByTimeframe)

  if (!Number.isFinite(entryPrice) || !direction || !candles.length) return null

  const highs = candles.map(candle => Number(candle.high)).filter(Number.isFinite)
  const lows = candles.map(candle => Number(candle.low)).filter(Number.isFinite)
  if (!highs.length || !lows.length) return null

  const { maxPrice, minPrice } = getBodyAwareExtremePrices(candles, entryPrice)
  const lossLimit = direction === 'LONG'
    ? entryPrice * (1 - (IN_TRADE_NOISE_PCT / 100))
    : entryPrice * (1 + (IN_TRADE_NOISE_PCT / 100))
  const profitLimit = direction === 'LONG'
    ? entryPrice * (1 + (IN_TRADE_NOISE_PCT / 100))
    : entryPrice * (1 - (IN_TRADE_NOISE_PCT / 100))

  let meaningfulLossSeconds = 0
  let meaningfulProfitSeconds = 0
  let meaningfulLossStartTime = null
  let meaningfulLossEndTime = null
  let meaningfulProfitStartTime = null
  let meaningfulProfitEndTime = null
  let firstImpulse = null
  const states = []
  const pathSegments = []

  candles.forEach((candle, index) => {
    const state = classifyGeneratedCandleState(candle, direction, entryPrice, lossLimit, profitLimit)
    const isLoss = state === 'loss'
    const isProfit = state === 'profit'
    const window = getGeneratedAnalysisCandleWindow(candles, index, timeframe)
    const stepSeconds = window ? Math.max(0, (window.end - window.start) / 1000) : 0

    if (isLoss) {
      meaningfulLossSeconds += stepSeconds
      if (window) {
        meaningfulLossStartTime = meaningfulLossStartTime ?? window.start
        meaningfulLossEndTime = window.end
      }
    }
    if (isProfit) {
      meaningfulProfitSeconds += stepSeconds
      if (window) {
        meaningfulProfitStartTime = meaningfulProfitStartTime ?? window.start
        meaningfulProfitEndTime = window.end
      }
    }
    if (!firstImpulse && (isLoss || isProfit)) firstImpulse = isLoss ? 'LOSS' : 'PROFIT'
    states.push(state)
    if (window) {
      const previous = pathSegments[pathSegments.length - 1]
      if (previous?.state === state && window.start <= previous.end + 1) {
        previous.end = window.end
      } else {
        pathSegments.push({ state, start: window.start, end: window.end })
      }
    }
  })

  const rawMaePct = direction === 'LONG'
    ? ((minPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - maxPrice) / entryPrice) * 100
  const rawMfePct = direction === 'LONG'
    ? ((maxPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - minPrice) / entryPrice) * 100
  const maePct = rawMaePct <= -IN_TRADE_NOISE_PCT ? rawMaePct : 0
  const mfePct = rawMfePct >= IN_TRADE_NOISE_PCT ? rawMfePct : 0
  const maxFavorableMove = direction === 'LONG' ? maxPrice - entryPrice : entryPrice - minPrice
  const realizedMove = Number.isFinite(exitPrice)
    ? (direction === 'LONG' ? exitPrice - entryPrice : entryPrice - exitPrice)
    : Number.NaN
  const captureRatio = maxFavorableMove > 0 && Number.isFinite(realizedMove)
    ? (realizedMove / maxFavorableMove) * 100
    : Number.NaN
  const pathCleanliness = summarizePathCleanliness(states)
  const firstMeaningfulSegment = pathSegments.find(segment => segment.state === 'loss' || segment.state === 'profit')
  const entryHeatEndTime = firstMeaningfulSegment?.state === 'loss' ? firstMeaningfulSegment.start : null
  const entryHeatSeconds = entryHeatEndTime !== null && tradeTimeRange.value
    ? Math.max(0, (entryHeatEndTime - tradeTimeRange.value.start) / 1000)
    : Number.NaN
  const adverseBeforeProfit = meaningfulProfitStartTime !== null
    ? Boolean(meaningfulLossStartTime !== null && meaningfulLossStartTime < meaningfulProfitStartTime)
    : null

  return {
    source: 'generated',
    timeframe: timeframe?.id || '',
    noisePct: IN_TRADE_NOISE_PCT,
    sessionDaySeconds: getInTradeSessionDaySeconds(),
    direction,
    entry: entryPrice,
    exit: Number.isFinite(exitPrice) ? exitPrice : null,
    maxPrice,
    minPrice,
    meaningfulLossSeconds,
    meaningfulProfitSeconds,
    meaningfulLossStartTime,
    meaningfulLossEndTime,
    meaningfulProfitStartTime,
    meaningfulProfitEndTime,
    firstImpulseDirection: firstImpulse,
    entryHeatSeconds: Number.isFinite(entryHeatSeconds) ? entryHeatSeconds : null,
    entryHeatEndTime,
    adverseBeforeProfit,
    pathCleanlinessScore: Number.isFinite(pathCleanliness.score) ? pathCleanliness.score : null,
    pathFlipCount: Number.isFinite(pathCleanliness.flips) ? pathCleanliness.flips : null,
    pathNoiseSharePct: Number.isFinite(pathCleanliness.noiseSharePct) ? pathCleanliness.noiseSharePct : null,
    pathSegments,
    maxMeaningfulDrawdownPct: maePct,
    maxFavorableExcursionPct: mfePct,
    profitCaptureRatio: Number.isFinite(captureRatio) ? captureRatio : null,
    pricePathShape: classifyGeneratedPathShape({ states, firstImpulse, maePct, mfePct, captureRatio })
  }
}

const normalizeStoredCandle = (candle) => {
  const normalized = {
    time: Number(candle?.time),
    open: Number(candle?.open),
    high: Number(candle?.high),
    low: Number(candle?.low),
    close: Number(candle?.close)
  }
  return isUsableOhlcCandle(normalized) ? normalized : null
}

const normalizeCandlesByTimeframe = (candlesByTimeframe) => {
  if (!candlesByTimeframe || typeof candlesByTimeframe !== 'object') return {}

  return Object.fromEntries(
    Object.entries(candlesByTimeframe)
      .filter(([timeframe]) => props.readOnly || availableTimeframeIds.value.has(timeframe))
      .map(([timeframe, candles]) => [
        timeframe,
        Array.isArray(candles)
          ? candles.map(normalizeStoredCandle).filter(Boolean).slice(-MAX_API_CANDLES)
          : []
      ])
      .filter(([, candles]) => candles.length)
  )
}

const persistGeneratedChartSnapshot = async (candlesByTimeframe) => {
  const normalizedCandles = normalizeCandlesByTimeframe(candlesByTimeframe)
  if (!Object.keys(normalizedCandles).length) return

  generatedChartClearedManually.value = false
  tradeStudyMetrics.value.generatedInTradeAnalysis = buildGeneratedInTradeAnalysis(normalizedCandles)
  tradeStudyMetrics.value.generatedMarketData = {
    version: 1,
    candlesByTimeframe: normalizedCandles,
    activeTimeframe: activeGeneratedTimeframe.value,
    symbol: resolvedMarketSymbol.value || '',
    provider: resolvedMarketProvider.value || '',
    sourceAsset: generatedSourceAsset.value || selectedTradeAsset.value || '',
    generatedAt: new Date().toISOString()
  }

  if (typeof persistGeneratedTradeStudyMetrics === 'function') {
    await persistGeneratedTradeStudyMetrics(tradeStudyMetrics.value)
  }
}

const getStoredGeneratedMarketData = () => {
  const candidates = [
    props.storedMarketData,
    tradeStudyMetrics.value?.generatedMarketData,
    initialTrade?.tradeStudyMetrics?.generatedMarketData,
    initialTrade?.studyMetrics?.generatedMarketData,
    initialTrade?.generatedMarketData
  ]

  return candidates.find(candidate => candidate && typeof candidate === 'object') || null
}

const getStoredGeneratedInTradeAnalysis = () => {
  const candidates = [
    tradeStudyMetrics.value?.generatedInTradeAnalysis,
    initialTrade?.tradeStudyMetrics?.generatedInTradeAnalysis,
    initialTrade?.studyMetrics?.generatedInTradeAnalysis,
    initialTrade?.generatedInTradeAnalysis
  ]

  return candidates.find(candidate => candidate && typeof candidate === 'object') || null
}

const hydrateGeneratedChartFromMetrics = () => {
  if (generatedChartClearedManually.value) return false

  const stored = getStoredGeneratedMarketData()
  const normalizedCandles = normalizeCandlesByTimeframe(stored?.candlesByTimeframe)
  if (!Object.keys(normalizedCandles).length) return false

  generatedMarketData.value = normalizedCandles
  resolvedMarketSymbol.value = stored?.symbol || ''
  resolvedMarketProvider.value = stored?.provider || ''
  generatedSourceAsset.value = stored?.sourceAsset || selectedTradeAsset.value || ''
  generationState.value = 'success'
  generationError.value = ''
  hoveredCandle.value = null
  chartCrosshair.value = null

  if (stored?.activeTimeframe && normalizedCandles[stored.activeTimeframe]?.length) {
    activeGeneratedTimeframe.value = stored.activeTimeframe
  } else {
    selectFirstGeneratedTimeframe(normalizedCandles)
  }

  tradeStudyMetrics.value.generatedMarketData = {
    ...stored,
    candlesByTimeframe: normalizedCandles,
    activeTimeframe: activeGeneratedTimeframe.value
  }
  tradeStudyMetrics.value.generatedInTradeAnalysis = getStoredGeneratedInTradeAnalysis() || buildGeneratedInTradeAnalysis(normalizedCandles)
  return true
}

const adjustCandlesToStudyMetrics = (candles) => {
  return candles.filter(isUsableOhlcCandle)
}

const stopApiCooldownTimer = () => {
  if (!apiCooldownInterval) return
  clearInterval(apiCooldownInterval)
  apiCooldownInterval = null
}

const startApiErrorCooldown = () => {
  apiCooldownUntil.value = Date.now() + API_ERROR_COOLDOWN_MS
  apiCooldownNow.value = Date.now()
  stopApiCooldownTimer()
  apiCooldownInterval = setInterval(() => {
    apiCooldownNow.value = Date.now()
    if (!isApiCooldownActive.value) {
      apiCooldownUntil.value = 0
      stopApiCooldownTimer()
    }
  }, 1000)
}

const generateMarketData = async () => {
  if (!canGenerateMarketData.value) return

  generatedChartClearedManually.value = false
  generationState.value = 'loading'
  generationError.value = ''
  hoveredCandle.value = null
  chartCrosshair.value = null
  syncActiveGeneratedTimeframe()

  try {
    const result = await loadPublicMarketData()
    generatedMarketData.value = result.candlesByTimeframe
    selectFirstGeneratedTimeframe(result.candlesByTimeframe)
    resolvedMarketSymbol.value = result.symbol
    resolvedMarketProvider.value = result.provider
    generatedSourceAsset.value = selectedTradeAsset.value
    await persistGeneratedChartSnapshot(result.candlesByTimeframe)
    generationState.value = 'success'
    resetChartViewport()
  } catch (error) {
    console.error('[TradeStudyMetrics] Market data generation failed:', error)
    generationError.value = error?.message || ui().apiError
    generationState.value = 'error'
    startApiErrorCooldown()
  } finally {
    await nextTick()
    drawChart()
  }
}

const reconcileGeneratedMarketDataWithDuration = () => {
  if (props.readOnly) return
  const normalizedCandles = normalizeCandlesByTimeframe(generatedMarketData.value)
  const currentKeys = Object.keys(generatedMarketData.value || {})
  const normalizedKeys = Object.keys(normalizedCandles)

  if (currentKeys.length !== normalizedKeys.length || currentKeys.some(key => !normalizedKeys.includes(key))) {
    generatedMarketData.value = normalizedCandles
    hoveredCandle.value = null
    chartCrosshair.value = null
  }

  if (tradeStudyMetrics.value?.generatedMarketData?.candlesByTimeframe) {
    tradeStudyMetrics.value.generatedMarketData = {
      ...tradeStudyMetrics.value.generatedMarketData,
      candlesByTimeframe: normalizeCandlesByTimeframe(tradeStudyMetrics.value.generatedMarketData.candlesByTimeframe),
      activeTimeframe: activeGeneratedTimeframe.value
    }
  }
}

const clearGeneratedChart = () => {
  generatedChartClearedManually.value = true
  generatedMarketData.value = {}
  tradeStudyMetrics.value.generatedInTradeAnalysis = null
  tradeStudyMetrics.value.generatedMarketData = null
  resolvedMarketSymbol.value = ''
  resolvedMarketProvider.value = ''
  generatedSourceAsset.value = ''
  generationState.value = 'idle'
  generationError.value = ''
  hoveredCandle.value = null
  chartCrosshair.value = null
  chartViewport.value = { start: 0, end: 0 }
  priceViewport.value = null
  nextTick(() => drawChart())
}

const formatPrice = (value, isEntryOrExit = false) => {
  if (!Number.isFinite(value)) return 'N/A'
  if (isEntryOrExit && usesThreeDecimalTradePrice.value) return value.toFixed(3)
  if (value >= 1000) return value.toFixed(2)
  if (value >= 1) return value.toFixed(4)
  return value.toFixed(6)
}

const formatCandleTime = (time) => {
  if (!Number.isFinite(time)) return '--'
  return new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(time))
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const resetChartViewport = () => {
  const candles = generatedChartCandles.value
  chartViewport.value = { start: 0, end: candles.length }
  priceViewport.value = null
}

const getChartViewportSpan = () => {
  const candles = generatedChartCandles.value
  return Math.max(1, (chartViewport.value.end || candles.length) - chartViewport.value.start)
}

const clampChartViewport = (start, visibleCount) => {
  const candles = generatedChartCandles.value
  if (!candles.length) return { start: 0, end: 0 }
  const minVisible = Math.min(8, Math.max(1, candles.length))
  const maxVisible = Math.max(minVisible, candles.length * 2.6)
  const safeVisibleCount = clamp(visibleCount, minVisible, maxVisible)
  const emptyMargin = Math.max(4, safeVisibleCount * 0.85)
  const minStart = -emptyMargin
  const maxStart = candles.length - safeVisibleCount + emptyMargin
  const safeStart = clamp(start, minStart, Math.max(minStart, maxStart))
  return { start: safeStart, end: safeStart + safeVisibleCount }
}

const getChartGeometry = (canvas) => {
  const rect = canvas.getBoundingClientRect()
  return {
    rect,
    left: 14,
    right: Math.max(120, rect.width - 84),
    top: 24,
    bottom: Math.max(120, rect.height - 32)
  }
}

const getVisibleCandles = () => {
  const candles = generatedChartCandles.value
  if (!candles.length) return []
  const start = Math.floor(chartViewport.value.start)
  const end = Math.ceil(chartViewport.value.end || candles.length)
  const firstIndex = clamp(start, 0, candles.length)
  const lastIndex = clamp(end, firstIndex, candles.length)
  return candles.slice(firstIndex, lastIndex).map((candle, index) => ({ ...candle, absoluteIndex: firstIndex + index }))
}

const getAutoPriceRange = (visibleCandles) => {
  const candles = visibleCandles.length ? visibleCandles : generatedChartCandles.value
  const levelValues = chartLevelOverlays.value.map(level => level.value)
  if (!candles.length && !levelValues.length) return { min: 0, max: 1 }
  const minLow = Math.min(...candles.map(candle => candle.low), ...levelValues)
  const maxHigh = Math.max(...candles.map(candle => candle.high), ...levelValues)
  const padding = Math.max((maxHigh - minLow) * 0.08, Math.abs(maxHigh) * 0.0001, 0.000001)
  return { min: minLow - padding, max: maxHigh + padding }
}

const clampPriceViewport = (min, max, referenceRange = null) => {
  const autoRange = referenceRange || getAutoPriceRange(getVisibleCandles())
  const autoSpan = Math.max(autoRange.max - autoRange.min, Math.abs(autoRange.max) * 0.0001, 0.000001)
  const minSpan = autoSpan * 0.08
  const maxSpan = autoSpan * 16
  const center = (min + max) / 2
  const span = clamp(max - min, minSpan, maxSpan)
  const boundaryPadding = autoSpan * 16
  const nextMin = clamp(center - (span / 2), autoRange.min - boundaryPadding, autoRange.max + boundaryPadding - span)
  return { min: nextMin, max: nextMin + span }
}

const getActivePriceRange = (visibleCandles) => {
  if (priceViewport.value) return priceViewport.value
  return getAutoPriceRange(visibleCandles)
}

const drawTradeLevelLines = (ctx, geometry, yForPrice) => {
  const levels = chartLevelOverlays.value
  if (!levels.length) return

  ctx.save()
  ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'

  levels.forEach((level) => {
    const y = yForPrice(level.value)
    if (y < geometry.top - 2 || y > geometry.bottom + 2) return

    ctx.setLineDash([6, 6])
    ctx.lineWidth = 1
    ctx.strokeStyle = level.color
    ctx.beginPath()
    ctx.moveTo(geometry.left, y)
    ctx.lineTo(geometry.right, y)
    ctx.stroke()

    ctx.setLineDash([])
    ctx.fillStyle = level.color
    ctx.fillText(`${level.label} ${formatPrice(level.value, level.id === 'entry' || level.id === 'exit')}`, geometry.right - 8, y - 4)
  })

  ctx.restore()
}

const drawChart = () => {
  const canvas = chartCanvas.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const rect = canvas.getBoundingClientRect()
  if (!ctx || rect.width <= 0 || rect.height <= 0) return

  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(rect.width * dpr)
  canvas.height = Math.round(rect.height * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, rect.width, rect.height)

  const visible = getVisibleCandles()
  const geometry = getChartGeometry(canvas)
  const plotWidth = geometry.right - geometry.left
  const plotHeight = geometry.bottom - geometry.top
  const dark = Boolean(isDark?.value)
  const gridColor = dark ? 'rgba(255,255,255,0.075)' : 'rgba(0,0,0,0.075)'
  const textColor = dark ? 'rgba(255,255,255,0.58)' : 'rgba(0,0,0,0.54)'
  const upColor = dark ? '#ffffff' : '#000000'
  const downColor = '#fb7185'

  ctx.strokeStyle = gridColor
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i += 1) {
    const y = geometry.top + (plotHeight * i / 4)
    ctx.beginPath()
    ctx.moveTo(geometry.left, y)
    ctx.lineTo(geometry.right, y)
    ctx.stroke()
  }

  if (!visible.length) return

  const activePriceRange = getActivePriceRange(visible)
  const minPrice = activePriceRange.min
  const maxPrice = activePriceRange.max
  const priceRange = maxPrice - minPrice || 1
  const yForPrice = price => geometry.top + ((maxPrice - price) / priceRange) * plotHeight
  const viewStart = chartViewport.value.start
  const visibleSpan = getChartViewportSpan()
  const barWidth = plotWidth / visibleSpan
  const bodyWidth = clamp(barWidth * 0.9, 4, Math.max(4, barWidth - 1))

  drawTradeLevelLines(ctx, geometry, yForPrice)

  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
  ctx.fillStyle = textColor
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  for (let i = 0; i <= 4; i += 1) {
    const price = maxPrice - (priceRange * i / 4)
    const y = geometry.top + (plotHeight * i / 4)
    ctx.fillText(formatPrice(price), geometry.right + 10, y)
  }

  visible.forEach((candle) => {
    const x = geometry.left + ((candle.absoluteIndex - viewStart + 0.5) * barWidth)
    const openY = yForPrice(candle.open)
    const closeY = yForPrice(candle.close)
    const highY = yForPrice(candle.high)
    const lowY = yForPrice(candle.low)
    const positive = candle.close >= candle.open
    ctx.strokeStyle = positive ? upColor : downColor
    ctx.fillStyle = positive ? upColor : downColor
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, highY)
    ctx.lineTo(x, lowY)
    ctx.stroke()
    const bodyTop = Math.min(openY, closeY)
    const bodyHeight = Math.max(Math.abs(closeY - openY), 1.2)
    ctx.fillRect(x - (bodyWidth / 2), bodyTop, bodyWidth, bodyHeight)
    if (positive && !dark) {
      ctx.strokeStyle = 'rgba(0,0,0,0.42)'
      ctx.strokeRect(x - (bodyWidth / 2), bodyTop, bodyWidth, bodyHeight)
    }
  })

  const allCandles = generatedChartCandles.value
  const minTimeLabelSpacing = 96
  const maxTimeLabels = Math.max(1, Math.floor(plotWidth / minTimeLabelSpacing))
  const labelStep = Math.max(1, Math.ceil(visibleSpan / maxTimeLabels))
  const firstTimeLabelIndex = Math.max(0, Math.ceil(viewStart / labelStep) * labelStep)
  const lastTimeLabelIndex = Math.min(allCandles.length - 1, Math.floor(chartViewport.value.end || allCandles.length))
  let lastTimeLabelX = Number.NEGATIVE_INFINITY
  ctx.fillStyle = textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let candleIndex = firstTimeLabelIndex; candleIndex <= lastTimeLabelIndex; candleIndex += labelStep) {
    const candle = allCandles[candleIndex]
    if (!candle) continue
    const x = geometry.left + ((candleIndex - viewStart + 0.5) * barWidth)
    if (x < geometry.left + 24 || x > geometry.right - 24) continue
    if (x - lastTimeLabelX < minTimeLabelSpacing) continue
    ctx.fillText(formatCandleTime(candle.time), x, geometry.bottom + 12)
    lastTimeLabelX = x
  }

  if (chartCrosshair.value) {
    ctx.save()
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.34)'
    ctx.beginPath()
    ctx.moveTo(chartCrosshair.value.x, geometry.top)
    ctx.lineTo(chartCrosshair.value.x, geometry.bottom)
    ctx.moveTo(geometry.left, chartCrosshair.value.y)
    ctx.lineTo(geometry.right, chartCrosshair.value.y)
    ctx.stroke()
    ctx.restore()
  }
}

const syncHoveredCandle = (event) => {
  const canvas = chartCanvas.value
  const visible = getVisibleCandles()
  if (!canvas) {
    hoveredCandle.value = null
    chartCrosshair.value = null
    return
  }

  const geometry = getChartGeometry(canvas)
  const x = event.clientX - geometry.rect.left
  const y = event.clientY - geometry.rect.top
  const plotWidth = geometry.right - geometry.left
  const insidePlot = x >= geometry.left && x <= geometry.right && y >= geometry.top && y <= geometry.bottom

  if (!insidePlot) {
    hoveredCandle.value = null
    chartCrosshair.value = null
    drawChart()
    return
  }

  chartCrosshair.value = { x, y }
  const absoluteIndex = Math.floor(chartViewport.value.start + (((x - geometry.left) / plotWidth) * getChartViewportSpan()))
  const candidate = visible.find(candle => candle.absoluteIndex === absoluteIndex)
  hoveredCandle.value = candidate || null
  drawChart()
}

const getChartInteractionZone = (event) => {
  const canvas = chartCanvas.value
  if (!canvas) return 'plot'
  const geometry = getChartGeometry(canvas)
  const x = event.clientX - geometry.rect.left
  const y = event.clientY - geometry.rect.top
  if (x > geometry.right && y >= geometry.top && y <= geometry.bottom) return 'price'
  if (y > geometry.bottom && x >= geometry.left && x <= geometry.right) return 'time'
  return 'plot'
}

const applyTimeScaleDrag = (event, geometry, visibleCount) => {
  const dx = event.clientX - lastChartPointerX.value
  const zoomFactor = Math.exp(-dx * 0.008)
  const pointerRatio = clamp((event.clientX - geometry.rect.left - geometry.left) / Math.max(1, geometry.right - geometry.left), 0, 1)
  const currentStart = chartViewport.value.start
  const currentVisible = visibleCount
  const nextVisible = currentVisible * zoomFactor
  const anchor = currentStart + (currentVisible * pointerRatio)
  chartViewport.value = clampChartViewport(anchor - (nextVisible * pointerRatio), nextVisible)
}

const applyPriceScaleDrag = (event) => {
  const canvas = chartCanvas.value
  if (!canvas) return
  const activeRange = getActivePriceRange(getVisibleCandles())
  const span = activeRange.max - activeRange.min
  const dy = event.clientY - lastChartPointerY.value
  const zoomFactor = Math.exp(dy * 0.01)
  const center = (activeRange.min + activeRange.max) / 2
  const nextSpan = span * zoomFactor
  priceViewport.value = clampPriceViewport(center - (nextSpan / 2), center + (nextSpan / 2))
}

const applyPricePanDrag = (event, geometry) => {
  const activeRange = getActivePriceRange(getVisibleCandles())
  const span = activeRange.max - activeRange.min
  const plotHeight = Math.max(1, geometry.bottom - geometry.top)
  const dy = event.clientY - lastChartPointerY.value
  const priceShift = (dy / plotHeight) * span
  if (!Number.isFinite(priceShift) || priceShift === 0) return
  priceViewport.value = clampPriceViewport(activeRange.min + priceShift, activeRange.max + priceShift)
}

const handleChartPointerDown = (event) => {
  if (!generatedChartCandles.value.length) return
  isChartDragging.value = true
  chartDragMode.value = getChartInteractionZone(event)
  lastChartPointerX.value = event.clientX
  lastChartPointerY.value = event.clientY
  event.currentTarget?.setPointerCapture?.(event.pointerId)
}

const handleChartPointerMove = (event) => {
  const canvas = chartCanvas.value
  const candles = generatedChartCandles.value
  if (isChartDragging.value && canvas && candles.length) {
    const geometry = getChartGeometry(canvas)
    const visibleCount = chartViewport.value.end - chartViewport.value.start
    if (chartDragMode.value === 'price') {
      applyPriceScaleDrag(event)
    } else if (chartDragMode.value === 'time') {
      applyTimeScaleDrag(event, geometry, visibleCount)
    } else {
      const candleShift = ((lastChartPointerX.value - event.clientX) / Math.max(1, geometry.right - geometry.left)) * visibleCount
      chartViewport.value = clampChartViewport(chartViewport.value.start + candleShift, visibleCount)
      applyPricePanDrag(event, geometry)
    }
    lastChartPointerX.value = event.clientX
    lastChartPointerY.value = event.clientY
  }
  syncHoveredCandle(event)
}

const handleChartPointerUp = (event) => {
  isChartDragging.value = false
  chartDragMode.value = 'plot'
  event.currentTarget?.releasePointerCapture?.(event.pointerId)
}

const handleChartPointerLeave = () => {
  isChartDragging.value = false
  chartDragMode.value = 'plot'
  hoveredCandle.value = null
  chartCrosshair.value = null
  drawChart()
}

const handleChartWheel = (event) => {
  const canvas = chartCanvas.value
  const candles = generatedChartCandles.value
  if (!canvas || candles.length < 2) return

  const geometry = getChartGeometry(canvas)
  const pointerRatio = clamp((event.clientX - geometry.rect.left - geometry.left) / Math.max(1, geometry.right - geometry.left), 0, 1)
  const currentStart = chartViewport.value.start
  const currentEnd = chartViewport.value.end || candles.length
  const visibleCount = currentEnd - currentStart
  const zoomFactor = event.deltaY > 0 ? 1.18 : 0.82
  const nextVisible = visibleCount * zoomFactor
  const anchor = currentStart + (visibleCount * pointerRatio)
  chartViewport.value = clampChartViewport(anchor - (nextVisible * pointerRatio), nextVisible)
  drawChart()
}

const getFieldPlaceholder = (field) => {
  if (field.unit === 'price' && usesForexPriceFormat.value) {
    return ui().placeholders[`forex${field.key.charAt(0).toUpperCase()}${field.key.slice(1)}`]
  }
  return ui().placeholders[field.key]
}

const getFieldUnit = (field) => {
  if (field.unit !== 'price') return ''
  return usesForexPriceFormat.value ? ui().units.forex : ui().units.money
}

const normalizePositivePercent = (key, rawValue = tradeStudyMetrics.value[key]) => {
  if (rawValue === '' || rawValue === null || rawValue === undefined) {
    tradeStudyMetrics.value[key] = ''
    return
  }

  const numericValue = Number(rawValue)
  if (!Number.isFinite(numericValue)) {
    tradeStudyMetrics.value[key] = ''
    return
  }

  tradeStudyMetrics.value[key] = String(Math.abs(numericValue))
}

const isVectorLocked = (field) => {
  if (field.key === 'priceDroppedBelowEntryLong') return side.value !== 'long'
  if (field.key === 'priceRoseAboveEntryShort') return side.value !== 'short'
  return false
}

const clearDurationGroup = (group) => {
  group?.fields.forEach(field => {
    tradeStudyMetrics.value[field.key] = ''
  })
}

const clearMoveField = (group) => {
  if (group?.moveField?.key) tradeStudyMetrics.value[group.moveField.key] = ''
}

const toggleBoolean = (field) => {
  if (isVectorLocked(field)) return
  tradeStudyMetrics.value[field.key] = !tradeStudyMetrics.value[field.key]
  if (!tradeStudyMetrics.value[field.key]) {
    clearDurationGroup(durationFieldGroups[field.key])
    clearMoveField(durationFieldGroups[field.key])
  }
}

const shouldShowDuration = (field) => {
  return Boolean(durationFieldGroups[field.key] && tradeStudyMetrics.value[field.key] && !isVectorLocked(field))
}

const shouldShowEntryMove = (field) => shouldShowDuration(field)

const visibleFields = (fields) => {
  return fields
}

hydrateGeneratedChartFromMetrics()

watch(side, (vector) => {
  if (vector === 'long') {
    tradeStudyMetrics.value.priceRoseAboveEntryShort = false
    clearDurationGroup(durationFieldGroups.priceRoseAboveEntryShort)
    clearMoveField(durationFieldGroups.priceRoseAboveEntryShort)
  } else {
    tradeStudyMetrics.value.priceDroppedBelowEntryLong = false
    clearDurationGroup(durationFieldGroups.priceDroppedBelowEntryLong)
    clearMoveField(durationFieldGroups.priceDroppedBelowEntryLong)
  }
}, { immediate: true })

watch(availableTimeframeOptions, () => {
  syncActiveGeneratedTimeframe()
  if (props.readOnly) return
  reconcileGeneratedMarketDataWithDuration()
}, { immediate: true })

watch(
  () => tradeStudyMetrics.value?.generatedMarketData,
  async (stored) => {
    if (!stored || generatedChartCandles.value.length) return
    const hydrated = hydrateGeneratedChartFromMetrics()
    if (!hydrated) return
    resetChartViewport()
    await nextTick()
    drawChart()
  },
  { deep: true }
)

watch([generatedChartCandles, activeGeneratedTimeframe], async () => {
  resetChartViewport()
  await nextTick()
  drawChart()
})

watch(showTradeStudyMetrics, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  if (resizeObserver && chartCanvas.value) resizeObserver.observe(chartCanvas.value)
  drawChart()
})

watch(() => props.visible, async (isVisible) => {
  if (!isVisible) return
  await nextTick()
  drawChart()
})

watch([() => isDark?.value, locale, chartLevelOverlays], () => drawChart())

onMounted(() => {
  hydrateGeneratedChartFromMetrics()
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => drawChart())
    if (chartCanvas.value) resizeObserver.observe(chartCanvas.value)
  }
  window.addEventListener('resize', drawChart)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect?.()
  window.removeEventListener('resize', drawChart)
  stopApiCooldownTimer()
})
</script>

<template>
  <section
    v-if="isChartSurface"
    :class="generatedChartCandles.length ? 'relative flex h-full min-h-0 w-full flex-col overflow-visible text-white' : 'flex h-full min-h-[420px] w-full flex-col'"
  >
    <div v-if="!generatedChartCandles.length" class="flex min-h-0 flex-1 flex-col items-center justify-center px-8 text-center">
      <p class="mb-5 max-w-xl text-[8px] font-mono font-bold uppercase leading-loose tracking-[0.22em] text-black/35 dark:text-white/35">
        {{ props.readOnly ? ui().chartUnavailable : marketDataStatusMessage }}
      </p>
      <p v-if="!props.readOnly && apiCooldownHint" class="-mt-3 mb-5 max-w-xl text-[8px] font-mono font-black uppercase leading-loose tracking-[0.22em] text-amber-500/80">
        {{ apiCooldownHint }}
      </p>
      <button
        v-if="!props.readOnly"
        type="button"
        class="h-14 border border-black/25 px-8 text-[10px] font-mono font-black uppercase tracking-[0.28em] nier-text-primary transition-colors hover:bg-black hover:text-white disabled:opacity-30 dark:border-white/25 dark:hover:bg-white dark:hover:text-black"
        :disabled="!canGenerateMarketData"
        @click="generateMarketData"
      >
        {{ generateMarketDataButtonLabel }}
      </button>
    </div>

    <template v-else>
      <div class="absolute -top-12 right-0 z-20 flex h-11 items-center gap-5 px-4">
        <button
          v-for="timeframe in chartTimeframeOptions"
          :key="timeframe.id"
          type="button"
          class="text-[9px] font-mono font-black uppercase tracking-[0.18em] nier-text-primary transition-opacity hover:opacity-75 disabled:opacity-20"
          :class="activeGeneratedTimeframe === timeframe.id ? 'opacity-100' : 'opacity-35'"
          :disabled="!isTimeframeSelectable(timeframe)"
          @click="selectGeneratedTimeframe(timeframe)"
        >
          {{ timeframe.label }}
        </button>
      </div>

      <div class="relative min-h-0 flex-1">
        <div
          v-if="hoveredOhlcLabel"
          class="pointer-events-none absolute left-5 top-5 z-10 flex max-w-[calc(100%-2rem)] items-center gap-4"
        >
          <span class="block max-w-[11rem] truncate text-[9px] font-mono font-black uppercase tracking-[0.18em] text-white">
            {{ chartAssetHeading }}
          </span>
          <span class="block truncate text-[9px] font-mono font-black uppercase tracking-[0.14em] text-white/75">
            {{ hoveredOhlcLabel }}
          </span>
        </div>

        <canvas
          ref="chartCanvas"
          class="h-full w-full cursor-crosshair touch-none"
          @pointerdown="handleChartPointerDown"
          @pointermove="handleChartPointerMove"
          @pointerup="handleChartPointerUp"
          @pointercancel="handleChartPointerUp"
          @pointerleave="handleChartPointerLeave"
          @wheel.prevent="handleChartWheel"
        ></canvas>

        <div
          class="pointer-events-none absolute bottom-0 left-4 right-[84px] h-8 border-t border-white/0"
          :class="generatedChartCandles.length ? 'pointer-events-auto cursor-ew-resize' : ''"
          @pointerdown="handleChartPointerDown"
          @pointermove="handleChartPointerMove"
          @pointerup="handleChartPointerUp"
          @pointercancel="handleChartPointerUp"
          @pointerleave="handleChartPointerLeave"
        ></div>

        <div
          class="pointer-events-none absolute bottom-8 right-0 top-6 w-[84px] border-l border-white/0"
          :class="generatedChartCandles.length ? 'pointer-events-auto cursor-ns-resize' : ''"
          @pointerdown="handleChartPointerDown"
          @pointermove="handleChartPointerMove"
          @pointerup="handleChartPointerUp"
          @pointercancel="handleChartPointerUp"
          @pointerleave="handleChartPointerLeave"
        ></div>
      </div>
    </template>
  </section>

  <Teleport v-else to="body">
    <Transition name="nier-fade">
      <div
        v-if="showTradeStudyMetrics"
        class="fixed inset-0 z-[10006] flex items-center justify-center bg-black/15 p-6 backdrop-blur-sm"
        @click.self="showTradeStudyMetrics = false"
      >
        <ExPanel
          variant="light"
          :show-corners="true"
          :no-padding="true"
          :no-shadow="true"
          class="h-[84vh] max-h-[84vh] w-full max-w-6xl !border-black/20 dark:!border-white/20"
        >
          <div
            class="min-h-0 flex-1 custom-scrollbar"
            :class="activeStudyPage === 'market' && generatedChartCandles.length ? 'overflow-hidden p-0' : 'overflow-y-auto p-7'"
          >
            <section
              v-if="activeStudyPage === 'market'"
              :class="generatedChartCandles.length ? 'relative flex h-full min-h-0 flex-col overflow-hidden bg-[#090908] bg-[radial-gradient(rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:24px_24px] text-white dark:bg-black/25' : 'min-h-[520px]'"
            >
              <div v-if="!generatedChartCandles.length" class="flex min-h-[500px] flex-col items-center justify-center px-4 text-center">
                <p class="mb-5 max-w-xl text-[8px] font-mono font-bold uppercase leading-loose tracking-[0.22em] text-black/35 dark:text-white/35">
                  {{ marketDataStatusMessage }}
                </p>
                <p v-if="apiCooldownHint" class="-mt-3 mb-5 max-w-xl text-[8px] font-mono font-black uppercase leading-loose tracking-[0.22em] text-amber-500/80">
                  {{ apiCooldownHint }}
                </p>
                <button
                  type="button"
                  class="h-14 border border-black/25 px-8 text-[10px] font-mono font-black uppercase tracking-[0.28em] nier-text-primary transition-colors hover:bg-black hover:text-white disabled:opacity-30 dark:border-white/25 dark:hover:bg-white dark:hover:text-black"
                  :disabled="!canGenerateMarketData"
                  @click="generateMarketData"
                >
                  {{ generateMarketDataButtonLabel }}
                </button>
              </div>

              <template v-else>
                <div class="absolute right-5 top-5 z-20 flex items-center gap-5">
                  <button
                    v-for="timeframe in chartTimeframeOptions"
                    :key="timeframe.id"
                    type="button"
                    class="text-[9px] font-mono font-black uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-75 disabled:opacity-20"
                    :class="activeGeneratedTimeframe === timeframe.id ? 'opacity-100' : 'opacity-35'"
                    :disabled="!isTimeframeSelectable(timeframe)"
                    @click="selectGeneratedTimeframe(timeframe)"
                  >
                    {{ timeframe.label }}
                  </button>
                </div>

                <div class="relative min-h-0 flex-1">
                  <div
                    v-if="hoveredOhlcLabel"
                    class="pointer-events-none absolute left-5 top-14 z-10 flex max-w-[calc(100%-2rem)] items-center gap-4"
                  >
                    <span class="block max-w-[11rem] truncate text-[9px] font-mono font-black uppercase tracking-[0.18em] text-white">
                      {{ chartAssetHeading }}
                    </span>
                    <span class="block truncate text-[9px] font-mono font-black uppercase tracking-[0.14em] text-white/75">
                      {{ hoveredOhlcLabel }}
                    </span>
                  </div>

                  <canvas
                    ref="chartCanvas"
                    class="h-full w-full cursor-crosshair touch-none"
                    @pointerdown="handleChartPointerDown"
                    @pointermove="handleChartPointerMove"
                    @pointerup="handleChartPointerUp"
                    @pointercancel="handleChartPointerUp"
                    @pointerleave="handleChartPointerLeave"
                    @wheel.prevent="handleChartWheel"
                  ></canvas>

                  <div
                    class="pointer-events-none absolute bottom-0 left-4 right-[84px] h-8 border-t border-white/0"
                    :class="generatedChartCandles.length ? 'pointer-events-auto cursor-ew-resize' : ''"
                    @pointerdown="handleChartPointerDown"
                    @pointermove="handleChartPointerMove"
                    @pointerup="handleChartPointerUp"
                    @pointercancel="handleChartPointerUp"
                    @pointerleave="handleChartPointerLeave"
                  ></div>

                  <div
                    class="pointer-events-none absolute bottom-8 right-0 top-6 w-[84px] border-l border-white/0"
                    :class="generatedChartCandles.length ? 'pointer-events-auto cursor-ns-resize' : ''"
                    @pointerdown="handleChartPointerDown"
                    @pointermove="handleChartPointerMove"
                    @pointerup="handleChartPointerUp"
                    @pointercancel="handleChartPointerUp"
                    @pointerleave="handleChartPointerLeave"
                  ></div>

                </div>
              </template>
            </section>

            <div v-else class="grid grid-cols-1 gap-6">
              <section
                v-for="group in groups"
                :key="group.id"
                class="border border-black/10 bg-white/[0.03] p-5 dark:border-white/10 dark:bg-black/[0.08]"
              >
                <div class="mb-5 flex items-center gap-3">
                  <div class="h-1.5 w-1.5 rotate-45 nier-bg-inverted"></div>
                  <span class="text-[8px] font-black uppercase tracking-[0.42em] nier-text-primary">{{ ui().groups[group.id] }}</span>
                </div>

                <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <div
                    v-for="(fieldColumn, columnIndex) in splitFields(group.fields)"
                    :key="`${group.id}-${columnIndex}`"
                    class="flex min-w-0 flex-col gap-4 border-black/10 dark:border-white/10"
                    :class="columnIndex === 1 ? 'lg:border-l lg:pl-5' : ''"
                  >
                    <label
                      v-for="field in visibleFields(fieldColumn)"
                      :key="field.key"
                      class="relative flex min-w-0 flex-col gap-2"
                    >
                      <span class="min-h-[20px] text-[8px] font-bold uppercase leading-relaxed tracking-[0.18em] text-black/50 dark:text-white/40">{{ ui().fields[field.key] }}</span>

                      <button
                        v-if="field.type === 'boolean'"
                        type="button"
                        class="flex h-14 items-center justify-between border px-4 text-[11px] font-mono font-black uppercase tracking-[0.25em] transition-colors"
                        :class="[
                          isVectorLocked(field)
                            ? 'border-black/5 bg-black/[0.02] text-black/20 dark:border-white/5 dark:text-white/15'
                            : 'border-black/15 bg-transparent nier-text-primary hover:border-black/40 dark:border-white/15 dark:hover:border-white/40'
                        ]"
                        :disabled="isVectorLocked(field)"
                        @click="toggleBoolean(field)"
                      >
                        <span>{{ tradeStudyMetrics[field.key] ? ui().boolOn : ui().boolOff }}</span>
                        <span class="grid h-4 w-4 place-items-center border border-black/30 dark:border-white/35">
                          <span v-if="tradeStudyMetrics[field.key]" class="h-2 w-1 rotate-45 border-b-2 border-r-2 border-current"></span>
                        </span>
                      </button>

                      <div v-if="shouldShowEntryMove(field)" class="border border-black/10 p-3 dark:border-white/10">
                        <label class="flex min-w-0 flex-col gap-2">
                          <span class="text-[7px] font-black uppercase tracking-[0.22em] text-black/35 dark:text-white/30">
                            {{ ui().fields[durationFieldGroups[field.key].moveField.labelKey] }}
                          </span>
                          <div class="relative">
                            <input
                              v-model="tradeStudyMetrics[durationFieldGroups[field.key].moveField.key]"
                              type="number"
                              min="0"
                              step="any"
                              :placeholder="ui().placeholders.percentMove"
                              @input="normalizePositivePercent(durationFieldGroups[field.key].moveField.key, $event.target.value)"
                              @blur="normalizePositivePercent(durationFieldGroups[field.key].moveField.key)"
                              class="h-11 w-full min-w-0 border border-black/15 bg-transparent px-3 pr-10 text-[12px] font-mono outline-none transition-colors placeholder:text-[9px] placeholder:tracking-[0.14em] placeholder:text-black/25 focus:border-black dark:border-white/15 dark:placeholder:text-white/20 dark:focus:border-white"
                            />
                            <span class="pointer-events-none absolute bottom-0 right-3 flex h-11 items-center text-[8px] font-black uppercase tracking-[0.22em] text-black/35 dark:text-white/30">%</span>
                          </div>
                        </label>
                      </div>

                      <div v-if="shouldShowDuration(field)" class="border border-black/10 p-3 dark:border-white/10">
                        <span class="mb-3 block text-[7px] font-black uppercase tracking-[0.22em] text-black/35 dark:text-white/30">{{ ui().duration[durationFieldGroups[field.key].titleKey] }}</span>
                        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <label
                            v-for="durationField in durationFieldGroups[field.key].fields"
                            :key="durationField.key"
                            class="flex min-w-0 flex-col gap-1"
                          >
                            <span class="text-[7px] font-bold uppercase tracking-[0.16em] text-black/35 dark:text-white/30">{{ ui().duration[durationField.unitKey] }}</span>
                            <input
                              v-model="tradeStudyMetrics[durationField.key]"
                              type="number"
                              min="0"
                              step="1"
                              :placeholder="ui().placeholders[durationField.placeholderKey]"
                              class="h-10 min-w-0 border border-black/15 bg-transparent px-3 text-[12px] font-mono outline-none transition-colors placeholder:text-[9px] placeholder:tracking-[0.14em] placeholder:text-black/25 focus:border-black dark:border-white/15 dark:placeholder:text-white/20 dark:focus:border-white"
                            />
                          </label>
                        </div>
                      </div>

                      <input
                        v-else-if="field.type === 'number'"
                        v-model="tradeStudyMetrics[field.key]"
                        type="number"
                        step="any"
                        :placeholder="getFieldPlaceholder(field)"
                        class="h-14 min-w-0 border border-black/15 bg-transparent px-4 text-[13px] font-mono outline-none transition-colors placeholder:text-[10px] placeholder:tracking-[0.16em] placeholder:text-black/25 focus:border-black dark:border-white/15 dark:placeholder:text-white/20 dark:focus:border-white"
                        :class="field.unit === 'price' ? 'pr-24' : ''"
                      />
                      <span
                        v-if="getFieldUnit(field)"
                        class="pointer-events-none absolute bottom-0 right-3 flex h-14 items-center text-[8px] font-black uppercase tracking-[0.22em] text-black/35 dark:text-white/30"
                      >
                        {{ getFieldUnit(field) }}
                      </span>
                    </label>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div v-if="studyPages.length > 1" class="relative flex items-center justify-center border-t border-black/10 bg-white/10 px-6 py-4 dark:border-white/10 dark:bg-black/20">
            <button
              v-if="generatedChartCandles.length"
              type="button"
              class="absolute left-6 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center text-black/35 transition-colors hover:text-black dark:text-white/35 dark:hover:text-white"
              :aria-label="ui().reset"
              @click="clearGeneratedChart"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7h11a5 5 0 1 1-4.15 7.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter" />
                <path d="M4 7l4-4M4 7l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter" />
              </svg>
            </button>
            <div class="flex items-center gap-2">
              <button
                v-for="page in studyPages"
                :key="page.id"
                type="button"
                class="flex h-10 min-w-10 items-center justify-center border px-4 text-[9px] font-mono font-black uppercase tracking-[0.22em] transition-colors"
                :class="activeStudyPage === page.id
                  ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                  : 'border-black/15 nier-text-primary hover:border-black/40 dark:border-white/15 dark:hover:border-white/40'"
                @click="activeStudyPage = page.id"
              >
                {{ page.number }}
                <span class="ml-3 hidden sm:inline">{{ page.id === 'market' ? ui().pageMarket : ui().pageManual }}</span>
              </button>
            </div>
          </div>
        </ExPanel>
      </div>
    </Transition>
  </Teleport>
</template>
