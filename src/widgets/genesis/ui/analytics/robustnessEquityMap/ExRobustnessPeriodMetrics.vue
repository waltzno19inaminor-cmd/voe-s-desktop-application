<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import type { EquityMapZone } from './equityStabilityMap'
import type { PeriodMetrics } from './periodMetrics'

const props = defineProps<{
  periods: EquityMapZone[]
  selectedPeriodId: string | null
  metrics: PeriodMetrics | null
}>()

const emit = defineEmits<{
  (event: 'select-period', periodId: string): void
}>()

const { locale } = useI18n()
const isRu = computed(() => locale.value === 'ru')
const label = (en: string, ru: string) => isRu.value ? ru : en
const numberValue = (value: number | null | undefined, suffix = '') => Number.isFinite(value) ? `${(value as number).toFixed(2)}${suffix}` : '—'
const percentValue = (value: number | null | undefined) => Number.isFinite(value) ? `${(value as number).toFixed(1)}%` : '—'
const moneyValue = (value: number | null | undefined) => Number.isFinite(value) ? `${(value as number) >= 0 ? '+' : ''}${(value as number).toFixed(2)}` : '—'
const durationValue = (value: number | null | undefined) => Number.isFinite(value) ? `${(value as number).toFixed(1)}h` : '—'
const selectedPeriodLabel = computed(() => {
  const index = props.periods.findIndex(period => period.id === props.selectedPeriodId)
  return index >= 0 ? `${label('Period', 'Период')} ${index + 1}` : label('Period', 'Период')
})
</script>

<template>
  <section class="mt-8 w-full border border-white/10 bg-white/[0.025] p-5 text-white">
    <div class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
      <div>
        <div class="text-[10px] font-black uppercase tracking-[0.22em]">{{ label('Selected period metrics', 'Метрики выбранного периода') }}</div>
        <div class="mt-2 text-[9px] uppercase tracking-widest opacity-45">{{ selectedPeriodLabel }}</div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button v-for="(period, index) in periods" :key="period.id" class="border px-2 py-1 text-[8px] uppercase tracking-widest transition-colors" :class="period.id === selectedPeriodId ? 'border-white/70 bg-white/10 text-white' : 'border-white/15 text-white/50 hover:border-white/40 hover:text-white'" @click="emit('select-period', period.id)">
          {{ label('P', 'П') }}{{ index + 1 }}
        </button>
      </div>
    </div>

    <template v-if="metrics">
      <div class="mt-5 grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4 lg:grid-cols-8">
        <div class="bg-black p-3"><div class="metric-label">{{ label('PnL', 'PnL') }}</div><div class="metric-value">{{ moneyValue(metrics.pnl) }}</div></div>
        <div class="bg-black p-3"><div class="metric-label">{{ label('Total R', 'Всего R') }}</div><div class="metric-value">{{ numberValue(metrics.totalR, 'R') }}</div></div>
        <div class="bg-black p-3"><div class="metric-label">{{ label('Win rate', 'Win rate') }}</div><div class="metric-value">{{ percentValue(metrics.winRate) }}</div></div>
        <div class="bg-black p-3"><div class="metric-label">{{ label('Average trade', 'Средняя сделка') }}</div><div class="metric-value">{{ moneyValue(metrics.averageTrade) }}</div></div>
        <div class="bg-black p-3"><div class="metric-label">{{ label('Trades', 'Сделки') }}</div><div class="metric-value">{{ metrics.tradeCount }}</div></div>
        <div class="bg-black p-3"><div class="metric-label">{{ label('Average duration', 'Средняя длительность') }}</div><div class="metric-value">{{ durationValue(metrics.averageDurationHours) }}</div></div>
        <div class="bg-black p-3"><div class="metric-label">{{ label('Average R', 'Среднее R') }}</div><div class="metric-value">{{ numberValue(metrics.averageR, 'R') }}</div></div>
        <div class="bg-black p-3"><div class="metric-label">{{ label('Planned R/R', 'Плановый R/R') }}</div><div class="metric-value">{{ numberValue(metrics.plannedRiskReward, 'R') }}</div></div>
      </div>

      <div class="mt-5 grid gap-5 lg:grid-cols-2">
        <div class="border border-white/10 p-4">
          <div class="metric-heading">{{ label('Execution / risk', 'Исполнение / риск') }}</div>
          <div class="mt-3 grid grid-cols-2 gap-3 text-[9px]">
            <div><span class="metric-label">{{ label('Average SL distance', 'Средний SL') }}</span><span class="metric-value">{{ numberValue(metrics.stopLossDistance) }}</span></div>
            <div><span class="metric-label">{{ label('Average TP distance', 'Средний TP') }}</span><span class="metric-value">{{ numberValue(metrics.takeProfitDistance) }}</span></div>
            <div><span class="metric-label">{{ label('Average risk', 'Средний риск') }}</span><span class="metric-value">{{ numberValue(metrics.risk) }}</span></div>
            <div><span class="metric-label">{{ label('Average reward', 'Средняя reward') }}</span><span class="metric-value">{{ numberValue(metrics.reward) }}</span></div>
          </div>
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <div class="border border-white/10 p-4">
            <div class="metric-heading">{{ label('Scenarios used', 'Использованные сценарии') }}</div>
            <div v-if="metrics.scenarios.length" class="mt-3 space-y-2">
              <div v-for="item in metrics.scenarios" :key="item.id" class="flex items-center justify-between gap-3 text-[9px]"><span class="truncate opacity-70">{{ item.name }}</span><span class="shrink-0 opacity-90">{{ item.trades }} · {{ percentValue(item.winRate) }}</span></div>
            </div>
            <div v-else class="mt-3 text-[9px] opacity-40">{{ label('No scenario data', 'Нет данных сценариев') }}</div>
          </div>
          <div class="border border-white/10 p-4">
            <div class="metric-heading">{{ label('Conditions used', 'Использованные условия') }}</div>
            <div v-if="metrics.conditions.length" class="mt-3 space-y-2">
              <div v-for="item in metrics.conditions" :key="item.id" class="flex items-center justify-between gap-3 text-[9px]"><span class="truncate opacity-70">{{ item.name }}</span><span class="shrink-0 opacity-90">{{ item.trades }} · {{ percentValue(item.winRate) }}</span></div>
            </div>
            <div v-else class="mt-3 text-[9px] opacity-40">{{ label('No condition data', 'Нет данных условий') }}</div>
          </div>
        </div>
      </div>
    </template>
    <div v-else class="mt-5 text-[10px] uppercase tracking-widest opacity-45">{{ label('No trades in this period', 'В этом периоде нет сделок') }}</div>
  </section>
</template>

<style scoped>
.metric-label {
  display: block;
  color: rgb(255 255 255 / 0.45);
  font-size: 8px;
  letter-spacing: 0.12em;
  line-height: 1.35;
  text-transform: uppercase;
}

.metric-value {
  display: block;
  margin-top: 0.4rem;
  font-size: 12px;
  font-weight: 700;
}

.metric-heading {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
</style>
