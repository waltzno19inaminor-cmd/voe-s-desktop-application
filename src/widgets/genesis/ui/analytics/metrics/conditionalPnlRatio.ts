import type { MetricEngine } from '~/entities/metric'
import { createUnavailableMetricResult, getActiveConditionCount } from './metricUtils'

export const conditionalPnlRatioMetric: MetricEngine = {
  key: 'conditional_pnl_ratio',
  category: 'adherence',
  i18n: {
    ru: {
      label: 'PnL на условие',
      sub: 'Соотношение прибыли к условиям сетапа',
      desc: 'Соотношение зафиксированной прибыли на одно активное торговое условие в сетапе.',
      formula: 'Реализованный PnL / Количество активных условий',
      benchmark: '> $100.00 / условие (Высокая эффективность)',
      evaluation: 'Эффективность каждого подтверждающего фактора сетапа.'
    },
    en: {
      label: 'Conditional PnL Ratio',
      sub: 'Profit ratio per setup condition',
      desc: 'Ratio of profit captured per active condition in the trading setup.',
      formula: 'Realized PnL / Active Conditions Count',
      benchmark: '> $100.00 / condition (High Efficiency)',
      evaluation: 'Profit return per confluence factor.'
    }
  },
  calculate(trade: any, _context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const pnl = Number(trade?.pnl || trade?.profit || 0)
    const conditionsCount = getActiveConditionCount(trade)
    if (conditionsCount <= 0) {
      return createUnavailableMetricResult(locale, isRu ? 'Нет активных условий' : 'No active conditions')
    }

    const ratio = pnl / conditionsCount
    let status: 'optimal' | 'stable' | 'neutral' | 'warning' | 'critical' = 'neutral'
    let evalText = isRu ? 'Умеренный' : 'Moderate'
    let evalClass = 'text-amber-400'
    let colorVal = '#fbbf24'

    if (ratio >= 100) {
      status = 'optimal'
      evalText = isRu ? 'Высокий КПД' : 'High Efficiency'
      evalClass = 'text-emerald-400 font-bold'
      colorVal = '#34d399'
    } else if (ratio > 0) {
      status = 'stable'
      evalText = isRu ? 'Положительный' : 'Positive'
      evalClass = 'text-emerald-300'
      colorVal = '#6ee7b7'
    } else {
      status = 'warning'
      evalText = isRu ? 'Отрицательный' : 'Negative'
      evalClass = 'text-rose-400 font-bold'
      colorVal = '#fb7185'
    }

    return {
      rawValue: ratio,
      formattedValue: `$${ratio.toFixed(2)}`,
      status,
      evaluationText: evalText,
      evalClass,
      benchmarkText: isRu ? '> $100.00 — Высокая сходимость' : '> $100.00 — High Confluence',
      benchmarks: [
        { label: '>= $100', eval: isRu ? 'Высокая отдача' : 'High Return', class: 'text-emerald-400 font-bold' },
        { label: '$0 - $100', eval: isRu ? 'Средняя отдача' : 'Moderate Return', class: 'text-amber-400' },
        { label: '< $0', eval: isRu ? 'Низкая отдача' : 'Negative', class: 'text-rose-400' }
      ],
      progress: Math.min(100, Math.max(0, 50 + (ratio / 4))),
      colorVal
    }
  }
}
