import type { MetricEngine } from '~/entities/metric'

export const maxMeaningfulDrawdownMetric: MetricEngine = {
  key: 'maxMeaningfulDrawdown',
  category: 'in_trade',
  i18n: {
    ru: {
      label: 'Макс. значимая просадка',
      sub: 'Максимальный пиковый убыток (макс. просадка)',
      desc: 'Максимальное падение цены против открытой позиции после отфильтровывания шума.',
      formula: 'Макс. неблагоприятное движение за пределами шума',
      benchmark: '< 1.5% (Контроль уровня риска)',
      evaluation: 'Глубина испытываемой просадки во время сделки.'
    },
    en: {
      label: 'Max Meaningful Drawdown',
      sub: 'Peak adverse move (MAE)',
      desc: 'Maximum adverse price move past entry noise threshold during trade duration.',
      formula: 'Max Adverse Excursion past Noise Zone',
      benchmark: '< 1.5% (Controlled Risk)',
      evaluation: 'Severity of adverse move experienced during trade.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const maePct = Math.abs(Number(context?.maxMeaningfulDrawdownPct || trade?.maePct || 0))

    const isRu = locale === 'ru'
    let status: 'optimal' | 'stable' | 'neutral' | 'warning' | 'critical' = 'optimal'
    let evalText = isRu ? 'Низкая просадка' : 'Controlled MAE'
    let evalClass = 'text-emerald-400 font-bold'
    let colorVal = '#34d399'

    if (maePct > 3.0) {
      status = 'critical'
      evalText = isRu ? 'Глубокий провал' : 'Severe MAE'
      evalClass = 'text-rose-500 font-bold'
      colorVal = '#f43f5e'
    } else if (maePct > 1.5) {
      status = 'warning'
      evalText = isRu ? 'Умеренная просадка' : 'Elevated MAE'
      evalClass = 'text-amber-400'
      colorVal = '#fbbf24'
    }

    return {
      rawValue: maePct,
      formattedValue: `-${maePct.toFixed(2)}%`,
      status,
      evaluationText: evalText,
      evalClass,
      benchmarkText: isRu ? '< 1.5% — Устойчивый вход' : '< 1.5% — Stable Entry',
      benchmarks: [
        { label: '< 1.5%', eval: isRu ? 'Низкая просадка' : 'Optimal', class: 'text-emerald-400 font-bold' },
        { label: '1.5% - 3.0%', eval: isRu ? 'Средняя просадка' : 'Moderate', class: 'text-amber-400' },
        { label: '> 3.0%', eval: isRu ? 'Высокий риск' : 'High MAE', class: 'text-rose-500 font-bold' }
      ],
      progress: Math.min(100, Math.max(0, 100 - (maePct * 20))),
      colorVal
    }
  }
}
