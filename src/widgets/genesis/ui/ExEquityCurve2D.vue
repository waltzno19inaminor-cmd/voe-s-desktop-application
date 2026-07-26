<template>
  <div class="ex-equity-curve-2d w-full h-full relative p-8 group">
    <!-- CHART AREA -->
    <div ref="container" class="w-full h-full relative min-h-64">
      <svg v-if="points.length > 0" class="w-full h-full overflow-visible">
        <!-- Axes -->
        <line x1="0" :y1="height" :x2="width" :y2="height" class="stroke-black/10 dark:stroke-white/10" stroke-width="1" />
        <line x1="0" y1="0" x2="0" :y2="height" class="stroke-black/10 dark:stroke-white/10" stroke-width="1" />

        <!-- Axis Labels -->
        <text x="8" y="12" class="fill-black/30 dark:fill-white/30 text-[8px] font-mono tracking-[0.2em] font-black uppercase pointer-events-none italic">$</text>
        <text :x="width - 8" :y="height - 12" class="fill-black/30 dark:fill-white/30 text-[8px] font-mono tracking-[0.2em] font-black uppercase pointer-events-none italic" text-anchor="end">TIME</text>

        <!-- Main Path -->
        <path :d="linePath" 
              fill="none" 
              class="stroke-black dark:stroke-white transition-all duration-700" 
              stroke-width="2" 
              stroke-linecap="round" 
              stroke-linejoin="round" />

        <!-- Projection Segment (Dashed) -->
        <path v-if="projectionPath" 
              :d="projectionPath" 
              fill="none" 
              class="stroke-black dark:stroke-white opacity-40 transition-all duration-700" 
              stroke-width="2" 
              stroke-dasharray="6,4" 
              stroke-linecap="round" />

        <!-- Data Points -->
        <g v-for="(p, i) in points" :key="i">
          <circle :cx="p.x" :cy="p.y" 
                  r="3" 
                  class="fill-white dark:fill-black stroke-black dark:stroke-white transition-all duration-300" 
                  :class="[p.isProjection ? 'opacity-100' : 'opacity-40 group-hover:opacity-100']"
                  stroke-width="1.5"
                  @mouseenter="handleMouseEnter($event, p)"
                  @mouseleave="handleMouseLeave" />
          
        </g>

        <!-- Hover Guide Lines -->
        <g v-if="hoveredPoint" class="pointer-events-none">
          <line :x1="hoveredPoint.x" :y1="hoveredPoint.y" 
                :x2="hoveredPoint.x" :y2="height" 
                class="stroke-black/20 dark:stroke-white/20 transition-all duration-300" 
                stroke-width="1" 
                stroke-dasharray="4,4" />
          
          <text v-if="hoveredPoint.date"
                :x="hoveredPoint.x" :y="height + 18" 
                class="fill-black/60 dark:fill-white/60 text-[8px] font-mono tracking-widest uppercase"
                text-anchor="middle">
            {{ formatDate(hoveredPoint.date) }}
          </text>
        </g>
      </svg>

      <!-- TOOLTIP OVERLAY (Teleported for global visibility) -->
      <Teleport to="body">
        <Transition name="fade-curve">
          <div v-if="hoveredPoint && tooltipPos" 
               class="fixed pointer-events-none z-[9999] bg-white/95 dark:bg-[#0a0a0a]/95 border nier-border-primary p-5 shadow-2xl flex flex-col space-y-3 backdrop-blur-xl min-w-[200px]"
               :style="{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px`, transform: 'translate(-50%, -120%)' }">
            
            <div class="flex flex-col space-y-0.5">
              <span class="text-[8px] font-mono tracking-[0.3em] text-black/30 dark:text-white/30 uppercase font-black">
                {{ hoveredPoint.isProjection ? 'PROJECTION_OUTPUT' : 'HISTORICAL_DATA' }}
              </span>
              <div class="h-px w-full bg-black/5 dark:white/5 mt-1"></div>
            </div>

            <div class="flex flex-col">
              <span class="text-[8px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase mb-1">AGGREGATE_BALANCE</span>
              <span class="text-2xl font-mono font-bold nier-text-primary tracking-tighter">
                {{ formatCurrency(hoveredPoint.value) }}
              </span>
            </div>

            <div class="flex flex-col">
              <span class="text-[8px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase mb-1">TACTICAL_SOURCE</span>
              <span class="text-[10px] font-mono nier-text-primary font-bold">
                {{ hoveredPoint.label }}
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getTradeCashPnl, isClosedTradeForMetrics } from '~/widgets/genesis/model/tradePnl'

const props = defineProps<{
  trades: any[]
  initialBalance?: number
}>()

const container = ref<HTMLElement | null>(null)
const width = ref(800)
const height = ref(400)
const hoveredPoint = ref<any>(null)
const tooltipPos = ref<{ x: number, y: number } | null>(null)

const handleMouseEnter = (e: MouseEvent, p: any) => {
  hoveredPoint.value = p
  tooltipPos.value = { x: e.clientX, y: e.clientY }
}

const handleMouseLeave = () => {
  hoveredPoint.value = null
  tooltipPos.value = null
}

const updateDimensions = () => {
  if (container.value) {
    width.value = container.value.clientWidth
    height.value = container.value.clientHeight
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
    runningBalance += getTradeCashPnl(t, initial)
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

const linePath = computed(() => {
  const realPoints = points.value.filter(p => !p.isProjection)
  if (realPoints.length < 2) return ''
  
  return realPoints.reduce((path, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`
  }, '')
})

const projectionPath = computed(() => {
  if (points.value.length < 2) return ''
  const projectionPoint = points.value[points.value.length - 1]
  const lastRealPoint = points.value[points.value.length - 2]
  
  if (!projectionPoint || !lastRealPoint || !projectionPoint.isProjection) return ''
  
  return `M ${lastRealPoint.x} ${lastRealPoint.y} L ${projectionPoint.x} ${projectionPoint.y}`
})

const formatDate = (date: any) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(val)
}
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
