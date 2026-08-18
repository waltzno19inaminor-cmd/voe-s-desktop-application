<script setup>

import { inject } from 'vue';
import { useI18n } from '~/shared/i18n/useI18n';
import ExTooltip from '~/shared/ui/ExTooltip.vue';
const emit = defineEmits(['close']);
const { locale } = useI18n();


const { themeStore, isDark, viewMode, journalEntries, getArchiveNodeName, addJournalEntry, removeJournalEntry, addJournalEntryTag, removeJournalEntryTag, handleImageUpload, triggerUpload, showCmeNotice, rememberCmeNotice, closeCmeNotice, showAssetMenu, asset, assetSearch, filteredAssets, currentAssetData, selectAsset, matrixNodes, matrixConnections, matrixZones, isMatrixLoading, loadMatrixData, tradeStore, strategies, selectedStrategyId, selectedStrategy, findAllNodes, findAllConnections, findNodeById, activeRiskManagement, activeRiskPerTradeDollars, activeRiskSnapshot, actualRR, actualRiskPercent, violatesRR, violatesRiskPerTrade, riskViolationMessage, getReachableNodes, getNodeZoneType, showStrategyMenu, failedIcons, handleIconError, closeAssetMenu, selectedScenarioNode, getNodesForStrategy, DEFAULT_ENTRY_CONDITIONS, DEFAULT_ENTRY_SCENARIOS, DEFAULT_EXIT_CONDITIONS, DEFAULT_EXIT_SCENARIOS, entryConditions, entryScenarios, exitConditions, exitScenarios, miniExitScenarios, regularExitScenarios, filteredRegistryEntryScenarios, filteredRegistryExitScenarios, currentRegistryScenarioConditions, mismatchedNodeIds, hasVectorMismatch, activeConditions, toggleCondition, showConditionLibrary, showEmotionSelector, registrySearchQuery, libraryFilter, filteredLibraryScenarios, flatLibraryConditions, selectedRegistryScenarioId, hoverTimeout, hoveredScenarioId, handleMouseEnterScenario, handleMouseLeaveScenario, handleMouseEnterInsight, getActiveConditionsInScenario, isScenarioSelected, handleMouseLeaveInsight, getScenarioConditions, getFlattenedScenarioConditions, activeSector, sectors, side, isClosed, entry, exit, size, entryFee, exitFee, feeType, resultMode, showEntryMethod, activeProtocolTab, entryMethodType, pyramidingEntries, averagingDownEntries, activeMultipleEntries, entryMethodEnabled, hasActiveMethodNode, addMultipleEntry, exitEntries, exitMethodEnabled, totalExitSize, averageExit, addExitEntry, removeExitEntry, removeMultipleEntry, showAutoPrompt, autoEntryBasePrice, autoEntryBaseLots, toggleAutoPrompt, confirmAutoGenerate, totalSize, averageEntry, isForex, isManualEntryAsset, isFixedFeeAsset, overridePnl, liveRates, FALLBACK_RATES, fetchLiveRates, getRate, EMOTION_LIBRARY, emotionsByCategory, showEmotions, selectedEmotions, hoveredEmotion, mousePos, EMOTION_OPPOSITES, toggleEmotion, isEmotionDisabled, stopLoss, takeProfit, openDate, exitDate, cloneDate, adjustDate, formatPart, handleManualDate, projectedProfit, hasValidProjection, equityCurveTrades, isTemporalOpen, activeTemporalTarget, _now, tempDateParts, syncTempParts, openTemporal, scrollContainer, pnl, commitState, resetForm, submit } = inject('tradeState');

const closeModeText = (key) => {
  const labels = {
    en: {
      title: 'CLOSE_MODE',
      hint: 'On: the trade is closed, exit price and result are available. Off: the trade stays open and does not affect the diary.'
    },
    ru: {
      title: 'РЕЖИМ_ЗАКРЫТИЯ',
      hint: 'Включено: сделка закрыта, можно вводить цену выхода и результат. Выключено: сделка остается открытой и не влияет на дневник.'
    }
  }
  return labels[locale.value]?.[key] || labels.en[key] || key
}
</script>

<template>
<!-- RIGHT SIDE TOGGLE (JOURNAL) -->
    <Teleport to="body">
      <Transition name="nier-fade">
        <div v-if="!showConditionLibrary && !showEmotionSelector && !showEntryMethod" 
             class="fixed right-10 top-1/2 -translate-y-1/2 flex flex-col gap-7 z-[9999]">
          <!-- JOURNAL TOGGLE -->
          <button @click="viewMode = viewMode === 'tactical' ? 'journal' : 'tactical'" 
                  :disabled="commitState === 'loading'"
                  class="group relative disabled:opacity-50">
             <div class="relative flex items-center justify-center w-12 h-12">
                <div class="absolute inset-0 border border-black/20 dark:border-white/20 rotate-45 group-hover:bg-black dark:group-hover:bg-white group-hover:border-black dark:border-white transition-all duration-500 shadow-xl"
                     :class="{ 'nier-bg-inverted border-black dark:border-white': viewMode === 'journal' }"></div>
                <div class="w-2.5 h-2.5 border-t-2 border-r-2 relative z-10 transition-all duration-700 group-hover:border-white dark:group-hover:border-black" 
                     :class="[
                       viewMode === 'tactical' ? 'rotate-45 border-black dark:border-white' : '-rotate-[135deg] border-white dark:border-black',
                       { 'border-white dark:border-black': viewMode === 'journal' }
                     ]"></div>
                <div class="absolute right-full mr-8 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0 whitespace-nowrap pointer-events-none">
                   <div class="flex flex-col items-end">
                      <span class="text-[8px] font-mono tracking-[0.5em] uppercase font-black nier-text-primary">
                         {{ viewMode === 'tactical' ? 'INIT_JOURNAL' : 'EXIT_JOURNAL' }}
                      </span>
                      <div class="h-px w-0 group-hover:w-full nier-bg-inverted transition-all duration-500 mt-1 opacity-40"></div>
                   </div>
                </div>
             </div>
          </button>

          <ExTooltip
            :is-dark="isDark"
            :title="closeModeText('title')"
            placement="top"
            variant="basic"
          >
            <template #trigger>
              <button
                type="button"
                @click="isClosed = !isClosed"
                :disabled="commitState === 'loading'"
                class="group relative disabled:opacity-50"
              >
                 <div class="relative flex items-center justify-center w-12 h-12">
                    <div
                      class="absolute inset-0 border border-black/20 dark:border-white/20 rotate-45 transition-all duration-500 shadow-xl"
                      :class="isClosed
                        ? 'bg-white border-white dark:bg-white dark:border-white'
                        : 'group-hover:bg-black dark:group-hover:bg-white group-hover:border-black dark:group-hover:border-white'"
                    ></div>
                    <svg
                      class="relative z-10 h-4 w-4 transition-all duration-500"
                      :class="isClosed ? 'text-black opacity-100' : 'nier-text-primary opacity-35 group-hover:opacity-100 group-hover:text-white dark:group-hover:text-black'"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2.6" d="M5 13l4 4L19 7"></path>
                    </svg>
                 </div>
              </button>
            </template>
            {{ closeModeText('hint') }}
          </ExTooltip>
        </div>
      </Transition>
    </Teleport>

    
</template>
