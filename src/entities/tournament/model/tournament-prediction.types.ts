export type TournamentPredictionDirection = 'LONG' | 'SHORT'

export interface TournamentPrediction {
  userId?: string
  assetId?: string
  asset?: string | { symbol?: string; name?: string }
  predict?: TournamentPredictionDirection | string
  predictTime?: any
  direction?: string
  votedAt?: any
  assetSymbol?: string
  symbol?: string
}

export interface TournamentAssetResult {
  assetId: string
  asset: string
  yahooSymbol: string
  session: 'UTC_24H' | 'NYSE'
  referencePrice: number
  reachedPrice: number
  reachedAt: any
  verdict: TournamentPredictionDirection
  resolutionEndsAt: any
  timeWindowMinutes: number
  startPrice?: number
  endPrice?: number
  sessionHigh?: number
  sessionHighAt?: any
  sessionLow?: number
  sessionLowAt?: any
}

export interface TournamentRound {
  id?: string
  startsAt?: any
  endsAt?: any
  status?: string
  settlementAction?: string
  predicitions?: TournamentPrediction[]
  predictions?: TournamentPrediction[]
  assetResults?: TournamentAssetResult[]
}

export interface SubmitTournamentPredictionInput {
  tournamentId: string
  seasonId: string
  roundId: string
  userId: string
  assetId: string
  asset: string
  predict: TournamentPredictionDirection
}
