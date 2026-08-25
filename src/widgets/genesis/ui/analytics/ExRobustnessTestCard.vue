<script setup lang="ts">
import { computed } from 'vue'
import type { RobustnessChartSpec, RobustnessStatus, RobustnessTestCard } from '../../model/robustnessTests'
import { useI18n } from '~/shared/i18n/useI18n'

const props = defineProps<{
  test: RobustnessTestCard
}>()

const { locale } = useI18n()
const isRu = computed(() => locale.value === 'ru')
const chart = computed<RobustnessChartSpec | null>(() => props.test.chart)
const width = 520
const height = 190
const padding = { top: 12, right: 12, bottom: 24, left: 12 }
const plotWidth = width - padding.left - padding.right
const plotHeight = height - padding.top - padding.bottom

const label = (value: { en: string; ru: string }) => isRu.value ? value.ru : value.en

const numericValues = computed(() => {
  const current = chart.value
  if (!current) return []
  return [
    ...current.series.flatMap(series => series.values),
    ...(current.lowerBand || []),
    ...(current.upperBand || []),
    ...(current.zeroLine === undefined ? [] : [current.zeroLine])
  ].filter(Number.isFinite)
})

const chartMin = computed(() => {
  const values = numericValues.value
  if (!values.length) return -1
  const min = Math.min(...values)
  const max = Math.max(...values)
  const paddingValue = Math.max((max - min) * 0.12, 0.5)
  return min - paddingValue
})

const chartMax = computed(() => {
  const values = numericValues.value
  if (!values.length) return 1
  const min = Math.min(...values)
  const max = Math.max(...values)
  const paddingValue = Math.max((max - min) * 0.12, 0.5)
  return max + paddingValue
})

const xFor = (index: number, length: number) => {
  if (length <= 1) return padding.left + plotWidth / 2
  return padding.left + (index / (length - 1)) * plotWidth
}

const yFor = (value: number) => {
  const range = Math.max(1e-9, chartMax.value - chartMin.value)
  return padding.top + (1 - (value - chartMin.value) / range) * plotHeight
}

const pathFor = (values: number[]) => values
  .map((value, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index, values.length).toFixed(2)} ${yFor(value).toFixed(2)}`)
  .join(' ')

const bandPath = computed(() => {
  const current = chart.value
  if (!current?.lowerBand?.length || !current.upperBand?.length) return ''
  const upper = current.upperBand.map((value, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index, current.upperBand!.length).toFixed(2)} ${yFor(value).toFixed(2)}`).join(' ')
  const lower = [...current.lowerBand].reverse().map((value, reverseIndex) => {
    const index = current.lowerBand!.length - reverseIndex - 1
    return `L ${xFor(index, current.lowerBand!.length).toFixed(2)} ${yFor(value).toFixed(2)}`
  }).join(' ')
  return `${upper} ${lower} Z`
})

const barWidth = computed(() => {
  const current = chart.value
  const count = current?.labels.length || 1
  const seriesCount = current?.series.length || 1
  return Math.max(2, (plotWidth / count / seriesCount) * 0.76)
})

const barX = (index: number, seriesIndex: number) => {
  const current = chart.value
  const count = current?.labels.length || 1
  const seriesCount = current?.series.length || 1
  const slotWidth = plotWidth / count
  const groupWidth = barWidth.value * seriesCount
  return padding.left + index * slotWidth + (slotWidth - groupWidth) / 2 + seriesIndex * barWidth.value
}

const barY = (value: number) => value >= 0 ? yFor(value) : yFor(0)
const barHeight = (value: number) => Math.abs(yFor(value) - yFor(0))
const zeroY = computed(() => yFor(chart.value?.zeroLine ?? 0))

const seriesColor = (index: number, dashed = false) => {
  if (dashed) return isRu.value ? '#94a3b8' : '#64748b'
  return ['#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#c084fc'][index % 5]
}

const statusLabel = (status: RobustnessStatus) => {
  const map: Record<RobustnessStatus, { en: string; ru: string }> = {
    passed: { en: 'PASSED', ru: 'УСЛОВИЕ ВЫПОЛНЕНО' },
    failed: { en: 'FAILED', ru: 'УСЛОВИЕ НЕ ВЫПОЛНЕНО' },
    inconclusive: { en: 'INCONCLUSIVE', ru: 'НЕДОСТАТОЧНО ОДНОЗНАЧНО' },
    unavailable: { en: 'NOT AVAILABLE', ru: 'НЕДОСТУПНО' },
    observed: { en: 'OBSERVATION ONLY', ru: 'ТОЛЬКО НАБЛЮДЕНИЕ' }
  }
  return label(map[status])
}

const statusClass = (status: RobustnessStatus) => ({
  passed: 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300',
  failed: 'border-rose-400/60 bg-rose-400/10 text-rose-300',
  inconclusive: 'border-amber-400/60 bg-amber-400/10 text-amber-300',
  unavailable: 'border-slate-400/40 bg-slate-400/10 text-slate-300',
  observed: 'border-sky-400/50 bg-sky-400/10 text-sky-300'
}[status])
</script>

<template>
  <article class="flex min-h-[31rem] flex-col border border-black/10 bg-black/[0.025] p-5 dark:border-white/10 dark:bg-white/[0.025]">
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="mb-2 text-[10px] font-black uppercase tracking-[0.22em]">{{ label(test.title) }}</div>
        <p class="max-w-xl text-[10px] normal-case leading-relaxed tracking-normal opacity-55">{{ label(test.question) }}</p>
      </div>
      <span class="shrink-0 border px-2 py-1 text-[8px] font-black uppercase tracking-widest" :class="statusClass(test.status)">
        {{ statusLabel(test.status) }}
      </span>
    </div>

    <div v-if="chart" class="mt-5 border border-black/10 bg-black/[0.035] p-2 dark:border-white/10 dark:bg-black/20">
      <svg :viewBox="`0 0 ${width} ${height}`" class="h-44 w-full overflow-visible" role="img" :aria-label="label(test.title)">
        <line v-if="chart.zeroLine !== undefined" :x1="padding.left" :x2="width - padding.right" :y1="zeroY" :y2="zeroY" stroke="currentColor" stroke-opacity="0.28" stroke-dasharray="3 4" />
        <path v-if="chart.kind === 'fan' && bandPath" :d="bandPath" fill="#38bdf8" fill-opacity="0.10" stroke="none" />

        <template v-if="chart.kind === 'bars'">
          <template v-for="(series, seriesIndex) in chart.series" :key="label(series.label)">
            <rect v-for="(value, index) in series.values" :key="`${seriesIndex}-${index}`"
              :x="barX(index, seriesIndex)" :y="barY(value)" :width="barWidth" :height="barHeight(value)"
              :fill="seriesColor(seriesIndex, series.dashed)" fill-opacity="0.82" />
          </template>
          <text v-for="(tick, index) in chart.labels" :key="`tick-${index}`" :x="barX(index, 0) + barWidth / 2" :y="height - 5" text-anchor="middle" fill="currentColor" fill-opacity="0.45" font-size="8">{{ tick }}</text>
        </template>

        <template v-else>
          <path v-for="(series, index) in chart.series" :key="label(series.label)" :d="pathFor(series.values)" fill="none" :stroke="seriesColor(index, series.dashed)" :stroke-width="series.dashed ? 0.8 : 1.8" :stroke-dasharray="series.dashed ? '3 3' : undefined" stroke-linecap="round" stroke-linejoin="round" />
        </template>
      </svg>
      <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[8px] uppercase tracking-widest opacity-45">
        <span v-for="(series, index) in chart.series.slice(0, 6)" :key="`legend-${label(series.label)}`" class="inline-flex items-center gap-1.5">
          <i class="h-1.5 w-1.5 rounded-full" :style="{ backgroundColor: seriesColor(index, series.dashed) }"></i>
          {{ label(series.label) }}
        </span>
      </div>
    </div>

    <div class="mt-5 grid grid-cols-2 gap-x-5 gap-y-2 border-y border-black/10 py-3 text-[9px] dark:border-white/10">
      <div v-for="row in test.rows" :key="label(row.label)" class="flex min-w-0 items-baseline justify-between gap-2">
        <span class="truncate opacity-45">{{ label(row.label) }}</span>
        <span class="shrink-0 font-bold">{{ row.value }}</span>
      </div>
    </div>

    <div class="mt-auto pt-4 text-[9px] normal-case leading-relaxed tracking-normal">
      <div class="mb-1 uppercase tracking-widest opacity-40">{{ isRu ? 'Условие' : 'Criterion' }}</div>
      <p class="opacity-70">{{ label(test.criterion) }}</p>
      <p class="mt-2 opacity-55">{{ label(test.result) }}</p>
      <p v-if="test.note" class="mt-2 opacity-40">{{ label(test.note) }}</p>
    </div>
  </article>
</template>

