import type { MetricEngine } from '~/entities/metric'

export const netResultVarianceMetric: MetricEngine = {
  key: 'net_result_variance',
  category: 'execution',
  i18n: {
    ru: {
      label: 'Отклонение PnL',
      sub: 'Сравнение со средним PnL',
      desc: 'Вычисляет разницу между прибылью/убытком текущей сделки и средним значением по стратегии.',
      formula: 'PnL сделки - Средний PnL стратегии',
      benchmark: '>= Среднего PnL (Выше среднего)',
      evaluation: 'Соотношение результата с исторической нормой.'
    },
    en: {
      label: 'Net Result Variance',
      sub: 'vs Strategy Average PnL',
      desc: 'Calculates the difference between current trade PnL and historical average for this strategy.',
      formula: 'Trade PnL - Strategy Avg PnL',
      benchmark: '>= Avg (Above Average)',
      evaluation: 'Trade return relative to strategy baseline.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const pnl = Number(trade?.pnl || trade?.profit || 0)
    const avgPnl = Number(context?.avgPnl ?? 0)

    const isAbove = pnl >= avgPnl
    const evalClass = isAbove ? 'text-emerald-500' : 'text-amber-500'

    return {
      rawValue: pnl - avgPnl,
      formattedValue: `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`,
      status: isAbove ? 'optimal' : 'warning',
      evaluationText: isAbove ? (isRu ? 'Хорошо' : 'Good') : (isRu ? 'Субоптимально' : 'Sub-Optimal'),
      evalClass,
      benchmarkText: isRu ? '>= Средний PnL — Выше среднего' : '>= Avg PnL — Above Average',
      benchmarks: [
        { label: isRu ? '>= Среднего' : '>= Avg', eval: isRu ? 'Выше среднего' : 'Above Average', class: 'text-emerald-500 font-bold' },
        { label: isRu ? '< Среднего' : '< Avg', eval: isRu ? 'Ниже среднего' : 'Below Average', class: 'text-amber-500 font-bold' }
      ],
      progress: Math.min(100, Math.max(0, 50 + ((pnl - avgPnl) / 5))),
      colorVal: isAbove ? '#34d399' : '#fbbf24'
    }
  }
}
