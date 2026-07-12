<script setup>

import { computed, inject, ref, watch } from 'vue';
import { useI18n } from '~/shared/i18n/useI18n';
const emit = defineEmits(['close']);
const { locale } = useI18n();

import ExPanel from '~/shared/ui/ExPanel.vue';
const { themeStore, isDark, viewMode, journalEntries, getArchiveNodeName, addJournalEntry, removeJournalEntry, addJournalEntryTag, removeJournalEntryTag, handleImageUpload, triggerUpload, showCmeNotice, rememberCmeNotice, closeCmeNotice, showAssetMenu, asset, assetSearch, filteredAssets, currentAssetData, selectAsset, matrixNodes, matrixConnections, matrixZones, isMatrixLoading, loadMatrixData, tradeStore, strategies, selectedStrategyId, selectedStrategy, findAllNodes, findAllConnections, findNodeById, activeRiskManagement, activeRiskPerTradeDollars, activeRiskSnapshot, actualRR, actualRiskPercent, violatesRR, violatesRiskPerTrade, riskViolationMessage, getReachableNodes, getNodeZoneType, showStrategyMenu, failedIcons, handleIconError, closeAssetMenu, selectedScenarioNode, getNodesForStrategy, DEFAULT_ENTRY_CONDITIONS, DEFAULT_ENTRY_SCENARIOS, DEFAULT_EXIT_CONDITIONS, DEFAULT_EXIT_SCENARIOS, entryConditions, entryScenarios, exitConditions, exitScenarios, miniExitScenarios, regularExitScenarios, filteredRegistryEntryScenarios, filteredRegistryExitScenarios, currentRegistryScenarioConditions, mismatchedNodeIds, hasVectorMismatch, activeConditions, toggleCondition, showConditionLibrary, showEmotionSelector, registrySearchQuery, libraryFilter, filteredLibraryScenarios, flatLibraryConditions, selectedRegistryScenarioId, hoverTimeout, hoveredScenarioId, handleMouseEnterScenario, handleMouseLeaveScenario, handleMouseEnterInsight, getActiveConditionsInScenario, isScenarioSelected, handleMouseLeaveInsight, getScenarioConditions, getFlattenedScenarioConditions, activeSector, sectors, side, entry, exit, size, entryFee, exitFee, feeType, resultMode, showEntryMethod, activeProtocolTab, entryMethodType, pyramidingEntries, averagingDownEntries, activeMultipleEntries, entryMethodEnabled, hasActiveMethodNode, addMultipleEntry, exitEntries, exitMethodEnabled, totalExitSize, averageExit, addExitEntry, removeExitEntry, removeMultipleEntry, showAutoPrompt, autoEntryBasePrice, autoEntryBaseLots, toggleAutoPrompt, confirmAutoGenerate, totalSize, averageEntry, isForex, isManualEntryAsset, isFixedFeeAsset, overridePnl, liveRates, FALLBACK_RATES, fetchLiveRates, getRate, EMOTION_LIBRARY, emotionsByCategory, showEmotions, selectedEmotions, hoveredEmotion, mousePos, EMOTION_OPPOSITES, toggleEmotion, isEmotionDisabled, stopLoss, takeProfit, openDate, exitDate, tradeTimeZone, supportedTimeZones, tradeTimeZoneOffset, cloneDate, adjustDate, formatPart, handleManualDate, projectedProfit, hasValidProjection, equityCurveTrades, isTemporalOpen, activeTemporalTarget, _now, tempDateParts, syncTempParts, openTemporal, scrollContainer, pnl, commitState, resetForm, submit } = inject('tradeState');
const timeZoneMenuOpen = ref(false);
const timeZoneSearch = ref('');

const filteredTimeZones = computed(() => {
  const query = timeZoneSearch.value.trim().toLowerCase();
  const zones = supportedTimeZones?.value || [];
  if (!query) return zones.slice(0, 80);
  return zones.filter(zone => zone.toLowerCase().includes(query)).slice(0, 80);
});

const openTimeZoneMenu = () => {
  timeZoneSearch.value = tradeTimeZone.value || '';
  timeZoneMenuOpen.value = true;
};

const closeTimeZoneMenu = () => {
  window.setTimeout(() => {
    timeZoneMenuOpen.value = false;
  }, 120);
};

const updateTimeZoneSearch = () => {
  tradeTimeZone.value = timeZoneSearch.value;
  timeZoneMenuOpen.value = true;
};

const selectTimeZone = (zone) => {
  tradeTimeZone.value = zone;
  timeZoneSearch.value = zone;
  timeZoneMenuOpen.value = false;
};

watch(tradeTimeZone, (zone) => {
  if (!timeZoneMenuOpen.value) timeZoneSearch.value = zone || '';
}, { immediate: true });
</script>

<template>
<!-- ENTRY METHOD MATRIX WIDGET -->
    <Transition name="nier-fade">
      <div v-if="showEntryMethod" 
           @click.self="showEntryMethod = false"
           class="fixed inset-0 z-[10005] flex items-center justify-start p-10 bg-black/10 dark:bg-black/40">
        
          <ExPanel class="w-full max-w-[500px]" noPadding variant="light" :no-shadow="true">
            <template #header>
              <div class="flex items-center justify-between w-full">
                <span class="text-[9px] font-mono tracking-[0.4em] uppercase font-black">{{ locale === 'ru' ? 'МЕТОД ВХОДА' : 'ENTRY_METHOD' }}</span>
                <div class="flex items-center gap-12"></div>
              </div>
            </template>
            <!-- CONTENT GRID -->
            <div class="p-10 flex flex-col space-y-10 h-[80vh] min-h-[400px] nier-text-primary">

              <!-- PROTOCOL TABS (Fixed top) -->
              <div class="flex-shrink-0">
                <div class="flex items-center gap-2 border nier-border-primary p-1 bg-black/[0.02] dark:bg-white/[0.02]">
                  <button @click="activeProtocolTab = 'PYRAMIDING'; entryMethodType = 'PYRAMIDING'"
                          class="flex-1 py-3 text-[9px] font-mono tracking-[0.2em] uppercase font-black transition-all"
                          :class="activeProtocolTab === 'PYRAMIDING' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5'">
                     {{ locale === 'ru' ? 'Пирамидинг' : 'Pyramiding' }}
                  </button>
                  <button @click="activeProtocolTab = 'AVERAGING_DOWN'; entryMethodType = 'AVERAGING_DOWN'"
                          class="flex-1 py-3 text-[9px] font-mono tracking-[0.2em] uppercase font-black transition-all"
                          :class="activeProtocolTab === 'AVERAGING_DOWN' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5'">
                     {{ locale === 'ru' ? 'Усреднение' : 'Averaging' }}
                  </button>
                  <button @click="activeProtocolTab = 'EXIT'"
                          class="flex-1 py-3 text-[9px] font-mono tracking-[0.2em] uppercase font-black transition-all"
                          :class="activeProtocolTab === 'EXIT' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5'">
                     {{ locale === 'ru' ? 'Выход' : 'Exiting' }}
                  </button>
                </div>
              </div>

              <!-- SCROLLABLE POSITIONS NODES CONTAINER -->
              <div class="flex-1 overflow-y-auto custom-scrollbar pr-4 min-h-0 pb-10">
                
                <!-- ENTRY NODES -->
                <div v-if="activeProtocolTab === 'PYRAMIDING' || activeProtocolTab === 'AVERAGING_DOWN'" class="flex flex-col gap-4 transition-all">
                  <div v-for="(ent, idx) in activeMultipleEntries" :key="ent.id" class="flex items-center gap-4">
                     <span class="text-[8px] font-mono opacity-40 font-black tracking-widest w-6">#{{ idx + 1 }}</span>
                     <div class="flex-1 flex flex-col gap-1">
                        <span class="text-[7px] uppercase tracking-[0.4em] font-bold opacity-40 nier-text-primary">{{ locale === 'ru' ? 'УРОВЕНЬ_ЦЕНЫ' : 'Price_Lvl' }}</span>
                        <input v-model="ent.price" type="number" placeholder="0.00" class="nier-input !text-black dark:!text-white border-b border-black/20 dark:border-white/20 pb-1 w-full" />
                     </div>
                     <div class="flex-1 flex flex-col gap-1">
                        <span class="text-[7px] uppercase tracking-[0.4em] font-bold opacity-40 nier-text-primary">{{ locale === 'ru' ? 'РАЗМЕР_ЛОТА' : 'Lot_Size' }}</span>
                        <input v-model="ent.size" type="number" step="0.01" placeholder="0.01" class="nier-input !text-black dark:!text-white border-b border-black/20 dark:border-white/20 pb-1 w-full" />
                     </div>
                     <button @click="removeMultipleEntry(ent.id)" class="w-8 h-8 flex items-center justify-center border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white transition-all mt-4">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                     </button>
                  </div>

                  <div class="flex items-center gap-2 mt-2">
                     <button @click="addMultipleEntry" class="flex-1 py-4 border border-dashed border-black/20 dark:border-white/20 text-black/40 dark:text-white/40 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white text-[9px] font-mono tracking-widest uppercase transition-all flex items-center justify-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                        {{ locale === 'ru' ? 'ДОБАВИТЬ_ПОЗИЦИЮ' : 'Add_Position_Node' }}
                     </button>
                     <button v-if="hasActiveMethodNode && !showAutoPrompt && activeMultipleEntries.length === 0" @click="toggleAutoPrompt" class="flex-1 py-4 border border-dashed border-black/50 dark:border-white/50 nier-text-primary hover:border-black dark:hover:border-white hover:bg-black/5 dark:hover:bg-white/5 text-[9px] font-mono tracking-widest uppercase transition-all flex items-center justify-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                        {{ locale === 'ru' ? 'АВТО' : 'AUTO' }}
                     </button>
                  </div>
                  
                  <!-- Auto Generation Prompt -->
                  <div v-if="showAutoPrompt" class="mt-2 p-3 border border-black/30 dark:border-white/30 bg-black/5 dark:bg-white/5 flex flex-col gap-3">
                    <div class="flex items-center gap-3">
                      <div class="flex-1">
                        <span class="block text-[7px] uppercase tracking-[0.4em] font-bold opacity-60 nier-text-primary mb-1">{{ locale === 'ru' ? 'Базовая_Цена' : 'Base_Price' }}</span>
                        <input v-model="autoEntryBasePrice" type="number" placeholder="Price..." class="nier-input !text-black dark:!text-white border-b border-black/30 dark:border-white/30 pb-1 w-full bg-transparent focus:border-black dark:focus:border-white focus:outline-none" />
                      </div>
                      <div class="flex-1">
                        <span class="block text-[7px] uppercase tracking-[0.4em] font-bold opacity-60 nier-text-primary mb-1">{{ locale === 'ru' ? 'РАЗМЕР_ЛОТА' : 'Lot_Size' }}</span>
                        <input v-model="autoEntryBaseLots" type="number" step="0.01" placeholder="Lots..." class="nier-input !text-black dark:!text-white border-b border-black/30 dark:border-white/30 pb-1 w-full bg-transparent focus:border-black dark:focus:border-white focus:outline-none" />
                      </div>
                    </div>
                    <div class="flex items-center justify-end gap-2">
                      <button @click="showAutoPrompt = false" class="px-4 py-2 border border-black/30 dark:border-white/30 nier-text-primary hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono tracking-widest uppercase transition-all font-bold">
                         {{ locale === 'ru' ? 'ОТМЕНА' : 'CANCEL' }}
                      </button>
                      <button @click="confirmAutoGenerate" class="px-4 py-2 bg-black/10 dark:bg-white/10 nier-text-primary hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono tracking-widest uppercase transition-all font-bold">
                         {{ locale === 'ru' ? 'ПОДТВЕРДИТЬ' : 'CONFIRM' }}
                      </button>
                    </div>
                  </div>
                </div>

                <!-- EXIT NODES -->
                <div v-if="activeProtocolTab === 'EXIT'" class="flex flex-col gap-4 transition-all">
                  <div v-for="(ent, idx) in exitEntries" :key="ent.id" class="flex items-center gap-4">
                     <span class="text-[8px] font-mono opacity-40 font-black tracking-widest w-6">#{{ idx + 1 }}</span>
                     <div class="flex-1 flex flex-col gap-1">
                        <span class="text-[7px] uppercase tracking-[0.4em] font-bold opacity-40 nier-text-primary">{{ locale === 'ru' ? 'Уровень_Выхода' : 'Exit_Lvl' }}</span>
                        <input v-model="ent.price" type="number" placeholder="0.00" class="nier-input !text-black dark:!text-white border-b border-black/20 dark:border-white/20 pb-1 w-full" />
                     </div>
                     <div class="flex-1 flex flex-col gap-1">
                        <span class="text-[7px] uppercase tracking-[0.4em] font-bold opacity-40 nier-text-primary">{{ locale === 'ru' ? 'РАЗМЕР_ЛОТА' : 'Lot_Size' }}</span>
                        <input v-model="ent.size" type="number" step="0.01" placeholder="0.01" class="nier-input !text-black dark:!text-white border-b border-black/20 dark:border-white/20 pb-1 w-full" />
                     </div>
                     <button @click="removeExitEntry(ent.id)" class="w-8 h-8 flex items-center justify-center border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white transition-all mt-4">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                     </button>
                  </div>

                  <button @click="addExitEntry" 
                          :disabled="totalSize - totalExitSize <= 0"
                          class="w-full py-4 border border-dashed text-[9px] font-mono tracking-widest uppercase transition-all mt-2 flex items-center justify-center gap-2"
                          :class="(totalSize - totalExitSize <= 0) ? 'border-black/5 dark:border-white/5 text-black/20 dark:text-white/20 cursor-not-allowed' : 'border-black/20 dark:border-white/20 text-black/40 dark:text-white/40 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'">
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                     {{ (totalSize - totalExitSize <= 0) ? (locale === 'ru' ? 'ОБЪЕМ ИСЧЕРПАН' : 'VOLUME_DEPLETED') : (locale === 'ru' ? 'ДОБАВИТЬ_ВЫХОД' : 'Add_Exit_Node') }}
                  </button>
                </div>
              </div>

              <!-- FOOTER (Fixed bottom) -->
              <div class="flex-shrink-0 border-t nier-border-primary pt-6 transition-all">
                <!-- ENTRY FOOTER -->
                <div v-if="activeProtocolTab === 'PYRAMIDING' || activeProtocolTab === 'AVERAGING_DOWN'" class="flex items-center justify-between" :class="{ 'opacity-30 grayscale': !entryMethodEnabled }">
                  <div class="flex flex-col gap-1">
                     <span class="text-[7px] uppercase tracking-[0.4em] font-bold opacity-40 nier-text-primary">{{ locale === 'ru' ? 'СРЕДНЯЯ ЦЕНА ВХОДА' : 'Aggregated_Avg_Entry' }}</span>
                     <span class="text-sm font-mono font-black nier-text-primary">{{ averageEntry > 0 ? averageEntry.toFixed(5) : '0.00' }}</span>
                  </div>
                  <div class="flex flex-col gap-1 items-end">
                     <span class="text-[7px] uppercase tracking-[0.4em] font-bold opacity-40 nier-text-primary">{{ locale === 'ru' ? 'ОБЩИЙ ОБЪЕМ' : 'Total_Volume' }}</span>
                     <span class="text-sm font-mono font-black nier-text-primary">{{ totalSize > 0 ? totalSize.toFixed(2) : '0.00' }}</span>
                  </div>
                </div>

                <!-- EXIT FOOTER -->
                <div v-if="activeProtocolTab === 'EXIT'" class="flex items-center justify-between">
                  <div class="flex flex-col gap-1">
                     <span class="text-[7px] uppercase tracking-[0.4em] font-bold opacity-40 nier-text-primary">{{ locale === 'ru' ? 'СРЕДНЯЯ ЦЕНА ВЫХОДА' : 'Aggregated_Avg_Exit' }}</span>
                     <span class="text-sm font-mono font-black nier-text-primary">{{ averageExit > 0 ? averageExit.toFixed(5) : '0.00' }}</span>
                  </div>
                  <div class="flex flex-col gap-1 items-end">
                     <span class="text-[7px] uppercase tracking-[0.4em] font-bold opacity-40 nier-text-primary">{{ locale === 'ru' ? 'ОБЩИЙ ОБЪЕМ ВЫХОДА' : 'Total_Exit_Volume' }}</span>
                     <span class="text-sm font-mono font-black" :class="(totalExitSize > totalSize) ? 'text-rose-500' : 'nier-text-primary'">
                        {{ totalExitSize > 0 ? totalExitSize.toFixed(2) : '0.00' }} <span class="opacity-40 text-xs">/ {{ totalSize > 0 ? totalSize.toFixed(2) : '0.00' }}</span>
                     </span>
                  </div>
                </div>
              </div>

            </div>

          </ExPanel>
      </div>
    </Transition>

    <!-- TEMPORAL MATRIX WIDGET -->
    <Teleport to="body">
      <Transition name="nier-fade">
        <div v-if="isTemporalOpen" 
             @click.self="isTemporalOpen = false"
             class="fixed inset-0 z-[2000] flex items-center justify-center p-20 bg-black/20 dark:bg-black/40 backdrop-blur-md cursor-pointer">
          <ExPanel variant="light" :no-padding="true" :show-corners="true" :no-shadow="true" class="w-full max-w-4xl !border-black/20 dark:!border-white/20 cursor-auto">
            
            <div class="flex items-center justify-between px-4 py-2 border-b nier-border-primary bg-black/[0.02] dark:bg-white/[0.02]">
            </div>

            <div class="grid grid-cols-2 divide-x divide-black/5 dark:divide-white/5 h-[450px] nier-text-primary">
              <div class="flex flex-col p-10 gap-8">
                <div class="flex flex-col gap-2">
                  <span class="text-[9px] uppercase tracking-widest text-black/40 dark:text-white/20">{{ locale === 'ru' ? 'Часовой_пояс' : 'Time_Zone' }}</span>
                  <div class="relative" @click.stop>
                    <input v-model="timeZoneSearch"
                           spellcheck="false"
                           autocomplete="off"
                           @focus="openTimeZoneMenu"
                           @input="updateTimeZoneSearch"
                           @keydown.escape.prevent="timeZoneMenuOpen = false"
                           @blur="closeTimeZoneMenu"
                           class="w-full border border-black/20 bg-transparent px-3 py-3 pr-24 font-mono text-[10px] font-bold uppercase tracking-[0.22em] outline-none transition-all nier-text-primary placeholder:text-black/20 focus:border-black/40 dark:border-white/20 dark:placeholder:text-white/20 dark:focus:border-white/40" />
                    <span v-if="tradeTimeZoneOffset"
                          class="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 font-mono text-[8px] font-black uppercase tracking-[0.18em] text-black/35 dark:text-white/35">
                      {{ tradeTimeZoneOffset }}
                    </span>
                    <button type="button"
                            @mousedown.prevent
                            @click="timeZoneMenuOpen = !timeZoneMenuOpen"
                            class="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-black/35 transition-colors hover:text-black dark:text-white/35 dark:hover:text-white"
                            :title="locale === 'ru' ? 'Открыть список часовых поясов' : 'Open time zone list'">
                      <svg class="h-3 w-3 transition-transform" :class="timeZoneMenuOpen ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    <Transition name="nier-fade">
                      <div v-if="timeZoneMenuOpen"
                           class="absolute left-0 top-[calc(100%+8px)] z-[2200] w-full border border-black/20 bg-[#f4f1ea] shadow-[10px_10px_0_0_rgba(0,0,0,0.12)] dark:border-white/20 dark:bg-[#090909] dark:shadow-[10px_10px_0_0_rgba(0,0,0,0.45)]">
                        <div class="max-h-48 overflow-y-auto custom-scrollbar py-1">
                          <button v-for="zone in filteredTimeZones"
                                  :key="zone"
                                  type="button"
                                  @mousedown.prevent="selectTimeZone(zone)"
                                  class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left font-mono text-[9px] font-bold uppercase tracking-[0.18em] transition-colors hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                                  :class="tradeTimeZone === zone ? 'bg-black/10 dark:bg-white/10 nier-text-primary' : 'text-black/55 dark:text-white/55'">
                            <span class="truncate">{{ zone }}</span>
                            <span v-if="tradeTimeZone === zone" class="h-1.5 w-1.5 shrink-0 bg-current"></span>
                          </button>

                          <div v-if="filteredTimeZones.length === 0"
                               class="px-3 py-4 text-center font-mono text-[8px] font-bold uppercase tracking-[0.28em] text-black/30 dark:text-white/30">
                            {{ locale === 'ru' ? 'Ничего не найдено' : 'No matches' }}
                          </div>
                        </div>
                      </div>
                    </Transition>
                  </div>
                  <span class="text-[7px] uppercase tracking-[0.3em] text-black/30 dark:text-white/20">
                    {{ locale === 'ru' ? 'Будет сохранён в данных сделки' : 'Saved_into_trade_data' }}
                  </span>
                </div>

                <div class="flex flex-col gap-2">
                  <span class="text-[9px] uppercase tracking-widest text-black/40 dark:text-white/20">Active_Target</span>
                  <div class="flex gap-2">
                    <button v-for="t in ['open', 'exit']" :key="t"
                            @click="activeTemporalTarget = t"
                            class="flex-1 py-3 border border-black/20 dark:border-white/20 text-[10px] uppercase tracking-[0.4em] transition-all"
                            :class="activeTemporalTarget === t ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-transparent text-black/40 hover:bg-black/5 dark:text-white/40 dark:hover:bg-white/5'">
                      {{ t.toUpperCase() }}_ARCHIVE
                    </button>
                  </div>
                </div>

                <div class="flex flex-col gap-4 pt-4 border-t border-black/5 dark:border-white/5">
                  <button @click="activeTemporalTarget === 'open' ? openDate = new Date() : exitDate = new Date()" 
                          class="w-full py-2 border nier-border-primary text-[8px] uppercase tracking-widest text-black/60 hover:bg-black/10 dark:text-white/60 dark:hover:bg-white/10">
                    Sync_to_Current_System_Time
                  </button>
                  <button @click="exitDate = new Date(openDate)" 
                          class="w-full py-2 border nier-border-primary text-[8px] uppercase tracking-widest text-black/60 hover:bg-black/10 dark:text-white/60 dark:hover:bg-white/10">
                    Clone_Open_Protocol_to_Exit
                  </button>
                </div>
              </div>

              <div class="flex flex-col p-10 justify-center">
                <div class="flex flex-col items-center gap-10">
                  <div class="flex items-center gap-4">
                    <div v-for="unit in ['day', 'month', 'year']" :key="unit" class="flex flex-col items-center gap-2">
                      <button @click="adjustDate(activeTemporalTarget, unit, 1); syncTempParts()" class="p-2 opacity-20 hover:opacity-100 transition-opacity"><div class="w-4 h-px nier-bg-inverted"></div></button>
                      <input v-model="tempDateParts[unit]"
                             :maxlength="unit === 'year' ? 4 : 2"
                             @input="e => handleManualDate(activeTemporalTarget, unit, e.target.value)"
                             class="w-24 bg-transparent text-center outline-none text-4xl font-mono font-bold tracking-tighter nier-text-primary" />
                      <button @click="adjustDate(activeTemporalTarget, unit, -1); syncTempParts()" class="p-2 opacity-20 hover:opacity-100 transition-opacity"><div class="w-4 h-px nier-bg-inverted"></div></button>
                      <span class="text-[7px] uppercase tracking-widest text-black/40 dark:text-white/20">{{ unit }}</span>
                    </div>
                  </div>

                  <div class="w-20 h-px bg-black/10 dark:bg-white/10"></div>

                  <div class="flex items-center gap-6">
                    <div v-for="unit in ['hour', 'minute']" :key="unit" class="flex flex-col items-center gap-2">
                      <button @click="adjustDate(activeTemporalTarget, unit, 1); syncTempParts()" class="p-2 opacity-20 hover:opacity-100 transition-opacity"><div class="w-4 h-px nier-bg-inverted"></div></button>
                      <input v-model="tempDateParts[unit]"
                             maxlength="2"
                             @input="e => handleManualDate(activeTemporalTarget, unit, e.target.value)"
                             class="w-20 bg-transparent text-center outline-none text-4xl font-mono font-bold tracking-widest nier-text-primary" />
                      <button @click="adjustDate(activeTemporalTarget, unit, -1); syncTempParts()" class="p-2 opacity-20 hover:opacity-100 transition-opacity"><div class="w-4 h-px nier-bg-inverted"></div></button>
                      <span class="text-[7px] uppercase tracking-widest text-black/40 dark:text-white/20">{{ unit }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ExPanel>
        </div>
      </Transition>
    </Teleport>
</template>
