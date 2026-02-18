export interface ThreadLink {
    id: string
    fromThreadId: string
    toThreadId: string
    type: LinkType,
}

export type LinkType =
  | 'supports'       
  | 'contradicts'     
  | 'extends'       
  | 'applies'        
  | 'references' 