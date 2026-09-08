<template>
  <Teleport to="body">
    <Transition name="ex-error-alert">
      <div
        v-if="isVisible"
        class="pointer-events-none fixed inset-x-0 top-6 z-[2147483647] flex justify-center px-4"
        role="alert"
        aria-live="assertive"
      >
        <div
          class="flex min-w-[340px] max-w-[min(560px,calc(100vw-2rem))] items-start gap-3 border border-red-400/30 px-5 py-4 shadow-[0_12px_48px_rgba(220,38,38,0.55)]"
          style="background-color:#dc2626;"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="mt-0.5 h-5 w-5 shrink-0 text-white">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <div class="mb-1.5 text-[11px] font-mono font-black uppercase leading-none tracking-[0.3em] text-white">
              {{ title }}
            </div>
            <div class="text-[13px] font-mono font-medium leading-relaxed tracking-[0.02em] text-red-50">
              {{ message }}
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  visible: boolean
  message: string
  title?: string
  duration?: number
}>(), {
  title: 'Error',
  duration: 5000
})

const isVisible = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | null = null

const clearHideTimer = () => {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = null
}

watch([() => props.visible, () => props.message], ([visible]) => {
  clearHideTimer()
  isVisible.value = visible
  if (visible) {
    hideTimer = setTimeout(() => {
      isVisible.value = false
      hideTimer = null
    }, props.duration)
  }
}, { immediate: true })

onBeforeUnmount(clearHideTimer)
</script>

<style scoped>
.ex-error-alert-enter-active {
  transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.ex-error-alert-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.ex-error-alert-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}
.ex-error-alert-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
