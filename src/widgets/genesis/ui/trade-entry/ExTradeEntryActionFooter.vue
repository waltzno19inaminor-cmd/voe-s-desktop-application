<script setup>

import { inject } from 'vue';
import { useI18n } from '~/shared/i18n/useI18n';
import ExPanel from '~/shared/ui/ExPanel.vue';
const emit = defineEmits(['close']);
const { locale } = useI18n();
const tr = (ru, en) => locale.value === 'ru' ? ru : en;
const { setResultMode } = inject('tradeState');

const assetTypeLocales = {
  'ALL': { en: 'ALL', ru: 'ВСЕ' },
  'US Equities': { en: 'US Equities', ru: 'АКЦИИ' },
  'Crypto': { en: 'Crypto', ru: 'КРИПТО' },
  'Forex': { en: 'Forex', ru: 'ФОРЕКС' },
  'Commodities': { en: 'Commodities', ru: 'СЫРЬЕ' },
  'Indices': { en: 'Indices', ru: 'ИНДЕКСЫ' },
  'Stocks': { en: 'Stocks', ru: 'АКЦИИ' }
};

const getAssetTypeLoc = (type) => {
  if (!type) return '';
  return assetTypeLocales[type]?.[locale.value] || type;
};


const { themeStore, isDark, viewMode, journalEntries, getArchiveNodeName, addJournalEntry, removeJournalEntry, addJournalEntryTag, removeJournalEntryTag, handleImageUpload, triggerUpload, showCmeNotice, rememberCmeNotice, closeCmeNotice, showAssetMenu, asset, assetSearch, assetTypeFilter, filteredAssets, currentAssetData, selectAsset, matrixNodes, matrixConnections, matrixZones, isMatrixLoading, loadMatrixData, tradeStore, strategies, selectedStrategyId, selectedStrategy, findAllNodes, findAllConnections, findNodeById, activeRiskManagement, activeRiskPerTradeDollars, activeRiskSnapshot, actualRR, actualRiskPercent, violatesRR, violatesRiskPerTrade, riskViolationMessage, normalizeRiskInputs, sanitizeTradeNumberInput, getReachableNodes, getNodeZoneType, showStrategyMenu, failedIcons, handleIconError, closeAssetMenu, selectedScenarioNode, getNodesForStrategy, DEFAULT_ENTRY_CONDITIONS, DEFAULT_ENTRY_SCENARIOS, DEFAULT_EXIT_CONDITIONS, DEFAULT_EXIT_SCENARIOS, entryConditions, entryScenarios, exitConditions, exitScenarios, miniExitScenarios, regularExitScenarios, filteredRegistryEntryScenarios, filteredRegistryExitScenarios, currentRegistryScenarioConditions, mismatchedNodeIds, hasVectorMismatch, activeConditions, toggleCondition, showConditionLibrary, showEmotionSelector, registrySearchQuery, libraryFilter, filteredLibraryScenarios, flatLibraryConditions, selectedRegistryScenarioId, hoverTimeout, hoveredScenarioId, handleMouseEnterScenario, handleMouseLeaveScenario, handleMouseEnterInsight, getActiveConditionsInScenario, isScenarioSelected, handleMouseLeaveInsight, getScenarioConditions, getFlattenedScenarioConditions, activeSector, sectors, side, isClosed, entry, exit, size, entryFee, exitFee, feeType, resultMode, showEntryMethod, activeProtocolTab, entryMethodType, pyramidingEntries, averagingDownEntries, activeMultipleEntries, entryMethodEnabled, hasActiveMethodNode, addMultipleEntry, exitEntries, exitMethodEnabled, totalExitSize, averageExit, addExitEntry, removeExitEntry, removeMultipleEntry, showAutoPrompt, autoEntryBasePrice, autoEntryBaseLots, toggleAutoPrompt, confirmAutoGenerate, totalSize, averageEntry, isForex, isManualEntryAsset, isFixedFeeAsset, overridePnl, liveRates, FALLBACK_RATES, fetchLiveRates, getRate, EMOTION_LIBRARY, emotionsByCategory, showEmotions, selectedEmotions, hoveredEmotion, mousePos, EMOTION_OPPOSITES, toggleEmotion, isEmotionDisabled, stopLoss, takeProfit, openDate, exitDate, cloneDate, adjustDate, formatPart, handleManualDate, projectedProfit, hasValidProjection, equityCurveTrades, isTemporalOpen, activeTemporalTarget, _now, tempDateParts, syncTempParts, openTemporal, scrollContainer, pnl, commitState, resetForm, submit, initialTrade } = inject('tradeState');
const forexCurrencyCodes = new Set(['AUD', 'CAD', 'CHF', 'EUR', 'GBP', 'JPY', 'NZD', 'USD'])
const getForexCurrencyPair = (symbol) => {
  const match = String(symbol || '').toUpperCase().replace(/[^A-Z]/g, '').match(/^([A-Z]{3})([A-Z]{3})$/)
  if (!match || !forexCurrencyCodes.has(match[1]) || !forexCurrencyCodes.has(match[2])) return null

  return {
    base: `/assets_icons/currency-${match[1].toLowerCase()}.svg`,
    quote: `/assets_icons/currency-${match[2].toLowerCase()}.svg`
  }
}
</script>

<template>
<!-- BOTTOM PANEL (NIER CHASSIS) -->
    <Transition name="trade-footer-fade">
      <div v-if="!showEntryMethod" class="pointer-events-none fixed inset-x-0 bottom-0 z-[1100] mb-4 flex justify-center px-6 font-sans">
        <div class="pointer-events-auto w-full max-w-5xl">
        
        <!-- NIER SECTOR TABS AND SWITCHER -->
      <div class="flex justify-between items-end w-full px-2">
        <div class="flex gap-0.5 bg-black/60 p-1 border-t border-l border-r border-white/30">
          <button 
            v-for="sector in sectors" 
            :key="sector.id"
            @click="activeSector = sector.id"
            class="px-5 py-1.5 transition-all duration-300 relative group"
            :class="activeSector === sector.id ? 'bg-white text-black' : 'bg-[#0a0a0a]/80 text-white/70 hover:bg-[#222] hover:text-white'"
          >
            <span class="text-[8px] uppercase tracking-[0.4em] font-black relative z-10">{{ sector.id === 'fee' && locale === 'ru' ? 'КОМИССИИ' : sector.label }}</span>
          </button>
        </div>

        <div class="flex gap-0.5 bg-black/60 p-1 border-t border-l border-r border-white/30 shrink-0" :class="{ 'opacity-40 pointer-events-none': !isClosed }">
          <button @click="isClosed && setResultMode('auto')" :class="resultMode === 'auto' ? 'bg-white text-black' : 'bg-[#0a0a0a]/80 text-white/70 hover:bg-[#222] hover:text-white'" class="px-4 py-1.5 transition-all relative group text-[8px] uppercase tracking-[0.4em] font-black">{{ locale === 'ru' ? 'АВТО' : 'AUTO' }}</button>
          <button @click="isClosed && setResultMode('manual')" :class="resultMode === 'manual' ? 'bg-white text-black' : 'bg-[#0a0a0a]/80 text-white/70 hover:bg-[#222] hover:text-white'" class="px-4 py-1.5 transition-all relative group text-[8px] uppercase tracking-[0.4em] font-black">{{ locale === 'ru' ? 'РУЧНАЯ' : 'MANUAL' }}</button>
        </div>
      </div>

      <!-- MAIN CHASSIS -->
      <div class="relative flex h-16 w-full items-center bg-[#0a0a0a]/80 border border-white/30 px-8">
        
        <div class="absolute inset-0 pointer-events-none opacity-[0.08] overflow-hidden">
          <div class="w-full h-px bg-white animate-scan"></div>
        </div>

        <div class="relative z-10 grid w-full grid-cols-[250px_minmax(0,1fr)_240px] items-center gap-8">
          
          <!-- BLOCK: ID -->
          <div class="flex min-w-0 items-center gap-5 pr-6 border-r border-white/10">
            <div class="flex min-w-[150px] max-w-[220px] flex-col gap-0.5 text-left relative asset-select-container">
              <span class="text-[7px] uppercase tracking-[0.4em] font-bold text-white/40">{{ locale === 'ru' ? 'АКТИВ' : 'ASSET' }}</span>
              <div class="flex items-center gap-2 cursor-pointer group/asset-btn" @click="showAssetMenu = true">
                <div v-if="asset && currentAssetData" 
                     class="w-5 h-5 flex items-center justify-center shrink-0 transition-colors">
                  <span v-if="currentAssetData.type === 'Forex' && getForexCurrencyPair(currentAssetData.symbol)" class="relative block h-full w-full">
                    <img :src="getForexCurrencyPair(currentAssetData.symbol).base" alt="" class="absolute left-0 top-0 z-10 h-[68%] w-[68%] rounded-full object-cover" />
                    <img :src="getForexCurrencyPair(currentAssetData.symbol).quote" alt="" class="absolute bottom-0 right-0 h-[68%] w-[68%] rounded-full object-cover" />
                  </span>
                  <img v-else-if="currentAssetData.icon && !failedIcons.has(currentAssetData.symbol)"
                       :src="currentAssetData.icon" 
                       @error="handleIconError(currentAssetData.symbol)"
                       class="w-full h-full object-contain" />
                  <span v-else 
                        class="text-[10px] font-bold uppercase transition-colors"
                        :class="isDark ? 'text-white' : 'text-black'">
                    {{ currentAssetData.symbol[0] }}
                  </span>
                </div>
                <span class="truncate text-[12px] font-mono font-bold tracking-widest uppercase transition-colors group-hover/asset-btn:text-white" :class="asset ? 'text-white' : 'text-white/40'">
                  {{ asset || (locale === 'ru' ? 'Без названия' : 'Untitled') }}
                </span>
              </div>

              <!-- Asset Modal -->
              <Teleport to="body">
                <Transition name="nier-fade">
                  <div v-if="showAssetMenu" class="fixed inset-0 z-[100000] flex items-center justify-center bg-transparent" @click.self="showAssetMenu = false">
                    <div class="w-[800px] max-w-[95vw] max-h-[80vh] flex flex-col relative" @click.stop>
                      <ExPanel variant="light" :no-padding="true" :no-shadow="true" class="h-[500px] max-h-[80vh] flex flex-col bg-black/80">
                        <!-- Search Header -->
                        <div class="p-6 border-b border-white/10 flex items-center gap-4 shrink-0 bg-black/20">
                          <input v-model="assetSearch" :placeholder="locale === 'ru' ? 'Поиск активов...' : 'Search assets...'" class="w-full uppercase text-xl font-black tracking-widest bg-transparent border-0 outline-none text-white placeholder-white/20 font-mono" autofocus />
                        </div>
                        
                        <!-- Filter row -->
                        <div class="flex items-center gap-6 px-6 py-4 border-b border-white/10 overflow-x-auto custom-scrollbar shrink-0 bg-black/20">
                          <button v-for="t in ['ALL', 'US Equities', 'Crypto', 'Forex', 'Commodities', 'Indices']" :key="t"
                                  @click="assetTypeFilter = t"
                                  class="text-[9px] uppercase tracking-[0.3em] font-bold transition-all whitespace-nowrap"
                                  :class="assetTypeFilter === t ? 'text-white border-b border-white pb-0.5' : 'text-white/40 hover:text-white/70'">
                             {{ getAssetTypeLoc(t) }}
                          </button>
                        </div>
                        
                        <!-- Vertical list -->
                        <div class="flex-1 overflow-y-auto custom-scrollbar py-2">
                          <div v-for="a in filteredAssets" :key="a.symbol"
                               @click="selectAsset(a)"
                               class="group/asset flex items-center justify-start gap-4 px-6 py-4 cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/10 transition-all text-left w-full">
                            <div class="w-10 h-10 flex items-center justify-center shrink-0 transition-colors">
                              <span v-if="a.type === 'Forex' && getForexCurrencyPair(a.symbol)" class="relative block h-full w-full">
                                <img :src="getForexCurrencyPair(a.symbol).base" alt="" class="absolute left-0 top-0 z-10 h-[68%] w-[68%] rounded-full object-cover" />
                                <img :src="getForexCurrencyPair(a.symbol).quote" alt="" class="absolute bottom-0 right-0 h-[68%] w-[68%] rounded-full object-cover" />
                              </span>
                              <img v-else-if="a.icon && !failedIcons.has(a.symbol)"
                                   :src="a.icon" 
                                   @error="handleIconError(a.symbol)"
                                   class="w-full h-full object-contain" />
                              <span v-else class="text-[14px] font-black uppercase transition-colors" :class="isDark ? 'text-white' : 'text-black'">
                                {{ a.symbol[0] }}
                              </span>
                            </div>
                            <div class="flex flex-col min-w-0 flex-1 gap-0.5">
                              <span class="text-[14px] font-bold tracking-widest text-white">{{ a.symbol }}</span>
                              <span class="text-[10px] text-white/40 truncate uppercase tracking-tighter">{{ a.name }}</span>
                            </div>
                            <div class="shrink-0 text-[8px] uppercase tracking-[0.2em] text-white/20 group-hover/asset:text-white/60 border border-white/10 px-2 py-1 rounded-sm transition-colors">
                              {{ getAssetTypeLoc(a.type) }}
                            </div>
                          </div>
                          <div v-if="filteredAssets.length === 0" class="flex flex-col items-center justify-center h-full text-white/30 uppercase tracking-[0.3em] font-mono text-[10px] mt-10">
                            {{ tr('Активы не найдены', 'No assets found') }}
                          </div>
                        </div>
                      </ExPanel>
                    </div>
                  </div>
                </Transition>
              </Teleport>
            </div>

            <div class="flex flex-col gap-0.5 text-left">
              <span class="text-[7px] uppercase tracking-[0.4em] font-bold text-white/40">Vector</span>
              <button @click="side = side === 'long' ? 'short' : 'long'"
                      class="text-[11px] font-bold tracking-widest uppercase transition-colors"
                      :class="side === 'long' ? 'text-emerald-400' : 'text-rose-400'">
                {{ side }}
              </button>
            </div>
          </div>

          <!-- BLOCK: DYNAMIC DATA STREAM -->
          <div class="min-w-0">
            <Transition name="trade-footer-sector-fade" mode="out-in">
              <div v-if="activeSector === 'core'" :key="'core'" class="flex items-center gap-10">
                <div class="flex flex-col gap-0.5 text-left" :class="{ 'opacity-50 pointer-events-none': entryMethodEnabled }">
                  <span class="text-[7px] uppercase tracking-[0.4em] font-bold transition-colors" :class="entryMethodEnabled ? 'text-amber-500/80' : 'text-white/40'">
                     {{ entryMethodEnabled ? tr('Средний уровень входа', 'Average Entry Level') : tr('Уровень входа', 'Entry Level') }}
                  </span>
                  <input v-if="!entryMethodEnabled" v-model="entry" type="text" inputmode="decimal" placeholder="0.00" class="nier-input w-20 font-mono" @input="sanitizeTradeNumberInput($event, 'entry')"/>
                  <span v-else class="text-[11px] font-mono font-bold tracking-[0.15em] text-white">{{ averageEntry > 0 ? averageEntry.toFixed(5) : '0.00' }}</span>
                </div>
                <div class="flex flex-col gap-0.5 text-left" :class="{ 'opacity-50 pointer-events-none': exitMethodEnabled || !isClosed }">
                  <span class="text-[7px] uppercase tracking-[0.4em] font-bold transition-colors" :class="exitMethodEnabled ? 'text-amber-500/80' : 'text-white/40'">
                    {{ exitMethodEnabled ? tr('Средний уровень выхода', 'Average Exit Level') : tr('Уровень выхода', 'Exit Level') }}
                  </span>
                  <input v-if="!exitMethodEnabled" v-model="exit" type="text" inputmode="decimal" placeholder="0.00" class="nier-input w-20 font-mono" :disabled="!isClosed" @input="sanitizeTradeNumberInput($event, 'exit')"/>
                  <span v-else class="text-[11px] font-mono font-bold tracking-[0.15em] text-white">{{ averageExit > 0 ? averageExit.toFixed(5) : '0.00' }}</span>
                </div>
                <div class="flex flex-col gap-0.5 text-left" :class="{ 'opacity-50 pointer-events-none': entryMethodEnabled }">
                  <span class="text-[7px] uppercase tracking-[0.4em] font-bold transition-colors" :class="entryMethodEnabled ? 'text-amber-500/80' : 'text-white/40'">
                    {{ entryMethodEnabled ? tr('Общий объем', 'Total Volume') : (isForex ? tr('Размер лота', 'Lot Size') : tr('Количество единиц', 'Unit Quantity')) }}
                  </span>
                  <input v-if="!entryMethodEnabled" v-model="size" type="text" inputmode="decimal" :placeholder="isForex ? '0.01' : '1.0'" class="nier-input w-16 font-mono" @input="sanitizeTradeNumberInput($event, 'size')"/>
                  <span v-else class="text-[11px] font-mono font-bold tracking-[0.15em] text-white">{{ totalSize > 0 ? totalSize.toFixed(2) : '0.00' }}</span>
                </div>
              </div>

              <div v-else-if="activeSector === 'risk'" :key="'risk'" class="flex items-center gap-8">
                <div class="flex items-center gap-10">
                  <div class="flex flex-col gap-0.5 text-left">
                    <span class="text-[7px] uppercase tracking-[0.4em] font-bold text-rose-500/60">{{ locale === 'ru' ? 'Стоп-лосс' : 'Stop Loss' }}</span>
                    <input
                      v-model="stopLoss"
	                      type="text"
	                      inputmode="decimal"
	                      placeholder="0.00"
	                      class="nier-input w-24 font-mono text-rose-400"
	                      @input="sanitizeTradeNumberInput($event, 'stopLoss')"
	                      @change="normalizeRiskInputs"
	                      @blur="normalizeRiskInputs"
                    />
                  </div>
                  <div class="flex flex-col gap-0.5 text-left">
                    <span class="text-[7px] uppercase tracking-[0.4em] font-bold text-emerald-500/60">{{ locale === 'ru' ? 'Тейк-профит' : 'Take Profit' }}</span>
                    <input
                      v-model="takeProfit"
	                      type="text"
	                      inputmode="decimal"
	                      placeholder="0.00"
	                      class="nier-input w-24 font-mono text-emerald-400"
	                      @input="sanitizeTradeNumberInput($event, 'takeProfit')"
	                      @change="normalizeRiskInputs"
	                      @blur="normalizeRiskInputs"
                    />
                  </div>
                </div>
              </div>

              <div v-else-if="activeSector === 'time'" :key="'time'" class="flex items-center gap-12">
                <div v-for="t in ['open', 'exit']" :key="t" 
                     @click="t === 'exit' && !isClosed ? null : openTemporal(t)"
                     class="flex flex-col gap-1 cursor-pointer group/time hover:translate-y-[-2px] transition-all"
                     :class="{ 'opacity-40 pointer-events-none': t === 'exit' && !isClosed }">
                  <span class="text-[7px] uppercase tracking-[0.3em] font-bold text-white/30 group-hover/time:text-white/60 transition-colors">{{ t.toUpperCase() }}_SYNC</span>
                  <div class="flex items-center gap-3 font-mono text-[11px] text-white/80 group-hover/time:text-white">
                    <span>{{ t === 'exit' && !isClosed ? '--' : `${formatPart(t === 'open' ? openDate : exitDate, 'year')}.${formatPart(t === 'open' ? openDate : exitDate, 'month')}.${formatPart(t === 'open' ? openDate : exitDate, 'day')}` }}</span>
                    <span class="opacity-20">/</span>
                    <span class="tracking-widest">{{ t === 'exit' && !isClosed ? '--' : `${formatPart(t === 'open' ? openDate : exitDate, 'hour')}:${formatPart(t === 'open' ? openDate : exitDate, 'minute')}` }}</span>
                  </div>
                </div>
              </div>

              <div v-else-if="activeSector === 'fee'" :key="'fee'" class="flex items-center gap-8">
                <button @click="!isFixedFeeAsset && (feeType = feeType === '%' ? '$' : '%')" 
                        :class="[isFixedFeeAsset ? 'opacity-30' : 'hover:bg-white/10']"
                        class="flex items-center justify-center w-6 h-6 text-xl font-mono font-bold text-white shrink-0 transition-colors">
                  {{ feeType }}
                </button>

                <div class="flex flex-col gap-0.5 text-left">
                  <span class="text-[7px] uppercase tracking-[0.4em] font-bold text-amber-500/60">
                    {{ tr('Комиссия входа', 'Entry Fee') }}
                  </span>
                  <input v-model="entryFee" type="text" inputmode="decimal" placeholder="0.00" class="nier-input w-20 font-mono text-amber-400" @input="sanitizeTradeNumberInput($event, 'entryFee')"/>
                </div>
                
                <div class="flex flex-col gap-0.5 text-left" :class="{ 'opacity-40 pointer-events-none': !isClosed }">
                  <span class="text-[7px] uppercase tracking-[0.4em] font-bold text-amber-500/60">
                    {{ tr('Комиссия выхода', 'Exit Fee') }}
                  </span>
                  <input v-model="exitFee" type="text" inputmode="decimal" placeholder="0.00" class="nier-input w-20 font-mono text-amber-400" @input="sanitizeTradeNumberInput($event, 'exitFee')"/>
                </div>
              </div>
            </Transition>
          </div>

          <!-- BLOCK: OUTPUT -->
          <div class="flex items-center gap-10 pl-8 border-l border-white/10 w-[240px] shrink-0 justify-end">
            <div class="flex flex-col items-end gap-0.5">
              <span class="text-[7px] uppercase tracking-[0.4em] font-bold text-white/40">{{ locale === 'ru' ? 'Ожидаемая доходность' : 'Expected Yield' }}</span>
              <div v-if="!isClosed" class="text-[10px] font-mono font-black uppercase tracking-[0.24em] text-white/45">
                --
              </div>
              <div v-else-if="resultMode === 'manual'" class="flex items-center">
                <input v-model="pnl" 
	                       type="text" 
	                       inputmode="decimal"
	                       class="nier-input w-24 text-right pr-1 font-mono" 
	                       :class="pnl >= 0 ? 'text-white' : '!text-rose-400'"
	                       @input="sanitizeTradeNumberInput($event, 'overridePnl')" />
              </div>
              <div v-else class="text-sm font-mono font-bold tabular-nums tracking-tighter" :class="pnl >= 0 ? 'text-white' : 'text-rose-400'">
                {{ pnl > 0 ? '+' : '' }}{{ pnl.toFixed(2) }}
              </div>
            </div>

            <button @click="submit" :disabled="commitState !== 'idle'"
                    class="group relative h-9 px-6 bg-white/10 border border-white/30 transition-all duration-300 flex items-center justify-center min-w-[120px]"
                    :class="commitState === 'idle' ? 'hover:bg-white cursor-pointer' : ''">
              <span v-if="commitState === 'idle'" class="relative z-10 text-[9px] uppercase tracking-[0.5em] font-black text-white group-hover:text-black">
                {{ initialTrade ? (locale === 'ru' ? 'ОБНОВИТЬ' : 'UPDATE') : (locale === 'ru' ? 'СОХРАНИТЬ' : 'COMMIT') }}
              </span>
              <div v-else-if="commitState === 'loading'" class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              <svg v-else-if="commitState === 'success'" class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- DECOR -->
        <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/40"></div>
        <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/40"></div>
        <div class="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white/40 rotate-45 border border-black"></div>

      </div>
        </div>
    </div>
    </Transition>
    
</template>

<style scoped>
.trade-footer-fade-enter-active,
.trade-footer-fade-leave-active {
  transition: opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1), filter 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.trade-footer-fade-enter-from,
.trade-footer-fade-leave-to {
  opacity: 0;
  filter: blur(4px);
}

.trade-footer-sector-fade-enter-active,
.trade-footer-sector-fade-leave-active {
  transition: opacity 0.18s ease, filter 0.18s ease;
}

.trade-footer-sector-fade-enter-from,
.trade-footer-sector-fade-leave-to {
  opacity: 0;
  filter: blur(2px);
}
</style>
