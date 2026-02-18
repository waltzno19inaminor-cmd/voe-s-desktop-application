import type {ThreadLink} from './threadLink.types'
export const threadLinks: ThreadLink[] = [
  {
    id: 'l1',
    fromThreadId: 't4',
    toThreadId: 't1',
    type: 'applies',
  
  },
  {
    id: 'l2',
    fromThreadId: 't3',
    toThreadId: 't1',
    type: 'contradicts',

  },
  {
    id: 'l3',
    fromThreadId: 't2',
    toThreadId: 't1',
    type: 'extends',

  }
]
