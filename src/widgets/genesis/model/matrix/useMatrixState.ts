import { ref, computed, watch } from 'vue'
import { saveToDisk, loadFromDisk } from '@/shared/diskStorage'
import { useAppBootStore } from '~/features/store/useAppBoot'
import { getMatrixStrategyName, isStrategyNode } from './useMatrixStrategies'
import { useMatrixChangeTree, type MatrixChangeEvent } from './useMatrixChangeTree'

export const STORAGE_KEY = 'genesis_matrix_v2'
const MATRIX_LEGACY_HEAVY_BACKUP_KEY = `${STORAGE_KEY}_legacy_heavy_backup`
const MATRIX_GIT_HISTORY_BACKUP_KEY = `${STORAGE_KEY}_matrix_git_history`
const MATRIX_VERSION_REVIEW_BACKUP_KEY = `${STORAGE_KEY}_version_review_history`
const MAX_RESTORED_MATRIX_BYTES = 80 * 1024 * 1024
const MAX_RESTORED_MATRIX_NODES = 2500
const MATRIX_GIT_NODE_EVENT_TYPES = new Set([
  'strategy',
  'condition',
  'scenario',
  'indicator',
  'pattern',
  'smc',
  'data',
  'methods',
  'risk',
  'risk-management',
  'emotion',
  'instrument',
  'pyramiding',
  'averaging',
  'domain',
  'scaling-entry'
])

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
export interface MatrixPage {
  id: string
  name: string
  nodes: Node[]
  connections: Connection[]
  zones: Zone[]
  events?: MatrixChangeEvent[]
  disabledChanges?: string[]
  strategyVersions?: MatrixStrategyVersion[]
  selectedStrategyVersionId?: string | null
  anonymousStrategyVersion?: MatrixAnonymousVersion | null
  view?: {
    panX: number
    panY: number
    scale: number
  }
}

export interface MatrixStrategySnapshot {
  nodes: Node[]
  connections: Connection[]
  zones: Zone[]
  events: MatrixChangeEvent[]
  disabledChanges: string[]
  personalIndicators: any[]
  view: {
    panX: number
    panY: number
    scale: number
  }
}

export interface MatrixStrategyVersion {
  id: string
  label: string
  createdAt: number
  updatedAt: number
  snapshot: MatrixStrategySnapshot
  draft?: MatrixStrategySnapshot
}

export interface MatrixAnonymousVersion {
  id: 'anonymous'
  baseVersionId: string | null
  updatedAt: number
  hasChanges: boolean
  snapshot: MatrixStrategySnapshot
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
const rootNodes = ref<Node[]>([])
const rootConnections = ref<Connection[]>([])
const rootZones = ref<Zone[]>([])
const matrixPages = ref<MatrixPage[]>([])
const activePageId = ref<string | null>(null)

const navigationStack = ref<string[]>([])
const savedScales = new Map<string, number>()

const viewState = ref({
  panX: typeof window !== 'undefined' ? window.innerWidth / 2 : 400,
  panY: typeof window !== 'undefined' ? window.innerHeight / 2 : 300,
  scale: 0.5,
  isPanning: false
})

const lastSelectedId = ref<string | null>(null)
const isCommentDragging = ref(false)
const activeDrawingNodeId = ref<string | null>(null)
const activeTextNodeId = ref<string | null>(null)
const activeMenuCategory = ref<MenuCategory | null>('LOGIC')
const activeEmotionTab = ref<'NEGATIVE' | 'POSITIVE' | 'NEUTRAL'>('NEGATIVE')
const personalIndicators = ref<any[]>([])
const updateKey = ref(0)
const pendingNodeConfig = ref<any | null>(null)
let matrixRestorePromise: Promise<void> | null = null

// Page-scoped dictionaries
const strategyVersionsByPage = ref<Record<string, MatrixStrategyVersion[]>>({})
const selectedStrategyVersionIdByPage = ref<Record<string, string | null>>({})
const anonymousStrategyVersionByPage = ref<Record<string, MatrixAnonymousVersion | null>>({})
const hasStrategyVersionChangesByPage = ref<Record<string, boolean>>({})

const strategyVersions = computed({
  get: () => {
    const id = activePageId.value || 'default'
    if (!strategyVersionsByPage.value[id]) strategyVersionsByPage.value[id] = []
    return strategyVersionsByPage.value[id]
  },
  set: (val) => {
    const id = activePageId.value || 'default'
    strategyVersionsByPage.value[id] = val
  }
})

const selectedStrategyVersionId = computed({
  get: () => {
    const id = activePageId.value || 'default'
    if (selectedStrategyVersionIdByPage.value[id] === undefined) selectedStrategyVersionIdByPage.value[id] = null
    return selectedStrategyVersionIdByPage.value[id]
  },
  set: (val) => {
    const id = activePageId.value || 'default'
    selectedStrategyVersionIdByPage.value[id] = val
  }
})

const anonymousStrategyVersion = computed({
  get: () => {
    const id = activePageId.value || 'default'
    if (anonymousStrategyVersionByPage.value[id] === undefined) anonymousStrategyVersionByPage.value[id] = null
    return anonymousStrategyVersionByPage.value[id]
  },
  set: (val) => {
    const id = activePageId.value || 'default'
    anonymousStrategyVersionByPage.value[id] = val
  }
})

const hasStrategyVersionChanges = computed({
  get: () => {
    const id = activePageId.value || 'default'
    if (hasStrategyVersionChangesByPage.value[id] === undefined) hasStrategyVersionChangesByPage.value[id] = false
    return hasStrategyVersionChangesByPage.value[id]
  },
  set: (val) => {
    const id = activePageId.value || 'default'
    hasStrategyVersionChangesByPage.value[id] = val
  }
})

let matrixPersistQueue: Promise<void> = Promise.resolve()

function createPageId() {
  return 'page-' + Math.random().toString(36).substr(2, 9)
}

function createMatrixPage(name = 'Strategy Page'): MatrixPage {
  return {
    id: createPageId(),
    name,
    nodes: [],
    connections: [],
    zones: [],
    view: {
      panX: typeof window !== 'undefined' ? window.innerWidth / 2 : 400,
      panY: typeof window !== 'undefined' ? window.innerHeight / 2 : 300,
      scale: 0.5
    }
  }
}

const VALID_ZONE_TYPES = new Set(['entry', 'in-trade', 'exit', 'session'])
const VALID_PORTS = new Set(['left', 'right', 'top', 'bottom'])

const toFiniteNumber = (value: any, fallback: number) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const estimateJsonBytes = (value: any) => {
  try {
    return new Blob([JSON.stringify(value)]).size
  } catch {
    try {
      return JSON.stringify(value).length
    } catch {
      return Number.MAX_SAFE_INTEGER
    }
  }
}

function repairZones(zones: any[]): Zone[] {
  if (!Array.isArray(zones)) return []

  return zones
    .filter(zone => zone && typeof zone === 'object')
    .map((zone, index) => ({
      id: typeof zone.id === 'string' && zone.id.trim() ? zone.id : `zone-${Date.now()}-${index}`,
      type: VALID_ZONE_TYPES.has(zone.type) ? zone.type : 'entry',
      x: toFiniteNumber(zone.x, 0),
      y: toFiniteNumber(zone.y, 0),
      width: Math.max(20, toFiniteNumber(zone.width, 240)),
      height: Math.max(20, toFiniteNumber(zone.height, 160)),
      label: typeof zone.label === 'string' ? zone.label : ''
    }))
}

function repairConnections(connections: any[], nodes: Node[]): Connection[] {
  if (!Array.isArray(connections)) return []

  const nodeIds = new Set(nodes.map(node => node.id))
  const seen = new Set<string>()

  return connections.reduce<Connection[]>((result, connection) => {
    if (!connection || typeof connection !== 'object') return result
    if (!nodeIds.has(connection.fromId) || !nodeIds.has(connection.toId)) return result

    const key = [
      connection.fromId,
      connection.toId,
      connection.fromPort || '',
      connection.toPort || '',
      connection.bundleId || '',
      connection.label || ''
    ].join('::')

    if (seen.has(key)) return result
    seen.add(key)

    const repaired: Connection = {
      fromId: connection.fromId,
      toId: connection.toId
    }

    if (VALID_PORTS.has(connection.fromPort)) repaired.fromPort = connection.fromPort
    if (VALID_PORTS.has(connection.toPort)) repaired.toPort = connection.toPort
    if (typeof connection.label === 'string' && connection.label.trim()) repaired.label = connection.label
    if (typeof connection.bundleId === 'string' && connection.bundleId.trim()) repaired.bundleId = connection.bundleId
    if (Number.isFinite(Number(connection.bundleStemX))) repaired.bundleStemX = Number(connection.bundleStemX)
    if (Number.isFinite(Number(connection.bundleStemY))) repaired.bundleStemY = Number(connection.bundleStemY)

    result.push(repaired)
    return result
  }, [])
}

function sanitizeNodeParams(params: any = {}) {
  const nextParams = { ...params }
  delete nextParams.logicalStructure
  if (nextParams.fundamental) {
    delete nextParams.source
  }
  return nextParams
}

function normalizeNode(node: any): Node {
  const normalized = node?.type === 'system' ? { ...node, type: 'strategy' } : { ...node }
  normalized.id = typeof normalized.id === 'string' && normalized.id.trim()
    ? normalized.id
    : `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  normalized.label = typeof normalized.label === 'string' ? normalized.label : 'Node'
  normalized.type = typeof normalized.type === 'string' ? normalized.type : 'unknown'
  normalized.x = toFiniteNumber(normalized.x, 0)
  normalized.y = toFiniteNumber(normalized.y, 0)
  normalized.color = typeof normalized.color === 'string' ? normalized.color : '#8b8b8b'
  normalized.params = sanitizeNodeParams(normalized.params)
  if (normalized.subGraph?.nodes) {
    const subNodes = normalizeNodes(normalized.subGraph.nodes)
    normalized.subGraph = {
      ...normalized.subGraph,
      nodes: subNodes,
      connections: repairConnections(normalized.subGraph.connections, subNodes),
      zones: repairZones(normalized.subGraph.zones)
    }
  }
  return normalized
}

function normalizeNodes(nodes: any[]): Node[] {
  if (!Array.isArray(nodes)) return []
  return nodes
    .filter(node => node && typeof node === 'object' && node.type !== 'placeholder')
    .map(normalizeNode)
}

function getStrategyCount(nodes: Node[]) {
  return nodes.filter(isStrategyNode).length
}

function clonePlainValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function normalizeStrategySnapshot(snapshot: any, fallback: any = {}): MatrixStrategySnapshot {
  const sourceNodes = snapshot?.nodes || snapshot?.pages?.[0]?.nodes || []
  const nodes = normalizeNodes(sourceNodes)
  const view = clonePlainValue(snapshot?.view || fallback.view || {
    panX: 0,
    panY: 0,
    scale: 0.5
  })

  return {
    nodes,
    connections: repairConnections(snapshot?.connections || snapshot?.pages?.[0]?.connections || [], nodes),
    zones: repairZones(snapshot?.zones || snapshot?.pages?.[0]?.zones || []),
    events: clonePlainValue(snapshot?.events || []),
    disabledChanges: [...(snapshot?.disabledChanges || [])],
    view: {
      panX: toFiniteNumber(view.panX, 0),
      panY: toFiniteNumber(view.panY, 0),
      scale: clamp(toFiniteNumber(view.scale, 0.5), 0.1, 3)
    },
    personalIndicators: clonePlainValue(snapshot?.personalIndicators || fallback.personalIndicators || [])
  }
}

function normalizeStrategyVersion(version: any, fallback: any = {}): MatrixStrategyVersion | null {
  if (!version?.id) return null
  return {
    id: String(version.id),
    label: String(version.label || 'Strategy Version'),
    createdAt: Number(version.createdAt) || Date.now(),
    updatedAt: Number(version.updatedAt) || Number(version.createdAt) || Date.now(),
    snapshot: normalizeStrategySnapshot(version.snapshot, fallback),
    ...(version.draft ? { draft: normalizeStrategySnapshot(version.draft, fallback) } : {})
  }
}

function normalizeAnonymousStrategyVersion(anonymous: any, fallback: any = {}): MatrixAnonymousVersion | null {
  if (!anonymous) return null
  return {
    id: 'anonymous',
    baseVersionId: anonymous.baseVersionId ? String(anonymous.baseVersionId) : null,
    updatedAt: Number(anonymous.updatedAt) || Date.now(),
    hasChanges: Boolean(anonymous.hasChanges),
    snapshot: normalizeStrategySnapshot(anonymous.snapshot, fallback)
  }
}

export function useMatrixState() {
  const changeTree = useMatrixChangeTree(activePageId)
  const forceUpdate = () => updateKey.value++
  const selectedStrategyVersion = computed(() => (
    strategyVersions.value.find(version => version.id === selectedStrategyVersionId.value) || null
  ))

  const cloneMatrixValue = <T>(value: T): T => {
    return JSON.parse(JSON.stringify(value))
  }

  function createActiveContainerAccess() {
    const contextNodeId = activeContextId.value
    if (contextNodeId) {
      const resolveContextNode = () => findNodeById(rootNodes.value, contextNodeId)
      const ensureContextGraph = () => {
        const contextNode = resolveContextNode()
        if (contextNode && !contextNode.subGraph) {
          contextNode.subGraph = { nodes: [], connections: [], zones: [] }
        }
        return contextNode?.subGraph
      }

      ensureContextGraph()
      return {
        getNodes: () => ensureContextGraph()?.nodes || [],
        setNodes: (nextNodes: Node[]) => {
          const graph = ensureContextGraph()
          if (graph) graph.nodes = nextNodes
        },
        getConnections: () => ensureContextGraph()?.connections || [],
        setConnections: (nextConnections: Connection[]) => {
          const graph = ensureContextGraph()
          if (graph) graph.connections = nextConnections
        }
      }
    }

    return {
      getNodes: () => rootNodes.value,
      setNodes: (nextNodes: Node[]) => { rootNodes.value = nextNodes },
      getConnections: () => rootConnections.value,
      setConnections: (nextConnections: Connection[]) => { rootConnections.value = nextConnections }
    }
  }

  function createNodeAddAction(node: Node, container = createActiveContainerAccess()) {
    return {
      undo: () => {
        container.setNodes(container.getNodes().filter(item => item.id !== node.id))
        container.setConnections(container.getConnections().filter(conn => conn.fromId !== node.id && conn.toId !== node.id))
        forceUpdate()
        saveMatrixData()
      },
      redo: () => {
        if (!container.getNodes().some(item => item.id === node.id)) {
          container.setNodes([...container.getNodes(), cloneMatrixValue(node)])
        }
        forceUpdate()
        saveMatrixData()
      }
    }
  }

  function createSnapshotAction(beforeNodes: Node[], beforeConnections: Connection[], afterNodes: Node[], afterConnections: Connection[], container = createActiveContainerAccess()) {
    const beforeNodeSnapshots = cloneMatrixValue(beforeNodes)
    const beforeConnectionSnapshots = cloneMatrixValue(beforeConnections)
    const afterNodeSnapshots = cloneMatrixValue(afterNodes)
    const afterConnectionSnapshots = cloneMatrixValue(afterConnections)
    return {
      undo: () => {
        container.setNodes(cloneMatrixValue(beforeNodeSnapshots))
        container.setConnections(cloneMatrixValue(beforeConnectionSnapshots))
        forceUpdate()
        saveMatrixData()
      },
      redo: () => {
        container.setNodes(cloneMatrixValue(afterNodeSnapshots))
        container.setConnections(cloneMatrixValue(afterConnectionSnapshots))
        forceUpdate()
        saveMatrixData()
      }
    }
  }

  function isLogicConnection(connection: Connection) {
    const label = connection.label?.toLowerCase()
    return !!connection.bundleId && (label === 'and' || label === 'or')
  }

  function collapseLogicChainAroundRemovedNode(nodeId: string, sourceConnections: Connection[], nextConnections: Connection[]) {
    const incomingLogic = sourceConnections.filter(conn => conn.toId === nodeId && isLogicConnection(conn))
    const outgoingLogic = sourceConnections.filter(conn => conn.fromId === nodeId && isLogicConnection(conn))
    if (!incomingLogic.length || !outgoingLogic.length) return nextConnections

    const existingKeys = new Set(nextConnections.map(conn => `${conn.fromId}->${conn.toId}`))
    const rewiredConnections: Connection[] = []

    incomingLogic.forEach(incoming => {
      outgoingLogic.forEach(outgoing => {
        const key = `${incoming.fromId}->${outgoing.toId}`
        if (incoming.fromId === outgoing.toId || existingKeys.has(key)) return
        existingKeys.add(key)
        rewiredConnections.push({
          ...cloneMatrixValue(outgoing),
          fromId: incoming.fromId,
          fromPort: incoming.fromPort,
          toPort: outgoing.toPort,
          label: outgoing.label || incoming.label,
          bundleId: outgoing.bundleId || incoming.bundleId,
          bundleStemX: outgoing.bundleStemX ?? incoming.bundleStemX,
          bundleStemY: outgoing.bundleStemY ?? incoming.bundleStemY
        })
      })
    })

    return [...nextConnections, ...rewiredConnections]
  }

  function createPlaceholderResolveAction(beforeNode: Node, afterNode: Node, container = createActiveContainerAccess()) {
    const targetId = beforeNode.id
    const afterSnapshot = cloneMatrixValue(afterNode)
    const afterConnectionSnapshots = cloneMatrixValue(container.getConnections().filter(conn => conn.fromId === targetId || conn.toId === targetId))
    const applySnapshot = (snapshot: Node) => {
      const nextNodes = container.getNodes().map(item =>
        item.id === snapshot.id ? cloneMatrixValue(snapshot) : item
      )
      if (!nextNodes.some(item => item.id === snapshot.id)) {
        nextNodes.push(cloneMatrixValue(snapshot))
      }
      const existingKeys = new Set(container.getConnections().map(conn => `${conn.fromId}->${conn.toId}`))
      const restoredConnections = afterConnectionSnapshots.filter(conn => !existingKeys.has(`${conn.fromId}->${conn.toId}`))
      if (restoredConnections.length) {
        container.setConnections([...container.getConnections(), ...cloneMatrixValue(restoredConnections)])
      }
      container.setNodes(nextNodes)
      forceUpdate()
      saveMatrixData()
    }
    const removeResolvedNode = () => {
      container.setNodes(container.getNodes().filter(item => item.id !== targetId))
      container.setConnections(container.getConnections().filter(conn => conn.fromId !== targetId && conn.toId !== targetId))
      forceUpdate()
      saveMatrixData()
    }

    return {
      undo: removeResolvedNode,
      redo: () => applySnapshot(afterSnapshot)
    }
  }

  const activePage = computed(() => (
    matrixPages.value.find(page => page.id === activePageId.value) || matrixPages.value[0] || null
  ))

  function syncActivePageFromRoot() {
    const page = activePage.value
    if (!page) return
    page.nodes = rootNodes.value
    page.connections = rootConnections.value
    page.zones = rootZones.value
    page.view = {
      panX: viewState.value.panX,
      panY: viewState.value.panY,
      scale: viewState.value.scale
    }
  }

  function applyPage(page: MatrixPage) {
    rootNodes.value = page.nodes
    rootConnections.value = page.connections
    rootZones.value = page.zones
    viewState.value.panX = page.view?.panX ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 400)
    viewState.value.panY = page.view?.panY ?? (typeof window !== 'undefined' ? window.innerHeight / 2 : 300)
    viewState.value.scale = page.view?.scale ?? 0.5
    navigationStack.value = []
    savedScales.clear()
    lastSelectedId.value = null
    activeMenuCategory.value = 'LOGIC'
    activeTextNodeId.value = null
  }

  function ensurePages() {
    if (matrixPages.value.length === 0) {
      const page = createMatrixPage('Strategy Page 1')
      matrixPages.value = [page]
      activePageId.value = page.id
      applyPage(page)
    } else if (!activePageId.value || !matrixPages.value.some(page => page.id === activePageId.value)) {
      activePageId.value = matrixPages.value[0]!.id
      applyPage(matrixPages.value[0]!)
    }
  }

  function switchMatrixPage(pageId: string) {
    const nextPage = matrixPages.value.find(page => page.id === pageId)
    if (!nextPage || nextPage.id === activePageId.value) return
    syncActivePageFromRoot()
    activePageId.value = nextPage.id
    applyPage(nextPage)
    saveMatrixData()
  }

  function addMatrixPage(name?: string) {
    syncActivePageFromRoot()
    const page = createMatrixPage(name || `Strategy Page ${matrixPages.value.length + 1}`)
    matrixPages.value.push(page)
    activePageId.value = page.id
    applyPage(page)
    saveMatrixData()
    return page
  }

  function removeMatrixPage(pageId: string) {
    syncActivePageFromRoot()
    const targetIndex = matrixPages.value.findIndex(page => page.id === pageId)
    if (targetIndex === -1) return

    matrixPages.value.splice(targetIndex, 1)

    if (matrixPages.value.length === 0) {
      activePageId.value = null
      ensurePages()
      saveMatrixData()
      return
    }

    const nextPage = matrixPages.value[Math.max(0, targetIndex - 1)] || matrixPages.value[0]!
    activePageId.value = nextPage.id
    applyPage(nextPage)
    saveMatrixData()
  }

  function currentPageHasStrategy() {
    return getStrategyCount(rootNodes.value) > 0
  }

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
    return !!activeContextNode.value
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
    nodes.value.length === 0
  ))

  const bundleGroups = computed(() => {
    const groups: any[] = []
    const processed = new Set<string>()
    const parentSeen = new Set<string>()
    const visibleConnections = connections.value.filter(conn => (
      !!getNode(conn.fromId) && !!getNode(conn.toId)
    ))

    visibleConnections.forEach(conn => {
      if (conn.bundleId) {
        const key = conn.fromId + '_b_' + conn.bundleId
        if (processed.has(key)) return
        const siblings = visibleConnections.filter(c => c.fromId === conn.fromId && c.bundleId === conn.bundleId)
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
    transform: `translate3d(${viewState.value.panX}px, ${viewState.value.panY}px, 0)`,
    willChange: viewState.value.isPanning ? 'transform' : 'auto'
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
      const rawLabel = node?.params?.customName || node?.params?.name || node?.label || node?.type || 'SCENARIO'
      return { id, label: String(rawLabel).replace(/_/g, ' ') }
    })
    const strategy = rootNodes.value.find(isStrategyNode)
    const rawMainLabel = strategy ? getMatrixStrategyName(strategy) : activePage.value?.name || 'Strategy'
    return [{ id: null, label: String(rawMainLabel).replace(/_/g, ' ') }, ...list]
  })

  function getNode(id: string) {
    return nodes.value.find(node => node.id === id) || findNodeById(rootNodes.value, id)
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
    const currentPath = navigationStack.value.join('/')
    const nextPath = newStack.join('/')
    if (currentPath !== nextPath) {
      cleanupUnresolvedLogicPlaceholders()
    }

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
      activeMenuCategory.value = isScenarioContext.value ? 'SCENARIO_DOCS' : 'INDICATORS'
    } else {
      if (node?.type !== 'text-panel') activeTextNodeId.value = null
      activeMenuCategory.value = getMenuCategoryForNode(node || null)
    }
  }

  function getMenuCategoryForNode(node: Node | null): MenuCategory | null {
    if (!node) return null
    if (isScenarioContext.value) {
      if (node.type === 'text-panel') {
        return activeTextNodeId.value === node.id ? 'TEXT_FORMAT' : 'SCENARIO_DOCS'
      }
      if (['checklist-panel', 'embed-panel', 'table-panel'].includes(node.type)) return 'SCENARIO_DOCS'
      if (['image', 'drawing-panel', 'file-attachment'].includes(node.type)) return 'SCENARIO_VISUALS'
      if (node.type === 'audio-note') return 'SCENARIO_AUDIO'
      return 'SCENARIO_DOCS'
    }
    if (node.type === 'text-panel') {
      return activeTextNodeId.value === node.id ? 'TEXT_FORMAT' : 'LABELS'
    }
    if (node.type === 'instrument') {
      return 'DATA'
    }
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

    if (isStrategyNode(config)) {
      if (activeContextId.value) return
      if (currentPageHasStrategy()) {
        const nextPage = addMatrixPage(`Strategy Page ${matrixPages.value.length + 1}`)
        const newStrategyNode: Node = {
          id: 'node-' + Math.random().toString(36).substr(2, 9),
          label: config.label || 'Strategy',
          type: config.type || 'strategy',
          x: config.x !== undefined ? config.x : 100,
          y: config.y !== undefined ? config.y : 100,
          color: config.color || 'currentColor',
          params: sanitizeNodeParams(config.params),
          ...(config.subGraph ? { subGraph: config.subGraph } : {})
        }
        nextPage.nodes.push(newStrategyNode)
        applyPage(nextPage)
        selectNode(nextPage.nodes[0]?.id || null)
        changeTree.recordNodeAdded(newStrategyNode, createNodeAddAction(newStrategyNode))
        saveMatrixData()
        return
      }
    }
      
    const params = sanitizeNodeParams(config.params)
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
    changeTree.recordNodeAdded(newNode, createNodeAddAction(newNode), activeContextNode.value || undefined)
    saveMatrixData()
  }

  function setPendingNode(config: any) {
    pendingNodeConfig.value = config
    const nextConfig = typeof config === 'string' 
      ? { type: config, label: config.toUpperCase(), params: {} }
      : config;
    if (isStrategyNode(nextConfig) && currentPageHasStrategy()) {
      addMatrixPage(`Strategy Page ${matrixPages.value.length + 1}`)
    }

    if (lastSelectedId.value) {
      const container = createActiveContainerAccess()
      const selectedNode = container.getNodes().find(node => node.id === lastSelectedId.value)
      if (selectedNode && selectedNode.type === 'placeholder') {
        const beforeNode = cloneMatrixValue(selectedNode)
        const logicConnection = container.getConnections().find(conn => {
          const label = (conn.label || '').toLowerCase()
          return conn.toId === selectedNode.id && (label === 'and' || label === 'or')
        })

        selectedNode.type = nextConfig.type || 'unknown'
        selectedNode.label = nextConfig.label || 'NODE'
        selectedNode.color = nextConfig.color || 'currentColor'
        selectedNode.params = sanitizeNodeParams({ ...(selectedNode.params || {}), ...(nextConfig.params || {}) })
        if (nextConfig.description) {
          selectedNode.params.description = nextConfig.description
        }

        const afterNode = cloneMatrixValue(selectedNode)
        const resolveAction = createPlaceholderResolveAction(beforeNode, afterNode, container)
        if (logicConnection) {
          changeTree.recordLogicPlaceholderNodeAdded(afterNode, logicConnection, resolveAction)
        } else {
          changeTree.recordNodeAdded(afterNode, resolveAction, activeContextNode.value || undefined)
        }

        resolveAction.redo()
        selectNode(selectedNode.id)
        pendingNodeConfig.value = null
        forceUpdate()
        saveMatrixData()
        return
      }
    }

    pendingNodeConfig.value = nextConfig
  }

  function removeNode(id: string) {
    const nodeToRemove = getNode(id)
    const container = createActiveContainerAccess()
    const beforeNodes = cloneMatrixValue(container.getNodes())
    const beforeConnections = cloneMatrixValue(container.getConnections())
    if (nodeToRemove?.type === 'condition' && activeMenuCategory.value === 'INDICATORS') {
      activeMenuCategory.value = null
    }
    if (lastSelectedId.value === id) {
      lastSelectedId.value = null
      activeMenuCategory.value = null
    }

    const nextNodes = container.getNodes().filter(n => n.id !== id)
    const nextConnections = collapseLogicChainAroundRemovedNode(
      id,
      container.getConnections(),
      container.getConnections().filter(c => c.fromId !== id && c.toId !== id)
    )
    container.setNodes(nextNodes)
    container.setConnections(nextConnections)
    cleanupLogicBundles()
    const deleteAction = nodeToRemove
      ? createSnapshotAction(beforeNodes, beforeConnections, container.getNodes(), container.getConnections(), container)
      : undefined
    if (nodeToRemove) changeTree.recordNodeDeleted(nodeToRemove, deleteAction, activeContextNode.value || undefined)
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

  function cleanupLogicBundles(container = createActiveContainerAccess()) {
    const bundles = new Map<string, Connection[]>()
    
    container.getConnections().forEach(c => {
      if (c.bundleId) {
        const key = `${c.fromId}_${c.bundleId}`
        if (!bundles.has(key)) bundles.set(key, [])
        bundles.get(key)!.push(c)
      }
    })
    
    bundles.forEach((conns) => {
      conns.forEach(c => {
        const label = c.label?.toLowerCase()
        if (label === 'and' || label === 'or') return
        delete c.bundleId
        delete c.bundleStemX
        delete c.bundleStemY
      })
    })
    forceUpdate()
  }

  function cleanupUnresolvedLogicPlaceholdersInContainer(
    containerNodes: Node[],
    containerConnections: Connection[]
  ): { nodes: Node[], connections: Connection[], changed: boolean } {
    let changed = false
    const placeholderIds = new Set(containerNodes.filter(node => node.type === 'placeholder').map(node => node.id))
    const unresolvedPlaceholderIds = new Set<string>()
    const affectedBundleKeys = new Set<string>()

    containerConnections.forEach(connection => {
      const label = connection.label?.toLowerCase()
      if (!connection.bundleId || (label !== 'and' && label !== 'or') || !placeholderIds.has(connection.toId)) return
      unresolvedPlaceholderIds.add(connection.toId)
      affectedBundleKeys.add(`${connection.fromId}_${connection.bundleId}`)
      changeTree.removeLatestConnectionLabelChange(connection.bundleId)
    })

    let nextNodes = containerNodes
    let nextConnections = containerConnections

    if (unresolvedPlaceholderIds.size) {
      changed = true
      nextNodes = containerNodes.filter(node => !unresolvedPlaceholderIds.has(node.id))
      nextConnections = containerConnections.filter(connection => (
        !unresolvedPlaceholderIds.has(connection.fromId) &&
        !unresolvedPlaceholderIds.has(connection.toId)
      ))

      affectedBundleKeys.forEach(bundleKey => {
        const bundleConnections = nextConnections.filter(connection => (
          connection.bundleId &&
          `${connection.fromId}_${connection.bundleId}` === bundleKey
        ))
        if (bundleConnections.length > 1) return

        bundleConnections.forEach(connection => {
          delete connection.label
          delete connection.bundleId
          delete connection.bundleStemX
          delete connection.bundleStemY
        })
      })
    }

    nextNodes.forEach(node => {
      if (!node.subGraph) return
      const result = cleanupUnresolvedLogicPlaceholdersInContainer(
        node.subGraph.nodes || [],
        node.subGraph.connections || []
      )
      if (!result.changed) return
      changed = true
      node.subGraph.nodes = result.nodes
      node.subGraph.connections = result.connections
    })

    return { nodes: nextNodes, connections: nextConnections, changed }
  }

  function cleanupUnresolvedLogicPlaceholders() {
    syncActivePageFromRoot()

    let changed = false
    matrixPages.value.forEach(page => {
      const result = cleanupUnresolvedLogicPlaceholdersInContainer(page.nodes, page.connections)
      if (!result.changed) return
      changed = true
      page.nodes = result.nodes
      page.connections = result.connections
    })

    if (!changed) return false

    const page = activePage.value
    if (page) {
      rootNodes.value = page.nodes
      rootConnections.value = page.connections
      rootZones.value = page.zones
    }

    forceUpdate()
    saveMatrixData()
    return true
  }

  function clearBoard() {
    const snapshot = {
      rootNodes: cloneMatrixValue(rootNodes.value),
      rootConnections: cloneMatrixValue(rootConnections.value),
      rootZones: cloneMatrixValue(rootZones.value),
      matrixPages: cloneMatrixValue(matrixPages.value),
      activePageId: activePageId.value
    }

    rootNodes.value = []
    rootConnections.value = []
    rootZones.value = []
    matrixPages.value = []
    activePageId.value = null
    ensurePages()
    navigationStack.value = []
    savedScales.clear()
    lastSelectedId.value = null
    changeTree.resetChanges()
    strategyVersions.value = []
    selectedStrategyVersionId.value = null
    anonymousStrategyVersion.value = null
    hasStrategyVersionChanges.value = false
    saveMatrixData()
  }

  function mergeNodes(indicatorId: string, configId: string) {
    // Config logic removed
  }

  function refreshMergeStatus() {
    // Config logic removed
  }

  function hasMatrixSessionData() {
    return matrixPages.value.length > 0 || rootNodes.value.length > 0 || activePageId.value !== null
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
    const processedNode = {
      ...node,
      params: {
        ...sanitizeNodeParams(node.params),
        logicalStructure: structure
      }
    }

    if (node.subGraph?.nodes) {
      const processedSubNodes = node.subGraph.nodes
        .map((childNode: any) => processNodeTree(childNode, node.subGraph.nodes, node.subGraph.connections || []))
        .filter((childNode: any) => childNode.type !== 'placeholder')

      processedNode.subGraph = {
        ...node.subGraph,
        nodes: processedSubNodes,
        connections: repairConnections(node.subGraph.connections || [], processedSubNodes),
        zones: repairZones(node.subGraph.zones || [])
      }
    }

    return processedNode
  }

  function makePageName(index: number, strategy?: Node) {
    const strategyName = strategy ? getMatrixStrategyName(strategy) : ''
    return strategyName && strategyName !== 'Strategy'
      ? strategyName
      : `Strategy Page ${index + 1}`
  }

  function splitLegacyDataIntoPages(saved: any): MatrixPage[] {
    const savedNodes = normalizeNodes(saved.nodes || [])
    const savedConnections = repairConnections(saved.connections || [], savedNodes)
    const savedZones = repairZones(saved.zones || [])
    const strategyNodes = savedNodes.filter(isStrategyNode)

    if (strategyNodes.length <= 1) {
      return [{
        id: 'page-main',
        name: makePageName(0, strategyNodes[0]),
        nodes: savedNodes,
        connections: savedConnections,
        zones: savedZones,
        view: saved.view
      }]
    }

    const assignedNodeIds = new Set<string>()
    const pages = strategyNodes.map((strategy: Node, index: number) => {
      const pageNodeIds = new Set<string>([strategy.id])
      const queue = [strategy.id]

      while (queue.length > 0) {
        const currentId = queue.shift()!
        savedConnections.forEach((connection: Connection) => {
          const nextId = connection.fromId === currentId
            ? connection.toId
            : connection.toId === currentId
              ? connection.fromId
              : null
          if (!nextId || pageNodeIds.has(nextId)) return
          const nextNode = savedNodes.find((node: Node) => node.id === nextId)
          if (!nextNode || (isStrategyNode(nextNode) && nextNode.id !== strategy.id)) return
          pageNodeIds.add(nextId)
          queue.push(nextId)
        })
      }

      pageNodeIds.forEach(id => assignedNodeIds.add(id))

      const pageNodes = savedNodes.filter((node: Node) => pageNodeIds.has(node.id))
      const pageConnections = savedConnections.filter((connection: Connection) => (
        pageNodeIds.has(connection.fromId) && pageNodeIds.has(connection.toId)
      ))
      const pageZones = savedZones.filter((zone: Zone) => pageNodes.some((node: Node) => (
        node.x >= zone.x &&
        node.x <= zone.x + zone.width &&
        node.y >= zone.y &&
        node.y <= zone.y + zone.height
      )))

      return {
        id: `page-${strategy.id}`,
        name: makePageName(index, strategy),
        nodes: pageNodes,
        connections: pageConnections,
        zones: pageZones,
        view: index === 0 ? saved.view : undefined
      }
    })

    const unassignedNodes = savedNodes.filter((node: Node) => !assignedNodeIds.has(node.id))
    if (unassignedNodes.length > 0 && pages[0]) {
      const firstPageNodeIds = new Set(pages[0].nodes.map((node: Node) => node.id))
      unassignedNodes.forEach((node: Node) => {
        pages[0]!.nodes.push(node)
        firstPageNodeIds.add(node.id)
      })
      pages[0].connections = savedConnections.filter((connection: Connection) => (
        firstPageNodeIds.has(connection.fromId) && firstPageNodeIds.has(connection.toId)
      ))
      pages[0].zones = savedZones
    }

    return pages
  }

  function normalizeSavedPages(saved: any): MatrixPage[] {
    if (Array.isArray(saved.pages) && saved.pages.length > 0) {
      return saved.pages.flatMap((page: any, index: number) => {
        const pageNodes = normalizeNodes(page.nodes || [])
        if (getStrategyCount(pageNodes) > 1) {
          return splitLegacyDataIntoPages({
            nodes: pageNodes,
            connections: repairConnections(page.connections || [], pageNodes),
            zones: repairZones(page.zones || []),
            view: page.view
          }).map((splitPage, splitIndex) => ({
            ...splitPage,
            id: `${page.id || `page-${index + 1}`}-${splitPage.id}`,
            name: splitPage.name || `${page.name || `Strategy Page ${index + 1}`} ${splitIndex + 1}`
          }))
        }
        const strategy = pageNodes.find(isStrategyNode)
        const pageVersions = Array.isArray(page.strategyVersions)
          ? page.strategyVersions
              .map((version: any) => normalizeStrategyVersion(version, page))
              .filter(Boolean) as MatrixStrategyVersion[]
          : []
        const selectedVersionId = page.selectedStrategyVersionId && pageVersions.some((version) => version.id === page.selectedStrategyVersionId)
          ? String(page.selectedStrategyVersionId)
          : null
        return [{
          id: page.id || createPageId(),
          name: page.name || makePageName(index, strategy),
          nodes: pageNodes,
          connections: repairConnections(page.connections || [], pageNodes),
          zones: repairZones(page.zones || []),
          events: Array.isArray(page.events) ? page.events : [],
          disabledChanges: Array.isArray(page.disabledChanges) ? page.disabledChanges : [],
          strategyVersions: pageVersions,
          selectedStrategyVersionId: selectedVersionId,
          anonymousStrategyVersion: normalizeAnonymousStrategyVersion(page.anonymousStrategyVersion, page),
          view: page.view
        }]
      })
    }

    return splitLegacyDataIntoPages(saved)
  }

  function matrixEventNodeType(event: MatrixChangeEvent, nodesById: Map<string, Node>) {
    const targetNode = event.targetId ? nodesById.get(event.targetId) : null
    if (targetNode?.type) return targetNode.type
    const separator = event.node.indexOf(':')
    return separator === -1 ? event.node.trim() : event.node.slice(0, separator).trim()
  }

  function collectNodeMap(nodes: Node[], map = new Map<string, Node>()) {
    nodes.forEach(node => {
      if (!node?.id) return
      map.set(node.id, node)
      if (node.subGraph?.nodes?.length) {
        collectNodeMap(node.subGraph.nodes, map)
      }
    })
    return map
  }

  function filterMatrixGitEvents(events: MatrixChangeEvent[], nodes: Node[]) {
    const nodesById = collectNodeMap(nodes)
    return (events || []).filter(event => {
      if (event.targetKind && event.targetKind !== 'node') return true
      if (!event.targetId) return true
      return MATRIX_GIT_NODE_EVENT_TYPES.has(matrixEventNodeType(event, nodesById))
    })
  }

  function collectEventChangeIds(events: MatrixChangeEvent[]) {
    const ids = new Set<string>()
    const visit = (subchanges: any[] = []) => {
      subchanges.forEach(subchange => {
        if (subchange?.id) ids.add(subchange.id)
        if (subchange?.subchanges?.length) visit(subchange.subchanges)
      })
    }
    events.forEach(event => {
      if (event.id) ids.add(event.id)
      visit(event.subchanges || [])
    })
    return ids
  }

  function filterDisabledChangesForEvents(disabledChanges: string[], events: MatrixChangeEvent[]) {
    const changeIds = collectEventChangeIds(events)
    return (disabledChanges || []).filter(id => changeIds.has(id))
  }

  function buildPersistedPages() {
    syncActivePageFromRoot()
    return matrixPages.value.map(page => {
      const processedNodes = page.nodes
        .map(node => processNodeTree(node, page.nodes, page.connections))
        .filter(node => node.type !== 'placeholder')
      const processedConnections = repairConnections(page.connections, processedNodes)
      const persistedEvents = filterMatrixGitEvents(changeTree.eventsByPage.value[page.id] || [], processedNodes)
      const persistedDisabledChanges = filterDisabledChangesForEvents(
        Array.from(changeTree.disabledChangesByPage.value[page.id] || new Set()),
        persistedEvents
      )

      return {
        ...page,
        nodes: processedNodes,
        connections: processedConnections,
        zones: repairZones(page.zones),
        events: persistedEvents,
        disabledChanges: persistedDisabledChanges,
        strategyVersions: (strategyVersionsByPage.value[page.id] || [])
          .map((version: any) => normalizeStrategyVersion(version, page))
          .filter(Boolean) as MatrixStrategyVersion[],
        selectedStrategyVersionId: selectedStrategyVersionIdByPage.value[page.id] ?? null,
        anonymousStrategyVersion: normalizeAnonymousStrategyVersion(anonymousStrategyVersionByPage.value[page.id], page)
      }
    })
  }

  function captureStrategySnapshot(): MatrixStrategySnapshot {
    syncActivePageFromRoot()
    const active = activePage.value
    const snapshotNodes = active?.nodes.map(node => processNodeTree(node, active.nodes, active.connections)).filter(node => node.type !== 'placeholder') || []
    const snapshotEvents = filterMatrixGitEvents(changeTree.events.value, snapshotNodes)
    return cloneMatrixValue({
      nodes: snapshotNodes,
      connections: repairConnections(active?.connections || [], snapshotNodes),
      zones: repairZones(active?.zones || []),
      events: snapshotEvents,
      disabledChanges: filterDisabledChangesForEvents(Array.from(changeTree.disabledChanges.value), snapshotEvents),
      view: {
        panX: viewState.value.panX,
        panY: viewState.value.panY,
        scale: viewState.value.scale
      },
      personalIndicators: personalIndicators.value
    })
  }

  function canonicalStrategySnapshot(snapshot: MatrixStrategySnapshot) {
    const canonical = cloneMatrixValue(snapshot) as any
    delete canonical.view

    const normalizeNodeForComparison = (node: any) => {
      delete node.x
      delete node.y
      if (node.params) {
        delete node.params.isEditingName
        delete node.params.isEditingDescription
        delete node.params.logicalStructure
      }
      node.subGraph?.nodes?.forEach(normalizeNodeForComparison)
      node.subGraph?.connections?.forEach((connection: any) => {
        delete connection.bundleStemX
        delete connection.bundleStemY
      })
      node.subGraph?.zones?.forEach((zone: any) => {
        delete zone.x
        delete zone.y
        delete zone.width
        delete zone.height
      })
    }

    canonical.nodes?.forEach(normalizeNodeForComparison)
    canonical.connections?.forEach((connection: any) => {
      delete connection.bundleStemX
      delete connection.bundleStemY
    })
    canonical.zones?.forEach((zone: any) => {
      delete zone.x
      delete zone.y
      delete zone.width
      delete zone.height
    })

    canonical.events?.forEach((event: any) => delete event.createdAt)
    return canonical
  }

  function strategySnapshotsMatch(left: MatrixStrategySnapshot, right: MatrixStrategySnapshot) {
    return JSON.stringify(canonicalStrategySnapshot(left)) === JSON.stringify(canonicalStrategySnapshot(right))
  }

  function refreshAnonymousStrategyVersion(snapshot = captureStrategySnapshot()) {
    const selectedVersion = selectedStrategyVersion.value
    const hasChanges = !!selectedVersion && !strategySnapshotsMatch(snapshot, selectedVersion.snapshot)
    hasStrategyVersionChanges.value = hasChanges

    if (selectedVersion) {
       if (hasChanges) {
           selectedVersion.draft = cloneMatrixValue(snapshot)
       } else {
           delete selectedVersion.draft
       }
    }

    anonymousStrategyVersion.value = {
      id: 'anonymous',
      baseVersionId: selectedVersion?.id || null,
      updatedAt: Date.now(),
      hasChanges,
      snapshot: cloneMatrixValue(snapshot)
    }
  }

  function applyStrategySnapshot(snapshot: MatrixStrategySnapshot) {
    const page = activePage.value
    if (!page) return
    page.nodes = cloneMatrixValue(snapshot.nodes || [])
    page.connections = cloneMatrixValue(snapshot.connections || [])
    page.zones = cloneMatrixValue(snapshot.zones || [])
    
    if (snapshot.view) {
      viewState.value.panX = snapshot.view.panX
      viewState.value.panY = snapshot.view.panY
      viewState.value.scale = snapshot.view.scale
    }
    personalIndicators.value = cloneMatrixValue(snapshot.personalIndicators || [])
    changeTree.events.value = cloneMatrixValue(snapshot.events || [])
    changeTree.disabledChanges.value = new Set(snapshot.disabledChanges || [])
    
    rootNodes.value = page.nodes
    rootConnections.value = page.connections
    rootZones.value = page.zones
    
    navigationStack.value = []
    lastSelectedId.value = null
    forceUpdate()
  }

  async function createStrategyVersion() {
    const currentSnapshot = captureStrategySnapshot()
    if (strategyVersions.value.length > 0) {
      const selectedVersion = selectedStrategyVersion.value
      if (!selectedVersion || strategySnapshotsMatch(currentSnapshot, selectedVersion.snapshot)) return
      
      // Clear the draft on the current version since these changes are now committed to a new branch
      delete selectedVersion.draft
    }

    const versionNumber = strategyVersions.value.reduce((highest, version) => {
      const match = version.label.match(/v(\d+)$/i)
      return Math.max(highest, match ? Number(match[1]) : 0)
    }, 0) + 1
    const label = `Strategy v${versionNumber}`
    changeTree.clearStrategyVersionCheckpoints()
    changeTree.recordStrategyVersionCreated(label)
    const snapshot = captureStrategySnapshot()
    const now = Date.now()
    const version: MatrixStrategyVersion = {
      id: `strategy-version-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      label,
      createdAt: now,
      updatedAt: now,
      snapshot
    }
    strategyVersions.value = [...strategyVersions.value, version]
    selectedStrategyVersionId.value = version.id
    refreshAnonymousStrategyVersion(snapshot)
    await saveMatrixData(true)
  }

  async function updateSelectedStrategyVersion() {
    const selectedId = selectedStrategyVersionId.value
    const versionIndex = strategyVersions.value.findIndex(version => version.id === selectedId)
    if (versionIndex === -1) return
    const currentVersion = strategyVersions.value[versionIndex]!
    changeTree.recordStrategyVersionUpdated(currentVersion.label)
    const snapshot = captureStrategySnapshot()
    strategyVersions.value[versionIndex] = {
      ...currentVersion,
      updatedAt: Date.now(),
      snapshot,
      draft: undefined
    }
    strategyVersions.value = [...strategyVersions.value]
    refreshAnonymousStrategyVersion(snapshot)
    await saveMatrixData(true)
  }

  async function clearStrategyVersionChanges() {
    const version = selectedStrategyVersion.value
    if (!version) return
    delete version.draft
    applyStrategySnapshot(version.snapshot)
    refreshAnonymousStrategyVersion(version.snapshot)
    await saveMatrixData(true)
  }

  async function selectStrategyVersion(versionId: string | null) {
    if (versionId === null) {
      selectedStrategyVersionId.value = null
      const snapshot = anonymousStrategyVersion.value?.snapshot
      if (snapshot) {
        applyStrategySnapshot(snapshot)
      }
      await saveMatrixData(true)
      return
    }

    const version = strategyVersions.value.find(item => item.id === versionId)
    if (!version) return
    selectedStrategyVersionId.value = version.id
    
    const snapshotToApply = version.draft || version.snapshot
    applyStrategySnapshot(snapshotToApply)
    refreshAnonymousStrategyVersion(snapshotToApply)
    await saveMatrixData(true)
  }

  async function removeStrategyVersion(versionId: string) {
    const versionIndex = strategyVersions.value.findIndex(version => version.id === versionId)
    if (versionIndex === -1) return

    const wasSelected = selectedStrategyVersionId.value === versionId
    strategyVersions.value = strategyVersions.value.filter(version => version.id !== versionId)

    if (wasSelected && strategyVersions.value.length) {
      const fallbackVersion = strategyVersions.value[strategyVersions.value.length - 1]!
      selectedStrategyVersionId.value = fallbackVersion.id
      applyStrategySnapshot(fallbackVersion.snapshot)
      refreshAnonymousStrategyVersion(fallbackVersion.snapshot)
    } else if (wasSelected) {
      selectedStrategyVersionId.value = null
      changeTree.clearStrategyVersionCheckpoints()
      refreshAnonymousStrategyVersion(captureStrategySnapshot())
    } else {
      refreshAnonymousStrategyVersion(captureStrategySnapshot())
    }

    await persistMatrixHistoryBackups({ allowEmptyVersionReview: true })
    await saveMatrixData(true)
  }

  function findBackupPageByIdOrName(backupPages: any[] = [], page: MatrixPage) {
    return backupPages.find(item => item.id === page.id) ||
      backupPages.find(item => item.name && item.name === page.name) ||
      null
  }

  function buildMatrixGitHistoryBackupPayload() {
    syncActivePageFromRoot()
    return {
      schemaVersion: 1,
      updatedAt: Date.now(),
      activePageId: activePageId.value,
      pages: matrixPages.value.map(page => {
        const events = filterMatrixGitEvents(changeTree.eventsByPage.value[page.id] || page.events || [], page.nodes || [])
        return {
          id: page.id,
          name: page.name,
          events: cloneMatrixValue(events),
          disabledChanges: filterDisabledChangesForEvents(
            Array.from(changeTree.disabledChangesByPage.value[page.id] || new Set(page.disabledChanges || [])),
            events
          )
        }
      })
    }
  }

  function buildVersionReviewBackupPayload() {
    syncActivePageFromRoot()
    return {
      schemaVersion: 1,
      updatedAt: Date.now(),
      activePageId: activePageId.value,
      pages: matrixPages.value.map(page => ({
        id: page.id,
        name: page.name,
        strategyVersions: cloneMatrixValue(strategyVersionsByPage.value[page.id] || page.strategyVersions || []),
        selectedStrategyVersionId: selectedStrategyVersionIdByPage.value[page.id] ?? page.selectedStrategyVersionId ?? null,
        anonymousStrategyVersion: cloneMatrixValue(anonymousStrategyVersionByPage.value[page.id] || page.anonymousStrategyVersion || null)
      }))
    }
  }

  async function mergeMatrixGitHistoryBackup(payload: any) {
    const existing = await loadFromDisk<any>(MATRIX_GIT_HISTORY_BACKUP_KEY)
    const existingPages = existing?.pages || []
    const pages = payload.pages.map((page: any) => {
      if (page.events?.length) return page
      const fallback = findBackupPageByIdOrName(existingPages, page)
      const matrixPage = matrixPages.value.find(item => item.id === page.id || item.name === page.name)
      const fallbackEvents = matrixPage ? filterMatrixGitEvents(fallback?.events || [], matrixPage.nodes || []) : []
      return fallbackEvents.length ? {
        ...page,
        events: fallbackEvents,
        disabledChanges: filterDisabledChangesForEvents(fallback?.disabledChanges || [], fallbackEvents)
      } : page
    })
    return { ...(existing || {}), ...payload, pages }
  }

  async function mergeVersionReviewBackup(payload: any, allowEmptyVersionReview = false) {
    const existing = await loadFromDisk<any>(MATRIX_VERSION_REVIEW_BACKUP_KEY)
    const existingPages = existing?.pages || []
    const pages = payload.pages.map((page: any) => {
      if (page.strategyVersions?.length || allowEmptyVersionReview) return page
      const fallback = findBackupPageByIdOrName(existingPages, page)
      return fallback?.strategyVersions?.length
        ? {
            ...page,
            strategyVersions: fallback.strategyVersions,
            selectedStrategyVersionId: fallback.selectedStrategyVersionId ?? page.selectedStrategyVersionId,
            anonymousStrategyVersion: fallback.anonymousStrategyVersion ?? page.anonymousStrategyVersion
          }
        : page
    })
    return { ...(existing || {}), ...payload, pages }
  }

  async function persistMatrixHistoryBackups(options: { allowEmptyVersionReview?: boolean } = {}) {
    const gitPayload = await mergeMatrixGitHistoryBackup(buildMatrixGitHistoryBackupPayload())
    const versionPayload = await mergeVersionReviewBackup(
      buildVersionReviewBackupPayload(),
      options.allowEmptyVersionReview === true
    )
    await Promise.all([
      saveToDisk(MATRIX_GIT_HISTORY_BACKUP_KEY, gitPayload),
      saveToDisk(MATRIX_VERSION_REVIEW_BACKUP_KEY, versionPayload)
    ])
  }

  async function restoreMatrixHistoryBackups() {
    const [gitBackup, versionBackup] = await Promise.all([
      loadFromDisk<any>(MATRIX_GIT_HISTORY_BACKUP_KEY),
      loadFromDisk<any>(MATRIX_VERSION_REVIEW_BACKUP_KEY)
    ])
    let restored = false

    matrixPages.value.forEach(page => {
      const pageEvents = changeTree.eventsByPage.value[page.id] || page.events || []
      if (!pageEvents.length) {
        const backupPage = findBackupPageByIdOrName(gitBackup?.pages || [], page)
        const backupEvents = filterMatrixGitEvents(backupPage?.events || [], page.nodes || [])
        if (backupEvents.length) {
          changeTree.eventsByPage.value[page.id] = cloneMatrixValue(backupEvents)
          page.events = cloneMatrixValue(backupEvents)
          const disabled = filterDisabledChangesForEvents(backupPage?.disabledChanges || [], backupEvents)
          changeTree.disabledChangesByPage.value[page.id] = new Set(disabled)
          page.disabledChanges = disabled
          restored = true
        }
      }

      const pageVersions = strategyVersionsByPage.value[page.id] || page.strategyVersions || []
      if (!pageVersions.length) {
        const backupPage = findBackupPageByIdOrName(versionBackup?.pages || [], page)
        if (backupPage?.strategyVersions?.length) {
          const versions = cloneMatrixValue(backupPage.strategyVersions)
          strategyVersionsByPage.value[page.id] = versions
          page.strategyVersions = versions
          selectedStrategyVersionIdByPage.value[page.id] = backupPage.selectedStrategyVersionId &&
            versions.some((version: MatrixStrategyVersion) => version.id === backupPage.selectedStrategyVersionId)
              ? backupPage.selectedStrategyVersionId
              : null
          anonymousStrategyVersionByPage.value[page.id] = cloneMatrixValue(backupPage.anonymousStrategyVersion || null)
          restored = true
        }
      }
    })

    return restored
  }

  let saveTimeout: any = null
  const persistMatrixData = async () => {
    const currentSnapshot = captureStrategySnapshot()
    refreshAnonymousStrategyVersion(currentSnapshot)
    const processedPages = buildPersistedPages()

    const data = {
      pages: processedPages,
      activePageId: activePageId.value,
      nodes: processedPages.flatMap(page => page.nodes),
      connections: processedPages.flatMap(page => page.connections),
      zones: processedPages.flatMap(page => page.zones),
      events: currentSnapshot.events,
      disabledChanges: currentSnapshot.disabledChanges,
      view: {
        panX: viewState.value.panX,
        panY: viewState.value.panY,
        scale: viewState.value.scale
      },
      personalIndicators: personalIndicators.value,
      strategyVersioning: {
        schemaVersion: 1,
        selectedVersionId: selectedStrategyVersionId.value,
        versions: cloneMatrixValue(strategyVersions.value),
        anonymous: cloneMatrixValue(anonymousStrategyVersion.value)
      }
    }
    const appBootStore = useAppBootStore()
    appBootStore.genesisMatrixCache = data
    matrixPersistQueue = matrixPersistQueue
      .catch(() => undefined)
      .then(async () => {
        await saveToDisk(STORAGE_KEY, data)
        await persistMatrixHistoryBackups()
      })
    await matrixPersistQueue
  }

  const saveMatrixData = async (immediate = false) => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = null
    if (immediate) {
      await persistMatrixData()
      return
    }
    saveTimeout = setTimeout(() => {
      saveTimeout = null
      void persistMatrixData()
    }, 1000)
  }

  const restoreData = async () => {
    try {
      const appBootStore = useAppBootStore()
      const saved = appBootStore.genesisMatrixCache || await loadFromDisk<any>(STORAGE_KEY)
      if (saved && ((Array.isArray(saved.pages) && saved.pages.length > 0) || saved.nodes?.length > 0)) {
        const normalizedPages = normalizeSavedPages(saved)
        const restoredNodeCount = normalizedPages.reduce((total, page) => total + page.nodes.length, 0)
        const restoredPayloadPreview = {
          ...saved,
          pages: normalizedPages,
          nodes: normalizedPages.flatMap(page => page.nodes),
          connections: normalizedPages.flatMap(page => page.connections),
          zones: normalizedPages.flatMap(page => page.zones),
          personalIndicators: Array.isArray(saved.personalIndicators) ? saved.personalIndicators : []
        }
        const originalBytes = estimateJsonBytes(saved)
        const restoredBytes = estimateJsonBytes(restoredPayloadPreview)
        const shouldQuarantine = restoredNodeCount > MAX_RESTORED_MATRIX_NODES || restoredBytes > MAX_RESTORED_MATRIX_BYTES

        if (shouldQuarantine) {
          console.warn('[GenesisPersistence] legacy matrix payload is too large; preserving it in a legacy backup and loading an empty board.', {
            nodes: restoredNodeCount,
            bytes: restoredBytes
          })

          await saveToDisk(MATRIX_LEGACY_HEAVY_BACKUP_KEY, saved)

          matrixPages.value = []
          activePageId.value = null
          strategyVersions.value = []
          selectedStrategyVersionId.value = null
          anonymousStrategyVersion.value = null
          hasStrategyVersionChanges.value = false
          strategyVersionsByPage.value = {}
          selectedStrategyVersionIdByPage.value = {}
          anonymousStrategyVersionByPage.value = {}
          hasStrategyVersionChangesByPage.value = {}
          changeTree.resetChanges()
          personalIndicators.value = []
          ensurePages()
          await persistMatrixData()
          return
        }

        matrixPages.value = normalizedPages
        activePageId.value = saved.activePageId && matrixPages.value.some(page => page.id === saved.activePageId)
          ? saved.activePageId
          : matrixPages.value[0]?.id || null
        ensurePages()
        if (activePage.value) applyPage(activePage.value)
        
        if (saved.view) {
          viewState.value.panX = toFiniteNumber(saved.view.panX, viewState.value.panX)
          viewState.value.panY = toFiniteNumber(saved.view.panY, viewState.value.panY)
          viewState.value.scale = clamp(toFiniteNumber(saved.view.scale, viewState.value.scale), 0.1, 3)
        }
        const sanitizeSubs = (subs: any[]): any[] => (subs || []).map((s: any) => ({ ...s, subchanges: sanitizeSubs(s.subchanges) }))
        
        matrixPages.value.forEach(page => {
           if (page.events && Array.isArray(page.events)) {
               changeTree.eventsByPage.value[page.id] = page.events.map((ev: any) => ({ ...ev, subchanges: sanitizeSubs(ev.subchanges) }))
           } else if (!changeTree.eventsByPage.value[page.id]) {
               changeTree.eventsByPage.value[page.id] = []
           }
           
           if (page.disabledChanges && Array.isArray(page.disabledChanges)) {
               changeTree.disabledChangesByPage.value[page.id] = new Set(page.disabledChanges)
           } else if (!changeTree.disabledChangesByPage.value[page.id]) {
               changeTree.disabledChangesByPage.value[page.id] = new Set()
           }
           
           if (page.strategyVersions && Array.isArray(page.strategyVersions)) {
               strategyVersionsByPage.value[page.id] = page.strategyVersions
           } else if (!strategyVersionsByPage.value[page.id]) {
               strategyVersionsByPage.value[page.id] = []
           }
           
           selectedStrategyVersionIdByPage.value[page.id] = page.selectedStrategyVersionId && strategyVersionsByPage.value[page.id]?.some(
             version => version.id === page.selectedStrategyVersionId
           ) ? page.selectedStrategyVersionId : null
           anonymousStrategyVersionByPage.value[page.id] = page.anonymousStrategyVersion || null
        })

        // MIGRATION: if global legacy data exists, assign it to the first available page
        const firstPageId = matrixPages.value[0]?.id
        if (firstPageId) {
            if (saved.events && Array.isArray(saved.events) && (!changeTree.eventsByPage.value[firstPageId] || changeTree.eventsByPage.value[firstPageId].length === 0)) {
              changeTree.eventsByPage.value[firstPageId] = saved.events.map((ev: any) => ({ ...ev, subchanges: sanitizeSubs(ev.subchanges) }))
            }
            if (saved.disabledChanges && Array.isArray(saved.disabledChanges) && (!changeTree.disabledChangesByPage.value[firstPageId] || changeTree.disabledChangesByPage.value[firstPageId].size === 0)) {
              changeTree.disabledChangesByPage.value[firstPageId] = new Set(saved.disabledChanges)
            }
            const savedVersioning = saved.strategyVersioning
            if (savedVersioning?.schemaVersion === 1 && Array.isArray(savedVersioning.versions) && (!strategyVersionsByPage.value[firstPageId] || strategyVersionsByPage.value[firstPageId].length === 0)) {
              strategyVersionsByPage.value[firstPageId] = savedVersioning.versions
                .map((version: any) => normalizeStrategyVersion(version, saved))
                .filter(Boolean) as MatrixStrategyVersion[]
              selectedStrategyVersionIdByPage.value[firstPageId] = strategyVersionsByPage.value[firstPageId]?.some(
                version => version.id === savedVersioning.selectedVersionId
              ) ? savedVersioning.selectedVersionId : null
              anonymousStrategyVersionByPage.value[firstPageId] = normalizeAnonymousStrategyVersion(savedVersioning.anonymous, saved)
            }
        }
        if (saved.personalIndicators) {
          personalIndicators.value = saved.personalIndicators
        }
        const restoredMatrixHistory = await restoreMatrixHistoryBackups()
        applyTreeStateToMatrix(changeTree.disabledChanges.value)
        refreshAnonymousStrategyVersion(captureStrategySnapshot())

        appBootStore.genesisMatrixCache = restoredPayloadPreview
        if (restoredMatrixHistory || originalBytes !== restoredBytes) {
          if (originalBytes > restoredBytes * 1.5 || originalBytes > MAX_RESTORED_MATRIX_BYTES) {
            await saveToDisk(MATRIX_LEGACY_HEAVY_BACKUP_KEY, saved)
          }
          await persistMatrixData()
        }
      } else {
        throw new Error('No saved nodes found')
      }
    } catch (err) {
      console.warn('[GenesisPersistence] fallback:', err)
      matrixPages.value = []
      activePageId.value = null
      strategyVersions.value = []
      selectedStrategyVersionId.value = null
      anonymousStrategyVersion.value = null
      hasStrategyVersionChanges.value = false
      ensurePages()
    }
  }

  const ensureMatrixDataRestored = async () => {
    const appBootStore = useAppBootStore()
    if (hasMatrixSessionData() && appBootStore.isGenesisMatrixSessionRestored) return
    if (!matrixRestorePromise) {
      matrixRestorePromise = restoreData()
        .then(() => {
          appBootStore.isGenesisMatrixSessionRestored = hasMatrixSessionData()
        })
        .finally(() => {
          matrixRestorePromise = null
        })
    }
    await matrixRestorePromise
  }

  function applyTreeStateToMatrix(next: Set<string>) {
    const activeNodeIdentities = changeTree.syncNodeIdentityLabels(next)
    activeNodeIdentities.forEach((identity: any, nodeId: any) => {
      const node = getNode(nodeId)
      if (!node) return
      if (!node.params) node.params = {}
      node.params.customName = identity
    })

    const nodeHolderStates = new Map<string, {
      fallbackPosition?: { x: number, y: number }
      activePosition?: { x: number, y: number }
    }>()

    changeTree.events.value.forEach(event => {
      if (event.targetKind !== 'domain' || event.type !== 'add') return
      const isEventEnabled = !next.has(event.id)

      event.subchanges.forEach(subchange => {
        if (subchange.label !== 'NODES_HOLDER' || !subchange.subchanges?.length) return
        const isHolderEnabled = isEventEnabled && !next.has(subchange.id)

        subchange.subchanges.forEach((nodeChange: any) => {
          if (nodeChange.label !== 'add' && nodeChange.label !== 'remove') return
          if (!nodeChange.targetId) return

          const isNodeChangeEnabled = isHolderEnabled && !next.has(nodeChange.id)
          const state = nodeHolderStates.get(nodeChange.targetId) || {}

          if (!state.fallbackPosition && nodeChange.payload?.fromPosition) {
            state.fallbackPosition = {
              x: nodeChange.payload.fromPosition.x,
              y: nodeChange.payload.fromPosition.y
            }
          }

          if (isNodeChangeEnabled && nodeChange.payload?.toPosition) {
            state.activePosition = {
              x: nodeChange.payload.toPosition.x,
              y: nodeChange.payload.toPosition.y
            }
          }

          nodeHolderStates.set(nodeChange.targetId, state)
        })
      })
    })

    nodeHolderStates.forEach((holderState, nodeId) => {
      const position = holderState.activePosition || holderState.fallbackPosition
      if (!position) return
      const node = getNode(nodeId)
      if (!node) return
      node.x = position.x
      node.y = position.y
    })

    const getNodeContentReplay = (nodeId: string, label: string) => {
      let firstChange: any = undefined
      let lastActiveChange: any = undefined

      changeTree.events.value.forEach(event => {
        if (event.targetKind !== 'node' || !event.targetId) return

        const visit = (subchanges: any[], scopedNodeId: string, parentEnabled: boolean) => {
          subchanges.forEach(subchange => {
            const isEnabled = parentEnabled && !next.has(subchange.id)
            const nextNodeId = subchange.label === 'ADD_NODE' && subchange.targetId
              ? subchange.targetId
              : scopedNodeId

            if (nextNodeId === nodeId && subchange.label === label) {
              if (!firstChange) firstChange = subchange
              if (isEnabled) lastActiveChange = subchange
            }
            if (subchange.subchanges?.length) {
              visit(subchange.subchanges, nextNodeId, isEnabled)
            }
          })
        }

        visit(event.subchanges, event.targetId, !next.has(event.id))
      })

      return { firstChange, lastActiveChange }
    }

    const applyContentReplay = (node: Node) => {
      if (!node.params) node.params = {}

      if (node.type === 'text-panel') {
        const { firstChange, lastActiveChange } = getNodeContentReplay(node.id, 'text')
        if (firstChange) {
          if (lastActiveChange) {
            const source = lastActiveChange.payload
            node.params.html = String(source?.nextHtml ?? node.params.html ?? '')
            node.params.value = String(source?.nextValue ?? lastActiveChange.value ?? '')
          } else {
            const source = firstChange.payload
            if (source && ('previousHtml' in source || 'previousValue' in source)) {
              node.params.html = String(source.previousHtml ?? '')
              node.params.value = String(source.previousValue ?? '')
            }
          }
        }
      } else if (node.type === 'embed-panel') {
        const { firstChange, lastActiveChange } = getNodeContentReplay(node.id, 'url')
        if (firstChange) {
          node.params.embedUrl = lastActiveChange
            ? String(lastActiveChange.payload?.nextValue ?? lastActiveChange.value ?? '')
            : String(firstChange.payload?.previousValue ?? '')
        }
      } else if (node.type === 'table-panel') {
        const { firstChange, lastActiveChange } = getNodeContentReplay(node.id, 'table')
        const snapshot = lastActiveChange?.payload?.nextSnapshot || firstChange?.payload?.previousSnapshot
        if (snapshot) {
          node.params.rows = snapshot.rows
          node.params.cols = snapshot.cols
          node.params.table = cloneMatrixValue(snapshot.table)
        }
      }

      node.subGraph?.nodes?.forEach(applyContentReplay)
    }

    rootNodes.value.forEach(applyContentReplay)

    zones.value.forEach(zone => {
      const event = changeTree.events.value.find(
        e => e.targetKind === 'domain' && e.targetId === zone.id && e.type === 'add'
      )
      if (event) {
        let activeValue: string | null = null

        if (!next.has(event.id)) {
          const changerSub = event.subchanges.find(s => s.label === 'SESSION_CHANGER' || s.label === 'TYPE_CHANGER' || s.label === 'TYPE/SESSION_CHANGER')
          let lastActiveTo: any = undefined
          if (changerSub && changerSub.subchanges) {
            for (const sub of changerSub.subchanges) {
              if (sub.label === 'to' && !next.has(sub.id)) {
                lastActiveTo = sub
              }
            }
          }
          
          if (lastActiveTo) {
            activeValue = lastActiveTo.value
          } else {
            const initialSub = event.subchanges.find(
              s => s.label === 'session' || s.label === 'domain'
            )
            if (initialSub) {
              activeValue = initialSub.value
            }
          }
        }

        if (activeValue) {
          const val = activeValue.toLowerCase()
          if (['entry', 'in-trade', 'exit'].includes(val)) {
            zone.type = val as any
            zone.label = `SECTOR_${activeValue.toUpperCase()}`
          } else {
            zone.type = 'session'
            zone.label = activeValue
          }
        }
      }
    })

    forceUpdate()
    saveMatrixData()
  }

  // Set up standard watchers
  watch([rootNodes, rootConnections, rootZones, personalIndicators], () => {
    saveMatrixData()
  }, { deep: true })

  watch(changeTree.events, () => {
    void saveMatrixData(true)
  }, { deep: true })

  watch(() => Array.from(changeTree.disabledChanges.value), () => {
    void saveMatrixData(true)
  })

  watch([() => viewState.value.panX, () => viewState.value.panY, () => viewState.value.scale], () => {
    if (isScenarioContext.value && viewState.value.scale !== 1) {
      viewState.value.scale = 1
      return
    }
    if (viewState.value.isPanning) return
    saveMatrixData()
  })

  return {
    rootNodes,
    rootConnections,
    rootZones,
    createActiveContainerAccess,
    matrixPages,
    activePageId,
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
    strategyVersions,
    selectedStrategyVersionId,
    selectedStrategyVersion,
    anonymousStrategyVersion,
    hasStrategyVersionChanges,
    updateKey,
    forceUpdate,
    handleNodeMoved,
    activeContextId,
    activeContextNode,
    activePage,
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
    switchMatrixPage,
    addMatrixPage,
    removeMatrixPage,
    currentPageHasStrategy,
    selectNode,
    getMenuCategoryForNode,
    addNode,
    setPendingNode,
    removeNode,
    clearNodeInputConnections,
    clearNodeOutputConnections,
    cleanupLogicBundles,
    cleanupUnresolvedLogicPlaceholders,
    clearBoard,
    mergeNodes,
    refreshMergeStatus,
    createStrategyVersion,
    updateSelectedStrategyVersion,
    clearStrategyVersionChanges,
    selectStrategyVersion,
    removeStrategyVersion,
    saveMatrixData,
    restoreData,
    ensureMatrixDataRestored,
    hasMatrixSessionData,
    applyTreeStateToMatrix,
    changeTree
  }
}
