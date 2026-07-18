type ScenarioPhase = 'entry' | 'exit'

const getScenario = (trade: any, phase: ScenarioPhase) => {
  const key = phase === 'entry' ? 'boardScenarioEntry' : 'boardScenarioExit'
  const idKey = phase === 'entry' ? 'boardScenarioEntryId' : 'boardScenarioExitId'
  const scenario = trade?.[key]

  return {
    id: scenario?.id || trade?.[idKey] || null,
    conditions: scenario?.info?.conditions || scenario?.conditions || []
  }
}

const conditionId = (condition: any) => {
  const rawId = typeof condition === 'string' ? condition : condition?.id
  return rawId ? String(rawId) : null
}

export function tradeMatchesScenarioCondition(trade: any, scenarioId: string, targetConditionId: string) {
  const matchesBoardScenario = (['entry', 'exit'] as ScenarioPhase[]).some(phase => {
    const scenario = getScenario(trade, phase)
    return scenario.id === scenarioId && scenario.conditions.some((condition: any) => conditionId(condition) === targetConditionId)
  })

  if (matchesBoardScenario) return true

  return trade?.scenarios?.some((scenario: any) => (
    scenario?.id === scenarioId &&
    scenario?.conditions?.some((condition: any) => conditionId(condition) === targetConditionId)
  )) || false
}

export function tradeMatchesProtocol(trade: any, protocolId: string, scenarioId?: string | null) {
  if (scenarioId) {
    return tradeMatchesScenarioCondition(trade, scenarioId, protocolId)
  }

  const entryScenario = getScenario(trade, 'entry')
  const exitScenario = getScenario(trade, 'exit')

  return entryScenario.id === protocolId ||
    exitScenario.id === protocolId ||
    trade?.boardConditions?.some((condition: any) => conditionId(condition) === protocolId) ||
    entryScenario.conditions.some((condition: any) => conditionId(condition) === protocolId) ||
    exitScenario.conditions.some((condition: any) => conditionId(condition) === protocolId) ||
    trade?.scenarios?.some((scenario: any) => (
      scenario?.id === protocolId ||
      scenario?.conditions?.some((condition: any) => conditionId(condition) === protocolId)
    )) ||
    trade?.emotions?.includes(protocolId) ||
    trade?.emotionsEntry?.includes(protocolId) ||
    trade?.emotionsDuring?.includes(protocolId) ||
    trade?.emotionsExit?.includes(protocolId) ||
    false
}
