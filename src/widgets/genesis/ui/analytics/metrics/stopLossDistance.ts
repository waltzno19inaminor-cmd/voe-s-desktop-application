import type { MetricEngine } from '~/entities/metric'
import { createUnavailableMetricResult, getPositiveTradeLevels } from './metricUtils'

export const stopLossDistanceMetric: MetricEngine = {
  key: 'stop_loss_distance',
  category: 'execution',
  i18n: {
    ru: {
      label: 'Дистанция стоп-лосса',
      sub: 'Дистанция от входа в %',
      desc: 'Процентное расстояние от цены входа до установленного уровня стоп-лосса.',
      formula: '(|Цена входа - Стоп-лосс| / Цена входа) * 100',
      benchmark: '<= Средней дистанции стоп-лосс (Короткий стоп)',
      evaluation: 'Компактность стоп-приказа относительно средней нормы.'
    },
    en: {
      label: 'Stop Loss Distance',
      sub: 'Entry to Stop Loss in %',
      desc: 'Percentage distance between entry price and planned stop loss threshold.',
      formula: '(|Entry Price - Stop Loss| / Entry Price) * 100',
      benchmark: '<= Avg SL Dist (Tight Stop)',
      evaluation: 'Stop distance compactness versus average.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const { entry, stopLoss } = getPositiveTradeLevels(trade)
    if (entry === null || stopLoss === null) {
      return createUnavailableMetricResult(locale, isRu ? 'Нужны положительные Entry и Stop Loss' : 'Positive Entry and Stop Loss required')
    }
    const slDistPct = (Math.abs(entry - stopLoss) / entry) * 100
    const avgSlDistPct = Number(context?.avgSlDistPct || 2.0)

    const isTight = slDistPct <= avgSlDistPct
    const evalClass = isTight ? 'text-emerald-500' : 'text-amber-500'

    return {
      rawValue: slDistPct,
      formattedValue: `${slDistPct.toFixed(2)}%`,
      status: isTight ? 'optimal' : 'warning',
      evaluationText: isTight ? (isRu ? 'Хорошо' : 'Good') : (isRu ? 'Субоптимально' : 'Sub-Optimal'),
      evalClass,
      benchmarkText: isRu ? '<= Среднего SL — Короткий стоп' : '<= Avg SL Dist — Tight Stop',
      benchmarks: [
        { label: isRu ? '<= Среднего SL' : '<= Avg SL', eval: isRu ? 'Короткий стоп' : 'Tight Stop', class: 'text-emerald-500 font-bold' },
        { label: isRu ? '> Среднего SL' : '> Avg SL', eval: isRu ? 'Широкий стоп' : 'Wide Stop', class: 'text-amber-500 font-bold' }
      ],
      progress: Math.min(100, (slDistPct / (avgSlDistPct * 2)) * 100),
      colorVal: isTight ? '#34d399' : '#fbbf24'
    }
  }
}
