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
  tradeId?: string
  hoverDetails?: { direction: 'LONG' | 'SHORT' | '—'; size: string; dates: string }
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

// The square-root scale keeps a very active asset prominent without letting it
// dominate the whole network. The resulting radii are 1.5x smaller than the
// previous scale: one, four and nine trades produce 26.7, 34.7 and 42.7px.
const assetRadius = (tradeCount: number) => Math.min(88, 28 + Math.sqrt(Math.max(1, tradeCount)) * 12) / 1.5

const parentFill = (pnl: number, minPnl: number, maxPnl: number) => {
  // Zero is the colour boundary. A positive aggregate result never enters the
  // red range simply because another asset made more profit.
  const neutral = [255, 220, 224]
  if (pnl < 0) return blend(neutral, [245, 48, 66], Math.min(1, pnl / Math.min(minPnl, -0.00001)))
  if (pnl > 0) return blend(neutral, [255, 255, 255], Math.min(1, pnl / Math.max(maxPnl, 0.00001)))
  return `rgb(${neutral.join(',')})`
}

const formatPositionSize = (trade: Record<string, any>) => {
  const size = Number(trade.size ?? trade.positionSize)
  return Number.isFinite(size) && size > 0
    ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(size)
    : '—'
}

const formatTradeDate = (raw: unknown) => {
  if (raw === null || raw === undefined || raw === '') return '—'
  const firestoreDate = raw as { toDate?: () => Date }
  const date = typeof firestoreDate.toDate === 'function' ? firestoreDate.toDate() : new Date(raw as string | number | Date)
  return Number.isFinite(date?.getTime())
    ? date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'
}

const formatTradeDates = (trade: Record<string, any>) => {
  const entry = formatTradeDate(trade.date ?? trade.entryTime)
  const exit = formatTradeDate(trade.dateExit ?? trade.exitTime)
  return `${entry} / ${exit}`
}

const getTradeDirection = (trade: Record<string, any>): 'LONG' | 'SHORT' | '—' => {
  const direction = String(trade.side ?? trade.direction ?? '').trim().toUpperCase()
  if (direction.includes('SHORT') || direction.includes('SELL')) return 'SHORT'
  if (direction.includes('LONG') || direction.includes('BUY')) return 'LONG'
  return '—'
}

export function buildAssetGraph(trades: Record<string, any>[], initialDeposit: number): AssetGraphData {
  const groups = new Map<string, { id: string; tradeId: string; percent: number; hoverDetails: AssetNode['hoverDetails'] }[]>()
  trades.forEach((trade, index) => {
    if (!isClosedTradeForMetrics(trade) || !hasFiniteTradePnl(trade)) return
    const percent = getTradeReturnPct(trade, trade.capitalBeforeTrade ?? initialDeposit, initialDeposit)
    if (percent === null || !Number.isFinite(percent)) return
    const asset = String(trade.asset || '—').trim().toUpperCase() || '—'
    if (!groups.has(asset)) groups.set(asset, [])
    groups.get(asset)!.push({
      id: `${trade.id ?? index}:${index}`,
      tradeId: String(trade.id ?? index),
      percent,
      hoverDetails: {
        direction: getTradeDirection(trade),
        size: formatPositionSize(trade),
        dates: formatTradeDates(trade),
      },
    })
  })
  const entries = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  const assets = entries.map(([asset, children]) => ({
    asset,
    children,
    radius: assetRadius(children.length),
    // Every child has a finite result at this point. Summing those results
    // makes the parent colour match the combined outcome of its own trades.
    pnl: children.reduce((total, child) => total + child.percent, 0),
  }))
  const minPnl = Math.min(...assets.map(asset => asset.pnl))
  const maxPnl = Math.max(...assets.map(asset => asset.pnl))
  const childLayouts = assets.map(({ asset, children, radius }) => layoutTradeNodes(asset, children.length, radius))
  const layout = layoutAssetClusters(assets.map(({ asset }, index) => ({
    key: asset,
    radius: childLayouts[index]!.extent,
  })))
  const nodes: AssetNode[] = []
  const links: LinkObject<AssetNode>[] = []
  assets.forEach(({ asset, children, radius, pnl }, assetIndex) => {
    const { x, y } = layout.positions[assetIndex]!
    const parentId = `asset:${asset}`
    nodes.push({ id: parentId, kind: 'asset', label: asset, radius, fill: parentFill(pnl, minPnl, maxPnl), text: '#171717', homeX: x, homeY: y, x, y, offsetX: 0, offsetY: 0, reveal: 0, revealVelocity: 0, phase: assetIndex * 2.399, loss: pnl < 0 })
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
        parentId, offsetX: offset.x, offsetY: offset.y, reveal: 0, revealVelocity: 0, phase: index * 2.399 + assetIndex, loss: child.percent < 0, tradeId: child.tradeId, hoverDetails: child.hoverDetails,
      })
      links.push({ source: parentId, target: id })
    })
  })
  return { nodes, links, extent: layout.extent, assetCount: entries.length, tradeCount: links.length }
}
