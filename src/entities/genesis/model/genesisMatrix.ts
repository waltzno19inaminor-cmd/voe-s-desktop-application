import { computed, readonly, ref } from 'vue'
import { loadFromDisk, saveToDisk } from '~/shared/diskStorage'
import { useAppBootStore } from '~/features/store/useAppBoot'
import { useMatrixState } from '~/widgets/genesis/model/matrix/useMatrixState'
import {
  isStrategyNode,
  getMatrixStrategyName,
  flattenMatrixNodes,
  flattenMatrixConnections,
  getMatrixStrategyOptions,
  type MatrixStrategyProfile
} from '~/widgets/genesis/model/matrix/useMatrixStrategies'

export interface MatrixNodeCondition {
  id: string
  name: string
  description?: string
  priority?: 'REQUIRED' | 'ADDITIONAL'
  type?: string
  params?: Record<string, any>
}

export interface MatrixScenarioProfile {
  id: string
  name: string
  description?: string
  phase: 'ENTRY' | 'EXIT' | 'GENERAL'
  strategyId?: string
  strategyName?: string
  isMini?: boolean
  conditions: MatrixNodeCondition[]
  requiredConditions: MatrixNodeCondition[]
  additionalConditions: MatrixNodeCondition[]
  attachments?: any[]
  checklists?: any[]
  node?: any
}

export interface MatrixConditionProfile {
  id: string
  name: string
  description?: string
  priority: 'REQUIRED' | 'ADDITIONAL'
  category?: string
  strategyId?: string
  scenarioId?: string
  node?: any
}

export interface MatrixRiskProfile {
  strategyId: string
  riskPerTradeValue: number
  riskPerTradeUnit: '%' | '$'
  riskPerSessionValue: number
  riskPerSessionUnit: '%' | '$'
  riskRewardRatio: number
  tradingStyle: string
  initialDeposit?: number
  sourceNode?: any
}

export interface GenesisMatrixDataPayload {
  pages?: any[]
  nodes?: any[]
  connections?: any[]
  zones?: any[]
  version?: string
}

const STORAGE_KEY = 'genesis_matrix_v2'

/**
 * Safely parses raw ExGenesisMatrix JSON input into structured matrix payload.
 */
export function parseMatrixFromJson(jsonInput: unknown): GenesisMatrixDataPayload {
  if (!jsonInput) {
    return { pages: [], nodes: [], connections: [], zones: [] }
  }

  try {
    let parsed: any = jsonInput
    if (typeof jsonInput === 'string') {
      parsed = JSON.parse(jsonInput)
    }

    if (parsed && typeof parsed === 'object') {
      const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : []
      const connections = Array.isArray(parsed.connections) ? parsed.connections : []
      const zones = Array.isArray(parsed.zones) ? parsed.zones : []
      const pages = Array.isArray(parsed.pages) && parsed.pages.length > 0
        ? parsed.pages
        : [{ id: 'genesis-matrix-main', name: 'Genesis Matrix', nodes, connections, zones }]

      return {
        pages,
        nodes,
        connections,
        zones,
        version: parsed.version || '2.0.0'
      }
    }
  } catch (err) {
    console.error('[genesisMatrix] Failed to parse matrix from JSON:', err)
  }

  return { pages: [], nodes: [], connections: [], zones: [] }
}

/**
 * Loads ExGenesisMatrix JSON data from disk storage.
 */
export async function loadMatrixFromDisk(): Promise<GenesisMatrixDataPayload | null> {
  try {
    const data = await loadFromDisk<any>(STORAGE_KEY)
    if (!data) return null
    return parseMatrixFromJson(data)
  } catch (err) {
    console.error('[genesisMatrix] Error loading matrix from disk:', err)
    return null
  }
}

/**
 * Serializes matrix data into a formatted JSON string for export.
 */
export function exportMatrixToJson(data: GenesisMatrixDataPayload): string {
  return JSON.stringify(data, null, 2)
}

/**
 * Extracts all strategies defined in ExGenesisMatrix JSON.
 */
export function getAllStrategiesFromMatrix(matrixData?: any): MatrixStrategyProfile[] {
  if (!matrixData) return []
  return getMatrixStrategyOptions(matrixData)
}

/**
 * Extracts all scenarios (entry and exit) from ExGenesisMatrix JSON data.
 */
export function getAllScenariosFromMatrix(
  matrixData?: any,
  filterOptions: { phase?: 'ENTRY' | 'EXIT' | 'ALL'; strategyId?: string } = {}
): MatrixScenarioProfile[] {
  if (!matrixData) return []

  const payload = parseMatrixFromJson(matrixData)
  const scenarios: MatrixScenarioProfile[] = []

  const pages = payload.pages || []
  pages.forEach((page: any) => {
    const pageNodes = page.nodes || []
    const allNodes = flattenMatrixNodes(pageNodes)
    const allConnections = flattenMatrixConnections(pageNodes, page.connections || [])

    const scenarioNodes = allNodes.filter((node: any) => node.type === 'scenario')

    scenarioNodes.forEach((node: any) => {
      const nodePhase: 'ENTRY' | 'EXIT' | 'GENERAL' = (node.params?.phase || 'ENTRY').toUpperCase() as any
      
      if (filterOptions.phase && filterOptions.phase !== 'ALL' && nodePhase !== filterOptions.phase) {
        return
      }

      // Resolve connected conditions
      const connectedIds = allConnections
        .filter((c: any) => c.fromId === node.id || c.toId === node.id)
        .map((c: any) => c.fromId === node.id ? c.toId : c.fromId)

      const connectedConditionNodes = allNodes.filter((n: any) => n.type === 'condition' && connectedIds.includes(n.id))
      
      const conditions: MatrixNodeCondition[] = connectedConditionNodes.map((cn: any) => ({
        id: cn.id,
        name: cn.params?.name || cn.params?.customName || cn.label || 'Condition',
        description: cn.params?.description || '',
        priority: (cn.params?.priority || 'REQUIRED').toUpperCase() as any,
        type: cn.type,
        params: cn.params || {}
      }))

      const requiredConditions = conditions.filter(c => c.priority === 'REQUIRED')
      const additionalConditions = conditions.filter(c => c.priority === 'ADDITIONAL')

      scenarios.push({
        id: node.id,
        name: String(node.params?.customName || node.params?.name || node.label || 'Untitled Scenario'),
        description: node.params?.description || '',
        phase: nodePhase,
        strategyId: node.params?.strategyId || page.id,
        strategyName: page.name,
        isMini: Boolean(node.params?.isMini),
        conditions,
        requiredConditions,
        additionalConditions,
        node
      })
    })
  })

  if (filterOptions.strategyId) {
    return scenarios.filter(s => !s.strategyId || s.strategyId === filterOptions.strategyId)
  }

  return scenarios
}

/**
 * Extracts all conditions from ExGenesisMatrix JSON data.
 */
export function getAllConditionsFromMatrix(matrixData?: any, strategyId?: string): MatrixConditionProfile[] {
  if (!matrixData) return []

  const payload = parseMatrixFromJson(matrixData)
  const conditions: MatrixConditionProfile[] = []

  const pages = payload.pages || []
  pages.forEach((page: any) => {
    const pageNodes = page.nodes || []
    const allNodes = flattenMatrixNodes(pageNodes)

    allNodes.filter((node: any) => node.type === 'condition').forEach((node: any) => {
      conditions.push({
        id: node.id,
        name: String(node.params?.customName || node.params?.name || node.label || 'Condition'),
        description: node.params?.description || '',
        priority: (node.params?.priority || 'REQUIRED').toUpperCase() as any,
        category: node.params?.category || 'General',
        strategyId: page.id,
        node
      })
    })
  })

  if (strategyId) {
    return conditions.filter(c => !c.strategyId || c.strategyId === strategyId)
  }

  return conditions
}

/**
 * Extracts all visual zones/containers from ExGenesisMatrix JSON data.
 */
export function getAllZonesFromMatrix(matrixData?: any): any[] {
  if (!matrixData) return []
  const payload = parseMatrixFromJson(matrixData)
  const zones: any[] = []

  const pages = payload.pages || []
  pages.forEach((page: any) => {
    zones.push(...(page.zones || []))
  })
  if (payload.zones && payload.zones.length > 0) {
    zones.push(...payload.zones)
  }

  return zones
}

/**
 * Main Vue Composable providing convenient reactive access to ExGenesisMatrix state, strategies, scenarios, and conditions.
 */
export function useGenesisMatrixData() {
  const matrixState = useMatrixState()
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // `useMatrixState` is the only live matrix state.  This composable is a
  // read-only projection for the rest of Genesis, not a second cache.
  const matrixData = computed<GenesisMatrixDataPayload>(() => {
    const pages = matrixState.matrixPages.value
    return {
      pages,
      nodes: pages.flatMap(page => flattenMatrixNodes(page.nodes || [])),
      connections: pages.flatMap(page => flattenMatrixConnections(page.nodes || [], page.connections || [])),
      zones: pages.flatMap(page => page.zones || []),
      version: '2.0.0'
    }
  })

  const loadMatrix = async (force = false) => {
    isLoading.value = true
    error.value = null
    try {
      // `force` intentionally has no separate cache to invalidate: the
      // matrix singleton always reflects the current JSON-backed state.
      void force
      await matrixState.ensureMatrixDataRestored()
    } catch (err: any) {
      error.value = err?.message || 'Failed to load Genesis Matrix data'
      console.error('[useGenesisMatrixData] Error loading matrix:', err)
    } finally {
      isLoading.value = false
    }
    return matrixData.value
  }

  const allPages = computed(() => matrixData.value?.pages || [])

  const allNodes = computed(() => {
    const pages = allPages.value
    if (pages.length === 0) return matrixData.value?.nodes || []
    return pages.flatMap(p => flattenMatrixNodes(p.nodes || []))
  })

  const allConnections = computed(() => {
    const pages = allPages.value
    if (pages.length === 0) return matrixData.value?.connections || []
    return pages.flatMap(p => flattenMatrixConnections(p.nodes || [], p.connections || []))
  })

  const allZones = computed(() => getAllZonesFromMatrix(matrixData.value))

  const strategies = computed(() => getAllStrategiesFromMatrix(matrixData.value))

  const scenarios = computed(() => getAllScenariosFromMatrix(matrixData.value))

  const entryScenarios = computed(() => scenarios.value.filter(s => s.phase === 'ENTRY'))

  const exitScenarios = computed(() => scenarios.value.filter(s => s.phase === 'EXIT'))

  const conditions = computed(() => getAllConditionsFromMatrix(matrixData.value))

  const importFromJson = async (jsonInput: unknown): Promise<GenesisMatrixDataPayload> => {
    const parsed = parseMatrixFromJson(jsonInput)
    await saveToDisk(STORAGE_KEY, parsed)
    const appBootStore = useAppBootStore()
    appBootStore.genesisMatrixCache = parsed
    await matrixState.restoreData()
    return matrixData.value
  }

  const exportToJson = (): string => {
    return exportMatrixToJson(matrixData.value)
  }

  return {
    matrixData: readonly(matrixData),
    isLoading: readonly(isLoading),
    error: readonly(error),
    loadMatrix,
    allPages,
    allNodes,
    allConnections,
    allZones,
    strategies,
    scenarios,
    entryScenarios,
    exitScenarios,
    conditions,
    getScenariosForStrategy: (strategyId?: string, phase?: 'ENTRY' | 'EXIT' | 'ALL') =>
      getAllScenariosFromMatrix(matrixData.value, { strategyId, phase }),
    getConditionsForStrategy: (strategyId?: string) =>
      getAllConditionsFromMatrix(matrixData.value, strategyId),
    importFromJson,
    exportToJson
  }
}
