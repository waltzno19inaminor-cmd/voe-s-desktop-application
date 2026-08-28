export type StrategyReportSection = {
  id: string
  page: string
  title: { en: string; ru: string }
  description: { en: string; ru: string }
}

export const strategyReportSections: StrategyReportSection[] = [
  {
    id: 'profits-losses',
    page: '01',
    title: { en: 'Profits & Losses', ru: 'Прибыли и убытки' },
    description: { en: 'How the observed result is composed.', ru: 'Из чего состоит наблюдаемый результат.' }
  },
  {
    id: 'trade-distribution',
    page: '02',
    title: { en: 'Trade Results Distribution', ru: 'Распределение результатов сделок' },
    description: { en: 'The shape and spread of individual outcomes.', ru: 'Форма и разброс отдельных результатов.' }
  },
  {
    id: 'risk-execution',
    page: '03',
    title: { en: 'Risk & Execution', ru: 'Риск и исполнение' },
    description: { en: 'Recorded stops, targets, exposure and holding time.', ru: 'Зафиксированные стопы, цели, риск и длительность.' }
  },
  {
    id: 'scenarios-conditions',
    page: '04',
    title: { en: 'Scenarios & Conditions', ru: 'Сценарии и условия' },
    description: { en: 'Results grouped by the context recorded in trades.', ru: 'Результаты в разрезе контекста, записанного в сделках.' }
  },
  {
    id: 'drawdowns',
    page: '05',
    title: { en: 'Drawdowns', ru: 'Просадки' },
    description: { en: 'Observed declines and recovery periods.', ru: 'Наблюдаемые снижения и периоды восстановления.' }
  },
  {
    id: 'robustness',
    page: '06',
    title: { en: 'Robustness Diagnostics', ru: 'Диагностика устойчивости' },
    description: { en: 'Independent checks of the observed result.', ru: 'Независимые проверки наблюдаемого результата.' }
  },
  {
    id: 'data-methodology',
    page: '07',
    title: { en: 'Data & Methodology', ru: 'Данные и методология' },
    description: { en: 'Definitions, coverage and calculation notes.', ru: 'Определения, полнота данных и примечания к расчётам.' }
  }
]
