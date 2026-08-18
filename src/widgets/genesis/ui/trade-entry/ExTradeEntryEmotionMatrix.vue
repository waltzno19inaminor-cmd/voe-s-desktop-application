<script setup>

import { inject } from 'vue';
import { useI18n } from '~/shared/i18n/useI18n';
const emit = defineEmits(['close']);
const { locale } = useI18n();


const { themeStore, isDark, viewMode, journalEntries, getArchiveNodeName, addJournalEntry, removeJournalEntry, addJournalEntryTag, removeJournalEntryTag, handleImageUpload, triggerUpload, showCmeNotice, rememberCmeNotice, closeCmeNotice, showAssetMenu, asset, assetSearch, filteredAssets, currentAssetData, selectAsset, matrixNodes, matrixConnections, matrixZones, isMatrixLoading, loadMatrixData, tradeStore, strategies, selectedStrategyId, selectedStrategy, findAllNodes, findAllConnections, findNodeById, activeRiskManagement, activeRiskPerTradeDollars, activeRiskSnapshot, actualRR, actualRiskPercent, violatesRR, violatesRiskPerTrade, riskViolationMessage, getReachableNodes, getNodeZoneType, showStrategyMenu, failedIcons, handleIconError, closeAssetMenu, selectedScenarioNode, getNodesForStrategy, DEFAULT_ENTRY_CONDITIONS, DEFAULT_ENTRY_SCENARIOS, DEFAULT_EXIT_CONDITIONS, DEFAULT_EXIT_SCENARIOS, entryConditions, entryScenarios, exitConditions, exitScenarios, miniExitScenarios, regularExitScenarios, filteredRegistryEntryScenarios, filteredRegistryExitScenarios, currentRegistryScenarioConditions, mismatchedNodeIds, hasVectorMismatch, activeConditions, toggleCondition, showConditionLibrary, showEmotionSelector, registrySearchQuery, libraryFilter, filteredLibraryScenarios, flatLibraryConditions, selectedRegistryScenarioId, hoverTimeout, hoveredScenarioId, handleMouseEnterScenario, handleMouseLeaveScenario, handleMouseEnterInsight, getActiveConditionsInScenario, isScenarioSelected, handleMouseLeaveInsight, getScenarioConditions, getFlattenedScenarioConditions, activeSector, sectors, side, entry, exit, size, entryFee, exitFee, feeType, resultMode, showEntryMethod, activeProtocolTab, entryMethodType, pyramidingEntries, averagingDownEntries, activeMultipleEntries, entryMethodEnabled, hasActiveMethodNode, addMultipleEntry, exitEntries, exitMethodEnabled, totalExitSize, averageExit, addExitEntry, removeExitEntry, removeMultipleEntry, showAutoPrompt, autoEntryBasePrice, autoEntryBaseLots, toggleAutoPrompt, confirmAutoGenerate, totalSize, averageEntry, isForex, isManualEntryAsset, isFixedFeeAsset, overridePnl, liveRates, FALLBACK_RATES, fetchLiveRates, getRate, EMOTION_LIBRARY, emotionsByCategory, showEmotions, selectedEmotions, hoveredEmotion, mousePos, EMOTION_OPPOSITES, toggleEmotion, isEmotionDisabled, stopLoss, takeProfit, openDate, exitDate, cloneDate, adjustDate, formatPart, handleManualDate, projectedProfit, hasValidProjection, equityCurveTrades, isTemporalOpen, activeTemporalTarget, _now, tempDateParts, syncTempParts, openTemporal, scrollContainer, pnl, commitState, resetForm, submit } = inject('tradeState');
</script>

<template>
<!-- EMOTION MATRIX WIDGET -->
    <Teleport to="body">
      <Transition name="nier-fade">
        <div v-if="showEmotionSelector" 
             class="fixed inset-0 z-[10000] flex items-center justify-center p-20 bg-black/40 dark:bg-black/80">
          <div class="relative w-full max-w-5xl bg-black border border-white/40 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden">
            
            <!-- SCANNING OVERLAY -->
            <div class="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
               <div class="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-transparent h-2 w-full animate-scan"></div>
            </div>

            <div class="flex items-center justify-between px-10 py-6 border-b border-white/10">
              <div class="flex items-center gap-4">
                <div class="w-2 h-2 bg-white rotate-45"></div>
                <span class="text-xs uppercase tracking-[0.8em] font-black text-white">Emotion_Matrix_Protocol</span>
              </div>
            </div>

            <div class="p-12 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div class="grid grid-cols-3 gap-12">
                <div v-for="(emotions, category) in emotionsByCategory" :key="category" class="flex flex-col space-y-8">
                  <div class="flex items-center gap-4">
                    <div class="h-[1px] flex-1 bg-white/10"></div>
                    <span class="text-[9px] font-mono tracking-[0.5em] text-white/40 uppercase">{{ category }}</span>
                  </div>
                  
                  <div class="flex flex-col space-y-3">
                    <button v-for="emotion in emotions" :key="emotion.label"
                            @click="toggleEmotion(emotion.label)"
                            :disabled="isEmotionDisabled(emotion.label)"
                            class="flex flex-col p-6 border transition-all text-left group"
                            :class="[
                              selectedEmotions.includes(emotion.label) 
                                ? 'bg-white border-white' 
                                : 'bg-transparent border-white/10 hover:border-white/30',
                              isEmotionDisabled(emotion.label) ? 'opacity-20 grayscale' : ''
                            ]">
                      <span class="text-[13px] font-mono font-black tracking-widest uppercase transition-colors"
                            :class="selectedEmotions.includes(emotion.label) ? 'text-black' : 'text-white/80 group-hover:text-white'">
                        {{ emotion.label }}
                      </span>
                      <span class="text-[10px] font-mono uppercase mt-2 leading-relaxed"
                            :class="selectedEmotions.includes(emotion.label) ? 'text-black/80' : 'text-white/80'">
                        {{ emotion.description }}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer & Accept Button (Standard Flex Horizon) -->
            <div class="px-10 py-8 border-t border-white/5 flex items-center justify-between gap-12 bg-white/[0.02]">
              <div class="flex gap-1 opacity-40">
                <div v-for="i in 3" :key="i" class="w-1 h-1 bg-white rotate-45"></div>
              </div>
              <button @click="showEmotionSelector = false" 
                      class="group/save relative h-12 px-16 bg-white text-black font-black border border-white hover:bg-black hover:text-white transition-all duration-500 ease-in-out">
                <span class="relative z-10 text-[10px] uppercase tracking-[0.8em]">Accept</span>
              </button>

              <div class="flex gap-1 opacity-40">
                <div v-for="i in 3" :key="i" class="w-1 h-1 bg-white rotate-45"></div>
              </div>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>

    
</template>
