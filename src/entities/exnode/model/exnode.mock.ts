import type { ExNode } from './exnode.types'

export const mockExNodes: ExNode[] = [
  {
    id: 'node_023',
    mode: 'SETUP',
    title: 'BTCUSD Momentum', author: 'Hash Vector',
    category: 'Crypto',
    confidence: 4,
    signal: {
      asset: 'BTCUSD',
      entryPrice: 64280,
      targetPrice: 66850,
      direction: 'up',
      description: 'Buyer absorption is holding above the weekly balance. The nearest liquidity pocket sits above the local high.'
    },
    thesis_brief: 'Buyer absorption is holding above the weekly balance. The nearest liquidity pocket sits above the local high.',
    tags: ['btc', 'price', 'momentum'],
    likesCount: 76,
    repliesCount: 11,
    lastActivityAt: new Date(Date.now() - 900000).toISOString()
  },
  {
    id: 'node_024',
    mode: 'SETUP',
    title: 'XAUUSD Pullback', author: 'Mira',
    category: 'Metals',
    confidence: 3,
    signal: {
      asset: 'XAUUSD',
      entryPrice: 2388.40,
      targetPrice: 2369.20,
      direction: 'down',
      description: 'Gold rejected the upper auction and is likely to revisit the nearest demand shelf before continuation.'
    },
    thesis_brief: 'Gold rejected the upper auction and is likely to revisit the nearest demand shelf before continuation.',
    tags: ['gold', 'price', 'pullback'],
    likesCount: 54,
    repliesCount: 8,
    lastActivityAt: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: 'node_025',
    mode: 'SETUP',
    title: 'EURUSD Mean Reversion', author: 'Aurum Log',
    category: 'Forex',
    confidence: 4,
    signal: {
      asset: 'EURUSD',
      entryPrice: 1.0912,
      targetPrice: 1.0968,
      direction: 'up',
      description: 'Euro reclaimed the session midpoint after a stop sweep. Target is the closest untested supply wick.'
    },
    thesis_brief: 'Euro reclaimed the session midpoint after a stop sweep. Target is the closest untested supply wick.',
    tags: ['eurusd', 'price', 'forex'],
    likesCount: 41,
    repliesCount: 5,
    lastActivityAt: new Date(Date.now() - 2700000).toISOString()
  },
  {
    id: 'node_026',
    mode: 'SETUP',
    title: 'NQ Compression', author: 'Risk Apprentice',
    category: 'Indices',
    confidence: 5,
    signal: {
      asset: 'NQ',
      entryPrice: 18720,
      targetPrice: 18480,
      direction: 'down',
      description: 'Nasdaq is compressing below the distribution shelf. The nearest clean draw remains the lower imbalance.'
    },
    thesis_brief: 'Nasdaq is compressing below the distribution shelf. The nearest clean draw remains the lower imbalance.',
    tags: ['nq', 'price', 'indices'],
    likesCount: 93,
    repliesCount: 17,
    lastActivityAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'node_001',
    mode: 'QUESTION',
    title: 'XAUUSD: Tactical Reversal at Liquidity Ceiling', author: 'Archive Seer',
    category: 'Price Action',
    confidence: 4,
    setupLevels: { tp: '2354.20', sl: '2312.80' },
    thesis_brief: 'Price swept the monthly high before exhibiting a clear H1 Displacement. Expecting a run towards the bearish FVG.',
    tags: ['gold', 'liquidity', 'smc'],
    likesCount: 142,
    repliesCount: 24,
    lastActivityAt: new Date().toISOString(),
    blocks: [
      { type: 'header', text: 'Territorial Liquidity Analysis', level: 2 },
      { type: 'paragraph', text: 'The sweep of the previous month\'s high creates a void in buy-side intent. Displacement into the equilibrium zone is imminent.' },
      { type: 'quote', text: 'When price creates an imbalance, it is nature seeking reification.', author: 'Oracle' },
      { type: 'paragraph', text: 'Targeting the H4 fair value gap at 2354.20. Risk is restricted to the sweep high.' }
    ]
  },
  {
    id: 'node_002',
    mode: 'RESEARCH',
    title: 'Model: Inverse Correlation of DXY vs BTC in Q2', author: 'Macro Circuit',
    category: 'Macroeconomics',
    confidence: 5,
    metrics: [
      { label: 'Pearson_R', value: 88 },
      { label: 'Alpha_Yield', value: 14 },
      { label: 'Volatility_Skew', value: 42 }
    ],
    thesis_brief: 'Exhaustive analysis of the dollar index relative to crypto assets. The 0.88 negative correlation is reaching critical extreme.',
    tags: ['macro', 'btc', 'dxy', 'data'],
    likesCount: 567,
    repliesCount: 89,
    lastActivityAt: new Date(Date.now() - 7200000).toISOString(),
    blocks: [
      { type: 'header', text: 'Quantitative Correlation Decay', level: 2 },
      { type: 'paragraph', text: 'Our models indicate that the 0.88 negative correlation between DXY and BTC is beginning to exhibit signs of divergence.' },
      { type: 'divider' },
      { type: 'paragraph', text: 'The volatility skew suggests that institutional players are hedging against a potential dollar collapse in Q3.' }
    ]
  },
  {
    id: 'node_003',
    mode: 'LESSON',
    title: 'Mastering the Silver Bullet: A 5-Step Protocol', author: 'Equity Ghost',
    category: 'Technical Analysis',
    confidence: 3,
    steps: ['Identify Session High', 'Wait for SWEEP', 'Check M1 Displacement', 'Enter at FVG', 'Target Equilibrium'],
    thesis_brief: 'Visualizing the core ICT silver bullet concept in modular steps. No fluff, only mechanics.',
    tags: ['education', 'ict', 'algorithm'],
    likesCount: 89,
    repliesCount: 14,
    lastActivityAt: new Date(Date.now() - 7200000).toISOString(),
    blocks: [
      { type: 'header', text: 'Step 1: Session Boundary Mapping', level: 2 },
      { type: 'paragraph', text: 'Define the vertical boundaries of the current session. In the Silver Bullet protocol, we look for the internal liquidity pools nested within the first 30 minutes of the New York open.' },
      { type: 'header', text: 'Step 2: The Purge (Liquidity Sweep)', level: 2 },
      { type: 'paragraph', text: 'We do not enter until a clear raid on the session high or low occurs. This is the search for fuel. Without a sweep, there is no displacement.' },
      { type: 'header', text: 'Step 3: Structural Displacement', level: 2 },
      { type: 'paragraph', text: 'Watch for a sharp, energetic move in the opposite direction of the sweep. On the M1 time-frame, this must leave a visible Fair Value Gap (FVG).' },
      { type: 'header', text: 'Step 4: The Refined Entry', level: 2 },
      { type: 'paragraph', text: 'Set your limit order at the mean threshold of the Fair Value Gap. Your stop must be placed just behind the candle that initiated the displacement.' },
      { type: 'header', text: 'Step 5: Targeting the Void', level: 2 },
      { type: 'paragraph', text: 'Our target is the opposing liquidity pool or the equilibrium of the previous day\'s range. High-probability extraction requires patience and strict adherence to the exit protocol.' },
      { type: 'quote', text: 'Price is not random; it is an algorithm seeking the next pool of liquidity.', author: 'Ghost in the Machine' }
    ]
  },
  {
    id: 'node_004',
    mode: 'QUESTION',
    title: 'Seeking Advice: Position Sizing in Volatility Regimes', author: 'Data Monk',
    category: 'Risk Management',
    confidence: 2,
    thesis_brief: 'Is there a formula to scale position size based on ATR that actually works during Fed announcements?',
    tags: ['volatility', 'macro', 'vix'],
    likesCount: 231,
    repliesCount: 45,
    lastActivityAt: new Date(Date.now() - 86400000).toISOString(),
    blocks: [
      { type: 'header', text: 'Decoding the Volatility Pulse', level: 2 },
      { type: 'paragraph', text: 'When the market enters a period of extreme contraction, the coiled spring of volatility is preparing for a massive release. We are currently seeing the tightest Bollinger Band contraction in 14 months.' },
      { type: 'quote', text: 'In silence, the storm is born.', author: 'Archiviste' },
      { type: 'paragraph', text: 'Our primary objective is to monitor the expansion of the ATR (Average True Range) on the Daily chart. A break above the 2.4 pivot will signal the start of the next generational trend.' }
    ]
  },
  {
    id: 'node_005',
    mode: 'RESEARCH',
    title: 'Sentiment Flux: Cognitive Biases in Retail Flow', author: 'Oracle',
    category: 'Psychology',
    confidence: 3,
    metrics: [
      { label: 'Fear_Index', value: 72 },
      { label: 'Greed_Pulse', value: 28 }
    ],
    thesis_brief: 'Mapping the emotional oscillation of market participants. Current fear levels indicate a potential bottom is near as panic sellers exhaust.',
    tags: ['psychology', 'sentiment', 'contrarian'],
    likesCount: 215,
    repliesCount: 42,
    lastActivityAt: new Date(Date.now() - 172800000).toISOString(),
    blocks: [
      { type: 'header', text: 'The Origin of Bias', level: 2 },
      { type: 'paragraph', text: 'Why do we favor the buy-side when all indicators signal a collapse? This inquiry explores the psychological anchoring of "Dip Buying" in a secular bear market.' },
      { type: 'paragraph', text: 'We must question the delta between perceived value and algorithmic reality. Are we following the data, or are we following our hope?' }
    ]
  },
  {
    id: 'node_006',
    mode: 'RESEARCH',
    title: 'EURUSD: Institutional Order Flow Imbalance', author: 'Ghost in the Machine',
    category: 'Forex',
    confidence: 4,
    setupLevels: { tp: '1.0850', sl: '1.1020' },
    metrics: [
      { label: 'Iceberg_Flow', value: 71 },
      { label: 'Range_Pressure', value: 38 }
    ],
    thesis_brief: 'Detecting massive iceberg orders at the psychological parity level. Institutional reification is pushing for a deeper correction.',
    tags: ['forex', 'orderflow', 'eurusd'],
    likesCount: 98,
    repliesCount: 16,
    lastActivityAt: new Date(Date.now() - 259200000).toISOString()
  },
  {
    id: 'node_007',
    mode: 'QUESTION',
    title: 'Methodology: Validating the Genesis Forge Output', author: 'Archiviste',
    category: 'Protocol',
    confidence: 5,
    thesis_brief: 'Does anyone have a backtested filter for the artifacts generated by the Genesis Forge? The reification seems high but the variance is concerning.',
    tags: ['genesis', 'testing', 'protocol'],
    likesCount: 312,
    repliesCount: 543,
    lastActivityAt: new Date(Date.now() - 345600000).toISOString()
  },
  { id: 'node_008', mode: 'QUESTION', title: 'GBPUSD: Cable Displacement below 1.25', author: 'Hash Vector', category: 'Forex', confidence: 3, setupLevels: { tp: '1.2420', sl: '1.2580' }, thesis_brief: 'Cable is exhibiting signs of exhaustion after the failed breakout. Reification into the previous range.', tags: ['gbpusd', 'liquidity'], likesCount: 45, repliesCount: 12, lastActivityAt: new Date().toISOString() },
  { id: 'node_009', mode: 'RESEARCH', title: 'Correlation Shift: Gold vs Real Yields', author: 'Mira', category: 'Macro', confidence: 4, metrics: [{ label: 'Yield_Divergence', value: -12 }], thesis_brief: 'Gold is holding despite rising yields. This structural deviation signals a deeper systemic shift.', tags: ['gold', 'yields'], likesCount: 89, repliesCount: 21, lastActivityAt: new Date().toISOString() },
  { id: 'node_010', mode: 'LESSON', title: 'The Trinity: Price, Time, and Volatility', author: 'Aurum Log', category: 'Education', confidence: 5, steps: ['Price Convergence', 'Time Window', 'Volatility Expansion'], thesis_brief: 'Understanding the three core pillars of the Reification Matrix.', tags: ['trinity', 'logic'], likesCount: 156, repliesCount: 34, lastActivityAt: new Date().toISOString() },
  { id: 'node_011', mode: 'QUESTION', title: 'Doubt: Is the FVG a Mythical Construct?', author: 'Risk Apprentice', category: 'Inquiry', confidence: 1, thesis_brief: 'Questioning the core algorithm? Or just failing to see the matrix?', tags: ['fvg', 'theory'], likesCount: 12, repliesCount: 456, lastActivityAt: new Date().toISOString() },
  { id: 'node_012', mode: 'RESEARCH', title: 'US30: Dow Jones Pivot at 39000', author: 'Archive Seer', category: 'Indices', confidence: 4, setupLevels: { tp: '38200', sl: '39400' }, metrics: [{ label: 'Ceiling_Test', value: 64 }], thesis_brief: 'The Dow is reaching a psychological ceiling. Expecting a rapid reification of the lower gaps.', tags: ['us30', 'dji'], likesCount: 77, repliesCount: 9, lastActivityAt: new Date().toISOString() },
  { id: 'node_013', mode: 'RESEARCH', title: 'Sentiment: Crypto Fear/Greed at 90', author: 'Macro Circuit', category: 'Market Data', confidence: 2, metrics: [{ label: 'Greed_Extreme', value: 90 }], thesis_brief: 'Euphoria detected. Reification of a local top is mathematically probable.', tags: ['crypto', 'sentiment'], likesCount: 231, repliesCount: 67, lastActivityAt: new Date().toISOString() },
  { id: 'node_014', mode: 'LESSON', title: 'Order Flow Mastery: M5 Internal Range', author: 'Equity Ghost', category: 'Tactical', confidence: 4, steps: ['Range Def', 'Order Pick', 'Execute'], thesis_brief: 'How to manage intraday scalps without emotional interference.', tags: ['scalping', 'm5'], likesCount: 112, repliesCount: 23, lastActivityAt: new Date().toISOString() },
  { id: 'node_015', mode: 'LESSON', title: 'BTCUSD: Monthly Range Equilibrium Tap', author: 'Data Monk', category: 'Crypto', confidence: 5, setupLevels: { tp: '62000', sl: '71500' }, steps: ['Map Monthly Range', 'Mark Equilibrium', 'Wait for Tap'], thesis_brief: 'Bitcoin is returning to the source. Mean reversion protocol active.', tags: ['btc', 'range'], likesCount: 543, repliesCount: 122, lastActivityAt: new Date().toISOString() },
  { id: 'node_016', mode: 'QUESTION', title: 'Logistics: Best Broker for Reification?', author: 'Oracle', category: 'Meta', confidence: 3, thesis_brief: 'Seeking a terminal with zero slippage and direct matrix access.', tags: ['broker', 'slippage'], likesCount: 44, repliesCount: 88, lastActivityAt: new Date().toISOString() },
  { id: 'node_017', mode: 'RESEARCH', title: 'Fiscal Pulse: Treasury Issuance Effects', author: 'Ghost in the Machine', category: 'Macro', confidence: 4, metrics: [{ label: 'Debt_Saturation', value: 82 }], thesis_brief: 'Analysis of how the current debt issuance schedule impacts SPX liquidity.', tags: ['spx', 'treasury'], likesCount: 132, repliesCount: 18, lastActivityAt: new Date().toISOString() },
  { id: 'node_018', mode: 'QUESTION', title: 'ETHUSD: Merge Artifact Liquidity Sweep', author: 'Archiviste', category: 'Crypto', confidence: 3, setupLevels: { tp: '2800', sl: '3600' }, thesis_brief: 'Ethereum is purging late long positions. Identifying the primary demand block.', tags: ['eth', 'purge'], likesCount: 67, repliesCount: 12, lastActivityAt: new Date().toISOString() },
  { id: 'node_019', mode: 'LESSON', title: 'The Art of Patience: 0-Trade Weeks', author: 'Hash Vector', category: 'Psychology', confidence: 5, steps: ['Observe', 'Wait', 'Survive'], thesis_brief: 'Why doing nothing is often the highest value action in the matrix.', tags: ['philosophy', 'waiting'], likesCount: 445, repliesCount: 99, lastActivityAt: new Date().toISOString() },
  { id: 'node_020', mode: 'QUESTION', title: 'Oracle Inquiry: When will the cycle reset?', author: 'Mira', category: 'Esoteric', confidence: 5, thesis_brief: 'Looking for a temporal anchor in the next halving cycle.', tags: ['halving', 'cycle'], likesCount: 999, repliesCount: 333, lastActivityAt: new Date().toISOString() },
  { id: 'node_021', mode: 'RESEARCH', title: 'NQ: Nasdaq Displacement at All-Time Highs', author: 'Aurum Log', category: 'Tech', confidence: 4, setupLevels: { tp: '17200', sl: '18500' }, metrics: [{ label: 'Mean_Distance', value: 58 }], thesis_brief: 'Tech is bloating. Reification of the mean is imminent.', tags: ['nq', 'nasdaq'], likesCount: 122, repliesCount: 22, lastActivityAt: new Date().toISOString() },
  { id: 'node_022', mode: 'RESEARCH', title: 'Volume Delta: Absorbtion at Support', author: 'Risk Apprentice', category: 'Advanced', confidence: 5, metrics: [{ label: 'CVD_Divergence', value: 65 }], thesis_brief: 'Whales are absorbing sell-side pressure. A massive re-expansion is loading.', tags: ['volume', 'orderflow'], likesCount: 312, repliesCount: 44, lastActivityAt: new Date().toISOString() }
]
