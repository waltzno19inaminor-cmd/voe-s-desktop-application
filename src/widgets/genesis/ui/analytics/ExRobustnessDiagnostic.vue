<script setup lang="ts">
import { toRefs } from 'vue'
import { useExRobustness } from '../../model/useExRobustness'
import { useI18n } from '~/shared/i18n/useI18n'
import { getTradeCashPnl } from '~/widgets/genesis/model/tradePnl'
import ExRobustnessTestCard from './ExRobustnessTestCard.vue'

const props = defineProps<{
  diagnosticStats: any
  strategyMetrics: any
  filteredTrades: any[]
}>()

const { diagnosticStats, strategyMetrics, filteredTrades } = toRefs(props)
const { locale } = useI18n()

const getFilteredTradesFn = () => filteredTrades.value
const getTradePnlFn = (trade: any) => getTradeCashPnl(trade, strategyMetrics.value?.initialDeposit || 1000)

const { robustnessTests } = useExRobustness(diagnosticStats, strategyMetrics, getFilteredTradesFn, getTradePnlFn)

const copy = (en: string, ru: string) => locale.value === 'ru' ? ru : en
</script>

<template>
  <div class="absolute inset-0 z-30 overflow-y-auto nier-bg-panel nier-text-primary font-mono selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
    <div class="mx-auto w-full max-w-7xl px-6 pb-40 pt-24 md:px-10">
      <div class="mb-10 border-b nier-border-primary pb-6">
        <div class="text-[9px] tracking-[0.42em] opacity-40">
          {{ copy('ROBUSTNESS TESTS', 'ТЕСТЫ УСТОЙЧИВОСТИ') }}
        </div>
        <h1 class="mt-4 text-xl font-light uppercase tracking-[0.18em]">
          {{ copy('Independent experiment cards', 'Независимые экспериментальные карточки') }}
        </h1>
        <p class="mt-4 max-w-3xl text-[10px] normal-case leading-relaxed tracking-normal opacity-55">
          {{ copy(
            'Each card applies one transformation to the observed trades and reports the resulting comparison. A status belongs to the declared test condition, not to the strategy as a whole.',
            'Каждая карточка применяет одно изменение к наблюдаемым сделкам и показывает сравнение результатов. Статус относится к условию конкретного теста, а не к стратегии в целом.'
          ) }}
        </p>
      </div>

      <div class="grid grid-cols-1 gap-5 text-[11px] uppercase tracking-widest lg:grid-cols-2">
        <ExRobustnessTestCard v-for="test in robustnessTests" :key="test.id" :test="test" />
      </div>
    </div>
  </div>
</template>

