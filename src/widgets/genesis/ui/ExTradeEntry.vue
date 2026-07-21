<script setup>
import { provide } from 'vue'
import { useExTradeEntry } from '../model/useExTradeEntry'
import { useI18n } from '~/shared/i18n/useI18n'
import DesignVignette from '~/widgets/style/ui/DesignVignette.vue'
import ExTooltip from '~/shared/ui/ExTooltip.vue'

import ExTradeEntryCmeNotice from './components/ExTradeEntryCmeNotice.vue'
import ExTradeEntryProtocolSelect from './components/ExTradeEntryProtocolSelect.vue'
import ExTradeEntryMiddleSection from './components/ExTradeEntryMiddleSection.vue'
import ExTradeEntryRightToggle from './components/ExTradeEntryRightToggle.vue'
import ExTradeEntryEmotionMatrix from './components/ExTradeEntryEmotionMatrix.vue'
import ExTradeEntryActionFooter from './components/ExTradeEntryActionFooter.vue'
import ExTradeEntryMethodMatrix from './components/ExTradeEntryMethodMatrix.vue'

const emit = defineEmits(['addTrade', 'updateTrade', 'close'])
const props = defineProps({
  initialTrade: {
    type: Object,
    default: null
  }
})

const state = useExTradeEntry(props, emit)
provide('tradeState', state)

const { locale } = useI18n()
const { isDark, isClosed, scrollContainer } = state
</script>

<template>
  <div ref="scrollContainer" 
       class="flex flex-col items-center h-full w-full overflow-y-auto custom-scrollbar transition-colors duration-500 pb-40 bg-theme-bg nier-text-primary"
       :class="{ dark: isDark }">
     <DesignVignette :is-dark="isDark" />
     
     <ExTradeEntryCmeNotice />
     <ExTradeEntryProtocolSelect @close="emit('close')" />
     <ExTradeEntryMiddleSection />
     <ExTradeEntryRightToggle />
     <ExTradeEntryEmotionMatrix />
     <div class="fixed bottom-6 left-6 z-[1105]">
       <ExTooltip
         :is-dark="isDark"
         :title="locale === 'ru' ? 'РЕЖИМ_ЗАКРЫТИЯ' : 'CLOSE_MODE'"
         placement="top"
         variant="basic"
       >
         <template #trigger>
           <button
             type="button"
             class="group flex items-center gap-3 border border-white/30 bg-black/70 px-4 py-3 text-left transition-colors hover:border-white/70 hover:bg-black/85"
             @click="isClosed = !isClosed"
           >
             <span class="flex flex-col gap-1">
               <span class="text-[9px] uppercase tracking-[0.36em] font-black text-white/55">isClosed?</span>
               <span class="text-[10px] uppercase tracking-[0.28em] font-mono font-black" :class="isClosed ? 'text-white' : 'text-white/45'">
                 {{ isClosed ? (locale === 'ru' ? 'ЗАКРЫТА' : 'CLOSED') : (locale === 'ru' ? 'ОТКРЫТА' : 'OPEN') }}
               </span>
             </span>
             <span class="relative grid h-6 w-6 shrink-0 place-items-center border border-white/55 bg-transparent transition-colors group-hover:border-white">
               <svg v-if="isClosed" class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2.4" d="M5 13l4 4L19 7"></path>
               </svg>
             </span>
           </button>
         </template>
         {{ locale === 'ru'
           ? 'Включено: сделка закрыта, можно вводить цену выхода и результат. Выключено: сделка остается открытой и не влияет на дневник.'
           : 'On: the trade is closed, exit price and result are available. Off: the trade stays open and does not affect the diary.'
         }}
       </ExTooltip>
     </div>
     <ExTradeEntryActionFooter />
     <ExTradeEntryMethodMatrix />
  </div>
</template>

<style>
.custom-scrollbar {
  -ms-overflow-style: none !important;
  scrollbar-width: none !important;
}
.custom-scrollbar::-webkit-scrollbar {
  display: none !important;
}

.nier-input {
  background: transparent;
  border: none;
  font-family: 'Inter', monospace;
  font-weight: 800;
  font-size: 11px;
  letter-spacing: 0.15em;
  color: white;
  padding: 0;
  outline: none;
}
.nier-input::placeholder {
  color: rgba(255, 255, 255, 0.2);
}

input::-webkit-outer-spin-button, 
input::-webkit-inner-spin-button { 
  -webkit-appearance: none; 
  margin: 0; 
}
input[type=number] { 
  -moz-appearance: textfield; 
  appearance: textfield;
}

/* Animations */
@keyframes scan-fast {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}

@keyframes scan-slow {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes scan-vertical {
  from { transform: translateY(-100%); }
  to { transform: translateY(100%); }
}

.animate-scan-fast {
  animation: scan-fast 1.5s infinite linear;
}

.animate-scan-slow {
  animation: scan-slow 3s infinite linear;
}

@keyframes scan-vertical {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(500%); }
}

.animate-scan {
  animation: scan-vertical 4s linear infinite;
}

/* Transitions */
.risk-warn-enter-active,
.risk-warn-leave-active {
  transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), filter 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.risk-warn-enter-from,
.risk-warn-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
  filter: blur(4px);
}
.risk-warn-enter-to,
.risk-warn-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0px);
}

.protocol-slide-enter-active, .protocol-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.protocol-slide-enter-from, .protocol-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.nier-fade-enter-active, .nier-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.nier-fade-enter-from, .nier-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.sector-swap-enter-active, .sector-swap-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.sector-swap-enter-from { opacity: 0; transform: translateX(20px); }
.sector-swap-leave-to { opacity: 0; transform: translateX(-20px); }

.insight-slide-enter-active, .insight-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.insight-slide-enter-from { 
  opacity: 0; 
  transform: translate(-30px, -50%); 
}
.insight-slide-leave-to { 
  opacity: 0; 
  transform: translate(-30px, -50%); 
}
</style>
