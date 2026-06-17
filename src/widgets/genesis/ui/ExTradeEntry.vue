<script setup>
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
const { locale } = useI18n()

const emit = defineEmits(['addTrade', 'updateTrade', 'close'])
const props = defineProps({
  initialTrade: {
    type: Object,
    default: null
  }
})
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
</script>

<template>
  <div ref="scrollContainer" 
       class="flex flex-col items-center h-full w-full overflow-y-auto custom-scrollbar transition-colors duration-500 pb-40 bg-theme-bg nier-text-primary"
        :class="{ dark: isDark }">
     <DesignVignette :is-dark="isDark" />
    <!-- CME Metadata Notice Backdrop -->
    <Transition name="fade">
      <div v-if="currentAssetData?.contractSize && showCmeNotice" 
           class="fixed inset-0 z-[999] bg-black/60 dark:bg-white/10 backdrop-blur-sm"></div>
    </Transition>
    <!-- CME Metadata Notice -->
    <Transition name="protocol-slide">
      <div v-if="currentAssetData?.contractSize && showCmeNotice" 
           class="fixed inset-0 m-auto z-[1000] flex flex-col items-center justify-center gap-6 px-12 py-10 nier-bg-inverted shadow-[0_0_100px_rgba(0,0,0,0.8)] dark:shadow-[0_0_100px_rgba(255,255,255,0.2)] w-fit min-w-[500px] max-w-2xl h-fit max-h-[80vh] overflow-hidden text-center">
        
        <div class="flex flex-col items-center w-full mt-4">
          <div class="flex items-center justify-center gap-4 w-full mb-6">
            <div class="w-3 h-3 nier-bg-panel rotate-45"></div>
            <span class="text-xl md:text-2xl font-mono tracking-[0.3em] uppercase font-black nier-text-primary">
              <span v-if="locale === 'en'">CME_CONTRACT_SPECIFICATIONS</span>
              <span v-if="locale === 'ru'">СПЕЦИФИКАЦИИ_КОНТРАКТОВ_CME</span>
            </span>
            <div class="w-3 h-3 nier-bg-panel rotate-45"></div>
          </div>
          <div class="flex flex-col items-center gap-2 h-20 justify-center">
            <span v-if="locale === 'en'" class="text-xs font-mono tracking-[0.1em] opacity-80 uppercase nier-text-primary leading-loose max-w-[90%] transition-opacity">
              Utilizing official CME contract sizes for Commodities & Indices to calculate Estimated Yield.
            </span>
            <span v-if="locale === 'ru'" class="text-[10px] font-mono tracking-[0.1em] opacity-80 uppercase nier-text-primary leading-loose max-w-[90%] transition-opacity">
              Для расчета ожидаемой прибыли используются официальные размеры контрактов CME для сырья и индексов.
            </span>
            <div class="mt-2 flex flex-col items-center opacity-60 text-[10px] font-mono tracking-[0.1em] uppercase nier-text-primary">
              <span v-if="locale === 'en'">(e.g. {{ asset }}: 1 contract = {{ currentAssetData?.contractSize }})</span>
              <span v-if="locale === 'ru'">(например: 1 контракт = {{ currentAssetData?.contractSize }})</span>
            </div>
          </div>
        </div>
        
        <div class="w-full h-px bg-white/20 dark:bg-black/20 my-4"></div>
        
        <div class="flex flex-col sm:flex-row items-center justify-between w-full px-4 gap-8">
          <label class="flex items-center gap-3 cursor-pointer group">
            <div class="relative w-5 h-5 border border-white/50 dark:border-black/50 group-hover:border-white dark:group-hover:border-black transition-colors flex items-center justify-center">
              <input type="checkbox" v-model="rememberCmeNotice" class="absolute opacity-0 cursor-pointer w-full h-full" />
              <div v-if="rememberCmeNotice" class="w-3 h-3 nier-bg-panel"></div>
            </div>
            <span class="flex flex-col text-[10px] font-mono tracking-[0.15em] text-white/60 dark:text-black/60 group-hover:text-white dark:group-hover:text-black transition-colors uppercase text-left">
              <span v-if="locale === 'en'">Remember & Don't Show Again</span>
              <span v-if="locale === 'ru'">Больше не показывать</span>
            </span>
          </label>
          
          <button @click="closeCmeNotice" 
                  class="px-8 py-3 border border-white dark:border-black nier-text-primary font-mono text-sm tracking-[0.2em] hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white transition-colors uppercase font-bold relative group/btn overflow-hidden w-48 h-12">
            <span class="absolute inset-0 flex items-center justify-center z-10 transition-colors group-hover/btn:text-black dark:group-hover/btn:text-white">
              <span v-if="locale === 'en'">Acknowledge</span>
              <span v-if="locale === 'ru'" class="text-[10px] opacity-90 mt-0.5 tracking-[0.3em]">ПОДТВЕРДИТЬ</span>
            </span>
            <div class="absolute inset-0 nier-bg-panel translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
          </button>
        </div>
      </div>
    </Transition>
    <!-- TOP SECTION: STRATEGIC PANEL (REORDERED TO CORNERS) -->
    <div class="w-full flex justify-between items-start px-12 py-10 shrink-0">
      <!-- LEFT CORNER: PROTOCOL SELECT -->
      <SystemProtocolSelect
        v-model="selectedStrategyId"
        :strategies="strategies"
        :is-loading="isMatrixLoading"
        menu-position="bottom"
      />

      <!-- RIGHT CORNER: TACTICAL DATA SNAPSHOT -->
      <div class="flex items-center gap-6 relative z-[10010]">
        <div class="flex items-center px-8 py-4 bg-black/[0.02] dark:bg-white/[0.02] border nier-border-primary backdrop-blur-md gap-10 relative">
           <!-- Corner Decor -->
           <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-black/30 dark:border-white/30"></div>
           <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-black/30 dark:border-white/30"></div>

           <!-- Price Group -->
           <div class="flex gap-8">
              <div class="flex flex-col">
                 <span class="text-[7px] font-mono opacity-40 uppercase tracking-[0.3em]">Entry_Point</span>
                 <span class="text-[12px] font-mono font-bold nier-text-primary tabular-nums">{{ (+entry || 0).toFixed(2) }}</span>
              </div>
              <div class="flex flex-col">
                 <span class="text-[7px] font-mono opacity-40 uppercase tracking-[0.3em]">Exit_Target</span>
                 <span class="text-[12px] font-mono font-bold nier-text-primary tabular-nums">{{ (+exit || 0).toFixed(2) }}</span>
              </div>
           </div>

           <div class="w-px h-8 bg-black/10 dark:bg-white/10"></div>

           <!-- Risk Group -->
           <div class="flex gap-8">
              <div class="flex flex-col">
                 <span class="text-[7px] font-mono opacity-40 uppercase tracking-[0.3em] text-rose-500/60 font-black">Stop_Loss</span>
                 <span class="text-[12px] font-mono font-bold text-rose-500/80 tabular-nums">{{ (+stopLoss || 0).toFixed(2) }}</span>
              </div>
              <div class="flex flex-col">
                 <span class="text-[7px] font-mono opacity-40 uppercase tracking-[0.3em] text-emerald-500/60 font-black">Take_Profit</span>
                 <span class="text-[12px] font-mono font-bold text-emerald-500/80 tabular-nums">{{ (+takeProfit || 0).toFixed(2) }}</span>
              </div>
           </div>

           <div class="w-px h-8 bg-black/10 dark:bg-white/10"></div>

           <!-- Protocol Risk Group -->
           <ExTooltip
             :force-show="!!riskViolationMessage"
             :is-dark="isDark"
             variant="basic"
             placement="bottom"
             :title="riskViolationMessage || ''"
           >
             <template #trigger>
               <div class="flex gap-8 cursor-default" :class="riskViolationMessage ? 'ring-1 ring-rose-500/30 px-2 -mx-2 py-1 -my-1 rounded-sm' : ''">
                 <div class="flex flex-col">
                    <span class="text-[7px] font-mono uppercase tracking-[0.3em] font-bold" :class="riskViolationMessage ? 'text-rose-400/80' : 'opacity-40'">Panel_Risk</span>
                    <span class="text-[12px] font-mono font-bold nier-text-primary tabular-nums">
                       {{ activeRiskManagement.riskPerTradeValue ?? '--' }}{{ activeRiskManagement.riskPerTradeUnit }} / {{ activeRiskManagement.riskRewardRatio ? `1:${activeRiskManagement.riskRewardRatio}` : 'RR_--' }}
                    </span>
                 </div>
                 <div class="flex flex-col">
                    <span class="text-[7px] font-mono opacity-40 uppercase tracking-[0.3em] font-bold">Trade_Style</span>
                    <span class="text-[12px] font-mono font-bold nier-text-primary truncate max-w-[100px]">
                       {{ activeRiskManagement.tradingStyle || 'UNLINKED' }}
                    </span>
                 </div>
               </div>
             </template>
             <div class="flex flex-col gap-2">
               <div v-if="actualRR !== null" class="flex items-center justify-between gap-6">
                 <span class="opacity-50 text-[11px]">Your Risk Reward:</span>
                 <span class="font-black text-[11px]" :class="violatesRR ? 'text-rose-400' : 'text-emerald-400'">1 / {{ actualRR.toFixed(2) }}</span>
               </div>
               <div v-if="actualRiskPercent !== null" class="flex items-center justify-between gap-6">
                 <span class="opacity-50 text-[11px]">Your Risk Per Trade:</span>
                 <span class="font-black text-[11px]" :class="violatesRiskPerTrade ? 'text-rose-400' : 'text-emerald-400'">{{ actualRiskPercent.toFixed(2) }}%</span>
               </div>
               <div class="h-px bg-white/10 my-1"></div>
               <div v-if="activeRiskManagement.riskRewardRatio" class="flex items-center justify-between gap-6">
                 <span class="opacity-40 text-[10px]">Required R:R:</span>
                 <span class="opacity-70 text-[10px]">1 / {{ activeRiskManagement.riskRewardRatio }}</span>
               </div>
               <div v-if="activeRiskManagement.riskPerTradeValue" class="flex items-center justify-between gap-6">
                 <span class="opacity-40 text-[10px]">Max Risk Per Trade:</span>
                 <span class="opacity-70 text-[10px]">{{ activeRiskManagement.riskPerTradeValue }}{{ activeRiskManagement.riskPerTradeUnit }}</span>
               </div>
             </div>
           </ExTooltip>
        </div>

        <button @click="emit('close')" :disabled="commitState === 'loading'" class="group relative h-14 w-14 bg-transparent border border-black/20 dark:border-white/20 hover:bg-black dark:hover:bg-white transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed">
           <div class="relative w-full h-full flex items-center justify-center">
              <div class="w-4 h-4 relative">
                 <div class="absolute inset-0 m-auto w-full h-px nier-bg-inverted rotate-45 group-hover:bg-white dark:group-hover:bg-black transition-colors duration-500"></div>
                 <div class="absolute inset-0 m-auto w-full h-px nier-bg-inverted -rotate-45 group-hover:bg-white dark:group-hover:bg-black transition-colors duration-500"></div>
              </div>
           </div>
        </button>
      </div>
    </div>

    <!-- MIDDLE SECTION: TACTICAL MENUS OR JOURNAL -->
    <div class="w-full flex justify-center">
      <div class="max-w-6xl w-full px-6 pb-12 py-8">
        <Transition name="sector-swap" mode="out-in">
          <div v-if="viewMode === 'tactical'" key="tactical" class="flex flex-col space-y-12">
            <!-- CONDITION CONFIGURATION PANEL (LEGACY DESCRIPTION AESTHETIC) -->
            <div v-if="selectedRegistryScenarioId" class="flex flex-col space-y-12 animate-in fade-in zoom-in-95 duration-1000 max-w-5xl mx-auto">
               
               <!-- Protocol Briefing Header -->
               <div class="flex flex-col space-y-6 border-b border-black/5 dark:border-white/5 pb-10">
                  <div class="flex items-center gap-4">
                     <div class="w-2 h-2 nier-bg-inverted rotate-45"></div>
                     <span class="text-[9px] font-mono tracking-[0.6em] text-black/80 dark:text-white/80 uppercase">Archival_Briefing_Protocol</span>
                  </div>
                  
                  <div class="flex items-start justify-between">
                      <div class="flex flex-col space-y-4 max-w-2xl relative">
                        <!-- CINEMATIC ACCENT -->
                        <div class="absolute -left-10 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-black/20 dark:via-white/20 to-transparent"></div>
                        
                        <h1 class="text-3xl font-light font-serif tracking-[0.4em] drop-shadow-sm leading-relaxed">
                          {{ (entryScenarios.find(s => s.id === selectedRegistryScenarioId) || regularExitScenarios.find(s => s.id === selectedRegistryScenarioId))?.params?.customName || 'UNKNOWN_PROTOCOL' }}
                      </h1>
                        <p class="text-[11px] font-mono leading-relaxed opacity-60 uppercase tracking-[0.2em] max-w-xl">
                           {{ (entryScenarios.find(s => s.id === selectedRegistryScenarioId) || regularExitScenarios.find(s => s.id === selectedRegistryScenarioId))?.params?.description || 'No specialized mission description available for this protocol branch.' }}
                        </p>
                     </div>

                     <div class="flex flex-col items-end gap-6">
                        <div class="flex flex-col items-end">
                           <span class="text-[7px] font-mono opacity-20 uppercase tracking-widest">Protocol_Hash</span>
                           <span class="text-[9px] font-mono text-black/70 dark:text-white/80 uppercase tracking-tighter">0x{{ selectedRegistryScenarioId.slice(0, 8).toUpperCase() }}</span>
                        </div>
                        <button @click="showConditionLibrary = true; selectedRegistryScenarioId = null" 
                                class="group/save relative h-14 px-12 nier-bg-inverted dark:text-black  font-black border hover:border-black dark:hover:border-white dark:hover:bg-black hover:bg-white text-white dark:hover:text-white hover:text-black transition-all duration-500 ease-in-out">
                           <span class="relative z-10 text-[11px] uppercase tracking-[0.8em]">Accept </span>
                        </button>
                     </div>
                  </div>
               </div>

               <!-- Conditions Matrix (Hierarchical Tree) -->
               <div class="flex flex-col space-y-12">
                  <div class="flex items-center justify-between">
                     <span class="text-[10px] font-mono tracking-[0.4em] text-black/80 dark:text-white/75 uppercase">Tactical_Requirements_Chain</span>
                     <span class="text-[10px] font-mono text-black/80 dark:text-white/80 uppercase tracking-widest">{{ currentRegistryScenarioConditions.length }}_Root_Nodes</span>
                  </div>

                  <div v-if="currentRegistryScenarioConditions.length > 0" class="flex flex-col space-y-10">
                    <!-- Root Level: Conditions -->
                    <div v-for="cond in currentRegistryScenarioConditions" :key="cond.id"
                         class="flex flex-col space-y-4 group/cond">
                       
                       <!-- Condition Header (Non-clickable structural guide) -->
                       <div class="relative flex items-center justify-between p-4 border transition-all duration-500 overflow-hidden"
                            :class="[
                              'border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01]',
                              mismatchedNodeIds.has(cond.id) ? '!border-red-500/30 !bg-red-500/5' : ''
                            ]">
                          
                          <div class="flex items-center gap-4 relative z-10">
                             <div class="flex flex-col items-center">
                                <div class="w-1.5 h-1.5 rotate-45 transition-colors duration-500"
                                     :class="mismatchedNodeIds.has(cond.id) ? 'bg-red-500' : 'bg-black/20 dark:bg-white/20'"></div>
                                <div class="w-px h-8 bg-black/5 dark:bg-white/5 mt-2"></div>
                             </div>
                             
                             <div class="flex flex-col">
                                <div class="flex items-center gap-3">
                                   <span class="text-xl font-serif italic tracking-[0.1em] uppercase transition-colors"
                                         :class="mismatchedNodeIds.has(cond.id) ? 'text-red-500' : 'text-black/80 dark:text-white/80'">
                                      {{ cond.name }}
                                   </span>
                                   <div v-if="cond.direction" 
                                        class="px-1.5 py-0.5 border text-[6px] font-mono tracking-widest uppercase transition-colors"
                                        :class="mismatchedNodeIds.has(cond.id) ? 'border-red-500/50 text-red-500' : 'nier-border-primary text-black/80 dark:text-white/80'">
                                      {{ cond.direction }}
                                   </div>
                                   <div v-if="cond.priority && cond.priority !== 'NONE'" 
                                        class="px-1.5 py-0.5 border text-[6px] font-mono tracking-widest uppercase transition-colors"
                                        :class="cond.priority === 'REQUIRED' ? 'border-red-500/50 text-red-500' : 'border-blue-500/50 text-blue-500'">
                                      {{ cond.priority }}
                                   </div>
                                </div>
                                <p class="text-[10px] font-mono uppercase tracking-widest opacity-40 max-w-xl transition-colors"
                                   :class="mismatchedNodeIds.has(cond.id) ? '!text-red-500/40' : ''">
                                   {{ mismatchedNodeIds.has(cond.id) ? '[ PROTOCOL_INCOMPATIBLE: DIRECTIONAL_VECTOR_MISMATCH ]' : (cond.description || 'Tactical requirement group.') }}
                                </p>
                             </div>
                          </div>

                          <div class="flex items-center gap-4 relative z-10 opacity-20">
                             <span class="text-[8px] font-mono font-black uppercase tracking-widest transition-colors"
                                   :class="mismatchedNodeIds.has(cond.id) ? 'text-red-500' : 'text-black/20 dark:text-white/75'">
                                {{ mismatchedNodeIds.has(cond.id) ? 'LOCKED' : 'CLUSTER_ROOT' }}
                             </span>
                          </div>
                       </div>

                          <!-- SELECTION GLOW -->
                          <div v-if="activeConditions.has(cond.id)" class="absolute inset-0 bg-black/[0.02] animate-pulse"></div>


                       <!-- Second Level: Logic Clusters & Indicators -->
                       <div v-if="cond.indicatorUnits && cond.indicatorUnits.length > 0" class="pl-12 flex flex-col space-y-3 border-l border-black/5 dark:border-white/5 ml-5">
                          <div v-for="(unit, uIdx) in cond.indicatorUnits" :key="uIdx" class="flex flex-col space-y-2">
                             
                             <!-- Logic Bundle Header -->
                             <template v-if="unit.type === 'bundle'">
                                <div class="flex items-center gap-2">
                                   <div class="w-1.5 h-[1px] bg-black/20 dark:bg-white/20"></div>
                                   <span class="text-[7px] font-mono tracking-[0.3em] text-black/80 dark:text-white/75 uppercase">{{ unit.logic }}_CLUSTER</span>
                                </div>
                                
                                <!-- Third Level: Nested Indicators -->
                                <div class="pl-6 grid grid-cols-2 gap-3">
                                   <div v-for="item in unit.items" :key="item.id"
                                        @click="toggleCondition(item.id, selectedRegistryScenarioId)"
                                        class="flex items-start gap-3 p-3 border transition-all cursor-pointer group/item overflow-hidden relative"
                                        :class="[
                                          activeConditions.has(item.id) ? 'nier-bg-inverted border-black dark:border-white' : 'bg-black/[0.01] dark:bg-white/[0.01] border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10',
                                          mismatchedNodeIds.has(item.id) ? '!border-red-500/20 !bg-red-500/5 !pointer-events-none' : ''
                                        ]">
                                      <div class="w-1 h-1 border rotate-45 mt-1.5 transition-colors"
                                           :class="[
                                             activeConditions.has(item.id) ? 'nier-bg-panel border-white dark:border-black' : 'border-black/20 dark:border-white/20 group-hover/item:bg-black/40 dark:group-hover/item:bg-white/40',
                                             mismatchedNodeIds.has(item.id) ? '!bg-red-500 !border-red-500' : ''
                                           ]"></div>
                                      <div class="flex flex-col relative z-10">
                                         <div class="flex items-center gap-2">
                                            <span class="text-[9px] font-mono font-bold tracking-widest uppercase transition-colors"
                                                  :class="[
                                                    activeConditions.has(item.id) ? 'nier-text-primary' : 'text-black/80 dark:text-white/90 group-hover/item:text-black dark:group-hover/item:text-white',
                                                    mismatchedNodeIds.has(item.id) ? '!text-red-500' : ''
                                                  ]">{{ item.label }}</span>
                                            <span v-if="item.priority && item.priority !== 'NONE'" 
                                                  class="px-1 py-0.5 text-[6px] font-mono tracking-widest uppercase border"
                                                  :class="item.priority === 'REQUIRED' ? 'border-red-500/50 text-red-500' : 'border-blue-500/50 text-blue-500'">
                                              {{ item.priority }}
                                            </span>
                                         </div>
                                         <span class="text-[9px] font-mono uppercase tracking-tighter truncate transition-colors"
                                               :class="activeConditions.has(item.id) ? 'text-white/40 dark:text-black/40' : 'text-black/60 dark:text-white/75'">{{ item.description || 'No telemetry.' }}</span>
                                      </div>
                                      <div v-if="activeConditions.has(item.id)" class="absolute inset-0 bg-black/[0.02] animate-pulse"></div>
                                   </div>
                                </div>
                             </template>

                             <!-- Isolated Indicator -->
                             <template v-else>
                                <div @click="toggleCondition(unit.item.id, selectedRegistryScenarioId)"
                                     class="flex items-start gap-3 p-3 border transition-all cursor-pointer group/item w-1/2 overflow-hidden relative"
                                     :class="[
                                       activeConditions.has(unit.item.id) ? 'nier-bg-inverted border-black dark:border-white' : 'bg-black/[0.01] dark:bg-white/[0.01] border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10',
                                       mismatchedNodeIds.has(unit.item.id) ? '!border-red-500/20 !bg-red-500/5 !pointer-events-none' : ''
                                     ]">
                                   <div class="w-1 h-1 border rotate-45 mt-1.5 transition-colors"
                                        :class="[
                                          activeConditions.has(unit.item.id) ? 'nier-bg-panel border-white dark:border-black' : 'border-black/20 dark:border-white/20 group-hover/item:bg-black/40 dark:group-hover/item:bg-white/40',
                                          mismatchedNodeIds.has(unit.item.id) ? '!bg-red-500 !border-red-500' : ''
                                        ]"></div>
                                   <div class="flex flex-col flex-1 min-w-0 relative z-10">
                                      <div class="flex items-center justify-between w-full">
                                         <div class="flex items-center gap-2">
                                            <span class="text-[9px] font-mono font-black tracking-widest uppercase transition-colors"
                                                  :class="[
                                                    activeConditions.has(unit.item.id) ? 'nier-text-primary' : 'text-black/80 dark:text-white/90 group-hover/item:text-black dark:group-hover/item:text-white',
                                                    mismatchedNodeIds.has(unit.item.id) ? '!text-red-500' : ''
                                                  ]">{{ unit.item.label }}</span>
                                            <span v-if="unit.item.priority && unit.item.priority !== 'NONE'" 
                                                  class="px-1 py-0.5 text-[6px] font-mono tracking-widest uppercase border"
                                                  :class="unit.item.priority === 'REQUIRED' ? 'border-red-500/50 text-red-500' : 'border-blue-500/50 text-blue-500'">
                                              {{ unit.item.priority }}
                                            </span>
                                         </div>
                                         <span v-if="unit.item.direction" class="text-[6px] font-mono uppercase tracking-widest transition-colors"
                                               :class="activeConditions.has(unit.item.id) ? 'text-white/40 dark:text-black/40' : 'text-amber-500/30'">{{ unit.item.direction }}</span>
                                      </div>
                                      <span class="text-[9px] font-mono uppercase tracking-tighter truncate mt-0.5 transition-colors"
                                            :class="activeConditions.has(unit.item.id) ? 'text-white/40 dark:text-black/40' : 'text-black/60 dark:text-white/75'">{{ unit.item.description || 'Primary indicator.' }}</span>
                                   </div>
                                   <div v-if="activeConditions.has(unit.item.id)" class="absolute inset-0 bg-black/[0.02] animate-pulse"></div>
                                </div>
                             </template>

                          </div>
                       </div>
                    </div>
                  </div>
                  <div v-else class="flex flex-col items-center justify-center py-24 border border-dashed border-white/5 opacity-20">
                     <span class="text-[10px] font-mono tracking-[0.4em] uppercase">No_Checkpoints_Detected</span>
                  </div>
               </div>

               <!-- Footer Metadata -->
               <div class="flex items-center justify-between pt-10 border-t border-white/5 opacity-20">
                  <span class="text-[7px] font-mono tracking-widest uppercase">System_State: {{ viewMode.toUpperCase() }}</span>
                  <div class="flex gap-4">
                     <span class="text-[7px] font-mono tracking-widest uppercase">Encryption: AES_256</span>
                     <span class="text-[7px] font-mono tracking-widest uppercase">Lattice: v1.0.42</span>
                     <!-- DEBUG UI -->
                     <span class="text-[7px] font-mono tracking-widest uppercase text-red-400">DEBUG_STRAT: {{ selectedStrategyId }} | HIST: {{ equityCurveTrades.length }}</span>
                  </div>
               </div>
            </div>

             <!-- TACTICAL EQUITY PROJECTION (Replaced Void) -->
             <div v-else class="relative w-full h-[500px] flex flex-col items-center justify-center border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] group z-10">
                <Transition name="sector-swap" mode="out-in">
                  <div v-if="hasValidProjection" key="curve" class="absolute inset-0 w-full h-full">
                     <ExEquityCurve2D :trades="equityCurveTrades" :initial-balance="1000" />
                  </div>
                  <div v-else key="empty" class="flex flex-col items-center justify-center py-20 opacity-20">
                     <div class="w-16 h-px nier-bg-inverted mb-8 group-hover:w-24 transition-all duration-700"></div>
                     <span class="text-[9px] font-mono tracking-[0.6em] uppercase nier-text-primary">NOT_ENOUGH_DATA_FOR_PROJECTION</span>
                     <div class="mt-8 flex gap-2">
                        <div v-for="i in 3" :key="i" class="w-1 h-1 bg-black/20 dark:bg-white/20 rotate-45"></div>
                     </div>
                  </div>
                </Transition>
             </div>
          </div>

          <div v-else key="journal" class="flex flex-col space-y-8">
            <div class="flex items-center justify-between w-full border-b border-black/5 dark:border-white/5 pb-6">
              <div class="flex items-center space-x-4">
                <div class="w-1.5 h-1.5 nier-bg-inverted rotate-45"></div>
                <span class="text-[9px] font-mono tracking-[0.4em] uppercase font-black nier-text-primary">EVIDENCE_ARCHIVE</span>
              </div>
              <button @click="addJournalEntry" class="flex items-center space-x-3 group px-4 py-1.5 border nier-border-primary hover:bg-black dark:hover:bg-white transition-all">
                 <span class="text-[8px] font-mono tracking-widest uppercase font-black text-black/40 dark:text-white/80 group-hover:text-white dark:group-hover:text-black">New_Archive_Slot</span>
                 <div class="w-1.5 h-1.5 bg-black/20 dark:bg-white/20 rotate-45 group-hover:bg-white dark:group-hover:bg-black"></div>
              </button>
            </div>

            <div v-if="journalEntries.length === 0" class="flex flex-col items-center justify-center py-32 border border-dashed nier-border-primary opacity-30">
              <div class="w-12 h-px nier-bg-inverted mb-6 animate-pulse"></div>
              <span class="text-[9px] font-mono tracking-[0.6em] uppercase nier-text-primary">No_Evidences_In_The_Archive</span>
              <div class="mt-6 flex gap-2">
                <div v-for="i in 3" :key="i" class="w-1 h-1 bg-black/20 dark:bg-white/20 rotate-45"></div>
              </div>
            </div>

            <div v-else class="grid grid-cols-2 gap-8">
                 <ExPanel v-for="entry in journalEntries" :key="entry.id" variant="light" :no-padding="true" :show-corners="true" :no-shadow="true"
                       class="group flex flex-col transition-all duration-500 hover:!border-black/30 dark:hover:!border-white/30 !border-black/10 dark:!border-white/10 nier-text-primary">
                    
                    <!-- Remove Button -->
                    <button @click.stop="removeJournalEntry(entry.id)" 
                            class="absolute top-0 right-0 z-30 w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-500/80 hover:text-white nier-text-primary border-l border-b nier-border-primary">
                       <span class="text-[10px] font-mono">✕</span>
                    </button>
 
                    <!-- Image Upload Area -->
                    <div @click="triggerUpload(entry.id)" 
                         class="relative aspect-video cursor-pointer overflow-hidden border-b nier-border-primary bg-black/5 dark:bg-white/5 group/img">
                       <input :id="`file-input-${entry.id}`" type="file" class="hidden" accept="image/*" @change="e => handleImageUpload(entry.id, e)" />
                       
                       <div v-if="entry.image" class="w-full h-full">
                          <img :src="entry.image" class="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" />
                          <div class="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                             <span class="text-[8px] font-mono tracking-widest uppercase text-white font-black bg-black/60 px-4 py-2">Replace_Stream</span>
                          </div>
                       </div>
                       <div v-else class="w-full h-full flex flex-col items-center justify-center space-y-4">
                          <div class="w-8 h-8 border border-black/20 dark:border-white/20 rotate-45 flex items-center justify-center group-hover/img:border-black dark:group-hover/img:border-white transition-colors">
                             <div class="w-1.5 h-1.5 bg-black/40 dark:bg-white/40 rotate-45"></div>
                          </div>
                          <span class="text-[8px] font-mono tracking-[0.4em] uppercase opacity-30 group-hover/img:opacity-100 nier-text-primary">Upload_Tactical_Capture</span>
                       </div>
 
                       <!-- SCANNING LINE -->
                       <div class="absolute inset-0 pointer-events-none opacity-[0.05] overflow-hidden">
                          <div class="w-full h-px nier-bg-inverted animate-scan"></div>
                       </div>
                    </div>
 
                    <!-- Controls & Info -->
                    <div class="p-6 flex flex-col space-y-4 nier-text-primary">
                       <!-- Visual metadata aligned with Trade Analytics Visuals -->
                       <div class="relative">
                          <input v-model="entry.name"
                                 type="text"
                                 placeholder="Archive_Node_Name..."
                                 class="w-full bg-transparent border border-black/5 dark:border-white/5 px-4 py-3 text-[10px] font-mono tracking-[0.2em] font-black focus:outline-none transition-all nier-text-primary uppercase placeholder:opacity-20 focus:border-black/20 dark:focus:border-white/20" />
                       </div>

                       <div class="flex flex-col gap-3">
                          <div class="flex flex-wrap gap-2 min-h-7">
                             <span v-for="tag in entry.tags" :key="tag"
                                   class="flex items-center gap-2 border nier-border-primary px-2 py-1 text-[8px] font-mono uppercase tracking-widest text-black/60 dark:text-white/70">
                                {{ tag }}
                                <button @click="removeJournalEntryTag(entry, tag)"
                                        class="text-[9px] leading-none opacity-40 hover:opacity-100 hover:text-red-500 transition-all">
                                   x
                                </button>
                             </span>
                             <span v-if="!entry.tags?.length" class="text-[8px] font-mono uppercase tracking-[0.3em] opacity-20 self-center nier-text-primary">
                                No_Tags_Attached
                             </span>
                          </div>

                          <div class="flex items-center gap-2">
                             <input v-model="entry.tagInput"
                                    @keyup.enter="addJournalEntryTag(entry)"
                                    type="text"
                                    placeholder="Custom_Tag..."
                                    class="flex-1 bg-transparent border border-black/5 dark:border-white/5 px-3 py-2 text-[9px] font-mono uppercase tracking-widest focus:outline-none transition-all nier-text-primary placeholder:opacity-20 focus:border-black/20 dark:focus:border-white/20" />
                             <button @click="addJournalEntryTag(entry)"
                                     class="px-3 py-2 border nier-border-primary text-[8px] font-mono uppercase tracking-widest opacity-50 hover:opacity-100 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all">
                                Add_Tag
                             </button>
                          </div>
                       </div>
 
                       <!-- Footer Metadata -->
                       <div class="flex items-center justify-between opacity-20 nier-text-primary">
                          <span class="text-[6px] font-mono uppercase tracking-widest">Archive_ID: {{ entry.id.toString(16).toUpperCase().slice(-6) }}</span>
                          <button @click="removeJournalEntry(entry.id)" class="hover:text-red-500 transition-colors">
                             <span class="text-[6px] font-mono uppercase tracking-widest">[ DE-SYNC ]</span>
                          </button>
                       </div>
                    </div>
                  </ExPanel>
              </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- LEFT SIDE PHANTOM CLUSTER (Stealth Mode) -->
    <Teleport to="body">
      <Transition name="nier-fade">
        <div v-if="!showConditionLibrary && !showEmotionSelector && !showEntryMethod" 
             class="fixed left-10 top-1/2 -translate-y-1/2 flex flex-col gap-10 z-[9999]">
        <!-- UNIFIED MATRIX TOGGLE -->
        <button @click="showConditionLibrary = !showConditionLibrary" 
                :disabled="commitState === 'loading'"
                class="group relative opacity-35 hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-300 disabled:cursor-not-allowed">
           <div class="relative flex items-center justify-center w-12 h-12">
              <div class="absolute inset-0 border border-black/20 dark:border-white/20 rotate-45 group-hover:bg-black dark:group-hover:bg-white group-hover:border-black dark:group-hover:border-white transition-all duration-500 shadow-xl"
                   :class="{ 'nier-bg-inverted border-black dark:border-white': showConditionLibrary }"></div>
              <div class="w-3 h-3 flex items-center justify-center relative z-10 transition-all duration-700 group-hover:text-white dark:group-hover:text-black"
                   :class="showConditionLibrary ? 'nier-text-primary' : 'nier-text-primary'">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                   <rect x="3" y="3" width="7" height="7" />
                   <rect x="14" y="3" width="7" height="7" />
                   <rect x="14" y="14" width="7" height="7" />
                   <rect x="3" y="14" width="7" height="7" />
                 </svg>
              </div>
              <div class="absolute left-full ml-8 opacity-0 group-hover:opacity-100 transition-all duration-500 -translate-x-4 group-hover:translate-x-0 whitespace-nowrap pointer-events-none">
                 <div class="flex flex-col items-start">
                    <span class="text-[8px] font-mono tracking-[0.5em] uppercase font-black nier-text-primary">GENESIS_MATRIX_PROTOCOL</span>
                    <div class="h-px w-0 group-hover:w-full nier-bg-inverted transition-all duration-500 mt-1 opacity-40"></div>
                 </div>
              </div>
           </div>
        </button>

        <!-- ENTRY METHOD BUTTON -->
        <button @click="showEntryMethod = true" 
                :disabled="commitState === 'loading'"
                class="group relative disabled:opacity-50 disabled:cursor-not-allowed">
           <div class="relative flex items-center justify-center w-12 h-12">
              <div class="absolute inset-0 border border-black/20 dark:border-white/20 rotate-45 group-hover:bg-black dark:group-hover:bg-white transition-all duration-500 shadow-xl"
                   :class="{ 'nier-bg-inverted': showEntryMethod }"></div>
              <div class="w-2 h-2 nier-bg-inverted relative z-10 transition-colors duration-500 group-hover:bg-white dark:group-hover:bg-black"
                   :class="{ 'nier-bg-panel': showEntryMethod }"></div>
              
              <div class="absolute left-full ml-8 opacity-0 group-hover:opacity-100 transition-all duration-500 -translate-x-4 group-hover:translate-x-0 whitespace-nowrap pointer-events-none">
                 <div class="flex flex-col items-start">
                    <span class="text-[8px] font-mono tracking-[0.5em] uppercase font-black nier-text-primary">{{ locale === 'ru' ? 'МЕТОД ВХОДА' : 'ENTRY_METHOD' }}</span>
                    <div class="h-px w-0 group-hover:w-full nier-bg-inverted transition-all duration-500 mt-1 opacity-40"></div>
                 </div>
              </div>
           </div>
        </button>

      </div>
      </Transition>
    </Teleport>

    <!-- RIGHT SIDE TOGGLE (JOURNAL) -->
    <Teleport to="body">
      <Transition name="nier-fade">
        <div v-if="!showConditionLibrary && !showEmotionSelector && !showEntryMethod" 
             class="fixed right-10 top-1/2 -translate-y-1/2 flex flex-col gap-10 z-[9999]">
          <!-- JOURNAL TOGGLE -->
          <button @click="viewMode = viewMode === 'tactical' ? 'journal' : 'tactical'" 
                  :disabled="commitState === 'loading'"
                  class="group relative disabled:opacity-50 disabled:cursor-not-allowed">
             <div class="relative flex items-center justify-center w-12 h-12">
                <div class="absolute inset-0 border border-black/20 dark:border-white/20 rotate-45 group-hover:bg-black dark:group-hover:bg-white group-hover:border-black dark:border-white transition-all duration-500 shadow-xl"
                     :class="{ 'nier-bg-inverted border-black dark:border-white': viewMode === 'journal' }"></div>
                <div class="w-2.5 h-2.5 border-t-2 border-r-2 relative z-10 transition-all duration-700 dark:group-hover:border-black" 
                     :class="[
                       viewMode === 'tactical' ? 'rotate-45 border-black dark:border-white' : '-rotate-[135deg] border-white dark:border-black',
                       { 'border-white dark:border-black': viewMode === 'journal' }
                     ]"></div>
                <div class="absolute right-full mr-8 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0 whitespace-nowrap pointer-events-none">
                   <div class="flex flex-col items-end">
                      <span class="text-[8px] font-mono tracking-[0.5em] uppercase font-black nier-text-primary">
                         {{ viewMode === 'tactical' ? 'INIT_JOURNAL' : 'EXIT_JOURNAL' }}
                      </span>
                      <div class="h-px w-0 group-hover:w-full nier-bg-inverted transition-all duration-500 mt-1 opacity-40"></div>
                   </div>
                </div>
             </div>
          </button>
        </div>
      </Transition>
    </Teleport>

    <!-- EMOTION MATRIX WIDGET -->
    <Teleport to="body">
      <Transition name="nier-fade">
        <div v-if="showEmotionSelector" 
             class="fixed inset-0 z-[10000] flex items-center justify-center p-20 bg-black/40 dark:bg-black/80">
          <div class="relative w-full max-w-5xl bg-black border border-white/40 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden">
            
            <!-- SCANNING OVERLAY -->
            <div class="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
               <div class="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-transparent h-2 w-full animate-scan"></div>
            </div>

            <div class="flex items-center justify-between px-10 py-6 border-b border-white/10">
              <div class="flex items-center gap-4">
                <div class="w-2 h-2 bg-white rotate-45"></div>
                <span class="text-xs uppercase tracking-[0.8em] font-black text-white">Emotion_Matrix_Protocol</span>
              </div>
            </div>

            <div class="p-12 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div class="grid grid-cols-3 gap-12">
                <div v-for="(emotions, category) in emotionsByCategory" :key="category" class="flex flex-col space-y-8">
                  <div class="flex items-center gap-4">
                    <div class="h-[1px] flex-1 bg-white/10"></div>
                    <span class="text-[9px] font-mono tracking-[0.5em] text-white/40 uppercase">{{ category }}</span>
                  </div>
                  
                  <div class="flex flex-col space-y-3">
                    <button v-for="emotion in emotions" :key="emotion.label"
                            @click="toggleEmotion(emotion.label)"
                            :disabled="isEmotionDisabled(emotion.label)"
                            class="flex flex-col p-6 border transition-all text-left group"
                            :class="[
                              selectedEmotions.includes(emotion.label) 
                                ? 'bg-white border-white' 
                                : 'bg-transparent border-white/10 hover:border-white/30',
                              isEmotionDisabled(emotion.label) ? 'opacity-20 cursor-not-allowed grayscale' : ''
                            ]">
                      <span class="text-[13px] font-mono font-black tracking-widest uppercase transition-colors"
                            :class="selectedEmotions.includes(emotion.label) ? 'text-black' : 'text-white/80 group-hover:text-white'">
                        {{ emotion.label }}
                      </span>
                      <span class="text-[10px] font-mono uppercase mt-2 leading-relaxed"
                            :class="selectedEmotions.includes(emotion.label) ? 'text-black/80' : 'text-white/80'">
                        {{ emotion.description }}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer & Accept Button (Standard Flex Horizon) -->
            <div class="px-10 py-8 border-t border-white/5 flex items-center justify-between gap-12 bg-white/[0.02]">
              <div class="flex gap-1 opacity-40">
                <div v-for="i in 3" :key="i" class="w-1 h-1 bg-white rotate-45"></div>
              </div>
              <button @click="showEmotionSelector = false" 
                      class="group/save relative h-12 px-16 bg-white text-black font-black border border-white hover:bg-black hover:text-white transition-all duration-500 ease-in-out">
                <span class="relative z-10 text-[10px] uppercase tracking-[0.8em]">Accept</span>
              </button>

              <div class="flex gap-1 opacity-40">
                <div v-for="i in 3" :key="i" class="w-1 h-1 bg-white rotate-45"></div>
              </div>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- BOTTOM PANEL (NIER CHASSIS) -->
    <Transition name="nier-fade">
      <div v-if="!showEntryMethod" class="fixed bottom-0 mb-4 left-1/2 -translate-x-1/2 z-[1100] font-sans">
        
        <!-- NIER SECTOR TABS AND SWITCHER -->
      <div class="flex justify-between items-end w-full px-2 max-w-5xl">
        <div class="flex gap-0.5 bg-black/60 p-1 border-t border-l border-r border-white/30">
          <button 
            v-for="sector in sectors" 
            :key="sector.id"
            @click="activeSector = sector.id"
            class="px-5 py-1.5 transition-all duration-300 relative group"
            :class="activeSector === sector.id ? 'bg-white text-black' : 'bg-[#0a0a0a]/80 text-white/70 hover:bg-[#222] hover:text-white'"
          >
            <span class="text-[8px] uppercase tracking-[0.4em] font-black relative z-10">{{ sector.id === 'fee' && locale === 'ru' ? 'КОМИССИИ' : sector.label }}</span>
          </button>
        </div>

        <div class="flex gap-0.5 bg-black/60 p-1 border-t border-l border-r border-white/30 shrink-0">
          <button @click="resultMode = 'auto'" :class="resultMode === 'auto' ? 'bg-white text-black' : 'bg-[#0a0a0a]/80 text-white/70 hover:bg-[#222] hover:text-white'" class="px-4 py-1.5 transition-all relative group text-[8px] uppercase tracking-[0.4em] font-black">{{ locale === 'ru' ? 'АВТО' : 'AUTO' }}</button>
          <button @click="resultMode = 'manual'" :class="resultMode === 'manual' ? 'bg-white text-black' : 'bg-[#0a0a0a]/80 text-white/70 hover:bg-[#222] hover:text-white'" class="px-4 py-1.5 transition-all relative group text-[8px] uppercase tracking-[0.4em] font-black">{{ locale === 'ru' ? 'РУЧНАЯ' : 'MANUAL' }}</button>
        </div>
      </div>

      <!-- MAIN CHASSIS -->
      <div class="relative flex items-center bg-[#0a0a0a]/80 border border-white/30 px-8 h-16 max-w-5xl w-full transition-all duration-500 ">
        
        <div class="absolute inset-0 pointer-events-none opacity-[0.08] overflow-hidden">
          <div class="w-full h-px bg-white animate-scan"></div>
        </div>

        <div class="flex items-center gap-10 flex-1 relative z-10">
          
          <!-- BLOCK: ID -->
          <div class="flex items-center gap-6 pr-8 border-r border-white/10 w-[240px] shrink-0">
            <div class="flex flex-col gap-0.5 text-left relative asset-select-container">
              <span class="text-[7px] uppercase tracking-[0.4em] font-bold text-white/40">System_ID</span>
              <div class="flex items-center gap-2">
                <div v-if="asset && currentAssetData" 
                     class="w-5 h-5 rounded-full overflow-hidden border border-white/20 flex items-center justify-center shrink-0 transition-colors"
                     :class="currentAssetData.type === 'Stocks' ? 'bg-white' : 'bg-white/5'">
                  <img v-if="currentAssetData.icon && !failedIcons.has(currentAssetData.symbol)" 
                       :src="currentAssetData.icon" 
                       @error="handleIconError(currentAssetData.symbol)"
                       class="w-full h-full object-contain" />
                  <span v-else 
                        class="text-[10px] font-bold uppercase transition-colors"
                        :class="currentAssetData.type === 'Stocks' ? 'text-black' : 'text-white'">
                    {{ currentAssetData.symbol[0] }}
                  </span>
                </div>
                <input v-model="asset" 
                       @focus="showAssetMenu = true"
                       @input="showAssetMenu = true"
                       @click="showAssetMenu = true"
                       @keydown.esc="showAssetMenu = false"
                       placeholder="UNTITLED" 
                       class="nier-input w-full uppercase truncate"/>
              </div>

              <!-- Asset Dropdown Menu -->
              <Transition name="nier-fade">
                <div v-if="showAssetMenu" class="absolute bottom-full mb-4 left-0 w-64 bg-black border border-white/30 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] z-[200]">
                  <div class="px-4 py-2 border-b border-white/10 flex items-center justify-between">
                    <span class="text-[8px] uppercase tracking-widest text-white/40">Registry_Archive</span>
                    <span class="text-[8px] text-white/20">{{ filteredAssets.length }}_Results</span>
                  </div>
                  <div class="max-h-60 overflow-y-auto custom-scrollbar">
                    <div v-for="a in filteredAssets" :key="a.symbol"
                         @click="selectAsset(a)"
                         class="group/asset flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/20 transition-all">
                      <div class="w-7 h-7 rounded-full overflow-hidden border border-white/10 group-hover/asset:border-black flex items-center justify-center shrink-0 transition-colors"
                           :class="a.type === 'Stocks' ? 'bg-white' : 'bg-white/5'">
                        <img v-if="a.icon && !failedIcons.has(a.symbol)" 
                             :src="a.icon" 
                             @error="handleIconError(a.symbol)"
                             class="w-full h-full object-contain" />
                        <span v-else 
                              class="text-[12px] font-black uppercase transition-colors"
                              :class="a.type === 'Stocks' ? 'text-black' : 'text-white'">
                          {{ a.symbol[0] }}
                        </span>
                      </div>
                      <div class="flex flex-col flex-1 min-w-0">
                        <span class="text-[10px] font-bold tracking-widest text-white">{{ a.symbol }}</span>
                        <span class="text-[8px] text-white/40 truncate  uppercase tracking-tighter">{{ a.name }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>

            <div class="flex flex-col gap-0.5 text-left">
              <span class="text-[7px] uppercase tracking-[0.4em] font-bold text-white/40">Vector</span>
              <button @click="side = side === 'long' ? 'short' : 'long'"
                      class="text-[11px] font-bold tracking-widest uppercase transition-colors"
                      :class="side === 'long' ? 'text-emerald-400' : 'text-rose-400'">
                {{ side }}
              </button>
            </div>
          </div>

          <!-- BLOCK: DYNAMIC DATA STREAM -->
          <div class="flex-1">
            <Transition name="sector-swap" mode="out-in">
              <div v-if="activeSector === 'core'" :key="'core'" class="flex items-center gap-10">
                <div class="flex flex-col gap-0.5 text-left" :class="{ 'opacity-50 pointer-events-none': entryMethodEnabled }">
                  <span class="text-[7px] uppercase tracking-[0.4em] font-bold transition-colors" :class="entryMethodEnabled ? 'text-amber-500/80' : 'text-white/40'">
                     {{ entryMethodEnabled ? 'Avg_Entry_Lvl' : 'Entry_Lvl' }}
                  </span>
                  <input v-if="!entryMethodEnabled" v-model="entry" type="number" placeholder="0.00" class="nier-input w-20 font-mono"/>
                  <span v-else class="text-[11px] font-mono font-bold tracking-[0.15em] text-white">{{ averageEntry > 0 ? averageEntry.toFixed(5) : '0.00' }}</span>
                </div>
                <div class="flex flex-col gap-0.5 text-left" :class="{ 'opacity-50 pointer-events-none': exitMethodEnabled }">
                  <span class="text-[7px] uppercase tracking-[0.4em] font-bold transition-colors" :class="exitMethodEnabled ? 'text-amber-500/80' : 'text-white/40'">
                    {{ exitMethodEnabled ? 'Avg_Exit_Lvl' : 'Exit_Lvl' }}
                  </span>
                  <input v-if="!exitMethodEnabled" v-model="exit" type="number" placeholder="0.00" class="nier-input w-20 font-mono"/>
                  <span v-else class="text-[11px] font-mono font-bold tracking-[0.15em] text-white">{{ averageExit > 0 ? averageExit.toFixed(5) : '0.00' }}</span>
                </div>
                <div class="flex flex-col gap-0.5 text-left" :class="{ 'opacity-50 pointer-events-none': entryMethodEnabled }">
                  <span class="text-[7px] uppercase tracking-[0.4em] font-bold transition-colors" :class="entryMethodEnabled ? 'text-amber-500/80' : 'text-white/40'">
                    {{ entryMethodEnabled ? 'Total_Vol' : (isForex ? 'Lot_Size' : 'Unit_Qty') }}
                  </span>
                  <input v-if="!entryMethodEnabled" v-model="size" type="number" step="0.01" :placeholder="isForex ? '0.01' : '1.0'" class="nier-input w-16 font-mono"/>
                  <span v-else class="text-[11px] font-mono font-bold tracking-[0.15em] text-white">{{ totalSize > 0 ? totalSize.toFixed(2) : '0.00' }}</span>
                </div>
              </div>

              <div v-else-if="activeSector === 'risk'" :key="'risk'" class="flex items-center gap-10">
                <div class="flex flex-col gap-0.5 text-left">
                  <span class="text-[7px] uppercase tracking-[0.4em] font-bold text-rose-500/60">Stop_Loss</span>
                  <input v-model="stopLoss" type="number" placeholder="0.00" class="nier-input w-24 font-mono text-rose-400"/>
                </div>
                <div class="flex flex-col gap-0.5 text-left">
                  <span class="text-[7px] uppercase tracking-[0.4em] font-bold text-emerald-500/60">Take_Profit</span>
                  <input v-model="takeProfit" type="number" placeholder="0.00" class="nier-input w-24 font-mono text-emerald-400"/>
                </div>
              </div>

              <div v-else-if="activeSector === 'time'" :key="'time'" class="flex items-center gap-12">
                <div v-for="t in ['open', 'exit']" :key="t" 
                     @click="openTemporal(t)"
                     class="flex flex-col gap-1 cursor-pointer group/time hover:translate-y-[-2px] transition-all">
                  <span class="text-[7px] uppercase tracking-[0.3em] font-bold text-white/30 group-hover/time:text-white/60 transition-colors">{{ t.toUpperCase() }}_SYNC</span>
                  <div class="flex items-center gap-3 font-mono text-[11px] text-white/80 group-hover/time:text-white">
                    <span>{{ formatPart(t === 'open' ? openDate : exitDate, 'year') }}.{{ formatPart(t === 'open' ? openDate : exitDate, 'month') }}.{{ formatPart(t === 'open' ? openDate : exitDate, 'day') }}</span>
                    <span class="opacity-20">/</span>
                    <span class="tracking-widest">{{ formatPart(t === 'open' ? openDate : exitDate, 'hour') }}:{{ formatPart(t === 'open' ? openDate : exitDate, 'minute') }}</span>
                  </div>
                </div>
              </div>

              <div v-else-if="activeSector === 'fee'" :key="'fee'" class="flex items-center gap-8">
                <button @click="!isFixedFeeAsset && (feeType = feeType === '%' ? '$' : '%')" 
                        :class="[isFixedFeeAsset ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10']"
                        class="flex items-center justify-center w-6 h-6 text-xl font-mono font-bold shrink-0 transition-colors">
                  {{ feeType }}
                </button>

                <div class="flex flex-col gap-0.5 text-left">
                  <span class="text-[7px] uppercase tracking-[0.4em] font-bold text-amber-500/60">
                    {{ locale === 'ru' ? 'ВХОДНАЯ КОМ.' : 'ENTRY_FEE' }}
                  </span>
                  <input v-model="entryFee" type="number" placeholder="0.00" class="nier-input w-20 font-mono text-amber-400"/>
                </div>
                
                <div class="flex flex-col gap-0.5 text-left">
                  <span class="text-[7px] uppercase tracking-[0.4em] font-bold text-amber-500/60">
                    {{ locale === 'ru' ? 'ВЫХОДНАЯ КОМ.' : 'EXIT_FEE' }}
                  </span>
                  <input v-model="exitFee" type="number" placeholder="0.00" class="nier-input w-20 font-mono text-amber-400"/>
                </div>
              </div>
            </Transition>
          </div>

          <!-- BLOCK: OUTPUT -->
          <div class="flex items-center gap-10 pl-8 border-l border-white/10 w-[240px] shrink-0 justify-end">
            <div class="flex flex-col items-end gap-0.5">
              <span class="text-[7px] uppercase tracking-[0.4em] font-bold text-white/40">Yield_Est</span>
              <div v-if="resultMode === 'manual'" class="flex items-center">
                <input v-model.number="pnl" 
                       type="number" 
                       step="1"
                       class="nier-input w-24 text-right pr-1 font-mono" 
                       :class="pnl >= 0 ? 'text-white' : '!text-rose-400'" />
              </div>
              <div v-else class="text-sm font-mono font-bold tabular-nums tracking-tighter" :class="pnl >= 0 ? 'text-white' : 'text-rose-400'">
                {{ pnl > 0 ? '+' : '' }}{{ pnl.toFixed(2) }}
              </div>
            </div>

            <button @click="submit" :disabled="commitState !== 'idle'" 
                    class="group relative h-9 px-6 bg-white/10 border border-white/30 transition-all duration-300 flex items-center justify-center min-w-[120px]"
                    :class="commitState === 'idle' ? 'hover:bg-white cursor-pointer' : 'cursor-not-allowed'">
              <span v-if="commitState === 'idle'" class="relative z-10 text-[9px] uppercase tracking-[0.5em] font-black text-white group-hover:text-black">
                {{ props.initialTrade ? (isRu ? 'ОБНОВИТЬ' : 'UPDATE') : (isRu ? 'СОХРАНИТЬ' : 'COMMIT') }}
              </span>
              <div v-else-if="commitState === 'loading'" class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              <svg v-else-if="commitState === 'success'" class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- DECOR -->
        <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/40"></div>
        <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/40"></div>
        <div class="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white/40 rotate-45 border border-black"></div>

      </div>
    </div>
    </Transition>
    <!-- CONDITION LIBRARY (RECTANGULAR MENU) -->
    <Teleport to="body">
      <Transition name="nier-fade">
        <div v-if="showConditionLibrary" 
             @click.self="showConditionLibrary = false"
             class="fixed inset-0 z-[10005] flex items-center justify-center p-20">
          
            <ExPanel class="w-full max-w-4xl" noPadding variant="light" :no-shadow="true">
              <template #header>
                <div class="flex items-center justify-between w-full">
                  <span class="text-[9px] font-mono tracking-[0.4em] uppercase font-black">Condition_Matrix_Protocol_v4.0</span>
                  <div class="flex items-center gap-12"></div>
                </div>
              </template>

            <!-- CONTENT GRID -->
            <div class="p-10 flex flex-col space-y-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
              
              <!-- SEARCH & FILTERS (MOVED INSIDE) -->
              <div class="flex items-center justify-between">
                <div class="relative flex items-center">
                  <div class="absolute left-3 w-1.5 h-1.5 bg-black/20 dark:bg-white/20 rotate-45"></div>
                  <input v-model="registrySearchQuery" 
                         placeholder="SEARCH_NODE..." 
                         class="bg-black/5 dark:bg-white/5 border nier-border-primary px-8 py-1.5 text-[9px] font-mono tracking-widest focus:outline-none focus:border-black/30 dark:focus:border-white/30 w-64 uppercase placeholder:opacity-30" />
                </div>

                <div class="flex border nier-border-primary overflow-hidden">
                  <button v-for="f in [
                            { id: 'ALL', icon: 'M4 6h16M4 12h16M4 18h16' },
                            { id: 'ENTRY', icon: 'M19 14l-7 7-7-7m7 7V3' },
                            { id: 'EXIT', icon: 'M5 10l7-7 7 7m-7-7v18' },
                            { id: 'EMOTIONS', icon: 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z' }
                          ]" :key="f.id"
                          @click="libraryFilter = f.id"
                          class="flex items-center justify-center w-12 h-9 transition-all"
                          :class="libraryFilter === f.id ? 'nier-bg-inverted nier-text-primary' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path :d="f.icon" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              <!-- FLAT CONDITION LIST (ONLY FOR 'ALL') -->
              <div v-if="libraryFilter === 'ALL'" class="flex flex-wrap gap-4">
                <ExNTtooltip v-for="cond in flatLibraryConditions" :key="cond.id" :title="cond.isMismatched ? 'WRONG_DIRECTION' : cond.name">
                  <template #trigger>
                     <div @click="!cond.isMismatched && toggleCondition(cond.id, cond.scenarioId)"
                          class="relative w-14 h-14 border -ml-px -mt-px flex items-center justify-center transition-all duration-500 group/node"
                          :class="[
                            cond.isMismatched 
                              ? 'bg-red-500/10 border-red-500/30 cursor-not-allowed'
                              : (activeConditions.has(cond.id) 
                                ? 'nier-bg-inverted border-black dark:border-white shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                                : (cond.priority === 'REQUIRED' ? 'bg-red-500/[0.05] border-red-500/30 hover:border-red-500' : cond.priority === 'ADDITIONAL' ? 'bg-blue-500/[0.05] border-blue-500/30 hover:border-blue-500' : 'bg-black/[0.02] dark:bg-white/[0.02] nier-border-primary hover:border-black dark:hover:border-white'))
                          ]">
                        
                        <div class="absolute top-1 left-1 w-1 h-1 border-t border-l transition-colors duration-500"
                             :class="[
                               cond.isMismatched ? 'border-red-500/30' : (activeConditions.has(cond.id) ? 'border-white/40 dark:border-black/40' : 'nier-border-primary')
                             ]"></div>

                        <!-- PRIORITY ACCENT / BADGE -->
                        <div v-if="cond.priority && cond.priority !== 'NONE'"
                             class="absolute top-1 right-1 px-1 py-0.2 text-[5px] font-mono font-bold tracking-tighter uppercase border"
                             :class="cond.priority === 'REQUIRED' ? 'border-red-500/50 text-red-500 bg-red-500/10' : 'border-blue-500/50 text-blue-500 bg-blue-500/10'">
                          {{ cond.priority === 'REQUIRED' ? 'REQ' : 'ADD' }}
                        </div>

                        <span class="text-[14px] font-mono font-black tracking-tighter uppercase transition-colors"
                              :class="[
                                cond.isMismatched ? 'text-red-500/50' : (activeConditions.has(cond.id) ? 'nier-text-primary' : 'text-black/40 dark:text-white/40 group-hover/node:text-black dark:group-hover/node:text-white')
                              ]">
                          {{ (cond.name || '').slice(0, 3) }}
                        </span>

                        <div v-if="activeConditions.has(cond.id)" 
                             class="absolute -bottom-1 -right-1 w-2.5 h-2.5 rotate-45 border-2 border-white dark:border-black shadow-sm transition-colors duration-500"
                             :class="entryConditions.some(e => e.id === cond.id) ? 'bg-blue-500' : 'bg-amber-500'"></div>
                     </div>
                  </template>
                  <div class="flex flex-col gap-1">
                     <div class="flex items-center justify-between">
                       <span class="text-[8px] font-mono opacity-40">{{ cond.isMismatched ? 'CRITICAL_WARNING' : 'TELEMETRY_DESCRIPTION' }}</span>
                       <span v-if="cond.priority && cond.priority !== 'NONE'" 
                             class="px-1 py-0.5 text-[6px] font-mono tracking-widest uppercase border"
                             :class="cond.priority === 'REQUIRED' ? 'border-red-500 text-red-500' : 'border-blue-500 text-blue-500'">
                         {{ cond.priority }}
                       </span>
                     </div>
                     <p class="text-[9px] font-mono leading-relaxed uppercase" :class="cond.isMismatched ? 'text-red-500' : 'opacity-60'">
                       {{ cond.isMismatched ? 'PROTOCOL_DIRECTION_MISMATCH: THE TRADE SIDE DOES NOT ALIGN WITH THIS TACTICAL SCENARIO.' : (cond.description || 'NO_METADATA_AVAILABLE') }}
                     </p>
                  </div>
                </ExNTtooltip>
              </div>

              <!-- EMOTIONS LIST -->
              <div v-else-if="libraryFilter === 'EMOTIONS'" class="flex flex-col space-y-10">
                <div v-for="(emotions, category) in emotionsByCategory" :key="category" class="flex flex-col space-y-4">
                  <!-- CATEGORY HEADER -->
                  <div class="flex items-center gap-4">
                    <div class="w-1.5 h-1.5 bg-black/40 dark:bg-white/40 rotate-45"></div>
                    <span class="text-[9px] font-mono tracking-[0.2em] text-black/60 dark:text-white/60 uppercase">{{ category }}</span>
                    <div class="flex-1 h-px bg-black/5 dark:bg-white/5"></div>
                    <span class="text-[7px] font-mono opacity-20 uppercase tracking-[0.4em]">Sentiment_Protocol</span>
                  </div>

                  <!-- EMOTION MATRIX -->
                  <div class="flex flex-wrap gap-4">
                    <ExNTtooltip v-for="emotion in emotions" :key="emotion.label" :title="emotion.label">
                      <template #trigger>
                         <div @click="toggleEmotion(emotion.label)"
                              class="relative w-14 h-14 border -ml-px -mt-px flex items-center justify-center cursor-pointer transition-all duration-500 group/node"
                              :class="[
                                selectedEmotions.includes(emotion.label) 
                                  ? 'nier-bg-inverted border-black dark:border-white shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                                  : 'bg-black/[0.02] dark:bg-white/[0.02] nier-border-primary hover:border-black dark:hover:border-white'
                              ]">
                            
                            <div class="absolute top-1 left-1 w-1 h-1 border-t border-l transition-colors duration-500"
                                 :class="selectedEmotions.includes(emotion.label) ? 'border-white/40 dark:border-black/40' : 'nier-border-primary'"></div>

                            <span class="text-[12px] font-mono font-black tracking-tighter uppercase text-center leading-none"
                                  :class="selectedEmotions.includes(emotion.label) ? 'nier-text-primary' : 'text-black/40 dark:text-white/40 group-hover:text-black dark:group-hover:text-white'">
                              {{ emotion.label.slice(0, 3) }}
                            </span>

                            <div v-if="selectedEmotions.includes(emotion.label)" 
                                 class="absolute -bottom-1 -right-1 w-2.5 h-2.5 rotate-45 border-2 border-white dark:border-black shadow-sm transition-colors duration-500"
                                 :class="category === 'POSITIVE' ? 'bg-emerald-500' : category === 'NEGATIVE' ? 'bg-rose-500' : 'bg-blue-500'"></div>
                         </div>
                      </template>
                      <div class="flex flex-col gap-1">
                         <span class="text-[8px] font-mono opacity-40">SENTIMENT_ANALYSIS</span>
                         <p class="text-[9px] font-mono leading-relaxed opacity-60 uppercase">{{ emotion.description || 'NO_METADATA_AVAILABLE' }}</p>
                      </div>
                    </ExNTtooltip>
                  </div>
                </div>
              </div>

              <!-- GROUPED SCENARIO LIST (FOR 'ENTRY' / 'EXIT') -->
              <div v-else v-for="scen in filteredLibraryScenarios" :key="scen.id" class="flex flex-col space-y-4">
                
                <!-- SCENARIO HEADER -->
                <div class="flex items-center gap-4">
                  <div class="w-1.5 h-1.5 bg-black/40 dark:bg-white/40 rotate-45"></div>
                  <span class="text-[9px] font-mono tracking-[0.2em] text-black/60 dark:text-white/60 uppercase">{{ scen.params?.customName || scen.label }}</span>
                  <div class="flex-1 h-px bg-black/5 dark:bg-white/5"></div>
                  <span class="text-[7px] font-mono opacity-20 uppercase tracking-[0.4em]">Scenario_Node</span>
                </div>

                <!-- CONDITION MATRIX -->
                <div class="flex flex-wrap gap-4">
                  <ExNTtooltip v-for="cond in getFlattenedScenarioConditions(scen.id)" :key="cond.id" :title="cond.name">
                    <template #trigger>
                       <div @click="toggleCondition(cond.id, scen.id)"
                            class="relative w-14 h-14 border -ml-px -mt-px flex items-center justify-center cursor-pointer transition-all duration-500 group/node"
                            :class="[
                              activeConditions.has(cond.id) 
                                ? 'nier-bg-inverted border-black dark:border-white shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                                : (cond.priority === 'REQUIRED' ? 'bg-red-500/[0.05] border-red-500/30 hover:border-red-500' : cond.priority === 'ADDITIONAL' ? 'bg-blue-500/[0.05] border-blue-500/30 hover:border-blue-500' : 'bg-black/[0.02] dark:bg-white/[0.02] nier-border-primary hover:border-black dark:hover:border-white')
                            ]">
                          
                          <!-- CORNER ACCENT -->
                          <div class="absolute top-1 left-1 w-1 h-1 border-t border-l transition-colors duration-500"
                               :class="activeConditions.has(cond.id) ? 'border-white/40 dark:border-black/40' : 'nier-border-primary'"></div>

                          <!-- PRIORITY ACCENT / BADGE -->
                          <div v-if="cond.priority && cond.priority !== 'NONE'"
                               class="absolute top-1 right-1 px-1 py-0.2 text-[5px] font-mono font-bold tracking-tighter uppercase border"
                               :class="cond.priority === 'REQUIRED' ? 'border-red-500/50 text-red-500 bg-red-500/10' : 'border-blue-500/50 text-blue-500 bg-blue-500/10'">
                            {{ cond.priority === 'REQUIRED' ? 'REQ' : 'ADD' }}
                          </div>

                          <span class="text-[14px] font-mono font-black tracking-tighter uppercase"
                                :class="activeConditions.has(cond.id) ? 'nier-text-primary' : 'text-black/40 dark:text-white/40 group-hover/node:text-black dark:group-hover/node:text-white'">
                            {{ (cond.name || '').slice(0, 3) }}
                          </span>

                          <!-- ACTIVE INDICATOR -->
                          <div v-if="activeConditions.has(cond.id)" 
                               class="absolute -bottom-1 -right-1 w-2.5 h-2.5 rotate-45 border-2 border-white dark:border-black shadow-sm transition-colors duration-500"
                               :class="entryConditions.some(e => e.id === cond.id) ? 'bg-blue-500' : 'bg-amber-500'"></div>
                       </div>
                    </template>
                    <div class="flex flex-col gap-1">
                       <div class="flex items-center justify-between">
                         <span class="text-[8px] font-mono opacity-40">TELEMETRY_DESCRIPTION</span>
                         <span v-if="cond.priority && cond.priority !== 'NONE'" 
                               class="px-1 py-0.5 text-[6px] font-mono tracking-widest uppercase border"
                               :class="cond.priority === 'REQUIRED' ? 'border-red-500 text-red-500' : 'border-blue-500 text-blue-500'">
                           {{ cond.priority }}
                         </span>
                       </div>
                       <p class="text-[9px] font-mono leading-relaxed opacity-60 uppercase">{{ cond.description || 'NO_METADATA_AVAILABLE' }}</p>
                    </div>
                  </ExNTtooltip>
                </div>
              </div>
            </div>

            </ExPanel>
        </div>
      </Transition>
    </Teleport>

    <!-- ENTRY METHOD MATRIX WIDGET -->
    <Transition name="nier-fade">
      <div v-if="showEntryMethod" 
           @click.self="showEntryMethod = false"
           class="fixed inset-0 z-[10005] flex items-center justify-start p-10 bg-black/10 dark:bg-black/40">
        
          <ExPanel class="w-full max-w-[500px]" noPadding variant="light" :no-shadow="true">
            <template #header>
              <div class="flex items-center justify-between w-full">
                <span class="text-[9px] font-mono tracking-[0.4em] uppercase font-black">{{ locale === 'ru' ? 'МЕТОД ВХОДА' : 'ENTRY_METHOD' }}</span>
                <div class="flex items-center gap-12"></div>
              </div>
            </template>
            <!-- CONTENT GRID -->
            <div class="p-10 flex flex-col space-y-10 h-[80vh] min-h-[400px] nier-text-primary">

              <!-- PROTOCOL TABS (Fixed top) -->
              <div class="flex-shrink-0">
                <div class="flex items-center gap-2 border nier-border-primary p-1 bg-black/[0.02] dark:bg-white/[0.02]">
                  <button @click="activeProtocolTab = 'PYRAMIDING'; entryMethodType = 'PYRAMIDING'"
                          class="flex-1 py-3 text-[9px] font-mono tracking-[0.2em] uppercase font-black transition-all"
                          :class="activeProtocolTab === 'PYRAMIDING' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5'">
                     {{ locale === 'ru' ? 'Пирамидинг' : 'Pyramiding' }}
                  </button>
                  <button @click="activeProtocolTab = 'AVERAGING_DOWN'; entryMethodType = 'AVERAGING_DOWN'"
                          class="flex-1 py-3 text-[9px] font-mono tracking-[0.2em] uppercase font-black transition-all"
                          :class="activeProtocolTab === 'AVERAGING_DOWN' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5'">
                     {{ locale === 'ru' ? 'Усреднение' : 'Averaging' }}
                  </button>
                  <button @click="activeProtocolTab = 'EXIT'"
                          class="flex-1 py-3 text-[9px] font-mono tracking-[0.2em] uppercase font-black transition-all"
                          :class="activeProtocolTab === 'EXIT' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5'">
                     {{ locale === 'ru' ? 'Выход' : 'Exiting' }}
                  </button>
                </div>
              </div>

              <!-- SCROLLABLE POSITIONS NODES CONTAINER -->
              <div class="flex-1 overflow-y-auto custom-scrollbar pr-4 min-h-0 pb-10">
                
                <!-- ENTRY NODES -->
                <div v-if="activeProtocolTab === 'PYRAMIDING' || activeProtocolTab === 'AVERAGING_DOWN'" class="flex flex-col gap-4 transition-all">
                  <div v-for="(ent, idx) in activeMultipleEntries" :key="ent.id" class="flex items-center gap-4">
                     <span class="text-[8px] font-mono opacity-40 font-black tracking-widest w-6">#{{ idx + 1 }}</span>
                     <div class="flex-1 flex flex-col gap-1">
                        <span class="text-[7px] uppercase tracking-[0.4em] font-bold opacity-40 nier-text-primary">{{ locale === 'ru' ? 'УРОВЕНЬ_ЦЕНЫ' : 'Price_Lvl' }}</span>
                        <input v-model="ent.price" type="number" placeholder="0.00" class="nier-input !text-black dark:!text-white border-b border-black/20 dark:border-white/20 pb-1 w-full" />
                     </div>
                     <div class="flex-1 flex flex-col gap-1">
                        <span class="text-[7px] uppercase tracking-[0.4em] font-bold opacity-40 nier-text-primary">{{ locale === 'ru' ? 'РАЗМЕР_ЛОТА' : 'Lot_Size' }}</span>
                        <input v-model="ent.size" type="number" step="0.01" placeholder="0.01" class="nier-input !text-black dark:!text-white border-b border-black/20 dark:border-white/20 pb-1 w-full" />
                     </div>
                     <button @click="removeMultipleEntry(ent.id)" class="w-8 h-8 flex items-center justify-center border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white transition-all mt-4">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                     </button>
                  </div>

                  <div class="flex items-center gap-2 mt-2">
                     <button @click="addMultipleEntry" class="flex-1 py-4 border border-dashed border-black/20 dark:border-white/20 text-black/40 dark:text-white/40 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white text-[9px] font-mono tracking-widest uppercase transition-all flex items-center justify-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                        {{ locale === 'ru' ? 'ДОБАВИТЬ_ПОЗИЦИЮ' : 'Add_Position_Node' }}
                     </button>
                     <button v-if="hasActiveMethodNode && !showAutoPrompt && activeMultipleEntries.length === 0" @click="toggleAutoPrompt" class="flex-1 py-4 border border-dashed border-black/50 dark:border-white/50 nier-text-primary hover:border-black dark:hover:border-white hover:bg-black/5 dark:hover:bg-white/5 text-[9px] font-mono tracking-widest uppercase transition-all flex items-center justify-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                        {{ locale === 'ru' ? 'АВТО' : 'AUTO' }}
                     </button>
                  </div>
                  
                  <!-- Auto Generation Prompt -->
                  <div v-if="showAutoPrompt" class="mt-2 p-3 border border-black/30 dark:border-white/30 bg-black/5 dark:bg-white/5 flex flex-col gap-3">
                    <div class="flex items-center gap-3">
                      <div class="flex-1">
                        <span class="block text-[7px] uppercase tracking-[0.4em] font-bold opacity-60 nier-text-primary mb-1">{{ locale === 'ru' ? 'Базовая_Цена' : 'Base_Price' }}</span>
                        <input v-model="autoEntryBasePrice" type="number" placeholder="Price..." class="nier-input !text-black dark:!text-white border-b border-black/30 dark:border-white/30 pb-1 w-full bg-transparent focus:border-black dark:focus:border-white focus:outline-none" />
                      </div>
                      <div class="flex-1">
                        <span class="block text-[7px] uppercase tracking-[0.4em] font-bold opacity-60 nier-text-primary mb-1">{{ locale === 'ru' ? 'РАЗМЕР_ЛОТА' : 'Lot_Size' }}</span>
                        <input v-model="autoEntryBaseLots" type="number" step="0.01" placeholder="Lots..." class="nier-input !text-black dark:!text-white border-b border-black/30 dark:border-white/30 pb-1 w-full bg-transparent focus:border-black dark:focus:border-white focus:outline-none" />
                      </div>
                    </div>
                    <div class="flex items-center justify-end gap-2">
                      <button @click="showAutoPrompt = false" class="px-4 py-2 border border-black/30 dark:border-white/30 nier-text-primary hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono tracking-widest uppercase transition-all font-bold">
                         {{ locale === 'ru' ? 'ОТМЕНА' : 'CANCEL' }}
                      </button>
                      <button @click="confirmAutoGenerate" class="px-4 py-2 bg-black/10 dark:bg-white/10 nier-text-primary hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono tracking-widest uppercase transition-all font-bold">
                         {{ locale === 'ru' ? 'ПОДТВЕРДИТЬ' : 'CONFIRM' }}
                      </button>
                    </div>
                  </div>
                </div>

                <!-- EXIT NODES -->
                <div v-if="activeProtocolTab === 'EXIT'" class="flex flex-col gap-4 transition-all">
                  <div v-for="(ent, idx) in exitEntries" :key="ent.id" class="flex items-center gap-4">
                     <span class="text-[8px] font-mono opacity-40 font-black tracking-widest w-6">#{{ idx + 1 }}</span>
                     <div class="flex-1 flex flex-col gap-1">
                        <span class="text-[7px] uppercase tracking-[0.4em] font-bold opacity-40 nier-text-primary">{{ locale === 'ru' ? 'Уровень_Выхода' : 'Exit_Lvl' }}</span>
                        <input v-model="ent.price" type="number" placeholder="0.00" class="nier-input !text-black dark:!text-white border-b border-black/20 dark:border-white/20 pb-1 w-full" />
                     </div>
                     <div class="flex-1 flex flex-col gap-1">
                        <span class="text-[7px] uppercase tracking-[0.4em] font-bold opacity-40 nier-text-primary">{{ locale === 'ru' ? 'РАЗМЕР_ЛОТА' : 'Lot_Size' }}</span>
                        <input v-model="ent.size" type="number" step="0.01" placeholder="0.01" class="nier-input !text-black dark:!text-white border-b border-black/20 dark:border-white/20 pb-1 w-full" />
                     </div>
                     <button @click="removeExitEntry(ent.id)" class="w-8 h-8 flex items-center justify-center border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white transition-all mt-4">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                     </button>
                  </div>

                  <button @click="addExitEntry" 
                          :disabled="totalSize - totalExitSize <= 0"
                          class="w-full py-4 border border-dashed text-[9px] font-mono tracking-widest uppercase transition-all mt-2 flex items-center justify-center gap-2"
                          :class="(totalSize - totalExitSize <= 0) ? 'border-black/5 dark:border-white/5 text-black/20 dark:text-white/20 cursor-not-allowed' : 'border-black/20 dark:border-white/20 text-black/40 dark:text-white/40 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'">
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                     {{ (totalSize - totalExitSize <= 0) ? (locale === 'ru' ? 'ОБЪЕМ ИСЧЕРПАН' : 'VOLUME_DEPLETED') : (locale === 'ru' ? 'ДОБАВИТЬ_ВЫХОД' : 'Add_Exit_Node') }}
                  </button>
                </div>
              </div>

              <!-- FOOTER (Fixed bottom) -->
              <div class="flex-shrink-0 border-t nier-border-primary pt-6 transition-all">
                <!-- ENTRY FOOTER -->
                <div v-if="activeProtocolTab === 'PYRAMIDING' || activeProtocolTab === 'AVERAGING_DOWN'" class="flex items-center justify-between" :class="{ 'opacity-30 grayscale': !entryMethodEnabled }">
                  <div class="flex flex-col gap-1">
                     <span class="text-[7px] uppercase tracking-[0.4em] font-bold opacity-40 nier-text-primary">{{ locale === 'ru' ? 'СРЕДНЯЯ ЦЕНА ВХОДА' : 'Aggregated_Avg_Entry' }}</span>
                     <span class="text-sm font-mono font-black nier-text-primary">{{ averageEntry > 0 ? averageEntry.toFixed(5) : '0.00' }}</span>
                  </div>
                  <div class="flex flex-col gap-1 items-end">
                     <span class="text-[7px] uppercase tracking-[0.4em] font-bold opacity-40 nier-text-primary">{{ locale === 'ru' ? 'ОБЩИЙ ОБЪЕМ' : 'Total_Volume' }}</span>
                     <span class="text-sm font-mono font-black nier-text-primary">{{ totalSize > 0 ? totalSize.toFixed(2) : '0.00' }}</span>
                  </div>
                </div>

                <!-- EXIT FOOTER -->
                <div v-if="activeProtocolTab === 'EXIT'" class="flex items-center justify-between">
                  <div class="flex flex-col gap-1">
                     <span class="text-[7px] uppercase tracking-[0.4em] font-bold opacity-40 nier-text-primary">{{ locale === 'ru' ? 'СРЕДНЯЯ ЦЕНА ВЫХОДА' : 'Aggregated_Avg_Exit' }}</span>
                     <span class="text-sm font-mono font-black nier-text-primary">{{ averageExit > 0 ? averageExit.toFixed(5) : '0.00' }}</span>
                  </div>
                  <div class="flex flex-col gap-1 items-end">
                     <span class="text-[7px] uppercase tracking-[0.4em] font-bold opacity-40 nier-text-primary">{{ locale === 'ru' ? 'ОБЩИЙ ОБЪЕМ ВЫХОДА' : 'Total_Exit_Volume' }}</span>
                     <span class="text-sm font-mono font-black" :class="(totalExitSize > totalSize) ? 'text-rose-500' : 'nier-text-primary'">
                        {{ totalExitSize > 0 ? totalExitSize.toFixed(2) : '0.00' }} <span class="opacity-40 text-xs">/ {{ totalSize > 0 ? totalSize.toFixed(2) : '0.00' }}</span>
                     </span>
                  </div>
                </div>
              </div>

            </div>

          </ExPanel>
      </div>
    </Transition>

    <!-- TEMPORAL MATRIX WIDGET -->
    <Teleport to="body">
      <Transition name="nier-fade">
        <div v-if="isTemporalOpen" 
             @click.self="isTemporalOpen = false"
             class="fixed inset-0 z-[2000] flex items-center justify-center p-20 bg-black/20 dark:bg-black/40 backdrop-blur-md cursor-pointer">
          <ExPanel variant="light" :no-padding="true" :show-corners="true" :no-shadow="true" class="w-full max-w-4xl !border-black/20 dark:!border-white/20 cursor-auto">
            
            <div class="flex items-center justify-between px-4 py-2 border-b nier-border-primary bg-black/[0.02] dark:bg-white/[0.02]">
            </div>

            <div class="grid grid-cols-2 divide-x divide-black/5 dark:divide-white/5 h-[450px] nier-text-primary">
              <div class="flex flex-col p-10 gap-8">
                <div class="flex flex-col gap-2">
                  <span class="text-[9px] uppercase tracking-widest text-black/40 dark:text-white/20">Active_Target</span>
                  <div class="flex gap-2">
                    <button v-for="t in ['open', 'exit']" :key="t"
                            @click="activeTemporalTarget = t"
                            class="flex-1 py-3 border border-black/20 dark:border-white/20 text-[10px] uppercase tracking-[0.4em] transition-all"
                            :class="activeTemporalTarget === t ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-transparent text-black/40 hover:bg-black/5 dark:text-white/40 dark:hover:bg-white/5'">
                      {{ t.toUpperCase() }}_ARCHIVE
                    </button>
                  </div>
                </div>

                <div class="flex flex-col gap-4 pt-4 border-t border-black/5 dark:border-white/5">
                  <button @click="activeTemporalTarget === 'open' ? openDate = new Date() : exitDate = new Date()" 
                          class="w-full py-2 border nier-border-primary text-[8px] uppercase tracking-widest text-black/60 hover:bg-black/10 dark:text-white/60 dark:hover:bg-white/10">
                    Sync_to_Current_System_Time
                  </button>
                  <button @click="exitDate = new Date(openDate)" 
                          class="w-full py-2 border nier-border-primary text-[8px] uppercase tracking-widest text-black/60 hover:bg-black/10 dark:text-white/60 dark:hover:bg-white/10">
                    Clone_Open_Protocol_to_Exit
                  </button>
                </div>
              </div>

              <div class="flex flex-col p-10 justify-center">
                <div class="flex flex-col items-center gap-10">
                  <div class="flex items-center gap-4">
                    <div v-for="unit in ['day', 'month', 'year']" :key="unit" class="flex flex-col items-center gap-2">
                      <button @click="adjustDate(activeTemporalTarget, unit, 1); syncTempParts()" class="p-2 opacity-20 hover:opacity-100 transition-opacity"><div class="w-4 h-px nier-bg-inverted"></div></button>
                      <input v-model="tempDateParts[unit]"
                             :maxlength="unit === 'year' ? 4 : 2"
                             @input="e => handleManualDate(activeTemporalTarget, unit, e.target.value)"
                             class="w-24 bg-transparent text-center outline-none text-4xl font-mono font-bold tracking-tighter nier-text-primary" />
                      <button @click="adjustDate(activeTemporalTarget, unit, -1); syncTempParts()" class="p-2 opacity-20 hover:opacity-100 transition-opacity"><div class="w-4 h-px nier-bg-inverted"></div></button>
                      <span class="text-[7px] uppercase tracking-widest text-black/40 dark:text-white/20">{{ unit }}</span>
                    </div>
                  </div>

                  <div class="w-20 h-px bg-black/10 dark:bg-white/10"></div>

                  <div class="flex items-center gap-6">
                    <div v-for="unit in ['hour', 'minute']" :key="unit" class="flex flex-col items-center gap-2">
                      <button @click="adjustDate(activeTemporalTarget, unit, 1); syncTempParts()" class="p-2 opacity-20 hover:opacity-100 transition-opacity"><div class="w-4 h-px nier-bg-inverted"></div></button>
                      <input v-model="tempDateParts[unit]"
                             maxlength="2"
                             @input="e => handleManualDate(activeTemporalTarget, unit, e.target.value)"
                             class="w-20 bg-transparent text-center outline-none text-4xl font-mono font-bold tracking-widest nier-text-primary" />
                      <button @click="adjustDate(activeTemporalTarget, unit, -1); syncTempParts()" class="p-2 opacity-20 hover:opacity-100 transition-opacity"><div class="w-4 h-px nier-bg-inverted"></div></button>
                      <span class="text-[7px] uppercase tracking-widest text-black/40 dark:text-white/20">{{ unit }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ExPanel>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.custom-scrollbar {
  -ms-overflow-style: none !important;
  scrollbar-width: none !important;
}
.custom-scrollbar::-webkit-scrollbar {
  display: none !important;
}

.nier-input {
  background: transparent;
  border: none;
  font-family: 'Inter', monospace;
  font-weight: 800;
  font-size: 11px;
  letter-spacing: 0.15em;
  color: white;
  padding: 0;
  outline: none;
}
.nier-input::placeholder {
  color: rgba(255, 255, 255, 0.2);
}

input::-webkit-outer-spin-button, 
input::-webkit-inner-spin-button { 
  -webkit-appearance: none; 
  margin: 0; 
}
input[type=number] { 
  -moz-appearance: textfield; 
  appearance: textfield;
}

/* Animations */
@keyframes scan-fast {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}

@keyframes scan-slow {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes scan-vertical {
  from { transform: translateY(-100%); }
  to { transform: translateY(100%); }
}

.animate-scan-fast {
  animation: scan-fast 1.5s infinite linear;
}

.animate-scan-slow {
  animation: scan-slow 3s infinite linear;
}

@keyframes scan-vertical {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(500%); }
}

.animate-scan {
  animation: scan-vertical 4s linear infinite;
}

/* Transitions */
.risk-warn-enter-active,
.risk-warn-leave-active {
  transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), filter 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.risk-warn-enter-from,
.risk-warn-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
  filter: blur(4px);
}
.risk-warn-enter-to,
.risk-warn-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0px);
}

.protocol-slide-enter-active, .protocol-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.protocol-slide-enter-from, .protocol-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.nier-fade-enter-active, .nier-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.nier-fade-enter-from, .nier-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.sector-swap-enter-active, .sector-swap-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.sector-swap-enter-from { opacity: 0; transform: translateX(20px); }
.sector-swap-leave-to { opacity: 0; transform: translateX(-20px); }

.insight-slide-enter-active, .insight-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.insight-slide-enter-from { 
  opacity: 0; 
  transform: translate(-30px, -50%); 
}
.insight-slide-leave-to { 
  opacity: 0; 
  transform: translate(-30px, -50%); 
}
</style>
