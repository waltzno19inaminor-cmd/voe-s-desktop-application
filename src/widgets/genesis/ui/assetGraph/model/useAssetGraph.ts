import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type ForceGraph from 'force-graph'
import { buildAssetGraph, type AssetNode } from './assetGraph'
import { createNetworkForce, visibleRadius, type NetworkMotion } from './assetPhysics'
import { createNetworkRenderer } from './assetRenderer'

export interface AssetGraphProps {
  trades: Record<string, any>[]
  initialDeposit: number
  locale: string
  isDark?: boolean
}

export interface AssetGraphCallbacks {
  onTradeClick?: (payload: { tradeId: string; event?: MouseEvent }) => void
}

export function useAssetGraph(props: AssetGraphProps, callbacks: AssetGraphCallbacks = {}) {
  const surface = ref<{ element: HTMLDivElement | null } | null>(null)
  const data = computed(() => buildAssetGraph(props.trades, props.initialDeposit))
  const hasTrades = computed(() => data.value.tradeCount > 0)
  let graph: ForceGraph<AssetNode> | undefined
  let observer: ResizeObserver | undefined
  let disposed = false
  let overviewScale = 1
  let cleanup = () => {}
  let nodeWasDragged = false
  const motion: NetworkMotion = { detail: 0, time: 0, offset: { x: 0, y: 0 }, focused: null, reducedMotion: false }
  const renderer = createNetworkRenderer(motion, () => props.isDark !== false, () => props.locale)
  let bounds = { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity }
  const reset = () => {
    if (!graph) return
    overviewScale = Math.min(1.5, Math.max(0.01, (Math.min(graph.width(), graph.height()) - 130) / (data.value.extent * 1.35)))
    graph.minZoom(overviewScale * 0.4).maxZoom(Math.max(8, overviewScale * 8))
    const duration = motion.reducedMotion ? 0 : 700
    graph.centerAt(motion.offset.x, motion.offset.y, duration).zoom(overviewScale, duration)
  }
  const update = () => {
    if (!graph) return
    const previous = new Map(graph.graphData().nodes.map(node => [node.id, node]))
    const parents = new Map(data.value.nodes.filter(node => node.kind === 'asset').map(node => [node.id, node]))
    const nodes = data.value.nodes.map(node => {
      const old = previous.get(node.id)
      const parent = node.parentId ? parents.get(node.parentId) : undefined
      return {
        ...node,
        x: old?.x ?? (parent ? parent.homeX * 0.56 + node.offsetX : node.homeX * 0.56),
        y: old?.y ?? (parent ? parent.homeY * 0.56 + node.offsetY : node.homeY * 0.56),
        vx: old?.vx ?? 0,
        vy: old?.vy ?? 0,
        reveal: 1,
      }
    })
    renderer.update(nodes)
    graph.graphData({ nodes, links: [] })
    reset()
  }
  onMounted(async () => {
    try {
      const [{ default: ForceGraph }, { forceCollide }] = await Promise.all([import('force-graph'), import('d3-force-3d')])
      const element = surface.value?.element
      if (disposed || !element) return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
      motion.reducedMotion = reduced.matches
      const collision = forceCollide().strength(0.85).iterations(2)
      const network = createNetworkForce(motion)
      let simulationNodes: AssetNode[] = []
      const pointerOverNode = (event: MouseEvent) => {
        if (!graph) return false
        const rect = element.getBoundingClientRect()
        const point = graph.screen2GraphCoords(event.clientX - rect.left, event.clientY - rect.top)
        return graph.graphData().nodes.some(node => Math.hypot(node.x - point.x, node.y - point.y) <= visibleRadius(node))
      }
      const collide = () => {
        const visible = simulationNodes.filter(node => node.kind === 'asset' || node.reveal > 0.5)
        collision.initialize(visible)
        collision.radius((node: AssetNode) => visibleRadius(node) + 5)
        collision()
      }
      collide.initialize = (nodes: AssetNode[]) => { simulationNodes = nodes }
      graph = new ForceGraph<AssetNode>(element)
        .backgroundColor('rgba(0,0,0,0)')
        .enableNodeDrag(true)
        .enablePanInteraction(event => !pointerOverNode(event))
        .enablePointerInteraction(true)
        .nodeLabel('')
        .nodeVal(node => (visibleRadius(node) / 4) ** 2)
        .nodeVisibility(() => true)
        .nodePointerAreaPaint((node, color, ctx) => {
          const radius = visibleRadius(node)
          if (radius < 1) return
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
          ctx.fill()
        })
        .linkVisibility(false)
        .d3Force('center', null)
        .d3Force('charge', null)
        .d3Force('link', null)
        .d3Force('network', network)
        .d3Force('collision', collide)
        .d3VelocityDecay(0.26)
        .d3AlphaDecay(0)
        .cooldownTime(Infinity)
        .cooldownTicks(motion.reducedMotion ? 150 : Infinity)
        .onNodeHover(node => { motion.focused = node?.id ?? null })
        .onNodeDrag((node, translate) => {
          if (!graph) return
          nodeWasDragged = true
          motion.offset.x += translate.x
          motion.offset.y += translate.y
          for (const candidate of graph.graphData().nodes) {
            if (candidate === node) continue
            candidate.x += translate.x
            candidate.y += translate.y
            candidate.fx = candidate.x
            candidate.fy = candidate.y
          }
        })
        .onNodeDragEnd(() => {
          graph?.graphData().nodes.forEach(node => {
            node.fx = undefined
            node.fy = undefined
          })
        })
        .onNodeClick((node, event) => {
          if (nodeWasDragged) {
            nodeWasDragged = false
            return
          }
          if (!graph) return
          if (node.kind === 'trade' && node.tradeId) {
            callbacks.onTradeClick?.({ tradeId: node.tradeId, event })
            return
          }
          const parent = node.parentId ? graph.graphData().nodes.find(candidate => candidate.id === node.parentId) : node
          if (!parent) return
          const duration = motion.reducedMotion ? 0 : 900
          graph.centerAt(parent.homeX, parent.homeY, duration).zoom(Math.max(overviewScale * 2.2, 1.7), duration)
        })
        .onBackgroundClick(() => {
          if (nodeWasDragged) {
            nodeWasDragged = false
            return
          }
          reset()
        })
        .onZoom(({ k }) => {
          motion.detail = Math.max(0, Math.min(1, (k / overviewScale - 1.15) / 0.8))
          if (motion.reducedMotion) graph?.d3ReheatSimulation()
        })
        .onRenderFramePre((ctx, scale) => {
          if (!graph) return
          motion.time = performance.now()
          const start = graph.screen2GraphCoords(0, 0)
          const end = graph.screen2GraphCoords(graph.width(), graph.height())
          bounds = { left: start.x, top: start.y, right: end.x, bottom: end.y }
          renderer.paintLinks(ctx, scale)
        })
        .nodeCanvasObject((node, ctx, scale) => {
          if (node.x + node.radius * 1.5 < bounds.left || node.x - node.radius * 1.5 > bounds.right ||
              node.y + node.radius * 1.5 < bounds.top || node.y - node.radius * 1.5 > bounds.bottom) return
          renderer.paintNode(node, ctx, scale)
        })
      const resize = () => {
        if (!element.clientWidth || !element.clientHeight) return
        graph?.width(element.clientWidth).height(element.clientHeight)
        reset()
      }
      observer = new ResizeObserver(resize)
      observer.observe(element)
      const pointerLeave = () => { motion.focused = null }
      const visibilityChange = () => {
        if (document.hidden) graph?.pauseAnimation()
        else graph?.resumeAnimation()
      }
      const preferenceChange = () => {
        motion.reducedMotion = reduced.matches
        graph?.cooldownTicks(reduced.matches ? 150 : Infinity).d3ReheatSimulation()
      }
      element.addEventListener('pointerleave', pointerLeave)
      document.addEventListener('visibilitychange', visibilityChange)
      reduced.addEventListener('change', preferenceChange)
      cleanup = () => {
        element.removeEventListener('pointerleave', pointerLeave)
        document.removeEventListener('visibilitychange', visibilityChange)
        reduced.removeEventListener('change', preferenceChange)
      }
      resize()
      update()
      visibilityChange()
    } catch (cause) {
      if (disposed) return
      console.error('Asset graph initialization failed', cause)
    }
  })
  watch(data, update)
  onBeforeUnmount(() => {
    disposed = true
    cleanup()
    observer?.disconnect()
    graph?._destructor()
    graph = undefined
  })
  watch(() => props.isDark, () => graph?.d3ReheatSimulation())
  return { surface, hasTrades }
}
