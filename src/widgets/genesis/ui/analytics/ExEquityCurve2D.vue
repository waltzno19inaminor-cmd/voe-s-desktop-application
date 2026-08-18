<template>
  <div class="ex-equity-curve-2d w-full h-full relative p-8 group">
    <!-- CHART AREA -->
    <div ref="container" class="w-full h-full relative min-h-64">
      <canvas
        v-if="points.length > 0"
        ref="canvasRef"
        class="absolute inset-0 h-full w-full cursor-crosshair"
        @mousemove="handleCanvasMouseMove"
        @mouseleave="handleMouseLeave"
      ></canvas>

      <!-- TOOLTIP OVERLAY (Teleported for global visibility) -->
      <Teleport to="body">
        <Transition name="fade-curve">
          <div v-if="hoveredPoint && tooltipPos" 
               class="fixed pointer-events-none z-[9999] bg-white/95 dark:bg-[#0a0a0a]/95 border nier-border-primary p-5 shadow-2xl flex flex-col space-y-3 backdrop-blur-xl min-w-[200px]"
               :style="{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px`, transform: 'translate(-50%, -120%)' }">
            
            <div v-if="hoveredPoint.isProjection" class="flex flex-col space-y-0.5">
              <span class="text-[8px] font-mono tracking-[0.3em] text-black/30 dark:text-white/30 uppercase font-black">
                {{ locale === 'ru' ? 'ПРОЕКЦИЯ' : 'PROJECTION OUTPUT' }}
              </span>
              <div class="h-px w-full bg-black/5 dark:white/5 mt-1"></div>
            </div>

            <div class="flex flex-col">
              <span class="text-[8px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase mb-1">{{ locale === 'ru' ? 'ИТОГОВЫЙ БАЛАНС' : 'AGGREGATE BALANCE' }}</span>
              <span class="text-2xl font-mono font-bold nier-text-primary tracking-tighter">
                {{ formatCurrency(hoveredPoint.value) }}
              </span>
            </div>

            <div class="flex flex-col">
              <span class="text-[8px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase mb-1">{{ locale === 'ru' ? 'ИСТОЧНИК СДЕЛКИ' : 'TACTICAL SOURCE' }}</span>
              <span class="text-[10px] font-mono nier-text-primary font-bold">
                {{ formatPointLabel(hoveredPoint.label) }}
              </span>
            </div>

            <!-- Decorative corner accent -->
            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 nier-bg-panel border-b border-r nier-border-primary rotate-45"></div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { isClosedTradeForMetrics } from '~/widgets/genesis/model/tradePnl'
import { getTradePnl } from '~/widgets/genesis/model/metrics'
import { useI18n } from '~/shared/i18n/useI18n'

const { locale } = useI18n()

const props = defineProps<{
  trades: any[]
  initialBalance?: number
}>()

const container = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const width = ref(800)
const height = ref(400)
const hoveredPoint = ref<any>(null)
const tooltipPos = ref<{ x: number, y: number } | null>(null)
let renderFrame = 0

const handleCanvasMouseMove = (e: MouseEvent) => {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return

  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  let nearest: any = null
  let nearestDistance = Infinity

  points.value.forEach((point) => {
    const distance = Math.hypot(point.x - x, point.y - y)
    if (distance < nearestDistance) {
      nearest = point
      nearestDistance = distance
    }
  })

  hoveredPoint.value = nearestDistance <= 18 ? nearest : null
  tooltipPos.value = hoveredPoint.value ? { x: e.clientX, y: e.clientY } : null
  scheduleRender()
}

const handleMouseLeave = () => {
  hoveredPoint.value = null
  tooltipPos.value = null
  scheduleRender()
}

const updateDimensions = () => {
  if (container.value) {
    width.value = Math.max(1, container.value.clientWidth)
    height.value = Math.max(1, container.value.clientHeight)
    scheduleRender()
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  updateDimensions()
  if (container.value) {
    resizeObserver = new ResizeObserver(() => {
      updateDimensions()
    })
    resizeObserver.observe(container.value)
  }
})

onUnmounted(() => {
  if (renderFrame) cancelAnimationFrame(renderFrame)
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

const points = computed(() => {
  if (!props.trades || props.trades.length === 0) return []
  
  const initial = props.initialBalance || 1000
  
  // 1. Identify projection context
  const projectionTrade = props.trades.find(t => (t as any).isProjection)
  let baseTrades = [...props.trades].filter(isClosedTradeForMetrics)
  
  if (projectionTrade) {
    const projDate = new Date(projectionTrade.dateExit || projectionTrade.date).getTime()
    // Hide historical records that are chronologically ahead of the current projection
    baseTrades = baseTrades.filter(t => {
      if ((t as any).isProjection) return true
      const tDate = new Date(t.dateExit || t.date).getTime()
      if (isNaN(tDate) || isNaN(projDate)) return true // Keep invalid dates so we don't wipe history
      return tDate <= projDate
    })
  }

  const sortedTrades = baseTrades.sort((a, b) => {
    const dateA = new Date(a.dateExit || a.date).getTime() || 0
    const dateB = new Date(b.dateExit || b.date).getTime() || 0
    return dateA - dateB
  })

  let runningBalance = initial
  const balances = [initial]
  sortedTrades.forEach(t => {
    runningBalance += getTradePnl(t, initial)
    balances.push(runningBalance)
  })

  const min = Math.min(...balances)
  const max = Math.max(...balances)
  const range = (max - min) || 1
  const padding = height.value * 0.05

  return balances.map((val, i) => {
    const x = (i / (balances.length - 1)) * width.value
    // Invert Y: 0 is top, height is bottom
    const y = height.value - padding - ((val - min) / range) * (height.value - 2 * padding)
    
  const trade = i === 0 ? null : (sortedTrades[i - 1] || null)
  return {
    x, y,
    value: val,
    label: trade ? `${trade.asset} (${trade.side})` : 'INITIAL_DEPOSIT',
    isProjection: (trade as any)?.isProjection || false,
    date: trade ? (trade.dateExit || trade.date) : null
  }
})
})

const currentBalance = computed(() => {
  if (points.value.length === 0) return props.initialBalance || 1000
  return points.value[points.value.length - 1]?.value ?? props.initialBalance ?? 1000
})

const formatDate = (date: any) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.toLocaleDateString(locale.value === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString(locale.value === 'ru' ? 'ru-RU' : undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}`
}

const formatPointLabel = (label: any) => {
  if (label === 'INITIAL_DEPOSIT') return locale.value === 'ru' ? 'НАЧАЛЬНЫЙ ДЕПОЗИТ' : 'INITIAL DEPOSIT'
  if (locale.value !== 'ru') return label
  return String(label || '')
    .replace(/\(Long\)$/i, '(ЛОНГ)')
    .replace(/\(Short\)$/i, '(ШОРТ)')
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(val)
}

const drawPolyline = (ctx: CanvasRenderingContext2D, sourcePoints: any[]) => {
  if (sourcePoints.length < 2) return
  const first = sourcePoints[0]
  ctx.beginPath()
  ctx.moveTo(first.x, first.y)
  sourcePoints.slice(1).forEach((point) => {
    ctx.lineTo(point.x, point.y)
  })
  ctx.stroke()
}

const renderCurve = () => {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  const cssWidth = width.value
  const cssHeight = height.value
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const targetWidth = Math.floor(cssWidth * dpr)
  const targetHeight = Math.floor(cssHeight * dpr)

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth
    canvas.height = targetHeight
    canvas.style.width = `${cssWidth}px`
    canvas.style.height = `${cssHeight}px`
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssWidth, cssHeight)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const isDark = document.documentElement.classList.contains('dark')
  const themeText = isDark ? '#ffffff' : '#000000'
  const themeAxis = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'
  const themeMuted = isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)'
  const themeGuide = isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.20)'

  ctx.strokeStyle = themeAxis
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, cssHeight)
  ctx.lineTo(cssWidth, cssHeight)
  ctx.moveTo(0, 0)
  ctx.lineTo(0, cssHeight)
  ctx.stroke()

  ctx.fillStyle = themeMuted
  ctx.font = '900 8px monospace'
  ctx.textAlign = 'left'
  ctx.fillText('$', 8, 12)
  ctx.textAlign = 'right'
  ctx.fillText(locale.value === 'ru' ? 'ВРЕМЯ' : 'TIME', cssWidth - 8, cssHeight - 12)
  ctx.textAlign = 'left'

  const allPoints = points.value
  const realPoints = allPoints.filter(point => !point.isProjection)

  if (realPoints.length >= 2) {
    ctx.save()
    ctx.lineWidth = 3
    ctx.strokeStyle = themeText
    ctx.shadowBlur = 15
    ctx.shadowColor = themeText
    drawPolyline(ctx, realPoints)
    ctx.restore()
  }

  const projectionPoint = allPoints[allPoints.length - 1]
  const lastRealPoint = allPoints[allPoints.length - 2]
  if (projectionPoint?.isProjection && lastRealPoint) {
    ctx.save()
    ctx.lineWidth = 2
    ctx.strokeStyle = themeText
    ctx.globalAlpha = 0.4
    ctx.setLineDash([6, 4])
    drawPolyline(ctx, [lastRealPoint, projectionPoint])
    ctx.restore()
  }

  allPoints.forEach((point) => {
    const isHovered = hoveredPoint.value === point
    ctx.save()
    ctx.fillStyle = isHovered ? themeText : (isDark ? '#000000' : '#ffffff')
    ctx.strokeStyle = themeText
    ctx.globalAlpha = point.isProjection || isHovered ? 1 : 0.45
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(point.x, point.y, isHovered ? 5 : 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  })

  if (hoveredPoint.value) {
    ctx.save()
    ctx.strokeStyle = themeGuide
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(hoveredPoint.value.x, hoveredPoint.value.y)
    ctx.lineTo(hoveredPoint.value.x, cssHeight)
    ctx.stroke()
    ctx.setLineDash([])

    if (hoveredPoint.value.date) {
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.60)' : 'rgba(0,0,0,0.60)'
      ctx.font = '700 11px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(formatDate(hoveredPoint.value.date).toUpperCase(), hoveredPoint.value.x, cssHeight - 2)
    }
    ctx.restore()
  }
}

const scheduleRender = () => {
  if (renderFrame) cancelAnimationFrame(renderFrame)
  renderFrame = requestAnimationFrame(() => {
    renderFrame = 0
    renderCurve()
  })
}

watch(points, () => {
  void nextTick(scheduleRender)
}, { deep: true, immediate: true })
</script>

<style scoped>
.ex-equity-curve-2d {
  user-select: none;
}
.stop-color-accent {
  stop-color: currentColor;
}
.fade-curve-enter-active, .fade-curve-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-curve-enter-from, .fade-curve-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
