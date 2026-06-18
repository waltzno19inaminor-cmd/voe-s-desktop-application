const parseKrakenSpotTimestamp = (value) => {
  const numeric = Number(value || 0)
  if (!Number.isFinite(numeric) || numeric <= 0) return Number.NaN
  return numeric > 1_000_000_000_000 ? numeric : numeric * 1000
}

const parseKrakenFuturesTimestamp = (value) => {
  let str = String(value || '').trim()
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)) {
    str += 'Z'
  }
  const parsed = Date.parse(str)
  if (Number.isFinite(parsed) && !isNaN(parsed)) return parsed

  const numeric = Number(value || 0)
  if (!Number.isFinite(numeric) || numeric <= 0) return Number.NaN
  return numeric > 1_000_000_000_000 ? numeric : numeric * 1000
}


