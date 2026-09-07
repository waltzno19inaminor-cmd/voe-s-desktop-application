export const ACCESS_CAPABILITIES = [
  'workspace',
  'broker.metatrader5',
  'broker.binance',
  'broker.bybit',
  'broker.kraken',
  'broker.interactiveBrokers',
  'reports.scenariosConditions',
  'analytics.scenariosConditions',
  'diary.genesisTree',
  'diary.capitalForecast',
  'trade.nodeMapping',
  'trade.advancedPatterns',
  'trade.ohlcAnalysis',
  'matrix.strategyVersions',
  'matrix.multipleBoards',
  'analytics.advanced',
  'genesis.matrix',
  'data.export'
] as const

export type AccessCapability = typeof ACCESS_CAPABILITIES[number]
export type AccessPlan = 'none' | 'free' | 'trial' | 'paid'
export type AccessCapabilities = Readonly<Record<AccessCapability, boolean>>

const noAccessCapabilities = (): AccessCapabilities => Object.freeze(
  Object.fromEntries(ACCESS_CAPABILITIES.map((capability) => [capability, false])) as Record<AccessCapability, boolean>
)

const fullAccessCapabilities = (): AccessCapabilities => Object.freeze(
  Object.fromEntries(ACCESS_CAPABILITIES.map((capability) => [capability, true])) as Record<AccessCapability, boolean>
)

export const NO_ACCESS_CAPABILITIES = noAccessCapabilities()

// Add future paid-only features here. The Worker has the same deny-list and
// remains the authoritative policy for entitlement checks.
export const FREE_PLAN_DISABLED_CAPABILITIES = [
  'broker.binance',
  'broker.bybit',
  'broker.kraken',
  'broker.interactiveBrokers',
  'reports.scenariosConditions',
  'analytics.scenariosConditions',
  'diary.genesisTree',
  'diary.capitalForecast',
  'trade.nodeMapping',
  'trade.advancedPatterns',
  'trade.ohlcAnalysis',
  'matrix.strategyVersions',
  'matrix.multipleBoards'
] as const satisfies readonly AccessCapability[]

const freePlanDisabledCapabilities = new Set<AccessCapability>(FREE_PLAN_DISABLED_CAPABILITIES)
const freeAccessCapabilities = (): AccessCapabilities => Object.freeze(
  Object.fromEntries(ACCESS_CAPABILITIES.map((capability) => [
    capability,
    !freePlanDisabledCapabilities.has(capability)
  ])) as Record<AccessCapability, boolean>
)

// This is deliberately the UI mirror of the policy enforced by the access
// Worker. It is not a security boundary: every server-side operation with a
// paid-only cost or effect must enforce the same capability on the server.
export const CAPABILITIES_BY_PLAN: Readonly<Record<Exclude<AccessPlan, 'none'>, AccessCapabilities>> = Object.freeze({
  free: freeAccessCapabilities(),
  trial: fullAccessCapabilities(),
  paid: fullAccessCapabilities()
})

export function isAccessPlan(value: unknown): value is Exclude<AccessPlan, 'none'> {
  return value === 'free' || value === 'trial' || value === 'paid'
}

export function capabilitiesForPlan(plan: AccessPlan): AccessCapabilities {
  return plan === 'none' ? NO_ACCESS_CAPABILITIES : CAPABILITIES_BY_PLAN[plan]
}

export function normalizeAccessCapabilities(value: unknown, plan: AccessPlan): AccessCapabilities {
  const policy = capabilitiesForPlan(plan)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return policy

  const raw = value as Record<string, unknown>
  return Object.freeze(Object.fromEntries(ACCESS_CAPABILITIES.map((capability) => [
    capability,
    policy[capability] === true && raw[capability] !== false
  ])) as Record<AccessCapability, boolean>)
}
