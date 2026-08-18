import { useI18n } from '~/shared/i18n/useI18n'
import type { useMatrixState, Connection, Point, Node } from './useMatrixState'

export function usePathMath(state: ReturnType<typeof useMatrixState>) {
  const { locale, t } = useI18n()

  function getNodePortPoint(node: Node, port: string = 'left') {
    const radius = (node.type === 'scaling-entry' || node.type === 'step') ? 28 : 56
    const gap = (node.type === 'scaling-entry' || node.type === 'step') ? 2 : 6
    const offset = radius + gap

    if (port === 'top') return { x: node.x, y: node.y - offset }
    if (port === 'bottom') return { x: node.x, y: node.y + offset }
    if (port === 'right') return { x: node.x + offset, y: node.y }
    return { x: node.x - offset, y: node.y }
  }

  function getConnectionStartPoint(node: Node, line?: Connection | null) {
    return getNodePortPoint(node, line?.fromPort || 'right')
  }

  function getBundleReferenceConnection(fromId: string, bundleId?: string) {
    if (!bundleId) {
      return state.connections.value.find(c => c.fromId === fromId && c.bundleId)
    }

    const bundleConnections = state.connections.value.filter(c => c.fromId === fromId && c.bundleId === bundleId)
    return bundleConnections.find(c => c.fromPort) || bundleConnections[0]
  }

  function getBundleAxis(port: string = 'right') {
    if (port === 'bottom') return { primary: 'y' as const, secondary: 'x' as const, sign: 1 }
    if (port === 'top') return { primary: 'y' as const, secondary: 'x' as const, sign: -1 }
    if (port === 'left') return { primary: 'x' as const, secondary: 'y' as const, sign: -1 }
    return { primary: 'x' as const, secondary: 'y' as const, sign: 1 }
  }

  function movePoint(point: Point, axis: ReturnType<typeof getBundleAxis>, primaryDistance: number, secondaryDistance = 0) {
    return {
      x: point.x + (axis.primary === 'x' ? axis.sign * primaryDistance : 0) + (axis.secondary === 'x' ? secondaryDistance : 0),
      y: point.y + (axis.primary === 'y' ? axis.sign * primaryDistance : 0) + (axis.secondary === 'y' ? secondaryDistance : 0)
    }
  }

  function getBundleForwardDistance(fromId: string, startPoint: Point, axis: ReturnType<typeof getBundleAxis>) {
    const bundleConnections = state.connections.value.filter(c => c.fromId === fromId && c.bundleId)
    const endpointValues = bundleConnections
      .map(connection => {
        const to = state.getNode(connection.toId)
        if (!to) return null
        const point = getNodePortPoint(to, connection.toPort || 'left')
        return axis.primary === 'x' ? point.x : point.y
      })
      .filter((value): value is number => typeof value === 'number')

    if (!endpointValues.length) return 362

    const startValue = axis.primary === 'x' ? startPoint.x : startPoint.y
    const targetValue = axis.sign > 0 ? Math.min(...endpointValues) : Math.max(...endpointValues)
    return Math.max(0, axis.sign > 0 ? targetValue - startValue : startValue - targetValue)
  }

  function getBundleLayout(fromId: string, bundleId: string | undefined, line?: Connection | null) {
    const from = state.getNode(fromId)
    if (!from) return null

    const refConn = getBundleReferenceConnection(fromId, bundleId) || line
    const axis = getBundleAxis(refConn?.fromPort || 'right')
    const startPoint = getConnectionStartPoint(from, refConn)
    const totalForwardDistance = getBundleForwardDistance(fromId, startPoint, axis)
    const verticalCompactFactor = axis.primary === 'y' ? 2 / 3 : 1
    const mainStemLen = Math.max(120, totalForwardDistance * 0.25) * verticalCompactFactor
    const primaryDrag = axis.primary === 'x'
      ? axis.sign * (refConn?.bundleStemX || 0)
      : axis.sign * (refConn?.bundleStemY || 0)
    const bundleStemLen = Math.max(80, Math.max(160, totalForwardDistance * 0.35) * verticalCompactFactor + primaryDrag)

    const parentBundles = [...new Set(state.connections.value.filter(c => c.fromId === fromId && c.bundleId).map(c => c.bundleId))]
    const bundleIndex = bundleId ? parentBundles.indexOf(bundleId) : 0
    const totalBundles = parentBundles.length
    const spread = 100
    const bundleSpreadOffset = totalBundles > 1 ? (bundleIndex - (totalBundles - 1) / 2) * spread : 0
    const secondaryDrag = axis.secondary === 'x'
      ? (refConn?.bundleStemX || 0)
      : (refConn?.bundleStemY || 0)
    const bundleOffset = bundleSpreadOffset + secondaryDrag

    const j1 = movePoint(startPoint, axis, mainStemLen)
    const j2 = movePoint(j1, axis, bundleStemLen, bundleOffset)

    return { axis, startPoint, j1, j2 }
  }

  function createBundleStemCurve(layout: NonNullable<ReturnType<typeof getBundleLayout>>) {
    const primaryDelta = layout.axis.primary === 'x'
      ? Math.abs(layout.j2.x - layout.j1.x)
      : Math.abs(layout.j2.y - layout.j1.y)
    const halfway = Math.max(1, primaryDelta * 0.5)
    const cp1 = movePoint(layout.j1, layout.axis, halfway)
    const cp2 = movePoint(layout.j1, layout.axis, halfway, layout.axis.secondary === 'x' ? layout.j2.x - layout.j1.x : layout.j2.y - layout.j1.y)

    return `C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${layout.j2.x} ${layout.j2.y}`
  }

  function createBundleBranchCurve(layout: NonNullable<ReturnType<typeof getBundleLayout>>, endPoint: Point) {
    if (layout.axis.primary === 'y') {
      const dy = endPoint.y - layout.j2.y
      const cpY = layout.j2.y + dy * 0.5
      return `C ${layout.j2.x} ${cpY}, ${endPoint.x} ${cpY}, ${endPoint.x} ${endPoint.y}`
    }

    const dx = endPoint.x - layout.j2.x
    const cpX = layout.j2.x + dx * 0.5
    return `C ${cpX} ${layout.j2.y}, ${cpX} ${endPoint.y}, ${endPoint.x} ${endPoint.y}`
  }

  function getConnectionEndPoint(line: Connection) {
    const to = state.getNode(line.toId)
    if (!to) return { x: 0, y: 0 }
    return getNodePortPoint(to, line.toPort || 'left')
  }

  function getMainStemPath(fromId: string, bundleId?: string) {
    const layout = getBundleLayout(fromId, bundleId)
    if (!layout) return ""
    
    return `M ${layout.startPoint.x} ${layout.startPoint.y} L ${layout.j1.x} ${layout.j1.y}`
  }

  function getBundleStemPath(fromId: string, bundleId: string) {
    const layout = getBundleLayout(fromId, bundleId)
    if (!layout) return ""
    
    return `M ${layout.j1.x} ${layout.j1.y} ${createBundleStemCurve(layout)}`
  }

  function getBranchPath(line: Connection) {
    const from = state.getNode(line.fromId)
    const to = state.getNode(line.toId)
    if (!from || !to) return ""
    const layout = getBundleLayout(line.fromId, line.bundleId, line)
    if (!layout) return ""
    const endPoint = getNodePortPoint(to, line.toPort || 'left')
    
    return `M ${layout.j2.x} ${layout.j2.y} ${createBundleBranchCurve(layout, endPoint)}`
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
    
    const startPoint = getNodePortPoint(from, conn?.fromPort || 'right')
    const endPoint = getNodePortPoint(to, conn?.toPort || 'left')

    if (conn?.bundleId) {
       const layout = getBundleLayout(fromId, conn.bundleId, conn)
       if (!layout) return ""

       return `M ${layout.startPoint.x} ${layout.startPoint.y} L ${layout.j1.x} ${layout.j1.y} ${createBundleStemCurve(layout)} ${createBundleBranchCurve(layout, endPoint)}`
    }

    return createCurvedPath(startPoint, endPoint, conn?.fromPort || 'right', conn?.toPort || 'left')
  }

  function getConnectionMidpoint(line: Connection) {
    const from = state.getNode(line.fromId)
    const to = state.getNode(line.toId)
    if (!from || !to) return { x: 0, y: 0 }
    
    if (line.bundleId) {
       const layout = getBundleLayout(from.id, line.bundleId, line)
       if (!layout) return { x: 0, y: 0 }
       
       return { x: layout.j2.x, y: layout.j2.y }
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
    if (!state.getNode(line.fromId) || !state.getNode(line.toId)) return false
    if (!line.label || !line.bundleId) return true
    const siblings = state.connections.value.filter(c =>
      c.fromId === line.fromId &&
      c.bundleId === line.bundleId &&
      state.getNode(c.fromId) &&
      state.getNode(c.toId)
    )
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

  return {
    getMainStemPath,
    getBundleStemPath,
    getBranchPath,
    getConnectionEndPoint,
    createRootPath,
    getConnectionMidpoint,
    shouldShowLabel,
    handleLabelDrag,
    createCurvedPath
  }
}
