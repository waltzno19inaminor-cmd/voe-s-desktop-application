import type { Thread } from "./thread.types";
export const threadsMock: Thread[] = [

  {
    id: 't1',
    title: 'Why most breakout strategies decay over time',
    category: 'project',
    subcategory: 'theory',
    author: 'A. Voronov',
    createdAt: '2025-11-02T09:40:00Z',
    lastActivityAt: '2025-12-22T10:15:00Z',
    lastMeaningfulAt: '2025-12-22T09:50:00Z',
    repliesCount: 34,
    status: 'refined',
    thesis: {
      blocks: [
        {
          type: 'heading',
          level: 2,
          text: 'Core hypothesis'
        },
        {
          type: 'paragraph',
          text: 'Breakout strategies decay not due to execution flaws, but because markets structurally adapt to observable continuation patterns.'
        },
        {
          type: 'paragraph',
          text: 'This adaptation manifests through liquidity provision and crowding effects rather than price randomness.'
        },
        {
          type: 'quote',
          text: 'Markets do not punish mistakes. They punish predictability.'
        }
      ]
    },
    description:
      'Structural explanation of breakout decay through liquidity adaptation rather than trader error.'
  },

  {
    id: 't2',
    title: 'Volatility is information, not noise',
    category: 'project',
    subcategory: 'theory',
    author: 'M. Chen',
    createdAt: '2025-10-18T14:12:00Z',
    lastActivityAt: '2025-12-21T18:30:00Z',
    lastMeaningfulAt: '2025-12-20T22:05:00Z',
    repliesCount: 56,
    status: 'active',
    thesis: {
      blocks: [
        {
          type: 'paragraph',
          text: 'Volatility clustering should be interpreted as a signal of regime transitions rather than stochastic noise.'
        },
        {
          type: 'paragraph',
          text: 'Periods of suppressed volatility often precede structural instability and strategy failure.'
        },
        {
          type: 'list',
          items: [
            'Volatility expansion as regime entry',
            'Compression as risk accumulation',
            'False calm as structural warning'
          ]
        }
      ]
    },
    description:
      'Reframing volatility as an informational layer encoding regime change.'
  },

  {
    id: 't3',
    title: 'Why retail strategies fail when scaled',
    category: 'project',
    subcategory: 'theory',
    author: 'L. Hartmann',
    createdAt: '2025-11-11T08:20:00Z',
    lastActivityAt: '2025-12-19T16:44:00Z',
    lastMeaningfulAt: '2025-12-19T16:10:00Z',
    repliesCount: 21,
    status: 'contradicted',
    thesis: {
      blocks: [
        {
          type: 'heading',
          level: 3,
          text: 'Initial assumption'
        },
        {
          type: 'paragraph',
          text: 'Retail strategies fail primarily because they lack institutional execution efficiency.'
        },
        {
          type: 'quote',
          text: 'Execution is irrelevant if the edge is visible.'
        },
        {
          type: 'paragraph',
          text: 'Subsequent discussion challenges this view, suggesting market impact dominates execution quality.'
        }
      ]
    },
    description:
      'Original execution-based explanation later challenged by impact-driven counterarguments.'
  },

  {
    id: 't4',
    title: 'Backtest: volatility clustering on BTC (2019–2024)',
    category: 'project',
    subcategory: 'practice',
    author: 'N. Petrova',
    createdAt: '2025-11-28T12:00:00Z',
    lastActivityAt: '2025-12-22T08:40:00Z',
    lastMeaningfulAt: '2025-12-22T08:10:00Z',
    repliesCount: 18,
    status: 'active',
    thesis: {
      blocks: [
        {
          type: 'heading',
          level: 2,
          text: 'Methodology'
        },
        {
          type: 'paragraph',
          text: 'Volatility regimes were identified using rolling realized volatility and percentile thresholds.'
        },
        {
          type: 'list',
          items: [
            'Data: BTC perpetual futures',
            'Period: 2019–2024',
            'Metric: 30-day realized volatility'
          ]
        },
        {
          type: 'paragraph',
          text: 'Results indicate persistent clustering across market cycles.'
        }
      ]
    },
    description:
      'Empirical investigation supporting regime-based volatility assumptions.'
  },

  {
    id: 't5',
    title: 'Experiment: fading breakouts during low-liquidity sessions',
    category: 'project',
    subcategory: 'practice',
    author: 'R. Collins',
    createdAt: '2025-12-05T10:05:00Z',
    lastActivityAt: '2025-12-21T21:00:00Z',
    lastMeaningfulAt: '2025-12-21T20:30:00Z',
    repliesCount: 27,
    status: 'refined',
    thesis: {
      blocks: [
        {
          type: 'paragraph',
          text: 'This experiment tests the hypothesis that breakout fading becomes viable during structurally illiquid sessions.'
        },
        {
          type: 'list',
          items: [
            'Asian session only',
            'Volume below 30-day median',
            'Mean reversion exit logic'
          ]
        },
        {
          type: 'quote',
          text: 'Liquidity absence changes the rules of continuation.'
        }
      ]
    },
    description:
      'Controlled experiment indicating conditional profitability of breakout fading.'
  },

  {
    id: 't6',
    title: 'When theory fails: documented losses & invalidated models',
    category: 'project',
    subcategory: 'practice',
    author: 'Collective',
    createdAt: '2025-11-15T17:30:00Z',
    lastActivityAt: '2025-12-18T19:10:00Z',
    lastMeaningfulAt: '2025-12-17T23:45:00Z',
    repliesCount: 42,
    status: 'active',
    thesis: {
      blocks: [
        {
          type: 'heading',
          level: 2,
          text: 'Failure log'
        },
        {
          type: 'paragraph',
          text: 'Several theoretically sound models failed under live conditions due to incorrect regime classification.'
        },
        {
          type: 'paragraph',
          text: 'Losses clustered during volatility compression phases misidentified as expansion.'
        },
        {
          type: 'quote',
          text: 'A model is only correct until reality disagrees.'
        }
      ]
    },
    description:
      'Systematic documentation of losses to refine regime identification.'
  }

]

