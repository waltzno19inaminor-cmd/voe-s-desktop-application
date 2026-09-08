import type { LinkObject, NodeObject } from 'force-graph'
import { layoutAssetClusters, layoutTradeNodes } from './assetLayout'
import { getTradeReturnPct, hasFiniteTradePnl, isClosedTradeForMetrics } from '../../../model/tradePnl'

export interface AssetNode extends NodeObject {
  id: string
  kind: 'asset' | 'trade'
  label: string
  radius: number
  fill: string
  text: string
  x: number
  y: number
  homeX: number
  homeY: number
  parentId?: string
  offsetX: number
  offsetY: number
  reveal: number
  revealVelocity: number
  phase: number
  loss: boolean
}

export interface AssetGraphData {
  nodes: AssetNode[]
  links: LinkObject<AssetNode>[]
  extent: number
  assetCount: number
  tradeCount: number
}

const blend = (from: number[], to: number[], amount: number) =>
  `rgb(${from.map((value, index) => Math.round(value + (to[index]! - value) * amount)).join(',')})`

export function buildAssetGraph(trades: Record<string, any>[], initialDeposit: number): AssetGraphData {
  const groups = new Map<string, { id: string; percent: number }[]>()
  trades.forEach((trade, index) => {
    if (!isClosedTradeForMetrics(trade) || !hasFiniteTradePnl(trade)) return
    const percent = getTradeReturnPct(trade, trade.capitalBeforeTrade ?? initialDeposit, initialDeposit)
    if (percent === null || !Number.isFinite(percent)) return
    const asset = String(trade.asset || '—').trim().toUpperCase() || '—'
    if (!groups.has(asset)) groups.set(asset, [])
    groups.get(asset)!.push({ id: `${trade.id ?? index}:${index}`, percent })
  })
  const entries = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  const childLayouts = entries.map(([asset, children]) => layoutTradeNodes(asset, children.length))
  const layout = layoutAssetClusters(entries.map(([asset], index) => ({
    key: asset,
    radius: childLayouts[index]!.extent,
  })))
  const nodes: AssetNode[] = []
  const links: LinkObject<AssetNode>[] = []
  entries.forEach(([asset, children], assetIndex) => {
    const { x, y } = layout.positions[assetIndex]!
    const parentId = `asset:${asset}`
    nodes.push({ id: parentId, kind: 'asset', label: asset, radius: 42, fill: '#eeeeee', text: '#171717', homeX: x, homeY: y, x, y, offsetX: 0, offsetY: 0, reveal: 0, revealVelocity: 0, phase: assetIndex * 2.399, loss: false })
    const min = children.reduce((value, child) => Math.min(value, child.percent), Infinity)
    const max = children.reduce((value, child) => Math.max(value, child.percent), -Infinity)
    children.forEach((child, index) => {
      const strength = child.percent < 0 ? child.percent / Math.min(min, -0.00001) : child.percent / Math.max(max, 0.00001)
      const extreme = child.percent !== 0 && (child.percent === min || child.percent === max)
      const offset = childLayouts[assetIndex]!.positions[index]!
      const cx = x + offset.x
      const cy = y + offset.y
      const id = `trade:${parentId}:${child.id}`
      const rounded = Math.round(child.percent * 100) / 100
      nodes.push({
        id, kind: 'trade', label: `${rounded > 0 ? '+' : ''}${rounded}%`,
        radius: extreme ? 25 : 12 + Math.sqrt(Math.abs(strength)) * 10,
        fill: child.percent < 0 ? blend([104, 66, 66], [245, 48, 66], strength) : blend([125, 125, 125], [255, 255, 255], strength),
        text: child.percent < 0 ? '#ffffff' : '#171717', homeX: cx, homeY: cy, x: cx, y: cy,
        parentId, offsetX: offset.x, offsetY: offset.y, reveal: 0, revealVelocity: 0, phase: index * 2.399 + assetIndex, loss: child.percent < 0,
      })
      links.push({ source: parentId, target: id })
    })
  })
  return { nodes, links, extent: layout.extent, assetCount: entries.length, tradeCount: links.length }
}
