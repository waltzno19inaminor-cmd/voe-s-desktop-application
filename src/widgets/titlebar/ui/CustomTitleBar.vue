<template>
  <div 
    v-if="isTauri"
    v-show="!isFullscreen"
    @mousedown="startDrag"
    :class="{ 'is-initialization-visible': isInitializationVisible, 'is-access-gate-visible': isAccessGateVisible, 'is-access-gradflow-ready': isAccessGradflowReady }"
    class="titlebar-panel h-10 select-none flex justify-end items-center fixed top-0 left-0 right-0 z-[100001] transition-colors"
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
const isInitializationVisible = useState('isInitializationVisible', () => false)
const isAccessGateVisible = useState('isAccessGateVisible', () => false)
const isAccessGradflowReady = useState('isAccessGradflowReady', () => false)
const isTauri = ref(false)
let unlistenResize = null
let wasMaximizedBeforeFullscreen = false
let fullscreenTransition = false

const isWindows = () => typeof navigator !== 'undefined' && /win/i.test(navigator.userAgent)

const syncFullscreenState = async () => {
  if (appWindow.value && !fullscreenTransition) {
    isFullscreen.value = await appWindow.value.isFullscreen()
  }
}

const leaveFullscreen = async () => {
  if (!appWindow.value || fullscreenTransition) return

  fullscreenTransition = true
  try {
    await appWindow.value.setFullscreen(false)
    if (wasMaximizedBeforeFullscreen) {
      await appWindow.value.maximize()
    }
    isFullscreen.value = false
  } finally {
    fullscreenTransition = false
  }
}

const handleKeydown = async (e) => {
  if (e.key === 'Escape' && isFullscreen.value && appWindow.value) {
    try {
      await leaveFullscreen()
    } catch (err) {
      console.error("Escape fullscreen error:", err)
    }
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  if (!window.__TAURI_INTERNALS__) return

  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    appWindow.value = getCurrentWindow()
    isTauri.value = true
    isFullscreen.value = await appWindow.value.isFullscreen()
    
    // Automatically track fullscreen state changes
    unlistenResize = await appWindow.value.onResized(syncFullscreenState)
  } catch {
    isTauri.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
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
    if (!appWindow.value || fullscreenTransition) return

    if (isFullscreen.value) {
      await leaveFullscreen()
      return
    }

    fullscreenTransition = true
    try {
      wasMaximizedBeforeFullscreen = await appWindow.value.isMaximized()
      // Keep the Windows workaround intact. macOS must not unmaximize here,
      // because it visibly shrinks the window before native fullscreen.
      if (isWindows() && wasMaximizedBeforeFullscreen) {
        await appWindow.value.unmaximize()
      }
      await appWindow.value.setFullscreen(true)
      isFullscreen.value = true
    } finally {
      fullscreenTransition = false
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
  background: var(--theme-bg);
  transition: background-color 300ms ease;
}

.titlebar-panel.is-initialization-visible .titlebar-surface {
  background: #050505;
}

.titlebar-panel.is-access-gate-visible .titlebar-surface {
  background: transparent;
}

.titlebar-panel.is-initialization-visible.is-access-gradflow-ready .titlebar-surface {
  background: transparent;
}

.window-control {
  position: relative;
  border: 0;
  background: transparent;
  color: rgb(var(--theme-text-rgb) / 0.82);
  outline: none;
}

.titlebar-panel.is-initialization-visible .window-control {
  color: rgb(255 255 255 / 0.82);
  transition: color 500ms ease, background-color 500ms ease;
}

.titlebar-panel.is-initialization-visible.is-access-gradflow-ready .window-control,
.titlebar-panel.is-access-gate-visible .window-control {
  color: rgb(0 0 0 / 0.82);
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
