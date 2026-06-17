<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, isRef } from 'vue'
import EtherealBackground from '~/widgets/style/ui/EtherealBackground.vue'
import DesignVignette from '~/widgets/style/ui/DesignVignette.vue'
import { useStrategyTradesStore } from '~/features/store/useStrategyTrades'
import ExEquityCurve2D from '~/widgets/genesis/ui/ExEquityCurve2D.vue'
import ExTradeAnalysisPanel from '~/widgets/genesis/ui/ExTradeAnalysisPanel.vue'
import { useI18n } from '~/shared/i18n/useI18n'

const { t } = useI18n()

const props = withDefaults(defineProps<{
  isOpen: boolean
  isDark?: boolean
  trade?: any
  emotionalRank?: number
  pickedEmotions?: any[]
  initialPage?: number
  initialExpandedNoteId?: string
  openAnalyticsOnMount?: boolean
}>(), {
  isDark: false,
  emotionalRank: 64,
  pickedEmotions: () => [
    { 
      name: 'FOCUS', 
      freq: '84.6%', freqTrend: 'up', 
      pf: '2.45', pfTrend: 'up',
      history: { 
        pf: [1.8, 1.9, 1.85, 2.0, 2.1, 2.05, 2.2, 2.15, 2.3, 2.2, 2.1, 2.25, 2.3, 2.4, 2.35, 2.2, 2.25, 2.3, 2.35, 2.45],
        freq: [70, 72, 75, 74, 76, 78, 80, 79, 81, 82, 80, 81, 83, 84, 82, 80, 81, 82, 83, 84.6]
      }
    },
    { 
      name: 'FOMO', 
      freq: '12.1%', freqTrend: 'down', 
      pf: '0.64', pfTrend: 'down',
      history: { 
        pf: [1.2, 0.9, 0.7, 1.1, 0.8, 0.6, 1.0, 0.9, 0.7, 0.5, 0.8, 0.9, 0.7, 0.6, 0.8, 1.0, 0.9, 0.8, 0.7, 0.64],
        freq: [20, 45, 10, 35, 15, 50, 12, 40, 18, 55, 14, 30, 16, 45, 20, 35, 18, 25, 15, 12.1]
      }
    },
    { 
      name: 'FATIGUE', 
      freq: '44.2%', freqTrend: 'up', 
      pf: '1.05', pfTrend: 'down',
      history: { 
        pf: [1.5, 1.45, 1.4, 1.35, 1.3, 1.28, 1.25, 1.22, 1.2, 1.18, 1.15, 1.12, 1.1, 1.08, 1.05, 1.03, 1.02, 1.05, 1.1, 1.05],
        freq: [30, 32, 33, 35, 36, 38, 40, 41, 42, 43, 44, 45, 46, 47, 48, 47, 46, 45, 44, 44.2]
      }
    }
  ]
})

const emit = defineEmits(['close'])

interface TacticalNode {
  id: string
  name: string
  x: number
  y: number
  freq: string
  freqTrend: 'up' | 'down'
  pf: string
  pfTrend: 'up' | 'down'
  history: {
    pf: number[]
    freq: number[]
  }
}

// TACTICAL COORDINATE BLUEPRINT (Fixed spatial registry for 20 slots per scenario)
const TACTICAL_BLUEPRINT: { ENTRY_SLOTS: { x: number, y: number }[], EXIT_SLOTS: { x: number, y: number }[] } = {
  ENTRY_SLOTS: [
    { x: 500, y: 100 }, { x: 550, y: 250 }, { x: 500, y: 400 }, { x: 200, y: 550 },
    { x: -100, y: 450 }, { x: -150, y: 200 }, { x: 100, y: 50 }, { x: 600, y: -50 },
    { x: 750, y: 170 }, { x: 800, y: 350 }, { x: 700, y: 550 }, { x: 450, y: 650 },
    { x: 150, y: 750 }, { x: -200, y: 600 }, { x: -350, y: 350 }, { x: -300, y: 100 },
    { x: 50, y: -150 }, { x: 350, y: -250 }, { x: 950, y: -100 }, { x: 1050, y: 150 }
  ],
  EXIT_SLOTS: [
    { x: 1300, y: 250 }, { x: 1280, y: 350 }, { x: 1300, y: 500 }, { x: 1600, y: 400 },
    { x: 1750, y: 550 }, { x: 1650, y: 150 }, { x: 1800, y: 800 }, { x: 1650, y: 950 },
    { x: 1350, y: 1150 }, { x: 1000, y: 1100 }, { x: 900, y: 1000 }, { x: 1100, y: 850 },
    { x: 1400, y: 600 }, { x: 1850, y: 250 }, { x: 2000, y: 450 }, { x: 2100, y: 700 },
    { x: 2050, y: 900 }, { x: 1700, y: 1100 }, { x: 1400, y: 1250 }, { x: 900, y: 1200 }
  ]
}

// VIEW STATE (Zoom & Pan)
const viewState = ref({
  panX: 100, // Initial offset
  panY: 100,
  scale: 1.0,
  isPanning: false
})

const tradeStore = useStrategyTradesStore()
const equityModalOpen = ref(false)
const analyticsModalOpen = ref(props.openAnalyticsOnMount || false)
const activeAnalyticsPage = ref(props.initialPage || 3)

import { watch } from 'vue'

watch(() => props.initialPage, (newVal) => {
  if (newVal) activeAnalyticsPage.value = newVal
}, { immediate: true })

watch(() => props.openAnalyticsOnMount, (newVal) => {
  if (newVal) {
    if (props.initialPage) activeAnalyticsPage.value = props.initialPage
    analyticsModalOpen.value = true
  }
}, { immediate: true })
const equityTrades = computed(() => {
  if (!props.trade) return []
  const strategyId = props.trade.strategyId || 'MAIN_DIARY'
  const historyTrades = tradeStore.getTradesForStrategy(strategyId)
  
  const currentTradeTime = new Date(props.trade.dateExit || props.trade.date || Date.now()).getTime()
  
  // Combine and ensure current trade is marked as projection for the curve to show it as "impact"
  const exists = historyTrades.some(t => t.id === props.trade.id)
  const combined = (exists ? [...historyTrades] : [...historyTrades, props.trade]).map(t => ({
    ...t,
    // We mark the current trade we are analyzing as the projection target
    isProjection: t.id === props.trade.id
  }))
  
  const sorted = combined.sort((a, b) => {
    const dA = new Date(a.dateExit || a.date || 0).getTime()
    const dB = new Date(b.dateExit || b.date || 0).getTime()
    return dA - dB
  })
  
  // Filter: only show history up to this specific trade's exit
  return sorted.filter(t => {
    const tTime = new Date(t.dateExit || t.date || 0).getTime()
    return tTime <= currentTradeTime
  })
})

const currentInitialDeposit = computed(() => {
  if (!props.trade) return 1000
  return tradeStore.getInitialDeposit(props.trade.strategyId || 'MAIN_DIARY')
})

const allTrades = computed(() => {
  if (!props.trade?.strategyId) return []
  return tradeStore.getTradesForStrategy(props.trade.strategyId)
})

const getNormalizedPnl = (tr: any) => {
  let p = tr.profitInCurrency
  if (p === undefined || p === null || p === 0) {
    p = tr.result ?? tr.pnl ?? 0
  }
  const val = Number(p)
  if (isNaN(val)) return 0
  
  if ((tr.profitInCurrency === undefined || tr.profitInCurrency === null || tr.profitInCurrency === 0) && 
      Math.abs(val) < 100 && currentInitialDeposit.value > 1000) {
    return (val / 100) * currentInitialDeposit.value
  }
  return val
}

const EMOTION_WEIGHTS_LOCAL: Record<string, number> = {
  'CONFIDENCE': 10, 'PATIENCE': 15, 'DISCIPLINE': 20,
  'FOMO': -20, 'GREED': -25, 'REVENGE': -30, 'FEAR': -15, 'TILT': -40, 'ANXIETY': -15
}

const getTradeScore = (tr: any) => {
  const pnl = getNormalizedPnl(tr)
  let emotionalScore = 0
  if (tr && tr.emotions && Array.isArray(tr.emotions)) {
    tr.emotions.forEach((e: any) => {
      const key = (typeof e === 'string' ? e : (e.name || '')).toUpperCase()
      emotionalScore += EMOTION_WEIGHTS_LOCAL[key] || 0
    })
  }
  return pnl + emotionalScore
}

const percentileRank = computed(() => {
  const currentScore = getTradeScore(props.trade)
  const scores = allTrades.value.map(getTradeScore).sort((a, b) => a - b)
  if (scores.length === 0) return 0
  const lower = scores.filter(s => s < currentScore).length
  return Math.round((lower / scores.length) * 100)
})

const contentTransform = computed(() => ({
  transform: `translate(${viewState.value.panX}px, ${viewState.value.panY}px) scale(${viewState.value.scale})`,
  transformOrigin: '0 0'
}))

// MOCK DATA WITH SPATIAL COORDINATES
const entryConditions = computed(() => {
  const s = props.trade?.scenarios?.find((s: any) => s.type === 'entry')
  if (!s || !s.conditions) return []
  
  const filteredConditions = s.conditions.filter((c: any) => {
    const systemNames = ['TAKE_PROFIT', 'STOP_LOSS', 'FULL_LIQUIDATION']
    if (systemNames.includes(s.name?.toUpperCase()) && c.name?.toUpperCase() === s.name?.toUpperCase()) {
      return false
    }
    return true
  })

  return filteredConditions.map((c: any, i: number) => {
    const pfHistory = c.history?.pf || Array.from({ length: 21 }, () => 1.0)
    const freqHistory = c.history?.freq || Array.from({ length: 21 }, () => 100)
    
    const lastFreq = freqHistory[freqHistory.length - 1]
    const prevFreq = freqHistory[freqHistory.length - 2] || lastFreq
    const lastPf = pfHistory[pfHistory.length - 1]
    const prevPf = pfHistory[pfHistory.length - 2] || lastPf

    return {
      id: c.id,
      name: c.name,
      x: TACTICAL_BLUEPRINT.ENTRY_SLOTS[i]?.x || 0,
      y: TACTICAL_BLUEPRINT.ENTRY_SLOTS[i]?.y || 0,
      freq: lastFreq.toFixed(1) + '%',
      freqTrend: lastFreq >= prevFreq ? 'up' : 'down' as const,
      pf: lastPf.toFixed(2),
      pfTrend: lastPf >= prevPf ? 'up' : 'down' as const,
      history: { pf: pfHistory, freq: freqHistory }
    }
  })
})

const exitConditions = computed(() => {
  const s = props.trade?.scenarios?.find((s: any) => s.type === 'exit')
  if (!s || !s.conditions) return []
  
  const filteredConditions = s.conditions.filter((c: any) => {
    const systemNames = ['TAKE_PROFIT', 'STOP_LOSS', 'FULL_LIQUIDATION']
    if (systemNames.includes(s.name?.toUpperCase()) && c.name?.toUpperCase() === s.name?.toUpperCase()) {
      return false
    }
    return true
  })

  return filteredConditions.map((c: any, i: number) => {
    const pfHistory = c.history?.pf || Array.from({ length: 21 }, () => 1.0)
    const freqHistory = c.history?.freq || Array.from({ length: 21 }, () => 100)

    const lastFreq = freqHistory[freqHistory.length - 1]
    const prevFreq = freqHistory[freqHistory.length - 2] || lastFreq
    const lastPf = pfHistory[pfHistory.length - 1]
    const prevPf = pfHistory[pfHistory.length - 2] || lastPf

    return {
      id: c.id,
      name: c.name,
      x: TACTICAL_BLUEPRINT.EXIT_SLOTS[i]?.x || 0,
      y: TACTICAL_BLUEPRINT.EXIT_SLOTS[i]?.y || 0,
      freq: lastFreq.toFixed(1) + '%',
      freqTrend: lastFreq >= prevFreq ? 'up' : 'down' as const,
      pf: lastPf.toFixed(2),
      pfTrend: lastPf >= prevPf ? 'up' : 'down' as const,
      history: { pf: pfHistory, freq: freqHistory }
    }
  })
})

const entryHubData = computed(() => {
  const s = props.trade?.scenarios?.find((s: any) => s.type === 'entry')
  if (!s) return null
  
  const pfHistory = s.history?.pf || Array.from({ length: 21 }, () => 1.0)
  const freqHistory = s.history?.freq || Array.from({ length: 21 }, () => 100)
  
  const lastFreq = freqHistory[freqHistory.length - 1]
  const prevFreq = freqHistory[freqHistory.length - 2] || lastFreq
  const lastPf = pfHistory[pfHistory.length - 1]
  const prevPf = pfHistory[pfHistory.length - 2] || lastPf
  
  return {
    name: s.name || 'ENTRY_SCENARIO',
    freq: lastFreq.toFixed(1) + '%',
    freqTrend: lastFreq >= prevFreq ? 'up' : 'down' as const,
    pf: lastPf.toFixed(2),
    pfTrend: lastPf >= prevPf ? 'up' : 'down' as const,
    history: { pf: pfHistory, freq: freqHistory }
  }
})

const exitHubData = computed(() => {
  const s = props.trade?.scenarios?.find((s: any) => s.type === 'exit')
  if (!s) return null
  
  const pfHistory = s.history?.pf || Array.from({ length: 21 }, () => 1.0)
  const freqHistory = s.history?.freq || Array.from({ length: 21 }, () => 100)

  const lastFreq = freqHistory[freqHistory.length - 1]
  const prevFreq = freqHistory[freqHistory.length - 2] || lastFreq
  const lastPf = pfHistory[pfHistory.length - 1]
  const prevPf = pfHistory[pfHistory.length - 2] || lastPf

  return {
    name: s.name || 'EXIT_SCENARIO',
    freq: lastFreq.toFixed(1) + '%',
    freqTrend: lastFreq >= prevFreq ? 'up' : 'down' as const,
    pf: lastPf.toFixed(2),
    pfTrend: lastPf >= prevPf ? 'up' : 'down' as const,
    history: { pf: pfHistory, freq: freqHistory }
  }
})

const displayEmotions = computed(() => {
  if (props.trade?.emotions) {
    return props.trade.emotions.map((e: any) => {
      const pfHistory = e.history?.pf || Array.from({ length: 21 }, () => 1.0)
      const freqHistory = e.history?.freq || Array.from({ length: 21 }, () => 100)
      
      const lastFreq = freqHistory[freqHistory.length - 1]
      const prevFreq = freqHistory[freqHistory.length - 2] || lastFreq
      const lastPf = pfHistory[pfHistory.length - 1]
      const prevPf = pfHistory[pfHistory.length - 2] || lastPf

      return { 
        name: e.name, 
        freq: lastFreq.toFixed(1) + '%', 
        freqTrend: lastFreq >= prevFreq ? 'up' : 'down' as const, 
        pf: lastPf.toFixed(2), 
        pfTrend: lastPf >= prevPf ? 'up' : 'down' as const,
        history: { pf: pfHistory, freq: freqHistory }
      }
    })
  }
  return props.pickedEmotions || []
})

// CHART VIEW STATE (TradingView-style interaction)
const chartView = ref({
  zoomX: 1,
  zoomY: 1,
  offsetX: 0,
  offsetY: 0,
  isPanning: false,
  startX: 0,
  startY: 0,
  startOffsetX: 0,
  startOffsetY: 0
})

function startChartPan(e: MouseEvent) {
  chartView.value.isPanning = true
  chartView.value.startX = e.clientX
  chartView.value.startY = e.clientY
  chartView.value.startOffsetX = chartView.value.offsetX
  chartView.value.startOffsetY = chartView.value.offsetY
  
  const onMove = (me: MouseEvent) => {
    if (!chartView.value.isPanning) return
    const dx = me.clientX - chartView.value.startX
    const dy = me.clientY - chartView.value.startY
    chartView.value.offsetX = chartView.value.startOffsetX - (dx / chartView.value.zoomX)
    chartView.value.offsetY = chartView.value.startOffsetY + (dy / chartView.value.zoomY)
  }
  
  const onUp = () => {
    chartView.value.isPanning = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function handleChartZoom(e: WheelEvent) {
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
  
  if (e.shiftKey) {
    // Zoom Y (Price/Value Scale)
    chartView.value.zoomY = Math.max(0.2, Math.min(20, chartView.value.zoomY * zoomFactor))
  } else {
    // Zoom X (Time Scale)
    chartView.value.zoomX = Math.max(0.2, Math.min(20, chartView.value.zoomX * zoomFactor))
  }
}

function resetChartView() {
  chartView.value.zoomX = 1
  chartView.value.zoomY = 1
  chartView.value.offsetX = 0
  chartView.value.offsetY = 0
}

const showFrequency = ref(true)
const showPF = ref(true)



const hoveredNode = ref<any>(null)
const tooltipPos = ref({ x: 0, y: 0 })

let hoverTimeout: any = null

const miniChartView = ref({
  zoomX: 1, zoomY: 1, offsetX: 0, offsetY: 0,
  isPanning: false, startX: 0, startY: 0, startOffsetX: 0, startOffsetY: 0
})

function startMiniChartPan(e: MouseEvent) {
  miniChartView.value.isPanning = true
  miniChartView.value.startX = e.clientX
  miniChartView.value.startY = e.clientY
  miniChartView.value.startOffsetX = miniChartView.value.offsetX
  miniChartView.value.startOffsetY = miniChartView.value.offsetY
  
  const onMove = (me: MouseEvent) => {
    if (!miniChartView.value.isPanning) return
    const dx = me.clientX - miniChartView.value.startX
    const dy = me.clientY - miniChartView.value.startY
    miniChartView.value.offsetX = miniChartView.value.startOffsetX - (dx / miniChartView.value.zoomX)
    miniChartView.value.offsetY = miniChartView.value.startOffsetY + (dy / miniChartView.value.zoomY)
  }
  
  const onUp = () => {
    miniChartView.value.isPanning = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function handleMiniChartZoom(e: WheelEvent) {
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
  if (e.shiftKey) {
    miniChartView.value.zoomY = Math.max(0.2, Math.min(20, miniChartView.value.zoomY * zoomFactor))
  } else {
    miniChartView.value.zoomX = Math.max(0.2, Math.min(20, miniChartView.value.zoomX * zoomFactor))
  }
}

function handleNodeHover(e: MouseEvent, node: any) {
  if (hoverTimeout) clearTimeout(hoverTimeout)
  const newNode = isRef(node) ? node.value : node
  if (hoveredNode.value !== newNode) {
    miniChartView.value = {
      zoomX: 1, zoomY: 1, offsetX: 0, offsetY: 0,
      isPanning: false, startX: 0, startY: 0, startOffsetX: 0, startOffsetY: 0
    }
  }
  hoveredNode.value = newNode
  tooltipPos.value = { x: e.clientX, y: e.clientY }
}

function handleNodeLeave() {
  hoverTimeout = setTimeout(() => {
    hoveredNode.value = null
  }, 200)
}

function handleTooltipHover() {
  if (hoverTimeout) clearTimeout(hoverTimeout)
}

function handleTooltipLeave() {
  hoverTimeout = setTimeout(() => {
    hoveredNode.value = null
  }, 200)
}

const miniChartPaths = computed(() => {
  if (!hoveredNode.value || !hoveredNode.value.history) return { pf: '', freq: '' }
  const history = hoveredNode.value.history
  const w = 180
  const h = 80
  const maxFreq = Math.max(...history.freq, 100)
  const maxPF = Math.max(...history.pf, 5)
  
  const usableH = h * 0.6 // 60% of the height used for the curve
  const offsetH = h * 0.2 // 20% padding bottom
  const L = history.pf.length || 1

  const { offsetX, offsetY, zoomX, zoomY } = miniChartView.value;

  const pfPoints = history.pf.map((v: number, i: number) => {
    const rawX = L > 1 ? i * (w / (L - 1)) : 0;
    const valueY = (v / maxPF) * usableH;
    return {
      x: (rawX - offsetX) * zoomX,
      y: h - offsetH - ((valueY - offsetY) * zoomY)
    }
  })
  
  const freqPoints = history.freq.map((v: number, i: number) => {
    const rawX = L > 1 ? i * (w / (L - 1)) : 0;
    const valueY = (v / maxFreq) * usableH;
    return {
      x: (rawX - offsetX) * zoomX,
      y: h - offsetH - ((valueY - offsetY) * zoomY)
    }
  })

  return {
    pf: 'M ' + pfPoints.map((p: any) => `${p.x} ${p.y}`).join(' L '),
    freq: 'M ' + freqPoints.map((p: any) => `${p.x} ${p.y}`).join(' L ')
  }
})

// INTERACTION HANDLERS
function startPan(e: MouseEvent) {
  // Don't pan if clicking on a node or if a modal is open
  if ((e.target as HTMLElement).closest('.node-element')) return
  if (equityModalOpen.value || analyticsModalOpen.value) return
  
  viewState.value.isPanning = true
  const startX = e.clientX
  const startY = e.clientY
  const initialPanX = viewState.value.panX
  const initialPanY = viewState.value.panY
  
  const onMouseMove = (mE: MouseEvent) => {
    if (!viewState.value.isPanning) return
    viewState.value.panX = initialPanX + (mE.clientX - startX)
    viewState.value.panY = initialPanY + (mE.clientY - startY)
  }
  
  const onMouseUp = () => {
    viewState.value.isPanning = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }
  
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

const windowSize = ref({ width: window.innerWidth, height: window.innerHeight })
const updateWindowSize = () => {
  windowSize.value = { width: window.innerWidth, height: window.innerHeight }
}

const getIndicatorState = (worldX: number, worldY: number, hubWidth = 256, hubHeight = 96) => {
  const screenX = worldX + viewState.value.panX
  const screenY = worldY + viewState.value.panY
  const padding = 60

  const isOffScreen = 
    screenX + hubWidth < 0 || 
    screenX > windowSize.value.width || 
    screenY + hubHeight < 0 || 
    screenY > windowSize.value.height

  if (!isOffScreen) return null

  // Calculate clamped edge position
  const clampedX = Math.max(padding, Math.min(windowSize.value.width - padding, screenX + hubWidth / 2))
  const clampedY = Math.max(padding, Math.min(windowSize.value.height - padding, screenY + hubHeight / 2))

  // Calculate distance and angle
  const dx = screenX + hubWidth / 2 - clampedX
  const dy = screenY + hubHeight / 2 - clampedY
  const dist = Math.round(Math.sqrt(dx * dx + dy * dy))
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)

  return { x: clampedX, y: clampedY, dist, angle }
}

const entryIndicator = computed(() => getIndicatorState(150, 300))
const exitIndicator = computed(() => getIndicatorState(1200, 700))

function getLinePath(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1
  const midX = x1 + dx / 2
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
}

const connectionColor = computed(() => props.isDark ? '#ffffff' : '#000000')
const connectionOpacity = computed(() => props.isDark ? '0.1' : '0.1')
const mainLinkOpacity = computed(() => props.isDark ? '0.1' : '0.1')

onMounted(() => {
  window.addEventListener('resize', updateWindowSize)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && props.isOpen) {
      emit('close')
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWindowSize)
})

const EMOTION_WEIGHTS: Record<string, number> = {
  // Positive
  'CALMNESS': 15,
  'DISCIPLINE': 25,
  'FOCUS': 20,
  'PATIENCE': 15,
  'CONFIDENCE': 15,
  // Neutral
  'HOPE': -10,
  'BOREDOM': -10,
  'FATIGUE': -15,
  // Negative
  'FOMO': -20,
  'REVENGE': -30,
  'GREED': -20,
  'FEAR': -20,
  'TILT': -40,
  'ANXIETY': -15
}

const calculatedStabilityIndex = computed(() => {
  const emotions = displayEmotions.value
  if (!emotions || emotions.length === 0) {
    return props.emotionalRank ?? 60
  }
  
  let score = 60 // Baseline stability
  emotions.forEach((e: any) => {
    const key = (e.name || '').toUpperCase()
    const weight = EMOTION_WEIGHTS[key] || 0
    score += weight
  })
  
  return Math.min(Math.max(Math.round(score), 0), 100)
})

const emotionalStatus = computed(() => {
  const s = calculatedStabilityIndex.value;
  if (s > 80) return { label: 'OPTIMAL', color: 'bg-emerald-400' };
  if (s > 60) return { label: 'STABLE', color: 'bg-green-300' };
  if (s > 40) return { label: 'NEUTRAL', color: 'bg-yellow-200' };
  if (s > 20) return { label: 'UNSTABLE', color: 'bg-orange-400' };
  return { label: 'CRITICAL', color: 'bg-red-500' };
})
</script>

<template>
  <div v-if="isOpen" 
       class="ethereal-void fixed inset-0 z-[10000] overflow-hidden flex flex-col select-none transition-all duration-1000 backdrop-blur-xl"
       :class="[isDark ? 'is-dark dark theme-dark bg-nier-black/40' : 'theme-light bg-nier-white/40']"
       @mousedown="startPan">
    
    <!-- SYSTEM BACKGROUNDS -->
    <EtherealBackground :is-dark="!!isDark" :is-assembled="true" :show-bloom="false" />
    <DesignVignette :is-dark="!!isDark" />

    <!-- ADAPTIVE BACKGROUND DECORATIONS -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden select-none z-0 opacity-20 dark:opacity-40 nier-text-primary">
      <!-- Tesseract / 3D Wireframe -->
      <div class="absolute -top-[240px] -right-[240px] w-[1152px] h-[1152px] border nier-border-primary rounded-full">
         <div class="absolute inset-[120px] border border-black/5 dark:border-white/5 rotate-45"></div>
         <div class="absolute inset-[240px] border border-black/5 dark:border-white/5 -rotate-12"></div>
      </div>

      <!-- Floating Squares / Tesseracts -->
      <div class="absolute top-1/4 left-10 w-12 h-12 border border-black/20 dark:border-white/20 rotate-12"></div>
      <div class="absolute bottom-1/4 right-10 w-24 h-24 border nier-border-primary -rotate-45"></div>

      <!-- Geometric Pulse Circles -->
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-black/[0.03] dark:border-white/[0.03] rounded-full"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-black/[0.02] dark:border-white/[0.02] rounded-full"></div>
      
      <!-- Tactical Grid Accents -->
      <div class="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,transparent_0%,currentColor_1px,transparent_1px)] bg-[length:40px_40px]"></div>
    </div>
    
    <!-- Global Tactical Corners -->
    <div class="absolute top-12 left-12 w-12 h-12 border-t border-l z-[100] pointer-events-none" :class="isDark ? 'border-white/20' : 'border-black/20'"></div>
    <div class="absolute top-12 right-12 w-12 h-12 border-t border-r z-[100] pointer-events-none" :class="isDark ? 'border-white/20' : 'border-black/20'"></div>
    <div class="absolute bottom-12 left-12 w-12 h-12 border-b border-l z-[100] pointer-events-none" :class="isDark ? 'border-white/20' : 'border-black/20'"></div>
    <div class="absolute bottom-12 right-12 w-12 h-12 border-b border-r z-[100] pointer-events-none" :class="isDark ? 'border-white/20' : 'border-black/20'"></div>

    <!-- HUD Overlay (Fixed) -->
    <div class="absolute inset-0 pointer-events-none z-[100]">
      <!-- Top Center Percentile Rank Label -->
      <div class="absolute top-12 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto z-[200]">
        <div class="px-6 py-2 transition-all duration-500"
             :class="isDark ? 'text-white/40 hover:text-white/70' : 'text-black/40 hover:text-black/70'">
          <span class="text-base font-serif tracking-widest">
            {{ t('tacticalNodeMap.betterThan') }} <span class="font-bold nier-text-primary">{{ percentileRank }}%</span> {{ t('tacticalNodeMap.ofYourTrades') }}
          </span>
        </div>
      </div>

      <!-- Vertical Phantom Menu -->
      <div class="absolute right-12 top-1/2 -translate-y-1/2 flex flex-col items-center p-2.5 space-y-3 pointer-events-auto z-[200] border backdrop-blur-xl shadow-2xl"
           :class="isDark ? 'bg-[#0a0a0a]/30 border-white/10' : 'bg-white/30 border-black/10'">
        
        <!-- View Trade Analytics Reified -->
        <button @click.stop="activeAnalyticsPage = 3; analyticsModalOpen = true"
                class="w-10 h-10 flex items-center justify-center transition-all duration-300 cursor-pointer pointer-events-auto"
                :class="isDark ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-black/5 text-black/50 hover:text-black'"
                :title="t('tacticalNodeMap.viewAnalytics')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 3v18h18" />
            <path d="M7 16l5-5 3 3 5-5" />
            <path d="M17 9h4v4" />
          </svg>
        </button>
        
        <div class="w-6 h-px opacity-20" :class="isDark ? 'bg-white' : 'bg-black'"></div>

        <!-- Close Map Button -->
        <button @click="emit('close')" 
                class="w-10 h-10 flex items-center justify-center transition-all duration-300 hover:bg-red-500/20 text-red-500/70 hover:text-red-500 cursor-pointer"
                :title="t('tacticalNodeMap.terminateLink')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <!-- Off-Screen Indicators -->
      <div v-if="entryIndicator" 
           class="absolute pointer-events-auto flex flex-col items-center transition-all duration-300"
           :style="{ left: entryIndicator.x + 'px', top: entryIndicator.y + 'px', transform: 'translate(-50%, -50%)' }">
        <div class="w-10 h-10 flex items-center justify-center transition-transform duration-100"
             :style="{ transform: `rotate(${entryIndicator.angle}deg)` }">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="drop-shadow-sm" :class="isDark ? 'text-white' : 'text-black'">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="flex flex-col items-center mt-1">
          <span class="text-[8px] font-mono font-bold tracking-widest" :class="isDark ? 'text-white' : 'text-black'">{{ t('tacticalNodeMap.entryHub') }}</span>
          <span class="text-[7px] font-mono opacity-60 font-bold" :class="isDark ? 'text-white' : 'text-black'">{{ entryIndicator.dist }}px</span>
        </div>
      </div>

      <div v-if="exitIndicator" 
           class="absolute pointer-events-auto flex flex-col items-center transition-all duration-300"
           :style="{ left: exitIndicator.x + 'px', top: exitIndicator.y + 'px', transform: 'translate(-50%, -50%)' }">
        <div class="w-10 h-10 flex items-center justify-center transition-transform duration-100"
             :style="{ transform: `rotate(${exitIndicator.angle}deg)` }">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="drop-shadow-sm" :class="isDark ? 'text-white' : 'text-black'">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="flex flex-col items-center mt-1">
          <span class="text-[8px] font-mono font-bold tracking-widest" :class="isDark ? 'text-white' : 'text-black'">{{ t('tacticalNodeMap.exitHub') }}</span>
          <span class="text-[7px] font-mono opacity-60 font-bold" :class="isDark ? 'text-white' : 'text-black'">{{ exitIndicator.dist }}px</span>
        </div>
      </div>
    </div>

    <!-- Infinite Map Canvas -->
    <div class="flex-grow relative w-full h-full" :class="{ 'cursor-grabbing': viewState.isPanning, 'cursor-grab': !viewState.isPanning }">
      <div class="absolute inset-0" :style="contentTransform">
        
        <!-- SVG Connections Layer -->
        <svg class="absolute inset-0 pointer-events-none overflow-visible" 
             style="width: 5000px; height: 5000px;">
          
          <!-- Connections to Entry Conditions -->
          <template v-if="entryHubData">
            <g v-for="cond in entryConditions" :key="'e-line-' + cond.id">
              <path 
                :d="getLinePath(310, 364, cond.x, cond.y + 30)" 
                fill="none" 
                :stroke="connectionColor" 
                :stroke-opacity="connectionOpacity"
                stroke-width="1"
              />
            </g>
          </template>

          <!-- Connections to Exit Conditions -->
          <template v-if="exitHubData">
            <g v-for="cond in exitConditions" :key="'ex-line-' + cond.id">
              <path 
                :d="getLinePath(1360, 764, cond.x + 280, cond.y + 30)" 
                fill="none" 
                :stroke="connectionColor" 
                :stroke-opacity="connectionOpacity"
                stroke-width="1"
              />
            </g>
          </template>

          <!-- Main Hub Neural Link -->
          <path v-if="entryHubData && exitHubData"
            :d="getLinePath(310, 364, 1360, 764)" 
            fill="none" 
            :stroke="connectionColor" 
            :stroke-opacity="mainLinkOpacity"
            stroke-width="0.8" 
          />
        </svg>

        <!-- Scenario Hub: Entry -->
        <div v-if="entryHubData" class="absolute node-element group cursor-pointer" style="left: 150px; top: 300px;" 
             @mouseenter="handleNodeHover($event, entryHubData)"
             @mouseleave="handleNodeLeave">
          <div class="relative w-[320px] h-32 backdrop-blur-sm flex flex-col justify-center p-6 transition-all duration-700 shadow-2xl"
               :class="[isDark ? 'bg-[#0a0a0a]/10 border-2 border-nier-border-dark group-hover:border-nier-text-dark' : 'bg-white/10 border-2 border-nier-border-light group-hover:border-nier-text-light']">
            <div class="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 opacity-60" :class="isDark ? 'border-nier-text-dark' : 'border-black'"></div>
            <div class="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 opacity-60" :class="isDark ? 'border-nier-text-dark' : 'border-black'"></div>
            <div class="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 opacity-60" :class="isDark ? 'border-nier-text-dark' : 'border-black'"></div>
            <div class="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 opacity-60" :class="isDark ? 'border-nier-text-dark' : 'border-black'"></div>
            
            <div class="mb-4 text-center w-full px-2">
              <div class="text-xl font-black uppercase tracking-widest truncate" :class="isDark ? 'text-white' : 'text-black'">{{ entryHubData.name }}</div>
            </div>

            <div class="flex items-center justify-around w-full border-t nier-border-primary pt-4">
              <div class="flex flex-col items-center">
                <span class="text-[8px] font-mono opacity-40 uppercase mb-1" :class="isDark ? 'text-white' : 'text-black'">{{ t('tacticalNodeMap.frequency') }}</span>
                <div class="flex items-center space-x-1">
                  <span class="text-xs font-mono font-bold" :class="isDark ? 'text-white' : 'text-black'">{{ entryHubData.freq }}</span>
                  <svg v-if="entryHubData.freqTrend === 'up'" width="10" height="10" viewBox="0 0 24 24" fill="none" class="text-green-500"><path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <svg v-else width="10" height="10" viewBox="0 0 24 24" fill="none" class="text-red-500"><path d="M7 7L17 17M17 17V7M17 17H7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
              </div>
              <div class="flex flex-col items-center">
                <span class="text-[8px] font-mono opacity-40 uppercase mb-1" :class="isDark ? 'text-white' : 'text-black'">{{ t('tacticalNodeMap.pfRatio') }}</span>
                <div class="flex items-center space-x-1">
                  <span class="text-xs font-mono font-bold" :class="isDark ? 'text-white' : 'text-black'">{{ entryHubData.pf }}</span>
                  <svg v-if="entryHubData.pfTrend === 'up'" width="10" height="10" viewBox="0 0 24 24" fill="none" class="text-green-500"><path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <svg v-else width="10" height="10" viewBox="0 0 24 24" fill="none" class="text-red-500"><path d="M7 7L17 17M17 17V7M17 17H7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Scenario Hub: Exit -->
        <div v-if="exitHubData" class="absolute node-element group cursor-pointer" style="left: 1200px; top: 700px;" 
             @mouseenter="handleNodeHover($event, exitHubData)"
             @mouseleave="handleNodeLeave">
          <div class="relative w-[320px] h-32 backdrop-blur-sm flex flex-col justify-center p-6 transition-all duration-700 shadow-2xl"
               :class="[isDark ? 'bg-[#0a0a0a]/10 border-2 border-nier-border-dark group-hover:border-nier-text-dark' : 'bg-white/10 border-2 border-nier-border-light group-hover:border-nier-text-light']">
            <div class="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 opacity-60" :class="isDark ? 'border-nier-text-dark' : 'border-black'"></div>
            <div class="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 opacity-60" :class="isDark ? 'border-nier-text-dark' : 'border-black'"></div>
            <div class="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 opacity-60" :class="isDark ? 'border-nier-text-dark' : 'border-black'"></div>
            <div class="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 opacity-60" :class="isDark ? 'border-nier-text-dark' : 'border-black'"></div>
            
            <div class="mb-4 text-center w-full px-2">
              <div class="text-xl font-black uppercase tracking-widest truncate" :class="isDark ? 'text-white' : 'text-black'">{{ exitHubData.name }}</div>
            </div>

            <div class="flex items-center justify-around w-full border-t nier-border-primary pt-4">
              <div class="flex flex-col items-center">
                <span class="text-[8px] font-mono opacity-40 uppercase mb-1" :class="isDark ? 'text-white' : 'text-black'">{{ t('tacticalNodeMap.frequency') }}</span>
                <div class="flex items-center space-x-1">
                  <span class="text-xs font-mono font-bold" :class="isDark ? 'text-white' : 'text-black'">{{ exitHubData.freq }}</span>
                  <svg v-if="exitHubData.freqTrend === 'up'" width="10" height="10" viewBox="0 0 24 24" fill="none" class="text-green-500"><path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <svg v-else width="10" height="10" viewBox="0 0 24 24" fill="none" class="text-red-500"><path d="M7 7L17 17M17 17V7M17 17H7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
              </div>
              <div class="flex flex-col items-center">
                <span class="text-[8px] font-mono opacity-40 uppercase mb-1" :class="isDark ? 'text-white' : 'text-black'">{{ t('tacticalNodeMap.pfRatio') }}</span>
                <div class="flex items-center space-x-1">
                  <span class="text-xs font-mono font-bold" :class="isDark ? 'text-white' : 'text-black'">{{ exitHubData.pf }}</span>
                  <svg v-if="exitHubData.pfTrend === 'up'" width="10" height="10" viewBox="0 0 24 24" fill="none" class="text-green-500"><path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <svg v-else width="10" height="10" viewBox="0 0 24 24" fill="none" class="text-red-500"><path d="M7 7L17 17M17 17V7M17 17H7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Distributed Condition Nodes: Entry -->
        <div v-for="cond in entryConditions" :key="cond.id"
             class="absolute node-element min-w-[280px] border p-4 flex items-center justify-between group cursor-pointer transition-all duration-500 backdrop-blur-sm shadow-xl"
             :class="[isDark ? 'bg-[#0a0a0a]/5 border-white/10 hover:border-white' : 'bg-white/5 border-black/10 hover:border-black']"
             :style="{ left: cond.x + 'px', top: cond.y + 'px' }"
             @mouseenter="handleNodeHover($event, cond)"
             @mouseleave="handleNodeLeave">
          <div class="flex flex-col mr-8">
            <span class="text-[11px] font-mono uppercase tracking-widest font-black" :class="isDark ? 'text-white' : 'text-black'">{{ cond.name }}</span>
          </div>

          <div class="flex flex-col space-y-1">
            <div class="flex items-center justify-end space-x-2">
              <span class="text-[7px] font-mono opacity-30" :class="isDark ? 'text-white' : 'text-black'">{{ t('tacticalNodeMap.freqShort') }}</span>
              <div class="flex items-center space-x-0.5">
                <span class="text-[9px] font-mono font-bold" :class="isDark ? 'text-white' : 'text-black'">{{ cond.freq }}</span>
                <svg v-if="cond.freqTrend === 'up'" width="8" height="8" viewBox="0 0 24 24" fill="none" class="text-green-500"><path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <svg v-else width="8" height="8" viewBox="0 0 24 24" fill="none" class="text-red-500"><path d="M7 7L17 17M17 17V7M17 17H7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
            </div>
            <div class="flex items-center justify-end space-x-2">
              <span class="text-[7px] font-mono opacity-30" :class="isDark ? 'text-white' : 'text-black'">{{ t('tacticalNodeMap.pfShort') }}</span>
              <div class="flex items-center space-x-0.5">
                <span class="text-[9px] font-mono font-bold" :class="isDark ? 'text-white' : 'text-black'">{{ cond.pf }}</span>
                <svg v-if="cond.pfTrend === 'up'" width="8" height="8" viewBox="0 0 24 24" fill="none" class="text-green-500"><path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <svg v-else width="8" height="8" viewBox="0 0 24 24" fill="none" class="text-red-500"><path d="M7 7L17 17M17 17V7M17 17H7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Distributed Condition Nodes: Exit -->
        <div v-for="cond in exitConditions" :key="cond.id"
             class="absolute node-element min-w-[280px] border p-4 flex items-center justify-between group cursor-pointer transition-all duration-500 backdrop-blur-sm shadow-xl"
             :class="[isDark ? 'bg-[#0a0a0a]/5 border-white/10 hover:border-white' : 'bg-white/5 border-black/10 hover:border-black']"
             :style="{ left: cond.x + 'px', top: cond.y + 'px' }"
             @mouseenter="handleNodeHover($event, cond)"
             @mouseleave="handleNodeLeave">
          
          <div class="flex flex-col space-y-1">
            <div class="flex items-center justify-start space-x-2">
              <div class="flex items-center space-x-0.5">
                <svg v-if="cond.freqTrend === 'up'" width="8" height="8" viewBox="0 0 24 24" fill="none" class="text-green-500"><path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <svg v-else width="8" height="8" viewBox="0 0 24 24" fill="none" class="text-red-500"><path d="M7 7L17 17M17 17V7M17 17H7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span class="text-[9px] font-mono font-bold" :class="isDark ? 'text-white' : 'text-black'">{{ cond.freq }}</span>
              </div>
              <span class="text-[7px] font-mono opacity-30" :class="isDark ? 'text-white' : 'text-black'">{{ t('tacticalNodeMap.freqShort') }}</span>
            </div>
            <div class="flex items-center justify-start space-x-2">
              <div class="flex items-center space-x-0.5">
                <svg v-if="cond.pfTrend === 'up'" width="8" height="8" viewBox="0 0 24 24" fill="none" class="text-green-500"><path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <svg v-else width="8" height="8" viewBox="0 0 24 24" fill="none" class="text-red-500"><path d="M7 7L17 17M17 17V7M17 17H7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span class="text-[9px] font-mono font-bold" :class="isDark ? 'text-white' : 'text-black'">{{ cond.pf }}</span>
              </div>
              <span class="text-[7px] font-mono opacity-30" :class="isDark ? 'text-white' : 'text-black'">{{ t('tacticalNodeMap.pfShort') }}</span>
            </div>
          </div>

          <div class="flex flex-col items-end ml-8">
            <span class="text-[11px] font-mono uppercase tracking-widest font-black" :class="isDark ? 'text-white' : 'text-black'">{{ cond.name }}</span>
          </div>
        </div>

      </div>
    </div>

    <!-- Equity Impact Modal -->
    <div v-if="equityModalOpen" 
         class="absolute inset-0 z-[20000] bg-white/30 dark:bg-black/20 backdrop-blur-sm flex items-center justify-center pointer-events-auto"
         @mousedown.stop
         @click="equityModalOpen = false">
      <div class="relative w-[1100px] h-[600px] bg-white/75 dark:bg-[#0a0a0a]/75 backdrop-blur-xl border nier-border-primary p-8 shadow-2xl overflow-visible nier-text-primary" @click.stop>
        <!-- Tactical Corners -->
        <div class="absolute -top-1 -left-1 w-6 h-6 border-t border-l opacity-60 z-50 border-black/30 dark:border-white/30"></div>
        <div class="absolute -top-1 -right-1 w-6 h-6 border-t border-r opacity-60 z-50 border-black/30 dark:border-white/30"></div>
        <div class="absolute -bottom-1 -left-1 w-6 h-6 border-b border-l opacity-60 z-50 border-black/30 dark:border-white/30"></div>
        <div class="absolute -bottom-1 -right-1 w-6 h-6 border-b border-r opacity-60 z-50 border-black/30 dark:border-white/30"></div>
        
        <!-- Close Button -->
        <button @click="equityModalOpen = false" class="absolute top-4 right-4 z-50 w-8 h-8 flex items-center justify-center border border-dashed nier-border-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all nier-text-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <ExEquityCurve2D :trades="equityTrades" :initialBalance="currentInitialDeposit" />
      </div>
    </div>

    <!-- Trade Analytics Reified Modal -->
    <div v-if="analyticsModalOpen" 
         class="absolute inset-0 z-[20000] bg-white/30 dark:bg-black/20 backdrop-blur-sm flex items-center justify-center pointer-events-auto"
         @mousedown.stop
         @click="analyticsModalOpen = false">
      <div class="w-[1100px] h-[85vh]" @click.stop>
        <ExTradeAnalysisPanel 
          :trade="props.trade" 
          :global-stability="calculatedStabilityIndex" 
          :initial-page="activeAnalyticsPage" 
          :initial-expanded-note-id="props.initialExpandedNoteId" 
          @close="analyticsModalOpen = false" 
        />
      </div>
    </div>

    <!-- Hover Mini-Chart Tooltip -->
    <Teleport to="body">
      <Transition name="fade-tooltip">
        <div v-if="hoveredNode" 
             class="fixed z-[100000] pointer-events-auto shadow-xl backdrop-blur-xl rounded-sm select-none"
             @mouseenter="handleTooltipHover"
             @mouseleave="handleTooltipLeave"
             :class="isDark ? 'bg-[#0a0a0a]/60 border border-white/20' : 'bg-white/40 border border-black/20'"
             :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px', transform: 'translate(20px, -50%)' }">
          <!-- Node Name Header -->
          <div class="px-4 py-2 border-b flex items-center justify-between"
               :class="isDark ? 'border-white/5 bg-white/[0.02]' : 'border-black/5 bg-black/[0.02]'">
            <span class="text-[8px] font-mono font-bold tracking-[0.2em] uppercase opacity-70"
                  :class="isDark ? 'text-white' : 'text-black'">
              {{ hoveredNode.name }}
            </span>
            <div class="flex items-center space-x-1">
              <div class="w-1 h-1 rounded-full animate-pulse" :class="isDark ? 'bg-white' : 'bg-black'"></div>
              <span class="text-[6px] font-mono opacity-30 uppercase tracking-widest">{{ t('tacticalNodeMap.liveAnalysis') }}</span>
            </div>
          </div>
          
          <!-- Mini SVG Chart (Curves Only) -->
          <div class="w-[320px] h-[140px] relative overflow-hidden cursor-crosshair"
               @mousedown="startMiniChartPan"
               @wheel.prevent="handleMiniChartZoom">
            <svg class="w-full h-full p-4 overflow-visible" viewBox="0 0 180 80">
              <!-- Frequency Dash -->
              <path :d="miniChartPaths.freq" fill="none" stroke-width="1.2" stroke-dasharray="4,2" 
                    :class="isDark ? 'stroke-white opacity-30' : 'stroke-black opacity-30'" />
              <!-- PF Line -->
              <path :d="miniChartPaths.pf" fill="none" stroke-width="2" 
                    :class="isDark ? 'stroke-white' : 'stroke-black'" />
            </svg>
          </div>

          <!-- Minimal Footer Legend -->
          <div class="flex items-center justify-between px-4 py-2 border-t"
               :class="isDark ? 'border-white/5 bg-white/[0.02]' : 'border-black/5 bg-black/[0.02]'">
            <div class="flex items-center space-x-4">
              <div class="flex items-center space-x-2">
                <div class="w-4 h-0 border-t border-dashed" :class="isDark ? 'border-white/40' : 'border-black/40'"></div>
                <div class="flex flex-col">
                  <span class="text-[6px] font-mono opacity-30 uppercase tracking-widest"
                        :class="isDark ? 'text-white' : 'text-black'">{{ t('tacticalNodeMap.freqShort') }}</span>
                  <span class="text-[9px] font-mono font-bold"
                        :class="isDark ? 'text-white' : 'text-black'">{{ hoveredNode.freq }}</span>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-4 h-px" :class="isDark ? 'bg-white' : 'bg-black'"></div>
                <div class="flex flex-col">
                  <span class="text-[6px] font-mono opacity-30 uppercase tracking-widest"
                        :class="isDark ? 'text-white' : 'text-black'">{{ t('tacticalNodeMap.pfRatio') }}</span>
                  <span class="text-[9px] font-mono font-bold"
                        :class="isDark ? 'text-white' : 'text-black'">{{ hoveredNode.pf }}</span>
                </div>
              </div>
            </div>
            <span class="text-[6px] font-mono opacity-20 uppercase tracking-tighter"
                  :class="isDark ? 'text-white' : 'text-black'">{{ t('tacticalNodeMap.liveHistory') }}</span>
          </div>

          <!-- Tactical Corners -->
          <div class="absolute -top-1 -left-1 w-3 h-3 border-t border-l" :class="isDark ? 'border-white/30' : 'border-black'"></div>
          <div class="absolute -top-1 -right-1 w-3 h-3 border-t border-r" :class="isDark ? 'border-white/30' : 'border-black'"></div>
          <div class="absolute -bottom-1 -left-1 w-3 h-3 border-b border-l" :class="isDark ? 'border-white/30' : 'border-black'"></div>
          <div class="absolute -bottom-1 -right-1 w-3 h-3 border-b border-r" :class="isDark ? 'border-white/30' : 'border-black'"></div>
        </div>
      </Transition>
    </Teleport>

    <!-- Bottom Emotional Rank Stability Index -->
    <div v-if="isOpen" 
         class="fixed bottom-12 left-1/2 -translate-x-1/2 z-[10001] flex flex-col items-center">
      
      <!-- THE CIRCULAR GAUGE -->
      <div class="relative w-24 h-24 flex items-center justify-center shrink-0 group/gauge cursor-pointer">
         <!-- Atmosphere Glow -->
         <div class="absolute inset-0 rounded-full transition-all duration-1000 opacity-20 blur-2xl scale-125" :class="emotionalStatus.color"></div>
         
         <!-- Rotating Outer Ring -->
         <div class="absolute inset-0 rounded-full border border-current border-dashed animate-[spin_30s_linear_infinite] opacity-20" :class="isDark ? 'text-white' : 'text-black'"></div>
         <div class="absolute inset-3 rounded-full border border-current opacity-10 -rotate-45" :class="isDark ? 'text-white' : 'text-black'"></div>
         
         <!-- The Core Gauge -->
         <div class="relative w-16 h-16 rounded-full flex flex-col items-center justify-center overflow-hidden transition-all duration-700 group-hover/gauge:scale-110 shadow-2xl z-10"
              :class="emotionalStatus.color">
            <!-- Noise Overlay -->
            <div class="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
            
            <span class="text-xl font-serif italic nier-text-primary leading-none drop-shadow-md">{{ calculatedStabilityIndex }}</span>
            
            <!-- Scanning effect -->
            <div class="absolute inset-0 bg-white/10 animate-[scan_4s_linear_infinite] pointer-events-none"></div>
         </div>

         <!-- HUD Brackets -->
         <div class="absolute -inset-1 border-l border-t border-current w-4 h-4 opacity-20" :class="isDark ? 'text-white' : 'text-black'"></div>
         <div class="absolute -inset-1 bottom-auto left-auto border-r border-t border-current w-4 h-4 opacity-20" :class="isDark ? 'text-white' : 'text-black'"></div>
         <div class="absolute -inset-1 top-auto right-auto border-l border-b border-current w-4 h-4 opacity-20" :class="isDark ? 'text-white' : 'text-black'"></div>
         <div class="absolute -inset-1 top-auto left-auto border-r border-b border-current w-4 h-4 opacity-20" :class="isDark ? 'text-white' : 'text-black'"></div>

         <!-- EMOTIONS LIST OVERLAY (Revealed on hover) -->
         <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-6 pointer-events-none group-hover/gauge:pointer-events-auto opacity-0 group-hover/gauge:opacity-100 translate-y-4 group-hover/gauge:translate-y-0 transition-all duration-700 w-64">
            <div class="flex flex-col space-y-2">
               
               <div v-for="emotion in displayEmotions" :key="emotion.name" 
                    class="relative flex items-center justify-between px-4 py-3 border backdrop-blur-md transition-all duration-500 shadow-xl"
                    :class="[
                      isDark ? 'bg-[#0a0a0a]/40 border-white/10 hover:border-white' : 'bg-white/40 border-black/10 hover:border-black'
                    ]"
                    @mouseenter="handleNodeHover($event, emotion)"
                    @mouseleave="handleNodeLeave">
                  <!-- Mini Corners -->
                  <div class="absolute -top-[1px] -left-[1px] w-1.5 h-1.5 border-t border-l opacity-40" :class="isDark ? 'border-white' : 'border-black'"></div>
                  <div class="absolute -bottom-[1px] -right-[1px] w-1.5 h-1.5 border-b border-r opacity-40" :class="isDark ? 'border-white' : 'border-black'"></div>

                  <div class="flex flex-col">
                    <span class="text-[11px] font-mono font-black uppercase tracking-widest" :class="isDark ? 'text-white' : 'text-black'">{{ emotion.name }}</span>
                  </div>

                  <div class="flex flex-col space-y-1 items-end">
                    <div class="flex items-center space-x-2">
                      <span class="text-[7px] font-mono opacity-30" :class="isDark ? 'text-white' : 'text-black'">{{ t('tacticalNodeMap.freqShort') }}</span>
                      <div class="flex items-center space-x-0.5">
                        <span class="text-[9px] font-mono font-bold" :class="isDark ? 'text-white' : 'text-black'">{{ emotion.freq }}</span>
                        <svg v-if="emotion.freqTrend === 'up'" width="8" height="8" viewBox="0 0 24 24" fill="none" class="text-green-500"><path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        <svg v-else width="8" height="8" viewBox="0 0 24 24" fill="none" class="text-red-500"><path d="M7 7L17 17M17 17V7M17 17H7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      </div>
                    </div>
                    <div class="flex items-center space-x-2">
                      <span class="text-[7px] font-mono opacity-30" :class="isDark ? 'text-white' : 'text-black'">{{ t('tacticalNodeMap.pfShort') }}</span>
                      <div class="flex items-center space-x-0.5">
                        <span class="text-[9px] font-mono font-bold" :class="isDark ? 'text-white' : 'text-black'">{{ emotion.pf }}</span>
                        <svg v-if="emotion.pfTrend === 'up'" width="8" height="8" viewBox="0 0 24 24" fill="none" class="text-green-500"><path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        <svg v-else width="8" height="8" viewBox="0 0 24 24" fill="none" class="text-red-500"><path d="M7 7L17 17M17 17V7M17 17H7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      </div>
                    </div>
                  </div>
               </div>
            </div>

            <!-- Connection Line to Gauge -->
            <div class="h-6 w-px bg-current mx-auto opacity-20 mt-2" :class="isDark ? 'text-white' : 'text-black'"></div>
         </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.ethereal-void {
  perspective: 1000px;
}

.node-element {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.node-element:hover {
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.dark .node-element:hover {
  box-shadow: 0 0 50px rgba(255, 255, 255, 0.03);
}

.ethereal-void {
  background-color: transparent !important;
}


/* Explicit backdrop-filter support for WebKit/Tauri */
[class*='backdrop-blur'] {
  backdrop-filter: blur(var(--blur-amount, 8px));
  -webkit-backdrop-filter: blur(var(--blur-amount, 8px));
}

.backdrop-blur-sm { --blur-amount: 4px; }
.backdrop-blur-md { --blur-amount: 12px; }
.backdrop-blur-lg { --blur-amount: 16px; }
.backdrop-blur-xl { --blur-amount: 24px; }
.backdrop-blur-2xl { --blur-amount: 40px; }
.backdrop-blur-3xl { --blur-amount: 64px; }

.fade-tooltip-enter-active, .fade-tooltip-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-tooltip-enter-from, .fade-tooltip-leave-to {
  opacity: 0;
  transform: translate(10px, -50%) scale(0.95) !important;
}

@keyframes scan {
  0% { transform: translateY(-100%); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateY(100%); opacity: 0; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes scan-x {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* BACKGROUND DECORATION ANIMATIONS */
@keyframes slow-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes reverse-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(12deg); }
  50% { transform: translateY(-20px) rotate(15deg); }
}

@keyframes float-delayed {
  0%, 100% { transform: translateY(0) rotate(-45deg); }
  50% { transform: translateY(20px) rotate(-40deg); }
}

@keyframes pulse-slow {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
  50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.1; }
}

@keyframes orbit {
  0% { transform: rotate(0deg) translateX(50px) rotate(0deg); opacity: 0; }
  25% { opacity: 1; }
  75% { opacity: 1; }
  100% { transform: rotate(360deg) translateX(50px) rotate(-360deg); opacity: 0; }
}

.animate-slow-rotate {
  animation: slow-rotate 60s linear infinite;
}

.animate-reverse-rotate {
  animation: reverse-rotate 40s linear infinite;
}

.animate-float {
  animation: float 8s ease-in-out infinite;
}

.animate-float-delayed {
  animation: float-delayed 10s ease-in-out infinite;
}

.animate-pulse-slow {
  animation: pulse-slow 15s ease-in-out infinite;
}

.animate-orbit {
  animation: orbit 20s linear infinite;
}
</style>
