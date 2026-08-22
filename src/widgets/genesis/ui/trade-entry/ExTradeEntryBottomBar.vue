<script setup lang="ts">
import type { Strategy } from '~/widgets/system-protocol-select'
import { useI18n } from '~/shared/i18n/useI18n'
import ExTradeEntryProtocolButton from './ExTradeEntryProtocolButton.vue'

const { locale } = useI18n()
const tr = (ru: string, en: string) => locale.value === 'ru' ? ru : en

defineProps<{
  isTradeEntryOpen: boolean
  isEditing?: boolean
  isSimulatorOpen?: boolean
  isCloseModeActive: boolean
  commitState?: 'idle' | 'loading' | 'success'
  activePanel: 'matrix' | 'journal' | 'method' | null
  strategies: Strategy[]
  selectedStrategyId: string | null
  isMatrixLoading?: boolean
  protocolCloseSignal?: number
}>()

const emit = defineEmits<{
  (event: 'toggle-entry'): void
  (event: 'save-trade'): void
  (event: 'toggle-close-mode'): void
  (event: 'open-panel', panel: 'matrix' | 'journal' | 'method'): void
  (event: 'update-strategy', strategyId: string): void
}>()
</script>

<template>
  <div
    v-if="!isSimulatorOpen"
    class="pointer-events-none absolute bottom-12 left-0 right-0 z-[2100] flex items-center justify-center"
  >
    <div class="pointer-events-auto flex items-center gap-1.5 rounded-sm border border-white/20 bg-[#0a0a0a]/90 p-1.5 shadow-2xl backdrop-blur-xl">
      <button
        v-if="!isTradeEntryOpen"
        type="button"
        class="group relative flex h-10 w-10 items-center justify-center border border-white bg-white text-black transition-all hover:bg-white/80"
        :aria-label="tr('Новая сделка', 'New trade')"
        @click="emit('toggle-entry')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5 transition-transform duration-300 group-hover:rotate-90" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span class="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap border border-white/20 bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
          [ {{ tr('Новая сделка', 'New trade') }} ]
        </span>
      </button>

      <button
        v-if="isTradeEntryOpen"
        type="button"
        class="group relative flex h-10 w-10 cursor-default items-center justify-center border border-white bg-white text-black transition-all hover:bg-white/80 disabled:opacity-70"
        :disabled="commitState !== 'idle'"
        :aria-label="isEditing ? tr('Обновить сделку', 'Update trade') : tr('Сохранить сделку', 'Save trade')"
        @click="emit('save-trade')"
      >
        <svg v-if="commitState === 'loading'" viewBox="0 0 24 24" fill="none" class="h-5 w-5 animate-spin" aria-hidden="true">
          <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" stroke-dasharray="28 22" stroke-linecap="round" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5" aria-hidden="true">
          <path d="M5 12.5 9.5 17 19 7.5" />
        </svg>
        <span class="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap border border-white/20 bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
          [ {{ isEditing ? tr('Обновить сделку', 'Update trade') : tr('Сохранить сделку', 'Save trade') }} ]
        </span>
      </button>

      <template v-if="isTradeEntryOpen">
        <button
          type="button"
          class="group relative flex h-10 w-10 items-center justify-center border transition-all"
          :class="isCloseModeActive
            ? 'border-white/30 bg-white/10 text-white'
            : 'border-transparent text-white/45 hover:border-white/20 hover:bg-white/5 hover:text-white'"
          :aria-label="tr('Режим закрытия сделки', 'Close trade mode')"
          @click="emit('toggle-close-mode')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5" aria-hidden="true">
            <path d="M4 7h16v13H4z" />
            <path d="m3 7 2-4h14l2 4M8 11h8" />
          </svg>
          <span class="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap border border-white/20 bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
            [ {{ tr('Режим закрытия', 'Close mode') }} ]
          </span>
        </button>

        <ExTradeEntryProtocolButton
          :model-value="selectedStrategyId"
          :strategies="strategies"
          :is-loading="isMatrixLoading"
          :close-signal="protocolCloseSignal"
          @update:model-value="emit('update-strategy', $event)"
        />

        <button
          type="button"
          class="group relative flex h-10 w-10 items-center justify-center border transition-all"
          :class="activePanel === 'matrix'
            ? 'border-white/30 bg-white/10 text-white'
            : 'border-transparent text-white/70 hover:border-white/20 hover:bg-white/5 hover:text-white'"
          :aria-label="tr('Протокол Матрицы', 'Matrix protocol')"
          @click="emit('open-panel', 'matrix')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
          <span class="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap border border-white/20 bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
            [ {{ tr('Протокол матрицы', 'Matrix protocol') }} ]
          </span>
        </button>

        <button
          type="button"
          class="group relative flex h-10 w-10 items-center justify-center border transition-all"
          :class="activePanel === 'journal'
            ? 'border-white/30 bg-white/10 text-white'
            : 'border-transparent text-white/70 hover:border-white/20 hover:bg-white/5 hover:text-white'"
          :aria-label="tr('Открыть журнал', 'Open journal')"
          @click="emit('open-panel', 'journal')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5" aria-hidden="true">
            <path d="M6 4h12v16H6z" />
            <path d="M9 8h6M9 12h6M9 16h4" />
          </svg>
          <span class="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap border border-white/20 bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
            [ {{ tr('Открыть журнал', 'Open journal') }} ]
          </span>
        </button>

        <button
          type="button"
          class="group relative flex h-10 w-10 items-center justify-center border transition-all"
          :class="activePanel === 'method'
            ? 'border-white/30 bg-white/10 text-white'
            : 'border-transparent text-white/70 hover:border-white/20 hover:bg-white/5 hover:text-white'"
          :aria-label="tr('Метод входа', 'Entry method')"
          @click="emit('open-panel', 'method')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5" aria-hidden="true">
            <path d="M4 17 10 11l4 4 6-8" />
            <path d="M16 7h4v4" />
            <path d="M4 20h16" />
          </svg>
          <span class="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap border border-white/20 bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
            [ {{ tr('Метод входа', 'Entry method') }} ]
          </span>
        </button>

        <button
          type="button"
          class="group relative flex h-10 w-10 items-center justify-center border border-white bg-white text-black transition-all hover:bg-white/80"
          :aria-label="tr('Выйти из сделки', 'Exit trade entry')"
          @click="emit('toggle-entry')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5" aria-hidden="true">
            <path d="M10 17l5-5-5-5" />
            <path d="M15 12H3" />
            <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
            <path d="M13 21h6a2 2 0 0 0 2-2" />
          </svg>
          <span class="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap border border-white/20 bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
            [ {{ tr('Выйти из сделки', 'Exit trade entry') }} ]
          </span>
        </button>
      </template>
    </div>
  </div>
</template>
