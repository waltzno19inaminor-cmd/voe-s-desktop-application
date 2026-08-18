<template>
  <ExTooltip :is-dark="isDark" variant="basic" class="w-full">
    <template #trigger>
      <div
        class="w-full flex flex-col space-y-1 group cursor-pointer select-none"
        :data-correlation-metric-id="`${metric.category}:${metric.key}`"
        @click="handleClick"
      >
        <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity truncate">
          {{ displayLabel }}
        </span>
        <div class="flex flex-col justify-center space-y-0.5 py-1">
          <span class="text-xl font-mono font-black truncate" :class="displayValueClass">
            {{ displayValue }}
          </span>
          <span v-if="displaySub" class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60 truncate">
            {{ displaySub }}
          </span>
        </div>
      </div>
    </template>

    <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
      <div v-if="displayDesc">{{ displayDesc }}</div>
      
      <div v-if="displayFormula" class="pt-2 border-t nier-border-primary">
        <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">
          {{ isRu ? 'Формула' : 'Formula' }}
        </span>
        <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
          {{ displayFormula }}
        </code>
      </div>

      <div v-if="metric.benchmarks && metric.benchmarks.length > 0">
        <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">
          {{ isRu ? 'Бенчмарк' : 'Benchmark' }}
        </span>
        <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
          <div v-for="(b, idx) in metric.benchmarks" :key="idx" class="flex justify-between items-center">
            <span class="opacity-70">{{ b.label }}</span>
            <span class="font-bold" :class="b.class">{{ b.eval }}</span>
          </div>
        </div>
      </div>
      <div v-else-if="displayBenchmark">
        <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">
          {{ isRu ? 'Бенчмарк' : 'Benchmark' }}
        </span>
        <div class="text-[9px] bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium opacity-70">
          {{ displayBenchmark }}
        </div>
      </div>

      <div v-if="displayEval" class="pt-2 border-t nier-border-primary flex items-center justify-between">
        <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">
          {{ isRu ? 'Оценка' : 'Evaluation' }}
        </span>
        <span
          class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
          :class="displayEvalClass"
        >
          {{ displayEval }}
        </span>
      </div>
    </div>
  </ExTooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import type { MetricConfig, MetricValuesRecord } from '../model/metric.types'
import ExTooltip from '~/shared/ui/ExTooltip.vue'

const props = withDefaults(
  defineProps<{
    metric: MetricConfig;
    values?: MetricValuesRecord;
    isDark?: boolean;
    minimal?: boolean;
    transparent?: boolean;
    selected?: boolean;
  }>(),
  {
    values: () => ({}),
    isDark: true,
    minimal: false,
    transparent: false,
    selected: false
  }
)

const emit = defineEmits<{
  (e: 'select', key: string): void;
}>()

const { locale } = useI18n()
const isRu = computed(() => locale.value === 'ru')

const displayLabel = computed(() => {
  return (props.metric.label || props.metric.key).replace(/_/g, ' ')
})

const displaySub = computed(() => {
  return props.metric.sub || ''
})

const displayValue = computed(() => {
  const m = props.metric
  const vals = props.values || {}

  if (typeof m.valStr === 'function') {
    try {
      return m.valStr(vals)
    } catch {
      // fallback
    }
  }
  if (m.formattedValue !== undefined && m.formattedValue !== null) {
    return m.formattedValue
  }
  if (m.value !== undefined && m.value !== null) {
    const prefix = m.prefix || ''
    const suffix = m.suffix || (m.unit ? ` ${m.unit}` : '')
    return `${prefix}${m.value}${suffix}`
  }
  return '—'
})

const displayValueClass = computed(() => {
  if (typeof props.metric.colorClass === 'function') {
    try {
      return props.metric.colorClass(props.values || {})
    } catch {
      return 'nier-text-primary'
    }
  }
  return props.metric.evalClass || 'nier-text-primary'
})

const displayDesc = computed(() => {
  return props.metric.desc || ''
})

const displayFormula = computed(() => {
  return props.metric.formula || ''
})

const displayBenchmark = computed(() => {
  return props.metric.benchmarkText || ''
})

const displayEval = computed(() => {
  const m = props.metric
  if (typeof m.evalStr === 'function') {
    try {
      return m.evalStr(props.values || {})
    } catch {
      return ''
    }
  }
  return m.evalStr || m.status || ''
})

const displayEvalClass = computed(() => {
  const m = props.metric
  if (typeof m.evalClass === 'function') {
    try {
      return m.evalClass(props.values || {})
    } catch {
      return ''
    }
  }
  return m.evalClass || 'text-emerald-500'
})

const handleClick = () => {
  emit('select', props.metric.key)
}
</script>

<style scoped>
/* Exact 1:1 original styling leveraging project design tokens */
</style>
