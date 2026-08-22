import type { MetricEngine } from '~/entities/metric'

export const riskBudgetAdherenceMetric: MetricEngine = {
  key: 'risk_budget_adherence',
  category: 'strategy_execution',
  i18n: {
    ru: {
      label: 'Соблюдение риск-бюджета',
      sub: 'Макс. риск к лимиту',
      desc: 'Сравнивает худшее значение между плановым риском стопа и фактическим убытком с лимитом риска на сделку.',
      formula: 'макс(Риск стопа, Фактический убыток) / Риск-бюджет × 100',
      benchmark: '<= 100% (В пределах лимита)',
      evaluation: 'Соответствие установленному лимиту капитала.'
    },
    en: {
      label: 'Risk Budget Adherence',
      sub: 'Max Risk vs Budget',
      desc: 'Compares worst value between planned stop risk and realized loss against Risk Per Trade budget.',
      formula: 'max(Stop Risk, Realized Loss) / Risk Budget × 100',
      benchmark: '<= 100% (Compliant)',
      evaluation: 'Risk budget compliance.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const isRu = locale === 'ru'
    const plannedRisk = Number(context?.plannedStopRiskDollars ?? trade?.riskDollars ?? 0)
    const pnl = Number(trade?.pnl || 0)
    const realizedLoss = Math.max(0, -pnl)
    const riskUsed = Math.max(plannedRisk, realizedLoss)
    const budget = Number(context?.riskBudget || riskUsed || 1)
    const ratio = (riskUsed / budget) * 100

    const isOk = ratio <= 100
    const evalClass = isOk ? 'text-emerald-500' : 'text-rose-500'

    return {
      rawValue: ratio,
      formattedValue: `${ratio.toFixed(2)}%`,
      status: isOk ? 'optimal' : 'critical',
      evaluationText: isOk ? (isRu ? 'В лимите' : 'Compliant') : (isRu ? 'Превышение бюджета' : 'Budget Exceeded'),
      evalClass,
      benchmarkText: isRu ? '<= 100% — Лимит соблюден' : '<= 100% — Compliant',
      benchmarks: [
        { label: '<= 100%', eval: isRu ? 'В лимите' : 'Compliant', class: 'text-emerald-500 font-bold' },
        { label: '> 100%', eval: isRu ? 'Превышение' : 'Budget Exceeded', class: 'text-rose-500 font-bold' }
      ],
      progress: Math.min(100, ratio),
      colorVal: isOk ? '#34d399' : '#f87171'
    }
  }
}
