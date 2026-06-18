import type { DiaryEntry } from '~/entities/diary/model/diary.types'
import {
  getBybitClosedTrades,
  getBybitExecutionList,
  getBybitOrderHistory,
  withBybitEnvironment,
  type BybitClosedPnl,
  type BybitExecution,
  type BybitHistoricOrder
} from '~/utils/bybit'
import {
  getKrakenFuturesFills,
  getKrakenTradesHistory,
  getKrakenQueryOrders,
  withKrakenFuturesEnvironment,
  type KrakenFuturesFill,
  type KrakenTrade
} from '~/utils/kraken'
import {
  getBinanceUsdMFuturesTrades,
  withBinanceEnvironment,
  type BinanceCredentials,
  type BinanceFuturesTrade
} from '~/utils/binance'
import { resolveImportedAsset } from '~/utils/assetResolver'
import { getIbkrFlexStatement } from '~/utils/interactiveBrokers'


export interface StoredBrokerConnection {
  brokerId: string
  credentials: Record<string, string>
  active: boolean
  updatedAt: string
  activatedAt?: string
}

type BrokerEnvironment = 'real' | 'demo'

const readBrokerEnvironment = (connection: StoredBrokerConnection): BrokerEnvironment => {
  return connection.credentials.environment === 'demo' ? 'demo' : 'real'
}

export interface BrokerTradeStorePort {
  init: () => Promise<void>
  getAllTradesForStrategy: (strategyId: string) => DiaryEntry[]
  addTrade: (strategyId: string, trade: DiaryEntry) => Promise<void>
  updateTrade?: (strategyId: string, tradeId: string, updates: Partial<DiaryEntry>) => Promise<void>
}

export interface BrokerSyncResult {
  importedCount: number
  duplicateCount: number
  checkedCount: number
  sourceLabel: string
}

type ImportedTrade = DiaryEntry & { sourceExternalId: string; sourcePlatform: string }

export const isSyncableBrokerConnection = (connection?: StoredBrokerConnection | null) => {
  return Boolean(connection?.active && ['bybit', 'kraken', 'kraken-spot', 'kraken-futures', 'binance', 'interactive-brokers'].includes(connection.brokerId))
}

export const syncBrokerConnectionTrades = async (
  connection: StoredBrokerConnection,
  strategyId: string,
  tradeStore: BrokerTradeStorePort
): Promise<BrokerSyncResult> => {
  if (connection.brokerId === 'binance') {
    return syncBinance(connection, strategyId, tradeStore)
  }

  if (connection.brokerId === 'interactive-brokers') {
    return syncInteractiveBrokers(connection, strategyId, tradeStore)
  }

  if (connection.brokerId === 'bybit') {
    return syncBybit(connection, strategyId, tradeStore)
  }

  if (connection.brokerId === 'kraken' || connection.brokerId === 'kraken-spot') {
    return connection.credentials.market === 'futures'
      ? syncKrakenFutures(connection, strategyId, tradeStore)
      : syncKrakenSpot(connection, strategyId, tradeStore)
  }

  if (connection.brokerId === 'kraken-futures') {
    return syncKrakenFutures(connection, strategyId, tradeStore)
  }

  throw new Error('This connector does not support direct trade sync yet.')
}

const syncBybit = async (
  connection: StoredBrokerConnection,
  strategyId: string,
  tradeStore: BrokerTradeStorePort
): Promise<BrokerSyncResult> => {
  const credentials = {
    apiKey: connection.credentials.apiKey || '',
    apiSecret: connection.credentials.apiSecret || ''
  }
  const environment = readBrokerEnvironment(connection)
  const scopedCredentials = withBybitEnvironment(credentials, environment)
  const [spotResponse, linearResponse, inverseResponse] = await Promise.allSettled([
    getBybitOrderHistory(scopedCredentials, { category: 'spot', limit: 50 }),
    getBybitExecutionList(scopedCredentials, { category: 'linear', execType: 'Trade', limit: 100 }),
    getBybitExecutionList(scopedCredentials, { category: 'inverse', execType: 'Trade', limit: 100 })
  ])

  const spotTrades = spotResponse.status === 'fulfilled' ? (spotResponse.value.list || []) : []
  const linearTrades = linearResponse.status === 'fulfilled' ? (linearResponse.value.list || []) : []
  const inverseTrades = inverseResponse.status === 'fulfilled' ? (inverseResponse.value.list || []) : []

  if (![spotResponse, linearResponse, inverseResponse].some(item => item.status === 'fulfilled')) {
    const firstError = [spotResponse, linearResponse, inverseResponse].find(item => item.status === 'rejected') as PromiseRejectedResult | undefined
    throw new Error(firstError?.reason?.message || 'Bybit trade sync failed.')
  }

  const importedTrades = [
    ...buildBybitSpotRoundTrips(spotTrades),
    ...buildBybitFuturesRoundTrips([
      ...linearTrades.map(trade => ({ ...trade, market: 'linear' as const })),
      ...inverseTrades.map(trade => ({ ...trade, market: 'inverse' as const }))
    ])
  ]
  const result = await importDedupedTrades(importedTrades, strategyId, tradeStore)

  return {
    ...result,
    checkedCount: spotTrades.length + linearTrades.length + inverseTrades.length,
    sourceLabel: environment === 'demo' ? 'Bybit Demo' : 'Bybit'
  }
}

const syncKrakenSpot = async (
  connection: StoredBrokerConnection,
  strategyId: string,
  tradeStore: BrokerTradeStorePort
): Promise<BrokerSyncResult> => {
  if (readBrokerEnvironment(connection) === 'demo') {
    throw new Error('Kraken Demo trade sync is available through Futures API only.')
  }

  const credentials = {
    apiKey: connection.credentials.apiKey || '',
    apiSecret: connection.credentials.apiSecret || ''
  }

  const response = await getKrakenTradesHistory(credentials, { type: 'all', trades: true })
  const fills = Object.entries(response.trades || {}).map(([tradeId, trade]) => ({ ...trade, tradeId }))

  const orderIds = Array.from(new Set(fills.map(f => f.ordertxid).filter(Boolean)))
  let ordersMap: Record<string, any> = {}
  try {
    if (orderIds.length > 0) {
      ordersMap = await getKrakenQueryOrders(credentials, orderIds)
    }
  } catch (err) {
    console.error('[BrokerSync][Kraken][Spot] Failed to query orders details:', err)
  }

  const roundTrips = buildKrakenSpotRoundTrips(fills, ordersMap)
  const result = await importDedupedTrades(roundTrips, strategyId, tradeStore)

  return {
    ...result,
    checkedCount: fills.length,
    sourceLabel: 'Kraken Spot'
  }
}

const syncKrakenFutures = async (
  connection: StoredBrokerConnection,
  strategyId: string,
  tradeStore: BrokerTradeStorePort
): Promise<BrokerSyncResult> => {
  const environment = readBrokerEnvironment(connection)
  const response = await getKrakenFuturesFills(withKrakenFuturesEnvironment({
    apiKey: connection.credentials.apiKey || '',
    apiSecret: connection.credentials.apiSecret || ''
  }, environment))
  const fills = response.fills || []
  const roundTrips = buildKrakenFuturesRoundTrips(fills)
  const result = await importDedupedTrades(roundTrips, strategyId, tradeStore)

  return {
    ...result,
    checkedCount: fills.length,
    sourceLabel: environment === 'demo' ? 'Kraken Futures Demo' : 'Kraken Futures'
  }
}

const importDedupedTrades = async (
  trades: ImportedTrade[],
  strategyId: string,
  tradeStore: BrokerTradeStorePort
) => {
  await tradeStore.init()
  const existingTrades = tradeStore.getAllTradesForStrategy(strategyId)
  const existingBySourceId = new Map(existingTrades
    .map(trade => [((trade as DiaryEntry & { sourceExternalId?: string }).sourceExternalId || ''), trade] as const)
    .filter(([sourceId]) => Boolean(sourceId)))

  let importedCount = 0
  let duplicateCount = 0

  for (const trade of trades) {
    const existingTrade = existingBySourceId.get(trade.sourceExternalId)
    if (existingTrade) {
      if (existingTrade.id && tradeStore.updateTrade) {
        await tradeStore.updateTrade(strategyId, existingTrade.id, trade)
      }
      duplicateCount++
      continue
    }

    await tradeStore.addTrade(strategyId, trade)
    existingBySourceId.set(trade.sourceExternalId, trade)
    importedCount++
  }

  return { importedCount, duplicateCount }
}

const buildBybitFuturesRoundTrips = (fills: Array<BybitExecution & { market: 'linear' | 'inverse' }>) => {
  type OpenLot = { fillId: string; side: 'Long' | 'Short'; date: Date; remainingQty: number; price: number; fee: number; market: string }
  const epsilon = 1e-10
  const openLotsBySymbol = new Map<string, OpenLot[]>()
  const activeCycleBySymbol = new Map<string, any>()
  const roundTrips: ImportedTrade[] = []

  fills
    .map(fill => {
      const isBuyer = fill.side === 'Buy'
      return {
        ...fill,
        priceNum: Number(fill.execPrice) || 0,
        qty: Number(fill.execQty || 0),
        feeNum: Number(fill.execFee || 0) || 0,
        timestamp: Number(fill.execTime) || 0,
        isBuyer
      }
    })
    .filter(fill => fill.symbol && fill.qty > epsilon && fill.priceNum > epsilon && Number.isFinite(fill.timestamp))
    .sort((left, right) => left.timestamp - right.timestamp)
    .forEach((fill) => {
      const closingSide = fill.isBuyer ? 'Short' : 'Long'
      const openingSide = fill.isBuyer ? 'Long' : 'Short'
      
      let lots = openLotsBySymbol.get(fill.symbol) || []
      let remainingQty = fill.qty

      while (remainingQty > epsilon && lots.length && lots[0]?.side === closingSide) {
        let cycle = activeCycleBySymbol.get(fill.symbol)
        if (!cycle) {
          cycle = {
            symbol: fill.symbol,
            side: lots[0].side,
            market: lots[0].market,
            firstEntryDate: null,
            lastExitDate: null,
            closedQty: 0,
            entryCost: 0,
            allocatedEntryFee: 0,
            exitRevenue: 0,
            exitFee: 0,
            consumedIds: new Set<string>(),
            closeLabels: new Set<string>(),
            executionsMap: new Map<string, any>()
          }
          activeCycleBySymbol.set(fill.symbol, cycle)
        }

        const currentLot = lots[0]!
        const matchedQty = Math.min(currentLot.remainingQty, remainingQty)
        const lotShare = matchedQty / currentLot.remainingQty
        
        cycle.firstEntryDate ||= currentLot.date
        cycle.closedQty += matchedQty
        
        if (cycle.market === 'inverse') {
            cycle.entryCost += matchedQty / currentLot.price
            cycle.exitRevenue += matchedQty / fill.priceNum
        } else {
            cycle.entryCost += matchedQty * currentLot.price
            cycle.exitRevenue += matchedQty * fill.priceNum
        }
        
        cycle.allocatedEntryFee += currentLot.fee * lotShare
        cycle.consumedIds.add(currentLot.fillId)

        const entryExecId = `entry-${currentLot.fillId}`
        if (cycle.executionsMap.has(entryExecId)) {
          cycle.executionsMap.get(entryExecId).size += matchedQty
        } else {
          cycle.executionsMap.set(entryExecId, {
            id: currentLot.fillId,
            type: 'entry',
            side: currentLot.side,
            price: currentLot.price,
            size: matchedQty,
            date: new Date(currentLot.date),
            label: 'SINGLE'
          })
        }

        cycle.lastExitDate = new Date(fill.timestamp)
        cycle.exitFee += fill.feeNum * (matchedQty / fill.qty)
        cycle.closeLabels.add(String(fill.execId))

        const exitExecId = `exit-${fill.execId}`
        if (cycle.executionsMap.has(exitExecId)) {
          cycle.executionsMap.get(exitExecId).size += matchedQty
        } else {
          cycle.executionsMap.set(exitExecId, {
            id: String(fill.execId),
            type: 'exit',
            side: 'Close',
            price: fill.priceNum,
            size: matchedQty,
            date: new Date(fill.timestamp),
            label: 'SINGLE'
          })
        }

        currentLot.remainingQty -= matchedQty
        currentLot.fee -= currentLot.fee * lotShare
        remainingQty -= matchedQty
        if (currentLot.remainingQty <= epsilon) lots.shift()

        if (lots.length === 0) {
          let profit = 0
          if (cycle.market === 'inverse') {
            // Inverse: Long profit = entryValue - exitValue
            profit = cycle.side === 'Long'
              ? cycle.entryCost - cycle.exitRevenue - cycle.allocatedEntryFee - cycle.exitFee
              : cycle.exitRevenue - cycle.entryCost - cycle.allocatedEntryFee - cycle.exitFee
          } else {
            // Linear: Long profit = exitValue - entryValue
            profit = cycle.side === 'Long'
              ? cycle.exitRevenue - cycle.entryCost - cycle.allocatedEntryFee - cycle.exitFee
              : cycle.entryCost - cycle.exitRevenue - cycle.allocatedEntryFee - cycle.exitFee
          }
            
          const resolvedAsset = resolveImportedAsset(cycle.symbol, 'crypto-broker')
          const avgEntry = cycle.market === 'inverse' ? cycle.closedQty / cycle.entryCost : cycle.entryCost / cycle.closedQty
          const avgExit = cycle.market === 'inverse' ? cycle.closedQty / cycle.exitRevenue : cycle.exitRevenue / cycle.closedQty

          roundTrips.push({
            id: `bybit-futures-close-${Array.from(cycle.closeLabels)[0]}`,
            date: (cycle.firstEntryDate ? (cycle.firstEntryDate instanceof Date ? cycle.firstEntryDate.toISOString() : cycle.firstEntryDate) : cycle.lastExitDate.toISOString()) as any,
            dateExit: cycle.lastExitDate.toISOString() as any,
            asset: resolvedAsset.symbol,
            side: cycle.side,
            entry: avgEntry,
            exit: avgExit,
            size: cycle.closedQty,
            entryFee: cycle.allocatedEntryFee,
            exitFee: cycle.exitFee,
            feeType: cycle.market === 'inverse' ? '%' : '$',
            currency: cycle.market === 'inverse' ? resolvedAsset.symbol : 'USDT',
            assetType: resolvedAsset.assetType,
            assetIcon: resolvedAsset.assetIcon,
            profitInCurrency: profit,
            result: profit,
            executions: Array.from(cycle.executionsMap.values()),
            notes: `Imported from Bybit ${cycle.market} Executions.\nOpenFills: ${Array.from(cycle.consumedIds).join(', ')}\nCloseFills: ${Array.from(cycle.closeLabels).join(', ')}\nAssetMatch: ${resolvedAsset.matchSource || 'none'}`,
            source: 'bybit-futures',
            sourceExternalId: `futures-close:${Array.from(cycle.closeLabels)[0]}`,
            sourcePlatform: 'Bybit V5'
          } as ImportedTrade)

          activeCycleBySymbol.delete(fill.symbol)
        }
      }

      if (remainingQty > epsilon) {
        lots.push({
          fillId: String(fill.execId),
          side: openingSide,
          date: new Date(fill.timestamp),
          remainingQty,
          price: fill.priceNum,
          fee: fill.feeNum * (remainingQty / fill.qty),
          market: fill.market
        })
      }

      openLotsBySymbol.set(fill.symbol, lots)
    })

  for (const [symbol, cycle] of activeCycleBySymbol.entries()) {
    if (cycle.closedQty > epsilon) {
      let profit = 0
      if (cycle.market === 'inverse') {
        // Inverse: Long profit = entryValue - exitValue
        profit = cycle.side === 'Long'
          ? cycle.entryCost - cycle.exitRevenue - cycle.allocatedEntryFee - cycle.exitFee
          : cycle.exitRevenue - cycle.entryCost - cycle.allocatedEntryFee - cycle.exitFee
      } else {
        // Linear: Long profit = exitValue - entryValue
        profit = cycle.side === 'Long'
          ? cycle.exitRevenue - cycle.entryCost - cycle.allocatedEntryFee - cycle.exitFee
          : cycle.entryCost - cycle.exitRevenue - cycle.allocatedEntryFee - cycle.exitFee
      }
        
      const resolvedAsset = resolveImportedAsset(cycle.symbol, 'crypto-broker')
      const avgEntry = cycle.market === 'inverse' ? cycle.closedQty / cycle.entryCost : cycle.entryCost / cycle.closedQty
      const avgExit = cycle.market === 'inverse' ? cycle.closedQty / cycle.exitRevenue : cycle.exitRevenue / cycle.closedQty

      roundTrips.push({
        id: `bybit-futures-close-${Array.from(cycle.closeLabels)[0]}`,
        date: (cycle.firstEntryDate ? (cycle.firstEntryDate instanceof Date ? cycle.firstEntryDate.toISOString() : cycle.firstEntryDate) : cycle.lastExitDate.toISOString()) as any,
        dateExit: cycle.lastExitDate.toISOString() as any,
        asset: resolvedAsset.symbol,
        side: cycle.side,
        entry: avgEntry,
        exit: avgExit,
        size: cycle.closedQty,
        entryFee: cycle.allocatedEntryFee,
        exitFee: cycle.exitFee,
        feeType: cycle.market === 'inverse' ? '%' : '$',
        currency: cycle.market === 'inverse' ? resolvedAsset.symbol : 'USDT',
        assetType: resolvedAsset.assetType,
        assetIcon: resolvedAsset.assetIcon,
        profitInCurrency: profit,
        result: profit,
        executions: Array.from(cycle.executionsMap.values()),
        notes: `Imported from Bybit ${cycle.market} Executions.\nOpenFills: ${Array.from(cycle.consumedIds).join(', ')}\nCloseFills: ${Array.from(cycle.closeLabels).join(', ')}\nAssetMatch: ${resolvedAsset.matchSource || 'none'}`,
        source: 'bybit-futures',
        sourceExternalId: `futures-close:${Array.from(cycle.closeLabels)[0]}`,
        sourcePlatform: 'Bybit V5'
      } as ImportedTrade)
    }
  }

  return roundTrips
}

const buildBybitSpotRoundTrips = (orders: BybitHistoricOrder[]) => {
  const fills = orders
    .filter(order => /Filled|PartiallyFilledCancelled/i.test(String(order.orderStatus || '')))
    .map(order => {
      const qty = Number(order.cumExecQty || 0)
      const value = Number(order.cumExecValue || 0)
      const avgPrice = Number(order.avgPrice || 0) || (qty > 0 ? value / qty : 0)
      return {
        id: order.orderId,
        symbol: String(order.symbol || '').toUpperCase(),
        side: order.side.toLowerCase() as 'buy' | 'sell',
        qty,
        price: avgPrice,
        fee: readBybitSpotFee(order),
        timestamp: Number(order.updatedTime || order.createdTime || 0),
        rawLabel: order.orderId
      }
    })
    .filter(fill => fill.symbol && fill.qty > 0 && fill.price > 0 && Number.isFinite(fill.timestamp))

  return buildLongSpotRoundTrips(fills, 'Bybit V5 Spot', 'bybit', 'spot-close')
}

const parseStopLossTakeProfitFromDescr = (closeDescr: string) => {
  let stopLoss: number | undefined
  let takeProfit: number | undefined

  if (!closeDescr || typeof closeDescr !== 'string') return { stopLoss, takeProfit }

  const slMatch = closeDescr.match(/stop\s*loss\s+(?:@\s*(?:limit|market)?\s*)?([0-9\.]+)/i)
  if (slMatch && slMatch[1]) {
    stopLoss = Number(slMatch[1])
  }

  const tpMatch = closeDescr.match(/take\s*profit\s+(?:@\s*(?:limit|market)?\s*)?([0-9\.]+)/i)
  if (tpMatch && tpMatch[1]) {
    takeProfit = Number(tpMatch[1])
  }

  return { stopLoss, takeProfit }
}

const buildKrakenSpotRoundTrips = (
  fills: Array<KrakenTrade & { tradeId: string }>,
  ordersMap: Record<string, any> = {}
) => {
  const normalized = fills
    .map(fill => {
      const qty = Number(fill.vol || 0)
      const cost = Number(fill.cost || 0)
      const price = Number(fill.price || 0) || (qty > 0 ? cost / qty : 0)
      return {
        id: fill.tradeId,
        ordertxid: fill.ordertxid,
        symbol: normalizeKrakenPair(fill.pair),
        side: fill.type,
        qty,
        price,
        fee: Number(fill.fee || 0) || 0,
        timestamp: parseKrakenSpotTimestamp(fill.time),
        rawLabel: fill.tradeId
      }
    })
    .filter(fill => fill.symbol && fill.qty > 0 && fill.price > 0)

  return buildLongSpotRoundTrips(normalized, 'Kraken Spot', 'kraken', 'spot-close', ordersMap)
}

const buildLongSpotRoundTrips = (
  fills: Array<{ id: string | number; ordertxid?: string; symbol: string; side: 'buy' | 'sell'; qty: number; price: number; fee: number; timestamp: number; rawLabel: string | number }>,
  platform: string,
  source: string,
  externalPrefix: string,
  ordersMap: Record<string, any> = {}
) => {
  type OpenLot = { id: string | number; ordertxid?: string; date: Date; remainingQty: number; price: number; fee: number }
  const epsilon = 1e-10
  const openLotsBySymbol = new Map<string, OpenLot[]>()
  const activeCycleBySymbol = new Map<string, any>()
  const roundTrips: ImportedTrade[] = []

  fills.sort((left, right) => left.timestamp - right.timestamp).forEach((fill) => {
    let cycle = activeCycleBySymbol.get(fill.symbol)
    if (!cycle) {
      cycle = {
        symbol: fill.symbol,
        firstEntryDate: null,
        lastExitDate: null,
        closedQty: 0,
        entryCost: 0,
        allocatedEntryFee: 0,
        exitRevenue: 0,
        exitFee: 0,
        consumedIds: new Set<string>(),
        closeLabels: new Set<string>(),
        executionsMap: new Map<string, any>(),
        firstEntryOrderId: null
      }
      activeCycleBySymbol.set(fill.symbol, cycle)
    }

    const lots = openLotsBySymbol.get(fill.symbol) || []
    if (fill.side === 'buy') {
      lots.push({ id: fill.id, ordertxid: fill.ordertxid, date: new Date(fill.timestamp).toISOString() as any, remainingQty: fill.qty, price: fill.price, fee: fill.fee })
      openLotsBySymbol.set(fill.symbol, lots)
      return
    }

    let remainingSellQty = fill.qty
    let consumedInThisFill = 0

    while (remainingSellQty > epsilon && lots.length) {
      const currentLot = lots[0]!
      const matchedQty = Math.min(currentLot.remainingQty, remainingSellQty)
      const lotShare = matchedQty / currentLot.remainingQty
      
      cycle.firstEntryDate ||= currentLot.date
      cycle.closedQty += matchedQty
      cycle.entryCost += matchedQty * currentLot.price
      cycle.allocatedEntryFee += currentLot.fee * lotShare
      cycle.consumedIds.add(String(currentLot.id))
      if (!cycle.firstEntryOrderId && currentLot.ordertxid) {
        cycle.firstEntryOrderId = currentLot.ordertxid
      }
      
      consumedInThisFill += matchedQty

      const execId = `entry-${currentLot.id}`
      if (cycle.executionsMap.has(execId)) {
        cycle.executionsMap.get(execId).size += matchedQty
      } else {
        cycle.executionsMap.set(execId, {
          id: String(currentLot.id),
          type: 'entry',
          side: 'Long',
          price: currentLot.price,
          size: matchedQty,
          date: new Date(currentLot.date),
          label: 'SINGLE'
        })
      }

      currentLot.remainingQty -= matchedQty
      currentLot.fee -= currentLot.fee * lotShare
      remainingSellQty -= matchedQty
      if (currentLot.remainingQty <= epsilon) lots.shift()
    }

    if (consumedInThisFill > epsilon) {
      cycle.lastExitDate = new Date(fill.timestamp)
      cycle.exitRevenue += consumedInThisFill * fill.price
      cycle.exitFee += fill.fee * (consumedInThisFill / fill.qty)
      cycle.closeLabels.add(String(fill.rawLabel))

      const execId = `exit-${fill.id}`
      if (cycle.executionsMap.has(execId)) {
        cycle.executionsMap.get(execId).size += consumedInThisFill
      } else {
        cycle.executionsMap.set(execId, {
          id: String(fill.id),
          type: 'exit',
          side: 'Close',
          price: fill.price,
          size: consumedInThisFill,
          date: new Date(fill.timestamp),
          label: 'SINGLE'
        })
      }
    }

    openLotsBySymbol.set(fill.symbol, lots)

    if (lots.length === 0 && cycle.closedQty > epsilon) {
      const profit = cycle.exitRevenue - cycle.entryCost - cycle.allocatedEntryFee - cycle.exitFee
      const resolvedAsset = resolveImportedAsset(cycle.symbol, 'crypto-broker')
      
      let stopLoss: number | undefined
      let takeProfit: number | undefined
      if (cycle.firstEntryOrderId && ordersMap[cycle.firstEntryOrderId]) {
        const order = ordersMap[cycle.firstEntryOrderId]
        const parsed = parseStopLossTakeProfitFromDescr(order.descr?.close)
        stopLoss = parsed.stopLoss
        takeProfit = parsed.takeProfit
      }

      roundTrips.push({
        id: `${source}-${externalPrefix}-${Array.from(cycle.closeLabels)[0]}`,
        date: (cycle.firstEntryDate ? (cycle.firstEntryDate instanceof Date ? cycle.firstEntryDate.toISOString() : cycle.firstEntryDate) : cycle.lastExitDate.toISOString()) as any,
        dateExit: cycle.lastExitDate.toISOString() as any,
        asset: resolvedAsset.symbol,
        side: 'Long',
        entry: cycle.entryCost / cycle.closedQty,
        exit: cycle.exitRevenue / cycle.closedQty,
        size: cycle.closedQty,
        entryFee: cycle.allocatedEntryFee,
        exitFee: cycle.exitFee,
        feeType: '$',
        currency: inferQuoteCurrency(cycle.symbol),
        assetType: resolvedAsset.assetType,
        assetIcon: resolvedAsset.assetIcon,
        profitInCurrency: profit,
        result: profit,
        stopLoss,
        takeProfit,
        executions: Array.from(cycle.executionsMap.values()),
        notes: `Imported from ${platform} round trip.\nOpenFills: ${Array.from(cycle.consumedIds).join(', ')}\nCloseFills: ${Array.from(cycle.closeLabels).join(', ')}\nAssetMatch: ${resolvedAsset.matchSource || 'none'}${stopLoss ? `\nStopLoss: ${stopLoss}` : ''}${takeProfit ? `\nTakeProfit: ${takeProfit}` : ''}`,
        source,
        sourceExternalId: `${externalPrefix}:${Array.from(cycle.closeLabels)[0]}`,
        sourcePlatform: platform
      } as ImportedTrade)
      
      activeCycleBySymbol.delete(fill.symbol)
    }
  })

  for (const [symbol, cycle] of activeCycleBySymbol.entries()) {
    if (cycle.closedQty > epsilon) {
      const profit = cycle.exitRevenue - cycle.entryCost - cycle.allocatedEntryFee - cycle.exitFee
      const resolvedAsset = resolveImportedAsset(cycle.symbol, 'crypto-broker')
      
      let stopLoss: number | undefined
      let takeProfit: number | undefined
      if (cycle.firstEntryOrderId && ordersMap[cycle.firstEntryOrderId]) {
        const order = ordersMap[cycle.firstEntryOrderId]
        const parsed = parseStopLossTakeProfitFromDescr(order.descr?.close)
        stopLoss = parsed.stopLoss
        takeProfit = parsed.takeProfit
      }

      roundTrips.push({
        id: `${source}-${externalPrefix}-${Array.from(cycle.closeLabels)[0]}`,
        date: (cycle.firstEntryDate ? (cycle.firstEntryDate instanceof Date ? cycle.firstEntryDate.toISOString() : cycle.firstEntryDate) : cycle.lastExitDate.toISOString()) as any,
        dateExit: cycle.lastExitDate.toISOString() as any,
        asset: resolvedAsset.symbol,
        side: 'Long',
        entry: cycle.entryCost / cycle.closedQty,
        exit: cycle.exitRevenue / cycle.closedQty,
        size: cycle.closedQty,
        entryFee: cycle.allocatedEntryFee,
        exitFee: cycle.exitFee,
        feeType: '$',
        currency: inferQuoteCurrency(cycle.symbol),
        assetType: resolvedAsset.assetType,
        assetIcon: resolvedAsset.assetIcon,
        profitInCurrency: profit,
        result: profit,
        stopLoss,
        takeProfit,
        executions: Array.from(cycle.executionsMap.values()),
        notes: `Imported from ${platform} round trip.\nOpenFills: ${Array.from(cycle.consumedIds).join(', ')}\nCloseFills: ${Array.from(cycle.closeLabels).join(', ')}\nAssetMatch: ${resolvedAsset.matchSource || 'none'}${stopLoss ? `\nStopLoss: ${stopLoss}` : ''}${takeProfit ? `\nTakeProfit: ${takeProfit}` : ''}`,
        source,
        sourceExternalId: `${externalPrefix}:${Array.from(cycle.closeLabels)[0]}`,
        sourcePlatform: platform
      } as ImportedTrade)
    }
  }

  return roundTrips
}

const buildKrakenFuturesRoundTrips = (fills: KrakenFuturesFill[]) => {
  type OpenLot = { fillId: string; side: 'Long' | 'Short'; date: Date; remainingQty: number; price: number; fee: number }
  const epsilon = 1e-10
  const openLotsBySymbol = new Map<string, OpenLot[]>()
  const activeCycleBySymbol = new Map<string, any>()
  const roundTrips: ImportedTrade[] = []

  fills
    .map(fill => ({
      ...fill,
      symbol: normalizeKrakenFuturesSymbol(fill.symbol),
      priceNum: Number(fill.price) || 0,
      qty: Number(fill.size || 0),
      feeNum: Number(fill.fee ?? fill.feePaid ?? 0) || 0,
      timestamp: parseKrakenFuturesTimestamp(readKrakenFuturesFillTimestamp(fill))
    }))
    .filter(fill => fill.symbol && fill.qty > epsilon && fill.priceNum > epsilon && Number.isFinite(fill.timestamp))
    .sort((left, right) => left.timestamp - right.timestamp)
    .forEach((fill) => {
      const closingSide = fill.side === 'buy' ? 'Short' : 'Long'
      const openingSide = fill.side === 'buy' ? 'Long' : 'Short'
      
      let lots = openLotsBySymbol.get(fill.symbol) || []
      let remainingQty = fill.qty

      while (remainingQty > epsilon && lots.length && lots[0]?.side === closingSide) {
        let cycle = activeCycleBySymbol.get(fill.symbol)
        if (!cycle) {
          cycle = {
            symbol: fill.symbol,
            side: lots[0].side,
            firstEntryDate: null,
            lastExitDate: null,
            closedQty: 0,
            entryCost: 0,
            allocatedEntryFee: 0,
            exitRevenue: 0,
            exitFee: 0,
            consumedIds: new Set<string>(),
            closeLabels: new Set<string>(),
            executionsMap: new Map<string, any>()
          }
          activeCycleBySymbol.set(fill.symbol, cycle)
        }

        const currentLot = lots[0]!
        const matchedQty = Math.min(currentLot.remainingQty, remainingQty)
        const lotShare = matchedQty / currentLot.remainingQty
        
        cycle.firstEntryDate ||= currentLot.date
        cycle.closedQty += matchedQty
        cycle.entryCost += matchedQty * currentLot.price
        cycle.allocatedEntryFee += currentLot.fee * lotShare
        cycle.consumedIds.add(currentLot.fillId)

        const entryExecId = `entry-${currentLot.fillId}`
        if (cycle.executionsMap.has(entryExecId)) {
          cycle.executionsMap.get(entryExecId).size += matchedQty
        } else {
          cycle.executionsMap.set(entryExecId, {
            id: currentLot.fillId,
            type: 'entry',
            side: currentLot.side,
            price: currentLot.price,
            size: matchedQty,
            date: new Date(currentLot.date),
            label: 'SINGLE'
          })
        }

        cycle.lastExitDate = new Date(fill.timestamp)
        cycle.exitRevenue += matchedQty * fill.priceNum
        cycle.exitFee += fill.feeNum * (matchedQty / fill.qty)
        cycle.closeLabels.add(fill.fill_id)

        const exitExecId = `exit-${fill.fill_id}`
        if (cycle.executionsMap.has(exitExecId)) {
          cycle.executionsMap.get(exitExecId).size += matchedQty
        } else {
          cycle.executionsMap.set(exitExecId, {
            id: fill.fill_id,
            type: 'exit',
            side: 'Close',
            price: fill.priceNum,
            size: matchedQty,
            date: new Date(fill.timestamp),
            label: 'SINGLE'
          })
        }

        currentLot.remainingQty -= matchedQty
        currentLot.fee -= currentLot.fee * lotShare
        remainingQty -= matchedQty
        if (currentLot.remainingQty <= epsilon) lots.shift()

        if (lots.length === 0) {
          const profit = cycle.side === 'Long'
            ? cycle.exitRevenue - cycle.entryCost - cycle.allocatedEntryFee - cycle.exitFee
            : cycle.entryCost - cycle.exitRevenue - cycle.allocatedEntryFee - cycle.exitFee
            
          const resolvedAsset = resolveImportedAsset(cycle.symbol, 'crypto-broker')

          roundTrips.push({
            id: `kraken-futures-close-${Array.from(cycle.closeLabels)[0]}`,
            date: (cycle.firstEntryDate ? (cycle.firstEntryDate instanceof Date ? cycle.firstEntryDate.toISOString() : cycle.firstEntryDate) : cycle.lastExitDate.toISOString()) as any,
            dateExit: cycle.lastExitDate.toISOString() as any,
            asset: resolvedAsset.symbol,
            side: cycle.side,
            entry: cycle.entryCost / cycle.closedQty,
            exit: cycle.exitRevenue / cycle.closedQty,
            size: cycle.closedQty,
            entryFee: cycle.allocatedEntryFee,
            exitFee: cycle.exitFee,
            feeType: '$',
            currency: inferQuoteCurrency(cycle.symbol),
            assetType: resolvedAsset.assetType,
            assetIcon: resolvedAsset.assetIcon,
            profitInCurrency: profit,
            result: profit,
            executions: Array.from(cycle.executionsMap.values()),
            notes: `Imported from Kraken Futures.\nOpenFills: ${Array.from(cycle.consumedIds).join(', ')}\nCloseFills: ${Array.from(cycle.closeLabels).join(', ')}\nAssetMatch: ${resolvedAsset.matchSource || 'none'}`,
            source: 'kraken-futures',
            sourceExternalId: `futures-close:${Array.from(cycle.closeLabels)[0]}`,
            sourcePlatform: 'Kraken Futures'
          } as ImportedTrade)

          activeCycleBySymbol.delete(fill.symbol)
        }
      }

      if (remainingQty > epsilon) {
        lots.push({
          fillId: fill.fill_id,
          side: openingSide,
          date: new Date(fill.timestamp),
          remainingQty,
          price: fill.priceNum,
          fee: fill.feeNum * (remainingQty / fill.qty)
        })
      }

      openLotsBySymbol.set(fill.symbol, lots)
    })

  for (const [symbol, cycle] of activeCycleBySymbol.entries()) {
    if (cycle.closedQty > epsilon) {
      const profit = cycle.side === 'Long'
        ? cycle.exitRevenue - cycle.entryCost - cycle.allocatedEntryFee - cycle.exitFee
        : cycle.entryCost - cycle.exitRevenue - cycle.allocatedEntryFee - cycle.exitFee
        
      const resolvedAsset = resolveImportedAsset(cycle.symbol, 'crypto-broker')

      roundTrips.push({
        id: `kraken-futures-close-${Array.from(cycle.closeLabels)[0]}`,
        date: (cycle.firstEntryDate ? (cycle.firstEntryDate instanceof Date ? cycle.firstEntryDate.toISOString() : cycle.firstEntryDate) : cycle.lastExitDate.toISOString()) as any,
        dateExit: cycle.lastExitDate.toISOString() as any,
        asset: resolvedAsset.symbol,
        side: cycle.side,
        entry: cycle.entryCost / cycle.closedQty,
        exit: cycle.exitRevenue / cycle.closedQty,
        size: cycle.closedQty,
        entryFee: cycle.allocatedEntryFee,
        exitFee: cycle.exitFee,
        feeType: '$',
        currency: inferQuoteCurrency(cycle.symbol),
        assetType: resolvedAsset.assetType,
        assetIcon: resolvedAsset.assetIcon,
        profitInCurrency: profit,
        result: profit,
        executions: Array.from(cycle.executionsMap.values()),
        notes: `Imported from Kraken Futures.\nOpenFills: ${Array.from(cycle.consumedIds).join(', ')}\nCloseFills: ${Array.from(cycle.closeLabels).join(', ')}\nAssetMatch: ${resolvedAsset.matchSource || 'none'}`,
        source: 'kraken-futures',
        sourceExternalId: `futures-close:${Array.from(cycle.closeLabels)[0]}`,
        sourcePlatform: 'Kraken Futures'
      } as ImportedTrade)
    }
  }

  return roundTrips
}

const readBybitSpotFee = (order: BybitHistoricOrder) => {
  const detail = order.cumFeeDetail
  if (detail && typeof detail === 'object') {
    return Object.values(detail)
      .map(value => Number(value || 0))
      .filter(Number.isFinite)
      .reduce((sum, value) => sum + value, 0)
  }

  return Number(order.cumExecFee || 0) || 0
}

const normalizeKrakenPair = (pair: string) => {
  return String(pair || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/^XXBT/, 'BTC')
    .replace(/^XBT/, 'BTC')
    .replace(/^XETH/, 'ETH')
    .replace(/^X(?=[A-Z0-9]{3,})/, '')
    .replace(/^Z(?=[A-Z0-9]{3,})/, '')
    .replace(/XXBT$/, 'BTC')
    .replace(/XBT$/, 'BTC')
    .replace(/ZUSD$/, 'USD')
    .replace(/ZEUR$/, 'EUR')
    .replace(/ZGBP$/, 'GBP')
}

const safeParseDateStr = (val: string | number) => {
  let str = String(val || '').trim()
  // Replace space with T
  str = str.replace(' ', 'T')
  // Truncate microseconds (e.g. .123456 -> .123) which break Safari Date.parse
  str = str.replace(/(\.\d{3})\d+(Z|[\+\-]\d{2}:?\d{2})?$/, '$1$2')
  // Append 'Z' to ISO strings missing timezone offset
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)) {
    str += 'Z'
  }
  return str
}

const parseKrakenSpotTimestamp = (value: number | string) => {
  const str = String(value || '').trim()
  if (/^\d+(\.\d+)?$/.test(str)) {
    const numeric = Number(str)
    return numeric > 1_000_000_000_000 ? numeric : numeric * 1000
  }

  const parsed = Date.parse(safeParseDateStr(value))
  if (Number.isFinite(parsed) && !isNaN(parsed)) return parsed

  return Number.NaN
}

const readKrakenFuturesFillTimestamp = (fill: KrakenFuturesFill) => {
  const candidates = [fill.fillTime, fill.fill_time, fill.time, fill.timestamp, fill.lastUpdateTimestamp]
    .filter(value => value !== undefined && value !== null && value !== '') as Array<string | number>

  return candidates.find(hasIntradayTimestampPrecision) ?? candidates[0] ?? ''
}

const parseKrakenFuturesTimestamp = (value: string | number) => {
  const str = String(value || '').trim()
  if (/^\d+(\.\d+)?$/.test(str)) {
    const numeric = Number(str)
    return numeric > 1_000_000_000_000 ? numeric : numeric * 1000
  }

  const parsed = Date.parse(safeParseDateStr(value))
  if (Number.isFinite(parsed) && !isNaN(parsed)) return parsed

  return Number.NaN
}

const hasIntradayTimestampPrecision = (value: string | number) => {
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 0) return true

  const parsed = Date.parse(safeParseDateStr(value))
  if (!Number.isFinite(parsed) || isNaN(parsed)) return false

  const date = new Date(parsed)
  return date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0 || date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0
}

const normalizeKrakenFuturesSymbol = (symbol: string) => {
  const normalized = String(symbol || '').toUpperCase().replace(/[^A-Z0-9_]/g, '')
  return normalized
    .replace(/^PF_/, '')
    .replace(/^FI_/, '')
    .replace(/_[0-9]{6,8}$/, '')
    .replace(/^XBT/, 'BTC')
    .replace(/XBT/, 'BTC')
}

const inferQuoteCurrency = (symbol: string) => {
  const quotes = ['USDT', 'USDC', 'USD', 'EUR', 'GBP', 'BTC', 'ETH']
  return quotes.find(quote => symbol.endsWith(quote)) || 'USD'
}

const syncBinance = async (
  connection: StoredBrokerConnection,
  strategyId: string,
  tradeStore: BrokerTradeStorePort
): Promise<BrokerSyncResult> => {
  const credentials = {
    apiKey: connection.credentials.apiKey || '',
    apiSecret: connection.credentials.apiSecret || ''
  }
  const environment = readBrokerEnvironment(connection)
  const scopedCredentials = withBinanceEnvironment(credentials, environment)

  const response = await getBinanceUsdMFuturesTrades(scopedCredentials)
  const roundTrips = buildBinanceFuturesRoundTrips(response)

  const result = await importDedupedTrades(roundTrips, strategyId, tradeStore)

  return {
    ...result,
    checkedCount: response.length,
    sourceLabel: environment === 'demo' ? 'Binance Futures Demo' : 'Binance Futures'
  }
}

const buildBinanceFuturesRoundTrips = (fills: BinanceFuturesTrade[]) => {
  type OpenLot = { fillId: string; side: 'Long' | 'Short'; date: Date; remainingQty: number; price: number; fee: number }
  const epsilon = 1e-10
  const openLotsBySymbol = new Map<string, OpenLot[]>()
  const activeCycleBySymbol = new Map<string, any>()
  const roundTrips: ImportedTrade[] = []

  fills
    .map(fill => {
      const isBuyer = fill.buyer !== undefined ? fill.buyer : fill.side === 'BUY'
      return {
        ...fill,
        priceNum: Number(fill.price) || 0,
        qty: Number(fill.qty || 0),
        feeNum: Number(fill.commission || 0) || 0,
        timestamp: Number(fill.time) || 0,
        isBuyer
      }
    })
    .filter(fill => fill.symbol && fill.qty > epsilon && fill.priceNum > epsilon && Number.isFinite(fill.timestamp))
    .sort((left, right) => left.timestamp - right.timestamp)
    .forEach((fill) => {
      const closingSide = fill.isBuyer ? 'Short' : 'Long'
      const openingSide = fill.isBuyer ? 'Long' : 'Short'
      
      let lots = openLotsBySymbol.get(fill.symbol) || []
      let remainingQty = fill.qty

      while (remainingQty > epsilon && lots.length && lots[0]?.side === closingSide) {
        let cycle = activeCycleBySymbol.get(fill.symbol)
        if (!cycle) {
          cycle = {
            symbol: fill.symbol,
            side: lots[0].side,
            firstEntryDate: null,
            lastExitDate: null,
            closedQty: 0,
            entryCost: 0,
            allocatedEntryFee: 0,
            exitRevenue: 0,
            exitFee: 0,
            consumedIds: new Set<string>(),
            closeLabels: new Set<string>(),
            executionsMap: new Map<string, any>()
          }
          activeCycleBySymbol.set(fill.symbol, cycle)
        }

        const currentLot = lots[0]!
        const matchedQty = Math.min(currentLot.remainingQty, remainingQty)
        const lotShare = matchedQty / currentLot.remainingQty
        
        cycle.firstEntryDate ||= currentLot.date
        cycle.closedQty += matchedQty
        cycle.entryCost += matchedQty * currentLot.price
        cycle.allocatedEntryFee += currentLot.fee * lotShare
        cycle.consumedIds.add(currentLot.fillId)

        const entryExecId = `entry-${currentLot.fillId}`
        if (cycle.executionsMap.has(entryExecId)) {
          cycle.executionsMap.get(entryExecId).size += matchedQty
        } else {
          cycle.executionsMap.set(entryExecId, {
            id: currentLot.fillId,
            type: 'entry',
            side: currentLot.side,
            price: currentLot.price,
            size: matchedQty,
            date: new Date(currentLot.date),
            label: 'SINGLE'
          })
        }

        cycle.lastExitDate = new Date(fill.timestamp)
        cycle.exitRevenue += matchedQty * fill.priceNum
        cycle.exitFee += fill.feeNum * (matchedQty / fill.qty)
        cycle.closeLabels.add(String(fill.id))

        const exitExecId = `exit-${fill.id}`
        if (cycle.executionsMap.has(exitExecId)) {
          cycle.executionsMap.get(exitExecId).size += matchedQty
        } else {
          cycle.executionsMap.set(exitExecId, {
            id: String(fill.id),
            type: 'exit',
            side: 'Close',
            price: fill.priceNum,
            size: matchedQty,
            date: new Date(fill.timestamp),
            label: 'SINGLE'
          })
        }

        currentLot.remainingQty -= matchedQty
        currentLot.fee -= currentLot.fee * lotShare
        remainingQty -= matchedQty
        if (currentLot.remainingQty <= epsilon) lots.shift()

        if (lots.length === 0) {
          const profit = cycle.side === 'Long'
            ? cycle.exitRevenue - cycle.entryCost - cycle.allocatedEntryFee - cycle.exitFee
            : cycle.entryCost - cycle.exitRevenue - cycle.allocatedEntryFee - cycle.exitFee
            
          const resolvedAsset = resolveImportedAsset(cycle.symbol, 'crypto-broker')

          roundTrips.push({
            id: `binance-futures-close-${Array.from(cycle.closeLabels)[0]}`,
            date: (cycle.firstEntryDate ? (cycle.firstEntryDate instanceof Date ? cycle.firstEntryDate.toISOString() : cycle.firstEntryDate) : cycle.lastExitDate.toISOString()) as any,
            dateExit: cycle.lastExitDate.toISOString() as any,
            asset: resolvedAsset.symbol,
            side: cycle.side,
            entry: cycle.entryCost / cycle.closedQty,
            exit: cycle.exitRevenue / cycle.closedQty,
            size: cycle.closedQty,
            entryFee: cycle.allocatedEntryFee,
            exitFee: cycle.exitFee,
            feeType: '$',
            currency: fill.marginAsset || inferQuoteCurrency(cycle.symbol),
            assetType: resolvedAsset.assetType,
            assetIcon: resolvedAsset.assetIcon,
            profitInCurrency: profit,
            result: profit,
            executions: Array.from(cycle.executionsMap.values()),
            notes: `Imported from Binance USD-M Futures.\nOpenFills: ${Array.from(cycle.consumedIds).join(', ')}\nCloseFills: ${Array.from(cycle.closeLabels).join(', ')}\nAssetMatch: ${resolvedAsset.matchSource || 'none'}`,
            source: 'binance-futures',
            sourceExternalId: `futures-close:${Array.from(cycle.closeLabels)[0]}`,
            sourcePlatform: 'Binance Futures'
          } as ImportedTrade)

          activeCycleBySymbol.delete(fill.symbol)
        }
      }

      if (remainingQty > epsilon) {
        lots.push({
          fillId: String(fill.id),
          side: openingSide,
          date: new Date(fill.timestamp),
          remainingQty,
          price: fill.priceNum,
          fee: fill.feeNum * (remainingQty / fill.qty)
        })
      }

      openLotsBySymbol.set(fill.symbol, lots)
    })

  for (const [symbol, cycle] of activeCycleBySymbol.entries()) {
    if (cycle.closedQty > epsilon) {
      const profit = cycle.side === 'Long'
        ? cycle.exitRevenue - cycle.entryCost - cycle.allocatedEntryFee - cycle.exitFee
        : cycle.entryCost - cycle.exitRevenue - cycle.allocatedEntryFee - cycle.exitFee
        
      const resolvedAsset = resolveImportedAsset(cycle.symbol, 'crypto-broker')

      roundTrips.push({
        id: `binance-futures-close-${Array.from(cycle.closeLabels)[0]}`,
        date: (cycle.firstEntryDate ? (cycle.firstEntryDate instanceof Date ? cycle.firstEntryDate.toISOString() : cycle.firstEntryDate) : cycle.lastExitDate.toISOString()) as any,
        dateExit: cycle.lastExitDate.toISOString() as any,
        asset: resolvedAsset.symbol,
        side: cycle.side,
        entry: cycle.entryCost / cycle.closedQty,
        exit: cycle.exitRevenue / cycle.closedQty,
        size: cycle.closedQty,
        entryFee: cycle.allocatedEntryFee,
        exitFee: cycle.exitFee,
        feeType: '$',
        currency: inferQuoteCurrency(cycle.symbol),
        assetType: resolvedAsset.assetType,
        assetIcon: resolvedAsset.assetIcon,
        profitInCurrency: profit,
        result: profit,
        executions: Array.from(cycle.executionsMap.values()),
        notes: `Imported from Binance USD-M Futures.\nOpenFills: ${Array.from(cycle.consumedIds).join(', ')}\nCloseFills: ${Array.from(cycle.closeLabels).join(', ')}\nAssetMatch: ${resolvedAsset.matchSource || 'none'}`,
        source: 'binance-futures',
        sourceExternalId: `futures-close:${Array.from(cycle.closeLabels)[0]}`,
        sourcePlatform: 'Binance Futures'
      } as ImportedTrade)
    }
  }

  return roundTrips
}

const syncInteractiveBrokers = async (
  connection: StoredBrokerConnection,
  strategyId: string,
  tradeStore: BrokerTradeStorePort
): Promise<BrokerSyncResult> => {
  const token = connection.credentials.apiKey || connection.credentials.token || ''
  const queryId = connection.credentials.apiSecret || connection.credentials.queryId || ''
  
  if (!token || !queryId) {
    throw new Error('Interactive Brokers requires a Flex Query Token and Query ID.')
  }

  const statementDoc = await getIbkrFlexStatement(token, queryId)
  
  const accountInfo = statementDoc.querySelector('AccountInformation')
  const cashReport = statementDoc.querySelector('CashReport')
  const openPositions = statementDoc.querySelector('OpenPositions')
  const tradesNode = statementDoc.querySelector('Trades')

  if (accountInfo) 
  if (cashReport) 
  if (openPositions) 
  if (tradesNode) {
  } else {
  }

  const trades = Array.from(statementDoc.querySelectorAll('Trade'))
  
  const parsedTrades = trades.map(node => {
    const dateTimeStr = node.getAttribute('dateTime') || ''
    const [datePart, timePart] = dateTimeStr.split(';')
    let timestamp = 0
    if (datePart && timePart) {
      const isoStr = `${datePart.slice(0,4)}-${datePart.slice(4,6)}-${datePart.slice(6,8)}T${timePart.slice(0,2)}:${timePart.slice(2,4)}:${timePart.slice(4,6)}Z`
      timestamp = new Date(isoStr).getTime()
    } else {
      const fallbackDate = node.getAttribute('tradeDate') || ''
      const fallbackTime = node.getAttribute('tradeTime') || '000000'
      if (fallbackDate) {
        const isoStr = `${fallbackDate.slice(0,4)}-${fallbackDate.slice(4,6)}-${fallbackDate.slice(6,8)}T${fallbackTime.slice(0,2)}:${fallbackTime.slice(2,4)}:${fallbackTime.slice(4,6)}Z`
        timestamp = new Date(isoStr).getTime()
      }
    }

    return {
      id: node.getAttribute('ibExecID') || node.getAttribute('tradeID') || String(Math.random()),
      symbol: node.getAttribute('symbol') || '',
      side: node.getAttribute('buySell') === 'BUY' ? 'buy' as const : 'sell' as const,
      qty: Math.abs(Number(node.getAttribute('quantity') || 0)),
      priceNum: Number(node.getAttribute('tradePrice') || 0),
      feeNum: Math.abs(Number(node.getAttribute('ibCommission') || 0)),
      timestamp,
      market: node.getAttribute('assetCategory') || 'STK'
    }
  }).filter(t => t.symbol && t.qty > 0 && t.priceNum > 0 && Number.isFinite(t.timestamp))

  const roundTrips = buildIbkrRoundTrips(parsedTrades)
  const result = await importDedupedTrades(roundTrips, strategyId, tradeStore)

  return {
    ...result,
    checkedCount: parsedTrades.length,
    sourceLabel: 'Interactive Brokers'
  }
}

const buildIbkrRoundTrips = (fills: Array<{ id: string, symbol: string, side: 'buy' | 'sell', qty: number, priceNum: number, feeNum: number, timestamp: number, market: string }>) => {
  type OpenLot = { fillId: string; side: 'Long' | 'Short'; date: Date; remainingQty: number; price: number; fee: number; market: string }
  const epsilon = 1e-10
  const openLotsBySymbol = new Map<string, OpenLot[]>()
  const activeCycleBySymbol = new Map<string, any>()
  const roundTrips: ImportedTrade[] = []

  fills
    .sort((left, right) => left.timestamp - right.timestamp)
    .forEach((fill) => {
      const closingSide = fill.side === 'buy' ? 'Short' : 'Long'
      const openingSide = fill.side === 'buy' ? 'Long' : 'Short'
      
      let lots = openLotsBySymbol.get(fill.symbol) || []
      let remainingQty = fill.qty

      while (remainingQty > epsilon && lots.length && lots[0]?.side === closingSide) {
        let cycle = activeCycleBySymbol.get(fill.symbol)
        if (!cycle) {
          cycle = {
            symbol: fill.symbol,
            side: lots[0].side,
            market: lots[0].market,
            firstEntryDate: null,
            lastExitDate: null,
            closedQty: 0,
            entryCost: 0,
            allocatedEntryFee: 0,
            exitRevenue: 0,
            exitFee: 0,
            consumedIds: new Set<string>(),
            closeLabels: new Set<string>(),
            executionsMap: new Map<string, any>()
          }
          activeCycleBySymbol.set(fill.symbol, cycle)
        }

        const currentLot = lots[0]!
        const matchedQty = Math.min(currentLot.remainingQty, remainingQty)
        const lotShare = matchedQty / currentLot.remainingQty
        
        cycle.firstEntryDate ||= currentLot.date
        cycle.closedQty += matchedQty
        cycle.entryCost += matchedQty * currentLot.price
        cycle.allocatedEntryFee += currentLot.fee * lotShare
        cycle.consumedIds.add(currentLot.fillId)

        const entryExecId = `entry-${currentLot.fillId}`
        if (cycle.executionsMap.has(entryExecId)) {
          cycle.executionsMap.get(entryExecId).size += matchedQty
        } else {
          cycle.executionsMap.set(entryExecId, {
            id: currentLot.fillId,
            type: 'entry',
            side: currentLot.side,
            price: currentLot.price,
            size: matchedQty,
            date: new Date(currentLot.date),
            label: 'SINGLE'
          })
        }

        cycle.lastExitDate = new Date(fill.timestamp)
        cycle.exitRevenue += matchedQty * fill.priceNum
        cycle.exitFee += fill.feeNum * (matchedQty / fill.qty)
        cycle.closeLabels.add(fill.id)

        const exitExecId = `exit-${fill.id}`
        if (cycle.executionsMap.has(exitExecId)) {
          cycle.executionsMap.get(exitExecId).size += matchedQty
        } else {
          cycle.executionsMap.set(exitExecId, {
            id: fill.id,
            type: 'exit',
            side: 'Close',
            price: fill.priceNum,
            size: matchedQty,
            date: new Date(fill.timestamp),
            label: 'SINGLE'
          })
        }

        currentLot.remainingQty -= matchedQty
        currentLot.fee -= currentLot.fee * lotShare
        remainingQty -= matchedQty
        if (currentLot.remainingQty <= epsilon) lots.shift()

        if (lots.length === 0) {
          const profit = cycle.side === 'Long'
            ? cycle.exitRevenue - cycle.entryCost - cycle.allocatedEntryFee - cycle.exitFee
            : cycle.entryCost - cycle.exitRevenue - cycle.allocatedEntryFee - cycle.exitFee
            
          const resolvedAsset = resolveImportedAsset(cycle.symbol, 'crypto-broker')

          roundTrips.push({
            id: `ibkr-close-${Array.from(cycle.closeLabels)[0]}`,
            date: (cycle.firstEntryDate ? (cycle.firstEntryDate instanceof Date ? cycle.firstEntryDate.toISOString() : cycle.firstEntryDate) : cycle.lastExitDate.toISOString()) as any,
            dateExit: cycle.lastExitDate.toISOString() as any,
            asset: cycle.symbol,
            side: cycle.side,
            entry: cycle.entryCost / cycle.closedQty,
            exit: cycle.exitRevenue / cycle.closedQty,
            size: cycle.closedQty,
            entryFee: cycle.allocatedEntryFee,
            exitFee: cycle.exitFee,
            feeType: '$',
            currency: 'USD',
            assetType: cycle.market === 'CASH' ? 'Forex' : cycle.market === 'STK' || cycle.market === 'OPT' ? 'Stocks' : 'Crypto',
            assetIcon: resolvedAsset.assetIcon,
            profitInCurrency: profit,
            result: profit,
            executions: Array.from(cycle.executionsMap.values()),
            notes: `Imported from IBKR.\nOpenFills: ${Array.from(cycle.consumedIds).join(', ')}\nCloseFills: ${Array.from(cycle.closeLabels).join(', ')}`,
            source: 'interactive-brokers',
            sourceExternalId: `ibkr-close:${Array.from(cycle.closeLabels)[0]}`,
            sourcePlatform: 'Interactive Brokers'
          } as ImportedTrade)

          activeCycleBySymbol.delete(fill.symbol)
        }
      }

      if (remainingQty > epsilon) {
        lots.push({
          fillId: fill.id,
          side: openingSide,
          date: new Date(fill.timestamp),
          remainingQty,
          price: fill.priceNum,
          fee: fill.feeNum * (remainingQty / fill.qty),
          market: fill.market
        })
      }

      openLotsBySymbol.set(fill.symbol, lots)
    })

  for (const [symbol, cycle] of activeCycleBySymbol.entries()) {
    if (cycle.closedQty > epsilon) {
      const profit = cycle.side === 'Long'
        ? cycle.exitRevenue - cycle.entryCost - cycle.allocatedEntryFee - cycle.exitFee
        : cycle.entryCost - cycle.exitRevenue - cycle.allocatedEntryFee - cycle.exitFee
        
      const resolvedAsset = resolveImportedAsset(cycle.symbol, 'crypto-broker')

      roundTrips.push({
        id: `ibkr-close-${Array.from(cycle.closeLabels)[0]}`,
        date: (cycle.firstEntryDate ? (cycle.firstEntryDate instanceof Date ? cycle.firstEntryDate.toISOString() : cycle.firstEntryDate) : cycle.lastExitDate.toISOString()) as any,
        dateExit: cycle.lastExitDate.toISOString() as any,
        asset: cycle.symbol,
        side: cycle.side,
        entry: cycle.entryCost / cycle.closedQty,
        exit: cycle.exitRevenue / cycle.closedQty,
        size: cycle.closedQty,
        entryFee: cycle.allocatedEntryFee,
        exitFee: cycle.exitFee,
        feeType: '$',
        currency: 'USD',
        assetType: cycle.market === 'CASH' ? 'Forex' : cycle.market === 'STK' || cycle.market === 'OPT' ? 'Stocks' : 'Crypto',
        assetIcon: resolvedAsset.assetIcon,
        profitInCurrency: profit,
        result: profit,
        executions: Array.from(cycle.executionsMap.values()),
        notes: `Imported from IBKR.\nOpenFills: ${Array.from(cycle.consumedIds).join(', ')}\nCloseFills: ${Array.from(cycle.closeLabels).join(', ')}`,
        source: 'interactive-brokers',
        sourceExternalId: `ibkr-close:${Array.from(cycle.closeLabels)[0]}`,
        sourcePlatform: 'Interactive Brokers'
      } as ImportedTrade)
    }
  }

  return roundTrips
}
