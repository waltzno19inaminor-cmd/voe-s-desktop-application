<template>
  <section
    class="absolute inset-0 z-40 flex min-h-0 flex-col overflow-hidden theme-surface backdrop-blur-3xl pointer-events-auto transition-all duration-300"
    :class="[
      showCapitalForecast ? 'blur-sm brightness-75 saturate-75 scale-[1.01]' : '',
      isFullscreen ? '!fixed !inset-0 !z-[10080]' : ''
    ]"
    aria-label="Trades"
  >
    <div class="absolute inset-0 theme-grid opacity-30 pointer-events-none"></div>
    <ExTradeArchive
      class="relative z-10"
      :trades="trades"
      @trade-context-menu="forwardTradeContextMenu"
    />
  </section>
</template>

<script setup lang="ts">
import ExTradeArchive from './ExTradeArchive.vue'

withDefaults(defineProps<{
  trades?: any[]
  showCapitalForecast?: boolean
  isFullscreen?: boolean
}>(), {
  trades: () => [],
  showCapitalForecast: false,
  isFullscreen: false
})

const emit = defineEmits<{
  (event: 'trade-context-menu', payload: { tradeId: string; event: MouseEvent }): void
}>()

const forwardTradeContextMenu = (payload: { tradeId: string; event: MouseEvent }) => {
  emit('trade-context-menu', payload)
}
</script>
