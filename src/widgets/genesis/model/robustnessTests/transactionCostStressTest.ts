import type { RobustnessTestCard, RobustnessTestContext } from './types'
import { finite, formatNumber, mean, tradeCost } from './utils'
import { text } from './types'

export const transactionCostStressTest = (context: RobustnessTestContext): RobustnessTestCard => {
  const pairs = context.trades
    .map(trade => ({ pnl: finite(context.getTradePnl(trade)), cost: tradeCost(trade) }))
    .filter(pair => Number.isFinite(pair.pnl) && pair.cost !== null)
  const levels = [0, 0.5, 1, 2]
  const means = levels.map(level => mean(pairs.map(pair => pair.pnl - (pair.cost ?? 0) * level)))
  const status = pairs.length < 8 ? 'unavailable' : means[means.length - 1] > 0 ? 'passed' : means[means.length - 1] < 0 ? 'failed' : 'inconclusive'

  return {
    id: 'transaction-cost-stress',
    title: text('Transaction-Cost Stress', 'Стресс-тест торговых затрат'),
    question: text('How does the result change when recorded costs are increased?', 'Как меняется результат при увеличении зафиксированных затрат?'),
    criterion: text('Mean PnL remains above zero at 2× recorded costs.', 'Средний PnL остаётся выше нуля при 2× зафиксированных затратах.'),
    status,
    result: pairs.length < 8
      ? text('At least 8 trades with fee data are required.', 'Нужно минимум 8 сделок с данными комиссий.')
      : text(`Mean PnL at 2× recorded costs: ${formatNumber(means[3] ?? 0)}.`, `Средний PnL при 2× затрат: ${formatNumber(means[3] ?? 0)}.`),
    rows: [
      { label: text('Trades with cost data', 'Сделки с данными затрат'), value: String(pairs.length) },
      { label: text('Recorded cost / trade', 'Зафиксированные затраты / сделка'), value: formatNumber(mean(pairs.map(pair => pair.cost ?? 0))) },
      { label: text('Mean at 0×', 'Среднее при 0×'), value: formatNumber(means[0] ?? 0) },
      { label: text('Mean at 1×', 'Среднее при 1×'), value: formatNumber(means[2] ?? 0) },
      { label: text('Mean at 2×', 'Среднее при 2×'), value: formatNumber(means[3] ?? 0) }
    ],
    chart: {
      kind: 'bars',
      labels: levels.map(level => `${level}×`),
      zeroLine: 0,
      yUnit: text('mean PnL', 'средний PnL'),
      series: [{ label: text('Mean after additional cost', 'Среднее после дополнительных затрат'), values: means }]
    },
    note: text('The test adds recorded fees again as a stress increment; it does not infer spread or slippage when those fields are absent.', 'Тест добавляет зафиксированные комиссии как стрессовый прирост; spread и slippage не выдумываются при отсутствии данных.')
  }
}
