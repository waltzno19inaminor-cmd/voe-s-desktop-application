import type { MetricEngine } from '~/entities/metric'

export const hadNewsMetric: MetricEngine = {
  key: 'hadNews',
  category: 'in_trade',
  i18n: {
    ru: {
      label: 'Новости во время сделки',
      sub: 'Новостной фон',
      desc: 'Отметка пользователя о наличии выходящих экономических новостей во время удержания сделки.',
      formula: 'Ручная отметка новостей',
      benchmark: 'Нет (Спокойный рынок)',
      evaluation: 'Учет внешнего новостного фактора.'
    },
    en: {
      label: 'News During Trade',
      sub: 'Macro News Backdrop',
      desc: 'Manual user mark for whether high-impact news occurred during the trade duration.',
      formula: 'User Manual News Tag',
      benchmark: 'No (Technical Market)',
      evaluation: 'Macroeconomic news exposure.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const hadNews = Boolean(
      context?.hadNews ??
      context?.tradeStudyMetrics?.hadNews ??
      trade?.tradeStudyMetrics?.hadNews ??
      trade?.studyMetrics?.hadNews ??
      trade?.hadNews ??
      false
    )

    const formattedValue = hadNews ? (isRu ? 'Да' : 'Yes') : (isRu ? 'Нет' : 'No')
    const evalClass = hadNews ? 'text-amber-500' : 'text-emerald-500'

    return {
      rawValue: hadNews ? 1 : 0,
      formattedValue,
      status: hadNews ? 'warning' : 'optimal',
      evaluationText: hadNews ? (isRu ? 'Новостной фон' : 'News Active') : (isRu ? 'Спокойный рынок' : 'Technical Market'),
      evalClass,
      benchmarkText: isRu ? 'No — Без новостного риска' : 'No — Technical Market',
      benchmarks: [
        { label: 'No', eval: isRu ? 'Спокойно' : 'Technical Market', class: 'text-emerald-500 font-bold' },
        { label: isRu ? 'Да' : 'Yes', eval: isRu ? 'Новостной фон' : 'News Active', class: 'text-amber-500 font-bold' }
      ],
      progress: hadNews ? 40 : 100,
      colorVal: hadNews ? '#fbbf24' : '#34d399'
    }
  }
}
