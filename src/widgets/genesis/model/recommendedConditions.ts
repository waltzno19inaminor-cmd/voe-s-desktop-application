export interface RecommendedConditionScenario {
  id: string
  isMini?: boolean
  params?: {
    phase?: string
    [key: string]: any
  }
}

export interface RecommendedConditionOptions {
  trades: any[]
  scenarios: RecommendedConditionScenario[]
  getScenarioConditions: (scenarioId: string) => any[]
  systemExitScenarioId?: string
  systemExitProtocolIds?: string[]
}

interface RecommendationCandidate {
  key: string
  frequency: number
  profitFactor: number
}

export interface ConditionSignalKeys {
  recommended: Set<string>
  discouraged: Set<string>
}

const getTradeConditionIdsForScenario = (trade: any, scenarioId: string, phase: string) => {
  const isExit = phase === 'EXIT'
  const scenario = isExit ? trade?.boardScenarioExit : trade?.boardScenarioEntry
  const storedScenarioId = isExit ? trade?.boardScenarioExitId : trade?.boardScenarioEntryId
  const scenarioIds = [scenario?.id, storedScenarioId].filter(Boolean).map(String)
  if (!scenarioIds.includes(String(scenarioId))) return new Set<string>()

  const ids = new Set<string>()
  const collectIds = (value: any) => {
    if (!value) return
    if (Array.isArray(value)) {
      value.forEach(collectIds)
      return
    }
    if (typeof value === 'string') {
      ids.add(value)
      return
    }
    if (typeof value !== 'object') return

    if (value.id) ids.add(String(value.id))
    if (value.info?.id) ids.add(String(value.info.id))
    collectIds(value.conditions)
    collectIds(value.info?.conditions)
    collectIds(value.indicatorUnits)
    collectIds(value.items)
    collectIds(value.item)
  }

  const scenarioConditions = scenario?.info?.conditions || scenario?.conditions
  collectIds(scenarioConditions)
  if (!scenarioConditions || (Array.isArray(scenarioConditions) && scenarioConditions.length === 0)) {
    collectIds(trade?.boardConditions || trade?.conditions)
  }
  return ids
}

/**
 * Selects at most two conditions per phase at each end of the combined
 * normalized frequency and profit-factor ranking. Conditions without both
 * metrics are intentionally excluded from either signal.
 */
export function getConditionSignalKeys({
  trades,
  scenarios,
  getScenarioConditions,
  systemExitScenarioId = 'default-exit-system',
  systemExitProtocolIds = ['cond-exit-tp', 'cond-exit-sl', 'cond-exit-fl']
}: RecommendedConditionOptions): ConditionSignalKeys {
  if (!Array.isArray(trades) || trades.length === 0) {
    return { recommended: new Set(), discouraged: new Set() }
  }

  const candidatesByPhase: Record<'ENTRY' | 'EXIT', RecommendationCandidate[]> = {
    ENTRY: [],
    EXIT: []
  }
  const seenKeys = new Set<string>()

  ;(scenarios || []).forEach((scenario) => {
    const phase = String(scenario?.params?.phase || '').toUpperCase()
    if (phase !== 'ENTRY' && phase !== 'EXIT') return
    if (phase === 'EXIT' && (scenario.id === systemExitScenarioId || scenario.isMini)) return

    getScenarioConditions(scenario.id).forEach((condition: any) => {
      const conditionId = String(condition?.id || '')
      if (!conditionId) return
      if (phase === 'EXIT' && systemExitProtocolIds.includes(conditionId)) return

      const key = `${scenario.id}:${conditionId}`
      if (seenKeys.has(key)) return
      seenKeys.add(key)

      const matchingTrades = trades.filter((trade) => (
        getTradeConditionIdsForScenario(trade, scenario.id, phase).has(conditionId)
      ))
      const frequency = matchingTrades.length / trades.length

      let grossProfit = 0
      let grossLoss = 0
      matchingTrades.forEach((trade) => {
        const pnl = Number(trade?.profitInCurrency)
        if (!Number.isFinite(pnl)) return
        if (pnl > 0) grossProfit += pnl
        else if (pnl < 0) grossLoss += Math.abs(pnl)
      })

      const profitFactor = grossLoss > 0
        ? grossProfit / grossLoss
        : grossProfit > 0 ? Infinity : null

      if (frequency <= 0 || profitFactor === null) return
      candidatesByPhase[phase].push({ key, frequency, profitFactor })
    })
  })

  const recommended = new Set<string>()
  const discouraged = new Set<string>()
  Object.values(candidatesByPhase).forEach((candidates) => {
    if (candidates.length === 0) return

    const maxFrequency = Math.max(...candidates.map((item) => item.frequency))
    const finiteProfitFactors = candidates
      .map((item) => item.profitFactor)
      .filter((value) => Number.isFinite(value))
    const maxProfitFactor = finiteProfitFactors.length > 0 ? Math.max(...finiteProfitFactors) : 0

    const ranked = candidates
      .map((item, index) => {
        const normalizedFrequency = maxFrequency > 0 ? item.frequency / maxFrequency : 0
        const normalizedProfitFactor = item.profitFactor === Infinity
          ? 1
          : (maxProfitFactor > 0 ? item.profitFactor / maxProfitFactor : 0)
        return {
          ...item,
          score: (normalizedFrequency + normalizedProfitFactor) / 2,
          index
        }
      })
      .sort((a, b) => (
        b.score - a.score
        || b.frequency - a.frequency
        || b.profitFactor - a.profitFactor
        || a.index - b.index
      ))

    ranked
      .slice(0, 2)
      .forEach((item) => recommended.add(item.key))

    // Keep the two weakest signals separate from the upward signals so one
    // condition never receives contradictory arrows.
    ranked
      .slice()
      .reverse()
      .filter((item) => !recommended.has(item.key))
      .slice(0, 2)
      .forEach((item) => discouraged.add(item.key))
  })

  return { recommended, discouraged }
}

export function getRecommendedConditionKeys(options: RecommendedConditionOptions) {
  return getConditionSignalKeys(options).recommended
}

export function isRecommendedCondition(
  condition: any,
  recommendedKeys: Set<string>,
  scenarioIdOverride?: string | null
) {
  const scenarioId = String(scenarioIdOverride || condition?.scenarioId || '')
  const conditionId = String(condition?.id || '')
  return Boolean(
    scenarioId &&
    conditionId &&
    recommendedKeys.has(`${scenarioId}:${conditionId}`)
  )
}

export function isDiscouragedCondition(
  condition: any,
  discouragedKeys: Set<string>,
  scenarioIdOverride?: string | null
) {
  const scenarioId = String(scenarioIdOverride || condition?.scenarioId || '')
  const conditionId = String(condition?.id || '')
  return Boolean(
    scenarioId &&
    conditionId &&
    discouragedKeys.has(`${scenarioId}:${conditionId}`)
  )
}
