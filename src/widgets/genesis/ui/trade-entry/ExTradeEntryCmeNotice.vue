<script setup>

import { inject } from 'vue';
import { useI18n } from '~/shared/i18n/useI18n';
const emit = defineEmits(['close']);
const { locale } = useI18n();


const { themeStore, isDark, viewMode, journalEntries, getArchiveNodeName, addJournalEntry, removeJournalEntry, addJournalEntryTag, removeJournalEntryTag, handleImageUpload, triggerUpload, showCmeNotice, rememberCmeNotice, closeCmeNotice, showAssetMenu, asset, assetSearch, filteredAssets, currentAssetData, selectAsset, matrixNodes, matrixConnections, matrixZones, isMatrixLoading, loadMatrixData, tradeStore, strategies, selectedStrategyId, selectedStrategy, findAllNodes, findAllConnections, findNodeById, activeRiskManagement, activeRiskPerTradeDollars, activeRiskSnapshot, actualRR, actualRiskPercent, violatesRR, violatesRiskPerTrade, riskViolationMessage, getReachableNodes, getNodeZoneType, showStrategyMenu, failedIcons, handleIconError, closeAssetMenu, selectedScenarioNode, getNodesForStrategy, DEFAULT_ENTRY_CONDITIONS, DEFAULT_ENTRY_SCENARIOS, DEFAULT_EXIT_CONDITIONS, DEFAULT_EXIT_SCENARIOS, entryConditions, entryScenarios, exitConditions, exitScenarios, miniExitScenarios, regularExitScenarios, filteredRegistryEntryScenarios, filteredRegistryExitScenarios, currentRegistryScenarioConditions, mismatchedNodeIds, hasVectorMismatch, activeConditions, toggleCondition, showConditionLibrary, showEmotionSelector, registrySearchQuery, libraryFilter, filteredLibraryScenarios, flatLibraryConditions, selectedRegistryScenarioId, hoverTimeout, hoveredScenarioId, handleMouseEnterScenario, handleMouseLeaveScenario, handleMouseEnterInsight, getActiveConditionsInScenario, isScenarioSelected, handleMouseLeaveInsight, getScenarioConditions, getFlattenedScenarioConditions, activeSector, sectors, side, entry, exit, size, entryFee, exitFee, feeType, resultMode, showEntryMethod, activeProtocolTab, entryMethodType, pyramidingEntries, averagingDownEntries, activeMultipleEntries, entryMethodEnabled, hasActiveMethodNode, addMultipleEntry, exitEntries, exitMethodEnabled, totalExitSize, averageExit, addExitEntry, removeExitEntry, removeMultipleEntry, showAutoPrompt, autoEntryBasePrice, autoEntryBaseLots, toggleAutoPrompt, confirmAutoGenerate, totalSize, averageEntry, isForex, isManualEntryAsset, isFixedFeeAsset, overridePnl, liveRates, FALLBACK_RATES, fetchLiveRates, getRate, EMOTION_LIBRARY, emotionsByCategory, showEmotions, selectedEmotions, hoveredEmotion, mousePos, EMOTION_OPPOSITES, toggleEmotion, isEmotionDisabled, stopLoss, takeProfit, openDate, exitDate, cloneDate, adjustDate, formatPart, handleManualDate, projectedProfit, hasValidProjection, equityCurveTrades, isTemporalOpen, activeTemporalTarget, _now, tempDateParts, syncTempParts, openTemporal, scrollContainer, pnl, commitState, resetForm, submit } = inject('tradeState');
</script>

<template>
<!-- CME Metadata Notice Backdrop -->
    <Transition name="fade">
      <div v-if="currentAssetData?.contractSize && showCmeNotice" 
           class="fixed inset-0 z-[999] bg-black/60 dark:bg-white/10 backdrop-blur-sm"></div>
    </Transition>
    <!-- CME Metadata Notice -->
    <Transition name="protocol-slide">
      <div v-if="currentAssetData?.contractSize && showCmeNotice" 
           class="fixed inset-0 m-auto z-[1000] flex flex-col items-center justify-center gap-6 px-12 py-10 nier-bg-inverted shadow-[0_0_100px_rgba(0,0,0,0.8)] dark:shadow-[0_0_100px_rgba(255,255,255,0.2)] w-fit min-w-[500px] max-w-2xl h-fit max-h-[80vh] overflow-hidden text-center">
        
        <div class="flex flex-col items-center w-full mt-4">
          <div class="flex items-center justify-center gap-4 w-full mb-6">
            <div class="w-3 h-3 nier-bg-panel rotate-45"></div>
            <span class="text-xl md:text-2xl font-mono tracking-[0.3em] uppercase font-black nier-text-primary">
              <span v-if="locale === 'en'">CME_CONTRACT_SPECIFICATIONS</span>
              <span v-if="locale === 'ru'">СПЕЦИФИКАЦИИ_КОНТРАКТОВ_CME</span>
            </span>
            <div class="w-3 h-3 nier-bg-panel rotate-45"></div>
          </div>
          <div class="flex flex-col items-center gap-2 h-20 justify-center">
            <span v-if="locale === 'en'" class="text-xs font-mono tracking-[0.1em] opacity-80 uppercase nier-text-primary leading-loose max-w-[90%] transition-opacity">
              Utilizing official CME contract sizes for Commodities & Indices to calculate Estimated Yield.
            </span>
            <span v-if="locale === 'ru'" class="text-[10px] font-mono tracking-[0.1em] opacity-80 uppercase nier-text-primary leading-loose max-w-[90%] transition-opacity">
              Для расчета ожидаемой прибыли используются официальные размеры контрактов CME для сырья и индексов.
            </span>
            <div class="mt-2 flex flex-col items-center opacity-60 text-[10px] font-mono tracking-[0.1em] uppercase nier-text-primary">
              <span v-if="locale === 'en'">(e.g. {{ asset }}: 1 contract = {{ currentAssetData?.contractSize }})</span>
              <span v-if="locale === 'ru'">(например: 1 контракт = {{ currentAssetData?.contractSize }})</span>
            </div>
          </div>
        </div>
        
        <div class="w-full h-px bg-white/20 dark:bg-black/20 my-4"></div>
        
        <div class="flex flex-col sm:flex-row items-center justify-between w-full px-4 gap-8">
          <label class="flex items-center gap-3 cursor-pointer group">
            <div class="relative w-5 h-5 border border-white/50 dark:border-black/50 group-hover:border-white dark:group-hover:border-black transition-colors flex items-center justify-center">
              <input type="checkbox" v-model="rememberCmeNotice" class="absolute opacity-0 cursor-pointer w-full h-full" />
              <div v-if="rememberCmeNotice" class="w-3 h-3 nier-bg-panel"></div>
            </div>
            <span class="flex flex-col text-[10px] font-mono tracking-[0.15em] text-white/60 dark:text-black/60 group-hover:text-white dark:group-hover:text-black transition-colors uppercase text-left">
              <span v-if="locale === 'en'">Remember & Don't Show Again</span>
              <span v-if="locale === 'ru'">Больше не показывать</span>
            </span>
          </label>
          
          <button @click="closeCmeNotice" 
                  class="px-8 py-3 border border-white dark:border-black nier-text-primary font-mono text-sm tracking-[0.2em] hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white transition-colors uppercase font-bold relative group/btn overflow-hidden w-48 h-12">
            <span class="absolute inset-0 flex items-center justify-center z-10 transition-colors group-hover/btn:text-black dark:group-hover/btn:text-white">
              <span v-if="locale === 'en'">Acknowledge</span>
              <span v-if="locale === 'ru'" class="text-[10px] opacity-90 mt-0.5 tracking-[0.3em]">ПОДТВЕРДИТЬ</span>
            </span>
            <div class="absolute inset-0 nier-bg-panel translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
          </button>
        </div>
      </div>
    </Transition>
    
</template>
