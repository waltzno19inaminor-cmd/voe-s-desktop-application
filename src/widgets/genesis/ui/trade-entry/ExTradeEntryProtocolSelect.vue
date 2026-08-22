<script setup>

import { inject } from 'vue';
import { useI18n } from '~/shared/i18n/useI18n';
const emit = defineEmits(['close']);
const { locale } = useI18n();

import { SystemProtocolSelect } from '~/widgets/system-protocol-select';
import ExTooltip from '~/shared/ui/ExTooltip.vue';
const { themeStore, isDark, viewMode, journalEntries, getArchiveNodeName, addJournalEntry, removeJournalEntry, addJournalEntryTag, removeJournalEntryTag, handleImageUpload, triggerUpload, showCmeNotice, rememberCmeNotice, closeCmeNotice, showAssetMenu, asset, assetSearch, filteredAssets, currentAssetData, selectAsset, matrixNodes, matrixConnections, matrixZones, isMatrixLoading, loadMatrixData, tradeStore, strategies, selectedStrategyId, selectedStrategy, findAllNodes, findAllConnections, findNodeById, activeRiskManagement, activeRiskPerTradeDollars, activeRiskSnapshot, actualRR, actualRiskPercent, violatesRR, violatesRiskPerTrade, violatesTradingStyleDuration, requiredTradingStyleDurationLabel, actualTradeDurationLabel, riskViolationMessage, getReachableNodes, getNodeZoneType, showStrategyMenu, failedIcons, handleIconError, closeAssetMenu, selectedScenarioNode, getNodesForStrategy, DEFAULT_ENTRY_CONDITIONS, DEFAULT_ENTRY_SCENARIOS, DEFAULT_EXIT_CONDITIONS, DEFAULT_EXIT_SCENARIOS, entryConditions, entryScenarios, exitConditions, exitScenarios, miniExitScenarios, regularExitScenarios, filteredRegistryEntryScenarios, filteredRegistryExitScenarios, currentRegistryScenarioConditions, mismatchedNodeIds, hasVectorMismatch, activeConditions, toggleCondition, showConditionLibrary, showEmotionSelector, registrySearchQuery, libraryFilter, filteredLibraryScenarios, flatLibraryConditions, selectedRegistryScenarioId, hoverTimeout, hoveredScenarioId, handleMouseEnterScenario, handleMouseLeaveScenario, handleMouseEnterInsight, getActiveConditionsInScenario, isScenarioSelected, handleMouseLeaveInsight, getScenarioConditions, getFlattenedScenarioConditions, activeSector, sectors, side, entry, exit, size, entryFee, exitFee, feeType, resultMode, showEntryMethod, activeProtocolTab, entryMethodType, pyramidingEntries, averagingDownEntries, activeMultipleEntries, entryMethodEnabled, hasActiveMethodNode, addMultipleEntry, exitEntries, exitMethodEnabled, totalExitSize, averageExit, addExitEntry, removeExitEntry, removeMultipleEntry, showAutoPrompt, autoEntryBasePrice, autoEntryBaseLots, toggleAutoPrompt, confirmAutoGenerate, totalSize, averageEntry, isForex, isManualEntryAsset, isFixedFeeAsset, overridePnl, liveRates, FALLBACK_RATES, fetchLiveRates, getRate, EMOTION_LIBRARY, emotionsByCategory, showEmotions, selectedEmotions, hoveredEmotion, mousePos, EMOTION_OPPOSITES, toggleEmotion, isEmotionDisabled, stopLoss, takeProfit, openDate, exitDate, cloneDate, adjustDate, formatPart, handleManualDate, projectedProfit, hasValidProjection, equityCurveTrades, isTemporalOpen, activeTemporalTarget, _now, tempDateParts, syncTempParts, openTemporal, scrollContainer, pnl, commitState, resetForm, submit } = inject('tradeState');

const labels = {
  en: {
    panelRisk: 'Panel Risk',
    tradeStyle: 'Trade Style',
    protocolConstraints: 'Protocol Constraints',
    requiredRR: 'Required R:R:',
    maxRiskPerTrade: 'Max Risk Per Trade:',
    requiredDuration: 'Required Duration:',
    actualRR: 'Actual R:R:',
    actualRisk: 'Actual Risk:',
    actualDuration: 'Actual Duration:'
  },
  ru: {
    panelRisk: 'Риск панели',
    tradeStyle: 'Стиль сделки',
    protocolConstraints: 'Ограничения протокола',
    requiredRR: 'Требуемый R:R:',
    maxRiskPerTrade: 'Макс. риск на сделку:',
    requiredDuration: 'Требуемая длительность:',
    actualRR: 'Факт. R:R:',
    actualRisk: 'Факт. риск:',
    actualDuration: 'Факт. длительность:'
  }
};

const l = (key) => labels[locale.value]?.[key] || labels.en[key] || key;

const formatSnapshotValue = (value, fallback = '0') => {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  return raw;
};

const formatSnapshotMetric = (value, suffix = '', fallback = '--') => {
  if (value === null || value === undefined || value === '') return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return `${numeric.toFixed(2)}${suffix}`;
};
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
                 <span class="text-[7px] font-mono uppercase tracking-[0.3em] text-black/60 dark:text-white/70">{{ locale === 'ru' ? 'Точка входа' : 'Entry Point' }}</span>
	                 <span class="block max-w-[78px] truncate text-[12px] font-mono font-bold nier-text-primary tabular-nums">{{ formatSnapshotValue(entry) }}</span>
	              </div>
	              <div class="flex flex-col">
                 <span class="text-[7px] font-mono uppercase tracking-[0.3em] text-black/60 dark:text-white/70">{{ locale === 'ru' ? 'Цель выхода' : 'Exit Target' }}</span>
	                 <span class="block max-w-[78px] truncate text-[12px] font-mono font-bold nier-text-primary tabular-nums">{{ formatSnapshotValue(exit) }}</span>
	              </div>
            </div>

           <div class="w-px h-8 bg-black/10 dark:bg-white/10"></div>

           <!-- Risk Group -->
           <div class="flex gap-8">
	              <div class="flex flex-col">
                 <span class="text-[7px] font-mono opacity-40 uppercase tracking-[0.3em] text-rose-500/60 font-black">{{ locale === 'ru' ? 'Стоп-лосс' : 'Stop Loss' }}</span>
	                 <span class="block max-w-[78px] truncate text-[12px] font-mono font-bold text-rose-500/80 tabular-nums">{{ formatSnapshotValue(stopLoss) }}</span>
	              </div>
	              <div class="flex flex-col">
                 <span class="text-[7px] font-mono opacity-40 uppercase tracking-[0.3em] text-emerald-500/60 font-black">{{ locale === 'ru' ? 'Тейк-профит' : 'Take Profit' }}</span>
	                 <span class="block max-w-[78px] truncate text-[12px] font-mono font-bold text-emerald-500/80 tabular-nums">{{ formatSnapshotValue(takeProfit) }}</span>
	              </div>
           </div>

           <div class="w-px h-8 bg-black/10 dark:bg-white/10"></div>

           <!-- Protocol Risk Group -->
           <ExTooltip
             :force-show="!!riskViolationMessage"
             :is-dark="isDark"
             variant="basic"
             placement="bottom"
             title=""
             :disabled="actualRiskPercent === null && actualRR === null && !violatesTradingStyleDuration"
           >
             <template #trigger>
	               <div class="flex gap-8 cursor-default" :class="riskViolationMessage ? 'ring-1 ring-rose-500/30 px-2 -mx-2 py-1 -my-1 rounded-sm' : ''">
	                 <div class="flex flex-col">
	                    <span class="text-[7px] font-mono uppercase tracking-[0.3em] font-bold transition-colors" :class="riskViolationMessage ? 'text-rose-500/80' : 'text-black/70 dark:text-white'">{{ l('panelRisk') }}</span>
	                    <span class="block max-w-[130px] truncate text-[12px] font-mono font-bold tabular-nums transition-colors" :class="riskViolationMessage ? 'text-rose-500' : 'text-black/85 dark:text-white'">
	                       {{ formatSnapshotMetric(actualRiskPercent, '%', '--%') }} / {{ actualRR !== null ? `1:${formatSnapshotMetric(actualRR, '', '--')}` : 'RR_--' }}
	                    </span>
	                 </div>
	                 <div class="flex flex-col">
	                    <span class="text-[7px] font-mono opacity-40 uppercase tracking-[0.3em] font-bold">{{ l('tradeStyle') }}</span>
	                    <span class="text-[12px] font-mono font-bold nier-text-primary truncate max-w-[100px]">
                       {{ activeRiskManagement.tradingStyle || (locale === 'ru' ? 'Не связано' : 'Unlinked') }}
	                    </span>
                 </div>
               </div>
             </template>
             <div class="flex flex-col gap-2 min-w-[200px]">
	               <span class="text-[9px] font-mono uppercase tracking-[0.3em] text-white/40 mb-1">{{ l('protocolConstraints') }}</span>
	               <div v-if="activeRiskManagement.riskRewardRatio" class="flex items-center justify-between gap-6">
	                 <span class="opacity-70 text-[11px]">{{ l('requiredRR') }}</span>
	                 <span class="font-black text-[11px] text-white">1 / {{ activeRiskManagement.riskRewardRatio }}</span>
	               </div>
	               <div v-if="activeRiskManagement.riskPerTradeValue" class="flex items-center justify-between gap-6">
	                 <span class="opacity-70 text-[11px]">{{ l('maxRiskPerTrade') }}</span>
	                 <span class="font-black text-[11px] text-white">{{ activeRiskManagement.riskPerTradeValue }}{{ activeRiskManagement.riskPerTradeUnit }}</span>
	               </div>
	               <div v-if="requiredTradingStyleDurationLabel" class="flex items-center justify-between gap-6">
	                 <span class="opacity-70 text-[11px]">{{ l('requiredDuration') }}</span>
	                 <span class="font-black text-[11px] text-white">{{ requiredTradingStyleDurationLabel }}</span>
	               </div>
	               <div class="h-px bg-white/10 my-1"></div>
	               <div v-if="actualRR !== null" class="flex items-center justify-between gap-6">
	                 <span class="opacity-70 text-[11px]">{{ l('actualRR') }}</span>
	                 <span class="font-black text-[11px]" :class="violatesRR ? 'text-rose-400' : 'text-emerald-400'">1 / {{ formatSnapshotMetric(actualRR, '', '--') }}</span>
	               </div>
	               <div v-if="actualRiskPercent !== null" class="flex items-center justify-between gap-6">
	                 <span class="opacity-70 text-[11px]">{{ l('actualRisk') }}</span>
	                 <span class="font-black text-[11px]" :class="violatesRiskPerTrade ? 'text-rose-400' : 'text-emerald-400'">{{ formatSnapshotMetric(actualRiskPercent, '%', '--%') }}</span>
	               </div>
	               <div v-if="requiredTradingStyleDurationLabel" class="flex items-center justify-between gap-6">
	                 <span class="opacity-70 text-[11px]">{{ l('actualDuration') }}</span>
	                 <span class="font-black text-[11px]" :class="violatesTradingStyleDuration ? 'text-rose-400' : 'text-emerald-400'">{{ actualTradeDurationLabel }}</span>
	               </div>
             </div>
           </ExTooltip>
        </div>

        <button
          @click="emit('close')"
          :disabled="commitState === 'loading'"
          class="group relative h-14 w-14 bg-transparent border border-black/20 dark:border-white/20 hover:bg-black dark:hover:bg-white transition-all duration-500 disabled:opacity-50"
        >
           <div class="relative w-full h-full flex items-center justify-center">
              <svg
                class="h-5 w-5 nier-text-primary transition-all duration-500 group-hover:text-white dark:group-hover:text-black group-hover:translate-x-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M10 17l5-5-5-5"></path>
                <path d="M15 12H3"></path>
                <path d="M21 19V5a2 2 0 0 0-2-2h-6"></path>
                <path d="M13 21h6a2 2 0 0 0 2-2"></path>
              </svg>
           </div>
        </button>
      </div>
    </div>

    
</template>
