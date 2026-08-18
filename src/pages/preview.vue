<template>
  <main class="trade-node-preview" aria-label="ExGenesis trade node preview">
    <canvas ref="canvasRef" class="trade-node-preview__canvas"></canvas>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { DiaryEntry } from '~/entities/diary/model/diary.types'
import { mockTrades } from '~/entities/diary/model/mockDiaryData'
import { useStrategyTradesStore } from '~/features/store/useStrategyTrades'

definePageMeta({
  hideChrome: true,
})

type PreviewNode = {
  id: string
  label: string
  size: number
  xRatio: number
  yRatio: number
  phase: number
  appearAt: number
  isFirst: boolean
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const tradeStore = useStrategyTradesStore()
const nodes = ref<PreviewNode[]>([])

let rafId = 0
let startedAt = 0

const sourceTrades = computed(() => {
  const trades = tradeStore.getTradesForStrategy('MAIN_DIARY')
  return trades.length > 0 ? trades : mockTrades
})

const orderedTrades = computed(() => {
  return [...sourceTrades.value]
    .filter(trade => trade?.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
})

const hashNumber = (input: string) => {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3)

const formatCubeTradeAssetLabel = (asset?: string) => {
  if (!asset) return 'UNKNOWN'
  return String(asset).replace(/\s+/g, '_').toUpperCase()
}

const formatPreviewDollarResult = (hash: number) => {
  const whole = 30 + ((hash >>> 8) % 370)
  const cents = (hash % 99) + 1
  return `${whole}.${String(cents).padStart(2, '0')}$`
}

const getTradeNodeLabel = (trade: DiaryEntry, hash: number) => {
  const asset = formatCubeTradeAssetLabel(trade.asset)
  return `${asset} [${formatPreviewDollarResult(hash)}]`
}

const buildNodes = () => {
  let trades = orderedTrades.value.slice(0, 90)
  if (trades.length > 0 && trades.length < 40) {
    const arr = [...trades]
    while (arr.length < 40) {
      arr.push(...trades)
    }
    trades = arr.slice(0, 90)
  }

  const placed: { x: number; y: number; size: number }[] = []
  let nextAppearTime = 9300
  let nodesInCurrentBatch = 0
  let targetBatchSize = 2
  const bgNodesCount = Math.max(1, trades.length - 1)
  const expectedBatches = Math.max(1, bgNodesCount / 2.5)
  const batchDelay = 5000 / expectedBatches

  nodes.value = trades.map((trade, index) => {
    const id = trade.id || `trade-${index}`
    const hash = hashNumber(`${id}-${trade.asset || ''}-${index}`)
    const isFirst = index === 0

    let nodeSize: number
    if (isFirst) {
      nodeSize = 56
    } else {
      const variation = (hash % 24) - 12
      nodeSize = 26 + variation
    }

    let xRatio = 0.5
    let yRatio = 0.5

    if (isFirst) {
      xRatio = 0.5
      yRatio = 0.5
      placed.push({ x: xRatio, y: yRatio, size: nodeSize })
    } else {
      const minGap = trades.length > 70 ? 0.06 : 0.09
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const attemptHash = hashNumber(`${id}-${index}-${attempt}`)
        const candidateX = ((attemptHash % 1000) / 1000) * 0.9 + 0.05
        const candidateY = (((attemptHash >>> 10) % 1000) / 1000) * 0.9 + 0.05
        
        const gap = minGap + (nodeSize / 900)
        const hasRoom = placed.every(point => {
          const dx = candidateX - point.x
          const dy = candidateY - point.y
          const sizeGap = gap + point.size / 900
          return Math.sqrt(dx * dx + dy * dy) >= sizeGap
        })

        if (hasRoom || attempt === 79) {
          xRatio = candidateX
          yRatio = candidateY
          placed.push({ x: xRatio, y: yRatio, size: nodeSize })
          break
        }
      }
    }

    let appearAt = 0
    if (isFirst) {
      appearAt = 3000
    } else {
      appearAt = nextAppearTime + (nodesInCurrentBatch * 100)
      nodesInCurrentBatch++
      if (nodesInCurrentBatch >= targetBatchSize) {
        nextAppearTime += batchDelay
        nodesInCurrentBatch = 0
        targetBatchSize = (hash % 2) === 0 ? 2 : 3
      }
    }

    return {
      id: `${id}-${index}`,
      label: getTradeNodeLabel(trade, hash),
      size: nodeSize,
      xRatio,
      yRatio,
      phase: (hash % 628) / 100,
      appearAt,
      isFirst,
    }
  })

  startedAt = performance.now()
}

const resizeCanvas = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = Math.max(1, canvas.clientWidth)
  const height = Math.max(1, canvas.clientHeight)
  const nextWidth = Math.floor(width * dpr)
  const nextHeight = Math.floor(height * dpr)

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth
    canvas.height = nextHeight
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { width, height }
}

const drawTradeNode = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number,
) => {
  const thinWidth = size * 0.6

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.shadowBlur = 14 * alpha
  ctx.shadowColor = '#ffffff'
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(x, y - size)
  ctx.lineTo(x + thinWidth, y)
  ctx.lineTo(x, y + size)
  ctx.lineTo(x - thinWidth, y)
  ctx.closePath()
  ctx.fill()

  ctx.globalAlpha = alpha * 0.5
  ctx.shadowBlur = 8 * alpha
  ctx.shadowColor = '#94a3b8'
  ctx.fillStyle = '#94a3b8'
  ctx.beginPath()
  ctx.moveTo(x + 1.5, y - size)
  ctx.lineTo(x + 1.5 + thinWidth, y)
  ctx.lineTo(x + 1.5, y + size)
  ctx.lineTo(x + 1.5 - thinWidth, y)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

const render = () => {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  const { width, height } = resizeCanvas(canvas, ctx)
  const now = performance.now()
  const elapsed = now - startedAt
  const xPadding = clamp(width * 0.095, 72, 168)
  const yPadding = clamp(height * 0.1, 54, 120)
  const usableWidth = Math.max(1, width - xPadding * 2)
  const usableHeight = Math.max(1, height - yPadding * 2)
  const scaleFactor = clamp(Math.min(width, height) / 900, 0.62, 1.15)

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, width, height)

  const lastNode = nodes.value.at(-1)
  const lastAppearAt = lastNode ? lastNode.appearAt : 0
  const allAppearedAt = lastAppearAt + 1000
  const globalDisappearAt = allAppearedAt + 3000
  const disappearDuration = 500
  const cycleEnd = globalDisappearAt + disappearDuration + 5000

  nodes.value.forEach(node => {
    const isFirst = node.isFirst
    let alpha = 0
    let size = 0
    let labelAlpha = 0
    
    const breathe = isFirst ? 0 : Math.sin(now * 0.0014 + node.phase) * 2
    const drift = isFirst ? 0 : Math.cos(now * 0.0009 + node.phase) * 1.5
    
    const rawX = xPadding + node.xRatio * usableWidth + drift
    const rawY = yPadding + node.yRatio * usableHeight + breathe
    let currentY = rawY

    if (isFirst) {
      const nodeAppearTime = clamp((elapsed - 3000) / 1000, 0, 1)
      const nodeAppearEase = easeOutCubic(nodeAppearTime)
      
      const labelAppearTime = clamp((elapsed - 4000) / 1000, 0, 1)
      const labelAppearEase = easeOutCubic(labelAppearTime)

      const disappearTime = clamp((elapsed - 7000) / 500, 0, 1)
      const disappearEase = easeOutCubic(disappearTime)
      
      if (nodeAppearEase > 0 && disappearEase < 1) {
        alpha = nodeAppearEase * (1 - disappearEase) * (0.85 + Math.sin(now * 0.0018 + node.phase) * 0.15)
        size = node.size * scaleFactor
        labelAlpha = labelAppearEase * (1 - disappearEase)
        currentY = rawY
      }
    } else {
      if (elapsed >= node.appearAt) {
        const appearTime = clamp((elapsed - node.appearAt) / 800, 0, 1)
        const appearEase = easeOutCubic(appearTime)
        
        const disappearTime = clamp((elapsed - globalDisappearAt) / disappearDuration, 0, 1)
        const disappearEase = easeOutCubic(disappearTime)
        
        if (appearEase > 0 && disappearEase < 1) {
           const sizeRatio = node.size / 26
           const maxAlpha = 0.45 + (sizeRatio - 1) * 0.2
           
           alpha = appearEase * (1 - disappearEase) * (maxAlpha + Math.sin(now * 0.0018 + node.phase) * 0.1)
           size = node.size * scaleFactor * (0.5 + appearEase * 0.5) * (1 - disappearEase * 0.8)
           currentY = rawY - (1 - appearEase) * 10 + disappearEase * 10
        }
      }
    }

    if (alpha <= 0.01 || size <= 0.01) return

    const focusMultiplier = scaleFactor
    const dynamicFontSize = Math.floor(clamp(size * 0.45, 16 * focusMultiplier, 32 * focusMultiplier))

    const horizontalReserve = size * 1.2
    const topReserve = size * 1.2
    const bottomReserve = isFirst ? size + 16 * focusMultiplier + dynamicFontSize * 1.5 : size * 1.2
    
    const x = clamp(rawX, xPadding + horizontalReserve, width - xPadding - horizontalReserve)
    const y = clamp(currentY, yPadding + topReserve, height - yPadding - bottomReserve)

    drawTradeNode(ctx, x, y, size, alpha)

    if (isFirst && labelAlpha > 0.01) {
      ctx.save()
      ctx.globalAlpha = labelAlpha
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${dynamicFontSize}px Inter`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(node.label, Math.round(x), Math.round(y + size + 16 * focusMultiplier))
      ctx.restore()
    }
  })

  if (elapsed > cycleEnd) {
    startedAt = now
  }

  rafId = requestAnimationFrame(render)
}

watch(orderedTrades, buildNodes, { deep: true })

onMounted(() => {
  buildNodes()
  tradeStore.init().then(() => {
    buildNodes()
  })
  rafId = requestAnimationFrame(render)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.trade-node-preview {
  position: relative;
  min-height: 100vh;
  width: 100%;
  overflow: hidden;
  background: #000000;
}

.trade-node-preview__canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}
</style>

<style>
html:has(.trade-node-preview) #nuxt-devtools-container {
  display: none !important;
}
</style>
