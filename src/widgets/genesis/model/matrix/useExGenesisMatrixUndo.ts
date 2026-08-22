import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useMatrixState } from './useMatrixState'

const STORAGE_KEY_PREFIX = 'ex_genesis_matrix_undo_buffer'
const MAX_HISTORY = 5

export function useExGenesisMatrixUndo() {
  const state = useMatrixState()
  const isUndoing = ref(false)

  const getStorageKey = () => {
    const pageId = state.activePageId.value || 'default';
    const versionId = state.selectedStrategyVersionId.value || 'current';
    return `${STORAGE_KEY_PREFIX}_${pageId}_${versionId}`;
  }

  const getBuffer = (): any[] => {
    try {
      const stored = sessionStorage.getItem(getStorageKey())
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  const saveBuffer = (buffer: any[]) => {
    sessionStorage.setItem(getStorageKey(), JSON.stringify(buffer))
  }

  const captureSnapshot = () => {
    return {
      rootNodes: JSON.parse(JSON.stringify(state.rootNodes.value)),
      rootConnections: JSON.parse(JSON.stringify(state.rootConnections.value)),
      rootZones: JSON.parse(JSON.stringify(state.rootZones.value)),
      treeEvents: JSON.parse(JSON.stringify(state.changeTree.events.value))
    }
  }

  const pushSnapshot = () => {
    if (isUndoing.value) return
    const buffer = getBuffer()
    const snapshot = captureSnapshot()
    
    if (buffer.length > 0) {
      const last = buffer[buffer.length - 1]
      if (JSON.stringify(last) === JSON.stringify(snapshot)) {
        return
      }
    }

    buffer.push(snapshot)
    // +1 because we need 5 PAST states + 1 CURRENT state = 6 total items in the stack
    if (buffer.length > MAX_HISTORY + 1) {
      buffer.shift()
    }
    saveBuffer(buffer)
  }

  const resetSnapshot = () => {
    if (typeof sessionStorage === 'undefined') return
    saveBuffer([captureSnapshot()])
  }

  const undo = () => {
    const buffer = getBuffer()
    if (buffer.length <= 1) return // Nothing to undo

    isUndoing.value = true
    
    // Pop the current state
    buffer.pop()
    saveBuffer(buffer)

    // Revert to previous state
    const previousState = buffer[buffer.length - 1]
    if (previousState) {
      const versionCheckpoints = state.changeTree.events.value.filter(event => event.type === 'version')
      state.rootNodes.value = previousState.rootNodes
      state.rootConnections.value = previousState.rootConnections
      state.rootZones.value = previousState.rootZones
      if (previousState.treeEvents) {
        const restoredEvents = previousState.treeEvents.filter((event: any) => event.type !== 'version')
        state.changeTree.events.value = [...restoredEvents, ...versionCheckpoints]
          .filter((event, index, allEvents) => allEvents.findIndex(item => item.id === event.id) === index)
          .sort((left, right) => left.createdAt - right.createdAt)
      }
      state.forceUpdate()
      state.saveMatrixData()
    }

    // Wait a brief moment to allow watchers to bypass this change
    setTimeout(() => {
      isUndoing.value = false
    }, 100)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const isUndo = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey
    
    if (isUndo) {
      const target = e.target as HTMLElement
      // Let native undo handle text inputs while they are focused
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return 
      }
      e.preventDefault()
      undo()
    }
  }

  let timeout: any = null
  watch(
    [state.rootNodes, state.rootConnections, state.rootZones],
    () => {
      if (isUndoing.value) return
      
      // Pause pushing if user is actively editing a text field like description/name/comment.
      // This prevents capturing intermediate keystrokes, ensuring that hitting undo 
      // completely reverts to the state before editing began.
      const isEditingAnything = state.rootNodes.value.some((node: any) => {
        if (node.params?.isEditingName || node.params?.isEditingDescription) return true
        if (node.params?.comments && Array.isArray(node.params.comments)) {
          if (node.params.comments.some((c: any) => c.isEditing)) return true
        }
        return false
      })

      if (isEditingAnything) {
        if (timeout) clearTimeout(timeout)
        return
      }

      if (timeout) clearTimeout(timeout)
      // Debounce the saves to avoid recording intermediate drag states excessively
      timeout = setTimeout(() => {
        pushSnapshot()
      }, 300)
    },
    { deep: true }
  )

  watch(
    () => [state.activePageId.value, state.selectedStrategyVersionId.value],
    () => {
      resetSnapshot()
    }
  )

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
    if (getBuffer().length === 0) {
      pushSnapshot()
    }
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return {
    undo,
    pushSnapshot,
    resetSnapshot
  }
}
