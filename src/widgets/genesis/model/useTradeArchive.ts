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
