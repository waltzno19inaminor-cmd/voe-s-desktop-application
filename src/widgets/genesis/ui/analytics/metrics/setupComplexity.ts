import type { MetricEngine } from '~/entities/metric'
import { createUnavailableMetricResult, getActiveConditionCount } from './metricUtils'

export const setupComplexityMetric: MetricEngine = {
  key: 'setup_complexity',
  category: 'adherence',
  i18n: {
    ru: {
      label: 'Сложность сетапа',
      sub: 'Относительно медианы правил',
      desc: 'Оценивает общее количество сработавших правил по сравнению с медианным количеством правил для этого сценария.',
      formula: 'Активные правила / Медиана сценария',
      benchmark: '<= 1.5 раза (Сбалансированный сетап)',
      evaluation: 'Сложность и лаконичность торгового сценария.'
    },
    en: {
      label: 'Setup Complexity',
      sub: 'vs Scenario Median',
      desc: 'Evaluates total count of active rules versus historical median rule count for the entry scenario.',
      formula: 'Active Rules / Scenario Median',
      benchmark: '<= 1.5x (Good)',
      evaluation: 'Complexity relative to scenario benchmark.'
    }
  },
  calculate(trade: any, _context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const activeRules = getActiveConditionCount(trade)
    if (activeRules <= 0) {
      return createUnavailableMetricResult(locale, isRu ? 'Нет условий сетапа' : 'No setup conditions')
    }

    const medianRules = Math.max(1, Number(trade?.scenarioMedianRules || 3))
    const ratio = activeRules / medianRules

    const isGood = ratio <= 1.5
    const evalClass = isGood ? 'text-emerald-500' : 'text-amber-500'

    return {
      rawValue: ratio,
      formattedValue: `${ratio.toFixed(2)}x`,
      status: isGood ? 'optimal' : 'warning',
      evaluationText: isGood ? (isRu ? 'Хорошо' : 'Good') : (isRu ? 'Переусложнен' : 'Over-Complicated'),
      evalClass,
      benchmarkText: isRu ? '<= 1.5x — Лаконичный сетап' : '<= 1.5x — Good Complexity',
      benchmarks: [
        { label: '<= 1.5x', eval: isRu ? 'Хорошо' : 'Good', class: 'text-emerald-500 font-bold' },
        { label: '> 1.5x', eval: isRu ? 'Переусложнен' : 'Over-Complicated', class: 'text-amber-500 font-bold' }
      ],
      progress: Math.min(100, ratio * 50),
      colorVal: isGood ? '#34d399' : '#fbbf24'
    }
  }
}
