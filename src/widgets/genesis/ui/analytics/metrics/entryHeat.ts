import type { MetricEngine } from '~/entities/metric'

export const entryHeatMetric: MetricEngine = {
  key: 'entryHeat',
  category: 'in_trade',
  i18n: {
    ru: {
      label: 'Задержка входа',
      sub: 'Время до перв. импульса',
      desc: 'Время от входа до начала первого импульса, если первый импульс был против позиции.',
      formula: 'Время до старта неблагоприятного импульса',
      benchmark: '< 10 мин (Быстрый запуск)',
      evaluation: 'Задержка развития сделки при неблагоприятном старте.'
    },
    en: {
      label: 'Entry Heat',
      sub: 'Adverse Delay',
      desc: 'Time from entry to first impulse start when first impulse was adverse.',
      formula: 'Time to Adverse Impulse Start',
      benchmark: '< 10 min (Minimal Heat)',
      evaluation: 'Adverse delay duration after entry.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const heatSeconds = Number(context?.entryHeatSeconds || trade?.entryHeatSeconds || 0)
    const minutes = Math.round(heatSeconds / 60)

    const isLow = minutes < 10
    const evalClass = isLow ? 'text-emerald-500' : 'text-amber-500'

    return {
      rawValue: minutes,
      formattedValue: `${minutes} ${isRu ? 'мин' : 'min'}`,
      status: isLow ? 'optimal' : 'warning',
      evaluationText: isLow ? (isRu ? 'Минимальный нагрев' : 'Low Heat') : (isRu ? 'Задержка' : 'Elevated Heat'),
      evalClass,
      benchmarkText: isRu ? '< 10 мин — Быстрый запуск' : '< 10 min — Minimal Heat',
      benchmarks: [
        { label: isRu ? '< 10 мин' : '< 10 min', eval: isRu ? 'Низкий нагрев' : 'Low Heat', class: 'text-emerald-500 font-bold' },
        { label: isRu ? '>= 10 мин' : '>= 10 min', eval: isRu ? 'Задержка входа' : 'Elevated Heat', class: 'text-amber-500 font-bold' }
      ],
      progress: Math.min(100, Math.max(0, 100 - (minutes * 5))),
      colorVal: isLow ? '#34d399' : '#fbbf24'
    }
  }
}
