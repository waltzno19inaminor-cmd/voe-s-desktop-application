<template>
  <div 
    ref="cardRef"
    class="relative w-[210px] h-[320px] group transition-all duration-700"
    :class="[
      disabled ? 'grayscale opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
      disabled ? 'scale-[0.98]' : ''
    ]"
    @mousemove="disabled ? null : handleMouseMove"
    @mouseleave="resetTilt"
    @click="disabled ? null : $emit('select', id)"
  >
    <!-- Background Frame Layer -->
    <div 
      class="absolute inset-0 bg-black/60 backdrop-blur-3xl border rounded-sm overflow-hidden transition-all duration-500"
      :class="(selected && !disabled) ? 'border-white shadow-[0_0_32px_-12px_rgba(255,255,255,0.3)]' : ['border-white/10 shadow-[0_24px_48px_-8px_rgba(0,0,0,1)]', !disabled ? 'group-hover:border-white/40' : '']"
    >
      
      <!-- Four Corner Brackets -->
      <div 
        class="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l transition-all duration-700"
        :class="(selected && !disabled) ? 'border-white' : ['border-white/20', !disabled ? 'group-hover:border-white group-hover:scale-110' : '']"
      ></div>
      <div 
        class="absolute top-1.5 right-1.5 w-1.5 h-1.5 border-t border-r transition-all duration-700"
        :class="(selected && !disabled) ? 'border-white' : ['border-white/20', !disabled ? 'group-hover:border-white group-hover:scale-110' : '']"
      ></div>
      <div 
        class="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 border-b border-l transition-all duration-700"
        :class="(selected && !disabled) ? 'border-white' : ['border-white/20', !disabled ? 'group-hover:border-white group-hover:scale-110' : '']"
      ></div>
      <div 
        class="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r transition-all duration-700"
        :class="(selected && !disabled) ? 'border-white' : ['border-white/20', !disabled ? 'group-hover:border-white group-hover:scale-110' : '']"
      ></div>

      <!-- Main Content Area -->
      <div class="absolute inset-0 p-5 flex flex-col">
          <!-- Top Section -->
          <div 
            class="flex flex-col mb-5 border-l pl-4 transition-all duration-500 rounded-tr-xl relative"
            :class="(selected && !disabled) ? 'border-white bg-white py-3' : ['border-white/10', !disabled ? 'group-hover:border-white group-hover:pl-5' : '']"
          >
             <!-- Deviation Indicator -->
             <div v-if="disabled" class="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-rose-500 animate-ping"></div>

             <div class="flex items-center gap-2 mb-1">
               <span 
                class="text-[6px] uppercase tracking-[0.6em] font-sans font-black transition-colors"
                :class="(selected && !disabled) ? 'text-black/40' : 'text-white/20'"
               >
                 {{ disabled ? 'INTEGRITY_COMPROMISED' : `REG_SEG ${id.slice(0,3).toUpperCase()}` }}
               </span>
               <div v-if="selected && !disabled" class="w-1 h-1 rounded-full bg-black/60 animate-pulse"></div>
             </div>
             
             <h3 
              class="text-lg font-serif font-medium tracking-tighter uppercase leading-none transition-colors"
              :class="(selected && !disabled) ? 'text-black' : 'text-white'"
             >
                {{ title || '— — —' }}
             </h3>
             <span class="text-[5px] uppercase tracking-[0.3em] font-mono mt-2 transition-colors" :class="(selected && !disabled) ? 'text-black/30' : 'text-white/5'">
                {{ disabled ? 'PROTOCOL DEVIATION DETECTED' : (selected ? 'OPERATIONAL STATUS: ACTIVE' : 'Layer 02 Active') }}
             </span>
          </div>

          <!-- Skills Area -->
          <div class="flex-1 flex flex-col pt-4 border-t border-white/5" :class="disabled ? 'pointer-events-none' : ''">
            <div class="flex flex-wrap gap-1 overflow-y-auto custom-scrollbar flex-1 pr-2">
               <div 
                v-for="skill in skills" 
                :key="skill.id"
                class="group/skill relative px-2.5 py-1.5 bg-white/[0.03] border border-white/5 rounded-sm transition-all duration-200 hover:bg-white hover:border-white cursor-pointer flex flex-col gap-0.5 w-full overflow-hidden"
              >
                 <div class="absolute top-0.5 left-0.5 w-0.5 h-0.5 border-t border-l border-white/10 group-hover/skill:border-black transition-colors"></div>
                 <div class="absolute bottom-0.5 right-0.5 w-0.5 h-0.5 border-b border-r border-white/10 group-hover/skill:border-black transition-colors"></div>

                 <div class="flex items-center gap-1.5">
                    <div class="w-1 h-1 rounded-full bg-white/20 group-hover/skill:bg-black/40"></div>
                    <span class="text-[9px] uppercase font-serif font-bold tracking-tighter text-white/40 group-hover/skill:text-black transition-colors">{{ skill.text }}</span>
                 </div>
              </div>
            </div>
          </div>
      </div>

      <!-- Top-Right ID Anchor -->
      <div class="absolute top-3 right-3 text-[6px] font-mono text-white/10 uppercase tracking-widest transition-colors" :class="!disabled ? 'group-hover:text-white/30' : ''">
         0x{{ id.slice(0,4).toUpperCase() }}
      </div>

      <!-- Interactive Sheen Layer -->
      <div 
        v-if="!disabled"
        class="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        :style="sheenStyle"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  title: string;
  skills: any[];
  id: string;
  selected?: boolean;
  disabled?: boolean;
}>();

defineEmits(['hover-skill', 'select']);

const cardRef = ref<HTMLElement | null>(null);
const sheenX = ref(50);
const sheenY = ref(50);

const handleMouseMove = (e: MouseEvent) => {
  if (!cardRef.value) return;
  const rect = cardRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  sheenX.value = (x / rect.width) * 100;
  sheenY.value = (y / rect.height) * 100;
};

const resetTilt = () => {};

const sheenStyle = computed(() => ({
  background: `radial-gradient(circle at ${sheenX.value}% ${sheenY.value}%, rgba(255,255,255,0.1) 0%, transparent 65%)`
}));
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 2px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}
</style>
