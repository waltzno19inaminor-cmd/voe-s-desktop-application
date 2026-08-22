import type { MetricEngine } from '~/entities/metric'
import { getTradeCashPnl } from '~/widgets/genesis/model/tradePnl'
import { createUnavailableMetricResult, getPositiveTradeLevels, parseFiniteMetricNumber, parsePositiveMetricNumber } from './metricUtils'

export const tpCaptureRatioMetric: MetricEngine = {
  key: 'tp_capture_ratio',
  category: 'strategy_execution',
  i18n: {
    ru: {
      label: 'Захват цели тейк-профит',
      sub: 'Доля взятого тейка',
      desc: 'Измеряет, какая часть плановой прибыли до тейк-профита была реализована при закрытии сделки.',
      formula: '(Движение к тейк-профит / Целевая прибыль) * 100',
      benchmark: '100% (Полный захват цели)',
      evaluation: 'Полнота взятия тейк-профита.'
    },
    en: {
      label: 'TP Capture Ratio',
      sub: 'Target Reward Captured',
      desc: 'Measures how much of planned reward toward take profit was realized before exit.',
      formula: '(Reward Toward TP / Target Reward) * 100',
      benchmark: '100% (Full Capture)',
      evaluation: 'Completeness of target capture.'
    }
  },
  calculate(trade: any, _context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const directCapture = parsePositiveMetricNumber(trade?.tpCapture)
    const { entry, takeProfit } = getPositiveTradeLevels(trade)
    const exit = parsePositiveMetricNumber(trade?.exit)
    const side = String(trade?.side || trade?.direction || '').toLowerCase()
    const isShort = side.includes('short') || side.includes('sell')

    const targetMove = entry !== null && takeProfit !== null
      ? (isShort ? entry - takeProfit : takeProfit - entry)
      : Number.NaN
    const realizedMove = entry !== null && exit !== null
      ? (isShort ? entry - exit : exit - entry)
      : Number.NaN
    const hasStoredPnl = [
      trade?.profitInCurrency,
      trade?.pnlNum,
      trade?.pnl,
      trade?.profit,
      trade?.netProfit,
      trade?.result
    ].some((value) => parseFiniteMetricNumber(value) !== null)
    const isProfitable = hasStoredPnl
      ? getTradeCashPnl(trade) > 0
      : Number.isFinite(realizedMove) && realizedMove > 0

    // TP capture is meaningful only for profitable trades that had a valid
    // target installed in the correct direction. Losses and unmanaged trades
    // must remain unavailable instead of being reported as 0% capture.
    if (entry === null || takeProfit === null || !Number.isFinite(targetMove) || targetMove <= 0 || !isProfitable) {
      return createUnavailableMetricResult(
        locale,
        isRu
          ? 'Нужны валидный Take Profit и прибыльная сделка'
          : 'A valid Take Profit and a profitable trade are required'
      )
    }

    let capture: number | null = directCapture
    if (capture === null && exit !== null && Number.isFinite(realizedMove)) {
      capture = Math.min(100, Math.max(0, (realizedMove / targetMove) * 100))
    }

    if (capture === null) {
      return createUnavailableMetricResult(locale, isRu ? 'Нужен валидный TP и цена выхода' : 'Valid TP and exit price required')
    }

    const isFull = capture === 100
    const evalClass = isFull ? 'text-emerald-500' : 'text-amber-500'

    return {
      rawValue: capture,
      formattedValue: `${capture.toFixed(2)}%`,
      status: isFull ? 'optimal' : 'warning',
      evaluationText: isFull ? (isRu ? 'Идеально' : 'Perfect') : (isRu ? 'Частичный забор' : 'Sub-Optimal'),
      evalClass,
      benchmarkText: isRu ? '100% — Полный забор цели' : '100% — Full Capture',
      benchmarks: [
        { label: '100%', eval: isRu ? 'Полный захват' : 'Full Capture', class: 'text-emerald-500 font-bold' },
        { label: '< 100%', eval: isRu ? 'Частичный захват' : 'Partial Capture', class: 'text-amber-500 font-bold' }
      ],
      progress: capture,
      colorVal: isFull ? '#34d399' : '#fbbf24'
    }
  }
}
