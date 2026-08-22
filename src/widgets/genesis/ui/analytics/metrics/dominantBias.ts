import type { MetricEngine } from '~/entities/metric'

export const dominantBiasMetric: MetricEngine = {
  key: 'dominant_bias',
  category: 'behavioural',
  i18n: {
    ru: {
      label: 'Доминирующее смещение',
      sub: 'Приоритетный эмоциональный маркер',
      desc: 'Определяет главный психологический маркер трения и сопоставляет его с профилем риска.',
      formula: 'Приоритетный тег трения',
      benchmark: 'Нет (Чистое исполнение)',
      evaluation: 'Качественная классификация эмоциональной ошибки.'
    },
    en: {
      label: 'Dominant Bias',
      sub: 'Primary Friction Marker',
      desc: 'Identifies the primary psychological friction marker present and maps it to its execution risk profile.',
      formula: 'Highest Priority Friction Tag',
      benchmark: 'None (Clear Execution)',
      evaluation: 'Dominant emotional friction marker.'
    }
  },
  calculate(trade: any, _context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const emotions = Array.isArray(trade?.emotions) ? trade.emotions : []
    const firstFriction = emotions.find((e: string) => ['Fear', 'Greed', 'Anxiety', 'Hesitation', 'FOMO', 'Hope'].some(f => e.toLowerCase().includes(f.toLowerCase())))

    const biasText = firstFriction ? firstFriction : (isRu ? 'Отсутствует' : 'None')
    const isClear = !firstFriction || biasText === 'None' || biasText === 'Отсутствует'
    const evalClass = isClear ? 'text-emerald-500' : 'text-amber-500'

    return {
      rawValue: isClear ? 0 : 1,
      formattedValue: biasText,
      status: isClear ? 'optimal' : 'warning',
      evaluationText: isClear ? (isRu ? 'Чисто' : 'Clear') : (isRu ? 'Когнитивный риск' : 'Cognitive Risk'),
      evalClass,
      benchmarkText: isRu ? 'Нет — отсутствие когнитивных помех' : 'None — Clear Execution',
      benchmarks: [
        { label: isRu ? 'Нет' : 'None', eval: isRu ? 'Чистое исполнение' : 'Clear Execution', class: 'text-emerald-500 font-bold' },
        { label: isRu ? 'Активное смещение' : 'Active Bias', eval: isRu ? 'Когнитивный риск' : 'Cognitive Risk', class: 'text-amber-500 font-bold' }
      ],
      progress: isClear ? 100 : 40,
      colorVal: isClear ? '#34d399' : '#fbbf24'
    }
  }
}
