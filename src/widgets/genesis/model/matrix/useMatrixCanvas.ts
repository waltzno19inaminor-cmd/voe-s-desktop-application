import { ref, computed } from 'vue'
import type { useMatrixState, Point, Node, Connection } from './useMatrixState'
import { useMatrixChangeTree } from './useMatrixChangeTree'

export function isTextEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, select, option, [contenteditable="true"], [data-text-editable="true"], .matrix-text-rich, .matrix-table-input'))
}

export function useMatrixCanvas(state: ReturnType<typeof useMatrixState>) {
  const canvasWrapper = ref<HTMLElement | null>(null)
  const changeTree = state.changeTree
  const suppressNextBackgroundClick = ref(false)
  const cloneMatrixValue = <T>(value: T): T => {
    return JSON.parse(JSON.stringify(value))
  }
  
  const activeWireRaw = ref<{ fromId: string, fromPort?: 'left'|'right'|'top'|'bottom', originalFromPort?: 'left'|'right'|'top'|'bottom', originalToId?: string, originalToPort?: 'left'|'right'|'top'|'bottom', originalLabel?: string, originalBundleId?: string, originalBundleStemX?: number, originalBundleStemY?: number, originalBundleConnections?: Connection[], current: Point } | null>(null)

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
        activeWireRaw.value = { 
          fromId: conn.fromId, 
          fromPort: conn.fromPort || 'right', 
          originalFromPort: conn.fromPort || 'right',
          originalToId: conn.toId,
          originalToPort: conn.toPort || 'left',
          originalLabel: conn.label,
          originalBundleId: conn.bundleId,
          originalBundleStemX: conn.bundleStemX,
          originalBundleStemY: conn.bundleStemY,
          originalBundleConnections: conn.bundleId
            ? cloneMatrixValue(connList.filter(connection => connection.fromId === conn.fromId && connection.bundleId === conn.bundleId))
            : undefined,
          current: { x: targetNode.x, y: targetNode.y } 
        }
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
        toPort: port,
        ...(activeWireRaw.value.originalLabel ? { label: activeWireRaw.value.originalLabel } : {}),
        ...(activeWireRaw.value.originalBundleId ? { bundleId: activeWireRaw.value.originalBundleId } : {}),
        ...(activeWireRaw.value.originalBundleStemX !== undefined ? { bundleStemX: activeWireRaw.value.originalBundleStemX } : {}),
        ...(activeWireRaw.value.originalBundleStemY !== undefined ? { bundleStemY: activeWireRaw.value.originalBundleStemY } : {})
      }
      state.connections.value.push(newConn)
      const connectionSnapshot = cloneMatrixValue(newConn)
      const isPortChange = activeWireRaw.value.originalToId === targetNode.id
      const container = state.createActiveContainerAccess()
      
      const action = {
        undo: () => {
          container.setConnections(container.getConnections().filter(conn => !(
            conn.fromId === connectionSnapshot.fromId &&
            conn.toId === connectionSnapshot.toId &&
            conn.fromPort === connectionSnapshot.fromPort &&
            conn.toPort === connectionSnapshot.toPort
          )))
          state.cleanupLogicBundles(container)
          state.forceUpdate()
          state.saveMatrixData()
        },
        redo: () => {
          const exists = container.getConnections().some(conn => (
            conn.fromId === connectionSnapshot.fromId &&
            conn.toId === connectionSnapshot.toId &&
            conn.fromPort === connectionSnapshot.fromPort &&
            conn.toPort === connectionSnapshot.toPort
          ))
          if (!exists) container.setConnections([...container.getConnections(), cloneMatrixValue(connectionSnapshot)])
          state.forceUpdate()
          state.saveMatrixData()
        }
      }

      if (!isPortChange) {
        changeTree.recordConnectionCreated(newConn, state.getNode(newConn.fromId), targetNode, action)
      } else {
        changeTree.updateConnectionAction(newConn.fromId, newConn.toId, targetNode, action)
      }
      state.saveMatrixData()
    }
    activeWireRaw.value = null
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
        const zoneSnapshot = cloneMatrixValue(newZone)
        const containedNodes = state.nodes.value.filter(node => {
          return node.x >= newZone.x && 
                 node.x <= newZone.x + newZone.width && 
                 node.y >= newZone.y && 
                 node.y <= newZone.y + newZone.height
        })
        zones.initializeDomainMembership(newZone.id, containedNodes.map(node => node.id))
        changeTree.recordDomainAdded(newZone, containedNodes, {
          undo: () => {
            state.zones.value = state.zones.value.filter(zone => zone.id !== zoneSnapshot.id)
            state.forceUpdate()
            state.saveMatrixData()
          },
          redo: () => {
            if (!state.zones.value.some(zone => zone.id === zoneSnapshot.id)) {
              state.zones.value = [...state.zones.value, cloneMatrixValue(zoneSnapshot)]
            }
            zones.evaluateDomainMemberships()
            state.forceUpdate()
            state.saveMatrixData()
          }
        }, (node: Node) => {
          const position = { x: node.x, y: node.y }
          const applyPosition = () => {
            const currentNode = state.getNode(node.id)
            if (!currentNode) return
            currentNode.x = position.x
            currentNode.y = position.y
            state.forceUpdate()
            state.saveMatrixData()
          }
          return {
            undo: applyPosition,
            redo: applyPosition
          }
        })
        zones.evaluateDomainMemberships()
        state.forceUpdate()
        state.saveMatrixData()
      }
    }
    
    zones.drawStart.value = null
    zones.drawCurrent.value = null
    zones.isZoneToolActive.value = false
    
    if (activeWireRaw.value && activeWireRaw.value.originalToId) {
      const connInfo = { 
        fromId: activeWireRaw.value.fromId, 
        toId: activeWireRaw.value.originalToId, 
        fromPort: activeWireRaw.value.originalFromPort, 
        toPort: activeWireRaw.value.originalToPort,
        label: activeWireRaw.value.originalLabel,
        bundleId: activeWireRaw.value.originalBundleId,
        bundleStemX: activeWireRaw.value.originalBundleStemX,
        bundleStemY: activeWireRaw.value.originalBundleStemY
      }
      const connectionSnapshot = cloneMatrixValue(connInfo)
      const bundleSnapshot = cloneMatrixValue(activeWireRaw.value.originalBundleConnections || [])
      const shouldCollapseBundle = !!connectionSnapshot.bundleId && bundleSnapshot.length === 2
      const bundleTargetIds = new Set(bundleSnapshot.map(connection => connection.toId))
      const container = state.createActiveContainerAccess()
      const isSameConnection = (connection: Connection, snapshot: Connection) => (
        connection.fromId === snapshot.fromId &&
        connection.toId === snapshot.toId &&
        (connection.fromPort || 'right') === (snapshot.fromPort || 'right') &&
        (connection.toPort || 'left') === (snapshot.toPort || 'left')
      )
      const isDefaultBundleConnection = bundleSnapshot.length > 1 && isSameConnection(bundleSnapshot[0]!, connectionSnapshot)
      const shouldRestoreWholeBundle = shouldCollapseBundle || isDefaultBundleConnection

      const deleteAction = {
        undo: () => {
          if (shouldRestoreWholeBundle) {
            container.setConnections([
              ...container.getConnections().filter(conn => !(
                conn.fromId === connectionSnapshot.fromId && bundleTargetIds.has(conn.toId)
              )),
              ...cloneMatrixValue(bundleSnapshot)
            ])
            state.forceUpdate()
            state.saveMatrixData()
            return
          }

          const exists = container.getConnections().some(conn => isSameConnection(conn, connectionSnapshot))
          if (!exists) container.setConnections([...container.getConnections(), cloneMatrixValue(connectionSnapshot)])
          state.forceUpdate()
          state.saveMatrixData()
        },
        redo: () => {
          if (isDefaultBundleConnection) {
            container.setConnections(container.getConnections().filter(conn => !(
              conn.fromId === connectionSnapshot.fromId && bundleTargetIds.has(conn.toId)
            )))
            state.forceUpdate()
            state.saveMatrixData()
            return
          }

          const nextConnections = container.getConnections().filter(conn => !isSameConnection(conn, connectionSnapshot))

          if (shouldCollapseBundle) {
            container.setConnections(nextConnections.map(conn => {
              if (conn.fromId !== connectionSnapshot.fromId || conn.bundleId !== connectionSnapshot.bundleId) return conn
              const plainConnection = { ...conn }
              delete plainConnection.label
              delete plainConnection.bundleId
              delete plainConnection.bundleStemX
              delete plainConnection.bundleStemY
              return plainConnection
            }))
          } else {
            container.setConnections(nextConnections)
            state.cleanupLogicBundles(container)
          }
          state.forceUpdate()
          state.saveMatrixData()
        }
      }

      deleteAction.redo()
      changeTree.recordConnectionDeleted(connInfo, state.getNode(connInfo.fromId), state.getNode(connInfo.toId), deleteAction)
      state.saveMatrixData()
    }
    
    activeWireRaw.value = null 
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
