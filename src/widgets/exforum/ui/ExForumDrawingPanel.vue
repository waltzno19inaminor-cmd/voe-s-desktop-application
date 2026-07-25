<template>
  <Transition name="fade">
    <div v-if="activeDrawingNode"
         class="absolute inset-0 z-[1000] bg-white text-black p-8 pb-32 flex flex-col pointer-events-auto"
         @pointerdown.stop
         @click.stop>
      <div ref="boardRef"
           class="relative flex-1 border border-black/20 cursor-none overflow-hidden bg-[linear-gradient(90deg,currentColor_1px,transparent_1px),linear-gradient(currentColor_1px,transparent_1px)] bg-[size:48px_48px] text-black/[0.04]"
           @pointerdown.stop.prevent="startFullscreenDrawing"
           @pointermove.stop.prevent="moveFullscreenDrawing"
           @pointerup.stop.prevent="finishFullscreenDrawing"
           @pointerenter.stop="isDrawingCursorVisible = true"
           @pointerleave.stop.prevent="finishFullscreenDrawing">
        <canvas ref="canvasRef"
                class="absolute inset-0 h-full w-full pointer-events-none"></canvas>
        <div v-if="!activeDrawingNode.params?.strokes?.length"
             class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span class="text-[10px] font-mono tracking-[0.45em] uppercase opacity-25">Press_And_Draw</span>
        </div>
        <div v-if="isDrawingCursorVisible"
             class="absolute rounded-full pointer-events-none z-20 shadow-[0_0_0_1px_rgba(255,255,255,0.8)]"
             :class="drawingTool === 'eraser' ? 'border-2 border-red-500 bg-red-500/10' : 'border-2 border-black bg-black/5'"
             :style="drawingCursorStyle"></div>
      </div>

      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1001] w-[calc(100%-4rem)] max-w-5xl bg-white border border-black/20 shadow-[0_30px_60px_rgba(0,0,0,0.15)]">
        <div class="flex items-center justify-between px-6 py-2 border-b border-black/10 bg-black/[0.02]">
          <div class="flex items-center gap-3">
            <span class="text-[9px] font-mono tracking-[0.4em] uppercase font-black opacity-60">DRAWING_PANEL</span>
          </div>
          <span class="text-[8px] font-mono opacity-20 uppercase tracking-widest">Draw on Board</span>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-4 px-6 py-4">
          <div class="flex items-center border border-black/20">
            <button @pointerdown.stop
                    @click.stop="drawingTool = 'brush'"
                    class="h-9 w-11 flex items-center justify-center transition-all"
                    :class="drawingTool === 'brush' ? 'bg-black text-white' : 'opacity-55 hover:opacity-100'">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15.2 5.2l3.6 3.6" />
                <path d="M4 20l4.2-1 10.1-10.1a2.5 2.5 0 0 0-3.5-3.5L4.7 15.5 4 20z" />
              </svg>
            </button>
            <button @pointerdown.stop
                    @click.stop="drawingTool = 'eraser'"
                    class="h-9 w-11 border-l border-black/20 flex items-center justify-center transition-all"
                    :class="drawingTool === 'eraser' ? 'bg-black text-white' : 'opacity-55 hover:opacity-100'">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 21h10" />
                <path d="M20.5 8.5l-5-5a2.1 2.1 0 0 0-3 0L3.8 12.2a2.1 2.1 0 0 0 0 3l3.3 3.3h5.4l8-8a2.1 2.1 0 0 0 0-3z" />
                <path d="M6.5 9.5l8 8" />
              </svg>
            </button>
          </div>
          <label v-if="drawingTool === 'brush'" class="h-9 w-11 border border-black/20 flex items-center justify-center cursor-pointer relative overflow-hidden">
            <span class="w-5 h-5 border border-black/20"
                  :style="{ backgroundColor: drawingColor }"></span>
            <input v-model="drawingColor"
                   type="color"
                   class="absolute inset-0 opacity-0 cursor-pointer" />
          </label>
          <div class="h-9 px-3 border border-black/20 flex items-center gap-3">
            <div class="w-5 h-5 flex items-center justify-center">
              <div class="rounded-full border border-black"
                   :style="{ width: `${Math.min(18, Math.max(5, drawingSize))}px`, height: `${Math.min(18, Math.max(5, drawingSize))}px` }"></div>
            </div>
            <div class="relative w-14 h-4 flex items-center cursor-pointer"
                 @pointerdown.stop.prevent="startDrawingSizeDrag">
              <div class="w-full h-px bg-black/20"></div>
              <div class="absolute left-0 h-px bg-black"
                   :style="{ width: `${drawingSizePercent}%` }"></div>
              <div class="absolute top-1/2 w-2.5 h-2.5 -translate-y-1/2 -translate-x-1/2 rotate-45 border border-black bg-white"
                   :style="{ left: `${drawingSizePercent}%` }"></div>
            </div>
            <span class="text-[9px] font-mono font-black w-5 text-right">{{ drawingSize }}</span>
          </div>
          <button @pointerdown.stop
                  @click.stop="clearDrawingFullscreen"
                  class="h-9 w-11 border border-black/20 flex items-center justify-center opacity-60 hover:opacity-100 hover:border-black transition-all">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 15H6L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
          <button @pointerdown.stop
                  @click.stop="closeDrawingFullscreen"
                  class="h-9 w-11 border border-black bg-black text-white flex items-center justify-center hover:opacity-80 transition-all">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 6H6v12h4" />
              <path d="M14 8l4 4-4 4" />
              <path d="M8 12h10" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { nextTick, ref, watch, toRefs } from 'vue'
import type { useForumDrawing } from '../model/useForumDrawing'

const props = defineProps<{
  drawing: ReturnType<typeof useForumDrawing>
}>()

const boardRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

// Extract reactive state into refs so they sync properly
const {
  activeDrawingNode,
  isDrawingCursorVisible,
  drawingTool,
  drawingColor,
  drawingSize,
  drawingSizePercent,
  drawingCursorStyle,
  fullscreenDrawingBoard,
  fullscreenDrawingCanvas
} = toRefs(props.drawing)

// Extract functions directly so they are just callable references in the template
const {
  startFullscreenDrawing,
  moveFullscreenDrawing,
  finishFullscreenDrawing,
  startDrawingSizeDrag,
  clearDrawingFullscreen,
  closeDrawingFullscreen,
  renderFullscreenDrawing
} = props.drawing

// Sync our local template ref to the composable's ref
watch([boardRef, canvasRef, activeDrawingNode], () => {
  const el = boardRef.value
  fullscreenDrawingBoard.value = el as HTMLElement | null
  fullscreenDrawingCanvas.value = canvasRef.value as HTMLCanvasElement | null
  nextTick(renderFullscreenDrawing)
}, { flush: 'post' })
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
