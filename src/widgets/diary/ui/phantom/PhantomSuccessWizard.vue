<template>
  <div class="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-10 pointer-events-none perspective-[2000px]">
    <!-- Minimal Blur for Performance -->
    <div class="absolute inset-0 bg-[#020202]/95 backdrop-blur-[8px] transition-opacity duration-[300ms]"></div>
    
    <!-- Deep Environmental Glows -->
    <div class="absolute top-0 right-0 w-1/2 h-[50vh] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>
    <div class="absolute bottom-0 left-0 w-1/2 h-[50vh] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" :class="{ 'bg-rose-500/5': lastTradeProfit < 0 }"></div>

    <div 
      class="neo-obsidian-card relative w-full max-w-6xl pointer-events-auto flex flex-col items-stretch justify-between"
      style="min-height: 70vh;"
    >
      <!-- Structural Header -->
      <div class="flex items-center justify-between z-20 w-full mb-12 lg:mb-20">
         <div class="flex flex-col">
            <h2 class="text-white/30 font-mono text-[9px] tracking-[0.4em] uppercase mb-1 drop-shadow-md">
               {{ currentStep === 'financials' ? 'Phantom Protocol / Phase I' : 'Phantom Protocol / Phase II' }}
            </h2>
            <h1 class="text-white font-serif text-2xl tracking-widest uppercase font-light">
               {{ currentStep === 'financials' ? 'Capital Trajectory' : 'Psychological Footprint' }}
            </h1>
         </div>
         
         <button @click="$emit('close')" class="w-14 h-14 flex items-center justify-center rounded-full bg-white/[0.02] hover:bg-white/[0.08] transition-all duration-500 transform active:scale-90 text-white/30 hover:text-white border border-white/[0.05] shadow-2xl backdrop-blur-xl">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
         </button>
      </div>

      <Transition name="massive-slide" mode="out-in">
        
        <!-- ======================= STEP 1: PURE FINANCIALS ======================= -->
        <div v-if="currentStep === 'financials'" class="flex-1 flex flex-col relative z-20 w-full h-full">
           
           <!-- Massive Liquidity Display -->
           <div class="flex flex-col items-center justify-center text-center mt-4 mb-20 relative z-20">
              <span class="absolute -top-10 text-white/20 font-black tracking-[0.8em] text-[10px] uppercase w-full text-center">Net Liquidity</span>
              
              <div class="relative inline-block mt-4">
                 <h1 class="text-7xl sm:text-8xl lg:text-[140px] font-thin text-white tracking-tighter tabular-nums leading-none">
                    <span class="text-4xl lg:text-7xl text-white/20 font-serif translate-y-[-20px] lg:translate-y-[-40px] inline-block mr-2">$</span>
                    <span class="font-serif drop-shadow-[0_0_80px_rgba(255,255,255,0.15)]">
                      {{ animatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                    </span>
                 </h1>
              </div>

              <!-- PnL Badge -->
              <div class="mt-8 transition-all duration-1000" :style="{ opacity: balanceAnimationComplete ? 1 : 0, transform: balanceAnimationComplete ? 'translateY(0)' : 'translateY(20px)' }">
                <div 
                   class="inline-flex items-center gap-3 px-6 py-2 rounded-full border shadow-[0_0_60px_rgba(0,0,0,0.6)] backdrop-blur-3xl transition-all duration-500 bg-[#050505]/85"
                   :class="lastTradeProfit >= 0 ? 'border-emerald-500/30 text-emerald-400' : 'border-rose-500/30 text-rose-400'">
                   <span class="text-[8px] uppercase tracking-[0.3em] font-black opacity-80">Session Result</span>
                   <div class="w-px h-3 bg-white/20 mx-2"></div>
                   <div class="w-5 h-5 rounded-full flex items-center justify-center" :class="lastTradeProfit >= 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'">
                     <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" :class="{ 'rotate-180': lastTradeProfit < 0 }">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                     </svg>
                   </div>
                   <span class="font-bold tracking-[0.15em] text-lg font-mono drop-shadow-[0_0_10px_currentColor]">{{ lastTradeProfit >= 0 ? '+' : '' }}${{ Math.abs(lastTradeProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                </div>
              </div>
           </div>

           <!-- Frameless Fluid Chart (Optimized Vertical Footprint) -->
           <div 
              class="absolute bottom-24 left-0 right-0 h-[140px] lg:h-[200px] pointer-events-none z-0 will-change-transform"
              style="mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent); filter: drop-shadow(0 0 20px rgba(255,255,255,0.15));"
           >
               <svg class="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="glowGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.2"/>
                      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
                    </linearGradient>
                  </defs>
                  
                  <path 
                    v-if="areaPath"
                    :d="areaPath" 
                    fill="url(#glowGradient)" 
                    class="area-path-anim"
                  />
                  <path 
                    v-if="linePath"
                    :d="linePath" 
                    fill="none" 
                    stroke="#ffffff" 
                    stroke-width="1.5" 
                    stroke-linecap="round"
                    class="line-path-anim opacity-80"
                    pathLength="1"
                  />
               </svg>
           </div>

           <!-- Navigation Trigger -->
           <div class="mt-auto flex justify-center z-20 pb-8 relative">
              <button 
                @click="currentStep = 'psychology'" 
                class="group flex items-center gap-6 px-10 py-5 bg-white text-[#050505] font-black tracking-[0.3em] uppercase text-[10px] rounded-full hover:scale-[1.02] active:scale-95 transition-all duration-700 shadow-[0_0_60px_rgba(255,255,255,0.4)] hover:shadow-[0_0_100px_rgba(255,255,255,0.7)]"
              >
                 Initialize Diagnostic
                 <div class="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                    <svg class="w-4 h-4 transition-transform duration-700 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                 </div>
              </button>
           </div>
        </div>

        <!-- ======================= STEP 2: PSYCHOLOGY (SIMPLIFIED EMOJI) ======================= -->
        <div v-else class="flex-1 flex flex-col justify-center items-center w-full z-20">
           
           <div class="w-full max-w-5xl flex flex-col items-center justify-center flex-1">
               
              <!-- Phase Telemetry Rail -->
              <div class="flex items-center justify-center gap-16 mb-20 w-full">
                 <div v-for="phase in (['Entry', 'During', 'Exit'] as const)" :key="phase" class="flex flex-col items-center gap-4 group">
                    <div class="flex flex-col items-center">
                       <span class="text-[7px] font-black uppercase tracking-[0.4em] text-white/20 mb-3 group-hover:text-white/40 transition-colors">{{ phase }} Protocol</span>
                       <div class="w-12 h-12 flex items-center justify-center rounded-sm bg-white/[0.03] border border-white/5 shadow-inner transition-all duration-700 group-hover:border-white/20 group-hover:scale-110">
                          <svg 
                            class="w-7 h-7 stroke-[1.5]"
                            :class="getStageStability(phase.toLowerCase()).color" 
                            fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"
                          >
                             <g v-html="getFacePathForStatus(getStageStability(phase.toLowerCase()).status)"></g>
                          </svg>
                       </div>
                    </div>
                    <span class="text-[9px] font-serif uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100 transition-opacity" :class="getStageStability(phase.toLowerCase()).color">
                       {{ getStageStability(phase.toLowerCase()).status }}
                    </span>
                 </div>
              </div>
               
              <div class="flex flex-col items-center justify-center text-center">
                 <span class="text-white/20 font-black tracking-[1em] text-[10px] uppercase mb-16 text-center">Standard Atmospheric Pressure</span>
                 
                 <!-- Large Emoji Face -->
                 <div class="h-48 w-48 mb-10 flex items-center justify-center relative">
                    <svg 
                      class="w-full h-full transition-all duration-1000 stroke-[1.5] drop-shadow-[0_0_30px_currentColor]"
                      :class="stabilityColor.text" 
                      fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"
                    >
                       <g v-html="currentFacePaths"></g>
                    </svg>
                 </div>

                 <div class="flex flex-col items-center gap-6">
                    <h3 class="text-4xl font-serif tracking-[0.3em] uppercase transition-all duration-700" :class="stabilityColor.text">
                       {{ stabilityProfile.status }}
                    </h3>
                    
                    <div class="flex items-center gap-3 px-5 py-2 rounded-full bg-white/[0.02] border border-white/[0.05] shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] backdrop-blur-md transition-all duration-500">
                       <span class="text-[9px] uppercase tracking-[0.3em] text-white/30 font-black">Net Shift</span>
                       <div class="w-px h-3 bg-white/10"></div>
                       <span 
                         class="font-mono text-xs font-bold"
                         :class="stabilityScoreDelta === 0 ? 'text-white/40' : stabilityScoreDelta > 0 ? 'text-emerald-400' : 'text-rose-400'"
                       >
                          {{ stabilityScoreDelta > 0 ? '+' : '' }}{{ stabilityScoreDelta.toFixed(2) }}
                       </span>
                    </div>
                 </div>
              </div>

           </div>

           <!-- Action Row -->
           <div class="mt-auto flex w-full max-w-4xl justify-between items-end pb-8 relative z-20">
              <button 
                @click="currentStep = 'financials'" 
                class="group flex items-center gap-4 px-6 py-4 text-white/40 font-black tracking-[0.2em] uppercase text-[9px] rounded-full hover:text-white transition-all"
              >
                 <svg class="w-4 h-4 transition-transform duration-500 group-hover:-translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                 Return Segment
              </button>
              
              <button 
                @click="$emit('close')" 
                class="group relative flex items-center gap-4 px-12 py-5 bg-emerald-500 text-black font-black tracking-[0.3em] uppercase text-[11px] rounded-full hover:scale-[1.02] active:scale-95 transition-all duration-700 shadow-[0_0_60px_rgba(16,185,129,0.5)] hover:shadow-[0_0_100px_rgba(16,185,129,0.8)]"
              >
                 Finalize Deployment
                 <div class="absolute inset-0 rounded-full border border-white/40 scale-105 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-700 pointer-events-none"></div>
              </button>
           </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface SuccessProps {
  stats: any;
  entries: any[]; 
  initialDeposit?: number; 
}

const props = defineProps<SuccessProps>();
const emit = defineEmits(['close']);

const isVisible = ref(true);
const currentStep = ref<'financials' | 'psychology'>('financials');

interface PointData {
  x: number;
  y: number;
  balance: number;
}

const computedEntries = computed(() => {
  if (!props.entries) return [];
  
  const sorted = [...props.entries].sort((a, b) => {
    const dA = a.date ? new Date(a.date).getTime() : 0;
    const dB = b.date ? new Date(b.date).getTime() : 0;
    return dA - dB;
  });

  let currentDeposit = props.initialDeposit || 10000;
  const history: { balance: number, profit: number }[] = [];
  
  history.push({ balance: currentDeposit, profit: 0 });

  sorted.forEach(e => {
    let profit = 0;
    if (e.profitInCurrency !== undefined && e.profitInCurrency !== null) {
       profit = e.profitInCurrency;
    } else {
       const percentage = e.result || 0;
       profit = currentDeposit * (percentage / 100);
    }
    
    currentDeposit += profit;
    history.push({ balance: currentDeposit, profit: profit });
  });
  
  return history;
});

const finalBalance = computed(() => {
  const arr = computedEntries.value;
  return arr.length > 0 ? (arr[arr.length - 1]?.balance ?? (props.initialDeposit || 10000)) : (props.initialDeposit || 10000);
});

const lastTradeProfit = computed(() => {
  const arr = computedEntries.value;
  return arr.length > 1 ? (arr[arr.length - 1]?.profit ?? 0) : 0;
});

const lastTradeEmotions = computed(() => {
  if (!props.entries || props.entries.length === 0) return [];
  const lastEntry = props.entries[props.entries.length - 1];
  return lastEntry?.emotions || [];
});

const animatedBalance = ref(props.initialDeposit || 10000);
const balanceAnimationComplete = ref(false);

onMounted(() => {
   const arr = computedEntries.value;
   let start = props.initialDeposit || 10000;
   if (arr.length > 1) start = arr[arr.length - 2]?.balance ?? start; 
   
   const end = finalBalance.value;
   const duration = 2500; 
   const startTime = performance.now();
   
   animatedBalance.value = start;
   
   const step = (currentTime: number) => {
     const elapsed = currentTime - startTime;
     const progress = Math.min(elapsed / duration, 1);
     
     const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
     animatedBalance.value = start + (end - start) * easeProgress;
     
     if (progress < 1) {
       requestAnimationFrame(step);
     } else {
       animatedBalance.value = end;
       balanceAnimationComplete.value = true;
     }
   };
   
   setTimeout(() => requestAnimationFrame(step), 600); 
});

const points = computed<PointData[]>(() => {
  let data = computedEntries.value;
  if (data.length < 2) return [];

  // Optimization: Decimate data if set is too large (Cap at ~120 points for fluid SVG performance)
  if (data.length > 120) {
    const step = Math.ceil(data.length / 120);
    const decimated: typeof data = [];
    for (let i = 0; i < data.length; i += step) {
      const point = data[i];
      if (point) decimated.push(point);
    }
    // Always include the last point to ensure accurate final balance representation
    const lastPoint = data[data.length - 1];
    if (lastPoint && decimated[decimated.length - 1] !== lastPoint) {
        decimated.push(lastPoint);
    }
    data = decimated;
  }

  const balances = data.map(d => d.balance);
  const minB = Math.min(...balances);
  const maxB = Math.max(...balances);
  const rangeB = Math.abs(maxB - minB) || 1; 

  return data.map((d, i) => {
    return {
       ...d,
       x: (i / (data.length - 1)) * 100,
       y: 90 - ((d.balance - minB) / rangeB) * 80
    };
  });
});

const linePath = computed(() => {
  const pts = points.value;
  if (!pts || pts.length < 2) return '';
  let d = `M ${pts[0]?.x} ${pts[0]?.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p0 = pts[i - 1] || p1;
    const p3 = pts[i + 2] || p2;
    const tension = 0.2;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
});

const areaPath = computed(() => {
  const lp = linePath.value;
  if (!lp) return '';
  return `${lp} L 100 100 L 0 100 Z`;
});

const emotionWeights: Record<string, number> = {
  fear: -0.7, greed: -0.8, fomo: -1.0, frustration: -1.0,
  neutral: 1.0, confidence: 0.8, calm: 1.0, boredom: 0.1
};

const stabilityProfile = computed(() => {
  if (!props.entries || props.entries.length === 0) return { score: 0, status: 'NO DATA' };
  const sample = props.entries.slice(-10);
  let totalScore = 0;
  let emotionCount = 0;

  sample.forEach(entry => {
    if (entry.emotions) {
      entry.emotions.forEach((eId: string) => {
        totalScore += (emotionWeights[eId.toLowerCase()] || 0);
        emotionCount++;
      });
    }
  });

  const average = emotionCount > 0 ? totalScore / emotionCount : 0;
  if (average >= 0.7) return { score: average, status: 'STABLE' };
  if (average >= 0.2) return { score: average, status: 'NEUTRAL' };
  if (average >= -0.3) return { score: average, status: 'UNSTABLE' };
  return { score: average, status: 'VOLATILE' };
});

const prevStabilityScore = computed(() => {
  if (!props.entries || props.entries.length <= 1) return 0;
  const len = props.entries.length;
  const sample = props.entries.slice(Math.max(0, len - 11), len - 1);
  let totalScore = 0;
  let emotionCount = 0;

  sample.forEach(entry => {
    if (entry.emotions) {
      entry.emotions.forEach((eId: string) => {
        totalScore += (emotionWeights[eId.toLowerCase()] || 0);
        emotionCount++;
      });
    }
  });

  return emotionCount > 0 ? totalScore / emotionCount : 0;
});

const stabilityScoreDelta = computed(() => {
  if (!props.entries || props.entries.length <= 1) return 0;
  return stabilityProfile.value.score - prevStabilityScore.value;
});

const stabilityColor = computed(() => {
  const status = stabilityProfile.value.status;
  if (status === 'STABLE') return { stroke: 'stroke-emerald-400', text: 'text-emerald-400' };
  if (status === 'NEUTRAL') return { stroke: 'stroke-amber-400', text: 'text-amber-400' };
  if (status === 'UNSTABLE') return { stroke: 'stroke-rose-400', text: 'text-rose-400' };
  return { stroke: 'stroke-rose-600', text: 'text-rose-600' };
});


const getStageStability = (phase: string) => {
  const lastEntry = props.entries?.[props.entries.length - 1];
  if (!lastEntry) return { status: 'NO DATA', color: 'text-white/10' };
  
  let emotions: string[] = [];
  if (phase === 'entry') emotions = lastEntry.emotionsEntry || [];
  else if (phase === 'during') emotions = lastEntry.emotionsDuring || [];
  else if (phase === 'exit') emotions = lastEntry.emotionsExit || [];

  if (emotions.length === 0) return { status: 'IDLE', color: 'text-white/5' };

  let score = 0;
  emotions.forEach(eId => {
    score += (emotionWeights[eId.toLowerCase()] || 0);
  });
  const avg = score / emotions.length;

  if (avg >= 0.7) return { status: 'STABLE', color: 'text-emerald-400' };
  if (avg >= 0.2) return { status: 'NEUTRAL', color: 'text-amber-400' };
  if (avg >= -0.3) return { status: 'UNSTABLE', color: 'text-rose-400' };
  return { status: 'VOLATILE', color: 'text-rose-600' };
};

const getFacePathForStatus = (status: string) => {
  if (status === 'STABLE') {
    return [
      '<circle cx="12" cy="12" r="10"/>',
      '<path d="M8 14s1.5 2 4 2 4-2 4-2"/>',
      '<line x1="9" y1="9" x2="9.01" y2="9"/>',
      '<line x1="15" y1="9" x2="15.01" y2="9"/>'
    ].join('');
  }
  if (status === 'NEUTRAL' || status === 'IDLE' || status === 'NO DATA') {
    return [
      '<circle cx="12" cy="12" r="10"/>',
      '<line x1="8" y1="15" x2="16" y2="15"/>',
      '<line x1="9" y1="9" x2="9.01" y2="9"/>',
      '<line x1="15" y1="9" x2="15.01" y2="9"/>'
    ].join('');
  }
  if (status === 'UNSTABLE') {
    return [
      '<circle cx="12" cy="12" r="10"/>',
      '<path d="M16 16s-1.5-2-4-2-4 2-4 2"/>',
      '<line x1="9" y1="9" x2="9.01" y2="9"/>',
      '<line x1="15" y1="9" x2="15.01" y2="9"/>'
    ].join('');
  }
  // VOLATILE / ANGRY
  return [
    '<circle cx="12" cy="12" r="10"/>',
    '<path d="M16 16s-1.5-2-4-2-4 2-4 2"/>',
    '<path d="M7.5 8 10 9"/>',
    '<path d="M14 9l2.5-1"/>',
    '<line x1="9" y1="10" x2="9.01" y2="10"/>',
    '<line x1="15" y1="10" x2="15.01" y2="10"/>'
  ].join('');
};

const currentFacePaths = computed(() => {
  return getFacePathForStatus(stabilityProfile.value.status);
});

const stabilityDescription = computed(() => {
  const status = stabilityProfile.value.status;
  if (status === 'STABLE') return "Executing with absolute precision.";
  if (status === 'NEUTRAL') return "Standard atmospheric pressure.";
  if (status === 'UNSTABLE') return "Friction detected in cognitive loop.";
  if (status === 'VOLATILE') return "Critical stress. Halt operations.";
  return "Accumulating initial telemetry.";
});





onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') emit('close');
  }
  window.addEventListener('keydown', handleEscape);
  return () => window.removeEventListener('keydown', handleEscape);
});
</script>

<style>
.luxury-reveal-enter-active {
  transition: opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
.luxury-reveal-enter-from {
  opacity: 0;
  transform: scale(0.98) translateY(10px);
}
.luxury-reveal-leave-active {
  transition: all 800ms cubic-bezier(0.4, 0, 0.2, 1);
}
.luxury-reveal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>

<style scoped>
.massive-slide-enter-active,
.massive-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.massive-slide-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
  filter: blur(10px);
}
.massive-slide-leave-to {
  opacity: 0;
  transform: scale(1.05) translateY(-20px);
  filter: blur(10px);
  position: absolute;
}

.line-path-anim {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: drawLine 2.5s cubic-bezier(0.16, 1.0, 0.3, 1) forwards;
  animation-delay: 0.8s;
}

.area-path-anim {
  opacity: 0;
  animation: fadeInArea 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 1.8s;
}

@keyframes drawLine {
  to { stroke-dashoffset: 0; }
}
@keyframes fadeInArea {
  to { opacity: 1; }
}

.circular-gauge-anim {
  transition: stroke-dashoffset 2s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
