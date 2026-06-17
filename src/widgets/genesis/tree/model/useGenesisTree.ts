import { computed, onMounted, ref, shallowRef } from 'vue'
import { loadFromDisk } from '~/shared/diskStorage'
import { useStrategyTradesStore } from '~/features/store/useStrategyTrades'
import { useAuthStore } from '~/entities/user/auth.store'
import { useAppBootStore } from '~/features/store/useAppBoot'
import { useI18n } from '~/shared/i18n/useI18n'
import { GENESIS_EMOTION_LIBRARY, type GenesisEmotionItem } from '~/widgets/genesis/model/emotionLibrary'
import { resolveRiskManagementForStrategy } from '~/widgets/genesis/model/riskManagement'

export interface GenesisTreeTradeSummary {
  id?: string
  strategyId?: string
  asset: string
  date: string
  pnl: number
  pnlLabel: string
}

export interface GenesisTreeScenarioNode {
  id: string
  treeKey?: string
  name?: string
  label?: string
  displayName?: string
  shortName?: string
  typeLabel?: string
  frequencyLabel?: string
  profitFactorRatioLabel?: string
  winrateLabel?: string
  tradeCountLabel?: string
  netPnlLabel?: string
  frequencyColorClass?: string
  profitFactorRatioColorClass?: string
  winrateColorClass?: string
  frequencyValue?: number
  profitFactorRatioValue?: number
  winrateValue?: number
  tradeCount?: number
  netPnlValue?: number
  bestTrade?: GenesisTreeTradeSummary | null
  worstTrade?: GenesisTreeTradeSummary | null
  recentTrades?: GenesisTreeTradeSummary[]
  globalX: number
  globalY: number
  conditions?: GenesisTreeConditionNode[]
  contents?: GenesisTreeConditionContentNode[]
}

export interface GenesisTreeConditionNode {
  id: string
  name?: string
  label?: string
  displayName?: string
  shortName?: string
  globalX: number
  globalY: number
  contents?: GenesisTreeConditionContentNode[]
}

export interface GenesisTreeConditionContentNode {
  id: string
  treeKey?: string
  name?: string
  label?: string
  displayName?: string
  shortName?: string
  typeLabel?: string
  frequencyLabel?: string
  profitFactorRatioLabel?: string
  winrateLabel?: string
  tradeCountLabel?: string
  netPnlLabel?: string
  frequencyColorClass?: string
  profitFactorRatioColorClass?: string
  winrateColorClass?: string
  frequencyValue?: number
  profitFactorRatioValue?: number
  winrateValue?: number
  tradeCount?: number
  netPnlValue?: number
  bestTrade?: GenesisTreeTradeSummary | null
  worstTrade?: GenesisTreeTradeSummary | null
  recentTrades?: GenesisTreeTradeSummary[]
  globalX: number
  globalY: number
}

export interface GenesisTreeStrategyNode {
  id: string
  treeKey?: string
  name: string
  frequencyLabel?: string
  profitFactorRatioLabel?: string
  winrateLabel?: string
  tradeCountLabel?: string
  netPnlLabel?: string
  frequencyColorClass?: string
  profitFactorRatioColorClass?: string
  winrateColorClass?: string
  frequencyValue?: number
  profitFactorRatioValue?: number
  winrateValue?: number
  tradeCount?: number
  netPnlValue?: number
  bestTrade?: GenesisTreeTradeSummary | null
  worstTrade?: GenesisTreeTradeSummary | null
  recentTrades?: GenesisTreeTradeSummary[]
  x: number
  y: number
  scenarios: GenesisTreeScenarioNode[]
}

export interface GenesisTreePresetOption {
  id: string
  label: string
  typeLabel: string
  targetNodeIds: string[]
  empty?: boolean
}

export interface GenesisTreeEmotionBlock {
  id: 'positive' | 'neutral' | 'negative'
  label: string
  x: number
  y: number
  colorClass: string
  accentClass: string
  emotions: GenesisTreeEmotionNode[]
}

export interface GenesisTreeEmotionNode extends GenesisEmotionItem {
  id: string
  treeKey?: string
  name: string
  displayName: string
  shortName: string
  typeLabel: string
  frequencyLabel?: string
  profitFactorRatioLabel?: string
  winrateLabel?: string
  tradeCountLabel?: string
  netPnlLabel?: string
  frequencyColorClass?: string
  profitFactorRatioColorClass?: string
  winrateColorClass?: string
  frequencyValue?: number
  profitFactorRatioValue?: number
  winrateValue?: number
  tradeCount?: number
  netPnlValue?: number
  bestTrade?: GenesisTreeTradeSummary | null
  worstTrade?: GenesisTreeTradeSummary | null
  recentTrades?: GenesisTreeTradeSummary[]
}

export const useGenesisTree = () => {
  const tradeStore = useStrategyTradesStore()
  const authStore = useAuthStore()
  const appBootStore = useAppBootStore()
  const { locale, t } = useI18n()

  const matrixNodes = shallowRef<any[]>([])
  const matrixConnections = shallowRef<any[]>([])
  const isMatrixLoading = ref(true)

  const selectedStrategyId = computed<string | null>({
    get: () => tradeStore.selectedStrategyId,
    set: (val) => {
      tradeStore.selectedStrategyId = val as string
    }
  })

  const getTradeTimestamp = (trade: any) => {
    const rawDate = trade?.dateExit || trade?.date || trade?.timestamp || trade?.createdAt
    const timestamp = rawDate ? new Date(rawDate).getTime() : NaN

    return Number.isFinite(timestamp) ? timestamp : 0
  }

  const allVisibleStrategyTrades = computed(() => {
    return tradeStore.strategies
      .filter(strategy => strategy.id !== 'MAIN_DIARY')
      .flatMap(strategy => tradeStore.getTradesForStrategy(strategy.id))
  })

  const getTradesForStrategyInTime = (strategyId: string) => {
    return tradeStore.getTradesForStrategy(strategyId)
  }

  const globalTreeTrades = computed(() => {
    return allVisibleStrategyTrades.value
  })

  const emotionBlocks = computed<GenesisTreeEmotionBlock[]>(() => {
    const blockConfig = [
      { id: 'positive' as const, label: 'POSITIVE', x: -230, y: -220, colorClass: 'text-emerald-300', accentClass: 'bg-emerald-400' },
      { id: 'neutral' as const, label: 'NEUTRAL', x: 0, y: -220, colorClass: 'text-black dark:text-white/70', accentClass: 'bg-black/20 dark:bg-white/45' },
      { id: 'negative' as const, label: 'NEGATIVE', x: 230, y: -220, colorClass: 'text-rose-300', accentClass: 'bg-rose-400' }
    ]

    return blockConfig.map((block) => ({
      ...block,
      emotions: GENESIS_EMOTION_LIBRARY
        .filter((emotion) => emotion.type === block.id)
        .map((emotion) => ({
          ...emotion,
          id: emotion.label,
          treeKey: `emotion-${emotion.label}`,
          name: emotion.label.toUpperCase(),
          displayName: emotion.label.toUpperCase(),
          shortName: emotion.label.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase(),
          typeLabel: 'EMOTION',
          ...getPerformanceLabels(emotion.label)
        }))
    }))
  })

  const loadMatrixData = async () => {
    isMatrixLoading.value = true
    try {
      const data = (appBootStore.genesisMatrixCache || await loadFromDisk('genesis_matrix_v2')) as any
      if (data) {
        appBootStore.genesisMatrixCache = data
        const allNodes: any[] = []
        const allConns: any[] = []

        const flatten = (nodesList: any[], connsList: any[]) => {
          nodesList.forEach(n => {
            allNodes.push(n)
            if (n.subGraph) {
              flatten(n.subGraph.nodes || [], n.subGraph.connections || [])
            }
          })
          connsList.forEach(c => allConns.push(c))
        }

        flatten(data.nodes || [], data.connections || [])
        matrixNodes.value = allNodes
        matrixConnections.value = allConns
      }
    } catch (err) {
      console.error('Failed to load matrix data:', err)
    } finally {
      isMatrixLoading.value = false
    }
  }

  const strategies = computed(() => {
    return matrixNodes.value
      .filter(n => n.type === 'strategy' || n.type === 'system')
      .map(n => ({
        id: n.id,
        name: String(n.params?.customName || n.label || n.id).toUpperCase()
      }))
  })

  const getNodeById = (id: string) => matrixNodes.value.find(n => n.id === id)

  const getScenarioDisplayName = (node: any) => {
    const name = node?.params?.customName || node?.label || node?.name || node?.id || 'Scenario'
    return String(name).toUpperCase()
  }

  const getScenarioShortName = (node: any) => {
    const displayName = getScenarioDisplayName(node)
    const firstWord = displayName
      .split(/[\s_/-]+/g)
      .map(part => part.trim())
      .find(Boolean) || displayName

    return firstWord.replace(/[^A-Z0-9]/g, '').slice(0, 3)
  }

  const getScenarioTypeLabel = (node: any) => {
    const rawType = String(
      node?.params?.scenarioType ||
      node?.params?.type ||
      node?.params?.phase ||
      node?.type ||
      ''
    ).toUpperCase()
    const scenarioType = rawType.includes('EXIT') ? 'EXIT' : 'ENTRY'

    return `${scenarioType} SCENARIO`
  }

  const getConditionDisplayName = (node: any) => {
    const name = node?.params?.customName || node?.label || node?.name || node?.id || 'Condition'
    return String(name).toUpperCase()
  }

  const getConditionShortName = (node: any) => {
    return getConditionDisplayName(node).replace(/[^A-Z0-9]/g, '').slice(0, 3)
  }

  const getConditionContentDisplayName = (node: any) => {
    const name = node?.params?.customName || node?.label || node?.name || node?.id || 'Node'
    return String(name).toUpperCase()
  }

  const getConditionContentShortName = (node: any) => {
    return getConditionContentDisplayName(node).replace(/[^A-Z0-9]/g, '').slice(0, 3)
  }

  const resolveNode = (nodeId: string, fallbackNodes: any[] = []) => {
    return getNodeById(nodeId) || fallbackNodes.find((node: any) => node.id === nodeId) || null
  }

  const normalizeEmotionKey = (value: any) => {
    const raw = typeof value === 'string'
      ? value
      : value?.id || value?.label || value?.name || value?.state || ''

    return String(raw).trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  }

  const emotionAliases = (id: string) => {
    const key = normalizeEmotionKey(id)
    const aliases: Record<string, string[]> = {
      calmness: ['calmness', 'calm', 'calmzen', 'zen'],
      revenge: ['revenge', 'frustration'],
      focus: ['focus'],
      discipline: ['discipline'],
      patience: ['patience'],
      confidence: ['confidence'],
      fomo: ['fomo', 'fomodistortion'],
      greed: ['greed', 'greedeuphoria', 'euphoria'],
      fear: ['fear', 'fearresponse'],
      tilt: ['tilt'],
      anxiety: ['anxiety'],
      hope: ['hope'],
      boredom: ['boredom'],
      fatigue: ['fatigue'],
      neutral: ['neutral', 'neutrallogic']
    }

    return new Set(aliases[key] || [key])
  }

  const tradeHasEmotion = (trade: any, id: string) => {
    const aliases = emotionAliases(id)
    const emotionValues = [
      ...(Array.isArray(trade?.emotions) ? trade.emotions : []),
      ...(Array.isArray(trade?.emotionsEntry) ? trade.emotionsEntry : []),
      ...(Array.isArray(trade?.emotionsDuring) ? trade.emotionsDuring : []),
      ...(Array.isArray(trade?.emotionsExit) ? trade.emotionsExit : [])
    ]

    return emotionValues.some((emotion) => aliases.has(normalizeEmotionKey(emotion)))
  }

  const collectLogicalNodeIds = (structure: any[]): string[] => {
    const ids: string[] = []

    const visit = (units: any[] | undefined) => {
      if (!Array.isArray(units)) return

      units.forEach((unit: any) => {
        if (!unit) return

        if (Array.isArray(unit.nodeIds)) {
          unit.nodeIds.forEach((nodeId: any) => {
            if (typeof nodeId === 'string' && nodeId.trim()) ids.push(nodeId)
          })
        }

        if (typeof unit.id === 'string' && unit.type !== 'bundle') {
          ids.push(unit.id)
        }

        if (Array.isArray(unit.logicalStructure)) {
          visit(unit.logicalStructure)
        }
      })
    }

    visit(structure)

    return Array.from(new Set(ids))
  }

  const getReachableNodes = (startId: string) => {
    const visited = new Set<string>([startId])
    const queue = [startId]
    const reachable: any[] = []

    while (queue.length > 0) {
      const currId = queue.shift()
      if (!currId) continue

      const childrenIds = matrixConnections.value
        .filter(c => c.fromId === currId)
        .map(c => c.toId)

      for (const childId of childrenIds) {
        if (visited.has(childId)) continue
        visited.add(childId)
        queue.push(childId)

        const node = getNodeById(childId)
        if (node) reachable.push(node)
      }
    }

    return reachable
  }

  const getStats = (id: string, allTrades: any[]) => {
    const presentIn = allTrades.filter(tr =>
      tr.boardScenarioEntry?.id === id ||
      tr.boardScenarioExit?.id === id ||
      tr.boardConditions?.some((c: any) => (typeof c === 'string' ? c === id : c.id === id)) ||
      tr.boardScenarioEntry?.info?.conditions?.some((c: any) => c.id === id) ||
      tr.boardScenarioExit?.info?.conditions?.some((c: any) => c.id === id) ||
      tradeHasEmotion(tr, id)
    )
    const count = presentIn.length
    const freq = allTrades.length > 0 ? count / allTrades.length : 0

    let gProf = 0
    let gLoss = 0
    let wins = 0
    let netPnl = 0
    presentIn.forEach((tr) => {
      const p = tr.profitInCurrency || 0
      netPnl += p
      if (p > 0) gProf += p
      else gLoss += Math.abs(p)
      if (p > 0) wins += 1
    })
    const pf = count === 0 ? 0 : gLoss === 0 ? (gProf > 0 ? Infinity : 0) : gProf / gLoss
    const winrate = count > 0 ? wins / count : 0
    const sortedByPnl = [...presentIn].sort((a, b) => Number(b.profitInCurrency || 0) - Number(a.profitInCurrency || 0))
    const sortedByDate = [...presentIn].sort((a, b) => getTradeTimestamp(b) - getTradeTimestamp(a))

    return {
      freq,
      pf,
      winrate,
      count,
      netPnl,
      bestTrade: sortedByPnl[0] || null,
      worstTrade: sortedByPnl[sortedByPnl.length - 1] || null,
      recentTrades: sortedByDate.slice(0, 5)
    }
  }

  const formatMoney = (value: number) => {
    const sign = value > 0 ? '+' : value < 0 ? '-' : ''
    return `${sign}$${Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

  const summarizeTrade = (trade: any): GenesisTreeTradeSummary | null => {
    if (!trade) return null

    const pnl = Number(trade.profitInCurrency || 0)
    const timestamp = getTradeTimestamp(trade)

    return {
      id: trade.id,
      strategyId: trade.strategyId,
      asset: String(trade.asset || 'UNKNOWN').toUpperCase(),
      date: timestamp ? new Date(timestamp).toLocaleDateString(locale.value === 'ru' ? 'ru-RU' : 'en-GB') : 'UNKNOWN',
      pnl,
      pnlLabel: formatMoney(pnl)
    }
  }

  const getRatioColorClass = (value: number, goodThreshold: number, warningThreshold: number) => {
    if (value >= goodThreshold) return 'text-emerald-400'
    if (value >= warningThreshold) return 'text-amber-400'
    return 'text-rose-400'
  }

  const getProfitFactorColorClass = (value: number) => {
    if (value >= 1.5) return 'text-emerald-400'
    if (value >= 1) return 'text-amber-400'
    return 'text-rose-400'
  }

  const getPerformanceLabels = (id: string, tradesScope = globalTreeTrades.value) => {
    const stats = getStats(id, tradesScope)

    return {
      frequencyLabel: `${Math.round(stats.freq * 100)}%`,
      profitFactorRatioLabel: Number.isFinite(stats.pf) ? stats.pf.toFixed(2) : '∞',
      winrateLabel: `${Math.round(stats.winrate * 100)}%`,
      tradeCountLabel: `${stats.count}`,
      netPnlLabel: formatMoney(stats.netPnl),
      frequencyColorClass: getRatioColorClass(stats.freq, 0.6, 0.3),
      profitFactorRatioColorClass: getProfitFactorColorClass(stats.pf),
      winrateColorClass: getRatioColorClass(stats.winrate, 0.55, 0.4),
      frequencyValue: stats.freq,
      profitFactorRatioValue: stats.pf,
      winrateValue: stats.winrate,
      tradeCount: stats.count,
      netPnlValue: stats.netPnl,
      bestTrade: summarizeTrade(stats.bestTrade),
      worstTrade: summarizeTrade(stats.worstTrade),
      recentTrades: stats.recentTrades.map(summarizeTrade).filter(Boolean) as GenesisTreeTradeSummary[]
    }
  }

  const getStrategyPerformanceLabels = (strategyId: string) => {
    const strategyTrades = getTradesForStrategyInTime(strategyId)
    const totalTrades = globalTreeTrades.value.length
    const freq = totalTrades > 0 ? strategyTrades.length / totalTrades : 0

    let gProf = 0
    let gLoss = 0
    let wins = 0
    let netPnl = 0
    strategyTrades.forEach((trade) => {
      const p = trade.profitInCurrency || 0
      netPnl += p
      if (p > 0) gProf += p
      else gLoss += Math.abs(p)
      if (p > 0) wins += 1
    })
    const pf = strategyTrades.length === 0 ? 0 : gLoss === 0 ? (gProf > 0 ? Infinity : 0) : gProf / gLoss
    const winrate = strategyTrades.length > 0 ? wins / strategyTrades.length : 0
    const sortedByPnl = [...strategyTrades].sort((a, b) => Number(b.profitInCurrency || 0) - Number(a.profitInCurrency || 0))
    const sortedByDate = [...strategyTrades].sort((a, b) => getTradeTimestamp(b) - getTradeTimestamp(a))

    return {
      frequencyLabel: `${Math.round(freq * 100)}%`,
      profitFactorRatioLabel: Number.isFinite(pf) ? pf.toFixed(2) : '∞',
      winrateLabel: `${Math.round(winrate * 100)}%`,
      tradeCountLabel: `${strategyTrades.length}`,
      netPnlLabel: formatMoney(netPnl),
      frequencyColorClass: getRatioColorClass(freq, 0.6, 0.3),
      profitFactorRatioColorClass: getProfitFactorColorClass(pf),
      winrateColorClass: getRatioColorClass(winrate, 0.55, 0.4),
      frequencyValue: freq,
      profitFactorRatioValue: pf,
      winrateValue: winrate,
      tradeCount: strategyTrades.length,
      netPnlValue: netPnl,
      bestTrade: summarizeTrade(sortedByPnl[0]),
      worstTrade: summarizeTrade(sortedByPnl[sortedByPnl.length - 1]),
      recentTrades: sortedByDate.slice(0, 5).map(summarizeTrade).filter(Boolean) as GenesisTreeTradeSummary[]
    }
  }

  const collectConditionNodes = (scenarioId: string) => {
    const scenarioNode = getNodeById(scenarioId)
    if (!scenarioNode) return []

    const scenarioLocalNodes = scenarioNode.subGraph?.nodes || []
    const scenarioStructureIds = collectLogicalNodeIds(scenarioNode.params?.logicalStructure || [])
    const fallbackConditionIds = [
      ...matrixConnections.value.filter(c => c.fromId === scenarioId).map(c => c.toId),
      ...scenarioLocalNodes.filter((node: any) => node.type === 'condition').map((node: any) => node.id)
    ]

    const conditionIds = Array.from(new Set([
      ...scenarioStructureIds,
      ...fallbackConditionIds
    ]))

    const collected = conditionIds
      .map(conditionId => resolveNode(conditionId, scenarioLocalNodes))
      .filter((node: any) => node && node.type === 'condition')

    return Array.from(new Map(collected.map((cond: any) => [cond.id, cond])).values())
  }

  const collectConditionContentNodes = (conditionId: string) => {
    const conditionNode = getNodeById(conditionId)
    if (!conditionNode) return []

    const subNodes = conditionNode.subGraph?.nodes || []
    const subConns = conditionNode.subGraph?.connections || []

    const structure = conditionNode.params?.logicalStructure || []
    const collected: any[] = []

    const pushNode = (node: any) => {
      if (!node || !node.id) return
      if (node.type === 'placeholder') return
      if (node.id === conditionId) return
      collected.push(node)
    }

    if (structure && structure.length > 0) {
      collectLogicalNodeIds(structure).forEach((nodeId: string) => {
        const node = resolveNode(nodeId, subNodes)
        pushNode(node)
      })
    } else {
      const connectedIds = [
        ...matrixConnections.value.filter(c => c.fromId === conditionId).map(c => c.toId),
        ...subConns.filter((c: any) => c.fromId === conditionId).map((c: any) => c.toId)
      ]

      const fallbackNodes = [
        ...matrixNodes.value.filter(n => connectedIds.includes(n.id)),
        ...subNodes.filter((n: any) => connectedIds.includes(n.id))
      ]

      fallbackNodes.forEach(pushNode)
      subNodes.forEach((node: any) => {
        if (node.type !== 'condition') pushNode(node)
      })
    }

    return Array.from(new Map(collected.map(node => [node.id, node])).values())
  }

  const collectScenarioNodes = (rootId: string, depth = 0, visited = new Set<string>()): any[] => {
    if (depth > 5 || visited.has(rootId)) return []

    visited.add(rootId)

    const rootNode = getNodeById(rootId)
    if (!rootNode) return []

    const discovered = new Map<string, any>()
    const directConnections = matrixConnections.value.filter(c => c.fromId === rootId)
    const directNodes = directConnections
      .map(c => getNodeById(c.toId))
      .filter(Boolean)

    const subGraphNodes = rootNode.subGraph?.nodes || []
    const nextNodes = [...subGraphNodes, ...directNodes]

    for (const node of nextNodes) {
      if (!node || !node.id) continue

      if (node.type === 'scenario') {
        discovered.set(node.id, node)
      }

      const descendants = collectScenarioNodes(node.id, depth + 1, visited)
      for (const descendant of descendants) {
        discovered.set(descendant.id, descendant)
      }
    }

    return [...discovered.values()]
  }

  const strategyNodePositions = computed<GenesisTreeStrategyNode[]>(() => {
    const nodes = strategies.value.filter(s => s.id !== 'MAIN_DIARY')
    const horizontalGap = 92
    const contentRowGap = 92
    const maxConditionColumns = 3
    const strategyY = 120
    const scenarioY = 240
    const contentY = 360
    let leafCursor = 0

    const treeNodes = nodes.map((strat) => {
      const strategyTrades = getTradesForStrategyInTime(strat.id)
      const rawScenarios = collectScenarioNodes(strat.id)

      const scenarios = rawScenarios.map((sc) => {
        const conditionNodes = collectConditionNodes(sc.id)

        const conditions = conditionNodes.map((cond) => {
          return {
            ...cond,
            displayName: getConditionDisplayName(cond),
            shortName: getConditionShortName(cond),
            globalX: 0,
            globalY: scenarioY
          }
        })

        const contentNodes = conditionNodes.flatMap((cond) =>
          collectConditionContentNodes(cond.id).map((content) => ({
            ...content,
            conditionId: cond.id,
            displayName: getConditionContentDisplayName(content),
            shortName: getConditionContentShortName(content),
            typeLabel: 'CONDITION',
            ...getPerformanceLabels(content.id, strategyTrades)
          }))
        )

        const scenarioLeafCount = Math.max(Math.min(contentNodes.length, maxConditionColumns), 1)
        const contents = contentNodes.map((content, contentIdx) => {
          const column = contentIdx % maxConditionColumns
          const row = Math.floor(contentIdx / maxConditionColumns)
          const globalX = (leafCursor + column) * horizontalGap

          return {
            ...content,
            treeKey: `${strat.id}:${sc.id}:${content.id}`,
            globalX,
            globalY: contentY + (row * contentRowGap)
          }
        })

        const scenarioStartX = leafCursor * horizontalGap
        const scenarioEndX = (leafCursor + scenarioLeafCount - 1) * horizontalGap
        const scenarioX = (scenarioStartX + scenarioEndX) / 2

        leafCursor += scenarioLeafCount

        return {
          ...sc,
          treeKey: `${strat.id}:${sc.id}`,
          displayName: getScenarioDisplayName(sc),
          shortName: getScenarioShortName(sc),
          typeLabel: getScenarioTypeLabel(sc),
          ...getPerformanceLabels(sc.id, strategyTrades),
          conditions,
          contents,
          globalX: scenarioX,
          globalY: scenarioY
        }
      })

      if (scenarios.length === 0) {
        const strategyX = leafCursor * horizontalGap
        leafCursor += 1

        return {
          ...strat,
          treeKey: strat.id,
          x: strategyX,
          y: strategyY,
          scenarios
        }
      }

      const strategyX = scenarios.reduce((sum, scenario) => sum + scenario.globalX, 0) / scenarios.length

      return {
        ...strat,
        treeKey: strat.id,
        ...getStrategyPerformanceLabels(strat.id),
        x: strategyX,
        y: strategyY,
        scenarios
      }
    })

    const centerOffset = ((Math.max(leafCursor, 1) - 1) * horizontalGap) / 2
    treeNodes.forEach((node) => {
      node.x -= centerOffset

      node.scenarios.forEach((scenario) => {
        scenario.globalX -= centerOffset

        ;(scenario.conditions || []).forEach((condition: any) => {
          condition.globalX = scenario.globalX
        })

        ;(scenario.contents || []).forEach((content: any) => {
          content.globalX -= centerOffset
        })
      })
    })

    return treeNodes
  })

  const getTradeConditionIds = (trade: any) => {
    const ids = new Set<string>()
    const pushCondition = (condition: any) => {
      const rawId = typeof condition === 'string' ? condition : condition?.id
      if (!rawId) return

      const id = String(rawId)
      const node = getNodeById(id)

      if (node?.type === 'condition') {
        collectConditionContentNodes(id).forEach((content) => {
          ids.add(content.id)
        })
        return
      }

      ids.add(id)
    }

    ;(trade.boardConditions || []).forEach(pushCondition)
    ;(trade.boardScenarioEntry?.info?.conditions || []).forEach(pushCondition)
    ;(trade.boardScenarioExit?.info?.conditions || []).forEach(pushCondition)

    return [...ids]
  }

  const treePresetOptions = computed<GenesisTreePresetOption[]>(() => {
    const treeNodes = strategyNodePositions.value
    const strategyMetricNodes = treeNodes.map(strategy => ({
      id: strategy.treeKey || strategy.id,
      frequency: strategy.frequencyValue || 0,
      winrate: strategy.winrateValue || 0,
      pf: strategy.profitFactorRatioValue || 0
    }))
    const scenarioMetricNodesByStrategy = treeNodes.flatMap(strategy => {
      const strategyTrades = getTradesForStrategyInTime(strategy.id)

      return strategy.scenarios.map((scenario) => {
        const stats = getStats(scenario.id, strategyTrades)

        return {
          id: scenario.treeKey || scenario.id,
          strategyId: strategy.id,
          frequency: stats.freq,
          winrate: stats.winrate,
          pf: stats.pf
        }
      })
    })
    const conditionMetricNodesByStrategy = treeNodes.flatMap(strategy => {
      const strategyTrades = getTradesForStrategyInTime(strategy.id)

      return strategy.scenarios.flatMap(scenario => (scenario.contents || []).map((content) => {
        const stats = getStats(content.id, strategyTrades)

        return {
          id: content.treeKey || content.id,
          strategyId: strategy.id,
          frequency: stats.freq,
          winrate: stats.winrate,
          pf: stats.pf
        }
      }))
    })
    const emotionMetricNodes = emotionBlocks.value.flatMap(block => block.emotions.map((emotion) => ({
      id: emotion.treeKey || emotion.id,
      frequency: emotion.frequencyValue || 0,
      winrate: emotion.winrateValue || 0,
      pf: emotion.profitFactorRatioValue || 0
    })))
    const metricNodesByStrategy = treeNodes.flatMap(strategy => {
      const strategyNode = strategyMetricNodes.find(node => node.id === (strategy.treeKey || strategy.id))
      const scenarioNodes = scenarioMetricNodesByStrategy.filter(node => node.strategyId === strategy.id)
      const conditionNodes = conditionMetricNodesByStrategy.filter(node => node.strategyId === strategy.id)

      return [
        ...(strategyNode ? [{ ...strategyNode, strategyId: strategy.id }] : []),
        ...scenarioNodes,
        ...conditionNodes
      ]
    })
    const metricGroups = [
      { key: 'all', label: 'All Nodes', nodes: metricNodesByStrategy, perStrategy: true },
      { key: 'strategy', label: 'Strategies', nodes: strategyMetricNodes, perStrategy: false },
      { key: 'scenario', label: 'Scenarios', nodes: scenarioMetricNodesByStrategy, perStrategy: true },
      { key: 'condition', label: 'Conditions', nodes: conditionMetricNodesByStrategy, perStrategy: true },
      { key: 'emotion', label: 'Emotions', nodes: emotionMetricNodes, perStrategy: false }
    ]
    const visibleConditionIds = new Set(
      treeNodes.flatMap(strategy => strategy.scenarios.flatMap(scenario => (scenario.contents || []).map(content => content.id)))
    )
    const conditionTreeKeysByStrategy = new Map<string, Map<string, string[]>>()
    treeNodes.forEach((strategy) => {
      const conditionMap = new Map<string, string[]>()

      strategy.scenarios.forEach((scenario) => {
        ;(scenario.contents || []).forEach((content) => {
          conditionMap.set(content.id, [
            ...(conditionMap.get(content.id) || []),
            content.treeKey || content.id
          ])
        })
      })

      conditionTreeKeysByStrategy.set(strategy.id, conditionMap)
    })
    const comboStatsByStrategy = new Map<string, Map<string, { ids: string[], count: number, netProfit: number }>>()

    treeNodes.forEach((strategy) => {
      const comboStats = new Map<string, { ids: string[], count: number, netProfit: number }>()
      const conditionMap = conditionTreeKeysByStrategy.get(strategy.id) || new Map()

      getTradesForStrategyInTime(strategy.id).forEach((trade) => {
        const rawIds = getTradeConditionIds(trade)
          .filter(id => visibleConditionIds.has(id))
          .sort()

        if (rawIds.length < 2) return

        const ids = rawIds.flatMap(id => conditionMap.get(id) || [])
        if (ids.length < 2) return

        const key = rawIds.join('|')
        const existing = comboStats.get(key) || { ids, count: 0, netProfit: 0 }
        existing.count += 1
        existing.netProfit += Number(trade.profitInCurrency || 0)
        comboStats.set(key, existing)
      })

      comboStatsByStrategy.set(strategy.id, comboStats)
    })

    const maxGroupBy = <T extends { value: number, ids: string[] }>(items: T[]) => {
      if (items.length === 0) return null

      const maxValue = Math.max(...items.map(item => item.value))
      const ids = items
        .filter(item => item.value === maxValue)
        .flatMap(item => item.ids)

      return {
        value: maxValue,
        ids: Array.from(new Set(ids))
      }
    }
    const minGroupBy = <T extends { value: number, ids: string[] }>(items: T[]) => {
      if (items.length === 0) return null

      const minValue = Math.min(...items.map(item => item.value))
      const ids = items
        .filter(item => item.value === minValue)
        .flatMap(item => item.ids)

      return {
        value: minValue,
        ids: Array.from(new Set(ids))
      }
    }
    const metricPresets = metricGroups.flatMap((group) => {
      const nodesWithTrades = group.nodes.filter(node => node.frequency > 0)
      const allMetricNodes = group.nodes
      const maxPerGroup = (metric: 'frequency' | 'winrate' | 'pf') => {
        if (!group.perStrategy) {
          return maxGroupBy(nodesWithTrades.map(node => ({ value: node[metric], ids: [node.id] })))
        }

        const nodesByStrategy = nodesWithTrades.reduce<Record<string, any[]>>((acc, node: any) => {
          const strategyId = node.strategyId || 'GLOBAL'
          acc[strategyId] = [...(acc[strategyId] || []), node]
          return acc
        }, {})
        const winners = Object.values(nodesByStrategy).flatMap((nodes) => {
          const winner = maxGroupBy(nodes.map(node => ({ value: node[metric], ids: [node.id] })))
          return winner ? [winner] : []
        })

        if (winners.length === 0) return null

        return {
          value: Math.max(...winners.map(winner => winner.value)),
          ids: Array.from(new Set(winners.flatMap(winner => winner.ids)))
        }
      }
      const minPerGroup = (metric: 'winrate' | 'pf') => {
        if (!group.perStrategy) {
          return minGroupBy(allMetricNodes.map(node => ({ value: node[metric], ids: [node.id] })))
        }

        const nodesByStrategy = allMetricNodes.reduce<Record<string, any[]>>((acc, node: any) => {
          const strategyId = node.strategyId || 'GLOBAL'
          acc[strategyId] = [...(acc[strategyId] || []), node]
          return acc
        }, {})
        const losers = Object.values(nodesByStrategy).flatMap((nodes) => {
          const loser = minGroupBy(nodes.map(node => ({ value: node[metric], ids: [node.id] })))
          return loser ? [loser] : []
        })

        if (losers.length === 0) return null

        return {
          value: Math.min(...losers.map(loser => loser.value)),
          ids: Array.from(new Set(losers.flatMap(loser => loser.ids)))
        }
      }
      const maxFrequency = maxPerGroup('frequency')
      const maxWinrate = maxPerGroup('winrate')
      const maxProfitFactor = maxPerGroup('pf')
      const leastWinrate = minPerGroup('winrate')
      const leastProfitFactor = minPerGroup('pf')

      return [
        {
          id: `max-frequency-${group.key}`,
          label: `Max Frequency`,
          typeLabel: group.label,
          targetNodeIds: maxFrequency?.ids || [],
          empty: !maxFrequency || maxFrequency.value <= 0
        },
        {
          id: `max-winrate-${group.key}`,
          label: `Max Winrate`,
          typeLabel: group.label,
          targetNodeIds: maxWinrate?.ids || [],
          empty: !maxWinrate || maxWinrate.value <= 0
        },
        {
          id: `max-profit-factor-${group.key}`,
          label: `Max Profit Factor`,
          typeLabel: group.label,
          targetNodeIds: maxProfitFactor?.ids || [],
          empty: !maxProfitFactor || maxProfitFactor.value <= 0
        },
        {
          id: `least-winrate-${group.key}`,
          label: `Least Winrate`,
          typeLabel: group.label,
          targetNodeIds: leastWinrate?.ids || [],
          empty: !leastWinrate
        },
        {
          id: `least-profit-factor-${group.key}`,
          label: `Least Profit Factor`,
          typeLabel: group.label,
          targetNodeIds: leastProfitFactor?.ids || [],
          empty: !leastProfitFactor
        }
      ]
    })
    const comboWinnersByStrategy = (metric: 'count' | 'netProfit') => {
      const winners = [...comboStatsByStrategy.values()].flatMap((comboStats) => {
        const combos = [...comboStats.values()]
        const winner = maxGroupBy(combos.map(combo => ({ value: combo[metric], ids: combo.ids })))
        return winner ? [winner] : []
      })

      if (winners.length === 0) return null

      return {
        value: Math.max(...winners.map(winner => winner.value)),
        ids: Array.from(new Set(winners.flatMap(winner => winner.ids)))
      }
    }
    const frequentCombo = comboWinnersByStrategy('count')
    const profitableCombo = comboWinnersByStrategy('netProfit')

    return [
      ...metricPresets,
      {
        id: 'most-used-combo',
        label: 'Most Used Conditions',
        typeLabel: 'Combinations',
        targetNodeIds: frequentCombo?.ids || [],
        empty: !frequentCombo
      },
      {
        id: 'most-profitable-combo',
        label: 'Most Profitable Conditions',
        typeLabel: 'Combinations',
        targetNodeIds: profitableCombo?.ids || [],
        empty: !profitableCombo || profitableCombo.value <= 0
      }
    ]
  })

  const selectedStrategy = computed(() => {
    return strategies.value.find(s => s.id === selectedStrategyId.value) || strategies.value[0] || { id: 'MAIN_DIARY', name: 'MAIN_DIARY' }
  })

  const selectedStrategyLabel = computed(() => {
    const name = selectedStrategy.value?.name || 'MAIN_DIARY'
    return name === 'MAIN_DIARY' ? t('genesis.virtualLog.mainDiary') : name
  })

  const selectStrategy = (id: string) => {
    selectedStrategyId.value = id

    const riskManagement = resolveRiskManagementForStrategy(matrixNodes.value, matrixConnections.value, id)
    console.log(`[GENESIS_TREE] Protocol Selection: ${id} | Resolved Trading Style: ${riskManagement.tradingStyle || 'UNDEFINED'}`)
  }

  const formatCreationDate = (d: string | null | undefined) => {
    if (!d) return 'UNKNOWN_ORIGIN'
    const date = new Date(d)
    return date.toLocaleDateString(locale.value === 'ru' ? 'ru-RU' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).toUpperCase()
  }

  onMounted(loadMatrixData)

  return {
    authStore,
    formatCreationDate,
    isMatrixLoading,
    matrixConnections,
    matrixNodes,
    getScenarioDisplayName,
    getScenarioShortName,
    getConditionDisplayName,
    getConditionShortName,
    selectStrategy,
    selectedStrategyId,
    selectedStrategyLabel,
    strategies,
    strategyNodePositions,
    emotionBlocks,
    treePresetOptions
  }
}
