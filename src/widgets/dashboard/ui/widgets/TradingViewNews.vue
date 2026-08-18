<template>
  <div class="tradingview-widget-container flex flex-col h-[400px] w-full rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.05)] border border-black/5 dark:border-white/5" ref="containerRef">
    <div class="tradingview-widget-container__widget w-full flex-1"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const containerRef = ref<HTMLElement>()
let observer: MutationObserver | null = null

const renderWidget = () => {
  if (!containerRef.value) return
  
  const widgetContainer = containerRef.value.querySelector('.tradingview-widget-container__widget')
  if (!widgetContainer) return

  // Clear existing content to allow re-render
  widgetContainer.innerHTML = ''

  const isDark = document.documentElement.classList.contains('dark')

  const script = document.createElement('script')
  script.type = 'text/javascript'
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js'
  script.async = true
  script.innerHTML = JSON.stringify({
    "feedMode": "all_symbols",
    "isTransparent": true,
    "displayMode": "regular",
    "width": "100%",
    "height": "100%",
    "colorTheme": isDark ? "dark" : "light",
    "locale": "en"
  })

  widgetContainer.appendChild(script)
}

onMounted(() => {
  renderWidget()

  // Watch for class changes on documentElement (Dark Mode toggle)
  observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        renderWidget()
      }
    })
  })

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>
