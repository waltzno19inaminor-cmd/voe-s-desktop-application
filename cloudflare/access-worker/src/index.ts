interface Env {
  ACCESS_KEY_PEPPER: string
  ACCESS_KEY_ENCRYPTION_KEY: string
  ACCESS_ADMIN_TOKEN: string
  ACCESS_REDEEM_RATE_LIMIT: RateLimit
  ENTITLEMENT_CHECK_RATE_LIMIT: RateLimit
  EMAIL_VERIFICATION_RATE_LIMIT: RateLimit
  PASSWORD_RESET_RATE_LIMIT: RateLimit
  FIREBASE_PROJECT_ID: string
  FIREBASE_PROJECT_NUMBER: string
  FIREBASE_APPCHECK_ENFORCE: string
  FIREBASE_APPCHECK_APP_IDS: string
  FIREBASE_CLIENT_EMAIL: string
  FIREBASE_PRIVATE_KEY: string
  PATREON_CLIENT_ID: string
  PATREON_CLIENT_SECRET: string
  PATREON_REDIRECT_URI: string
  PATREON_WEBHOOK_SECRET: string
  RESEND_API_KEY: string
  ACCESS_EMAIL_FROM: string
}

interface FirestoreValue {
  nullValue?: null
  booleanValue?: boolean
  integerValue?: string
  doubleValue?: number
  timestampValue?: string
  stringValue?: string
  mapValue?: { fields?: Record<string, FirestoreValue> }
}

interface FirestoreDocumentResponse {
  name: string
  fields?: Record<string, FirestoreValue>
  createTime?: string
  updateTime?: string
}

interface FirestoreDocument {
  id: string
  name: string
  data: Record<string, unknown>
  updateTime?: string
}

interface FirestoreWrite {
  update: {
    name: string
    fields: Record<string, FirestoreValue>
  }
  updateMask?: { fieldPaths: string[] }
  updateTransforms?: Array<{
    fieldPath: string
    setToServerValue: 'REQUEST_TIME'
  }>
  currentDocument?: {
    exists?: boolean
    updateTime?: string
  }
}

interface AccessKeyRecord {
  id: string
  keyHash: string
  status: 'active' | 'disabled'
  grant: string
  redeemedCount: number
  maxRedemptions: number
  expiresAtMs: number | null
  durationMonths: number | null
  updateTime?: string
}

interface FirebaseIdentity {
  uid: string
  email: string
  emailVerified: boolean
}

interface FirebaseJwk extends JsonWebKey {
  kid?: string
}

interface CreateKeysInput {
  count: number
  maxRedemptions: number
  expiresAt: Date | null
  durationMonths: number | null
  label: string
}

interface AccessKeyEntry {
  id: string
  key: string
  keyHash: string
}

interface PatreonWebhookPayload {
  data?: PatreonResource
  included?: PatreonResource[]
}

interface PatreonResource {
  id?: string
  type?: string
  attributes?: Record<string, unknown>
  relationships?: Record<string, {
    data?: { id?: string; type?: string } | Array<{ id?: string; type?: string }>
  }>
}

interface PatreonMemberGrantInput {
  memberId: string
  userId: string
  email: string
  fullName: string
  eventType: string
  amountCents: number
  lastChargeDate: string | null
  lastChargeStatus: string | null
  pledgeCadenceMonths: number
}

interface RotationBatchRecord {
  id: string
  rotationStart: Date
  expiresAt: Date
  encryptedKeys: string
  encryptionIv: string
}

const GOOGLE_API_SCOPES = [
  'https://www.googleapis.com/auth/datastore',
  'https://www.googleapis.com/auth/identitytoolkit'
].join(' ')
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const FIREBASE_JWKS_ENDPOINT = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
const FIREBASE_APPCHECK_JWKS_ENDPOINT = 'https://firebaseappcheck.googleapis.com/v1/jwks'
const FIREBASE_SEND_OOB_CODE_ENDPOINT = 'https://identitytoolkit.googleapis.com/v1/projects'
const EMAIL_VERIFICATION_PAGE_URL = 'https://auth.gandr.site/email-verify'
const PASSWORD_RESET_PAGE_URL = 'https://auth.gandr.site/password-reset'
const FIREBASE_WEB_API_KEY = 'AIzaSyBIyST2glGpq6guZ8-yTlegn_wGRTeKw8s'
const PATREON_TOKEN_ENDPOINT = 'https://www.patreon.com/api/oauth2/token'
const PATREON_IDENTITY_ENDPOINT = 'https://www.patreon.com/api/oauth2/v2/identity'
const RESEND_EMAIL_ENDPOINT = 'https://api.resend.com/emails'
const MAX_KEYS_PER_REQUEST = 100
const MAX_KEY_REDEMPTIONS = 1_000_000
const DEFAULT_MAX_KEY_REDEMPTIONS = 1
const EXPIRED_ACCESS_CLEANUP_BATCH_SIZE = 500
const MAX_EXPIRED_ACCESS_CLEANUP_BATCHES = 20
const ACCESS_GRANT = 'full_access'
const ROTATION_MONTHS = [2, 4, 6, 8, 10, 12]
const PATREON_KEY_LABEL = 'patreon-subscription'
const PATREON_RENEWAL_GRACE_DAYS = 7
const FREE_TRIAL_DAYS = 7
const FREE_PLAN_ID = 'default'
const ACCESS_CAPABILITIES = [
  'workspace',
  'broker.metatrader5',
  'broker.binance',
  'broker.bybit',
  'broker.kraken',
  'broker.interactiveBrokers',
  'reports.scenariosConditions',
  'analytics.advanced',
  'genesis.matrix',
  'data.export'
] as const
type AccessCapability = typeof ACCESS_CAPABILITIES[number]
type AccessPlan = 'free' | 'trial' | 'paid'
type AccessCapabilities = Record<AccessCapability, boolean>
type AccessSource = 'key' | 'trial' | 'free'
const FREE_PLAN_DISABLED_CAPABILITIES = new Set<AccessCapability>([
  'broker.binance',
  'broker.bybit',
  'broker.kraken',
  'broker.interactiveBrokers',
  'reports.scenariosConditions'
])
const LICENSE_PLANS = {
  '1m': 1,
  '3m': 3,
  '6m': 6,
  '1y': 12,
  '5y': 60,
  lifetime: null
} as const

let cachedGoogleToken: { value: string; expiresAtMs: number } | null = null
let cachedFirebaseJwks: { keys: FirebaseJwk[]; expiresAtMs: number } | null = null
let cachedFirebaseAppCheckJwks: { keys: FirebaseJwk[]; expiresAtMs: number } | null = null

function fullAccessCapabilities(): AccessCapabilities {
  return Object.fromEntries(ACCESS_CAPABILITIES.map((capability) => [capability, true])) as AccessCapabilities
}

function capabilitiesForPlan(plan: AccessPlan): AccessCapabilities {
  if (plan !== 'free') return fullAccessCapabilities()
  return Object.fromEntries(ACCESS_CAPABILITIES.map((capability) => [
    capability,
    !FREE_PLAN_DISABLED_CAPABILITIES.has(capability)
  ])) as AccessCapabilities
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return emptyResponse(204)

    const url = new URL(request.url)

    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        return jsonResponse({ ok: true })
      }

      if (request.method === 'GET' && url.pathname === '/email-verify') {
        return htmlResponse(renderEmailVerificationPage())
      }

      if (request.method === 'GET' && url.pathname === '/password-reset') {
        return htmlResponse(renderPasswordResetPageModern())
      }

      if (request.method === 'POST' && url.pathname === '/v1/email-verification/confirm') {
        await enforceEmailVerificationConfirmationRateLimit(request, env)
        const input = await readJsonBody<{ code?: unknown }>(request)
        const code = typeof input.code === 'string' ? input.code.trim() : ''
        if (code.length < 16 || code.length > 2048) throw new AccessWorkerError('Invalid verification link.', 400)
        await applyEmailVerificationCode(code)
        return jsonResponse({ verified: true })
      }

      if (request.method === 'POST' && url.pathname === '/v1/password-reset/confirm') {
        const input = await readJsonBody<{ code?: unknown; newPassword?: unknown }>(request)
        const code = typeof input.code === 'string' ? input.code.trim() : ''
        const newPassword = typeof input.newPassword === 'string' ? input.newPassword : ''
        if (code.length < 16 || code.length > 2048) throw new AccessWorkerError('Invalid password reset link.', 400)
        validatePasswordResetPassword(newPassword)
        await applyPasswordResetCode(code, newPassword)
        return jsonResponse({ updated: true })
      }

      if (request.method === 'GET' && url.pathname === '/patreon/callback') {
        const result = await handlePatreonCallback(url, env)
        return htmlResponse(renderPatreonCallbackPage(result))
      }

      if (request.method === 'POST' && url.pathname === '/patreon/webhook') {
        const result = await handlePatreonWebhook(request, env)
        return jsonResponse(result)
      }

      if (request.method === 'POST' && url.pathname === '/v1/redeem') {
        const identity = await requireFirebaseIdentity(request, env)
        await enforceRedeemRateLimit(request, env, identity.uid)
        const input = await readJsonBody<{ key?: unknown }>(request)
        const rawKey = typeof input.key === 'string' ? input.key : ''
        const result = await redeemAccessKey(env, identity.uid, rawKey)
        return jsonResponse(result)
      }

      if (request.method === 'POST' && url.pathname === '/v1/trial') {
        const identity = await requireFirebaseIdentity(request, env)
        await enforceRedeemRateLimit(request, env, identity.uid)
        requireVerifiedEmail(identity)
        return jsonResponse(await startFreeTrial(env, identity.uid), 201)
      }

      if (request.method === 'POST' && url.pathname === '/v1/free') {
        const identity = await requireFirebaseIdentity(request, env)
        await enforceRedeemRateLimit(request, env, identity.uid)
        requireVerifiedEmail(identity)
        return jsonResponse(await startFreePlan(env, identity.uid), 201)
      }

      if (request.method === 'POST' && url.pathname === '/v1/entitlement/check') {
        const identity = await requireFirebaseIdentity(request, env)
        await enforceEntitlementCheckRateLimit(request, env, identity.uid)
        return jsonResponse(await checkCurrentEntitlement(env, identity.uid))
      }

      if (request.method === 'POST' && url.pathname === '/v1/email-verification') {
        const identity = await requireFirebaseIdentity(request, env)
        if (identity.emailVerified) return jsonResponse({ sent: false, alreadyVerified: true })
        if (!isEmailLike(identity.email)) throw new AccessWorkerError('An email address is required.', 400)

        await enforceEmailVerificationRateLimit(request, env, identity.uid)
        const input = await readJsonBody<{ locale?: unknown }>(request)
        const locale = input.locale === 'ru' ? 'ru' : 'en'
        await sendVerificationEmail(env, { email: identity.email, locale })
        return jsonResponse({ sent: true }, 202)
      }

      if (request.method === 'POST' && url.pathname === '/v1/password-reset') {
        if (isAppCheckEnforced(env)) await requireFirebaseAppCheck(request, env)
        const input = await readJsonBody<{ email?: unknown; locale?: unknown }>(request)
        const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
        if (!isEmailLike(email)) throw new AccessWorkerError('An email address is required.', 400)

        await enforcePasswordResetRateLimit(request, env, email)
        const locale = input.locale === 'ru' ? 'ru' : 'en'
        await sendPasswordResetEmail(env, { email, locale })
        return jsonResponse({ sent: true }, 202)
      }

      if (request.method === 'POST' && url.pathname === '/v1/admin/keys') {
        await requireAdminToken(request, env)
        const input = parseCreateKeysInput(await readJsonBody<Record<string, unknown>>(request))
        const keys = await createAccessKeys(env, input)
        return jsonResponse({ keys }, 201)
      }

      if (request.method === 'POST' && url.pathname === '/v1/admin/rotation/run') {
        await requireAdminToken(request, env)
        return jsonResponse(await createOrReadCurrentRotationBatch(env, new Date()))
      }

      if (request.method === 'GET' && url.pathname === '/v1/admin/rotation') {
        await requireAdminToken(request, env)
        const batch = await getCurrentRotationBatch(env, new Date())
        if (!batch) throw new AccessWorkerError('No active rotation batch exists.', 404)
        return jsonResponse(await decryptRotationBatch(env, batch))
      }

      if (request.method === 'POST' && url.pathname === '/v1/admin/cleanup-expired') {
        await requireAdminToken(request, env)
        const result = await deactivateExpiredUserAccessStates(env)
        return jsonResponse(result)
      }

      const disableMatch = url.pathname.match(/^\/v1\/admin\/keys\/([^/]+)\/disable$/)
      if (request.method === 'POST' && disableMatch) {
        await requireAdminToken(request, env)
        await disableAccessKey(env, decodeURIComponent(disableMatch[1]))
        return jsonResponse({ ok: true })
      }

      return jsonResponse({ error: 'Not found.' }, 404)
    } catch (error) {
      const knownError = error instanceof AccessWorkerError ? error : null
      if (!knownError) console.error('[Access] Unexpected request failure.', error)
      return jsonResponse(
        { error: knownError?.message || 'Unable to process the request.' },
        knownError?.status || 500
      )
    }
  },

  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    try {
      const deactivationResult = await deactivateExpiredUserAccessStates(env)
      console.log('[Access] Daily expired access deactivation result:', deactivationResult)
    } catch (error) {
      console.error('[Access] Daily expired access deactivation failed.', error)
    }

    const scheduledDate = new Date(controller.scheduledTime)
    if (scheduledDate.getUTCDate() === 1 && ROTATION_MONTHS.includes(scheduledDate.getUTCMonth() + 1)) {
      try {
        await createRotationBatch(env, getRotationStartForSchedule(scheduledDate))
      } catch (error) {
        console.error('[Access] Rotation batch creation failed.', error)
      }
    }
  }
}

class AccessWorkerError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

async function handlePatreonCallback(url: URL, env: Env) {
  validatePatreonOAuthEnv(env)

  const error = url.searchParams.get('error')
  if (error) {
    throw new AccessWorkerError(`Patreon authorization failed: ${error}`, 400)
  }

  const code = url.searchParams.get('code') || ''
  if (!code) throw new AccessWorkerError('Patreon authorization code is missing.', 400)

  const tokenPayload = await exchangePatreonCode(env, code)
  const identity = await fetchPatreonIdentity(tokenPayload.access_token)
  return {
    ok: true,
    email: identity.email,
    fullName: identity.fullName
  }
}

async function handlePatreonWebhook(request: Request, env: Env) {
  validatePatreonWebhookEnv(env)

  const eventType = request.headers.get('X-Patreon-Event') || 'unknown'
  const rawBody = await request.text()
  await verifyPatreonWebhookSignature(rawBody, request.headers.get('X-Patreon-Signature') || '', env.PATREON_WEBHOOK_SECRET)

  let payload: PatreonWebhookPayload
  try {
    payload = JSON.parse(rawBody) as PatreonWebhookPayload
  } catch {
    throw new AccessWorkerError('Invalid Patreon webhook JSON.', 400)
  }

  if (!isPatreonMemberEvent(eventType)) {
    return { ok: true, ignored: true, reason: `Unsupported event type: ${eventType}` }
  }

  const grantInput = parsePatreonMemberGrantInput(payload, eventType)
  if (!grantInput) {
    return { ok: true, ignored: true, reason: 'Patreon member is not an active paid member.' }
  }

  const grant = await createPatreonAccessGrant(env, grantInput)
  if (!grant.created && grant.emailSent) {
    return {
      ok: true,
      alreadyIssued: true,
      grantId: grant.grantId,
      keyId: grant.keyId,
      renewed: grant.renewed
    }
  }
  if (!grant.key) {
    throw new Error(`Patreon grant ${grant.grantId} exists without a recoverable encrypted key.`)
  }

  await sendPatreonAccessEmail(env, {
    to: grantInput.email,
    fullName: grantInput.fullName,
    key: grant.key,
    keyId: grant.keyId
  })

  await markPatreonGrantEmailSent(env, grant.grantId)

  return {
    ok: true,
    issued: true,
    grantId: grant.grantId,
    keyId: grant.keyId,
    email: grantInput.email,
    renewed: grant.renewed
  }
}

function validatePatreonOAuthEnv(env: Env): void {
  if (!env.PATREON_CLIENT_ID || !env.PATREON_CLIENT_SECRET || !env.PATREON_REDIRECT_URI) {
    throw new AccessWorkerError('Patreon OAuth is not configured.', 500)
  }
}

function validatePatreonWebhookEnv(env: Env): void {
  if (!env.PATREON_WEBHOOK_SECRET) {
    throw new AccessWorkerError('Patreon webhook secret is not configured.', 500)
  }
  if (!env.RESEND_API_KEY || !env.ACCESS_EMAIL_FROM) {
    throw new AccessWorkerError('Email delivery is not configured.', 500)
  }
  if (!env.ACCESS_KEY_PEPPER) {
    throw new AccessWorkerError('Access key pepper is not configured.', 500)
  }
}

async function exchangePatreonCode(env: Env, code: string): Promise<{ access_token: string }> {
  const response = await fetch(PATREON_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: env.PATREON_CLIENT_ID,
      client_secret: env.PATREON_CLIENT_SECRET,
      redirect_uri: env.PATREON_REDIRECT_URI
    })
  })
  const payload = await readJsonResponse(response) as { access_token?: string }
  if (!response.ok || !payload.access_token) {
    throw new AccessWorkerError('Unable to exchange Patreon authorization code.', 502)
  }
  return { access_token: payload.access_token }
}

async function fetchPatreonIdentity(accessToken: string): Promise<{ email: string; fullName: string }> {
  const query = new URLSearchParams({
    'fields[user]': 'email,full_name'
  })
  const response = await fetch(`${PATREON_IDENTITY_ENDPOINT}?${query}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  const payload = await readJsonResponse(response) as PatreonWebhookPayload
  if (!response.ok) throw new AccessWorkerError('Unable to fetch Patreon identity.', 502)

  const attributes = payload.data?.attributes || {}
  return {
    email: String(attributes.email || ''),
    fullName: String(attributes.full_name || '')
  }
}

async function verifyPatreonWebhookSignature(rawBody: string, signature: string, secret: string): Promise<void> {
  if (!signature) throw new AccessWorkerError('Missing Patreon webhook signature.', 401)
  const expected = hmacMd5Hex(new TextEncoder().encode(secret), new TextEncoder().encode(rawBody))
  if (!constantTimeEqual(signature.toLowerCase(), expected)) {
    throw new AccessWorkerError('Invalid Patreon webhook signature.', 401)
  }
}

function isPatreonMemberEvent(eventType: string): boolean {
  return new Set([
    'members:create',
    'members:update',
    'pledges:create',
    'pledges:update'
  ]).has(eventType)
}

function parsePatreonMemberGrantInput(payload: PatreonWebhookPayload, eventType: string): PatreonMemberGrantInput | null {
  const member = payload.data
  if (!member?.id || !member.attributes) {
    throw new AccessWorkerError('Patreon member payload is missing.', 400)
  }

  const attributes = member.attributes
  const patronStatus = String(attributes.patron_status || '').toLowerCase()
  const amountCents = Math.max(0, Number(attributes.currently_entitled_amount_cents || 0))
  if (patronStatus !== 'active_patron' || amountCents <= 0) return null

  const includedUser = findPatreonIncludedUser(payload, member)
  const email = String(attributes.email || includedUser?.attributes?.email || '').trim().toLowerCase()
  if (!isEmailLike(email)) {
    throw new AccessWorkerError('Patreon member email is missing. Enable member email scope for the webhook.', 400)
  }

  const fullName = String(
    attributes.full_name
      || includedUser?.attributes?.full_name
      || email.split('@')[0]
  ).trim()

  const rawPledgeCadenceMonths = Number(attributes.pledge_cadence || 1)
  const pledgeCadenceMonths = Number.isInteger(rawPledgeCadenceMonths)
    && rawPledgeCadenceMonths >= 1
    && rawPledgeCadenceMonths <= 12
    ? rawPledgeCadenceMonths
    : 1
  const lastChargeDate = normalizePatreonDate(attributes.last_charge_date)
  const lastChargeStatus = String(attributes.last_charge_status || '').trim() || null

  return {
    memberId: member.id,
    userId: String(getRelationshipId(member, 'user') || includedUser?.id || member.id),
    email,
    fullName,
    eventType,
    amountCents,
    lastChargeDate,
    lastChargeStatus,
    pledgeCadenceMonths
  }
}

function findPatreonIncludedUser(payload: PatreonWebhookPayload, member: PatreonResource): PatreonResource | null {
  const relationshipUserId = getRelationshipId(member, 'user')
  return payload.included?.find((entry) => (
    entry.type === 'user'
    && (!relationshipUserId || entry.id === relationshipUserId)
  )) || null
}

function getRelationshipId(resource: PatreonResource, relationshipName: string): string {
  const data = resource.relationships?.[relationshipName]?.data
  if (!data || Array.isArray(data)) return ''
  return String(data.id || '')
}

async function createPatreonAccessGrant(env: Env, input: PatreonMemberGrantInput): Promise<{
  created: boolean
  emailSent: boolean
  renewed: boolean
  grantId: string
  keyId: string
  key: string
}> {
  const grantId = `member_${safeFirestoreId(input.memberId)}`
  const grantPath = `patreonAccessGrants/${grantId}`
  const existingGrant = await getFirestoreDocument(env, grantPath)
  if (existingGrant) {
    await ensurePatreonKeyDuration(env, existingGrant, input.pledgeCadenceMonths)
    const renewed = await processPatreonRenewal(env, existingGrant, input)
    const emailSent = existingGrant.data.emailSent === true
    const keyId = String(existingGrant.data.keyId || '')
    const encryptedKeys = String(existingGrant.data.encryptedKeys || '')
    const encryptionIv = String(existingGrant.data.encryptionIv || '')
    const decryptedKeys = emailSent || !encryptedKeys || !encryptionIv
      ? []
      : await decryptRotationKeys(env, encryptedKeys, encryptionIv)
    const key = decryptedKeys.find((entry) => entry.id === keyId)?.key || ''
    return {
      created: false,
      emailSent,
      renewed,
      grantId,
      keyId,
      key
    }
  }

  const [entry] = await createAccessKeyEntries(env, 1)
  if (!entry) throw new Error('Unable to create Patreon access key.')
  const encrypted = await encryptRotationKeys(env, [{ id: entry.id, key: entry.key }])

  const keyInput: CreateKeysInput = {
    count: 1,
    maxRedemptions: 1,
    expiresAt: null,
    durationMonths: input.pledgeCadenceMonths,
    label: PATREON_KEY_LABEL
  }

  const writes: FirestoreWrite[] = [
    createAccessKeyWrite(env, entry, keyInput),
    {
      update: {
        name: firestoreDocumentName(env, grantPath),
        fields: encodeFields({
          patreonMemberId: input.memberId,
          patreonUserId: input.userId,
          email: input.email,
          fullName: input.fullName,
          eventType: input.eventType,
          amountCents: input.amountCents,
          lastChargeDate: input.lastChargeDate,
          lastChargeStatus: input.lastChargeStatus,
          lastSuccessfulChargeDate: isPatreonChargeSuccessful(input.lastChargeStatus)
            ? input.lastChargeDate
            : null,
          pledgeCadenceMonths: input.pledgeCadenceMonths,
          paidThroughAt: null,
          graceUntil: null,
          keyId: entry.id,
          encryptedKeys: encrypted.ciphertext,
          encryptionIv: encrypted.iv,
          status: 'key_created',
          emailSent: false
        })
      },
      updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }],
      currentDocument: { exists: false }
    }
  ]

  await commitFirestoreWrites(env, writes)
  return {
    created: true,
    emailSent: false,
    renewed: false,
    grantId,
    keyId: entry.id,
    key: entry.key
  }
}

async function ensurePatreonKeyDuration(
  env: Env,
  grant: FirestoreDocument,
  durationMonths: number
): Promise<void> {
  const keyId = String(grant.data.keyId || '').trim()
  if (!keyId) return

  const keyDocument = await getFirestoreDocument(env, `accessKeys/${keyId}`)
  if (!keyDocument || Number(keyDocument.data.redeemedCount || 0) > 0) return
  if (Number(keyDocument.data.durationMonths || 0) === durationMonths) return

  await commitFirestoreWrites(env, [{
    update: {
      name: firestoreDocumentName(env, `accessKeys/${keyId}`),
      fields: encodeFields({ durationMonths })
    },
    updateMask: { fieldPaths: ['durationMonths'] },
    currentDocument: keyDocument.updateTime ? { updateTime: keyDocument.updateTime } : undefined
  }])
}

async function processPatreonRenewal(
  env: Env,
  existingGrant: FirestoreDocument,
  input: PatreonMemberGrantInput
): Promise<boolean> {
  const grantPath = `patreonAccessGrants/${existingGrant.id}`
  const storedSuccessfulChargeDate = normalizePatreonDate(existingGrant.data.lastSuccessfulChargeDate)
  const incomingChargeDate = input.lastChargeDate
  const incomingChargeDateMs = toMillis(incomingChargeDate)

  // A member update can be caused by profile or pledge changes. Only a new,
  // successful charge can extend access.
  if (!incomingChargeDate || !incomingChargeDateMs || !isPatreonChargeSuccessful(input.lastChargeStatus)) {
    await updatePatreonGrantChargeMetadata(env, existingGrant, input)
    return false
  }

  if (storedSuccessfulChargeDate && incomingChargeDateMs <= (toMillis(storedSuccessfulChargeDate) || 0)) {
    await updatePatreonGrantChargeMetadata(env, existingGrant, input)
    return false
  }

  let linkedUserId = String(existingGrant.data.firebaseUserId || '').trim()
  if (!linkedUserId) {
    linkedUserId = await findFirebaseUserIdByEmail(env, input.email)
  }

  const transaction = await beginFirestoreTransaction(env)
  const accessStatePath = linkedUserId ? `users/${linkedUserId}/access/state` : ''
  const freePlanPath = linkedUserId ? `users/${linkedUserId}/accessFreePlans/${FREE_PLAN_ID}` : ''
  const redemptionPath = linkedUserId
    ? `accessKeys/${String(existingGrant.data.keyId || '')}/redemptions/${linkedUserId}`
    : ''
  const userRedeemedKeyPath = linkedUserId
    ? `users/${linkedUserId}/redeemedKeys/${String(existingGrant.data.keyId || '')}`
    : ''
  const paths = [grantPath, accessStatePath, freePlanPath, redemptionPath, userRedeemedKeyPath].filter(Boolean)
  const documents = await batchGetDocuments(env, transaction, paths)
  const latestGrant = documents.get(grantPath)
  if (!latestGrant) return false

  const latestSuccessfulChargeDate = normalizePatreonDate(latestGrant.data.lastSuccessfulChargeDate)
  if (latestSuccessfulChargeDate && incomingChargeDateMs <= (toMillis(latestSuccessfulChargeDate) || 0)) {
    return false
  }

  const state = accessStatePath ? documents.get(accessStatePath) : null
  const hasRedeemedPatreonKey = Boolean(
    state
      || (redemptionPath && documents.get(redemptionPath))
      || (userRedeemedKeyPath && documents.get(userRedeemedKeyPath))
  )
  const currentActivatedKeyId = String(state?.data.activatedKeyId || '').trim()
  const patreonKeyId = String(latestGrant.data.keyId || '').trim()
  const hasNewerPaidKey = state?.data.source === 'key'
    && state?.data.plan === 'paid'
    && currentActivatedKeyId
    && currentActivatedKeyId !== patreonKeyId
  const currentEffectiveExpiryMs = toMillis(state?.data.expiresAt) || 0
  const storedPaidThroughMs = toMillis(latestGrant.data.paidThroughAt) || 0
  const previousPaidThroughMs = storedPaidThroughMs
    || (currentEffectiveExpiryMs ? Math.max(0, currentEffectiveExpiryMs - patreonGracePeriodMs()) : 0)
  const anchorMs = Math.max(previousPaidThroughMs, incomingChargeDateMs)
  const paidThroughMs = addUtcMonths(new Date(anchorMs), input.pledgeCadenceMonths).getTime()
  const graceUntilMs = paidThroughMs + patreonGracePeriodMs()

  const grantFields = {
    firebaseUserId: linkedUserId || undefined,
    email: input.email,
    fullName: input.fullName,
    eventType: input.eventType,
    amountCents: input.amountCents,
    lastChargeDate: input.lastChargeDate,
    lastChargeStatus: input.lastChargeStatus,
    lastSuccessfulChargeDate: input.lastChargeDate,
    pledgeCadenceMonths: input.pledgeCadenceMonths,
    paidThroughAt: new Date(paidThroughMs),
    graceUntil: new Date(graceUntilMs)
  }
  const encodedGrantFields = encodeFields(grantFields)
  const writes: FirestoreWrite[] = [
    {
      update: {
        name: firestoreDocumentName(env, grantPath),
        fields: encodedGrantFields
      },
      updateMask: {
        fieldPaths: Object.keys(encodedGrantFields)
      },
      updateTransforms: [{ fieldPath: 'lastRenewedAt', setToServerValue: 'REQUEST_TIME' }],
      currentDocument: latestGrant.updateTime ? { updateTime: latestGrant.updateTime } : undefined
    }
  ]

  if (linkedUserId && hasRedeemedPatreonKey && !hasNewerPaidKey) {
    writes.push({
      update: {
        name: firestoreDocumentName(env, accessStatePath),
        fields: encodeFields({
          isActivated: true,
          grant: ACCESS_GRANT,
          plan: 'paid',
          capabilities: capabilitiesForPlan('paid'),
          hasFreePlan: state?.data.hasFreePlan === true || Boolean(freePlanPath && documents.get(freePlanPath)),
          expiresAt: new Date(graceUntilMs),
          source: 'key',
          activatedKeyId: latestGrant.data.keyId || null
        })
      },
      updateMask: {
        fieldPaths: [
          'isActivated',
          'grant',
          'plan',
          'capabilities',
          'hasFreePlan',
          'expiresAt',
          'source',
          'activatedKeyId'
        ]
      }
    })
  }

  for (const documentPath of [redemptionPath, userRedeemedKeyPath]) {
    if (!documentPath || !documents.get(documentPath)) continue
    writes.push({
      update: {
        name: firestoreDocumentName(env, documentPath),
        fields: encodeFields({ expiresAt: new Date(graceUntilMs) })
      },
      updateMask: { fieldPaths: ['expiresAt'] }
    })
  }

  await commitFirestoreTransaction(env, transaction, writes)
  return true
}

async function updatePatreonGrantChargeMetadata(
  env: Env,
  existingGrant: FirestoreDocument,
  input: PatreonMemberGrantInput
): Promise<void> {
  const grantPath = `patreonAccessGrants/${existingGrant.id}`
  const fields = {
    email: input.email,
    fullName: input.fullName,
    eventType: input.eventType,
    amountCents: input.amountCents,
    lastChargeDate: input.lastChargeDate,
    lastChargeStatus: input.lastChargeStatus,
    pledgeCadenceMonths: input.pledgeCadenceMonths
  }
  await commitFirestoreWrites(env, [{
    update: {
      name: firestoreDocumentName(env, grantPath),
      fields: encodeFields(fields)
    },
    updateMask: { fieldPaths: Object.keys(fields) },
    currentDocument: existingGrant.updateTime ? { updateTime: existingGrant.updateTime } : undefined
  }])
}

function patreonGracePeriodMs(): number {
  return PATREON_RENEWAL_GRACE_DAYS * 24 * 60 * 60 * 1000
}

function isPatreonChargeSuccessful(status: string | null): boolean {
  return ['paid', 'success', 'successful', 'succeeded'].includes(String(status || '').trim().toLowerCase())
}

function normalizePatreonDate(value: unknown): string | null {
  const text = String(value || '').trim()
  if (!text || !Number.isFinite(Date.parse(text))) return null
  return new Date(text).toISOString()
}

async function markPatreonGrantEmailSent(env: Env, grantId: string): Promise<void> {
  const grantPath = `patreonAccessGrants/${grantId}`
  const existingGrant = await getFirestoreDocument(env, grantPath)
  if (!existingGrant) return

  await commitFirestoreWrites(env, [{
    update: {
      name: firestoreDocumentName(env, grantPath),
      fields: encodeFields({
        status: 'email_sent',
        emailSent: true
      })
    },
    updateMask: { fieldPaths: ['status', 'emailSent'] },
    updateTransforms: [{ fieldPath: 'emailSentAt', setToServerValue: 'REQUEST_TIME' }],
    currentDocument: existingGrant.updateTime ? { updateTime: existingGrant.updateTime } : undefined
  }])
}

async function sendPatreonAccessEmail(env: Env, input: {
  to: string
  fullName: string
  key: string
  keyId: string
}): Promise<void> {
  const displayName = input.fullName || 'Patron'
  const brandName = 'J.L.JÖRMUNGANDR'
  const downloadUrl = 'https://jorudr.github.io/JLJ/'
  const subject = `Your ${brandName} access key`
  const text = [
    `Hello ${displayName},`,
    '',
    `Thank you for supporting ${brandName} on Patreon.`,
    '',
    'Your 3-month app activation key:',
    input.key,
    '',
    'This key grants 3 months of full access inside the app.',
    `You can download the full version here: ${downloadUrl}`,
    '',
    brandName
  ].join('\n')
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.55;color:#111827">
      <p>Hello ${escapeHtml(displayName)},</p>
      <p>Thank you for supporting <strong>${brandName}</strong> on Patreon.</p>
      <p>Your 3-month app activation key:</p>
      <p style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:18px;letter-spacing:0.08em;font-weight:800;padding:14px 16px;border:1px solid #d1d5db;background:#f9fafb">
        ${escapeHtml(input.key)}
      </p>
      <p>This key grants 3 months of full access inside the app.</p>
      <p>You can download the full version here:</p>
      <p>
        <a href="${downloadUrl}" style="color:#111827;font-weight:800;text-decoration:underline">
          ${downloadUrl}
        </a>
      </p>
      <p style="opacity:.7">${brandName}</p>
    </div>
  `

  const response = await fetch(RESEND_EMAIL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.ACCESS_EMAIL_FROM,
      to: [input.to],
      subject,
      text,
      html,
      tags: [
        { name: 'source', value: 'patreon' },
        { name: 'key_id', value: input.keyId }
      ]
    })
  })
  const payload = await readJsonResponse(response)
  if (!response.ok) {
    throw new Error(`Resend email delivery failed: ${response.status} ${JSON.stringify(payload)}`)
  }
}

async function sendVerificationEmail(env: Env, input: { email: string; locale: 'ru' | 'en' }): Promise<void> {
  if (!env.RESEND_API_KEY || !env.ACCESS_EMAIL_FROM) {
    throw new AccessWorkerError('Email delivery is not configured.', 500)
  }

  const googleToken = await getGoogleAccessToken(env)
  const response = await fetch(
    `${FIREBASE_SEND_OOB_CODE_ENDPOINT}/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/accounts:sendOobCode`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${googleToken}`,
        'Content-Type': 'application/json'
      },
      // The Worker delivers the generated one-time link itself, rather than
      // asking Firebase to send its limited-template email.
      body: JSON.stringify({
        requestType: 'VERIFY_EMAIL',
        email: input.email,
        returnOobLink: true
      })
    }
  )
  const payload = await readJsonResponse(response) as { oobCode?: unknown }
  const oobCode = typeof payload.oobCode === 'string' ? payload.oobCode : ''
  if (!response.ok || !oobCode) {
    console.error('[email-verification] Firebase link generation failed', {
      serviceAccount: env.FIREBASE_CLIENT_EMAIL,
      status: response.status,
      payload
    })
    throw new AccessWorkerError('Unable to create an email verification link.', 502)
  }
  // Keep the one-time code in the URL fragment. It is never sent as a Referer
  // and the landing page exchanges it immediately over same-origin HTTPS.
  const verificationUrl = `${EMAIL_VERIFICATION_PAGE_URL}#code=${encodeURIComponent(oobCode)}&locale=${input.locale}`

  const copy = input.locale === 'ru'
    ? {
        subject: 'Подтвердите email — J.L.JÖRMUNGANDR',
        title: 'Подтвердите email',
        body: 'Чтобы продолжить вход в приложение, подтвердите, что этот адрес принадлежит вам.',
        button: 'ПОДТВЕРДИТЬ EMAIL',
        note: 'Если вы не создавали аккаунт, просто проигнорируйте это письмо.',
        text: 'Чтобы продолжить вход в приложение, подтвердите адрес email по ссылке:'
      }
    : {
        subject: 'Verify your email — J.L.JÖRMUNGANDR',
        title: 'Verify your email',
        body: 'To continue signing in to the app, confirm that you own this email address.',
        button: 'VERIFY EMAIL',
        note: 'If you did not create an account, you can safely ignore this email.',
        text: 'To continue signing in to the app, verify your email using this link:'
      }
  const safeUrl = escapeHtml(verificationUrl)
  const text = [
    'J.L.JÖRMUNGANDR',
    '',
    copy.text,
    verificationUrl,
    '',
    copy.note
  ].join('\n')
  const html = `
    <div style="margin:0;padding:32px 20px;background:#f5f5f2;color:#171717;font-family:Inter,Arial,sans-serif">
      <main style="margin:0 auto;max-width:560px;background:#ffffff;padding:42px 36px;text-align:center">
        <p style="margin:0 0 26px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;font-weight:800;letter-spacing:.22em">J.L.JÖRMUNGANDR</p>
        <h1 style="margin:0;font-size:26px;letter-spacing:.04em">${copy.title}</h1>
        <p style="margin:22px auto 30px;max-width:390px;font-size:16px;line-height:1.6">${copy.body}</p>
        <a href="${safeUrl}" style="display:inline-block;background:#171717;color:#ffffff;padding:15px 24px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;font-weight:800;letter-spacing:.15em;text-decoration:none">${copy.button}</a>
        <p style="margin:30px auto 0;max-width:390px;color:#5f5f5a;font-size:12px;line-height:1.55">${copy.note}</p>
      </main>
    </div>
  `
  const resendResponse = await fetch(RESEND_EMAIL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.ACCESS_EMAIL_FROM,
      to: [input.email],
      subject: copy.subject,
      text,
      html,
      tags: [{ name: 'source', value: 'email-verification' }]
    })
  })
  const resendPayload = await readJsonResponse(resendResponse)
  if (!resendResponse.ok) {
    throw new AccessWorkerError(`Unable to send verification email: ${resendResponse.status} ${JSON.stringify(resendPayload)}`, 502)
  }
}

async function sendPasswordResetEmail(env: Env, input: { email: string; locale: 'ru' | 'en' }): Promise<void> {
  if (!env.RESEND_API_KEY || !env.ACCESS_EMAIL_FROM) {
    throw new AccessWorkerError('Email delivery is not configured.', 500)
  }

  const googleToken = await getGoogleAccessToken(env)
  const response = await fetch(
    `${FIREBASE_SEND_OOB_CODE_ENDPOINT}/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/accounts:sendOobCode`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${googleToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email: input.email,
        returnOobLink: true
      })
    }
  )
  const payload = await readJsonResponse(response) as { oobCode?: unknown; error?: { message?: unknown } }
  const firebaseError = String(payload.error?.message || '')
  const oobCode = typeof payload.oobCode === 'string' ? payload.oobCode : ''

  // Do not reveal whether the email is registered. The client receives the
  // same successful response, but no message is sent for an unknown address.
  if (!response.ok && firebaseError === 'EMAIL_NOT_FOUND') return
  if (!response.ok || !oobCode) {
    console.error('[password-reset] Firebase link generation failed', {
      serviceAccount: env.FIREBASE_CLIENT_EMAIL,
      status: response.status,
      payload
    })
    throw new AccessWorkerError('Unable to create a password reset link.', 502)
  }

  const resetUrl = `${PASSWORD_RESET_PAGE_URL}#code=${encodeURIComponent(oobCode)}&locale=${input.locale}`
  const copy = input.locale === 'ru'
    ? {
        subject: 'Сброс пароля — J.L.JÖRMUNGANDR',
        title: 'Сброс пароля',
        body: 'Нажмите кнопку ниже, чтобы задать новый пароль для аккаунта.',
        button: 'СБРОСИТЬ ПАРОЛЬ',
        note: 'Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.',
        text: 'Чтобы задать новый пароль, откройте ссылку:'
      }
    : {
        subject: 'Password reset — J.L.JÖRMUNGANDR',
        title: 'Password Reset',
        body: 'Click the button below to set a new password for your account.',
        button: 'RESET PASSWORD',
        note: 'If you did not request a password reset, you can safely ignore this email.',
        text: 'Open this link to set a new password:'
      }
  const safeUrl = escapeHtml(resetUrl)
  const text = [
    'J.L.JÖRMUNGANDR',
    '',
    copy.text,
    resetUrl,
    '',
    copy.note
  ].join('\n')
  const html = `
    <div style="margin:0;padding:32px 20px;background:#f5f5f2;color:#171717;font-family:Inter,Arial,sans-serif">
      <main style="margin:0 auto;max-width:560px;background:#ffffff;padding:42px 36px;text-align:center">
        <p style="margin:0 0 26px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;font-weight:800;letter-spacing:.22em">J.L.JÖRMUNGANDR</p>
        <h1 style="margin:0;font-size:26px;letter-spacing:.04em">${copy.title}</h1>
        <p style="margin:22px auto 30px;max-width:390px;font-size:16px;line-height:1.6">${copy.body}</p>
        <a href="${safeUrl}" style="display:inline-block;background:#171717;color:#ffffff;padding:15px 24px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;font-weight:800;letter-spacing:.15em;text-decoration:none">${copy.button}</a>
        <p style="margin:30px auto 0;max-width:390px;color:#5f5f5a;font-size:12px;line-height:1.55">${copy.note}</p>
      </main>
    </div>
  `
  const resendResponse = await fetch(RESEND_EMAIL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.ACCESS_EMAIL_FROM,
      to: [input.email],
      subject: copy.subject,
      text,
      html,
      tags: [{ name: 'source', value: 'password-reset' }]
    })
  })
  const resendPayload = await readJsonResponse(resendResponse)
  if (!resendResponse.ok) {
    throw new AccessWorkerError(`Unable to send password reset email: ${resendResponse.status} ${JSON.stringify(resendPayload)}`, 502)
  }
}

async function applyPasswordResetCode(code: string, newPassword: string): Promise<void> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oobCode: code, newPassword })
    }
  )
  if (response.ok) return

  const payload = await readJsonResponse(response)
  console.error('[password-reset] Firebase code application failed', { status: response.status, payload })
  throw new AccessWorkerError('This password reset link is invalid or expired.', 400)
}

function validatePasswordResetPassword(password: string): void {
  if (password.length < 8) throw new AccessWorkerError('Password must contain at least 8 characters.', 400)
  if (!/[A-Z]/.test(password)) throw new AccessWorkerError('Password must contain an uppercase letter.', 400)
  if (!/[a-z]/.test(password)) throw new AccessWorkerError('Password must contain a lowercase letter.', 400)
  if (!/\d/.test(password)) throw new AccessWorkerError('Password must contain a number.', 400)
  if (!/[^A-Za-z0-9]/.test(password)) throw new AccessWorkerError('Password must contain a special character.', 400)
}

function renderPasswordResetPageModern(): string {
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>Password reset — J.L.JÖRMUNGANDR</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #ece9e2; color: #151515; font-family: Inter, Arial, sans-serif; }
    .shell { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .card { width: min(100%, 480px); background: #f8f7f3; border: 1px solid #151515; padding: 42px 34px 36px; box-shadow: 0 18px 50px rgba(21,21,21,.08); }
    .brand { text-align: center; font: 800 10px ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .28em; }
    .icon { margin: 28px auto 22px; width: 48px; height: 48px; border: 1px solid #151515; display: grid; place-items: center; font-size: 24px; }
    .icon::after { content: '↻'; }
    h1 { margin: 0; text-align: center; font-size: 25px; letter-spacing: .08em; text-transform: uppercase; }
    .intro { margin: 14px auto 0; max-width: 380px; text-align: center; color: #4f4e49; font-size: 14px; line-height: 1.65; }
    .form { margin: 28px auto 0; display: grid; gap: 18px; max-width: 380px; }
    .field { display: grid; gap: 7px; }
    .field-label { color: #292925; font: 800 10px ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .12em; text-transform: uppercase; }
    .control { position: relative; display: flex; align-items: center; }
    .control input { width: 100%; border: 1px solid #a8a69f; background: #fff; color: #151515; padding: 14px 78px 14px 14px; font: 14px ui-monospace, SFMono-Regular, Menlo, monospace; outline: none; transition: border-color .2s, box-shadow .2s; }
    .control input:focus { border-color: #151515; box-shadow: 0 0 0 3px rgba(21,21,21,.1); }
    .control input.invalid { border-color: #b3261e; box-shadow: 0 0 0 3px rgba(179,38,30,.08); }
    .toggle { position: absolute; right: 8px; border: 0; background: transparent; color: #5d5b55; padding: 8px; font: 800 9px ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .08em; text-transform: uppercase; cursor: pointer; }
    .toggle:hover { color: #151515; }
    .hint { margin: 0; color: #6b6962; font-size: 12px; line-height: 1.5; }
    .field-error { min-height: 17px; margin: 0; color: #b3261e; font-size: 12px; line-height: 1.45; }
    .form button[type="submit"] { border: 1px solid #151515; background: #151515; color: #fff; padding: 15px 18px; font: 800 11px ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .15em; cursor: pointer; transition: opacity .2s; }
    .form button[type="submit"]:hover:not(:disabled) { opacity: .86; }
    .form button[type="submit"]:disabled { cursor: wait; opacity: .5; }
    .form.is-saving .field { display: none; }
    .message { min-height: 22px; margin: 18px auto 0; max-width: 380px; text-align: center; font-size: 13px; line-height: 1.55; }
    .message.error { color: #b3261e; }
    .message.saving { color: #4f4e49; font-weight: 700; }
    .message.success { color: #216e39; font-weight: 700; }
    .success .icon::after { content: '✓'; }
    .return-actions { margin: 24px auto 0; display: grid; gap: 10px; max-width: 380px; }
    .return-actions a { display: block; border: 1px solid #151515; padding: 14px 18px; text-align: center; text-decoration: none; font: 800 10px ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .12em; }
    .return-actions a.primary { background: #151515; color: #fff; }
    .return-actions a.secondary { background: transparent; color: #151515; }
    @media (max-width: 520px) { .card { padding: 34px 20px 28px; } h1 { font-size: 21px; } }
  </style>
</head>
<body>
  <main class="shell">
    <section class="card" id="card">
      <div class="brand">J.L.JÖRMUNGANDR</div>
      <div class="icon" aria-hidden="true"></div>
      <h1 id="title">RESET PASSWORD</h1>
      <p class="intro" id="body">Set a new password for your account.</p>
      <form id="form" class="form" hidden novalidate>
        <div class="field">
          <label class="field-label" id="password-label" for="password">New password</label>
          <div class="control">
            <input id="password" type="password" autocomplete="new-password" aria-describedby="password-hint password-error" required>
            <button class="toggle" id="password-toggle" type="button">Show</button>
          </div>
          <p class="hint" id="password-hint"></p>
          <p class="field-error" id="password-error" aria-live="polite"></p>
        </div>
        <div class="field">
          <label class="field-label" id="confirm-label" for="confirm">Confirm password</label>
          <div class="control">
            <input id="confirm" type="password" autocomplete="new-password" aria-describedby="confirm-error" required>
            <button class="toggle" id="confirm-toggle" type="button">Show</button>
          </div>
          <p class="field-error" id="confirm-error" aria-live="polite"></p>
        </div>
        <button id="submit" type="submit">SAVE PASSWORD</button>
      </form>
      <p id="message" class="message" role="alert" aria-live="polite"></p>
      <div id="return-actions" class="return-actions" hidden>
        <a class="primary" id="desktop-return" href="jlj://password-reset-success">OPEN DESKTOP APP</a>
        <a class="secondary" id="web-return" href="https://jorudr.github.io/JLJ/?password-reset=success">OPEN WEB APP</a>
      </div>
    </section>
  </main>
  <script>
    const query = new URLSearchParams(location.hash.slice(1));
    const ru = query.get('locale') === 'ru';
    const code = query.get('code') || '';
    const copy = ru
      ? {
          title: 'СБРОС ПАРОЛЯ',
          body: 'Задайте новый пароль для вашего аккаунта.',
          passwordLabel: 'Новый пароль',
          confirmLabel: 'Повторите пароль',
          passwordHint: 'Минимум 8 символов: заглавная и строчная буквы, цифра и специальный символ.',
          passwordRequired: 'Введите новый пароль.',
          confirmRequired: 'Повторите новый пароль.',
          mismatch: 'Пароли не совпадают.',
          submit: 'СОХРАНИТЬ ПАРОЛЬ',
          saving: 'СОХРАНЕНИЕ...',
          show: 'ПОКАЗАТЬ',
          hide: 'СКРЫТЬ',
          successTitle: 'ПАРОЛЬ ИЗМЕНЁН',
          successBody: 'Пароль успешно изменён. Теперь можно войти в приложение.',
          successMessage: 'Новый пароль сохранён.',
          missing: 'Ссылка недействительна или устарела. Запросите новую ссылку в приложении.',
          weak: 'Пароль должен содержать минимум 8 символов, заглавную и строчную буквы, цифру и специальный символ.',
          failed: 'Не удалось изменить пароль. Попробуйте ещё раз или запросите новую ссылку.',
          linkFailed: 'Ссылка недействительна или срок её действия истёк.',
          desktop: 'ОТКРЫТЬ DESKTOP-ПРИЛОЖЕНИЕ',
          web: 'ОТКРЫТЬ WEB-ПРИЛОЖЕНИЕ'
        }
      : {
          title: 'RESET PASSWORD',
          body: 'Set a new password for your account.',
          passwordLabel: 'New password',
          confirmLabel: 'Confirm password',
          passwordHint: 'At least 8 characters: uppercase and lowercase letters, a number and a special character.',
          passwordRequired: 'Enter a new password.',
          confirmRequired: 'Re-enter your new password.',
          mismatch: 'The passwords do not match.',
          submit: 'SAVE PASSWORD',
          saving: 'SAVING...',
          show: 'SHOW',
          hide: 'HIDE',
          successTitle: 'PASSWORD UPDATED',
          successBody: 'Your password has been changed. You can now sign in to the app.',
          successMessage: 'Your new password has been saved.',
          missing: 'This link is invalid or expired. Request a new link in the app.',
          weak: 'Use at least 8 characters with uppercase and lowercase letters, a number and a special character.',
          failed: 'Unable to change the password. Try again or request a new link.',
          linkFailed: 'This link is invalid or expired.',
          desktop: 'OPEN DESKTOP APP',
          web: 'OPEN WEB APP'
        };
    const card = document.getElementById('card');
    const title = document.getElementById('title');
    const body = document.getElementById('body');
    const form = document.getElementById('form');
    const password = document.getElementById('password');
    const confirm = document.getElementById('confirm');
    const submit = document.getElementById('submit');
    const message = document.getElementById('message');
    const passwordError = document.getElementById('password-error');
    const confirmError = document.getElementById('confirm-error');
    const returnActions = document.getElementById('return-actions');
    document.title = copy.title;
    title.textContent = copy.title;
    body.textContent = copy.body;
    document.getElementById('password-label').textContent = copy.passwordLabel;
    document.getElementById('confirm-label').textContent = copy.confirmLabel;
    document.getElementById('password-hint').textContent = copy.passwordHint;
    submit.textContent = copy.submit;
    document.getElementById('desktop-return').textContent = copy.desktop;
    document.getElementById('web-return').textContent = copy.web;

    function setFieldError(input, output, text) {
      output.textContent = text;
      input.classList.toggle('invalid', Boolean(text));
    }

    function passwordErrorFor(value) {
      if (!value) return copy.passwordRequired;
      return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value)
        ? ''
        : copy.weak;
    }

    function validate(showRequired) {
      const passwordErrorText = passwordErrorFor(password.value);
      const confirmErrorText = !confirm.value
        ? (showRequired ? copy.confirmRequired : '')
        : password.value === confirm.value ? '' : copy.mismatch;
      setFieldError(password, passwordError, passwordErrorText);
      setFieldError(confirm, confirmError, confirmErrorText);
      return !passwordErrorText && !confirmErrorText;
    }

    function bindToggle(buttonId, input) {
      const button = document.getElementById(buttonId);
      button.addEventListener('click', () => {
        const visible = input.type === 'text';
        input.type = visible ? 'password' : 'text';
        button.textContent = visible ? copy.show : copy.hide;
      });
    }

    bindToggle('password-toggle', password);
    bindToggle('confirm-toggle', confirm);
    password.addEventListener('input', () => validate(false));
    confirm.addEventListener('input', () => validate(false));

    if (!code) {
      message.className = 'message error';
      message.textContent = copy.missing;
    } else {
      form.hidden = false;
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      message.textContent = '';
      if (!validate(true)) return;

      form.classList.add('is-saving');
      password.disabled = true;
      confirm.disabled = true;
      submit.disabled = true;
      submit.textContent = copy.saving;
      message.className = 'message saving';
      message.textContent = copy.saving;

      try {
        const response = await fetch('/v1/password-reset/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, newPassword: password.value })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const errorText = typeof payload.error === 'string' ? payload.error : '';
          throw new Error(errorText);
        }
        form.hidden = true;
        card.classList.add('success');
        title.textContent = copy.successTitle;
        body.textContent = copy.successBody;
        message.className = 'message success';
        message.textContent = copy.successMessage;
        returnActions.hidden = false;
      } catch (error) {
        form.classList.remove('is-saving');
        password.disabled = false;
        confirm.disabled = false;
        submit.disabled = false;
        submit.textContent = copy.submit;
        message.className = 'message error';
        message.textContent = String(error.message || '').toLowerCase().includes('invalid') || String(error.message || '').toLowerCase().includes('expired')
          ? copy.linkFailed
          : copy.failed;
      }
    });
  </script>
</body>
</html>`
}

function renderPasswordResetPage(): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Password reset — J.L.JÖRMUNGANDR</title>
<style>body{margin:0;background:#ece9e2;color:#151515;font-family:Inter,Arial,sans-serif}.shell{min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box}.card{width:min(100%,540px);box-sizing:border-box;background:#f8f7f3;border:1px solid #151515;padding:50px 36px;text-align:center}.mark{font:800 10px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.28em}.icon{margin:30px auto 24px;width:48px;height:48px;border:1px solid #151515;display:grid;place-items:center}.icon:after{content:'↻';font-size:24px}h1{margin:0;font-size:25px;letter-spacing:.08em;text-transform:uppercase}p{margin:18px auto 0;max-width:390px;font-size:14px;line-height:1.65;color:#4f4e49}.form{margin:28px auto 0;display:grid;gap:14px;max-width:390px}.form input{box-sizing:border-box;width:100%;border:1px solid #aaa;background:#fff;padding:14px 15px;color:#151515;font:14px ui-monospace,SFMono-Regular,Menlo,monospace}.form button{border:1px solid #151515;background:#151515;color:#fff;padding:15px 18px;font:800 11px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.15em;cursor:pointer}.form button:disabled{cursor:wait;opacity:.45}.message{min-height:24px;margin-top:18px!important;color:#9b2727!important;font-size:13px!important}.success .icon:after{content:'✓'}.success .icon{border-color:#151515}</style>
</head><body><main class="shell"><section class="card" id="card"><div class="mark">J.L.JÖRMUNGANDR</div><div class="icon"></div><h1 id="title">RESET PASSWORD</h1><p id="body">Set a new password for your account.</p><form id="form" class="form" hidden><input id="password" type="password" autocomplete="new-password" placeholder="NEW PASSWORD" required><input id="confirm" type="password" autocomplete="new-password" placeholder="CONFIRM PASSWORD" required><button id="submit" type="submit">SAVE PASSWORD</button></form><p id="message" class="message" role="alert"></p></section></main>
<script>const q=new URLSearchParams(location.hash.slice(1)),ru=q.get('locale')==='ru',code=q.get('code')||'',copy=ru?{title:'СБРОС ПАРОЛЯ',body:'Задайте новый пароль для вашего аккаунта.',password:'НОВЫЙ ПАРОЛЬ',confirm:'ПОВТОРИТЕ ПАРОЛЬ',submit:'СОХРАНИТЬ ПАРОЛЬ',saving:'СОХРАНЕНИЕ...',successTitle:'ПАРОЛЬ ИЗМЕНЁН',successBody:'Пароль успешно изменён. Теперь можно войти в приложение.',missing:'Ссылка недействительна или устарела.',mismatch:'Пароли не совпадают.',weak:'Пароль должен содержать минимум 8 символов, заглавную и строчную буквы, цифру и специальный символ.',failed:'Не удалось изменить пароль. Запросите новую ссылку.'}:{title:'RESET PASSWORD',body:'Set a new password for your account.',password:'NEW PASSWORD',confirm:'CONFIRM PASSWORD',submit:'SAVE PASSWORD',saving:'SAVING...',successTitle:'PASSWORD UPDATED',successBody:'Your password has been changed. You can now sign in to the app.',missing:'This link is invalid or expired.',mismatch:'The passwords do not match.',weak:'Use at least 8 characters with uppercase and lowercase letters, a number and a special character.',failed:'Unable to change the password. Request a new link.'};const card=document.getElementById('card'),title=document.getElementById('title'),body=document.getElementById('body'),form=document.getElementById('form'),password=document.getElementById('password'),confirm=document.getElementById('confirm'),submit=document.getElementById('submit'),message=document.getElementById('message');document.title=copy.title;body.textContent=copy.body;password.placeholder=copy.password;confirm.placeholder=copy.confirm;submit.textContent=copy.submit;if(!code){message.textContent=copy.missing}else{form.hidden=false}function validPassword(value){return value.length>=8&&/[A-Z]/.test(value)&&/[a-z]/.test(value)&&/\\d/.test(value)&&/[^A-Za-z0-9]/.test(value)}form.addEventListener('submit',async event=>{event.preventDefault();message.textContent='';if(password.value!==confirm.value){message.textContent=copy.mismatch;return}if(!validPassword(password.value)){message.textContent=copy.weak;return}password.hidden=true;confirm.hidden=true;submit.disabled=true;submit.textContent=copy.saving;try{const response=await fetch('/v1/password-reset/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,newPassword:password.value})});if(!response.ok)throw new Error();form.hidden=true;card.classList.add('success');title.textContent=copy.successTitle;body.textContent=copy.successBody}catch{password.hidden=false;confirm.hidden=false;message.textContent=copy.failed;submit.disabled=false;submit.textContent=copy.submit}})</script></body></html>`
}

async function applyEmailVerificationCode(code: string): Promise<void> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oobCode: code })
    }
  )
  if (response.ok) return

  const payload = await readJsonResponse(response)
  console.error('[email-verification] Firebase code application failed', { status: response.status, payload })
  throw new AccessWorkerError('Unable to verify this email link.', 400)
}

function renderEmailVerificationPage(): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Email verification — J.L.JÖRMUNGANDR</title>
<style>body{margin:0;background:#ece9e2;color:#151515;font-family:Inter,Arial,sans-serif}.shell{min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box}.card{width:min(100%,540px);box-sizing:border-box;background:#f8f7f3;border:1px solid #151515;padding:50px 36px;text-align:center}.mark{font:800 10px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.28em}.icon{margin:30px auto 24px;width:48px;height:48px;border:1px solid #151515;display:grid;place-items:center}.icon:after{content:'✓';font-size:24px}h1{margin:0;font-size:25px;letter-spacing:.08em;text-transform:uppercase}p{margin:18px auto 0;max-width:390px;font-size:14px;line-height:1.65;color:#4f4e49}.line{margin:30px auto 0;width:42px;height:1px;background:#151515}.error .icon:after{content:'!';font-weight:700}.error .icon{border-color:#9b2727}.error h1{color:#9b2727}</style>
</head><body><main class="shell"><section class="card" id="card"><div class="mark">J.L.JÖRMUNGANDR</div><div class="icon"></div><h1 id="title">VERIFYING EMAIL</h1><p id="body">Please wait while we confirm your email address.</p><div class="line"></div></section></main>
<script>const q=new URLSearchParams(location.hash.slice(1)),ru=q.get('locale')==='ru',copy=ru?{loading:['ПОДТВЕРЖДАЕМ EMAIL','Пожалуйста, подождите. Проверяем ваш адрес.'],success:['EMAIL ПОДТВЕРЖДЁН','Можно вернуться в приложение — вход продолжится автоматически.'],error:['ССЫЛКА НЕДЕЙСТВИТЕЛЬНА','Запросите новое письмо в приложении и попробуйте снова.']}:{loading:['VERIFYING EMAIL','Please wait while we confirm your email address.'],success:['EMAIL VERIFIED','Return to the app — sign-in will continue automatically.'],error:['LINK IS INVALID','Request a new verification email in the app and try again.']};const title=document.getElementById('title'),body=document.getElementById('body'),card=document.getElementById('card');async function verify(){const code=q.get('code')||'';try{const r=await fetch('/v1/email-verification/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});if(!r.ok)throw new Error();title.textContent=copy.success[0];body.textContent=copy.success[1]}catch{card.classList.add('error');title.textContent=copy.error[0];body.textContent=copy.error[1]}}verify()</script></body></html>`
}

function isTrustedVerificationUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function renderPatreonCallbackPage(result: { ok: boolean; email: string; fullName: string }): string {
  const email = result.email ? `<p>Email: <strong>${escapeHtml(result.email)}</strong></p>` : ''
  const fullName = result.fullName ? `<p>Name: <strong>${escapeHtml(result.fullName)}</strong></p>` : ''
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Patreon connected</title>
  </head>
  <body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#050505;color:#f6f1e7;font-family:Inter,Arial,sans-serif">
    <main style="max-width:560px;padding:32px;text-align:center">
      <h1 style="font-size:28px;letter-spacing:.08em;text-transform:uppercase">Patreon connected</h1>
      <p>The OAuth callback works. Access keys are issued by the Patreon webhook after a paid membership event.</p>
      ${email}
      ${fullName}
    </main>
  </body>
</html>`
}

async function redeemAccessKey(env: Env, userId: string, rawKey: string) {
  const normalizedKey = normalizeAccessKey(rawKey)
  if (!normalizedKey) throw new AccessWorkerError('Invalid access key.', 400)

  const keyHash = await hashAccessKey(normalizedKey, env.ACCESS_KEY_PEPPER)
  const keyDocument = await findAccessKeyByHash(env, keyHash)
  if (!keyDocument) throw new AccessWorkerError('Invalid or inactive access key.', 400)

  const patreonGrant = await findPatreonGrantByKeyId(env, keyDocument.id)

  const transaction = await beginFirestoreTransaction(env)
  const keyPath = `accessKeys/${keyDocument.id}`
  const redemptionPath = `${keyPath}/redemptions/${userId}`
  const accessStatePath = `users/${userId}/access/state`
  const freePlanPath = `users/${userId}/accessFreePlans/${FREE_PLAN_ID}`
  const userPath = `users/${userId}`
  const patreonGrantPath = patreonGrant?.path || ''
  const documents = await batchGetDocuments(
    env,
    transaction,
    [keyPath, redemptionPath, accessStatePath, freePlanPath, userPath, patreonGrantPath].filter(Boolean)
  )
  const latestKeyDocument = documents.get(keyPath)
  const existingRedemption = documents.get(redemptionPath)
  const hasFreePlan = Boolean(documents.get(freePlanPath))

  if (isUserCurrentlyBlocked(documents.get(userPath)?.data)) {
    throw new AccessWorkerError('This account has been blocked. Please contact support.', 403)
  }

  if (!latestKeyDocument) throw new AccessWorkerError('Invalid or inactive access key.', 400)
  const accessKey = decodeAccessKeyRecord(latestKeyDocument)
  const currentAccess = documents.get(accessStatePath)
  const currentActivatedKeyId = String(currentAccess?.data.activatedKeyId || '').trim()
  const hasDifferentPaidKey = currentAccess?.data.source === 'key'
    && currentAccess?.data.plan === 'paid'
    && currentActivatedKeyId
    && currentActivatedKeyId !== accessKey.id

  // Check status and key redemption deadline even for an idempotent retry.
  // Otherwise a disabled/expired key could be used to restore access.
  assertAccessKeyCanBeRedeemed(accessKey, { ignoreRedemptionLimit: Boolean(existingRedemption) })

  if (existingRedemption) {
    if (hasDifferentPaidKey) {
      throw new AccessWorkerError('A newer access key is already active for this account.', 409)
    }
    const existingExpiresAtMs = toMillis(existingRedemption.data.expiresAt)
    if (existingExpiresAtMs && existingExpiresAtMs <= Date.now()) {
      throw new AccessWorkerError('This access period has expired. Please use a new access key.', 400)
    }
    await commitFirestoreTransaction(env, transaction, [
      createUserAccessStateWrite(env, userId, accessKey, existingExpiresAtMs || null, 'key', 'paid', hasFreePlan)
    ])
    return {
      activated: true,
      alreadyActivated: true,
      grant: accessKey.grant,
      plan: 'paid',
      capabilities: capabilitiesForPlan('paid'),
      expiresAt: existingExpiresAtMs ? new Date(existingExpiresAtMs).toISOString() : null
    }
  }

  const initialPaidThroughMs = resolveAccessExpiresAt(accessKey, new Date())
  const storedPatreonPaidThroughMs = patreonGrant
    ? toMillis(documents.get(patreonGrant.path)?.data.paidThroughAt) || 0
    : 0
  const paidThroughMs = patreonGrant
    ? Math.max(initialPaidThroughMs || 0, storedPatreonPaidThroughMs) || null
    : initialPaidThroughMs
  const accessExpiresAtMs = patreonGrant
    ? paidThroughMs === null ? null : paidThroughMs + patreonGracePeriodMs()
    : paidThroughMs

  const accessKeyFields = encodeFields({
    ...latestKeyDocument.data,
    redeemedCount: accessKey.redeemedCount + 1
  })
  const writes: FirestoreWrite[] = [
    {
      update: {
        name: firestoreDocumentName(env, keyPath),
        fields: accessKeyFields
      },
      updateMask: { fieldPaths: ['redeemedCount'] },
      currentDocument: latestKeyDocument.updateTime
        ? { updateTime: latestKeyDocument.updateTime }
        : undefined
    },
    {
      update: {
        name: firestoreDocumentName(env, redemptionPath),
        fields: encodeFields({
          userId,
          keyId: accessKey.id,
          grant: accessKey.grant,
          expiresAt: accessExpiresAtMs ? new Date(accessExpiresAtMs) : null
        })
      },
      updateTransforms: [{ fieldPath: 'redeemedAt', setToServerValue: 'REQUEST_TIME' }],
      currentDocument: { exists: false }
    },
    {
      update: {
        name: firestoreDocumentName(env, `users/${userId}/redeemedKeys/${accessKey.id}`),
        fields: encodeFields({
          keyId: accessKey.id,
          grant: accessKey.grant,
          expiresAt: accessExpiresAtMs ? new Date(accessExpiresAtMs) : null
        })
      },
      updateTransforms: [{ fieldPath: 'redeemedAt', setToServerValue: 'REQUEST_TIME' }],
      currentDocument: { exists: false }
    },
    createUserAccessStateWrite(env, userId, accessKey, accessExpiresAtMs, 'key', 'paid', hasFreePlan)
  ]

  if (patreonGrant && documents.get(patreonGrant.path)) {
    writes.push({
      update: {
        name: firestoreDocumentName(env, patreonGrant.path),
        fields: encodeFields({
          firebaseUserId: userId,
          paidThroughAt: paidThroughMs ? new Date(paidThroughMs) : null,
          graceUntil: accessExpiresAtMs ? new Date(accessExpiresAtMs) : null
        })
      },
      updateMask: { fieldPaths: ['firebaseUserId', 'paidThroughAt', 'graceUntil'] },
      currentDocument: patreonGrant.updateTime ? { updateTime: patreonGrant.updateTime } : undefined
    })
  }

  await commitFirestoreTransaction(env, transaction, writes)
  return {
    activated: true,
    alreadyActivated: false,
    grant: accessKey.grant,
    plan: 'paid',
    capabilities: capabilitiesForPlan('paid'),
    expiresAt: accessExpiresAtMs ? new Date(accessExpiresAtMs).toISOString() : null
  }
}

function createUserAccessStateWrite(
  env: Env,
  userId: string,
  accessKey: AccessKeyRecord,
  expiresAtMs: number | null,
  source: AccessSource,
  plan: AccessPlan,
  hasFreePlan = false
): FirestoreWrite {
  return {
    update: {
      name: firestoreDocumentName(env, `users/${userId}/access/state`),
      fields: encodeFields({
        isActivated: true,
        grant: accessKey.grant,
        plan,
        capabilities: capabilitiesForPlan(plan),
        hasFreePlan,
        activatedKeyId: accessKey.id,
        expiresAt: expiresAtMs ? new Date(expiresAtMs) : null,
        source
      })
    },
    updateTransforms: [{ fieldPath: 'activatedAt', setToServerValue: 'REQUEST_TIME' }]
  }
}

function resolveAccessExpiresAt(key: AccessKeyRecord, activatedAt: Date): number | null {
  if (key.durationMonths !== null) return addUtcMonths(activatedAt, key.durationMonths).getTime()
  return key.expiresAtMs
}

function isUserCurrentlyBlocked(data: Record<string, unknown> | undefined): boolean {
  if (data?.isBlocked !== true) return false
  const blockedUntilMs = toMillis(data.blockedUntil)
  return !blockedUntilMs || blockedUntilMs > Date.now()
}

async function startFreeTrial(env: Env, userId: string) {
  const transaction = await beginFirestoreTransaction(env)
  const trialPath = `users/${userId}/accessTrials/first`
  const accessStatePath = `users/${userId}/access/state`
  const userPath = `users/${userId}`
  const documents = await batchGetDocuments(env, transaction, [trialPath, accessStatePath, userPath])
  if (isUserCurrentlyBlocked(documents.get(userPath)?.data)) {
    throw new AccessWorkerError('This account has been blocked. Please contact support.', 403)
  }
  if (documents.get(trialPath)) {
    throw new AccessWorkerError('The free trial has already been used for this account.', 400)
  }

  const currentAccess = documents.get(accessStatePath)
  const currentAccessExpiresAtMs = toMillis(currentAccess?.data.expiresAt)
  const hasActiveAccess = currentAccess?.data.isActivated === true
    && (!currentAccessExpiresAtMs || currentAccessExpiresAtMs > Date.now())
  const currentPlan = String(currentAccess?.data.plan || '')
  const hasFreePlan = currentAccess?.data.hasFreePlan === true || currentPlan === 'free'
  if (hasActiveAccess && currentPlan !== 'free') {
    throw new AccessWorkerError('This account already has active access.', 400)
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000)
  const trialKey: AccessKeyRecord = {
    id: 'free-trial', keyHash: '', status: 'active', grant: ACCESS_GRANT,
    redeemedCount: 0, maxRedemptions: 1, expiresAtMs: expiresAt.getTime(), durationMonths: null
  }
  await commitFirestoreTransaction(env, transaction, [
    {
      update: {
        name: firestoreDocumentName(env, trialPath),
        fields: encodeFields({ source: 'free-trial', expiresAt })
      },
      updateTransforms: [{ fieldPath: 'activatedAt', setToServerValue: 'REQUEST_TIME' }],
      currentDocument: { exists: false }
    },
    createUserAccessStateWrite(env, userId, trialKey, expiresAt.getTime(), 'trial', 'trial', hasFreePlan)
  ])
  return {
    activated: true,
    trial: true,
    plan: 'trial',
    capabilities: capabilitiesForPlan('trial'),
    expiresAt: expiresAt.toISOString()
  }
}

async function startFreePlan(env: Env, userId: string) {
  const transaction = await beginFirestoreTransaction(env)
  const freePlanPath = `users/${userId}/accessFreePlans/${FREE_PLAN_ID}`
  const accessStatePath = `users/${userId}/access/state`
  const userPath = `users/${userId}`
  const documents = await batchGetDocuments(env, transaction, [freePlanPath, accessStatePath, userPath])

  if (isUserCurrentlyBlocked(documents.get(userPath)?.data)) {
    throw new AccessWorkerError('This account has been blocked. Please contact support.', 403)
  }

  const currentAccess = documents.get(accessStatePath)
  const currentExpiresAtMs = toMillis(currentAccess?.data.expiresAt)
  const hasActiveAccess = currentAccess?.data.isActivated === true
    && (!currentExpiresAtMs || currentExpiresAtMs > Date.now())
  const alreadyHasFreePlan = Boolean(documents.get(freePlanPath))
  const currentPlan = String(currentAccess?.data.plan || '')

  // A repeated request is safe and lets a former free user restore their
  // permanent fallback after a paid key has expired. It never downgrades an
  // active trial or paid entitlement.
  if (hasActiveAccess && !(alreadyHasFreePlan && currentPlan === 'free')) {
    throw new AccessWorkerError('This account already has active access.', 400)
  }

  const freePlanKey: AccessKeyRecord = {
    id: 'free-plan', keyHash: '', status: 'active', grant: 'free_access',
    redeemedCount: 0, maxRedemptions: 1, expiresAtMs: null, durationMonths: null
  }
  const writes: FirestoreWrite[] = [
    createUserAccessStateWrite(env, userId, freePlanKey, null, 'free', 'free', true)
  ]

  if (!alreadyHasFreePlan) {
    writes.unshift({
      update: {
        name: firestoreDocumentName(env, freePlanPath),
        fields: encodeFields({ source: 'free-plan' })
      },
      updateTransforms: [{ fieldPath: 'activatedAt', setToServerValue: 'REQUEST_TIME' }],
      currentDocument: { exists: false }
    })
  }

  await commitFirestoreTransaction(env, transaction, writes)
  return {
    activated: true,
    alreadyActivated: alreadyHasFreePlan,
    plan: 'free',
    capabilities: capabilitiesForPlan('free'),
    expiresAt: null
  }
}

function normalizeStoredCapabilities(value: unknown, plan: AccessPlan): AccessCapabilities {
  const policy = capabilitiesForPlan(plan)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return policy

  const stored = value as Record<string, unknown>
  return Object.fromEntries(ACCESS_CAPABILITIES.map((capability) => [
    capability,
    policy[capability] === true && stored[capability] !== false
  ])) as AccessCapabilities
}

async function checkCurrentEntitlement(env: Env, userId: string) {
  const checkedAt = new Date()
  const [accessDocument, userDocument] = await Promise.all([
    getFirestoreDocument(env, `users/${userId}/access/state`),
    getFirestoreDocument(env, `users/${userId}`)
  ])
  const accessData = accessDocument?.data
  const expiresAtMs = toMillis(accessData?.expiresAt) || 0
  const isExpired = expiresAtMs > 0 && expiresAtMs <= checkedAt.getTime()
  const isBlocked = isUserCurrentlyBlocked(userDocument?.data)
  const shouldRestoreFreePlan = isExpired && accessData?.hasFreePlan === true
  const isActivated = accessData?.isActivated === true && (!isExpired || shouldRestoreFreePlan) && !isBlocked

  if (!isActivated) {
    return {
      verified: true,
      isActivated: false,
      plan: 'none',
      capabilities: Object.fromEntries(ACCESS_CAPABILITIES.map((capability) => [capability, false])),
      expiresAt: expiresAtMs ? new Date(expiresAtMs).toISOString() : null,
      checkedAt: checkedAt.toISOString()
    }
  }

  const storedPlan = String(accessData?.plan || '')
  const plan: AccessPlan = shouldRestoreFreePlan
    ? 'free'
    : storedPlan === 'free' || storedPlan === 'trial' || storedPlan === 'paid'
      ? storedPlan
      : 'paid'

  return {
    verified: true,
    isActivated: true,
    plan,
    capabilities: normalizeStoredCapabilities(accessData?.capabilities, plan),
    expiresAt: shouldRestoreFreePlan || !expiresAtMs ? null : new Date(expiresAtMs).toISOString(),
    checkedAt: checkedAt.toISOString()
  }
}

async function enforceRedeemRateLimit(request: Request, env: Env, userId: string): Promise<void> {
  const [ipOutcome, userOutcome] = await Promise.all([
    env.ACCESS_REDEEM_RATE_LIMIT.limit({ key: `ip:${getRedeemRateLimitKey(request)}` }),
    env.ACCESS_REDEEM_RATE_LIMIT.limit({ key: `user:${userId}` })
  ])
  if (!ipOutcome.success || !userOutcome.success) {
    throw new AccessWorkerError('Too many activation attempts. Please try again later.', 429)
  }
}

async function enforceEntitlementCheckRateLimit(request: Request, env: Env, userId: string): Promise<void> {
  const [ipOutcome, userOutcome] = await Promise.all([
    env.ENTITLEMENT_CHECK_RATE_LIMIT.limit({ key: `ip:${getRedeemRateLimitKey(request)}` }),
    env.ENTITLEMENT_CHECK_RATE_LIMIT.limit({ key: `user:${userId}` })
  ])
  if (!ipOutcome.success || !userOutcome.success) {
    throw new AccessWorkerError('Too many entitlement checks. Please try again later.', 429)
  }
}

async function enforceEmailVerificationRateLimit(request: Request, env: Env, userId: string): Promise<void> {
  const [ipOutcome, userOutcome] = await Promise.all([
    env.EMAIL_VERIFICATION_RATE_LIMIT.limit({ key: `ip:${getRedeemRateLimitKey(request)}` }),
    env.EMAIL_VERIFICATION_RATE_LIMIT.limit({ key: `user:${userId}` })
  ])
  if (!ipOutcome.success || !userOutcome.success) {
    throw new AccessWorkerError('Too many verification emails. Please try again later.', 429)
  }
}

async function enforcePasswordResetRateLimit(request: Request, env: Env, email: string): Promise<void> {
  const [ipOutcome, emailOutcome] = await Promise.all([
    env.PASSWORD_RESET_RATE_LIMIT.limit({ key: `ip:${getRedeemRateLimitKey(request)}` }),
    env.PASSWORD_RESET_RATE_LIMIT.limit({ key: `email:${email}` })
  ])
  if (!ipOutcome.success || !emailOutcome.success) {
    throw new AccessWorkerError('Too many password reset emails. Please try again in 60 seconds.', 429)
  }
}

async function enforceEmailVerificationConfirmationRateLimit(request: Request, env: Env): Promise<void> {
  const outcome = await env.ACCESS_REDEEM_RATE_LIMIT.limit({ key: `email-confirm:${getRedeemRateLimitKey(request)}` })
  if (!outcome.success) throw new AccessWorkerError('Too many verification attempts. Please try again later.', 429)
}

function getRedeemRateLimitKey(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 'unknown-client'
}

async function createAccessKeys(env: Env, input: CreateKeysInput) {
  const keys = await createAccessKeyEntries(env, input.count)
  const writes = keys.map((entry) => createAccessKeyWrite(env, entry, input))

  await commitFirestoreWrites(env, writes)
  return keys.map(({ id, key }) => ({ id, key }))
}

async function createOrReadCurrentRotationBatch(env: Env, now: Date) {
  const currentBatch = await getCurrentRotationBatch(env, now)
  if (currentBatch) return decryptRotationBatch(env, currentBatch)

  const rotationStart = getManualRotationStart(now)
  const created = await createRotationBatch(env, rotationStart)
  return decryptRotationBatch(env, created)
}

async function createRotationBatch(env: Env, rotationStart: Date): Promise<RotationBatchRecord> {
  const batchId = getRotationBatchId(rotationStart)
  const existing = await getFirestoreDocument(env, `accessKeyBatches/${batchId}`)
  if (existing) return decodeRotationBatch(existing)

  const expiresAt = addUtcMonths(rotationStart, 2)
  const keys = await createAccessKeyEntries(env, 2)
  const encrypted = await encryptRotationKeys(env, keys.map(({ id, key }) => ({ id, key })))
  const input: CreateKeysInput = {
    count: 2,
    maxRedemptions: 1,
    expiresAt,
    durationMonths: null,
    label: `rotation-${rotationStart.toISOString().slice(0, 7)}`
  }
  const batchPath = `accessKeyBatches/${batchId}`
  const writes: FirestoreWrite[] = [
    ...keys.map((entry) => createAccessKeyWrite(env, entry, input)),
    {
      update: {
        name: firestoreDocumentName(env, batchPath),
        fields: encodeFields({
          rotationStart,
          expiresAt,
          encryptedKeys: encrypted.ciphertext,
          encryptionIv: encrypted.iv
        })
      },
      updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }],
      currentDocument: { exists: false }
    }
  ]

  await commitFirestoreWrites(env, writes)
  return {
    id: batchId,
    rotationStart,
    expiresAt,
    encryptedKeys: encrypted.ciphertext,
    encryptionIv: encrypted.iv
  }
}

async function createAccessKeyEntries(env: Env, count: number): Promise<AccessKeyEntry[]> {
  return Promise.all(Array.from({ length: count }, async () => {
    const key = createAccessKeyValue()
    return {
      id: `key_${crypto.randomUUID().replace(/-/g, '')}`,
      key,
      keyHash: await hashAccessKey(normalizeAccessKey(key), env.ACCESS_KEY_PEPPER)
    }
  }))
}

function createAccessKeyWrite(env: Env, entry: AccessKeyEntry, input: CreateKeysInput): FirestoreWrite {
  return {
    update: {
      name: firestoreDocumentName(env, `accessKeys/${entry.id}`),
      fields: encodeFields({
        keyHash: entry.keyHash,
        status: 'active',
        grant: ACCESS_GRANT,
        label: input.label,
        maxRedemptions: input.maxRedemptions,
        redeemedCount: 0,
        // expiresAt is a deadline for redeeming the key itself. License plans
        // use durationMonths and start counting only after activation.
        expiresAt: input.expiresAt,
        durationMonths: input.durationMonths
      })
    },
    updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }],
    currentDocument: { exists: false }
  }
}

async function getCurrentRotationBatch(env: Env, now: Date): Promise<RotationBatchRecord | null> {
  const scheduledStart = getRotationStartForSchedule(now)
  const candidates = [
    scheduledStart,
    addUtcMonths(scheduledStart, -2),
    addUtcMonths(scheduledStart, 2)
  ]
  for (const rotationStart of candidates) {
    const document = await getFirestoreDocument(env, `accessKeyBatches/${getRotationBatchId(rotationStart)}`)
    if (!document) continue
    const batch = decodeRotationBatch(document)
    if (batch.expiresAt.getTime() > now.getTime()) return batch
  }
  return null
}

async function decryptRotationBatch(env: Env, batch: RotationBatchRecord) {
  const plaintext = await decryptRotationKeys(env, batch.encryptedKeys, batch.encryptionIv)
  return {
    id: batch.id,
    expiresAt: batch.expiresAt.toISOString(),
    keys: plaintext
  }
}

function decodeRotationBatch(document: FirestoreDocument): RotationBatchRecord {
  const rotationStart = document.data.rotationStart instanceof Date ? document.data.rotationStart : null
  const expiresAt = document.data.expiresAt instanceof Date ? document.data.expiresAt : null
  const encryptedKeys = String(document.data.encryptedKeys || '')
  const encryptionIv = String(document.data.encryptionIv || '')
  if (!rotationStart || !expiresAt || !encryptedKeys || !encryptionIv) {
    throw new Error(`Invalid access key batch ${document.id}.`)
  }
  return { id: document.id, rotationStart, expiresAt, encryptedKeys, encryptionIv }
}

function getRotationStartForSchedule(date: Date): Date {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  const currentMonthStart = new Date(Date.UTC(year, month - 1, 1))
  const currentMonthIsRotation = ROTATION_MONTHS.includes(month)
  if (currentMonthIsRotation && day >= 1) return currentMonthStart

  const previousRotationMonth = [...ROTATION_MONTHS].reverse().find((candidate) => candidate < month)
  if (previousRotationMonth) return new Date(Date.UTC(year, previousRotationMonth - 1, 1))
  return new Date(Date.UTC(year - 1, 11, 1))
}

function getManualRotationStart(date: Date): Date {
  const current = getRotationStartForSchedule(date)
  return ROTATION_MONTHS.includes(date.getUTCMonth() + 1)
    ? current
    : addUtcMonths(current, 2)
}

function getRotationBatchId(rotationStart: Date): string {
  return `rotation_${rotationStart.getUTCFullYear()}${String(rotationStart.getUTCMonth() + 1).padStart(2, '0')}`
}

function addUtcMonths(date: Date, months: number): Date {
  const targetYear = date.getUTCFullYear()
  const targetMonth = date.getUTCMonth() + months
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  return new Date(Date.UTC(
    targetYear,
    targetMonth,
    Math.min(date.getUTCDate(), lastDay),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  ))
}

async function disableAccessKey(env: Env, keyId: string) {
  if (!/^key_[a-f0-9]{32}$/i.test(keyId)) {
    throw new AccessWorkerError('Invalid key id.', 400)
  }

  const document = await getFirestoreDocument(env, `accessKeys/${keyId}`)
  if (!document) throw new AccessWorkerError('Access key not found.', 404)

  await commitFirestoreWrites(env, [{
    update: {
      name: firestoreDocumentName(env, `accessKeys/${keyId}`),
      fields: encodeFields({ status: 'disabled' })
    },
    updateMask: { fieldPaths: ['status'] },
    updateTransforms: [{ fieldPath: 'disabledAt', setToServerValue: 'REQUEST_TIME' }],
    currentDocument: document.updateTime ? { updateTime: document.updateTime } : undefined
  }])
}

async function deactivateExpiredUserAccessStates(env: Env): Promise<{ checked: number; deactivated: number }> {
  const token = await getGoogleAccessToken(env)
  const now = Date.now()
  let checked = 0
  let deactivated = 0

  for (let batch = 0; batch < MAX_EXPIRED_ACCESS_CLEANUP_BATCHES; batch += 1) {
    const response = await fetch(`${firestoreBaseUrl(env)}/documents:runQuery`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'access', allDescendants: true }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: 'isActivated' },
                    op: 'EQUAL',
                    value: { booleanValue: true }
                  }
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'expiresAt' },
                    op: 'LESS_THAN_OR_EQUAL',
                    value: { timestampValue: new Date(now).toISOString() }
                  }
                }
              ]
            }
          },
          orderBy: [{ field: { fieldPath: 'expiresAt' }, direction: 'ASCENDING' }],
          limit: EXPIRED_ACCESS_CLEANUP_BATCH_SIZE
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Firestore query for expired user access states failed: ${response.status}`)
    }

    const expiredDocs = parseFirestoreQueryResponse(await response.text())
    checked += expiredDocs.length
    if (expiredDocs.length === 0) break

    const writes: FirestoreWrite[] = expiredDocs.map((doc) => {
      const restoreFreePlan = doc.data.hasFreePlan === true
      return {
        update: {
          name: doc.name,
          fields: encodeFields(restoreFreePlan
            ? {
                isActivated: true,
                grant: 'free_access',
                plan: 'free',
                capabilities: capabilitiesForPlan('free'),
                hasFreePlan: true,
                activatedKeyId: 'free-plan',
                expiresAt: null,
                source: 'free'
              }
            : {
                isActivated: false,
                grant: doc.data.grant || ACCESS_GRANT,
                plan: doc.data.plan || 'paid',
                capabilities: doc.data.capabilities || capabilitiesForPlan('paid'),
                hasFreePlan: false,
                activatedKeyId: doc.data.activatedKeyId || null,
                expiresAt: doc.data.expiresAt || null,
                source: doc.data.source || 'key'
              })
        },
        updateMask: restoreFreePlan
          ? undefined
          : { fieldPaths: ['isActivated'] },
        updateTransforms: [{
          fieldPath: restoreFreePlan ? 'freePlanRestoredAt' : 'deactivatedAt',
          setToServerValue: 'REQUEST_TIME'
        }],
        // Do not let a cleanup result selected before a new redemption overwrite
        // that newly granted access.
        currentDocument: doc.updateTime ? { updateTime: doc.updateTime } : undefined
      }
    })

    await commitFirestoreWrites(env, writes)
    deactivated += expiredDocs.length
    if (expiredDocs.length < EXPIRED_ACCESS_CLEANUP_BATCH_SIZE) break
  }

  return { checked, deactivated }
}

function parseCreateKeysInput(input: Record<string, unknown>): CreateKeysInput {
  const count = Number(input.count)
  if (!Number.isInteger(count) || count < 1 || count > MAX_KEYS_PER_REQUEST) {
    throw new AccessWorkerError(`count must be an integer from 1 to ${MAX_KEYS_PER_REQUEST}.`, 400)
  }

  const rawMaxRedemptions = input.maxRedemptions
  const maxRedemptions = rawMaxRedemptions == null || rawMaxRedemptions === ''
    ? DEFAULT_MAX_KEY_REDEMPTIONS
    : Number(rawMaxRedemptions)
  if (!Number.isInteger(maxRedemptions)
    || maxRedemptions < 1
    || maxRedemptions > MAX_KEY_REDEMPTIONS
  ) {
    throw new AccessWorkerError('maxRedemptions must be a positive integer.', 400)
  }

  const requestedPlan = String(input.plan || '').trim().toLowerCase()
  const rawDurationMonths = input.durationMonths
  let durationMonths: number | null = null
  if (requestedPlan) {
    if (!(requestedPlan in LICENSE_PLANS)) {
      throw new AccessWorkerError('plan must be one of: 1m, 3m, 6m, 1y, 5y, lifetime.', 400)
    }
    durationMonths = LICENSE_PLANS[requestedPlan as keyof typeof LICENSE_PLANS]
  } else if (rawDurationMonths != null && rawDurationMonths !== '') {
    durationMonths = Number(rawDurationMonths)
    if (!Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 1200) {
      throw new AccessWorkerError('durationMonths must be an integer from 1 to 1200.', 400)
    }
  }

  const rawExpiresAt = input.expiresAt
  const expiresAt = rawExpiresAt == null || rawExpiresAt === ''
    ? null
    : new Date(String(rawExpiresAt))
  if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now())) {
    throw new AccessWorkerError('expiresAt must be a future ISO date.', 400)
  }

  const label = String(input.label || '').trim().slice(0, 120)
  return { count, maxRedemptions, expiresAt, durationMonths, label }
}

function decodeAccessKeyRecord(document: FirestoreDocument): AccessKeyRecord {
  const keyHash = String(document.data.keyHash || '')
  const status = String(document.data.status || '').toLowerCase()
  if (!keyHash || (status !== 'active' && status !== 'disabled')) {
    throw new AccessWorkerError('Invalid or inactive access key.', 400)
  }

  const maxRedemptions = document.data.maxRedemptions == null
    ? DEFAULT_MAX_KEY_REDEMPTIONS
    : Number(document.data.maxRedemptions)
  return {
    id: document.id,
    keyHash,
    status,
    grant: String(document.data.grant || ACCESS_GRANT),
    redeemedCount: Math.max(0, Number(document.data.redeemedCount || 0)),
    maxRedemptions: Number.isInteger(maxRedemptions) && maxRedemptions > 0
      ? maxRedemptions
      : DEFAULT_MAX_KEY_REDEMPTIONS,
    expiresAtMs: toMillis(document.data.expiresAt),
    durationMonths: document.data.durationMonths == null
      ? null
      : Number.isInteger(Number(document.data.durationMonths)) && Number(document.data.durationMonths) > 0
        ? Number(document.data.durationMonths)
        : null,
    updateTime: document.updateTime
  }
}

function assertAccessKeyCanBeRedeemed(key: AccessKeyRecord, options: { ignoreRedemptionLimit?: boolean } = {}) {
  if (key.status !== 'active') throw new AccessWorkerError('Invalid or inactive access key.', 400)
  if (key.expiresAtMs && key.expiresAtMs <= Date.now()) {
    throw new AccessWorkerError('This access key has expired.', 400)
  }
  if (!options.ignoreRedemptionLimit && key.redeemedCount >= key.maxRedemptions) {
    throw new AccessWorkerError('This access key has reached its activation limit.', 400)
  }
}

async function requireFirebaseIdentity(request: Request, env: Env): Promise<FirebaseIdentity> {
  const authorization = request.headers.get('Authorization') || ''
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (!token) throw new AccessWorkerError('Authentication is required.', 401)
  const identity = await verifyFirebaseIdToken(token, env.FIREBASE_PROJECT_ID)
  if (isAppCheckEnforced(env)) await requireFirebaseAppCheck(request, env)
  return identity
}

async function requireAdminToken(request: Request, env: Env): Promise<void> {
  const token = request.headers.get('X-Access-Admin-Token') || ''
  if (!token || !constantTimeEqual(token, env.ACCESS_ADMIN_TOKEN)) {
    throw new AccessWorkerError('Admin authorization is required.', 401)
  }
}

function requireVerifiedEmail(identity: FirebaseIdentity): void {
  if (!identity.emailVerified) {
    throw new AccessWorkerError('Verify your email address before activating free access.', 403)
  }
}

async function verifyFirebaseIdToken(token: string, projectId: string): Promise<FirebaseIdentity> {
  const [encodedHeader, encodedPayload, encodedSignature, ...extra] = token.split('.')
  if (!encodedHeader || !encodedPayload || !encodedSignature || extra.length) {
    throw new AccessWorkerError('Invalid authentication token.', 401)
  }

  const header = decodeJwtPart<{ alg?: string; kid?: string; typ?: string }>(encodedHeader)
  const payload = decodeJwtPart<{
    aud?: string
    iss?: string
    sub?: string
    exp?: number
    iat?: number
    email?: string
    email_verified?: boolean
  }>(encodedPayload)
  if (header.alg !== 'RS256' || header.typ !== 'JWT' || !header.kid || !payload.sub || payload.aud !== projectId) {
    throw new AccessWorkerError('Invalid authentication token.', 401)
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  if (!Number.isFinite(payload.exp) || payload.exp! <= nowSeconds || !Number.isFinite(payload.iat) || payload.iat! > nowSeconds + 60) {
    throw new AccessWorkerError('Authentication token has expired.', 401)
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}` || payload.sub.length > 128) {
    throw new AccessWorkerError('Invalid authentication token.', 401)
  }

  const jwks = await getFirebaseJwks()
  const jwk = jwks.find((candidate) => candidate.kid === header.kid)
  if (!jwk) throw new AccessWorkerError('Invalid authentication token.', 401)

  const publicKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  )
  const isValid = await crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    publicKey,
    toArrayBuffer(base64UrlDecode(encodedSignature)),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  )
  if (!isValid) throw new AccessWorkerError('Invalid authentication token.', 401)

  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email.trim() : '',
    emailVerified: payload.email_verified === true
  }
}

function isAppCheckEnforced(env: Env): boolean {
  return String(env.FIREBASE_APPCHECK_ENFORCE || '').trim().toLowerCase() === 'true'
}

function configuredAppCheckAppIds(env: Env): Set<string> {
  return new Set(String(env.FIREBASE_APPCHECK_APP_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean))
}

async function requireFirebaseAppCheck(request: Request, env: Env): Promise<void> {
  const token = request.headers.get('X-Firebase-AppCheck')?.trim()
  if (!token) throw new AccessWorkerError('A valid App Check token is required.', 401)
  await verifyFirebaseAppCheckToken(token, env)
}

async function verifyFirebaseAppCheckToken(token: string, env: Env): Promise<void> {
  const projectNumber = String(env.FIREBASE_PROJECT_NUMBER || '').trim()
  if (!projectNumber) throw new AccessWorkerError('App Check is not configured on the access service.', 500)

  const [encodedHeader, encodedPayload, encodedSignature, ...extra] = token.split('.')
  if (!encodedHeader || !encodedPayload || !encodedSignature || extra.length) {
    throw new AccessWorkerError('Invalid App Check token.', 401)
  }

  const header = decodeJwtPart<{ alg?: string; kid?: string; typ?: string }>(encodedHeader)
  const payload = decodeJwtPart<{
    aud?: string | string[]
    iss?: string
    sub?: string
    exp?: number
    iat?: number
  }>(encodedPayload)
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (
    header.alg !== 'RS256'
    || header.typ !== 'JWT'
    || !header.kid
    || !payload.sub
    || payload.iss !== `https://firebaseappcheck.googleapis.com/${projectNumber}`
    || !audience.includes(`projects/${projectNumber}`)
    || !Number.isFinite(payload.exp)
    || payload.exp! <= nowSeconds
    || !Number.isFinite(payload.iat)
    || payload.iat! > nowSeconds + 60
  ) {
    throw new AccessWorkerError('Invalid App Check token.', 401)
  }

  const allowedAppIds = configuredAppCheckAppIds(env)
  if (allowedAppIds.size > 0 && !allowedAppIds.has(payload.sub)) {
    throw new AccessWorkerError('This app is not permitted to request access.', 403)
  }

  const jwks = await getFirebaseAppCheckJwks()
  const jwk = jwks.find((candidate) => candidate.kid === header.kid)
  if (!jwk) throw new AccessWorkerError('Invalid App Check token.', 401)

  const publicKey = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
  )
  const isValid = await crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    publicKey,
    toArrayBuffer(base64UrlDecode(encodedSignature)),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  )
  if (!isValid) throw new AccessWorkerError('Invalid App Check token.', 401)
}

async function getFirebaseJwks(): Promise<FirebaseJwk[]> {
  if (cachedFirebaseJwks && cachedFirebaseJwks.expiresAtMs > Date.now()) {
    return cachedFirebaseJwks.keys
  }

  const response = await fetch(FIREBASE_JWKS_ENDPOINT)
  const payload = await readJsonResponse(response) as { keys?: FirebaseJwk[] }
  if (!response.ok || !Array.isArray(payload.keys)) {
    throw new AccessWorkerError('Unable to verify authentication.', 503)
  }

  const cacheControl = response.headers.get('Cache-Control') || ''
  const maxAgeSeconds = Number(cacheControl.match(/max-age=(\d+)/)?.[1] || 21_600)
  cachedFirebaseJwks = {
    keys: payload.keys,
    expiresAtMs: Date.now() + Math.max(60, maxAgeSeconds) * 1000
  }
  return cachedFirebaseJwks.keys
}

async function getFirebaseAppCheckJwks(): Promise<FirebaseJwk[]> {
  if (cachedFirebaseAppCheckJwks && cachedFirebaseAppCheckJwks.expiresAtMs > Date.now()) {
    return cachedFirebaseAppCheckJwks.keys
  }

  const response = await fetch(FIREBASE_APPCHECK_JWKS_ENDPOINT)
  const payload = await readJsonResponse(response) as { keys?: FirebaseJwk[] }
  if (!response.ok || !Array.isArray(payload.keys)) {
    throw new AccessWorkerError('Unable to verify App Check.', 503)
  }

  const cacheControl = response.headers.get('Cache-Control') || ''
  const maxAgeSeconds = Number(cacheControl.match(/max-age=(\d+)/)?.[1] || 21_600)
  cachedFirebaseAppCheckJwks = {
    keys: payload.keys,
    // Firebase explicitly limits JWK caching to six hours.
    expiresAtMs: Date.now() + Math.min(21_600, Math.max(60, maxAgeSeconds)) * 1000
  }
  return cachedFirebaseAppCheckJwks.keys
}

async function findAccessKeyByHash(env: Env, keyHash: string): Promise<FirestoreDocument | null> {
  const token = await getGoogleAccessToken(env)
  const response = await fetch(`${firestoreBaseUrl(env)}/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'accessKeys' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'keyHash' },
            op: 'EQUAL',
            value: { stringValue: keyHash }
          }
        },
        limit: 2
      }
    })
  })
  if (!response.ok) throw new Error(`Firestore access key lookup failed: ${response.status}`)

  const documents = parseFirestoreQueryResponse(await response.text())
  if (documents.length > 1) throw new Error('Multiple access keys share the same hash.')
  return documents[0] || null
}

async function findPatreonGrantByKeyId(env: Env, keyId: string): Promise<{ path: string; updateTime?: string } | null> {
  const token = await getGoogleAccessToken(env)
  const response = await fetch(`${firestoreBaseUrl(env)}/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'patreonAccessGrants' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'keyId' },
            op: 'EQUAL',
            value: { stringValue: keyId }
          }
        },
        limit: 2
      }
    })
  })
  if (!response.ok) throw new Error(`Firestore Patreon grant lookup failed: ${response.status}`)

  const documents = parseFirestoreQueryResponse(await response.text())
  if (documents.length > 1) throw new Error('Multiple Patreon grants share the same access key.')
  const document = documents[0]
  if (!document) return null
  return {
    path: document.name.split('/documents/')[1] || '',
    updateTime: document.updateTime
  }
}

async function findFirebaseUserIdByEmail(env: Env, email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!isEmailLike(normalizedEmail)) return ''

  const token = await getGoogleAccessToken(env)
  const response = await fetch(`${firestoreBaseUrl(env)}/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'users' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'email' },
            op: 'EQUAL',
            value: { stringValue: normalizedEmail }
          }
        },
        limit: 2
      }
    })
  })
  if (!response.ok) throw new Error(`Firestore user lookup failed: ${response.status}`)

  const documents = parseFirestoreQueryResponse(await response.text())
  if (documents.length > 1) throw new Error('Multiple Firebase users share the same email.')
  const document = documents[0]
  if (!document || !/^users\/[^/]+$/.test(document.name.split('/documents/')[1] || '')) return ''
  return document.id
}

function parseFirestoreQueryResponse(body: string): FirestoreDocument[] {
  return parseFirestoreResponseItems<{ document?: FirestoreDocumentResponse }>(body)
    .map((entry) => entry.document ? decodeDocument(entry.document) : null)
    .filter((entry): entry is FirestoreDocument => Boolean(entry))
}

async function getFirestoreDocument(env: Env, path: string): Promise<FirestoreDocument | null> {
  const token = await getGoogleAccessToken(env)
  const response = await fetch(`${firestoreBaseUrl(env)}/documents/${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (response.status === 404) return null
  const payload = await readJsonResponse(response) as FirestoreDocumentResponse
  if (!response.ok) throw new Error(`Firestore document read failed: ${response.status}`)
  return decodeDocument(payload)
}

async function beginFirestoreTransaction(env: Env): Promise<string> {
  const token = await getGoogleAccessToken(env)
  const response = await fetch(`${firestoreBaseUrl(env)}/documents:beginTransaction`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  })
  const payload = await readJsonResponse(response) as { transaction?: string }
  if (!response.ok || !payload.transaction) throw new Error(`Unable to start Firestore transaction: ${response.status}`)
  return payload.transaction
}

async function batchGetDocuments(env: Env, transaction: string, paths: string[]): Promise<Map<string, FirestoreDocument>> {
  const token = await getGoogleAccessToken(env)
  const response = await fetch(`${firestoreBaseUrl(env)}/documents:batchGet`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documents: paths.map((path) => firestoreDocumentName(env, path)),
      transaction
    })
  })
  const body = await response.text()
  if (!response.ok) throw new Error(`Firestore transaction read failed: ${response.status}`)

  const documents = new Map<string, FirestoreDocument>()
  for (const entry of parseFirestoreResponseItems<{ found?: FirestoreDocumentResponse }>(body)) {
    if (!entry.found) continue
    const document = decodeDocument(entry.found)
    documents.set(document.name.split('/documents/')[1] || '', document)
  }
  return documents
}

function parseFirestoreResponseItems<T>(body: string): T[] {
  const trimmed = body.trim()
  if (!trimmed) return []

  try {
    const parsed = JSON.parse(trimmed) as T | T[]
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return trimmed.split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T)
  }

}

async function commitFirestoreTransaction(env: Env, transaction: string, writes: FirestoreWrite[]): Promise<void> {
  await commitFirestore(env, { transaction, writes })
}

async function commitFirestoreWrites(env: Env, writes: FirestoreWrite[]): Promise<void> {
  await commitFirestore(env, { writes })
}

async function commitFirestore(env: Env, payload: { transaction?: string; writes: FirestoreWrite[] }): Promise<void> {
  const token = await getGoogleAccessToken(env)
  const response = await fetch(`${firestoreBaseUrl(env)}/documents:commit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!response.ok) {
    const detail = await readJsonResponse(response)
    throw new Error(`Firestore commit failed: ${response.status} ${JSON.stringify(detail)}`)
  }
}

async function getGoogleAccessToken(env: Env): Promise<string> {
  if (cachedGoogleToken && cachedGoogleToken.expiresAtMs - Date.now() > 60_000) {
    return cachedGoogleToken.value
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  const assertion = await createServiceAccountJwt({
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKeyPem: env.FIREBASE_PRIVATE_KEY,
    issuedAtSeconds: nowSeconds - 30,
    expiresAtSeconds: nowSeconds + 3300
  })
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  })
  const payload = await readJsonResponse(response) as { access_token?: string; expires_in?: number }
  if (!response.ok || !payload.access_token) throw new Error(`Google OAuth token exchange failed: ${response.status}`)

  cachedGoogleToken = {
    value: payload.access_token,
    expiresAtMs: Date.now() + (payload.expires_in || 3600) * 1000
  }
  return cachedGoogleToken.value
}

async function createServiceAccountJwt(input: {
  clientEmail: string
  privateKeyPem: string
  issuedAtSeconds: number
  expiresAtSeconds: number
}): Promise<string> {
  const header = base64UrlEncodeText(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64UrlEncodeText(JSON.stringify({
    iss: input.clientEmail,
    sub: input.clientEmail,
    aud: GOOGLE_TOKEN_ENDPOINT,
    scope: GOOGLE_API_SCOPES,
    iat: input.issuedAtSeconds,
    exp: input.expiresAtSeconds
  }))
  const unsignedToken = `${header}.${payload}`
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    await importPrivateKey(input.privateKeyPem),
    new TextEncoder().encode(unsignedToken)
  )
  return `${unsignedToken}.${base64UrlEncodeBytes(new Uint8Array(signature))}`
}

async function importPrivateKey(privateKeyPem: string): Promise<CryptoKey> {
  const base64 = privateKeyPem.replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '')
  if (!base64) throw new Error('FIREBASE_PRIVATE_KEY is empty or invalid.')

  return crypto.subtle.importKey(
    'pkcs8',
    Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
}

function normalizeAccessKey(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  return /^EXG[A-F0-9]{32}$/.test(normalized) ? normalized : ''
}

function createAccessKeyValue(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
  return `EXG-${hex.match(/.{1,8}/g)?.join('-') || hex}`
}

async function hashAccessKey(normalizedKey: string, pepper: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(normalizedKey))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function encryptRotationKeys(env: Env, keys: Array<{ id: string; key: string }>) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(keys))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    await getAccessKeyEncryptionKey(env.ACCESS_KEY_ENCRYPTION_KEY),
    toArrayBuffer(plaintext)
  )
  return {
    ciphertext: base64UrlEncodeBytes(new Uint8Array(ciphertext)),
    iv: base64UrlEncodeBytes(iv)
  }
}

async function decryptRotationKeys(env: Env, encryptedKeys: string, encodedIv: string): Promise<Array<{ id: string; key: string }>> {
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(base64UrlDecode(encodedIv)) },
      await getAccessKeyEncryptionKey(env.ACCESS_KEY_ENCRYPTION_KEY),
      toArrayBuffer(base64UrlDecode(encryptedKeys))
    )
    const payload = JSON.parse(new TextDecoder().decode(plaintext)) as Array<{ id?: unknown; key?: unknown }>
    if (!Array.isArray(payload) || payload.length < 1) throw new Error('Invalid encrypted key batch.')

    const keys = payload.map((entry) => ({
      id: String(entry.id || ''),
      key: String(entry.key || '')
    }))
    if (keys.some((entry) => !/^key_[a-f0-9]{32}$/i.test(entry.id) || !normalizeAccessKey(entry.key))) {
      throw new Error('Invalid encrypted key batch.')
    }
    return keys
  } catch {
    throw new Error('Unable to decrypt the access key batch.')
  }
}

async function getAccessKeyEncryptionKey(secret: string): Promise<CryptoKey> {
  const material = new TextEncoder().encode(secret)
  const digest = await crypto.subtle.digest('SHA-256', toArrayBuffer(material))
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

function decodeDocument(document: FirestoreDocumentResponse): FirestoreDocument {
  const name = document.name
  return {
    id: name.split('/').at(-1) || '',
    name,
    data: decodeFields(document.fields || {}),
    updateTime: document.updateTime
  }
}

function decodeFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]))
}

function decodeValue(value: FirestoreValue): unknown {
  if ('nullValue' in value) return null
  if ('booleanValue' in value) return value.booleanValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('timestampValue' in value) return new Date(value.timestampValue as string)
  if ('stringValue' in value) return value.stringValue
  if ('mapValue' in value) return decodeFields(value.mapValue?.fields || {})
  return undefined
}

function encodeFields(fields: Record<string, unknown>): Record<string, FirestoreValue> {
  return Object.fromEntries(Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => [key, encodeValue(value)]))
}

function encodeValue(value: unknown): FirestoreValue {
  if (value === null) return { nullValue: null }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { mapValue: { fields: encodeFields(value as Record<string, unknown>) } }
  }
  throw new Error('Unsupported Firestore value.')
}

function firestoreBaseUrl(env: Env): string {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)`
}

function firestoreDocumentName(env: Env, path: string): string {
  return `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`
}

function toMillis(value: unknown): number | null {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function safeFirestoreId(value: string): string {
  const safe = value.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120)
  if (!safe) throw new AccessWorkerError('Invalid external id.', 400)
  return safe
}

function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case "'": return '&#39;'
      default: return character
    }
  })
}

function hmacMd5Hex(key: Uint8Array, message: Uint8Array): string {
  const blockSize = 64
  const normalizedKey = key.byteLength > blockSize ? md5(key) : key
  const keyBlock = new Uint8Array(blockSize)
  keyBlock.set(normalizedKey)

  const outerPad = new Uint8Array(blockSize)
  const innerPad = new Uint8Array(blockSize)
  for (let index = 0; index < blockSize; index += 1) {
    outerPad[index] = keyBlock[index] ^ 0x5c
    innerPad[index] = keyBlock[index] ^ 0x36
  }

  return bytesToHex(md5(concatBytes(outerPad, md5(concatBytes(innerPad, message)))))
}

function md5(message: Uint8Array): Uint8Array {
  const shifts = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
  ]
  const constants = Array.from({ length: 64 }, (_, index) => (
    Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0
  ))

  const bitLength = message.byteLength * 8
  const paddedLength = (((message.byteLength + 8) >>> 6) + 1) * 64
  const padded = new Uint8Array(paddedLength)
  padded.set(message)
  padded[message.byteLength] = 0x80
  const view = new DataView(padded.buffer)
  view.setUint32(paddedLength - 8, bitLength >>> 0, true)
  view.setUint32(paddedLength - 4, Math.floor(bitLength / 0x100000000), true)

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  for (let offset = 0; offset < paddedLength; offset += 64) {
    const words = Array.from({ length: 16 }, (_, index) => view.getUint32(offset + index * 4, true))
    let a = a0
    let b = b0
    let c = c0
    let d = d0

    for (let index = 0; index < 64; index += 1) {
      let f = 0
      let g = 0
      if (index < 16) {
        f = (b & c) | (~b & d)
        g = index
      } else if (index < 32) {
        f = (d & b) | (~d & c)
        g = (5 * index + 1) % 16
      } else if (index < 48) {
        f = b ^ c ^ d
        g = (3 * index + 5) % 16
      } else {
        f = c ^ (b | ~d)
        g = (7 * index) % 16
      }

      const nextD = d
      d = c
      c = b
      b = add32(b, rotateLeft(add32(add32(a, f), add32(constants[index] || 0, words[g] || 0)), shifts[index] || 0))
      a = nextD
    }

    a0 = add32(a0, a)
    b0 = add32(b0, b)
    c0 = add32(c0, c)
    d0 = add32(d0, d)
  }

  const output = new Uint8Array(16)
  const outputView = new DataView(output.buffer)
  outputView.setUint32(0, a0, true)
  outputView.setUint32(4, b0, true)
  outputView.setUint32(8, c0, true)
  outputView.setUint32(12, d0, true)
  return output
}

function add32(left: number, right: number): number {
  return (left + right) >>> 0
}

function rotateLeft(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0
}

function concatBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  const output = new Uint8Array(left.byteLength + right.byteLength)
  output.set(left)
  output.set(right, left.byteLength)
  return output
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function decodeJwtPart<T>(encoded: string): T {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(encoded))) as T
  } catch {
    throw new AccessWorkerError('Invalid authentication token.', 401)
  }
}

function base64UrlEncodeText(value: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(value))
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4)
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left)
  const rightBytes = new TextEncoder().encode(right)
  let difference = leftBytes.length ^ rightBytes.length
  const length = Math.max(leftBytes.length, rightBytes.length)
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0)
  }
  return difference === 0
}

async function readJsonBody<T>(request: Request): Promise<T> {
  try {
    return await request.json() as T
  } catch {
    throw new AccessWorkerError('Request body must be valid JSON.', 400)
  }
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Firebase-AppCheck, X-Access-Admin-Token',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store'
    }
  })
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  })
}

function emptyResponse(status: number): Response {
  return new Response(null, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Firebase-AppCheck, X-Access-Admin-Token',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
  })
}
