import type { MetricEngine } from '~/entities/metric'

export const frictionDensityMetric: MetricEngine = {
  key: 'friction_density',
  category: 'behavioural',
  i18n: {
    ru: {
      label: 'Плотность фрикций',
      sub: 'Доля эмоциональных тегов',
      desc: 'Общее количество активных отрицательных эмоциональных тегов, деленное на общее количество активных тегов.',
      formula: '(Теги трения / Всего тегов) * 100',
      benchmark: '0% (Безупречная психология)',
      evaluation: 'Концентрация негативных психологических факторов.'
    },
    en: {
      label: 'Friction Density',
      sub: 'Friction Markers Ratio',
      desc: 'Total count of active negative emotional tags divided by total active tags.',
      formula: '(Friction Tags / Total Tags) * 100',
      benchmark: '0% (Pristine)',
      evaluation: 'Concentration of emotional friction tags.'
    }
  },
  calculate(trade: any, _context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const emotions = Array.isArray(trade?.emotions) ? trade.emotions : []
    const frictionTags = emotions.filter((e: string) => ['Fear', 'Greed', 'Anxiety', 'Hesitation', 'FOMO'].some(f => e.toLowerCase().includes(f.toLowerCase()))).length
    const density = emotions.length > 0 ? (frictionTags / emotions.length) * 100 : 0

    const isZero = density === 0
    const evalClass = isZero ? 'text-emerald-500' : 'text-amber-500'

    return {
      rawValue: density,
      formattedValue: `${density.toFixed(2)}%`,
      status: isZero ? 'optimal' : 'warning',
      evaluationText: isZero ? (isRu ? 'Идеально' : 'Perfect') : (isRu ? 'Есть фрикции' : 'Friction Present'),
      evalClass,
      benchmarkText: isRu ? '0% — Отсутствие психологических помех' : '0% — Pristine',
      benchmarks: [
        { label: '0%', eval: isRu ? 'Безупречно' : 'Pristine', class: 'text-emerald-500 font-bold' },
        { label: '> 0%', eval: isRu ? 'Есть фрикции' : 'Friction Present', class: 'text-amber-500 font-bold' }
      ],
      progress: Math.max(0, 100 - density),
      colorVal: isZero ? '#34d399' : '#fbbf24'
    }
  }
}
