<template>
  <div class="ex-genesis-matrix-locked w-full h-full flex items-center justify-center bg-[#050505]">
    <!-- This component is physically hollowed out in the demo build for security. -->
    <div class="flex flex-col items-center opacity-30">
      <div class="w-8 h-8 border border-[#FF424D] rotate-45 mb-4 animate-pulse"></div>
      <span class="text-xs font-mono tracking-[0.5em] uppercase text-[#FF424D]">SYSTEM_LOCKED</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

defineProps<{
  strategyId?: string
  trades?: any[]
}>()

const emit = defineEmits(['triggerPaywall', 'close'])

onMounted(() => {
  emit('triggerPaywall')
})
</script>

<style scoped>
/* Empty styles */
</style>
