<template>
  <div class="relative z-[2200] flex items-center">
    <button
      type="button"
      class="group relative flex h-10 w-10 items-center justify-center border border-transparent text-white/70 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white"
      :class="showStrategyMenu ? 'border-white/30 bg-white/10 text-white' : ''"
      :aria-label="selectedStrategyName ? `${tr('Протокол', 'Protocol')}: ${selectedStrategyName}` : tr('Выбор протокола', 'Select protocol')"
      :aria-expanded="showStrategyMenu"
      @click="showStrategyMenu = !showStrategyMenu"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5" aria-hidden="true">
        <rect x="4" y="4" width="6" height="6" />
        <rect x="14" y="4" width="6" height="6" />
        <rect x="4" y="14" width="6" height="6" />
        <path d="M14 17h6M17 14v6" />
      </svg>
      <span class="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap border border-white/20 bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
        [ {{ tr('ПРОТОКОЛ', 'PROTOCOL') }} ]
      </span>
    </button>

    <Transition name="protocol-button-dropdown">
      <div v-if="showStrategyMenu" class="absolute bottom-full left-1/2 z-[2300] mb-4 w-80 -translate-x-1/2 pointer-events-auto">
        <ExPanel variant="light" :no-padding="true" :no-shadow="true" :show-corners="true" class="!border-black/20 dark:!border-white/20">
          <div class="flex items-center justify-between border-b nier-border-primary bg-black/5 px-3 py-1.5 dark:bg-white/5"></div>

          <div class="max-h-80 overflow-y-auto custom-scrollbar py-2">
            <div
              v-for="strategy in strategies"
              :key="strategy.id"
              class="group/item relative cursor-pointer px-8 py-4 transition-all duration-300"
              :class="modelValue === strategy.id ? 'nier-bg-inverted' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'"
              @click.stop="selectStrategy(strategy)"
            >
              <div v-if="modelValue === strategy.id" class="absolute left-0 top-1/2 ml-4 h-1.5 w-1.5 -translate-y-1/2 nier-bg-panel rotate-45"></div>

              <span
                class="relative z-10 text-[10px] font-mono font-bold uppercase tracking-[0.3em] transition-colors duration-300"
                :class="modelValue === strategy.id ? 'nier-text-primary' : 'text-black/50 dark:text-white/50 group-hover/item:text-black dark:group-hover/item:text-white'"
              >
                {{ strategy.name }}
              </span>
              <div class="absolute bottom-0 left-0 h-px w-0 nier-bg-inverted opacity-20 transition-all duration-500 group-hover/item:w-full"></div>
            </div>

            <div v-if="!strategies.length" class="px-8 py-5 text-[9px] font-mono uppercase tracking-[0.25em] text-black/40 dark:text-white/40">
              {{ isLoading ? 'LOADING_PROTOCOL...' : 'NO_PROTOCOLS_FOUND' }}
            </div>
          </div>
        </ExPanel>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import { useMatrixState } from '~/widgets/genesis/model/matrix/useMatrixState'
import ExPanel from '~/shared/ui/ExPanel.vue'
import type { Strategy } from '~/widgets/system-protocol-select'

const props = withDefaults(defineProps<{
  modelValue: string | null
  strategies: Strategy[]
  isLoading?: boolean
  closeSignal?: number
}>(), {
  isLoading: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

const showStrategyMenu = ref(false)
watch(() => props.closeSignal, () => {
  showStrategyMenu.value = false
})
const matrixState = useMatrixState()
const { locale } = useI18n()
const tr = (ru: string, en: string) => locale.value === 'ru' ? ru : en

const selectedStrategyName = computed(() => {
  const strategy = props.strategies.find(item => item.id === props.modelValue)
  if (!strategy) return null

  let suffix = ''
  const versionId = matrixState.selectedStrategyVersionId.value
  const versionInfo = versionId
    ? matrixState.strategyVersions.value.find((version: any) => version.id === versionId)
    : null
  const versionMatch = versionInfo?.label?.match(/(V\d+)$/i)

  if (versionMatch && strategy.id !== 'MAIN_DIARY') {
    suffix = ` // ${versionMatch[1]}`
  }

  return `${strategy.name}${suffix}`
})

const selectStrategy = (strategy: Strategy) => {
  emit('update:modelValue', strategy.id)
  showStrategyMenu.value = false
}
</script>

<style scoped>
.protocol-button-dropdown-enter-active,
.protocol-button-dropdown-leave-active {
  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.6s cubic-bezier(0.16, 1, 0.3, 1),
              filter 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.protocol-button-dropdown-enter-from,
.protocol-button-dropdown-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px) scale(0.97);
  filter: blur(8px);
}

.protocol-button-dropdown-enter-to,
.protocol-button-dropdown-leave-from {
  opacity: 1;
  transform: translate(-50%, 0) scale(1);
  filter: blur(0);
}
</style>
