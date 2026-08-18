<template>
  <div class="design-vignette-system">
    <!-- Scanlines -->
    <div class="fixed inset-0 z-1 pointer-events-none scanlines opacity-[0.03]"></div>
    
    <!-- Dot Grid -->
    <div class="fixed inset-0 z-1 pointer-events-none dot-grid opacity-[0.05]"></div>

    <!-- Light Sweep (only in light mode) -->
    <div v-if="!isDark" class="fixed inset-0 z-5 pointer-events-none overflow-hidden">
      <div class="light-sweep"></div>
    </div>

    <!-- Masks & Vignettes -->
    <div v-if="!isDark" class="fixed inset-0 z-[80] pointer-events-none focus-mask transition-all duration-1000"></div>
    <div v-if="!isDark" class="fixed inset-0 z-[81] pointer-events-none cinematic-vignette transition-all duration-1000"></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isDark: boolean
}>()
</script>

<style scoped>
.scanlines {
  background: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.02) 50%);
  background-size: 100% 4px;
}

.dot-grid {
  background-image: radial-gradient(var(--text-primary) 0.5px, transparent 0.5px);
  background-size: 30px 30px;
}

.cinematic-vignette {
  background: radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.3) 100%);
  position: fixed; inset: 0; pointer-events: none;
}

.light-sweep {
  position: absolute; top: -100%; left: -50%; width: 20%; height: 300%;
  background: linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent);
  transform: rotate(-35deg);
  animation: sweep 10s linear infinite;
}

@keyframes sweep { 
  from { transform: rotate(-35deg) translateX(-100%); } 
  to { transform: rotate(-35deg) translateX(500%); } 
}
</style>
