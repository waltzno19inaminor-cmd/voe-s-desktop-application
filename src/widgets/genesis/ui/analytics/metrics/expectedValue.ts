import type { MetricEngine } from '~/entities/metric'
import { createUnavailableMetricResult } from './metricUtils'

export const expectedValueMetric: MetricEngine = {
  key: 'expectedValue',
  category: 'simple',
  i18n: {
    ru: {
      label: 'Математическое ожидание',
      sub: 'Статистическое матожидание на сделку',
      desc: 'Математическое ожидание профита на каждую исполняемую сделку данного сетапа.',
      formula: '(Процент прибыльных * Средняя прибыль) - (Процент убыточных * Средний убыток)',
      benchmark: '> $0.00 (Положительное преимущество)',
      evaluation: 'Математическое преимущество торговой системы.'
    },
    en: {
      label: 'Expected Value',
      sub: 'Statistical EV per trade',
      desc: 'Mathematical expectancy of expected return per executed setup trade.',
      formula: '(Win% * AvgWin) - (Loss% * AvgLoss)',
      benchmark: '> $0.00 (Positive Expectancy)',
      evaluation: 'Long-term statistical edge of the setup.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const ev = Number(context?.expectedValue)
    if (!Number.isFinite(ev)) {
      return createUnavailableMetricResult(locale, isRu ? 'Нужна историческая выборка сделок' : 'Trade history required')
    }

    let status: 'optimal' | 'stable' | 'neutral' | 'warning' | 'critical' = 'neutral'
    let evalText = isRu ? 'Нейтральное' : 'Neutral'
    let evalClass = 'text-amber-400'
    let colorVal = '#fbbf24'

    if (ev > 50) {
      status = 'optimal'
      evalText = isRu ? 'Высокое преимущество' : 'High Alpha'
      evalClass = 'text-emerald-400 font-bold'
      colorVal = '#34d399'
    } else if (ev > 0) {
      status = 'stable'
      evalText = isRu ? 'Положительное EV' : 'Positive Edge'
      evalClass = 'text-emerald-300'
      colorVal = '#6ee7b7'
    } else {
      status = 'critical'
      evalText = isRu ? 'Отрицательное EV' : 'Negative Expectancy'
      evalClass = 'text-rose-500 font-bold'
      colorVal = '#f43f5e'
    }

    const formattedValue = `${ev >= 0 ? '+' : ''}$${Math.abs(ev).toFixed(2)}`

    return {
      rawValue: ev,
      formattedValue,
      status,
      evaluationText: evalText,
      evalClass,
      benchmarkText: isRu ? '> $0.00 — Статистический плюс' : '> $0.00 — Positive Edge',
      benchmarks: [
        { label: '> $0.00', eval: isRu ? 'Положительный EV' : 'Positive Alpha', class: 'text-emerald-400 font-bold' },
        { label: '$0.00', eval: isRu ? 'Нулевой EV' : 'Zero Edge', class: 'text-amber-400' },
        { label: '< $0.00', eval: isRu ? 'Отрицательный EV' : 'Negative Drag', class: 'text-rose-500 font-bold' }
      ],
      progress: Math.min(100, Math.max(0, 50 + (ev / 3))),
      colorVal
    }
  }
}
