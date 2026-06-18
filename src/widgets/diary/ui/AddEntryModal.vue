<template>
  <Teleport to="body">
  <div v-if="isAddModalOpen" class="fixed inset-0 flex items-center justify-center z-[1000] p-4 md:p-8">
  
    <!-- Permanent Focus Backdrop -->
    <div 
      class="absolute inset-0 bg-[#000000]/90 transition-opacity duration-1000"
      @click="isAddModalOpen = false"
      style="backdrop-filter: blur(60px) saturate(150%);"
    ></div>

    <!-- The Vault: Luxurious Entry Modal Wrapper -->
    <div class="relative w-full max-w-6xl flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-700 pointer-events-auto h-full max-h-[95vh]">
      
      <!-- Top Fixed Panel (Emotions) -->
      <div class="fixed top-8 left-1/2 -translate-x-1/2 flex bg-black/70 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-3 gap-3 shadow-2xl z-[1050]">
        <div class="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.4em] font-bold text-white/30 whitespace-nowrap">Emotions Engine</div>
        <div 
          v-for="emo in emotions" 
          :key="emo.id"
          @click="(toggleTopEmotion(emo.id), togglePhaseItem(emo.id, 'emotion'))"
          @mouseenter="hoveredEmotion = emo"
          @mouseleave="hoveredEmotion = null"
          class="w-12 h-12 rounded-2xl border transition-all duration-500 flex items-center justify-center cursor-pointer shadow-inner group relative"
          :class="(newEntry.emotions || []).includes(emo.id) 
            ? 'bg-gradient-to-br from-white/20 to-white/5 border-white/40 scale-110 shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
            : 'bg-gradient-to-br from-white/10 to-transparent border-white/10 hover:border-white/30 hover:scale-105'"
        >
          <div class="w-7 h-7 transition-all duration-500 group-hover:scale-110" :class="(newEntry.emotions || []).includes(emo.id) ? 'text-white opacity-100' : 'text-white/40'">
            <TacticalIcon :name="emo.id" />
          </div>
        </div>

        <CursorTooltip 
          :visible="!!hoveredEmotion"
          :title="hoveredEmotion?.label"
          :content="hoveredEmotion?.desc"
          :subtext="hoveredEmotion?.state"
        />
      </div>

      <div class="flex fixed left-4 lg:left-8 top-1/2 -translate-y-1/2 bg-black/70 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-3 flex-col gap-3 shadow-2xl z-[1050] max-h-[60vh] overflow-y-auto custom-scrollbar min-w-[64px]">
        <div class="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.4em] font-bold text-white/30 whitespace-nowrap">Conditions</div>
        
        <!-- Strategy Warning -->
        <div v-if="!selectedStrategyId" class="flex-1 flex flex-col items-center justify-center py-12 px-2 text-center">
            <div class="w-1 h-8 bg-rose-500/20 rounded-full mb-4 animate-pulse"></div>
            <span class="text-[7px] uppercase tracking-[0.3em] font-black text-rose-500/40 leading-relaxed">Select Strategy<br/>To Load Nodes</span>
        </div>

        <div v-else-if="flatConditions.length === 0" class="text-[8px] uppercase tracking-[0.3em] font-black text-white/10 text-center py-8 px-2">EMPTY</div>
        
        <div 
          v-v-else
          v-for="cond in flatConditions" :key="cond.id"
          @click="togglePhaseItem(cond.id, 'condition') || toggleCondition(cond.id)"
          @mouseenter="hoveredCondition = cond"
          @mouseleave="hoveredCondition = null"
          class="w-12 h-12 rounded-2xl border transition-all duration-500 flex items-center justify-center cursor-pointer shadow-inner relative group"
          :class="isConditionActive(cond.id) ? 'bg-white border-white' : 'bg-gradient-to-br from-white/10 to-transparent border-white/5 hover:border-white/20'"
        >
          <span class="text-[10px] font-bold" :class="isConditionActive(cond.id) ? 'text-black' : 'text-white/40'">{{ cond.text.substring(0, 2) || 'CX' }}</span>
        </div>

        <CursorTooltip 
          :visible="!!hoveredCondition"
          :title="hoveredCondition?.text"
          :content="hoveredCondition?.parentNodeName"
          category="REGISTRY_NODE"
          subtext="LVL_02_SECURED"
        />
      </div>
        <form 
          @submit.prevent="saveEntry"
          class="relative w-full bg-black dark:bg-black border border-white/10 rounded-[2.5rem] shadow-[0_64px_128px_-12px_rgba(0,0,0,0.8)] overflow-hidden custom-scrollbar max-h-[80vh] overflow-y-auto flex flex-col lg:flex-row shrink-1"
        >
        <!-- LEFT COLUMN: Main Entry Form -->
      <div class="flex-1 overflow-y-auto custom-scrollbar border-r border-white/5">
        <!-- Header: Minimalist Authority -->
        <div class="px-10 pt-12 pb-6 flex justify-between items-end">
          <div>
            <span class="text-[10px] uppercase tracking-[0.4em] font-bold text-emerald-500/60 block mb-2">New Portfolio Archive</span>
            <h2 class="text-4xl font-serif text-white tracking-tight">Record Position</h2>
          </div>
          <button 
            @click="isAddModalOpen = false"
            type="button"
            class="lg:hidden w-12 h-12 rounded-full border border-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all duration-300"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

      <div class="px-10 pb-12 space-y-12">
        
        <!-- SECTION 1: IDENTITY & STRATEGY -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div class="lg:col-span-7 space-y-8">
            <div class="space-y-3">
              <label class="block text-[9px] uppercase tracking-[0.3em] font-bold text-white/30 ml-1">Market Instrument</label>
              <AssetPicker 
                v-model="newEntry.asset"
                v-model:assetType="newEntry.assetType"
                @select="(a: any) => newEntry.assetIcon = a.icon"
                class="lux-picker"
              />
            </div>
            
            <div class="grid grid-cols-2 gap-6">
              <div class="space-y-3">
                <label class="block text-[9px] uppercase tracking-[0.3em] font-bold text-white/30 ml-1">Direction</label>
                <DirectionToggle v-model="newEntry.side" />
              </div>
              <div class="space-y-3">
                <label class="block text-[9px] uppercase tracking-[0.3em] font-bold text-white/30 ml-1">Exposure (Lots)</label>
                <div class="flex items-center bg-white/[0.03] border border-white/5 rounded-2xl px-2 h-[54px] group focus-within:border-white/20 transition">
                    <button type="button" @click="newEntry.size = Number(Math.max(0, Number(newEntry.size || 0) - 0.01).toFixed(2))" class="w-10 h-10 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition font-light text-2xl">−</button>
                    <input 
                      type="number" required="true" v-model="newEntry.size" step="0.01" min="0"
                      class="flex-1 bg-transparent border-none text-center focus:ring-0 text-sm text-white font-bold hide-spinners"
                    />
                    <button type="button" @click="newEntry.size = Number((Number(newEntry.size || 0) + 0.01).toFixed(2))" class="w-10 h-10 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition font-light text-2xl">+</button>
                </div>
              </div>
            </div>
          </div>

          <!-- POSITION VALUE CARD -->
          <div class="lg:col-span-5">
            <div class="h-full p-8 rounded-[2rem] bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 flex flex-col justify-between">
              <div>
                <div class="flex justify-between items-center mb-6">
                  <span class="text-[9px] uppercase tracking-[0.3em] font-bold text-white/40">Notional Value</span>
                  <div class="w-24">
                    <CustomSelect v-model="newEntry.currency" :options="currencyOptions" />
                  </div>
                </div>
                <div class="text-3xl font-serif text-white tabular-nums tracking-tight">
                  <span class="text-white/20 mr-1">{{ currencySymbol }}</span>
                  <template v-if="calculatedSizeInCurrency > 0">
                    {{ newEntry.currency === 'JPY' ? calculatedSizeInCurrency.toLocaleString('en-US', { maximumFractionDigits: 0 }) : calculatedSizeInCurrency.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  </template>
                  <span v-else class="text-white/10 italic text-xl">Pending metrics...</span>
                </div>
              </div>
              <div class="flex flex-col gap-1">
                <p class="text-[10px] text-white/20 font-serif leading-relaxed">Calculated based on instrument contract size and current entry parameters.</p>
                <div v-if="isFetchingRate" class="flex items-center gap-2">
                    <div class="w-1.5 h-1.5 rounded-full bg-emerald-500/40 animate-ping"></div>
                    <span class="text-[8px] uppercase tracking-widest font-bold text-emerald-500/40">Vault Syncing Rates...</span>
                </div>
                <div v-else-if="currentExchangeRate !== 1" class="flex items-center gap-2">
                    <div class="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    <span class="text-[8px] uppercase tracking-widest font-bold text-emerald-500/40">Vault Rate: 1.00 {{ getAssetBaseCurrency(newEntry.asset || '', newEntry.assetType || 'Stocks') }} = {{ currentExchangeRate.toFixed(4) }} {{ newEntry.currency }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 2: THE TECHNICAL CLUSTER (Levels) -->
        <div class="space-y-4">
          <div class="flex items-center gap-3 ml-1 mb-6">
            <div class="h-px flex-1 bg-white/[0.05]"></div>
            <span class="text-[9px] uppercase tracking-[0.5em] font-bold text-white/20">Technical Equilibrium</span>
            <div class="h-px flex-1 bg-white/[0.05]"></div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Entry Price -->
            <div class="p-6 rounded-3xl bg-white/[0.02] border border-white/5 group hover:border-white/10 transition duration-500">
               <label class="block text-[9px] uppercase tracking-[0.3em] font-bold text-white/30 mb-4 ml-1">Entry Price</label>
               <div class="flex items-baseline gap-2">
                 <button type="button" @click="newEntry.entry = Number((Number(newEntry.entry || 0) - 0.001).toFixed(5))" class="text-white/20 hover:text-white transition group-hover:scale-125">-</button>
                 <input type="number" required="true" v-model="newEntry.entry" step="any" class="w-full bg-transparent border-none p-0 text-xl font-bold text-white focus:ring-0 hide-spinners" />
                 <button type="button" @click="newEntry.entry = Number((Number(newEntry.entry || 0) + 0.001).toFixed(5))" class="text-white/20 hover:text-white transition group-hover:scale-125">+</button>
               </div>
            </div>
            <!-- Exit Price -->
            <div class="p-6 rounded-3xl bg-white/[0.02] border border-white/5 group hover:border-white/10 transition duration-500">
               <label class="block text-[9px] uppercase tracking-[0.3em] font-bold text-white/30 mb-4 ml-1">Profit Target / Exit</label>
               <div class="flex items-baseline gap-2">
                 <button type="button" @click="newEntry.exit = Number((Number(newEntry.exit || 0) - 0.001).toFixed(5))" class="text-white/20 hover:text-white transition group-hover:scale-125">-</button>
                 <input type="number" required="true" v-model="newEntry.exit" step="any" class="w-full bg-transparent border-none p-0 text-xl font-bold text-white focus:ring-0 hide-spinners" />
                 <button type="button" @click="newEntry.exit = Number((Number(newEntry.exit || 0) + 0.001).toFixed(5))" class="text-white/20 hover:text-white transition group-hover:scale-125">+</button>
               </div>
            </div>
            <!-- Stop Loss -->
            <div class="p-6 rounded-3xl bg-white/[0.02] border border-white/5 group hover:border-white/10 transition duration-500">
               <div class="flex justify-between mb-4">
                 <label class="block text-[9px] uppercase tracking-[0.3em] font-bold text-white/30 ml-1">Risk Ceiling (SL)</label>
                 <span v-if="rrDisplay" :class="rrDisplay.error ? 'text-rose-500' : 'text-emerald-500'" class="text-[9px] font-bold uppercase tracking-widest">{{ rrDisplay.label }}</span>
               </div>
               <div class="flex items-baseline gap-2">
                 <button type="button" @click="newEntry.stopLoss = Number((Number(newEntry.stopLoss || 0) - 0.001).toFixed(5))" class="text-white/20 hover:text-white transition group-hover:scale-125">-</button>
                 <input type="number" required="true" v-model="newEntry.stopLoss" step="any" class="w-full bg-transparent border-none p-0 text-xl font-bold text-white focus:ring-0 hide-spinners" />
                 <button type="button" @click="newEntry.stopLoss = Number((Number(newEntry.stopLoss || 0) + 0.001).toFixed(5))" class="text-white/20 hover:text-white transition group-hover:scale-125">+</button>
               </div>
            </div>
            <!-- Take Profit -->
            <div class="p-6 rounded-3xl bg-white/[0.02] border border-white/5 group hover:border-white/10 transition duration-500">
               <label class="block text-[9px] uppercase tracking-[0.3em] font-bold text-white/30 mb-4 ml-1">Static TP (Optional)</label>
               <div class="flex items-baseline gap-2">
                 <button type="button" @click="newEntry.takeProfit = Number((Number(newEntry.takeProfit || 0) - 0.001).toFixed(5))" class="text-white/20 hover:text-white transition group-hover:scale-125">-</button>
                 <input type="number" required="true" v-model="newEntry.takeProfit" step="any" class="w-full bg-transparent border-none p-0 text-xl font-bold text-white focus:ring-0 hide-spinners" />
                 <button type="button" @click="newEntry.takeProfit = Number((Number(newEntry.takeProfit || 0) + 0.001).toFixed(5))" class="text-white/20 hover:text-white transition group-hover:scale-125">+</button>
               </div>
            </div>
          </div>
        </div>

        <!-- SECTION 3: TIMING ARCHIVE -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 p-10 rounded-[2.5rem] bg-white/[0.01] border border-white/5">
           <div class="space-y-4">
              <label class="block text-[9px] uppercase tracking-[0.3em] font-bold text-white/20 ml-2">Execution Timestamp</label>
              <div class="relative group">
                <input type="datetime-local" v-model="dateInput" required="true" class="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-white/20 transition color-scheme-dark" />
                <div class="absolute left-0 bottom-0 h-px w-0 group-hover:w-full bg-white/20 transition-all duration-700"></div>
              </div>
           </div>
           <div class="space-y-4">
              <label class="block text-[9px] uppercase tracking-[0.3em] font-bold text-white/20 ml-2">Closure Timestamp</label>
              <div class="relative group">
                <input type="datetime-local" v-model="dateExitInput" class="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-white/20 transition color-scheme-dark" />
                <div class="absolute left-0 bottom-0 h-px w-0 group-hover:w-full bg-rose-500/20 transition-all duration-700"></div>
              </div>
           </div>
        </div>

        <!-- SECTION 4: OUTCOME PREVIEW -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div class="space-y-4">
             <div class="flex justify-between items-end px-2">
                <label class="block text-[9px] uppercase tracking-[0.3em] font-bold text-white/30">Portfolio Impact ($)</label>
                <div class="text-[10px] text-white/50 font-bold tracking-widest">
                    <span class="text-white/20 mr-1">T:</span> ${{ totalProfitCurrency.toFixed(2) }}
                </div>
             </div>
             <div class="relative flex items-center bg-white/[0.03] border border-white/5 rounded-2xl px-2 h-[64px] transition group" :class="hasPrices ? 'opacity-30' : ''">
                <button type="button" :disabled="hasPrices" @click="newEntry.profitInCurrency = Number((newEntry.profitInCurrency || 0) - 10)" class="w-12 h-full text-white/20 hover:text-white transition text-3xl font-light disabled:cursor-not-allowed">−</button>
                <input 
                  :required="!hasPrices" :disabled="hasPrices" type="number" v-model="newEntry.profitInCurrency" step="0.01"
                  class="flex-1 bg-transparent border-none text-center focus:ring-0 text-xl font-bold text-white hide-spinners disabled:cursor-not-allowed"
                />
                <button type="button" :disabled="hasPrices" @click="newEntry.profitInCurrency = Number(Number(newEntry.profitInCurrency || 0) + 10)" class="w-12 h-full text-white/20 hover:text-white transition text-3xl font-light disabled:cursor-not-allowed">+</button>
             </div>
          </div>
          <div class="space-y-4">
             <div class="flex justify-between items-end px-2">
                <label class="block text-[9px] uppercase tracking-[0.3em] font-bold text-white/30">Return on Capital</label>
                <div class="text-[10px] text-white/20 font-serif">Equity: ${{ currentEquity.toLocaleString() }}</div>
             </div>
             <div class="h-[64px] flex items-center justify-center bg-white/[0.01] border border-white/5 rounded-2xl px-6">
                <span class="text-3xl font-serif tracking-tight" :class="calculatedResultPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                  {{ calculatedResultPercent > 0 ? '+' : '' }}{{ calculatedResultPercent }}%
                </span>
             </div>
          </div>
        </div>

        <!-- SECTION 5: FORUM & NARRATIVE -->
        <div class="space-y-10">
          <div class="space-y-4">
            <label class="block text-[9px] uppercase tracking-[0.3em] font-bold text-white/30 ml-2">Position Narrative</label>
            <textarea 
              required="true" v-model="newEntry.notes" rows="4"
              placeholder="Archive your psychological state, trade thesis, and technical observations..."
              class="w-full bg-white/[0.02] border border-white/5 rounded-[2rem] px-8 py-6 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-white/20 transition resize-none font-serif leading-relaxed"
            ></textarea>
          </div>

          <!-- Media Suite -->
          <div class="space-y-6">
              <div class="flex items-center gap-4">
                  <span class="text-[9px] uppercase tracking-[0.4em] font-bold text-white/20">Evidence Gallery</span>
                  <div class="h-px flex-1 bg-white/[0.05]"></div>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <button type="button" @click="triggerFileUpload" class="group aspect-video rounded-3xl bg-white/[0.01] border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-3 hover:bg-white/[0.03] hover:border-white/20 transition-all duration-700">
                       <div class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                           <svg v-if="isUploadingImage" class="animate-spin h-5 w-5 text-white/40" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                           <svg v-else class="h-5 w-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                       </div>
                       <span class="text-[9px] uppercase font-bold tracking-widest text-white/20 group-hover:text-white/60 transition">Upload Asset</span>
                  </button>

                  <div 
                      v-for="(img, idx) in newEntry.images" :key="idx" 
                      class="md:col-span-2 group relative overflow-hidden aspect-video rounded-3xl border border-white/10 bg-black"
                  >
                      <img :src="img.url" class="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000" />
                      <div class="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
                          <textarea v-model="img.context" placeholder="Technical context..." class="w-full bg-transparent border-none text-xs text-white/80 placeholder:text-white/20 focus:ring-0 p-0 resize-none h-12 custom-scrollbar"></textarea>
                      </div>
                      <button @click="removeImage(idx)" type="button" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-rose-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" stroke-width="2.5"/></svg>
                      </button>
                  </div>
              </div>
          </div>
        </div>

        <!-- SECTION 6: KNOWLEDGE LINK -->
        <div v-if="newEntry.forumCategory" class="p-10 rounded-[2.5rem] bg-emerald-500/[0.02] border border-emerald-500/5 space-y-8">
            <header>
                <span class="text-[9px] uppercase tracking-[0.4em] font-bold text-emerald-500/40 block mb-2">Knowledge Sync</span>
                <h3 class="text-xl font-serif text-white/80">Link System Knowledge</h3>
            </header>
            
            <div class="flex flex-wrap gap-3">
                <button 
                  v-for="section in mainSections" :key="section.id" 
                  @click.prevent="newEntry.forumCategory!.section = section.id; newEntry.forumCategory!.category = ''"
                  class="px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-500"
                  :class="newEntry.forumCategory.section === section.id ? 'bg-white text-black shadow-xl shadow-white/5' : 'bg-white/5 text-white/40 border border-white/5 hover:border-white/10'"
                >
                  {{ section.name }}
                </button>
            </div>

            <Transition name="fade-refined">
              <div v-if="newEntry.forumCategory.section" class="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                  <button 
                    v-for="cat in categories[newEntry.forumCategory.section]" :key="cat.id" 
                    @click.prevent="newEntry.forumCategory!.category = cat.id"
                    class="px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all"
                    :class="newEntry.forumCategory.category === cat.id ? 'text-white' : 'text-white/20 hover:text-white/40'"
                  >
                    {{ cat.name }}
                  </button>
              </div>
            </Transition>
        </div>

        <!-- FINAL ACTION: THE VAULT SEAL -->
        <div class="pt-10 flex flex-col items-center gap-6">
            <div class="flex items-center gap-4 w-full max-w-md">
                <button 
                  @click="isAddModalOpen = false; resetEntry(); activePhase = null"
                  type="button"
                  class="w-16 h-full py-6 rounded-3xl bg-white/5 border border-white/10 text-white/40 hover:text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/10 transition-all duration-500 flex items-center justify-center group"
                  title="Discard Entry"
                >
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <button 
                  :disabled="forum.loading"
                  type="submit"
                  class="flex-1 py-6 rounded-3xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white font-serif text-xl tracking-tight shadow-[0_32px_64px_-12px_rgba(16,185,129,0.3)] hover:shadow-[0_48px_80px_-12px_rgba(16,185,129,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-700 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-4"
                >
                  <template v-if="!forum.loading">
                    Archive Position
                    <svg class="w-5 h-5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                  </template>
                  <span v-else class="animate-pulse">Archiving...</span>
                </button>
            </div>
            
            <div class="flex items-center gap-12">
               <!-- Keep original link but renamed -->
               <button @click="isAddModalOpen = false" type="button" class="text-[9px] text-white/10 uppercase tracking-[0.5em] font-bold hover:text-white/20 transition">Close Vault</button>
            </div>
        </div>
        </div>
      </div>
    </form>

      <!-- Right Fixed Panel (Scenarios) -->
      <div class="flex fixed right-4 lg:right-8 top-1/2 -translate-y-1/2 bg-black/70 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-3 flex-col gap-3 shadow-2xl z-[1050] max-h-[60vh] overflow-y-auto custom-scrollbar min-w-[64px]">
        <div class="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.4em] font-bold text-white/30 whitespace-nowrap">Scenarios</div>
        
        <!-- Strategy Warning -->
        <div v-if="!selectedStrategyId" class="flex-1 flex flex-col items-center justify-center py-12 px-2 text-center">
            <div class="w-1 h-8 bg-white/10 rounded-full mb-4"></div>
            <span class="text-[7px] uppercase tracking-[0.3em] font-black text-white/20 leading-relaxed">No Strategy<br/>Detected</span>
        </div>

        <div v-else-if="entryScenarios.length === 0 && exitScenarios.length === 0" class="text-[8px] uppercase tracking-[0.3em] font-black text-white/10 text-center py-8 px-2">EMPTY</div>
        
        <template v-else>
          <!-- Entry -->
          <div 
            v-for="sc in entryScenarios" :key="sc.id"
            @click="togglePhaseItem(sc.id, 'scenario') || toggleScenario(sc.id, 'entry')"
            @mouseenter="hoveredScenario = sc"
            @mouseleave="hoveredScenario = null"
            class="w-12 h-12 rounded-2xl border transition-all duration-500 flex flex-col items-center justify-center cursor-pointer shadow-inner relative group"
            :class="isScenarioActive(sc.id, 'entry') ? 'bg-white border-white' : 'bg-gradient-to-br from-white/10 to-transparent border-white/10 hover:border-white/20 hover:scale-105 transition-all duration-500'"
          >
            <span class="text-[10px] font-bold leading-none" :class="isScenarioActive(sc.id, 'entry') ? 'text-black' : 'text-white/40'">{{ sc.scenarioData?.letter || 'B' }}</span>
            <span class="text-[5px] uppercase tracking-tighter" :class="isScenarioActive(sc.id, 'entry') ? 'text-black/50' : 'text-white/10'">ENTRY</span>
          </div>

          <!-- Exit -->
          <div 
            v-for="sc in exitScenarios" :key="sc.id"
            @click="togglePhaseItem(sc.id, 'scenario') || toggleScenario(sc.id, 'exit')"
            @mouseenter="hoveredScenario = sc"
            @mouseleave="hoveredScenario = null"
            class="w-12 h-12 rounded-2xl border transition-all duration-500 flex flex-col items-center justify-center cursor-pointer shadow-inner relative group mt-1"
            :class="isScenarioActive(sc.id, 'exit') ? 'bg-white border-white' : 'bg-gradient-to-br from-white/10 to-transparent border-white/10 hover:border-white/20 hover:scale-105 transition-all duration-500'"
          >
            <span class="text-[10px] font-bold leading-none" :class="isScenarioActive(sc.id, 'exit') ? 'text-black' : 'text-white/40'">{{ sc.scenarioData?.letter || 'E' }}</span>
            <span class="text-[5px] uppercase tracking-tighter" :class="isScenarioActive(sc.id, 'exit') ? 'text-black/50' : 'text-white/10'">EXIT</span>
          </div>
        </template>

        <CursorTooltip 
          :visible="!!hoveredScenario"
          :title="hoveredScenario?.scenarioData?.name"
          :content="`[IF] ${hoveredScenario?.scenarioData?.if || '...'} -> [THEN] ${hoveredScenario?.scenarioData?.then || '...'}`"
          category="TACTICAL_ARC"
          subtext="ARC_SEQUENCE"
        />
      </div>

      <!-- Tactical Phase Sequencer (Ultra-Wide Vertical Layout) -->
      <div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-6 z-[1100]">
        <div 
          v-for="phase in phases" 
          :key="phase"
          @click="activePhase = activePhase === phase ? null : phase"
          class="w-[720px] h-28 bg-[#030303]/95 border transition-all duration-700 rounded-2xl flex items-center p-6 cursor-pointer group shadow-[0_64px_128px_-32px_rgba(0,0,0,1)] relative"
          :class="activePhase === phase ? 'border-white/50 scale-[1.02]' : 'border-white/5 hover:border-white/10'"
          style="backdrop-filter: blur(80px) saturate(180%);"
        >
           <!-- Corner Accents -->
           <div class="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-white/10"></div>
           <div class="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-white/10"></div>

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
             <div class="flex-1 flex flex-col gap-2 border-x border-white/[0.03] px-8 h-12 justify-center">
               <div class="flex items-center gap-2 opacity-20">
                  <div class="w-1 h-1 rounded-full bg-emerald-500"></div>
                  <span class="text-[6px] uppercase tracking-[0.3em] font-black text-white">CONDITIONS</span>
               </div>
               <div class="flex flex-wrap gap-1.5">
                 <div 
                   v-for="itemKey in (newEntry.tacticalPhases?.[phase] || []).filter(k => k.startsWith('condition'))" 
                   :key="itemKey"
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
                   class="w-8 h-8 rounded-sm border border-white/10 bg-white/[0.03] flex items-center justify-center transition-all duration-500 hover:scale-110 group/cube shadow-inner"
                 >
                   <span class="text-[10px] font-black text-white/30 group-hover/cube:text-white transition-colors uppercase font-mono">{{ getItemInfo(itemKey).data }}</span>
                 </div>
                 <div v-if="!(newEntry.tacticalPhases?.[phase] || []).some(k => k.startsWith('scenario'))" class="text-[7px] text-white/5 italic">VOID</div>
               </div>
             </div>

           </div>
           
           <!-- Status Footer -->
           <div class="absolute right-4 top-1/2 -translate-y-1/2">
             <div class="w-1 h-12 bg-white/[0.02] rounded-full overflow-hidden">
               <div class="w-full bg-white transition-all duration-1000 ease-out" :style="{ height: activePhase === phase ? '100%' : '0%', opacity: activePhase === phase ? '0.4' : '0' }"></div>
             </div>
           </div>

           <!-- Selection Ring Glow -->
           <div v-if="activePhase === phase" class="absolute -inset-[1px] rounded-2xl border border-white/30 shadow-[0_0_40px_rgba(255,255,255,0.08)] pointer-events-none"></div>
        </div>
      </div>
    </div>
  </div>
</Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import TacticalIcon from '~/widgets/diary/ui/TacticalIcon.vue';
import CursorTooltip from '~/widgets/diary/ui/CursorTooltip.vue';
import AssetPicker from '~/widgets/diary/ui/AssetPicker.vue';
import DirectionToggle from '~/widgets/diary/ui/DirectionToggle.vue';
import CustomSelect from '~/widgets/diary/ui/CustomSelect.vue';
import { isAddModalOpen, newEntry, resetEntry, addDiaryEntry, isSubmitting, strategyOptions, selectedStrategyId } from '~/widgets/diary/model/useDiary';
import type { DiaryEntry } from '~/entities/diary/model/diary.types';
import { useForumStore } from "~/features/store/useForum";
import { useRoute } from 'vue-router';
import { useAuthStore } from '~/entities/user/auth.store';
import { useBoardStore } from '~/features/store/useBoard';
import { useForumCategoryStore } from '~/features/store/useForumCategory';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '~/shared/firebase.client';
import type { Thread } from '~/entities/thread/model/thread.types';
import imageCompression from 'browser-image-compression';
import { getAssetBaseCurrency, getExchangeRate } from '~/shared/api/currency.service';

const forum = useForumStore();
const forumCategory = useForumCategoryStore();
const mainSections = forumCategory.mainSections;
const categories = forumCategory.categories;

const currencyOptions = [
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
  { label: 'RUB', value: 'RUB' },
  { label: 'GBP', value: 'GBP' },
  { label: 'JPY', value: 'JPY' },
  { label: 'AUD', value: 'AUD' },
  { label: 'CAD', value: 'CAD' },
  { label: 'CHF', value: 'CHF' },
  { label: 'CNY', value: 'CNY' },
];

const isUploadingImage = ref(false); 
const emotions = [
  { id: 'fear', label: 'Fear Response', state: 'REF_E_01', color: 'rose', desc: 'Risk aversion initiated. Potential for premature exit or missed entry protocols due to perceived volatility spikes.' },
  { id: 'greed', label: 'Greed/Euphoria', state: 'REF_E_02', color: 'emerald', desc: 'Dopamine loop active. Tendency to ignore SL logic or over-leverage position size beyond risk parameters.' },
  { id: 'fomo', label: 'FOMO Distortion', state: 'REF_E_03', color: 'blue', desc: 'Chase protocol active. Risk of entering at price exhaustion points. Strategic patience is compromised.' },
  { id: 'frustration', label: 'Frustration', state: 'REF_E_04', color: 'orange', desc: 'Emotional friction detected. High risk of revenge trading or abandonment of strategic discipline.' },
  { id: 'neutral', label: 'Neutral Logic', state: 'REF_E_05', color: 'gray', desc: 'System equilibrium maintained. Execution following pure strategic parameters without emotional bias.' },
  { id: 'confidence', label: 'Confidence', state: 'REF_E_06', color: 'amber', desc: 'Strategic alignment confirmed. High conviction execution within established risk-reward thresholds.' },
  { id: 'calm', label: 'Calm/Zen', state: 'REF_E_07', color: 'cyan', desc: 'Peak flow state achieved. Market noise filtered. Execution is fluid and precise.' },
  { id: 'boredom', label: 'Boredom', state: 'REF_E_08', color: 'yellow', desc: 'Apathy detected. Risk of taking low-quality trades just to be in the market.' }
];

const hoveredEmotion = ref<any>(null);
const hoveredCondition = ref<any>(null);
const hoveredScenario = ref<any>(null);

const phases = ['entry', 'during', 'exit'] as const;
const activePhase = ref<'entry' | 'during' | 'exit' | null>(null);
const togglePhaseItem = (id: string, type: 'emotion' | 'condition' | 'scenario') => {
  if (!activePhase.value) return false;
  const phase = activePhase.value;
  if (!newEntry.value.tacticalPhases) {
    newEntry.value.tacticalPhases = { entry: [], during: [], exit: [] };
  }
  const itemKey = `${type}:${id}`;
  const list = newEntry.value.tacticalPhases[phase];
  const idx = list.indexOf(itemKey);
  if (idx > -1) list.splice(idx, 1);
  else list.push(itemKey);
  return true;
};

function toggleTopEmotion(id: string) {
  if (!newEntry.value.emotions) newEntry.value.emotions = [];
  const idx = newEntry.value.emotions.indexOf(id);
  if (idx > -1) newEntry.value.emotions.splice(idx, 1);
  else newEntry.value.emotions.push(id);
}

const getItemColor = (itemKey: string) => {
  const [type, id] = itemKey.split(':');
  if (type === 'emotion') {
    return emotions.find(e => e.id === id)?.color === 'rose' ? '#f43f5e' : 
           emotions.find(e => e.id === id)?.color === 'emerald' ? '#10b981' :
           emotions.find(e => e.id === id)?.color === 'blue' ? '#3b82f6' : 
           emotions.find(e => e.id === id)?.color === 'orange' ? '#f59e0b' : '#ffffff40';
  }
  if (type === 'condition') return '#ffffff20';
  if (type === 'scenario') return '#ffffff60';
  return '#ffffff10';
};

const getItemInfo = (itemKey: string): { type: 'emotion' | 'condition' | 'scenario' | 'unknown'; data: string } => {
  const parts = itemKey.split(':');
  const type = parts[0] as any;
  const id = parts[1] || '';

  if (type === 'emotion') return { type: 'emotion', data: id };
  if (type === 'condition') {
    const cond = flatConditions.value.find(c => c.id === id);
    return { type: 'condition', data: cond?.text ? cond.text.charAt(0).toUpperCase() : 'C' };
  }
  if (type === 'scenario') {
    const scNodes = [...entryScenarios.value, ...exitScenarios.value];
    const sc = scNodes.find(s => s.id === id);
    return { type: 'scenario', data: sc?.scenarioData?.letter || 'S' };
  }
  return { type: 'unknown', data: '?' };
};

const boardStore = useBoardStore();

/** BOARD-LINKED COMPUTED DATA **/
const activeStrategyBoardId = computed(() => {
  if (!selectedStrategyId.value) return null;
  return strategyOptions.value.find(s => s.id === selectedStrategyId.value)?.boardId || null;
});

const activeStrategyBoard = computed(() => {
  if (!activeStrategyBoardId.value) return null;
  return boardStore.boards.find(b => b.id === activeStrategyBoardId.value) || null;
});

const flatConditions = computed(() => {
  if (!activeStrategyBoard.value) return [];
  const sourceBoards = [activeStrategyBoard.value];
  return sourceBoards.flatMap(b => b.notes).filter(n => n.type === 'conditions').flatMap(node => {
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

const currentExchangeRate = ref(1.0);
const isFetchingRate = ref(false);

const updateRate = async () => {
    // Only attempt if we have an asset and it's not the same as account base
    if (!newEntry.value.asset) return;
    
    const assetBase = getAssetBaseCurrency(newEntry.value.asset, newEntry.value.assetType || 'Stocks');
    const accountBase = newEntry.value.currency || 'USD';
    
    if (assetBase === accountBase) {
        currentExchangeRate.value = 1.0;
        return;
    }

    isFetchingRate.value = true;
    try {
        const date = newEntry.value.dateExit ? new Date(newEntry.value.dateExit as any) : undefined;
        const rate = await getExchangeRate(assetBase, accountBase, date);
        if (rate > 0) {
            currentExchangeRate.value = rate;
        }
    } catch (e) {
        console.error('[AddEntryModal] Failed to discover rate', e);
    } finally {
        isFetchingRate.value = false;
    }
};

// Immediate and robust reaction to context changes
watch(() => [newEntry.value.asset, newEntry.value.currency, newEntry.value.dateExit], updateRate, { immediate: true, deep: true });
const fileInput = ref<HTMLInputElement | null>(null);
const isUrlPromptOpen = ref(false);
const urlInput = ref('');

const route = useRoute();
const auth = useAuthStore();

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

    if (newEntry.value.images === undefined) newEntry.value.images = [];

    try {
        isUploadingImage.value = true;
        
        const options = {
            maxSizeMB: 0.7,
            maxWidthOrHeight: 1600,
            useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        const base64 = await fileToBase64(compressedFile);
        
        newEntry.value.images.push({
            url: base64,
            context: ''
        });
        
    } catch (error) {
        console.error('Local image processing failed:', error);
    } finally {
        isUploadingImage.value = false;
        if (event.target) (event.target as HTMLInputElement).value = '';
    }
};

const addByLink = () => {
    if (!urlInput.value) return;
    if (newEntry.value.images === undefined) newEntry.value.images = [];

    newEntry.value.images.push({
        url: urlInput.value,
        context: ''
    });
    urlInput.value = '';
    isUrlPromptOpen.value = false;
};

const removeImage = (index: number) => {
  if(newEntry.value.images === undefined) {
    newEntry.value.images = []
  }
    newEntry.value.images.splice(index, 1);
};

const dateInput = computed({
  get: () => {
    const date = newEntry.value.date instanceof Date
      ? newEntry.value.date
      : new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  },
  set: (val: string) => {
    newEntry.value.date = val ? new Date(val) : new Date()
  }
})

const dateExitInput = computed({
  get: () => {
    if (!newEntry.value.dateExit) return ''
    const date = newEntry.value.dateExit instanceof Date
      ? newEntry.value.dateExit
      : new Date(newEntry.value.dateExit as any)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  },
  set: (val: string) => {
    newEntry.value.dateExit = val ? new Date(val) : undefined
  }
})

const availableThreads = ref<Thread[]>([])
const loadingThreads = ref(false)

watch(() => newEntry.value.forumCategory?.category, async (newCat) => {
    if (!newCat) {
        availableThreads.value = []
        return
    }
    loadingThreads.value = true
    try {
        const q = query(
            collection(db, 'threads'),
            where('category', '==', newCat)
        )
        const snap = await getDocs(q)
        availableThreads.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Thread))
    } catch (e) {
        console.error('Error fetching threads', e)
    } finally {
        loadingThreads.value = false
    }
})

function toggleThreadSync(id: string) {
    if (!newEntry.value.linkedThreads) {
        newEntry.value.linkedThreads = [];
    }
    const idx = newEntry.value.linkedThreads.indexOf(id);
    if (idx > -1) {
        newEntry.value.linkedThreads.splice(idx, 1);
    } else {
        newEntry.value.linkedThreads.push(id);
    }
}

const rrDisplay = computed(() => {
    const entry = newEntry.value.entry || 0
    const sl = newEntry.value.stopLoss || 0
    const tp = newEntry.value.takeProfit || 0
    const side = newEntry.value.side
    if (!entry || !sl || !tp) return null
    let risk = side === 'Long' ? (entry - sl) : (sl - entry);
    let target = side === 'Long' ? (tp - entry) : (entry - tp);
    if (risk <= 0 || target <= 0) return { value: 0, label: 'Inverted', error: true };
    const ratio = target / risk
    return { value: ratio, label: `1:${ratio.toFixed(2)}`, error: false }
})

const currentEquity = computed(() => {
    const uid = route.query.uid as string;
    let baseDeposit = 0;
    if (selectedStrategyId.value) {
        const strat = strategyOptions.value.find(s => s.id === selectedStrategyId.value);
        if (strat?.initialDeposit) baseDeposit = strat.initialDeposit;
    }
    const initial = baseDeposit > 0 ? baseDeposit : (forum.users.get(uid)?.initialDeposit || 1100);
    const entriesList = forum.users.get(uid)?.diary || [];
    const netReturnPercent = entriesList.reduce((sum: number, e: DiaryEntry) => sum + (e.result || 0), 0);
    return Number((initial * (1 + netReturnPercent / 100)).toFixed(2));
});

const hasPrices = computed(() => !!(newEntry.value.entry && newEntry.value.exit && newEntry.value.size));

const currencySymbol = computed(() => {
    const map: Record<string, string> = {
        'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'AUD': 'A$', 'CAD': 'C$', 'CHF': 'Fr', 'CNY': '¥', 'RUB': '₽'
    };
    return map[newEntry.value.currency || 'USD'] || '$';
});

const calculatedSizeInCurrency = computed(() => {
    const lots = Number(newEntry.value.size || 0);
    const entry = Number(newEntry.value.entry || 0);
    if (!lots || !entry) return 0;
    const contractSize = (newEntry.value.assetType || 'Forex') === 'Forex' ? 100000 : 1;
    const rawValue = lots * contractSize * entry;
    return rawValue * currentExchangeRate.value;
});

const totalProfitCurrency = computed(() => {
    const entry = newEntry.value.entry || 0;
    const exit = newEntry.value.exit || 0;
    const lots = newEntry.value.size || 0;
    const side = newEntry.value.side;
    
    let rawProfit = 0;
    if (entry && exit && lots) {
        const diff = side === 'Long' ? (exit - entry) : (entry - exit);
        const multiplier = (newEntry.value.assetType || 'Forex') === 'Forex' ? 100000 : 1;
        rawProfit = diff * (lots * multiplier);
    } else {
        rawProfit = (newEntry.value.profitInCurrency || 0) * (newEntry.value.size || 0);
    }
    
    return rawProfit * currentExchangeRate.value;
});

const calculatedResultPercent = computed(() => {
    const profit = totalProfitCurrency.value;
    const equity = currentEquity.value;
    if (equity <= 0) return 0;
    return Number(((profit / equity) * 100).toFixed(2));
});

const saveEntry = async () => {
    const uid = route.query.uid as string;
    if(!auth.user?.uid || auth.user.uid !== uid) return;
    
    newEntry.value.riskReward = rrDisplay.value?.value || 0;
    newEntry.value.result = calculatedResultPercent.value;
    newEntry.value.profitInCurrency = totalProfitCurrency.value;
    if (selectedStrategyId.value) newEntry.value.strategyId = selectedStrategyId.value;

    // Tactical Enrichment Phase
    const resolveScen = (id: string, type: 'entry' | 'exit') => {
        const sc = [...entryScenarios.value, ...exitScenarios.value].find(s => s.id === id);
        if (!sc || !sc.scenarioData) return null;
        return {
            id,
            info: {
                name: sc.scenarioData.name || 'Untitled',
                description: type === 'entry' ? (sc.scenarioData.if || '') : (sc.scenarioData.then || '')
            }
        };
    };

    if (newEntry.value.boardScenarioEntryId) {
        newEntry.value.boardScenarioEntry = resolveScen(newEntry.value.boardScenarioEntryId, 'entry') || undefined;
    }
    if (newEntry.value.boardScenarioExitId) {
        newEntry.value.boardScenarioExit = resolveScen(newEntry.value.boardScenarioExitId, 'exit') || undefined;
    }
    if (newEntry.value.boardConditions?.length) {
        newEntry.value.boardConditions = (newEntry.value.boardConditions as string[]).map(id => {
            const cond = flatConditions.value.find(c => c.id === id);
            if (cond) {
                return {
                    id,
                    info: { name: cond.text || 'Condition', description: cond.parentNodeName || '' }
                };
            }
            return id;
        });
    }

    // Capture the entry data to ensure we push it to the store for immediate reactivity
    const finalEntry = { ...newEntry.value }; 
    await addDiaryEntry(finalEntry, auth.user.uid, uid);
    
    isAddModalOpen.value = false;
    resetEntry();
}
</script>

<style scoped>
.modal-backdrop-blur {
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
}

.lux-picker :deep(input) {
    background: rgba(255, 255, 255, 0.03) !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
    border-radius: 1.5rem !important;
    padding: 1.25rem 1.5rem !important;
    color: white !important;
}

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

.color-scheme-dark {
    color-scheme: dark;
}

.fade-refined-enter-active,
.fade-refined-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-refined-enter-from,
.fade-refined-leave-to {
  opacity: 0;
  transform: translateY(10px);
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
</style>
