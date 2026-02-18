import type { Reply } from "./reply.types";

export const replies: Reply[] = [


  {
    id: 'r-301',
    threadId: 't1',
    authorId: 'user-chen',
    type: 'critique',
    meaningful: true,
    status: 'published',
    createdAt: '2025-12-20T16:40:00Z',
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: 'This assumption may be too strong. Volatility clustering alone does not capture liquidity provision behavior.'
        },
        {
          type: 'quote',
          text: 'volatility expansion phases reward continuation, while stable regimes punish it.',
          source: {
            threadId: 't1',
            blockIndex: 2
          }
        }
      ]
    }
  },

  {
    id: 'r-302',
    threadId: 't1',
    authorId: 'user-maria',
    type: 'extension',
    meaningful: true,
  parentId: 'r-301',
    status: 'published',
    createdAt: '2025-12-21T09:10:00Z',
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: 'An extension of this idea is that regime instability itself may be endogenous — caused by crowding rather than exogenous shocks.'
        }
      ]
    }
  },

  {
    id: 'r-303',
    threadId: 't1',
    authorId: 'user-lukas',
    type: 'counterexample',
    meaningful: true,
    status: 'published',
    createdAt: '2025-12-21T14:55:00Z',
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: 'In certain emerging equity markets, breakout continuation persists even during low-volatility regimes.'
        },
        {
          type: 'quote',
          text: 'Markets do not punish mistakes. They punish predictability.',
          source: {
            threadId: 't1',
            blockIndex: 3
          }
        }
      ]
    }
  },

  {
    id: 'r-304',
    threadId: 't1',
    authorId: 'user-nina',
    type: 'question',
    meaningful: false,
    status: 'published',
    createdAt: '2025-12-21T18:20:00Z',
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: 'How sensitive are these conclusions to the choice of volatility window length?'
        }
      ]
    }
  },


  {
    id: 'r-305',
    threadId: 't2',
    authorId: 'user-viktor',
    type: 'extension',
    meaningful: true,
    status: 'published',
    createdAt: '2025-12-20T11:05:00Z',
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: 'Interpreting volatility as information aligns well with market microstructure models where volatility proxies information arrival.'
        }
      ]
    }
  },

  {
    id: 'r-306',
    threadId: 't2',
    authorId: 'user-anna',
    type: 'critique',
    meaningful: true,
    status: 'published',
    createdAt: '2025-12-21T07:40:00Z',
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: 'The challenge is separating informational volatility from mechanically induced volatility caused by execution algorithms.'
        }
      ]
    }
  },

  {
    id: 'r-307',
    threadId: 't2',
    authorId: 'user-pavel',
    type: 'question',
    meaningful: false,
    status: 'hidden',
    createdAt: '2025-12-21T22:10:00Z',
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: 'Would this interpretation still hold in markets with heavy options-related gamma effects?'
        }
      ]
    }
  },


  {
    id: 'r-308',
    threadId: 't3',
    authorId: 'user-simon',
    type: 'critique',
    meaningful: true,
    status: 'published',
    createdAt: '2025-12-19T15:20:00Z',
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: 'Market impact, not execution inefficiency, seems to dominate scaling failures in most retail strategies.'
        }
      ]
    }
  },

  {
    id: 'r-309',
    threadId: 't3',
    authorId: 'user-laura',
    type: 'counterexample',
    meaningful: true,
    status: 'published',
    createdAt: '2025-12-19T16:05:00Z',
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: 'In thinly traded regional futures, modest scaling does not immediately destroy edge.'
        }
      ]
    }
  },


  {
    id: 'r-310',
    threadId: 't4',
    authorId: 'user-igor',
    type: 'data',
    meaningful: true,
    status: 'hidden',
    createdAt: '2025-12-22T07:30:00Z',
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: 'Applying the same volatility clustering methodology to ETH futures yields similar regime persistence.'
        }
      ]
    }
  },

  {
    id: 'r-311',
    threadId: 't4',
    authorId: 'user-elena',
    type: 'critique',
    meaningful: true,
    status: 'published',
    createdAt: '2025-12-22T08:05:00Z',
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: 'Backtest robustness may be overstated due to overlapping regime definitions.'
        }
      ]
    }
  },

  {
    id: 'r-312',
    threadId: 't5',
    authorId: 'user-daniel',
    type: 'extension',
    meaningful: true,
    status: 'published',
    createdAt: '2025-12-21T19:10:00Z',
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: 'Fading breakouts appears particularly effective when combined with time-of-day filters.'
        }
      ]
    }
  },

  {
    id: 'r-313',
    threadId: 't5',
    authorId: 'user-irina',
    type: 'question',
    meaningful: false,
    status: 'published',
    createdAt: '2025-12-21T20:55:00Z',
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: 'Were transaction costs and slippage explicitly modeled in this experiment?'
        }
      ]
    }
  },

  {
    id: 'r-314',
    threadId: 't6',
    authorId: 'user-collective',
    type: 'data',
    meaningful: true,
    status: 'published',
    createdAt: '2025-12-17T22:30:00Z',
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: 'Losses consistently occurred during periods initially classified as volatility expansion.'
        }
      ]
    }
  },

  {
    id: 'r-315',
    threadId: 't6',
    authorId: 'user-oleg',
    type: 'critique',
    meaningful: true,
    status: 'published',
    createdAt: '2025-12-18T18:55:00Z',
    content: {
      blocks: [
        {
          type: 'paragraph',
          text: 'This suggests that regime classification itself may be the primary source of error.'
        }
      ]
    }
  }

]
