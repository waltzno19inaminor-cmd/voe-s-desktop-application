<template>
  <div class="matrix-tree w-full h-full relative flex flex-col overflow-hidden text-nier-text-light dark:text-nier-text-dark select-none"
       @mousemove="menu.updateMousePos">

    <!-- GLOBAL DRAG OVERLAY TO PREVENT HOVER/CLICKS ON UNDERLYING ELEMENTS -->
    <div v-if="state.isCommentDragging.value" class="fixed inset-0 z-[99999] cursor-move pointer-events-auto"></div>

    <!-- STRATEGY PAGE SWITCHER -->
    <div v-if="state.navigationStack.value.length === 0"
         class="absolute top-6 left-1/2 -translate-x-1/2 transform-gpu z-[180] flex items-center gap-2 pointer-events-auto">
      <button v-for="(page, index) in state.matrixPages.value"
              :key="page.id"
              @click="state.switchMatrixPage(page.id)"
              @contextmenu.prevent.stop="menu.handlePageContextMenu($event, page.id)"
              class="group relative h-9 min-w-[120px] border px-4 bg-nier-white/80 dark:bg-nier-black/80 backdrop-blur-xl transition-opacity duration-300"
              :class="state.activePageId.value === page.id
                ? '!border-black !bg-white !text-black opacity-100'
                : 'border-nier-border-light dark:border-nier-border-dark opacity-35 hover:opacity-100'">
        <span class="block text-[8px] font-mono uppercase tracking-[0.28em] font-black truncate max-w-[160px]">
          {{ getPageLabel(page, index) }}
        </span>
      </button>
      <button @click="state.addMatrixPage()"
              class="h-9 w-9 border border-nier-border-light dark:border-nier-border-dark bg-nier-white/80 dark:bg-nier-black/80 backdrop-blur-xl text-[14px] font-mono font-black opacity-50 hover:opacity-100 transition-all">
        +
      </button>
    </div>
    
    <!-- TACTICAL GRID OVERLAY REMOVED AS PER REQUEST -->

    <!-- MAIN CANVAS -->
    <div class="flex-grow relative overflow-hidden" 
         :class="state.pendingNodeConfig.value ? 'cursor-crosshair' : (state.viewState.value.isPanning ? 'cursor-grabbing' : 'cursor-move')"
         :ref="(el) => { canvas.canvasWrapper.value = el as HTMLElement }"
         @mousedown="canvas.startPan($event, zoneTools.isZoneToolActive.value, zoneTools.drawStart, zoneTools.drawCurrent)"
         @click="canvas.handleBackgroundClick"
         @contextmenu.prevent="handleBoardContextMenu"
         @mousemove="canvas.handleCanvasMouseMove($event, zoneTools.drawStart, zoneTools.drawCurrent)"
         @mouseup="canvas.handleCanvasMouseUp(zoneTools)">
      
      <!-- REIFICATION LAYER (Transformed) -->
      <div class="absolute inset-0 origin-top-left pointer-events-none" :style="state.contentTransform.value">
        <!-- Re-enable pointer events for specific children -->
        <div class="absolute inset-0 pointer-events-auto">
        
        <!-- TACTICAL ZONES (Back Layer) -->
        <div class="absolute inset-0 z-0">
           <!-- Render Sessions First (Bottom Depth) -->
           <ExZone v-for="zone in state.zones.value.filter((z: Zone) => z.type === 'session')" :key="zone.id"
                   :zone="zone" 
                   :scale="state.viewState.value.scale"
                   @remove="zoneTools.removeZone" 
                   @cycle-type="zoneTools.handleZoneCycle"
                   @drag-start="zoneTools.startZoneDrag($event, zone)"
                   @resize-start="zoneTools.startZoneResize($event, zone)" />

           <!-- Render Tactical Zones (Mid Depth) -->
           <ExZone v-for="zone in state.zones.value.filter((z: Zone) => z.type !== 'session')" :key="zone.id"
                   :zone="zone" 
                   :scale="state.viewState.value.scale"
                   @remove="zoneTools.removeZone" 
                   @cycle-type="zoneTools.handleZoneCycle"
                   @drag-start="zoneTools.startZoneDrag($event, zone)"
                   @resize-start="zoneTools.startZoneResize($event, zone)" />

           <!-- Zone Drawing Preview -->
           <div v-if="zoneTools.drawStart?.value && zoneTools.drawCurrent?.value" 
                class="absolute border border-current opacity-20 pointer-events-none"
                :style="zoneTools.drawPreviewStyle.value">
              <div class="absolute -top-6 left-0 text-[8px] font-mono tracking-widest uppercase italic opacity-40">
                {{ t('matrix.constructingDomain') }} {{ matrixText(t, `${zoneTools.selectedZoneType.value.replace(/_/g, ' ').toUpperCase()} ZONE`) }}...
              </div>
           </div>
           <input type="file" :ref="(el) => { uploads.imageInput.value = el as HTMLInputElement }" class="hidden" accept="image/*" @change="uploads.handleImageUpload" />
           <input type="file" :ref="(el) => { uploads.fileInput.value = el as HTMLInputElement }" class="hidden" accept="application/pdf,.pdf" @change="uploads.handleGenericFileUpload" />
        </div>

        <!-- SVG CONNECTIONS (THE ROOTS) -->
        <MatrixConnections :state="state" :canvas="canvas" :menu="menu" :path-math="pathMath" />

        <!-- SKILL NODES -->
        <div class="absolute inset-0 z-10 pointer-events-none">
          <ExSkillNode v-for="node in state.nodes.value" :key="node.id"
                       :node="node" 
                       :scale="state.viewState.value.scale"
                       :is-selected="state.lastSelectedId.value === node.id"
                       :is-closest="canvas.closestNodeId.value === node.id"
                       :is-dark="isDark"
                       :is-board-panning="state.viewState.value.isPanning"
                       :class="{ 'pointer-events-none': state.isCommentDragging.value && state.lastSelectedId.value !== node.id }"
                       @comment-drag-start="state.isCommentDragging.value = true"
                       @comment-drag-end="state.isCommentDragging.value = false"
                       @click="state.selectNode(node.id)"
                       @doubleclick="handleNodeDive(node)"
                       @start-output="canvas.startWireDrag"
                       @pickup-input="canvas.handlePickupInput"
                       @drop="canvas.completeWireDrop"
                       @remove="state.removeNode"
                       @clear-input="state.clearNodeInputConnections"
                       @clear-output="state.clearNodeOutputConnections"
                       @contextmenu="menu.handleNodeContextMenu"
                       @merge="state.mergeNodes($event.fromId, $event.toId)"
                       @open-file="openFilePreview"
                       @moved="state.handleNodeMoved" />
        </div>
        </div>
      </div>

      <div v-if="state.viewState.value.isPanning"
           class="absolute inset-0 z-[90] cursor-grabbing pointer-events-auto select-none"
           @mousedown.prevent
           @click.stop.prevent></div>

      <!-- VIEWPORT TELEMETRY -->
      <MatrixTelemetry :view-state="state.viewState.value" :is-scenario-context="!!state.isScenarioContext.value"
                       :is-dark="isDark"
                       :can-create-strategy-version="canCreateStrategyVersion"
                       :has-selected-strategy-version="!!state.selectedStrategyVersion.value"
                       :has-strategy-version-changes="state.hasStrategyVersionChanges.value"
                       :strategy-versions="state.strategyVersions.value"
                       :git-panel-open="isGitPanelOpen"
                       @reset-view="canvas.resetView" @update-scale="(s) => state.viewState.value.scale = s"
                       @strategy-version-create="state.createStrategyVersion"
                       @strategy-version-update="state.updateSelectedStrategyVersion"
                       @strategy-version-clear="clearStrategyVersionChanges"
                       @git-panel-state="isGitPanelOpen = $event"
                       @close-context-menus="closeContextMenus" />

      <!-- OFFSCREEN STRATEGY INDICATORS -->
      <div v-for="indicator in strategyIndicators" :key="indicator.id" 
           class="absolute pointer-events-auto flex flex-col items-center transition-all duration-300 z-[150]"
           :style="{ left: indicator.x + 'px', top: indicator.y + 'px', transform: 'translate(-50%, -50%)' }">
        <div class="w-10 h-10 flex items-center justify-center transition-transform duration-100 cursor-pointer group"
             :style="{ transform: `rotate(${indicator.angle}deg)` }"
             @click="focusNode(indicator.id)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="drop-shadow-sm transition-transform group-hover:scale-125" :class="isDark ? 'text-white' : 'text-black'">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="flex flex-col items-center mt-1">
          <span class="text-[8px] font-mono font-bold tracking-widest uppercase truncate max-w-[100px]" :class="isDark ? 'text-white' : 'text-black'">{{ indicator.name }}</span>
          <span class="text-[7px] font-mono opacity-60 font-bold" :class="isDark ? 'text-white' : 'text-black'">{{ indicator.dist }}px</span>
        </div>
      </div>

      <!-- CENTERED NAVIGATION HUB -->
         <div v-if="state.navigationStack.value.length > 0" 
              class="absolute top-12 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center pointer-events-auto">
            <div class="flex items-center space-x-8 bg-nier-white dark:bg-nier-black border border-nier-border-light dark:border-nier-border-dark px-10 py-3 shadow-2xl relative">
               <!-- Decor Corners -->
               <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-nier-text-light/30 dark:border-nier-text-dark/30"></div>
               <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-nier-text-light/30 dark:border-nier-text-dark/30"></div>
               
               <div v-for="(crumb, idx) in state.breadcrumbs.value" :key="crumb.id || 'root'" class="flex items-center">
                  <button @click="state.jumpTo(idx === 0 ? null : idx - 1)" 
                          class="text-[10px] font-mono tracking-[0.4em] uppercase transition-all"
                          :class="idx === state.breadcrumbs.value.length - 1 ? 'opacity-100 font-black underline underline-offset-8 decoration-nier-text-light/30 dark:decoration-nier-text-dark/30' : 'opacity-30 hover:opacity-100'">
                     {{ crumb.label }}
                  </button>
                  <span v-if="idx < state.breadcrumbs.value.length - 1" class="mx-4 opacity-10 text-[10px]">/</span>
               </div>
            </div>
         </div>

      <!-- SEQUENTIAL PROMPT (Nier Style) -->
      <div v-if="state.shouldShowInitializePrompt.value" class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
         <div class="flex flex-col items-center space-y-4">
            <span class="text-[10px] font-mono tracking-[1em] uppercase">{{ t('matrix.initFirstStep') }}</span>
            <div class="w-1 h-32 bg-current animate-pulse"></div>
         </div>
      </div>



      <!-- COMMAND PANEL (HUD bottom) -->
      <MatrixCommandPanel v-if="!isGitPanelOpen" :state="state" :menu="menu" :audio="audio" :active-tab="activeTab" :is-dark="isDark" 
                          :active-wire="canvas.activeWire.value"
                          :is-zone-tool-active="zoneTools.isZoneToolActive.value"
                          :selected-zone-type="zoneTools.selectedZoneType.value"
                          @activate-zone="zoneTools.activateZoneTool"
                          @personal-contextmenu="menu.handlePersonalCondContextMenu" />

      <!-- CONTEXT MENUS -->
      <MatrixContextMenus :state="state" :menu="menu" :is-dark="isDark" 
                          @trigger-image-upload="uploads.triggerImageUpload" />

      <!-- DRAWING PANEL -->
      <ExDrawingPanel :drawing="drawing" />

      <!-- BOOT OVERLAY -->
      <MatrixBootOverlay :is-initializing="boot.isInitializing.value" :boot-progress="boot.bootProgress.value" :is-dark="isDark" />

      <!-- FLOATING TOOLTIP -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="menu.hoveredDescription.value" 
               class="theme-tooltip-panel matrix-tooltip-panel fixed z-[2147483647] pointer-events-none px-5 py-4 border-l-[3px] backdrop-blur-md max-w-sm overflow-hidden shadow-[6px_6px_0_0_rgba(0,0,0,0.25)] dark:shadow-[6px_6px_0_0_rgba(0,0,0,0.5)]"
               :class="isDark ? 'theme-tooltip-dark' : 'theme-tooltip-light'"
               :style="menu.tooltipStyles.value">
             <div class="absolute inset-0 pointer-events-none opacity-5 animate-scan">
               <div class="w-full h-[1px] bg-current translate-y-[-100%]"></div>
             </div>
             <div class="flex flex-col space-y-3 relative">
                <div class="flex items-center space-x-3">
                   <div class="w-1.5 h-1.5 bg-current rotate-45"></div>
                   <span class="text-[9px] font-mono tracking-[0.3em] font-black uppercase">
                      [ {{ t('matrix.systemIntel') }} v1.07 ]
                   </span>
                </div>
                <div class="w-full h-px border-t theme-tooltip-divider"></div>
                <span class="text-[11px] font-mono tracking-widest uppercase leading-relaxed font-bold italic opacity-80">
                   {{ menu.hoveredDescription.value }}
                </span>
                <div class="flex items-center space-x-2 pt-2 opacity-20">
                   <div v-for="i in 5" :key="i" class="w-1 h-1 bg-current"></div>
                </div>
             </div>
             <div class="absolute top-0 right-0 w-2 h-2 border-t border-r theme-tooltip-divider"></div>
             <div class="absolute bottom-0 left-0 w-2 h-2 border-b border-l theme-tooltip-divider"></div>
             <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r theme-tooltip-divider"></div>
          </div>
        </Transition>
      </Teleport>

      <Teleport to="body">
        <Transition name="panel-slide">
          <div
            v-if="activeFilePreviewNode"
            class="fixed inset-0 z-[2147483000] flex items-center justify-center bg-black/45 backdrop-blur-sm p-8"
            @click.self="closeFilePreview">
            <div
              class="relative"
              :style="{ width: 'min(1180px, calc(100vw - 96px))', height: 'min(820px, calc(100vh - 96px))' }">
              <button
                type="button"
                @click="closeFilePreview"
                class="absolute -right-6 top-1/2 z-[100] flex h-40 w-6 -translate-y-1/2 cursor-pointer items-center justify-center border-r border-t border-b border-black/20 bg-[#ffffff] transition-colors hover:bg-black/5 dark:border-white/20 dark:bg-[#070707] dark:hover:bg-[#111] group/close-tab">
                <div class="h-16 w-px bg-black/10 transition-all duration-300 group-hover/close-tab:bg-black/40 dark:bg-white/10 dark:group-hover/close-tab:bg-white/40"></div>
                <span class="absolute rotate-90 whitespace-nowrap text-[7px] font-mono uppercase tracking-[0.4em] text-black/10 transition-colors group-hover/close-tab:text-black/40 dark:text-white/10 dark:group-hover/close-tab:text-white/40">{{ t('matrix.closeFile') }}</span>
              </button>

              <ExPanel
                variant="light"
                no-padding
                no-shadow
                :show-corners="true"
                class="h-full w-full !border-black/20 !bg-white/85 dark:!border-white/20 dark:!bg-[#070707]/85">
                <div class="flex h-full min-h-0 flex-col bg-white/80 dark:bg-black/30">
                  <div class="flex items-center justify-between gap-6 border-b border-black/10 px-4 py-2 dark:border-white/10">
                    <div class="flex min-w-0 items-center gap-4">
                      <span class="shrink-0 text-[9px] font-mono font-black uppercase tracking-[0.4em] nier-text-primary">{{ t('matrix.pdfViewer') }}</span>
                      <span class="truncate text-[8px] font-mono uppercase tracking-[0.24em] opacity-45 nier-text-primary">{{ activeFilePreviewNode.params?.fileName }}</span>
                    </div>
                    <a
                      :href="activeFilePreviewNode.params?.fileDataUrl"
                      :download="activeFilePreviewNode.params?.fileName || 'matrix-file.pdf'"
                      class="shrink-0 text-[8px] font-mono uppercase tracking-[0.24em] opacity-40 underline transition-opacity hover:opacity-100 nier-text-primary"
                      @click.stop>
                      {{ t('matrix.download') }}
                    </a>
                  </div>
                  <iframe
                    :src="activeFilePreviewNode.params?.fileDataUrl"
                    :title="activeFilePreviewNode.params?.fileName || t('matrix.pdfPreview')"
                    class="h-full min-h-0 w-full flex-1 bg-white"
                  ></iframe>
                </div>
              </ExPanel>
            </div>
          </div>
        </Transition>
      </Teleport>

    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'

import ExSkillNode from './ExSkillNode.vue'
import ExZone from './ExZone.vue'
import MatrixBootOverlay from './MatrixBootOverlay.vue'
import MatrixTelemetry from './MatrixTelemetry.vue'
import ExPanel from '~/shared/ui/ExPanel.vue'
import ExDrawingPanel from '~/shared/ui/ExDrawingPanel.vue'
import MatrixCommandPanel from './MatrixCommandPanel.vue'
import MatrixContextMenus from './MatrixContextMenus.vue'
import MatrixConnections from './MatrixConnections.vue'

import { useMatrixState, type Zone } from '../../model/matrix/useMatrixState'
import { useMatrixCanvas, isTextEditingTarget } from '../../model/matrix/useMatrixCanvas'
import { useMatrixMenu } from '../../model/matrix/useMatrixMenu'
import { useMatrixDrawing } from '../../model/matrix/useMatrixDrawing'
import { useMatrixAudio } from '../../model/matrix/useMatrixAudio'
import { useMatrixBoot } from '../../model/matrix/useMatrixBoot'
import { useMatrixZones } from '../../model/matrix/useMatrixZones'
import { useMatrixUploads } from '../../model/matrix/useMatrixUploads'
import { usePathMath } from '../../model/matrix/usePathMath'
import { getMatrixStrategyName, isStrategyNode } from '../../model/matrix/useMatrixStrategies'
import { useExGenesisMatrixUndo } from '../../model/matrix/useExGenesisMatrixUndo'
import { collectMatrixImageUrls, preloadImageUrls } from '../../model/matrix/useMatrixImagePreload'
import { useAppBootStore } from '~/features/store/useAppBoot'
import { useGenesisMatrixData, useGenesisTrades } from '~/entities/genesis'

import { initAssetService } from '@/shared/api/asset.service'
import { useI18n } from '~/shared/i18n/useI18n'
import { matrixText } from '../../model/matrix/matrixLabels'

const genesisMatrixData = useGenesisMatrixData()
const genesisTrades = useGenesisTrades()


const state = useMatrixState()
const canvas = useMatrixCanvas(state)
const menu = useMatrixMenu(state)
const drawing = useMatrixDrawing(state)
const audio = useMatrixAudio(state)
const appBootStore = useAppBootStore()
const shouldShowInitialMatrixBoot = !(appBootStore.isGenesisMatrixSessionRestored && state.hasMatrixSessionData())
const boot = useMatrixBoot({ initiallyInitializing: shouldShowInitialMatrixBoot })
const zoneTools = useMatrixZones(state)
const uploads = useMatrixUploads(state)
const pathMath = usePathMath(state)
const undoManager = useExGenesisMatrixUndo()
const isGitPanelOpen = ref(false)
const activeFilePreviewNode = ref<any | null>(null)
const { t } = useI18n()

const clearStrategyVersionChanges = async () => {
  await state.clearStrategyVersionChanges()
  undoManager.resetSnapshot()
}

const getPageLabel = (page: any, index: number) => {
  const strategyNode = (page.nodes || []).find(isStrategyNode)
  const label = strategyNode ? getMatrixStrategyName(strategyNode) : page.name || `${t('matrix.strategyPage')} ${index + 1}`
  return String(label).replace(/_/g, ' ')
}

const canCreateStrategyVersion = computed(() => {
  const nodes = state.nodes.value
  const strategyCount = nodes.filter(isStrategyNode).length
  const scenarioCount = nodes.filter(node => node.type === 'scenario').length
  const conditionCount = nodes.filter(node => node.type === 'condition' || node.type === 'conditions').length
  const canCreateSnapshot = state.strategyVersions.value.length === 0 || (
    !!state.selectedStrategyVersion.value && state.hasStrategyVersionChanges.value
  )

  return strategyCount === 1 && scenarioCount >= 1 && conditionCount >= 1 && canCreateSnapshot
})

async function preloadRestoredMatrixImages() {
  const urls = collectMatrixImageUrls(state.matrixPages.value.flatMap((page: any) => page.nodes || []))
  await preloadImageUrls(urls, { timeoutMs: 3000, concurrency: 8 })
}

const windowSize = ref({ width: typeof window !== 'undefined' ? window.innerWidth : 1000, height: typeof window !== 'undefined' ? window.innerHeight : 1000 })
const updateWindowSize = () => {
  windowSize.value = { width: window.innerWidth, height: window.innerHeight }
}

const getIndicatorState = (worldX: number, worldY: number, hubWidth = 256, hubHeight = 96) => {
  const scale = state.viewState.value.scale
  const screenX = (worldX * scale) + state.viewState.value.panX
  const screenY = (worldY * scale) + state.viewState.value.panY
  const padding = 60

  const scaledWidth = hubWidth * scale
  const scaledHeight = hubHeight * scale

  const isOffScreen = 
    screenX + scaledWidth < 0 || 
    screenX > windowSize.value.width || 
    screenY + scaledHeight < 0 || 
    screenY > windowSize.value.height

  if (!isOffScreen) return null

  // Calculate clamped edge position
  const clampedX = Math.max(padding, Math.min(windowSize.value.width - padding, screenX + scaledWidth / 2))
  const clampedY = Math.max(padding, Math.min(windowSize.value.height - padding, screenY + scaledHeight / 2))

  // Calculate distance and angle
  const dx = screenX + scaledWidth / 2 - clampedX
  const dy = screenY + scaledHeight / 2 - clampedY
  const dist = Math.round(Math.sqrt(dx * dx + dy * dy))
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)

  return { x: clampedX, y: clampedY, dist, angle }
}

const strategyIndicators = computed(() => {
  // Only show if we are on the global layer
  if (state.navigationStack.value.length > 0) return []
  const strategyNodes = state.nodes.value.filter(n => n.type === 'strategy')
  
  return strategyNodes.map(node => {
    const indicator = getIndicatorState(node.x, node.y, 320, 120)
    if (!indicator) return null
    return {
      id: node.id,
      name: node.params?.identityName || node.label || t('matrix.strategyCore'),
      ...indicator
    }
  }).filter(Boolean) as any[]
})

const focusNode = (id: string) => {
  const node = state.nodes.value.find(n => n.id === id)
  if (node && canvas.canvasWrapper.value) {
    const rect = canvas.canvasWrapper.value.getBoundingClientRect()
    state.viewState.value.scale = 1
    state.viewState.value.panX = (rect.width / 2) - node.x
    state.viewState.value.panY = (rect.height / 2) - node.y
    state.lastSelectedId.value = null
    isGitPanelOpen.value = false
  }
}

// Global Key Listeners and Clicks
onMounted(async () => {
  initAssetService()
  window.addEventListener('resize', updateWindowSize)
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('click', handleGlobalClick)
  document.addEventListener('selectionchange', menu.saveTextSelection)

  if (appBootStore.isGenesisMatrixSessionRestored && state.hasMatrixSessionData()) {
    boot.stopBootAnimation()
    return
  }

  boot.startBootAnimation(undefined, { autoStop: false })
  try {
    await state.restoreData()
    if (!appBootStore.areGenesisMatrixImagesPreloaded) {
      await preloadRestoredMatrixImages()
      appBootStore.areGenesisMatrixImagesPreloaded = true
    }
    appBootStore.isGenesisMatrixSessionRestored = true
  } finally {
    boot.stopBootAnimation()
  }
})

onUnmounted(() => {
  state.cleanupUnresolvedLogicPlaceholders()
  window.removeEventListener('resize', updateWindowSize)
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('click', handleGlobalClick)
  document.removeEventListener('selectionchange', menu.saveTextSelection)
  audio.cleanupMatrixAudioRecording()
})

function handleGlobalKeydown(e: KeyboardEvent) {
  if (activeFilePreviewNode.value && e.key === 'Escape') {
    e.preventDefault()
    closeFilePreview()
    return
  }

  if (state.pendingNodeConfig.value) {
    if (e.key === 'Escape') {
      e.preventDefault()
      state.pendingNodeConfig.value = null
    }
    return
  }

  if (state.activeDrawingNodeId.value) {
    if (e.key === 'Escape') {
      e.preventDefault()
      drawing.closeDrawingFullscreen()
    }
    return
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (!isTextEditingTarget(e.target)) {
      e.preventDefault()
      if (state.lastSelectedId.value) {
        const node = state.getNode(state.lastSelectedId.value)
        if (node && !node.isRoot) {
          state.removeNode(state.lastSelectedId.value)
        }
      }
    }
  }
}

function handleGlobalClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.context-menu-container')) {
    closeContextMenus()
  }
}

function closeContextMenus() {
  menu.nodeContextMenu.value = null
  menu.connectionContextMenu.value = null
  menu.personalCondContextMenu.value = null
  menu.pageContextMenu.value = null
}

function handleBoardContextMenu(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (
    target.closest('.skill-chip') ||
    target.closest('.tactical-button') ||
    target.closest('.zone-card') ||
    target.closest('.context-menu-container') ||
    target.closest('.pointer-events-auto:not(.absolute.inset-0)')
  ) {
    return
  }
  const pageId = state.activePageId.value
  if (!pageId || state.navigationStack.value.length > 0) return
  menu.handlePageContextMenu(e, pageId)
}

function handleNodeDive(node: any) {
  const divableTypes = ['strategy', 'scenario', 'condition', 'instrument', 'indicator', 'pattern', 'smc']
  if (divableTypes.includes(node.type)) {
    isGitPanelOpen.value = false
    state.activeMenuCategory.value = null
    state.pendingNodeConfig.value = null
    if (!node.subGraph) {
       node.subGraph = { nodes: [], connections: [], zones: [] }
    }
    state.navigateTo([...state.navigationStack.value, node.id])
  } else if (node.type === 'image') {
    uploads.triggerImageUpload(node.id)
  } else if (node.type === 'text-panel') {
    state.selectNode(node.id)
    menu.openTextCommandLink(node)
  } else if (node.type === 'drawing-panel') {
    drawing.openDrawingFullscreen(node)
  } else if (node.type === 'file-attachment') {
    uploads.triggerGenericFileUpload(node.id)
  }
}

function openFilePreview(node: any) {
  if (node?.type !== 'file-attachment' || !node.params?.fileDataUrl) return
  activeFilePreviewNode.value = node
}

function closeFilePreview() {
  activeFilePreviewNode.value = null
}

// Props & Emits
defineProps<{ activeTab: string, isDark?: boolean }>()
defineEmits(['exit', 'back'])
</script>

<style scoped>
.matrix-tree {
  image-rendering: -webkit-optimize-contrast;
  -webkit-font-smoothing: subpixel-antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: geometricPrecision;
}

.animate-draw {
  stroke-dasharray: 5000;
  stroke-dashoffset: 5000;
  animation: draw 4s ease-in-out infinite alternate;
}

@keyframes draw {
  0% { stroke-dashoffset: 5000; }
  100% { stroke-dashoffset: 0; }
}

.hud-pop-enter-active, .hud-pop-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.hud-pop-enter-from { opacity: 0; transform: translateY(20px); }
.hud-pop-leave-to { opacity: 0; transform: translateY(20px); }

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-leave-active {
  position: absolute;
}
.slide-up-enter-from, .slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

@keyframes scan {
  from { transform: translateY(-100%); }
  to { transform: translateY(200%); }
}

.animate-scan {
  animation: scan 4s linear infinite;
}

/* Slide-down transition for the config warning banner */
.slide-down-enter-active, .slide-down-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-down-enter-from, .slide-down-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-200%);
}
.slide-down-enter-to, .slide-down-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

@keyframes config-banner-pulse {
  0%, 100% { box-shadow: 0 8px 30px rgba(239, 68, 68, 0.25); }
  50%       { box-shadow: 0 8px 50px rgba(239, 68, 68, 0.55); }
}

</style>
