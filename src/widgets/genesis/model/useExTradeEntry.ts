// @ts-nocheck
import { ref, computed, onMounted, watch } from 'vue'
import allAssets from '~/shared/data/global_assets.json'
import { loadFromDisk } from '~/shared/diskStorage'
import ExNTtooltip from '~/shared/ui/ExNTtooltip.vue'
import ExPanel from '~/shared/ui/ExPanel.vue'
import ExTooltip from '~/shared/ui/ExTooltip.vue'
import ExHeading from '~/shared/ui/ExHeading.vue'
import ExText from '~/shared/ui/ExText.vue'
import ExEquityCurve2D from '~/widgets/genesis/ui/ExEquityCurve2D.vue'
import { useThemeStore } from '~/features/store/useTheme'
import { useStrategyTradesStore } from '~/features/store/useStrategyTrades'
import { useI18n } from '~/shared/i18n/useI18n'
import { GENESIS_EMOTION_LIBRARY } from '~/widgets/genesis/model/emotionLibrary'
import { resolveRiskManagementForStrategy, riskValueToDollars } from '~/widgets/genesis/model/riskManagement'
import { SystemProtocolSelect } from '~/widgets/system-protocol-select'
import DesignVignette from '~/widgets/style/ui/DesignVignette.vue'

export function useExTradeEntry(props, emit) {

const { locale } = useI18n()



const themeStore = useThemeStore()
const isDark = computed(() => themeStore?.settings?.isDark ?? false)

// View Toggle
const viewMode = ref('tactical') // 'tactical' or 'journal'
const journalEntries = ref([])

const getArchiveNodeName = (id) => `Archive_Node_${id.toString(16).toUpperCase().slice(-6)}`

const addJournalEntry = () => {
  const id = Date.now()
  journalEntries.value.push({
    id,
    image: null,
    name: getArchiveNodeName(id),
    tags: [],
    tagInput: '',
    createdAt: new Date().toISOString()
  })
}

const removeJournalEntry = (id) => {
  journalEntries.value = journalEntries.value.filter(e => e.id !== id)
}

const addJournalEntryTag = (entry) => {
  const tag = (entry.tagInput || '').trim().toUpperCase()
  if (!tag) return

  if (!Array.isArray(entry.tags)) entry.tags = []
  if (!entry.tags.includes(tag)) entry.tags.push(tag)
  entry.tagInput = ''
}

const removeJournalEntryTag = (entry, tag) => {
  entry.tags = (entry.tags || []).filter(t => t !== tag)
}

const handleImageUpload = (id, event) => {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const entry = journalEntries.value.find(en => en.id === id)
    if (entry) entry.image = e.target.result
  }
  reader.readAsDataURL(file)
}

const triggerUpload = (id) => {
  document.getElementById(`file-input-${id}`).click()
}

const showCmeNotice = ref(true)
const rememberCmeNotice = ref(false)

const closeCmeNotice = () => {
  showCmeNotice.value = false
  if (rememberCmeNotice.value) {
    try {
      localStorage.setItem('genesis_cme_notice_hidden', 'true')
    } catch(e) {}
  }
}

// Asset Selection state
const showAssetMenu = ref(false)
const asset = ref('')
const assetSearch = ref('')
const filteredAssets = computed(() => {
  const q = asset.value.toUpperCase()
  if (!q) return allAssets.slice(0, 10)
  
  const searchLower = q.toLowerCase()
  
  return allAssets.filter(a => 
    a.symbol.toLowerCase().includes(searchLower) || 
    (a.name && a.name.toLowerCase().includes(searchLower))
  ).sort((a, b) => {
    const aSym = a.symbol.toUpperCase()
    const bSym = b.symbol.toUpperCase()
    const aName = (a.name || '').toUpperCase()
    const bName = (b.name || '').toUpperCase()

    // 1. Exact Symbol Match
    if (aSym === q) return -1
    if (bSym === q) return 1

    // 2. Exact Name Match
    if (aName === q) return -1
    if (bName === q) return 1

    // 3. Tactical Priority (Forex, Indices, Commodities)
    const tacticalTypes = ['FOREX', 'INDICES', 'COMMODITIES']
    const aIsTactical = tacticalTypes.includes((a.type || '').toUpperCase())
    const bIsTactical = tacticalTypes.includes((b.type || '').toUpperCase())
    if (aIsTactical && !bIsTactical) return -1
    if (!aIsTactical && bIsTactical) return 1

    // 4. Starts with priority
    if (aSym.startsWith(q) && !bSym.startsWith(q)) return -1
    if (!aSym.startsWith(q) && bSym.startsWith(q)) return 1

    return aSym.localeCompare(bSym)
  }).slice(0, 20)
})

const currentAssetData = computed(() => {
  return allAssets.find(a => a.symbol === asset.value)
})

const selectAsset = (a) => {
  asset.value = a.symbol
  showAssetMenu.value = false
}

const matrixNodes = ref([])
const matrixConnections = ref([])
const matrixZones = ref([])
const isMatrixLoading = ref(true)

const loadMatrixData = async () => {
  isMatrixLoading.value = true
  try {
    const data = await loadFromDisk('genesis_matrix_v2')
    if (data && data.nodes) {
      matrixNodes.value = data.nodes
      matrixConnections.value = data.connections || []
      matrixZones.value = data.zones || []
    }
  } catch (err) {
    console.error('Failed to load matrix data:', err)
  } finally {
    isMatrixLoading.value = false
  }
}

// Default to Main Diary only unless cores are provided
const tradeStore = useStrategyTradesStore()

const strategies = computed(() => tradeStore.strategies)

const selectedStrategyId = computed({
  get: () => tradeStore.selectedStrategyId,
  set: (val) => { tradeStore.selectedStrategyId = val }
})
const selectedStrategy = computed(() => {
  const s = tradeStore.strategies.find(s => s.id === selectedStrategyId.value)
  return s || tradeStore.strategies[0] || { id: 'MAIN_DIARY', name: 'MAIN_DIARY' }
})

const findAllNodes = (nodes) => {
  let list = []
  if (!nodes) return list
  for (const node of nodes) {
    list.push(node)
    if (node.subGraph?.nodes) {
      list = list.concat(findAllNodes(node.subGraph.nodes))
    }
  }
  return list
}

const findAllConnections = (nodes, currentConnections = []) => {
  let list = [...currentConnections]
  if (!nodes) return list
  for (const node of nodes) {
    if (node.subGraph) {
      const subConns = node.subGraph.connections || []
      list = list.concat(findAllConnections(node.subGraph.nodes, subConns))
    }
  }
  return list
}

const findNodeById = (list, id) => {
  if (!list) return null
  for (const node of list) {
    if (node.id === id) return node
    if (node.subGraph?.nodes) {
      const found = findNodeById(node.subGraph.nodes, id)
      if (found) return found
    }
  }
  return null
}

const activeRiskManagement = computed(() => {
  const allNodes = findAllNodes(matrixNodes.value)
  const allConnections = findAllConnections(matrixNodes.value, matrixConnections.value)
  return resolveRiskManagementForStrategy(allNodes, allConnections, selectedStrategyId.value)
})

const activeRiskPerTradeDollars = computed(() => {
  const initialDeposit = tradeStore.getInitialDeposit(selectedStrategyId.value) || 1000
  return riskValueToDollars(
    activeRiskManagement.value.riskPerTradeValue,
    activeRiskManagement.value.riskPerTradeUnit,
    initialDeposit
  )
})

const activeRiskSnapshot = computed(() => {
  const risk = activeRiskManagement.value
  if (!risk.sourceNode) return null
  return {
    riskPerTrade: risk.riskPerTradeValue,
    riskPerTradeUnit: risk.riskPerTradeUnit,
    riskPerSession: risk.riskPerSessionValue,
    riskPerSessionUnit: risk.riskPerSessionUnit,
    riskRewardRatio: risk.riskRewardRatio,
    tradingStyle: risk.tradingStyle
  }
})

// ─── Risk Violation Detection ────────────────────────────────────────────────
const actualRR = computed(() => {
  const e = +entry.value
  const tp = +takeProfit.value
  const sl = +stopLoss.value
  if (!e || !tp || !sl || e === sl) return null
  const reward = Math.abs(tp - e)
  const risk = Math.abs(e - sl)
  if (risk === 0) return null
  return reward / risk
})

const actualRiskPercent = computed(() => {
  const e = +entry.value
  const sl = +stopLoss.value
  const s = +size.value
  if (!e || !sl || !s) return null
  const initialDeposit = tradeStore.getInitialDeposit(selectedStrategyId.value) || 1000
  const riskInAsset = Math.abs(e - sl) * s
  return (riskInAsset / initialDeposit) * 100
})

const violatesRR = computed(() => {
  const required = activeRiskManagement.value.riskRewardRatio
  if (!required || actualRR.value === null) return false
  return actualRR.value < required
})

const violatesRiskPerTrade = computed(() => {
  const required = activeRiskManagement.value.riskPerTradeValue
  const unit = activeRiskManagement.value.riskPerTradeUnit
  if (!required) return false
  const e = +entry.value
  const sl = +stopLoss.value
  const s = +size.value
  if (!e || !sl || !s) return false
  const riskInAsset = Math.abs(e - sl) * s
  const initialDeposit = tradeStore.getInitialDeposit(selectedStrategyId.value) || 1000
  const riskLimit = unit === '%' ? (required / 100) * initialDeposit : required
  return riskInAsset > riskLimit
})

const riskViolationMessage = computed(() => {
  const rrViol = violatesRR.value
  const rptViol = violatesRiskPerTrade.value
  if (rrViol && rptViol) return 'YOU VIOLATE BOTH RISK RULES'
  if (rrViol) return 'YOU VIOLATE RISK REWARD RULE'
  if (rptViol) return 'YOU VIOLATE RISK PER TRADE RULE'
  return null
})

const getReachableNodes = (startId, allNodes, allConnections) => {
  const visited = new Set([startId])
  const queue = [startId]
  const reachable = []
  
  while (queue.length > 0) {
    const currId = queue.shift()
    const childrenIds = allConnections.filter(c => c.fromId === currId).map(c => c.toId)
    for (const childId of childrenIds) {
      if (!visited.has(childId)) {
        visited.add(childId)
        queue.push(childId)
        const node = allNodes.find(n => n.id === childId)
        if (node) reachable.push(node)
      }
    }
  }
  return reachable
}

const getNodeZoneType = (targetId, currentNodes, currentZones) => {
  if (!currentNodes) return null
  for (const node of currentNodes) {
    if (node.id === targetId) {
      const matchedZone = (currentZones || []).find(z => 
        node.x >= z.x && node.x <= z.x + z.width &&
        node.y >= z.y && node.y <= z.y + z.height
      )
      return matchedZone?.type?.toUpperCase() || null
    }
    if (node.subGraph?.nodes) {
      const type = getNodeZoneType(targetId, node.subGraph.nodes, node.subGraph.zones || [])
      if (type) return type
    }
  }
  return null
}

// Sync strategies when matrix nodes change
watch([matrixNodes, () => tradeStore.isLoading], ([nodes, loading]) => {
  if (loading) return
  const allNodes = findAllNodes(nodes)
  const cores = allNodes
    .filter(n => n.type === 'strategy' || n.type === 'system')
    .map(n => ({
      id: n.id,
      name: (n.params?.customName || n.label).toUpperCase()
    }))
  tradeStore.syncStrategies(cores)
}, { immediate: true, deep: true })
const showStrategyMenu = ref(false)

const failedIcons = ref(new Set())
const handleIconError = (symbol) => {
  failedIcons.value.add(symbol)
}

const closeAssetMenu = (e) => {
  if (!e.target.closest('.asset-select-container')) {
    showAssetMenu.value = false
  }
}

onMounted(() => {
  try {
    if (localStorage.getItem('genesis_cme_notice_hidden') === 'true') {
      showCmeNotice.value = false
    }
  } catch (e) {}
  window.addEventListener('click', closeAssetMenu)
  loadMatrixData()
  tradeStore.init()

  if (props.initialTrade) {
    const t = props.initialTrade
    if (t.strategyId) {
      selectedStrategyId.value = t.strategyId
    }
    asset.value = t.asset || ''
    side.value = t.side?.toLowerCase() === 'short' ? 'short' : 'long'
    
    // Reverse-engineer the executions into the component's entry/exit arrays
    if (t.executions && t.executions.length > 0) {
      const entryExecs = t.executions.filter(e => e.type === 'ENTRY')
      const exitExecs = t.executions.filter(e => e.type === 'EXIT')
      
      if (entryExecs.length > 0) {
        entryMethodEnabled.value = true
        activeProtocolTab.value = 'PYRAMIDING'
        entryMethodType.value = 'PYRAMIDING'
        pyramidingEntries.value = entryExecs.map(e => ({
          price: e.price,
          size: e.size,
          fee: e.fee || 0
        }))
      } else {
        entryMethodEnabled.value = false
        entry.value = t.entry || ''
        size.value = t.size || ''
        entryFee.value = t.entryFee || ''
      }
      
      if (exitExecs.length > 0) {
        exitMethodEnabled.value = true
        exitExecutions.value = exitExecs.map(e => ({
          price: e.price,
          size: e.size,
          fee: e.fee || 0,
          reason: e.reason || 'MANUAL'
        }))
      } else {
        exitMethodEnabled.value = false
        exit.value = t.exit || ''
        exitFee.value = t.exitFee || ''
      }
    } else {
      entryMethodEnabled.value = false
      exitMethodEnabled.value = false
      entry.value = t.entry || ''
      exit.value = t.exit || ''
      size.value = t.size || ''
      entryFee.value = t.entryFee || ''
      exitFee.value = t.exitFee || ''
    }

    feeType.value = t.feeType || '%'
    stopLoss.value = t.stopLoss || ''
    takeProfit.value = t.takeProfit || ''
    openDate.value = t.date ? new Date(t.date) : new Date()
    exitDate.value = t.dateExit ? new Date(t.dateExit) : new Date()
    selectedEmotions.value = Array.isArray(t.emotions) ? [...t.emotions] : []

    if (t.images && Array.isArray(t.images)) {
      journalEntries.value = t.images.map((img, index) => ({
        id: Date.now() + index,
        image: img.url,
        name: img.name,
        tags: img.tags || [],
        tagInput: '',
        createdAt: img.createdAt || new Date().toISOString()
      }))
    }

    // Reconstruct active conditions
    const reconstructConditions = (scenario) => {
      const conds = scenario?.info?.conditions || scenario?.conditions
      if (!conds) return
      conds.forEach(cond => {
        if (cond.indicatorUnits) {
          cond.indicatorUnits.forEach(unit => {
            if (unit.type === 'bundle') unit.items?.forEach(i => activeConditions.value.add(i.id))
            else if (unit.type === 'single' && unit.item) activeConditions.value.add(unit.item.id)
          })
        } else if (cond.id) {
          activeConditions.value.add(cond.id)
        }
      })
    }
    reconstructConditions(t.boardScenarioEntry)
    reconstructConditions(t.boardScenarioExit)
  }
})

const selectedScenarioNode = computed(() => {
  if (selectedStrategyId.value === 'MAIN_DIARY') return null
  return findNodeById(matrixNodes.value, selectedStrategyId.value)
})

const getNodesForStrategy = (type, entryExit = 'ALL') => {
  let candidates = []
  if (selectedStrategyId.value === 'MAIN_DIARY') {
    candidates = findAllNodes(matrixNodes.value).filter(n => n.type === type)
  } else {
    const parent = selectedScenarioNode.value
    if (!parent) return []
    
    const subGraphNodes = findAllNodes(parent.subGraph?.nodes || [])
    const allNodes = findAllNodes(matrixNodes.value)
    const allConnections = findAllConnections(matrixNodes.value, matrixConnections.value)
    
    const reachableNodes = getReachableNodes(parent.id, allNodes, allConnections)
    const reachableNodesWithDescendants = findAllNodes(reachableNodes)
    
    candidates = [...subGraphNodes, ...reachableNodesWithDescendants].filter(n => n.type === type)
  }

  if (entryExit === 'ALL') return candidates

  // Filter candidates by whether they fall into an ENTRY or EXIT domain
  return candidates.filter(node => {
    const zoneType = getNodeZoneType(node.id, matrixNodes.value, matrixZones.value)
    return zoneType === entryExit.toUpperCase()
  })
}

const DEFAULT_ENTRY_CONDITIONS = []
const DEFAULT_ENTRY_SCENARIOS = []
const DEFAULT_EXIT_CONDITIONS = []
const DEFAULT_EXIT_SCENARIOS = [
  { id: 'default-exit-system', label: 'SYSTEM_PROTOCOLS', params: { customName: 'SYSTEM_PROTOCOLS', phase: 'EXIT' }, isMini: true }
]

const entryConditions = computed(() => {
  const items = getNodesForStrategy('condition', 'ENTRY')
  return selectedStrategyId.value === 'MAIN_DIARY' ? [...DEFAULT_ENTRY_CONDITIONS, ...items] : items
})
const entryScenarios = computed(() => {
  const items = getNodesForStrategy('scenario', 'ALL').filter(n => n.params?.phase === 'ENTRY')
  return selectedStrategyId.value === 'MAIN_DIARY' ? [...DEFAULT_ENTRY_SCENARIOS, ...items] : items
})
const exitConditions = computed(() => {
  const items = getNodesForStrategy('condition', 'EXIT')
  return selectedStrategyId.value === 'MAIN_DIARY' ? [...DEFAULT_EXIT_CONDITIONS, ...items] : items
})
const exitScenarios = computed(() => {
  const items = getNodesForStrategy('scenario', 'ALL').filter(n => n.params?.phase === 'EXIT')
  return [...DEFAULT_EXIT_SCENARIOS, ...items]
})

const miniExitScenarios = computed(() => exitScenarios.value.filter(n => n.isMini))
const regularExitScenarios = computed(() => exitScenarios.value.filter(n => !n.isMini))

const filteredRegistryEntryScenarios = computed(() => {
  return entryScenarios.value.filter(s => {
    const name = (s.params?.customName || s.label).toLowerCase()
    return name.includes(registrySearchQuery.value.toLowerCase())
  })
})

const filteredRegistryExitScenarios = computed(() => {
  return regularExitScenarios.value.filter(s => {
    const name = (s.params?.customName || s.label).toLowerCase()
    return name.includes(registrySearchQuery.value.toLowerCase())
  })
})

const currentRegistryScenarioConditions = computed(() => {
  if (!selectedRegistryScenarioId.value) return []
  return getScenarioConditions(selectedRegistryScenarioId.value)
})

const mismatchedNodeIds = computed(() => {
  const ids = new Set()
  if (!side.value || !currentRegistryScenarioConditions.value.length) return ids
  const activeSide = side.value.trim().toLowerCase()
  
  for (const cond of currentRegistryScenarioConditions.value) {
    let parentMismatch = false
    
    // Check Root
    if (cond.direction && typeof cond.direction === 'string') {
      const d = cond.direction.trim().toLowerCase()
      if (d !== 'both' && d !== '' && d !== activeSide) {
        ids.add(cond.id)
        parentMismatch = true
      }
    }
    
    // Check Nested
    if (cond.indicatorUnits) {
      for (const unit of cond.indicatorUnits) {
        if (unit.type === 'bundle' && unit.items) {
          for (const item of unit.items) {
            let itemMismatch = parentMismatch
            if (item.direction && typeof item.direction === 'string') {
              const idir = item.direction.trim().toLowerCase()
              if (idir !== 'both' && idir !== '' && idir !== activeSide) {
                itemMismatch = true
              }
            }
            if (itemMismatch) {
              ids.add(item.id)
              ids.add(cond.id) // Ensure parent is red if any child is red
            }
          }
        } else if (unit.type === 'single' && unit.item) {
          let itemMismatch = parentMismatch
          if (unit.item.direction && typeof unit.item.direction === 'string') {
            const idir = unit.item.direction.trim().toLowerCase()
            if (idir !== 'both' && idir !== '' && idir !== activeSide) {
              itemMismatch = true
            }
          }
          if (itemMismatch) {
            ids.add(unit.item.id)
            ids.add(cond.id)
          }
        }
      }
    }
  }
  return ids
})

const hasVectorMismatch = computed(() => mismatchedNodeIds.value.size > 0)

const activeConditions = ref(new Set())
const toggleCondition = (id, scenarioId = null) => {
  if (mismatchedNodeIds.value.has(id)) return

  // 1. Identify which scenario this condition belongs to
  const targetScenarioId = scenarioId || selectedRegistryScenarioId.value

  // 2. Scenario Exclusivity Logic: Clear conditions from other scenarios of the same type
  if (targetScenarioId) {
    const getScenarioType = (scenId) => {
      if (!scenId) return 'ENTRY'
      const strId = String(scenId)
      if (strId === 'default-exit-system') return 'SYSTEM_EXIT'
      if (strId.includes('-entry-')) return 'ENTRY'
      if (strId.includes('-exit-')) return 'EXIT'
      const node = findNodeById(matrixNodes.value, scenId)
      if (node?.params?.phase) return node.params.phase.toUpperCase()
      const zoneType = getNodeZoneType(scenId, matrixNodes.value, matrixZones.value)
      return zoneType || 'ENTRY'
    }

    const targetType = getScenarioType(targetScenarioId)
    
    // Find all scenarios that currently have active conditions
    const allScens = [...findAllNodes(matrixNodes.value).filter(n => n.type === 'scenario'), ...DEFAULT_EXIT_SCENARIOS, ...DEFAULT_ENTRY_SCENARIOS]
    allScens.forEach(s => {
      if (s.id !== targetScenarioId && getScenarioType(s.id) === targetType) {
        const conds = getActiveConditionsInScenario(s.id)
        conds.forEach(cid => activeConditions.value.delete(cid))
      }
    })
  }

  // 3. Normal Toggle Logic
  const systemProtocolIds = ['cond-exit-tp', 'cond-exit-sl', 'cond-exit-fl']
  if (systemProtocolIds.includes(id)) {
    if (activeConditions.value.has(id)) {
      activeConditions.value.delete(id)
    } else {
      systemProtocolIds.forEach(rid => activeConditions.value.delete(rid))
      activeConditions.value.add(id)
    }
    return
  }

  // Find bundle context
  let targetBundle = null
  for (const cond of currentRegistryScenarioConditions.value) {
    if (cond.indicatorUnits) {
      for (const unit of cond.indicatorUnits) {
        if (unit.type === 'bundle' && unit.items?.some(i => i.id === id)) {
          targetBundle = unit
          break
        }
      }
    }
    if (targetBundle) break
  }

  const isCurrentlyActive = activeConditions.value.has(id)

  if (targetBundle) {
    const itemIds = targetBundle.items.map(i => i.id)
    const logic = targetBundle.logic?.toUpperCase()

    if (logic === 'OR') {
      if (isCurrentlyActive) {
        activeConditions.value.delete(id)
      } else {
        itemIds.forEach(iid => activeConditions.value.delete(iid))
        activeConditions.value.add(id)
      }
    } else if (logic === 'AND') {
      if (isCurrentlyActive) {
        itemIds.forEach(iid => activeConditions.value.delete(iid))
      } else {
        itemIds.forEach(iid => activeConditions.value.add(iid))
      }
    } else {
      isCurrentlyActive ? activeConditions.value.delete(id) : activeConditions.value.add(id)
    }
  } else {
    isCurrentlyActive ? activeConditions.value.delete(id) : activeConditions.value.add(id)
  }
}

const showConditionLibrary = ref(false)
const showEmotionSelector = ref(false)
const registrySearchQuery = ref('')
const libraryFilter = ref('ALL') // 'ALL', 'ENTRY', 'EXIT'

const filteredLibraryScenarios = computed(() => {
  const all = [...entryScenarios.value, ...exitScenarios.value]
  return all.filter(s => {
    const isTypeMatch = libraryFilter.value === 'ALL' || 
                        (libraryFilter.value === 'ENTRY' && entryScenarios.value.some(e => e.id === s.id)) || 
                        (libraryFilter.value === 'EXIT' && exitScenarios.value.some(e => e.id === s.id));
    const isSearchMatch = !registrySearchQuery.value || 
                          (s.params?.customName || s.label).toLowerCase().includes(registrySearchQuery.value.toLowerCase());
    
    if (!isTypeMatch || !isSearchMatch) return false;
    if (libraryFilter.value === 'ALL') return true;

    // Filter by direction for Entry/Exit tabs
    const tradeSide = side.value.toLowerCase();
    const nodeDir = (s.params?.direction || 'NONE').toLowerCase();
    return nodeDir === 'none' || nodeDir === tradeSide;
  })
})

const flatLibraryConditions = computed(() => {
  const allScenarios = [...entryScenarios.value, ...exitScenarios.value]
  const allConds = []
  const seenIds = new Set()
  
  allScenarios.forEach(scen => {
    const nodeDir = (scen.params?.direction || 'NONE').toUpperCase();
    const tradeSide = side.value.toUpperCase();
    const isMismatched = nodeDir !== 'NONE' && nodeDir !== tradeSide;

    getScenarioConditions(scen.id).forEach(c => {
      if (c.indicatorUnits) {
        c.indicatorUnits.forEach(unit => {
          const items = unit.type === 'bundle' ? unit.items : [unit.item];
          items.forEach(item => {
            if (!item || !item.id) return;
            if (!seenIds.has(item.id)) {
              const isSearchMatch = !registrySearchQuery.value || 
                                    item.label.toLowerCase().includes(registrySearchQuery.value.toLowerCase());
              if (isSearchMatch) {
                allConds.push({ 
                  ...item, 
                  id: item.id,
                  name: item.label,
                  isMismatched, 
                  scenarioId: scen.id 
                })
                seenIds.add(item.id)
              }
            }
          })
        })
      } else {
        if (!c.id) return;
        if (!seenIds.has(c.id)) {
          const isSearchMatch = !registrySearchQuery.value || 
                                (c.name || '').toLowerCase().includes(registrySearchQuery.value.toLowerCase());
          if (isSearchMatch) {
            allConds.push({ 
              ...c, 
              id: c.id,
              name: c.name,
              isMismatched, 
              scenarioId: scen.id 
            })
            seenIds.add(c.id)
          }
        }
      }
    })
  })
  return allConds
})
const selectedRegistryScenarioId = ref(null)
let hoverTimeout = null

const hoveredScenarioId = ref(null)
const handleMouseEnterScenario = (id) => {
  if (hoverTimeout) clearTimeout(hoverTimeout)
  hoveredScenarioId.value = id
}

const handleMouseLeaveScenario = () => {
  hoverTimeout = setTimeout(() => {
    hoveredScenarioId.value = null
  }, 80)
}

const handleMouseEnterInsight = () => {
  if (hoverTimeout) clearTimeout(hoverTimeout)
}

const getActiveConditionsInScenario = (scenarioId) => {
  const conditions = getScenarioConditions(scenarioId)
  const activeIds = []
  conditions.forEach(cond => {
    if (activeConditions.value.has(cond.id)) activeIds.push(cond.id)
    if (cond.indicatorUnits) {
      cond.indicatorUnits.forEach(unit => {
        if (unit.type === 'bundle') {
          unit.items?.forEach(i => {
            if (activeConditions.value.has(i.id)) activeIds.push(i.id)
          })
        } else if (unit.type === 'single' && unit.item) {
          if (activeConditions.value.has(unit.item.id)) activeIds.push(unit.item.id)
        }
      })
    }
  })
  return activeIds
}

const isScenarioSelected = (scenId) => {
  return selectedRegistryScenarioId.value === scenId || activeConditions.value.has(scenId) || getActiveConditionsInScenario(scenId).length > 0
}

const handleMouseLeaveInsight = () => {
  hoverTimeout = setTimeout(() => {
    hoveredScenarioId.value = null
  }, 80)
}

const getScenarioConditions = (scenarioId) => {
  if (scenarioId.startsWith('default-')) {
    const isEntry = scenarioId.includes('-entry-')
    
    if (scenarioId === 'default-exit-system') {
      return [
        { id: 'cond-exit-tp', name: 'TAKE_PROFIT', description: 'STRATEGIC_PROFIT_CAPTURE_TARGET' },
        { id: 'cond-exit-sl', name: 'STOP_LOSS', description: 'CAPITAL_PRESERVATION_THRESHOLD' },
        { id: 'cond-exit-fl', name: 'FULL_LIQUIDATION', description: 'TOTAL_EXPOSURE_TERMINATION' }
      ]
    }

    return []
  }

  const scenario = findNodeById(matrixNodes.value, scenarioId)
  if (!scenario) return []

  const allNodes = findAllNodes(matrixNodes.value)
  const allConnections = findAllConnections(matrixNodes.value, matrixConnections.value)
  const subNodes = findAllNodes(scenario.subGraph?.nodes || [])

  // 1. Get all conditions connected to this scenario (recursive list)
  const reachableNodes = getReachableNodes(scenarioId, allNodes, allConnections)
  
  const subConditions = subNodes.filter(n => n.type === 'condition')
  const connectedConditions = reachableNodes.filter(n => n.type === 'condition')
  
  // Combine and deduplicate
  const allConditionsMap = new Map()
  subConditions.forEach(c => allConditionsMap.set(c.id, c))
  connectedConditions.forEach(c => allConditionsMap.set(c.id, c))
  const allConditions = Array.from(allConditionsMap.values())

  // Helper to get indicator data
  const getIndicatorData = (nodeId, parentCond) => {
     const n = findNodeById(matrixNodes.value, nodeId)
                    if (!n || n.type === 'placeholder') return null
     
     return {
        id: n.id,
        label: (n.params?.customName || n.label).toUpperCase(),
        description: n.params?.description || n.params?.value || n.params?.info || '',
        direction: n.params?.direction,
        priority: parentCond.params?.priority || 'NONE'
     }
  }

  // 2. Map each condition to its underlying tactical units (Indicators, Patterns, etc.)
  const tacticalUnits = []

  allConditions.forEach(cond => {
    const structure = cond.params?.logicalStructure || []
    const priority = cond.params?.priority || 'NONE'
    
    if (structure && structure.length > 0) {
      structure.forEach(unit => {
        if (unit.type === 'bundle') {
          const items = unit.nodeIds.map(id => getIndicatorData(id, cond)).filter(Boolean)
          if (items.length > 0) {
            tacticalUnits.push({
              id: `${cond.id}_${unit.logic}_${items[0].id}`,
              name: `${unit.logic}_PROTOCOL`,
              description: `Grouped tactical requirements from ${cond.params?.customName || cond.label}.`,
              priority,
              indicatorUnits: [{
                type: 'bundle',
                logic: unit.logic,
                items
              }]
            })
          }
        } else {
          const item = getIndicatorData(unit.id, cond)
          if (item) {
            tacticalUnits.push({
              id: item.id,
              name: item.label,
              description: item.description,
              direction: item.direction,
              priority,
              indicatorUnits: [{ type: 'single', item }]
            })
          }
        }
      })
    } else {
      // Fallback: Just get all indicators connected to this condition flatly
      const indicatorIds = allConnections.filter(c => c.fromId === cond.id).map(c => c.toId)
      const indicators = [
         ...allNodes.filter(n => indicatorIds.includes(n.id) && n.type !== 'placeholder'),
         ...(cond.subGraph?.nodes || []).filter(n => n.type !== 'placeholder')
      ]
      
      indicators.forEach(i => {
        const item = {
          id: i.id,
          label: (i.params?.customName || i.label).toUpperCase(),
          description: i.params?.description || i.params?.value || i.params?.info || '',
          direction: i.params?.direction,
          priority
        }
        tacticalUnits.push({
          id: i.id,
          name: item.label,
          description: item.description,
          direction: item.direction,
          priority,
          indicatorUnits: [{ type: 'single', item }]
        })
      })
    }
  })

  return tacticalUnits
}

const getFlattenedScenarioConditions = (scenarioId) => {
  const conds = getScenarioConditions(scenarioId)
  const flattened = []
  const seenIds = new Set()
  
  conds.forEach(c => {
    if (c.indicatorUnits) {
      c.indicatorUnits.forEach(unit => {
        const items = unit.type === 'bundle' ? unit.items : [unit.item];
        items.forEach(item => {
          if (!item || !item.id) return;
          if (!seenIds.has(item.id)) {
            flattened.push({ 
              ...item, 
              id: item.id,
              name: item.label,
              priority: c.priority 
            })
            seenIds.add(item.id)
          }
        })
      })
    } else {
      if (!c.id) return;
      if (!seenIds.has(c.id)) {
        flattened.push({ 
          ...c, 
          id: c.id,
          name: c.name,
          priority: c.priority || 'NONE'
        })
        seenIds.add(c.id)
      }
    }
  })
  return flattened
}

// Sector Navigation
const activeSector = ref('core')
const sectors = [
  { id: 'core', label: 'Core_Logic' },
  { id: 'risk', label: 'Risk_Param' },
  { id: 'time', label: 'Temporal' },
  { id: 'fee', label: 'Commissions' }
]

// Core Data
const side = ref('long')
const entry = ref('')
const exit = ref('')
const size = ref('')
const entryFee = ref('')
const exitFee = ref('')
const feeType = ref('%')
const resultMode = ref('auto')

// Entry & Exit Protocol
const showEntryMethod = ref(false)
const activeProtocolTab = ref('PYRAMIDING') // 'PYRAMIDING', 'AVERAGING_DOWN', or 'EXIT'

// Entry State
const entryMethodType = ref('PYRAMIDING') // Tracks the active entry calculation mode
const pyramidingEntries = ref([])
const averagingDownEntries = ref([])

const activeMultipleEntries = computed(() => 
  entryMethodType.value === 'PYRAMIDING' ? pyramidingEntries.value : averagingDownEntries.value
)

const entryMethodEnabled = computed(() => activeMultipleEntries.value.length > 1)

const hasActiveMethodNode = computed(() => {
  const pType = entryMethodType.value === 'PYRAMIDING' ? 'pyramiding' : 'averaging'
  return getNodesForStrategy(pType).length > 0
})

const addMultipleEntry = () => {
  activeMultipleEntries.value.push({ id: Date.now(), price: '', size: '' })
}

// Exit State
const exitEntries = ref([])
const exitMethodEnabled = computed(() => exitEntries.value.length > 0)

const totalExitSize = computed(() => {
  return exitEntries.value.reduce((sum, e) => sum + (parseFloat(e.size) || 0), 0)
})

const averageExit = computed(() => {
  let totalValue = 0
  let totalQty = 0
  exitEntries.value.forEach(e => {
    const p = parseFloat(e.price) || 0
    const s = parseFloat(e.size) || 0
    if (p > 0 && s > 0) {
      totalValue += p * s
      totalQty += s
    }
  })
  return totalQty > 0 ? totalValue / totalQty : 0
})

const addExitEntry = () => {
  const remaining = Math.max(0, totalSize.value - totalExitSize.value)
  exitEntries.value.push({ id: Date.now(), price: '', size: remaining > 0 ? remaining.toFixed(2) : '' })
}

const removeExitEntry = (id) => {
  exitEntries.value = exitEntries.value.filter(e => e.id !== id)
}

const removeMultipleEntry = (id) => {
  if (entryMethodType.value === 'PYRAMIDING') {
    pyramidingEntries.value = pyramidingEntries.value.filter(e => e.id !== id)
  } else {
    averagingDownEntries.value = averagingDownEntries.value.filter(e => e.id !== id)
  }
}

const showAutoPrompt = ref(false)
const autoEntryBasePrice = ref('')
const autoEntryBaseLots = ref('')

const toggleAutoPrompt = () => {
  showAutoPrompt.value = !showAutoPrompt.value
  if (showAutoPrompt.value) {
    autoEntryBasePrice.value = ''
    autoEntryBaseLots.value = size.value || '1.0'
  }
}

const confirmAutoGenerate = () => {
  const methodMode = entryMethodType.value
  const pType = methodMode === 'PYRAMIDING' ? 'pyramiding' : 'averaging'
  
  const allNodes = findAllNodes(matrixNodes.value)
  const allConns = findAllConnections(matrixNodes.value, matrixConnections.value)
  
  let methodNode = getNodesForStrategy(pType)[0]
  if (!methodNode) {
    alert(`No ${methodMode} node found in the selected strategy.`)
    return
  }

  let steps = []
  
  if (methodNode) {
    const childIds = allConns.filter(c => c.fromId === methodNode.id).map(c => c.toId)
    const scalingNodes = allNodes.filter(n => childIds.includes(n.id) && (n.type === 'scaling-entry' || n.type === 'step'))

    if (scalingNodes.length > 0) {
      const sorted = [...scalingNodes].sort((a,b) => {
         const posA = a.params?.posNumber !== undefined ? a.params.posNumber : a.x
         const posB = b.params?.posNumber !== undefined ? b.params.posNumber : b.x
         return posA - posB
      })
      steps = sorted.map(n => ({
        lots: parseFloat(n.params?.lots || 1),
        step: parseFloat(n.params?.step || n.params?.distance || n.params?.value || 0),
        unit: n.params?.unit || '%'
      }))
    } else if (methodNode.params?.scalingProtocol) {
      steps = methodNode.params.scalingProtocol.map(p => ({
         lots: parseFloat(p.size),
         step: parseFloat(p.value || p.distance || 0),
         unit: p.unit
      }))
    }
  }

  if (steps.length === 0) {
    alert(`No ${methodMode} sequence steps found attached to the method node in the Genesis Matrix.`)
    return
  }

  const basePrice = parseFloat(autoEntryBasePrice.value)
  if (isNaN(basePrice) || basePrice <= 0) {
    alert("Invalid price")
    return
  }
  
  const baseLots = parseFloat(autoEntryBaseLots.value)
  if (isNaN(baseLots) || baseLots <= 0) {
    alert("Invalid lot size")
    return
  }

  const isLong = side.value === 'long'
  const newEntries = []
  
  newEntries.push({
    id: Date.now().toString() + 'base',
    price: basePrice,
    size: baseLots
  })

  let currentBase = basePrice

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]
    let priceOffset = 0
    if (s.unit === '%') {
      priceOffset = currentBase * (s.step / 100)
    } else {
      priceOffset = s.step
    }
    
    let calculatedPrice = currentBase
    if (pType === 'pyramiding') {
      calculatedPrice = isLong ? (currentBase + priceOffset) : (currentBase - priceOffset)
    } else {
      calculatedPrice = isLong ? (currentBase - priceOffset) : (currentBase + priceOffset)
    }
    
    newEntries.push({
      id: Date.now().toString() + i,
      price: parseFloat(calculatedPrice.toFixed(5)),
      size: s.lots
    })
    
    currentBase = calculatedPrice
  }

  if (methodMode === 'PYRAMIDING') {
    pyramidingEntries.value = newEntries
  } else {
    averagingDownEntries.value = newEntries
  }

  showAutoPrompt.value = false
}

const totalSize = computed(() => {
  if (!entryMethodEnabled.value || activeMultipleEntries.value.length === 0) return parseFloat(size.value) || 0
  return activeMultipleEntries.value.reduce((sum, e) => sum + (parseFloat(e.size) || 0), 0)
})

const averageEntry = computed(() => {
  if (!entryMethodEnabled.value || activeMultipleEntries.value.length === 0) return parseFloat(entry.value) || 0
  
  let totalValue = 0
  let totalQty = 0
  activeMultipleEntries.value.forEach(e => {
    const p = parseFloat(e.price) || 0
    const s = parseFloat(e.size) || 0
    if (p > 0 && s > 0) {
      totalValue += p * s
      totalQty += s
    }
  })
  return totalQty > 0 ? totalValue / totalQty : 0
})

const isForex = computed(() => {
  if (currentAssetData.value) return currentAssetData.value.type === 'Forex'
  const s = asset.value.toUpperCase()
  return s.includes('/') || (s.length === 6 && !s.includes(' '))
})



const isManualEntryAsset = computed(() => {
  if (currentAssetData.value?.contractSize) return false
  const type = currentAssetData.value?.type?.toLowerCase() || ''
  if (type.includes('index') || type.includes('indices') || type.includes('commodities')) return true
  const sym = asset.value.toUpperCase()
  const manuals = [
    'SPX', 'NDX', 'US30', 'GER40', 'DAX', 'UK100', 'FRA40', 'JPN225', 'HK50', 
    'WTI', 'BRENT', 'NATGAS', 'SOYBN', 'WHEAT', 'CORN', 'COCOA',
    'LIVCAT', 'FDRCAT', 'LN_HOG', 'ORNG_J', 'RICE', 'LUMBER', 'PALLAD', 'PLATIN', 'HEAT_O', 'GASOLN'
  ]
  return manuals.some(idx => sym === idx)
})

const isFixedFeeAsset = computed(() => isManualEntryAsset.value || isForex.value)
watch(isFixedFeeAsset, (val) => {
  if (val) feeType.value = '$'
}, { immediate: true })

const overridePnl = ref(null)
watch(asset, () => { 
  overridePnl.value = null 
})

watch(isManualEntryAsset, (val) => {
  resultMode.value = val ? 'manual' : 'auto'
}, { immediate: true })

// Forex Rates System
const liveRates = ref({})
const FALLBACK_RATES = {
  'USD': 1,
  'EUR': 0.925,
  'GBP': 0.79,
  'JPY': 150.5,
  'AUD': 1.53,
  'CAD': 1.37,
  'CHF': 0.90,
  'NZD': 1.66
}

const fetchLiveRates = async () => {
  try {
    const cached = localStorage.getItem('genesis_forex_rates')
    if (cached) {
      liveRates.value = JSON.parse(cached)
    }
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (res.ok) {
      const data = await res.json()
      liveRates.value = data.rates
      localStorage.setItem('genesis_forex_rates', JSON.stringify(data.rates))
    }
  } catch (err) {
    console.warn('Using cached or fallback forex rates.')
  }
}

const getRate = (currency) => {
  return liveRates.value[currency] || FALLBACK_RATES[currency] || 1
}

onMounted(() => {
  fetchLiveRates()
})


// Risk Data
const EMOTION_LIBRARY = GENESIS_EMOTION_LIBRARY

const emotionsByCategory = computed(() => {
  const groups = { NEGATIVE: [], NEUTRAL: [], POSITIVE: [] }
  EMOTION_LIBRARY.forEach(emotion => {
    const cat = emotion.type.toUpperCase()
    if (groups[cat]) groups[cat].push(emotion)
  })
  return groups
})

const showEmotions = ref(false)
const selectedEmotions = ref([])
const hoveredEmotion = ref(null)
const mousePos = ref({ x: 0, y: 0 })

const EMOTION_OPPOSITES = {
  'FOMO': 'Patience',
  'Patience': 'FOMO',
  'Fear': 'Confidence',
  'Confidence': 'Fear',
  'Tilt': 'Calmness',
  'Calmness': 'Tilt',
  'Greed': 'Discipline',
  'Discipline': 'Greed',
  'Boredom': 'Focus',
  'Focus': 'Boredom',
  'Anxiety': 'Calmness'
}

const toggleEmotion = (label) => {
  const index = selectedEmotions.value.indexOf(label)
  if (index > -1) {
    selectedEmotions.value.splice(index, 1)
  } else {
    const opposite = EMOTION_OPPOSITES[label]
    if (opposite && selectedEmotions.value.includes(opposite)) return
    selectedEmotions.value.push(label)
  }
}

const isEmotionDisabled = (label) => {
  const opposite = EMOTION_OPPOSITES[label]
  return opposite && selectedEmotions.value.includes(opposite)
}

const stopLoss = ref('')
const takeProfit = ref('')

// Time Data
const openDate = ref(new Date())
const exitDate = ref(new Date())

const cloneDate = (date) => {
  const cloned = new Date(date)
  return Number.isNaN(cloned.getTime()) ? new Date() : cloned
}

const adjustDate = (target, unit, delta) => {
  const d = cloneDate(target === 'open' ? openDate.value : exitDate.value)
  if (unit === 'year') d.setFullYear(d.getFullYear() + delta)
  if (unit === 'month') {
    let m = d.getMonth() + delta
    if (m > 11) m = 0
    if (m < 0) m = 11
    const currentDay = d.getDate()
    d.setDate(1)
    d.setMonth(m)
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(currentDay, lastDay))
  }
  if (unit === 'day') {
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    let day = d.getDate() + delta
    if (day > lastDay) day = 1
    if (day < 1) day = lastDay
    d.setDate(day)
  }
  if (unit === 'hour') {
    let h = d.getHours() + delta
    if (h > 23) h = 0
    if (h < 0) h = 23
    d.setHours(h)
  }
  if (unit === 'minute') {
    let m = d.getMinutes() + delta
    if (m > 59) m = 0
    if (m < 0) m = 59
    d.setMinutes(m)
  }
  if (target === 'open') openDate.value = cloneDate(d)
  else exitDate.value = cloneDate(d)
  
  // After adjustment, we always sync to ensure UI is valid
  syncTempParts()
}

const formatPart = (date, unit) => {
  const d = cloneDate(date)
  if (unit === 'year') return d.getFullYear()
  if (unit === 'month') return (d.getMonth() + 1).toString().padStart(2, '0')
  if (unit === 'day') return d.getDate().toString().padStart(2, '0')
  if (unit === 'hour') return d.getHours().toString().padStart(2, '0')
  if (unit === 'minute') return d.getMinutes().toString().padStart(2, '0')
}

const handleManualDate = (target, unit, val) => {
  let processedVal = val
  let v = parseInt(val)

  // Clamping and Validation
  if (!isNaN(v)) {
    if (unit === 'month') {
      if (v > 12) { v = 12; processedVal = '12' }
    }
    if (unit === 'day') {
      const p = tempDateParts.value
      const year = parseInt(p.year) || new Date().getFullYear()
      const month = parseInt(p.month) || 1
      const lastDay = new Date(year, month, 0).getDate()
      if (v > lastDay) { v = lastDay; processedVal = lastDay.toString().padStart(2, '0') }
    }
    if (unit === 'hour') { if (v > 23) { v = 23; processedVal = '23' } }
    if (unit === 'minute') { if (v > 59) { v = 59; processedVal = '59' } }
  }

  // Update local part first (allow empty/transient states)
  tempDateParts.value[unit] = processedVal
  
  const p = tempDateParts.value
  const year = parseInt(p.year)
  const month = parseInt(p.month)
  const day = parseInt(p.day)
  const hour = parseInt(p.hour)
  const minute = parseInt(p.minute)
  
  // If any part is missing/invalid, don't update the underlying Date object yet
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) return
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) return

  const currentDate = cloneDate(target === 'open' ? openDate.value : exitDate.value)
  const d = new Date(
    year,
    month - 1,
    1,
    hour,
    minute,
    currentDate.getSeconds(),
    currentDate.getMilliseconds()
  )
  const lastDay = new Date(year, month, 0).getDate()
  d.setDate(Math.min(day, lastDay))

  if (target === 'open') openDate.value = cloneDate(d)
  else exitDate.value = cloneDate(d)
}

// Equity Projection Logic
const projectedProfit = computed(() => {
  const en = entryMethodEnabled.value ? averageEntry.value : parseFloat(entry.value)
  const ex = exitMethodEnabled.value ? averageExit.value : parseFloat(exit.value)
  const sz = exitMethodEnabled.value ? totalExitSize.value : (entryMethodEnabled.value ? totalSize.value : parseFloat(size.value))
  if (isNaN(en) || isNaN(ex) || isNaN(sz)) return null
  
  let finalProfit = 0
  
  if (isForex.value) {
    const symbol = asset.value.toUpperCase().replace('/', '')
    const base = symbol.substring(0, 3)
    const quote = symbol.substring(3, 6)
    const isJpy = symbol.includes('JPY')
    
    // 1. price_move
    const price_move = side.value === 'long' ? (ex - en) : (en - ex)
    
    // 2. pips calculation (100 for JPY, 10000 for standard)
    const pips = isJpy ? price_move * 100 : price_move * 10000
    
    // 3. pip_value (base standard: 0.01 lot = 0.1)
    const pip_value = sz * 10
    
    // 4. profit calculation
    if (quote === 'USD') {
      finalProfit = pips * pip_value
    } else if (isJpy) {
      const usdJpyRate = getRate('JPY')
      finalProfit = (pips * pip_value * 100) / usdJpyRate
    } else if (base === 'USD') {
      finalProfit = (pips * pip_value) / ex
    } else {
      const quoteToUsdRate = 1 / getRate(quote)
      finalProfit = (pips * pip_value) * quoteToUsdRate
    }
  } else {
    // Non-forex
    const price_move = side.value === 'long' ? (ex - en) : (en - ex)
    
    if (currentAssetData.value?.contractSize) {
      const size_multiplier = currentAssetData.value.contractSize
      const raw_profit = price_move * sz * size_multiplier
      
      // Currency conversion to USD
      const assetCurrency = currentAssetData.value.currency || 'USD'
      if (assetCurrency !== 'USD') {
        const rate = getRate(assetCurrency)
        finalProfit = raw_profit / rate
      } else {
        finalProfit = raw_profit
      }
    } else {
      // Fallback for assets without metadata
      finalProfit = price_move * sz
    }
  }

  // Deduct Fees
  let eFee = +entryFee.value || 0
  let xFee = +exitFee.value || 0
  
  if (feeType.value === '%') {
    eFee = (en * eFee) / 100
    xFee = (ex * xFee) / 100
  }
  
  return finalProfit - (eFee + xFee)
})

const hasValidProjection = computed(() => {
  if (resultMode.value === 'manual' && overridePnl.value !== null && overridePnl.value !== '') return true
  return projectedProfit.value !== null
})

const equityCurveTrades = computed(() => {
  let historical = tradeStore.getTradesForStrategy(selectedStrategyId.value)
  console.log('[DEBUG equityCurveTrades] Strat:', selectedStrategyId.value, 'Total historical:', historical.length)
  
  if (props.initialTrade) {
    const initialDateStr = props.initialTrade.dateExit || props.initialTrade.date
    if (initialDateStr) {
      const initialDate = new Date(initialDateStr)
      const initialTime = initialDate.getTime()
      
      historical = historical.filter(t => {
        if (t.id === props.initialTrade.id) return false
        const tDateStr = t.dateExit || t.date
        if (!tDateStr) return true
        
        const tDate = new Date(tDateStr)
        const tTime = tDate.getTime()
        
        // If either date is invalid, safely include the trade so we don't wipe the history
        if (isNaN(tTime) || isNaN(initialTime)) return true
        
        return tTime <= initialTime
      })
    } else {
      historical = historical.filter(t => t.id !== props.initialTrade.id)
    }
  }
  const currentPnl = pnl.value
  
  if (!hasValidProjection.value) return historical
  
  // Create a projection point based on current setup
  const projection = {
    id: 'projection',
    asset: asset.value || 'UNSET',
    side: side.value,
    date: exitDate.value,
    dateExit: exitDate.value,
    profitInCurrency: Number(currentPnl) || 0,
    isProjection: true
  }
  
  return [...historical, projection]
})

const isTemporalOpen = ref(false)
const activeTemporalTarget = ref('open')
const _now = new Date()
const tempDateParts = ref({
  day: _now.getDate().toString().padStart(2, '0'),
  month: (_now.getMonth() + 1).toString().padStart(2, '0'),
  year: _now.getFullYear().toString(),
  hour: _now.getHours().toString().padStart(2, '0'),
  minute: _now.getMinutes().toString().padStart(2, '0')
})

const syncTempParts = () => {
  const d = activeTemporalTarget.value === 'open' ? openDate.value : exitDate.value
  const parts = {
    day: formatPart(d, 'day'),
    month: formatPart(d, 'month'),
    year: formatPart(d, 'year').toString(),
    hour: formatPart(d, 'hour'),
    minute: formatPart(d, 'minute')
  }
  Object.keys(parts).forEach(k => {
    if (parseInt(tempDateParts.value[k]) !== parseInt(parts[k])) {
      tempDateParts.value[k] = parts[k]
    }
  })
}

const openTemporal = (target) => {
  activeTemporalTarget.value = target
  syncTempParts()
  isTemporalOpen.value = true
}

watch(activeTemporalTarget, () => {
  if (isTemporalOpen.value) syncTempParts()
})

const scrollContainer = ref(null)

const pnl = computed({
  get: () => (resultMode.value === 'manual' && overridePnl.value !== null) ? overridePnl.value : (projectedProfit.value || 0),
  set: (val) => { overridePnl.value = val }
})

const commitState = ref('idle')

const resetForm = () => {
  asset.value = ''
  side.value = 'long'
  entry.value = ''
  exit.value = ''
  size.value = ''
  stopLoss.value = ''
  takeProfit.value = ''
  activeConditions.value.clear()
  selectedEmotions.value = []
  journalEntries.value = []
  openDate.value = new Date()
  exitDate.value = new Date()
  overridePnl.value = null
  selectedRegistryScenarioId.value = null
  showConditionLibrary.value = false
  showEntryMethod.value = false
  activeProtocolTab.value = 'PYRAMIDING'
  entryMethodType.value = 'PYRAMIDING'
  pyramidingEntries.value = []
  averagingDownEntries.value = []
  exitEntries.value = []
  showEmotionSelector.value = false
  viewMode.value = 'tactical'
  isTemporalOpen.value = false
  syncTempParts()
}

const submit = async () => {
  const finalEntry = entryMethodEnabled.value ? averageEntry.value : +entry.value
  const finalExit = exitMethodEnabled.value ? averageExit.value : +exit.value
  const finalSize = totalSize.value
  const committedOpenDate = cloneDate(openDate.value)
  const committedExitDate = cloneDate(exitDate.value)
  const plannedRiskReward = activeRiskSnapshot.value?.riskRewardRatio ?? undefined

  if (!finalEntry || !finalExit || !finalSize) return
  if (commitState.value !== 'idle') return
  
  const findActiveScenario = (scenarios) => {
    // First check if the currently selected registry ID belongs to this group
    const explicit = scenarios.find(s => s.id === selectedRegistryScenarioId.value)
    if (explicit) return explicit
    
    // Otherwise, find the first scenario that has active conditions
    const byConditions = scenarios.find(s => getActiveConditionsInScenario(s.id).length > 0)
    return byConditions || null
  }

  const activeEntry = findActiveScenario(entryScenarios.value)
  const activeExit = findActiveScenario(exitScenarios.value.filter(s => !s.isMini))
  const activeMini = miniExitScenarios.value.find(s => getActiveConditionsInScenario(s.id).length > 0)

  const getScenarioActiveConditions = (scenId) => {
    if (!scenId) return []
    const scenarioConds = getScenarioConditions(scenId)
    const activeResults = []
    
    scenarioConds.forEach(c => {
       // We traverse the indicator units within each condition node
       // and extract ONLY the specifically selected indicators.
       if (c.indicatorUnits) {
          c.indicatorUnits.forEach(u => {
             if (u.type === 'bundle') {
                u.items?.forEach(i => {
                   if (activeConditions.value.has(i.id)) {
                      activeResults.push({
                         id: i.id,
                         info: { 
                            name: (i.label || '').toUpperCase(), 
                            description: i.description || '',
                            priority: i.priority || c.priority || 'NONE'
                         }
                      })
                   }
                })
             } else if (u.type === 'single' && u.item) {
                if (activeConditions.value.has(u.item.id)) {
                   activeResults.push({
                      id: u.item.id,
                      info: { 
                         name: (u.item.label || '').toUpperCase(), 
                         description: u.item.description || '',
                         priority: u.item.priority || c.priority || 'NONE'
                      }
                   })
                }
             }
          })
       }

       // Special case: If the condition node itself is the selected entity 
       // (e.g. standalone condition with no internal indicators), we add it.
       if (activeResults.length === 0 && activeConditions.value.has(c.id)) {
          activeResults.push({
             id: c.id,
             info: { 
                name: (c.name || '').toUpperCase(), 
                description: c.description || '',
                priority: c.priority || 'NONE'
             }
          })
       }
    })
    return activeResults
  }

  // Helper to format scenario info
  const formatScen = (s, allTrades, side) => {
    if (!s) return null
    
    // Virtual Scenario Handling for System Protocols
    if (s.id === 'default-exit-system') {
      const activeConds = getScenarioActiveConditions(s.id)
      if (activeConds.length > 0) {
        const first = activeConds[0]
        const enrichedConds = activeConds.map(c => ({
          ...c
        }))
        
        return {
          id: first.id,
          info: {
            name: first.info.name,
            description: first.info.description,
            conditions: enrichedConds
          }
        }
      }
    }

    const activeConds = getScenarioActiveConditions(s.id).map(c => ({
      ...c
    }))

    return {
      id: s.id,
      info: {
        name: (s.params?.customName || s.label || '').toUpperCase(),
        description: s.params?.description || s.params?.value || '',
        conditions: activeConds
      }
    }
  }

  // Build condition lookup
  const conditionLookup = {}
  
  // Add defaults to lookup
  const allDefaults = [
    ...DEFAULT_ENTRY_CONDITIONS,
    ...DEFAULT_ENTRY_SCENARIOS,
    ...DEFAULT_EXIT_CONDITIONS,
    ...DEFAULT_EXIT_SCENARIOS
  ]
  allDefaults.forEach(d => {
    conditionLookup[d.id] = { 
      name: (d.params?.customName || d.label || '').toUpperCase(), 
      description: d.params?.description || '' 
    }
  })

  const processConds = (scenId) => {
    if (!scenId) return
    const conds = getScenarioConditions(scenId)
    conds.forEach(c => {
      conditionLookup[c.id] = { name: (c.name || '').toUpperCase(), description: c.description || '', priority: c.priority || 'NONE' }
      if (c.indicatorUnits) {
        c.indicatorUnits.forEach(u => {
          if (u.type === 'bundle') {
            u.items.forEach(i => {
              conditionLookup[i.id] = { name: (i.label || '').toUpperCase(), description: i.description || '', priority: i.priority || c.priority || 'NONE' }
            })
          } else if (u.type === 'single' && u.item) {
            conditionLookup[u.item.id] = { name: (u.item.label || '').toUpperCase(), description: u.item.description || '', priority: u.item.priority || c.priority || 'NONE' }
          }
        })
      }
    })
  }

  if (activeEntry?.id) processConds(activeEntry.id)
  if (activeExit?.id) processConds(activeExit.id)

  const builtExecutions = []
  if (entryMethodEnabled.value) {
    activeMultipleEntries.value.forEach(e => {
       if (e.price && e.size) {
         builtExecutions.push({
           id: e.id.toString(),
           type: 'entry',
           side: side.value === 'long' ? 'Long' : 'Short',
           price: parseFloat(e.price) || 0,
           size: parseFloat(e.size) || 0,
           date: cloneDate(committedOpenDate),
           label: entryMethodType.value
         })
       }
    })
  } else {
    builtExecutions.push({
         id: Date.now().toString() + 'en',
         type: 'entry',
         side: side.value === 'long' ? 'Long' : 'Short',
         price: parseFloat(entry.value) || 0,
         size: parseFloat(size.value) || 0,
         date: cloneDate(committedOpenDate),
         label: 'SINGLE'
    })
  }

  if (exitMethodEnabled.value) {
    exitEntries.value.forEach(e => {
       if (e.price && e.size) {
         builtExecutions.push({
           id: e.id.toString(),
           type: 'exit',
           side: 'Close',
           price: parseFloat(e.price) || 0,
           size: parseFloat(e.size) || 0,
           date: cloneDate(committedExitDate),
           label: 'EXIT_SCALE'
         })
       }
    })
  } else {
    builtExecutions.push({
         id: Date.now().toString() + 'ex',
         type: 'exit',
         side: 'Close',
         price: parseFloat(exit.value) || 0,
         size: parseFloat(size.value) || 0,
         date: cloneDate(committedExitDate),
         label: 'SINGLE'
    })
  }

  const newTrade = {
    id: Date.now().toString(),
    asset: asset.value || 'UNTITLED',
    side: side.value === 'long' ? 'Long' : 'Short',
    entry: entryMethodEnabled.value ? averageEntry.value : +entry.value,
    exit: exitMethodEnabled.value ? averageExit.value : +exit.value,
    size: totalSize.value,
    executions: builtExecutions,
    stopLoss: +stopLoss.value,
    takeProfit: +takeProfit.value,
    date: cloneDate(committedOpenDate),
    dateExit: cloneDate(committedExitDate),
    profitInCurrency: pnl.value,
    assetType: currentAssetData.value?.type || 'Forex',
    strategyId: selectedStrategyId.value,
    risk: Number.isFinite(activeRiskPerTradeDollars.value) ? activeRiskPerTradeDollars.value : undefined,
    riskReward: plannedRiskReward,
    tradingStyle: activeRiskManagement.value.tradingStyle || undefined,
    riskManagement: activeRiskSnapshot.value || undefined,
    entryFee: +entryFee.value || 0,
    exitFee: +exitFee.value || 0,
    feeType: feeType.value,
    emotions: [...selectedEmotions.value],
    boardScenarioEntry: formatScen(activeEntry, tradeStore.getTradesForStrategy(selectedStrategyId.value), side.value),
    boardScenarioExit: formatScen(activeExit || activeMini, tradeStore.getTradesForStrategy(selectedStrategyId.value), side.value),
    images: journalEntries.value.map(e => ({
      url: e.image,
      name: e.name || getArchiveNodeName(e.id),
      tags: Array.isArray(e.tags) ? e.tags : [],
      createdAt: e.createdAt || new Date().toISOString(),
      context: ''
    })).filter(img => img.url),
    notes: ''
  }

  commitState.value = 'loading'
  
  if (props.initialTrade) {
    const updatedTrade = { ...props.initialTrade, ...newTrade, id: props.initialTrade.id }
    await tradeStore.updateTrade(selectedStrategyId.value, updatedTrade.id, updatedTrade)
    emit('updateTrade', updatedTrade)
  } else {
    await tradeStore.addTrade(selectedStrategyId.value, newTrade)
    emit('addTrade', newTrade)
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  commitState.value = 'success'
  
  setTimeout(() => {
    resetForm()
    commitState.value = 'idle'
  }, 2000)
}


  return {
    themeStore,
    isDark,
    viewMode,
    journalEntries,
    getArchiveNodeName,
    addJournalEntry,
    removeJournalEntry,
    addJournalEntryTag,
    removeJournalEntryTag,
    handleImageUpload,
    triggerUpload,
    showCmeNotice,
    rememberCmeNotice,
    closeCmeNotice,
    showAssetMenu,
    asset,
    assetSearch,
    filteredAssets,
    currentAssetData,
    selectAsset,
    matrixNodes,
    matrixConnections,
    matrixZones,
    isMatrixLoading,
    loadMatrixData,
    tradeStore,
    strategies,
    selectedStrategyId,
    selectedStrategy,
    findAllNodes,
    findAllConnections,
    findNodeById,
    activeRiskManagement,
    activeRiskPerTradeDollars,
    activeRiskSnapshot,
    actualRR,
    actualRiskPercent,
    violatesRR,
    violatesRiskPerTrade,
    riskViolationMessage,
    getReachableNodes,
    getNodeZoneType,
    showStrategyMenu,
    failedIcons,
    handleIconError,
    closeAssetMenu,
    selectedScenarioNode,
    getNodesForStrategy,
    DEFAULT_ENTRY_CONDITIONS,
    DEFAULT_ENTRY_SCENARIOS,
    DEFAULT_EXIT_CONDITIONS,
    DEFAULT_EXIT_SCENARIOS,
    entryConditions,
    entryScenarios,
    exitConditions,
    exitScenarios,
    miniExitScenarios,
    regularExitScenarios,
    filteredRegistryEntryScenarios,
    filteredRegistryExitScenarios,
    currentRegistryScenarioConditions,
    mismatchedNodeIds,
    hasVectorMismatch,
    activeConditions,
    toggleCondition,
    showConditionLibrary,
    showEmotionSelector,
    registrySearchQuery,
    libraryFilter,
    filteredLibraryScenarios,
    flatLibraryConditions,
    selectedRegistryScenarioId,
    hoverTimeout,
    hoveredScenarioId,
    handleMouseEnterScenario,
    handleMouseLeaveScenario,
    handleMouseEnterInsight,
    getActiveConditionsInScenario,
    isScenarioSelected,
    handleMouseLeaveInsight,
    getScenarioConditions,
    getFlattenedScenarioConditions,
    activeSector,
    sectors,
    side,
    entry,
    exit,
    size,
    entryFee,
    exitFee,
    feeType,
    resultMode,
    showEntryMethod,
    activeProtocolTab,
    entryMethodType,
    pyramidingEntries,
    averagingDownEntries,
    activeMultipleEntries,
    entryMethodEnabled,
    hasActiveMethodNode,
    addMultipleEntry,
    exitEntries,
    exitMethodEnabled,
    totalExitSize,
    averageExit,
    addExitEntry,
    removeExitEntry,
    removeMultipleEntry,
    showAutoPrompt,
    autoEntryBasePrice,
    autoEntryBaseLots,
    toggleAutoPrompt,
    confirmAutoGenerate,
    totalSize,
    averageEntry,
    isForex,
    isManualEntryAsset,
    isFixedFeeAsset,
    overridePnl,
    liveRates,
    FALLBACK_RATES,
    fetchLiveRates,
    getRate,
    EMOTION_LIBRARY,
    emotionsByCategory,
    showEmotions,
    selectedEmotions,
    hoveredEmotion,
    mousePos,
    EMOTION_OPPOSITES,
    toggleEmotion,
    isEmotionDisabled,
    stopLoss,
    takeProfit,
    openDate,
    exitDate,
    cloneDate,
    adjustDate,
    formatPart,
    handleManualDate,
    projectedProfit,
    hasValidProjection,
    equityCurveTrades,
    isTemporalOpen,
    activeTemporalTarget,
    _now,
    tempDateParts,
    syncTempParts,
    openTemporal,
    scrollContainer,
    pnl,
    commitState,
    resetForm,
    submit,
    initialTrade: props.initialTrade
  }
}
