import { computed, ref } from 'vue'
import type { useMatrixState, Node } from './useMatrixState'

type DrawingTool = 'brush' | 'eraser'

interface DrawingPoint {
  x: number
  y: number
}

interface DrawingOperation {
  id: string
  tool?: DrawingTool
  color?: string
  size?: number
  points?: DrawingPoint[]
}

interface DrawingSnapshot {
  strokes: DrawingOperation[]
  preview?: string
}

export function useMatrixDrawing(state: ReturnType<typeof useMatrixState>) {
  const fullscreenDrawingBoard = ref<HTMLElement | null>(null)
  const fullscreenDrawingCanvas = ref<HTMLCanvasElement | null>(null)

  const activeDrawingStrokeId = ref<string | null>(null)
  const isDrawingPointerDown = ref(false)
  const isDrawingCursorVisible = ref(false)
  const drawingCursor = ref({ x: 0, y: 0 })
  const drawingTool = ref<DrawingTool>('brush')
  const drawingColor = ref('#2c2c2a')
  const drawingSize = ref(4)
  const prevDrawingForUndo = ref<DrawingSnapshot>({ strokes: [], preview: '' })
  const previousBodyCursor = ref<string | null>(null)

  const activeDrawingNode = computed(() => state.activeDrawingNode.value)

  const drawingCursorDiameter = computed(() => Math.max(10, getEffectiveDrawingSize()))
  const drawingSizePercent = computed(() => ((drawingSize.value - 1) / 23) * 100)

  const drawingCursorStyle = computed(() => ({
    width: `${drawingCursorDiameter.value}px`,
    height: `${drawingCursorDiameter.value}px`,
    transform: `translate(${drawingCursor.value.x - drawingCursorDiameter.value / 2}px, ${drawingCursor.value.y - drawingCursorDiameter.value / 2}px)`
  }))

  function ensureDrawingParams(node: Node) {
    if (!node.params) node.params = {}
    if (!Array.isArray(node.params.strokes)) node.params.strokes = []
    if (typeof node.params.preview !== 'string') node.params.preview = ''
  }

  function cloneDrawingSnapshot(node: Node): DrawingSnapshot {
    ensureDrawingParams(node)
    return {
      strokes: JSON.parse(JSON.stringify(node.params.strokes || [])),
      preview: node.params.preview || ''
    }
  }

  function applyDrawingSnapshot(node: Node, snapshot: DrawingSnapshot) {
    ensureDrawingParams(node)
    node.params.strokes = JSON.parse(JSON.stringify(snapshot.strokes || []))
    node.params.preview = snapshot.preview || ''
  }

  function getEffectiveDrawingSize() {
    return drawingTool.value === 'eraser'
      ? drawingSize.value * 2.8
      : drawingSize.value * 2
  }

  function openDrawingFullscreen(node: Node) {
    ensureDrawingParams(node)
    prevDrawingForUndo.value = cloneDrawingSnapshot(node)
    state.activeDrawingNodeId.value = node.id
    state.activeMenuCategory.value = null
    requestAnimationFrame(renderFullscreenDrawing)
  }

  function closeDrawingFullscreen() {
    const node = state.activeDrawingNode.value
    if (node) {
      saveDrawingPreview()
      const nextDrawing = cloneDrawingSnapshot(node)
      const prevDrawing = prevDrawingForUndo.value

      if (JSON.stringify(prevDrawing) !== JSON.stringify(nextDrawing)) {
        state.changeTree.recordNodeDrawingChanged(node, {
          undo: () => {
            applyDrawingSnapshot(node, prevDrawing)
            state.forceUpdate()
          },
          redo: () => {
            applyDrawingSnapshot(node, nextDrawing)
            state.forceUpdate()
          }
        })
      }
    }

    state.activeDrawingNodeId.value = null
    activeDrawingStrokeId.value = null
    isDrawingPointerDown.value = false
    isDrawingCursorVisible.value = false
    restoreNativeCursor()
    state.saveMatrixData()
  }

  function clearDrawingFullscreen() {
    if (!state.activeDrawingNode.value) return
    ensureDrawingParams(state.activeDrawingNode.value)
    state.activeDrawingNode.value.params.strokes = []
    state.activeDrawingNode.value.params.preview = ''
    renderFullscreenDrawing()
    state.saveMatrixData()
    state.forceUpdate()
  }

  function setDrawingSizeFromEvent(e: PointerEvent, track: HTMLElement) {
    const rect = track.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)))
    drawingSize.value = Math.round(1 + ratio * 23)
  }

  function startDrawingSizeDrag(e: PointerEvent) {
    const track = e.currentTarget as HTMLElement
    setDrawingSizeFromEvent(e, track)
    track.setPointerCapture?.(e.pointerId)

    const move = (moveEvent: PointerEvent) => {
      setDrawingSizeFromEvent(moveEvent, track)
    }
    const stop = () => {
      track.releasePointerCapture?.(e.pointerId)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
  }

  function getBoardRect() {
    const board = fullscreenDrawingBoard.value
    if (!board) return null
    const rect = board.getBoundingClientRect()
    return {
      left: rect.left,
      top: rect.top,
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height)
    }
  }

  function getFullscreenDrawingPoint(e: PointerEvent): DrawingPoint {
    const rect = getBoardRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    }
  }

  function updateDrawingCursor(e: PointerEvent) {
    const rect = getBoardRect()
    if (!rect) return
    drawingCursor.value = {
      x: Math.max(0, Math.min(rect.width, e.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, e.clientY - rect.top))
    }
    isDrawingCursorVisible.value = true
  }

  function hideNativeCursor() {
    if (previousBodyCursor.value !== null || typeof document === 'undefined') return
    previousBodyCursor.value = document.body.style.cursor
    document.body.style.cursor = 'none'
  }

  function restoreNativeCursor() {
    if (previousBodyCursor.value === null || typeof document === 'undefined') return
    document.body.style.cursor = previousBodyCursor.value
    previousBodyCursor.value = null
  }

  function getCanvasContext() {
    const canvas = fullscreenDrawingCanvas.value
    const board = fullscreenDrawingBoard.value
    if (!canvas || !board) return null

    const rect = board.getBoundingClientRect()
    const width = Math.max(1, rect.width)
    const height = Math.max(1, rect.height)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const targetWidth = Math.round(width * dpr)
    const targetHeight = Math.round(height * dpr)

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth
      canvas.height = targetHeight
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
    }

    const context = canvas.getContext('2d')
    if (!context) return null
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    return { context, width, height }
  }

  function toCanvasPoint(point: DrawingPoint, width: number, height: number) {
    return {
      x: (point.x / 100) * width,
      y: (point.y / 100) * height
    }
  }

  function configureContext(context: CanvasRenderingContext2D, operation: DrawingOperation) {
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineWidth = Math.max(1, operation.size || 2)
    context.globalAlpha = 1
    context.globalCompositeOperation = operation.tool === 'eraser' ? 'destination-out' : 'source-over'
    context.strokeStyle = operation.tool === 'eraser' ? '#000000' : operation.color || '#2c2c2a'
    context.fillStyle = operation.tool === 'eraser' ? '#000000' : operation.color || '#2c2c2a'
  }

  function drawDot(context: CanvasRenderingContext2D, operation: DrawingOperation, width: number, height: number) {
    const point = operation.points?.[0]
    if (!point) return
    const canvasPoint = toCanvasPoint(point, width, height)
    context.beginPath()
    context.arc(canvasPoint.x, canvasPoint.y, Math.max(1, (operation.size || 2) / 2), 0, Math.PI * 2)
    context.fill()
  }

  function drawOperation(context: CanvasRenderingContext2D, operation: DrawingOperation, width: number, height: number) {
    const points = operation.points || []
    if (!points.length) return

    configureContext(context, operation)

    if (points.length === 1) {
      drawDot(context, operation, width, height)
      return
    }

    context.beginPath()
    points.forEach((point, index) => {
      const canvasPoint = toCanvasPoint(point, width, height)
      if (index === 0) context.moveTo(canvasPoint.x, canvasPoint.y)
      else context.lineTo(canvasPoint.x, canvasPoint.y)
    })
    context.stroke()
  }

  function drawSegment(operation: DrawingOperation, from: DrawingPoint, to: DrawingPoint) {
    const canvasState = getCanvasContext()
    if (!canvasState) return
    const { context, width, height } = canvasState
    const start = toCanvasPoint(from, width, height)
    const end = toCanvasPoint(to, width, height)

    configureContext(context, operation)
    context.beginPath()
    context.moveTo(start.x, start.y)
    context.lineTo(end.x, end.y)
    context.stroke()
  }

  function renderFullscreenDrawing() {
    const canvasState = getCanvasContext()
    if (!canvasState) return
    const { context, width, height } = canvasState
    context.clearRect(0, 0, width, height)

    const operations = state.activeDrawingNode.value?.params?.strokes || []
    operations.forEach((operation: DrawingOperation) => {
      drawOperation(context, operation, width, height)
    })
  }

  function saveDrawingPreview() {
    const node = state.activeDrawingNode.value
    if (!node?.params || !fullscreenDrawingCanvas.value) return
    if (!node.params.strokes?.length) {
      node.params.preview = ''
      return
    }
    try {
      node.params.preview = fullscreenDrawingCanvas.value.toDataURL('image/png')
    } catch {
      node.params.preview = ''
    }
  }

  function startFullscreenDrawing(e: PointerEvent) {
    if (!state.activeDrawingNode.value) return
    ensureDrawingParams(state.activeDrawingNode.value)
    updateDrawingCursor(e)
    hideNativeCursor()
    isDrawingPointerDown.value = true

    const point = getFullscreenDrawingPoint(e)
    const operation: DrawingOperation = {
      id: 's' + Date.now().toString(36),
      tool: drawingTool.value,
      color: drawingColor.value,
      size: getEffectiveDrawingSize(),
      points: [point]
    }

    state.activeDrawingNode.value.params.strokes.push(operation)
    activeDrawingStrokeId.value = operation.id

    const canvasState = getCanvasContext()
    if (canvasState) {
      configureContext(canvasState.context, operation)
      drawDot(canvasState.context, operation, canvasState.width, canvasState.height)
    }
  }

  function moveFullscreenDrawing(e: PointerEvent) {
    if (!state.activeDrawingNode.value) return
    updateDrawingCursor(e)
    if (!isDrawingPointerDown.value || !activeDrawingStrokeId.value) return

    const operation = state.activeDrawingNode.value.params?.strokes?.find((item: DrawingOperation) => item.id === activeDrawingStrokeId.value) as DrawingOperation | undefined
    if (!operation) return

    const previousPoint = operation.points?.[operation.points.length - 1]
    const nextPoint = getFullscreenDrawingPoint(e)
    operation.points = operation.points || []
    operation.points.push(nextPoint)

    if (previousPoint) drawSegment(operation, previousPoint, nextPoint)
  }

  function finishFullscreenDrawing() {
    if (!state.activeDrawingNode.value) return
    activeDrawingStrokeId.value = null
    isDrawingPointerDown.value = false
    isDrawingCursorVisible.value = false
    saveDrawingPreview()
    restoreNativeCursor()
    state.saveMatrixData()
    state.forceUpdate()
  }

  function formatDrawingStroke(stroke: DrawingOperation) {
    if (stroke.tool === 'eraser') return ''
    return (stroke.points || []).map((point: DrawingPoint) => `${point.x},${point.y}`).join(' ')
  }

  return {
    fullscreenDrawingBoard,
    fullscreenDrawingCanvas,
    activeDrawingStrokeId,
    isDrawingPointerDown,
    isDrawingCursorVisible,
    drawingCursor,
    drawingTool,
    drawingColor,
    drawingSize,
    activeDrawingNode,
    drawingCursorDiameter,
    drawingSizePercent,
    drawingCursorStyle,
    openDrawingFullscreen,
    closeDrawingFullscreen,
    clearDrawingFullscreen,
    startDrawingSizeDrag,
    startFullscreenDrawing,
    moveFullscreenDrawing,
    finishFullscreenDrawing,
    renderFullscreenDrawing,
    formatDrawingStroke
  }
}
