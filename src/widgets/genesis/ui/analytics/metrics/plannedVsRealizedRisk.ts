import type { MetricEngine } from '~/entities/metric'

export const plannedVsRealizedRiskMetric: MetricEngine = {
  key: 'planned_vs_realized_risk',
  category: 'execution',
  i18n: {
    ru: {
      label: 'Плановый и Реализованный риск',
      sub: 'Аудит стоп-риска',
      desc: 'Аудирует плановый риск стоп-лосса и фактический убыток относительно риск-бюджета.',
      formula: 'Риск стопа = |Вход - Стоп| * Размер · Фактический убыток = макс(0, -PnL)',
      benchmark: '<= Риск-бюджет (В пределах лимита)',
      evaluation: 'Соблюдение лимита риска на сделку.'
    },
    en: {
      label: 'Planned vs Realized Risk',
      sub: 'Risk Audit',
      desc: 'Audits planned stop-loss risk and realized loss against Risk Per Trade budget.',
      formula: 'Stop Risk = |Entry - Stop| * Size · Realized Loss = max(0, -PnL)',
      benchmark: '<= Risk Budget (Compliant)',
      evaluation: 'Risk budget compliance.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const plannedRisk = Number(context?.plannedStopRiskDollars ?? trade?.riskDollars ?? 0)
    const pnl = Number(trade?.pnl || 0)
    const realizedLoss = Math.max(0, -pnl)
    const budget = Number(context?.riskBudget || plannedRisk || realizedLoss || 1)

    const isCompliant = plannedRisk <= budget && realizedLoss <= budget
    const evalClass = isCompliant ? 'text-emerald-500' : 'text-rose-500'

    return {
      rawValue: Math.max(plannedRisk, realizedLoss),
      formattedValue: `S: $${plannedRisk.toFixed(0)} | R: $${realizedLoss.toFixed(0)}`,
      status: isCompliant ? 'optimal' : 'critical',
      evaluationText: isCompliant ? (isRu ? 'В лимите' : 'Compliant') : (isRu ? 'Превышение риска' : 'Breach Warning'),
      evalClass,
      benchmarkText: isRu ? '<= Лимит риска — Без нарушений' : '<= Risk Budget — Compliant',
      benchmarks: [
        { label: isRu ? '<= Риск-бюджет' : '<= Risk Budget', eval: isRu ? 'В лимите' : 'Compliant', class: 'text-emerald-500 font-bold' },
        { label: isRu ? '> Риск-бюджет' : '> Risk Budget', eval: isRu ? 'Превышение' : 'Breach Warning', class: 'text-rose-500 font-bold' }
      ],
      progress: Math.min(100, Math.max(0, (Math.max(plannedRisk, realizedLoss) / budget) * 100)),
      colorVal: isCompliant ? '#34d399' : '#f87171'
    }
  }
}
