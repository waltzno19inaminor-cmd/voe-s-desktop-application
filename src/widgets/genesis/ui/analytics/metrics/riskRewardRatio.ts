import type { MetricEngine } from '~/entities/metric'
import { createUnavailableMetricResult, getPositiveTradeLevels, getValidTradeRiskReward } from './metricUtils'

export const riskRewardRatioMetric: MetricEngine = {
  key: 'riskRewardRatio',
  category: 'simple',
  i18n: {
    ru: {
      label: 'Риск/Прибыль',
      sub: 'Соотношение риск/прибыль',
      desc: 'Соотношение потенциальной прибыли к заложенному риску сделки (Риск/Прибыль).',
      formula: 'Плановая прибыль / Риск стоп-лосса',
      benchmark: '>= 2.00R (Высокая асимметрия)',
      evaluation: 'Соотношение планируемого профита к допустимому риску.'
    },
    en: {
      label: 'Risk/Reward Ratio',
      sub: 'Setup R/R ratio',
      desc: 'Ratio of planned target profit relative to defined stop loss risk.',
      formula: 'Planned Profit / Stop Loss Risk',
      benchmark: '>= 2.00R (High Asymmetry)',
      evaluation: 'Asymmetry of return versus potential loss.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const levels = getPositiveTradeLevels(trade)
    if (levels.entry === null || levels.stopLoss === null || levels.takeProfit === null) {
      return createUnavailableMetricResult(locale, isRu ? 'Нужны положительные Entry, Stop Loss и Take Profit' : 'Positive Entry, Stop Loss, and Take Profit required')
    }

    const rr = getValidTradeRiskReward(trade) ?? (Number.isFinite(Number(context?.rr)) ? Number(context?.rr) : null)
    if (rr === null || rr <= 0) {
      return createUnavailableMetricResult(locale, isRu ? 'Нужны положительные Entry, Stop Loss и Take Profit' : 'Positive Entry, Stop Loss, and Take Profit required')
    }

    let status: 'optimal' | 'stable' | 'neutral' | 'warning' | 'critical' = 'neutral'
    let evalText = isRu ? 'Допустимое' : 'Nominal R/R'
    let evalClass = 'text-amber-400'
    let colorVal = '#fbbf24'

    if (rr >= 2.5) {
      status = 'optimal'
      evalText = isRu ? 'Отличная асимметрия' : 'High Asymmetry'
      evalClass = 'text-emerald-400 font-bold'
      colorVal = '#34d399'
    } else if (rr >= 1.5) {
      status = 'stable'
      evalText = isRu ? 'Хорошее соотношение' : 'Solid R/R'
      evalClass = 'text-emerald-300'
      colorVal = '#6ee7b7'
    } else if (rr < 1.0) {
      status = 'warning'
      evalText = isRu ? 'Низкий профит-фактор' : 'Sub-Optimal R/R'
      evalClass = 'text-rose-400 font-bold'
      colorVal = '#fb7185'
    }

    return {
      rawValue: rr,
      formattedValue: `${rr.toFixed(2)}R`,
      status,
      evaluationText: evalText,
      evalClass,
      benchmarkText: isRu ? '>= 2.00R — Оптимальный профиль' : '>= 2.00R — Optimal Profile',
      benchmarks: [
        { label: '>= 2.00R', eval: isRu ? 'Отлично' : 'Optimal', class: 'text-emerald-400 font-bold' },
        { label: '1.00R - 2.00R', eval: isRu ? 'Приемлемо' : 'Nominal', class: 'text-amber-400' },
        { label: '< 1.00R', eval: isRu ? 'Высокий риск' : 'Sub-Optimal', class: 'text-rose-400' }
      ],
      progress: Math.min(100, Math.max(0, (rr / 4) * 100)),
      colorVal
    }
  }
}
