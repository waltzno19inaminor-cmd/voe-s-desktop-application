import type { Comment } from '../types/comment.types'

export const mockComments: Comment[] = [
  {
    id: 'comment-001',
    articleId: 'journal-article-liquidity-ceiling',
    authorId: 'user-mira-vale',
    authorName: 'Mira Vale',
    authorRole: 'Macro Desk',
    createdAt: '2026-01-18T11:12:00Z',
    text: 'The board is clean now. It feels ready for mapping the article blocks without turning the reader into a wall of text.',
    likesCount: 18,
    status: 'published'
  },
  {
    id: 'comment-002',
    articleId: 'journal-article-liquidity-ceiling',
    authorId: 'user-anton-reed',
    authorName: 'Anton Reed',
    authorRole: 'Order Flow',
    createdAt: '2026-01-18T12:04:00Z',
    text: 'The dotted canvas makes sense for this screen. I would keep comments visually quieter than the board.',
    likesCount: 31,
    status: 'published'
  }
]
