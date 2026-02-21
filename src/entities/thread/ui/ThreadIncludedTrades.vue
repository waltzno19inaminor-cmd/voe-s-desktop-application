<template>
    <div class="flex flex-col py-10">
        <div>
            <h3 class="text-[10px] tracking-[0.25em] uppercase text-[#777] mb-6">Included Trades</h3>
        </div>
        <div class="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
                    <table v-if="trades.length > 0" class="min-w-full border-collapse text-xs">
                        <thead class="bg-[#fafafa] dark:bg-[#181818]">
                        <tr>
                            <th class="px-6 py-3 text-left font-medium text-[#666] dark:text-[#aaa] uppercase tracking-wider text-xs">Date</th>
                            <th class="px-6 py-3 text-left font-medium text-[#666] dark:text-[#aaa] uppercase tracking-wider text-xs">Asset</th>
                            <th class="px-6 py-3 text-left font-medium text-[#666] dark:text-[#aaa] uppercase tracking-wider text-xs">Side</th>
                            <th class="px-6 py-3 text-left font-medium text-[#666] dark:text-[#aaa] uppercase tracking-wider text-xs">Entry / Exit</th>
                            <th class="px-6 py-3 text-left font-medium text-[#666] dark:text-[#aaa] uppercase tracking-wider text-xs">Exit Date</th>
                            <th class="px-6 py-3 text-left font-medium text-[#666] dark:text-[#aaa] uppercase tracking-wider text-xs">SL / TP</th>
                            <th class="px-6 py-3 text-left font-medium text-[#666] dark:text-[#aaa] uppercase tracking-wider text-xs">Size</th>
                            <th class="px-6 py-3 text-left font-medium text-[#666] dark:text-[#aaa] uppercase tracking-wider text-xs">Result</th>
                            <th class="px-6 py-3 text-left font-medium text-[#666] dark:text-[#aaa] uppercase tracking-wider text-xs">Notes</th>
                            <th class="px-6 py-3 text-left font-medium text-[#666] dark:text-[#aaa] uppercase tracking-wider text-xs w-24">Context</th>

                        </tr>
                        </thead>

                        <tbody v-for="(entry, index) in trades">
                        <tr
                        
                            class="border-t border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition text-[#121212] dark:text-white align-top"
                        >
                            <td class="px-6 py-4 text-[#666] dark:text-[#aaa]">
                            {{ entry.date.toDate
                                ? entry.date.toDate().toLocaleString("ru-RU")
                                : entry.date?.toLocaleString("ru-RU")
                            }}




                            </td>

                            <td class="px-6 py-4 font-serif whitespace-nowrap">
                            {{entry.asset}}
                            </td>

                            <td class="px-6 py-4 uppercase tracking-widest text-xs">
                            <span :class="entry.side === 'Long' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                                {{entry.side}}
                            </span>
                            </td>

                            <td class="px-6 py-4 text-[#666] dark:text-[#aaa] whitespace-nowrap">
                            {{entry.entry}} → {{entry.exit}}
                            </td>

                            <td class="px-6 py-4 text-[#666] dark:text-[#aaa]">
                            {{ entry.dateExit?.toDate
                                ? entry.dateExit.toDate().toLocaleString("ru-RU")
                                : entry.dateExit?.toLocaleString("ru-RU")
                            }}
                            </td>

                            <td class="px-6 py-4 text-[#666] dark:text-[#aaa] whitespace-nowrap">
                            {{entry.stopLoss}} → {{entry.takeProfit}}
                            </td>

                            <td class="px-6 py-4 whitespace-nowrap">
                            {{entry.size}}
                            </td>

                            <td class="px-6 py-4 whitespace-nowrap " :class="entry?.result >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                            {{entry?.result >= 0 ? '+' + entry?.result: + entry?.result}}%
                            </td>

                            <td class="px-6 py-4 text-[#555] dark:text-[#bdbdbd] italic max-w-[140px] truncate">
                            {{entry.notes}}
                            </td>
                            
                            <td class="px-6 py-4 whitespace-nowrap">
                                <button 
                                @click.prevent="openDetails(entry)"
                                    v-if="entry.images && entry.images.length > 0"
                                
                                    class="flex items-center gap-1.5 text-xs font-medium bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition text-[#121212] dark:text-white"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-[#666] dark:text-[#aaa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {{ entry.images.length }} items
                                </button>
                                <div v-else class="text-xs text-[#999] dark:text-[#666] italic pl-2">
                                    <button @click.prevent = "openDetails(entry)">No items</button>
                                </div>
                            </td>
                        
                        </tr>
                        </tbody>
                    </table>
        </div>
    </div>

    <EntryDetailsModal 
        :isOpen="isDetailsModalOpen" 
        :entry="selectedEntry" 
        @close="isDetailsModalOpen = false" 
    />
</template>

<script setup>


import EntryDetailsModal from '@/widgets/diary/ui/EntryDetailsModal.vue'; 

const selectedEntry = ref(null);
const isDetailsModalOpen = ref(false);

const openDetails = (entry) => {
    selectedEntry.value = entry;
    isDetailsModalOpen.value = true;
};

const props = defineProps({
    trades: Array
})


</script>