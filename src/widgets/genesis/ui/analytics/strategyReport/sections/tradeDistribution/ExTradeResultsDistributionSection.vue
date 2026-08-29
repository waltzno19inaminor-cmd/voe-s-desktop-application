<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import ExStrategyReportPageNumber from '../../components/auxiliary/ExStrategyReportPageNumber.vue'
import ExStrategyReportSectionHeading from '../../components/auxiliary/ExStrategyReportSectionHeading.vue'
import ExStrategyReportSectionSubheading from '../../components/auxiliary/ExStrategyReportSectionSubheading.vue'

const props = defineProps<{
  trades: Record<string, any>[]
  getTradePnl: (trade: Record<string, any>) => number
}>()

const { locale } = useI18n()
const isRu = computed(() => locale.value === 'ru')
const label = (en: string, ru: string) => isRu.value ? ru : en
const formatMoney = (value: number) => {
  if (!Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}$${Math.abs(value).toFixed(2)}`
}
const formatCompactMoney = (value: number) => {
  if (!Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  const absolute = Math.abs(value)
  const suffix = absolute >= 1_000_000 ? `${(absolute / 1_000_000).toFixed(1)}M` : absolute >= 1_000 ? `${(absolute / 1_000).toFixed(1)}K` : absolute.toFixed(0)
  return `${sign}$${suffix}`
}
const pnlValues = computed(() => props.trades
  .map(trade => Number(props.getTradePnl(trade)))
  .filter(value => Number.isFinite(value)))
const sortedPnlValues = computed(() => [...pnlValues.value].sort((a, b) => a - b))
const tradeCount = computed(() => pnlValues.value.length)
const averagePnl = computed(() => tradeCount.value ? pnlValues.value.reduce((sum, value) => sum + value, 0) / tradeCount.value : 0)
const medianPnl = computed(() => {
  const values = sortedPnlValues.value
  if (!values.length) return 0
  const middle = Math.floor(values.length / 2)
  return values.length % 2 ? values[middle]! : (values[middle - 1]! + values[middle]!) / 2
})
const largestWin = computed(() => pnlValues.value.length ? Math.max(...pnlValues.value) : 0)
const largestLoss = computed(() => pnlValues.value.length ? Math.min(...pnlValues.value) : 0)
const averageWin = computed(() => {
  const wins = pnlValues.value.filter(value => value > 0)
  return wins.length ? wins.reduce((sum, value) => sum + value, 0) / wins.length : 0
})
const averageLoss = computed(() => {
  const losses = pnlValues.value.filter(value => value < 0)
  return losses.length ? losses.reduce((sum, value) => sum + value, 0) / losses.length : 0
})
const percentile = (values: number[], ratio: number) => {
  if (!values.length) return 0
  const position = (values.length - 1) * ratio
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) return values[lower]!
  return values[lower]! + (values[upper]! - values[lower]!) * (position - lower)
}
const resultRange = computed(() => ({
  min: sortedPnlValues.value[0] ?? 0,
  lowerTypical: percentile(sortedPnlValues.value, 0.05),
  median: percentile(sortedPnlValues.value, 0.5),
  upperTypical: percentile(sortedPnlValues.value, 0.95),
  max: sortedPnlValues.value[sortedPnlValues.value.length - 1] ?? 0
}))

type DistributionBin = {
  index: number
  start: number
  end: number
  center: number
  count: number
  isPositive: boolean
}

const binCount = computed(() => Math.min(12, Math.max(5, Math.ceil(Math.sqrt(Math.max(1, tradeCount.value))))))
const bins = computed<DistributionBin[]>(() => {
  if (!pnlValues.value.length) return []
  const min = Math.min(...pnlValues.value)
  const max = Math.max(...pnlValues.value)
  if (Math.abs(max - min) < 1e-9) {
    return [{ index: 0, start: min, end: max, center: min, count: pnlValues.value.length, isPositive: min >= 0 }]
  }

  const width = (max - min) / binCount.value
  const counts = Array.from({ length: binCount.value }, (_, index) => ({
    index,
    start: min + index * width,
    end: index === binCount.value - 1 ? max : min + (index + 1) * width,
    center: min + (index + 0.5) * width,
    count: 0,
    isPositive: min + (index + 0.5) * width >= 0
  }))

  pnlValues.value.forEach(value => {
    const index = Math.min(binCount.value - 1, Math.floor((value - min) / width))
    counts[index]!.count += 1
  })

  return counts
})

const chartWidth = 1000
const chartHeight = 390
const padding = { top: 30, right: 24, bottom: 64, left: 64 }
const plotWidth = chartWidth - padding.left - padding.right
const plotHeight = chartHeight - padding.top - padding.bottom
const barGap = 6
const barWidth = computed(() => bins.value.length ? Math.max(8, plotWidth / bins.value.length - barGap) : 0)
const maxCount = computed(() => Math.max(1, ...bins.value.map(bin => bin.count)))
const xFor = (index: number) => padding.left + index * (plotWidth / Math.max(1, bins.value.length)) + barGap / 2
const yForCount = (count: number) => padding.top + plotHeight - (count / maxCount.value) * plotHeight
const zeroY = computed(() => padding.top + plotHeight)
const yTicks = computed(() => {
  if (!bins.value.length) return []
  const step = Math.max(1, Math.ceil(maxCount.value / 4))
  return Array.from({ length: Math.ceil(maxCount.value / step) + 1 }, (_, index) => Math.min(maxCount.value, index * step))
})
const xLabel = (bin: DistributionBin) => formatCompactMoney(bin.center)
const rangeChartWidth = 1000
const rangeChartHeight = 170
const rangePadding = { left: 56, right: 56 }
const rangePlotWidth = rangeChartWidth - rangePadding.left - rangePadding.right
const rangeXFor = (value: number) => {
  const { min, max } = resultRange.value
  return rangePadding.left + ((value - min) / Math.max(max - min, 1e-9)) * rangePlotWidth
}
const payoffChartWidth = 1000
const payoffChartHeight = 190
const payoffPadding = { left: 64, right: 88 }
const payoffPlotWidth = payoffChartWidth - payoffPadding.left - payoffPadding.right
const payoffScaleMax = computed(() => Math.max(1, averageWin.value, Math.abs(averageLoss.value)) * 1.15)
const payoffBarWidth = (value: number) => Math.abs(value) / payoffScaleMax.value * payoffPlotWidth
const payoffBaselineX = payoffPadding.left
const payoffLabelX = (value: number, text: string) => {
  const estimatedLabelWidth = text.length * 7.8
  const minimumCenter = payoffBaselineX + 16 + estimatedLabelWidth / 2
  const barCenter = payoffBaselineX + payoffBarWidth(value) / 2
  return Math.max(minimumCenter, barCenter)
}
const hoveredBin = ref<DistributionBin | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })
const handleBinHover = (event: MouseEvent, bin: DistributionBin) => {
  hoveredBin.value = bin
  tooltipPosition.value = { x: event.clientX, y: event.clientY }
}
const clearBinHover = () => {
  hoveredBin.value = null
}
</script>

<template>
  <section id="report-section-trade-distribution" class="min-h-screen px-[clamp(1.5rem,7vw,8rem)] py-16 text-white sm:py-24">
    <div class="mx-auto max-w-5xl">
      <ExStrategyReportPageNumber page="02" total="06" />
      <div class="mt-12">
        <ExStrategyReportSectionHeading>{{ isRu ? 'Распределение результатов сделок' : 'Trade Results Distribution' }}</ExStrategyReportSectionHeading>
        <ExStrategyReportSectionSubheading muted>{{ isRu ? 'Форма и разброс индивидуальных результатов по сделкам.' : 'The shape and spread of individual trade outcomes.' }}</ExStrategyReportSectionSubheading>
      </div>

      <div v-if="bins.length" class="mt-12">
        <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ label('I · PnL distribution', 'I · Распределение PnL') }}</div>
        <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ label('Each bar shows how many trades fall within a PnL range.', 'Каждый столбец показывает количество сделок в определённом диапазоне PnL.') }}</div>
        <div class="mt-8 bg-white/[0.025] p-3 sm:p-5">
          <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="h-[24rem] w-full" role="img" :aria-label="label('Distribution of trade results', 'Распределение результатов сделок')" @mouseleave="clearBinHover">
            <line :x1="padding.left" :x2="chartWidth - padding.right" :y1="zeroY" :y2="zeroY" stroke="white" stroke-opacity="0.35" stroke-dasharray="4 5" />
            <g v-for="tick in yTicks" :key="`count-${tick}`">
              <line :x1="padding.left" :x2="chartWidth - padding.right" :y1="yForCount(tick)" :y2="yForCount(tick)" stroke="white" stroke-opacity="0.06" />
              <text :x="padding.left - 12" :y="yForCount(tick) + 5" text-anchor="end" fill="white" fill-opacity="0.82" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="600">{{ tick }}</text>
            </g>
            <g v-for="bin in bins" :key="`bin-${bin.index}`" @mouseenter="handleBinHover($event, bin)" @mousemove="handleBinHover($event, bin)">
              <rect :x="xFor(bin.index)" :y="yForCount(bin.count)" :width="barWidth" :height="zeroY - yForCount(bin.count)" :fill="bin.isPositive ? '#f1f1f1' : '#5c5c5c'" fill-opacity="0.86" />
              <text v-if="bin.count" :x="xFor(bin.index) + barWidth / 2" :y="yForCount(bin.count) - 8" text-anchor="middle" fill="white" fill-opacity="0.9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="700">{{ bin.count }}</text>
              <text :x="xFor(bin.index) + barWidth / 2" :y="chartHeight - padding.bottom + 26" text-anchor="middle" fill="white" fill-opacity="0.72" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" font-weight="600">{{ xLabel(bin) }}</text>
            </g>
            <text :x="padding.left - 44" :y="padding.top + plotHeight / 2" text-anchor="middle" fill="white" fill-opacity="0.72" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="600" transform="rotate(-90 20 180)">{{ label('Trades', 'Сделки') }}</text>
            <text :x="padding.left + plotWidth / 2" :y="chartHeight - 8" text-anchor="middle" fill="white" fill-opacity="0.72" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="600">PnL</text>
          </svg>
        </div>

        <Teleport to="body">
          <div v-if="hoveredBin" class="pointer-events-none fixed z-[2147483647] -translate-x-1/2 -translate-y-full border border-white/35 bg-black/95 px-4 py-3 font-mono text-[11px] font-semibold leading-relaxed text-white shadow-[0_10px_30px_rgba(0,0,0,0.55)]" :style="{ left: `${tooltipPosition.x}px`, top: `${tooltipPosition.y - 14}px` }" role="tooltip">
            <div class="mb-2 border-b border-white/25 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/95">{{ label('PnL range', 'Диапазон PnL') }}</div>
            <div class="flex min-w-[190px] items-center justify-between gap-5"><span class="text-white/85">{{ label('From', 'От') }}</span><span class="font-bold text-white">{{ formatMoney(hoveredBin.start) }}</span></div>
            <div class="mt-1 flex min-w-[190px] items-center justify-between gap-5"><span class="text-white/85">{{ label('To', 'До') }}</span><span class="font-bold text-white">{{ formatMoney(hoveredBin.end) }}</span></div>
            <div class="mt-1 flex min-w-[190px] items-center justify-between gap-5"><span class="text-white/85">{{ label('Trades', 'Сделки') }}</span><span class="font-bold text-white">{{ hoveredBin.count }}</span></div>
          </div>
        </Teleport>

        <div class="mt-8 grid grid-cols-2 gap-px bg-white/10">
          <div class="bg-black px-4 py-4"><div class="font-mono text-[10px] uppercase tracking-[0.14em] text-white/60">{{ label('Average', 'Среднее') }}</div><div class="mt-2 font-mono text-lg font-bold text-white">{{ formatMoney(averagePnl) }}</div></div>
          <div class="bg-black px-4 py-4"><div class="font-mono text-[10px] uppercase tracking-[0.14em] text-white/60">{{ label('Median', 'Медиана') }}</div><div class="mt-2 font-mono text-lg font-bold text-white">{{ formatMoney(medianPnl) }}</div></div>
        </div>

        <div class="mt-10">
          <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ label('II · Typical result range', 'II · Типичный диапазон результатов') }}</div>
          <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ label('The white area contains about 90% of trade results; the light slate-blue line marks the median — the value below which half of the results fall and above which the other half fall.', 'Белая закрашенная область содержит около 90% результатов сделок; светлая серо-синяя линия обозначает медиану — значение, ниже которого находятся половина результатов, а выше — другая половина.') }}</div>
          <div class="mt-5 bg-white/[0.025] p-3 sm:p-5">
            <svg :viewBox="`0 0 ${rangeChartWidth} ${rangeChartHeight}`" class="h-[10rem] w-full" role="img" :aria-label="label('Typical range of trade results', 'Типичный диапазон результатов сделок')">
              <line :x1="rangeXFor(resultRange.min)" :x2="rangeXFor(resultRange.max)" y1="72" y2="72" stroke="#5c5c5c" stroke-width="8" stroke-linecap="round" />
              <rect :x="rangeXFor(resultRange.lowerTypical)" y="51" :width="Math.max(2, rangeXFor(resultRange.upperTypical) - rangeXFor(resultRange.lowerTypical))" height="42" fill="#f1f1f1" fill-opacity="0.88" />
              <line :x1="rangeXFor(resultRange.median)" :x2="rangeXFor(resultRange.median)" y1="38" y2="106" stroke="#94a3b8" stroke-width="5" />
              <circle :cx="rangeXFor(resultRange.min)" cy="72" r="5" fill="#5c5c5c" stroke="#ffffff" stroke-width="1.5" />
              <circle :cx="rangeXFor(resultRange.max)" cy="72" r="5" fill="#f1f1f1" stroke="#111111" stroke-width="1.5" />
              <text :x="rangeXFor(resultRange.min)" y="160" text-anchor="middle" fill="white" fill-opacity="0.72" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" font-weight="600">{{ formatCompactMoney(resultRange.min) }}</text>
              <line :x1="rangeXFor(resultRange.lowerTypical)" :x2="rangeXFor(resultRange.lowerTypical)" y1="93" y2="128" stroke="white" stroke-opacity="0.72" stroke-width="1" />
              <text :x="rangeXFor(resultRange.lowerTypical)" y="143" text-anchor="middle" fill="white" fill-opacity="0.9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" font-weight="700">{{ formatCompactMoney(resultRange.lowerTypical) }}</text>
              <text :x="rangeXFor(resultRange.median)" y="28" text-anchor="middle" fill="white" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" font-weight="700">{{ formatCompactMoney(resultRange.median) }}</text>
              <line :x1="rangeXFor(resultRange.upperTypical)" :x2="rangeXFor(resultRange.upperTypical)" y1="93" y2="128" stroke="white" stroke-opacity="0.72" stroke-width="1" />
              <text :x="rangeXFor(resultRange.upperTypical)" y="143" text-anchor="middle" fill="white" fill-opacity="0.9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" font-weight="700">{{ formatCompactMoney(resultRange.upperTypical) }}</text>
              <text :x="rangeXFor(resultRange.max)" y="160" text-anchor="middle" fill="white" fill-opacity="0.72" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" font-weight="600">{{ formatCompactMoney(resultRange.max) }}</text>
            </svg>
          </div>
        </div>

        <div class="mt-10">
          <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ label('III · Average win and loss', 'III · Средняя прибыль и убыток') }}</div>
          <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ label('Both bars start at zero, making the typical win and loss easy to compare.', 'Обе полосы начинаются от нулевой линии, поэтому размер типичной прибыли и убытка легко сравнить.') }}</div>
          <div class="mt-5 bg-white/[0.025] p-3 sm:p-5">
            <svg :viewBox="`0 0 ${payoffChartWidth} ${payoffChartHeight}`" class="h-[13rem] w-full" role="img" :aria-label="label('Average win and loss per trade', 'Средняя прибыль и убыток на сделку')">
              <line :x1="payoffBaselineX" :x2="payoffBaselineX" y1="24" y2="166" stroke="white" stroke-opacity="0.42" stroke-dasharray="4 5" />
              <text :x="payoffBaselineX" y="180" text-anchor="middle" fill="white" fill-opacity="0.6" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12">$0</text>
              <text :x="payoffLabelX(averageWin, label('Average win', 'Средняя прибыль'))" y="38" text-anchor="middle" fill="white" fill-opacity="0.9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="700">{{ label('Average win', 'Средняя прибыль') }}</text>
              <rect :x="payoffBaselineX" y="48" :width="payoffBarWidth(averageWin)" height="34" fill="#f1f1f1" fill-opacity="0.88" />
              <text :x="payoffBaselineX + payoffBarWidth(averageWin) + 10" y="70" text-anchor="start" fill="white" fill-opacity="0.95" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" font-weight="700">{{ averageWin ? formatMoney(averageWin) : '—' }}</text>
              <text :x="payoffLabelX(averageLoss, label('Average loss', 'Средний убыток'))" y="112" text-anchor="middle" fill="white" fill-opacity="0.9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="700">{{ label('Average loss', 'Средний убыток') }}</text>
              <rect :x="payoffBaselineX" y="122" :width="payoffBarWidth(averageLoss)" height="34" fill="#64748b" fill-opacity="0.88" />
              <text :x="payoffBaselineX + payoffBarWidth(averageLoss) + 10" y="144" text-anchor="start" fill="white" fill-opacity="0.95" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" font-weight="700">{{ averageLoss ? formatMoney(averageLoss) : '—' }}</text>
            </svg>
          </div>
        </div>

        <div class="mt-8 font-serif text-sm text-white/70 sm:text-base">
          {{ label('Largest win', 'Наибольшая прибыль') }} — <span class="font-mono font-semibold text-white">{{ formatMoney(largestWin) }}</span>; {{ label('largest loss', 'наибольший убыток') }} — <span class="font-mono font-semibold text-white">{{ formatMoney(largestLoss) }}</span>.
        </div>
      </div>

      <div v-else class="mt-12 font-serif text-base text-white/55">{{ label('No trade data available.', 'Нет данных по сделкам.') }}</div>
    </div>
  </section>
</template>
