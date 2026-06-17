<script setup>

import { inject } from 'vue';
import { useI18n } from '~/shared/i18n/useI18n';
const emit = defineEmits(['close']);
const { locale } = useI18n();

import ExPanel from '~/shared/ui/ExPanel.vue';
import ExNTtooltip from '~/shared/ui/ExNTtooltip.vue';
const { themeStore, isDark, viewMode, journalEntries, getArchiveNodeName, addJournalEntry, removeJournalEntry, addJournalEntryTag, removeJournalEntryTag, handleImageUpload, triggerUpload, showCmeNotice, rememberCmeNotice, closeCmeNotice, showAssetMenu, asset, assetSearch, filteredAssets, currentAssetData, selectAsset, matrixNodes, matrixConnections, matrixZones, isMatrixLoading, loadMatrixData, tradeStore, strategies, selectedStrategyId, selectedStrategy, findAllNodes, findAllConnections, findNodeById, activeRiskManagement, activeRiskPerTradeDollars, activeRiskSnapshot, actualRR, actualRiskPercent, violatesRR, violatesRiskPerTrade, riskViolationMessage, getReachableNodes, getNodeZoneType, showStrategyMenu, failedIcons, handleIconError, closeAssetMenu, selectedScenarioNode, getNodesForStrategy, DEFAULT_ENTRY_CONDITIONS, DEFAULT_ENTRY_SCENARIOS, DEFAULT_EXIT_CONDITIONS, DEFAULT_EXIT_SCENARIOS, entryConditions, entryScenarios, exitConditions, exitScenarios, miniExitScenarios, regularExitScenarios, filteredRegistryEntryScenarios, filteredRegistryExitScenarios, currentRegistryScenarioConditions, mismatchedNodeIds, hasVectorMismatch, activeConditions, toggleCondition, showConditionLibrary, showEmotionSelector, registrySearchQuery, libraryFilter, filteredLibraryScenarios, flatLibraryConditions, selectedRegistryScenarioId, hoverTimeout, hoveredScenarioId, handleMouseEnterScenario, handleMouseLeaveScenario, handleMouseEnterInsight, getActiveConditionsInScenario, isScenarioSelected, handleMouseLeaveInsight, getScenarioConditions, getFlattenedScenarioConditions, activeSector, sectors, side, entry, exit, size, entryFee, exitFee, feeType, resultMode, showEntryMethod, activeProtocolTab, entryMethodType, pyramidingEntries, averagingDownEntries, activeMultipleEntries, entryMethodEnabled, hasActiveMethodNode, addMultipleEntry, exitEntries, exitMethodEnabled, totalExitSize, averageExit, addExitEntry, removeExitEntry, removeMultipleEntry, showAutoPrompt, autoEntryBasePrice, autoEntryBaseLots, toggleAutoPrompt, confirmAutoGenerate, totalSize, averageEntry, isForex, isManualEntryAsset, isFixedFeeAsset, overridePnl, liveRates, FALLBACK_RATES, fetchLiveRates, getRate, EMOTION_LIBRARY, emotionsByCategory, showEmotions, selectedEmotions, hoveredEmotion, mousePos, EMOTION_OPPOSITES, toggleEmotion, isEmotionDisabled, stopLoss, takeProfit, openDate, exitDate, cloneDate, adjustDate, formatPart, handleManualDate, projectedProfit, hasValidProjection, equityCurveTrades, isTemporalOpen, activeTemporalTarget, _now, tempDateParts, syncTempParts, openTemporal, scrollContainer, pnl, commitState, resetForm, submit } = inject('tradeState');
</script>

<template>
<!-- CONDITION LIBRARY (RECTANGULAR MENU) -->
    <Teleport to="body">
      <Transition name="nier-fade">
        <div v-if="showConditionLibrary" 
             @click.self="showConditionLibrary = false"
             class="fixed inset-0 z-[10005] flex items-center justify-center p-20">
          
            <ExPanel class="w-full max-w-4xl" noPadding variant="light" :no-shadow="true">
              <template #header>
                <div class="flex items-center justify-between w-full">
                  <span class="text-[9px] font-mono tracking-[0.4em] uppercase font-black">Condition_Matrix_Protocol_v4.0</span>
                  <div class="flex items-center gap-12"></div>
                </div>
              </template>

            <!-- CONTENT GRID -->
            <div class="p-10 flex flex-col space-y-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
              
              <!-- SEARCH & FILTERS (MOVED INSIDE) -->
              <div class="flex items-center justify-between">
                <div class="relative flex items-center">
                  <div class="absolute left-3 w-1.5 h-1.5 bg-black/20 dark:bg-white/20 rotate-45"></div>
                  <input v-model="registrySearchQuery" 
                         placeholder="SEARCH_NODE..." 
                         class="bg-black/5 dark:bg-white/5 border nier-border-primary px-8 py-1.5 text-[9px] font-mono tracking-widest focus:outline-none focus:border-black/30 dark:focus:border-white/30 w-64 uppercase placeholder:opacity-30" />
                </div>

                <div class="flex border nier-border-primary overflow-hidden">
                  <button v-for="f in [
                            { id: 'ALL', icon: 'M4 6h16M4 12h16M4 18h16' },
                            { id: 'ENTRY', icon: 'M19 14l-7 7-7-7m7 7V3' },
                            { id: 'EXIT', icon: 'M5 10l7-7 7 7m-7-7v18' },
                            { id: 'EMOTIONS', icon: 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z' }
                          ]" :key="f.id"
                          @click="libraryFilter = f.id"
                          class="flex items-center justify-center w-12 h-9 transition-all"
                          :class="libraryFilter === f.id ? 'nier-bg-inverted nier-text-primary' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path :d="f.icon" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              <!-- FLAT CONDITION LIST (ONLY FOR 'ALL') -->
              <div v-if="libraryFilter === 'ALL'" class="flex flex-wrap gap-4">
                <ExNTtooltip v-for="cond in flatLibraryConditions" :key="cond.id" :title="cond.isMismatched ? 'WRONG_DIRECTION' : cond.name">
                  <template #trigger>
                     <div @click="!cond.isMismatched && toggleCondition(cond.id, cond.scenarioId)"
                          class="relative w-14 h-14 border -ml-px -mt-px flex items-center justify-center transition-all duration-500 group/node"
                          :class="[
                            cond.isMismatched 
                              ? 'bg-red-500/10 border-red-500/30 cursor-not-allowed'
                              : (activeConditions.has(cond.id) 
                                ? 'nier-bg-inverted border-black dark:border-white shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                                : (cond.priority === 'REQUIRED' ? 'bg-red-500/[0.05] border-red-500/30 hover:border-red-500' : cond.priority === 'ADDITIONAL' ? 'bg-blue-500/[0.05] border-blue-500/30 hover:border-blue-500' : 'bg-black/[0.02] dark:bg-white/[0.02] nier-border-primary hover:border-black dark:hover:border-white'))
                          ]">
                        
                        <div class="absolute top-1 left-1 w-1 h-1 border-t border-l transition-colors duration-500"
                             :class="[
                               cond.isMismatched ? 'border-red-500/30' : (activeConditions.has(cond.id) ? 'border-white/40 dark:border-black/40' : 'nier-border-primary')
                             ]"></div>

                        <!-- PRIORITY ACCENT / BADGE -->
                        <div v-if="cond.priority && cond.priority !== 'NONE'"
                             class="absolute top-1 right-1 px-1 py-0.2 text-[5px] font-mono font-bold tracking-tighter uppercase border"
                             :class="cond.priority === 'REQUIRED' ? 'border-red-500/50 text-red-500 bg-red-500/10' : 'border-blue-500/50 text-blue-500 bg-blue-500/10'">
                          {{ cond.priority === 'REQUIRED' ? 'REQ' : 'ADD' }}
                        </div>

                        <span class="text-[14px] font-mono font-black tracking-tighter uppercase transition-colors"
                              :class="[
                                cond.isMismatched ? 'text-red-500/50' : (activeConditions.has(cond.id) ? 'nier-text-primary' : 'text-black/40 dark:text-white/40 group-hover/node:text-black dark:group-hover/node:text-white')
                              ]">
                          {{ (cond.name || '').slice(0, 3) }}
                        </span>

                        <div v-if="activeConditions.has(cond.id)" 
                             class="absolute -bottom-1 -right-1 w-2.5 h-2.5 rotate-45 border-2 border-white dark:border-black shadow-sm transition-colors duration-500"
                             :class="entryConditions.some(e => e.id === cond.id) ? 'bg-blue-500' : 'bg-amber-500'"></div>
                     </div>
                  </template>
                  <div class="flex flex-col gap-1">
                     <div class="flex items-center justify-between">
                       <span class="text-[8px] font-mono opacity-40">{{ cond.isMismatched ? 'CRITICAL_WARNING' : 'TELEMETRY_DESCRIPTION' }}</span>
                       <span v-if="cond.priority && cond.priority !== 'NONE'" 
                             class="px-1 py-0.5 text-[6px] font-mono tracking-widest uppercase border"
                             :class="cond.priority === 'REQUIRED' ? 'border-red-500 text-red-500' : 'border-blue-500 text-blue-500'">
                         {{ cond.priority }}
                       </span>
                     </div>
                     <p class="text-[9px] font-mono leading-relaxed uppercase" :class="cond.isMismatched ? 'text-red-500' : 'opacity-60'">
                       {{ cond.isMismatched ? 'PROTOCOL_DIRECTION_MISMATCH: THE TRADE SIDE DOES NOT ALIGN WITH THIS TACTICAL SCENARIO.' : (cond.description || 'NO_METADATA_AVAILABLE') }}
                     </p>
                  </div>
                </ExNTtooltip>
              </div>

              <!-- EMOTIONS LIST -->
              <div v-else-if="libraryFilter === 'EMOTIONS'" class="flex flex-col space-y-10">
                <div v-for="(emotions, category) in emotionsByCategory" :key="category" class="flex flex-col space-y-4">
                  <!-- CATEGORY HEADER -->
                  <div class="flex items-center gap-4">
                    <div class="w-1.5 h-1.5 bg-black/40 dark:bg-white/40 rotate-45"></div>
                    <span class="text-[9px] font-mono tracking-[0.2em] text-black/60 dark:text-white/60 uppercase">{{ category }}</span>
                    <div class="flex-1 h-px bg-black/5 dark:bg-white/5"></div>
                    <span class="text-[7px] font-mono opacity-20 uppercase tracking-[0.4em]">Sentiment_Protocol</span>
                  </div>

                  <!-- EMOTION MATRIX -->
                  <div class="flex flex-wrap gap-4">
                    <ExNTtooltip v-for="emotion in emotions" :key="emotion.label" :title="emotion.label">
                      <template #trigger>
                         <div @click="toggleEmotion(emotion.label)"
                              class="relative w-14 h-14 border -ml-px -mt-px flex items-center justify-center cursor-pointer transition-all duration-500 group/node"
                              :class="[
                                selectedEmotions.includes(emotion.label) 
                                  ? 'nier-bg-inverted border-black dark:border-white shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                                  : 'bg-black/[0.02] dark:bg-white/[0.02] nier-border-primary hover:border-black dark:hover:border-white'
                              ]">
                            
                            <div class="absolute top-1 left-1 w-1 h-1 border-t border-l transition-colors duration-500"
                                 :class="selectedEmotions.includes(emotion.label) ? 'border-white/40 dark:border-black/40' : 'nier-border-primary'"></div>

                            <span class="text-[12px] font-mono font-black tracking-tighter uppercase text-center leading-none"
                                  :class="selectedEmotions.includes(emotion.label) ? 'nier-text-primary' : 'text-black/40 dark:text-white/40 group-hover:text-black dark:group-hover:text-white'">
                              {{ emotion.label.slice(0, 3) }}
                            </span>

                            <div v-if="selectedEmotions.includes(emotion.label)" 
                                 class="absolute -bottom-1 -right-1 w-2.5 h-2.5 rotate-45 border-2 border-white dark:border-black shadow-sm transition-colors duration-500"
                                 :class="category === 'POSITIVE' ? 'bg-emerald-500' : category === 'NEGATIVE' ? 'bg-rose-500' : 'bg-blue-500'"></div>
                         </div>
                      </template>
                      <div class="flex flex-col gap-1">
                         <span class="text-[8px] font-mono opacity-40">SENTIMENT_ANALYSIS</span>
                         <p class="text-[9px] font-mono leading-relaxed opacity-60 uppercase">{{ emotion.description || 'NO_METADATA_AVAILABLE' }}</p>
                      </div>
                    </ExNTtooltip>
                  </div>
                </div>
              </div>

              <!-- GROUPED SCENARIO LIST (FOR 'ENTRY' / 'EXIT') -->
              <div v-else v-for="scen in filteredLibraryScenarios" :key="scen.id" class="flex flex-col space-y-4">
                
                <!-- SCENARIO HEADER -->
                <div class="flex items-center gap-4">
                  <div class="w-1.5 h-1.5 bg-black/40 dark:bg-white/40 rotate-45"></div>
                  <span class="text-[9px] font-mono tracking-[0.2em] text-black/60 dark:text-white/60 uppercase">{{ scen.params?.customName || scen.label }}</span>
                  <div class="flex-1 h-px bg-black/5 dark:bg-white/5"></div>
                  <span class="text-[7px] font-mono opacity-20 uppercase tracking-[0.4em]">Scenario_Node</span>
                </div>

                <!-- CONDITION MATRIX -->
                <div class="flex flex-wrap gap-4">
                  <ExNTtooltip v-for="cond in getFlattenedScenarioConditions(scen.id)" :key="cond.id" :title="cond.name">
                    <template #trigger>
                       <div @click="toggleCondition(cond.id, scen.id)"
                            class="relative w-14 h-14 border -ml-px -mt-px flex items-center justify-center cursor-pointer transition-all duration-500 group/node"
                            :class="[
                              activeConditions.has(cond.id) 
                                ? 'nier-bg-inverted border-black dark:border-white shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                                : (cond.priority === 'REQUIRED' ? 'bg-red-500/[0.05] border-red-500/30 hover:border-red-500' : cond.priority === 'ADDITIONAL' ? 'bg-blue-500/[0.05] border-blue-500/30 hover:border-blue-500' : 'bg-black/[0.02] dark:bg-white/[0.02] nier-border-primary hover:border-black dark:hover:border-white')
                            ]">
                          
                          <!-- CORNER ACCENT -->
                          <div class="absolute top-1 left-1 w-1 h-1 border-t border-l transition-colors duration-500"
                               :class="activeConditions.has(cond.id) ? 'border-white/40 dark:border-black/40' : 'nier-border-primary'"></div>

                          <!-- PRIORITY ACCENT / BADGE -->
                          <div v-if="cond.priority && cond.priority !== 'NONE'"
                               class="absolute top-1 right-1 px-1 py-0.2 text-[5px] font-mono font-bold tracking-tighter uppercase border"
                               :class="cond.priority === 'REQUIRED' ? 'border-red-500/50 text-red-500 bg-red-500/10' : 'border-blue-500/50 text-blue-500 bg-blue-500/10'">
                            {{ cond.priority === 'REQUIRED' ? 'REQ' : 'ADD' }}
                          </div>

                          <span class="text-[14px] font-mono font-black tracking-tighter uppercase"
                                :class="activeConditions.has(cond.id) ? 'nier-text-primary' : 'text-black/40 dark:text-white/40 group-hover/node:text-black dark:group-hover/node:text-white'">
                            {{ (cond.name || '').slice(0, 3) }}
                          </span>

                          <!-- ACTIVE INDICATOR -->
                          <div v-if="activeConditions.has(cond.id)" 
                               class="absolute -bottom-1 -right-1 w-2.5 h-2.5 rotate-45 border-2 border-white dark:border-black shadow-sm transition-colors duration-500"
                               :class="entryConditions.some(e => e.id === cond.id) ? 'bg-blue-500' : 'bg-amber-500'"></div>
                       </div>
                    </template>
                    <div class="flex flex-col gap-1">
                       <div class="flex items-center justify-between">
                         <span class="text-[8px] font-mono opacity-40">TELEMETRY_DESCRIPTION</span>
                         <span v-if="cond.priority && cond.priority !== 'NONE'" 
                               class="px-1 py-0.5 text-[6px] font-mono tracking-widest uppercase border"
                               :class="cond.priority === 'REQUIRED' ? 'border-red-500 text-red-500' : 'border-blue-500 text-blue-500'">
                           {{ cond.priority }}
                         </span>
                       </div>
                       <p class="text-[9px] font-mono leading-relaxed opacity-60 uppercase">{{ cond.description || 'NO_METADATA_AVAILABLE' }}</p>
                    </div>
                  </ExNTtooltip>
                </div>
              </div>
            </div>

            </ExPanel>
        </div>
      </Transition>
    </Teleport>

    
</template>
