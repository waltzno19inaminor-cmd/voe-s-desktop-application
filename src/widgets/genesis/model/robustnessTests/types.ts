export type RobustnessStatus = 'passed' | 'failed' | 'inconclusive' | 'unavailable' | 'observed'

export type LocalizedText = {
  en: string
  ru: string
}

export type RobustnessRow = {
  label: LocalizedText
  value: string
}

export type RobustnessChartSeries = {
  label: LocalizedText
  values: number[]
  color?: string
  dashed?: boolean
}

export type RobustnessChartSpec = {
  kind: 'bars' | 'line' | 'fan'
  labels: string[]
  series: RobustnessChartSeries[]
  zeroLine?: number
  yUnit?: LocalizedText
  lowerBand?: number[]
  upperBand?: number[]
}

export type RobustnessTestCard = {
  id: string
  title: LocalizedText
  question: LocalizedText
  criterion: LocalizedText
  status: RobustnessStatus
  result: LocalizedText
  rows: RobustnessRow[]
  chart: RobustnessChartSpec | null
  note?: LocalizedText
}

export type RobustnessTrade = Record<string, any>

export type RobustnessTestContext = {
  trades: RobustnessTrade[]
  pnls: number[]
  getTradePnl: (trade: RobustnessTrade) => number
}

export const text = (en: string, ru: string): LocalizedText => ({ en, ru })

