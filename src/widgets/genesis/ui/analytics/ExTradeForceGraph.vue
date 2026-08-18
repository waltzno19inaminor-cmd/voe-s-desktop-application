<template>
  <div ref="heatmapRoot" class="asset-heatmap">
    <svg
      class="asset-heatmap__svg"
      :viewBox="layout.viewBox"
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      role="img"
      aria-label="Asset trading heatmap"
    >
      <g v-if="layout.blocks.length" class="asset-heatmap__blocks">
        <g
          v-for="block in layout.blocks"
          :key="block.key"
          class="asset-heatmap__block"
          :transform="`translate(${block.x} ${block.y})`"
        >
          <rect
            :width="block.width"
            :height="block.height"
            :rx="0"
            :fill="block.fill"
            stroke="#000000"
            :stroke-width="safeStrokeWidth"
            stroke-opacity="1"
            shape-rendering="crispEdges"
          />

          <template v-if="block.showText">
            <text
              class="asset-heatmap__ticker"
              :x="block.width / 2"
              :y="block.tickerTextY"
              :font-size="block.tickerFontSize"
              :fill="block.textColor"
              text-anchor="middle"
              dominant-baseline="middle"
              pointer-events="none"
            >
              <tspan
                v-for="(line, lineIndex) in block.tickerLines"
                :key="`ticker-line-${lineIndex}`"
                :x="block.width / 2"
                :dy="lineIndex === 0 ? 0 : block.tickerLineHeight"
              >
                {{ line }}
              </tspan>
            </text>

            <text
              class="asset-heatmap__result"
              :x="block.width / 2"
              :y="block.resultTextY"
              :font-size="block.resultFontSize"
              :fill="block.textColor"
              text-anchor="middle"
              dominant-baseline="middle"
              pointer-events="none"
            >
              <tspan
                v-for="(line, lineIndex) in block.resultLines"
                :key="`result-line-${lineIndex}`"
                :x="block.width / 2"
                :dy="lineIndex === 0 ? 0 : block.resultLineHeight"
              >
                {{ line }}
              </tspan>
            </text>
          </template>
        </g>
      </g>
    </svg>

    <div v-if="layout.blocks.length" class="asset-heatmap__tooltip-layer">
      <div
        v-for="block in layout.blocks"
        :key="`tooltip-${block.key}`"
        class="asset-heatmap__tooltip-trigger"
        :style="{
          position: 'absolute',
          left: `${(block.x / layout.width) * 100}%`,
          top: `${(block.y / layout.height) * 100}%`,
          width: `${(block.width / layout.width) * 100}%`,
          height: `${(block.height / layout.height) * 100}%`
        }"
        @mouseenter="handleBlockHover($event, block)"
        @mousemove="handleBlockHover($event, block)"
        @mouseleave="handleBlockLeave"
      ></div>
    </div>

    <Teleport to="body">
      <div
        v-if="hoveredBlock"
        ref="tooltipElement"
        class="asset-heatmap__cursor-tooltip"
        :style="{
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y}px`
        }"
      >
        <span>{{ hoveredBlock.ticker }}</span>
        <span>·</span>
        <span>{{ formatDollar(hoveredBlock.pnl) }}</span>
        <span>·</span>
        <span>{{ hoveredBlock.tradeCount }} TRADES</span>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getTradePnl } from '~/widgets/genesis/model/metrics'
import { aggregateTradesByAsset, getAssetHeatmapColor } from '~/widgets/genesis/model/metrics'

type Trade = Record<string, any>

type AssetAggregate = {
  key: string
  ticker: string
  tradeCount: number
  pnl: number
}

type HeatmapBlock = AssetAggregate & {
  x: number
  y: number
  width: number
  height: number
  fill: string
  textColor: string
  tickerFontSize: number
  resultFontSize: number
  tickerLines: string[]
  resultLines: string[]
  tickerTextY: number
  resultTextY: number
  tickerLineHeight: number
  resultLineHeight: number
  showText: boolean
}

const props = withDefaults(defineProps<{
  /** Preferred input for direct use. */
  trades?: Trade[]
  /** Existing parent API: trade nodes are accepted as an alias. */
  nodes?: Trade[]
  links?: unknown[]
  isDark?: boolean
  cacheKey?: string
  pnlMin?: number
  pnlMax?: number
  strokeWidth?: number
}>(), {
  trades: undefined,
  nodes: () => [],
  links: () => [],
  isDark: false,
  cacheKey: '',
  pnlMin: 0,
  pnlMax: 0,
  strokeWidth: 0.8
})

const emit = defineEmits<{
  (event: 'node-click', payload: { node: Trade, event: MouseEvent }): void
  (event: 'node-hover', node: Trade | null): void
  (event: 'ready'): void
}>()

const inputTrades = computed(() => props.trades ?? props.nodes ?? [])
const safeStrokeWidth = computed(() => Math.max(0.1, Number(props.strokeWidth) || 0.8))
const heatmapRoot = ref<HTMLDivElement | null>(null)
const containerAspectRatio = ref(1000 / 640)
const hoveredBlock = ref<HeatmapBlock | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })
const tooltipElement = ref<HTMLDivElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const getNestedValue = (trade: Trade, key: string) => trade[key] ?? trade.trade?.[key]

const resolveTicker = (trade: Trade) => {
  const value = getNestedValue(trade, 'asset') ??
    getNestedValue(trade, 'ticker') ??
    getNestedValue(trade, 'symbol') ??
    trade.label ??
    'UNKNOWN'

  const ticker = String(value)
    .split('[')[0]!
    .split('|')[0]!
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')

  return ticker || 'UNKNOWN'
}

const resolvePnl = (trade: Trade) => {
  const source = trade.trade && typeof trade.trade === 'object'
    ? { ...trade.trade, ...trade }
    : trade
  return getTradePnl(source, Number(source.initialCapital) || 1000)
}

const updateTooltipPosition = (event: MouseEvent) => {
  const gap = 14
  const padding = 8
  const tooltipWidth = tooltipElement.value?.offsetWidth || 220
  const tooltipHeight = tooltipElement.value?.offsetHeight || 28
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  const preferredX = event.clientX + gap
  const preferredY = event.clientY + gap
  const x = preferredX + tooltipWidth <= viewportWidth - padding
    ? preferredX
    : event.clientX - tooltipWidth - gap
  const y = preferredY + tooltipHeight <= viewportHeight - padding
    ? preferredY
    : event.clientY - tooltipHeight - gap

  tooltipPosition.value = {
    x: Math.max(padding, Math.min(x, viewportWidth - tooltipWidth - padding)),
    y: Math.max(padding, Math.min(y, viewportHeight - tooltipHeight - padding))
  }
}

const handleBlockHover = (event: MouseEvent, block: HeatmapBlock) => {
  hoveredBlock.value = block
  updateTooltipPosition(event)
  void nextTick(() => {
    if (hoveredBlock.value?.key === block.key) updateTooltipPosition(event)
  })
}

const handleBlockLeave = () => {
  hoveredBlock.value = null
}

const aggregateByAsset = (trades: Trade[]): AssetAggregate[] => aggregateTradesByAsset(trades, resolveTicker, resolvePnl) as AssetAggregate[]

const wrapText = (value: string, maxCharacters: number) => {
  const safeMaxCharacters = Math.max(1, maxCharacters)
  const lines: string[] = []

  for (let start = 0; start < value.length; start += safeMaxCharacters) {
    lines.push(value.slice(start, start + safeMaxCharacters))
  }

  return lines.length ? lines : ['']
}

type TreemapArea = {
  aggregate: AssetAggregate
  x: number
  y: number
  width: number
  height: number
}

/**
 * Recursively split one rectangle into adjacent rectangles.
 * The area of every asset block is proportional to its trade count and there
 * are no gaps, so the result remains one solid heatmap parallelepiped.
 */
const splitTreemap = (
  aggregates: AssetAggregate[],
  x: number,
  y: number,
  width: number,
  height: number
): TreemapArea[] => {
  if (!aggregates.length) return []
  if (aggregates.length === 1) {
    return [{ aggregate: aggregates[0]!, x, y, width, height }]
  }

  const totalWeight = aggregates.reduce((sum, asset) => sum + asset.tradeCount, 0)
  const targetWeight = totalWeight / 2
  let accumulatedWeight = 0
  let splitIndex = 1

  for (let index = 0; index < aggregates.length - 1; index += 1) {
    const nextWeight = accumulatedWeight + aggregates[index]!.tradeCount
    if (Math.abs(nextWeight - targetWeight) < Math.abs(accumulatedWeight - targetWeight)) {
      accumulatedWeight = nextWeight
      splitIndex = index + 1
    } else {
      break
    }
  }

  const left = aggregates.slice(0, splitIndex)
  const right = aggregates.slice(splitIndex)
  const leftWeight = left.reduce((sum, asset) => sum + asset.tradeCount, 0)
  const ratio = leftWeight / totalWeight

  if (width >= height) {
    const leftWidth = width * ratio
    return [
      ...splitTreemap(left, x, y, leftWidth, height),
      ...splitTreemap(right, x + leftWidth, y, width - leftWidth, height)
    ]
  }

  const topHeight = height * ratio
  return [
    ...splitTreemap(left, x, y, width, topHeight),
    ...splitTreemap(right, x, y + topHeight, width, height - topHeight)
  ]
}

const layout = computed(() => {
  const heatmapWidth = 1000
  const heatmapHeight = heatmapWidth / Math.max(containerAspectRatio.value, 0.1)
  const aggregates = aggregateByAsset(inputTrades.value)
  if (!aggregates.length) {
    return {
      blocks: [] as HeatmapBlock[],
      width: heatmapWidth,
      height: heatmapHeight,
      viewBox: `0 0 ${heatmapWidth} ${heatmapHeight}`
    }
  }

  const maxPositivePnl = Math.max(0, ...aggregates.map(asset => asset.pnl))
  const maxNegativeMagnitude = Math.max(0, ...aggregates.map(asset => asset.pnl < 0 ? Math.abs(asset.pnl) : 0))
  const areas = splitTreemap(aggregates, 0, 0, heatmapWidth, heatmapHeight)

  const blocks = areas.map(({ aggregate: asset, x, y, width, height }): HeatmapBlock => {
    const fill = getAssetHeatmapColor(asset.pnl, maxPositivePnl, maxNegativeMagnitude)
    const textColor = '#FFFFFF'
    const textScale = Math.min(width, height)
    const resultLabel = formatDollar(asset.pnl)
    // Keep the original block-size scaling, then wrap each label to the
    // number of characters that fits inside its own block.
    const tickerFontSize = Math.max(4, Math.min(52, textScale * 0.18))
    const resultFontSize = Math.max(3.5, Math.min(34, textScale * 0.12))
    const textPadding = 16
    const tickerLines = wrapText(
      asset.ticker,
      Math.floor(Math.max(1, width - textPadding) / Math.max(1, tickerFontSize * 0.72))
    )
    const resultLines = wrapText(
      resultLabel,
      Math.floor(Math.max(1, width - textPadding) / Math.max(1, resultFontSize * 0.7))
    )
    const tickerLineHeight = tickerFontSize * 1.05
    const resultLineHeight = resultFontSize * 1.05
    const lineGap = 6
    const textHeight = tickerLines.length * tickerLineHeight + resultLines.length * resultLineHeight + lineGap
    const textTop = Math.max(0, (height - textHeight) / 2)
    const tickerTextY = textTop + tickerFontSize * 0.82
    const resultTextY = textTop + tickerLines.length * tickerLineHeight + lineGap + resultFontSize * 0.82
    const minimumLineWidth = Math.max(tickerFontSize * 0.72, resultFontSize * 0.7) + textPadding
    const showText = width >= minimumLineWidth && height >= textHeight + 4

    return {
      ...asset,
      x,
      y,
      width,
      height,
      fill,
      textColor,
      tickerFontSize,
      resultFontSize,
      tickerLines,
      resultLines,
      tickerTextY,
      resultTextY,
      tickerLineHeight,
      resultLineHeight,
      showText
    }
  })

  return {
    blocks,
    width: heatmapWidth,
    height: heatmapHeight,
    viewBox: `0 0 ${heatmapWidth} ${heatmapHeight}`
  }
})

const formatDollar = (value: number) => {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  const absolute = Math.abs(value)
  const formatted = absolute >= 1_000_000
    ? `${(absolute / 1_000_000).toFixed(1)}M`
    : absolute >= 1_000
      ? `${(absolute / 1_000).toFixed(1)}K`
      : absolute.toFixed(2)

  return `${sign}$${formatted}`
}

const emitReady = () => nextTick(() => emit('ready'))

onMounted(() => {
  emitReady()

  if (!heatmapRoot.value || typeof ResizeObserver === 'undefined') return

  resizeObserver = new ResizeObserver(([entry]) => {
    if (!entry || entry.contentRect.width <= 0 || entry.contentRect.height <= 0) return
    containerAspectRatio.value = entry.contentRect.width / entry.contentRect.height
  })
  resizeObserver.observe(heatmapRoot.value)
})

onBeforeUnmount(() => resizeObserver?.disconnect())
watch(layout, emitReady)
</script>

<style scoped>
.asset-heatmap {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: inherit;
}

.asset-heatmap__svg {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.asset-heatmap__tooltip-layer {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.asset-heatmap__tooltip-trigger {
  display: block;
  pointer-events: auto;
}

.asset-heatmap__tooltip-hitbox {
  display: block;
  width: 100%;
  height: 100%;
  cursor: default;
}

.asset-heatmap__cursor-tooltip {
  position: fixed;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: #000000;
  color: #ffffff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.22);
}

.asset-heatmap__block {
  cursor: default;
}

.asset-heatmap__ticker,
.asset-heatmap__result {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 700;
  letter-spacing: 0.02em;
  user-select: none;
}

.asset-heatmap__result {
  font-weight: 600;
}
</style>
