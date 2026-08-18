import { getTradeCashPnl } from './tradePnl'

export type TradeProfitabilityScore = {
  score: number
  rawScore: number
  outcomeScore: number
}

const getTradeId = (trade: any) => String(trade?.id || '')

export const getTradePnlForScore = (trade: any, initialDeposit = 1000) => {
  return getTradeCashPnl(trade, initialDeposit)
}

const EMOTION_SCORE_WEIGHTS: Record<string, number> = {
  CONFIDENCE: 10,
  PATIENCE: 15,
  DISCIPLINE: 20,
  FOMO: -20,
  GREED: -25,
  REVENGE: -30,
  FEAR: -15,
  TILT: -40,
  ANXIETY: -15
}

const getEmotionNameForScore = (emotion: any) => {
  if (!emotion) return ''
  if (typeof emotion === 'string') return emotion
  return String(emotion?.name || emotion?.id || emotion?.label || '')
}

const getEmotionAdjustment = (trade: any) => {
  const emotions = Array.isArray(trade?.emotions) ? trade.emotions : []
  return emotions.reduce((sum: number, emotion: any) => {
    const key = getEmotionNameForScore(emotion).toUpperCase()
    return sum + (EMOTION_SCORE_WEIGHTS[key] || 0)
  }, 0)
}

const percentileScore = (value: number, values: number[]) => {
  if (!values.length || !Number.isFinite(value)) return 50
  if (values.length === 1) return 50
  const sorted = values.slice().sort((a, b) => a - b)
  if (sorted[0] === sorted[sorted.length - 1]) return 50
  const lower = sorted.filter(item => item < value).length
  return Math.round((lower / values.length) * 100)
}

export const buildTradeProfitabilityScoreIndex = (trades: any[], initialDeposit = 1000) => {
  const closedTrades = Array.isArray(trades) ? trades.filter(Boolean) : []
  const index = new Map<any, TradeProfitabilityScore>()

  const rows = closedTrades.map(trade => {
    const pnlScore = getTradePnlForScore(trade, initialDeposit || 1000)
    const rawScore = pnlScore + getEmotionAdjustment(trade)

    return {
      trade,
      rawScore,
      outcomeScore: pnlScore
    }
  })

  const rawScores = rows.map(row => row.rawScore)

  rows.forEach(row => {
    const score = percentileScore(row.rawScore, rawScores)
    const value: TradeProfitabilityScore = {
      score,
      rawScore: row.rawScore,
      outcomeScore: row.outcomeScore
    }
    const id = getTradeId(row.trade)
    if (id) index.set(id, value)
    index.set(row.trade, value)
  })

  return index
}
