<template>
  <Teleport to="body">
    <Transition name="fade-tooltip">
      <div
        v-if="node"
        class="fixed z-[100000] pointer-events-auto shadow-xl backdrop-blur-xl rounded-sm select-none"
        :class="isDark ? 'bg-[#0a0a0a]/60 border border-white/20' : 'bg-white/40 border border-black/20'"
        :style="{ left: position.x + 'px', top: position.y + 'px', transform: 'translate(20px, -50%)' }"
        @mouseenter="$emit('mouseenter')"
        @mouseleave="$emit('mouseleave')"
      >
        <div
          class="px-4 py-2 border-b flex items-center justify-between"
          :class="isDark ? 'border-white/5 bg-white/[0.02]' : 'border-black/5 bg-black/[0.02]'"
        >
          <span
            class="text-[8px] font-mono font-bold tracking-[0.2em] uppercase opacity-70"
            :class="isDark ? 'text-white' : 'text-black'"
          >
            {{ node.name }}
          </span>
        </div>

        <div
          class="w-[320px] h-[140px] relative overflow-hidden cursor-crosshair"
          @mousedown="startMiniChartPan"
          @wheel.prevent="handleMiniChartZoom"
        >
          <svg class="w-full h-full p-4 overflow-visible" viewBox="0 0 180 80">
            <path
              :d="miniChartPaths.freq"
              fill="none"
              stroke-width="1.2"
              stroke-dasharray="4,2"
              :class="isDark ? 'stroke-white opacity-30' : 'stroke-black opacity-30'"
            />
            <path
              :d="miniChartPaths.pf"
              fill="none"
              stroke-width="2"
              :class="isDark ? 'stroke-white' : 'stroke-black'"
            />
          </svg>
        </div>

        <div
          class="flex items-center justify-between px-4 py-2 border-t"
          :class="isDark ? 'border-white/5 bg-white/[0.02]' : 'border-black/5 bg-black/[0.02]'"
        >
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-2">
              <div class="w-4 h-0 border-t border-dashed" :class="isDark ? 'border-white/40' : 'border-black/40'"></div>
              <div class="flex flex-col">
                <span
                  class="text-[6px] font-mono opacity-30 uppercase tracking-widest"
                  :class="isDark ? 'text-white' : 'text-black'"
                >
                  {{ t('tacticalNodeMap.freqShort') }}
                </span>
                <span class="text-[9px] font-mono font-bold" :class="isDark ? 'text-white' : 'text-black'">
                  {{ node.freq }}
                </span>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <div class="w-4 h-px" :class="isDark ? 'bg-white' : 'bg-black'"></div>
              <div class="flex flex-col">
                <span
                  class="text-[6px] font-mono opacity-30 uppercase tracking-widest"
                  :class="isDark ? 'text-white' : 'text-black'"
                >
                  {{ t('tacticalNodeMap.pfRatio') }}
                </span>
                <span class="text-[9px] font-mono font-bold" :class="isDark ? 'text-white' : 'text-black'">
                  {{ node.pf }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="absolute -top-1 -left-1 w-3 h-3 border-t border-l" :class="isDark ? 'border-white/30' : 'border-black'"></div>
        <div class="absolute -top-1 -right-1 w-3 h-3 border-t border-r" :class="isDark ? 'border-white/30' : 'border-black'"></div>
        <div class="absolute -bottom-1 -left-1 w-3 h-3 border-b border-l" :class="isDark ? 'border-white/30' : 'border-black'"></div>
        <div class="absolute -bottom-1 -right-1 w-3 h-3 border-b border-r" :class="isDark ? 'border-white/30' : 'border-black'"></div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'

const { t } = useI18n()

const props = defineProps<{
  node: any | null
  position: { x: number; y: number }
  isDark?: boolean
}>()

defineEmits(['mouseenter', 'mouseleave'])

const miniChartView = ref({
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

watch(() => props.node, () => {
  miniChartView.value = {
    zoomX: 1,
    zoomY: 1,
    offsetX: 0,
    offsetY: 0,
    isPanning: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0
  }
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

const miniChartPaths = computed(() => {
  if (!props.node?.history) return { pf: '', freq: '' }
  const history = props.node.history
  const w = 180
  const h = 80
  const maxFreq = Math.max(...history.freq, 100)
  const maxPF = Math.max(...history.pf, 5)
  const usableH = h * 0.6
  const offsetH = h * 0.2
  const pointCount = history.pf.length || 1
  const { offsetX, offsetY, zoomX, zoomY } = miniChartView.value

  const pfPoints = history.pf.map((value: number, index: number) => {
    const rawX = pointCount > 1 ? index * (w / (pointCount - 1)) : 0
    const valueY = (value / maxPF) * usableH
    return {
      x: (rawX - offsetX) * zoomX,
      y: h - offsetH - ((valueY - offsetY) * zoomY)
    }
  })

  const freqPoints = history.freq.map((value: number, index: number) => {
    const rawX = pointCount > 1 ? index * (w / (pointCount - 1)) : 0
    const valueY = (value / maxFreq) * usableH
    return {
      x: (rawX - offsetX) * zoomX,
      y: h - offsetH - ((valueY - offsetY) * zoomY)
    }
  })

  return {
    pf: 'M ' + pfPoints.map((point: any) => `${point.x} ${point.y}`).join(' L '),
    freq: 'M ' + freqPoints.map((point: any) => `${point.x} ${point.y}`).join(' L ')
  }
})
</script>
