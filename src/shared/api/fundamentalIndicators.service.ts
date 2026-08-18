import { loadFromDisk, saveToDisk } from '../diskStorage'
import indicatorData from '@/shared/assets/indicators.json'

export interface MatrixIndicatorDefinition {
  label: string
  type: string
  color?: string
  description?: string
  params?: Record<string, any>
}

export interface MatrixIndicatorCategory {
  id: string
  name: string
  indicators: MatrixIndicatorDefinition[]
  source?: string
}

interface FundamentalIndicatorCache {
  updatedAt: number
  source: string
  category: MatrixIndicatorCategory
}

const CACHE_FILE = 'fundamental_indicators_cache'
const OPTIONAL_API_URL = 'VITE_FUNDAMENTAL_INDICATORS_API_URL'
const FUNDAMENTAL_CATEGORY_ID = 'FUNDAMENTAL'

function sanitizeFundamentalIndicator(indicator: MatrixIndicatorDefinition): MatrixIndicatorDefinition {
  const params = { ...(indicator.params || {}) }
  delete params.source

  return {
    ...indicator,
    params: {
      ...params,
      fundamental: true,
      needsConfig: params.needsConfig ?? true
    }
  }
}

function withFundamentalSource(category: MatrixIndicatorCategory, source: string): MatrixIndicatorCategory {
  return {
    ...category,
    source,
    indicators: (category.indicators || []).map(sanitizeFundamentalIndicator)
  }
}

function fallbackFundamentalCategory(): MatrixIndicatorCategory {
  const category = (indicatorData.categories as MatrixIndicatorCategory[])
    .find(item => item.id === FUNDAMENTAL_CATEGORY_ID)

  return withFundamentalSource(category || {
    id: FUNDAMENTAL_CATEGORY_ID,
    name: 'Fundamental & Macro Indicators',
    indicators: []
  }, 'fallback')
}

function normalizeLabel(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase()
    .slice(0, 8)
}

function normalizeIndicator(raw: any): MatrixIndicatorDefinition | null {
  const label = normalizeLabel(raw?.label || raw?.symbol || raw?.code || raw?.id || raw?.name)
  if (!label) return null

  return {
    label,
    type: raw?.type || 'indicator',
    color: raw?.color || '#FFF',
    description: String(raw?.description || raw?.name || raw?.title || 'Fundamental indicator.'),
    params: {
      ...(raw?.params || {}),
      fundamental: true,
      needsConfig: raw?.params?.needsConfig ?? raw?.needsConfig ?? true
    }
  }
}

function normalizeCategory(payload: any, source: string): MatrixIndicatorCategory | null {
  const directCategory = Array.isArray(payload?.categories)
    ? payload.categories.find((item: any) => String(item?.id || '').toUpperCase() === FUNDAMENTAL_CATEGORY_ID)
    : null

  const rawIndicators = directCategory?.indicators || payload?.indicators || payload?.data || payload
  if (!Array.isArray(rawIndicators)) return null

  const indicators = rawIndicators
    .map(normalizeIndicator)
    .filter((item): item is MatrixIndicatorDefinition => !!item)

  if (!indicators.length) return null

  return {
    id: FUNDAMENTAL_CATEGORY_ID,
    name: directCategory?.name || payload?.name || 'Fundamental & Macro Indicators',
    source,
    indicators: dedupeIndicators(indicators).map(sanitizeFundamentalIndicator)
  }
}

function dedupeIndicators(indicators: MatrixIndicatorDefinition[]) {
  const byLabel = new Map<string, MatrixIndicatorDefinition>()
  indicators.forEach(indicator => {
    byLabel.set(indicator.label.toUpperCase(), indicator)
  })
  return Array.from(byLabel.values())
}

function getOptionalApiUrl() {
  const env = (import.meta as any).env || {}
  return String(env[OPTIONAL_API_URL] || '').trim()
}

export async function loadFundamentalIndicatorCategory() {
  const cached = await loadFromDisk<FundamentalIndicatorCache>(CACHE_FILE)
  return cached?.category
    ? withFundamentalSource(cached.category, cached.source || 'cache')
    : fallbackFundamentalCategory()
}

export async function syncFundamentalIndicatorCategory() {
  const apiUrl = getOptionalApiUrl()
  if (!apiUrl) {
    const category = fallbackFundamentalCategory()
    await saveToDisk(CACHE_FILE, {
      updatedAt: Date.now(),
      source: 'fallback',
      category
    } satisfies FundamentalIndicatorCache)
    return category
  }

  const response = await fetch(apiUrl)
  if (!response.ok) throw new Error(`Fundamental indicators API failed: ${response.status}`)

  const payload = await response.json()
  const category = normalizeCategory(payload, apiUrl)
  if (!category) throw new Error('Fundamental indicators API returned an unsupported payload.')

  await saveToDisk(CACHE_FILE, {
    updatedAt: Date.now(),
    source: apiUrl,
    category
  } satisfies FundamentalIndicatorCache)

  return category
}
