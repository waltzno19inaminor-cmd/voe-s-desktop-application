interface Env {
  ACCESS_KEY_PEPPER: string
  ACCESS_KEY_ENCRYPTION_KEY: string
  ACCESS_ADMIN_TOKEN: string
  ACCESS_REDEEM_RATE_LIMIT: RateLimit
  FIREBASE_PROJECT_ID: string
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
  maxRedemptions: number | null
  expiresAtMs: number | null
  updateTime?: string
}

interface FirebaseIdentity {
  uid: string
}

interface FirebaseJwk extends JsonWebKey {
  kid?: string
}

interface CreateKeysInput {
  count: number
  maxRedemptions: number | null
  expiresAt: Date | null
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
}

interface RotationBatchRecord {
  id: string
  rotationStart: Date
  expiresAt: Date
  encryptedKeys: string
  encryptionIv: string
}

const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore'
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const FIREBASE_JWKS_ENDPOINT = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
const PATREON_TOKEN_ENDPOINT = 'https://www.patreon.com/api/oauth2/token'
const PATREON_IDENTITY_ENDPOINT = 'https://www.patreon.com/api/oauth2/v2/identity'
const RESEND_EMAIL_ENDPOINT = 'https://api.resend.com/emails'
const MAX_KEYS_PER_REQUEST = 100
const MAX_KEY_REDEMPTIONS = 1_000_000
const ACCESS_GRANT = 'full_access'
const ROTATION_MONTHS = [2, 4, 6, 8, 10, 12]
const PATREON_KEY_LABEL = 'patreon-subscription'

let cachedGoogleToken: { value: string; expiresAtMs: number } | null = null
let cachedFirebaseJwks: { keys: FirebaseJwk[]; expiresAtMs: number } | null = null

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return emptyResponse(204)

    const url = new URL(request.url)

    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        return jsonResponse({ ok: true })
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
        await enforceRedeemRateLimit(request, env)
        const identity = await requireFirebaseIdentity(request, env)
        const input = await readJsonBody<{ key?: unknown }>(request)
        const rawKey = typeof input.key === 'string' ? input.key : ''
        const result = await redeemAccessKey(env, identity.uid, rawKey)
        return jsonResponse(result)
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
      await createRotationBatch(env, getRotationStartForSchedule(new Date(controller.scheduledTime)))
    } catch (error) {
      console.error('[Access] Rotation batch creation failed.', error)
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
      keyId: grant.keyId
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
    email: grantInput.email
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

  return {
    memberId: member.id,
    userId: String(getRelationshipId(member, 'user') || includedUser?.id || member.id),
    email,
    fullName,
    eventType,
    amountCents
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
  grantId: string
  keyId: string
  key: string
}> {
  const grantId = `member_${safeFirestoreId(input.memberId)}`
  const grantPath = `patreonAccessGrants/${grantId}`
  const existingGrant = await getFirestoreDocument(env, grantPath)
  if (existingGrant) {
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
    grantId,
    keyId: entry.id,
    key: entry.key
  }
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
    'Your one-time app activation key:',
    input.key,
    '',
    'This key can be activated once inside the app.',
    `You can download the full version here: ${downloadUrl}`,
    '',
    brandName
  ].join('\n')
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.55;color:#111827">
      <p>Hello ${escapeHtml(displayName)},</p>
      <p>Thank you for supporting <strong>${brandName}</strong> on Patreon.</p>
      <p>Your one-time app activation key:</p>
      <p style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:18px;letter-spacing:0.08em;font-weight:800;padding:14px 16px;border:1px solid #d1d5db;background:#f9fafb">
        ${escapeHtml(input.key)}
      </p>
      <p>This key can be activated once inside the app.</p>
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

  const transaction = await beginFirestoreTransaction(env)
  const keyPath = `accessKeys/${keyDocument.id}`
  const redemptionPath = `${keyPath}/redemptions/${userId}`
  const documents = await batchGetDocuments(env, transaction, [keyPath, redemptionPath])
  const latestKeyDocument = documents.get(keyPath)
  const existingRedemption = documents.get(redemptionPath)

  if (!latestKeyDocument) throw new AccessWorkerError('Invalid or inactive access key.', 400)
  const accessKey = decodeAccessKeyRecord(latestKeyDocument)

  if (existingRedemption) {
    await commitFirestoreTransaction(env, transaction, [
      createUserAccessStateWrite(env, userId, accessKey)
    ])
    return { activated: true, alreadyActivated: true, grant: accessKey.grant }
  }

  assertAccessKeyCanBeRedeemed(accessKey)

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
          grant: accessKey.grant
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
          grant: accessKey.grant
        })
      },
      updateTransforms: [{ fieldPath: 'redeemedAt', setToServerValue: 'REQUEST_TIME' }],
      currentDocument: { exists: false }
    },
    createUserAccessStateWrite(env, userId, accessKey)
  ]

  await commitFirestoreTransaction(env, transaction, writes)
  return { activated: true, alreadyActivated: false, grant: accessKey.grant }
}

function createUserAccessStateWrite(env: Env, userId: string, accessKey: AccessKeyRecord): FirestoreWrite {
  return {
    update: {
      name: firestoreDocumentName(env, `users/${userId}/access/state`),
      fields: encodeFields({
        isActivated: true,
        grant: accessKey.grant,
        activatedKeyId: accessKey.id
      })
    },
    updateTransforms: [{ fieldPath: 'activatedAt', setToServerValue: 'REQUEST_TIME' }]
  }
}

async function enforceRedeemRateLimit(request: Request, env: Env): Promise<void> {
  const outcome = await env.ACCESS_REDEEM_RATE_LIMIT.limit({
    key: getRedeemRateLimitKey(request)
  })
  if (!outcome.success) {
    throw new AccessWorkerError('Too many activation attempts. Please try again later.', 429)
  }
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
        expiresAt: input.expiresAt
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
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
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

function parseCreateKeysInput(input: Record<string, unknown>): CreateKeysInput {
  const count = Number(input.count)
  if (!Number.isInteger(count) || count < 1 || count > MAX_KEYS_PER_REQUEST) {
    throw new AccessWorkerError(`count must be an integer from 1 to ${MAX_KEYS_PER_REQUEST}.`, 400)
  }

  const rawMaxRedemptions = input.maxRedemptions
  const maxRedemptions = rawMaxRedemptions == null || rawMaxRedemptions === ''
    ? null
    : Number(rawMaxRedemptions)
  if (maxRedemptions !== null && (
    !Number.isInteger(maxRedemptions)
    || maxRedemptions < 1
    || maxRedemptions > MAX_KEY_REDEMPTIONS
  )) {
    throw new AccessWorkerError('maxRedemptions must be a positive integer.', 400)
  }

  const rawExpiresAt = input.expiresAt
  const expiresAt = rawExpiresAt == null || rawExpiresAt === ''
    ? null
    : new Date(String(rawExpiresAt))
  if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now())) {
    throw new AccessWorkerError('expiresAt must be a future ISO date.', 400)
  }

  const label = String(input.label || '').trim().slice(0, 120)
  return { count, maxRedemptions, expiresAt, label }
}

function decodeAccessKeyRecord(document: FirestoreDocument): AccessKeyRecord {
  const keyHash = String(document.data.keyHash || '')
  const status = String(document.data.status || '').toLowerCase()
  if (!keyHash || (status !== 'active' && status !== 'disabled')) {
    throw new AccessWorkerError('Invalid or inactive access key.', 400)
  }

  const maxRedemptions = document.data.maxRedemptions == null
    ? null
    : Number(document.data.maxRedemptions)
  return {
    id: document.id,
    keyHash,
    status,
    grant: String(document.data.grant || ACCESS_GRANT),
    redeemedCount: Math.max(0, Number(document.data.redeemedCount || 0)),
    maxRedemptions: Number.isInteger(maxRedemptions) && maxRedemptions! > 0 ? maxRedemptions : null,
    expiresAtMs: toMillis(document.data.expiresAt),
    updateTime: document.updateTime
  }
}

function assertAccessKeyCanBeRedeemed(key: AccessKeyRecord) {
  if (key.status !== 'active') throw new AccessWorkerError('Invalid or inactive access key.', 400)
  if (key.expiresAtMs && key.expiresAtMs <= Date.now()) {
    throw new AccessWorkerError('This access key has expired.', 400)
  }
  if (key.maxRedemptions !== null && key.redeemedCount >= key.maxRedemptions) {
    throw new AccessWorkerError('This access key has reached its activation limit.', 400)
  }
}

async function requireFirebaseIdentity(request: Request, env: Env): Promise<FirebaseIdentity> {
  const authorization = request.headers.get('Authorization') || ''
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (!token) throw new AccessWorkerError('Authentication is required.', 401)
  return verifyFirebaseIdToken(token, env.FIREBASE_PROJECT_ID)
}

async function requireAdminToken(request: Request, env: Env): Promise<void> {
  const token = request.headers.get('X-Access-Admin-Token') || ''
  if (!token || !constantTimeEqual(token, env.ACCESS_ADMIN_TOKEN)) {
    throw new AccessWorkerError('Admin authorization is required.', 401)
  }
}

async function verifyFirebaseIdToken(token: string, projectId: string): Promise<FirebaseIdentity> {
  const [encodedHeader, encodedPayload, encodedSignature, ...extra] = token.split('.')
  if (!encodedHeader || !encodedPayload || !encodedSignature || extra.length) {
    throw new AccessWorkerError('Invalid authentication token.', 401)
  }

  const header = decodeJwtPart<{ alg?: string; kid?: string }>(encodedHeader)
  const payload = decodeJwtPart<{ aud?: string; iss?: string; sub?: string; exp?: number; iat?: number }>(encodedPayload)
  if (header.alg !== 'RS256' || !header.kid || !payload.sub || payload.aud !== projectId) {
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

  return { uid: payload.sub }
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
    scope: FIRESTORE_SCOPE,
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
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Access-Admin-Token',
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
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Access-Admin-Token',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
  })
}
