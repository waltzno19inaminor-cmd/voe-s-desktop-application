import type { RobustnessTestCard, RobustnessTestContext } from './types'
import { formatNumber, mean, sortedTradeResults } from './utils'
import { text } from './types'

export const leavePeriodOutTest = (context: RobustnessTestContext): RobustnessTestCard => {
  const ordered = sortedTradeResults(context.trades, context.getTradePnl)
  const partCount = ordered.length >= 20 ? 4 : 2
  const partSize = Math.ceil(ordered.length / partCount)
  const parts = Array.from({ length: partCount }, (_, index) => ordered.slice(index * partSize, (index + 1) * partSize))
    .filter(part => part.length > 0)
  const allValues = ordered.map(item => item.pnl)
  const baseline = mean(allValues)
  const values = parts.map((_, omittedIndex) => mean(parts
    .filter((__, index) => index !== omittedIndex)
    .flatMap(part => part.map(item => item.pnl))))
  const enoughData = ordered.length >= 8 && parts.length >= 2 && parts.every(part => part.length >= 3)
  const allPositive = enoughData && values.every(value => value > 0)
  const allNegative = enoughData && values.every(value => value < 0)
  const status = !enoughData ? 'unavailable' : allPositive ? 'passed' : allNegative ? 'failed' : 'inconclusive'

  return {
    id: 'leave-period-out',
    title: text('Leave-Period-Out Test', 'Тест с исключением периода'),
    question: text('How does the result change when each time period is removed in turn?', 'Как меняется результат при последовательном исключении каждого периода?'),
    criterion: text('The mean PnL remains above zero after removing any one period.', 'Средний PnL остаётся выше нуля после исключения любого одного периода.'),
    status,
    result: !enoughData
      ? text('At least 8 dated trades are required.', 'Нужно минимум 8 сделок с датами.')
      : text(`Baseline mean: ${formatNumber(baseline)}. Each bar excludes one period.`, `Среднее baseline: ${formatNumber(baseline)}. Каждый столбец исключает один период.`),
    rows: [
      { label: text('Trades', 'Сделки'), value: String(ordered.length) },
      { label: text('Periods', 'Периоды'), value: String(parts.length) },
      { label: text('Baseline mean', 'Среднее baseline'), value: formatNumber(baseline) },
      { label: text('Leave-out means', 'Средние после исключения'), value: values.map(value => formatNumber(value)).join(' / ') }
    ],
    chart: {
      kind: 'bars',
      labels: values.map((_, index) => `−P${index + 1}`),
      zeroLine: 0,
      yUnit: text('mean PnL', 'средний PnL'),
      series: [{ label: text('Mean without period', 'Среднее без периода'), values }]
    },
    note: text('Periods are chronological blocks with approximately equal numbers of trades.', 'Периоды — последовательные блоки с примерно одинаковым количеством сделок.')
  }
}
