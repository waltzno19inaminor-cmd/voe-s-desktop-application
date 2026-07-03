import { ref } from 'vue'

export function useMatrixBoot() {
  const isInitializing = ref(true)
  const bootProgress = ref(0)
  let bootInterval: any = null

  function startBootAnimation(callback?: () => void, options: { autoStop?: boolean } = {}) {
    const autoStop = options.autoStop !== false
    bootProgress.value = 0
    isInitializing.value = true

    bootInterval = setInterval(() => {
      bootProgress.value += Math.random() * 15
      if (bootProgress.value >= 100) {
        bootProgress.value = autoStop ? 100 : 92
        clearInterval(bootInterval)
      }
    }, 100)

    setTimeout(() => {
      if (!autoStop) return
      isInitializing.value = false
      clearInterval(bootInterval)
      if (callback) callback()
    }, 1000)
  }

  function stopBootAnimation() {
    if (bootInterval) clearInterval(bootInterval)
    isInitializing.value = false
    bootProgress.value = 100
  }

  return {
    isInitializing,
    bootProgress,
    startBootAnimation,
    stopBootAnimation
  }
}
