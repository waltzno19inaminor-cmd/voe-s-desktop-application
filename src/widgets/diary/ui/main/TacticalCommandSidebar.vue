<template>
  <div 
    class="tactical-ghost-sidebar fixed left-0 top-1/2 -translate-y-1/2 z-[600] flex items-center transition-all duration-700 group"
    :class="isHaloActive ? 'pointer-events-auto' : 'pointer-events-none'"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <!-- MINIMALIST VERTICAL STRIP -->
    <div class="h-96 w-4 pointer-events-auto flex items-center justify-center">
       <div class="w-1 h-32 bg-white/5 rounded-full transition-all duration-500 group-hover:bg-white/20 group-hover:h-48 group-hover:w-1.5"></div>
    </div>

    <!-- THE GHOST HALO PILL -->
    <Transition name="halo-slide-left">
      <div 
        v-if="isHaloActive"
        class="pointer-events-auto ml-2 flex gap-4 items-center relative"
      >
        <!-- NAV STRIP -->
        <div class="flex flex-col items-center gap-4 px-3 py-6 rounded-full border border-white/10 bg-black shadow-[32px_0_64px_-12px_rgba(0,0,0,0.4)]">
           <button 
             v-for="mod in modules" :key="mod.id"
             @click="activeModule = mod.id"
             class="p-2.5 rounded-full transition-all duration-500 hover:scale-110 active:scale-95 group/btn relative"
             :class="activeModule === mod.id ? 'bg-white text-black' : 'text-white/30 hover:text-white/60'"
           >
             <div v-if="mod.hasActive" class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 border border-black shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
             <component :is="mod.icon" class="w-4 h-4" />
           </button>

           <div class="w-4 h-px bg-white/5 my-2"></div>

           <button 
             class="p-2.5 rounded-full text-white/20 transition-all duration-500"
             :class="{ 'text-emerald-500 animate-pulse': isAddModalOpen }"
           >
             <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
             </svg>
           </button>
        </div>

        <!-- EXPANDED PANEL -->
        <Transition name="panel-slide" mode="out-in">
          <div 
            v-if="activeModule"
            class="w-[440px] bg-black border border-white/10 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden h-[460px]"
          >
             <!-- Decorative Grids -->
             <div class="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>

             <!-- MODULE: FILTERING -->
             <template v-if="activeModule === 'filter'">
                <div class="flex flex-col h-full relative z-10 w-full overflow-hidden">
                    <!-- COMMAND STATUS STRIP -->
                    <header class="p-6 pb-4 flex-shrink-0 flex items-center justify-between border-b border-white/5 bg-black/20">
                      <div class="flex flex-col gap-1">
                         <span class="text-[7px] uppercase tracking-[0.8em] text-emerald-500/50">SEQUENCE:SCANNER</span>
                         <h3 class="text-[12px] font-black uppercase tracking-[0.2em] text-white">Tactical Mixer</h3>
                      </div>
                      <div class="flex items-center gap-3">
                         <div v-if="activeFilterCount > 0" class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20">
                            <div class="w-1 h-1 rounded-full bg-white animate-pulse"></div>
                            <span class="text-[8px] font-black text-white uppercase tracking-widest">{{ activeFilterCount }} ACTIVE</span>
                         </div>
                      </div>
                    </header>

                    <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                        <!-- DECK 1: VECTOR & IDENTITY -->
                        <div class="space-y-4">
                            <div class="flex items-center justify-between">
                                <span class="text-[9px] uppercase tracking-[0.4em] text-white/40 block font-black">Deck_01: Identity_Primary</span>
                                <span class="text-[7px] text-white/20 uppercase tracking-widest font-black">ISO_ASSET_SCAN</span>
                            </div>
                            
                            <!-- ASSET SELECTION DROPDOWN (LUXURIOUS INSTRUMENT) -->
                            <div class="relative w-full">
                                <button 
                                    @click="isAssetDropdownOpen = !isAssetDropdownOpen"
                                    class="w-full h-12 rounded-sm border transition-all flex items-center justify-between px-4 bg-white/[0.04] border-white/10 hover:border-white/30 group"
                                    :class="{ 'border-white bg-white/[0.08]': isAssetDropdownOpen }"
                                >
                                    <div class="flex items-center gap-3">
                                        <div v-if="filterAssetName" class="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/10">
                                            <span class="text-[10px] font-black text-white/40">{{ filterAssetName.charAt(0) }}</span>
                                        </div>
                                        <div v-else class="w-2 h-2 rounded-full bg-white/20"></div>
                                        <span class="text-[10px] font-black uppercase tracking-widest text-white">
                                            {{ filterAssetName || 'ISO_ALL_ASSETS' }}
                                        </span>
                                    </div>
                                    <svg class="w-3 h-3 text-white/20 transition-transform duration-500" :class="{ 'rotate-180 text-white': isAssetDropdownOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                
                                <Transition name="section-expand">
                                    <div v-if="isAssetDropdownOpen" class="absolute top-[calc(100%+4px)] left-0 w-full z-[100] bg-black border border-white/20 rounded-sm shadow-[0_24px_48px_rgba(0,0,0,0.8)] overflow-hidden">
                                        <!-- SEARCH ARRAY -->
                                        <div class="px-2 pt-2 pb-1 border-b border-white/5">
                                            <div class="relative bg-white/5 rounded-sm px-3 flex items-center h-9 group focus-within:bg-white/10 transition-all border border-transparent focus-within:border-white/20">
                                                <svg class="w-2.5 h-3 text-white/20 group-focus-within:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                                <input 
                                                    v-model="assetSearchQuery"
                                                    type="text" 
                                                    placeholder="SEARCH_INSTRUMENT_SCAN..."
                                                    class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[9px] font-black uppercase tracking-widest text-white placeholder:text-white/10 ml-2 h-full"
                                                    v-focus
                                                />
                                            </div>
                                        </div>

                                        <div class="max-h-60 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
                                            <button 
                                                @click="filterAssetName = ''; isAssetDropdownOpen = false"
                                                class="w-full h-10 px-4 flex items-center gap-3 transition-colors rounded-sm"
                                                :class="!filterAssetName ? 'bg-white text-black' : 'hover:bg-white/5 text-white/40'"
                                            >
                                                <div class="w-1.5 h-1.5 rounded-full" :class="!filterAssetName ? 'bg-black' : 'bg-white/10'"></div>
                                                <span class="text-[9px] font-black uppercase tracking-widest">CLEAR_SCAN</span>
                                            </button>
                                            <div class="h-px bg-white/5 my-1 mx-2"></div>
                                            <button 
                                                v-for="asset in filteredUniqueAssets" :key="asset.name"
                                                @click="filterAssetName = asset.name; isAssetDropdownOpen = false"
                                                class="w-full h-10 px-4 flex items-center justify-between transition-colors rounded-sm group"
                                                :class="filterAssetName === asset.name ? 'bg-white text-black' : 'hover:bg-white/5 text-white/80'"
                                            >
                                                <div class="flex items-center gap-3">
                                                    <span class="text-[10px] font-black tracking-widest">{{ asset.name }}</span>
                                                </div>
                                                <span class="text-[8px] opacity-40 font-mono tracking-tighter">{{ asset.type }}</span>
                                            </button>
                                            <div v-if="filteredUniqueAssets.length === 0" class="py-10 text-center opacity-10 text-[7px] uppercase tracking-[0.4em] font-black">SCAN_ZERO_RESULTS</div>
                                        </div>
                                    </div>
                                </Transition>
                            </div>

                            <div class="grid grid-cols-2 gap-2">
                                <button v-for="s in (['Long', 'Short'] as const)" :key="s" @click="filterSide = filterSide === s ? 'All' : s" class="group relative h-12 border transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden rounded-sm hover:scale-[1.02] active:scale-[0.98]" :class="filterSide === s ? 'bg-white border-white shadow-[0_4px_15px_rgba(255,255,255,0.1)]' : 'bg-white/[0.04] border-white/10 hover:border-white/30'">
                                    <span class="text-[12px] uppercase font-serif italic" :class="filterSide === s ? 'text-black font-black' : 'text-white/80'">{{ s }}</span>
                                    <div class="w-1.5 h-1.5 rounded-full" :class="filterSide === s ? 'bg-black' : 'bg-white/40'"></div>
                                </button>
                            </div>
                        </div>

                        <!-- DECK 2: TACTICAL PROCEDURES -->
                        <div class="space-y-4">
                            <div class="flex items-center justify-between">
                                <div class="flex flex-col gap-0.5">
                                    <span class="text-[9px] uppercase tracking-[0.4em] text-white/40 block font-black">Deck_02: Atomic_Logic</span>
                                    <span class="text-[6px] text-white/10 uppercase tracking-widest">FILTER_BY_STRATEGIC_CONDITIONS</span>
                                </div>
                                <button @click="filterConditionLogic = filterConditionLogic === 'AND' ? 'OR' : 'AND'" class="text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded border transition-all" :class="filterConditionLogic === 'AND' ? 'text-white border-white bg-white/10' : 'text-white/40 border-white/10 bg-white/5'">MODE:{{ filterConditionLogic }}</button>
                            </div>
                            <div class="grid grid-cols-3 gap-2">
                                <button 
                                    v-for="cond in flatConditions" :key="cond.id" 
                                    @click="toggleFilterCondition(cond.id)" 
                                    class="group relative h-20 border transition-all duration-300 flex flex-col items-center justify-center overflow-hidden rounded-sm text-center px-2 hover:scale-[1.02] active:scale-[0.98]" 
                                    :class="filterConditions.includes(cond.id) ? 'bg-white border-white shadow-[0_4px_15px_rgba(255,255,255,0.1)]' : 'bg-white/[0.04] border-white/10 hover:border-white/30'"
                                >
                                    <div class="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l" :class="filterConditions.includes(cond.id) ? 'border-black' : 'border-white/40'"></div>
                                    <div class="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r" :class="filterConditions.includes(cond.id) ? 'border-black' : 'border-white/40'"></div>
                                    
                                    <span class="text-[14px] font-serif font-black leading-tight uppercase truncate w-full" :class="filterConditions.includes(cond.id) ? 'text-black' : 'text-white'">
                                        {{ cond.text.split(' ')[0] }}
                                    </span>
                                    <span class="text-[8px] uppercase tracking-widest mt-1.5 opacity-60 font-black" :class="filterConditions.includes(cond.id) ? 'text-black/60' : 'text-white/40'">{{ cond.parentNodeName.substring(0, 10) }}</span>
                                    
                                    <!-- WR Micro-badge -->
                                    <div v-if="getConditionStats(cond.id).count > 0" class="absolute top-1 right-2 flex items-center gap-0.5">
                                        <span class="text-[9px] font-black font-mono" :class="filterConditions.includes(cond.id) ? 'text-black/80' : 'text-white/40'">{{ getConditionStats(cond.id).wr }}%</span>
                                    </div>
                                </button>
                                <div v-if="flatConditions.length === 0" class="col-span-3 text-center py-6 opacity-20 text-[8px] uppercase tracking-[0.4em]">Grid_Deployment_Pending</div>
                            </div>
                        </div>

                        <!-- DECK 3: SCENARIO INTERSECTION -->
                        <div class="space-y-4">
                            <div class="flex flex-col gap-0.5">
                                <span class="text-[9px] uppercase tracking-[0.4em] text-white/40 block font-black">Deck_03: Tactical_Arcs</span>
                                <span class="text-[6px] text-white/10 uppercase tracking-widest">ISOLATE_ENTRY_AND_EXIT_PATTERNS</span>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <!-- ENTRY ARC -->
                                <div class="space-y-2">
                                    <span class="text-[8px] uppercase tracking-widest text-white/40 font-black">Entry_Pattern</span>
                                    <div class="grid grid-cols-3 gap-1.5">
                                        <button v-for="sc in entryScenarios" :key="sc.id" @click="filterScenarioEntryId = filterScenarioEntryId === sc.id ? '' : sc.id" class="h-12 border transition-all flex items-center justify-center rounded-sm hover:scale-110 active:scale-95 shadow-sm" :class="filterScenarioEntryId === sc.id ? 'bg-white border-white text-black font-black' : 'bg-white/[0.04] border-white/10 text-white/60 hover:border-white/30'">
                                            <span class="text-[15px] font-serif font-black">{{ sc.scenarioData?.letter || 'B' }}</span>
                                        </button>
                                    </div>
                                </div>
                                <!-- EXIT ARC -->
                                <div class="space-y-2">
                                    <span class="text-[8px] uppercase tracking-widest text-white/40 font-black">Exit_Protocol</span>
                                    <div class="grid grid-cols-3 gap-1.5">
                                        <button v-for="sc in exitScenarios" :key="sc.id" @click="filterScenarioExitId = filterScenarioExitId === sc.id ? '' : sc.id" class="h-12 border transition-all flex items-center justify-center rounded-sm hover:scale-110 active:scale-95 shadow-sm" :class="filterScenarioExitId === sc.id ? 'bg-white border-white text-black font-black' : 'bg-white/[0.04] border-white/10 text-white/60 hover:border-white/30'">
                                            <span class="text-[15px] font-serif font-black">{{ sc.scenarioData?.letter || 'E' }}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="space-y-4">
                            <div class="flex flex-col gap-0.5">
                                <span class="text-[9px] uppercase tracking-[0.4em] text-white/40 block font-black">Deck_04: Yield_Scanner</span>
                                <span class="text-[6px] text-white/10 uppercase tracking-widest">FILTER_BY_TRADE_OUTCOME</span>
                            </div>
                            <div class="grid grid-cols-4 gap-1.5">
                                <button v-for="r in (['Win', 'Loss', 'Breakeven'] as const)" :key="r" @click="filterResult = filterResult === r ? 'All' : r" class="h-14 border transition-all flex flex-col items-center justify-center rounded-sm hover:scale-[1.02] active:scale-[0.98]" :class="filterResult === r ? 'bg-white border-white text-black shadow-[0_4px_15px_rgba(255,255,255,0.2)]' : 'bg-white/[0.04] border-white/10 text-white/60 hover:border-white/30'">
                                    <span class="text-[12px] font-black uppercase tracking-tighter">{{ r.substring(0, 1) }}</span>
                                    <span class="text-[7px] uppercase tracking-widest opacity-40 font-bold">{{ r }}</span>
                                </button>
                                <button @click="filterResult = 'All'" class="h-14 border transition-all flex items-center justify-center rounded-sm text-[8px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98]" :class="filterResult === 'All' ? 'bg-white border-white text-black shadow-[0_4px_15px_rgba(255,255,255,0.2)]' : 'bg-white/[0.04] border-white/10 text-white/40 hover:border-white/30'">ALL</button>
                            </div>
                        </div>

                        <!-- DECK 05: SENSOR ARRAY (QUANTITATIVE) -->
                        <div class="space-y-4">
                            <div class="flex flex-col gap-0.5">
                                <span class="text-[9px] uppercase tracking-[0.4em] text-white/40 block font-black">Deck_05: Sensor_Array</span>
                                <span class="text-[6px] text-white/10 uppercase tracking-widest">QUANTITATIVE_RR_AND_PNL_THRESHOLDS</span>
                            </div>
                            <div class="grid grid-cols-4 gap-2">
                                <button v-for="p in rrPresets" :key="p.label" @click="filterRrMin = filterRrMin === p.min ? null : p.min" class="h-14 border transition-all flex flex-col items-center justify-center rounded-sm hover:scale-105 active:scale-95 shadow-sm" :class="filterRrMin === p.min ? 'bg-white border-white text-black shadow-[0_4px_15px_rgba(255,255,255,0.2)]' : 'bg-white/[0.04] border-white/10 text-white/90 hover:border-white/30'">
                                    <span class="text-[11px] font-black tracking-widest">{{ p.label }}</span>
                                    <span class="text-[7px] uppercase opacity-40 tracking-tighter">RR_VAL</span>
                                </button>
                                <button v-for="p in pnlPresets" :key="p.label" @click="filterPnlMin = filterPnlMin === p.min ? null : p.min" class="h-14 border transition-all flex flex-col items-center justify-center rounded-sm hover:scale-105 active:scale-95 shadow-sm" :class="filterPnlMin === p.min ? 'bg-white border-white text-black shadow-[0_4px_15px_rgba(255,255,255,0.2)]' : 'bg-white/[0.04] border-white/10 text-white/90 hover:border-white/30'">
                                    <span class="text-[11px] font-black tracking-widest">{{ p.label }}</span>
                                    <span class="text-[7px] uppercase opacity-40 font-black mt-0.5">PNL_SCAN</span>
                                </button>
                            </div>
                        </div>

                        <!-- DECK 06: TEMPORAL SCAN -->
                        <div class="space-y-4">
                            <div class="flex flex-col gap-0.5">
                                <span class="text-[9px] uppercase tracking-[0.4em] text-white/40 block font-black">Deck_06: Temporal_Scan</span>
                                <span class="text-[6px] text-white/10 uppercase tracking-widest">TIME_HORIZON_AND_DATE_RANGE_ADJUSTMENT</span>
                            </div>
                            <div class="grid grid-cols-4 gap-2">
                                <button v-for="p in datePresets" :key="p.label" @click="applyDatePreset(p)" class="h-14 border border-white/10 bg-white/[0.04] hover:bg-white/10 transition-all flex flex-col items-center justify-center rounded-sm group hover:scale-[1.05] active:scale-95">
                                    <span class="text-[11px] font-black text-white group-hover:text-white">{{ p.label }}</span>
                                    <span class="text-[7px] uppercase opacity-40 font-black mt-0.5">HORIZON</span>
                                </button>
                                <div class="col-span-4 flex items-center gap-2 mt-1">
                                    <div class="flex-1 bg-black/40 border border-white/10 rounded-sm p-3 flex flex-col gap-1 transition-all hover:border-white/30">
                                        <span class="text-[8px] text-white/40 uppercase font-black tracking-widest">START</span>
                                        <input type="date" v-model="filterDateFrom" class="bg-transparent text-[12px] font-mono text-white focus:outline-none [color-scheme:dark]" />
                                    </div>
                                    <div class="flex-1 bg-black/40 border border-white/10 rounded-sm p-3 flex flex-col gap-1 transition-all hover:border-white/30">
                                        <span class="text-[8px] text-white/40 uppercase font-black tracking-widest">END</span>
                                        <input type="date" v-model="filterDateTo" class="bg-transparent text-[12px] font-mono text-white focus:outline-none [color-scheme:dark]" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- PURGE CONTROL (INTEGRATED SCANNER RESET) -->
                        <div class="px-2 pt-4">
                            <button @click="clearAllFilters" class="w-full h-11 border border-white/5 bg-white/[0.02] flex items-center justify-center text-white/20 hover:text-white hover:border-white/20 hover:bg-white/[0.05] transition-all rounded-sm group">
                                <div class="flex items-center gap-3">
                                    <div class="w-1 h-1 rounded-full bg-white/10 group-hover:bg-white transition-colors"></div>
                                    <span class="text-[8px] font-black uppercase tracking-[0.4em]">PURGE_ALL_FILTERS</span>
                                    <div class="w-1 h-1 rounded-full bg-white/10 group-hover:bg-white transition-colors"></div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
             </template>

             <!-- MODULE: ANALYTICS -->
             <template v-else-if="activeModule === 'stats'">
                <div class="flex flex-col h-full relative z-10 w-full overflow-hidden">
                    <header class="p-6 pb-4 flex-shrink-0 border-b border-white/5 bg-black/20">
                      <div class="flex flex-col gap-1">
                         <span class="text-[7px] uppercase tracking-[0.8em] text-blue-500/50">MODULE:ANALYTICS</span>
                         <h3 class="text-[12px] font-black uppercase tracking-[0.2em] text-white">Performance Matrix</h3>
                      </div>
                    </header>

                    <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                        <!-- KPI GRID -->
                        <div class="grid grid-cols-2 gap-2">
                             <div v-for="stat in performanceKPIs" :key="stat.label" class="p-4 border border-white/5 bg-white/[0.01] rounded-sm flex flex-col gap-1 hover:bg-white/[0.04] transition-all duration-500">
                                 <span class="text-[6px] uppercase tracking-widest text-white/30 font-bold">{{ stat.label }}</span>
                                 <span class="text-[14px] font-black font-serif italic text-white">{{ stat.value }}</span>
                                 <div class="w-full h-[1px] bg-gradient-to-r from-white/10 to-transparent mt-1"></div>
                             </div>
                        </div>

                        <!-- METRIC CORRELATORS -->
                        <div class="space-y-4">
                            <span class="text-[7px] uppercase tracking-[0.4em] text-white/20 block font-black">Matrix_Correlations</span>
                            <div class="p-4 border border-white/5 bg-white/[0.01] rounded-sm space-y-4">
                                <div v-for="metric in correlationMetrics" :key="metric.label" class="flex items-center justify-between">
                                    <div class="flex flex-col">
                                        <span class="text-[7px] uppercase text-white/60">{{ metric.label }}</span>
                                        <span class="text-[10px] font-black text-white">{{ metric.value }}</span>
                                    </div>
                                    <div class="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div class="h-full bg-blue-500/40" :style="{ width: metric.percent + '%' }"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
             </template>

             <!-- MODULE: TACTICS (Conditions & Scenarios) -->
             <template v-else-if="activeModule === 'tactics'">
                <div class="flex flex-col h-full overflow-hidden relative z-10">
                   <!-- TAB SWITCHER -->
                   <header class="p-8 pb-4 flex-shrink-0">
                      <div class="flex flex-col gap-3">
                         <div class="flex flex-col gap-1 mb-2">
                           <span class="text-[7px] uppercase tracking-[0.8em] text-white/30">{{ isAdditionMode ? 'MODULE:EXECUTION' : 'MODULE:PREVIEW' }}</span>
                           <h3 class="text-[12px] font-black uppercase tracking-[0.2em] text-white">Tactical Logic</h3>
                         </div>
                         <!-- SUB-TABS -->
                         <div class="flex items-center p-0.5 bg-white/5 border border-white/10 rounded-md overflow-hidden relative z-10">
                           <button 
                             v-for="tab in subTabs" :key="tab.id"
                             @click="activeSubTab = tab.id"
                             class="flex-1 py-1.5 text-[8px] uppercase tracking-[0.3em] font-medium transition-all duration-500 rounded-sm"
                             :class="activeSubTab === tab.id ? 'bg-white text-black' : 'text-white/20 hover:text-white/40'"
                           >
                             {{ tab.label }}
                           </button>
                         </div>
                      </div>
                   </header>

                   <div class="flex-1 overflow-y-auto custom-scrollbar px-6 pb-8 space-y-10">
                      <!-- PROCEDURES TAB -->
                      <div v-if="activeSubTab === 'archive'" class="space-y-4">
                         <span class="text-[8px] uppercase tracking-[0.4em] font-black text-white/40 border-b border-white/10 pb-2 block">Atomic Procedures</span>
                         <div class="grid grid-cols-2 gap-2">
                            <button 
                              v-for="cond in flatConditions" :key="cond.id"
                              @mouseenter="setHover(cond, 'condition')"
                              @mouseleave="clearHover()"
                              @click.prevent="toggleCondition(cond.id)"
                              class="group relative h-14 border transition-all duration-500 flex items-center px-6 overflow-hidden rounded-md"
                              :class="[
                                isConditionActive(cond.id) ? 'bg-white border-white scale-[1.02]' : 'bg-white/[0.02] border-white/5 hover:border-white/20',
                                !isAdditionMode && 'opacity-40 cursor-not-allowed grayscale'
                              ]"
                            >
                              <div class="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l transition-all duration-500" :class="isConditionActive(cond.id) ? 'border-black' : 'border-white/10 group-hover:border-white/40'"></div>
                              <div class="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r transition-all duration-500" :class="isConditionActive(cond.id) ? 'border-black' : 'border-white/10 group-hover:border-white/40'"></div>

                              <div class="flex flex-col items-start gap-0.5">
                                 <span class="text-[14px] font-medium tracking-tighter leading-none font-serif" :class="isConditionActive(cond.id) ? 'text-black' : 'text-white opacity-60 uppercase'">
                                    {{ cond.text.substring(0, 2) || 'CX' }}
                                 </span>
                                 <span class="text-[6px] uppercase tracking-[0.4em] font-sans font-light" :class="isConditionActive(cond.id) ? 'text-black/30' : 'text-white/10'">ATOMIC_VAL</span>
                              </div>
                              
                              <div v-if="isConditionActive(cond.id)" class="ml-auto flex items-center gap-2">
                                 <div class="w-1 h-3 bg-black"></div>
                                 <span class="text-[7px] font-medium text-black font-sans tracking-widest">ACTIVE</span>
                              </div>
                            </button>
                         </div>
                      </div>

                      <!-- TACTICS TAB -->
                      <template v-else>
                        <div class="space-y-6">
                           <span class="text-[8px] uppercase tracking-[0.3em] font-black text-white/40 border-b border-white/10 pb-2 block">Entry logic Selection</span>
                           <div class="grid grid-cols-3 gap-3">
                             <button 
                               v-for="sc in entryScenarios" :key="'entry-' + sc.id"
                               @mouseenter="setHover(sc, 'scenario')"
                               @mouseleave="clearHover()"
                               @click.prevent="toggleScenario(sc.id, 'entry')"
                               class="group flex flex-col items-center justify-center h-14 border transition-all duration-500 relative rounded-md"
                               :class="[
                                 isScenarioActive(sc.id, 'entry') ? 'bg-white border-white scale-[1.05]' : 'bg-white/[0.02] border-white/5 hover:border-white/20',
                                 !isAdditionMode && 'opacity-40 cursor-not-allowed grayscale'
                               ]"
                             >
                                <div class="absolute top-1 left-1 w-1 h-1 border-t border-l" :class="isScenarioActive(sc.id, 'entry') ? 'border-black' : 'border-white/20'"></div>
                                <span class="text-[12px] font-medium font-serif" :class="isScenarioActive(sc.id, 'entry') ? 'text-black font-black' : 'text-white/70'">
                                   {{ sc.scenarioData?.letter || 'B' }}
                                </span>
                                <span class="text-[6px] uppercase tracking-tighter font-sans font-light" :class="isScenarioActive(sc.id, 'entry') ? 'text-black/30' : 'text-white/10'">ENTRY</span>
                             </button>
                           </div>
                        </div>

                        <div class="space-y-6">
                           <span class="text-[8px] uppercase tracking-[0.3em] font-black text-white/40 border-b border-white/10 pb-2 block">Exit Logic Selection</span>
                           <div class="grid grid-cols-3 gap-3">
                             <button 
                               v-for="sc in exitScenarios" :key="'exit-' + sc.id"
                               @mouseenter="setHover(sc, 'scenario')"
                               @mouseleave="clearHover()"
                               @click.prevent="toggleScenario(sc.id, 'exit')"
                               class="group flex flex-col items-center justify-center h-14 border transition-all duration-500 relative rounded-md"
                               :class="[
                                 isScenarioActive(sc.id, 'exit') ? 'bg-white border-white scale-[1.05]' : 'bg-white/[0.02] border-white/5 hover:border-white/20',
                                 !isAdditionMode && 'opacity-40 cursor-not-allowed grayscale'
                               ]"
                             >
                                <div class="absolute top-1 left-1 w-1 h-1 border-t border-l" :class="isScenarioActive(sc.id, 'exit') ? 'border-black' : 'border-white/20'"></div>
                                <span class="text-[12px] font-medium font-serif" :class="isScenarioActive(sc.id, 'exit') ? 'text-black font-black' : 'text-white/70'">
                                   {{ sc.scenarioData?.letter || 'E' }}
                                </span>
                                <span class="text-[6px] uppercase tracking-tighter font-sans font-light" :class="isScenarioActive(sc.id, 'exit') ? 'text-black/30' : 'text-white/10'">EXIT</span>
                             </button>
                           </div>
                        </div>
                      </template>
                   </div>
                </div>
             </template>

             <!-- MODULE: ANALYTICS -->
             <template v-else-if="activeModule === 'stats'">
                <div class="flex flex-col h-full relative z-10 w-full overflow-hidden">
                    <header class="p-6 pb-4 flex-shrink-0 border-b border-white/5 bg-black/20">
                      <div class="flex flex-col gap-1">
                         <span class="text-[7px] uppercase tracking-[0.8em] text-blue-500/50">MODULE:ANALYTICS</span>
                         <h3 class="text-[12px] font-black uppercase tracking-[0.2em] text-white">Performance Matrix</h3>
                      </div>
                    </header>

                    <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                        <!-- KPI GRID -->
                        <div class="grid grid-cols-2 gap-2">
                             <div v-for="stat in performanceKPIs" :key="stat.label" class="p-4 border border-white/5 bg-white/[0.01] rounded-sm flex flex-col gap-1">
                                 <span class="text-[6px] uppercase tracking-widest text-white/30">{{ stat.label }}</span>
                                 <span class="text-[14px] font-black font-mono text-white">{{ stat.value }}</span>
                                 <div class="w-full h-[1px] bg-gradient-to-r from-white/10 to-transparent mt-1"></div>
                             </div>
                        </div>

                        <!-- METRIC CORRELATORS -->
                        <div class="space-y-4">
                            <span class="text-[7px] uppercase tracking-[0.4em] text-white/20 block font-black">Matrix_Correlations</span>
                            <div class="p-4 border border-white/5 bg-white/[0.01] rounded-sm space-y-4">
                                <div v-for="metric in correlationMetrics" :key="metric.label" class="flex items-center justify-between">
                                    <div class="flex flex-col">
                                        <span class="text-[7px] uppercase text-white/60">{{ metric.label }}</span>
                                        <span class="text-[10px] font-black text-white">{{ metric.value }}</span>
                                    </div>
                                    <div class="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div class="h-full bg-blue-500/40" :style="{ width: metric.percent + '%' }"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
             </template>
          </div>
        </Transition>

        <!-- EXTERNAL HUD PREVIEW (RESTORED OLD METHOD) -->
        <Transition name="fade-hud-side">
          <div v-if="hoveredItem" class="absolute left-full ml-6 top-0 w-80 bg-black border border-white/10 rounded-lg shadow-[0_64px_160px_rgba(0,0,0,1)] p-6 z-20 font-serif flex flex-col gap-6">
            <!-- Live Scanner Effect -->
            <div class="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
               <div class="w-full h-[40px] bg-gradient-to-b from-transparent via-white/[0.03] to-transparent absolute top-[-40px] left-0 animate-scanner"></div>
            </div>
            
            <!-- Military Corner Accents -->
            <div class="absolute top-2 left-2 w-2 h-2 border-t border-l border-white/20"></div>
            <div class="absolute top-2 right-2 w-2 h-2 border-t border-r border-white/20"></div>
            <div class="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-white/20"></div>
            <div class="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-white/20"></div>

            <header class="flex flex-col gap-2 relative">
               <div class="flex items-center gap-3">
                  <span class="text-[16px] font-bold tracking-tight text-white uppercase leading-none truncate">
                     {{ hoveredType === 'condition' ? (hoveredItem.text || 'CONDITION') : hoveredItem.scenarioData?.letter + ' ' + (hoveredItem.scenarioData?.name || 'SCENARIO') }}
                  </span>
                  <div class="h-px flex-1 bg-white/10"></div>
               </div>
               <div class="flex items-center justify-between">
                  <span class="text-[7px] uppercase tracking-[0.4em] font-medium text-white/30">Module Manifest</span>
                  <span class="text-[7px] text-white/10 font-mono tracking-tighter uppercase">REF_{{ hoveredType === 'condition' ? 'CX' : 'LX' }}_CERT</span>
               </div>
            </header>

            <div class="space-y-4 relative flex-1 overflow-y-auto custom-scrollbar pr-2">
              <template v-if="hoveredType === 'condition'">
                 <div v-if="hoveredItem.description" class="text-[11px] text-white/60 leading-relaxed italic border-l border-white/10 pl-4" v-html="hoveredItem.description"></div>
                 <div v-if="hoveredItem.imageData" class="group/img relative">
                    <img :src="hoveredItem.imageData" class="w-full rounded-md border border-white/10" />
                    <div class="absolute inset-0 border border-white/5 pointer-events-none"></div>
                 </div>
                 <div class="flex items-center justify-between pt-2">
                   <span class="text-[6px] text-white/10 uppercase tracking-widest font-mono">Registry_Node</span>
                   <span class="text-[7px] text-white/30 font-mono font-bold uppercase truncate">{{ hoveredItem.parentNodeName }}</span>
                 </div>
              </template>
              <template v-else>
                 <div class="grid grid-cols-1 gap-3 relative pl-4">
                    <div class="absolute left-[3px] top-4 bottom-4 w-px bg-white/10"></div>
                    <div class="bg-white/[0.03] p-4 rounded-md border border-white/5 flex flex-col gap-2">
                       <span class="text-white/20 text-[8px] font-black uppercase tracking-widest">Precedent [IF]</span>
                       <p class="text-[11px] text-white/50 italic leading-snug">{{ hoveredItem.scenarioData?.if }}</p>
                    </div>
                    <div class="bg-white/[0.05] p-5 rounded-md border border-white/10 flex flex-col gap-3 shadow-xl">
                       <span class="text-white/40 text-[9px] font-black uppercase tracking-widest">Execution [THEN]</span>
                       <p class="text-[13px] text-white leading-relaxed font-medium font-sans">{{ hoveredItem.scenarioData?.then }}</p>
                    </div>
                 </div>
              </template>
            </div>

            <footer class="mt-auto pt-4 border-t border-white/5 flex items-center justify-between font-mono">
               <div class="flex flex-col">
                  <span class="text-[5px] text-white/10 uppercase tracking-widest">System Feed</span>
                  <span class="text-[7px] text-white/30 uppercase tracking-tighter">{{ (hoveredItem.id || 'N/A').substring(0, 12) }}</span>
               </div>
               <div class="w-1.5 h-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40"></div>
            </footer>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue';
import { useBoardStore } from '@/features/store/useBoard';
import { entries, newEntry, isAdditionMode, isAddModalOpen, isBladeOpen, filterAssetName, filterSide, filterConditions, filterScenarioEntryId, filterScenarioExitId, filterResult, filterAssetType, filterPnlMin, filterPnlMax, filterRrMin, filterRrMax, filterDateFrom, filterDateTo, filterConditionLogic, selectedStrategyId, strategyOptions } from '@/widgets/diary/model/useDiary';
import { useForumStore } from '@/features/store/useForum';
import { useRoute } from 'vue-router';
import { getIconForAsset, type AssetType } from '@/shared/api/asset.service';

/** STATE **/
const boardStore = useBoardStore();
const isHaloActive = ref(false);
const isHovering = ref(false);
const forum = useForumStore();
const route = useRoute();

const activeModule = ref<'filter' | 'tactics' | 'stats' | null>('filter');
const activeSubTab = ref<string>('archive');
const hoveredItem = ref<any>(null);
const hoveredType = ref<'condition' | 'scenario' | null>(null);
const isAssetDropdownOpen = ref(false);
const assetSearchQuery = ref('');
const openSection = ref<string | null>('asset');

const vFocus = {
  mounted: (el: HTMLElement) => el.focus()
};

function toggleSection(id: string) {
  openSection.value = openSection.value === id ? null : id;
}

let haloTimer: any = null;

const modules = [
  { id: 'filter', label: 'Navigation Search', icon: SearchIcon, hasActive: computed(() => !!filterAssetName.value || filterSide.value !== 'All' || filterResult.value !== 'All' || filterAssetType.value !== 'All' || filterPnlMin.value !== null || filterPnlMax.value !== null || filterRrMin.value !== null || filterRrMax.value !== null || !!filterDateFrom.value || !!filterDateTo.value || filterConditions.value.length > 0 || !!filterScenarioEntryId.value || !!filterScenarioExitId.value) },
  { id: 'tactics', label: 'Strategic Logic', icon: TacticsIcon, hasActive: computed(() => filterConditions.value.length > 0 || !!filterScenarioEntryId.value || !!filterScenarioExitId.value) },
  { id: 'stats', label: 'Intersection Result', icon: StatsIcon, hasActive: false },
] as const;

const subTabs = [
  { id: 'archive', label: 'Procedures' },
  { id: 'tactics', label: 'Tactics' },
] as const;

/** METHODS **/
function onMouseEnter() {
  isHovering.value = true;
  isHaloActive.value = true;
  if (haloTimer) {
    clearTimeout(haloTimer);
    haloTimer = null;
  }
}

function onMouseLeave() {
  isHovering.value = false;
  if (haloTimer) clearTimeout(haloTimer);
  haloTimer = setTimeout(() => {
    if (!isHovering.value) {
      isHaloActive.value = false;
      activeModule.value = 'filter';
      hoveredItem.value = null;
    }
    haloTimer = null;
  }, 600);
}

function clearAllFilters() {
  filterAssetName.value = '';
  filterSide.value = 'All';
  filterResult.value = 'All';
  filterAssetType.value = 'All';
  filterPnlMin.value = null;
  filterPnlMax.value = null;
  filterRrMin.value = null;
  filterRrMax.value = null;
  filterDateFrom.value = '';
  filterDateTo.value = '';
  filterConditions.value = [];
  filterConditionLogic.value = 'AND';
  filterScenarioEntryId.value = '';
  filterScenarioExitId.value = '';
}

function toggleFilterCondition(id: string) {
  const idx = filterConditions.value.indexOf(id);
  if (idx > -1) filterConditions.value.splice(idx, 1);
  else filterConditions.value.push(id);
}

function toggleCondition(id: string) {
  if (!isAdditionMode.value) return;
  const target = newEntry.value.boardConditions;
  if (!target) return;
  const idx = target.indexOf(id);
  if (idx > -1) {
    target.splice(idx, 1);
  } else {
    target.push(id);
  }
}

function isConditionActive(id: string) {
  if (!isAdditionMode.value) return false;
  return newEntry.value.boardConditions?.includes(id);
}

function toggleScenario(id: string, type: 'entry' | 'exit') {
  if (!isAdditionMode.value) return;
  if (type === 'entry') {
    newEntry.value.boardScenarioEntryId = newEntry.value.boardScenarioEntryId === id ? '' : id;
  } else {
    newEntry.value.boardScenarioExitId = newEntry.value.boardScenarioExitId === id ? '' : id;
  }
}

function isScenarioActive(id: string, type: 'entry' | 'exit') {
  if (!isAdditionMode.value) return false;
  return type === 'entry' ? newEntry.value.boardScenarioEntryId === id : newEntry.value.boardScenarioExitId === id;
}

function setHover(item: any, type: 'condition' | 'scenario') {
  hoveredItem.value = item;
  hoveredType.value = type;
}

function clearHover() {
  hoveredItem.value = null;
}

/** COMPUTED DATA **/

// The board ID associated with the currently selected strategy
const activeStrategyBoardId = computed(() => {
  if (!selectedStrategyId.value) return null;
  return strategyOptions.value.find(s => s.id === selectedStrategyId.value)?.boardId || null;
});

// The specific board for the active strategy (null = show all)
const activeStrategyBoard = computed(() => {
  if (!activeStrategyBoardId.value) return null;
  return boardStore.boards.find(b => b.id === activeStrategyBoardId.value) || null;
});

const flatConditions = computed(() => {
  // Scope to the strategy's board if one is selected, else show all
  const sourceBoards = activeStrategyBoard.value
    ? [activeStrategyBoard.value]
    : boardStore.boards;

  return sourceBoards.flatMap(b => b.notes).filter(n => n.type === 'conditions').flatMap(node => {
    if (!node.conditionsData) return [];
    return node.conditionsData.map(item => ({
      ...item,
      parentNodeName: node.conditionsName || 'General',
      parentNodeId: node.id
    }));
  });
});

const entryScenarios = computed(() => {
  const sourceBoards = activeStrategyBoard.value
    ? [activeStrategyBoard.value]
    : boardStore.boards;

  const allNotes = sourceBoards.flatMap(b => b.notes);
  const allConnections = sourceBoards.flatMap(b => b.connections);

  return allNotes.filter(n => n.type === 'scenario').filter(sc => {
    return allConnections.some(conn => {
      const otherId = conn.fromId === sc.id ? conn.toId : (conn.toId === sc.id ? conn.fromId : null);
      if (!otherId) return false;
      const otherNode = allNotes.find(n => n.id === otherId);
      return otherNode?.type === 'entry_node';
    });
  });
});

const exitScenarios = computed(() => {
  const sourceBoards = activeStrategyBoard.value
    ? [activeStrategyBoard.value]
    : boardStore.boards;

  const allNotes = sourceBoards.flatMap(b => b.notes);
  const allConnections = sourceBoards.flatMap(b => b.connections);

  return allNotes.filter(n => n.type === 'scenario').filter(sc => {
    return allConnections.some(conn => {
      const otherId = conn.fromId === sc.id ? conn.toId : (conn.toId === sc.id ? conn.fromId : null);
      if (!otherId) return false;
      const otherNode = allNotes.find(n => n.id === otherId);
      return otherNode?.type === 'exit_node';
    });
  });
});

const uniqueAssets = computed(() => {
  const uid = route.query.uid as string;
  let currentEntries = forum.diaries.get(uid) || [];
  
  // Scope to the current strategy's trades if one is selected
  if (selectedStrategyId.value) {
    currentEntries = currentEntries.filter(e => e.strategyId === selectedStrategyId.value);
  }

  const map = new Map<string, { name: string; icon: string; type: string; previewUrl: string }>();
  
  // Sort entries by date descending to get the most recent image/icon
  const sortedEntries = [...currentEntries].sort((a, b) => {
    const dateA = a.date ? ((a.date as any).toDate ? (a.date as any).toDate() : new Date(a.date)) : new Date(0);
    const dateB = b.date ? ((b.date as any).toDate ? (b.date as any).toDate() : new Date(b.date)) : new Date(0);
    return dateB.getTime() - dateA.getTime();
  });
  
  sortedEntries.forEach(entry => {
    if (!entry || !entry.asset || map.has(entry.asset)) return;
    
    const previewUrl = entry.images?.[0]?.url || '';
    const resolvedIcon = entry.assetIcon || (entry.asset && entry.assetType ? getIconForAsset(entry.asset, entry.assetType as AssetType) : '');
    
    map.set(entry.asset, {
      name: entry.asset,
      icon: resolvedIcon || '',
      type: entry.assetType || 'Forex',
      previewUrl: previewUrl || ''
    });
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
});

const filteredUniqueAssets = computed(() => {
    if (!assetSearchQuery.value) return uniqueAssets.value;
    const q = assetSearchQuery.value.toLowerCase();
    return uniqueAssets.value.filter(a => a.name.toLowerCase().includes(q));
});

const combinedStats = computed(() => {
  const selectedCondIds = isAdditionMode.value ? newEntry.value.boardConditions : filterConditions.value;
  const entryId = isAddModalOpen.value ? newEntry.value.boardScenarioEntryId : filterScenarioEntryId.value;
  const exitId = isAddModalOpen.value ? newEntry.value.boardScenarioExitId : filterScenarioExitId.value;

  if (!selectedCondIds?.length && !entryId && !exitId) return null;

  const relevantTrades = entries.value.filter(e => {
    const sConds = selectedCondIds || [];
    const matchCond = sConds.every(id => {
      if (!e.boardConditions) return false;
      return e.boardConditions.some(item => typeof item === 'object' ? item.id === id : item === id);
    });
    
    const matchEntry = entryId ? (
      (e.boardScenarioEntry && typeof e.boardScenarioEntry === 'object' && e.boardScenarioEntry.id === entryId) || 
      (e.boardScenarioEntryId === entryId)
    ) : true;
    
    const matchExit = exitId ? (
      (e.boardScenarioExit && typeof e.boardScenarioExit === 'object' && e.boardScenarioExit.id === exitId) || 
      (e.boardScenarioExitId === exitId)
    ) : true;
    
    return matchCond && matchEntry && matchExit;
  });

  if (relevantTrades.length === 0) return { winRate: 0, frequency: 0 };
  const wins = relevantTrades.filter(e => (e.result ?? 0) > 0).length;
  return {
    winRate: Math.round((wins / relevantTrades.length) * 100),
    frequency: relevantTrades.length
  };
});

// Active filter count for the badge
const activeFilterCount = computed(() => {
  let count = 0;
  if (filterAssetName.value) count++;
  if (filterSide.value !== 'All') count++;
  if (filterResult.value !== 'All') count++;
  if (filterAssetType.value !== 'All') count++;
  if (filterPnlMin.value !== null || filterPnlMax.value !== null) count++;
  if (filterRrMin.value !== null || filterRrMax.value !== null) count++;
  if (filterDateFrom.value || filterDateTo.value) count++;
  if (filterConditions.value.length > 0) count++;
  if (filterScenarioEntryId.value || filterScenarioExitId.value) count++;
  return count;
});

// Live stats for current filter combination
const filteredStats = computed(() => {
  const uid = route.query.uid as string;
  let list = forum.diaries.get(uid) || [];
  if (selectedStrategyId.value) list = list.filter(e => e.strategyId === selectedStrategyId.value);
  if (filterAssetName.value) list = list.filter(e => e.asset?.toLowerCase().includes(filterAssetName.value.toLowerCase()));
  if (filterSide.value !== 'All') list = list.filter(e => e.side === filterSide.value);
  if (filterAssetType.value !== 'All') list = list.filter(e => e.assetType === filterAssetType.value);
  
  // Temporal Scan
  if (filterDateFrom.value) {
    const from = new Date(filterDateFrom.value);
    list = list.filter(e => e.date && new Date(e.date).getTime() >= from.getTime());
  }
  if (filterDateTo.value) {
    const to = new Date(filterDateTo.value);
    // End of day
    to.setHours(23, 59, 59, 999);
    list = list.filter(e => e.date && new Date(e.date).getTime() <= to.getTime());
  }

  // Result Scan
  if (filterResult.value === 'Win') list = list.filter(e => (e.profitInCurrency ?? e.result ?? 0) > 0);
  else if (filterResult.value === 'Loss') list = list.filter(e => (e.profitInCurrency ?? e.result ?? 0) < 0);
  else if (filterResult.value === 'Breakeven') list = list.filter(e => (e.profitInCurrency ?? e.result ?? 0) === 0);
  
  // Quantitative Sensor Scan
  if (filterPnlMin.value !== null) list = list.filter(e => (e.profitInCurrency ?? 0) >= filterPnlMin.value!);
  if (filterPnlMax.value !== null) list = list.filter(e => (e.profitInCurrency ?? 0) <= filterPnlMax.value!);
  if (filterRrMin.value !== null) list = list.filter(e => (e.riskReward ?? 0) >= filterRrMin.value!);
  if (filterRrMax.value !== null) list = list.filter(e => (e.riskReward ?? 0) <= filterRrMax.value!);
  
  if (filterConditions.value.length > 0) {
    const checkMatch = (e: DiaryEntry, id: string) => {
      if (!e.boardConditions) return false;
      return e.boardConditions.some(item => typeof item === 'object' ? item.id === id : item === id);
    };

    list = filterConditionLogic.value === 'AND'
      ? list.filter(e => filterConditions.value.every(id => checkMatch(e, id)))
      : list.filter(e => filterConditions.value.some(id => checkMatch(e, id)));
  }
  if (filterScenarioEntryId.value) {
    list = list.filter(e => {
        if (e.boardScenarioEntry && typeof e.boardScenarioEntry === 'object') return e.boardScenarioEntry.id === filterScenarioEntryId.value;
        return e.boardScenarioEntryId === filterScenarioEntryId.value;
    });
  }
  if (filterScenarioExitId.value) {
    list = list.filter(e => {
        if (e.boardScenarioExit && typeof e.boardScenarioExit === 'object') return e.boardScenarioExit.id === filterScenarioExitId.value;
        return e.boardScenarioExitId === filterScenarioExitId.value;
    });
  }
  
  const wins = list.filter(e => (e.profitInCurrency ?? e.result ?? 0) > 0).length;
  const totalPnl = list.reduce((s, e) => s + (e.profitInCurrency ?? 0), 0);
  const rrs = list.filter(e => e.riskReward).map(e => e.riskReward!);
  const avgRr = rrs.length ? (rrs.reduce((a, b) => a + b, 0) / rrs.length).toFixed(2) : '—';
  
  return { count: list.length, winRate: list.length ? Math.round((wins / list.length) * 100) : 0, totalPnl, avgRr };
});

// Per-condition win rate badge
function getConditionStats(condId: string) {
  const uid = route.query.uid as string;
  const all = forum.diaries.get(uid) || [];
  const scoped = selectedStrategyId.value ? all.filter(e => e.strategyId === selectedStrategyId.value) : all;
  const relevant = scoped.filter(e => {
    if (!e.boardConditions) return false;
    return e.boardConditions.some(item => typeof item === 'object' ? item.id === condId : item === condId);
  });
  if (!relevant.length) return { wr: 0, count: 0 };
  const wins = relevant.filter(e => (e.profitInCurrency ?? e.result ?? 0) > 0).length;
  return { wr: Math.round((wins / relevant.length) * 100), count: relevant.length };
}

// Per-scenario win rate badge
function getScenarioStats(scId: string, type: 'entry' | 'exit') {
  const uid = route.query.uid as string;
  const all = forum.diaries.get(uid) || [];
  const scoped = selectedStrategyId.value ? all.filter(e => e.strategyId === selectedStrategyId.value) : all;
  const relevant = scoped.filter(e => {
    if (type === 'entry') {
        if (e.boardScenarioEntry && typeof e.boardScenarioEntry === 'object') return e.boardScenarioEntry.id === scId;
        return e.boardScenarioEntryId === scId;
    } else {
        if (e.boardScenarioExit && typeof e.boardScenarioExit === 'object') return e.boardScenarioExit.id === scId;
        return e.boardScenarioExitId === scId;
    }
  });
  if (!relevant.length) return { wr: 0, count: 0 };
  const wins = relevant.filter(e => (e.profitInCurrency ?? e.result ?? 0) > 0).length;
  return { wr: Math.round((wins / relevant.length) * 100), count: relevant.length };
}

// R:R quick presets
const rrPresets = [
  { label: '1:1+', min: 1, max: null },
  { label: '2:1+', min: 2, max: null },
  { label: '3:1+', min: 3, max: null },
  { label: '<1:1', min: null, max: 1 },
] as { label: string; min: number | null; max: number | null }[];

// Date quick presets
const datePresets = [
  { label: 'This Week', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: 'This Year', days: 365 },
];

function applyDatePreset(preset: { label: string; days: number }) {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - preset.days);
  filterDateFrom.value = from.toISOString().slice(0, 10);
  filterDateTo.value = now.toISOString().slice(0, 10);
}

// Logic for Decks
const pnlPresets = [
    { label: '>0.5%', min: 0.5 },
    { label: '>1.5%', min: 1.5 },
    { label: '>3.0%', min: 3.0 },
    { label: '<-1.0%', min: -1.0, isMax: true },
];

const performanceKPIs = computed(() => {
    const s = filteredStats.value;
    const uid = route.query.uid as string;
    const list = forum.diaries.get(uid) || [];
    const profitTrades = list.filter(e => (e.profitInCurrency ?? 0) > 0);
    const lossTrades = list.filter(e => (e.profitInCurrency ?? 0) < 0);
    
    const avgWin = profitTrades.length ? (profitTrades.reduce((a, b) => a + (b.profitInCurrency || 0), 0) / profitTrades.length).toFixed(1) : '0';
    const avgLoss = lossTrades.length ? (lossTrades.reduce((a, b) => a + (b.profitInCurrency || 0), 0) / lossTrades.length).toFixed(1) : '0';
    
    return [
        { label: 'Win Rate', value: `${s.winRate}%` },
        { label: 'Total Yield', value: `${s.totalPnl.toFixed(1)}%` },
        { label: 'Avg RR', value: s.avgRr },
        { label: 'Profit Factor', value: (Math.abs(Number(avgWin)) / (Math.abs(Number(avgLoss)) || 1)).toFixed(2) },
        { label: 'Avg Win', value: `${avgWin}%` },
        { label: 'Avg Loss', value: `${avgLoss}%` },
    ];
});

const correlationMetrics = computed(() => {
    return [
        { label: 'Asset Synergy', value: 'High', percent: 85 },
        { label: 'Time Advantage', value: 'Medium', percent: 45 },
        { label: 'Logic Consistency', value: 'Optimal', percent: 92 },
    ];
});

/** ICONS **/
function SearchIcon() {
  return h('svg', { xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' })
  ]);
}
function TacticsIcon() {
  return h('svg', { xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' })
  ]);
}
function StatsIcon() {
  return h('svg', { xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' })
  ]);
}
</script>

<style scoped>
.tactical-ghost-sidebar {
  font-family: 'Prata', 'Playfair Display', serif;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 2px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

/* TRANSITIONS */
.halo-slide-left-enter-active,
.halo-slide-left-leave-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.halo-slide-left-enter-from,
.halo-slide-left-leave-to {
  opacity: 0;
  transform: translateX(-40px) scale(0.95);
}

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-slide-enter-from { opacity: 0; transform: translateX(-10px); }
.panel-slide-leave-to { opacity: 0; transform: translateX(10px); }

.fade-hud-side-enter-active,
.fade-hud-side-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-hud-side-enter-from { opacity: 0; transform: translateX(-10px); }
.fade-hud-side-leave-to { opacity: 0; transform: translateX(-5px); }

@keyframes scanner {
  0% { transform: translateY(0); }
  100% { transform: translateY(500px); }
}
.animate-scanner {
  animation: scanner 4s linear infinite;
}

/* Section expand accordion */
.section-expand-enter-active,
.section-expand-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}
.section-expand-enter-from,
.section-expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-4px);
}
.section-expand-enter-to,
.section-expand-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* Dark color scheme for date inputs */
input[type="date"].color-scheme-dark {
  color-scheme: dark;
}
</style>
