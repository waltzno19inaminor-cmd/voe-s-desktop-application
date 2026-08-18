<template>
  <main 
    class="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-all duration-1000"
    :style="{ marginTop: isHeaderExpanded ? '3rem' : '1rem' }"
  >




  
    <Transition name="halo-slide-bottom">
        <div 
            v-if="isHaloVisible"
            class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-3 transition-all duration-700 pointer-events-none min-w-[800px]"
        >
            <div class="flex flex-col items-center gap-3 pointer-events-auto">
            <!-- THE PHANTOM COMMAND DECK (Advanced Tactical Hub) -->
            <Transition name="phantom-deck-slide">
              <PhantomDeck 
                v-if="isBladeOpen" 
                @success="handlePhantomSuccess" 
                @close="isBladeOpen = false"
                class="mb-4"
              />
            </Transition>
            
            <Teleport to="body">
              <Transition name="luxury-reveal">
                <PhantomSuccessWizard 
                  v-if="isSuccessProtocolActive"
                  :stats="stats"
                  :entries="entriesList"
                  :initialDeposit="currentInitialDeposit"
                  @close="isSuccessProtocolActive = false"
                />
              </Transition>
            </Teleport>

            <div 
                class="flex items-center gap-4 px-6 py-2.5 rounded-full backdrop-blur-3xl border shadow-[0_-32px_64px_-12px_rgba(0,0,0,0.4)] transition-all duration-1000"
                :class="[
                   isHaloSuccess ? 'bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.3)]' : 'bg-white/40 dark:bg-black/60 border-white/20',
                   isHaloSuccess ? 'animate-halo-success' : ''
                ]"
                @mouseenter="handleHaloEnter"
                @mouseleave="handleHaloLeave"
            >
              <!-- CLEAR ARCHIVE BUTTON (Contextual Purge) -->
              <div class="flex items-center gap-2 pr-4 border-r border-black/[0.05] dark:border-white/[0.05]">
                <button 
                  @click="handlePurgeClick"
                  class="group relative flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-500 hover:scale-105 active:scale-95"
                  :class="isConfirmingPurge ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-black/20 dark:text-white/20 hover:text-rose-500/60'"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <Transition name="fade-slide-right">
                    <span v-if="isConfirmingPurge" class="text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Confirm Purge?</span>
                  </Transition>
                </button>
              </div>

              <!-- Strategy Selector -->
              <div v-if="strategyOptions.length > 0" class="relative strategy-selector">
                <button 
                  @click="isStrategyDropdownOpen = !isStrategyDropdownOpen"
                  class="flex items-center gap-2 text-[11px] font-bold text-[#050505] dark:text-white px-2 py-1.5 transition-opacity hover:opacity-70"
                >
                  <span class="max-w-[120px] truncate uppercase tracking-widest">{{ activeStrategyName }}</span>
                  <svg class="w-3 h-3 opacity-40 transition-transform duration-300" :class="{ 'rotate-180': isStrategyDropdownOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <Transition name="dropdown-fade-up" mode="out-in">
                  <div 
                    v-if="isStrategyDropdownOpen" 
                    class="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 bg-white/95 dark:bg-[#050505]/90 backdrop-blur-2xl rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl z-[100] overflow-hidden py-2"
                  >
                    <button
                      @click="selectedStrategyId = null; isStrategyDropdownOpen = false"
                      class="w-full text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest transition duration-200 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                      :class="selectedStrategyId === null ? 'text-amber-600' : 'text-[#777]'"
                    >
                      Global Archive
                    </button>
                    <button
                      v-for="strat in strategyOptions"
                      :key="strat.id"
                      @click="selectedStrategyId = strat.id; isStrategyDropdownOpen = false"
                      class="w-full text-left px-5 py-3 text-[10px] items-center justify-between flex font-bold uppercase tracking-widest transition duration-200 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                      :class="selectedStrategyId === strat.id ? 'text-amber-600' : 'text-[#777]'"
                    >
                      <span>{{ strat.name }}</span>
                      <span class="text-[8px] opacity-30">{{ strat.boardName }}</span>
                    </button>
                  </div>
                </Transition>
            </div>

                <div class="w-[1px] h-6 bg-white/10 mx-1"></div>

                <!-- ACTION 3: PHANTOM DEPLOYMENT -->
            <div class="flex items-center gap-4">
                <div class="flex flex-col items-center">
                    <span class="text-[8px] uppercase tracking-tighter opacity-40 font-bold">Net Result</span>
                    <span class="text-xs font-bold font-serif" :class="stats.netResult >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                        {{ stats.netResult > 0 ? '+' : ''}}{{ stats.netResult.toFixed(2) }}%
                    </span>
                </div>
                <InitialDeposit 
                    :locked-deposit="dynamicDeposit" 
                    :is-locked="!!selectedStrategyId && hasRiskNode" 
                    class="scale-90"
                />
            </div>

            <div class="w-[1px] h-4 bg-black/10 dark:bg-white/10"></div>

            <!-- Controls -->
            <div class="flex items-center gap-3">
                <button 
                  @click="isThoughtsOpen = true"
                  class="p-2 transition-all hover:scale-110 opacity-60 hover:opacity-100"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </button>

                <!-- Sort Toggle -->
                <div class="relative sort-selector">
                    <button @click="isSortDropdownOpen = !isSortDropdownOpen" class="p-2 transition-all hover:scale-110 opacity-60 hover:opacity-100">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                    </button>
                    <Transition name="dropdown-fade-up">
                      <div v-if="isSortDropdownOpen" class="absolute bottom-full right-0 mb-4 w-40 bg-white/95 dark:bg-[#050505]/90 backdrop-blur-2xl rounded-xl border nier-border-primary shadow-2xl z-[100] py-2">
                        <button v-for="opt in sortOptions" :key="opt.id" @click="diarySortMode = opt.id; isSortDropdownOpen = false" class="w-full text-left px-4 py-2 text-[9px] uppercase font-bold tracking-widest hover:bg-black/5 dark:hover:bg-white/5" :class="diarySortMode === opt.id ? 'text-emerald-500' : 'text-[#777]'">
                          {{ opt.label }}
                        </button>
                      </div>
                    </Transition>
                </div>

                <!-- View Mode -->
                <button @click="viewMode = viewMode === 'list' ? 'heatmap' : 'list'" class="p-2 transition-all hover:scale-110 opacity-60 hover:opacity-100">
                    <svg v-if="viewMode === 'list'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                    <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 10h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 16h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z" /></svg>
                </button>

                    <button 
                        v-if="auth.user?.uid == route.query.uid"
                        @click="isBladeOpen = !isBladeOpen"
                        class="ml-2 w-8 h-8 flex items-center justify-center nier-text-primary rounded-full hover:scale-110 active:scale-95 transition-all duration-500 shadow-lg"
                        :class="isBladeOpen ? 'bg-emerald-500 rotate-45 shadow-emerald-500/20' : 'nier-bg-inverted'"
                    >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
    </Transition>
    
    <!-- ═══════════════════ GLOBAL TACTICAL COMMAND SIDEBAR ═══════════════════ -->
    <TacticalCommandSidebar v-if="false" />

   
    <div v-if="selectedStrategyId && !hasRiskNode" class="flex flex-col items-center justify-center py-20 nier-bg-panel rounded-xl border nier-border-primary shadow-sm text-center">
      <div class="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-4 rounded-full mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <header class="mb-4">
        <span class="text-[10px] uppercase tracking-[0.4em] font-bold text-amber-600/50 dark:text-amber-500/50 block mb-2">Technical Requirement</span>
        <h3 class="text-2xl font-serif text-[#050505] dark:text-white leading-tight">Configuration Required</h3>
      </header>
      <p class="text-xs text-[#666] dark:text-[#888] max-w-sm leading-relaxed font-serif opacity-80">
        To activate performance analytics, please navigate to your **Trading Board** and connect a <span class="text-amber-600 dark:text-amber-500 font-bold">Risk Management</span> node directly to your <span class="text-amber-600 dark:text-amber-500 font-bold">Strategy</span> node.
      </p>
    </div>

    <div v-else-if="entriesList && isReady && !forum.loading">

        <template v-if="viewMode === 'list'">
            <div v-if="entriesList.length > 0" class="space-y-4">
                <!-- Header Labels (Visible only on larger screens) -->
                <div class="hidden lg:grid grid-cols-[1.2fr,1fr,1fr,0.8fr,130px,40px] items-center px-8 py-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[#777] opacity-60">
                    <div>Asset & Date</div>
                    <div>Strategy Levels</div>
                    <div class="text-center">Performance</div>
                    <div class="text-center">Details</div>
                    <div class="text-right">Context</div>
                    <div></div>
                </div>

                <!-- Ledger Rows -->
                <div 
                    v-for="entry in paginatedEntries" 
                    :key="entry.id"
                    class="group relative nier-bg-panel border border-black/5 dark:border-white/5 rounded-2xl p-6 lg:px-8 lg:py-5 opacity-85 hover:opacity-100 transition-all duration-500 hover:shadow-2xl hover:shadow-black/5 dark:hover:shadow-white/5 hover:-translate-y-0.5 grid grid-cols-2 lg:grid-cols-[1.2fr,1fr,1fr,0.8fr,130px,40px] items-center gap-y-6 gap-x-4 cursor-pointer"
                    @click="openDetails(entry)"
                >
                    <!-- Left Glow Indicator -->
                    <div 
                        class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2/3 rounded-r-full transition-all duration-500 opacity-0 group-hover:opacity-100"
                        :class="(entry.result ?? 0) > 0 ? 'bg-emerald-500 shadow-[4px_0_12px_rgba(16,185,129,0.4)]' : ((entry.result ?? 0) < 0 ? 'bg-rose-500 shadow-[4px_0_12px_rgba(244,63,94,0.4)]' : 'bg-gray-400')"
                    ></div>

                    <!-- Column 1: Asset & Identity -->
                    <div class="flex items-center gap-4 col-span-2 lg:col-span-1">
                        <div 
                            class="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold tracking-tighter transition-transform duration-500 group-hover:scale-110 bg-black/5 dark:bg-white/5 overflow-hidden border border-black/5 dark:border-white/5 shadow-sm"
                        >
                            <img 
                                v-if="resolveAssetIcon(entry) && entry.id && !failedIcons.has(entry.id)" 
                                :src="resolveAssetIcon(entry)" 
                                class="w-full h-full object-contain p-0.5" 
                                @error="entry.id && failedIcons.add(entry.id)" 
                            />
                            <div v-else class="w-full h-full flex items-center justify-center" :class="(entry.result ?? 0) > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : ((entry.result ?? 0) < 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-gray-500/10 text-gray-500')">
                                {{ (entry.asset || 'T').charAt(0).toUpperCase() }}
                            </div>
                        </div>
                        <div class="flex flex-col">
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-serif font-bold nier-text-primary">{{ entry.asset }}</span>
                                <div v-if="getTradeWarning(entry)" class="relative flex items-center justify-center">
                                    <svg 
                                        class="w-3.5 h-3.5 text-amber-500 cursor-help animate-pulse" 
                                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                        @mouseenter.stop="showTooltip($event, getTradeWarning(entry)!)"
                                        @mouseleave.stop="hideTooltip"
                                    >
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                            </div>
                            <span class="text-[10px] text-[#777] uppercase tracking-widest font-mono mt-0.5">
                                {{ formatDate(entry.date) }}
                            </span>
                        </div>
                    </div>

                    <!-- Column 2: Levels Cluster -->
                    <div class="flex flex-col col-span-1">
                        <div class="flex items-center gap-1.5 text-[11px] font-medium text-[#050505] dark:text-white">
                            <span class="opacity-40 uppercase text-[9px]">In</span> {{ entry.entry }}
                            <svg class="w-3 h-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                            <span class="opacity-40 uppercase text-[9px]">Out</span> {{ entry.exit }}
                        </div>
                        <div class="flex items-center gap-3 mt-1 opacity-50">
                             <div class="flex items-center gap-1">
                                <span class="text-[8px] uppercase tracking-tighter">SL</span>
                                <span class="text-[10px] font-mono">{{ entry.stopLoss || '—' }}</span>
                             </div>
                             <div class="flex items-center gap-1">
                                <span class="text-[8px] uppercase tracking-tighter">TP</span>
                                <span class="text-[10px] font-mono">{{ entry.takeProfit || '—' }}</span>
                             </div>
                        </div>
                    </div>

                    <!-- Column 3: Performance -->
                    <div class="flex flex-col items-center">
                        <span 
                            class="text-lg font-serif font-bold tracking-tight"
                            :class="(entry.result ?? 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : ((entry.result ?? 0) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500 dark:text-gray-400')"
                        >
                            {{ (entry.result ?? 0) > 0 ? '+' : '' }}{{ (entry.result ?? 0).toFixed(2) }}%
                        </span>
                        <div 
                            class="text-[9px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded-md mt-0.5"
                            :class="entry.side === 'Long' ? 'bg-emerald-500/5 text-emerald-600/60' : 'bg-rose-500/5 text-rose-600/60'"
                        >
                            {{ entry.side }}
                        </div>
                    </div>

                    <!-- Column 4: Volume details -->
                    <div class="flex flex-col items-center col-span-1">
                        <div class="flex items-baseline gap-1">
                             <span class="text-sm font-serif font-bold dark:text-white">{{ entry.size }}</span>
                             <span class="text-[10px] text-[#777] uppercase tracking-tighter">Lots</span>
                        </div>
                         <span v-if="entry.sizeInCurrency" class="text-[10px] text-[#777] opacity-60">
                            {{ entry.sizeInCurrency }} {{ entry.currency }}
                        </span>
                    </div>

                    <!-- Column 5: Context & Items -->
                    <div class="flex justify-end col-span-1">
                        <div 
                            v-if="entry.images && entry.images.length > 0"
                            class="flex items-center gap-2 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5 transition-colors group-hover:bg-black/5 dark:group-hover:bg-white/5"
                        >
                            <svg class="w-3.5 h-3.5 text-[#777]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span class="text-[10px] font-bold text-[#666] dark:text-[#aaa]">{{ entry.images.length }} items</span>
                        </div>
                        <span v-else class="text-[10px] italic text-[#ccc] dark:text-[#444] px-3">No attachments</span>
                    </div>

                    <!-- Column 6: Delete Action -->
                    <div class="flex justify-end col-span-2 lg:col-span-1 border-t lg:border-t-0 border-black/[0.03] dark:border-white/[0.03] pt-4 lg:pt-0">
                        <button 
                            @click.stop="removeEntry(entry)"
                            class="p-2.5 rounded-xl text-[#777] hover:text-rose-500 hover:bg-rose-500/10 transition-all duration-300 transform active:scale-90"
                        >
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                
                <!-- Pagination Controls (Only if multiple pages) -->
                <div v-if="totalPages > 1" class="mt-12 flex flex-col items-center gap-4">
                    <div class="flex items-center gap-8">
                        <button 
                            @click="currentPage > 1 && (currentPage--)"
                            class="p-2 transition-all duration-300 group"
                            :class="currentPage > 1 ? 'text-[#050505] dark:text-white hover:scale-125' : 'text-[#ccc] dark:text-[#333] cursor-not-allowed opacity-20'"
                        >
                            <svg class="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        
                        <div class="flex items-baseline gap-1.5 opacity-40">
                            <span class="text-sm font-premium-serif font-bold text-[#050505] dark:text-white">{{ currentPage }}</span>
                            <span class="text-[10px] uppercase tracking-widest text-[#aaa]">/ {{ totalPages }}</span>
                        </div>

                        <button 
                            @click="currentPage < totalPages && (currentPage++)"
                            class="p-2 transition-all duration-300 group"
                            :class="currentPage < totalPages ? 'text-[#050505] dark:text-white hover:scale-125' : 'text-[#ccc] dark:text-[#333] cursor-not-allowed opacity-20'"
                        >
                            <svg class="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Empty State (Only if list is empty) -->
            <div v-else class="text-center py-24 bg-white/50 dark:bg-white/[0.02] rounded-3xl border border-dashed nier-border-primary">
                <div class="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 opacity-40">
                    <svg class="w-8 h-8 text-[#777]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <p class="text-xs uppercase tracking-widest text-[#777] font-bold">No entries archived yet</p>
                <p class="text-[10px] text-[#aaa] mt-1 italic">Your trading history will manifest here.</p>
            </div>
        </template>

        <Heatmap v-else-if="viewMode === 'heatmap'" :entriesList="entriesList" @select="openDetails"/>
    </div>
    <div v-else class="w-36 mx-auto grow min-h-96 my-auto flex items-center justify-center">
            <img src="/logo.svg" class="dark:hidden animate-spin" alt="" />
            <img src="/logo-dark.svg" class="dark:flex hidden animate-spin" alt="" />
    </div>


    <div v-if="isReady && entriesList && entriesList.length > 0" class="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-1000">
      
      <!-- Primary Performance KPI Strip -->
      <div class="relative overflow-hidden bg-white/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-3xl p-8 lg:p-10 shadow-lg shadow-black/[0.02] dark:shadow-none">
        <!-- Subtle accent light -->
        <div class="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 blur-3xl opacity-50"></div>
        
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          <div>
            <span class="text-[10px] uppercase tracking-[0.3em] font-bold text-[#777] dark:text-white/30 block mb-3">Portfolio Performance</span>
            <div class="flex items-baseline gap-4">
              <h2 class="text-5xl font-serif tracking-tight" :class="stats.netResult > 0 ? 'text-emerald-500' : (stats.netResult < 0 ? 'text-rose-500' : 'text-[#050505] dark:text-white')">
                {{ stats.netResult > 0 ? '+' : ''}}{{ stats.netResult.toFixed(2) }}%
              </h2>
              <div v-if="stats.netResult !== 0" class="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-bold border" :class="stats.netResult > 0 ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600' : 'border-rose-500/20 bg-rose-500/5 text-rose-600'">
                {{ stats.netResult > 0 ? 'Leading' : 'Trailing' }}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-6 md:border-l border-black/5 dark:border-white/5 md:pl-12">
            <div>
              <span class="text-[9px] uppercase tracking-[0.2em] font-bold text-[#999] dark:text-[#555] block mb-1.5">Win Rate</span>
              <span class="text-xl font-serif text-[#050505] dark:text-white">{{ stats.winRate.toFixed(1) }}%</span>
            </div>
            <div>
              <span class="text-[9px] uppercase tracking-[0.2em] font-bold text-[#999] dark:text-[#555] block mb-1.5">Profit Factor</span>
              <span class="text-xl font-serif text-[#050505] dark:text-white">{{ stats.profitFactor.toFixed(2) }}</span>
            </div>
            <div>
              <span class="text-[9px] uppercase tracking-[0.2em] font-bold text-[#999] dark:text-[#555] block mb-1.5">Expectancy</span>
              <span class="text-xl font-serif" :class="stats.expectancy > 0 ? 'text-emerald-500' : (stats.expectancy < 0 ? 'text-rose-500' : 'text-[#050505] dark:text-white')">
                {{ stats.expectancy > 0 ? '+' : ''}}{{ stats.expectancy.toFixed(2) }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Secondary Metrics Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="p-5 bg-white/20 dark:bg-white/[0.01] border border-black/5 dark:border-white/[0.03] rounded-2xl transition-all duration-300 hover:border-black/10 dark:hover:border-white/10 group">
          <span class="text-[9px] uppercase tracking-[0.2em] font-bold text-[#999] dark:text-[#555] block mb-2 transition-colors group-hover:text-[#050505] dark:group-hover:text-white">Average Win</span>
          <span class="text-md font-medium text-emerald-600 dark:text-emerald-400">+{{ stats.avgWin.toFixed(2) }}%</span>
        </div>
        <div class="p-5 bg-white/20 dark:bg-white/[0.01] border border-black/5 dark:border-white/[0.03] rounded-2xl transition-all duration-300 hover:border-black/10 dark:hover:border-white/10 group">
          <span class="text-[9px] uppercase tracking-[0.2em] font-bold text-[#999] dark:text-[#555] block mb-2 transition-colors group-hover:text-[#050505] dark:group-hover:text-white">Average Loss</span>
          <span class="text-md font-medium text-rose-600 dark:text-rose-400">{{ stats.avgLoss.toFixed(2) }}%</span>
        </div>
        <div class="p-5 bg-white/20 dark:bg-white/[0.01] border border-black/5 dark:border-white/[0.03] rounded-2xl transition-all duration-300 hover:border-black/10 dark:hover:border-white/10 group">
          <span class="text-[9px] uppercase tracking-[0.2em] font-bold text-[#999] dark:text-[#555] block mb-2 transition-colors group-hover:text-[#050505] dark:group-hover:text-white">Sample size</span>
          <span class="text-md font-medium text-[#050505] dark:text-white">{{ stats.totalTrades }} <span class="text-[10px] text-[#999] dark:text-[#555] font-normal uppercase ml-1.5">{{stats.wins}}W / {{stats.losses}}L</span></span>
        </div>
        <div class="p-5 bg-white/20 dark:bg-white/[0.01] border border-black/5 dark:border-white/[0.03] rounded-2xl transition-all duration-300 hover:border-black/10 dark:hover:border-white/10 group">
          <span class="text-[9px] uppercase tracking-[0.2em] font-bold text-[#999] dark:text-[#555] block mb-2 transition-colors group-hover:text-[#050505] dark:group-hover:text-white">Directionality</span>
          <span class="text-md font-medium text-[#050505] dark:text-white">{{ stats.longs }} <span class="text-[10px] text-[#999] dark:text-[#555] font-normal uppercase mx-1">Long /</span> {{ stats.shorts }} <span class="text-[10px] text-[#999] dark:text-[#555] font-normal uppercase ml-1">Short</span></span>
        </div>
      </div>
    </div>


       <div class="mt-10 flex justify-center">
            <button 
                @click="isExtendedStatsOpen = !isExtendedStatsOpen"
                class="group flex items-center gap-3 px-6 py-3 rounded-full border border-black/5 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-500 shadow-sm"
            >
                <span class="text-[10px] uppercase tracking-[0.2em] font-bold text-[#777] dark:text-[#555] group-hover:text-[#050505] dark:group-hover:text-white transition-colors">
                    {{ isExtendedStatsOpen ? 'Condense Analytics' : 'Deep Performance Insights' }}
                </span>
                <svg 
                    class="w-3.5 h-3.5 text-[#999] transition-transform duration-500" 
                    :class="{ 'rotate-180': isExtendedStatsOpen }"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
        </div>

        <Transition name="fade-refined" mode="out-in">
        <div v-if="isExtendedStatsOpen" class="mt-12 space-y-12">
            
            <!-- Analysis Cards Grid -->
            <div class="grid grid-cols-1 gap-12 auto-rows-auto">
                
                <!-- Chart 1: Equity Curve -->
                <div class="group p-8 lg:p-10 rounded-3xl border border-black/5 dark:border-white/5 bg-white/[0.01] dark:bg-white/[0.01] transition-all duration-700 hover:shadow-2xl hover:shadow-black/[0.02] dark:hover:shadow-white/[0.01]">
                    <header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <span class="text-[9px] uppercase tracking-[0.3em] font-bold text-emerald-500/50 block mb-2">Technical Indicator</span>
                            <h3 class="text-2xl font-serif text-[#050505] dark:text-white">Equity Curve Reconstruction</h3>
                            <p class="text-xs text-[#777] mt-1.5 font-serif opacity-70">Cumulative percentage return mapping across active trading sessions.</p>
                        </div>
                        <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span class="text-[9px] uppercase tracking-widest font-bold text-emerald-600">Net Profit Growth</span>
                        </div>
                    </header>
                    <div class="min-h-[300px] flex items-center justify-center">
                        <DiaryChart v-if="chronoEntries && chronoEntries.length > 1" :entries="chronoEntries" class="w-full" />
                        <div v-else class="flex flex-col items-center opacity-40 py-20">
                            <svg class="w-8 h-8 mb-3 text-[#777]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span class="text-[10px] uppercase tracking-widest text-[#777]">Insufficient data for reconstruction</span>
                        </div>
                    </div>
                </div>

                <!-- Chart 2: Risk/Reward -->
                <div class="group p-8 lg:p-10 rounded-3xl border border-black/5 dark:border-white/5 bg-white/[0.01] dark:bg-white/[0.01] transition-all duration-700 hover:shadow-2xl hover:shadow-black/[0.02] dark:hover:shadow-white/[0.01]">
                    <header class="mb-8">
                        <span class="text-[9px] uppercase tracking-[0.3em] font-bold text-amber-500/50 block mb-2">Efficiency Metric</span>
                        <h3 class="text-2xl font-serif text-[#050505] dark:text-white">Risk/Reward Equilibrium</h3>
                        <p class="text-xs text-[#777] mt-1.5 font-serif opacity-70">Strategic efficiency based on entry-to-target execution parameters.</p>
                    </header>
                    <div class="min-h-[300px] flex items-center justify-center">
                        <RiskRewardChart v-if="chronoEntries && chronoEntries.length > 0" :entries="chronoEntries" class="w-full" />
                        <div v-else class="flex flex-col items-center opacity-40 py-20">
                            <svg class="w-8 h-8 mb-3 text-[#777]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                            </svg>
                            <span class="text-[10px] uppercase tracking-widest text-[#777]">Analytical model pending entries</span>
                        </div>
                    </div>
                </div>

                <!-- Chart 3: Deposit Growth (Conditional) -->
                <div v-if="auth.user?.uid == route.query.uid" class="group p-8 lg:p-10 rounded-3xl border border-black/5 dark:border-white/5 bg-white/[0.01] dark:bg-white/[0.01] transition-all duration-700 hover:shadow-2xl hover:shadow-black/[0.02] dark:hover:shadow-white/[0.01]">
                    <header class="mb-8">
                        <span class="text-[9px] uppercase tracking-[0.3em] font-bold text-blue-500/50 block mb-2">Capital Allocation</span>
                        <h3 class="text-2xl font-serif text-[#050505] dark:text-white">Absolute Capital Progression</h3>
                        <p class="text-xs text-[#777] mt-1.5 font-serif opacity-70">Visual mapping of initial deposit evolution via systematic journaling.</p>
                    </header>
                    <div class="min-h-[300px] flex items-center justify-center">
                        <DepositChart v-if="chronoEntries && chronoEntries.length > 1" :entries="chronoEntries" class="w-full" />
                        <div v-else class="flex flex-col items-center opacity-40 py-20">
                            <span class="text-[10px] uppercase tracking-widest text-[#777]">Deposit data unavailable</span>
                        </div>
                    </div>
                </div>

            </div>

             <!-- Market Comparison Statement Card -->
             <div v-if="quotes" class="relative group mt-8 overflow-hidden rounded-3xl border border-black/5 dark:border-white/5 bg-gradient-to-br from-white/5 to-white/[0.01] dark:from-white/[0.02] dark:to-transparent p-10 lg:p-12 transition-all duration-1000 shadow-xl shadow-black/[0.02] dark:shadow-none">
                <!-- Decorative background elements -->
                <div class="absolute top-0 right-0 w-1/2 h-full bg-emerald-500/[0.02] dark:bg-emerald-400/[0.01] skew-x-[-20deg] translate-x-1/2"></div>
                
                <header class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
                    <div>
                        <span class="text-[10px] uppercase tracking-[0.4em] font-bold text-[#777] dark:text-white/20 block mb-3">Benchmark Analysis</span>
                        <h3 class="text-3xl font-serif text-[#050505] dark:text-white tracking-tight">Statement of Outperformance</h3>
                    </div>
                    <div class="flex items-center px-4 py-2 rounded-2xl border" :class="stats.netResult > quotes.lastYearGrowth ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600' : 'border-rose-500/20 bg-rose-500/5 text-rose-600'">
                        <span class="text-[10px] uppercase tracking-[0.2em] font-bold">
                            {{ stats.netResult > quotes.lastYearGrowth ? 'Market Alpha Generated' : 'Market Beta Deficit' }}
                        </span>
                    </div>
                </header>
                
                <div class="flex flex-col md:flex-row items-start gap-12 lg:gap-20 relative z-10">
                    <div class="flex-1">
                         <div class="flex flex-col mb-8">
                             <span class="text-[10px] text-[#999] dark:text-white/30 uppercase tracking-widest block mb-2">Diary Net Performance</span>
                             <div class="flex items-baseline gap-2">
                                <span class="text-5xl font-serif tracking-tighter" :class="stats.netResult > 0 ? 'text-emerald-500' : 'text-rose-500'">{{ stats.netResult > 0 ? '+' : ''}}{{ stats.netResult.toFixed(2) }}%</span>
                                <span class="text-[10px] text-[#777] uppercase font-bold opacity-40">Cumulative</span>
                             </div>
                         </div>
                    </div>

                    <div class="flex flex-col md:border-l border-black/5 dark:border-white/10 md:pl-12 lg:pl-20">
                         <span class="text-[10px] text-[#999] dark:text-white/30 uppercase tracking-widest block mb-2">SPX 1Y Benchmark</span>
                         <span class="text-4xl font-serif text-[#050505] dark:text-white tracking-tight">{{ quotes.lastYearGrowth > 0 ? '+' : ''}}{{ quotes.lastYearGrowth }}%</span>
                         <p class="text-[10px] text-[#777] mt-3 font-serif italic max-w-[200px] leading-relaxed">Systematic performance compared to Standard & Poor's 500 Index over the preceding 12-month period.</p>
                    </div>
                </div>
             </div>
        </div>
        </Transition>

    
    <AddEntryModal />
    <EntryDetailsModal 
        :isOpen="isDetailsModalOpen" 
        :entry="selectedEntry" 
        @close="isDetailsModalOpen = false" 
    />

    <Teleport to="body">
      <Transition name="fade-refined" mode="out-in">
        <div 
          v-if="hoveredWarning" 
          key="diary-warning-tooltip"
          class="fixed z-[9999] pointer-events-none"
          :style="{
            left: tooltipX + 24 + 'px',
            top: tooltipY - 24 + 'px'
          }"
        >
          <div class="w-80 p-5 bg-white/70 dark:bg-[#050505]/70 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-amber-500/20 text-xs text-[#050505] dark:text-[#f0f0f0] whitespace-normal leading-relaxed text-left font-serif backdrop-blur-2xl overflow-hidden group">
            <!-- Subtle accent light -->
            <div class="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"></div>
            
            <div class="flex items-start gap-3">
              <div class="mt-0.5 p-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div class="flex-1">
                <span class="block font-bold text-amber-700 dark:text-amber-500 mb-1.5 tracking-[0.1em] uppercase text-[9px] font-sans">Strategic Constraint</span>
                <p class="text-[#444] dark:text-[#ccc] opacity-90 leading-relaxed">
                  {{ hoveredWarning }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="thoughts-slide">
        <ThoughtsMain 
          v-if="isThoughtsOpen" 
          @close="isThoughtsOpen = false" 
        />
      </Transition>
    </Teleport>
  </main>
</template>


<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, onBeforeUnmount } from 'vue';
import { isAddModalOpen, isBladeOpen, isAdvancedMode, toggleHUDMode, removeDiaryEntry, loadDiaryFromDisk, strategyOptions, selectedStrategyId, loadStrategies, clearDiaryTrades, filterAssetName, filterSide, filterConditions, filterScenarioEntryId, filterScenarioExitId, filterResult, filterAssetType, filterPnlMin, filterPnlMax, filterRrMin, filterRrMax, filterDateFrom, filterDateTo, filterConditionLogic } from '@/widgets/diary/model/useDiary';
import { isHeaderExpanded } from '@/widgets/header/model/useHeader';
import type { DiaryEntry } from '@/entities/diary/model/diary.types';
import AddEntryModal from '@/widgets/diary/ui/modals/AddEntryModal.vue';
import EntryDetailsModal from '@/widgets/diary/ui/modals/EntryDetailsModal.vue';
import { useForumStore } from "~/features/store/useForum";
import { useRoute } from "vue-router";
import { useAuthStore } from '~/entities/user/auth.store';
import Heatmap from '@/widgets/diary/ui/charts/Heatmap.vue';
import DiaryChart from '@/widgets/diary/ui/charts/DiaryChart.vue';
import DepositChart from '@/widgets/diary/ui/charts/DepositChart.vue';
import RiskRewardChart from '@/widgets/diary/ui/charts/RiskRewardChart.vue';
import InitialDeposit from '@/widgets/diary/ui/charts/InitialDeposit.vue';
import ThoughtsMain from '@/widgets/diary/ui/thoughts/ThoughtsMain.vue';
import { loadThoughtsFromDisk } from '@/widgets/diary/model/useThoughts';
import PhantomDeck from '@/widgets/diary/ui/phantom/PhantomDeck.vue';
import TacticalCommandSidebar from './TacticalCommandSidebar.vue';
import PhantomSuccessWizard from '@/widgets/diary/ui/phantom/PhantomSuccessWizard.vue';
import { getIconForAsset, initAssetService, type AssetType } from '@/shared/api/asset.service';



const forum = useForumStore()
const auth = useAuthStore()

const resolveAssetIcon = (entry: DiaryEntry): string => {
  if (entry.assetIcon) return entry.assetIcon;
  if (entry.asset) {
    // If we have asset and type (even if type is unidentified), try to resolve
    const type = (entry.assetType || 'Stocks') as AssetType;
    return getIconForAsset(entry.asset, type) || '';
  }
  return '';
};

const isReady = ref(false);
const viewMode = ref<'list' | 'heatmap'>('list');
const isExtendedStatsOpen = ref(false);
const isHeaderVisible = ref(true);
const isThoughtsOpen = ref(false);
const isHaloActive = ref(false);
const isHaloSuccess = ref(false);
const isSuccessProtocolActive = ref(false);
const isHaloVisible = computed(() => isHaloActive.value || isStrategyDropdownOpen.value || isSortDropdownOpen.value || isBladeOpen.value);
const failedIcons = ref<Set<string | number>>(new Set());
let haloTimer: any = null;

const handlePhantomSuccess = () => {
    isSuccessProtocolActive.value = true;
};

const handleHaloEnter = () => {
  if (haloTimer) clearTimeout(haloTimer);
  isHaloActive.value = true;
};

const handleHaloLeave = () => {
  if (haloTimer) clearTimeout(haloTimer);
  haloTimer = setTimeout(() => {
    isHaloActive.value = false;
    haloTimer = null;
  }, 3000); // 3 seconds grace period before hiding
};

const handleGlobalMouseMove = (e: MouseEvent) => {
  const enterThreshold = 80; // Distance to bottom to SHOW
  const leaveThreshold = 150; // Distance to bottom to HIDE
  const distanceToBottom = window.innerHeight - e.clientY;
  
  if (distanceToBottom < enterThreshold) {
    if (!isHaloActive.value || haloTimer) {
      handleHaloEnter();
    }
  } else if (distanceToBottom > leaveThreshold) {
    if (isHaloActive.value && !haloTimer) {
       // Only start the hide timer if we don't have one and aren't in a sticky state
       if (!isStrategyDropdownOpen.value && !isSortDropdownOpen.value && !isBladeOpen.value) {
         handleHaloLeave();
       }
    }
  }
};

const route = useRoute();

// GHOST ARCHIVE PURGE LOGIC
const isConfirmingPurge = ref(false);
let purgeTimer: any = null;

const handlePurgeClick = async () => {
    if (!isConfirmingPurge.value) {
        isConfirmingPurge.value = true;
        
        // Auto-reset confirmation if no second click within 3 seconds
        if (purgeTimer) clearTimeout(purgeTimer);
        purgeTimer = setTimeout(() => {
            isConfirmingPurge.value = false;
        }, 3000);
        return;
    }

    // Execution Phase
    const uid = route.query.uid as string;
    const authorId = auth.user?.uid;
    if (!authorId || authorId !== uid) return;

    try {
        await clearDiaryTrades(authorId, uid, selectedStrategyId.value || undefined);
        isConfirmingPurge.value = false;
        if (purgeTimer) clearTimeout(purgeTimer);
        
        // Success Pulse through the existing Halo engine
        isHaloSuccess.value = true;
        setTimeout(() => isHaloSuccess.value = false, 2000);
        
        // Reset view
        currentPage.value = 1;
    } catch (e) {
        console.error('[Purge] Failed to clear archive', e);
    }
};

const selectedEntry = ref<DiaryEntry | null>(null);
const isDetailsModalOpen = ref(false);

const isStrategyDropdownOpen = ref(false);
const isSortDropdownOpen = ref(false);
type SortMode = 'exit_newest' | 'exit_oldest' | 'entry_newest' | 'entry_oldest' | 'historical';
const diarySortMode = ref<SortMode>('exit_newest');
const currentPage = ref(1);
const pageSize = 6;

const totalPages = computed(() => {
    return Math.ceil(displayedEntries.value.length / pageSize);
});

const paginatedEntries = computed(() => {
    const start = (currentPage.value - 1) * pageSize;
    const end = start + pageSize;
    return displayedEntries.value.slice(start, end);
});

const sortOptions: { id: SortMode; label: string }[] = [
  { id: 'exit_newest', label: 'Exit: Newest' },
  { id: 'exit_oldest', label: 'Exit: Oldest' },
  { id: 'entry_newest', label: 'Entry: Newest' },
  { id: 'entry_oldest', label: 'Entry: Oldest' },
  { id: 'historical', label: 'Historical (Order Placed)' }
];

const activeStrategyName = computed(() => {
  if (!selectedStrategyId.value) return 'Main Archive';
  const strat = strategyOptions.value.find(s => s.id === selectedStrategyId.value);
  return strat ? `${strat.name} (${strat.boardName})` : 'Main Archive';
});

const activeSortLabel = computed(() => {
  return sortOptions.find(o => o.id === diarySortMode.value)?.label || 'Sort';
});


const closeDropdown = (e: MouseEvent) => {
  if (!(e.target as HTMLElement).closest('.strategy-selector') && !(e.target as HTMLElement).closest('.sort-selector')) {
    isStrategyDropdownOpen.value = false;
    isSortDropdownOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', closeDropdown);
  window.addEventListener('mousemove', handleGlobalMouseMove);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdown);
  window.removeEventListener('mousemove', handleGlobalMouseMove);
  isStrategyDropdownOpen.value = false;
  hideTooltip();
  isDetailsModalOpen.value = false;
  isAddModalOpen.value = false;
});

function formatDate(date: any) {
  if (!date) return '—';
  try {
    // Handle Firestore Timestamp
    if (date && typeof date.toDate === 'function') {
      return date.toDate().toLocaleString("ru-RU", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    // Handle String, Number or Date object
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString("ru-RU", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  } catch (e) {
    console.error('Date formatting error:', e);
  }
  return '—';
}

const hoveredWarning = ref<string | null>(null);
const tooltipX = ref(0);
const tooltipY = ref(0);

const showTooltip = (e: MouseEvent, text: string) => {
  hoveredWarning.value = text;
  tooltipX.value = e.clientX;
  tooltipY.value = e.clientY;
};

const hideTooltip = () => {
  hoveredWarning.value = null;
};

const openDetails = (entry: DiaryEntry) => {
    selectedEntry.value = entry;
    isDetailsModalOpen.value = true;
};

const hasRiskNode = computed(() => {
    if (!selectedStrategyId.value) return true;
    const strat = strategyOptions.value.find(s => s.id === selectedStrategyId.value);
    return strat ? !!(strat.targetRR > 0 || (strat.initialDeposit && strat.initialDeposit > 0)) : false;
});

const dynamicDeposit = computed(() => {
    // 1. If strategy is selected, prioritize board-specific deposit
    if (selectedStrategyId.value) {
        const strat = strategyOptions.value.find(s => s.id === selectedStrategyId.value);
        if (strat && strat.initialDeposit) {
            return strat.initialDeposit;
        }
    }

    // 2. Fallback to global user deposit
    const userData = forum.users.get(route.query.uid as string);
    if (userData?.initialDeposit) return userData.initialDeposit;

    // 3. Last resort: highest found across boards
    let highestDeposit = 0;
    strategyOptions.value.forEach(s => {
        if (s.initialDeposit && s.initialDeposit > highestDeposit) {
            highestDeposit = s.initialDeposit;
        }
    });

    return highestDeposit > 0 ? highestDeposit : null;
});

const entriesList = computed(() => {
    const uid = route.query.uid;
    if (typeof uid !== 'string') return [];

    let list = forum.diaries.get(uid) || [];
    
    if (selectedStrategyId.value) {
        list = list.filter((t: DiaryEntry) => t.strategyId === selectedStrategyId.value);
    }

    // Direction
    if (filterSide.value !== 'All') {
        list = list.filter((t: DiaryEntry) => t.side === filterSide.value);
    }
    // Asset name
    if (filterAssetName.value) {
        list = list.filter((t: DiaryEntry) => t.asset && t.asset.toLowerCase().includes(filterAssetName.value.toLowerCase()));
    }
    // Asset type class
    if (filterAssetType.value !== 'All') {
        list = list.filter((t: DiaryEntry) => t.assetType === filterAssetType.value);
    }
    // Result outcome
    if (filterResult.value !== 'All') {
        list = list.filter((t: DiaryEntry) => {
            const pnl = t.profitInCurrency ?? (t.result ?? 0);
            if (filterResult.value === 'Win') return pnl > 0;
            if (filterResult.value === 'Loss') return pnl < 0;
            if (filterResult.value === 'Breakeven') return pnl === 0;
            return true;
        });
    }
    // P&L range
    if (filterPnlMin.value !== null) {
        list = list.filter((t: DiaryEntry) => (t.profitInCurrency ?? 0) >= filterPnlMin.value!);
    }
    if (filterPnlMax.value !== null) {
        list = list.filter((t: DiaryEntry) => (t.profitInCurrency ?? 0) <= filterPnlMax.value!);
    }
    // R:R range
    if (filterRrMin.value !== null) {
        list = list.filter((t: DiaryEntry) => (t.riskReward ?? 0) >= filterRrMin.value!);
    }
    if (filterRrMax.value !== null) {
        list = list.filter((t: DiaryEntry) => (t.riskReward ?? 0) <= filterRrMax.value!);
    }
    // Date range
    if (filterDateFrom.value) {
        const from = new Date(filterDateFrom.value).getTime();
        list = list.filter((t: DiaryEntry) => {
            const d = t.date ? ((t.date as any).toDate ? (t.date as any).toDate() : new Date(t.date)) : null;
            return d && d.getTime() >= from;
        });
    }
    if (filterDateTo.value) {
        const to = new Date(filterDateTo.value).getTime() + 86400000; // inclusive end of day
        list = list.filter((t: DiaryEntry) => {
            const d = t.date ? ((t.date as any).toDate ? (t.date as any).toDate() : new Date(t.date)) : null;
            return d && d.getTime() <= to;
        });
    }
    // Conditions (AND / OR logic)
    if (filterConditions.value.length > 0) {
        const checkMatch = (t: DiaryEntry, id: string) => {
            if (!t.boardConditions) return false;
            return t.boardConditions.some(item => typeof item === 'object' ? item.id === id : item === id);
        };

        if (filterConditionLogic.value === 'AND') {
            list = list.filter((t: DiaryEntry) => filterConditions.value.every(id => checkMatch(t, id)));
        } else {
            list = list.filter((t: DiaryEntry) => filterConditions.value.some(id => checkMatch(t, id)));
        }
    }
    // Scenarios
    if (filterScenarioEntryId.value) {
        list = list.filter((t: DiaryEntry) => {
            if (t.boardScenarioEntry && typeof t.boardScenarioEntry === 'object') return t.boardScenarioEntry.id === filterScenarioEntryId.value;
            return t.boardScenarioEntryId === filterScenarioEntryId.value;
        });
    }
    if (filterScenarioExitId.value) {
        list = list.filter((t: DiaryEntry) => {
            if (t.boardScenarioExit && typeof t.boardScenarioExit === 'object') return t.boardScenarioExit.id === filterScenarioExitId.value;
            return t.boardScenarioExitId === filterScenarioExitId.value;
        });
    }
    
    return list;
});

const displayedEntries = computed(() => {
    // 0. Historical Mode: return the raw array (newest trades usually at the end)
    // We reverse it to show newest at the top, but maintain the stable array sequence
    if (diarySortMode.value === 'historical') {
        return [...entriesList.value].reverse();
    }

    return [...entriesList.value].sort((a, b) => {
        const getVal = (entry: DiaryEntry, mode: string) => {
            if (mode.startsWith('exit')) {
                const date = entry.dateExit || entry.date;
                return date ? new Date(date).getTime() : 0;
            } else {
                return entry.date ? new Date(entry.date).getTime() : 0;
            }
        };

        const valA = getVal(a, diarySortMode.value);
        const valB = getVal(b, diarySortMode.value);

        if (diarySortMode.value.endsWith('newest')) {
            return valB - valA;
        } else {
            return valA - valB;
        }
    });
});

function getTradeWarning(entry: DiaryEntry): string | null {
  if (!selectedStrategyId.value) return null;
  const strat = strategyOptions.value.find(s => s.id === selectedStrategyId.value);
  if (!strat || strat.targetRR <= 0) return null;
  
  if ((entry.riskReward || 0) < strat.targetRR) {
    return `This trade's Risk/Reward ratio (${(entry.riskReward || 0).toFixed(2)}) deviates from the established strategy target of ${strat.targetRR.toFixed(2)}.`
  }
  return null;
}


const chronoEntries = computed(() => {
    if (!entriesList.value) return [];
    return [...entriesList.value].sort((a, b) => {
        const dateA = a.dateExit ? new Date(a.dateExit).getTime() : (a.date ? new Date(a.date).getTime() : 0);
        const dateB = b.dateExit ? new Date(b.dateExit).getTime() : (b.date ? new Date(b.date).getTime() : 0);
        return dateA - dateB;
    });
});

const quotes = computed(() => {
    
    return forum.quotes.get('spx')
});


const currentInitialDeposit = computed(() => {
    return dynamicDeposit.value 
        ? dynamicDeposit.value 
        : forum.users.get(route.query.uid as string)?.initialDeposit || 1000;
});

const stats = computed(() => {
    if (!entriesList.value || entriesList.value.length === 0) {
        return {
            netResult: 0,
            winRate: 0,
            profitFactor: 0,
            expectancy: 0,
            avgWin: 0,
            avgLoss: 0,
            totalTrades: 0,
            wins: 0,
            losses: 0,
            longs: 0,
            shorts: 0,
            bestTrade: 0,
            worstTrade: 0,
            maxDrawdown: 0,
            longWinRate: 0,
            shortWinRate: 0,
            avgHoldingTime: 0
        };
    }

    let totalProfitCurrency = 0;
    let wins = 0;
    let losses = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let longs = 0;
    let shorts = 0;
    let longWins = 0;
    let shortWins = 0;
    let bestTrade = -Infinity;
    let worstTrade = Infinity;
    let initialDeposit = currentInitialDeposit.value;
    let peakEquity = initialDeposit;
    let maxDrawdown = 0;
    let currentEquity = initialDeposit;
    let totalHoldingDays = 0;
    let holdingCount = 0;


    const sorted = chronoEntries.value;

    sorted.forEach((entry: DiaryEntry) => {
        let resultVal = entry.result || 0;
        let profitVal = entry.profitInCurrency;
        
        // Backward compatibility: If profitInCurrency is missing or 0 but result is not, infer it
        if (profitVal === undefined || profitVal === null || (profitVal === 0 && resultVal !== 0)) {
            profitVal = (resultVal / 100) * initialDeposit;
        }

        totalProfitCurrency = Number((totalProfitCurrency + profitVal).toFixed(2));
        currentEquity = Number((initialDeposit + totalProfitCurrency).toFixed(2));

        if (currentEquity > peakEquity) {
            peakEquity = currentEquity;
        }
        const drawdown = Number((peakEquity - currentEquity).toFixed(2));
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }

        if (resultVal > bestTrade) bestTrade = resultVal;
        if (resultVal < worstTrade) worstTrade = resultVal;

        if (resultVal > 0) {
            wins++;
            grossProfit += resultVal;
            if (entry.side === 'Long') longWins++;
            if (entry.side === 'Short') shortWins++;
        } else if (resultVal < 0) {
            losses++;
            grossLoss += Math.abs(resultVal); 
        }

        if (entry.side === 'Long') longs++;
        if (entry.side === 'Short') shorts++;

        if (entry.date && entry.dateExit) {
            const start = new Date(entry.date).getTime();
            const end = new Date(entry.dateExit).getTime();
            const days = (end - start) / (1000 * 3600 * 24);
            if (days >= 0) {
                totalHoldingDays += days;
                holdingCount++;
            }
        }
    });

    const totalTrades = entriesList.value.length;
    const netResult = initialDeposit > 0 ? (totalProfitCurrency / initialDeposit) * 100 : 0;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const avgWin = wins > 0 ? totalProfitCurrency > 0 ? totalProfitCurrency / wins : 0 : 0; // This should probably stay as percentage for generic stat or use currency
    // Actually, avgWin is usually % in this UI. Let's keep it as % for now but maybe refine later.
    const avgWinPct = wins > 0 ? grossProfit / wins : 0;
    const avgLossPct = losses > 0 ? -1 * (grossLoss / losses) : 0; 

    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : grossProfit / grossLoss;

    const winProb = wins / totalTrades;
    const lossProb = losses / totalTrades;
    const expectancy = (winProb * avgWinPct) - (lossProb * Math.abs(avgLossPct));

    const longWinRate = longs > 0 ? (longWins / longs) * 100 : 0;
    const shortWinRate = shorts > 0 ? (shortWins / shorts) * 100 : 0;
    const avgHoldingTime = holdingCount > 0 ? totalHoldingDays / holdingCount : 0;

    if (bestTrade === -Infinity) bestTrade = 0;
    if (worstTrade === Infinity) worstTrade = 0;

    return {
        netResult: Number(netResult.toFixed(2)),
        totalProfitCurrency,
        winRate,
        profitFactor,
        expectancy,
        avgWin: avgWinPct,
        avgLoss: avgLossPct,
        totalTrades,
        wins,
        losses,
        longs,
        shorts,
        bestTrade,
        worstTrade,
        maxDrawdown,
        longWinRate,
        shortWinRate,
        avgHoldingTime: holdingCount > 0 ? totalHoldingDays / holdingCount : 0
    };
});






watch(
  () => route.query.uid,
  async (uid) => {
    if (typeof uid === "string") {
      isReady.value = false;

      await forum.fetchUser(uid);
      await forum.fetchQuotes();
      await initAssetService();
      
      // Load local diary if it's the current user
      if (auth.user?.uid === uid) {
          await loadDiaryFromDisk(uid);
          await loadStrategies(); // Load available strategies from boards
          await loadThoughtsFromDisk(uid); // Load thoughts journal
      }

      isReady.value = true;
      // injectMockData();
    }
  },
  { immediate: true }
);

const removeEntry = async (entry: DiaryEntry) => {
    const uid = route.query.uid;
    if (typeof uid !== 'string' || auth.user?.uid !== uid) {
        return;
    }
    await removeDiaryEntry(entry, auth.user?.uid as string, uid);
    // Note: forum.removeDiaryEntry is now called inside removeDiaryEntry in useDiary.ts
}

/*
function addMockData(entry: DiaryEntry) {
    forum.addDiaryEntry(route.query.uid as string, entry);
}

const injectMockData = () => {
    for (let i = 0; i < 40; i++) {
        const date = new Date(Date.now() - (i * 12 * 60 * 60 * 1000));
        forum.addDiaryEntry(route.query.uid as string, {
            id: 'mock_' + i + '_' + Date.now() + '_' + Math.random(),
            date: date,
            dateExit: new Date(date.getTime() + 3600000),
            asset: 'EUR/USD',
            side: i % 2 === 0 ? 'Long' : 'Short',
            entry: 1.0850,
            exit: 1.1020,
            result: 1.56,
            profitInCurrency: 156.00,
            size: 1,
            currency: 'USD',
            notes: 'Simple demo trade #' + (i + 1),
            assetType: 'Forex'
        });
    }
}
*/

// Mock data will now be injected via the watcher above
onMounted(() => {
    // Already handled by watch
});

// Reset pagination on filter/sort changes
watch([diarySortMode, selectedStrategyId], () => {
    currentPage.value = 1;
});
</script>

<style scoped>
/* Refined Transitions */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.dropdown-fade-up-enter-active,
.dropdown-fade-up-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-fade-up-enter-from,
.dropdown-fade-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Reflections panel slide transition */
.thoughts-slide-enter-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.thoughts-slide-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 1, 1);
}
.thoughts-slide-enter-from {
  opacity: 0;
  transform: translateY(32px) scale(0.98);
}
.thoughts-slide-leave-to {
  opacity: 0;
  transform: translateY(24px) scale(0.99);
}

/* Ghost Halo HUD Transition - BOTTOM UP */
.halo-slide-bottom-enter-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.halo-slide-bottom-leave-active {
  transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.halo-slide-bottom-enter-from,
.halo-slide-bottom-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px) scale(0.95);
}

/* FADE SLIDE RIGHT */
.fade-slide-right-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-slide-right-leave-active {
  transition: all 0.2s ease-in;
}
.fade-slide-right-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}
.fade-slide-right-leave-to {
  opacity: 0;
  transform: translateX(5px);
}

.phantom-deck-slide-enter-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.phantom-deck-slide-leave-active {
  transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.phantom-deck-slide-enter-from {
  opacity: 0;
  transform: translateY(24px) scale(0.95);
}
.phantom-deck-slide-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

@keyframes halo-success-pulse {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-4px) scale(1.01); }
  100% { transform: translateY(0) scale(1); }
}
.animate-halo-success {
  animation: halo-success-pulse 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

/* GLOBAL COMMAND SIDEBAR TRANSITION */
.command-sidebar-slide-enter-active {
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.command-sidebar-slide-leave-active {
  transition: all 0.6s cubic-bezier(0.4, 0, 1, 1);
}
.command-sidebar-slide-enter-from {
  opacity: 0;
  transform: translateX(-200px) translateY(-50%);
}
.command-sidebar-slide-leave-to {
  opacity: 0;
  transform: translateX(-100px) translateY(-50%);
}
</style>
