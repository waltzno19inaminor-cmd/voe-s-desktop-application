import type { MetricEngine } from '~/entities/metric'
import { createUnavailableMetricResult, getRequiredConditionStats } from './metricUtils'

export const requiredAdherenceMetric: MetricEngine = {
  key: 'required_adherence',
  category: 'adherence',
  i18n: {
    ru: {
      label: 'Соблюдение матрицы',
      sub: 'Выполнено обязательных правил',
      desc: 'Оценивает процент обязательных условий матрицы, выполненных при исполнении сделки.',
      formula: '(Выполнено / Обязательные) * 100',
      benchmark: '100% (Идеальное соблюдение)',
      evaluation: 'Степень соблюдения базового алгоритма стратегии.'
    },
    en: {
      label: 'Required Adherence',
      sub: 'Fulfilled Required Rules',
      desc: 'Evaluates the percentage of required matrix conditions fulfilled during execution.',
      formula: '(Fulfilled / Required) * 100',
      benchmark: '100% (Perfect Adherence)',
      evaluation: 'Strictness of matrix protocol compliance.'
    }
  },
  calculate(trade: any, _context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const stats = getRequiredConditionStats(trade)
    if (stats.ratio === null) {
      return createUnavailableMetricResult(locale, isRu ? 'Нет snapshot обязательных условий' : 'No required condition snapshot')
    }

    const reqRatio = Math.min(100, Math.max(0, stats.ratio))

    const isPerfect = reqRatio === 100
    const evalClass = isPerfect ? 'text-emerald-500' : 'text-amber-500'

    return {
      rawValue: reqRatio,
      formattedValue: `${stats.used}/${stats.total} · ${reqRatio.toFixed(2)}%`,
      status: isPerfect ? 'optimal' : 'warning',
      evaluationText: isPerfect ? (isRu ? 'Идеально' : 'Perfect') : (isRu ? 'Субоптимально' : 'Sub-Optimal'),
      evalClass,
      benchmarkText: isRu ? '100% — Полное соответствие' : '100% — Full Compliance',
      benchmarks: [
        { label: '100%', eval: isRu ? 'Идеально' : 'Perfect', class: 'text-emerald-500 font-bold' },
        { label: '< 100%', eval: isRu ? 'Субоптимально' : 'Sub-Optimal', class: 'text-amber-500 font-bold' }
      ],
      progress: reqRatio,
      colorVal: isPerfect ? '#34d399' : '#fbbf24'
    }
  }
}
