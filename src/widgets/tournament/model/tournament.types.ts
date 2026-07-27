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
  status: 'announced' | 'active' | 'finished'
  type?: 'limited' | 'classic' | string
}

export interface TournamentParticipant {
  userId: string
  userEmail?: string
  registeredAt: string
  status: 'active' | 'disqualified' | 'winner'
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
}
