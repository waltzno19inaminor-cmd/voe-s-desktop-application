import type { MetricEngine } from '~/entities/metric'
import { createUnavailableMetricResult } from './metricUtils'

export const temporalExposureMetric: MetricEngine = {
  key: 'temporal_exposure',
  category: 'execution',
  i18n: {
    ru: {
      label: 'Время в позиции',
      sub: 'Длительность удержания',
      desc: 'Полное время нахождения капитала под рыночным риском от входа до выхода.',
      formula: 'Время выхода - Время входа',
      benchmark: '<= Средней длительности (Эффективно)',
      evaluation: 'Временной горизонт удержания позиции.'
    },
    en: {
      label: 'Temporal Exposure',
      sub: 'Holding Duration',
      desc: 'Total duration of trade from entry to exit protocol completion.',
      formula: 'Exit Timestamp - Entry Timestamp',
      benchmark: '<= Avg Duration (Efficient)',
      evaluation: 'Market exposure duration.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const durationMinutes = Number(context?.durationMinutes ?? trade?.durationMinutes)
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return createUnavailableMetricResult(locale, isRu ? 'Нужны время входа и выхода' : 'Entry and exit time required')
    }
    const avgDuration = Number(context?.avgDuration ?? durationMinutes)

    const isGood = durationMinutes <= avgDuration
    const evalClass = isGood ? 'text-emerald-500' : 'text-amber-500'

    const formattedValue = durationMinutes > 60
      ? `${(durationMinutes / 60).toFixed(2)}${isRu ? 'ч' : 'h'}`
      : `${durationMinutes.toFixed(2)}${isRu ? 'мин' : 'm'}`

    return {
      rawValue: durationMinutes,
      formattedValue,
      status: isGood ? 'optimal' : 'warning',
      evaluationText: isGood ? (isRu ? 'Хорошо' : 'Good') : (isRu ? 'Субоптимально' : 'Sub-Optimal'),
      evalClass,
      benchmarkText: isRu ? '<= Средняя длительность — Норма' : '<= Avg Duration — Efficient',
      benchmarks: [
        { label: isRu ? '<= Средней длительности' : '<= Avg Duration', eval: isRu ? 'Эффективно' : 'Efficient', class: 'text-emerald-500 font-bold' },
        { label: isRu ? '> Средней длительности' : '> Avg Duration', eval: isRu ? 'Затяжное удержание' : 'Extended Hold', class: 'text-amber-500 font-bold' }
      ],
      progress: Math.min(100, (durationMinutes / (avgDuration * 1.5)) * 100),
      colorVal: isGood ? '#34d399' : '#fbbf24'
    }
  }
}
