<script setup lang="ts">
import { computed, ref } from 'vue'
import { buildEquityStabilityMap, type EquityStabilityMapModel } from './equityStabilityMap'
import { useI18n } from '~/shared/i18n/useI18n'

const props = defineProps<{
  trades: Record<string, any>[]
  getTradePnl: (trade: Record<string, any>) => number
}>()

const { locale } = useI18n()
const isRu = computed(() => locale.value === 'ru')
const model = computed<EquityStabilityMapModel>(() => buildEquityStabilityMap(props.trades, props.getTradePnl))
const showPeriods = ref(true)
const showDrawdowns = ref(true)
const showExtremes = ref(true)
const hoveredIndex = ref<number | null>(null)

const width = 1000
const height = 360
const padding = { top: 22, right: 24, bottom: 36, left: 46 }
const plotWidth = width - padding.left - padding.right
const plotHeight = height - padding.top - padding.bottom

const points = computed(() => model.value.points)
const values = computed(() => points.value.flatMap(point => [point.equity, point.highWater, 0]))
const minValue = computed(() => {
  if (!values.value.length) return -1
  const min = Math.min(...values.value)
  const max = Math.max(...values.value)
  return min - Math.max((max - min) * 0.08, 1)
})
const maxValue = computed(() => {
  if (!values.value.length) return 1
  const min = Math.min(...values.value)
  const max = Math.max(...values.value)
  return max + Math.max((max - min) * 0.08, 1)
})

const xFor = (index: number) => points.value.length <= 1
  ? padding.left + plotWidth / 2
  : padding.left + (index / (points.value.length - 1)) * plotWidth

const yFor = (value: number) => padding.top + (1 - (value - minValue.value) / Math.max(1e-9, maxValue.value - minValue.value)) * plotHeight
const linePath = computed(() => points.value.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index).toFixed(2)} ${yFor(point.equity).toFixed(2)}`).join(' '))
const highWaterPath = computed(() => points.value.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index).toFixed(2)} ${yFor(point.highWater).toFixed(2)}`).join(' '))
const zeroY = computed(() => yFor(0))

const zoneStyle = (startIndex: number, endIndex: number) => ({
  x: xFor(startIndex),
  width: Math.max(3, xFor(endIndex) - xFor(startIndex) + (points.value.length > 1 ? plotWidth / (points.value.length - 1) : 0))
})

const tooltipStyle = computed(() => {
  const index = hoveredIndex.value
  if (index === null || !points.value[index]) return { display: 'none' }
  const point = points.value[index]
  return {
    left: `${(xFor(index) / width) * 100}%`,
    top: `${(Math.max(padding.top, yFor(point.equity)) / height) * 100}%`
  }
})

const formatted = (value: number) => Number.isFinite(value) ? value.toFixed(2) : '—'
const dateLabel = (timestamp: number) => Number.isFinite(timestamp)
  ? new Date(timestamp).toLocaleDateString(isRu.value ? 'ru-RU' : 'en-GB')
  : '—'
const label = (en: string, ru: string) => isRu.value ? ru : en

const pointerIndex = (event: MouseEvent) => {
  if (!points.value.length) return null
  const svg = event.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const localX = ((event.clientX - rect.left) / rect.width) * width
  const normalized = (localX - padding.left) / plotWidth
  return Math.max(0, Math.min(points.value.length - 1, Math.round(normalized * Math.max(0, points.value.length - 1))))
}

const handlePointerMove = (event: MouseEvent) => {
  hoveredIndex.value = pointerIndex(event)
}
</script>

<template>
  <section class="border border-black/10 bg-black/[0.025] p-5 dark:border-white/10 dark:bg-white/[0.025]">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div class="text-[10px] font-black uppercase tracking-[0.22em]">
          {{ label('Equity Stability Map', 'Карта устойчивости equity') }}
        </div>
        <p class="mt-2 max-w-2xl text-[10px] normal-case leading-relaxed tracking-normal opacity-55">
          {{ label('The line is the observed cumulative PnL. Layers mark periods, drawdown spans and extreme trades used by separate tests.', 'Линия показывает наблюдаемый накопленный PnL. Слои отмечают периоды, просадки и крайние сделки, используемые отдельными тестами.') }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2 text-[8px] uppercase tracking-widest">
        <button class="border px-2 py-1 transition-colors" :class="showPeriods ? 'border-sky-400/70 bg-sky-400/10 text-sky-300' : 'border-black/10 opacity-45 dark:border-white/10'" @click="showPeriods = !showPeriods">
          {{ label('Periods', 'Периоды') }}
        </button>
        <button class="border px-2 py-1 transition-colors" :class="showDrawdowns ? 'border-rose-400/70 bg-rose-400/10 text-rose-300' : 'border-black/10 opacity-45 dark:border-white/10'" @click="showDrawdowns = !showDrawdowns">
          {{ label('Drawdowns', 'Просадки') }}
        </button>
        <button class="border px-2 py-1 transition-colors" :class="showExtremes ? 'border-amber-400/70 bg-amber-400/10 text-amber-300' : 'border-black/10 opacity-45 dark:border-white/10'" @click="showExtremes = !showExtremes">
          {{ label('Extreme trades', 'Крайние сделки') }}
        </button>
      </div>
    </div>

    <div class="relative mt-5 overflow-hidden border border-white/10 bg-black p-2 text-white">
      <svg :viewBox="`0 0 ${width} ${height}`" class="h-[18rem] w-full" role="img" :aria-label="label('Observed equity curve', 'Наблюдаемая equity curve')" @mousemove="handlePointerMove" @mouseleave="hoveredIndex = null">
        <template v-if="showPeriods">
          <rect v-for="(zone, index) in model.periods" :key="zone.id" :x="zoneStyle(zone.startIndex, zone.endIndex).x" :y="padding.top" :width="zoneStyle(zone.startIndex, zone.endIndex).width" :height="plotHeight" :fill="index % 2 === 0 ? '#38bdf8' : '#818cf8'" fill-opacity="0.06" />
          <line v-for="zone in model.periods.slice(1)" :key="`${zone.id}-boundary`" :x1="xFor(zone.startIndex)" :x2="xFor(zone.startIndex)" :y1="padding.top" :y2="height - padding.bottom" stroke="#38bdf8" stroke-opacity="0.28" stroke-dasharray="4 5" />
        </template>

        <template v-if="showDrawdowns">
          <rect v-for="zone in model.drawdowns" :key="zone.id" :x="zoneStyle(zone.startIndex, zone.endIndex).x" :y="padding.top" :width="zoneStyle(zone.startIndex, zone.endIndex).width" :height="plotHeight" fill="#fb7185" fill-opacity="0.11" />
        </template>

        <line :x1="padding.left" :x2="width - padding.right" :y1="zeroY" :y2="zeroY" stroke="white" stroke-opacity="0.28" stroke-dasharray="3 5" />
        <path v-if="highWaterPath" :d="highWaterPath" fill="none" stroke="#94a3b8" stroke-opacity="0.42" stroke-width="1" stroke-dasharray="4 5" />
        <path v-if="linePath" :d="linePath" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />

        <template v-if="showExtremes">
          <circle v-for="marker in model.extremes" :key="marker.id" :cx="xFor(marker.index)" :cy="yFor(points[marker.index]?.equity ?? 0)" r="4" :fill="marker.kind === 'top' ? '#fbbf24' : '#fb7185'" stroke="black" stroke-width="1.5" />
        </template>

        <g v-if="hoveredIndex !== null && points[hoveredIndex]">
          <line :x1="xFor(hoveredIndex)" :x2="xFor(hoveredIndex)" :y1="padding.top" :y2="height - padding.bottom" stroke="white" stroke-opacity="0.45" stroke-dasharray="2 3" />
          <circle :cx="xFor(hoveredIndex)" :cy="yFor(points[hoveredIndex].equity)" r="4" fill="white" stroke="black" stroke-width="1.5" />
        </g>

        <text :x="padding.left" :y="height - 7" fill="white" fill-opacity="0.45" font-size="9">1</text>
        <text :x="width - padding.right" :y="height - 7" text-anchor="end" fill="white" fill-opacity="0.45" font-size="9">{{ points.length }}</text>
        <text :x="padding.left - 8" :y="padding.top + 4" text-anchor="end" fill="white" fill-opacity="0.45" font-size="9">{{ formatted(maxValue) }}</text>
        <text :x="padding.left - 8" :y="height - padding.bottom" text-anchor="end" fill="white" fill-opacity="0.45" font-size="9">{{ formatted(minValue) }}</text>
      </svg>

      <div v-if="hoveredIndex !== null && points[hoveredIndex]" class="pointer-events-none absolute z-10 w-44 border border-white/20 bg-black/95 p-3 text-[9px] leading-relaxed shadow-xl" :style="tooltipStyle">
        <div class="mb-1 font-black uppercase tracking-widest">{{ label('Trade', 'Сделка') }} #{{ points[hoveredIndex].index + 1 }}</div>
        <div>{{ label('Date', 'Дата') }}: {{ dateLabel(points[hoveredIndex].timestamp) }}</div>
        <div>{{ label('PnL', 'PnL') }}: {{ formatted(points[hoveredIndex].pnl) }}</div>
        <div>{{ label('Equity', 'Equity') }}: {{ formatted(points[hoveredIndex].equity) }}</div>
        <div>{{ label('Drawdown', 'Просадка') }}: {{ formatted(points[hoveredIndex].drawdown) }}</div>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[8px] uppercase tracking-widest opacity-55">
      <span class="inline-flex items-center gap-1.5"><i class="h-1.5 w-4 bg-white"></i>{{ label('Observed equity', 'Наблюдаемая equity') }}</span>
      <span class="inline-flex items-center gap-1.5"><i class="h-1.5 w-4 border-t border-dashed border-slate-400"></i>{{ label('High-water mark', 'High-water mark') }}</span>
      <span class="inline-flex items-center gap-1.5"><i class="h-2 w-2 bg-sky-400/60"></i>{{ label('Period split', 'Разбиение по периодам') }}</span>
      <span class="inline-flex items-center gap-1.5"><i class="h-2 w-2 bg-rose-400/70"></i>{{ label('Drawdown span', 'Зона просадки') }}</span>
      <span class="inline-flex items-center gap-1.5"><i class="h-2 w-2 rounded-full bg-amber-400"></i>/<i class="h-2 w-2 rounded-full bg-rose-400"></i>{{ label('Top / bottom extremes', 'Верхние / нижние крайние сделки') }}</span>
    </div>

    <div class="mt-4 flex justify-between border-t border-black/10 pt-3 text-[9px] uppercase tracking-widest opacity-45 dark:border-white/10">
      <span>{{ label('Trades', 'Сделки') }}: {{ points.length }}</span>
      <span>{{ label('Drawdown spans', 'Зоны просадки') }}: {{ model.drawdowns.length }}</span>
      <span>{{ label('Extreme markers', 'Крайние маркеры') }}: {{ model.extremes.length }}</span>
    </div>
  </section>
</template>

