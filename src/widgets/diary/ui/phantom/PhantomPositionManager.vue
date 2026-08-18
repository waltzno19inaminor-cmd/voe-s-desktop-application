<template>
  <div class="phantom-position-manager w-[720px] bg-black/40 backdrop-blur-3xl border border-white/5 rounded-2xl shadow-[0_64px_128px_-32px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col transition-all duration-700 hover:border-white/10">
    <!-- Header -->
    <div class="px-8 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div class="flex flex-col">
          <span class="text-[10px] uppercase tracking-[0.6em] font-black text-white/80">Position Architect</span>
          <span class="text-[7px] uppercase tracking-widest text-white/20 font-mono italic">Operational Leg Synchronization</span>
        </div>
      </div>
      
      <div class="flex items-center gap-6">
        <div class="flex flex-col items-end">
          <span class="text-[8px] uppercase tracking-widest text-white/20 font-black mb-1">Exposure</span>
          <span class="text-xl font-mono text-white font-bold tracking-tighter">{{ totalSize.toFixed(2) }} <span class="text-[10px] opacity-40">L</span></span>
        </div>
        <div class="w-px h-10 bg-white/5"></div>
        <div class="flex flex-col items-end">
          <span class="text-[8px] uppercase tracking-widest text-white/20 font-black mb-1">Entry Average</span>
          <span class="text-xl font-mono text-emerald-400 font-bold tracking-tighter">{{ avgEntry.toFixed(5) }}</span>
        </div>
        <div class="w-px h-10 bg-white/5"></div>
        <div class="flex flex-col items-end">
          <span class="text-[8px] uppercase tracking-widest text-white/20 font-black mb-1">Direction</span>
          <span class="text-[10px] font-mono font-bold tracking-widest" :class="isLong ? 'text-emerald-500' : 'text-rose-500'">
            {{ isLong ? 'DOMINANT LONG' : 'DOMINANT SHORT' }}
          </span>
        </div>
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden min-h-[380px]">
      <!-- Left: Planning Area -->
      <div class="flex-1 p-6 border-r border-white/5 flex flex-col gap-6">
        
        <!-- Protocol Selection (Step 1) -->
        <div class="flex flex-col gap-2">
           <label class="text-[8px] uppercase tracking-widest text-white/20 font-black px-2">Operational Protocol</label>
           <div class="flex gap-2 p-1 rounded-xl bg-white/[0.02] border border-white/5">
              <button 
                v-for="m in methods" 
                :key="m.id"
                @click="selectedMethod = m.id"
                :disabled="lockedMethod && lockedMethod !== m.id && m.id !== 'exit'"
                class="flex-1 flex flex-col items-center py-3 rounded-lg border transition-all duration-300 relative overflow-hidden group disabled:opacity-20 disabled:grayscale"
                :class="selectedMethod === m.id ? 'bg-white border-white text-black shadow-lg' : 'bg-transparent border-transparent text-white/40 hover:bg-white/5'"
              >
                 <div class="flex items-center gap-1.5 z-10">
                    <span class="text-[10px] uppercase tracking-[0.3em] font-black leading-none">{{ m.label }}</span>
                    <svg v-if="lockedMethod && lockedMethod !== m.id && m.id !== 'exit'" class="w-2.5 h-2.5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor font-black">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                 </div>
                 <span class="text-[6px] uppercase tracking-widest font-mono italic z-10 opacity-60 mt-0.5">
                    {{ lockedMethod && lockedMethod !== m.id && m.id !== 'exit' ? 'PROTOCOL_LOCKED' : m.desc }}
                 </span>
                 <div v-if="selectedMethod === m.id" class="absolute inset-0 bg-white opacity-10 animate-pulse"></div>
              </button>
           </div>
        </div>

        <!-- Input Layer (Step 2) -->
        <div class="flex flex-col gap-6">
           <div class="grid grid-cols-2 gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div class="flex flex-col gap-1.5">
                 <label class="text-[8px] uppercase tracking-widest text-white/20 font-black">Execution Price</label>
                 <div class="relative">
                   <input 
                     v-model.number="inputPrice"
                     type="number"
                     step="any"
                     class="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-xs text-white font-mono placeholder:text-white/5 focus:outline-none focus:border-white/20 transition-all"
                     placeholder="0.00000"
                   />
                   <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                      <span v-if="priceDelta !== 0" class="text-[10px] font-mono" :class="priceDelta > 0 ? 'text-emerald-500' : 'text-rose-500'">
                         {{ priceDelta > 0 ? '+' : '' }}{{ priceDelta.toFixed(5) }}
                      </span>
                   </div>
                 </div>
              </div>
              <div class="flex flex-col gap-1.5">
                 <label class="text-[8px] uppercase tracking-widest text-white/20 font-black">Quantity (Lots)</label>
                 <div class="relative flex items-center">
                    <input 
                    v-model.number="inputSize"
                    type="number"
                    step="0.01"
                    class="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-xs text-white font-mono placeholder:text-white/5 focus:outline-none focus:border-white/20 transition-all"
                    placeholder="0.00"
                    />
                    <button 
                        v-if="selectedMethod === 'exit' && totalSize > 0"
                        @click="inputSize = totalSize"
                        class="absolute right-2 px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-[7px] uppercase font-black text-white/40 hover:text-white hover:bg-white/20 transition-all"
                    >
                        MAX
                    </button>
                 </div>
              </div>
           </div>

           <!-- Validation Monitor -->
           <div 
             class="p-4 rounded-xl border transition-all duration-500 flex items-center gap-4 overflow-hidden relative min-h-[56px]"
             :class="validation.isValid ? 'bg-emerald-500/[0.03] border-emerald-500/10' : (inputPrice || inputSize ? 'bg-rose-500/[0.05] border-rose-500/20 shake' : 'bg-white/[0.02] border-white/5')"
           >
              <div class="w-7 h-7 rounded-full border flex items-center justify-center shrink-0" :class="validation.isValid ? 'border-emerald-500/40 text-emerald-400' : 'border-rose-500/40 text-rose-400'">
                 <svg v-if="validation.isValid" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                 <svg v-else class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div class="flex flex-col">
                 <span class="text-[7px] uppercase tracking-[0.3em] font-black" :class="validation.isValid ? 'text-emerald-500/60' : 'text-rose-500/60'">
                    Protocol Verification
                 </span>
                 <span class="text-[9px] font-mono font-bold tracking-tight py-0.5 leading-none" :class="validation.isValid ? 'text-white' : 'text-rose-400'">
                    {{ validation.message }}
                 </span>
              </div>
              <div v-if="!validation.isValid && (inputPrice || inputSize)" class="absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/5 to-transparent animate-scan"></div>
           </div>

           <!-- Execute Button -->
           <button 
              @click="handleAddLeg"
              :disabled="!validation.isValid"
              class="w-full py-4 rounded-xl bg-white text-black transition-all duration-500 disabled:opacity-5 disabled:grayscale overflow-hidden relative group"
           >
              <div class="absolute inset-0 bg-emerald-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
              <span class="text-[10px] uppercase tracking-[0.4em] font-black relative z-10">Synchronize Leg</span>
           </button>
        </div>
      </div>

      <!-- Right: Chronicle -->
      <div class="w-[260px] bg-white/[0.01] flex flex-col">
        <div class="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
           <span class="text-[9px] uppercase tracking-[0.3em] font-black text-white/40">Chronicle</span>
           <span class="text-[7px] font-mono text-white/20">{{ legs.length }} LEGS</span>
        </div>
        <div class="flex-1 overflow-y-auto custom-scrollbar p-1">
           <div 
             v-for="(leg, idx) in legs" 
             :key="leg.id"
             class="group relative p-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
           >
              <div 
                class="absolute left-0 top-0 bottom-0 w-[2px] transition-all"
                :class="leg.type === 'entry' ? (isLong ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-blue-500'"
              ></div>
              
              <div class="flex justify-between items-start mb-1.5">
                 <div class="flex flex-col">
                    <span class="text-[8px] uppercase tracking-widest font-black" :class="leg.type === 'entry' ? (isLong ? 'text-emerald-400' : 'text-rose-400') : 'text-blue-400'">
                       {{ leg.label || `${leg.type.toUpperCase()}` }}
                    </span>
                    <span class="text-[6px] font-mono text-white/10 uppercase">{{ new Date(leg.date).toLocaleTimeString() }}</span>
                 </div>
                 <button @click="removeLeg(idx)" class="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity p-1">
                    <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              
              <div class="flex justify-between items-end">
                 <span class="text-xs font-mono text-white/60 font-bold tracking-tighter">{{ leg.price.toFixed(5) }}</span>
                 <span class="text-[10px] font-mono text-white/40">{{ leg.size.toFixed(2) }} <span class="text-[6px] opacity-40">L</span></span>
              </div>
           </div>
           
           <div v-if="legs.length === 0" class="flex flex-col items-center justify-center py-24 opacity-20 p-8 text-center">
              <svg class="w-8 h-8 text-white mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor opacity-20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p class="text-[8px] uppercase tracking-[0.3em] font-black leading-relaxed">Registry Purged</p>
           </div>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="p-3 border-t border-white/5 bg-black/40 flex justify-center">
       <button @click="isPositionManagerOpen = false" class="text-[8px] uppercase tracking-[0.5em] font-black text-white/20 hover:text-white transition-colors">
          Return to Hub
       </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { newEntry, isPositionManagerOpen } from '@/widgets/diary/model/useDiary';
import type { Execution } from '@/entities/diary/model/diary.types';

const methods = [
   { id: 'pyramid', label: 'Pyramiding', desc: 'Growth' },
   { id: 'average', label: 'Averaging', desc: 'Balancing' },
   { id: 'exit', label: 'Partial Exit', desc: 'Extraction' },
] as const;

type MethodType = typeof methods[number]['id'] | 'initial';

const legs = computed(() => newEntry.value.executions || []);
const isLong = computed(() => (newEntry.value.side || 'Long') === 'Long');
const selectedMethod = ref<MethodType>('pyramid');

const lockedMethod = computed<MethodType | null>(() => {
   if (legs.value.some(l => l.label?.toLowerCase().includes('pyramid'))) return 'pyramid';
   if (legs.value.some(l => l.label?.toLowerCase().includes('averaging'))) return 'average';
   return null;
});

const inputPrice = ref<number | undefined>();
const inputSize = ref<number | undefined>();

// Initial entry fallback
watch([legs, isPositionManagerOpen], () => {
   if (legs.value.length === 0 && selectedMethod.value !== 'initial') {
      selectedMethod.value = 'initial';
   } else if (legs.value.length > 0 && selectedMethod.value === 'initial') {
      selectedMethod.value = 'pyramid';
   }
}, { immediate: true });

const priceDelta = computed(() => {
    if (inputPrice.value === undefined || avgEntry.value === 0) return 0;
    return inputPrice.value - avgEntry.value;
});

const validation = computed(() => {
    if (!inputPrice.value || !inputSize.value) return { isValid: false, message: 'PENDING: Awaiting Input' };

    // Method Locking Check
    if (lockedMethod.value && lockedMethod.value !== selectedMethod.value && selectedMethod.value !== 'exit') {
       return { isValid: false, message: `RESTRICTED: Locked to ${lockedMethod.value.toUpperCase()}` };
    }

    // Initial leg has no avg entry yet, skip validation
    if (selectedMethod.value === 'initial') return { isValid: true, message: 'VALID: Initial Position Anchor' };

    if (selectedMethod.value === 'exit') {
       if (inputSize.value > totalSize.value) return { isValid: false, message: `ERROR: Exceeds Available [${totalSize.value.toFixed(2)}]` };
       if (inputSize.value <= 0) return { isValid: false, message: 'ERROR: Volume Must Be Positive' };
       return { isValid: true, message: 'VALID: Capital Retrieval Operational' };
    }

    if (selectedMethod.value === 'pyramid') {
       if (isLong.value && inputPrice.value <= avgEntry.value) return { isValid: false, message: 'ERROR: Price Must Be HIGHER' };
       if (!isLong.value && inputPrice.value >= avgEntry.value) return { isValid: false, message: 'ERROR: Price Must Be LOWER' };
       return { isValid: true, message: 'VALID: Growth Protocol Alignment' };
    }

    if (selectedMethod.value === 'average') {
       if (isLong.value && inputPrice.value >= avgEntry.value) return { isValid: false, message: 'ERROR: Price Must Be LOWER' };
       if (!isLong.value && inputPrice.value <= avgEntry.value) return { isValid: false, message: 'ERROR: Price Must Be HIGHER' };
       return { isValid: true, message: 'VALID: Drawdown Mitigation' };
    }

    return { isValid: false, message: 'ERROR: Constraint Violation' };
});

const handleAddLeg = () => {
    if (!validation.value.isValid || !inputPrice.value || !inputSize.value) return;

    if (!newEntry.value.executions) newEntry.value.executions = [];

    let legLabel = '';
    let legType: 'entry' | 'exit' = 'entry';
    let legSide = isLong.value ? 'Long' : 'Short';

    if (selectedMethod.value === 'initial') {
        legLabel = 'Initial Position';
    } else if (selectedMethod.value === 'exit') {
        legType = 'exit';
        legSide = 'Close' as any;
        legLabel = 'Partial Exit';
    } else if (selectedMethod.value === 'pyramid') {
        const pyramidCount = legs.value.filter(l => l.label?.toLowerCase().includes('pyramid')).length;
        legLabel = `Pyramid #${pyramidCount + 1}`;
    } else if (selectedMethod.value === 'average') {
        legLabel = isLong.value ? 'Averaging Down' : 'Averaging Up';
    }

    newEntry.value.executions.push({
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        type: legType,
        side: legSide as any,
        price: inputPrice.value,
        size: inputSize.value,
        date: new Date(),
        label: legLabel
    });

    inputSize.value = undefined;
};

const removeLeg = (index: number) => {
    newEntry.value.executions?.splice(index, 1);
};

// CALCULATIONS
const totalSize = computed(() => {
    const entrySize = legs.value.filter(l => l.type === 'entry').reduce((acc, l) => acc + l.size, 0);
    const exitSize = legs.value.filter(l => l.type === 'exit').reduce((acc, l) => acc + l.size, 0);
    const rawSize = entrySize - exitSize;
    return rawSize < 0.000001 ? 0 : rawSize;
});

const avgEntry = computed(() => {
    const entryLegs = legs.value.filter(l => l.type === 'entry');
    if (entryLegs.length === 0) return 0;
    const totalWeight = entryLegs.reduce((acc, l) => acc + (l.price * l.size), 0);
    const totalVol = entryLegs.reduce((acc, l) => acc + l.size, 0);
    return totalVol > 0 ? totalWeight / totalVol : 0;
});

const avgExit = computed(() => {
    const exitLegs = legs.value.filter(l => l.type === 'exit');
    if (exitLegs.length === 0) return 0;
    const totalWeight = exitLegs.reduce((acc, l) => acc + (l.price * l.size), 0);
    const totalVol = exitLegs.reduce((acc, l) => acc + l.size, 0);
    return totalVol > 0 ? totalWeight / totalVol : 0;
});

// SYNC WITH MAIN ENTRY
watch([avgEntry, avgExit, totalSize], () => {
    if (legs.value.some(l => l.type === 'entry')) {
        newEntry.value.entry = avgEntry.value;
        newEntry.value.size = totalSize.value;
    }
    if (legs.value.some(l => l.type === 'exit')) {
        newEntry.value.exit = avgExit.value;
        if (!newEntry.value.dateExit) newEntry.value.dateExit = new Date();
    }
}, { immediate: true });

// Auto-fill from current entry if empty
watch(() => isPositionManagerOpen.value, (isOpen) => {
    if (isOpen && legs.value.length === 0) {
        if (newEntry.value.entry && newEntry.value.size) {
            inputPrice.value = newEntry.value.entry;
            inputSize.value = newEntry.value.size;
        }
    }
});

</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 3px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}

.shake {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}

@keyframes scan {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}
.animate-scan {
  animation: scan 2s linear infinite;
}
</style>
