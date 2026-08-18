import type { UserProfileStatus } from '~/entities/user/model/user-status.types'

export type ExNodeMode = 'SETUP' | 'RESEARCH' | 'LESSON' | 'QUESTION' | 'PUBLICATION'
export type ExSignalDirection = 'up' | 'down'

export interface ExNodeMetric {
  label: string
  value: number
}

export interface ExNodeLevels {
  tp: string
  sl: string
}

export interface ExNodeSignal {
  asset: string
  entryPrice: number
  targetPrice: number
  direction: ExSignalDirection
  description: string
  pricePrecision?: number
  quoteCurrency?: string
}

export interface ExNode {
  id: string
  mode: ExNodeMode
  type?: string
  editorMode?: 'text' | 'board'
  textPreviewHtml?: string
  title: string
  author?: string
  authorStatus?: UserProfileStatus | null
  category: string
  confidence?: number
  thesis_brief?: string
  tags: string[]
  likesCount: number
  repliesCount: number
  lastActivityAt: string
  setupLevels?: ExNodeLevels
  signal?: ExNodeSignal
  metrics?: ExNodeMetric[]
  steps?: string[]
  blocks?: ExNodeBlock[]
}

export type ExNodeBlock = 
  | { type: 'paragraph'; text: string }
  | { type: 'header'; text: string; level: 1 | 2 | 3 }
  | { type: 'quote'; text: string; author?: string }
  | { type: 'divider' }
