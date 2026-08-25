import type { RobustnessTrade } from './types'

export const finite = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const mean = (values: number[]): number => values.length
  ? values.reduce((sum, value) => sum + value, 0) / values.length
  : 0

export const quantile = (values: number[], probability: number): number => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const position = (sorted.length - 1) * Math.min(1, Math.max(0, probability))
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) return sorted[lower] ?? 0
  const weight = position - lower
  return (sorted[lower] ?? 0) * (1 - weight) + (sorted[upper] ?? 0) * weight
}

export const median = (values: number[]): number => quantile(values, 0.5)

export const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0)

export const cumulative = (values: number[]): number[] => {
  let running = 0
  return values.map(value => {
    running += value
    return running
  })
}

export const maxDrawdown = (values: number[]): number => {
  let peak = 0
  let drawdown = 0
  let running = 0
  values.forEach(value => {
    running += value
    peak = Math.max(peak, running)
    drawdown = Math.max(drawdown, peak - running)
  })
  return drawdown
}

export const longestDrawdown = (values: number[]): number => {
  let peak = 0
  let running = 0
  let current = 0
  let longest = 0
  values.forEach(value => {
    running += value
    if (running >= peak) {
      peak = running
      current = 0
    } else {
      current += 1
      longest = Math.max(longest, current)
    }
  })
  return longest
}

export const formatNumber = (value: number, digits = 2): string => {
  if (!Number.isFinite(value)) return '—'
  return value.toFixed(digits)
}

export const formatSigned = (value: number, digits = 2): string => {
  if (!Number.isFinite(value)) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`
}

export const dateValue = (trade: RobustnessTrade): number => {
  const raw = trade?.dateExit ?? trade?.exitTime ?? trade?.date ?? trade?.entryTime ?? trade?.createdAt
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  const parsed = new Date(raw ?? '').getTime()
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export const sortedTradeResults = (
  trades: RobustnessTrade[],
  getTradePnl: (trade: RobustnessTrade) => number
): Array<{ trade: RobustnessTrade; pnl: number; timestamp: number }> => trades
  .map(trade => ({ trade, pnl: getTradePnl(trade), timestamp: dateValue(trade) }))
  .filter(item => Number.isFinite(item.pnl))
  .sort((a, b) => {
    if (Number.isFinite(a.timestamp) && Number.isFinite(b.timestamp)) return a.timestamp - b.timestamp
    if (Number.isFinite(a.timestamp)) return -1
    if (Number.isFinite(b.timestamp)) return 1
    return 0
  })

export const seededRandom = (seed: number) => {
  let state = (seed >>> 0) || 1
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 4294967296
  }
}

export const stableSeed = (values: number[], salt: number): number => {
  return values.reduce((seed, value, index) => {
    const scaled = Math.round((value || 0) * 100)
    return (Math.imul(seed ^ scaled ^ index, 16777619) + salt) >>> 0
  }, 2166136261) >>> 0
}

export const sampleWithReplacement = (values: number[], random: () => number): number[] => {
  if (!values.length) return []
  return Array.from({ length: values.length }, () => values[Math.floor(random() * values.length)] ?? 0)
}

export const sampleBlocks = (values: number[], blockLength: number, random: () => number): number[] => {
  if (!values.length) return []
  const output: number[] = []
  const length = Math.max(1, Math.min(blockLength, values.length))
  while (output.length < values.length) {
    const start = Math.floor(random() * values.length)
    for (let offset = 0; offset < length && output.length < values.length; offset += 1) {
      output.push(values[(start + offset) % values.length] ?? 0)
    }
  }
  return output
}

export const shuffle = <T>(values: T[], random: () => number): T[] => {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = result[index]
    result[index] = result[swapIndex] as T
    result[swapIndex] = current as T
  }
  return result
}

export const tradeCost = (trade: RobustnessTrade): number | null => {
  const entry = finite(trade?.entryFee, Number.NaN)
  const exit = finite(trade?.exitFee, Number.NaN)
  if (Number.isFinite(entry) || Number.isFinite(exit)) return Math.max(0, entry || 0) + Math.max(0, exit || 0)
  const fee = finite(trade?.fee, Number.NaN)
  return Number.isFinite(fee) ? Math.max(0, fee) : null
}

