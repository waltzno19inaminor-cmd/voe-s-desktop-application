<template>
      <!-- METRIC DROPDOWN MENU (Teleport to body) -->
      <Teleport to="body">
        <Transition name="nt-tooltip-fade">
          <div v-if="activeMetricDropdown" 
               class="fixed z-[100000000] pointer-events-auto context-menu-container"
               :style="{ left: activeMetricDropdown.x + 'px', top: activeMetricDropdown.y + 'px' }"
               @click.stop>
              <div class="flex flex-col space-y-1.5">
                <!-- Anchor Point Indicator -->
                <div class="w-2 h-2 nier-bg-inverted rotate-45 absolute -left-1 -top-1 animate-pulse"></div>
  
                <!-- Segmented Blade -->
                <div class="group relative">
                  <button @click="openDeepDive(activeMetricDropdown.metricKey)"
                          class="nier-bg-panel border border-black/20 dark:border-white/20 px-6 py-2.5 min-w-[200px] text-left transition-all duration-500 hover:border-black dark:hover:border-white hover:translate-x-4 flex items-center justify-between relative overflow-hidden shadow-[10px_10px_0_rgba(0,0,0,0.2)]">
                    <div class="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
                    <span class="text-[9px] font-mono tracking-[0.4em] uppercase font-black group-hover:tracking-[0.6em] transition-all duration-500 relative z-10 nier-text-primary">SHOW_DESCRIPTION</span>
                    <span class="text-[7px] font-mono opacity-20 group-hover:opacity-100 transition-opacity relative z-10 nier-text-primary">[0x01]</span>
                    <div class="absolute inset-y-0 left-0 w-0 nier-bg-inverted group-hover:w-1.5 transition-all duration-500"></div>
                  </button>
                </div>
              </div>
          </div>
        </Transition>
      </Teleport>
  
      <!-- METRIC DEEP DIVE DESCRIPTION MODAL -->
      <Transition name="protocol-slide">
        <div v-if="selectedDeepDiveMetricKey" 
             class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 px-6 transition-all"
             @click.self="selectedDeepDiveMetricKey = null">
           <ExPanel v-if="allAvailableConfigs.find(c => c.key === selectedDeepDiveMetricKey)"
                    variant="light" no-shadow noPadding
                    class="!w-[950px] !max-w-[95vw] !max-h-[85vh] relative overflow-visible">
            <template #header>&nbsp;</template>
            
            <!-- SIDE-MOUNTED CLOSE TAB -->
            <button @click="selectedDeepDiveMetricKey = null"
                    class="absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-40 bg-[#ffffff] dark:bg-[#070707] border-t border-r border-b border-black/20 dark:border-white/20 flex items-center justify-center group/close-tab cursor-pointer hover:bg-black/5 dark:hover:bg-[#111] transition-colors z-[100]">
               <div class="w-[1px] h-16 bg-black/10 dark:bg-white/10 group-hover/close-tab:bg-black/40 dark:group-hover/close-tab:bg-white/40 transition-all duration-300"></div>
               <span class="absolute text-[7px] font-mono tracking-[0.4em] uppercase text-black/10 dark:text-white/10 group-hover/close-tab:text-black/40 dark:group-hover/close-tab:text-white/40 rotate-90 whitespace-nowrap">Close_Description</span>
            </button>
            
            <div class="p-8 flex flex-col h-full overflow-hidden nier-text-primary">
              <!-- HEADER -->
              <div class="flex items-center justify-between border-b nier-border-primary pb-6 mb-6 relative z-10 shrink-0">
                <div class="flex items-center space-x-4">
                  <span class="text-2xl font-serif font-light uppercase tracking-[0.3em] nier-text-primary">
                    {{ metricDisplayLabel(allAvailableConfigs.find(c => c.key === selectedDeepDiveMetricKey)!) }}
                  </span>
                  <span class="text-[10px] font-serif font-light px-3 py-1 border nier-border-primary text-black/60 dark:text-white/60 tracking-widest uppercase">
                    {{ allAvailableConfigs.find(c => c.key === selectedDeepDiveMetricKey)!.category }}
                  </span>
                  <span class="text-[10px] font-serif font-light opacity-50 px-3 py-1 border nier-border-primary nier-text-primary tracking-widest uppercase">
                    {{ allAvailableConfigs.find(c => c.key === selectedDeepDiveMetricKey)!.sub }}
                  </span>
                </div>
              </div>
  
              <div class="space-y-8 relative z-10 flex-1 pr-2 overflow-y-auto custom-scrollbar">
                <!-- DESCRIPTION & FORMULA -->
                <div class="space-y-6">
                  <div class="flex flex-col space-y-2">
                    <span class="text-[10px] font-serif font-light tracking-[0.3em] uppercase opacity-50 italic">Econometric_Definition</span>
                    <div class="text-lg font-serif font-light leading-relaxed nier-text-primary tracking-wide space-y-2">
                      <p class="opacity-90">
                        {{ metricDisplayDesc(allAvailableConfigs.find(c => c.key === selectedDeepDiveMetricKey)!) }}
                      </p>
                      <p class="opacity-70 italic text-[13px]">
                        {{ getMetricRationale(selectedDeepDiveMetricKey) }}
                      </p>
                    </div>
                  </div>
                  <div class="pt-2 flex items-center justify-between">
                    <div class="flex items-center space-x-4 w-full">
                      <span class="text-[10px] font-serif font-light tracking-[0.3em] uppercase opacity-40">Formula:</span>
                      <span class="text-xs nier-text-primary font-serif font-light italic tracking-widest flex-1">
                        {{ allAvailableConfigs.find(c => c.key === selectedDeepDiveMetricKey)!.formula }}
                      </span>
                    </div>
                  </div>
                </div>
  
                <!-- VARIABLES USED -->
                <div class="space-y-3">
                  <div class="text-[10px] font-serif font-light tracking-[0.3em] uppercase opacity-50 italic">Diagnostic_Variables_Used</div>
                  <div class="flex flex-col space-y-1.5">
                    <div v-for="(v, i) in getMetricDeepDiveVariables(selectedDeepDiveMetricKey, strategyMetrics, sp500BenchmarkRate, riskFreeRate)" :key="i"
                         class="py-1 flex items-center justify-between transition-all">
                      <span class="text-sm font-serif font-light nier-text-primary opacity-70 tracking-wide">{{ v.name }}</span>
                      <span class="text-sm font-serif font-light nier-text-primary tracking-widest">{{ v.val }}</span>
                    </div>
                  </div>
                </div>
  
                <!-- FULL CALCULATION STEP-BY-STEP -->
                <div class="space-y-3">
                  <div class="text-[10px] font-serif font-light tracking-[0.3em] uppercase opacity-50 italic">Full_Calculation_Execution_Sequence</div>
                  <pre class="text-xs font-serif font-light nier-text-primary leading-relaxed whitespace-pre-wrap tracking-wide">{{ getMetricCalculationSteps(selectedDeepDiveMetricKey, strategyMetrics, sp500BenchmarkRate, riskFreeRate) }}</pre>
                </div>
              </div>
            </div>
           </ExPanel>
        </div>
      </Transition>
  
      <!-- ADD METRIC MODAL -->
      <Transition name="protocol-slide">
        <div v-if="showAddModal" 
             class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 px-6 transition-all"
             @click.self="showAddModal = false">
          <ExPanel variant="light" no-shadow noPadding
                   class="!w-[1150px] !max-w-[95vw] !max-h-[85vh] relative overflow-visible">
            <template #header>&nbsp;</template>
            
            <!-- SIDE-MOUNTED CLOSE TAB -->
            <button @click="showAddModal = false"
                    class="absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-40 bg-[#ffffff] dark:bg-[#070707] border-t border-r border-b border-black/20 dark:border-white/20 flex items-center justify-center group/close-tab cursor-pointer hover:bg-black/5 dark:hover:bg-[#111] transition-colors z-[100]">
               <div class="w-[1px] h-16 bg-black/10 dark:bg-white/10 group-hover/close-tab:bg-black/40 dark:group-hover/close-tab:bg-white/40 transition-all duration-300"></div>
               <span class="absolute text-[7px] font-mono tracking-[0.4em] uppercase text-black/10 dark:text-white/10 group-hover/close-tab:text-black/40 dark:group-hover/close-tab:text-white/40 rotate-90 whitespace-nowrap">Close_Archive</span>
            </button>
            
            <div class="p-8 flex flex-col h-full overflow-hidden nier-text-primary">
              <!-- SEARCH & CATEGORY FILTERS -->
              <div class="flex items-center justify-between border-b nier-border-primary pb-6 mb-6 relative z-10 space-x-6 shrink-0">
                <div class="flex items-center space-x-4 flex-1">
                  <!-- Search Bar -->
                  <div class="relative flex-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40 dark:text-white/40">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input v-model="searchQuery" 
                           type="text" 
                           placeholder="SEARCH_METRICS_ARCHIVE..." 
                           autocomplete="off"
                           autocorrect="off"
                           autocapitalize="off"
                           spellcheck="false"
                           class="w-full bg-black/5 dark:bg-white/5 border nier-border-primary pl-10 pr-4 py-2.5 text-xs font-mono nier-text-primary placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition-all" />
                  </div>
                  
                  <!-- Category Filters -->
                  <div class="flex items-center space-x-1 bg-black/5 dark:bg-white/5 p-1 border nier-border-primary">
                    <button v-for="cat in ['ALL', 'Primary', 'Advanced', 'Expert']" :key="cat"
                             @click="selectedCategoryFilter = cat"
                             class="px-4 py-1.5 text-[10px] font-mono tracking-widest uppercase transition-all"
                             :class="selectedCategoryFilter === cat ? 'nier-bg-inverted nier-text-primary font-bold shadow-[0_2px_10px_rgba(0,0,0,0.2)]' : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'">
                      {{ cat }}
                    </button>
                  </div>
                </div>
              </div>
  
              <div class="overflow-y-auto flex-1 pr-2 custom-scrollbar space-y-4 relative z-10">
                <div v-for="cfg in filteredAvailableConfigs" :key="cfg.key"
                     @click="toggleMetric(cfg.key)"
                     class="p-4 border transition-all flex items-center justify-between cursor-pointer group"
                     :class="activeMetricKeys.includes(cfg.key) ? 'border-black dark:border-white nier-bg-inverted nier-text-primary shadow-[0_10px_30px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_30px_rgba(255,255,255,0.2)]' : 'nier-border-primary hover:border-black/30 dark:hover:border-white/30 bg-white/50 dark:bg-white/[0.02] nier-text-primary'">
                  <div class="flex flex-col space-y-1 w-full">
                    <div class="flex items-center space-x-3">
                      <span class="text-xs font-mono font-bold uppercase tracking-widest transition-colors"
                            :class="activeMetricKeys.includes(cfg.key) ? 'nier-text-primary font-extrabold' : 'nier-text-primary'">
                        {{ metricDisplayLabel(cfg) }}
                      </span>
                      <span class="text-[9px] font-mono px-2 py-0.5 border transition-colors"
                            :class="activeMetricKeys.includes(cfg.key) ? 'border-white/30 dark:border-black/30 nier-text-primary bg-white/10 dark:bg-black/10 font-bold' : (cfg.category === 'Expert' ? 'border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5' : (cfg.category === 'Advanced' ? 'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5' : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'))">
                        {{ cfg.category }}
                      </span>
                      <span class="text-[9px] font-mono px-2 py-0.5 border transition-colors"
                            :class="activeMetricKeys.includes(cfg.key) ? 'border-white/20 dark:border-black/20 text-white/80 dark:text-black/80' : 'nier-border-primary opacity-50'">
                        {{ cfg.sub }}
                      </span>
                    </div>
                    <p class="text-[10px] font-mono leading-relaxed transition-colors mt-1"
                       :class="activeMetricKeys.includes(cfg.key) ? 'text-white/90 dark:text-black/90' : 'nier-text-primary opacity-70'">
                      {{ metricDisplayDesc(cfg) }}
                    </p>
                    <span class="text-[9px] font-mono transition-colors mt-1"
                          :class="activeMetricKeys.includes(cfg.key) ? 'text-white/60 dark:text-black/60' : 'opacity-40'">
                      Formula: {{ cfg.formula }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
  
            <!-- Background Scan Line -->
            <div class="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
              <div class="w-full h-px nier-bg-inverted animate-scan"></div>
            </div>
          </ExPanel>
        </div>
      </Transition>
  
      <!-- DRAG TO TRASH ZONE (VISIBLE DURING EDIT MODE) -->
      <Transition name="protocol-slide">
        <div v-if="isEditMode && draggingMetricIndex !== null"
             class="absolute bottom-12 right-12 z-20 flex items-center justify-center pointer-events-none">
          <div class="pointer-events-none flex items-center justify-center w-16 h-16 backdrop-blur-xl border transition-all duration-300 shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative group"
               :class="isHoveringTrash ? 'bg-rose-500/20 dark:bg-rose-500/20 border-rose-500 scale-125 shadow-[0_0_30px_rgba(244,63,94,0.4)]' : 'bg-black/80 dark:bg-[#0a0a0a]/80 border-white/20 dark:border-white/20'">
            <!-- Corner Accents -->
            <div class="absolute -top-1 -left-1 w-2 h-2 border-t border-l transition-colors duration-300" :class="isHoveringTrash ? 'border-rose-500' : 'border-white/40'"></div>
            <div class="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r transition-colors duration-300" :class="isHoveringTrash ? 'border-rose-500' : 'border-white/40'"></div>
            
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 transition-all duration-300" :class="isHoveringTrash ? 'text-rose-500 scale-110 -rotate-12' : 'text-white/60'">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"></path>
            </svg>
          </div>
        </div>
      </Transition>
</template>

<script setup lang="ts">
import ExPanel from '~/shared/ui/ExPanel.vue'
import type { useEquityCurveMetricsPanel } from '~/widgets/genesis/model/useEquityCurveMetricsPanel'

const props = defineProps<{
  panel: ReturnType<typeof useEquityCurveMetricsPanel>
  strategyMetrics: any
  sp500BenchmarkRate: number
  riskFreeRate: number
}>()

const {
  activeMetricKeys,
  isEditMode,
  showAddModal,
  searchQuery,
  selectedCategoryFilter,
  draggingMetricIndex,
  isHoveringTrash,
  activeMetricDropdown,
  selectedDeepDiveMetricKey,
  allAvailableConfigs,
  filteredAvailableConfigs,
  toggleMetric,
  getMetricDeepDiveVariables,
  getMetricCalculationSteps,
  getMetricRationale,
  metricDisplayLabel,
  metricDisplayDesc
} = props.panel

const openDeepDive = (metricKey: string) => {
  selectedDeepDiveMetricKey.value = metricKey
  activeMetricDropdown.value = null
}
</script>
