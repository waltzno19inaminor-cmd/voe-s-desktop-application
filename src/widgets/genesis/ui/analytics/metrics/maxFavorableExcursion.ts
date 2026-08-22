import type { MetricEngine } from '~/entities/metric'

export const maxFavorableExcursionMetric: MetricEngine = {
  key: 'maxFavorableExcursion',
  category: 'in_trade',
  i18n: {
    ru: {
      label: 'Макс. движение в плюс',
      sub: 'Пиковый импульс в пользу позиции (макс. движение в плюс)',
      desc: 'Максимально достигнутое благоприятное движение цены от точки входа.',
      formula: 'Макс. благоприятное движение за пределами шума',
      benchmark: '> 3.0% (Сильный импульс)',
      evaluation: 'Пиковый потенциал движения позиции.'
    },
    en: {
      label: 'Max Favorable Excursion',
      sub: 'Peak favorable move (MFE)',
      desc: 'Maximum favorable price excursion achieved past entry level during trade.',
      formula: 'Max Favorable Excursion past Noise Zone',
      benchmark: '> 3.0% (Strong Expansion)',
      evaluation: 'Peak potential captured by setup.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const mfePct = Math.abs(Number(context?.maxFavorableExcursionPct || trade?.mfePct || 0))

    const isRu = locale === 'ru'
    let status: 'optimal' | 'stable' | 'neutral' | 'warning' | 'critical' = 'neutral'
    let evalText = isRu ? 'Слабенький плюс' : 'Weak Move'
    let evalClass = 'text-amber-400'
    let colorVal = '#fbbf24'

    if (mfePct >= 3.0) {
      status = 'optimal'
      evalText = isRu ? 'Мощный тренд' : 'Strong Expansion'
      evalClass = 'text-emerald-400 font-bold'
      colorVal = '#34d399'
    } else if (mfePct >= 1.5) {
      status = 'stable'
      evalText = isRu ? 'Хороший импульс' : 'Solid Run'
      evalClass = 'text-emerald-300'
      colorVal = '#6ee7b7'
    }

    return {
      rawValue: mfePct,
      formattedValue: `+${mfePct.toFixed(2)}%`,
      status,
      evaluationText: evalText,
      evalClass,
      benchmarkText: isRu ? '> 3.0% — Сильный забер' : '> 3.0% — Strong Expansion',
      benchmarks: [
        { label: '>= 3.0%', eval: isRu ? 'Мощный импульс' : 'Optimal', class: 'text-emerald-400 font-bold' },
        { label: '1.5% - 3.0%', eval: isRu ? 'Хороший ход' : 'Moderate', class: 'text-amber-400' },
        { label: '< 1.5%', eval: isRu ? 'Слабый ход' : 'Weak Move', class: 'text-rose-400' }
      ],
      progress: Math.min(100, Math.max(0, mfePct * 20)),
      colorVal
    }
  }
}
