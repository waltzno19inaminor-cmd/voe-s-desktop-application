import { isClosedTradeForMetrics } from '~/widgets/genesis/model/tradePnl'
import { riskValueToDollars, type RiskManagementData } from '~/widgets/genesis/model/riskManagement'
import { getTradePlannedStopRiskDollars } from '~/widgets/genesis/model/tradeRisk'
import { getTradeDurationDays, getTradePnl, type TradeLike } from './tradeMetrics'

export const GENESIS_EMOTION_WEIGHTS: Record<string, number> = {
  CALMNESS: 15, DISCIPLINE: 25, FOCUS: 20, PATIENCE: 15, CONFIDENCE: 15,
  HOPE: -10, BOREDOM: -10, FATIGUE: -15, FOMO: -20, REVENGE: -30,
  GREED: -20, FEAR: -20, TILT: -40, ANXIETY: -15
}

export const getEmotionName = (emotion: any) => String(typeof emotion === 'string' ? emotion : emotion?.name || '').toUpperCase()
export const getEmotionWeight = (emotion: any) => GENESIS_EMOTION_WEIGHTS[getEmotionName(emotion)] || 0

export const getTradeRiskComponents = (trade: TradeLike, initialCapital = 1000) => {
  const configuredRisk = Number(trade?.risk)
  const hasConfiguredRisk = Number.isFinite(configuredRisk) && configuredRisk > 0
  const priceRisk = getTradePlannedStopRiskDollars(trade)
  const positionRisk = Math.max(hasConfiguredRisk ? configuredRisk : 0, Number.isFinite(priceRisk) ? priceRisk : 0)
  const pnl = getTradePnl(trade, initialCapital)
  return {
    configuredRisk: hasConfiguredRisk ? configuredRisk : 0,
    priceRisk,
    positionRisk,
    realizedLoss: pnl < 0 ? Math.abs(pnl) : 0
  }
}

const getStyleLimits = (extraType: number | null) => {
  if (extraType === 0) return { max: 1, maxExclusive: true }
  if (extraType === 1) return { min: 1, max: 14 }
  if (extraType === 2) return { min: 14 }
  return null
}

const isStyleCompliant = (trade: TradeLike, extraType: number | null) => {
  if (extraType === null || extraType === undefined) return true
  const durationDays = getTradeDurationDays(trade)
  if (!Number.isFinite(durationDays)) return false
  const limits = getStyleLimits(extraType)
  if (!limits) return true
  if (limits.min !== undefined && durationDays < limits.min) return false
  if (limits.max !== undefined && (limits.maxExclusive ? durationDays >= limits.max : durationDays > limits.max)) return false
  return true
}

export interface ComplianceAudit {
  stats: { riskPerTrade: number; riskPerSession: number; tradingStyle: number }
  violations: {
    violatingTrades: any[]
    violatingSessions: any[]
    violatingStyleTrades: any[]
    violatingNeuralTrades: any[]
  }
  emotional: { score: number; label: 'NEGATIVE' | 'POSITIVE' | 'NEUTRAL' }
}

export const buildComplianceAudit = ({
  trades,
  initialCapital,
  riskManagement,
  emotionWeights = GENESIS_EMOTION_WEIGHTS,
  getDurationLabel,
  getExpectedStyleLabel,
  getNeuralReason
}: {
  trades: TradeLike[]
  initialCapital: number
  riskManagement: RiskManagementData
  emotionWeights?: Record<string, number>
  getDurationLabel?: (trade: TradeLike) => string
  getExpectedStyleLabel?: (extraType: number | null) => string
  getNeuralReason?: (kind: 'no-emotions' | 'negative-emotions' | 'low-score', count: number) => string
}): ComplianceAudit => {
  const closedTrades = trades.filter(isClosedTradeForMetrics)
  if (!closedTrades.length) {
    return {
      stats: { riskPerTrade: 100, riskPerSession: 100, tradingStyle: 100 },
      violations: { violatingTrades: [], violatingSessions: [], violatingStyleTrades: [], violatingNeuralTrades: [] },
      emotional: { score: 60, label: 'NEUTRAL' }
    }
  }

  const sortedTrades = [...closedTrades].sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
  const violatingTrades: any[] = []
  const violatingStyleTrades: any[] = []
  const violatingNeuralTrades: any[] = []
  const sessionRiskMap: Record<string, { date: string; realizedLoss: number; positionRisk: number; balanceAtStart: number; trades: any[] }> = {}
  let currentBalance = initialCapital
  let compliantTradeCount = 0
  let compliantStyleCount = 0
  let emotionalTotal = 0
  let emotionalCount = 0

  sortedTrades.forEach((trade) => {
    const maxRiskDollars = riskValueToDollars(riskManagement.riskPerTradeValue, riskManagement.riskPerTradeUnit, currentBalance)
    const risk = getTradeRiskComponents(trade, initialCapital)
    const riskViolation = risk.realizedLoss > maxRiskDollars || risk.positionRisk > maxRiskDollars
    if (!riskViolation) compliantTradeCount++
    if (riskViolation) violatingTrades.push({ ...trade, _realizedLoss: risk.realizedLoss, _positionRisk: risk.positionRisk, _maxRiskDollars: maxRiskDollars })

    const styleCompliant = isStyleCompliant(trade, riskManagement.tradingStyleExtraType)
    if (styleCompliant) compliantStyleCount++
    if (!styleCompliant) {
      violatingStyleTrades.push({
        ...trade,
        _durationStr: (trade as any).duration || getDurationLabel?.(trade) || '--',
        _expectedStyle: getExpectedStyleLabel?.(riskManagement.tradingStyleExtraType) || '--'
      })
    }

    const emotions = Array.isArray(trade.emotions) ? trade.emotions : []
    if (emotions.length === 0) {
      violatingNeuralTrades.push({ ...trade, _neuralScore: 0, _neuralReason: getNeuralReason?.('no-emotions', 0) || 'NO EMOTIONS' })
    } else {
      let score = 60
      let negativeCount = 0
      emotions.forEach((emotion: any) => {
        const weight = emotionWeights[getEmotionName(emotion)] || 0
        if (weight < 0) negativeCount++
        score += weight
      })
      const finalScore = Math.min(Math.max(Math.round(score), 0), 100)
      emotionalTotal += score
      emotionalCount++
      if (finalScore < 50) {
        violatingNeuralTrades.push({
          ...trade,
          _neuralScore: finalScore,
          _neuralReason: getNeuralReason?.(negativeCount ? 'negative-emotions' : 'low-score', negativeCount) || 'SCORE < 50%'
        })
      }
    }

    const dateKey = new Date(trade.date).toDateString()
    sessionRiskMap[dateKey] ||= { date: dateKey, realizedLoss: 0, positionRisk: 0, balanceAtStart: currentBalance, trades: [] }
    sessionRiskMap[dateKey].realizedLoss += risk.realizedLoss
    sessionRiskMap[dateKey].positionRisk += risk.positionRisk
    sessionRiskMap[dateKey].trades.push({ ...trade, _realizedLoss: risk.realizedLoss, _positionRisk: risk.positionRisk, _maxRiskDollars: maxRiskDollars })
    currentBalance += getTradePnl(trade, initialCapital)
  })

  const violatingSessions = Object.values(sessionRiskMap).filter((session) => {
    const maxRisk = riskValueToDollars(riskManagement.riskPerSessionValue, riskManagement.riskPerSessionUnit, session.balanceAtStart)
    return session.realizedLoss > maxRisk || session.positionRisk > maxRisk
  }).map((session) => ({
    ...session,
    _maxSessionRiskDollars: riskValueToDollars(riskManagement.riskPerSessionValue, riskManagement.riskPerSessionUnit, session.balanceAtStart),
    violatingTrades: session.trades
  }))

  const avgEmotion = emotionalCount ? emotionalTotal / emotionalCount : 60
  return {
    stats: {
      riskPerTrade: (compliantTradeCount / closedTrades.length) * 100,
      riskPerSession: Object.keys(sessionRiskMap).length ? ((Object.keys(sessionRiskMap).length - violatingSessions.length) / Object.keys(sessionRiskMap).length) * 100 : 100,
      tradingStyle: (compliantStyleCount / closedTrades.length) * 100
    },
    violations: {
      violatingTrades: violatingTrades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      violatingSessions: violatingSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      violatingStyleTrades: violatingStyleTrades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      violatingNeuralTrades: violatingNeuralTrades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    },
    emotional: { score: avgEmotion, label: avgEmotion < 40 ? 'NEGATIVE' : avgEmotion > 70 ? 'POSITIVE' : 'NEUTRAL' }
  }
}

