<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import { getTradePlannedStopRiskDollars } from '~/widgets/genesis/model/tradeRisk'
import { getTradeDurationHours } from '~/widgets/genesis/model/metrics/tradeMetrics'
import ExStrategyReportPageNumber from '../../components/auxiliary/ExStrategyReportPageNumber.vue'
import ExStrategyReportSectionHeading from '../../components/auxiliary/ExStrategyReportSectionHeading.vue'
import ExStrategyReportSectionSubheading from '../../components/auxiliary/ExStrategyReportSectionSubheading.vue'

const { locale } = useI18n()
const isRu = computed(() => locale.value === 'ru')
const props = defineProps<{
  trades: Record<string, any>[]
  getTradePnl: (trade: Record<string, any>) => number
  initialCapital?: number | null
  riskBudget?: number | null
}>()

const formatMoney = (value: number) => {
  if (!Number.isFinite(value)) return '—'
  return value === 0 ? '$0.00' : `-$${Math.abs(value).toFixed(2)}`
}
const normalizeTrade = (trade: Record<string, any>) => trade.trade && typeof trade.trade === 'object'
  ? { ...trade.trade, ...trade }
  : trade
const plannedRiskFor = (trade: Record<string, any>) => {
  const normalized = normalizeTrade(trade)
  const calculatedRisk = getTradePlannedStopRiskDollars(normalized)
  if (Number.isFinite(calculatedRisk) && calculatedRisk > 0) return calculatedRisk
  const storedRisk = Number(normalized.riskDollars)
  return Number.isFinite(storedRisk) && storedRisk > 0 ? storedRisk : Number.NaN
}
const riskAudit = computed(() => props.trades.map(trade => {
  const planned = plannedRiskFor(trade)
  const pnl = Number(props.getTradePnl(trade))
  const realizedLoss = Number.isFinite(pnl) && pnl < 0 ? Math.abs(pnl) : Number.NaN
  return { planned, realizedLoss }
}))
const plannedRiskValues = computed(() => riskAudit.value.map(item => item.planned).filter(value => Number.isFinite(value)))
const realizedLossValues = computed(() => riskAudit.value.map(item => item.realizedLoss).filter(value => Number.isFinite(value)))
const medianOf = (values: number[]) => {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle]! : ((sorted[middle - 1]! + sorted[middle]!) / 2)
}
const medianPlannedRisk = computed(() => medianOf(plannedRiskValues.value))
const medianRealizedLoss = computed(() => medianOf(realizedLossValues.value))
const configuredRiskBudget = computed(() => {
  const value = Number(props.riskBudget)
  return Number.isFinite(value) && value > 0 ? value : null
})
const riskBreachCount = computed(() => {
  if (!configuredRiskBudget.value) return 0
  return riskAudit.value.filter(item => (
    (Number.isFinite(item.planned) && item.planned > configuredRiskBudget.value!) ||
    (Number.isFinite(item.realizedLoss) && item.realizedLoss > configuredRiskBudget.value!)
  )).length
})
const hasRiskData = computed(() => props.trades.length > 0 || plannedRiskValues.value.length > 0 || realizedLossValues.value.length > 0 || configuredRiskBudget.value !== null)
const riskChartWidth = 1000
const riskChartHeight = 340
const riskPadding = { left: 64, right: 96 }
const riskPlotWidth = riskChartWidth - riskPadding.left - riskPadding.right
const riskScaleMax = computed(() => Math.max(1, medianPlannedRisk.value, medianRealizedLoss.value, configuredRiskBudget.value || 0) * 1.15)
const riskBarWidth = (value: number) => value / riskScaleMax.value * riskPlotWidth
const riskBaselineX = riskPadding.left
const riskBudgetX = computed(() => configuredRiskBudget.value === null
  ? null
  : riskBaselineX + riskBarWidth(configuredRiskBudget.value))

const riskRewardPoints = computed(() => props.trades.map((trade, index) => {
  const normalized = normalizeTrade(trade)
  const plannedRisk = getTradePlannedStopRiskDollars(normalized)
  const pnl = Number(props.getTradePnl(trade))
  const riskReward = Number.isFinite(plannedRisk) && plannedRisk > 0 && Number.isFinite(pnl)
    ? pnl / plannedRisk
    : null
  const asset = String(normalized.asset ?? normalized.symbol ?? normalized.ticker ?? normalized.label ?? 'UNKNOWN')
    .split('[')[0]!
    .split('|')[0]!
    .trim()
    .toUpperCase() || 'UNKNOWN'
  const directionValue = String(normalized.side ?? normalized.direction ?? normalized.positionSide ?? '').trim().toLowerCase()
  const direction = directionValue.includes('short') || directionValue.includes('sell')
    ? 'Short'
    : directionValue.includes('long') || directionValue.includes('buy')
      ? 'Long'
      : '—'
  const rawCloseDate = normalized.dateExit ?? normalized.exitTime ?? normalized.closeDate ?? normalized.date
  const closeDateValue = rawCloseDate && typeof rawCloseDate?.toDate === 'function'
    ? rawCloseDate.toDate()
    : typeof rawCloseDate === 'number' && rawCloseDate < 1e12
      ? new Date(rawCloseDate * 1000)
      : new Date(rawCloseDate ?? '')
  const closeDate = Number.isFinite(closeDateValue.getTime())
    ? new Intl.DateTimeFormat(isRu.value ? 'ru-RU' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(closeDateValue)
    : '—'
  return { index, asset, direction, closeDate, riskReward }
}))
const profitableRiskRewardValues = computed(() => riskRewardPoints.value
  .map(point => point.riskReward)
  .filter((value): value is number => Number.isFinite(value) && value > 0))
const medianProfitableRiskReward = computed(() => medianOf(profitableRiskRewardValues.value))
const riskRewardAuditScaleMax = computed(() => Math.max(1, medianProfitableRiskReward.value) * 1.15)
const riskRewardAuditBarWidth = (value: number) => value / riskRewardAuditScaleMax.value * riskPlotWidth
const riskRewardValues = computed(() => riskRewardPoints.value
  .map(point => point.riskReward)
  .filter((value): value is number => Number.isFinite(value)))
const riskRewardDomain = computed(() => {
  if (!riskRewardValues.value.length) return { min: -1, max: 1 }
  const min = Math.min(0, ...riskRewardValues.value)
  const max = Math.max(0, ...riskRewardValues.value)
  const padding = Math.max((max - min) * 0.1, 0.25)
  return { min: min - padding, max: max + padding }
})
const riskRewardChartWidth = 1000
const riskRewardChartHeight = 320
const riskRewardPadding = { top: 32, right: 70, bottom: 42, left: 64 }
const riskRewardPlotLeft = riskRewardPadding.left + 32
const riskRewardPlotWidth = riskRewardChartWidth - riskRewardPlotLeft - riskRewardPadding.right
const riskRewardPlotHeight = riskRewardChartHeight - riskRewardPadding.top - riskRewardPadding.bottom
const riskRewardAxisLabelX = riskRewardPlotLeft - 12
const riskRewardXFor = (index: number) => riskRewardPoints.value.length <= 1
  ? riskRewardPlotLeft + riskRewardPlotWidth / 2
  : riskRewardPlotLeft + (index / (riskRewardPoints.value.length - 1)) * riskRewardPlotWidth
const riskRewardYFor = (value: number) => riskRewardPadding.top
  + (1 - (value - riskRewardDomain.value.min) / Math.max(1e-9, riskRewardDomain.value.max - riskRewardDomain.value.min)) * riskRewardPlotHeight
const riskRewardZeroY = computed(() => riskRewardYFor(0))
const riskRewardPath = computed(() => {
  let path = ''
  let segmentOpen = false
  riskRewardPoints.value.forEach(point => {
    if (point.riskReward === null) {
      segmentOpen = false
      return
    }
    path += `${segmentOpen ? 'L' : 'M'} ${riskRewardXFor(point.index).toFixed(2)} ${riskRewardYFor(point.riskReward).toFixed(2)} `
    segmentOpen = true
  })
  return path.trim()
})
const riskRewardSmaWindow = 10
const riskRewardSmaPoints = computed(() => {
  const validValues: number[] = []
  return riskRewardPoints.value.map(point => {
    if (point.riskReward === null) return { ...point, sma: null as number | null }
    validValues.push(point.riskReward)
    const recentValues = validValues.slice(-riskRewardSmaWindow)
    return {
      ...point,
      sma: recentValues.reduce((sum, value) => sum + value, 0) / recentValues.length
    }
  })
})
const riskRewardSmaPath = computed(() => {
  let path = ''
  let segmentOpen = false
  riskRewardSmaPoints.value.forEach(point => {
    if (point.sma === null) {
      segmentOpen = false
      return
    }
    path += `${segmentOpen ? 'L' : 'M'} ${riskRewardXFor(point.index).toFixed(2)} ${riskRewardYFor(point.sma).toFixed(2)} `
    segmentOpen = true
  })
  return path.trim()
})
const riskRewardTicks = computed(() => {
  const min = riskRewardDomain.value.min
  const max = riskRewardDomain.value.max
  const range = Math.max(max - min, 1e-9)
  const rawStep = range / 6
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalizedStep = rawStep / magnitude
  const stepFactor = normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10
  const step = stepFactor * magnitude
  const first = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let value = first; value <= max + step * 0.001; value += step) ticks.push(Number(value.toFixed(8)))
  return ticks.length >= 2 ? ticks : [min, max]
})
const riskRewardXTicks = computed(() => {
  const count = Math.min(6, riskRewardPoints.value.length)
  if (!count) return []
  if (count === 1) return [{ index: 0, label: '1' }]
  return Array.from({ length: count }, (_, tickIndex) => {
    const index = Math.round((tickIndex / (count - 1)) * (riskRewardPoints.value.length - 1))
    return { index, label: String(index + 1) }
  })
})
const hoveredRiskRewardIndex = ref<number | null>(null)
const riskRewardTooltipPosition = ref({ x: 0, y: 0 })
const hoveredRiskRewardPoint = computed(() => hoveredRiskRewardIndex.value === null
  ? null
  : riskRewardPoints.value[hoveredRiskRewardIndex.value] ?? null)
const hoveredRiskRewardSma = computed(() => hoveredRiskRewardIndex.value === null
  ? null
  : riskRewardSmaPoints.value[hoveredRiskRewardIndex.value]?.sma ?? null)
const riskRewardFormatted = (value: number | null) => value === null || !Number.isFinite(value) ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}R`
const riskRewardAxisFormatted = (value: number) => Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value.toFixed(2)}` : '—'
const riskRewardPointFromEvent = (event: MouseEvent) => {
  const svg = event.currentTarget as SVGSVGElement
  const screenMatrix = svg.getScreenCTM()
  if (screenMatrix) {
    const svgPoint = svg.createSVGPoint()
    svgPoint.x = event.clientX
    svgPoint.y = event.clientY
    const localPoint = svgPoint.matrixTransform(screenMatrix.inverse())
    return { x: localPoint.x, y: localPoint.y }
  }
  const rect = svg.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * riskRewardChartWidth,
    y: ((event.clientY - rect.top) / rect.height) * riskRewardChartHeight
  }
}
const handleRiskRewardPointerMove = (event: MouseEvent) => {
  if (!riskRewardPoints.value.length) return
  const localPoint = riskRewardPointFromEvent(event)
  if (localPoint.x < riskRewardPadding.left || localPoint.x > riskRewardChartWidth - riskRewardPadding.right || localPoint.y < riskRewardPadding.top || localPoint.y > riskRewardChartHeight - riskRewardPadding.bottom) {
    hoveredRiskRewardIndex.value = null
    return
  }
  const nearest = riskRewardPoints.value.reduce<{ index: number; distance: number } | null>((candidate, point) => {
    const distance = Math.abs(riskRewardXFor(point.index) - localPoint.x)
    return !candidate || distance < candidate.distance ? { index: point.index, distance } : candidate
  }, null)
  hoveredRiskRewardIndex.value = nearest?.index ?? null
  riskRewardTooltipPosition.value = { x: event.clientX, y: event.clientY }
}
const clearRiskRewardHover = () => {
  hoveredRiskRewardIndex.value = null
}

const positionSizeFor = (trade: Record<string, any>) => {
  const normalized = normalizeTrade(trade)
  const directSize = Number(normalized.sizeInCurrency ?? normalized.positionSizeDollars ?? normalized.positionValue)
  if (Number.isFinite(directSize) && directSize > 0) return directSize
  const size = Number(normalized.size)
  const entry = Number(normalized.entry)
  return Number.isFinite(size) && size > 0 && Number.isFinite(entry) && entry > 0 ? size * entry : null
}
const positionTimePoints = computed(() => props.trades.map((trade, index) => ({
  index,
  asset: riskRewardPoints.value[index]?.asset ?? 'UNKNOWN',
  positionSize: positionSizeFor(trade)
})))
const positionSizeValues = computed(() => positionTimePoints.value
  .map(point => point.positionSize)
  .filter((value): value is number => Number.isFinite(value)))
const configuredInitialCapital = computed(() => {
  const value = Number(props.initialCapital)
  return Number.isFinite(value) && value > 0 ? value : 1000
})
const capitalResultPercentFor = (trade: Record<string, any>) => {
  const pnl = Number(props.getTradePnl(trade))
  return Number.isFinite(pnl) && configuredInitialCapital.value > 0
    ? (pnl / configuredInitialCapital.value) * 100
    : null
}
const positionSizeDetails = computed(() => {
  const points = positionTimePoints.value
    .map(point => ({
      ...point,
      resultPercent: capitalResultPercentFor(props.trades[point.index]!)
    }))
    .filter(point => point.positionSize !== null)
  if (!points.length) return { average: null, largest: null, smallest: null }
  const average = points.reduce((sum, point) => sum + point.positionSize!, 0) / points.length
  const largest = points.reduce((current, point) => point.positionSize! > current.positionSize! ? point : current)
  const smallest = points.reduce((current, point) => point.positionSize! < current.positionSize! ? point : current)
  return { average, largest, smallest }
})
const capitalResultPercentFormatted = (value: number | null | undefined) => value === null || value === undefined || !Number.isFinite(value)
  ? '—'
  : `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
const positionSizeDomain = computed(() => {
  const max = Math.max(1, ...positionSizeValues.value)
  return { min: 0, max: max * 1.1 }
})
const positionTimeChartWidth = 1000
const positionTimeChartHeight = 320
const positionTimePadding = { top: 32, right: 70, bottom: 42, left: 132 }
const positionTimePlotLeft = positionTimePadding.left
const positionTimePlotRight = positionTimeChartWidth - positionTimePadding.right
const positionTimePlotWidth = positionTimePlotRight - positionTimePlotLeft
const positionTimePlotHeight = positionTimeChartHeight - positionTimePadding.top - positionTimePadding.bottom
const positionTimeXFor = (index: number) => positionTimePoints.value.length <= 1
  ? positionTimePlotLeft + positionTimePlotWidth / 2
  : positionTimePlotLeft + (index / (positionTimePoints.value.length - 1)) * positionTimePlotWidth
const positionSizeYFor = (value: number) => positionTimePadding.top
  + (1 - (value - positionSizeDomain.value.min) / Math.max(1e-9, positionSizeDomain.value.max - positionSizeDomain.value.min)) * positionTimePlotHeight
const positionTimeBarWidth = computed(() => positionTimePoints.value.length
  ? Math.max(4, Math.min(22, positionTimePlotWidth / positionTimePoints.value.length * 0.76))
  : 0)
const positionSizeBarX = (index: number) => positionTimeXFor(index) - positionTimeBarWidth.value / 2
const positionTimeTicksFor = (domain: { min: number; max: number }) => {
  const range = Math.max(domain.max - domain.min, 1e-9)
  const rawStep = range / 6
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalizedStep = rawStep / magnitude
  const stepFactor = normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10
  const step = stepFactor * magnitude
  const ticks: number[] = []
  for (let value = domain.min; value <= domain.max + step * 0.001; value += step) ticks.push(Number(value.toFixed(8)))
  return ticks.length >= 2 ? ticks : [domain.min, domain.max]
}
const positionSizeTicks = computed(() => positionTimeTicksFor(positionSizeDomain.value))
const positionTimeXTicks = computed(() => {
  const count = Math.min(6, positionTimePoints.value.length)
  if (!count) return []
  if (count === 1) return [{ index: 0, label: '1' }]
  return Array.from({ length: count }, (_, tickIndex) => {
    const index = Math.round((tickIndex / (count - 1)) * (positionTimePoints.value.length - 1))
    return { index, label: String(index + 1) }
  })
})
const positionSizeFormatted = (value: number | null) => value === null || !Number.isFinite(value) ? '—' : `$${value.toFixed(2)}`
const hoveredPositionTimeIndex = ref<number | null>(null)
const positionTimeTooltipPosition = ref({ x: 0, y: 0 })
const hoveredPositionTimePoint = computed(() => hoveredPositionTimeIndex.value === null
  ? null
  : positionTimePoints.value[hoveredPositionTimeIndex.value] ?? null)
const positionTimePointFromEvent = (event: MouseEvent) => {
  const svg = event.currentTarget as SVGSVGElement
  const screenMatrix = svg.getScreenCTM()
  if (screenMatrix) {
    const svgPoint = svg.createSVGPoint()
    svgPoint.x = event.clientX
    svgPoint.y = event.clientY
    const localPoint = svgPoint.matrixTransform(screenMatrix.inverse())
    return { x: localPoint.x, y: localPoint.y }
  }
  const rect = svg.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * positionTimeChartWidth,
    y: ((event.clientY - rect.top) / rect.height) * positionTimeChartHeight
  }
}
const handlePositionTimePointerMove = (event: MouseEvent) => {
  if (!positionTimePoints.value.length) return
  const localPoint = positionTimePointFromEvent(event)
  if (localPoint.x < positionTimePlotLeft || localPoint.x > positionTimePlotRight || localPoint.y < positionTimePadding.top || localPoint.y > positionTimeChartHeight - positionTimePadding.bottom) {
    hoveredPositionTimeIndex.value = null
    return
  }
  const nearest = positionTimePoints.value.reduce<{ index: number; distance: number } | null>((candidate, point) => {
    const distance = Math.abs(positionTimeXFor(point.index) - localPoint.x)
    return !candidate || distance < candidate.distance ? { index: point.index, distance } : candidate
  }, null)
  hoveredPositionTimeIndex.value = nearest?.index ?? null
  positionTimeTooltipPosition.value = { x: event.clientX, y: event.clientY }
}
const clearPositionTimeHover = () => {
  hoveredPositionTimeIndex.value = null
}

const durationProfitTradePoints = computed(() => props.trades
  .map((trade, index) => {
    const normalized = normalizeTrade(trade)
    const rawDurationHours = getTradeDurationHours(normalized)
    const resultPercent = capitalResultPercentFor(trade)
    const riskRewardPoint = riskRewardPoints.value[index]
    return {
      index,
      asset: riskRewardPoint?.asset ?? 'UNKNOWN',
      direction: riskRewardPoint?.direction ?? '—',
      closeDate: riskRewardPoint?.closeDate ?? '—',
      durationHours: Number.isFinite(rawDurationHours) ? rawDurationHours : null,
      resultPercent
    }
  })
  .filter(point => point.durationHours !== null && point.resultPercent !== null))
const durationProfitBucketLabel = (index: number, count: number) => {
  if (count === 2) return index === 0 ? (isRu.value ? 'Короткие' : 'Short') : (isRu.value ? 'Длинные' : 'Long')
  return index === 0 ? (isRu.value ? 'Короткие' : 'Short') : index === 1 ? (isRu.value ? 'Средние' : 'Medium') : (isRu.value ? 'Длинные' : 'Long')
}
const durationProfitBuckets = computed(() => {
  const points = [...durationProfitTradePoints.value].sort((left, right) => left.durationHours! - right.durationHours!)
  const bucketCount = Math.min(3, points.length)
  return Array.from({ length: bucketCount }, (_, index) => {
    const start = Math.floor(index * points.length / bucketCount)
    const end = Math.floor((index + 1) * points.length / bucketCount)
    const bucketPoints = points.slice(start, end)
    const durations = bucketPoints.map(point => point.durationHours!)
    const results = bucketPoints.map(point => point.resultPercent!)
    return {
      index,
      label: durationProfitBucketLabel(index, bucketCount),
      minHours: Math.min(...durations),
      maxHours: Math.max(...durations),
      medianResult: medianOf(results),
      count: bucketPoints.length
    }
  })
})
const durationProfitYDomain = computed(() => {
  const values = durationProfitBuckets.value.map(bucket => bucket.medianResult)
  if (!values.length) return { min: -1, max: 1 }
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const padding = Math.max((max - min) * 0.15, 0.5)
  return { min: min - padding, max: max + padding }
})
const durationProfitChartWidth = 1000
const durationProfitChartHeight = 320
const durationProfitPadding = { top: 32, right: 70, bottom: 56, left: 112 }
const durationProfitPlotLeft = durationProfitPadding.left
const durationProfitPlotRight = durationProfitChartWidth - durationProfitPadding.right
const durationProfitPlotWidth = durationProfitPlotRight - durationProfitPlotLeft
const durationProfitPlotHeight = durationProfitChartHeight - durationProfitPadding.top - durationProfitPadding.bottom
const durationProfitYFor = (value: number) => durationProfitPadding.top
  + (1 - (value - durationProfitYDomain.value.min) / Math.max(1e-9, durationProfitYDomain.value.max - durationProfitYDomain.value.min)) * durationProfitPlotHeight
const durationProfitZeroY = computed(() => durationProfitYFor(0))
const durationProfitYTicks = computed(() => positionTimeTicksFor(durationProfitYDomain.value))
const durationProfitBarWidth = computed(() => durationProfitBuckets.value.length
  ? Math.min(180, durationProfitPlotWidth / durationProfitBuckets.value.length * 0.56)
  : 0)
const durationProfitBarX = (index: number) => durationProfitPlotLeft
  + ((index + 0.5) / Math.max(1, durationProfitBuckets.value.length)) * durationProfitPlotWidth
  - durationProfitBarWidth.value / 2
const durationProfitHoursFormatted = (value: number) => `${value.toFixed(value >= 10 ? 0 : 1)}${isRu.value ? ' ч' : ' h'}`
const durationProfitRangeFormatted = (minHours: number, maxHours: number) => minHours === maxHours
  ? durationProfitHoursFormatted(minHours)
  : `${durationProfitHoursFormatted(minHours)}–${durationProfitHoursFormatted(maxHours)}`
const hoveredDurationProfitIndex = ref<number | null>(null)
const durationProfitTooltipPosition = ref({ x: 0, y: 0 })
const hoveredDurationProfitBucket = computed(() => hoveredDurationProfitIndex.value === null
  ? null
  : durationProfitBuckets.value[hoveredDurationProfitIndex.value] ?? null)
const handleDurationProfitHover = (event: MouseEvent, bucket: { index: number }) => {
  hoveredDurationProfitIndex.value = bucket.index
  durationProfitTooltipPosition.value = { x: event.clientX, y: event.clientY }
}
const clearDurationProfitHover = () => {
  hoveredDurationProfitIndex.value = null
}
</script>

<template>
  <section id="report-section-risk-execution" class="min-h-screen px-[clamp(1.5rem,7vw,8rem)] py-16 text-white sm:py-24">
    <div class="mx-auto max-w-5xl">
      <ExStrategyReportPageNumber page="03" total="07" />
      <div class="mt-12">
        <ExStrategyReportSectionHeading>{{ isRu ? 'Риск и исполнение' : 'Risk & Execution' }}</ExStrategyReportSectionHeading>
        <ExStrategyReportSectionSubheading muted>{{ isRu ? 'Стопы, цели, размер позиции, экспозиция и длительность удержания.' : 'Stops, targets, position sizing, exposure and holding time.' }}</ExStrategyReportSectionSubheading>
      </div>

      <div v-if="hasRiskData" class="mt-12">
        <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ isRu ? 'I · Аудит риска' : 'I · Risk audit' }}</div>
        <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ isRu ? 'Медианный риск по стоп-лоссу, медианный фактический убыток и медианный Risk / Reward по прибыльным сделкам.' : 'Median stop-loss risk, median realized loss and median Risk / Reward on profitable trades.' }}</div>
        <div class="mt-8 bg-white/[0.025] p-3 sm:p-5">
          <svg :viewBox="`0 0 ${riskChartWidth} ${riskChartHeight}`" class="h-[16rem] w-full" role="img" :aria-label="isRu ? 'Сравнение планового риска и фактического убытка' : 'Planned risk compared with realized loss'">
            <line :x1="riskBaselineX" :x2="riskBaselineX" y1="28" y2="306" stroke="white" stroke-opacity="0.42" stroke-dasharray="4 5" />
            <line v-if="riskBudgetX !== null" :x1="riskBudgetX" :x2="riskBudgetX" y1="22" y2="306" stroke="#94a3b8" stroke-width="2" stroke-dasharray="5 5" />
            <text v-if="riskBudgetX !== null" :x="riskBudgetX" y="14" text-anchor="middle" fill="#94a3b8" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" font-weight="700">{{ formatMoney(configuredRiskBudget || 0) }}</text>

            <text :x="riskBaselineX + riskBarWidth(medianPlannedRisk) / 2" y="48" text-anchor="middle" fill="white" fill-opacity="0.9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="700">{{ isRu ? 'Риск по стоп-лоссу (медианный)' : 'Stop-loss risk (median)' }}</text>
            <rect :x="riskBaselineX" y="58" :width="riskBarWidth(medianPlannedRisk)" height="42" fill="#f1f1f1" fill-opacity="0.88" />
            <text :x="riskBaselineX + riskBarWidth(medianPlannedRisk) + 10" y="85" text-anchor="start" fill="white" fill-opacity="0.95" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" font-weight="700">{{ medianPlannedRisk ? formatMoney(medianPlannedRisk) : '—' }}</text>

            <text :x="riskBaselineX + riskBarWidth(medianRealizedLoss) / 2" y="128" text-anchor="middle" fill="white" fill-opacity="0.9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="700">{{ isRu ? 'Фактический убыток (медианный)' : 'Realized loss (median)' }}</text>
            <rect :x="riskBaselineX" y="138" :width="riskBarWidth(medianRealizedLoss)" height="42" fill="#64748b" fill-opacity="0.88" />
            <text :x="riskBaselineX + riskBarWidth(medianRealizedLoss) + 10" y="165" text-anchor="start" fill="white" fill-opacity="0.95" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" font-weight="700">{{ medianRealizedLoss ? formatMoney(medianRealizedLoss) : '—' }}</text>

            <text :x="riskBaselineX + riskRewardAuditBarWidth(medianProfitableRiskReward) / 2" y="208" text-anchor="middle" fill="white" fill-opacity="0.9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="700">{{ isRu ? 'Риск / Награда по прибыльным сделкам (медианный)' : 'Risk / Reward on profitable trades (median)' }}</text>
            <rect :x="riskBaselineX" y="218" :width="riskRewardAuditBarWidth(medianProfitableRiskReward)" height="42" fill="#94a3b8" fill-opacity="0.88" />
            <text :x="riskBaselineX + riskRewardAuditBarWidth(medianProfitableRiskReward) + 10" y="245" text-anchor="start" fill="white" fill-opacity="0.95" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" font-weight="700">{{ medianProfitableRiskReward ? `+${medianProfitableRiskReward.toFixed(2)}R` : '—' }}</text>

            <text :x="riskBaselineX" y="328" text-anchor="middle" fill="white" fill-opacity="0.6" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12">$0 / 0R</text>
          </svg>
        </div>
        <div class="mt-3 font-serif text-sm text-white/70 sm:text-base">
          {{ isRu ? 'Плановый риск рассчитан по расстоянию до стоп-лосса; фактический убыток — по закрытым убыточным сделкам.' : 'Planned risk uses the stop-loss distance; realized loss uses closed losing trades.' }}<span v-if="configuredRiskBudget !== null"> {{ isRu ? `Превышений лимита: ${riskBreachCount}.` : `Limit breaches: ${riskBreachCount}.` }}</span>
        </div>

        <div v-if="riskRewardPoints.length" class="mt-14">
          <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ isRu ? 'II · Фактический Risk/Reward по сделкам' : 'II · Actual Risk/Reward by trade' }}</div>
          <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ isRu ? 'Линия показывает результат каждой сделки в единицах риска R; пустые участки означают отсутствие стоп-лосса.' : 'The line shows each trade result in risk units R; empty gaps indicate that no stop-loss was set.' }}</div>
          <div class="mt-8 bg-white/[0.025] p-3 sm:p-5">
            <div>
              <svg :viewBox="`0 0 ${riskRewardChartWidth} ${riskRewardChartHeight}`" class="h-[20rem] w-full" role="img" :aria-label="isRu ? 'Фактический Risk/Reward по сделкам' : 'Actual Risk/Reward by trade'" @mousemove="handleRiskRewardPointerMove" @mouseleave="clearRiskRewardHover">
              <text :x="riskRewardPadding.left - 48" :y="riskRewardPadding.top + riskRewardPlotHeight / 2 + 5" text-anchor="middle" fill="white" fill-opacity="0.8" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" font-weight="600" :transform="`rotate(-90 ${riskRewardPadding.left - 48} ${riskRewardPadding.top + riskRewardPlotHeight / 2 + 5})`">Risk Reward</text>
              <line :x1="riskRewardPlotLeft" :x2="riskRewardChartWidth - riskRewardPadding.right" :y1="riskRewardZeroY" :y2="riskRewardZeroY" stroke="white" stroke-opacity="0.4" stroke-dasharray="4 5" />
              <line v-for="tick in riskRewardTicks" :key="`rr-y-${tick}`" :x1="riskRewardPlotLeft" :x2="riskRewardChartWidth - riskRewardPadding.right" :y1="riskRewardYFor(tick)" :y2="riskRewardYFor(tick)" stroke="white" stroke-opacity="0.06" />
              <path :d="riskRewardPath" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
              <path :d="riskRewardSmaPath" fill="none" stroke="#94a3b8" stroke-width="2.2" stroke-dasharray="7 5" stroke-linecap="round" stroke-linejoin="round" />
              <g v-for="point in riskRewardPoints" :key="`rr-point-${point.index}`">
                <circle v-if="point.riskReward !== null" :cx="riskRewardXFor(point.index)" :cy="riskRewardYFor(point.riskReward)" r="3.5" fill="white" stroke="#0b0b0b" stroke-width="1.5" />
              </g>
              <g v-if="hoveredRiskRewardPoint">
                <line :x1="riskRewardXFor(hoveredRiskRewardPoint.index)" :x2="riskRewardXFor(hoveredRiskRewardPoint.index)" :y1="riskRewardPadding.top" :y2="riskRewardChartHeight - riskRewardPadding.bottom" stroke="white" stroke-opacity="0.35" stroke-dasharray="3 4" />
                <circle v-if="hoveredRiskRewardPoint.riskReward !== null" :cx="riskRewardXFor(hoveredRiskRewardPoint.index)" :cy="riskRewardYFor(hoveredRiskRewardPoint.riskReward)" r="5" fill="white" stroke="black" stroke-width="1.5" />
                <circle v-if="hoveredRiskRewardSma !== null" :cx="riskRewardXFor(hoveredRiskRewardPoint.index)" :cy="riskRewardYFor(hoveredRiskRewardSma)" r="5" fill="#94a3b8" stroke="black" stroke-width="1.5" />
              </g>
              <text v-for="tick in riskRewardTicks" :key="`rr-label-${tick}`" :x="riskRewardAxisLabelX" :y="riskRewardYFor(tick) + 5" text-anchor="end" fill="white" fill-opacity="0.9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="600">{{ riskRewardAxisFormatted(tick) }}</text>
              <text v-for="tick in riskRewardXTicks" :key="`rr-x-${tick.index}`" :x="riskRewardXFor(tick.index)" :y="riskRewardChartHeight - 10" :text-anchor="tick.index === 0 ? 'start' : tick.index === riskRewardPoints.length - 1 ? 'end' : 'middle'" fill="white" fill-opacity="0.9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="600">{{ tick.label }}</text>
              </svg>
            </div>
            <div class="mt-3 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
              <span class="inline-flex items-center gap-2"><i class="h-0.5 w-4 bg-white"></i>{{ isRu ? 'Risk Reward' : 'Risk Reward' }}</span>
              <span class="inline-flex items-center gap-2"><i class="h-0.5 w-4 bg-slate-400"></i>{{ `SMA (${riskRewardSmaWindow})` }}</span>
            </div>
            <Teleport to="body">
              <div v-if="hoveredRiskRewardPoint" class="pointer-events-none fixed z-[2147483647] -translate-x-1/2 -translate-y-full border border-white/35 bg-black/95 px-4 py-3 font-mono text-[11px] font-semibold leading-relaxed text-white shadow-[0_10px_30px_rgba(0,0,0,0.55)]" :style="{ left: `${riskRewardTooltipPosition.x}px`, top: `${riskRewardTooltipPosition.y - 14}px` }" role="tooltip">
                <div class="mb-2 border-b border-white/25 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/95">{{ hoveredRiskRewardPoint.asset }}</div>
                <div class="flex min-w-[190px] items-center justify-between gap-5"><span class="text-white/85">{{ isRu ? 'Направление' : 'Direction' }}</span><span class="font-bold text-white">{{ hoveredRiskRewardPoint.direction }}</span></div>
                <div class="mt-1 flex min-w-[190px] items-center justify-between gap-5"><span class="text-white/85">{{ isRu ? 'Дата закрытия' : 'Close date' }}</span><span class="font-bold text-white">{{ hoveredRiskRewardPoint.closeDate }}</span></div>
                <div class="mt-1 flex min-w-[190px] items-center justify-between gap-5"><span class="text-white/85">Risk/Reward</span><span class="font-bold text-white">{{ hoveredRiskRewardPoint.riskReward === null ? (isRu ? 'Нет стоп-лосса' : 'No stop-loss') : riskRewardFormatted(hoveredRiskRewardPoint.riskReward) }}</span></div>
                <div class="mt-1 flex min-w-[190px] items-center justify-between gap-5"><span class="text-white/85">SMA ({{ riskRewardSmaWindow }})</span><span class="font-bold text-white">{{ riskRewardFormatted(hoveredRiskRewardSma) }}</span></div>
              </div>
            </Teleport>
          </div>
        </div>

        <div v-if="positionTimePoints.length" class="mt-14">
          <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ isRu ? 'III · Размер позиции' : 'III · Position size' }}</div>
          <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ isRu ? 'Столбцы показывают размер позиции в долларах по каждой сделке.' : 'Bars show the position size in dollars for each trade.' }}</div>
          <div class="mt-8 bg-white/[0.025] p-3 sm:p-5">
            <svg :viewBox="`0 0 ${positionTimeChartWidth} ${positionTimeChartHeight}`" class="h-[20rem] w-full" role="img" :aria-label="isRu ? 'Размер позиции по сделкам' : 'Position size by trade'" @mousemove="handlePositionTimePointerMove" @mouseleave="clearPositionTimeHover">
              <line :x1="positionTimePlotLeft" :x2="positionTimePlotRight" :y1="positionSizeYFor(0)" :y2="positionSizeYFor(0)" stroke="white" stroke-opacity="0.4" stroke-dasharray="4 5" />
              <line v-for="tick in positionSizeTicks" :key="`position-y-grid-${tick}`" :x1="positionTimePlotLeft" :x2="positionTimePlotRight" :y1="positionSizeYFor(tick)" :y2="positionSizeYFor(tick)" stroke="white" stroke-opacity="0.06" />
              <g v-for="point in positionTimePoints" :key="`position-time-point-${point.index}`">
                <rect v-if="point.positionSize !== null" :x="positionSizeBarX(point.index)" :y="positionSizeYFor(point.positionSize)" :width="positionTimeBarWidth" :height="positionSizeYFor(0) - positionSizeYFor(point.positionSize)" fill="white" fill-opacity="0.82" />
              </g>
              <g v-if="hoveredPositionTimePoint">
                <line :x1="positionTimeXFor(hoveredPositionTimePoint.index)" :x2="positionTimeXFor(hoveredPositionTimePoint.index)" :y1="positionTimePadding.top" :y2="positionTimeChartHeight - positionTimePadding.bottom" stroke="white" stroke-opacity="0.35" stroke-dasharray="3 4" />
                <rect v-if="hoveredPositionTimePoint.positionSize !== null" :x="positionSizeBarX(hoveredPositionTimePoint.index)" :y="positionSizeYFor(hoveredPositionTimePoint.positionSize)" :width="positionTimeBarWidth" :height="positionSizeYFor(0) - positionSizeYFor(hoveredPositionTimePoint.positionSize)" fill="white" stroke="black" stroke-width="1.5" />
              </g>
              <text v-for="tick in positionSizeTicks" :key="`position-y-label-${tick}`" :x="positionTimePlotLeft - 32" :y="positionSizeYFor(tick) + 5" text-anchor="end" fill="white" fill-opacity="0.9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="600">{{ positionSizeFormatted(tick) }}</text>
              <text v-for="tick in positionTimeXTicks" :key="`position-time-x-${tick.index}`" :x="positionTimeXFor(tick.index)" :y="positionTimeChartHeight - 10" :text-anchor="tick.index === 0 ? 'start' : tick.index === positionTimePoints.length - 1 ? 'end' : 'middle'" fill="white" fill-opacity="0.9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="600">{{ tick.label }}</text>
            </svg>
            <div class="mt-3 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
              <span class="inline-flex items-center gap-2"><i class="h-3 w-2 bg-white"></i>{{ isRu ? 'Размер позиции' : 'Position size' }}</span>
            </div>
            <Teleport to="body">
              <div v-if="hoveredPositionTimePoint" class="pointer-events-none fixed z-[2147483647] -translate-x-1/2 -translate-y-full border border-white/35 bg-black/95 px-4 py-3 font-mono text-[11px] font-semibold leading-relaxed text-white shadow-[0_10px_30px_rgba(0,0,0,0.55)]" :style="{ left: `${positionTimeTooltipPosition.x}px`, top: `${positionTimeTooltipPosition.y - 14}px` }" role="tooltip">
                <div class="mb-2 border-b border-white/25 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/95">{{ hoveredPositionTimePoint.asset }}</div>
                <div class="flex min-w-[210px] items-center justify-between gap-5"><span class="text-white/85">{{ isRu ? 'Размер позиции' : 'Position size' }}</span><span class="font-bold text-white">{{ positionSizeFormatted(hoveredPositionTimePoint.positionSize) }}</span></div>
              </div>
            </Teleport>
          </div>
          <div v-if="positionSizeDetails.average !== null" class="mt-8">
            <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ isRu ? 'Подробности' : 'Details' }}</div>
            <div class="mt-2 font-serif text-sm text-white/70 sm:text-base">
              {{ isRu ? 'Средний размер позиции' : 'Average position size' }} — <span class="font-mono font-semibold text-white">{{ positionSizeFormatted(positionSizeDetails.average) }}</span>; {{ isRu ? 'результат от капитала по самой большой позиции' : 'capital result on the largest position' }} ({{ positionSizeFormatted(positionSizeDetails.largest?.positionSize ?? null) }}) — <span class="font-mono font-semibold text-white">{{ capitalResultPercentFormatted(positionSizeDetails.largest?.resultPercent) }}</span>; {{ isRu ? 'по самой маленькой' : 'on the smallest' }} ({{ positionSizeFormatted(positionSizeDetails.smallest?.positionSize ?? null) }}) — <span class="font-mono font-semibold text-white">{{ capitalResultPercentFormatted(positionSizeDetails.smallest?.resultPercent) }}</span>.
            </div>
          </div>
        </div>

        <div v-if="durationProfitBuckets.length" class="mt-14">
          <div class="font-serif text-[12px] uppercase tracking-[0.2em] text-white/75">{{ isRu ? 'IV · Прибыльность по длительности позиции' : 'IV · Profitability by holding time' }}</div>
          <div class="mt-2 font-serif text-sm text-white/55 sm:text-base">{{ isRu ? 'Сделки разделены на короткие, средние и длинные по длительности; высота столбца показывает медианный результат от капитала.' : 'Trades are grouped into short, medium and long holding times; bar height shows the median capital return.' }}</div>
          <div class="mt-8 bg-white/[0.025] p-3 sm:p-5">
            <svg :viewBox="`0 0 ${durationProfitChartWidth} ${durationProfitChartHeight}`" class="h-[20rem] w-full" role="img" :aria-label="isRu ? 'Прибыльность по длительности позиции' : 'Profitability by holding time'" @mouseleave="clearDurationProfitHover">
              <line :x1="durationProfitPlotLeft" :x2="durationProfitPlotRight" :y1="durationProfitZeroY" :y2="durationProfitZeroY" stroke="white" stroke-opacity="0.4" stroke-dasharray="4 5" />
              <g v-for="tick in durationProfitYTicks" :key="`duration-profit-y-grid-${tick}`">
                <line :x1="durationProfitPlotLeft" :x2="durationProfitPlotRight" :y1="durationProfitYFor(tick)" :y2="durationProfitYFor(tick)" stroke="white" stroke-opacity="0.06" />
                <text :x="durationProfitPlotLeft - 14" :y="durationProfitYFor(tick) + 5" text-anchor="end" fill="white" fill-opacity="0.9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="600">{{ capitalResultPercentFormatted(tick) }}</text>
              </g>
              <g v-for="bucket in durationProfitBuckets" :key="`duration-profit-bucket-${bucket.index}`" @mouseenter="handleDurationProfitHover($event, bucket)" @mousemove="handleDurationProfitHover($event, bucket)">
                <rect :x="durationProfitBarX(bucket.index)" :y="durationProfitYFor(Math.max(0, bucket.medianResult))" :width="durationProfitBarWidth" :height="Math.abs(durationProfitYFor(bucket.medianResult) - durationProfitZeroY)" :fill="bucket.medianResult >= 0 ? '#f1f1f1' : '#64748b'" fill-opacity="0.88" />
                <text :x="durationProfitBarX(bucket.index) + durationProfitBarWidth / 2" :y="durationProfitYFor(bucket.medianResult) + (bucket.medianResult >= 0 ? -10 : 22)" text-anchor="middle" fill="white" fill-opacity="0.95" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" font-weight="700">{{ capitalResultPercentFormatted(bucket.medianResult) }}</text>
                <text :x="durationProfitBarX(bucket.index) + durationProfitBarWidth / 2" :y="durationProfitChartHeight - durationProfitPadding.bottom + 24" text-anchor="middle" fill="white" fill-opacity="0.95" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" font-weight="700">{{ bucket.label }}</text>
                <text :x="durationProfitBarX(bucket.index) + durationProfitBarWidth / 2" :y="durationProfitChartHeight - durationProfitPadding.bottom + 42" text-anchor="middle" fill="white" fill-opacity="0.65" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" font-weight="600">{{ bucket.count }} {{ isRu ? 'сдел.' : 'trades' }}</text>
              </g>
              <text :x="durationProfitPlotLeft - 76" :y="durationProfitPadding.top + durationProfitPlotHeight / 2" text-anchor="middle" fill="white" fill-opacity="0.72" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" font-weight="600" :transform="`rotate(-90 ${durationProfitPlotLeft - 76} ${durationProfitPadding.top + durationProfitPlotHeight / 2})`">{{ isRu ? 'Результат, %' : 'Return, %' }}</text>
            </svg>
            <Teleport to="body">
              <div v-if="hoveredDurationProfitBucket" class="pointer-events-none fixed z-[2147483647] -translate-x-1/2 -translate-y-full border border-white/35 bg-black/95 px-4 py-3 font-mono text-[11px] font-semibold leading-relaxed text-white shadow-[0_10px_30px_rgba(0,0,0,0.55)]" :style="{ left: `${durationProfitTooltipPosition.x}px`, top: `${durationProfitTooltipPosition.y - 14}px` }" role="tooltip">
                <div class="mb-2 border-b border-white/25 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/95">{{ hoveredDurationProfitBucket.label }}</div>
                <div class="flex min-w-[210px] items-center justify-between gap-5"><span class="text-white/85">{{ isRu ? 'Диапазон' : 'Range' }}</span><span class="font-bold text-white">{{ durationProfitRangeFormatted(hoveredDurationProfitBucket.minHours, hoveredDurationProfitBucket.maxHours) }}</span></div>
                <div class="mt-1 flex min-w-[210px] items-center justify-between gap-5"><span class="text-white/85">{{ isRu ? 'Сделки' : 'Trades' }}</span><span class="font-bold text-white">{{ hoveredDurationProfitBucket.count }}</span></div>
                <div class="mt-1 flex min-w-[210px] items-center justify-between gap-5"><span class="text-white/85">{{ isRu ? 'Медианный результат' : 'Median return' }}</span><span class="font-bold text-white">{{ capitalResultPercentFormatted(hoveredDurationProfitBucket.medianResult) }}</span></div>
              </div>
            </Teleport>
          </div>
        </div>

      </div>
      <div v-else class="mt-12 font-serif text-base text-white/55">{{ isRu ? 'Недостаточно данных для аудита риска.' : 'Insufficient data for a risk audit.' }}</div>
    </div>
  </section>
</template>
