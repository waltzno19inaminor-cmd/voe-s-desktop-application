export type CommentStatus = 'published' | 'hidden'

export interface Comment {
  id: string
  articleId: string
  parentId?: string
  authorId: string
  authorName: string
  authorRole: string
  createdAt: string
  text: string
  likesCount: number
  status: CommentStatus
}
