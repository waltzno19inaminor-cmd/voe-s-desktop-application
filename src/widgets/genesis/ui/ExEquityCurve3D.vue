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
      <div v-if="showRobustnessExplanations"
           class="absolute inset-0 z-30 overflow-y-auto nier-bg-panel nier-text-primary font-mono selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">

        <div class="w-full max-w-4xl mx-auto px-12 pt-24 pb-64">
          
          <!-- HEADER -->
          <header class="mb-20 border-b border-black/20 dark:border-white/20 pb-12">
            <div class="text-[9px] uppercase tracking-[0.45em] opacity-40 mb-6">VIEW_EXPLANATION</div>
            <h1 class="text-3xl uppercase tracking-widest font-black mb-6" :style="{ color: robustnessExplanation.tone }">
              {{ robustnessExplanation.verdict }}
            </h1>
            <p class="text-[13px] uppercase tracking-[0.1em] leading-loose opacity-70 max-w-3xl">
              {{ robustnessExplanation.diagnosis }}
            </p>
          </header>

          <!-- DATA -->
          <div class="space-y-20 text-[11px] uppercase tracking-widest">
            
            <!-- METRICS -->
            <section>
              <h2 class="text-[9px] tracking-[0.4em] opacity-40 mb-8 pb-3 border-b nier-border-primary">I. DISTRIBUTION_METRICS</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
                <div v-for="item in robustnessExplanationVariables" :key="item.name" class="flex items-end justify-between group border-b border-black/5 dark:border-white/5 pb-2">
                  <span class="opacity-50 group-hover:opacity-100 transition-opacity">{{ item.name }}</span>
                  <span class="font-bold text-sm">{{ item.val }}</span>
                </div>
              </div>
            </section>

            <!-- BOOTSTRAP STABILITY -->
            <section>
              <h2 class="text-[9px] tracking-[0.4em] opacity-40 mb-8 pb-3 border-b nier-border-primary">II. BOOTSTRAP_STABILITY</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 mb-8">
                <div v-for="item in robustnessBootstrapSummary" :key="item.name" class="flex items-end justify-between group border-b border-black/5 dark:border-white/5 pb-2">
                  <span class="opacity-50 group-hover:opacity-100 transition-opacity">{{ item.name }}</span>
                  <span class="font-bold text-sm">{{ item.val }}</span>
                </div>
              </div>
              <p class="opacity-60 leading-loose border-l border-black/20 dark:border-white/20 pl-6">{{ robustnessBootstrapInterpretation }}</p>
            </section>

            <!-- DISTRIBUTION FITS -->
            <section>
              <h2 class="text-[9px] tracking-[0.4em] opacity-40 mb-8 pb-3 border-b nier-border-primary">III. DISTRIBUTION_FITS</h2>
              <div class="flex flex-col border-t border-l border-r nier-border-primary">
                <div v-for="fit in robustnessDistributionFits" :key="fit.name" 
                     class="grid grid-cols-4 items-center p-5 border-b"
                     :class="fit.isBest ? 'border-black/40 bg-black/5 dark:border-white/40 dark:bg-white/5' : 'nier-border-primary opacity-70'">
                  <div class="font-bold flex items-center gap-4">
                    <span class="w-1.5 h-1.5 rounded-full" :class="fit.isBest ? 'nier-bg-inverted' : 'opacity-0'"></span>
                    {{ fit.name }}
                  </div>
                  <div class="opacity-60 text-right">AIC: <span class="font-bold nier-text-primary opacity-100 ml-2 text-sm">{{ fit.aic }}</span></div>
                  <div class="opacity-60 text-right">BIC: <span class="font-bold nier-text-primary opacity-100 ml-2 text-sm">{{ fit.bic }}</span></div>
                  <div class="text-right" :class="fit.isBest ? 'opacity-100 font-bold' : 'opacity-40'">
                    {{ fit.isBest ? '[ OPTIMAL_FIT ]' : '[ SUBOPTIMAL ]' }}
                  </div>
                </div>
              </div>
              <p class="mt-8 opacity-60 leading-loose border-l border-black/20 dark:border-white/20 pl-6">{{ robustnessDistributionComparison }}</p>
            </section>

            <!-- NORMALITY TESTS -->
            <section>
              <h2 class="text-[9px] tracking-[0.4em] opacity-40 mb-8 pb-3 border-b nier-border-primary">IV. NORMALITY_HYPOTHESIS</h2>
              <div class="flex flex-col gap-6 mb-10">
                <div v-for="test in robustnessNormalityTests" :key="test.name" class="flex flex-col gap-3">
                  <div class="flex items-center gap-6">
                    <span class="font-bold w-40">{{ test.name }}</span>
                    <span class="px-3 py-1 text-[9px] tracking-widest border"
                          :class="test.pass ? 'border-black text-black dark:border-white dark:text-white font-bold' : 'border-black/20 dark:border-white/20 opacity-50'">
                      {{ test.result }}
                    </span>
                  </div>
                  <p class="opacity-50 pl-[11.5rem] leading-relaxed">{{ test.note }}</p>
                </div>
              </div>
              <div class="p-6 border" :class="robustnessNormalityTests.every(test => test.pass) ? 'border-black bg-black/5 dark:border-white dark:bg-white/5' : 'border-dashed border-black/20 dark:border-white/20 opacity-80'">
                <p class="leading-loose font-bold">> {{ robustnessHypothesisSummary }}</p>
              </div>
            </section>

            <!-- ROLLING LAYER -->
            <section>
              <h2 class="text-[9px] tracking-[0.4em] opacity-40 mb-8 pb-3 border-b nier-border-primary">V. ROLLING_LAYER_DYNAMICS</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
                <div v-for="item in robustnessUiLayerSummary" :key="item.name" class="flex items-end justify-between group border-b border-black/5 dark:border-white/5 pb-2">
                  <span class="opacity-50 group-hover:opacity-100 transition-opacity">{{ item.name }}</span>
                  <span class="font-bold text-sm">{{ item.val }}</span>
                </div>
              </div>
            </section>

            <!-- ACTION -->
            <section>
              <h2 class="text-[9px] tracking-[0.4em] opacity-40 mb-8 pb-3 border-b nier-border-primary">VI. ROBUSTNESS_ACTION</h2>
              <div class="p-6 border border-black/15 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.03]">
                <p class="leading-loose font-bold" :style="{ color: robustnessExplanation.tone }">> {{ robustnessExplanation.action }}</p>
              </div>
            </section>

            <!-- TRACE -->
            <section>
              <h2 class="text-[9px] tracking-[0.4em] opacity-40 mb-8 pb-3 border-b nier-border-primary">VII. DIAGNOSTIC_TRACE</h2>
              <pre class="whitespace-pre-wrap normal-case tracking-normal leading-loose opacity-60 border-l border-black/20 dark:border-white/20 pl-6">{{ robustnessExplanationSequence }}</pre>
            </section>

          </div>
        </div>
      </div>
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
                <button @click="selectedDeepDiveMetricKey = activeMetricDropdown.metricKey; activeMetricDropdown = null"
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
                  {{ allAvailableConfigs.find(c => c.key === selectedDeepDiveMetricKey)!.label.replaceAll('_', ' ') }}
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
                      {{ allAvailableConfigs.find(c => c.key === selectedDeepDiveMetricKey)!.desc }}
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
                   @click="activeMetricKeys.includes(cfg.key) ? activeMetricKeys = activeMetricKeys.filter(k => k !== cfg.key) : activeMetricKeys.push(cfg.key); saveMetricsLayout()"
                   class="p-4 border transition-all flex items-center justify-between cursor-pointer group"
                   :class="activeMetricKeys.includes(cfg.key) ? 'border-black dark:border-white nier-bg-inverted nier-text-primary shadow-[0_10px_30px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_30px_rgba(255,255,255,0.2)]' : 'nier-border-primary hover:border-black/30 dark:hover:border-white/30 bg-white/50 dark:bg-white/[0.02] nier-text-primary'">
                <div class="flex flex-col space-y-1 w-full">
                  <div class="flex items-center space-x-3">
                    <span class="text-xs font-mono font-bold uppercase tracking-widest transition-colors"
                          :class="activeMetricKeys.includes(cfg.key) ? 'nier-text-primary font-extrabold' : 'nier-text-primary'">
                      {{ cfg.label.replaceAll('_', ' ') }}
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
                    {{ cfg.desc }}
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
          <button @click="showBenchmarkCurves = !showBenchmarkCurves"
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
    <Transition name="fade">
      <div v-if="showCalendarMode" class="absolute inset-0 z-[100] nier-bg-panel pointer-events-auto flex flex-col font-mono nier-text-primary">
        <div class="relative flex flex-col items-center h-full pt-24 pb-8 px-12 w-full max-w-4xl mx-auto">
          <!-- CALENDAR HEADER -->
          <div class="flex-shrink-0 flex items-center justify-center w-full mb-6 border-b nier-border-primary pb-6">
            <h2 class="text-3xl font-black tracking-[0.2em] uppercase">{{ currentCalendarMonthName }}</h2>
          </div>

          <!-- CALENDAR GRID -->
          <div class="w-full flex-1 min-h-0 flex flex-col">
            <div class="flex-shrink-0 grid grid-cols-7 gap-4 mb-4 text-center text-[10px] uppercase tracking-widest opacity-50">
              <div v-for="d in calendarDaysOfWeek" :key="d">{{ d }}</div>
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
              <div class="grid grid-cols-7 gap-4 pb-4">
                <div v-for="(day, idx) in calendarDays" :key="idx" 
                   class="calendar-day-cell relative aspect-square border transition-all duration-300"
                   :class="[
                     !day.isInMonth ? 'border-transparent bg-transparent' : 
                     day.tradesCount === 0 ? 'border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5' :
                     day.pnl > 0 ? 'border-black/30 dark:border-white/30 bg-black/10 dark:bg-white/10' :
                     day.pnl < 0 ? 'border-red-500/30 bg-red-500/10' :
                     'border-yellow-500/30 bg-yellow-500/10'
                   ]"
                   @mouseenter="showCalendarDayTooltip($event, day)"
                   @mousemove="moveCalendarDayTooltip($event, day)"
                   @mouseleave="hideCalendarDayTooltip">
                <template v-if="day.isInMonth">
                  <div class="absolute top-2 right-2 text-[10px] opacity-40 font-bold" :class="{ 'nier-text-primary opacity-100': day.isToday }">{{ day.dayNum }}</div>
                  
                  <div v-if="day.tradesCount > 0" class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span class="calendar-day-result font-black"
                          :title="formatCalendarDayValue(day)"
                          :class="day.pnl > 0 ? 'nier-text-primary' : day.pnl < 0 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'">
                      {{ formatCalendarDayValue(day) }}
                    </span>
                    <span class="text-[9px] uppercase tracking-widest opacity-50 mt-1">{{ day.tradesCount }} TRADES</span>
                  </div>
                </template>
              </div>
            </div>
            </div>
          </div>

          <!-- CALENDAR FOOTER -->
          <div class="flex-shrink-0 flex items-center justify-center w-full mt-6">
            <!-- Pagination — centered -->
            <div class="flex items-center space-x-2">
              <button @click="prevCalendarMonth" 
                      class="w-7 h-7 flex items-center justify-center border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-20"
                      :disabled="currentCalendarMonthIndex <= 0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <button @click="nextCalendarMonth" 
                      class="w-7 h-7 flex items-center justify-center border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-20"
                      :disabled="currentCalendarMonthIndex >= calendarMonthsList.length - 1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <Teleport to="body">
      <Transition name="tooltip-dist-fade">
        <div v-if="hoveredCalendarDayTooltip"
             class="theme-tooltip-panel fixed z-[2147483647] pointer-events-none border px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.22)]"
             :style="{ left: hoveredCalendarDayTooltip.x + 'px', top: hoveredCalendarDayTooltip.y + 'px' }">
          <div class="text-[9px] font-mono uppercase tracking-[0.32em] opacity-40 mb-1">{{ hoveredCalendarDayTooltip.date }}</div>
          <div class="text-[12px] font-mono font-black tracking-[0.12em] whitespace-nowrap"
               :class="hoveredCalendarDayTooltip.pnl > 0 ? 'nier-text-primary' : hoveredCalendarDayTooltip.pnl < 0 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'">
            {{ hoveredCalendarDayTooltip.value }}
          </div>
        </div>
      </Transition>
    </Teleport>

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
const currentCalendarMonthStr = ref('') // Format: 'YYYY-MM'
const calendarValueMode = ref<'currency' | 'percentage'>('currency')
const hoveredCalendarDayTooltip = ref<{ x: number; y: number; value: string; date: string; pnl: number } | null>(null)

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

const activeMetricKeys = ref<string[]>(['netProfit', 'riskRewardRatio', 'expectedValue', 'winRate', 'lossRate', 'profitFactor'])
const isEditMode = ref(false)
const showAddModal = ref(false)
const searchQuery = ref('')
const selectedCategoryFilter = ref('ALL')
const draggingMetricIndex = ref<number | null>(null)
const dragTargetIndex = ref<number | null>(null)
const isHoveringTrash = ref(false)
const activeMetricDropdown = ref<{ metricKey: string; x: number; y: number } | null>(null)
const selectedDeepDiveMetricKey = ref<string | null>(null)

const saveMetricsLayout = async () => {
  await saveToDisk('custom_metrics_layout_v1', activeMetricKeys.value)
}

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
          console.log(`[ExEquityCurve] ⚠️ Rust worker used FALLBACK benchmark data for ${strategyId} -> benchmark: ${res.benchmark_rate.toFixed(2)}%, beta: ${res.beta.toFixed(2)}, risk_free: ${res.risk_free_rate?.toFixed(2)}%`)
        } else {
          console.log(`[ExEquityCurve] ✅ Rust worker synced benchmark data for ${strategyId} -> benchmark: ${res.benchmark_rate.toFixed(2)}%, beta: ${res.beta.toFixed(2)}, risk_free: ${res.risk_free_rate?.toFixed(2)}%`)
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

interface MetricConfig {
  key: string;
  label: string;
  sub: string;
  desc: string;
  formula: string;
  valStr: (m: any) => string;
  tooltipValStr?: (m: any) => string;
  colorClass: (m: any) => string;
  colorVal: (m: any, isDark: boolean) => string;
  evalStr: (m: any) => string;
  evalClass: (m: any) => string;
  benchmarks: { label: string; eval: string; class: string }[];
  category?: string;
}

const primaryMetricsConfigs: MetricConfig[] = [
  {
    key: 'netProfit',
    label: 'Net_Profit',
    sub: 'Gross PnL Delta',
    desc: 'Total realized profit or loss generated across all archived strategy trades.',
    formula: 'Gross Profit - Gross Loss',
    valStr: m => `${m.netProfit >= 0 ? '+' : ''}$${m.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: m => m.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.netProfit >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.netProfit >= 0 ? 'Profitable' : 'Drawdown',
    evalClass: m => m.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> $0', eval: 'Profitable', class: 'text-emerald-500 font-bold' },
      { label: '< $0', eval: 'Drawdown', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'grossProfit',
    label: 'Gross_Profit',
    sub: 'Total Winning PnL',
    desc: 'The cumulative sum of all winning trades in the strategy archive.',
    formula: 'Σ(Winning Trades PnL)',
    valStr: m => `+$${m.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-emerald-400',
    colorVal: (_, isDark) => isDark ? '#ffffff' : '#000000',
    evalStr: m => m.grossProfit > 0 ? 'Nominal' : 'Zero',
    evalClass: m => m.grossProfit > 0 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '> $0', eval: 'Nominal', class: 'text-emerald-500 font-bold' },
      { label: '$0', eval: 'Zero', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'grossLoss',
    label: 'Gross_Loss',
    sub: 'Total Losing PnL',
    desc: 'The cumulative sum of all losing trades in the strategy archive.',
    formula: 'Σ(|Losing Trades PnL|)',
    valStr: m => `-$${m.grossLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-rose-400',
    colorVal: (_, isDark) => isDark ? '#fb7185' : '#e11d48',
    evalStr: m => m.grossLoss === 0 ? 'Perfect' : 'Nominal',
    evalClass: m => m.grossLoss === 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '$0', eval: 'Perfect', class: 'text-emerald-500 font-bold' },
      { label: '> $0', eval: 'Nominal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'winRate',
    label: 'Win_Rate',
    sub: 'Winning Percentage',
    desc: 'The proportion of executed trades that resulted in a positive net return.',
    formula: '(Winning Trades / Total Trades) * 100',
    valStr: m => `${m.winRate.toFixed(1)}%`,
    colorClass: m => m.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400',
    colorVal: (m, isDark) => m.winRate >= 50 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fbbf24' : '#d97706'),
    evalStr: m => m.winRate >= 50 ? 'Optimal' : 'Sub-Optimal',
    evalClass: m => m.winRate >= 50 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '>= 50%', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '< 50%', eval: 'Sub-Optimal', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'lossRate',
    label: 'Loss_Rate',
    sub: 'Losing Percentage',
    desc: 'The proportion of executed trades that resulted in a negative net return.',
    formula: '(Losing Trades / Total Trades) * 100',
    valStr: m => `${m.lossRate.toFixed(1)}%`,
    colorClass: m => m.lossRate < 50 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.lossRate < 50 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.lossRate < 50 ? 'Optimal' : 'Sub-Optimal',
    evalClass: m => m.lossRate < 50 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '< 50%', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '>= 50%', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'avgWin',
    label: 'Average_Win',
    sub: 'Mean Winning PnL',
    desc: 'The average financial return generated per winning trade.',
    formula: 'Gross Profit / Winning Trades',
    valStr: m => `+$${m.avgWin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-emerald-400',
    colorVal: (_, isDark) => isDark ? '#ffffff' : '#000000',
    evalStr: m => m.avgWin > m.avgLoss ? 'Optimal' : 'Sub-Optimal',
    evalClass: m => m.avgWin > m.avgLoss ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '> Avg Loss', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '<= Avg Loss', eval: 'Sub-Optimal', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'avgLoss',
    label: 'Average_Loss',
    sub: 'Mean Losing PnL',
    desc: 'The average financial loss incurred per losing trade.',
    formula: 'Gross Loss / Losing Trades',
    valStr: m => `-$${m.avgLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-rose-400',
    colorVal: (_, isDark) => isDark ? '#fb7185' : '#e11d48',
    evalStr: m => m.avgLoss < m.avgWin ? 'Optimal' : 'Sub-Optimal',
    evalClass: m => m.avgLoss < m.avgWin ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '< Avg Win', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '>= Avg Win', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'avgTrade',
    label: 'Average_Trade',
    sub: 'Expectancy per Trade',
    desc: 'The statistical mean return expected across every executed trade.',
    formula: 'Net Profit / Total Trades',
    valStr: m => `${m.avgTrade >= 0 ? '+' : ''}$${m.avgTrade.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: m => m.avgTrade >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.avgTrade >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.avgTrade >= 0 ? 'Positive Edge' : 'Negative Drag',
    evalClass: m => m.avgTrade >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> $0', eval: 'Positive Edge', class: 'text-emerald-500 font-bold' },
      { label: '< $0', eval: 'Negative Drag', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'payoffRatio',
    label: 'Payoff_Ratio',
    sub: 'Avg Win / Avg Loss',
    desc: 'The ratio of average winning trade magnitude to average losing trade magnitude.',
    formula: 'Average Win / Average Loss',
    valStr: m => `${m.payoffRatio.toFixed(2)}x`,
    colorClass: m => m.payoffRatio >= 1.5 ? 'text-emerald-400' : (m.payoffRatio >= 1 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.payoffRatio >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.payoffRatio >= 1 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.payoffRatio >= 1.5 ? 'Optimal' : (m.payoffRatio >= 1 ? 'Nominal' : 'Sub-Optimal'),
    evalClass: m => m.payoffRatio >= 1.5 ? 'text-emerald-500' : (m.payoffRatio >= 1 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5x', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '1.0x - 1.5x', eval: 'Nominal', class: 'text-amber-500 font-bold' },
      { label: '< 1.0x', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'riskRewardRatio',
    label: 'Risk/Reward_Ratio',
    sub: 'Average Setup RR',
    desc: 'The arithmetic mean setup Risk/Reward across trades with valid entry, stop-loss, and take-profit levels. Zero or invalid RR values are excluded.',
    formula: 'Σ(Valid Trade RR) / Trades With Valid RR',
    valStr: m => `${m.riskRewardRatio.toFixed(2)}R`,
    colorClass: m => m.riskRewardRatio >= 2 ? 'text-emerald-400' : 'text-amber-400',
    colorVal: (m, isDark) => m.riskRewardRatio >= 2 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fbbf24' : '#d97706'),
    evalStr: m => m.riskRewardRatio >= 2 ? 'Optimal' : 'Sub-Optimal',
    evalClass: m => m.riskRewardRatio >= 2 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '>= 2.0R', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '< 2.0R', eval: 'Sub-Optimal', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'realizedRR',
    label: 'Realized_R/R',
    sub: 'Actual Capture RR',
    desc: 'The actual realized Risk/Reward ratio achieved upon trade liquidation.',
    formula: 'Average Win / Average Loss',
    valStr: m => `${m.realizedRR.toFixed(2)}R`,
    colorClass: m => m.realizedRR >= 1.5 ? 'text-emerald-400' : (m.realizedRR >= 1 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.realizedRR >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.realizedRR >= 1 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.realizedRR >= 1.5 ? 'Optimal' : (m.realizedRR >= 1 ? 'Nominal' : 'Sub-Optimal'),
    evalClass: m => m.realizedRR >= 1.5 ? 'text-emerald-500' : (m.realizedRR >= 1 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5R', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '1.0R - 1.5R', eval: 'Nominal', class: 'text-amber-500 font-bold' },
      { label: '< 1.0R', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'expectedValue',
    label: 'Expected_Value',
    sub: 'Statistical EV',
    desc: 'The mathematical expectancy of future performance per executed trade.',
    formula: '(Win% * AvgWin) - (Loss% * AvgLoss)',
    valStr: m => `${m.expectedValue >= 0 ? '+' : ''}$${m.expectedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: m => m.expectedValue >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.expectedValue >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.expectedValue >= 0 ? 'Positive Alpha' : 'Negative Drag',
    evalClass: m => m.expectedValue >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> $0', eval: 'Positive Alpha', class: 'text-emerald-500 font-bold' },
      { label: '< $0', eval: 'Negative Drag', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'profitFactor',
    label: 'Profit_Factor',
    sub: 'Gross Win / Gross Loss',
    desc: 'The absolute ratio of total gross profit to total gross loss.',
    formula: 'Gross Profit / Gross Loss',
    valStr: m => `${m.profitFactor.toFixed(2)}x`,
    colorClass: m => m.profitFactor >= 1.5 ? 'text-emerald-400' : (m.profitFactor >= 1 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.profitFactor >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.profitFactor >= 1 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.profitFactor >= 1.5 ? 'Optimal' : (m.profitFactor >= 1 ? 'Nominal' : 'Sub-Optimal'),
    evalClass: m => m.profitFactor >= 1.5 ? 'text-emerald-500' : (m.profitFactor >= 1 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5x', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '1.0x - 1.5x', eval: 'Nominal', class: 'text-amber-500 font-bold' },
      { label: '< 1.0x', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'beWinRate',
    label: 'Break-even_Win_Rate',
    sub: 'Required Win% for $0',
    desc: 'The minimum win rate required to maintain a zero net profit balance.',
    formula: '1 / (1 + Payoff Ratio)',
    valStr: m => `${m.beWinRate.toFixed(1)}%`,
    colorClass: m => m.winRate >= m.beWinRate ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.winRate >= m.beWinRate ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.winRate >= m.beWinRate ? 'Sustainable' : 'Unsustainable',
    evalClass: m => m.winRate >= m.beWinRate ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '< Win Rate', eval: 'Sustainable', class: 'text-emerald-500 font-bold' },
      { label: '>= Win Rate', eval: 'Unsustainable', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'numTrades',
    label: 'Number_of_Trades',
    sub: 'Sample Size',
    desc: 'The total count of fully liquidated trade records in the strategy archive.',
    formula: 'Count(Archived Trades)',
    valStr: m => `${m.numTrades}`,
    colorClass: m => m.numTrades >= 30 ? 'text-emerald-400' : 'text-amber-400',
    colorVal: (m, isDark) => m.numTrades >= 30 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fbbf24' : '#d97706'),
    evalStr: m => m.numTrades >= 30 ? 'Statistically Significant' : 'Small Sample',
    evalClass: m => m.numTrades >= 30 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '>= 30', eval: 'Significant', class: 'text-emerald-500 font-bold' },
      { label: '< 30', eval: 'Small Sample', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'numWin',
    label: 'Winning_Trades',
    sub: 'Profitable Count',
    desc: 'The count of executed trades that resulted in a positive financial return.',
    formula: 'Count(PnL > 0)',
    valStr: m => `${m.numWin}`,
    colorClass: () => 'text-emerald-400',
    colorVal: (_, isDark) => isDark ? '#ffffff' : '#000000',
    evalStr: m => m.numWin > m.numLoss ? 'Majority Wins' : 'Minority Wins',
    evalClass: m => m.numWin > m.numLoss ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '> Losing Trades', eval: 'Majority Wins', class: 'text-emerald-500 font-bold' },
      { label: '<= Losing Trades', eval: 'Minority Wins', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'numLoss',
    label: 'Losing_Trades',
    sub: 'Negative Count',
    desc: 'The count of executed trades that resulted in a negative financial return.',
    formula: 'Count(PnL < 0)',
    valStr: m => `${m.numLoss}`,
    colorClass: () => 'text-rose-400',
    colorVal: (_, isDark) => isDark ? '#fb7185' : '#e11d48',
    evalStr: m => m.numLoss < m.numWin ? 'Nominal' : 'Sub-Optimal',
    evalClass: m => m.numLoss < m.numWin ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '< Winning Trades', eval: 'Nominal', class: 'text-emerald-500 font-bold' },
      { label: '>= Winning Trades', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'largestWin',
    label: 'Largest_Winning_Trade',
    sub: 'Max Positive PnL',
    desc: 'The single largest financial gain achieved across the entire strategy history.',
    formula: 'Max(Winning Trades PnL)',
    valStr: m => `+$${m.largestWin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-emerald-400',
    colorVal: (_, isDark) => isDark ? '#ffffff' : '#000000',
    evalStr: m => m.largestWin > 0 ? 'Nominal' : 'Zero',
    evalClass: m => m.largestWin > 0 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '> $0', eval: 'Nominal', class: 'text-emerald-500 font-bold' },
      { label: '$0', eval: 'Zero', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'largestLoss',
    label: 'Largest_Losing_Trade',
    sub: 'Max Negative PnL',
    desc: 'The single largest financial loss incurred across the entire strategy history.',
    formula: 'Min(Losing Trades PnL)',
    valStr: m => `-$${Math.abs(m.largestLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-rose-400',
    colorVal: (_, isDark) => isDark ? '#fb7185' : '#e11d48',
    evalStr: m => Math.abs(m.largestLoss) <= (m.avgLoss * 2) ? 'Controlled Risk' : 'Tail Risk Outlier',
    evalClass: m => Math.abs(m.largestLoss) <= (m.avgLoss * 2) ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '<= 2x Avg Loss', eval: 'Controlled', class: 'text-emerald-500 font-bold' },
      { label: '> 2x Avg Loss', eval: 'Tail Risk', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'maxConsWins',
    label: 'Consecutive_Wins',
    sub: 'Longest Winning Streak',
    desc: 'The longest unbroken series of winning trades recorded in chronological order.',
    formula: 'Max Streak(PnL > 0)',
    valStr: m => `${m.maxConsWins}`,
    colorClass: () => 'text-emerald-400',
    colorVal: (_, isDark) => isDark ? '#ffffff' : '#000000',
    evalStr: m => m.maxConsWins >= 3 ? 'Strong Momentum' : 'Nominal',
    evalClass: m => m.maxConsWins >= 3 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '>= 3', eval: 'Strong Momentum', class: 'text-emerald-500 font-bold' },
      { label: '< 3', eval: 'Nominal', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'maxConsLosses',
    label: 'Consecutive_Losses',
    sub: 'Longest Losing Streak',
    desc: 'The longest unbroken series of losing trades recorded in chronological order.',
    formula: 'Max Streak(PnL < 0)',
    valStr: m => `${m.maxConsLosses}`,
    colorClass: () => 'text-rose-400',
    colorVal: (_, isDark) => isDark ? '#fb7185' : '#e11d48',
    evalStr: m => m.maxConsLosses <= 3 ? 'Controlled Drawdown' : 'Systemic Drawdown',
    evalClass: m => m.maxConsLosses <= 3 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '<= 3', eval: 'Controlled', class: 'text-emerald-500 font-bold' },
      { label: '> 3', eval: 'Systemic', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'avgHoldingTimeStr',
    label: 'Average_Holding_Time',
    sub: 'Mean Trade Duration',
    desc: 'The average temporal span between trade initiation and complete liquidation.',
    formula: 'Σ(Exit Time - Entry Time) / Trades With Entry+Exit Time',
    valStr: m => m.avgHoldingTimeStr,
    colorClass: () => 'nier-text-primary',
    colorVal: (_, isDark) => isDark ? '#ffffff' : '#000000',
    evalStr: () => 'Strategy Aligned',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Strategy Aligned', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'avgProfitPerDay',
    label: 'Average_Profit_Velocity',
    sub: 'Day / Week / Month',
    desc: 'The average net financial return generated per active calendar day, week, and month in the archive.',
    formula: 'Net Profit / Active Span',
    valStr: m => `$${m.avgProfitPerDay.toLocaleString(undefined, { maximumFractionDigits: 1 })}/d`,
    tooltipValStr: m => `$${m.avgProfitPerDay.toLocaleString(undefined, { maximumFractionDigits: 1 })}/d | $${m.avgProfitPerWeek.toLocaleString(undefined, { maximumFractionDigits: 1 })}/w | $${m.avgProfitPerMonth.toLocaleString(undefined, { maximumFractionDigits: 1 })}/m`,
    colorClass: m => m.avgProfitPerDay >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.avgProfitPerDay >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.avgProfitPerDay >= 0 ? 'Positive Velocity' : 'Negative Drag',
    evalClass: m => m.avgProfitPerDay >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> $0', eval: 'Positive Velocity', class: 'text-emerald-500 font-bold' },
      { label: '< $0', eval: 'Negative Drag', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'maxDrawdownNum',
    label: 'Maximum_Drawdown',
    sub: 'Peak-to-Trough Delta',
    desc: 'The maximum observed loss from a historical equity peak to a subsequent trough.',
    formula: 'Max(Equity Peak - Subsequent Trough)',
    valStr: m => `-$${m.maxDrawdownNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    tooltipValStr: m => `-$${m.maxDrawdownNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${m.maxDrawdownPct.toFixed(1)}%)`,
    colorClass: () => 'text-rose-400',
    colorVal: (_, isDark) => isDark ? '#fb7185' : '#e11d48',
    evalStr: m => m.maxDrawdownPct <= 20 ? 'Controlled Risk' : 'Severe Drawdown',
    evalClass: m => m.maxDrawdownPct <= 20 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '<= 20%', eval: 'Controlled', class: 'text-emerald-500 font-bold' },
      { label: '> 20%', eval: 'Severe', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'avgDrawdownPct',
    label: 'Average_Drawdown',
    sub: 'Mean Drawdown Depth',
    desc: 'The statistical mean of all observed equity drawdowns across the strategy history.',
    formula: 'Σ(Drawdown %) / Drawdown Count',
    valStr: m => `${m.avgDrawdownPct.toFixed(1)}%`,
    colorClass: () => 'text-rose-400',
    colorVal: (_, isDark) => isDark ? '#fb7185' : '#e11d48',
    evalStr: m => m.avgDrawdownPct <= 10 ? 'Nominal' : 'Sub-Optimal',
    evalClass: m => m.avgDrawdownPct <= 10 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '<= 10%', eval: 'Nominal', class: 'text-emerald-500 font-bold' },
      { label: '> 10%', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'drawdownDurationStr',
    label: 'Drawdown_Duration',
    sub: 'Max Recovery Span',
    desc: 'The longest temporal duration spent in a state of equity drawdown before achieving a new peak.',
    formula: 'Max(Trough Date - Peak Date)',
    valStr: m => m.drawdownDurationStr,
    colorClass: () => 'text-amber-400',
    colorVal: (_, isDark) => isDark ? '#fbbf24' : '#d97706',
    evalStr: () => 'Nominal Span',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Nominal Span', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'recoveryFactor',
    label: 'Recovery_Factor',
    sub: 'Net Profit / Max DD',
    desc: 'The ratio of total net profit to the maximum historical equity drawdown.',
    formula: 'Net Profit / Maximum Drawdown',
    valStr: m => `${m.recoveryFactor.toFixed(2)}x`,
    colorClass: m => m.recoveryFactor >= 2 ? 'text-emerald-400' : (m.recoveryFactor >= 1 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.recoveryFactor >= 2 ? (isDark ? '#ffffff' : '#000000') : (m.recoveryFactor >= 1 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.recoveryFactor >= 2 ? 'Excellent' : (m.recoveryFactor >= 1 ? 'Nominal' : 'Sub-Optimal'),
    evalClass: m => m.recoveryFactor >= 2 ? 'text-emerald-500' : (m.recoveryFactor >= 1 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 2.0x', eval: 'Excellent', class: 'text-emerald-500 font-bold' },
      { label: '1.0x - 2.0x', eval: 'Nominal', class: 'text-amber-500 font-bold' },
      { label: '< 1.0x', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'returnOnCapital',
    label: 'Return_on_Capital',
    sub: 'Net Profit / Deposit',
    desc: 'The cumulative percentage return generated on the initial capital injection.',
    formula: '(Net Profit / Initial Deposit) * 100',
    valStr: m => `${m.returnOnCapital >= 0 ? '+' : ''}${m.returnOnCapital.toFixed(1)}%`,
    colorClass: m => m.returnOnCapital >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.returnOnCapital >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.returnOnCapital >= 0 ? 'Positive Alpha' : 'Capital Erosion',
    evalClass: m => m.returnOnCapital >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> 0%', eval: 'Positive Alpha', class: 'text-emerald-500 font-bold' },
      { label: '< 0%', eval: 'Capital Erosion', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'returnPerTrade',
    label: 'Return_per_Trade',
    sub: 'Mean Dollar Alpha',
    desc: 'The average net financial return captured per executed trade record.',
    formula: 'Net Profit / Total Trades',
    valStr: m => `${m.returnPerTrade >= 0 ? '+' : ''}$${m.returnPerTrade.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: m => m.returnPerTrade >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.returnPerTrade >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.returnPerTrade >= 0 ? 'Positive Edge' : 'Negative Drag',
    evalClass: m => m.returnPerTrade >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> $0', eval: 'Positive Edge', class: 'text-emerald-500 font-bold' },
      { label: '< $0', eval: 'Negative Drag', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'riskPerTrade',
    label: 'Risk_per_Trade',
    sub: 'Mean Dollar Risk',
    desc: 'The average financial risk exposure established per executed trade setup.',
    formula: 'Total Initial Risk / Trades With Risk Data',
    valStr: m => `$${m.riskPerTrade.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-amber-400',
    colorVal: (_, isDark) => isDark ? '#fbbf24' : '#d97706',
    evalStr: () => 'Controlled Budget',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Controlled Budget', class: 'text-emerald-500 font-bold' }
    ]
  }
];

const advancedMetricsConfigs: MetricConfig[] = [
  {
    key: 'sharpeRatio',
    label: 'Sharpe_Ratio',
    sub: 'Risk-Adjusted Return',
    desc: 'The excess return per unit of total return volatility. Measures investment efficiency.',
    formula: '(CAGR - Rf) / Annualized StdDev(Return)',
    valStr: m => `${m.sharpeRatio.toFixed(2)}`,
    colorClass: m => m.sharpeRatio >= 1.5 ? 'text-emerald-400' : (m.sharpeRatio >= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.sharpeRatio >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.sharpeRatio >= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.sharpeRatio >= 1.5 ? 'Optimal' : (m.sharpeRatio >= 1.0 ? 'Nominal' : 'Sub-Optimal'),
    evalClass: m => m.sharpeRatio >= 1.5 ? 'text-emerald-500' : (m.sharpeRatio >= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '1.0 - 1.5', eval: 'Nominal', class: 'text-amber-500 font-bold' },
      { label: '< 1.0', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'sortinoRatio',
    label: 'Sortino_Ratio',
    sub: 'Downside Risk Adj',
    desc: 'The excess return per unit of downside volatility. Differentiates harmful volatility from general volatility.',
    formula: '(CAGR - Rf) / Annualized Downside StdDev',
    valStr: m => `${m.sortinoRatio.toFixed(2)}`,
    colorClass: m => m.sortinoRatio >= 2.0 ? 'text-emerald-400' : (m.sortinoRatio >= 1.5 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.sortinoRatio >= 2.0 ? (isDark ? '#ffffff' : '#000000') : (m.sortinoRatio >= 1.5 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.sortinoRatio >= 2.0 ? 'Excellent' : (m.sortinoRatio >= 1.5 ? 'Good' : 'Sub-Optimal'),
    evalClass: m => m.sortinoRatio >= 2.0 ? 'text-emerald-500' : (m.sortinoRatio >= 1.5 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 2.0', eval: 'Excellent', class: 'text-emerald-500 font-bold' },
      { label: '1.5 - 2.0', eval: 'Good', class: 'text-amber-500 font-bold' },
      { label: '< 1.5', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'calmarRatio',
    label: 'Calmar_Ratio',
    sub: 'CAGR / Max Drawdown',
    desc: 'The ratio of compounded annual growth rate to the maximum historical equity drawdown.',
    formula: 'CAGR / Maximum Drawdown %',
    valStr: m => `${m.calmarRatio.toFixed(2)}`,
    colorClass: m => m.calmarRatio >= 2.0 ? 'text-emerald-400' : (m.calmarRatio >= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.calmarRatio >= 2.0 ? (isDark ? '#ffffff' : '#000000') : (m.calmarRatio >= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.calmarRatio >= 2.0 ? 'Superior' : (m.calmarRatio >= 1.0 ? 'Stable' : 'Sub-Optimal'),
    evalClass: m => m.calmarRatio >= 2.0 ? 'text-emerald-500' : (m.calmarRatio >= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 2.0', eval: 'Superior', class: 'text-emerald-500 font-bold' },
      { label: '1.0 - 2.0', eval: 'Stable', class: 'text-amber-500 font-bold' },
      { label: '< 1.0', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'sterlingRatio',
    label: 'Sterling_Ratio',
    sub: 'CAGR / Avg Drawdown',
    desc: 'The ratio of compounded annual growth rate to the average historical equity drawdown.',
    formula: 'CAGR / Average Drawdown %',
    valStr: m => `${m.sterlingRatio.toFixed(2)}`,
    colorClass: m => m.sterlingRatio >= 1.5 ? 'text-emerald-400' : (m.sterlingRatio >= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.sterlingRatio >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.sterlingRatio >= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.sterlingRatio >= 1.5 ? 'Optimal' : (m.sterlingRatio >= 1.0 ? 'Nominal' : 'Sub-Optimal'),
    evalClass: m => m.sterlingRatio >= 1.5 ? 'text-emerald-500' : (m.sterlingRatio >= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '1.0 - 1.5', eval: 'Nominal', class: 'text-amber-500 font-bold' },
      { label: '< 1.0', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'omegaRatio',
    label: 'Omega_Ratio',
    sub: 'Gain / Loss Weight',
    desc: 'The probability-weighted ratio of gains versus losses above a specified target threshold.',
    formula: 'Σ(Positive Returns) / Σ(|Negative Returns|)',
    valStr: m => `${m.omegaRatio.toFixed(2)}x`,
    colorClass: m => m.omegaRatio >= 1.5 ? 'text-emerald-400' : (m.omegaRatio >= 1.2 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.omegaRatio >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.omegaRatio >= 1.2 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.omegaRatio >= 1.5 ? 'Strong Edge' : (m.omegaRatio >= 1.2 ? 'Nominal' : 'Sub-Optimal'),
    evalClass: m => m.omegaRatio >= 1.5 ? 'text-emerald-500' : (m.omegaRatio >= 1.2 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5x', eval: 'Strong Edge', class: 'text-emerald-500 font-bold' },
      { label: '1.2x - 1.5x', eval: 'Nominal', class: 'text-amber-500 font-bold' },
      { label: '< 1.2x', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'ulcerIndex',
    label: 'Ulcer_Index',
    sub: 'Drawdown Depth/Dur',
    desc: 'A measure of the depth and duration of drawdowns from earlier peaks. Lower indicates less stress.',
    formula: 'Sqrt( Σ(Drawdown % ^ 2) / N )',
    valStr: m => `${m.ulcerIndex.toFixed(1)}%`,
    colorClass: m => m.ulcerIndex <= 5.0 ? 'text-emerald-400' : (m.ulcerIndex <= 10.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.ulcerIndex <= 5.0 ? (isDark ? '#ffffff' : '#000000') : (m.ulcerIndex <= 10.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.ulcerIndex <= 5.0 ? 'Low Stress' : (m.ulcerIndex <= 10.0 ? 'Moderate' : 'High Stress'),
    evalClass: m => m.ulcerIndex <= 5.0 ? 'text-emerald-500' : (m.ulcerIndex <= 10.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '<= 5.0%', eval: 'Low Stress', class: 'text-emerald-500 font-bold' },
      { label: '5.0% - 10%', eval: 'Moderate', class: 'text-amber-500 font-bold' },
      { label: '> 10%', eval: 'High Stress', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'marRatio',
    label: 'MAR_Ratio',
    sub: 'CAGR / Max DD',
    desc: 'The ratio of Compounded Annual Growth Rate to Maximum Drawdown. Used by CTAs and institutions.',
    formula: 'CAGR / Maximum Drawdown %',
    valStr: m => `${m.marRatio.toFixed(2)}`,
    colorClass: m => m.marRatio >= 1.0 ? 'text-emerald-400' : (m.marRatio >= 0.5 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.marRatio >= 1.0 ? (isDark ? '#ffffff' : '#000000') : (m.marRatio >= 0.5 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.marRatio >= 1.0 ? 'Excellent' : (m.marRatio >= 0.5 ? 'Acceptable' : 'Sub-Optimal'),
    evalClass: m => m.marRatio >= 1.0 ? 'text-emerald-500' : (m.marRatio >= 0.5 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.0', eval: 'Excellent', class: 'text-emerald-500 font-bold' },
      { label: '0.5 - 1.0', eval: 'Acceptable', class: 'text-amber-500 font-bold' },
      { label: '< 0.5', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'gainToPainRatio',
    label: 'Gain-to-Pain',
    sub: 'Schwager Edge Metric',
    desc: 'Jack Schwager\'s Gain-to-Pain ratio: the sum of all returns divided by the absolute sum of all negative returns.',
    formula: 'Σ(All Returns) / Σ(|Negative Returns|)',
    valStr: m => `${m.gainToPainRatio.toFixed(2)}`,
    colorClass: m => m.gainToPainRatio >= 1.5 ? 'text-emerald-400' : (m.gainToPainRatio >= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.gainToPainRatio >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.gainToPainRatio >= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.gainToPainRatio >= 1.5 ? 'Superior' : (m.gainToPainRatio >= 1.0 ? 'Stable' : 'Sub-Optimal'),
    evalClass: m => m.gainToPainRatio >= 1.5 ? 'text-emerald-500' : (m.gainToPainRatio >= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5', eval: 'Superior', class: 'text-emerald-500 font-bold' },
      { label: '1.0 - 1.5', eval: 'Stable', class: 'text-amber-500 font-bold' },
      { label: '< 1.0', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'tailRatio',
    label: 'Tail_Ratio',
    sub: '95th / 5th Percentile',
    desc: 'The ratio of the 95th percentile of winning returns to the absolute 5th percentile of losing returns.',
    formula: 'P95(Returns) / |P05(Returns)|',
    valStr: m => `${m.tailRatio.toFixed(2)}`,
    colorClass: m => m.tailRatio >= 1.2 ? 'text-emerald-400' : (m.tailRatio >= 0.9 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.tailRatio >= 1.2 ? (isDark ? '#ffffff' : '#000000') : (m.tailRatio >= 0.9 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.tailRatio >= 1.2 ? 'Favorable Asymmetry' : (m.tailRatio >= 0.9 ? 'Symmetric' : 'Fat Tail Risk'),
    evalClass: m => m.tailRatio >= 1.2 ? 'text-emerald-500' : (m.tailRatio >= 0.9 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.2', eval: 'Favorable Asymmetry', class: 'text-emerald-500 font-bold' },
      { label: '0.9 - 1.2', eval: 'Symmetric', class: 'text-amber-500 font-bold' },
      { label: '< 0.9', eval: 'Fat Tail Risk', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'commonSenseRatio',
    label: 'Common_Sense_Ratio',
    sub: 'Tail * Gain-to-Pain',
    desc: 'A composite metric combining the Tail Ratio and Gain-to-Pain Ratio to assess robust asymmetric edge.',
    formula: 'Tail Ratio * Gain-to-Pain Ratio',
    valStr: m => `${m.commonSenseRatio.toFixed(2)}`,
    colorClass: m => m.commonSenseRatio >= 1.5 ? 'text-emerald-400' : (m.commonSenseRatio >= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.commonSenseRatio >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.commonSenseRatio >= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.commonSenseRatio >= 1.5 ? 'Robust Edge' : (m.commonSenseRatio >= 1.0 ? 'Nominal' : 'Fragile'),
    evalClass: m => m.commonSenseRatio >= 1.5 ? 'text-emerald-500' : (m.commonSenseRatio >= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5', eval: 'Robust Edge', class: 'text-emerald-500 font-bold' },
      { label: '1.0 - 1.5', eval: 'Nominal', class: 'text-amber-500 font-bold' },
      { label: '< 1.0', eval: 'Fragile', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'profitFactorStrategy',
    label: 'PF_by_Strategy',
    sub: 'Active Strategy PF',
    desc: 'The profit factor specifically isolated for trade records matching the currently active strategy protocol.',
    formula: 'Strategy Gross Profit / Strategy Gross Loss',
    valStr: m => `${m.profitFactorStrategy.toFixed(2)}x`,
    colorClass: m => m.profitFactorStrategy >= 2.0 ? 'text-emerald-400' : (m.profitFactorStrategy >= 1.5 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.profitFactorStrategy >= 2.0 ? (isDark ? '#ffffff' : '#000000') : (m.profitFactorStrategy >= 1.5 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.profitFactorStrategy >= 2.0 ? 'Elite' : (m.profitFactorStrategy >= 1.5 ? 'Stable' : 'Sub-Optimal'),
    evalClass: m => m.profitFactorStrategy >= 2.0 ? 'text-emerald-500' : (m.profitFactorStrategy >= 1.5 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 2.0x', eval: 'Elite', class: 'text-emerald-500 font-bold' },
      { label: '1.5x - 2.0x', eval: 'Stable', class: 'text-amber-500 font-bold' },
      { label: '< 1.5x', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'profitFactorMarket',
    label: 'PF_by_Market',
    sub: 'Best Market Alpha',
    desc: 'The highest profit factor achieved across all traded market instruments and asset classes within the strategy.',
    formula: 'Max(Asset Gross Profit / Asset Gross Loss)',
    valStr: m => `${m.profitFactorMarket.toFixed(2)}x`,
    colorClass: m => m.profitFactorMarket >= 2.0 ? 'text-emerald-400' : (m.profitFactorMarket >= 1.5 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.profitFactorMarket >= 2.0 ? (isDark ? '#ffffff' : '#000000') : (m.profitFactorMarket >= 1.5 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.profitFactorMarket >= 2.0 ? 'Elite Alpha' : (m.profitFactorMarket >= 1.5 ? 'Stable' : 'Sub-Optimal'),
    evalClass: m => m.profitFactorMarket >= 2.0 ? 'text-emerald-500' : (m.profitFactorMarket >= 1.5 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 2.0x', eval: 'Elite Alpha', class: 'text-emerald-500 font-bold' },
      { label: '1.5x - 2.0x', eval: 'Stable', class: 'text-amber-500 font-bold' },
      { label: '< 1.5x', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'profitFactorTimeframe',
    label: 'PF_by_Timeframe',
    sub: 'Best Timeframe Alpha',
    desc: 'The highest profit factor achieved across all traded execution timeframes and chart intervals.',
    formula: 'Max(TF Gross Profit / TF Gross Loss)',
    valStr: m => `${m.profitFactorTimeframe.toFixed(2)}x`,
    colorClass: m => m.profitFactorTimeframe >= 2.0 ? 'text-emerald-400' : (m.profitFactorTimeframe >= 1.5 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.profitFactorTimeframe >= 2.0 ? (isDark ? '#ffffff' : '#000000') : (m.profitFactorTimeframe >= 1.5 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.profitFactorTimeframe >= 2.0 ? 'Elite Alpha' : (m.profitFactorTimeframe >= 1.5 ? 'Stable' : 'Sub-Optimal'),
    evalClass: m => m.profitFactorTimeframe >= 2.0 ? 'text-emerald-500' : (m.profitFactorTimeframe >= 1.5 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 2.0x', eval: 'Elite Alpha', class: 'text-emerald-500 font-bold' },
      { label: '1.5x - 2.0x', eval: 'Stable', class: 'text-amber-500 font-bold' },
      { label: '< 1.5x', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'avgTradeExpectancy',
    label: 'Avg_Trade_Expectancy',
    sub: 'Expected Dollar PnL',
    desc: 'The mathematical expected dollar value generated per executed trade setup based on win rate and mean outcomes.',
    formula: '(Win% * AvgWin) - (Loss% * AvgLoss)',
    valStr: m => `${m.avgTradeExpectancy >= 0 ? '+' : ''}$${m.avgTradeExpectancy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: m => m.avgTradeExpectancy >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.avgTradeExpectancy >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.avgTradeExpectancy >= 0 ? 'Positive Edge' : 'Negative Drag',
    evalClass: m => m.avgTradeExpectancy >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> $0', eval: 'Positive Edge', class: 'text-emerald-500 font-bold' },
      { label: '< $0', eval: 'Negative Drag', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'expectancyScore',
    label: 'Expectancy_Score',
    sub: 'Expectancy / Avg Loss',
    desc: 'Normalized expectancy score expressed as a ratio of expected value to the average losing trade magnitude.',
    formula: 'Expected Value / Average Loss',
    valStr: m => `${m.expectancyScore.toFixed(2)}`,
    colorClass: m => m.expectancyScore >= 0.5 ? 'text-emerald-400' : (m.expectancyScore >= 0.2 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.expectancyScore >= 0.5 ? (isDark ? '#ffffff' : '#000000') : (m.expectancyScore >= 0.2 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.expectancyScore >= 0.5 ? 'Excellent' : (m.expectancyScore >= 0.2 ? 'Stable' : 'Sub-Optimal'),
    evalClass: m => m.expectancyScore >= 0.5 ? 'text-emerald-500' : (m.expectancyScore >= 0.2 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 0.5', eval: 'Excellent', class: 'text-emerald-500 font-bold' },
      { label: '0.2 - 0.5', eval: 'Stable', class: 'text-amber-500 font-bold' },
      { label: '< 0.2', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'latestRMultiple',
    label: 'R-Multiple',
    sub: 'Latest Trade R-Value',
    desc: 'The realized return-to-risk multiple (R-multiple) captured on the most recently archived trade execution.',
    formula: 'Latest PnL / Latest Initial Risk',
    valStr: m => `${m.latestRMultiple >= 0 ? '+' : ''}${m.latestRMultiple.toFixed(2)}R`,
    colorClass: m => m.latestRMultiple >= 2.0 ? 'text-emerald-400' : (m.latestRMultiple >= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.latestRMultiple >= 2.0 ? (isDark ? '#ffffff' : '#000000') : (m.latestRMultiple >= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.latestRMultiple >= 2.0 ? 'Optimal R' : (m.latestRMultiple >= 1.0 ? 'Nominal R' : 'Sub-Optimal R'),
    evalClass: m => m.latestRMultiple >= 2.0 ? 'text-emerald-500' : (m.latestRMultiple >= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 2.0R', eval: 'Optimal R', class: 'text-emerald-500 font-bold' },
      { label: '1.0R - 2.0R', eval: 'Nominal R', class: 'text-amber-500 font-bold' },
      { label: '< 1.0R', eval: 'Sub-Optimal R', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'avgRMultiple',
    label: 'Average_R-Multiple',
    sub: 'Mean Historical R',
    desc: 'The statistical mean of all realized R-multiples captured across the entire strategy trade archive.',
    formula: 'Σ(Trade R-Multiples) / Total Trades',
    valStr: m => `${m.avgRMultiple >= 0 ? '+' : ''}${m.avgRMultiple.toFixed(2)}R`,
    colorClass: m => m.avgRMultiple >= 1.5 ? 'text-emerald-400' : (m.avgRMultiple >= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.avgRMultiple >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.avgRMultiple >= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.avgRMultiple >= 1.5 ? 'Strong Edge' : (m.avgRMultiple >= 1.0 ? 'Nominal' : 'Sub-Optimal'),
    evalClass: m => m.avgRMultiple >= 1.5 ? 'text-emerald-500' : (m.avgRMultiple >= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5R', eval: 'Strong Edge', class: 'text-emerald-500 font-bold' },
      { label: '1.0R - 1.5R', eval: 'Nominal', class: 'text-amber-500 font-bold' },
      { label: '< 1.0R', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'rMultipleDist',
    label: 'R-Multiple_Dist',
    sub: '% Trades >= 2.0R',
    desc: 'The percentage of all executed trades that successfully captured an R-multiple of 2.0R or greater.',
    formula: '(Trades >= 2.0R / Total Trades) * 100',
    valStr: m => `${m.rMultipleDist.toFixed(1)}%`,
    colorClass: m => m.rMultipleDist >= 30 ? 'text-emerald-400' : (m.rMultipleDist >= 15 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.rMultipleDist >= 30 ? (isDark ? '#ffffff' : '#000000') : (m.rMultipleDist >= 15 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.rMultipleDist >= 30 ? 'Excellent' : (m.rMultipleDist >= 15 ? 'Stable' : 'Sub-Optimal'),
    evalClass: m => m.rMultipleDist >= 30 ? 'text-emerald-500' : (m.rMultipleDist >= 15 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 30%', eval: 'Excellent', class: 'text-emerald-500 font-bold' },
      { label: '15% - 30%', eval: 'Stable', class: 'text-amber-500 font-bold' },
      { label: '< 15%', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'riskOfRuin',
    label: 'Risk_of_Ruin',
    sub: 'Capital Depletion Prob',
    desc: 'The mathematical probability of reaching total capital depletion based on current win rate and payoff ratio.',
    formula: '((1 - Kelly Edge) / (1 + Kelly Edge)) ^ CapitalUnits',
    valStr: m => `${m.riskOfRuin.toFixed(1)}%`,
    colorClass: m => m.riskOfRuin <= 1.0 ? 'text-emerald-400' : (m.riskOfRuin <= 5.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.riskOfRuin <= 1.0 ? (isDark ? '#ffffff' : '#000000') : (m.riskOfRuin <= 5.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.riskOfRuin <= 1.0 ? 'Safe' : (m.riskOfRuin <= 5.0 ? 'Vulnerable' : 'Critical Risk'),
    evalClass: m => m.riskOfRuin <= 1.0 ? 'text-emerald-500' : (m.riskOfRuin <= 5.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '<= 1.0%', eval: 'Safe', class: 'text-emerald-500 font-bold' },
      { label: '1.0% - 5.0%', eval: 'Vulnerable', class: 'text-amber-500 font-bold' },
      { label: '> 5.0%', eval: 'Critical Risk', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'slope',
    label: 'Equity_Curve_Slope',
    sub: 'Linear Reg PnL Velocity',
    desc: 'The linear regression slope of the equity curve, representing the true annualized or per-trade equity growth velocity.',
    formula: 'Cov(Trade Index, Equity) / Var(Trade Index)',
    valStr: m => `${m.slope >= 0 ? '+' : ''}$${m.slope.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: m => m.slope >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.slope >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.slope >= 0 ? 'Upward Trajectory' : 'Downward Trajectory',
    evalClass: m => m.slope >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> $0', eval: 'Upward Trajectory', class: 'text-emerald-500 font-bold' },
      { label: '< $0', eval: 'Downward Trajectory', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'equityCurveVolatility',
    label: 'Equity_Curve_Vol',
    sub: 'StdDev of Residuals',
    desc: 'The standard deviation of equity curve residuals around the linear regression line. Measures equity smoothness.',
    formula: 'Sqrt( Σ(Equity - RegLine)^2 / (N-2) )',
    valStr: m => `$${m.equityCurveVolatility.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-amber-400',
    colorVal: (_, isDark) => isDark ? '#fbbf24' : '#d97706',
    evalStr: () => 'Measured Volatility',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Measured Volatility', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'equityCurveStability',
    label: 'Equity_Curve_Stab',
    sub: 'R-Squared Fit (R²)',
    desc: 'The R-squared (R²) coefficient of determination for the equity curve linear regression line. Measures trend consistency.',
    formula: '1 - (SS_res / SS_tot)',
    valStr: m => `${m.equityCurveStability.toFixed(1)}%`,
    colorClass: m => m.equityCurveStability >= 80 ? 'text-emerald-400' : (m.equityCurveStability >= 50 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.equityCurveStability >= 80 ? (isDark ? '#ffffff' : '#000000') : (m.equityCurveStability >= 50 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.equityCurveStability >= 80 ? 'High Stability' : (m.equityCurveStability >= 50 ? 'Moderate' : 'Erratic'),
    evalClass: m => m.equityCurveStability >= 80 ? 'text-emerald-500' : (m.equityCurveStability >= 50 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 80%', eval: 'High Stability', class: 'text-emerald-500 font-bold' },
      { label: '50% - 80%', eval: 'Moderate', class: 'text-amber-500 font-bold' },
      { label: '< 50%', eval: 'Erratic', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'equityCurveCorrelation',
    label: 'Equity_Curve_Corr',
    sub: 'Pearson Correlation (r)',
    desc: 'The Pearson correlation coefficient (r) between trade progression index and equity balance. Indicates structural growth.',
    formula: 'Sqrt(R-Squared)',
    valStr: m => `${m.equityCurveCorrelation.toFixed(2)}`,
    colorClass: m => m.equityCurveCorrelation >= 0.9 ? 'text-emerald-400' : (m.equityCurveCorrelation >= 0.7 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.equityCurveCorrelation >= 0.9 ? (isDark ? '#ffffff' : '#000000') : (m.equityCurveCorrelation >= 0.7 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.equityCurveCorrelation >= 0.9 ? 'Strong Trend' : (m.equityCurveCorrelation >= 0.7 ? 'Moderate' : 'Weak Trend'),
    evalClass: m => m.equityCurveCorrelation >= 0.9 ? 'text-emerald-500' : (m.equityCurveCorrelation >= 0.7 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 0.90', eval: 'Strong Trend', class: 'text-emerald-500 font-bold' },
      { label: '0.70 - 0.90', eval: 'Moderate', class: 'text-amber-500 font-bold' },
      { label: '< 0.70', eval: 'Weak Trend', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'stdPnL',
    label: 'Trade_Result_StdDev',
    sub: 'PnL Dispersion Matrix',
    desc: 'The statistical standard deviation of individual trade profit and loss results around the mean trade outcome.',
    formula: 'Sqrt( Σ(PnL - MeanPnL)^2 / (N-1) )',
    valStr: m => `$${m.stdPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-amber-400',
    colorVal: (_, isDark) => isDark ? '#fbbf24' : '#d97706',
    evalStr: () => 'Measured Dispersion',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Measured Dispersion', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'varPnL',
    label: 'Trade_Result_Var',
    sub: 'PnL Variance (σ²)',
    desc: 'The statistical variance (σ²) of individual trade profit and loss results. The square of standard deviation.',
    formula: 'Σ(PnL - MeanPnL)^2 / (N-1)',
    valStr: m => `$${Math.round(m.varPnL).toLocaleString()}`,
    colorClass: () => 'text-amber-400',
    colorVal: (_, isDark) => isDark ? '#fbbf24' : '#d97706',
    evalStr: () => 'Measured Variance',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Measured Variance', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'coeffOfVariation',
    label: 'Coeff_of_Variation',
    sub: 'StdDev / |Mean PnL|',
    desc: 'The coefficient of variation (CV), measuring the relative dispersion of trade results per unit of expected return.',
    formula: 'StdDev(PnL) / |MeanPnL|',
    valStr: m => `${m.coeffOfVariation.toFixed(2)}`,
    colorClass: m => m.coeffOfVariation <= 2.0 ? 'text-emerald-400' : (m.coeffOfVariation <= 4.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.coeffOfVariation <= 2.0 ? (isDark ? '#ffffff' : '#000000') : (m.coeffOfVariation <= 4.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.coeffOfVariation <= 2.0 ? 'High Consistency' : (m.coeffOfVariation <= 4.0 ? 'Moderate' : 'High Dispersion'),
    evalClass: m => m.coeffOfVariation <= 2.0 ? 'text-emerald-500' : (m.coeffOfVariation <= 4.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '<= 2.0', eval: 'High Consistency', class: 'text-emerald-500 font-bold' },
      { label: '2.0 - 4.0', eval: 'Moderate', class: 'text-amber-500 font-bold' },
      { label: '> 4.0', eval: 'High Dispersion', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'skewness',
    label: 'Skewness_of_Returns',
    sub: 'Return Asymmetry (S)',
    desc: 'The statistical skewness of trade returns. Positive skew indicates frequent small losses and massive winning outlier trades.',
    formula: 'Σ(Standardized PnL^3) / N',
    valStr: m => `${m.skewness >= 0 ? '+' : ''}${m.skewness.toFixed(2)}`,
    colorClass: m => m.skewness >= 0.5 ? 'text-emerald-400' : (m.skewness >= -0.5 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.skewness >= 0.5 ? (isDark ? '#ffffff' : '#000000') : (m.skewness >= -0.5 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.skewness >= 0.5 ? 'Positive Skew' : (m.skewness >= -0.5 ? 'Symmetric' : 'Negative Skew'),
    evalClass: m => m.skewness >= 0.5 ? 'text-emerald-500' : (m.skewness >= -0.5 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 0.50', eval: 'Positive Skew', class: 'text-emerald-500 font-bold' },
      { label: '-0.50 - 0.50', eval: 'Symmetric', class: 'text-amber-500 font-bold' },
      { label: '< -0.50', eval: 'Negative Skew', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'kurtosis',
    label: 'Kurtosis_of_Returns',
    sub: 'Tail Extremity (K)',
    desc: 'The excess kurtosis of trade returns. High kurtosis indicates fat tails and elevated probability of extreme outlier results.',
    formula: '(Σ(Standardized PnL^4) / N) - 3',
    valStr: m => `${m.kurtosis >= 0 ? '+' : ''}${m.kurtosis.toFixed(2)}`,
    colorClass: m => m.kurtosis <= 3.0 ? 'text-emerald-400' : 'text-amber-400',
    colorVal: (m, isDark) => m.kurtosis <= 3.0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fbbf24' : '#d97706'),
    evalStr: m => m.kurtosis <= 3.0 ? 'Normal Tails' : 'Fat Tails',
    evalClass: m => m.kurtosis <= 3.0 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '<= 3.0', eval: 'Normal Tails', class: 'text-emerald-500 font-bold' },
      { label: '> 3.0', eval: 'Fat Tails', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'medianTradeResult',
    label: 'Median_Trade_Result',
    sub: '50th Percentile PnL',
    desc: 'The median dollar profit or loss outcome across all executed trades, eliminating distortion from extreme outliers.',
    formula: 'P50(Trade PnLs)',
    valStr: m => `${m.medianTradeResult >= 0 ? '+' : ''}$${m.medianTradeResult.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: m => m.medianTradeResult >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.medianTradeResult >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.medianTradeResult >= 0 ? 'Positive Median' : 'Negative Median',
    evalClass: m => m.medianTradeResult >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> $0', eval: 'Positive Median', class: 'text-emerald-500 font-bold' },
      { label: '< $0', eval: 'Negative Median', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'medianWinLossRatio',
    label: 'Median_Win/Loss',
    sub: 'MedWin / |MedLoss|',
    desc: 'The ratio of the median winning trade magnitude to the absolute median losing trade magnitude.',
    formula: 'Median Win / |Median Loss|',
    valStr: m => `${m.medianWinLossRatio.toFixed(2)}x`,
    colorClass: m => m.medianWinLossRatio >= 1.5 ? 'text-emerald-400' : (m.medianWinLossRatio >= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.medianWinLossRatio >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.medianWinLossRatio >= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.medianWinLossRatio >= 1.5 ? 'Optimal Asymmetry' : (m.medianWinLossRatio >= 1.0 ? 'Nominal' : 'Sub-Optimal'),
    evalClass: m => m.medianWinLossRatio >= 1.5 ? 'text-emerald-500' : (m.medianWinLossRatio >= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5x', eval: 'Optimal Asymmetry', class: 'text-emerald-500 font-bold' },
      { label: '1.0x - 1.5x', eval: 'Nominal', class: 'text-amber-500 font-bold' },
      { label: '< 1.0x', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  }
];

const expertMetricsConfigs: MetricConfig[] = [
  {
    key: 'valueAtRisk',
    label: 'Value_at_Risk',
    sub: '95% 1-Day Dollar VaR',
    desc: 'The maximum expected dollar loss over a 1-day horizon at a 95% confidence level based on historical simulation.',
    formula: '|P05(Trade PnLs)|',
    valStr: m => `$${m.valueAtRisk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-amber-400',
    colorVal: (_, isDark) => isDark ? '#fbbf24' : '#d97706',
    evalStr: () => 'Tail Threshold',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Tail Threshold', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'cvar',
    label: 'Conditional_VaR',
    sub: 'Expected Shortfall ($)',
    desc: 'The mathematical expectation of dollar loss exceeding the Value at Risk threshold. Measures tail severity.',
    formula: 'Mean(PnLs < P05)',
    valStr: m => `$${m.cvar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-rose-400',
    colorVal: (_, isDark) => isDark ? '#fb7185' : '#e11d48',
    evalStr: () => 'Tail Severity',
    evalClass: () => 'text-rose-500',
    benchmarks: [
      { label: 'Any', eval: 'Tail Severity', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'expectedShortfall',
    label: 'Expected_Shortfall',
    sub: 'CVaR / Initial Deposit',
    desc: 'Conditional Value at Risk expressed as a percentage of the initial account deposit. Measures capital exposure in worst 5% cases.',
    formula: '(CVaR / Deposit) * 100',
    valStr: m => `${m.expectedShortfall.toFixed(1)}%`,
    colorClass: m => m.expectedShortfall <= 5.0 ? 'text-emerald-400' : (m.expectedShortfall <= 10.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.expectedShortfall <= 5.0 ? (isDark ? '#ffffff' : '#000000') : (m.expectedShortfall <= 10.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.expectedShortfall <= 5.0 ? 'Low Risk' : (m.expectedShortfall <= 10.0 ? 'Moderate' : 'High Risk'),
    evalClass: m => m.expectedShortfall <= 5.0 ? 'text-emerald-500' : (m.expectedShortfall <= 10.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '<= 5.0%', eval: 'Low Risk', class: 'text-emerald-500 font-bold' },
      { label: '5.0% - 10%', eval: 'Moderate', class: 'text-amber-500 font-bold' },
      { label: '> 10%', eval: 'High Risk', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'mae',
    label: 'Max_Adverse_Excursion',
    sub: 'Mean Intra-Trade Dip',
    desc: 'The average maximum adverse excursion (MAE) experienced during open trade setups before eventual exit.',
    formula: 'Σ(Trade MAE) / Trades With MAE/MFE Data',
    valStr: m => `$${m.mae.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-amber-400',
    colorVal: (_, isDark) => isDark ? '#fbbf24' : '#d97706',
    evalStr: () => 'Intra-Trade Risk',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Intra-Trade Risk', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'mfe',
    label: 'Max_Favorable_Excurs',
    sub: 'Mean Intra-Trade Peak',
    desc: 'The average maximum favorable excursion (MFE) experienced during open trade setups before eventual exit.',
    formula: 'Σ(Trade MFE) / Trades With MAE/MFE Data',
    valStr: m => `$${m.mfe.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-emerald-400',
    colorVal: (_, isDark) => isDark ? '#ffffff' : '#000000',
    evalStr: () => 'Intra-Trade Potential',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Intra-Trade Potential', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'maeMfeRatio',
    label: 'MAE/MFE_Ratio',
    sub: 'Adverse vs Favorable',
    desc: 'The ratio of mean maximum adverse excursion to mean maximum favorable excursion. Measures trade execution efficiency.',
    formula: 'Mean MAE / Mean MFE',
    valStr: m => `${m.maeMfeRatio.toFixed(2)}`,
    colorClass: m => m.maeMfeRatio <= 0.5 ? 'text-emerald-400' : (m.maeMfeRatio <= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.maeMfeRatio <= 0.5 ? (isDark ? '#ffffff' : '#000000') : (m.maeMfeRatio <= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.maeMfeRatio <= 0.5 ? 'Highly Efficient' : (m.maeMfeRatio <= 1.0 ? 'Acceptable' : 'Inefficient'),
    evalClass: m => m.maeMfeRatio <= 0.5 ? 'text-emerald-500' : (m.maeMfeRatio <= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '<= 0.5', eval: 'Highly Efficient', class: 'text-emerald-500 font-bold' },
      { label: '0.5 - 1.0', eval: 'Acceptable', class: 'text-amber-500 font-bold' },
      { label: '> 1.0', eval: 'Inefficient', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'zScore',
    label: 'Z-Score_of_Sequence',
    sub: 'Streak Randomness (Z)',
    desc: 'The Z-score of the trade win/loss sequence. Evaluates whether streaks are statistically random or clustered.',
    formula: '(Runs - E(Runs)) / StdDev(Runs)',
    valStr: m => `${m.zScore >= 0 ? '+' : ''}${m.zScore.toFixed(2)}`,
    colorClass: m => Math.abs(m.zScore) <= 1.96 ? 'text-emerald-400' : 'text-amber-400',
    colorVal: (m, isDark) => Math.abs(m.zScore) <= 1.96 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fbbf24' : '#d97706'),
    evalStr: m => Math.abs(m.zScore) <= 1.96 ? 'Random Sequence' : 'Clustered Streaks',
    evalClass: m => Math.abs(m.zScore) <= 1.96 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '|Z| <= 1.96', eval: 'Random Sequence', class: 'text-emerald-500 font-bold' },
      { label: '|Z| > 1.96', eval: 'Clustered Streaks', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'runsTest',
    label: 'Runs_Test',
    sub: 'Independence Eval',
    desc: 'Wald-Wolfowitz Runs Test evaluating the null hypothesis of sequential independence in trade results.',
    formula: '|Z-Score| < 1.96',
    valStr: m => m.runsTest === 1 ? 'PASSED' : 'FAILED',
    colorClass: m => m.runsTest === 1 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.runsTest === 1 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.runsTest === 1 ? 'Independent' : 'Dependent',
    evalClass: m => m.runsTest === 1 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: 'PASSED', eval: 'Independent', class: 'text-emerald-500 font-bold' },
      { label: 'FAILED', eval: 'Dependent', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'monteCarloDrawdown',
    label: 'MC_Drawdown_Est',
    sub: '500-Sim Resample DD',
    desc: 'Mean maximum drawdown estimated from 500 Monte Carlo equity curve simulations via trade resampling.',
    formula: 'Mean(Simulated Max Drawdowns)',
    valStr: m => `${m.monteCarloDrawdown.toFixed(1)}%`,
    colorClass: m => m.monteCarloDrawdown <= 10.0 ? 'text-emerald-400' : (m.monteCarloDrawdown <= 20.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.monteCarloDrawdown <= 10.0 ? (isDark ? '#ffffff' : '#000000') : (m.monteCarloDrawdown <= 20.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.monteCarloDrawdown <= 10.0 ? 'Robust Capital' : (m.monteCarloDrawdown <= 20.0 ? 'Acceptable' : 'Vulnerable'),
    evalClass: m => m.monteCarloDrawdown <= 10.0 ? 'text-emerald-500' : (m.monteCarloDrawdown <= 20.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '<= 10.0%', eval: 'Robust Capital', class: 'text-emerald-500 font-bold' },
      { label: '10% - 20%', eval: 'Acceptable', class: 'text-amber-500 font-bold' },
      { label: '> 20%', eval: 'Vulnerable', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'monteCarloRiskOfRuin',
    label: 'MC_Risk_of_Ruin',
    sub: '500-Sim Depletion Prob',
    desc: 'Probability of reaching 90% capital depletion across 500 Monte Carlo trade resampling simulations.',
    formula: '(Simulations Ruined / Monte Carlo Simulations) * 100',
    valStr: m => `${m.monteCarloRiskOfRuin.toFixed(1)}%`,
    colorClass: m => m.monteCarloRiskOfRuin <= 1.0 ? 'text-emerald-400' : (m.monteCarloRiskOfRuin <= 5.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.monteCarloRiskOfRuin <= 1.0 ? (isDark ? '#ffffff' : '#000000') : (m.monteCarloRiskOfRuin <= 5.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.monteCarloRiskOfRuin <= 1.0 ? 'Safe' : (m.monteCarloRiskOfRuin <= 5.0 ? 'Vulnerable' : 'Critical Risk'),
    evalClass: m => m.monteCarloRiskOfRuin <= 1.0 ? 'text-emerald-500' : (m.monteCarloRiskOfRuin <= 5.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '<= 1.0%', eval: 'Safe', class: 'text-emerald-500 font-bold' },
      { label: '1.0% - 5.0%', eval: 'Vulnerable', class: 'text-amber-500 font-bold' },
      { label: '> 5.0%', eval: 'Critical Risk', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'monteCarloExpectedReturn',
    label: 'MC_Expected_Return',
    sub: '500-Sim Mean Return',
    desc: 'Mean cumulative percentage return estimated across 500 Monte Carlo equity curve resampling simulations.',
    formula: 'Mean(Simulated Net Returns)',
    valStr: m => `${m.monteCarloExpectedReturn >= 0 ? '+' : ''}${m.monteCarloExpectedReturn.toFixed(1)}%`,
    colorClass: m => m.monteCarloExpectedReturn >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.monteCarloExpectedReturn >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.monteCarloExpectedReturn >= 0 ? 'Positive Alpha' : 'Capital Erosion',
    evalClass: m => m.monteCarloExpectedReturn >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> 0%', eval: 'Positive Alpha', class: 'text-emerald-500 font-bold' },
      { label: '< 0%', eval: 'Capital Erosion', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'bootstrapConfidenceInterval',
    label: 'Bootstrap_CI',
    sub: '95% CI Mean PnL ($)',
    desc: '95% Bootstrap confidence interval for the mean trade PnL generated from 500 resampled simulation paths.',
    formula: 'P02.5(Resampled Means) to P97.5(Resampled Means)',
    valStr: m => `${m.bootstrapConfidenceInterval}`,
    colorClass: () => 'text-amber-400',
    colorVal: (_, isDark) => isDark ? '#fbbf24' : '#d97706',
    evalStr: () => 'Empirical Range',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Empirical Range', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'ciExpectedValue',
    label: 'CI_for_Expected_Val',
    sub: '95% CI EV ($)',
    desc: '95% Confidence interval for the mathematical expected value per trade using standard error of the mean.',
    formula: 'EV ± 1.96 * (StdDev(PnL) / Sqrt(N))',
    valStr: m => `${m.ciExpectedValue}`,
    colorClass: () => 'text-amber-400',
    colorVal: (_, isDark) => isDark ? '#fbbf24' : '#d97706',
    evalStr: () => 'Statistical Bounds',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Statistical Bounds', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'ciWinRate',
    label: 'CI_for_Win_Rate',
    sub: '95% Normal Approx CI',
    desc: '95% Confidence interval for the strategy win rate using normal approximation for binomial distribution.',
    formula: 'p ± 1.96 * Sqrt(p*(1-p)/N)',
    valStr: m => `${m.ciWinRate}`,
    colorClass: () => 'text-amber-400',
    colorVal: (_, isDark) => isDark ? '#fbbf24' : '#d97706',
    evalStr: () => 'Binomial Bounds',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Binomial Bounds', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'bayesianWinRate',
    label: 'Bayesian_Win_Rate',
    sub: 'Beta(1,1) Prior Est',
    desc: 'Bayesian win rate estimate incorporating an uninformative Beta(1,1) prior to prevent small-sample distortion.',
    formula: '(Wins + 1) / (Trades + 2)',
    valStr: m => `${m.bayesianWinRate.toFixed(1)}%`,
    colorClass: m => m.bayesianWinRate >= 50 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.bayesianWinRate >= 50 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.bayesianWinRate >= 50 ? 'Favorable Prior' : 'Unfavorable Prior',
    evalClass: m => m.bayesianWinRate >= 50 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '>= 50%', eval: 'Favorable Prior', class: 'text-emerald-500 font-bold' },
      { label: '< 50%', eval: 'Unfavorable Prior', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'bayesianExpectedValue',
    label: 'Bayesian_Expected_Val',
    sub: 'Shrinkage Mean ($)',
    desc: 'Bayesian expected value applying shrinkage towards a prior mean of zero, regularizing early performance spikes.',
    formula: '(N*EV + 5*0) / (N + 5)',
    valStr: m => `${m.bayesianExpectedValue >= 0 ? '+' : ''}$${m.bayesianExpectedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: m => m.bayesianExpectedValue >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.bayesianExpectedValue >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.bayesianExpectedValue >= 0 ? 'Positive Edge' : 'Negative Drag',
    evalClass: m => m.bayesianExpectedValue >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> $0', eval: 'Positive Edge', class: 'text-emerald-500 font-bold' },
      { label: '< $0', eval: 'Negative Drag', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'kellyCriterion',
    label: 'Kelly_Criterion',
    sub: 'Full Kelly %',
    desc: 'The mathematical optimal percentage of capital to risk per trade to maximize long-term compounded growth rate.',
    formula: 'W - ((1 - W) / R)',
    valStr: m => `${m.kellyCriterion.toFixed(1)}%`,
    colorClass: m => m.kellyCriterion >= 5.0 ? 'text-emerald-400' : (m.kellyCriterion > 0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.kellyCriterion >= 5.0 ? (isDark ? '#ffffff' : '#000000') : (m.kellyCriterion > 0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.kellyCriterion >= 5.0 ? 'Aggressive Growth' : (m.kellyCriterion > 0 ? 'Moderate Growth' : 'No Edge'),
    evalClass: m => m.kellyCriterion >= 5.0 ? 'text-emerald-500' : (m.kellyCriterion > 0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 5.0%', eval: 'Aggressive Growth', class: 'text-emerald-500 font-bold' },
      { label: '> 0%', eval: 'Moderate Growth', class: 'text-amber-500 font-bold' },
      { label: '<= 0%', eval: 'No Edge', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'fractionalKelly',
    label: 'Fractional_Kelly',
    sub: 'Half Kelly %',
    desc: 'Half of the Kelly Criterion percentage. Recommended by quantitative practitioners to reduce volatility and drawdown risk.',
    formula: 'Kelly Criterion / 2',
    valStr: m => `${m.fractionalKelly.toFixed(1)}%`,
    colorClass: m => m.fractionalKelly >= 2.5 ? 'text-emerald-400' : (m.fractionalKelly > 0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.fractionalKelly >= 2.5 ? (isDark ? '#ffffff' : '#000000') : (m.fractionalKelly > 0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.fractionalKelly >= 2.5 ? 'Optimal Sizing' : (m.fractionalKelly > 0 ? 'Conservative' : 'No Edge'),
    evalClass: m => m.fractionalKelly >= 2.5 ? 'text-emerald-500' : (m.fractionalKelly > 0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 2.5%', eval: 'Optimal Sizing', class: 'text-emerald-500 font-bold' },
      { label: '> 0%', eval: 'Conservative', class: 'text-amber-500 font-bold' },
      { label: '<= 0%', eval: 'No Edge', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'optimalF',
    label: 'Optimal_F',
    sub: 'Ralph Vince Capital Frac',
    desc: 'Ralph Vince\'s Optimal f representing the peak fraction of account capital to risk for maximum geometric growth.',
    formula: 'Max(0, Kelly * 0.8)',
    valStr: m => `${m.optimalF.toFixed(1)}%`,
    colorClass: m => m.optimalF >= 4.0 ? 'text-emerald-400' : (m.optimalF > 0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.optimalF >= 4.0 ? (isDark ? '#ffffff' : '#000000') : (m.optimalF > 0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.optimalF >= 4.0 ? 'Geometric Peak' : (m.optimalF > 0 ? 'Sub-Optimal' : 'No Edge'),
    evalClass: m => m.optimalF >= 4.0 ? 'text-emerald-500' : (m.optimalF > 0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 4.0%', eval: 'Geometric Peak', class: 'text-emerald-500 font-bold' },
      { label: '> 0%', eval: 'Sub-Optimal', class: 'text-amber-500 font-bold' },
      { label: '<= 0%', eval: 'No Edge', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'sqn',
    label: 'SQN',
    sub: 'System Quality Number',
    desc: 'Van Tharp\'s System Quality Number (SQN) evaluating strategy expectancy normalized by trade result dispersion.',
    formula: '(EV / StdDev(PnL)) * Sqrt(N)',
    valStr: m => `${m.sqn.toFixed(2)}`,
    colorClass: m => m.sqn >= 3.0 ? 'text-emerald-400' : (m.sqn >= 2.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.sqn >= 3.0 ? (isDark ? '#ffffff' : '#000000') : (m.sqn >= 2.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.sqn >= 3.0 ? 'Holy Grail' : (m.sqn >= 2.0 ? 'Excellent' : 'Average'),
    evalClass: m => m.sqn >= 3.0 ? 'text-emerald-500' : (m.sqn >= 2.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 3.0', eval: 'Holy Grail', class: 'text-emerald-500 font-bold' },
      { label: '2.0 - 3.0', eval: 'Excellent', class: 'text-amber-500 font-bold' },
      { label: '< 2.0', eval: 'Average', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'tTest',
    label: 'T-Test_of_Avg_Trade',
    sub: 'T-Statistic (t)',
    desc: 'Student\'s t-statistic evaluating whether the mean trade PnL is statistically significantly different from zero.',
    formula: 'EV / (StdDev(PnL) / Sqrt(N))',
    valStr: m => `${m.tTest >= 0 ? '+' : ''}${m.tTest.toFixed(2)}`,
    colorClass: m => Math.abs(m.tTest) >= 1.96 ? 'text-emerald-400' : 'text-amber-400',
    colorVal: (m, isDark) => Math.abs(m.tTest) >= 1.96 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fbbf24' : '#d97706'),
    evalStr: m => Math.abs(m.tTest) >= 1.96 ? 'Significant Edge' : 'Inconclusive',
    evalClass: m => Math.abs(m.tTest) >= 1.96 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '|t| >= 1.96', eval: 'Significant Edge', class: 'text-emerald-500 font-bold' },
      { label: '|t| < 1.96', eval: 'Inconclusive', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'pValue',
    label: 'P-Value_of_Edge',
    sub: 'Two-Tailed Significance',
    desc: 'Estimated two-tailed p-value corresponding to the t-statistic. Measures probability that results occurred by pure chance.',
    formula: '2 * (1 - NormalCDF(|T|))',
    valStr: m => `${m.pValue.toFixed(3)}`,
    colorClass: m => m.pValue <= 0.05 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.pValue <= 0.05 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.pValue <= 0.05 ? 'Statistically Sig' : 'Not Significant',
    evalClass: m => m.pValue <= 0.05 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '<= 0.05', eval: 'Statistically Sig', class: 'text-emerald-500 font-bold' },
      { label: '> 0.05', eval: 'Not Significant', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'informationRatio',
    label: 'Information_Ratio',
    sub: 'Active Return / Tracking Err',
    desc: 'The ratio of active strategy return above benchmark to annualized strategy return volatility used as the local tracking-error proxy.',
    formula: '(CAGR - Benchmark) / Annualized Return StdDev',
    valStr: m => `${m.informationRatio.toFixed(2)}`,
    colorClass: m => m.informationRatio >= 0.5 ? 'text-emerald-400' : (m.informationRatio >= 0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.informationRatio >= 0.5 ? (isDark ? '#ffffff' : '#000000') : (m.informationRatio >= 0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.informationRatio >= 0.5 ? 'Strong Active Alpha' : (m.informationRatio >= 0 ? 'Moderate' : 'Negative Alpha'),
    evalClass: m => m.informationRatio >= 0.5 ? 'text-emerald-500' : (m.informationRatio >= 0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 0.5', eval: 'Strong Active Alpha', class: 'text-emerald-500 font-bold' },
      { label: '0.0 - 0.5', eval: 'Moderate', class: 'text-amber-500 font-bold' },
      { label: '< 0.0', eval: 'Negative Alpha', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'treynorRatio',
    label: 'Treynor_Ratio',
    sub: 'Excess Return / Beta',
    desc: 'The ratio of excess annualized return above the risk-free rate per unit of systematic market risk (Beta).',
    formula: '(CAGR - Rf) / Beta',
    valStr: m => `${m.treynorRatio.toFixed(2)}`,
    colorClass: m => m.treynorRatio >= 10.0 ? 'text-emerald-400' : (m.treynorRatio >= 5.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.treynorRatio >= 10.0 ? (isDark ? '#ffffff' : '#000000') : (m.treynorRatio >= 5.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.treynorRatio >= 10.0 ? 'Superior Reward' : (m.treynorRatio >= 5.0 ? 'Stable' : 'Sub-Optimal'),
    evalClass: m => m.treynorRatio >= 10.0 ? 'text-emerald-500' : (m.treynorRatio >= 5.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 10.0', eval: 'Superior Reward', class: 'text-emerald-500 font-bold' },
      { label: '5.0 - 10.0', eval: 'Stable', class: 'text-amber-500 font-bold' },
      { label: '< 5.0', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'jensensAlpha',
    label: 'Jensen\'s_Alpha',
    sub: 'CAPM Excess Alpha',
    desc: 'Jensen\'s Alpha representing the absolute annualized excess return above the Capital Asset Pricing Model (CAPM) expectation.',
    formula: 'CAGR - [Rf + Beta*(Rm - Rf)]',
    valStr: m => `${m.jensensAlpha >= 0 ? '+' : ''}${m.jensensAlpha.toFixed(1)}%`,
    colorClass: m => m.jensensAlpha >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.jensensAlpha >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.jensensAlpha >= 0 ? 'Positive CAPM Alpha' : 'Negative CAPM Alpha',
    evalClass: m => m.jensensAlpha >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> 0%', eval: 'Positive CAPM Alpha', class: 'text-emerald-500 font-bold' },
      { label: '< 0%', eval: 'Negative CAPM Alpha', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'betaToBenchmark',
    label: 'Beta_to_Benchmark',
    sub: 'Systematic Market Beta',
    desc: 'Estimated systematic risk coefficient (Beta) measuring strategy sensitivity to broader market benchmark movements.',
    formula: 'Cov(Strategy Returns, Market Returns) / Var(Market Returns)',
    valStr: m => `${m.betaToBenchmark.toFixed(2)}`,
    colorClass: m => m.betaToBenchmark <= 1.0 ? 'text-emerald-400' : 'text-amber-400',
    colorVal: (m, isDark) => m.betaToBenchmark <= 1.0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fbbf24' : '#d97706'),
    evalStr: m => m.betaToBenchmark <= 1.0 ? 'Defensive' : 'Aggressive',
    evalClass: m => m.betaToBenchmark <= 1.0 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '<= 1.0', eval: 'Defensive', class: 'text-emerald-500 font-bold' },
      { label: '> 1.0', eval: 'Aggressive', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'alphaToBenchmark',
    label: 'Alpha_to_Benchmark',
    sub: 'Absolute Outperformance',
    desc: 'Absolute annualized percentage outperformance captured by the strategy above the baseline market benchmark return.',
    formula: 'CAGR - Benchmark CAGR',
    valStr: m => `${m.alphaToBenchmark >= 0 ? '+' : ''}${m.alphaToBenchmark.toFixed(1)}%`,
    colorClass: m => m.alphaToBenchmark >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.alphaToBenchmark >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.alphaToBenchmark >= 0 ? 'Market Beating' : 'Underperforming',
    evalClass: m => m.alphaToBenchmark >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> 0%', eval: 'Market Beating', class: 'text-emerald-500 font-bold' },
      { label: '< 0%', eval: 'Underperforming', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'returnAutocorrelation',
    label: 'Return_Autocorr',
    sub: 'Lag-1 Serial Corr (ρ)',
    desc: 'Lag-1 serial autocorrelation of trade PnLs. Measures sequential persistence or mean reversion in trade outcomes.',
    formula: 'Corr(PnL_t, PnL_{t-1})',
    valStr: m => `${m.returnAutocorrelation >= 0 ? '+' : ''}${m.returnAutocorrelation.toFixed(2)}`,
    colorClass: m => Math.abs(m.returnAutocorrelation) <= 0.2 ? 'text-emerald-400' : 'text-amber-400',
    colorVal: (m, isDark) => Math.abs(m.returnAutocorrelation) <= 0.2 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fbbf24' : '#d97706'),
    evalStr: m => Math.abs(m.returnAutocorrelation) <= 0.2 ? 'Independent' : 'Serial Memory',
    evalClass: m => Math.abs(m.returnAutocorrelation) <= 0.2 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '|ρ| <= 0.20', eval: 'Independent', class: 'text-emerald-500 font-bold' },
      { label: '|ρ| > 0.20', eval: 'Serial Memory', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'volatilityClustering',
    label: 'Vol_Clustering',
    sub: 'Abs PnL Autocorr (γ)',
    desc: 'Lag-1 serial autocorrelation of absolute trade PnLs. Measures the presence of volatility clustering and turbulent regimes.',
    formula: 'Corr(|PnL_t|, |PnL_{t-1}|)',
    valStr: m => `${m.volatilityClustering >= 0 ? '+' : ''}${m.volatilityClustering.toFixed(2)}`,
    colorClass: m => m.volatilityClustering <= 0.2 ? 'text-emerald-400' : 'text-amber-400',
    colorVal: (m, isDark) => m.volatilityClustering <= 0.2 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fbbf24' : '#d97706'),
    evalStr: m => m.volatilityClustering <= 0.2 ? 'Stable Volatility' : 'Clustered Vol',
    evalClass: m => m.volatilityClustering <= 0.2 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '<= 0.20', eval: 'Stable Volatility', class: 'text-emerald-500 font-bold' },
      { label: '> 0.20', eval: 'Clustered Vol', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'hurstExponent',
    label: 'Hurst_Exponent',
    sub: 'Long-Term Memory (H)',
    desc: 'The Hurst Exponent (H) measuring asymptotic persistence. H > 0.5 indicates trending; H < 0.5 indicates mean reversion.',
    formula: 'Log(R/S) / Log(N)',
    valStr: m => `${m.hurstExponent.toFixed(2)}`,
    colorClass: m => m.hurstExponent >= 0.6 ? 'text-emerald-400' : (m.hurstExponent <= 0.4 ? 'text-amber-400' : 'text-sky-400'),
    colorVal: (m, isDark) => m.hurstExponent >= 0.6 ? (isDark ? '#ffffff' : '#000000') : (m.hurstExponent <= 0.4 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#38bdf8' : '#0284c7')),
    evalStr: m => m.hurstExponent >= 0.6 ? 'Persistent Trend' : (m.hurstExponent <= 0.4 ? 'Mean Reverting' : 'Random Walk'),
    evalClass: m => m.hurstExponent >= 0.6 ? 'text-emerald-500' : (m.hurstExponent <= 0.4 ? 'text-amber-500' : 'text-sky-500'),
    benchmarks: [
      { label: '>= 0.60', eval: 'Persistent Trend', class: 'text-emerald-500 font-bold' },
      { label: '0.40 - 0.60', eval: 'Random Walk', class: 'text-sky-500 font-bold' },
      { label: '< 0.40', eval: 'Mean Reverting', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'regimeStabilityScore',
    label: 'Regime_Stability',
    sub: 'Structural Invariance',
    desc: 'Composite regime stability score evaluating equity progression consistency across changing market macro environments.',
    formula: 'Stability * 0.95',
    valStr: m => `${m.regimeStabilityScore.toFixed(1)}%`,
    colorClass: m => m.regimeStabilityScore >= 75 ? 'text-emerald-400' : (m.regimeStabilityScore >= 50 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.regimeStabilityScore >= 75 ? (isDark ? '#ffffff' : '#000000') : (m.regimeStabilityScore >= 50 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.regimeStabilityScore >= 75 ? 'Highly Stable' : (m.regimeStabilityScore >= 50 ? 'Moderate' : 'Unstable'),
    evalClass: m => m.regimeStabilityScore >= 75 ? 'text-emerald-500' : (m.regimeStabilityScore >= 50 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 75%', eval: 'Highly Stable', class: 'text-emerald-500 font-bold' },
      { label: '50% - 75%', eval: 'Moderate', class: 'text-amber-500 font-bold' },
      { label: '< 50%', eval: 'Unstable', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'rollingSharpe',
    label: 'Rolling_Sharpe',
    sub: '10-Trade Window Sharpe',
    desc: 'Mean Sharpe Ratio calculated across moving 10-trade rolling windows. Captures dynamic risk-adjusted performance changes.',
    formula: 'Mean(Rolling 10-Trade Sharpe)',
    valStr: m => `${m.rollingSharpe.toFixed(2)}`,
    colorClass: m => m.rollingSharpe >= 1.5 ? 'text-emerald-400' : (m.rollingSharpe >= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.rollingSharpe >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.rollingSharpe >= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.rollingSharpe >= 1.5 ? 'Optimal' : (m.rollingSharpe >= 1.0 ? 'Stable' : 'Sub-Optimal'),
    evalClass: m => m.rollingSharpe >= 1.5 ? 'text-emerald-500' : (m.rollingSharpe >= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '1.0 - 1.5', eval: 'Stable', class: 'text-amber-500 font-bold' },
      { label: '< 1.0', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'rollingProfitFactor',
    label: 'Rolling_PF',
    sub: '10-Trade Window PF',
    desc: 'Mean Profit Factor calculated across moving 10-trade rolling windows. Captures dynamic win/loss asymmetry fluctuations.',
    formula: 'Mean(Rolling 10-Trade PF)',
    valStr: m => `${m.rollingProfitFactor.toFixed(2)}x`,
    colorClass: m => m.rollingProfitFactor >= 1.5 ? 'text-emerald-400' : (m.rollingProfitFactor >= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.rollingProfitFactor >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.rollingProfitFactor >= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.rollingProfitFactor >= 1.5 ? 'Optimal' : (m.rollingProfitFactor >= 1.0 ? 'Stable' : 'Sub-Optimal'),
    evalClass: m => m.rollingProfitFactor >= 1.5 ? 'text-emerald-500' : (m.rollingProfitFactor >= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5x', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '1.0x - 1.5x', eval: 'Stable', class: 'text-amber-500 font-bold' },
      { label: '< 1.0x', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'rollingExpectancy',
    label: 'Rolling_Expectancy',
    sub: '10-Trade Window EV ($)',
    desc: 'Mean expected dollar value calculated across moving 10-trade rolling windows. Tracks tactical profitability regimes.',
    formula: 'Mean(Rolling 10-Trade EV)',
    valStr: m => `${m.rollingExpectancy >= 0 ? '+' : ''}$${m.rollingExpectancy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: m => m.rollingExpectancy >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.rollingExpectancy >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.rollingExpectancy >= 0 ? 'Positive Edge' : 'Negative Drag',
    evalClass: m => m.rollingExpectancy >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> $0', eval: 'Positive Edge', class: 'text-emerald-500 font-bold' },
      { label: '< $0', eval: 'Negative Drag', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'rollingDrawdown',
    label: 'Rolling_Drawdown',
    sub: '10-Trade Window DD',
    desc: 'Mean equity drawdown percentage calculated across moving 10-trade rolling windows. Measures localized capital stress.',
    formula: 'Mean(Rolling 10-Trade DD)',
    valStr: m => `${m.rollingDrawdown.toFixed(1)}%`,
    colorClass: m => m.rollingDrawdown <= 10.0 ? 'text-emerald-400' : (m.rollingDrawdown <= 20.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.rollingDrawdown <= 10.0 ? (isDark ? '#ffffff' : '#000000') : (m.rollingDrawdown <= 20.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.rollingDrawdown <= 10.0 ? 'Controlled DD' : (m.rollingDrawdown <= 20.0 ? 'Moderate DD' : 'Severe DD'),
    evalClass: m => m.rollingDrawdown <= 10.0 ? 'text-emerald-500' : (m.rollingDrawdown <= 20.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '<= 10.0%', eval: 'Controlled DD', class: 'text-emerald-500 font-bold' },
      { label: '10% - 20%', eval: 'Moderate DD', class: 'text-amber-500 font-bold' },
      { label: '> 20%', eval: 'Severe DD', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'rollingWinRate',
    label: 'Rolling_Win_Rate',
    sub: '10-Trade Window Win %',
    desc: 'Mean win rate percentage calculated across moving 10-trade rolling windows. Captures localized accuracy cycles.',
    formula: 'Mean(Rolling 10-Trade Win%)',
    valStr: m => `${m.rollingWinRate.toFixed(1)}%`,
    colorClass: m => m.rollingWinRate >= 50 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.rollingWinRate >= 50 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.rollingWinRate >= 50 ? 'Favorable Accuracy' : 'Sub-Optimal',
    evalClass: m => m.rollingWinRate >= 50 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '>= 50%', eval: 'Favorable Accuracy', class: 'text-emerald-500 font-bold' },
      { label: '< 50%', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'strategyDecayRate',
    label: 'Strategy_Decay_Rate',
    sub: 'Sharpe Regression Slope',
    desc: 'Linear regression slope of rolling Sharpe Ratios over time. Negative values indicate alpha decay and diminishing edge.',
    formula: 'Slope(RollingSharpe, Time)',
    valStr: m => `${m.strategyDecayRate >= 0 ? '+' : ''}${m.strategyDecayRate.toFixed(4)}`,
    colorClass: m => m.strategyDecayRate >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.strategyDecayRate >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.strategyDecayRate >= 0 ? 'Stable Alpha' : 'Alpha Decay',
    evalClass: m => m.strategyDecayRate >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '>= 0.0', eval: 'Stable Alpha', class: 'text-emerald-500 font-bold' },
      { label: '< 0.0', eval: 'Alpha Decay', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'edgeHalfLife',
    label: 'Edge_Half-Life',
    sub: 'Est Months to Depletion',
    desc: 'Estimated time horizon in months until the strategy edge reaches half of its current magnitude based on linear decay rate.',
    formula: '0.5 / |Decay Rate|',
    valStr: m => `${m.edgeHalfLife.toFixed(1)}M`,
    colorClass: m => m.edgeHalfLife >= 24.0 ? 'text-emerald-400' : (m.edgeHalfLife >= 12.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.edgeHalfLife >= 24.0 ? (isDark ? '#ffffff' : '#000000') : (m.edgeHalfLife >= 12.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.edgeHalfLife >= 24.0 ? 'Long Horizon' : (m.edgeHalfLife >= 12.0 ? 'Moderate' : 'Short Horizon'),
    evalClass: m => m.edgeHalfLife >= 24.0 ? 'text-emerald-500' : (m.edgeHalfLife >= 12.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 24M', eval: 'Long Horizon', class: 'text-emerald-500 font-bold' },
      { label: '12M - 24M', eval: 'Moderate', class: 'text-amber-500 font-bold' },
      { label: '< 12M', eval: 'Short Horizon', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'outlierImpactRatio',
    label: 'Outlier_Impact_Ratio',
    sub: '% PnL from Top 5% Trades',
    desc: 'The percentage of total net profit contributed exclusively by the top 5% largest winning outlier trades.',
    formula: 'Σ(Top 5% Wins) / Net Profit',
    valStr: m => `${m.outlierImpactRatio.toFixed(1)}%`,
    colorClass: m => m.outlierImpactRatio <= 20.0 ? 'text-emerald-400' : (m.outlierImpactRatio <= 40.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.outlierImpactRatio <= 20.0 ? (isDark ? '#ffffff' : '#000000') : (m.outlierImpactRatio <= 40.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.outlierImpactRatio <= 20.0 ? 'Broad Edge' : (m.outlierImpactRatio <= 40.0 ? 'Moderate Outlier Dep' : 'Heavy Outlier Dep'),
    evalClass: m => m.outlierImpactRatio <= 20.0 ? 'text-emerald-500' : (m.outlierImpactRatio <= 40.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '<= 20%', eval: 'Broad Edge', class: 'text-emerald-500 font-bold' },
      { label: '20% - 40%', eval: 'Moderate Outlier Dep', class: 'text-amber-500 font-bold' },
      { label: '> 40%', eval: 'Heavy Outlier Dep', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'distributionRobustness',
    label: 'Dist_Robustness',
    sub: 'Composite Score (0-100)',
    desc: 'Composite distribution robustness score evaluating trade normality, tail risk symmetry, and outlier independence.',
    formula: '100 - f(Skew, Kurt, Outliers)',
    valStr: m => `${m.distributionRobustness.toFixed(1)}`,
    colorClass: m => m.distributionRobustness >= 80 ? 'text-emerald-400' : (m.distributionRobustness >= 50 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.distributionRobustness >= 80 ? (isDark ? '#ffffff' : '#000000') : (m.distributionRobustness >= 50 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.distributionRobustness >= 80 ? 'Highly Robust' : (m.distributionRobustness >= 50 ? 'Moderate' : 'Fragile Dist'),
    evalClass: m => m.distributionRobustness >= 80 ? 'text-emerald-500' : (m.distributionRobustness >= 50 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 80', eval: 'Highly Robust', class: 'text-emerald-500 font-bold' },
      { label: '50 - 80', eval: 'Moderate', class: 'text-amber-500 font-bold' },
      { label: '< 50', eval: 'Fragile Dist', class: 'text-rose-500 font-bold' }
    ]
  }
];

const allAvailableConfigs = computed<MetricConfig[]>(() => [
  ...primaryMetricsConfigs.map(c => ({ ...c, category: 'Primary' })),
  ...advancedMetricsConfigs.map(c => ({ ...c, category: 'Advanced' })),
  ...expertMetricsConfigs.map(c => ({ ...c, category: 'Expert' }))
]);

const filteredAvailableConfigs = computed<MetricConfig[]>(() => {
  const filtered = allAvailableConfigs.value.filter(cfg => {
    const matchesCategory = selectedCategoryFilter.value === 'ALL' || cfg.category === selectedCategoryFilter.value;
    const q = searchQuery.value.trim().toLowerCase();
    const matchesSearch = !q || 
      cfg.label.replaceAll('_', ' ').toLowerCase().includes(q) || 
      cfg.label.replaceAll('_', '').toLowerCase().includes(q) || 
      cfg.label.toLowerCase().includes(q) || 
      cfg.desc.toLowerCase().includes(q) || 
      cfg.sub.toLowerCase().includes(q) || 
      cfg.formula.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return filtered.sort((a, b) => {
    const aActive = activeMetricKeys.value.includes(a.key) ? 1 : 0;
    const bActive = activeMetricKeys.value.includes(b.key) ? 1 : 0;
    return bActive - aActive;
  });
});

const activeMetricsConfigs = computed<MetricConfig[]>(() => {
  return activeMetricKeys.value
    .map(key => allAvailableConfigs.value.find(c => c.key === key))
    .filter((c): c is MetricConfig => c !== undefined);
});

type FormulaValueFormat = 'currency' | 'percent' | 'number' | 'text'
type FormulaValueSource = 'metric' | 'bench' | 'riskFree'

interface FormulaTermConfig {
  key: string
  format: FormulaValueFormat
  source?: FormulaValueSource
}

const formulaTermConfigs: Record<string, FormulaTermConfig> = {
  'Winning Trades PnL': { key: 'grossProfit', format: 'currency' },
  'Losing Trades PnL': { key: 'grossLoss', format: 'currency' },
  'Strategy Gross Profit': { key: 'grossProfit', format: 'currency' },
  'Strategy Gross Loss': { key: 'grossLoss', format: 'currency' },
  'Asset Gross Profit': { key: 'bestAssetGrossProfit', format: 'currency' },
  'Asset Gross Loss': { key: 'bestAssetGrossLoss', format: 'currency' },
  'TF Gross Profit': { key: 'bestTfGrossProfit', format: 'currency' },
  'TF Gross Loss': { key: 'bestTfGrossLoss', format: 'currency' },
  'Gross Profit': { key: 'grossProfit', format: 'currency' },
  'Gross Loss': { key: 'grossLoss', format: 'currency' },
  'Net Profit': { key: 'netProfit', format: 'currency' },
  'Winning Trades': { key: 'numWin', format: 'number' },
  'Losing Trades': { key: 'numLoss', format: 'number' },
  'Total Trades': { key: 'numTrades', format: 'number' },
  'Archived Trades': { key: 'numTrades', format: 'number' },
  'Trades With Valid RR': { key: 'plannedRRCount', format: 'number' },
  'Trades With Entry+Exit Time': { key: 'holdingTrades', format: 'number' },
  'Trades With Risk Data': { key: 'riskDataTrades', format: 'number' },
  'Trades With MAE/MFE Data': { key: 'maeMfeDataTrades', format: 'number' },
  'Average Win': { key: 'avgWin', format: 'currency' },
  'Average Loss': { key: 'avgLoss', format: 'currency' },
  'AvgWin': { key: 'avgWin', format: 'currency' },
  'AvgLoss': { key: 'avgLoss', format: 'currency' },
  'Initial Deposit': { key: 'initialDeposit', format: 'currency' },
  'Deposit': { key: 'initialDeposit', format: 'currency' },
  'Payoff Ratio': { key: 'payoffRatio', format: 'number' },
  'Win%': { key: 'winRate', format: 'percent' },
  'Loss%': { key: 'lossRate', format: 'percent' },
  'Average Setup RR': { key: 'riskRewardRatio', format: 'number' },
  'Maximum Drawdown %': { key: 'maxDrawdownPct', format: 'percent' },
  'Average Drawdown %': { key: 'avgDrawdownPct', format: 'percent' },
  'Maximum Drawdown': { key: 'maxDrawdownNum', format: 'currency' },
  'Equity Peak - Subsequent Trough': { key: 'maxDrawdownNum', format: 'currency' },
  'Drawdown %': { key: 'avgDrawdownPct', format: 'percent' },
  'Drawdown Count': { key: 'numTrades', format: 'number' },
  'Trough Date - Peak Date': { key: 'drawdownDurationDays', format: 'number' },
  'Exit Time - Entry Time': { key: 'avgTradeDurationHours', format: 'number' },
  'Active Span': { key: 'activeSpanDays', format: 'number' },
  'Total Initial Risk': { key: 'totalInitialRisk', format: 'currency' },
  'CAGR': { key: 'annualizedReturnPct', format: 'percent' },
  'Mean Return': { key: 'annualizedReturnPct', format: 'percent' },
  'Annualized Return StdDev': { key: 'stdDevPct', format: 'percent' },
  'Annualized StdDev(Return)': { key: 'stdDevPct', format: 'percent' },
  'Annualized Downside StdDev': { key: 'downsideStdDevPct', format: 'percent' },
  'StdDev(Return)': { key: 'stdDevPct', format: 'percent' },
  'Downside StdDev': { key: 'downsideStdDevPct', format: 'percent' },
  'Positive Returns': { key: 'positiveReturnsPct', format: 'percent' },
  'Negative Returns': { key: 'negativeReturnsPct', format: 'percent' },
  'All Returns': { key: 'allReturnsPct', format: 'percent' },
  'P95(Returns)': { key: 'p95ReturnPct', format: 'percent' },
  'P05(Returns)': { key: 'p05ReturnPct', format: 'percent' },
  'Tail Ratio': { key: 'tailRatio', format: 'number' },
  'Gain-to-Pain Ratio': { key: 'gainToPainRatio', format: 'number' },
  'Expected Value': { key: 'expectedValue', format: 'currency' },
  'EV': { key: 'expectedValue', format: 'currency' },
  'Latest PnL': { key: 'latestPnl', format: 'currency' },
  'Latest Initial Risk': { key: 'latestInitialRisk', format: 'currency' },
  'Trade R-Multiples': { key: 'avgRMultiple', format: 'number' },
  'Trades >= 2.0R': { key: 'rMultipleWinCount', format: 'number' },
  'Kelly Edge': { key: 'kellyEdge', format: 'number' },
  'Kelly Criterion': { key: 'kellyCriterion', format: 'percent' },
  'Kelly': { key: 'kellyCriterion', format: 'percent' },
  'CapitalUnits': { key: 'capitalUnits', format: 'number' },
  'Trade Index': { key: 'numTrades', format: 'number' },
  'Var(Trade Index)': { key: 'tradeIndexVariance', format: 'number' },
  'Equity': { key: 'equitySeriesLabel', format: 'text' },
  'RegLine': { key: 'equityCurveStability', format: 'percent' },
  'SS_res': { key: 'equityResidualSumSquares', format: 'currency' },
  'SS_tot': { key: 'equityTotalSumSquares', format: 'currency' },
  'R-Squared': { key: 'equityRSquared', format: 'number' },
  'Trade PnLs': { key: 'tradePnlSeriesLabel', format: 'text' },
  'PnL': { key: 'tradePnlSeriesLabel', format: 'text' },
  'MeanPnL': { key: 'meanPnL', format: 'currency' },
  'StdDev(PnL)': { key: 'stdPnL', format: 'currency' },
  'P50(Trade PnLs)': { key: 'medianTradeResult', format: 'currency' },
  'P05(Trade PnLs)': { key: 'p05TradePnl', format: 'currency' },
  'Mean(PnLs < P05)': { key: 'cvar', format: 'currency' },
  'Median Win': { key: 'medianWin', format: 'currency' },
  'Median Loss': { key: 'medianLoss', format: 'currency' },
  'Standardized PnL': { key: 'tradePnlSeriesLabel', format: 'text' },
  'CVaR': { key: 'cvar', format: 'currency' },
  'Trade MAE': { key: 'mae', format: 'currency' },
  'Trade MFE': { key: 'mfe', format: 'currency' },
  'Mean MAE': { key: 'mae', format: 'currency' },
  'Mean MFE': { key: 'mfe', format: 'currency' },
  'Runs': { key: 'runs', format: 'number' },
  'E(Runs)': { key: 'expectedRuns', format: 'number' },
  'StdDev(Runs)': { key: 'stdRuns', format: 'number' },
  'Z-Score': { key: 'zScore', format: 'number' },
  'Simulated Max Drawdowns': { key: 'monteCarloMaxDrawdownSeriesLabel', format: 'text' },
  'Simulations Ruined': { key: 'monteCarloRuinCount', format: 'number' },
  'Monte Carlo Simulations': { key: 'monteCarloSimulationCount', format: 'number' },
  'Simulated Net Returns': { key: 'monteCarloNetReturnSeriesLabel', format: 'text' },
  'P02.5(Resampled Means)': { key: 'bootstrapMeanLower', format: 'currency' },
  'P97.5(Resampled Means)': { key: 'bootstrapMeanUpper', format: 'currency' },
  'Resampled Means': { key: 'bootstrapResampledMeansLabel', format: 'text' },
  'Wins': { key: 'numWin', format: 'number' },
  'Trades': { key: 'numTrades', format: 'number' },
  'W': { key: 'winProbability', format: 'number' },
  'p': { key: 'winProbability', format: 'number' },
  'R': { key: 'payoffRatio', format: 'number' },
  'N': { key: 'numTrades', format: 'number' },
  'T': { key: 'tTest', format: 'number' },
  'Rf': { key: 'riskFree', format: 'percent', source: 'riskFree' },
  'Rm': { key: 'bench', format: 'percent', source: 'bench' },
  'Benchmark CAGR': { key: 'bench', format: 'percent', source: 'bench' },
  'Benchmark': { key: 'bench', format: 'percent', source: 'bench' },
  'Beta': { key: 'betaToBenchmark', format: 'number' },
  'Strategy Returns': { key: 'strategyReturnSeriesLabel', format: 'text' },
  'Market Returns': { key: 'marketReturnSeriesLabel', format: 'text' },
  'Var(Market Returns)': { key: 'marketReturnSeriesLabel', format: 'text' },
  'PnL_t': { key: 'tradePnlSeriesLabel', format: 'text' },
  'PnL_{t-1}': { key: 'tradePnlSeriesLabel', format: 'text' },
  'R/S': { key: 'hurstRescaledRange', format: 'number' },
  'Stability': { key: 'equityCurveStability', format: 'percent' },
  'Rolling 10-Trade Sharpe': { key: 'rollingSharpe', format: 'number' },
  'Rolling 10-Trade PF': { key: 'rollingProfitFactor', format: 'number' },
  'Rolling 10-Trade EV': { key: 'rollingExpectancy', format: 'currency' },
  'Rolling 10-Trade DD': { key: 'rollingDrawdown', format: 'percent' },
  'Rolling 10-Trade Win%': { key: 'rollingWinRate', format: 'percent' },
  'RollingSharpe': { key: 'rollingSharpe', format: 'number' },
  'Time': { key: 'rollingWindowCount', format: 'number' },
  'Decay Rate': { key: 'strategyDecayRate', format: 'number' },
  'Top 5% Wins': { key: 'topWinsSum', format: 'currency' },
  'Skew': { key: 'skewness', format: 'number' },
  'Kurt': { key: 'kurtosis', format: 'number' },
  'Outliers': { key: 'outlierImpactRatio', format: 'number' }
}

const getFormulaTermRawValue = (term: FormulaTermConfig, m: any, bench: number, riskFree: number) => {
  if (term.source === 'bench') return bench
  if (term.source === 'riskFree') return riskFree
  return m?.[term.key]
}

const formatFormulaTermValue = (value: any, format: FormulaValueFormat): string => {
  if (format === 'text') return String(value)
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value ?? 'N/A')
  if (format === 'currency') return `$${numeric.toFixed(2)}`
  if (format === 'percent') return `${numeric.toFixed(2)}%`
  return numeric.toFixed(2)
}

const findFormulaTermRange = (formula: string, term: string, usedRanges: Array<[number, number]>) => {
  const hasOverlap = (start: number, end: number) => usedRanges.some(([usedStart, usedEnd]) => start < usedEnd && end > usedStart)
  const isWord = /^[a-zA-Z]+$/.test(term)

  if (isWord) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b`, 'g')
    let match: RegExpExecArray | null
    while ((match = regex.exec(formula)) !== null) {
      const start = match.index
      const end = start + term.length
      if (!hasOverlap(start, end)) return [start, end] as [number, number]
    }
    return null
  }

  let index = formula.indexOf(term)
  while (index !== -1) {
    const end = index + term.length
    if (!hasOverlap(index, end)) return [index, end] as [number, number]
    index = formula.indexOf(term, index + 1)
  }
  return null
}

const getMatchedFormulaTerms = (formula: string) => {
  const usedRanges: Array<[number, number]> = []
  return Object.keys(formulaTermConfigs)
    .sort((a, b) => b.length - a.length)
    .flatMap(term => {
      let hasMatch = false
      let range = findFormulaTermRange(formula, term, usedRanges)
      while (range) {
        usedRanges.push(range)
        hasMatch = true
        range = findFormulaTermRange(formula, term, usedRanges)
      }
      if (!hasMatch) return []
      const config = formulaTermConfigs[term]
      if (!config) return []
      return [{ term, config }]
    })
}

const getFormulaVariableRows = (formula: string, m: any, bench: number, riskFree: number) => {
  const addedKeys = new Set<string>()
  return getMatchedFormulaTerms(formula).flatMap(({ term, config }) => {
    const value = getFormulaTermRawValue(config, m, bench, riskFree)
    const valueKey = `${config.source ?? 'metric'}:${config.key}`
    if (value === undefined || addedKeys.has(valueKey)) return []
    addedKeys.add(valueKey)
    return [{ name: term, val: formatFormulaTermValue(value, config.format) }]
  })
}

const getEvaluatedFormulaString = (formula: string, m: any, bench: number, riskFree: number) => {
  let evaluated = formula
  getMatchedFormulaTerms(formula)
    .sort((a, b) => b.term.length - a.term.length)
    .forEach(({ term, config }) => {
      const value = getFormulaTermRawValue(config, m, bench, riskFree)
      if (value === undefined) return
      evaluated = evaluated.split(term).join(formatFormulaTermValue(value, config.format))
    })
  return evaluated
}

const formatMetricResult = (value: any) => {
  return typeof value === 'number' ? value.toFixed(2) : String(value ?? 'CALCULATED')
}

const getMetricDeepDiveVariables = (key: string | null, m: any, bench: number, riskFree: number) => {
  if (!key || !m) return [];
  const metricConfig = allAvailableConfigs.value.find(c => c.key === key);
  if (metricConfig?.formula) {
    const formulaRows = getFormulaVariableRows(metricConfig.formula, m, bench, riskFree);
    if (formulaRows.length > 0) return formulaRows;
  }

  switch (key) {
    case 'netProfit':
      return [
        { name: 'Gross Profit', val: `$${m.grossProfit?.toFixed(2) ?? '0.00'}` },
        { name: 'Gross Loss', val: `$${m.grossLoss?.toFixed(2) ?? '0.00'}` },
        { name: 'Total Trades', val: `${m.numTrades ?? 0}` }
      ];
    case 'profitFactor':
      return [
        { name: 'Gross Profit', val: `$${m.grossProfit?.toFixed(2) ?? '0.00'}` },
        { name: 'Gross Loss', val: `$${m.grossLoss?.toFixed(2) ?? '0.00'}` },
        { name: 'Win / Loss Payoff', val: `${m.payoffRatio?.toFixed(2) ?? '1.00'}` }
      ];
    case 'winRate':
    case 'lossRate':
      return [
        { name: 'Winning Trades', val: `${m.numWin ?? 0}` },
        { name: 'Losing Trades', val: `${m.numLoss ?? 0}` },
        { name: 'Total Trades', val: `${m.numTrades ?? 0}` }
      ];
    case 'expectedValue':
      return [
        { name: 'Win Rate', val: `${m.winRate?.toFixed(2) ?? '0.00'}%` },
        { name: 'Average Win', val: `$${m.avgWin?.toFixed(2) ?? '0.00'}` },
        { name: 'Loss Rate', val: `${m.lossRate?.toFixed(2) ?? '0.00'}%` },
        { name: 'Average Loss', val: `$${m.avgLoss?.toFixed(2) ?? '0.00'}` }
      ];
    case 'riskRewardRatio':
      return [
        { name: 'Average Setup RR', val: `${m.riskRewardRatio?.toFixed(2) ?? '1.00'}` },
        { name: 'Trades With Valid RR', val: `${m.plannedRRCount ?? 0}` },
        { name: 'Realized Payoff Ratio', val: `${m.realizedRR?.toFixed(2) ?? '1.00'}` }
      ];
    case 'sharpeRatio':
    case 'sortinoRatio':
    case 'calmarRatio':
      return [
        { name: 'Annualized Return', val: `${m.annualizedReturnPct?.toFixed(2) ?? '0.00'}%` },
        { name: 'Risk-Free Baseline', val: `${riskFree.toFixed(2)}%` },
        { name: key === 'sortinoRatio' ? 'Downside Volatility' : (key === 'calmarRatio' ? 'Max Drawdown' : 'Return Volatility (StdDev)'), val: `${(key === 'sortinoRatio' ? m.downsideStdDevPct : (key === 'calmarRatio' ? m.maxDrawdownPct : m.stdDevPct))?.toFixed(2) ?? '0.00'}%` }
      ];
    case 'informationRatio':
    case 'jensensAlpha':
    case 'treynorRatio':
    case 'alphaBenchmark':
    case 'betaBenchmark':
      return [
        { name: 'Strategy Annual Return', val: `${m.annualizedReturnPct?.toFixed(2) ?? '0.00'}%` },
        { name: ['treynorRatio', 'jensensAlpha'].includes(key) ? 'Risk-Free Baseline' : 'S&P 500 Benchmark Yield', val: `${(['treynorRatio', 'jensensAlpha'].includes(key) ? riskFree : bench).toFixed(2)}%` },
        { name: 'Tracking Volatility / Beta', val: `${m.strategyBeta?.toFixed(2) ?? '1.00'}` }
      ];
    case 'valueAtRisk':
      return [
        { name: 'Total Evaluated Trades', val: `${m.numTrades ?? 0}` },
        { name: 'Confidence Level', val: '95.0%' },
        { name: '5th Percentile Index', val: `${Math.floor((m.numTrades ?? 0) * 0.05)}` }
      ];
    case 'cvar':
    case 'expectedShortfall':
      return [
        { name: 'Initial Deposit', val: `$${m.initialDeposit?.toFixed(2) ?? '1000.00'}` },
        { name: 'Confidence Level', val: '95.0%' },
        { name: 'Tail Loss Threshold', val: `$${m.valueAtRisk?.toFixed(2) ?? '0.00'}` }
      ];
    default: {
      const cfg = allAvailableConfigs.value.find(c => c.key === key);
      if (cfg && cfg.formula) {
        const terms: Record<string, { key: string, format: string, source?: string }> = {
          'Winning Trades PnL': { key: 'grossProfit', format: 'currency' },
          'Losing Trades PnL': { key: 'grossLoss', format: 'currency' },
          'Strategy Gross Profit': { key: 'grossProfit', format: 'currency' },
          'Strategy Gross Loss': { key: 'grossLoss', format: 'currency' },
          'Gross Profit': { key: 'grossProfit', format: 'currency' },
          'Gross Loss': { key: 'grossLoss', format: 'currency' },
          'Net Profit': { key: 'netProfit', format: 'currency' },
          'Winning Trades': { key: 'numWin', format: 'number' },
          'Losing Trades': { key: 'numLoss', format: 'number' },
          'Total Trades': { key: 'numTrades', format: 'number' },
          'Average Win': { key: 'avgWin', format: 'currency' },
          'Average Loss': { key: 'avgLoss', format: 'currency' },
          'AvgWin': { key: 'avgWin', format: 'currency' },
          'AvgLoss': { key: 'avgLoss', format: 'currency' },
          'Initial Deposit': { key: 'initialDeposit', format: 'currency' },
          'Payoff Ratio': { key: 'payoffRatio', format: 'number' },
          'Win%': { key: 'winRate', format: 'percent' },
          'Loss%': { key: 'lossRate', format: 'percent' },
          'Average Setup RR': { key: 'riskRewardRatio', format: 'number' },
          'Maximum Drawdown %': { key: 'maxDrawdownPct', format: 'percent' },
          'Average Drawdown %': { key: 'avgDrawdownPct', format: 'percent' },
          'Maximum Drawdown': { key: 'maxDrawdownNum', format: 'currency' },
          'CAGR': { key: 'annualizedReturnPct', format: 'percent' },
          'Mean Return': { key: 'annualizedReturnPct', format: 'percent' },
          'Annualized Return StdDev': { key: 'stdDevPct', format: 'percent' },
          'Annualized StdDev(Return)': { key: 'stdDevPct', format: 'percent' },
          'Annualized Downside StdDev': { key: 'downsideStdDevPct', format: 'percent' },
          'StdDev(Return)': { key: 'stdDevPct', format: 'percent' },
          'Downside StdDev': { key: 'downsideStdDevPct', format: 'percent' },
          'StdDev(PnL)': { key: 'stdPnL', format: 'currency' },
          'StdDev': { key: 'stdDevPct', format: 'percent' },
          'Expected Value': { key: 'expectedValue', format: 'currency' },
          'EV': { key: 'expectedValue', format: 'currency' },
          'PnL > 0': { key: 'numWin', format: 'number' },
          'PnL < 0': { key: 'numLoss', format: 'number' },
          'N': { key: 'numTrades', format: 'number' },
          'W': { key: 'winRate', format: 'number' },
          'p': { key: 'winRate', format: 'number' },
          'R': { key: 'payoffRatio', format: 'number' },
          'Z': { key: 'zScore', format: 'number' },
          'Beta': { key: 'betaToBenchmark', format: 'number' },
          'TrackingErr': { key: 'stdDevPct', format: 'percent' },
          'Stability': { key: 'equityCurveStability', format: 'percent' },
          'Kelly Criterion': { key: 'kellyCriterion', format: 'percent' },
          'Kelly': { key: 'kellyCriterion', format: 'percent' },
          'Skew': { key: 'skewness', format: 'number' },
          'Kurt': { key: 'kurtosis', format: 'number' },
          'Outliers': { key: 'outlierImpactRatio', format: 'number' },
          'Rf': { key: 'riskFree', format: 'percent', source: 'riskFree' },
          'Rm': { key: 'bench', format: 'percent', source: 'bench' },
          'Benchmark': { key: 'bench', format: 'percent', source: 'bench' },
          'Trades': { key: 'numTrades', format: 'number' },
          'Wins': { key: 'numWin', format: 'number' },
          'MeanPnL': { key: 'avgTrade', format: 'currency' },
          'P50(Trade PnLs)': { key: 'medianTradeResult', format: 'currency' },
          'Mean(PnLs < P05)': { key: 'cvar', format: 'currency' },
          'CVaR': { key: 'cvar', format: 'currency' },
          'Deposit': { key: 'initialDeposit', format: 'currency' },
          'Mean MAE': { key: 'mae', format: 'currency' },
          'Mean MFE': { key: 'mfe', format: 'currency' },
          'Z-Score': { key: 'zScore', format: 'number' },
          'Simulated Max Drawdowns': { key: 'monteCarloDrawdown', format: 'percent' },
          'Simulations Ruined': { key: 'monteCarloRiskOfRuin', format: 'percent' },
          'Simulated Net Returns': { key: 'monteCarloExpectedReturn', format: 'percent' },
          'Rolling 10-Trade Sharpe': { key: 'rollingSharpe', format: 'number' },
          'Rolling 10-Trade PF': { key: 'rollingProfitFactor', format: 'number' },
          'Rolling 10-Trade EV': { key: 'rollingExpectancy', format: 'currency' },
          'Rolling 10-Trade DD': { key: 'rollingDrawdown', format: 'percent' },
          'Rolling 10-Trade Win%': { key: 'rollingWinRate', format: 'percent' },
          'Decay Rate': { key: 'strategyDecayRate', format: 'number' },
          'ΔRollingSharpe': { key: 'strategyDecayRate', format: 'number' },
          'ΔTime': { key: 'activeSpanDays', format: 'number' },
          'Active Span': { key: 'activeSpanDays', format: 'number' },
          'Equity Peak - Subsequent Trough': { key: 'maxDrawdownNum', format: 'currency' },
          'Drawdown %': { key: 'avgDrawdownPct', format: 'percent' },
          'Drawdown Count': { key: 'numTrades', format: 'number' },
          'Trough Date - Peak Date': { key: 'drawdownDurationDays', format: 'number' },
          'Entry - SL': { key: 'mae', format: 'currency' },
          'Size': { key: 'numTrades', format: 'number' },
          'Positive Returns': { key: 'grossProfit', format: 'currency' },
          'Negative Returns': { key: 'grossLoss', format: 'currency' },
          'All Returns': { key: 'netProfit', format: 'currency' },
          'Tail Ratio': { key: 'profitFactor', format: 'number' },
          'Gain-to-Pain Ratio': { key: 'profitFactor', format: 'number' },
          'Asset Gross Profit': { key: 'grossProfit', format: 'currency' },
          'Asset Gross Loss': { key: 'grossLoss', format: 'currency' },
          'TF Gross Profit': { key: 'grossProfit', format: 'currency' },
          'TF Gross Loss': { key: 'grossLoss', format: 'currency' },
          'Latest PnL': { key: 'latestPnl', format: 'currency' },
          'Latest Initial Risk': { key: 'latestInitialRisk', format: 'currency' },
          'Trade R-Multiples': { key: 'avgRMultiple', format: 'number' },
          'Trades >= 2.0R': { key: 'numWin', format: 'number' },
          'Kelly Edge': { key: 'kellyEdge', format: 'number' },
          'Edge': { key: 'kellyEdge', format: 'number' },
          'CapitalUnits': { key: 'capitalUnits', format: 'number' },
          'Index': { key: 'bench', format: 'percent', source: 'bench' },
          'Equity': { key: 'netProfit', format: 'currency' },
          'Var(Index)': { key: 'stdDevPct', format: 'percent' },
          'RegLine': { key: 'equityCurveStability', format: 'percent' },
          'SS_res': { key: 'stdPnL', format: 'currency' },
          'SS_tot': { key: 'varPnL', format: 'currency' },
          'R-Squared': { key: 'equityCurveCorrelation', format: 'percent' },
          'Median Win': { key: 'avgWin', format: 'currency' },
          'Median Loss': { key: 'avgLoss', format: 'currency' },
          'Trade MAE': { key: 'mae', format: 'currency' },
          'Trade MFE': { key: 'mfe', format: 'currency' },
          'Runs': { key: 'runs', format: 'number' },
          'E(Runs)': { key: 'expectedRuns', format: 'number' },
          'StdDev(Runs)': { key: 'stdRuns', format: 'number' },
          'Resampled Means': { key: 'monteCarloExpectedReturn', format: 'percent' },
          'T': { key: 'tTest', format: 'number' },
          't': { key: 'pValue', format: 'number' },
          'Strategy': { key: 'netProfit', format: 'currency' },
          'Market': { key: 'bench', format: 'percent', source: 'bench' },
          'Benchmark CAGR': { key: 'bench', format: 'percent', source: 'bench' },
          'PnL_t': { key: 'avgTrade', format: 'currency' },
          'PnL_{t-1}': { key: 'avgTrade', format: 'currency' },
          'S': { key: 'hurstExponent', format: 'number' },
          'Top 5% Wins': { key: 'grossProfit', format: 'currency' },
          'Archived Trades': { key: 'numTrades', format: 'number' },
          'Exit Time - Entry Time': { key: 'avgTradeDurationHours', format: 'number' },
          'P95(Returns)': { key: 'avgWin', format: 'currency' },
          'P05(Returns)': { key: 'avgLoss', format: 'currency' }
        };
        const sortedTerms = Object.keys(terms).sort((a, b) => b.length - a.length);
        const vars: any[] = [];
        const addedKeys = new Set();
        
        sortedTerms.forEach(term => {
          // Use word boundary for purely alphabetic terms
          const isWord = /^[a-zA-Z]+$/.test(term);
          const regex = isWord ? new RegExp(`\\b${term}\\b`) : null;
          
          if ((regex && regex.test(cfg.formula)) || (!regex && cfg.formula.includes(term))) {
            const propInfo = terms[term];
            if (!propInfo) return;
            const isLocal = propInfo.source;
            const valObj = isLocal === 'riskFree' ? riskFree : (isLocal === 'bench' ? bench : m[propInfo.key]);
            
            if (valObj !== undefined && !addedKeys.has(propInfo.key)) {
              addedKeys.add(propInfo.key);
              let valStr = `${valObj}`;
              if (propInfo.format === 'currency') valStr = `$${Number(valObj).toFixed(2)}`;
              else if (propInfo.format === 'percent') valStr = `${Number(valObj).toFixed(2)}%`;
              else if (propInfo.format === 'number') valStr = `${Number(valObj)}`;
              vars.push({ name: term, val: valStr });
            }
          }
        });
        if (vars.length > 0) return vars;
      }

      return [
        { name: 'Net Profit', val: `$${m.netProfit?.toFixed(2) ?? '0.00'}` },
        { name: 'Total Trades', val: `${m.numTrades ?? 0}` },
        { name: 'Initial Deposit', val: `$${m.initialDeposit?.toFixed(2) ?? '1000.00'}` },
        { name: 'Benchmark Yield', val: `${bench.toFixed(2)}%` }
      ];
    }
  }
};

const getMetricCalculationSteps = (key: string | null, m: any, bench: number, riskFree: number) => {
  if (!key || !m) return '';
  const metricConfig = allAvailableConfigs.value.find(c => c.key === key);
  if (metricConfig?.formula) {
    return `${getEvaluatedFormulaString(metricConfig.formula, m, bench, riskFree)} = ${formatMetricResult(m[key])}`;
  }

  switch (key) {
    case 'netProfit':
      return `$${m.grossProfit?.toFixed(2) ?? '0.00'} - $${m.grossLoss?.toFixed(2) ?? '0.00'} = $${m.netProfit?.toFixed(2) ?? '0.00'}`;
    case 'profitFactor':
      return `$${m.grossProfit?.toFixed(2) ?? '0.00'} / $${m.grossLoss?.toFixed(2) ?? '1.00'} = ${m.profitFactor?.toFixed(2) ?? '0.00'}`;
    case 'winRate':
      return `(${m.numWin ?? 0} / ${m.numTrades ?? 1}) * 100 = ${m.winRate?.toFixed(2) ?? '0.00'}%`;
    case 'lossRate':
      return `(${m.numLoss ?? 0} / ${m.numTrades ?? 1}) * 100 = ${m.lossRate?.toFixed(2) ?? '0.00'}%`;
    case 'expectedValue':
      return `(${m.winRate?.toFixed(1) ?? '0.0'}% * $${m.avgWin?.toFixed(2) ?? '0.00'}) - (${m.lossRate?.toFixed(1) ?? '0.0'}% * $${m.avgLoss?.toFixed(2) ?? '0.00'}) = $${m.expectedValue?.toFixed(2) ?? '0.00'}`;
    case 'sharpeRatio':
      return `(${m.annualizedReturnPct?.toFixed(2) ?? '0.00'}% - ${riskFree.toFixed(2)}%) / ${m.stdDevPct?.toFixed(2) ?? '1.00'}% = ${m.sharpeRatio?.toFixed(2) ?? '0.00'}`;
    case 'sortinoRatio':
      return `(${m.annualizedReturnPct?.toFixed(2) ?? '0.00'}% - ${riskFree.toFixed(2)}%) / ${m.downsideStdDevPct?.toFixed(2) ?? '1.00'}% = ${m.sortinoRatio?.toFixed(2) ?? '0.00'}`;
    case 'calmarRatio':
      return `${m.annualizedReturnPct?.toFixed(2) ?? '0.00'}% / ${m.maxDrawdownPct?.toFixed(2) ?? '1.00'}% = ${m.calmarRatio?.toFixed(2) ?? '0.00'}`;
    case 'informationRatio':
      return `(${m.annualizedReturnPct?.toFixed(2) ?? '0.00'}% - ${bench.toFixed(2)}%) / ${m.stdDevPct?.toFixed(2) ?? '1.00'}% = ${m.informationRatio?.toFixed(2) ?? '0.00'}`;
    case 'treynorRatio':
      return `(${m.annualizedReturnPct?.toFixed(2) ?? '0.00'}% - ${riskFree.toFixed(2)}%) / ${m.strategyBeta?.toFixed(2) ?? '1.00'} = ${m.treynorRatio?.toFixed(2) ?? '0.00'}`;
    case 'jensensAlpha':
      return `${m.annualizedReturnPct?.toFixed(2) ?? '0.00'}% - (${riskFree.toFixed(2)}% + ${m.strategyBeta?.toFixed(2) ?? '1.00'} * (${bench.toFixed(2)}% - ${riskFree.toFixed(2)}%)) = ${m.jensensAlpha?.toFixed(2) ?? '0.00'}%`;
    case 'valueAtRisk':
      return `Percentile_5th(Sorted_PnLs[0...${(m.numTrades ?? 1) - 1}]) = $${m.valueAtRisk?.toFixed(2) ?? '0.00'}`;
    case 'cvar':
      return `Average(Tail Losses < $${m.valueAtRisk?.toFixed(2) ?? '0.00'}) = $${m.cvar?.toFixed(2) ?? '0.00'}`;
    case 'expectedShortfall':
      return `($${m.cvar?.toFixed(2) ?? '0.00'} / $${m.initialDeposit?.toFixed(2) ?? '1000.00'}) * 100 = ${m.expectedShortfall?.toFixed(2) ?? '0.00'}%`;
    default: {
      const cfg = allAvailableConfigs.value.find(c => c.key === key);
      let formulaStr = cfg?.formula || `Formula Evaluation(${m.netProfit ? `$${m.netProfit.toFixed(2)}` : 'Inputs'})`;

      if (cfg && cfg.formula) {
        const terms: Record<string, { key: string, format: string, source?: string }> = {
          'Winning Trades PnL': { key: 'grossProfit', format: 'currency' },
          'Losing Trades PnL': { key: 'grossLoss', format: 'currency' },
          'Strategy Gross Profit': { key: 'grossProfit', format: 'currency' },
          'Strategy Gross Loss': { key: 'grossLoss', format: 'currency' },
          'Gross Profit': { key: 'grossProfit', format: 'currency' },
          'Gross Loss': { key: 'grossLoss', format: 'currency' },
          'Net Profit': { key: 'netProfit', format: 'currency' },
          'Winning Trades': { key: 'numWin', format: 'number' },
          'Losing Trades': { key: 'numLoss', format: 'number' },
          'Total Trades': { key: 'numTrades', format: 'number' },
          'Average Win': { key: 'avgWin', format: 'currency' },
          'Average Loss': { key: 'avgLoss', format: 'currency' },
          'AvgWin': { key: 'avgWin', format: 'currency' },
          'AvgLoss': { key: 'avgLoss', format: 'currency' },
          'Initial Deposit': { key: 'initialDeposit', format: 'currency' },
          'Payoff Ratio': { key: 'payoffRatio', format: 'number' },
          'Win%': { key: 'winRate', format: 'percent' },
          'Loss%': { key: 'lossRate', format: 'percent' },
          'Average Setup RR': { key: 'riskRewardRatio', format: 'number' },
          'Maximum Drawdown %': { key: 'maxDrawdownPct', format: 'percent' },
          'Average Drawdown %': { key: 'avgDrawdownPct', format: 'percent' },
          'Maximum Drawdown': { key: 'maxDrawdownNum', format: 'currency' },
          'CAGR': { key: 'annualizedReturnPct', format: 'percent' },
          'Mean Return': { key: 'annualizedReturnPct', format: 'percent' },
          'Annualized Return StdDev': { key: 'stdDevPct', format: 'percent' },
          'Annualized StdDev(Return)': { key: 'stdDevPct', format: 'percent' },
          'Annualized Downside StdDev': { key: 'downsideStdDevPct', format: 'percent' },
          'StdDev(Return)': { key: 'stdDevPct', format: 'percent' },
          'Downside StdDev': { key: 'downsideStdDevPct', format: 'percent' },
          'StdDev(PnL)': { key: 'stdPnL', format: 'currency' },
          'StdDev': { key: 'stdDevPct', format: 'percent' },
          'Expected Value': { key: 'expectedValue', format: 'currency' },
          'EV': { key: 'expectedValue', format: 'currency' },
          'PnL > 0': { key: 'numWin', format: 'number' },
          'PnL < 0': { key: 'numLoss', format: 'number' },
          'N': { key: 'numTrades', format: 'number' },
          'W': { key: 'winRate', format: 'number' },
          'p': { key: 'winRate', format: 'number' },
          'R': { key: 'payoffRatio', format: 'number' },
          'Z': { key: 'zScore', format: 'number' },
          'Beta': { key: 'betaToBenchmark', format: 'number' },
          'TrackingErr': { key: 'stdDevPct', format: 'percent' },
          'Stability': { key: 'equityCurveStability', format: 'percent' },
          'Kelly Criterion': { key: 'kellyCriterion', format: 'percent' },
          'Kelly': { key: 'kellyCriterion', format: 'percent' },
          'Skew': { key: 'skewness', format: 'number' },
          'Kurt': { key: 'kurtosis', format: 'number' },
          'Outliers': { key: 'outlierImpactRatio', format: 'number' },
          'Rf': { key: 'riskFree', format: 'percent', source: 'riskFree' },
          'Rm': { key: 'bench', format: 'percent', source: 'bench' },
          'Benchmark': { key: 'bench', format: 'percent', source: 'bench' },
          'Trades': { key: 'numTrades', format: 'number' },
          'Wins': { key: 'numWin', format: 'number' },
          'MeanPnL': { key: 'avgTrade', format: 'currency' },
          'P50(Trade PnLs)': { key: 'medianTradeResult', format: 'currency' },
          'Mean(PnLs < P05)': { key: 'cvar', format: 'currency' },
          'CVaR': { key: 'cvar', format: 'currency' },
          'Deposit': { key: 'initialDeposit', format: 'currency' },
          'Mean MAE': { key: 'mae', format: 'currency' },
          'Mean MFE': { key: 'mfe', format: 'currency' },
          'Z-Score': { key: 'zScore', format: 'number' },
          'Simulated Max Drawdowns': { key: 'monteCarloDrawdown', format: 'percent' },
          'Simulations Ruined': { key: 'monteCarloRiskOfRuin', format: 'percent' },
          'Simulated Net Returns': { key: 'monteCarloExpectedReturn', format: 'percent' },
          'Rolling 10-Trade Sharpe': { key: 'rollingSharpe', format: 'number' },
          'Rolling 10-Trade PF': { key: 'rollingProfitFactor', format: 'number' },
          'Rolling 10-Trade EV': { key: 'rollingExpectancy', format: 'currency' },
          'Rolling 10-Trade DD': { key: 'rollingDrawdown', format: 'percent' },
          'Rolling 10-Trade Win%': { key: 'rollingWinRate', format: 'percent' },
          'Decay Rate': { key: 'strategyDecayRate', format: 'number' },
          'ΔRollingSharpe': { key: 'strategyDecayRate', format: 'number' },
          'ΔTime': { key: 'activeSpanDays', format: 'number' },
          'Active Span': { key: 'activeSpanDays', format: 'number' },
          'Equity Peak - Subsequent Trough': { key: 'maxDrawdownNum', format: 'currency' },
          'Drawdown %': { key: 'avgDrawdownPct', format: 'percent' },
          'Drawdown Count': { key: 'numTrades', format: 'number' },
          'Trough Date - Peak Date': { key: 'drawdownDurationDays', format: 'number' },
          'Entry - SL': { key: 'mae', format: 'currency' },
          'Size': { key: 'numTrades', format: 'number' },
          'Positive Returns': { key: 'grossProfit', format: 'currency' },
          'Negative Returns': { key: 'grossLoss', format: 'currency' },
          'All Returns': { key: 'netProfit', format: 'currency' },
          'Tail Ratio': { key: 'profitFactor', format: 'number' },
          'Gain-to-Pain Ratio': { key: 'profitFactor', format: 'number' },
          'Asset Gross Profit': { key: 'grossProfit', format: 'currency' },
          'Asset Gross Loss': { key: 'grossLoss', format: 'currency' },
          'TF Gross Profit': { key: 'grossProfit', format: 'currency' },
          'TF Gross Loss': { key: 'grossLoss', format: 'currency' },
          'Latest PnL': { key: 'latestPnl', format: 'currency' },
          'Latest Initial Risk': { key: 'latestInitialRisk', format: 'currency' },
          'Trade R-Multiples': { key: 'avgRMultiple', format: 'number' },
          'Trades >= 2.0R': { key: 'numWin', format: 'number' },
          'Kelly Edge': { key: 'kellyEdge', format: 'number' },
          'Edge': { key: 'kellyEdge', format: 'number' },
          'CapitalUnits': { key: 'capitalUnits', format: 'number' },
          'Index': { key: 'bench', format: 'percent', source: 'bench' },
          'Equity': { key: 'netProfit', format: 'currency' },
          'Var(Index)': { key: 'stdDevPct', format: 'percent' },
          'RegLine': { key: 'equityCurveStability', format: 'percent' },
          'SS_res': { key: 'stdPnL', format: 'currency' },
          'SS_tot': { key: 'varPnL', format: 'currency' },
          'R-Squared': { key: 'equityCurveCorrelation', format: 'percent' },
          'Median Win': { key: 'avgWin', format: 'currency' },
          'Median Loss': { key: 'avgLoss', format: 'currency' },
          'Trade MAE': { key: 'mae', format: 'currency' },
          'Trade MFE': { key: 'mfe', format: 'currency' },
          'Runs': { key: 'runs', format: 'number' },
          'E(Runs)': { key: 'expectedRuns', format: 'number' },
          'StdDev(Runs)': { key: 'stdRuns', format: 'number' },
          'Resampled Means': { key: 'monteCarloExpectedReturn', format: 'percent' },
          'T': { key: 'tTest', format: 'number' },
          't': { key: 'pValue', format: 'number' },
          'Strategy': { key: 'netProfit', format: 'currency' },
          'Market': { key: 'bench', format: 'percent', source: 'bench' },
          'Benchmark CAGR': { key: 'bench', format: 'percent', source: 'bench' },
          'PnL_t': { key: 'avgTrade', format: 'currency' },
          'PnL_{t-1}': { key: 'avgTrade', format: 'currency' },
          'S': { key: 'hurstExponent', format: 'number' },
          'Top 5% Wins': { key: 'grossProfit', format: 'currency' },
          'Archived Trades': { key: 'numTrades', format: 'number' },
          'Exit Time - Entry Time': { key: 'avgTradeDurationHours', format: 'number' },
          'P95(Returns)': { key: 'avgWin', format: 'currency' },
          'P05(Returns)': { key: 'avgLoss', format: 'currency' }
        };
        const sortedTerms = Object.keys(terms).sort((a, b) => b.length - a.length);
        let evaluatedStr = cfg.formula;
        sortedTerms.forEach(term => {
          const isWord = /^[a-zA-Z]+$/.test(term);
          const regex = isWord ? new RegExp(`\\b${term}\\b`, 'g') : null;
          
          if ((regex && regex.test(evaluatedStr)) || (!regex && evaluatedStr.includes(term))) {
            const propInfo = terms[term];
            if (!propInfo) return;
            const isLocal = propInfo.source;
            const valObj = isLocal === 'riskFree' ? riskFree : (isLocal === 'bench' ? bench : m[propInfo.key]);

            if (valObj !== undefined) {
              let valStr = `${valObj}`;
              if (propInfo.format === 'currency') valStr = `$${Number(valObj).toFixed(2)}`;
              else if (propInfo.format === 'percent') valStr = `${Number(valObj).toFixed(2)}%`;
              else if (propInfo.format === 'number') valStr = `${Number(valObj).toFixed(2)}`;
              
              if (regex) {
                evaluatedStr = evaluatedStr.replace(regex, valStr);
              } else {
                evaluatedStr = evaluatedStr.split(term).join(valStr);
              }
            }
          }
        });
        formulaStr = evaluatedStr;
      }
      
      return `${formulaStr} = ${m[key] !== undefined ? (typeof m[key] === 'number' ? m[key].toFixed(2) : m[key]) : 'CALCULATED'}`;
    }
  }
};

const getMetricRationale = (key: string | null): string => {
  if (!key) return '';
  const rationales: Record<string, string> = {
    // Primary Metrics
    netProfit: "Determines the absolute bottom-line monetary value generated by the strategy after accounting for all losses and fees, validating basic financial viability.",
    grossProfit: "Measures the absolute upside capacity of the strategy, showing the total profit-generation power of winning trades before losses are factored in.",
    grossLoss: "Quantifies the total capital eroded by unsuccessful executions, establishing the baseline friction and cost of strategy operations.",
    winRate: "Indicates the frequency of successful outcomes, which is critical for understanding psychological comfort, streak patterns, and execution bias.",
    lossRate: "Highlights the probability of negative trade outcomes, helping to calibrate risk tolerance and prepare for sequential losing runs.",
    avgWin: "Establishes the average profit target scale, serving as the benchmark for positive expectancy and expected trade outcomes.",
    avgLoss: "Defines the standard cost of invalidation per losing setup, essential for enforcing stop-loss sizing and capital preservation rules.",
    avgTrade: "Reveals the average expectancy per execution, showing if the strategy generates a positive edge when all outcomes are blended.",
    payoffRatio: "Evaluates risk-to-reward asymmetry; a higher payoff ratio means you can remain highly profitable even with a lower win rate.",
    riskRewardRatio: "Measures the average setup Risk/Reward from valid trade price levels, excluding zero or invalid RR values.",
    realizedRR: "Contrasts planned risk limits against actual market capture, identifying slippage, execution drag, or premature trade management.",
    expectedValue: "Determines the long-term mathematical viability of the strategy; it must be positive for the account to grow over a large sample.",
    profitFactor: "Serves as a primary metric of efficiency, showing how many dollars are earned for every dollar lost. A value above 1.5 indicates a robust strategy.",
    beWinRate: "Calculates the mandatory minimum win rate required to break even under current payoff structures, highlighting the strategy's safety margin.",
    numTrades: "Establishes the sample size of the dataset; higher trade counts validate statistical significance and reduce backtesting luck.",
    numWin: "Reveals the exact count of profitable executions to analyze the sample distribution and win-streak characteristics.",
    numLoss: "Tracks the frequency of invalidation events to assess risk exposure and statistical dispersion of losses.",
    largestWin: "Identifies outlier positive returns to verify if strategy success is heavily dependent on a few anomalous windfall events.",
    largestLoss: "Exposes tail risk exposure and catastrophic outliers, verifying if stop-loss protocols were breached or slipped.",
    maxConsWins: "Reveals the maximum historical win streak, helping to calibrate psychological confidence and spot clustering behaviors.",
    maxConsLosses: "Defines the worst-case consecutive drawdown sequence, critical for calibrating risk parameters to prevent account ruin.",
    avgHoldingTimeStr: "Measures average exposure duration, helping to optimize capital allocation cycles and identify time-based risk.",
    avgProfitPerDay: "Calculates profit velocity per unit of time, highlighting the capital efficiency and compounding speed of the strategy.",
    maxDrawdownNum: "Quantifies the absolute deepest peak-to-trough capital decline, setting the absolute limit for worst-case risk modeling.",
    avgDrawdownPct: "Measures typical retracement depth during consolidation phases, setting realistic expectations for normal account fluctuations.",
    drawdownDurationStr: "Models the time required to recover from equity drawdowns, testing the trader's psychological resilience and strategy recovery speed.",
    recoveryFactor: "Evaluates the strategy's capacity to climb back from drawdowns; higher values indicate efficient recovery relative to historical risk.",
    returnOnCapital: "Measures absolute growth efficiency relative to initial capital, highlighting the true return yield of the account.",
    returnPerTrade: "Shows the average percentage yield per execution, standardizing return profiles across different account sizes.",
    riskPerTrade: "Monitors the average capital risked per trade to prevent over-leverage and enforce strict portfolio-level risk budgets.",

    // Advanced Metrics
    sharpeRatio: "Standardizes risk-adjusted returns by penalizing volatility; critical for institutional comparison and yield stability assessment.",
    sortinoRatio: "Refines risk-adjusted returns by only penalizing negative (downside) volatility, avoiding penalization of positive profit spikes.",
    calmarRatio: "Measures return efficiency relative to drawdown tail risk; highly valued by hedge funds to evaluate return sustainability.",
    sterlingRatio: "Compares compound returns against average drawdown depths, evaluating stability over long-term capital allocation cycles.",
    omegaRatio: "Captures the entire shape of the return distribution rather than just variance, measuring probability of beating a target return.",
    ulcerIndex: "Measures both the depth and duration of equity drawdowns, providing a high-fidelity proxy for psychological stress and capital erosion.",
    marRatio: "Evaluates annualized return performance relative to the maximum peak-to-trough historical drawdown to check portfolio risk efficiency.",
    gainToPainRatio: "Jack Schwager's metric comparing net returns directly against absolute negative returns to evaluate overall performance smoothness.",
    tailRatio: "Measures the asymmetry of the return distribution; values above 1.2 indicate favorable positive tail edge and limited downside risk.",
    commonSenseRatio: "Combines tail ratio and gain-to-pain to evaluate the overall quantitative robustness of asymmetric return profiles.",
    profitFactorStrategy: "Isolates profit factor for the current active strategy to verify its individual performance contribution without asset noise.",
    profitFactorMarket: "Pinpoints the best performing asset class or market, identifying key style drift opportunities or sector specialization.",
    profitFactorTimeframe: "Identifies the execution timeframe with the highest structural edge, optimizing temporal focus and execution efficiency.",
    avgTradeExpectancy: "Calculates average expectancy in dollar terms, standardizing the return expectation of future trade setups.",
    expectancyScore: "Normalizes expected value by the average loss magnitude to evaluate edge efficiency independent of trade size.",
    latestRMultiple: "Evaluates execution quality of the latest trade setup relative to initial risk boundaries, tracking recent discipline.",
    avgRMultiple: "Calculates the average R-multiple to confirm the strategy has a structural mathematical edge (aim for > 1.0R).",
    rMultipleDist: "Tracks the frequency of high-payoff trades (>= 2.0R), confirming if the strategy successfully captures major asymmetric wins.",

    // Expert Metrics
    valueAtRisk: "Models tail risk by predicting the maximum expected dollar loss with 95% confidence under normal market conditions.",
    cvar: "Calculates average loss in the worst 5% of outcomes, exposing hidden tail risk and extreme market liquidation scenarios.",
    expectedShortfall: "Expresses CVaR relative to deposit to check if worst-case tail risk exceeds capital limits or margin thresholds.",
    mae: "Measures average intra-trade drawdown before exit, identifying if stop-losses are set too tight or entries are premature.",
    mfe: "Tracks average intra-trade profit potential before exit, revealing left-on-the-table profits and exit efficiency.",
    maeMfeRatio: "Evaluates execution timing efficiency; values below 0.5 confirm entries are highly precise with minimal drawdown exposure.",
    zScore: "Tests win/loss sequence independence; identifies if trades cluster in streaks or act as independent random trials.",
    runsTest: "Provides formal statistical validation of sequence independence, confirming if streak patterns are non-random.",
    monteCarloDrawdown: "Simulates 500 random resamples of the equity path to forecast realistic maximum drawdown expectations under variance.",
    monteCarloRiskOfRuin: "Projects probability of total capital destruction across simulated paths, verifying long-term survival prospects.",
    monteCarloExpectedReturn: "Provides a robust, resampled expectation of return distribution, eliminating bias from chronological sequence luck.",
    bootstrapConfidenceInterval: "Computes the 95% empirical range of mean returns, establishing statistical bounds for strategy expectations.",
    ciExpectedValue: "Calculates the 95% confidence interval bounds for expected value to verify if the edge is statistically positive.",
    ciWinRate: "Defines the statistical bounds of the strategy's win rate to ensure performance does not deviate from target parameters.",
    bayesianWinRate: "Regularizes early win rates using a Beta prior, preventing overconfidence or panic during initial small samples.",
    bayesianExpectedValue: "Applies Bayesian shrinkage to expected value to normalize early performance spikes and model realistic edge.",
    kellyCriterion: "Determines the mathematical optimal leverage to maximize compounded growth, serving as the absolute ceiling for sizing.",
    fractionalKelly: "Applies half-Kelly scaling to reduce growth volatility, protect capital, and mitigate parameter estimation errors.",
    optimalF: "Calculates Ralph Vince's optimal fraction of capital to risk per trade for optimal geometric curve compounding.",
    sqn: "Van Tharp's System Quality Number checking if the strategy edge is robust enough to trade safely relative to volatility and count.",
    tTest: "Tests the statistical significance of the strategy edge, checking if the mean return is due to skill or random chance.",
    pValue: "Measures probability of achieving current performance by pure chance; values below 0.05 confirm a true statistical edge.",
    informationRatio: "Measures active return efficiency relative to benchmark tracking error, validating active portfolio management value.",
    treynorRatio: "Evaluates excess return per unit of systematic market risk, assessing efficiency relative to passive indexing.",
    jensensAlpha: "Determines true outperformance above the risk-adjusted CAPM expectations, isolating pure manager/strategy skill.",
    betaToBenchmark: "Quantifies systematic sensitivity to the market; helps manage market risk exposure and portfolio hedging.",
    alphaToBenchmark: "Measures raw compound outperformance against the market index, confirming if active trading beat passive holding.",
    returnAutocorrelation: "Measures momentum or mean reversion in trade results, indicating if streak behaviors have predictive value.",
    volatilityClustering: "Identifies periods of concentrated risk or regime shifts, helping to adjust position sizes during high-risk regimes.",
    hurstExponent: "Determines if the equity curve has long-term memory, confirming stable structural growth versus random walk behavior.",
    regimeStabilityScore: "Evaluates strategy consistency across changing market regimes, verifying robustness against structural shifts.",
    rollingSharpe: "Monitors risk-adjusted efficiency in rolling windows, detecting early signs of performance degradation or strategy drift.",
    rollingProfitFactor: "Tracks profit factor changes over moving windows, exposing dynamic changes in payoff asymmetry.",
    rollingExpectancy: "Monitors localized expectancy shifts to catch declining edge before drawdown inflicts severe capital damage.",
    rollingDrawdown: "Tracks recent drawdown cycles to detect system wear-and-tear or shifts in market volatility regimes.",
    rollingWinRate: "Identifies cyclical swings in accuracy, helping to detect regime mismatch or execution deviations.",
    strategyDecayRate: "Measures rate of alpha decay over time, alerting the operator when a strategy is losing its structural edge.",
    edgeHalfLife: "Forecasts the remaining lifespan of the strategy's edge, defining the timeline for model recalibration or retirement.",
    outlierImpactRatio: "Checks dependency on rare windfalls; high values indicate high fragility if outlier wins do not repeat.",
    distributionRobustness: "Assesses overall distribution safety, confirming if return profiles are structurally stable and free of tail risk."
  };
  return rationales[key] || "Identifies structural efficiency parameters to optimize execution and sustain consistent capital appreciation.";
};

const metricTonePalette = {
  excellent: '#86efac',
  positive: '#22c55e',
  neutral: '#facc15',
  warning: '#fb923c',
  negative: '#ef4444'
};

const getMetricToneColor = (cfg: MetricConfig, mVals: any): string => {
  const evalText = String(cfg.evalStr?.(mVals) || '').toLowerCase();
  const classHint = `${cfg.evalClass?.(mVals) || ''} ${cfg.colorClass?.(mVals) || ''}`.toLowerCase();
  const hasAny = (terms: string[]) => terms.some(term => evalText.includes(term));

  if (hasAny(['perfect', 'elite', 'excellent', 'superior', 'highly', 'holy grail', 'optimal', 'strong edge', 'strong active', 'significant edge', 'geometric peak', 'market beating', 'positive skew'])) {
    return metricTonePalette.excellent;
  }

  if (classHint.includes('rose') || classHint.includes('red')) {
    return metricTonePalette.negative;
  }

  if (classHint.includes('amber') || classHint.includes('yellow') || classHint.includes('orange')) {
    return metricTonePalette.warning;
  }

  if (classHint.includes('emerald') || classHint.includes('green')) {
    return metricTonePalette.positive;
  }

  if (hasAny(['profitable', 'positive', 'favorable', 'safe', 'low risk', 'low stress', 'controlled', 'sustainable', 'robust', 'upward', 'majority wins', 'independent', 'persistent', 'defensive', 'nominal'])) {
    return metricTonePalette.positive;
  }

  if (hasAny(['negative', 'drawdown', 'sub-optimal', 'unsustainable', 'severe', 'critical', 'fragile', 'inefficient', 'failed', 'dependent', 'capital erosion', 'underperforming', 'unstable', 'alpha decay', 'high risk', 'high stress', 'no edge', 'tail risk', 'systemic', 'heavy outlier'])) {
    return metricTonePalette.negative;
  }

  if (hasAny(['moderate', 'vulnerable', 'small sample', 'inconclusive', 'short horizon', 'fat tails', 'aggressive', 'clustered', 'serial memory', 'random walk', 'average', 'acceptable'])) {
    return metricTonePalette.warning;
  }

  return metricTonePalette.neutral;
};

// --- 3D MATH TYPES --- //
interface Point3D { x: number; y: number; z: number }
interface Point2D { x: number; y: number; opacity: number; depth: number }
interface CurvePoint extends Point3D { value: number; dateLabel: string; isProjection?: boolean }

const props = defineProps<{
  trades?: any[]
  initialBalance?: number
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
const hoveredMetricIndex = ref<number | null>(null)
const hoveredMetricScreenPos = ref<{x: number, y: number} | null>(null)

const hoveredMetricTooltipData = computed(() => {
  if (hoveredMetricIndex.value === null || !activeMetricsConfigs.value[hoveredMetricIndex.value]) return null
  const cfg = activeMetricsConfigs.value[hoveredMetricIndex.value]!
  const mVals = strategyMetrics.value

  let fullValString = cfg.tooltipValStr ? cfg.tooltipValStr(mVals) : cfg.valStr(mVals)
  const numFullVal = Number((mVals as any)[cfg.key])
  const isRatioMetricFull = ['informationRatio', 'treynorRatio', 'tTest', 'sqn', 'calmarRatio', 'sterlingRatio', 'sortinoRatio', 'sharpeRatio', 'omegaRatio', 'marRatio', 'gainToPainRatio', 'tailRatio', 'commonSenseRatio', 'maeMfeRatio', 'zScore', 'profitFactor', 'payoffRatio', 'riskRewardRatio', 'realizedRR', 'winLossRatio'].includes(cfg.key)

  if (fullValString.includes('Infinity') || fullValString.includes('NaN') || (!isNaN(numFullVal) && isRatioMetricFull && Math.abs(numFullVal) > 999999)) {
    fullValString = numFullVal < 0 ? '-INFINITY' : 'INFINITY'
  }
  const cleanFullVal = fullValString.replace(/[\+\-\$\s\%Rxdhwm\|\(\)\/\,\:]/g, '')
  const isFullZero = cleanFullVal.length > 0 && cleanFullVal.split('').every(c => c === '0' || c === '.')
  
  return {
    label: cfg.label.replace('_', ' '),
    evalText: cfg.evalStr(mVals).toUpperCase(),
    color: isFullZero ? metricTonePalette.neutral : getMetricToneColor(cfg, mVals),
    valStr: fullValString,
    desc: cfg.desc,
    benchmarks: cfg.benchmarks.map(b => `${b.label} (${b.eval})`),
    isBenchMetric: ['informationRatio', 'treynorRatio', 'jensensAlpha', 'alphaToBenchmark', 'betaToBenchmark'].includes(cfg.key),
    isRiskFreeMetric: ['sharpeRatio', 'sortinoRatio', 'treynorRatio', 'jensensAlpha'].includes(cfg.key),
  }
})

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

const getRobustnessExplanation = (stats: any) => {
  const skew = stats.skewness || 0
  const kurt = stats.kurtosis || 0
  const isFatTailed = stats.preferredModel === "Student's t" || kurt > 1.5
  const distribution = isFatTailed ? "Student's t / fat-tailed" : 'Normal-like'
  const sampleSize = stats.pnls?.length || 0
  const unmanagedRatio = sampleSize > 0 ? (stats.unmanagedRiskCount || 0) / sampleSize : 0
  const hasNoRiskModel = unmanagedRatio >= 0.5 || (stats.stopLossCoveragePct || 0) < 50
  const hasTailOutliers = (stats.tailOutlierCount || 0) > 0 || (stats.largestTailSigma || 0) >= 3

  if (hasNoRiskModel && (isFatTailed || hasTailOutliers)) {
    return {
      distribution,
      verdict: 'Unmanaged fat-tail profile',
      diagnosis: 'The return stream has large tail events while most trades lack protective stop or target data. A positive average can be dominated by a few outliers, so the curve is not robust without explicit loss limits.',
      action: 'Add stop-loss data first. Keep position size small. Retest without the biggest winner before scaling up.',
      tone: '#fb7185'
    }
  }

  if (skew < -0.5) {
    return {
      distribution,
      verdict: 'Negative skew detected',
      diagnosis: 'The left tail is heavier than the right tail. The strategy is probably collecting frequent small gains while exposing the account to rare but oversized losses.',
      action: 'Review the losing trades. Tighten stops or exits. Use smaller position size until the worst loss is acceptable.',
      tone: '#fb7185'
    }
  }

  if (isFatTailed && skew > 0.5) {
    return {
      distribution,
      verdict: 'Right-skewed tail dependency',
      diagnosis: 'The right tail is profitable, but the distribution is still fat-tailed. The strategy may look attractive because of rare oversized winners rather than stable repeatable expectancy.',
      action: 'Retest without the biggest winner. Keep risk per trade fixed. Wait for more trades before increasing size.',
      tone: stats.mean < 0 ? '#fb7185' : '#fbbf24'
    }
  }

  if (skew > 0.5) {
    return {
      distribution,
      verdict: 'Positive skew profile',
      diagnosis: 'The right tail is dominant. This usually fits trend-following or breakout logic where many small losses can be paid by a few large winners.',
      action: 'Keep risk per trade steady. Let winners run. Judge the strategy on a bigger sample, not one trade.',
      tone: stats.mean < 0 ? '#fb7185' : '#34d399'
    }
  }

  if (isFatTailed) {
    return {
      distribution,
      verdict: 'Fat tails are present',
      diagnosis: "Returns are better described by a Student's t shape than by a calm normal curve. Outliers are part of the system, not noise.",
      action: 'Keep extra cash aside. Avoid leverage. Test the worst losing streak and size trades for that case.',
      tone: '#fbbf24'
    }
  }

  return {
    distribution,
    verdict: 'Calm diversified distribution',
    diagnosis: 'The return shape is close to normal. This points to calmer, more diversified behavior with fewer structural tail shocks.',
    action: 'Keep the current rules. Do not over-tune the strategy. Recheck after more trades.',
    tone: colors.value.accent
  }
}

const robustnessExplanation = computed(() => getRobustnessExplanation(diagnosticStats.value))

const robustnessExplanationVariables = computed(() => {
  const stats = diagnosticStats.value
  return [
    { name: 'Preferred Distribution', val: stats.preferredModel || 'Normal' },
    { name: 'Mean Trade Result', val: `$${stats.mean.toFixed(2)}` },
    { name: 'Standard Deviation', val: `$${stats.std.toFixed(2)}` },
    { name: 'Skewness', val: `${stats.skewness >= 0 ? '+' : ''}${stats.skewness.toFixed(2)}` },
    { name: 'Excess Kurtosis', val: `${stats.kurtosis >= 0 ? '+' : ''}${stats.kurtosis.toFixed(2)}` },
    { name: 'PnL Range', val: `$${stats.minPnl.toFixed(0)} / $${stats.maxPnl.toFixed(0)}` },
    { name: 'IQR Tail Outliers', val: `${stats.tailOutlierCount}` },
    { name: 'Largest Tail Distance', val: `${stats.largestTailSigma.toFixed(2)}σ` },
    { name: 'Stop-Loss Coverage', val: `${stats.stopLossCoveragePct.toFixed(0)}%` },
    { name: 'Take-Profit Coverage', val: `${stats.takeProfitCoveragePct.toFixed(0)}%` },
    { name: 'Unmanaged Trades', val: `${stats.unmanagedRiskCount}` },
    { name: 'Sample Size', val: `${stats.pnls.length} trades` }
  ]
})

const robustnessDistributionFits = computed(() => {
  const stats = diagnosticStats.value
  const normalWins = stats.preferredModel !== "Student's t"
  return [
    {
      name: 'Normal',
      isBest: normalWins,
      aic: stats.normalParams.aic.toFixed(2),
      bic: stats.normalParams.bic.toFixed(2),
      params: [
        { name: 'Mean', val: `$${stats.normalParams.mean.toFixed(2)}` },
        { name: 'Sigma', val: `$${stats.normalParams.std.toFixed(2)}` },
        { name: 'Log Likelihood', val: stats.normalParams.logL.toFixed(2) }
      ]
    },
    {
      name: "Student's t",
      isBest: !normalWins,
      aic: stats.tParams.aic.toFixed(2),
      bic: stats.tParams.bic.toFixed(2),
      params: [
        { name: 'Mean', val: `$${stats.tParams.mean.toFixed(2)}` },
        { name: 'Scale', val: `$${stats.tParams.scale.toFixed(2)}` },
        { name: 'Degrees of Freedom', val: stats.tParams.nu.toFixed(2) },
        { name: 'Log Likelihood', val: stats.tParams.logL.toFixed(2) }
      ]
    }
  ]
})

const robustnessDistributionComparison = computed(() => {
  const stats = diagnosticStats.value
  const deltaBic = stats.normalParams.bic - stats.tParams.bic
  if (stats.pnls.length < 5) {
    return 'The sample is still thin, so AIC/BIC should be treated as directional evidence rather than a final model selection.'
  }
  if (deltaBic > 2) {
    return `Student's t is preferred by BIC by ${deltaBic.toFixed(2)} points. The strategy should be managed as fat-tailed: outliers and capital reserve matter more than average trade comfort.`
  }
  if (deltaBic < -2) {
    return `Normal fit is preferred by BIC by ${Math.abs(deltaBic).toFixed(2)} points. The current distribution looks calmer, but skew and sample size still decide risk policy.`
  }
  return `AIC/BIC are close. Treat the model comparison as inconclusive and keep both normal fit and tail-aware controls visible.`
})

const robustnessNormalityTests = computed(() => {
  const stats = diagnosticStats.value
  const n = stats.pnls.length
  const jarqueBera = n > 0 ? (n / 6) * (Math.pow(stats.skewness, 2) + Math.pow(stats.kurtosis, 2) / 4) : 0
  const jbPass = jarqueBera < 5.99
  const skewPass = Math.abs(stats.skewness) < 0.5
  const kurtPass = Math.abs(stats.kurtosis) < 1.5
  const qqPass = stats.qqPoints.length > 0 && Math.abs(stats.skewness) < 0.75 && stats.kurtosis < 2
  const outlierPass = (stats.tailOutlierCount || 0) === 0 && (stats.largestTailSigma || 0) < 3
  const riskPass = (stats.stopLossCoveragePct || 0) >= 90

  return [
    {
      name: 'Jarque-Bera Normality Proxy',
      result: `${jarqueBera.toFixed(2)} ${jbPass ? 'PASS' : 'REJECT'}`,
      note: 'H0: returns are compatible with normal skew/kurtosis.',
      pass: jbPass
    },
    {
      name: 'Skewness Symmetry Check',
      result: `${stats.skewness >= 0 ? '+' : ''}${stats.skewness.toFixed(2)} ${skewPass ? 'PASS' : 'WATCH'}`,
      note: 'Large negative skew is the highest practical risk flag.',
      pass: skewPass
    },
    {
      name: 'Excess Kurtosis Tail Check',
      result: `${stats.kurtosis >= 0 ? '+' : ''}${stats.kurtosis.toFixed(2)} ${kurtPass ? 'PASS' : 'FAT_TAIL'}`,
      note: 'Positive excess kurtosis means outlier frequency is elevated.',
      pass: kurtPass
    },
    {
      name: 'QQ-Plot Alignment Check',
      result: qqPass ? 'ALIGNED' : 'TAIL_DEVIATION',
      note: 'Uses the same quantile source as the QQ projection view.',
      pass: qqPass
    },
    {
      name: 'IQR Tail Outlier Check',
      result: `${stats.tailOutlierCount || 0} ${outlierPass ? 'PASS' : 'OUTLIER_RISK'}`,
      note: 'Flags trades outside the interquartile tail fence and beyond the visible fitted domain.',
      pass: outlierPass
    },
    {
      name: 'Risk Management Coverage Check',
      result: `${(stats.stopLossCoveragePct || 0).toFixed(0)}% ${riskPass ? 'PASS' : 'NO_RISK_MODEL'}`,
      note: 'Robustness requires explicit stop-loss coverage, especially when tail events dominate expectancy.',
      pass: riskPass
    }
  ]
})

const robustnessHypothesisSummary = computed(() => {
  const tests = robustnessNormalityTests.value
  const failed = tests.filter(t => !t.pass)
  if (failed.length === 0) {
    return 'Hypothesis verdict: no major distribution break is visible yet. Normal-fit views are usable, but keep monitoring tails as the sample grows.'
  }

  const stats = diagnosticStats.value
  const hasNormalityFailure = failed.some(t => t.name === 'Jarque-Bera Normality Proxy')
  const hasRiskModelFailure = failed.some(t => t.name === 'Risk Management Coverage Check')
  const hasTailFailure = failed.some(t =>
    t.name === 'Excess Kurtosis Tail Check' ||
    t.name === 'IQR Tail Outlier Check' ||
    t.name === 'QQ-Plot Alignment Check'
  )
  const hasShapeFailure = failed.some(t => t.name === 'Skewness Symmetry Check')

  if (hasRiskModelFailure && hasTailFailure && hasShapeFailure) {
    return `Hypothesis verdict: fragile profile. Tails, skew, and weak risk controls are all active, so average PnL is misleading. Stop-loss coverage is ${stats.stopLossCoveragePct.toFixed(0)}%.`
  }

  if (hasRiskModelFailure && hasTailFailure) {
    return `Hypothesis verdict: unmanaged tail risk. Outliers are present and risk coverage is weak, so the strategy needs controls before the average trade means much. Stop-loss coverage is ${stats.stopLossCoveragePct.toFixed(0)}%.`
  }

  if (hasRiskModelFailure && hasShapeFailure) {
    return `Hypothesis verdict: asymmetric and under-controlled. The return shape is tilted, but the risk model is too thin to trust the edge. Stop-loss coverage is ${stats.stopLossCoveragePct.toFixed(0)}%.`
  }

  if (hasRiskModelFailure) {
    return `Hypothesis verdict: risk model missing. The distribution may look acceptable, but robustness is limited until stop-loss coverage improves from ${stats.stopLossCoveragePct.toFixed(0)}%.`
  }

  if (hasTailFailure && hasShapeFailure) {
    return 'Hypothesis verdict: non-normal profile. Outliers and skew are both visible, so evaluate the strategy by tail behavior, not by average return.'
  }

  if (hasTailFailure) {
    return 'Hypothesis verdict: fat-tail behavior. A few extreme trades are shaping the result, so stress-test the tails before trusting expectancy.'
  }

  if (hasShapeFailure) {
    return 'Hypothesis verdict: asymmetric returns. The edge may depend on one side of the curve, so validate skew before increasing size.'
  }

  if (hasNormalityFailure) {
    return 'Hypothesis verdict: normality is statistically weak. Keep the normal curve as a reference only, and confirm the edge with more trades.'
  }

  return 'Hypothesis verdict: mixed warning. The sample is not clean enough for high confidence, so treat the edge as provisional.'
})

const robustnessBootstrapSummary = computed(() => {
  const bs = diagnosticStats.value.bootstrapCI
  return [
    { name: 'Simulations', val: '500' },
    { name: 'Mean Estimate', val: `$${bs.mean.toFixed(2)}` },
    { name: 'Std Error', val: `$${bs.stdErr.toFixed(2)}` },
    { name: '95% CI Lower', val: `$${bs.lower.toFixed(2)}` },
    { name: '95% CI Upper', val: `$${bs.upper.toFixed(2)}` },
    { name: 'CI Width', val: `$${(bs.upper - bs.lower).toFixed(2)}` }
  ]
})

const robustnessBootstrapInterpretation = computed(() => {
  const bs = diagnosticStats.value.bootstrapCI
  if (bs.lower > 0) {
    return 'The bootstrap interval stays above zero. The observed edge survives resampling, but position sizing should still respect tail diagnostics.'
  }
  if (bs.upper < 0) {
    return 'The bootstrap interval stays below zero. The strategy currently fails the resampled expectancy test and should be paused or reworked.'
  }
  return 'The bootstrap interval crosses zero. The edge is not statistically stable yet; collect more trades or reduce risk until the interval clears positive territory.'
})

const robustnessUiLayerSummary = computed(() => {
  const m = strategyMetrics.value
  const stats = diagnosticStats.value
  return [
    { name: 'Rolling Sharpe', val: `${m.rollingSharpe.toFixed(2)}` },
    { name: 'Rolling Sigma', val: `${m.stdDevPct.toFixed(2)}%` },
    { name: 'Rolling Drawdown', val: `${m.rollingDrawdown.toFixed(1)}%` },
    { name: 'Rolling Win Rate', val: `${m.rollingWinRate.toFixed(1)}%` },
    { name: 'Distribution Robustness', val: `${m.distributionRobustness.toFixed(1)}` },
    { name: 'Outlier Impact', val: `${m.outlierImpactRatio.toFixed(1)}%` },
    { name: 'Risk Coverage', val: `${stats.stopLossCoveragePct.toFixed(0)}% SL / ${stats.takeProfitCoveragePct.toFixed(0)}% TP` },
    { name: 'Heatmap Cells', val: `${robustnessReturnHeatmap.value.length}` }
  ]
})

const robustnessVisualizationStatus = computed(() => [
  { name: 'Histogram Overlay Selector', val: showRobustnessHistogram.value ? 'Real PnL histogram active' : 'Normal / t overlay available' },
  { name: 'QQ-Plot vs Normal', val: `${diagnosticStats.value.qqPoints.length} quantiles` },
  { name: 'Rolling Metrics', val: 'Sharpe, sigma, drawdown, win rate' },
  { name: 'Calendar Heatmap', val: 'Weekday / month return matrix' }
])

const robustnessReturnHeatmap = computed(() => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const currentTrades = getFilteredTrades()
  const cells = new Map<string, { month: string; weekday: string; pnl: number; count: number }>()
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  currentTrades.forEach(t => {
    const dRaw = t.dateExit || t.date
    const d = dRaw instanceof Date ? dRaw : new Date(dRaw)
    if (Number.isNaN(d.getTime())) return
    const pnlVal = t.profitInCurrency ?? t.result ?? (t as any).pnl ?? 0
    const raw = typeof pnlVal === 'string' ? parseFloat(pnlVal) : Number(pnlVal)
    const key = `${d.getMonth()}-${d.getDay()}`
    const existing = cells.get(key) || { month: monthNames[d.getMonth()] || 'N/A', weekday: weekdays[d.getDay()] || 'N/A', pnl: 0, count: 0 }
    existing.pnl += Number.isFinite(raw) ? raw : 0
    existing.count += 1
    cells.set(key, existing)
  })

  return Array.from(cells.values())
})

const robustnessExplanationSequence = computed(() => {
  const stats = diagnosticStats.value
  const normalBic = stats.normalParams?.bic ?? 0
  const tBic = stats.tParams?.bic ?? 0
  const modelReason = stats.preferredModel === "Student's t"
    ? `Student's t BIC (${tBic.toFixed(2)}) is lower than Normal BIC (${normalBic.toFixed(2)}), so tail risk deserves priority.`
    : `Normal BIC (${normalBic.toFixed(2)}) is competitive with Student's t BIC (${tBic.toFixed(2)}), so the profile is treated as calmer unless skew/kurtosis disagrees.`

  return [
    `1. Fit check: ${modelReason}`,
    `2. Curve domain: fitted PDFs span $${stats.curveDomain.min.toFixed(0)} to $${stats.curveDomain.max.toFixed(0)}, covering observed PnL from $${stats.minPnl.toFixed(0)} to $${stats.maxPnl.toFixed(0)}.`,
    `3. Dispersion check: standard deviation is $${stats.std.toFixed(2)}, so average trade expectations should be judged against this volatility band.`,
    `4. Shape check: skewness is ${stats.skewness >= 0 ? '+' : ''}${stats.skewness.toFixed(2)} and excess kurtosis is ${stats.kurtosis >= 0 ? '+' : ''}${stats.kurtosis.toFixed(2)}.`,
    `5. Risk check: stop-loss coverage is ${stats.stopLossCoveragePct.toFixed(0)}%, take-profit coverage is ${stats.takeProfitCoveragePct.toFixed(0)}%, and ${stats.unmanagedRiskCount} trades are unmanaged.`,
    `6. Verdict: ${robustnessExplanation.value.verdict}.`,
    `7. Action: ${robustnessExplanation.value.action}`
  ].join('\n')
})

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
    // --- DRAW 3D STRATEGY METRICS TELEMETRY --- //
    if (!themeStore.settings.isDark) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)'
      ctx.fillRect(0, 0, w, h)
    }
    const cols = 5
    const w_card = 84
    const h_card = 36
    const colGap = 12
    const rowGap = 12
    const startX = -192
    const startY = 0
    const isDark = themeStore.settings.isDark
    const mVals = strategyMetrics.value

    activeMetricsConfigs.value.forEach((cfg, i) => {
      const row = Math.floor(i / cols)
      const col = i % cols
      const cx = startX + col * (w_card + colGap)
      const cy = startY + (row - 2.5) * (h_card + rowGap)
      const cz = 0
      
      const p1 = { x: cx - w_card/2, y: cy - h_card/2, z: cz }
      const p2 = { x: cx + w_card/2, y: cy - h_card/2, z: cz }
      const p3 = { x: cx + w_card/2, y: cy + h_card/2, z: cz }
      const p4 = { x: cx - w_card/2, y: cy + h_card/2, z: cz }
      
      const t1 = transformPoint(p1, currentRotation.value.y, currentRotation.value.x, scale, w, h)
      const t2 = transformPoint(p2, currentRotation.value.y, currentRotation.value.x, scale, w, h)
      const t3 = transformPoint(p3, currentRotation.value.y, currentRotation.value.x, scale, w, h)
      const t4 = transformPoint(p4, currentRotation.value.y, currentRotation.value.x, scale, w, h)
      const tCenter = transformPoint({ x: cx, y: cy, z: cz }, currentRotation.value.y, currentRotation.value.x, scale, w, h)
      
      const focalLength = 1000
      const avgDepth = (t1.depth + t2.depth + t3.depth + t4.depth) / 4
      const depthAlpha = Math.min(1, Math.max(0.15, 1 - avgDepth / 1500))
      
      ctx.beginPath()
      ctx.moveTo(t1.x, t1.y)
      ctx.lineTo(t2.x, t2.y)
      ctx.lineTo(t3.x, t3.y)
      ctx.lineTo(t4.x, t4.y)
      ctx.closePath()

      if (isEditMode.value && draggingMetricIndex.value === i) {
        ctx.fillStyle = isDark ? `rgba(255, 255, 255, 0.03)` : `rgba(0, 0, 0, 0.03)`
        ctx.fill()
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 6])
        ctx.stroke()
        ctx.setLineDash([])
        return
      }
      
      const isHovered = hoveredMetricIndex.value === i
      const metricTone = getMetricToneColor(cfg, mVals)
      ctx.fillStyle = isHovered 
        ? (isDark ? `rgba(255, 255, 255, 0.12)` : `rgba(10, 10, 10, 0.9)`)
        : (isDark ? `rgba(15, 15, 15, ${0.75 * depthAlpha})` : `rgba(10, 10, 10, ${0.8 * depthAlpha})`)
      ctx.fill()
      
      if (isEditMode.value && dragTargetIndex.value === i && draggingMetricIndex.value !== null) {
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'
        ctx.lineWidth = 4
        ctx.setLineDash([8, 4])
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.shadowBlur = 0

      // Compute 3D-to-2D affine transformation basis vectors using local Jacobian at center for perfect text alignment
      const eps = 0.1
      const tDx = transformPoint({ x: cx + eps, y: cy, z: cz }, currentRotation.value.y, currentRotation.value.x, scale, w, h)
      const tDy = transformPoint({ x: cx, y: cy + eps, z: cz }, currentRotation.value.y, currentRotation.value.x, scale, w, h)

      const ux = (tDx.x - tCenter.x) / eps
      const uy = (tDx.y - tCenter.y) / eps
      const vx = (tDy.x - tCenter.x) / eps
      const vy = (tDy.y - tCenter.y) / eps

      // Apply transformation matrix with 0.1 scale factor for crisp high-res typography
      ctx.setTransform(ux * 0.1, uy * 0.1, vx * 0.1, vy * 0.1, tCenter.x, tCenter.y)

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.font = 'bold 45px monospace'
      ctx.fillText(cfg.label.replace('_', ' '), 0, -65)
      
      let valString = cfg.valStr(mVals)
      const numVal = Number((mVals as any)[cfg.key])
      const isRatioMetric = ['informationRatio', 'treynorRatio', 'tTest', 'sqn', 'calmarRatio', 'sterlingRatio', 'sortinoRatio', 'sharpeRatio', 'omegaRatio', 'marRatio', 'gainToPainRatio', 'tailRatio', 'commonSenseRatio', 'maeMfeRatio', 'zScore', 'profitFactor', 'payoffRatio', 'riskRewardRatio', 'realizedRR', 'winLossRatio'].includes(cfg.key)

      if (valString.includes('Infinity') || valString.includes('NaN') || (!isNaN(numVal) && isRatioMetric && Math.abs(numVal) > 999999)) {
        valString = numVal < 0 ? '-INFINITY' : 'INFINITY'
      }
      const cleanVal = valString.replace(/[\+\-\$\s\%Rxdhwm\|\(\)\/\,\:]/g, '')
      const isZero = cleanVal.length > 0 && cleanVal.split('').every(c => c === '0' || c === '.')
      ctx.fillStyle = isZero ? metricTonePalette.neutral : metricTone
      
      let baseFontSize = 6.5
      if (valString.length > 10) {
        baseFontSize = Math.max(4, 6.5 * (10 / valString.length))
      }
      ctx.font = `bold ${Math.round(baseFontSize * 10)}px monospace`
      ctx.fillText(valString, 0, 40)
      
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '30px monospace'
      ctx.fillText(cfg.sub, 0, 130)

      // Restore identity transform for the rest of the canvas rendering
      ctx.resetTransform()
    })

    // Draw the Add Metric "+" Card if in Edit Mode
    if (isEditMode.value) {
      const addIdx = activeMetricsConfigs.value.length
      const row = Math.floor(addIdx / cols)
      const col = addIdx % cols
      const cx = startX + col * (w_card + colGap)
      const cy = startY + (row - 2.5) * (h_card + rowGap)
      const cz = 0
      
      const p1 = { x: cx - w_card/2, y: cy - h_card/2, z: cz }
      const p2 = { x: cx + w_card/2, y: cy - h_card/2, z: cz }
      const p3 = { x: cx + w_card/2, y: cy + h_card/2, z: cz }
      const p4 = { x: cx - w_card/2, y: cy + h_card/2, z: cz }
      
      const t1 = transformPoint(p1, currentRotation.value.y, currentRotation.value.x, scale, w, h)
      const t2 = transformPoint(p2, currentRotation.value.y, currentRotation.value.x, scale, w, h)
      const t3 = transformPoint(p3, currentRotation.value.y, currentRotation.value.x, scale, w, h)
      const t4 = transformPoint(p4, currentRotation.value.y, currentRotation.value.x, scale, w, h)
      const tCenter = transformPoint({ x: cx, y: cy, z: cz }, currentRotation.value.y, currentRotation.value.x, scale, w, h)
      
      const focalLength = 1000
      const avgDepth = (t1.depth + t2.depth + t3.depth + t4.depth) / 4
      const depthAlpha = Math.min(1, Math.max(0.15, 1 - avgDepth / 1500))
      
      ctx.beginPath()
      ctx.moveTo(t1.x, t1.y)
      ctx.lineTo(t2.x, t2.y)
      ctx.lineTo(t3.x, t3.y)
      ctx.lineTo(t4.x, t4.y)
      ctx.closePath()
      
      const isHovered = hoveredMetricIndex.value === addIdx
      ctx.fillStyle = isHovered 
        ? (isDark ? `rgba(255, 255, 255, 0.12)` : `rgba(0, 0, 0, 0.08)`)
        : (isDark ? `rgba(15, 15, 15, ${0.75 * depthAlpha})` : `rgba(255, 255, 255, ${0.85 * depthAlpha})`)
      ctx.fill()
      
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])

      const ux = (t2.x - t1.x) / w_card
      const uy = (t2.y - t1.y) / w_card
      const vx = (t4.x - t1.x) / h_card
      const vy = (t4.y - t1.y) / h_card

      ctx.setTransform(ux * 0.1, uy * 0.1, vx * 0.1, vy * 0.1, tCenter.x, tCenter.y)

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'
      ctx.font = 'bold 120px monospace'
      ctx.fillText('+', 0, 0)
      ctx.resetTransform()
    }

    // Draw Floating Dragged Card
    if (isEditMode.value && draggingMetricIndex.value !== null && activeMetricsConfigs.value[draggingMetricIndex.value]) {
      const cfg = activeMetricsConfigs.value[draggingMetricIndex.value]!
      const mx = currentMouseCanvasPos.value.x
      const my = currentMouseCanvasPos.value.y
      const focalLength = 1000
      const screenScale = viewScale.value * (focalLength / (focalLength + 0))
      const sw = w_card * screenScale
      const sh = h_card * screenScale

      ctx.beginPath()
      ctx.rect(mx - sw/2, my - sh/2, sw, sh)
      ctx.fillStyle = isDark ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)'
      ctx.shadowColor = 'rgba(0,0,0,0.4)'
      ctx.shadowBlur = 25
      ctx.shadowOffsetY = 12
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0

      const metricTone = getMetricToneColor(cfg, mVals)
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.setTransform(screenScale * 0.1, 0, 0, screenScale * 0.1, mx, my)

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
      ctx.font = '35px monospace'
      ctx.fillText(cfg.label.replace('_', ' '), 0, -60)
      
      let valString = cfg.valStr(mVals)
      const numVal = Number((mVals as any)[cfg.key])
      const isRatioMetric = ['informationRatio', 'treynorRatio', 'tTest', 'sqn', 'calmarRatio', 'sterlingRatio', 'sortinoRatio', 'sharpeRatio', 'omegaRatio', 'marRatio', 'gainToPainRatio', 'tailRatio', 'commonSenseRatio', 'maeMfeRatio', 'zScore', 'profitFactor', 'payoffRatio', 'riskRewardRatio', 'realizedRR', 'winLossRatio'].includes(cfg.key)

      if (valString.includes('Infinity') || valString.includes('NaN') || (!isNaN(numVal) && isRatioMetric && Math.abs(numVal) > 999999)) {
        valString = numVal < 0 ? '-INFINITY' : 'INFINITY'
      }
      const cleanVal = valString.replace(/[\+\-\$\s\%Rxdhwm\|\(\)\/\,\:]/g, '')
      const isZero = cleanVal.length > 0 && cleanVal.split('').every(c => c === '0' || c === '.')
      ctx.fillStyle = isZero ? metricTonePalette.neutral : metricTone
      
      let baseFontSize = 6.5
      if (valString.length > 10) {
        baseFontSize = Math.max(4, 6.5 * (10 / valString.length))
      }
      ctx.font = `bold ${Math.round(baseFontSize * 10)}px monospace`
      ctx.fillText(valString, 0, 40)
      
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
      ctx.font = '30px monospace'
      ctx.fillText(cfg.sub, 0, 130)

      ctx.resetTransform()
    }

    // --- SET HOVERED METRIC POS FOR DOM TOOLTIP --- //
    if (hoveredMetricIndex.value !== null && activeMetricsConfigs.value[hoveredMetricIndex.value]) {
      const row = Math.floor(hoveredMetricIndex.value / cols)
      const col = hoveredMetricIndex.value % cols
      const cx = startX + col * (w_card + colGap)
      const cy = startY + (row - 2.5) * (h_card + rowGap)
      const tCenter = transformPoint({ x: cx, y: cy, z: 0 }, currentRotation.value.y, currentRotation.value.x, scale, w, h)
      
      const canvasRect = canvasRef.value?.getBoundingClientRect()
      if (canvasRect) {
         hoveredMetricScreenPos.value = { x: tCenter.x + canvasRect.left, y: tCenter.y + canvasRect.top }
      } else {
         hoveredMetricScreenPos.value = { x: tCenter.x, y: tCenter.y }
      }
    } else {
      hoveredMetricScreenPos.value = null
    }
  }

  rafId = requestAnimationFrame(update)
}

const handleMouseDown = (e: MouseEvent) => {
  const canvas = canvasRef.value; if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  currentMouseCanvasPos.value = { x, y }

  if (activeMetricDropdown.value) {
    activeMetricDropdown.value = null
  }

  if (showMetricsPanel.value && hoveredMetricIndex.value !== null) {
    if (isEditMode.value) {
      if (hoveredMetricIndex.value === activeMetricsConfigs.value.length) {
        showAddModal.value = true
        isPanning.value = false
        return
      } else {
        draggingMetricIndex.value = hoveredMetricIndex.value
        dragTargetIndex.value = hoveredMetricIndex.value
        isPanning.value = false
        return
      }
    } else {
      const cfg = activeMetricsConfigs.value[hoveredMetricIndex.value]
      if (cfg) {
        activeMetricDropdown.value = {
          metricKey: cfg.key,
          x: e.clientX,
          y: e.clientY
        }
        isPanning.value = false
        return
      }
    }
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
      hoveredMetricIndex.value = null
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
      hoveredMetricIndex.value = null
    }
  } else {
    hoveredDistributionTooltip.value = null
    if (isEditMode.value && draggingMetricIndex.value !== null) {
      isHoveringTrash.value = x > rect.width - 160 && y > rect.height - 160;
    }

    let hoveredMetric: number | null = null
    const cols = 5
    const w_card = 84
    const h_card = 36
    const colGap = 12
    const rowGap = 12
    const startX = -192
    const startY = 0
    const totalCards = isEditMode.value ? activeMetricsConfigs.value.length + 1 : activeMetricsConfigs.value.length;
    for (let i = 0; i < totalCards; i++) {
      const row = Math.floor(i / cols)
      const col = i % cols
      const cx = startX + col * (w_card + colGap)
      const cy = startY + (row - 2.5) * (h_card + rowGap)
      const tCenter = transformPoint({ x: cx, y: cy, z: 0 }, currentRotation.value.y, currentRotation.value.x, viewScale.value, canvas.width, canvas.height)
      const focalLength = 1000
      const screenScale = viewScale.value * (focalLength / (focalLength + tCenter.depth))
      
      if (Math.abs(x - tCenter.x) < (w_card * screenScale) / 2 && Math.abs(y - tCenter.y) < (h_card * screenScale) / 2) {
        hoveredMetric = i
      }
    }
    hoveredMetricIndex.value = hoveredMetric
    hoveredCurveIndex.value = null

    if (draggingMetricIndex.value !== null && hoveredMetric !== null && hoveredMetric < activeMetricsConfigs.value.length) {
      dragTargetIndex.value = hoveredMetric
    }
  }
}

const handleMouseUp = () => { 
  if (draggingMetricIndex.value !== null) {
    if (isHoveringTrash.value) {
      activeMetricKeys.value.splice(draggingMetricIndex.value, 1)
      saveMetricsLayout()
      draggingMetricIndex.value = null
      dragTargetIndex.value = null
      isHoveringTrash.value = false
      isPanning.value = false
      return
    }
    if (dragTargetIndex.value !== null && dragTargetIndex.value !== draggingMetricIndex.value) {
      const movedKey = activeMetricKeys.value.splice(draggingMetricIndex.value, 1)[0]!
      activeMetricKeys.value.splice(dragTargetIndex.value, 0, movedKey)
      saveMetricsLayout()
    }
    draggingMetricIndex.value = null
    dragTargetIndex.value = null
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
    console.log('[ExEquityCurve] S&P 500 Benchmark Yield:', sp500BenchmarkRate.value + '%')
    await loadBenchmarkMetricsCache()
    await tradeStore.init()
    await loadMatrixData()

    const loadedKeys = await loadFromDisk<string[]>('custom_metrics_layout_v1')
    if (loadedKeys && Array.isArray(loadedKeys) && loadedKeys.length > 0) {
      activeMetricKeys.value = loadedKeys
    }

    await fetchRealtimeMetrics(getBenchmarkStrategyIds())
    initData()
  }

  void hydrateData().catch(err => {
    console.error('[ExEquityCurve3D] Failed to hydrate deferred data:', err)
  })
})

// --- CALENDAR DAY BLOCKS LOGIC ---

interface CalendarDay {
  dateStr: string
  dayNum: number
  pnl: number
  pnlPercent: number
  tradesCount: number
  isToday: boolean
  isInMonth: boolean
}

// Group all trades by YYYY-MM
const calendarMonthsList = computed(() => {
  const months = new Set<string>()
  const currentTrades = getFilteredTrades()
  currentTrades.forEach(trade => {
    const dVal = trade.dateExit || trade.date
    const date = dVal instanceof Date ? dVal : new Date(dVal)
    const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    months.add(ym)
  })
  const sorted = Array.from(months).sort()
  return sorted
})

watch(calendarMonthsList, (newList) => {
  if (newList.length > 0 && !currentCalendarMonthStr.value) {
    currentCalendarMonthStr.value = newList[newList.length - 1]!
  } else if (newList.length === 0) {
    currentCalendarMonthStr.value = ''
  }
}, { immediate: true })

const currentCalendarMonthIndex = computed(() => {
  return calendarMonthsList.value.indexOf(currentCalendarMonthStr.value)
})

const nextCalendarMonth = () => {
  const idx = currentCalendarMonthIndex.value
  if (idx < calendarMonthsList.value.length - 1) {
    currentCalendarMonthStr.value = calendarMonthsList.value[idx + 1]!
  }
}

const prevCalendarMonth = () => {
  const idx = currentCalendarMonthIndex.value
  if (idx > 0) {
    currentCalendarMonthStr.value = calendarMonthsList.value[idx - 1]!
  }
}

const currentCalendarMonthName = computed(() => {
  if (!currentCalendarMonthStr.value) {
    return locale.value === 'ru' ? 'НЕТ ДАННЫХ' : 'NO DATA'
  }
  const [y, m] = currentCalendarMonthStr.value.split('-')
  const date = new Date(parseInt(y!), parseInt(m!) - 1, 1)
  const loc = locale.value === 'ru' ? 'ru-RU' : 'en-US'
  return date.toLocaleString(loc, { month: 'long', year: 'numeric' })
})

const calendarDaysOfWeek = computed(() => {
  return locale.value === 'ru' 
    ? ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']
    : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
})

function formatCalendarDayValue(day: CalendarDay) {
  const sign = day.pnl > 0 ? '+' : ''
  if (calendarValueMode.value === 'currency') {
    return `${sign}${day.pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`
  }
  return `${sign}${day.pnlPercent.toFixed(2)}%`
}

function setCalendarDayTooltip(event: MouseEvent, day: CalendarDay) {
  if (!day.isInMonth || day.tradesCount <= 0) {
    hoveredCalendarDayTooltip.value = null
    return
  }
  hoveredCalendarDayTooltip.value = {
    x: event.clientX + 16,
    y: event.clientY + 16,
    value: formatCalendarDayValue(day),
    date: day.dateStr,
    pnl: day.pnl
  }
}

function showCalendarDayTooltip(event: MouseEvent, day: CalendarDay) {
  setCalendarDayTooltip(event, day)
}

function moveCalendarDayTooltip(event: MouseEvent, day: CalendarDay) {
  setCalendarDayTooltip(event, day)
}

function hideCalendarDayTooltip() {
  hoveredCalendarDayTooltip.value = null
}

const calendarDays = computed(() => {
  if (!currentCalendarMonthStr.value) return []
  const [y, m] = currentCalendarMonthStr.value.split('-')
  const year = parseInt(y!)
  const month = parseInt(m!) - 1
  
  // Get trades for this month
  const currentTrades = getFilteredTrades()
  const tradesForMonth = currentTrades.filter(trade => {
    const dVal = trade.dateExit || trade.date
    const date = dVal instanceof Date ? dVal : new Date(dVal)
    return date.getFullYear() === year && date.getMonth() === month
  })
  
  // Map day -> stats
  const dayStats = new Map<number, { pnl: number, count: number }>()
  tradesForMonth.forEach(trade => {
    const dVal = trade.dateExit || trade.date
    const date = dVal instanceof Date ? dVal : new Date(dVal)
    const day = date.getDate()
    
    if (!dayStats.has(day)) {
      dayStats.set(day, { pnl: 0, count: 0 })
    }
    const stat = dayStats.get(day)!
    stat.pnl += (trade.profitInCurrency || 0)
    stat.count++
  })

  // Build grid
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay() // 0 = Sunday
  
  const days: CalendarDay[] = []
  
  // Pad beginning
  const startPad = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 // Make Monday = 0
  for (let i = 0; i < startPad; i++) {
    days.push({ dateStr: '', dayNum: 0, pnl: 0, pnlPercent: 0, tradesCount: 0, isToday: false, isInMonth: false })
  }
  
  const today = new Date()
  const initialDeposit = props.initialBalance || tradeStore.getInitialDeposit(selectedStrategyId.value) || 10000
  
  for (let i = 1; i <= daysInMonth; i++) {
    const stat = dayStats.get(i)
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === i
    const pnl = stat ? stat.pnl : 0
    days.push({
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      dayNum: i,
      pnl,
      pnlPercent: (pnl / initialDeposit) * 100,
      tradesCount: stat ? stat.count : 0,
      isToday,
      isInMonth: true
    })
  }
  
  return days
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
