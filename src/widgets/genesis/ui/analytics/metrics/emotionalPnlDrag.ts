import type { MetricEngine } from '~/entities/metric'

export const emotionalPnlDragMetric: MetricEngine = {
  key: 'emotional_pnl_drag',
  category: 'behavioural',
  i18n: {
    ru: {
      label: 'Эмоциональный износ',
      sub: 'Потери из-за психологии',
      desc: 'Потенциальная прибыль, потерянная из-за эмоциональных отклонений и спешки.',
      formula: 'Сумма штрафов маркеров трения',
      benchmark: '$0.00 (Дисциплинированное исполнение)',
      evaluation: 'Уровень психологических помех при исполнении.'
    },
    en: {
      label: 'Emotional PnL Drag',
      sub: 'Psychological friction drag',
      desc: 'Potential profit lost due to psychological friction or early exits.',
      formula: 'Sum(Friction Marker Penalties)',
      benchmark: '$0.00 (Disciplined Execution)',
      evaluation: 'Impact of emotional errors on total return.'
    }
  },
  calculate(trade: any, _context?: any, locale: 'ru' | 'en' = 'ru') {
    const emotions = Array.isArray(trade?.emotions) ? trade.emotions : []
    const drag = emotions.length * 45 // $45 estimated drag per emotion marker

    const isRu = locale === 'ru'
    let status: 'optimal' | 'stable' | 'neutral' | 'warning' | 'critical' = 'optimal'
    let evalText = isRu ? 'Дисциплина' : 'Disciplined'
    let evalClass = 'text-emerald-400 font-bold'
    let colorVal = '#34d399'

    if (drag > 150) {
      status = 'critical'
      evalText = isRu ? 'Высокий износ' : 'High Friction'
      evalClass = 'text-rose-500 font-bold'
      colorVal = '#f43f5e'
    } else if (drag > 0) {
      status = 'warning'
      evalText = isRu ? 'Легкие помехи' : 'Minor Drag'
      evalClass = 'text-amber-400'
      colorVal = '#fbbf24'
    }

    return {
      rawValue: drag,
      formattedValue: `$${drag.toFixed(2)}`,
      status,
      evaluationText: evalText,
      evalClass,
      benchmarkText: isRu ? '$0.00 — Полный самоконтроль' : '$0.00 — Full Discipline',
      benchmarks: [
        { label: '$0', eval: isRu ? 'Идеально' : 'Optimal', class: 'text-emerald-400 font-bold' },
        { label: '$1 - $150', eval: isRu ? 'Умеренный износ' : 'Minor Friction', class: 'text-amber-400' },
        { label: '> $150', eval: isRu ? 'Сильный износ' : 'High Friction', class: 'text-rose-500 font-bold' }
      ],
      progress: Math.min(100, Math.max(0, 100 - (drag / 3))),
      colorVal
    }
  }
}
