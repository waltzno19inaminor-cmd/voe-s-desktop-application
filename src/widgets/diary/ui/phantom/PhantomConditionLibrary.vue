<template>
  <Teleport to="body">
    <Transition name="manifest-fade">
      <div v-if="isOpen" class="fixed inset-0 z-[10000] flex items-center justify-center p-8 pointer-events-none">
        <!-- Backdrop Scrim -->
        <div 
          class="absolute inset-0 bg-black/50 pointer-events-auto"
          style="backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px);"
          @click="close"
        ></div>

        <!-- Manifest Container -->
        <div class="relative w-full max-w-[95vw] h-full flex flex-col pointer-events-auto overflow-hidden">
          <!-- Elegant Corner Exit Label -->
          <div class="absolute top-0 left-0 p-4 z-10">
            <button 
              @click="close"
              class="group flex items-center gap-4 py-2 px-4 rounded-sm transition-all duration-300 hover:bg-white/[0.03]"
            >
               <div class="w-8 h-8 flex items-center justify-center rounded-full border border-white/5 group-hover:border-white transition-all duration-500">
                  <svg class="w-3 h-3 text-white/40 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
               </div>
               <div class="flex flex-col">
                  <span class="text-[8px] uppercase tracking-[0.5em] font-black text-white/10 group-hover:text-white/40 transition-all duration-500">Registry</span>
                  <span class="text-[7px] uppercase tracking-[0.8em] text-white/20 font-black group-hover:text-white transition-all duration-500">BACK</span>
               </div>
            </button>
          </div>

          <div class="h-24"></div> <!-- Spacer for the corner button -->

          <!-- Cards Collection (Categorized Sections) -->
          <div class="flex-1 overflow-y-auto custom-scrollbar pr-4 pb-20">
             
             <!-- Strategy Initialization Warning -->
             <div v-if="!selectedStrategyId" class="h-full flex flex-col items-center justify-center py-20">
                <div class="w-1 h-12 bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)] mb-8"></div>
                <h2 class="text-2xl font-serif text-white tracking-widest uppercase mb-4">Tactical Initialization Required</h2>
                <p class="text-[9px] uppercase tracking-[0.4em] text-white/20 text-center max-w-sm leading-relaxed">
                  The Node Network cannot be queried without an active Strategy ID.<br/>
                  Please return to the Chronicle Hub and select a Strategy.
                </p>
                <button @click="close" class="mt-10 px-8 py-3 rounded-full border border-white/10 text-[8px] uppercase tracking-[0.4em] font-black text-white/40 hover:text-white hover:border-white transition-all duration-500">
                  Return to Interface
                </button>
             </div>

             <!-- Each Category Section -->
             <div v-else v-for="cat in categoricalData" :key="cat.label" class="mb-16">
                <template v-if="cat.nodes.length > 0">
                   <!-- Section Header -->
                   <div class="flex items-center gap-6 mb-8 px-4">
                      <span class="text-[10px] font-black text-white/10 uppercase tracking-[0.5em]">{{ cat.id }}</span>
                      <h3 class="text-xs font-serif text-white/60 uppercase tracking-[0.3em] italic">{{ cat.label }}</h3>
                      <div class="flex-1 h-px bg-white/5"></div>
                      <span class="text-[8px] font-mono text-white/10">{{ cat.nodes.length }} NODES ACTIVE</span>
                   </div>

                   <!-- Section Grid (High Density) -->
                   <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 justify-items-center">
                      <PhantomTacticalCard 
                        v-for="node in (cat.nodes as any[])" 
                        :key="node.id"
                        :id="node.id"
                        :selected="isSelected(node.id, node.type)"
                        :disabled="isCardOverridden(node.id)"
                        :title="node.type === 'scenario' ? (node.scenarioData?.name || 'UNNAMED SCENARIO') : (node.conditionsName || 'GENERAL CONDITIONS')"
                        :skills="node.type === 'scenario' ? [{id: 'if', text: (node as any).scenarioData?.if}, {id: 'then', text: (node as any).scenarioData?.then}] : (node.conditionsData || [])"
                        @hover-skill="hoveredSkill = $event"
                        @select="toggleSelection"
                      />
                   </div>
                </template>
             </div>

             <!-- Empty State if no categories have data -->
             <div v-if="selectedStrategyId && isEmpty" class="h-full flex flex-col items-center justify-center opacity-10 py-10">
                <svg class="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span class="text-[8px] uppercase tracking-[1em]">Searching Node Network</span>
             </div>
          </div>
        </div>

        <!-- Project Standard Tactical Tooltip -->
        <CursorTooltip 
          :visible="!!hoveredSkill" 
          :title="hoveredSkill?.id === 'if' ? 'Condition (IF)' : hoveredSkill?.id === 'then' ? 'Action (THEN)' : hoveredSkill?.text"
          :content="hoveredSkill?.description || (hoveredSkill?.id === 'if' || hoveredSkill?.id === 'then' ? hoveredSkill?.text : hoveredSkill?.parentNodeName) || 'Tactical Protocol Active'"
          category="Tactical Segment"
          subtext="Lvl 04 Secure"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useBoardStore } from '@/features/store/useBoard';
import { isConditionLibraryOpen as isOpen, newEntry, selectedStrategyId, strategyOptions } from '@/widgets/diary/model/useDiary';
import PhantomTacticalCard from './PhantomTacticalCard.vue';
import CursorTooltip from '../controls/CursorTooltip.vue';

const boardStore = useBoardStore();

/** STRATEGY-CONDITIONED LOGIC **/
const activeStrategyBoardId = computed(() => {
  if (!selectedStrategyId.value) return null;
  return strategyOptions.value.find(s => s.id === selectedStrategyId.value)?.boardId || null;
});

const activeStrategyBoard = computed(() => {
  if (!activeStrategyBoardId.value) return null;
  return boardStore.boards.find(b => b.id === activeStrategyBoardId.value) || null;
});

const hoveredSkill = ref<any>(null);
const close = () => {
  isOpen.value = false;
};

// Categorization Logic Helper
const getCategorization = (noteId: string, connections: any[], entryNodes: any[], exitNodes: any[]) => {
  const isEntry = connections.some(c => 
    (c.fromId === noteId && entryNodes.some(e => e.id === c.toId)) ||
    (c.toId === noteId && entryNodes.some(e => e.id === c.fromId))
  );
  if (isEntry) return 'entry';

  const isExit = connections.some(c => 
    (c.fromId === noteId && exitNodes.some(e => e.id === c.toId)) ||
    (c.toId === noteId && exitNodes.some(e => e.id === c.fromId))
  );
  if (isExit) return 'exit';

  return 'general';
};

const isCardOverridden = (id: string): boolean => {
  const activeBoard = activeStrategyBoard.value;
  if (!activeBoard) return false;
  
  const node = activeBoard.notes.find(n => n.id === id);
  if (!node || node.type !== 'conditions' || !node.conditionsData) return false;

  const currentConditions = newEntry.value.boardConditions || [];
  if (!currentConditions.some(c => typeof c === 'string' ? c === id : c.id === id)) return false; 

  // Cross-reference with sequencer items
  const seqItems = [
    ...(newEntry.value.tacticalPhases?.entry || []),
    ...(newEntry.value.tacticalPhases?.exit || [])
  ];

  // Overridden if ANY of its mandatory items are missing from the sequencer blocks
  return node.conditionsData.some(item => !seqItems.includes(`condition:${item.id}`));
}

// Selection Logic
const toggleSelection = (id: string) => {
  if (isCardOverridden(id)) return;

  const node = boardStore.findNote(id);
  if (!node) return;

  const activeBoard = activeStrategyBoard.value;
  if (!activeBoard) return;

  const connections = activeBoard.connections;
  const entryNodes = activeBoard.notes.filter(n => n.type === 'entry_node');
  const exitNodes = activeBoard.notes.filter(n => n.type === 'exit_node');
  const cat = getCategorization(id, connections, entryNodes, exitNodes);

  if (node.type === 'conditions') {
    const currentConditions = [...(newEntry.value.boardConditions || [])];
    
    // ENFORCE SINGLE SELECTION PER SECTION:
    // Filter out any existing conditions that belong to the SAME category
    const filtered = currentConditions.filter(existing => {
      const existingId = typeof existing === 'string' ? existing : existing.id;
      if (existingId === id) return false;
      const existingCat = getCategorization(existingId, connections, (entryNodes as any[]), (exitNodes as any[]));
      return existingCat !== cat;
    });

    newEntry.value.boardConditions = filtered;

    // Toggle the current one
    const isAlreadySelected = isSelected(id, 'conditions');
    if (!isAlreadySelected) {
      if (!newEntry.value.boardConditions) newEntry.value.boardConditions = [];
      newEntry.value.boardConditions.push(id);
    }
  } else if (node.type === 'scenario') {
    if (cat === 'entry' || cat === 'general') {
      newEntry.value.boardScenarioEntryId = newEntry.value.boardScenarioEntryId === id ? '' : id;
    } else {
      newEntry.value.boardScenarioExitId = newEntry.value.boardScenarioExitId === id ? '' : id;
    }
  }
};

const isSelected = (id: string, type: string) => {
  if (type === 'conditions') {
    return (newEntry.value?.boardConditions || []).some(c => typeof c === 'string' ? c === id : c.id === id);
  } else {
    return newEntry.value?.boardScenarioEntryId === id || newEntry.value?.boardScenarioExitId === id;
  }
};

const categoricalData = computed(() => {
  const activeBoard = activeStrategyBoard.value;
  if (!activeBoard) return [];
  
  const connections = activeBoard.connections || [];
  const notes = activeBoard.notes || [];

  const entryNodes = notes.filter(n => n.type === 'entry_node');
  const exitNodes = notes.filter(n => n.type === 'exit_node');

  const allCond = notes.filter(n => n.type === 'conditions');
  const allScen = notes.filter(n => n.type === 'scenario');

  return [
    {
      id: '01',
      label: 'Entry Conditions Protocol',
      nodes: allCond.filter(n => getCategorization(n.id, connections, entryNodes, exitNodes) === 'entry' || getCategorization(n.id, connections, entryNodes, exitNodes) === 'general')
    },
    {
      id: '02',
      label: 'Exit Conditions Protocol',
      nodes: allCond.filter(n => getCategorization(n.id, connections, entryNodes, exitNodes) === 'exit')
    },
    {
      id: '03',
      label: 'Entry Scenarios',
      nodes: allScen.filter(n => getCategorization(n.id, connections, entryNodes, exitNodes) === 'entry' || getCategorization(n.id, connections, entryNodes, exitNodes) === 'general')
    },
    {
      id: '04',
      label: 'Exit Scenarios',
      nodes: allScen.filter(n => getCategorization(n.id, connections, entryNodes, exitNodes) === 'exit')
    }
  ];
});

const isEmpty = computed(() => categoricalData.value.every(cat => cat.nodes.length === 0));
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

.manifest-fade-enter-active,
.manifest-fade-leave-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.manifest-fade-enter-from,
.manifest-fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>
