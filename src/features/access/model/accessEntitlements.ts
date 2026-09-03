export const ACCESS_CAPABILITIES = [
  'workspace',
  'broker.metatrader5',
  'broker.binance',
  'broker.bybit',
  'broker.kraken',
  'broker.interactiveBrokers',
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

// This is deliberately the UI mirror of the policy enforced by the access
// Worker. It is not a security boundary: every server-side operation with a
// paid-only cost or effect must enforce the same capability on the server.
export const CAPABILITIES_BY_PLAN: Readonly<Record<Exclude<AccessPlan, 'none'>, AccessCapabilities>> = Object.freeze({
  free: Object.freeze({
    ...fullAccessCapabilities(),
    'broker.binance': false,
    'broker.bybit': false,
    'broker.kraken': false,
    'broker.interactiveBrokers': false
  }),
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
  const fallback = capabilitiesForPlan(plan)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback

  const raw = value as Record<string, unknown>
  return Object.freeze(Object.fromEntries(ACCESS_CAPABILITIES.map((capability) => [
    capability,
    raw[capability] === true
  ])) as Record<AccessCapability, boolean>)
}
