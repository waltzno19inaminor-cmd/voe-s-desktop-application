import { ref, computed } from 'vue'

type BoardDrawingTool = 'pencil' | 'eraser'

interface BoardDrawingPoint {
  x: number
  y: number
}

interface BoardDrawingOperation {
  id: string
  tool: BoardDrawingTool
  color: string
  size: number
  points: BoardDrawingPoint[]
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function useBoardDrawing() {
  const boardViewport = ref<HTMLElement | null>(null)
  const boardCursorViewport = ref<HTMLElement | null>(null)
  const boardCanvas = ref<HTMLCanvasElement | null>(null)
  const boardContentSize = ref({ width: 1, height: 1 })
  const boardTransform = ref({ x: 0, y: 0 })

  const activeBoardStrokeId = ref<string | null>(null)
  const isBoardDrawingPointerDown = ref(false)
  const isBoardDrawingCursorVisible = ref(false)
  const boardDrawingCursor = ref({ x: 0, y: 0 })
  const boardDrawingTool = ref<BoardDrawingTool>('pencil')
  const boardDrawingColor = ref('#000000')
  const boardDrawingSize = ref(4)
  let previousDocumentCursor = ''
  let previousBodyCursor = ''
  let isNativeCursorHidden = false

  const boardDrawingCursorDiameter = computed(() => Math.max(10, getEffectiveBrushSize()))
  const boardDrawingSizePercent = computed(() => ((boardDrawingSize.value - 1) / 23) * 100)

  const boardDrawingCursorStyle = computed(() => ({
    width: `${boardDrawingCursorDiameter.value}px`,
    height: `${boardDrawingCursorDiameter.value}px`,
    transform: `translate(${boardDrawingCursor.value.x - boardDrawingCursorDiameter.value / 2}px, ${boardDrawingCursor.value.y - boardDrawingCursorDiameter.value / 2}px)`
  }))

  function getEffectiveBrushSize() {
    return boardDrawingTool.value === 'eraser'
      ? boardDrawingSize.value * 2.8
      : boardDrawingSize.value * 2
  }

  function setBoardDrawingSizeFromEvent(e: PointerEvent, track: HTMLElement) {
    const rect = track.getBoundingClientRect()
    let ratio = 0
    if (rect.height > rect.width) {
      ratio = 1 - clamp((e.clientY - rect.top) / Math.max(1, rect.height), 0, 1)
    } else {
      ratio = clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1)
    }
    boardDrawingSize.value = Number((1 + ratio * 23).toFixed(2))
  }

  function startBoardDrawingSizeDrag(e: PointerEvent) {
    const track = e.currentTarget as HTMLElement
    track.setPointerCapture?.(e.pointerId)
    setBoardDrawingSizeFromEvent(e, track)

    const move = (moveEvent: PointerEvent) => {
      setBoardDrawingSizeFromEvent(moveEvent, track)
    }
    const stop = () => {
      track.releasePointerCapture?.(e.pointerId)
      track.removeEventListener('pointermove', move)
      track.removeEventListener('pointerup', stop)
      track.removeEventListener('pointercancel', stop)
    }

    track.addEventListener('pointermove', move)
    track.addEventListener('pointerup', stop)
    track.addEventListener('pointercancel', stop)
  }

  function getBoardRect() {
    const board = boardViewport.value
    if (!board) return null

    const rect = board.getBoundingClientRect()
    const width = Math.max(1, board.offsetWidth || board.clientWidth || rect.width)
    const height = Math.max(1, board.offsetHeight || board.clientHeight || rect.height)
    const scaleX = rect.width / width || 1
    const scaleY = rect.height / height || 1

    return { element: board, rect, width, height, scaleX, scaleY }
  }

  function getBoardDrawingPoint(e: MouseEvent): BoardDrawingPoint {
    const board = getBoardRect()
    if (!board) return { x: 0, y: 0 }

    return {
      x: (e.clientX - board.rect.left) / board.scaleX - boardTransform.value.x,
      y: (e.clientY - board.rect.top) / board.scaleY - boardTransform.value.y
    }
  }

  function updateBoardDrawingCursor(e: MouseEvent) {
    const viewport = boardCursorViewport.value
    if (viewport) {
      const rect = viewport.getBoundingClientRect()
      boardDrawingCursor.value = {
        x: clamp(e.clientX - rect.left, 0, rect.width),
        y: clamp(e.clientY - rect.top, 0, rect.height)
      }
      isBoardDrawingCursorVisible.value = true
      return
    }

    const board = getBoardRect()
    if (!board) return
    boardDrawingCursor.value = {
      x: clamp((e.clientX - board.rect.left) / board.scaleX, 0, board.width),
      y: clamp((e.clientY - board.rect.top) / board.scaleY, 0, board.height)
    }
    isBoardDrawingCursorVisible.value = true
  }

  function getCanvasContext() {
    const canvas = boardCanvas.value
    const board = getBoardRect()
    if (!canvas || !board) return null

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const nextWidth = Math.max(1, Math.round(board.width * dpr))
    const nextHeight = Math.max(1, Math.round(board.height * dpr))

    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth
      canvas.height = nextHeight
    }

    canvas.style.width = `${board.width}px`
    canvas.style.height = `${board.height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    return { ctx, width: board.width, height: board.height }
  }

  function configureContext(ctx: CanvasRenderingContext2D, operation: BoardDrawingOperation) {
    ctx.globalCompositeOperation = operation.tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.strokeStyle = operation.color || '#000000'
    ctx.fillStyle = operation.color || '#000000'
    ctx.lineWidth = getOperationScreenSize(operation)
  }

  function getOperationScreenSize(operation: BoardDrawingOperation) {
    return Math.max(1, operation.size || 4)
  }

  function getCanvasPoint(point: BoardDrawingPoint) {
    return {
      x: point.x + boardTransform.value.x,
      y: point.y + boardTransform.value.y
    }
  }

  function drawDot(ctx: CanvasRenderingContext2D, operation: BoardDrawingOperation, point: BoardDrawingPoint) {
    const canvasPoint = getCanvasPoint(point)
    configureContext(ctx, operation)
    ctx.beginPath()
    ctx.arc(canvasPoint.x, canvasPoint.y, getOperationScreenSize(operation) / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  function drawSegment(ctx: CanvasRenderingContext2D, operation: BoardDrawingOperation, from: BoardDrawingPoint, to: BoardDrawingPoint) {
    const canvasFrom = getCanvasPoint(from)
    const canvasTo = getCanvasPoint(to)
    configureContext(ctx, operation)
    ctx.beginPath()
    ctx.moveTo(canvasFrom.x, canvasFrom.y)
    ctx.lineTo(canvasTo.x, canvasTo.y)
    ctx.stroke()
  }

  function normalizeOperation(operation: BoardDrawingOperation): BoardDrawingOperation {
    if (operation.tool) return operation

    return {
      ...operation,
      tool: 'pencil',
      size: (operation.size || 2) * 2,
      points: (operation.points || []).map((point) => ({
        x: (point.x / 100) * boardContentSize.value.width,
        y: (point.y / 100) * boardContentSize.value.height
      }))
    }
  }

  function drawOperation(ctx: CanvasRenderingContext2D, operation: BoardDrawingOperation) {
    const normalizedOperation = normalizeOperation(operation)
    const points = normalizedOperation.points || []
    if (!points.length) return
    if (points.length === 1) {
      drawDot(ctx, normalizedOperation, points[0]!)
      return
    }

    configureContext(ctx, normalizedOperation)
    ctx.beginPath()
    const firstPoint = getCanvasPoint(points[0]!)
    ctx.moveTo(firstPoint.x, firstPoint.y)
    for (let index = 1; index < points.length; index += 1) {
      const canvasPoint = getCanvasPoint(points[index]!)
      ctx.lineTo(canvasPoint.x, canvasPoint.y)
    }
    ctx.stroke()
  }

  function renderBoardDrawing(operations: BoardDrawingOperation[]) {
    const canvasState = getCanvasContext()
    if (!canvasState) return

    canvasState.ctx.clearRect(0, 0, canvasState.width, canvasState.height)
    operations.forEach((operation) => drawOperation(canvasState.ctx, operation))
    canvasState.ctx.globalCompositeOperation = 'source-over'
  }

  function startBoardDrawing(e: MouseEvent, operations: BoardDrawingOperation[]) {
    const target = e.target as HTMLElement
    if (target.closest('[data-board-node], [data-board-chrome]')) return

    hideNativeCursor()
    updateBoardDrawingCursor(e)
    isBoardDrawingPointerDown.value = true

    const point = getBoardDrawingPoint(e)
    const operation: BoardDrawingOperation = {
      id: 'bo' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      tool: boardDrawingTool.value,
      color: boardDrawingTool.value === 'eraser' ? '#000000' : boardDrawingColor.value,
      size: getEffectiveBrushSize(),
      points: [point]
    }

    operations.push(operation)
    activeBoardStrokeId.value = operation.id

    const canvasState = getCanvasContext()
    if (canvasState) drawDot(canvasState.ctx, operation, point)
  }

  function moveBoardDrawing(e: MouseEvent, operations: BoardDrawingOperation[]) {
    updateBoardDrawingCursor(e)
    if (!isBoardDrawingPointerDown.value || !activeBoardStrokeId.value) return

    const operation = operations.find((item) => item.id === activeBoardStrokeId.value)
    if (!operation) return

    const previousPoint = operation.points[operation.points.length - 1]!
    const nextPoint = getBoardDrawingPoint(e)
    operation.points.push(nextPoint)

    const canvasState = getCanvasContext()
    if (canvasState) drawSegment(canvasState.ctx, operation, previousPoint, nextPoint)
  }

  function finishBoardDrawing() {
    activeBoardStrokeId.value = null
    isBoardDrawingPointerDown.value = false
    isBoardDrawingCursorVisible.value = false
    restoreNativeCursor()
  }

  function hideNativeCursor() {
    if (isNativeCursorHidden) return
    previousDocumentCursor = document.documentElement.style.cursor
    previousBodyCursor = document.body.style.cursor
    document.documentElement.style.cursor = 'none'
    document.body.style.cursor = 'none'
    isNativeCursorHidden = true
  }

  function restoreNativeCursor() {
    if (!isNativeCursorHidden) {
      if (document.documentElement.style.cursor === 'none') document.documentElement.style.cursor = ''
      if (document.body.style.cursor === 'none') document.body.style.cursor = ''
      return
    }
    document.documentElement.style.cursor = previousDocumentCursor
    document.body.style.cursor = previousBodyCursor
    previousDocumentCursor = ''
    previousBodyCursor = ''
    isNativeCursorHidden = false
  }

  return {
    boardViewport,
    boardCursorViewport,
    boardCanvas,
    boardContentSize,
    boardTransform,
    activeBoardStrokeId,
    isBoardDrawingPointerDown,
    isBoardDrawingCursorVisible,
    boardDrawingCursor,
    boardDrawingTool,
    boardDrawingColor,
    boardDrawingSize,
    boardDrawingCursorDiameter,
    boardDrawingSizePercent,
    boardDrawingCursorStyle,
    startBoardDrawingSizeDrag,
    startBoardDrawing,
    moveBoardDrawing,
    finishBoardDrawing,
    restoreNativeCursor,
    renderBoardDrawing,
    updateBoardDrawingCursor
  }
}
