<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import { buildCapitalSidePerformance, buildCapitalGrowthBreakdown, buildCapitalGrowthRate } from '../analytics/capitalGrowthRate'

const props = defineProps<{
  trades: Record<string, any>[]
  getTradePnl: (trade: Record<string, any>) => number
  initialCapital?: number
}>()

const { locale } = useI18n()
const isRu = computed(() => locale.value === 'ru')
const label = (en: string, ru: string) => isRu.value ? ru : en
const model = computed(() => buildCapitalGrowthRate(props.trades, props.getTradePnl, props.initialCapital || 1000))
const breakdown = computed(() => buildCapitalGrowthBreakdown(props.trades, props.getTradePnl, props.initialCapital || 1000))
const sidePerformance = computed(() => buildCapitalSidePerformance(props.trades, props.getTradePnl, props.initialCapital || 1000))

const width = 1000
const height = 460
const padding = { top: 34, right: 32, bottom: 58, left: 92 }
const plotWidth = width - padding.left - padding.right
const plotHeight = height - padding.top - padding.bottom
const points = computed(() => model.value.points)
const values = computed(() => points.value.flatMap(point => [point.tradeRatePct, point.rollingRatePct, 0]))
const minValue = computed(() => {
  if (!values.value.length) return -1
  const min = Math.min(...values.value)
  const max = Math.max(...values.value)
  return min - Math.max((max - min) * 0.08, 0.25)
})
const maxValue = computed(() => {
  if (!values.value.length) return 1
  const min = Math.min(...values.value)
  const max = Math.max(...values.value)
  return max + Math.max((max - min) * 0.08, 0.25)
})

const barWidth = computed(() => points.value.length ? Math.max(2, Math.min(26, plotWidth / points.value.length * 0.9)) : 0)
const xFor = (index: number) => points.value.length <= 1
  ? padding.left + plotWidth / 2
  : padding.left + barWidth.value / 2 + (index / (points.value.length - 1)) * (plotWidth - barWidth.value)
const yFor = (value: number) => padding.top + (1 - (value - minValue.value) / Math.max(1e-9, maxValue.value - minValue.value)) * plotHeight
const zeroY = computed(() => yFor(0))
const rollingPath = computed(() => points.value.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index).toFixed(2)} ${yFor(point.rollingRatePct).toFixed(2)}`).join(' '))
const formatted = (value: number) => Number.isFinite(value) ? value.toFixed(2) : '—'
const formattedFrequency = (value: number) => Number.isFinite(value) ? `${value.toFixed(1)}%` : '—'
const formattedSignedPercent = (value: number) => Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value.toFixed(2)}%` : '—'
const breakdownRows = computed(() => [
  ...breakdown.value.scenarios.map(item => ({ ...item, kind: 'scenario' as const })),
  ...breakdown.value.conditions.map(item => ({ ...item, kind: 'condition' as const }))
])
const formattedGroupName = (name: string) => {
  const normalized = name.trim().toLocaleLowerCase()
  return normalized ? `${normalized.charAt(0).toLocaleUpperCase()}${normalized.slice(1)}` : name
}
const breakdownRowKey = (item: { id: string; kind: 'scenario' | 'condition' }) => `${item.kind}-${item.id}`
const bestBreakdownRowKey = computed(() => {
  if (breakdownRows.value.length < 2) return null
  const best = breakdownRows.value.reduce((current, item) => item.averageRate > current.averageRate ? item : current)
  return breakdownRowKey(best)
})
const worstBreakdownRowKey = computed(() => {
  if (breakdownRows.value.length < 2) return null
  const worst = breakdownRows.value.reduce((current, item) => item.averageRate < current.averageRate ? item : current)
  return breakdownRowKey(worst)
})
const breakdownRowClass = (item: { id: string; kind: 'scenario' | 'condition' }) => {
  const key = breakdownRowKey(item)
  if (key === bestBreakdownRowKey.value) return 'bg-white/[0.14] hover:bg-white/[0.18]'
  if (key === worstBreakdownRowKey.value) return 'bg-white/[0.06] hover:bg-white/[0.1]'
  return 'hover:bg-white/[0.04]'
}
const hoveredIndex = ref<number | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })
const hoveredPoint = computed(() => hoveredIndex.value === null ? null : points.value[hoveredIndex.value] ?? null)
const averageRate = computed(() => points.value.length
  ? points.value.reduce((sum, point) => sum + point.tradeRatePct, 0) / points.value.length
  : 0)
const maxGrowthRate = computed(() => points.value.length
  ? Math.max(...points.value.map(point => point.tradeRatePct))
  : 0)
const minGrowthRate = computed(() => points.value.length
  ? Math.min(...points.value.map(point => point.tradeRatePct))
  : 0)
const startingCapital = computed(() => Number.isFinite(props.initialCapital) && Math.abs(props.initialCapital as number) > 1e-9
  ? Math.abs(props.initialCapital as number)
  : 1000)
const totalCapitalGrowth = computed(() => points.value.length
  ? ((points.value[points.value.length - 1].equity - startingCapital.value) / startingCapital.value) * 100
  : 0)
const profitLossChartWidth = 1000
const profitLossChartHeight = 300
const profitLossPadding = { top: 44, right: 96, bottom: 28, left: 12 }
const profitLossPlotWidth = profitLossChartWidth - profitLossPadding.left - profitLossPadding.right
const profitLossPlotHeight = profitLossChartHeight - profitLossPadding.top - profitLossPadding.bottom
const grossProfit = computed(() => points.value.reduce((sum, point) => sum + (point.pnl > 0 ? point.pnl : 0), 0))
const grossLoss = computed(() => points.value.reduce((sum, point) => sum + (point.pnl < 0 ? point.pnl : 0), 0))
const netProfit = computed(() => points.value.reduce((sum, point) => sum + point.pnl, 0))
const profitLossItems = computed(() => [
  { key: 'gross-profit', label: label('Gross Profit', 'Gross Profit'), value: grossProfit.value, color: '#f8fafc' },
  { key: 'gross-loss', label: label('Gross Loss', 'Gross Loss'), value: grossLoss.value, color: '#64748b' },
  { key: 'net-profit', label: label('Net Profit', 'Net Profit'), value: netProfit.value, color: '#cbd5e1' }
])
const profitLossMaxAbs = computed(() => Math.max(1, ...profitLossItems.value.map(item => Math.abs(item.value))) * 1.1)
const profitLossBaselineX = computed(() => profitLossPadding.left)
const profitLossXFor = (value: number) => profitLossBaselineX.value + (Math.abs(value) / profitLossMaxAbs.value) * profitLossPlotWidth
const profitLossRowHeight = profitLossPlotHeight / 3
const profitLossBarHeight = 38
const profitLossYFor = (index: number) => profitLossPadding.top + index * profitLossRowHeight + (profitLossRowHeight - profitLossBarHeight) / 2
const profitLossLabelX = (value: number) => (profitLossBaselineX.value + profitLossXFor(value)) / 2
const moneyFormatted = (value: number) => {
  if (!Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}$${Math.abs(value).toFixed(2)}`
}

const yTicks = computed(() => {
  const min = minValue.value
  const max = maxValue.value
  const range = Math.max(max - min, 1e-9)
  const rawStep = range / 8
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalizedStep = rawStep / magnitude
  const stepFactor = normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10
  const step = stepFactor * magnitude
  const first = Math.ceil(min / step) * step
  const ticks: number[] = []

  for (let value = first; value <= max + step * 0.001; value += step) {
    ticks.push(Number(value.toFixed(8)))
  }

  return ticks.length >= 2 ? ticks : [min, max]
})

const xTicks = computed(() => {
  const count = Math.min(6, points.value.length)
  if (!count) return []
  if (count === 1) return [{ index: 0, label: '1' }]

  return Array.from({ length: count }, (_, tickIndex) => {
    const index = Math.round((tickIndex / (count - 1)) * (points.value.length - 1))
    return { index, label: String(index + 1) }
  })
})

const chartPointFromEvent = (event: MouseEvent, targetWidth = width, targetHeight = height) => {
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
    x: ((event.clientX - rect.left) / rect.width) * targetWidth,
    y: ((event.clientY - rect.top) / rect.height) * targetHeight
  }
}

const handleChartPointerMove = (event: MouseEvent) => {
  if (!points.value.length) return

  const localPoint = chartPointFromEvent(event)
  if (localPoint.x < padding.left || localPoint.x > width - padding.right || localPoint.y < padding.top || localPoint.y > height - padding.bottom) {
    hoveredIndex.value = null
    return
  }

  const nearest = points.value.reduce<{ index: number; distance: number } | null>((candidate, point, index) => {
    const distance = Math.abs(xFor(index) - localPoint.x)
    return !candidate || distance < candidate.distance ? { index, distance } : candidate
  }, null)

  hoveredIndex.value = nearest?.index ?? null
  tooltipPosition.value = { x: event.clientX, y: event.clientY }
}

const clearChartHover = () => {
  hoveredIndex.value = null
}

</script>

<template>
  <section class="mt-16">
    <div class="flex flex-wrap items-end justify-between gap-5">
      <div>
        <div class="font-serif text-[13px] uppercase tracking-[0.2em] text-white/75">{{ label('I · Capital change by trade', 'I · Изменение капитала по сделкам') }}</div>
        <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ label('Percentage change after each trade and the average change across the last 10 trades.', 'Процентное изменение после каждой сделки и среднее изменение за последние 10 сделок.') }}</div>
      </div>
    </div>

    <div v-if="points.length" class="mt-8 bg-white/[0.025] p-3 sm:p-5">
      <svg :viewBox="`0 0 ${width} ${height}`" class="h-[26rem] w-full" role="img" :aria-label="label('Capital change by trade', 'Изменение капитала по сделкам')" @mousemove="handleChartPointerMove" @mouseleave="clearChartHover">
        <line :x1="padding.left" :x2="width - padding.right" :y1="zeroY" :y2="zeroY" stroke="white" stroke-opacity="0.35" stroke-dasharray="4 5" />
        <rect v-for="point in points" :key="point.index" :x="xFor(point.index) - barWidth / 2" :y="point.tradeRatePct >= 0 ? yFor(point.tradeRatePct) : zeroY" :width="barWidth" :height="Math.abs(yFor(point.tradeRatePct) - zeroY)" :fill="point.tradeRatePct >= 0 ? '#d1d5db' : '#737373'" fill-opacity="0.72" />
        <path :d="rollingPath" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />

        <g v-if="hoveredPoint">
          <line :x1="xFor(hoveredPoint.index)" :x2="xFor(hoveredPoint.index)" :y1="padding.top" :y2="height - padding.bottom" stroke="white" stroke-opacity="0.35" stroke-dasharray="3 4" />
          <circle :cx="xFor(hoveredPoint.index)" :cy="yFor(hoveredPoint.tradeRatePct)" r="4" fill="white" stroke="black" stroke-width="1.5" />
          <circle :cx="xFor(hoveredPoint.index)" :cy="yFor(hoveredPoint.rollingRatePct)" r="4" fill="black" stroke="white" stroke-width="1.5" />
        </g>

        <text v-for="tick in yTicks" :key="`y-${tick}`" :x="padding.left - 12" :y="yFor(tick) + 5" text-anchor="end" fill="white" fill-opacity="0.88" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" font-weight="600">{{ formatted(tick) }}</text>
        <text v-for="tick in xTicks" :key="`x-${tick.index}`" :x="xFor(tick.index)" :y="height - padding.bottom + 30" :text-anchor="tick.index === 0 ? 'start' : tick.index === points.length - 1 ? 'end' : 'middle'" fill="white" fill-opacity="0.88" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" font-weight="600">{{ tick.label }}</text>
        <text :x="padding.left - 72" :y="padding.top + plotHeight / 2 + 5" text-anchor="middle" fill="white" fill-opacity="0.82" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="15" font-weight="600">%</text>
      </svg>

      <Teleport to="body">
        <div v-if="hoveredPoint" class="pointer-events-none fixed z-[2147483647] -translate-x-1/2 -translate-y-full border border-white/35 bg-black/95 px-4 py-3 font-mono text-[11px] font-semibold leading-relaxed text-white shadow-[0_10px_30px_rgba(0,0,0,0.55)]" :style="{ left: `${tooltipPosition.x}px`, top: `${tooltipPosition.y - 14}px` }" role="tooltip">
          <div class="mb-2 border-b border-white/25 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/95">{{ hoveredPoint.asset }}</div>
          <div class="flex min-w-[190px] items-center justify-between gap-5">
            <span class="font-semibold text-white/85">{{ label('Change', 'Изменение') }}</span>
            <span class="font-bold text-white">{{ formatted(hoveredPoint.tradeRatePct) }}%</span>
          </div>
          <div class="mt-1 flex min-w-[190px] items-center justify-between gap-5">
            <span class="font-semibold text-white/85">{{ label('Average', 'Среднее') }}</span>
            <span class="font-bold text-white">{{ formatted(hoveredPoint.rollingRatePct) }}%</span>
          </div>
        </div>
      </Teleport>

      <div class="mt-3 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[9px] uppercase tracking-[0.14em] text-white/60">
        <span class="inline-flex items-center gap-2"><i class="h-0.5 w-4 bg-white/90"></i>{{ label('Average change', 'Среднее изменение') }}</span>
      </div>
    </div>
    <div v-if="points.length" class="mt-10">
      <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ label('Details', 'Подробности') }}</div>
      <div class="mt-2 font-serif text-sm text-white/70 sm:text-base">
        {{ label('Average growth rate', 'Средний темп роста') }} — <span class="font-mono font-semibold text-white">{{ formatted(averageRate) }}%</span>; {{ label('maximum and minimum growth rates', 'максимальный и минимальный темпы роста') }} — <span class="font-mono font-semibold text-white">{{ formatted(maxGrowthRate) }}%</span> {{ label('and', 'и') }} <span class="font-mono font-semibold text-white">{{ formatted(minGrowthRate) }}%</span> {{ label('respectively', 'соответственно') }}; {{ label('overall capital growth', 'итоговый прирост капитала') }} — <span class="font-mono font-semibold text-white">{{ formatted(totalCapitalGrowth) }}%</span>.
      </div>
    </div>
    <div v-if="points.length" class="mt-12">
      <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ label('II · Profit structure', 'II · Структура прибыли') }}</div>
      <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ label('Realized gross profit, gross loss and net profit.', 'Валовая прибыль, валовой убыток и чистая прибыль.') }}</div>
      <div class="mt-5 bg-white/[0.025] p-3 sm:p-5">
        <svg :viewBox="`0 0 ${profitLossChartWidth} ${profitLossChartHeight}`" class="h-[18rem] w-full" role="img" :aria-label="label('Gross profit, gross loss and net profit', 'Валовая прибыль, валовой убыток и чистая прибыль')">
          <line :x1="profitLossBaselineX" :x2="profitLossBaselineX" :y1="profitLossPadding.top - 8" :y2="profitLossChartHeight - profitLossPadding.bottom + 2" stroke="white" stroke-opacity="0.42" stroke-dasharray="4 5" />
          <g v-for="(item, index) in profitLossItems" :key="item.key">
            <line :x1="profitLossBaselineX" :x2="profitLossChartWidth - profitLossPadding.right" :y1="profitLossYFor(index) + profitLossBarHeight / 2" :y2="profitLossYFor(index) + profitLossBarHeight / 2" stroke="white" stroke-opacity="0.06" />
            <text :x="profitLossLabelX(item.value)" :y="profitLossYFor(index) - 8" text-anchor="middle" fill="white" fill-opacity="0.82" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="15" font-weight="600">{{ item.label }}</text>
            <rect :x="profitLossBaselineX" :y="profitLossYFor(index)" :width="profitLossXFor(item.value) - profitLossBaselineX" :height="profitLossBarHeight" :fill="item.color" fill-opacity="0.78" />
            <text :x="profitLossXFor(item.value) + 10" :y="profitLossYFor(index) + profitLossBarHeight / 2 + 5" text-anchor="start" fill="white" fill-opacity="0.95" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" font-weight="700">{{ moneyFormatted(item.value) }}</text>
          </g>
          <text :x="profitLossBaselineX" :y="profitLossChartHeight - 5" text-anchor="middle" fill="white" fill-opacity="0.55" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12">0</text>
        </svg>
      </div>
    </div>
    <div v-if="sidePerformance.length" class="mt-12">
      <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ label('III · Long / Short distribution', 'III · Распределение Long / Short') }}</div>
      <div class="mt-5 space-y-3">
        <div v-for="side in sidePerformance" :key="side.side" class="border border-white/10 bg-white/[0.025] px-3 py-3 sm:px-5">
          <div class="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white">
            <span class="w-14 shrink-0">{{ side.side }}</span>
            <div class="h-2 min-w-0 flex-1 bg-white/10">
              <div class="h-full bg-white/75" :style="{ width: `${side.distribution}%` }"></div>
            </div>
            <span class="w-24 shrink-0 text-right">{{ formattedFrequency(side.distribution) }} {{ label('trades', 'сделок') }}</span>
          </div>
          <div class="mt-2 pl-14 font-mono text-[10px] font-semibold text-white/80">
            {{ label('Win Rate', 'Win Rate') }} <span class="text-white">{{ side.winRate === null ? '—' : formatted(side.winRate) }}{{ side.winRate === null ? '' : '%' }}</span>
            <span class="mx-2 text-white/40">·</span>
            {{ label('Return', 'Доходность') }} <span class="text-white">{{ formattedSignedPercent(side.returnRate) }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="breakdownRows.length" class="mt-12">
      <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ label('IV · Growth rates by scenario and condition usage', 'IV · Темпы роста по использованию сценариев и условий') }}</div>
      <div class="mt-5 overflow-x-auto border border-white/10 bg-white/[0.025]">
        <table class="w-full min-w-[760px] border-collapse font-mono text-[11px]">
          <thead class="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-white/70">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">{{ label('Name', 'Название') }}</th>
              <th class="px-2 py-3 text-center font-semibold">{{ label('Type', 'Тип') }}</th>
              <th class="px-2 py-3 text-center font-semibold">{{ label('Freq.', 'Частота') }}</th>
              <th class="px-2 py-3 text-center font-semibold">{{ label('Avg.', 'Сред.') }}</th>
              <th class="px-2 py-3 text-center font-semibold">{{ label('Max', 'Макс.') }}</th>
              <th class="px-2 py-3 text-center font-semibold">{{ label('Min', 'Мин.') }}</th>
              <th class="px-4 py-3 text-center font-semibold">{{ label('Impact', 'Вклад') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in breakdownRows" :key="`${item.kind}-${item.id}`" class="border-b border-white/5 last:border-0" :class="breakdownRowClass(item)">
              <td class="max-w-[220px] truncate px-4 py-4 text-left font-sans text-[12px] normal-case text-white/90" :title="formattedGroupName(item.name)">{{ formattedGroupName(item.name) }}</td>
              <td class="px-2 py-4 text-center text-[10px] tracking-[0.08em] text-white/70">{{ item.kind === 'scenario' ? label('Scen.', 'Сцен.') : label('Cond.', 'Усл.') }}</td>
              <td class="px-2 py-4 text-center text-white/85">{{ formattedFrequency(item.frequency) }}</td>
              <td class="px-2 py-4 text-center font-semibold text-white">{{ formatted(item.averageRate) }}%</td>
              <td class="px-2 py-4 text-center font-semibold text-white">{{ formatted(item.maxRate) }}%</td>
              <td class="px-2 py-4 text-center font-semibold text-white">{{ formatted(item.minRate) }}%</td>
              <td class="px-4 py-4 text-center font-semibold text-white">{{ formatted(item.contribution) }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div v-if="!points.length" class="mt-8 font-serif text-base text-white/55">{{ label('No trade data available.', 'Нет данных по сделкам.') }}</div>
  </section>
</template>
