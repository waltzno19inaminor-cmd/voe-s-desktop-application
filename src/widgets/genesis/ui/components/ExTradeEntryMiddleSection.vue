<script setup>

import { inject } from 'vue';
import { useI18n } from '~/shared/i18n/useI18n';
const emit = defineEmits(['close']);
const { locale } = useI18n();
const isArchivalBriefingEnabled = false;

import ExEquityCurve2D from '~/widgets/genesis/ui/ExEquityCurve2D.vue';
import ExPanel from '~/shared/ui/ExPanel.vue';
import { ref } from 'vue';
const { themeStore, isDark, viewMode, archiveMode, journalEntries, notesList, getArchiveNodeName, addJournalEntry, removeJournalEntry, addNote, removeNote, addJournalEntryTag, removeJournalEntryTag, handleImageUpload, triggerUpload, showCmeNotice, rememberCmeNotice, closeCmeNotice, showAssetMenu, asset, assetSearch, filteredAssets, currentAssetData, selectAsset, matrixNodes, matrixConnections, matrixZones, isMatrixLoading, loadMatrixData, tradeStore, strategies, selectedStrategyId, selectedStrategy, findAllNodes, findAllConnections, findNodeById, activeRiskManagement, activeRiskPerTradeDollars, activeRiskSnapshot, actualRR, actualRiskPercent, violatesRR, violatesRiskPerTrade, riskViolationMessage, getReachableNodes, getNodeZoneType, showStrategyMenu, failedIcons, handleIconError, closeAssetMenu, selectedScenarioNode, getNodesForStrategy, DEFAULT_ENTRY_CONDITIONS, DEFAULT_ENTRY_SCENARIOS, DEFAULT_EXIT_CONDITIONS, DEFAULT_EXIT_SCENARIOS, entryConditions, entryScenarios, exitConditions, exitScenarios, miniExitScenarios, regularExitScenarios, filteredRegistryEntryScenarios, filteredRegistryExitScenarios, currentRegistryScenarioConditions, mismatchedNodeIds, hasVectorMismatch, activeConditions, isConditionActive, toggleCondition, showConditionLibrary, showEmotionSelector, registrySearchQuery, libraryFilter, filteredLibraryScenarios, flatLibraryConditions, selectedRegistryScenarioId, hoverTimeout, hoveredScenarioId, handleMouseEnterScenario, handleMouseLeaveScenario, handleMouseEnterInsight, getActiveConditionsInScenario, isScenarioSelected, handleMouseLeaveInsight, getScenarioConditions, getFlattenedScenarioConditions, activeSector, sectors, side, entry, exit, size, entryFee, exitFee, feeType, resultMode, showEntryMethod, activeProtocolTab, entryMethodType, pyramidingEntries, averagingDownEntries, activeMultipleEntries, entryMethodEnabled, hasActiveMethodNode, addMultipleEntry, exitEntries, exitMethodEnabled, totalExitSize, averageExit, addExitEntry, removeExitEntry, removeMultipleEntry, showAutoPrompt, autoEntryBasePrice, autoEntryBaseLots, toggleAutoPrompt, confirmAutoGenerate, totalSize, averageEntry, isForex, isManualEntryAsset, isFixedFeeAsset, overridePnl, liveRates, FALLBACK_RATES, fetchLiveRates, getRate, EMOTION_LIBRARY, emotionsByCategory, showEmotions, selectedEmotions, hoveredEmotion, mousePos, EMOTION_OPPOSITES, toggleEmotion, isEmotionDisabled, stopLoss, takeProfit, openDate, exitDate, cloneDate, adjustDate, formatPart, handleManualDate, projectedProfit, hasValidProjection, equityCurveTrades, isTemporalOpen, activeTemporalTarget, _now, tempDateParts, syncTempParts, openTemporal, scrollContainer, pnl, commitState, resetForm, submit } = inject('tradeState');

const isCreatingNote = ref(false);
const isPreviewMode = ref(false);
const noteText = ref("");
const noteTextArea = ref(null);
const editingContentNoteId = ref(null);
const expandedNoteIds = ref([]);
const editingNoteId = ref(null);
const editNoteTitle = ref("");

const startEditContent = (note) => {
  editingContentNoteId.value = note.id;
  noteText.value = note.content || "";
  isCreatingNote.value = true;
  isPreviewMode.value = false;
};

const cancelNoteEdit = () => {
  isCreatingNote.value = false;
  editingContentNoteId.value = null;
  noteText.value = "";
};

const toggleNote = (id) => {
  const index = expandedNoteIds.value.indexOf(id);
  if (index === -1) {
    expandedNoteIds.value.push(id);
  } else {
    expandedNoteIds.value.splice(index, 1);
  }
};

const startEditNote = (note, event) => {
  event.stopPropagation();
  editingNoteId.value = note.id;
  editNoteTitle.value = note.title || (locale.value === 'ru' ? "АРХИВНАЯ_ЗАПИСЬ" : "ARCHIVED_RECORD");
};

const saveNoteTitle = (noteId) => {
  if (editingNoteId.value === noteId) {
    const n = notesList.value.find(n => n.id === noteId);
    if (n) n.title = editNoteTitle.value;
    editingNoteId.value = null;
  }
};

const insertFormatting = (prefix, suffix = "") => {
  if (!noteTextArea.value) return;
  const el = noteTextArea.value;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const text = el.value;
  const before = text.substring(0, start);
  const selection = text.substring(start, end);
  const after = text.substring(end);

  noteText.value = before + prefix + (selection || "") + suffix + after;
  
  setTimeout(() => {
    el.focus();
    const newCursorPos = start + prefix.length + (selection ? selection.length + suffix.length : 0);
    el.setSelectionRange(newCursorPos, newCursorPos);
  }, 0);
};

const formatNote = (content) => {
  if (!content) return "";
  
  let processedContent = content.replace(/\[VISUAL_REF:(\d+)\]/gim, (match, idxStr) => {
    const idx = parseInt(idxStr);
    const img = journalEntries.value?.[idx];
    if (img && img.image) {
      const name = img.name || `Visual_Node_${idx}`;
      return `<div class="my-4 border nier-border-primary bg-black/5 dark:bg-white/5 p-2 relative group"><img src="${img.image}" alt="${name}" class="max-w-full h-auto object-contain max-h-[400px] w-full" /><div class="absolute bottom-4 left-4 nier-bg-panel px-2 py-1 text-[8px] font-mono opacity-80 uppercase tracking-widest border nier-border-primary shadow-lg">${name}</div></div>`;
    }
    return match;
  });

  return processedContent
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-black uppercase tracking-widest mt-4 mb-2 nier-text-primary">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-black uppercase tracking-[0.2em] mt-6 mb-3 nier-text-primary border-b nier-border-primary pb-1">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-black uppercase tracking-[0.4em] mt-8 mb-4 nier-text-primary border-b-2 border-black/20 dark:border-white/20 pb-2">$1</h1>')
    .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-black/20 dark:border-white/20 pl-6 my-4 italic opacity-80">$1</blockquote>')
    .replace(/^\- (.*$)/gim, '<li class="ml-6 list-disc opacity-80">$1</li>')
    .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
    .replace(/\*(.*?)\*/gim, '<i>$1</i>')
    .replace(/\~\~(.*?)\~\~/gim, '<u>$1</u>')
    .replace(/\[color\=(.*?)\](.*?)\[\/color\]/gim, '<span style="color: $1">$2</span>')
    .replace(/\n/gim, '<br />');
};

const persistNote = () => {
  if (!noteText.value.trim()) return;
  if (editingContentNoteId.value) {
    const n = notesList.value.find(n => n.id === editingContentNoteId.value);
    if (n) n.content = noteText.value;
  } else {
    notesList.value.push({
      id: `note_${Date.now()}`,
      content: noteText.value,
      date: new Date().toISOString(),
      title: `SESSION_LOG_${notesList.value.length + 1}`
    });
  }
  noteText.value = "";
  isCreatingNote.value = false;
  editingContentNoteId.value = null;
};

const formatDateTactical = (dateStr) => {
  if (!dateStr) return 'DATE_UNASSIGNED';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'DATE_UNASSIGNED';

  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} // ${time}`;
};
</script>

<template>
<!-- MIDDLE SECTION: TACTICAL MENUS OR JOURNAL -->
    <div class="w-full flex justify-center">
      <div class="max-w-6xl w-full px-6 pb-12 py-8">
        <Transition name="sector-swap" mode="out-in">
          <div v-if="viewMode === 'tactical'" key="tactical" class="flex flex-col space-y-12">
            <!-- CONDITION CONFIGURATION PANEL (LEGACY DESCRIPTION AESTHETIC) -->
            <div v-if="isArchivalBriefingEnabled && selectedRegistryScenarioId && selectedRegistryScenarioId !== 'default-exit-system'" class="flex flex-col space-y-12 animate-in fade-in zoom-in-95 duration-1000 max-w-5xl mx-auto">
               
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
                          <div v-if="isConditionActive(cond.id, selectedRegistryScenarioId)" class="absolute inset-0 bg-black/[0.02] animate-pulse"></div>


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
                                          isConditionActive(item.id, selectedRegistryScenarioId) ? 'nier-bg-inverted border-black dark:border-white' : 'bg-black/[0.01] dark:bg-white/[0.01] border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10',
                                          mismatchedNodeIds.has(item.id) ? '!border-red-500/20 !bg-red-500/5 !pointer-events-none' : ''
                                        ]">
                                      <div class="w-1 h-1 border rotate-45 mt-1.5 transition-colors"
                                           :class="[
                                             isConditionActive(item.id, selectedRegistryScenarioId) ? 'nier-bg-panel border-white dark:border-black' : 'border-black/20 dark:border-white/20 group-hover/item:bg-black/40 dark:group-hover/item:bg-white/40',
                                             mismatchedNodeIds.has(item.id) ? '!bg-red-500 !border-red-500' : ''
                                           ]"></div>
                                      <div class="flex flex-col relative z-10">
                                         <div class="flex items-center gap-2">
                                            <span class="text-[9px] font-mono font-bold tracking-widest uppercase transition-colors"
                                                  :class="[
                                                    isConditionActive(item.id, selectedRegistryScenarioId) ? 'nier-text-primary' : 'text-black/80 dark:text-white/90 group-hover/item:text-black dark:group-hover/item:text-white',
                                                    mismatchedNodeIds.has(item.id) ? '!text-red-500' : ''
                                                  ]">{{ item.label }}</span>
                                            <span v-if="item.priority && item.priority !== 'NONE'" 
                                                  class="px-1 py-0.5 text-[6px] font-mono tracking-widest uppercase border"
                                                  :class="item.priority === 'REQUIRED' ? 'border-red-500/50 text-red-500' : 'border-blue-500/50 text-blue-500'">
                                              {{ item.priority }}
                                            </span>
                                         </div>
                                         <span class="text-[9px] font-mono uppercase tracking-tighter truncate transition-colors"
                                               :class="isConditionActive(item.id, selectedRegistryScenarioId) ? 'text-white/40 dark:text-black/40' : 'text-black/60 dark:text-white/75'">{{ item.description || 'No telemetry.' }}</span>
                                      </div>
                                      <div v-if="isConditionActive(item.id, selectedRegistryScenarioId)" class="absolute inset-0 bg-black/[0.02] animate-pulse"></div>
                                   </div>
                                </div>
                             </template>

                             <!-- Isolated Indicator -->
                             <template v-else>
                                <div @click="toggleCondition(unit.item.id, selectedRegistryScenarioId)"
                                     class="flex items-start gap-3 p-3 border transition-all cursor-pointer group/item w-1/2 overflow-hidden relative"
                                     :class="[
                                       isConditionActive(unit.item.id, selectedRegistryScenarioId) ? 'nier-bg-inverted border-black dark:border-white' : 'bg-black/[0.01] dark:bg-white/[0.01] border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10',
                                       mismatchedNodeIds.has(unit.item.id) ? '!border-red-500/20 !bg-red-500/5 !pointer-events-none' : ''
                                     ]">
                                   <div class="w-1 h-1 border rotate-45 mt-1.5 transition-colors"
                                        :class="[
                                          isConditionActive(unit.item.id, selectedRegistryScenarioId) ? 'nier-bg-panel border-white dark:border-black' : 'border-black/20 dark:border-white/20 group-hover/item:bg-black/40 dark:group-hover/item:bg-white/40',
                                          mismatchedNodeIds.has(unit.item.id) ? '!bg-red-500 !border-red-500' : ''
                                        ]"></div>
                                   <div class="flex flex-col flex-1 min-w-0 relative z-10">
                                      <div class="flex items-center justify-between w-full">
                                         <div class="flex items-center gap-2">
                                            <span class="text-[9px] font-mono font-black tracking-widest uppercase transition-colors"
                                                  :class="[
                                                    isConditionActive(unit.item.id, selectedRegistryScenarioId) ? 'nier-text-primary' : 'text-black/80 dark:text-white/90 group-hover/item:text-black dark:group-hover/item:text-white',
                                                    mismatchedNodeIds.has(unit.item.id) ? '!text-red-500' : ''
                                                  ]">{{ unit.item.label }}</span>
                                            <span v-if="unit.item.priority && unit.item.priority !== 'NONE'" 
                                                  class="px-1 py-0.5 text-[6px] font-mono tracking-widest uppercase border"
                                                  :class="unit.item.priority === 'REQUIRED' ? 'border-red-500/50 text-red-500' : 'border-blue-500/50 text-blue-500'">
                                              {{ unit.item.priority }}
                                            </span>
                                         </div>
                                         <span v-if="unit.item.direction" class="text-[6px] font-mono uppercase tracking-widest transition-colors"
                                               :class="isConditionActive(unit.item.id, selectedRegistryScenarioId) ? 'text-white/40 dark:text-black/40' : 'text-amber-500/30'">{{ unit.item.direction }}</span>
                                      </div>
                                      <span class="text-[9px] font-mono uppercase tracking-tighter truncate mt-0.5 transition-colors"
                                            :class="isConditionActive(unit.item.id, selectedRegistryScenarioId) ? 'text-white/40 dark:text-black/40' : 'text-black/60 dark:text-white/75'">{{ unit.item.description || 'Primary indicator.' }}</span>
                                   </div>
                                   <div v-if="isConditionActive(unit.item.id, selectedRegistryScenarioId)" class="absolute inset-0 bg-black/[0.02] animate-pulse"></div>
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
                <div class="flex items-center bg-black/5 dark:bg-white/5 p-1 rounded-sm">
                   <button @click="archiveMode = 'notes'" 
                           :class="['px-3 py-1.5 text-[9px] font-mono transition-all font-black uppercase tracking-widest', archiveMode === 'notes' ? 'nier-bg-inverted nier-text-primary' : 'opacity-40 hover:opacity-100']">
                      {{ locale === 'ru' ? 'Архив_Заметок' : 'Neural_Note_Archive' }}
                   </button>
                   <button @click="archiveMode = 'images'" 
                           :class="['px-3 py-1.5 text-[9px] font-mono transition-all font-black uppercase tracking-widest', archiveMode === 'images' ? 'nier-bg-inverted nier-text-primary' : 'opacity-40 hover:opacity-100']">
                      {{ locale === 'ru' ? 'Архив_Доказательств' : 'Evidence_Archive' }}
                   </button>
                </div>
              </div>
              <div class="flex items-center space-x-6">
                 <button v-if="!isCreatingNote" @click="archiveMode === 'notes' ? (isCreatingNote = true) : addJournalEntry()" class="flex items-center space-x-3 group px-4 py-1.5 border nier-border-primary hover:bg-black dark:hover:bg-white transition-all">
                    <span class="text-[8px] font-mono tracking-widest uppercase font-black text-black/40 dark:text-white/80 group-hover:text-white dark:group-hover:text-black">
                       {{ archiveMode === 'notes' ? (locale === 'ru' ? 'Новая_Заметка' : 'Add_New_Record') : (locale === 'ru' ? 'Новый_Слот_Архива' : 'New_Archive_Slot') }}
                    </span>
                    <div class="w-1.5 h-1.5 bg-black/20 dark:bg-white/20 rotate-45 group-hover:bg-white dark:group-hover:bg-black"></div>
                 </button>
              </div>
            </div>

            <!-- NOTES TAB CONTENT -->
            <div v-if="archiveMode === 'notes'" class="flex flex-col space-y-8">
               <!-- NEW NOTE TEXTAREA -->
               <div v-if="isCreatingNote" class="flex flex-col space-y-4 bg-black/[0.03] dark:bg-white/[0.03] p-8 border nier-border-primary relative">
                    <div class="absolute top-4 right-4 flex space-x-4">
                       <button @click="cancelNoteEdit" class="text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100">{{ locale === 'ru' ? 'Отмена' : 'Cancel' }}</button>
                    </div>
                 
                    <!-- FORMATTING TOOLBAR -->
                    <div class="flex items-center flex-wrap gap-2 pb-4 border-b border-black/5 dark:border-white/5 mb-4">
                       <div class="flex items-center bg-black/5 dark:bg-white/5 p-1 rounded-sm mr-4">
                          <button @click="isPreviewMode = false" 
                                  :class="['px-3 py-1 text-[9px] font-mono transition-all', !isPreviewMode ? 'nier-bg-inverted nier-text-primary' : 'opacity-40']">
                             {{ locale === 'ru' ? 'РЕДАКТОР' : 'EDITOR' }}
                          </button>
                          <button @click="isPreviewMode = true" 
                                  :class="['px-3 py-1 text-[9px] font-mono transition-all', isPreviewMode ? 'nier-bg-inverted nier-text-primary' : 'opacity-40']">
                             {{ locale === 'ru' ? 'ПРОСМОТР' : 'PREVIEW' }}
                          </button>
                       </div>

                       <div v-if="!isPreviewMode" class="flex items-center flex-wrap gap-2">
                         <button @click="insertFormatting('# ', '')" class="px-2 py-1 bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono transition-all">H1</button>
                         <button @click="insertFormatting('## ', '')" class="px-2 py-1 bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono transition-all">H2</button>
                         <button @click="insertFormatting('### ', '')" class="px-2 py-1 bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono transition-all">H3</button>
                         <div class="w-px h-4 bg-black/10 dark:bg-white/10 mx-1"></div>
                         <button @click="insertFormatting('**', '**')" class="px-2 py-1 bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono font-bold transition-all">B</button>
                         <button @click="insertFormatting('*', '*')" class="px-2 py-1 bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono italic transition-all">I</button>
                         <button @click="insertFormatting('~~', '~~')" class="px-2 py-1 bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono underline transition-all">U</button>
                         <div class="w-px h-4 bg-black/10 dark:bg-white/10 mx-1"></div>
                         <button @click="insertFormatting('- ', '')" class="px-2 py-1 bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono transition-all">LIST</button>
                         <button @click="insertFormatting('> ', '')" class="px-2 py-1 bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono transition-all">QUOTE</button>
                         <div class="w-px h-4 bg-black/10 dark:bg-white/10 mx-1"></div>
                         <button @click="insertFormatting('[color=#10b981]', '[/color]')" class="px-2 py-1 hover:scale-110 transition-all"><div class="w-3 h-3 bg-emerald-500 rounded-full"></div></button>
                         <button @click="insertFormatting('[color=#ef4444]', '[/color]')" class="px-2 py-1 hover:scale-110 transition-all"><div class="w-3 h-3 bg-rose-500 rounded-full"></div></button>
                         <button @click="insertFormatting('[color=#3b82f6]', '[/color]')" class="px-2 py-1 hover:scale-110 transition-all"><div class="w-3 h-3 bg-blue-500 rounded-full"></div></button>
                         <div class="w-px h-4 bg-black/10 dark:bg-white/10 mx-1"></div>
                         
                         <!-- Visual Attach Dropdown -->
                         <div class="relative group/visuals inline-block">
                           <button class="px-2 py-1 bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono transition-all flex items-center gap-1">
                             {{ locale === 'ru' ? 'ПРИКРЕПИТЬ_МАТЕРИАЛ' : 'ATTACH_VISUAL' }}
                             <svg class="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                           </button>
                           <div class="absolute top-full left-0 hidden group-hover/visuals:flex flex-col nier-bg-panel border nier-border-primary shadow-xl z-50 min-w-[150px]">
                             <div v-if="!journalEntries?.length" class="px-3 py-2 text-[8px] font-mono opacity-50 uppercase whitespace-nowrap">{{ locale === 'ru' ? 'НЕТ_СОХРАНЕННЫХ_МАТЕРИАЛОВ' : 'NO_VISUALS_ARCHIVED' }}</div>
                             <button v-else v-for="(img, idx) in journalEntries" :key="img.id" @click.prevent="insertFormatting(`[VISUAL_REF:${idx}]`, '')" class="px-3 py-2 text-[9px] font-mono text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors truncate max-w-[200px]">
                               {{ img.name || `Visual_Node_${idx}` }}
                             </button>
                           </div>
                         </div>
                       </div>
                    </div>

                    <div class="relative min-h-[200px]">
                       <textarea 
                          v-if="!isPreviewMode"
                          ref="noteTextArea"
                          v-model="noteText" 
                          :placeholder="locale === 'ru' ? 'МАТЕРИАЛИЗУЙТЕ СВОИ МЫСЛИ...' : 'REIFY SESSION THOUGHTS HERE...'"
                          class="w-full h-full bg-transparent border-0 font-mono text-[13px] leading-relaxed tracking-wider outline-none resize-none placeholder:opacity-20 min-h-[200px]"
                          autofocus
                       ></textarea>
                       <div v-else 
                            class="w-full h-full font-mono text-[13px] leading-relaxed tracking-wider overflow-y-auto custom-scrollbar min-h-[200px]"
                            v-html="formatNote(noteText || (locale === 'ru' ? 'НЕТ_КОНТЕНТА_ДЛЯ_ОТОБРАЖЕНИЯ' : 'NO_CONTENT_TO_PREVIEW'))">
                       </div>
                    </div>
                    <div class="flex justify-end">
                       <button @click="persistNote" class="group/save relative h-10 px-10 bg-black text-white dark:bg-white dark:text-black font-black border border-black dark:border-white hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white transition-all duration-500">
                         <span class="relative z-10 text-[9px] uppercase tracking-[0.4em]">{{ locale === 'ru' ? 'Сохранить_Запись' : 'Persist_Record' }}</span>
                       </button>
                    </div>
                 </div>
               
               <div v-if="notesList.length === 0 && !isCreatingNote" class="flex flex-col items-center justify-center py-32 border border-dashed nier-border-primary opacity-30">
                 <div class="w-12 h-px nier-bg-inverted mb-6 animate-pulse"></div>
                 <span class="text-[9px] font-mono tracking-[0.6em] uppercase nier-text-primary">{{ locale === 'ru' ? 'Записи_Не_Найдены' : 'No_Records_Found' }}</span>
                 <div class="mt-6 flex gap-2">
                   <div v-for="i in 3" :key="i" class="w-1 h-1 bg-black/20 dark:bg-white/20 rotate-45"></div>
                 </div>
               </div>

               <!-- EXISTING NOTES LIST -->
               <div v-else class="flex flex-col space-y-6">
                  <div v-for="note in notesList.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())" :key="note.id" 
                       class="flex flex-col p-6 border border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] relative group/note cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                       @click="toggleNote(note.id)"
                       @dblclick="startEditContent(note)">
                     <div class="flex items-center justify-between mb-2 pb-2" :class="expandedNoteIds.includes(note.id) ? 'border-b border-black/5 dark:border-white/5' : ''">
                        <div class="flex items-center space-x-4">
                           <div class="w-1.5 h-1.5 nier-bg-inverted transition-transform duration-300" :class="expandedNoteIds.includes(note.id) ? 'rotate-[135deg]' : 'rotate-45'"></div>
                           <div v-if="editingNoteId === note.id" @click.stop class="flex items-center gap-2">
                             <input 
                               v-model="editNoteTitle" 
                               @keydown.enter.prevent="saveNoteTitle(note.id)" 
                               @blur="saveNoteTitle(note.id)"
                               class="bg-transparent border-b border-black/30 dark:border-white/30 outline-none text-[9px] font-mono font-black uppercase tracking-[0.2em] nier-text-primary"
                               autofocus
                             />
                             <span class="text-[7px] font-mono opacity-40 uppercase tracking-widest">{{ locale === 'ru' ? '(ENTER_ДЛЯ_СОХРАНЕНИЯ)' : '(ENTER_TO_SAVE)' }}</span>
                           </div>
                           <span v-else @click.stop="startEditNote(note, $event)" class="text-[9px] font-mono font-black uppercase tracking-[0.2em] hover:opacity-50 transition-opacity cursor-text" title="Click to rename">{{ note.title || (locale === 'ru' ? 'АРХИВНАЯ_ЗАПИСЬ' : 'ARCHIVED_RECORD') }}</span>
                        </div>
                        <div class="flex items-center space-x-4">
                           <span class="text-[10px] font-mono font-bold opacity-60 tracking-wider nier-text-primary">{{ formatDateTactical(note.date) }}</span>
                           <button type="button" @click.stop="removeNote(note.id)" class="opacity-0 group-hover/note:opacity-40 hover:!opacity-100 transition-opacity text-rose-500">
                              <span class="text-[9px] font-mono font-black uppercase tracking-widest">{{ locale === 'ru' ? '[Удалить]' : '[Delete]' }}</span>
                           </button>
                        </div>
                     </div>
                     <div v-if="expandedNoteIds.includes(note.id)" class="text-[12px] font-mono leading-relaxed opacity-70 whitespace-pre-wrap mt-2 animate-fade-in" v-html="formatNote(note.content)"></div>
                  </div>
               </div>
            </div>

            <!-- IMAGES TAB CONTENT -->
            <div v-else-if="archiveMode === 'images'">
              <div v-if="journalEntries.length === 0" class="flex flex-col items-center justify-center py-32 border border-dashed nier-border-primary opacity-30">
              <div class="w-12 h-px nier-bg-inverted mb-6 animate-pulse"></div>
              <span class="text-[9px] font-mono tracking-[0.6em] uppercase nier-text-primary">{{ locale === 'ru' ? 'Архив_Доказательств_Пуст' : 'No_Evidences_In_The_Archive' }}</span>
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
