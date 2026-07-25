import { computed, ref } from 'vue'
import type { JournalArticleBoardDrawingNode } from '~/entities/journal-article/types/journal-article.types'

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

export function useForumDrawing() {
  const fullscreenDrawingBoard = ref<HTMLElement | null>(null)
  const fullscreenDrawingCanvas = ref<HTMLCanvasElement | null>(null)

  const activeDrawingNode = ref<JournalArticleBoardDrawingNode | null>(null)
  const activeDrawingStrokeId = ref<string | null>(null)
  const isDrawingPointerDown = ref(false)
  const isDrawingCursorVisible = ref(false)
  const drawingCursor = ref({ x: 0, y: 0 })
  const drawingTool = ref<DrawingTool>('brush')
  const drawingColor = ref('#000000')
  const drawingSize = ref(4)
  const previousBodyCursor = ref<string | null>(null)

  const drawingCursorDiameter = computed(() => Math.max(10, getEffectiveDrawingSize()))
  const drawingSizePercent = computed(() => ((drawingSize.value - 1) / 23) * 100)

  const drawingCursorStyle = computed(() => ({
    width: `${drawingCursorDiameter.value}px`,
    height: `${drawingCursorDiameter.value}px`,
    transform: `translate(${drawingCursor.value.x - drawingCursorDiameter.value / 2}px, ${drawingCursor.value.y - drawingCursorDiameter.value / 2}px)`
  }))

  function ensureDrawingParams(node: JournalArticleBoardDrawingNode) {
    if (!node.params) node.params = {}
    if (!Array.isArray(node.params.strokes)) node.params.strokes = []
  }

  function getEffectiveDrawingSize() {
    return drawingTool.value === 'eraser'
      ? drawingSize.value * 2.8
      : drawingSize.value * 2
  }

  function openDrawingFullscreen(node: JournalArticleBoardDrawingNode) {
    ensureDrawingParams(node)
    activeDrawingNode.value = node
    requestAnimationFrame(renderFullscreenDrawing)
  }

  function closeDrawingFullscreen() {
    saveDrawingPreview()
    activeDrawingNode.value = null
    activeDrawingStrokeId.value = null
    isDrawingPointerDown.value = false
    isDrawingCursorVisible.value = false
    restoreNativeCursor()
  }

  function clearDrawingFullscreen() {
    if (!activeDrawingNode.value) return
    ensureDrawingParams(activeDrawingNode.value)
    activeDrawingNode.value.params!.strokes = []
    activeDrawingNode.value.params!.preview = ''
    renderFullscreenDrawing()
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
    context.strokeStyle = operation.tool === 'eraser' ? '#000000' : operation.color || '#000000'
    context.fillStyle = operation.tool === 'eraser' ? '#000000' : operation.color || '#000000'
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

    const operations = activeDrawingNode.value?.params?.strokes || []
    operations.forEach((operation: DrawingOperation) => {
      drawOperation(context, operation, width, height)
    })
  }

  function saveDrawingPreview() {
    if (!activeDrawingNode.value?.params || !fullscreenDrawingCanvas.value) return
    if (!activeDrawingNode.value.params.strokes?.length) {
      activeDrawingNode.value.params.preview = ''
      return
    }
    try {
      activeDrawingNode.value.params.preview = fullscreenDrawingCanvas.value.toDataURL('image/png')
    } catch {
      activeDrawingNode.value.params.preview = ''
    }
  }

  function startFullscreenDrawing(e: PointerEvent) {
    if (!activeDrawingNode.value) return
    ensureDrawingParams(activeDrawingNode.value)
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

    activeDrawingNode.value.params!.strokes!.push(operation)
    activeDrawingStrokeId.value = operation.id

    const canvasState = getCanvasContext()
    if (canvasState) {
      configureContext(canvasState.context, operation)
      drawDot(canvasState.context, operation, canvasState.width, canvasState.height)
    }
  }

  function moveFullscreenDrawing(e: PointerEvent) {
    if (!activeDrawingNode.value) return
    updateDrawingCursor(e)
    if (!isDrawingPointerDown.value || !activeDrawingStrokeId.value) return

    const operation = activeDrawingNode.value.params?.strokes?.find((item: DrawingOperation) => item.id === activeDrawingStrokeId.value) as DrawingOperation | undefined
    if (!operation) return

    const previousPoint = operation.points?.[operation.points.length - 1]
    const nextPoint = getFullscreenDrawingPoint(e)
    operation.points = operation.points || []
    operation.points.push(nextPoint)

    if (previousPoint) drawSegment(operation, previousPoint, nextPoint)
  }

  function finishFullscreenDrawing() {
    if (!activeDrawingNode.value) return
    activeDrawingStrokeId.value = null
    isDrawingPointerDown.value = false
    isDrawingCursorVisible.value = false
    saveDrawingPreview()
    restoreNativeCursor()
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
