import { computed, type Ref } from 'vue'
import { useThemeStore } from '~/features/store/useTheme'

export function useExRobustness(
  diagnosticStats: Ref<any>,
  strategyMetrics: Ref<any>,
  getFilteredTrades: () => any[]
) {
  const themeStore = useThemeStore()
  const colors = computed(() => ({
    text: themeStore.settings.isDark ? '#ffffff' : '#000000',
    border: themeStore.settings.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    accent: themeStore.settings.isDark ? '#ffffff' : '#000000'
  }))

  const getRobustnessExplanation = (stats: any) => {
    const skew = stats.skewness || 0
    const kurt = stats.kurtosis || 0
    const isFatTailed = stats.preferredModel === "Student's t" || kurt > 1.5
    const distribution = isFatTailed ? "Student's t / fat-tailed" : 'Normal-like'
    const sampleSize = stats.pnls?.length || 0
    const unmanagedRatio = sampleSize > 0 ? (stats.unmanagedRiskCount || 0) / sampleSize : 0
    const hasNoRiskModel = unmanagedRatio >= 0.5 || (stats.stopLossCoveragePct || 0) < 50
    const hasTailOutliers = (stats.tailOutlierCount || 0) > 0 || (stats.largestTailSigma || 0) >= 3

    if (hasNoRiskModel && (isFatTailed || hasTailOutliers)) {
      return {
        distribution,
        verdict: 'Unmanaged fat-tail profile',
        diagnosis: 'The return stream has large tail events while most trades lack protective stop or target data. A positive average can be dominated by a few outliers, so the curve is not robust without explicit loss limits.',
        action: 'Add stop-loss data first. Keep position size small. Retest without the biggest winner before scaling up.',
        tone: '#fb7185'
      }
    }

    if (skew < -0.5) {
      return {
        distribution,
        verdict: 'Negative skew detected',
        diagnosis: 'The left tail is heavier than the right tail. The strategy is probably collecting frequent small gains while exposing the account to rare but oversized losses.',
        action: 'Review the losing trades. Tighten stops or exits. Use smaller position size until the worst loss is acceptable.',
        tone: '#fb7185'
      }
    }

    if (isFatTailed && skew > 0.5) {
      return {
        distribution,
        verdict: 'Right-skewed tail dependency',
        diagnosis: 'The right tail is profitable, but the distribution is still fat-tailed. The strategy may look attractive because of rare oversized winners rather than stable repeatable expectancy.',
        action: 'Retest without the biggest winner. Keep risk per trade fixed. Wait for more trades before increasing size.',
        tone: stats.mean < 0 ? '#fb7185' : '#fbbf24'
      }
    }

    if (skew > 0.5) {
      return {
        distribution,
        verdict: 'Positive skew profile',
        diagnosis: 'The right tail is dominant. This usually fits trend-following or breakout logic where many small losses can be paid by a few large winners.',
        action: 'Keep risk per trade steady. Let winners run. Judge the strategy on a bigger sample, not one trade.',
        tone: stats.mean < 0 ? '#fb7185' : '#34d399'
      }
    }

    if (isFatTailed) {
      return {
        distribution,
        verdict: 'Fat tails are present',
        diagnosis: "Returns are better described by a Student's t shape than by a calm normal curve. Outliers are part of the system, not noise.",
        action: 'Keep extra cash aside. Avoid leverage. Test the worst losing streak and size trades for that case.',
        tone: '#fbbf24'
      }
    }

    return {
      distribution,
      verdict: 'Calm diversified distribution',
      diagnosis: 'The return shape is close to normal. This points to calmer, more diversified behavior with fewer structural tail shocks.',
      action: 'Keep the current rules. Do not over-tune the strategy. Recheck after more trades.',
      tone: colors.value.accent
    }
  }

  const robustnessExplanation = computed(() => getRobustnessExplanation(diagnosticStats.value))

  const robustnessExplanationVariables = computed(() => {
    const stats = diagnosticStats.value
    return [
      { name: 'Preferred Distribution', val: stats.preferredModel || 'Normal' },
      { name: 'Mean Trade Result', val: `$${stats.mean.toFixed(2)}` },
      { name: 'Standard Deviation', val: `$${stats.std.toFixed(2)}` },
      { name: 'Skewness', val: `${stats.skewness >= 0 ? '+' : ''}${stats.skewness.toFixed(2)}` },
      { name: 'Excess Kurtosis', val: `${stats.kurtosis >= 0 ? '+' : ''}${stats.kurtosis.toFixed(2)}` },
      { name: 'PnL Range', val: `$${stats.minPnl.toFixed(0)} / $${stats.maxPnl.toFixed(0)}` },
      { name: 'IQR Tail Outliers', val: `${stats.tailOutlierCount}` },
      { name: 'Largest Tail Distance', val: `${stats.largestTailSigma.toFixed(2)}σ` },
      { name: 'Stop-Loss Coverage', val: `${stats.stopLossCoveragePct.toFixed(0)}%` },
      { name: 'Take-Profit Coverage', val: `${stats.takeProfitCoveragePct.toFixed(0)}%` },
      { name: 'Unmanaged Trades', val: `${stats.unmanagedRiskCount}` },
      { name: 'Sample Size', val: `${stats.pnls.length} trades` }
    ]
  })

  const robustnessDistributionFits = computed(() => {
    const stats = diagnosticStats.value
    const normalWins = stats.preferredModel !== "Student's t"
    return [
      {
        name: 'Normal',
        isBest: normalWins,
        aic: stats.normalParams.aic.toFixed(2),
        bic: stats.normalParams.bic.toFixed(2),
        params: [
          { name: 'Mean', val: `$${stats.normalParams.mean.toFixed(2)}` },
          { name: 'Sigma', val: `$${stats.normalParams.std.toFixed(2)}` },
          { name: 'Log Likelihood', val: stats.normalParams.logL.toFixed(2) }
        ]
      },
      {
        name: "Student's t",
        isBest: !normalWins,
        aic: stats.tParams.aic.toFixed(2),
        bic: stats.tParams.bic.toFixed(2),
        params: [
          { name: 'Mean', val: `$${stats.tParams.mean.toFixed(2)}` },
          { name: 'Scale', val: `$${stats.tParams.scale.toFixed(2)}` },
          { name: 'Degrees of Freedom', val: stats.tParams.nu.toFixed(2) },
          { name: 'Log Likelihood', val: stats.tParams.logL.toFixed(2) }
        ]
      }
    ]
  })

  const robustnessDistributionComparison = computed(() => {
    const stats = diagnosticStats.value
    const deltaBic = stats.normalParams.bic - stats.tParams.bic
    if (stats.pnls.length < 5) {
      return 'The sample is still thin, so AIC/BIC should be treated as directional evidence rather than a final model selection.'
    }
    if (deltaBic > 2) {
      return `Student's t is preferred by BIC by ${deltaBic.toFixed(2)} points. The strategy should be managed as fat-tailed: outliers and capital reserve matter more than average trade comfort.`
    }
    if (deltaBic < -2) {
      return `Normal fit is preferred by BIC by ${Math.abs(deltaBic).toFixed(2)} points. The current distribution looks calmer, but skew and sample size still decide risk policy.`
    }
    return `AIC/BIC are close. Treat the model comparison as inconclusive and keep both normal fit and tail-aware controls visible.`
  })

  const robustnessNormalityTests = computed(() => {
    const stats = diagnosticStats.value
    const n = stats.pnls.length
    const jarqueBera = n > 0 ? (n / 6) * (Math.pow(stats.skewness, 2) + Math.pow(stats.kurtosis, 2) / 4) : 0
    const jbPass = jarqueBera < 5.99
    const skewPass = Math.abs(stats.skewness) < 0.5
    const kurtPass = Math.abs(stats.kurtosis) < 1.5
    const qqPass = stats.qqPoints && stats.qqPoints.length > 0 && Math.abs(stats.skewness) < 0.75 && stats.kurtosis < 2
    const outlierPass = (stats.tailOutlierCount || 0) === 0 && (stats.largestTailSigma || 0) < 3
    const riskPass = (stats.stopLossCoveragePct || 0) >= 90

    return [
      {
        name: 'Jarque-Bera Normality Proxy',
        result: `${jarqueBera.toFixed(2)} ${jbPass ? 'PASS' : 'REJECT'}`,
        note: 'H0: returns are compatible with normal skew/kurtosis.',
        pass: jbPass
      },
      {
        name: 'Skewness Symmetry Check',
        result: `${stats.skewness >= 0 ? '+' : ''}${stats.skewness.toFixed(2)} ${skewPass ? 'PASS' : 'WATCH'}`,
        note: 'Large negative skew is the highest practical risk flag.',
        pass: skewPass
      },
      {
        name: 'Excess Kurtosis Tail Check',
        result: `${stats.kurtosis >= 0 ? '+' : ''}${stats.kurtosis.toFixed(2)} ${kurtPass ? 'PASS' : 'FAT_TAIL'}`,
        note: 'Positive excess kurtosis means outlier frequency is elevated.',
        pass: kurtPass
      },
      {
        name: 'QQ-Plot Alignment Check',
        result: qqPass ? 'ALIGNED' : 'TAIL_DEVIATION',
        note: 'Uses the same quantile source as the QQ projection view.',
        pass: qqPass
      },
      {
        name: 'IQR Tail Outlier Check',
        result: `${stats.tailOutlierCount || 0} ${outlierPass ? 'PASS' : 'OUTLIER_RISK'}`,
        note: 'Flags trades outside the interquartile tail fence and beyond the visible fitted domain.',
        pass: outlierPass
      },
      {
        name: 'Risk Management Coverage Check',
        result: `${(stats.stopLossCoveragePct || 0).toFixed(0)}% ${riskPass ? 'PASS' : 'NO_RISK_MODEL'}`,
        note: 'Robustness requires explicit stop-loss coverage, especially when tail events dominate expectancy.',
        pass: riskPass
      }
    ]
  })

  const robustnessHypothesisSummary = computed(() => {
    const tests = robustnessNormalityTests.value
    const failed = tests.filter(t => !t.pass)
    if (failed.length === 0) {
      return 'Hypothesis verdict: no major distribution break is visible yet. Normal-fit views are usable, but keep monitoring tails as the sample grows.'
    }

    const stats = diagnosticStats.value
    const hasNormalityFailure = failed.some(t => t.name === 'Jarque-Bera Normality Proxy')
    const hasRiskModelFailure = failed.some(t => t.name === 'Risk Management Coverage Check')
    const hasTailFailure = failed.some(t =>
      t.name === 'Excess Kurtosis Tail Check' ||
      t.name === 'IQR Tail Outlier Check' ||
      t.name === 'QQ-Plot Alignment Check'
    )
    const hasShapeFailure = failed.some(t => t.name === 'Skewness Symmetry Check')

    if (hasRiskModelFailure && hasTailFailure && hasShapeFailure) {
      return `Hypothesis verdict: fragile profile. Tails, skew, and weak risk controls are all active, so average PnL is misleading. Stop-loss coverage is ${stats.stopLossCoveragePct.toFixed(0)}%.`
    }

    if (hasRiskModelFailure && hasTailFailure) {
      return `Hypothesis verdict: unmanaged tail risk. Outliers are present and risk coverage is weak, so the strategy needs controls before the average trade means much. Stop-loss coverage is ${stats.stopLossCoveragePct.toFixed(0)}%.`
    }

    if (hasRiskModelFailure && hasShapeFailure) {
      return `Hypothesis verdict: asymmetric and under-controlled. The return shape is tilted, but the risk model is too thin to trust the edge. Stop-loss coverage is ${stats.stopLossCoveragePct.toFixed(0)}%.`
    }

    if (hasRiskModelFailure) {
      return `Hypothesis verdict: risk model missing. The distribution may look acceptable, but robustness is limited until stop-loss coverage improves from ${stats.stopLossCoveragePct.toFixed(0)}%.`
    }

    if (hasTailFailure && hasShapeFailure) {
      return 'Hypothesis verdict: non-normal profile. Outliers and skew are both visible, so evaluate the strategy by tail behavior, not by average return.'
    }

    if (hasTailFailure) {
      return 'Hypothesis verdict: fat-tail behavior. A few extreme trades are shaping the result, so stress-test the tails before trusting expectancy.'
    }

    if (hasShapeFailure) {
      return 'Hypothesis verdict: asymmetric returns. The edge may depend on one side of the curve, so validate skew before increasing size.'
    }

    if (hasNormalityFailure) {
      return 'Hypothesis verdict: normality is statistically weak. Keep the normal curve as a reference only, and confirm the edge with more trades.'
    }

    return 'Hypothesis verdict: mixed warning. The sample is not clean enough for high confidence, so treat the edge as provisional.'
  })

  const robustnessBootstrapSummary = computed(() => {
    const bs = diagnosticStats.value.bootstrapCI
    return [
      { name: 'Simulations', val: '500' },
      { name: 'Mean Estimate', val: `$${bs.mean.toFixed(2)}` },
      { name: 'Std Error', val: `$${bs.stdErr.toFixed(2)}` },
      { name: '95% CI Lower', val: `$${bs.lower.toFixed(2)}` },
      { name: '95% CI Upper', val: `$${bs.upper.toFixed(2)}` },
      { name: 'CI Width', val: `$${(bs.upper - bs.lower).toFixed(2)}` }
    ]
  })

  const robustnessBootstrapInterpretation = computed(() => {
    const bs = diagnosticStats.value.bootstrapCI
    if (bs.lower > 0) {
      return 'The bootstrap interval stays above zero. The observed edge survives resampling, but position sizing should still respect tail diagnostics.'
    }
    if (bs.upper < 0) {
      return 'The bootstrap interval stays below zero. The strategy currently fails the resampled expectancy test and should be reworked.'
    }
    return 'The bootstrap interval crosses zero. The edge is not statistically stable yet; collect more trades or reduce risk until the interval clears positive territory.'
  })

  const robustnessReturnHeatmap = computed(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const currentTrades = getFilteredTrades()
    const cells = new Map<string, { month: string; weekday: string; pnl: number; count: number }>()
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    currentTrades.forEach(t => {
      const dRaw = t.dateExit || t.date
      const d = dRaw instanceof Date ? dRaw : new Date(dRaw)
      if (Number.isNaN(d.getTime())) return
      const pnlVal = t.profitInCurrency ?? t.result ?? (t as any).pnl ?? 0
      const raw = typeof pnlVal === 'string' ? parseFloat(pnlVal) : Number(pnlVal)
      const key = `${d.getMonth()}-${d.getDay()}`
      const existing = cells.get(key) || { month: monthNames[d.getMonth()] || 'N/A', weekday: weekdays[d.getDay()] || 'N/A', pnl: 0, count: 0 }
      existing.pnl += Number.isFinite(raw) ? raw : 0
      existing.count += 1
      cells.set(key, existing)
    })

    return Array.from(cells.values())
  })

  const robustnessUiLayerSummary = computed(() => {
    const m = strategyMetrics.value
    const stats = diagnosticStats.value
    return [
      { name: 'Rolling Sharpe', val: `${m.rollingSharpe.toFixed(2)}` },
      { name: 'Rolling Sigma', val: `${m.stdDevPct.toFixed(2)}%` },
      { name: 'Rolling Drawdown', val: `${m.rollingDrawdown.toFixed(1)}%` },
      { name: 'Rolling Win Rate', val: `${m.rollingWinRate.toFixed(1)}%` },
      { name: 'Distribution Robustness', val: `${m.distributionRobustness.toFixed(1)}` },
      { name: 'Outlier Impact', val: `${m.outlierImpactRatio.toFixed(1)}%` },
      { name: 'Risk Coverage', val: `${stats.stopLossCoveragePct.toFixed(0)}% SL / ${stats.takeProfitCoveragePct.toFixed(0)}% TP` },
      { name: 'Heatmap Cells', val: `${robustnessReturnHeatmap.value.length}` }
    ]
  })

  const robustnessVisualizationStatus = computed(() => {
    return [
      { name: 'Histogram Overlay Selector', val: 'Normal / t overlay available' },
      { name: 'QQ-Plot vs Normal', val: `${diagnosticStats.value.qqPoints?.length || 0} quantiles` },
      { name: 'Rolling Metrics', val: 'Sharpe, sigma, drawdown, win rate' },
      { name: 'Calendar Heatmap', val: 'Weekday / month return matrix' }
    ]
  })

  const robustnessExplanationSequence = computed(() => {
    const stats = diagnosticStats.value
    const normalBic = stats.normalParams?.bic ?? 0
    const tBic = stats.tParams?.bic ?? 0
    const modelReason = stats.preferredModel === "Student's t"
      ? `Student's t BIC (${tBic.toFixed(2)}) is lower than Normal BIC (${normalBic.toFixed(2)}), so tail risk deserves priority.`
      : `Normal BIC (${normalBic.toFixed(2)}) is competitive with Student's t BIC (${tBic.toFixed(2)}), so the profile is treated as calmer unless skew/kurtosis disagrees.`

    return [
      `1. Fit check: ${modelReason}`,
      `2. Curve domain: fitted PDFs span $${stats.curveDomain.min.toFixed(0)} to $${stats.curveDomain.max.toFixed(0)}, covering observed PnL from $${stats.minPnl.toFixed(0)} to $${stats.maxPnl.toFixed(0)}.`,
      `3. Dispersion check: standard deviation is $${stats.std.toFixed(2)}, so average trade expectations should be judged against this volatility band.`,
      `4. Shape check: skewness is ${stats.skewness >= 0 ? '+' : ''}${stats.skewness.toFixed(2)} and excess kurtosis is ${stats.kurtosis >= 0 ? '+' : ''}${stats.kurtosis.toFixed(2)}.`,
      `5. Risk check: stop-loss coverage is ${stats.stopLossCoveragePct.toFixed(0)}%, take-profit coverage is ${stats.takeProfitCoveragePct.toFixed(0)}%, and ${stats.unmanagedRiskCount} trades are unmanaged.`,
      `6. Verdict: ${robustnessExplanation.value.verdict}.`,
      `7. Action: ${robustnessExplanation.value.action}`
    ].join('\n')
  })

  return {
    robustnessExplanation,
    robustnessExplanationVariables,
    robustnessDistributionFits,
    robustnessDistributionComparison,
    robustnessNormalityTests,
    robustnessHypothesisSummary,
    robustnessBootstrapSummary,
    robustnessBootstrapInterpretation,
    robustnessUiLayerSummary,
    robustnessVisualizationStatus,
    robustnessReturnHeatmap,
    robustnessExplanationSequence
  }
}
