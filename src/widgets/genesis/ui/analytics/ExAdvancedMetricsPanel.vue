<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import {
  getTradeBalanceBefore,
  getTradeExitTimestamp,
  getTradePnl,
  getTradeRiskReward
} from '~/widgets/genesis/model/metrics'
import { getTradePlannedStopRiskDollars } from '~/widgets/genesis/model/tradeRisk'
import { isClosedTradeForMetrics } from '~/widgets/genesis/model/tradePnl'
import { buildTradeProfitabilityScoreIndex } from '~/widgets/genesis/model/tradeProfitabilityScore'
import { buildTradeGeneratedInTradeAnalysis } from '~/widgets/genesis/model/generatedInTradeAnalysis'
import { useTradeAnalysisMetrics } from './metrics'
import ExScorePatternsPanel from './ExScorePatternsPanel.vue'

interface AdvancedMetricsPanelProps {
  trade?: any
  allTrades?: any[]
  initialBalance?: number
}

const props = withDefaults(defineProps<AdvancedMetricsPanelProps>(), {
  allTrades: () => [],
  initialBalance: 10000
})

const { locale } = useI18n()
const activeAdvancedTab = ref<'general' | 'patterns'>('general')
const isRequiredConditionsExpanded = ref(false)

const formatDisplayLabel = (value: unknown) => String(value ?? '').replace(/_/g, ' ')

const getScorePatternTooltip = (pattern: ScorePattern, mode: 'high' | 'low') => {
  const isRu = locale.value === 'ru'
  const label = pattern.label.toLowerCase()
  let meaning = isRu
    ? `«${pattern.label}» — это показатель, который нужно оценивать по его смыслу, а не только по близости к диапазону.`
    : `“${pattern.label}” is a value with a concrete meaning, not just a number to match.`
  let simple = isRu
    ? 'Сначала переведите значение в понятный вопрос о сделке: что именно оно измеряет и хорошо ли это для риска.'
    : 'Translate the number into a practical question about the trade: what does it measure, and is it good for the risk taken?'
  let lowAction = isRu ? 'Что делать для low score' : 'What to do for low score'
  let highAction = isRu ? 'Что делать для high score' : 'What to do for high score'

  if (label.includes('actual') && label.includes('target') && (label.includes('rr') || label.includes('risk'))) {
    meaning = isRu
      ? 'Показывает фактический R/R, рассчитанный по входу, стопу и цели, и позволяет сравнить его с целевым R/R. Это не «оценка от 0 до 1». Например, 0.96–2.64 означает фактический диапазон: от 0.96R до 2.64R. При цели 2R нижняя граница ниже плана, верхняя — выше плана.'
      : 'Shows the trade’s actual R/R calculated from entry, stop, and target, so it can be compared with the target R/R. It is not a 0-to-1 score. For example, 0.96–2.64 means actual R/R from 0.96R to 2.64R. With a 2R target, the lower end is below plan and the upper end is above plan.'
    simple = isRu
      ? '1R означает прибыль, равную риску; 2R — прибыль в два раза больше риска. Значение ниже целевого R/R означает недобор по отношению к плану, значение выше цели — план превышен.'
      : '1R means reward equal to the risk; 2R means reward twice the risk. A value below the target R/R means the plan was not reached; a value above target means it was exceeded.'
    lowAction = isRu
      ? 'Избегайте входов, где actual R/R ниже target R/R: улучшите точку входа, уменьшите неоправданный стоп или заранее определите достижимую цель. Не принимайте сделку, если прибыль не оправдывает риск.'
      : 'Avoid entries where actual R/R is below target R/R: improve the entry, remove an unnecessarily wide stop, or set a realistic target. Do not take a trade when the reward does not justify the risk.'
    highAction = isRu
      ? 'Сохраняйте actual R/R не ниже target R/R: не ухудшайте вход и стоп, а прибыльную цель не уменьшайте без причины.'
      : 'Keep actual R/R at or above target R/R: do not worsen the entry or stop, and do not reduce the profitable target without a reason.'
  } else if (label.includes('risk/reward') || label.includes('risk reward')) {
    meaning = isRu
      ? 'R/R — это расстояние от входа до цели, делённое на расстояние от входа до стопа. Он отвечает на вопрос: сколько можно получить, рискуя одной единицей.'
      : 'R/R is the distance from entry to target divided by the distance from entry to stop. It answers: how much can be gained for one unit of risk?'
    simple = isRu
      ? 'R/R 0.8 означает возможные $0.80 на каждый $1 риска; R/R 2 означает возможные $2 на каждый $1 риска.'
      : 'R/R 0.8 means a possible $0.80 for every $1 at risk; R/R 2 means a possible $2 for every $1 at risk.'
    lowAction = isRu
      ? 'Избегайте низкого R/R: ищите более близкий стоп, более достижимую цель или пропускайте сделку, если соотношение не оправдывает риск.'
      : 'Avoid low R/R: look for a tighter stop, a realistic target, or skip the trade when the ratio does not justify the risk.'
    highAction = isRu
      ? 'Сохраняйте высокий R/R, но не расширяйте стоп искусственно ради красивого числа: риск должен оставаться контролируемым.'
      : 'Preserve high R/R, but do not widen the stop just to make the number look better: risk must remain controlled.'
  } else if (label.includes('stop loss') || label.includes('stop distance')) {
    meaning = isRu
      ? 'Показывает расстояние от цены входа до стоп-лосса в процентах. Это размер движения против позиции, после которого сделка закрывается с убытком.'
      : 'Shows the percentage distance from entry to the stop-loss. It is the adverse move that closes the trade at a loss.'
    simple = isRu
      ? 'Стоп 2% означает: если цена пойдёт против вас примерно на 2%, позиция будет закрыта. Чем шире стоп, тем больше денег рискуется при том же объёме.'
      : 'A 2% stop means the position closes if price moves about 2% against you. A wider stop puts more money at risk with the same position size.'
    lowAction = isRu
      ? 'Избегайте неоправданно широкого стопа: уменьшите размер позиции или пропустите сделку, если разумный стоп делает риск слишком большим.'
      : 'Avoid an unjustifiably wide stop: reduce position size or skip the trade if a sensible stop still makes the risk too large.'
    highAction = isRu
      ? 'Сохраняйте такой же технически обоснованный стоп и не двигайте его дальше, чтобы не признавать ошибку.'
      : 'Keep the same technically justified stop and do not move it farther away to avoid accepting a loss.'
  } else if (label.includes('take profit') || label.includes('take profit distance')) {
    meaning = isRu
      ? 'Показывает расстояние от входа до цели в процентах. Это движение цены в вашу сторону, на котором планируется зафиксировать прибыль.'
      : 'Shows the percentage distance from entry to the take-profit. It is the favorable price move at which profit is planned to be taken.'
    simple = isRu
      ? 'Цель 3% означает: сделка рассчитана на движение цены примерно на 3% в вашу сторону. Сама по себе дальняя цель не гарантирует, что цена до неё дойдёт.'
      : 'A 3% target means the trade expects price to move about 3% in your favor. A farther target does not guarantee that price will reach it.'
    lowAction = isRu
      ? 'Избегайте слишком далёких целей без подтверждения движения: цель должна быть достижимой относительно стопа и рыночной волатильности.'
      : 'Avoid targets that are too far away without evidence of momentum: the target must be realistic for the stop and market volatility.'
    highAction = isRu
      ? 'Сохраняйте достижимую цель, которая даёт достаточную прибыль относительно риска; не ставьте её дальше только ради большого R/R.'
      : 'Keep a realistic target that pays enough for the risk; do not move it farther only to create a larger R/R.'
  } else if (label.includes('profit factor')) {
    meaning = isRu
      ? 'Profit Factor — это сумма всех прибылей, делённая на сумму всех убытков. Он показывает, сколько долларов прибыли приходится на каждый потерянный доллар.'
      : 'Profit Factor is total winning dollars divided by total losing dollars. It shows how many dollars are earned for each dollar lost.'
    simple = isRu
      ? '1.0 означает, что прибыли и убытки равны; 1.5 означает $1.50 прибыли на каждый $1 убытка; меньше 1 — система теряет деньги.'
      : '1.0 means wins and losses are equal; 1.5 means $1.50 won for every $1 lost; below 1 means the system loses money.'
    lowAction = isRu
      ? 'Избегайте условий, при которых сумма убытков съедает прибыль: уменьшайте потери и не повторяйте слабые сетапы.'
      : 'Avoid conditions where losses consume the wins: reduce losses and stop repeating weak setups.'
    highAction = isRu
      ? 'Сохраняйте сделки, которые дают прибыль больше суммарного риска, и не увеличивайте потери ради редких больших выигрышей.'
      : 'Keep trades that produce more winning dollars than losing dollars, without increasing losses for occasional large wins.'
  } else if (label.includes('win rate') || label.includes('win percentage')) {
    meaning = isRu
      ? 'Win Rate — доля закрытых прибыльных сделок. 60% означает, что прибыльными были примерно 6 из 10 сделок.'
      : 'Win Rate is the share of closed trades that were profitable. 60% means roughly 6 of every 10 trades won.'
    simple = isRu
      ? 'Высокий Win Rate не гарантирует прибыль: десять маленьких выигрышей могут быть хуже одного большого убытка.'
      : 'A high Win Rate does not guarantee profit: ten small wins can be worse than one large loss.'
    lowAction = isRu
      ? 'Избегайте входов без подтверждения и не пытайтесь повышать Win Rate за счёт слишком раннего закрытия прибыльных сделок.'
      : 'Avoid unconfirmed entries, and do not raise Win Rate by cutting profitable trades too early.'
    highAction = isRu
      ? 'Сохраняйте условия, при которых сделки чаще закрываются в плюс, но проверяйте их вместе с размером выигрышей и убытков.'
      : 'Preserve conditions that win more often, but always check them together with the size of wins and losses.'
  } else if (label.includes('position size') || label.includes('size')) {
    meaning = isRu
      ? 'Показывает объём позиции в лотах. Это не качество сигнала, а размер сделки и, вместе со стопом, сумма денег под риском.'
      : 'Shows the position size in lots. It is not signal quality; together with the stop, it determines the money at risk.'
    simple = isRu
      ? '2 лота — это позиция в два лота. При одинаковом стопе 2 лота рискуют примерно вдвое больше, чем 1 лот.'
      : '2 lots means a two-lot position. With the same stop, 2 lots risk roughly twice as much as 1 lot.'
    lowAction = isRu
      ? 'Избегайте объёма, который делает один убыток слишком большим для счёта; размер должен вытекать из допустимого риска.'
      : 'Avoid a size that makes one loss too large for the account; size the trade from the allowed risk.'
    highAction = isRu
      ? 'Сохраняйте дисциплинированный объём и не увеличивайте его только потому, что предыдущие сделки были успешными.'
      : 'Keep position size disciplined and do not increase it just because recent trades were successful.'
  } else if (label.includes('holding') || label.includes('duration') || label.includes('время')) {
    meaning = isRu
      ? 'Показывает, сколько времени сделки этой score-группы обычно находятся открытыми.'
      : 'Shows how long trades in this score cohort usually stay open.'
    simple = isRu
      ? 'Например, 2 часа означает, что позиция обычно оставалась открытой около двух часов. Долгое удержание — это не автоматически хорошо: важно, двигалась ли цена в вашу сторону.'
      : 'For example, 2 hours means the position usually stayed open for about two hours. Holding longer is not automatically better: what matters is whether price moved in your favor.'
    lowAction = isRu
      ? 'Избегайте слишком долгого удержания, если цена не движется в вашу сторону.'
      : 'Avoid holding too long when price is not moving in your favor.'
    highAction = isRu
      ? 'Старайтесь удерживать сделки столько, сколько нужно для развития движения.'
      : 'Try to hold trades long enough for the move to develop.'
  } else if (label.includes('result') || label.includes('pnl') || label.includes('результат')) {
    meaning = isRu
      ? 'Показывает диапазон фактической прибыли или убытка сделок этой score-группы.'
      : 'Shows the realized profit or loss range for this score cohort.'
    simple = isRu
      ? 'Положительное число означает прибыль, отрицательное — убыток. Например, −$30 означает, что сделка потеряла $30.'
      : 'A positive number means profit; a negative number means loss. For example, −$30 means the trade lost $30.'
    lowAction = isRu
      ? 'Избегайте повторения условий, при которых сделки из этой группы чаще дают убыток.'
      : 'Avoid repeating the conditions under which this group more often loses.'
    highAction = isRu
      ? 'Старайтесь повторять условия и поведение, которые чаще приводят к прибыли.'
      : 'Try to repeat the conditions and behavior that more often produce profit.'
  }

  return {
    title: isRu
      ? `${mode === 'high' ? 'High score' : 'Low score'} · ${pattern.label}`
      : `${mode === 'high' ? 'High score' : 'Low score'} · ${pattern.label}`,
    meaning,
    simple,
    action: mode === 'low' ? lowAction : highAction
  }
}

const parseNumber = (value: any): number => {
  if (value === undefined || value === null || value === '') return Number.NaN
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

const getNormalizedPnl = (trade: any) => getTradePnl(trade, props.initialBalance)

const closedTrades = computed(() => {
  const list = Array.isArray(props.allTrades) ? [...props.allTrades] : []
  if (props.trade && isClosedTradeForMetrics(props.trade) && !list.some((trade) => trade?.id === props.trade?.id)) {
    list.push(props.trade)
  }
  return list.filter(isClosedTradeForMetrics)
})

const balanceBeforeTrade = computed(() => {
  if (!props.trade) return props.initialBalance
  return getTradeBalanceBefore(closedTrades.value, props.trade, props.initialBalance)
})

type ScorePattern = {
  label: string
  value: string
  unit: string
  frequency: number | null
  frequencySummary?: boolean
  insufficientData: boolean
  description: string
  benchmark: string
}

const excludedScorePatternMetricIds = new Set([
  // Aggregate metrics that do not describe a per-trade pattern.
  'velocity_variance_index',
  'winRate',
  'expectedValue',
  'planned_vs_realized_risk',
  'risk_budget_adherence',
  'netProfit',
  // Matrix condition metrics.
  'required_adherence',
  'additional_alpha',
  'conditional_pnl_ratio',
  // Emotion and behavioural-tag metrics.
  'cognitive_stability',
  'dominant_bias',
  'emotional_pnl_drag',
  'friction_density'
])

const scorePatternQuantile = (values: number[], ratio: number) => {
  const sorted = values.slice().sort((a, b) => a - b)
  if (!sorted.length) return Number.NaN
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)))
  return sorted[index] ?? Number.NaN
}

const categoricalScorePatternMetricIds = new Set([
  'hadNews',
  'adverseBeforeProfit',
  'firstImpulseDirection',
  'pricePathShape'
])

const getScorePatternUnit = (sample: any) => {
  const formatted = String(sample?.formattedValue ?? '')
  if (formatted.includes('%')) return '%'
  if (/\$.*\/(?:ч|h\b|hour)/i.test(formatted)) return '$/h'
  if (formatted.includes('$')) return '$'
  if (/x\s*$/i.test(formatted)) return 'x'
  if (/(лет|year|years|yrs?)/i.test(formatted)) return 'years'
  if (/(мес|month|months)/i.test(formatted)) return 'months'
  if (/(д|\bd\b|days?)/i.test(formatted)) return 'days'
  if (/(ч|\bh\b|hr|hrs)/i.test(formatted)) return 'hours'
  if (/(мин|min|mins)/i.test(formatted) || /\bm\b/i.test(formatted)) return 'min'
  if (/\bR\b/i.test(formatted)) return 'R'
  if (/lots?/i.test(formatted)) return 'lots'
  return ''
}

const durationUnitMinutes: Record<string, number> = {
  min: 1,
  hours: 60,
  days: 60 * 24,
  months: 60 * 24 * 30,
  years: 60 * 24 * 360
}

const formatDurationValue = (value: number, sourceUnit: string) => {
  const sourceMultiplier = durationUnitMinutes[sourceUnit] || 1
  let totalMinutes = Math.max(0, Math.round(value * sourceMultiplier))
  const parts: string[] = []
  const units = [
    ['y', durationUnitMinutes.years],
    ['mo', durationUnitMinutes.months],
    ['d', durationUnitMinutes.days],
    ['h', durationUnitMinutes.hours],
    ['min', durationUnitMinutes.min]
  ] as const

  units.forEach(([label, multiplier]) => {
    if (totalMinutes < multiplier) return
    const amount = Math.floor(totalMinutes / multiplier)
    totalMinutes -= amount * multiplier
    parts.push(`${amount}${label}`)
  })

  return parts.join(' ') || '0min'
}

const formatScorePatternEndpoint = (value: number, unit: string) => {
  if (unit in durationUnitMinutes) return formatDurationValue(value, unit)
  if (unit === '$/h') return `${value < 0 ? '-$' : '$'}${Math.abs(value).toFixed(2)}/h`
  if (unit === '$') return `${value < 0 ? '-$' : '$'}${Math.abs(value).toFixed(2)}`
  if (unit === '%') return `${value.toFixed(Math.abs(value) >= 10 ? 0 : 1)}%`
  if (unit === 'x') return `${value.toFixed(2)}x`
  if (unit === 'R') return `${value.toFixed(Math.abs(value) >= 10 ? 0 : 2)}R`
  if (unit === 'lots') return `${value.toFixed(Math.abs(value) >= 10 ? 0 : 1)} lots`
  return value.toFixed(Math.abs(value) >= 10 ? 0 : 2)
}

const getTradeDurationHours = (trade: any) => {
  const start = new Date(trade?.entryTime ?? trade?.date).getTime()
  const end = new Date(trade?.exitTime ?? trade?.dateExit ?? trade?.date).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return Number.NaN
  return (end - start) / (1000 * 60 * 60)
}

const getAverageTradeVelocity = (trades: any[]) => {
  const velocities = trades
    .map((trade) => {
      const durationHours = getTradeDurationHours(trade)
      return Number.isFinite(durationHours) && durationHours > 0
        ? getNormalizedPnl(trade) / durationHours
        : Number.NaN
    })
    .filter(Number.isFinite)

  return velocities.length
    ? velocities.reduce((sum, velocity) => sum + velocity, 0) / velocities.length
    : undefined
}

// Profit Factor is a historical aggregate, so its pattern is the value that
// was available when each trade closed. This produces a meaningful range
// across the score cohort instead of repeating one current strategy value.
const getProfitFactorAtTradeClose = (trade: any, trades: any[]) => {
  const targetId = String(trade?.id || '')
  const orderedTrades = trades
    .filter(isClosedTradeForMetrics)
    .slice()
    .sort((left, right) => getTradeExitTimestamp(left) - getTradeExitTimestamp(right))

  let grossProfit = 0
  let grossLoss = 0
  for (const historicalTrade of orderedTrades) {
    const pnl = getNormalizedPnl(historicalTrade)
    if (pnl > 0) grossProfit += pnl
    if (pnl < 0) grossLoss += Math.abs(pnl)

    if (String(historicalTrade?.id || '') === targetId) {
      return grossLoss > 0 ? grossProfit / grossLoss : undefined
    }
  }

  return undefined
}

// This is deliberately a score-cohort source. It does not read the cards in
// Advanced Metrics: every row below is extracted from one of the trades in
// the selected high-score or low-score group.
const scoreCohortMetricRows = (trade: any) => {
  const durationHours = getTradeDurationHours(trade)
  const durationMinutes = Number.isFinite(durationHours) ? durationHours * 60 : Number.NaN
  const velocity = Number.isFinite(durationHours) && durationHours > 0
    ? getNormalizedPnl(trade) / durationHours
    : undefined
  const generated: Record<string, any> = buildTradeGeneratedInTradeAnalysis(trade) || {}
  const metricResult = useTradeAnalysisMetrics(
    trade,
    {
      ...generated,
      firstImpulse: generated.firstImpulseDirection,
      captureRatio: generated.profitCaptureRatio,
      durationHours,
      durationMinutes,
      velocity,
      avgVelocity: getAverageTradeVelocity(closedTrades.value),
      profitFactor: getProfitFactorAtTradeClose(trade, closedTrades.value),
      initialBalance: props.initialBalance,
      balanceBeforeTrade: getTradeBalanceBefore(closedTrades.value, trade, props.initialBalance)
    },
    locale.value,
    'advanced',
    'all'
  )
  const duplicatedMetricIds = new Set(['riskRewardRatio', 'temporal_exposure'])
  const legacyMetricRows = metricResult.metrics
    .filter((metric) => {
      const metricId = String(metric.key)
      return !duplicatedMetricIds.has(metricId) && !excludedScorePatternMetricIds.has(metricId)
    })
    .map((metric) => ({
      id: metric.key,
      label: metric.label,
      rawValue: metric.rawValue === null || metric.rawValue === undefined || metric.rawValue === ''
        ? Number.NaN
        : Number(metric.rawValue),
      formattedValue: metric.formattedValue,
      description: metric.desc || '',
      benchmark: metric.benchmarkText || ''
    }))

  return [
    {
      id: 'cohort:pnl',
      label: locale.value === 'ru' ? 'Результат сделки' : 'Trade Result',
      rawValue: getNormalizedPnl(trade),
      formattedValue: formatCurrency(getNormalizedPnl(trade)),
      description: locale.value === 'ru' ? 'Финансовый результат сделки.' : 'Financial result of the trade.',
      benchmark: locale.value === 'ru' ? 'Сравнение с группой score.' : 'Compared with the score group.'
    },
    {
      id: 'cohort:rr',
      label: 'Risk/Reward',
      rawValue: getTradeRiskReward(trade),
      formattedValue: `${getTradeRiskReward(trade).toFixed(2)} R`,
      description: locale.value === 'ru' ? 'Фактическое соотношение риска к прибыли.' : 'Realized risk/reward ratio.',
      benchmark: 'Risk/Reward'
    },
    {
      id: 'cohort:duration',
      label: locale.value === 'ru' ? 'Время удержания' : 'Holding Time',
      rawValue: Number.isFinite(durationHours) ? durationHours * 60 : Number.NaN,
      formattedValue: Number.isFinite(durationHours) ? `${(durationHours * 60).toFixed(0)} min` : 'N/A',
      description: locale.value === 'ru' ? 'Диапазон времени удержания сделок этой score-группы.' : 'Holding-time range for this score cohort.',
      benchmark: locale.value === 'ru' ? 'Диапазон score-группы.' : 'Score cohort range.'
    },
    {
      id: 'cohort:size',
      label: locale.value === 'ru' ? 'Размер позиции' : 'Position Size',
      rawValue: Number(trade?.size),
      formattedValue: `${Number(trade?.size).toFixed(2)} lots`,
      description: locale.value === 'ru' ? 'Диапазон размера позиции в score-группе.' : 'Position-size range for this score cohort.',
      benchmark: locale.value === 'ru' ? 'Диапазон score-группы.' : 'Score cohort range.'
    },
    // Preserve the existing advanced pattern rows; they are also calculated
    // per trade in the selected score cohort and are not Advanced cards.
    ...legacyMetricRows
  ]
}

const buildScorePatterns = (pool: any[]): ScorePattern[] => {
  if (!pool.length) return []

  const rowsByMetric = new Map<string, any[]>()
  pool.forEach((trade) => {
    scoreCohortMetricRows(trade).forEach((row) => {
      const rows = rowsByMetric.get(row.id) || []
      rows.push(row)
      rowsByMetric.set(row.id, rows)
    })
  })

  const patterns: ScorePattern[] = []
  rowsByMetric.forEach((rows) => {
    const sample = rows[0] || {}
    const insufficientPattern: ScorePattern = {
      label: String(sample.label || sample.id || 'Pattern'),
      unit: getScorePatternUnit(sample),
      value: '',
      frequency: null,
      insufficientData: true,
      description: String(sample.description || ''),
      benchmark: String(sample.benchmark || '')
    }

    if (categoricalScorePatternMetricIds.has(String(sample.id))) {
      const validRows = rows.filter((row) => {
        if (sample.id === 'hadNews' || sample.id === 'adverseBeforeProfit') {
          return Number.isFinite(row.rawValue)
        }
        const value = String(row.formattedValue || '').toLowerCase()
        return Boolean(value) && !value.includes('недостаточно') && !value.includes('insufficient') && !value.includes('неоднозначно') && !value.includes('ambiguous')
      })

      if (validRows.length < 2) {
        patterns.push(insufficientPattern)
        return
      }

      let frequency: number
      let majorityLabel = ''
      if (sample.id === 'hadNews' || sample.id === 'adverseBeforeProfit') {
        const positiveCount = validRows.filter((row) => Number(row.rawValue) === 1).length
        frequency = Math.round((positiveCount / validRows.length) * 100)
      } else {
        const counts = new Map<string, number>()
        validRows.forEach((row) => {
          const label = String(row.formattedValue)
          counts.set(label, (counts.get(label) || 0) + 1)
        })
        const majority = [...counts.entries()].sort((left, right) => right[1] - left[1])[0]
        if (!majority) {
          patterns.push(insufficientPattern)
          return
        }
        majorityLabel = majority[0]
        frequency = Math.round((majority[1] / validRows.length) * 100)
      }

      const label = String(sample.label)
      let value = ''
      if (sample.id === 'hadNews') {
        value = locale.value === 'ru'
          ? `Новости во время сделки в ${frequency}% сделок.`
          : `News during trade in ${frequency}% of trades.`
      } else if (sample.id === 'adverseBeforeProfit') {
        value = locale.value === 'ru'
          ? `Просадка до плюса в ${frequency}% сделок.`
          : `Drawdown before profit in ${frequency}% of trades.`
      } else if (sample.id === 'firstImpulseDirection') {
        value = locale.value === 'ru'
          ? `Первый импульс — «${majorityLabel}» в ${frequency}% сделок.`
          : `First impulse — “${majorityLabel}” in ${frequency}% of trades.`
      } else {
        value = locale.value === 'ru'
          ? `Форма движения — «${majorityLabel}» в ${frequency}% сделок.`
          : `Price path shape — “${majorityLabel}” in ${frequency}% of trades.`
      }

      patterns.push({
        label,
        unit: '',
        value,
        frequency,
        frequencySummary: true,
        insufficientData: false,
        description: sample.description,
        benchmark: sample.benchmark
      })
      return
    }

    const numericRows = rows.filter((row) => Number.isFinite(row.rawValue))
    const numericValues = numericRows.map((row) => row.rawValue)
    if (numericRows.length < 2) {
      patterns.push(insufficientPattern)
      return
    }

    const hasVariation = numericValues.some((value) => value !== numericValues[0])
    if (!hasVariation) {
      patterns.push(insufficientPattern)
      return
    }

    const low = scorePatternQuantile(numericValues, 0.2)
    const high = scorePatternQuantile(numericValues, 0.8)
    if (!Number.isFinite(low) || !Number.isFinite(high) || low === high) {
      patterns.push(insufficientPattern)
      return
    }

    const inRange = numericRows.filter((row) => row.rawValue >= low && row.rawValue <= high).length
    const frequency = Math.round((inRange / numericRows.length) * 100)
    let unit = getScorePatternUnit(sample)

    // Holding time is stored in minutes. The endpoint formatter converts it
    // to a compact min/hour/day/month/year representation for display.
    if (sample.id === 'cohort:duration') {
      unit = 'min'
    }

    patterns.push({
      label: sample.label,
      unit,
      value: `${formatScorePatternEndpoint(low, unit)} - ${formatScorePatternEndpoint(high, unit)}`,
      frequency,
      insufficientData: false,
      description: sample.description,
      benchmark: sample.benchmark
    })
  })

  return patterns
    .sort((a, b) => (b.frequency ?? -1) - (a.frequency ?? -1) || a.label.localeCompare(b.label))
}

const tradeScoreBreakdown = computed(() => {
  const trade = props.trade
  if (!trade) {
    return { percentile: 0, rawScore: 0, patternMode: 'high', patterns: [] as ScorePattern[] }
  }

  const scoreIndex = buildTradeProfitabilityScoreIndex(closedTrades.value, props.initialBalance)
  const score = scoreIndex.get(String(trade.id || '')) || scoreIndex.get(trade)
  const percentile = score?.score ?? Math.max(0, Math.min(100, Number(trade.percentileRank) || 50))
  const highScore = percentile > 50
  const scoredPool = closedTrades.value.filter((item) => {
    const itemScore = scoreIndex.get(String(item?.id || '')) || scoreIndex.get(item)
    return itemScore && (highScore ? itemScore.score > 50 : itemScore.score <= 50)
  })

  return {
    percentile,
    rawScore: score?.rawScore ?? getNormalizedPnl(trade),
    patternMode: highScore ? 'high' : 'low',
    patterns: buildScorePatterns(scoredPool)
  }
})

const conditionIdentity = (condition: any) => {
  if (typeof condition === 'string') return condition.toLowerCase()
  return String(condition?.id ?? condition?.info?.id ?? condition?.name ?? condition?.label ?? condition?.info?.name ?? '').toLowerCase()
}

const conditionProtocolId = (condition: any) => {
  if (typeof condition === 'string') return condition
  return String(condition?.id ?? condition?.info?.id ?? condition?.name ?? condition?.label ?? condition?.info?.name ?? '')
}

const conditionDisplayName = (condition: any) => {
  if (typeof condition === 'string') return condition
  return String(condition?.info?.customName ?? condition?.info?.name ?? condition?.name ?? condition?.label ?? condition?.id ?? 'REQUIRED')
}

const conditionDescription = (condition: any) => {
  if (typeof condition === 'string') return ''
  return String(condition?.info?.description ?? condition?.description ?? condition?.info?.logic ?? '')
}

const getEntryRequiredConditionSnapshot = (trade: any) => {
  const directSnapshot = trade?.boardRequiredConditionsEntry
  if (Array.isArray(directSnapshot) && directSnapshot.length > 0) return directSnapshot

  const scenarioSnapshot = trade?.boardScenarioEntry?.info?.requiredConditions
  if (Array.isArray(scenarioSnapshot) && scenarioSnapshot.length > 0) return scenarioSnapshot

  const legacyConditions = trade?.boardScenarioEntry?.info?.conditions || []
  return legacyConditions.filter((condition: any) => condition?.info?.priority === 'REQUIRED' || condition?.priority === 'REQUIRED')
}

const getEntryExecutedConditions = (trade: any) => {
  const scenarioExecuted = trade?.boardScenarioEntry?.info?.conditions
  return Array.isArray(trade?.boardConditions) && trade.boardConditions.length > 0
    ? trade.boardConditions
    : (Array.isArray(scenarioExecuted) ? scenarioExecuted : [])
}

const requiredConditionRows = computed(() => {
  const required = getEntryRequiredConditionSnapshot(props.trade)
  const executedKeys = new Set(getEntryExecutedConditions(props.trade).map(conditionIdentity).filter(Boolean))

  return required
    .map((condition: any, index: number) => {
      const id = conditionProtocolId(condition)
      const identity = conditionIdentity(condition)
      if (!id && !identity) return null

      const selected = executedKeys.has(identity)
      return {
        id: id || identity || `required-${index}`,
        name: conditionDisplayName(condition),
        description: conditionDescription(condition),
        selected,
        statusLabel: selected
          ? (locale.value === 'ru' ? 'выбрано' : 'selected')
          : (locale.value === 'ru' ? 'пропущено' : 'missing')
      }
    })
    .filter(Boolean)
})

const requiredConditionStats = computed(() => {
  const required = getEntryRequiredConditionSnapshot(props.trade)
  const executed = getEntryExecutedConditions(props.trade)

  if (required.length === 0) return { used: 0, total: 0 }

  const executedKeys = new Set(executed.map(conditionIdentity).filter(Boolean))
  const used = required.filter((condition: any) => executedKeys.has(conditionIdentity(condition))).length
  return { used, total: required.length }
})

const plannedStopRiskDollars = computed(() => getTradePlannedStopRiskDollars(props.trade))

const realizedRiskDollars = computed(() => {
  if (!props.trade) return 0
  const pnl = getNormalizedPnl(props.trade)
  return pnl < 0 ? Math.abs(pnl) : 0
})

const riskLimit = computed(() => {
  const trade = props.trade || {}
  const raw = trade.riskPerTrade ?? trade.riskPerTradeValue ?? trade.riskPercent
  const value = parseNumber(raw)
  if (!Number.isFinite(value)) return null

  return {
    value,
    unit: trade.riskPerTradeUnit === '%' || trade.riskPercent !== undefined ? '%' : '$'
  }
})

const riskBudgetDollars = computed(() => {
  if (!riskLimit.value) return null
  const baseBalance = balanceBeforeTrade.value > 0 ? balanceBeforeTrade.value : props.initialBalance
  if (riskLimit.value.unit === '%') return (riskLimit.value.value / 100) * baseBalance
  return riskLimit.value.value
})

const plannedStopRiskPct = computed(() => {
  if (!Number.isFinite(plannedStopRiskDollars.value)) return Number.NaN
  const baseBalance = balanceBeforeTrade.value > 0 ? balanceBeforeTrade.value : props.initialBalance
  if (baseBalance <= 0) return Number.NaN
  return (plannedStopRiskDollars.value / baseBalance) * 100
})

const realizedRiskPct = computed(() => {
  const baseBalance = balanceBeforeTrade.value > 0 ? balanceBeforeTrade.value : props.initialBalance
  if (baseBalance <= 0) return 0
  return (realizedRiskDollars.value / baseBalance) * 100
})

const tradeRiskAudit = computed(() => {
  const budget = riskBudgetDollars.value
  const planned = plannedStopRiskDollars.value
  const realized = realizedRiskDollars.value
  const hasPlannedRisk = Number.isFinite(planned)
  const plannedOk = hasPlannedRisk && (budget === null || planned <= budget)
  const realizedOk = budget === null || realized <= budget
  const isRu = locale.value === 'ru'

  let hint = isRu
    ? 'Риск по stop loss и фактический убыток находятся в пределах Risk Per Trade.'
    : 'Stop-loss risk and realized loss are within the Risk Per Trade budget.'

  if (!hasPlannedRisk && !realizedOk) {
    hint = isRu
      ? 'Stop loss не установлен, а фактический убыток превысил Risk Per Trade.'
      : 'Stop loss is not set and realized loss exceeded Risk Per Trade.'
  } else if (!hasPlannedRisk) {
    hint = isRu
      ? 'Planned risk невозможно посчитать без установленного stop loss.'
      : 'Planned risk cannot be calculated without a stop loss.'
  } else if (!plannedOk && !realizedOk) {
    hint = isRu
      ? 'И стоп был выставлен за пределами лимита, и фактический убыток превысил Risk Per Trade.'
      : 'Both stop placement and realized loss exceeded the Risk Per Trade budget.'
  } else if (!plannedOk) {
    hint = isRu
      ? 'Расстояние от entry до stop loss с учетом размера позиции превышает Risk Per Trade.'
      : 'The entry-to-stop distance, adjusted by position size, exceeds Risk Per Trade.'
  } else if (!realizedOk) {
    hint = isRu
      ? 'Стоп был в лимите, но реализованный убыток превысил Risk Per Trade.'
      : 'Stop risk was within budget, but realized loss exceeded Risk Per Trade.'
  } else if (hasPlannedRisk && realized > planned && planned > 0) {
    hint = isRu
      ? 'Фактический убыток больше риска по stop loss, даже если общий лимит не превышен.'
      : 'Realized loss is larger than the stop-loss risk, even though the total budget was not breached.'
  }

  return {
    planned,
    realized,
    plannedOk,
    realizedOk,
    ok: plannedOk && realizedOk && !(hasPlannedRisk && realized > planned && planned > 0),
    hint
  }
})

const actualRR = computed(() => {
  return getTradeRiskReward(props.trade)
})

const targetRR = computed(() => {
  const direct = parseNumber(props.trade?.riskRewardRatio ?? props.trade?.plannedRiskReward)
  return Number.isFinite(direct) && direct > 0 ? direct : 0
})

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value)) return 'N/A'
  const safe = Number.isFinite(value) ? value : 0
  return `${safe < 0 ? '-' : ''}$${Math.abs(safe).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatRiskPercent = (value: number) => Number.isFinite(value) ? `${value.toFixed(2)}%` : 'N/A'

const formatRatio = (value: number) => {
  return Number.isFinite(value) && value > 0 ? `1:${value.toFixed(2)}` : 'N/A'
}

const simpleMetricInsights = computed(() => {
  const trade = props.trade
  const isRu = locale.value === 'ru'
  if (!trade) return []

  const currentPnl = getNormalizedPnl(trade)
  const baselineTrades = closedTrades.value.filter((item) => item?.id !== trade.id)
  const normalizedPnls = baselineTrades
    .map((item) => getNormalizedPnl(item))
    .filter(Number.isFinite)
  const winningPnls = normalizedPnls.filter((value) => value > 0)
  const losingPnls = normalizedPnls.filter((value) => value < 0)
  const avgWin = winningPnls.length ? winningPnls.reduce((sum, value) => sum + value, 0) / winningPnls.length : 0
  const avgLoss = losingPnls.length ? losingPnls.reduce((sum, value) => sum + value, 0) / losingPnls.length : 0
  const requiredStats = requiredConditionStats.value
  const riskAudit = tradeRiskAudit.value

  let riskValue = formatCurrency(riskAudit.planned)
  let riskSuffix = isRu ? 'риск по stop loss от entry' : 'stop-loss risk from entry'
  let riskBenchmarkValue = formatCurrency(riskAudit.realized)

  if (riskLimit.value?.unit === '%') {
    riskValue = formatRiskPercent(plannedStopRiskPct.value)
    riskSuffix = isRu ? 'по stop loss от капитала' : 'stop risk of capital'
    riskBenchmarkValue = `${realizedRiskPct.value.toFixed(2)}% / ${riskLimit.value.value.toFixed(2)}%`
  } else if (riskLimit.value) {
    riskValue = formatCurrency(riskAudit.planned)
    riskSuffix = isRu ? 'по stop loss на сделку' : 'stop risk on this trade'
    riskBenchmarkValue = `${formatCurrency(riskAudit.realized)} / ${formatCurrency(riskLimit.value.value)}`
  }

  const rrHint = targetRR.value > 0 && actualRR.value > 0 && actualRR.value < targetRR.value
    ? (isRu
      ? 'Увеличьте R/R через более точное смещение stop loss и take profit.'
      : 'Improve R/R by adjusting stop loss and take profit placement.')
    : ''
  const scoreBreakdown = tradeScoreBreakdown.value

  return [
    {
      id: 'score',
      label: isRu ? 'Общий score сделки' : 'Trade Score',
      prefix: isRu ? 'Лучше чем' : 'Better than',
      value: `${scoreBreakdown.percentile}%`,
      suffix: isRu ? 'сделок' : 'of trades',
      benchmarkLabel: 'raw score',
      benchmarkValue: formatCurrency(scoreBreakdown.rawScore),
      hint: '',
      tone: scoreBreakdown.percentile >= 70 ? 'positive' : (scoreBreakdown.percentile >= 40 ? 'warning' : 'negative')
    },
    {
      id: 'pnl',
      label: isRu ? 'Результат сделки' : 'Trade Result',
      prefix: currentPnl >= 0 ? (isRu ? 'Прибыль' : 'Profit') : (isRu ? 'Убыток' : 'Loss'),
      value: formatCurrency(currentPnl),
      suffix: isRu ? 'по текущей сделке' : 'on the current trade',
      benchmarkLabel: currentPnl >= 0 ? (isRu ? 'средняя прибыльная' : 'avg win') : (isRu ? 'средняя убыточная' : 'avg loss'),
      benchmarkValue: currentPnl >= 0 ? formatCurrency(avgWin) : formatCurrency(avgLoss),
      hint: '',
      tone: currentPnl >= 0 ? 'positive' : 'negative'
    },
    {
      id: 'required',
      label: isRu ? 'Обязательные условия' : 'Required Conditions',
      prefix: requiredStats.total > 0 ? (isRu ? 'Использовано' : 'Used') : (isRu ? 'Список' : 'List'),
      value: requiredStats.total > 0 ? `${requiredStats.used}/${requiredStats.total}` : 'N/A',
      suffix: requiredStats.total > 0 ? (isRu ? 'required условий' : 'required conditions') : (isRu ? 'required условий не найден' : 'required conditions not found'),
      benchmarkLabel: isRu ? 'статус' : 'status',
      benchmarkValue: requiredStats.total > 0 && requiredStats.used < requiredStats.total
        ? (isRu ? 'пропуск' : 'missing')
        : (isRu ? 'полно' : 'complete'),
      hint: requiredStats.total > 0 && requiredStats.used < requiredStats.total
        ? (isRu ? 'Проверьте, какие required условия были пропущены перед следующим входом.' : 'Review which required conditions were skipped before next entry.')
        : '',
      tone: requiredStats.total > 0 && requiredStats.used < requiredStats.total ? 'warning' : 'positive'
    },
    {
      id: 'risk',
      label: isRu ? 'Риск сделки' : 'Trade Risk',
      prefix: isRu ? 'Риск' : 'Risk',
      value: riskValue,
      suffix: riskSuffix,
      benchmarkLabel: isRu ? 'факт' : 'realized',
      benchmarkValue: riskBenchmarkValue,
      hint: riskAudit.hint,
      benchmarkTone: riskAudit.realizedOk ? 'positive' : 'negative',
      tone: riskAudit.ok ? 'positive' : 'negative'
    },
    {
      id: 'rr',
      label: 'Risk/Reward',
      prefix: 'Risk/Reward',
      value: formatRatio(actualRR.value),
      suffix: isRu ? 'фактическое соотношение' : 'realized ratio',
      benchmarkLabel: isRu ? 'цель' : 'target',
      benchmarkValue: targetRR.value > 0 ? formatRatio(targetRR.value) : 'N/A',
      hint: rrHint,
      tone: targetRR.value > 0 && actualRR.value < targetRR.value ? 'warning' : 'positive'
    }
  ]
})

const advancedTabs = computed(() => {
  const isRu = locale.value === 'ru'

  return [
    {
      id: 'general' as const,
      label: isRu ? 'Общие' : 'General',
      count: simpleMetricInsights.value.length
    },
    {
      id: 'patterns' as const,
      label: isRu ? 'Паттерны' : 'Patterns',
      count: tradeScoreBreakdown.value.patterns.length
    }
  ]
})

</script>

<template>
  <div class="flex flex-col space-y-4 pb-6">
    <div class="flex flex-wrap items-center gap-2 border-b nier-border-primary pb-3">
      <button
        v-for="tab in advancedTabs"
        :key="tab.id"
        type="button"
        class="relative flex items-center space-x-2 border px-4 py-2 transition-all duration-300"
        :class="activeAdvancedTab === tab.id
          ? 'border-black bg-black/5 font-bold shadow-sm dark:border-white dark:bg-white/5'
          : 'nier-border-primary text-black/50 hover:border-black/30 dark:text-white/50 dark:hover:border-white/30'"
        @click="activeAdvancedTab = tab.id"
      >
        <div v-if="activeAdvancedTab === tab.id" class="h-1.5 w-1.5 rotate-45 nier-bg-inverted animate-pulse"></div>
        <span class="text-[10px] font-mono uppercase tracking-wider">{{ tab.label }}</span>
        <span class="rounded-full bg-black/10 px-1.5 py-0.5 text-[8px] font-mono opacity-60 dark:bg-white/10">{{ tab.count }}</span>
      </button>
    </div>

    <div
      v-if="activeAdvancedTab === 'general'"
      v-for="(item, index) in simpleMetricInsights"
      :key="item.id"
      class="group relative grid grid-cols-[34px_minmax(0,1fr)] gap-4 border-b nier-border-primary px-4 py-4 transition-all duration-300 first:border-t hover:bg-black/[0.025] dark:hover:bg-white/[0.025] md:px-5"
      :class="item.id === 'score' ? 'md:grid-cols-[42px_minmax(0,1fr)]' : 'md:grid-cols-[42px_minmax(0,1fr)_minmax(148px,auto)]'"
    >
      <div
        class="absolute left-0 top-1/2 h-6 w-px -translate-y-1/2 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        :class="item.tone === 'positive' ? 'bg-emerald-500' : (item.tone === 'negative' ? 'bg-rose-500' : 'bg-amber-500')"
      ></div>

      <div class="flex items-center justify-center">
        <div class="relative flex h-7 w-7 items-center justify-center text-[9px] font-mono font-black opacity-45 transition-all duration-300 group-hover:opacity-100">
          <span class="relative">{{ index + 1 }}</span>
        </div>
      </div>

      <div class="min-w-0">
        <div class="mb-2 flex items-center gap-3">
          <span class="text-[8px] font-mono font-black uppercase tracking-[0.32em] opacity-35 transition-opacity group-hover:opacity-60">
            {{ formatDisplayLabel(item.label) }}
          </span>
          <span class="h-px min-w-8 flex-1 bg-current opacity-10"></span>
        </div>
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span class="text-[11px] font-mono uppercase tracking-[0.2em] opacity-45">{{ item.prefix }}</span>
          <span
            class="text-2xl font-mono font-black tracking-normal md:text-3xl"
            :class="item.tone === 'positive' ? 'text-emerald-500 dark:text-emerald-400' : (item.tone === 'negative' ? 'text-rose-500 dark:text-rose-400' : 'text-amber-500 dark:text-amber-400')"
          >
            {{ item.value }}
          </span>
          <span class="text-[12px] font-mono uppercase tracking-[0.12em] opacity-70">{{ item.suffix }}</span>
        </div>
        <p v-if="item.hint" class="mt-2 max-w-3xl text-[10px] font-mono uppercase leading-relaxed tracking-[0.16em] opacity-50">
          {{ item.hint }}
        </p>

        <div v-if="item.id === 'required' && requiredConditionRows.length > 0" class="mt-4">
          <button
            type="button"
            class="inline-flex items-center gap-3 border nier-border-primary px-3 py-2 text-[8px] font-mono font-black uppercase tracking-[0.24em] opacity-70 transition-all duration-300 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5"
            @click.stop="isRequiredConditionsExpanded = !isRequiredConditionsExpanded"
          >
            <span class="relative h-3 w-3">
              <span class="absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2 -translate-y-1/2 bg-current"></span>
              <span
                class="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-current transition-transform duration-300"
                :class="isRequiredConditionsExpanded ? 'scale-y-0' : 'scale-y-100'"
              ></span>
            </span>
            <span>
              {{ isRequiredConditionsExpanded ? (locale === 'ru' ? 'Скрыть условия' : 'Hide conditions') : (locale === 'ru' ? 'Показать условия' : 'Show conditions') }}
            </span>
          </button>

          <div v-if="isRequiredConditionsExpanded" class="mt-3 flex flex-col border-t nier-border-primary">
            <div
              v-for="condition in requiredConditionRows"
              :key="condition.id"
              class="relative grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-3 border-b nier-border-primary px-2 py-3 transition-all duration-300"
              :class="condition.selected
                ? 'bg-black/[0.06] text-black dark:bg-white/[0.08] dark:text-white'
                : 'text-black/35 dark:text-white/35'"
            >
              <span
                class="mt-1 h-2.5 w-2.5 rotate-45 border transition-all duration-300"
                :class="condition.selected
                  ? 'border-black bg-black shadow-[0_0_14px_rgba(0,0,0,0.25)] dark:border-white dark:bg-white dark:shadow-[0_0_16px_rgba(255,255,255,0.35)]'
                  : 'border-current bg-transparent opacity-45'"
              ></span>
              <span class="min-w-0">
                <span class="block truncate text-[10px] font-mono font-black uppercase tracking-[0.22em]">
                  {{ formatDisplayLabel(condition.name) }}
                </span>
                <span
                  v-if="condition.description"
                  class="mt-1 block truncate text-[8px] font-mono uppercase tracking-[0.16em] opacity-45"
                >
                  {{ condition.description }}
                </span>
              </span>
              <span
                class="shrink-0 text-[8px] font-mono font-black uppercase tracking-[0.2em]"
                :class="condition.selected ? 'opacity-90' : 'opacity-40'"
              >
                {{ condition.statusLabel }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="item.id !== 'score'" class="col-start-2 flex items-center md:col-start-auto md:justify-end">
        <div class="inline-flex items-center gap-2 border nier-border-primary px-3 py-2 text-[9px] font-mono uppercase tracking-[0.18em] opacity-70 transition-all duration-300 group-hover:opacity-100">
          <span class="opacity-45">{{ item.benchmarkLabel }}</span>
          <span
            class="font-black"
            :class="(item.benchmarkTone || item.tone) === 'positive' ? 'text-emerald-500 dark:text-emerald-400' : ((item.benchmarkTone || item.tone) === 'negative' ? 'text-rose-500 dark:text-rose-400' : 'text-amber-500 dark:text-amber-400')"
          >
            {{ item.benchmarkValue }}
          </span>
        </div>
      </div>
    </div>

    <ExScorePatternsPanel
      v-else
      :patterns="tradeScoreBreakdown.patterns"
      :pattern-mode="tradeScoreBreakdown.patternMode"
    />
  </div>
</template>
