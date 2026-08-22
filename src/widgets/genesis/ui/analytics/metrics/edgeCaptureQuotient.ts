import type { MetricEngine } from '~/entities/metric'
import { createUnavailableMetricResult, getPositiveTradeLevels, getValidTradeRiskReward } from './metricUtils'

export const edgeCaptureQuotientMetric: MetricEngine = {
  key: 'edge_capture_quotient',
  category: 'strategy_execution',
  i18n: {
    ru: {
      label: 'Сохранение преимущества',
      sub: 'Фактический риск/прибыль / Базовый риск/прибыль',
      desc: 'Сравнивает фактически реализованное соотношение Риск/Прибыль с базовым ожидаемым риск/прибыль стратегии.',
      formula: 'Реализованный риск/прибыль / Базовый риск/прибыль',
      benchmark: '>= 1.0 раза (Преимущество сохранено)',
      evaluation: 'Сохранение математического преимущества.'
    },
    en: {
      label: 'Edge Capture Quotient',
      sub: 'Realized RR vs Baseline RR',
      desc: 'Compares realized Risk/Reward ratio against strategy expected baseline R/R.',
      formula: 'Realized RR / Baseline RR',
      benchmark: '>= 1.0x (Edge Maintained)',
      evaluation: 'Retention of mathematical edge.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const levels = getPositiveTradeLevels(trade)
    if (levels.entry === null || levels.stopLoss === null || levels.takeProfit === null) {
      return createUnavailableMetricResult(locale, isRu ? 'Невозможно рассчитать преимущество без валидного RR' : 'Valid RR required')
    }

    const realizedRr = getValidTradeRiskReward(trade) ?? (Number.isFinite(Number(context?.rr)) ? Number(context?.rr) : null)
    if (realizedRr === null || realizedRr <= 0) {
      return createUnavailableMetricResult(locale, isRu ? 'Невозможно рассчитать преимущество без валидного RR' : 'Valid RR required')
    }
    const baselineRr = Number(context?.baselineRr || 2.0)
    const quotient = realizedRr / baselineRr

    const isGood = quotient >= 1.0
    const evalClass = isGood ? 'text-emerald-500' : 'text-rose-500'

    return {
      rawValue: quotient,
      formattedValue: `${quotient.toFixed(2)}x`,
      status: isGood ? 'optimal' : 'critical',
      evaluationText: isGood ? (isRu ? 'Хорошо' : 'Good') : (isRu ? 'Субоптимально' : 'Sub-Optimal'),
      evalClass,
      benchmarkText: isRu ? '>= 1.0x — Преимущество сохранено' : '>= 1.0x — Edge Maintained',
      benchmarks: [
        { label: '>= 1.0x', eval: isRu ? 'Преимущество сохранено' : 'Edge Maintained', class: 'text-emerald-500 font-bold' },
        { label: '< 1.0x', eval: isRu ? 'Размытие преимущества' : 'Edge Diluted', class: 'text-rose-500 font-bold' }
      ],
      progress: Math.min(100, quotient * 50),
      colorVal: isGood ? '#34d399' : '#f87171'
    }
  }
}
