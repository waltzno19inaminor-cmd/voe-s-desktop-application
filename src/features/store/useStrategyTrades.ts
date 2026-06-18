import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loadFromDisk, saveToDisk } from '~/shared/diskStorage'
import type { DiaryEntry } from '~/entities/diary/model/diary.types'

export interface StrategyProfile {
  id: string
  name: string
  createdAt: string
}

export interface StrategyTradesData {
  strategies: StrategyProfile[]
  tradesByStrategy: Record<string, DiaryEntry[]>
  initialDepositsByStrategy?: Record<string, number>
  hiddenTradeIdsByStrategy?: Record<string, string[]>
}

export const useStrategyTradesStore = defineStore('strategyTrades', () => {
  const strategies = ref<StrategyProfile[]>([
    { id: 'MAIN_DIARY', name: 'Main Diary', createdAt: new Date().toISOString() }
  ])
  const tradesByStrategy = ref<Record<string, DiaryEntry[]>>({
    'MAIN_DIARY': []
  })
  const initialDepositsByStrategy = ref<Record<string, number>>({
    'MAIN_DIARY': 1000
  })
  const hiddenTradeIdsByStrategy = ref<Record<string, string[]>>({
    'MAIN_DIARY': []
  })
  const selectedStrategyId = ref('MAIN_DIARY')
  const isLoading = ref(true)
  const isInitialized = ref(false)

  async function init(force = false) {
    if (isInitialized.value && !force) return
    isLoading.value = true
    try {
      // Try Main first
      let data = await loadFromDisk<StrategyTradesData>('strategy_trades_v1')
      
      // If main is empty or null, try loading from backup
      if (!data || !data.tradesByStrategy || Object.values(data.tradesByStrategy).every(t => t.length === 0)) {
        const backup = await loadFromDisk<StrategyTradesData>('strategy_trades_v1_backup')
        if (backup && backup.tradesByStrategy && Object.values(backup.tradesByStrategy).some(t => t.length > 0)) {
          data = backup
        } else {
          // Final legacy fallback
          const legacy = await loadFromDisk<any>('genesis_diary_v2')
          if (legacy && (legacy.trades || legacy.tradesByStrategy)) {
            data = {
              strategies: legacy.strategies || [],
              tradesByStrategy: legacy.tradesByStrategy || { 'MAIN_DIARY': legacy.trades || [] },
              initialDepositsByStrategy: legacy.initialDepositsByStrategy || { 'MAIN_DIARY': 1000 },
              hiddenTradeIdsByStrategy: legacy.hiddenTradeIdsByStrategy || { 'MAIN_DIARY': [] }
            }
          }
        }
      }

      if (data) {
        if (data.strategies) strategies.value = data.strategies
        if (data.tradesByStrategy) tradesByStrategy.value = data.tradesByStrategy
        if (data.initialDepositsByStrategy) initialDepositsByStrategy.value = data.initialDepositsByStrategy
        if (data.hiddenTradeIdsByStrategy) hiddenTradeIdsByStrategy.value = data.hiddenTradeIdsByStrategy
        
        // Ensure MAIN_DIARY always exists
        if (!strategies.value.find(s => s.id === 'MAIN_DIARY')) {
          strategies.value.unshift({ id: 'MAIN_DIARY', name: 'Main Diary', createdAt: new Date().toISOString() })
        }
        if (!tradesByStrategy.value['MAIN_DIARY']) {
          tradesByStrategy.value['MAIN_DIARY'] = []
        }
        if (!hiddenTradeIdsByStrategy.value['MAIN_DIARY']) {
          hiddenTradeIdsByStrategy.value['MAIN_DIARY'] = []
        }
      }

      // Main diary trades are loaded exclusively from disk storage
    } finally {
      isInitialized.value = true
      isLoading.value = false
    }
  }

  async function save() {
    const data: StrategyTradesData = {
      strategies: strategies.value,
      tradesByStrategy: tradesByStrategy.value,
      initialDepositsByStrategy: initialDepositsByStrategy.value,
      hiddenTradeIdsByStrategy: hiddenTradeIdsByStrategy.value
    }
    // Save to both Main and Backup for safety
    await saveToDisk('strategy_trades_v1', data)
    await saveToDisk('strategy_trades_v1_backup', data)
  }

  function getTradesForStrategy(strategyId: string) {
    const trades = tradesByStrategy.value[strategyId] || []
    const hiddenIds = new Set(hiddenTradeIdsByStrategy.value[strategyId] || [])
    return trades.filter(trade => !hiddenIds.has(trade.id))
  }

  function getAllTradesForStrategy(strategyId: string) {
    return tradesByStrategy.value[strategyId] || []
  }

  function isTradeHidden(strategyId: string, tradeId: string) {
    return (hiddenTradeIdsByStrategy.value[strategyId] || []).includes(tradeId)
  }

  async function addTrade(strategyId: string, trade: DiaryEntry) {
    if (!tradesByStrategy.value[strategyId]) {
      tradesByStrategy.value[strategyId] = []
    }
    if (!hiddenTradeIdsByStrategy.value[strategyId]) {
      hiddenTradeIdsByStrategy.value[strategyId] = []
    }
    tradesByStrategy.value[strategyId].push({
      ...trade,
      strategyId // Ensure it's tagged
    })
    await save()
  }

  function getInitialDeposit(strategyId: string) {
    return initialDepositsByStrategy.value[strategyId] ?? 1000
  }

  async function setInitialDeposit(strategyId: string, amount: number) {
    initialDepositsByStrategy.value[strategyId] = amount
    await save()
  }

  async function clearTrades(strategyId: string) {
    tradesByStrategy.value[strategyId] = []
    hiddenTradeIdsByStrategy.value[strategyId] = []
    await save()
  }

  async function syncStrategies(matrixStrategies: { id: string; name: string }[]) {
    let changed = false
    matrixStrategies.forEach(ms => {
      const existing = strategies.value.find(s => s.id === ms.id)
      if (!existing) {
        strategies.value.push({
          id: ms.id,
          name: ms.name,
          createdAt: new Date().toISOString()
        })
        tradesByStrategy.value[ms.id] = []
        hiddenTradeIdsByStrategy.value[ms.id] = []
        changed = true
      } else if (existing.name !== ms.name) {
        existing.name = ms.name
        changed = true
      }
    })

    if (!hiddenTradeIdsByStrategy.value['MAIN_DIARY']) {
      hiddenTradeIdsByStrategy.value['MAIN_DIARY'] = []
      changed = true
    }

    if (changed) await save()
  }

  async function removeTrade(strategyId: string, tradeId: string) {
    if (!tradesByStrategy.value[strategyId]) return
    tradesByStrategy.value[strategyId] = tradesByStrategy.value[strategyId].filter(t => t.id !== tradeId)
    hiddenTradeIdsByStrategy.value[strategyId] = (hiddenTradeIdsByStrategy.value[strategyId] || []).filter(id => id !== tradeId)
    await save()
  }

  async function setTradeHidden(strategyId: string, tradeId: string, hidden: boolean) {
    const hiddenIds = new Set(hiddenTradeIdsByStrategy.value[strategyId] || [])
    if (hidden) {
      hiddenIds.add(tradeId)
    } else {
      hiddenIds.delete(tradeId)
    }
    hiddenTradeIdsByStrategy.value[strategyId] = Array.from(hiddenIds)
    await save()
  }

  async function toggleTradeHidden(strategyId: string, tradeId: string) {
    await setTradeHidden(strategyId, tradeId, !isTradeHidden(strategyId, tradeId))
  }

  async function setTradesHidden(strategyId: string, tradeIds: string[], hidden: boolean) {
    const hiddenIds = new Set(hiddenTradeIdsByStrategy.value[strategyId] || [])
    tradeIds.forEach(tradeId => {
      if (hidden) {
        hiddenIds.add(tradeId)
      } else {
        hiddenIds.delete(tradeId)
      }
    })
    hiddenTradeIdsByStrategy.value[strategyId] = Array.from(hiddenIds)
    await save()
  }

  async function purgeAllStrategies() {
    const mainDiaryTrades = tradesByStrategy.value['MAIN_DIARY'] || []
    
    // Move all trades from all other strategies to MAIN_DIARY
    Object.entries(tradesByStrategy.value).forEach(([strategyId, trades]) => {
      if (strategyId !== 'MAIN_DIARY') {
        const updatedTrades = trades.map(t => ({ ...t, strategyId: 'MAIN_DIARY', tradingStyle: 'Main Diary' }))
        mainDiaryTrades.push(...updatedTrades)
      }
    })
    
    // Reset state to only have MAIN_DIARY
    strategies.value = [
      { id: 'MAIN_DIARY', name: 'Main Diary', createdAt: new Date().toISOString() }
    ]
    const mainDiaryHidden = new Set(hiddenTradeIdsByStrategy.value['MAIN_DIARY'] || [])
    Object.entries(hiddenTradeIdsByStrategy.value).forEach(([strategyId, tradeIds]) => {
      if (strategyId !== 'MAIN_DIARY') {
        tradeIds.forEach(id => mainDiaryHidden.add(id))
      }
    })
    tradesByStrategy.value = {
      'MAIN_DIARY': mainDiaryTrades
    }
    hiddenTradeIdsByStrategy.value = {
      'MAIN_DIARY': Array.from(mainDiaryHidden)
    }
    
    await save()
  }

  async function updateTrade(strategyId: string, tradeId: string, updates: Partial<DiaryEntry>) {
    if (!tradesByStrategy.value[strategyId]) return
    const index = tradesByStrategy.value[strategyId].findIndex(t => t.id === tradeId)
    if (index !== -1) {
      tradesByStrategy.value[strategyId][index] = {
        ...tradesByStrategy.value[strategyId][index],
        ...updates
      } as DiaryEntry
      await save()
    }
  }

  return {
    strategies,
    tradesByStrategy,
    hiddenTradeIdsByStrategy,
    isLoading,
    init,
    save,
    getTradesForStrategy,
    getAllTradesForStrategy,
    isTradeHidden,
    addTrade,
    updateTrade,
    removeTrade,
    setTradeHidden,
    toggleTradeHidden,
    setTradesHidden,
    syncStrategies,
    getInitialDeposit,
    setInitialDeposit,
    clearTrades,
    selectedStrategyId,
    purgeAllStrategies
  }
})
