<template>
  <div class="ex-efficiency-lattice w-full h-full p-8 flex flex-col nier-bg-panel border nier-border-primary shadow-2xl relative overflow-hidden group">
    <!-- SCANNING LINES DECORATION -->
    <div class="absolute inset-0 opacity-[0.03] pointer-events-none" 
         style="background-image: linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px); background-size: 40px 40px;"></div>
    
    <!-- HEADER -->
    <div class="flex justify-between items-start mb-12 relative z-10">
      <div class="flex flex-col">
        <div class="flex items-center space-x-3 mb-1">
          <div class="w-2.5 h-2.5 nier-bg-inverted rotate-45"></div>
          <span class="text-sm font-mono font-black uppercase tracking-[0.4em] nier-text-primary">{{ protocolName || 'Protocol_Diagnostic' }}</span>
        </div>
        <span class="text-[8px] font-mono opacity-30 uppercase tracking-[0.2em] nier-text-primary">Metric: Rolling_Efficiency_Score // Historical_Performance_Log</span>
      </div>
      
      <div class="flex items-center space-x-8">
        <div class="flex flex-col items-end">
          <span class="text-[7px] font-mono opacity-20 uppercase tracking-widest nier-text-primary">Current_PF</span>
          <span class="text-2xl font-mono font-black nier-text-primary">{{ currentPF.toFixed(2) }}</span>
        </div>
        <button @click="$emit('close')" class="w-10 h-10 flex items-center justify-center border nier-border-primary hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all">
          <span class="text-xs font-mono font-bold">ESC</span>
        </button>
      </div>
    </div>

    <!-- CHART AREA -->
    <div ref="container" class="flex-grow relative min-h-[300px]" @mousemove="handleMouseMove" @mouseleave="hoveredIndex = null">
      <svg v-if="temporalData.length > 0" 
           class="w-full h-full overflow-visible" 
           :viewBox="`0 0 ${width} ${height}`">
        
        <!-- Grid -->
        <g class="opacity-[0.05] nier-text-primary">
          <line v-for="i in 5" :key="'h'+i" x1="0" :y1="(i/5)*height" :x2="width" :y2="(i/5)*height" stroke="currentColor" stroke-width="1" />
          <line v-for="i in 10" :key="'v'+i" :x1="(i/10)*width" y1="0" :x2="(i/10)*width" :y2="height" stroke="currentColor" stroke-width="1" />
        </g>

        <!-- Profit Factor Path -->
        <path :d="pfPathLine" fill="none" class="stroke-black dark:stroke-white transition-all duration-700" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Sequence Markers (Small dots at each point) -->
        <g class="opacity-20 nier-text-primary">
          <circle v-for="(p, i) in points" :key="'p'+i" :cx="p.x" :cy="p.y" r="2" fill="currentColor" />
        </g>

        <!-- Hover Guideline -->
        <line v-if="hoveredIndex !== null && hoveredPointCoords" 
              :x1="hoveredPointCoords.x" y1="0" :x2="hoveredPointCoords.x" :y2="height" 
              class="stroke-black/10 dark:stroke-white/10" stroke-width="1" stroke-dasharray="4,4" />

        <!-- Interactive Point -->
        <g v-if="hoveredIndex !== null && hoveredPointCoords">
           <rect :x="hoveredPointCoords.x - 5" :y="hoveredPointCoords.y - 5" width="10" height="10" 
                 class="fill-white dark:fill-black stroke-black dark:stroke-white" 
                 :transform="`rotate(45, ${hoveredPointCoords.x}, ${hoveredPointCoords.y})`" 
                 stroke-width="2" />
        </g>

        <!-- Timeline Markers -->
        <g v-for="(p, i) in points" :key="'t'+i">
          <text v-if="i % 5 === 0" :x="p.x" :y="height - 10" class="fill-black/30 dark:fill-white/30 text-[9px] font-mono uppercase tracking-widest" text-anchor="middle">
             T-{{ temporalData.length - 1 - i }}
          </text>
        </g>
      </svg>
      
      <!-- TOOLTIP OVERLAY -->
      <div v-if="hoveredIndex !== null && hoveredPoint && hoveredPointCoords" 
           class="absolute z-[100] pointer-events-none bg-black text-white dark:bg-white dark:text-black p-4 min-w-[150px] shadow-2xl border border-white/10 dark:border-black/10 transition-all duration-200"
           :style="{ left: `${(hoveredPointCoords.x / width) * 100}%`, top: `${hoveredPointCoords.y}px`, transform: tooltipTransform }">
        <div class="flex flex-col space-y-2">
          <span class="text-[7px] font-mono tracking-[0.4em] opacity-40 uppercase text-center">SESSION_FRAME: T-{{ temporalData.length - 1 - hoveredIndex }}</span>
          <div class="h-px w-full bg-current opacity-10"></div>
          <div class="flex justify-between items-center px-1">
            <span class="text-[8px] font-mono opacity-60 uppercase">PROFIT_FACTOR:</span>
            <span class="text-sm font-mono font-black">{{ hoveredPoint.pf.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <div v-else-if="temporalData.length === 0" class="w-full h-full flex items-center justify-center opacity-20">
        <span class="text-[10px] font-mono uppercase tracking-[0.5em]">Insufficient_Temporal_History</span>
      </div>
    </div>

    <!-- LEGEND FOOTER -->
    <div class="mt-12 pt-8 border-t nier-border-primary flex justify-between items-center relative z-10">
      <div class="flex items-center space-x-4">
        <div class="w-8 h-px nier-bg-inverted"></div>
        <span class="text-[9px] font-mono uppercase tracking-[0.3em] opacity-40 nier-text-primary font-bold">Diagnostic_Curve: Efficiency_Coefficient</span>
      </div>
      <div class="flex items-center space-x-2 opacity-10">
        <div class="w-2 h-2 nier-bg-inverted rotate-45"></div>
        <span class="text-[8px] font-mono uppercase tracking-[0.5em]">GENESIS_ARCHIVAL_v2.1</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  trades: any[]
  protocolId: string
  protocolName: string
}>()

defineEmits(['close'])

const container = ref<HTMLElement | null>(null)
const width = ref(1000)
const height = ref(400)
const hoveredIndex = ref<number | null>(null)

const updateDimensions = () => {
  if (container.value) {
    width.value = container.value.clientWidth
    height.value = container.value.clientHeight
  }
}

let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  updateDimensions()
  resizeObserver = new ResizeObserver(updateDimensions)
  if (container.value) resizeObserver.observe(container.value)
})

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
})

const temporalData = computed(() => {
  if (!props.trades || props.trades.length < 2) return []

  const windowSize = 10
  
  // 1. ISOLATE PROTOCOL HISTORY FIRST
  const protocolTradesFull = [...props.trades].filter(t => {
    const te = t as any
    return te.boardScenarioEntry?.id === props.protocolId ||
           te.boardScenarioExit?.id === props.protocolId ||
           te.boardScenarioEntryId === props.protocolId ||
           te.boardScenarioExitId === props.protocolId ||
           (te.boardConditions && Array.isArray(te.boardConditions) && te.boardConditions.some((c: any) => (typeof c === 'string' ? c === props.protocolId : c.id === props.protocolId))) ||
           (te.boardScenarioEntry?.info?.conditions && Array.isArray(te.boardScenarioEntry.info.conditions) && te.boardScenarioEntry.info.conditions.some((c: any) => c.id === props.protocolId)) ||
           (te.boardScenarioExit?.info?.conditions && Array.isArray(te.boardScenarioExit.info.conditions) && te.boardScenarioExit.info.conditions.some((c: any) => c.id === props.protocolId)) ||
           te.emotions?.includes(props.protocolId) ||
           te.emotionsEntry?.includes(props.protocolId) ||
           te.emotionsDuring?.includes(props.protocolId) ||
           te.emotionsExit?.includes(props.protocolId)
  }).sort((a, b) => {
    const da = new Date(a.dateExit || a.date).getTime()
    const db = new Date(b.dateExit || b.date).getTime()
    return da - db
  })

  if (protocolTradesFull.length === 0) return []

  const results = [{ freq: 0, pf: 0 }]
  
  // 2. CALCULATE ROLLING METRICS ON ISOLATED SEQUENCE
  for (let i = 0; i < protocolTradesFull.length; i++) {
    const start = Math.max(0, i - windowSize + 1)
    const window = protocolTradesFull.slice(start, i + 1)
    
    let wins = 0, losses = 0
    window.forEach(t => {
      const val = (t.profitInCurrency || t.pnl || 0)
      if (val > 0) wins += val
      else if (val < 0) losses += Math.abs(val)
    })
    const pf = losses === 0 ? (wins > 0 ? 99.9 : 0) : wins / losses
    results.push({ freq: 0, pf })
  }
  return results
})

const points = computed(() => {
  if (temporalData.value.length < 2) return []
  
  // Visual cap to prevent 99.9 from crushing the Y-axis scale
  const visualPFs = temporalData.value.map(d => Math.min(d.pf, 5))
  const maxPF = Math.max(...visualPFs, 2) // Ensure a minimum scale of 2.0
  
  const paddingTop = height.value * 0.25 
  const paddingBottom = height.value * 0.15
  const chartHeight = height.value - paddingTop - paddingBottom

  return temporalData.value.map((d, i) => {
    const visualPF = Math.min(d.pf, 5)
    return {
      x: (i / (temporalData.value.length - 1)) * width.value,
      y: height.value - paddingBottom - (visualPF / maxPF) * chartHeight
    }
  })
})

const currentPF = computed(() => {
  const data = temporalData.value
  return data[data.length - 1]?.pf ?? 0
})

const hoveredPoint = computed(() => {
  if (hoveredIndex.value === null) return null
  return temporalData.value[hoveredIndex.value] || null
})

const hoveredPointCoords = computed(() => {
  if (hoveredIndex.value === null) return null
  return points.value[hoveredIndex.value] || null
})

const handleMouseMove = (e: MouseEvent) => {
  if (!container.value || temporalData.value.length < 2) return
  const rect = container.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const ratio = Math.max(0, Math.min(1, x / rect.width))
  hoveredIndex.value = Math.round(ratio * (temporalData.value.length - 1))
}

const tooltipTransform = computed(() => {
  if (!hoveredPointCoords.value) return 'translate(-50%, -120%)'
  const ratio = hoveredPointCoords.value.x / width.value
  let xTrans = '-50%'
  if (ratio < 0.15) xTrans = '0'
  if (ratio > 0.85) xTrans = '-100%'
  return `translate(${xTrans}, -120%)`
})

const pfPathLine = computed(() => {
  if (points.value.length < 2) return ''
  return `M ${points.value.map(p => `${p.x},${p.y}`).join(' L ')}`
})
</script>

<style scoped>
.ex-efficiency-lattice {
  user-select: none;
}
</style>
