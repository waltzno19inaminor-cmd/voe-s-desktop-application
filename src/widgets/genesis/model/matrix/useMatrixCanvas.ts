import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { useMatrixState, Point, Node } from './useMatrixState'

export function isTextEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, select, option, [contenteditable="true"], [data-text-editable="true"], .matrix-text-rich, .matrix-table-input'))
}

export function useMatrixCanvas(state: ReturnType<typeof useMatrixState>) {
  const canvasWrapper = ref<HTMLElement | null>(null)
  const suppressNextBackgroundClick = ref(false)

  const activeWireRaw = ref<{ fromId: string, fromPort?: 'left'|'right'|'top'|'bottom', current: Point } | null>(null)

  const clearActiveWire = () => {
    activeWireRaw.value = null
  }

  onMounted(() => {
    window.addEventListener('pointerup', clearActiveWire)
    window.addEventListener('pointercancel', clearActiveWire)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pointerup', clearActiveWire)
    window.removeEventListener('pointercancel', clearActiveWire)
  })

  const screenToWorld = (clientX: number, clientY: number) => {
    if (!canvasWrapper.value) return { x: 0, y: 0 }
    const rect = canvasWrapper.value.getBoundingClientRect()
    return {
      x: (clientX - rect.left - state.viewState.value.panX) / state.viewState.value.scale,
      y: (clientY - rect.top - state.viewState.value.panY) / state.viewState.value.scale
    }
  }

  const startPan = (
    e: MouseEvent,
    isZoneToolActive: boolean,
    drawStart: { value: Point | null },
    drawCurrent: { value: Point | null }
  ) => {
    if (e.button !== 0) return
    if (isTextEditingTarget(e.target)) return

    if (state.pendingNodeConfig.value) return

    if ((e.target as HTMLElement).closest('.skill-chip') ||
        (e.target as HTMLElement).closest('.tactical-button') ||
        (e.target as HTMLElement).closest('.pointer-events-auto:not(.absolute.inset-0)')) return

    e.preventDefault()
    window.getSelection()?.removeAllRanges()

    if (isZoneToolActive) {
      const worldPos = screenToWorld(e.clientX, e.clientY)
      drawStart.value = worldPos
      drawCurrent.value = worldPos
      return
    }

    const startX = e.clientX
    const startY = e.clientY
    const initialPanX = state.viewState.value.panX
    const initialPanY = state.viewState.value.panY
    let hasStartedPanning = false
    let panFrame: number | null = null
    let pendingPan: { x: number, y: number } | null = null

    const moveWindow = (mE: MouseEvent) => {
      const deltaX = mE.clientX - startX
      const deltaY = mE.clientY - startY
      if (!hasStartedPanning) {
        if (Math.abs(deltaX) <= 3 && Math.abs(deltaY) <= 3) return
        hasStartedPanning = true
        state.viewState.value.isPanning = true
        suppressNextBackgroundClick.value = true
      }
      mE.preventDefault()
      window.getSelection()?.removeAllRanges()
      pendingPan = {
        x: initialPanX + deltaX,
        y: initialPanY + deltaY
      }
      if (panFrame !== null) return
      panFrame = requestAnimationFrame(() => {
        if (pendingPan) {
          state.viewState.value.panX = pendingPan.x
          state.viewState.value.panY = pendingPan.y
          pendingPan = null
        }
        panFrame = null
      })
    }
    const stopPan = () => {
      state.viewState.value.isPanning = false
      if (panFrame !== null) {
        cancelAnimationFrame(panFrame)
        panFrame = null
      }
      if (pendingPan) {
        state.viewState.value.panX = pendingPan.x
        state.viewState.value.panY = pendingPan.y
        pendingPan = null
      }
      if (hasStartedPanning) {
        state.saveMatrixData()
      }
      window.removeEventListener('mousemove', moveWindow)
      window.removeEventListener('mouseup', stopPan)
    }
    window.addEventListener('mousemove', moveWindow)
    window.addEventListener('mouseup', stopPan)
  }

  const resetView = () => {
    const rootNode = state.nodes.value.find(n => n.isRoot) || state.nodes.value[0]
    if (rootNode && canvasWrapper.value) {
      const rect = canvasWrapper.value.getBoundingClientRect()
      state.viewState.value.scale = 1
      state.viewState.value.panX = (rect.width / 2) - rootNode.x
      state.viewState.value.panY = (rect.height / 2) - rootNode.y
      state.lastSelectedId.value = rootNode.id
      return
    }

    state.viewState.value.panX = 0
    state.viewState.value.panY = 0
  }

  const focusRoot = () => {
    const rootNode = state.nodes.value.find(n => n.isRoot) || state.nodes.value[0]
    if (rootNode && canvasWrapper.value) {
      const rect = canvasWrapper.value.getBoundingClientRect()
      state.viewState.value.scale = 1
      state.viewState.value.panX = (rect.width / 2) - rootNode.x
      state.viewState.value.panY = (rect.height / 2) - rootNode.y
      state.lastSelectedId.value = rootNode.id
    }
  }

  const handleBackgroundClick = (e: MouseEvent) => {
    if (suppressNextBackgroundClick.value) {
      suppressNextBackgroundClick.value = false
      e.preventDefault()
      e.stopPropagation()
      return
    }

    const target = e.target as HTMLElement
    if (target.closest('.skill-chip') ||
        target.closest('.tactical-button') ||
        target.closest('.zone-card') ||
        target.closest('.pointer-events-auto:not(.absolute.inset-0)')) {
      return
    }

    if (state.pendingNodeConfig.value) {
      const worldPos = screenToWorld(e.clientX, e.clientY)
      state.addNode({ ...state.pendingNodeConfig.value, x: worldPos.x, y: worldPos.y })
      state.pendingNodeConfig.value = null
      return
    }

    state.selectNode(null)
  }

  const handleCanvasMouseMove = (
    e: MouseEvent,
    drawStart: { value: Point | null },
    drawCurrent: { value: Point | null }
  ) => {
    const worldPos = screenToWorld(e.clientX, e.clientY)
    const worldX = worldPos.x
    const worldY = worldPos.y

    if (drawStart.value) {
      drawCurrent.value = { x: worldX, y: worldY }
      return
    }

    if (activeWireRaw.value) {
      activeWireRaw.value.current = { x: worldX, y: worldY }
      return
    }
  }

  const startWireDrag = (payload: { node: Node, port?: 'left'|'right'|'top'|'bottom' } | Node) => {
    const node = 'node' in payload ? payload.node : payload
    const port = 'port' in payload ? payload.port : 'right'
    activeWireRaw.value = { fromId: node.id, fromPort: port, current: { x: node.x, y: node.y } }
  }

  const handlePickupInput = (payload: { node: Node, port?: 'left'|'right'|'top'|'bottom' } | Node) => {
    const targetNode = 'node' in payload ? payload.node : payload
    const connList = state.connections.value
    const connIndex = connList.findLastIndex(c => c.toId === targetNode.id)
    if (connIndex !== -1) {
      const conn = connList[connIndex]
      if (conn) {
        activeWireRaw.value = { fromId: conn.fromId, fromPort: conn.fromPort || 'right', current: { x: targetNode.x, y: targetNode.y } }
        connList.splice(connIndex, 1)
        state.cleanupLogicBundles()
        state.saveMatrixData()
      }
    }
  }

  const completeWireDrop = (payload: { node: Node, port?: 'left'|'right'|'top'|'bottom' } | Node) => {
    const targetNode = 'node' in payload ? payload.node : payload
    const port = 'port' in payload ? payload.port : 'left'
    if (!activeWireRaw.value) return
    if (activeWireRaw.value.fromId !== targetNode.id) {
      const newConn = {
        fromId: activeWireRaw.value.fromId,
        toId: targetNode.id,
        fromPort: activeWireRaw.value.fromPort,
        toPort: port
      }
      state.connections.value.push(newConn)
      state.saveMatrixData()
    }
    clearActiveWire()
  }

  const handleCanvasMouseUp = (zones: any) => {
    if (zones.drawStart.value && zones.drawCurrent.value) {
      const x = Math.min(zones.drawStart.value.x, zones.drawCurrent.value.x)
      const y = Math.min(zones.drawStart.value.y, zones.drawCurrent.value.y)
      const w = Math.abs(zones.drawStart.value.x - zones.drawCurrent.value.x)
      const h = Math.abs(zones.drawStart.value.y - zones.drawCurrent.value.y)

      if (w > 10 && h > 10) {
        const newZone = {
          id: 'z' + Date.now().toString(36),
          type: zones.selectedZoneType.value,
          x, y, width: w, height: h,
          label: zones.selectedZoneType.value === 'session' ? 'SYDNEY' : `SECTOR_${zones.selectedZoneType.value.toUpperCase()}`
        }
        state.zones.value = [...state.zones.value, newZone]
      }
    }

    zones.drawStart.value = null
    zones.drawCurrent.value = null
    zones.isZoneToolActive.value = false
    clearActiveWire()
  }

  const closestNodeId = computed(() => {
    if (!activeWireRaw.value) return null
    const { x: mx, y: my } = activeWireRaw.value.current
    let closestId = null
    let minDistance = 300
    state.nodes.value.forEach(node => {
      if (node.id === activeWireRaw.value!.fromId) return
      if (node.isRoot) return
      const dist = Math.sqrt(Math.pow(node.x - mx, 2) + Math.pow(node.y - my, 2))
      if (dist < minDistance) {
        minDistance = dist
        closestId = node.id
      }
    })
    return closestId
  })

  const activeWire = computed(() => {
    if (!activeWireRaw.value) return null
    const from = state.getNode(activeWireRaw.value.fromId)
    if (!from) return null

    const fromRadius = (from.type === 'scaling-entry' || from.type === 'step') ? 28 : 56
    const fromGap = (from.type === 'scaling-entry' || from.type === 'step') ? 2 : 6
    let startX = from.x + fromRadius + fromGap
    let startY = from.y

    if (activeWireRaw.value.fromPort === 'top') {
      startX = from.x
      startY = from.y - fromRadius - fromGap
    } else if (activeWireRaw.value.fromPort === 'bottom') {
      startX = from.x
      startY = from.y + fromRadius + fromGap
    } else if (activeWireRaw.value.fromPort === 'left') {
      startX = from.x - fromRadius - fromGap
      startY = from.y
    }

    return {
      from: { x: startX, y: startY },
      fromPort: activeWireRaw.value.fromPort,
      to: activeWireRaw.value.current
    }
  })

  return {
    canvasWrapper,
    activeWireRaw,
    closestNodeId,
    activeWire,
    screenToWorld,
    startPan,
    resetView,
    focusRoot,
    handleBackgroundClick,
    handleCanvasMouseMove,
    startWireDrag,
    handlePickupInput,
    completeWireDrop,
    handleCanvasMouseUp
  }
}
