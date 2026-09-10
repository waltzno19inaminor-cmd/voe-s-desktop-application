<template>
  <div class="overflow-x-auto custom-scrollbar">
    <div
      id="strategy-share-card-export-target"
      class="relative h-[675px] w-[1200px] shrink-0 overflow-hidden border border-white/10 bg-[#080808] text-white shadow-2xl"
    >
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.035]"
        style="background-image: linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px); background-size: 40px 40px;"
      ></div>
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black to-transparent opacity-60"></div>

      <svg
        v-if="equityPath"
        viewBox="0 0 500 135"
        preserveAspectRatio="none"
        class="pointer-events-none absolute inset-x-0 top-[17%] h-[58%] w-full opacity-[0.14]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="strategy-equity-background-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="white" stop-opacity="0.35" />
            <stop offset="100%" stop-color="white" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path :d="equityAreaPath" fill="url(#strategy-equity-background-fill)" />
        <path :d="equityPath" fill="none" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      </svg>

      <header class="absolute left-[5%] right-[5%] top-[5%] flex items-start justify-between">
        <div>
          <h1 class="font-serif text-2xl font-light uppercase leading-normal tracking-[0.4em]">J.L.Jörmungandr</h1>
          <p class="mt-2 font-mono text-[8px] uppercase tracking-[0.5em] text-white/35">
            {{ isRu ? 'Торговый дневник' : 'Trading Diary' }}
          </p>
        </div>
        <div class="flex max-w-[420px] flex-col items-end text-right font-mono uppercase">
          <ExWebsiteQrCode class="mb-3 h-[76px] w-[76px]" />
          <div class="truncate text-[10px] font-black tracking-[0.24em]">{{ username }}</div>
        </div>
      </header>

      <section class="absolute inset-0 flex -translate-y-[5%] flex-col items-center justify-center">
        <div class="w-full text-center">
          <h2 class="px-12 font-mono text-[18px] font-black uppercase tracking-[0.4em] text-white/60">{{ strategyName }}</h2>
        </div>
        <div class="mt-2 w-full text-center">
          <div class="font-serif text-[180px] italic leading-none tracking-[-0.06em] drop-shadow-[0_0_40px_rgba(255,255,255,0.12)]" :class="resultColorClass">
            {{ formattedReturn }}
          </div>
        </div>
        <div class="mt-5 flex w-full flex-col items-center text-center">
          <span class="font-mono text-[13px] font-black uppercase tracking-[0.32em] text-white/45">
            {{ isRu ? 'Результат стратегии' : 'Strategy Performance' }}
          </span>
          <div class="mt-4 h-px w-24 bg-white/20"></div>
        </div>
      </section>

      <section class="absolute left-[5%] right-[5%] top-[71%]">
        <div class="mb-9 h-px w-full bg-white/10"></div>
        <div class="grid grid-cols-6 gap-8">
          <div v-for="metric in metrics" :key="metric.label" class="flex min-w-0 flex-col gap-2.5">
            <span class="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-white/35">{{ metric.label }}</span>
            <span class="truncate font-mono text-[22px] font-black tracking-[-0.03em]" :class="metric.colorClass">{{ metric.value }}</span>
            <span class="truncate font-mono text-[7px] uppercase tracking-[0.14em] text-white/20">{{ metric.note }}</span>
          </div>
        </div>
      </section>

      <div class="absolute bottom-[3%] right-[5%] h-8 w-8 border-b border-r border-white/20"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  getTradeExitTimestamp,
  getTradeDurationMs,
  getTradePnl,
  getTradeRiskReward,
  getTradeTimelineTimestamp
} from '~/widgets/genesis/model/metrics'
import { isClosedTradeForMetrics } from '~/widgets/genesis/model/tradePnl'
import ExWebsiteQrCode from './ExWebsiteQrCode.vue'

interface Props {
  trades?: any[]
  initialCapital?: number
  strategyName?: string
  username?: string
  locale?: 'en' | 'ru'
}

const props = withDefaults(defineProps<Props>(), {
  trades: () => [],
  initialCapital: 1000,
  strategyName: 'Main Diary',
  username: 'Trader',
  locale: 'en'
})

const isRu = computed(() => props.locale === 'ru')
const closedTrades = computed(() => props.trades.filter(isClosedTradeForMetrics))
const chronologicalTrades = computed(() => [...closedTrades.value].sort((a, b) => (
  (getTradeExitTimestamp(a) || getTradeTimelineTimestamp(a)) - (getTradeExitTimestamp(b) || getTradeTimelineTimestamp(b))
)))
const pnls = computed(() => closedTrades.value.map(trade => getTradePnl(trade, props.initialCapital)))
const wins = computed(() => pnls.value.filter(value => value > 0).length)
const losses = computed(() => pnls.value.filter(value => value < 0).length)
const totalPnl = computed(() => pnls.value.reduce((sum, value) => sum + value, 0))
const winRate = computed(() => closedTrades.value.length ? (wins.value / closedTrades.value.length) * 100 : 0)
const grossProfit = computed(() => pnls.value.filter(value => value > 0).reduce((sum, value) => sum + value, 0))
const grossLoss = computed(() => Math.abs(pnls.value.filter(value => value < 0).reduce((sum, value) => sum + value, 0)))
const profitFactor = computed(() => grossLoss.value > 0 ? grossProfit.value / grossLoss.value : (grossProfit.value > 0 ? Infinity : 0))
const returnPercent = computed(() => props.initialCapital > 0 ? (totalPnl.value / props.initialCapital) * 100 : 0)

const plannedRiskRewards = computed(() => closedTrades.value
  .map(trade => getTradeRiskReward(trade))
  .filter(value => Number.isFinite(value) && value > 0))
const averageRiskReward = computed(() => plannedRiskRewards.value.length
  ? plannedRiskRewards.value.reduce((sum, value) => sum + value, 0) / plannedRiskRewards.value.length
  : 0)
const tradeDurations = computed(() => closedTrades.value
  .map(trade => getTradeDurationMs(trade))
  .filter(duration => Number.isFinite(duration) && duration >= 0))
const averageDurationMs = computed(() => tradeDurations.value.length
  ? tradeDurations.value.reduce((sum, value) => sum + value, 0) / tradeDurations.value.length
  : 0)

const equityValues = computed(() => {
  let balance = props.initialCapital
  return [balance, ...chronologicalTrades.value.map((trade) => {
    balance += getTradePnl(trade, props.initialCapital)
    return balance
  })]
})

const maxDrawdownPercent = computed(() => {
  let peak = equityValues.value[0] || props.initialCapital
  let maxDrawdown = 0
  equityValues.value.forEach((balance) => {
    peak = Math.max(peak, balance)
    if (peak > 0) maxDrawdown = Math.max(maxDrawdown, ((peak - balance) / peak) * 100)
  })
  return maxDrawdown
})

const chartCoordinates = computed(() => {
  if (chronologicalTrades.value.length === 0) return []
  const values = equityValues.value
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const width = 500
  const height = 135
  const padding = 10
  return values.map((value, index) => ({
    x: values.length === 1 ? width / 2 : (index / (values.length - 1)) * width,
    y: padding + ((max - value) / range) * (height - padding * 2)
  }))
})

const equityPath = computed(() => chartCoordinates.value.map((point, index) => (
  `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
)).join(' '))
const equityAreaPath = computed(() => equityPath.value
  ? `${equityPath.value} L 500 135 L 0 135 Z`
  : '')

const formatSigned = (value: number, suffix = '') => `${value > 0 ? '+' : ''}${value.toFixed(1)}${suffix}`
const formattedReturn = computed(() => formatSigned(returnPercent.value, '%'))
const resultColorClass = 'text-white'

const formattedAverageDuration = computed(() => {
  if (!tradeDurations.value.length) return '—'
  const totalMinutes = Math.round(averageDurationMs.value / 60_000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  const units = isRu.value
    ? { day: 'Д', hour: 'Ч', minute: 'М' }
    : { day: 'D', hour: 'H', minute: 'M' }

  if (days > 0) return `${days}${units.day} ${hours}${units.hour}`
  if (hours > 0) return `${hours}${units.hour} ${minutes}${units.minute}`
  return `${minutes}${units.minute}`
})

const metrics = computed(() => [
  {
    label: isRu.value ? 'Доля прибыльных' : 'Win Rate',
    value: `${winRate.value.toFixed(1)}%`,
    note: `${wins.value} ${isRu.value ? 'прибыльных' : 'winning'}`,
    colorClass: 'text-white'
  },
  {
    label: isRu.value ? 'Средний R/R' : 'Average R/R',
    value: averageRiskReward.value > 0 ? `${averageRiskReward.value.toFixed(2)}:1` : '—',
    note: isRu.value ? 'план риск / награда' : 'planned risk / reward',
    colorClass: 'text-white'
  },
  {
    label: isRu.value ? 'Профит-фактор' : 'Profit Factor',
    value: Number.isFinite(profitFactor.value) ? profitFactor.value.toFixed(2) : '∞',
    note: isRu.value ? 'прибыль / убыток' : 'gross profit / loss',
    colorClass: 'text-white'
  },
  {
    label: isRu.value ? 'Всего сделок' : 'Total Trades',
    value: String(props.trades.length),
    note: `${closedTrades.value.length} ${isRu.value ? 'закрыто' : 'closed'}`,
    colorClass: 'text-white'
  },
  {
    label: isRu.value ? 'Среднее время в сделке' : 'Average Trade Time',
    value: formattedAverageDuration.value,
    note: isRu.value ? 'по закрытым сделкам' : 'across closed trades',
    colorClass: 'text-white'
  },
  {
    label: isRu.value ? 'Макс. просадка' : 'Max Drawdown',
    value: `${maxDrawdownPercent.value.toFixed(1)}%`,
    note: isRu.value ? 'от пика капитала' : 'from equity peak',
    colorClass: 'text-white'
  }
])
</script>
