import type { MetricEngine } from '~/entities/metric'
import { getTradeResultPercent, resolveTradeBalanceBefore } from '~/widgets/genesis/model/metrics'
import { toFiniteTradeNumber } from '~/widgets/genesis/model/tradePnl'
import { createUnavailableMetricResult } from './metricUtils'

export const yieldEfficiencyMetric: MetricEngine = {
  key: 'yield_efficiency',
  category: 'execution',
  i18n: {
    ru: {
      label: 'Эффективность доходности',
      sub: 'К балансу до сделки',
      desc: 'Измеряет чистый прирост депозита от сделки относительно баланса счёта перед входом.',
      formula: '(PnL / Баланс до сделки) * 100',
      benchmark: '> 0% (Положительный прирост)',
      evaluation: 'Процентное изменение депозита от сделки.'
    },
    en: {
      label: 'Yield Efficiency',
      sub: 'Balance Before Trade',
      desc: 'Measures net impact of this trade relative to account balance immediately before entry.',
      formula: '(PnL / Balance Before Trade) * 100',
      benchmark: '> 0% (Positive Impact)',
      evaluation: 'Percentage return relative to account balance.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const initialDeposit = Number(
      context?.initialBalance ??
      trade?.initialBalance ??
      1000
    )
    const validInitialDeposit = Number.isFinite(initialDeposit) && initialDeposit > 0 ? initialDeposit : 1000

    const rawBalanceBefore = context?.balanceBeforeTrade ?? context?.initialBalance ?? trade?.capitalBeforeTrade ?? trade?.initialBalance
    const balanceBefore = toFiniteTradeNumber(rawBalanceBefore) ?? resolveTradeBalanceBefore(trade, context?.allTrades, validInitialDeposit)

    const yieldPct = getTradeResultPercent(trade, balanceBefore, validInitialDeposit)

    const isPositive = yieldPct >= 0
    const evalClass = isPositive ? 'text-emerald-500' : 'text-rose-500'

    return {
      rawValue: yieldPct,
      formattedValue: `${yieldPct.toFixed(2)}%`,
      status: isPositive ? 'optimal' : 'critical',
      evaluationText: isPositive ? (isRu ? 'Положительно' : 'Positive') : (isRu ? 'Отрицательно' : 'Negative'),
      evalClass,
      benchmarkText: isRu ? '> 0% — Прирост депозита' : '> 0% — Positive Impact',
      benchmarks: [
        { label: '> 0%', eval: isRu ? 'Положительно' : 'Positive Impact', class: 'text-emerald-500 font-bold' },
        { label: '< 0%', eval: isRu ? 'Просадка' : 'Drawdown', class: 'text-rose-500 font-bold' }
      ],
      progress: Math.min(100, Math.max(0, 50 + (yieldPct * 10))),
      colorVal: isPositive ? '#34d399' : '#f87171'
    }
  }
}
