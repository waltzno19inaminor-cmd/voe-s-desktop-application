import type { DiaryEntry } from "~/entities/diary/model/diary.types"
export interface Thread {
    id: string,
    title: string,
    description: string,
    category: ThreadCategory,
    subcategory: ThreadSubcategory,
    author: string,
    authorId: string,
    createdAt: string,
    lastActivityAt: string,
    lastMeaningfulAt: string,
    repliesCount: number,
    status: ThreadStatus,
    thesis: ThreadContent,
    includedTrades?: DiaryEntry[],
    summary?: string
}




export interface ThreadContent {
  blocks: ContentBlock[]
}


export type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | ImageBlock
  | QuoteBlock
  | ListBlock

export interface ParagraphBlock {
  type: 'paragraph'
  text: string
}

export interface HeadingBlock {
  type: 'heading'
  level: 2 | 3
  text: string
}

export interface ImageBlock {
  type: 'image'
  src: string
  caption?: string
  
}

export interface QuoteBlock {
  type: 'quote'
  text: string,
  source?: {
    threadId: string,
    blockIndex: number,
    text: string,
    type: string
  }
}

export interface ListBlock {
  type: 'list'
  items: string[]
}

/* =========================
   REPLIES (ответы)
   ========================= */

export interface Reply {
  id: string
  threadId: string
  parentId?: string

  authorId: string
  type: ReplyType           // critique | data | counterexample | etc

  content: ThreadContent

  createdAt: string
  meaningful: boolean
}

/* =========================
   ENUMS / TYPES (минимум)
   ========================= */

export type ThreadCategory =
  | 'project'
  | 'markets'
  | 'education'
  | 'general'

export type ThreadSubcategory =
  | 'theory'
  | 'practice'
  | 'qa'

export type ThreadStatus =
  | 'active'
  | 'refined'
  | 'contradicted'
  | 'archived'

export type ReplyType =
  | 'critique'
  | 'extension'
  | 'counterexample'
  | 'data'
  | 'question'
