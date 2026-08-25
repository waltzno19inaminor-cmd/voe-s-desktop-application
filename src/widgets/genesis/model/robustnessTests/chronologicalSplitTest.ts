import type { RobustnessTestCard, RobustnessTestContext } from './types'
import { formatNumber, mean, sortedTradeResults } from './utils'
import { text } from './types'

export const chronologicalSplitTest = (context: RobustnessTestContext): RobustnessTestCard => {
  const ordered = sortedTradeResults(context.trades, context.getTradePnl)
  const partCount = ordered.length >= 20 ? 4 : 2
  const partSize = Math.ceil(ordered.length / partCount)
  const parts = Array.from({ length: partCount }, (_, index) => ordered.slice(index * partSize, (index + 1) * partSize))
    .filter(part => part.length > 0)
  const values = parts.map(part => mean(part.map(item => item.pnl)))
  const overall = mean(ordered.map(item => item.pnl))
  const enoughData = ordered.length >= 8 && parts.every(part => part.length >= 3)
  const allPositive = enoughData && values.every(value => value > 0)
  const allNegative = enoughData && values.every(value => value < 0)
  const status = !enoughData ? 'unavailable' : allPositive ? 'passed' : allNegative ? 'failed' : 'inconclusive'

  return {
    id: 'chronological-split',
    title: text('Chronological Split Test', 'Тест последовательных периодов'),
    question: text('How does the result change across the timeline?', 'Как меняется результат по ходу истории?'),
    criterion: text('Each period has the same sign of mean PnL as the positive baseline.', 'В каждом периоде средний PnL имеет тот же знак, что и положительный baseline.'),
    status,
    result: !enoughData
      ? text('At least 8 dated trades are required.', 'Нужно минимум 8 сделок с датами.')
      : text(`Baseline mean: ${formatNumber(overall)}. Period means are shown in the chart.`, `Среднее baseline: ${formatNumber(overall)}. Средние по периодам показаны на графике.`),
    rows: [
      { label: text('Trades', 'Сделки'), value: String(ordered.length) },
      { label: text('Periods', 'Периоды'), value: String(parts.length) },
      { label: text('Baseline mean', 'Среднее baseline'), value: formatNumber(overall) },
      { label: text('Period means', 'Средние по периодам'), value: values.map(value => formatNumber(value)).join(' / ') }
    ],
    chart: {
      kind: 'bars',
      labels: parts.map((_, index) => `P${index + 1}`),
      zeroLine: 0,
      yUnit: text('PnL', 'PnL'),
      series: [{ label: text('Mean PnL', 'Средний PnL'), values }]
    },
    note: text('The split is chronological; trades are not shuffled.', 'Разбиение выполнено по времени; сделки не перемешиваются.')
  }
}
