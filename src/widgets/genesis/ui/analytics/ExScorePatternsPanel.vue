<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'

interface ScorePattern {
  label: string
  value: string
  unit: string
  frequency: number | null
  frequencySummary?: boolean
  insufficientData: boolean
  description: string
  benchmark: string
}

const props = withDefaults(defineProps<{
  patterns?: ScorePattern[]
  patternMode?: 'high' | 'low'
}>(), {
  patterns: () => [],
  patternMode: 'high'
})

const { locale } = useI18n()
const patterns = computed(() => props.patterns)
const patternMode = computed(() => props.patternMode)

const formatDisplayLabel = (value: unknown) => String(value ?? '').replace(/_/g, ' ')
</script>

<template>
  <section class="flex flex-col">
    <div class="flex flex-wrap items-end justify-between gap-4 border-b nier-border-primary px-2 py-4">
      <div>
        <div class="text-[9px] font-mono font-black uppercase tracking-[0.32em] opacity-45">
          {{ patternMode === 'high' ? 'High score' : 'Low score' }}
        </div>
        <h3 class="mt-2 text-sm font-mono font-black uppercase tracking-[0.24em]">
          {{ locale === 'ru' ? 'Паттерны по Score' : 'Score Patterns' }}
        </h3>
        <p class="mt-2 max-w-2xl text-[9px] font-mono uppercase leading-relaxed tracking-[0.16em] opacity-45">
          {{ locale === 'ru'
            ? 'Повторяющиеся диапазоны показателей для группы сделок с похожим score.'
            : 'Recurring metric ranges for trades in the same score cohort.' }}
        </p>
      </div>
      <span class="border nier-border-primary px-3 py-2 text-[9px] font-mono font-black uppercase tracking-[0.18em] opacity-60">
        {{ patterns.length }} {{ locale === 'ru' ? 'паттернов' : 'patterns' }}
      </span>
    </div>

    <div class="flex max-h-[420px] flex-col overflow-y-auto pr-1">
      <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,auto)] gap-3 border-b nier-border-primary px-2 py-3">
        <span class="text-[9px] font-mono uppercase tracking-[0.2em] opacity-45">
          {{ patternMode === 'high'
            ? (locale === 'ru' ? 'Закономерности high score' : 'High score patterns')
            : (locale === 'ru' ? 'Закономерности low score' : 'Low score patterns') }}
        </span>
        <span class="text-right text-[9px] font-mono uppercase tracking-[0.16em] opacity-45">
          {{ locale === 'ru' ? 'диапазон / частота' : 'range / frequency' }}
        </span>
      </div>
      <div
        v-for="(pattern, patternIndex) in patterns"
        :key="`${pattern.label}-${pattern.value}-${patternIndex}`"
        class="block w-full"
      >
        <div class="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,auto)] gap-3 border-b nier-border-primary px-2 py-3 transition-colors hover:bg-black/[0.025] dark:hover:bg-white/[0.035]">
          <span class="min-w-0">
            <span class="block truncate text-[11px] font-mono font-black uppercase tracking-[0.16em] opacity-75">{{ formatDisplayLabel(pattern.label) }}</span>
            <span v-if="pattern.description" class="mt-1 block truncate text-[9px] font-mono uppercase tracking-[0.1em] opacity-55">{{ pattern.description }}</span>
          </span>
          <span class="max-w-[220px] text-right text-[10px] font-mono font-black nier-text-primary">
            <span v-if="pattern.insufficientData" class="block text-[8px] uppercase tracking-[0.14em] opacity-55">
              {{ locale === 'ru' ? 'Недостаточно данных' : 'Insufficient data' }}
            </span>
            <template v-else>
              <span class="block">{{ pattern.value }}</span>
              <span v-if="!pattern.frequencySummary" class="mt-1 block text-[8px] font-mono uppercase tracking-[0.12em] opacity-45">{{ pattern.frequency }}%</span>
            </template>
          </span>
        </div>
      </div>
      <div v-if="patterns.length === 0" class="border-b nier-border-primary px-2 py-3">
        <span class="text-[9px] font-mono uppercase tracking-[0.2em] opacity-45">
          {{ locale === 'ru' ? 'Недостаточно данных' : 'Insufficient data' }}
        </span>
      </div>
    </div>
  </section>
</template>
