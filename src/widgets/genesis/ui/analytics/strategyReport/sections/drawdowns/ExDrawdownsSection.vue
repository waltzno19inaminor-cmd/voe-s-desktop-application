<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import type { EquityStabilityMapModel } from '../../../robustnessEquityMap/equityStabilityMap'
import ExRobustnessEquityMap from '../../../robustnessEquityMap/ExRobustnessEquityMap.vue'
import ExStrategyReportPageNumber from '../../components/auxiliary/ExStrategyReportPageNumber.vue'
import ExStrategyReportSectionHeading from '../../components/auxiliary/ExStrategyReportSectionHeading.vue'
import ExStrategyReportSectionSubheading from '../../components/auxiliary/ExStrategyReportSectionSubheading.vue'

const props = defineProps<{
  model: EquityStabilityMapModel
  trades: Record<string, any>[]
  getTradePnl: (trade: Record<string, any>) => number
}>()

const { locale } = useI18n()
const isRu = computed(() => locale.value === 'ru')
const label = (en: string, ru: string) => isRu.value ? ru : en
const model = computed(() => props.model)
const points = computed(() => model.value.points)

const formatLoss = (value: number) => Number.isFinite(value) ? `-$${Math.abs(value).toFixed(2)}` : '—'
const formatPercent = (value: number) => Number.isFinite(value) ? `-${Math.abs(value).toFixed(2)}%` : '—'
const formatTradePercent = (value: number | null) => value === null || !Number.isFinite(value)
  ? '—'
  : `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`

const normalizeTrade = (trade: Record<string, any>) => trade.trade && typeof trade.trade === 'object'
  ? { ...trade.trade, ...trade }
  : trade

const firstValue = (trade: Record<string, any>, keys: string[]) => keys
  .map(key => trade?.[key])
  .find(value => value !== null && value !== undefined && value !== '')

const formatTradeValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '—'
  const numeric = Number(value)
  return Number.isFinite(numeric) && typeof value !== 'boolean' ? numeric.toFixed(4) : String(value)
}

const formatDate = (value: unknown, includeTime = true) => {
  if (value === null || value === undefined || value === '') return '—'
  const dateValue = value && typeof (value as any).toDate === 'function'
    ? (value as any).toDate()
    : value && typeof value === 'object' && Number.isFinite(Number((value as any).seconds))
      ? new Date(Number((value as any).seconds) * 1000)
      : typeof value === 'number'
        ? new Date(value < 1e12 ? value * 1000 : value)
        : new Date(String(value))
  return Number.isFinite(dateValue.getTime())
    ? new Intl.DateTimeFormat(isRu.value ? 'ru-RU' : 'en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...(includeTime ? { hour: '2-digit', minute: '2-digit', second: '2-digit' } : {})
      }).format(dateValue)
    : '—'
}

const displayName = (value: any): string => typeof value === 'string' ? value.trim() : String(
  value?.info?.customName ?? value?.info?.name ?? value?.name ?? value?.label ?? value?.id ?? ''
).trim()

const uniqueNames = (values: any[]) => {
  const names = new Map<string, string>()
  values.forEach(value => {
    const name = displayName(value)
    const key = name.toLowerCase()
    if (key && name && !names.has(key)) names.set(key, name)
  })
  return [...names.values()]
}

const resolveAsset = (trade: Record<string, any>) => String(
  trade?.asset ?? trade?.symbol ?? trade?.ticker ?? trade?.instrument ?? trade?.coin ?? trade?.label ?? '—'
).split('[')[0]!.split('|')[0]!.trim().toUpperCase() || '—'

const resolveSide = (trade: Record<string, any>) => {
  const value = String(trade?.side ?? trade?.direction ?? trade?.positionSide ?? '').trim().toLowerCase()
  if (value.includes('short') || value.includes('sell')) return 'short'
  if (value.includes('long') || value.includes('buy')) return 'long'
  return '—'
}

const resolveScenarios = (trade: Record<string, any>) => uniqueNames([
  trade?.boardScenarioEntry,
  trade?.boardScenarioExit,
  trade?.scenario,
  trade?.scenarioName,
  trade?.scenarioLabel
].filter(Boolean))

const resolveConditions = (trade: Record<string, any>) => {
  const values: any[] = [trade?.condition, trade?.conditionName, trade?.conditionLabel]
  if (Array.isArray(trade?.boardConditions)) values.push(...trade.boardConditions)
  if (Array.isArray(trade?.boardScenarioEntry?.info?.conditions)) values.push(...trade.boardScenarioEntry.info.conditions)
  if (Array.isArray(trade?.boardScenarioExit?.info?.conditions)) values.push(...trade.boardScenarioExit.info.conditions)
  return uniqueNames(values.filter(Boolean))
}

const factorSummary = (values: string[]) => {
  if (!values.length) return '—'
  const visible = values.slice(0, 3)
  return values.length > visible.length ? `${visible.join(' · ')} +${values.length - visible.length}` : visible.join(' · ')
}

const resultPercentFor = (trade: Record<string, any>) => {
  const stored = firstValue(trade, ['profitInPercent', 'pnlPercent', 'resultPercent'])
  const storedNumber = stored === undefined ? Number.NaN : Number(stored)
  if (Number.isFinite(storedNumber)) return storedNumber

  const result = Number(trade.result)
  const unit = String(trade.resultUnit ?? trade.resultType ?? trade.resultMode ?? '').toLowerCase()
  const hasCashPnl = ['profitInCurrency', 'pnlNum', 'pnl', 'profit', 'netProfit'].some(key => Number.isFinite(Number(trade[key])))
  return Number.isFinite(result) && !hasCashPnl && (unit.includes('%') || unit.includes('percent') || Math.abs(result) <= 100)
    ? result
    : null
}

const tradeDetailsFor = (point: typeof points.value[number]) => {
  const trade = normalizeTrade(point.trade)
  return {
    number: point.index + 1,
    asset: resolveAsset(trade),
    direction: resolveSide(trade),
    entryDate: formatDate(firstValue(trade, ['dateEntry', 'date', 'entryTime', 'openDate', 'createdAt'])),
    exitDate: formatDate(firstValue(trade, ['dateExit', 'exitTime', 'closeDate'])),
    entryPrice: formatTradeValue(firstValue(trade, ['entryPrice', 'priceEntry', 'entry', 'openPrice'])),
    exitPrice: formatTradeValue(firstValue(trade, ['exitPrice', 'priceExit', 'exit', 'closePrice'])),
    positionSize: formatTradeValue(firstValue(trade, ['sizeInCurrency', 'positionSizeDollars', 'positionValue', 'size'])),
    stopLoss: formatTradeValue(firstValue(trade, ['stopLossPrice', 'stopLoss', 'stop', 'sl', 'stopPrice'])),
    takeProfit: formatTradeValue(firstValue(trade, ['takeProfitPrice', 'takeProfit', 'target', 'tp', 'targetPrice'])),
    pnl: point.pnl,
    pnlPercent: resultPercentFor(trade),
    scenario: factorSummary(resolveScenarios(trade)),
    conditions: factorSummary(resolveConditions(trade))
  }
}

type DrawdownTrade = ReturnType<typeof tradeDetailsFor> & { isWorst: boolean }

type DrawdownInsight = {
  id: string
  number: number
  depthPercent: number
  startedAt: string
  endedAt: string
  losingTrades: DrawdownTrade[]
}

const drawdownInsights = computed<DrawdownInsight[]>(() => model.value.drawdowns.map((zone, index) => {
  const startIndex = Math.min(zone.startIndex + (zone.endIndex > zone.startIndex ? 1 : 0), zone.endIndex)
  const drawdownTrades = points.value.slice(startIndex, zone.endIndex + 1)
  const trough = points.value[zone.endIndex]
  const losingTrades = drawdownTrades.filter(point => point.pnl < 0).map(tradeDetailsFor)
  const worstTradeIndex = losingTrades.reduce((worstIndex, trade, tradeIndex) => (
    worstIndex === -1 || trade.pnl < losingTrades[worstIndex]!.pnl ? tradeIndex : worstIndex
  ), -1)

  return {
    id: zone.id,
    number: index + 1,
    depthPercent: trough?.highWater > 0 ? (zone.value ?? 0) / trough.highWater * 100 : 0,
    startedAt: formatDate(points.value[zone.startIndex]?.timestamp, false),
    endedAt: zone.recoveryIndex === undefined
      ? label('open', 'открыта')
      : formatDate(points.value[zone.recoveryIndex]?.timestamp, false),
    losingTrades: losingTrades.map((trade, tradeIndex) => ({ ...trade, isWorst: tradeIndex === worstTradeIndex }))
  }
}))
</script>

<template>
  <section id="report-section-drawdowns" class="min-h-screen px-[clamp(1.5rem,7vw,8rem)] py-16 text-white sm:py-24">
    <div class="mx-auto max-w-5xl">
      <ExStrategyReportPageNumber page="05" total="06" />
      <div class="mt-12">
        <ExStrategyReportSectionHeading>{{ isRu ? 'Просадки' : 'Drawdowns' }}</ExStrategyReportSectionHeading>
        <ExStrategyReportSectionSubheading muted>{{ isRu ? 'Глубина снижения капитала и периоды восстановления.' : 'Capital declines and recovery periods.' }}</ExStrategyReportSectionSubheading>
      </div>

      <div class="mt-12">
        <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ isRu ? 'I · Кривая капитала' : 'I · Equity curve' }}</div>
        <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ isRu ? 'Красные зоны показывают все участки снижения капитала от локального пика до минимума.' : 'Red zones mark every decline from a local equity peak to its trough.' }}</div>
        <div class="mt-5 bg-white/[0.025] p-3 sm:p-5">
          <ExRobustnessEquityMap
            :model="props.model"
            :trades="props.trades"
            :get-trade-pnl="props.getTradePnl"
          />
        </div>

        <div class="mt-8">
          <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ label('Drawdown factors', 'Факторы просадок') }}</div>
          <div class="mt-2 max-w-3xl font-serif text-sm text-white/55 sm:text-base">{{ label('Each card shows the drawdown depth and the losing trades that formed it, including the trade context available in the report.', 'В каждой карточке указана глубина просадки и убыточные сделки, которые её сформировали, вместе с доступными данными по сделкам.') }}</div>

          <div v-if="drawdownInsights.length" class="mt-5 space-y-5">
            <article v-for="insight in drawdownInsights" :key="insight.id" class="border border-white/10 bg-white/[0.025] p-4 sm:p-5">
              <div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-white/10 pb-3">
                <div class="font-serif text-base uppercase tracking-[0.16em] text-white/85">{{ label(`Drawdown ${insight.number}`, `Просадка ${insight.number}`) }} · {{ insight.startedAt }} — {{ insight.endedAt }}</div>
                <div class="font-mono text-sm font-semibold text-white">{{ formatPercent(insight.depthPercent) }}</div>
              </div>

              <div class="mt-4 font-serif text-[12px] uppercase tracking-[0.16em] text-white/65">{{ label('Losing trades', 'Убыточные сделки') }}</div>
              <div v-if="insight.losingTrades.length" class="mt-3 space-y-4">
                <div v-for="trade in insight.losingTrades" :key="`${insight.id}-trade-${trade.number}`" class="border-t border-white/10 pt-4 first:border-t-0" :class="trade.isWorst ? 'border-white/35 bg-white/[0.07] px-3 py-4 ring-1 ring-white/15' : ''">
                  <div class="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
                    <div class="font-mono text-sm font-semibold text-white">{{ trade.asset }} · {{ trade.direction === 'long' ? label('Long', 'Лонг') : trade.direction === 'short' ? label('Short', 'Шорт') : '—' }}</div>
                    <div class="font-mono text-sm font-semibold text-white">{{ formatLoss(trade.pnl) }} <span class="text-white/60">({{ formatTradePercent(trade.pnlPercent) }})</span></div>
                  </div>

                  <div class="mt-3 grid gap-x-5 gap-y-3 font-mono text-[11px] sm:grid-cols-2 lg:grid-cols-4">
                    <div><div class="text-white/50">{{ label('Opened', 'Открытие') }}</div><div class="mt-1 text-white/85">{{ trade.entryDate }}</div></div>
                    <div><div class="text-white/50">{{ label('Closed', 'Закрытие') }}</div><div class="mt-1 text-white/85">{{ trade.exitDate }}</div></div>
                    <div><div class="text-white/50">{{ label('Entry price', 'Цена входа') }}</div><div class="mt-1 text-white/85">{{ trade.entryPrice }}</div></div>
                    <div><div class="text-white/50">{{ label('Exit price', 'Цена выхода') }}</div><div class="mt-1 text-white/85">{{ trade.exitPrice }}</div></div>
                    <div><div class="text-white/50">{{ label('Position size', 'Размер позиции') }}</div><div class="mt-1 text-white/85">{{ trade.positionSize }}</div></div>
                    <div><div class="text-white/50">{{ label('Stop-loss', 'Стоп-лосс') }}</div><div class="mt-1 text-white/85">{{ trade.stopLoss }}</div></div>
                    <div><div class="text-white/50">{{ label('Take-profit', 'Тейк-профит') }}</div><div class="mt-1 text-white/85">{{ trade.takeProfit }}</div></div>
                    <div><div class="text-white/50">{{ label('Result', 'Результат') }}</div><div class="mt-1 text-white/85">{{ formatLoss(trade.pnl) }}</div></div>
                    <div class="sm:col-span-2"><div class="text-white/50">{{ label('Scenario', 'Сценарий') }}</div><div class="mt-1 whitespace-normal text-white/85">{{ trade.scenario }}</div></div>
                    <div class="sm:col-span-2"><div class="text-white/50">{{ label('Conditions', 'Условия') }}</div><div class="mt-1 whitespace-normal text-white/85">{{ trade.conditions }}</div></div>
                  </div>
                </div>
              </div>
              <div v-else class="mt-3 font-mono text-[11px] text-white/55">{{ label('No losing trades were recorded in this drawdown.', 'Убыточные сделки для этой просадки не определены.') }}</div>
            </article>
          </div>
          <div v-else class="mt-5 border border-white/10 bg-white/[0.025] px-4 py-5 font-mono text-sm text-white/65">{{ label('No drawdowns detected.', 'Просадки не обнаружены.') }}</div>
        </div>
      </div>

    </div>
  </section>
</template>
