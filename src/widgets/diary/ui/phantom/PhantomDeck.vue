<template>
  <div class="phantom-deck-container flex flex-col items-center relative">
    
    <!-- Top Screen Edge Panel (Emotions Engine) -->
    <Teleport to="body">
      <Transition name="phantom-deploy-top" appear>
        <div v-if="isBladeOpen && isAdvancedMode && !isJournalOpen" class="fixed top-8 left-1/2 -translate-x-1/2 flex bg-black/40 backdrop-blur-3xl border border-white/5 rounded-md p-3 gap-3 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] z-[2000] scale-[0.7] md:scale-100 origin-top">
        <div class="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 whitespace-nowrap">
           <span class="text-[8px] uppercase tracking-[0.4em] font-black text-white/40">Emotions Engine</span>
           <span class="text-[6px] text-white/10 uppercase font-mono tracking-widest">{{ activePhase || 'Idle' }} Protocol</span>
        </div>
        
        <button 
          v-for="emo in emotions" 
          :key="emo.id"
          @click="togglePhaseItem(emo.id, 'emotion')"
          @mouseenter="hoveredEmotion = emo"
          @mouseleave="hoveredEmotion = null"
          class="group relative h-10 border transition-all duration-500 flex items-center justify-center px-5 overflow-hidden rounded-[4px]"
          :class="isItemActiveInPhase(emo.id, 'emotion') 
            ? 'bg-white border-white scale-105 shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
            : 'bg-white/[0.02] border-white/5 hover:border-white/20'"
        >
           <div class="absolute top-1 left-1 w-1 h-1 border-t border-l transition-all duration-500" :class="isItemActiveInPhase(emo.id, 'emotion') ? 'border-black' : 'border-white/10 group-hover:border-white/40'"></div>
           <div class="absolute bottom-1 right-1 w-1 h-1 border-b border-r transition-all duration-500" :class="isItemActiveInPhase(emo.id, 'emotion') ? 'border-black' : 'border-white/10 group-hover:border-white/40'"></div>
           <div class="w-5 h-5 transition-all duration-500 group-hover:scale-110" :class="isItemActiveInPhase(emo.id, 'emotion') ? 'text-black opacity-100' : 'text-white/40 group-hover:opacity-80'">
             <TacticalIcon :name="emo.id" />
           </div>
        </button>

        <CursorTooltip 
          :visible="!!hoveredEmotion"
          :title="hoveredEmotion?.label"
          :content="hoveredEmotion?.desc"
          :subtext="hoveredEmotion?.state"
        />
      </div>
      </Transition>

      <!-- Left Screen Edge Panel (Conditions Registry) -->
      <Transition name="phantom-deploy-left" appear>
        <div v-if="isBladeOpen && isAdvancedMode && !isJournalOpen" class="fixed left-2 md:left-8 top-1/2 -translate-y-1/2 flex flex-col bg-black/50 backdrop-blur-3xl border border-white/5 rounded-md shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] z-[2000] w-[70px] md:min-w-[140px] h-[70vh] md:max-h-[70vh] md:scale-100 origin-left">
        <!-- Header Pin -->
        <div class="flex flex-col items-center gap-1 py-3 border-b border-white/5 px-1">
           <span class="text-[7px] md:text-[9px] uppercase tracking-[0.2em] md:tracking-[0.6em] font-black text-white/60 text-center">Conditions</span>
           <span class="text-[5px] md:text-[6px] text-white/10 uppercase font-mono tracking-widest text-center">{{ activePhase || 'Idle' }}</span>
        </div>

        <div class="scroll-area p-3 overflow-y-auto flex flex-col gap-3 custom-scrollbar flex-1">
          <div v-if="!selectedStrategyId" class="flex-1 flex flex-col items-center justify-center p-6 text-center">
             <div class="w-1 h-8 bg-rose-500/20 rounded-full mb-4 animate-pulse"></div>
             <span class="text-[7px] uppercase tracking-[0.3em] font-black text-rose-500/40 leading-relaxed">Select Strategy<br/>To Deactivate Locked Nodes</span>
          </div>
          
          <!-- Compact Phase Lockout State -->
          <div v-else-if="activePhase === 'during'" class="flex flex-col items-center justify-center p-4 border border-white/5 bg-white/[0.02] rounded gap-2 max-w-[120px] mx-auto">
             <svg class="w-3 h-3 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
             <span class="text-[6px] text-white/20 text-center uppercase leading-tight font-black tracking-[0.2em]">Lockout: Active cycle</span>
          </div>

          <template v-else>
            <button 
               v-for="cond in (activePhase === 'exit' ? exitConditions : entryConditions)" :key="cond.id"
               @click.prevent="togglePhaseItem(cond.id, 'condition')"
               @mouseenter="hoveredCondition = cond"
               @mouseleave="hoveredCondition = null"
               class="group relative h-12 border transition-all duration-500 flex items-center px-4 overflow-hidden rounded-[4px] w-full"
               :class="isItemActiveInPhase(cond.id, 'condition') ? 'bg-white border-white scale-[1.05]' : 'bg-white/[0.02] border-white/5 hover:border-white/20'"
            >
               <div class="absolute top-1 left-1 w-1 h-1 border-t border-l transition-all duration-500" :class="isItemActiveInPhase(cond.id, 'condition') ? 'border-black' : 'border-white/10 group-hover:border-white/40'"></div>
               <div class="absolute bottom-1 right-1 w-1 h-1 border-b border-r transition-all duration-500" :class="isItemActiveInPhase(cond.id, 'condition') ? 'border-black' : 'border-white/10 group-hover:border-white/40'"></div>
               <div class="flex flex-col items-start gap-0.5">
                 <span class="text-[12px] font-medium tracking-tighter leading-none font-serif uppercase truncate w-20 text-left" :class="isItemActiveInPhase(cond.id, 'condition') ? 'text-black font-black' : 'text-white opacity-60'">{{ cond.text.substring(0, 2) || 'CX' }}</span>
                 <span class="text-[5px] uppercase tracking-[0.4em] font-sans font-light" :class="isItemActiveInPhase(cond.id, 'condition') ? 'text-black/50' : 'text-white/10'">Segment node</span>
               </div>
            </button>

            <div v-if="(activePhase === 'exit' ? exitConditions : entryConditions).length === 0" class="text-[6px] md:text-[8px] uppercase tracking-normal md:tracking-[0.3em] font-black text-white/10 text-center px-1 md:px-4 py-8 pointer-events-none break-words leading-tight">
              No items linked to this phase
            </div>
          </template>
        </div>

        <CursorTooltip 
          :visible="!!hoveredCondition"
          :title="hoveredCondition?.text"
          :content="hoveredCondition?.description || hoveredCondition?.parentNodeName || 'No Protocol Description'"
          category="Tactical Segment"
          subtext="Lvl 02 Secure"
        />
      </div>
      </Transition>

      <!-- Right Screen Edge Panel (Scenario Matrix) -->
      <Transition name="phantom-deploy-right" appear>
        <div v-if="isBladeOpen && isAdvancedMode && !isJournalOpen" class="fixed right-2 md:right-8 top-1/2 -translate-y-1/2 flex flex-col bg-black/50 backdrop-blur-3xl border border-white/5 rounded-md shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] z-[2000] w-[70px] md:min-w-[120px] h-[70vh] md:max-h-[70vh] md:scale-100 origin-right">
        <!-- Header Pin -->
        <div class="flex flex-col items-center gap-1 py-3 border-b border-white/5 px-1">
           <span class="text-[7px] md:text-[9px] uppercase tracking-[0.1em] md:tracking-[0.3em] font-black text-white/60 text-center">Scenarios</span>
           <span class="text-[5px] md:text-[6px] text-white/10 uppercase font-mono tracking-widest text-center">{{ activePhase || 'Idle' }}</span>
        </div>

        <div class="scroll-area p-3 overflow-y-auto flex flex-col gap-3 custom-scrollbar flex-1">
          <div v-if="!selectedStrategyId" class="flex-1 flex flex-col items-center justify-center p-6 text-center">
             <div class="w-1 h-8 bg-white/10 rounded-full mb-4"></div>
             <span class="text-[7px] uppercase tracking-[0.3em] font-black text-white/20 leading-relaxed">Strategy Hub<br/>Not Synchronized</span>
          </div>

          <div v-else-if="activePhase === 'during'" class="flex flex-col items-center justify-center p-4 border border-white/5 bg-white/[0.02] rounded gap-2 max-w-[80px] mx-auto">
             <svg class="w-3 h-3 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
             <span class="text-[6px] text-white/20 text-center uppercase leading-tight font-black tracking-[0.2em]">Cycle Locked</span>
          </div>

          <template v-else>
            <button 
               v-for="sc in (activePhase === 'exit' ? exitScenarios : entryScenarios)" :key="sc.id"
               @click.prevent="togglePhaseItem(sc.id, 'scenario')"
               @mouseenter="hoveredScenario = sc"
               @mouseleave="hoveredScenario = null"
               class="group relative h-12 border transition-all duration-500 flex flex-col items-center justify-center overflow-hidden rounded-[4px] w-full"
               :class="isItemActiveInPhase(sc.id, 'scenario') ? 'bg-white border-white scale-[1.05]' : 'bg-white/[0.02] border-white/5 hover:border-white/20'"
            >
               <div class="absolute top-1 left-1 w-1 h-1 border-t border-l transition-all duration-500" :class="isItemActiveInPhase(sc.id, 'scenario') ? 'border-black' : 'border-white/10 group-hover:border-white/40'"></div>
               <div class="absolute bottom-1 right-1 w-1 h-1 border-b border-r transition-all duration-500" :class="isItemActiveInPhase(sc.id, 'scenario') ? 'border-black' : 'border-white/10 group-hover:border-white/40'"></div>
               <span class="text-[12px] font-medium font-serif uppercase" :class="isItemActiveInPhase(sc.id, 'scenario') ? 'text-black font-black' : 'text-white opacity-60'">{{ sc.scenarioData?.letter || 'B' }}</span>
               <span class="text-[5px] uppercase tracking-tighter font-sans font-light" :class="isItemActiveInPhase(sc.id, 'scenario') ? 'text-black/50' : 'text-white/10'">{{ activePhase?.toUpperCase() }}</span>
            </button>
            
            <div v-if="(activePhase === 'exit' ? exitScenarios : entryScenarios).length === 0" class="text-[6px] md:text-[8px] uppercase tracking-normal md:tracking-[0.3em] font-black text-white/10 text-center px-0.5 md:px-2 py-8 pointer-events-none break-words leading-tight">
              No items linked to this phase
            </div>
          </template>
        </div>

        <CursorTooltip 
          :visible="!!hoveredScenario"
          :title="hoveredScenario?.scenarioData?.name"
          :content="hoveredScenario?.scenarioData?.description || `[IF] ${hoveredScenario?.scenarioData?.if || '...'} -> [THEN] ${hoveredScenario?.scenarioData?.then || '...'}`"
          subtext="Node Link"
        />
      </div>
      </Transition>

      <!-- Advanced Mode: Back to Tactical Anchor -->
      <Transition name="phantom-deploy-left" appear>
        <div 
          v-if="isBladeOpen && isAdvancedMode && isJournalOpen"
          class="fixed top-6 left-6 z-[6000]"
        >
           <button 
             @click="isJournalOpen = false"
             class="group flex items-center gap-3 py-2.5 px-6 bg-black/60 backdrop-blur-3xl border border-white/5 rounded-sm hover:border-white/20 transition-all duration-700 shadow-2xl relative overflow-hidden"
           >
              <!-- Minimalist Scanline Effect -->
              <div class="absolute inset-x-0 top-0 h-px bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

              <svg class="w-2.5 h-2.5 text-white/20 group-hover:text-white transition-colors duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7" />
              </svg>
              
              <div class="flex flex-col items-start">
                 <span class="text-[8px] uppercase tracking-[0.5em] font-black text-white/30 group-hover:text-white/80 transition-all duration-500">Phantom_Hub</span>
                 <div class="w-full h-[1px] bg-white/5 scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left mt-1"></div>
              </div>
           </button>
        </div>
      </Transition>

      <!-- Tactical Utility Sidebar (V2 Modular Rail) -->
      <Transition name="phantom-deploy-left" appear>
        <div 
          v-if="isBladeOpen && !isJournalOpen" 
          class="fixed left-6 z-[5500] flex items-center transition-all duration-1000 ease-in-out"
          :class="isAdvancedMode 
            ? 'top-6 flex-row gap-2' 
            : 'top-1/2 -translate-y-1/2 flex-col gap-1'"
        >
           
           <!-- Modular Rail Segments -->
           <div 
             class="flex p-2 bg-black/40 backdrop-blur-3xl relative transition-all duration-700"
             :class="isAdvancedMode 
               ? 'flex-row items-center border-t border-white/10' 
               : 'flex-col items-center border-l border-white/10'"
           >
              <!-- Geometric Accent: Side/Top Bracket -->
              <div 
                class="absolute left-0 top-0 transition-all duration-700 bg-gradient-to-b from-transparent via-white/20 to-transparent"
                :class="isAdvancedMode 
                   ? 'right-0 h-[1px] w-full bg-gradient-to-r' 
                   : 'bottom-0 w-[1px] h-full bg-gradient-to-b'"
              ></div>
              
              <!-- Module: Registry -->
              <div class="tactical-module-frame group">
                 <button 
                   @click="isConditionLibraryOpen = true"
                   class="tactical-key"
                 >
                    <svg class="w-5 h-5 transition-all text-white/30 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <div class="key-bracket"></div>
                 </button>
              </div>

              <!-- Rail Separator -->
              <div 
                class="bg-white/5 relative overflow-hidden transition-all duration-700"
                :class="isAdvancedMode ? 'w-[1px] h-8 mx-2' : 'w-8 h-[1px] my-1'"
              >
                 <div class="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </div>

              <!-- Module: Architect -->
              <div class="tactical-module-frame group">
                 <button 
                   @click="isPositionManagerOpen = !isPositionManagerOpen"
                   class="tactical-key"
                   :class="{ 'active': isPositionManagerOpen }"
                 >
                    <svg class="w-5 h-5 transition-all" :class="isPositionManagerOpen ? 'text-black' : 'text-white/30 group-hover:text-white'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                    </svg>
                    <div class="key-bracket"></div>
                 </button>
              </div>

           </div>
        </div>
      </Transition>

      <!-- Tactical Environment Scrim: Permanent focus while sequencer is visible -->
      <Transition name="phantom-fade" appear>
        <div 
          v-if="isBladeOpen"
          class="fixed inset-0 z-[1000] bg-black/60 transition-all duration-1000 ease-in-out"
          :style="{
             backdropFilter: isAdvancedMode ? 'blur(20px) saturate(180%)' : 'blur(8px) saturate(140%)'
          }"
        ></div>
      </Transition>

      <!-- Tactical Phase Sequencer -->
      <Transition name="phantom-deploy-center" appear>
        <div v-if="isBladeOpen && isAdvancedMode && !isPositionManagerOpen && !isJournalOpen" class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-6 z-[5000] scale-[0.65] md:scale-100">
        <div 
          v-for="phase in phases" 
          :key="phase"
          :class="[activePhase === phase ? 'scale-[1.02]' : '', 'tactical-card w-[720px] h-28 relative group transition-all duration-700']"
        >
          <!-- Flip Trigger Button (Static Handle Always Above Card) -->
          <button 
            @click.stop="toggleFlip(phase)"
            class="absolute -top-4 -right-4 w-10 h-6 bg-white border border-white/20 rounded-full z-[7000] flex items-center justify-center text-black transition-all duration-500 hover:scale-110 shadow-[0_0_20px_rgba(255,255,255,0.2)] group/flip"
            style="transform: translateZ(100px);"
          >
             <svg class="w-4 h-4 transition-transform duration-700" :class="{ 'rotate-180': flippedPhases.has(phase) }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
             </svg>
             <!-- Tooltip -->
             <div class="absolute bottom-full mb-2 px-2 py-1 bg-white text-black text-[8px] font-black uppercase tracking-widest rounded opacity-0 group-hover/flip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
               Toggle Telemetry
             </div>
          </button>

          <div 
            class="card-inner" 
            :class="{ 'is-flipped': flippedPhases.has(phase) }"
          >
            <!-- FRONT: INVENTORY VIEW -->
            <div 
              class="card-front bg-[#030303] border transition-all duration-700 rounded-2xl flex items-center p-6 cursor-pointer shadow-[0_64px_128px_-32px_rgba(0,0,0,1)]"
              :class="activePhase === phase ? 'border-white/50' : 'border-white/5 hover:border-white/20'"
              style="backdrop-filter: blur(80px) saturate(180%);"
              @click="activePhase = activePhase === phase ? null : phase"
            >
               <!-- Phase Top Label -->
               <div class="absolute -top-2.5 left-8 px-3 bg-black/90 text-[8px] uppercase tracking-[0.8em] font-thin text-white/20 transition-all duration-500" :class="activePhase === phase ? 'text-white/60 tracking-[1em]' : ''">
                 {{ phase }}
               </div>

               <!-- Sub-Categorized Item Zones -->
               <div class="flex-1 flex gap-8 h-full items-center mr-12 ml-6">
                 
                 <!-- Emotions Cluster -->
                 <div class="flex flex-col gap-2 min-w-[100px]">
                   <div class="flex items-center gap-2 opacity-20">
                      <div class="w-1 h-1 rounded-full bg-rose-500"></div>
                      <span class="text-[6px] uppercase tracking-[0.3em] font-black text-white">EMOTIONS</span>
                   </div>
                   <div class="flex flex-wrap gap-1.5">
                     <div 
                       v-for="itemKey in (newEntry.tacticalPhases?.[phase] || []).filter(k => k.startsWith('emotion'))" 
                       :key="itemKey"
                       @mouseenter="handleInventoryHover(itemKey, true)"
                       @mouseleave="handleInventoryHover(itemKey, false)"
                       class="w-8 h-8 rounded-sm border border-white/10 bg-white/[0.03] flex items-center justify-center transition-all duration-500 hover:scale-110 group/cube shadow-inner"
                     >
                       <div class="w-5 h-5 text-white opacity-60 group-hover/cube:opacity-100 transition-opacity">
                          <TacticalIcon :name="(getItemInfo(itemKey).data as any) || 'neutral'" />
                       </div>
                     </div>
                     <div v-if="!(newEntry.tacticalPhases?.[phase] || []).some(k => k.startsWith('emotion'))" class="text-[7px] text-white/5 italic">VOID</div>
                   </div>
                 </div>

                 <!-- Conditions Cluster -->
                 <div class="flex-1 flex flex-col gap-2 px-8 h-12 justify-center">
                   <div class="flex items-center gap-2 opacity-20">
                      <div class="w-1 h-1 rounded-full bg-emerald-500"></div>
                      <span class="text-[6px] uppercase tracking-[0.3em] font-black text-white">CONDITIONS</span>
                   </div>
                   <div class="flex flex-wrap gap-1.5">
                     <div 
                       v-for="itemKey in (newEntry.tacticalPhases?.[phase] || []).filter(k => k.startsWith('condition'))" 
                       :key="itemKey"
                       @mouseenter="handleInventoryHover(itemKey, true)"
                       @mouseleave="handleInventoryHover(itemKey, false)"
                       class="w-8 h-8 rounded-sm border border-white/10 bg-white/[0.03] flex items-center justify-center transition-all duration-500 hover:scale-110 group/cube shadow-inner"
                     >
                       <span class="text-[10px] font-black text-white/30 group-hover/cube:text-white transition-colors uppercase font-mono">{{ getItemInfo(itemKey).data }}</span>
                     </div>
                     <div v-if="!(newEntry.tacticalPhases?.[phase] || []).some(k => k.startsWith('condition'))" class="text-[7px] text-white/5 italic">VOID</div>
                   </div>
                 </div>

                 <!-- Scenarios Cluster -->
                 <div class="flex flex-col gap-2 min-w-[120px]">
                   <div class="flex items-center gap-2 opacity-20">
                      <div class="w-1 h-1 rounded-full bg-indigo-500"></div>
                      <span class="text-[6px] uppercase tracking-[0.3em] font-black text-white">SCENARIOS</span>
                   </div>
                   <div class="flex flex-wrap gap-1.5">
                     <div 
                       v-for="itemKey in (newEntry.tacticalPhases?.[phase] || []).filter(k => k.startsWith('scenario'))" 
                       :key="itemKey"
                       @mouseenter="handleInventoryHover(itemKey, true)"
                       @mouseleave="handleInventoryHover(itemKey, false)"
                       class="w-8 h-8 rounded-sm border border-white/10 bg-white/[0.03] flex items-center justify-center transition-all duration-500 hover:scale-110 group/cube shadow-inner"
                     >
                       <span class="text-[10px] font-black text-white/30 group-hover/cube:text-white transition-colors uppercase font-mono">{{ getItemInfo(itemKey).data }}</span>
                     </div>
                     <div v-if="!(newEntry.tacticalPhases?.[phase] || []).some(k => k.startsWith('scenario'))" class="text-[7px] text-white/5 italic">VOID</div>
                   </div>
                 </div>

               </div>
               
               <!-- Right Status Line -->
               <div class="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-end gap-1">
                  <span class="text-[6px] font-mono text-white/[0.05] tracking-widest">{{ newEntry.tacticalPhases?.[phase]?.length || 0 }}_NODES</span>
                  <div class="w-1 h-10 bg-white/[0.02] rounded-full overflow-hidden">
                     <div class="w-full bg-white transition-all duration-1000 ease-out" :style="{ height: activePhase === phase ? '100%' : '0%', opacity: activePhase === phase ? '0.4' : '0' }"></div>
                  </div>
               </div>
            </div>

            <!-- BACK: TELEMETRY VIEW -->
            <div class="card-back absolute inset-0 bg-black border transition-all duration-700 rounded-2xl flex items-center p-8 shadow-[0_64px_128px_-32px_rgba(0,0,0,1)] overflow-hidden" :class="activePhase === phase ? 'border-white/50' : 'border-white/10'">
               <!-- Tactical Grid Background -->
               <div class="absolute inset-0 opacity-[0.03] pointer-events-none" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 24px 24px;"></div>

               <!-- ENTRY DATA -->
               <div v-show="phase === 'entry'" class="flex-1 flex justify-around items-center h-full">
                  <div class="flex flex-col items-start px-6">
                     <span class="text-[9px] font-black text-white/40 uppercase tracking-[0.4em] mb-1">Entry Point</span>
                     <span class="text-2xl font-mono text-white font-bold tracking-tighter">{{ newEntry.entry || '0.0000' }}</span>
                     <div class="mt-2 flex flex-col items-start gap-1">
                        <span class="text-[11px] font-mono text-white font-bold">{{ formatTelemetryDate(newEntry.date) }}</span>
                        <span class="text-[14px] font-mono text-emerald-500/80 font-black tracking-widest">{{ formatTelemetryTime(newEntry.date) }}</span>
                     </div>
                   </div>
                  <div class="flex-1 flex flex-col items-center px-8">
                     <div class="flex flex-col items-start px-5 py-3 bg-rose-500/5 rounded-lg w-full">
                        <span class="text-[9px] font-black text-rose-500/80 uppercase tracking-[0.4em] mb-1">Stop Loss</span>
                        <span class="text-xl font-mono text-rose-400 font-bold tracking-tighter">{{ newEntry.stopLoss || 'N/A' }}</span>
                        <span class="text-[7px] text-rose-500/40 uppercase mt-0.5 font-black">Lvl_01_Guard</span>
                     </div>
                  </div>
               </div>

               <!-- DURING DATA -->
               <div v-show="phase === 'during'" class="flex-1 flex flex-col items-center justify-center gap-1">
                  <div class="flex items-center gap-2 mb-0.5">
                     <div class="w-2 h-2 rounded-full" :class="newEntry.dateExit ? 'bg-white/20' : 'bg-emerald-500 animate-pulse'"></div>
                     <span class="text-[10px] font-black uppercase tracking-[0.4em]" :class="newEntry.dateExit ? 'text-white/40' : 'text-emerald-500'">
                        {{ newEntry.dateExit ? 'FINALIZED_TRADE_TIME' : 'LIVE_CYCLE_DATA' }}
                     </span>
                  </div>
                  <span class="text-4xl font-mono text-white font-black tracking-tighter">{{ formatTelemetryDuration(newEntry.date, newEntry.dateExit) }}</span>
                  <div class="flex gap-8 mt-4">
                  <div class="flex flex-col items-center pr-8">
                        <span class="text-[7px] uppercase font-black tracking-widest text-white/30">Entry_Sync</span>
                        <span class="text-[10px] font-mono text-white/40">{{ formatTelemetryTime(newEntry.date) }}</span>
                     </div>
                     <div class="flex flex-col items-center">
                        <span class="text-[7px] uppercase font-black tracking-widest text-white/30">Exit_Sync</span>
                        <span class="text-[10px] font-mono" :class="newEntry.dateExit ? 'text-white/60' : 'text-white/10'">
                           {{ newEntry.dateExit ? formatTelemetryTime(newEntry.dateExit) : 'WAIT_SIG' }}
                        </span>
                     </div>
                  </div>
               </div>

               <!-- EXIT DATA -->
               <div v-show="phase === 'exit'" class="flex-1 flex justify-around items-center h-full">
                  <div class="flex flex-col items-start px-6">
                     <div class="flex items-center gap-4 mb-1">
                        <span class="text-[9px] font-black text-white/40 uppercase tracking-[0.4em]">Exit Target</span>
                        <button 
                           @click.stop="newEntry.dateExit = new Date()"
                           class="text-[7px] px-2 py-0.5 border border-white/20 rounded-full hover:bg-white hover:text-black transition-all uppercase font-black"
                        >
                           Set Now
                        </button>
                     </div>
                     <span class="text-2xl font-mono text-white font-bold tracking-tighter">{{ newEntry.exit || 'PNDG' }}</span>
                     <div class="mt-2 flex flex-col items-start gap-1">
                        <span class="text-[11px] font-mono text-white font-bold">{{ formatTelemetryDate(newEntry.dateExit) }}</span>
                        <span class="text-[14px] font-mono font-black tracking-widest" :class="newEntry.dateExit ? 'text-emerald-500/80' : 'text-white/20'">
                           {{ formatTelemetryTime(newEntry.dateExit) || 'SCAN_REQUIRED' }}
                        </span>
                     </div>
                   </div>
                  <div class="flex-1 flex flex-col items-center px-8">
                     <div class="flex flex-col items-start px-5 py-3 bg-emerald-500/5 rounded-lg w-full">
                        <span class="text-[9px] font-black text-emerald-500/80 uppercase tracking-[0.4em] mb-1">Take Profit</span>
                        <span class="text-xl font-mono text-emerald-400 font-bold tracking-tighter">{{ newEntry.takeProfit || 'N/A' }}</span>
                        <span class="text-[7px] text-emerald-500/40 uppercase mt-0.5 font-black">Lvl_02_Vault</span>
                     </div>
                  </div>
               </div>

               <!-- Back Side Selection Ring Glow -->
               
            </div>
          </div>
        </div>
      </div>
      </Transition>

      <!-- Phantom Notebook (Simple Mode + Advanced Journal Phase) -->
      <Transition name="phantom-deploy-center" appear>
        <div v-if="isBladeOpen && (!isAdvancedMode || isJournalOpen) && !isPositionManagerOpen" class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[5000]">
           <PhantomNotebook />
        </div>
      </Transition>

       <!-- Position Manager (Both Modes) -->
      <Transition name="phantom-deploy-center" appear>
        <div v-if="isBladeOpen && isPositionManagerOpen" class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[5100]">
           <PhantomPositionManager />
        </div>
      </Transition>

      <!-- SEQUENTIAL INTEGRITY ALERT (Override Warning) -->
      <Transition name="phantom-fade">
        <div v-if="showOverrideWarning" class="fixed inset-0 z-[10000] flex items-center justify-center p-8 backdrop-blur-md">
           <div class="absolute inset-0 bg-black/40" @click="showOverrideWarning = false"></div>
           <div class="relative w-[320px] bg-black/80 border border-white/5 p-8 flex flex-col items-center gap-8 shadow-[0_0_80px_rgba(0,0,0,0.5)]">
              <!-- Animated Scanning Corner -->
              <div class="absolute top-0 right-0 w-8 h-8 border-t border-r border-orange-500/40"></div>
              
              <div class="flex flex-col items-center gap-3">
                 <div class="text-[8px] uppercase tracking-[0.8em] font-black text-white/20">Protocol Check</div>
                 <div class="text-[14px] font-serif italic text-white/80 tracking-widest text-center leading-relaxed">Strategic Deviation Requested</div>
                 <div class="w-12 h-px bg-white/10 my-2"></div>
                 <div class="text-[7px] uppercase tracking-[0.3em] text-white/30 text-center leading-relaxed max-w-[200px]">System integrity will be compromised. Manual deployment override required to proceed.</div>
              </div>

              <div class="flex flex-col gap-2 w-full pt-4">
                 <button @click="confirmOverride" class="w-full py-3 bg-white/[0.03] border border-white/10 text-[7px] uppercase tracking-[0.5em] font-black text-white hover:bg-rose-500 hover:border-rose-500 transition-all duration-700">Confirm_Override</button>
                 <button @click="showOverrideWarning = false" class="w-full py-3 text-[6px] uppercase tracking-[0.4em] font-black text-white/10 hover:text-white/40 transition-colors">Abort_Sequence</button>
              </div>

              <!-- Telemetry Meta -->
              <div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-[0.05]">
                 <span class="text-[5px] font-mono tracking-[0.5em]">0x77_INT_GRD</span>
                 <div class="w-1 h-1 rounded-full bg-white"></div>
                 <span class="text-[5px] font-mono tracking-[0.5em]">AUTH_PENDING</span>
              </div>
           </div>
        </div>
      </Transition>

      <!-- Top-Center Telemetry Monitor -->
      <Transition name="phantom-deploy-top" appear>
        <div v-if="isBladeOpen && !isAdvancedMode" class="fixed top-8 left-1/2 -translate-x-1/2 z-[5000]">
           <PhantomTelemetry />
        </div>
      </Transition>
    </Teleport>
    <!-- Bottom Command Deck -->
    <Teleport to="body">
      <Transition name="phantom-deploy-bottom" appear>
        <div v-if="isBladeOpen" class="fixed bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center z-[6000] scale-[0.7] md:scale-100 origin-bottom">
        <!-- Module Switcher (Top Tabs) -->
        <div class="flex items-center gap-0.5 lg:gap-1 mb-2 lg:mb-3 px-1 py-1 bg-black/40 backdrop-blur-3xl border border-white/5 rounded-full scale-90">
          <button 
            v-for="mod in modules" 
            :key="mod.id"
            @click="activeModule = mod.id"
            class="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-1.5 rounded-full transition-all duration-500 relative"
            :class="activeModule === mod.id ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/40'"
          >
            <svg class="w-3.5 h-3.5 transition-transform" :class="{ 'scale-110': activeModule === mod.id }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="mod.path" />
            </svg>
            <span class="text-[9px] uppercase tracking-[0.2em] font-bold">{{ mod.label }}</span>
            
            <!-- Active Glow Indicator -->
            <div v-if="activeModule === mod.id" class="absolute inset-0 rounded-full border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]"></div>
          </button>
        </div>

        <!-- UPWARD EXPANDING ASSET MENU (Centered over Command Deck) -->
        <Transition name="menu-slide-up">
          <div v-if="isAssetMenuOpen && assetResults.length > 0" class="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 bg-black/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_-32px_64px_rgba(0,0,0,0.8)] w-[500px] overflow-hidden z-[5000]">
            <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div class="flex flex-col gap-0.5">
                <span class="text-[8px] uppercase tracking-[0.4em] font-black text-white/30">Asset Tactical Scout</span>
                <span class="text-[6px] text-emerald-500/40 font-mono tracking-widest uppercase truncate max-w-[200px]">{{ newEntry.asset || 'NO_QUERY' }}</span>
              </div>
              <div v-if="loadingAssets" class="flex gap-1">
                <div class="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                <div class="w-1 h-1 rounded-full bg-emerald-500 animate-pulse delay-75"></div>
              </div>
            </div>
            <div class="max-h-80 overflow-y-auto custom-scrollbar p-3 grid grid-cols-2 gap-2">
              <div 
                v-for="(asset, index) in assetResults" 
                :key="asset.symbol + asset.type"
                @mousedown="selectAsset(asset)"
                @mouseenter="activeIndex = index"
                class="flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-500 cursor-pointer group border relative"
                :class="activeIndex === index ? 'bg-white/10' : 'bg-transparent border-transparent hover:bg-white/[0.03] hover:border-white/5'"
              >
                <!-- Selection Accent -->
                <div v-if="activeIndex === index" class="absolute inset-0 border border-emerald-500/20 rounded-xl pointer-events-none"></div>

                <div class="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-500">
                  <img 
                    v-if="asset.icon && !failedIcons.has(asset.symbol + asset.type)" 
                    :src="asset.icon" 
                    class="w-full h-full object-contain p-1.5" 
                    @error="failedIcons.add(asset.symbol + asset.type)"
                  />
                  <span v-else class="text-[12px] font-black text-white/20 group-hover:text-emerald-500/80 transition-colors uppercase">
                    {{ (asset.name || asset.symbol).charAt(0) }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-white tracking-tight">{{ asset.symbol }}</span>
                    <span class="text-[7px] uppercase font-black px-1.5 py-0.5 rounded-sm bg-white/5 text-emerald-500/60">{{ asset.type }}</span>
                  </div>
                  <p class="text-[9px] text-white/30 truncate uppercase tracking-tighter mt-0.5">{{ asset.name }}</p>
                </div>
                
                <div v-if="activeIndex === index" class="w-1 h-5 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)]"></div>
              </div>

              <!-- Custom Entry Fallback -->
              <div 
                v-if="newEntry.asset && !assetResults.find(a => a.symbol.toUpperCase() === newEntry.asset!.toUpperCase())"
                @mousedown="selectCustomAsset"
                class="col-span-2 mt-2 p-4 border border-emerald-500/10 group bg-emerald-500/[0.02] hover:bg-emerald-500/[0.05] transition-all duration-500 cursor-pointer rounded-2xl flex items-center justify-between"
              >
                <div class="flex items-center gap-4">
                   <div class="w-9 h-9 rounded-xl border border-emerald-500/20 flex items-center justify-center text-emerald-500 bg-emerald-500/5 group-hover:scale-110 transition-transform">
                     <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
                   </div>
                   <div class="flex flex-col">
                      <p class="text-xs font-bold text-emerald-400">Archive "{{ newEntry.asset }}"</p>
                      <p class="text-[8px] uppercase tracking-[0.2em] text-emerald-500/40">Manual Vault Entry</p>
                   </div>
                </div>
                <span class="text-[7px] font-black text-white/10 group-hover:text-emerald-500/40 transition-colors uppercase tracking-[0.3em]">SECURE_ENTRY</span>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Custom HUD Time Dial (Phantom Elite Monochromatic) -->
        <Transition name="menu-slide-up">
          <div v-if="activeTimePicker" class="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/95 border border-white/10 rounded-3xl p-8 shadow-[0_64px_128px_-32px_rgba(0,0,0,1)] z-[9999] min-w-[440px] backdrop-blur-3xl lg:scale-110">
             <div class="flex flex-col items-center mb-8">
                <span class="text-[10px] font-black uppercase tracking-[0.6em] text-white">Phantom Time Sync</span>
                <span class="text-[7px] text-white/20 uppercase tracking-[0.3em] mt-2 italic">{{ activeTimePicker === 'entry' ? 'Initial Deposit Timestamp' : 'Exit Liquidity Protocol' }}</span>
                <div class="w-12 h-px bg-white/10 mt-4"></div>
             </div>

             <div class="space-y-8">
                <!-- Date Matrix -->
                <div class="flex flex-col items-center gap-4">
                   <span class="text-[8px] uppercase tracking-[0.4em] text-white/40 font-black">Calendar Matrix</span>
                   <div class="flex items-center gap-4">
                      <div v-for="unit in (['year', 'month', 'day'] as const)" :key="unit" class="flex flex-col items-center bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-3 hover:border-white/20 transition-all">
                         <span class="text-[7px] text-white/20 uppercase font-black tracking-widest mb-2">{{ unit }}</span>
                         <div class="flex items-center gap-3">
                            <button @click="adjustTimePart(activeTimePicker!, unit, -1)" class="w-7 h-7 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/20 hover:bg-white hover:text-black hover:border-white transition-all">-</button>
                            <span class="text-xs font-mono text-white font-bold min-w-[32px] text-center">
                               {{ (activeTimePicker === 'entry' ? newEntry.date : (newEntry.dateExit || new Date())).toLocaleDateString('en-US', { [unit]: unit === 'year' ? 'numeric' : '2-digit' }) }}
                            </span>
                            <button @click="adjustTimePart(activeTimePicker!, unit, 1)" class="w-7 h-7 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/20 hover:bg-white hover:text-black hover:border-white transition-all">+</button>
                         </div>
                      </div>
                   </div>
                </div>

                <!-- Clock Sync -->
                <div class="flex flex-col items-center gap-4">
                   <span class="text-[8px] uppercase tracking-[0.4em] text-white/40 font-black">Precise Hour Min</span>
                   <div class="flex items-center gap-4">
                      <div v-for="unit in (['hour', 'minute'] as const)" :key="unit" class="flex flex-col items-center bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-3 hover:border-white/20 transition-all">
                         <span class="text-[7px] text-white/20 uppercase font-black tracking-widest mb-2">{{ unit }}</span>
                         <div class="flex items-center gap-3">
                            <button @click="adjustTimePart(activeTimePicker!, unit, -1)" class="w-7 h-7 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/20 hover:bg-white hover:text-black hover:border-white transition-all">-</button>
                            <span class="text-xs font-mono text-white font-bold min-w-[32px] text-center">
                               {{ (activeTimePicker === 'entry' ? newEntry.date : (newEntry.dateExit || new Date()))[unit === 'hour' ? 'getHours' : 'getMinutes']().toString().padStart(2, '0') }}
                            </span>
                            <button @click="adjustTimePart(activeTimePicker!, unit, 1)" class="w-7 h-7 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/20 hover:bg-white hover:text-black hover:border-white transition-all">+</button>
                         </div>
                      </div>
                   </div>

                   <button 
                     @click="activeTimePicker === 'entry' ? newEntry.date = new Date() : newEntry.dateExit = new Date()"
                     class="w-full mt-2 py-4 border border-white/10 rounded-2xl text-[8px] font-black uppercase tracking-[0.5em] text-white/40 hover:bg-white hover:text-black hover:border-white transition-all flex items-center justify-center gap-3"
                   >
                      <div class="w-1 h-1 rounded-full bg-white/40"></div>
                      Sync To Live Stream
                      <div class="w-1 h-1 rounded-full bg-white/40"></div>
                   </button>
                </div>
             </div>

             <!-- Close Trigger -->
             <button @click="activeTimePicker = null" class="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/20 hover:text-white transition-all">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
        </Transition>
        <div 
          class="relative flex items-center bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] px-8 h-16 min-w-[720px] transition-all duration-700"
          :class="{ 'opacity-50 pointer-events-none': isSubmitting }"
        >

      <!-- Staggered Inputs Container -->
      <div class="flex items-center gap-8 flex-1">
        <!-- SYSTEM_MODE: Advanced Toggle -->
        <div class="flex items-center gap-3 pr-8 border-r border-white/5 mr-4 h-full relative group">
           <div 
             @click="isAdvancedMode = !isAdvancedMode"
             class="relative w-10 h-5 bg-white/[0.03] border border-white/10 rounded-full cursor-pointer transition-all duration-700 hover:border-white/30 overflow-hidden"
           >
             <!-- Sliding Pulse -->
             <div 
               class="absolute top-0.5 w-[14px] h-[14px] rounded-full transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
               :class="isAdvancedMode ? 'left-[22px] bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]' : 'left-0.5 bg-white/20'"
             ></div>
           </div>
           <div class="flex flex-col">
              <span class="text-[5px] uppercase tracking-[0.5em] font-mono leading-none" :class="isAdvancedMode ? 'text-rose-400' : 'text-white/10'">{{ isAdvancedMode ? 'PHANTOM_ELITE' : 'BASE_PROTOCOL' }}</span>
              <span class="text-[7px] uppercase tracking-[0.3em] font-black text-white/30">System Mode</span>
           </div>
        </div>

        <TransitionGroup name="staggered-fade" appear>
          
          <!-- CORE MODULE -->
          <template v-if="activeModule === 'core'">
            <div key="asset" class="flex flex-col gap-1 transition-all duration-500 delay-[50ms] relative">
              <span class="text-[8px] uppercase tracking-[0.3em] text-white/20 font-black">Asset Scout</span>
              <input 
                v-model="newEntry.asset"
                type="text"
                placeholder="BTC/USD"
                class="bg-transparent border-none p-0 text-sm text-white font-serif placeholder:text-white/5 focus:ring-0 w-28"
                autofocus
                @focus="isAssetMenuOpen = true"
                @blur="onAssetBlur"
                @input="onAssetInput"
                @keydown.down.prevent="moveActive(1)"
                @keydown.up.prevent="moveActive(-1)"
                @keydown.enter.prevent="selectActive"
              />
            </div>

            <div key="sep1" class="hidden lg:block w-px h-6 bg-white/5 transition-all duration-500 delay-[100ms]"></div>

            <div key="side" class="flex flex-col gap-1 transition-all duration-500 delay-[150ms]">
               <div class="flex items-center gap-1.5">
                  <span class="text-[8px] uppercase tracking-[0.3em] font-black transition-colors" :class="isFieldLocked ? 'text-white/40' : 'text-white/20'">Side</span>
                  <svg v-if="isFieldLocked" class="w-2.5 h-2.5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
               </div>
               <div class="flex items-center gap-2">
                 <button 
                  v-for="s in ['Long', 'Short']" :key="s"
                  @click="newEntry.side = s as any"
                  :disabled="isFieldLocked"
                  class="text-[9px] uppercase font-bold tracking-widest transition-all disabled:pointer-events-none"
                  :class="newEntry.side === s ? (s === 'Long' ? 'text-emerald-400' : 'text-rose-400') : 'text-white/10 hover:text-white/30'"
                 >
                   {{ s }}
                 </button>
               </div>
            </div>

            <div key="sep2" class="hidden lg:block w-px h-6 bg-white/5 transition-all duration-500 delay-[200ms]"></div>

            <div key="entry" class="flex flex-col gap-1 transition-all duration-500 delay-[250ms]">
              <div class="flex items-center gap-1.5">
                <span class="text-[8px] uppercase tracking-[0.3em] font-black transition-colors" :class="isFieldLocked ? 'text-white/40' : 'text-white/20'">Entry</span>
                <svg v-if="isFieldLocked" class="w-2.5 h-2.5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <input 
                v-model.number="newEntry.entry"
                type="number"
                step="any"
                :disabled="isFieldLocked"
                class="bg-transparent border-none p-0 text-sm font-mono placeholder:text-white/5 focus:ring-0 w-24 hide-spinners transition-all"
                :class="isFieldLocked ? 'text-emerald-500/60 cursor-not-allowed italic' : 'text-white'"
                @keyup.enter="handleQuickSave"
              />
            </div>

            <div key="sep-ex" class="hidden lg:block w-px h-6 bg-white/5 transition-all duration-500 delay-[300ms]"></div>

            <div key="exit" class="flex flex-col gap-1 transition-all duration-500 delay-[350ms]">
              <div class="flex items-center gap-1.5">
                <span class="text-[8px] uppercase tracking-[0.3em] font-black transition-colors" :class="isFieldLocked ? 'text-white/40' : 'text-white/20'">Exit</span>
                <svg v-if="isFieldLocked" class="w-2.5 h-2.5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <input 
                v-model.number="newEntry.exit"
                type="number"
                step="any"
                :disabled="isFieldLocked"
                placeholder="0.00"
                class="bg-transparent border-none p-0 text-sm font-mono placeholder:text-white/10 focus:ring-0 w-24 hide-spinners transition-all"
                :class="isFieldLocked ? 'text-rose-500/60 cursor-not-allowed italic' : 'text-white'"
                @keyup.enter="handleQuickSave"
              />
            </div>

            <div key="sep3" class="hidden lg:block w-px h-6 bg-white/5 transition-all duration-500 delay-[400ms]"></div>

            <div key="size" class="flex flex-col gap-1 transition-all duration-500 delay-[450ms]">
              <div class="flex items-center gap-1.5">
                <span class="text-[8px] uppercase tracking-[0.3em] font-black transition-colors" :class="isFieldLocked ? 'text-white/40' : 'text-white/20'">Size</span>
                <svg v-if="isFieldLocked" class="w-2.5 h-2.5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <input 
                v-model.number="newEntry.size"
                type="number"
                step="0.01"
                :disabled="isFieldLocked"
                class="bg-transparent border-none p-0 text-sm font-mono placeholder:text-white/5 focus:ring-0 w-20 hide-spinners transition-all"
                :class="isFieldLocked ? 'text-white/40 cursor-not-allowed italic' : 'text-white'"
                @keyup.enter="handleQuickSave"
              />
            </div>
          </template>

          <!-- RISK MODULE -->
          <template v-else-if="activeModule === 'risk'">
            <div key="sl" class="flex flex-col gap-1 transition-all duration-500 delay-[50ms]">
              <span class="text-[8px] uppercase tracking-[0.3em] text-rose-500/40 font-black">Stop Loss</span>
              <input 
                v-model.number="newEntry.stopLoss"
                type="number"
                step="any"
                placeholder="0.00"
                class="bg-transparent border-none p-0 text-sm text-white font-mono focus:ring-0 w-32 hide-spinners"
              />
            </div>
            <div key="sep-r1" class="hidden lg:block w-px h-6 bg-white/5 mx-4"></div>
            <div key="tp" class="flex flex-col gap-1 transition-all duration-500 delay-[150ms]">
              <span class="text-[8px] uppercase tracking-[0.3em] text-emerald-500/40 font-black">Take Profit</span>
              <input 
                v-model.number="newEntry.takeProfit"
                type="number"
                step="any"
                placeholder="0.00"
                class="bg-transparent border-none p-0 text-sm text-white font-mono focus:ring-0 w-32 hide-spinners"
              />
            </div>
            <div key="sep-r2" class="hidden lg:block w-px h-6 bg-white/5 mx-4"></div>
            <!-- Dynamic Risk Reward Display -->
            <div key="rr" class="flex flex-col gap-1 transition-all duration-500 delay-[250ms] items-end min-w-[60px]">
              <span class="text-[8px] uppercase tracking-[0.3em] text-white/20 font-black">Tactical RR</span>
              <div class="flex items-center gap-1 font-mono">
                <span class="text-[10px] text-white/20">1:</span>
                <span class="text-xs font-bold" :class="Number(formattedRR) >= 2 ? 'text-emerald-400' : 'text-white/40'">{{ formattedRR }}</span>
              </div>
            </div>
          </template>

          <!-- TIMELINE MODULE (Phantom Elite Monochromatic) -->
          <template v-else-if="activeModule === 'timeline'">
            <div 
              key="entry-time-group" 
              class="flex items-center gap-4 transition-all duration-500 cursor-pointer group/time px-5 h-10 rounded-xl hover:bg-white/5"
              @click="activeTimePicker = 'entry'"
            >
               <div class="flex flex-col">
                  <span class="text-[8px] uppercase tracking-[0.4em] font-black transition-colors" :class="activeTimePicker === 'entry' ? 'text-white' : 'text-white/20'">Entry Node</span>
                  <span class="text-[7px] font-mono text-white/10 uppercase tracking-[0.2em] group-hover/time:text-white/30 transition-colors">Adjust Node</span>
               </div>
               <div class="flex flex-col h-full justify-center">
                  <span class="text-[11px] font-mono text-white font-bold tracking-tighter group-hover/time:text-white transition-colors">{{ formatTelemetryDate(newEntry.date) }}</span>
                  <span class="text-[10px] font-mono text-white/40 tracking-widest">{{ formatTelemetryTime(newEntry.date) }}</span>
               </div>
            </div>
            
            <div key="sep-t1" class="hidden lg:block w-px h-6 bg-white/5 mx-2"></div>
            
            <div 
              key="exit-time-group" 
              class="flex items-center gap-4 transition-all duration-500 cursor-pointer group/time px-5 h-10 rounded-xl hover:bg-white/5"
              @click="activeTimePicker = 'exit'"
            >
               <div class="flex flex-col">
                  <span class="text-[8px] uppercase tracking-[0.4em] font-black transition-colors" :class="activeTimePicker === 'exit' ? 'text-white' : 'text-white/20'">Exit Node</span>
                  <span class="text-[7px] font-mono text-white/10 uppercase tracking-[0.2em] group-hover/time:text-white/30 transition-colors">Adjust Node</span>
               </div>
               <div class="flex flex-col h-full justify-center">
                  <span class="text-[11px] font-mono text-white font-bold tracking-tighter group-hover/time:text-white transition-colors">
                     {{ newEntry.dateExit ? formatTelemetryDate(newEntry.dateExit) : 'Scan Pending' }}
                  </span>
                  <span class="text-[10px] font-mono text-white/40 tracking-widest">
                     {{ newEntry.dateExit ? formatTelemetryTime(newEntry.dateExit) : '-- -- --' }}
                  </span>
               </div>
            </div>
          </template>


        </TransitionGroup>
      </div>

      <!-- Live Tactical Summary (Right Side) -->
      <div class="flex items-center gap-10 ml-8 pl-8 border-l border-white/5 h-full">
        <!-- Performance Result % -->
        <div class="flex flex-col items-end whitespace-nowrap">
          <span class="text-[8px] uppercase tracking-[0.3em] text-white/20 font-black mb-1">Performance Result</span>
          <div class="flex items-center gap-1 font-mono" :class="Number(formattedResult) > 0 ? 'text-emerald-400' : (Number(formattedResult) < 0 ? 'text-rose-400' : 'text-white/40')">
            <span class="text-lg font-bold tracking-tighter">{{ Number(formattedResult) > 0 ? '+' : '' }}{{ formattedResult }}</span>
            <span class="text-[10px] opacity-40">%</span>
          </div>
        </div>

        <!-- Action Group -->
        <div class="flex items-center gap-2">
          <!-- Cancel & Hide HUD -->
          <button 
            @click.stop="handleCancel"
            class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 transition-all duration-500 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/50 group"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Pulse Submit / Sequencer Transition -->
          <button 
            @click="isAdvancedMode && !isJournalOpen ? isJournalOpen = true : handleQuickSave()"
            class="w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-95 group relative overflow-hidden"
            :class="[
              isAdvancedMode || (!isAdvancedMode && isEmotionSyncComplete)
                ? 'bg-white border-white text-black' 
                : 'bg-white/5 border-white/10 text-white',
              !isReadyToSave && !(!isJournalOpen && isAdvancedMode) ? 'opacity-30' : 'opacity-100',
              !isReadyToSave && !(!isJournalOpen && isAdvancedMode) ? 'pointer-events-none' : ''
            ]"
          >
            <!-- Active Glow -->
            <div v-if="isReadyToSave || (isAdvancedMode && !isJournalOpen)" class="absolute inset-0 bg-emerald-500/10 animate-pulse rounded-xl"></div>
            
            <template v-if="!isSubmitting">
               <!-- WHITE ARROW: Sequencer Mode -->
               <svg v-if="isAdvancedMode && !isJournalOpen" class="w-5 h-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
               </svg>
               <!-- PLUS: Deploy Mode -->
               <svg v-else class="w-5 h-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
               </svg>
            </template>
            <div v-else class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin relative z-10"></div>
          </button>
        </div>
        </div>
      </div>
    </div>
      </Transition>
    </Teleport>

    <!-- Condition Manifest Interface -->
    <Transition name="phantom-fade">
       <PhantomConditionLibrary v-if="!isJournalOpen" />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import TacticalIcon from '../controls/TacticalIcon.vue';
import CursorTooltip from '../controls/CursorTooltip.vue';
import PhantomNotebook from './PhantomNotebook.vue';
import PhantomTelemetry from './PhantomTelemetry.vue';
import PhantomConditionLibrary from './PhantomConditionLibrary.vue';
import PhantomPositionManager from './PhantomPositionManager.vue';
import { useAuthStore } from '~/entities/user/auth.store';
import { useRoute } from 'vue-router';
import { initAssetService, searchAssets, type AssetInfo } from '@/shared/api/asset.service';
import { useBoardStore } from '@/features/store/useBoard';
import { newEntry, addDiaryEntry, resetEntry, isSubmitting, strategyOptions, selectedStrategyId, isAdditionMode, isBladeOpen, isAddModalOpen, isAdvancedMode, toggleHUDMode, isConditionLibraryOpen, isPositionManagerOpen, isEmotionSyncComplete } from '@/widgets/diary/model/useDiary';

const auth = useAuthStore();
const route = useRoute();
const emit = defineEmits(['success', 'close']);
const boardStore = useBoardStore();

// FLIP STATE & TELEMETRY HELPERS
const flippedPhases = ref<Set<string>>(new Set());
const currentTime = ref(new Date());

onMounted(() => {
  const timer = setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
  onUnmounted(() => clearInterval(timer));
});

const toggleFlip = (phase: string) => {
  if (flippedPhases.value.has(phase)) flippedPhases.value.delete(phase);
  else flippedPhases.value.add(phase);
};

const toggleAllFlips = () => {
  if (flippedPhases.value.size === phases.length) {
    flippedPhases.value.clear();
  } else {
    phases.forEach(p => flippedPhases.value.add(p));
  }
};

const formatTelemetryDate = (date: Date | undefined) => {
  if (!date) return 'SCAN PENDING';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
};

const formatTelemetryTime = (date: Date | undefined) => {
  if (!date) return '00:00:00';
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatTelemetryDuration = (start: Date | undefined, end: Date | undefined) => {
  if (!start) return 'VOID_SIG';
  const endTime = end || currentTime.value; // Use live time if no exit date
  const diff = Math.max(0, endTime.getTime() - start.getTime());
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}D ${hours % 24}H`;
  }
  if (hours > 0) return `${hours}H ${minutes}M`;
  return `${minutes}M ${seconds}S`;
};

const emotions = [
  { id: 'fear', label: 'Fear Response', icon: 'F', state: 'REF_E_01', color: 'rose', desc: 'Risk aversion initiated. Potential for premature exit or missed entry protocols due to perceived volatility spikes.' },
  { id: 'greed', label: 'Greed/Euphoria', icon: 'G', state: 'REF_E_02', color: 'emerald', desc: 'Dopamine loop active. Tendency to ignore SL logic or over-leverage position size beyond risk parameters.' },
  { id: 'fomo', label: 'FOMO Distortion', icon: 'O', state: 'REF_E_03', color: 'blue', desc: 'Chase protocol active. Risk of entering at price exhaustion points. Strategic patience is compromised.' },
  { id: 'frustration', label: 'Frustration', icon: 'R', state: 'REF_E_04', color: 'orange', desc: 'Emotional friction detected. High risk of revenge trading or abandonment of strategic discipline.' },
  { id: 'neutral', label: 'Neutral Logic', icon: 'N', state: 'REF_E_05', color: 'gray', desc: 'System equilibrium maintained. Execution following pure strategic parameters without emotional bias.' },
  { id: 'confidence', label: 'Confidence', icon: 'C', state: 'REF_E_06', color: 'amber', desc: 'Strategic alignment confirmed. High conviction execution within established risk-reward thresholds.' },
  { id: 'calm', label: 'Calm/Zen', icon: 'Z', state: 'REF_E_07', color: 'cyan', desc: 'Peak flow state achieved. Market noise filtered. Execution is fluid and precise.' },
  { id: 'boredom', label: 'Boredom', icon: 'B', state: 'REF_E_08', color: 'yellow', desc: 'Apathy detected. Risk of taking low-quality trades just to be in the market.' }
];

const hoveredEmotion = ref<any>(null);
const hoveredCondition = ref<any>(null);
const hoveredScenario = ref<any>(null);

const phases = ['entry', 'during', 'exit'] as const;
const activePhase = ref<'entry' | 'during' | 'exit' | null>(null);

const togglePhaseItem = (id: string, type: 'emotion' | 'condition' | 'scenario') => {
  if (!activePhase.value) return false;
  const phase = activePhase.value;

  // INTERCEPT: Card-Linked Modification with Authorization Bypass
  if (isItemLinked(id, type, phase) && !isOverrideAuthorized.value) {
     overrideTarget.value = { id, type };
     showOverrideWarning.value = true;
     return false;
  }

  if (!newEntry.value.tacticalPhases) {
    newEntry.value.tacticalPhases = { entry: [], during: [], exit: [] };
  }
  
  // Initialize Stage-Specific Arrays if missing
  if (!newEntry.value.emotionsEntry) newEntry.value.emotionsEntry = [];
  if (!newEntry.value.emotionsDuring) newEntry.value.emotionsDuring = [];
  if (!newEntry.value.emotionsExit) newEntry.value.emotionsExit = [];

  const itemKey = `${type}:${id}`;
  const list = newEntry.value.tacticalPhases[phase];
  const idx = list.indexOf(itemKey);
  
  if (idx > -1) {
    list.splice(idx, 1);
    // Sync specific stage fields
    if (type === 'emotion') {
      const field = phase === 'entry' ? 'emotionsEntry' : phase === 'during' ? 'emotionsDuring' : 'emotionsExit';
      const fIdx = newEntry.value[field]!.indexOf(id);
      if (fIdx > -1) newEntry.value[field]!.splice(fIdx, 1);
    }
  } else {
    list.push(itemKey);
    // Sync specific stage fields
    if (type === 'emotion') {
      const field = phase === 'entry' ? 'emotionsEntry' : phase === 'during' ? 'emotionsDuring' : 'emotionsExit';
      if (!newEntry.value[field]!.includes(id)) newEntry.value[field]!.push(id);
    }
  }
  return true;
};

const confirmOverride = () => {
    if (!overrideTarget.value || !activePhase.value) return;
    const { id, type } = overrideTarget.value;
    
    // AUTHORIZE: Allow subsequent overrides in this session
    isOverrideAuthorized.value = true;

    const phase = activePhase.value;
    const itemKey = `${type}:${id}`;
    const list = newEntry.value.tacticalPhases![phase];
    const idx = list.indexOf(itemKey);
    
    if (idx > -1) {
      list.splice(idx, 1);
      if (type === 'emotion') {
         const field = phase === 'entry' ? 'emotionsEntry' : phase === 'during' ? 'emotionsDuring' : 'emotionsExit';
         const fIdx = (newEntry.value[field] || []).indexOf(id);
         if (fIdx > -1) newEntry.value[field]!.splice(fIdx, 1);
      }
    } else {
      list.push(itemKey);
      if (type === 'emotion') {
         const field = phase === 'entry' ? 'emotionsEntry' : phase === 'during' ? 'emotionsDuring' : 'emotionsExit';
         if (!newEntry.value[field]) newEntry.value[field] = [];
         if (!newEntry.value[field]!.includes(id)) newEntry.value[field]!.push(id);
      }
    }
    
    showOverrideWarning.value = false;
    overrideTarget.value = null;
};

const isItemActiveInPhase = (id: string, type: 'emotion' | 'condition' | 'scenario'): boolean => {
  if (!activePhase.value || !newEntry.value.tacticalPhases) return false;
  const phase = activePhase.value;
  const itemKey = `${type}:${id}`;
  return newEntry.value.tacticalPhases[phase]?.includes(itemKey) ?? false;
};

const handleInventoryHover = (itemKey: string, active: boolean) => {
  if (!active) {
    hoveredEmotion.value = null;
    hoveredCondition.value = null;
    hoveredScenario.value = null;
    return;
  }
  
  const [type, id] = itemKey.split(':');
  if (type === 'emotion') {
    hoveredEmotion.value = emotions.find(e => e.id === id);
  } else if (type === 'condition') {
    const all = [...entryConditions.value, ...exitConditions.value];
    hoveredCondition.value = all.find(c => c.id === id);
  } else if (type === 'scenario') {
    const all = [...entryScenarios.value, ...exitScenarios.value];
    hoveredScenario.value = all.find(s => s.id === id);
  }
};

const getItemInfo = (itemKey: string): { type: 'emotion' | 'condition' | 'scenario' | 'unknown'; data: string } => {
  const parts = itemKey.split(':');
  const type = parts[0] as any;
  const id = parts[1] || '';

  if (type === 'emotion') return { type: 'emotion', data: id };
  if (type === 'condition') {
    const all = [...entryConditions.value, ...exitConditions.value];
    const cond = all.find((c: any) => c.id === id);
    return { type: 'condition', data: cond?.text ? cond.text.charAt(0).toUpperCase() : 'C' };
  }
  if (type === 'scenario') {
    const scNodes = [...entryScenarios.value, ...exitScenarios.value];
    const sc = scNodes.find(s => s.id === id);
    return { type: 'scenario', data: sc?.scenarioData?.letter || 'S' };
  }
  return { type: 'unknown', data: '?' };
};

/** BOARD-LINKED COMPUTED DATA **/
const activeStrategyBoardId = computed(() => {
  if (!selectedStrategyId.value) return null;
  return strategyOptions.value.find(s => s.id === selectedStrategyId.value)?.boardId || null;
});

const activeStrategyBoard = computed(() => {
  if (!activeStrategyBoardId.value) return null;
  return boardStore.boards.find(b => b.id === activeStrategyBoardId.value) || null;
});

const entryConditions = computed(() => {
  if (!activeStrategyBoard.value) return [];
  const sourceBoards = [activeStrategyBoard.value];
  const allNotes = sourceBoards.flatMap(b => b.notes);
  const allConnections = sourceBoards.flatMap(b => b.connections);
  
  return allNotes.filter(n => n.type === 'conditions').filter(cn => 
    allConnections.some(conn => {
      const otherId = conn.fromId === cn.id ? conn.toId : (conn.toId === cn.id ? conn.fromId : null);
      if (!otherId) return false;
      return allNotes.find(n => n.id === otherId)?.type === 'entry_node';
    })
  ).flatMap(node => {
     if (!node.conditionsData) return [];
     return node.conditionsData.map(item => ({
       ...item,
       parentNodeName: node.conditionsName || 'General',
     }));
  });
});

const exitConditions = computed(() => {
  if (!activeStrategyBoard.value) return [];
  const sourceBoards = [activeStrategyBoard.value];
  const allNotes = sourceBoards.flatMap(b => b.notes);
  const allConnections = sourceBoards.flatMap(b => b.connections);
  
  return allNotes.filter(n => n.type === 'conditions').filter(cn => 
    allConnections.some(conn => {
      const otherId = conn.fromId === cn.id ? conn.toId : (conn.toId === cn.id ? conn.fromId : null);
      if (!otherId) return false;
      return allNotes.find(n => n.id === otherId)?.type === 'exit_node';
    })
  ).flatMap(node => {
     if (!node.conditionsData) return [];
     return node.conditionsData.map(item => ({
       ...item,
       parentNodeName: node.conditionsName || 'General',
     }));
  });
});

const entryScenarios = computed(() => {
  if (!activeStrategyBoard.value) return [];
  const sourceBoards = [activeStrategyBoard.value];
  const allNotes = sourceBoards.flatMap(b => b.notes);
  const allConnections = sourceBoards.flatMap(b => b.connections);
  return allNotes.filter(n => n.type === 'scenario').filter(sc =>
    allConnections.some(conn => {
      const otherId = conn.fromId === sc.id ? conn.toId : (conn.toId === sc.id ? conn.fromId : null);
      if (!otherId) return false;
      return allNotes.find(n => n.id === otherId)?.type === 'entry_node';
    })
  );
});

const getCategorization = (noteId: string): 'entry' | 'exit' | 'during' | 'general' => {
  if (!activeStrategyBoard.value) return 'general';
  
  const connections = activeStrategyBoard.value.connections || [];
  const notes = activeStrategyBoard.value.notes || [];
  const entryNodes = notes.filter(n => n.type === 'entry_node');
  const exitNodes = notes.filter(n => n.type === 'exit_node');

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

const exitScenarios = computed(() => {
  if (!activeStrategyBoard.value) return [];
  const sourceBoards = [activeStrategyBoard.value];
  const allNotes = sourceBoards.flatMap(b => b.notes);
  const allConnections = sourceBoards.flatMap(b => b.connections);
  return allNotes.filter(n => n.type === 'scenario').filter(sc =>
    allConnections.some(conn => {
      const otherId = conn.fromId === sc.id ? conn.toId : (conn.toId === sc.id ? conn.fromId : null);
      if (!otherId) return false;
      return allNotes.find(n => n.id === otherId)?.type === 'exit_node';
    })
  );
});

// SEQUENTIAL INTEGRITY SYSTEM: Card-Linked Activation
const showOverrideWarning = ref(false);
const isOverrideAuthorized = ref(false);
const isJournalOpen = ref(false);
const overrideTarget = ref<{ id: string, type: 'emotion' | 'condition' | 'scenario' } | null>(null);

const isItemLinked = (id: string, type: 'emotion' | 'condition' | 'scenario', phase: 'entry' | 'during' | 'exit'): boolean => {
  if (phase === 'during') return false;
  if (!activeStrategyBoard.value) return false;

  if (type === 'condition') {
    // Determine if this ITEM_ID belongs to any currently selected NOTE_ID (card)
    const selectedNoteIds = newEntry.value.boardConditions || [];
    const notes = activeStrategyBoard.value.notes.filter(n => n.type === 'conditions' && selectedNoteIds.includes(n.id));
    return notes.some(n => (n.conditionsData || []).some(item => item.id === id));
  }
  if (type === 'scenario') {
    // Scenarios are usually 1-to-1 with Note IDs
    return newEntry.value.boardScenarioEntryId === id || newEntry.value.boardScenarioExitId === id;
  }
  return false;
};

// Delta-Based Activation Sync: Handles precise card swapping and cleanup
watch([
  () => [...(newEntry.value.boardConditions || [])],
  () => newEntry.value.boardScenarioEntryId,
  () => newEntry.value.boardScenarioExitId,
  activeStrategyBoard
], ([newC, newSe, newSx, board], [oldC, oldSe, oldSx]) => {
  if (!board) return;
  if (!newEntry.value.tacticalPhases) {
    newEntry.value.tacticalPhases = { entry: [], during: [], exit: [] };
  }

  const currentPhases = newEntry.value.tacticalPhases!;
  
  // 1. HANDLE REMOVED NOTES (Deltas)
  const removedNotes = (oldC as string[] || []).filter(id => !(newC as string[]).includes(id));
  removedNotes.forEach(noteId => {
    const note = board.notes.find(n => n.id === noteId);
    if (!note || !note.conditionsData) return;
    const phase = getCategorization(noteId);
    const targetPhase = (phase === 'entry' || phase === 'general') ? 'entry' : 'exit';
    
    // Purge each child item of this note from the sequencer
    note.conditionsData.forEach(item => {
      const key = `condition:${item.id}`;
      const idx = currentPhases[targetPhase].indexOf(key);
      if (idx > -1) currentPhases[targetPhase].splice(idx, 1);
    });
  });

  // 2. HANDLE REMOVED SCENARIOS
  if (oldSe && oldSe !== newSe) {
    const key = `scenario:${oldSe}`;
    const idx = currentPhases.entry.indexOf(key);
    if (idx > -1) currentPhases.entry.splice(idx, 1);
  }
  if (oldSx && oldSx !== newSx) {
    const key = `scenario:${oldSx}`;
    const idx = currentPhases.exit.indexOf(key);
    if (idx > -1) currentPhases.exit.splice(idx, 1);
  }

  // 3. HANDLE ADDED NOTES (Expansion)
  const addedNotes = (newC as string[] || []).filter(id => !(oldC as string[] || []).includes(id));
  addedNotes.forEach(noteId => {
    const note = board.notes.find(n => n.id === noteId);
    if (!note || !note.conditionsData) return;
    const phase = getCategorization(noteId);
    const targetPhase = (phase === 'entry' || phase === 'general') ? 'entry' : 'exit';
    
    note.conditionsData.forEach(item => {
      const key = `condition:${item.id}`;
      if (!currentPhases[targetPhase].includes(key)) {
        currentPhases[targetPhase].push(key);
      }
    });
  });

  // 4. HANDLE ADDED SCENARIOS
  if (newSe && newSe !== oldSe) {
    const note = board.notes.find(n => n.id === newSe);
    if (note) {
      const key = `scenario:${newSe}`;
      if (!currentPhases.entry.includes(key)) currentPhases.entry.push(key);
    }
  }
  if (newSx && newSx !== oldSx) {
    const note = board.notes.find(n => n.id === newSx);
    if (note) {
      const key = `scenario:${newSx}`;
      if (!currentPhases.exit.includes(key)) currentPhases.exit.push(key);
    }
  }
}, { deep: true });

const isFieldLocked = computed(() => (newEntry.value.executions?.length || 0) > 0);

const handleCancel = () => {
  isBladeOpen.value = false;
  isAddModalOpen.value = false;
  resetEntry();
  activePhase.value = null;
  isOverrideAuthorized.value = false;
  isJournalOpen.value = false;
};

function toggleCondition(id: string) {
  if (!newEntry.value.boardConditions) return;
  const idx = newEntry.value.boardConditions.indexOf(id);
  if (idx > -1) newEntry.value.boardConditions.splice(idx, 1);
  else newEntry.value.boardConditions.push(id);
}

function isConditionActive(id: string): boolean {
  return newEntry.value.boardConditions?.includes(id) ?? false;
}

function toggleScenario(id: string, type: 'entry' | 'exit') {
  if (type === 'entry') {
    newEntry.value.boardScenarioEntryId = newEntry.value.boardScenarioEntryId === id ? '' : id;
  } else {
    newEntry.value.boardScenarioExitId = newEntry.value.boardScenarioExitId === id ? '' : id;
  }
}

function isScenarioActive(id: string, type: 'entry' | 'exit'): boolean {
  return type === 'entry' ? newEntry.value.boardScenarioEntryId === id : newEntry.value.boardScenarioExitId === id;
}

const activeModule = ref<'core' | 'risk' | 'timeline'>('core');

// ASSET SCOUT STATE
const isAssetMenuOpen = ref(false);
const assetResults = ref<AssetInfo[]>([]);
const activeIndex = ref(0);
const loadingAssets = ref(false);
const failedIcons = ref<Set<string>>(new Set());

onMounted(async () => {
    await initAssetService();
    assetResults.value = await searchAssets('');
});

const onAssetBlur = () => {
    setTimeout(() => {
        isAssetMenuOpen.value = false;
    }, 200);
};

let assetDebounce: any = null;
const onAssetInput = () => {
    loadingAssets.value = true;
    if (assetDebounce) clearTimeout(assetDebounce);
    assetDebounce = setTimeout(async () => {
        assetResults.value = await searchAssets(newEntry.value.asset || '');
        activeIndex.value = 0;
        loadingAssets.value = false;
        isAssetMenuOpen.value = true;
    }, 300);
};

const selectAsset = (asset: AssetInfo) => {
    newEntry.value.asset = asset.symbol;
    newEntry.value.assetType = asset.type;
    isAssetMenuOpen.value = false;
};

const selectCustomAsset = () => {
    if (!newEntry.value.asset) return;
    const custom: AssetInfo = {
        symbol: newEntry.value.asset.toUpperCase(),
        name: 'Manual Portfolio Entry',
        type: 'Stocks'
    };
    selectAsset(custom);
};

const moveActive = (dir: number) => {
    const next = activeIndex.value + dir;
    if (next >= 0 && next < assetResults.value.length) {
        activeIndex.value = next;
    }
};

const selectActive = () => {
    const selected = assetResults.value[activeIndex.value];
    if (isAssetMenuOpen.value && selected) {
        selectAsset(selected);
    } else {
        handleQuickSave();
    }
};

const modules = [
  { id: 'core', label: 'Core', path: "M4 6h16M4 12h16M4 18h16" },
  { id: 'risk', label: 'Risk', path: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  { id: 'timeline', label: 'Timeline', path: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
] as const;

const activeTimePicker = ref<'entry' | 'exit' | null>(null);

const adjustTimePart = (target: 'entry' | 'exit', unit: 'year' | 'month' | 'day' | 'hour' | 'minute', amount: number) => {
  const currentRef = target === 'entry' ? newEntry.value.date : (newEntry.value.dateExit || new Date());
  const d = new Date(currentRef);
  
  if (unit === 'year') d.setFullYear(d.getFullYear() + amount);
  else if (unit === 'month') d.setMonth(d.getMonth() + amount);
  else if (unit === 'day') d.setDate(d.getDate() + amount);
  else if (unit === 'hour') d.setHours(d.getHours() + amount);
  else if (unit === 'minute') d.setMinutes(d.getMinutes() + amount);
  
  if (target === 'entry') newEntry.value.date = d;
  else newEntry.value.dateExit = d;
};

// DATE/TIME BINDING HELPERS
const entryDateFormatted = computed({
  get: () => {
    const d = newEntry.value.date;
    if (!d) return '';
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  },
  set: (val) => {
    if (val) newEntry.value.date = new Date(val);
  }
});

const exitDateFormatted = computed({
  get: () => {
    const d = newEntry.value.dateExit;
    if (!d) return '';
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  },
  set: (val) => {
    if (val) newEntry.value.dateExit = new Date(val);
  }
});

// LIVE SUMMARY: Calculations
const formattedNotional = computed(() => {
    const value = (newEntry.value.entry || 0) * (newEntry.value.size || 0);
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
});

const formattedResult = computed(() => {
    const entry = newEntry.value.entry;
    const exit = newEntry.value.exit;
    const side = newEntry.value.side;
    
    if (!entry || !exit || !side) return "0.00";
    
    let percent = 0;
    if (side === 'Long') {
        percent = ((exit - entry) / entry) * 100;
    } else {
        percent = ((entry - exit) / entry) * 100;
    }
    
    return percent.toFixed(2);
});

const formattedRR = computed(() => {
    const entry = newEntry.value.entry;
    const sl = newEntry.value.stopLoss;
    const tp = newEntry.value.takeProfit;
    
    if (!entry || !sl || !tp) return "0.00";
    
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    
    if (risk === 0) return "0.00";
    
    return (reward / risk).toFixed(2);
});

const isReadyToSave = computed(() => {
    const basicReady = !!newEntry.value.asset && (newEntry.value.entry ?? 0) > 0 && (newEntry.value.size ?? 0) > 0;
    
    // In Advanced Mode, we need basic telemetry, OR we unlock if the journal phase has started.
    if (isAdvancedMode.value) return basicReady || isJournalOpen.value;
    
    // In Simple Mode, picking emotions is the 'Key' that unlocks the drawer.
    return isEmotionSyncComplete.value;
});

const handleQuickSave = async () => {
    if (!isReadyToSave.value || isSubmitting.value) return;

    // Core validation: Ensure Asset/Entry/Size are present before final deployment
    const hasCoreInfo = !!newEntry.value.asset && (newEntry.value.entry ?? 0) > 0 && (newEntry.value.size ?? 0) > 0;
    if (!hasCoreInfo) {
        console.warn('[Phantom HUB] Execution halted: Incomplete telemetry package (Asset/Price/Size required).');
        return; 
    }
    
    const uid = route.query.uid as string;
    const authorId = auth.user?.uid;

    if (!authorId || authorId !== uid) return;

    try {
        if (newEntry.value.entry && newEntry.value.exit) {
            const entry = newEntry.value.entry;
            const exit = newEntry.value.exit;
            const size = newEntry.value.size || 0;
            const side = newEntry.value.side;
            
            if (side === 'Long') {
                newEntry.value.result = ((exit - entry) / entry) * 100;
            } else {
                newEntry.value.result = ((entry - exit) / entry) * 100;
            }
            
            if (size > 0) {
                if (side === 'Long') {
                    newEntry.value.profitInCurrency = (exit - entry) * size;
                } else {
                    newEntry.value.profitInCurrency = (entry - exit) * size;
                }
            }
        }

        if (newEntry.value.entry && newEntry.value.stopLoss && newEntry.value.takeProfit) {
            const risk = Math.abs(newEntry.value.entry - newEntry.value.stopLoss);
            const reward = Math.abs(newEntry.value.takeProfit - newEntry.value.entry);
            if (risk > 0) {
                newEntry.value.riskReward = reward / risk;
            }
        }

        newEntry.value.strategyId = selectedStrategyId.value || undefined;
        
        // Final Global Emotion Flattening: Union of all 3 stages for Protocol Intensity calculation
        const allEmotions = new Set([
           ...(newEntry.value.emotionsEntry || []),
           ...(newEntry.value.emotionsDuring || []),
           ...(newEntry.value.emotionsExit || [])
        ]);
        newEntry.value.emotions = Array.from(allEmotions);

        emit('success');
        addDiaryEntry(newEntry.value, authorId, uid).catch(e => console.error('[PhantomDeck] Background save failed', e));
        resetEntry();
    } catch (e) {
        console.error('[PhantomDeck] Save failed', e);
    }
};
</script>

<style scoped>
/* STAGGERED FADE TRANSITION */
.staggered-fade-enter-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.staggered-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
}
.staggered-fade-enter-from {
  opacity: 0;
  transform: translateX(-16px);
}
.staggered-fade-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

.hide-spinners::-webkit-outer-spin-button,
.hide-spinners::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.hide-spinners {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* ASSET MENU UPWARD TRANSITION */
.menu-slide-up-enter-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.menu-slide-up-leave-active {
  transition: all 0.3s ease-in;
}
.menu-slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
.menu-slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 3px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

/* TACTICAL CARD FLIP SYSTEM */
.tactical-card {
  perspective: 2000px;
}
.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}
.is-flipped {
  transform: rotateX(180deg);
}
.card-front, .card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  inset: 0;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  display: flex;
  align-items: center;
  transform-style: preserve-3d;
}
.card-back {
  transform: rotateX(180deg) translateZ(1px);
  background: #030303 !important;
  border-radius: 1rem;
}

/* Force contents to foreground */
.card-front > div, .card-back > div {
  transform: translateZ(2px);
}

input:focus {
  outline: none;
}

/* PHANTOM ELITE HUD TRANSITION SYSTEM */
.phantom-fade-enter-active, .phantom-fade-leave-active {
  transition: opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), backdrop-filter 1.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.phantom-fade-enter-from, .phantom-fade-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px) saturate(100%);
}

.phantom-deploy-top-enter-active, .phantom-deploy-top-leave-active,
.phantom-deploy-bottom-enter-active, .phantom-deploy-bottom-leave-active,
.phantom-deploy-left-enter-active, .phantom-deploy-left-leave-active,
.phantom-deploy-right-enter-active, .phantom-deploy-right-leave-active,
.phantom-deploy-center-enter-active, .phantom-deploy-center-leave-active {
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

/* STAGGERED ORCHESTRATION: ENTRANCE */
.phantom-deploy-center-enter-active { transition-delay: 0.2s; }
.phantom-deploy-left-enter-active { transition-delay: 0.4s; }
.phantom-deploy-right-enter-active { transition-delay: 0.4s; }
.phantom-deploy-bottom-enter-active { transition-delay: 0.6s; }
.phantom-deploy-top-enter-active { transition-delay: 0.7s; }

/* FAST & RESPONSIVE: EXIT */
.phantom-deploy-top-leave-active,
.phantom-deploy-bottom-leave-active,
.phantom-deploy-left-leave-active,
.phantom-deploy-right-leave-active,
.phantom-deploy-center-leave-active {
  transition-duration: 0.4s;
  transition-delay: 0s !important;
}

.phantom-deploy-top-enter-from, .phantom-deploy-top-leave-to {
  opacity: 0;
  transform: translate(-50%, -40px) scale(0.95);
}

.phantom-deploy-bottom-enter-from, .phantom-deploy-bottom-leave-to {
  opacity: 0;
  transform: translate(-50%, 40px) scale(0.95);
}

.phantom-deploy-left-enter-from, .phantom-deploy-left-leave-to {
  opacity: 0;
  transform: translate(-40px, -50%) scale(0.95);
}

.phantom-deploy-right-enter-from, .phantom-deploy-right-leave-to {
  opacity: 0;
  transform: translate(40px, -50%) scale(0.95);
}

.phantom-deploy-center-enter-from, .phantom-deploy-center-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.9);
}

/* TACTICAL RAIL V1.2 INTERFACE */
.tactical-rail-v2 {
  --rail-accent: rgba(255, 255, 255, 0.1);
  --rail-focus: rgba(255, 255, 255, 0.9);
}

.tactical-module-frame {
  position: relative;
  width: 54px;
  height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.tactical-key {
  position: relative;
  width: 42px;
  height: 42px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  clip-path: polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.tactical-key:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateX(4px);
}

.tactical-key.active {
  background: #ffffff;
  color: #000000 !important;
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.5);
  transform: translateX(8px);
}

.key-bracket {
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border: 1px solid rgba(255, 255, 255, 0.02);
  clip-path: polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%);
  pointer-events: none;
}

.module-id {
  position: absolute;
  top: 4px;
  left: -12px;
  font-family: monospace;
  font-size: 6px;
  font-weight: 900;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.15);
  writing-mode: vertical-lr;
  letter-spacing: 0.2em;
}
</style>
