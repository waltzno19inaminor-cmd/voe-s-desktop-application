<template>
  <div class="relative z-[2200] flex items-center">
    <button
      type="button"
      class="group relative flex h-10 w-10 items-center justify-center border border-transparent text-white/70 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white"
      :class="showVersionMenu ? 'border-white/30 bg-white/10 text-white' : ''"
      :aria-label="selectedVersionLabel ? `${tr('Версия', 'Version')}: ${selectedVersionLabel}` : tr('Выбор версии', 'Select version')"
      :aria-expanded="showVersionMenu"
      @click="showVersionMenu = !showVersionMenu"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="1" />
        <path d="M8 8h8M8 12h5M8 16h8" />
      </svg>
      <span class="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap border border-white/20 bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
        [ {{ tr('ВЕРСИЯ', 'VERSION') }} ]
      </span>
    </button>

    <Transition name="protocol-button-dropdown">
      <div v-if="showVersionMenu" class="absolute bottom-full left-1/2 z-[2300] mb-4 w-80 -translate-x-1/2 pointer-events-auto">
        <ExPanel variant="light" :no-padding="true" :no-shadow="true" :show-corners="true" class="!border-black/20 dark:!border-white/20">
          <div class="flex items-center justify-between border-b nier-border-primary bg-black/5 px-3 py-1.5 dark:bg-white/5"></div>

          <div class="max-h-80 overflow-y-auto custom-scrollbar py-2">
            <div
              v-for="version in versions"
              :key="version.id"
              class="group/item relative cursor-pointer px-8 py-4 transition-all duration-300"
              :class="modelValue === version.id ? 'nier-bg-inverted' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'"
              @click.stop="selectVersion(version.id)"
            >
              <div v-if="modelValue === version.id" class="absolute left-0 top-1/2 ml-4 h-1.5 w-1.5 -translate-y-1/2 nier-bg-panel rotate-45"></div>
              <span
                class="relative z-10 text-[10px] font-mono font-bold uppercase tracking-[0.3em] transition-colors duration-300"
                :class="modelValue === version.id ? 'nier-text-primary' : 'text-black/50 dark:text-white/50 group-hover/item:text-black dark:group-hover/item:text-white'"
              >
                {{ formatVersionLabel(version) }}
              </span>
              <div class="absolute bottom-0 left-0 h-px w-0 nier-bg-inverted opacity-20 transition-all duration-500 group-hover/item:w-full"></div>
            </div>

            <div v-if="!versions.length" class="px-8 py-5 text-[9px] font-mono uppercase tracking-[0.25em] text-black/40 dark:text-white/40">
              {{ isLoading ? tr('ЗАГРУЗКА ВЕРСИЙ...', 'LOADING_VERSIONS...') : tr('ВЕРСИИ НЕ НАЙДЕНЫ', 'NO_VERSIONS_FOUND') }}
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
import ExPanel from '~/shared/ui/ExPanel.vue'

interface VersionOption {
  id: string
  label?: string
  name?: string
}

const props = withDefaults(defineProps<{
  modelValue: string | null
  versions: VersionOption[]
  strategyName?: string
  isLoading?: boolean
  closeSignal?: number
}>(), {
  isLoading: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

const { locale } = useI18n()
const showVersionMenu = ref(false)
const tr = (ru: string, en: string) => locale.value === 'ru' ? ru : en

watch(() => props.closeSignal, () => {
  showVersionMenu.value = false
})

const selectedVersionLabel = computed(() => {
  const version = props.versions.find(item => item.id === props.modelValue)
  return version ? formatVersionLabel(version) : null
})

const formatVersionLabel = (version: VersionOption) => {
  const rawLabel = String(version.label || version.name || version.id)
  const versionMatch = rawLabel.match(/\bV\d+(?:\.\d+)?\b/i) || String(version.id).match(/\bV\d+(?:\.\d+)?\b/i)
  const versionSuffix = versionMatch?.[0]?.toUpperCase()
  const strategyName = String(props.strategyName || '').trim()

  if (!strategyName) return rawLabel
  return `${strategyName}${versionSuffix ? ` ${versionSuffix}` : ` ${rawLabel}`}`
}

const selectVersion = (versionId: string) => {
  emit('update:modelValue', versionId)
  showVersionMenu.value = false
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
