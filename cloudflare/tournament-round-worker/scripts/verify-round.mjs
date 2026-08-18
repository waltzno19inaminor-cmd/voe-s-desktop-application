#!/usr/bin/env node

const [yahooSymbol, startsAtValue, endsAtValue, timeWindowValue, sessionValue = 'UTC_24H'] = process.argv.slice(2)

if (!yahooSymbol || !startsAtValue || !endsAtValue || !timeWindowValue) {
  console.error('Usage: node scripts/verify-round.mjs EURUSD=X 2026-07-29T13:30:00Z 2026-07-29T14:30:00Z 120 UTC_24H')
  process.exit(1)
}

const startsAtMs = Date.parse(startsAtValue)
const endsAtMs = Date.parse(endsAtValue)
const timeWindowMinutes = Number(timeWindowValue)
const session = sessionValue.toUpperCase()
const minuteMs = 60_000
const candleIntervalMs = 30 * minuteMs

if (!Number.isFinite(startsAtMs) || !Number.isFinite(endsAtMs) || endsAtMs <= startsAtMs) {
  throw new Error('startsAt and endsAt must be valid ISO dates, with endsAt later than startsAt.')
}
if (!Number.isInteger(timeWindowMinutes) || timeWindowMinutes <= 0) {
  throw new Error('timeWindow must be a positive integer in minutes.')
}
if (session !== 'NYSE' && session !== 'UTC_24H') {
  throw new Error('session must be NYSE or UTC_24H.')
}

const cutoffMs = endsAtMs + timeWindowMinutes * minuteMs
const isThirtyMinuteBoundary = (value) => {
  const date = new Date(value)
  return date.getUTCMinutes() % 30 === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0
}
if (!isThirtyMinuteBoundary(startsAtMs) || !isThirtyMinuteBoundary(endsAtMs) || !isThirtyMinuteBoundary(cutoffMs)) {
  throw new Error('startsAt, endsAt and endsAt + timeWindow must fall on 30-minute UTC boundaries.')
}
const query = new URLSearchParams({
  period1: String(Math.floor((startsAtMs - candleIntervalMs) / 1000)),
  period2: String(Math.ceil((cutoffMs + candleIntervalMs) / 1000)),
  interval: '30m',
  includePrePost: session === 'NYSE' ? 'false' : 'true',
  events: 'div,splits',
  lang: 'en-US',
  region: 'US'
})

const response = await fetch(
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?${query}`,
  { headers: { Accept: 'application/json', 'User-Agent': 'ExGenesisRoundVerifier/1.0' } }
)

if (!response.ok) {
  throw new Error(`Yahoo request failed with HTTP ${response.status}.`)
}

const payload = await response.json()
const chart = payload.chart?.result?.[0]
const quote = chart?.indicators?.quote?.[0]
if (!chart?.timestamp || !quote) throw new Error('Yahoo did not return minute candles.')

const candles = chart.timestamp.map((timestamp, index) => ({
  timestampMs: timestamp * 1000,
  close: quote.close?.[index]
})).filter((candle) => (
  Number.isFinite(candle.close)
))

const startCandle = candles.find((candle) => candle.timestampMs === startsAtMs - candleIntervalMs)
  || candles.find((candle) => candle.timestampMs === startsAtMs)
const finalCandle = candles.find((candle) => candle.timestampMs === cutoffMs - candleIntervalMs)
if (!startCandle || !finalCandle) {
  throw new Error('Yahoo has no exact 30-minute candle ending at startsAt/starting at startsAt, or ending at endsAt + timeWindow.')
}

const initialPrice = startCandle.close
const finalPrice = finalCandle.close
if (initialPrice === finalPrice) throw new Error('Initial and final closes are equal; no fair verdict can be assigned.')
const verdict = finalPrice > initialPrice ? 'LONG' : 'SHORT'
console.log(JSON.stringify({
  yahooSymbol,
  session,
  startsAt: new Date(startsAtMs).toISOString(),
  endsAt: new Date(endsAtMs).toISOString(),
  evaluationEndsAt: new Date(cutoffMs).toISOString(),
  initialPriceCandleStartsAt: new Date(startCandle.timestampMs).toISOString(),
  initialPrice,
  finalPriceCandleStartsAt: new Date(finalCandle.timestampMs).toISOString(),
  finalPrice,
  finalPriceAt: new Date(finalCandle.timestampMs + candleIntervalMs).toISOString(),
  verdict
}, null, 2))
