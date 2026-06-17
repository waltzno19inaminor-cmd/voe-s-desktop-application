<script setup>
import { provide } from 'vue'
import { useExTradeEntry } from '../model/useExTradeEntry'
import DesignVignette from '~/widgets/style/ui/DesignVignette.vue'

import ExTradeEntryCmeNotice from './components/ExTradeEntryCmeNotice.vue'
import ExTradeEntryProtocolSelect from './components/ExTradeEntryProtocolSelect.vue'
import ExTradeEntryMiddleSection from './components/ExTradeEntryMiddleSection.vue'
import ExTradeEntryRightToggle from './components/ExTradeEntryRightToggle.vue'
import ExTradeEntryEmotionMatrix from './components/ExTradeEntryEmotionMatrix.vue'
import ExTradeEntryActionFooter from './components/ExTradeEntryActionFooter.vue'
import ExTradeEntryConditionLibrary from './components/ExTradeEntryConditionLibrary.vue'
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

const { isDark, scrollContainer } = state
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
     <ExTradeEntryActionFooter />
     <ExTradeEntryConditionLibrary />
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
