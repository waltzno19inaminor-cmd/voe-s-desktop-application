<template>
  <div 
    v-if="isTauri"
    v-show="!isFullscreen"
    @mousedown="startDrag"
    :class="{ 'is-gradflow-loading': !isGradflowReady }"
    class="titlebar-panel h-10 select-none flex justify-end items-center fixed top-0 left-0 right-0 z-[99999] transition-colors"
  >
    <div class="titlebar-surface" aria-hidden="true"></div>
    <div class="flex items-center h-full" @mousedown.stop>
      <button
        type="button"
        @click="minimize" 
        class="window-control inline-flex justify-center items-center w-12 h-full cursor-pointer transition-colors"
      >
        <Icon name="lucide:minus" class="w-4 h-4" />
      </button>
      <button
        type="button"
        @click="toggleFullscreen" 
        class="window-control inline-flex justify-center items-center w-12 h-full cursor-pointer transition-colors"
      >
        <Icon name="lucide:maximize" class="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        @click="close" 
        class="window-control close-control inline-flex justify-center items-center w-12 h-full cursor-pointer transition-colors"
      >
        <Icon name="lucide:x" class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const appWindow = ref(null)
const isFullscreen = useState('isFullscreen', () => false)
const isTauri = ref(false)
const isGradflowReady = ref(false)
let unlistenResize = null

const handleGradflowReady = () => {
  isGradflowReady.value = true
}

const handleKeydown = async (e) => {
  if (e.key === 'Escape' && isFullscreen.value && appWindow.value) {
    try {
      await appWindow.value.setFullscreen(false)
      isFullscreen.value = false
    } catch (err) {
      console.error("Escape fullscreen error:", err)
    }
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('gradflow:ready', handleGradflowReady)
  if (window.__gradflowReady) isGradflowReady.value = true
  if (!window.__TAURI_INTERNALS__) return

  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    appWindow.value = getCurrentWindow()
    isTauri.value = true
    isFullscreen.value = await appWindow.value.isFullscreen()
    
    // Automatically track fullscreen state changes
    unlistenResize = await appWindow.value.onResized(async () => {
      if (appWindow.value) {
        isFullscreen.value = await appWindow.value.isFullscreen()
      }
    })
  } catch {
    isTauri.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('gradflow:ready', handleGradflowReady)
  if (unlistenResize) {
    unlistenResize()
  }
})

const startDrag = async (e) => {
  if (appWindow.value && e.buttons === 1) {
    try {
      await appWindow.value.startDragging()
    } catch (err) {
      console.error("Drag error: ", err)
    }
  }
}

const minimize = async () => {
  try {
    if (appWindow.value) await appWindow.value.minimize()
  } catch (e) {
    console.error("Minimize error: ", e)
  }
}

const toggleFullscreen = async () => {
  try {
    if (appWindow.value) {
      const current = await appWindow.value.isFullscreen()
      await appWindow.value.setFullscreen(!current)
      isFullscreen.value = !current
    }
  } catch (e) {
    console.error("Fullscreen error: ", e)
  }
}

const close = async () => {
  try {
    if (appWindow.value) await appWindow.value.close()
  } catch (e) {
    console.error("Close error: ", e)
  }
}
</script>

<style scoped>
.titlebar-panel {
  color: var(--theme-text);
  isolation: isolate;
}

.titlebar-surface {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: transparent;
  transition: background-color 500ms ease, backdrop-filter 500ms ease;
}

.titlebar-panel.is-gradflow-loading .titlebar-surface {
  background: rgb(255 255 255 / 0.08);
  backdrop-filter: blur(6px);
}

.window-control {
  position: relative;
  border: 0;
  background: transparent;
  color: rgb(var(--theme-text-rgb) / 0.82);
  outline: none;
}

.window-control:hover {
  background: rgb(var(--theme-text-rgb) / 0.08);
  color: var(--theme-text);
}

.window-control:focus-visible {
  box-shadow: inset 0 0 0 1px rgb(var(--theme-text-rgb) / 0.34);
}

.close-control:hover {
  background: rgb(239 68 68 / 0.92);
  color: white;
}
</style>
