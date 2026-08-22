import type { MetricEngine } from '~/entities/metric'
import { createUnavailableMetricResult } from './metricUtils'

export const profitVelocityMetric: MetricEngine = {
  key: 'profit_velocity',
  category: 'execution',
  i18n: {
    ru: {
      label: 'Скорость прибыли',
      sub: 'PnL за час удержания',
      desc: 'Скорость получения PnL за каждый час удержания открытой позиции.',
      formula: 'PnL сделки / Часы удержания',
      benchmark: '> $50.00/ч (Высокая динамика)',
      evaluation: 'Эффективность использования времени позиции.'
    },
    en: {
      label: 'Profit Velocity',
      sub: 'PnL per holding hour',
      desc: 'PnL earned per hour of position holding time.',
      formula: 'Trade PnL / Duration Hours',
      benchmark: '> $50.00/h (High Momentum)',
      evaluation: 'Time efficiency of held capital.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const pnl = Number(trade?.profitInCurrency ?? trade?.pnl ?? trade?.profit ?? 0)
    const durationHours = Number(context?.durationHours ?? trade?.durationHours)
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      return createUnavailableMetricResult(locale, isRu ? 'Нужна длительность сделки' : 'Trade duration required')
    }
    const velocity = pnl / durationHours

    let status: 'optimal' | 'stable' | 'neutral' | 'warning' | 'critical' = 'neutral'
    let evalText = isRu ? 'Умеренная' : 'Moderate'
    let evalClass = 'text-amber-400'
    let colorVal = '#fbbf24'

    if (velocity > 50) {
      status = 'optimal'
      evalText = isRu ? 'Высокая динамика' : 'High Velocity'
      evalClass = 'text-emerald-400 font-bold'
      colorVal = '#34d399'
    } else if (velocity > 0) {
      status = 'stable'
      evalText = isRu ? 'Положительная' : 'Positive'
      evalClass = 'text-emerald-300'
      colorVal = '#6ee7b7'
    } else if (velocity < -50) {
      status = 'critical'
      evalText = isRu ? 'Быстрый убыток' : 'Rapid Loss'
      evalClass = 'text-rose-500 font-bold'
      colorVal = '#f43f5e'
    } else {
      status = 'warning'
      evalText = isRu ? 'Отрицательная' : 'Negative'
      evalClass = 'text-rose-400'
      colorVal = '#fb7185'
    }

    const formattedValue = `$${velocity.toFixed(2)}/${isRu ? 'ч' : 'h'}`

    return {
      rawValue: velocity,
      formattedValue,
      status,
      evaluationText: evalText,
      evalClass,
      benchmarkText: isRu ? '> $50.00/ч — Оптимально' : '> $50.00/h — Optimal',
      benchmarks: [
        { label: '> $50/h', eval: isRu ? 'Отлично' : 'Optimal', class: 'text-emerald-400 font-bold' },
        { label: '$0 - $50/h', eval: isRu ? 'Норма' : 'Moderate', class: 'text-amber-400' },
        { label: '< $0/h', eval: isRu ? 'Негативно' : 'Sub-Optimal', class: 'text-rose-400' }
      ],
      progress: Math.min(100, Math.max(0, 50 + (velocity / 2))),
      colorVal
    }
  }
}
