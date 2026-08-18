<template>
  <div class="phantom-telemetry overflow-hidden">
    <!-- Clean Operational Ribbon -->
    <div 
      class="w-[1000px] bg-black/60 backdrop-blur-3xl border border-white/5 rounded-2xl px-12 py-5 flex items-center justify-between shadow-[0_32px_64px_rgba(0,0,0,0.8)] transition-all duration-700 hover:border-white/10 group relative"
    >
      <!-- ENTRY TIME (Legacy Anchor) -->
      <div class="flex flex-col min-w-[100px]">
        <span class="text-[8px] uppercase tracking-[0.4em] font-black text-white/40 mb-1">Entry Timestamp</span>
        <span class="text-[11px] font-mono font-bold text-white tracking-widest tabular-nums italic opacity-60">
          {{ formatTime(newEntry.date) }}
        </span>
      </div>

      <!-- CORE EXECUTION NODES -->
      <div class="flex-1 flex items-center justify-center gap-14">
        <!-- Entry Node -->
        <div class="flex flex-col items-center">
            <span class="text-[8px] uppercase tracking-[0.4em] font-black text-white/40 mb-1">Initiation</span>
            <span class="text-xl font-mono font-black text-white tracking-tight">{{ newEntry.entry || '0.00' }}</span>
        </div>

        <!-- Stop Loss (Highlighted Risk) -->
        <div class="flex flex-col items-center">
            <span class="text-[8px] uppercase tracking-[0.4em] font-black text-rose-500/60 mb-1">Stop Loss</span>
            <div class="flex items-center gap-2">
                <div class="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"></div>
                <span class="text-xl font-mono font-black text-rose-400 tracking-tight">{{ newEntry.stopLoss || 'NONE' }}</span>
            </div>
        </div>

        <!-- Take Profit (Highlighted Target) -->
        <div class="flex flex-col items-center">
            <span class="text-[8px] uppercase tracking-[0.4em] font-black text-emerald-500/60 mb-1">Take Profit</span>
            <div class="flex items-center gap-2">
                <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                <span class="text-xl font-mono font-black text-emerald-400 tracking-tight">{{ newEntry.takeProfit || 'NONE' }}</span>
            </div>
        </div>

        <!-- Exit Node -->
        <div class="flex flex-col items-center">
            <span class="text-[8px] uppercase tracking-[0.4em] font-black text-white/40 mb-1">Conclusion</span>
            <span class="text-xl font-mono font-black tabular-nums transition-all duration-700" :class="newEntry.dateExit ? 'text-white' : 'text-white/5'">
                {{ newEntry.exit || (newEntry.dateExit ? '0.00' : '0.00') }}
            </span>
        </div>
      </div>

      <!-- EXIT TIME (Legacy Anchor) -->
      <div class="flex flex-col items-end min-w-[100px]">
        <span class="text-[8px] uppercase tracking-[0.4em] font-black text-white/40 mb-1">Exit Timestamp</span>
        <span class="text-[11px] font-mono font-bold tracking-widest tabular-nums italic transition-all duration-700" :class="newEntry.dateExit ? 'text-white opacity-40' : 'text-emerald-500/10'">
          {{ newEntry.dateExit ? formatTime(newEntry.dateExit) : 'LIVE_FEED' }}
        </span>
      </div>

      <!-- Live Telemetry Scanning Line -->
      <div class="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.02]">
        <div class="w-full h-[1px] bg-white animate-scan-line"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { newEntry } from '@/widgets/diary/model/useDiary';

const formatTime = (date: any) => {
    if (!date) return '--:--:--';
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
</script>

<style scoped>
@keyframes scan-line {
    0% { transform: translateY(-50px); }
    100% { transform: translateY(200px); }
}
.animate-scan-line {
    animation: scan-line 6s linear infinite;
}
</style>
