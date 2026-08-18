<template>
  <div class="py-10">
    <h3 class="text-[10px] tracking-[0.25em] uppercase text-[#777] mb-6">Included Trades</h3>

    <div v-if="trades.length > 0" class="space-y-3">

      <!-- Header labels -->
      <div class="hidden lg:grid grid-cols-[1.2fr,1fr,1fr,0.8fr,130px] items-center px-6 py-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[#777] opacity-60">
        <div>Asset &amp; Date</div>
        <div>Levels</div>
        <div class="text-center">Performance</div>
        <div class="text-center">Details</div>
        <div class="text-right">Context</div>
      </div>

      <!-- Ledger rows -->
      <div
        v-for="(entry, index) in trades"
        :key="index"
        @click="openDetails(entry)"
        class="group relative nier-bg-panel border border-black/5 dark:border-white/5 rounded-2xl p-5 lg:px-6 lg:py-4 opacity-85 hover:opacity-100 transition-all duration-500 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5 hover:-translate-y-0.5 grid grid-cols-2 lg:grid-cols-[1.2fr,1fr,1fr,0.8fr,130px] items-center gap-y-5 gap-x-4 cursor-pointer"
      >
        <!-- Left glow indicator -->
        <div
          class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2/3 rounded-r-full transition-all duration-500 opacity-0 group-hover:opacity-100"
          :class="entry.result > 0 ? 'bg-emerald-500 shadow-[4px_0_12px_rgba(16,185,129,0.4)]' : (entry.result < 0 ? 'bg-rose-500 shadow-[4px_0_12px_rgba(244,63,94,0.4)]' : 'bg-gray-400')"
        ></div>

        <!-- Col 1: Asset & Identity -->
        <div class="flex items-center gap-3 col-span-2 lg:col-span-1">
          <div
            class="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold tracking-tighter transition-transform duration-500 group-hover:scale-110 shrink-0"
            :class="entry.result > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : (entry.result < 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-gray-500/10 text-gray-500')"
          >
            {{ entry.asset?.substring(0, 2).toUpperCase() || 'TR' }}
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-sm font-serif font-bold nier-text-primary truncate">{{ entry.asset }}</span>
            <span class="text-[10px] text-[#777] uppercase tracking-widest font-mono mt-0.5">{{ formatDate(entry.date) }}</span>
          </div>
        </div>

        <!-- Col 2: Levels -->
        <div class="flex flex-col col-span-1">
          <div class="flex items-center gap-1.5 text-[11px] font-medium text-[#050505] dark:text-white">
            <span class="opacity-40 uppercase text-[9px]">In</span> {{ entry.entry }}
            <svg class="w-3 h-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span class="opacity-40 uppercase text-[9px]">Out</span> {{ entry.exit }}
          </div>
          <div class="flex items-center gap-3 mt-1 opacity-50">
            <div class="flex items-center gap-1">
              <span class="text-[8px] uppercase tracking-tighter">SL</span>
              <span class="text-[10px] font-mono">{{ entry.stopLoss || '—' }}</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-[8px] uppercase tracking-tighter">TP</span>
              <span class="text-[10px] font-mono">{{ entry.takeProfit || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- Col 3: Performance -->
        <div class="flex flex-col items-center">
          <span
            class="text-lg font-serif font-bold tracking-tight"
            :class="entry.result > 0 ? 'text-emerald-600 dark:text-emerald-400' : (entry.result < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500 dark:text-gray-400')"
          >
            {{ entry.result > 0 ? '+' : '' }}{{ entry.result }}%
          </span>
          <div
            class="text-[9px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded-md mt-0.5"
            :class="entry.side === 'Long' ? 'bg-emerald-500/5 text-emerald-600/60' : 'bg-rose-500/5 text-rose-600/60'"
          >
            {{ entry.side }}
          </div>
        </div>

        <!-- Col 4: Volume details -->
        <div class="flex flex-col items-center col-span-1">
          <div class="flex items-baseline gap-1">
            <span class="text-sm font-serif font-bold dark:text-white">{{ entry.size }}</span>
            <span class="text-[10px] text-[#777] uppercase tracking-tighter">Lots</span>
          </div>
          <span v-if="entry.sizeInCurrency" class="text-[10px] text-[#777] opacity-60">
            {{ entry.sizeInCurrency }} {{ entry.currency }}
          </span>
        </div>

        <!-- Col 5: Context -->
        <div class="flex justify-end col-span-1">
          <div
            v-if="entry.images && entry.images.length > 0"
            class="flex items-center gap-2 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5 transition-colors group-hover:bg-black/5 dark:group-hover:bg-white/5"
          >
            <svg class="w-3.5 h-3.5 text-[#777]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="text-[10px] font-bold text-[#666] dark:text-[#aaa]">{{ entry.images.length }} items</span>
          </div>
          <span v-else class="text-[10px] italic text-[#ccc] dark:text-[#444] px-3">No attachments</span>
        </div>
      </div>
    </div>

    <EntryDetailsModal
      :isOpen="isDetailsModalOpen"
      :entry="selectedEntry"
      @close="isDetailsModalOpen = false"
      @selectTrade="selectedEntry = $event"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import EntryDetailsModal from '@/widgets/diary/ui/modals/EntryDetailsModal.vue';
import { normalizeDate } from '~/composables/normalizeDate';

const props = defineProps({ trades: Array });

const selectedEntry = ref(null);
const isDetailsModalOpen = ref(false);

function formatDate(date) {
  if (!date) return '—';
  const d = normalizeDate(date);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const openDetails = (entry) => {
  selectedEntry.value = entry;
  isDetailsModalOpen.value = true;
};
</script>