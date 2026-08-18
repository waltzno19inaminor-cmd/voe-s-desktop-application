<template>
  <Teleport to="body">
    <div 
      v-if="visible && content" 
      ref="tooltipRef"
      class="fixed pointer-events-none z-[100001] flex flex-col gap-2 transition-opacity duration-300"
      :style="{
        left: x + 'px',
        top: y + 'px',
        opacity: visible ? 1 : 0
      }"
    >
      <div class="relative bg-black/80 backdrop-blur-2xl border border-white/10 p-4 rounded-sm shadow-[0_32px_64px_rgba(0,0,0,0.8)] min-w-[240px] max-w-[320px] overflow-hidden">
        <!-- Corner Accents -->
        <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/40"></div>
        <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/40"></div>
        
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between border-b border-white/5 pb-2">
            <span class="text-[8px] uppercase tracking-[0.4em] font-black text-white/30">{{ category || 'PSYCH_STATE' }}</span>
            <span class="text-[6px] font-mono text-white/10">{{ subtext || 'REF_SECURED' }}</span>
          </div>
          
          <h4 class="text-[12px] font-serif italic text-white uppercase tracking-widest">{{ title }}</h4>
          <p class="text-[10px] text-white/50 leading-relaxed font-medium border-l border-white/10 pl-3 italic">
            {{ content }}
          </p>
          
          <div class="mt-2 pt-2 border-t border-white/5 flex items-center gap-2">
             <div class="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
             <span class="text-[6px] uppercase tracking-widest text-white/20">Active Monitoring Link...</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

defineProps<{
  visible: boolean;
  title?: string;
  content?: string;
  category?: string;
  subtext?: string;
}>();

const x = ref(0);
const y = ref(0);
const tooltipRef = ref<HTMLElement | null>(null);

const updateMouse = (e: MouseEvent) => {
  const padding = 20;
  let nextX = e.clientX + padding;
  let nextY = e.clientY + padding;

  if (tooltipRef.value) {
    const rect = tooltipRef.value.getBoundingClientRect();
    if (nextX + rect.width > window.innerWidth) {
      nextX = e.clientX - rect.width - padding;
    }
    if (nextY + rect.height > window.innerHeight) {
      nextY = e.clientY - rect.height - padding;
    }
  }

  x.value = nextX;
  y.value = nextY;
};

onMounted(() => {
  window.addEventListener('mousemove', updateMouse);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', updateMouse);
});
</script>
