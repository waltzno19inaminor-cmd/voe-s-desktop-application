import assert from 'node:assert/strict'
import { buildAssetGraph } from './assetGraph'
import { createNetworkForce, visibleRadius, type NetworkMotion } from './assetPhysics'
import { createNetworkRenderer } from './assetRenderer'
import { forceSimulation, forceCollide } from 'd3-force-3d'
import { layoutAssetClusters, layoutTradeNodes } from './assetLayout'

const data = buildAssetGraph([
  ...[-4, 12, -1, 3, 0].map((profitInPercent, id) => ({ id, asset: 'aapl', profitInPercent })),
  { asset: 'AAPL', profitInPercent: 90, isClosed: false },
  { asset: 'AAPL' },
  { asset: 'MSFT', profitInCurrency: 100, capitalBeforeTrade: 2000 },
], 1000)
assert.equal(data.assetCount, 2)
assert.equal(data.tradeCount, 6)
const children = data.nodes.filter(node => node.kind === 'trade')
assert.equal(children[0]!.label, '-4%')
assert.equal(children[1]!.label, '+12%')
assert.equal(children[0]!.fill, 'rgb(245,48,66)')
assert.equal(children[1]!.fill, 'rgb(255,255,255)')
assert.equal(children[0]!.radius, children[1]!.radius)
assert.ok(children[0]!.radius > children[2]!.radius)
assert.ok(children.every(node => node.radius < 42))
assert.equal(children[5]!.label, '+5%')
assert.equal(buildAssetGraph([], 1000).nodes.length, 0)
// Hidden children must not issue canvas drawing calls at overview scale.
const motion: NetworkMotion = { detail: 0, time: 0, pointer: null, focused: null, reducedMotion: false }
createNetworkRenderer(motion, () => true).paintNode(children[0]!, new Proxy({} as CanvasRenderingContext2D, {
  get() { throw new Error('Hidden child was drawn') },
}), 0.5)
const dense = buildAssetGraph(Array.from({ length: 300 }, (_, id) => ({ id, asset: 'AAPL', profitInPercent: id % 2 ? 12 : -4 })), 1000)
for (let i = 0; i < dense.nodes.length; i++) {
  for (let j = i + 1; j < dense.nodes.length; j++) {
    const a = dense.nodes[i]!
    const b = dense.nodes[j]!
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > a.radius + b.radius, `Overlapping nodes: ${i}, ${j}`)
  }
}
assert.equal(new Set(dense.nodes.map(node => node.id)).size, dense.nodes.length)
const clusters = Array.from({ length: 24 }, (_, index) => ({ key: `ASSET${index}`, radius: index % 4 ? 130 : 220 }))
const layout = layoutAssetClusters(clusters)
assert.deepEqual(layout, layoutAssetClusters(clusters), 'Placement should remain stable on rebuild')
assert.ok(new Set(layout.positions.map(node => Math.round(Math.hypot(node.x, node.y)))).size > 12, 'Parents should occupy different distances from the center')
layout.positions.forEach((node, index) => {
  assert.ok(Math.abs(node.x) + node.radius <= layout.extent + 0.001)
  assert.ok(Math.abs(node.y) + node.radius <= layout.extent + 0.001)
  layout.positions.slice(index + 1).forEach(other => {
    assert.ok(Math.hypot(node.x - other.x, node.y - other.y) >= node.radius + other.radius + 11.999)
  })
})
assert.ok(layout.extent < 1200, 'Clusters should form a compact group')
const childLayout = layoutTradeNodes('AAPL', 300)
assert.deepEqual(childLayout, layoutTradeNodes('AAPL', 300), 'Zoom/rebuild must not shuffle children')
assert.notDeepEqual(childLayout.positions, layoutTradeNodes('MSFT', 300).positions, 'Assets must have different child arrangements')
assert.ok(new Set(childLayout.positions.map(node => Math.round(Math.hypot(node.x, node.y)))).size > 100, 'Children must not follow fixed rings')
childLayout.positions.forEach(node => {
  assert.ok(Math.hypot(node.x, node.y) >= 79 - 0.001, 'Children must clear their parent')
  assert.ok(Math.hypot(node.x, node.y) + 25 <= childLayout.extent + 0.001, 'Children must fit in the reserved cluster')
})
const moving = buildAssetGraph(Array.from({ length: 40 }, (_, id) => ({ id, asset: id < 20 ? 'AAPL' : 'MSFT', profitInPercent: id % 2 ? 12 : -4 })), 1000).nodes
const networkForce = createNetworkForce(motion)
const collision = forceCollide().strength(0.85).iterations(2)
const simulation = forceSimulation(moving, 2).stop().alphaDecay(0).velocityDecay(0.26).force('network', networkForce)
const tick = (count: number) => {
  for (let index = 0; index < count; index++) {
    motion.time += 16.67
    simulation.tick()
    collision.initialize(moving.filter(node => node.kind === 'asset' || node.reveal > 0.5))
    collision.radius((node: typeof moving[number]) => visibleRadius(node) + 5)
    collision()
  }
}
tick(120)
assert.ok(moving.filter(node => node.kind === 'trade').every(node => visibleRadius(node) < 0.01))
motion.detail = 1
tick(300)
assert.ok(moving.every(node => Number.isFinite(node.x) && Number.isFinite(node.y)))
assert.ok(moving.filter(node => node.kind === 'trade').every(node => visibleRadius(node) > 11))
assert.ok(moving.every(node => node.fx === undefined && node.fy === undefined), 'Physics nodes must not be pinned')
const first = moving[0]!
const before = { x: first.x, y: first.y }
motion.pointer = { x: first.x - 30, y: first.y }
tick(30)
assert.ok(Math.hypot(first.x - before.x, first.y - before.y) > 0.1, 'Network must react to pointer pressure')
motion.pointer = null
motion.detail = 0
tick(150)
assert.ok(moving.filter(node => node.kind === 'trade').every(node => visibleRadius(node) < 0.01), 'Children must retract on zoom out')
simulation.stop()
console.log('Asset graph layout and physics checks passed')
