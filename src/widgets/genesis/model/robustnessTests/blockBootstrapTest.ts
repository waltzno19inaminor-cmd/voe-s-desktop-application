import type { RobustnessTestCard, RobustnessTestContext } from './types'
import { formatNumber, mean, quantile, sampleBlocks, stableSeed } from './utils'
import { text } from './types'

const makeRng = (seed: number) => {
  let state = seed || 1
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 4294967296
  }
}

export const blockBootstrapTest = (context: RobustnessTestContext): RobustnessTestCard => {
  const values = context.pnls.filter(Number.isFinite)
  const blockLength = values.length >= 20 ? 5 : 3
  const simulations = 1000
  const rng = makeRng(stableSeed(values, 0x7a21))
  const estimates = values.length
    ? Array.from({ length: simulations }, () => mean(sampleBlocks(values, blockLength, rng)))
    : []
  const lower = quantile(estimates, 0.025)
  const upper = quantile(estimates, 0.975)
  const observed = mean(values)
  const status = values.length < blockLength * 3 ? 'unavailable' : lower > 0 ? 'passed' : upper < 0 ? 'failed' : 'inconclusive'

  return {
    id: 'block-bootstrap',
    title: text('Block Bootstrap Test', 'Block Bootstrap-тест'),
    question: text('How does the mean behave when nearby trades are resampled together?', 'Как ведёт себя среднее, если соседние сделки выбираются блоками?'),
    criterion: text('The 95% block-resampling interval stays entirely above zero.', '95% интервал блочной выборки полностью остаётся выше нуля.'),
    status,
    result: values.length < blockLength * 3
      ? text(`At least ${blockLength * 3} trades are required.`, `Нужно минимум ${blockLength * 3} сделки.`)
      : text(`95% interval: [${formatNumber(lower)}; ${formatNumber(upper)}].`, `95% интервал: [${formatNumber(lower)}; ${formatNumber(upper)}].`),
    rows: [
      { label: text('Trades', 'Сделки'), value: String(values.length) },
      { label: text('Block length', 'Длина блока'), value: String(blockLength) },
      { label: text('Resamples', 'Повторные выборки'), value: String(simulations) },
      { label: text('Observed mean', 'Наблюдаемое среднее'), value: formatNumber(observed) },
      { label: text('95% interval', '95% интервал'), value: `[${formatNumber(lower)}; ${formatNumber(upper)}]` }
    ],
    chart: {
      kind: 'bars',
      labels: Array.from({ length: 12 }, (_, index) => String(index + 1)),
      yUnit: text('bootstrap count', 'число выборок'),
      series: [{
        label: text('Block-resampled means', 'Средние блочных выборок'),
        values: (() => {
          if (!estimates.length) return []
          const min = Math.min(...estimates)
          const max = Math.max(...estimates)
          const width = max > min ? (max - min) / 12 : 1
          const counts = Array.from({ length: 12 }, () => 0)
          estimates.forEach(value => {
            const index = Math.max(0, Math.min(11, Math.floor((value - min) / width)))
            counts[index] = (counts[index] ?? 0) + 1
          })
          return counts
        })()
      }]
    },
    note: text('Block resampling preserves short local sequences better than independent-trade resampling.', 'Блочная выборка лучше сохраняет короткие локальные последовательности, чем выборка отдельных сделок.')
  }
}
