<script setup lang="ts">
import { computed, ref } from 'vue'
import ExMetricCard from '~/entities/metric/ui/ExMetricCard.vue'
import { useTradeAnalysisMetrics } from './metrics'
import { useI18n } from '~/shared/i18n/useI18n'
import { getPositiveTradeLevels, getRequiredConditionStats } from './metrics/metricUtils'
import {
  getTradeBalanceBefore,
  getTradeDurationHours,
  getTradePnl,
  getTradeRiskReward
} from '~/widgets/genesis/model/metrics'
import { getTradePlannedStopRiskDollars } from '~/widgets/genesis/model/tradeRisk'
import { isClosedTradeForMetrics } from '~/widgets/genesis/model/tradePnl'
import { buildTradeGeneratedInTradeAnalysis } from '~/widgets/genesis/model/generatedInTradeAnalysis'

interface TradeMetricsPanelProps {
  trade?: any
  strategyStatsContext?: any
  allTrades?: any[]
  initialBalance?: number
  isDark?: boolean
}

const props = withDefaults(defineProps<TradeMetricsPanelProps>(), {
  allTrades: () => [],
  initialBalance: 1000,
  isDark: true
})

const { locale } = useI18n()
const activeMetricTab = ref('all')

const parsePositiveNumber = (value: unknown): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const parseMetricNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const durationPartsToSeconds = (prefix: string, metrics: Record<string, any>): number | null => {
  const days = parseMetricNumber(metrics?.[`${prefix}DurationDays`]) ?? 0
  const hours = parseMetricNumber(metrics?.[`${prefix}DurationHours`]) ?? 0
  const minutes = parseMetricNumber(metrics?.[`${prefix}DurationMinutes`]) ?? 0
  const seconds = parseMetricNumber(metrics?.[`${prefix}DurationSeconds`]) ?? 0
  const total = (days * 86400) + (hours * 3600) + (minutes * 60) + seconds
  return total > 0 ? total : null
}

const tradeStudyMetrics = computed<Record<string, any>>(() => {
  const trade = props.trade || {}
  return trade.tradeStudyMetrics || trade.studyMetrics || {}
})

const inTradeStudyContext = computed(() => {
  const trade = props.trade || {}
  const metrics = tradeStudyMetrics.value || {}
  const generatedMarketData = metrics.generatedMarketData || trade.generatedMarketData || null
  const generated: Record<string, any> = buildTradeGeneratedInTradeAnalysis(trade) || {}
  const direction = String(trade.side || trade.direction || generated.direction || '').toLowerCase()
  const isShort = direction === 'short'
  const adverseToggleKey = isShort ? 'priceRoseAboveEntryShort' : 'priceDroppedBelowEntryLong'
  const adversePercentKey = isShort ? 'priceAboveEntryShortMovePercent' : 'priceBelowEntryLongMovePercent'
  const adverseDurationPrefix = isShort ? 'priceAboveEntryShort' : 'priceBelowEntryLong'
  const hasManualAdverseMove = Boolean(metrics[adverseToggleKey])
  const manualAdversePct = parseMetricNumber(metrics[adversePercentKey])
  const manualAdverseSeconds = durationPartsToSeconds(adverseDurationPrefix, metrics)

  const manualContext: Record<string, any> = {}
  if (hasManualAdverseMove) {
    manualContext.adverseBeforeProfit = true
    manualContext.firstImpulse = 'LOSS'
    manualContext.pricePathShape = 'ADVERSE_FIRST'
    if (manualAdversePct !== null) manualContext.maxMeaningfulDrawdownPct = -Math.abs(manualAdversePct)
    if (manualAdverseSeconds !== null) manualContext.meaningfulLossSeconds = manualAdverseSeconds
  }
  if (typeof metrics.hadNews === 'boolean') manualContext.hadNews = metrics.hadNews

  return {
    tradeStudyMetrics: metrics,
    generatedInTradeAnalysis: generated,
    generatedMarketData,
    ...generated,
    firstImpulse: generated.firstImpulseDirection,
    captureRatio: generated.profitCaptureRatio,
    ...manualContext
  }
})

const closedTrades = computed(() => {
  const list = Array.isArray(props.allTrades) ? [...props.allTrades] : []
  if (props.trade && isClosedTradeForMetrics(props.trade) && !list.some((trade) => trade?.id === props.trade?.id)) {
    list.push(props.trade)
  }
  return list.filter(isClosedTradeForMetrics)
})

const balanceBeforeTrade = computed(() => {
  if (!props.trade) return props.initialBalance
  return getTradeBalanceBefore(closedTrades.value, props.trade, props.initialBalance)
})

const riskBudgetDollars = computed(() => {
  const trade = props.trade || {}
  const rawRisk = parsePositiveNumber(trade.riskPerTrade ?? trade.riskPerTradeValue ?? trade.riskPercent)
  if (rawRisk === null) return null

  const isPercent = trade.riskPerTradeUnit === '%' || trade.riskPercent !== undefined
  return isPercent ? (rawRisk / 100) * balanceBeforeTrade.value : rawRisk
})

const derivedStatsContext = computed(() => {
  const pnls = closedTrades.value.map((trade) => getTradePnl(trade, props.initialBalance))
  const wins = pnls.filter((pnl) => pnl > 0)
  const losses = pnls.filter((pnl) => pnl < 0)
  const grossProfit = wins.reduce((sum, pnl) => sum + pnl, 0)
  const grossLoss = Math.abs(losses.reduce((sum, pnl) => sum + pnl, 0))
  const avgPnl = pnls.length > 0 ? pnls.reduce((sum, pnl) => sum + pnl, 0) / pnls.length : 0
  const durationHours = getTradeDurationHours(props.trade)
  const historicalDurations = closedTrades.value
    .map((trade) => getTradeDurationHours(trade))
    .filter((value) => Number.isFinite(value) && value > 0)
  const avgDurationHours = historicalDurations.length > 0
    ? historicalDurations.reduce((sum, value) => sum + value, 0) / historicalDurations.length
    : (Number.isFinite(durationHours) && durationHours > 0 ? durationHours : undefined)
  const historicalVelocities = closedTrades.value
    .map((trade) => {
      const hours = getTradeDurationHours(trade)
      return Number.isFinite(hours) && hours > 0 ? getTradePnl(trade, props.initialBalance) / hours : Number.NaN
    })
    .filter(Number.isFinite)
  const avgVelocity = historicalVelocities.length > 0
    ? historicalVelocities.reduce((sum, value) => sum + value, 0) / historicalVelocities.length
    : undefined
  const slDistances = closedTrades.value
    .map((trade) => {
      const { entry, stopLoss } = getPositiveTradeLevels(trade)
      return entry !== null && stopLoss !== null ? (Math.abs(entry - stopLoss) / entry) * 100 : Number.NaN
    })
    .filter(Number.isFinite)
  const avgSlDistPct = slDistances.length > 0
    ? slDistances.reduce((sum, value) => sum + value, 0) / slDistances.length
    : undefined
  const plannedStopRisk = getTradePlannedStopRiskDollars(props.trade)
  const riskBudget = riskBudgetDollars.value ?? (Number.isFinite(plannedStopRisk) ? plannedStopRisk : 0)
  const rr = getTradeRiskReward(props.trade)
  const requiredStats = getRequiredConditionStats(props.trade)
  const requiredRatio = requiredStats.ratio ?? 0
  const riskScore = riskBudget > 0 && Number.isFinite(plannedStopRisk)
    ? Math.max(0, Math.min(100, 100 - ((plannedStopRisk / riskBudget) * 100 - 100)))
    : 50
  const executionConfidence = requiredStats.total > 0
    ? Math.round((requiredRatio * 0.6) + (riskScore * 0.4))
    : undefined
  const avgWin = wins.length > 0 ? grossProfit / wins.length : 0
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0
  const winRate = pnls.length > 0 ? (wins.length / pnls.length) * 100 : undefined
  const expectedValue = winRate !== undefined
    ? ((winRate / 100) * avgWin) - (((100 - winRate) / 100) * avgLoss)
    : undefined

  return {
    initialBalance: balanceBeforeTrade.value,
    balanceBeforeTrade: balanceBeforeTrade.value,
    allTrades: closedTrades.value,
    avgPnl,
    winRate,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : undefined,
    expectedValue,
    riskBudget: riskBudget > 0 ? riskBudget : undefined,
    plannedStopRiskDollars: Number.isFinite(plannedStopRisk) ? plannedStopRisk : undefined,
    rr: Number.isFinite(rr) && rr > 0 ? rr : undefined,
    targetRr: parsePositiveNumber(props.trade?.riskRewardRatio ?? props.trade?.plannedRiskReward ?? props.trade?.targetRR) ?? undefined,
    baselineRr: parsePositiveNumber(props.trade?.baselineRr ?? props.trade?.targetRR) ?? undefined,
    avgDuration: avgDurationHours !== undefined ? avgDurationHours * 60 : undefined,
    avgVelocity,
    avgSlDistPct,
    executionConfidence,
    durationHours: Number.isFinite(durationHours) ? durationHours : undefined,
    durationMinutes: Number.isFinite(durationHours) ? durationHours * 60 : undefined
  }
})

const metricsData = computed(() => {
  return useTradeAnalysisMetrics(
    props.trade,
    {
      ...(props.strategyStatsContext || {}),
      ...derivedStatsContext.value,
      ...inTradeStudyContext.value,
      // Keep the account balance context authoritative. Generated study data
      // may contain an empty `initialBalance` and overwrite this value.
      initialBalance: balanceBeforeTrade.value,
      balanceBeforeTrade: balanceBeforeTrade.value
    },
    (locale.value as 'ru' | 'en') || 'ru',
    'advanced',
    activeMetricTab.value
  )
})

const activeMetricList = computed(() => metricsData.value.metrics)

const metricTabs = computed(() => {
  const counts = metricsData.value.counts || {}
  const isRu = locale.value === 'ru'

  return [
    { id: 'all', label: isRu ? 'Все' : 'All', count: counts.all || 0 },
    { id: 'adherence', label: isRu ? 'Соблюдение матрицы' : 'Matrix Adherence', count: counts.adherence || 0 },
    { id: 'behavioural', label: isRu ? 'Психология' : 'Behavioural', count: counts.behavioural || 0 },
    { id: 'execution', label: isRu ? 'Исполнение и риск' : 'Execution & Risk', count: counts.execution || 0 },
    { id: 'strategy_execution', label: isRu ? 'Стратегия и исполнение' : 'Strategy vs Execution', count: counts.strategy_execution || 0 },
    { id: 'in_trade', label: isRu ? 'Анализ в сделке' : 'In-Trade Analysis', count: counts.in_trade || 0 }
  ]
})
</script>

<template>
  <div class="flex flex-col space-y-4">
    <div class="flex flex-wrap items-center gap-2 border-b nier-border-primary pb-3 mb-4">
      <button
        v-for="tab in metricTabs"
        :key="tab.id"
        type="button"
        @click="activeMetricTab = tab.id"
        class="relative flex items-center space-x-2 px-4 py-2 border transition-all duration-300 cursor-pointer"
        :class="activeMetricTab === tab.id
          ? 'border-black dark:border-white bg-black/5 dark:bg-white/5 nier-text-primary font-bold shadow-sm'
          : 'nier-border-primary text-black/50 dark:text-white/50 hover:border-black/30 dark:hover:border-white/30'"
      >
        <div v-if="activeMetricTab === tab.id" class="w-1.5 h-1.5 nier-bg-inverted rotate-45 animate-pulse"></div>
        <span class="text-[10px] font-mono tracking-wider uppercase">{{ tab.label }}</span>
        <span class="text-[8px] font-mono px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded-full opacity-60">{{ tab.count }}</span>
      </button>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4">
      <ExMetricCard
        v-for="metric in activeMetricList"
        :key="metric.key"
        :metric="metric"
        :is-dark="isDark"
      />
    </div>
  </div>
</template>
