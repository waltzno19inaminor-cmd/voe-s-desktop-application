export interface DrawdownPoint {
  index: number
  equity: number
  highWater: number
  drawdown: number
}

export interface RealDrawdownPeriod {
  id: string
  startIndex: number
  bottomIndex: number
  endIndex: number
  recoveryIndex?: number
  depth: number
  durationTrades: number
  recoveryState: 'recovered' | 'open'
}

/**
 * Finds actual underwater periods of an equity curve.
 * A period starts below the current high-water mark and ends only after
 * that high-water mark is recovered.
 */
export const detectRealDrawdownPeriods = (points: DrawdownPoint[]): RealDrawdownPeriod[] => {
  const periods: RealDrawdownPeriod[] = []
  let startIndex: number | null = null
  let bottomIndex: number | null = null

  const closePeriod = (endIndex: number, recovered: boolean) => {
    if (startIndex === null || bottomIndex === null || endIndex < startIndex) return
    const depth = Math.max(...points.slice(startIndex, endIndex + 1).map(point => Math.max(0, point.drawdown)), 0)
    periods.push({
      id: `drawdown-${periods.length + 1}`,
      startIndex,
      bottomIndex,
      endIndex,
      recoveryIndex: recovered ? endIndex : undefined,
      depth,
      durationTrades: endIndex - startIndex + 1,
      recoveryState: recovered ? 'recovered' : 'open'
    })
    startIndex = null
    bottomIndex = null
  }

  points.forEach((point, index) => {
    if (point.drawdown > 0 && startIndex === null) {
      startIndex = index
      bottomIndex = index
    }
    if (startIndex !== null && (bottomIndex === null || point.drawdown > points[bottomIndex].drawdown)) {
      bottomIndex = index
    }
    if (startIndex !== null && point.drawdown === 0) closePeriod(index, true)
  })

  if (startIndex !== null) closePeriod(points.length - 1, false)
  return periods
}
