import { ref, computed, type Ref } from 'vue'

export type MatrixChangeType = 'add' | 'delete' | 'connect' | 'version' | 'clear' | 'update'

export type MatrixChangeEvent = {
  id: string
  type: MatrixChangeType
  title: string
  node: string
  createdAt: number
  targetId?: string
  targetKind?: 'node' | 'connection' | 'board' | 'version' | 'domain'
  subchanges: any[]
}

type MatrixChangeContainer = MatrixChangeEvent | {
  id: string
  label: string
  value: string
  targetId?: string
  subchanges: any[]
}

// Global dictionary to store events and disabled changes per page
const eventsByPage = ref<Record<string, MatrixChangeEvent[]>>({})
const disabledChangesByPage = ref<Record<string, Set<string>>>({})

const RESOURCE_GROUP_ID = 'instruments-domains'

export function useMatrixChangeTree(activePageId?: Ref<string | null>) {
  const events = computed({
    get: () => {
      const id = activePageId?.value || 'default'
      if (!eventsByPage.value[id]) {
        eventsByPage.value[id] = []
      }
      return eventsByPage.value[id]
    },
    set: (val) => {
      const id = activePageId?.value || 'default'
      eventsByPage.value[id] = val
    }
  })

  const disabledChanges = computed({
    get: () => {
      const id = activePageId?.value || 'default'
      if (!disabledChangesByPage.value[id]) {
        disabledChangesByPage.value[id] = new Set<string>()
      }
      return disabledChangesByPage.value[id]
    },
    set: (val) => {
      const id = activePageId?.value || 'default'
      disabledChangesByPage.value[id] = val
    }
  })
  function changeId(prefix = 'chg') {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5)
  }

  function nodeDisplayValue(node: any) {
    return node.params?.customName || node.params?.identityName || node.label || node.id
  }

  function riskManagementValues(node: any) {
    const params = node.params || {}
    const tradeValue = params.riskLossTrade ?? 1
    const tradeUnit = params.riskLossTradeUnit || '%'
    const sessionValue = params.riskLossDay ?? 5
    const sessionUnit = params.riskLossDayUnit || '$'
    const riskReward = params.riskRR ?? 3

    return [
      { label: 'risk per trade', value: tradeUnit === '$' ? `$${tradeValue}` : `${tradeValue}%` },
      { label: 'risk per session', value: sessionUnit === '$' ? `$${sessionValue}` : `${sessionValue}%` },
      { label: 'risk reward ratio', value: `1:${riskReward}` },
      { label: 'trading style', value: params.tradingStyle || 'DAY_TRADING' }
    ]
  }

  function appendAddNodeEvent(node: any, targetKind: MatrixChangeEvent['targetKind'] = 'node') {
    const subchanges: any[] = []
    
    if (node.params) {
      const keysToExtract = ['identity', 'type', 'direction', 'timeframe', 'period', 'source', 'lots', 'distance', 'risk', 'customName', 'phase']
      for (const key of keysToExtract) {
        if (node.params[key] !== undefined && node.params[key] !== null && node.params[key] !== '') {
          subchanges.push({
            id: changeId('sub'),
            label: key,
            value: String(node.params[key]),
            targetId: node.id,
            subchanges: []
          })
        }
      }
    }

    if (node.type === 'risk') {
      riskManagementValues(node).forEach(field => {
        subchanges.push({
          id: changeId('sub'),
          label: field.label,
          value: field.value,
          targetId: node.id,
          subchanges: []
        })
      })
    }

    events.value.push({
      id: changeId(),
      type: 'add',
      title: 'ADD_NODE',
      node: `${node.type}: ${nodeDisplayValue(node)}`,
      createdAt: Date.now(),
      targetId: node.id,
      targetKind,
      subchanges
    })
  }

  function isResourceEvent(event: MatrixChangeEvent) {
    if (event.targetId === RESOURCE_GROUP_ID && event.targetKind === 'board') return false
    if (event.targetKind === 'domain') return true
    return event.targetKind === 'node' && event.node.startsWith('instrument:')
  }

  function resourceSubchange(node: any, targetKind: 'node' | 'domain' = 'node') {
    return {
      id: changeId('sub'),
      label: targetKind === 'domain' ? 'domain' : 'instrument',
      value: nodeDisplayValue(node),
      targetId: node.id,
      subchanges: []
    }
  }

  function appendResourceNode(node: any, targetKind: 'node' | 'domain' = 'node') {
    const legacyEvents = events.value.filter(isResourceEvent)
    let group = events.value.find(event => (
      event.targetId === RESOURCE_GROUP_ID && event.targetKind === 'board'
    ))

    if (!group) {
      group = {
        id: changeId(),
        type: 'add',
        title: 'ADD_NODE',
        node: 'resources: instruments / domains',
        createdAt: Date.now(),
        targetId: RESOURCE_GROUP_ID,
        targetKind: 'board',
        subchanges: []
      }
    }

    const migratedSubchanges = [...legacyEvents].reverse().map(event => ({
      id: event.id,
      label: event.targetKind === 'domain' ? 'domain' : 'instrument',
      value: event.node.replace(/^[^:]+:\s*/, ''),
      targetId: event.targetId,
      subchanges: event.subchanges || []
    }))

    group.subchanges = [
      resourceSubchange(node, targetKind),
      ...migratedSubchanges,
      ...group.subchanges.filter(change => change.targetId !== node.id)
    ]
    group.createdAt = Date.now()
    events.value = [
      ...events.value.filter(event => event.id !== group!.id && !legacyEvents.includes(event)),
      group
    ]
  }

  function findAddNodeContainer(targetId: string): MatrixChangeContainer | undefined {
    for (const event of events.value) {
      if ((event.title === 'ADD_NODE' || event.title === 'ADD_NODE*' || event.title === 'UPDATE_NODE') && event.targetId === targetId) return event

      const stack = [...event.subchanges]
      while (stack.length) {
        const subchange = stack.shift()
        if (!subchange) continue
        if (subchange.targetId === targetId) return subchange
        if (subchange.subchanges?.length) stack.unshift(...subchange.subchanges)
      }
    }
  }

  function updateEventNodeDisplay(node: any) {
    const parent = findAddNodeContainer(node.id)
    if (parent && 'node' in parent) {
      parent.node = `${node.type}: ${nodeDisplayValue(node)}`
      events.value = [...events.value]
    }
  }

  function setFinalNodeValue(node: any, label: string, value: any) {
    let parent = findAddNodeContainer(node.id)
    console.log('[DEBUG GitTree] setFinalNodeValue called for node:', node.id, 'label:', label, 'value:', value)
    if (!parent) {
      console.log('[DEBUG GitTree] ADD_NODE not found, creating UPDATE_NODE fallback')
      // Fallback: Create an UPDATE_NODE event if ADD_NODE is missing
      parent = {
        id: changeId(),
        type: 'update',
        title: 'UPDATE_NODE',
        node: `${node.type}: ${nodeDisplayValue(node)}`,
        createdAt: Date.now(),
        targetId: node.id,
        targetKind: 'node',
        subchanges: []
      } as MatrixChangeEvent
      events.value.push(parent as MatrixChangeEvent)
    } else {
      const parentTitle = 'title' in parent ? parent.title : 'subchange'
      console.log('[DEBUG GitTree] Found parent:', parentTitle, parent.id)
      if ('title' in parent && parent.title === 'ADD_NODE') {
         parent.title = 'ADD_NODE*'
      }
    }

    const normalizedValue = String(value ?? '').trim()
    const shouldRemove = !normalizedValue || normalizedValue.toUpperCase() === 'NONE'
    const existingIndex = parent.subchanges.findIndex(change => change.label === label)

    if (shouldRemove) {
      parent.subchanges = parent.subchanges.filter(change => change.label !== label)
    } else if (existingIndex !== -1) {
      parent.subchanges[existingIndex].value = normalizedValue
      parent.subchanges = parent.subchanges.filter((change, index) => (
        change.label !== label || index === existingIndex
      ))
    } else {
      parent.subchanges.push({
        id: changeId('sub'),
        label,
        value: normalizedValue,
        targetId: node.id,
        subchanges: []
      })
    }

    events.value = [...events.value]
  }

  function scalingLotsValue(node: any) {
    const suffix = node.params?.lotsMode === 'PERCENT' ? '%' : ' lots'
    return `${node.params?.lots ?? 0}${suffix}`
  }

  function scalingDistanceValue(node: any) {
    return `${node.params?.step ?? 0}${node.params?.unit || '%'}`
  }

  function recordScalingEntryChanged(node: any) {
    setFinalNodeValue(node, 'lots', scalingLotsValue(node))
    setFinalNodeValue(node, 'distance', scalingDistanceValue(node))
  }

  function recordRiskManagementChanged(node: any) {
    riskManagementValues(node).forEach(field => {
      setFinalNodeValue(node, field.label, field.value)
    })
  }

  function recordScalingEntryAdded(node: any) {
    if (findAddNodeContainer(node.id)) {
      recordScalingEntryChanged(node)
      return
    }

    const parentId = node.params?.parentId
    let parent = parentId ? findAddNodeContainer(parentId) : undefined
    if (!parent && parentId) {
      appendAddNodeEvent({
        id: parentId,
        type: node.params?.parentType || 'method',
        label: node.params?.parentLabel || node.params?.parentType || 'Method'
      })
      parent = findAddNodeContainer(parentId)
    }
    if (!parent) return

    parent.subchanges.push({
      id: changeId('sub'),
      label: 'SCALING_ENTRY',
      value: String(node.params?.posNumber ?? node.label ?? node.id),
      targetId: node.id,
      subchanges: [
        {
          id: changeId('sub'),
          label: 'lots',
          value: scalingLotsValue(node),
          targetId: node.id,
          subchanges: []
        },
        {
          id: changeId('sub'),
          label: 'distance',
          value: scalingDistanceValue(node),
          targetId: node.id,
          subchanges: []
        }
      ]
    })
    events.value = [...events.value]
  }

  function recordNodeAdded(node: any, ...args: any[]) {
    if (node.type === 'scaling-entry') {
      recordScalingEntryAdded(node)
      return
    }

    // Valid types for git panel
    const validTypes = [
      'strategy', 'condition', 'scenario', 'indicator', 
      'pattern', 'smc', 'data', 'methods', 'risk', 
      'risk-management', 'emotion', 'instrument',
      'pyramiding', 'averaging', 'domain'
    ]
    if (!validTypes.includes(node.type)) return

    if (node.type === 'instrument' || node.type === 'domain') {
      appendResourceNode(node, node.type === 'domain' ? 'domain' : 'node')
      return
    }

    appendAddNodeEvent(node)
  }

  function recordDomainAdded(domain: any, ...args: any[]) {
    appendResourceNode({
      id: domain.id,
      type: 'domain',
      label: domain.label || domain.type
    }, 'domain')
  }

  function recordNodeDeleted(node: any, ...args: any[]) {
    events.value = events.value.flatMap(event => {
      if (event.targetId === node.id) return []
      const removeNestedNode = (subchanges: any[]): any[] => subchanges
        .filter(change => change.targetId !== node.id)
        .map(change => ({
          ...change,
          subchanges: removeNestedNode(change.subchanges || [])
        }))
      const subchanges = removeNestedNode(event.subchanges)
      if (event.targetId === RESOURCE_GROUP_ID && !subchanges.length) return []
      return [{ ...event, subchanges }]
    })
  }

  // Stubs for remaining functions to not break useMatrixState.ts
  function recordLogicPlaceholderNodeAdded(node: any, ...args: any[]) {
    recordNodeAdded(node)
  }
  function recordConnectionCreated(...args: any[]) {}
  function recordConnectionDeleted(...args: any[]) {}
  function appendStrategyVersionCheckpoint(title: string, versionLabel?: string) {
    events.value.push({
      id: changeId(),
      type: 'version',
      title,
      node: versionLabel || 'strategy version',
      createdAt: Date.now(),
      targetKind: 'version',
      subchanges: []
    })
  }
  function recordStrategyVersionCreated(versionLabel?: string) {
    appendStrategyVersionCheckpoint('SET_STRATEGY_VERSION', versionLabel)
  }
  function recordStrategyVersionUpdated(versionLabel?: string) {
    appendStrategyVersionCheckpoint('UPDATE_STRATEGY_VERSION', versionLabel)
  }
  function clearStrategyVersionCheckpoints() {
    events.value = events.value.filter(event => event.type !== 'version')
  }
  function recordNodeIdentityChanged(node: any, value: string, ...args: any[]) {
    setFinalNodeValue(node, 'identity', value)
    updateEventNodeDisplay(node)
  }
  function recordNodeDirectionChanged(node: any, value: string, ...args: any[]) {
    setFinalNodeValue(node, 'direction', value)
  }
  function recordNodePriorityChanged(node: any, value: string, ...args: any[]) {
    setFinalNodeValue(node, 'priority', value)
  }
  function recordNodeCommentAdded(...args: any[]) {}
  function recordNodeCommentChanged(...args: any[]) {}
  function recordZoneCreated(...args: any[]) {}
  function recordZoneDeleted(...args: any[]) {}
  function recordZoneTypeChanged(...args: any[]) {}

  // Additional stubs required by ExSkillNode.vue and useMatrixState.ts
  function recordNodeLabelTextChanged(node: any, value: string, ...args: any[]) {
    let parent = findAddNodeContainer(node.id)
    const payload = args.find(arg => arg && typeof arg === 'object' && ('nextHtml' in arg || 'previousHtml' in arg || 'nextValue' in arg || 'previousValue' in arg))

    if (!parent) {
      parent = {
        id: changeId(),
        type: 'update',
        title: 'UPDATE_NODE',
        node: `${node.type}: ${nodeDisplayValue(node)}`,
        createdAt: Date.now(),
        targetId: node.id,
        targetKind: 'node',
        subchanges: []
      } as MatrixChangeEvent
      events.value.push(parent as MatrixChangeEvent)
    } else if ('title' in parent && parent.title === 'ADD_NODE') {
      parent.title = 'ADD_NODE*'
    }

    const existingIndex = parent.subchanges.findIndex(change => change.label === 'text')
    const nextChange = {
      id: existingIndex !== -1 ? parent.subchanges[existingIndex].id : changeId('sub'),
      label: 'text',
      value: String(value ?? ''),
      targetId: node.id,
      payload: payload ? { ...payload } : undefined,
      subchanges: []
    }

    if (existingIndex !== -1) {
      parent.subchanges[existingIndex] = nextChange
      parent.subchanges = parent.subchanges.filter((change, index) => (
        change.label !== 'text' || index === existingIndex
      ))
    } else {
      parent.subchanges.push(nextChange)
    }

    updateEventNodeDisplay(node)
    events.value = [...events.value]
  }
  function recordNodeEmbedUrlChanged(...args: any[]) {}
  function recordNodeDescriptionChanged(...args: any[]) {}
  function recordChecklistItemAdded(...args: any[]) {}
  function recordChecklistItemRemoved(...args: any[]) {}
  function recordChecklistItemTextChanged(...args: any[]) {}
  function recordNodeTableChanged(...args: any[]) {}
  function recordNodeScreenshotChanged(...args: any[]) {}
  function recordNodeFileAttachmentChanged(...args: any[]) {}
  function recordNodeDrawingChanged(...args: any[]) {}
  function recordCommentTextChanged(...args: any[]) {}
  function recordCommentRemoved(...args: any[]) {}
  function recordNodePhaseChanged(node: any, value: string, ...args: any[]) {
    setFinalNodeValue(node, 'phase', value)
  }
  function recordDomainChanged(domain: any, value: string, ...args: any[]) {
    setFinalNodeValue(domain, 'type', value)
  }
  
  // Stubs for unimplemented methods to fix TypeScript errors
  function recordDomainNodeChanged(...args: any[]) {}
  function getDomainState(id: string): string | null { return null }
  function recordDomainDeleted(...args: any[]) {}
  function disableDomainAddEvent(id: string) {}
  function updateConnectionAction(...args: any[]) {}
  function clearBoard(options?: any) {}

  function recordConnectionLabelChanged(...args: any[]) {}
  function removeLatestConnectionLabelChange(...args: any[]) {}
  
  function syncNodeIdentityLabels(next: Set<string>): Map<string, string> {
    return new Map<string, string>()
  }

  function resetChanges() {
    const id = activePageId?.value || 'default'
    eventsByPage.value[id] = []
  }

  return {
    events,
    eventsByPage,
    disabledChanges,
    disabledChangesByPage,
    changeId,
    appendAddNodeEvent,
    recordNodeAdded,
    recordDomainAdded,
    recordNodeDeleted,
    recordLogicPlaceholderNodeAdded,
    recordConnectionCreated,
    recordConnectionDeleted,
    recordStrategyVersionCreated,
    recordStrategyVersionUpdated,
    clearStrategyVersionCheckpoints,
    recordNodeIdentityChanged,
    recordNodeDirectionChanged,
    recordNodePriorityChanged,
    recordNodeCommentAdded,
    recordNodeCommentChanged,
    recordZoneCreated,
    recordZoneDeleted,
    recordZoneTypeChanged,
    recordNodeLabelTextChanged,
    recordNodeEmbedUrlChanged,
    recordNodeDescriptionChanged,
    recordChecklistItemAdded,
    recordChecklistItemRemoved,
    recordChecklistItemTextChanged,
    recordNodeTableChanged,
    recordNodeScreenshotChanged,
    recordNodeFileAttachmentChanged,
    recordNodeDrawingChanged,
    recordCommentTextChanged,
    recordCommentRemoved,
    recordNodePhaseChanged,
    recordDomainChanged,
    recordDomainNodeChanged,
    getDomainState,
    recordDomainDeleted,
    disableDomainAddEvent,
    updateConnectionAction,
    clearBoard,
    recordScalingEntryChanged,
    recordRiskManagementChanged,
    recordConnectionLabelChanged,
    removeLatestConnectionLabelChange,
    syncNodeIdentityLabels,
    resetChanges
  }
}
