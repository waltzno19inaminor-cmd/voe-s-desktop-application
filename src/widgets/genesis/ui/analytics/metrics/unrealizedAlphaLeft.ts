import type { MetricEngine } from '~/entities/metric'

export const unrealizedAlphaLeftMetric: MetricEngine = {
  key: 'unrealized_alpha_left',
  category: 'strategy_execution',
  i18n: {
    ru: {
      label: 'Незабранная альфа',
      sub: 'Потенциальная нереализованная прибыль',
      desc: 'Сколько потенциальной прибыли осталось незабранной до достижения максимума/цели.',
      formula: 'Макс. потенциальный PnL - Реализованный PnL',
      benchmark: '< $100.00 (Минимальные потери)',
      evaluation: 'Качество и полнота закрытия прибыльных позиций.'
    },
    en: {
      label: 'Unrealized Alpha Left',
      sub: 'Uncaptured potential profit',
      desc: 'Potential profit left uncaptured before target/peak level.',
      formula: 'Max Potential PnL - Realized PnL',
      benchmark: '< $100.00 (Minimal Leftover)',
      evaluation: 'Efficiency of profit taking near trade peak.'
    }
  },
  calculate(trade: any, _context?: any, locale: 'ru' | 'en' = 'ru') {
    const maxPnl = Number(trade?.maxFavorablePnl || trade?.mfePnl || trade?.profit || 0)
    const realizedPnl = Number(trade?.pnl || trade?.profit || 0)
    const alphaLeft = Math.max(0, maxPnl - realizedPnl)

    const isRu = locale === 'ru'
    let status: 'optimal' | 'stable' | 'neutral' | 'warning' | 'critical' = 'neutral'
    let evalText = isRu ? 'Низкие потери' : 'Low Leakage'
    let evalClass = 'text-emerald-400'
    let colorVal = '#34d399'

    if (alphaLeft <= 50) {
      status = 'optimal'
      evalText = isRu ? 'Чистый забор' : 'Clean Exit'
      evalClass = 'text-emerald-400 font-bold'
      colorVal = '#34d399'
    } else if (alphaLeft <= 250) {
      status = 'stable'
      evalText = isRu ? 'Допустимый откат' : 'Acceptable Pullback'
      evalClass = 'text-amber-300'
      colorVal = '#fcd34d'
    } else {
      status = 'warning'
      evalText = isRu ? 'Высокие потери' : 'High Drag'
      evalClass = 'text-rose-400 font-bold'
      colorVal = '#fb7185'
    }

    return {
      rawValue: alphaLeft,
      formattedValue: `$${alphaLeft.toFixed(2)}`,
      status,
      evaluationText: evalText,
      evalClass,
      benchmarkText: isRu ? '< $100.00 — Отличный выход' : '< $100.00 — Excellent Exit',
      benchmarks: [
        { label: '< $50', eval: isRu ? 'Идеально' : 'Optimal', class: 'text-emerald-400 font-bold' },
        { label: '$50 - $250', eval: isRu ? 'Норма' : 'Moderate', class: 'text-amber-400' },
        { label: '> $250', eval: isRu ? 'Потеря потенциала' : 'High Leakage', class: 'text-rose-400' }
      ],
      progress: Math.min(100, Math.max(0, 100 - (alphaLeft / 5))),
      colorVal
    }
  }
}
