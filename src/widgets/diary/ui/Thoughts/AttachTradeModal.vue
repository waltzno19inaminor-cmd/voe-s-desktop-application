<template>
  <transition name="fade-scale">
    <div v-if="isOpen" class="fixed inset-0 z-[2000] flex items-center justify-center pointer-events-auto px-4">
      <div 
        @click="$emit('close')" 
        class="absolute inset-0 bg-white/40 dark:bg-black/80 backdrop-blur-md transition-opacity"
      ></div>

      <div class="relative bg-white dark:bg-[#050505] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-8 border border-black/5 dark:border-white/5 w-full max-w-2xl max-h-[85vh] flex flex-col">
        <!-- Header -->
        <div class="w-full flex justify-between items-center mb-6 shrink-0">
          <div>
            <h3 class="text-[#050505] dark:text-white font-serif text-2xl tracking-wide mb-1">Attach Trade</h3>
            <p class="text-xs uppercase tracking-widest text-[#777] font-bold">Incorporate historical context</p>
          </div>
          <button @click="$emit('close')" class="p-2 text-[#777] hover:text-black dark:hover:text-white transition">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Search -->
        <div class="relative mb-6 shrink-0">
            <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
                v-model="searchQuery"
                type="text" 
                placeholder="Search by asset, pair or date..." 
                class="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-black/20 dark:focus:border-white/20 rounded-xl py-3 pl-10 pr-4 text-sm text-[#050505] dark:text-white placeholder:text-[#aaa] outline-none transition uppercase tracking-widest font-medium"
            />
        </div>

        <!-- List -->
        <div class="flex-1 overflow-y-auto scrollbar-hidden pr-2 -mr-2 space-y-3">
             <div v-if="filteredEntries.length === 0" class="text-center p-8 text-[#aaa] text-xs uppercase tracking-widest font-bold">
                 No trades found.
             </div>
             
             <div 
                v-for="entry in filteredEntries" 
                :key="entry.id"
                @click="attach(entry)"
                class="group flex items-center justify-between p-4 bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-2xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 hover:border-black/10 dark:hover:border-white/10 transition-colors"
             >
                <div class="flex items-center gap-4">
                    <div 
                        class="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold tracking-tighter transition-transform duration-500 group-hover:scale-110"
                        :class="entry.result > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : (entry.result < 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-gray-500/10 text-gray-500')"
                    >
                        {{ entry.asset?.substring(0, 2).toUpperCase() || 'TR' }}
                    </div>
                    <div>
                        <h4 class="text-sm font-serif font-bold text-[#050505] dark:text-white">{{ entry.asset }}</h4>
                        <p class="text-[10px] text-[#777] uppercase tracking-widest font-mono mt-0.5">{{ formatDate(entry.date) }}</p>
                    </div>
                </div>

                <div class="flex items-center gap-6">
                    <div class="text-right">
                        <span 
                            class="text-sm font-serif font-bold"
                            :class="entry.result > 0 ? 'text-emerald-600 dark:text-emerald-400' : (entry.result < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500 dark:text-gray-400')"
                        >
                            {{ entry.result > 0 ? '+' : '' }}{{ entry.result }}%
                        </span>
                        <div 
                            class="text-[9px] uppercase tracking-[0.15em] font-bold px-1.5 py-[1px] rounded inline-block mt-0.5"
                            :class="entry.side === 'Long' ? 'bg-emerald-500/5 text-emerald-600/60' : 'bg-rose-500/5 text-rose-600/60'"
                        >
                            {{ entry.side }}
                        </div>
                    </div>
                    <button class="w-8 h-8 rounded-full border nier-border-primary flex items-center justify-center text-[#050505] dark:text-white group-hover:bg-black group-hover:dark:bg-white group-hover:text-white group-hover:dark:text-black transition-colors">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
             </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useForumStore } from '~/features/store/useForum';
import type { DiaryEntry } from '~/entities/diary/model/diary.types';

const props = defineProps<{
    isOpen: boolean;
}>();

const emit = defineEmits(['close', 'attach']);
const searchQuery = ref('');
const route = useRoute();
const forumStore = useForumStore();

const entries = computed(() => {
    const uid = route.query.uid;
    if (typeof uid !== 'string') return [];
    return forumStore.users.get(uid)?.diary || [];
});

const filteredEntries = computed(() => {
    let list = [...entries.value];
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        list = list.filter(t => 
            t.asset.toLowerCase().includes(q) || 
            formatDate(t.date).toLowerCase().includes(q)
        );
    }
    return list.sort((a, b) => {
        const dA = a.date ? new Date(a.date).getTime() : 0;
        const dB = b.date ? new Date(b.date).getTime() : 0;
        return dB - dA; // Descending
    });
});

const attach = (entry: DiaryEntry) => {
    // Pass everything needed to build a visual card in the editor's innerHTML
    emit('attach', entry);
    emit('close');
};

function formatDate(date: any) {
  if (!date) return '—';
  try {
    if (date && typeof date.toDate === 'function') {
      return date.toDate().toLocaleString("en-US", { day: '2-digit', month: 'short', year: 'numeric' });
    }
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString("en-US", { day: '2-digit', month: 'short', year: 'numeric' });
    }
  } catch (e) {
  }
  return '—';
}
</script>

<style scoped>
.scrollbar-hidden::-webkit-scrollbar {
  display: none;
}
.scrollbar-hidden {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
