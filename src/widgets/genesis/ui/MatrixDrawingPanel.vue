<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="drawing.activeDrawingNode.value"
           class="fixed inset-0 z-[2147483000] bg-nier-white dark:bg-nier-black text-nier-text-light dark:text-nier-text-dark p-8 pb-32 flex flex-col pointer-events-auto"
           @mousedown.stop
           @click.stop>
        <div :ref="(el) => { drawing.fullscreenDrawingBoard.value = el as HTMLElement }"
             class="relative flex-1 border border-nier-border-light dark:border-nier-border-dark cursor-none overflow-hidden bg-[linear-gradient(90deg,currentColor_1px,transparent_1px),linear-gradient(currentColor_1px,transparent_1px)] bg-[size:48px_48px] text-nier-text-light/[0.04] dark:text-nier-text-dark/[0.04]"
             @mousedown.stop.prevent="drawing.startFullscreenDrawing"
             @mousemove.stop.prevent="drawing.moveFullscreenDrawing"
             @mouseup.stop.prevent="drawing.finishFullscreenDrawing"
             @mouseenter.stop="drawing.isDrawingCursorVisible.value = true"
             @mouseleave.stop.prevent="drawing.finishFullscreenDrawing">
          <svg class="absolute inset-0 w-full h-full pointer-events-none text-nier-text-light dark:text-nier-text-dark"
               viewBox="0 0 100 100"
               preserveAspectRatio="none">
            <polyline v-for="stroke in drawing.activeDrawingNode.value.params?.strokes || []"
                      :key="stroke.id"
                      :points="drawing.formatDrawingStroke(stroke)"
                      fill="none"
                      :stroke="stroke.color || 'currentColor'"
                      :stroke-width="stroke.size || 2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      vector-effect="non-scaling-stroke"
                      class="opacity-90" />
          </svg>
          <div v-if="!drawing.activeDrawingNode.value.params?.strokes?.length"
               class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span class="text-[10px] font-mono tracking-[0.45em] uppercase opacity-25">Press_And_Draw</span>
          </div>
          <div v-if="drawing.isDrawingCursorVisible.value"
               class="absolute rounded-full border pointer-events-none z-20"
               :class="drawing.drawingTool.value === 'eraser' ? 'border-red-500/80 bg-red-500/5' : 'border-nier-text-light/80 dark:border-nier-text-dark/80 bg-transparent'"
               :style="drawing.drawingCursorStyle.value"></div>
          <div class="absolute top-4 left-4 w-10 h-10 border-t border-l border-nier-text-light dark:border-nier-text-dark opacity-20 pointer-events-none"></div>
          <div class="absolute bottom-4 right-4 w-10 h-10 border-b border-r border-nier-text-light dark:border-nier-text-dark opacity-20 pointer-events-none"></div>
        </div>

        <div class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[2147483001] w-[calc(100%-4rem)] max-w-5xl bg-nier-white dark:bg-nier-black border border-nier-border-light dark:border-nier-border-dark shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
          <div class="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-nier-text-light dark:border-nier-text-dark opacity-40 pointer-events-none"></div>
          <div class="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-nier-text-light dark:border-nier-text-dark opacity-40 pointer-events-none"></div>
          <div class="flex items-center justify-between px-6 py-2 border-b border-nier-border-light dark:border-nier-border-dark bg-nier-text-light/[0.03] dark:bg-nier-text-dark/[0.03]">
            <div class="flex items-center gap-3">
              <div class="w-1.5 h-1.5 bg-nier-text-light dark:bg-nier-text-dark rotate-45 opacity-50"></div>
              <span class="text-[9px] font-mono tracking-[0.4em] uppercase font-black opacity-60">Matrix_Command_Link</span>
            </div>
            <span class="text-[8px] font-mono opacity-20 uppercase tracking-widest">{{ drawing.activeDrawingNode.value.label }}</span>
          </div>
          <div class="flex flex-wrap items-center justify-center gap-4 px-6 py-4">
            <div class="flex items-center border border-nier-border-light dark:border-nier-border-dark">
              <button @mousedown.stop
                      @click.stop="drawing.drawingTool.value = 'brush'"
                      class="h-9 w-11 flex items-center justify-center transition-all"
                      :class="drawing.drawingTool.value === 'brush' ? 'bg-nier-text-light dark:bg-nier-text-dark text-nier-white dark:text-nier-black' : 'opacity-55 hover:opacity-100'">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15.2 5.2l3.6 3.6" />
                  <path d="M4 20l4.2-1 10.1-10.1a2.5 2.5 0 0 0-3.5-3.5L4.7 15.5 4 20z" />
                </svg>
              </button>
              <button @mousedown.stop
                      @click.stop="drawing.drawingTool.value = 'eraser'"
                      class="h-9 w-11 border-l border-nier-border-light dark:border-nier-border-dark flex items-center justify-center transition-all"
                      :class="drawing.drawingTool.value === 'eraser' ? 'bg-nier-text-light dark:bg-nier-text-dark text-nier-white dark:text-nier-black' : 'opacity-55 hover:opacity-100'">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M7 21h10" />
                  <path d="M20.5 8.5l-5-5a2.1 2.1 0 0 0-3 0L3.8 12.2a2.1 2.1 0 0 0 0 3l3.3 3.3h5.4l8-8a2.1 2.1 0 0 0 0-3z" />
                  <path d="M6.5 9.5l8 8" />
                </svg>
              </button>
            </div>
            <label v-if="drawing.drawingTool.value === 'brush'" class="h-9 w-11 border border-nier-border-light dark:border-nier-border-dark flex items-center justify-center cursor-pointer relative overflow-hidden">
              <span class="w-5 h-5 border border-nier-border-light dark:border-nier-border-dark"
                    :style="{ backgroundColor: drawing.drawingColor.value }"></span>
              <input v-model="drawing.drawingColor.value"
                     type="color"
                     class="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
            <div class="h-9 px-3 border border-nier-border-light dark:border-nier-border-dark flex items-center gap-3">
              <div class="w-5 h-5 flex items-center justify-center">
                <div class="rounded-full border border-nier-text-light dark:border-nier-text-dark"
                     :style="{ width: `${Math.min(18, Math.max(5, drawing.drawingSize.value))}px`, height: `${Math.min(18, Math.max(5, drawing.drawingSize.value))}px` }"></div>
              </div>
              <div class="relative w-14 h-4 flex items-center cursor-pointer"
                   @mousedown.stop.prevent="drawing.startDrawingSizeDrag">
                <div class="w-full h-px bg-nier-text-light/20 dark:bg-nier-text-dark/20"></div>
                <div class="absolute left-0 h-px bg-nier-text-light dark:bg-nier-text-dark"
                     :style="{ width: `${drawing.drawingSizePercent.value}%` }"></div>
                <div class="absolute top-1/2 w-2.5 h-2.5 -translate-y-1/2 -translate-x-1/2 rotate-45 border border-nier-text-light dark:border-nier-text-dark bg-nier-white dark:bg-nier-black"
                     :style="{ left: `${drawing.drawingSizePercent.value}%` }"></div>
              </div>
              <span class="text-[9px] font-mono font-black w-5 text-right">{{ drawing.drawingSize.value }}</span>
            </div>
            <button @mousedown.stop
                    @click.stop="drawing.clearDrawingFullscreen"
                    class="h-9 w-11 border border-nier-border-light dark:border-nier-border-dark flex items-center justify-center opacity-60 hover:opacity-100 hover:border-nier-text-light dark:hover:border-nier-text-dark transition-all">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 15H6L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
            <button @mousedown.stop
                    @click.stop="drawing.closeDrawingFullscreen"
                    class="h-9 w-11 border border-nier-text-light dark:border-nier-text-dark bg-nier-text-light dark:bg-nier-text-dark text-nier-white dark:text-nier-black flex items-center justify-center hover:opacity-80 transition-all">
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
  </Teleport>
</template>

<script setup lang="ts">
import type { useMatrixDrawing } from '../model/matrix/useMatrixDrawing'

defineProps<{
  drawing: ReturnType<typeof useMatrixDrawing>
}>()
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
