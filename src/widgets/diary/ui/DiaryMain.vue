<template>
  <main class="relative mt-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">


    <section class="mb-10">
      <h1 class="text-3xl font-serif tracking-wide text-[#121212] dark:text-white mb-2">
        Trading Diary
      </h1>
      <p class="text-sm text-[#666] dark:text-[#aaa] max-w-2xl">
        A structured record of executed trades and post-trade reflections.
      </p>
    </section>

  
    <div class="mb-4 flex items-center justify-between">
      <span class="text-xs uppercase tracking-widest text-[#777] dark:text-[#aaa]">
        Entries
      </span>

      <div class="flex items-center gap-4">
        <button 
            v-if="auth.user?.uid == route.query.uid"
          @click="isAddModalOpen = true"
          class="flex items-center gap-2 text-sm bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg hover:opacity-80 transition shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Entry
        </button>

        <div class="flex items-center bg-[#f0f0f0] dark:bg-[#1a1a1a] rounded-lg p-1">
            <button 
                @click="viewMode = 'list'"
                :class="viewMode === 'list' ? 'bg-white dark:bg-[#333] shadow-sm text-black dark:text-white' : 'text-[#777] hover:text-black dark:hover:text-white'"
                class="p-1.5 rounded-md transition"
                title="List View"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>
            <button 
                @click="viewMode = 'heatmap'"
                :class="viewMode === 'heatmap' ? 'bg-white dark:bg-[#333] shadow-sm text-black dark:text-white' : 'text-[#777] hover:text-black dark:hover:text-white'"
                class="p-1.5 rounded-md transition"
                title="Heatmap View"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 10h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 16h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z" />
                </svg>
            </button>
        </div>
      </div>
    </div>

   
    <div v-if="entriesList && isReady && !forum.loading">
        <template v-if="viewMode === 'list'">
             <div class="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
                <table v-if="entriesList.length > 0" class="min-w-full border-collapse text-xs">
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
                        <th class="px-6 py-3 text-left font-medium text-[#666] dark:text-[#aaa] uppercase tracking-wider text-xs w-10"></th>
                    </tr>
                    </thead>

                    <tbody v-for="(entry, index) in entriesList">
                    <tr
                    
                        class="border-t border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition text-[#121212] dark:text-white align-top"
                    >
                        <td class="px-6 py-4 text-[#666] dark:text-[#aaa]">
                        {{ entry.date?.toDate
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

                        <td class="px-6 py-4 whitespace-nowrap " :class="entry.result >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                        {{entry.result >= 0 ? '+' + entry.result: + entry.result}}%
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
                        <td class="pr-2 py-4 whitespace-nowrap">
                    
                            <button 
                                @click.prevent="removeEntry(Number(index), entry)"
                                class="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition text-[#121212] dark:text-white"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-[#666] dark:text-[#aaa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </td>
                    </tr>
                    </tbody>
                </table>
                <div v-else class="text-center py-12 text-[#666] dark:text-[#aaa]">
                    No entries yet
                </div>
            </div>
        </template>

        <Heatmap v-else-if="viewMode === 'heatmap'" :entriesList="entriesList"/>
    </div>
    <div v-else class="w-36 mx-auto grow min-h-96 my-auto flex items-center justify-center">
            <img src="/logo.svg" class="dark:hidden animate-spin" alt="" />
            <img src="/logo-dark.svg" class="dark:flex hidden animate-spin" alt="" />
    </div>


    <div v-if="isReady && entriesList && entriesList.length > 0" class="mt-8 mb-8">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      
        <div class="bg-[#f5f5f5] dark:bg-[#1a1a1a] p-4 rounded-xl">
             <span class="text-xs text-[#666] dark:text-[#aaa] uppercase tracking-wider block mb-1">Net Return</span>
             <span class="text-2xl font-medium" :class="stats.netResult > 0 ? 'text-emerald-600 dark:text-emerald-400' : (stats.netResult < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[#121212] dark:text-white')">
                {{ stats.netResult > 0 ? '+' : ''}}{{ stats.netResult.toFixed(2) }}%
             </span>
        </div>

      
        <div class="bg-[#f5f5f5] dark:bg-[#1a1a1a] p-4 rounded-xl">
             <span class="text-xs text-[#666] dark:text-[#aaa] uppercase tracking-wider block mb-1">Win Rate</span>
             <span class="text-2xl font-medium text-[#121212] dark:text-white">
                {{ stats.winRate.toFixed(1) }}%
             </span>
        </div>

       
        <div class="bg-[#f5f5f5] dark:bg-[#1a1a1a] p-4 rounded-xl">
             <span class="text-xs text-[#666] dark:text-[#aaa] uppercase tracking-wider block mb-1">Profit Factor</span>
             <span class="text-2xl font-medium text-[#121212] dark:text-white">
                {{ stats.profitFactor.toFixed(2) }}
             </span>
        </div>

        
        <div class="bg-[#f5f5f5] dark:bg-[#1a1a1a] p-4 rounded-xl">
             <span class="text-xs text-[#666] dark:text-[#aaa] uppercase tracking-wider block mb-1">Expectancy</span>
             <span class="text-2xl font-medium" :class="stats.expectancy > 0 ? 'text-emerald-600 dark:text-emerald-400' : (stats.expectancy < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[#121212] dark:text-white')">
                 {{ stats.expectancy > 0 ? '+' : ''}}{{ stats.expectancy.toFixed(2) }}%
             </span>
        </div>
      </div>

       <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div class="p-4 rounded-xl border border-black/5 dark:border-white/5">
                <span class="text-xs text-[#666] dark:text-[#aaa] uppercase tracking-wider block mb-1">Avg Win</span>
                <span class="text-lg font-medium text-emerald-600 dark:text-emerald-400">+{{ stats.avgWin.toFixed(2) }}%</span>
            </div>
             <div class="p-4 rounded-xl border border-black/5 dark:border-white/5">
                <span class="text-xs text-[#666] dark:text-[#aaa] uppercase tracking-wider block mb-1">Avg Loss</span>
                <span class="text-lg font-medium text-rose-600 dark:text-rose-400">{{ stats.avgLoss.toFixed(2) }}%</span>
            </div>
             <div class="p-4 rounded-xl border border-black/5 dark:border-white/5">
                <span class="text-xs text-[#666] dark:text-[#aaa] uppercase tracking-wider block mb-1">Trades</span>
                <span class="text-lg font-medium text-[#121212] dark:text-white">{{ stats.totalTrades }} <span class="text-xs text-[#666] dark:text-[#aaa] font-normal">({{stats.wins}}W - {{stats.losses}}L)</span></span>
            </div>
             <div class="p-4 rounded-xl border border-black/5 dark:border-white/5">
                <span class="text-xs text-[#666] dark:text-[#aaa] uppercase tracking-wider block mb-1">Longs / Shorts</span>
                <span class="text-lg font-medium text-[#121212] dark:text-white">{{ stats.longs }} / {{ stats.shorts }}</span>
            </div>
       </div>
       </div>

       <div class="mt-6 flex justify-center">
            <button 
                @click="isExtendedStatsOpen = !isExtendedStatsOpen"
                class="text-xs text-[#666] dark:text-[#aaa] hover:text-[#121212] dark:hover:text-white underline decoration-dotted transition"
            >
                {{ isExtendedStatsOpen ? 'Hide extended statistics' : 'Show extended statistics' }}
            </button>
        </div>

        <div v-if="isExtendedStatsOpen" class="mt-8 transition-all duration-300">


             <div v-if="quotes" class="mt-6 p-4 rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 dark:from-[#1a1a1a] dark:to-[#151515] border border-black/5 dark:border-white/5">
                <div class="flex items-center justify-between mb-4">
                    <span class="text-xs text-[#666] dark:text-[#aaa] uppercase tracking-wider">Market Comparison (SPX 1Y)</span>
                    <span class="text-xs font-semibold px-2 py-1 rounded bg-black/5 dark:bg-white/10" :class="stats.netResult > quotes.lastYearGrowth ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                        {{ stats.netResult > quotes.lastYearGrowth ? 'Outperforming Market' : 'Underperforming Market' }}
                    </span>
                </div>
                
                 <div class="flex items-center gap-8">
                    <div>
                         <span class="text-[10px] text-[#888] block mb-0.5">Your Net Return</span>
                         <span class="text-2xl font-medium" :class="stats.netResult > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">{{ stats.netResult > 0 ? '+' : ''}}{{ stats.netResult.toFixed(2) }}%</span>
                    </div>
                     <div class="h-8 w-px bg-black/10 dark:bg-white/10"></div>
                     <div>
                         <span class="text-[10px] text-[#888] block mb-0.5">SPX 1Y Return</span>
                         <span class="text-2xl font-medium text-[#121212] dark:text-white">{{ quotes.lastYearGrowth > 0 ? '+' : ''}}{{ quotes.lastYearGrowth }}%</span>
                    </div>
                </div>
             </div>
        </div>
   

    <AddEntryModal />
    <EntryDetailsModal 
        :isOpen="isDetailsModalOpen" 
        :entry="selectedEntry" 
        @close="isDetailsModalOpen = false" 
    />
  </main>
</template>


<script setup lang="ts">
import { ref, onMounted, computed, nextTick, watch } from 'vue';
import { isAddModalOpen, removeDiaryEntry } from '@/widgets/diary/model/useDiary';
import type { DiaryEntry } from '@/entities/diary/model/diary.types';
import AddEntryModal from '@/widgets/diary/ui/AddEntryModal.vue';
import EntryDetailsModal from '@/widgets/diary/ui/EntryDetailsModal.vue';
import { useForumStore } from "~/features/store/useForum";
import { useRoute } from "vue-router";
import { useAuthStore } from '~/entities/user/auth.store';
import Heatmap from '@/widgets/diary/ui/Heatmap.vue';



const forum = useForumStore()
const auth = useAuthStore()

const isReady = ref(false);
const viewMode = ref<'list' | 'heatmap'>('list');
const isExtendedStatsOpen = ref(false);

const route = useRoute();

const selectedEntry = ref<DiaryEntry | null>(null);
const isDetailsModalOpen = ref(false);

const openDetails = (entry: DiaryEntry) => {
    selectedEntry.value = entry;
    isDetailsModalOpen.value = true;
};

const entriesList = computed(() => {
    const uid = route.query.uid;
    if (typeof uid !== 'string') return [];

    return forum.users.get(uid)?.diary || [];
});


const sortedEntries = computed(() => {
    if (!entriesList.value) return [];
    return [...entriesList.value].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateA - dateB;
    });
});

const quotes = computed(() => {
    
    return forum.quotes.get('spx')
});


const stats = computed(() => {
    if (!entriesList.value || entriesList.value.length === 0) {
        return {
            netResult: 0,
            winRate: 0,
            profitFactor: 0,
            expectancy: 0,
            avgWin: 0,
            avgLoss: 0,
            totalTrades: 0,
            wins: 0,
            losses: 0,
            longs: 0,
            shorts: 0,
            bestTrade: 0,
            worstTrade: 0,
            maxDrawdown: 0,
            longWinRate: 0,
            shortWinRate: 0,
            avgHoldingTime: 0
        };
    }

    let netResult = 0;
    let wins = 0;
    let losses = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let longs = 0;
    let shorts = 0;
    let longWins = 0;
    let shortWins = 0;
    let bestTrade = -Infinity;
    let worstTrade = Infinity;
    let peakEquity = 0;
    let maxDrawdown = 0;
    let currentEquity = 0;
    let totalHoldingDays = 0;
    let holdingCount = 0;


    const sorted = sortedEntries.value;

    sorted.forEach((entry: DiaryEntry) => {
        let resultVal = entry.result || 0;

        netResult += resultVal;
        currentEquity += resultVal;

        if (currentEquity > peakEquity) {
            peakEquity = currentEquity;
        }
        const drawdown = peakEquity - currentEquity;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }

        if (resultVal > bestTrade) bestTrade = resultVal;
        if (resultVal < worstTrade) worstTrade = resultVal;

        if (resultVal > 0) {
            wins++;
            grossProfit += resultVal;
            if (entry.side === 'Long') longWins++;
            if (entry.side === 'Short') shortWins++;
        } else if (resultVal < 0) {
            losses++;
            grossLoss += Math.abs(resultVal); 
        }

        if (entry.side === 'Long') longs++;
        if (entry.side === 'Short') shorts++;

        if (entry.date && entry.dateExit) {
            const start = new Date(entry.date).getTime();
            const end = new Date(entry.dateExit).getTime();
            const days = (end - start) / (1000 * 3600 * 24);
            if (days >= 0) {
                totalHoldingDays += days;
                holdingCount++;
            }
        }
    });

    const totalTrades = entriesList.value.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const avgWin = wins > 0 ? grossProfit / wins : 0;
    const avgLoss = losses > 0 ? -1 * (grossLoss / losses) : 0; 

    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : grossProfit / grossLoss;

    const winProb = wins / totalTrades;
    const lossProb = losses / totalTrades;
    const expectancy = (winProb * avgWin) - (lossProb * Math.abs(avgLoss));

    const longWinRate = longs > 0 ? (longWins / longs) * 100 : 0;
    const shortWinRate = shorts > 0 ? (shortWins / shorts) * 100 : 0;
    const avgHoldingTime = holdingCount > 0 ? totalHoldingDays / holdingCount : 0;

    if (bestTrade === -Infinity) bestTrade = 0;
    if (worstTrade === Infinity) worstTrade = 0;

    return {
        netResult,
        winRate,
        profitFactor,
        expectancy,
        avgWin,
        avgLoss,
        totalTrades,
        wins,
        losses,
        longs,
        shorts,
        bestTrade,
        worstTrade,
        maxDrawdown,
        longWinRate,
        shortWinRate,
        avgHoldingTime
    };
});


watch(
  () => route.query.uid,
  async (uid) => {
    if (typeof uid === "string") {
      isReady.value = false;

      await forum.fetchUser(uid);
      await forum.fetchQuotes();

      isReady.value = true;
    }
  },
  { immediate: true }
);



const removeEntry = async (entryId: number, entry: DiaryEntry) => {
    const uid = route.query.uid;
    if (typeof uid !== 'string' || auth.user?.uid !== uid) {
        return;
    }
    await removeDiaryEntry(entry, auth.user?.uid as string, uid);
    forum.removeDiaryEntry(uid, entryId);
}

function addMockData(entry: DiaryEntry){
    forum.addDiaryEntry(route.query.uid as string, entry);
}
</script>
