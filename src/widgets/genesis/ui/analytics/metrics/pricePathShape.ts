import type { MetricEngine } from '~/entities/metric'

export const pricePathShapeMetric: MetricEngine = {
  key: 'pricePathShape',
  category: 'in_trade',
  i18n: {
    ru: {
      label: 'Форма движения',
      sub: 'Классификация траектории',
      desc: 'Классификация геометрической траектории движения цены от момента входа до момента закрытия.',
      formula: 'Паттерн сгенерированных свечей',
      benchmark: 'Чистый тренд (Чистый тренд)',
      evaluation: 'Качественный паттерн движения внутри сделки.'
    },
    en: {
      label: 'Price Path Shape',
      sub: 'Trajectory Classification',
      desc: 'Path pattern classification generated from price candles during trade duration.',
      formula: 'Generated Candle Path Pattern',
      benchmark: 'Clean Trend (Smooth Capture)',
      evaluation: 'Price path trajectory classification.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const shape = String(context?.pricePathShape || trade?.pathShape || '').toUpperCase()

    let labelText = isRu ? 'Недостаточно данных' : 'Insufficient Data'
    let evaluationText = labelText
    let status: 'optimal' | 'neutral' | 'warning' = 'neutral'
    let evalClass = 'text-slate-400'
    let progress = 0
    let colorVal = '#94a3b8'

    if (shape.includes('CLEAN_TREND') || shape.includes('TREND_CONTINUATION') || shape === 'FAVORABLE_FIRST') {
      labelText = isRu ? 'Чистый тренд' : 'Clean Trend'
      evaluationText = isRu ? 'Плавное движение' : 'Smooth Move'
      status = 'optimal'
      evalClass = 'text-emerald-500'
      progress = 100
      colorVal = '#34d399'
    } else if (shape.includes('FAVORABLE_THEN_PULLBACK')) {
      labelText = isRu ? 'В плюс, затем откат' : 'Favorable then Pullback'
      evaluationText = isRu ? 'Была просадка после роста' : 'Drawdown after Favorable Move'
      status = 'warning'
      evalClass = 'text-amber-500'
      progress = 55
      colorVal = '#fbbf24'
    } else if (shape.includes('ADVERSE')) {
      labelText = isRu ? 'Просадка, затем восстановление' : 'Adverse then Recovery'
      evaluationText = isRu ? 'Вход против движения' : 'Adverse Entry'
      status = 'warning'
      evalClass = 'text-amber-500'
      progress = 35
      colorVal = '#fbbf24'
    } else if (shape.includes('LATE_EXIT')) {
      labelText = isRu ? 'Поздний выход после максимума' : 'Late Exit after MFE'
      evaluationText = isRu ? 'Значимая прибыль была отдана' : 'Favorable Move Was Given Back'
      status = 'warning'
      evalClass = 'text-amber-500'
      progress = 40
      colorVal = '#fbbf24'
    } else if (shape.includes('TWO_SIDED')) {
      labelText = isRu ? 'Двустороннее движение' : 'Two-Sided Move'
      evaluationText = isRu ? 'Порядок high/low внутри свечи неизвестен' : 'Intrabar High/Low Order Unknown'
      status = 'warning'
      evalClass = 'text-amber-500'
      progress = 30
      colorVal = '#fbbf24'
    } else if (shape.includes('CHOPPY')) {
      labelText = isRu ? 'Рваное движение' : 'Choppy Path'
      evaluationText = isRu ? 'Частая смена направления' : 'Frequent Direction Changes'
      status = 'warning'
      evalClass = 'text-amber-500'
      progress = 30
      colorVal = '#fbbf24'
    } else if (shape.includes('NOISE')) {
      labelText = isRu ? 'Шумовой диапазон' : 'Noise Range'
      evaluationText = isRu ? 'Нет значимого импульса' : 'No Meaningful Impulse'
      status = 'neutral'
      evalClass = 'text-slate-400'
      progress = 20
      colorVal = '#94a3b8'
    }

    return {
      rawValue: status === 'optimal' ? 1 : 0,
      formattedValue: labelText,
      status,
      evaluationText,
      evalClass,
      benchmarkText: isRu ? 'Чистый тренд — плавный захват' : 'Clean Trend — Smooth Capture',
      benchmarks: [
        { label: isRu ? 'Чистый тренд' : 'Clean Trend', eval: isRu ? 'Чистый тренд' : 'Clean Trend', class: 'text-emerald-500 font-bold' },
        { label: isRu ? 'Рваная траектория' : 'Choppy Path', eval: isRu ? 'Шумовое движение' : 'Choppy Path', class: 'text-amber-500 font-bold' }
      ],
      progress,
      colorVal
    }
  }
}
