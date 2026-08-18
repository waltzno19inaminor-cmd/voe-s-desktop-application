<template>
  <div class="relative w-full h-[54px] bg-white/[0.02] border border-white/5 rounded-2xl p-1 flex items-center transition-all duration-500 overflow-hidden group hover:border-white/10 shadow-sm">
    
    <!-- Sliding Background Indicator -->
    <div 
      class="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-lg"
      :class="modelValue === 'Long' ? 'translate-x-0 bg-emerald-500/20 border border-emerald-500/30' : 'translate-x-full bg-rose-500/20 border border-rose-500/30'"
    ></div>

    <button 
      type="button" 
      @click="update('Long')"
      class="relative z-10 flex-1 h-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500"
      :class="modelValue === 'Long' ? 'text-emerald-400' : 'text-white/20 hover:text-white/40'"
    >
      <div 
        class="w-1.5 h-1.5 rounded-full transition-all duration-700" 
        :class="modelValue === 'Long' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]' : 'bg-white/10 group-hover:bg-white/20'"
      ></div>
      Long
    </button>

    <button 
      type="button" 
      @click="update('Short')"
      class="relative z-10 flex-1 h-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500"
      :class="modelValue === 'Short' ? 'text-rose-400' : 'text-white/20 hover:text-white/40'"
    >
      <div 
        class="w-1.5 h-1.5 rounded-full transition-all duration-700" 
        :class="modelValue === 'Short' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)]' : 'bg-white/10 group-hover:bg-white/20'"
      ></div>
      Short
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue?: 'Long' | 'Short' | string;
}>();

const emit = defineEmits(['update:modelValue', 'change']);

const update = (val: 'Long' | 'Short') => {
  emit('update:modelValue', val);
  emit('change', val);
};
</script>
