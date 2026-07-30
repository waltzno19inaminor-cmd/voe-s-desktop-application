export type { TournamentPrediction, TournamentRound } from '~/entities/tournament/model/tournament-prediction.types'

export interface TournamentEvent {
  id: string
  title: string
  subtitle: string
  description: string
  titleRu?: string
  subtitleRu?: string
  descriptionRu?: string
  rules?: string[]
  rulesRu?: string[]
  imageUrl: string
  bannerUrl: string
  announceDate: string // ISO string or YYYY-MM-DD
  startDate: string    // ISO string or YYYY-MM-DD
  endDate: string      // ISO string or YYYY-MM-DD
  prizePool: string
  prizePoolRu?: string
  allowedAssets?: Array<string | {
    symbol?: string
    name?: string
    type?: string
    yahooSymbol?: string
    session?: 'UTC_24H' | 'NYSE'
  }>
  predictionsCloseHour?: number
  status: 'announced' | 'active' | 'finished'
  type?: 'limited' | 'classic' | string
}

export interface TournamentParticipant {
  userId: string
  userEmail?: string
  registeredAt: string
  status: 'active' | 'disqualified' | 'winner'
}

export interface TournamentLeaderboardEntry {
  userId: string
  points: number
  totalPredictions?: number
  predictionsCount?: number
  correctPredictions?: number
  assetStats?: TournamentLeaderboardAssetStat[]
  prize?: string | number
  createdAt?: any
}

export interface TournamentLeaderboardAssetStat {
  assetId: string
  asset: string
  totalPredictions: number
  correctPredictions: number
}

export interface TournamentSeason {
  id: string
  ordinal?: number
  status?: string
  name?: string
  title?: string
  season?: string | number
  number?: string | number
  startsAt?: any
  endsAt?: any
  timeWindow?: number
  judgeRulesRu?: string[] | string
  judgeRulesEn?: string[] | string
}
