<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div 
      class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      @click="close"
    ></div>

    <!-- Modal Content -->
    <div 
      class="relative bg-white dark:bg-[#181818] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-black/5 dark:border-white/10 flex flex-col"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-[#fafafa] dark:bg-[#1f1f1f] flex-shrink-0">
        <div>
          <h2 class="text-xl font-serif text-[#121212] dark:text-white">Trade Details</h2>
          <p class="text-sm text-[#666] dark:text-[#aaa]">{{ entry?.asset }} - {{ entry ? new Date(entry.date).toLocaleDateString() : '' }}</p>
        </div>
        <button 
          @click="close"
          class="text-[#666] dark:text-[#aaa] hover:text-[#121212] dark:hover:text-white transition p-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body / Scrollable Content -->
      <div class="p-6 overflow-y-auto custom-scrollbar">
        
        <!-- Key Stats Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div class="p-4 bg-[#fafafa] dark:bg-[#1f1f1f] rounded-lg border border-black/5 dark:border-white/5">
                <span class="block text-xs uppercase tracking-widest text-[#666] dark:text-[#aaa] mb-1">Side</span>
                <span :class="entry?.side === 'Long' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'" class="font-medium">
                    {{ entry?.side }}
                </span>
            </div>
             <div class="p-4 bg-[#fafafa] dark:bg-[#1f1f1f] rounded-lg border border-black/5 dark:border-white/5">
                <span class="block text-xs uppercase tracking-widest text-[#666] dark:text-[#aaa] mb-1">Result</span>
                <span class="font-medium text-[#121212] dark:text-white">
                    {{ entry?.result }}
                </span>
            </div>
             <div class="p-4 bg-[#fafafa] dark:bg-[#1f1f1f] rounded-lg border border-black/5 dark:border-white/5">
                <span class="block text-xs uppercase tracking-widest text-[#666] dark:text-[#aaa] mb-1">Entry</span>
                <span class="font-medium text-[#121212] dark:text-white">
                    {{ entry?.entry }}
                </span>
            </div>
             <div class="p-4 bg-[#fafafa] dark:bg-[#1f1f1f] rounded-lg border border-black/5 dark:border-white/5">
                <span class="block text-xs uppercase tracking-widest text-[#666] dark:text-[#aaa] mb-1">Exit</span>
                <span class="font-medium text-[#121212] dark:text-white">
                    {{ entry?.exit }}
                </span>
            </div>
        </div>

        <!-- Notes -->
        <div class="mb-8">
            <h3 class="text-sm uppercase tracking-widest text-[#666] dark:text-[#aaa] mb-2">Notes</h3>
            <p class="text-[#121212] dark:text-white leading-relaxed whitespace-pre-line bg-[#fafafa] dark:bg-[#1f1f1f] p-4 rounded-lg border border-black/5 dark:border-white/5">
                {{ entry?.notes }}
            </p>
        </div>

        <!-- Images Gallery -->
        <div v-if="entry?.images && entry.images.length > 0">
            <h3 class="text-sm uppercase tracking-widest text-[#666] dark:text-[#aaa] mb-4">Visual Context</h3>
            <div class="grid grid-cols-1 gap-8">
                <div v-for="(img, index) in entry.images" :key="index" class="space-y-3">
                    <div class="rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shadow-sm bg-black/5 dark:bg-white/5">
                        <img :src="img.url" class="w-full h-auto object-contain max-h-[600px]" alt="Trade context" loading="lazy" />
                    </div>
                    <div class="flex items-start gap-3 px-2">
                        <div class="w-1 h-full min-h-[1.5rem] bg-black/20 dark:bg-white/20 rounded-full"></div>
                        <p class="text-[#121212] dark:text-white italic text-sm md:text-base leading-relaxed">
                            {{ img.context }}
                        </p>
                    </div>
                </div>
            </div>
        </div>
        <div v-else class="text-center py-10 text-[#666] dark:text-[#aaa] bg-[#fafafa] dark:bg-[#1f1f1f] rounded-lg dashed-border">
            No images attached to this entry.
        </div>

      </div>
       <div class="px-6 py-4 border-t border-black/5 dark:border-white/5 bg-[#fafafa] dark:bg-[#1f1f1f] flex justify-end">
        <button 
          @click="close"
          class="px-6 py-2 text-sm text-white bg-black dark:bg-white dark:text-black rounded-lg hover:opacity-80 transition shadow-lg"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DiaryEntry } from '@/entities/diary/model/diary.types';

const props = defineProps<{
  isOpen: boolean;
  entry: DiaryEntry | null;
}>();

const emit = defineEmits(['close']);

const close = () => {
  emit('close');
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(155, 155, 155, 0.3);
  border-radius: 4px;
}
.dashed-border {
    border: 1px dashed rgba(0,0,0,0.1);
}
.dark .dashed-border {
    border: 1px dashed rgba(255,255,255,0.1);
}
</style>
