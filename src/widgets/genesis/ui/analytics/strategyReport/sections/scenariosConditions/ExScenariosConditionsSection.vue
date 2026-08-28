<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import { buildCapitalGrowthBreakdown, type CapitalGrowthRateGroup } from '../profitsLosses/analytics/capitalGrowthRate'
import ExStrategyReportPageNumber from '../../components/auxiliary/ExStrategyReportPageNumber.vue'
import ExStrategyReportSectionHeading from '../../components/auxiliary/ExStrategyReportSectionHeading.vue'
import ExStrategyReportSectionSubheading from '../../components/auxiliary/ExStrategyReportSectionSubheading.vue'

const props = defineProps<{
  trades: Record<string, any>[]
  getTradePnl: (trade: Record<string, any>) => number
  initialCapital?: number
}>()

const { locale } = useI18n()
const isRu = computed(() => locale.value === 'ru')
const label = (en: string, ru: string) => isRu.value ? ru : en
const breakdown = computed(() => buildCapitalGrowthBreakdown(props.trades, props.getTradePnl, props.initialCapital || 1000))
type BreakdownRow = CapitalGrowthRateGroup & { kind: 'scenario' | 'condition' }
const breakdownRows = computed<BreakdownRow[]>(() => [
  ...breakdown.value.scenarios.map(item => ({ ...item, kind: 'scenario' as const })),
  ...breakdown.value.conditions.map(item => ({ ...item, kind: 'condition' as const }))
])
const formatted = (value: number) => Number.isFinite(value) ? value.toFixed(2) : '—'
const formattedFrequency = (value: number) => Number.isFinite(value) ? `${value.toFixed(1)}%` : '—'
const formattedGroupName = (name: string) => {
  const normalized = name.trim().toLocaleLowerCase()
  return normalized ? `${normalized.charAt(0).toLocaleUpperCase()}${normalized.slice(1)}` : name
}
const breakdownRowKey = (item: BreakdownRow) => `${item.kind}-${item.id}`
const bestBreakdownRowKey = computed(() => {
  if (breakdownRows.value.length < 2) return null
  const best = breakdownRows.value.reduce((current, item) => item.averageRate > current.averageRate ? item : current)
  return breakdownRowKey(best)
})
const worstBreakdownRowKey = computed(() => {
  if (breakdownRows.value.length < 2) return null
  const worst = breakdownRows.value.reduce((current, item) => item.averageRate < current.averageRate ? item : current)
  return breakdownRowKey(worst)
})
const breakdownRowClass = (item: BreakdownRow) => {
  const key = breakdownRowKey(item)
  if (key === bestBreakdownRowKey.value) return 'bg-white/[0.14] hover:bg-white/[0.18]'
  if (key === worstBreakdownRowKey.value) return 'bg-white/[0.06] hover:bg-white/[0.1]'
  return 'hover:bg-white/[0.04]'
}
</script>

<template>
  <section id="report-section-scenarios-conditions" class="min-h-screen px-[clamp(1.5rem,7vw,8rem)] py-16 text-white sm:py-24">
    <div class="mx-auto max-w-5xl">
      <ExStrategyReportPageNumber page="04" total="07" />
      <div class="mt-12">
        <ExStrategyReportSectionHeading>{{ isRu ? 'Сценарии и условия' : 'Scenarios & Conditions' }}</ExStrategyReportSectionHeading>
        <ExStrategyReportSectionSubheading muted>{{ isRu ? 'Результаты в разрезе контекста, записанного в сделках.' : 'Results grouped by the context recorded in trades.' }}</ExStrategyReportSectionSubheading>
      </div>

      <div v-if="breakdownRows.length" class="mt-12">
        <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ label('I · Results by scenario and condition usage', 'I · Результаты по использованию сценариев и условий') }}</div>
        <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ label('Each row shows how often a scenario or condition was used and how the associated results were distributed.', 'В каждой строке показано, как часто использовались сценарий или условие и какими были связанные с ними результаты.') }}</div>
        <div class="mt-8 overflow-x-auto border border-white/10 bg-white/[0.025]">
          <table class="w-full min-w-[760px] border-collapse font-mono text-[11px]">
            <thead class="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-white/70">
              <tr>
                <th class="px-4 py-3 text-left font-semibold">{{ label('Name', 'Название') }}</th>
                <th class="px-2 py-3 text-center font-semibold">{{ label('Type', 'Тип') }}</th>
                <th class="px-2 py-3 text-center font-semibold">{{ label('Freq.', 'Частота') }}</th>
                <th class="px-2 py-3 text-center font-semibold">Win Rate</th>
                <th class="px-2 py-3 text-center font-semibold">{{ label('Avg.', 'Сред.') }}</th>
                <th class="px-2 py-3 text-center font-semibold">{{ label('Max', 'Макс.') }}</th>
                <th class="px-2 py-3 text-center font-semibold">{{ label('Min', 'Мин.') }}</th>
                <th class="px-4 py-3 text-center font-semibold">{{ label('Impact', 'Вклад') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in breakdownRows" :key="breakdownRowKey(item)" class="border-b border-white/5 last:border-0" :class="breakdownRowClass(item)">
                <td class="max-w-[220px] truncate px-4 py-4 text-left font-sans text-[12px] normal-case text-white/90" :title="formattedGroupName(item.name)">{{ formattedGroupName(item.name) }}</td>
                <td class="px-2 py-4 text-center text-[10px] tracking-[0.08em] text-white/70">{{ item.kind === 'scenario' ? label('Scen.', 'Сцен.') : label('Cond.', 'Усл.') }}</td>
                <td class="px-2 py-4 text-center text-white/85">{{ formattedFrequency(item.frequency) }}</td>
                <td class="px-2 py-4 text-center font-semibold text-white">{{ item.winRate === null ? '—' : `${formatted(item.winRate)}%` }}</td>
                <td class="px-2 py-4 text-center font-semibold text-white">{{ formatted(item.averageRate) }}%</td>
                <td class="px-2 py-4 text-center font-semibold text-white">{{ formatted(item.maxRate) }}%</td>
                <td class="px-2 py-4 text-center font-semibold text-white">{{ formatted(item.minRate) }}%</td>
                <td class="px-4 py-4 text-center font-semibold text-white">{{ formatted(item.contribution) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else class="mt-12 font-serif text-base text-white/55">{{ label('No scenario or condition data available.', 'Нет данных по сценариям или условиям.') }}</div>
    </div>
  </section>
</template>
