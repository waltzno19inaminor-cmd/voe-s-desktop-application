<template>
  <div class="halo-blade-container overflow-hidden">
    <div 
      class="flex items-center bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.4)] transition-all duration-500 overflow-hidden"
      :class="isSubmitting ? 'opacity-50 pointer-events-none' : 'opacity-100'"
    >
      <!-- Tactical Module Switcher (Sidebar) -->
      <div class="flex flex-col border-r border-white/5 bg-white/[0.02]">
          <button 
            v-for="mod in modules" 
            :key="mod.id"
            @click="activeModule = mod.id"
            class="p-3 transition-colors duration-300 relative group"
            :class="activeModule === mod.id ? 'text-emerald-500' : 'text-white/20 hover:text-white/40'"
            :title="mod.label"
          >
            <!-- Optimized Static Icon -->
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="mod.path" />
            </svg>
            <div v-if="activeModule === mod.id" class="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-emerald-500 rounded-r-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          </button>
      </div>

      <!-- Main Input Blade -->
      <div class="flex items-center gap-5 px-6 h-14 min-w-[520px]">
        
        <!-- MODULE 1: CORE -->
        <template v-if="activeModule === 'core'">
          <div class="flex items-center gap-3">
            <span class="text-[8px] uppercase tracking-[0.2em] text-white/20 font-black">Asset</span>
            <input 
              v-model="newEntry.asset"
              type="text"
              placeholder="BTCUSD"
              class="bg-transparent border-none p-0 text-xs text-white font-bold placeholder:text-white/10 focus:ring-0 w-24 tracking-tight"
              @keyup.enter="handleQuickSave"
            />
          </div>

          <div class="w-px h-4 bg-white/5"></div>

          <div class="flex items-center gap-2">
            <button 
              v-for="side in ['Long', 'Short']" 
              :key="side"
              @click="newEntry.side = side as any"
              class="text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg transition-all duration-300 border font-bold"
              :class="newEntry.side === side 
                ? (side === 'Long' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/20 border-rose-500/40 text-rose-400')
                : 'border-transparent text-white/20 hover:text-white/40'"
            >
              {{ side }}
            </button>
          </div>

          <div class="w-px h-4 bg-white/5"></div>

          <div class="flex items-center gap-3">
            <span class="text-[8px] uppercase tracking-[0.2em] text-white/20 font-black">Entry</span>
            <input 
              v-model.number="newEntry.entry"
              type="number"
              step="any"
              class="bg-transparent border-none p-0 text-xs text-white font-bold focus:ring-0 w-24 hide-spinners font-mono"
              @keyup.enter="handleQuickSave"
            />
          </div>
          
          <div class="w-px h-4 bg-white/5"></div>

          <div class="flex items-center gap-3">
            <span class="text-[8px] uppercase tracking-[0.2em] text-white/20 font-black">Size</span>
            <input 
              v-model.number="newEntry.size"
              type="number"
              step="0.01"
              class="bg-transparent border-none p-0 text-xs text-white font-bold focus:ring-0 w-16 hide-spinners font-mono"
              @keyup.enter="handleQuickSave"
            />
          </div>
        </template>

        <!-- MODULE 2: RISK -->
        <template v-else-if="activeModule === 'risk'">
          <div class="flex items-center gap-3">
            <span class="text-[8px] uppercase tracking-[0.2em] text-rose-500/40 font-black">Stop Loss</span>
            <input 
              v-model.number="newEntry.stopLoss"
              type="number"
              step="any"
              placeholder="0.0000"
              class="bg-transparent border-none p-0 text-xs text-white font-bold placeholder:text-white/5 focus:ring-0 w-28 font-mono"
              @keyup.enter="handleQuickSave"
            />
          </div>

          <div class="w-px h-4 bg-white/5"></div>

          <div class="flex items-center gap-3">
            <span class="text-[8px] uppercase tracking-[0.2em] text-emerald-500/40 font-black">Take Profit</span>
            <input 
              v-model.number="newEntry.takeProfit"
              type="number"
              step="any"
              placeholder="0.0000"
              class="bg-transparent border-none p-0 text-xs text-white font-bold placeholder:text-white/5 focus:ring-0 w-28 font-mono"
            />
          </div>
        </template>

        <!-- MODULE 3: CONTEXT -->
        <template v-else-if="activeModule === 'context'">
          <div class="flex items-center gap-3 flex-1 overflow-hidden">
             <span class="text-[8px] uppercase tracking-[0.2em] text-white/20 font-black shrink-0">Strategy</span>
             <select 
               v-model="newEntry.strategyId"
               class="bg-transparent border-none p-0 text-[10px] text-white font-bold uppercase tracking-widest focus:ring-0 w-full truncate"
             >
               <option :value="undefined">No Strategy</option>
               <option v-for="strat in strategyOptions" :key="strat.id" :value="strat.id">{{ strat.name }}</option>
             </select>
          </div>

          <div class="w-[1px] h-4 bg-white/5"></div>

          <div class="flex items-center gap-3 flex-1 overflow-hidden">
            <span class="text-[8px] uppercase tracking-[0.2em] text-white/20 font-black shrink-0">Note</span>
            <input 
              v-model="newEntry.notes"
              type="text"
              placeholder="Tactical context..."
              class="bg-transparent border-none p-0 text-xs text-white placeholder:text-white/5 focus:ring-0 w-full italic font-serif"
              @keyup.enter="handleQuickSave"
            />
          </div>
        </template>

        <!-- Submit Action -->
        <button 
          @click="handleQuickSave"
          type="button"
          class="ml-auto w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all duration-500 group flex-shrink-0"
          :disabled="!isReadyToSave"
        >
          <svg v-if="!isSubmitting" class="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <div v-else class="w-4 h-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { newEntry, addDiaryEntry, resetEntry, isSubmitting, strategyOptions } from '@/widgets/diary/model/useDiary';
import { useAuthStore } from '~/entities/user/auth.store';
import { useRoute } from 'vue-router';

// Simple Icon SVG Component
const IconRenderer = (props: { path: string }) => {
  return {
    template: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="path" /></svg>`,
    props: ['path']
  };
};

const auth = useAuthStore();
const route = useRoute();
const emit = defineEmits(['success']);

const activeModule = ref<'core' | 'risk' | 'context'>('core');

const modules = [
  { id: 'core', label: 'Core Parameters', path: "M4 6h16M4 12h16M4 18h16" },
  { id: 'risk', label: 'Risk Management', path: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  { id: 'context', label: 'Narrative & Strategy', path: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
] as const;

const isReadyToSave = computed(() => {
    return !!newEntry.value.asset && (newEntry.value.entry ?? 0) > 0 && (newEntry.value.size ?? 0) > 0;
});

const handleQuickSave = async () => {
    if (!isReadyToSave.value || isSubmitting.value) return;
    
    const uid = route.query.uid as string;
    const authorId = auth.user?.uid;

    if (!authorId || authorId !== uid) {
        console.warn('[HaloBlade] Unauthorized quick entry attempt');
        return;
    }

    try {
        await addDiaryEntry(newEntry.value, authorId, uid);
        emit('success');
        resetEntry();
        activeModule.value = 'core'; // Reset to core for next entry
    } catch (e) {
        console.error('[HaloBlade] Persistent Quick Entry failed', e);
    }
};
</script>

<style scoped>
.hide-spinners::-webkit-outer-spin-button,
.hide-spinners::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.hide-spinners {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
