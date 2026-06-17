<template>
  <div v-if="!isScenarioContext" class="absolute top-32 left-12 flex flex-col space-y-8 z-[40]">
     <div class="flex items-center space-x-6">
        <div class="flex flex-col border-l border-nier-text-light/20 dark:border-nier-text-dark/20 pl-4 py-1">
           <span class="text-[8px] font-mono tracking-widest opacity-40 uppercase">
             Viewport_Telemetry
           </span>
           <span class="text-[12px] font-mono tracking-widest opacity-80 uppercase">{{ (viewState.scale * 100).toFixed(0) }}% // FOCUS</span>
        </div>

         <button @click.stop="$emit('reset-view')" class="tactical-button w-8 h-8 border border-nier-text-light/20 dark:border-nier-text-dark/20 flex items-center justify-center hover:bg-nier-text-light/10 dark:hover:bg-nier-text-dark/10 transition-colors opacity-30 hover:opacity-100 italic text-[10px] font-mono">
           [R]
         </button>
     </div>

     <!-- FOCUS SELECTOR STRIP -->
     <div class="flex flex-col space-y-2 pl-4 border-l border-nier-text-light/10 dark:border-nier-text-dark/10">
        <div class="flex flex-col space-y-1">
           <button v-for="zoom in [25, 50, 75, 100, 150, 200]" :key="zoom"
                   @click.stop="$emit('update-scale', zoom / 100)"
                   :class="[
                      Math.round(viewState.scale * 100) === zoom
                        ? 'bg-nier-text-light dark:bg-nier-text-dark text-nier-white dark:text-nier-black opacity-100'
                        : 'opacity-30 hover:opacity-100 hover:bg-nier-text-light/5 dark:hover:bg-nier-text-dark/5'
                   ]"
                   class="w-12 h-5 border border-nier-text-light/20 dark:border-nier-text-dark/20 text-[9px] font-mono tracking-tighter transition-all flex items-center justify-center relative overflow-hidden group/zoom">
              <div v-if="Math.round(viewState.scale * 100) === zoom" class="absolute inset-0 bg-nier-text-light/10 dark:bg-nier-text-dark/10 animate-pulse"></div>
              {{ zoom }}%
              <div class="absolute right-0 top-0 w-1 h-1 bg-current opacity-20"></div>
           </button>
        </div>
     </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  viewState: { scale: number }
  isScenarioContext: boolean
}>()

defineEmits(['reset-view', 'update-scale'])
</script>
