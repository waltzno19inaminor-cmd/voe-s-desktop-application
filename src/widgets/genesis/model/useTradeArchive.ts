import { computed } from 'vue'
import { useStrategyTradesStore } from '~/features/store/useStrategyTrades'
import { useGenesisTrades } from '~/entities/genesis'
import { isClosedTradeForMetrics } from '~/widgets/genesis/model/tradePnl'
import {
  buildArchiveEquityCurve,
  buildArchiveMetrics,
  buildSparklinePath,
  getSparklineEndY,
  groupArchiveTradesByMonth,
  getTradePnl as getCashTradePnl,
  getTradeRealizedR,
  getTradeTimelineTimestamp
} from '~/widgets/genesis/model/metrics'

type ArchiveSessionId = 'SYDNEY' | 'TOKYO' | 'FRANKFURT' | 'LONDON' | 'NEW_YORK'

const archiveSessions: Array<{ id: ArchiveSessionId; start: number; end: number }> = [
  { id: 'NEW_YORK', start: 13 * 60, end: 22 * 60 },
  { id: 'LONDON', start: 8 * 60, end: 17 * 60 },
  { id: 'TOKYO', start: 0, end: 9 * 60 },
  { id: 'SYDNEY', start: 22 * 60, end: 24 * 60 },
  { id: 'SYDNEY', start: 0, end: 7 * 60 }
]

const archiveSessionLabels: Record<ArchiveSessionId, { ru: string; en: string }> = {
  SYDNEY: { ru: 'СИДНЕЙ', en: 'SYDNEY' },
  TOKYO: { ru: 'ТОКИО', en: 'TOKYO' },
  FRANKFURT: { ru: 'ФРАНКФУРТ', en: 'FRANKFURT' },
  LONDON: { ru: 'ЛОНДОН', en: 'LONDON' },
  NEW_YORK: { ru: 'НЬЮ-ЙОРК', en: 'NEW YORK' }
}

const normalizeArchiveSession = (value: unknown): ArchiveSessionId | null => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (normalized === 'NY' || normalized === 'NEWYORK') return 'NEW_YORK'
  if (normalized === 'FRANKFURT' || normalized === 'FRANKFURT_SESSION') return 'FRANKFURT'
  if (['SYDNEY', 'TOKYO', 'LONDON', 'NEW_YORK'].includes(normalized)) {
    return normalized as ArchiveSessionId
  }
  return null
}

const getArchiveTradeEntryDate = (trade: any) => {
  const entryExecution = Array.isArray(trade?.executions)
    ? trade.executions.find((execution: any) => execution?.type === 'entry' && execution?.date)
    : null
  const rawDate = entryExecution?.date || trade?.date || trade?.dateObj || trade?.dateTime
  const date = rawDate instanceof Date ? rawDate : new Date(rawDate || '')
  return Number.isFinite(date.getTime()) ? date : null
}

const getArchiveSessionLabel = (sessionId: ArchiveSessionId, locale: string) => {
  const labels = archiveSessionLabels[sessionId]
  return locale === 'ru' ? labels.ru : labels.en
}

export interface TradeArchiveProps {
  trades?: any[]
}

export const useTradeArchive = (props: TradeArchiveProps, locale: { readonly value: string }) => {
  const tradeStore = useStrategyTradesStore()

  const strategies = computed(() => tradeStore.strategies)
  const selectedStrategyId = computed({
    get: () => tradeStore.selectedStrategyId,
    set: (value: string) => { tradeStore.selectedStrategyId = value }
  })

  const selectedStrategy = computed(() => {
    return tradeStore.strategies.find(strategy => strategy.id === selectedStrategyId.value) || tradeStore.strategies[0]
  })

  const trades = computed(() => {
    if (Array.isArray(props.trades)) return props.trades
    if (!selectedStrategyId.value) return []
    return tradeStore.getTradesForStrategy(selectedStrategyId.value) || []
  })

  const initialCapital = computed(() => {
    return tradeStore.getInitialDeposit(selectedStrategyId.value || 'MAIN_DIARY') || 1000
  })

  const archiveMetrics = computed(() => buildArchiveMetrics(trades.value, initialCapital.value))
  const closedTrades = computed(() => archiveMetrics.value.closedTrades)

  const getTradePnl = (trade: any) => {
    return isClosedTradeForMetrics(trade) ? getCashTradePnl(trade, initialCapital.value) : 0
  }

  const isTradeClosed = (trade: any) => isClosedTradeForMetrics(trade)

  const getTradeR = (trade: any) => {
    return isClosedTradeForMetrics(trade) ? getTradeRealizedR(trade, initialCapital.value) : 0
  }

  const getTradeTime = (trade: any) => getTradeTimelineTimestamp(trade)

  const getTradeSession = (trade: any) => {
    const entryExecution = Array.isArray(trade?.executions)
      ? trade.executions.find((execution: any) => execution?.type === 'entry')
      : null
    const explicitSession = normalizeArchiveSession(
      entryExecution?.session || trade?.session || trade?.marketSession
    )

    if (explicitSession) return getArchiveSessionLabel(explicitSession, locale.value)

    const entryDate = getArchiveTradeEntryDate(trade)
    if (!entryDate) return locale.value === 'ru' ? 'НЕТ ДАННЫХ' : 'NO DATA'

    const minuteOfDay = entryDate.getUTCHours() * 60 + entryDate.getUTCMinutes()
    const derivedSession = archiveSessions.find(({ start, end }) => minuteOfDay >= start && minuteOfDay < end)
    return derivedSession
      ? getArchiveSessionLabel(derivedSession.id, locale.value)
      : (locale.value === 'ru' ? 'НЕТ ДАННЫХ' : 'NO DATA')
  }

  const groupedTrades = computed(() => {
    return groupArchiveTradesByMonth(trades.value, initialCapital.value, locale.value)
  })

  const tradesChronological = computed(() => {
    return [...closedTrades.value].sort((left, right) => getTradeTime(left) - getTradeTime(right))
  })

  const equityCurve = computed(() => {
    return buildArchiveEquityCurve(tradesChronological.value, 0)
  })

  const getTradeBalancePath = (trade: any) => {
    const index = tradesChronological.value.findIndex(item => item.id === trade.id)
    if (index === -1) return []

    const balances: number[] = [0]
    for (let cursor = 0; cursor <= index; cursor += 1) {
      balances.push(equityCurve.value[cursor]?.balance ?? 0)
    }
    return balances
  }

  const generateSparkline = (trade: any) => {
    return buildSparklinePath(getTradeBalancePath(trade))
  }

  const getSparklineEnd = (trade: any) => {
    const balances = getTradeBalancePath(trade)
    return balances.length ? getSparklineEndY(balances) : 10
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const day = date.getDate()
    const month = date.toLocaleString(locale.value === 'ru' ? 'ru-RU' : 'en-US', { month: 'short' }).toUpperCase()
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${day} ${month} ${year}  ${hours}:${minutes}`
  }

  return {
    strategies,
    selectedStrategyId,
    selectedStrategy,
    trades,
    closedTrades,
    getTradePnl,
    getTradeR,
    isTradeClosed,
    getTradeTime,
    getTradeSession,
    totalPnl: computed(() => archiveMetrics.value.totalPnl),
    winRate: computed(() => archiveMetrics.value.winRate),
    totalR: computed(() => archiveMetrics.value.totalR),
    avgR: computed(() => archiveMetrics.value.avgR),
    groupedTrades,
    generateSparkline,
    getSparklineEnd,
    formatDate
  }
}
