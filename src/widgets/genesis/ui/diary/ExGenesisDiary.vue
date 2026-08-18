<template>
  <div class="diary-3d-hub h-full w-full relative overflow-hidden bg-transparent text-white" ref="container">
    
    <!-- CANVAS LAYER (Shared) -->
    <canvas ref="canvasRef"
            class="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-30"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
            @mouseleave="handleMouseUp"
            @wheel="handleWheel">
    </canvas>

    <!-- STATS PANEL LAYER -->
    <div v-if="viewMode === 'stats'" class="absolute inset-0 z-40 flex flex-col p-24 pt-32 pointer-events-none">
      
      <!-- TOP RESTORE BUTTON (Black) -->
      <div v-if="!isEquityVisible && !isTradeEntryOpen" 
           class="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-auto z-[120] transition-all duration-700">
         <button @click="showEquity"
                 class="bg-black text-white text-[10px] font-mono tracking-[0.5em] uppercase px-10 py-3 border border-white/20 hover:bg-white hover:text-black transition-all shadow-[0_0_30px_rgba(0,0,0,0.5)] animate-pulse">
           [ RESTORE_SYSTEM_PROJECTION ]
         </button>
      </div>

      <!-- Scanline Overlay -->
      <div v-if="isEquityVisible && !isTradeEntryOpen" 
           class="absolute inset-0 pointer-events-none opacity-[0.03] z-50 mix-blend-overlay"
           style="background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px);"></div>

      <!-- EQUITY LABELS -->
      <div v-if="!isTradeEntryOpen" class="absolute top-32 left-16 flex flex-col z-10 pointer-events-none p-4">
        <template v-if="isEquityVisible">
          <div class="flex items-center space-x-3 mb-2">
             <div class="w-1.5 h-1.5 bg-[#333333] rotate-45 animate-pulse"></div>
             <span class="text-[10px] font-mono tracking-[0.5em] uppercase text-[#333333]/60 font-black">
                SYSTEM_EQUITY_PROJECTION // 3D_ROTATION_ACTIVE
             </span>
          </div>
          <div class="h-[1px] w-64 bg-[#333333]/20 mb-4"></div>
          <span class="text-6xl font-mono text-[#333333] tracking-tighter font-bold drop-shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            {{ finalBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }}
          </span>
        </template>

        <div class="flex flex-col space-y-2 mt-8 pointer-events-auto">
          <button v-if="isEquityVisible"
                  @click="resetView" 
                  class="text-[9px] font-mono tracking-[0.4em] uppercase text-[#333333]/40 hover:text-[#333333] border border-[#333333]/10 px-6 py-2 transition-all w-fit hover:bg-[#333333]/5">
            [ RE-CENTER_VIEW ]
          </button>
        </div>
      </div>
    </div>

    <!-- CUBE LAYER (UI ONLY) -->
    <div class="w-full h-full absolute inset-0 transition-opacity duration-700 pointer-events-none"
         :class="viewMode === 'cube' ? 'opacity-100 z-40' : 'opacity-0 z-0'">
      
      <!-- HUD Telemetry -->
      <div class="absolute top-8 right-8 flex flex-col items-end space-y-1 opacity-20 pointer-events-none">
         <span class="text-[8px] font-mono tracking-widest uppercase text-slate-400">System_Neural_CUBE // REIFICATION_v4</span>
         <div class="h-px w-32 bg-slate-500/50"></div>
         <span class="text-[7px] font-mono tracking-widest uppercase text-slate-400">Facet: {{ currentFace + 1 }} / Status: {{ isTransitioning ? 'ROTATING...' : 'LOCKED' }}</span>
      </div>

      <!-- Facet Navigation (Only in cube mode and only if more than 1 facet has data) -->
      <div v-if="viewMode === 'cube' && activeFaceIndices.length > 1" class="absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-6 pointer-events-auto">
          <div class="flex items-center space-x-12">
             <div class="flex flex-col items-center">
                <div class="flex space-x-2 mt-2">
                   <div v-for="faceIdx in activeFaceIndices" :key="faceIdx"
                        class="w-1.5 h-1.5 border border-slate-500 transition-all rotate-45"
                        :class="faceIdx === currentFace ? 'bg-sky-400/80 border-sky-300 scale-125 shadow-[0_0_8px_rgba(56,189,248,0.5)]' : 'bg-transparent opacity-20'">
                   </div>
                </div>
             </div>
          </div>
         
         <span class="text-[7px] font-mono text-slate-500 opacity-40 tracking-[0.6em] uppercase">
            Neural_Facet_Archive // {{ activeFaceIndices.length }} Active_Facets
         </span>
      </div>
    </div>
 
    <!-- STEALTH TACTICAL TRIGGER (Bottom Hover Zone) -->
    <div v-if="isEquityVisible && !isTradeEntryOpen" 
         class="absolute bottom-0 left-0 right-0 h-32 z-[100] flex items-center justify-center pointer-events-auto group">
       
       <div class="opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700 pointer-events-auto">
          <button @click="isTradeEntryOpen = true"
                  class="w-14 h-14 flex items-center justify-center border-2 border-white/40 bg-black backdrop-blur-md hover:bg-white hover:text-black transition-all group/btn relative shadow-[0_0_40px_rgba(0,0,0,0.5)]">
             
             <!-- Nier Corner Accents -->
             <div class="absolute -top-2 -left-2 w-3 h-3 border-t-2 border-l-2 border-white/60"></div>
             <div class="absolute -bottom-2 -right-2 w-3 h-3 border-b-2 border-r-2 border-white/60"></div>
             
             <!-- Inner Tactical Accents -->
             <div class="absolute inset-0 border border-white/10 m-[3px] pointer-events-none"></div>
             
             <span class="text-3xl font-light leading-none transition-transform duration-500 group-hover/btn:rotate-90">+</span>
             
             <!-- Tactical Tooltip (Hover) -->
             <div class="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover/btn:opacity-100 transition-all duration-500 pointer-events-none">
                <span class="text-[8px] font-mono tracking-[0.8em] text-white/50 uppercase whitespace-nowrap font-black">INIT_ENTRY_PROTOCOL</span>
             </div>
          </button>
       </div>
    </div>

  </div>

  <Transition name="page-reify">
     <ExTradeEntry v-if="isTradeEntryOpen" 
                   class="absolute inset-0 z-[1000]"
                   @close="isTradeEntryOpen = false" 
                   @addTrade="isTradeEntryOpen = false" />
  </Transition>
</template>



<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import ExTradeEntry from '~/widgets/genesis/ui/trade-entry/ExTradeEntry.vue'
import { useStrategyTradesStore } from '~/features/store/useStrategyTrades'
import { useGenesisTrades, useGenesisMatrixData } from '~/entities/genesis'

const genesisTrades = useGenesisTrades()
const genesisMatrix = useGenesisMatrixData()



const props = defineProps<{
  viewMode: 'stats' | 'cube'
}>()

// --- 3D MATH TYPES --- //
interface Point3D { x: number; y: number; z: number }
interface Point2D { x: number; y: number; opacity: number; depth: number }

interface TradeNode {
  id: string
  label: string
  faceIndex: number
  localPos: { x: number; y: number } // -100 to 100
  worldPos: Point3D
  neighbors?: number[]
}

// --- STATE --- //
const canvasRef = ref<HTMLCanvasElement | null>(null)
const currentFace = ref(0)
const isTransitioning = ref(false)
const isEquityVisible = ref(true)
const route = useRoute()
const router = useRouter()
const isTradeEntryOpen = ref(route.query.entry === 'true')

watch(isTradeEntryOpen, (isOpen) => {
  router.push({ 
    query: { 
      ...route.query, 
      entry: isOpen ? 'true' : undefined 
    } 
  })
})


// Cube rotation state (Defaults to flat 2D for stats)
const targetRotation = ref({ x: 0, y: 0 }) 
const currentRotation = ref({ x: 0, y: 0 })

// Trade mapping
const facesTrades = ref<TradeNode[][]>([[], [], [], [], [], []])
const internalNodes = ref<TradeNode[]>([])
const atmosphericLines = ref<{x: number, z: number, y: number, length: number, speed: number}[]>([])
const revealProgress = ref(0)

// Equity Curve Points
interface CurvePoint extends Point3D { value: number; dateLabel: string }
const equityPoints3D = ref<CurvePoint[]>([])
const hoveredCurveIndex = ref<number | null>(null)

const finalBalance = computed(() => {
  const total = equityPoints3D.value[equityPoints3D.value.length - 1]?.value ?? 1000
  return total * revealProgress.value
})

const activeFaceIndices = computed(() => {
  return facesTrades.value
    .map((face, index) => face.some(n => !n.id.startsWith('ghost_')) ? index : -1)
    .filter(index => index !== -1)
})



const tradeStore = useStrategyTradesStore()
const selectedStrategyId = computed({
  get: () => tradeStore.selectedStrategyId,
  set: (val) => { tradeStore.selectedStrategyId = val }
})
const selectedStrategy = computed(() => {
  return tradeStore.strategies.find(s => s.id === selectedStrategyId.value) || tradeStore.strategies[0]
})
const strategies = computed(() => tradeStore.strategies)
const isHUDHovered = ref(false)
const isDropdownOpen = ref(false)

watch(() => props.viewMode, (newMode) => {
  if (newMode === 'stats') {
    resetView()
    revealProgress.value = 0 // Re-animate equity curve on entry
  } else if (newMode === 'cube') {
    switchFace(0)
  }
})

// Immediate update when trades are added or strategy changes
watch([selectedStrategyId, () => tradeStore.tradesByStrategy[selectedStrategyId.value], () => tradeStore.hiddenTradeIdsByStrategy[selectedStrategyId.value]], () => {
  initTrades()
}, { deep: true })

const mousePos = ref({ x: 0, y: 0 })
const viewScale = ref(2.2) 
const isPanning = ref(false)
const lastMousePos = ref({ x: 0, y: 0 })
const viewOffset = ref({ x: 0, y: 0 })

const hideEquity = () => {
  isEquityVisible.value = false
}

const showEquity = () => {
  isEquityVisible.value = true
  revealProgress.value = 0
}

// --- INITIALIZATION --- //
const calculateWorldPos = (faceIndex: number, localX: number, localY: number): Point3D => {
  const S = 100
  switch(faceIndex) {
    case 0: return { x: localX, y: localY, z: -S } // Front
    case 1: return { x: S, y: localY, z: localX }  // Right
    case 2: return { x: -localX, y: localY, z: S } // Back
    case 3: return { x: -S, y: localY, z: -localX } // Left
    case 4: return { x: localX, y: -S, z: localY } // Top
    case 5: return { x: localX, y: S, z: -localY } // Bottom
    default: return { x: 0, y: 0, z: 0 }
  }
}

const switchFace = (newIndex: number) => {
  currentFace.value = newIndex
  isTransitioning.value = true
  
  switch(newIndex) {
    case 0: targetRotation.value.x = 0; targetRotation.value.y = 0; break;
    case 1: targetRotation.value.x = 0; targetRotation.value.y = Math.PI / 2; break;
    case 2: targetRotation.value.x = 0; targetRotation.value.y = Math.PI; break;
    case 3: targetRotation.value.x = 0; targetRotation.value.y = -Math.PI / 2; break;
    case 4: targetRotation.value.x = Math.PI / 2; targetRotation.value.y = 0; break;
    case 5: targetRotation.value.x = -Math.PI / 2; targetRotation.value.y = 0; break;
  }
  
  setTimeout(() => { isTransitioning.value = false }, 800)
}

const initTrades = () => {
  // --- CUBE INITIALIZATION --- //
  const currentTrades = tradeStore.getTradesForStrategy(selectedStrategyId.value)
  const tradesForCube = [...currentTrades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  for (let i = 0; i < 6; i++) {
    const realTradesForThisFace = tradesForCube.slice(i * 40, (i + 1) * 40)
    const nodes: TradeNode[] = []
    
    realTradesForThisFace.forEach((t) => {
      const localX = (Math.random() - 0.5) * 160
      const localY = (Math.random() - 0.5) * 160
      nodes.push({
        id: t.id!,
        label: `${String(t.asset || '').toUpperCase()} [${(t.profitInCurrency ?? 0) >= 0 ? '+' : ''}${t.profitInCurrency ?? 0}$]`,
        faceIndex: i,
        localPos: { x: localX, y: localY },
        worldPos: calculateWorldPos(i, localX, localY)
      })
    })

    const minNodes = 15
    while (nodes.length < minNodes) {
      const localX = (Math.random() - 0.5) * 160
      const localY = (Math.random() - 0.5) * 160
      const ghostId = `ghost_${i}_${nodes.length}`
      nodes.push({
        id: ghostId,
        label: `GHOST_DATA_${Math.floor(Math.random() * 999)}`,
        faceIndex: i,
        localPos: { x: localX, y: localY },
        worldPos: calculateWorldPos(i, localX, localY)
      })
    }
    facesTrades.value[i] = nodes
  }

  // --- INTERNAL NEURAL CORE NETWORK --- //
  const innerNodes: TradeNode[] = []
  for (let i = 0; i < 60; i++) {
    const rx = (Math.random() - 0.5) * 140
    const ry = (Math.random() - 0.5) * 140
    const rz = (Math.random() - 0.5) * 140
    innerNodes.push({
      id: `inner_${i}`,
      label: `CORE_VULT_${i}`,
      faceIndex: -1,
      localPos: { x: 0, y: 0 },
      worldPos: { x: rx, y: ry, z: rz },
      neighbors: []
    })
  }

  innerNodes.forEach((node, i) => {
    const distances = innerNodes
      .map((other, idx) => ({ 
        idx, 
        dist: i === idx ? Infinity : Math.sqrt(
          (node.worldPos.x - other.worldPos.x)**2 + 
          (node.worldPos.y - other.worldPos.y)**2 + 
          (node.worldPos.z - other.worldPos.z)**2
        ) 
      }))
      .sort((a, b) => a.dist - b.dist)
    node.neighbors = distances.slice(0, 3).map(d => d.idx)
  })
  
  internalNodes.value = innerNodes

  // --- ATMOSPHERIC DATA LINES --- //
  const lines: any[] = []
  for (let i = 0; i < 20; i++) {
    lines.push({
      x: (Math.random() - 0.5) * 140,
      z: (Math.random() - 0.5) * 140,
      y: (Math.random() - 0.5) * 140,
      length: 20 + Math.random() * 40,
      speed: 0.2 + Math.random() * 0.5
    })
  }
  atmosphericLines.value = lines

  // --- CALCULATE REAL EQUITY FROM TRADES --- //
  const tradesForEquity = [...currentTrades].sort((a, b) => new Date(a.date).getTime() - new Date(a.date).getTime())
  const initialDeposit = 1000
  let runningBalance = initialDeposit
  
  equityPoints3D.value = []
  if (tradesForEquity.length === 0) {
    equityPoints3D.value.push({ 
      x: -200, y: 50, z: 0, 
      value: initialDeposit,
      dateLabel: 'DEPOSIT'
    })
    return
  }
  const numTrades = tradesForEquity.length
  const step = 400 / Math.max(1, numTrades)

  let balances: number[] = [initialDeposit]
  let tempBal = initialDeposit
  tradesForEquity.forEach(t => {
    tempBal += (t.profitInCurrency ?? 0)
    balances.push(tempBal)
  })
  
  const maxDiff = Math.max(...balances.map(b => Math.abs(b - initialDeposit)))
  const yScaling = maxDiff === 0 ? 1 : 100 / maxDiff

  equityPoints3D.value.push({ 
    x: -200, y: 50, z: 0, 
    value: initialDeposit,
    dateLabel: 'DEPOSIT'
  })

  tradesForEquity.forEach((trade, i) => {
    runningBalance += (trade.profitInCurrency ?? 0)
    const x = -200 + (i + 1) * step
    const y = 50 - (runningBalance - initialDeposit) * yScaling
    const z = (Math.random() - 0.5) * 40
    equityPoints3D.value.push({ 
      x, y, z, 
      value: runningBalance,
      dateLabel: new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })
  })

  if (activeFaceIndices.value.length > 0 && !activeFaceIndices.value.includes(currentFace.value)) {
    currentFace.value = activeFaceIndices.value[0]!
    switchFace(currentFace.value)
  }
}

// --- 3D ENGINE --- //
const rotateX = (p: Point3D, angle: number): Point3D => {
  const cos = Math.cos(angle), sin = Math.sin(angle)
  return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos }
}

const rotateY = (p: Point3D, angle: number): Point3D => {
  const cos = Math.cos(angle), sin = Math.sin(angle)
  return { x: p.x * cos + p.z * sin, y: p.y, z: -p.x * sin + p.z * cos }
}

const project = (p: Point3D, width: number, height: number): Point2D => {
  const focalLength = 1000
  const z = Math.max(-999, p.z)
  const scale = focalLength / (focalLength + z)
  return {
    x: p.x * scale + width / 2 + viewOffset.value.x,
    y: p.y * scale + height / 2 + viewOffset.value.y,
    opacity: Math.max(0.1, (1000 - z) / 1500),
    depth: p.z
  }
}

const resetView = () => {
  targetRotation.value = { x: 0, y: 0 }
  viewScale.value = 2.2
  viewOffset.value = { x: 0, y: 0 }
}

const navigateFace = (dir: number) => {
  if (isTransitioning.value || activeFaceIndices.value.length === 0) return
  const currentIndex = activeFaceIndices.value.indexOf(currentFace.value)
  const nextIndex = (currentIndex + dir + activeFaceIndices.value.length) % activeFaceIndices.value.length
  switchFace(activeFaceIndices.value[nextIndex]!)
}



let rafId: number
const update = () => {
  const canvas = canvasRef.value
  if (!canvas) {
    rafId = requestAnimationFrame(update)
    return
  }
  
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    rafId = requestAnimationFrame(update)
    return
  }

  if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
    if (canvas.clientWidth > 0 && canvas.clientHeight > 0) {
      canvas.width = canvas.clientWidth
      canvas.height = canvas.clientHeight
    }
  }

  const w = canvas.width, h = canvas.height
  if (w === 0 || h === 0) {
    rafId = requestAnimationFrame(update)
    return
  }

  ctx.clearRect(0, 0, w, h)

  if (revealProgress.value < 1) {
    revealProgress.value += 0.015 // Snappier Animation Speed
  }
  
  // Reset state to prevent leakage between modes
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'

  // Auto-return to 2D if not panning in stats mode
  if (props.viewMode === 'stats' && !isPanning.value) {
    targetRotation.value = { x: 0, y: 0 }
  }

  currentRotation.value.x += (targetRotation.value.x - currentRotation.value.x) * 0.08
  currentRotation.value.y += (targetRotation.value.y - currentRotation.value.y) * 0.08

  // --- RENDER CONTENT BASED ON MODE --- //
  if (props.viewMode === 'cube') {
    // --- RENDER CUBE STRUCTURE (ETHEREAL TESSERACT) --- //
    const S = 140
    const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]
    const cubeVertices: Point3D[] = [
      {x:-S, y:-S, z:-S}, {x:S, y:-S, z:-S}, {x:S, y:S, z:-S}, {x:-S, y:S, z:-S},
      {x:-S, y:-S, z:S}, {x:S, y:-S, z:S}, {x:S, y:S, z:S}, {x:-S, y:S, z:S}
    ]
    const transformedCube = cubeVertices.map(v => {
      let p = rotateY(v, currentRotation.value.y)
      p = rotateX(p, currentRotation.value.x)
      p.x *= viewScale.value; p.y *= viewScale.value; p.z *= viewScale.value
      return project(p, w, h)
    })

    // Draw Full Borders with 50% opacity for structure
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)'
    ctx.lineWidth = 0.5
    edges.forEach(edge => {
      const v1 = transformedCube[edge[0]!]!; const v2 = transformedCube[edge[1]!]!
      if (v1.depth < -850 || v2.depth < -850) return
      ctx.beginPath(); ctx.moveTo(v1.x, v1.y); ctx.lineTo(v2.x, v2.y); ctx.stroke()
    })

    // Draw Tactical Corner Brackets (High visibility)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)'
    ctx.lineWidth = 1.4
    edges.forEach(edge => {
      const v1 = transformedCube[edge[0]!]!; const v2 = transformedCube[edge[1]!]!
      if (v1.depth < -850 || v2.depth < -850) return
      
      const bracketSize = 0.15
      ctx.beginPath()
      ctx.moveTo(v1.x, v1.y); ctx.lineTo(v1.x + (v2.x - v1.x) * bracketSize, v1.y + (v2.y - v1.y) * bracketSize)
      ctx.moveTo(v2.x, v2.y); ctx.lineTo(v2.x + (v1.x - v2.x) * bracketSize, v2.y + (v1.y - v2.y) * bracketSize)
      ctx.stroke()
    })

    // --- RENDER NESTED TESSERACT CORE (PHANTOM CUBE) --- //
    const sCore = 60
    const tTime = Date.now() * 0.0005
    const coreRotation = { x: currentRotation.value.x + tTime, y: currentRotation.value.y - tTime * 0.5 }
    const coreVertices: Point3D[] = [
      {x:-sCore, y:-sCore, z:-sCore}, {x:sCore, y:-sCore, z:-sCore}, {x:sCore, y:sCore, z:-sCore}, {x:-sCore, y:sCore, z:-sCore},
      {x:-sCore, y:-sCore, z:sCore}, {x:sCore, y:-sCore, z:sCore}, {x:sCore, y:sCore, z:sCore}, {x:-sCore, y:sCore, z:sCore}
    ]
    const transformedCore = coreVertices.map(v => {
      let p = rotateY(v, coreRotation.y)
      p = rotateX(p, coreRotation.x)
      p.x *= viewScale.value; p.y *= viewScale.value; p.z *= viewScale.value
      return project(p, w, h)
    })

    ctx.setLineDash([2, 4])
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)'
    edges.forEach(edge => {
      const v1 = transformedCore[edge[0]!]!; const v2 = transformedCore[edge[1]!]!
      ctx.beginPath(); ctx.moveTo(v1.x, v1.y); ctx.lineTo(v2.x, v2.y); ctx.stroke()
    })
    ctx.setLineDash([])

    // --- RENDER INTERNAL NEURAL CORE --- //
    const pulse = (Math.sin(Date.now() * 0.002) + 1) * 0.5
    const sweepY = Math.sin(Date.now() * 0.0004) * 140 // Slower sweep speed
    
    ctx.lineWidth = 0.4
    internalNodes.value.forEach((node, idx) => {
       const p1_orig = rotateY(node.worldPos, currentRotation.value.y)
       const p1_rot = rotateX(p1_orig, currentRotation.value.x)
       const p1 = { x: p1_rot.x * viewScale.value, y: p1_rot.y * viewScale.value, z: p1_rot.z * viewScale.value }
       const pr1 = project(p1, w, h)

       // Data Sweep Detection
       const distToSweep = Math.abs(p1_rot.y - (sweepY / viewScale.value))
       const isSwept = distToSweep < 15
       const sweepIntensity = isSwept ? (1 - distToSweep / 15) : 0

       // Draw connections
       if (node.neighbors) {
         node.neighbors.forEach(nIdx => {
           const other = internalNodes.value[nIdx]!
           let p2_orig = rotateY(other.worldPos, currentRotation.value.y)
           let p2_rot = rotateX(p2_orig, currentRotation.value.x)
           let p2 = { x: p2_rot.x * viewScale.value, y: p2_rot.y * viewScale.value, z: p2_rot.z * viewScale.value }
           const pr2 = project(p2, w, h)

           const edgeOpacity = Math.min(pr1.opacity, pr2.opacity) * (0.05 + pulse * 0.1 + sweepIntensity * 0.2)
           ctx.globalAlpha = edgeOpacity
           ctx.strokeStyle = isSwept ? '#0f172a' : '#64748b'
           ctx.beginPath(); ctx.moveTo(pr1.x, pr1.y); ctx.lineTo(pr2.x, pr2.y); ctx.stroke()
         })
       }

       // Draw the node itself
       ctx.shadowBlur = isSwept ? 8 : 4
       ctx.shadowColor = isSwept ? '#1e40af' : '#64748b'
       ctx.globalAlpha = Math.min(1, pr1.opacity * (0.3 + pulse * 0.4 + sweepIntensity * 0.3))
       ctx.fillStyle = isSwept ? '#0f172a' : '#64748b'
       const nodeSize = 1.5 + sweepIntensity * 0.8
       ctx.beginPath(); ctx.arc(pr1.x, pr1.y, nodeSize, 0, Math.PI * 2); ctx.fill()
       ctx.shadowBlur = 0
    })

    // --- RENDER VERTICAL DATA STREAMS --- //
    ctx.lineWidth = 0.5
    ctx.strokeStyle = '#ffffff'
    atmosphericLines.value.forEach(line => {
      line.y += line.speed
      if (line.y > 70) line.y = -70 // Wrap around
      
      const pTop = { x: line.x, y: line.y - line.length/2, z: line.z }
      const pBot = { x: line.x, y: line.y + line.length/2, z: line.z }
      
      let pt = rotateY(pTop, currentRotation.value.y)
      pt = rotateX(pt, currentRotation.value.x)
      const prTop = project({ x: pt.x * viewScale.value, y: pt.y * viewScale.value, z: pt.z * viewScale.value }, w, h)
      
      let pb = rotateY(pBot, currentRotation.value.y)
      pb = rotateX(pb, currentRotation.value.x)
      const prBot = project({ x: pb.x * viewScale.value, y: pb.y * viewScale.value, z: pb.z * viewScale.value }, w, h)
      
      ctx.globalAlpha = Math.min(prTop.opacity, prBot.opacity) * 0.2
      ctx.beginPath(); ctx.moveTo(prTop.x, prTop.y); ctx.lineTo(prBot.x, prBot.y); ctx.stroke()
    })

    facesTrades.value.forEach((face, fIdx) => {
      const isCurrentFace = fIdx === currentFace.value
      if (!isCurrentFace) return

      face.forEach(node => {
        let p = rotateY(node.worldPos, currentRotation.value.y)
        p = rotateX(p, currentRotation.value.x)
        p.x *= viewScale.value; p.y *= viewScale.value; p.z *= viewScale.value
        if (p.z < -850) return

        const proj = project(p, w, h); const isCurrentFace = fIdx === currentFace.value
        const zoomThreshold = 3.5
        const focusMultiplier = viewScale.value > zoomThreshold ? 1 + (viewScale.value - zoomThreshold) * 0.8 : 1

        if (isCurrentFace) {
          ctx.globalAlpha = Math.min(1, proj.opacity * 1.5)
          const baseSize = 3 * focusMultiplier
          ctx.fillStyle = '#7dd3fc'; ctx.beginPath(); ctx.arc(proj.x - 1, proj.y, baseSize, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(proj.x, proj.y, baseSize, 0, Math.PI * 2); ctx.fill()
        } else {
          ctx.globalAlpha = proj.opacity * 0.4; ctx.fillStyle = '#64748b'
          ctx.beginPath(); ctx.arc(proj.x, proj.y, 2 * focusMultiplier, 0, Math.PI * 2); ctx.fill()
        }
        
        if (isCurrentFace && proj.opacity > 0.5) {
          ctx.globalAlpha = 1; ctx.fillStyle = '#cbd5e1'
          const dynamicFontSize = Math.floor(8 * focusMultiplier)
          ctx.font = `bold ${dynamicFontSize}px Inter`
          ctx.fillText(node.label, proj.x + (8 * focusMultiplier), proj.y + (3 * focusMultiplier))
        }
      })
    })
  } else if (isEquityVisible.value && !isTradeEntryOpen.value) {
    // --- DRAW 3D EQUITY CURVE --- //
    const scale = viewScale.value
    const transformedCurve = equityPoints3D.value.map(v => {
      let p = rotateY(v, currentRotation.value.y)
      p = rotateX(p, currentRotation.value.x)
      p.x *= scale; p.y *= scale; p.z *= scale
      return project(p, w, h)
    })

    // Draw grid floor for reference
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)'
    ctx.lineWidth = 0.5
    for(let i = -5; i <= 5; i++) {
      let p1 = {x: -200 * scale, y: 100 * scale, z: (i * 40) * scale}
      let p2 = {x: 200 * scale, y: 100 * scale, z: (i * 40) * scale}
      let t1 = project(rotateX(rotateY(p1, currentRotation.value.y), currentRotation.value.x), w, h)
      let t2 = project(rotateX(rotateY(p2, currentRotation.value.y), currentRotation.value.x), w, h)
      ctx.beginPath(); ctx.moveTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y); ctx.stroke()
    }

    // --- DRAW TIME LINE --- //
    const axisY = 105 // Slightly below floor
    
    let startAxis = { x: -200 * scale, y: axisY * scale, z: 0 }
    let endAxis = { x: 200 * scale, y: axisY * scale, z: 0 }
    let tStart = project(rotateX(rotateY(startAxis, currentRotation.value.y), currentRotation.value.x), w, h)
    let tEnd = project(rotateX(rotateY(endAxis, currentRotation.value.y), currentRotation.value.x), w, h)
    
    ctx.strokeStyle = '#333333'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(tStart.x, tStart.y); ctx.lineTo(tEnd.x, tEnd.y); ctx.stroke()

    // Time Ticks and Labels
    const numTicks = 5
    for (let i = 0; i < numTicks; i++) {
      const xPos = (-200 + i * (400 / (numTicks - 1))) * scale
      const tickStart = { x: xPos, y: (axisY - 2) * scale, z: 0 }
      const tickEnd = { x: xPos, y: (axisY + 4) * scale, z: 0 }
      const t1 = project(rotateX(rotateY(tickStart, currentRotation.value.y), currentRotation.value.x), w, h)
      const t2 = project(rotateX(rotateY(tickEnd, currentRotation.value.y), currentRotation.value.x), w, h)
      ctx.beginPath(); ctx.moveTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y); ctx.stroke()

      // Labels (Use actual dates from the curve points)
      const pointIdx = Math.floor(i * (equityPoints3D.value.length - 1) / (numTicks - 1))
      const dateLabel = equityPoints3D.value[pointIdx]?.dateLabel ?? ''
      
      ctx.fillStyle = 'rgba(51, 51, 51, 0.4)'
      ctx.font = '8px monospace'
      ctx.fillText(dateLabel, t2.x - 10, t2.y + 12)
    }

    // Draw main path
    ctx.lineWidth = 3
    ctx.strokeStyle = '#333333'
    ctx.shadowBlur = 10
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
    ctx.beginPath()
    
    const numPoints = transformedCurve.length
    const limitIdx = Math.floor(numPoints * revealProgress.value)
    
    transformedCurve.forEach((p, idx) => {
      if (idx > limitIdx) return
      if (idx === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    ctx.stroke()
    ctx.shadowBlur = 0

    // Leading edge glow
    if (limitIdx > 0 && limitIdx < numPoints) {
      const lastP = transformedCurve[limitIdx]!
      ctx.fillStyle = '#333333'
      ctx.shadowBlur = 10
      ctx.shadowColor = 'rgba(51, 51, 51, 0.5)'
      ctx.beginPath(); ctx.arc(lastP.x, lastP.y, 4, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0
    }

    // Nodes and Interaction (Only revealed ones)
    transformedCurve.forEach((p, idx) => {
      if (idx > limitIdx) return
      
      const isHovered = hoveredCurveIndex.value === idx
      ctx.fillStyle = isHovered ? '#000000' : '#333333'
      ctx.beginPath(); ctx.arc(p.x, p.y, isHovered ? 4 : 2, 0, Math.PI * 2); ctx.fill()
      
      if (isHovered) {
        ctx.strokeStyle = '#333333'
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.stroke()
        
        const p3d = equityPoints3D.value[idx]!
        
        // Draw Projection Line to Floor
        const floorP = { x: p3d.x * scale, y: axisY * scale, z: p3d.z * scale }
        const tFloor = project(rotateX(rotateY(floorP, currentRotation.value.y), currentRotation.value.x), w, h)
        
        ctx.setLineDash([3, 3])
        ctx.strokeStyle = 'rgba(51, 51, 51, 0.4)'
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(tFloor.x, tFloor.y); ctx.stroke()
        ctx.setLineDash([])

        // Draw Date at base
        ctx.fillStyle = '#333333'
        ctx.font = 'bold 9px monospace'
        ctx.fillText(p3d.dateLabel, tFloor.x - 15, tFloor.y + 15)
        
        // Draw Minimal Tactical Label (Price)
        const val = p3d.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
        ctx.fillStyle = '#333333'
        ctx.font = 'bold 20px monospace'
        
        // Transparent Label (No background)
        ctx.fillText(val, p.x + 15, p.y - 15)
        
        // Connector line
        ctx.strokeStyle = 'rgba(51, 51, 51, 0.4)'
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 12, p.y - 12); ctx.stroke()
      }
    })
  }
  rafId = requestAnimationFrame(update)
}

const handleMouseDown = (e: MouseEvent) => {
  isPanning.value = true; lastMousePos.value = { x: e.clientX, y: e.clientY }
}
const handleMouseMove = (e: MouseEvent) => {
  const canvas = canvasRef.value; if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  if (isPanning.value) {
    const dx = e.clientX - lastMousePos.value.x; const dy = e.clientY - lastMousePos.value.y
    
    if (e.shiftKey) {
      // Pan mode
      viewOffset.value.x += dx
      viewOffset.value.y += dy
    } else {
      // Rotate mode
      targetRotation.value.y += dx * 0.005; targetRotation.value.x += dy * 0.005
    }
    
    lastMousePos.value = { x: e.clientX, y: e.clientY }
  }

  // Hover detection for curve points
  if (props.viewMode === 'stats') {
    let nearestIdx: number | null = null
    let minDist = 20 // Hover threshold in pixels

    equityPoints3D.value.forEach((p, idx) => {
      let pt = rotateY(p, currentRotation.value.y)
      pt = rotateX(pt, currentRotation.value.x)
      pt.x *= viewScale.value; pt.y *= viewScale.value; pt.z *= viewScale.value
      const proj = project(pt, canvas.width, canvas.height)
      
      const dist = Math.sqrt((proj.x - x)**2 + (proj.y - y)**2)
      if (dist < minDist) {
        minDist = dist
        nearestIdx = idx
      }
    })
    hoveredCurveIndex.value = nearestIdx
  }
}
const handleMouseUp = () => { isPanning.value = false }
const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  viewScale.value = Math.max(0.5, Math.min(6, viewScale.value - e.deltaY * 0.001))
}


onMounted(() => {
  genesisMatrix.loadMatrix()
  genesisTrades.init().then(() => {
    initTrades()
    update()
  })
})
onUnmounted(() => { cancelAnimationFrame(rafId) })
</script>

<style scoped>
.diary-3d-hub { font-family: 'Inter', sans-serif; }
canvas { image-rendering: pixelated; }

/* PAGE REIFY ANIMATION */
.page-reify-enter-active, .page-reify-leave-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.page-reify-enter-from, .page-reify-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.99);
  filter: blur(10px);
}
</style>
