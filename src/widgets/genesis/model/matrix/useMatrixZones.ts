import { ref, computed } from 'vue'
import type { useMatrixState, Zone } from './useMatrixState'
import { useMatrixChangeTree } from './useMatrixChangeTree'

const domainMemberships = ref<Record<string, Set<string>>>({})

type DomainMembershipEvaluationOptions = {
  movedNodeId?: string
  previousPosition?: { x: number, y: number }
  currentPosition?: { x: number, y: number }
}

export function useMatrixZones(state: ReturnType<typeof useMatrixState>) {
  const changeTree = state.changeTree
  const isZoneToolActive = ref(false)
  const selectedZoneType = ref<Zone['type']>('session')

  function initializeDomainMembership(domainId: string, nodeIds: string[]) {
    domainMemberships.value[domainId] = new Set(nodeIds)
  }

  function createNodePositionAction(nodeId: string, previousPosition?: { x: number, y: number }, currentPosition?: { x: number, y: number }) {
    const applyPosition = (position?: { x: number, y: number }) => {
      if (!position) return
      const node = state.getNode(nodeId)
      if (!node) return
      node.x = position.x
      node.y = position.y
      state.forceUpdate()
      state.saveMatrixData()
    }

    return {
      undo: () => applyPosition(previousPosition),
      redo: () => applyPosition(currentPosition)
    }
  }

  function evaluateDomainMemberships(options: DomainMembershipEvaluationOptions = {}) {
    state.zones.value.forEach(zone => {
      if (!domainMemberships.value[zone.id]) {
        domainMemberships.value[zone.id] = new Set()
      }
      
      const currentMembers = new Set(
        state.nodes.value
          .filter(node => node.x >= zone.x && node.x <= zone.x + zone.width && node.y >= zone.y && node.y <= zone.y + zone.height)
          .map(node => node.id)
      )
      
      const previousMembers = domainMemberships.value[zone.id]!
      
      currentMembers.forEach(nodeId => {
        if (!previousMembers.has(nodeId)) {
          const node = state.getNode(nodeId)
          if (node) {
            const previousPosition = options.movedNodeId === nodeId ? options.previousPosition : { x: node.x, y: node.y }
            const currentPosition = options.movedNodeId === nodeId ? options.currentPosition : { x: node.x, y: node.y }
            changeTree.recordDomainNodeChanged(
              zone.id,
              node,
              true,
              createNodePositionAction(nodeId, previousPosition, currentPosition),
              { fromPosition: previousPosition, toPosition: currentPosition }
            )
          }
        }
      })
      
      previousMembers.forEach(nodeId => {
        if (!currentMembers.has(nodeId)) {
          const node = state.getNode(nodeId)
          if (node) {
            const previousPosition = options.movedNodeId === nodeId ? options.previousPosition : { x: node.x, y: node.y }
            const currentPosition = options.movedNodeId === nodeId ? options.currentPosition : { x: node.x, y: node.y }
            changeTree.recordDomainNodeChanged(
              zone.id,
              node,
              false,
              createNodePositionAction(nodeId, previousPosition, currentPosition),
              { fromPosition: previousPosition, toPosition: currentPosition }
            )
          }
        }
      })
      
      domainMemberships.value[zone.id] = currentMembers
    })
  }

  const drawStart = ref<{ x: number, y: number } | null>(null)
  const drawCurrent = ref<{ x: number, y: number } | null>(null)

  function activateZoneTool(type: 'entry' | 'in-trade' | 'exit' | 'session') {
    isZoneToolActive.value = true
    selectedZoneType.value = type
  }

  function updateDomainState(id: string) {
    const currentZone = state.zones.value.find(item => item.id === id)
    if (!currentZone) return
    const activeValue = changeTree.getDomainState(id)
    if (activeValue) {
      if (['entry', 'in-trade', 'exit'].includes(activeValue.toLowerCase())) {
        currentZone.type = activeValue.toLowerCase() as any
        currentZone.label = `SECTOR_${activeValue.toUpperCase()}`
      } else {
        currentZone.type = 'session'
        currentZone.label = activeValue
      }
    }
    state.forceUpdate()
    state.saveMatrixData()
  }

  function removeZone(id: string) {
    const zone = state.zones.value.find(z => z.id === id)
    if (!zone) return
    const index = state.zones.value.findIndex(z => z.id === id)

    changeTree.recordDomainDeleted(zone, {
      undo: () => {
        state.zones.value.splice(index, 0, zone)
        state.forceUpdate()
        state.saveMatrixData()
      },
      redo: () => {
        state.zones.value = state.zones.value.filter(z => z.id !== id)
        state.forceUpdate()
        state.saveMatrixData()
      }
    })

    // Immediately disable the ADD_DOMAIN event for this domain so the tree is consistent
    changeTree.disableDomainAddEvent(id)

    state.zones.value = state.zones.value.filter(z => z.id !== id)
    delete domainMemberships.value[id]
    state.saveMatrixData()
    evaluateDomainMemberships()
  }

  function handleZoneCycle(id: string) {
    const zone = state.zones.value.find(z => z.id === id)
    if (!zone) return
    
    let nextValue = ''
    if (zone.type === 'session') {
      const sessions = ['SYDNEY', 'TOKYO', 'LONDON', 'NEW_YORK']
      const currentVal = String(zone.label || '').trim().toUpperCase().replace(' ', '_')
      const currentIndex = sessions.indexOf(currentVal)
      const nextIndex = (currentIndex === -1 ? 0 : currentIndex + 1) % sessions.length
      nextValue = sessions[nextIndex] || 'SYDNEY'
    } else {
      const cycle = ['entry', 'in-trade', 'exit']
      const currentIndex = cycle.indexOf(zone.type)
      const nextType = cycle[(currentIndex + 1) % cycle.length]!
      nextValue = nextType
    }
    
    if (zone.type === 'session') {
      zone.label = nextValue
    } else {
      zone.type = nextValue as any
      zone.label = `SECTOR_${nextValue.toUpperCase()}`
    }
    
    changeTree.recordDomainChanged(zone, nextValue, {
      undo: () => setTimeout(() => updateDomainState(id), 0),
      redo: () => setTimeout(() => updateDomainState(id), 0)
    })
    
    state.forceUpdate()
    state.saveMatrixData()
  }

  function startZoneDrag(e: MouseEvent, zone: Zone) {
    const startX = e.clientX
    const startY = e.clientY
    const initialX = zone.x
    const initialY = zone.y
    
    const capturedNodes = state.nodes.value.filter(node => {
       return node.x >= zone.x && 
              node.x <= zone.x + zone.width && 
              node.y >= zone.y && 
              node.y <= zone.y + zone.height
    })
    
    const nodeInitPos = capturedNodes.map(n => ({ id: n.id, x: n.x, y: n.y }))

    const move = (mE: MouseEvent) => {
      const dx = (mE.clientX - startX) / state.viewState.value.scale
      const dy = (mE.clientY - startY) / state.viewState.value.scale
      
      zone.x = initialX + dx
      zone.y = initialY + dy
      
      nodeInitPos.forEach(p => {
         const node = state.getNode(p.id)
         if (node) {
            node.x = p.x + dx
            node.y = p.y + dy
         }
      })
      
      state.forceUpdate()
    }
    const stop = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', stop)
      state.saveMatrixData()
      evaluateDomainMemberships()
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', stop)
  }

  function startZoneResize(e: MouseEvent, zone: Zone) {
    const startX = e.clientX
    const startY = e.clientY
    const initialW = zone.width
    const initialH = zone.height
    
    const move = (mE: MouseEvent) => {
      zone.width = Math.max(20, initialW + (mE.clientX - startX) / state.viewState.value.scale)
      zone.height = Math.max(20, initialH + (mE.clientY - startY) / state.viewState.value.scale)
      state.forceUpdate()
    }
    const stop = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', stop)
      evaluateDomainMemberships()
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', stop)
  }

  const drawPreviewStyle = computed(() => {
    if (!drawStart.value || !drawCurrent.value) return {}
    const x = Math.min(drawStart.value.x, drawCurrent.value.x) * state.viewState.value.scale
    const y = Math.min(drawStart.value.y, drawCurrent.value.y) * state.viewState.value.scale
    const w = Math.abs(drawStart.value.x - drawCurrent.value.x) * state.viewState.value.scale
    const h = Math.abs(drawStart.value.y - drawCurrent.value.y) * state.viewState.value.scale
    return {
      left: `${Math.round(x)}px`,
      top: `${Math.round(y)}px`,
      width: `${Math.round(w)}px`,
      height: `${Math.round(h)}px`
    }
  })

  return {
    isZoneToolActive,
    selectedZoneType,
    drawStart,
    drawCurrent,
    activateZoneTool,
    removeZone,
    initializeDomainMembership,
    evaluateDomainMemberships,
    handleZoneCycle,
    startZoneDrag,
    startZoneResize,
    drawPreviewStyle
  }
}
