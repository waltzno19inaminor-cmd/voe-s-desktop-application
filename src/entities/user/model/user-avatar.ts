const AVATAR_CACHE_NAME = 'exgenesis-user-avatars-v1'
const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const inFlightRequests = new Map<string, Promise<string | null>>()
const objectUrls = new Map<string, string>()

export async function getCachedAvatarUrl(source: unknown): Promise<string | null> {
  const sourceUrl = String(source || '').trim()
  if (!isGoogleAvatarUrl(sourceUrl)) return null

  const existingObjectUrl = objectUrls.get(sourceUrl)
  if (existingObjectUrl) return existingObjectUrl

  const existingRequest = inFlightRequests.get(sourceUrl)
  if (existingRequest) return existingRequest

  const request = loadCachedAvatar(sourceUrl).finally(() => inFlightRequests.delete(sourceUrl))
  inFlightRequests.set(sourceUrl, request)
  return request
}

async function loadCachedAvatar(sourceUrl: string): Promise<string | null> {
  if (typeof caches === 'undefined') return null

  const cache = await caches.open(AVATAR_CACHE_NAME)
  let response = await cache.match(sourceUrl)
  if (!response) {
    response = await fetchGoogleAvatar(sourceUrl)
    const contentLength = Number(response.headers.get('content-length') || 0)
    if (Number.isFinite(contentLength) && contentLength > MAX_AVATAR_BYTES) {
      throw new Error('Google avatar exceeds the 2 MB local cache limit.')
    }
    await cache.put(sourceUrl, response.clone())
  }

  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() || ''
  if (!contentType.startsWith('image/')) throw new Error('Google avatar response is not an image.')

  const image = await response.blob()
  if (!image.size || image.size > MAX_AVATAR_BYTES) {
    throw new Error('Google avatar exceeds the 2 MB local cache limit.')
  }

  const objectUrl = URL.createObjectURL(image)
  objectUrls.set(sourceUrl, objectUrl)
  return objectUrl
}

async function fetchGoogleAvatar(url: string): Promise<Response> {
  let lastStatus = 0
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, { cache: 'force-cache' })
    if (response.ok) return response
    lastStatus = response.status
    if (response.status !== 429 || attempt === 2) break
    await new Promise<void>((resolve) => setTimeout(resolve, 800 * (attempt + 1)))
  }
  throw new Error(`Google avatar download failed with HTTP ${lastStatus || 'unknown'}.`)
}

function isGoogleAvatarUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (
      url.hostname === 'lh3.googleusercontent.com'
      || url.hostname.endsWith('.googleusercontent.com')
    )
  } catch {
    return false
  }
}
