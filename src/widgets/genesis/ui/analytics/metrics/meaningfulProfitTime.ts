import type { MetricEngine } from '~/entities/metric'

export const meaningfulProfitTimeMetric: MetricEngine = {
  key: 'meaningfulProfitTime',
  category: 'in_trade',
  i18n: {
    ru: {
      label: 'Время в значимом плюсе',
      sub: 'Длительность в прибыли',
      desc: 'Время, проведенное позицией в зоне значимой прибыли за пределами шума.',
      formula: 'Сумма длительностей прибыльных свечей',
      benchmark: '> 45 мин (Уверенное удержание)',
      evaluation: 'Продолжительность нахождения в прибыльной фазе.'
    },
    en: {
      label: 'Meaningful Profit Time',
      sub: 'Time in profit zone',
      desc: 'Duration spent in meaningful profit beyond entry noise boundary.',
      formula: 'Sum(Profit Candle Durations)',
      benchmark: '> 45 min (Strong Hold)',
      evaluation: 'Duration of profitable trend expansion.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const seconds = Number(context?.meaningfulProfitSeconds || trade?.meaningfulProfitSeconds || 0)
    const minutes = Math.round(seconds / 60)

    const isRu = locale === 'ru'
    let status: 'optimal' | 'stable' | 'neutral' | 'warning' | 'critical' = 'neutral'
    let evalText = isRu ? 'Короткий плюс' : 'Brief Profit'
    let evalClass = 'text-amber-400'
    let colorVal = '#fbbf24'

    if (minutes >= 45) {
      status = 'optimal'
      evalText = isRu ? 'Длительный тренд' : 'Extended Run'
      evalClass = 'text-emerald-400 font-bold'
      colorVal = '#34d399'
    } else if (minutes > 15) {
      status = 'stable'
      evalText = isRu ? 'Умеренный плюс' : 'Moderate Run'
      evalClass = 'text-emerald-300'
      colorVal = '#6ee7b7'
    }

    const formattedValue = minutes >= 60
      ? `${(minutes / 60).toFixed(1)} ${isRu ? 'ч' : 'h'}`
      : `${minutes} ${isRu ? 'мин' : 'min'}`

    return {
      rawValue: minutes,
      formattedValue,
      status,
      evaluationText: evalText,
      evalClass,
      benchmarkText: isRu ? '> 45 мин — Полноценное движение' : '> 45 min — Full Expansion',
      benchmarks: [
        { label: isRu ? '>= 45 мин' : '>= 45 min', eval: isRu ? 'Отлично' : 'Optimal', class: 'text-emerald-400 font-bold' },
        { label: isRu ? '15 - 45 мин' : '15 - 45 min', eval: isRu ? 'Норма' : 'Moderate', class: 'text-amber-400' },
        { label: isRu ? '< 15 мин' : '< 15 min', eval: isRu ? 'Слишком коротко' : 'Brief', class: 'text-rose-400' }
      ],
      progress: Math.min(100, Math.max(0, (minutes / 60) * 100)),
      colorVal
    }
  }
}
