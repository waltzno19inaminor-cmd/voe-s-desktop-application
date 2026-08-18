<script setup>
import { computed, provide, ref } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import ExTradeEntryStudyMetricsPanel from '../trade-entry/ExTradeEntryStudyMetricsPanel.vue'

const props = defineProps({
  trade: {
    type: Object,
    default: null
  },
  isDark: {
    type: Boolean,
    default: true
  },
  visible: {
    type: Boolean,
    default: true
  }
})

const { locale } = useI18n()
const isStandalone = Boolean(props.trade)

const tradeValue = props.trade || {}
const storedMetrics = tradeValue.tradeStudyMetrics || tradeValue.studyMetrics || {}
const rawGeneratedMarketData = storedMetrics.generatedMarketData || tradeValue.generatedMarketData || null
const storedGeneratedInTradeAnalysis = storedMetrics.generatedInTradeAnalysis || tradeValue.generatedInTradeAnalysis || null
const openDateValue = tradeValue.date || tradeValue.entryTime || tradeValue.openDate || ''
const exitDateValue = tradeValue.dateExit || tradeValue.exitTime || tradeValue.closeDate || ''

const chartTimeframeIds = new Set(['1d', '4h', '1h', '15m', '1m'])
const getStoredCandlesByTimeframe = (value) => {
  if (!value || typeof value !== 'object') return null
  if (value.candlesByTimeframe && typeof value.candlesByTimeframe === 'object') {
    return value.candlesByTimeframe
  }

  const directCandles = Object.fromEntries(
    Object.entries(value).filter(([key, candles]) => chartTimeframeIds.has(key) && Array.isArray(candles))
  )
  return Object.keys(directCandles).length ? directCandles : null
}

const storedCandlesByTimeframe = getStoredCandlesByTimeframe(rawGeneratedMarketData)
const storedGeneratedMarketData = storedCandlesByTimeframe
  ? {
      ...(rawGeneratedMarketData && typeof rawGeneratedMarketData === 'object' ? rawGeneratedMarketData : {}),
      candlesByTimeframe: storedCandlesByTimeframe
    }
  : rawGeneratedMarketData

const standaloneTradeStudyMetrics = ref({
  ...storedMetrics,
  generatedMarketData: storedGeneratedMarketData,
  generatedInTradeAnalysis: storedGeneratedInTradeAnalysis
})

const assetLabel = computed(() => String(
  tradeValue.asset || tradeValue.symbol || tradeValue.ticker || ''
).trim())

const currentAssetData = computed(() => ({
  symbol: assetLabel.value,
  ticker: assetLabel.value,
  name: tradeValue.assetName || tradeValue.name || assetLabel.value,
  type: tradeValue.assetType || tradeValue.instrumentType || ''
}))

const standaloneTradeState = {
  side: computed(() => String(tradeValue.side || tradeValue.direction || 'long').toLowerCase()),
  asset: assetLabel,
  isDark: computed(() => props.isDark),
  currentAssetData,
  isForex: computed(() => String(currentAssetData.value.type || '').toLowerCase() === 'forex'),
  showTradeStudyMetrics: ref(false),
  tradeStudyMetrics: standaloneTradeStudyMetrics,
  entry: computed(() => tradeValue.entry ?? ''),
  exit: computed(() => tradeValue.exit ?? ''),
  stopLoss: computed(() => tradeValue.stopLoss ?? ''),
  takeProfit: computed(() => tradeValue.takeProfit ?? ''),
  openDate: computed(() => openDateValue ? new Date(openDateValue) : null),
  exitDate: computed(() => exitDateValue ? new Date(exitDateValue) : null),
  isClosed: computed(() => {
    if (tradeValue.isClosed !== undefined) return Boolean(tradeValue.isClosed)
    return !['open', 'active'].includes(String(tradeValue.status || '').toLowerCase())
  }),
  entryMethodEnabled: ref(false),
  exitMethodEnabled: ref(false),
  averageEntry: computed(() => tradeValue.averageEntry ?? tradeValue.entry ?? ''),
  averageExit: computed(() => tradeValue.averageExit ?? tradeValue.exit ?? ''),
  commitState: ref('idle'),
  initialTrade: tradeValue
}

if (isStandalone) {
  provide('tradeState', standaloneTradeState)
}

const hasGeneratedChart = computed(() => {
  const candlesByTimeframe = getStoredCandlesByTimeframe(storedGeneratedMarketData)
  return Boolean(
    candlesByTimeframe &&
    Object.values(candlesByTimeframe).some(candles => Array.isArray(candles) && candles.length > 0)
  )
})
</script>

<template>
  <ExTradeEntryStudyMetricsPanel
    v-if="!isStandalone || hasGeneratedChart"
    surface="chart"
    :visible="props.visible"
    :read-only="isStandalone"
    :stored-market-data="storedGeneratedMarketData"
  />

  <div
    v-else
    class="flex h-full min-h-[420px] w-full items-center justify-center px-8 text-center"
  >
    <p class="max-w-xl text-[9px] font-mono font-bold uppercase leading-loose tracking-[0.22em] text-white/40">
      {{ locale === 'ru' ? 'Графика нет. Сгенерировать его можно в редакторе сделок.' : 'No chart is available. You can generate it in the trade editor.' }}
    </p>
  </div>
</template>
