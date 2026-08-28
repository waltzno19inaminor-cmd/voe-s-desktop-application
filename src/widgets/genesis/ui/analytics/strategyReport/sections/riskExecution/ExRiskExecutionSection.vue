<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import { getTradePlannedStopRiskDollars } from '~/widgets/genesis/model/tradeRisk'
import ExStrategyReportPageNumber from '../../components/auxiliary/ExStrategyReportPageNumber.vue'
import ExStrategyReportSectionHeading from '../../components/auxiliary/ExStrategyReportSectionHeading.vue'
import ExStrategyReportSectionSubheading from '../../components/auxiliary/ExStrategyReportSectionSubheading.vue'

const { locale } = useI18n()
const isRu = computed(() => locale.value === 'ru')
const props = defineProps<{
  trades: Record<string, any>[]
  getTradePnl: (trade: Record<string, any>) => number
  riskBudget?: number | null
}>()

const formatMoney = (value: number) => {
  if (!Number.isFinite(value)) return '—'
  return value === 0 ? '$0.00' : `-$${Math.abs(value).toFixed(2)}`
}
const normalizeTrade = (trade: Record<string, any>) => trade.trade && typeof trade.trade === 'object'
  ? { ...trade.trade, ...trade }
  : trade
const plannedRiskFor = (trade: Record<string, any>) => {
  const normalized = normalizeTrade(trade)
  const calculatedRisk = getTradePlannedStopRiskDollars(normalized)
  if (Number.isFinite(calculatedRisk) && calculatedRisk > 0) return calculatedRisk
  const storedRisk = Number(normalized.riskDollars)
  return Number.isFinite(storedRisk) && storedRisk > 0 ? storedRisk : Number.NaN
}
const riskAudit = computed(() => props.trades.map(trade => {
  const planned = plannedRiskFor(trade)
  const pnl = Number(props.getTradePnl(trade))
  const realizedLoss = Number.isFinite(pnl) && pnl < 0 ? Math.abs(pnl) : Number.NaN
  return { planned, realizedLoss }
}))
const plannedRiskValues = computed(() => riskAudit.value.map(item => item.planned).filter(value => Number.isFinite(value)))
const realizedLossValues = computed(() => riskAudit.value.map(item => item.realizedLoss).filter(value => Number.isFinite(value)))
const averagePlannedRisk = computed(() => plannedRiskValues.value.length
  ? plannedRiskValues.value.reduce((sum, value) => sum + value, 0) / plannedRiskValues.value.length
  : 0)
const averageRealizedLoss = computed(() => realizedLossValues.value.length
  ? realizedLossValues.value.reduce((sum, value) => sum + value, 0) / realizedLossValues.value.length
  : 0)
const configuredRiskBudget = computed(() => {
  const value = Number(props.riskBudget)
  return Number.isFinite(value) && value > 0 ? value : null
})
const riskBreachCount = computed(() => {
  if (!configuredRiskBudget.value) return 0
  return riskAudit.value.filter(item => (
    (Number.isFinite(item.planned) && item.planned > configuredRiskBudget.value!) ||
    (Number.isFinite(item.realizedLoss) && item.realizedLoss > configuredRiskBudget.value!)
  )).length
})
const hasRiskData = computed(() => plannedRiskValues.value.length > 0 || realizedLossValues.value.length > 0 || configuredRiskBudget.value !== null)
const riskChartWidth = 1000
const riskChartHeight = 250
const riskPadding = { left: 64, right: 96 }
const riskPlotWidth = riskChartWidth - riskPadding.left - riskPadding.right
const riskScaleMax = computed(() => Math.max(1, averagePlannedRisk.value, averageRealizedLoss.value, configuredRiskBudget.value || 0) * 1.15)
const riskBarWidth = (value: number) => value / riskScaleMax.value * riskPlotWidth
const riskBaselineX = riskPadding.left
const riskBudgetX = computed(() => configuredRiskBudget.value === null
  ? null
  : riskBaselineX + riskBarWidth(configuredRiskBudget.value))
</script>

<template>
  <section id="report-section-risk-execution" class="min-h-screen px-[clamp(1.5rem,7vw,8rem)] py-16 text-white sm:py-24">
    <div class="mx-auto max-w-5xl">
      <ExStrategyReportPageNumber page="03" total="07" />
      <div class="mt-12">
        <ExStrategyReportSectionHeading>{{ isRu ? 'Риск и исполнение' : 'Risk & Execution' }}</ExStrategyReportSectionHeading>
        <ExStrategyReportSectionSubheading muted>{{ isRu ? 'Стопы, цели, размер позиции, экспозиция и длительность удержания.' : 'Stops, targets, position sizing, exposure and holding time.' }}</ExStrategyReportSectionSubheading>
      </div>

      <div v-if="hasRiskData" class="mt-12">
        <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ isRu ? 'I · Аудит риска' : 'I · Risk audit' }}</div>
        <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ isRu ? 'Средний плановый риск по стоп-лоссу и средний фактический убыток на одной шкале.' : 'Average planned stop-loss risk and average realized loss on one scale.' }}</div>
        <div class="mt-8 bg-white/[0.025] p-3 sm:p-5">
          <svg :viewBox="`0 0 ${riskChartWidth} ${riskChartHeight}`" class="h-[16rem] w-full" role="img" :aria-label="isRu ? 'Сравнение планового риска и фактического убытка' : 'Planned risk compared with realized loss'">
            <line :x1="riskBaselineX" :x2="riskBaselineX" y1="28" y2="216" stroke="white" stroke-opacity="0.42" stroke-dasharray="4 5" />
            <line v-if="riskBudgetX !== null" :x1="riskBudgetX" :x2="riskBudgetX" y1="22" y2="216" stroke="#94a3b8" stroke-width="2" stroke-dasharray="5 5" />
            <text v-if="riskBudgetX !== null" :x="riskBudgetX" y="14" text-anchor="middle" fill="#94a3b8" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" font-weight="700">{{ formatMoney(configuredRiskBudget || 0) }}</text>

            <text :x="riskBaselineX + riskBarWidth(averagePlannedRisk) / 2" y="48" text-anchor="middle" fill="white" fill-opacity="0.9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="700">{{ isRu ? 'Риск по стоп-лоссу' : 'Stop-loss risk' }}</text>
            <rect :x="riskBaselineX" y="58" :width="riskBarWidth(averagePlannedRisk)" height="42" fill="#f1f1f1" fill-opacity="0.88" />
            <text :x="riskBaselineX + riskBarWidth(averagePlannedRisk) + 10" y="85" text-anchor="start" fill="white" fill-opacity="0.95" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" font-weight="700">{{ averagePlannedRisk ? formatMoney(averagePlannedRisk) : '—' }}</text>

            <text :x="riskBaselineX + riskBarWidth(averageRealizedLoss) / 2" y="128" text-anchor="middle" fill="white" fill-opacity="0.9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="700">{{ isRu ? 'Фактический убыток' : 'Realized loss' }}</text>
            <rect :x="riskBaselineX" y="138" :width="riskBarWidth(averageRealizedLoss)" height="42" fill="#64748b" fill-opacity="0.88" />
            <text :x="riskBaselineX + riskBarWidth(averageRealizedLoss) + 10" y="165" text-anchor="start" fill="white" fill-opacity="0.95" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" font-weight="700">{{ averageRealizedLoss ? formatMoney(averageRealizedLoss) : '—' }}</text>

            <text :x="riskBaselineX" y="238" text-anchor="middle" fill="white" fill-opacity="0.6" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12">$0</text>
          </svg>
        </div>
        <div class="mt-3 font-serif text-sm text-white/70 sm:text-base">
          {{ isRu ? 'Плановый риск рассчитан по расстоянию до стоп-лосса; фактический убыток — по закрытым убыточным сделкам.' : 'Planned risk uses the stop-loss distance; realized loss uses closed losing trades.' }}<span v-if="configuredRiskBudget !== null"> {{ isRu ? `Превышений лимита: ${riskBreachCount}.` : `Limit breaches: ${riskBreachCount}.` }}</span>
        </div>
      </div>
      <div v-else class="mt-12 font-serif text-base text-white/55">{{ isRu ? 'Недостаточно данных для аудита риска.' : 'Insufficient data for a risk audit.' }}</div>
    </div>
  </section>
</template>
