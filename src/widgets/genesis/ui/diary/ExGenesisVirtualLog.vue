<template>
  <div class="diary-neural-hub h-full w-full relative overflow-hidden bg-transparent" ref="container">
    
    <!-- CANVAS LAYER -->
    <canvas ref="canvasRef"
            class="w-full h-full cursor-grab active:cursor-grabbing"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
            @mouseleave="handleMouseUp"
            @wheel.prevent="handleWheel">
    </canvas>

    <!-- NIER FILTER SIDE PANEL -->
    <div class="absolute left-8 top-1/2 -translate-y-1/2 w-72 flex flex-col space-y-10 z-20">
      
      <!-- Asset Search & Dropdown -->
      <div class="flex flex-col space-y-4 relative">
        <header class="flex items-center space-x-2 border-b border-black/20 pb-2">
          <span class="text-[10px] font-mono text-black tracking-[0.4em] uppercase font-bold">Search_Asset</span>
        </header>
        
        <div class="relative group">
          <input v-model="assetSearch"
                 @focus="showAssetDropdown = true"
                 placeholder="SCANNING_DATA..."
                 class="w-full bg-transparent border border-black/20 px-4 py-3 text-[11px] font-mono text-black placeholder:text-black/20 focus:outline-none focus:border-black transition-all uppercase" />
          
          <Transition name="fade">
            <div v-if="showAssetDropdown" 
                 class="absolute left-0 right-0 top-full mt-2 bg-white/90 backdrop-blur-md border border-black/20 max-h-64 overflow-y-auto z-50 shadow-xl custom-scrollbar">
              <button v-for="asset in filteredUniqueAssets" :key="asset"
                      @click="selectAsset(asset)"
                      class="w-full text-left px-4 py-3 text-[10px] font-mono tracking-[0.1em] transition-all uppercase flex justify-between items-center border-b border-black/5 last:border-0"
                      :class="activeFilters.assets.includes(asset) ? 'bg-black text-white' : 'text-black hover:bg-black/10'">
                <span class="font-bold">{{ asset }}</span>
                <span v-if="activeFilters.assets.includes(asset)" class="text-[8px] opacity-60">ACTIVE</span>
              </button>
            </div>
          </Transition>
        </div>

        <div class="flex flex-wrap gap-2 mt-2 min-h-[20px]">
          <div v-for="asset in activeFilters.assets" :key="'chip-'+asset"
               class="px-2 py-1 border border-black/20 text-black text-[8px] font-mono font-bold flex items-center space-x-2">
            <span>{{ asset }}</span>
            <button @click="toggleFilter('asset', asset)" class="hover:text-red-600 font-black">×</button>
          </div>
        </div>
      </div>

      <!-- Side Filter -->
      <div class="flex flex-col space-y-4">
        <header class="flex items-center space-x-2 border-b border-black/20 pb-2">
          <span class="text-[10px] font-mono text-black tracking-[0.4em] uppercase font-bold">Filter_Side</span>
        </header>
        <div class="flex space-x-6">
          <button v-for="side in ['Long', 'Short']" :key="side"
                  @click="toggleFilter('side', side)"
                  class="text-[11px] font-mono tracking-widest transition-all uppercase flex items-center space-x-3"
                  :class="activeFilters.sides.includes(side) ? 'text-black' : 'text-black/30 hover:text-black'">
            <div class="w-4 h-4 border-2 border-black/20 flex items-center justify-center">
               <div v-if="activeFilters.sides.includes(side)" class="w-2 h-2 bg-black"></div>
            </div>
            <span class="font-bold">{{ side }}</span>
          </button>
        </div>
      </div>

      <!-- Outcome Filter -->
      <div class="flex flex-col space-y-4">
        <header class="flex items-center space-x-2 border-b border-black/20 pb-2">
          <span class="text-[10px] font-mono text-black tracking-[0.4em] uppercase font-bold">Filter_Outcome</span>
        </header>
        <div class="flex flex-col space-y-3">
          <button v-for="o in ['ALL', 'WIN', 'LOSS']" :key="o"
                  @click="activeFilters.outcome = o"
                  class="text-[11px] font-mono tracking-widest transition-all uppercase text-left flex items-center space-x-4"
                  :class="activeFilters.outcome === o ? 'text-black' : 'text-black/30 hover:text-black'">
            <div class="w-4 h-4 border-2 border-black/20 flex items-center justify-center" 
                 :class="{ 'bg-black/10': activeFilters.outcome === o }">
               <div v-if="activeFilters.outcome === o" class="w-2 h-2 bg-black"></div>
            </div>
            <span class="font-bold">{{ o }}</span>
          </button>
        </div>
      </div>

      <button @click="resetFilters" class="text-[9px] font-mono text-black opacity-20 hover:opacity-100 tracking-[0.6em] uppercase pt-6 transition-all border-t border-black/10 mt-4">
        [ PURGE_FILTERS ]
      </button>
    </div>

    <!-- HUD Telemetry -->
    <div class="absolute top-8 right-8 flex flex-col items-end space-y-1 opacity-40 pointer-events-none">
       <span class="text-[9px] font-mono tracking-widest uppercase text-black font-bold">System_Neural_Mapping // VOLUMETRIC</span>
       <div class="h-px w-40 bg-black/40"></div>
       <span class="text-[8px] font-mono tracking-widest uppercase text-black">Focus_Nodes: {{ filteredNodeCount }} // Page: {{ currentPage + 1 }} // Zoom: {{ (userScale * 100).toFixed(0) }}%</span>
    </div>

    <!-- PAGINATION CONTROLS -->
    <div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-4 z-30 px-10 py-4">
       <div class="flex items-center space-y-0 space-x-12">
          <button @click="switchPage(currentPage - 1)" 
                  :disabled="currentPage === 0 || isTransitioning"
                  class="text-[11px] font-mono tracking-[0.4em] uppercase transition-all font-bold"
                  :class="currentPage === 0 || isTransitioning ? 'opacity-5 text-black cursor-not-allowed' : 'opacity-40 text-black hover:opacity-100 hover:scale-105'">
            [ PREV_PHASE ]
          </button>
          
          <div class="flex flex-col items-center">
             <span class="text-[10px] font-mono text-black tracking-[0.3em] font-bold opacity-60">PHASE_{{ currentPage + 1 }}</span>
             <div class="flex space-x-2 mt-2">
                <div v-for="i in totalPages" :key="i"
                     class="w-2 h-2 transition-all border border-black/20"
                     :class="i - 1 === currentPage ? 'bg-black scale-125' : 'bg-black/5'">
                </div>
             </div>
          </div>

          <button @click="switchPage(currentPage + 1)" 
                  :disabled="currentPage === totalPages - 1 || isTransitioning"
                  class="text-[11px] font-mono tracking-[0.4em] uppercase transition-all font-bold"
                  :class="currentPage === totalPages - 1 || isTransitioning ? 'opacity-5 text-black cursor-not-allowed' : 'opacity-40 text-black hover:opacity-100 hover:scale-105'">
            [ NEXT_PHASE ]
          </button>
       </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, reactive } from 'vue'
import { useStrategyTradesStore } from '~/features/store/useStrategyTrades'
import { useGenesisTrades, useGenesisMatrixData } from '~/entities/genesis'
import { mockLogEntries, type LogEntry } from '../../../entities/diary/model/mockLogData'

const genesisTrades = useGenesisTrades()
const genesisMatrix = useGenesisMatrixData()


interface Node {
  id: string; label: string; type: 'strategy' | 'trade' | 'note';
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  data?: any
}

interface Link { source: Node; target: Node }

// CONSTANTS FOR SPHERE POSITIONING
const CENTER_X = 500
const CENTER_Y = 420 

const canvasRef = ref<HTMLCanvasElement | null>(null)
const tradeStore = useStrategyTradesStore()
const nodes = ref<Node[]>([])
const links = ref<Link[]>([])
const mousePos = ref({ x: CENTER_X, y: CENTER_Y })
const draggingNode = ref<Node | null>(null)

// VIEW STATE (Zoom & Pan)
const userScale = ref(1)
const panOffset = reactive({ x: 0, y: 0 })
const isPanning = ref(false)
const lastMousePos = { x: 0, y: 0 }

// FILTERS
const activeFilters = reactive({
  assets: [] as string[],
  sides: [] as string[],
  outcome: 'ALL'
})

const assetSearch = ref('')
const showAssetDropdown = ref(false)

const uniqueAssets = computed(() => {
  const allTrades = tradeStore.getTradesForStrategy('MAIN_DIARY')
  const assets = new Set(allTrades.map(t => t.asset).filter((a): a is string => !!a))
  return Array.from(assets).sort()
})

const filteredUniqueAssets = computed(() => {
  const search = assetSearch.value.toLowerCase()
  return uniqueAssets.value.filter(a => a.toLowerCase().includes(search))
})

const toggleFilter = (type: 'asset' | 'side', value: string) => {
  const list = type === 'asset' ? activeFilters.assets : activeFilters.sides
  const idx = list.indexOf(value)
  if (idx > -1) list.splice(idx, 1)
  else list.push(value)
}

const selectAsset = (asset: string) => {
  if (!activeFilters.assets.includes(asset)) activeFilters.assets.push(asset)
  const tradeIndex = sortedTrades.value.findIndex(t => t.asset === asset)
  if (tradeIndex !== -1) {
    const targetPage = Math.floor(tradeIndex / tradesPerPage)
    if (targetPage !== currentPage.value) switchPage(targetPage)
  }
  assetSearch.value = ''
  showAssetDropdown.value = false
}

const resetFilters = () => {
  activeFilters.assets = []; activeFilters.sides = []; activeFilters.outcome = 'ALL'; assetSearch.value = ''
}

if (typeof window !== 'undefined') {
  window.addEventListener('mousedown', (e) => {
    const target = e.target as HTMLElement
    if (showAssetDropdown.value && !target.closest('.group') && !target.closest('.z-50')) {
      showAssetDropdown.value = false
    }
  })
}

// Logic to check if a trade object matches current filters
const tradeMatches = (trade: any) => {
  if (!trade) return false
  if (activeFilters.assets.length > 0 && !activeFilters.assets.includes(trade.asset)) return false
  if (activeFilters.sides.length > 0 && !activeFilters.sides.includes(trade.side)) return false
  if (activeFilters.outcome === 'WIN' && trade.result <= 0) return false
  if (activeFilters.outcome === 'LOSS' && trade.result >= 0) return false
  return true
}

const matchesFilter = (node: Node) => {
  if (node.type === 'strategy') return true
  
  if (node.type === 'note') {
    const log = node.data
    if (!log || !log.attachedTradeIds) return true
    // A note matches if ANY of its attached trades match the filter
    const allTrades = tradeStore.getTradesForStrategy('MAIN_DIARY')
    const attachedTrades = allTrades.filter(t => log.attachedTradeIds.includes(t.id))
    return attachedTrades.some(t => tradeMatches(t))
  }

  return tradeMatches(node.data)
}

const isFiltering = computed(() => activeFilters.assets.length > 0 || activeFilters.sides.length > 0 || activeFilters.outcome !== 'ALL')
const filteredNodeCount = computed(() => nodes.value.filter(n => matchesFilter(n)).length)

// TRANSITION & DEPTH
const globalOpacity = ref(1); const transitionScale = ref(1); const isTransitioning = ref(false)
const tradesPerPage = 60; const currentPage = ref(0)
const totalPages = computed(() => {
  const allTrades = tradeStore.getTradesForStrategy('MAIN_DIARY')
  return Math.ceil(allTrades.length / tradesPerPage)
})
const sortedTrades = computed(() => {
  const allTrades = tradeStore.getTradesForStrategy('MAIN_DIARY')
  return [...allTrades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})
const visibleTrades = computed(() => {
  const start = currentPage.value * tradesPerPage
  return sortedTrades.value.slice(start, start + tradesPerPage)
})

const switchPage = (idx: number) => {
  if (isTransitioning.value || idx < 0 || idx >= totalPages.value) return
  isTransitioning.value = true
  const start = Date.now()
  const fadeOut = () => {
    const progress = Math.min(1, (Date.now() - start) / 400)
    globalOpacity.value = 1 - progress; transitionScale.value = 1 - progress * 0.2
    if (progress < 1) requestAnimationFrame(fadeOut)
    else {
      currentPage.value = idx; initGraph()
      const fadeInStart = Date.now()
      const fadeIn = () => {
        const fProgress = Math.min(1, (Date.now() - fadeInStart) / 400)
        globalOpacity.value = fProgress; transitionScale.value = 0.8 + fProgress * 0.2
        if (fProgress < 1) requestAnimationFrame(fadeIn)
        else isTransitioning.value = false
      }
      requestAnimationFrame(fadeIn)
    }
  }
  requestAnimationFrame(fadeOut)
}

const initGraph = () => {
  const newNodes: Node[] = []; const newLinks: Link[] = []
  const rootNode: Node = { id: 'root-strategy', label: 'PROTOCOL_ROOT', type: 'strategy', x: CENTER_X, y: CENTER_Y, z: 0, vx: 0, vy: 0, vz: 0 }
  newNodes.push(rootNode)
  const tradeNodesMap = new Map<string, Node>()
  
  visibleTrades.value.forEach((t, idx) => {
    const phi = Math.acos(-1 + (2 * idx) / visibleTrades.value.length)
    const theta = Math.sqrt(visibleTrades.value.length * Math.PI) * phi
    const radius = 50 + Math.random() * 230 
    
    const node: Node = {
      id: t.id!, label: `${t.asset}_0x${t.id!.slice(-3)}`, type: 'trade',
      x: CENTER_X + radius * Math.cos(theta) * Math.sin(phi),
      y: CENTER_Y + radius * Math.sin(theta) * Math.sin(phi),
      z: radius * Math.cos(phi),
      vx: 0, vy: 0, vz: 0,
      data: t
    }
    newNodes.push(node)
    tradeNodesMap.set(t.id!, node)
    // No link from root to trade nodes — constellation stands free
  })

  mockLogEntries.forEach((log: LogEntry) => {
    const visibleAttachedTrades = log.attachedTradeIds?.filter((tid: string) => tradeNodesMap.has(tid)) || []
    if (visibleAttachedTrades.length > 0) {
      const firstTradeId = visibleAttachedTrades[0]!
      const firstTrade = tradeNodesMap.get(firstTradeId)!
      const noteNode: Node = {
        id: log.id, label: `NOTE: ${log.title}`, type: 'note',
        x: firstTrade.x + (Math.random() - 0.5) * 40,
        y: firstTrade.y + (Math.random() - 0.5) * 40,
        z: firstTrade.z + (Math.random() - 0.5) * 20,
        vx: 0, vy: 0, vz: 0, data: log
      }
      newNodes.push(noteNode)
      visibleAttachedTrades.forEach((tid: string) => {
        const tNode = tradeNodesMap.get(tid)!
        newLinks.push({ source: noteNode, target: tNode })
      })
    }
  })
  nodes.value = newNodes; links.value = newLinks
}

let rafId: number
const update = () => {
  const canvas = canvasRef.value; if (!canvas) return
  const ctx = canvas.getContext('2d'); if (!ctx) return
  if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
    canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight
  }
  const width = canvas.width; const height = canvas.height
  const baseScale = (Math.min(width, height) / 1000) * transitionScale.value
  const scale = baseScale * userScale.value
  const offsetX = (width - 1000 * scale) / 2 + panOffset.x
  const offsetY = (height - 1000 * scale) / 2 + panOffset.y
  const localNodes = nodes.value; const localLinks = links.value; const dragNode = draggingNode.value; const mouse = mousePos.value
  
  const damping = 0.85; 
  const repulsion = 400; 
  const linkDistance = 200; 
  const linkStrength = 0.04

  for (let i = 0; i < localNodes.length; i++) {
    const nA = localNodes[i]; if (!nA) continue
    for (let j = i + 1; j < localNodes.length; j++) {
      const nB = localNodes[j]; if (!nB) continue
      const dx = nB.x-nA.x; const dy = nB.y-nA.y; const dz = nB.z-nA.z
      const d2 = dx*dx + dy*dy + dz*dz || 1
      if (d2 > 250000) continue
      const d = Math.sqrt(d2); const f = repulsion / d2
      nA.vx -= (dx/d)*f; nA.vy -= (dy/d)*f; nA.vz -= (dz/d)*f
      nB.vx += (dx/d)*f; nB.vy += (dy/d)*f; nB.vz += (dx/d)*f
    }
  }

  for (let i = 0; i < localLinks.length; i++) {
    const l = localLinks[i]; if (!l) continue
    const dx = l.target.x-l.source.x; const dy = l.target.y-l.source.y; const dz = l.target.z-l.source.z
    const d = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1
    const targetDist = l.source.type === 'note' ? 40 : linkDistance
    const f = (d - targetDist) * linkStrength
    l.source.vx += (dx/d)*f; l.source.vy += (dy/d)*f; l.source.vz += (dz/d)*f
    l.target.vx -= (dx/d)*f; l.target.vy -= (dy/d)*f; l.target.vz -= (dz/d)*f
  }

  for (let i = 0; i < localNodes.length; i++) {
    const n = localNodes[i]; if (!n) continue
    if (dragNode?.id === n.id) {
      n.x += (mouse.x-n.x)*0.15; n.y += (mouse.y-n.y)*0.15
      n.vx = 0; n.vy = 0; n.vz = 0; continue
    }
    
    if (Math.abs(n.vx) > 0.01 || Math.abs(n.vy) > 0.01 || Math.abs(n.vz) > 0.01) {
      n.x += n.vx; n.y += n.vy; n.z += n.vz
      n.vx *= damping; n.vy *= damping; n.vz *= damping
    }

    const dx = n.x - CENTER_X; const dy = n.y - CENTER_Y; const dz = n.z
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1
    const gravity = 0.05
    n.vx -= (dx/dist) * gravity; n.vy -= (dy/dist) * gravity; n.vz -= (dz/dist) * gravity

    if (dist > 350) {
       const boundaryF = (dist - 350) * 0.1
       n.vx -= (dx/dist) * boundaryF; n.vy -= (dy/dist) * boundaryF; n.vz -= (dz/dist) * boundaryF
    }
  }

  ctx.clearRect(0, 0, width, height); ctx.save()
  ctx.globalAlpha = globalOpacity.value; ctx.translate(offsetX, offsetY); ctx.scale(scale, scale)
  const sortedNodes = [...localNodes].sort((a, b) => a.z - b.z)

  ctx.lineWidth = 1
  for (let i = 0; i < localLinks.length; i++) {
    const l = localLinks[i]; if (!l) continue
    if (isFiltering.value && (!matchesFilter(l.source) || !matchesFilter(l.target))) continue
    const alpha = Math.max(0.05, 0.3 * (1 + ((l.source.z + l.target.z) / 2)/400))
    if (l.source.type === 'note') {
       ctx.setLineDash([])
       ctx.strokeStyle = `rgba(160, 160, 160, ${alpha * globalOpacity.value})`
    } else {
       ctx.setLineDash([])
       ctx.strokeStyle = `rgba(218, 212, 187, ${alpha * globalOpacity.value})`
    }
    const dx = l.target.x-l.source.x; const dy = l.target.y-l.source.y
    ctx.beginPath(); ctx.moveTo(l.source.x + (l.source.type === 'strategy' ? dx*0.33 : 0), l.source.y + (l.source.type === 'strategy' ? dy*0.33 : 0)); ctx.lineTo(l.target.x, l.target.y); ctx.stroke()
  }
  ctx.setLineDash([])

  for (let i = 0; i < sortedNodes.length; i++) {
    const n = sortedNodes[i]; if (!n) continue
    const zScale = 1 + n.z / 600; const radius = (n.type === 'note' ? 6 : 8) * zScale
    let nodeAlpha = Math.max(0.1, 0.8 * (1 + n.z/400))
    if (isFiltering.value) {
      if (!matchesFilter(n)) nodeAlpha *= 0.1; else nodeAlpha = 1.0
    }
    ctx.save()
    if (n.type === 'strategy') {
      ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(Date.now()/2000)
      ctx.strokeStyle = `rgba(218, 212, 187, ${0.4 * nodeAlpha})`; ctx.setLineDash([2, 4])
      ctx.beginPath(); ctx.arc(0, 0, 14*zScale, 0, Math.PI*2); ctx.stroke(); ctx.restore()
      ctx.fillStyle = '#4D493D'; ctx.strokeStyle = '#DAD4BB'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(n.x, n.y, radius, 0, Math.PI*2); ctx.fill(); ctx.stroke()
    } else if (n.type === 'note') {
      ctx.fillStyle = '#A0A0A0' 
      ctx.globalAlpha = nodeAlpha * globalOpacity.value
      ctx.beginPath(); ctx.arc(n.x, n.y, radius, 0, Math.PI*2); ctx.fill()
      ctx.strokeStyle = '#A0A0A0'; ctx.lineWidth = 0.5; ctx.stroke()
    } else {
      ctx.fillStyle = '#DAD4BB'; ctx.globalAlpha = nodeAlpha * globalOpacity.value
      ctx.beginPath(); ctx.arc(n.x, n.y, radius, 0, Math.PI*2); ctx.fill()
      if (isFiltering.value && matchesFilter(n)) {
        ctx.strokeStyle = '#DAD4BB'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(n.x, n.y, radius+4, 0, Math.PI*2); ctx.stroke()
      }
    }
    
    // PERMANENT LABELS BELOW NODES
    if (!isTransitioning.value && (!isFiltering.value || matchesFilter(n))) {
      ctx.fillStyle = `rgba(0, 0, 0, ${nodeAlpha * 0.4})`; 
      ctx.font = `${6 * zScale}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(n.label, n.x, n.y + radius + 12);
    }
    
    ctx.restore()
    
    // HOVER TOOLTIP
    if (!isTransitioning.value && (!isFiltering.value || matchesFilter(n))) {
      const dmx = mouse.x-n.x; const dmy = mouse.y-n.y
      if (dmx*dmx + dmy*dmy < (radius*3)**2) {
        ctx.fillStyle = 'rgba(77, 73, 61, 0.9)'; ctx.fillRect(n.x+12, n.y-10, 140, 18)
        ctx.fillStyle = '#FFFFFF'; ctx.font = '7px monospace'; ctx.textAlign = 'left'; ctx.fillText(n.label, n.x+16, n.y+2)
      }
    }
  }
  ctx.restore(); rafId = requestAnimationFrame(update)
}

const handleMouseDown = (e: MouseEvent) => {
  if (isTransitioning.value) return
  const canvas = canvasRef.value; if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const baseScale = (Math.min(canvas.width, canvas.height) / 1000) * transitionScale.value
  const scale = baseScale * userScale.value
  const offsetX = (canvas.width - 1000 * scale) / 2 + panOffset.x
  const offsetY = (canvas.height - 1000 * scale) / 2 + panOffset.y
  const mx = (e.clientX - rect.left - offsetX) / scale; const my = (e.clientY - rect.top - offsetY) / scale
  
  draggingNode.value = null
  for (let i = 0; i < nodes.value.length; i++) {
    const n = nodes.value[i]; if (!n) continue
    const dx = mx - n.x; const dy = my - n.y
    if (dx*dx + dy*dy < 600) { draggingNode.value = n; break }
  }

  if (!draggingNode.value) {
    isPanning.value = true
    lastMousePos.x = e.clientX; lastMousePos.y = e.clientY
  }
}

const handleMouseMove = (e: MouseEvent) => {
  const canvas = canvasRef.value; if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const baseScale = (Math.min(canvas.width, canvas.height) / 1000) * transitionScale.value
  const scale = baseScale * userScale.value
  const offsetX = (canvas.width - 1000 * scale) / 2 + panOffset.x
  const offsetY = (canvas.height - 1000 * scale) / 2 + panOffset.y
  
  mousePos.value.x = (e.clientX - rect.left - offsetX) / scale
  mousePos.value.y = (e.clientY - rect.top - offsetY) / scale

  if (isPanning.value) {
    const dx = e.clientX - lastMousePos.x
    const dy = e.clientY - lastMousePos.y
    panOffset.x += dx
    panOffset.y += dy
    lastMousePos.x = e.clientX
    lastMousePos.y = e.clientY
  }
}

const handleWheel = (e: WheelEvent) => {
  const delta = e.deltaY * -0.001
  userScale.value = Math.min(Math.max(0.5, userScale.value + delta), 4)
}

const handleMouseUp = () => { 
  draggingNode.value = null
  isPanning.value = false 
}
onMounted(() => { 
  tradeStore.init().then(() => {
    initGraph()
    update() 
  })
})
onUnmounted(() => { cancelAnimationFrame(rafId) })
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.2); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-5px); }
</style>
