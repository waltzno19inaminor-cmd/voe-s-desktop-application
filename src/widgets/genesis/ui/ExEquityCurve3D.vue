<template>
  <div class="ex-equity-curve-3d h-full w-full relative overflow-hidden bg-transparent nier-text-primary" ref="container">
    
    <!-- BOOT OVERLAY -->
    <Transition name="fade">
      <div v-if="isInitializing" class="absolute inset-0 z-[1000] nier-bg-panel flex flex-col items-center justify-center space-y-8 pointer-events-auto transition-colors duration-500">
         <div class="flex flex-col items-center space-y-3">
            <div class="w-16 h-px nier-bg-inverted opacity-20"></div>
            <span class="text-[10px] font-mono tracking-[0.8em] uppercase font-black animate-pulse nier-text-primary">Establishing_Neural_Link</span>
            <div class="w-16 h-px nier-bg-inverted opacity-20"></div>
         </div>

         <div class="w-64 h-px bg-black/10 dark:bg-white/10 relative overflow-hidden">
            <div class="absolute inset-y-0 left-0 nier-bg-inverted transition-all duration-300" :style="{ width: `${bootProgress}%` }"></div>
            <!-- Glitch element -->
            <div class="absolute h-full w-4 bg-theme-text/40 blur-sm animate-scan"></div>
         </div>

         <div class="flex flex-col items-center space-y-1 opacity-40 nier-text-primary">
            <span class="text-[7px] font-mono tracking-widest uppercase">System_Code: 0x44_REIFY</span>
            <span class="text-[7px] font-mono tracking-widest uppercase">Matrix_Stability: {{ Math.min(100, Math.round(bootProgress)) }}%</span>
         </div>
         
         <!-- Scanline effect for boot -->
         <div class="absolute inset-0 pointer-events-none opacity-5 animate-scan bg-gradient-to-b from-transparent via-black dark:via-white to-transparent h-[2px]"></div>
      </div>
    </Transition>

    <!-- CANVAS LAYER -->
    <canvas ref="canvasRef"
            v-show="!showRobustnessExplanations && !showCalendarMode"
            class="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-10"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
            @mouseleave="handleMouseLeave"
            @wheel="handleWheel">
    </canvas>

    <Transition name="explanation-takeover">
      <ExRobustnessDiagnostic
        v-if="showRobustnessExplanations"
        :diagnostic-stats="diagnosticStats"
        :strategy-metrics="strategyMetrics"
        :filtered-trades="getFilteredTrades()"
        :format-sentence-case="formatSentenceCase"
      />
    </Transition>




    <Transition name="protocol-slide">
      <div v-if="showDistribution3D && !showRobustnessExplanations"
           class="absolute top-12 left-1/2 z-30 w-[min(560px,calc(100vw-320px))] -translate-x-1/2 pointer-events-none">
        <div class="relative border border-black/15 dark:border-white/15 bg-white/95 dark:bg-[#0a0a0a]/95 px-7 py-4 nier-text-primary shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
          <div class="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border border-black dark:border-white nier-bg-panel"></div>
          <div class="text-center text-[9px] font-mono uppercase tracking-[0.42em] opacity-55">Next step</div>
          <div class="mt-3 text-center text-base font-semibold leading-6" :style="{ color: robustnessExplanation.tone }">
            {{ formatSentenceCase(robustnessExplanation.action.replace('Recommended action: ', '')) }}
          </div>
        </div>
      </div>
    </Transition>

    <!-- TOP-CENTER WARNING BANNER (teleported to body) -->
    <Teleport to="body">
      <Transition name="robustness-warn">
        <div v-if="showRobustnessWarning"
             class="fixed top-6 inset-x-0 flex justify-center z-[2147483647] pointer-events-none">
          <div class="px-5 py-4 shadow-[0_12px_48px_rgba(220,38,38,0.55)] border border-red-400/30 flex items-start gap-3"
               style="background-color:#dc2626; min-width:340px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-5 h-5 shrink-0 mt-0.5 text-white">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <div class="text-[11px] font-mono font-black uppercase tracking-[0.3em] text-white leading-none mb-1.5">Insufficient Data</div>
              <div class="text-[11px] font-mono text-red-100 leading-snug">
                Robustness diagnostics require at least <span class="font-bold text-white">20 trades</span>.
                This strategy has <span class="font-bold text-white">{{ diagnosticStats.pnls?.length ?? 0 }}</span>.
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="tooltip-dist-fade">
        <div v-if="hoveredDistributionTooltip"
             :key="`${hoveredDistributionTooltip.kind}-${hoveredDistributionTooltip.label}`"
             class="fixed pointer-events-none z-[2147483647] transition-colors duration-500"
             :class="[themeStore.settings.isDark ? 'is-dark dark theme-dark' : 'theme-light']"
             :style="{
               left: hoveredDistributionTooltip.x + 'px',
               top: hoveredDistributionTooltip.y + 'px',
               transform: 'translateY(-100%) translateY(-16px) translateX(-50%)',
               width: '280px'
             }"
        >
          <div class="theme-tooltip-panel border p-5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col space-y-3 relative">
            <div class="flex items-center justify-between pb-2">
              <span class="text-[12px] font-mono uppercase tracking-[0.3em] font-black">{{ hoveredDistributionTooltip.label }}</span>
              <div class="w-2 h-2 bg-current opacity-70 rotate-45"></div>
            </div>
            <div class="flex flex-col space-y-1 font-mono text-[10px] uppercase">
              <template v-if="hoveredHistogramTooltip">
                <div class="flex justify-between">
                  <span class="opacity-40">PNL RANGE:</span>
                  <span class="font-bold tracking-wider">${{ hoveredHistogramTooltip.x0.toFixed(2) }} - ${{ hoveredHistogramTooltip.x1.toFixed(2) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="opacity-40">TRADES:</span>
                  <span class="font-bold tracking-wider">{{ hoveredHistogramTooltip.count }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="opacity-40">DENSITY:</span>
                  <span class="font-bold tracking-wider">{{ hoveredHistogramTooltip.density.toFixed(4) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="opacity-40 text-theme-accent">BIN CENTER:</span>
                  <span class="font-bold tracking-wider text-theme-accent">${{ hoveredHistogramTooltip.mid.toFixed(2) }}</span>
                </div>
              </template>
              <template v-else-if="hoveredCurveTooltip">
                <div class="flex justify-between">
                  <span class="opacity-40">RETURN:</span>
                  <span class="font-bold tracking-wider">${{ hoveredCurveTooltip.returnValue.toFixed(2) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="opacity-40">PDF DENSITY:</span>
                  <span class="font-bold tracking-wider">{{ hoveredCurveTooltip.density.toFixed(5) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="opacity-40">AIC / BIC:</span>
                  <span class="font-bold tracking-wider">{{ hoveredCurveTooltip.aic.toFixed(2) }} / {{ hoveredCurveTooltip.bic.toFixed(2) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="opacity-40 text-theme-accent">MODEL:</span>
                  <span class="font-bold tracking-wider text-theme-accent">{{ hoveredCurveTooltip.model }}</span>
                </div>
              </template>
            </div>
            <!-- Stem -->
            <div class="theme-tooltip-stem w-3 h-3 border-r border-b absolute -bottom-[6px] left-1/2 -translate-x-1/2 rotate-45"></div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- QUANTILE ALIGNMENT PROJECTION TOOLTIP -->
    <Teleport to="body">
      <Transition name="tooltip-dist-fade">
        <div v-if="hoveredQQPoint"
             :key="hoveredCurveIndex ?? 'null'"
             class="fixed pointer-events-none z-[2147483647] transition-colors duration-500"
             :class="[themeStore.settings.isDark ? 'is-dark dark theme-dark' : 'theme-light']"
             :style="{
               left: hoveredQQPoint.x + 'px',
               top: hoveredQQPoint.y + 'px',
               transform: 'translateY(-100%) translateY(-16px) translateX(-50%)',
               width: '260px'
             }"
        >
          <div class="theme-tooltip-panel border p-5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col space-y-3 relative">
            <div class="flex items-center justify-between pb-2">
              <span class="text-[12px] font-mono uppercase tracking-[0.3em] font-black">QUANTILE_ALIGNMENT</span>
              <div class="w-2 h-2 bg-current opacity-70 rotate-45"></div>
            </div>
            <div class="flex flex-col space-y-1 font-mono text-[10px] uppercase">
              <div class="flex justify-between">
                <span class="opacity-40">ACTUAL:</span>
                <span class="font-bold tracking-wider">${{ hoveredQQPoint.actual.toFixed(2) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="opacity-40">THEORETICAL:</span>
                <span class="font-bold tracking-wider">${{ hoveredQQPoint.theoretical.toFixed(2) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="opacity-40 text-theme-accent">Z-SCORE:</span>
                <span class="font-bold tracking-wider text-theme-accent">{{ hoveredQQPoint.z.toFixed(2) }}</span>
              </div>
            </div>
            <!-- Stem -->
            <div class="theme-tooltip-stem w-3 h-3 border-r border-b absolute -bottom-[6px] left-1/2 -translate-x-1/2 rotate-45"></div>
          </div>
        </div>
      </Transition>
    </Teleport>



    <!-- OVERLAY UI -->
    <div class="absolute top-32 left-12 z-20 pointer-events-none flex flex-col space-y-12">
      <Transition name="protocol-slide">
        <div v-if="!showMetricsPanel && !showRobustnessExplanations && !showDistribution3D">
          <div class="flex flex-col relative">
            <div class="flex items-center space-x-3 mb-2 cursor-pointer group/strat pointer-events-auto" @click="showStrategyMenu = !showStrategyMenu">
              <div class="w-1.5 h-1.5 nier-bg-inverted rotate-45 transition-all duration-500" :class="showStrategyMenu ? 'scale-150 rotate-[225deg]' : 'animate-pulse'"></div>
              <span class="text-[10px] font-mono tracking-[0.5em] uppercase font-black nier-text-primary transition-opacity group-hover/strat:opacity-100" :class="showStrategyMenu ? 'opacity-100' : 'opacity-40'">
                {{ selectedStrategy?.name || 'SYSTEM_EQUITY_PROJECTION' }} // v1.0
              </span>
              <div class="w-2 h-2 border-b border-r border-black/40 dark:border-white/40 rotate-45 transition-transform duration-500 ml-2" :class="showStrategyMenu ? '-rotate-[135deg] translate-y-0.5' : ''"></div>
            </div>

            <Transition name="protocol-slide">
              <div v-if="showStrategyMenu" class="absolute top-full left-0 mt-4 w-64 z-[100] pointer-events-auto">
                <ExPanel variant="light" :no-padding="true" :no-shadow="true" :show-corners="true" class="!border-black/20 dark:!border-white/20">
                  <div class="flex items-center justify-between px-3 py-1.5 border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
                  </div>
                  <div class="py-3">
                    <div v-for="s in strategies" :key="s.id"
                         @click.stop="selectedStrategyId = s.id; showStrategyMenu = false"
                         class="group/item relative px-6 py-3 cursor-pointer transition-all duration-300 border-b border-black/5 dark:border-white/5 last:border-0"
                         :class="selectedStrategyId === s.id ? 'nier-bg-inverted nier-text-primary' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-black/60 dark:text-white/60'">
                      <span class="text-[9px] font-mono tracking-[0.2em] uppercase font-bold group-hover/item:tracking-[0.3em] transition-all">
                        {{ s.name }}
                      </span>
                      <div v-if="selectedStrategyId === s.id" class="absolute right-4 top-1/2 -translate-y-1/2 w-1 h-1 nier-bg-panel rotate-45"></div>
                    </div>
                  </div>
                </ExPanel>
              </div>
            </Transition>
          </div>
          <div class="h-[1px] w-48 bg-black/10 dark:bg-white/10 mb-6"></div>
          <div v-if="showDistribution3D" class="flex flex-col space-y-4">
            <div class="flex flex-col">
              <span class="text-4xl font-mono nier-text-primary tracking-tighter font-bold drop-shadow-sm uppercase">
                {{ showQQPlot ? 'QQ_PLOT' : (showRobustnessHistogram ? 'PNL_HIST' : 'NORMAL_FIT') }}
              </span>
              <span class="text-[9px] font-mono tracking-[0.4em] uppercase opacity-30 mt-2 nier-text-primary">
                {{ showQQPlot ? 'QUANTILE_ALIGNMENT_PROJECTION' : 'ROBUSTNESS_FITTING_VERDICT' }}
              </span>
              <button v-if="!showQQPlot && !showRobustnessExplanations"
                      @click="toggleRobustnessHistogram"
                      class="mt-4 pointer-events-auto self-start px-4 py-2 border font-mono text-[8px] tracking-[0.35em] uppercase transition-all duration-300"
                      :class="showRobustnessHistogram ? 'nier-bg-inverted text-white dark:!text-black border-black dark:border-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]' : 'nier-text-primary nier-border-primary opacity-50 hover:opacity-100 hover:border-black/30 dark:hover:border-white/30 hover:bg-black/5 dark:hover:bg-white/5'">
                {{ showRobustnessHistogram ? '[ VIEW_FITTED_PDF ]' : '[ VIEW_PNL_HISTOGRAM ]' }}
              </button>
            </div>
          </div>
          <div v-else class="flex flex-col">
            <div class="flex items-center gap-4">
              <span class="text-6xl font-mono nier-text-primary tracking-tighter font-bold drop-shadow-sm">
                {{ displayBalance }}
              </span>
              <button class="pointer-events-auto flex h-10 w-10 items-center justify-center border border-white/20 bg-[#0a0a0a]/80 backdrop-blur-xl text-white/45 transition-all hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                      :class="isApiSyncing ? 'border-white/40 text-white' : ''"
                      :disabled="isApiSyncing"
                      :title="apiSyncButtonTitle"
                      @click="syncCurrentStrategyApi">
                <svg viewBox="0 0 24 24"
                     fill="none"
                     stroke="currentColor"
                     stroke-width="2"
                     stroke-linecap="round"
                     stroke-linejoin="round"
                     class="h-4 w-4"
                     :class="isApiSyncing ? 'animate-spin' : ''">
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M3 21v-5h5" />
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M16 8h5V3" />
                </svg>
              </button>
            </div>
            <span class="text-[9px] font-mono tracking-[0.4em] uppercase opacity-30 mt-2 nier-text-primary">
              {{ apiSyncStatusMessage || 'REIFIED_BALANCE_SNAPSHOT' }}
            </span>
          </div>
        </div>
      </Transition>
    </div>

    <!-- INITIAL DEPOSIT MODAL -->
    <Transition name="protocol-slide">
      <div v-if="showInitialDepositModal" 
           class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 px-6 transition-all"
           @click.self="showInitialDepositModal = false">
        <ExPanel variant="light" no-shadow noPadding class="!w-96 relative overflow-visible">
          <template #header>&nbsp;</template>
          
          <div class="p-12 flex flex-col space-y-8 relative z-10 nier-text-primary">
            <div class="flex flex-col">
              <span class="text-[8px] font-mono tracking-[0.5em] opacity-40 uppercase">Capital_Injection_Module</span>
              <h2 class="text-xl font-mono tracking-widest uppercase font-black mt-2 nier-text-primary">SET_DEPOSIT</h2>
            </div>

            <div class="flex flex-col space-y-2">
              <span class="text-[7px] font-mono opacity-30 uppercase tracking-[0.3em]">Initial_Liquidity_Amount</span>
              <div class="flex items-center border-b border-black/20 dark:border-white/20 pb-2 group/input">
                <span class="text-lg font-mono nier-text-primary mr-4">$</span>
                <input v-model.number="depositInput" 
                       type="number"
                       class="bg-transparent border-none outline-none text-2xl font-mono nier-text-primary w-full placeholder:opacity-20"
                       placeholder="0.00"
                       @keyup.enter="handleSetDeposit" />
              </div>
            </div>

            <div class="flex flex-col space-y-3 pt-4">
              <button @click="handleSetDeposit" 
                      class="w-full py-4 nier-bg-inverted nier-text-primary font-mono text-[10px] tracking-[0.5em] uppercase font-black hover:opacity-90 transition-all shadow-[0_10px_20px_rgba(0,0,0,0.2)]">
                CONFIRM_REIFICATION
              </button>
              <button @click="showInitialDepositModal = false" 
                      class="w-full py-3 border nier-border-primary nier-text-primary font-mono text-[8px] tracking-[0.4em] uppercase opacity-40 hover:opacity-100 transition-all">
                ABORT_SEQUENCE
              </button>
            </div>
          </div>

          <!-- Background Scan Line -->
          <div class="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
            <div class="w-full h-px nier-bg-inverted animate-scan"></div>
          </div>
        </ExPanel>
      </div>
    </Transition>

    <!-- BENCHMARK RATE MODAL -->
    <Transition name="protocol-slide">
      <div v-if="showBenchmarkModal" 
           class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 px-6 transition-all"
           @click.self="showBenchmarkModal = false">
        <ExPanel variant="light" no-shadow noPadding class="!w-96 relative overflow-visible">
          <template #header>&nbsp;</template>
          
          <div class="p-12 flex flex-col space-y-8 relative z-10 nier-text-primary">
            <div class="flex flex-col">
              <span class="text-[8px] font-mono tracking-[0.5em] opacity-40 uppercase">Benchmark_Calibration_Module</span>
              <h2 class="text-xl font-mono tracking-widest uppercase font-black mt-2 nier-text-primary">SET_BENCHMARK</h2>
            </div>

            <div class="flex flex-col space-y-2">
              <span class="text-[7px] font-mono opacity-30 uppercase tracking-[0.3em]">Annualized_Benchmark_Yield (%)</span>
              <div class="flex items-center border-b border-black/20 dark:border-white/20 pb-2 group/input">
                <input v-model.number="benchmarkInput" 
                       type="number" step="0.01"
                       class="bg-transparent border-none outline-none text-2xl font-mono nier-text-primary w-full placeholder:opacity-20"
                       placeholder="0.00"
                       @keyup.enter="handleSetBenchmark" />
                <span class="text-lg font-mono nier-text-primary ml-4">%</span>
              </div>
            </div>

            <div class="flex flex-col space-y-3 pt-4">
              <button @click="handleSetBenchmark" 
                      class="w-full py-4 nier-bg-inverted nier-text-primary font-mono text-[10px] tracking-[0.5em] uppercase font-black hover:opacity-90 transition-all shadow-[0_10px_20px_rgba(0,0,0,0.2)]">
                CONFIRM_REIFICATION
              </button>
              <button @click="showBenchmarkModal = false" 
                      class="w-full py-3 border nier-border-primary nier-text-primary font-mono text-[8px] tracking-[0.4em] uppercase opacity-40 hover:opacity-100 transition-all">
                ABORT_SEQUENCE
              </button>
            </div>
          </div>

          <!-- Background Scan Line -->
          <div class="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
            <div class="w-full h-px nier-bg-inverted animate-scan"></div>
          </div>
        </ExPanel>
      </div>
    </Transition>

    <!-- CLEAR CONFIRMATION MODAL -->
    <Transition name="protocol-slide">
      <div v-if="showClearConfirmation" 
           class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6 transition-all"
           @click.self="showClearConfirmation = false">
             <div class="w-full max-w-lg relative">
                <ExPanel variant="light">
                   <template #telemetry>
                      <span class="sr-only">Purge panel controls</span>
                   </template>
                   <div class="flex flex-col space-y-6 nier-text-primary">
                      <div class="flex items-start space-x-6">
                         <div class="flex-shrink-0 w-12 h-12 border border-red-500/40 flex items-center justify-center text-red-500">
                            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                               <path d="M12 9v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                         </div>
                         <div class="flex flex-col space-y-2">
                            <span class="text-[14px] font-mono font-black tracking-widest nier-text-primary uppercase">Critical_System_Alert</span>
                            <p class="text-[11px] font-mono text-black/60 dark:text-white/60 leading-relaxed uppercase tracking-widest">
                               You are about to permanently erase all trade records associated with <span class="text-red-500 font-bold">[{{ selectedStrategy?.name }}]</span>. 
                               <br><br>
                               This operation will reify an empty state and is <span class="text-red-500 font-black">irreversible</span>.
                            </p>
                         </div>
                      </div>

                      <div class="flex justify-end space-x-4 pt-4 border-t nier-border-primary nier-text-primary">
                         <ExButton @click="showClearConfirmation = false" variant="ghost" size="md">
                            CANCEL
                         </ExButton>
                         <ExButton @click="handleClearTrades" variant="solid" size="md" class="!bg-red-500 !border-red-500 !text-white hover:!bg-red-600 transition-colors">
                            EXECUTE_PURGE
                         </ExButton>
                      </div>
                   </div>
                </ExPanel>
             </div>
      </div>
    </Transition>

    <ExEquityCurveMetricsPanel
      :panel="metricsPanel"
      :strategy-metrics="strategyMetrics"
      :sp500-benchmark-rate="sp500BenchmarkRate"
      :risk-free-rate="riskFreeRate"
    />

    <!-- WINRATE TARGET MENU MODAL -->
    <Teleport to="body">
      <Transition name="protocol-slide">
        <div v-if="showWinrateMenu" 
             @click.self="showWinrateMenu = false"
             class="fixed inset-0 z-[10005] flex items-center justify-center p-20 backdrop-blur-md bg-black/60">
          
            <div class="w-full max-w-4xl relative">
              <!-- SIDE-MOUNTED CLOSE TAB -->
              <button @click="showWinrateMenu = false"
                      class="absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-40 bg-[#ffffff] dark:bg-[#070707] border-t border-r border-b border-black/20 dark:border-white/20 flex items-center justify-center group/close-tab cursor-pointer hover:bg-black/5 dark:hover:bg-[#111] transition-colors z-[100]">
                 <div class="w-[1px] h-16 bg-black/10 dark:bg-white/10 group-hover/close-tab:bg-black/40 dark:group-hover/close-tab:bg-white/40 transition-all duration-300"></div>
                 <span class="absolute text-[7px] font-mono tracking-[0.4em] uppercase text-black/10 dark:text-white/10 group-hover/close-tab:text-black/40 dark:group-hover/close-tab:text-white/40 rotate-90 whitespace-nowrap">Close_Menu</span>
              </button>
              
              <ExPanel class="w-full h-full" noPadding variant="light">
                <template #header>
                  <div class="flex items-center justify-between w-full">
                    <span class="text-[9px] font-mono tracking-[0.4em] uppercase font-black nier-text-primary">{{ isRu ? 'ПРОТОКОЛ_ЦЕЛЕЙ_СИСТЕМЫ_V4.0' : 'SYSTEM_TARGET_PROTOCOL_V4.0' }}</span>
                  </div>
                </template>

              <!-- CONTENT GRID -->
              <div class="p-10 flex flex-col space-y-10 max-h-[60vh] overflow-y-auto custom-scrollbar nier-text-primary">
                
                <!-- SEARCH & FILTERS -->
                <div class="flex items-center justify-between border-b nier-border-primary pb-6">
                  <div class="relative flex items-center">
                    <div class="absolute left-3 w-1.5 h-1.5 bg-black/20 dark:bg-white/20 rotate-45"></div>
                    <input v-model="winrateTargetSearch" 
                           :placeholder="isRu ? 'ПОИСК_ЦЕЛИ...' : 'SEARCH_TARGET...'" 
                           class="bg-black/5 dark:bg-white/5 border nier-border-primary px-8 py-1.5 text-[9px] font-mono tracking-widest focus:outline-none focus:border-black/30 dark:focus:border-white/30 w-64 uppercase placeholder:opacity-30 nier-text-primary" />
                  </div>

                  <div class="flex border nier-border-primary overflow-hidden">
                    <button v-for="filter in winrateTargetFilters" :key="filter.id"
                            @click="winrateTargetFilter = filter.id"
                            class="flex items-center justify-center h-9 px-4 transition-all"
                            :class="winrateTargetFilter === filter.id ? 'nier-bg-inverted nier-text-primary' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'">
                      <span class="text-[9px] font-mono font-black uppercase tracking-[0.2em]">{{ filter.label }}</span>
                    </button>
                  </div>
                </div>

                <!-- TARGET LIST -->
                <div v-if="winrateMenuNodes.length > 0" class="flex flex-col gap-6">
                  <template v-if="winrateTargetFilter === 'condition'">
                    <div v-for="group in groupedWinrateMenuNodes" :key="group.groupName" class="flex flex-col gap-4 mb-6">
                      <div class="flex items-center gap-4">
                        <div class="w-1.5 h-1.5 bg-theme-text/40 rotate-45"></div>
                        <span class="text-[9px] font-mono tracking-[0.2em] text-black/60 dark:text-white/60 uppercase">{{ group.groupName }}</span>
                        <div class="flex-1 h-px bg-black/5 dark:bg-white/5"></div>
                        <span class="text-[7px] font-mono opacity-20 uppercase tracking-[0.4em]">Scenario_Node</span>
                      </div>
                      <div class="flex flex-wrap gap-4">
                        <ExNTtooltip v-for="node in group.nodes" :key="node.id" :title="node.name">
                          <template #trigger>
                            <div @click="selectedWinrateNodeId = selectedWinrateNodeId === node.id ? null : node.id; initData()"
                                 class="relative w-14 h-14 border -ml-px -mt-px flex items-center justify-center cursor-pointer transition-all duration-500 group/node"
                                 :class="[
                                   selectedWinrateNodeId === node.id 
                                     ? 'nier-bg-inverted border-black dark:border-white shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                                     : 'bg-black/[0.02] dark:bg-white/[0.02] nier-border-primary hover:border-black dark:hover:border-white'
                                 ]">
                              
                              <div class="absolute top-1 left-1 w-1 h-1 border-t border-l transition-colors duration-500"
                                   :class="selectedWinrateNodeId === node.id ? 'border-white/40 dark:border-black/40' : 'nier-border-primary'"></div>

                              <div class="absolute top-1 right-1 px-1 py-[0.5px] text-[5px] font-mono font-bold tracking-tighter uppercase border"
                                   :class="node.type === 'scenario' ? 'border-blue-500/50 text-blue-500 bg-blue-500/10' : 'border-purple-500/50 text-purple-500 bg-purple-500/10'">
                                {{ node.type === 'scenario' ? 'SCN' : 'CND' }}
                              </div>

                              <span class="text-[14px] font-mono font-black tracking-tighter uppercase transition-colors"
                                    :class="selectedWinrateNodeId === node.id ? 'nier-text-primary' : 'text-black/40 dark:text-white/40 group-hover/node:text-black dark:group-hover/node:text-white'">
                                {{ (node.name || '').slice(0, 3) }}
                              </span>

                              <div v-if="selectedWinrateNodeId === node.id" 
                                   class="absolute -bottom-1 -right-1 w-2.5 h-2.5 rotate-45 border-2 border-white dark:border-black shadow-sm transition-colors duration-500 bg-blue-500"></div>
                            </div>
                          </template>
                          <div class="flex flex-col gap-1">
                            <div class="flex items-center justify-between">
                              <span class="text-[8px] font-mono opacity-40 uppercase">Target_Description</span>
                            </div>
                            <p class="text-[9px] font-mono leading-relaxed opacity-60 uppercase">{{ node.type === 'condition' ? (node.description || 'NO_METADATA_AVAILABLE') : node.name }}</p>
                          </div>
                        </ExNTtooltip>
                      </div>
                    </div>
                  </template>

                  <template v-else>
                    <div class="flex flex-wrap gap-4">
                      <ExNTtooltip v-for="node in winrateMenuNodes" :key="node.id" :title="node.name">
                        <template #trigger>
                          <div @click="selectedWinrateNodeId = selectedWinrateNodeId === node.id ? null : node.id; initData()"
                               class="relative w-14 h-14 border -ml-px -mt-px flex items-center justify-center cursor-pointer transition-all duration-500 group/node"
                               :class="[
                                 selectedWinrateNodeId === node.id 
                                   ? 'nier-bg-inverted border-black dark:border-white shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                                   : 'bg-black/[0.02] dark:bg-white/[0.02] nier-border-primary hover:border-black dark:hover:border-white'
                               ]">
                            
                            <div class="absolute top-1 left-1 w-1 h-1 border-t border-l transition-colors duration-500"
                                 :class="selectedWinrateNodeId === node.id ? 'border-white/40 dark:border-black/40' : 'nier-border-primary'"></div>

                            <div class="absolute top-1 right-1 px-1 py-[0.5px] text-[5px] font-mono font-bold tracking-tighter uppercase border"
                                 :class="node.type === 'scenario' ? 'border-blue-500/50 text-blue-500 bg-blue-500/10' : 'border-purple-500/50 text-purple-500 bg-purple-500/10'">
                              {{ node.type === 'scenario' ? 'SCN' : 'CND' }}
                            </div>

                            <span class="text-[14px] font-mono font-black tracking-tighter uppercase transition-colors"
                                  :class="selectedWinrateNodeId === node.id ? 'nier-text-primary' : 'text-black/40 dark:text-white/40 group-hover/node:text-black dark:group-hover/node:text-white'">
                              {{ (node.name || '').slice(0, 3) }}
                            </span>

                            <div v-if="selectedWinrateNodeId === node.id" 
                                 class="absolute -bottom-1 -right-1 w-2.5 h-2.5 rotate-45 border-2 border-white dark:border-black shadow-sm transition-colors duration-500 bg-blue-500"></div>
                          </div>
                        </template>
                        <div class="flex flex-col gap-1">
                          <div class="flex items-center justify-between">
                            <span class="text-[8px] font-mono opacity-40 uppercase">Target_Description</span>
                          </div>
                          <p class="text-[9px] font-mono leading-relaxed opacity-60 uppercase">{{ node.type === 'condition' ? (node.description || 'NO_METADATA_AVAILABLE') : node.name }}</p>
                        </div>
                      </ExNTtooltip>
                    </div>
                  </template>
                </div>

                <div v-else
                       class="w-full p-8 border border-dashed nier-border-primary text-center text-[10px] font-mono font-black uppercase tracking-[0.35em] text-black/30 dark:text-white/30">
                    {{ isRu ? 'ЦЕЛИ НЕ НАЙДЕНЫ' : 'NO_TARGETS_FOUND' }}
                  </div>
                </div>
              </ExPanel>
          </div>
        </div>
      </Transition>
    </Teleport>



    <!-- BOTTOM TACTICAL CONTROL PANEL -->
    <div v-if="!isTradeEntryOpen" 
         class="absolute bottom-12 left-0 right-0 z-40 flex items-center justify-center pointer-events-none">
      <div class="pointer-events-auto flex items-center space-x-2 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/20 p-2 relative">
        <!-- Corner Accents -->
        <div class="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-white/40"></div>
        <div class="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-white/40"></div>
        
        <!-- CENTER TACTICAL ADD BUTTON (MOVED TO START) -->
        <button @click="isTradeEntryOpen = true"
                class="group relative flex items-center justify-center w-12 h-12 bg-white text-black hover:bg-white/80 transition-all  border border-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5 transition-transform group-hover:rotate-90 duration-300">
            <line x1="12" y1="6" x2="12" y2="18"></line>
            <line x1="6" y1="12" x2="18" y2="12"></line>
          </svg>
          <div class="absolute bottom-full mb-3 px-3 py-1.5 bg-white text-black text-[9px] font-mono tracking-widest uppercase font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none  border border-white/20">
            [ LOG_NEW_TRADE ]
          </div>
        </button>

        <!-- TOGGLE METRICS / EQUITY CURVE -->
        <button v-if="!showDistribution3D && !showWinrateCurve"
                @click="showMetricsPanel = !showMetricsPanel; showDistribution3D = false" 
                class="group relative flex items-center justify-center w-10 h-10 text-white opacity-60 hover:opacity-100 border border-transparent hover:border-white/10 transition-all hover:bg-white/5"
                :class="showMetricsPanel ? 'bg-white/10 opacity-100 border-white/20' : ''">
          <svg v-if="!showMetricsPanel" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          <div class="absolute bottom-full mb-3 px-3 py-1.5 bg-white text-black text-[9px] font-mono tracking-widest uppercase font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-[0_10px_20px_rgba(0,0,0,0.3)] border border-white/20">
            {{ showMetricsPanel ? '[ VIEW_EQUITY_CURVE ]' : '[ OPEN_STRATEGY_METRICS ]' }}
          </div>
        </button>

        <!-- EDIT MODE ICON BUTTON (ONLY VISIBLE WHEN METRICS PANEL IS ACTIVE) -->
        <button v-if="showMetricsPanel && !showWinrateCurve"
                @click="isEditMode = !isEditMode" 
                class="group relative flex items-center justify-center w-10 h-10 transition-all border"
                :class="isEditMode ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] opacity-100' : 'border-transparent text-white opacity-60 hover:opacity-100 hover:border-white/10 hover:bg-white/5'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <div class="absolute bottom-full mb-3 px-3 py-1.5 bg-white text-black text-[9px] font-mono tracking-widest uppercase font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-[0_10px_20px_rgba(0,0,0,0.3)] border border-white/20">
            {{ isEditMode ? '[ EXIT_EDIT_MODE ]' : '[ EDIT_MODE ]' }}
          </div>
        </button>

        <!-- ROBUSTNESS DIAGNOSTICS -->
        <button v-if="!showMetricsPanel && !showWinrateCurve"
                @click="handleRobustnessDiagnosticsClick"
                class="group relative flex items-center justify-center w-10 h-10 transition-all border"
                :class="[
                  showDistribution3D ? 'bg-white/10 opacity-100 border-white/20' : 'border-transparent text-white',
                  hasEnoughTradesForDiagnostics ? 'opacity-60 hover:opacity-100 hover:border-white/10 hover:bg-white/5' : 'opacity-25 cursor-not-allowed'
                ]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
            <path d="M3 3v16a2 2 0 0 0 2 2h16" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-6" />
            <path d="M3 12c3-4 6-8 10-8s7 6 9 10" stroke-dasharray="3,3" />
          </svg>
          <!-- Normal hover label -->
          <div class="absolute bottom-full mb-3 px-3 py-1.5 bg-white text-black text-[9px] font-mono tracking-widest uppercase font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-[0_10px_20px_rgba(0,0,0,0.2)] border border-white/20">
            {{ hasEnoughTradesForDiagnostics ? '[ ROBUSTNESS_DIAGNOSTICS ]' : '[ MIN. 20 TRADES REQUIRED ]' }}
          </div>
        </button>

        <!-- BOOTSTRAP / PNL HISTOGRAM TOGGLE -->
        <button v-if="showDistribution3D && !showWinrateCurve"
                @click="toggleRobustnessHistogram"
                class="group relative flex items-center justify-center w-10 h-10 transition-all border border-transparent text-white opacity-60 hover:opacity-100 hover:border-white/10 hover:bg-white/5"
                :class="showRobustnessHistogram ? 'bg-white/10 opacity-100 border-white/20' : ''">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
            <path d="M4 19V5" />
            <path d="M4 19h16" />
            <rect x="7" y="12" width="2.5" height="7" />
            <rect x="11" y="8" width="2.5" height="11" />
            <rect x="15" y="10" width="2.5" height="9" />
          </svg>
          <div class="absolute bottom-full mb-3 px-3 py-1.5 bg-white text-black text-[9px] font-mono tracking-widest uppercase font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-[0_10px_20px_rgba(0,0,0,0.2)] border border-white/20">
            {{ showRobustnessHistogram ? '[ VIEW_FITTED_PDF ]' : '[ VIEW_PNL_HISTOGRAM ]' }}
          </div>
        </button>

        <!-- QQ PLOT TOGGLE (Only when Robustness Diagnostics is active) -->
        <button v-if="showDistribution3D && !showWinrateCurve"
                @click="showQQPlot = !showQQPlot; if (showQQPlot) { showRobustnessExplanations = false; showRobustnessHistogram = false }"
                class="group relative flex items-center justify-center w-10 h-10 transition-all border border-transparent text-white opacity-60 hover:opacity-100 hover:border-white/10 hover:bg-white/5"
                :class="showQQPlot ? 'bg-white/10 opacity-100 border-white/20' : ''">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
            <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" stroke-dasharray="3,3" />
            <circle cx="7" cy="17" r="1.5" fill="currentColor" />
            <circle cx="11" cy="13" r="1.5" fill="currentColor" />
            <circle cx="14" cy="10" r="1.5" fill="currentColor" />
            <circle cx="17" cy="7" r="1.5" fill="currentColor" />
          </svg>
          <div class="absolute bottom-full mb-3 px-3 py-1.5 bg-white text-black text-[9px] font-mono tracking-widest uppercase font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-[0_10px_20px_rgba(0,0,0,0.2)] border border-white/20">
            {{ showQQPlot ? '[ VIEW_FITTED_PDF ]' : '[ VIEW_QQ_PLOT ]' }}
          </div>
        </button>

        <!-- EXPLANATIONS & SIMULATIONS -->
        <button v-if="showDistribution3D && !showWinrateCurve"
                @click="showRobustnessExplanations = !showRobustnessExplanations; if (showRobustnessExplanations) { showQQPlot = false; showRobustnessHistogram = false }"
                class="group relative flex items-center justify-center w-10 h-10 transition-all border border-transparent text-white opacity-60 hover:opacity-100 hover:border-white/10 hover:bg-white/5"
                :class="showRobustnessExplanations ? 'bg-white/10 opacity-100 border-white/20' : ''">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <div class="absolute bottom-full mb-3 px-3 py-1.5 bg-white text-black text-[9px] font-mono tracking-widest uppercase font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-[0_10px_20px_rgba(0,0,0,0.2)] border border-white/20">
            {{ showRobustnessExplanations ? '[ HIDE_EXPLANATIONS ]' : '[ VIEW_EXPLANATIONS ]' }}
          </div>
        </button>

        <!-- RE-CENTER VIEW -->
        <button @click="resetView" 
                class="group relative flex items-center justify-center w-10 h-10 text-white opacity-60 hover:opacity-100 border border-transparent hover:border-white/10 transition-all hover:bg-white/5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <div class="absolute bottom-full mb-3 px-3 py-1.5 bg-white text-black text-[9px] font-mono tracking-widest uppercase font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-[0_10px_20px_rgba(0,0,0,0.3)] border border-white/20">
            [ RE-CENTER_VIEW ]
          </div>
        </button>
       

        <!-- SET INITIAL DEPOSIT -->
        <button v-if="!showMetricsPanel && !showDistribution3D && !showWinrateCurve"
                @click="showInitialDepositModal = true" 
                class="group relative flex items-center justify-center w-10 h-10 text-white opacity-60 hover:opacity-100 border border-transparent hover:border-white/10 transition-all hover:bg-white/5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
          <div class="absolute bottom-full mb-3 px-3 py-1.5 bg-white text-black text-[9px] font-mono tracking-widest uppercase font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-[0_10px_20px_rgba(0,0,0,0.3)] border border-white/20">
            [ SET_INITIAL_DEPOSIT ]
          </div>
        </button>

        <!-- EQUITY CURVE SIMULATOR -->
        <button v-if="!showMetricsPanel && !showDistribution3D && !showWinrateCurve"
                @click="openSimulator" 
                class="group relative flex items-center justify-center w-10 h-10 text-white opacity-60 hover:opacity-100 border border-transparent hover:border-white/10 transition-all hover:bg-white/5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
            <path d="M3 3v18h18" />
            <path d="M7 14l3-3 4 4 6-6" />
            <path d="M7 10l3-4 4 6 6-4" opacity="0.4" />
          </svg>
          <div class="absolute bottom-full mb-3 px-3 py-1.5 bg-white text-black text-[9px] font-mono tracking-widest uppercase font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-[0_10px_20px_rgba(0,0,0,0.3)] border border-white/20">
            [ EQUITY_CURVE_SIMULATOR ]
          </div>
        </button>

        <!-- WINRATE TARGET MENU BUTTON -->
        <button v-if="!showMetricsPanel && !showDistribution3D && !showCalendarMode"
                @click="showWinrateMenu = true" 
                class="group relative flex items-center justify-center w-10 h-10 transition-all border hover:border-white/10 hover:bg-white/5"
                :class="showWinrateMenu ? 'bg-white/10 opacity-100 border-white/20 text-white' : 'border-transparent text-white opacity-60 hover:opacity-100'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          <div class="absolute bottom-full mb-3 px-3 py-1.5 bg-white text-black text-[9px] font-mono tracking-widest uppercase font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-[0_10px_20px_rgba(0,0,0,0.3)] border border-white/20">
            {{ isRu ? '[ ВЫБОР_ЦЕЛИ_СИСТЕМЫ ]' : '[ SELECT_SYSTEM_TARGET ]' }}
          </div>
        </button>

        <!-- BROKER / EXCHANGE CONNECTORS -->
        <button v-if="!showMetricsPanel && !showDistribution3D"
                @click="showBrokerConnectPanel = true"
                class="group relative flex items-center justify-center w-10 h-10 text-white opacity-60 hover:opacity-100 border border-transparent hover:border-white/10 transition-all hover:bg-white/5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          <div class="absolute bottom-full mb-3 px-3 py-1.5 bg-white text-black text-[9px] font-mono tracking-widest uppercase font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-[0_10px_20px_rgba(0,0,0,0.3)] border border-white/20">
            {{ isRu ? '[ ПОДКЛЮЧИТЬ_БРОКЕР_API ]' : '[ CONNECT_BROKER_API ]' }}
          </div>
        </button>

        <!-- PURGE DIARY RECORDS -->
        <button v-if="!showMetricsPanel && !showDistribution3D"
                @click="showClearConfirmation = true" 
                class="group relative flex items-center justify-center w-10 h-10 text-red-500/60 hover:text-red-500 border border-transparent hover:border-red-500/20 transition-all hover:bg-red-500/5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          <div class="absolute bottom-full mb-3 px-3 py-1.5 bg-red-600 text-white text-[9px] font-mono tracking-widest uppercase font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-[0_10px_20px_rgba(255,0,0,0.3)] border border-white/20">
            [ PURGE_DIARY_RECORDS ]
          </div>
        </button>
      </div>
    </div>

    <!-- RIGHT PANEL -->
    <div v-if="!showMetricsPanel && !showRobustnessExplanations"
         class="absolute right-12 top-1/2 -translate-y-1/2 z-[110] flex flex-col items-center justify-center pointer-events-none">
      <div class="pointer-events-auto flex flex-col items-center space-y-2 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/20 p-2 relative">
        <!-- Corner Accents -->
        <div class="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-white/40"></div>
        <div class="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-white/40"></div>
        
        <template v-if="!showDistribution3D">
          <!-- CALENDAR MODE TOGGLE -->
          <button @click="showCalendarMode = !showCalendarMode" 
                  class="group relative flex items-center justify-center w-10 h-10 text-white transition-all border hover:border-white/10 hover:bg-white/5"
                  :class="showCalendarMode ? 'bg-white/10 opacity-100 border-white/20' : 'border-transparent opacity-60 hover:opacity-100'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <div class="absolute right-full mr-3 px-3 py-1.5 bg-white text-black text-[9px] font-mono tracking-widest uppercase font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-[0_10px_20px_rgba(0,0,0,0.3)] border border-white/20">
              {{ showCalendarMode ? '[ VIEW_EQUITY_CURVE ]' : '[ VIEW_CALENDAR_MODE ]' }}
            </div>
          </button>

          <!-- WINRATE CURVE TOGGLE -->
          <button v-if="!showCalendarMode"
                  @click="showWinrateCurve = !showWinrateCurve"
                  class="group relative flex items-center justify-center w-10 h-10 text-white transition-all border hover:border-white/10 hover:bg-white/5"
                  :class="showWinrateCurve ? 'bg-white/10 opacity-100 border-white/20' : 'border-transparent opacity-60 hover:opacity-100'">
            <span class="text-[11px] font-black font-mono">%</span>
            <div class="absolute right-full mr-3 px-3 py-1.5 bg-white text-black text-[9px] font-mono tracking-widest uppercase font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-[0_10px_20px_rgba(0,0,0,0.3)] border border-white/20">
              {{ showWinrateCurve ? '[ HIDE_WINRATE_CURVE ]' : '[ SHOW_WINRATE_CURVE ]' }}
            </div>
          </button>

          <!-- VALUE MODE TOGGLE (only in calendar mode) -->
          <button v-if="showCalendarMode"
                  @click="calendarValueMode = calendarValueMode === 'currency' ? 'percentage' : 'currency'"
                  class="group relative flex items-center justify-center w-10 h-10 text-white transition-all border border-transparent opacity-60 hover:opacity-100 hover:border-white/10 hover:bg-white/5">
            <span class="text-[11px] font-black font-mono">{{ calendarValueMode === 'currency' ? '%' : '$' }}</span>
            <div class="absolute right-full mr-3 px-3 py-1.5 bg-white text-black text-[9px] font-mono tracking-widest uppercase font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-[0_10px_20px_rgba(0,0,0,0.3)] border border-white/20">
              {{ calendarValueMode === 'currency' ? '[ SHOW_PERCENT ]' : '[ SHOW_CURRENCY ]' }}
            </div>
          </button>

          <!-- BENCHMARK / RISK-FREE RATE TOGGLE -->
          <button v-if="!showCalendarMode"
                  @click="showBenchmarkCurves = !showBenchmarkCurves"
                  class="group relative flex items-center justify-center w-10 h-10 transition-all border hover:border-white/10 hover:bg-white/5"
                  :class="showBenchmarkCurves ? 'bg-white/10 opacity-100 border-white/20 text-white' : 'border-transparent text-white opacity-60 hover:opacity-100'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              <path d="M2 17L6 17 9 8 15 17 18 17 22 17" stroke-dasharray="2,2" opacity="0.5"/>
            </svg>
            <div class="absolute right-full mr-3 px-3 py-1.5 bg-white text-black text-[9px] font-mono tracking-widest uppercase font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-[0_10px_20px_rgba(0,0,0,0.3)] border border-white/20">
              {{ showBenchmarkCurves ? '[ HIDE_BENCHMARKS ]' : '[ SHOW_BENCHMARKS ]' }}
            </div>
          </button>
        </template>

        <template v-else-if="showDistribution3D && !showRobustnessHistogram && !showQQPlot">
          <!-- NORMAL DIST TOGGLE -->
          <button @click="showRobustnessNormalDist = !showRobustnessNormalDist; if (showRobustnessNormalDist) showRobustnessTDist = false"
                  class="group relative flex items-center justify-center w-10 h-10 transition-all border border-transparent text-white opacity-60 hover:opacity-100 hover:border-white/10 hover:bg-white/5"
                  :class="showRobustnessNormalDist ? 'bg-white/10 opacity-100 border-white/20' : ''">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
              <path d="M4 16c2-4 4-8 8-8s6 4 8 8" stroke-dasharray="3,3" />
            </svg>
            <div class="absolute right-full mr-3 px-3 py-1.5 bg-white text-black text-[9px] font-mono tracking-widest uppercase font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-[0_10px_20px_rgba(0,0,0,0.3)] border border-white/20">
              {{ showRobustnessNormalDist ? '[ HIDE_NORMAL_DIST ]' : '[ SHOW_NORMAL_DIST ]' }}
            </div>
          </button>

          <!-- T DIST TOGGLE -->
          <button @click="showRobustnessTDist = !showRobustnessTDist; if (showRobustnessTDist) showRobustnessNormalDist = false"
                  class="group relative flex items-center justify-center w-10 h-10 transition-all border border-transparent nier-text-primary opacity-60 hover:opacity-100 hover:border-black/10 dark:hover:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                  :class="showRobustnessTDist ? 'bg-black/10 dark:bg-white/10 opacity-100 border-black/20 dark:border-white/20' : ''">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
              <path d="M4 16c2-6 4-10 8-10s6 4 8 10" />
            </svg>
            <div class="absolute right-full mr-3 px-3 py-1.5 nier-bg-inverted nier-text-primary text-[9px] font-mono tracking-widest uppercase font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-[0_10px_20px_rgba(0,0,0,0.3)] border border-white/20 dark:border-black/20">
              {{ showRobustnessTDist ? '[ HIDE_STUDENT_T_DIST ]' : '[ SHOW_STUDENT_T_DIST ]' }}
            </div>
          </button>
        </template>
      </div>
    </div>

    <!-- CALENDAR OVERLAY -->
    <ExCalendarMode 
      v-if="showCalendarMode"
      :trades="getFilteredTrades()"
      :initial-deposit="props.initialBalance || tradeStore.getInitialDeposit(selectedStrategyId) || 10000"
      :value-mode="calendarValueMode"
      :locale="locale"
    />

    <Teleport to="body">
      <Transition name="page-reify">
        <ExTradeEntry v-if="isTradeEntryOpen" 
                      class="fixed inset-0 z-[2000]"
                      @close="isTradeEntryOpen = false" 
                      @addTrade="isTradeEntryOpen = false" />
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="page-reify">
        <ExBrokerConnectPanel v-if="showBrokerConnectPanel"
                              :strategy-id="selectedStrategyId"
                              @close="showBrokerConnectPanel = false" />
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="page-reify">
        <ExEquityCurveSimulator 
          v-if="showSimulator" 
          @close="showSimulator = false"
          :historical-trades="getFilteredTrades()"
          :initial-equity="props.initialBalance || tradeStore.getInitialDeposit(selectedStrategyId)"
          :default-win-rate="strategyMetrics?.winRate || 50"
          :default-r-r="activeRiskManagement.riskRewardRatio || strategyMetrics?.riskRewardRatio || 1.5"
          :default-risk-per-trade="simulatorDefaultRiskPerTrade"
        />
      </Transition>
    </Teleport>
    <ExPaywallOverlay :isOpen="showPaywall" @close="showPaywall = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { invoke } from '@tauri-apps/api/core'
import { useThemeStore } from '~/features/store/useTheme'
import { useStrategyTradesStore } from '~/features/store/useStrategyTrades'
import { useAppBootStore } from '~/features/store/useAppBoot'
import { loadFromDisk, saveToDisk } from '~/shared/diskStorage'
import ExTradeEntry from '~/widgets/genesis/ui/ExTradeEntry.vue'
import ExPanel from '~/shared/ui/ExPanel.vue'
import ExButton from '~/shared/ui/ExButton.vue'
import ExNTtooltip from '~/shared/ui/ExNTtooltip.vue'
import ExGothicCorners from '~/shared/ui/ExGothicCorners.vue'
import ExTooltip from '~/shared/ui/ExTooltip.vue'
import ExEquityCurveSimulator from './ExEquityCurveSimulator.vue'
import ExPaywallOverlay from './ExPaywallOverlay.vue'
import ExBrokerConnectPanel from '~/widgets/broker-connect/ui/ExBrokerConnectPanel.vue'
import ExCalendarMode from './components/ExCalendarMode.vue'
import ExEquityCurveMetricsPanel from './components/ExEquityCurveMetricsPanel.vue'
import { useEquityCurveMetricsPanel } from '../model/useEquityCurveMetricsPanel'
import { useAuthStore } from '~/entities/user/auth.store'
import { useI18n } from '~/shared/i18n/useI18n'
import { SP500_BENCHMARK_RATE } from '~/shared/constants'
import { resolveRiskManagementForStrategy, riskValueToDollars } from '~/widgets/genesis/model/riskManagement'
import {
  isSyncableBrokerConnection,
  syncBrokerConnectionTrades,
  type StoredBrokerConnection
} from '~/utils/brokerTradeSync'

const authStore = useAuthStore()
const sp500BenchmarkRate = ref(SP500_BENCHMARK_RATE)
const strategyBeta = ref(0.85)
const riskFreeRate = ref(5.00)

interface StrategyBenchmarkMetrics {
  benchmarkRate: number
  beta: number
  riskFreeRate: number
  isFallback: boolean
  updatedAt: string
}

const BENCHMARK_METRICS_CACHE_KEY = 'strategy_benchmark_metrics_v1'
const BROKER_CONNECTIONS_STORAGE_KEY = 'broker_connections_v1'
const benchmarkMetricsByStrategy = ref<Record<string, StrategyBenchmarkMetrics>>({})

const themeStore = useThemeStore()
const tradeStore = useStrategyTradesStore()
const { locale } = useI18n()
const isRu = computed(() => locale.value === 'ru')
const route = useRoute()
const router = useRouter()
const isTradeEntryOpen = ref(route.query.entry === 'true')

watch(isTradeEntryOpen, (isOpen) => {
  router.push({ 
    query: { 
      ...route.query, 
      entry: isOpen ? 'true' : undefined 
    } 
  })
})

// --- STATISTICAL ROBUSTNESS UTILITIES --- //
const erfInverse = (x: number): number => {
  const a = 0.147;
  const logTerm = Math.log(1 - x * x);
  const term1 = 2 / (Math.PI * a) + logTerm / 2;
  const innerSqrt = Math.sqrt(term1 * term1 - logTerm / a);
  const sgn = x < 0 ? -1 : 1;
  return sgn * Math.sqrt(innerSqrt - term1);
};

const normalQuantile = (p: number): number => {
  const clamped = Math.max(1e-9, Math.min(1 - 1e-9, p));
  return Math.sqrt(2) * erfInverse(2 * clamped - 1);
};

const logGamma = (z: number): number => {
  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  const x = z;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507381424447053,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  let sum = c[0] ?? 1.0;
  for (let i = 1; i < 9; i++) {
    const val = c[i];
    if (val !== undefined) {
      sum += val / (x + i - 1);
    }
  }
  const t = x + 7.5;
  return (x - 0.5) * Math.log(t) - t + 0.5 * Math.log(2 * Math.PI) + Math.log(sum);
};

const normalPDF = (x: number, mean: number, std: number): number => {
  if (std <= 0) return 0;
  const exponent = -Math.pow(x - mean, 2) / (2 * std * std);
  return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
};

const erfApprox = (x: number): number => {
  const sign = x < 0 ? -1 : 1
  const absX = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * absX)
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-absX * absX)
  return sign * y
}

const normalCDF = (x: number): number => 0.5 * (1 + erfApprox(x / Math.sqrt(2)))

const studentTPDF = (x: number, mean: number, scale: number, nu: number): number => {
  if (scale <= 0 || nu <= 0) return 0;
  const coef = Math.exp(logGamma((nu + 1) / 2) - logGamma(nu / 2)) / (scale * Math.sqrt(Math.PI * nu));
  const factor = 1 + Math.pow((x - mean) / scale, 2) / nu;
  return coef * Math.pow(factor, -(nu + 1) / 2);
};

const matrixNodes = ref<any[]>([])
const matrixConnections = ref<any[]>([])
const loadMatrixData = async () => {
  try {
    const appBootStore = useAppBootStore()
    const data = appBootStore.genesisMatrixCache || await loadFromDisk<{ nodes: any[], connections?: any[] }>('genesis_matrix_v2')
    if (data && data.nodes) {
      matrixNodes.value = data.nodes
      matrixConnections.value = data.connections || []
    }
  } catch (err) {
    console.error('Failed to load matrix data:', err)
  }
}

watch([matrixNodes, () => tradeStore.isLoading], ([nodes, loading]) => {
  if (loading) return
  const cores = (nodes as any[])
    .filter((n: any) => n.type === 'strategy' || n.type === 'system')
    .map((n: any) => ({
      id: n.id,
      name: (n.params?.customName || n.label).toUpperCase()
    }))
  tradeStore.syncStrategies(cores)
}, { immediate: true, deep: true })

const selectedStrategyId = computed({
  get: () => tradeStore.selectedStrategyId,
  set: (val) => { tradeStore.selectedStrategyId = val }
})

const flattenMatrixNodes = (nodes: any[] = []) => {
  const list: any[] = []
  const walk = (items: any[] = []) => {
    items.forEach((node: any) => {
      list.push(node)
      if (node.subGraph?.nodes) walk(node.subGraph.nodes)
    })
  }
  walk(nodes)
  return list
}

const flattenMatrixConnections = (nodes: any[] = [], rootConnections: any[] = []) => {
  const list: any[] = [...(rootConnections || [])]
  const walk = (items: any[] = []) => {
    items.forEach((node: any) => {
      if (!node.subGraph) return
      list.push(...(node.subGraph.connections || []))
      walk(node.subGraph.nodes || [])
    })
  }
  walk(nodes)
  return list
}

const activeRiskManagement = computed(() => {
  return resolveRiskManagementForStrategy(
    flattenMatrixNodes(matrixNodes.value),
    flattenMatrixConnections(matrixNodes.value, matrixConnections.value),
    selectedStrategyId.value
  )
})

const activeRiskPerTradeDollars = computed(() => {
  const initialDeposit = props.initialBalance || tradeStore.getInitialDeposit(selectedStrategyId.value) || 1000
  return riskValueToDollars(
    activeRiskManagement.value.riskPerTradeValue,
    activeRiskManagement.value.riskPerTradeUnit,
    initialDeposit
  )
})

const simulatorDefaultRiskPerTrade = computed(() => {
  const risk = activeRiskManagement.value
  if (risk.riskPerTradeUnit === '%' && risk.riskPerTradeValue !== null) return risk.riskPerTradeValue

  const capital = props.initialBalance || tradeStore.getInitialDeposit(selectedStrategyId.value) || 10000
  const configuredRisk = activeRiskPerTradeDollars.value
  if (Number.isFinite(configuredRisk) && capital > 0) return (configuredRisk / capital) * 100
  return ((strategyMetrics.value?.avgLoss || 0) / capital) * 100
})

const showStrategyMenu = ref(false)
const showInitialDepositModal = ref(false)
const showBenchmarkModal = ref(false)
const showClearConfirmation = ref(false)
const showMetricsPanel = ref(false)
const showDistribution3D = ref(false)
const showBenchmarkCurves = ref(false)
const showQQPlot = ref(false)
const showRobustnessExplanations = ref(false)
const showRobustnessNormalDist = ref(false)
const showRobustnessTDist = ref(true)
const showRobustnessHistogram = ref(false)
const showRobustnessWarning = ref(false)
const showSimulator = ref(false)
const showPaywall = ref(false)
const showBrokerConnectPanel = ref(false)

const openSimulator = () => {
  showSimulator.value = true
}

const showCalendarMode = ref(false)
const showWinrateCurve = ref(false)
const showWinrateMenu = ref(false)
const selectedWinrateNodeId = ref<string | null>(null)
const winrateTargetSearch = ref('')
const winrateTargetFilter = ref<'all' | 'scenario' | 'condition'>('all')
const winrateTargetFilters: { id: 'all' | 'scenario' | 'condition', label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'scenario', label: 'SCENARIO' },
  { id: 'condition', label: 'CONDITION' }
]

interface WinrateTargetNode {
  id: string
  name: string
  description?: string
  type: 'scenario' | 'condition'
  typeLabel: string
  parentScenarioName?: string
}

const tradeMatchesWinrateTarget = (trade: any, targetId: string) => {
  return trade.boardScenarioEntry?.id === targetId ||
    trade.boardScenarioExit?.id === targetId ||
    trade.boardScenarioEntryId === targetId ||
    trade.boardScenarioExitId === targetId ||
    trade.boardConditions?.some((condition: any) => (typeof condition === 'string' ? condition === targetId : condition?.id === targetId)) ||
    trade.boardScenarioEntry?.info?.conditions?.some((condition: any) => condition?.id === targetId) ||
    trade.boardScenarioExit?.info?.conditions?.some((condition: any) => condition?.id === targetId) ||
    trade.scenarios?.some((scenario: any) => scenario?.id === targetId || scenario?.conditions?.some((condition: any) => condition?.id === targetId))
}

const getFilteredTrades = (strategyId?: string) => {
  const sId = strategyId || selectedStrategyId.value
  const baseTrades = props.trades || tradeStore.getTradesForStrategy(sId) || []
  if (selectedWinrateNodeId.value && sId === selectedStrategyId.value) {
    return baseTrades.filter((t: any) => tradeMatchesWinrateTarget(t, selectedWinrateNodeId.value!))
  }
  return baseTrades
}

const getCurrentWinrateTrades = () => props.trades || tradeStore.getTradesForStrategy(selectedStrategyId.value) || []

const addWinrateTarget = (targets: Map<string, WinrateTargetNode>, target: Partial<WinrateTargetNode> | null | undefined) => {
  if (!target?.id) return
  const name = String(target.name || target.id).trim()
  if (!name) return
  const key = target.type === 'condition' && target.parentScenarioName ? `${target.parentScenarioName}_${target.id}` : target.id;
  targets.set(key, {
    id: target.id,
    name,
    description: target.description,
    type: target.type || 'condition',
    typeLabel: (target.type || 'condition').toUpperCase(),
    parentScenarioName: target.parentScenarioName
  })
}

const getConditionDesc = (condition: any) => {
  if (typeof condition === 'string') {
    const matrixNode = matrixNodes.value.find(n => n.id === condition)
    return matrixNode?.params?.description || matrixNode?.params?.value || matrixNode?.params?.info || ''
  }
  return condition?.info?.description || condition?.description || ''
}

const getScenarioName = (scenario: any) => {
  return scenario?.info?.name || scenario?.name || scenario?.label || scenario?.id
}

const getConditionName = (condition: any) => {
  if (typeof condition === 'string') {
    const matrixNode = matrixNodes.value.find(n => n.id === condition)
    return matrixNode?.params?.customName || matrixNode?.label || condition
  }
  return condition?.info?.name || condition?.name || condition?.label || condition?.id
}

const winrateMenuNodes = computed(() => {
  const targets = new Map<string, WinrateTargetNode>()
  getCurrentWinrateTrades().forEach((trade: any) => {
    ;[trade.boardScenarioEntry, trade.boardScenarioExit].forEach((scenario: any) => {
      if (!scenario?.id) return
      const sName = getScenarioName(scenario)
      addWinrateTarget(targets, {
        id: scenario.id,
        name: sName,
        type: 'scenario'
      })
      ;(scenario.info?.conditions || []).forEach((condition: any) => {
        const id = typeof condition === 'string' ? condition : condition?.id
        addWinrateTarget(targets, {
          id,
          name: getConditionName(condition),
          description: getConditionDesc(condition),
          type: 'condition',
          parentScenarioName: sName
        })
      })
    })
  })

  const query = winrateTargetSearch.value.trim().toLowerCase()
  const activeFilter = winrateTargetFilter.value

  return Array.from(targets.values()).filter(node => {
    const matchesFilter = activeFilter === 'all' || node.type === activeFilter
    const matchesSearch = !query || node.name.toLowerCase().includes(query) || node.typeLabel.toLowerCase().includes(query)
    return matchesFilter && matchesSearch
  }).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'scenario' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
})

const groupedWinrateMenuNodes = computed(() => {
  const groups = new Map<string, WinrateTargetNode[]>()
  winrateMenuNodes.value.forEach(node => {
    if (node.type !== 'condition') return
    if (!node.parentScenarioName) return // Skip if no parent scenario
    const groupName = node.parentScenarioName
    if (!groups.has(groupName)) groups.set(groupName, [])
    groups.get(groupName)!.push(node)
  })
  return Array.from(groups.entries())
    .map(([groupName, nodes]) => ({ groupName, nodes }))
    .sort((a, b) => a.groupName.localeCompare(b.groupName))
})

const selectedWinrateTarget = computed(() => {
  if (!selectedWinrateNodeId.value) return null
  return winrateMenuNodes.value.find(node => node.id === selectedWinrateNodeId.value) || null
})
const calendarValueMode = ref<'currency' | 'percentage'>('currency')

const hasEnoughTradesForDiagnostics = computed(() => diagnosticStats.value.pnls.length >= 20)

const robustnessWarningTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const handleRobustnessDiagnosticsClick = () => {
  if (!hasEnoughTradesForDiagnostics.value) {
    // Always reset the timer so repeated clicks restart the 5s countdown
    if (robustnessWarningTimer.value !== null) clearTimeout(robustnessWarningTimer.value as any)
    showRobustnessWarning.value = true
    robustnessWarningTimer.value = setTimeout(() => {
      showRobustnessWarning.value = false
      robustnessWarningTimer.value = null
    }, 5000)
    return
  }
  showDistribution3D.value = !showDistribution3D.value
  showMetricsPanel.value = false
}

const toggleRobustnessHistogram = () => {
  const nextValue = !showRobustnessHistogram.value
  showRobustnessHistogram.value = nextValue
  if (nextValue) {
    showQQPlot.value = false
    showRobustnessExplanations.value = false
  }
}

const metricsPanel = useEquityCurveMetricsPanel()
const { isEditMode } = metricsPanel

const depositInput = ref(1000)
const benchmarkInput = ref(sp500BenchmarkRate.value)

const strategies = computed(() => tradeStore.strategies)
const selectedStrategy = computed(() => {
  return tradeStore.strategies.find(s => s.id === selectedStrategyId.value) || tradeStore.strategies[0]
})

const getBenchmarkStrategyIds = () => {
  const matrixStrategyIds = matrixNodes.value
    .filter((n: any) => n.type === 'strategy' || n.type === 'system')
    .map((n: any) => n.id)

  return Array.from(new Set([
    'MAIN_DIARY',
    ...tradeStore.strategies.map(s => s.id),
    ...Object.keys(tradeStore.tradesByStrategy),
    ...matrixStrategyIds
  ].filter(Boolean)))
}

const getBenchmarkReturnsForStrategy = (strategyId: string) => {
  const initialDep = tradeStore.getInitialDeposit(strategyId) || 10000
  const trades = getFilteredTrades(strategyId)

  return trades.map(t => {
    const pnlVal = t.profitInCurrency ?? t.result ?? (t as any).pnl ?? 0
    const rawVal = typeof pnlVal === 'string' ? parseFloat(pnlVal) : Number(pnlVal)
    const val = Number.isFinite(rawVal) ? rawVal : 0
    const pnl = (t.profitInCurrency === undefined || t.profitInCurrency === null || t.profitInCurrency === 0) &&
      Math.abs(val) < 100 &&
      initialDep > 1000
      ? (val / 100) * initialDep
      : val

    return initialDep > 0 ? pnl / initialDep : 0
  })
}

const applyBenchmarkMetricsForStrategy = (strategyId: string) => {
  const cached = benchmarkMetricsByStrategy.value[strategyId]
  sp500BenchmarkRate.value = cached?.benchmarkRate ?? SP500_BENCHMARK_RATE
  strategyBeta.value = cached?.beta ?? 0.85
  riskFreeRate.value = cached?.riskFreeRate ?? 5.00
  benchmarkInput.value = sp500BenchmarkRate.value
}

const loadBenchmarkMetricsCache = async () => {
  const cached = await loadFromDisk<Record<string, StrategyBenchmarkMetrics>>(BENCHMARK_METRICS_CACHE_KEY)
  if (cached && typeof cached === 'object') {
    benchmarkMetricsByStrategy.value = cached
    applyBenchmarkMetricsForStrategy(selectedStrategyId.value)
  }
}

const saveBenchmarkMetricsCache = async () => {
  await saveToDisk(BENCHMARK_METRICS_CACHE_KEY, benchmarkMetricsByStrategy.value)
}

const fetchRealtimeMetrics = async (strategyIds = getBenchmarkStrategyIds()) => {
  const ids = Array.from(new Set(strategyIds.filter(Boolean)))
  let cacheChanged = false

  for (const strategyId of ids) {
    try {
      const strategyReturns = getBenchmarkReturnsForStrategy(strategyId)
      const trades = getFilteredTrades(strategyId)
      
      let startTs: number | null = null
      let endTs: number | null = null
      
      if (trades && trades.length > 0) {
        const sortedTrades = [...trades].sort((a: any, b: any) => {
          const tA = new Date(a.dateEntry || a.date).getTime()
          const tB = new Date(b.dateEntry || b.date).getTime()
          return tA - tB
        })
        const firstTrade = sortedTrades[0]
        const lastTrade = sortedTrades[sortedTrades.length - 1]
        
        const firstDate = new Date(firstTrade.dateEntry || firstTrade.date)
        const lastDate = new Date(lastTrade.dateExit || lastTrade.dateEntry || lastTrade.date)
        
        if (!isNaN(firstDate.getTime()) && !isNaN(lastDate.getTime())) {
          startTs = Math.floor(firstDate.getTime() / 1000)
          endTs = Math.floor(lastDate.getTime() / 1000)
        }
      }

      const res: any = await invoke('get_benchmark_and_beta', { strategyReturns, strategyId, startTs, endTs })
      if (res && typeof res.benchmark_rate === 'number') {
        benchmarkMetricsByStrategy.value[strategyId] = {
          benchmarkRate: res.benchmark_rate,
          beta: typeof res.beta === 'number' ? res.beta : 0.85,
          riskFreeRate: typeof res.risk_free_rate === 'number' ? res.risk_free_rate : 5.00,
          isFallback: !!res.is_fallback,
          updatedAt: new Date().toISOString()
        }
        cacheChanged = true

        if (strategyId === selectedStrategyId.value) {
          applyBenchmarkMetricsForStrategy(strategyId)
        }
        
        if (res.is_fallback) {
        } else {
        }
      }
    } catch (err) {
      console.warn(`[ExEquityCurve] ⚠️ Rust worker invocation failed for ${strategyId}, using cached strategy benchmark metrics when available:`, err)
      if (strategyId === selectedStrategyId.value) {
        applyBenchmarkMetricsForStrategy(strategyId)
      }
    }
  }

  if (cacheChanged) {
    await saveBenchmarkMetricsCache()
  }

  if (!benchmarkMetricsByStrategy.value[selectedStrategyId.value]) {
    applyBenchmarkMetricsForStrategy(selectedStrategyId.value)
  }
}

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const getTradeRiskReward = (trade: any): number | null => {
  const entry = toFiniteNumber(trade?.entry, NaN)
  const stopLoss = toFiniteNumber(trade?.stopLoss, NaN)
  const takeProfit = toFiniteNumber(trade?.takeProfit, NaN)
  if (![entry, stopLoss, takeProfit].every(value => Number.isFinite(value) && value > 0)) return null

  const side = String(trade?.side || '').toLowerCase()
  const isShort = side.includes('short')
  const risk = isShort ? stopLoss - entry : entry - stopLoss
  const reward = isShort ? entry - takeProfit : takeProfit - entry
  const setupRR = risk > 0 ? reward / risk : 0

  return setupRR > 0 ? setupRR : null
}

const getTradeTimestamp = (trade: any): number => {
  const time = new Date(trade?.dateExit || trade?.date || 0).getTime()
  return Number.isFinite(time) ? time : 0
}

const getTradePnl = (trade: any, initialDeposit: number): number => {
  const currencyPnl = toFiniteNumber(trade?.profitInCurrency, NaN)
  const resultPct = toFiniteNumber(trade?.result, NaN)
  const rawPnl = toFiniteNumber(trade?.pnl, NaN)

  if (Number.isFinite(currencyPnl) && !(currencyPnl === 0 && Number.isFinite(resultPct) && resultPct !== 0)) {
    return currencyPnl
  }

  if (Number.isFinite(resultPct)) {
    return initialDeposit > 0 ? (resultPct / 100) * initialDeposit : 0
  }

  return Number.isFinite(rawPnl) ? rawPnl : 0
}

const mean = (values: number[]): number => {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

const sampleVariance = (values: number[], meanValue = mean(values)): number => {
  return values.length > 1
    ? values.reduce((sum, value) => sum + Math.pow(value - meanValue, 2), 0) / (values.length - 1)
    : 0
}

const percentile = (sortedValues: number[], p: number): number => {
  if (sortedValues.length === 0) return 0
  if (sortedValues.length === 1) return sortedValues[0] ?? 0

  const clamped = Math.max(0, Math.min(1, p))
  const idx = (sortedValues.length - 1) * clamped
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  const lowerValue = sortedValues[lower] ?? 0
  const upperValue = sortedValues[upper] ?? lowerValue
  return lowerValue + (upperValue - lowerValue) * (idx - lower)
}

const median = (sortedValues: number[]): number => percentile(sortedValues, 0.5)

const createSeededRandom = (seed: number): () => number => {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

const createNumberSeriesSeed = (values: number[], salt: number): number => {
  let seed = (2166136261 ^ salt) >>> 0
  values.forEach(value => {
    seed ^= Math.round(value * 100)
    seed = Math.imul(seed, 16777619) >>> 0
  })
  return seed || 1
}

const calculateWindowMaxDrawdownPct = (pnls: number[], initialDeposit: number): number => {
  let balance = initialDeposit
  let peak = initialDeposit
  let maxDd = 0

  pnls.forEach(pnl => {
    balance += pnl
    if (balance > peak) peak = balance
    const dd = peak > 0 ? ((peak - balance) / peak) * 100 : 0
    if (dd > maxDd) maxDd = dd
  })

  return maxDd
}

const linearRegressionSlope = (values: number[]): number => {
  const n = values.length
  if (n < 2) return 0

  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0

  values.forEach((y, x) => {
    sumX += x
    sumY += y
    sumXY += x * y
    sumX2 += x * x
  })

  const denominator = n * sumX2 - sumX * sumX
  return denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0
}

const calculateHurstExponent = (values: number[]): number => {
  if (values.length < 2) return 0.5

  const valueMean = mean(values)
  let cumulative = 0
  const deviations = values.map(value => {
    cumulative += value - valueMean
    return cumulative
  })

  const range = Math.max(...deviations) - Math.min(...deviations)
  const std = Math.sqrt(sampleVariance(values, valueMean))
  if (range <= 0 || std <= 0) return 0.5

  return Math.max(0, Math.min(1, Math.log(range / std) / Math.log(values.length)))
}

const calculateHurstStats = (values: number[]) => {
  if (values.length < 2) {
    return { exponent: 0.5, range: 0, stdDev: 0, rescaledRange: 0 }
  }

  const valueMean = mean(values)
  let cumulative = 0
  const deviations = values.map(value => {
    cumulative += value - valueMean
    return cumulative
  })

  const range = Math.max(...deviations) - Math.min(...deviations)
  const stdDev = Math.sqrt(sampleVariance(values, valueMean))
  const rescaledRange = stdDev > 0 ? range / stdDev : 0
  const exponent = rescaledRange > 0
    ? Math.max(0, Math.min(1, Math.log(rescaledRange) / Math.log(values.length)))
    : 0.5

  return { exponent, range, stdDev, rescaledRange }
}

const strategyMetrics = computed(() => {
  const currentTrades = getFilteredTrades()
  const initialDeposit = tradeStore.getInitialDeposit(selectedStrategyId.value) || 1000
  const riskManagement = activeRiskManagement.value
  const configuredRiskPerTrade = riskValueToDollars(
    riskManagement.riskPerTradeValue,
    riskManagement.riskPerTradeUnit,
    initialDeposit
  )

  const trades = [...currentTrades]
    .sort((a, b) => getTradeTimestamp(a) - getTradeTimestamp(b))
    .map(t => ({ ...t, pnlNum: getTradePnl(t, initialDeposit) }))

  const numTrades = trades.length;
  const winningTrades = trades.filter(t => t.pnlNum > 0);
  const losingTrades = trades.filter(t => t.pnlNum < 0);

  const numWin = winningTrades.length;
  const numLoss = losingTrades.length;

  const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnlNum, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnlNum, 0));
  const netProfit = grossProfit - grossLoss;

  const winRate = numTrades > 0 ? (numWin / numTrades) * 100 : 0;
  const lossRate = numTrades > 0 ? (numLoss / numTrades) * 100 : 0;

  const avgWin = numWin > 0 ? grossProfit / numWin : 0;
  const avgLoss = numLoss > 0 ? grossLoss / numLoss : 0;
  const avgTrade = numTrades > 0 ? netProfit / numTrades : 0;

  const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

  const plannedRRs = trades.map(getTradeRiskReward).filter((r): r is number => r !== null);
  const plannedRRCount = plannedRRs.length;
  const riskRewardRatio = plannedRRs.length > 0 ? plannedRRs.reduce((a,b)=>a+b,0)/plannedRRs.length : (riskManagement.riskRewardRatio || payoffRatio || 1);
  const realizedRR = payoffRatio;

  const expectedValue = numTrades > 0 ? ((numWin/numTrades) * avgWin) - ((numLoss/numTrades) * avgLoss) : 0;

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 99.9 : 0);
  const beWinRate = payoffRatio > 0 ? (1 / (1 + payoffRatio)) * 100 : 50;

  const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnlNum)) : 0;
  const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnlNum)) : 0;

  let maxConsWins = 0;
  let maxConsLosses = 0;
  let currWins = 0;
  let currLosses = 0;
  trades.forEach(t => {
    if (t.pnlNum > 0) {
      currWins++;
      currLosses = 0;
      if (currWins > maxConsWins) maxConsWins = currWins;
    } else if (t.pnlNum < 0) {
      currLosses++;
      currWins = 0;
      if (currLosses > maxConsLosses) maxConsLosses = currLosses;
    } else {
      currWins = 0;
      currLosses = 0;
    }
  });

  let totalHoldingHours = 0;
  let holdingCount = 0;
  trades.forEach(t => {
    if (t.date && t.dateExit) {
      const s = new Date(t.date).getTime();
      const e = new Date(t.dateExit).getTime();
      if (!isNaN(s) && !isNaN(e) && e >= s) {
        totalHoldingHours += (e - s) / (1000 * 60 * 60);
        holdingCount++;
      }
    }
  });
  const avgHoldingHours = holdingCount > 0 ? totalHoldingHours / holdingCount : 0;
  let avgHoldingTimeStr = '0h 0m';
  if (avgHoldingHours > 0) {
    const d = Math.floor(avgHoldingHours / 24);
    const h = Math.floor(avgHoldingHours % 24);
    const m = Math.floor((avgHoldingHours * 60) % 60);
    if (d > 0) avgHoldingTimeStr = `${d}d ${h}h ${m}m`;
    else avgHoldingTimeStr = `${h}h ${m}m`;
  }

  let firstDate = Date.now();
  let lastDate = Date.now();
  const validDates = trades.map(t => getTradeTimestamp(t)).filter(n => n > 0);
  if (validDates.length > 0) {
    firstDate = Math.min(...validDates);
    lastDate = Math.max(...validDates);
  }
  const spanDays = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24));
  const avgProfitPerDay = spanDays > 0 ? netProfit / spanDays : 0;
  const avgProfitPerWeek = avgProfitPerDay * 7;
  const avgProfitPerMonth = avgProfitPerDay * 30.44;

  let peak = initialDeposit;
  let peakTime = firstDate;
  let currentBal = initialDeposit;
  let maxDrawdownNum = 0;
  let maxDrawdownPct = 0;
  let totalDrawdownNum = 0;
  let ddCount = 0;
  let maxDDDurationDays = 0;

  trades.forEach(t => {
    const tradeTime = new Date(t.dateExit || t.date || Date.now()).getTime();
    currentBal += t.pnlNum;
    if (currentBal > peak) {
      peak = currentBal;
      peakTime = tradeTime;
    } else {
      const ddNum = peak - currentBal;
      const ddPct = (ddNum / peak) * 100;
      if (ddNum > maxDrawdownNum) {
        maxDrawdownNum = ddNum;
        maxDrawdownPct = ddPct;
        maxDDDurationDays = Math.max(0, (tradeTime - peakTime) / (1000 * 60 * 60 * 24));
      }
      totalDrawdownNum += ddPct;
      ddCount++;
    }
  });

  const avgDrawdownPct = ddCount > 0 ? totalDrawdownNum / ddCount : 0;
  const drawdownDurationStr = maxDDDurationDays > 0 ? `${Math.round(maxDDDurationDays)}d` : '0d';

  const recoveryFactor = maxDrawdownNum > 0 ? netProfit / maxDrawdownNum : (netProfit > 0 ? 99.9 : 0);
  const returnOnCapital = initialDeposit > 0 ? (netProfit / initialDeposit) * 100 : 0;

  const returnPerTrade = avgTrade;
  let totalRisk = 0;
  let riskCount = 0;
  trades.forEach(t => {
    const entry = toFiniteNumber(t.entry, 0);
    const sl = toFiniteNumber(t.stopLoss, 0);
    const size = toFiniteNumber(t.size, 1);
    if (entry > 0 && sl > 0) { totalRisk += Math.abs(entry - sl) * size; riskCount++; }
  });
  const riskPerTrade = riskCount > 0 ? totalRisk / riskCount : 0;
  const riskUnitForRuin = riskPerTrade > 0
    ? riskPerTrade
    : (Number.isFinite(configuredRiskPerTrade) ? configuredRiskPerTrade : (avgLoss || (initialDeposit * 0.01)));

  // --- ADVANCED METRICS CALCULATIONS --- //
  const returns = trades.map(t => initialDeposit > 0 ? t.pnlNum / initialDeposit : 0);
  const meanReturn = mean(returns);
  const varianceReturn = sampleVariance(returns, meanReturn);
  const stdReturn = Math.sqrt(varianceReturn);

  const annFactor = Math.sqrt(Math.min(252, numTrades * (365 / spanDays)));
  const endingBalance = initialDeposit + netProfit;
  const cagr = initialDeposit > 0 && endingBalance > 0 ? (Math.pow(endingBalance / initialDeposit, 365 / spanDays) - 1) * 100 : 0;
  const annStdPct = stdReturn * annFactor * 100;
  const sharpeRatio = annStdPct > 0 ? (cagr - riskFreeRate.value) / annStdPct : (cagr > riskFreeRate.value ? 9.99 : 0);

  const negReturns = returns.filter(r => r < 0);
  const downsideVariance = negReturns.length > 1 ? negReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / (negReturns.length - 1) : 0;
  const downsideStd = Math.sqrt(downsideVariance);
  const annDownsideStdPct = downsideStd * annFactor * 100;
  const sortinoRatio = annDownsideStdPct > 0 ? (cagr - riskFreeRate.value) / annDownsideStdPct : (cagr > riskFreeRate.value ? 9.99 : 0);

  const calmarRatio = maxDrawdownPct > 0 ? cagr / maxDrawdownPct : (cagr > 0 ? 99.9 : 0);
  const sterlingRatio = avgDrawdownPct > 0 ? cagr / avgDrawdownPct : (cagr > 0 ? 99.9 : 0);

  const posReturnsSum = returns.filter(r => r > 0).reduce((a, b) => a + b, 0);
  const negReturnsSum = Math.abs(returns.filter(r => r < 0).reduce((a, b) => a + b, 0));
  const allReturnsSum = returns.reduce((a, b) => a + b, 0);
  const positiveReturnsPct = posReturnsSum * 100;
  const negativeReturnsPct = negReturnsSum * 100;
  const allReturnsPct = allReturnsSum * 100;
  const omegaRatio = negReturnsSum > 0 ? posReturnsSum / negReturnsSum : (posReturnsSum > 0 ? 99.9 : 0);

  let ulcerSum = 0;
  let runPeak = initialDeposit;
  let runBal = initialDeposit;
  trades.forEach(t => {
    runBal += t.pnlNum;
    if (runBal > runPeak) runPeak = runBal;
    const dd = runPeak > 0 ? ((runPeak - runBal) / runPeak) * 100 : 0;
    ulcerSum += dd * dd;
  });
  const ulcerIndex = numTrades > 0 ? Math.sqrt(ulcerSum / numTrades) : 0;

  const marRatio = maxDrawdownPct > 0 ? cagr / maxDrawdownPct : (cagr > 0 ? 99.9 : 0);
  const gainToPainRatio = negReturnsSum > 0 ? returns.reduce((a, b) => a + b, 0) / negReturnsSum : (meanReturn > 0 ? 9.99 : 0);

  const sortedReturns = [...returns].sort((a, b) => a - b);
  const p95 = percentile(sortedReturns, 0.95);
  const p05 = Math.abs(percentile(sortedReturns, 0.05));
  const p95ReturnPct = p95 * 100;
  const p05ReturnPct = p05 * 100;
  const tailRatio = p05 > 0 ? p95 / p05 : (p95 > 0 ? 99.9 : 0);
  const commonSenseRatio = tailRatio * gainToPainRatio;

  const profitFactorStrategy = profitFactor;
  // Profit Factor by Market (most traded asset)
  const assetMap: Record<string, { win: number; loss: number }> = {};
  trades.forEach(t => {
    const tAny = t as any;
    const a = t.asset || tAny.ticker || tAny.symbol || 'EURUSD';
    if (!assetMap[a]) assetMap[a] = { win: 0, loss: 0 };
    if (t.pnlNum > 0) assetMap[a].win += t.pnlNum;
    else assetMap[a].loss += Math.abs(t.pnlNum);
  });
  let bestAssetPF = 0;
  let bestAssetGrossProfit = 0;
  let bestAssetGrossLoss = 0;
  Object.values(assetMap).forEach(v => {
    const pf = v.loss > 0 ? v.win / v.loss : (v.win > 0 ? 99.9 : 0);
    if (pf > bestAssetPF) {
      bestAssetPF = pf;
      bestAssetGrossProfit = v.win;
      bestAssetGrossLoss = v.loss;
    }
  });
  const profitFactorMarket = Object.keys(assetMap).length > 0 ? bestAssetPF : profitFactor;

  // Profit Factor by Timeframe
  const tfMap: Record<string, { win: number; loss: number }> = {};
  trades.forEach(t => {
    const tAny = t as any;
    const tf = tAny.timeframe || tAny.interval || '1H';
    if (!tfMap[tf]) tfMap[tf] = { win: 0, loss: 0 };
    if (t.pnlNum > 0) tfMap[tf].win += t.pnlNum;
    else tfMap[tf].loss += Math.abs(t.pnlNum);
  });
  let bestTfPF = 0;
  let bestTfGrossProfit = 0;
  let bestTfGrossLoss = 0;
  Object.values(tfMap).forEach(v => {
    const pf = v.loss > 0 ? v.win / v.loss : (v.win > 0 ? 99.9 : 0);
    if (pf > bestTfPF) {
      bestTfPF = pf;
      bestTfGrossProfit = v.win;
      bestTfGrossLoss = v.loss;
    }
  });
  const profitFactorTimeframe = Object.keys(tfMap).length > 0 ? bestTfPF : profitFactor;

  const avgTradeExpectancy = expectedValue;
  const expectancyScore = avgLoss > 0 ? (expectedValue / avgLoss) : (expectedValue > 0 ? 2.5 : 0);

  // R-Multiples
  const tradeRisks = trades.map(t => {
    const entry = toFiniteNumber(t.entry, 0);
    const sl = toFiniteNumber(t.stopLoss, 0);
    const size = toFiniteNumber(t.size, 1);
    return (entry > 0 && sl > 0) ? Math.abs(entry - sl) * size : riskUnitForRuin;
  });
  const rMultiples = trades.map((t, index) => {
    const risk = tradeRisks[index] ?? 0;
    return risk > 0 ? t.pnlNum / risk : 0;
  });
  const latestPnl = trades.length > 0 ? (trades[trades.length - 1]?.pnlNum ?? 0) : 0;
  const latestInitialRisk = tradeRisks.length > 0 ? (tradeRisks[tradeRisks.length - 1] ?? 0) : 0;
  const latestRMultiple = rMultiples.length > 0 ? rMultiples[rMultiples.length - 1] : 0;
  const avgRMultiple = rMultiples.length > 0 ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length : 0;
  const rMultipleWinCount = rMultiples.filter(r => r >= 2.0).length;
  const rMultipleDist = rMultiples.length > 0 ? (rMultipleWinCount / rMultiples.length) * 100 : 0;

  // Risk of Ruin
  const winP = winRate / 100;
  const lossP = 1 - winP;
  const edge = payoffRatio > 0 ? winP - (lossP / payoffRatio) : winP - lossP;
  const capitalUnits = riskUnitForRuin > 0 ? initialDeposit / riskUnitForRuin : 0;
  let riskOfRuin = 0;
  if (edge <= 0) riskOfRuin = 99.9;
  else {
    riskOfRuin = Math.pow((1 - edge) / (1 + edge), capitalUnits) * 100;
  }

  // Linear Regression of Equity Curve
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  let eqBal = initialDeposit;
  const eqPoints: number[] = [initialDeposit];
  trades.forEach(t => { eqBal += t.pnlNum; eqPoints.push(eqBal); });
  const N_eq = eqPoints.length;
  eqPoints.forEach((y, x) => {
    sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
  });
  const slope = N_eq > 1 ? (N_eq * sumXY - sumX * sumY) / (N_eq * sumX2 - sumX * sumX) : 0;
  const intercept = N_eq > 0 ? (sumY - slope * sumX) / N_eq : initialDeposit;
  const tradeIndexVariance = N_eq > 1 ? (sumX2 - (sumX * sumX) / N_eq) / (N_eq - 1) : 0;
  const equitySeriesLabel = `${N_eq} equity points`;
  const strategyReturnSeriesLabel = `${returns.length} strategy returns`;
  const marketReturnSeriesLabel = 'S&P benchmark returns';

  // Residual Volatility & R-Squared
  let sst = 0, ssr = 0;
  const meanEq = sumY / N_eq;
  eqPoints.forEach((y, x) => {
    const pred = slope * x + intercept;
    sst += Math.pow(y - meanEq, 2);
    ssr += Math.pow(y - pred, 2);
  });
  const equityCurveVolatility = N_eq > 2 ? Math.sqrt(ssr / (N_eq - 2)) : 0;
  const equityCurveStability = sst > 0 ? (1 - (ssr / sst)) * 100 : 100;
  const equityCurveCorrelation = sst > 0 ? Math.sqrt(Math.max(0, 1 - (ssr / sst))) : 1.0;

  // PnL Std Dev, Variance, CV, Skew, Kurtosis
  const pnls = trades.map(t => t.pnlNum);
  const meanPnL = mean(pnls);
  const varPnL = sampleVariance(pnls, meanPnL);
  const stdPnL = Math.sqrt(varPnL);
  const coeffOfVariation = meanPnL !== 0 ? stdPnL / Math.abs(meanPnL) : 0;

  let skewSum = 0, kurtSum = 0;
  if (stdPnL > 0 && numTrades > 2) {
    pnls.forEach(p => {
      skewSum += Math.pow((p - meanPnL) / stdPnL, 3);
      kurtSum += Math.pow((p - meanPnL) / stdPnL, 4);
    });
  }
  const skewness = numTrades > 2 ? skewSum / numTrades : 0;
  const kurtosis = numTrades > 3 ? (kurtSum / numTrades) - 3 : 0;

  const sortedPnLs = [...pnls].sort((a, b) => a - b);
  const medianTradeResult = median(sortedPnLs);

  const sortedWins = sortedPnLs.filter(p => p > 0);
  const sortedLosses = sortedPnLs.filter(p => p < 0);
  const medWin = median(sortedWins);
  const medLoss = Math.abs(median(sortedLosses));
  const medianWinLossRatio = medLoss > 0 ? medWin / medLoss : (medWin > 0 ? 9.99 : 0);

  // --- EXPERT METRICS CALCULATIONS --- //
  const p05PnL = percentile(sortedPnLs, 0.05);
  const valueAtRisk = Math.abs(p05PnL);
  const tailLosses = sortedPnLs.filter(p => p <= p05PnL);
  const cvar = tailLosses.length > 0 ? Math.abs(tailLosses.reduce((a, b) => a + b, 0) / tailLosses.length) : 0;
  const expectedShortfall = initialDeposit > 0 ? (cvar / initialDeposit) * 100 : 0;
  const tradePnlSeriesLabel = `${numTrades} trades`;

  let totalMAE = 0, totalMFE = 0, maeCount = 0;
  trades.forEach(t => {
    const tAny = t as any;
    const maeVal = tAny.mae !== undefined ? Math.abs(toFiniteNumber(tAny.mae, 0)) : 0;
    const mfeVal = tAny.mfe !== undefined ? Math.abs(toFiniteNumber(tAny.mfe, 0)) : 0;
    if (maeVal > 0 || mfeVal > 0) { totalMAE += maeVal; totalMFE += mfeVal; maeCount++; }
  });
  const maeMfeDataTrades = maeCount;
  const mae = maeMfeDataTrades > 0 ? totalMAE / maeMfeDataTrades : 0;
  const mfe = maeMfeDataTrades > 0 ? totalMFE / maeMfeDataTrades : 0;
  const maeMfeRatio = mfe > 0 ? mae / mfe : (mae > 0 ? 9.99 : 0);

  const runOutcomes = trades.map(t => t.pnlNum > 0 ? 1 : (t.pnlNum < 0 ? -1 : 0)).filter(v => v !== 0);
  let runs = runOutcomes.length > 0 ? 1 : 0;
  let nW = 0, nL = 0;
  for (let i = 0; i < runOutcomes.length; i++) {
    const isW = runOutcomes[i] === 1;
    if (isW) nW++; else nL++;
    if (i > 0) {
      const prevW = runOutcomes[i - 1] === 1;
      if (isW !== prevW) runs++;
    }
  }
  const N_runs = nW + nL;
  const expectedRuns = N_runs > 1 ? ((2 * nW * nL) / N_runs) + 1 : 1;
  const varRuns = N_runs > 1 ? ((2 * nW * nL) * (2 * nW * nL - N_runs)) / (Math.pow(N_runs, 2) * (N_runs - 1)) : 0;
  const stdRuns = Math.sqrt(Math.max(0, varRuns));
  const zScore = stdRuns > 0 ? (runs - expectedRuns) / stdRuns : 0;
  const runsTest = Math.abs(zScore) < 1.96 ? 1 : 0;

  const monteCarloSimulationCount = 500;
  const mcRandom = createSeededRandom(createNumberSeriesSeed(pnls, Math.round(initialDeposit * 100) ^ 0x4d43));
  const mcMaxDrawdowns: number[] = [];
  const mcNetReturns: number[] = [];
  let mcRuinCount = 0;
  if (trades.length > 0) {
    for (let s = 0; s < monteCarloSimulationCount; s++) {
      let simBal = initialDeposit;
      let simPeak = initialDeposit;
      let simMaxDd = 0;
      for (let i = 0; i < trades.length; i++) {
        const randTrade = trades[Math.floor(mcRandom() * trades.length)] || trades[0];
        simBal += randTrade ? randTrade.pnlNum : 0;
        if (simBal > simPeak) simPeak = simBal;
        const dd = simPeak > 0 ? ((simPeak - simBal) / simPeak) * 100 : 0;
        if (dd > simMaxDd) simMaxDd = dd;
        if (simBal <= initialDeposit * 0.1) { mcRuinCount++; break; }
      }
      mcMaxDrawdowns.push(simMaxDd);
      mcNetReturns.push(initialDeposit > 0 ? ((simBal - initialDeposit) / initialDeposit) * 100 : 0);
    }
  }
  const monteCarloDrawdown = mcMaxDrawdowns.length > 0 ? mean(mcMaxDrawdowns) : maxDrawdownPct;
  const monteCarloRiskOfRuin = mcMaxDrawdowns.length > 0 ? (mcRuinCount / monteCarloSimulationCount) * 100 : riskOfRuin;
  const monteCarloExpectedReturn = mcNetReturns.length > 0 ? mean(mcNetReturns) : returnOnCapital;
  const monteCarloMaxDrawdownSeriesLabel = `${mcMaxDrawdowns.length} simulated max drawdowns`;
  const monteCarloNetReturnSeriesLabel = `${mcNetReturns.length} simulated net returns`;

  const bsMeans: number[] = [];
  const bootstrapSimulationCount = 500;
  const bsRandom = createSeededRandom(createNumberSeriesSeed(pnls, Math.round(initialDeposit * 100) ^ 0x4253));
  if (trades.length > 0) {
    for (let s = 0; s < bootstrapSimulationCount; s++) {
      let sum = 0;
      for (let i = 0; i < trades.length; i++) {
        const randTrade = trades[Math.floor(bsRandom() * trades.length)] || trades[0];
        sum += randTrade ? randTrade.pnlNum : 0;
      }
      bsMeans.push(sum / trades.length);
    }
    bsMeans.sort((a, b) => a - b);
  }
  const ciLower = bsMeans.length > 0 ? percentile(bsMeans, 0.025) : 0;
  const ciUpper = bsMeans.length > 0 ? percentile(bsMeans, 0.975) : 0;
  const bootstrapResampledMeansLabel = `${bsMeans.length} resampled means`;
  const bootstrapMeanLower = ciLower;
  const bootstrapMeanUpper = ciUpper;
  const bootstrapConfidenceInterval = bsMeans.length > 0 ? `${ciLower >= 0 ? '+' : ''}$${Math.round(ciLower)} / ${ciUpper >= 0 ? '+' : ''}$${Math.round(ciUpper)}` : '$0 / $0';

  const seMean = numTrades > 1 ? stdPnL / Math.sqrt(numTrades) : 0;
  const evLower = expectedValue - 1.96 * seMean;
  const evUpper = expectedValue + 1.96 * seMean;
  const ciExpectedValue = `${evLower >= 0 ? '+' : ''}$${evLower.toFixed(1)} / ${evUpper >= 0 ? '+' : ''}$${evUpper.toFixed(1)}`;

  const pWin = winRate / 100;
  const seWin = numTrades > 0 ? Math.sqrt((pWin * (1 - pWin)) / numTrades) : 0;
  const wrLower = Math.max(0, (pWin - 1.96 * seWin) * 100);
  const wrUpper = Math.min(100, (pWin + 1.96 * seWin) * 100);
  const ciWinRate = `${wrLower.toFixed(1)}% / ${wrUpper.toFixed(1)}%`;

  const bayesianWinRate = ((numWin + 1) / (numTrades + 2)) * 100;
  const priorMean = 0;
  const priorWeight = 5;
  const bayesianExpectedValue = (numTrades * expectedValue + priorWeight * priorMean) / (numTrades + priorWeight);

  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? 1 : 0);
  const winProbability = winP;
  const lossProbability = lossP;
  const kellyCriterion = winLossRatio > 0 ? (winP - (lossP / winLossRatio)) * 100 : 0;
  const fractionalKelly = kellyCriterion / 2;
  const optimalF = Math.max(0, kellyCriterion * 0.8);

  const sqn = stdPnL > 0 ? (expectedValue / stdPnL) * Math.sqrt(numTrades) : (expectedValue > 0 ? 5.0 : 0);
  const tTest = seMean > 0 ? expectedValue / seMean : (expectedValue > 0 ? 9.99 : 0);

  const absT = Math.abs(tTest);
  const pValue = Math.max(0, Math.min(1, 2 * (1 - normalCDF(absT))));

  const benchReturn = sp500BenchmarkRate.value;
  const trackingError = annStdPct || 15.0;
  const informationRatio = trackingError > 0 ? (cagr - benchReturn) / trackingError : (cagr > benchReturn ? 5.0 : 0);

  const riskFree = riskFreeRate.value;
  const beta = strategyBeta.value;
  const treynorRatio = beta > 0 ? (cagr - riskFree) / beta : (cagr > riskFree ? 25.0 : 0);
  const jensensAlpha = cagr - (riskFree + beta * (benchReturn - riskFree));
  const betaToBenchmark = beta;
  const alphaToBenchmark = cagr - benchReturn;

  let sumProd = 0, sumPnL1 = 0, sumPnL2 = 0, sumSq1 = 0, sumSq2 = 0;
  let sumProdAbs = 0, sumAbs1 = 0, sumAbs2 = 0, sumSqAbs1 = 0, sumSqAbs2 = 0;
  const N_ac = pnls.length;
  let returnAutocorrelation = 0;
  let volatilityClustering = 0;

  if (N_ac > 1) {
    for (let i = 0; i < N_ac - 1; i++) {
      const x = pnls[i] ?? 0;
      const y = pnls[i + 1] ?? 0;
      sumProd += x * y; sumPnL1 += x; sumPnL2 += y;
      sumSq1 += x * x; sumSq2 += y * y;

      const ax = Math.abs(x);
      const ay = Math.abs(y);
      sumProdAbs += ax * ay; sumAbs1 += ax; sumAbs2 += ay;
      sumSqAbs1 += ax * ax; sumSqAbs2 += ay * ay;
    }
    const n_sub = N_ac - 1;
    const num_ac = n_sub * sumProd - sumPnL1 * sumPnL2;
    const den_ac = Math.sqrt((n_sub * sumSq1 - sumPnL1 * sumPnL1) * (n_sub * sumSq2 - sumPnL2 * sumPnL2));
    returnAutocorrelation = den_ac > 0 ? num_ac / den_ac : 0;

    const num_vac = n_sub * sumProdAbs - sumAbs1 * sumAbs2;
    const den_vac = Math.sqrt((n_sub * sumSqAbs1 - sumAbs1 * sumAbs1) * (n_sub * sumSqAbs2 - sumAbs2 * sumAbs2));
    volatilityClustering = den_vac > 0 ? num_vac / den_vac : 0;
  }

  const hurstStats = calculateHurstStats(returns);
  const hurstExponent = hurstStats.exponent;
  const regimeStabilityScore = equityCurveStability * 0.95;

  const rollingSharpes: number[] = [];
  const rollingPFs: number[] = [];
  const rollingEVs: number[] = [];
  const rollingDDs: number[] = [];
  const rollingWinRates: number[] = [];
  if (pnls.length >= 10) {
    for (let i = 0; i <= pnls.length - 10; i++) {
      const windowPnLs = pnls.slice(i, i + 10);
      const wMean = mean(windowPnLs);
      const wVar = sampleVariance(windowPnLs, wMean);
      const wStd = Math.sqrt(wVar);
      rollingSharpes.push(wStd > 0 ? (wMean / wStd) * Math.sqrt(252) : 0);

      const wWin = windowPnLs.filter(p => p > 0).reduce((a, b) => a + b, 0);
      const wLoss = Math.abs(windowPnLs.filter(p => p < 0).reduce((a, b) => a + b, 0));
      rollingPFs.push(wLoss > 0 ? wWin / wLoss : (wWin > 0 ? 10 : 1));
      rollingEVs.push(wMean);
      rollingDDs.push(calculateWindowMaxDrawdownPct(windowPnLs, initialDeposit));
      rollingWinRates.push((windowPnLs.filter(p => p > 0).length / windowPnLs.length) * 100);
    }
  }
  const rollingSharpe = rollingSharpes.length > 0 ? mean(rollingSharpes) : sharpeRatio;
  const rollingProfitFactor = rollingPFs.length > 0 ? mean(rollingPFs) : profitFactor;
  const rollingExpectancy = rollingEVs.length > 0 ? mean(rollingEVs) : expectedValue;
  const rollingDrawdown = rollingDDs.length > 0 ? mean(rollingDDs) : avgDrawdownPct;
  const rollingWinRate = rollingWinRates.length > 0 ? mean(rollingWinRates) : winRate;
  const rollingWindowCount = rollingSharpes.length;

  const strategyDecayRate = linearRegressionSlope(rollingSharpes);
  const edgeHalfLife = strategyDecayRate < 0 ? Math.abs(0.5 / strategyDecayRate) : 99.9;

  const top5Count = Math.max(1, Math.floor(sortedWins.length * 0.05));
  const topWinsSum = sortedWins.slice(-top5Count).reduce((a, b) => a + b, 0);
  const outlierImpactRatio = netProfit > 0 ? (topWinsSum / netProfit) * 100 : 0;
  const distributionRobustness = Math.min(100, Math.max(0, 100 - (Math.abs(skewness) * 10) - (Math.max(0, kurtosis) * 5) - (outlierImpactRatio * 0.2)));

  return {
    netProfit, grossProfit, grossLoss, winRate, lossRate,
    avgWin, avgLoss, avgTrade, payoffRatio, riskRewardRatio, realizedRR,
    plannedRRCount, expectedValue, profitFactor, beWinRate, numTrades, numWin, numLoss,
    largestWin, largestLoss, maxConsWins, maxConsLosses, avgHoldingTimeStr, avgTradeDurationHours: avgHoldingHours, holdingTrades: holdingCount,
    avgProfitPerDay, avgProfitPerWeek, avgProfitPerMonth,
    activeSpanDays: spanDays, maxDrawdownNum, maxDrawdownPct, avgDrawdownPct, drawdownDurationStr, drawdownDurationDays: maxDDDurationDays,
    recoveryFactor, returnOnCapital, returnPerTrade, totalInitialRisk: totalRisk, riskDataTrades: riskCount, riskPerTrade,
    configuredRiskPerTrade: Number.isFinite(configuredRiskPerTrade) ? configuredRiskPerTrade : null,
    riskManagementTradingStyle: riskManagement.tradingStyle,
    initialDeposit, annualizedReturnPct: cagr, stdDevPct: annStdPct, downsideStdDevPct: annDownsideStdPct, strategyBeta: beta,
    positiveReturnsPct, negativeReturnsPct, allReturnsPct, p95ReturnPct, p05ReturnPct,
    // Advanced
    sharpeRatio, sortinoRatio, calmarRatio, sterlingRatio, omegaRatio, ulcerIndex,
    marRatio, gainToPainRatio, tailRatio, commonSenseRatio, profitFactorStrategy,
    profitFactorMarket, bestAssetGrossProfit, bestAssetGrossLoss,
    profitFactorTimeframe, bestTfGrossProfit, bestTfGrossLoss,
    avgTradeExpectancy, expectancyScore,
    latestPnl, latestInitialRisk, latestRMultiple, avgRMultiple, rMultipleWinCount, rMultipleDist, riskOfRuin, kellyEdge: edge, capitalUnits,
    slope, tradeIndexVariance, equitySeriesLabel, strategyReturnSeriesLabel, marketReturnSeriesLabel,
    equityCurveVolatility, equityCurveStability, equityCurveCorrelation, equityRSquared: equityCurveStability / 100,
    equityResidualSumSquares: ssr, equityTotalSumSquares: sst,
    meanPnL, tradePnlSeriesLabel, stdPnL, varPnL, coeffOfVariation, skewness, kurtosis,
    medianTradeResult, medianWin: medWin, medianLoss: medLoss, medianWinLossRatio,
    // Expert
    p05TradePnl: p05PnL, valueAtRisk, cvar, expectedShortfall, totalMAE, totalMFE, maeMfeDataTrades, mae, mfe, maeMfeRatio, runs, expectedRuns, stdRuns, zScore, runsTest,
    monteCarloSimulationCount, monteCarloRuinCount: mcRuinCount,
    monteCarloMaxDrawdownSeriesLabel, monteCarloNetReturnSeriesLabel,
    monteCarloDrawdown, monteCarloRiskOfRuin, monteCarloExpectedReturn,
    bootstrapSimulationCount, bootstrapResampledMeansLabel, bootstrapMeanLower, bootstrapMeanUpper, bootstrapConfidenceInterval,
    ciExpectedValue, ciWinRate, winProbability, lossProbability, bayesianWinRate, bayesianExpectedValue, kellyCriterion,
    fractionalKelly, optimalF, sqn, tTest, pValue, informationRatio, treynorRatio,
    jensensAlpha, betaToBenchmark, alphaToBenchmark, returnAutocorrelation, volatilityClustering,
    hurstExponent, hurstRange: hurstStats.range, hurstStdDev: hurstStats.stdDev, hurstRescaledRange: hurstStats.rescaledRange,
    regimeStabilityScore, rollingWindowCount, rollingSharpe, rollingProfitFactor, rollingExpectancy,
    rollingDrawdown, rollingWinRate, strategyDecayRate, edgeHalfLife, topWinsSum, outlierImpactRatio, distributionRobustness
  };
});

// --- ROBUSTNESS DIAGNOSTICS COMPUTED PROPERTIES --- //
const diagnosticStats = computed(() => {
  const currentTrades = getFilteredTrades();
  const initialDeposit = tradeStore.getInitialDeposit(selectedStrategyId.value) || 1000;
  const pnls = currentTrades.map(t => getTradePnl(t, initialDeposit));
  
  const N = pnls.length;
  if (N === 0) {
    return {
      pnls: [],
      mean: 0,
      std: 0,
      skewness: 0,
      kurtosis: 0,
      normalParams: { mean: 0, std: 0, logL: 0, aic: 0, bic: 0 },
      tParams: { mean: 0, scale: 0, nu: 30, logL: 0, aic: 0, bic: 0 },
      preferredModel: 'None',
      bins: [],
      normalCurve: [],
      tCurve: [],
      curveDomain: { min: 0, max: 0 },
      qqPoints: [],
      bootstrapCI: { lower: 0, upper: 0, mean: 0, stdErr: 0, distribution: [] },
      minPnl: 0,
      maxPnl: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      tailOutlierCount: 0,
      lowerFence: 0,
      upperFence: 0,
      largestTailSigma: 0,
      stopLossCoveragePct: 0,
      takeProfitCoveragePct: 0,
      riskManagedCount: 0,
      unmanagedRiskCount: 0
    };
  }

  const mean = pnls.reduce((a, b) => a + b, 0) / N;
  const variance = N > 1 ? pnls.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (N - 1) : 0;
  const std = Math.sqrt(variance);

  let skewSum = 0;
  let kurtSum = 0;
  if (std > 0 && N > 2) {
    pnls.forEach(x => {
      skewSum += Math.pow((x - mean) / std, 3);
      kurtSum += Math.pow((x - mean) / std, 4);
    });
  }
  const skewness = N > 2 ? skewSum / N : 0;
  const kurtosis = N > 3 ? (kurtSum / N) - 3 : 0;

  const normalStd = std > 0 ? std : 1.0;
  let normalLogL = 0;
  pnls.forEach(x => {
    normalLogL += Math.log(Math.max(1e-15, normalPDF(x, mean, normalStd)));
  });
  const normalAIC = 2 * 2 - 2 * normalLogL;
  const normalBIC = 2 * Math.log(N) - 2 * normalLogL;

  let tNu = 30;
  let tScale = normalStd;
  if (kurtosis > 0.01) {
    tNu = Math.min(100, Math.max(4.01, 4 + 6 / kurtosis));
    tScale = normalStd * Math.sqrt((tNu - 2) / tNu);
  }
  let tLogL = 0;
  pnls.forEach(x => {
    tLogL += Math.log(Math.max(1e-15, studentTPDF(x, mean, tScale, tNu)));
  });
  const tAIC = 2 * 3 - 2 * tLogL;
  const tBIC = 3 * Math.log(N) - 2 * tLogL;

  let preferredModel = 'Normal';
  if (N >= 5 && tBIC < normalBIC) {
    preferredModel = "Student's t";
  }

  const sortedPnls = [...pnls].sort((a, b) => a - b);
  const minP = sortedPnls[0] ?? 0;
  const maxP = sortedPnls[sortedPnls.length - 1] ?? 0;
  const q1 = percentile(sortedPnls, 0.25);
  const q3 = percentile(sortedPnls, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const tailOutlierCount = sortedPnls.filter(x => x < lowerFence || x > upperFence).length;
  const largestTailSigma = normalStd > 0
    ? Math.max(Math.abs(minP - mean), Math.abs(maxP - mean)) / normalStd
    : 0;
  const stopLossCount = currentTrades.filter(t => toFiniteNumber(t?.stopLoss, 0) > 0).length;
  const takeProfitCount = currentTrades.filter(t => toFiniteNumber(t?.takeProfit, 0) > 0).length;
  const riskManagedCount = currentTrades.filter(t => toFiniteNumber(t?.entry, 0) > 0 && toFiniteNumber(t?.stopLoss, 0) > 0).length;
  const unmanagedRiskCount = currentTrades.filter(t =>
    toFiniteNumber(t?.stopLoss, 0) <= 0 && toFiniteNumber(t?.takeProfit, 0) <= 0
  ).length;
  const stopLossCoveragePct = N > 0 ? (stopLossCount / N) * 100 : 0;
  const takeProfitCoveragePct = N > 0 ? (takeProfitCount / N) * 100 : 0;
  const range = maxP - minP;
  const numBins = Math.max(5, Math.min(15, Math.ceil(Math.sqrt(N))));
  const binWidth = range > 0 ? range / numBins : 1.0;
  
  const bins = Array.from({ length: numBins }, (_, i) => {
    const x0 = minP + i * binWidth;
    const x1 = x0 + binWidth;
    return {
      x0,
      x1,
      mid: (x0 + x1) / 2,
      count: 0,
      density: 0
    };
  });

  pnls.forEach(x => {
    let placed = false;
    for (let i = 0; i < numBins; i++) {
      const bin = bins[i];
      if (bin && x >= bin.x0 && x <= bin.x1) {
        bin.count++;
        placed = true;
        break;
      }
    }
    if (!placed && bins.length > 0) {
      if (x < minP) {
        const firstBin = bins[0];
        if (firstBin) firstBin.count++;
      } else {
        const lastBin = bins[bins.length - 1];
        if (lastBin) lastBin.count++;
      }
    }
  });

  bins.forEach(b => {
    b.density = b.count / (N * binWidth);
  });

  const curvePointsCount = 90;
  const domainBaseMin = Math.min(minP, mean - 3 * normalStd);
  const domainBaseMax = Math.max(maxP, mean + 3 * normalStd);
  const domainPadding = Math.max(1, normalStd * 0.25, (domainBaseMax - domainBaseMin) * 0.06);
  const curveMin = domainBaseMin - domainPadding;
  const curveMax = domainBaseMax + domainPadding;
  const curveStep = (curveMax - curveMin) / curvePointsCount;

  const normalCurve: { x: number; y: number }[] = [];
  const tCurve: { x: number; y: number }[] = [];
  for (let i = 0; i <= curvePointsCount; i++) {
    const x = curveMin + i * curveStep;
    normalCurve.push({ x, y: normalPDF(x, mean, normalStd) });
    tCurve.push({ x, y: studentTPDF(x, mean, tScale, tNu) });
  }

  const qqPoints = sortedPnls.map((x, idx) => {
    const p = (idx + 1 - 0.375) / (N + 0.25);
    const z = normalQuantile(p);
    const theoretical = mean + z * normalStd;
    return {
      z,
      theoretical,
      actual: x
    };
  });

  const bootstrapSims = 500;
  const bsMeans: number[] = [];
  const bsRandom = createSeededRandom(createNumberSeriesSeed(pnls, Math.round(initialDeposit * 100) ^ 0x4442));
  for (let s = 0; s < bootstrapSims; s++) {
    let sum = 0;
    for (let i = 0; i < N; i++) {
      const randIdx = Math.floor(bsRandom() * N);
      const val = pnls[randIdx];
      if (val !== undefined) {
        sum += val;
      }
    }
    bsMeans.push(sum / N);
  }
  bsMeans.sort((a, b) => a - b);
  const bsLower = bsMeans.length > 0 ? percentile(bsMeans, 0.025) : mean;
  const bsUpper = bsMeans.length > 0 ? percentile(bsMeans, 0.975) : mean;
  const stdErr = N > 1 ? std / Math.sqrt(N) : 0;

  const bsMin = bsMeans[0] ?? 0;
  const bsMax = bsMeans[bootstrapSims - 1] ?? 0;
  const bsRange = bsMax - bsMin;
  const bsNumBins = 15;
  const bsBinWidth = bsRange > 0 ? bsRange / bsNumBins : 1.0;
  const bsBins = Array.from({ length: bsNumBins }, (_, i) => {
    const x0 = bsMin + i * bsBinWidth;
    const x1 = x0 + bsBinWidth;
    return { x0, x1, count: 0 };
  });
  bsMeans.forEach(mVal => {
    let placed = false;
    for (let i = 0; i < bsNumBins; i++) {
      const bsBin = bsBins[i];
      if (bsBin && mVal >= bsBin.x0 && mVal <= bsBin.x1) {
        bsBin.count++;
        placed = true;
        break;
      }
    }
    if (!placed && bsBins.length > 0) {
      if (mVal < bsMin) {
        const firstBsBin = bsBins[0];
        if (firstBsBin) firstBsBin.count++;
      } else {
        const lastBsBin = bsBins[bsBins.length - 1];
        if (lastBsBin) lastBsBin.count++;
      }
    }
  });

  return {
    pnls: sortedPnls,
    mean,
    std,
    skewness,
    kurtosis,
    normalParams: { mean, std: normalStd, logL: normalLogL, aic: normalAIC, bic: normalBIC },
    tParams: { mean, scale: tScale, nu: tNu, logL: tLogL, aic: tAIC, bic: tBIC },
    preferredModel,
    bins,
    normalCurve,
    tCurve,
    curveDomain: { min: curveMin, max: curveMax },
    qqPoints,
    bootstrapCI: {
      lower: bsLower,
      upper: bsUpper,
      mean,
      stdErr,
      distribution: bsBins
    },
    minPnl: minP,
    maxPnl: maxP,
    q1,
    q3,
    iqr,
    tailOutlierCount,
    lowerFence,
    upperFence,
    largestTailSigma,
    stopLossCoveragePct,
    takeProfitCoveragePct,
    riskManagedCount,
    unmanagedRiskCount
  };
});

const distributionPoints3D = computed(() => {
  const pnls = diagnosticStats.value.pnls;
  if (pnls.length < 2) return { normalCurve: [], tCurve: [] };

  const stats = diagnosticStats.value;
  const mean = stats.mean;
  const normalStd = stats.normalParams.std;
  const tScale = stats.tParams.scale;
  const tNu = stats.tParams.nu;
  const curveDomain = stats.curveDomain || { min: mean - 3 * normalStd, max: mean + 3 * normalStd };
  const curveRange = Math.max(1, curveDomain.max - curveDomain.min);

  const pointsCount = 100;
  const step = 400 / pointsCount;
  
  const normalCurve: Point3D[] = [];
  const tCurve: Point3D[] = [];

  let maxDensity = 0.0001;
  const pdfVals: { x: number; valNormal: number; valT: number }[] = [];

  for (let i = 0; i <= pointsCount; i++) {
    const xCoord = -200 + i * step;
    const returnVal = curveDomain.min + (i / pointsCount) * curveRange;
    
    const valNormal = normalPDF(returnVal, mean, normalStd);
    const valT = studentTPDF(returnVal, mean, tScale, tNu);
    
    if (valNormal > maxDensity) maxDensity = valNormal;
    if (valT > maxDensity) maxDensity = valT;
    
    pdfVals.push({ x: xCoord, valNormal, valT });
  }

  pdfVals.forEach(pv => {
    const yNormal = 80 - (pv.valNormal / maxDensity) * 140;
    const yT = 80 - (pv.valT / maxDensity) * 140;
    
    normalCurve.push({ x: pv.x, y: yNormal, z: 0 });
    tCurve.push({ x: pv.x, y: yT, z: 0 });
  });

  return { normalCurve, tCurve };
});

const generateSVGPath = (curve: { x: number; y: number }[], maxDensity: number, minX: number, maxX: number): string => {
  if (maxX <= minX || maxDensity <= 0) return '';
  const points = curve.map(pt => {
    const px = 500 * (pt.x - minX) / (maxX - minX);
    const py = 180 - 160 * (pt.y / maxDensity);
    return `${px.toFixed(1)},${py.toFixed(1)}`;
  });
  return `M ${points.join(' L ')}`;
};

const computeQQPlotPositions = (qqPoints: { theoretical: number; actual: number }[]) => {
  if (qqPoints.length === 0) return [];
  const actuals = qqPoints.map(p => p.actual);
  const theoreticals = qqPoints.map(p => p.theoretical);
  const minAct = Math.min(...actuals);
  const maxAct = Math.max(...actuals);
  const minTheo = Math.min(...theoreticals);
  const maxTheo = Math.max(...theoreticals);

  const rangeAct = maxAct - minAct || 1.0;
  const rangeTheo = maxTheo - minTheo || 1.0;

  return qqPoints.map(pt => {
    const x = 20 + 460 * (pt.theoretical - minTheo) / rangeTheo;
    const y = 180 - 160 * (pt.actual - minAct) / rangeAct;
    return { x, y };
  });
};



// --- 3D MATH TYPES --- //
import { useExRobustness } from '../model/useExRobustness'
import ExRobustnessDiagnostic from './components/ExRobustnessDiagnostic.vue'

interface Point3D { x: number; y: number; z: number }
interface Point2D { x: number; y: number; opacity: number; depth: number }
interface CurvePoint extends Point3D { value: number; dateLabel: string; isProjection?: boolean }

const props = defineProps<{
  trades?: any[]
  initialBalance?: number
  mode?: 'standalone' | 'overlay'
}>()

const emit = defineEmits(['exit'])

// --- STATE --- //
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isInitializing = ref(true)
const canRevealCurve = ref(false)
const bootProgress = ref(0)
const container = ref<HTMLElement | null>(null)
const revealProgress = ref(0)
const hoveredCurveIndex = ref<number | null>(null)

const hoveredQQPoint = computed(() => {
  if (!showQQPlot.value || hoveredCurveIndex.value === null) return null
  const stats = diagnosticStats.value
  const qq = stats.qqPoints || []
  const ptData = qq[hoveredCurveIndex.value]
  if (!ptData) return null

  const actuals = qq.map((p: any) => p.actual)
  const theoreticals = qq.map((p: any) => p.theoretical)
  const minT = Math.min(...theoreticals)
  const maxT = Math.max(...theoreticals)
  const minA = Math.min(...actuals)
  const maxA = Math.max(...actuals)

  const rangeT = maxT - minT || 1
  const rangeA = maxA - minA || 1

  const pctX = (ptData.theoretical - minT) / rangeT
  const pctY = (ptData.actual - minA) / rangeA
  const scale = viewScale.value
  const canvas = canvasRef.value
  if (!canvas) return null

  const w = canvas.width
  const h = canvas.height

  const v3d = {
    x: -200 + pctX * 400,
    y: 80 - pctY * 140,
    z: 0
  }
  
  let pt3d = rotateY(v3d, currentRotation.value.y)
  pt3d = rotateX(pt3d, currentRotation.value.x)
  pt3d.x *= scale; pt3d.y *= scale; pt3d.z *= scale
  const proj = project(pt3d, w, h)

  const screenX = (proj.x / w) * canvas.clientWidth
  const screenY = (proj.y / h) * canvas.clientHeight

  return {
    actual: ptData.actual,
    theoretical: ptData.theoretical,
    z: ptData.z,
    x: screenX,
    y: screenY
  }
})

type DistributionTooltip =
  | {
      kind: 'histogram'
      label: string
      x: number
      y: number
      x0: number
      x1: number
      mid: number
      count: number
      density: number
    }
  | {
      kind: 'curve'
      label: string
      x: number
      y: number
      model: string
      returnValue: number
      density: number
      aic: number
      bic: number
    }

const hoveredDistributionTooltip = ref<DistributionTooltip | null>(null)
const hoveredHistogramTooltip = computed(() =>
  hoveredDistributionTooltip.value?.kind === 'histogram' ? hoveredDistributionTooltip.value : null
)
const hoveredCurveTooltip = computed(() =>
  hoveredDistributionTooltip.value?.kind === 'curve' ? hoveredDistributionTooltip.value : null
)

// View State
const targetRotation = ref({ x: 0, y: 0 }) 
const currentRotation = ref({ x: 0, y: 0 })
const viewScale = ref(2.2) 
const viewOffset = ref({ x: 0, y: 0 })
const isPanning = ref(false)
const lastMousePos = ref({ x: 0, y: 0 })
const currentMouseCanvasPos = ref({ x: 0, y: 0 })

// Data
const equityPoints3D = ref<CurvePoint[]>([])
const benchmarkPoints3D = ref<CurvePoint[]>([])
const riskFreePoints3D = ref<CurvePoint[]>([])
const winratePoints3D = ref<CurvePoint[]>([])
const isApiSyncing = ref(false)
const apiSyncStatusMessage = ref('')

const findAllActiveApiConnections = async () => {
  const connections = await loadFromDisk<Record<string, StoredBrokerConnection>>(BROKER_CONNECTIONS_STORAGE_KEY)
  if (!connections) return []

  return Object.values(connections).filter((connection) => {
    return isSyncableBrokerConnection(connection)
  })
}

const apiSyncButtonTitle = computed(() => {
  if (isApiSyncing.value) return isRu.value ? 'Синхронизация сделок...' : 'Syncing trades...'
  return isRu.value ? 'Синхронизировать сделки из API' : 'Sync trades from API'
})

const displayBalance = computed(() => {
  if (showWinrateCurve.value) {
    const lastPoint = winratePoints3D.value[winratePoints3D.value.length - 1]
    const val = (lastPoint?.value ?? 0) * revealProgress.value
    return `${val.toFixed(1)}%`
  }
  const lastPoint = equityPoints3D.value[equityPoints3D.value.length - 1]
  const val = (lastPoint?.value ?? 0) * revealProgress.value
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
})

const syncCurrentStrategyApi = async () => {
  if (isApiSyncing.value) return

  isApiSyncing.value = true
  apiSyncStatusMessage.value = isRu.value ? 'API_SYNC_STARTING' : 'API_SYNC_STARTING'

  try {
    const connections = await findAllActiveApiConnections()
    if (connections.length === 0) {
      apiSyncStatusMessage.value = isRu.value ? 'НЕТ_АКТИВНЫХ_API_КЛЮЧЕЙ' : 'NO_ACTIVE_API_CONNECTIONS'
      return
    }

    apiSyncStatusMessage.value = isRu.value ? 'API_SYNC_IN_PROGRESS' : 'API_SYNC_IN_PROGRESS'
    
    let totalImported = 0
    let totalDuplicates = 0
    let sources: string[] = []
    
    for (const connection of connections) {
      const targetId = connection.credentials?.targetStrategyId || 'MAIN_DIARY'
      const result = await syncBrokerConnectionTrades(connection, targetId, tradeStore)
      totalImported += result.importedCount
      totalDuplicates += result.duplicateCount
      sources.push(result.sourceLabel)
    }
    
    initData()
    apiSyncStatusMessage.value = totalImported > 0
      ? `${sources.join(', ')}: +${totalImported}_TRADES`
      : `${sources.join(', ')}: 0_NEW / ${totalDuplicates}_DUP`
  } catch (error: any) {
    apiSyncStatusMessage.value = error?.message || 'API_SYNC_FAILED'
  } finally {
    isApiSyncing.value = false
  }
}

// --- THEME COLORS --- //
const colors = ref({
  text: '#ffffff',
  border: 'rgba(255, 255, 255, 0.1)',
  accent: '#38bdf8'
})

const updateColors = () => {
  if (!canvasRef.value) return
  const isDark = themeStore.settings.isDark
  
  // High-contrast monochromatic tactical colors
  colors.value.text = isDark ? '#ffffff' : '#000000'
  colors.value.border = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  colors.value.accent = isDark ? '#ffffff' : '#000000' 
}

watch(() => themeStore.settings.isDark, () => {
  updateColors()
}, { immediate: true })

// --- INITIALIZATION --- //
const initData = () => {
  const currentTrades = getFilteredTrades()
  const initialDeposit = props.initialBalance || tradeStore.getInitialDeposit(selectedStrategyId.value)
  depositInput.value = initialDeposit
  
  const sortedTrades = [...currentTrades].sort((a, b) => {
      const d1 = a.dateExit || a.date
      const d2 = b.dateExit || b.date
      const dateA = d1 instanceof Date ? d1 : new Date(d1)
      const dateB = d2 instanceof Date ? d2 : new Date(d2)
      return dateA.getTime() - dateB.getTime()
  })

  let runningBalance = initialDeposit
  equityPoints3D.value = []
  
  const numTrades = sortedTrades.length
  const step = 400 / Math.max(1, numTrades)

  let balances: number[] = [initialDeposit]
  let tempBal = initialDeposit
  sortedTrades.forEach(t => {
    tempBal += (t.profitInCurrency ?? 0)
    balances.push(tempBal)
  })
  
  const minBal = Math.min(...balances)
  const maxBal = Math.max(...balances)
  const range = maxBal - minBal
  const yScaling = range === 0 ? 1 : 135 / range

  // Start point
  const startY = range === 0 ? 50 : 95 - (initialDeposit - minBal) * yScaling
  equityPoints3D.value.push({ 
    x: -200, y: startY, z: 0, 
    value: initialDeposit,
    dateLabel: 'DEPOSIT'
  })

  let wins = 0
  let targetWins = 0
  let targetCount = 0
  winratePoints3D.value = []
  
  const targetNode = selectedWinrateTarget.value
  const useTargetWinrate = !!targetNode

  winratePoints3D.value.push({
    x: -200, y: 95, z: 0, // starts at 0%
    value: 0,
    dateLabel: targetNode ? `${targetNode.name} // START` : 'DEPOSIT'
  })

  sortedTrades.forEach((trade, i) => {
    runningBalance += (trade.profitInCurrency ?? 0)
    const x = -200 + (i + 1) * step
    const y = range === 0 ? 50 : 95 - (runningBalance - minBal) * yScaling
    const z = (Math.random() - 0.5) * 40
    
    const dVal = trade.dateExit || trade.date
    const date = dVal instanceof Date ? dVal : new Date(dVal)
    const dateLabel = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
    
    equityPoints3D.value.push({ 
      x, y, z, 
      value: runningBalance,
      dateLabel,
      isProjection: !!trade.isProjection
    })

    if (useTargetWinrate && selectedWinrateNodeId.value) {
      const isTargetTrade = tradeMatchesWinrateTarget(trade, selectedWinrateNodeId.value)
      if (isTargetTrade) {
        targetCount++
        if ((trade.profitInCurrency ?? 0) > 0) targetWins++
      }
      const targetWinrate = targetCount > 0 ? (targetWins / targetCount) * 100 : 0
      const winrateY = 95 - (targetWinrate / 100) * 135
      
      winratePoints3D.value.push({
        x, y: winrateY, z,
        value: targetWinrate,
        dateLabel: `${dateLabel} // ${targetNode?.name || 'TARGET'}`,
        isProjection: !!trade.isProjection
      })
    } else {
      if ((trade.profitInCurrency ?? 0) > 0) wins++
      const winrate = (wins / (i + 1)) * 100
      const winrateY = 95 - (winrate / 100) * 135
      
      winratePoints3D.value.push({
        x, y: winrateY, z,
        value: winrate,
        dateLabel,
        isProjection: !!trade.isProjection
      })
    }
  })

  // Compute Benchmark & Risk-Free Daily Curves
  benchmarkPoints3D.value = [{ x: -200, y: startY, z: 0, value: initialDeposit, dateLabel: 'DEPOSIT' }]
  riskFreePoints3D.value = [{ x: -200, y: startY, z: 0, value: initialDeposit, dateLabel: 'DEPOSIT' }]

  if (sortedTrades.length > 0) {
    let firstDateTime = 0
    const dailyTrades = new Map<string, { x: number, date: Date }>()

    sortedTrades.forEach((trade, i) => {
      const x = -200 + (i + 1) * step
      const dVal = trade.dateExit || trade.date
      const date = dVal instanceof Date ? dVal : new Date(dVal)
      const dayStr = date.toLocaleDateString('en-US')
      
      if (!firstDateTime) {
        const fd = new Date(date)
        fd.setHours(0,0,0,0)
        firstDateTime = fd.getTime()
      }
      
      // Last trade of the day overwrites, giving the final X coordinate for that day
      dailyTrades.set(dayStr, { x, date })
    })

    const lastTrade = sortedTrades[sortedTrades.length - 1]!
    const lastDateVal = lastTrade.dateExit || lastTrade.date
    const lastDate = lastDateVal instanceof Date ? lastDateVal : new Date(lastDateVal)
    lastDate.setHours(0,0,0,0)
    const endDateTime = lastDate.getTime()
    
    const daysTotal = Math.floor((endDateTime - firstDateTime) / (1000 * 60 * 60 * 24))

    const loadHistoricalCurves = async () => {
      try {
        const startTs = Math.floor(firstDateTime / 1000)
        const endTs = Math.floor(endDateTime / 1000)
        const curves: { benchmark: { timestamp: number, value: number }[], risk_free: { timestamp: number, value: number }[] } = 
          await invoke('get_historical_curves', {
            strategyId: selectedStrategyId.value || 'MAIN_DIARY',
            startTs,
            endTs
          })
          
        let prevX = -200
        const newBenchPoints: CurvePoint[] = [{ x: -200, y: startY, z: 0, value: initialDeposit, dateLabel: 'DEPOSIT' }]
        const newRfPoints: CurvePoint[] = [{ x: -200, y: startY, z: 0, value: initialDeposit, dateLabel: 'DEPOSIT' }]
        
        let benchVal = initialDeposit
        let rfVal = initialDeposit
        const getMarketValueForDay = (points: { timestamp: number, value: number }[], dayUnix: number) => {
          let value = 0
          for (const point of points) {
            if (point.timestamp <= dayUnix + 86400) {
              value = point.value
            } else {
              return value || point.value
            }
          }
          return value
        }
        const firstBenchRealPrice = getMarketValueForDay(curves.benchmark, startTs)
        let lastKnownRfYield = getMarketValueForDay(curves.risk_free, startTs) || 5.00
        
        for (let i = 0; i <= daysTotal; i++) {
          const currentMs = firstDateTime + i * 24 * 60 * 60 * 1000
          const currentUnix = Math.floor(currentMs / 1000)
          const d = new Date(currentMs)
          const dayStr = d.toLocaleDateString('en-US')
          const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          
          let x = prevX
          if (dailyTrades.has(dayStr)) {
            x = dailyTrades.get(dayStr)!.x
            prevX = x
          }
          
          // S&P 500 mapping
          const currentBenchRealPrice = getMarketValueForDay(curves.benchmark, currentUnix) || firstBenchRealPrice
          if (firstBenchRealPrice > 0) {
            benchVal = initialDeposit * (currentBenchRealPrice / firstBenchRealPrice)
          }
          
          // Risk Free compound
          lastKnownRfYield = getMarketValueForDay(curves.risk_free, currentUnix) || lastKnownRfYield
          if (i > 0) {
            rfVal = rfVal * (1 + (lastKnownRfYield / 100) / 365)
          }
          
          const benchY = range === 0 ? 50 : 95 - (benchVal - minBal) * yScaling
          const rfY = range === 0 ? 50 : 95 - (rfVal - minBal) * yScaling
          
          newBenchPoints.push({ x, y: benchY, z: 0, value: benchVal, dateLabel })
          newRfPoints.push({ x, y: rfY, z: 0, value: rfVal, dateLabel })
        }
        
        benchmarkPoints3D.value = newBenchPoints
        riskFreePoints3D.value = newRfPoints
      } catch (err) {
        console.error('[ExEquityCurve3D] Failed to load historical curves:', err)
      }
    }
    
    loadHistoricalCurves()
  }
}

// --- LOGIC HANDLERS & WATCHES --- //
const handleSetDeposit = async () => {
  await tradeStore.setInitialDeposit(selectedStrategyId.value, depositInput.value)
  showInitialDepositModal.value = false
  revealProgress.value = 0
  initData()
}

const handleSetBenchmark = async () => {
  sp500BenchmarkRate.value = benchmarkInput.value
  benchmarkMetricsByStrategy.value[selectedStrategyId.value] = {
    benchmarkRate: benchmarkInput.value,
    beta: strategyBeta.value,
    riskFreeRate: riskFreeRate.value,
    isFallback: false,
    updatedAt: new Date().toISOString()
  }
  await saveBenchmarkMetricsCache()
  showBenchmarkModal.value = false
  revealProgress.value = 0
  initData()
}

const handleClearTrades = async () => {
  await tradeStore.clearTrades(selectedStrategyId.value)
  showClearConfirmation.value = false
  revealProgress.value = 0
  initData()
}

watch(selectedStrategyId, async () => {
  revealProgress.value = 0
  applyBenchmarkMetricsForStrategy(selectedStrategyId.value)
  await fetchRealtimeMetrics([selectedStrategyId.value])
  initData()
})

watch([() => props.trades, () => tradeStore.tradesByStrategy[selectedStrategyId.value], () => tradeStore.hiddenTradeIdsByStrategy[selectedStrategyId.value]], async () => {
  await fetchRealtimeMetrics([selectedStrategyId.value])
  initData()
}, { deep: true })

watch(showMetricsPanel, (val) => {
  if (val) {
    showDistribution3D.value = false
    showRobustnessExplanations.value = false
    showRobustnessHistogram.value = false
    resetView()
  } else {
    isEditMode.value = false
    metricsPanel.closeDropdown()
    metricsPanel.resetHover()
  }
})
watch(showDistribution3D, (val) => {
  if (val) {
    showMetricsPanel.value = false
  } else {
    showQQPlot.value = false
    showRobustnessExplanations.value = false
    showRobustnessHistogram.value = false
  }
})

// --- 3D ENGINE --- //
const rotateX = (p: Point3D, angle: number): Point3D => {
  const cos = Math.cos(angle), sin = Math.sin(angle)
  return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos }
}

const rotateY = (p: Point3D, angle: number): Point3D => {
  const cos = Math.cos(angle), sin = Math.sin(angle)
  return { x: p.x * cos + p.z * sin, y: p.y, z: -p.x * sin + p.z * cos }
}

const project = (p: Point3D, width: number, height: number): Point2D => {
  const focalLength = 1000
  const z = Math.max(-999, p.z)
  const scale = focalLength / (focalLength + z)
  return {
    x: p.x * scale + width / 2 + viewOffset.value.x,
    y: p.y * scale + height / 2 + viewOffset.value.y,
    opacity: Math.max(0.1, (1000 - z) / 1500),
    depth: p.z
  }
}

const transformPoint = (pt: Point3D, rotY: number, rotX: number, s: number, w: number, h: number): Point2D => {
  let p = rotateY(pt, rotY)
  p = rotateX(p, rotX)
  p.x *= s; p.y *= s; p.z *= s
  return project(p, w, h)
}

const pointInPolygon = (px: number, py: number, polygon: Point2D[]) => {
  let isInside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i]
    const pj = polygon[j]
    if (!pi || !pj) continue
    const intersects = ((pi.y > py) !== (pj.y > py))
      && (px < ((pj.x - pi.x) * (py - pi.y)) / ((pj.y - pi.y) || 1e-9) + pi.x)
    if (intersects) isInside = !isInside
  }
  return isInside
}

const distanceToSegment = (
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
) => {
  const dx = bx - ax
  const dy = by - ay
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) {
    return {
      distance: Math.sqrt((px - ax) ** 2 + (py - ay) ** 2),
      t: 0
    }
  }

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq))
  const closestX = ax + t * dx
  const closestY = ay + t * dy
  return {
    distance: Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2),
    t
  }
}

const resetView = () => {
  targetRotation.value = { x: 0, y: 0 }
  viewScale.value = 2.2
  viewOffset.value = { x: 0, y: 0 }
}

const formatSentenceCase = (text: string) => text ? text.charAt(0).toUpperCase() + text.slice(1) : ''

const { robustnessExplanation, robustnessVisualizationStatus } = useExRobustness(diagnosticStats, strategyMetrics, getFilteredTrades)

let rafId: number
const update = () => {
  const canvas = canvasRef.value
  if (!canvas) {
    rafId = requestAnimationFrame(update)
    return
  }
  
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    rafId = requestAnimationFrame(update)
    return
  }

  if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    updateColors()
  }

  const w = canvas.width, h = canvas.height
  if (w === 0 || h === 0) {
    rafId = requestAnimationFrame(update)
    return
  }

  ctx.clearRect(0, 0, w, h)

  if (canRevealCurve.value && revealProgress.value < 1) {
    revealProgress.value = Math.min(1, revealProgress.value + 0.012)
  }
  
  currentRotation.value.x += (targetRotation.value.x - currentRotation.value.x) * 0.08
  currentRotation.value.y += (targetRotation.value.y - currentRotation.value.y) * 0.08

  const scale = viewScale.value
  const themeText = colors.value.text
  const themeBorder = colors.value.border

  if (!showMetricsPanel.value) {
    if (showDistribution3D.value) {
      // Draw grid floor
      ctx.strokeStyle = themeBorder
      ctx.lineWidth = 0.5
      for(let i = -5; i <= 5; i++) {
        let p1 = {x: -200 * scale, y: 100 * scale, z: (i * 40) * scale}
        let p2 = {x: 200 * scale, y: 100 * scale, z: (i * 40) * scale}
        let t1 = project(rotateX(rotateY(p1, currentRotation.value.y), currentRotation.value.x), w, h)
        let t2 = project(rotateX(rotateY(p2, currentRotation.value.y), currentRotation.value.x), w, h)
        ctx.beginPath(); ctx.moveTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y); ctx.stroke()
      }

      // --- DRAW RETURN AXIS (X axis) --- //
      const axisY = 105 
      let startAxis = { x: -200 * scale, y: axisY * scale, z: 0 }
      let endAxis = { x: 200 * scale, y: axisY * scale, z: 0 }
      let tStart = project(rotateX(rotateY(startAxis, currentRotation.value.y), currentRotation.value.x), w, h)
      let tEnd = project(rotateX(rotateY(endAxis, currentRotation.value.y), currentRotation.value.x), w, h)
      
      ctx.strokeStyle = themeText
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.3
      ctx.beginPath(); ctx.moveTo(tStart.x, tStart.y); ctx.lineTo(tEnd.x, tEnd.y); ctx.stroke()
      ctx.globalAlpha = 1

      // Return ticks on the axis: main sigma landmarks.
      const stats = diagnosticStats.value;
      if (stats.pnls.length > 0) {
        const mean = stats.mean;
        const normalStd = stats.normalParams.std || 1.0;
        const curveDomain = stats.curveDomain || { min: mean - 3 * normalStd, max: mean + 3 * normalStd };
        const curveRange = Math.max(1, curveDomain.max - curveDomain.min);
        const domainPct = (value: number) => Math.max(0, Math.min(1, (value - curveDomain.min) / curveRange));
        const labels = [
          { label: `-2σ ($${(mean - 2 * normalStd).toFixed(0)})`, xPct: domainPct(mean - 2 * normalStd) },
          { label: `Mean ($${mean.toFixed(0)})`, xPct: domainPct(mean) },
          { label: `+2σ ($${(mean + 2 * normalStd).toFixed(0)})`, xPct: domainPct(mean + 2 * normalStd) }
        ];
        labels.forEach(lbl => {
          const xPos = -200 + lbl.xPct * 400;
          const tickStart = { x: xPos * scale, y: (axisY - 2) * scale, z: 0 }
          const tickEnd = { x: xPos * scale, y: (axisY + 4) * scale, z: 0 }
          const t1 = project(rotateX(rotateY(tickStart, currentRotation.value.y), currentRotation.value.x), w, h)
          const t2 = project(rotateX(rotateY(tickEnd, currentRotation.value.y), currentRotation.value.x), w, h)
          
          ctx.strokeStyle = themeText
          ctx.globalAlpha = 0.2
          ctx.beginPath(); ctx.moveTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y); ctx.stroke()
          
          ctx.fillStyle = themeText
          ctx.globalAlpha = 0.5
          ctx.font = '12px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(lbl.label, t2.x, t2.y + 18)
          ctx.textAlign = 'left'
          ctx.globalAlpha = 1
        })
      }

      // --- DRAW 3D DISTRIBUTION LINES --- //
      const curves = distributionPoints3D.value;
      if (curves.normalCurve.length > 0) {
        if (showRobustnessHistogram.value) {
          // --- DRAW 3D REAL PNL HISTOGRAM --- //
          const pnlBins = stats.bins || [];
          if (pnlBins.length > 0) {
            const firstBin = pnlBins[0];
            const lastBin = pnlBins[pnlBins.length - 1];
            if (!firstBin || !lastBin) return;
            const maxCount = Math.max(...pnlBins.map((b: any) => b.count), 1);
            const lowerVal = stats.mean - stats.std;
            const upperVal = stats.mean + stats.std;
            const zoneIsPositive = stats.mean >= 0;

            // Find scale bounds for X mapping based on bins
            const minXVal = firstBin.x0;
            const maxXVal = lastBin.x1;
            const rangeXVal = maxXVal - minXVal || 1;

            // Draw individual 3D columns for the bins
            const binWidth3D = 350 / pnlBins.length;
            const gap = 2; // gap between bars
            const mutedStroke = themeStore.settings.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.16)';
            const mutedFront = themeStore.settings.isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.035)';
            const mutedTop = themeStore.settings.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.055)';
            const mutedSide = themeStore.settings.isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.045)';
            const mutedBack = themeStore.settings.isDark ? 'rgba(255, 255, 255, 0.025)' : 'rgba(0, 0, 0, 0.03)';
            const mutedBottom = themeStore.settings.isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.025)';

            pnlBins.forEach((bin: any, idx: number) => {
              const centerVal = (bin.x0 + bin.x1) / 2;
              const isInsideCI = centerVal >= lowerVal && centerVal <= upperVal;

              const binX = -175 + idx * binWidth3D + binWidth3D / 2;
              const barHeight = (bin.count / maxCount) * 110;

              const wHalf = (binWidth3D - gap) / 2;
              const dHalf = 10;
              const floorY = 100;
              const topY = 100 - barHeight;

              const corners3D = [
                { x: binX - wHalf, y: floorY, z: -dHalf },
                { x: binX + wHalf, y: floorY, z: -dHalf },
                { x: binX + wHalf, y: topY,    z: -dHalf },
                { x: binX - wHalf, y: topY,    z: -dHalf },
                { x: binX - wHalf, y: floorY, z: dHalf },
                { x: binX + wHalf, y: floorY, z: dHalf },
                { x: binX + wHalf, y: topY,    z: dHalf },
                { x: binX - wHalf, y: topY,    z: dHalf }
              ];

              const pts = corners3D.map(v => {
                let p = rotateY(v, currentRotation.value.y);
                p = rotateX(p, currentRotation.value.x);
                p.x *= scale; p.y *= scale; p.z *= scale;
                return project(p, w, h);
              });

              if (pts.length >= 8 && pts[0] && pts[1] && pts[2] && pts[3] && pts[4] && pts[5] && pts[6] && pts[7]) {
                ctx.save();
                const activeStroke = isInsideCI 
                  ? (zoneIsPositive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)')
                  : mutedStroke;
                const frontFill = isInsideCI 
                  ? (zoneIsPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)')
                  : mutedFront;
                const topFill = isInsideCI 
                  ? (zoneIsPositive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)')
                  : mutedTop;
                const sideFill = isInsideCI 
                  ? (zoneIsPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)')
                  : mutedSide;
                const backFill = isInsideCI
                  ? (zoneIsPositive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)')
                  : mutedBack;
                const bottomFill = isInsideCI
                  ? (zoneIsPositive ? 'rgba(16, 185, 129, 0.07)' : 'rgba(239, 68, 68, 0.07)')
                  : mutedBottom;

                const avgDepth = (indexes: number[]) => indexes.reduce((sum, pointIndex) => sum + (pts[pointIndex]?.depth ?? 0), 0) / indexes.length;
                const drawFace = (indexes: number[], fillStyle: string, strokeStyle: string) => {
                  const first = pts[indexes[0] ?? 0];
                  if (!first) return;
                  ctx.fillStyle = fillStyle;
                  ctx.strokeStyle = strokeStyle;
                  ctx.lineWidth = 0.9;
                  ctx.beginPath();
                  ctx.moveTo(first.x, first.y);
                  indexes.slice(1).forEach(pointIndex => {
                    const pt = pts[pointIndex];
                    if (pt) ctx.lineTo(pt.x, pt.y);
                  });
                  ctx.closePath();
                  ctx.fill();
                  ctx.stroke();
                };

                [
                  { indexes: [4, 5, 6, 7], fill: backFill },
                  { indexes: [0, 1, 5, 4], fill: bottomFill },
                  { indexes: [0, 4, 7, 3], fill: sideFill },
                  { indexes: [1, 5, 6, 2], fill: sideFill },
                  { indexes: [3, 2, 6, 7], fill: topFill },
                  { indexes: [0, 1, 2, 3], fill: frontFill }
                ]
                  .sort((a, b) => avgDepth(b.indexes) - avgDepth(a.indexes))
                  .forEach(face => drawFace(face.indexes, face.fill, activeStroke));

                ctx.strokeStyle = activeStroke;
                ctx.lineWidth = 0.85;
                ctx.globalAlpha = 0.85;
                const edges: Array<[number, number]> = [
                  [0, 1], [1, 2], [2, 3], [3, 0],
                  [4, 5], [5, 6], [6, 7], [7, 4],
                  [0, 4], [1, 5], [2, 6], [3, 7]
                ];
                edges.forEach(([from, to]) => {
                  const a = pts[from];
                  const b = pts[to];
                  if (!a || !b) return;
                  ctx.beginPath();
                  ctx.moveTo(a.x, a.y);
                  ctx.lineTo(b.x, b.y);
                  ctx.stroke();
                });
                ctx.globalAlpha = 1;

                ctx.restore();
              }
            });



          }
        } else if (showQQPlot.value) {
          const qq = stats.qqPoints || [];
          if (qq.length > 1) {
            const actuals = qq.map((p: any) => p.actual);
            const theoreticals = qq.map((p: any) => p.theoretical);
            const minT = Math.min(...theoreticals);
            const maxT = Math.max(...theoreticals);
            const minA = Math.min(...actuals);
            const maxA = Math.max(...actuals);

            const rangeT = maxT - minT || 1;
            const rangeA = maxA - minA || 1;

            const qqPoints3D = qq.map((pt: any) => {
              const pctX = (pt.theoretical - minT) / rangeT;
              const pctY = (pt.actual - minA) / rangeA;
              return {
                x: -200 + pctX * 400,
                y: 80 - pctY * 140,
                z: 0
              };
            });

            const transformedQQ = qqPoints3D.map(v => {
              let p = rotateY(v, currentRotation.value.y)
              p = rotateX(p, currentRotation.value.x)
              p.x *= scale; p.y *= scale; p.z *= scale
              return project(p, w, h)
            });

            const refStart3D = { x: -200 * scale, y: 80 * scale, z: 0 };
            const refEnd3D = { x: 200 * scale, y: -60 * scale, z: 0 };

            const pRefStart = project(rotateX(rotateY(refStart3D, currentRotation.value.y), currentRotation.value.x), w, h);
            const pRefEnd = project(rotateX(rotateY(refEnd3D, currentRotation.value.y), currentRotation.value.x), w, h);

            // Draw reference line
            ctx.lineWidth = 3.0
            ctx.strokeStyle = themeText
            ctx.globalAlpha = 0.5
            ctx.setLineDash([8, 4])
            ctx.beginPath()
            ctx.moveTo(pRefStart.x, pRefStart.y)
            ctx.lineTo(pRefEnd.x, pRefEnd.y)
            ctx.stroke()
            ctx.setLineDash([])
            ctx.globalAlpha = 1

            // Draw QQ points (dots) and hover tooltips
            transformedQQ.forEach((p, idx) => {
              const isHovered = hoveredCurveIndex.value === idx
              
              // Draw dot
              ctx.fillStyle = themeStore.settings.isDark ? '#ffffff' : '#000000'
              ctx.globalAlpha = 1.0
              ctx.beginPath()
              ctx.arc(p.x, p.y, isHovered ? 8 : 4, 0, Math.PI * 2)
              ctx.fill()

              // Draw hover ring & tooltip box
              if (isHovered) {
                // Glow ring
                ctx.strokeStyle = colors.value.accent
                ctx.lineWidth = 1.5
                ctx.beginPath()
                ctx.arc(p.x, p.y, 12, 0, Math.PI * 2)
                ctx.stroke()
              }
            })
          }
        } else {
          const transformedNormal = curves.normalCurve.map(v => {
            let p = rotateY(v, currentRotation.value.y)
            p = rotateX(p, currentRotation.value.x)
            p.x *= scale; p.y *= scale; p.z *= scale
            return project(p, w, h)
          })

          const transformedT = curves.tCurve.map(v => {
            let p = rotateY(v, currentRotation.value.y)
            p = rotateX(p, currentRotation.value.x)
            p.x *= scale; p.y *= scale; p.z *= scale
            return project(p, w, h)
          })

          // Draw white area under Student's t curve
          if (showRobustnessTDist.value && transformedT.length > 0) {
            const baseline3D = curves.tCurve.map(v => ({ x: v.x, y: 80, z: 0 }))
            const transformedBaseline = baseline3D.map(v => {
              let p = rotateY(v, currentRotation.value.y)
              p = rotateX(p, currentRotation.value.x)
              p.x *= scale; p.y *= scale; p.z *= scale
              return project(p, w, h)
            })

            let minY = Infinity
            transformedT.forEach(p => {
              if (p.y < minY) minY = p.y
            })
            let maxY = -Infinity
            transformedBaseline.forEach(p => {
              if (p.y > maxY) maxY = p.y
            })

            if (minY < maxY) {
              ctx.save()
              const grad = ctx.createLinearGradient(0, minY, 0, maxY)
              if (themeStore.settings.isDark) {
                grad.addColorStop(0, 'rgba(255, 255, 255, 0.55)')
                grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)')
              } else {
                grad.addColorStop(0, 'rgba(0, 0, 0, 0.18)')
                grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)')
              }
              ctx.fillStyle = grad
              ctx.beginPath()
              ctx.moveTo(transformedT[0]!.x, transformedT[0]!.y)
              transformedT.forEach((p, idx) => {
                if (idx > 0) ctx.lineTo(p.x, p.y)
              })
              // Draw baseline in reverse to close shape
              ctx.lineTo(transformedBaseline[transformedBaseline.length - 1]!.x, transformedBaseline[transformedBaseline.length - 1]!.y)
              for (let i = transformedBaseline.length - 1; i >= 0; i--) {
                ctx.lineTo(transformedBaseline[i]!.x, transformedBaseline[i]!.y)
              }
              ctx.closePath()
              ctx.fill()
              ctx.restore()
            }
          }

          // Draw Normal theoretical curve (dashed, lower opacity)
          if (showRobustnessNormalDist.value) {
            ctx.lineWidth = 1.5
            ctx.strokeStyle = themeText
            ctx.globalAlpha = 0.25
            ctx.setLineDash([5, 5])
            ctx.beginPath()
            transformedNormal.forEach((p, idx) => {
              if (idx === 0) ctx.moveTo(p.x, p.y)
              else ctx.lineTo(p.x, p.y)
            })
            ctx.stroke()
            ctx.setLineDash([])
            ctx.globalAlpha = 1
          }

          // Draw Student's t curve (solid, bold, glowing pure line)
          if (showRobustnessTDist.value) {
            ctx.lineWidth = 3
            ctx.strokeStyle = themeText
            ctx.shadowBlur = 15
            ctx.shadowColor = themeText
            ctx.beginPath()
            transformedT.forEach((p, idx) => {
              if (idx === 0) ctx.moveTo(p.x, p.y)
              else ctx.lineTo(p.x, p.y)
            })
            ctx.stroke()
            ctx.shadowBlur = 0
          }
        }
      }
    } else {
      // --- DRAW 3D EQUITY CURVE --- //
      const activePoints = showWinrateCurve.value ? winratePoints3D.value : equityPoints3D.value
      const transformedCurve = activePoints.map(v => {
        let p = rotateY(v, currentRotation.value.y)
        p = rotateX(p, currentRotation.value.x)
        p.x *= scale; p.y *= scale; p.z *= scale
        return project(p, w, h)
      })

      // Draw grid floor
      ctx.strokeStyle = themeBorder
      ctx.lineWidth = 0.5
      for(let i = -5; i <= 5; i++) {
        let p1 = {x: -200 * scale, y: 100 * scale, z: (i * 40) * scale}
        let p2 = {x: 200 * scale, y: 100 * scale, z: (i * 40) * scale}
        let t1 = project(rotateX(rotateY(p1, currentRotation.value.y), currentRotation.value.x), w, h)
        let t2 = project(rotateX(rotateY(p2, currentRotation.value.y), currentRotation.value.x), w, h)
        ctx.beginPath(); ctx.moveTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y); ctx.stroke()
      }

      // --- DRAW TIME AXIS --- //
      const axisY = 105 
      let startAxis = { x: -200 * scale, y: axisY * scale, z: 0 }
      let endAxis = { x: 200 * scale, y: axisY * scale, z: 0 }
      let tStart = project(rotateX(rotateY(startAxis, currentRotation.value.y), currentRotation.value.x), w, h)
      let tEnd = project(rotateX(rotateY(endAxis, currentRotation.value.y), currentRotation.value.x), w, h)
      
      ctx.strokeStyle = themeText
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.3
      ctx.beginPath(); ctx.moveTo(tStart.x, tStart.y); ctx.lineTo(tEnd.x, tEnd.y); ctx.stroke()
      ctx.globalAlpha = 1

      // --- DRAW BENCHMARK, RISK-FREE & WINRATE CURVES --- //
      const extraCurveLabelBoxes: Array<{ x: number; y: number; width: number; height: number }> = []
      const placeExtraCurveLabel = (x: number, y: number, text: string) => {
        ctx.font = 'bold 14px monospace'
        const paddingX = 7
        const paddingY = 4
        const width = ctx.measureText(text).width + paddingX * 2
        const height = 22
        const maxX = w - width - 12
        const maxY = h - height - 12
        const baseX = Math.max(12, Math.min(maxX, x + 10))
        const baseTop = y - height + 8
        const candidateOffsets = [0, -28, 28, -56, 56, -84, 84]
        const overlaps = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
          a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y

        let rect = {
          x: baseX,
          y: Math.max(12, Math.min(maxY, baseTop)),
          width,
          height
        }

        for (const offset of candidateOffsets) {
          const candidate = {
            x: baseX,
            y: Math.max(12, Math.min(maxY, baseTop + offset)),
            width,
            height
          }

          if (!extraCurveLabelBoxes.some(box => overlaps(candidate, box))) {
            rect = candidate
            break
          }
        }

        extraCurveLabelBoxes.push(rect)
        return {
          x: rect.x + paddingX,
          y: rect.y + height - paddingY - 2,
          rectX: rect.x,
          rectY: rect.y,
          width,
          height,
          paddingX,
          paddingY
        }
      }

      const drawExtraCurve = (points: CurvePoint[], color: string, label: string) => {
        if (points.length === 0) return
        const visibleMinY = -35
        const visibleMaxY = 95
        const yValues = points.map(point => point.y).filter(Number.isFinite)
        const minPointY = yValues.length ? Math.min(...yValues) : visibleMinY
        const maxPointY = yValues.length ? Math.max(...yValues) : visibleMaxY
        const shouldFitCurve = minPointY < visibleMinY || maxPointY > visibleMaxY
        const sourceYRange = Math.max(1, maxPointY - minPointY)
        const fittedPoints = shouldFitCurve
          ? points.map(point => ({
              ...point,
              y: visibleMinY + ((point.y - minPointY) / sourceYRange) * (visibleMaxY - visibleMinY)
            }))
          : points

        const transformed = fittedPoints.map(v => {
          let p = rotateY(v, currentRotation.value.y)
          p = rotateX(p, currentRotation.value.x)
          p.x *= scale; p.y *= scale; p.z *= scale
          return project(p, w, h)
        })

        ctx.lineWidth = 1.5
        ctx.strokeStyle = color
        ctx.setLineDash([4, 4])
        ctx.globalAlpha = 0.6
        ctx.beginPath()
        
        const limitIdx = Math.floor(transformed.length * revealProgress.value)
        
        transformed.forEach((p, idx) => {
          if (idx > limitIdx) return
          if (idx === 0) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        })
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1
        
        // Draw Label at the end
        const drawEndpointLabel = (pointIndex: number) => {
          const lastP = transformed[pointIndex]
          const valuePoint = points[pointIndex]
          if (!lastP || !valuePoint) return

          // format as currency, but if it is winrate, format as %
          const isWinrate = label.includes('%')
          const val = isWinrate ? `${valuePoint.value.toFixed(1)}%` : valuePoint.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
          const text = `${label} ${val}`
          const labelBox = placeExtraCurveLabel(lastP.x, lastP.y, text)
          const isDark = themeStore.settings.isDark

          ctx.save()
          ctx.fillStyle = isDark ? 'rgba(10, 10, 10, 0.86)' : 'rgba(255, 255, 255, 0.88)'
          ctx.strokeStyle = color
          ctx.globalAlpha = 0.96
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.rect(labelBox.rectX, labelBox.rectY, labelBox.width, labelBox.height)
          ctx.fill()

          ctx.strokeStyle = color
          ctx.globalAlpha = 0.55
          ctx.beginPath()
          ctx.moveTo(lastP.x, lastP.y)
          ctx.lineTo(labelBox.rectX, labelBox.rectY + labelBox.height / 2)
          ctx.stroke()

          ctx.fillStyle = color
          ctx.globalAlpha = 1
          ctx.font = 'bold 14px monospace'
          ctx.fillText(text, labelBox.x, labelBox.y)
          ctx.restore()
        }

        if (limitIdx > 0 && limitIdx < transformed.length) {
            drawEndpointLabel(limitIdx)
        } else if (limitIdx >= transformed.length - 1 && transformed.length > 0) {
            drawEndpointLabel(transformed.length - 1)
        }
      }

      if (showBenchmarkCurves.value) {
        drawExtraCurve(benchmarkPoints3D.value, '#0ea5e9', 'S&P 500') // Sky Blue
        // drawExtraCurve(riskFreePoints3D.value, '#f43f5e', 'RISK-FREE') // Rose Pink (Hidden for now)
      }

      // Time Ticks (Fixed Labels)
      const labelsToShow = [0, activePoints.length - 1]
      labelsToShow.forEach(idx => {
        if (idx < 0 || idx >= activePoints.length) return
        const p3d = activePoints[idx]!
        const xPos = p3d.x * scale
        
        const tickStart = { x: xPos, y: (axisY - 2) * scale, z: 0 }
        const tickEnd = { x: xPos, y: (axisY + 4) * scale, z: 0 }
        const t1 = project(rotateX(rotateY(tickStart, currentRotation.value.y), currentRotation.value.x), w, h)
        const t2 = project(rotateX(rotateY(tickEnd, currentRotation.value.y), currentRotation.value.x), w, h)
        
        ctx.strokeStyle = themeText
        ctx.globalAlpha = 0.2
        ctx.beginPath(); ctx.moveTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y); ctx.stroke()

        let label = p3d.dateLabel
        if (idx === 0) label = 'INITIAL_DEPOSIT'
        
        ctx.fillStyle = themeText
        ctx.globalAlpha = 0.4
        ctx.font = '8px monospace'
        ctx.fillText(label, t2.x - 20, t2.y + 15)
        ctx.globalAlpha = 1
      })

      // --- DRAW MAIN PATH --- //
      ctx.lineWidth = 3
      ctx.strokeStyle = colors.value.accent
      ctx.shadowBlur = 15
      ctx.shadowColor = colors.value.accent
      
      const numPoints = transformedCurve.length
      const revealSpan = Math.max(0, numPoints - 1)
      const revealPosition = revealSpan * revealProgress.value
      const limitIdx = Math.min(numPoints - 1, Math.floor(revealPosition))
      const nextIdx = Math.min(numPoints - 1, limitIdx + 1)
      const segmentProgress = Math.min(1, Math.max(0, revealPosition - limitIdx))
      const edgePoint = transformedCurve[limitIdx] && transformedCurve[nextIdx]
        ? {
            x: transformedCurve[limitIdx]!.x + (transformedCurve[nextIdx]!.x - transformedCurve[limitIdx]!.x) * segmentProgress,
            y: transformedCurve[limitIdx]!.y + (transformedCurve[nextIdx]!.y - transformedCurve[limitIdx]!.y) * segmentProgress
          }
        : transformedCurve[limitIdx]

      let lastHistoricalIdx = -1
      activePoints.forEach((point, idx) => {
        if (!point.isProjection) lastHistoricalIdx = idx
      })

      // Draw solid path for historical
      ctx.beginPath()
      const solidEndIdx = Math.min(limitIdx, lastHistoricalIdx)
      const startPoint = transformedCurve[0]
      if (startPoint && solidEndIdx >= 0) {
        ctx.moveTo(startPoint.x, startPoint.y)
        for (let idx = 1; idx <= solidEndIdx; idx++) {
          const p = transformedCurve[idx]!
          ctx.lineTo(p.x, p.y)
        }
        if (edgePoint && nextIdx <= lastHistoricalIdx && segmentProgress > 0) {
          ctx.lineTo(edgePoint.x, edgePoint.y)
        }
      }
      ctx.stroke()
      ctx.shadowBlur = 0

      // Draw dashed path for projection
      if (lastHistoricalIdx !== -1 && revealPosition > lastHistoricalIdx) {
        ctx.setLineDash([10, 5])
        ctx.beginPath()
        const lastRealP = transformedCurve[lastHistoricalIdx]!
        ctx.moveTo(lastRealP.x, lastRealP.y)

        for (let idx = lastHistoricalIdx + 1; idx <= limitIdx; idx++) {
          const p = transformedCurve[idx]!
          ctx.lineTo(p.x, p.y)
        }
        if (edgePoint && nextIdx > lastHistoricalIdx && segmentProgress > 0) {
          ctx.lineTo(edgePoint.x, edgePoint.y)
        }
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Leading edge indicator
      if (limitIdx > 0 && edgePoint) {
        ctx.fillStyle = colors.value.accent
        ctx.shadowBlur = 20
        ctx.shadowColor = colors.value.accent
        ctx.beginPath(); ctx.arc(edgePoint.x, edgePoint.y, 4, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0
      }

      // Nodes and Interaction
      transformedCurve.forEach((p, idx) => {
        if (idx > limitIdx) return
        
        const isHovered = hoveredCurveIndex.value === idx
        ctx.fillStyle = isHovered ? colors.value.accent : themeText
        ctx.beginPath(); ctx.arc(p.x, p.y, isHovered ? 5 : 2, 0, Math.PI * 2); ctx.fill()
        
        if (isHovered) {
          ctx.strokeStyle = colors.value.accent
          ctx.lineWidth = 1
          ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.stroke()
          
          const p3d = activePoints[idx]!
          const floorP = { x: p3d.x * scale, y: axisY * scale, z: p3d.z * scale }
          const tFloor = project(rotateX(rotateY(floorP, currentRotation.value.y), currentRotation.value.x), w, h)
          
          ctx.setLineDash([3, 3])
          ctx.globalAlpha = 0.4
          ctx.strokeStyle = themeText
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(tFloor.x, tFloor.y); ctx.stroke()
          ctx.setLineDash([])
          ctx.globalAlpha = 1

          ctx.fillStyle = colors.value.accent
          ctx.font = 'bold 9px monospace'
          ctx.fillText(String(p3d.dateLabel).toUpperCase(), tFloor.x - 30, tFloor.y + 15)

          const val = showWinrateCurve.value ? `${p3d.value.toFixed(1)}%` : p3d.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
          ctx.fillStyle = themeText
          ctx.font = 'bold 20px monospace'
          ctx.fillText(val, p.x + 20, p.y - 20)
          
          ctx.strokeStyle = colors.value.accent
          ctx.globalAlpha = 0.6
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 15, p.y - 15); ctx.stroke()
          ctx.globalAlpha = 1
        }
      })
    }
  } else {
    metricsPanel.drawMetricsPanel({
      ctx,
      width: w,
      height: h,
      scale,
      isDark: themeStore.settings.isDark,
      strategyMetrics: strategyMetrics.value,
      currentRotation: currentRotation.value,
      viewScale: viewScale.value,
      currentMouseCanvasPos: currentMouseCanvasPos.value,
      canvasRect: canvasRef.value?.getBoundingClientRect() ?? null,
      transformPoint
    })
  }

  rafId = requestAnimationFrame(update)
}

const handleMouseDown = (e: MouseEvent) => {
  const canvas = canvasRef.value; if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  currentMouseCanvasPos.value = { x, y }

  if (showMetricsPanel.value && metricsPanel.handleMetricMouseDown(e, () => { isPanning.value = false })) {
    return
  }

  isPanning.value = true; lastMousePos.value = { x: e.clientX, y: e.clientY }
}

const handleMouseMove = (e: MouseEvent) => {
  const canvas = canvasRef.value; if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  currentMouseCanvasPos.value = { x, y }
  
  if (isPanning.value) {
    const dx = e.clientX - lastMousePos.value.x; const dy = e.clientY - lastMousePos.value.y
    if (e.shiftKey || showMetricsPanel.value) {
      viewOffset.value.x += dx; viewOffset.value.y += dy
    } else {
      targetRotation.value.y += dx * 0.005; targetRotation.value.x += dy * 0.005
    }
    lastMousePos.value = { x: e.clientX, y: e.clientY }
  }

  if (!showMetricsPanel.value) {
    if (showDistribution3D.value) {
      if (showQQPlot.value) {
        hoveredDistributionTooltip.value = null
        let nearestIdx: number | null = null
        let minDist = 15
        const qq = diagnosticStats.value.qqPoints || []
        if (qq.length > 1) {
          const actuals = qq.map((p: any) => p.actual)
          const theoreticals = qq.map((p: any) => p.theoretical)
          const minT = Math.min(...theoreticals)
          const maxT = Math.max(...theoreticals)
          const minA = Math.min(...actuals)
          const maxA = Math.max(...actuals)

          const rangeT = maxT - minT || 1
          const rangeA = maxA - minA || 1

          qq.forEach((pt: any, idx: number) => {
            const pctX = (pt.theoretical - minT) / rangeT
            const pctY = (pt.actual - minA) / rangeA
            const v3d = {
              x: -200 + pctX * 400,
              y: 80 - pctY * 140,
              z: 0
            }
            let pt3d = rotateY(v3d, currentRotation.value.y)
            pt3d = rotateX(pt3d, currentRotation.value.x)
            pt3d.x *= viewScale.value; pt3d.y *= viewScale.value; pt3d.z *= viewScale.value
            const proj = project(pt3d, canvas.width, canvas.height)
            const dist = Math.sqrt((proj.x - x)**2 + (proj.y - y)**2)
            if (dist < minDist) { minDist = dist; nearestIdx = idx }
          })
        }
        hoveredCurveIndex.value = nearestIdx
      } else if (showRobustnessHistogram.value) {
        hoveredCurveIndex.value = null
        const stats = diagnosticStats.value
        const pnlBins = stats.bins || []
        let hoveredBin: DistributionTooltip | null = null
        let closestCenterDistance = Infinity

        if (pnlBins.length > 0) {
          const maxCount = Math.max(...pnlBins.map((b: any) => b.count), 1)
          const binWidth3D = 350 / pnlBins.length
          const gap = 2
          const faces: number[][] = [
            [4, 5, 6, 7],
            [0, 4, 7, 3],
            [1, 5, 6, 2],
            [3, 2, 6, 7],
            [0, 1, 2, 3]
          ]

          pnlBins.forEach((bin: any, idx: number) => {
            if (!bin || bin.count <= 0) return

            const binX = -175 + idx * binWidth3D + binWidth3D / 2
            const barHeight = (bin.count / maxCount) * 110
            const wHalf = (binWidth3D - gap) / 2
            const dHalf = 10
            const floorY = 100
            const topY = 100 - barHeight

            const corners3D: Point3D[] = [
              { x: binX - wHalf, y: floorY, z: -dHalf },
              { x: binX + wHalf, y: floorY, z: -dHalf },
              { x: binX + wHalf, y: topY, z: -dHalf },
              { x: binX - wHalf, y: topY, z: -dHalf },
              { x: binX - wHalf, y: floorY, z: dHalf },
              { x: binX + wHalf, y: floorY, z: dHalf },
              { x: binX + wHalf, y: topY, z: dHalf },
              { x: binX - wHalf, y: topY, z: dHalf }
            ]

            const pts = corners3D.map(point =>
              transformPoint(point, currentRotation.value.y, currentRotation.value.x, viewScale.value, canvas.width, canvas.height)
            )

            const isHit = faces.some(face => {
              const polygon = face
                .map(index => pts[index])
                .filter((point): point is Point2D => Boolean(point))
              return polygon.length === face.length && pointInPolygon(x, y, polygon)
            })

            if (!isHit) return

            const anchor = transformPoint(
              { x: binX, y: topY - 6, z: 0 },
              currentRotation.value.y,
              currentRotation.value.x,
              viewScale.value,
              canvas.width,
              canvas.height
            )
            const centerDistance = Math.sqrt((anchor.x - x) ** 2 + (anchor.y - y) ** 2)
            if (centerDistance >= closestCenterDistance) return

            closestCenterDistance = centerDistance
            hoveredBin = {
              kind: 'histogram',
              label: 'PNL_HISTOGRAM',
              x: (anchor.x / canvas.width) * rect.width,
              y: (anchor.y / canvas.height) * rect.height,
              x0: Number(bin.x0 ?? 0),
              x1: Number(bin.x1 ?? 0),
              mid: Number(bin.mid ?? ((Number(bin.x0 ?? 0) + Number(bin.x1 ?? 0)) / 2)),
              count: Number(bin.count ?? 0),
              density: Number(bin.density ?? 0)
            }
          })
        }

        hoveredDistributionTooltip.value = hoveredBin
      } else {
        const stats = diagnosticStats.value
        const curves = distributionPoints3D.value
        const normalStd = stats.normalParams?.std || 1
        const tScale = stats.tParams?.scale || normalStd
        const tNu = stats.tParams?.nu || 30
        const curveDomain = stats.curveDomain || { min: stats.mean - 3 * normalStd, max: stats.mean + 3 * normalStd }
        const curveRange = Math.max(1, curveDomain.max - curveDomain.min)
        let nearestCurveTooltip: DistributionTooltip | null = null
        let nearestDistance = 14

        const curveModels = []
        if (showRobustnessNormalDist.value) {
          curveModels.push({
            label: 'NORMAL_FIT',
            model: 'Normal distribution',
            points: curves.normalCurve,
            aic: Number(stats.normalParams?.aic ?? 0),
            bic: Number(stats.normalParams?.bic ?? 0),
            density: (returnValue: number) => normalPDF(returnValue, stats.normalParams?.mean ?? stats.mean, normalStd)
          })
        }
        if (showRobustnessTDist.value) {
          curveModels.push({
            label: 'STUDENT_T_FIT',
            model: "Student's t distribution",
            points: curves.tCurve,
            aic: Number(stats.tParams?.aic ?? 0),
            bic: Number(stats.tParams?.bic ?? 0),
            density: (returnValue: number) => studentTPDF(returnValue, stats.tParams?.mean ?? stats.mean, tScale, tNu)
          })
        }

        curveModels.forEach(modelConfig => {
          if (modelConfig.points.length < 2) return

          const projected = modelConfig.points.map(point =>
            transformPoint(point, currentRotation.value.y, currentRotation.value.x, viewScale.value, canvas.width, canvas.height)
          )

          for (let idx = 0; idx < projected.length - 1; idx++) {
            const a = projected[idx]
            const b = projected[idx + 1]
            if (!a || !b) continue

            const hit = distanceToSegment(x, y, a.x, a.y, b.x, b.y)
            if (hit.distance > nearestDistance) continue

            nearestDistance = hit.distance
            const curvePosition = (idx + hit.t) / Math.max(1, modelConfig.points.length - 1)
            const returnValue = curveDomain.min + curvePosition * curveRange
            const anchorX = a.x + (b.x - a.x) * hit.t
            const anchorY = a.y + (b.y - a.y) * hit.t

            nearestCurveTooltip = {
              kind: 'curve',
              label: modelConfig.label,
              x: (anchorX / canvas.width) * rect.width,
              y: (anchorY / canvas.height) * rect.height,
              model: modelConfig.model,
              returnValue,
              density: modelConfig.density(returnValue),
              aic: modelConfig.aic,
              bic: modelConfig.bic
            }
          }
        })

        hoveredDistributionTooltip.value = nearestCurveTooltip
        hoveredCurveIndex.value = null
      }
      metricsPanel.resetHover()
    } else {
      hoveredDistributionTooltip.value = null
      let nearestIdx: number | null = null
      let minDist = 25
      const activePts = showWinrateCurve.value ? winratePoints3D.value : equityPoints3D.value
      activePts.forEach((p, idx) => {
        let pt = rotateY(p, currentRotation.value.y)
        pt = rotateX(pt, currentRotation.value.x)
        pt.x *= viewScale.value; pt.y *= viewScale.value; pt.z *= viewScale.value
        const proj = project(pt, canvas.width, canvas.height)
        const dist = Math.sqrt((proj.x - x)**2 + (proj.y - y)**2)
        if (dist < minDist) { minDist = dist; nearestIdx = idx }
      })
      hoveredCurveIndex.value = nearestIdx
      metricsPanel.resetHover()
    }
  } else {
    hoveredDistributionTooltip.value = null
    metricsPanel.updateMetricHover({
      x,
      y,
      rect,
      canvas,
      currentRotation: currentRotation.value,
      viewScale: viewScale.value,
      transformPoint
    })
    hoveredCurveIndex.value = null
  }
}

const handleMouseUp = () => { 
  if (metricsPanel.handleMetricMouseUp()) {
    isPanning.value = false
    return
  }
  isPanning.value = false 
}

const handleMouseLeave = () => {
  handleMouseUp()
  hoveredDistributionTooltip.value = null
  hoveredCurveIndex.value = null
}

const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  viewScale.value = Math.max(0.5, Math.min(6, viewScale.value - e.deltaY * 0.001))
}

onMounted(() => {
  const bootInterval = setInterval(() => {
    bootProgress.value += Math.random() * 30
    if (bootProgress.value >= 100) {
      bootProgress.value = 100
      clearInterval(bootInterval)
    }
  }, 50)

  const revealInitialFrame = () => {
    initData()
    updateColors()
    update()
    bootProgress.value = 100
    isInitializing.value = false
    canRevealCurve.value = true
    clearInterval(bootInterval)
  }

  requestAnimationFrame(revealInitialFrame)

  const hydrateData = async () => {
    await loadBenchmarkMetricsCache()
    await tradeStore.init()
    await loadMatrixData()

    await metricsPanel.loadMetricsLayout()

    await fetchRealtimeMetrics(getBenchmarkStrategyIds())
    initData()
  }

  void hydrateData().catch(err => {
    console.error('[ExEquityCurve3D] Failed to hydrate deferred data:', err)
  })
})

// --- END CALENDAR LOGIC ---

onUnmounted(() => { cancelAnimationFrame(rafId) })

</script>

<style scoped>
.ex-equity-curve-3d {
  font-family: 'Cormorant Garamond', serif;
}

.calendar-day-cell {
  container-type: inline-size;
  min-width: 0;
  overflow: hidden;
}

.calendar-day-result {
  display: block;
  font-size: clamp(9px, 13cqw, 18px);
  letter-spacing: 0;
  line-height: 1;
  max-width: calc(100% - 12px);
  min-width: 0;
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

canvas {
  touch-action: none;
}

/* PAGE REIFY ANIMATION */
.page-reify-enter-active, .page-reify-leave-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.page-reify-enter-from, .page-reify-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.99);
  filter: blur(10px);
}

/* PROTOCOL SLIDE ANIMATION */
.protocol-slide-enter-active, .protocol-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.protocol-slide-enter-from, .protocol-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* PANEL SLIDE ANIMATION */
.panel-slide-enter-active, .panel-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-slide-enter-from, .panel-slide-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* PAGE SLIDE ANIMATION */
.page-slide-enter-active, .page-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.page-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.page-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
/* DISTRIBUTION TOOLTIP FADE */
.tooltip-dist-fade-enter-active,
.tooltip-dist-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.tooltip-dist-fade-enter-from,
.tooltip-dist-fade-leave-to {
  opacity: 0;
  transform: translateY(-100%) translateY(-24px) translateX(-50%);
}

/* ROBUSTNESS WARNING FLASH — slides straight down from top */
/* EXPLANATION FULL-SCREEN TAKEOVER */
.explanation-takeover-enter-active {
  transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.explanation-takeover-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.explanation-takeover-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.explanation-takeover-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.robustness-warn-enter-active {
  transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.robustness-warn-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.robustness-warn-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}
.robustness-warn-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Hide number input arrows */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

input[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
