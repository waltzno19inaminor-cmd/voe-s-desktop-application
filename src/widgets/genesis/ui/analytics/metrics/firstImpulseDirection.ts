import type { MetricEngine } from '~/entities/metric'

export const firstImpulseDirectionMetric: MetricEngine = {
  key: 'firstImpulseDirection',
  category: 'in_trade',
  i18n: {
    ru: {
      label: 'Первый импульс',
      sub: 'Направление после входа',
      desc: 'Первое значимое движение цены сразу после открытия позиции: в плюс или в минус.',
      formula: 'Первое значимое движение после входа',
      benchmark: 'В плюс (Импульс в плюс)',
      evaluation: 'Точность момента входа в позицию.'
    },
    en: {
      label: 'First Impulse Direction',
      sub: 'Post-Entry Momentum',
      desc: 'First meaningful price move after entry: favorable or adverse.',
      formula: 'First Significant Post-Entry Move',
      benchmark: 'Favorable (Immediate Profit)',
      evaluation: 'Timing precision of position entry.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const impulse = String(context?.firstImpulse || trade?.firstImpulse || '').toUpperCase()

    if (!impulse || impulse === 'AMBIGUOUS') {
      const isAmbiguous = impulse === 'AMBIGUOUS'
      return {
        rawValue: 0,
        formattedValue: isAmbiguous
          ? (isRu ? 'Неоднозначно' : 'Ambiguous')
          : (isRu ? 'Недостаточно данных' : 'Insufficient Data'),
        status: 'neutral',
        evaluationText: isAmbiguous
          ? (isRu ? 'Порядок движения внутри свечи неизвестен' : 'Intrabar Move Order Unknown')
          : (isRu ? 'Нет значимого импульса' : 'No Meaningful Impulse'),
        evalClass: 'text-slate-400',
        benchmarkText: isRu ? 'В плюс — сразу в прибыль' : 'Favorable — Immediate Profit',
        benchmarks: [
          { label: isRu ? 'В плюс' : 'Favorable', eval: isRu ? 'Сразу в плюс' : 'Favorable', class: 'text-emerald-500 font-bold' },
          { label: isRu ? 'Против позиции' : 'Adverse', eval: isRu ? 'Первичная просадка' : 'Adverse', class: 'text-rose-500 font-bold' }
        ],
        progress: 0,
        colorVal: '#94a3b8'
      }
    }

    const isFavorable = impulse === 'PROFIT' || impulse === 'FAVORABLE'
    const evalClass = isFavorable ? 'text-emerald-500' : 'text-rose-500'
    const formattedValue = isFavorable ? (isRu ? 'В плюс' : 'Favorable') : (isRu ? 'В минус' : 'Adverse')

    return {
      rawValue: isFavorable ? 1 : -1,
      formattedValue,
      status: isFavorable ? 'optimal' : 'critical',
      evaluationText: isFavorable ? (isRu ? 'Точный вход' : 'Timely Entry') : (isRu ? 'Вход против движения' : 'Adverse Impulse'),
      evalClass,
      benchmarkText: isRu ? 'В плюс — сразу в прибыль' : 'Favorable — Immediate Profit',
      benchmarks: [
        { label: isRu ? 'В плюс' : 'Favorable', eval: isRu ? 'Сразу в плюс' : 'Favorable', class: 'text-emerald-500 font-bold' },
        { label: isRu ? 'Против позиции' : 'Adverse', eval: isRu ? 'Первичная просадка' : 'Adverse', class: 'text-rose-500 font-bold' }
      ],
      progress: isFavorable ? 100 : 20,
      colorVal: isFavorable ? '#34d399' : '#f87171'
    }
  }
}
