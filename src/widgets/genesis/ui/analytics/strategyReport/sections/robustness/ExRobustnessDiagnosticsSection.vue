<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import { orderEquityMapTrades } from '../../../robustnessEquityMap/equityStabilityMap'
import ExStrategyReportPageNumber from '../../components/auxiliary/ExStrategyReportPageNumber.vue'
import ExStrategyReportSectionHeading from '../../components/auxiliary/ExStrategyReportSectionHeading.vue'
import ExStrategyReportSectionSubheading from '../../components/auxiliary/ExStrategyReportSectionSubheading.vue'

const props = defineProps<{
  trades: Record<string, any>[]
  getTradePnl: (trade: Record<string, any>) => number
  initialCapital?: number | null
}>()

const { locale } = useI18n()
const isRu = computed(() => locale.value === 'ru')
const label = (en: string, ru: string) => isRu.value ? ru : en
const capital = computed(() => {
  const value = Number(props.initialCapital)
  return Number.isFinite(value) && value > 0 ? value : 1000
})

type OrderedTrade = {
  trade: Record<string, any>
  pnl: number
  timestamp: number
  sourceIndex: number
}

const orderedTrades = computed<OrderedTrade[]>(() => orderEquityMapTrades(props.trades, props.getTradePnl) as OrderedTrade[])
const formatMoney = (value: number) => {
  if (!Number.isFinite(value)) return '—'
  return `${value >= 0 ? '+' : '-'}$${Math.abs(value).toFixed(2)}`
}
const formatPercent = (value: number) => {
  if (!Number.isFinite(value)) return '—'
  return `${value >= 0 ? '+' : '-'}${Math.abs(value).toFixed(2)}%`
}
const formatRatio = (value: number) => Number.isFinite(value) ? `${value.toFixed(1)}%` : '—'

const netPnlFor = (items: OrderedTrade[]) => items.reduce((sum, item) => sum + item.pnl, 0)
const maxDrawdownFor = (items: OrderedTrade[], startingCapital = capital.value) => {
  let equity = startingCapital
  let highWater = startingCapital
  let maxDrawdown = 0
  items.forEach(item => {
    equity += item.pnl
    highWater = Math.max(highWater, equity)
    maxDrawdown = Math.max(maxDrawdown, highWater - equity)
  })
  return maxDrawdown
}
const winRateFor = (items: OrderedTrade[]) => items.length
  ? items.filter(item => item.pnl > 0).length / items.length * 100
  : 0

const positiveTrades = computed(() => orderedTrades.value.filter(item => item.pnl > 0).sort((left, right) => right.pnl - left.pnl))
const stressRows = computed(() => [0, 1, 3, 5]
  .filter(removeCount => removeCount === 0 || positiveTrades.value.length >= removeCount)
  .map(removeCount => {
    const removed = new Set(positiveTrades.value.slice(0, removeCount).map(item => item.sourceIndex))
    const remaining = removeCount ? orderedTrades.value.filter(item => !removed.has(item.sourceIndex)) : orderedTrades.value
    const netPnl = netPnlFor(remaining)
    return {
      removeCount,
      title: removeCount ? label(`Without top ${removeCount}`, `Без топ-${removeCount}`) : label('Baseline', 'Базовый результат'),
      netPnl,
      maxDrawdown: maxDrawdownFor(remaining)
    }
  }))
const stressScale = computed(() => Math.max(1, ...stressRows.value.map(row => Math.abs(row.netPnl))))
const stressConclusion = computed(() => {
  const strictest = stressRows.value[stressRows.value.length - 1]
  if (!strictest) return label('Not enough data for a stress test.', 'Недостаточно данных для стресс-теста.')
  return strictest.netPnl >= 0
    ? label('The result remains positive after removing the most profitable trades.', 'Результат остаётся положительным даже после удаления самых прибыльных сделок.')
    : label('The result turns negative after removing the most profitable trades.', 'После удаления самых прибыльных сделок результат становится отрицательным.')
})

type PeriodSummary = {
  label: string
  trades: number
  netPnl: number
  winRate: number
  maxDrawdown: number
}
const periodSummaries = computed<PeriodSummary[]>(() => {
  const count = orderedTrades.value.length >= 6 ? 3 : Math.max(1, Math.min(3, orderedTrades.value.length))
  if (!orderedTrades.value.length) return []
  const size = Math.ceil(orderedTrades.value.length / count)
  return Array.from({ length: count }, (_, index) => {
    const items = orderedTrades.value.slice(index * size, (index + 1) * size)
    return {
      label: label(`Period ${index + 1}`, `Период ${index + 1}`),
      trades: items.length,
      netPnl: netPnlFor(items),
      winRate: winRateFor(items),
      maxDrawdown: maxDrawdownFor(items)
    }
  }).filter(period => period.trades > 0)
})
const periodScale = computed(() => Math.max(1, ...periodSummaries.value.map(period => Math.abs(period.netPnl))))

const seededRandom = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}
const percentile = (values: number[], ratio: number) => {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)))] ?? capital.value
}
type MonteCarloSummary = {
  low: number[]
  median: number[]
  high: number[]
  minimumEquities: number[]
  drawdowns: number[]
}
const monteCarlo = computed<MonteCarloSummary | null>(() => {
  const pnls = orderedTrades.value.map(item => item.pnl)
  if (!pnls.length) return null
  const simulations = 300
  const paths: number[][] = []
  const minimumEquities: number[] = []
  const drawdowns: number[] = []

  for (let simulation = 0; simulation < simulations; simulation += 1) {
    const random = seededRandom(9281 + simulation * 7919)
    const shuffled = [...pnls]
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1))
      const value = shuffled[index]!
      shuffled[index] = shuffled[swapIndex]!
      shuffled[swapIndex] = value
    }
    let equity = capital.value
    let highWater = equity
    let maxDrawdown = 0
    let minimumEquity = equity
    const path: number[] = []
    shuffled.forEach(pnl => {
      equity += pnl
      minimumEquity = Math.min(minimumEquity, equity)
      highWater = Math.max(highWater, equity)
      maxDrawdown = Math.max(maxDrawdown, highWater - equity)
      path.push(equity)
    })
    paths.push(path)
    minimumEquities.push(minimumEquity)
    drawdowns.push(maxDrawdown)
  }

  return {
    low: pnls.map((_, index) => percentile(paths.map(path => path[index]!), 0.05)),
    median: pnls.map((_, index) => percentile(paths.map(path => path[index]!), 0.5)),
    high: pnls.map((_, index) => percentile(paths.map(path => path[index]!), 0.95)),
    minimumEquities,
    drawdowns
  }
})
const monteCarloRuinProbability = computed(() => {
  if (!monteCarlo.value) return 0
  return monteCarlo.value.minimumEquities.filter(value => value <= 0).length / monteCarlo.value.minimumEquities.length * 100
})
const monteCarloMedianDrawdown = computed(() => {
  if (!monteCarlo.value) return 0
  return percentile(monteCarlo.value.drawdowns, 0.5)
})
const monteCarloDrawdownProbability = computed(() => {
  if (!monteCarlo.value) return 0
  const historical = maxDrawdownFor(orderedTrades.value)
  return monteCarlo.value.drawdowns.filter(value => value > historical).length / monteCarlo.value.drawdowns.length * 100
})
const monteCarloWidth = 1000
const monteCarloHeight = 300
const monteCarloPadding = { top: 24, right: 24, bottom: 34, left: 72 }
const monteCarloPlotWidth = monteCarloWidth - monteCarloPadding.left - monteCarloPadding.right
const monteCarloPlotHeight = monteCarloHeight - monteCarloPadding.top - monteCarloPadding.bottom
const monteCarloValues = computed(() => monteCarlo.value ? [...monteCarlo.value.low, ...monteCarlo.value.high, capital.value] : [capital.value])
const monteCarloMin = computed(() => Math.min(...monteCarloValues.value) - Math.max(1, (Math.max(...monteCarloValues.value) - Math.min(...monteCarloValues.value)) * 0.08))
const monteCarloMax = computed(() => Math.max(...monteCarloValues.value) + Math.max(1, (Math.max(...monteCarloValues.value) - Math.min(...monteCarloValues.value)) * 0.08))
const monteCarloXFor = (index: number) => orderedTrades.value.length <= 1
  ? monteCarloPadding.left + monteCarloPlotWidth / 2
  : monteCarloPadding.left + index / (orderedTrades.value.length - 1) * monteCarloPlotWidth
const monteCarloYFor = (value: number) => monteCarloPadding.top + (1 - (value - monteCarloMin.value) / Math.max(1e-9, monteCarloMax.value - monteCarloMin.value)) * monteCarloPlotHeight
const monteCarloPath = (values: number[]) => values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${monteCarloXFor(index).toFixed(2)} ${monteCarloYFor(value).toFixed(2)}`).join(' ')
const monteCarloAreaPath = computed(() => {
  if (!monteCarlo.value) return ''
  const low = monteCarlo.value.low
  const high = monteCarlo.value.high
  return `${monteCarloPath(low)} ${high.slice().reverse().map((value, reverseIndex) => {
    const index = high.length - 1 - reverseIndex
    return `L ${monteCarloXFor(index).toFixed(2)} ${monteCarloYFor(value).toFixed(2)}`
  }).join(' ')} Z`
})

const lossStats = computed(() => {
  let current = 0
  let currentPnl = 0
  let longest = 0
  let longestPnl = 0
  orderedTrades.value.forEach(item => {
    if (item.pnl < 0) {
      current += 1
      currentPnl += item.pnl
      if (current > longest) {
        longest = current
        longestPnl = currentPnl
      }
    } else {
      current = 0
      currentPnl = 0
    }
  })
  let trailing = 0
  let trailingPnl = 0
  for (let index = orderedTrades.value.length - 1; index >= 0 && orderedTrades.value[index]!.pnl < 0; index -= 1) {
    trailing += 1
    trailingPnl += orderedTrades.value[index]!.pnl
  }
  return { longest, longestPnl, trailing, trailingPnl }
})
const lossSequence = computed(() => orderedTrades.value.slice(-40).map(item => ({
  index: item.sourceIndex + 1,
  pnl: item.pnl
})))

type AssetSummary = { asset: string; trades: number; pnl: number; share: number }
const resolveAsset = (trade: Record<string, any>) => String(
  trade?.asset ?? trade?.symbol ?? trade?.ticker ?? trade?.instrument ?? trade?.coin ?? trade?.label ?? 'UNKNOWN'
).split('[')[0]!.split('|')[0]!.trim().toUpperCase() || 'UNKNOWN'
const assetConcentration = computed<AssetSummary[]>(() => {
  const groups = new Map<string, { trades: number; pnl: number }>()
  orderedTrades.value.forEach(item => {
    const asset = resolveAsset(item.trade)
    const group = groups.get(asset) ?? { trades: 0, pnl: 0 }
    group.trades += 1
    group.pnl += item.pnl
    groups.set(asset, group)
  })
  const grossProfit = [...groups.values()].reduce((sum, group) => sum + Math.max(0, group.pnl), 0)
  return [...groups.entries()]
    .map(([asset, group]) => ({ asset, ...group, share: grossProfit ? Math.max(0, group.pnl) / grossProfit * 100 : 0 }))
    .sort((left, right) => right.share - left.share || right.pnl - left.pnl)
    .slice(0, 5)
})
const concentrationTop1 = computed(() => assetConcentration.value.slice(0, 1).reduce((sum, item) => sum + item.share, 0))
const concentrationTop3 = computed(() => assetConcentration.value.slice(0, 3).reduce((sum, item) => sum + item.share, 0))
const concentrationTrade = computed(() => {
  const grossProfit = orderedTrades.value.reduce((sum, item) => sum + Math.max(0, item.pnl), 0)
  const top = positiveTrades.value[0]
  return grossProfit && top ? top.pnl / grossProfit * 100 : 0
})
</script>

<template>
  <section id="report-section-robustness" class="min-h-screen px-[clamp(1.5rem,7vw,8rem)] py-16 text-white sm:py-24">
    <div class="mx-auto max-w-5xl">
      <ExStrategyReportPageNumber page="06" total="07" />
      <div class="mt-12">
        <ExStrategyReportSectionHeading>{{ label('Robustness Diagnostics', 'Диагностика устойчивости') }}</ExStrategyReportSectionHeading>
        <ExStrategyReportSectionSubheading muted>{{ label('Independent checks of how dependent the result is on trade selection, timing and concentration.', 'Проверки того, насколько результат зависит от отдельных сделок, порядка и концентрации.') }}</ExStrategyReportSectionSubheading>
      </div>

      <div class="mt-12">
        <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ label('I · Stress test of the best trades', 'I · Стресс-тест лучших сделок') }}</div>
        <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ label('The result is recalculated after removing the most profitable trades.', 'Результат пересчитывается после удаления самых прибыльных сделок.') }}</div>
        <div class="mt-5 space-y-4 bg-white/[0.025] p-4 sm:p-5">
          <div v-for="row in stressRows" :key="row.removeCount" class="font-mono text-[11px]">
            <div class="flex items-center justify-between gap-4"><span class="text-white/75">{{ row.title }}</span><span class="font-semibold text-white">{{ formatMoney(row.netPnl) }}</span></div>
            <div class="mt-2 h-2 bg-white/[0.08]"><div class="h-2" :class="row.netPnl >= 0 ? 'bg-white/80' : 'bg-slate-500'" :style="{ width: `${Math.max(2, Math.abs(row.netPnl) / stressScale * 100)}%` }" /></div>
            <div class="mt-1 text-white/45">{{ label('Max drawdown', 'Максимальная просадка') }}: {{ formatMoney(-row.maxDrawdown) }}</div>
          </div>
          <div class="border-t border-white/10 pt-4 font-serif text-sm text-white/70">{{ stressConclusion }}</div>
        </div>
      </div>

      <div class="mt-12">
        <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ label('II · Stability by periods', 'II · Стабильность по периодам') }}</div>
        <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ label('The full history is split into equal chronological periods to reveal changes in performance.', 'История разделена на равные последовательные периоды, чтобы увидеть изменения результата.') }}</div>
        <div v-if="periodSummaries.length" class="mt-5 grid gap-4 sm:grid-cols-3">
          <div v-for="period in periodSummaries" :key="period.label" class="border border-white/10 bg-white/[0.025] p-4 font-mono text-[11px]">
            <div class="text-sm font-semibold text-white">{{ period.label }}</div>
            <div class="mt-4 h-24 flex items-end bg-white/[0.04]"><div class="w-full" :class="period.netPnl >= 0 ? 'bg-white/80' : 'bg-slate-500'" :style="{ height: `${Math.max(4, Math.abs(period.netPnl) / periodScale * 100)}%` }" /></div>
            <div class="mt-3 flex justify-between gap-3"><span class="text-white/55">{{ label('Net result', 'Итог') }}</span><span class="font-semibold text-white">{{ formatMoney(period.netPnl) }}</span></div>
            <div class="mt-1 flex justify-between gap-3"><span class="text-white/55">{{ label('Win rate', 'Win rate') }}</span><span class="text-white/85">{{ formatRatio(period.winRate) }}</span></div>
            <div class="mt-1 flex justify-between gap-3"><span class="text-white/55">{{ label('Drawdown', 'Просадка') }}</span><span class="text-white/85">{{ formatMoney(-period.maxDrawdown) }}</span></div>
          </div>
        </div>
        <div v-else class="mt-5 border border-white/10 bg-white/[0.025] px-4 py-5 font-mono text-sm text-white/65">{{ label('Not enough data.', 'Недостаточно данных.') }}</div>
      </div>

      <div class="mt-12">
        <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ label('III · Monte Carlo order test', 'III · Монте-Карло') }}</div>
        <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ label('The same trades are randomly reordered to show the range of possible equity paths.', 'Те же сделки перемешиваются в случайном порядке, чтобы показать возможный диапазон кривых капитала.') }}</div>
        <div v-if="monteCarlo" class="mt-5 bg-white/[0.025] p-3 sm:p-5">
          <svg :viewBox="`0 0 ${monteCarloWidth} ${monteCarloHeight}`" class="h-[18rem] w-full" role="img" :aria-label="label('Monte Carlo equity paths', 'Диапазон кривых капитала Монте-Карло')">
            <path :d="monteCarloAreaPath" fill="#94a3b8" fill-opacity="0.18" />
            <path :d="monteCarloPath(monteCarlo.median)" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" />
            <line :x1="monteCarloPadding.left" :x2="monteCarloWidth - monteCarloPadding.right" :y1="monteCarloYFor(capital)" :y2="monteCarloYFor(capital)" stroke="white" stroke-opacity="0.35" stroke-dasharray="4 5" />
            <text :x="monteCarloPadding.left - 10" :y="monteCarloPadding.top + 4" text-anchor="end" fill="white" fill-opacity="0.7" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11">{{ formatMoney(monteCarloMax) }}</text>
            <text :x="monteCarloPadding.left - 10" :y="monteCarloHeight - monteCarloPadding.bottom" text-anchor="end" fill="white" fill-opacity="0.7" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11">{{ formatMoney(monteCarloMin) }}</text>
          </svg>
          <div class="mt-4 grid gap-3 font-mono text-[11px] sm:grid-cols-3">
            <div class="border-t border-white/10 pt-3"><div class="text-white/55">{{ label('Median maximum drawdown', 'Медианная максимальная просадка') }}</div><div class="mt-1 font-semibold text-white">{{ formatMoney(-monteCarloMedianDrawdown) }}</div></div>
            <div class="border-t border-white/10 pt-3"><div class="text-white/55">{{ label('Probability of reaching zero', 'Вероятность падения капитала до нуля') }}</div><div class="mt-1 font-semibold text-white">{{ formatRatio(monteCarloRuinProbability) }}</div></div>
            <div class="border-t border-white/10 pt-3"><div class="text-white/55">{{ label('Exceeding historical drawdown', 'Превышение исторической просадки') }}</div><div class="mt-1 font-semibold text-white">{{ formatRatio(monteCarloDrawdownProbability) }}</div></div>
          </div>
        </div>
        <div v-else class="mt-5 border border-white/10 bg-white/[0.025] px-4 py-5 font-mono text-sm text-white/65">{{ label('Not enough data.', 'Недостаточно данных.') }}</div>
      </div>

      <div class="mt-12">
        <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ label('IV · Loss streaks', 'IV · Серии убытков') }}</div>
        <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ label('The sequence shows how often losses follow one another and how severe the longest sequence was.', 'Показано, как часто убытки следуют подряд и насколько тяжёлой была самая длинная серия.') }}</div>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <div class="border border-white/10 bg-white/[0.025] p-4 font-mono text-[11px]"><div class="text-white/55">{{ label('Longest loss streak', 'Самая длинная серия') }}</div><div class="mt-2 text-xl font-semibold text-white">{{ lossStats.longest }} {{ label('trades', 'сделок') }}</div><div class="mt-1 text-white/65">{{ formatMoney(lossStats.longestPnl) }}</div></div>
          <div class="border border-white/10 bg-white/[0.025] p-4 font-mono text-[11px]"><div class="text-white/55">{{ label('Current loss streak', 'Текущая серия') }}</div><div class="mt-2 text-xl font-semibold text-white">{{ lossStats.trailing }} {{ label('trades', 'сделок') }}</div><div class="mt-1 text-white/65">{{ formatMoney(lossStats.trailingPnl) }}</div></div>
        </div>
        <div v-if="lossSequence.length" class="mt-5 border border-white/10 bg-white/[0.025] p-4">
          <div class="font-serif text-[12px] uppercase tracking-[0.16em] text-white/65">{{ label('Last 40 trades', 'Последние 40 сделок') }}</div>
          <div class="mt-4 flex flex-wrap gap-1.5">
            <div v-for="item in lossSequence" :key="item.index" :title="`${label('Trade', 'Сделка')} ${item.index}: ${formatMoney(item.pnl)}`" class="h-5 w-5 border border-black/40" :class="item.pnl < 0 ? 'bg-slate-500' : item.pnl > 0 ? 'bg-white/80' : 'bg-white/20'" />
          </div>
          <div class="mt-3 flex gap-5 font-mono text-[10px] text-white/55"><span><i class="mr-1 inline-block h-2 w-2 bg-white/80" />{{ label('Profit', 'Прибыль') }}</span><span><i class="mr-1 inline-block h-2 w-2 bg-slate-500" />{{ label('Loss', 'Убыток') }}</span></div>
        </div>
      </div>

      <div class="mt-12">
        <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ label('V · Result concentration', 'V · Концентрация результата') }}</div>
        <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ label('The shares show how much of gross profit comes from the leading assets and the single best trade.', 'Доли показывают, какая часть валовой прибыли приходится на ведущие активы и одну лучшую сделку.') }}</div>
        <div class="mt-5 grid gap-4 sm:grid-cols-3">
          <div class="border border-white/10 bg-white/[0.025] p-4 font-mono text-[11px]"><div class="text-white/55">{{ label('Top asset', 'Топ-актив') }}</div><div class="mt-2 text-xl font-semibold text-white">{{ formatRatio(concentrationTop1) }}</div></div>
          <div class="border border-white/10 bg-white/[0.025] p-4 font-mono text-[11px]"><div class="text-white/55">{{ label('Top 3 assets', 'Топ-3 актива') }}</div><div class="mt-2 text-xl font-semibold text-white">{{ formatRatio(concentrationTop3) }}</div></div>
          <div class="border border-white/10 bg-white/[0.025] p-4 font-mono text-[11px]"><div class="text-white/55">{{ label('Best trade', 'Лучшая сделка') }}</div><div class="mt-2 text-xl font-semibold text-white">{{ formatRatio(concentrationTrade) }}</div></div>
        </div>
        <div v-if="assetConcentration.length" class="mt-5 space-y-3 bg-white/[0.025] p-4 sm:p-5">
          <div v-for="asset in assetConcentration" :key="asset.asset" class="font-mono text-[11px]">
            <div class="flex items-center justify-between gap-4"><span class="font-semibold text-white">{{ asset.asset }}</span><span class="text-white/75">{{ formatRatio(asset.share) }} · {{ formatMoney(asset.pnl) }}</span></div>
            <div class="mt-2 h-2 bg-white/[0.08]"><div class="h-2 bg-white/75" :style="{ width: `${Math.max(2, asset.share)}%` }" /></div>
            <div class="mt-1 text-white/45">{{ asset.trades }} {{ label('trades', 'сделок') }}</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
