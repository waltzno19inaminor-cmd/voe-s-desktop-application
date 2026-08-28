<script setup lang="ts">
import { computed, ref } from 'vue'
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
type FrequencyPieSlice = {
  id: string
  name: string
  trades: number
  pnl: number
  share: number
  offset: number
  color: string
}
type FrequencyPie = {
  key: 'scenarios' | 'conditions'
  title: string
  slices: FrequencyPieSlice[]
  totalTrades: number
}
const frequencyPieColors = ['#f8fafc', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#e2e8f0', '#7c8a9b', '#b8c4d1']
const buildFrequencyPie = (groups: CapitalGrowthRateGroup[], key: FrequencyPie['key'], title: string): FrequencyPie => {
  const totalTrades = groups.reduce((sum, item) => sum + item.trades, 0)
  let offset = 0
  const slices = [...groups]
    .filter(item => item.trades > 0)
    .sort((left, right) => right.trades - left.trades || left.name.localeCompare(right.name))
    .map((item, index) => {
      const share = totalTrades ? item.trades / totalTrades * 100 : 0
      const slice = {
        id: item.id,
        name: item.name,
        trades: item.trades,
        pnl: item.pnl,
        share,
        offset,
        color: frequencyPieColors[index % frequencyPieColors.length]!
      }
      offset += share
      return slice
    })

  return { key, title, slices, totalTrades }
}
const frequencyPies = computed<FrequencyPie[]>(() => [
  buildFrequencyPie(breakdown.value.scenarios, 'scenarios', label('Scenarios', 'Сценарии')),
  buildFrequencyPie(breakdown.value.conditions, 'conditions', label('Conditions', 'Условия'))
])
const frequencyPieChartSize = 280
const frequencyPieCenter = frequencyPieChartSize / 2
const frequencyPieRadius = 94
const hoveredFrequencyPieSlice = ref<(FrequencyPieSlice & { pieTitle: string }) | null>(null)
const frequencyPieTooltipPosition = ref({ x: 0, y: 0 })
const handleFrequencyPieHover = (event: MouseEvent, pie: FrequencyPie, slice: FrequencyPieSlice) => {
  hoveredFrequencyPieSlice.value = { ...slice, pieTitle: pie.title }
  frequencyPieTooltipPosition.value = { x: event.clientX, y: event.clientY }
}
const clearFrequencyPieHover = () => {
  hoveredFrequencyPieSlice.value = null
}
const formatted = (value: number) => Number.isFinite(value) ? value.toFixed(2) : '—'
const formattedFrequency = (value: number) => Number.isFinite(value) ? `${value.toFixed(1)}%` : '—'
const formattedMoney = (value: number) => {
  if (!Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}$${Math.abs(value).toFixed(2)}`
}
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
        <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ label('I · Usage frequency', 'I · Частота использования') }}</div>
        <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ label('The charts show how often scenarios and conditions were used in trades. Each slice represents one scenario or condition.', 'Схемы показывают, как часто сценарии и условия использовались в сделках. Каждый сектор соответствует одному сценарию или условию.') }}</div>
        <div class="mt-8 grid gap-8 sm:grid-cols-2">
          <div v-for="pie in frequencyPies" :key="pie.key" class="min-w-0">
            <div class="font-serif text-[12px] uppercase tracking-[0.18em] text-white/75">{{ pie.title }}</div>
            <div v-if="pie.slices.length" class="mt-4" @mouseleave="clearFrequencyPieHover">
              <svg :viewBox="`0 0 ${frequencyPieChartSize} ${frequencyPieChartSize}`" class="mx-auto h-[18rem] w-full sm:h-[22rem]" :aria-label="pie.title" role="img" @mouseleave="clearFrequencyPieHover">
                <circle :cx="frequencyPieCenter" :cy="frequencyPieCenter" :r="frequencyPieRadius" fill="none" stroke="white" stroke-opacity="0.08" stroke-width="38" />
                <circle
                  v-for="slice in pie.slices"
                  :key="slice.id"
                  :cx="frequencyPieCenter"
                  :cy="frequencyPieCenter"
                  :r="frequencyPieRadius"
                  class="cursor-pointer transition-opacity duration-150 hover:opacity-80"
                  fill="none"
                  :stroke="slice.color"
                  stroke-width="34"
                  :stroke-dasharray="`${slice.share} ${100 - slice.share}`"
                  :stroke-dashoffset="-slice.offset"
                  pathLength="100"
                  transform="rotate(-90 140 140)"
                  @mouseenter="handleFrequencyPieHover($event, pie, slice)"
                  @mousemove="handleFrequencyPieHover($event, pie, slice)"
                  @mouseleave="clearFrequencyPieHover"
                />
              </svg>
              <div class="mx-auto mt-4 max-w-md space-y-2">
                <div v-for="slice in pie.slices" :key="`${pie.key}-${slice.id}`" class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 font-mono text-[11px]">
                  <span class="h-2.5 w-2.5" :style="{ backgroundColor: slice.color }"></span>
                  <span class="truncate font-sans normal-case text-white/85" :title="formattedGroupName(slice.name)">{{ formattedGroupName(slice.name) }}</span>
                  <span class="text-right text-white/65">{{ slice.trades }} · {{ formatted(slice.share) }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Teleport to="body">
          <div v-if="hoveredFrequencyPieSlice" class="pointer-events-none fixed z-[2147483647] -translate-x-1/2 -translate-y-full border border-white/35 bg-black/95 px-4 py-3 font-mono text-[11px] font-semibold leading-relaxed text-white shadow-[0_10px_30px_rgba(0,0,0,0.55)]" :style="{ left: `${frequencyPieTooltipPosition.x}px`, top: `${frequencyPieTooltipPosition.y - 14}px` }" role="tooltip">
            <div class="mb-2 border-b border-white/25 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/95">{{ hoveredFrequencyPieSlice.name }}</div>
            <div class="flex min-w-[190px] items-center justify-between gap-5"><span class="text-white/85">{{ hoveredFrequencyPieSlice.pieTitle }}</span><span class="font-bold text-white">{{ hoveredFrequencyPieSlice.trades }}</span></div>
            <div class="mt-1 flex min-w-[190px] items-center justify-between gap-5"><span class="text-white/85">{{ label('Share of trades', 'Доля сделок') }}</span><span class="font-bold text-white">{{ formatted(hoveredFrequencyPieSlice.share) }}%</span></div>
            <div class="mt-1 flex min-w-[190px] items-center justify-between gap-5"><span class="text-white/85">{{ label('Total profit', 'Итоговая прибыль') }}</span><span class="font-bold text-white">{{ formattedMoney(hoveredFrequencyPieSlice.pnl) }}</span></div>
          </div>
        </Teleport>
      </div>

      <div v-if="breakdownRows.length" class="mt-12">
        <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ label('II · Detailed results by scenario and condition usage', 'II · Детализация результатов по использованию сценариев и условий') }}</div>
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
