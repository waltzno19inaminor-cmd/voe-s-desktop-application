<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import { buildCapitalAssetPerformance, buildCapitalSidePerformance, buildCapitalGrowthRate, type CapitalAssetPerformance } from '../analytics/capitalGrowthRate'

const props = defineProps<{
  trades: Record<string, any>[]
  getTradePnl: (trade: Record<string, any>) => number
  initialCapital?: number
}>()

const { locale } = useI18n()
const isRu = computed(() => locale.value === 'ru')
const label = (en: string, ru: string) => isRu.value ? ru : en
const model = computed(() => buildCapitalGrowthRate(props.trades, props.getTradePnl, props.initialCapital || 1000))
const sidePerformance = computed(() => buildCapitalSidePerformance(props.trades, props.getTradePnl, props.initialCapital || 1000))
const assetPerformance = computed(() => buildCapitalAssetPerformance(props.trades, props.getTradePnl, props.initialCapital || 1000))

const formatted = (value: number) => Number.isFinite(value) ? value.toFixed(2) : '—'
const formattedFrequency = (value: number) => Number.isFinite(value) ? `${value.toFixed(1)}%` : '—'
const formattedSignedPercent = (value: number) => Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value.toFixed(2)}%` : '—'
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
const hoveredIndex = ref<number | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })
const hoveredPoint = computed(() => hoveredIndex.value === null ? null : points.value[hoveredIndex.value] ?? null)
const averageRate = computed(() => points.value.length
  ? points.value.reduce((sum, point) => sum + point.tradeRatePct, 0) / points.value.length
  : 0)
const maxGrowthRate = computed(() => points.value.length ? Math.max(...points.value.map(point => point.tradeRatePct)) : 0)
const minGrowthRate = computed(() => points.value.length ? Math.min(...points.value.map(point => point.tradeRatePct)) : 0)
const startingCapital = computed(() => Number.isFinite(props.initialCapital) && Math.abs(props.initialCapital as number) > 1e-9
  ? Math.abs(props.initialCapital as number)
  : 1000)
const totalCapitalGrowth = computed(() => {
  const lastPoint = points.value[points.value.length - 1]
  return lastPoint
    ? ((lastPoint.equity - startingCapital.value) / startingCapital.value) * 100
    : 0
})
const pnlValues = computed(() => props.trades
  .map(trade => Number(props.getTradePnl(trade)))
  .filter(value => Number.isFinite(value)))
const profitLossChartWidth = 1000
const profitLossChartHeight = 300
const profitLossPadding = { top: 44, right: 96, bottom: 28, left: 12 }
const profitLossPlotWidth = profitLossChartWidth - profitLossPadding.left - profitLossPadding.right
const profitLossPlotHeight = profitLossChartHeight - profitLossPadding.top - profitLossPadding.bottom
const grossProfit = computed(() => pnlValues.value.reduce((sum, pnl) => sum + (pnl > 0 ? pnl : 0), 0))
const grossLoss = computed(() => pnlValues.value.reduce((sum, pnl) => sum + (pnl < 0 ? pnl : 0), 0))
const netProfit = computed(() => pnlValues.value.reduce((sum, pnl) => sum + pnl, 0))
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
const profitLossLabelX = (value: number, text: string) => {
  const estimatedLabelWidth = text.length * 9
  const minimumCenter = profitLossBaselineX.value + 16 + estimatedLabelWidth / 2
  const barCenter = (profitLossBaselineX.value + profitLossXFor(value)) / 2
  return Math.max(minimumCenter, barCenter)
}
const moneyFormatted = (value: number) => {
  if (!Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}$${Math.abs(value).toFixed(2)}`
}

const assetHeatmapWidth = 1000
const assetHeatmapHeight = 360
const assetHeatmapTooltip = ref<CapitalAssetPerformance | null>(null)
const assetHeatmapTooltipPosition = ref({ x: 0, y: 0 })
type AssetHeatmapArea = {
  asset: CapitalAssetPerformance
  x: number
  y: number
  width: number
  height: number
}
type AssetHeatmapBlock = AssetHeatmapArea & {
  fill: string
  textColor: string
  resultStr: string
  tickerFontSize: number
  resultFontSize: number
}
const splitAssetHeatmap = (
  assets: CapitalAssetPerformance[],
  x: number,
  y: number,
  width: number,
  height: number
): AssetHeatmapArea[] => {
  if (!assets.length) return []
  if (assets.length === 1) return [{ asset: assets[0]!, x, y, width, height }]

  const totalWeight = assets.reduce((sum, asset) => sum + asset.trades, 0)
  const targetWeight = totalWeight / 2
  let accumulatedWeight = 0
  let splitIndex = 1

  for (let index = 0; index < assets.length - 1; index += 1) {
    const nextWeight = accumulatedWeight + assets[index]!.trades
    if (Math.abs(nextWeight - targetWeight) < Math.abs(accumulatedWeight - targetWeight)) {
      accumulatedWeight = nextWeight
      splitIndex = index + 1
    } else {
      break
    }
  }

  const left = assets.slice(0, splitIndex)
  const right = assets.slice(splitIndex)
  const leftWeight = left.reduce((sum, asset) => sum + asset.trades, 0)
  const ratio = leftWeight / totalWeight

  if (width >= height) {
    const leftWidth = width * ratio
    return [
      ...splitAssetHeatmap(left, x, y, leftWidth, height),
      ...splitAssetHeatmap(right, x + leftWidth, y, width - leftWidth, height)
    ]
  }

  const topHeight = height * ratio
  return [
    ...splitAssetHeatmap(left, x, y, width, topHeight),
    ...splitAssetHeatmap(right, x, y + topHeight, width, height - topHeight)
  ]
}
const topAssetPerformance = computed(() => assetPerformance.value.slice(0, 10))
const topAssetPnlMin = computed(() => Math.min(0, ...topAssetPerformance.value.map(asset => asset.pnl)))
const topAssetPnlMax = computed(() => Math.max(0, ...topAssetPerformance.value.map(asset => asset.pnl)))

const bestAssetId = computed(() => {
  if (assetPerformance.value.length < 2) return null
  const best = assetPerformance.value.reduce((current, item) =>
    item.pnl > current.pnl || (item.pnl === current.pnl && (item.winRate ?? 0) > (current.winRate ?? 0))
      ? item
      : current
  )
  return best.id
})
const worstAssetId = computed(() => {
  if (assetPerformance.value.length < 2) return null
  const worst = assetPerformance.value.reduce((current, item) =>
    item.pnl < current.pnl || (item.pnl === current.pnl && (item.winRate ?? 100) < (current.winRate ?? 100))
      ? item
      : current
  )
  return worst.id
})

const assetRowClass = (asset: CapitalAssetPerformance) => {
  if (asset.id === bestAssetId.value) return 'bg-white/[0.14] hover:bg-white/[0.18] border-white/20'
  if (asset.id === worstAssetId.value) return 'bg-white/[0.04] hover:bg-white/[0.07] border-white/5 opacity-75'
  return 'hover:bg-white/[0.04] border-white/5 bg-white/[0.02]'
}

const assetHeatmapColor = (pnl: number) => {
  const range = Math.max(topAssetPnlMax.value - topAssetPnlMin.value, 1e-9)
  const ratio = (pnl - topAssetPnlMin.value) / range
  const channel = Math.round(52 + ratio * 200)
  return `rgb(${channel} ${channel} ${channel})`
}
const assetHeatmapTextColor = (pnl: number) => {
  const range = Math.max(topAssetPnlMax.value - topAssetPnlMin.value, 1e-9)
  return (pnl - topAssetPnlMin.value) / range > 0.62 ? '#111111' : '#FFFFFF'
}
const heatmapContainerRef = ref<HTMLElement | null>(null)
const heatmapRealWidth = ref(960)
const heatmapRealHeight = ref(352)

let heatmapResizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (heatmapContainerRef.value && typeof ResizeObserver !== 'undefined') {
    heatmapResizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect) {
          const { width, height } = entry.contentRect
          if (width > 0) heatmapRealWidth.value = Math.round(width)
          if (height > 0) heatmapRealHeight.value = Math.round(height)
        }
      }
    })
    heatmapResizeObserver.observe(heatmapContainerRef.value)
  }
})

onUnmounted(() => {
  if (heatmapResizeObserver) {
    heatmapResizeObserver.disconnect()
    heatmapResizeObserver = null
  }
})

const computeHeatmapBlock = (area: AssetHeatmapArea): AssetHeatmapBlock => {
  const fill = assetHeatmapColor(area.asset.pnl)
  const textColor = assetHeatmapTextColor(area.asset.pnl)
  const nameLen = Math.max(1, area.asset.asset.length)
  const resultStr = `${moneyFormatted(area.asset.pnl)} · ${formattedFrequency(area.asset.frequency)}`
  const resultLen = Math.max(1, resultStr.length)

  // Real rendered pixel dimensions of this tile inside the container
  const tilePixelW = (area.width / assetHeatmapWidth) * heatmapRealWidth.value
  const tilePixelH = (area.height / assetHeatmapHeight) * heatmapRealHeight.value

  const availW = Math.max(4, tilePixelW - 6)
  const availH = Math.max(4, tilePixelH - 4)

  // Maximum font size permitted by width
  const maxTickerByW = availW / (nameLen * 0.60)
  const maxResultByW = availW / (resultLen * 0.60)

  // Smooth geometric scaling based on the block's physical pixel area
  const areaScale = Math.sqrt(tilePixelW * tilePixelH)
  const targetTicker = Math.min(18, Math.max(5.5, areaScale * 0.11))
  const targetResult = Math.min(12, Math.max(4.2, targetTicker * 0.72))

  let tickerFontSize = Math.min(targetTicker, maxTickerByW)
  let resultFontSize = Math.min(targetResult, maxResultByW)

  if (resultFontSize > tickerFontSize * 0.85) {
    resultFontSize = tickerFontSize * 0.85
  }

  // Maximum font size permitted by height
  const totalHNeeded = tickerFontSize * 1.15 + resultFontSize * 1.15 + 2
  if (totalHNeeded > availH) {
    const hScale = Math.max(0.2, (availH - 2) / (tickerFontSize * 1.15 + resultFontSize * 1.15))
    tickerFontSize *= hScale
    resultFontSize *= hScale
  }

  tickerFontSize = Math.max(5, Math.round(tickerFontSize * 10) / 10)
  resultFontSize = Math.max(3.8, Math.round(resultFontSize * 10) / 10)

  return {
    ...area,
    fill,
    textColor,
    resultStr,
    tickerFontSize,
    resultFontSize
  }
}
const assetHeatmapBlocks = computed<AssetHeatmapBlock[]>(() => splitAssetHeatmap(
  topAssetPerformance.value,
  0,
  0,
  assetHeatmapWidth,
  assetHeatmapHeight
).map(computeHeatmapBlock))
const handleAssetHeatmapHover = (event: MouseEvent, asset: CapitalAssetPerformance) => {
  assetHeatmapTooltip.value = asset
  assetHeatmapTooltipPosition.value = { x: event.clientX, y: event.clientY }
}
const clearAssetHeatmapHover = () => {
  assetHeatmapTooltip.value = null
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

  for (let value = first; value <= max + step * 0.001; value += step) ticks.push(Number(value.toFixed(8)))
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

const chartPointFromEvent = (event: MouseEvent) => {
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
  return { x: ((event.clientX - rect.left) / rect.width) * width, y: ((event.clientY - rect.top) / rect.height) * height }
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
    <div>
      <div class="font-serif text-[13px] uppercase tracking-[0.2em] text-white/75">{{ label('I · Capital change by trade', 'I · Изменение капитала по сделкам') }}</div>
      <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ label('Percentage change after each trade and the average change across the last 10 trades.', 'Процентное изменение после каждой сделки и среднее изменение за последние 10 сделок.') }}</div>
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
          <div class="flex min-w-[190px] items-center justify-between gap-5"><span class="font-semibold text-white/85">{{ label('Change', 'Изменение') }}</span><span class="font-bold text-white">{{ formatted(hoveredPoint.tradeRatePct) }}%</span></div>
          <div class="mt-1 flex min-w-[190px] items-center justify-between gap-5"><span class="font-semibold text-white/85">{{ label('Average', 'Среднее') }}</span><span class="font-bold text-white">{{ formatted(hoveredPoint.rollingRatePct) }}%</span></div>
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
    <div v-if="pnlValues.length" class="mt-8">
      <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ label('II · Profit structure', 'II · Структура прибыли') }}</div>
      <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ label('Realized gross profit, gross loss and net profit.', 'Валовая прибыль, валовой убыток и чистая прибыль.') }}</div>
      <div class="mt-5 bg-white/[0.025] p-3 sm:p-5">
        <svg :viewBox="`0 0 ${profitLossChartWidth} ${profitLossChartHeight}`" class="h-[18rem] w-full" role="img" :aria-label="label('Gross profit, gross loss and net profit', 'Валовая прибыль, валовой убыток и чистая прибыль')">
          <line :x1="profitLossBaselineX" :x2="profitLossBaselineX" :y1="profitLossPadding.top - 8" :y2="profitLossChartHeight - profitLossPadding.bottom + 2" stroke="white" stroke-opacity="0.42" stroke-dasharray="4 5" />
          <g v-for="(item, index) in profitLossItems" :key="item.key">
            <line :x1="profitLossBaselineX" :x2="profitLossChartWidth - profitLossPadding.right" :y1="profitLossYFor(index) + profitLossBarHeight / 2" :y2="profitLossYFor(index) + profitLossBarHeight / 2" stroke="white" stroke-opacity="0.06" />
            <text :x="profitLossBaselineX" :y="profitLossYFor(index) - 8" text-anchor="start" fill="white" fill-opacity="0.82" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="15" font-weight="600">{{ item.label }}</text>
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
    <div v-if="assetHeatmapBlocks.length" class="mt-12">
      <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ label('IV · Heatmap of the 10 most frequent assets', 'IV · Тепловая карта 10 наиболее частых активов') }}</div>
      <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ label('The map shows the 10 assets used most often in trades; tile size shows frequency, while grayscale shows the relative net result.', 'Карта показывает 10 активов, которые чаще всего использовались в сделках: размер плитки — частоту, оттенок серого — относительный чистый результат.') }}</div>
      <div class="mt-5 bg-white/[0.025] p-3 sm:p-5">
        <div
          ref="heatmapContainerRef"
          class="relative h-[22rem] w-full overflow-hidden bg-black"
          role="img"
          :aria-label="label('Asset heatmap by net result', 'Тепловая карта активов по чистому результату')"
        >
          <div
            v-for="block in assetHeatmapBlocks"
            :key="block.asset.id"
            class="absolute box-border flex cursor-default select-none flex-col items-center justify-center overflow-hidden p-0.5 text-center transition-opacity hover:opacity-90"
            :style="{
              left: `${(block.x / assetHeatmapWidth) * 100}%`,
              top: `${(block.y / assetHeatmapHeight) * 100}%`,
              width: `${(block.width / assetHeatmapWidth) * 100}%`,
              height: `${(block.height / assetHeatmapHeight) * 100}%`,
              backgroundColor: block.fill,
              color: block.textColor,
              border: '1px solid #111111'
            }"
            @mouseenter="handleAssetHeatmapHover($event, block.asset)"
            @mousemove="handleAssetHeatmapHover($event, block.asset)"
            @mouseleave="clearAssetHeatmapHover"
          >
            <span
              class="block whitespace-nowrap font-mono font-bold leading-none tracking-[0.02em]"
              :style="{ fontSize: `${block.tickerFontSize}px` }"
            >
              {{ block.asset.asset }}
            </span>
            <span
              class="mt-0.5 block whitespace-nowrap font-mono font-medium opacity-90 leading-none tracking-tight"
              :style="{ fontSize: `${block.resultFontSize}px` }"
            >
              {{ block.resultStr }}
            </span>
          </div>
        </div>
      </div>
      <div class="mt-8">
        <div class="grid grid-cols-12 items-center gap-2 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/50 border-b border-white/10">
          <div class="col-span-3">{{ label('Asset', 'Актив') }}</div>
          <div class="col-span-3">{{ label('Trades', 'Сделки') }}</div>
          <div class="col-span-2 text-right">{{ label('Result', 'Результат') }}</div>
          <div class="col-span-2 text-right">{{ label('Win Rate', 'Win Rate') }}</div>
          <div class="col-span-2 text-right">{{ label('Return', 'Доходность') }}</div>
        </div>

        <div class="mt-1 space-y-1">
          <div
            v-for="asset in assetPerformance"
            :key="asset.id"
            class="grid grid-cols-12 items-center gap-2 border px-4 py-2.5 font-mono text-xs transition-colors"
            :class="assetRowClass(asset)"
          >
            <div
              class="col-span-3 font-bold tracking-wide"
              :class="asset.id === bestAssetId ? 'text-white' : asset.id === worstAssetId ? 'text-white/60' : 'text-white/90'"
            >
              {{ asset.asset }}
            </div>
            <div
              class="col-span-3"
              :class="asset.id === bestAssetId ? 'text-white/90' : asset.id === worstAssetId ? 'text-white/50' : 'text-white/70'"
            >
              {{ asset.trades }}
              <span :class="asset.id === bestAssetId ? 'text-white/65' : 'text-white/40'">
                ({{ formattedFrequency(asset.frequency) }})
              </span>
            </div>
            <div
              class="col-span-2 text-right font-semibold"
              :class="asset.id === bestAssetId ? 'text-white font-bold' : asset.id === worstAssetId ? 'text-white/60' : asset.pnl > 0 ? 'text-white' : 'text-white/65'"
            >
              {{ moneyFormatted(asset.pnl) }}
            </div>
            <div
              class="col-span-2 text-right font-medium"
              :class="asset.id === bestAssetId ? 'text-white font-bold' : asset.id === worstAssetId ? 'text-white/60' : 'text-white/85'"
            >
              {{ asset.winRate === null ? '—' : `${formatted(asset.winRate)}%` }}
            </div>
            <div
              class="col-span-2 text-right font-semibold"
              :class="asset.id === bestAssetId ? 'text-white font-bold' : asset.id === worstAssetId ? 'text-white/60' : asset.returnRate > 0 ? 'text-white' : 'text-white/65'"
            >
              {{ formattedSignedPercent(asset.returnRate) }}
            </div>
          </div>
        </div>
      </div>
      <Teleport to="body">
        <div v-if="assetHeatmapTooltip" class="pointer-events-none fixed z-[2147483647] -translate-y-full border border-white/35 bg-black/95 px-4 py-3 font-mono text-[11px] font-semibold leading-relaxed text-white shadow-[0_10px_30px_rgba(0,0,0,0.55)]" :style="{ left: `${assetHeatmapTooltipPosition.x}px`, top: `${assetHeatmapTooltipPosition.y - 14}px` }" role="tooltip">
          <div class="mb-2 border-b border-white/25 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/95">{{ assetHeatmapTooltip.asset }}</div>
          <div class="flex min-w-[190px] items-center justify-between gap-5"><span class="text-white/85">{{ label('Trades', 'Сделки') }}</span><span class="font-bold text-white">{{ assetHeatmapTooltip.trades }}</span></div>
          <div class="mt-1 flex min-w-[190px] items-center justify-between gap-5"><span class="text-white/85">{{ label('Net result', 'Чистый результат') }}</span><span class="font-bold text-white">{{ moneyFormatted(assetHeatmapTooltip.pnl) }}</span></div>
          <div class="mt-1 flex min-w-[190px] items-center justify-between gap-5"><span class="text-white/85">{{ label('Win rate', 'Win Rate') }}</span><span class="font-bold text-white">{{ assetHeatmapTooltip.winRate === null ? '—' : `${formatted(assetHeatmapTooltip.winRate)}%` }}</span></div>
        </div>
      </Teleport>
    </div>
    <div v-if="!pnlValues.length" class="mt-8 font-serif text-base text-white/55">{{ label('No trade data available.', 'Нет данных по сделкам.') }}</div>
  </section>
</template>
