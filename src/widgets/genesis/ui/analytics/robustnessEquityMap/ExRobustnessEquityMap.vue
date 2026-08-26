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
const hoveredIndex = ref<number | null>(null)

const width = 1000
const height = 460
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
  x: Math.max(padding.left, Math.min(width - padding.right, xFor(startIndex))),
  width: Math.max(4, Math.min(width - padding.right, xFor(endIndex)) - Math.max(padding.left, Math.min(width - padding.right, xFor(startIndex))))
})

const formatted = (value: number) => Number.isFinite(value) ? value.toFixed(2) : '—'
const label = (en: string, ru: string) => isRu.value ? ru : en

const pointerIndex = (event: MouseEvent) => {
  if (!points.value.length) return null
  const svg = event.currentTarget as SVGSVGElement
  const screenMatrix = svg.getScreenCTM()
  let localX: number
  let localY: number

  if (screenMatrix) {
    const svgPoint = svg.createSVGPoint()
    svgPoint.x = event.clientX
    svgPoint.y = event.clientY
    const localPoint = svgPoint.matrixTransform(screenMatrix.inverse())
    localX = localPoint.x
    localY = localPoint.y
  } else {
    const rect = svg.getBoundingClientRect()
    localX = ((event.clientX - rect.left) / rect.width) * width
    localY = ((event.clientY - rect.top) / rect.height) * height
  }

  const nearest = points.value.reduce<{ index: number; distance: number } | null>((candidate, point, index) => {
    const dx = xFor(index) - localX
    const dy = yFor(point.equity) - localY
    const distance = (dx * dx) + (dy * dy)
    return !candidate || distance < candidate.distance ? { index, distance } : candidate
  }, null)

  return nearest?.index ?? null
}

const handlePointerMove = (event: MouseEvent) => {
  hoveredIndex.value = pointerIndex(event)
}
</script>

<template>
  <div class="relative mt-0 w-full overflow-hidden bg-black text-white">
      <svg :viewBox="`0 0 ${width} ${height}`" class="h-[28rem] w-full" role="img" :aria-label="label('Observed equity curve', 'Наблюдаемая equity curve')" @mousemove="handlePointerMove" @mouseleave="hoveredIndex = null">
        <defs>
          <clipPath id="equity-plot-clip">
            <rect :x="padding.left" :y="padding.top" :width="plotWidth" :height="plotHeight" />
          </clipPath>
        </defs>

        <g clip-path="url(#equity-plot-clip)">
          <rect v-for="zone in model.drawdowns" :key="zone.id" :x="zoneStyle(zone.startIndex, zone.endIndex).x" :y="padding.top" :width="zoneStyle(zone.startIndex, zone.endIndex).width" :height="plotHeight" fill="#fb7185" fill-opacity="0.11" />
        </g>

        <line :x1="padding.left" :x2="padding.left" :y1="padding.top" :y2="height - padding.bottom" stroke="white" stroke-opacity="0.5" />
        <line :x1="padding.left" :x2="width - padding.right" :y1="height - padding.bottom" :y2="height - padding.bottom" stroke="white" stroke-opacity="0.5" />
        <line :x1="padding.left - 4" :x2="padding.left + 4" :y1="padding.top" :y2="padding.top" stroke="white" stroke-opacity="0.5" />
        <line :x1="padding.left - 4" :x2="padding.left + 4" :y1="height - padding.bottom" :y2="height - padding.bottom" stroke="white" stroke-opacity="0.5" />
        <line :x1="padding.left" :x2="padding.left" :y1="height - padding.bottom - 4" :y2="height - padding.bottom + 4" stroke="white" stroke-opacity="0.5" />
        <line :x1="width - padding.right" :x2="width - padding.right" :y1="height - padding.bottom - 4" :y2="height - padding.bottom + 4" stroke="white" stroke-opacity="0.5" />

        <line :x1="padding.left" :x2="width - padding.right" :y1="zeroY" :y2="zeroY" stroke="white" stroke-opacity="0.28" stroke-dasharray="3 5" />
        <path v-if="highWaterPath" :d="highWaterPath" fill="none" stroke="#94a3b8" stroke-opacity="0.42" stroke-width="1" stroke-dasharray="4 5" />
        <path v-if="linePath" :d="linePath" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />

        <g v-if="hoveredIndex !== null && points[hoveredIndex]">
          <line :x1="xFor(hoveredIndex)" :x2="xFor(hoveredIndex)" :y1="padding.top" :y2="height - padding.bottom" stroke="white" stroke-opacity="0.45" stroke-dasharray="2 3" />
          <circle :cx="xFor(hoveredIndex)" :cy="yFor(points[hoveredIndex].equity)" r="6" fill="white" stroke="black" stroke-width="2" />
        </g>

        <text :x="padding.left" :y="height - 7" fill="white" fill-opacity="0.45" font-size="9">1</text>
        <text :x="width - padding.right" :y="height - 7" text-anchor="end" fill="white" fill-opacity="0.45" font-size="9">{{ points.length }}</text>
        <text :x="width / 2" :y="height - 5" text-anchor="middle" fill="white" fill-opacity="0.45" font-size="9">X</text>
        <text :x="padding.left - 8" :y="padding.top + 4" text-anchor="end" fill="white" fill-opacity="0.45" font-size="9">{{ formatted(maxValue) }}</text>
        <text :x="padding.left - 8" :y="height - padding.bottom" text-anchor="end" fill="white" fill-opacity="0.45" font-size="9">{{ formatted(minValue) }}</text>
        <text :x="padding.left - 26" :y="padding.top - 8" fill="white" fill-opacity="0.45" font-size="9">Y</text>
      </svg>

    </div>
</template>
