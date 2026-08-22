import type { MetricEngine } from '~/entities/metric'
import { createUnavailableMetricResult } from './metricUtils'

export const velocityVarianceIndexMetric: MetricEngine = {
  key: 'velocity_variance_index',
  category: 'strategy_execution',
  i18n: {
    ru: {
      label: 'Вариация скорости PnL',
      sub: 'Скорость к базом PnL/h',
      desc: 'Сравнивает фактически реализованную скорость прибыли со средней базовой скоростью стратегии в долларах в час.',
      formula: 'Фактическая скорость / Базовая скорость',
      benchmark: '>= 1.0 раза (Оптимальный темп)',
      evaluation: 'Темп роста профита за час удержания.'
    },
    en: {
      label: 'Velocity Variance Index',
      sub: 'Realized vs Baseline $/h',
      desc: 'Compares realized profit velocity against strategy historical baseline velocity in dollars per hour.',
      formula: 'Realized Velocity / Baseline Velocity',
      benchmark: '>= 1.0x (Optimal Pacing)',
      evaluation: 'Execution pacing efficiency.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const durationHours = Number(context?.durationHours ?? trade?.durationHours)
    const tradePnl = Number(trade?.profitInCurrency ?? trade?.pnl ?? trade?.profit ?? 0)
    const velocity = Number(context?.velocity ?? trade?.velocity ?? (
      Number.isFinite(durationHours) && durationHours > 0 ? tradePnl / durationHours : Number.NaN
    ))
    const baseVelocity = Number(context?.avgVelocity)
    if (!Number.isFinite(velocity) || !Number.isFinite(baseVelocity) || baseVelocity === 0) {
      return createUnavailableMetricResult(locale, isRu ? 'Нужна скорость сделки и средняя скорость стратегии' : 'Trade and baseline velocity required')
    }
    const indexVal = velocity / baseVelocity

    const isGood = indexVal >= 1.0
    const evalClass = isGood ? 'text-emerald-500' : 'text-amber-500'

    return {
      rawValue: indexVal,
      formattedValue: `${indexVal.toFixed(2)}x`,
      status: isGood ? 'optimal' : 'warning',
      evaluationText: isGood ? (isRu ? 'Хорошо' : 'Good') : (isRu ? 'Субоптимально' : 'Sub-Optimal'),
      evalClass,
      benchmarkText: isRu ? '>= 1.0x — Высокий темп' : '>= 1.0x — Optimal Pacing',
      benchmarks: [
        { label: '>= 1.0x', eval: isRu ? 'Оптимальный темп' : 'Optimal Pacing', class: 'text-emerald-500 font-bold' },
        { label: '< 1.0x', eval: isRu ? 'Замедление темпа' : 'Lagging Velocity', class: 'text-amber-500 font-bold' }
      ],
      progress: Math.min(100, indexVal * 50),
      colorVal: isGood ? '#34d399' : '#fbbf24'
    }
  }
}
