import type { MetricConfig, MetricEngine } from '~/entities/metric'

// Category 1: Matrix Adherence
import { requiredAdherenceMetric } from './requiredAdherence'
import { additionalAlphaMetric } from './additionalAlpha'
import { conditionalPnlRatioMetric } from './conditionalPnlRatio'

// Category 2: Behavioural
import { cognitiveStabilityMetric } from './cognitiveStability'
import { dominantBiasMetric } from './dominantBias'
import { emotionalPnlDragMetric } from './emotionalPnlDrag'
import { frictionDensityMetric } from './frictionDensity'

// Category 3: Execution & Risk
import { netResultVarianceMetric } from './netResultVariance'
import { yieldEfficiencyMetric } from './yieldEfficiency'
import { profitVelocityMetric } from './profitVelocity'
import { actualVsTargetRrMetric } from './actualVsTargetRr'
import { plannedVsRealizedRiskMetric } from './plannedVsRealizedRisk'
import { temporalExposureMetric } from './temporalExposure'
import { stopLossDistanceMetric } from './stopLossDistance'
import { takeProfitDistanceMetric } from './takeProfitDistance'

// Category 4: Strategy vs. Execution
import { slExecutionDragMetric } from './slExecutionDrag'
import { riskBudgetAdherenceMetric } from './riskBudgetAdherence'
import { tpCaptureRatioMetric } from './tpCaptureRatio'
import { edgeCaptureQuotientMetric } from './edgeCaptureQuotient'
import { unrealizedAlphaLeftMetric } from './unrealizedAlphaLeft'
import { velocityVarianceIndexMetric } from './velocityVarianceIndex'

// Category 5: In-Trade Analysis
import { meaningfulLossTimeMetric } from './meaningfulLossTime'
import { meaningfulProfitTimeMetric } from './meaningfulProfitTime'
import { maxMeaningfulDrawdownMetric } from './maxMeaningfulDrawdown'
import { maxFavorableExcursionMetric } from './maxFavorableExcursion'
import { profitCaptureRatioMetric } from './profitCaptureRatio'
import { pricePathShapeMetric } from './pricePathShape'
import { firstImpulseDirectionMetric } from './firstImpulseDirection'
import { entryHeatMetric } from './entryHeat'
import { adverseBeforeProfitMetric } from './adverseBeforeProfit'
import { hadNewsMetric } from './hadNews'

// Category 6: Primary Summary Metrics
import { netProfitMetric } from './netProfit'
import { profitFactorMetric } from './profitFactor'
import { riskRewardRatioMetric } from './riskRewardRatio'
import { expectedValueMetric } from './expectedValue'

export const primarySummaryMetricsEngines: MetricEngine[] = [
  netProfitMetric,
  profitFactorMetric,
  riskRewardRatioMetric
]

export const advancedTradeMetricsEngines: MetricEngine[] = [
  // Matrix Adherence
  requiredAdherenceMetric,
  additionalAlphaMetric,
  conditionalPnlRatioMetric,

  // Behavioural
  cognitiveStabilityMetric,
  dominantBiasMetric,
  emotionalPnlDragMetric,
  frictionDensityMetric,

  // Execution & Risk
  netResultVarianceMetric,
  yieldEfficiencyMetric,
  profitVelocityMetric,
  actualVsTargetRrMetric,
  plannedVsRealizedRiskMetric,
  temporalExposureMetric,
  stopLossDistanceMetric,
  takeProfitDistanceMetric,

  // Strategy vs Execution
  slExecutionDragMetric,
  riskBudgetAdherenceMetric,
  tpCaptureRatioMetric,
  edgeCaptureQuotientMetric,
  unrealizedAlphaLeftMetric,
  velocityVarianceIndexMetric,

  // In-Trade Analysis
  meaningfulLossTimeMetric,
  meaningfulProfitTimeMetric,
  maxMeaningfulDrawdownMetric,
  maxFavorableExcursionMetric,
  profitCaptureRatioMetric,
  pricePathShapeMetric,
  firstImpulseDirectionMetric,
  entryHeatMetric,
  adverseBeforeProfitMetric,
  hadNewsMetric
]

export const allTradeMetricsEngines: MetricEngine[] = [
  ...primarySummaryMetricsEngines,
  ...advancedTradeMetricsEngines
]

/**
 * Computes all metric configs and filters them by mode and active tab.
 */
export function useTradeAnalysisMetrics(
  trade: any,
  context: any = {},
  locale: 'ru' | 'en' = 'ru',
  mode: 'simple' | 'advanced' = 'advanced',
  activeTab: string = 'all'
): { metrics: MetricConfig[]; counts: Record<string, number> } {
  const isRu = locale === 'ru'

  const engines = mode === 'simple' ? primarySummaryMetricsEngines : allTradeMetricsEngines

  const computedConfigs: MetricConfig[] = engines.map((engine) => {
    const res = engine.calculate(trade, context, locale)
    const localized = isRu ? engine.i18n.ru : engine.i18n.en

    return {
      key: engine.key,
      category: engine.category || 'execution',
      label: localized.label,
      sub: localized.sub,
      desc: localized.desc,
      formula: localized.formula,
      benchmarkText: res.benchmarkText || localized.benchmark,
      value: res.formattedValue,
      rawValue: res.rawValue,
      formattedValue: res.formattedValue,
      status: res.status,
      evalStr: res.evaluationText || localized.evaluation,
      evalClass: res.evalClass || '',
      benchmarks: res.benchmarks || [],
      progress: res.progress,
      colorVal: () => res.colorVal || '#34d399',
      i18n: engine.i18n
    }
  })

  // Calculate tab counts
  const counts: Record<string, number> = {
    all: computedConfigs.length,
    adherence: computedConfigs.filter(m => m.category === 'adherence').length,
    behavioural: computedConfigs.filter(m => m.category === 'behavioural').length,
    execution: computedConfigs.filter(m => m.category === 'execution').length,
    strategy_execution: computedConfigs.filter(m => m.category === 'strategy_execution').length,
    in_trade: computedConfigs.filter(m => m.category === 'in_trade').length
  }

  // Filter metrics by active tab
  const filtered = computedConfigs.filter((m) => {
    if (mode === 'simple') return true
    if (activeTab === 'all') return true
    return m.category === activeTab
  })

  return {
    metrics: filtered,
    counts
  }
}

export * from './requiredAdherence'
export * from './additionalAlpha'
export * from './conditionalPnlRatio'
export * from './setupComplexity'
export * from './cognitiveStability'
export * from './dominantBias'
export * from './emotionalPnlDrag'
export * from './frictionDensity'
export * from './netResultVariance'
export * from './yieldEfficiency'
export * from './profitVelocity'
export * from './actualVsTargetRr'
export * from './plannedVsRealizedRisk'
export * from './temporalExposure'
export * from './stopLossDistance'
export * from './takeProfitDistance'
export * from './slExecutionDrag'
export * from './riskBudgetAdherence'
export * from './tpCaptureRatio'
export * from './edgeCaptureQuotient'
export * from './unrealizedAlphaLeft'
export * from './velocityVarianceIndex'
export * from './conditionalAlphaDecay'
export * from './executionConfidenceIndex'
export * from './meaningfulLossTime'
export * from './meaningfulProfitTime'
export * from './maxMeaningfulDrawdown'
export * from './maxFavorableExcursion'
export * from './profitCaptureRatio'
export * from './pricePathShape'
export * from './firstImpulseDirection'
export * from './entryHeat'
export * from './adverseBeforeProfit'
export * from './hadNews'
export * from './netProfit'
export * from './winRate'
export * from './profitFactor'
export * from './riskRewardRatio'
export * from './expectedValue'
