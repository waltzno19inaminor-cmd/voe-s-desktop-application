import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useStrategyTradesStore } from '~/features/store/useStrategyTrades'
import { fetchDailyActivity } from '~/widgets/dashboard/model/useActivity'

export const useAppBootStore = defineStore('appBoot', () => {
  const isBooting = ref(false)
  const bootProgress = ref(0)
  const currentLog = ref('Initializing...')
  
  // Caches
  const genesisMatrixCache = ref<any>(null)
  const isGenesisMatrixSessionRestored = ref(false)
  const areGenesisMatrixImagesPreloaded = ref(false)
  
  async function executeBootSequence(userId: string) {
    isBooting.value = true
    bootProgress.value = 0
    
    try {
      // Helper for minimum visual delay (so it doesn't flash instantly)
      const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
      
      // Step 1: Network - Activity. The local workspace must still boot when
      // the operator has no connection; the activity panel can sync later.
      if (typeof navigator === 'undefined' || navigator.onLine) {
        currentLog.value = 'Fetching monitor activity...'
        await Promise.race([
          fetchDailyActivity(userId),
          delay(2500)
        ])
      } else {
        currentLog.value = 'Offline mode: loading local workspace...'
      }
      await delay(600) // Visual pause
      bootProgress.value = 33
      
      // Step 2: Disk - Trades
      currentLog.value = 'Loading strategy trades...'
      await useStrategyTradesStore().init()
      await delay(500)
      bootProgress.value = 66
      
      // Step 3: Disk - Genesis Matrix
      currentLog.value = 'Synchronizing Genesis Matrix...'
      // Hydrate the shared Matrix singleton before any Genesis screen mounts.
      // It is the only owner of the live genesis_matrix_v2.json state.
      const { useMatrixState } = await import('~/widgets/genesis/model/matrix/useMatrixState')
      const matrixState = useMatrixState()
      await matrixState.ensureMatrixDataRestored()

      const flattenNodes = (nodes: any[] = []): any[] => nodes.flatMap(node => [
        node,
        ...flattenNodes(node.subGraph?.nodes || [])
      ])
      const matrixStrategies = matrixState.matrixPages.value
        .flatMap(page => flattenNodes(page.nodes || []))
        .filter(node => node.type === 'strategy' || node.type === 'system')
        .map(node => ({
          id: String(node.id),
          name: String(node.params?.customName || node.label || node.id)
        }))
      await useStrategyTradesStore().syncStrategies(matrixStrategies)
      await delay(500)
      bootProgress.value = 95
      
      // Complete
      await delay(300)
      currentLog.value = 'Ready.'
      bootProgress.value = 100
      
    } catch (e) {
      console.error('Boot sequence failed:', e)
      currentLog.value = 'Boot sequence error.'
    } finally {
      isBooting.value = false
    }
  }

  return {
    isBooting,
    bootProgress,
    currentLog,
    genesisMatrixCache,
    isGenesisMatrixSessionRestored,
    areGenesisMatrixImagesPreloaded,
    executeBootSequence
  }
})
