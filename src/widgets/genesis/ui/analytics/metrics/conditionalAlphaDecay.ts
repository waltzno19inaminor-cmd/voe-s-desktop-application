import type { MetricEngine } from '~/entities/metric'
import { createUnavailableMetricResult, getRequiredConditionStats } from './metricUtils'

export const conditionalAlphaDecayMetric: MetricEngine = {
  key: 'conditional_alpha_decay',
  category: 'strategy_execution',
  i18n: {
    ru: {
      label: 'Угасание условий',
      sub: 'Пропущенные правила',
      desc: 'Коррелирует негативные эмоциональные маркеры с отсутствующими обязательными правилами в наборе условий.',
      formula: 'Пропущенные обязательные правила * Штраф эмоций',
      benchmark: '0 правил (Без распада альфы)',
      evaluation: 'Потеря системного преимущества из-за отсутствия правил.'
    },
    en: {
      label: 'Conditional Alpha Decay',
      sub: 'Missing Rules Penalty',
      desc: 'Correlates negative emotional markers with required rules missing from executed condition set.',
      formula: 'Missing Required Rules * Emotion Penalty',
      benchmark: '0 Rules (Zero Decay)',
      evaluation: 'Systematic alpha loss due to omitted rules.'
    }
  },
  calculate(trade: any, _context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const stats = getRequiredConditionStats(trade)
    if (stats.total <= 0) {
      return createUnavailableMetricResult(locale, isRu ? 'Нет snapshot обязательных условий' : 'No required condition snapshot')
    }

    const missingCount = Math.max(0, stats.total - stats.used)

    const isZero = missingCount === 0
    const evalClass = isZero ? 'text-emerald-500' : 'text-rose-500'

    return {
      rawValue: missingCount,
      formattedValue: `-${missingCount} ${isRu ? 'Правил' : 'Rules'}`,
      status: isZero ? 'optimal' : 'critical',
      evaluationText: isZero ? (isRu ? 'Идеально' : 'Perfect') : (isRu ? 'Предупреждение распада' : 'Decay Warning'),
      evalClass,
      benchmarkText: isRu ? '0 Правил — Без потерь' : '0 Rules — Zero Decay',
      benchmarks: [
        { label: isRu ? '0 правил' : '0 Rules', eval: isRu ? 'Без распада' : 'Zero Decay', class: 'text-emerald-500 font-bold' },
        { label: isRu ? '> 0 правил' : '> 0 Rules', eval: isRu ? 'Распад альфы' : 'Alpha Decay', class: 'text-rose-500 font-bold' }
      ],
      progress: isZero ? 100 : 30,
      colorVal: isZero ? '#34d399' : '#f87171'
    }
  }
}
