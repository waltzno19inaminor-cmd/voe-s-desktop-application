import { ref, computed, watch } from 'vue'
import type { useMatrixState, Node, Connection, MenuCategory } from './useMatrixState'
import { searchAssets, type AssetInfo } from '@/shared/api/asset.service'
import indicatorData from '@/shared/assets/indicators.json'
import {
  loadFundamentalIndicatorCategory,
  syncFundamentalIndicatorCategory,
  type MatrixIndicatorCategory
} from '@/shared/api/fundamentalIndicators.service'
import { useI18n } from '~/shared/i18n/useI18n'
import { useMatrixChangeTree } from './useMatrixChangeTree'

export type TextFormatPreset = 'h' | 'p' | 'quote'

export function useMatrixMenu(state: ReturnType<typeof useMatrixState>) {
  const { locale, t } = useI18n()
  const changeTree = state.changeTree
  const cloneMatrixValue = <T>(value: T): T => {
    return JSON.parse(JSON.stringify(value))
  }

  function stripFundamentalIndicatorSource(indicator: any) {
    if (!indicator?.params?.fundamental) return indicator
    const params = { ...(indicator.params || {}) }
    delete params.source
    return {
      ...indicator,
      params
    }
  }

  function sanitizeIndicatorCategory(category: MatrixIndicatorCategory): MatrixIndicatorCategory {
    if (String(category.id || '').toUpperCase() !== 'FUNDAMENTAL') return category
    return {
      ...category,
      indicators: (category.indicators || []).map(stripFundamentalIndicatorSource)
    }
  }

  function createDirectNodeAddAction(node: Node) {
    const container = state.createActiveContainerAccess()
    return {
      undo: () => {
        container.setNodes(container.getNodes().filter(item => item.id !== node.id))
        container.setConnections(container.getConnections().filter(conn => conn.fromId !== node.id && conn.toId !== node.id))
        state.forceUpdate()
        state.saveMatrixData()
      },
      redo: () => {
        if (!container.getNodes().some(item => item.id === node.id)) {
          container.setNodes([...container.getNodes(), cloneMatrixValue(node)])
        }
        state.forceUpdate()
        state.saveMatrixData()
      }
    }
  }

  function createDirectConnectionAddAction(connection: Connection) {
    const connectionSnapshot = cloneMatrixValue(connection)
    const container = state.createActiveContainerAccess()
    return {
      undo: () => {
        container.setConnections(container.getConnections().filter(conn => !(conn.fromId === connectionSnapshot.fromId && conn.toId === connectionSnapshot.toId)))
        state.cleanupLogicBundles(container)
        state.forceUpdate()
        state.saveMatrixData()
      },
      redo: () => {
        const exists = container.getConnections().some(conn => conn.fromId === connectionSnapshot.fromId && conn.toId === connectionSnapshot.toId)
        if (!exists) container.setConnections([...container.getConnections(), cloneMatrixValue(connectionSnapshot)])
        state.forceUpdate()
        state.saveMatrixData()
      }
    }
  }

  function connectionKey(connection: Connection) {
    return [
      connection.fromId,
      connection.toId,
      connection.fromPort || '',
      connection.toPort || ''
    ].join('->')
  }

  function createScopedMatrixPatchAction(beforeNodes: Node[], beforeConnections: Connection[], afterNodes: Node[], afterConnections: Connection[]) {
    const container = state.createActiveContainerAccess()
    const beforeNodeMap = new Map<string, Node>(beforeNodes.map(node => [node.id, cloneMatrixValue(node)] as [string, Node]))
    const afterNodeMap = new Map<string, Node>(afterNodes.map(node => [node.id, cloneMatrixValue(node)] as [string, Node]))
    const touchedNodeIds = new Set<string>()

    beforeNodeMap.forEach((beforeNode, id) => {
      const afterNode = afterNodeMap.get(id)
      if (!afterNode || JSON.stringify(beforeNode) !== JSON.stringify(afterNode)) touchedNodeIds.add(id)
    })
    afterNodeMap.forEach((afterNode, id) => {
      const beforeNode = beforeNodeMap.get(id)
      if (!beforeNode || JSON.stringify(beforeNode) !== JSON.stringify(afterNode)) touchedNodeIds.add(id)
    })

    const beforeConnectionMap = new Map<string, Connection>(beforeConnections.map(connection => [connectionKey(connection), cloneMatrixValue(connection)] as [string, Connection]))
    const afterConnectionMap = new Map<string, Connection>(afterConnections.map(connection => [connectionKey(connection), cloneMatrixValue(connection)] as [string, Connection]))
    const touchedConnectionKeys = new Set<string>()

    beforeConnectionMap.forEach((beforeConnection, key) => {
      const afterConnection = afterConnectionMap.get(key)
      if (!afterConnection || JSON.stringify(beforeConnection) !== JSON.stringify(afterConnection)) touchedConnectionKeys.add(key)
    })
    afterConnectionMap.forEach((afterConnection, key) => {
      const beforeConnection = beforeConnectionMap.get(key)
      if (!beforeConnection || JSON.stringify(beforeConnection) !== JSON.stringify(afterConnection)) touchedConnectionKeys.add(key)
    })

    const applyPatch = (nodeMap: Map<string, Node>, connectionMap: Map<string, Connection>) => {
      container.setNodes([
        ...container.getNodes().filter(node => !touchedNodeIds.has(node.id)),
        ...Array.from(touchedNodeIds)
          .map(id => nodeMap.get(id))
          .filter((node): node is Node => !!node)
          .map(node => cloneMatrixValue(node))
      ])

      container.setConnections([
        ...container.getConnections().filter(connection => !touchedConnectionKeys.has(connectionKey(connection))),
        ...Array.from(touchedConnectionKeys)
          .map(key => connectionMap.get(key))
          .filter((connection): connection is Connection => !!connection)
          .map(connection => cloneMatrixValue(connection))
      ])

      state.cleanupLogicBundles(container)
      state.forceUpdate()
      state.saveMatrixData()
    }

    return {
      undo: () => applyPatch(beforeNodeMap, beforeConnectionMap),
      redo: () => applyPatch(afterNodeMap, afterConnectionMap)
    }
  }

  const assetSearchQuery = ref('')
  const assetResults = ref<AssetInfo[]>([])
  const isSearchingAssets = ref(false)
  let searchTimeout: any = null

  const scalingLots = ref(1)
  const scalingStep = ref(0)
  const scalingUnit = ref<'%' | '$'>('%')
  const scalingMode = ref<'LOTS' | 'PERCENT'>('LOTS')

  const riskLossTrade = ref(1)
  const riskLossTradeUnit = ref<'%' | '$'>('%')
  const riskLossDayUnit = ref<'%' | '$'>('$')
  const riskLossDay = ref(5)
  const riskRR = ref(3)

  const indicatorCategories = ref<MatrixIndicatorCategory[]>(
    (indicatorData.categories as MatrixIndicatorCategory[]).map(sanitizeIndicatorCategory)
  )
  const activeIndicatorCategory = ref(indicatorCategories.value[0]?.id || 'TREND')
  const indicatorSearchQuery = ref('')
  const isSyncingFundamentalIndicators = ref(false)
  const fundamentalIndicatorSyncStatus = ref<'idle' | 'synced' | 'fallback' | 'error'>('idle')
  const hoveredDescription = ref('')
  const mousePos = ref({ x: 0, y: 0 })
  let mousePosFrame: number | null = null
  let pendingMousePos: { x: number, y: number } | null = null

  const activeTextColor = ref('#2c2c2a')
  const savedTextSelection = ref<Range | null>(null)
  
  const currentStepPage = ref(0)
  const stepPagesCount = 3

  const isConditionCreatorOpen = ref(false)
  const isConfigSetterOpen = ref(false)

  // Context Menu States
  const nodeContextMenu = ref<{ x: number, y: number, nodeId: string } | null>(null)
  const connectionContextMenu = ref<{ x: number, y: number, connection: Connection } | null>(null)
  const personalCondContextMenu = ref<{ x: number, y: number, indicator: any } | null>(null)
  const pageContextMenu = ref<{ x: number, y: number, pageId: string } | null>(null)

  // Watch lastSelectedId to sync values
  watch(state.lastSelectedId, (newId) => {
    if (!newId) return
    const node = state.getNode(newId)
    if (node?.type === 'risk') {
      riskLossTrade.value = node.params?.riskLossTrade ?? 1
      riskLossTradeUnit.value = node.params?.riskLossTradeUnit || '%'
      riskLossDay.value = node.params?.riskLossDay ?? 5
      riskLossDayUnit.value = node.params?.riskLossDayUnit || '$'
      riskRR.value = node.params?.riskRR ?? 3
    } else if (node?.type === 'scaling-entry') {
      scalingLots.value = node.params.lots || 1
      scalingStep.value = node.params.step || 0
      scalingUnit.value = node.params.unit || '%'
      scalingMode.value = node.params.lotsMode || 'LOTS'
    }
  })

  const updateMousePos = (e: MouseEvent) => {
    if (!hoveredDescription.value) return

    pendingMousePos = { x: e.clientX, y: e.clientY }
    if (mousePosFrame !== null) return

    mousePosFrame = requestAnimationFrame(() => {
      if (pendingMousePos) {
        mousePos.value = pendingMousePos
        pendingMousePos = null
      }
      mousePosFrame = null
    })
  }

  const tooltipStyles = computed(() => {
    const xOffset = 24
    const yOffset = 24
    const isBottom = mousePos.value.y > window.innerHeight * 0.7
    return {
      left: `${mousePos.value.x + xOffset}px`,
      top: isBottom ? 'auto' : `${mousePos.value.y + yOffset}px`,
      bottom: isBottom ? `${window.innerHeight - mousePos.value.y + 10}px` : 'auto'
    }
  })

  async function handleAssetSearch() {
    if (!assetSearchQuery.value) {
      assetResults.value = []
      return
    }
    isSearchingAssets.value = true
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(async () => {
      const query = assetSearchQuery.value
      try {
        const results = await searchAssets(query)
        if (query !== assetSearchQuery.value) return
        if (query !== assetSearchQuery.value) return
        assetResults.value = results
      } finally {
        if (query === assetSearchQuery.value) {
          isSearchingAssets.value = false
        }
      }
    }, 300)
  }

  function addAssetNode(asset: AssetInfo) {
    state.setPendingNode({
      label: asset.symbol,
      type: 'instrument',
      color: 'currentColor',
      description: asset.description || `${asset.name} // ${asset.type}`,
      params: {
        symbol: asset.symbol,
        name: asset.name,
        logo: asset.icon,
        type: asset.type,
        info: asset.description
      }
    })
  }

  function toggleMenuCategory(category: MenuCategory) {
    if (state.activeMenuCategory.value === category) {
      state.activeMenuCategory.value = null
    } else {
      state.activeMenuCategory.value = category
    }
  }

  function addScalingEntry() {
    const parentId = state.lastSelectedId.value
    const parentNode = parentId ? state.getNode(parentId) : null
    if (!parentNode || (parentNode.type !== 'pyramiding' && parentNode.type !== 'averaging')) return

    const siblingCount = state.connections.value.filter(
      c => c.fromId === parentId && state.getNode(c.toId)?.type === 'scaling-entry'
    ).length
    const posNumber = siblingCount + 1

    const id = 'se' + Date.now().toString(36)
    const newNode: Node = {
      id,
      label: String(posNumber),
      type: 'scaling-entry',
      x: parentNode.x + 180 + (siblingCount % 3) * 160,
      y: parentNode.y - 80 + siblingCount * 80,
      color: '#FFF',
      params: {
        posNumber,
        lots: scalingLots.value,
        step: scalingStep.value,
        unit: scalingUnit.value,
        lotsMode: scalingMode.value,
        parentType: parentNode.type,
        parentLabel: parentNode.label,
        parentId
      }
    }

    if (!parentId) return
    state.nodes.value.push(newNode)
    const newConnection = { fromId: parentId, toId: id }
    state.connections.value.push(newConnection)
    changeTree.recordNodeAdded(newNode, createDirectNodeAddAction(newNode), state.activeContextNode.value || undefined)
    changeTree.recordConnectionCreated(newConnection, parentNode, newNode, createDirectConnectionAddAction(newConnection))
    state.selectNode(parentId)
    state.saveMatrixData()
  }

  function updateScalingEntry() {
    const node = state.effectiveSelectedNode.value
    if (!node || node.type !== 'scaling-entry') return
    if (!node.params.parentId) {
      const parentConnection = state.connections.value.find(connection => (
        connection.toId === node.id &&
        ['pyramiding', 'averaging'].includes(state.getNode(connection.fromId)?.type || '')
      ))
      if (parentConnection) node.params.parentId = parentConnection.fromId
    }
    node.params.lots = scalingLots.value
    node.params.step = scalingStep.value
    node.params.unit = scalingUnit.value
    node.params.lotsMode = scalingMode.value
    changeTree.recordScalingEntryChanged(node)
    state.saveMatrixData()
    state.forceUpdate()
  }

  function handleCreateConfig(config: { label: string, description: string }) {
    const lastSelected = state.lastSelectedId.value ? state.getNode(state.lastSelectedId.value) : null
    if (!lastSelected) return

    const id = 'cfg' + Date.now().toString(36)
    const newNode: Node = {
      id,
      label: config.label,
      type: 'condition',
      x: lastSelected.x + 200,
      y: lastSelected.y,
      color: '#FFF',
      params: {
        isConfig: true,
        description: config.description
      }
    }

    state.nodes.value.push(newNode)
    const newConnection = { fromId: lastSelected.id, toId: id }
    state.connections.value.push(newConnection)
    changeTree.recordNodeAdded(newNode, createDirectNodeAddAction(newNode), state.activeContextNode.value || undefined)
    changeTree.recordConnectionCreated(newConnection, lastSelected, newNode, createDirectConnectionAddAction(newConnection))
    isConfigSetterOpen.value = false
    state.saveMatrixData()
    state.selectNode(id)
  }

  function handleCreateCustomIndicator(indicator: any) {
    state.personalIndicators.value.push(indicator)
    activeIndicatorCategory.value = 'PERSONAL'
    state.setPendingNode(indicator)
  }

  function upsertIndicatorCategory(category: MatrixIndicatorCategory) {
    const normalizedId = category.id.toUpperCase()
    const nextCategory = sanitizeIndicatorCategory({
      ...category,
      id: normalizedId,
      indicators: category.indicators || []
    })
    const index = indicatorCategories.value.findIndex(item => item.id === normalizedId)
    if (index >= 0) {
      indicatorCategories.value = indicatorCategories.value.map((item, itemIndex) => (
        itemIndex === index ? nextCategory : item
      ))
    } else {
      indicatorCategories.value = [...indicatorCategories.value, nextCategory]
    }
  }

  async function hydrateFundamentalIndicators() {
    try {
      const category = await loadFundamentalIndicatorCategory()
      upsertIndicatorCategory(category)
      fundamentalIndicatorSyncStatus.value = category.source === 'fallback'
        ? 'fallback'
        : 'synced'
    } catch (error) {
      console.warn('[MatrixIndicators] Failed to hydrate fundamental indicators:', error)
      fundamentalIndicatorSyncStatus.value = 'error'
    }
  }

  async function syncFundamentalIndicators() {
    isSyncingFundamentalIndicators.value = true
    try {
      const category = await syncFundamentalIndicatorCategory()
      upsertIndicatorCategory(category)
      activeIndicatorCategory.value = category.id
      fundamentalIndicatorSyncStatus.value = category.source === 'fallback'
        ? 'fallback'
        : 'synced'
    } catch (error) {
      console.warn('[MatrixIndicators] Fundamental indicator sync failed:', error)
      fundamentalIndicatorSyncStatus.value = 'error'
    } finally {
      isSyncingFundamentalIndicators.value = false
    }
  }

  void hydrateFundamentalIndicators()

  function ensureTextPanelParams(node: Node) {
    if (!node.params) node.params = {}
    if (typeof node.params.value !== 'string') node.params.value = ''
    if (typeof node.params.activeTextColor !== 'string') node.params.activeTextColor = ''
    if (typeof node.params.html !== 'string') {
      node.params.html = escapeTextHtml(node.params.value).replace(/\n/g, '<br>')
    }
  }

  function escapeTextHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  function getActiveTextEditor() {
    if (!state.activeTextNode.value) return null
    return document.querySelector(`[data-text-node-id="${state.activeTextNode.value.id}"]`) as HTMLElement | null
  }

  function saveTextSelection() {
    const selection = window.getSelection()
    if (!selection?.rangeCount) return
    const range = selection.getRangeAt(0)
    const editor = getActiveTextEditor()
    if (!editor || !editor.contains(range.commonAncestorContainer)) return
    savedTextSelection.value = range.cloneRange()
  }

  function restoreTextSelection() {
    const editor = getActiveTextEditor()
    if (!editor) return
    editor.focus()
    const selection = window.getSelection()
    if (!selection) return
    selection.removeAllRanges()
    if (savedTextSelection.value) {
      selection.addRange(savedTextSelection.value)
    }
  }

  function syncActiveTextHtml() {
    const node = state.activeTextNode.value
    const editor = getActiveTextEditor()
    if (!node || !editor) return
    ensureTextPanelParams(node)
    node.params.html = editor.innerHTML
    node.params.value = editor.innerText
    state.saveMatrixData()
    state.forceUpdate()
  }

  function openTextCommandLink(node: Node) {
    ensureTextPanelParams(node)
    state.activeTextNodeId.value = node.id
    activeTextColor.value = node.params.activeTextColor || 'currentColor'
    state.activeMenuCategory.value = 'TEXT_FORMAT'
  }

  function applyTextCommand(command: string, value?: string) {
    if (!state.activeTextNode.value) return
    restoreTextSelection()
    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand(command, false, value)
    syncActiveTextHtml()
    saveTextSelection()
  }

  const textFormatPresets: Array<{ id: TextFormatPreset; label: string; block: string }> = [
    { id: 'h', label: 'H', block: 'h2' },
    { id: 'p', label: 'P', block: 'p' }
  ]

  function applyTextBlock(preset: TextFormatPreset) {
    const block = preset === 'quote' ? 'blockquote' : textFormatPresets.find(item => item.id === preset)?.block
    if (!block) return
    applyTextCommand('formatBlock', block)
  }

  function applyTextColor(event?: Event) {
    activeTextColor.value = (event?.target as HTMLInputElement | undefined)?.value || activeTextColor.value
    if (state.activeTextNode.value) {
      ensureTextPanelParams(state.activeTextNode.value)
      state.activeTextNode.value.params.activeTextColor = activeTextColor.value
    }
    applyTextCommand('foreColor', activeTextColor.value)
  }

  function resetTextColor() {
    if (state.activeTextNode.value) {
      ensureTextPanelParams(state.activeTextNode.value)
      state.activeTextNode.value.params.activeTextColor = 'currentColor'
    }
    activeTextColor.value = 'currentColor'
    applyTextCommand('foreColor', 'var(--matrix-text-default-color)')
  }

  const indicatorTypes = computed(() => {
    const query = indicatorSearchQuery.value.toUpperCase()
    if (query) {
      const system = indicatorCategories.value.flatMap(c => c.indicators)
      const personal = state.personalIndicators.value
      return [...system, ...personal].filter((i: any) => 
        i.label.includes(query) || (i.description || '').toUpperCase().includes(query)
      )
    }
    if (activeIndicatorCategory.value === 'PERSONAL') {
      return state.personalIndicators.value
    }
    return indicatorCategories.value.find(c => c.id === activeIndicatorCategory.value)?.indicators || []
  })

  // Context Menu Actions
  function handleNodeContextMenu(payload: { x: number, y: number, nodeId: string }) {
    connectionContextMenu.value = null
    personalCondContextMenu.value = null
    pageContextMenu.value = null
    nodeContextMenu.value = payload
  }

  function handleConnectionClick(e: MouseEvent, connection: Connection) {
    nodeContextMenu.value = null
    personalCondContextMenu.value = null
    pageContextMenu.value = null
    connectionContextMenu.value = {
      x: e.clientX,
      y: e.clientY,
      connection
    }
  }

  function handlePersonalCondContextMenu(e: MouseEvent, indicator: any) {
    nodeContextMenu.value = null
    connectionContextMenu.value = null
    pageContextMenu.value = null
    personalCondContextMenu.value = {
      x: e.clientX,
      y: e.clientY,
      indicator
    }
  }

  function handlePageContextMenu(e: MouseEvent, pageId: string) {
    nodeContextMenu.value = null
    connectionContextMenu.value = null
    personalCondContextMenu.value = null
    pageContextMenu.value = {
      x: e.clientX,
      y: e.clientY,
      pageId
    }
  }

  function removePersonalCondition(indicator: any) {
    state.personalIndicators.value = state.personalIndicators.value.filter(
      (ind: any) => ind.label !== indicator.label
    )
    personalCondContextMenu.value = null
    state.saveMatrixData()
  }

  function addCommentToNode(nodeId: string) {
    const node = state.getNode(nodeId)
    if (node) {
      if (!node.params.comments) node.params.comments = []
      const comment = {
        id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        text: '[ LOG_INITIALIZED ]',
        x: 300,
        y: 0,
        width: 450,
        height: 280,
        isEditing: false
      }
      node.params.comments.push(comment)
      const commentSnapshot = cloneMatrixValue(comment)
      changeTree.recordNodeCommentAdded(node, comment, {
        undo: () => {
          const globalNode = state.getNode(nodeId)
          if (globalNode && globalNode.params) {
            globalNode.params.comments = (globalNode.params.comments || []).filter((item: any) => item.id !== commentSnapshot.id)
            state.forceUpdate()
            state.saveMatrixData()
          }
        },
        redo: () => {
          const globalNode = state.getNode(nodeId)
          if (globalNode && globalNode.params) {
            if (!(globalNode.params.comments || []).some((item: any) => item.id === commentSnapshot.id)) {
              if (!globalNode.params.comments) globalNode.params.comments = []
              globalNode.params.comments.push(cloneMatrixValue(commentSnapshot))
            }
            state.forceUpdate()
            state.saveMatrixData()
          }
        }
      })
      state.selectNode(nodeId)
      state.forceUpdate()
      state.saveMatrixData()
    }
    nodeContextMenu.value = null
  }

  function setNodeCustomName(nodeId: string) {
    const node = state.getNode(nodeId)
    if (node) {
      if (!node.params) node.params = {}
      node.params.isEditingName = true
      state.forceUpdate()
    }
    nodeContextMenu.value = null
  }

  function setNodeCustomDescription(nodeId: string) {
    const node = state.getNode(nodeId)
    if (node) {
      if (!node.params) node.params = {}
      node.params.isEditingDescription = true
      state.forceUpdate()
    }
    nodeContextMenu.value = null
  }

  function cycleNodeDirection(nodeId: string) {
    const node = state.getNode(nodeId)
    if (node) {
      if (!node.params) node.params = {}
      const oldDirection = node.params.direction || 'NONE'
      let newDirection = 'NONE'
      if (oldDirection === 'NONE') {
        newDirection = 'LONG'
      } else if (oldDirection === 'LONG') {
        newDirection = 'SHORT'
      } else {
        newDirection = 'NONE'
      }
      
      if (newDirection === 'NONE') {
        delete node.params.direction
      } else {
        node.params.direction = newDirection
      }
      
      changeTree.recordNodeDirectionChanged(node, newDirection, {
        undo: () => {
          const globalNode = state.getNode(nodeId)
          if (globalNode && globalNode.params) {
            const val = newDirection === 'NONE' ? oldDirection : 'NONE'
            if (val === 'NONE') {
              delete globalNode.params.direction
            } else {
              globalNode.params.direction = val
            }
            state.forceUpdate()
            state.saveMatrixData()
          }
        },
        redo: () => {
          const globalNode = state.getNode(nodeId)
          if (globalNode && globalNode.params) {
            if (newDirection === 'NONE') {
              delete globalNode.params.direction
            } else {
              globalNode.params.direction = newDirection
            }
            state.forceUpdate()
            state.saveMatrixData()
          }
        }
      })
      
      state.forceUpdate()
      state.saveMatrixData()
    }
    nodeContextMenu.value = null
  }

  function setNodePhase(nodeId: string, phase: 'ENTRY' | 'EXIT' | 'NONE') {
    const node = state.getNode(nodeId)
    if (node) {
      if (!node.params) node.params = {}
      const oldPhase = node.params.phase || 'NONE'
      
      if (phase === 'NONE') {
        delete node.params.phase
      } else {
        node.params.phase = phase
      }
      
      changeTree.recordNodePhaseChanged(node, phase, {
        undo: () => {
          const globalNode = state.getNode(nodeId)
          if (globalNode && globalNode.params) {
            const val = phase === 'NONE' ? oldPhase : 'NONE'
            if (val === 'NONE') {
              delete globalNode.params.phase
            } else {
              globalNode.params.phase = val
            }
            state.forceUpdate()
            state.saveMatrixData()
          }
        },
        redo: () => {
          const globalNode = state.getNode(nodeId)
          if (globalNode && globalNode.params) {
            if (phase === 'NONE') {
              delete globalNode.params.phase
            } else {
              globalNode.params.phase = phase
            }
            state.forceUpdate()
            state.saveMatrixData()
          }
        }
      })
      
      state.saveMatrixData()
      state.forceUpdate()
    }
    nodeContextMenu.value = null
  }

  function cycleNodePhase(nodeId: string) {
    const node = state.getNode(nodeId)
    if (node) {
      if (!node.params) node.params = {}
      const phases = ['NONE', 'ENTRY', 'EXIT']
      const currentPhase = node.params.phase || 'NONE'
      const nextPhase = phases[(phases.indexOf(currentPhase) + 1) % phases.length] || 'NONE'
      
      if (nextPhase === 'NONE') {
        delete node.params.phase
      } else {
        node.params.phase = nextPhase
      }
      
      changeTree.recordNodePhaseChanged(node, nextPhase, {
        undo: () => {
          const globalNode = state.getNode(nodeId)
          if (globalNode && globalNode.params) {
            const val = nextPhase === 'NONE' ? currentPhase : 'NONE'
            if (val === 'NONE') {
              delete globalNode.params.phase
            } else {
              globalNode.params.phase = val
            }
            state.forceUpdate()
            state.saveMatrixData()
          }
        },
        redo: () => {
          const globalNode = state.getNode(nodeId)
          if (globalNode && globalNode.params) {
            if (nextPhase === 'NONE') {
              delete globalNode.params.phase
            } else {
              globalNode.params.phase = nextPhase
            }
            state.forceUpdate()
            state.saveMatrixData()
          }
        }
      })
      
      state.saveMatrixData()
      state.forceUpdate()
    }
    nodeContextMenu.value = null
  }

  function cycleNodePriority(nodeId: string) {
    const node = state.getNode(nodeId)
    if (node) {
      if (!node.params) node.params = {}
      const priorities = ['NONE', 'REQUIRED', 'ADDITIONAL']
      const currentPriority = node.params.priority || 'NONE'
      const nextPriority = priorities[(priorities.indexOf(currentPriority) + 1) % priorities.length] || 'NONE'
      
      if (nextPriority === 'NONE') {
        delete node.params.priority
      } else {
        node.params.priority = nextPriority
      }
      
      changeTree.recordNodePriorityChanged(node, nextPriority, {
        undo: () => {
          const globalNode = state.getNode(nodeId)
          if (globalNode && globalNode.params) {
            const val = nextPriority === 'NONE' ? currentPriority : 'NONE'
            if (val === 'NONE') {
              delete globalNode.params.priority
            } else {
              globalNode.params.priority = val
            }
            state.forceUpdate()
            state.saveMatrixData()
          }
        },
        redo: () => {
          const globalNode = state.getNode(nodeId)
          if (globalNode && globalNode.params) {
            if (nextPriority === 'NONE') {
              delete globalNode.params.priority
            } else {
              globalNode.params.priority = nextPriority
            }
            state.forceUpdate()
            state.saveMatrixData()
          }
        }
      })
      
      state.saveMatrixData()
      state.forceUpdate()
    }
    nodeContextMenu.value = null
  }

  function setConnectionLabel(label: string | null) {
    if (connectionContextMenu.value) {
      const conn = connectionContextMenu.value.connection
      const beforeNodes = cloneMatrixValue(state.nodes.value)
      const beforeConnections = cloneMatrixValue(state.connections.value)
      let changeConnection = conn
      if (label === null) {
        const oldLabel = conn.label?.toLowerCase()
        const oldBundleId = conn.bundleId
        if (oldBundleId && (oldLabel === 'and' || oldLabel === 'or')) {
          const bundleConnections = state.connections.value.filter(connection => (
            connection.fromId === conn.fromId && connection.bundleId === oldBundleId
          ))
          const generatedNodeIds = new Set(
            bundleConnections
              .map(connection => state.getNode(connection.toId))
              .filter((node): node is Node => !!node && (
                node.type === 'placeholder' ||
                (
                  node.params?.generatedByLogicLabel === true &&
                  node.params?.logicBundleId === oldBundleId &&
                  node.params?.logicSourceId === conn.fromId
                )
              ))
              .map(node => node.id)
          )
          const survivingConnection = bundleConnections.find(connection => !generatedNodeIds.has(connection.toId))
            || bundleConnections[0]
          bundleConnections.forEach(connection => {
            if (connection !== survivingConnection) generatedNodeIds.add(connection.toId)
          })
          changeConnection = cloneMatrixValue(survivingConnection || conn)

          state.nodes.value = state.nodes.value.filter(node => !generatedNodeIds.has(node.id))
          state.connections.value = state.connections.value
            .filter(connection => (
              !generatedNodeIds.has(connection.fromId) &&
              !generatedNodeIds.has(connection.toId)
            ))
            .map(connection => {
              if (connection.fromId !== conn.fromId || connection.bundleId !== oldBundleId) return connection
              const nextConnection = { ...connection }
              delete nextConnection.label
              delete nextConnection.bundleId
              delete nextConnection.bundleStemX
              delete nextConnection.bundleStemY
              return nextConnection
            })
        } else {
          delete conn.label
          delete conn.bundleId
          delete conn.bundleStemX
          delete conn.bundleStemY
        }
      } else {
        const lowerLabel = label.toLowerCase()
        const isLogic = lowerLabel === 'and' || lowerLabel === 'or'
        const oldLabel = conn.label
        const wasLogic = oldLabel === 'and' || oldLabel === 'or'

        if (isLogic) {
          if (oldLabel === lowerLabel) {
            const bundleId = conn.bundleId || ('b' + Date.now().toString(36))
            conn.bundleId = bundleId
            
            const id = 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
            const fromNode = state.getNode(conn.fromId)
            const toNode = state.getNode(conn.toId)
            const offset = 120
            
            const newNode: Node = {
              id,
              label: 'EMPTY',
              type: 'placeholder',
              x: toNode ? toNode.x : (fromNode ? fromNode.x + 200 : 200),
              y: toNode ? toNode.y + offset : (fromNode ? fromNode.y + offset : 200),
              color: 'currentColor',
              params: {
                generatedByLogicLabel: true,
                logicBundleId: bundleId,
                logicSourceId: conn.fromId
              }
            }
            
            state.nodes.value.push(newNode)
            state.connections.value.push({
              fromId: conn.fromId,
              toId: id,
              fromPort: conn.fromPort,
              toPort: conn.toPort,
              label: lowerLabel,
              bundleId: bundleId,
              bundleStemX: conn.bundleStemX,
              bundleStemY: conn.bundleStemY
            })
          } else if (wasLogic) {
            const bundleId = conn.bundleId
            const bundleConns = state.connections.value.filter(c => c.fromId === conn.fromId && c.bundleId === bundleId)
            bundleConns.forEach(c => {
              c.label = lowerLabel
            })
          } else {
            const bundleId = 'b' + Date.now().toString(36)
            conn.label = lowerLabel
            conn.bundleId = bundleId
            conn.bundleStemX = 0
            conn.bundleStemY = 0
            
            const id = 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
            const fromNode = state.getNode(conn.fromId)
            const toNode = state.getNode(conn.toId)
            const offset = 120
            
            const newNode: Node = {
              id,
              label: 'EMPTY',
              type: 'placeholder',
              x: toNode ? toNode.x : (fromNode ? fromNode.x + 200 : 200),
              y: toNode ? toNode.y + offset : (fromNode ? fromNode.y + offset : 200),
              color: 'currentColor',
              params: {
                generatedByLogicLabel: true,
                logicBundleId: bundleId,
                logicSourceId: conn.fromId
              }
            }
            
            state.nodes.value.push(newNode)
            state.connections.value.push({
              fromId: conn.fromId,
              toId: id,
              fromPort: conn.fromPort,
              toPort: conn.toPort,
              label: lowerLabel,
              bundleId: bundleId,
              bundleStemX: 0,
              bundleStemY: 0
            })
            state.forceUpdate()
          }
        } else {
          conn.label = lowerLabel
          delete conn.bundleId
        }
      }
      const afterNodes = cloneMatrixValue(state.nodes.value)
      const afterConnections = cloneMatrixValue(state.connections.value)
      const labelMemberNode = label && ['and', 'or'].includes(label.toLowerCase())
        ? state.getNode(conn.toId)
        : null
      changeTree.recordConnectionLabelChanged(
        changeConnection,
        label,
        createScopedMatrixPatchAction(beforeNodes, beforeConnections, afterNodes, afterConnections),
        labelMemberNode,
        labelMemberNode ? createDirectConnectionAddAction(conn) : undefined
      )
      state.saveMatrixData()
    }
    connectionContextMenu.value = null
    state.forceUpdate()
  }

  return {
    assetSearchQuery,
    assetResults,
    isSearchingAssets,
    scalingLots,
    scalingStep,
    scalingUnit,
    scalingMode,
    riskLossTrade,
    riskLossTradeUnit,
    riskLossDayUnit,
    riskLossDay,
    riskRR,
    indicatorCategories,
    activeIndicatorCategory,
    indicatorSearchQuery,
    isSyncingFundamentalIndicators,
    fundamentalIndicatorSyncStatus,
    hoveredDescription,
    mousePos,
    activeTextColor,
    savedTextSelection,
    currentStepPage,
    stepPagesCount,
    isConditionCreatorOpen,
    isConfigSetterOpen,
    textFormatPresets,
    indicatorTypes,
    nodeContextMenu,
    connectionContextMenu,
    personalCondContextMenu,
    pageContextMenu,
    updateMousePos,
    tooltipStyles,
    handleAssetSearch,
    addAssetNode,
    toggleMenuCategory,
    addScalingEntry,
    updateScalingEntry,
    handleCreateConfig,
    handleCreateCustomIndicator,
    syncFundamentalIndicators,
    saveTextSelection,
    restoreTextSelection,
    syncActiveTextHtml,
    openTextCommandLink,
    applyTextCommand,
    applyTextBlock,
    applyTextColor,
    resetTextColor,
    handleNodeContextMenu,
    handleConnectionClick,
    handlePersonalCondContextMenu,
    handlePageContextMenu,
    removePersonalCondition,
    addCommentToNode,
    setNodeCustomName,
    setNodeCustomDescription,
    cycleNodeDirection,
    setNodePhase,
    cycleNodePhase,
    cycleNodePriority,
    setConnectionLabel
  }
}
