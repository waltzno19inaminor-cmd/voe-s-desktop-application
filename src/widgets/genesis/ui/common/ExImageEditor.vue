<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import ExPanel from "~/shared/ui/ExPanel.vue"
import ExButton from "~/shared/ui/ExButton.vue"
import ExGothicCorners from "~/shared/ui/ExGothicCorners.vue"

const props = withDefaults(defineProps<{
  isOpen: boolean
  imageUrl: string
  initialData?: any
  previewMode?: boolean
}>(), {
  previewMode: false
})

const emit = defineEmits(['close', 'save'])

// --- TOOL CONFIG ---
const activeTool = ref('brush')
const selectedColor = ref('#ffffff')
const textSize = ref(24)
const isBold = ref(false)
const isItalic = ref(false)
const strokeWidth = ref(4)
const eraserSize = ref(25)
const mouseX = ref(0)
const mouseY = ref(0)
const isOverImage = ref(false)

// Advanced Text Config
const textBorderColor = ref('transparent')
const textBorderWidth = ref(0)
const textBgColor = ref('transparent')
const isUnderline = ref(false)
const isStrike = ref(false)
const textTracking = ref(0)
const textBorderInput = ref<HTMLInputElement | null>(null)
const textBgInput = ref<HTMLInputElement | null>(null)

const tools = [
  { id: 'brush', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z', label: 'Brush' },
  { id: 'eraser', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', label: 'Eraser' },
  { id: 'square', icon: 'M4 4h16v16H4z', label: 'Figures' },
  { id: 'trendline', icon: 'M4 19L20 5', label: 'Trendlines' },
  { id: 'text', icon: 'M4 7V4h16v3M9 20h6M12 4v16', label: 'Text' },
  { id: 'pan', icon: 'M8 7l4-4m0 0l4 4m-4-4v18m0 0l-4-4m4 4l4-4', label: 'Pan' }
]

const colors = ['#ffffff', '#38bdf8', '#fb7185', '#f59e0b', '#10b981', '#000000']

// --- VIEWPORT STATE ---
const scale = ref(1)
const offset = reactive({ x: 0, y: 0 })
const isPanning = ref(false)
let lastMousePos = { x: 0, y: 0 }

const viewportStyle = computed(() => ({
  transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale.value})`,
  transformOrigin: 'center'
}))

// --- DRAWING STATE ---
const annotations = reactive({
  paths: [] as any[],
  rects: [] as any[],
  lines: [] as any[],
  texts: [] as any[]
})

const isDrawing = ref(false)
const currentObject = ref<any>(null)
const selectedElement = ref<any>(null)
const selectedElementType = ref<string | null>(null)
const svgRef = ref<SVGElement | null>(null)
const colorInput = ref<HTMLInputElement | null>(null)

// --- SELECTION LOGIC ---
const selectElement = (type: string, el: any, e?: MouseEvent) => {
  if (e) {
    e.stopPropagation()
    if (activeTool.value === 'eraser') {
      isDrawing.value = true
      eraseAt(getRelativeCoords(e))
      return
    }
    isDrawing.value = true
    lastMousePos = { x: e.clientX, y: e.clientY }
  }
  selectedElement.value = el
  selectedElementType.value = type
  
  // Sync instrument panel to selected element
  selectedColor.value = el.color
  if (type === 'text') {
    textSize.value = el.size
    isBold.value = el.bold
    isItalic.value = el.italic
    textBorderColor.value = el.borderColor || 'transparent'
    textBorderWidth.value = el.borderWidth || 0
    textBgColor.value = el.bgColor || 'transparent'
    isUnderline.value = el.underline || false
    isStrike.value = el.strike || false
    textTracking.value = el.tracking || 0
  } else {
    strokeWidth.value = el.width || 2
  }
}

const deselect = () => {
  selectedElement.value = null
  selectedElementType.value = null
}

const removeSelected = () => {
  if (!selectedElement.value) return
  const id = selectedElement.value.id
  if (selectedElementType.value === 'path') annotations.paths = annotations.paths.filter(p => p.id !== id)
  if (selectedElementType.value === 'rect') annotations.rects = annotations.rects.filter(r => r.id !== id)
  if (selectedElementType.value === 'line') annotations.lines = annotations.lines.filter(l => l.id !== id)
  if (selectedElementType.value === 'text') annotations.texts = annotations.texts.filter(t => t.id !== id)
  deselect()
}

// Watch for changes in panel to apply to selected element
watch([selectedColor, textSize, isBold, isItalic, strokeWidth, textBorderColor, textBorderWidth, textBgColor, isUnderline, isStrike, textTracking], () => {
  if (selectedElement.value) {
    selectedElement.value.color = selectedColor.value
    if (selectedElementType.value === 'text') {
      selectedElement.value.size = Number(textSize.value)
      selectedElement.value.bold = isBold.value
      selectedElement.value.italic = isItalic.value
      selectedElement.value.borderColor = textBorderColor.value
      selectedElement.value.borderWidth = Number(textBorderWidth.value)
      selectedElement.value.bgColor = textBgColor.value
      selectedElement.value.underline = isUnderline.value
      selectedElement.value.strike = isStrike.value
      selectedElement.value.tracking = Number(textTracking.value)
    } else {
      selectedElement.value.width = Number(strokeWidth.value)
    }
  }
})

const handleToolChange = (toolId: string) => {
  if (selectedElement.value) {
    deselect()
  }
  activeTool.value = toolId
}

// Automatic Persistence
watch(annotations, (newVal) => {
  emit('save', JSON.parse(JSON.stringify(newVal)))
}, { deep: true })

// --- INTERACTION LOGIC ---
const getRelativeCoords = (e: MouseEvent) => {
  if (!svgRef.value) return { x: 0, y: 0 }
  const rect = svgRef.value.getBoundingClientRect()
  const w = rect.width / scale.value
  const h = rect.height / scale.value
  return {
    x: Math.max(0, Math.min((e.clientX - rect.left) / scale.value, w)),
    y: Math.max(0, Math.min((e.clientY - rect.top) / scale.value, h))
  }
}

const eraseAt = (coords: { x: number, y: number }) => {
  const threshold = eraserSize.value / scale.value
  
  const newPaths: any[] = []
  annotations.paths.forEach(p => {
    let currentSegment: any[] = []
    p.points.forEach((pt: any) => {
      const d = Math.sqrt(Math.pow(pt.x - coords.x, 2) + Math.pow(pt.y - coords.y, 2))
      if (d < threshold) {
        if (currentSegment.length > 1) {
          newPaths.push({ ...p, id: Date.now() + Math.random(), points: currentSegment })
        }
        currentSegment = []
      } else {
        currentSegment.push(pt)
      }
    })
    if (currentSegment.length > 1) {
      newPaths.push({ ...p, id: p.id, points: currentSegment })
    }
  })
  annotations.paths = newPaths

  annotations.rects = annotations.rects.filter(r => {
    const rx = Math.min(r.x, r.x + r.w)
    const ry = Math.min(r.y, r.y + r.h)
    const rw = Math.abs(r.w)
    const rh = Math.abs(r.h)
    const inX = coords.x >= rx - threshold && coords.x <= rx + rw + threshold
    const inY = coords.y >= ry - threshold && coords.y <= ry + rh + threshold
    return !(inX && inY)
  })

  annotations.lines = annotations.lines.filter(l => {
    const A = coords.x - l.x1
    const B = coords.y - l.y1
    const C = l.x2 - l.x1
    const D = l.y2 - l.y1
    const dot = A * C + B * D
    const len_sq = C * C + D * D
    let param = -1
    if (len_sq != 0) param = dot / len_sq
    let xx, yy
    if (param < 0) {
      xx = l.x1
      yy = l.y1
    } else if (param > 1) {
      xx = l.x2
      yy = l.y2
    } else {
      xx = l.x1 + param * C
      yy = l.y1 + param * D
    }
    const dx = coords.x - xx
    const dy = coords.y - yy
    return Math.sqrt(dx * dx + dy * dy) > threshold
  })

  annotations.texts = annotations.texts.filter(t => {
    const inX = coords.x >= t.x - threshold && coords.x <= t.x + 100 + threshold 
    const inY = coords.y >= t.y - threshold && coords.y <= t.y + t.size + threshold
    return !(inX && inY)
  })
}

const handleMouseDown = (e: MouseEvent) => {
  if (props.previewMode) return
  if (activeTool.value === 'pan' || e.button === 1) {
    isPanning.value = true
    lastMousePos = { x: e.clientX, y: e.clientY }
    return
  }

  if (selectedElement.value) {
    deselect()
    return
  }

  if (!props.isOpen) return
  
  if (activeTool.value !== 'text' && activeTool.value !== 'pan') {
     e.preventDefault()
  }
  
  const coords = getRelativeCoords(e)

  if (activeTool.value === 'brush') {
    isDrawing.value = true
    currentObject.value = { id: Date.now(), points: [coords], color: selectedColor.value, width: strokeWidth.value }
    annotations.paths.push(currentObject.value)
  } else if (activeTool.value === 'square') {
    isDrawing.value = true
    currentObject.value = { id: Date.now(), x: coords.x, y: coords.y, w: 0, h: 0, color: selectedColor.value, width: strokeWidth.value }
    annotations.rects.push(currentObject.value)
  } else if (activeTool.value === 'trendline') {
    isDrawing.value = true
    currentObject.value = { id: Date.now(), x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y, color: selectedColor.value, width: strokeWidth.value }
    annotations.lines.push(currentObject.value)
  } else if (activeTool.value === 'text') {
    const newText = {
      id: Date.now(),
      x: coords.x,
      y: coords.y,
      content: 'REIFIED_DATA',
      color: selectedColor.value,
      size: textSize.value,
      bold: isBold.value,
      italic: isItalic.value,
      borderColor: textBorderColor.value,
      borderWidth: textBorderWidth.value,
      bgColor: textBgColor.value,
      underline: isUnderline.value,
      strike: isStrike.value,
      tracking: textTracking.value
    }
    annotations.texts.push(newText)
    selectElement('text', newText)
    isDrawing.value = false
  } else if (activeTool.value === 'eraser') {
    isDrawing.value = true
    eraseAt(coords)
  }
}

const handleMouseMove = (e: MouseEvent) => {
  const coords = getRelativeCoords(e)
  mouseX.value = coords.x
  mouseY.value = coords.y
  
  if (svgRef.value) {
    const rect = svgRef.value.getBoundingClientRect()
    isOverImage.value = (
      e.clientX >= rect.left && 
      e.clientX <= rect.right && 
      e.clientY >= rect.top && 
      e.clientY <= rect.bottom
    )
  }

  if (isPanning.value) {
    return
  }

  if (!isDrawing.value) return

  // MOVE Selected Element
  if (selectedElement.value && activeTool.value !== 'eraser' && !currentObject.value) {
    const dx = (e.clientX - lastMousePos.x) / scale.value
    const dy = (e.clientY - lastMousePos.y) / scale.value
    
    if (selectedElementType.value === 'rect') {
      selectedElement.value.x += dx
      selectedElement.value.y += dy
    } else if (selectedElementType.value === 'line') {
      selectedElement.value.x1 += dx
      selectedElement.value.y1 += dy
      selectedElement.value.x2 += dx
      selectedElement.value.y2 += dy
    } else if (selectedElementType.value === 'text') {
      selectedElement.value.x += dx
      selectedElement.value.y += dy
    } else if (selectedElementType.value === 'path') {
      selectedElement.value.points.forEach((p: any) => {
        p.x += dx
        p.y += dy
      })
    }
    lastMousePos = { x: e.clientX, y: e.clientY }
    return
  }

  // DRAWING
  if (activeTool.value === 'brush' && currentObject.value) {
    const lastPt = currentObject.value.points[currentObject.value.points.length - 1]
    const d = Math.sqrt(Math.pow(coords.x - lastPt.x, 2) + Math.pow(coords.y - lastPt.y, 2))
    if (d > 2 / scale.value) {
      currentObject.value.points.push(coords)
    }
  } else if (activeTool.value === 'square' && currentObject.value) {
    currentObject.value.w = coords.x - currentObject.value.x
    currentObject.value.h = coords.y - currentObject.value.y
  } else if (activeTool.value === 'trendline' && currentObject.value) {
    currentObject.value.x2 = coords.x
    currentObject.value.y2 = coords.y
  } else if (activeTool.value === 'eraser') {
    eraseAt(coords)
  }
}

const handleMouseUp = () => {
  isDrawing.value = false
  currentObject.value = null
  isPanning.value = false
}

const handleWheel = (e: WheelEvent) => {
  if (!props.isOpen || !svgRef.value || props.previewMode) return
  e.preventDefault()
  
  // Smooth zoom factor based on actual wheel delta
  const zoomFactor = Math.pow(0.995, e.deltaY)
  const oldScale = scale.value
  const newScale = Math.max(0.05, Math.min(25, oldScale * zoomFactor))
  const ratio = newScale / oldScale

  // Dynamically calculate the un-transformed center of the image
  const rect = svgRef.value.getBoundingClientRect()
  const currentCenterX = rect.left + rect.width / 2
  const currentCenterY = rect.top + rect.height / 2
  const CX = currentCenterX - offset.x
  const CY = currentCenterY - offset.y

  requestAnimationFrame(() => {
    offset.x = (e.clientX - CX) * (1 - ratio) + offset.x * ratio
    offset.y = (e.clientY - CY) * (1 - ratio) + offset.y * ratio
    scale.value = newScale
  })
}

// Bounding box for selection dashed border
const getSelectionBox = (el: any, type: string) => {
  if (type === 'rect') {
    return {
      x: Math.min(el.x, el.x + el.w),
      y: Math.min(el.y, el.y + el.h),
      w: Math.abs(el.w),
      h: Math.abs(el.h)
    }
  }
  if (type === 'line') {
    return {
      x: Math.min(el.x1, el.x2),
      y: Math.min(el.y1, el.y2),
      w: Math.abs(el.x1 - el.x2),
      h: Math.abs(el.y1 - el.y2)
    }
  }
  if (type === 'text') {
    return { x: el.x, y: el.y, w: 100, h: 24 } // Approx
  }
  if (type === 'path') {
    if (!el.points || el.points.length === 0) return null
    const xs = el.points.map((p: any) => p.x)
    const ys = el.points.map((p: any) => p.y)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  }
  return null
}

const selectionBox = computed(() => {
  if (!selectedElement.value || !selectedElementType.value) return null
  return getSelectionBox(selectedElement.value, selectedElementType.value)
})

const clearBuffer = () => {
  annotations.paths = []
  annotations.rects = []
  annotations.lines = []
  annotations.texts = []
  deselect()
}

const resetView = () => {
  scale.value = 1
  offset.x = 0
  offset.y = 0
}

// --- LIFECYCLE ---
let isPanScheduled = false

const handleWindowMouseMove = (e: MouseEvent) => {
  if (props.previewMode) return
  if (isPanning.value) {
    const dx = e.clientX - lastMousePos.x
    const dy = e.clientY - lastMousePos.y
    lastMousePos = { x: e.clientX, y: e.clientY }

    if (!isPanScheduled) {
      isPanScheduled = true
      requestAnimationFrame(() => {
        offset.x += dx
        offset.y += dy
        isPanScheduled = false
      })
    } else {
      offset.x += dx
      offset.y += dy
    }
  }
}

onMounted(() => {
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('mousemove', handleWindowMouseMove)
})

onUnmounted(() => {
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('mousemove', handleWindowMouseMove)
})

const imgRef = ref<HTMLImageElement | null>(null)

const previewPanelSize = reactive({
  width: '90vw',
  height: '80vh'
})

const isImgLoaded = ref(false)

const fitImageToPreview = () => {
  if (!props.previewMode || !imgRef.value) return
  const img = imgRef.value
  
  if (img.naturalWidth && img.naturalHeight) {
    const maxW = Math.min(window.innerWidth * 0.9, 1200)
    const maxH = window.innerHeight * 0.85
    const headerHeight = 39 // ExPanel header bar height
    
    // Calculate scale to fit within max available space
    const scaleX = maxW / img.naturalWidth
    const scaleY = (maxH - headerHeight) / img.naturalHeight
    const S = Math.min(1, scaleX, scaleY)
    
    // Calculate the fit image dimensions
    const fitImgW = img.naturalWidth * S
    const fitImgH = img.naturalHeight * S
    
    // Set panel dimensions with 16:9 minimum (e.g. 320x180) plus header
    const panelW = Math.max(320, fitImgW)
    const panelH = Math.max(180, fitImgH + headerHeight)
    
    previewPanelSize.width = `${panelW}px`
    previewPanelSize.height = `${panelH}px`
    
    scale.value = S
    offset.x = 0
    offset.y = 0
    
    isImgLoaded.value = true
  }
}

const onImageLoad = () => {
  if (props.previewMode) {
    fitImageToPreview()
  } else {
    isImgLoaded.value = true
  }
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    resetView()
    if (props.previewMode) {
      isImgLoaded.value = false
      // Pre-fetch image to calculate dimensions instantly in JS before DOM render transition
      const tempImg = new Image()
      tempImg.onload = () => {
        if (tempImg.naturalWidth && tempImg.naturalHeight) {
          const maxW = Math.min(window.innerWidth * 0.9, 1200)
          const maxH = window.innerHeight * 0.85
          const headerHeight = 39
          
          const scaleX = maxW / tempImg.naturalWidth
          const scaleY = (maxH - headerHeight) / tempImg.naturalHeight
          const S = Math.min(1, scaleX, scaleY)
          
          const fitImgW = tempImg.naturalWidth * S
          const fitImgH = tempImg.naturalHeight * S
          
          const panelW = Math.max(320, fitImgW)
          const panelH = Math.max(180, fitImgH + headerHeight)
          
          previewPanelSize.width = `${panelW}px`
          previewPanelSize.height = `${panelH}px`
          
          scale.value = S
          offset.x = 0
          offset.y = 0
          
          isImgLoaded.value = true
        }
      }
      tempImg.src = props.imageUrl
    } else {
      isImgLoaded.value = true
    }
  } else {
    isImgLoaded.value = false
  }
}, { immediate: true })
</script>

<template>
  <Transition name="fade-editor">
    <div v-if="isOpen" 
         class="fixed inset-0 z-[7000] font-mono nier-text-primary transition-all duration-500"
         :class="[
           previewMode ? 'bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8' : 'bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-2xl flex flex-col overflow-hidden',
           isImgLoaded ? 'opacity-100' : 'opacity-0 pointer-events-none'
         ]"
         @wheel="handleWheel"
         @click="previewMode ? emit('close') : null">
      
      <!-- HEADER (Editor Mode Only) -->
      <header v-if="!previewMode" class="h-20 border-b nier-border-primary flex items-center justify-between px-12 bg-white/50 dark:bg-[#0a0a0a]/50" @mousedown.stop>
        <div class="flex items-center space-x-8">
          <div class="w-5 h-5 nier-bg-inverted rotate-45 flex items-center justify-center">
            <div class="w-2 h-2 nier-bg-panel rotate-45"></div>
          </div>
          <div class="flex flex-col">
            <span class="text-[11px] tracking-[0.6em] font-black uppercase">Visual_Reification_Engine</span>
            <span class="text-[8px] tracking-[0.2em] opacity-30 uppercase">Scribe_Module_v1.1 // Active_Persistence</span>
          </div>
        </div>

        <div class="flex items-center space-x-8">
          <ExButton variant="ghost" size="sm" @click="resetView">Reset_View</ExButton>
          <div class="w-px h-8 bg-black/10 dark:border-white/10 opacity-20"></div>
          <button @click="emit('close')" 
                  class="group relative flex items-center px-8 py-3 overflow-hidden border nier-border-primary hover:border-red-500/40 transition-all duration-700 bg-black/[0.02] dark:bg-white/[0.02] backdrop-blur-sm">
            <!-- Kinetic Background -->
            <div class="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out"></div>
            
            <div class="relative flex items-center space-x-4">
              <div class="relative w-2 h-2">
                <div class="absolute inset-0 bg-red-500 rotate-45 animate-pulse"></div>
                <div class="absolute inset-0 bg-red-500 rotate-45 blur-sm opacity-50 animate-pulse"></div>
              </div>
              <div class="flex flex-col items-start">
                <span class="text-[10px] font-black tracking-[0.4em] uppercase group-hover:text-red-500 transition-colors duration-500">Abort_Scribe</span>
                <span class="text-[6px] font-bold tracking-[0.2em] opacity-30 group-hover:opacity-50 uppercase">Terminate_Archival_Process</span>
              </div>
            </div>

            <!-- Corner Accents -->
            <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-black/20 dark:border-white/20 group-hover:border-red-500/50 transition-colors duration-500"></div>
            <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-black/20 dark:border-white/20 group-hover:border-red-500/50 transition-colors duration-500"></div>
          </button>
        </div>
      </header>

      <!-- PREVIEW MODE PANEL WRAPPER -->
      <div v-if="previewMode && isImgLoaded" 
           class="flex flex-col max-w-[90vw] max-h-[90vh]" 
           :style="{ width: previewPanelSize.width, height: previewPanelSize.height }" 
           @click.stop>
        <ExPanel title="VISUAL_PREVIEW_MODALITY" class="w-full h-full flex flex-col shadow-2xl" noPadding>
          <template #telemetry>
            <div class="flex items-center space-x-6">
              <button @click="emit('close')" 
                      class="group relative flex items-center space-x-2 px-4 py-1.5 border border-black/10 dark:border-white/20 hover:border-black dark:hover:border-white bg-black/5 dark:bg-white/5 transition-all duration-500 overflow-hidden">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5 nier-text-primary opacity-40 group-hover:opacity-100 group-hover:rotate-90 transition-all duration-700 shrink-0">
                  <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <span class="text-[9px] font-mono font-black uppercase tracking-[0.2em] nier-text-primary opacity-80 group-hover:opacity-100 transition-opacity">Close_Preview</span>
              </button>
            </div>
          </template>

          <!-- MAIN WORKSPACE FOR PREVIEW -->
          <main class="flex-grow w-full min-w-0 min-h-0 relative flex items-center justify-center overflow-hidden bg-[#020617]">
            <!-- GENESIS MATRIX BACKGROUND -->
            <div class="absolute inset-0 z-0 bg-[#000000] pointer-events-none overflow-hidden animate-in fade-in duration-1000">
               <!-- Static Tactical Grid -->
               <div class="absolute inset-0 opacity-[0.08]" 
                    style="background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 60px 60px;"></div>
               
               <!-- System Vignette -->
               <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000000_100%)] opacity-60"></div>

               <!-- Telemetry Accents -->
               <div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center space-x-4 opacity-10">
                  <div class="w-1 h-1 bg-white rotate-45"></div>
                  <span class="text-[7px] font-mono tracking-[1em] uppercase">Genesis_Matrix_Reification_Field</span>
                  <div class="w-1 h-1 bg-white rotate-45"></div>
               </div>
            </div>

            <!-- Transform Wrapper (GPU Scaled) -->
            <div class="relative select-none" :style="viewportStyle">
              
              <!-- Image Layer -->
              <div class="relative shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 bg-black overflow-hidden">
                <img ref="imgRef" :src="imageUrl" @load="onImageLoad" class="block pointer-events-none" draggable="false" />
                
                <!-- SVG Annotation Layer -->
                <svg ref="svgRef" class="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-hidden">
                   <!-- Paths -->
                   <polyline 
                     v-for="p in annotations.paths" :key="p.id"
                     :points="p.points.map((pt: any) => `${pt.x},${pt.y}`).join(' ')"
                     :stroke="p.color" :stroke-width="p.width" fill="none"
                     stroke-linecap="round" stroke-linejoin="round"
                   />
                   <!-- Rects -->
                   <rect 
                     v-for="r in annotations.rects" :key="r.id"
                     :x="Math.min(r.x, r.x + r.w)" :y="Math.min(r.y, r.y + r.h)"
                     :width="Math.abs(r.w)" :height="Math.abs(r.h)"
                     :stroke="r.color" :stroke-width="r.width || 2" fill="none"
                   />
                   <!-- Lines -->
                   <line 
                     v-for="l in annotations.lines" :key="l.id"
                     :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
                     :stroke="l.color" :stroke-width="l.width || 2"
                   />
                </svg>

                <!-- Text Layer (HTML) -->
                <div class="absolute inset-0 pointer-events-none z-20">
                  <div v-for="t in annotations.texts" :key="t.id"
                       class="absolute pointer-events-none whitespace-nowrap"
                       :style="{ left: t.x + 'px', top: t.y + 'px' }">
                    <div class="outline-none px-2"
                         :style="{
                           color: t.color, 
                           fontSize: t.size + 'px',
                           fontWeight: t.bold ? 'bold' : 'normal',
                           fontStyle: t.italic ? 'italic' : 'normal',
                           textShadow: '0 0 10px rgba(0,0,0,0.5)',
                           border: t.borderWidth ? `${t.borderWidth}px solid ${t.borderColor}` : 'none',
                           backgroundColor: t.bgColor || 'transparent',
                           textDecoration: `${t.underline ? 'underline' : ''} ${t.strike ? 'line-through' : ''}`.trim(),
                           letterSpacing: `${t.tracking}px`
                         }">
                      {{ t.content }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </ExPanel>
      </div>

      <!-- MAIN WORKSPACE (Editor Mode Only) -->
      <main v-if="!previewMode" class="flex-grow relative flex items-center justify-center overflow-hidden bg-black/5 dark:bg-black/40">
        
        <!-- Background Grid -->
        <div class="absolute inset-0 opacity-[0.05] dark:opacity-[0.03] pointer-events-none" 
             style="background-image: radial-gradient(circle, currentColor 1px, transparent 1px); background-size: 30px 30px;"></div>

        <!-- Transform Wrapper -->
        <div class="relative select-none" 
             :style="viewportStyle"
             :class="{ 
                'cursor-grabbing': isPanning,
                'cursor-grab': previewMode && !isPanning,
                'cursor-move': !previewMode && activeTool === 'pan' && !isPanning,
                'cursor-crosshair': !previewMode && !isPanning && !['pan', 'brush', 'eraser'].includes(activeTool),
                'cursor-none': !previewMode && !isPanning && (isDrawing || ['brush', 'eraser'].includes(activeTool)) && isOverImage
              }"
             @mousedown="handleMouseDown"
             @mousemove="handleMouseMove">
          
          <!-- Image Layer -->
          <div class="relative shadow-[0_0_100px_rgba(0,0,0,0.2)] dark:shadow-[0_0_100px_rgba(0,0,0,0.5)] border nier-border-primary nier-bg-panel overflow-hidden"
               :class="{ 'cursor-none': (isDrawing || ['brush', 'eraser'].includes(activeTool)) && isOverImage }">
            <img :src="imageUrl" class="block pointer-events-none" draggable="false" />
            
            <!-- SVG Annotation Layer -->
            <svg ref="svgRef" class="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-hidden">
               <!-- Paths -->
               <polyline 
                 v-for="p in annotations.paths" :key="p.id"
                 :points="p.points.map((pt: any) => `${pt.x},${pt.y}`).join(' ')"
                 :stroke="p.color" :stroke-width="p.width" fill="none"
                 stroke-linecap="round" stroke-linejoin="round"
                 class="pointer-events-auto"
                 :class="{ 'is-selected': selectedElement === p, 'pointer-events-none': isDrawing || ['brush', 'eraser'].includes(activeTool) }"
                 @mousedown.stop="selectElement('path', p, $event)"
               />
               <!-- Rects -->
               <rect 
                 v-for="r in annotations.rects" :key="r.id"
                 :x="Math.min(r.x, r.x + r.w)" :y="Math.min(r.y, r.y + r.h)"
                 :width="Math.abs(r.w)" :height="Math.abs(r.h)"
                 :stroke="r.color" :stroke-width="r.width || 2" fill="none"
                 class="pointer-events-auto"
                 :class="{ 'is-selected': selectedElement === r, 'pointer-events-none': isDrawing || ['brush', 'eraser'].includes(activeTool) }"
                 @mousedown.stop="selectElement('rect', r, $event)"
               />
               <!-- Lines -->
               <line 
                 v-for="l in annotations.lines" :key="l.id"
                 :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
                 :stroke="l.color" :stroke-width="l.width || 2"
                 class="pointer-events-auto"
                 :class="{ 'is-selected': selectedElement === l, 'pointer-events-none': isDrawing || ['brush', 'eraser'].includes(activeTool) }"
                 @mousedown.stop="selectElement('line', l, $event)"
               />

               <!-- SELECTION BOX (SVG) -->
               <template v-if="selectionBox && selectedElementType !== 'text'">
                  <!-- Subtle Dashed Outline -->
                  <rect 
                    :x="selectionBox.x - (8 / scale)" :y="selectionBox.y - (8 / scale)"
                    :width="selectionBox.w + (16 / scale)" :height="selectionBox.h + (16 / scale)"
                    fill="none" stroke="currentColor" :stroke-width="1 / scale" :stroke-dasharray="`${4/scale},${4/scale}`"
                    class="opacity-20"
                  />
                  
                  <!-- Corner Brackets (Cinematic HUD Style) -->
                  <path :d="`M ${selectionBox.x - (8 / scale)} ${selectionBox.y + (8 / scale)} L ${selectionBox.x - (8 / scale)} ${selectionBox.y - (8 / scale)} L ${selectionBox.x + (8 / scale)} ${selectionBox.y - (8 / scale)}`" 
                        fill="none" stroke="currentColor" :stroke-width="2 / scale" />
                  <path :d="`M ${selectionBox.x + selectionBox.w + (8 / scale) - (16 / scale)} ${selectionBox.y - (8 / scale)} L ${selectionBox.x + selectionBox.w + (8 / scale)} ${selectionBox.y - (8 / scale)} L ${selectionBox.x + selectionBox.w + (8 / scale)} ${selectionBox.y + (8 / scale)}`" 
                        fill="none" stroke="currentColor" :stroke-width="2 / scale" />
                  <path :d="`M ${selectionBox.x - (8 / scale)} ${selectionBox.y + selectionBox.h + (8 / scale) - (16 / scale)} L ${selectionBox.x - (8 / scale)} ${selectionBox.y + selectionBox.h + (8 / scale)} L ${selectionBox.x + (8 / scale)} ${selectionBox.y + selectionBox.h + (8 / scale)}`" 
                        fill="none" stroke="currentColor" :stroke-width="2 / scale" />
                  <path :d="`M ${selectionBox.x + selectionBox.w + (8 / scale) - (16 / scale)} ${selectionBox.y + selectionBox.h + (8 / scale)} L ${selectionBox.x + selectionBox.w + (8 / scale)} ${selectionBox.y + selectionBox.h + (8 / scale)} L ${selectionBox.x + selectionBox.w + (8 / scale)} ${selectionBox.y + selectionBox.h + (8 / scale) - (16 / scale)}`" 
                        fill="none" stroke="currentColor" :stroke-width="2 / scale" />

                  <!-- REMOVE BUTTON (Diamond HUD Style) -->
                  <g :transform="`translate(${selectionBox.x + selectionBox.w + (12 / scale)}, ${selectionBox.y - (12 / scale)})`" 
                     class="pointer-events-auto cursor-pointer group/del"
                     @mousedown.stop="removeSelected">
                     <rect 
                       :x="-10 / scale" :y="-10 / scale"
                       :width="20 / scale" :height="20 / scale"
                       fill="black" stroke="white" :stroke-width="1 / scale"
                       transform="rotate(45)"
                       class="dark:fill-white dark:stroke-black group-hover/del:fill-red-500 group-hover/del:stroke-white transition-all duration-300"
                     />
                     <text 
                       :y="4 / scale"
                       :font-size="12 / scale" fill="white" class="dark:fill-black pointer-events-none select-none font-black" text-anchor="middle"
                     >×</text>
                  </g>
               </template>

               <!-- VISUAL CURSOR (Brush/Eraser) -->
               <circle 
                 v-if="['brush', 'eraser'].includes(activeTool) && !isPanning && isOverImage"
                 :cx="mouseX" :cy="mouseY" 
                 :r="(activeTool === 'brush' ? strokeWidth : eraserSize) / 2"
                 fill="none" 
                  stroke="black"
                  stroke-width="1.5"
                  vector-effect="non-scaling-stroke"
                  :stroke-dasharray="activeTool === 'eraser' ? '4,4' : 'none'"
                  class="pointer-events-none opacity-60"
               />
            </svg>

            <!-- Text Layer (HTML) -->
            <div class="absolute inset-0 pointer-events-none z-20">
              <div v-for="t in annotations.texts" :key="t.id"
                   class="absolute pointer-events-auto whitespace-nowrap group/text"
                   :class="{ 'pointer-events-none': ['brush', 'eraser'].includes(activeTool) }"
                   :style="{ 
                     left: t.x + 'px', 
                     top: t.y + 'px', 
                   }">
                
                <!-- Selection HUD for Text -->
                <template v-if="selectedElement === t">
                   <div class="absolute -inset-2 border border-black/20 dark:border-white/20 border-dashed pointer-events-none"></div>
                   <!-- Corner Brackets -->
                   <div class="absolute -top-3 -left-3 w-3 h-3 border-t-2 border-l-2 border-black dark:border-white"></div>
                   <div class="absolute -top-3 -right-3 w-3 h-3 border-t-2 border-r-2 border-black dark:border-white"></div>
                   <div class="absolute -bottom-3 -left-3 w-3 h-3 border-b-2 border-l-2 border-black dark:border-white"></div>
                   <div class="absolute -bottom-3 -right-3 w-3 h-3 border-b-2 border-r-2 border-black dark:border-white"></div>

                   <!-- Remove Handle -->
                   <div class="absolute -top-6 -right-6 w-6 h-6 flex items-center justify-center cursor-pointer pointer-events-auto group/del"
                        @mousedown.stop="removeSelected">
                      <div class="w-4 h-4 nier-bg-inverted border border-white dark:border-black rotate-45 group-hover/del:bg-red-500 group-hover/del:scale-110 transition-all duration-300 flex items-center justify-center">
                         <span class="rotate-[-45deg] text-[10px] nier-text-primary font-black">×</span>
                      </div>
                   </div>
                </template>

                <div class="outline-none px-2"
                     :class="{ 
                       'cursor-text': !['brush', 'eraser'].includes(activeTool),
                       'select-none': isDrawing && selectedElement === t, 
                       'pointer-events-none': isDrawing && selectedElement !== t 
                     }"
                     :style="{
                       color: t.color, 
                       fontSize: t.size + 'px',
                       fontWeight: t.bold ? 'bold' : 'normal',
                       fontStyle: t.italic ? 'italic' : 'normal',
                       textShadow: '0 0 10px rgba(0,0,0,0.5)',
                       userSelect: isDrawing && selectedElement === t ? 'none' : 'auto',
                       border: t.borderWidth ? `${t.borderWidth}px solid ${t.borderColor}` : 'none',
                       backgroundColor: t.bgColor || 'transparent',
                       textDecoration: `${t.underline ? 'underline' : ''} ${t.strike ? 'line-through' : ''}`.trim(),
                       letterSpacing: `${t.tracking}px`
                     }"
                     :contenteditable="!(isDrawing && selectedElement === t)"
                     @mousedown.stop="selectElement('text', t, $event)"
                     @input="t.content = ($event.target as HTMLElement).innerText">
                  {{ t.content }}
                </div>
              </div>
            </div>
            
            <!-- Corner Brackets -->
            <div class="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-black/20 dark:border-white/40 pointer-events-none"></div>
            <div class="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-black/20 dark:border-white/40 pointer-events-none"></div>
          </div>
        </div>

        <div v-if="!previewMode" class="absolute left-12 top-1/2 -translate-y-1/2 flex flex-col space-y-3" @mousedown.stop>
          <div class="p-3 border nier-border-primary nier-bg-panel flex flex-col space-y-2 shadow-2xl relative">
            <!-- Standard corners -->
            <div class="absolute -top-px -left-px w-2 h-2 border-t border-l border-black dark:border-white"></div>
            <div class="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-black dark:border-white"></div>
            <button 
              v-for="tool in tools" 
              :key="tool.id"
              @click="handleToolChange(tool.id)"
              class="w-12 h-12 flex items-center justify-center transition-all duration-300 relative group"
              :class="activeTool === tool.id ? 'nier-bg-inverted nier-text-primary shadow-lg' : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-40 hover:opacity-100'"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" :d="tool.icon" />
              </svg>
              <!-- Tooltip -->
              <div class="absolute left-full ml-4 px-3 py-1 nier-bg-inverted nier-text-primary text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {{ tool.label }}
              </div>
            </button>
          </div>
        </div>

        <!-- INSTRUMENT PANEL (Right) -->
        <div v-if="!previewMode" class="absolute right-12 top-1/2 -translate-y-1/2 w-80 translate-x-4 group-hover:translate-x-0 transition-transform duration-700" @mousedown.stop>
          <div class="relative">
             <!-- Standard corners -->
             <div class="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-black dark:border-white z-10"></div>
             <div class="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-black dark:border-white z-10"></div>
             
             <ExPanel :title="selectedElement ? `EDIT: [${selectedElementType?.toUpperCase()}]` : `TOOL: [${activeTool.toUpperCase()}]`" :showCorners="false" noPadding>
            <div class="p-8 space-y-10 nier-bg-panel">
              
              <!-- Text Config (Only for Text tool or selection) -->
              <div v-if="activeTool === 'text' || selectedElementType === 'text'" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div class="flex items-center justify-between border-b nier-border-primary pb-2">
                  <span class="text-[9px] font-black uppercase tracking-[0.4em] opacity-40 nier-text-primary">Text_Config</span>
                  <div class="w-1.5 h-1.5 nier-bg-inverted rotate-45"></div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                  <ExButton :variant="isBold ? 'solid' : 'ghost'" size="sm" class="!px-0" @click="isBold = !isBold">BOLD</ExButton>
                  <ExButton :variant="isItalic ? 'solid' : 'ghost'" size="sm" class="!px-0" @click="isItalic = !isItalic">ITALIC</ExButton>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <ExButton :variant="isUnderline ? 'solid' : 'ghost'" size="sm" class="!px-0" @click="isUnderline = !isUnderline">UNDER</ExButton>
                  <ExButton :variant="isStrike ? 'solid' : 'ghost'" size="sm" class="!px-0" @click="isStrike = !isStrike">STRIKE</ExButton>
                </div>

                <div class="space-y-4">
                  <div class="space-y-2">
                    <div class="flex justify-between items-center text-[9px] uppercase tracking-widest nier-text-primary">
                      <span class="opacity-40">Font_Scale</span>
                      <span class="font-black">{{ textSize }}px</span>
                    </div>
                    <input type="range" v-model="textSize" min="12" max="72" class="w-full accent-black dark:accent-white opacity-50 hover:opacity-100 transition-opacity" />
                  </div>

                  <div class="space-y-2">
                    <div class="flex justify-between items-center text-[9px] uppercase tracking-widest nier-text-primary">
                      <span class="opacity-40">Tracking</span>
                      <span class="font-black">{{ textTracking }}px</span>
                    </div>
                    <input type="range" v-model="textTracking" min="-5" max="20" step="0.5" class="w-full accent-black dark:accent-white opacity-50 hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                <!-- Advanced Text Aesthetics -->
                <div class="space-y-4 pt-4 border-t border-black/5 dark:border-white/5">
                   <!-- Background -->
                   <div class="flex items-center justify-between">
                      <span class="text-[8px] uppercase tracking-widest opacity-40">Background</span>
                      <div class="flex items-center space-x-2">
                        <div @click="textBgColor = 'transparent'" class="w-4 h-4 border nier-border-primary flex items-center justify-center cursor-pointer opacity-40 hover:opacity-100">
                          <div class="w-px h-full bg-red-500 rotate-45"></div>
                        </div>
                        <div @click="textBgInput?.click()" class="w-8 h-4 border nier-border-primary cursor-pointer" :style="{ backgroundColor: textBgColor }"></div>
                        <input type="color" ref="textBgInput" v-model="textBgColor" class="sr-only" />
                      </div>
                   </div>
                   <!-- Border -->
                   <div class="space-y-2">
                      <div class="flex items-center justify-between">
                         <span class="text-[8px] uppercase tracking-widest opacity-40">Border</span>
                         <div class="flex items-center space-x-2">
                           <div @click="textBorderColor = 'transparent'; textBorderWidth = 0" class="w-4 h-4 border nier-border-primary flex items-center justify-center cursor-pointer opacity-40 hover:opacity-100">
                             <div class="w-px h-full bg-red-500 rotate-45"></div>
                           </div>
                           <div @click="textBorderInput?.click()" class="w-8 h-4 border nier-border-primary cursor-pointer" :style="{ backgroundColor: textBorderColor }"></div>
                           <input type="color" ref="textBorderInput" v-model="textBorderColor" class="sr-only" />
                         </div>
                      </div>
                      <input v-if="textBorderColor !== 'transparent'" type="range" v-model="textBorderWidth" min="1" max="10" step="1" class="w-full accent-black dark:accent-white opacity-30 h-1" />
                   </div>
                </div>
              </div>

              <!-- Stroke Config (For shapes/brush) -->
              <div v-if="['brush', 'square', 'trendline'].includes(activeTool) || (selectedElement && selectedElementType !== 'text')" 
                   class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div class="flex items-center justify-between border-b nier-border-primary pb-2">
                  <span class="text-[9px] font-black uppercase tracking-[0.4em] opacity-40 nier-text-primary">Stroke_Config</span>
                </div>
                <div class="space-y-3">
                  <div class="flex justify-between items-center text-[9px] uppercase tracking-widest nier-text-primary">
                    <span class="opacity-40">Weight_px</span>
                    <span class="font-black">{{ strokeWidth }}px</span>
                  </div>
                  <input type="range" v-model="strokeWidth" min="1" max="20" step="1" class="w-full accent-black dark:accent-white opacity-50 hover:opacity-100 transition-opacity" />
                </div>
              </div>

              <!-- Eraser Config -->
              <div v-if="activeTool === 'eraser'" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div class="flex items-center justify-between border-b nier-border-primary pb-2">
                  <span class="text-[9px] font-black uppercase tracking-[0.4em] opacity-40 nier-text-primary">Eraser_Config</span>
                </div>
                <div class="space-y-3">
                  <div class="flex justify-between items-center text-[9px] uppercase tracking-widest nier-text-primary">
                    <span class="opacity-40">Eraser_Radius</span>
                    <span class="font-black">{{ eraserSize }}px</span>
                  </div>
                  <input type="range" v-model="eraserSize" min="5" max="100" step="1" class="w-full accent-black dark:accent-white opacity-50 hover:opacity-100 transition-opacity" />
                </div>
              </div>

              <!-- Color Config (Shown for almost everything) -->
              <div v-if="activeTool !== 'pan' && activeTool !== 'eraser'" class="space-y-6">
                <div class="flex items-center justify-between border-b nier-border-primary pb-2">
                  <span class="text-[9px] font-black uppercase tracking-[0.4em] opacity-40 nier-text-primary">Chromatic_Index</span>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button 
                    v-for="c in colors" 
                    :key="c"
                    @click="selectedColor = c"
                    class="w-8 h-8 border transition-all duration-300 hover:scale-110"
                    :class="selectedColor === c ? 'border-black dark:border-white scale-110 shadow-lg' : 'nier-border-primary opacity-60 hover:opacity-100'"
                    :style="{ backgroundColor: c }"
                  ></button>
                  
                  <!-- Custom Color Trigger -->
                  <button @click="colorInput?.click()" 
                          class="w-8 h-8 border nier-border-primary flex items-center justify-center relative overflow-hidden group/color shadow-sm hover:scale-110 transition-transform">
                    <div class="absolute inset-0 bg-gradient-to-tr from-red-500 via-green-500 to-blue-500 opacity-40 group-hover/color:opacity-100 transition-opacity"></div>
                    <span class="relative text-[10px] font-black text-white mix-blend-difference">+</span>
                    <input type="color" ref="colorInput" v-model="selectedColor" class="absolute inset-0 opacity-0 cursor-pointer" />
                  </button>
                </div>
              </div>

              <!-- Action Bar (Clear All) -->
              <div class="pt-6 border-t nier-border-primary flex flex-col space-y-3">
                <div @click="clearBuffer" class="flex items-center justify-center space-x-3 opacity-20 hover:opacity-60 transition-opacity cursor-pointer">
                   <div class="w-1 h-1 nier-bg-inverted rotate-45"></div>
                   <span class="text-[8px] uppercase tracking-widest font-black nier-text-primary">Wipe_All_Annotations</span>
                </div>
              </div>
            </div>
          </ExPanel>
        </div>
      </div>
    </main>
  </div>
  </Transition>
</template>

<style scoped>
.fade-editor-enter-active, .fade-editor-leave-active {
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-editor-enter-from, .fade-editor-leave-to {
  opacity: 0;
  transform: scale(1.05);
  filter: blur(20px);
}
@keyframes slow-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes reverse-rotate {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(12deg); }
  50% { transform: translateY(-20px) rotate(15deg); }
}
@keyframes float-delayed {
  0%, 100% { transform: translateY(0) rotate(-45deg); }
  50% { transform: translateY(20px) rotate(-40deg); }
}
.animate-slow-rotate {
  animation: slow-rotate 60s linear infinite;
}
.animate-reverse-rotate {
  animation: reverse-rotate 40s linear infinite;
}
.animate-float {
  animation: float 10s ease-in-out infinite;
}
.animate-float-delayed {
  animation: float-delayed 12s ease-in-out infinite;
}

@keyframes pulse-slow {
  0%, 100% { opacity: 0.1; transform: scale(1); }
  50% { opacity: 0.2; transform: scale(1.1); }
}
@keyframes pulse-delayed {
  0%, 100% { opacity: 0.05; transform: scale(1.1); }
  50% { opacity: 0.15; transform: scale(1); }
}
.animate-pulse-slow {
  animation: pulse-slow 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.animate-pulse-delayed {
  animation: pulse-delayed 12s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  background: rgba(0,0,0,0.1);
  height: 2px;
}
.dark input[type="range"] {
  background: rgba(255,255,255,0.1);
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: currentColor;
  transform: rotate(45deg);
  cursor: pointer;
}
</style>
