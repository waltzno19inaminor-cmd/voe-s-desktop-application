<script setup lang="ts">
import { computed, ref } from 'vue'
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

const riskRewardPoints = computed(() => props.trades.map((trade, index) => {
  const normalized = normalizeTrade(trade)
  const plannedRisk = getTradePlannedStopRiskDollars(normalized)
  const pnl = Number(props.getTradePnl(trade))
  const riskReward = Number.isFinite(plannedRisk) && plannedRisk > 0 && Number.isFinite(pnl)
    ? pnl / plannedRisk
    : null
  const asset = String(normalized.asset ?? normalized.symbol ?? normalized.ticker ?? normalized.label ?? 'UNKNOWN')
    .split('[')[0]!
    .split('|')[0]!
    .trim()
    .toUpperCase() || 'UNKNOWN'
  const directionValue = String(normalized.side ?? normalized.direction ?? normalized.positionSide ?? '').trim().toLowerCase()
  const direction = directionValue.includes('short') || directionValue.includes('sell')
    ? 'Short'
    : directionValue.includes('long') || directionValue.includes('buy')
      ? 'Long'
      : '—'
  const rawCloseDate = normalized.dateExit ?? normalized.exitTime ?? normalized.closeDate ?? normalized.date
  const closeDateValue = rawCloseDate && typeof rawCloseDate?.toDate === 'function'
    ? rawCloseDate.toDate()
    : typeof rawCloseDate === 'number' && rawCloseDate < 1e12
      ? new Date(rawCloseDate * 1000)
      : new Date(rawCloseDate ?? '')
  const closeDate = Number.isFinite(closeDateValue.getTime())
    ? new Intl.DateTimeFormat(isRu.value ? 'ru-RU' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(closeDateValue)
    : '—'
  return { index, asset, direction, closeDate, riskReward }
}))
const riskRewardValues = computed(() => riskRewardPoints.value
  .map(point => point.riskReward)
  .filter((value): value is number => Number.isFinite(value)))
const riskRewardDomain = computed(() => {
  if (!riskRewardValues.value.length) return { min: -1, max: 1 }
  const min = Math.min(0, ...riskRewardValues.value)
  const max = Math.max(0, ...riskRewardValues.value)
  const padding = Math.max((max - min) * 0.1, 0.25)
  return { min: min - padding, max: max + padding }
})
const riskRewardChartWidth = 1000
const riskRewardChartHeight = 320
const riskRewardPadding = { top: 32, right: 70, bottom: 42, left: 64 }
const riskRewardPlotLeft = riskRewardPadding.left + 32
const riskRewardPlotWidth = riskRewardChartWidth - riskRewardPlotLeft - riskRewardPadding.right
const riskRewardPlotHeight = riskRewardChartHeight - riskRewardPadding.top - riskRewardPadding.bottom
const riskRewardAxisLabelX = riskRewardPlotLeft - 12
const riskRewardXFor = (index: number) => riskRewardPoints.value.length <= 1
  ? riskRewardPlotLeft + riskRewardPlotWidth / 2
  : riskRewardPlotLeft + (index / (riskRewardPoints.value.length - 1)) * riskRewardPlotWidth
const riskRewardYFor = (value: number) => riskRewardPadding.top
  + (1 - (value - riskRewardDomain.value.min) / Math.max(1e-9, riskRewardDomain.value.max - riskRewardDomain.value.min)) * riskRewardPlotHeight
const riskRewardZeroY = computed(() => riskRewardYFor(0))
const riskRewardPath = computed(() => {
  let path = ''
  let segmentOpen = false
  riskRewardPoints.value.forEach(point => {
    if (point.riskReward === null) {
      segmentOpen = false
      return
    }
    path += `${segmentOpen ? 'L' : 'M'} ${riskRewardXFor(point.index).toFixed(2)} ${riskRewardYFor(point.riskReward).toFixed(2)} `
    segmentOpen = true
  })
  return path.trim()
})
const riskRewardTicks = computed(() => {
  const min = riskRewardDomain.value.min
  const max = riskRewardDomain.value.max
  const range = Math.max(max - min, 1e-9)
  const rawStep = range / 6
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalizedStep = rawStep / magnitude
  const stepFactor = normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10
  const step = stepFactor * magnitude
  const first = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let value = first; value <= max + step * 0.001; value += step) ticks.push(Number(value.toFixed(8)))
  return ticks.length >= 2 ? ticks : [min, max]
})
const riskRewardXTicks = computed(() => {
  const count = Math.min(6, riskRewardPoints.value.length)
  if (!count) return []
  if (count === 1) return [{ index: 0, label: '1' }]
  return Array.from({ length: count }, (_, tickIndex) => {
    const index = Math.round((tickIndex / (count - 1)) * (riskRewardPoints.value.length - 1))
    return { index, label: String(index + 1) }
  })
})
const hoveredRiskRewardIndex = ref<number | null>(null)
const riskRewardTooltipPosition = ref({ x: 0, y: 0 })
const hoveredRiskRewardPoint = computed(() => hoveredRiskRewardIndex.value === null
  ? null
  : riskRewardPoints.value[hoveredRiskRewardIndex.value] ?? null)
const riskRewardFormatted = (value: number | null) => value === null || !Number.isFinite(value) ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}R`
const riskRewardAxisFormatted = (value: number) => Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value.toFixed(2)}` : '—'
const riskRewardPointFromEvent = (event: MouseEvent) => {
  const svg = event.currentTarget as SVGSVGElement
  const screenMatrix = svg.getScreenCTM()
  if (screenMatrix) {
    const svgPoint = svg.createSVGPoint()
    svgPoint.x = event.clientX
    svgPoint.y = event.clientY
    const localPoint = svgPoint.matrixTransform(screenMatrix.inverse())
    return { x: localPoint.x, y: localPoint.y }
  }
  const rect = svg.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * riskRewardChartWidth,
    y: ((event.clientY - rect.top) / rect.height) * riskRewardChartHeight
  }
}
const handleRiskRewardPointerMove = (event: MouseEvent) => {
  if (!riskRewardPoints.value.length) return
  const localPoint = riskRewardPointFromEvent(event)
  if (localPoint.x < riskRewardPadding.left || localPoint.x > riskRewardChartWidth - riskRewardPadding.right || localPoint.y < riskRewardPadding.top || localPoint.y > riskRewardChartHeight - riskRewardPadding.bottom) {
    hoveredRiskRewardIndex.value = null
    return
  }
  const nearest = riskRewardPoints.value.reduce<{ index: number; distance: number } | null>((candidate, point) => {
    const distance = Math.abs(riskRewardXFor(point.index) - localPoint.x)
    return !candidate || distance < candidate.distance ? { index: point.index, distance } : candidate
  }, null)
  hoveredRiskRewardIndex.value = nearest?.index ?? null
  riskRewardTooltipPosition.value = { x: event.clientX, y: event.clientY }
}
const clearRiskRewardHover = () => {
  hoveredRiskRewardIndex.value = null
}
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

            <text :x="riskBaselineX + riskBarWidth(averagePlannedRisk) / 2" y="48" text-anchor="middle" fill="white" fill-opacity="0.9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="700">{{ isRu ? 'Риск по стоп-лоссу (средний)' : 'Stop-loss risk (average)' }}</text>
            <rect :x="riskBaselineX" y="58" :width="riskBarWidth(averagePlannedRisk)" height="42" fill="#f1f1f1" fill-opacity="0.88" />
            <text :x="riskBaselineX + riskBarWidth(averagePlannedRisk) + 10" y="85" text-anchor="start" fill="white" fill-opacity="0.95" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" font-weight="700">{{ averagePlannedRisk ? formatMoney(averagePlannedRisk) : '—' }}</text>

            <text :x="riskBaselineX + riskBarWidth(averageRealizedLoss) / 2" y="128" text-anchor="middle" fill="white" fill-opacity="0.9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="700">{{ isRu ? 'Фактический убыток (средний)' : 'Realized loss (average)' }}</text>
            <rect :x="riskBaselineX" y="138" :width="riskBarWidth(averageRealizedLoss)" height="42" fill="#64748b" fill-opacity="0.88" />
            <text :x="riskBaselineX + riskBarWidth(averageRealizedLoss) + 10" y="165" text-anchor="start" fill="white" fill-opacity="0.95" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" font-weight="700">{{ averageRealizedLoss ? formatMoney(averageRealizedLoss) : '—' }}</text>

            <text :x="riskBaselineX" y="238" text-anchor="middle" fill="white" fill-opacity="0.6" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12">$0</text>
          </svg>
        </div>
        <div class="mt-3 font-serif text-sm text-white/70 sm:text-base">
          {{ isRu ? 'Плановый риск рассчитан по расстоянию до стоп-лосса; фактический убыток — по закрытым убыточным сделкам.' : 'Planned risk uses the stop-loss distance; realized loss uses closed losing trades.' }}<span v-if="configuredRiskBudget !== null"> {{ isRu ? `Превышений лимита: ${riskBreachCount}.` : `Limit breaches: ${riskBreachCount}.` }}</span>
        </div>

        <div v-if="riskRewardPoints.length" class="mt-14">
          <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ isRu ? 'II · Фактический Risk/Reward по сделкам' : 'II · Actual Risk/Reward by trade' }}</div>
          <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ isRu ? 'Линия показывает результат каждой сделки в единицах риска R; пустые участки означают отсутствие стоп-лосса.' : 'The line shows each trade result in risk units R; empty gaps indicate that no stop-loss was set.' }}</div>
          <div class="mt-8 bg-white/[0.025] p-3 sm:p-5">
            <div>
              <svg :viewBox="`0 0 ${riskRewardChartWidth} ${riskRewardChartHeight}`" class="h-[20rem] w-full" role="img" :aria-label="isRu ? 'Фактический Risk/Reward по сделкам' : 'Actual Risk/Reward by trade'" @mousemove="handleRiskRewardPointerMove" @mouseleave="clearRiskRewardHover">
              <text :x="riskRewardPadding.left - 48" :y="riskRewardPadding.top + riskRewardPlotHeight / 2 + 5" text-anchor="middle" fill="white" fill-opacity="0.8" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" font-weight="600" :transform="`rotate(-90 ${riskRewardPadding.left - 48} ${riskRewardPadding.top + riskRewardPlotHeight / 2 + 5})`">Risk Reward</text>
              <line :x1="riskRewardPlotLeft" :x2="riskRewardChartWidth - riskRewardPadding.right" :y1="riskRewardZeroY" :y2="riskRewardZeroY" stroke="white" stroke-opacity="0.4" stroke-dasharray="4 5" />
              <line v-for="tick in riskRewardTicks" :key="`rr-y-${tick}`" :x1="riskRewardPlotLeft" :x2="riskRewardChartWidth - riskRewardPadding.right" :y1="riskRewardYFor(tick)" :y2="riskRewardYFor(tick)" stroke="white" stroke-opacity="0.06" />
              <path :d="riskRewardPath" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
              <g v-for="point in riskRewardPoints" :key="`rr-point-${point.index}`">
                <circle v-if="point.riskReward !== null" :cx="riskRewardXFor(point.index)" :cy="riskRewardYFor(point.riskReward)" r="3.5" fill="white" stroke="#0b0b0b" stroke-width="1.5" />
              </g>
              <g v-if="hoveredRiskRewardPoint">
                <line :x1="riskRewardXFor(hoveredRiskRewardPoint.index)" :x2="riskRewardXFor(hoveredRiskRewardPoint.index)" :y1="riskRewardPadding.top" :y2="riskRewardChartHeight - riskRewardPadding.bottom" stroke="white" stroke-opacity="0.35" stroke-dasharray="3 4" />
                <circle v-if="hoveredRiskRewardPoint.riskReward !== null" :cx="riskRewardXFor(hoveredRiskRewardPoint.index)" :cy="riskRewardYFor(hoveredRiskRewardPoint.riskReward)" r="5" fill="white" stroke="black" stroke-width="1.5" />
              </g>
              <text v-for="tick in riskRewardTicks" :key="`rr-label-${tick}`" :x="riskRewardAxisLabelX" :y="riskRewardYFor(tick) + 5" text-anchor="end" fill="white" fill-opacity="0.9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="600">{{ riskRewardAxisFormatted(tick) }}</text>
              <text v-for="tick in riskRewardXTicks" :key="`rr-x-${tick.index}`" :x="riskRewardXFor(tick.index)" :y="riskRewardChartHeight - 10" :text-anchor="tick.index === 0 ? 'start' : tick.index === riskRewardPoints.length - 1 ? 'end' : 'middle'" fill="white" fill-opacity="0.9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="600">{{ tick.label }}</text>
              </svg>
            </div>
            <Teleport to="body">
              <div v-if="hoveredRiskRewardPoint" class="pointer-events-none fixed z-[2147483647] -translate-x-1/2 -translate-y-full border border-white/35 bg-black/95 px-4 py-3 font-mono text-[11px] font-semibold leading-relaxed text-white shadow-[0_10px_30px_rgba(0,0,0,0.55)]" :style="{ left: `${riskRewardTooltipPosition.x}px`, top: `${riskRewardTooltipPosition.y - 14}px` }" role="tooltip">
                <div class="mb-2 border-b border-white/25 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/95">{{ hoveredRiskRewardPoint.asset }}</div>
                <div class="flex min-w-[190px] items-center justify-between gap-5"><span class="text-white/85">{{ isRu ? 'Направление' : 'Direction' }}</span><span class="font-bold text-white">{{ hoveredRiskRewardPoint.direction }}</span></div>
                <div class="mt-1 flex min-w-[190px] items-center justify-between gap-5"><span class="text-white/85">{{ isRu ? 'Дата закрытия' : 'Close date' }}</span><span class="font-bold text-white">{{ hoveredRiskRewardPoint.closeDate }}</span></div>
                <div class="mt-1 flex min-w-[190px] items-center justify-between gap-5"><span class="text-white/85">Risk/Reward</span><span class="font-bold text-white">{{ hoveredRiskRewardPoint.riskReward === null ? (isRu ? 'Нет стоп-лосса' : 'No stop-loss') : riskRewardFormatted(hoveredRiskRewardPoint.riskReward) }}</span></div>
              </div>
            </Teleport>
          </div>
        </div>
      </div>
      <div v-else class="mt-12 font-serif text-base text-white/55">{{ isRu ? 'Недостаточно данных для аудита риска.' : 'Insufficient data for a risk audit.' }}</div>
    </div>
  </section>
</template>
