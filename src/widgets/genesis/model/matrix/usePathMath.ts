import { useI18n } from '~/shared/i18n/useI18n'
import type { useMatrixState, Connection, Point, Node } from './useMatrixState'

export function usePathMath(state: ReturnType<typeof useMatrixState>) {
  const { locale, t } = useI18n()

  function getMinChildX(fromId: string) {
    const from = state.getNode(fromId)
    if (!from) return 0
    const allLogicConns = state.connections.value.filter(c => c.fromId === fromId && c.bundleId)
    const allChildren = allLogicConns.map(c => state.getNode(c.toId)).filter(Boolean) as Node[]
    if (allChildren.length === 0) return from.x + 362

    return Math.min(...allChildren.map(n => {
      const radius = (n.type === 'scaling-entry' || n.type === 'step') ? 28 : 56
      const gap = (n.type === 'scaling-entry' || n.type === 'step') ? 2 : 6
      return n.x - (radius + gap)
    }))
  }

  function getMainStemPath(fromId: string) {
    const from = state.getNode(fromId)
    if (!from) return ""
    const fromRadius = (from.type === 'scaling-entry' || from.type === 'step') ? 28 : 56
    const fromGap = (from.type === 'scaling-entry' || from.type === 'step') ? 2 : 6
    const startX = from.x + (fromRadius + fromGap)

    const minChildX = getMinChildX(fromId)
    const totalDx = Math.max(0, minChildX - startX)
    const mainStemLen = Math.max(120, totalDx * 0.25)

    return `M ${startX} ${from.y} L ${startX + mainStemLen} ${from.y}`
  }

  function getBundleStemPath(fromId: string, bundleId: string) {
    const from = state.getNode(fromId)
    if (!from) return ""
    const refConn = state.connections.value.find(c => c.fromId === fromId && c.bundleId === bundleId)
    if (!refConn) return ""

    const fromRadius = (from.type === 'scaling-entry' || from.type === 'step') ? 28 : 56
    const fromGap = (from.type === 'scaling-entry' || from.type === 'step') ? 2 : 6
    const startX = from.x + (fromRadius + fromGap)

    const minChildX = getMinChildX(fromId)
    const totalDx = Math.max(0, minChildX - startX)
    const mainStemLen = Math.max(120, totalDx * 0.25)
    const bundleStemLen = Math.max(160, totalDx * 0.35) + (refConn.bundleStemX || 0)

    const parentBundles = [...new Set(state.connections.value.filter(c => c.fromId === fromId && c.bundleId).map(c => c.bundleId))]
    const bundleIndex = parentBundles.indexOf(bundleId)
    const totalBundles = parentBundles.length
    const verticalSpread = 100
    const bundleYOffset = (totalBundles > 1 ? (bundleIndex - (totalBundles - 1) / 2) * verticalSpread : 0) + (refConn.bundleStemY || 0)

    const j1x = startX + mainStemLen
    const j2x = j1x + bundleStemLen
    const j2y = from.y + bundleYOffset

    const dx2 = j2x - j1x
    const cp1 = { x: j1x + dx2 * 0.5, y: from.y }
    const cp2 = { x: j1x + dx2 * 0.5, y: j2y }

    return `M ${j1x} ${from.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${j2x} ${j2y}`
  }

  function getBranchPath(line: Connection) {
    const from = state.getNode(line.fromId)
    const to = state.getNode(line.toId)
    if (!from || !to) return ""
    const fromRadius = (from.type === 'scaling-entry' || from.type === 'step') ? 28 : 56
    const fromGap = (from.type === 'scaling-entry' || from.type === 'step') ? 2 : 6
    const startX = from.x + (fromRadius + fromGap)

    const minChildX = getMinChildX(line.fromId)
    const totalDx = Math.max(0, minChildX - startX)
    const mainStemLen = Math.max(120, totalDx * 0.25)
    const bundleStemLen = Math.max(160, totalDx * 0.35) + (line.bundleStemX || 0)

    const parentBundles = [...new Set(state.connections.value.filter(c => c.fromId === from.id && c.bundleId).map(c => c.bundleId))]
    const bundleIndex = parentBundles.indexOf(line.bundleId!)
    const totalBundles = parentBundles.length
    const verticalSpread = 100
    const bundleYOffset = (totalBundles > 1 ? (bundleIndex - (totalBundles - 1) / 2) * verticalSpread : 0) + (line.bundleStemY || 0)

    const j2x = startX + mainStemLen + bundleStemLen
    const j2y = from.y + bundleYOffset

    const toRadius = (to.type === 'scaling-entry' || to.type === 'step') ? 28 : 56
    const toGap = (to.type === 'scaling-entry' || to.type === 'step') ? 2 : 6
    const endPoint = { x: to.x - (toRadius + toGap), y: to.y }

    const dx3 = endPoint.x - j2x
    const cp3 = { x: j2x + dx3 * 0.5, y: j2y }
    const cp4 = { x: j2x + dx3 * 0.5, y: endPoint.y }

    return `M ${j2x} ${j2y} C ${cp3.x} ${cp3.y}, ${cp4.x} ${cp4.y}, ${endPoint.x} ${endPoint.y}`
  }

  function createDoubleForkPath(f: Point, t: Point, mainStemLen: number, bundleStemLen: number, bundleY: number) {
    const j1x = f.x + mainStemLen
    const j1y = f.y

    const j2x = j1x + bundleStemLen
    const j2y = bundleY

    const segment1 = `M ${f.x} ${f.y} L ${j1x} ${j1y}`

    const dx2 = j2x - j1x
    const cp1 = { x: j1x + dx2 * 0.5, y: j1y }
    const cp2 = { x: j1x + dx2 * 0.5, y: j2y }
    const segment2 = `C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${j2x} ${j2y}`

    const dx3 = t.x - j2x
    const cp3 = { x: j2x + dx3 * 0.5, y: j2y }
    const cp4 = { x: j2x + dx3 * 0.5, y: t.y }
    const segment3 = `C ${cp3.x} ${cp3.y}, ${cp4.x} ${cp4.y}, ${t.x} ${t.y}`

    return `${segment1} ${segment2} ${segment3}`
  }

  function createCurvedPath(f: Point, t: Point, fromPort: string = 'right', toPort: string = 'left') {
    let cp1 = { x: f.x, y: f.y }
    let cp2 = { x: t.x, y: t.y }

    const dx = Math.abs(t.x - f.x)
    const dy = Math.abs(t.y - f.y)
    const curveDist = Math.max(dx, dy) * 0.5

    if (fromPort === 'right') cp1.x += curveDist
    else if (fromPort === 'left') cp1.x -= curveDist
    else if (fromPort === 'top') cp1.y -= curveDist
    else if (fromPort === 'bottom') cp1.y += curveDist

    if (toPort === 'left') cp2.x -= curveDist
    else if (toPort === 'right') cp2.x += curveDist
    else if (toPort === 'top') cp2.y -= curveDist
    else if (toPort === 'bottom') cp2.y += curveDist

    return `M ${f.x} ${f.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${t.x} ${t.y}`
  }

  function createRootPath(fromId: string, toId: string) {
    const from = state.getNode(fromId)
    const to = state.getNode(toId)
    if (!from || !to) return ""

    const conn = state.connections.value.find(c => c.fromId === fromId && c.toId === toId)

    const fromRadius = (from.type === 'scaling-entry' || from.type === 'step') ? 28 : 56
    const toRadius = (to.type === 'scaling-entry' || to.type === 'step') ? 28 : 56
    const fromGap = (from.type === 'scaling-entry' || from.type === 'step') ? 2 : 6
    const toGap = (to.type === 'scaling-entry' || to.type === 'step') ? 2 : 6

    let startPoint = { x: from.x + (fromRadius + fromGap), y: from.y }
    if (conn?.fromPort === 'top') startPoint = { x: from.x, y: from.y - fromRadius - fromGap }
    else if (conn?.fromPort === 'bottom') startPoint = { x: from.x, y: from.y + fromRadius + fromGap }
    else if (conn?.fromPort === 'left') startPoint = { x: from.x - fromRadius - fromGap, y: from.y }

    let endPoint = { x: to.x - (toRadius + toGap), y: to.y }
    if (conn?.toPort === 'top') endPoint = { x: to.x, y: to.y - toRadius - toGap }
    else if (conn?.toPort === 'bottom') endPoint = { x: to.x, y: to.y + toRadius + toGap }
    else if (conn?.toPort === 'right') endPoint = { x: to.x + toRadius + toGap, y: to.y }

    if (conn?.bundleId) {
       const parentBundles = [...new Set(state.connections.value.filter(c => c.fromId === fromId && c.bundleId).map(c => c.bundleId))]
       const bundleIndex = parentBundles.indexOf(conn.bundleId)
       const totalBundles = parentBundles.length

       const minChildX = getMinChildX(fromId)
       const totalDx = Math.max(0, minChildX - startPoint.x)

       const mainStemLen = Math.max(120, totalDx * 0.25)
       const bundleStemLen = Math.max(160, totalDx * 0.35) + (conn.bundleStemX || 0)

       const verticalSpread = 100
       const bundleYOffset = (totalBundles > 1 ? (bundleIndex - (totalBundles - 1) / 2) * verticalSpread : 0) + (conn.bundleStemY || 0)

       return createDoubleForkPath(startPoint, endPoint, mainStemLen, bundleStemLen, startPoint.y + bundleYOffset)
    }

    return createCurvedPath(startPoint, endPoint, conn?.fromPort || 'right', conn?.toPort || 'left')
  }

  function getConnectionMidpoint(line: Connection) {
    const from = state.getNode(line.fromId)
    const to = state.getNode(line.toId)
    if (!from || !to) return { x: 0, y: 0 }

    if (line.bundleId) {
       const parentBundles = [...new Set(state.connections.value.filter(c => c.fromId === from.id && c.bundleId).map(c => c.bundleId))]
       const bundleIndex = parentBundles.indexOf(line.bundleId)
       const totalBundles = parentBundles.length

       const fromRadius = (from.type === 'scaling-entry' || from.type === 'step') ? 28 : 56
       const fromGap = (from.type === 'scaling-entry' || from.type === 'step') ? 2 : 6
       let startX = from.x + (fromRadius + fromGap)
       let startY = from.y
       if (line.fromPort === 'top') { startX = from.x; startY = from.y - fromRadius - fromGap }
       else if (line.fromPort === 'bottom') { startX = from.x; startY = from.y + fromRadius + fromGap }
       else if (line.fromPort === 'left') { startX = from.x - fromRadius - fromGap; startY = from.y }

       const minChildX = getMinChildX(from.id)
       const totalDx = Math.max(0, minChildX - startX)

       const mainStemLen = Math.max(120, totalDx * 0.25)
       const bundleStemLen = Math.max(160, totalDx * 0.35) + (line.bundleStemX || 0)

       const verticalSpread = 100
       const bundleYOffset = (totalBundles > 1 ? (bundleIndex - (totalBundles - 1) / 2) * verticalSpread : 0) + (line.bundleStemY || 0)

       return {
         x: startX + mainStemLen + bundleStemLen,
         y: startY + bundleYOffset
       }
    }

    const fromRadius = (from.type === 'scaling-entry' || from.type === 'step') ? 28 : 56
    const fromGap = (from.type === 'scaling-entry' || from.type === 'step') ? 2 : 6
    let startX = from.x + fromRadius + fromGap
    let startY = from.y
    if (line.fromPort === 'top') { startX = from.x; startY = from.y - fromRadius - fromGap }
    else if (line.fromPort === 'bottom') { startX = from.x; startY = from.y + fromRadius + fromGap }
    else if (line.fromPort === 'left') { startX = from.x - fromRadius - fromGap; startY = from.y }

    const toRadius = (to.type === 'scaling-entry' || to.type === 'step') ? 28 : 56
    const toGap = (to.type === 'scaling-entry' || to.type === 'step') ? 2 : 6
    let endX = to.x - toRadius - toGap
    let endY = to.y
    if (line.toPort === 'top') { endX = to.x; endY = to.y - toRadius - toGap }
    else if (line.toPort === 'bottom') { endX = to.x; endY = to.y + toRadius + toGap }
    else if (line.toPort === 'right') { endX = to.x + toRadius + toGap; endY = to.y }

    return {
      x: (startX + endX) / 2,
      y: (startY + endY) / 2
    }
  }

  function shouldShowLabel(line: Connection) {
    if (!line.label || !line.bundleId) return true
    const siblings = state.connections.value.filter(c => c.fromId === line.fromId && c.bundleId === line.bundleId)
    return siblings[0] === line
  }

  function handleLabelDrag(e: MouseEvent, line: Connection) {
    if (!line.bundleId) return

    const startX = e.clientX
    const startY = e.clientY

    const bundleConns = state.connections.value.filter(c => c.fromId === line.fromId && c.bundleId === line.bundleId)
    const initialStemX = line.bundleStemX || 0
    const initialStemY = line.bundleStemY || 0

    const move = (mE: MouseEvent) => {
      const deltaX = (mE.clientX - startX) / state.viewState.value.scale
      const deltaY = (mE.clientY - startY) / state.viewState.value.scale

      bundleConns.forEach(c => {
        c.bundleStemX = initialStemX + deltaX
        c.bundleStemY = initialStemY + deltaY
      })
    }

    const stop = () => {
      state.saveMatrixData()
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', stop)
    }

    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', stop)
  }

  function isNeonHighlight(line: Connection) {
    const label = line.label?.toLowerCase()
    if (label === 'if') {
      return state.connections.value.some(c =>
        c.fromId === line.toId &&
        c.label?.toLowerCase() === 'therefore'
      )
    }
    if (label === 'therefore') {
      return state.connections.value.some(c =>
        c.toId === line.fromId &&
        c.label?.toLowerCase() === 'if'
      )
    }
    return false
  }

  return {
    getMainStemPath,
    getBundleStemPath,
    getBranchPath,
    createRootPath,
    getConnectionMidpoint,
    shouldShowLabel,
    handleLabelDrag,
    isNeonHighlight,
    createCurvedPath
  }
}
