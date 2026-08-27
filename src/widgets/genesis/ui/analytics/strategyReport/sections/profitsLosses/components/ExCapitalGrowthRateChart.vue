<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import { buildCapitalGrowthRate } from '../analytics/capitalGrowthRate'

const props = defineProps<{
  trades: Record<string, any>[]
  getTradePnl: (trade: Record<string, any>) => number
  initialCapital?: number
}>()

const { locale } = useI18n()
const isRu = computed(() => locale.value === 'ru')
const label = (en: string, ru: string) => isRu.value ? ru : en
const model = computed(() => buildCapitalGrowthRate(props.trades, props.getTradePnl, props.initialCapital || 1000))

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
const averageRate = computed(() => points.value.length
  ? points.value.reduce((sum, point) => sum + point.tradeRatePct, 0) / points.value.length
  : 0)

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
      <svg :viewBox="`0 0 ${width} ${height}`" class="h-[26rem] w-full" role="img" :aria-label="label('Capital change by trade', 'Изменение капитала по сделкам')">
        <line :x1="padding.left" :x2="width - padding.right" :y1="zeroY" :y2="zeroY" stroke="white" stroke-opacity="0.35" stroke-dasharray="4 5" />
        <rect v-for="point in points" :key="point.index" :x="xFor(point.index) - barWidth / 2" :y="point.tradeRatePct >= 0 ? yFor(point.tradeRatePct) : zeroY" :width="barWidth" :height="Math.abs(yFor(point.tradeRatePct) - zeroY)" :fill="point.tradeRatePct >= 0 ? '#d1d5db' : '#737373'" fill-opacity="0.72" />
        <path :d="rollingPath" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />

        <text v-for="tick in yTicks" :key="`y-${tick}`" :x="padding.left - 12" :y="yFor(tick) + 5" text-anchor="end" fill="white" fill-opacity="0.88" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" font-weight="600">{{ formatted(tick) }}</text>
        <text v-for="tick in xTicks" :key="`x-${tick.index}`" :x="xFor(tick.index)" :y="height - padding.bottom + 30" :text-anchor="tick.index === 0 ? 'start' : tick.index === points.length - 1 ? 'end' : 'middle'" fill="white" fill-opacity="0.88" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" font-weight="600">{{ tick.label }}</text>
        <text :x="padding.left - 72" :y="padding.top + plotHeight / 2 + 5" text-anchor="middle" fill="white" fill-opacity="0.82" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="15" font-weight="600">%</text>
      </svg>

      <div class="mt-3 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[9px] uppercase tracking-[0.14em] text-white/60">
        <span class="inline-flex items-center gap-2"><i class="h-0.5 w-4 bg-white/90"></i>{{ label('Average change', 'Среднее изменение') }}</span>
      </div>
    </div>
    <div v-if="points.length" class="mt-10">
      <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ label('Details', 'Подробности') }}</div>
      <div class="mt-2 font-serif text-sm text-white/70 sm:text-base">
        {{ label('The average growth rate for the period was', 'Средний темп роста за период составил') }} {{ formatted(averageRate) }}%.
      </div>
    </div>
    <div v-else class="mt-8 font-serif text-base text-white/55">{{ label('No trade data available.', 'Нет данных по сделкам.') }}</div>
  </section>
</template>
