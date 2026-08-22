import type { MetricEngine } from '~/entities/metric'
import { createUnavailableMetricResult } from './metricUtils'

export const profitFactorMetric: MetricEngine = {
  key: 'profitFactor',
  category: 'simple',
  i18n: {
    ru: {
      label: 'Фактор прибыли',
      sub: 'Отношение валовой прибыли к валовому убытку',
      desc: 'Соотношение общей валовой прибыли к общему валовому убытку системы.',
      formula: 'Валовая прибыль / Валовой убыток',
      benchmark: '>= 1.50x (Устойчивое преимущество)',
      evaluation: 'Запас финансовой прочности и математическое превосходство.'
    },
    en: {
      label: 'Profit Factor',
      sub: 'Gross Profit / Gross Loss ratio',
      desc: 'Ratio of total gross profit to total gross loss in strategy history.',
      formula: 'Gross Profit / Gross Loss',
      benchmark: '>= 1.50x (Sustainable Edge)',
      evaluation: 'Asymmetry of overall winnings over losses.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const pf = Number(context?.profitFactor ?? trade?.profitFactor)
    if (!Number.isFinite(pf) || pf < 0) {
      return createUnavailableMetricResult(
        locale,
        locale === 'ru'
          ? 'Нужны хотя бы одна прибыльная и одна убыточная закрытая сделка'
          : 'At least one winning and one losing closed trade are required'
      )
    }

    const isRu = locale === 'ru'
    let status: 'optimal' | 'stable' | 'neutral' | 'warning' | 'critical' = 'neutral'
    let evalText = isRu ? 'Умеренный' : 'Nominal'
    let evalClass = 'text-amber-400'
    let colorVal = '#fbbf24'

    if (pf >= 1.75) {
      status = 'optimal'
      evalText = isRu ? 'Высокая прочность' : 'Optimal'
      evalClass = 'text-emerald-400 font-bold'
      colorVal = '#34d399'
    } else if (pf >= 1.25) {
      status = 'stable'
      evalText = isRu ? 'Устойчивый' : 'Sustainable'
      evalClass = 'text-emerald-300'
      colorVal = '#6ee7b7'
    } else if (pf < 1.0) {
      status = 'critical'
      evalText = isRu ? 'Убыточный' : 'Sub-Optimal'
      evalClass = 'text-rose-500 font-bold'
      colorVal = '#f43f5e'
    }

    return {
      rawValue: pf,
      formattedValue: `${pf.toFixed(2)}x`,
      status,
      evaluationText: evalText,
      evalClass,
      benchmarkText: isRu ? '>= 1.50x — Высокий предел прочности' : '>= 1.50x — High Quality Margin',
      benchmarks: [
        { label: '>= 1.50x', eval: isRu ? 'Отлично' : 'Optimal', class: 'text-emerald-400 font-bold' },
        { label: '1.00x - 1.50x', eval: isRu ? 'Норма' : 'Nominal', class: 'text-amber-400' },
        { label: '< 1.00x', eval: isRu ? 'Убыток' : 'Sub-Optimal', class: 'text-rose-500 font-bold' }
      ],
      progress: Math.min(100, Math.max(0, (pf / 3) * 100)),
      colorVal
    }
  }
}
