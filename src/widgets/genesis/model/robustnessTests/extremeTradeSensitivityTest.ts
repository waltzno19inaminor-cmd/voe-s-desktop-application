import type { RobustnessTestCard, RobustnessTestContext } from './types'
import { formatNumber, mean, quantile, sum } from './utils'
import { text } from './types'

const removeQuantile = (values: number[], side: 'top' | 'bottom', percent: number): number[] => {
  const count = Math.max(1, Math.ceil(values.length * percent))
  const sorted = [...values].sort((a, b) => a - b)
  return side === 'top' ? sorted.slice(0, Math.max(0, sorted.length - count)) : sorted.slice(count)
}

export const extremeTradeSensitivityTest = (context: RobustnessTestContext): RobustnessTestCard => {
  const values = context.pnls.filter(Number.isFinite)
  const variants = [
    { label: text('All trades', 'Все сделки'), values },
    { label: text('Without top 1%', 'Без лучших 1%'), values: removeQuantile(values, 'top', 0.01) },
    { label: text('Without bottom 1%', 'Без худших 1%'), values: removeQuantile(values, 'bottom', 0.01) },
    { label: text('Without top 5%', 'Без лучших 5%'), values: removeQuantile(values, 'top', 0.05) },
    { label: text('Without bottom 5%', 'Без худших 5%'), values: removeQuantile(values, 'bottom', 0.05) }
  ]
  const means = variants.map(variant => mean(variant.values))
  const baseline = means[0] ?? 0
  const status = values.length < 8 ? 'unavailable' : 'observed'

  return {
    id: 'extreme-trade-sensitivity',
    title: text('Extreme-Trade Sensitivity', 'Чувствительность к крайним сделкам'),
    question: text('How does the result change when extreme observations are removed?', 'Как меняется результат при удалении крайних наблюдений?'),
    criterion: text('Observation only; no universal tolerance for the change is assumed.', 'Только наблюдение; универсальный предел изменения не задаётся.'),
    status,
    result: values.length < 8
      ? text('At least 8 trades are required.', 'Нужно минимум 8 сделок.')
      : text(`Baseline mean: ${formatNumber(baseline)}. Each bar is recalculated on its own sample.`, `Среднее baseline: ${formatNumber(baseline)}. Каждый столбец пересчитан на своей выборке.`),
    rows: [
      { label: text('Trades', 'Сделки'), value: String(values.length) },
      { label: text('Baseline mean', 'Среднее baseline'), value: formatNumber(baseline) },
      { label: text('Baseline total', 'Сумма baseline'), value: formatNumber(sum(values)) },
      { label: text('Median', 'Медиана'), value: formatNumber(quantile(values, 0.5)) },
      { label: text('Mean without top 5%', 'Среднее без лучших 5%'), value: formatNumber(means[3] ?? 0) }
    ],
    chart: {
      kind: 'bars',
      labels: variants.map(variant => variant.label.en.replace('Without ', 'No ')),
      zeroLine: 0,
      yUnit: text('mean PnL', 'средний PnL'),
      series: [{ label: text('Mean PnL', 'Средний PnL'), values: means }]
    },
    note: text('Removing observations is a sensitivity experiment, not a recommendation to discard trades.', 'Удаление наблюдений — это тест чувствительности, а не рекомендация исключать сделки.')
  }
}
