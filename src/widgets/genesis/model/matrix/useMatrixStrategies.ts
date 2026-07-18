export interface MatrixStrategyProfile {
  id: string
  name: string
  boardName?: string
  boardId?: string
  targetRR?: number
  initialDeposit?: number
}

export function isStrategyNode(node: any) {
  return node?.type === 'strategy' || node?.type === 'system'
}

export function getMatrixStrategyName(node: any) {
  return String(
    node?.params?.customName ||
    node?.params?.identityName ||
    node?.strategyData?.name ||
    node?.label ||
    node?.id ||
    'Untitled Strategy'
  )
}

export function flattenMatrixNodes(nodes: any[] = []) {
  const list: any[] = []
  const walk = (items: any[] = []) => {
    items.forEach((node: any) => {
      list.push(node)
      if (node.subGraph?.nodes) walk(node.subGraph.nodes)
    })
  }
  walk(nodes)
  return list
}

export function flattenMatrixConnections(nodes: any[] = [], rootConnections: any[] = []) {
  const list: any[] = [...(rootConnections || [])]
  const walk = (items: any[] = []) => {
    items.forEach((node: any) => {
      if (!node.subGraph) return
      list.push(...(node.subGraph.connections || []))
      walk(node.subGraph.nodes || [])
    })
  }
  walk(nodes)
  return list
}

function getMatrixPages(data: any) {
  if (Array.isArray(data?.pages) && data.pages.length > 0) {
    return data.pages
  }

  return [{
    id: 'genesis-matrix-main',
    name: 'Genesis Matrix',
    nodes: data?.nodes || [],
    connections: data?.connections || [],
    zones: data?.zones || []
  }]
}

function getRiskValue(riskNode: any, key: string, fallbackKey: string) {
  const params = riskNode?.params || {}
  const riskData = riskNode?.riskData || {}
  return params[key] ?? riskData[fallbackKey]
}

export function getMatrixStrategiesForTradeStore(nodes: any[] = []) {
  return flattenMatrixNodes(nodes)
    .filter(isStrategyNode)
    .map((node: any) => ({
      id: node.id,
      name: getMatrixStrategyName(node).toUpperCase()
    }))
}

export function getMatrixStrategyOptions(data: any): MatrixStrategyProfile[] {
  const strategies: MatrixStrategyProfile[] = []

  getMatrixPages(data).forEach((page: any, pageIndex: number) => {
    const pageNodes = page.nodes || []
    const allNodes = flattenMatrixNodes(pageNodes)
    const allConnections = flattenMatrixConnections(pageNodes, page.connections || [])
    const pageName = page.name || `Strategy Page ${pageIndex + 1}`

    allNodes.filter(isStrategyNode).forEach((strategyNode: any) => {
      const connectedIds = allConnections
        .filter((connection: any) => connection.fromId === strategyNode.id || connection.toId === strategyNode.id)
        .map((connection: any) => connection.fromId === strategyNode.id ? connection.toId : connection.fromId)

      const riskNode = allNodes.find((node: any) => (
        (node.type === 'risk' || node.type === 'risk_management') &&
        connectedIds.includes(node.id)
      ))

      strategies.push({
        id: strategyNode.id,
        name: getMatrixStrategyName(strategyNode),
        boardName: pageName,
        boardId: page.id || `genesis-matrix-page-${pageIndex + 1}`,
        targetRR: Number(getRiskValue(riskNode, 'riskRR', 'targetRR') || 0),
        initialDeposit: getRiskValue(riskNode, 'initialDeposit', 'initialDeposit')
      })
    })
  })

  return strategies
}
