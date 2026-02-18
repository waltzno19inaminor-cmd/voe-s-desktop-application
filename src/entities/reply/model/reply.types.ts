import type { ThreadContent } from "~/entities/thread/model/thread.types";
import type { FieldValue, Timestamp } from 'firebase/firestore'

export interface Reply {
  id: string
  threadId: string

  parentId?: string       

  authorId: string

  author?: string

  status: ReplyStatus

  type: ReplyType        
  meaningful: boolean,
     
  likes?: number

  createdAt: FieldValue | Timestamp | Date

  content: ThreadContent   
}


export type ReplyType =
  | 'critique'       
  | 'extension'       
  | 'counterexample'  
  | 'data'            
  | 'question'        
  
export type ReplyStatus =
  | 'published'
  | 'hidden'