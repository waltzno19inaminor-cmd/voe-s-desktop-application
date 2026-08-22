import type { MetricEngine } from '~/entities/metric'

export const winRateMetric: MetricEngine = {
  key: 'winRate',
  category: 'simple',
  i18n: {
    ru: {
      label: 'Процент побед',
      sub: 'Доля прибыльных сделок',
      desc: 'Процент исполненных сделок в серии или исторической выборке с положительным результатом.',
      formula: '(Прибыльные сделки / Всего сделок) * 100',
      benchmark: '>= 50.0% (Оптимальная точность)',
      evaluation: 'Точность исполнения стратегии.'
    },
    en: {
      label: 'Win Rate',
      sub: 'Winning percentage',
      desc: 'Proportion of executed trades resulting in a positive financial return.',
      formula: '(Winning Trades / Total Trades) * 100',
      benchmark: '>= 50.0% (Optimal Accuracy)',
      evaluation: 'Strategy hit rate and accuracy.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const winRateVal = Number(context?.winRate ?? (trade?.pnl > 0 ? 100 : 0))

    const isRu = locale === 'ru'
    let status: 'optimal' | 'stable' | 'neutral' | 'warning' | 'critical' = 'neutral'
    let evalText = isRu ? 'Допустимый' : 'Sub-Optimal'
    let evalClass = 'text-amber-400'
    let colorVal = '#fbbf24'

    if (winRateVal >= 55) {
      status = 'optimal'
      evalText = isRu ? 'Высокая точность' : 'High Accuracy'
      evalClass = 'text-emerald-400 font-bold'
      colorVal = '#34d399'
    } else if (winRateVal >= 45) {
      status = 'stable'
      evalText = isRu ? 'Норма' : 'Moderate'
      evalClass = 'text-emerald-300'
      colorVal = '#6ee7b7'
    } else {
      status = 'warning'
      evalText = isRu ? 'Низкий винрейт' : 'Low Hit Rate'
      evalClass = 'text-rose-400'
      colorVal = '#fb7185'
    }

    return {
      rawValue: winRateVal,
      formattedValue: `${winRateVal.toFixed(1)}%`,
      status,
      evaluationText: evalText,
      evalClass,
      benchmarkText: isRu ? '>= 50.0% — Стабильное преимущество' : '>= 50.0% — Sustainable Edge',
      benchmarks: [
        { label: '>= 55%', eval: isRu ? 'Высокий' : 'Optimal', class: 'text-emerald-400 font-bold' },
        { label: '45% - 55%', eval: isRu ? 'Средний' : 'Moderate', class: 'text-amber-400' },
        { label: '< 45%', eval: isRu ? 'Низкий' : 'Sub-Optimal', class: 'text-rose-400' }
      ],
      progress: winRateVal,
      colorVal
    }
  }
}
