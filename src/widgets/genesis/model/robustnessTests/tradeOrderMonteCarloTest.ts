import type { RobustnessTestCard, RobustnessTestContext } from './types'
import { cumulative, formatNumber, longestDrawdown, maxDrawdown, quantile, shuffle, stableSeed } from './utils'
import { text } from './types'

export const tradeOrderMonteCarloTest = (context: RobustnessTestContext): RobustnessTestCard => {
  const values = context.pnls.filter(Number.isFinite)
  const simulations = 500
  const pathCount = 12
  const rng = (() => {
    let state = stableSeed(values, 0x91aa) || 1
    return () => {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0
      return state / 4294967296
    }
  })()
  const paths = values.length
    ? Array.from({ length: simulations }, () => cumulative(shuffle(values, rng)))
    : []
  const observedDrawdown = maxDrawdown(values)
  const simulatedDrawdowns = paths.map(path => maxDrawdown(path.map((value, index) => value - (path[index - 1] ?? 0))))
  const simulatedLongest = paths.map(path => longestDrawdown(path.map((value, index) => value - (path[index - 1] ?? 0))))
  const finalValues = paths.map(path => path[path.length - 1] ?? 0)
  const sampledPaths = paths.slice(0, pathCount)
  const lowerBand = values.map((_, index) => quantile(paths.map(path => path[index] ?? 0), 0.05))
  const upperBand = values.map((_, index) => quantile(paths.map(path => path[index] ?? 0), 0.95))
  const medianPath = values.map((_, index) => quantile(paths.map(path => path[index] ?? 0), 0.5))
  const status = values.length < 8 ? 'unavailable' : 'observed'

  return {
    id: 'trade-order-monte-carlo',
    title: text('Trade-Order Monte Carlo', 'Monte Carlo порядка сделок'),
    question: text('How does the equity path change when the same trades occur in another order?', 'Как меняется кривая капитала при другом порядке тех же сделок?'),
    criterion: text('Observation only; no universal drawdown limit is assumed.', 'Только наблюдение; универсальный предел просадки не задаётся.'),
    status,
    result: values.length < 8
      ? text('At least 8 trades are required.', 'Нужно минимум 8 сделок.')
      : text(`95% simulated final-value interval: [${formatNumber(quantile(finalValues, 0.025))}; ${formatNumber(quantile(finalValues, 0.975))}].`, `95% интервал конечного значения: [${formatNumber(quantile(finalValues, 0.025))}; ${formatNumber(quantile(finalValues, 0.975))}].`),
    rows: [
      { label: text('Trades', 'Сделки'), value: String(values.length) },
      { label: text('Simulations', 'Симуляции'), value: String(simulations) },
      { label: text('Observed max DD', 'Наблюдаемая max DD'), value: formatNumber(observedDrawdown) },
      { label: text('Simulated max DD P95', 'P95 симулированной max DD'), value: formatNumber(quantile(simulatedDrawdowns, 0.95)) },
      { label: text('Simulated longest DD P95', 'P95 длительности DD'), value: `${formatNumber(quantile(simulatedLongest, 0.95), 0)} trades` }
    ],
    chart: {
      kind: 'fan',
      labels: values.map((_, index) => String(index + 1)),
      lowerBand,
      upperBand,
      yUnit: text('cumulative PnL', 'накопленный PnL'),
      series: [
        ...sampledPaths.map((path, index) => ({ label: text(`Path ${index + 1}`, `Путь ${index + 1}`), values: path, dashed: true })),
        { label: text('Median path', 'Медианный путь'), values: medianPath }
      ]
    },
    note: text('The trade results stay unchanged; only their order is randomized.', 'Результаты сделок не меняются; случайно меняется только их порядок.')
  }
}
