import { ref, computed, watch, nextTick, onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue'
import { useBoardDrawing } from './useBoardDrawing'
import { useStrategyTradesStore, type StrategyProfile } from '~/features/store/useStrategyTrades'
import allAssets from '~/shared/data/global_assets.json'
import type { DiaryEntry } from '~/entities/diary/model/diary.types'
import type {
  JournalArticleBoardConnection,
  JournalArticleBoardNode,
  JournalArticleBoardPort
} from '~/entities/journal-article/types/journal-article.types'

const assetTypeLocales: Record<string, { ru: string; en: string }> = {
  crypto: { ru: 'КРИПТО', en: 'CRYPTO' },
  stock: { ru: 'АКЦИЯ', en: 'STOCK' },
  forex: { ru: 'ФОРЕКС', en: 'FOREX' },
  index: { ru: 'ИНДЕКС', en: 'INDEX' },
  commodity: { ru: 'ТОВАР', en: 'COMMODITY' }
}

const passivePortRevealDistance = 90

export interface UseExForumBoardEditorOptions {
  boardNodes: Ref<JournalArticleBoardNode[]>
  boardConnections: Ref<JournalArticleBoardConnection[]>
  boardStrokes: Ref<any[]>
  articleType: Ref<string> | ComputedRef<string>
  locale: Ref<'ru' | 'en'> | ComputedRef<'ru' | 'en'>
  isEditingArticle?: Ref<boolean> | ComputedRef<boolean>
  isSignalArticle?: Ref<boolean> | ComputedRef<boolean>
  isQuestionArticle?: Ref<boolean> | ComputedRef<boolean>
}

export function useExForumBoardEditor(options: UseExForumBoardEditorOptions) {
  const {
    boardNodes,
    boardConnections,
    boardStrokes,
    articleType,
    locale,
    isEditingArticle = ref(false),
    isSignalArticle = computed(() => articleType.value === 'SETUP'),
    isQuestionArticle = computed(() => articleType.value === 'QUESTION')
  } = options

  const strategyTradesStore = useStrategyTradesStore()
  const boardDrawing = useBoardDrawing()

  // Board Refs & Viewport State
  const boardStageRef = ref<HTMLElement | null>(null)
  const boardWorldRef = ref<HTMLElement | null>(null)
  const boardDrawingCanvasRef = ref<HTMLCanvasElement | null>(null)

  const boardPan = ref({ x: 48, y: 36 })
  const boardScale = ref(1)
  const isBoardFullscreen = ref(false)

  const snapBoardCssPixel = (value: number) => Math.round(value)
  const snapBoardPoint = (point: { x: number; y: number }) => ({
    x: snapBoardCssPixel(point.x),
    y: snapBoardCssPixel(point.y)
  })

  const boardPointerPos = ref({ x: 0, y: 0 })
  const boardGridSize = ref(28)
  const boardRenderScale = computed(() => (isBoardFullscreen.value ? boardScale.value : 1))
  const boardRenderGridSize = computed(() => boardGridSize.value * boardRenderScale.value)
  const boardUnitSize = ref({ width: 72, height: 44 })
  const boardBaseWorldSize = computed(() => ({
    width: boardUnitSize.value.width * boardRenderGridSize.value,
    height: boardUnitSize.value.height * boardRenderGridSize.value
  }))

  const boardWorldStyle = computed(() => ({
    width: `${snapBoardCssPixel(boardBaseWorldSize.value.width)}px`,
    height: `${snapBoardCssPixel(boardBaseWorldSize.value.height)}px`
  }))

  const boardTransformStyle = computed(() => ({
    transform: `translate(${snapBoardCssPixel(boardPan.value.x)}px, ${snapBoardCssPixel(boardPan.value.y)}px)`
  }))

  // Tools & Interaction
  type BoardToolType =
    | 'text'
    | 'image'
    | 'drawing'
    | 'pencil'
    | 'asset-node'
    | 'current-price'
    | 'target-price'
    | 'strategy-node'
    | 'trade-node'
    | null

  type BoardInteraction =
    | { type: 'pan'; startClientX: number; startClientY: number; startPanX: number; startPanY: number }
    | { type: 'moveNode'; node: any; startClientX: number; startClientY: number; startNodeX: number; startNodeY: number }
    | { type: 'resizeNode'; node: any; startClientX: number; startClientY: number; startNodeW: number; startNodeH: number }

  const activeBoardTool = ref<BoardToolType>(null)
  const activeBoardInteraction = ref<BoardInteraction | null>(null)
  const isSpacePressed = ref(false)

  // Node Selection & Editing
  const selectedBoardNodeId = ref<string | null>(null)
  const selectedBoardNode = computed(() => boardNodes.value.find((n: any) => n.id === selectedBoardNodeId.value) || null)
  const activeEditorField = ref<'title' | 'text' | null>(null)

  // Node Context Menu
  const nodeContextMenu = ref<{ x: number; y: number; nodeId: string } | null>(null)

  // Pickers state
  const activeAssetNodeId = ref<string | null>(null)
  const activeStrategyNodeId = ref<string | null>(null)
  const activeTradeNodeId = ref<string | null>(null)
  const expandedTradeStrategyId = ref<string | null>(null)

  // Wire/Connections state
  const activeBoardWire = ref<{
    fromId: string
    fromPort?: JournalArticleBoardPort
    originalToId?: string
    originalToPort?: JournalArticleBoardPort
    current: { x: number; y: number }
  } | null>(null)

  // Labels & Placeholders
  const boardTextPlaceholder = computed(() => (locale.value === 'ru' ? 'Введите текст...' : 'Enter text...'))
  const boardQuestionPlaceholder = computed(() => (locale.value === 'ru' ? 'Задайте свой вопрос...' : 'Ask your question...'))

  const boardUiLabels = computed(() =>
    locale.value === 'ru'
      ? {
          untitled: 'Без названия',
          uploadImage: 'Загрузить изображение',
          dblClickToDraw: 'Дважды кликните, чтобы рисовать',
          profitFactorShort: 'ПФ',
          winRateShort: 'ВИН',
          resultShort: 'РЕЗ',
          startShort: 'СТАРТ',
          endShort: 'ФИН',
          entryShort: 'ВХОД',
          exitShort: 'ВЫХОД',
          select: 'ВЫБОР',
          signalTool: 'СИГ',
          currentPriceTool: 'ТЦ',
          targetPriceTool: 'ПЦ',
          strategyTool: 'СТР',
          tradeTool: 'СДЛ',
          searchAssets: 'ПОИСК_АКТИВОВ...',
          noAssetsFound: 'АКТИВЫ НЕ НАЙДЕНЫ',
          noStrategiesFound: 'СТРАТЕГИИ НЕ НАЙДЕНЫ',
          noTradesFound: 'СДЕЛКИ НЕ НАЙДЕНЫ',
          noTradesInStrategy: 'В ЭТОЙ СТРАТЕГИИ НЕТ СДЕЛОК',
          removeNode: 'УДАЛИТЬ_УЗЕЛ',
          removeWarning: 'Внимание: безвозвратное удаление',
          publishConfirmKicker: 'ПОДТВЕРЖДЕНИЕ',
          publishConfirmTitle: 'Опубликовать статью?',
          articleTitleLabel: 'Название',
          articleCategoryLabel: 'Категория',
          cancelPublish: 'Отмена',
          confirmPublish: 'Опубликовать',
          publishing: 'Публикация...',
          assetFallback: 'АКТИВ',
          direction: 'Направление',
          asset: 'Актив',
          dates: 'Даты',
          duration: 'Длительность',
          result: 'Результат',
          currentPrice: 'Текущая',
          targetPrice: 'Прогноз',
          noAsset: 'БЕЗ АКТИВА',
          noStrategy: 'БЕЗ СТРАТЕГИИ',
          noTrade: 'БЕЗ СДЕЛКИ',
          selectTrade: 'ВЫБЕРИТЕ СДЕЛКУ',
          long: 'ЛОНГ',
          short: 'ШОРТ'
        }
      : {
          untitled: 'Untitled',
          uploadImage: 'Upload image',
          dblClickToDraw: 'Dbl-click to draw',
          profitFactorShort: 'PF',
          winRateShort: 'WR',
          resultShort: 'RES',
          startShort: 'START',
          endShort: 'END',
          entryShort: 'ENTRY',
          exitShort: 'EXIT',
          select: 'SELECT',
          signalTool: 'SIG',
          currentPriceTool: 'CP',
          targetPriceTool: 'TP',
          strategyTool: 'STR',
          tradeTool: 'TRD',
          searchAssets: 'SEARCH_ASSETS...',
          noAssetsFound: 'NO_ASSETS_FOUND',
          noStrategiesFound: 'NO_STRATEGIES_FOUND',
          noTradesFound: 'NO_TRADES_FOUND',
          noTradesInStrategy: 'NO TRADES IN THIS STRATEGY',
          removeNode: 'REMOVE_NODE',
          removeWarning: 'Warning: Permanent_Archive_Erasure',
          publishConfirmKicker: 'CONFIRMATION',
          publishConfirmTitle: 'Publish article?',
          articleTitleLabel: 'Title',
          articleCategoryLabel: 'Category',
          cancelPublish: 'Cancel',
          confirmPublish: 'Publish',
          publishing: 'Publishing...',
          assetFallback: 'ASSET',
          direction: 'Direction',
          asset: 'Asset',
          dates: 'Dates',
          duration: 'Duration',
          result: 'Result',
          currentPrice: 'Current',
          targetPrice: 'Target',
          noAsset: 'NO ASSET',
          noStrategy: 'NO STRATEGY',
          noTrade: 'NO TRADE',
          selectTrade: 'SELECT TRADE',
          long: 'LONG',
          short: 'SHORT'
        }
  )

  // Watch Tool Changes
  watch(activeBoardTool, (tool, previousTool) => {
    if (previousTool === 'pencil' && tool !== 'pencil') {
      stopBoardDrawingMode()
    }

    if (tool === 'pencil') {
      selectedBoardNodeId.value = null
      activeEditorField.value = null
      closeNodeContextMenu()
      window.getSelection()?.removeAllRanges()
    }
  })

  watch(articleType, (type) => {
    if (type !== 'SETUP' && (activeBoardTool.value === 'asset-node' || activeBoardTool.value === 'current-price' || activeBoardTool.value === 'target-price')) {
      activeBoardTool.value = null
    }
    if (type === 'SETUP' && (activeBoardTool.value === 'strategy-node' || activeBoardTool.value === 'trade-node')) {
      activeBoardTool.value = null
    }
  })

  // Global Image Input Trigger
  const globalImageInput = ref<HTMLInputElement | null>(null)
  let imageUploadTargetNodeId: string | null = null

  const triggerImageUpload = (nodeId: string) => {
    imageUploadTargetNodeId = nodeId
    globalImageInput.value?.click()
  }

  const handleGlobalImageUpload = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file || !imageUploadTargetNodeId) return

    const targetId = imageUploadTargetNodeId

    const reader = new FileReader()
    reader.onload = (re) => {
      const url = re.target?.result as string
      const node = boardNodes.value.find((n: any) => n.id === targetId)
      if (node && node.type === 'image') {
        node.src = url
        const img = new Image()
        img.onload = () => {
          const aspect = img.width / img.height
          node.size.height = Math.max(1, Math.round(node.size.width / aspect))
        }
        img.src = url
      }
    }
    reader.readAsDataURL(file)

    if (globalImageInput.value) {
      globalImageInput.value.value = ''
    }
    imageUploadTargetNodeId = null
  }

  // Node Context Menu Logic
  const handleNodeContextMenu = (e: MouseEvent, nodeId: string) => {
    if (isSignalArticle.value) {
      const node = boardNodes.value.find((n: any) => n.id === nodeId)
      if (node && (node.type === 'asset' || node.type === 'price')) {
        return
      }
    }

    if (isQuestionArticle.value) {
      const node = boardNodes.value.find((n: any) => n.id === nodeId)
      if (node && node.type === 'text' && node.isQuestion) {
        return
      }
    }

    nodeContextMenu.value = {
      x: e.clientX,
      y: e.clientY,
      nodeId
    }
  }

  const closeNodeContextMenu = () => {
    nodeContextMenu.value = null
  }

  const removeBoardNode = (nodeId: string) => {
    const nodeIndex = boardNodes.value.findIndex((n) => n.id === nodeId)
    if (nodeIndex !== -1) {
      boardNodes.value.splice(nodeIndex, 1)
    }
    for (let i = boardConnections.value.length - 1; i >= 0; i--) {
      const connection = boardConnections.value[i]
      if (connection && (connection.fromId === nodeId || connection.toId === nodeId)) {
        boardConnections.value.splice(i, 1)
      }
    }
    if (selectedBoardNodeId.value === nodeId) selectedBoardNodeId.value = null
    closeNodeContextMenu()
  }

  // Text Formatting Logic
  const activeTextColor = ref('currentColor')
  const textEditorRefs = ref<Record<string, HTMLElement>>({})
  const titleEditorRefs = ref<Record<string, HTMLElement>>({})
  const savedTextSelection = ref<Range | null>(null)

  const getPlainEditorText = (value: string) => {
    return String(value || '')
      .replace(/<br\s*\/?>/gi, '')
      .replace(/<\/?[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim()
  }

  const isTextNodeTitleEmpty = (node: any) => {
    return node?.type === 'text' && getPlainEditorText(node.title || '') === ''
  }

  const isTextNodeBodyEmpty = (node: any) => {
    return node?.type === 'text' && getPlainEditorText(node.text || '') === ''
  }

  const setTitleEditorRef = (el: any, id: string) => {
    if (el) {
      titleEditorRefs.value[id] = el
      const node = boardNodes.value.find((n) => n.id === id)
      const nodeTitle = (node?.type === 'text' ? node.title : '') || ''
      if (el.innerHTML !== nodeTitle) {
        el.innerHTML = nodeTitle
      }
    }
  }

  const updateNodeTitle = (event: Event, node: any) => {
    if (node.type === 'text') {
      const editor = event.target as HTMLElement
      node.title = getPlainEditorText(editor.innerHTML) === '' ? '' : editor.innerHTML
      if (node.title === '' && editor.innerHTML !== '') editor.innerHTML = ''
    }
  }

  const setTextEditorRef = (el: any, id: string) => {
    if (el) {
      textEditorRefs.value[id] = el
      const node = boardNodes.value.find((n) => n.id === id)
      const nodeText = (node?.type === 'text' ? node.text : '') || ''
      if (el.innerHTML !== nodeText) {
        el.innerHTML = nodeText
      }
    }
  }

  const updateNodeText = (event: Event, node: any) => {
    node.text = (event.target as HTMLElement).innerHTML
  }

  function getActiveTextEditor() {
    if (!selectedBoardNodeId.value) return null
    if (activeEditorField.value === 'title') {
      return document.querySelector(`[data-title-node-id="${selectedBoardNodeId.value}"]`) as HTMLElement | null
    } else {
      return document.querySelector(`[data-text-node-id="${selectedBoardNodeId.value}"]`) as HTMLElement | null
    }
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
    const node = selectedBoardNode.value
    const editor = getActiveTextEditor()
    if (!node || !editor) return
    if (node.type === 'text') {
      if (activeEditorField.value === 'title') {
        node.title = editor.innerHTML
      } else {
        node.text = editor.innerHTML
      }
    }
  }

  function applyTextCommand(command: string, value?: string) {
    if (!selectedBoardNode.value) return
    restoreTextSelection()
    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand(command, false, value)
    syncActiveTextHtml()
    saveTextSelection()
  }

  function applyTextColor(event?: Event) {
    activeTextColor.value = (event?.target as HTMLInputElement | undefined)?.value || activeTextColor.value
    applyTextCommand('foreColor', activeTextColor.value)
  }

  function resetTextColor() {
    activeTextColor.value = 'currentColor'
    applyTextCommand('foreColor', '#000000')
  }

  // Position / Style Helpers
  const getBoardNodeStyle = (node: JournalArticleBoardNode) => ({
    left: `${snapBoardCssPixel(node.position.x * boardRenderGridSize.value)}px`,
    top: `${snapBoardCssPixel(node.position.y * boardRenderGridSize.value)}px`,
    width: `${snapBoardCssPixel(node.size.width * boardRenderGridSize.value)}px`,
    height: `${snapBoardCssPixel(node.size.height * boardRenderGridSize.value)}px`
  })

  const getBoardNodeRect = (node: JournalArticleBoardNode) => ({
    left: node.position.x * boardRenderGridSize.value,
    top: node.position.y * boardRenderGridSize.value,
    right: (node.position.x + node.size.width) * boardRenderGridSize.value,
    bottom: (node.position.y + node.size.height) * boardRenderGridSize.value
  })

  const getDistanceToBoardNode = (point: { x: number; y: number }, node: JournalArticleBoardNode) => {
    const rect = getBoardNodeRect(node)
    const dx = point.x < rect.left ? rect.left - point.x : point.x > rect.right ? point.x - rect.right : 0
    const dy = point.y < rect.top ? rect.top - point.y : point.y > rect.bottom ? point.y - rect.bottom : 0
    return Math.hypot(dx, dy)
  }

  const closestBoardWireTargetId = computed(() => {
    const wire = activeBoardWire.value
    if (!wire) return null
    let closestId: string | null = null
    let closestDistance = passivePortRevealDistance

    boardNodes.value.forEach((node) => {
      if (node.id === wire.fromId) return
      const distance = getDistanceToBoardNode(wire.current, node)
      if (distance <= closestDistance) {
        closestDistance = distance
        closestId = node.id
      }
    })

    return closestId
  })

  const isHighlightedPassiveBoardPort = (node: JournalArticleBoardNode) => {
    return !!activeBoardWire.value && closestBoardWireTargetId.value === node.id
  }

  // Price node helpers
  const parsePriceValue = (value: string | number | undefined | null) => {
    const normalized = String(value ?? '').replace(',', '.').trim()
    if (!normalized) return null
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }

  const priceNodePlaceholder = (node: any) => {
    if (node?.priceKind === 'current') return boardUiLabels.value.currentPrice
    return boardUiLabels.value.targetPrice
  }

  const getReferenceCurrentPrice = () => {
    const currentNode = boardNodes.value.find(
      (node: any) => node.type === 'price' && node.priceKind === 'current' && parsePriceValue(node.value) !== null
    ) as any
    return parsePriceValue(currentNode?.value)
  }

  const getPriceNodeDirection = (node: any) => {
    if (node?.type !== 'price' || node.priceKind !== 'target') return null
    const currentPrice = getReferenceCurrentPrice()
    const targetPrice = parsePriceValue(node.value)
    if (currentPrice === null || targetPrice === null || targetPrice === currentPrice) return null
    return targetPrice > currentPrice ? 'up' : 'down'
  }

  const getPriceNodeArrow = (node: any) => {
    const direction = getPriceNodeDirection(node)
    if (direction === 'up') return '↑'
    if (direction === 'down') return '↓'
    return ''
  }

  const getPriceNodeValueClass = (node: any) => {
    const direction = getPriceNodeDirection(node)
    if (direction === 'up') return 'text-emerald-500'
    if (direction === 'down') return 'text-red-500'
    return 'text-black/75'
  }

  const updatePriceNodeValue = (event: Event, node: any) => {
    const input = event.target as HTMLInputElement
    const sanitized = input.value
      .replace(',', '.')
      .replace(/[^\d.]/g, '')
      .replace(/(\..*)\./g, '$1')
    input.value = sanitized
    node.value = sanitized
  }

  // Asset node helpers
  const getAssetTypeLoc = (type: string) => {
    if (!type) return ''
    return assetTypeLocales[type]?.[locale.value === 'ru' ? 'ru' : 'en'] || type
  }

  const getAssetNodeLabel = (node: any) => {
    return node?.asset || boardUiLabels.value.noAsset
  }

  const getAssetNodeData = (node: any) => {
    if (!node?.asset) return null
    return (allAssets as any[]).find((asset) => asset.symbol === node.asset) || null
  }

  const getAssetNodeTypeLabel = (node: any) => {
    const asset = getAssetNodeData(node)
    return asset?.type ? getAssetTypeLoc(asset.type) : ''
  }

  const openAssetPicker = (node: any) => {
    if (node?.type !== 'asset') return
    activeAssetNodeId.value = node.id
  }

  const closeAssetPicker = () => {
    activeAssetNodeId.value = null
  }

  const selectBoardAsset = (asset: any) => {
    const node = boardNodes.value.find((item: any) => item.id === activeAssetNodeId.value)
    if (node && node.type === 'asset') {
      node.asset = asset.symbol
    }
    closeAssetPicker()
  }

  // Signal Validation
  const isSignalBoardValid = computed(() => {
    if (!isSignalArticle.value) return true

    const hasValidAsset = boardNodes.value.some((node: any) => node.type === 'asset' && String(node.asset || '').trim())
    const hasValidCurrentPrice = boardNodes.value.some(
      (node: any) => node.type === 'price' && node.priceKind === 'current' && String(node.value || '').trim()
    )
    const hasValidTargetPrice = boardNodes.value.some(
      (node: any) => node.type === 'price' && node.priceKind === 'target' && String(node.value || '').trim()
    )

    return hasValidAsset && hasValidCurrentPrice && hasValidTargetPrice
  })

  // Strategy & Trade data helpers
  const localStrategies = computed(() => (strategyTradesStore.strategies || []).filter((strategy) => strategy.id !== 'MAIN_DIARY'))
  const localTrades = computed(() => Object.values(strategyTradesStore.tradesByStrategy || {}).flat() as DiaryEntry[])
  const tradePickerStrategies = computed(() => strategyTradesStore.strategies || [])

  const getStrategyTrades = (strategyId: string) => {
    return (strategyTradesStore.getTradesForStrategy(strategyId) || []) as DiaryEntry[]
  }

  const getTradePickerStrategyTrades = (strategyId: string) => {
    return getStrategyTrades(strategyId)
      .slice()
      .sort((left: DiaryEntry, right: DiaryEntry) => {
        const leftTime = left.date ? new Date(left.date).getTime() : 0
        const rightTime = right.date ? new Date(right.date).getTime() : 0
        return rightTime - leftTime
      })
  }

  const toggleTradeStrategy = (strategyId: string) => {
    expandedTradeStrategyId.value = expandedTradeStrategyId.value === strategyId ? null : strategyId
  }

  const getTradeCurrencyProfit = (trade: any) => {
    const value = trade?.profitInCurrency ?? trade?.pnl ?? trade?.result ?? 0
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const getTradePercentProfit = (trade: any, strategyId?: string) => {
    const explicit = Number(trade?.profitValue ?? trade?.resultPercent)
    if (Number.isFinite(explicit)) return explicit
    const result = Number(trade?.result)
    if (Number.isFinite(result) && Math.abs(result) <= 1000 && trade?.profitInCurrency === undefined) return result
    const deposit = strategyId ? strategyTradesStore.getInitialDeposit(strategyId) : 1000
    const base = deposit > 0 ? deposit : 1000
    return (getTradeCurrencyProfit(trade) / base) * 100
  }

  const formatCompactNumber = (value: number, digits = 2) => {
    if (!Number.isFinite(value)) return '0'
    if (Math.abs(value) >= 1000) {
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, notation: 'compact' }).format(value)
    }
    return value.toFixed(digits)
  }

  const formatSignedCurrency = (value: number) => {
    const sign = value > 0 ? '+' : value < 0 ? '-' : ''
    return `${sign}$${formatCompactNumber(Math.abs(value), 2)}`
  }

  const formatCurrencyValue = (value: number) => {
    const sign = value < 0 ? '-' : ''
    return `${sign}$${formatCompactNumber(Math.abs(value), 2)}`
  }

  const formatSignedPercent = (value: number) => {
    const sign = value > 0 ? '+' : ''
    return `${sign}${formatCompactNumber(value, 2)}%`
  }

  const getResultToneClass = (value: number) => {
    if (value > 0) return 'text-emerald-500'
    if (value < 0) return 'text-red-500'
    return 'text-black/55'
  }

  const getResultDotClass = (value: number) => {
    if (value > 0) return 'bg-emerald-500'
    if (value < 0) return 'bg-red-500'
    return 'bg-black/40'
  }

  const getStrategyMetrics = (strategy: StrategyProfile | any) => {
    const trades = getStrategyTrades(strategy.id)
    const profits = trades.map(getTradeCurrencyProfit)
    const grossProfit = profits.filter((value) => value > 0).reduce((sum, value) => sum + value, 0)
    const grossLoss = Math.abs(profits.filter((value) => value < 0).reduce((sum, value) => sum + value, 0))
    const wins = profits.filter((value) => value > 0).length
    const total = profits.length
    const resultCurrency = profits.reduce((sum, value) => sum + value, 0)
    const initialDeposit = strategyTradesStore.getInitialDeposit(strategy.id)
    const resultPercent = initialDeposit > 0 ? (resultCurrency / initialDeposit) * 100 : 0

    return {
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
      winRate: total > 0 ? (wins / total) * 100 : 0,
      resultCurrency,
      resultPercent,
      initialCapital: initialDeposit,
      finalCapital: initialDeposit + resultCurrency,
      tradesCount: total
    }
  }

  const formatProfitFactor = (value: number) => {
    if (value === Infinity) return '∞'
    return formatCompactNumber(value, 2)
  }

  const getStrategyNodeLabel = (node: any) => {
    if (node?.strategyName) return node.strategyName
    const strategy = localStrategies.value.find((strategy) => strategy.id === node?.strategyId)
    return strategy?.name || boardUiLabels.value.noStrategy
  }

  const getStrategyNodeMetrics = (node: any) => {
    const strategy = localStrategies.value.find((strategy) => strategy.id === node?.strategyId)
    if (!strategy) return null
    return getStrategyMetrics(strategy)
  }

  const getTradeNodeData = (node: any) => {
    if (node?.tradeSnapshot) return node.tradeSnapshot
    if (!node?.tradeId) return null
    return localTrades.value.find((trade: any) => trade.id === node.tradeId) || null
  }

  const getTradeNodeAssetLabel = (node: any) => {
    const trade = getTradeNodeData(node)
    return trade?.asset || boardUiLabels.value.noTrade
  }

  const getTradeNodeVector = (node: any) => {
    const trade = getTradeNodeData(node)
    if (!trade) return boardUiLabels.value.selectTrade
    return getTradeSideLabel(trade.side)
  }

  const getTradeNodeVectorClass = (node: any) => {
    const trade = getTradeNodeData(node)
    const side = String(trade?.side || '').toUpperCase()
    if (side.includes('LONG')) return 'text-emerald-500'
    if (side.includes('SHORT')) return 'text-red-500'
    return 'text-black/35'
  }

  const getTradeSideLabel = (side: any) => {
    const normalized = String(side || 'LONG').toUpperCase()
    return normalized.includes('SHORT') ? boardUiLabels.value.short : boardUiLabels.value.long
  }

  const getTradeNodeResult = (node: any) => {
    const trade = getTradeNodeData(node)
    if (!trade) return ''
    const strategyId = trade.strategyId || strategyTradesStore.selectedStrategyId
    return `${formatSignedCurrency(getTradeCurrencyProfit(trade))} (${formatSignedPercent(getTradePercentProfit(trade, strategyId))})`
  }

  const getTradeNodeResultClass = (node: any) => {
    const trade = getTradeNodeData(node)
    return trade ? getResultToneClass(getTradeCurrencyProfit(trade)) : 'text-black/35'
  }

  const formatTradeDate = (value: any) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const formatTradeNodeDateTime = (value: any) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const formatTradeDuration = (trade: any) => {
    const start = trade?.date ? new Date(trade.date).getTime() : 0
    const end = trade?.dateExit ? new Date(trade.dateExit).getTime() : start
    if (!start || !end || end < start) return '—'
    const diffMins = Math.floor((end - start) / 60000)
    const hours = Math.floor(diffMins / 60)
    return hours > 0 ? `${hours}h ${diffMins % 60}m` : `${diffMins}m`
  }

  const getTradeNodeEntryDate = (node: any) => {
    const trade = getTradeNodeData(node)
    return trade ? formatTradeNodeDateTime(trade.date) : '—'
  }

  const getTradeNodeExitDate = (node: any) => {
    const trade = getTradeNodeData(node)
    return trade ? formatTradeNodeDateTime(trade.dateExit) : '—'
  }

  const openStrategyPicker = (node: any) => {
    if (node?.type !== 'strategy') return
    activeStrategyNodeId.value = node.id
  }

  const closeStrategyPicker = () => {
    activeStrategyNodeId.value = null
  }

  const selectBoardStrategy = (strategy: StrategyProfile) => {
    const node = boardNodes.value.find((item: any) => item.id === activeStrategyNodeId.value)
    if (node && node.type === 'strategy') {
      node.strategyId = strategy.id
      node.strategyName = strategy.name
    }
    closeStrategyPicker()
  }

  const openTradePicker = (node: any) => {
    if (node?.type !== 'trade') return
    activeTradeNodeId.value = node.id
    expandedTradeStrategyId.value = null
  }

  const closeTradePicker = () => {
    activeTradeNodeId.value = null
    expandedTradeStrategyId.value = null
  }

  const selectBoardTrade = (trade: DiaryEntry) => {
    const node = boardNodes.value.find((item: any) => item.id === activeTradeNodeId.value)
    if (node && node.type === 'trade') {
      node.tradeId = trade.id || ''
      node.tradeSnapshot = JSON.parse(JSON.stringify(trade))
    }
    closeTradePicker()
  }

  // Wires / Ports calculations
  const getBoardNodePortPoint = (node: JournalArticleBoardNode, port: JournalArticleBoardPort = 'left') => {
    const x = node.position.x * boardRenderGridSize.value
    const y = node.position.y * boardRenderGridSize.value
    const width = node.size.width * boardRenderGridSize.value
    const height = node.size.height * boardRenderGridSize.value
    if (port === 'top') return { x: x + width / 2, y }
    if (port === 'bottom') return { x: x + width / 2, y: y + height }
    if (port === 'right') return { x: x + width, y: y + height / 2 }
    return { x, y: y + height / 2 }
  }

  const getBoardConnectionPathFromPoints = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    fromPort: JournalArticleBoardPort = 'right',
    toPort: JournalArticleBoardPort = 'left'
  ) => {
    const distance = Math.max(80 * boardRenderScale.value, Math.hypot(to.x - from.x, to.y - from.y) * 0.35)
    const cp1 = { ...from }
    const cp2 = { ...to }
    if (fromPort === 'right') cp1.x += distance
    else if (fromPort === 'left') cp1.x -= distance
    else if (fromPort === 'top') cp1.y -= distance
    else cp1.y += distance
    if (toPort === 'right') cp2.x += distance
    else if (toPort === 'left') cp2.x -= distance
    else if (toPort === 'top') cp2.y -= distance
    else cp2.y += distance
    return `M ${from.x} ${from.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${to.x} ${to.y}`
  }

  const getBoardConnectionPath = (connection: JournalArticleBoardConnection) => {
    const fromNode = boardNodes.value.find((node) => node.id === connection.fromId)
    const toNode = boardNodes.value.find((node) => node.id === connection.toId)
    if (!fromNode || !toNode) return ''
    const fromPort = connection.fromPort || 'right'
    const toPort = connection.toPort || 'left'
    return getBoardConnectionPathFromPoints(
      getBoardNodePortPoint(fromNode, fromPort),
      getBoardNodePortPoint(toNode, toPort),
      fromPort,
      toPort
    )
  }

  const getActiveBoardWirePath = () => {
    if (!activeBoardWire.value) return ''
    const fromNode = boardNodes.value.find((node) => node.id === activeBoardWire.value?.fromId)
    if (!fromNode) return ''
    const fromPort = activeBoardWire.value.fromPort || 'right'
    return getBoardConnectionPathFromPoints(
      getBoardNodePortPoint(fromNode, fromPort),
      activeBoardWire.value.current,
      fromPort,
      'left'
    )
  }

  const checkNodeOverlap = (x: number, y: number, w: number, h: number, ignoreNodeId?: string) => {
    return boardNodes.value.some((node: any) => {
      if (node.id === ignoreNodeId) return false
      return (
        x < node.position.x + node.size.width &&
        x + w > node.position.x &&
        y < node.position.y + node.size.height &&
        y + h > node.position.y
      )
    })
  }

  // Window Tracking & Events
  const startWindowTracking = () => {
    window.addEventListener('pointermove', handleBoardPointerMove)
    window.addEventListener('pointerup', stopBoardInteraction)
    window.addEventListener('pointercancel', stopBoardInteraction)

    if (boardDrawing.isBoardDrawingPointerDown.value) {
      window.addEventListener('pointermove', handleGlobalBoardDrawingMove)
      window.addEventListener('pointerup', handleGlobalBoardDrawingUp)
    }
  }

  const stopWindowTracking = () => {
    window.removeEventListener('pointermove', handleBoardPointerMove)
    window.removeEventListener('pointerup', stopBoardInteraction)
    window.removeEventListener('pointercancel', stopBoardInteraction)
    window.removeEventListener('pointermove', handleGlobalBoardDrawingMove)
    window.removeEventListener('pointerup', handleGlobalBoardDrawingUp)
  }

  const getBoardWorldPointFromEvent = (event: PointerEvent | MouseEvent) => {
    const rect = boardWorldRef.value?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  }

  const moveBoardWire = (event: PointerEvent) => {
    if (!activeBoardWire.value) return
    activeBoardWire.value.current = getBoardWorldPointFromEvent(event)
  }

  const cancelBoardWire = () => {
    activeBoardWire.value = null
    window.removeEventListener('pointermove', moveBoardWire)
    window.removeEventListener('pointerup', cancelBoardWire)
    window.removeEventListener('pointercancel', cancelBoardWire)
  }

  const startBoardWire = (node: JournalArticleBoardNode, port: JournalArticleBoardPort, event: PointerEvent) => {
    activeBoardWire.value = {
      fromId: node.id,
      fromPort: port,
      current: getBoardWorldPointFromEvent(event)
    }
    window.addEventListener('pointermove', moveBoardWire)
    window.addEventListener('pointerup', cancelBoardWire)
    window.addEventListener('pointercancel', cancelBoardWire)
  }

  const pickupBoardInput = (node: JournalArticleBoardNode, port: JournalArticleBoardPort) => {
    const index = boardConnections.value.findLastIndex(
      (connection) => connection.toId === node.id && (connection.toPort || 'left') === port
    )
    if (index === -1) return
    const connection = boardConnections.value[index]
    if (!connection) return
    boardConnections.value.splice(index, 1)
    activeBoardWire.value = {
      fromId: connection.fromId,
      fromPort: connection.fromPort || 'right',
      originalToId: connection.toId,
      originalToPort: connection.toPort || 'left',
      current: getBoardNodePortPoint(node, port)
    }
    window.addEventListener('pointermove', moveBoardWire)
    window.addEventListener('pointerup', cancelBoardWire)
    window.addEventListener('pointercancel', cancelBoardWire)
  }

  const dropBoardWire = (node: JournalArticleBoardNode, port: JournalArticleBoardPort) => {
    if (!activeBoardWire.value) return
    if (activeBoardWire.value.fromId === node.id) {
      cancelBoardWire()
      return
    }
    const nextConnection: JournalArticleBoardConnection = {
      id: 'bc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      fromId: activeBoardWire.value.fromId,
      toId: node.id,
      fromPort: activeBoardWire.value.fromPort,
      toPort: port
    }
    for (let i = boardConnections.value.length - 1; i >= 0; i--) {
      const connection = boardConnections.value[i]
      if (connection && connection.toId === node.id && (connection.toPort || 'left') === port) {
        boardConnections.value.splice(i, 1)
      }
    }
    boardConnections.value.push(nextConnection)
    cancelBoardWire()
  }

  const clearBoardInput = (node: JournalArticleBoardNode) => {
    for (let i = boardConnections.value.length - 1; i >= 0; i--) {
      if (boardConnections.value[i]?.toId === node.id) {
        boardConnections.value.splice(i, 1)
      }
    }
  }

  const clearBoardOutput = (node: JournalArticleBoardNode) => {
    for (let i = boardConnections.value.length - 1; i >= 0; i--) {
      if (boardConnections.value[i]?.fromId === node.id) {
        boardConnections.value.splice(i, 1)
      }
    }
  }

  function stopBoardDrawingMode() {
    boardDrawing.finishBoardDrawing()
    boardDrawing.restoreNativeCursor()
    boardDrawing.isBoardDrawingCursorVisible.value = false
    cancelBoardWire()
    stopWindowTracking()
    if (activeBoardTool.value === 'pencil') {
      activeBoardTool.value = null
    }
  }

  const handleSpaceDown = (e: KeyboardEvent) => {
    if (
      e.code === 'Space' &&
      (e.target === document.body ||
        (!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) && !(e.target as HTMLElement).isContentEditable))
    ) {
      isSpacePressed.value = true
      e.preventDefault()
    }
  }

  const handleSpaceUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      isSpacePressed.value = false
    }
  }

  const handleGlobalBoardDrawingMove = (e: MouseEvent) => {
    if (activeBoardTool.value !== 'pencil' || !boardDrawing.isBoardDrawingPointerDown.value || isSpacePressed.value) return
    const elementAtPointer = document.elementFromPoint(e.clientX, e.clientY)
    if (isBoardChromeTarget(elementAtPointer)) return
    boardDrawing.moveBoardDrawing(e, boardStrokes.value)
  }

  const handleGlobalBoardDrawingUp = () => {
    boardDrawing.finishBoardDrawing()
    stopWindowTracking()
  }

  const syncBoardDrawingRefs = () => {
    boardDrawing.boardViewport.value = boardStageRef.value
    boardDrawing.boardCursorViewport.value = boardStageRef.value
    boardDrawing.boardCanvas.value = boardDrawingCanvasRef.value
    boardDrawing.boardContentSize.value = {
      width: boardBaseWorldSize.value.width,
      height: boardBaseWorldSize.value.height
    }
    boardDrawing.boardTransform.value = {
      x: boardPan.value.x,
      y: boardPan.value.y
    }
  }

  let boardDrawingRenderFrame: number | null = null

  const renderBoardDrawingCanvas = () => {
    nextTick(() => {
      if (boardDrawingRenderFrame !== null) return
      boardDrawingRenderFrame = window.requestAnimationFrame(() => {
        boardDrawingRenderFrame = null
        syncBoardDrawingRefs()
        boardDrawing.renderBoardDrawing(boardStrokes.value)
      })
    })
  }

  const isBoardChromeTarget = (target: EventTarget | null) => {
    return target instanceof HTMLElement && !!target.closest('[data-board-chrome]')
  }

  // Offscreen Indicator
  const outOfBoundsIndicator = computed(() => {
    if (boardNodes.value.length === 0) return null

    let targetNode = null
    if (isSignalArticle.value) {
      targetNode = boardNodes.value.find((n: any) => n.type === 'asset')
    } else if (isQuestionArticle.value) {
      targetNode = boardNodes.value.find((n: any) => n.type === 'text' && n.isQuestion)
    }
    if (!targetNode) {
      targetNode = boardNodes.value[0]
    }
    if (!targetNode) return null

    const nodeWidth = targetNode.size.width * boardGridSize.value
    const nodeHeight = targetNode.size.height * boardGridSize.value

    const screenX = targetNode.position.x * boardGridSize.value + boardPan.value.x
    const screenY = targetNode.position.y * boardGridSize.value + boardPan.value.y

    const winW = typeof window !== 'undefined' ? window.innerWidth : 1000
    const winH = typeof window !== 'undefined' ? window.innerHeight : 1000

    const isOffScreen = screenX + nodeWidth < 0 || screenX > winW || screenY + nodeHeight < 0 || screenY > winH

    if (!isOffScreen) return null

    const padding = 60
    const clampedX = Math.max(padding, Math.min(winW - padding, screenX + nodeWidth / 2))
    const clampedY = Math.max(padding, Math.min(winH - padding, screenY + nodeHeight / 2))

    const dx = screenX + nodeWidth / 2 - clampedX
    const dy = screenY + nodeHeight / 2 - clampedY
    const dist = Math.round(Math.sqrt(dx * dx + dy * dy))
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)

    let name = ''
    if (targetNode.type === 'asset') name = locale.value === 'ru' ? 'АКТИВ' : 'ASSET'
    else if ((targetNode as any).isQuestion) name = locale.value === 'ru' ? 'ВОПРОС' : 'QUESTION'
    else name = locale.value === 'ru' ? 'УЗЕЛ' : 'NODE'

    return { id: targetNode.id, x: clampedX, y: clampedY, dist, angle, name }
  })

  const focusBoardNode = (id: string) => {
    const node = boardNodes.value.find((n: any) => n.id === id)
    if (node && boardStageRef.value) {
      const rect = boardStageRef.value.getBoundingClientRect()
      boardPan.value = snapBoardPoint({
        x: rect.width / 2 - node.position.x * boardGridSize.value - (node.size.width * boardGridSize.value) / 2,
        y: rect.height / 2 - node.position.y * boardGridSize.value - (node.size.height * boardGridSize.value) / 2
      })
    }
  }

  // Pan / Add Node / Move / Resize
  const startBoardPan = (event: PointerEvent) => {
    const target = event.target as HTMLElement | null
    if (isBoardChromeTarget(target)) return

    if (activeBoardTool.value) {
      if (activeBoardTool.value === 'pencil' && !isSpacePressed.value) {
        syncBoardDrawingRefs()
        boardDrawing.startBoardDrawing(event, boardStrokes.value)
        startWindowTracking()
        return
      }

      if (!isSpacePressed.value) {
        const rect = boardWorldRef.value?.getBoundingClientRect()
        if (!rect) return
        const worldX = event.clientX - rect.left
        const worldY = event.clientY - rect.top

        const gridX = Math.round(worldX / boardGridSize.value)
        const gridY = Math.round(worldY / boardGridSize.value)

        const isPriceTool = activeBoardTool.value === 'current-price' || activeBoardTool.value === 'target-price'
        const isAssetTool = activeBoardTool.value === 'asset-node'
        const isStrategyTool = activeBoardTool.value === 'strategy-node'
        const isTradeTool = activeBoardTool.value === 'trade-node'
        const newW = isStrategyTool ? 18 : isTradeTool ? 16 : isAssetTool ? 9 : isPriceTool ? 8 : activeBoardTool.value === 'text' ? 10 : activeBoardTool.value === 'image' ? 10 : 12
        const newH = isStrategyTool ? 7 : isTradeTool ? 6 : isAssetTool ? 3 : isPriceTool ? 3 : activeBoardTool.value === 'text' ? 6 : activeBoardTool.value === 'image' ? 10 : 12

        if (checkNodeOverlap(gridX, gridY, newW, newH)) {
          alert(locale.value === 'ru' ? 'Недостаточно места для размещения узла!' : 'Not enough space to place node!')
          activeBoardTool.value = null
          return
        }

        if (activeBoardTool.value === 'text') {
          const newNode = {
            id: `node_${Date.now()}`,
            type: 'text',
            title: '',
            text: '',
            position: { x: gridX, y: gridY },
            size: { width: 10, height: 6 },
            isEditing: true
          }
          boardNodes.value.push(newNode as any)
        } else if (activeBoardTool.value === 'image') {
          const newNode = {
            id: `node_${Date.now()}`,
            type: 'image',
            src: '',
            alt: 'Uploaded Image',
            caption: '',
            position: { x: gridX, y: gridY },
            size: { width: 10, height: 10 }
          }
          boardNodes.value.push(newNode as any)
        } else if (activeBoardTool.value === 'drawing') {
          const newNode = {
            id: `node_${Date.now()}`,
            type: 'drawing',
            params: { strokes: [] },
            position: { x: gridX, y: gridY },
            size: { width: 12, height: 12 }
          }
          boardNodes.value.push(newNode as any)
        } else if (isPriceTool) {
          const newNode = {
            id: `node_${Date.now()}`,
            type: 'price',
            priceKind: activeBoardTool.value === 'current-price' ? 'current' : 'target',
            value: '',
            position: { x: gridX, y: gridY },
            size: { width: 8, height: 3 }
          }
          boardNodes.value.push(newNode as any)
        } else if (isAssetTool) {
          const newNode = {
            id: `node_${Date.now()}`,
            type: 'asset',
            asset: '',
            position: { x: gridX, y: gridY },
            size: { width: 9, height: 3 }
          }
          boardNodes.value.push(newNode as any)
        } else if (isStrategyTool) {
          const newNode = {
            id: `node_${Date.now()}`,
            type: 'strategy',
            strategyId: '',
            strategyName: '',
            position: { x: gridX, y: gridY },
            size: { width: 18, height: 4 }
          }
          boardNodes.value.push(newNode as any)
        } else if (isTradeTool) {
          const newNode = {
            id: `node_${Date.now()}`,
            type: 'trade',
            tradeId: '',
            tradeSnapshot: null,
            position: { x: gridX, y: gridY },
            size: { width: 16, height: 4 }
          }
          boardNodes.value.push(newNode as any)
        }

        activeBoardTool.value = null
        return
      }
    }

    const resizeHandle = target?.closest('[data-board-resize]') as HTMLElement | null
    if (resizeHandle) {
      event.preventDefault()
      const nodeId = resizeHandle.dataset.nodeId
      selectedBoardNodeId.value = nodeId || null
      const node = boardNodes.value.find((n: any) => n.id === nodeId)
      if (node) {
        activeBoardInteraction.value = {
          type: 'resizeNode',
          node,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startNodeW: node.size.width,
          startNodeH: node.size.height
        }
        startWindowTracking()
        return
      }
    }

    const nodeHandle = target?.closest('[data-board-node-handle]') as HTMLElement | null
    if (nodeHandle) {
      event.preventDefault()
      const nodeId = nodeHandle.dataset.nodeId
      selectedBoardNodeId.value = nodeId || null
      const node = boardNodes.value.find((n: any) => n.id === nodeId)
      if (node) {
        activeBoardInteraction.value = {
          type: 'moveNode',
          node,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startNodeX: node.position.x,
          startNodeY: node.position.y
        }
        startWindowTracking()
        return
      }
    }

    const clickedNodeEl = target?.closest('[data-board-node]') as HTMLElement | null
    if (clickedNodeEl) {
      const nodeId = clickedNodeEl.dataset.nodeId
      if (nodeId) selectedBoardNodeId.value = nodeId
      return
    }

    event.preventDefault()
    selectedBoardNodeId.value = null

    activeBoardInteraction.value = {
      type: 'pan',
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: boardPan.value.x,
      startPanY: boardPan.value.y
    }
    startWindowTracking()
  }

  const handleBoardHover = (event: PointerEvent) => {
    if (isBoardChromeTarget(event.target)) {
      boardDrawing.isBoardDrawingCursorVisible.value = false
      return
    }

    if (activeBoardTool.value === 'pencil') {
      syncBoardDrawingRefs()
      boardDrawing.updateBoardDrawingCursor(event)
    }
    if (activeBoardTool.value) {
      const rect = boardWorldRef.value?.getBoundingClientRect()
      if (rect) {
        boardPointerPos.value = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        }
      }
    }
  }

  const handleBoardPointerMove = (event: PointerEvent) => {
    const interaction = activeBoardInteraction.value
    if (!interaction) return

    if (interaction.type === 'pan') {
      const dx = event.clientX - interaction.startClientX
      const dy = event.clientY - interaction.startClientY
      boardPan.value = snapBoardPoint({
        x: interaction.startPanX + dx,
        y: interaction.startPanY + dy
      })
      return
    }

    if (interaction.type === 'moveNode') {
      const dx = (event.clientX - interaction.startClientX) / boardRenderScale.value
      const dy = (event.clientY - interaction.startClientY) / boardRenderScale.value
      const gridDx = Math.round(dx / boardGridSize.value)
      const gridDy = Math.round(dy / boardGridSize.value)
      const newX = Math.max(0, interaction.startNodeX + gridDx)
      const newY = Math.max(0, interaction.startNodeY + gridDy)

      if (!checkNodeOverlap(newX, newY, interaction.node.size.width, interaction.node.size.height, interaction.node.id)) {
        interaction.node.position = { x: newX, y: newY }
      }
      return
    }

    if (interaction.type === 'resizeNode') {
      const dx = (event.clientX - interaction.startClientX) / boardRenderScale.value
      const dy = (event.clientY - interaction.startClientY) / boardRenderScale.value
      const gridDx = Math.round(dx / boardGridSize.value)
      const gridDy = Math.round(dy / boardGridSize.value)

      const minW = interaction.node.type === 'strategy' ? 14 : interaction.node.type === 'trade' ? 12 : 4
      const minH = interaction.node.type === 'strategy' ? 3 : interaction.node.type === 'trade' ? 3 : 2

      const newW = Math.max(minW, interaction.startNodeW + gridDx)
      const newH = Math.max(minH, interaction.startNodeH + gridDy)

      if (!checkNodeOverlap(interaction.node.position.x, interaction.node.position.y, newW, newH, interaction.node.id)) {
        interaction.node.size = { width: newW, height: newH }
      }
    }
  }

  const stopBoardInteraction = () => {
    activeBoardInteraction.value = null
    stopWindowTracking()
  }

  // Lifecycle listeners
  onMounted(() => {
    window.addEventListener('pointerdown', closeNodeContextMenu)
    document.addEventListener('selectionchange', saveTextSelection)
    window.addEventListener('keydown', handleSpaceDown)
    window.addEventListener('keyup', handleSpaceUp)
  })

  onUnmounted(() => {
    window.removeEventListener('pointerdown', closeNodeContextMenu)
    document.removeEventListener('selectionchange', saveTextSelection)
    window.removeEventListener('keydown', handleSpaceDown)
    window.removeEventListener('keyup', handleSpaceUp)
  })

  watch(
    [boardDrawingCanvasRef, boardStageRef, () => boardPan.value.x, () => boardPan.value.y],
    () => {
      renderBoardDrawingCanvas()
    },
    { flush: 'post' }
  )

  return {
    // Stage & Layout
    boardStageRef,
    boardWorldRef,
    boardDrawingCanvasRef,
    boardPan,
    boardScale,
    boardGridSize,
    boardRenderScale,
    boardRenderGridSize,
    boardUnitSize,
    boardBaseWorldSize,
    boardWorldStyle,
    boardTransformStyle,
    snapBoardCssPixel,
    snapBoardPoint,

    // Tools & State
    activeBoardTool,
    activeBoardInteraction,
    isSpacePressed,
    selectedBoardNodeId,
    selectedBoardNode,
    activeEditorField,
    nodeContextMenu,

    // Wires
    activeBoardWire,
    closestBoardWireTargetId,
    isHighlightedPassiveBoardPort,

    // Drawing
    boardDrawing,
    stopBoardDrawingMode,

    // Context Menu
    handleNodeContextMenu,
    closeNodeContextMenu,
    removeBoardNode,

    // Out of bounds
    outOfBoundsIndicator,
    focusBoardNode,

    // Global Image Input
    globalImageInput,
    triggerImageUpload,
    handleGlobalImageUpload,

    // Event Handlers
    startBoardPan,
    handleBoardHover,
    startBoardWire,
    dropBoardWire,
    pickupBoardInput,
    clearBoardInput,
    clearBoardOutput,

    // Text Editor Methods & State
    activeTextColor,
    setTitleEditorRef,
    setTextEditorRef,
    updateNodeTitle,
    updateNodeText,
    applyTextCommand,
    applyTextColor,
    resetTextColor,
    isTextNodeTitleEmpty,
    isTextNodeBodyEmpty,

    // Node Style & Port Helpers
    getBoardNodeStyle,
    getBoardNodePortPoint,
    getBoardConnectionPath,
    getActiveBoardWirePath,

    // Value Formatters & Classes
    getPriceNodeArrow,
    getPriceNodeValueClass,
    priceNodePlaceholder,
    updatePriceNodeValue,
    getAssetNodeLabel,
    getAssetNodeTypeLabel,
    getStrategyNodeLabel,
    getStrategyNodeMetrics,
    getTradeNodeAssetLabel,
    getTradeNodeVector,
    getTradeNodeVectorClass,
    getTradeNodeResult,
    getTradeNodeResultClass,
    getTradeNodeEntryDate,
    getTradeNodeExitDate,

    // Pickers
    activeAssetNodeId,
    openAssetPicker,
    closeAssetPicker,
    selectBoardAsset,

    activeStrategyNodeId,
    openStrategyPicker,
    closeStrategyPicker,
    selectBoardStrategy,
    localStrategies,

    activeTradeNodeId,
    expandedTradeStrategyId,
    openTradePicker,
    closeTradePicker,
    selectBoardTrade,
    tradePickerStrategies,
    getTradePickerStrategyTrades,
    toggleTradeStrategy,

    // Labels & Validation
    isSignalBoardValid,
    boardUiLabels,
    boardTextPlaceholder,
    boardQuestionPlaceholder,
    formatProfitFactor,
    formatCompactNumber,
    formatSignedCurrency,
    formatCurrencyValue,
    formatSignedPercent,
    getResultToneClass,
    getResultDotClass,
    getTradeSideLabel,
    formatTradeDate,
    formatTradeDuration,
    getStrategyMetrics,
    getTradeCurrencyProfit,
    getTradePercentProfit
  }
}
