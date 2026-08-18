<template>
  <div class="relative w-full" ref="container">
    <!-- Trigger -->
    <button 
      type="button"
      @click="isOpen = !isOpen"
      class="w-full flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white hover:border-white/20 transition-all duration-300 group shadow-sm focus:outline-none"
    >
      <span v-if="selectedOption" class="font-bold tracking-wide">{{ selectedOption.label }}</span>
      <span v-else class="text-white/20 italic">{{ placeholder || 'Select option...' }}</span>
      <svg 
        class="w-4 h-4 text-white/20 transition-transform duration-500 group-hover:text-white/40"
        :class="isOpen ? 'rotate-180' : ''"
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <!-- Dropdown Panel -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-2 scale-95"
    >
      <div 
        v-if="isOpen"
        class="absolute z-[1100] w-full mt-3 bg-black/90 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden py-2"
      >
        <div class="max-h-60 overflow-y-auto custom-scrollbar">
          <button
            v-for="option in options"
            :key="option.value"
            type="button"
            @click="select(option)"
            class="w-full text-left px-5 py-3 text-sm transition-all duration-300 flex items-center justify-between group"
            :class="modelValue === option.value ? 'bg-white/5 text-white' : 'text-white/40 hover:bg-white/[0.02] hover:text-white/80'"
          >
            <span class="tracking-wide" :class="{ 'font-bold': modelValue === option.value }">
              {{ option.label }}
            </span>
            <div 
              v-if="modelValue === option.value"
              class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
            ></div>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';

interface Option {
  label: string;
  value: any;
}

const props = defineProps<{
  options: Option[];
  modelValue: any;
  placeholder?: string;
}>();

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);
const container = ref<HTMLElement | null>(null);

const selectedOption = computed(() => {
  return props.options.find(o => o.value === props.modelValue);
});

const select = (option: Option) => {
  emit('update:modelValue', option.value);
  emit('change', option.value);
  isOpen.value = false;
};

const handleClickOutside = (event: MouseEvent) => {
  if (container.value && !container.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
}
</style>
