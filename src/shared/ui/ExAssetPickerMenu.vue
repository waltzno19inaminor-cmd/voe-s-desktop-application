<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import allAssets from '~/shared/data/global_assets.json'

type AssetOption = {
  symbol: string
  name?: string
  description?: string
  type?: string
  icon?: string
}

const props = withDefaults(defineProps<{
  open: boolean
  placeholder?: string
  noResultsLabel?: string
}>(), {
  placeholder: '',
  noResultsLabel: ''
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [asset: AssetOption]
}>()

const { locale } = useI18n()
const assetSearch = ref('')
const assetTypeFilter = ref('ALL')
const failedIcons = ref(new Set<string>())

const assetTypeTabs = ['ALL', 'Stocks', 'Crypto', 'Forex', 'Commodities', 'Metals', 'Indices']
const assetTypeLocales: Record<string, { ru: string; en: string }> = {
  ALL: { ru: 'ВСЕ', en: 'ALL' },
  Stocks: { ru: 'АКЦИИ', en: 'STOCKS' },
  'US Equities': { ru: 'US АКЦИИ', en: 'US EQUITIES' },
  Crypto: { ru: 'КРИПТО', en: 'CRYPTO' },
  Forex: { ru: 'ФОРЕКС', en: 'FOREX' },
  Commodities: { ru: 'СЫРЬЕ', en: 'COMMODITIES' },
  Metals: { ru: 'МЕТАЛЛЫ', en: 'METALS' },
  Indices: { ru: 'ИНДЕКСЫ', en: 'INDICES' }
}

const searchPlaceholder = computed(() => props.placeholder || (locale.value === 'ru' ? 'ПОИСК АКТИВОВ...' : 'SEARCH ASSETS...'))
const emptyLabel = computed(() => props.noResultsLabel || (locale.value === 'ru' ? 'Активы не найдены' : 'No assets found'))
const getAssetTypeLabel = (type: string) => assetTypeLocales[type]?.[locale.value] || type

const getForexCurrencyPair = (symbol: string) => {
  const match = String(symbol || '').toUpperCase().replace(/[^A-Z]/g, '').match(/^([A-Z]{3})([A-Z]{3})$/)
  if (!match) return null

  return {
    base: `https://wise.com/web-art/assets/flags/${match[1].toLowerCase()}.svg`,
    quote: `https://wise.com/web-art/assets/flags/${match[2].toLowerCase()}.svg`
  }
}

const filteredAssets = computed<AssetOption[]>(() => {
  const query = assetSearch.value.trim().toUpperCase()
  let baseAssets = allAssets as AssetOption[]

  if (assetTypeFilter.value !== 'ALL') {
    baseAssets = baseAssets.filter(asset => String(asset.type || '').toUpperCase() === assetTypeFilter.value.toUpperCase())
  }

  if (!query) return baseAssets.slice(0, 50)

  const searchLower = query.toLowerCase()

  return baseAssets
    .filter(asset =>
      String(asset.symbol || '').toLowerCase().includes(searchLower)
      || String(asset.name || '').toLowerCase().includes(searchLower)
    )
    .sort((a, b) => {
      const aSymbol = String(a.symbol || '').toUpperCase()
      const bSymbol = String(b.symbol || '').toUpperCase()
      const aName = String(a.name || '').toUpperCase()
      const bName = String(b.name || '').toUpperCase()

      if (aSymbol === query) return -1
      if (bSymbol === query) return 1
      if (aName === query) return -1
      if (bName === query) return 1

      const tacticalTypes = ['FOREX', 'INDICES', 'COMMODITIES']
      const aIsTactical = tacticalTypes.includes(String(a.type || '').toUpperCase())
      const bIsTactical = tacticalTypes.includes(String(b.type || '').toUpperCase())
      if (aIsTactical && !bIsTactical) return -1
      if (!aIsTactical && bIsTactical) return 1

      if (aSymbol.startsWith(query) && !bSymbol.startsWith(query)) return -1
      if (!aSymbol.startsWith(query) && bSymbol.startsWith(query)) return 1

      return aSymbol.localeCompare(bSymbol)
    })
    .slice(0, 20)
})

const close = () => {
  emit('update:open', false)
}

const selectAsset = (asset: AssetOption) => {
  emit('select', asset)
  close()
}

const handleIconError = (symbol: string) => {
  const next = new Set(failedIcons.value)
  next.add(symbol)
  failedIcons.value = next
}

watch(() => props.open, (open) => {
  if (!open) return
  assetSearch.value = ''
  assetTypeFilter.value = 'ALL'
})
</script>

<template>
  <Teleport to="body">
    <Transition name="nier-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 px-6"
        @click.self="close"
      >
        <div
          class="flex h-[500px] max-h-[80vh] w-[800px] max-w-[95vw] flex-col bg-[#0a0a0a] text-white shadow-2xl"
          @click.stop
        >
          <div class="shrink-0 border-b border-white/10 p-6">
            <input
              v-model="assetSearch"
              type="search"
              :placeholder="searchPlaceholder"
              class="w-full bg-transparent text-xl font-black uppercase tracking-widest text-white outline-none placeholder:text-white/20"
              autofocus
            />
          </div>

          <div class="shrink-0 border-b border-white/10">
            <div class="flex w-fit max-w-full gap-0.5 overflow-x-auto custom-scrollbar">
              <button
                v-for="assetTypeTab in assetTypeTabs"
                :key="assetTypeTab"
                type="button"
                class="group relative shrink-0 px-5 py-3 transition-all duration-300"
                :class="assetTypeFilter === assetTypeTab ? 'bg-white text-black' : 'bg-[#0a0a0a]/80 text-white/70 hover:bg-[#222] hover:text-white'"
                @click="assetTypeFilter = assetTypeTab"
              >
                <span class="relative z-10 font-sans text-[9px] font-black uppercase tracking-[0.26em]">
                  {{ getAssetTypeLabel(assetTypeTab) }}
                </span>
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto custom-scrollbar">
            <button
              v-for="assetOption in filteredAssets"
              :key="assetOption.symbol"
              type="button"
              class="grid w-full grid-cols-[9rem_minmax(0,1fr)] items-center gap-4 border-b border-white/5 px-6 py-4 text-left transition-colors hover:bg-white/10"
              @click="selectAsset(assetOption)"
            >
              <span class="flex min-w-0 items-center gap-3">
                <span
                  v-if="assetOption.type === 'Forex' && getForexCurrencyPair(assetOption.symbol)"
                  class="relative flex h-7 w-7 shrink-0 items-center"
                >
                  <img :src="getForexCurrencyPair(assetOption.symbol)!.base" alt="" class="absolute left-0 top-0 z-10 h-[68%] w-[68%] rounded-full object-cover" />
                  <img :src="getForexCurrencyPair(assetOption.symbol)!.quote" alt="" class="absolute bottom-0 right-0 h-[68%] w-[68%] rounded-full object-cover" />
                </span>
                <span
                  v-else-if="assetOption.icon && !failedIcons.has(assetOption.symbol)"
                  class="flex h-7 w-7 shrink-0 items-center justify-center"
                >
                  <img
                    :src="assetOption.icon"
                    :alt="assetOption.symbol"
                    class="h-full w-full object-contain"
                    @error="handleIconError(assetOption.symbol)"
                  />
                </span>
                <span v-else class="flex h-7 w-7 shrink-0 items-center justify-center border border-white/20 text-xs font-black text-white">
                  {{ assetOption.symbol?.[0] || '' }}
                </span>
                <span class="truncate text-sm font-black tracking-widest">{{ assetOption.symbol }}</span>
              </span>

              <span class="min-w-0">
                <span class="block truncate text-[10px] uppercase tracking-widest text-white/80">{{ assetOption.name }}</span>
                <span class="block truncate text-[8px] uppercase tracking-widest text-white/35">{{ assetOption.description }}</span>
              </span>
            </button>

            <div
              v-if="filteredAssets.length === 0"
              class="flex h-full items-center justify-center text-[10px] uppercase tracking-widest text-white/30"
            >
              {{ emptyLabel }}
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
