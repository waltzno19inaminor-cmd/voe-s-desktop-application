<template>
  <div class="gradflow-background" :class="{ 'is-ready': isReady }" aria-hidden="true">
    <div ref="mountEl" class="gradflow-canvas"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { GradientConfigInput } from 'gradflow'
import type { Root } from 'react-dom/client'

type GradFlowPreset =
  | 'cosmic'
  | 'matrix'
  | 'electric'
  | 'inferno'
  | 'mystic'
  | 'cyber'
  | 'neon'
  | 'plasma'
  | 'dream'
  | 'borealis'

const props = withDefaults(defineProps<{
  config?: GradientConfigInput
  preset?: GradFlowPreset
  paused?: boolean
}>(), {
  paused: false
})

const emit = defineEmits<{
  ready: []
}>()

const mountEl = ref<HTMLDivElement | null>(null)
const isReady = ref(false)
let reactRoot: Root | null = null
let readyFrame: number | null = null
let hasAnnouncedReady = false

const announceReady = () => {
  if (hasAnnouncedReady) return
  hasAnnouncedReady = true
  isReady.value = true
  emit('ready')

  if (typeof window !== 'undefined') {
    ;(window as Window & { __gradflowReady?: boolean }).__gradflowReady = true
    window.dispatchEvent(new CustomEvent('gradflow:ready'))
  }
}

const waitForCanvas = () => {
  if (!mountEl.value || hasAnnouncedReady) return

  const canvas = mountEl.value.querySelector('canvas')
  if (canvas && canvas.width > 0 && canvas.height > 0) {
    readyFrame = window.requestAnimationFrame(announceReady)
    return
  }

  readyFrame = window.requestAnimationFrame(waitForCanvas)
}

onMounted(async () => {
  if (!mountEl.value) return

  const [{ createElement }, { createRoot }, { GradFlow }] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('gradflow')
  ])

  if (!mountEl.value) return

  reactRoot = createRoot(mountEl.value)
  reactRoot.render(createElement(GradFlow, {
    config: props.config,
    preset: props.preset,
    paused: props.paused
  }))
  waitForCanvas()
})

onBeforeUnmount(() => {
  if (readyFrame !== null) window.cancelAnimationFrame(readyFrame)
  reactRoot?.unmount()
  reactRoot = null
})
</script>

<style scoped>
.gradflow-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  background: transparent;
}

.gradflow-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0;
  transition: opacity 500ms ease;
}

.gradflow-background.is-ready .gradflow-canvas {
  opacity: 1;
}

.gradflow-canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
