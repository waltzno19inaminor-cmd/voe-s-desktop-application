<template>
  <Teleport to="body">
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
    
    <!-- Deepened Sophisticated Backdrop -->
    <div 
      class="absolute inset-0 bg-black/40 modal-backdrop-blur transition-all duration-700 ease-out"
      @click="close"
    ></div>

    <!-- Modal Container -->
    <div 
      class="relative bg-white/90 dark:bg-[#050505]/95 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] w-full max-w-5xl max-h-[92vh] overflow-hidden border border-white/20 dark:border-white/10 flex flex-col transform transition-all duration-500 ease-out animate-modal-in"
    >
      
      <!-- Top Accent Line -->
      <div 
        class="absolute top-0 left-0 w-full h-1.5 opacity-60"
        :class="entry?.result && entry.result > 0 ? 'bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0' : (entry?.result && entry.result < 0 ? 'bg-gradient-to-r from-rose-500/0 via-rose-500 to-rose-500/0' : 'bg-gradient-to-r from-gray-500/0 via-gray-500 to-gray-500/0')"
      ></div>

      <!-- Header Section -->
      <header class="px-10 pt-10 pb-6 flex justify-between items-start flex-shrink-0">
        <div class="space-y-1">
          <div class="flex items-center gap-3">
             <span class="text-[9px] font-premium-sans uppercase tracking-[0.4em] font-bold text-[#777] opacity-60">Analysis Result</span>
             <div class="h-[1px] w-8 bg-black/10 dark:bg-white/10"></div>
          </div>
          <div class="flex items-center gap-4">
              <div v-if="entry?.assetIcon" class="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 p-2 border border-black/5 dark:border-white/10 flex items-center justify-center flex-shrink-0 shadow-sm animate-modal-in">
                  <img :src="entry.assetIcon" class="w-full h-full object-contain" />
              </div>
              <div v-else class="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 p-2 border border-black/5 dark:border-white/10 flex items-center justify-center flex-shrink-0 shadow-sm animate-modal-in text-lg font-bold text-[#777]">
                  {{ (entry?.asset || 'T').charAt(0).toUpperCase() }}
              </div>
              <h2 class="text-4xl font-premium-serif text-[#050505] dark:text-white tracking-tight">
                {{ entry?.asset || 'Trade Archive' }}
              </h2>
          </div>
          <div class="flex items-center gap-2 mt-2">
             <span class="text-[11px] font-premium-sans text-[#666] dark:text-[#aaa] uppercase tracking-widest">{{ formatTradeDate(entry?.date) }}</span>
             <span class="w-1 h-1 rounded-full bg-black/10 dark:bg-white/10"></span>
             <span class="text-[11px] font-premium-sans text-[#666] dark:text-[#aaa] uppercase tracking-widest">{{ entry?.side }} Position</span>
          </div>
        </div>
        <button 
          @click="close"
          class="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[#666] dark:text-[#aaa] hover:bg-black/10 dark:hover:bg-white/10 transition-all group active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 transform group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      <!-- Main Content Scrollable Area -->
      <div class="px-10 pb-10 overflow-y-auto custom-scrollbar flex-1">
        
        <!-- Strategic Pathway Visualization -->
        <section class="mb-12 mt-10 relative pt-24 pb-20">
            <!-- TP Marker (Strategic Peak) -->
            <div v-if="entry?.takeProfit" class="absolute top-0 left-1/2 -translate-x-1/2 text-center opacity-40 hover:opacity-100 transition-opacity duration-300">
                <span class="text-[9px] uppercase tracking-[0.3em] font-bold text-emerald-500 mb-1 block leading-none">Target Realization</span>
                <span class="text-xl font-premium-serif tabular-nums text-emerald-600 dark:text-emerald-400 font-bold tracking-tighter">{{ entry.takeProfit }}</span>
                <div class="h-6 w-[1px] bg-gradient-to-b from-emerald-500/50 to-emerald-500/0 mx-auto mt-1"></div>
            </div>

            <!-- THE TACTICAL TRACK: Circles and Connecting Thread -->
            <div class="relative h-10 flex items-center px-24">
                <!-- Status Badge (Anchored to Track) -->
                <div class="absolute left-1/2 -top-6 -translate-x-1/2 z-10">
                    <div 
                        class="px-6 py-2 rounded-full backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap bg-white/10 dark:bg-black/20"
                        :class="statusInfo.color"
                    >
                        {{ statusInfo.label }}
                    </div>
                </div>

                <!-- Thread of Execution Path -->
                <div class="absolute top-1/2 left-24 right-24 -translate-y-1/2 h-[2px] overflow-visible pointer-events-none">
                    <svg class="w-full h-full overflow-visible">
                        <!-- Static dashed base -->
                        <line 
                            x1="0" y1="1" x2="100%" y2="1" 
                            class="stroke-black/10 dark:stroke-white/10"
                            stroke-width="1.5" 
                            stroke-dasharray="4 6"
                        />
                        <!-- Pulsing active thread -->
                        <line 
                            x1="0" y1="1" x2="100%" y2="1" 
                            :class="entry?.result && entry.result >= 0 ? 'stroke-emerald-500/40' : (entry?.result && entry.result < 0 ? 'stroke-rose-500/40' : 'stroke-gray-500/40')"
                            stroke-width="1.5" 
                            stroke-dasharray="100 1000"
                            stroke-linecap="round"
                            class="animate-path-flow"
                        />
                        <!-- Tactical Beam (Tiny glowing dot traversing) -->
                        <circle 
                            r="1.5"
                            :class="entry?.result && entry.result >= 0 ? 'fill-emerald-500 shadow-lg' : (entry?.result && entry.result < 0 ? 'fill-rose-500 shadow-lg' : 'fill-gray-500 shadow-lg')"
                            class="animate-beam-flow"
                        >
                            <animate 
                                attributeName="cx" 
                                from="0%" to="100%" 
                                dur="4s" 
                                repeatCount="indefinite"
                            />
                        </circle>
                    </svg>
                </div>

                <!-- Points Only -->
                <div class="w-full flex justify-between relative z-1">
                    <!-- Entry Dot -->
                    <div class="w-4 h-4 rounded-full nier-bg-panel border-2 border-black dark:border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-transform duration-500 hover:scale-150"></div>
                    
                    <!-- Exit Dot -->
                    <div 
                        class="w-4 h-4 rounded-full border-2 shadow-[0_0_15px_rgba(0,0,0,0.2)] transition-transform duration-500 hover:scale-150"
                        :class="entry?.result && entry.result >= 0 ? 'bg-emerald-500 border-emerald-500 shadow-emerald-500/50' : (entry?.result && entry.result < 0 ? 'bg-rose-500 border-rose-500 shadow-rose-500/50' : 'bg-gray-500 border-gray-500')"
                    ></div>
                </div>
            </div>

            <!-- THE DATA CARDS: Spaced below the track -->
            <div class="flex items-start justify-between gap-8 relative px-4 mt-6">
                <!-- Entry Point Summary -->
                <div class="text-center bg-black/5 dark:bg-white/5 backdrop-blur-xl p-5 rounded-3xl border border-white/5 w-48">
                    <p class="text-[9px] font-premium-sans uppercase tracking-[0.2em] text-[#777] mb-2 font-bold">Execution Point</p>
                    <p class="text-2xl font-premium-serif tabular-nums text-[#050505] dark:text-white font-bold leading-tight tracking-tight">{{ entry?.entry }}</p>
                    <div class="flex items-center justify-center gap-2 mt-3 opacity-60">
                        <span class="text-[10px] font-premium-sans tabular-nums text-[#666] dark:text-[#aaa]">{{ entry?.size }} Lots</span>
                        <span class="w-1 h-1 rounded-full bg-[#aaa]"></span>
                        <span class="text-[10px] font-premium-sans tabular-nums text-[#666] dark:text-[#aaa]">Entry</span>
                    </div>
                </div>

                <!-- Result Cluster (Floating Center Highlight) -->
                <div class="flex flex-col items-center justify-center py-6 px-10 rounded-full border border-black/5 dark:border-white/5 bg-gradient-to-b from-white/5 to-white/0 shadow-inner">
                    <span 
                        class="text-6xl font-premium-serif font-black tracking-tighter"
                        :class="entry?.result && entry.result >= 0 ? 'text-emerald-500' : (entry?.result && entry.result < 0 ? 'text-rose-500' : 'text-gray-500')"
                    >
                        {{ entry?.result && entry.result > 0 ? '+' : '' }}{{ entry?.result || 0 }}<span class="text-2xl opacity-60 ml-0.5">%</span>
                    </span>
                    <span class="text-[9px] font-premium-sans uppercase tracking-[0.4em] font-bold text-[#777] mt-3">Net Return</span>
                </div>

                <!-- Exit Summary Card -->
                <div class="text-center bg-black/5 dark:bg-white/5 backdrop-blur-xl p-5 rounded-3xl border border-white/5 w-48">
                    <p class="text-[9px] font-premium-sans uppercase tracking-[0.2em] text-[#777] mb-2 font-bold">Exit Summary</p>
                    <p class="text-2xl font-premium-serif tabular-nums text-[#050505] dark:text-white font-bold leading-tight tracking-tight">{{ entry?.exit }}</p>
                    <div class="flex items-center justify-center gap-2 mt-3 opacity-60">
                        <span class="text-[10px] font-premium-sans tabular-nums text-[#666] dark:text-[#aaa]">{{ formatTradeDate(entry?.dateExit) }}</span>
                        <span class="w-1 h-1 rounded-full bg-[#aaa]"></span>
                        <span class="text-[10px] font-premium-sans tabular-nums text-[#666] dark:text-[#aaa]">Exit</span>
                    </div>
                </div>
            </div>

            <div v-if="entry?.stopLoss" class="absolute bottom-0 left-1/2 -translate-x-1/2 text-center opacity-40 hover:opacity-100 transition-opacity duration-300 pt-6">
                <div class="h-6 w-[1px] bg-gradient-to-t from-rose-500/50 to-rose-500/0 mx-auto mb-1"></div>
                <span class="text-xl font-premium-serif tabular-nums text-rose-600 dark:text-rose-400 font-bold tracking-tighter">{{ entry.stopLoss }}</span>
                <span class="text-[9px] font-premium-sans uppercase tracking-[0.3em] font-bold text-rose-500 mt-1 block leading-none">Security Threshold</span>
            </div>
        </section>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div class="p-6 rounded-[2rem] bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-white/5 flex flex-col items-center text-center">
                 <span class="text-[9px] font-premium-sans uppercase tracking-[0.3em] font-bold text-[#777] mb-3">Efficiency</span>
                 <p class="text-2xl font-premium-serif tabular-nums text-[#050505] dark:text-white font-bold">1:{{ entry?.riskReward?.toFixed(2) || '1.00' }}</p>
                 <span class="text-[10px] font-premium-sans text-[#888] mt-1 italic">Reward to Risk Ratio</span>
            </div>
            <div class="p-6 rounded-[2rem] bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-white/5 flex flex-col items-center text-center">
                 <span class="text-[9px] font-premium-sans uppercase tracking-[0.3em] font-bold text-[#777] mb-3">Currency P/L</span>
                 <p class="text-2xl font-premium-serif tabular-nums text-[#050505] dark:text-white font-bold" :class="(entry?.profitInCurrency ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                    {{ (entry?.profitInCurrency ?? 0) >= 0 ? '+' : '-' }}{{ Math.abs(entry?.profitInCurrency ?? 0).toFixed(2) }} <span class="text-lg opacity-40">{{ entry?.currency || 'USD' }}</span>
                 </p>
                 <span class="text-[10px] font-premium-sans text-[#888] mt-1 italic">Absolute Value</span>
            </div>
            <div class="p-6 rounded-[2rem] bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-white/5 flex flex-col items-center text-center">
                 <span class="text-[9px] font-premium-sans uppercase tracking-[0.3em] font-bold text-[#777] mb-3">Archive Type</span>
                 <p class="text-2xl font-premium-serif text-[#050505] dark:text-white font-bold uppercase tracking-[0.2em]">{{ entry?.assetType || 'Instrument' }}</p>
                 <span class="text-[10px] font-premium-sans text-[#888] mt-1 italic">Market Classification</span>
            </div>
        </div>

        <!-- Narrative Section: Refined Cohesive Card -->
        <div class="mb-12">
            <div class="bg-black/5 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 relative overflow-hidden group">
                 <!-- Top Label Bar -->
                 <div class="px-8 pt-8 pb-4 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-1.5 h-1.5 rounded-full bg-black/20 dark:bg-white/20"></div>
                        <h3 class="text-[10px] font-premium-sans uppercase tracking-[0.4em] font-bold text-[#777]">Strategic Reflection</h3>
                    </div>
                    
                    <button 
                        v-if="canEdit && !isEditing"
                        @click="toggleEdit"
                        class="text-[9px] font-premium-sans uppercase tracking-[0.2em] font-bold text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors flex items-center gap-2"
                    >
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit Narrative
                    </button>

                    <div v-if="isEditing" class="flex items-center gap-4">
                        <button 
                            @click="isEditing = false"
                            class="text-[9px] font-premium-sans uppercase tracking-[0.2em] font-bold text-rose-500/60 hover:text-rose-500 transition-colors"
                        >
                            Abandon Changes
                        </button>
                        <button 
                            @click="handleSave"
                            class="px-4 py-1.5 rounded-full nier-bg-inverted nier-text-primary text-[9px] font-premium-sans uppercase tracking-[0.2em] font-bold shadow-lg transition-transform active:scale-95"
                        >
                            Commit Reflection
                        </button>
                    </div>
                 </div>
                 
                 <!-- Notes Content / Edit Mode -->
                 <div class="px-8 pb-10">
                    <textarea 
                        v-if="isEditing"
                        v-model="editedNotes"
                        class="w-full h-48 bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-[#050505] dark:text-white leading-[1.8] font-premium-serif text-xl tracking-tight text-left resize-none custom-scrollbar"
                        placeholder="Detail your strategic logic and emotional state during this execution..."
                        spellcheck="false"
                    ></textarea>
                    <div 
                        v-else
                        class="text-[#050505] dark:text-white/90 leading-[1.8] font-premium-serif text-xl tracking-tight text-left relative z-1 opacity-80 group-hover:opacity-100 transition-opacity duration-500 
                            [&_h1]:text-3xl [&_h1]:font-premium-serif [&_h1]:mb-6
                            [&_h2]:text-2xl [&_h2]:font-premium-serif [&_h2]:mb-4
                            [&_p]:mb-4
                            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-6
                            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-6
                            [&_blockquote]:border-l-4 [&_blockquote]:border-black/20 dark:[&_blockquote]:border-white/20 [&_blockquote]:pl-6 [&_blockquote]:py-1 [&_blockquote]:italic [&_blockquote]:text-[#666] dark:[&_blockquote]:text-[#aaa] [&_blockquote]:font-serif
                            [&_img]:rounded-3xl [&_img]:shadow-2xl [&_img]:mt-6 [&_img]:mb-10 [&_img]:max-w-full [&_img]:border [&_img]:border-black/5 dark:[&_img]:border-white/10
                            [&_font]:leading-tight
                        "
                        v-html="entry?.notes || 'No strategic reflections recorded for this execution session.'"
                    ></div>
                 </div>

                 <!-- Subtle Glass Accent -->
                 <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent blur-3xl pointer-events-none transition-transform duration-700 group-hover:scale-150"></div>
            </div>
        </div>

        <!-- System & Forum Linkages -->
        <section v-if="entry?.forumCategory?.section || (entry?.linkedThreads && entry.linkedThreads.length > 0)" class="mb-12">
            <div class="flex items-center gap-4 mb-8">
                <h3 class="text-[11px] uppercase tracking-[0.4em] font-bold text-[#777]">Institutional Context</h3>
                <div class="flex-1 h-[1px] bg-black/5 dark:bg-white/5"></div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Thread Cards -->
                <div v-if="entry.linkedThreads && entry.linkedThreads.length > 0" class="lg:col-span-2 space-y-3">
                    <NuxtLink 
                        v-for="thread in fetchedLinkedThreads" 
                        :key="thread.id"
                        :to="'/forum/thread/' + thread.id"
                        @click="close"
                        class="block p-5 rounded-3xl bg-black/5 dark:bg-white/5 border border-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-300 group overflow-hidden relative"
                    >
                         <div class="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all duration-500">
                             <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                         </div>
                         <div class="flex flex-col relative z-1">
                             <span class="text-[9px] uppercase tracking-widest text-[#888] mb-2 font-bold">{{ thread.category || 'General' }}</span>
                             <h4 class="text-base font-serif text-[#050505] dark:text-white group-hover:translate-x-2 transition-transform duration-500">{{ thread.title }}</h4>
                             <p class="text-xs text-[#666] dark:text-[#888] mt-2 line-clamp-1 group-hover:translate-x-2 transition-transform duration-500 delay-75">{{ thread.description }}</p>
                         </div>
                    </NuxtLink>
                </div>
                
                <!-- Strategy Metadata -->
                <div class="p-6 rounded-[2.5rem] bg-[#050505] dark:bg-white nier-text-primary flex flex-col justify-between overflow-hidden relative">
                    <div class="absolute -bottom-8 -right-8 opacity-10">
                         <svg class="w-32 h-32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    </div>
                    <div>
                        <span class="text-[9px] uppercase tracking-[0.4em] font-bold opacity-40 mb-4 block">Knowledge Domain</span>
                        <p class="text-xl font-serif font-bold leading-tight">
                            {{ entry.forumCategory?.section ? getCategoryName(entry.forumCategory.section, entry.forumCategory.category) : 'Unclassified Practice' }}
                        </p>
                    </div>
                    <div class="mt-8">
                         <div class="w-full h-[1px] bg-white/20 dark:bg-black/20 mb-4"></div>
                         <p class="text-[9px] uppercase tracking-widest opacity-60">Verified Execution</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Visual Archive Section -->
        <section class="mb-16">
            <div class="flex items-center justify-between mb-8">
                <div class="flex items-center gap-4">
                    <h3 class="text-[11px] uppercase tracking-[0.4em] font-bold text-[#777]">Strategic Path Gallery</h3>
                    <div class="w-2 h-2 rounded-full bg-black/10 dark:bg-white/10 hidden md:block"></div>
                </div>
                
                <button 
                  v-if="canEdit" 
                  @click="toggleEdit"
                  class="px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all"
                  :class="isEditing ? 'bg-rose-500/10 text-rose-500' : 'bg-black/5 dark:bg-white/5 text-[#777] hover:bg-black/10 hover:dark:bg-white/10'"
                >
                  {{ isEditing ? 'Discard Changes' : 'Modify Record' }}
                </button>
            </div>

            <!-- EDIT MODE: ENLARGED MEDIA GALLERY -->
            <div v-if="isEditing" class="animate-modal-in">
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <!-- Action Cards -->
                    <div @click="triggerFileUpload" class="group relative rounded-3xl bg-black/5 dark:bg-white/5 border-2 border-dashed nier-border-primary p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-500 min-h-[160px]">
                         <div class="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                             <svg v-if="isUploadingImage" class="animate-spin h-5 w-5 text-[#777]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                             </svg>
                             <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[#777]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                             </svg>
                         </div>
                         <span class="text-[9px] uppercase font-bold tracking-[0.3em] text-[#777]">Import Device</span>
                    </div>

                    <div @click="isUrlPromptOpen = !isUrlPromptOpen" class="group relative rounded-3xl bg-black/5 dark:bg-white/5 border-2 border-dashed nier-border-primary p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-500 min-h-[160px]">
                         <div class="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                             <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[#777]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                             </svg>
                         </div>
                         <span class="text-[9px] uppercase font-bold tracking-[0.3em] text-[#777]">External Link</span>
                    </div>
                </div>

                <!-- Hidden Input -->
                <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*" class="hidden">

                <!-- URL Prompt -->
                <div v-if="isUrlPromptOpen" class="mb-8 p-4 bg-black/5 dark:bg-white/5 rounded-3xl border border-white/5">
                    <div class="flex gap-2">
                         <input v-model="urlInput" type="text" placeholder="https://..." class="flex-1 bg-white dark:bg-[#181818] border nier-border-primary rounded-xl px-4 py-2 text-xs text-[#050505] dark:text-white focus:outline-none" @keyup.enter="addByLink" />
                         <button @click="addByLink" class="px-4 py-2 nier-bg-inverted nier-text-primary rounded-xl text-[9px] uppercase font-bold tracking-widest hover:opacity-80 transition">Attach</button>
                    </div>
                </div>

                <!-- Editable Image Cards -->
                <div class="space-y-6">
                    <div 
                        v-for="(img, idx) in localImages" 
                        :key="idx" 
                        class="group flex flex-col lg:flex-row gap-6 p-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 transition-all duration-500 shadow-sm"
                    >
                        <div class="w-full lg:w-64 h-40 bg-black/10 dark:bg-white/10 relative overflow-hidden flex-shrink-0 group-hover:shadow-lg transition-all duration-700">
                            <img :src="img.url" class="absolute inset-0 w-full h-full object-cover transition-transform duration-1000" />
                            <button @click="removeImage(idx)" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" stroke-width="2.5"/></svg>
                            </button>
                        </div>
                        <div class="flex-1 flex flex-col py-2">
                            <span class="text-[9px] uppercase tracking-[0.3em] font-bold text-[#777] mb-3 ml-1 block">Context Narrative</span>
                            <textarea 
                                v-model="img.context"
                                placeholder="Detail the confluence..."
                                class="flex-1 bg-transparent border-none text-sm font-premium-serif text-[#050505] dark:text-white leading-relaxed placeholder:text-black/10 dark:placeholder:text-white/10 focus:ring-0 focus:outline-none p-0 resize-none min-h-[60px]"
                            ></textarea>
                        </div>
                    </div>
                </div>

                <!-- SAVE BUTTON -->
                <div class="mt-12 flex justify-center">
                    <button 
                        @click="handleSave"
                        class="px-10 py-4 bg-emerald-500 text-white rounded-full text-[11px] font-bold uppercase tracking-[0.4em] hover:shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all transform active:scale-95 flex items-center gap-3"
                    >
                        Commit Record Update
                    </button>
                </div>
            </div>

            <!-- VIEW MODE -->
            <div v-else-if="entry?.images && entry.images.length > 0" class="space-y-16">
                <div v-for="(img, index) in entry.images" :key="index" class="relative inline-block w-full">
                    <div class="overflow-hidden bg-black/5 dark:bg-white/5 border border-white/5 shadow-2xl group transition-all duration-700 hover:shadow-black/20 dark:hover:shadow-white/5 flex justify-center">
                        <img 
                            :src="img.url" 
                            class="w-auto h-auto max-w-full object-contain transition-all duration-1000" 
                            alt="Archive Screenshot" 
                        />
                    </div>
                    
                    <!-- Narrative Overlay/Bottom -->
                    <div v-if="img.context" class="mt-6 px-10 border-l-2 nier-border-primary py-2">
                        <p class="text-[#050505] dark:text-white/80 italic text-lg leading-relaxed font-serif tracking-wide">
                            {{ img.context }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Empty State for Visuals -->
            <div v-else-if="!isEditing" class="text-center py-20 bg-black/5 dark:bg-white/5 rounded-[3rem] border border-dashed nier-border-primary">
                <div class="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 opacity-30">
                     <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
                <p class="text-xs uppercase tracking-[0.3em] font-bold text-[#777]">No visual context attached</p>
            </div>
        </section>
      </div>

      <!-- ═══════════════════ TACTICAL HALO PANELS (SIDEBARS) ═══════════════════ -->
      <div v-if="(entry?.boardConditions?.length) || entry?.boardScenarioEntry || entry?.boardScenarioExit || entry?.boardScenarioEntryId || entry?.boardScenarioExitId" class="hidden xl:block">
        
        <!-- Left Halo: Conditions -->
        <div class="absolute top-10 -left-80 w-72 h-[calc(100%-5rem)] pointer-events-none">
          <div class="h-full pointer-events-auto flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-4">
             <template v-for="item in (entry?.boardConditions || [])" :key="typeof item === 'object' ? item.id : item">
                <div v-if="boardStore.findNote(typeof item === 'object' ? item.id : item) || (typeof item === 'object')" class="group p-6 rounded-[2.5rem] bg-emerald-500/[0.03] border border-emerald-500/15 backdrop-blur-3xl relative overflow-hidden transition-all duration-700 hover:bg-emerald-500/[0.08] hover:-translate-y-2 shadow-2xl">
                    <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                    <header class="flex items-center gap-3 mb-4">
                        <div class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <span class="text-[9px] uppercase tracking-[0.3em] font-black text-emerald-500/60">
                          {{ typeof item === 'object' ? item.info.name : (boardStore.findNote(item)?.conditionsName || 'Protocol') }}
                        </span>
                    </header>
                    <ul v-if="boardStore.findNote(typeof item === 'object' ? item.id : item)" class="space-y-4">
                        <li v-for="(subItem, idx) in boardStore.findNote(typeof item === 'object' ? item.id : item)?.conditionsData" :key="idx" class="flex flex-col gap-1">
                            <span class="text-xs text-[#050505] dark:text-white font-serif leading-tight opacity-70">{{ subItem.text }}</span>
                            <div v-if="subItem.imageData" class="mt-3 w-full aspect-video rounded-2xl border border-white/10 overflow-hidden bg-black/40 shadow-inner">
                                <img :src="subItem.imageData" class="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
                            </div>
                        </li>
                    </ul>
                    <div v-else-if="typeof item === 'object'" class="text-xs text-[#050505] dark:text-white font-serif leading-tight opacity-70">
                        {{ item.info.description }}
                    </div>
                </div>
            </template>
          </div>
        </div>

        <!-- Right Halo: Scenarios -->
        <div class="absolute top-10 -right-80 w-72 h-[calc(100%-5rem)] pointer-events-none">
          <div class="h-full pointer-events-auto flex flex-col gap-6 overflow-y-auto custom-scrollbar pl-1">
            
            <!-- Entry Scenario -->
            <div v-if="(entry?.boardScenarioEntry || entry?.boardScenarioEntryId) && (boardStore.findNote(entry.boardScenarioEntry?.id || entry.boardScenarioEntryId || '') || entry.boardScenarioEntry)" class="group p-8 rounded-[3rem] bg-indigo-500/[0.03] border border-indigo-500/15 backdrop-blur-3xl relative overflow-hidden transition-all duration-700 hover:bg-indigo-500/[0.08] hover:-translate-y-2 shadow-2xl">
                <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-500/5 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                <span class="text-[9px] uppercase tracking-[0.4em] font-black text-indigo-500/60 mb-4 block">Trigger Archive</span>
                <h4 class="text-xl font-serif text-[#050505] dark:text-white leading-tight mb-4">
                    <span class="opacity-30 mr-1">{{ boardStore.findNote(entry.boardScenarioEntry?.id || entry.boardScenarioEntryId || '')?.scenarioData?.letter || 'S' }}</span>
                    {{ entry.boardScenarioEntry?.info?.name || boardStore.findNote(entry.boardScenarioEntryId || '')?.scenarioData?.name || 'Trigger Protocol' }}
                </h4>
                <p class="text-sm font-premium-serif italic text-[#777] leading-relaxed">
                  {{ boardStore.findNote(entry.boardScenarioEntry?.id || entry.boardScenarioEntryId || '')?.scenarioData?.if || entry.boardScenarioEntry?.info?.description }}
                </p>
            </div>

            <!-- Exit Scenario -->
            <div v-if="(entry?.boardScenarioExit || entry?.boardScenarioExitId) && (boardStore.findNote(entry.boardScenarioExit?.id || entry.boardScenarioExitId || '') || entry.boardScenarioExit)" class="group p-8 rounded-[3rem] bg-rose-500/[0.03] border border-rose-500/15 backdrop-blur-3xl relative overflow-hidden transition-all duration-700 hover:bg-rose-500/[0.08] hover:-translate-y-2 shadow-2xl">
                <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-rose-500/5 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                <span class="text-[9px] uppercase tracking-[0.4em] font-black text-rose-500/60 mb-4 block">Closure Archive</span>
                <h4 class="text-xl font-serif text-[#050505] dark:text-white leading-tight mb-4">
                    <span class="opacity-30 mr-1">{{ boardStore.findNote(entry.boardScenarioExit?.id || entry.boardScenarioExitId || '')?.scenarioData?.letter || 'E' }}</span>
                    {{ entry.boardScenarioExit?.info?.name || boardStore.findNote(entry.boardScenarioExitId || '')?.scenarioData?.name || 'Closure Protocol' }}
                </h4>
                <p class="text-sm font-premium-serif italic text-[#777] leading-relaxed">
                  {{ boardStore.findNote(entry.boardScenarioExit?.id || entry.boardScenarioExitId || '')?.scenarioData?.then || entry.boardScenarioExit?.info?.description }}
                </p>
            </div>

          </div>
        </div>

      </div>

      <!-- Sophisticated Footer -->
      <footer class="px-10 py-8 border-t border-black/5 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] backdrop-blur-md flex justify-end flex-shrink-0">
        <button 
          @click="close"
          class="px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.3em] text-white nier-bg-inverted dark:text-black rounded-full hover:shadow-[0_10px_30px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_10px_30px_rgba(255,255,255,0.1)] transition-all transform active:scale-95"
        >
          Archive Detail Dismissed
        </button>
      </footer>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { DiaryEntry } from '@/entities/diary/model/diary.types';
import { useForumStore } from '~/features/store/useForum';
import { useRoute } from 'vue-router';
import { useAuthStore } from '~/entities/user/auth.store';
import { updateDiaryNote, updateDiaryVisuals } from '@/widgets/diary/model/useDiary';
import { useForumCategoryStore } from '~/features/store/useForumCategory';
import type { Thread } from '~/entities/thread/model/thread.types';
import imageCompression from 'browser-image-compression';
import { useBoardStore } from '@/features/store/useBoard';

const boardStore = useBoardStore();

const props = defineProps<{
  isOpen: boolean;
  entry: DiaryEntry | null;
}>();

const emit = defineEmits(['close', 'selectTrade']);

const forum = useForumStore();
const auth = useAuthStore();
const route = useRoute();
const forumCategory = useForumCategoryStore();
const categories = forumCategory.categories;
const fetchedLinkedThreads = ref<Thread[]>([]);

const isEditing = ref(false);
const editedNotes = ref('');
const localImages = ref<{url: string, context: string}[]>([]);
const isUploadingImage = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const isUrlPromptOpen = ref(false);
const urlInput = ref('');

const canEdit = computed(() => {
    return auth.user?.uid === route.query.uid;
});

watch(() => props.isOpen, (newVal) => {
    if (newVal) {
        document.body.style.overflow = 'hidden';
        if (props.entry) {
            editedNotes.value = props.entry.notes || '';
            isEditing.value = false;
        }
    } else {
        document.body.style.overflow = '';
    }
});

const fileToBase64 = (file: Blob | File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
    });
};

const triggerFileUpload = () => {
    fileInput.value?.click();
};

const handleFileUpload = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
        isUploadingImage.value = true;
        const options = { maxSizeMB: 0.7, maxWidthOrHeight: 1600, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);
        const base64 = await fileToBase64(compressedFile);
        
        localImages.value.push({ url: base64, context: '' });
    } catch (error) {
        console.error('Local image processing failed:', error);
    } finally {
        isUploadingImage.value = false;
        if (event.target) (event.target as HTMLInputElement).value = '';
    }
};

const addByLink = () => {
    if (!urlInput.value) return;
    localImages.value.push({ url: urlInput.value, context: '' });
    urlInput.value = '';
    isUrlPromptOpen.value = false;
};

const removeImage = (idx: number) => {
    localImages.value.splice(idx, 1);
};

const toggleEdit = () => {
    if (!canEdit.value) return;
    isEditing.value = !isEditing.value;
    if (isEditing.value && props.entry) {
        editedNotes.value = props.entry.notes || '';
        localImages.value = JSON.parse(JSON.stringify(props.entry.images || []));
    }
};

const handleSave = async () => {
    if (!props.entry || !canEdit.value) return;
    
    await updateDiaryVisuals(
        props.entry, 
        editedNotes.value, 
        localImages.value,
        auth.user?.uid as string, 
        route.query.uid as string
    );
    
    isEditing.value = false;
};

const statusInfo = computed(() => {
    if (!props.entry) return { label: 'Analyzing Data', color: 'text-gray-400' };
    const { entry, exit, stopLoss, takeProfit, result } = props.entry;
    
    if (result === undefined) return { label: 'Ongoing Position', color: 'text-amber-500 bg-amber-500/10' };

    // Detection logic for SL/TP with small tolerance
    const epsilon = 0.0005; 
    const isSLHit = stopLoss ? (Math.abs(exit! - stopLoss) / stopLoss < epsilon) : false;
    const isTPHit = takeProfit ? (Math.abs(exit! - takeProfit) / takeProfit < epsilon) : false;

    if (isTPHit) return { label: 'Target Realization Reached', color: 'text-emerald-500 bg-emerald-500/10' };
    if (isSLHit) return { label: 'Risk Mitigation Triggered', color: 'text-rose-500 bg-rose-500/10' };
    
    if (result > 0) return { label: 'Strategic Success Path', color: 'text-emerald-500 bg-emerald-500/10' };
    if (result < 0) return { label: 'Capital Loss Deviation', color: 'text-rose-500 bg-rose-500/10' };
    
    return { label: 'Neutral Strategic Exit', color: 'text-gray-400 bg-gray-500/10' };
});

watch(() => [props.isOpen, props.entry], async ([open, entry]) => {
    if (open && props.entry?.linkedThreads?.length) {
        const promises = props.entry.linkedThreads.map(id => forum.fetchThread(id));
        const results = await Promise.all(promises);
        fetchedLinkedThreads.value = results.filter(Boolean) as Thread[];
    } else {
        fetchedLinkedThreads.value = [];
    }
}, { immediate: true });

function formatTradeDate(date: any) {
    if (!date) return '—';
    try {
        const d = (date && typeof date === 'object' && 'seconds' in date) 
            ? new Date(date.seconds * 1000) 
            : new Date(date);
        
        if (isNaN(d.getTime())) return '—';
        
        return d.toLocaleDateString('en-US', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } catch (e) {
        return '—';
    }
}

function getCategoryName(sectionId: string, categoryId: string) {
    if (!sectionId || !categoryId) return 'Unclassified Strategy';
    const catList = categories[sectionId];
    if (!catList) return categoryId;
    const cat = catList.find(c => c.id === categoryId);
    return cat ? cat.name : categoryId;
}

const close = () => {
  emit('close');
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(155, 155, 155, 0.2);
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.05);
}

.font-premium-serif {
    font-family: 'Cormorant Garamond', serif;
}
.font-premium-sans {
    font-family: 'Outfit', sans-serif;
}
.tabular-nums {
    font-variant-numeric: tabular-nums;
}

@keyframes path-flow {
    from { stroke-dashoffset: 0; }
    to { stroke-dashoffset: -1000; }
}
.animate-path-flow {
    animation: path-flow 20s linear infinite;
}
@keyframes pulse-slow {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.8; }
}
.modal-backdrop-blur {
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
}
@keyframes modal-in {
    from { opacity: 0; transform: scale(0.9) translateY(20px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
}
.animate-modal-in {
    animation: modal-in 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
