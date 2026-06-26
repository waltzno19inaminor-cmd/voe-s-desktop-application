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

export type TextFormatPreset = 'h' | 'p' | 'quote'

export function useMatrixMenu(state: ReturnType<typeof useMatrixState>) {
  const { locale, t } = useI18n()

  const assetSearchQuery = ref('')
  const assetResults = ref<AssetInfo[]>([])
  const isSearchingAssets = ref(false)
  const failedIcons = ref<Set<string>>(new Set())
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

  const indicatorCategories = ref<MatrixIndicatorCategory[]>(indicatorData.categories as MatrixIndicatorCategory[])
  const activeIndicatorCategory = ref(indicatorCategories.value[0]?.id || 'TREND')
  const indicatorSearchQuery = ref('')
  const hoveredDescription = ref('')
  const mousePos = ref({ x: 0, y: 0 })

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
    mousePos.value = { x: e.clientX, y: e.clientY }
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
      try {
        assetResults.value = await searchAssets(assetSearchQuery.value)
      } finally {
        isSearchingAssets.value = false
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
    assetSearchQuery.value = ''
    assetResults.value = []
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
        parentType: parentNode.type
      }
    }

    if (!parentId) return
    state.nodes.value.push(newNode)
    state.connections.value.push({ fromId: parentId, toId: id })
    state.selectNode(parentId)
    state.saveMatrixData()
  }

  function updateScalingEntry() {
    const node = state.effectiveSelectedNode.value
    if (!node || node.type !== 'scaling-entry') return
    node.params.lots = scalingLots.value
    node.params.step = scalingStep.value
    node.params.unit = scalingUnit.value
    node.params.lotsMode = scalingMode.value
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
    state.connections.value.push({ fromId: lastSelected.id, toId: id })
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
    const nextCategory = {
      ...category,
      id: normalizedId,
      indicators: category.indicators || []
    }
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
      upsertIndicatorCategory(await loadFundamentalIndicatorCategory())
      upsertIndicatorCategory(await syncFundamentalIndicatorCategory())
    } catch (error) {
      console.warn('[MatrixIndicators] Fundamental indicator sync failed:', error)
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
    nodeContextMenu.value = payload
  }

  function handleConnectionClick(e: MouseEvent, connection: Connection) {
    connectionContextMenu.value = {
      x: e.clientX,
      y: e.clientY,
      connection
    }
  }

  function handlePersonalCondContextMenu(e: MouseEvent, indicator: any) {
    personalCondContextMenu.value = {
      x: e.clientX,
      y: e.clientY,
      indicator
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
      node.params.comments.push({
        id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        text: '[ LOG_INITIALIZED ]',
        x: 300,
        y: 0,
        width: 450,
        height: 280,
        isEditing: false
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
      if (!node.params.direction || node.params.direction === 'NONE') {
        node.params.direction = 'LONG'
      } else if (node.params.direction === 'LONG') {
        node.params.direction = 'SHORT'
      } else {
        node.params.direction = 'NONE'
      }
      state.forceUpdate()
      state.saveMatrixData()
    }
    nodeContextMenu.value = null
  }

  function setNodePhase(nodeId: string, phase: 'ENTRY' | 'EXIT' | 'NONE') {
    const node = state.getNode(nodeId)
    if (node) {
      if (!node.params) node.params = {}
      node.params.phase = phase
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
      const nextPhase = phases[(phases.indexOf(currentPhase) + 1) % phases.length]
      node.params.phase = nextPhase
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
      const nextPriority = priorities[(priorities.indexOf(currentPriority) + 1) % priorities.length]
      node.params.priority = nextPriority
      state.saveMatrixData()
      state.forceUpdate()
    }
    nodeContextMenu.value = null
  }

  function setConnectionLabel(label: string | null) {
    if (connectionContextMenu.value) {
      const conn = connectionContextMenu.value.connection
      if (label === null) {
        delete conn.label
        delete conn.bundleId
      } else {
        const lowerLabel = label.toLowerCase()
        const isLogic = lowerLabel === 'and' || lowerLabel === 'or'
        const oldLabel = conn.label
        const wasLogic = oldLabel === 'and' || oldLabel === 'or'

        if (isLogic) {
          if (oldLabel === lowerLabel) {
            const bundleId = conn.bundleId || ('b' + Date.now().toString(36))
            conn.bundleId = bundleId

            const id = 'n' + Date.now().toString(36)
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
              params: {}
            }

            state.nodes.value.push(newNode)
            state.connections.value.push({
              fromId: conn.fromId,
              toId: id,
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

            const id = 'n' + Date.now().toString(36)
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
              params: {}
            }

            state.nodes.value.push(newNode)
            state.connections.value.push({
              fromId: conn.fromId,
              toId: id,
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
      state.saveMatrixData()
    }
    connectionContextMenu.value = null
    state.forceUpdate()
  }

  return {
    assetSearchQuery,
    assetResults,
    isSearchingAssets,
    failedIcons,
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
    updateMousePos,
    tooltipStyles,
    handleAssetSearch,
    addAssetNode,
    toggleMenuCategory,
    addScalingEntry,
    updateScalingEntry,
    handleCreateConfig,
    handleCreateCustomIndicator,
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
