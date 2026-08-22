// @ts-nocheck
import { ref, computed, onMounted, watch } from 'vue'
import allAssets from '~/shared/data/global_assets.json'
import { loadFromDisk } from '~/shared/diskStorage'
import ExNTtooltip from '~/shared/ui/ExNTtooltip.vue'
import ExPanel from '~/shared/ui/ExPanel.vue'
import ExTooltip from '~/shared/ui/ExTooltip.vue'
import ExHeading from '~/shared/ui/ExHeading.vue'
import ExText from '~/shared/ui/ExText.vue'
import ExEquityCurve2D from '~/widgets/genesis/ui/analytics/ExEquityCurve2D.vue'
import { useThemeStore } from '~/features/store/useTheme'
import { useStrategyTradesStore } from '~/features/store/useStrategyTrades'
import { useGenesisTrades, useGenesisMatrixData } from '~/entities/genesis'
import { useI18n } from '~/shared/i18n/useI18n'
import { GENESIS_EMOTION_LIBRARY } from '~/widgets/genesis/model/emotionLibrary'
import { resolveRiskManagementForStrategy, riskValueToDollars } from '~/widgets/genesis/model/riskManagement'
import { getTradeCashPnl } from '~/widgets/genesis/model/tradePnl'
import { SystemProtocolSelect } from '~/widgets/system-protocol-select'
import { useMatrixState } from '~/widgets/genesis/model/matrix/useMatrixState'


export function useExTradeEntry(props, emit) {

const { locale } = useI18n()



const themeStore = useThemeStore()
const isDark = computed(() => themeStore?.settings?.isDark ?? false)

// View Toggle
const viewMode = ref('tactical') // 'tactical' or 'journal'
const journalEntries = ref([])

const normalizeJournalImage = (image, index = 0) => {
  const source = typeof image === 'string' ? { url: image } : (image || {})
  const url = source.url || source.image || source.src || ''
  return {
    id: source.id || `${Date.now()}-${index}`,
    image: url,
    name: source.name || '',
    tags: Array.isArray(source.tags) ? [...source.tags] : [],
    tagInput: '',
    createdAt: source.createdAt || source.timestamp || source.date || new Date().toISOString(),
    context: source.context || ''
  }
}

const normalizeTradeNote = (note, index = 0) => {
  if (typeof note === 'string') {
    return {
      id: `note-${Date.now()}-${index}`,
      content: note,
      date: new Date().toISOString(),
      title: `SESSION_LOG_${index + 1}`
    }
  }

  return {
    id: note?.id || `note-${Date.now()}-${index}`,
    content: note?.content || note?.text || '',
    html: note?.html || '',
    date: note?.date || note?.createdAt || note?.timestamp || new Date().toISOString(),
    title: note?.title || `SESSION_LOG_${index + 1}`
  }
}

const getArchiveNodeName = (id) => `Archive_Node_${id.toString(16).toUpperCase().slice(-6)}`

const archiveMode = ref('notes') // 'notes' or 'images'
const notesList = ref([])

const addNote = () => {
  const id = `note_${Date.now()}`
  notesList.value.push({
    id,
    content: '',
    date: new Date().toISOString(),
    title: `SESSION_LOG_${notesList.value.length + 1}`
  })
}

const removeNote = (id) => {
  notesList.value = notesList.value.filter(n => n.id !== id)
}

const addJournalEntry = () => {
  if (archiveMode.value === 'notes') {
    addNote()
    return
  }
  const id = Date.now()
  journalEntries.value.push({
    id,
    image: null,
    name: '',
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
const assetTypeFilter = ref('ALL')
const filteredAssets = computed(() => {
  const q = assetSearch.value.toUpperCase()
  let baseAssets = allAssets
  if (assetTypeFilter.value !== 'ALL') {
    baseAssets = baseAssets.filter(a => (a.type || '').toUpperCase() === assetTypeFilter.value.toUpperCase())
  }
  
  if (!q) return baseAssets.slice(0, 50)
  
  const searchLower = q.toLowerCase()
  
  return baseAssets.filter(a => 
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

const genesisTrades = useGenesisTrades()
const genesisMatrix = useGenesisMatrixData()

const loadMatrixData = async () => {
  isMatrixLoading.value = true
  try {
    const data = await genesisMatrix.loadMatrix()
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
const matrixState = useMatrixState()

const strategies = computed(() => tradeStore.strategies)

const selectedStrategyId = computed({
  get: () => tradeStore.selectedStrategyId,
  set: (val) => { tradeStore.selectedStrategyId = val }
})
const selectedStrategy = computed(() => {
  const s = tradeStore.strategies.find(s => s.id === selectedStrategyId.value)
  return s || tradeStore.strategies[0] || { id: 'MAIN_DIARY', name: 'MAIN_DIARY' }
})

const commitStrategyVersionId = computed(() => {
  if (selectedStrategyId.value === 'MAIN_DIARY') return undefined
  return matrixState.selectedStrategyVersionId.value || matrixState.strategyVersions.value.at(-1)?.id
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

const currentCapital = computed(() => {
  const initialDeposit = tradeStore.getInitialDeposit(selectedStrategyId.value) || 1000
  const referenceOpenTime = new Date(props.initialTrade?.date || props.initialTrade?.entryTime || openDate.value || Date.now()).getTime()
  const historical = (tradeStore.getTradesForStrategy(selectedStrategyId.value) || [])
    .filter(t => !props.initialTrade?.id || t?.id !== props.initialTrade.id)
    .filter(t => {
      if (t?.isClosed === false || String(t?.status || '').toLowerCase() === 'open') return false
      if (!Number.isFinite(referenceOpenTime)) return true
      const tradeExitTime = new Date(t?.dateExit || t?.exitTime || t?.date || 0).getTime()
      return Number.isFinite(tradeExitTime) && tradeExitTime > 0 && tradeExitTime < referenceOpenTime
    })
  const totalPnl = historical
    .reduce((acc, t) => acc + getTradeCashPnl(t, initialDeposit), 0)
  return initialDeposit + totalPnl
})

const activeRiskPerTradeDollars = computed(() => {
  return riskValueToDollars(
    activeRiskManagement.value.riskPerTradeValue,
    activeRiskManagement.value.riskPerTradeUnit,
    currentCapital.value
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

const SYSTEM_EXIT_SCENARIO_ID = 'default-exit-system'
const SYSTEM_EXIT_PROTOCOL_IDS = ['cond-exit-tp', 'cond-exit-sl', 'cond-exit-fl']

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

  isHydratingInitialTrade.value = Boolean(props.initialTrade)
  if (props.initialTrade) {
    const t = props.initialTrade
    if (t.strategyId) {
      selectedStrategyId.value = t.strategyId
    }
    asset.value = t.asset || ''
    side.value = t.side?.toLowerCase() === 'short' ? 'short' : 'long'
    isClosed.value = t.isClosed !== false && String(t.status || '').toLowerCase() !== 'open'
    
    // Reverse-engineer the executions into the component's entry/exit arrays
    if (t.executions && t.executions.length > 0) {
      const entryExecs = t.executions.filter(e => String(e?.type || '').toLowerCase() === 'entry')
      const exitExecs = t.executions.filter(e => String(e?.type || '').toLowerCase() === 'exit')
      const usesEntryMethod = entryExecs.length > 1 || entryExecs.some(e => String(e?.label || '').toUpperCase() !== 'SINGLE')
      const usesExitMethod = exitExecs.length > 1 || exitExecs.some(e => String(e?.label || '').toUpperCase() !== 'SINGLE')
      
      if (usesEntryMethod) {
        const entryMethodLabel = String(entryExecs.find(e => String(e?.label || '').toUpperCase() !== 'SINGLE')?.label || '').toUpperCase().replace(/\s+/g, '_')
        const storedEntryMethodType = String(t.entryMethodType || '').toUpperCase().replace(/\s+/g, '_')
        const restoredEntryMethodType = ['PYRAMIDING', 'AVERAGING_DOWN'].includes(storedEntryMethodType)
          ? storedEntryMethodType
          : (entryMethodLabel === 'AVERAGING_DOWN' || entryMethodLabel === 'AVERAGING'
            ? 'AVERAGING_DOWN'
            : 'PYRAMIDING')
        const restoredEntries = entryExecs.map(e => ({
          id: e.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          price: e.price,
          size: e.size,
          fee: e.fee || 0,
          method: ['AVERAGING', 'AVERAGING_DOWN'].includes(String(e.label || '').toUpperCase())
            ? 'AVERAGING_DOWN'
            : 'PYRAMIDING'
        }))
        entryMethodType.value = restoredEntryMethodType
        activeProtocolTab.value = restoredEntryMethodType
        entrySequence.value = restoredEntries
        pyramidingEntries.value = restoredEntries.filter(e => e.method === 'PYRAMIDING')
        averagingDownEntries.value = restoredEntries.filter(e => e.method === 'AVERAGING_DOWN')
      } else {
        entry.value = entryExecs[0]?.price || t.entry || ''
        size.value = entryExecs[0]?.size || t.size || ''
        entryFee.value = t.entryFee || ''
      }
      
      if (usesExitMethod) {
        exitEntriesSizeLinked.value = false
        exitEntries.value = exitExecs.map(e => ({
          id: e.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          price: e.price,
          size: e.size,
          fee: e.fee || 0,
          reason: e.reason || 'MANUAL'
        }))
      } else {
        exitEntriesSizeLinked.value = true
        exit.value = exitExecs[0]?.price || t.exit || ''
        exitFee.value = t.exitFee || ''
      }
    } else {
      entry.value = t.entry || ''
      exit.value = t.exit || ''
      size.value = t.size || ''
      entryFee.value = t.entryFee || ''
      exitFee.value = t.exitFee || ''
    }

    feeType.value = t.feeType || '%'
    const storedResultMode = String(t.resultMode || '').toLowerCase()
    if (storedResultMode === 'manual' && t.profitInCurrency !== undefined && t.profitInCurrency !== null) {
      resultMode.value = 'manual'
      overridePnl.value = t.profitInCurrency
    } else {
      resultMode.value = 'auto'
      overridePnl.value = null
    }
    stopLoss.value = t.stopLoss || ''
    takeProfit.value = t.takeProfit || ''
    tradeTimeZone.value = t.timeZone || t.timezone || detectUserTimeZone()
    openDate.value = t.date ? new Date(t.date) : new Date()
    exitDate.value = t.dateExit ? new Date(t.dateExit) : new Date()
    selectedEmotions.value = Array.isArray(t.emotions) ? [...t.emotions] : []
    hydrateTradeStudyMetrics(t.tradeStudyMetrics || t.studyMetrics)

    const storedImages = Array.isArray(t.images)
      ? t.images
      : (Array.isArray(t.journalEntries)
        ? t.journalEntries
        : (Array.isArray(t.visuals) ? t.visuals : (Array.isArray(t.attachments) ? t.attachments : [])))
    journalEntries.value = storedImages
      .map((img, index) => normalizeJournalImage(img, index))
      .filter(entry => Boolean(entry.image))

    const storedNotes = Array.isArray(t.notesList)
      ? t.notesList
      : (Array.isArray(t.notes) ? t.notes : (typeof t.notes === 'string' && t.notes.trim() ? [t.notes] : []))
    notesList.value = storedNotes.map((note, index) => normalizeTradeNote(note, index))

    // Reconstruct active conditions from stored scenario snapshots.
    const reconstructConditions = (scenario, fallbackScenarioId = null) => {
      const conds = scenario?.info?.conditions || scenario?.conditions || []
      const storedScenarioId = scenario?.id || fallbackScenarioId || null
      const scenarioId = SYSTEM_EXIT_PROTOCOL_IDS.includes(String(storedScenarioId))
        ? SYSTEM_EXIT_SCENARIO_ID
        : storedScenarioId
      const activate = (conditionId, targetScenarioId = scenarioId) => {
        if (!conditionId) return
        activeConditions.value.add(conditionId)
        if (targetScenarioId) {
          const scenarioIds = activeConditionScenarioIds.value.get(conditionId) || new Set()
          scenarioIds.add(targetScenarioId)
          activeConditionScenarioIds.value.set(conditionId, scenarioIds)
        }
      }
      conds.forEach(cond => {
        if (cond.indicatorUnits) {
          cond.indicatorUnits.forEach(unit => {
            if (unit.type === 'bundle') unit.items?.forEach(i => activate(i.id))
            else if (unit.type === 'single' && unit.item) activate(unit.item.id)
          })
        } else if (cond.id) {
          activate(cond.id)
        }
      })
      if (SYSTEM_EXIT_PROTOCOL_IDS.includes(String(storedScenarioId))) {
        activate(String(storedScenarioId), SYSTEM_EXIT_SCENARIO_ID)
      }
    }
    reconstructConditions(t.boardScenarioEntry, t.boardScenarioEntryId)
    reconstructConditions(t.boardScenarioExit, t.boardScenarioExitId)
  }
  isHydratingInitialTrade.value = false
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
  { id: SYSTEM_EXIT_SCENARIO_ID, label: 'SYSTEM_PROTOCOLS', params: { customName: 'SYSTEM_PROTOCOLS', phase: 'EXIT' }, isMini: true }
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
const activeConditionScenarioIds = ref(new Map())
const isConditionActive = (id, scenarioId = null) => {
  if (!activeConditions.value.has(id)) return false
  if (!scenarioId) return true

  const activeScenarioIds = activeConditionScenarioIds.value.get(id)
  return !activeScenarioIds?.size || activeScenarioIds.has(scenarioId)
}

const toggleCondition = (id, scenarioId = null) => {
  if (mismatchedNodeIds.value.has(id)) return

  // 1. Identify which scenario this condition belongs to
  const targetScenarioId = scenarioId || selectedRegistryScenarioId.value
  if (targetScenarioId) selectedRegistryScenarioId.value = targetScenarioId

  const activateCondition = (conditionId) => {
    activeConditions.value.add(conditionId)
    if (targetScenarioId) {
      const scenarioIds = activeConditionScenarioIds.value.get(conditionId) || new Set()
      scenarioIds.add(targetScenarioId)
      activeConditionScenarioIds.value.set(conditionId, scenarioIds)
    }
  }
  const deactivateCondition = (conditionId, scenarioToRemove = targetScenarioId) => {
    const scenarioIds = activeConditionScenarioIds.value.get(conditionId)
    if (scenarioToRemove && scenarioIds?.size) {
      scenarioIds.delete(scenarioToRemove)
      if (scenarioIds.size > 0) {
        activeConditionScenarioIds.value.set(conditionId, scenarioIds)
        return
      }
    }

    activeConditions.value.delete(conditionId)
    activeConditionScenarioIds.value.delete(conditionId)
  }

  // 2. Scenario Exclusivity Logic: Clear conditions from other scenarios of the same type
  if (targetScenarioId) {
    const getScenarioType = (scenId) => {
      if (!scenId) return 'ENTRY'
      const strId = String(scenId)
      if (strId === SYSTEM_EXIT_SCENARIO_ID) return 'SYSTEM_EXIT'
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
        conds.forEach(cid => deactivateCondition(cid, s.id))
      }
    })
  }

  // 3. Normal Toggle Logic
  if (SYSTEM_EXIT_PROTOCOL_IDS.includes(id)) {
    if (isConditionActive(id, targetScenarioId)) {
      deactivateCondition(id)
    } else {
      SYSTEM_EXIT_PROTOCOL_IDS.forEach(rid => deactivateCondition(rid, null))
      activateCondition(id)
    }
    return
  }

  const isCurrentlyActive = isConditionActive(id, targetScenarioId)
  isCurrentlyActive ? deactivateCondition(id) : activateCondition(id)
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
  const seenKeys = new Set()
  
  allScenarios.forEach(scen => {
    const nodeDir = (scen.params?.direction || 'NONE').toUpperCase();
    const tradeSide = side.value.toUpperCase();
    const isMismatched = nodeDir !== 'NONE' && nodeDir !== tradeSide;
    const scenarioName = String(scen.params?.customName || scen.label || scen.id).toUpperCase();
    const isDefaultScenario = String(scen.id).startsWith('default-');

    const pushCondition = (condition) => {
      if (!condition?.id) return;
      const scopedKey = `${scen.id}:${condition.id}`;
      if (seenKeys.has(scopedKey)) return;

      const conditionName = condition.name || condition.label || '';
      const tooltipName = isDefaultScenario ? conditionName : `${conditionName} (${scenarioName})`;
      const isSearchMatch = !registrySearchQuery.value ||
        tooltipName.toLowerCase().includes(registrySearchQuery.value.toLowerCase());

      if (!isSearchMatch) return;

      allConds.push({
        ...condition,
        id: condition.id,
        name: conditionName,
        tooltipName,
        scenarioName,
        isDefaultScenario,
        isMismatched,
        scenarioId: scen.id
      });
      seenKeys.add(scopedKey);
    };

    getScenarioConditions(scen.id).forEach(c => {
      if (c.indicatorUnits) {
        c.indicatorUnits.forEach(unit => {
          const items = unit.type === 'bundle' ? unit.items : [unit.item];
          items.forEach(item => {
            pushCondition(item ? { ...item, name: item.label } : null);
          })
        })
      } else {
        pushCondition(c);
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
    if (isConditionActive(cond.id, scenarioId)) activeIds.push(cond.id)
    if (cond.indicatorUnits) {
      cond.indicatorUnits.forEach(unit => {
        if (unit.type === 'bundle') {
          unit.items?.forEach(i => {
            if (isConditionActive(i.id, scenarioId)) activeIds.push(i.id)
          })
        } else if (unit.type === 'single' && unit.item) {
          if (isConditionActive(unit.item.id, scenarioId)) activeIds.push(unit.item.id)
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
    
    if (scenarioId === SYSTEM_EXIT_SCENARIO_ID) {
      return [
        { id: 'cond-exit-tp', name: 'TAKE-PROFIT', description: 'STRATEGIC_PROFIT_CAPTURE_TARGET' },
        { id: 'cond-exit-sl', name: 'STOP-LOSS', description: 'CAPITAL_PRESERVATION_THRESHOLD' },
        { id: 'cond-exit-fl', name: 'FULL-LIQUIDATION', description: 'TOTAL_EXPOSURE_TERMINATION' }
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

const getScenarioRequiredConditionsSnapshot = (scenarioId) => {
  if (!scenarioId) return []
  return getFlattenedScenarioConditions(scenarioId)
    .filter(c => c?.priority === 'REQUIRED' || c?.info?.priority === 'REQUIRED')
    .map(c => ({
      id: c.id,
      info: {
        name: (c.name || c.label || c.info?.name || '').toUpperCase(),
        description: c.description || c.info?.description || '',
        priority: 'REQUIRED'
      }
    }))
}

const getRequiredConditionsSnapshotForScenarios = (scenarios = []) => {
  const seen = new Set()
  const snapshot = []

  scenarios.forEach(scenario => {
    getScenarioRequiredConditionsSnapshot(scenario?.id).forEach(condition => {
      if (!condition?.id || seen.has(condition.id)) return
      seen.add(condition.id)
      snapshot.push(condition)
    })
  })

  return snapshot
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
const isClosed = ref(true)
const entry = ref('')
const exit = ref('')
const size = ref('')
const entryFee = ref('')
const exitFee = ref('')
const feeType = ref('%')
const resultMode = ref('auto')

const sanitizeDecimalInputValue = (value, options = {}) => {
  const normalized = String(value ?? '').replace(',', '.')
  let seenDot = false
  let seenMinus = false
  return normalized
    .split('')
    .filter((char, index) => {
      if (/\d/.test(char)) return true
      if (options.allowNegative && char === '-' && index === 0 && !seenMinus) {
        seenMinus = true
        return true
      }
      if (char === '.' && !seenDot) {
        seenDot = true
        return true
      }
      return false
    })
    .join('')
}

const getNumberInputSanitizeOptions = (field) => ({
  allowNegative: field === 'overridePnl'
})

const assignSanitizedNumberInput = (targetRef, rawValue, options = {}) => {
  if (!targetRef) return
  targetRef.value = sanitizeDecimalInputValue(rawValue, options)
}

const getTradeNumberInputRef = (field) => ({
  entry,
  exit,
  size,
  entryFee,
  exitFee,
  stopLoss,
  takeProfit,
  overridePnl,
  autoEntryBasePrice,
  autoEntryBaseLots
})[field]

const sanitizeTradeNumberInput = (event, targetRefOrField) => {
  const target = event?.target
  const options = typeof targetRefOrField === 'string'
    ? getNumberInputSanitizeOptions(targetRefOrField)
    : {}
  const sanitized = sanitizeDecimalInputValue(target?.value ?? '', options)
  if (target && target.value !== sanitized) target.value = sanitized
  const targetRef = typeof targetRefOrField === 'string'
    ? getTradeNumberInputRef(targetRefOrField)
    : targetRefOrField
  assignSanitizedNumberInput(targetRef, sanitized, options)
}

// Entry & Exit Protocol
const showEntryMethod = ref(false)
const showTradeStudyMetrics = ref(false)
const activeProtocolTab = ref('PYRAMIDING') // 'PYRAMIDING', 'AVERAGING_DOWN', or 'EXIT'

const createTradeStudyMetrics = () => ({
  maxPriceDuringTrade: '',
  minPriceDuringTrade: '',
  priceDroppedBelowEntryLong: false,
  priceBelowEntryLongMovePercent: '',
  priceBelowEntryLongDurationDays: '',
  priceBelowEntryLongDurationHours: '',
  priceBelowEntryLongDurationMinutes: '',
  priceBelowEntryLongDurationSeconds: '',
  priceRoseAboveEntryShort: false,
  priceAboveEntryShortMovePercent: '',
  priceAboveEntryShortDurationDays: '',
  priceAboveEntryShortDurationHours: '',
  priceAboveEntryShortDurationMinutes: '',
  priceAboveEntryShortDurationSeconds: '',
  hadNews: false,
  generatedInTradeAnalysis: null,
  generatedMarketData: null
})

const tradeStudyMetrics = ref(createTradeStudyMetrics())

const persistGeneratedTradeStudyMetrics = async (metrics = tradeStudyMetrics.value) => {
  const tradeId = props.initialTrade?.id
  if (!tradeId) return false

  const strategyId = selectedStrategyId.value || 'MAIN_DIARY'
  const snapshot = JSON.parse(JSON.stringify(metrics || createTradeStudyMetrics()))
  const currentTrade = tradeStore.getAllTradesForStrategy(strategyId)
    .find(trade => String(trade?.id || '') === String(tradeId))

  if (!currentTrade) return false

  // Keep the editor object and the persisted store in sync immediately after
  // chart generation, even before the full trade form is saved.
  props.initialTrade.tradeStudyMetrics = snapshot
  await tradeStore.updateTrade(strategyId, tradeId, { tradeStudyMetrics: snapshot })
  return true
}

const hydrateTradeStudyMetrics = (metrics = {}) => {
  const defaults = createTradeStudyMetrics()
  const normalized = {}
  Object.keys(defaults).forEach(key => {
    normalized[key] = metrics?.[key] ?? defaults[key]
  })
  tradeStudyMetrics.value = {
    ...defaults,
    ...normalized
  }
}

const resetTradeStudyMetrics = () => {
  hydrateTradeStudyMetrics()
}

// Entry State
const entryMethodType = ref('PYRAMIDING') // Tracks the active entry calculation mode
const pyramidingEntries = ref([])
const averagingDownEntries = ref([])
// Both methods share this canonical order. The method-specific arrays are only
// views used by the two protocol tabs and keep references to the same entries.
const entrySequence = ref([])

const activeMultipleEntries = computed(() => 
  entryMethodType.value === 'PYRAMIDING' ? pyramidingEntries.value : averagingDownEntries.value
)

const persistedEntryEntries = computed(() => {
  return entrySequence.value
})

const persistedEntryMethodType = computed(() => {
  if (activeMultipleEntries.value.length > 0) return entryMethodType.value
  if (pyramidingEntries.value.length > 0) return 'PYRAMIDING'
  if (averagingDownEntries.value.length > 0) return 'AVERAGING_DOWN'
  return 'SINGLE'
})

const hasEntryMethodPositions = computed(() => (
  pyramidingEntries.value.length > 0 || averagingDownEntries.value.length > 0
))

const entryMethodEnabled = computed(() => entrySequence.value.length > 0)

const getEntryPositionNumber = (entryItem) => {
  const index = entrySequence.value.findIndex(entry => entry.id === entryItem?.id)
  return index >= 0 ? index + 1 : 1
}

const getEntryMethodPriceViolations = (entries, methodType) => {
  const firstPrice = parseFloat(entrySequence.value[0]?.price)
  if (!Number.isFinite(firstPrice) || firstPrice <= 0) return []

  const isPyramiding = methodType === 'PYRAMIDING'
  return entries.reduce((violations, entryItem, index) => {
    const sequenceIndex = entrySequence.value.findIndex(entry => entry.id === entryItem.id)
    if (sequenceIndex === 0) return violations
    const price = parseFloat(entryItem?.price)
    if (!Number.isFinite(price) || price <= 0) return violations

    const isValid = isPyramiding ? price > firstPrice : price < firstPrice
    if (!isValid) violations.push(index)
    return violations
  }, [])
}

const entryMethodPriceViolations = computed(() => (
  getEntryMethodPriceViolations(activeMultipleEntries.value, entryMethodType.value)
))

const hasPyramidingPriceViolation = computed(() => (
  getEntryMethodPriceViolations(pyramidingEntries.value, 'PYRAMIDING').length > 0
))

const hasAveragingDownPriceViolation = computed(() => (
  getEntryMethodPriceViolations(averagingDownEntries.value, 'AVERAGING_DOWN').length > 0
))

const hasEntryMethodPriceViolation = computed(() => entryMethodPriceViolations.value.length > 0)

const entryMethodPriceViolationMessage = computed(() => {
  if (!hasEntryMethodPriceViolation.value) return ''
  return entryMethodType.value === 'PYRAMIDING'
    ? (locale.value === 'ru'
      ? 'Пирамидинг: цена каждой следующей позиции должна быть выше цены первой позиции.'
      : 'Pyramiding: each subsequent position price must be above the first position price.')
    : (locale.value === 'ru'
      ? 'Усреднение: цена каждой следующей позиции должна быть ниже цены первой позиции.'
      : 'Averaging: each subsequent position price must be below the first position price.')
})

const hasActiveMethodNode = computed(() => {
  const pType = entryMethodType.value === 'PYRAMIDING' ? 'pyramiding' : 'averaging'
  return getNodesForStrategy(pType).length > 0
})

const addMultipleEntry = () => {
  const entry = {
    id: `${Date.now()}-${entrySequence.value.length}`,
    price: '',
    size: '',
    method: entryMethodType.value
  }
  activeMultipleEntries.value.push(entry)
  entrySequence.value.push(entry)
}

// Exit State
const exitEntries = ref([])
const exitEntriesSizeLinked = ref(true)
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
  if (!isClosed.value) return
  const remaining = Math.max(0, totalSize.value - totalExitSize.value)
  exitEntries.value.push({ id: Date.now(), price: '', size: remaining > 0 ? remaining.toFixed(2) : '' })
}

const setExitSizeManual = () => {
  exitEntriesSizeLinked.value = false
}

const removeExitEntry = (id) => {
  exitEntries.value = exitEntries.value.filter(e => e.id !== id)
  if (exitEntries.value.length === 0) exitEntriesSizeLinked.value = true
}

const removeMultipleEntry = (id) => {
  if (entryMethodType.value === 'PYRAMIDING') {
    pyramidingEntries.value = pyramidingEntries.value.filter(e => e.id !== id)
  } else {
    averagingDownEntries.value = averagingDownEntries.value.filter(e => e.id !== id)
  }
  entrySequence.value = entrySequence.value.filter(e => e.id !== id)
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
    size: baseLots,
    method: methodMode
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
      size: s.lots,
      method: methodMode
    })
    
    currentBase = calculatedPrice
  }

  if (methodMode === 'PYRAMIDING') {
    pyramidingEntries.value.push(...newEntries)
  } else {
    averagingDownEntries.value.push(...newEntries)
  }
  entrySequence.value.push(...newEntries)

  showAutoPrompt.value = false
}

const totalSize = computed(() => {
  if (!hasEntryMethodPositions.value) return parseFloat(size.value) || 0
  return entrySequence.value.reduce((sum, e) => sum + (parseFloat(e.size) || 0), 0)
})

watch(totalSize, (nextTotalSize) => {
  if (!exitEntriesSizeLinked.value || exitEntries.value.length !== 1) return
  exitEntries.value[0].size = nextTotalSize > 0 ? nextTotalSize.toFixed(2) : ''
})

const averageEntry = computed(() => {
  if (!hasEntryMethodPositions.value) return parseFloat(entry.value) || 0
  
  let totalValue = 0
  let totalQty = 0
  entrySequence.value.forEach(e => {
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
const isHydratingInitialTrade = ref(false)
watch(asset, () => {
  if (isHydratingInitialTrade.value) return
  overridePnl.value = null 
  resultMode.value = 'auto'
}, { flush: 'sync' })

const setResultMode = (mode) => {
  if (!isClosed.value) return
  resultMode.value = mode
  if (mode === 'auto') overridePnl.value = null
}

const handlePnlInput = (event) => {
  const target = event?.target
  const sanitized = sanitizeDecimalInputValue(target?.value ?? '', { allowNegative: true })

  if (target && target.value !== sanitized) target.value = sanitized

  if (!sanitized.trim()) {
    setResultMode('auto')
    return
  }

  if (!isClosed.value) return
  resultMode.value = 'manual'
  overridePnl.value = sanitized
}

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

const toTradeNumber = (value) => {
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

const toPositiveTradeNumber = (value) => {
  const parsed = toTradeNumber(value)
  return parsed > 0 ? parsed : Number.NaN
}

const tradeEntryPrice = computed(() => {
  return hasEntryMethodPositions.value ? averageEntry.value : toPositiveTradeNumber(entry.value)
})

const tradePositionSize = computed(() => {
  return totalSize.value
})

const getDirectionalStopDistance = (entryPrice, stopPrice) => {
  if (!Number.isFinite(entryPrice) || !Number.isFinite(stopPrice)) return Number.NaN
  if (side.value === 'short') return stopPrice > entryPrice ? stopPrice - entryPrice : Number.NaN
  return stopPrice < entryPrice ? entryPrice - stopPrice : Number.NaN
}

const getDirectionalTargetDistance = (entryPrice, targetPrice) => {
  if (!Number.isFinite(entryPrice) || !Number.isFinite(targetPrice)) return Number.NaN
  if (side.value === 'short') return targetPrice < entryPrice ? entryPrice - targetPrice : Number.NaN
  return targetPrice > entryPrice ? targetPrice - entryPrice : Number.NaN
}

const calculateGrossPriceMoveDollars = (entryPrice, exitPrice, quantity) => {
  if (![entryPrice, exitPrice, quantity].every(Number.isFinite) || quantity <= 0) return Number.NaN

  if (isForex.value) {
    const symbol = asset.value.toUpperCase().replace('/', '')
    const base = symbol.substring(0, 3)
    const quote = symbol.substring(3, 6)
    const isJpy = symbol.includes('JPY')
    const priceMove = side.value === 'long' ? (exitPrice - entryPrice) : (entryPrice - exitPrice)
    const pips = isJpy ? priceMove * 100 : priceMove * 10000
    const pipValue = quantity * 10

    if (quote === 'USD') return pips * pipValue
    if (isJpy) return (pips * pipValue * 100) / getRate('JPY')
    if (base === 'USD') return (pips * pipValue) / exitPrice

    const quoteToUsdRate = 1 / getRate(quote)
    return (pips * pipValue) * quoteToUsdRate
  }

  const priceMove = side.value === 'long' ? (exitPrice - entryPrice) : (entryPrice - exitPrice)
  if (currentAssetData.value?.contractSize) {
    const rawProfit = priceMove * quantity * currentAssetData.value.contractSize
    const assetCurrency = currentAssetData.value.currency || 'USD'
    return assetCurrency !== 'USD' ? rawProfit / getRate(assetCurrency) : rawProfit
  }

  return priceMove * quantity
}

const calculateTradeFeeDollars = (price, quantity, fee) => {
  const parsedFee = parseFloat(fee)
  if (!Number.isFinite(parsedFee) || parsedFee <= 0) return 0
  if (feeType.value !== '%') return parsedFee
  if (![price, quantity].every(Number.isFinite) || price <= 0 || quantity <= 0) return 0

  let notional = price * quantity
  if (currentAssetData.value?.contractSize) {
    notional *= currentAssetData.value.contractSize
    const assetCurrency = currentAssetData.value.currency || 'USD'
    if (assetCurrency !== 'USD') {
      notional /= getRate(assetCurrency)
    }
  }

  return (notional * parsedFee) / 100
}

const riskInputViolationMessage = computed(() => {
  const e = tradeEntryPrice.value
  if (!Number.isFinite(e) || e <= 0) return null

  const sl = toPositiveTradeNumber(stopLoss.value)
  const tp = toPositiveTradeNumber(takeProfit.value)
  const isRu = locale.value === 'ru'

  if (side.value === 'short') {
    if (Number.isFinite(sl) && sl <= e) {
      return isRu ? 'Для SHORT stop loss должен быть выше entry.' : 'For SHORT, stop loss must be above entry.'
    }
    if (Number.isFinite(tp) && tp >= e) {
      return isRu ? 'Для SHORT take profit должен быть ниже entry.' : 'For SHORT, take profit must be below entry.'
    }
    return null
  }

  if (Number.isFinite(sl) && sl >= e) {
    return isRu ? 'Для LONG stop loss должен быть ниже entry.' : 'For LONG, stop loss must be below entry.'
  }
  if (Number.isFinite(tp) && tp <= e) {
    return isRu ? 'Для LONG take profit должен быть выше entry.' : 'For LONG, take profit must be above entry.'
  }
  return null
})

const hasRiskInputViolation = computed(() => !!riskInputViolationMessage.value)

// ─── Risk Violation Detection ────────────────────────────────────────────────
const actualRiskDollars = computed(() => {
  const e = tradeEntryPrice.value
  const sl = toPositiveTradeNumber(stopLoss.value)
  const s = tradePositionSize.value
  const stopDistance = getDirectionalStopDistance(e, sl)
  if (!Number.isFinite(stopDistance) || !Number.isFinite(s) || s <= 0) return null

  const risk = Math.abs(calculateGrossPriceMoveDollars(e, sl, s))
  return Number.isFinite(risk) ? risk : null
})

const actualRiskPercent = computed(() => {
  if (actualRiskDollars.value === null || currentCapital.value <= 0) return null
  return (actualRiskDollars.value / currentCapital.value) * 100
})

const actualRR = computed(() => {
  const e = tradeEntryPrice.value
  const tp = toPositiveTradeNumber(takeProfit.value)
  const sl = toPositiveTradeNumber(stopLoss.value)
  const reward = getDirectionalTargetDistance(e, tp)
  const risk = getDirectionalStopDistance(e, sl)
  if (!Number.isFinite(reward) || !Number.isFinite(risk) || risk === 0) return null
  return reward / risk
})

const tradeDurationHours = computed(() => {
  if (!isClosed.value) return null
  const start = cloneDate(openDate.value).getTime()
  const end = cloneDate(exitDate.value).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  return (end - start) / (1000 * 60 * 60)
})

const formatTradeDuration = (hours) => {
  if (!Number.isFinite(hours) || hours <= 0) return 'N/A'
  const totalMinutes = Math.round(hours * 60)
  const days = Math.floor(totalMinutes / (24 * 60))
  const hrs = Math.floor((totalMinutes % (24 * 60)) / 60)
  const mins = totalMinutes % 60
  const isRu = locale.value === 'ru'
  const parts = []
  if (days > 0) parts.push(`${days}${isRu ? 'д' : 'd'}`)
  if (hrs > 0 || days > 0) parts.push(`${hrs}${isRu ? 'ч' : 'h'}`)
  if (mins > 0 || parts.length === 0) parts.push(`${mins}${isRu ? 'м' : 'm'}`)
  return parts.join(' ')
}

const tradingStyleDurationLimit = computed(() => {
  const style = String(activeRiskManagement.value.tradingStyle || '').toUpperCase()
  const extraType = activeRiskManagement.value.tradingStyleExtraType
  if (extraType === 0 || style.includes('DAY')) {
    return { maxHours: 24, maxExclusive: true, label: 'DAY_TRADING' }
  }
  if (extraType === 1 || style.includes('SWING')) {
    return { minHours: 24, label: 'SWING_TRADING' }
  }
  if (extraType === 2 || style.includes('INVEST')) {
    return { minHours: 90 * 24, label: 'INVESTING' }
  }
  return null
})

const violatesTradingStyleDuration = computed(() => {
  const limit = tradingStyleDurationLimit.value
  const hours = tradeDurationHours.value
  if (!limit || !Number.isFinite(hours)) return false
  if (limit.minHours !== undefined && hours < limit.minHours) return true
  if (limit.maxHours !== undefined) {
    return limit.maxExclusive ? hours >= limit.maxHours : hours > limit.maxHours
  }
  return false
})

const tradingStyleViolationMessage = computed(() => {
  if (!violatesTradingStyleDuration.value) return null
  return locale.value === 'ru'
    ? 'НАРУШЕНО ПРАВИЛО СТИЛЯ ТОРГОВЛИ'
    : 'YOU VIOLATE TRADE STYLE RULE'
})

const requiredTradingStyleDurationLabel = computed(() => {
  const limit = tradingStyleDurationLimit.value
  if (!limit) return null
  const isRu = locale.value === 'ru'

  if (limit.maxHours === 24 && limit.maxExclusive) return isRu ? '< 24ч' : '< 24h'
  if (limit.maxHours !== undefined) return isRu ? `до ${formatTradeDuration(limit.maxHours)}` : `up to ${formatTradeDuration(limit.maxHours)}`
  if (limit.minHours !== undefined) return isRu ? `от ${formatTradeDuration(limit.minHours)}` : `from ${formatTradeDuration(limit.minHours)}`
  return null
})

const actualTradeDurationLabel = computed(() => {
  return Number.isFinite(tradeDurationHours.value) ? formatTradeDuration(tradeDurationHours.value) : 'N/A'
})

const violatesRR = computed(() => {
  const required = activeRiskManagement.value.riskRewardRatio
  if (!required || actualRR.value === null) return false
  return actualRR.value < required
})

const violatesRiskPerTrade = computed(() => {
  const required = activeRiskManagement.value.riskPerTradeValue
  const unit = activeRiskManagement.value.riskPerTradeUnit
  if (!required || actualRiskDollars.value === null) return false
  const riskLimit = unit === '%' ? (required / 100) * currentCapital.value : required
  return actualRiskDollars.value > riskLimit
})

const riskViolationMessage = computed(() => {
  if (riskInputViolationMessage.value) return riskInputViolationMessage.value
  const rrViol = violatesRR.value
  const rptViol = violatesRiskPerTrade.value
  const styleViol = violatesTradingStyleDuration.value
  const messages = []
  const isRu = locale.value === 'ru'

  if (rrViol && rptViol) {
    messages.push(isRu ? 'НАРУШЕНЫ ОБА ПРАВИЛА РИСКА' : 'YOU VIOLATE BOTH RISK RULES')
  } else if (rrViol) {
    messages.push(isRu ? 'НАРУШЕНО ПРАВИЛО RISK REWARD' : 'YOU VIOLATE RISK REWARD RULE')
  } else if (rptViol) {
    messages.push(isRu ? 'НАРУШЕНО ПРАВИЛО РИСКА НА СДЕЛКУ' : 'YOU VIOLATE RISK PER TRADE RULE')
  }

  if (styleViol && tradingStyleViolationMessage.value) {
    messages.push(tradingStyleViolationMessage.value)
  }

  return messages.length ? messages.join(' / ') : null
})

const normalizeRiskInputs = () => {
  const e = tradeEntryPrice.value
  if (!Number.isFinite(e) || e <= 0) return

  const sl = toPositiveTradeNumber(stopLoss.value)
  const tp = toPositiveTradeNumber(takeProfit.value)

  if (side.value === 'short') {
    if (Number.isFinite(sl) && sl <= e) stopLoss.value = ''
    if (Number.isFinite(tp) && tp >= e) takeProfit.value = ''
    return
  }

  if (Number.isFinite(sl) && sl >= e) stopLoss.value = ''
  if (Number.isFinite(tp) && tp <= e) takeProfit.value = ''
}

watch([side, tradeEntryPrice], normalizeRiskInputs)

// Time Data
const detectUserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch (e) {
    return 'UTC'
  }
}

const FALLBACK_TIME_ZONES = [
  'UTC',
  'Europe/London',
  'Europe/Podgorica',
  'Europe/Berlin',
  'Europe/Moscow',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney'
]

const supportedTimeZones = computed(() => {
  let zones = FALLBACK_TIME_ZONES
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      zones = Intl.supportedValuesOf('timeZone')
    }
  } catch (e) {}

  return Array.from(new Set([detectUserTimeZone(), ...zones])).sort()
})

const getTimeZoneOffsetLabel = (timeZone) => {
  const zone = String(timeZone || '').trim()
  if (!zone) return ''
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'shortOffset'
    }).formatToParts(new Date())
    return parts.find(part => part.type === 'timeZoneName')?.value || ''
  } catch (e) {
    return ''
  }
}

const tradeTimeZone = ref(detectUserTimeZone())
const tradeTimeZoneOffset = computed(() => getTimeZoneOffsetLabel(tradeTimeZone.value))
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
  if (!isClosed.value) return null
  const en = hasEntryMethodPositions.value ? averageEntry.value : parseFloat(entry.value)
  const ex = exitMethodEnabled.value ? averageExit.value : parseFloat(exit.value)
  const sz = exitMethodEnabled.value ? totalExitSize.value : (hasEntryMethodPositions.value ? totalSize.value : parseFloat(size.value))
  if (isNaN(en) || isNaN(ex) || isNaN(sz)) return null

  const finalProfit = calculateGrossPriceMoveDollars(en, ex, sz)
  if (!Number.isFinite(finalProfit)) return null

  const entryFeeSize = hasEntryMethodPositions.value ? totalSize.value : parseFloat(size.value)
  const exitFeeSize = sz
  const eFee = calculateTradeFeeDollars(en, entryFeeSize, entryFee.value)
  const xFee = calculateTradeFeeDollars(ex, exitFeeSize, exitFee.value)
  
  return finalProfit - (eFee + xFee)
})

const hasValidProjection = computed(() => {
  if (!isClosed.value) return false
  if (resultMode.value === 'manual' && overridePnl.value !== null && overridePnl.value !== '') return true
  return projectedProfit.value !== null
})

const equityCurveTrades = computed(() => {
  let historical = tradeStore.getTradesForStrategy(selectedStrategyId.value)
    .filter(t => t?.isClosed !== false)
  
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
    tempDateParts.value[k] = parts[k]
  })
}

const openTemporal = (target) => {
  activeTemporalTarget.value = target
  syncTempParts()
  isTemporalOpen.value = true
}

const setActiveTemporalToNow = () => {
  if (activeTemporalTarget.value === 'open') openDate.value = new Date()
  else exitDate.value = new Date()
  syncTempParts()
}

const cloneOpenTemporalToExit = () => {
  exitDate.value = cloneDate(openDate.value)
  if (activeTemporalTarget.value === 'exit') syncTempParts()
}

watch(activeTemporalTarget, () => {
  if (isTemporalOpen.value) syncTempParts()
})

const scrollContainer = ref(null)

const pnl = computed({
  get: () => {
    if (!isClosed.value) return 0
    return (resultMode.value === 'manual' && overridePnl.value !== null) ? overridePnl.value : (projectedProfit.value || 0)
  },
  set: (val) => {
    if (!isClosed.value) return
    if (val === null || val === undefined || String(val).trim() === '') {
      setResultMode('auto')
      return
    }
    resultMode.value = 'manual'
    overridePnl.value = val
  }
})

const commitState = ref('idle')
const showTradeSummary = ref(false)
const savedTradeSummary = ref(null)

watch(isClosed, (closed) => {
  if (closed) return
  exit.value = ''
  exitFee.value = ''
  exitEntries.value = []
  exitEntriesSizeLinked.value = true
  overridePnl.value = null
  resultMode.value = 'auto'
})

const resetForm = () => {
  asset.value = ''
  side.value = 'long'
  isClosed.value = true
  entry.value = ''
  exit.value = ''
  size.value = ''
  stopLoss.value = ''
  takeProfit.value = ''
  activeConditions.value.clear()
  activeConditionScenarioIds.value.clear()
  selectedEmotions.value = []
  journalEntries.value = []
  notesList.value = []
  archiveMode.value = 'notes'
  openDate.value = new Date()
  exitDate.value = new Date()
  tradeTimeZone.value = detectUserTimeZone()
  overridePnl.value = null
  resultMode.value = 'auto'
  selectedRegistryScenarioId.value = null
  showConditionLibrary.value = false
  showEntryMethod.value = false
  showTradeStudyMetrics.value = false
  resetTradeStudyMetrics()
  activeProtocolTab.value = 'PYRAMIDING'
  entryMethodType.value = 'PYRAMIDING'
  pyramidingEntries.value = []
  averagingDownEntries.value = []
  entrySequence.value = []
  exitEntries.value = []
  exitEntriesSizeLinked.value = true
  showEmotionSelector.value = false
  viewMode.value = 'tactical'
  isTemporalOpen.value = false
  syncTempParts()
}

const submit = async () => {
  const finalEntry = hasEntryMethodPositions.value ? averageEntry.value : +entry.value
  const finalExit = isClosed.value ? (exitMethodEnabled.value ? averageExit.value : +exit.value) : undefined
  const finalSize = totalSize.value
  const committedOpenDate = cloneDate(openDate.value)
  const committedExitDate = cloneDate(exitDate.value)
  const committedTimeZone = String(tradeTimeZone.value || detectUserTimeZone()).trim() || detectUserTimeZone()
  const plannedRiskReward = activeRiskSnapshot.value?.riskRewardRatio ?? undefined
  const commitStrategyId = selectedStrategyId.value || 'MAIN_DIARY'

  if (!finalEntry || (isClosed.value && !finalExit) || !finalSize) return false
  if (hasEntryMethodPriceViolation.value) return false
  if (riskInputViolationMessage.value) {
    normalizeRiskInputs()
    activeSector.value = 'risk'
    return false
  }
  if (commitState.value !== 'idle') return false
  
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
       let conditionAdded = false
       // We traverse the indicator units within each condition node
       // and extract ONLY the specifically selected indicators.
       if (c.indicatorUnits) {
          c.indicatorUnits.forEach(u => {
             if (u.type === 'bundle') {
                u.items?.forEach(i => {
                   if (isConditionActive(i.id, scenId)) {
                      activeResults.push({
                         id: i.id,
                         info: { 
                            name: (i.label || '').toUpperCase(), 
                            description: i.description || '',
                            priority: i.priority || c.priority || 'NONE'
                         }
                      })
                      conditionAdded = true
                   }
                })
             } else if (u.type === 'single' && u.item) {
                if (isConditionActive(u.item.id, scenId)) {
                   activeResults.push({
                      id: u.item.id,
                      info: { 
                         name: (u.item.label || '').toUpperCase(), 
                         description: u.item.description || '',
                         priority: u.item.priority || c.priority || 'NONE'
                      }
                   })
                   conditionAdded = true
                }
             }
          })
       }

       // Special case: If the condition node itself is the selected entity 
       // (e.g. standalone condition with no internal indicators), we add it.
       if (!conditionAdded && isConditionActive(c.id, scenId)) {
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
    const requiredConds = getScenarioRequiredConditionsSnapshot(s.id)
    
    // Virtual Scenario Handling for System Protocols
    if (s.id === SYSTEM_EXIT_SCENARIO_ID) {
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
            conditions: enrichedConds,
            requiredConditions: requiredConds
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
        conditions: activeConds,
        requiredConditions: requiredConds
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

  const boardRequiredConditionsEntry = activeEntry?.id
    ? getScenarioRequiredConditionsSnapshot(activeEntry.id)
    : []
  const boardRequiredConditionsExit = (activeExit || activeMini)?.id
    ? getScenarioRequiredConditionsSnapshot((activeExit || activeMini).id)
    : []

  const builtExecutions = []
  if (hasEntryMethodPositions.value) {
    persistedEntryEntries.value.forEach(e => {
       if (e.price && e.size) {
         builtExecutions.push({
           id: e.id.toString(),
           type: 'entry',
           side: side.value === 'long' ? 'Long' : 'Short',
           price: parseFloat(e.price) || 0,
           size: parseFloat(e.size) || 0,
           date: cloneDate(committedOpenDate),
           timeZone: committedTimeZone,
           label: e.method || persistedEntryMethodType.value
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
         timeZone: committedTimeZone,
         label: 'SINGLE'
    })
  }

  if (isClosed.value && exitMethodEnabled.value) {
    exitEntries.value.forEach(e => {
       if (e.price && e.size) {
         builtExecutions.push({
           id: e.id.toString(),
           type: 'exit',
           side: 'Close',
           price: parseFloat(e.price) || 0,
           size: parseFloat(e.size) || 0,
           date: cloneDate(committedExitDate),
           timeZone: committedTimeZone,
           label: 'EXIT_SCALE'
         })
       }
    })
  } else if (isClosed.value) {
    builtExecutions.push({
         id: Date.now().toString() + 'ex',
         type: 'exit',
         side: 'Close',
         price: parseFloat(exit.value) || 0,
         size: totalSize.value || parseFloat(size.value) || 0,
         date: cloneDate(committedExitDate),
         timeZone: committedTimeZone,
         label: 'SINGLE'
    })
  }

  const newTrade = {
    id: Date.now().toString(),
    asset: asset.value || 'UNTITLED',
    side: side.value === 'long' ? 'Long' : 'Short',
    entry: hasEntryMethodPositions.value ? averageEntry.value : +entry.value,
    exit: isClosed.value ? (exitMethodEnabled.value ? averageExit.value : +exit.value) : undefined,
    size: totalSize.value,
    executions: builtExecutions,
    isClosed: isClosed.value,
    status: isClosed.value ? 'closed' : 'open',
    timeZone: committedTimeZone,
    stopLoss: +stopLoss.value,
    takeProfit: +takeProfit.value,
    date: cloneDate(committedOpenDate),
    dateExit: isClosed.value ? cloneDate(committedExitDate) : undefined,
    profitInCurrency: isClosed.value ? pnl.value : undefined,
    resultMode: isClosed.value ? resultMode.value : undefined,
    profitInPercent: isClosed.value
      ? ((Number(pnl.value) || 0) / ((Number.isFinite(Number(currentCapital.value)) && Number(currentCapital.value) > 0) ? Number(currentCapital.value) : (Number(tradeStore.getInitialDeposit(commitStrategyId)) || 1000))) * 100
      : undefined,
    capitalBeforeTrade: currentCapital.value,
    assetType: currentAssetData.value?.type || 'Forex',
    strategyId: commitStrategyId,
    strategyVersionId: commitStrategyVersionId.value,
    entryMethodType: persistedEntryMethodType.value,
    exitMethodType: exitMethodEnabled.value ? 'EXIT_SCALE' : 'SINGLE',
    boardScenarioEntryId: activeEntry?.id || undefined,
    boardScenarioExitId: isClosed.value ? ((activeExit || activeMini)?.id || undefined) : undefined,
    risk: actualRiskDollars.value !== null ? actualRiskDollars.value : undefined,
    riskPercent: actualRiskPercent.value,
    riskReward: actualRR.value ?? plannedRiskReward,
    tradeDuration: actualTradeDurationLabel.value,
    tradingStyle: activeRiskManagement.value.tradingStyle || undefined,
    riskManagement: activeRiskSnapshot.value || undefined,
    entryFee: +entryFee.value || 0,
    exitFee: +exitFee.value || 0,
    feeType: feeType.value,
    emotions: [...selectedEmotions.value],
    boardScenarioEntry: formatScen(activeEntry, tradeStore.getTradesForStrategy(selectedStrategyId.value), side.value),
    boardScenarioExit: isClosed.value ? formatScen(activeExit || activeMini, tradeStore.getTradesForStrategy(selectedStrategyId.value), side.value) : undefined,
    boardRequiredConditionsEntry,
    boardRequiredConditionsExit,
    images: journalEntries.value.map(e => ({
      url: e.image,
      name: e.name || '',
      tags: Array.isArray(e.tags) ? e.tags : [],
      createdAt: e.createdAt || new Date().toISOString(),
      context: e.context || ''
    })).filter(img => img.url),
    notes: props.initialTrade?.notes ?? '',
    notesList: [...notesList.value],
    tradeStudyMetrics: { ...tradeStudyMetrics.value }
  }

  commitState.value = 'loading'

  try {
    if (props.initialTrade) {
      const updatedTrade = { ...props.initialTrade, ...newTrade, id: props.initialTrade.id }
      await tradeStore.updateTrade(commitStrategyId, updatedTrade.id, updatedTrade)
      emit('updateTrade', updatedTrade)
    } else {
      await tradeStore.addTrade(commitStrategyId, newTrade)
      emit('addTrade', newTrade)
    }

    return true
  } catch (error) {
    console.error('Failed to persist trade:', error)
    return false
  } finally {
    commitState.value = 'idle'
  }
}


  return {
    themeStore,
    isDark,
    viewMode,
    archiveMode,
    journalEntries,
    notesList,
    getArchiveNodeName,
    addJournalEntry,
    removeJournalEntry,
    addNote,
    removeNote,
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
    assetTypeFilter,
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
    currentCapital,
    activeRiskPerTradeDollars,
    activeRiskSnapshot,
    actualRR,
    actualRiskDollars,
    actualRiskPercent,
    violatesRR,
    violatesRiskPerTrade,
    violatesTradingStyleDuration,
    requiredTradingStyleDurationLabel,
    actualTradeDurationLabel,
    riskViolationMessage,
    riskInputViolationMessage,
    hasRiskInputViolation,
    sanitizeTradeNumberInput,
    normalizeRiskInputs,
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
    isConditionActive,
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
    getRequiredConditionsSnapshotForScenarios,
    activeSector,
    sectors,
    side,
    isClosed,
    entry,
    exit,
    size,
    entryFee,
    exitFee,
    feeType,
    resultMode,
    setResultMode,
    handlePnlInput,
    showEntryMethod,
    showTradeStudyMetrics,
    tradeStudyMetrics,
    persistGeneratedTradeStudyMetrics,
    resetTradeStudyMetrics,
    activeProtocolTab,
    entryMethodType,
    pyramidingEntries,
    averagingDownEntries,
    entrySequence,
    activeMultipleEntries,
    getEntryPositionNumber,
    hasEntryMethodPositions,
    entryMethodEnabled,
    entryMethodPriceViolations,
    hasEntryMethodPriceViolation,
    entryMethodPriceViolationMessage,
    hasPyramidingPriceViolation,
    hasAveragingDownPriceViolation,
    hasActiveMethodNode,
    addMultipleEntry,
    exitEntries,
    exitMethodEnabled,
    exitEntriesSizeLinked,
    totalExitSize,
    averageExit,
    addExitEntry,
    setExitSizeManual,
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
    tradeTimeZone,
    supportedTimeZones,
    tradeTimeZoneOffset,
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
    setActiveTemporalToNow,
    cloneOpenTemporalToExit,
    scrollContainer,
    pnl,
    commitState,
    showTradeSummary,
    savedTradeSummary,
    resetForm,
    submit,
    initialTrade: props.initialTrade
  }
}
