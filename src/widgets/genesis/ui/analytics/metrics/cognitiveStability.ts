import type { MetricEngine } from '~/entities/metric'

export const cognitiveStabilityMetric: MetricEngine = {
  key: 'cognitive_stability',
  category: 'behavioural',
  i18n: {
    ru: {
      label: 'Когнитивная стабильность',
      sub: 'Нейронная телеметрия',
      desc: 'Оценивает активные эмоциональные маркеры, вычитая баллы стабильности за теги психологического трения.',
      formula: '100 - (Теги трения * 15)',
      benchmark: '>= 70% (Устойчивое состояние)',
      evaluation: 'Уровень психологической устойчивости при входе.'
    },
    en: {
      label: 'Cognitive Stability',
      sub: 'Neural Telemetry',
      desc: 'Evaluates active emotional markers, deducting stability points for psychological friction tags.',
      formula: '100 - (Friction Tags * 15)',
      benchmark: '>= 70% (Stable)',
      evaluation: 'Emotional resilience during execution.'
    }
  },
  calculate(trade: any, _context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const emotions = Array.isArray(trade?.emotions) ? trade.emotions : []
    const frictionTags = emotions.filter((e: string) => ['Fear', 'Greed', 'Anxiety', 'Hesitation', 'FOMO'].some(f => e.toLowerCase().includes(f.toLowerCase()))).length
    const stability = Math.max(0, 100 - (frictionTags * 15))

    const isStable = stability >= 70
    const evalClass = isStable ? 'text-emerald-500' : 'text-rose-500'

    return {
      rawValue: stability,
      formattedValue: `${stability.toFixed(2)}%`,
      status: isStable ? 'optimal' : 'critical',
      evaluationText: isStable ? (isRu ? 'Стабильно' : 'Stable') : (isRu ? 'Нестабильно' : 'Unstable'),
      evalClass,
      benchmarkText: isRu ? '>= 70% — Эмоциональная устойчивость' : '>= 70% — Stable',
      benchmarks: [
        { label: '>= 70%', eval: isRu ? 'Стабильно' : 'Stable', class: 'text-emerald-500 font-bold' },
        { label: '< 70%', eval: isRu ? 'Нестабильно' : 'Unstable', class: 'text-rose-500 font-bold' }
      ],
      progress: stability,
      colorVal: isStable ? '#34d399' : '#f87171'
    }
  }
}
