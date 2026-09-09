import type { AssetNode } from './assetGraph'
import { parentConnections, visibleRadius, type NetworkMotion } from './assetPhysics'

// Cache the light/material once per colour, not once per node per frame.
export function createNetworkRenderer(motion: NetworkMotion, isDark: () => boolean, locale: () => string = () => 'en') {
  const materials = new Map<string, HTMLCanvasElement>()
  let nodesById = new Map<string, AssetNode>()
  let connections: { source: AssetNode; target: AssetNode; parent: boolean; phase: number }[] = []
  const material = (fill: string) => {
    if (materials.has(fill)) return materials.get(fill)!
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 192
    const ctx = canvas.getContext('2d')!
    const halo = ctx.createRadialGradient(96, 96, 60, 96, 96, 94)
    halo.addColorStop(0, 'rgba(180,180,180,0.09)')
    halo.addColorStop(1, 'rgba(180,180,180,0)')
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, 192, 192)
    ctx.beginPath()
    ctx.arc(96, 96, 64, 0, Math.PI * 2)
    ctx.fillStyle = fill
    ctx.fill()
    materials.set(fill, canvas)
    return canvas
  }
  const update = (nodes: AssetNode[]) => {
    materials.clear()
    nodesById = new Map(nodes.map(node => [node.id, node]))
    connections = nodes.filter(node => node.parentId).map((node, index) => ({ source: nodesById.get(node.parentId!)!, target: node, parent: false, phase: index * 0.618 }))
    for (const { source, target } of parentConnections(nodes)) {
      connections.push({ source, target, parent: true, phase: connections.length * 0.618 })
    }
  }
  const paintLinks = (ctx: CanvasRenderingContext2D, scale: number) => {
    ctx.save()
    const ink = isDark() ? '210,210,210' : '35,35,35'
    for (const link of connections) {
      const { source, target } = link
      if (!link.parent && target.reveal < 0.16) continue
      const dx = target.x - source.x
      const dy = target.y - source.y
      const length = Math.hypot(dx, dy)
      const startRadius = visibleRadius(source)
      const endRadius = visibleRadius(target)
      if (length <= startRadius + endRadius) continue
      const sx = source.x + dx / length * startRadius
      const sy = source.y + dy / length * startRadius
      const ex = target.x - dx / length * endRadius
      const ey = target.y - dy / length * endRadius
      const active = motion.focused === source.id || motion.focused === target.id
      const color = target.loss ? '210,57,63' : ink
      const dimmed = motion.focused !== null && !active
      ctx.strokeStyle = `rgba(${color},${dimmed ? 0.035 : active ? 0.48 : link.parent ? 0.17 : 0.12})`
      ctx.lineWidth = (active ? 0.85 : 0.55) / scale
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(ex, ey)
      ctx.stroke()
      // Sparse travelling signals make the network legible without visual noise.
      if (motion.reducedMotion || dimmed || (!link.parent && !active)) continue
      const progress = (motion.time * 0.00012 + link.phase) % 1
      const tail = Math.max(0, progress - 0.055)
      ctx.strokeStyle = `rgba(${color},0.7)`
      ctx.lineWidth = 1.25 / scale
      ctx.beginPath()
      ctx.moveTo(sx + (ex - sx) * tail, sy + (ey - sy) * tail)
      ctx.lineTo(sx + (ex - sx) * progress, sy + (ey - sy) * progress)
      ctx.stroke()
    }
    ctx.restore()
  }
  const paintNode = (node: AssetNode, ctx: CanvasRenderingContext2D, scale: number) => {
    const radius = visibleRadius(node)
    if (radius * scale < 0.8) return
    const focused = motion.focused === node.id
    ctx.save()
    if (motion.focused !== null && !focused) ctx.globalAlpha = 0.16
    ctx.drawImage(material(node.fill), node.x - radius * 1.5, node.y - radius * 1.5, radius * 3, radius * 3)
    if (node.kind !== 'trade' || (node.reveal >= 0.85 && radius * scale >= 11)) {
      ctx.fillStyle = node.text
      ctx.font = `${node.kind === 'asset' ? 500 : 400} ${node.kind === 'asset' ? 13 : 10}px "Outfit", "Helvetica Neue", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.label, node.x, node.y + 0.5, radius * 1.65)
    }
    ctx.restore()
    if (focused && node.hoverDetails) paintHoverDetails(node, radius, ctx)
  }
  const paintHoverDetails = (node: AssetNode, radius: number, ctx: CanvasRenderingContext2D) => {
    const direction = node.hoverDetails!.direction === '—'
      ? '—'
      : locale().toLowerCase().startsWith('ru')
        ? (node.hoverDetails!.direction === 'LONG' ? 'ЛОНГ' : 'ШОРТ')
        : node.hoverDetails!.direction
    const size = node.hoverDetails!.size === '—'
      ? '—'
      : `${node.hoverDetails!.size} ${locale().toLowerCase().startsWith('ru') ? 'лотов' : 'lots'}`
    const line = `${direction}  ·  ${size}  ·  ${node.hoverDetails!.dates}`
    ctx.save()
    ctx.font = '600 10px "Outfit", "Helvetica Neue", sans-serif'
    const width = ctx.measureText(line).width + 16
    const height = 28
    const x = node.x + radius + 12
    const y = node.y - height / 2
    ctx.fillStyle = isDark() ? 'rgba(12,12,12,0.88)' : 'rgba(255,255,255,0.92)'
    ctx.fillRect(x, y, width, height)
    ctx.fillStyle = isDark() ? '#f5f5f5' : '#171717'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(line, x + 8, y + height / 2)
    ctx.restore()
  }
  return { update, paintLinks, paintNode }
}
