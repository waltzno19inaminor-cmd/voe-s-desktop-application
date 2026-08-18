import { ref, computed, readonly } from 'vue'
import { loadFromDisk, saveToDisk } from '~/shared/diskStorage'
import { useStrategyTradesStore, type StrategyProfile, type StrategyTradesData } from '~/features/store/useStrategyTrades'
import type { DiaryEntry } from '~/entities/diary/model/diary.types'

export interface TradeFilterOptions {
  strategyId?: string
  asset?: string
  side?: 'Long' | 'Short' | 'ALL'
  status?: 'open' | 'closed' | 'ALL'
  searchQuery?: string
  scenarioId?: string
  conditionId?: string
  emotion?: string
  outcome?: 'win' | 'loss' | 'ALL'
  startDate?: string | Date
  endDate?: string | Date
}

export interface GenesisTradeExportPayload {
  version: string
  exportedAt: string
  strategies: StrategyProfile[]
  tradesByStrategy: Record<string, DiaryEntry[]>
  initialDepositsByStrategy?: Record<string, number>
}

/**
 * Safely parses any raw JSON input (string, object, array) into normalized DiaryEntry objects.
 */
export function parseTradesFromJson(jsonInput: unknown): DiaryEntry[] {
  if (!jsonInput) return []

  try {
    let parsed: any = jsonInput
    if (typeof jsonInput === 'string') {
      parsed = JSON.parse(jsonInput)
    }

    let rawList: any[] = []

    if (Array.isArray(parsed)) {
      rawList = parsed
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.trades)) {
        rawList = parsed.trades
      } else if (parsed.tradesByStrategy && typeof parsed.tradesByStrategy === 'object') {
        rawList = Object.values(parsed.tradesByStrategy).flat()
      } else if (Array.isArray(parsed.data)) {
        rawList = parsed.data
      }
    }

    return rawList
      .filter((item): item is Record<string, any> => Boolean(item && typeof item === 'object'))
      .map(normalizeTradeRecord)
  } catch (err) {
    console.error('[genesisTrades] Failed to parse trades from JSON:', err)
    return []
  }
}

/**
 * Normalizes a raw trade record into a complete, strongly-typed DiaryEntry object.
 */
export function normalizeTradeRecord(raw: Record<string, any>): DiaryEntry {
  const id = String(raw.id || `trade_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`)
  const asset = String(raw.asset || raw.symbol || raw.ticker || 'BTC/USD').toUpperCase()
  const side: 'Long' | 'Short' = String(raw.side || raw.direction || 'Long').toLowerCase().includes('short') ? 'Short' : 'Long'
  const entry = Number(raw.entry ?? raw.entryPrice ?? raw.openPrice ?? 0)
  const exit = raw.exit !== undefined ? Number(raw.exit) : (raw.exitPrice !== undefined ? Number(raw.exitPrice) : undefined)
  const stopLoss = Number(raw.stopLoss ?? raw.sl ?? 0)
  const takeProfit = Number(raw.takeProfit ?? raw.tp ?? 0)
  const size = Number(raw.size ?? raw.volume ?? raw.lots ?? 1)
  const isClosed = raw.isClosed !== undefined ? Boolean(raw.isClosed) : (raw.status ? String(raw.status).toLowerCase() === 'closed' : exit !== undefined)
  const status: 'open' | 'closed' = isClosed ? 'closed' : 'open'
  
  const openDate = raw.date ? new Date(raw.date) : (raw.entryTime ? new Date(raw.entryTime) : new Date())
  const exitDate = raw.dateExit ? new Date(raw.dateExit) : (raw.exitTime ? new Date(raw.exitTime) : (isClosed ? new Date() : undefined))

  const profitInCurrency = Number(raw.profitInCurrency ?? raw.pnl ?? raw.profit ?? 0)
  const strategyId = String(raw.strategyId || 'MAIN_DIARY')

  return {
    ...raw,
    id,
    asset,
    side,
    entry,
    exit,
    stopLoss,
    takeProfit,
    size,
    isClosed,
    status,
    date: openDate,
    dateExit: exitDate,
    profitInCurrency,
    strategyId,
    assetType: raw.assetType || 'Crypto',
    timeZone: raw.timeZone || 'UTC',
    emotions: Array.isArray(raw.emotions) ? raw.emotions : [],
    boardScenarioEntry: raw.boardScenarioEntry || null,
    boardScenarioExit: raw.boardScenarioExit || null,
    tradeStudyMetrics: raw.tradeStudyMetrics || undefined
  } as DiaryEntry
}

/**
 * Loads trades data from disk storage, with fallbacks to backup keys.
 */
export async function loadTradesFromDisk(): Promise<StrategyTradesData | null> {
  try {
    let data = await loadFromDisk<StrategyTradesData>('strategy_trades_v1')
    if (!data || !data.tradesByStrategy || Object.values(data.tradesByStrategy).every(t => !t || t.length === 0)) {
      const backup = await loadFromDisk<StrategyTradesData>('strategy_trades_v1_backup')
      if (backup && backup.tradesByStrategy && Object.values(backup.tradesByStrategy).some(t => t && t.length > 0)) {
        data = backup
      } else {
        const legacy = await loadFromDisk<any>('genesis_diary_v2')
        if (legacy && (legacy.trades || legacy.tradesByStrategy)) {
          data = {
            strategies: legacy.strategies || [{ id: 'MAIN_DIARY', name: 'Main Diary', createdAt: new Date().toISOString() }],
            tradesByStrategy: legacy.tradesByStrategy || { 'MAIN_DIARY': legacy.trades || [] },
            initialDepositsByStrategy: legacy.initialDepositsByStrategy || { 'MAIN_DIARY': 1000 },
            hiddenTradeIdsByStrategy: legacy.hiddenTradeIdsByStrategy || { 'MAIN_DIARY': [] }
          }
        }
      }
    }
    return data
  } catch (err) {
    console.error('[genesisTrades] Failed to load trades from disk:', err)
    return null
  }
}

/**
 * Serializes trades into a formatted JSON string for export.
 */
export function exportTradesToJson(payload: StrategyTradesData | DiaryEntry[]): string {
  if (Array.isArray(payload)) {
    const exportData: GenesisTradeExportPayload = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      strategies: [{ id: 'MAIN_DIARY', name: 'Main Diary', createdAt: new Date().toISOString() }],
      tradesByStrategy: { 'MAIN_DIARY': payload }
    }
    return JSON.stringify(exportData, null, 2)
  }
  return JSON.stringify(payload, null, 2)
}

/**
 * Filters a list of trades according to user-specified criteria.
 */
export function filterTrades(trades: DiaryEntry[], options: TradeFilterOptions = {}): DiaryEntry[] {
  if (!Array.isArray(trades)) return []

  return trades.filter((trade) => {
    if (options.strategyId && trade.strategyId !== options.strategyId) {
      return false
    }

    if (options.asset && trade.asset?.toUpperCase() !== options.asset.toUpperCase()) {
      return false
    }

    if (options.side && options.side !== 'ALL' && trade.side !== options.side) {
      return false
    }

    if (options.status && options.status !== 'ALL') {
      const isTradeClosed = trade.isClosed || trade.status === 'closed'
      if (options.status === 'closed' && !isTradeClosed) return false
      if (options.status === 'open' && isTradeClosed) return false
    }

    if (options.outcome && options.outcome !== 'ALL') {
      const pnl = Number(trade.profitInCurrency || 0)
      if (options.outcome === 'win' && pnl <= 0) return false
      if (options.outcome === 'loss' && pnl >= 0) return false
    }

    if (options.scenarioId) {
      const entryScenarioId = trade.boardScenarioEntry?.id || trade.boardScenarioEntryId
      const exitScenarioId = trade.boardScenarioExit?.id || trade.boardScenarioExitId
      if (entryScenarioId !== options.scenarioId && exitScenarioId !== options.scenarioId) {
        return false
      }
    }

    if (options.conditionId) {
      const entryConds = trade.boardScenarioEntry?.info?.conditions || []
      const exitConds = trade.boardScenarioExit?.info?.conditions || []
      const hasCondition = [...entryConds, ...exitConds].some((c: any) => c.id === options.conditionId || c.info?.name === options.conditionId)
      if (!hasCondition) return false
    }

    if (options.emotion && Array.isArray(trade.emotions)) {
      if (!trade.emotions.includes(options.emotion)) return false
    }

    if (options.searchQuery) {
      const query = options.searchQuery.toLowerCase()
      const matchesAsset = trade.asset?.toLowerCase().includes(query)
      const matchesNotes = trade.noteText?.toLowerCase().includes(query)
      const matchesId = trade.id?.toLowerCase().includes(query)
      if (!matchesAsset && !matchesNotes && !matchesId) return false
    }

    if (options.startDate) {
      const startTime = new Date(options.startDate).getTime()
      const tradeTime = new Date(trade.date).getTime()
      if (tradeTime < startTime) return false
    }

    if (options.endDate) {
      const endTime = new Date(options.endDate).getTime()
      const tradeTime = new Date(trade.date).getTime()
      if (tradeTime > endTime) return false
    }

    return true
  })
}

/**
 * Main Vue Composable providing convenient reactive access to all Genesis Protocol deals/trades.
 */
export function useGenesisTrades() {
  const store = useStrategyTradesStore()
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const init = async (force = false) => {
    isLoading.value = true
    error.value = null
    try {
      await store.init(force)
    } catch (err: any) {
      error.value = err?.message || 'Failed to initialize Genesis trades'
      console.error('[useGenesisTrades] Error initializing store:', err)
    } finally {
      isLoading.value = false
    }
  }

  const allTrades = computed(() => {
    const map = store.tradesByStrategy || {}
    return Object.values(map).flat()
  })

  const activeStrategyTrades = computed(() => {
    return store.getTradesForStrategy(store.selectedStrategyId) || []
  })

  const selectedStrategyId = computed({
    get: () => store.selectedStrategyId,
    set: (val: string) => { store.selectedStrategyId = val }
  })

  const strategies = computed(() => store.strategies)

  const getTradeById = (id: string): DiaryEntry | undefined => {
    return allTrades.value.find(t => t.id === id)
  }

  const getTradesForStrategy = (strategyId: string): DiaryEntry[] => {
    return store.getTradesForStrategy(strategyId) || []
  }

  const importFromJson = async (jsonInput: unknown, targetStrategyId?: string): Promise<number> => {
    const parsed = parseTradesFromJson(jsonInput)
    if (parsed.length === 0) return 0

    const targetId = targetStrategyId || selectedStrategyId.value
    for (const trade of parsed) {
      trade.strategyId = targetId
      await store.addTrade(trade, targetId)
    }
    return parsed.length
  }

  const exportToJson = (strategyId?: string): string => {
    if (strategyId) {
      const trades = store.getTradesForStrategy(strategyId)
      return exportTradesToJson(trades)
    }
    return exportTradesToJson({
      strategies: store.strategies,
      tradesByStrategy: store.tradesByStrategy,
      initialDepositsByStrategy: store.initialDepositsByStrategy,
      hiddenTradeIdsByStrategy: store.hiddenTradeIdsByStrategy
    })
  }

  return {
    store,
    isLoading: readonly(isLoading),
    error: readonly(error),
    init,
    allTrades,
    activeStrategyTrades,
    selectedStrategyId,
    strategies,
    getTradeById,
    getTradesForStrategy,
    filterTrades: (options?: TradeFilterOptions) => filterTrades(allTrades.value, options),
    importFromJson,
    exportToJson,
    addTrade: store.addTrade,
    updateTrade: store.updateTrade,
    deleteTrade: store.deleteTrade
  }
}
