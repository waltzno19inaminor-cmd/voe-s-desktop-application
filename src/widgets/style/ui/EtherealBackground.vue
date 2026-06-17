<template>
  <div class="background-system">
    <!-- Main Ethereal Background -->
    <div class="fixed inset-0 z-0 bg-cover bg-center pointer-events-none transition-all duration-1000" 
         :style="{ 
           backgroundImage: 'url(\'/assets/white_ethereal_bg.png\')',
           filter: 'blur(20px) brightness(1.1) contrast(0.9)',
              opacity: !isDark ? (isAssembled ? 0.2 : 0) : 0
         }"></div>

    <!-- Dark Theme Ethereal Background -->
    <div class="fixed inset-0 z-0 bg-cover bg-center pointer-events-none transition-all duration-1000" 
         :style="{ 
           backgroundImage: 'url(\'/assets/dark_ethereal_bg.png\')',
           filter: 'blur(30px) brightness(1.1) contrast(1.1)',
           opacity: isDark ? (isAssembled ? 0 : 0) : 0
         }"></div>

    <!-- Initial Bloom Reveal -->
    <Transition name="bloom-fade">
      <div v-if="showBloom" class="fixed inset-0 z-[100] bg-white pointer-events-none flex items-center justify-center">
        <div class="w-full h-full bg-gradient-radial from-white via-white/90 to-transparent blur-[120px] animate-pulse"></div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isDark: boolean
  isAssembled: boolean
  showBloom: boolean
}>()
</script>

<style scoped>
.bloom-fade-enter-active, .bloom-fade-leave-active {
  transition: opacity 1.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.bloom-fade-enter-from, .bloom-fade-leave-to {
  opacity: 0;
}

@keyframes pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

.animate-pulse {
  animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
