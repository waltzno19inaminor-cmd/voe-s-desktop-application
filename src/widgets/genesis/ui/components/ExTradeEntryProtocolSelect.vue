<script setup>

import { inject } from 'vue';
import { useI18n } from '~/shared/i18n/useI18n';
const emit = defineEmits(['close']);
const { locale } = useI18n();

import { SystemProtocolSelect } from '~/widgets/system-protocol-select';
import ExTooltip from '~/shared/ui/ExTooltip.vue';
const { themeStore, isDark, viewMode, journalEntries, getArchiveNodeName, addJournalEntry, removeJournalEntry, addJournalEntryTag, removeJournalEntryTag, handleImageUpload, triggerUpload, showCmeNotice, rememberCmeNotice, closeCmeNotice, showAssetMenu, asset, assetSearch, filteredAssets, currentAssetData, selectAsset, matrixNodes, matrixConnections, matrixZones, isMatrixLoading, loadMatrixData, tradeStore, strategies, selectedStrategyId, selectedStrategy, findAllNodes, findAllConnections, findNodeById, activeRiskManagement, activeRiskPerTradeDollars, activeRiskSnapshot, actualRR, actualRiskPercent, violatesRR, violatesRiskPerTrade, riskViolationMessage, getReachableNodes, getNodeZoneType, showStrategyMenu, failedIcons, handleIconError, closeAssetMenu, selectedScenarioNode, getNodesForStrategy, DEFAULT_ENTRY_CONDITIONS, DEFAULT_ENTRY_SCENARIOS, DEFAULT_EXIT_CONDITIONS, DEFAULT_EXIT_SCENARIOS, entryConditions, entryScenarios, exitConditions, exitScenarios, miniExitScenarios, regularExitScenarios, filteredRegistryEntryScenarios, filteredRegistryExitScenarios, currentRegistryScenarioConditions, mismatchedNodeIds, hasVectorMismatch, activeConditions, toggleCondition, showConditionLibrary, showEmotionSelector, registrySearchQuery, libraryFilter, filteredLibraryScenarios, flatLibraryConditions, selectedRegistryScenarioId, hoverTimeout, hoveredScenarioId, handleMouseEnterScenario, handleMouseLeaveScenario, handleMouseEnterInsight, getActiveConditionsInScenario, isScenarioSelected, handleMouseLeaveInsight, getScenarioConditions, getFlattenedScenarioConditions, activeSector, sectors, side, entry, exit, size, entryFee, exitFee, feeType, resultMode, showEntryMethod, activeProtocolTab, entryMethodType, pyramidingEntries, averagingDownEntries, activeMultipleEntries, entryMethodEnabled, hasActiveMethodNode, addMultipleEntry, exitEntries, exitMethodEnabled, totalExitSize, averageExit, addExitEntry, removeExitEntry, removeMultipleEntry, showAutoPrompt, autoEntryBasePrice, autoEntryBaseLots, toggleAutoPrompt, confirmAutoGenerate, totalSize, averageEntry, isForex, isManualEntryAsset, isFixedFeeAsset, overridePnl, liveRates, FALLBACK_RATES, fetchLiveRates, getRate, EMOTION_LIBRARY, emotionsByCategory, showEmotions, selectedEmotions, hoveredEmotion, mousePos, EMOTION_OPPOSITES, toggleEmotion, isEmotionDisabled, stopLoss, takeProfit, openDate, exitDate, cloneDate, adjustDate, formatPart, handleManualDate, projectedProfit, hasValidProjection, equityCurveTrades, isTemporalOpen, activeTemporalTarget, _now, tempDateParts, syncTempParts, openTemporal, scrollContainer, pnl, commitState, resetForm, submit } = inject('tradeState');
</script>

<template>
<!-- TOP SECTION: STRATEGIC PANEL (REORDERED TO CORNERS) -->
    <div class="w-full flex justify-between items-start px-12 py-10 shrink-0">
      <!-- LEFT CORNER: PROTOCOL SELECT -->
      <SystemProtocolSelect
        v-model="selectedStrategyId"
        :strategies="strategies"
        :is-loading="isMatrixLoading"
        menu-position="bottom"
      />

      <!-- RIGHT CORNER: TACTICAL DATA SNAPSHOT -->
      <div class="flex items-center gap-6 relative z-[10010]">
        <div class="flex items-center px-8 py-4 bg-black/[0.02] dark:bg-white/[0.02] border nier-border-primary backdrop-blur-md gap-10 relative">
           <!-- Corner Decor -->
           <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-black/30 dark:border-white/30"></div>
           <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-black/30 dark:border-white/30"></div>

           <!-- Price Group -->
           <div class="flex gap-8">
              <div class="flex flex-col">
                 <span class="text-[7px] font-mono opacity-40 uppercase tracking-[0.3em]">Entry_Point</span>
                 <span class="text-[12px] font-mono font-bold nier-text-primary tabular-nums">{{ (+entry || 0).toFixed(2) }}</span>
              </div>
              <div class="flex flex-col">
                 <span class="text-[7px] font-mono opacity-40 uppercase tracking-[0.3em]">Exit_Target</span>
                 <span class="text-[12px] font-mono font-bold nier-text-primary tabular-nums">{{ (+exit || 0).toFixed(2) }}</span>
              </div>
           </div>

           <div class="w-px h-8 bg-black/10 dark:bg-white/10"></div>

           <!-- Risk Group -->
           <div class="flex gap-8">
              <div class="flex flex-col">
                 <span class="text-[7px] font-mono opacity-40 uppercase tracking-[0.3em] text-rose-500/60 font-black">Stop_Loss</span>
                 <span class="text-[12px] font-mono font-bold text-rose-500/80 tabular-nums">{{ (+stopLoss || 0).toFixed(2) }}</span>
              </div>
              <div class="flex flex-col">
                 <span class="text-[7px] font-mono opacity-40 uppercase tracking-[0.3em] text-emerald-500/60 font-black">Take_Profit</span>
                 <span class="text-[12px] font-mono font-bold text-emerald-500/80 tabular-nums">{{ (+takeProfit || 0).toFixed(2) }}</span>
              </div>
           </div>

           <div class="w-px h-8 bg-black/10 dark:bg-white/10"></div>

           <!-- Protocol Risk Group -->
           <ExTooltip
             :force-show="!!riskViolationMessage"
             :is-dark="isDark"
             variant="basic"
             placement="bottom"
             :title="riskViolationMessage || ''"
           >
             <template #trigger>
               <div class="flex gap-8 cursor-default" :class="riskViolationMessage ? 'ring-1 ring-rose-500/30 px-2 -mx-2 py-1 -my-1 rounded-sm' : ''">
                 <div class="flex flex-col">
                    <span class="text-[7px] font-mono uppercase tracking-[0.3em] font-bold" :class="riskViolationMessage ? 'text-rose-400/80' : 'opacity-40'">Panel_Risk</span>
                    <span class="text-[12px] font-mono font-bold nier-text-primary tabular-nums">
                       {{ activeRiskManagement.riskPerTradeValue ?? '--' }}{{ activeRiskManagement.riskPerTradeUnit }} / {{ activeRiskManagement.riskRewardRatio ? `1:${activeRiskManagement.riskRewardRatio}` : 'RR_--' }}
                    </span>
                 </div>
                 <div class="flex flex-col">
                    <span class="text-[7px] font-mono opacity-40 uppercase tracking-[0.3em] font-bold">Trade_Style</span>
                    <span class="text-[12px] font-mono font-bold nier-text-primary truncate max-w-[100px]">
                       {{ activeRiskManagement.tradingStyle || 'UNLINKED' }}
                    </span>
                 </div>
               </div>
             </template>
             <div class="flex flex-col gap-2">
               <div v-if="actualRR !== null" class="flex items-center justify-between gap-6">
                 <span class="opacity-50 text-[11px]">Your Risk Reward:</span>
                 <span class="font-black text-[11px]" :class="violatesRR ? 'text-rose-400' : 'text-emerald-400'">1 / {{ actualRR.toFixed(2) }}</span>
               </div>
               <div v-if="actualRiskPercent !== null" class="flex items-center justify-between gap-6">
                 <span class="opacity-50 text-[11px]">Your Risk Per Trade:</span>
                 <span class="font-black text-[11px]" :class="violatesRiskPerTrade ? 'text-rose-400' : 'text-emerald-400'">{{ actualRiskPercent.toFixed(2) }}%</span>
               </div>
               <div class="h-px bg-white/10 my-1"></div>
               <div v-if="activeRiskManagement.riskRewardRatio" class="flex items-center justify-between gap-6">
                 <span class="opacity-40 text-[10px]">Required R:R:</span>
                 <span class="opacity-70 text-[10px]">1 / {{ activeRiskManagement.riskRewardRatio }}</span>
               </div>
               <div v-if="activeRiskManagement.riskPerTradeValue" class="flex items-center justify-between gap-6">
                 <span class="opacity-40 text-[10px]">Max Risk Per Trade:</span>
                 <span class="opacity-70 text-[10px]">{{ activeRiskManagement.riskPerTradeValue }}{{ activeRiskManagement.riskPerTradeUnit }}</span>
               </div>
             </div>
           </ExTooltip>
        </div>

        <button @click="emit('close')" :disabled="commitState === 'loading'" class="group relative h-14 w-14 bg-transparent border border-black/20 dark:border-white/20 hover:bg-black dark:hover:bg-white transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed">
           <div class="relative w-full h-full flex items-center justify-center">
              <div class="w-4 h-4 relative">
                 <div class="absolute inset-0 m-auto w-full h-px nier-bg-inverted rotate-45 group-hover:bg-white dark:group-hover:bg-black transition-colors duration-500"></div>
                 <div class="absolute inset-0 m-auto w-full h-px nier-bg-inverted -rotate-45 group-hover:bg-white dark:group-hover:bg-black transition-colors duration-500"></div>
              </div>
           </div>
        </button>
      </div>
    </div>

    
</template>
