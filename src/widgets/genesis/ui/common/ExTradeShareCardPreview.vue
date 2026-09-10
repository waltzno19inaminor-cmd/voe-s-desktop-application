<template>
  <div class="overflow-x-auto custom-scrollbar">
    <div id="share-card-export-target" class="relative w-[1200px] h-[675px] bg-[#0a0a0a] border border-theme-border shadow-2xl overflow-hidden group mx-auto shrink-0">
      <!-- Decorative Mesh Pattern -->
      <div class="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style="background-image: linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px); background-size: 40px 40px;"></div>
      
      <!-- Gradient Overlay -->
      <div class="absolute inset-0 bg-gradient-to-tr from-black to-transparent opacity-60"></div>

      <!-- Top-Left Header with App Identity -->
      <div class="absolute top-[5%] left-[5%] flex flex-col" style="font-family: 'Cormorant Garamond', serif;">
        <h1 class="text-2xl tracking-[0.4em] uppercase font-light text-white leading-normal">J.L.Jörmungandr</h1>
        <p class="text-[8px] font-mono tracking-[0.5em] uppercase text-white/30 mt-2">
          {{ locale === 'ru' ? 'Торговый дневник' : 'Trading Diary' }}
        </p>
      </div>

      <!-- Primary Metric: Center Aligned -->
      <div class="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center -translate-y-[5%]">
        <div class="w-full text-center">
          <span class="text-[18px] font-mono font-black uppercase tracking-[0.4em] text-white opacity-60">{{ asset }}</span>
        </div>
        
        <div class="w-full text-center mt-2">
          <span class="text-[200px] px-3 font-serif italic text-white leading-none drop-shadow-[0_0_40px_rgba(255,255,255,0.15)]">{{ efficiency }}%</span>
        </div>
        
        <div class="w-full text-center mt-6 flex flex-col items-center">
          <span class="text-[14px] font-mono uppercase tracking-wider text-white opacity-40 block w-full text-center">
            {{ locale === 'ru'
              ? `Сделка лучше, чем ${efficiency}% сделок`
              : `The trade is better than ${efficiency}% of the trades` }}
          </span>
          <div class="h-px w-24 bg-white/20 mt-4 mx-auto"></div>
        </div>
      </div>

      <!-- User Registry Info & Secure Code Block: Top-Right -->
      <div class="absolute top-[5%] right-[5%] w-[400px] text-right">
        <ExWebsiteQrCode class="mb-3 ml-auto h-[76px] w-[76px]" />
        <div class="w-full">
          <span class="text-[10px] font-mono font-black uppercase tracking-widest text-white">{{ username }}</span>
        </div>
      </div>

      <!-- Bottom Telemetry Grid -->
      <div class="absolute top-[71%] left-[5%] right-[5%]">
        <div class="h-px w-full bg-white/10 mb-10"></div>
        <div class="grid grid-cols-5 gap-8">
          <div v-for="metric in metrics" :key="metric.label" class="flex flex-col space-y-3">
            <span class="text-[9px] font-mono font-black uppercase tracking-widest text-white/30">{{ metric.label }}</span>
            <span :class="['text-[20px] font-mono font-black uppercase truncate', metric.colorClass || 'text-white']">{{ metric.value }}</span>
          </div>
        </div>
      </div>

      <!-- HUD Corner Bracket -->
      <div class="absolute bottom-[5%] right-[5%] w-12 h-12 border-r border-b border-white/20"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ExWebsiteQrCode from './ExWebsiteQrCode.vue'

interface Props {
  efficiency?: number | string
  efficiencyLabel?: string
  protocol?: string
  duration?: string
  entryPrice?: string | number
  exitPrice?: string | number
  netResult?: string
  username?: string
  asset?: string
  locale?: 'en' | 'ru'
}

const props = withDefaults(defineProps<Props>(), {
  efficiency: 78,
  efficiencyLabel: 'Percentile_Efficiency',
  protocol: 'Day Trading',
  duration: '56.5 Hours',
  entryPrice: '$150.00',
  exitPrice: '$162.50',
  netResult: '+$1,250.00',
  username: 'Trader',
  asset: 'BTC/USD',
  locale: 'en'
})

const netResultColorClass = computed(() => {
  if (!props.netResult) return 'text-white'
  const cleaned = String(props.netResult).trim()
  if (cleaned.startsWith('-')) {
    return 'text-red-500'
  } else if (cleaned.startsWith('+') || parseFloat(cleaned.replace(/[^\d.-]/g, '')) > 0) {
    return 'text-green-400'
  }
  return 'text-white'
})

const metrics = computed(() => [
  { label: props.locale === 'ru' ? 'Протокол' : 'Protocol', value: props.protocol },
  { label: props.locale === 'ru' ? 'Длительность' : 'Duration', value: props.duration },
  { label: props.locale === 'ru' ? 'Цена входа' : 'Entry Price', value: props.entryPrice },
  { label: props.locale === 'ru' ? 'Цена выхода' : 'Exit Price', value: props.exitPrice },
  { label: props.locale === 'ru' ? 'Итоговый результат' : 'Net Result', value: props.netResult, colorClass: netResultColorClass.value }
])
</script>
