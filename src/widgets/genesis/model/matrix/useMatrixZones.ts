import { ref, computed } from 'vue'
import type { useMatrixState, Zone } from './useMatrixState'

export function useMatrixZones(state: ReturnType<typeof useMatrixState>) {
  const isZoneToolActive = ref(false)
  const selectedZoneType = ref<'entry' | 'in-trade' | 'exit' | 'session'>('entry')
  const drawStart = ref<{ x: number, y: number } | null>(null)
  const drawCurrent = ref<{ x: number, y: number } | null>(null)

  function activateZoneTool(type: 'entry' | 'in-trade' | 'exit' | 'session') {
    isZoneToolActive.value = true
    selectedZoneType.value = type
  }

  function removeZone(id: string) {
    state.zones.value = state.zones.value.filter(z => z.id !== id)
  }

  function handleZoneCycle(id: string) {
    const zone = state.zones.value.find(z => z.id === id)
    if (!zone) return

    if (zone.type === 'session') {
      const sessions = ['SYDNEY', 'TOKYO', 'LONDON', 'NEW_YORK']
      const currentIndex = sessions.indexOf(zone.label)
      zone.label = sessions[(currentIndex + 1) % sessions.length]!
    } else {
      const types: Array<Zone['type']> = ['entry', 'in-trade', 'exit']
      const currentIndex = types.indexOf(zone.type)
      zone.type = types[(currentIndex + 1) % types.length]!
      zone.label = `SECTOR_${zone.type.toUpperCase()}`
    }
    state.forceUpdate()
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
    handleZoneCycle,
    startZoneDrag,
    startZoneResize,
    drawPreviewStyle
  }
}
