export interface TournamentEvent {
  id: string
  title: string
  subtitle: string
  description: string
  imageUrl: string
  bannerUrl: string
  announceDate: string // ISO string or YYYY-MM-DD
  startDate: string    // ISO string or YYYY-MM-DD
  endDate: string      // ISO string or YYYY-MM-DD
  prizePool: string
  status: 'announced' | 'active' | 'finished'
  type?: 'limited' | 'classic' | string
}

export interface TournamentParticipant {
  userId: string
  userEmail?: string
  registeredAt: string
  status: 'active' | 'disqualified' | 'winner'
}
