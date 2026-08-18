import { computed, type Ref } from 'vue'
import { useThemeStore } from '~/features/store/useTheme'
import { useI18n } from '~/shared/i18n/useI18n'
import { getTradeCashPnl } from '~/widgets/genesis/model/tradePnl'

export function useExRobustness(
  diagnosticStats: Ref<any>,
  strategyMetrics: Ref<any>,
  getFilteredTrades: () => any[],
  getTradePnl: (trade: any) => number = (trade) => getTradeCashPnl(trade, strategyMetrics.value?.initialDeposit || 1000)
) {
  const themeStore = useThemeStore()
  const { locale } = useI18n()
  const copy = (en: string, ru: string) => locale.value === 'ru' ? ru : en
  const modelLabel = (model?: string) => model === "Student's t"
    ? copy('Large-trade model', 'Модель крупных сделок')
    : copy('Normal-like', 'Похоже на стабильную модель')
  const colors = computed(() => ({
    text: themeStore.settings.isDark ? '#ffffff' : '#000000',
    border: themeStore.settings.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    accent: themeStore.settings.isDark ? '#ffffff' : '#000000'
  }))

  const getRobustnessExplanation = (stats: any) => {
    const skew = stats.skewness || 0
    const kurt = stats.kurtosis || 0
    const isFatTailed = stats.preferredModel === "Student's t" || kurt > 1.5
    const distribution = isFatTailed
      ? copy('Many unusually large trades', 'Много необычно крупных сделок')
      : copy('Normal-like', 'Похоже на стабильную модель')
    const sampleSize = stats.pnls?.length || 0
    const unmanagedRatio = sampleSize > 0 ? (stats.unmanagedRiskCount || 0) / sampleSize : 0
    const hasNoRiskModel = unmanagedRatio >= 0.5 || (stats.stopLossCoveragePct || 0) < 50
    const hasTailOutliers = (stats.tailOutlierCount || 0) > 0 || (stats.largestTailSigma || 0) >= 3

    if (hasNoRiskModel && (isFatTailed || hasTailOutliers)) {
      return {
        distribution,
        verdict: copy('Large trades without enough risk control', 'Крупные сделки без достаточного контроля риска'),
        diagnosis: copy(
          'Several trades are much larger than the typical trade, and many trades do not have stop-loss or take-profit data. This means the average result can look good only because of a few unusual trades, while the downside is not clearly limited.',
          'Несколько сделок намного больше обычной сделки, а у многих сделок нет данных по стоп-лоссу или тейк-профиту. Из-за этого средний результат может выглядеть хорошо только благодаря нескольким необычным сделкам, при этом риск снизу не ограничен достаточно ясно.'
        ),
        action: copy(
          'Add stop-loss data first. Keep position size small. Check whether the strategy is still profitable if the single best trade is ignored before increasing size.',
          'Сначала добавьте данные стоп-лосса. Держите размер позиции небольшим. Перед увеличением риска проверьте, остаётся ли стратегия прибыльной, если не учитывать одну самую лучшую сделку.'
        ),
        tone: '#fb7185'
      }
    }

    if (skew < -0.5) {
      return {
        distribution,
        verdict: copy('Losses are larger than wins', 'Убытки больше прибылей'),
        diagnosis: copy(
          'The losing side is heavier than the winning side. The strategy may be taking many small wins, but one bad loss can erase a lot of progress.',
          'Убыточная сторона сильнее прибыльной. Стратегия может часто брать маленькую прибыль, но один плохой убыток способен стереть большую часть прогресса.'
        ),
        action: copy(
          'Review the biggest losing trades. Tighten stops or exits. Use smaller position size until the worst realistic loss is acceptable.',
          'Проверьте самые крупные убыточные сделки. Сделайте стопы или выходы строже. Используйте меньший размер позиции, пока худший реалистичный убыток не станет приемлемым.'
        ),
        tone: '#fb7185'
      }
    }

    if (isFatTailed && skew > 0.5) {
      return {
        distribution,
        verdict: copy('Result depends on a few big winners', 'Результат зависит от нескольких крупных прибыльных сделок'),
        diagnosis: copy(
          'The biggest winning trades help the strategy a lot, but results are not yet smooth. The strategy may look strong because of rare large wins, not because most trades are consistently good.',
          'Самые крупные прибыльные сделки сильно помогают стратегии, но результаты пока не выглядят ровными. Стратегия может казаться сильной из-за редких больших прибылей, а не потому что большинство сделок стабильно хорошие.'
        ),
        action: copy(
          'Check the result again after ignoring the single best winning trade. Keep risk per trade fixed. Wait for more trades before increasing size.',
          'Проверьте результат ещё раз, не учитывая одну самую лучшую прибыльную сделку. Держите риск на сделку фиксированным. Дождитесь большего количества сделок перед увеличением размера.'
        ),
        tone: stats.mean < 0 ? '#fb7185' : '#fbbf24'
      }
    }

    if (skew > 0.5) {
      return {
        distribution,
        verdict: copy('Big winners are helping the strategy', 'Крупные прибыльные сделки помогают стратегии'),
        diagnosis: copy(
          'Large winning trades are doing most of the work. This can be normal for trend-following or breakout systems, where several small losses are paid for by a few strong wins.',
          'Большую часть результата дают крупные прибыльные сделки. Это может быть нормально для трендовых или пробойных систем, где несколько небольших убытков перекрываются несколькими сильными прибылями.'
        ),
        action: copy(
          'Keep risk per trade steady. Let winning trades reach their plan. Judge the strategy on many trades, not on one strong winner.',
          'Держите риск на сделку стабильным. Давайте прибыльным сделкам доходить до плана. Оценивайте стратегию по множеству сделок, а не по одной сильной прибыли.'
        ),
        tone: stats.mean < 0 ? '#fb7185' : '#34d399'
      }
    }

    if (isFatTailed) {
      return {
        distribution,
        verdict: copy('Unusually large trades are present', 'Есть необычно крупные сделки'),
        diagnosis: copy(
          'The trade results include more unusually large wins or losses than a calm strategy would normally have. These trades should be treated as part of the strategy, not ignored as random noise.',
          'В результатах есть больше необычно крупных прибылей или убытков, чем обычно бывает у спокойной стратегии. Эти сделки нужно считать частью стратегии, а не случайным шумом.'
        ),
        action: copy(
          'Keep extra cash aside. Avoid leverage. Test what happens during the worst losing streak and size trades for that case.',
          'Держите запас капитала. Не используйте плечо. Проверьте, что произойдёт во время худшей серии убытков, и подбирайте размер сделок под этот сценарий.'
        ),
        tone: '#fbbf24'
      }
    }

    return {
      distribution,
      verdict: copy('Stable trade result pattern', 'Стабильный рисунок результатов'),
      diagnosis: copy(
        'The trade results look relatively balanced. There are fewer unusually large wins or losses, so the strategy is easier to judge from the average trade.',
        'Результаты сделок выглядят относительно сбалансированными. Необычно крупных прибылей или убытков меньше, поэтому стратегию легче оценивать по средней сделке.'
      ),
      action: copy(
        'Keep the current rules. Do not over-tune the strategy. Recheck after more trades.',
        'Сохраните текущие правила. Не перенастраивайте стратегию слишком сильно. Проверьте снова после большего количества сделок.'
      ),
      tone: colors.value.accent
    }
  }

  const robustnessExplanation = computed(() => getRobustnessExplanation(diagnosticStats.value))

  const robustnessExplanationVariables = computed(() => {
    const stats = diagnosticStats.value
    return [
      { name: copy('Preferred Distribution', 'Подходящая модель'), val: modelLabel(stats.preferredModel) },
      { name: copy('Mean Trade Result', 'Средний результат сделки'), val: `$${stats.mean.toFixed(2)}` },
      { name: copy('Standard Deviation', 'Обычный разброс результата'), val: `$${stats.std.toFixed(2)}` },
      { name: copy('Win/Loss Imbalance', 'Перекос прибыль/убыток'), val: `${stats.skewness >= 0 ? '+' : ''}${stats.skewness.toFixed(2)}` },
      { name: copy('Large Trade Frequency', 'Частота крупных сделок'), val: `${stats.kurtosis >= 0 ? '+' : ''}${stats.kurtosis.toFixed(2)}` },
      { name: copy('PnL Range', 'Диапазон PnL'), val: `$${stats.minPnl.toFixed(0)} / $${stats.maxPnl.toFixed(0)}` },
      { name: copy('Unusually Large Trades', 'Необычно крупные сделки'), val: `${stats.tailOutlierCount}` },
      { name: copy('Largest Trade Distance', 'Отклонение самой крупной сделки'), val: `${stats.largestTailSigma.toFixed(2)}σ` },
      { name: copy('Stop-Loss Coverage', 'Покрытие стоп-лоссом'), val: `${stats.stopLossCoveragePct.toFixed(0)}%` },
      { name: copy('Take-Profit Coverage', 'Покрытие тейк-профитом'), val: `${stats.takeProfitCoveragePct.toFixed(0)}%` },
      { name: copy('Unmanaged Trades', 'Сделки без риск-данных'), val: `${stats.unmanagedRiskCount}` },
      { name: copy('Sample Size', 'Размер выборки'), val: copy(`${stats.pnls.length} trades`, `${stats.pnls.length} сделок`) }
    ]
  })

  const robustnessDistributionFits = computed(() => {
    const stats = diagnosticStats.value
    const normalWins = stats.preferredModel !== "Student's t"
    return [
      {
        name: copy('Normal', 'Спокойная модель'),
        isBest: normalWins,
        isReferenceOnly: false,
        aic: stats.normalParams.aic.toFixed(2),
        bic: stats.normalParams.bic.toFixed(2),
        params: [
          { name: copy('Mean', 'Среднее'), val: `$${stats.normalParams.mean.toFixed(2)}` },
          { name: copy('Sigma', 'Обычный разброс'), val: `$${stats.normalParams.std.toFixed(2)}` },
          { name: copy('Log Likelihood', 'Качество совпадения'), val: stats.normalParams.logL.toFixed(2) }
        ]
      },
      {
        name: copy('Large-trade model', 'Модель крупных сделок'),
        isBest: !normalWins,
        isReferenceOnly: false,
        aic: stats.tParams.aic.toFixed(2),
        bic: stats.tParams.bic.toFixed(2),
        params: [
          { name: copy('Mean', 'Среднее'), val: `$${stats.tParams.mean.toFixed(2)}` },
          { name: copy('Typical Swing Size', 'Типичный размер колебания'), val: `$${stats.tParams.scale.toFixed(2)}` },
          { name: copy('Large Trade Sensitivity', 'Чувствительность к крупным сделкам'), val: stats.tParams.nu.toFixed(2) },
          { name: copy('Log Likelihood', 'Качество совпадения'), val: stats.tParams.logL.toFixed(2) }
        ]
      },
      // These candidates are shown for orientation. At the moment the diagnostic
      // calculates information criteria only for the Normal and Student's t fits.
      {
        name: copy('Empirical / non-parametric', 'Эмпирическая / непараметрическая'),
        isBest: false,
        isReferenceOnly: true,
        aic: '—',
        bic: '—',
        params: []
      },
      {
        name: copy('Laplace', 'Лаплас'),
        isBest: false,
        isReferenceOnly: true,
        aic: '—',
        bic: '—',
        params: []
      },
      {
        name: copy('Logistic', 'Логистическая'),
        isBest: false,
        isReferenceOnly: true,
        aic: '—',
        bic: '—',
        params: []
      },
      {
        name: copy('Skew-normal', 'Асимметричная нормальная'),
        isBest: false,
        isReferenceOnly: true,
        aic: '—',
        bic: '—',
        params: []
      }
    ]
  })

  const robustnessDistributionComparison = computed(() => {
    const stats = diagnosticStats.value
    const deltaBic = stats.normalParams.bic - stats.tParams.bic
    if (stats.pnls.length < 5) {
      return copy(
        'There are still too few trades for a confident model choice. Treat this as an early warning, not a final conclusion.',
        'Сделок пока слишком мало для уверенного выбора модели. Воспринимайте это как раннее предупреждение, а не окончательный вывод.'
      )
    }
    if (deltaBic > 2) {
      return copy(
        `The data fits a model with more unusually large trades better than a calm normal model by ${deltaBic.toFixed(2)} BIC points. Manage this strategy with extra reserve cash and do not rely only on the average trade.`,
        `Данные лучше подходят к модели с крупными сделками, чем к спокойной модели, на ${deltaBic.toFixed(2)} BIC пунктов. Для такой стратегии нужен запас капитала, и нельзя полагаться только на среднюю сделку.`
      )
    }
    if (deltaBic < -2) {
      return copy(
        `The calm normal model fits better by ${Math.abs(deltaBic).toFixed(2)} BIC points. Results look more stable for now, but still check loss size and sample size before increasing risk.`,
        `Спокойная модель подходит лучше на ${Math.abs(deltaBic).toFixed(2)} BIC пунктов. Пока результаты выглядят стабильнее, но перед увеличением риска всё равно проверьте размер убытков и количество сделок.`
      )
    }
    return copy(
      'The model scores are close. The result is not clear yet, so keep both views visible and continue checking for unusually large trades.',
      'Оценки моделей близки. Вывод пока неясный, поэтому держите обе картины в поле зрения и продолжайте проверять необычно крупные сделки.'
    )
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
        id: 'balanced-shape',
        name: copy('Balanced Result Shape Check', 'Проверка сбалансированности результатов'),
        result: `${jarqueBera.toFixed(2)} ${jbPass ? copy('PASS', 'НОРМА') : copy('REJECTED', 'ОТКЛОНЕНО')}`,
        note: copy(
          'Checks whether the trade results look balanced enough to use a simple normal curve as a reference.',
          'Проверяет, выглядят ли результаты сделок достаточно сбалансированно, чтобы использовать простую нормальную кривую как ориентир.'
        ),
        pass: jbPass
      },
      {
        id: 'win-loss-balance',
        name: copy('Win/Loss Balance Check', 'Проверка баланса прибыль/убыток'),
        result: `${stats.skewness >= 0 ? '+' : ''}${stats.skewness.toFixed(2)} ${skewPass ? copy('PASS', 'НОРМА') : copy('WATCH', 'НАБЛЮДАТЬ')}`,
        note: copy(
          'Warns when losses are much larger than wins or wins are doing most of the work.',
          'Предупреждает, если убытки намного больше прибылей или если почти весь результат делают крупные прибыльные сделки.'
        ),
        pass: skewPass
      },
      {
        id: 'large-trade-frequency',
        name: copy('Large Trade Frequency Check', 'Проверка частоты крупных сделок'),
        result: `${stats.kurtosis >= 0 ? '+' : ''}${stats.kurtosis.toFixed(2)} ${kurtPass ? copy('PASS', 'НОРМА') : copy('LARGE_TRADES', 'КРУПНЫЕ_СДЕЛКИ')}`,
        note: copy(
          'Shows whether unusually large wins or losses appear more often than expected.',
          'Показывает, появляются ли необычно крупные прибыли или убытки чаще ожидаемого.'
        ),
        pass: kurtPass
      },
      {
        id: 'curve-alignment',
        name: copy('QQ-Plot Alignment Check', 'Проверка формы кривой сделок'),
        result: qqPass ? copy('ALIGNED', 'СОВПАДАЕТ') : copy('TAIL_DEVIATION', 'ЕСТЬ_ОТКЛОНЕНИЕ'),
        note: copy(
          'Checks whether real trades follow the expected curve or bend away at the largest wins and losses.',
          'Проверяет, следуют ли реальные сделки ожидаемой кривой или сильно отклоняются на крупнейших прибылях и убытках.'
        ),
        pass: qqPass
      },
      {
        id: 'large-trade-check',
        name: copy('Unusually Large Trade Check', 'Проверка необычно крупных сделок'),
        result: `${stats.tailOutlierCount || 0} ${outlierPass ? copy('PASS', 'НОРМА') : copy('CHECK_BIG_TRADES', 'ПРОВЕРИТЬ_КРУПНЫЕ')}`,
        note: copy(
          'Counts trades that are much larger than the usual range of this strategy.',
          'Считает сделки, которые намного больше обычного диапазона этой стратегии.'
        ),
        pass: outlierPass
      },
      {
        id: 'risk-coverage',
        name: copy('Risk Management Coverage Check', 'Проверка покрытия риск-менеджментом'),
        result: `${(stats.stopLossCoveragePct || 0).toFixed(0)}% ${riskPass ? copy('PASS', 'НОРМА') : copy('NO_RISK_MODEL', 'НЕТ_РИСК_МОДЕЛИ')}`,
        note: copy(
          'Checks whether enough trades have stop-loss data, especially when a few large trades can change the whole result.',
          'Проверяет, достаточно ли сделок имеют данные стоп-лосса, особенно когда несколько крупных сделок могут изменить весь результат.'
        ),
        pass: riskPass
      }
    ]
  })

  const robustnessHypothesisSummary = computed(() => {
    const tests = robustnessNormalityTests.value
    const failed = tests.filter(t => !t.pass)
    if (failed.length === 0) {
      return copy(
        'Hypothesis verdict: no major warning is visible yet. The normal curve view is usable, but keep checking whether future trades become unusually large.',
        'Итог проверки: серьёзных предупреждений пока не видно. Нормальную кривую можно использовать как ориентир, но продолжайте проверять, не появляются ли необычно крупные сделки.'
      )
    }

    const stats = diagnosticStats.value
    const hasNormalityFailure = failed.some(t => t.id === 'balanced-shape')
    const hasRiskModelFailure = failed.some(t => t.id === 'risk-coverage')
    const hasTailFailure = failed.some(t =>
      t.id === 'large-trade-frequency' ||
      t.id === 'large-trade-check' ||
      t.id === 'curve-alignment'
    )
    const hasShapeFailure = failed.some(t => t.id === 'win-loss-balance')

    if (hasRiskModelFailure && hasTailFailure && hasShapeFailure) {
      return copy(
        `Hypothesis verdict: fragile profile. Loss/win imbalance, unusually large trades, and weak risk controls are all active. The average PnL can be misleading. Stop-loss coverage is ${stats.stopLossCoveragePct.toFixed(0)}%.`,
        `Итог проверки: профиль хрупкий. Перекос прибыль/убыток, необычно крупные сделки и слабый контроль риска активны одновременно. Средний PnL может вводить в заблуждение. Покрытие стоп-лоссом: ${stats.stopLossCoveragePct.toFixed(0)}%.`
      )
    }

    if (hasRiskModelFailure && hasTailFailure) {
      return copy(
        `Hypothesis verdict: large-trade risk is not controlled. Some trades are much bigger than usual and risk coverage is weak, so improve controls before trusting the average trade. Stop-loss coverage is ${stats.stopLossCoveragePct.toFixed(0)}%.`,
        `Итог проверки: риск крупных сделок не контролируется. Некоторые сделки намного больше обычных, а покрытие риска слабое. Улучшите контроль до того, как доверять средней сделке. Покрытие стоп-лоссом: ${stats.stopLossCoveragePct.toFixed(0)}%.`
      )
    }

    if (hasRiskModelFailure && hasShapeFailure) {
      return copy(
        `Hypothesis verdict: uneven results and weak controls. Wins and losses are not balanced, and the risk model is too thin to trust the edge. Stop-loss coverage is ${stats.stopLossCoveragePct.toFixed(0)}%.`,
        `Итог проверки: результаты неровные, а контроль слабый. Прибыли и убытки не сбалансированы, и риск-модель слишком тонкая, чтобы доверять преимуществу. Покрытие стоп-лоссом: ${stats.stopLossCoveragePct.toFixed(0)}%.`
      )
    }

    if (hasRiskModelFailure) {
      return copy(
        `Hypothesis verdict: risk model missing. Results may look acceptable, but confidence is limited until stop-loss coverage improves from ${stats.stopLossCoveragePct.toFixed(0)}%.`,
        `Итог проверки: риск-модель отсутствует. Результаты могут выглядеть приемлемо, но уверенность ограничена, пока покрытие стоп-лоссом не улучшится с ${stats.stopLossCoveragePct.toFixed(0)}%.`
      )
    }

    if (hasTailFailure && hasShapeFailure) {
      return copy(
        'Hypothesis verdict: unstable result shape. Some trades are unusually large and wins/losses are not balanced, so do not judge the strategy only by average return.',
        'Итог проверки: форма результатов нестабильная. Некоторые сделки необычно крупные, а прибыли и убытки не сбалансированы, поэтому не оценивайте стратегию только по средней доходности.'
      )
    }

    if (hasTailFailure) {
      return copy(
        'Hypothesis verdict: a few unusually large trades are shaping the result. Check whether the strategy still works if the best trade or worst trade is removed.',
        'Итог проверки: несколько необычно крупных сделок формируют результат. Проверьте, работает ли стратегия, если убрать лучшую или худшую сделку.'
      )
    }

    if (hasShapeFailure) {
      return copy(
        'Hypothesis verdict: uneven wins and losses. The edge may depend too much on either big winners or avoiding big losers, so validate this before increasing size.',
        'Итог проверки: прибыли и убытки неровные. Преимущество может слишком сильно зависеть либо от крупных прибылей, либо от избегания крупных убытков, поэтому проверьте это перед увеличением размера.'
      )
    }

    if (hasNormalityFailure) {
      return copy(
        'Hypothesis verdict: the simple normal curve is not a strong fit. Use it as a visual reference only and confirm the edge with more trades.',
        'Итог проверки: простая нормальная кривая подходит слабо. Используйте её только как визуальный ориентир и подтверждайте преимущество большим количеством сделок.'
      )
    }

    return copy(
      'Hypothesis verdict: mixed warning. The sample is not clear enough for high confidence, so treat the edge as unconfirmed.',
      'Итог проверки: смешанное предупреждение. Выборка недостаточно ясная для высокой уверенности, поэтому считайте преимущество неподтверждённым.'
    )
  })

  const robustnessBootstrapSummary = computed(() => {
    const bs = diagnosticStats.value.bootstrapCI
    return [
      { name: copy('Simulations', 'Симуляции'), val: '500' },
      { name: copy('Mean Estimate', 'Оценка среднего'), val: `$${bs.mean.toFixed(2)}` },
      { name: copy('Std Error', 'Ошибка оценки'), val: `$${bs.stdErr.toFixed(2)}` },
      { name: copy('95% CI Lower', 'Нижняя граница 95%'), val: `$${bs.lower.toFixed(2)}` },
      { name: copy('95% CI Upper', 'Верхняя граница 95%'), val: `$${bs.upper.toFixed(2)}` },
      { name: copy('CI Width', 'Ширина диапазона'), val: `$${(bs.upper - bs.lower).toFixed(2)}` }
    ]
  })

  const robustnessBootstrapInterpretation = computed(() => {
    const bs = diagnosticStats.value.bootstrapCI
    if (bs.lower > 0) {
      return copy(
        'The resampling range stays above zero. The edge still looks positive after many re-checks, but position size should still respect the large-trade warnings.',
        'Диапазон повторных проверок остаётся выше нуля. Преимущество всё ещё выглядит положительным, но размер позиции должен учитывать предупреждения о крупных сделках.'
      )
    }
    if (bs.upper < 0) {
      return copy(
        'The resampling range stays below zero. The strategy currently looks negative after repeated checks and should be reworked.',
        'Диапазон повторных проверок остаётся ниже нуля. Сейчас стратегия выглядит отрицательной после повторных проверок и требует переработки.'
      )
    }
    return copy(
      'The resampling range crosses zero. The edge is not stable yet; collect more trades or reduce risk until the range stays positive.',
      'Диапазон повторных проверок пересекает ноль. Преимущество пока нестабильно: соберите больше сделок или снизьте риск, пока диапазон не станет положительным.'
    )
  })

  const robustnessReturnHeatmap = computed(() => {
    const monthNames = locale.value === 'ru'
      ? ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const currentTrades = getFilteredTrades()
    const cells = new Map<string, { month: string; weekday: string; pnl: number; count: number }>()
    const weekdays = locale.value === 'ru'
      ? ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    currentTrades.forEach(t => {
      const dRaw = t.dateExit || t.date
      const d = dRaw instanceof Date ? dRaw : new Date(dRaw)
      if (Number.isNaN(d.getTime())) return
      const key = `${d.getMonth()}-${d.getDay()}`
      const existing = cells.get(key) || { month: monthNames[d.getMonth()] || 'N/A', weekday: weekdays[d.getDay()] || 'N/A', pnl: 0, count: 0 }
      existing.pnl += getTradePnl(t)
      existing.count += 1
      cells.set(key, existing)
    })

    return Array.from(cells.values())
  })

  const robustnessUiLayerSummary = computed(() => {
    const m = strategyMetrics.value
    const stats = diagnosticStats.value
    return [
      { name: copy('Rolling Sharpe', 'Текущий Sharpe'), val: `${m.rollingSharpe.toFixed(2)}` },
      { name: copy('Rolling Sigma', 'Текущий разброс'), val: `${m.stdDevPct.toFixed(2)}%` },
      { name: copy('Rolling Drawdown', 'Текущая просадка'), val: `${m.rollingDrawdown.toFixed(1)}%` },
      { name: copy('Rolling Win Rate', 'Текущий win rate'), val: `${m.rollingWinRate.toFixed(1)}%` },
      { name: copy('Result Pattern Strength', 'Сила рисунка результатов'), val: `${m.distributionRobustness.toFixed(1)}` },
      { name: copy('Big Trade Impact', 'Влияние крупных сделок'), val: `${m.outlierImpactRatio.toFixed(1)}%` },
      { name: copy('Risk Coverage', 'Покрытие риска'), val: `${stats.stopLossCoveragePct.toFixed(0)}% SL / ${stats.takeProfitCoveragePct.toFixed(0)}% TP` },
      { name: copy('Heatmap Cells', 'Ячейки heatmap'), val: `${robustnessReturnHeatmap.value.length}` }
    ]
  })

  const robustnessVisualizationStatus = computed(() => {
    return [
      { name: copy('Histogram Overlay Selector', 'Переключатель гистограммы'), val: copy('Calm / large-trade overlay available', 'Доступно сравнение спокойной модели и модели крупных сделок') },
      { name: copy('Trade Result Curve Check', 'Проверка кривой результатов'), val: copy(`${diagnosticStats.value.qqPoints?.length || 0} points`, `${diagnosticStats.value.qqPoints?.length || 0} точек`) },
      { name: copy('Rolling Metrics', 'Текущие метрики'), val: copy('Sharpe, sigma, drawdown, win rate', 'Sharpe, разброс, просадка, win rate') },
      { name: copy('Calendar Heatmap', 'Календарная heatmap'), val: copy('Weekday / month return matrix', 'Матрица доходности по дням недели и месяцам') }
    ]
  })

  const robustnessExplanationSequence = computed(() => {
    const stats = diagnosticStats.value
    const normalBic = stats.normalParams?.bic ?? 0
    const tBic = stats.tParams?.bic ?? 0
    const modelReason = stats.preferredModel === "Student's t"
      ? copy(
        `The large-trade model score (${tBic.toFixed(2)}) is better than the calm normal score (${normalBic.toFixed(2)}), so unusually large trades deserve priority.`,
        `Оценка модели крупных сделок (${tBic.toFixed(2)}) лучше, чем оценка спокойной модели (${normalBic.toFixed(2)}), поэтому необычно крупные сделки важны в первую очередь.`
      )
      : copy(
        `The calm normal score (${normalBic.toFixed(2)}) is competitive with the large-trade score (${tBic.toFixed(2)}), so the profile is treated as calmer unless win/loss imbalance or large trades disagree.`,
        `Оценка спокойной модели (${normalBic.toFixed(2)}) сопоставима с моделью крупных сделок (${tBic.toFixed(2)}), поэтому профиль считается более спокойным, если перекос прибыль/убыток или крупные сделки не показывают обратное.`
      )

    return [
      copy(`1. Fit check: ${modelReason}`, `1. Проверка модели: ${modelReason}`),
      copy(
        `2. Curve range: the diagnostic view covers $${stats.curveDomain.min.toFixed(0)} to $${stats.curveDomain.max.toFixed(0)}, while real trades range from $${stats.minPnl.toFixed(0)} to $${stats.maxPnl.toFixed(0)}.`,
        `2. Диапазон кривой: диагностика покрывает от $${stats.curveDomain.min.toFixed(0)} до $${stats.curveDomain.max.toFixed(0)}, а реальные сделки находятся в диапазоне от $${stats.minPnl.toFixed(0)} до $${stats.maxPnl.toFixed(0)}.`
      ),
      copy(
        `3. Dispersion check: standard deviation is $${stats.std.toFixed(2)}, so compare the average trade against the normal swing size of this strategy.`,
        `3. Проверка разброса: обычное отклонение равно $${stats.std.toFixed(2)}, поэтому сравнивайте среднюю сделку с нормальным размером колебания этой стратегии.`
      ),
      copy(
        `4. Shape check: win/loss imbalance is ${stats.skewness >= 0 ? '+' : ''}${stats.skewness.toFixed(2)} and large-trade frequency is ${stats.kurtosis >= 0 ? '+' : ''}${stats.kurtosis.toFixed(2)}.`,
        `4. Проверка формы: перекос прибыль/убыток равен ${stats.skewness >= 0 ? '+' : ''}${stats.skewness.toFixed(2)}, а частота крупных сделок равна ${stats.kurtosis >= 0 ? '+' : ''}${stats.kurtosis.toFixed(2)}.`
      ),
      copy(
        `5. Risk check: stop-loss coverage is ${stats.stopLossCoveragePct.toFixed(0)}%, take-profit coverage is ${stats.takeProfitCoveragePct.toFixed(0)}%, and ${stats.unmanagedRiskCount} trades are unmanaged.`,
        `5. Проверка риска: покрытие стоп-лоссом ${stats.stopLossCoveragePct.toFixed(0)}%, покрытие тейк-профитом ${stats.takeProfitCoveragePct.toFixed(0)}%, сделок без риск-данных: ${stats.unmanagedRiskCount}.`
      ),
      copy(`6. Verdict: ${robustnessExplanation.value.verdict}.`, `6. Вывод: ${robustnessExplanation.value.verdict}.`),
      copy(`7. Action: ${robustnessExplanation.value.action}`, `7. Действие: ${robustnessExplanation.value.action}`)
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
