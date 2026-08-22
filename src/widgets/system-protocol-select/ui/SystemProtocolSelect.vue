<template>
  <div class="relative flex flex-col z-[200]">
    <!-- The Button -->
    <div class="flex items-center space-x-6 px-8 py-4 bg-black/5 dark:bg-white/5 border nier-border-primary relative group/hud backdrop-blur-md pointer-events-auto cursor-pointer hover:bg-black/10 dark:hover:bg-white/10"
         @click="showStrategyMenu = !showStrategyMenu">
       <!-- Corner Decor -->
       <ExGothicCorners variant="light" opacity="0.3" class="nier-text-primary" />

       <div class="flex flex-col min-w-[220px] py-1">
          <span class="text-[7px] font-mono opacity-50 uppercase tracking-[0.5em] font-bold nier-text-primary">{{ t('genesis.virtualLog.systemProtocolSelect') || 'SYSTEM_PROTOCOL_SELECT' }}</span>
          <div class="flex items-center justify-between mt-1">
             <div class="flex items-center gap-3">
                <div class="w-1.5 h-1.5 nier-bg-inverted rotate-45 animate-pulse"></div>
                <span class="text-[11px] font-mono tracking-[0.3em] uppercase font-black leading-tight nier-text-primary" :class="isLoading ? 'animate-pulse' : ''">
                  {{ isLoading ? (t('genesis.virtualLog.loadingProtocol') || 'LOADING_PROTOCOL...') : (selectedStrategyName || 'MAIN_DIARY') }}
                </span>
             </div>
             <div class="w-2 h-2 border-b-2 border-r-2 border-black/60 dark:border-white/60 rotate-45 ml-4 transition-transform duration-500" :class="showStrategyMenu ? '-rotate-[135deg] translate-y-1' : ''"></div>
          </div>
       </div>
    </div>

    <!-- The Dropdown Menu -->
    <Transition :name="props.menuPosition === 'top' ? 'dropdown-top' : 'dropdown-bottom'">
      <div class="absolute w-80 z-[200] pointer-events-auto" :class="menuPositionClass" v-if="showStrategyMenu">
        <ExPanel variant="light" :no-padding="true" :no-shadow="true" :show-corners="true" class="!border-black/20 dark:!border-white/20">
         <!-- Topbar -->
         <div class="flex items-center justify-between px-3 py-1.5 border-b nier-border-primary bg-black/5 dark:bg-white/5">
         </div>

         <div class="max-h-80 overflow-y-auto custom-scrollbar py-2">
            <div v-for="s in strategies" :key="s.id" 
                 @click.stop="selectStrategy(s)" 
                 class="group/item relative px-8 py-4 cursor-pointer transition-all duration-300"
                 :class="modelValue === s.id ? 'nier-bg-inverted' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'">
               
               <div v-if="modelValue === s.id" class="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 nier-bg-panel rotate-45 ml-4"></div>
               
               <span class="relative z-10 text-[10px] font-mono tracking-[0.3em] uppercase font-bold transition-colors duration-300"
                     :class="modelValue === s.id ? 'nier-text-primary' : 'text-black/50 dark:text-white/50 group-hover/item:text-black dark:group-hover/item:text-white'">
                  {{ s.name }}
               </span>
               <div class="absolute bottom-0 left-0 h-px nier-bg-inverted w-0 group-hover/item:w-full transition-all duration-500 opacity-20"></div>
            </div>
         </div>
        </ExPanel>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import ExPanel from '~/shared/ui/ExPanel.vue'
import ExGothicCorners from '~/shared/ui/ExGothicCorners.vue'
import type { Strategy } from '../models/types'
import { useMatrixState } from '~/widgets/genesis/model/matrix/useMatrixState'

const props = withDefaults(defineProps<{
  modelValue: string | null
  strategies: Strategy[]
  isLoading?: boolean
  menuPosition?: 'top' | 'bottom'
}>(), {
  isLoading: false,
  menuPosition: 'bottom',
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
}>()

const { t } = useI18n()
const showStrategyMenu = ref(false)
const matrixState = useMatrixState()

const selectedStrategyName = computed(() => {
  const strat = props.strategies.find(s => s.id === props.modelValue)
  if (!strat) return null

  let suffix = ''
  const vId = matrixState.selectedStrategyVersionId.value
  const versionInfo = vId ? matrixState.strategyVersions.value.find((v: any) => v.id === vId) : null
  const versionMatch = versionInfo?.label?.match(/(V\d+)$/i)
  
  if (versionMatch && strat.id !== 'MAIN_DIARY') {
    suffix = ` // ${versionMatch[1]}`
  }

  return `${strat.name}${suffix}`
})

const menuPositionClass = computed(() => {
  return props.menuPosition === 'top' ? 'bottom-full mb-6' : 'top-full mt-6'
})

const selectStrategy = (s: Strategy) => {
  emit('update:modelValue', s.id)
  showStrategyMenu.value = false
}
</script>

<style scoped>
.dropdown-bottom-enter-active,
.dropdown-bottom-leave-active,
.dropdown-top-enter-active,
.dropdown-top-leave-active {
  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), 
              transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), 
              filter 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Bottom Dropdown (Opens Downwards) */
.dropdown-bottom-enter-from,
.dropdown-bottom-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.97);
  filter: blur(8px);
}
.dropdown-bottom-enter-to,
.dropdown-bottom-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0px);
}

/* Top Dropdown (Opens Upwards) */
.dropdown-top-enter-from,
.dropdown-top-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.97);
  filter: blur(8px);
}
.dropdown-top-enter-to,
.dropdown-top-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0px);
}
</style>
