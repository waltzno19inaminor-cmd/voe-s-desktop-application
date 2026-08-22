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

const LIVERMORE_BTC_SEED_PREFIX = 'livermore-btc-seed-'
const LIVERMORE_NFLXX_SCENARIO_PREFIX = 'livermore-nflxx-scenario-'
const LIVERMORE_NFLXX_SCENARIO_TRADE_COUNT = 15
const LIVERMORE_RANDOM_TRADE_PREFIX = 'livermore-random-'
const LIVERMORE_RANDOM_TRADE_COUNT = 30

function isLivermoreStrategyName(name?: string) {
  return String(name || '').toLowerCase().includes('livermore')
}

function isNflxxTrade(trade: DiaryEntry) {
  return String(trade.asset || '').replace(/[^a-z0-9]/gi, '').toUpperCase() === 'NFLXX'
}

function hasScenario(trade: DiaryEntry) {
  return Boolean(
    trade.boardScenarioEntry?.id ||
    trade.boardScenarioEntryId ||
    trade.boardScenarioExit?.id ||
    trade.boardScenarioExitId
  )
}

function cloneTrade(trade: DiaryEntry): DiaryEntry {
  return JSON.parse(JSON.stringify(trade)) as DiaryEntry
}

function shiftDate(value: unknown, days: number) {
  if (!value) return value
  const date = new Date(value as string | number | Date)
  if (Number.isNaN(date.getTime())) return value
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
}

function createLivermoreRandomTrades(strategyId: string): DiaryEntry[] {
  const assets = [
    ['AAPL', 215], ['MSFT', 480], ['NVDA', 182], ['AMZN', 228], ['META', 780],
    ['TSLA', 420], ['JPM', 330], ['XOM', 118], ['CAT', 450], ['GE', 315]
  ] as const
  const scenarios = ['PIVOTAL POINT', 'SECONDARY REACTION', 'LINE OF LEAST RESISTANCE', 'BREAKOUT CONFIRMATION']
  const conditions = ['HIGHER VOLUME', 'TREND ALIGNMENT', 'PRICE HOLDS LEVEL', 'FAILED RETEST']
  const emotions = ['Patience', 'Discipline', 'Confidence', 'Focus']
  const random = (min: number, max: number) => min + Math.random() * (max - min)
  const round = (value: number, digits = 2) => Number(value.toFixed(digits))

  return Array.from({ length: LIVERMORE_RANDOM_TRADE_COUNT }, (_, index) => {
    const [asset, basePrice] = assets[Math.floor(Math.random() * assets.length)]
    const side: 'Long' | 'Short' = Math.random() < 0.58 ? 'Long' : 'Short'
    const entry = round(basePrice * random(0.88, 1.12))
    const isWinner = Math.random() < 0.6
    const change = random(isWinner ? 0.012 : -0.075, isWinner ? 0.095 : -0.012)
    const exit = round(entry * (side === 'Long' ? 1 + change : 1 - change))
    const stopDistance = random(0.018, 0.052)
    const targetDistance = random(0.045, 0.13)
    const stopLoss = round(entry * (side === 'Long' ? 1 - stopDistance : 1 + stopDistance))
    const takeProfit = round(entry * (side === 'Long' ? 1 + targetDistance : 1 - targetDistance))
    const size = Math.floor(random(4, 26))
    const profitInCurrency = round((side === 'Long' ? exit - entry : entry - exit) * size)
    const openDate = new Date(Date.UTC(2026, 5, 1 + index * 2, 13 + (index % 5), (index * 11) % 60))
    const exitDate = new Date(openDate.getTime() + Math.floor(random(4, 60)) * 60 * 60 * 1000)
    const id = `${LIVERMORE_RANDOM_TRADE_PREFIX}${String(index + 1).padStart(2, '0')}`
    const scenario = scenarios[index % scenarios.length]
    const condition = conditions[index % conditions.length]
    const conditionEntry = {
      id: `livermore-condition-${index % conditions.length}`,
      info: {
        name: condition,
        description: 'Randomly generated market condition',
        priority: 'REQUIRED'
      }
    }

    return {
      id,
      asset,
      side,
      entry,
      exit,
      size,
      executions: [
        { id: `${id}-entry`, type: 'entry', side, price: entry, size, date: openDate, label: 'SINGLE' },
        { id: `${id}-exit`, type: 'exit', side: 'Close', price: exit, size, date: exitDate, label: 'SINGLE' }
      ],
      stopLoss,
      takeProfit,
      isClosed: true,
      status: 'closed',
      timeZone: 'UTC',
      date: openDate,
      dateExit: exitDate,
      profitInCurrency,
      assetType: 'Stocks',
      strategyId,
      entryMethodType: 'SINGLE',
      exitMethodType: 'SINGLE',
      riskReward: round(targetDistance / stopDistance),
      entryFee: 0,
      exitFee: 0,
      feeType: '$',
      emotions: [emotions[index % emotions.length]],
      boardScenarioEntry: {
        id: `livermore-scenario-${index % scenarios.length}`,
        info: {
          name: scenario,
          description: 'Randomly generated Livermore-style historical trade',
          conditions: [conditionEntry]
        }
      },
      boardScenarioExit: null,
      boardRequiredConditionsEntry: [conditionEntry],
      boardRequiredConditionsExit: [],
      images: [],
      notes: 'Randomly generated trade for LIVERMORE’S.',
      notesList: []
    }
  })
}

function createLivermoreBtcSeedTrades(strategyId: string): DiaryEntry[] {
  const setups = [
    [68420, 69780, 67180, 71300, 0.18, 244.8, 7, 'Long'],
    [70650, 69240, 71880, 68120, 0.16, 225.6, 11, 'Short'],
    [69110, 70480, 68220, 72160, 0.14, 191.8, 18, 'Long'],
    [71820, 70940, 72910, 69440, 0.2, 176, 27, 'Short'],
    [70340, 69920, 69480, 71860, 0.22, -92.4, 34, 'Long'],
    [68980, 68160, 70220, 67410, 0.17, 139.4, 41, 'Short'],
    [67650, 69020, 66740, 70480, 0.19, 260.3, 49, 'Long'],
    [69470, 68730, 70610, 67980, 0.15, 111, 56, 'Short'],
    [68120, 67290, 66880, 69940, 0.21, -174.3, 63, 'Long'],
    [66980, 68140, 66110, 69620, 0.18, 208.8, 70, 'Long'],
    [68560, 67720, 69840, 66860, 0.2, 168, 78, 'Short'],
    [67440, 69280, 66520, 70940, 0.12, 220.8, 85, 'Long'],
    [69620, 70310, 68750, 71680, 0.24, 165.6, 92, 'Long'],
    [70840, 69510, 72150, 68190, 0.13, 172.9, 99, 'Short'],
    [69280, 68740, 68190, 70960, 0.2, -108, 106, 'Long'],
    [68190, 67080, 69340, 66220, 0.16, 177.6, 113, 'Short'],
    [66640, 67970, 65760, 69480, 0.18, 239.4, 120, 'Long'],
    [68220, 69060, 67420, 70410, 0.22, 184.8, 127, 'Long'],
    [69690, 68810, 70860, 67650, 0.19, 167.2, 134, 'Short'],
    [68480, 67640, 67120, 70180, 0.17, -142.8, 141, 'Long']
  ] as const

  const scenarios = ['Pivotal_Point_Reclaim', 'Line_Of_Least_Resistance', 'Secondary_Reaction', 'Breakout_Confirmation']
  const conditions = ['Volume_Expansion', 'Price_Holds_Level', 'Failed_Retest', 'Trend_Alignment']
  const emotions = ['Patience', 'Discipline', 'Confidence', 'Fear', 'Greed']

  return setups.map(([entry, exit, stopLoss, takeProfit, size, pnl, dayOffset, side], index) => {
    const openDate = new Date(Date.UTC(2026, 4, 1 + dayOffset, 10 + (index % 5), (index * 7) % 60))
    const exitDate = new Date(openDate.getTime() + ((6 + (index % 9) * 4) * 60 * 60 * 1000))
    const scenarioName = scenarios[index % scenarios.length]
    const conditionName = conditions[index % conditions.length]
    const isLong = side === 'Long'
    const stopDistance = Math.abs(entry - stopLoss)
    const targetDistance = Math.abs(takeProfit - entry)

    return {
      id: `${LIVERMORE_BTC_SEED_PREFIX}${String(index + 1).padStart(2, '0')}`,
      asset: 'BTC/USD',
      side: side as 'Long' | 'Short',
      entry,
      exit,
      stopLoss,
      takeProfit,
      size,
      isClosed: true,
      status: 'closed',
      timeZone: 'UTC',
      date: openDate,
      dateExit: exitDate,
      profitInCurrency: pnl,
      assetType: 'Crypto',
      strategyId,
      riskReward: targetDistance / Math.max(1, stopDistance),
      emotions: [emotions[index % emotions.length]],
      boardScenarioEntry: {
        id: `livermore-entry-${index % scenarios.length}`,
        info: {
          name: scenarioName,
          description: 'Synthetic Livermore BTC seed entry',
          conditions: [{
            id: `livermore-condition-${index % conditions.length}`,
            info: {
              name: conditionName,
              description: 'Synthetic BTC condition',
              priority: index % 3 === 0 ? 'ADDITIONAL' : 'REQUIRED'
            }
          }],
          requiredConditions: [{
            id: `livermore-condition-${index % conditions.length}`,
            info: {
              name: conditionName,
              description: 'Synthetic BTC condition',
              priority: 'REQUIRED'
            }
          }]
        }
      },
      tradeStudyMetrics: {
        generatedInTradeAnalysis: {
          profitCaptureRatio: Math.max(12, Math.min(96, 58 + (pnl / 12))),
          maxFavorableExcursionPct: Math.abs(pnl) / 32,
          maxMeaningfulDrawdownPct: pnl < 0 ? Math.abs(pnl) / 40 : Math.abs(pnl) / 95,
          pricePathShape: pnl >= 0 ? 'trend_continuation' : 'failed_follow_through',
          firstImpulseDirection: isLong ? 'up' : 'down',
          adverseBeforeProfit: index % 4 === 0,
          meaningfulProfitSeconds: Math.max(1800, (4 + (index % 6)) * 3600),
          meaningfulLossSeconds: Math.max(900, (1 + (index % 5)) * 2400),
          entryHeatSeconds: Math.max(300, (index % 7) * 900)
        }
      }
    }
  })
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
  let initPromise: Promise<void> | null = null

  async function init(force = false) {
    if (isInitialized.value && !force) return
    if (initPromise && !force) return initPromise

    const currentInit = (async () => {
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

      // Trades are read exactly as they exist in strategy_trades_v1.json.
      // This store never creates, removes, or rewrites records during startup.
    } finally {
      isInitialized.value = true
      isLoading.value = false
    }
    })()

    initPromise = currentInit
    try {
      await currentInit
    } finally {
      if (initPromise === currentInit) initPromise = null
    }
  }

  async function save() {
    const data: StrategyTradesData = {
      strategies: strategies.value,
      tradesByStrategy: tradesByStrategy.value,
      initialDepositsByStrategy: initialDepositsByStrategy.value,
      hiddenTradeIdsByStrategy: hiddenTradeIdsByStrategy.value
    }
    // saveToDisk writes this file and its backup atomically.
    await saveToDisk('strategy_trades_v1', data)
  }

  function getTradesForStrategy(strategyId: string) {
    const trades = tradesByStrategy.value[strategyId] || []
    const hiddenIds = new Set(hiddenTradeIdsByStrategy.value[strategyId] || [])
    return trades.filter(trade => !hiddenIds.has(trade.id!))
  }

  function getAllTradesForStrategy(strategyId: string) {
    return tradesByStrategy.value[strategyId] || []
  }

  function isTradeHidden(strategyId: string, tradeId: string) {
    return (hiddenTradeIdsByStrategy.value[strategyId] || []).includes(tradeId)
  }

  async function addTrade(strategyId: string, trade: DiaryEntry) {
    if (!isInitialized.value) await init()
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
    const matrixStrategyIds = new Set(matrixStrategies.map(ms => ms.id))

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

    if (matrixStrategyIds.size > 0) {
      const syncedStrategies = strategies.value.filter(strategy => (
        strategy.id === 'MAIN_DIARY' || matrixStrategyIds.has(strategy.id)
      ))
      if (syncedStrategies.length !== strategies.value.length) {
        strategies.value = syncedStrategies
        changed = true
      }
    }

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
    if (!isInitialized.value) await init()
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
