import type { AssetNode } from './assetGraph'

export interface NetworkMotion {
  detail: number
  time: number
  offset: { x: number; y: number }
  focused: string | null
  reducedMotion: boolean
}

export const visibleRadius = (node: AssetNode) => node.radius

export function parentConnections(nodes: AssetNode[]) {
  const parents = nodes.filter(node => node.kind === 'asset')
  const pairs: { source: AssetNode; target: AssetNode }[] = []
  const seen = new Set<string>()
  for (const source of parents) {
    const neighbors = parents.filter(node => node !== source).sort((a, b) =>
      Math.hypot(a.homeX - source.homeX, a.homeY - source.homeY) - Math.hypot(b.homeX - source.homeX, b.homeY - source.homeY)).slice(0, 2)
    for (const target of neighbors) {
      const key = JSON.stringify([source.id, target.id].sort())
      if (seen.has(key)) continue
      seen.add(key)
      pairs.push({ source, target })
    }
  }
  return pairs
}

/** D3 force: damped springs and coherent drift. */
export function createNetworkForce(motion: NetworkMotion) {
  let nodes: AssetNode[] = []
  let parents = new Map<string, AssetNode>()
  let connections: ReturnType<typeof parentConnections> = []
  const force = () => {
    for (const node of nodes) {
      if (node.kind !== 'asset') continue
      node.revealVelocity = 0
      node.reveal = 1
    }
    for (const node of nodes) {
      const parent = node.parentId ? parents.get(node.parentId) : undefined
      if (parent) node.reveal = parent.reveal
      const expansion = 1
      const drift = motion.reducedMotion ? 0 : Math.sin(motion.time * 0.00035 + node.phase) * 7
      const driftY = motion.reducedMotion ? 0 : Math.cos(motion.time * 0.00028 + node.phase) * 7
      const targetX = parent ? parent.x + node.offsetX * expansion : node.homeX * (0.56 + expansion * 0.44) + motion.offset.x
      const targetY = parent ? parent.y + node.offsetY * expansion : node.homeY * (0.56 + expansion * 0.44) + motion.offset.y
      if (parent && expansion < 0.015) {
        node.x = parent.x
        node.y = parent.y
        node.vx = parent.vx ?? 0
        node.vy = parent.vy ?? 0
        continue
      }
      const spring = parent ? 0.042 : 0.018
      node.vx = (node.vx ?? 0) + (targetX + drift - node.x) * spring
      node.vy = (node.vy ?? 0) + (targetY + driftY - node.y) * spring
    }
    // Neighbour springs carry local displacement through the parent network.
    for (const { source, target } of connections) {
      const dx = target.x - source.x
      const dy = target.y - source.y
      const distance = Math.max(1, Math.hypot(dx, dy))
      const rest = Math.hypot(target.homeX - source.homeX, target.homeY - source.homeY) * (0.56 + Math.max(0, source.reveal) * 0.44)
      const tension = (distance - rest) * 0.008 / distance
      source.vx = (source.vx ?? 0) + dx * tension
      source.vy = (source.vy ?? 0) + dy * tension
      target.vx = (target.vx ?? 0) - dx * tension
      target.vy = (target.vy ?? 0) - dy * tension
    }
  }
  force.initialize = (next: AssetNode[]) => {
    nodes = next
    parents = new Map(nodes.filter(node => node.kind === 'asset').map(node => [node.id, node]))
    connections = parentConnections(nodes)
  }
  return force
}
