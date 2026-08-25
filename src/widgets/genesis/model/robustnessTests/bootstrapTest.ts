import type { RobustnessTestCard, RobustnessTestContext } from './types'
import { formatNumber, mean, quantile, sampleWithReplacement, stableSeed } from './utils'
import { text } from './types'

const histogram = (values: number[], bins = 12) => {
  if (!values.length) return { labels: [], counts: [] }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const width = max > min ? (max - min) / bins : 1
  const counts = Array.from({ length: bins }, () => 0)
  values.forEach(value => {
    const index = Math.max(0, Math.min(bins - 1, Math.floor((value - min) / width)))
    counts[index] = (counts[index] ?? 0) + 1
  })
  return {
    labels: counts.map((_, index) => formatNumber(min + (index + 0.5) * width, 2)),
    counts
  }
}

export const bootstrapTest = (context: RobustnessTestContext): RobustnessTestCard => {
  const values = context.pnls.filter(Number.isFinite)
  const simulations = 1000
  const random = stableSeed(values, 0x1391)
  const rng = (() => {
    let state = random || 1
    return () => {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0
      return state / 4294967296
    }
  })()
  const estimates = values.length
    ? Array.from({ length: simulations }, () => mean(sampleWithReplacement(values, rng)))
    : []
  const lower = quantile(estimates, 0.025)
  const upper = quantile(estimates, 0.975)
  const observed = mean(values)
  const status = values.length < 8 ? 'unavailable' : lower > 0 ? 'passed' : upper < 0 ? 'failed' : 'inconclusive'
  const distribution = histogram(estimates)

  return {
    id: 'bootstrap',
    title: text('Bootstrap Test', 'Bootstrap-тест'),
    question: text('How much does the estimated mean change under repeated resampling?', 'Как меняется оценка среднего при повторной выборке?'),
    criterion: text('The 95% resampling interval stays entirely above zero.', '95% интервал повторной выборки полностью остаётся выше нуля.'),
    status,
    result: values.length < 8
      ? text('At least 8 trades are required.', 'Нужно минимум 8 сделок.')
      : text(`95% interval: [${formatNumber(lower)}; ${formatNumber(upper)}].`, `95% интервал: [${formatNumber(lower)}; ${formatNumber(upper)}].`),
    rows: [
      { label: text('Trades', 'Сделки'), value: String(values.length) },
      { label: text('Resamples', 'Повторные выборки'), value: String(simulations) },
      { label: text('Observed mean', 'Наблюдаемое среднее'), value: formatNumber(observed) },
      { label: text('95% interval', '95% интервал'), value: `[${formatNumber(lower)}; ${formatNumber(upper)}]` }
    ],
    chart: {
      kind: 'bars',
      labels: distribution.labels,
      zeroLine: 0,
      yUnit: text('bootstrap count', 'число выборок'),
      series: [{ label: text('Resampled means', 'Средние повторных выборок'), values: distribution.counts }]
    },
    note: text('This version resamples individual trades and assumes exchangeability of the observations.', 'Эта версия выбирает отдельные сделки и предполагает взаимозаменяемость наблюдений.')
  }
}
