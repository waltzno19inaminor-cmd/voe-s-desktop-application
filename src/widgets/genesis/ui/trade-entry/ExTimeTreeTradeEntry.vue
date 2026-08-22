<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import ExTradeAnalysisPanel from '../analytics/ExTradeAnalysisPanel.vue'
import ExTacticalNodeMap from '../analytics/ExTacticalNodeMap.vue'
import ExTradeGeneratedChart from '../analytics/ExTradeGeneratedChart.vue'
import ExTradeNoteEditor from './ExTradeNoteEditor.vue'
import ExTradeNoteListItem from './ExTradeNoteListItem.vue'
import ExTradeImageEntry from './ExTradeImageEntry.vue'
import ExPatternForecastPanel from '../analytics/ExPatternForecastPanel.vue'
import { useStrategyTradesStore } from '~/features/store/useStrategyTrades'
import {
  getTradeDurationMs,
  getTradePnl,
  getTradeResultPercent,
  resolveTradeBalanceBefore,
  getTradeRiskReward
} from '~/widgets/genesis/model/metrics'

const props = defineProps<{
  isDark?: boolean
  trade?: Record<string, any> | null
  mode?: 'trade' | 'forecast'
  forecastTrades?: Record<string, any>[]
  forecastInitialCapital?: number
  forecastStrategyId?: string
  forecastStrategyName?: string
}>()

const { locale } = useI18n()
const tradeStore = useStrategyTradesStore()
const isForecastMode = computed(() => props.mode === 'forecast')
const isForecastLoading = ref(true)
const forecastTab = ref<'summary' | 'settings'>('summary')
const forecastIncludeAverageRR = ref(false)
const activeEntryFormTab = ref<'main' | 'advanced' | 'metrics' | 'notes' | 'images'>('main')
const activeProjectionMode = ref<'core' | 'mapping' | 'chart'>('core')
const isCreatingTradeNote = ref(false)
const tradeNoteDraft = ref('')
const isPersistingArchive = ref(false)
const expandedTradeNoteIds = ref<string[]>([])
const editingTradeNoteContentId = ref<string | null>(null)

const isMainDiaryTrade = computed(() => {
  const trade = props.trade
  return trade?.tradingStyle === 'Main Diary' || trade?.strategyId === 'MAIN_DIARY'
})

const analysisStrategyId = computed(() => String(
  props.forecastStrategyId ||
  props.trade?.strategyId ||
  'MAIN_DIARY'
))

const analysisInitialCapital = computed(() => {
  return props.forecastInitialCapital || tradeStore.getInitialDeposit(analysisStrategyId.value) || 1000
})

const analysisAllTrades = computed(() => {
  if (Array.isArray(props.forecastTrades) && props.forecastTrades.length > 0) return props.forecastTrades
  return tradeStore.getAllTradesForStrategy(analysisStrategyId.value)
})

const positiveOrNull = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const displayTrade = computed<Record<string, any>>(() => {
  const trade = (props.trade || {}) as Record<string, any>
  const entryValue = positiveOrNull(trade.entry)
  const stopLossValue = positiveOrNull(trade.stopLoss ?? trade.sl ?? trade.stop_loss)
  const takeProfitValue = positiveOrNull(trade.takeProfit ?? trade.tp ?? trade.take_profit)
  const hasValidRiskRewardLevels = entryValue !== null && stopLossValue !== null && takeProfitValue !== null

  return {
    ...trade,
    entry: entryValue ?? trade.entry,
    stopLoss: stopLossValue,
    takeProfit: takeProfitValue,
    rr: hasValidRiskRewardLevels ? trade.rr : null,
    riskReward: hasValidRiskRewardLevels ? trade.riskReward : null,
    realizedRr: hasValidRiskRewardLevels ? trade.realizedRr : null
  }
})

const analysisTrade = computed<Record<string, any>>(() => {
  const trade = displayTrade.value

  return {
    ...trade,
    id: trade.id || 'time-tree-trade',
    entryTime: trade.entryTime || trade.date || '',
    exitTime: trade.exitTime || trade.dateExit || '',
    pnl: getTradePnl(trade, analysisInitialCapital.value),
    scenarios: Array.isArray(trade.scenarios) ? trade.scenarios : [],
    emotions: Array.isArray(trade.emotions) ? trade.emotions : []
  }
})

const displayValue = (value: unknown) => value === null || value === undefined || value === '' ? '--' : String(value)

const formatPrice = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '--'
  const number = Number(value)
  return Number.isFinite(number) ? number.toLocaleString(locale.value === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 8 }) : String(value)
}

const formatOptionalPrice = (value: unknown) => {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return 'N/A'
  return formatPrice(value)
}

const normalizedExecutions = computed(() => (
  Array.isArray(props.trade?.executions)
    ? props.trade.executions.filter((execution: any) => execution && typeof execution === 'object')
    : []
))

const positionList = (type: 'entry' | 'exit') => normalizedExecutions.value
  .filter((execution: any) => String(execution.type || '').toLowerCase() === type)
  .map((execution: any, index: number) => ({
    ...execution,
    positionNumber: index + 1,
    price: Number(execution.price),
    size: Number(execution.size)
  }))
  .filter((execution: any) => Number.isFinite(execution.price) && execution.price > 0)

const entryPositions = computed(() => {
  const positions = positionList('entry')
  if (positions.length) return positions
  const fallbackPrice = Number(props.trade?.entry)
  return Number.isFinite(fallbackPrice) && fallbackPrice > 0
    ? [{ positionNumber: 1, price: fallbackPrice, size: Number(props.trade?.size) }]
    : []
})

const exitPositions = computed(() => {
  const positions = positionList('exit')
  if (positions.length) return positions
  const fallbackPrice = Number(props.trade?.exit)
  return Number.isFinite(fallbackPrice) && fallbackPrice > 0
    ? [{ positionNumber: 1, price: fallbackPrice, size: Number(props.trade?.size) }]
    : []
})

const isMultipleMethodType = (type: unknown) => {
  const str = String(type || '').trim().toUpperCase()
  return str !== '' && str !== 'SINGLE' && str !== 'NONE' && str !== 'UNDEFINED'
}

const hasEntryMethod = computed(() => entryPositions.value.length > 1 || isMultipleMethodType(props.trade?.entryMethodType))
const hasExitMethod = computed(() => exitPositions.value.length > 1 || isMultipleMethodType(props.trade?.exitMethodType))

const weightedAveragePrice = (positions: any[]) => {
  const weightedTotal = positions.reduce((total, position) => {
    const size = Number(position.size)
    return total + (position.price * (Number.isFinite(size) && size > 0 ? size : 1))
  }, 0)
  const totalSize = positions.reduce((total, position) => {
    const size = Number(position.size)
    return total + (Number.isFinite(size) && size > 0 ? size : 1)
  }, 0)
  return totalSize > 0 ? weightedTotal / totalSize : positions[0]?.price
}

const summaryEntryPrice = computed(() => hasEntryMethod.value
  ? weightedAveragePrice(entryPositions.value)
  : displayTrade.value.entry)

const summaryExitPrice = computed(() => hasExitMethod.value
  ? weightedAveragePrice(exitPositions.value)
  : displayTrade.value.exit)

const positionMethodLabel = (position: any, type: 'entry' | 'exit') => {
  const label = String(position.label || '').toUpperCase()
  if (label && label !== 'SINGLE' && label !== 'NONE' && label !== 'ENTRY_METHOD') return label.replace(/_/g, ' ')
  if (type === 'entry' && hasEntryMethod.value) {
    return entryMethodDisplayLabel(position)
  }
  return type === 'exit' && hasExitMethod.value ? (locale.value === 'ru' ? 'ВЫХОД' : 'EXIT') : 'SINGLE'
}

const entryMethodDisplayLabel = (position: any) => {
  const explicitLabel = String(position?.label || '').toUpperCase().replace(/\s+/g, '_')
  if (explicitLabel && explicitLabel !== 'SINGLE' && explicitLabel !== 'NONE' && explicitLabel !== 'ENTRY_METHOD' && explicitLabel !== 'ENTRY_METHOD_TYPE') {
    if (explicitLabel === 'AVERAGING' || explicitLabel === 'AVERAGING_DOWN') return locale.value === 'ru' ? 'УСРЕДНЕНИЕ' : 'AVERAGING'
    if (explicitLabel === 'PYRAMIDING') return locale.value === 'ru' ? 'ПИРАМИДИНГ' : 'PYRAMIDING'
    return explicitLabel.replace(/_/g, ' ')
  }

  if (position?.positionNumber === 1 || entryPositions.value[0] === position) {
    return locale.value === 'ru' ? 'ВХОД' : 'ENTRY'
  }

  const firstPrice = Number(entryPositions.value[0]?.price || 0)
  const currentPrice = Number(position?.price || 0)
  if (!Number.isFinite(firstPrice) || firstPrice <= 0 || !Number.isFinite(currentPrice) || currentPrice <= 0) {
    return locale.value === 'ru' ? 'ВХОД' : 'ENTRY'
  }

  let sideStr = String(props.trade?.side || props.trade?.direction || '').toUpperCase()
  if (!sideStr && entryPositions.value.length > 0) {
    sideStr = String(entryPositions.value[0]?.side || '').toUpperCase()
  }

  const isLong = sideStr === 'LONG' || sideStr === 'BUY' || sideStr === ''

  if (isLong) {
    return currentPrice > firstPrice
      ? (locale.value === 'ru' ? 'ПИРАМИДИНГ' : 'PYRAMIDING')
      : (locale.value === 'ru' ? 'УСРЕДНЕНИЕ' : 'AVERAGING')
  } else {
    return currentPrice < firstPrice
      ? (locale.value === 'ru' ? 'ПИРАМИДИНГ' : 'PYRAMIDING')
      : (locale.value === 'ru' ? 'УСРЕДНЕНИЕ' : 'AVERAGING')
  }
}

const formatDateValue = (value: unknown) => {
  if (!value) return '--'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return displayValue(value)
  return date.toLocaleString(locale.value === 'ru' ? 'ru-RU' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDuration = () => {
  if (props.trade?.tradeDuration) return String(props.trade.tradeDuration)
  const durationMs = getTradeDurationMs(props.trade)
  if (!Number.isFinite(durationMs)) return '--'
  const minutes = Math.round(durationMs / 60000)
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return locale.value === 'ru'
    ? `${hours ? `${hours} ч ` : ''}${remainder} мин`
    : `${hours ? `${hours}h ` : ''}${remainder}m`
}

const formatRiskReward = () => {
  const ratio = getTradeRiskReward(displayTrade.value)
  return Number.isFinite(ratio) ? ratio.toFixed(2) : 'N/A'
}

const formatRiskPerTrade = () => {
  const value = props.trade?.riskPerTrade ?? props.trade?.riskPerTradeValue ?? props.trade?.riskPercent
  if (value === undefined || value === null || value === '') return '--'
  return `${formatPrice(value)}${props.trade?.riskPerTradeUnit === '%' || props.trade?.riskPercent !== undefined ? '%' : ''}`
}

const formatTradeSize = () => {
  const sizeValue = props.trade?.size ?? displayTrade.value?.size
  if (sizeValue === undefined || sizeValue === null || sizeValue === '') return '--'
  return formatPrice(sizeValue)
}

const escapeTradeNoteHtml = (value: unknown) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

const renderTradeNote = (note: any) => {
  const content = String(note?.html || note?.content || '')
  return content.replace(/\[VISUAL_REF:(\d+)\]/gim, (match, indexValue) => {
    const index = Number.parseInt(indexValue, 10)
    const image = attachableTradeImages.value[index]
    if (!image?.url) return match

    const name = String(image.name || `Visual_Node_${index}`)
    return `<div class="trade-note-visual"><img src="${escapeTradeNoteHtml(image.url)}" alt="${escapeTradeNoteHtml(name)}"></div>`
  })
}

const tradeAsset = () => String(props.trade?.asset || props.trade?.symbol || props.trade?.ticker || '--').toUpperCase()
const tradeDirection = () => String(props.trade?.side || props.trade?.direction || '--').toUpperCase()
const tradeResultValue = () => {
  const trade = props.trade
  if (!trade) return null
  const initialCapital = props.forecastInitialCapital || tradeStore.getInitialDeposit(trade.strategyId || 'MAIN_DIARY')
  return getTradePnl(trade, initialCapital)
}
const tradeResultPercentValue = () => {
  const trade = props.trade
  if (!trade) return null
  const initialCapital = props.forecastInitialCapital || tradeStore.getInitialDeposit(trade.strategyId || 'MAIN_DIARY') || 1000
  const balanceBefore = resolveTradeBalanceBefore(trade, analysisAllTrades.value, initialCapital)
  return getTradeResultPercent(trade, balanceBefore, initialCapital)
}
const tradeResultClass = (rawValue: any) => {
  const value = Number(rawValue)
  if (!Number.isFinite(value) || value === 0) return 'text-white'
  return value > 0 ? 'text-emerald-400' : 'text-rose-400'
}
const formatTradeResultMoney = (value: any) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return '--'
  const sign = number > 0 ? '+' : number < 0 ? '-' : ''
  return `${sign}$${Math.abs(number).toFixed(2)}`
}
const formatTradeResultPercent = (value: any) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return '--'
  const sign = number > 0 ? '+' : number < 0 ? '-' : ''
  return `${sign}${Math.abs(number).toFixed(2)}%`
}
const tradeResultDisplay = () => `${formatTradeResultMoney(tradeResultValue())} / ${formatTradeResultPercent(tradeResultPercentValue())}`

const tradeNotes = computed(() => {
  const notesList = Array.isArray(props.trade?.notesList)
    ? props.trade.notesList.filter((note: any) => note?.content || note?.title)
    : []
  if (notesList.length > 0) return notesList

  const note = String(props.trade?.notes || '').trim()
  return note ? [{ id: 'legacy-trade-note', content: note, title: '' }] : []
})

const sortedTradeNotes = computed(() => [...tradeNotes.value].sort((a: any, b: any) => {
  const bTime = new Date(String(b.date || b.createdAt || '')).getTime()
  const aTime = new Date(String(a.date || a.createdAt || '')).getTime()
  return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0)
}))

const tradeImages = computed(() => {
  if (!Array.isArray(props.trade?.images)) return []
  return props.trade.images
    .map((image: any) => {
      const normalized = typeof image === 'string' ? { url: image } : { ...(image || {}) }
      return normalized.url ? normalized : { ...normalized, url: normalized.image || normalized.src || '' }
    })
    .filter((image: any) => image && (image.url || image.name || image.createdAt || image.timestamp || image.date))
})

const activeTradeImageIndex = ref<number | null>(null)
const activeTradeImage = computed(() => {
  if (activeTradeImageIndex.value === null) return null
  return tradeImages.value[activeTradeImageIndex.value] || null
})

const attachableTradeImages = computed(() => tradeImages.value.filter((image: any) => Boolean(image?.url)))

const canEditTradeArchive = computed(() => Boolean(props.trade?.strategyId && props.trade?.id))

const getCurrentTradeNotes = () => {
  if (Array.isArray(props.trade?.notesList)) return [...props.trade.notesList]
  const legacyNote = String(props.trade?.notes || '').trim()
  return legacyNote
    ? [{ id: 'legacy-trade-note', content: legacyNote, date: new Date().toISOString(), title: '' }]
    : []
}

const getCurrentTradeImages = () => {
  if (!Array.isArray(props.trade?.images)) return []
  return props.trade.images.map((image: any) => typeof image === 'string' ? { url: image } : { ...image })
}

const persistTradeArchiveUpdate = async (updates: Record<string, any>) => {
  if (!canEditTradeArchive.value || !props.trade?.strategyId || !props.trade?.id) return false

  isPersistingArchive.value = true
  try {
    await tradeStore.updateTrade(props.trade.strategyId, props.trade.id, updates)
    Object.entries(updates).forEach(([key, value]) => {
      if (props.trade) (props.trade as any)[key] = value
    })
    return true
  } finally {
    isPersistingArchive.value = false
  }
}

const saveTradeNote = async () => {
  const html = tradeNoteDraft.value.trim()
  const content = getTradeNotePlainText(html).trim()
  if (!content) return

  const notes = getCurrentTradeNotes()
  const nextNotes = editingTradeNoteContentId.value
    ? notes.map((note: any) => note.id === editingTradeNoteContentId.value
      ? { ...note, content, html }
      : note)
    : [
        ...notes,
        {
          id: `note_${Date.now()}`,
          content,
          html,
          date: new Date().toISOString(),
          title: `SESSION_LOG_${notes.length + 1}`
        }
      ]
  const saved = await persistTradeArchiveUpdate({
    notesList: nextNotes
  })

  if (saved) {
    tradeNoteDraft.value = ''
    isCreatingTradeNote.value = false
    editingTradeNoteContentId.value = null
  }
}

const cancelTradeNote = () => {
  tradeNoteDraft.value = ''
  isCreatingTradeNote.value = false
  editingTradeNoteContentId.value = null
}

const getTradeNotePlainText = (html: string) => String(html)
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>|<\/div>|<\/h[1-6]>|<\/blockquote>|<\/li>/gi, '\n')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\n{3,}/g, '\n\n')

const startTradeNoteCreation = () => {
  isCreatingTradeNote.value = true
  tradeNoteDraft.value = ''
  editingTradeNoteContentId.value = null
}

const toggleTradeNote = (id: string) => {
  const index = expandedTradeNoteIds.value.indexOf(id)
  if (index === -1) expandedTradeNoteIds.value.push(id)
  else expandedTradeNoteIds.value.splice(index, 1)
}

const startEditTradeNoteContent = (note: any) => {
  editingTradeNoteContentId.value = note.id
  tradeNoteDraft.value = note.html || note.content || ''
  isCreatingTradeNote.value = true
}

const updateTradeNoteTitle = async (payload: { id: string; title: string }) => {
  const notes = getCurrentTradeNotes()
  const nextNotes = notes.map((note: any) => note.id === payload.id
    ? { ...note, title: payload.title }
    : note)
  await persistTradeArchiveUpdate({ notesList: nextNotes })
}

const removeTradeNote = async (noteId: string) => {
  if (!canEditTradeArchive.value || isPersistingArchive.value) return
  const notes = getCurrentTradeNotes().filter((note: any) => note.id !== noteId)
  const saved = await persistTradeArchiveUpdate({ notesList: notes })
  if (!saved) return
  expandedTradeNoteIds.value = expandedTradeNoteIds.value.filter(id => id !== noteId)
  if (editingTradeNoteContentId.value === noteId) cancelTradeNote()
}

const addTradeImageSlot = async () => {
  if (!canEditTradeArchive.value) return
  const images = [
    ...getCurrentTradeImages(),
    { url: '', context: '', name: '', tags: [], tagInput: '', createdAt: new Date().toISOString() }
  ]
  if (props.trade) (props.trade as any).images = images
  await persistTradeArchiveUpdate({ images })
}

const handleTradeImageUpload = (index: number, event: Event) => {
  const file = (event.target as HTMLInputElement)?.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async () => {
    const images = getCurrentTradeImages()
    if (!images[index]) return
    images[index] = {
      ...images[index],
      url: String(reader.result || ''),
      createdAt: images[index].createdAt || new Date().toISOString()
    }
    await persistTradeArchiveUpdate({ images })
  }
  reader.readAsDataURL(file)
}

const updateTradeImageName = async (index: number, event: Event) => {
  const name = (event.target as HTMLInputElement)?.value || ''
  const images = getCurrentTradeImages()
  if (!images[index]) return
  images[index] = { ...images[index], name }
  if (props.trade) (props.trade as any).images = images
  await persistTradeArchiveUpdate({ images })
}

const openTradeImage = (index: number) => {
  if (!tradeImages.value[index]?.url) return
  activeTradeImageIndex.value = index
}

const closeTradeImage = () => {
  activeTradeImageIndex.value = null
}

const removeTradeImageTag = async (index: number, tag: string) => {
  const images = getCurrentTradeImages()
  if (!images[index]) return
  images[index] = {
    ...images[index],
    tags: (Array.isArray(images[index].tags) ? images[index].tags : []).filter((item: string) => item !== tag)
  }
  await persistTradeArchiveUpdate({ images })
}

const removeTradeImage = async (index: number) => {
  const images = getCurrentTradeImages()
  images.splice(index, 1)
  if (props.trade) (props.trade as any).images = images
  if (activeTradeImageIndex.value === index) closeTradeImage()
  else if (activeTradeImageIndex.value !== null && activeTradeImageIndex.value > index) activeTradeImageIndex.value -= 1
  await persistTradeArchiveUpdate({ images })
}

const tradeEntryThemeStyle = computed(() => props.isDark
  ? {
      '--theme-bg': '#000000',
      '--theme-bg-rgb': '0 0 0',
      '--theme-panel': 'rgba(5, 5, 5, 0.92)',
      '--theme-text': '#F9F6F0',
      '--theme-text-rgb': '249 246 240',
      '--theme-border': 'rgba(249, 246, 240, 0.12)',
      backgroundColor: '#000000'
    }
  : {
      backgroundColor: 'var(--theme-bg)'
    })
</script>

<template>
  <div
    class="trade-entry-shell flex h-full w-full flex-col items-center overflow-hidden transition-colors duration-500 nier-text-primary"
    :class="[ 'bg-theme-bg', props.isDark ? 'dark is-dark theme-dark' : 'theme-light' ]"
    :style="tradeEntryThemeStyle"
  >
    <div class="w-full flex justify-center">
      <div class="w-full min-w-0 max-w-none pt-8 pb-12">
        <div class="flex flex-col space-y-12">
          <div class="contents">
            <div class="flex min-h-[calc(100dvh-4rem)] items-center justify-center">
      <div class="relative z-10 mx-auto flex h-[clamp(600px,69.6vh,768px)] w-full max-w-[1560px] flex-col items-center justify-center border-transparent bg-transparent group">
        <div
          v-if="!isForecastMode"
          class="absolute -top-12 left-1/2 z-20 flex -translate-x-1/2 items-center border border-black/10 bg-theme-bg shadow-[0_12px_30px_rgba(0,0,0,0.08)] dark:border-white/10"
        >
          <button
            type="button"
            :aria-label="locale === 'ru' ? 'Основные данные сделки' : 'Trade details'"
            class="grid h-11 w-12 place-items-center border-r border-black/10 transition-colors dark:border-white/10"
            :class="activeProjectionMode === 'core' ? 'nier-bg-inverted nier-text-primary' : 'nier-text-primary opacity-45 hover:opacity-100'"
            @click="activeProjectionMode = 'core'"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4" y="4" width="16" height="16" rx="1" stroke="currentColor" stroke-width="1.7" />
              <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" />
            </svg>
          </button>
                  <button
                    type="button"
                    :aria-label="locale === 'ru' ? 'Второй режим' : 'Second mode'"
                    class="grid h-11 w-12 place-items-center border-r border-black/10 transition-colors dark:border-white/10"
                    :class="activeProjectionMode === 'mapping' ? 'nier-bg-inverted nier-text-primary' : 'nier-text-primary opacity-45 hover:opacity-100'"
                    @click="activeProjectionMode = 'mapping'"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M7 6l10 6-10 6M7 6v12" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter" />
                      <circle cx="7" cy="6" r="2" stroke="currentColor" stroke-width="1.6" />
                      <circle cx="17" cy="12" r="2" stroke="currentColor" stroke-width="1.6" />
                      <circle cx="7" cy="18" r="2" stroke="currentColor" stroke-width="1.6" />
                    </svg>
                  </button>
          <button
            type="button"
            :aria-label="locale === 'ru' ? 'График' : 'Chart'"
            class="grid h-11 w-12 place-items-center transition-colors"
            :class="activeProjectionMode === 'chart' ? 'nier-bg-inverted nier-text-primary' : 'nier-text-primary opacity-45 hover:opacity-100'"
            @click="activeProjectionMode = 'chart'"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 4v16M17 4v16" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" />
              <path d="M5 8h4v7H5zM15 6h4v10h-4z" fill="currentColor" />
            </svg>
          </button>
        </div>

        <ExTacticalNodeMap
          v-if="activeProjectionMode === 'mapping' && !isMainDiaryTrade"
          :is-open="true"
          :is-dark="Boolean(props.isDark)"
          :trade="analysisTrade"
          embedded
          @close="activeProjectionMode = 'core'"
        />

        <div
          v-else-if="activeProjectionMode === 'mapping'"
          class="absolute inset-0 flex items-center justify-center px-10 text-center"
        >
          <p class="max-w-2xl text-sm font-mono uppercase leading-relaxed tracking-[0.16em] text-white/60">
            {{ locale === 'ru' ? 'Для Main Diary данные Node Mapping недоступны.' : 'Node Mapping data is unavailable for Main Diary.' }}
          </p>
        </div>

        <div
          v-if="activeProjectionMode === 'chart'"
          class="absolute inset-0 h-full w-full p-10"
        >
          <div class="flex h-full w-full flex-col px-6 sm:px-10 md:px-12 xl:px-16 2xl:px-20">
            <h2 class="shrink-0 text-2xl font-mono font-black uppercase tracking-[0.22em] text-white md:text-3xl">
              {{ locale === 'ru' ? 'РЫНОЧНЫЙ ГРАФИК' : 'MARKET CHART' }}
            </h2>
            <div class="relative mt-16 min-h-0 flex-1">
              <ExTradeGeneratedChart
                :trade="props.trade || undefined"
                :is-dark="Boolean(props.isDark)"
                :visible="true"
              />
            </div>
          </div>
        </div>

        <div v-if="isForecastMode" class="absolute inset-0 flex flex-col overflow-hidden text-left text-white">
          <div class="h-full min-h-0 w-full flex flex-col overflow-hidden">
            <div class="shrink-0 px-10 pt-10">
              <div class="w-full px-6 sm:px-10 md:px-12 xl:px-16 2xl:px-20">
                <div class="z-20 w-full shrink-0 border-b border-white/10 bg-black/60 pb-3 pt-1 backdrop-blur-md">
                  <div class="flex w-full items-center justify-between gap-4">
                    <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="inline-flex items-center gap-2 border px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors"
                      :class="forecastTab === 'summary' ? 'border-white bg-white text-black' : 'border-white/15 text-white/45 hover:border-white/40 hover:text-white'"
                      @click="forecastTab = 'summary'"
                    >
                      {{ locale === 'ru' ? 'ОСНОВНЫЕ' : 'MAIN' }}
                    </button>
                    <button
                      type="button"
                      class="inline-flex items-center gap-2 border px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors"
                      :class="forecastTab === 'settings' ? 'border-white bg-white text-black' : 'border-white/15 text-white/45 hover:border-white/40 hover:text-white'"
                      @click="forecastTab = 'settings'"
                    >
                      {{ locale === 'ru' ? 'НАСТРОЙКИ' : 'SETTINGS' }}
                    </button>
                    </div>
                    <label class="flex cursor-pointer items-center gap-2 select-none text-white/60">
                      <input v-model="forecastIncludeAverageRR" type="checkbox" class="peer sr-only" />
                      <span
                        class="flex h-5 w-5 items-center justify-center border border-white/25 bg-black/40 transition-colors"
                        :class="forecastIncludeAverageRR ? 'bg-white text-black' : 'text-transparent'"
                      >
                        <svg viewBox="0 0 12 12" class="h-3 w-3" fill="none" aria-hidden="true">
                          <path d="M2.2 6.2L4.7 8.7L9.8 3.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                      </span>
                      <span class="font-mono text-[8px] font-black uppercase tracking-[0.22em]">
                        {{ locale === 'ru' ? 'Учитывать Avg RR' : 'Include Avg RR' }}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div class="min-h-0 flex-1 w-full overflow-y-auto overflow-x-hidden custom-scrollbar">
              <div class="h-full min-h-full px-10 pb-10 pt-10">
                <div class="relative h-full w-full px-6 sm:px-10 md:px-12 xl:px-16 2xl:px-20">
                  <div v-if="isForecastLoading" class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 text-center">
                    <span class="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" aria-hidden="true"></span>
                    <span class="max-w-md font-mono text-[10px] font-black uppercase leading-relaxed tracking-[0.25em] text-white/55">
                      {{ locale === 'ru' ? 'ИДЁТ АНАЛИЗ. ЭТО МОЖЕТ ЗАНЯТЬ НЕМНОГО ВРЕМЕНИ.' : 'ANALYSIS IN PROGRESS. THIS MAY TAKE A LITTLE TIME.' }}
                    </span>
                  </div>
                  <ExPatternForecastPanel
                    v-show="!isForecastLoading"
                    class="h-full w-full"
                    :visible="true"
                    :trades="(props.forecastTrades as any[]) || []"
                    :initial-capital="Number(props.forecastInitialCapital) || 1000"
                    :strategy-id="props.forecastStrategyId || 'MAIN_DIARY'"
                    :strategy-name="props.forecastStrategyName || 'MAIN DIARY'"
                    compact-navigation
                    :active-tab="forecastTab"
                    :include-average-rr="forecastIncludeAverageRR"
                    @update:active-tab="forecastTab = $event"
                    @update:include-average-rr="forecastIncludeAverageRR = $event"
                    @loading-change="isForecastLoading = $event"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeProjectionMode === 'core'" class="absolute inset-0 flex flex-col overflow-hidden text-left text-white">
          <div class="h-full min-h-0 w-full flex flex-col overflow-hidden">
            <div class="shrink-0 px-10 pt-10">
              <div class="w-full px-6 sm:px-10 md:px-12 xl:px-16 2xl:px-20">
                <div class="z-20 w-full shrink-0 border-b border-white/10 bg-black/60 pb-3 pt-1 backdrop-blur-md">
                  <div class="flex w-full items-center justify-between gap-4">
                    <div class="flex min-w-0 flex-1 items-center justify-start gap-2">
                <button
                  type="button"
                  class="inline-flex items-center gap-2 border px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors"
                  :class="activeEntryFormTab === 'main' ? 'border-white bg-white text-black' : 'border-white/15 text-white/45 hover:border-white/40 hover:text-white'"
                  @click="activeEntryFormTab = 'main'"
                >
                  {{ locale === 'ru' ? 'ОСНОВНЫЕ' : 'MAIN' }}
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 border px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors"
                  :class="activeEntryFormTab === 'advanced' ? 'border-white bg-white text-black' : 'border-white/15 text-white/45 hover:border-white/40 hover:text-white'"
                  @click="activeEntryFormTab = 'advanced'"
                >
                  {{ locale === 'ru' ? 'ПРОДВИНУТЫЕ' : 'ADVANCED' }}
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 border px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors"
                  :class="activeEntryFormTab === 'metrics' ? 'border-white bg-white text-black' : 'border-white/15 text-white/45 hover:border-white/40 hover:text-white'"
                  @click="activeEntryFormTab = 'metrics'"
                >
                  {{ locale === 'ru' ? 'МЕТРИКИ' : 'METRICS' }}
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 border px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors"
                  :class="activeEntryFormTab === 'notes' ? 'border-white bg-white text-black' : 'border-white/15 text-white/45 hover:border-white/40 hover:text-white'"
                  @click="activeEntryFormTab = 'notes'"
                >
                  {{ locale === 'ru' ? 'ЗАМЕТКИ' : 'NOTES' }}
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 border px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors"
                  :class="activeEntryFormTab === 'images' ? 'border-white bg-white text-black' : 'border-white/15 text-white/45 hover:border-white/40 hover:text-white'"
                  @click="activeEntryFormTab = 'images'"
                >
                  {{ locale === 'ru' ? 'ИЗОБРАЖЕНИЯ' : 'IMAGES' }}
                </button>
                    </div>
                    <button
                      v-if="activeEntryFormTab === 'notes' || activeEntryFormTab === 'images'"
                      type="button"
                      :disabled="activeEntryFormTab === 'images' && activeTradeImageIndex !== null ? false : !canEditTradeArchive || (activeEntryFormTab === 'notes' && isPersistingArchive)"
                      :class="activeEntryFormTab === 'images' && activeTradeImageIndex !== null ? 'border-white bg-white text-black' : 'border-white/20 hover:bg-white hover:text-black'"
                      class="group grid h-7 w-7 shrink-0 place-items-center border transition-colors disabled:cursor-default disabled:opacity-30"
                      :aria-label="activeEntryFormTab === 'notes'
                        ? (locale === 'ru' ? 'Добавить заметку' : 'Add note')
                        : activeTradeImageIndex !== null
                          ? (locale === 'ru' ? 'Скрыть просмотр изображения' : 'Hide image preview')
                          : (locale === 'ru' ? 'Добавить изображение' : 'Add image')"
                      :title="activeEntryFormTab === 'notes'
                        ? (locale === 'ru' ? 'Добавить заметку' : 'Add note')
                        : activeTradeImageIndex !== null
                          ? (locale === 'ru' ? 'Скрыть просмотр изображения' : 'Hide image preview')
                          : (locale === 'ru' ? 'Добавить изображение' : 'Add image')"
                      @click="activeEntryFormTab === 'notes'
                        ? startTradeNoteCreation()
                        : activeTradeImageIndex !== null
                          ? closeTradeImage()
                          : addTradeImageSlot()"
                    >
                      <svg v-if="activeEntryFormTab === 'images' && activeTradeImageIndex !== null" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" stroke-width="1.8" />
                        <path d="m4 4 16 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" />
                      </svg>
                      <svg v-else class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="min-h-0 flex-1 w-full overflow-y-auto overflow-x-hidden custom-scrollbar [scrollbar-gutter:stable]">
              <div class="px-10 pb-10 pt-10">
                <div class="w-full px-6 sm:px-10 md:px-12 xl:px-16 2xl:px-20">
                  <div class="flex w-full flex-col items-start gap-14">

              <section v-if="activeEntryFormTab === 'main'" class="flex w-full flex-col items-start gap-8">
                <div class="text-[10px] font-mono font-black uppercase tracking-[0.6em] text-white/45">I.</div>
                <h2 class="text-2xl font-mono font-black uppercase tracking-[0.22em] text-white md:text-3xl">
                  {{ locale === 'ru' ? 'РЕЗЮМЕ' : 'SUMMARY' }}
                </h2>

                <div class="grid w-full grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
                  <div class="min-w-0 pr-6">
                    <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'АКТИВ' : 'ASSET' }}</span>
                    <div class="mt-2 flex items-center text-xl font-mono font-black uppercase tracking-[0.16em] text-white">
                      <span class="break-words whitespace-normal">{{ tradeAsset() }}</span>
                    </div>
                  </div>
                  <div class="min-w-0 pr-6">
                    <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'РЕЗУЛЬТАТ' : 'RESULT' }}</span>
                    <span class="mt-2 block break-words whitespace-normal text-xl font-mono font-black tracking-[0.12em]" :class="tradeResultClass(tradeResultValue())">
                      {{ tradeResultDisplay() }}
                    </span>
                  </div>
                  <div class="min-w-0 pr-6">
                    <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'НАПРАВЛЕНИЕ' : 'DIRECTION' }}</span>
                    <span
                      class="mt-2 block text-xl font-mono font-black uppercase tracking-[0.16em]"
                      :class="tradeDirection() === 'SHORT' || tradeDirection() === 'SELL' ? 'text-rose-400' : 'text-emerald-400'"
                    >
                      {{ tradeDirection() }}
                    </span>
                  </div>

                  <div class="min-w-0 pr-6">
                    <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'ТОЧКА ВХОДА' : 'ENTRY PRICE' }}</span>
                    <span class="mt-2 block break-words whitespace-normal text-xl font-mono font-black tracking-[0.12em] text-white">{{ formatPrice(summaryEntryPrice) }}</span>
                  </div>
                  <div class="min-w-0 pr-6">
                    <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'ТОЧКА ВЫХОДА' : 'EXIT PRICE' }}</span>
                    <span class="mt-2 block break-words whitespace-normal text-xl font-mono font-black tracking-[0.12em] text-white">{{ formatPrice(summaryExitPrice) }}</span>
                  </div>
                  <div class="min-w-0 pr-6">
                    <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'РАЗМЕР ПОЗИЦИИ' : 'SIZE' }}</span>
                    <span class="mt-2 block break-words whitespace-normal text-xl font-mono font-black tracking-[0.12em] text-white">{{ formatTradeSize() }}</span>
                  </div>
                  <div class="min-w-0 pr-6">
                    <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'ВРЕМЯ ВХОДА' : 'ENTRY TIME' }}</span>
                    <span class="mt-2 block break-words whitespace-normal text-xl font-mono font-black tracking-[0.12em] text-white">{{ formatDateValue(displayTrade?.date) }}</span>
                  </div>
                  <div class="min-w-0 pr-6">
                    <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'ВРЕМЯ ВЫХОДА' : 'EXIT TIME' }}</span>
                    <span class="mt-2 block break-words whitespace-normal text-xl font-mono font-black tracking-[0.12em] text-white">{{ formatDateValue(displayTrade?.dateExit) }}</span>
                  </div>
                  <div class="min-w-0 pr-6">
                    <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'ДЛИТЕЛЬНОСТЬ' : 'DURATION' }}</span>
                    <span class="mt-2 block break-words whitespace-normal text-xl font-mono font-black tracking-[0.12em] text-white">{{ formatDuration() }}</span>
                  </div>
                  <div class="min-w-0 pr-6">
                    <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'СТОП-ЛОСС' : 'STOP LOSS' }}</span>
                    <span class="mt-2 block break-words whitespace-normal text-xl font-mono font-black tracking-[0.12em] text-white">{{ formatOptionalPrice(displayTrade?.stopLoss) }}</span>
                  </div>
                  <div class="min-w-0 pr-6">
                    <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'ТЕЙК-ПРОФИТ' : 'TAKE PROFIT' }}</span>
                    <span class="mt-2 block break-words whitespace-normal text-xl font-mono font-black tracking-[0.12em] text-white">{{ formatOptionalPrice(displayTrade?.takeProfit) }}</span>
                  </div>
                  <div class="min-w-0 pr-6">
                    <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'РИСК / НАГРАДА' : 'RISK / REWARD' }}</span>
                    <span class="mt-2 block break-words whitespace-normal text-xl font-mono font-black tracking-[0.12em] text-white">{{ formatRiskReward() }}</span>
                  </div>
                </div>

                <div v-if="hasEntryMethod || hasExitMethod" class="grid w-full grid-cols-1 gap-6 border-t border-white/10 pt-8 lg:grid-cols-2">
                  <section v-if="hasEntryMethod" class="min-w-0 border border-white/10 p-5">
                    <div class="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/60">{{ locale === 'ru' ? 'ПОЗИЦИИ ВХОДА' : 'ENTRY POSITIONS' }}</span>
                      </div>
                    </div>
                    <div class="flex flex-col divide-y divide-white/10">
                      <div v-for="position in entryPositions" :key="`entry-position-${position.positionNumber}-${position.id || position.date || position.price}`" class="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-3 first:pt-0 last:pb-0">
                        <span class="font-mono text-[9px] text-white/35">{{ String(position.positionNumber).padStart(2, '0') }}</span>
                        <div class="min-w-0">
                          <div class="truncate font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">{{ entryMethodDisplayLabel(position) }}</div>
                          <div class="mt-1 font-mono text-sm font-black tracking-[0.12em] text-white">${{ formatPrice(position.price) }}</div>
                        </div>
                        <span class="font-mono text-sm font-black tracking-[0.12em] text-white">{{ Number.isFinite(position.size) && position.size > 0 ? position.size : '--' }}</span>
                      </div>
                    </div>
                  </section>

                  <section v-if="hasExitMethod" class="min-w-0 border border-white/10 p-5">
                    <div class="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/60">{{ locale === 'ru' ? 'ПОЗИЦИИ ВЫХОДА' : 'EXIT POSITIONS' }}</span>
                      </div>
                    </div>
                    <div v-if="exitPositions.length" class="flex flex-col divide-y divide-white/10">
                      <div v-for="position in exitPositions" :key="`exit-position-${position.positionNumber}-${position.id || position.date || position.price}`" class="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-3 first:pt-0 last:pb-0">
                        <span class="font-mono text-[9px] text-white/35">{{ String(position.positionNumber).padStart(2, '0') }}</span>
                        <div class="min-w-0">
                          <div class="truncate font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">{{ positionMethodLabel(position, 'exit') }}</div>
                          <div class="mt-1 font-mono text-sm font-black tracking-[0.12em] text-white">${{ formatPrice(position.price) }}</div>
                        </div>
                        <span class="font-mono text-sm font-black tracking-[0.12em] text-white">{{ Number.isFinite(position.size) && position.size > 0 ? position.size : '--' }}</span>
                      </div>
                    </div>
                  </section>
                </div>
              </section>

              <section v-else-if="activeEntryFormTab === 'advanced'" class="flex w-full flex-col items-start gap-8">
                <div class="text-[10px] font-mono font-black uppercase tracking-[0.6em] text-white/45">II.</div>
                <h2 class="text-2xl font-mono font-black uppercase tracking-[0.22em] text-white md:text-3xl">
                  {{ locale === 'ru' ? 'ПРОДВИНУТЫЕ МЕТРИКИ' : 'ADVANCED METRICS' }}
                </h2>

                <p v-if="isMainDiaryTrade" class="max-w-2xl text-sm font-mono uppercase leading-relaxed tracking-[0.16em] text-white/60">
                  {{ locale === 'ru' ? 'Для Main Diary продвинутый анализ недоступен.' : 'Advanced analysis is unavailable for Main Diary.' }}
                </p>

                <ExTradeAnalysisPanel
                  v-else
                  class="w-full min-h-[620px]"
                  :trade="analysisTrade"
                  :all-trades="analysisAllTrades"
                  :initial-balance="analysisInitialCapital"
                  :initial-page="3"
                  embedded
                  :embedded-brief="true"
                />
              </section>

              <section v-else-if="activeEntryFormTab === 'metrics'" class="flex w-full flex-col items-start gap-8">
                <div class="text-[10px] font-mono font-black uppercase tracking-[0.6em] text-white/45">III.</div>
                <h2 class="text-2xl font-mono font-black uppercase tracking-[0.22em] text-white md:text-3xl">
                  {{ locale === 'ru' ? 'МЕТРИКИ' : 'METRICS' }}
                </h2>

                <ExTradeAnalysisPanel
                  v-if="!isMainDiaryTrade"
                  class="w-full min-h-[620px]"
                  :trade="analysisTrade"
                  :all-trades="analysisAllTrades"
                  :initial-balance="analysisInitialCapital"
                  :initial-page="3"
                  embedded
                  embedded-brief
                  metrics-only
                />
                <p v-else class="max-w-2xl text-sm font-mono uppercase leading-relaxed tracking-[0.16em] text-white/60">
                  {{ locale === 'ru' ? 'Для Main Diary метрики недоступны.' : 'Metrics are unavailable for Main Diary.' }}
                </p>
              </section>

              <section v-else-if="activeEntryFormTab === 'notes'" class="flex w-full flex-col items-start gap-8">
                <ExTradeNoteEditor
                  v-if="isCreatingTradeNote"
                  v-model="tradeNoteDraft"
                  :is-persisting="isPersistingArchive"
                  :images="attachableTradeImages"
                  @save="saveTradeNote"
                  @cancel="cancelTradeNote"
                />

                <div v-if="sortedTradeNotes.length" class="flex w-full flex-col gap-6">
                  <template v-for="(note, index) in sortedTradeNotes" :key="note.id || `trade-note-${index}`">
                    <ExTradeNoteListItem
                      v-if="editingTradeNoteContentId !== note.id"
                      :note="note"
                      :expanded="expandedTradeNoteIds.includes(note.id)"
                      :can-edit="canEditTradeArchive"
                      :is-persisting="isPersistingArchive"
                      :render-content="renderTradeNote"
                      @toggle="toggleTradeNote"
                      @edit-content="startEditTradeNoteContent"
                      @update-title="updateTradeNoteTitle"
                      @remove="removeTradeNote"
                    />
                  </template>
                </div>
                <div v-else-if="!isCreatingTradeNote" class="flex w-full flex-col items-center justify-center py-32 opacity-30">
                  <div class="mb-6 h-px w-12 bg-white animate-pulse"></div>
                  <span class="text-[9px] font-mono uppercase tracking-[0.6em] text-white">
                    {{ locale === 'ru' ? 'НЕТ ЗАМЕТОК' : 'NO NOTES' }}
                  </span>
                </div>
              </section>

              <section v-else-if="activeEntryFormTab === 'images'" class="flex w-full flex-col items-start gap-8">
                <div v-if="activeTradeImage?.url" class="flex min-h-[620px] w-full items-center justify-center overflow-hidden bg-black/5 p-6 dark:bg-white/5">
                  <img
                    :src="activeTradeImage.url"
                    :alt="activeTradeImage.name || 'Trade image'"
                    class="max-h-[calc(100vh-16rem)] w-full object-contain"
                  />
                </div>
                <div v-else-if="tradeImages.length" class="grid w-full grid-cols-2 items-start gap-6 md:grid-cols-3">
                  <ExTradeImageEntry
                    v-for="(image, index) in tradeImages"
                    :key="image.url || image.createdAt || `trade-image-${index}`"
                    :image="image"
                    :index="index"
                    :can-edit="canEditTradeArchive"
                    :is-persisting="isPersistingArchive"
                    @upload="handleTradeImageUpload"
                    @remove="removeTradeImage"
                    @name-change="updateTradeImageName"
                    @remove-tag="removeTradeImageTag"
                    @view="openTradeImage"
                  />
                </div>
                <div v-else class="flex w-full flex-col items-center justify-center py-32 opacity-30">
                  <div class="mb-6 h-px w-12 bg-white animate-pulse"></div>
                  <span class="text-[9px] font-mono uppercase tracking-[0.6em] text-white">
                    {{ locale === 'ru' ? 'НЕТ ИЗОБРАЖЕНИЙ' : 'NO IMAGES' }}
                  </span>
                </div>
              </section>

              <section v-else class="min-h-[420px] w-full" :aria-label="activeEntryFormTab"></section>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>

</template>

<style scoped>
.trade-entry-shell {
  --theme-bg: #f5f3ee;
}

.trade-entry-shell.theme-dark {
  --theme-bg: #000000;
}

.trade-entry-shell.theme-light [class~="text-white"] {
  color: #111111 !important;
}

.trade-entry-shell.theme-light [class*="text-white/"] {
  color: rgb(17 17 17 / 0.58) !important;
}

.trade-entry-shell.theme-light [class*="border-white"] {
  border-color: rgb(17 17 17 / 0.18) !important;
}

.trade-entry-shell :deep(image[href*="gothic_corners"]) {
  display: none !important;
}

.trade-entry-shell :deep([class*="overflow-visible"][class*="z-50"]) {
  display: none !important;
}

.trade-note-rich {
  line-height: 1.5;
  text-transform: none;
  user-select: text;
  cursor: text;
  white-space: normal;
}

.trade-note-rich:empty::before {
  content: attr(data-placeholder);
  opacity: 0.25;
}

.trade-note-rich :deep(h1) {
  margin: 0.4em 0 0.7em;
  font-size: 1.8em;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: 0.08em;
}

.trade-note-rich :deep(h2) {
  margin: 0.35em 0 0.6em;
  border-bottom: 1px solid rgb(255 255 255 / 0.2);
  padding-bottom: 0.25em;
  font-size: 1.45em;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 0.08em;
}

.trade-note-rich :deep(h3) {
  margin: 0.3em 0 0.5em;
  font-size: 1.15em;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: 0.06em;
}

.trade-note-rich :deep(p) {
  margin: 0 0 0.55em;
}

.trade-note-rich :deep(blockquote) {
  margin: 0.45em 0;
  border-left: 2px solid currentColor;
  padding-left: 0.8em;
  opacity: 0.78;
}

.trade-note-rich :deep(ul),
.trade-note-rich :deep(ol) {
  margin: 0.35em 0;
  padding-left: 1.5em;
}

.trade-note-rich :deep(ul) {
  list-style-type: disc;
}

.trade-note-rich :deep(ol) {
  list-style-type: decimal;
}

.trade-note-rich :deep(li) {
  margin: 0.18em 0;
}

.trade-note-rich :deep(.trade-note-visual) {
  position: relative;
  margin: 1rem 0;
  border: 1px solid rgb(255 255 255 / 0.12);
  background: rgb(255 255 255 / 0.04);
  padding: 0.5rem;
}

.trade-note-rich :deep(.trade-note-visual img) {
  display: block;
  width: 100%;
  max-height: 400px;
  object-fit: contain;
}

.trade-note-rich :deep(.trade-note-visual > div) {
  display: none;
}

</style>
