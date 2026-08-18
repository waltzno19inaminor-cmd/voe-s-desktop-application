<template>
  <div class="fixed inset-0 z-[1000] flex bg-white/95 dark:bg-[#050505]/95 backdrop-blur-3xl overflow-hidden">
      
      <!-- Close Button (Disabled when drawing) -->
      <button 
        v-if="!isDrawingModalActive"
        @click="$emit('close')"
        class="absolute top-6 right-6 z-50 p-2 text-[#777] hover:text-black dark:hover:text-white transition-colors"
      >
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Sidebar (Thoughts Menu) -->
      <div 
        class="w-full max-w-sm border-r border-black/5 dark:border-white/5 h-full flex flex-col relative"
        :class="{ 'hidden md:flex': activeThoughtId }"
      >
        <ThoughtsMenu />
      </div>

      <!-- Main Editor Area -->
      <div 
        class="flex-1 h-full overflow-hidden relative"
        :class="{ 'hidden md:block': !activeThoughtId && isMobileView, 'block': activeThoughtId || !isMobileView }"
      >
        <ThoughtsEditor v-if="activeThoughtId" />
        <div v-else class="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
            <svg class="w-16 h-16 text-[#ccc] dark:text-[#333] mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h2 class="text-xl font-serif text-[#050505] dark:text-white mb-2">The Trading Protocol</h2>
            <p class="text-sm text-[#777] max-w-sm leading-relaxed">
                Document your rationale, review your psychology, and attach executed trades to review performance holistically.
            </p>
        </div>
      </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { activeThoughtId, isDrawingModalActive } from '@/widgets/diary/model/useThoughts';
import ThoughtsMenu from './ThoughtsMenu.vue';
import ThoughtsEditor from './ThoughtsEditor.vue';

const emit = defineEmits(['close']);

// Simple mobile view check
const isMobileView = ref(false);

const checkMobile = () => {
    isMobileView.value = window.innerWidth < 768;
};

const onKeydown = (e: KeyboardEvent) => {
    // Prevent default Backspace navigation in Tauri webview unless editing
    if (e.key === 'Backspace') {
        const t = e.target as HTMLElement;
        const isInput = t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA';
        if (!isInput) {
            e.preventDefault();
        }
    }
};

onMounted(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('keydown', onKeydown);
    document.body.style.overflow = 'hidden';
});

onUnmounted(() => {
    window.removeEventListener('resize', checkMobile);
    window.removeEventListener('keydown', onKeydown);
    document.body.style.overflow = '';
});
</script>

