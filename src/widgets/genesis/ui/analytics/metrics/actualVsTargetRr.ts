import type { MetricEngine } from '~/entities/metric'
import { createUnavailableMetricResult, getPositiveTradeLevels } from './metricUtils'

export const actualVsTargetRrMetric: MetricEngine = {
  key: 'actual_vs_target_rr',
  category: 'execution',
  i18n: {
    ru: {
      label: 'Фактический R/R',
      sub: 'Реализованное соотношение риска и прибыли',
      desc: 'Показывает фактический R/R сделки по цене выхода.',
      formula: 'Фактическое движение до выхода / Риск стоп-лосса',
      benchmark: '> 0R (Прибыльная сделка)',
      evaluation: 'Фактический результат сделки в единицах риска.'
    },
    en: {
      label: 'Actual R/R',
      sub: 'Realized Risk/Reward at exit',
      desc: 'Shows the trade’s actual R/R based on the exit price.',
      formula: 'Actual price move to exit / Stop-loss risk',
      benchmark: '> 0R (Profitable trade)',
      evaluation: 'Actual trade result measured in units of risk.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const levels = getPositiveTradeLevels(trade)
    const side = String(trade?.side || trade?.direction || '').toLowerCase()
    const isShort = side.includes('short') || side.includes('sell')
    const exit = Number(trade?.exit ?? trade?.exitPrice)
    if (levels.entry === null || levels.stopLoss === null || !Number.isFinite(exit)) {
      return createUnavailableMetricResult(locale, isRu ? 'Нужны валидные Entry, Stop Loss и Exit Price' : 'Valid Entry, Stop Loss, and Exit Price required')
    }

    const riskDistance = isShort ? levels.stopLoss - levels.entry : levels.entry - levels.stopLoss
    const signedMove = isShort ? levels.entry - exit : exit - levels.entry
    if (riskDistance <= 0) {
      return createUnavailableMetricResult(locale, isRu ? 'Невозможно рассчитать RR без валидного Stop Loss' : 'RR requires a valid Stop Loss')
    }
    const actualRr = signedMove / riskDistance
    const isProfitable = actualRr > 0
    const evalClass = isProfitable ? 'text-emerald-500' : 'text-rose-500'

    return {
      rawValue: actualRr,
      formattedValue: `${actualRr.toFixed(2)}R`,
      status: isProfitable ? 'optimal' : 'critical',
      evaluationText: isProfitable ? (isRu ? 'Прибыль' : 'Profitable') : (isRu ? 'Убыток' : 'Loss'),
      evalClass,
      benchmarkText: isRu ? '> 0R — Сделка прибыльная' : '> 0R — Profitable Trade',
      benchmarks: [
        { label: isRu ? '> 0R' : '> 0R', eval: isRu ? 'Прибыль' : 'Profit', class: 'text-emerald-500 font-bold' },
        { label: isRu ? '< 0R' : '< 0R', eval: isRu ? 'Убыток' : 'Loss', class: 'text-rose-500 font-bold' }
      ],
      progress: Math.min(100, Math.max(0, ((actualRr + 2) / 4) * 100)),
      colorVal: isProfitable ? '#34d399' : '#f87171'
    }
  }
}
