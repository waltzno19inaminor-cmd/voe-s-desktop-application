import { tradeMatchesProtocol } from './scenarioConditionScope'

export interface TacticalHistory {
  pf: number[]
  freq: number[]
}

export function calculateTacticalHistory(id: string, allTrades: any[], scenarioId?: string | null): TacticalHistory {
  const sortedTrades = [...allTrades].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0
    const dateB = b.date ? new Date(b.date).getTime() : 0
    return dateA - dateB
  })

  // Find when this protocol was first used
  const firstOccurrenceIndex = sortedTrades.findIndex(tr => tradeMatchesProtocol(tr, id, scenarioId))

  const exactPf: number[] = []
  const exactFreq: number[] = []

  if (firstOccurrenceIndex === -1) {
    return { pf: [0.0], freq: [100.0] }
  }

  // 1. Calculate exact points starting ONLY from the first time it was used
  for (let i = firstOccurrenceIndex; i < sortedTrades.length; i++) {
    const slice = sortedTrades.slice(0, i + 1)
    const presentIn = slice.filter(tr => tradeMatchesProtocol(tr, id, scenarioId))
    
    const count = presentIn.length
    const freq = slice.length > 0 ? (count / slice.length) * 100 : 0
    
    let gProf = 0, gLoss = 0
    presentIn.forEach(tr => {
      const p = tr.profitInCurrency || 0
      if (p > 0) gProf += p
      else gLoss += Math.abs(p)
    })
    const pf = gLoss === 0 ? (gProf > 0 ? 5.0 : 1.0) : gProf / gLoss
    
    exactPf.push(pf)
    exactFreq.push(freq)
  }

  // 2. Dynamically scale the history array
  const N = exactPf.length

  if (N === 0) {
    // If absolutely no trades exist in the diary, use the requested defaults
    return { pf: [0.0], freq: [100.0] }
  }

  // If we have 21 or fewer trades, don't compress. Just return the exact data.
  if (N <= 21) {
    return { pf: exactPf, freq: exactFreq }
  }

  // If we have > 21 trades, compress into a fixed 21-point array for UI performance
  const pointsCount = 20
  const pfHistory: number[] = []
  const freqHistory: number[] = []

  for (let i = 0; i <= pointsCount; i++) {

    // Interpolate across actual data points (N-1 intervals)
    const t = i / pointsCount
    const exactIndex = t * (N - 1)
    const indexFloor = Math.floor(exactIndex)
    const indexCeil = Math.min(indexFloor + 1, N - 1)
    const fraction = exactIndex - indexFloor

    const pfF = exactPf[indexFloor]!
    const pfC = exactPf[indexCeil]!
    const freqF = exactFreq[indexFloor]!
    const freqC = exactFreq[indexCeil]!

    const interpolatedPf = pfF + (pfC - pfF) * fraction
    const interpolatedFreq = freqF + (freqC - freqF) * fraction

    pfHistory.push(interpolatedPf)
    freqHistory.push(interpolatedFreq)
  }

  return { pf: pfHistory, freq: freqHistory }
}
