import { blockBootstrapTest } from './blockBootstrapTest'
import { bootstrapTest } from './bootstrapTest'
import { chronologicalSplitTest } from './chronologicalSplitTest'
import { extremeTradeSensitivityTest } from './extremeTradeSensitivityTest'
import { leavePeriodOutTest } from './leavePeriodOutTest'
import { tradeOrderMonteCarloTest } from './tradeOrderMonteCarloTest'
import { transactionCostStressTest } from './transactionCostStressTest'
import type { RobustnessTestCard, RobustnessTestContext } from './types'

export type RobustnessTestFactory = (context: RobustnessTestContext) => RobustnessTestCard

export const robustnessTestFactories: RobustnessTestFactory[] = [
  chronologicalSplitTest,
  bootstrapTest,
  blockBootstrapTest,
  tradeOrderMonteCarloTest,
  extremeTradeSensitivityTest,
  transactionCostStressTest,
  leavePeriodOutTest
]

export const buildRobustnessTests = (context: RobustnessTestContext): RobustnessTestCard[] => (
  robustnessTestFactories.map(factory => factory(context))
)

export * from './types'

