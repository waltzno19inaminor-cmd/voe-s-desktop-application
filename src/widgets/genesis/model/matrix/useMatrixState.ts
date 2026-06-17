import { ref, computed, watch } from 'vue'
import { saveToDisk, loadFromDisk } from '@/shared/diskStorage'
import { useStrategyTradesStore } from '@/features/store/useStrategyTrades'
import { useAppBootStore } from '~/features/store/useAppBoot'

export const STORAGE_KEY = 'genesis_matrix_v2'

export interface Point { x: number; y: number }
export interface Node {
  id: string
  label: string
  type: string
  x: number
  y: number
  color: string
  params: any
  isRoot?: boolean
  subGraph?: {
    nodes: Node[]
    connections: Connection[]
    zones: Zone[]
  }
}
export interface Connection {
  fromId: string
  toId: string
  fromPort?: 'left' | 'right' | 'top' | 'bottom'
  toPort?: 'left' | 'right' | 'top' | 'bottom'
  label?: string
  bundleId?: string
  bundleStemX?: number
  bundleStemY?: number
}
export interface Zone {
  id: string
  type: 'entry' | 'in-trade' | 'exit' | 'session'
  x: number
  y: number
  width: number
  height: number
  label: string
}

export type MenuCategory =
  | 'LOGIC'
  | 'METHODS'
  | 'DATA'
  | 'DOMAINS'
  | 'INDICATORS'
  | 'EMOTIONS'
  | 'STEPS'
  | 'SCALING'
  | 'RISK'
  | 'SYSTEM'
  | 'TEXT_FORMAT'
  | 'SCENARIO_DOCS'
  | 'SCENARIO_VISUALS'
  | 'SCENARIO_AUDIO'
  | 'LABELS'

// Singleton reactive state
const rootNodes = ref<Node[]>([
  { id: 'root', label: 'STRATEGY_CORE', type: 'strategy', x: 200, y: 300, color: 'currentColor', params: { value: 'System_Init' }, isRoot: true }
])
const rootConnections = ref<Connection[]>([])
const rootZones = ref<Zone[]>([])

const navigationStack = ref<string[]>([])
const savedScales = new Map<string, number>()

const viewState = ref({
  panX: typeof window !== 'undefined' ? window.innerWidth / 2 : 400,
  panY: typeof window !== 'undefined' ? window.innerHeight / 2 : 300,
  scale: 0.5,
  isPanning: false
})

const lastSelectedId = ref<string | null>('root')
const isCommentDragging = ref(false)
const activeDrawingNodeId = ref<string | null>(null)
const activeTextNodeId = ref<string | null>(null)
const activeMenuCategory = ref<MenuCategory | null>('LOGIC')
const activeEmotionTab = ref<'NEGATIVE' | 'POSITIVE' | 'NEUTRAL'>('NEGATIVE')
const personalIndicators = ref<any[]>([])
const updateKey = ref(0)
const pendingNodeConfig = ref<any | null>(null)

export function useMatrixState() {
  const forceUpdate = () => updateKey.value++

  const handleNodeMoved = () => {
    forceUpdate()
    saveMatrixData()
  }

  const activeContextId = computed(() => navigationStack.value[navigationStack.value.length - 1] || null)

  const activeContextNode = computed(() => {
    if (!activeContextId.value) return null
    return findNodeById(rootNodes.value, activeContextId.value)
  })

  const isScenarioContext = computed(() => {
    const t = activeContextNode.value?.type
    return t && t !== 'strategy'
  })

  // Viewport context getters/setters
  const nodes = computed<Node[]>({
    get: () => {
      if (activeContextId.value && activeContextNode.value) {
        return activeContextNode.value.subGraph?.nodes || []
      }
      return rootNodes.value
    },
    set: (val) => {
      if (activeContextId.value && activeContextNode.value) {
        if (!activeContextNode.value.subGraph) activeContextNode.value.subGraph = { nodes: [], connections: [], zones: [] }
        activeContextNode.value.subGraph.nodes = val
      } else {
        rootNodes.value = val
      }
    }
  })

  const connections = computed<Connection[]>({
    get: () => {
      if (activeContextId.value && activeContextNode.value) {
        return activeContextNode.value.subGraph?.connections || []
      }
      return rootConnections.value
    },
    set: (val) => {
      if (activeContextId.value && activeContextNode.value) {
        if (!activeContextNode.value.subGraph) activeContextNode.value.subGraph = { nodes: [], connections: [], zones: [] }
        activeContextNode.value.subGraph.connections = val
      } else {
        rootConnections.value = val
      }
    }
  })

  const zones = computed<Zone[]>({
    get: () => {
      if (activeContextId.value && activeContextNode.value) {
        return activeContextNode.value.subGraph?.zones || []
      }
      return rootZones.value
    },
    set: (val) => {
      if (activeContextId.value && activeContextNode.value) {
        if (!activeContextNode.value.subGraph) activeContextNode.value.subGraph = { nodes: [], connections: [], zones: [] }
        activeContextNode.value.subGraph.zones = val
      } else {
        rootZones.value = val
      }
    }
  })

  const shouldShowInitializePrompt = computed(() => (
    isScenarioContext.value ? nodes.value.length === 0 : nodes.value.length === 1
  ))

  const bundleGroups = computed(() => {
    const groups: any[] = []
    const processed = new Set<string>()
    const parentSeen = new Set<string>()

    connections.value.forEach(conn => {
      if (conn.bundleId) {
        const key = conn.fromId + '_b_' + conn.bundleId
        if (processed.has(key)) return
        const siblings = connections.value.filter(c => c.fromId === conn.fromId && c.bundleId === conn.bundleId)
        groups.push({
          type: 'bundle',
          id: key,
          fromId: conn.fromId,
          bundleId: conn.bundleId,
          connections: siblings,
          isFirstForParent: !parentSeen.has(conn.fromId)
        })
        parentSeen.add(conn.fromId)
        processed.add(key)
      } else {
        const key = conn.fromId + '_s_' + conn.toId
        groups.push({
          type: 'simple',
          id: key,
          connection: conn
        })
        processed.add(key)
      }
    })
    return groups
  })

  const contentTransform = computed(() => ({
    transform: `translate(${viewState.value.panX}px, ${viewState.value.panY}px)`
  }))

  const effectiveSelectedNode = computed(() => {
    const node = lastSelectedId.value ? getNode(lastSelectedId.value) : null
    if (node?.type === 'placeholder') {
      const parentConn = connections.value.find(c => c.toId === node.id)
      return parentConn ? getNode(parentConn.fromId) : null
    }
    return node
  })

  const activeDrawingNode = computed(() => (
    activeDrawingNodeId.value ? findNodeById(rootNodes.value, activeDrawingNodeId.value) : null
  ))

  const activeTextNode = computed(() => (
    activeTextNodeId.value ? findNodeById(rootNodes.value, activeTextNodeId.value) : null
  ))

  const breadcrumbs = computed(() => {
    const list = navigationStack.value.map(id => {
      const node = findNodeById(rootNodes.value, id)
      return { id, label: node?.params?.customName || node?.label || 'SCENARIO' }
    })
    return [{ id: null, label: 'MAIN' }, ...list]
  })

  function getNode(id: string) {
    return nodes.value.find((n: Node) => n.id === id)
  }

  function findNodeById(list: Node[], id: string): Node | null {
    for (const node of list) {
      if (node.id === id) return node
      if (node.subGraph) {
        const found = findNodeById(node.subGraph.nodes, id)
        if (found) return found
      }
    }
    return null
  }

  function navigateTo(newStack: string[]) {
    const currentKey = navigationStack.value.join('/') || 'root'
    savedScales.set(currentKey, viewState.value.scale)

    navigationStack.value = newStack

    viewState.value.panX = 0
    viewState.value.panY = 0

    const newKey = newStack.join('/') || 'root'
    if (savedScales.has(newKey)) {
      viewState.value.scale = savedScales.get(newKey)!
    } else {
      viewState.value.scale = 1
    }
  }

  function goBack() {
    navigateTo(navigationStack.value.slice(0, -1))
  }

  function jumpTo(index: number | null) {
    if (index === null) {
      navigateTo([])
      return
    }
    navigateTo(navigationStack.value.slice(0, index + 1))
  }

  function selectNode(id: string | null) {
    lastSelectedId.value = id
    if (!id) {
      activeMenuCategory.value = null
      activeTextNodeId.value = null
      return
    }
    const node = getNode(id)

    if (node?.type === 'placeholder') {
      activeTextNodeId.value = null
      const parentConn = connections.value.find(c => c.toId === id)
      const parentNode = parentConn ? getNode(parentConn.fromId) : null
      activeMenuCategory.value = getMenuCategoryForNode(parentNode || null)
    } else {
      if (node?.type !== 'text-panel') activeTextNodeId.value = null
      activeMenuCategory.value = getMenuCategoryForNode(node || null)
    }
  }

  function getMenuCategoryForNode(node: Node | null): MenuCategory | null {
    if (!node) return null
    if (isScenarioContext.value) {
      if (node.type === 'text-panel') return 'TEXT_FORMAT'
      if (['checklist-panel', 'embed-panel', 'table-panel', 'image', 'drawing-panel', 'file-attachment', 'audio-note'].includes(node.type)) return null
      return 'SCENARIO_DOCS'
    }
    if (node.type === 'text-panel') return 'TEXT_FORMAT'
    if (node.type === 'condition' || node.type === 'indicator' || node.type === 'pattern' || node.type === 'smc') {
      return 'INDICATORS'
    } else if (node.type === 'emotion') {
      return 'EMOTIONS'
    } else if (node.type === 'emotion-state') {
      return null
    } else if (node.type === 'pyramiding' || node.type === 'averaging' || node.type === 'scaling-entry') {
      return 'SCALING'
    } else if (node.type === 'risk') {
      return 'RISK'
    }
    return 'LOGIC'
  }

  function addNode(typeOrConfig: any) {
    const config = typeof typeOrConfig === 'string'
      ? { type: typeOrConfig, label: typeOrConfig.toUpperCase(), params: {} }
      : typeOrConfig;

    const params = config.params ? { ...config.params } : {}
    if (config.description && !params.description) {
      params.description = config.description
    }

    const newNode: Node = {
      id: 'node-' + Math.random().toString(36).substr(2, 9),
      label: config.label || 'NODE',
      type: config.type || 'unknown',
      x: config.x !== undefined ? config.x : -viewState.value.panX / viewState.value.scale + 100,
      y: config.y !== undefined ? config.y : -viewState.value.panY / viewState.value.scale + 100,
      color: config.color || 'currentColor',
      params: params,
      ...(config.subGraph ? { subGraph: config.subGraph } : {})
    }

    if (activeContextId.value && activeContextNode.value) {
      if (!activeContextNode.value.subGraph) {
        activeContextNode.value.subGraph = { nodes: [], connections: [], zones: [] }
      }
      activeContextNode.value.subGraph.nodes.push(newNode)
    } else {
      rootNodes.value.push(newNode)
    }

    selectNode(newNode.id)
    saveMatrixData()
  }

  function setPendingNode(config: any) {
    pendingNodeConfig.value = typeof config === 'string'
      ? { type: config, label: config.toUpperCase(), params: {} }
      : config;
  }

  function removeNode(id: string) {
    const nodeToRemove = getNode(id)
    if (nodeToRemove?.type === 'condition' && activeMenuCategory.value === 'INDICATORS') {
      activeMenuCategory.value = null
    }
    if (lastSelectedId.value === id) {
      lastSelectedId.value = null
      activeMenuCategory.value = null
    }

    if (activeContextId.value && activeContextNode.value?.subGraph) {
      activeContextNode.value.subGraph.nodes = activeContextNode.value.subGraph.nodes.filter(n => n.id !== id)
      activeContextNode.value.subGraph.connections = activeContextNode.value.subGraph.connections.filter(c => c.fromId !== id && c.toId !== id)
    } else {
      rootNodes.value = rootNodes.value.filter(n => n.id !== id)
      rootConnections.value = rootConnections.value.filter(c => c.fromId !== id && c.toId !== id)
    }
    cleanupLogicBundles()
    saveMatrixData()
  }

  function clearNodeInputConnections(node: Node) {
    if (activeContextId.value && activeContextNode.value?.subGraph) {
      activeContextNode.value.subGraph.connections = activeContextNode.value.subGraph.connections.filter(c => c.toId !== node.id)
    } else {
      rootConnections.value = rootConnections.value.filter(c => c.toId !== node.id)
    }
    cleanupLogicBundles()
    saveMatrixData()
  }

  function clearNodeOutputConnections(node: Node) {
    if (activeContextId.value && activeContextNode.value?.subGraph) {
      activeContextNode.value.subGraph.connections = activeContextNode.value.subGraph.connections.filter(c => c.fromId !== node.id)
    } else {
      rootConnections.value = rootConnections.value.filter(c => c.fromId !== node.id)
    }
    cleanupLogicBundles()
    saveMatrixData()
  }

  function cleanupLogicBundles() {
    const bundles = new Map<string, Connection[]>()

    connections.value.forEach(c => {
      if (c.bundleId) {
        const key = `${c.fromId}_${c.bundleId}`
        if (!bundles.has(key)) bundles.set(key, [])
        bundles.get(key)!.push(c)
      }
    })

    bundles.forEach((conns) => {
      if (conns.length <= 1) {
        conns.forEach(c => {
          delete c.bundleId
          if (c.label?.toLowerCase() === 'and' || c.label?.toLowerCase() === 'or') {
            delete c.label
          }
          delete c.bundleStemX
          delete c.bundleStemY
        })
      }
    })
    forceUpdate()
  }

  function clearBoard() {
    const strategyTradesStore = useStrategyTradesStore()
    strategyTradesStore.purgeAllStrategies()

    rootNodes.value = [
      { id: 'root', label: 'STRATEGY_CORE', type: 'strategy', x: 200, y: 300, color: 'currentColor', params: { value: 'System_Init' }, isRoot: true }
    ]
    rootConnections.value = []
    rootZones.value = []
    navigationStack.value = []
    savedScales.clear()
    lastSelectedId.value = 'root'
    saveMatrixData()
  }

  function mergeNodes(indicatorId: string, configId: string) {
    // Config logic removed
  }

  function refreshMergeStatus() {
    // Config logic removed
  }

  const buildLogicalStructure = (parentId: string, allNodes: any[], allConnections: any[]) => {
    const conns = allConnections.filter(c => c.fromId === parentId)
    const bundles: Record<string, any> = {}
    const structure: any[] = []

    conns.forEach(c => {
      const toNode = allNodes.find(n => n.id === c.toId)
      if (!toNode || toNode.type === 'placeholder') return

      if (c.bundleId) {
        if (!bundles[c.bundleId]) {
          bundles[c.bundleId] = {
            id: c.bundleId,
            type: 'bundle',
            logic: (c.label || 'AND').toUpperCase(),
            nodeIds: []
          }
          structure.push(bundles[c.bundleId])
        }
        bundles[c.bundleId].nodeIds.push(toNode.id)
      } else {
        structure.push({
          id: toNode.id,
          type: 'single'
        })
      }
    })
    return structure
  }

  const processNodeTree = (node: any, allNodes: any[], allConnections: any[]): any => {
    const structure = buildLogicalStructure(node.id, allNodes, allConnections)
    const newNode = {
      ...node,
      params: {
        ...node.params,
        logicalStructure: structure
      }
    }

    if (newNode.subGraph && newNode.subGraph.nodes) {
      newNode.subGraph.nodes = newNode.subGraph.nodes
        .map((n: any) => processNodeTree(n, newNode.subGraph!.nodes, newNode.subGraph!.connections))
        .filter((n: any) => n.type !== 'placeholder')
    }

    return newNode
  }

  let saveTimeout: any = null
  const saveMatrixData = async () => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(async () => {
      const processedNodes = rootNodes.value
        .map(n => processNodeTree(n, rootNodes.value, rootConnections.value))
        .filter(n => n.type !== 'placeholder')

      const data = {
        nodes: processedNodes,
        connections: rootConnections.value,
        zones: rootZones.value,
        view: {
          panX: viewState.value.panX,
          panY: viewState.value.panY,
          scale: viewState.value.scale
        },
        personalIndicators: personalIndicators.value
      }
      const appBootStore = useAppBootStore()
      appBootStore.genesisMatrixCache = data
      await saveToDisk(STORAGE_KEY, data)
    }, 1000)
  }

  const restoreData = async () => {
    try {
      const appBootStore = useAppBootStore()
      const saved = appBootStore.genesisMatrixCache || await loadFromDisk<any>(STORAGE_KEY)
      if (saved && saved.nodes?.length > 0) {
        rootNodes.value = saved.nodes.map((n: any) => {
          if (n.type === 'system') return { ...n, type: 'strategy' }
          return n
        })

        if (saved.connections) rootConnections.value = saved.connections
        if (saved.zones) rootZones.value = saved.zones
        if (saved.view) {
          viewState.value.panX = saved.view.panX ?? viewState.value.panX
          viewState.value.panY = saved.view.panY ?? viewState.value.panY
          viewState.value.scale = saved.view.scale ?? viewState.value.scale
        }
        if (saved.personalIndicators) {
          personalIndicators.value = saved.personalIndicators
        }
        console.log('[GenesisPersistence] Data restored.')
      } else {
        throw new Error('No saved nodes found')
      }
    } catch (err) {
      console.warn('[GenesisPersistence] fallback:', err)
      rootNodes.value = [{
        id: 'root-strategy',
        label: 'GENESIS_PROTOCOL',
        type: 'strategy',
        x: 400,
        y: 400,
        color: 'currentColor',
        params: { phase: 'NONE' },
        isRoot: true
      }]
      rootConnections.value = []
      rootZones.value = []
    }
  }

  // Set up standard watchers
  watch([rootNodes, rootConnections, rootZones, personalIndicators], () => {
    saveMatrixData()
  }, { deep: true })

  watch([() => viewState.value.panX, () => viewState.value.panY, () => viewState.value.scale], () => {
    if (isScenarioContext.value && viewState.value.scale !== 1) {
      viewState.value.scale = 1
      return
    }
    saveMatrixData()
  })

  return {
    rootNodes,
    rootConnections,
    rootZones,
    navigationStack,
    viewState,
    lastSelectedId,
    isCommentDragging,
    activeDrawingNodeId,
    activeTextNodeId,
    activeMenuCategory,
    activeEmotionTab,
    personalIndicators,
    pendingNodeConfig,
    updateKey,
    forceUpdate,
    handleNodeMoved,
    activeContextId,
    activeContextNode,
    isScenarioContext,
    nodes,
    connections,
    zones,
    shouldShowInitializePrompt,
    bundleGroups,
    contentTransform,
    effectiveSelectedNode,
    activeDrawingNode,
    activeTextNode,
    breadcrumbs,
    getNode,
    findNodeById,
    navigateTo,
    goBack,
    jumpTo,
    selectNode,
    getMenuCategoryForNode,
    addNode,
    setPendingNode,
    removeNode,
    clearNodeInputConnections,
    clearNodeOutputConnections,
    cleanupLogicBundles,
    clearBoard,
    mergeNodes,
    refreshMergeStatus,
    saveMatrixData,
    restoreData
  }
}
