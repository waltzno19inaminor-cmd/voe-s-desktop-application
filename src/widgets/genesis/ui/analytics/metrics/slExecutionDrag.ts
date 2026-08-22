import type { MetricEngine } from '~/entities/metric'
import { getTradeCashPnl, toFiniteTradeNumber } from '~/widgets/genesis/model/tradePnl'
import { createUnavailableMetricResult } from './metricUtils'

export const slExecutionDragMetric: MetricEngine = {
  key: 'sl_execution_drag',
  category: 'strategy_execution',
  i18n: {
    ru: {
      label: 'Проскальзывание стоп-лосс',
      sub: 'Отклонение на убыточных сделках',
      desc: 'Сравнивает плановый стоп-лосс с фактической ценой выхода только в убыточных сделках.',
      formula: 'Long: выход - SL · Short: SL - выход',
      benchmark: '>= $0.00 (Без проскальзывания)',
      evaluation: 'Точность исполнения стоп-приказа.'
    },
    en: {
      label: 'SL Execution Drag',
      sub: 'Loss-trade slippage only',
      desc: 'Compares planned stop loss against actual exit price only for losing trades.',
      formula: 'Long: exit - SL · Short: SL - exit',
      benchmark: '>= $0.00 (Zero Drag)',
      evaluation: 'Precision of stop loss execution.'
    }
  },
  calculate(trade: any, _context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const pnl = getTradeCashPnl(trade)
    if (!Number.isFinite(pnl) || pnl >= 0) {
      return createUnavailableMetricResult(
        locale,
        isRu
          ? 'Рассчитывается только для убыточных сделок'
          : 'Calculated only for losing trades'
      )
    }

    const exit = toFiniteTradeNumber(trade?.exit ?? trade?.exitPrice)
    const stopLoss = toFiniteTradeNumber(trade?.stopLoss ?? trade?.sl)
    const isShort = /short|sell/i.test(String(trade?.side ?? trade?.direction ?? ''))
    const storedDrag = toFiniteTradeNumber(trade?.slDrag)
    const drag = exit !== null && stopLoss !== null
      ? (isShort ? stopLoss - exit : exit - stopLoss)
      : storedDrag

    if (drag === null || !Number.isFinite(drag)) {
      return createUnavailableMetricResult(
        locale,
        isRu ? 'Нужны цена выхода и стоп-лосс' : 'Exit price and stop loss are required'
      )
    }

    const isGood = drag >= 0
    const evalClass = isGood ? 'text-emerald-500' : 'text-rose-500'

    return {
      rawValue: drag,
      formattedValue: `${isGood ? '+' : ''}$${drag.toFixed(2)}`,
      status: isGood ? 'optimal' : 'critical',
      evaluationText: isGood ? (isRu ? 'Хорошо' : 'Good') : (isRu ? 'Субоптимально' : 'Sub-Optimal'),
      evalClass,
      benchmarkText: isRu ? '>= $0.00 — Без лишних потерь' : '>= $0.00 — Zero Drag',
      benchmarks: [
        { label: '>= $0', eval: isRu ? 'Без проскальзывания' : 'Zero Drag', class: 'text-emerald-500 font-bold' },
        { label: '< $0', eval: isRu ? 'Проскальзывание' : 'Slippage', class: 'text-rose-500 font-bold' }
      ],
      progress: isGood ? 100 : Math.max(0, 100 + (drag * 2)),
      colorVal: isGood ? '#34d399' : '#f87171'
    }
  }
}
