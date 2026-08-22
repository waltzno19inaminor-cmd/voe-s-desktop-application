import type { MetricEngine } from '~/entities/metric'
import { createUnavailableMetricResult } from './metricUtils'

export const executionConfidenceIndexMetric: MetricEngine = {
  key: 'execution_confidence_index',
  category: 'strategy_execution',
  i18n: {
    ru: {
      label: 'Индекс уверенности',
      sub: 'Композитная оценка 0-100',
      desc: 'Единая композитная оценка, объединяющая соблюдение матрицы, полноту забора тейк-профит, риск-соответствие и стабильность.',
      formula: '0.3*Соблюдение + 0.3*Захват тейк-профит + 0.2*Оценка риска + 0.2*Стабильность',
      benchmark: '>= 80 / 100 (Высокая уверенность)',
      evaluation: 'Комплексный индекс качества исполнения.'
    },
    en: {
      label: 'Execution Confidence Index',
      sub: 'Composite Grade 0-100',
      desc: 'Unified composite score combining adherence, target capture efficiency, risk compliance, and cognitive stability.',
      formula: '0.3*Adherence + 0.3*TP Capture + 0.2*Risk Score + 0.2*Stability',
      benchmark: '>= 80 / 100 (High Confidence)',
      evaluation: 'Composite execution quality grade.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const grade = Number(context?.executionConfidence ?? trade?.confidenceGrade)
    if (!Number.isFinite(grade)) {
      return createUnavailableMetricResult(locale, isRu ? 'Недостаточно данных для композитной оценки' : 'Insufficient composite inputs')
    }

    let status: 'optimal' | 'stable' | 'neutral' | 'warning' | 'critical' = 'optimal'
    let evalText = isRu ? 'Хорошо' : 'Good'
    let evalClass = 'text-emerald-500'
    let colorVal = '#34d399'

    if (grade >= 80) {
      status = 'optimal'
      evalText = isRu ? 'Хорошо' : 'Good'
      evalClass = 'text-emerald-500'
      colorVal = '#34d399'
    } else if (grade >= 60) {
      status = 'stable'
      evalText = isRu ? 'Стабильно' : 'Stable'
      evalClass = 'text-amber-500'
      colorVal = '#fbbf24'
    } else {
      status = 'critical'
      evalText = isRu ? 'Субоптимально' : 'Sub-Optimal'
      evalClass = 'text-rose-500'
      colorVal = '#f87171'
    }

    return {
      rawValue: grade,
      formattedValue: `${grade.toFixed(2)} / 100`,
      status,
      evaluationText: evalText,
      evalClass,
      benchmarkText: isRu ? '>= 80 — Высокое качество' : '>= 80 — High Confidence',
      benchmarks: [
        { label: '>= 80', eval: isRu ? 'Высокое качество' : 'High Confidence', class: 'text-emerald-500 font-bold' },
        { label: '60 - 79', eval: isRu ? 'Умеренно' : 'Moderate', class: 'text-amber-500 font-bold' },
        { label: '< 60', eval: isRu ? 'Низкое качество' : 'Low Confidence', class: 'text-rose-500 font-bold' }
      ],
      progress: grade,
      colorVal
    }
  }
}
