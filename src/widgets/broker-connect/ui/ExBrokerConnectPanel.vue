<template>
  <div class="fixed inset-0 z-[2500] flex items-center justify-center bg-black/45 px-6 transition-all"
       @click.self="$emit('close')">
    <div class="relative">
      <!-- CLOSE HANDLE (RIGHT EDGE) -->
      <button @click="$emit('close')"
              class="absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-40 bg-theme-bg dark:bg-[#070707] border-t border-r border-b border-black/20 dark:border-white/20 flex items-center justify-center group/close-tab cursor-pointer hover:bg-theme-surface dark:hover:bg-[#111] transition-colors z-[100]">
         <div class="w-[1px] h-16 bg-black/10 dark:bg-white/10 group-hover/close-tab:bg-black/40 dark:group-hover/close-tab:bg-white/40 transition-all duration-300"></div>
         <span class="absolute text-[7px] font-mono tracking-[0.4em] uppercase text-black/10 dark:text-white/10 group-hover/close-tab:text-black/40 dark:group-hover/close-tab:text-white/40 rotate-90 whitespace-nowrap">{{ isRu ? 'ЗАКРЫТЬ_ПАНЕЛЬ' : 'Close_Panel' }}</span>
      </button>

      <ExPanel variant="light" no-padding class="!w-[800px] !max-w-[96vw] transition-all duration-500">
        <div class="flex h-[640px] max-h-[90vh] nier-text-primary overflow-hidden relative">
          <div class="w-full h-full flex flex-col absolute inset-0">
            
            <!-- TOPBAR BROKER SELECTOR -->
            <div class="flex items-center justify-between border-b border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.02] px-8 py-4 shrink-0">
              <div class="flex items-center gap-4 overflow-x-auto custom-scrollbar pr-4">
                <button v-for="broker in brokers"
                        :key="broker.id"
                        class="group flex items-center gap-3 px-5 py-2.5 border transition-colors shrink-0 relative"
                        :class="selectedBrokerId === broker.id
                          ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                          : 'border-black/10 bg-white/40 text-black/55 hover:border-black/30 hover:text-black dark:border-white/10 dark:bg-white/[0.02] dark:text-white/45 dark:hover:border-white/30 dark:hover:text-white'"
                        @click="selectedBrokerId = broker.id">
                  <div class="absolute -top-px -left-px w-1 h-1 nier-bg-inverted opacity-0 transition-opacity" :class="selectedBrokerId === broker.id ? 'opacity-100' : 'group-hover:opacity-50'"></div>
                  <div class="absolute -bottom-px -left-px w-1 h-1 nier-bg-inverted opacity-0 transition-opacity" :class="selectedBrokerId === broker.id ? 'opacity-100' : 'group-hover:opacity-50'"></div>
                  <div class="absolute -top-px -right-px w-1 h-1 nier-bg-inverted opacity-0 transition-opacity" :class="selectedBrokerId === broker.id ? 'opacity-100' : 'group-hover:opacity-50'"></div>
                  <div class="absolute -bottom-px -right-px w-1 h-1 nier-bg-inverted opacity-0 transition-opacity" :class="selectedBrokerId === broker.id ? 'opacity-100' : 'group-hover:opacity-50'"></div>
                  
                  <img :src="`/brokers/${broker.logoId || broker.id}.svg`" class="w-5 h-5 object-contain transition-all"
                       :class="selectedBrokerId === broker.id ? 'grayscale-0 opacity-100' : 'grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100'" :alt="broker.label" />
                  <div class="flex flex-col items-start">
                    <span class="font-mono text-[10px] font-black uppercase tracking-[0.14em]">{{ broker.label }}</span>
                  </div>
                  <span v-if="isBrokerActiveForTopbar(broker.id)" class="absolute top-1.5 right-1.5 z-10 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                </button>
              </div>
            </div>

            <!-- MAIN FORM AREA -->
            <div class="flex flex-1 overflow-y-auto relative">
              <div class="px-8 py-10 w-full max-w-3xl mx-auto flex flex-col">
                <div class="flex items-center gap-5 mb-8 pb-8 border-b nier-border-primary">
                  <div class="w-16 h-16 border nier-border-primary bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-center p-3">
                    <img :src="`/brokers/${selectedBroker.logoId || selectedBroker.id}.svg`" class="w-full h-full object-contain grayscale-0" :alt="selectedBroker.label" />
                  </div>
                  <div>
                    <p class="font-mono text-[10px] font-black uppercase tracking-[0.32em] text-emerald-600 dark:text-emerald-400">{{ selectedBroker.assetClass }}</p>
                    <h3 class="mt-1 font-mono text-[28px] font-black uppercase tracking-widest">{{ selectedBroker.label }} {{ isRu ? 'Настройка' : 'Setup' }}</h3>
                  </div>
                </div>

                <div class="mb-8 border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.02]">
                  <p class="font-mono text-[10px] font-bold uppercase leading-relaxed tracking-[0.12em] opacity-60">
                    {{ selectedBroker.description }}
                  </p>
                  <div v-if="selectedBroker.id === 'kraken'"
                       class="mt-4 border border-red-500/20 bg-red-500/5 p-5 text-red-600 dark:text-red-400">
                    <p class="font-mono text-[10px] font-black uppercase tracking-[0.14em] leading-relaxed">
                      {{ isRu ? 'ВНИМАНИЕ: ПОДДЕРЖИВАЕТСЯ ТОЛЬКО KRAKEN FUTURES. СПОТ КЛЮЧИ НЕ ПОДДЕРЖИВАЮТСЯ.' : 'WARNING: ONLY KRAKEN FUTURES IS SUPPORTED. SPOT KEYS ARE NOT SUPPORTED.' }}
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-6 mb-8">
                  <label v-for="field in selectedBroker.fields"
                         :key="field.key"
                         class="flex flex-col gap-3">
                    <span class="font-mono text-[9px] font-black uppercase tracking-[0.22em] opacity-50">{{ field.label }}</span>
                    <input v-model="formState[field.key]"
                           :type="field.secret ? 'password' : 'text'"
                           :placeholder="field.placeholder"
                           class="h-14 border border-black/10 bg-white px-4 font-mono text-[12px] font-bold tracking-[0.1em] text-black outline-none transition-colors placeholder:text-black/20 focus:border-black/50 focus:bg-black/[0.02] dark:border-white/10 dark:bg-[#050505] dark:text-white dark:placeholder:text-white/20 dark:focus:border-white/50 dark:focus:bg-white/[0.02]" />
                  </label>
                </div>

                <div v-if="showStrategyBinding"
                     class="mb-8 border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.02]">
                  <div class="flex items-center justify-between gap-4 mb-5">
                    <div>
                      <p class="font-mono text-[10px] font-black uppercase tracking-[0.24em] opacity-50">{{ isRu ? 'Целевая Стратегия Импорта' : 'Import Target Strategy' }}</p>
                      <p class="mt-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] opacity-60">
                        {{ isRu ? 'Выберите, куда этот коннектор должен загружать историю торгов.' : 'Choose where this connector should load trading history.' }}
                      </p>
                    </div>
                    <p class="font-mono text-[10px] font-black uppercase tracking-widest bg-black/5 dark:bg-white/5 px-3 py-1 border nier-border-primary">
                      {{ selectedImportStrategyName }}
                    </p>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <button v-for="strategy in tradeStore.strategies"
                            :key="strategy.id"
                            class="border px-4 py-4 text-left transition-colors"
                            :class="importTargetStrategyId === strategy.id
                              ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                              : 'border-black/10 bg-white/50 text-black/60 hover:border-black/40 hover:text-black dark:border-white/10 dark:bg-white/[0.02] dark:text-white/60 dark:hover:border-white/40 dark:hover:text-white'"
                            @click="setImportTargetStrategy(strategy.id)">
                      <p class="font-mono text-[11px] font-black uppercase tracking-[0.14em]">{{ strategy.name }}</p>
                    </button>
                  </div>
                </div>

                <div class="border border-black/10 p-5 dark:border-white/10 mb-8 bg-white/40 dark:bg-black/40">
                  <p class="font-mono text-[9px] font-black uppercase tracking-[0.28em] opacity-40 mb-5">{{ isRu ? 'Статус Подключения' : 'Connection Status' }}</p>
                  <div class="grid grid-cols-3 gap-4">
                    <div class="border border-black/10 bg-white dark:bg-[#050505] p-4 dark:border-white/10">
                      <p class="font-mono text-[8px] font-black uppercase tracking-[0.2em] opacity-40">{{ isRu ? 'Сохранено Локально' : 'Saved Local' }}</p>
                      <p class="mt-3 font-mono text-[14px] font-black uppercase"
                         :class="savedCurrentConnection ? 'text-emerald-500' : 'opacity-30'">
                        {{ savedCurrentConnection ? (isRu ? 'Да' : 'Yes') : (isRu ? 'Нет' : 'No') }}
                      </p>
                    </div>
                    <div class="border border-black/10 bg-white dark:bg-[#050505] p-4 dark:border-white/10 relative overflow-hidden">
                      <div v-if="isSelectedBrokerActive" class="absolute inset-0 bg-emerald-500/5"></div>
                      <p class="font-mono text-[8px] font-black uppercase tracking-[0.2em] opacity-40 relative z-10">{{ isRu ? 'Статус' : 'Status' }}</p>
                      <p class="mt-3 font-mono text-[14px] font-black uppercase relative z-10"
                         :class="isSelectedBrokerActive ? 'text-emerald-500' : 'opacity-30'">
                        {{ isSelectedBrokerActive ? (isRu ? 'Активен' : 'Active') : (isRu ? 'Оффлайн' : 'Offline') }}
                      </p>
                    </div>
                    <div class="border border-black/10 bg-white dark:bg-[#050505] p-4 dark:border-white/10">
                      <p class="font-mono text-[8px] font-black uppercase tracking-[0.2em] opacity-40">{{ isRu ? 'Режим' : 'Mode' }}</p>
                      <p class="mt-3 font-mono text-[11px] font-black uppercase opacity-70">{{ connectionModeLabel }}</p>
                    </div>
                  </div>
                </div>

                <div v-if="statusMessage"
                     class="mb-8 border px-5 py-4 font-mono text-[10px] font-bold uppercase leading-relaxed tracking-[0.14em]"
                     :class="statusTone === 'success'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : statusTone === 'error'
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : 'border-black/10 bg-black/[0.02] text-black/50 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/50'">
                  {{ statusMessage }}
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <button class="border border-black/10 bg-white dark:bg-[#050505] px-4 py-4 font-mono text-[10px] font-black uppercase tracking-[0.22em] transition-all hover:border-black hover:bg-black hover:text-white dark:border-white/10 dark:hover:border-white dark:hover:bg-white dark:hover:text-black shadow-sm"
                          @click="saveCurrentConnection">
                    {{ isRu ? 'Сохранить Ключи Локально' : 'Save Local Keys' }}
                  </button>
                  <button class="border px-4 py-4 font-mono text-[10px] font-black uppercase tracking-[0.22em] transition-all shadow-md"
                          :class="primaryActionEnabled
                            ? 'border-black bg-black text-white hover:bg-black/90 dark:border-white dark:bg-white dark:text-black dark:hover:bg-white/90'
                            : 'cursor-not-allowed border-black/10 text-black/25 dark:border-white/10 dark:text-white/25 shadow-none'"
                          :disabled="!primaryActionEnabled || activationState === 'loading'"
                          @click="handlePrimaryAction">
                    {{ primaryActionLabel }}
                  </button>
                </div>

                <div class="h-10 shrink-0"></div>
              </div>
            </div>
          </div>
        </div>
      </ExPanel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import ExPanel from '~/shared/ui/ExPanel.vue'
import { useI18n } from '~/shared/i18n/useI18n'
import type { DiaryEntry } from '~/entities/diary/model/diary.types'
import { loadFromDisk, saveToDisk } from '~/shared/diskStorage'
import { testBinanceConnection, withBinanceEnvironment, type BinanceCredentials } from '~/utils/binance'
import {
  testBybitConnection,
  getBybitClosedTrades,
  getBybitOrderHistory,
  withBybitEnvironment,
  type BybitCredentials,
  type BybitClosedPnl,
  type BybitHistoricOrder
} from '~/utils/bybit'
import {
  testKrakenConnection,
  testKrakenFuturesConnection,
  getKrakenTradesHistory,
  getKrakenFuturesFills,
  getKrakenQueryOrders,
  withKrakenFuturesEnvironment,
  type KrakenCredentials,
  type KrakenTrade,
  type KrakenFuturesFill
} from '~/utils/kraken'
import { resolveImportedAsset } from '~/utils/assetResolver'
import { useStrategyTradesStore } from '~/features/store/useStrategyTrades'

type BrokerId = 'binance' | 'bybit' | 'kraken' | 'interactive-brokers'
type KrakenMarketMode = 'spot' | 'futures'
type BrokerEnvironment = 'real' | 'demo'

interface BrokerField {
  key: string
  label: string
  placeholder: string
  secret?: boolean
}

interface BrokerDefinition {
  id: BrokerId
  logoId?: string
  label: string
  assetClass: string
  description: string
  mode: string
  fields: BrokerField[]
  canActivate: boolean
}

interface SavedConnection {
  brokerId: BrokerId | 'kraken-spot' | 'kraken-futures'
  credentials: Record<string, string>
  active: boolean
  updatedAt: string
  activatedAt?: string
}

const props = defineProps<{
  strategyId?: string
}>()

defineEmits<{
  close: []
}>()

const STORAGE_KEY = 'broker_connections_v1'
const tradeStore = useStrategyTradesStore()
const { locale } = useI18n()
const isRu = computed(() => locale.value === 'ru')

const brokers = computed<BrokerDefinition[]>(() => [
  {
    id: 'binance',
    label: 'Binance',
    assetClass: isRu.value ? 'Крипто Спот / Фьючерсы' : 'Crypto Spot / Futures',
    description: isRu.value ? 'Коннектор Binance (только чтение). Использует подписанные эндпоинты USER_DATA для проверки аккаунта.' : 'Read-only Binance connector. Uses signed USER_DATA endpoints for account validation and trade history helpers.',
    mode: isRu.value ? 'Активно' : 'Live Activation',
    canActivate: true,
    fields: [
      { key: 'apiKey', label: isRu.value ? 'API Ключ' : 'API Key', placeholder: 'X-MBX-APIKEY' },
      { key: 'apiSecret', label: isRu.value ? 'API Секрет' : 'API Secret', placeholder: 'HMAC SHA256 secret', secret: true }
    ]
  },
  {
    id: 'bybit',
    label: 'Bybit',
    assetClass: isRu.value ? 'Крипто Деривативы' : 'Crypto Derivatives',
    description: isRu.value ? 'Подключите API Bybit (только чтение) для загрузки истории исполнения сделок.' : 'Connect Bybit read-only API to load execution history.',
    mode: isRu.value ? 'Активно' : 'Live Activation',
    canActivate: true,
    fields: [
      { key: 'apiKey', label: isRu.value ? 'API Ключ' : 'API Key', placeholder: 'Bybit API key' },
      { key: 'apiSecret', label: isRu.value ? 'API Секрет' : 'API Secret', placeholder: 'Bybit API secret', secret: true }
    ]
  },
  {
    id: 'kraken',
    label: 'Kraken',
    assetClass: isRu.value ? 'Крипто Деривативы (ТОЛЬКО FUTURES)' : 'Crypto Derivatives (ONLY FUTURES)',
    description: isRu.value ? 'Коннектор Kraken (только чтение). ВНИМАНИЕ: Поддерживается только Futures API. Торговая история спота не импортируется.' : 'Read-only Kraken connector. WARNING: Only Futures API is supported. Spot trade history is not imported.',
    mode: isRu.value ? 'Активно' : 'Live Activation',
    canActivate: true,
    fields: [
      { key: 'apiKey', label: isRu.value ? 'API Ключ' : 'API Key', placeholder: 'Kraken API key' },
      { key: 'apiSecret', label: isRu.value ? 'Приватный Ключ' : 'Private Key', placeholder: 'Kraken private key', secret: true }
    ]
  },
  {
    id: 'interactive-brokers',
    label: 'Interactive Brokers',
    assetClass: isRu.value ? 'Акции / Опционы / Форекс' : 'Stocks / Options / Forex',
    description: isRu.value ? 'Импортируйте историю сделок из IBKR с помощью Flex Query.' : 'Import trade history from IBKR using Flex Query.',
    mode: isRu.value ? 'Активно' : 'Live Activation',
    canActivate: true,
    fields: [
      { key: 'token', label: isRu.value ? 'Flex Query Токен' : 'Flex Query Token', placeholder: 'IBKR Flex Token', secret: true },
      { key: 'queryId', label: isRu.value ? 'Flex Query ID' : 'Flex Query ID', placeholder: '123456' }
    ]
  },
])

const selectedBrokerId = ref<BrokerId>('binance')
const connectionMap = ref<Record<string, SavedConnection>>({})
const formState = reactive<Record<string, string>>({})
const activationState = ref<'idle' | 'loading'>('idle')
const statusMessage = ref('')
const statusTone = ref<'neutral' | 'success' | 'error'>('neutral')
const importTargetStrategyId = ref('MAIN_DIARY')
const krakenMarketMode = ref<KrakenMarketMode>('futures')
const brokerEnvironment = ref<BrokerEnvironment>('real')

const getStorageKeyForBrokerSelection = (brokerId: BrokerId) => {
  if (brokerId === 'kraken') {
    return krakenMarketMode.value === 'futures' ? 'kraken-futures' : 'kraken-spot'
  }
  return brokerId
}

const isBrokerActiveForTopbar = (brokerId: BrokerId) => {
  if (brokerId === 'kraken') {
    return Boolean(
      connectionMap.value['kraken-spot']?.active ||
      connectionMap.value['kraken-futures']?.active ||
      connectionMap.value['kraken']?.active
    )
  }
  return Boolean(connectionMap.value[brokerId]?.active)
}


const selectedBroker = computed(() => {
  return (brokers.value.find(broker => broker.id === selectedBrokerId.value) || brokers.value[0]) as BrokerDefinition
})

const selectedImportStrategyName = computed(() => {
  return tradeStore.strategies.find(strategy => strategy.id === importTargetStrategyId.value)?.name || 'Main Diary'
})

const brokerEnvironmentOptions = computed<Array<{ id: BrokerEnvironment; label: string }>>(() => [
  { id: 'real', label: 'REAL' }
])

const selectedBrokerSupportsEnvironment = computed(() => {
  return ['binance', 'bybit', 'kraken'].includes(selectedBroker.value.id)
})

const selectedBrokerEnvironmentLabel = computed(() => {
  return brokerEnvironment.value === 'demo'
    ? (isRu.value ? 'DEMO / TESTNET' : 'DEMO / TESTNET')
    : (isRu.value ? 'REAL / LIVE' : 'REAL / LIVE')
})

const environmentSupportNote = computed(() => {
  if (selectedBroker.value.id === 'binance') {
    return isRu.value
      ? 'REAL использует Binance live. DEMO использует Spot Testnet и USD-M Futures Testnet.'
      : 'REAL uses Binance live. DEMO uses Spot Testnet and USD-M Futures Testnet.'
  }

  if (selectedBroker.value.id === 'bybit') {
    return isRu.value
      ? 'REAL использует Bybit mainnet. DEMO использует Bybit Demo Trading API.'
      : 'REAL uses Bybit mainnet. DEMO uses Bybit Demo Trading API.'
  }

  if (selectedBroker.value.id === 'kraken') {
    return isRu.value
      ? 'REAL использует Kraken live. DEMO доступен для Kraken Futures.'
      : 'REAL uses Kraken live. DEMO is available for Kraken Futures.'
  }

  return isRu.value ? 'Выберите среду API для подключения.' : 'Choose the API environment for this connection.'
})

const isKrakenSpotDemoSelected = computed(() => {
  return selectedBroker.value.id === 'kraken' && krakenMarketMode.value === 'spot' && brokerEnvironment.value === 'demo'
})

const connectionModeLabel = computed(() => {
  if (!selectedBrokerSupportsEnvironment.value) return selectedBroker.value.mode

  const environmentLabel = brokerEnvironment.value === 'demo' ? 'Demo' : 'Real'
  if (selectedBroker.value.id === 'kraken') return `${environmentLabel} ${krakenMarketMode.value}`
  return environmentLabel
})

const readSavedConnectionEnvironment = (connection?: SavedConnection): BrokerEnvironment => {
  return connection?.credentials?.environment === 'demo' ? 'demo' : 'real'
}

const savedConnectionMatchesSelection = (connection?: SavedConnection) => {
  if (!connection) return false
  if (readSavedConnectionEnvironment(connection) !== brokerEnvironment.value) return false
  if (selectedBroker.value.id === 'kraken') {
    return connection.credentials?.market === krakenMarketMode.value
  }
  return true
}


const savedCurrentConnection = computed(() => {
  const key = getStorageKeyForBrokerSelection(selectedBroker.value.id)
  return savedConnectionMatchesSelection(connectionMap.value[key])
})

const isSelectedBrokerActive = computed(() => {
  const key = getStorageKeyForBrokerSelection(selectedBroker.value.id)
  const saved = connectionMap.value[key]
  return Boolean(saved?.active && savedConnectionMatchesSelection(saved))
})

const showStrategyBinding = computed(() => {
  return isSelectedBrokerActive.value
})

const canActivateSelected = computed(() => {
  return selectedBroker.value.canActivate
    && !isKrakenSpotDemoSelected.value
    && selectedBroker.value.fields.every(field => String(formState[field.key] || '').trim())
})

const primaryActionEnabled = computed(() => {
  if (isSelectedBrokerActive.value) return true
  return canActivateSelected.value
})

const primaryActionLabel = computed(() => {
  if (activationState.value === 'loading') {
    return isSelectedBrokerActive.value ? 'Deactivating...' : 'Activating...'
  }
  if (isSelectedBrokerActive.value) return 'Deactivate'
  return 'Activate'
})

const getFormCredentials = () => {
  return Object.fromEntries(selectedBroker.value.fields.map(field => [field.key, String(formState[field.key] || '').trim()])) as Record<string, string>
}

const getSavedCredentialsForCurrentSelection = () => {
  const baseCredentials = {
    ...getFormCredentials(),
    environment: brokerEnvironment.value,
    ...(selectedBroker.value.id === 'kraken' ? { market: krakenMarketMode.value } : {}),
    targetStrategyId: importTargetStrategyId.value
  } as Record<string, string>

  if (selectedBroker.value.id === 'binance') {
    const scopedCredentials = withBinanceEnvironment({
      apiKey: baseCredentials.apiKey || '',
      apiSecret: baseCredentials.apiSecret || ''
    }, brokerEnvironment.value)

    return {
      ...baseCredentials,
      ...(scopedCredentials.baseUrl ? { baseUrl: scopedCredentials.baseUrl } : {}),
      ...(scopedCredentials.futuresBaseUrl ? { futuresBaseUrl: scopedCredentials.futuresBaseUrl } : {})
    }
  }

  if (selectedBroker.value.id === 'bybit') {
    const scopedCredentials = withBybitEnvironment({
      apiKey: baseCredentials.apiKey || '',
      apiSecret: baseCredentials.apiSecret || ''
    }, brokerEnvironment.value)

    return {
      ...baseCredentials,
      ...(scopedCredentials.baseUrl ? { baseUrl: scopedCredentials.baseUrl } : {})
    }
  }

  if (selectedBroker.value.id === 'kraken' && krakenMarketMode.value === 'futures') {
    const scopedCredentials = withKrakenFuturesEnvironment({
      apiKey: baseCredentials.apiKey || '',
      apiSecret: baseCredentials.apiSecret || ''
    }, brokerEnvironment.value)

    return {
      ...baseCredentials,
      ...(scopedCredentials.baseUrl ? { baseUrl: scopedCredentials.baseUrl } : {})
    }
  }

  return baseCredentials
}

const applySavedCredentialsToForm = () => {
  const key = getStorageKeyForBrokerSelection(selectedBroker.value.id)
  const saved = connectionMap.value[key]
  const shouldUseSaved = savedConnectionMatchesSelection(saved)

  selectedBroker.value.fields.forEach((field) => {
    formState[field.key] = shouldUseSaved ? saved?.credentials?.[field.key] || '' : ''
  })

  importTargetStrategyId.value = shouldUseSaved
    ? saved?.credentials?.targetStrategyId || props.strategyId || tradeStore.selectedStrategyId || 'MAIN_DIARY'
    : props.strategyId || tradeStore.selectedStrategyId || 'MAIN_DIARY'
}

const resetFormForBroker = () => {
  Object.keys(formState).forEach((key) => {
    delete formState[key]
  })

  const key = getStorageKeyForBrokerSelection(selectedBroker.value.id)
  const saved = connectionMap.value[key]
  brokerEnvironment.value = readSavedConnectionEnvironment(saved)

  applySavedCredentialsToForm()
}

const loadConnections = async () => {
  const saved = await loadFromDisk<Record<string, SavedConnection>>(STORAGE_KEY)
  connectionMap.value = saved || {}
  await migrateKrakenFuturesConnection()
  resetFormForBroker()
}

const persistConnections = async () => {
  await saveToDisk(STORAGE_KEY, connectionMap.value)
}

const saveCurrentConnection = async () => {
  const credentials = getSavedCredentialsForCurrentSelection()
  const key = getStorageKeyForBrokerSelection(selectedBroker.value.id)
  const existing = connectionMap.value[key]
  const keepActive = Boolean(existing?.active && savedConnectionMatchesSelection(existing))

  connectionMap.value[key] = {
    brokerId: key,
    credentials,
    active: keepActive,
    updatedAt: new Date().toISOString(),
    activatedAt: keepActive ? existing?.activatedAt : undefined
  }
  await persistConnections()
  statusTone.value = 'success'
  statusMessage.value = `${selectedBroker.value.label} keys saved locally.`
}

const migrateKrakenFuturesConnection = async () => {
  const legacyConnections = connectionMap.value as Record<string, SavedConnection | undefined>
  
  // 1. Legacy 'kraken-futures' (if any remains)
  const legacyFutures = legacyConnections['kraken-futures']
  if (legacyFutures && legacyFutures.brokerId === 'kraken') {
    legacyFutures.brokerId = 'kraken-futures'
  }

  // 2. Split unified 'kraken' config into 'kraken-spot' and/or 'kraken-futures'
  const unifiedKraken = legacyConnections['kraken']
  if (unifiedKraken) {
    const isFutures = unifiedKraken.credentials?.market === 'futures'
    const targetKey = isFutures ? 'kraken-futures' : 'kraken-spot'
    
    // Move to target key if not already defined
    if (!legacyConnections[targetKey]) {
      legacyConnections[targetKey] = {
        ...unifiedKraken,
        brokerId: targetKey
      }
    }
    delete legacyConnections['kraken']
    await persistConnections()
  }
}

const handlePrimaryAction = async () => {


  if (isSelectedBrokerActive.value) {
    await deactivateCurrentConnection()
    return
  }

  await activateCurrentConnection()
}

const handleManualSync = async () => {
  if (!isSelectedBrokerActive.value) return
  activationState.value = 'loading'
  try {
    const key = getStorageKeyForBrokerSelection(selectedBroker.value.id)
    const saved = connectionMap.value[key]
    const creds = saved?.credentials
    const environment = readSavedConnectionEnvironment(saved)
    if (selectedBroker.value.id === 'bybit' && creds) {
      await importBybitTrades(withBybitEnvironment({ apiKey: creds.apiKey || '', apiSecret: creds.apiSecret || '' }, environment))
    } else if (selectedBroker.value.id === 'kraken' && creds) {
      const credentials = { apiKey: creds.apiKey || '', apiSecret: creds.apiSecret || '' }
      if (krakenMarketMode.value === 'futures') {
        await importKrakenFuturesTrades(withKrakenFuturesEnvironment(credentials, environment))
      } else {
        if (environment === 'demo') {
          throw new Error('Kraken Demo is available through Futures API only. Switch Kraken to Futures or choose REAL for Spot.')
        }
        await importKrakenTrades(credentials)
      }
    } else {
      statusMessage.value = 'Manual sync is not supported for this connector yet.'
      statusTone.value = 'neutral'
    }
  } catch (err: any) {
    statusTone.value = 'error'
    statusMessage.value = err?.message || 'Manual sync failed.'
  } finally {
    activationState.value = 'idle'
  }
}

const setImportTargetStrategy = async (strategyId: string) => {
  importTargetStrategyId.value = strategyId

  const existing = connectionMap.value[selectedBroker.value.id]
  if (!existing) return

  connectionMap.value[selectedBroker.value.id] = {
    ...existing,
    credentials: {
      ...existing.credentials,
      targetStrategyId: strategyId
    },
    updatedAt: new Date().toISOString()
  }
  await persistConnections()
  statusTone.value = 'success'
  statusMessage.value = `${selectedBroker.value.label} import target set to ${selectedImportStrategyName.value}.`
}

const setKrakenMarketMode = (mode: KrakenMarketMode) => {
  krakenMarketMode.value = mode
  applySavedCredentialsToForm()
  statusMessage.value = ''
  statusTone.value = 'neutral'
}

const setBrokerEnvironment = (environment: BrokerEnvironment) => {
  brokerEnvironment.value = environment
  applySavedCredentialsToForm()
  statusMessage.value = ''
  statusTone.value = 'neutral'
}

const activateCurrentConnection = async () => {
  if (!canActivateSelected.value) return

  activationState.value = 'loading'
  statusTone.value = 'neutral'
  statusMessage.value = 'Activating connector...'

  try {
    if (selectedBroker.value.id === 'binance') {
      const credentials: BinanceCredentials = withBinanceEnvironment({
        apiKey: formState.apiKey || '',
        apiSecret: formState.apiSecret || ''
      }, brokerEnvironment.value)
      await testBinanceConnection(credentials)
    } else if (selectedBroker.value.id === 'bybit') {
      const credentials: BybitCredentials = withBybitEnvironment({
        apiKey: formState.apiKey || '',
        apiSecret: formState.apiSecret || ''
      }, brokerEnvironment.value)
      await testBybitConnection(credentials)
    } else if (selectedBroker.value.id === 'kraken') {
      const credentials: KrakenCredentials = {
        apiKey: formState.apiKey || '',
        apiSecret: formState.apiSecret || ''
      }
      if (krakenMarketMode.value === 'futures') {
        const scopedCredentials = withKrakenFuturesEnvironment(credentials, brokerEnvironment.value)
        await testKrakenFuturesConnection(scopedCredentials)
      } else {
        if (brokerEnvironment.value === 'demo') {
          throw new Error('Kraken Demo is available through Futures API only. Switch Kraken to Futures or choose REAL for Spot.')
        }
        await testKrakenConnection(credentials)
      }
    }

    const key = getStorageKeyForBrokerSelection(selectedBroker.value.id)
    connectionMap.value[key] = {
      brokerId: key,
      credentials: getSavedCredentialsForCurrentSelection(),
      active: true,
      updatedAt: new Date().toISOString(),
      activatedAt: new Date().toISOString()
    }
    await persistConnections()
    statusTone.value = 'success'
    statusMessage.value = `${selectedBroker.value.label} connector activated.`
  } catch (error: any) {
    statusTone.value = 'error'
    statusMessage.value = error?.message || 'Connector activation failed.'
  } finally {
    activationState.value = 'idle'
  }
}

const importBybitTrades = async (credentials: BybitCredentials) => {
  statusMessage.value = 'Fetching closed trades from Bybit...'
  const [spotResponse, linearResponse, inverseResponse] = await Promise.allSettled([
    getBybitOrderHistory(credentials, { category: 'spot', limit: 50 }),
    getBybitClosedTrades(credentials, { category: 'linear', limit: 100 }),
    getBybitClosedTrades(credentials, { category: 'inverse', limit: 100 })
  ])

  const spotTrades = spotResponse.status === 'fulfilled' ? (spotResponse.value.list || []) : []
  const linearTrades = linearResponse.status === 'fulfilled' ? (linearResponse.value.list || []) : []
  const inverseTrades = inverseResponse.status === 'fulfilled' ? (inverseResponse.value.list || []) : []

  const hasAnySuccessfulSource = [spotResponse, linearResponse, inverseResponse].some(item => item.status === 'fulfilled')
  if (!hasAnySuccessfulSource) {
    const firstError = [spotResponse, linearResponse, inverseResponse].find(item => item.status === 'rejected') as PromiseRejectedResult | undefined
    throw new Error(firstError?.reason?.message || 'Bybit trade sync failed.')
  }

  let importedCount = 0
  let duplicateCount = 0

  await tradeStore.init()
  const existingTrades = tradeStore.getAllTradesForStrategy(importTargetStrategyId.value)
  const existingBySourceId = new Map(existingTrades.map(t => {
    const anyTrade = t as DiaryEntry & { sourceExternalId?: string }
    return [anyTrade.sourceExternalId || '', t] as const
  }).filter(([sourceId]) => Boolean(sourceId)))

  const importTrade = async (trade: DiaryEntry & { sourceExternalId: string; sourcePlatform: string }) => {
    const existingTrade = existingBySourceId.get(trade.sourceExternalId)
    if (existingTrade?.id) {
      await tradeStore.updateTrade(importTargetStrategyId.value, existingTrade.id, trade)
      duplicateCount++
      return
    }

    await tradeStore.addTrade(importTargetStrategyId.value, trade as DiaryEntry)
    importedCount++
    existingBySourceId.set(trade.sourceExternalId, trade)
  }

  const spotRoundTrips = buildBybitSpotRoundTrips(spotTrades)
  for (const trade of spotRoundTrips) {
    await importTrade(trade)
  }

  const derivativeTrades: Array<BybitClosedPnl & { market: 'linear' | 'inverse' }> = [
    ...linearTrades.map(trade => ({ ...trade, market: 'linear' as const })),
    ...inverseTrades.map(trade => ({ ...trade, market: 'inverse' as const }))
  ]

  for (const trade of derivativeTrades) {
    const execId = trade.orderId
    if (!execId) continue

    // closed-pnl side is the closing order side:
    // Sell closes a Long, Buy closes a Short
    const side = trade.side === 'Sell' ? 'Long' : 'Short'
    const profit = Number(trade.closedPnl) || 0
    const entryFee = Number(trade.openFee || 0) || 0
    const exitFee = Number(trade.closeFee || 0) || 0
    const resolvedAsset = resolveImportedAsset(trade.symbol, 'crypto-broker')

    const attached = {
      id: `bybit-${trade.market}-${execId}`,
      date: new Date(Number(trade.createdTime)),
      dateExit: new Date(Number(trade.updatedTime || trade.createdTime)),
      asset: resolvedAsset.symbol,
      side,
      entry: Number(trade.avgEntryPrice),
      exit: Number(trade.avgExitPrice),
      size: Number(trade.closedSize),
      entryFee,
      exitFee,
      currency: 'USDT',
      assetType: resolvedAsset.assetType,
      assetIcon: resolvedAsset.assetIcon,
      profitInCurrency: profit,
      result: profit,
      notes: `Imported from Bybit ${trade.market} closed pnl.\nOrderId: ${execId}\nLeverage: ${trade.leverage}\nFillCount: ${trade.fillCount}\nAssetMatch: ${resolvedAsset.matchSource || 'none'}`,
      source: 'bybit',
      sourceExternalId: `${trade.market}:${execId}`,
      sourcePlatform: 'Bybit V5'
    } as DiaryEntry & { sourceExternalId: string; sourcePlatform: string }

    await importTrade(attached)
  }

  statusTone.value = importedCount > 0 ? 'success' : 'neutral'
  statusMessage.value = importedCount > 0
    ? `${importedCount} Bybit trades imported. ${duplicateCount} duplicates skipped.`
    : `No importable Bybit trades found. Spot orders checked: ${spotTrades.length}, spot round trips: ${spotRoundTrips.length}, linear checked: ${linearTrades.length}, inverse checked: ${inverseTrades.length}.`
}

const importKrakenTrades = async (credentials: KrakenCredentials) => {
  statusMessage.value = 'Fetching trade history from Kraken...'
  const response = await getKrakenTradesHistory(credentials, { type: 'all', trades: true })
  const krakenTrades = Object.entries(response.trades || {}).map(([tradeId, trade]) => ({
    ...trade,
    tradeId
  }))

  let importedCount = 0
  let duplicateCount = 0

  await tradeStore.init()
  const existingTrades = tradeStore.getAllTradesForStrategy(importTargetStrategyId.value)
  const existingBySourceId = new Map(existingTrades.map(t => {
    const anyTrade = t as DiaryEntry & { sourceExternalId?: string }
    return [anyTrade.sourceExternalId || '', t] as const
  }).filter(([sourceId]) => Boolean(sourceId)))

  const orderIds = Array.from(new Set(krakenTrades.map(t => t.ordertxid).filter(Boolean)))
  let ordersMap: Record<string, any> = {}
  try {
    if (orderIds.length > 0) {
      ordersMap = await getKrakenQueryOrders(credentials, orderIds)
    }
  } catch (err) {
    console.error('Failed to query orders details during import:', err)
  }

  const roundTrips = buildKrakenSpotRoundTrips(krakenTrades, ordersMap)
  for (const trade of roundTrips) {
    const existingTrade = existingBySourceId.get(trade.sourceExternalId)
    if (existingTrade?.id) {
      await tradeStore.updateTrade(importTargetStrategyId.value, existingTrade.id, trade)
      duplicateCount++
      continue
    }

    await tradeStore.addTrade(importTargetStrategyId.value, trade as DiaryEntry)
    importedCount++
    existingBySourceId.set(trade.sourceExternalId, trade)
  }

  statusTone.value = importedCount > 0 ? 'success' : 'neutral'
  statusMessage.value = importedCount > 0
    ? `${importedCount} Kraken trades imported. ${duplicateCount} duplicates skipped.`
    : `No importable Kraken round trips found. Fills checked: ${krakenTrades.length}, round trips: ${roundTrips.length}.`
}

const importKrakenFuturesTrades = async (credentials: KrakenCredentials) => {
  statusMessage.value = 'Fetching futures fills from Kraken...'
  const response = await getKrakenFuturesFills(credentials)
  const fills = response.fills || []

  let importedCount = 0
  let duplicateCount = 0

  await tradeStore.init()
  const existingTrades = tradeStore.getAllTradesForStrategy(importTargetStrategyId.value)
  const existingBySourceId = new Map(existingTrades.map(t => {
    const anyTrade = t as DiaryEntry & { sourceExternalId?: string }
    return [anyTrade.sourceExternalId || '', t] as const
  }).filter(([sourceId]) => Boolean(sourceId)))

  const roundTrips = buildKrakenFuturesRoundTrips(fills)
  for (const trade of roundTrips) {
    const existingTrade = existingBySourceId.get(trade.sourceExternalId)
    if (existingTrade?.id) {
      await tradeStore.updateTrade(importTargetStrategyId.value, existingTrade.id, trade)
      duplicateCount++
      continue
    }

    await tradeStore.addTrade(importTargetStrategyId.value, trade as DiaryEntry)
    importedCount++
    existingBySourceId.set(trade.sourceExternalId, trade)
  }

  statusTone.value = importedCount > 0 ? 'success' : 'neutral'
  statusMessage.value = importedCount > 0
    ? `${importedCount} Kraken Futures trades imported. ${duplicateCount} duplicates skipped.`
    : `No importable Kraken Futures round trips found. Fills checked: ${fills.length}, round trips: ${roundTrips.length}.`
}

const buildBybitSpotRoundTrips = (orders: BybitHistoricOrder[]) => {
  type OpenLot = {
    orderId: string
    symbol: string
    date: Date
    remainingQty: number
    price: number
    fee: number
  }

  const epsilon = 1e-10
  const openLotsBySymbol = new Map<string, OpenLot[]>()
  const roundTrips: Array<DiaryEntry & { sourceExternalId: string; sourcePlatform: string }> = []

  const normalizedOrders = [...orders]
    .filter(order => /Filled|PartiallyFilledCancelled/i.test(String(order.orderStatus || '')))
    .map(order => {
      const qty = Number(order.cumExecQty || 0)
      const avgPriceRaw = Number(order.avgPrice || 0)
      const value = Number(order.cumExecValue || 0)
      const avgPrice = avgPriceRaw || (qty > 0 ? value / qty : 0)

      return {
        ...order,
        qty,
        value,
        avgPrice,
        fee: readBybitSpotFee(order),
        timestamp: Number(order.updatedTime || order.createdTime || 0)
      }
    })
    .filter(order => order.qty > epsilon && order.avgPrice > epsilon)
    .sort((left, right) => left.timestamp - right.timestamp)

  normalizedOrders.forEach((order) => {
    const symbol = String(order.symbol || '').toUpperCase()
    if (!symbol) return

    const lots = openLotsBySymbol.get(symbol) || []

    if (order.side === 'Buy') {
      lots.push({
        orderId: order.orderId,
        symbol,
        date: new Date(order.timestamp),
        remainingQty: order.qty,
        price: order.avgPrice,
        fee: order.fee
      })
      openLotsBySymbol.set(symbol, lots)
      return
    }

    let remainingSellQty = order.qty
    let consumedQty = 0
    let entryCost = 0
    let allocatedEntryFee = 0
    let firstEntryDate: Date | null = null
    const consumedOrderIds: string[] = []

    while (remainingSellQty > epsilon && lots.length) {
      const currentLot = lots[0]!
      const matchedQty = Math.min(currentLot.remainingQty, remainingSellQty)
      const lotShare = matchedQty / currentLot.remainingQty

      if (!firstEntryDate) {
        firstEntryDate = currentLot.date
      }

      consumedQty += matchedQty
      entryCost += matchedQty * currentLot.price
      allocatedEntryFee += currentLot.fee * lotShare
      if (!consumedOrderIds.includes(currentLot.orderId)) {
        consumedOrderIds.push(currentLot.orderId)
      }

      currentLot.remainingQty -= matchedQty
      currentLot.fee -= currentLot.fee * lotShare
      remainingSellQty -= matchedQty

      if (currentLot.remainingQty <= epsilon) {
        lots.shift()
      }
    }

    if (consumedQty <= epsilon || !firstEntryDate) {
      openLotsBySymbol.set(symbol, lots)
      return
    }

    const proceeds = consumedQty * order.avgPrice
    const exitFee = order.fee * (consumedQty / order.qty)
    const profit = proceeds - entryCost - allocatedEntryFee - exitFee
    const resolvedAsset = resolveImportedAsset(symbol, 'crypto-broker')

    roundTrips.push({
      id: `bybit-spot-close-${order.orderId}`,
      date: firstEntryDate,
      dateExit: new Date(order.timestamp),
      asset: resolvedAsset.symbol,
      side: 'Long',
      entry: entryCost / consumedQty,
      exit: order.avgPrice,
      size: consumedQty,
      entryFee: allocatedEntryFee,
      exitFee,
      currency: 'USDT',
      assetType: resolvedAsset.assetType,
      assetIcon: resolvedAsset.assetIcon,
      profitInCurrency: profit,
      result: profit,
      notes: `Imported from Bybit spot round trip.\nOpenOrders: ${consumedOrderIds.join(', ')}\nCloseOrder: ${order.orderId}\nOrderType: ${order.orderType}\nAssetMatch: ${resolvedAsset.matchSource || 'none'}`,
      source: 'bybit',
      sourceExternalId: `spot-close:${order.orderId}`,
      sourcePlatform: 'Bybit V5 Spot'
    } as DiaryEntry & { sourceExternalId: string; sourcePlatform: string })

    openLotsBySymbol.set(symbol, lots)
  })

  return roundTrips
}

const parseStopLossTakeProfitFromDescr = (closeDescr: string) => {
  let stopLoss: number | undefined
  let takeProfit: number | undefined

  if (!closeDescr || typeof closeDescr !== 'string') return { stopLoss, takeProfit }

  const slMatch = closeDescr.match(/stop\s*loss\s+(?:@\s*(?:limit|market)?\s*)?([0-9\.]+)/i)
  if (slMatch && slMatch[1]) {
    stopLoss = Number(slMatch[1])
  }

  const tpMatch = closeDescr.match(/take\s*profit\s+(?:@\s*(?:limit|market)?\s*)?([0-9\.]+)/i)
  if (tpMatch && tpMatch[1]) {
    takeProfit = Number(tpMatch[1])
  }

  return { stopLoss, takeProfit }
}

const buildKrakenSpotRoundTrips = (
  fills: Array<KrakenTrade & { tradeId: string }>,
  ordersMap: Record<string, any> = {}
) => {
  type OpenLot = {
    tradeId: string
    ordertxid?: string
    symbol: string
    date: Date
    remainingQty: number
    price: number
    fee: number
  }

  const epsilon = 1e-10
  const openLotsBySymbol = new Map<string, OpenLot[]>()
  const roundTrips: Array<DiaryEntry & { sourceExternalId: string; sourcePlatform: string }> = []

  const normalizedFills = fills
    .map(fill => {
      const symbol = normalizeKrakenPair(fill.pair)
      const qty = Number(fill.vol || 0)
      const priceRaw = Number(fill.price || 0)
      const cost = Number(fill.cost || 0)
      const price = priceRaw || (qty > 0 ? cost / qty : 0)
      const fee = Number(fill.fee || 0) || 0
      const timestamp = parseKrakenSpotTimestamp(fill.time)

      return {
        ...fill,
        symbol,
        qty,
        price,
        cost,
        fee,
        timestamp
      }
    })
    .filter(fill => fill.symbol && fill.qty > epsilon && fill.price > epsilon && Number.isFinite(fill.timestamp))
    .sort((left, right) => left.timestamp - right.timestamp)

  normalizedFills.forEach((fill) => {
    const lots = openLotsBySymbol.get(fill.symbol) || []

    if (fill.type === 'buy') {
      lots.push({
        tradeId: fill.tradeId,
        ordertxid: fill.ordertxid,
        symbol: fill.symbol,
        date: new Date(fill.timestamp),
        remainingQty: fill.qty,
        price: fill.price,
        fee: fill.fee
      })
      openLotsBySymbol.set(fill.symbol, lots)
      return
    }

    let remainingSellQty = fill.qty
    let consumedQty = 0
    let entryCost = 0
    let allocatedEntryFee = 0
    let firstEntryDate: Date | null = null
    let firstEntryOrderId: string | null = null
    const consumedTradeIds: string[] = []

    while (remainingSellQty > epsilon && lots.length) {
      const currentLot = lots[0]!
      const matchedQty = Math.min(currentLot.remainingQty, remainingSellQty)
      const lotShare = matchedQty / currentLot.remainingQty

      if (!firstEntryDate) {
        firstEntryDate = currentLot.date
      }
      if (!firstEntryOrderId && currentLot.ordertxid) {
        firstEntryOrderId = currentLot.ordertxid
      }

      consumedQty += matchedQty
      entryCost += matchedQty * currentLot.price
      allocatedEntryFee += currentLot.fee * lotShare
      if (!consumedTradeIds.includes(currentLot.tradeId)) {
        consumedTradeIds.push(currentLot.tradeId)
      }

      currentLot.remainingQty -= matchedQty
      currentLot.fee -= currentLot.fee * lotShare
      remainingSellQty -= matchedQty

      if (currentLot.remainingQty <= epsilon) {
        lots.shift()
      }
    }

    if (consumedQty <= epsilon || !firstEntryDate) {
      openLotsBySymbol.set(fill.symbol, lots)
      return
    }

    const proceeds = consumedQty * fill.price
    const exitFee = fill.fee * (consumedQty / fill.qty)
    const profit = proceeds - entryCost - allocatedEntryFee - exitFee
    const resolvedAsset = resolveImportedAsset(fill.symbol, 'crypto-broker')

    let stopLoss: number | undefined
    let takeProfit: number | undefined
    if (firstEntryOrderId && ordersMap[firstEntryOrderId]) {
      const order = ordersMap[firstEntryOrderId]
      const parsed = parseStopLossTakeProfitFromDescr(order.descr?.close)
      stopLoss = parsed.stopLoss
      takeProfit = parsed.takeProfit
    }

    roundTrips.push({
      id: `kraken-spot-close-${fill.tradeId}`,
      date: firstEntryDate,
      dateExit: new Date(fill.timestamp),
      asset: resolvedAsset.symbol,
      side: 'Long',
      entry: entryCost / consumedQty,
      exit: fill.price,
      size: consumedQty,
      entryFee: allocatedEntryFee,
      exitFee,
      currency: inferQuoteCurrency(fill.symbol),
      assetType: resolvedAsset.assetType,
      assetIcon: resolvedAsset.assetIcon,
      profitInCurrency: profit,
      result: profit,
      stopLoss,
      takeProfit,
      notes: `Imported from Kraken spot round trip.\nOpenTrades: ${consumedTradeIds.join(', ')}\nCloseTrade: ${fill.tradeId}\nPair: ${fill.pair}\nOrderType: ${fill.ordertype}\nAssetMatch: ${resolvedAsset.matchSource || 'none'}${stopLoss ? `\nStopLoss: ${stopLoss}` : ''}${takeProfit ? `\nTakeProfit: ${takeProfit}` : ''}`,
      source: 'kraken',
      sourceExternalId: `spot-close:${fill.tradeId}`,
      sourcePlatform: 'Kraken Spot'
    } as DiaryEntry & { sourceExternalId: string; sourcePlatform: string })

    openLotsBySymbol.set(fill.symbol, lots)
  })

  return roundTrips
}

const buildKrakenFuturesRoundTrips = (fills: KrakenFuturesFill[]) => {
  type OpenLot = {
    fillId: string
    symbol: string
    side: 'Long' | 'Short'
    date: Date
    remainingQty: number
    price: number
    fee: number
  }

  const epsilon = 1e-10
  const openLotsBySymbol = new Map<string, OpenLot[]>()
  const roundTrips: Array<DiaryEntry & { sourceExternalId: string; sourcePlatform: string }> = []

  const normalizedFills = fills
    .map(fill => {
      const symbol = normalizeKrakenFuturesSymbol(fill.symbol)
      const qty = Number(fill.size || 0)
      const price = Number(fill.price || 0)
      const fee = Number(fill.fee ?? fill.feePaid ?? 0) || 0
      const timestamp = parseKrakenFuturesTimestamp(readKrakenFuturesFillTimestamp(fill))

      return {
        ...fill,
        symbol,
        qty,
        price,
        fee,
        timestamp
      }
    })
    .filter(fill => fill.symbol && fill.qty > epsilon && fill.price > epsilon && Number.isFinite(fill.timestamp))
    .sort((left, right) => left.timestamp - right.timestamp)

  normalizedFills.forEach((fill) => {
    const lots = openLotsBySymbol.get(fill.symbol) || []
    const closingSide = fill.side === 'buy' ? 'Short' : 'Long'
    const openingSide = fill.side === 'buy' ? 'Long' : 'Short'
    let remainingQty = fill.qty
    let consumedQty = 0
    let entryCost = 0
    let allocatedEntryFee = 0
    let firstEntryDate: Date | null = null
    const consumedFillIds: string[] = []

    while (remainingQty > epsilon && lots.length && lots[0]?.side === closingSide) {
      const currentLot = lots[0]!
      const matchedQty = Math.min(currentLot.remainingQty, remainingQty)
      const lotShare = matchedQty / currentLot.remainingQty

      if (!firstEntryDate) {
        firstEntryDate = currentLot.date
      }

      consumedQty += matchedQty
      entryCost += matchedQty * currentLot.price
      allocatedEntryFee += currentLot.fee * lotShare
      if (!consumedFillIds.includes(currentLot.fillId)) {
        consumedFillIds.push(currentLot.fillId)
      }

      currentLot.remainingQty -= matchedQty
      currentLot.fee -= currentLot.fee * lotShare
      remainingQty -= matchedQty

      if (currentLot.remainingQty <= epsilon) {
        lots.shift()
      }
    }

    if (consumedQty > epsilon && firstEntryDate) {
      const exitFee = fill.fee * (consumedQty / fill.qty)
      const side = closingSide
      const profit = side === 'Long'
        ? (fill.price * consumedQty) - entryCost - allocatedEntryFee - exitFee
        : entryCost - (fill.price * consumedQty) - allocatedEntryFee - exitFee
      const resolvedAsset = resolveImportedAsset(fill.symbol, 'crypto-broker')

      roundTrips.push({
        id: `kraken-futures-close-${fill.fill_id}`,
        date: firstEntryDate,
        dateExit: new Date(fill.timestamp),
        asset: resolvedAsset.symbol,
        side,
        entry: entryCost / consumedQty,
        exit: fill.price,
        size: consumedQty,
        entryFee: allocatedEntryFee,
        exitFee,
        currency: inferQuoteCurrency(fill.symbol),
        assetType: resolvedAsset.assetType,
        assetIcon: resolvedAsset.assetIcon,
        profitInCurrency: profit,
        result: profit,
        notes: `Imported from Kraken Futures.\nOpenFills: ${consumedFillIds.join(', ')}\nCloseFill: ${fill.fill_id}\nOrderId: ${fill.order_id}\nSymbol: ${fill.symbol}\nCloseTimeRaw: ${readKrakenFuturesFillTimestamp(fill) || 'unknown'}\nFillType: ${fill.fillType || 'unknown'}\nAssetMatch: ${resolvedAsset.matchSource || 'none'}`,
        source: 'kraken-futures',
        sourceExternalId: `futures-close:${fill.fill_id}`,
        sourcePlatform: 'Kraken Futures'
      } as DiaryEntry & { sourceExternalId: string; sourcePlatform: string })
    }

    if (remainingQty > epsilon) {
      lots.push({
        fillId: fill.fill_id,
        symbol: fill.symbol,
        side: openingSide,
        date: new Date(fill.timestamp),
        remainingQty,
        price: fill.price,
        fee: fill.fee * (remainingQty / fill.qty)
      })
    }

    openLotsBySymbol.set(fill.symbol, lots)
  })

  return roundTrips
}

const normalizeKrakenPair = (pair: string) => {
  return String(pair || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/^XXBT/, 'BTC')
    .replace(/^XBT/, 'BTC')
    .replace(/^XETH/, 'ETH')
    .replace(/^X(?=[A-Z0-9]{3,})/, '')
    .replace(/^Z(?=[A-Z0-9]{3,})/, '')
    .replace(/XXBT$/, 'BTC')
    .replace(/XBT$/, 'BTC')
    .replace(/ZUSD$/, 'USD')
    .replace(/ZEUR$/, 'EUR')
    .replace(/ZGBP$/, 'GBP')
}

const parseKrakenSpotTimestamp = (value: number | string) => {
  const numeric = Number(value || 0)
  if (!Number.isFinite(numeric) || numeric <= 0) return Number.NaN
  return numeric > 1_000_000_000_000 ? numeric : numeric * 1000
}

const readKrakenFuturesFillTimestamp = (fill: KrakenFuturesFill) => {
  const candidates = [fill.fillTime, fill.fill_time, fill.time, fill.timestamp, fill.lastUpdateTimestamp]
    .filter(value => value !== undefined && value !== null && value !== '') as Array<string | number>

  return candidates.find(hasIntradayTimestampPrecision) ?? candidates[0] ?? ''
}

const parseKrakenFuturesTimestamp = (value: string | number) => {
  const str = String(value || '').trim()
  if (/^\d+(\.\d+)?$/.test(str)) {
    const numeric = Number(str)
    return numeric > 1_000_000_000_000 ? numeric : numeric * 1000
  }

  const parsed = Date.parse(str)
  if (Number.isFinite(parsed) && !isNaN(parsed)) return parsed

  return Number.NaN
}

const hasIntradayTimestampPrecision = (value: string | number) => {
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 0) return true

  const parsed = Date.parse(String(value || ''))
  if (!Number.isFinite(parsed)) return false

  const date = new Date(parsed)
  return date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0 || date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0
}

const normalizeKrakenFuturesSymbol = (symbol: string) => {
  const normalized = String(symbol || '').toUpperCase().replace(/[^A-Z0-9_]/g, '')
  const compact = normalized
    .replace(/^PF_/, '')
    .replace(/^FI_/, '')
    .replace(/_[0-9]{6,8}$/, '')
    .replace(/^XBT/, 'BTC')
    .replace(/XBT/, 'BTC')

  return compact
}

const inferQuoteCurrency = (symbol: string) => {
  const quotes = ['USDT', 'USDC', 'USD', 'EUR', 'GBP', 'BTC', 'ETH']
  return quotes.find(quote => symbol.endsWith(quote)) || 'USD'
}

const readBybitSpotFee = (order: BybitHistoricOrder) => {
  const detail = order.cumFeeDetail
  if (detail && typeof detail === 'object') {
    return Object.values(detail)
      .map(value => Number(value || 0))
      .filter(Number.isFinite)
      .reduce((sum, value) => sum + value, 0)
  }

  return Number(order.cumExecFee || 0) || 0
}

const deactivateCurrentConnection = async () => {
  const key = getStorageKeyForBrokerSelection(selectedBroker.value.id)
  const existing = connectionMap.value[key]
  
  // If no existing connection for the main key, but it's Kraken, we might still need to clear legacy/spot
  if (!existing && selectedBroker.value.id !== 'kraken') return

  activationState.value = 'loading'
  statusTone.value = 'neutral'
  statusMessage.value = 'Deactivating connector...'

  try {
    if (existing) {
      connectionMap.value[key] = {
        ...existing,
        active: false,
        updatedAt: new Date().toISOString()
      }
    }
    
    // Explicitly deactivate all Kraken legacy modes to clear the green circle
    if (selectedBroker.value.id === 'kraken') {
      if (connectionMap.value['kraken']) {
        connectionMap.value['kraken'].active = false
      }
      if (connectionMap.value['kraken-spot']) {
        connectionMap.value['kraken-spot'].active = false
      }
      if (connectionMap.value['kraken-futures']) {
        connectionMap.value['kraken-futures'].active = false
      }
    }

    await persistConnections()
    statusTone.value = 'success'
    statusMessage.value = `${selectedBroker.value.label} connector deactivated.`
  } catch (error: any) {
    statusTone.value = 'error'
    statusMessage.value = error?.message || 'Connector deactivation failed.'
  } finally {
    activationState.value = 'idle'
  }
}
watch(selectedBrokerId, () => {
  statusMessage.value = ''
  statusTone.value = 'neutral'
  resetFormForBroker()
})

onMounted(async () => {
  await tradeStore.init()
  await loadConnections()
})
</script>
