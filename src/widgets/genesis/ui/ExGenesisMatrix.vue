<template>
  <div class="matrix-tree w-full h-screen relative flex flex-col overflow-hidden text-nier-text-light dark:text-nier-text-dark select-none"
       @mousemove="menu.updateMousePos">

    <!-- GLOBAL DRAG OVERLAY TO PREVENT HOVER/CLICKS ON UNDERLYING ELEMENTS -->
    <div v-if="state.isCommentDragging.value" class="fixed inset-0 z-[99999] cursor-move pointer-events-auto"></div>

    <!-- TACTICAL CORNER BRACKETS -->
    <div class="absolute top-6 left-6 w-4 h-4 border-t-2 border-l-2 nier-border-primary opacity-50 z-[100] pointer-events-none"></div>
    <div class="absolute top-6 right-6 w-4 h-4 border-t-2 border-r-2 nier-border-primary opacity-50 z-[100] pointer-events-none"></div>
    <div class="absolute bottom-6 left-6 w-4 h-4 border-b-2 border-l-2 nier-border-primary opacity-50 z-[100] pointer-events-none"></div>
    <div class="absolute bottom-6 right-6 w-4 h-4 border-b-2 border-r-2 nier-border-primary opacity-50 z-[100] pointer-events-none"></div>

    <!-- TACTICAL GRID OVERLAY REMOVED AS PER REQUEST -->

    <!-- MAIN CANVAS -->
    <div class="flex-grow relative overflow-hidden"
         :class="state.pendingNodeConfig.value ? 'cursor-crosshair' : 'cursor-move'"
         :ref="(el) => { canvas.canvasWrapper.value = el as HTMLElement }"
         @mousedown="canvas.startPan($event, zoneTools.isZoneToolActive.value, zoneTools.drawStart, zoneTools.drawCurrent)"
         @click="canvas.handleBackgroundClick"
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
                Constructing_{{ zoneTools.selectedZoneType.value }}_Domain...
              </div>
           </div>
           <input type="file" :ref="(el) => { uploads.imageInput.value = el as HTMLInputElement }" class="hidden" accept="image/*" @change="uploads.handleImageUpload" />
           <input type="file" :ref="(el) => { uploads.fileInput.value = el as HTMLInputElement }" class="hidden" @change="uploads.handleGenericFileUpload" />
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
                       @moved="state.handleNodeMoved" />
        </div>
        </div>
      </div>

      <!-- VIEWPORT TELEMETRY -->
      <MatrixTelemetry :view-state="state.viewState.value" :is-scenario-context="!!state.isScenarioContext.value"
                       @reset-view="canvas.resetView" @update-scale="(s) => state.viewState.value.scale = s" />

      <!-- CENTERED NAVIGATION HUB -->
      <Transition name="hud-pop">
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
            <div class="mt-2 text-[7px] font-mono tracking-[0.6em] uppercase opacity-20 italic">
               Diagnostic_Neural_Path // Sub_Sequence_Active
            </div>
         </div>
      </Transition>

      <!-- SEQUENTIAL PROMPT (Nier Style) -->
      <div v-if="state.shouldShowInitializePrompt.value" class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
         <div class="flex flex-col items-center space-y-4">
            <span class="text-[10px] font-mono tracking-[1em] uppercase">Initialize_First_Step</span>
            <div class="w-1 h-32 bg-current animate-pulse"></div>
         </div>
      </div>



      <!-- COMMAND PANEL (HUD bottom) -->
      <MatrixCommandPanel :state="state" :menu="menu" :audio="audio" :active-tab="activeTab" :is-dark="isDark"
                          :active-wire="canvas.activeWire.value"
                          :is-zone-tool-active="zoneTools.isZoneToolActive.value"
                          :selected-zone-type="zoneTools.selectedZoneType.value"
                          @activate-zone="zoneTools.activateZoneTool"
                          @personal-contextmenu="menu.handlePersonalCondContextMenu" />

      <!-- CONTEXT MENUS -->
      <MatrixContextMenus :state="state" :menu="menu" :is-dark="isDark"
                          @trigger-image-upload="uploads.triggerImageUpload" />

      <!-- DRAWING PANEL -->
      <MatrixDrawingPanel :drawing="drawing" />

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
                      [ SYSTEM_INTEL_v1.07 ]
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

    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

import ExSkillNode from './ExSkillNode.vue'
import ExZone from './ExZone.vue'
import MatrixBootOverlay from './MatrixBootOverlay.vue'
import MatrixTelemetry from './MatrixTelemetry.vue'
import MatrixDrawingPanel from './MatrixDrawingPanel.vue'
import MatrixCommandPanel from './MatrixCommandPanel.vue'
import MatrixContextMenus from './MatrixContextMenus.vue'
import MatrixConnections from './MatrixConnections.vue'

import { useMatrixState, type Zone } from '../model/matrix/useMatrixState'
import { useMatrixCanvas, isTextEditingTarget } from '../model/matrix/useMatrixCanvas'
import { useMatrixMenu } from '../model/matrix/useMatrixMenu'
import { useMatrixDrawing } from '../model/matrix/useMatrixDrawing'
import { useMatrixAudio } from '../model/matrix/useMatrixAudio'
import { useMatrixBoot } from '../model/matrix/useMatrixBoot'
import { useMatrixZones } from '../model/matrix/useMatrixZones'
import { useMatrixUploads } from '../model/matrix/useMatrixUploads'
import { usePathMath } from '../model/matrix/usePathMath'

import { initAssetService } from '@/shared/api/asset.service'

const state = useMatrixState()
const canvas = useMatrixCanvas(state)
const menu = useMatrixMenu(state)
const drawing = useMatrixDrawing(state)
const audio = useMatrixAudio(state)
const boot = useMatrixBoot()
const zoneTools = useMatrixZones(state)
const uploads = useMatrixUploads(state)
const pathMath = usePathMath(state)

// Global Key Listeners and Clicks
onMounted(async () => {
  initAssetService()
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('click', handleGlobalClick)
  document.addEventListener('selectionchange', menu.saveTextSelection)

  boot.startBootAnimation()
  await state.restoreData()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('click', handleGlobalClick)
  document.removeEventListener('selectionchange', menu.saveTextSelection)
  audio.cleanupMatrixAudioRecording()
})

function handleGlobalKeydown(e: KeyboardEvent) {
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
    menu.nodeContextMenu.value = null
    menu.connectionContextMenu.value = null
    menu.personalCondContextMenu.value = null
  }
}

function handleNodeDive(node: any) {
  const divableTypes = ['strategy', 'scenario', 'condition', 'instrument', 'indicator', 'pattern', 'smc']
  if (divableTypes.includes(node.type)) {
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

.tactical-corners::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background:
    linear-gradient(to right, white 2px, transparent 2px) 0 0,
    linear-gradient(to bottom, white 2px, transparent 2px) 0 0,
    linear-gradient(to left, white 2px, transparent 2px) 100% 0,
    linear-gradient(to bottom, white 2px, transparent 2px) 100% 0,
    linear-gradient(to right, white 2px, transparent 2px) 0 100%,
    linear-gradient(to top, white 2px, transparent 2px) 0 100%,
    linear-gradient(to left, white 2px, transparent 2px) 100% 100%,
    linear-gradient(to top, white 2px, transparent 2px) 100% 100%;
  background-repeat: no-repeat;
  background-size: 12px 12px;
  pointer-events: none;
}
</style>
