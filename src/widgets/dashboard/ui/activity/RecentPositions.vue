<template>
  <article class="mb-8">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-base font-serif tracking-wide text-[#050505] dark:text-[#dcdcdc]">
        Recent Positions
      </h2>
    </div>

    <div class="mb-8">
      <input
        type="text"
        placeholder="Search positions by asset..."
        v-model="searchQuery"
        class="bg-transparent border-b border-black/20 dark:border-white/20 outline-none text-xs py-1 text-[#050505] dark:text-[#bcbcbc] placeholder:text-[#5f5f5f] w-full transition focus:border-black/50 dark:focus:border-white/50"
      />
    </div>

    <div class="space-y-3">
      <div 
        v-for="entry in filteredEntries" 
        :key="entry.date.toString() + entry.asset" 
        @click="openDetails(entry)"
        class="group relative flex items-center justify-between p-2.5 rounded-xl border border-black/5 dark:border-white/5 bg-white/30 dark:bg-white/[0.01] backdrop-blur-sm transition-all duration-500 cursor-pointer overflow-hidden hover:bg-black/[0.02] dark:hover:bg-white/[0.04] hover:border-black/10 dark:hover:border-white/10"
      >
        <!-- Monochrome Hover Accents -->
        <div class="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-black/[0.01] dark:from-white/[0.02] via-transparent to-transparent transition-opacity duration-700"></div>
        <div class="absolute left-0 top-0 bottom-0 w-0.5 bg-transparent group-hover:bg-black/20 dark:group-hover:bg-white/20 transition-all duration-500"></div>

        <div class="relative flex flex-col gap-1.5 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold tracking-[0.15em] uppercase px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[#444] dark:text-[#aaa]">
              {{ entry.asset || 'N/A' }}
            </span>
            <span 
              :class="[
                'text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md border',
                entry.side === 'Long' ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/5' : 'text-rose-600 border-rose-500/30 bg-rose-500/5'
              ]"
            >
              {{ entry.side }}
            </span>
          </div>
          <div class="flex flex-col">
            <span class="text-[13px] font-serif tracking-tight text-[#050505] dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {{ entry.notes?.split('\n')[0] || 'Unlabeled Position' }}
            </span>
            <span class="text-[10px] text-[#888] dark:text-[#666] flex items-center gap-1.5 mt-0.5">
              <svg class="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {{ entry.date ? formatTradeDate(entry.date) : 'Recently' }}
            </span>
          </div>
        </div>

        <div class="relative flex flex-col items-end shrink-0 pl-3">
          <span :class="[
            'text-sm font-bold tracking-tight',
            (entry.result || 0) > 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400',
            (entry.result || 0) === 0 ? 'text-[#aaa]' : ''
          ]">
            {{ (entry.result || 0) > 0 ? '+' : '' }}{{ entry.result || 0 }}%
          </span>
          <span class="text-[9px] text-[#999] dark:text-[#555] font-bold tracking-widest group-hover:text-[#050505] dark:group-hover:text-white group-hover:scale-105 transition-all duration-300">DETAILS →</span>
        </div>
      </div>

      <div v-if="filteredEntries.length === 0" class="text-center py-12 rounded-2xl border-2 border-dashed border-black/5 dark:border-white/5 opacity-40">
        <p class="text-sm italic">
          <span v-if="searchQuery">No results for "{{ searchQuery }}"</span>
          <span v-else>No positions documented yet.</span>
        </p>
      </div>
    </div>

    <p class="text-xs leading-relaxed text-[#666] dark:text-[#7a7a7a] mt-6 px-1">
      Each position includes documented entry logic and structural discipline.
    </p>
  </article>

  <Teleport to="body">
    <div v-if="isDetailsModalOpen" class="fixed inset-0 z-[9999]">
      <EntryDetailsModal 
        :isOpen="isDetailsModalOpen" 
        :entry="selectedEntry" 
        @close="isDetailsModalOpen = false" 
        @selectTrade="selectedEntry = $event"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { DiaryEntry } from '~/entities/diary/model/diary.types';
import EntryDetailsModal from '~/widgets/diary/ui/modals/EntryDetailsModal.vue';

const props = defineProps<{
    entries: DiaryEntry[];
}>();

const selectedEntry = ref<DiaryEntry | null>(null);
const isDetailsModalOpen = ref(false);

const formatTradeDate = (date: any) => {
    if (!date) return '';
    const d = (date && typeof date === 'object' && 'seconds' in date) ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const openDetails = (entry: DiaryEntry) => {
    selectedEntry.value = entry;
    isDetailsModalOpen.value = true;
};

const searchQuery = ref('');

const filteredEntries = computed(() => {
    let sorted = [...props.entries].sort((a, b) => {
        const dateA = a.date && typeof a.date === 'object' && 'seconds' in a.date ? (a.date as any).seconds * 1000 : new Date(a.date as any).getTime();
        const dateB = b.date && typeof b.date === 'object' && 'seconds' in b.date ? (b.date as any).seconds * 1000 : new Date(b.date as any).getTime();
        return dateB - dateA;
    });

    if (searchQuery.value) {
        sorted = sorted.filter(entry => (entry.asset || '').toLowerCase().includes(searchQuery.value.toLowerCase()));
    }

    return sorted.slice(0, 5);
});
</script>
