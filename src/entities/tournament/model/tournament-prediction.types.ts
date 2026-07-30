export type TournamentPredictionDirection = 'LONG' | 'SHORT'

export interface TournamentPrediction {
  id?: string
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
  asset: string
  initialPrice: number
  finalPrice: number
  verdict: TournamentPredictionDirection
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
