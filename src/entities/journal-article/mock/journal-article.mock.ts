import type { JournalArticle } from '../types/journal-article.types'

export const mockJournalArticles: JournalArticle[] = [
  {
    id: 'journal-article-liquidity-ceiling',
    sourceNodeId: 'node_001',
    title: 'XAUUSD: Tactical Reversal at Liquidity Ceiling',
    subtitle: 'Strategic setup',
    description: 'A clean board for mapping the article thesis, liquidity context, and future discussion blocks without loading the page with full article content yet.',
    category: 'Price Action',
    author: 'Eve Research Desk',
    publishedAt: '2026-01-18T10:30:00Z',
    metrics: [
      { id: 'likes', label: 'Likes', value: 142 },
      { id: 'comments', label: 'Comments', value: 2 }
    ],
    board: {
      gridSize: 28,
      magnet: { enabled: true, mode: 'grid' },
      size: { width: 72, height: 44 },
      nodes: [
        {
          id: 'board-node-thesis',
          type: 'text',
          position: { x: 4, y: 4 },
          size: { width: 16, height: 8 },
          title: 'Liquidity thesis',
          text: 'Sweep above the monthly high created the first useful anchor. Every block on the board snaps to the same grid cadence.'
        },
        {
          id: 'board-node-risk',
          type: 'text',
          position: { x: 24, y: 7 },
          size: { width: 13, height: 7 },
          title: 'Risk line',
          text: 'Invalidation stays above the sweep. Resize this note and it will resolve back to the grid.'
        },
        {
          id: 'board-node-chart',
          type: 'image',
          position: { x: 42, y: 5 },
          size: { width: 20, height: 13 },
          src: '/assets/ui/tactical_chart_preview.png',
          alt: 'Tactical chart preview',
          caption: 'Reference image node'
        },
        {
          id: 'board-node-target',
          type: 'text',
          position: { x: 12, y: 20 },
          size: { width: 18, height: 9 },
          title: 'Target zone',
          text: 'Primary draw remains the lower imbalance. Nodes use grid units for position and size, not arbitrary pixels.'
        }
      ]
    },
    boardBlocks: []
  }
]

export const mockJournalArticle = mockJournalArticles[0]
