<template>
  <Transition name="fade">
    <div v-if="isInitializing" class="absolute inset-0 z-[1000] bg-theme-bg flex flex-col items-center justify-center space-y-8 pointer-events-auto transition-colors duration-1000">
       <!-- Ethereal Background -->
       <EtherealBackground :is-dark="!!isDark" :is-assembled="false" :show-bloom="false" />

       <div class="flex flex-col items-center space-y-3 relative z-10">
          <div class="w-16 h-px bg-theme-text opacity-20"></div>
          <span class="text-[10px] font-mono tracking-[0.8em] uppercase font-black animate-pulse text-theme-text">{{ t('matrix.bootEstablishingLink') }}</span>
          <div class="w-16 h-px bg-theme-text opacity-20"></div>
       </div>

       <div class="w-64 h-px bg-theme-text/10 relative overflow-hidden z-10">
          <div class="absolute inset-y-0 left-0 bg-theme-text transition-all duration-300" :style="{ width: `${bootProgress}%` }"></div>
          <!-- Glitch element -->
          <div class="absolute h-full w-4 bg-white/40 blur-sm animate-scan"></div>
       </div>

       <!-- Scanline effect for boot -->
       <div class="absolute inset-0 pointer-events-none opacity-5 animate-scan bg-gradient-to-b from-transparent via-theme-text to-transparent h-[2px] z-10"></div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import EtherealBackground from '~/widgets/style/ui/EtherealBackground.vue'
import { useI18n } from '~/shared/i18n/useI18n'

const { t } = useI18n()

defineProps<{
  isInitializing: boolean
  bootProgress: number
  isDark?: boolean
}>()
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

@keyframes scan {
  from { transform: translateY(-100%); }
  to { transform: translateY(200%); }
}

.animate-scan {
  animation: scan 4s linear infinite;
}
</style>
