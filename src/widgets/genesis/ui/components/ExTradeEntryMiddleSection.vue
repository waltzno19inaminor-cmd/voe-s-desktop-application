<script setup>

import { inject } from 'vue';
import { useI18n } from '~/shared/i18n/useI18n';
const emit = defineEmits(['close']);
const { locale } = useI18n();

import ExEquityCurve2D from '~/widgets/genesis/ui/ExEquityCurve2D.vue';
import ExPanel from '~/shared/ui/ExPanel.vue';
const { themeStore, isDark, viewMode, journalEntries, getArchiveNodeName, addJournalEntry, removeJournalEntry, addJournalEntryTag, removeJournalEntryTag, handleImageUpload, triggerUpload, showCmeNotice, rememberCmeNotice, closeCmeNotice, showAssetMenu, asset, assetSearch, filteredAssets, currentAssetData, selectAsset, matrixNodes, matrixConnections, matrixZones, isMatrixLoading, loadMatrixData, tradeStore, strategies, selectedStrategyId, selectedStrategy, findAllNodes, findAllConnections, findNodeById, activeRiskManagement, activeRiskPerTradeDollars, activeRiskSnapshot, actualRR, actualRiskPercent, violatesRR, violatesRiskPerTrade, riskViolationMessage, getReachableNodes, getNodeZoneType, showStrategyMenu, failedIcons, handleIconError, closeAssetMenu, selectedScenarioNode, getNodesForStrategy, DEFAULT_ENTRY_CONDITIONS, DEFAULT_ENTRY_SCENARIOS, DEFAULT_EXIT_CONDITIONS, DEFAULT_EXIT_SCENARIOS, entryConditions, entryScenarios, exitConditions, exitScenarios, miniExitScenarios, regularExitScenarios, filteredRegistryEntryScenarios, filteredRegistryExitScenarios, currentRegistryScenarioConditions, mismatchedNodeIds, hasVectorMismatch, activeConditions, toggleCondition, showConditionLibrary, showEmotionSelector, registrySearchQuery, libraryFilter, filteredLibraryScenarios, flatLibraryConditions, selectedRegistryScenarioId, hoverTimeout, hoveredScenarioId, handleMouseEnterScenario, handleMouseLeaveScenario, handleMouseEnterInsight, getActiveConditionsInScenario, isScenarioSelected, handleMouseLeaveInsight, getScenarioConditions, getFlattenedScenarioConditions, activeSector, sectors, side, entry, exit, size, entryFee, exitFee, feeType, resultMode, showEntryMethod, activeProtocolTab, entryMethodType, pyramidingEntries, averagingDownEntries, activeMultipleEntries, entryMethodEnabled, hasActiveMethodNode, addMultipleEntry, exitEntries, exitMethodEnabled, totalExitSize, averageExit, addExitEntry, removeExitEntry, removeMultipleEntry, showAutoPrompt, autoEntryBasePrice, autoEntryBaseLots, toggleAutoPrompt, confirmAutoGenerate, totalSize, averageEntry, isForex, isManualEntryAsset, isFixedFeeAsset, overridePnl, liveRates, FALLBACK_RATES, fetchLiveRates, getRate, EMOTION_LIBRARY, emotionsByCategory, showEmotions, selectedEmotions, hoveredEmotion, mousePos, EMOTION_OPPOSITES, toggleEmotion, isEmotionDisabled, stopLoss, takeProfit, openDate, exitDate, cloneDate, adjustDate, formatPart, handleManualDate, projectedProfit, hasValidProjection, equityCurveTrades, isTemporalOpen, activeTemporalTarget, _now, tempDateParts, syncTempParts, openTemporal, scrollContainer, pnl, commitState, resetForm, submit } = inject('tradeState');
</script>

<template>
<!-- MIDDLE SECTION: TACTICAL MENUS OR JOURNAL -->
    <div class="w-full flex justify-center">
      <div class="max-w-6xl w-full px-6 pb-12 py-8">
        <Transition name="sector-swap" mode="out-in">
          <div v-if="viewMode === 'tactical'" key="tactical" class="flex flex-col space-y-12">
            <!-- CONDITION CONFIGURATION PANEL (LEGACY DESCRIPTION AESTHETIC) -->
            <div v-if="selectedRegistryScenarioId" class="flex flex-col space-y-12 animate-in fade-in zoom-in-95 duration-1000 max-w-5xl mx-auto">
               
               <!-- Protocol Briefing Header -->
               <div class="flex flex-col space-y-6 border-b border-black/5 dark:border-white/5 pb-10">
                  <div class="flex items-center gap-4">
                     <div class="w-2 h-2 nier-bg-inverted rotate-45"></div>
                     <span class="text-[9px] font-mono tracking-[0.6em] text-black/80 dark:text-white/80 uppercase">Archival_Briefing_Protocol</span>
                  </div>
                  
                  <div class="flex items-start justify-between">
                      <div class="flex flex-col space-y-4 max-w-2xl relative">
                        <!-- CINEMATIC ACCENT -->
                        <div class="absolute -left-10 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-black/20 dark:via-white/20 to-transparent"></div>
                        
                        <h1 class="text-3xl font-light font-serif tracking-[0.4em] drop-shadow-sm leading-relaxed">
                          {{ (entryScenarios.find(s => s.id === selectedRegistryScenarioId) || regularExitScenarios.find(s => s.id === selectedRegistryScenarioId))?.params?.customName || 'UNKNOWN_PROTOCOL' }}
                      </h1>
                        <p class="text-[11px] font-mono leading-relaxed opacity-60 uppercase tracking-[0.2em] max-w-xl">
                           {{ (entryScenarios.find(s => s.id === selectedRegistryScenarioId) || regularExitScenarios.find(s => s.id === selectedRegistryScenarioId))?.params?.description || 'No specialized mission description available for this protocol branch.' }}
                        </p>
                     </div>

                     <div class="flex flex-col items-end gap-6">
                        <div class="flex flex-col items-end">
                           <span class="text-[7px] font-mono opacity-20 uppercase tracking-widest">Protocol_Hash</span>
                           <span class="text-[9px] font-mono text-black/70 dark:text-white/80 uppercase tracking-tighter">0x{{ selectedRegistryScenarioId.slice(0, 8).toUpperCase() }}</span>
                        </div>
                        <button @click="showConditionLibrary = true; selectedRegistryScenarioId = null" 
                                class="group/save relative h-14 px-12 nier-bg-inverted dark:text-black  font-black border hover:border-black dark:hover:border-white dark:hover:bg-black hover:bg-white text-white dark:hover:text-white hover:text-black transition-all duration-500 ease-in-out">
                           <span class="relative z-10 text-[11px] uppercase tracking-[0.8em]">Accept </span>
                        </button>
                     </div>
                  </div>
               </div>

               <!-- Conditions Matrix (Hierarchical Tree) -->
               <div class="flex flex-col space-y-12">
                  <div class="flex items-center justify-between">
                     <span class="text-[10px] font-mono tracking-[0.4em] text-black/80 dark:text-white/75 uppercase">Tactical_Requirements_Chain</span>
                     <span class="text-[10px] font-mono text-black/80 dark:text-white/80 uppercase tracking-widest">{{ currentRegistryScenarioConditions.length }}_Root_Nodes</span>
                  </div>

                  <div v-if="currentRegistryScenarioConditions.length > 0" class="flex flex-col space-y-10">
                    <!-- Root Level: Conditions -->
                    <div v-for="cond in currentRegistryScenarioConditions" :key="cond.id"
                         class="flex flex-col space-y-4 group/cond">
                       
                       <!-- Condition Header (Non-clickable structural guide) -->
                       <div class="relative flex items-center justify-between p-4 border transition-all duration-500 overflow-hidden"
                            :class="[
                              'border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01]',
                              mismatchedNodeIds.has(cond.id) ? '!border-red-500/30 !bg-red-500/5' : ''
                            ]">
                          
                          <div class="flex items-center gap-4 relative z-10">
                             <div class="flex flex-col items-center">
                                <div class="w-1.5 h-1.5 rotate-45 transition-colors duration-500"
                                     :class="mismatchedNodeIds.has(cond.id) ? 'bg-red-500' : 'bg-black/20 dark:bg-white/20'"></div>
                                <div class="w-px h-8 bg-black/5 dark:bg-white/5 mt-2"></div>
                             </div>
                             
                             <div class="flex flex-col">
                                <div class="flex items-center gap-3">
                                   <span class="text-xl font-serif italic tracking-[0.1em] uppercase transition-colors"
                                         :class="mismatchedNodeIds.has(cond.id) ? 'text-red-500' : 'text-black/80 dark:text-white/80'">
                                      {{ cond.name }}
                                   </span>
                                   <div v-if="cond.direction" 
                                        class="px-1.5 py-0.5 border text-[6px] font-mono tracking-widest uppercase transition-colors"
                                        :class="mismatchedNodeIds.has(cond.id) ? 'border-red-500/50 text-red-500' : 'nier-border-primary text-black/80 dark:text-white/80'">
                                      {{ cond.direction }}
                                   </div>
                                   <div v-if="cond.priority && cond.priority !== 'NONE'" 
                                        class="px-1.5 py-0.5 border text-[6px] font-mono tracking-widest uppercase transition-colors"
                                        :class="cond.priority === 'REQUIRED' ? 'border-red-500/50 text-red-500' : 'border-blue-500/50 text-blue-500'">
                                      {{ cond.priority }}
                                   </div>
                                </div>
                                <p class="text-[10px] font-mono uppercase tracking-widest opacity-40 max-w-xl transition-colors"
                                   :class="mismatchedNodeIds.has(cond.id) ? '!text-red-500/40' : ''">
                                   {{ mismatchedNodeIds.has(cond.id) ? '[ PROTOCOL_INCOMPATIBLE: DIRECTIONAL_VECTOR_MISMATCH ]' : (cond.description || 'Tactical requirement group.') }}
                                </p>
                             </div>
                          </div>

                          <div class="flex items-center gap-4 relative z-10 opacity-20">
                             <span class="text-[8px] font-mono font-black uppercase tracking-widest transition-colors"
                                   :class="mismatchedNodeIds.has(cond.id) ? 'text-red-500' : 'text-black/20 dark:text-white/75'">
                                {{ mismatchedNodeIds.has(cond.id) ? 'LOCKED' : 'CLUSTER_ROOT' }}
                             </span>
                          </div>
                       </div>

                          <!-- SELECTION GLOW -->
                          <div v-if="activeConditions.has(cond.id)" class="absolute inset-0 bg-black/[0.02] animate-pulse"></div>


                       <!-- Second Level: Logic Clusters & Indicators -->
                       <div v-if="cond.indicatorUnits && cond.indicatorUnits.length > 0" class="pl-12 flex flex-col space-y-3 border-l border-black/5 dark:border-white/5 ml-5">
                          <div v-for="(unit, uIdx) in cond.indicatorUnits" :key="uIdx" class="flex flex-col space-y-2">
                             
                             <!-- Logic Bundle Header -->
                             <template v-if="unit.type === 'bundle'">
                                <div class="flex items-center gap-2">
                                   <div class="w-1.5 h-[1px] bg-black/20 dark:bg-white/20"></div>
                                   <span class="text-[7px] font-mono tracking-[0.3em] text-black/80 dark:text-white/75 uppercase">{{ unit.logic }}_CLUSTER</span>
                                </div>
                                
                                <!-- Third Level: Nested Indicators -->
                                <div class="pl-6 grid grid-cols-2 gap-3">
                                   <div v-for="item in unit.items" :key="item.id"
                                        @click="toggleCondition(item.id, selectedRegistryScenarioId)"
                                        class="flex items-start gap-3 p-3 border transition-all cursor-pointer group/item overflow-hidden relative"
                                        :class="[
                                          activeConditions.has(item.id) ? 'nier-bg-inverted border-black dark:border-white' : 'bg-black/[0.01] dark:bg-white/[0.01] border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10',
                                          mismatchedNodeIds.has(item.id) ? '!border-red-500/20 !bg-red-500/5 !pointer-events-none' : ''
                                        ]">
                                      <div class="w-1 h-1 border rotate-45 mt-1.5 transition-colors"
                                           :class="[
                                             activeConditions.has(item.id) ? 'nier-bg-panel border-white dark:border-black' : 'border-black/20 dark:border-white/20 group-hover/item:bg-black/40 dark:group-hover/item:bg-white/40',
                                             mismatchedNodeIds.has(item.id) ? '!bg-red-500 !border-red-500' : ''
                                           ]"></div>
                                      <div class="flex flex-col relative z-10">
                                         <div class="flex items-center gap-2">
                                            <span class="text-[9px] font-mono font-bold tracking-widest uppercase transition-colors"
                                                  :class="[
                                                    activeConditions.has(item.id) ? 'nier-text-primary' : 'text-black/80 dark:text-white/90 group-hover/item:text-black dark:group-hover/item:text-white',
                                                    mismatchedNodeIds.has(item.id) ? '!text-red-500' : ''
                                                  ]">{{ item.label }}</span>
                                            <span v-if="item.priority && item.priority !== 'NONE'" 
                                                  class="px-1 py-0.5 text-[6px] font-mono tracking-widest uppercase border"
                                                  :class="item.priority === 'REQUIRED' ? 'border-red-500/50 text-red-500' : 'border-blue-500/50 text-blue-500'">
                                              {{ item.priority }}
                                            </span>
                                         </div>
                                         <span class="text-[9px] font-mono uppercase tracking-tighter truncate transition-colors"
                                               :class="activeConditions.has(item.id) ? 'text-white/40 dark:text-black/40' : 'text-black/60 dark:text-white/75'">{{ item.description || 'No telemetry.' }}</span>
                                      </div>
                                      <div v-if="activeConditions.has(item.id)" class="absolute inset-0 bg-black/[0.02] animate-pulse"></div>
                                   </div>
                                </div>
                             </template>

                             <!-- Isolated Indicator -->
                             <template v-else>
                                <div @click="toggleCondition(unit.item.id, selectedRegistryScenarioId)"
                                     class="flex items-start gap-3 p-3 border transition-all cursor-pointer group/item w-1/2 overflow-hidden relative"
                                     :class="[
                                       activeConditions.has(unit.item.id) ? 'nier-bg-inverted border-black dark:border-white' : 'bg-black/[0.01] dark:bg-white/[0.01] border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10',
                                       mismatchedNodeIds.has(unit.item.id) ? '!border-red-500/20 !bg-red-500/5 !pointer-events-none' : ''
                                     ]">
                                   <div class="w-1 h-1 border rotate-45 mt-1.5 transition-colors"
                                        :class="[
                                          activeConditions.has(unit.item.id) ? 'nier-bg-panel border-white dark:border-black' : 'border-black/20 dark:border-white/20 group-hover/item:bg-black/40 dark:group-hover/item:bg-white/40',
                                          mismatchedNodeIds.has(unit.item.id) ? '!bg-red-500 !border-red-500' : ''
                                        ]"></div>
                                   <div class="flex flex-col flex-1 min-w-0 relative z-10">
                                      <div class="flex items-center justify-between w-full">
                                         <div class="flex items-center gap-2">
                                            <span class="text-[9px] font-mono font-black tracking-widest uppercase transition-colors"
                                                  :class="[
                                                    activeConditions.has(unit.item.id) ? 'nier-text-primary' : 'text-black/80 dark:text-white/90 group-hover/item:text-black dark:group-hover/item:text-white',
                                                    mismatchedNodeIds.has(unit.item.id) ? '!text-red-500' : ''
                                                  ]">{{ unit.item.label }}</span>
                                            <span v-if="unit.item.priority && unit.item.priority !== 'NONE'" 
                                                  class="px-1 py-0.5 text-[6px] font-mono tracking-widest uppercase border"
                                                  :class="unit.item.priority === 'REQUIRED' ? 'border-red-500/50 text-red-500' : 'border-blue-500/50 text-blue-500'">
                                              {{ unit.item.priority }}
                                            </span>
                                         </div>
                                         <span v-if="unit.item.direction" class="text-[6px] font-mono uppercase tracking-widest transition-colors"
                                               :class="activeConditions.has(unit.item.id) ? 'text-white/40 dark:text-black/40' : 'text-amber-500/30'">{{ unit.item.direction }}</span>
                                      </div>
                                      <span class="text-[9px] font-mono uppercase tracking-tighter truncate mt-0.5 transition-colors"
                                            :class="activeConditions.has(unit.item.id) ? 'text-white/40 dark:text-black/40' : 'text-black/60 dark:text-white/75'">{{ unit.item.description || 'Primary indicator.' }}</span>
                                   </div>
                                   <div v-if="activeConditions.has(unit.item.id)" class="absolute inset-0 bg-black/[0.02] animate-pulse"></div>
                                </div>
                             </template>

                          </div>
                       </div>
                    </div>
                  </div>
                  <div v-else class="flex flex-col items-center justify-center py-24 border border-dashed border-white/5 opacity-20">
                     <span class="text-[10px] font-mono tracking-[0.4em] uppercase">No_Checkpoints_Detected</span>
                  </div>
               </div>

               <!-- Footer Metadata -->
               <div class="flex items-center justify-between pt-10 border-t border-white/5 opacity-20">
                  <span class="text-[7px] font-mono tracking-widest uppercase">System_State: {{ viewMode.toUpperCase() }}</span>
                  <div class="flex gap-4">
                     <span class="text-[7px] font-mono tracking-widest uppercase">Encryption: AES_256</span>
                     <span class="text-[7px] font-mono tracking-widest uppercase">Lattice: v1.0.42</span>
                     <!-- DEBUG UI -->
                     <span class="text-[7px] font-mono tracking-widest uppercase text-red-400">DEBUG_STRAT: {{ selectedStrategyId }} | HIST: {{ equityCurveTrades.length }}</span>
                  </div>
               </div>
            </div>

             <!-- TACTICAL EQUITY PROJECTION (Replaced Void) -->
             <div v-else class="relative w-full h-[500px] flex flex-col items-center justify-center border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] group z-10">
                <Transition name="sector-swap" mode="out-in">
                  <div v-if="hasValidProjection" key="curve" class="absolute inset-0 w-full h-full">
                     <ExEquityCurve2D :trades="equityCurveTrades" :initial-balance="1000" />
                  </div>
                  <div v-else key="empty" class="flex flex-col items-center justify-center py-20 opacity-20">
                     <div class="w-16 h-px nier-bg-inverted mb-8 group-hover:w-24 transition-all duration-700"></div>
                     <span class="text-[9px] font-mono tracking-[0.6em] uppercase nier-text-primary">NOT_ENOUGH_DATA_FOR_PROJECTION</span>
                     <div class="mt-8 flex gap-2">
                        <div v-for="i in 3" :key="i" class="w-1 h-1 bg-black/20 dark:bg-white/20 rotate-45"></div>
                     </div>
                  </div>
                </Transition>
             </div>
          </div>

          <div v-else key="journal" class="flex flex-col space-y-8">
            <div class="flex items-center justify-between w-full border-b border-black/5 dark:border-white/5 pb-6">
              <div class="flex items-center space-x-4">
                <div class="w-1.5 h-1.5 nier-bg-inverted rotate-45"></div>
                <span class="text-[9px] font-mono tracking-[0.4em] uppercase font-black nier-text-primary">EVIDENCE_ARCHIVE</span>
              </div>
              <button @click="addJournalEntry" class="flex items-center space-x-3 group px-4 py-1.5 border nier-border-primary hover:bg-black dark:hover:bg-white transition-all">
                 <span class="text-[8px] font-mono tracking-widest uppercase font-black text-black/40 dark:text-white/80 group-hover:text-white dark:group-hover:text-black">New_Archive_Slot</span>
                 <div class="w-1.5 h-1.5 bg-black/20 dark:bg-white/20 rotate-45 group-hover:bg-white dark:group-hover:bg-black"></div>
              </button>
            </div>

            <div v-if="journalEntries.length === 0" class="flex flex-col items-center justify-center py-32 border border-dashed nier-border-primary opacity-30">
              <div class="w-12 h-px nier-bg-inverted mb-6 animate-pulse"></div>
              <span class="text-[9px] font-mono tracking-[0.6em] uppercase nier-text-primary">No_Evidences_In_The_Archive</span>
              <div class="mt-6 flex gap-2">
                <div v-for="i in 3" :key="i" class="w-1 h-1 bg-black/20 dark:bg-white/20 rotate-45"></div>
              </div>
            </div>

            <div v-else class="grid grid-cols-2 gap-8">
                 <ExPanel v-for="entry in journalEntries" :key="entry.id" variant="light" :no-padding="true" :show-corners="true" :no-shadow="true"
                       class="group flex flex-col transition-all duration-500 hover:!border-black/30 dark:hover:!border-white/30 !border-black/10 dark:!border-white/10 nier-text-primary">
                    
                    <!-- Remove Button -->
                    <button @click.stop="removeJournalEntry(entry.id)" 
                            class="absolute top-0 right-0 z-30 w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-500/80 hover:text-white nier-text-primary border-l border-b nier-border-primary">
                       <span class="text-[10px] font-mono">✕</span>
                    </button>
 
                    <!-- Image Upload Area -->
                    <div @click="triggerUpload(entry.id)" 
                         class="relative aspect-video cursor-pointer overflow-hidden border-b nier-border-primary bg-black/5 dark:bg-white/5 group/img">
                       <input :id="`file-input-${entry.id}`" type="file" class="hidden" accept="image/*" @change="e => handleImageUpload(entry.id, e)" />
                       
                       <div v-if="entry.image" class="w-full h-full">
                          <img :src="entry.image" class="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" />
                          <div class="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                             <span class="text-[8px] font-mono tracking-widest uppercase text-white font-black bg-black/60 px-4 py-2">Replace_Stream</span>
                          </div>
                       </div>
                       <div v-else class="w-full h-full flex flex-col items-center justify-center space-y-4">
                          <div class="w-8 h-8 border border-black/20 dark:border-white/20 rotate-45 flex items-center justify-center group-hover/img:border-black dark:group-hover/img:border-white transition-colors">
                             <div class="w-1.5 h-1.5 bg-black/40 dark:bg-white/40 rotate-45"></div>
                          </div>
                          <span class="text-[8px] font-mono tracking-[0.4em] uppercase opacity-30 group-hover/img:opacity-100 nier-text-primary">Upload_Tactical_Capture</span>
                       </div>
 
                       <!-- SCANNING LINE -->
                       <div class="absolute inset-0 pointer-events-none opacity-[0.05] overflow-hidden">
                          <div class="w-full h-px nier-bg-inverted animate-scan"></div>
                       </div>
                    </div>
 
                    <!-- Controls & Info -->
                    <div class="p-6 flex flex-col space-y-4 nier-text-primary">
                       <!-- Visual metadata aligned with Trade Analytics Visuals -->
                       <div class="relative">
                          <input v-model="entry.name"
                                 type="text"
                                 placeholder="Archive_Node_Name..."
                                 class="w-full bg-transparent border border-black/5 dark:border-white/5 px-4 py-3 text-[10px] font-mono tracking-[0.2em] font-black focus:outline-none transition-all nier-text-primary uppercase placeholder:opacity-20 focus:border-black/20 dark:focus:border-white/20" />
                       </div>

                       <div class="flex flex-col gap-3">
                          <div class="flex flex-wrap gap-2 min-h-7">
                             <span v-for="tag in entry.tags" :key="tag"
                                   class="flex items-center gap-2 border nier-border-primary px-2 py-1 text-[8px] font-mono uppercase tracking-widest text-black/60 dark:text-white/70">
                                {{ tag }}
                                <button @click="removeJournalEntryTag(entry, tag)"
                                        class="text-[9px] leading-none opacity-40 hover:opacity-100 hover:text-red-500 transition-all">
                                   x
                                </button>
                             </span>
                             <span v-if="!entry.tags?.length" class="text-[8px] font-mono uppercase tracking-[0.3em] opacity-20 self-center nier-text-primary">
                                No_Tags_Attached
                             </span>
                          </div>

                          <div class="flex items-center gap-2">
                             <input v-model="entry.tagInput"
                                    @keyup.enter="addJournalEntryTag(entry)"
                                    type="text"
                                    placeholder="Custom_Tag..."
                                    class="flex-1 bg-transparent border border-black/5 dark:border-white/5 px-3 py-2 text-[9px] font-mono uppercase tracking-widest focus:outline-none transition-all nier-text-primary placeholder:opacity-20 focus:border-black/20 dark:focus:border-white/20" />
                             <button @click="addJournalEntryTag(entry)"
                                     class="px-3 py-2 border nier-border-primary text-[8px] font-mono uppercase tracking-widest opacity-50 hover:opacity-100 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all">
                                Add_Tag
                             </button>
                          </div>
                       </div>
 
                       <!-- Footer Metadata -->
                       <div class="flex items-center justify-between opacity-20 nier-text-primary">
                          <span class="text-[6px] font-mono uppercase tracking-widest">Archive_ID: {{ entry.id.toString(16).toUpperCase().slice(-6) }}</span>
                          <button @click="removeJournalEntry(entry.id)" class="hover:text-red-500 transition-colors">
                             <span class="text-[6px] font-mono uppercase tracking-widest">[ DE-SYNC ]</span>
                          </button>
                       </div>
                    </div>
                  </ExPanel>
              </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- LEFT SIDE PHANTOM CLUSTER (Stealth Mode) -->
    <Teleport to="body">
      <Transition name="nier-fade">
        <div v-if="!showConditionLibrary && !showEmotionSelector && !showEntryMethod" 
             class="fixed left-10 top-1/2 -translate-y-1/2 flex flex-col gap-10 z-[9999]">
        <!-- UNIFIED MATRIX TOGGLE -->
        <button @click="showConditionLibrary = !showConditionLibrary" 
                :disabled="commitState === 'loading'"
                class="group relative opacity-35 hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-300 disabled:cursor-not-allowed">
           <div class="relative flex items-center justify-center w-12 h-12">
              <div class="absolute inset-0 border border-black/20 dark:border-white/20 rotate-45 group-hover:bg-black dark:group-hover:bg-white group-hover:border-black dark:group-hover:border-white transition-all duration-500 shadow-xl"
                   :class="{ 'nier-bg-inverted border-black dark:border-white': showConditionLibrary }"></div>
              <div class="w-3 h-3 flex items-center justify-center relative z-10 transition-all duration-700 group-hover:text-white dark:group-hover:text-black"
                   :class="showConditionLibrary ? 'nier-text-primary' : 'nier-text-primary'">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                   <rect x="3" y="3" width="7" height="7" />
                   <rect x="14" y="3" width="7" height="7" />
                   <rect x="14" y="14" width="7" height="7" />
                   <rect x="3" y="14" width="7" height="7" />
                 </svg>
              </div>
              <div class="absolute left-full ml-8 opacity-0 group-hover:opacity-100 transition-all duration-500 -translate-x-4 group-hover:translate-x-0 whitespace-nowrap pointer-events-none">
                 <div class="flex flex-col items-start">
                    <span class="text-[8px] font-mono tracking-[0.5em] uppercase font-black nier-text-primary">GENESIS_MATRIX_PROTOCOL</span>
                    <div class="h-px w-0 group-hover:w-full nier-bg-inverted transition-all duration-500 mt-1 opacity-40"></div>
                 </div>
              </div>
           </div>
        </button>

        <!-- ENTRY METHOD BUTTON -->
        <button @click="showEntryMethod = true" 
                :disabled="commitState === 'loading'"
                class="group relative disabled:opacity-50 disabled:cursor-not-allowed">
           <div class="relative flex items-center justify-center w-12 h-12">
              <div class="absolute inset-0 border border-black/20 dark:border-white/20 rotate-45 group-hover:bg-black dark:group-hover:bg-white transition-all duration-500 shadow-xl"
                   :class="{ 'nier-bg-inverted': showEntryMethod }"></div>
              <div class="w-2 h-2 nier-bg-inverted relative z-10 transition-colors duration-500 group-hover:bg-white dark:group-hover:bg-black"
                   :class="{ 'nier-bg-panel': showEntryMethod }"></div>
              
              <div class="absolute left-full ml-8 opacity-0 group-hover:opacity-100 transition-all duration-500 -translate-x-4 group-hover:translate-x-0 whitespace-nowrap pointer-events-none">
                 <div class="flex flex-col items-start">
                    <span class="text-[8px] font-mono tracking-[0.5em] uppercase font-black nier-text-primary">{{ locale === 'ru' ? 'МЕТОД ВХОДА' : 'ENTRY_METHOD' }}</span>
                    <div class="h-px w-0 group-hover:w-full nier-bg-inverted transition-all duration-500 mt-1 opacity-40"></div>
                 </div>
              </div>
           </div>
        </button>

      </div>
      </Transition>
    </Teleport>

    
</template>
