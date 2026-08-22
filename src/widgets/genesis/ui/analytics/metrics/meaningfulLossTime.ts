import type { MetricEngine } from '~/entities/metric'

export const meaningfulLossTimeMetric: MetricEngine = {
  key: 'meaningfulLossTime',
  category: 'in_trade',
  i18n: {
    ru: {
      label: 'Время в значимом убытке',
      sub: 'Длительность просадки',
      desc: 'Время, проведенное позицией в зоне значимого убытка за пределами шума.',
      formula: 'Сумма длительностей свечей в просадке',
      benchmark: '< 30 мин (Быстрый выход/отскок)',
      evaluation: 'Продолжительность нахождения под давлением.'
    },
    en: {
      label: 'Meaningful Loss Time',
      sub: 'Time in drawdown zone',
      desc: 'Duration spent in meaningful loss beyond entry noise boundary.',
      formula: 'Sum(Drawdown Candle Durations)',
      benchmark: '< 30 min (Quick Bounce)',
      evaluation: 'Duration spent under adverse pressure.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const seconds = Number(context?.meaningfulLossSeconds || trade?.meaningfulLossSeconds || 0)
    const minutes = Math.round(seconds / 60)

    const isRu = locale === 'ru'
    let status: 'optimal' | 'stable' | 'neutral' | 'warning' | 'critical' = 'optimal'
    let evalText = isRu ? 'Минимальное' : 'Minimal'
    let evalClass = 'text-emerald-400 font-bold'
    let colorVal = '#34d399'

    if (minutes > 120) {
      status = 'critical'
      evalText = isRu ? 'Затяжная просадка' : 'Protracted Loss'
      evalClass = 'text-rose-500 font-bold'
      colorVal = '#f43f5e'
    } else if (minutes > 30) {
      status = 'warning'
      evalText = isRu ? 'Умеренное' : 'Moderate Duration'
      evalClass = 'text-amber-400'
      colorVal = '#fbbf24'
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
      benchmarkText: isRu ? '< 30 мин — Контроль просадки' : '< 30 min — Controlled Drawdown',
      benchmarks: [
        { label: isRu ? '< 30 мин' : '< 30 min', eval: isRu ? 'Отлично' : 'Optimal', class: 'text-emerald-400 font-bold' },
        { label: isRu ? '30 - 120 мин' : '30 - 120 min', eval: isRu ? 'Умеренно' : 'Moderate', class: 'text-amber-400' },
        { label: isRu ? '> 120 мин' : '> 120 min', eval: isRu ? 'Зависание' : 'Stuck in Loss', class: 'text-rose-500 font-bold' }
      ],
      progress: Math.min(100, Math.max(0, 100 - (minutes / 2))),
      colorVal
    }
  }
}
