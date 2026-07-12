<script setup>

import { inject } from 'vue';
import { useI18n } from '~/shared/i18n/useI18n';
const emit = defineEmits(['close']);
const { locale } = useI18n();


const { themeStore, isDark, viewMode, journalEntries, getArchiveNodeName, addJournalEntry, removeJournalEntry, addJournalEntryTag, removeJournalEntryTag, handleImageUpload, triggerUpload, showCmeNotice, rememberCmeNotice, closeCmeNotice, showAssetMenu, asset, assetSearch, filteredAssets, currentAssetData, selectAsset, matrixNodes, matrixConnections, matrixZones, isMatrixLoading, loadMatrixData, tradeStore, strategies, selectedStrategyId, selectedStrategy, findAllNodes, findAllConnections, findNodeById, activeRiskManagement, activeRiskPerTradeDollars, activeRiskSnapshot, actualRR, actualRiskPercent, violatesRR, violatesRiskPerTrade, riskViolationMessage, normalizeRiskInputs, blockInvalidRiskInput, blockInvalidRiskPaste, getReachableNodes, getNodeZoneType, showStrategyMenu, failedIcons, handleIconError, closeAssetMenu, selectedScenarioNode, getNodesForStrategy, DEFAULT_ENTRY_CONDITIONS, DEFAULT_ENTRY_SCENARIOS, DEFAULT_EXIT_CONDITIONS, DEFAULT_EXIT_SCENARIOS, entryConditions, entryScenarios, exitConditions, exitScenarios, miniExitScenarios, regularExitScenarios, filteredRegistryEntryScenarios, filteredRegistryExitScenarios, currentRegistryScenarioConditions, mismatchedNodeIds, hasVectorMismatch, activeConditions, toggleCondition, showConditionLibrary, showEmotionSelector, registrySearchQuery, libraryFilter, filteredLibraryScenarios, flatLibraryConditions, selectedRegistryScenarioId, hoverTimeout, hoveredScenarioId, handleMouseEnterScenario, handleMouseLeaveScenario, handleMouseEnterInsight, getActiveConditionsInScenario, isScenarioSelected, handleMouseLeaveInsight, getScenarioConditions, getFlattenedScenarioConditions, activeSector, sectors, side, entry, exit, size, entryFee, exitFee, feeType, resultMode, showEntryMethod, activeProtocolTab, entryMethodType, pyramidingEntries, averagingDownEntries, activeMultipleEntries, entryMethodEnabled, hasActiveMethodNode, addMultipleEntry, exitEntries, exitMethodEnabled, totalExitSize, averageExit, addExitEntry, removeExitEntry, removeMultipleEntry, showAutoPrompt, autoEntryBasePrice, autoEntryBaseLots, toggleAutoPrompt, confirmAutoGenerate, totalSize, averageEntry, isForex, isManualEntryAsset, isFixedFeeAsset, overridePnl, liveRates, FALLBACK_RATES, fetchLiveRates, getRate, EMOTION_LIBRARY, emotionsByCategory, showEmotions, selectedEmotions, hoveredEmotion, mousePos, EMOTION_OPPOSITES, toggleEmotion, isEmotionDisabled, stopLoss, takeProfit, openDate, exitDate, cloneDate, adjustDate, formatPart, handleManualDate, projectedProfit, hasValidProjection, equityCurveTrades, isTemporalOpen, activeTemporalTarget, _now, tempDateParts, syncTempParts, openTemporal, scrollContainer, pnl, commitState, resetForm, submit, initialTrade } = inject('tradeState');
</script>

<template>
<!-- BOTTOM PANEL (NIER CHASSIS) -->
    <Transition name="nier-fade">
      <div v-if="!showEntryMethod" class="fixed bottom-0 mb-4 left-1/2 -translate-x-1/2 z-[1100] font-sans">
        
        <!-- NIER SECTOR TABS AND SWITCHER -->
      <div class="flex justify-between items-end w-full px-2 max-w-5xl">
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

        <div class="flex gap-0.5 bg-black/60 p-1 border-t border-l border-r border-white/30 shrink-0">
          <button @click="resultMode = 'auto'" :class="resultMode === 'auto' ? 'bg-white text-black' : 'bg-[#0a0a0a]/80 text-white/70 hover:bg-[#222] hover:text-white'" class="px-4 py-1.5 transition-all relative group text-[8px] uppercase tracking-[0.4em] font-black">{{ locale === 'ru' ? 'АВТО' : 'AUTO' }}</button>
          <button @click="resultMode = 'manual'" :class="resultMode === 'manual' ? 'bg-white text-black' : 'bg-[#0a0a0a]/80 text-white/70 hover:bg-[#222] hover:text-white'" class="px-4 py-1.5 transition-all relative group text-[8px] uppercase tracking-[0.4em] font-black">{{ locale === 'ru' ? 'РУЧНАЯ' : 'MANUAL' }}</button>
        </div>
      </div>

      <!-- MAIN CHASSIS -->
      <div class="relative flex items-center bg-[#0a0a0a]/80 border border-white/30 px-8 h-16 max-w-5xl w-full transition-all duration-500 ">
        
        <div class="absolute inset-0 pointer-events-none opacity-[0.08] overflow-hidden">
          <div class="w-full h-px bg-white animate-scan"></div>
        </div>

        <div class="flex items-center gap-10 flex-1 relative z-10">
          
          <!-- BLOCK: ID -->
          <div class="flex items-center gap-6 pr-8 border-r border-white/10 w-[240px] shrink-0">
            <div class="flex flex-col gap-0.5 text-left relative asset-select-container">
              <span class="text-[7px] uppercase tracking-[0.4em] font-bold text-white/40">System_ID</span>
              <div class="flex items-center gap-2">
                <div v-if="asset && currentAssetData" 
                     class="w-5 h-5 rounded-full overflow-hidden border border-white/20 flex items-center justify-center shrink-0 transition-colors"
                     :class="currentAssetData.type === 'Stocks' ? 'bg-white' : 'bg-white/5'">
                  <img v-if="currentAssetData.icon && !failedIcons.has(currentAssetData.symbol)" 
                       :src="currentAssetData.icon" 
                       @error="handleIconError(currentAssetData.symbol)"
                       class="w-full h-full object-contain" />
                  <span v-else 
                        class="text-[10px] font-bold uppercase transition-colors"
                        :class="currentAssetData.type === 'Stocks' ? 'text-black' : 'text-white'">
                    {{ currentAssetData.symbol[0] }}
                  </span>
                </div>
                <input v-model="asset" 
                       @focus="showAssetMenu = true"
                       @input="showAssetMenu = true"
                       @click="showAssetMenu = true"
                       @keydown.esc="showAssetMenu = false"
                       placeholder="UNTITLED" 
                       class="nier-input w-full uppercase truncate"/>
              </div>

              <!-- Asset Dropdown Menu -->
              <Transition name="nier-fade">
                <div v-if="showAssetMenu" class="absolute bottom-full mb-4 left-0 w-64 bg-black border border-white/30 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] z-[200]">
                  <div class="px-4 py-2 border-b border-white/10 flex items-center justify-between">
                    <span class="text-[8px] uppercase tracking-widest text-white/40">Registry_Archive</span>
                    <span class="text-[8px] text-white/20">{{ filteredAssets.length }}_Results</span>
                  </div>
                  <div class="max-h-60 overflow-y-auto custom-scrollbar">
                    <div v-for="a in filteredAssets" :key="a.symbol"
                         @click="selectAsset(a)"
                         class="group/asset flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/20 transition-all">
                      <div class="w-7 h-7 rounded-full overflow-hidden border border-white/10 group-hover/asset:border-black flex items-center justify-center shrink-0 transition-colors"
                           :class="a.type === 'Stocks' ? 'bg-white' : 'bg-white/5'">
                        <img v-if="a.icon && !failedIcons.has(a.symbol)" 
                             :src="a.icon" 
                             @error="handleIconError(a.symbol)"
                             class="w-full h-full object-contain" />
                        <span v-else 
                              class="text-[12px] font-black uppercase transition-colors"
                              :class="a.type === 'Stocks' ? 'text-black' : 'text-white'">
                          {{ a.symbol[0] }}
                        </span>
                      </div>
                      <div class="flex flex-col flex-1 min-w-0">
                        <span class="text-[10px] font-bold tracking-widest text-white">{{ a.symbol }}</span>
                        <span class="text-[8px] text-white/40 truncate  uppercase tracking-tighter">{{ a.name }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
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
          <div class="flex-1">
            <Transition name="sector-swap" mode="out-in">
              <div v-if="activeSector === 'core'" :key="'core'" class="flex items-center gap-10">
                <div class="flex flex-col gap-0.5 text-left" :class="{ 'opacity-50 pointer-events-none': entryMethodEnabled }">
                  <span class="text-[7px] uppercase tracking-[0.4em] font-bold transition-colors" :class="entryMethodEnabled ? 'text-amber-500/80' : 'text-white/40'">
                     {{ entryMethodEnabled ? 'Avg_Entry_Lvl' : 'Entry_Lvl' }}
                  </span>
                  <input v-if="!entryMethodEnabled" v-model="entry" type="number" placeholder="0.00" class="nier-input w-20 font-mono"/>
                  <span v-else class="text-[11px] font-mono font-bold tracking-[0.15em] text-white">{{ averageEntry > 0 ? averageEntry.toFixed(5) : '0.00' }}</span>
                </div>
                <div class="flex flex-col gap-0.5 text-left" :class="{ 'opacity-50 pointer-events-none': exitMethodEnabled }">
                  <span class="text-[7px] uppercase tracking-[0.4em] font-bold transition-colors" :class="exitMethodEnabled ? 'text-amber-500/80' : 'text-white/40'">
                    {{ exitMethodEnabled ? 'Avg_Exit_Lvl' : 'Exit_Lvl' }}
                  </span>
                  <input v-if="!exitMethodEnabled" v-model="exit" type="number" placeholder="0.00" class="nier-input w-20 font-mono"/>
                  <span v-else class="text-[11px] font-mono font-bold tracking-[0.15em] text-white">{{ averageExit > 0 ? averageExit.toFixed(5) : '0.00' }}</span>
                </div>
                <div class="flex flex-col gap-0.5 text-left" :class="{ 'opacity-50 pointer-events-none': entryMethodEnabled }">
                  <span class="text-[7px] uppercase tracking-[0.4em] font-bold transition-colors" :class="entryMethodEnabled ? 'text-amber-500/80' : 'text-white/40'">
                    {{ entryMethodEnabled ? 'Total_Vol' : (isForex ? 'Lot_Size' : 'Unit_Qty') }}
                  </span>
                  <input v-if="!entryMethodEnabled" v-model="size" type="number" step="0.01" :placeholder="isForex ? '0.01' : '1.0'" class="nier-input w-16 font-mono"/>
                  <span v-else class="text-[11px] font-mono font-bold tracking-[0.15em] text-white">{{ totalSize > 0 ? totalSize.toFixed(2) : '0.00' }}</span>
                </div>
              </div>

              <div v-else-if="activeSector === 'risk'" :key="'risk'" class="flex items-center gap-8">
                <div class="flex items-center gap-10">
                  <div class="flex flex-col gap-0.5 text-left">
                    <span class="text-[7px] uppercase tracking-[0.4em] font-bold text-rose-500/60">Stop_Loss</span>
                    <input
                      v-model="stopLoss"
                      type="number"
                      placeholder="0.00"
                      class="nier-input w-24 font-mono text-rose-400"
                      :min="side === 'short' ? ((entryMethodEnabled ? averageEntry : +entry) || undefined) : undefined"
                      :max="side === 'long' ? ((entryMethodEnabled ? averageEntry : +entry) || undefined) : undefined"
                      @beforeinput="blockInvalidRiskInput($event, 'stopLoss')"
                      @paste="blockInvalidRiskPaste($event, 'stopLoss')"
                      @change="normalizeRiskInputs"
                      @blur="normalizeRiskInputs"
                    />
                  </div>
                  <div class="flex flex-col gap-0.5 text-left">
                    <span class="text-[7px] uppercase tracking-[0.4em] font-bold text-emerald-500/60">Take_Profit</span>
                    <input
                      v-model="takeProfit"
                      type="number"
                      placeholder="0.00"
                      class="nier-input w-24 font-mono text-emerald-400"
                      :min="side === 'long' ? ((entryMethodEnabled ? averageEntry : +entry) || undefined) : undefined"
                      :max="side === 'short' ? ((entryMethodEnabled ? averageEntry : +entry) || undefined) : undefined"
                      @beforeinput="blockInvalidRiskInput($event, 'takeProfit')"
                      @paste="blockInvalidRiskPaste($event, 'takeProfit')"
                      @change="normalizeRiskInputs"
                      @blur="normalizeRiskInputs"
                    />
                  </div>
                </div>
              </div>

              <div v-else-if="activeSector === 'time'" :key="'time'" class="flex items-center gap-12">
                <div v-for="t in ['open', 'exit']" :key="t" 
                     @click="openTemporal(t)"
                     class="flex flex-col gap-1 cursor-pointer group/time hover:translate-y-[-2px] transition-all">
                  <span class="text-[7px] uppercase tracking-[0.3em] font-bold text-white/30 group-hover/time:text-white/60 transition-colors">{{ t.toUpperCase() }}_SYNC</span>
                  <div class="flex items-center gap-3 font-mono text-[11px] text-white/80 group-hover/time:text-white">
                    <span>{{ formatPart(t === 'open' ? openDate : exitDate, 'year') }}.{{ formatPart(t === 'open' ? openDate : exitDate, 'month') }}.{{ formatPart(t === 'open' ? openDate : exitDate, 'day') }}</span>
                    <span class="opacity-20">/</span>
                    <span class="tracking-widest">{{ formatPart(t === 'open' ? openDate : exitDate, 'hour') }}:{{ formatPart(t === 'open' ? openDate : exitDate, 'minute') }}</span>
                  </div>
                </div>
              </div>

              <div v-else-if="activeSector === 'fee'" :key="'fee'" class="flex items-center gap-8">
                <button @click="!isFixedFeeAsset && (feeType = feeType === '%' ? '$' : '%')" 
                        :class="[isFixedFeeAsset ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10']"
                        class="flex items-center justify-center w-6 h-6 text-xl font-mono font-bold shrink-0 transition-colors">
                  {{ feeType }}
                </button>

                <div class="flex flex-col gap-0.5 text-left">
                  <span class="text-[7px] uppercase tracking-[0.4em] font-bold text-amber-500/60">
                    {{ locale === 'ru' ? 'ВХОДНАЯ КОМ.' : 'ENTRY_FEE' }}
                  </span>
                  <input v-model="entryFee" type="number" placeholder="0.00" class="nier-input w-20 font-mono text-amber-400"/>
                </div>
                
                <div class="flex flex-col gap-0.5 text-left">
                  <span class="text-[7px] uppercase tracking-[0.4em] font-bold text-amber-500/60">
                    {{ locale === 'ru' ? 'ВЫХОДНАЯ КОМ.' : 'EXIT_FEE' }}
                  </span>
                  <input v-model="exitFee" type="number" placeholder="0.00" class="nier-input w-20 font-mono text-amber-400"/>
                </div>
              </div>
            </Transition>
          </div>

          <!-- BLOCK: OUTPUT -->
          <div class="flex items-center gap-10 pl-8 border-l border-white/10 w-[240px] shrink-0 justify-end">
            <div class="flex flex-col items-end gap-0.5">
              <span class="text-[7px] uppercase tracking-[0.4em] font-bold text-white/40">Yield_Est</span>
              <div v-if="resultMode === 'manual'" class="flex items-center">
                <input v-model.number="pnl" 
                       type="number" 
                       step="1"
                       class="nier-input w-24 text-right pr-1 font-mono" 
                       :class="pnl >= 0 ? 'text-white' : '!text-rose-400'" />
              </div>
              <div v-else class="text-sm font-mono font-bold tabular-nums tracking-tighter" :class="pnl >= 0 ? 'text-white' : 'text-rose-400'">
                {{ pnl > 0 ? '+' : '' }}{{ pnl.toFixed(2) }}
              </div>
            </div>

            <button @click="submit" :disabled="commitState !== 'idle'"
                    class="group relative h-9 px-6 bg-white/10 border border-white/30 transition-all duration-300 flex items-center justify-center min-w-[120px]"
                    :class="commitState === 'idle' ? 'hover:bg-white cursor-pointer' : 'cursor-not-allowed'">
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
    </Transition>
    
</template>
