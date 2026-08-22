import type { MetricEngine } from '~/entities/metric'

export const profitCaptureRatioMetric: MetricEngine = {
  key: 'profitCaptureRatio',
  category: 'in_trade',
  i18n: {
    ru: {
      label: 'Захват движения',
      sub: 'Доля реализованного макс. движение в плюс в %',
      desc: 'Доля потенциально доступного движения (макс. движение в плюс), забранная фактическим выходом из сделки.',
      formula: '(Реализованный PnL / Макс. потенциальный макс. движение в плюс PnL) * 100',
      benchmark: '60% - 85% (Высокая полнота выхода)',
      evaluation: 'Эффективность своевременного фиксации прибыли.'
    },
    en: {
      label: 'Profit Capture Ratio',
      sub: 'Share of MFE captured',
      desc: 'Share of available favorable price movement captured by the actual exit.',
      formula: '(Realized PnL / Max Potential MFE PnL) * 100',
      benchmark: '60% - 85% (Optimal Exit)',
      evaluation: 'Efficiency of profit taking versus peak potential.'
    }
  },
  calculate(trade: any, context?: any, locale: 'ru' | 'en' = 'ru') {
    const captureRatioPct = Math.min(100, Math.max(0, Number(context?.captureRatio || trade?.captureRatio || 0)))

    const isRu = locale === 'ru'
    let status: 'optimal' | 'stable' | 'neutral' | 'warning' | 'critical' = 'neutral'
    let evalText = isRu ? 'Умеренный забор' : 'Moderate Capture'
    let evalClass = 'text-amber-400'
    let colorVal = '#fbbf24'

    if (captureRatioPct >= 65) {
      status = 'optimal'
      evalText = isRu ? 'Высокая полнота' : 'Optimal Exit'
      evalClass = 'text-emerald-400 font-bold'
      colorVal = '#34d399'
    } else if (captureRatioPct >= 40) {
      status = 'stable'
      evalText = isRu ? 'Приемлемо' : 'Acceptable'
      evalClass = 'text-emerald-300'
      colorVal = '#6ee7b7'
    } else if (captureRatioPct > 0) {
      status = 'warning'
      evalText = isRu ? 'Ранний/Поздний выход' : 'Sub-Optimal Exit'
      evalClass = 'text-rose-400'
      colorVal = '#fb7185'
    }

    return {
      rawValue: captureRatioPct,
      formattedValue: `${captureRatioPct.toFixed(1)}%`,
      status,
      evaluationText: evalText,
      evalClass,
      benchmarkText: isRu ? '60% - 85% — Точный выход' : '60% - 85% — Accurate Exit',
      benchmarks: [
        { label: '60% - 85%', eval: isRu ? 'Оптимально' : 'Optimal', class: 'text-emerald-400 font-bold' },
        { label: '40% - 60%', eval: isRu ? 'Средне' : 'Moderate', class: 'text-amber-400' },
        { label: '< 40%', eval: isRu ? 'Потеря движения' : 'Low Capture', class: 'text-rose-400' }
      ],
      progress: captureRatioPct,
      colorVal
    }
  }
}
