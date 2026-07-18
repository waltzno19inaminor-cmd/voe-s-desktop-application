export interface StrategyVersionLike {
  id?: string
  createdAt?: string | number | Date
  snapshot?: any
  draft?: any
}

export function getStrategyVersionTimestamp(version?: StrategyVersionLike | null) {
  const rawTimestamp = version?.createdAt
  const timestamp = typeof rawTimestamp === 'number'
    ? rawTimestamp
    : new Date(rawTimestamp as any).getTime()

  return Number.isFinite(timestamp) ? timestamp : null
}

export function getTradeVersionTimestamp(trade: any) {
  const rawDate = trade?.dateExit || trade?.date || trade?.timestamp || trade?.createdAt
  const timestamp = rawDate ? new Date(rawDate).getTime() : NaN

  return Number.isFinite(timestamp) ? timestamp : 0
}

export function getSelectedStrategyVersionIndex(versions: StrategyVersionLike[], selectedVersionId?: string | null) {
  if (!versions.length) return -1

  const selectedIndex = versions.findIndex(version => version.id === selectedVersionId)
  return selectedIndex === -1 ? versions.length - 1 : selectedIndex
}

export function getSelectedStrategyVersionWindow(versions: StrategyVersionLike[], selectedVersionId?: string | null) {
  const selectedIndex = getSelectedStrategyVersionIndex(versions, selectedVersionId)
  if (selectedIndex === -1) {
    return { startTime: -Infinity, endTime: Infinity }
  }

  const isFirstVersion = selectedIndex === 0
  const isLastVersion = selectedIndex === versions.length - 1

  return {
    startTime: isFirstVersion
      ? -Infinity
      : getStrategyVersionTimestamp(versions[selectedIndex]) ?? -Infinity,
    endTime: isLastVersion
      ? Infinity
      : getStrategyVersionTimestamp(versions[selectedIndex + 1]) ?? Infinity
  }
}

export function filterTradesBySelectedStrategyVersion<T>(
  trades: T[],
  versions: StrategyVersionLike[],
  selectedVersionId?: string | null
) {
  const { startTime, endTime } = getSelectedStrategyVersionWindow(versions, selectedVersionId)

  return trades.filter(trade => {
    const timestamp = getTradeVersionTimestamp(trade)
    return timestamp > 0 && timestamp >= startTime && timestamp < endTime
  })
}

export function getSelectedStrategyVersionSnapshot(
  versions: StrategyVersionLike[],
  selectedVersionId?: string | null
) {
  const selectedIndex = getSelectedStrategyVersionIndex(versions, selectedVersionId)
  if (selectedIndex === -1) return null

  const version = versions[selectedIndex]
  return version?.draft || version?.snapshot || null
}
