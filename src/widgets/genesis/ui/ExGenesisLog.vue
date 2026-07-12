<template>
  <div class="diary-3d-hub h-full w-full relative overflow-hidden bg-transparent nier-text-primary" ref="container">
    
    

    <div v-show="!showNodeMap" class="contents">

      <!-- CANVAS LAYER (Shared) -->
      <canvas v-show="viewType === 'cube'"
              ref="canvasRef"
              class="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-30 transition-all duration-300"
              :class="showCapitalForecast ? 'blur-sm brightness-75 saturate-75 scale-[1.01]' : ''"
              @mousedown="handleMouseDown"
              @mousemove="handleMouseMove"
              @mouseup="handleMouseUp"
              @mouseleave="handleMouseUp"
              @dblclick="handleDoubleClick"
              @wheel="handleWheel">
      </canvas>

      <!-- CUBE LAYER (UI ONLY) -->
      <div
        v-if="viewType === 'cube'"
        class="w-full h-full absolute inset-0 transition-all duration-300 pointer-events-none opacity-100 z-40"
      >
        
        <!-- TOP CONTROLS (HUD & COMPLIANCE) -->
        <div class="absolute top-8 left-6 flex flex-row space-x-3 pointer-events-auto transition-all duration-500 z-[10020]"
             :class="!isHudVisible ? 'opacity-0 hover:opacity-100' : 'opacity-100'">
           
           <!-- HUD Toggle -->
           <button @click="isHudVisible = !isHudVisible" 
                   class="w-8 h-8 flex items-center justify-center transition-all bg-white/5 dark:bg-black/5 backdrop-blur-md hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                   :class="isHudVisible ? 'nier-text-primary' : 'text-black/40 dark:text-white/40'"
                   title="Toggle HUD">
              <svg v-if="isHudVisible" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                 <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                 <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <svg v-else class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                 <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                 <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
           </button>

           <!-- Cube Reveal Animation -->
           <button @click="toggleCubeRevealAnimation"
                   class="relative w-8 h-8 flex items-center justify-center transition-all backdrop-blur-md cursor-pointer"
                   :class="isCubeRevealAnimating
                            ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                            : 'bg-white/5 dark:bg-black/5 text-black/40 dark:text-white/40 hover:bg-black/10 dark:hover:bg-white/10'"
                   :title="locale === 'ru' ? 'Запустить анимацию сделок' : 'Run trade reveal animation'">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                 <path d="M5 5v14l12-7z"></path>
                 <path d="M19 5v14"></path>
              </svg>
              <div v-if="isCubeRevealAnimating"
                   class="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]">
              </div>
           </button>

           <!-- Compliance Toggle -->
           <button @click="showComplianceStatus = !showComplianceStatus" 
                   class="relative w-8 h-8 flex items-center justify-center transition-all backdrop-blur-md cursor-pointer"
                   :class="showComplianceStatus 
                            ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                            : 'bg-white/5 dark:bg-black/5 text-black/40 dark:text-white/40 hover:bg-black/10 dark:hover:bg-white/10'"
                   title="Toggle Compliance Status">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                 <rect x="18" y="3" width="4" height="18"></rect>
                 <rect x="10" y="8" width="4" height="13"></rect>
                 <rect x="2" y="13" width="4" height="8"></rect>
              </svg>
              <!-- Indicator Dot -->
              <div v-if="complianceDotColor" 
                   class="absolute -top-1 -right-1 w-2 h-2 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.5)]"
                   :class="complianceDotColor">
              </div>
           </button>

           <button @click="toggleCapitalForecast()" 
                   class="relative w-8 h-8 flex items-center justify-center transition-all backdrop-blur-md cursor-pointer"
                   :class="showCapitalForecast
                            ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                            : canOpenCapitalForecast
                              ? 'bg-white/5 dark:bg-black/5 text-black/40 dark:text-white/40 hover:bg-black/10 dark:hover:bg-white/10'
                              : 'bg-white/5 dark:bg-black/5 text-black/20 dark:text-white/20 hover:bg-black/10 dark:hover:bg-white/10 ring-1 ring-dashed ring-black/10 dark:ring-white/10'"
                   :title="canOpenCapitalForecast
                      ? 'Toggle Capital Forecast'
                      : (locale === 'ru' ? 'Нужен премиум-доступ' : 'Premium access required')">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                 <path d="M3 17l5-5 4 4 8-9"></path>
                 <path d="M17 7h3v3"></path>
              </svg>
              <div v-if="patternForecastLoading"
                   class="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.55)]">
              </div>
           </button>
        </div>
        <!-- Cube Search Query Overlay -->
        <Transition name="fade">
          <div v-if="showCubeSearchText && cubeSearchQuery && isHudVisible" class="absolute inset-0 flex items-center justify-center pointer-events-none z-[50]">
            <span class="text-[15vw] font-bold text-white opacity-30 tracking-widest uppercase font-mono break-all text-center px-12 leading-none" style="text-shadow: 0 0 40px rgba(255,255,255,0.2);">
              {{ cubeSearchQuery }}
            </span>
          </div>
        </Transition>
      </div>

      <div
        v-if="viewType === 'list' || viewType === 'timeTree'"
        class="absolute inset-0 z-40 flex flex-col overflow-hidden theme-surface backdrop-blur-3xl pointer-events-auto transition-all duration-300"
        :class="[
          showCapitalForecast ? 'blur-sm brightness-75 saturate-75 scale-[1.01]' : '',
          isTimeTreeFullscreen ? '!fixed !inset-0 !z-[10080]' : ''
        ]"
      >
        <div class="absolute inset-0 theme-grid opacity-30 pointer-events-none"></div>
        <Transition name="time-tree-fullscreen-hint">
          <div
            v-if="isTimeTreeFullscreen && showTimeTreeFullscreenHint"
            class="pointer-events-none fixed left-1/2 top-8 z-[10090] w-[min(960px,calc(100vw-48px))] -translate-x-1/2 text-center font-serif text-sm font-normal tracking-[0.18em] text-black/70 dark:text-white/70 md:text-base"
          >
            {{ locale === 'ru' ? 'Чтобы выйти из полноэкранного режима TimeTree, нажмите ESC' : 'Press ESC to exit fullscreen TimeTree mode' }}
          </div>
        </Transition>
        <div
          class="relative z-10 flex h-full w-full flex-col"
          :class="isTimeTreeFullscreen ? 'px-6 py-10 md:px-10 md:py-12' : 'px-8 py-14 md:px-16 md:py-20'"
        >
          <div v-if="!isTimeTreeFullscreen" class="mb-5 shrink-0">
            <ExVerticalTradeList
              :trades="currentTradesForList"
              :filters-only="true"
              :view-mode="viewType === 'list' ? 'list' : 'timeTree'"
              :result-display-mode="listResultDisplayMode"
              :color-mode="listColorMode"
              :show-fullscreen-toggle="viewType === 'timeTree'"
              :time-tree-fullscreen-active="isTimeTreeFullscreen"
              @list-view-mode-change="setListViewMode"
              @display-settings-change="handleListDisplaySettingsChange"
              @filtered-trades-change="handleTimeTreeFilteredTrades"
              @toggle-time-tree-fullscreen="enterTimeTreeFullscreen"
            />
          </div>

          <Transition name="page-reify" mode="out-in">
            <div
              v-if="viewType === 'list'"
              key="vertical-list-content"
              class="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8"
            >
              <ExVerticalTradeList
                :trades="timeTreeSourceTrades"
                :hide-filters="true"
                view-mode="list"
                :result-display-mode="listResultDisplayMode"
                :color-mode="listColorMode"
                @display-settings-change="handleListDisplaySettingsChange"
                @open-note="handleOpenNote"
                @open-trade="handleOpenTrade"
              />
            </div>

            <div
              v-else
              key="time-tree-content"
              class="relative min-h-0 flex-1 overflow-y-auto custom-scrollbar"
              :class="isTimeTreeFullscreen ? 'time-tree-scroll--fullscreen' : ''"
            >
              <div v-if="timeTreeGroups.length" class="relative mx-auto w-full max-w-7xl pb-24 pt-2">
                <div class="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-black/15 dark:bg-white/15"></div>

                <div
                  v-for="(group, index) in timeTreeGroups"
                  :key="group.key"
                  class="relative grid grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] items-start gap-y-5 py-4"
                >
                  <div
                    class="relative min-w-0"
                    :class="group.side === 'left' ? 'col-start-1 pr-6' : 'col-start-3 pl-6'"
                  >
                    <div
                      class="flex flex-col gap-1.5"
                      :class="group.side === 'left' ? 'items-end text-right' : 'items-start text-left'"
                    >
                      <div class="mb-0.5 font-mono uppercase tracking-[0.22em]">
                        <div class="text-[8px] opacity-45">{{ group.weekday }}</div>
                        <div class="relative mt-0.5 text-[10px] font-black nier-text-primary">
                          <div
                            class="absolute top-1/2 h-px -translate-y-1/2 bg-black/20 dark:bg-white/20"
                            :class="group.side === 'left' ? 'right-[-32px] w-6' : 'left-[-32px] w-6'"
                          ></div>
                          {{ group.label }}
                        </div>
                      </div>

                      <button
                        v-for="trade in group.trades"
                        :key="trade.id"
                        class="group/tree-trade w-full max-w-[340px] border nier-border-primary bg-white/60 px-3 py-2 text-left font-mono uppercase backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-black/35 hover:bg-white/90 dark:bg-black/45 dark:hover:border-white/35 dark:hover:bg-black/70"
                        :class="group.side === 'left' ? 'text-right' : 'text-left'"
                        @click="handleOpenTrade({ tradeId: trade.id })"
                      >
                        <div
                          class="flex min-w-0 items-center justify-between gap-4"
                          :class="group.side === 'left' ? 'flex-row-reverse' : ''"
                        >
                          <div
                            class="flex min-w-0 items-center gap-2"
                            :class="group.side === 'left' ? 'flex-row-reverse text-right' : 'text-left'"
                          >
                            <span class="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden border border-black/10 bg-white/80 p-0.5 dark:border-white/10 dark:bg-black/70">
                              <img
                                v-if="trade.assetIcon"
                                :src="trade.assetIcon"
                                class="h-full w-full object-contain"
                                alt=""
                                @error="hideBrokenAssetIcon"
                              />
                            </span>
                            <span class="min-w-0">
                              <span class="block truncate text-xs font-black tracking-[0.16em] nier-text-primary">{{ trade.asset }}</span>
                              <span class="mt-1 block text-[9px] tracking-[0.22em] opacity-45">{{ trade.time }}</span>
                            </span>
                            <span
                              class="shrink-0 border px-1.5 py-0.5 text-[7px] font-black tracking-[0.18em]"
                              :class="trade.side === 'SHORT'
                                ? 'border-rose-500/30 text-rose-500'
                                : 'border-emerald-500/30 text-emerald-500'"
                            >
                              {{ trade.side }}
                            </span>
                          </div>
                          <div
                            class="shrink-0 text-base font-black leading-none tracking-[0.12em]"
                          :style="{ color: trade.resultColor }"
                          :class="group.side === 'left' ? 'text-left' : 'text-right'"
                        >
                            {{ trade.resultLabel }}
                        </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div class="col-start-2 row-start-1 flex justify-center pt-3">
                    <div class="relative flex h-8 w-8 items-center justify-center border nier-border-primary bg-white/85 font-mono text-[10px] font-black backdrop-blur-xl dark:bg-black/75">
                      <div class="absolute h-1.5 w-1.5 rotate-45 nier-bg-inverted"></div>
                      <span class="relative z-10 opacity-0">{{ index + 1 }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="flex h-full items-center justify-center">
                <div class="border border-dashed border-black/20 px-8 py-6 text-center font-mono text-[10px] uppercase tracking-[0.35em] opacity-40 dark:border-white/20">
                  {{ locale === 'ru' ? 'НЕТ_СДЕЛОК_ДЛЯ_ДЕРЕВА' : 'NO_TRADES_FOR_TREE' }}
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- PNL DISTRIBUTION LAYER -->
      <div
        v-if="viewType === 'distribution'"
        class="absolute inset-0 z-40 flex flex-col overflow-hidden theme-surface backdrop-blur-3xl pointer-events-auto transition-all duration-300"
        :class="showCapitalForecast ? 'blur-sm brightness-75 saturate-75 scale-[1.01]' : ''"
      >
        <div class="absolute inset-0 theme-grid opacity-30 pointer-events-none"></div>
        <div class="relative z-10 flex h-full w-full flex-col py-20 md:py-28">
          <div class="mx-10 mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-black/10 pb-5 dark:border-white/10 md:mx-20">
            <div class="flex flex-col gap-2">
              <span class="text-[9px] font-mono uppercase tracking-[0.45em] opacity-40">
                {{ distributionMetricMode === 'pnl' ? (locale === 'ru' ? 'РАСПРЕДЕЛЕНИЕ_СДЕЛОК' : 'TRADE_DISTRIBUTION') : (locale === 'ru' ? 'РАСПРЕДЕЛЕНИЕ_SCORE' : 'SCORE_DISTRIBUTION') }}
              </span>
              <span class="text-xs font-mono uppercase tracking-[0.25em] opacity-70">
                {{ distributionMetricMode === 'pnl' ? (locale === 'ru' ? 'ОТ МАКСИМАЛЬНОГО УБЫТКА К МАКСИМАЛЬНОЙ ПРИБЫЛИ' : 'MAX LOSS TO MAX PROFIT') : (locale === 'ru' ? 'ОТ МАКСИМАЛЬНОГО SCORE К МИНИМАЛЬНОМУ' : 'MAX SCORE TO MIN SCORE') }}
              </span>
            </div>
            <div class="flex flex-wrap items-end justify-end gap-6">
              <div class="grid grid-cols-3 gap-5 text-right font-mono uppercase">
                <div>
                  <div class="text-[8px] tracking-[0.3em]" :class="distributionMetricMode === 'pnl' ? 'text-rose-500/70' : 'text-white/70'">{{ distributionMetricMode === 'pnl' ? (locale === 'ru' ? 'УБЫТОК' : 'LOSS') : (locale === 'ru' ? 'МАКС' : 'MAX') }}</div>
                  <div class="mt-1 text-sm font-black" :class="distributionMetricMode === 'pnl' ? 'text-rose-500' : 'nier-text-primary'">{{ formatDistributionValue(distributionMetricMode === 'pnl' ? tradeDistributionStats.min : tradeDistributionStats.max) }}</div>
                </div>
                <div>
                  <div class="text-[8px] tracking-[0.3em] opacity-40">{{ locale === 'ru' ? 'СДЕЛКИ' : 'TRADES' }}</div>
                  <div class="mt-1 text-sm font-black nier-text-primary">{{ tradeDistributionStats.count }}</div>
                </div>
                <div>
                  <div class="text-[8px] tracking-[0.3em]" :class="distributionMetricMode === 'pnl' ? 'text-white/70' : 'text-rose-500/70'">{{ distributionMetricMode === 'pnl' ? (locale === 'ru' ? 'ПРИБЫЛЬ' : 'PROFIT') : (locale === 'ru' ? 'МИН' : 'MIN') }}</div>
                  <div class="mt-1 text-sm font-black" :class="distributionMetricMode === 'pnl' ? 'nier-text-primary' : 'nier-text-primary'">{{ formatDistributionValue(distributionMetricMode === 'pnl' ? tradeDistributionStats.max : tradeDistributionStats.min) }}</div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="tradeDistributionBars.length" class="relative min-h-0 flex-1">
            <canvas
              ref="distributionCanvasRef"
              class="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing"
              @mousedown.stop="handleDistributionMouseDown"
              @mousemove.stop="handleDistributionMouseMove"
              @mouseup.stop="handleDistributionMouseUp"
              @mouseleave.stop="handleDistributionMouseLeave"
              @wheel.stop="handleDistributionWheel"
            ></canvas>
            <div
              v-if="hoveredDistributionBar"
              class="pointer-events-none absolute z-20 max-w-[220px] border border-black/10 bg-white px-3 py-2 text-left font-mono text-[9px] uppercase tracking-[0.18em] text-black shadow-xl dark:border-white/10 dark:bg-black dark:text-white"
              :style="distributionTooltipStyle"
            >
              <div class="truncate font-black">{{ hoveredDistributionBar.asset }}</div>
              <div class="mt-1" :class="distributionMetricMode === 'score' ? 'nier-text-primary' : (hoveredDistributionBar.value < 0 ? 'text-rose-500' : 'nier-text-primary')">
                {{ formatDistributionValue(hoveredDistributionBar.value, distributionMetricMode === 'score') }}
              </div>
            </div>
          </div>

          <div v-else class="flex flex-1 items-center justify-center">
            <div class="border border-dashed border-black/20 px-8 py-6 text-center font-mono text-[10px] uppercase tracking-[0.35em] opacity-40 dark:border-white/20">
              {{ locale === 'ru' ? 'НЕТ_СДЕЛОК_ДЛЯ_ГРАФИКА' : 'NO_TRADES_FOR_CHART' }}
            </div>
          </div>
        </div>
      </div>

      <!-- BOTTOM LEFT: VIEW TOGGLE -->
      <div
        v-if="isHudVisible && !isTradeEntryOpen && !isTimeTreeFullscreen"
        class="absolute bottom-12 left-12 z-[10000] flex flex-col space-y-3 pointer-events-auto transition-all duration-300"
        :class="showCapitalForecast ? 'blur-sm brightness-75 saturate-75' : ''"
      >
         <div class="relative flex items-center gap-2 border nier-border-primary bg-white/5 p-1.5 backdrop-blur-xl dark:bg-black/5">
            <!-- Brackets -->
            <div class="absolute -top-px -left-px w-1.5 h-1.5 border-t border-l border-black/40 dark:border-white/40"></div>
            <div class="absolute -bottom-px -right-px w-1.5 h-1.5 border-b border-r border-black/40 dark:border-white/40"></div>

            <button @click="viewType = 'cube'" 
                    class="group relative flex h-12 w-12 items-center justify-center overflow-hidden p-0 transition-all duration-500"
                    :class="viewType === 'cube' ? 'nier-bg-inverted shadow-[0_0_20px_rgba(0,0,0,0.1)]' : 'hover:bg-black/5 dark:hover:bg-white/5'">
               <div class="relative flex h-4 w-4 shrink-0 items-center justify-center border-2 transition-all duration-700"
                    :class="viewType === 'cube' ? 'border-white dark:border-black rotate-[135deg] scale-110' : 'border-black/40 dark:border-white/40 group-hover:border-black dark:group-hover:border-white group-hover:rotate-45'">
                  <div class="w-1 h-1 bg-current rotate-45"></div>
               </div>
               <div v-if="viewType === 'cube'" class="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 nier-bg-inverted opacity-50"></div>
            </button>

            <button @click="viewType = 'timeTree'"
                    class="group relative flex h-12 w-12 items-center justify-center overflow-hidden p-0 transition-all duration-500"
                    :class="viewType === 'list' || viewType === 'timeTree' ? 'nier-bg-inverted shadow-[0_0_20px_rgba(0,0,0,0.1)]' : 'hover:bg-black/5 dark:hover:bg-white/5'">
               <div class="flex shrink-0 flex-col items-center space-y-1.5 transition-all duration-700"
                    :class="viewType === 'list' || viewType === 'timeTree' ? 'nier-text-primary scale-110' : 'text-black/40 dark:text-white/40 group-hover:text-black dark:group-hover:text-white group-hover:translate-y-[-1px]'">
                  <div class="w-5 h-[1.5px] bg-current"></div>
                  <div class="w-5 h-[1.5px] bg-current opacity-60"></div>
                  <div class="w-5 h-[1.5px] bg-current opacity-30"></div>
               </div>
               <div v-if="viewType === 'list' || viewType === 'timeTree'" class="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 nier-bg-inverted opacity-50"></div>
            </button>

            <button @click="viewType = 'distribution'"
                    class="group relative flex h-12 w-12 items-center justify-center overflow-hidden p-0 transition-all duration-500"
                    :class="viewType === 'distribution' ? 'nier-bg-inverted shadow-[0_0_20px_rgba(0,0,0,0.1)]' : 'hover:bg-black/5 dark:hover:bg-white/5'">
               <svg class="h-5 w-5 shrink-0 transition-all duration-700"
                    :class="viewType === 'distribution' ? 'nier-text-primary scale-110' : 'text-black/40 dark:text-white/40 group-hover:text-black dark:group-hover:text-white group-hover:translate-y-[-1px]'"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linecap="round"
                    stroke-linejoin="round">
                  <path d="M4 19h16"></path>
                  <path d="M6 16V9"></path>
                  <path d="M10 16V5"></path>
                  <path d="M14 16v-3"></path>
                  <path d="M18 16V7"></path>
               </svg>
               <div v-if="viewType === 'distribution'" class="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 nier-bg-inverted opacity-50"></div>
            </button>
         </div>
      </div>

      <!-- BOTTOM RIGHT: DISTRIBUTION METRIC MODE -->
      <div
        v-if="isHudVisible && !isTradeEntryOpen && viewType === 'distribution'"
        class="absolute bottom-12 right-12 z-[10000] pointer-events-auto transition-all duration-300"
        :class="showCapitalForecast ? 'blur-sm brightness-75 saturate-75' : ''"
      >
        <div class="relative flex items-center gap-2 border nier-border-primary bg-white/5 p-1.5 font-mono text-[9px] uppercase tracking-[0.24em] backdrop-blur-xl dark:bg-black/5">
          <div class="absolute -top-px -left-px h-1.5 w-1.5 border-l border-t border-black/40 dark:border-white/40"></div>
          <div class="absolute -bottom-px -right-px h-1.5 w-1.5 border-b border-r border-black/40 dark:border-white/40"></div>
          <button
            aria-label="PnL"
            class="flex h-12 w-12 items-center justify-center p-0 transition-all duration-500"
            :class="distributionMetricMode === 'pnl' ? 'nier-bg-inverted nier-text-inverted shadow-[0_0_20px_rgba(0,0,0,0.1)]' : 'opacity-45 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/5'"
            @click="distributionMetricMode = 'pnl'"
          >
            <svg
              class="h-5 w-5 shrink-0 transition-transform duration-500"
              :class="distributionMetricMode === 'pnl' ? 'scale-110' : ''"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M4 19h16"></path>
              <path d="M6 16l3.5-5 3.5 3 5-8"></path>
              <path d="M18 6h-4"></path>
              <path d="M18 6v4"></path>
            </svg>
          </button>
          <button
            :disabled="isMainDiaryStrategy"
            aria-label="Score"
            class="flex h-12 w-12 items-center justify-center p-0 transition-all duration-500"
            :class="isMainDiaryStrategy
              ? 'cursor-not-allowed opacity-20'
              : (distributionMetricMode === 'score' ? 'nier-bg-inverted nier-text-inverted shadow-[0_0_20px_rgba(0,0,0,0.1)]' : 'opacity-45 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/5')"
            @click="distributionMetricMode = 'score'"
          >
            <svg
              class="h-5 w-5 shrink-0 transition-transform duration-500"
              :class="distributionMetricMode === 'score' ? 'scale-110' : ''"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="8"></circle>
              <path d="M8.5 15.5l7-7"></path>
              <circle cx="9" cy="9" r="1"></circle>
              <circle cx="15" cy="15" r="1"></circle>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- TACTICAL PROTOCOL INSIGHT (FIXED RIGHT - ARCHIVE) -->
    <Teleport to="body">
       <Transition name="panel-slide" mode="out-in">
          <div v-if="selectedTrade && !showExtraDetails && !showNodeMap && !isTradeEntryOpen && !isTimeTreeFullscreen" 
               key="trade-archive-insight"
               class="fixed right-12 top-1/2 -translate-y-1/2 w-[440px] z-[10005] transition-colors duration-500 shadow-[16px_16px_0_0_rgba(0,0,0,0.25)] dark:shadow-[16px_16px_0_0_rgba(0,0,0,0.5)]">
             
             <!-- CLOSE HANDLE (LEFT EDGE) -->
             <button @click="selectedTradeId = null"
                     class="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-40 bg-theme-bg dark:bg-[#070707] border-t border-l border-b border-black/20 dark:border-white/20 flex items-center justify-center group/close-tab cursor-pointer hover:bg-theme-surface dark:hover:bg-[#111] transition-colors">
               <div class="w-[1px] h-16 bg-black/10 dark:bg-white/10 group-hover/close-tab:bg-black/40 dark:group-hover/close-tab:bg-white/40 transition-all duration-300"></div>
               <span class="absolute text-[7px] font-mono tracking-[0.4em] uppercase text-black/10 dark:text-white/10 group-hover/close-tab:text-black/40 dark:group-hover/close-tab:text-white/40 -rotate-90 whitespace-nowrap">{{ t('genesis.virtualLog.closeArchive') }}</span>
             </button>
 
             <ExPanel 
               class="!bg-gray-50/50 dark:!bg-[#070707]/60 !border-black/10 dark:!border-white/10"
               :no-shadow="true"
               :title="t('genesis.virtualLog.archivalRecord')"
               :show-corners="true"
               variant="light"
             >
               <div class="flex flex-col space-y-6 p-6">
                 <div class="flex items-center space-x-6">
                    <div v-if="assetIcon && !imageLoadError" class="w-16 h-16 border nier-border-primary flex items-center justify-center bg-white p-2 shadow-inner">
                      <img :src="assetIcon" class="w-full h-full object-contain" @error="imageLoadError = true" />
                    </div>
                    <div v-else class="w-16 h-16 border nier-border-primary flex items-center justify-center bg-black/5 dark:bg-white/5 shadow-inner">
                      <span class="text-2xl font-black opacity-20 font-mono nier-text-primary uppercase">{{ selectedTrade?.asset?.slice(0, 2) }}</span>
                    </div>
                   <div class="flex flex-col">
                     <span class="text-[8px] font-mono opacity-40 uppercase tracking-[0.5em] nier-text-primary">{{ t('genesis.virtualLog.assetIdentifier') }}</span>
                     <h3 class="text-3xl font-light font-serif tracking-[0.2em] uppercase nier-text-primary mt-1 leading-none">
                       {{ selectedTrade?.asset }}
                     </h3>
                   </div>
                 </div>
                  <div class="h-px w-full bg-gradient-to-r from-black/10 via-transparent to-transparent dark:from-white/10"></div>

                  <!-- TACTICAL DATA GRID -->
                  <div class="grid grid-cols-2 gap-x-8 gap-y-8 px-6 pb-6 mt-4">
                    <!-- ENTRY -->
                    <div class="flex flex-col">
                      <span v-if="hasMultipleEntries" class="text-[8px] font-mono opacity-40 uppercase tracking-[0.4em] nier-text-primary">{{ locale === 'ru' ? 'СРЕДНИЙ_ВХОД' : 'AVERAGE_ENTRY' }}</span>
                      <span v-else class="text-[8px] font-mono opacity-40 uppercase tracking-[0.4em] nier-text-primary">{{ t('genesis.virtualLog.entryPrice') }}</span>
                      <span class="font-mono font-bold nier-text-primary mt-2 leading-none" :class="getDynamicPriceClass(selectedTrade?.entry)">{{ formatFullPrice(selectedTrade?.entry) }}</span>
                      <span class="text-[12px] font-mono opacity-50 nier-text-primary mt-2 leading-tight uppercase">{{ formatFullDate(selectedTrade?.date).replace('\n', ' // ') }}</span>
                    </div>

                    <!-- EXIT -->
                    <div class="flex flex-col">
                      <span v-if="hasMultipleExits" class="text-[8px] font-mono opacity-40 uppercase tracking-[0.4em] nier-text-primary">{{ locale === 'ru' ? 'СРЕДНИЙ_ВЫХОД' : 'AVERAGE_EXIT' }}</span>
                      <span v-else class="text-[8px] font-mono opacity-40 uppercase tracking-[0.4em] nier-text-primary">{{ t('genesis.virtualLog.exitPrice') }}</span>
                      <span class="font-mono font-bold nier-text-primary mt-2 leading-none" :class="getDynamicPriceClass(selectedTrade?.exit)">{{ formatFullPrice(selectedTrade?.exit) }}</span>
                      <span class="text-[12px] font-mono opacity-50 nier-text-primary mt-2 leading-tight uppercase">{{ formatFullDate(selectedTrade?.dateExit).replace('\n', ' // ') }}</span>
                    </div>

                    <div v-if="selectedTradeTimeZone" class="col-span-2 flex justify-start">
                      <span class="max-w-full truncate text-left text-[10px] font-mono font-black uppercase tracking-[0.22em] opacity-45 nier-text-primary">
                        {{ formatTradeTimeZone(selectedTrade) }}
                      </span>
                    </div>

                    <!-- RISK MANAGEMENT -->
                    <div class="flex flex-col pt-4 border-t border-black/5 dark:border-white/5">
                      <span class="text-[8px] font-mono opacity-40 uppercase tracking-[0.4em] nier-text-primary">{{ t('genesis.virtualLog.riskExposure') }}</span>
                      <div class="flex flex-col mt-2 space-y-2">
                        <div class="flex items-baseline justify-between">
                          <span class="text-[8px] font-mono opacity-30 nier-text-primary uppercase">{{ t('genesis.virtualLog.stopLoss') }}</span>
                          <span class="text-sm font-mono font-bold nier-text-primary tracking-widest">{{ formatOptionalTradePrice(selectedTrade?.stopLoss) }}</span>
                        </div>
                        <div class="flex items-baseline justify-between">
                          <span class="text-[8px] font-mono opacity-30 nier-text-primary uppercase">{{ t('genesis.virtualLog.takeProfit') }}</span>
                          <span class="text-sm font-mono font-bold nier-text-primary tracking-widest">{{ formatOptionalTradePrice(selectedTrade?.takeProfit) }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- PERFORMANCE -->
                    <div class="flex flex-col pt-4 border-t border-black/5 dark:border-white/5">
                      <span class="text-[8px] font-mono opacity-40 uppercase tracking-[0.4em] nier-text-primary">{{ t('genesis.virtualLog.tradeMetrics') }}</span>
                      <div class="flex flex-col mt-2 space-y-2">
                         <div class="flex items-baseline justify-between">
                           <span class="text-[8px] font-mono opacity-30 nier-text-primary uppercase">{{ locale === 'ru' ? 'НАПРАВЛЕНИЕ' : 'DIRECTION' }}</span>
                           <span class="text-sm font-mono font-bold nier-text-primary tracking-widest">{{ formatTradeDirection(selectedTrade) }}</span>
                         </div>
                         <div class="flex items-baseline justify-between">
                           <span class="text-[8px] font-mono opacity-30 nier-text-primary uppercase">{{ t('genesis.virtualLog.rrRatio') }}</span>
                           <span class="text-sm font-mono font-bold nier-text-primary tracking-widest">1:{{ calculateRR(selectedTrade) }}</span>
                         </div>
                         <div class="flex items-baseline justify-between">
                           <span class="text-[8px] font-mono opacity-30 nier-text-primary uppercase">{{ t('genesis.virtualLog.duration') }}</span>
                           <span class="text-sm font-mono font-bold nier-text-primary tracking-widest">{{ calculateDuration(selectedTrade) }}</span>
                         </div>
                      </div>
                    </div>

                    <!-- COMMISSIONS -->
                    <div class="flex flex-col pt-4 border-t border-black/5 dark:border-white/5 col-span-2" v-if="selectedTrade?.entryFee || selectedTrade?.exitFee">
                      <span class="text-[8px] font-mono opacity-40 uppercase tracking-[0.4em] nier-text-primary">{{ locale === 'ru' ? 'КОМИССИИ' : 'COMMISSIONS' }}</span>
                      <div class="flex mt-2 space-x-8">
                         <div class="flex flex-col flex-1 space-y-1">
                            <span class="text-[8px] font-mono opacity-30 nier-text-primary uppercase">{{ locale === 'ru' ? 'ВХОДНАЯ' : 'ENTRY' }}</span>
                            <span class="text-sm font-mono font-bold text-amber-500/80 tracking-widest">{{ getEntryFeeDisplay(selectedTrade) }}</span>
                         </div>
                         <div class="flex flex-col flex-1 space-y-1">
                            <span class="text-[8px] font-mono opacity-30 nier-text-primary uppercase">{{ locale === 'ru' ? 'ВЫХОДНАЯ' : 'EXIT' }}</span>
                            <span class="text-sm font-mono font-bold text-amber-500/80 tracking-widest">{{ getExitFeeDisplay(selectedTrade) }}</span>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
                <template #footer>
                  <div class="flex items-center space-x-2 w-full">
                    <ExButton 
                      variant="ghost" 
                      class="flex-1" 
                      @click="openNodeMap"
                    >
                       {{ t('genesis.virtualLog.showDetails') }}
                    </ExButton>
                    <ExButton 
                      variant="solid" 
                      class="!w-[38px] !h-[38px] !p-0 shrink-0 flex items-center justify-center" 
                      @click="editTrade(selectedTrade)"
                      :title="locale === 'ru' ? 'Редактировать сделку' : 'Edit Trade'"
                    >
                       <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                         <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                         <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                       </svg>
                    </ExButton>
                    <ExButton 
                      variant="solid" 
                      class="!w-[38px] !h-[38px] !p-0 shrink-0 flex items-center justify-center" 
                      @click="showShareCardModal = true"
                      :title="locale === 'ru' ? 'Сгенерировать Карточку' : 'Generate Share Card'"
                    >
                       <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                         <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                         <polyline points="16 6 12 2 8 6" />
                         <line x1="12" y1="2" x2="12" y2="15" />
                       </svg>
                    </ExButton>
                  </div>
                </template>
              </ExPanel>
          </div>
       </Transition>
    </Teleport>
    
    <!-- NODE MAP VISUALIZATION OVERLAY -->
    <ExTacticalNodeMap 
      v-if="showNodeMap" 
      :is-open="showNodeMap" 
      :trade="mappedTradeForAnalysis"
      :is-dark="isDark"
      :initial-page="panelInitialPage"
      :initial-expanded-note-id="panelInitialNoteId"
      :open-analytics-on-mount="showExtraDetails"
      @close="showNodeMap = false; showExtraDetails = false" 
    />

    <!-- TOP CENTER COMPLIANCE DASHBOARD -->
    <div v-if="!showNodeMap && viewType === 'cube' && showComplianceStatus && !showCapitalForecast && isHudVisible" class="absolute top-8 left-1/2 -translate-x-1/2 z-[9000] w-[1100px] max-w-[95vw] pointer-events-auto">
       <ExPanel
         variant="light"
         :show-corners="true"
         :no-padding="true"
         :no-shadow="true"
         class="!h-[560px] !bg-gray-50/65 dark:!bg-[#070707]/65 !border-black/10 dark:!border-white/10 shadow-[14px_14px_0_rgba(0,0,0,0.16)] dark:shadow-[14px_14px_0_rgba(0,0,0,0.42)]"
       >
         <div class="flex h-full min-h-0 flex-col">
          <OpenStrategyMetrics
            :is-dark="isDark"
            :minimal="true"
            :transparent="true"
            :metrics="complianceMetricsConfigs"
            :values="complianceMetricsValues"
            :selected-metric-key="activeComplianceMetricKey"
            strategy-name="Protocol_Compliance"
            :is-live="true"
            :editable="false"
            @metric-select="activeComplianceMetricKey = $event"
          />
          <div class="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-6">
            <!-- RISK PER TRADE VIOLATIONS -->
            <div v-if="activeComplianceMetricKey === 'riskPerTrade'" class="flex flex-col font-mono text-xs pt-2 select-none">
              <div class="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10 text-[10px] opacity-40 uppercase tracking-widest px-2">
                <div class="w-[15%] flex items-center space-x-3">
                  <span>Direction</span>
                </div>
                <span class="w-[15%]">Asset</span>
                <span class="w-[22%] text-center">Entry Date</span>
                <span class="w-[16%] text-right">Realized Loss</span>
                <span class="w-[16%] text-right">Planned Risk</span>
                <span class="w-[16%] text-right">Result</span>
              </div>

              <div v-if="complianceViolations.violatingTrades.length === 0" class="py-16 text-center opacity-40 text-xs uppercase tracking-widest">
                NO RISK_PER_TRADE VIOLATIONS DETECTED
              </div>

              <div v-else class="flex flex-col space-y-3.5 pt-2">
                <div v-for="trade in complianceViolations.violatingTrades" :key="trade.id" class="flex flex-col group transition-opacity duration-150 border-b border-black/5 dark:border-white/5 pb-2">
                  <div class="flex items-center justify-between py-3 px-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    <div class="w-[15%] flex items-center space-x-3 truncate">
                      <span
                        class="w-1 h-1 rounded-full shrink-0"
                        :class="(Number(trade.profitInCurrency) || 0) >= 0 ? 'bg-black dark:bg-[#F9F6F0]' : 'bg-black/30 dark:bg-white/30'"
                      ></span>
                      <span class="font-bold uppercase tracking-widest">{{ trade.side || trade.direction || 'N/A' }}</span>
                    </div>
                    <span class="w-[15%] opacity-60 uppercase tracking-wider truncate">{{ trade.asset }}</span>
                    <div class="w-[22%] flex flex-col items-center min-w-0">
                      <span class="mt-1 text-[10px] opacity-80 font-bold uppercase tracking-wider truncate">
                        ENTRY: {{ new Date(trade.date).toLocaleDateString() }}
                      </span>
                    </div>
                    <span class="w-[16%] text-right tracking-wider truncate" :class="trade._realizedLoss > trade._maxRiskDollars ? '!text-red-500 !opacity-80 font-bold' : '!text-green-500 !opacity-80 font-bold'">
                      {{ trade._realizedLoss > 0 ? '-$' + trade._realizedLoss.toFixed(2) : '$0.00' }}
                    </span>
                    <span class="w-[16%] text-right tracking-wider truncate" :class="trade._positionRisk > trade._maxRiskDollars ? '!text-red-500 !opacity-80 font-bold' : '!text-green-500 !opacity-80 font-bold'">
                      {{ trade._positionRisk > 0 ? '-$' + trade._positionRisk.toFixed(2) : '$0.00' }}
                    </span>
                    <span class="w-[16%] font-bold text-right tracking-wider" :class="(Number(trade.profitInCurrency) || 0) >= 0 ? 'text-green-500' : 'text-red-500'">
                      {{ (Number(trade.profitInCurrency) || 0) >= 0 ? '+$' : '-$' }}{{ Math.abs(Number(trade.profitInCurrency) || 0).toFixed(2) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- RISK PER SESSION VIOLATIONS -->
            <div v-if="activeComplianceMetricKey === 'riskPerSession'" class="flex flex-col font-mono text-xs pt-2 select-none">
              <div v-if="complianceViolations.violatingSessions.length === 0" class="py-16 text-center opacity-40 text-xs uppercase tracking-widest">
                NO RISK_PER_SESSION VIOLATIONS DETECTED
              </div>
              <div v-else class="flex flex-col space-y-4">
                <div v-for="session in complianceViolations.violatingSessions" :key="session.date" class="w-full">
                  <div 
                    class="bg-white/5 dark:bg-black/20 border border-black/10 dark:border-white/10 p-4 flex items-center justify-between cursor-pointer transition-all hover:bg-black/5 dark:hover:bg-white/5"
                    @click="toggleSession(session.date)"
                  >
                    <div class="flex items-center gap-6">
                      <div class="font-mono text-sm font-bold uppercase tracking-widest">{{ session.date }}</div>
                      <div class="text-[10px] opacity-60 uppercase tracking-widest flex gap-2"><span class="px-2 py-0.5 bg-red-500/20 text-red-500 rounded">{{ session.violatingTrades.length }} VIOLATIONS</span></div>
                    </div>
                    <div class="flex items-center gap-8 text-right font-mono text-sm uppercase tracking-widest">
                      <div class="flex flex-col">
                        <span class="text-[9px] opacity-40">Realized Loss</span>
                        <span :class="session.realizedLoss > session._maxSessionRiskDollars ? 'text-red-500 font-bold' : 'text-green-500 font-bold'">
                          {{ session.realizedLoss > 0 ? '-$' + session.realizedLoss.toFixed(2) : '$0.00' }}
                        </span>
                      </div>
                      <div class="flex flex-col w-24">
                        <span class="text-[9px] opacity-40">Planned Risk</span>
                        <span :class="session.positionRisk > session._maxSessionRiskDollars ? 'text-red-500 font-bold' : 'text-green-500 font-bold'">
                          {{ session.positionRisk > 0 ? '-$' + session.positionRisk.toFixed(2) : '$0.00' }}
                        </span>
                      </div>
                      <div class="w-6 flex justify-center opacity-40">
                        <svg v-if="expandedSessions.has(session.date)" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>
                  <!-- Session Violating Trades -->
                  <div v-if="expandedSessions.has(session.date)" class="my-2 ml-2 pl-6 border-l border-black/20 dark:border-white/20 flex flex-col space-y-3.5 py-3 opacity-80 animate-[fadeIn_0.2s_ease-out]">
                    <div class="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10 text-[10px] opacity-40 uppercase tracking-widest px-2">
                      <div class="w-[15%] flex items-center space-x-3">
                        <span>Direction</span>
                      </div>
                      <span class="w-[15%]">Asset</span>
                      <span class="w-[22%] text-center">Entry Date</span>
                      <span class="w-[16%] text-right">Realized Loss</span>
                      <span class="w-[16%] text-right">Planned Risk</span>
                      <span class="w-[16%] text-right">Result</span>
                    </div>
                    <div v-for="trade in session.violatingTrades" :key="trade.id" class="flex flex-col group transition-opacity duration-150 border-b border-black/5 dark:border-white/5 pb-2">
                      <div class="flex items-center justify-between py-3 px-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <div class="w-[15%] flex items-center space-x-3 truncate">
                          <span
                            class="w-1 h-1 rounded-full shrink-0"
                            :class="(Number(trade.profitInCurrency) || 0) >= 0 ? 'bg-black dark:bg-[#F9F6F0]' : 'bg-black/30 dark:bg-white/30'"
                          ></span>
                          <span class="font-bold uppercase tracking-widest">{{ trade.side || trade.direction || 'N/A' }}</span>
                        </div>
                        <span class="w-[15%] opacity-60 uppercase tracking-wider truncate">{{ trade.asset }}</span>
                        <div class="w-[22%] flex flex-col items-center min-w-0">
                          <span class="mt-1 text-[10px] opacity-80 font-bold uppercase tracking-wider truncate">
                            ENTRY: {{ new Date(trade.date).toLocaleDateString() }}
                          </span>
                        </div>
                        <span class="w-[16%] text-right tracking-wider truncate" :class="trade._realizedLoss > trade._maxRiskDollars ? '!text-red-500 !opacity-80 font-bold' : '!text-green-500 !opacity-80 font-bold'">
                          {{ trade._realizedLoss > 0 ? '-$' + trade._realizedLoss.toFixed(2) : '$0.00' }}
                        </span>
                        <span class="w-[16%] text-right tracking-wider truncate" :class="trade._positionRisk > trade._maxRiskDollars ? '!text-red-500 !opacity-80 font-bold' : '!text-green-500 !opacity-80 font-bold'">
                          {{ trade._positionRisk > 0 ? '-$' + trade._positionRisk.toFixed(2) : '$0.00' }}
                        </span>
                        <span class="w-[16%] font-bold text-right tracking-wider" :class="(Number(trade.profitInCurrency) || 0) >= 0 ? 'text-green-500' : 'text-red-500'">
                          {{ (Number(trade.profitInCurrency) || 0) >= 0 ? '+$' : '-$' }}{{ Math.abs(Number(trade.profitInCurrency) || 0).toFixed(2) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- TRADING STYLE VIOLATIONS -->
            <div v-if="activeComplianceMetricKey === 'tradingStyle'" class="flex flex-col font-mono text-xs pt-2 select-none">
              <div class="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10 text-[10px] opacity-40 uppercase tracking-widest px-2">
                <div class="w-[15%] flex items-center space-x-3">
                  <span>Direction</span>
                </div>
                <span class="w-[15%]">Asset</span>
                <span class="w-[22%] text-center">Entry Date</span>
                <span class="w-[16%] text-right">Duration</span>
                <span class="w-[16%] text-right">Expected</span>
                <span class="w-[16%] text-right">Result</span>
              </div>

              <div v-if="complianceViolations.violatingStyleTrades.length === 0" class="py-16 text-center opacity-40 text-xs uppercase tracking-widest">
                NO TRADING_STYLE VIOLATIONS DETECTED
              </div>

              <div v-else class="flex flex-col space-y-3.5 pt-2">
                <div v-for="trade in complianceViolations.violatingStyleTrades" :key="trade.id" class="flex flex-col group transition-opacity duration-150 border-b border-black/5 dark:border-white/5 pb-2">
                  <div class="flex items-center justify-between py-3 px-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    <div class="w-[15%] flex items-center space-x-3 truncate">
                      <span
                        class="w-1 h-1 rounded-full shrink-0"
                        :class="(Number(trade.profitInCurrency) || 0) >= 0 ? 'bg-black dark:bg-[#F9F6F0]' : 'bg-black/30 dark:bg-white/30'"
                      ></span>
                      <span class="font-bold uppercase tracking-widest">{{ trade.side || trade.direction || 'N/A' }}</span>
                    </div>
                    <span class="w-[15%] opacity-60 uppercase tracking-wider truncate">{{ trade.asset }}</span>
                    <div class="w-[22%] flex flex-col items-center min-w-0">
                      <span class="mt-1 text-[10px] opacity-80 font-bold uppercase tracking-wider truncate">
                        ENTRY: {{ new Date(trade.date).toLocaleDateString() }}
                      </span>
                    </div>
                    <span class="w-[16%] opacity-80 font-bold text-red-500 text-right tracking-wider truncate">
                      {{ trade._durationStr }}
                    </span>
                    <span class="w-[16%] opacity-60 text-right tracking-wider truncate">
                      {{ trade._expectedStyle }}
                    </span>
                    <span class="w-[16%] font-bold text-right tracking-wider" :class="(Number(trade.profitInCurrency) || 0) >= 0 ? 'text-green-500' : 'text-red-500'">
                      {{ (Number(trade.profitInCurrency) || 0) >= 0 ? '+$' : '-$' }}{{ Math.abs(Number(trade.profitInCurrency) || 0).toFixed(2) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- NEURAL STATUS VIOLATIONS -->
            <div v-if="activeComplianceMetricKey === 'emotionalState'" class="flex flex-col font-mono text-xs pt-2 select-none">
              <div class="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10 text-[10px] opacity-40 uppercase tracking-widest px-2">
                <div class="w-[15%] flex items-center space-x-3">
                  <span>Direction</span>
                </div>
                <span class="w-[15%]">Asset</span>
                <span class="w-[22%] text-center">Entry Date</span>
                <span class="w-[16%] text-right">Reason</span>
                <span class="w-[16%] text-right">Score</span>
                <span class="w-[16%] text-right">Result</span>
              </div>

              <div v-if="complianceViolations.violatingNeuralTrades.length === 0" class="py-16 text-center opacity-40 text-xs uppercase tracking-widest">
                NO NEURAL_STATUS VIOLATIONS DETECTED
              </div>

              <div v-else class="flex flex-col space-y-3.5 pt-2">
                <div v-for="trade in complianceViolations.violatingNeuralTrades" :key="trade.id" class="flex flex-col group transition-opacity duration-150 border-b border-black/5 dark:border-white/5 pb-2">
                  <div class="flex items-center justify-between py-3 px-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    <div class="w-[15%] flex items-center space-x-3 truncate">
                      <span
                        class="w-1 h-1 rounded-full shrink-0"
                        :class="(Number(trade.profitInCurrency) || 0) >= 0 ? 'bg-black dark:bg-[#F9F6F0]' : 'bg-black/30 dark:bg-white/30'"
                      ></span>
                      <span class="font-bold uppercase tracking-widest">{{ trade.side || trade.direction || 'N/A' }}</span>
                    </div>
                    <span class="w-[15%] opacity-60 uppercase tracking-wider truncate">{{ trade.asset }}</span>
                    <div class="w-[22%] flex flex-col items-center min-w-0">
                      <span class="mt-1 text-[10px] opacity-80 font-bold uppercase tracking-wider truncate">
                        ENTRY: {{ new Date(trade.date).toLocaleDateString() }}
                      </span>
                    </div>
                    <span class="w-[16%] opacity-60 font-bold text-red-500 text-right tracking-wider truncate">
                      {{ trade._neuralReason }}
                    </span>
                    <span class="w-[16%] opacity-80 font-bold text-red-500 text-right tracking-wider truncate">
                      {{ trade._neuralScore }}%
                    </span>
                    <span class="w-[16%] font-bold text-right tracking-wider" :class="(Number(trade.profitInCurrency) || 0) >= 0 ? 'text-green-500' : 'text-red-500'">
                      {{ (Number(trade.profitInCurrency) || 0) >= 0 ? '+$' : '-$' }}{{ Math.abs(Number(trade.profitInCurrency) || 0).toFixed(2) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- OTHER METRICS FALLBACK -->
            <div v-if="activeComplianceMetricKey !== 'riskPerTrade' && activeComplianceMetricKey !== 'riskPerSession' && activeComplianceMetricKey !== 'tradingStyle' && activeComplianceMetricKey !== 'emotionalState'" class="flex items-center justify-center h-full opacity-30 font-mono text-sm uppercase">
              SELECT A SECTION ABOVE TO VIEW VIOLATIONS
            </div>
          </div>
         </div>
       </ExPanel>
    </div>

    <div
      v-if="!showNodeMap && viewType === 'cube' && showCapitalForecast && isHudVisible && canOpenCapitalForecast"
      class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[8990] w-[1100px] max-w-[95vw] pointer-events-auto opacity-30 hover:opacity-100 transition-opacity duration-500"
    >
      <ExPatternForecastPanel
        :visible="showCapitalForecast"
        :trades="currentTrades"
        :initial-capital="tradeStore.getInitialDeposit(selectedStrategyId) || 1000"
        :strategy-id="selectedStrategyId"
        :strategy-name="selectedStrategy.name"
        @loading-change="patternForecastLoading = $event"
      />
    </div>

    <!-- BOTTOM CENTER: PHANTOM PROTOCOL SELECT -->
    <div v-if="!showNodeMap && isHudVisible && !isTradeEntryOpen && !isTimeTreeFullscreen" class="absolute bottom-14 left-1/2 -translate-x-1/2 z-[10000] flex flex-col items-center pointer-events-none opacity-10 hover:opacity-100 transition-all duration-700" :class="showCapitalForecast ? 'blur-sm brightness-75 saturate-75' : ''">
       
       <!-- The Dropdown Menu -->

       <div v-if="viewType === 'cube' && activeFaceIndices.length > 1" class="mb-4 flex items-center justify-center space-x-2 pointer-events-auto">
          <div v-for="faceIdx in activeFaceIndices" :key="faceIdx"
               class="w-1.5 h-1.5 border border-slate-500 transition-all rotate-45"
               :class="faceIdx === currentFace ? 'bg-white border-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'bg-transparent opacity-20'">
          </div>
       </div>

       <!-- The Pagination + Protocol Select Button Row -->
       <div class="flex items-center space-x-4">
          <!-- Left Pagination Arrow -->
          <button v-if="viewType === 'cube'" @click="prevCubePage" class="w-12 h-12 bg-white/5 dark:bg-black/5 border nier-border-primary flex items-center justify-center backdrop-blur-md pointer-events-auto cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all group/arrow relative">
             <div class="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-black/30 dark:border-white/30"></div>
             <div class="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-black/30 dark:border-white/30"></div>
             <div class="w-2 h-2 border-t-2 border-l-2 border-black dark:border-white -rotate-45 group-hover/arrow:-translate-x-0.5 transition-transform"></div>
          </button>

          <!-- The Button -->
          <SystemProtocolSelect
            v-model="selectedStrategyId"
            :strategies="strategies"
            :is-loading="isMatrixLoading"
            menu-position="top"
            @update:modelValue="selectStrategy($event)"
          />

          <!-- Right Pagination Arrow -->
          <button v-if="viewType === 'cube'" @click="nextCubePage" class="w-12 h-12 bg-white/5 dark:bg-black/5 border nier-border-primary flex items-center justify-center backdrop-blur-md pointer-events-auto cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all group/arrow relative">
             <div class="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-black/30 dark:border-white/30"></div>
             <div class="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-black/30 dark:border-white/30"></div>
             <div class="w-2 h-2 border-t-2 border-r-2 border-black dark:border-white rotate-45 group-hover/arrow:translate-x-0.5 transition-transform"></div>
          </button>
       </div>
    </div>
  </div>

  <Teleport to="body">
    <Transition name="page-reify">
       <ExTradeEntry v-if="isTradeEntryOpen" 
                     class="fixed inset-0 z-[9999] w-screen h-screen"
                     :key="editingTrade?.id || 'new-trade-entry'"
                     :initial-trade="editingTrade"
                     @close="isTradeEntryOpen = false; editingTrade = undefined" 
                     @addTrade="isTradeEntryOpen = false; editingTrade = undefined"
                     @updateTrade="isTradeEntryOpen = false; editingTrade = undefined" />
    </Transition>
  </Teleport>

    <Teleport to="body">
       <Transition name="fade-blur">
          <div v-if="showShareCardModal" 
               class="fixed inset-0 z-[10020] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md p-8"
               @click.self="showShareCardModal = false">
             <div class="absolute inset-0 bg-black border border-white/5 pointer-events-none">
                <div class="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white/20"></div>
                <div class="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white/20"></div>
             </div>
             <div class="flex flex-col items-center max-w-[1240px] w-full relative z-10">
                <div class="share-card-capture-wrapper shadow-[0_0_80px_rgba(0,0,0,0.8)] relative">
                   <div class="absolute -inset-1 bg-gradient-to-tr from-white/10 to-transparent blur-md opacity-30 pointer-events-none"></div>
                   <ExTradeShareCardPreview
                     :efficiency="tradeEfficiency"
                     :protocol="shareCardProtocol"
                     :duration="tradeDuration"
                     :entry-price="tradeEntryPrice"
                     :exit-price="tradeExitPrice"
                     :emotional-state="tradeEmotionalState"
                     :net-result="tradeNetResult"
                     :username="authStore.user?.displayName || authStore.user?.email || 'Operator_0x4F'"
                     :account-type="authStore.user?.type || 'common'"
                     :asset="selectedTrade?.asset || 'UNKNOWN'"
                   />
                </div>
                <div class="mt-8 flex items-center space-x-6">
                   <ExButton 
                     variant="solid" 
                     class="!px-10 !py-3 font-black tracking-widest text-xs relative overflow-hidden" 
                     :disabled="isGeneratingPng"
                     @click="downloadCardPng"
                   >
                      <span v-if="isGeneratingPng">{{ locale === 'ru' ? 'РЕНДЕРИНГ...' : 'RENDERING...' }}</span>
                      <span v-else>{{ locale === 'ru' ? 'СКАЧАТЬ PNG' : 'DOWNLOAD PNG' }}</span>
                   </ExButton>
                   <ExButton 
                     variant="ghost" 
                     class="!px-10 !py-3 tracking-widest text-xs" 
                     @click="showShareCardModal = false"
                   >
                      {{ locale === 'ru' ? 'ЗАКРЫТЬ' : 'CLOSE' }}
                   </ExButton>
                </div>
             </div>
          </div>
       </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="protocol-slide">
      <div v-if="isTemporalOpen" 
           class="fixed inset-0 z-[2000] flex items-center justify-center p-20 bg-black/40 dark:bg-black/80 backdrop-blur-md">
        <div class="relative w-full max-w-4xl nier-bg-panel border border-black/40 dark:border-white/40 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden pointer-events-auto">
          
          <div class="flex items-center justify-between px-10 py-6 border-b nier-border-primary bg-black/5 dark:bg-white/5">
            <div class="flex items-center gap-4">
              <div class="w-2 h-2 nier-bg-inverted rotate-45"></div>
              <span class="text-xs uppercase tracking-[0.8em] font-black font-mono nier-text-primary">{{ t('genesis.virtualLog.temporalMatrixProtocol') }}</span>
            </div>

            <button @click="isTemporalOpen = false" 
                    class="group relative px-8 py-2 bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all duration-300 cursor-pointer font-mono font-bold">
              <span class="text-[9px] font-black uppercase tracking-[0.4em]">{{ t('genesis.virtualLog.accept') }}</span>
            </button>
          </div>

          <div class="grid grid-cols-2 divide-x divide-black/10 dark:divide-white/10 h-[450px]">
            <div class="flex flex-col p-10 gap-8 justify-center items-center">
              <div class="flex flex-col items-center gap-4 text-center max-w-xs">
                <div class="w-8 h-8 border border-black/20 dark:border-white/20 flex items-center justify-center rotate-45 mb-4">
                  <div class="w-2 h-2 nier-bg-inverted animate-pulse"></div>
                </div>
                <span class="text-xs uppercase tracking-widest font-mono font-bold nier-text-primary">{{ t('genesis.virtualLog.customTemporalLock') }}</span>
                <p class="text-[10px] font-mono text-black/40 dark:text-white/40 tracking-wider mb-4 leading-relaxed">
                  {{ t('genesis.virtualLog.temporalDescription') }}
                </p>
                <button @click="customDate = new Date(); syncTempParts()" 
                        class="w-full py-3 border nier-border-primary text-[9px] uppercase tracking-widest text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10 font-mono cursor-pointer font-bold transition-all shadow-sm">
                  {{ t('genesis.virtualLog.syncToCurrentSystemTime') }}
                </button>
              </div>
            </div>

            <div class="flex flex-col p-10 justify-center">
              <div class="flex flex-col items-center gap-10 font-mono">
                <div class="flex items-center gap-4">
                  <div v-for="unit in ['day', 'month', 'year']" :key="unit" class="flex flex-col items-center gap-2">
                    <button @click="adjustDate(activeTemporalTarget, unit, 1); syncTempParts()" class="p-2 opacity-20 hover:opacity-100 transition-opacity cursor-pointer"><div class="w-4 h-px nier-bg-inverted"></div></button>
                    <input v-model="tempDateParts[unit as any]"
                           :maxlength="unit === 'year' ? 4 : 2"
                           @input="e => handleManualDate(activeTemporalTarget, unit, (e.target as any).value)"
                           class="w-24 bg-transparent text-center outline-none text-4xl font-mono font-bold tracking-tighter nier-text-primary" />
                    <button @click="adjustDate(activeTemporalTarget, unit, -1); syncTempParts()" class="p-2 opacity-20 hover:opacity-100 transition-opacity cursor-pointer"><div class="w-4 h-px nier-bg-inverted"></div></button>
                    <span class="text-[7px] uppercase tracking-widest text-black/40 dark:text-white/40">{{ translateTemporalUnit(unit) }}</span>
                  </div>
                </div>

                <div class="w-20 h-px bg-black/10 dark:bg-white/10"></div>

                <div class="flex items-center gap-6">
                  <div v-for="unit in ['hour', 'minute']" :key="unit" class="flex flex-col items-center gap-2">
                    <button @click="adjustDate(activeTemporalTarget, unit, 1); syncTempParts()" class="p-2 opacity-20 hover:opacity-100 transition-opacity cursor-pointer"><div class="w-4 h-px nier-bg-inverted"></div></button>
                    <input v-model="tempDateParts[unit as any]"
                           maxlength="2"
                           @input="e => handleManualDate(activeTemporalTarget, unit, (e.target as any).value)"
                           class="w-20 bg-transparent text-center outline-none text-4xl font-mono font-bold tracking-widest nier-text-primary" />
                    <button @click="adjustDate(activeTemporalTarget, unit, -1); syncTempParts()" class="p-2 opacity-20 hover:opacity-100 transition-opacity cursor-pointer"><div class="w-4 h-px nier-bg-inverted"></div></button>
                    <span class="text-[7px] uppercase tracking-widest text-black/40 dark:text-white/40">{{ translateTemporalUnit(unit) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <Transition name="fade-blur">
      <div
        v-if="showCapitalForecastIntro"
        class="fixed inset-0 z-[10040] flex items-center justify-center bg-black/45 p-8 backdrop-blur-md"
        @click.self="rejectCapitalForecastIntro"
      >
        <ExPanel
          variant="light"
          :no-padding="true"
          :no-shadow="true"
          :show-corners="true"
          class="w-full max-w-[560px] !border-black/15 dark:!border-white/15"
        >
          <div class="px-8 py-7 nier-text-primary">
            <div class="mb-5 flex items-center justify-between gap-6 border-b border-black/10 pb-4 dark:border-white/10">
              <div>
                <div class="text-[8px] font-mono uppercase tracking-[0.42em] opacity-45">
                  {{ locale === 'ru' ? 'ПРОГНОЗ_ПАТТЕРНОВ' : 'PATTERN_FORECAST' }}
                </div>
                <h2 class="mt-2 text-lg font-mono font-black uppercase tracking-[0.18em]">
                  {{ locale === 'ru' ? 'Предупреждение перед запуском' : 'Forecast Preview Notice' }}
                </h2>
              </div>
              <div class="flex h-10 w-10 shrink-0 items-center justify-center border nier-border-primary">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 17l5-5 4 4 8-9"></path>
                  <path d="M17 7h3v3"></path>
                </svg>
              </div>
            </div>

            <div class="font-mono text-[10px] uppercase tracking-[0.12em] leading-relaxed">
              <div class="grid grid-cols-2 gap-3 border-b border-black/10 pb-4 dark:border-white/10">
                <div>
                  <div class="opacity-40">{{ locale === 'ru' ? 'ВАШИ_СДЕЛКИ' : 'YOUR_TRADES' }}</div>
                  <div class="mt-1 text-base font-black">{{ patternForecastIntroStats.userTrades }}</div>
                </div>
                <div>
                  <div class="opacity-40">{{ locale === 'ru' ? 'ИСТОРИИ_ТРЕЙДЕРОВ' : 'TRADER_HISTORIES' }}</div>
                  <div class="mt-1 text-base font-black">{{ patternForecastIntroStats.historicalProfiles }}</div>
                </div>
              </div>

              <ol class="mt-5 space-y-3">
                <li class="grid grid-cols-[32px_1fr] gap-3">
                  <span class="font-black opacity-35">01</span>
                  <span>
                    {{ locale === 'ru'
                      ? `Берем ваши закрытые сделки: сейчас ${patternForecastIntroStats.userTrades}, минимум для запуска ${patternForecastIntroStats.minTrades}.`
                      : `We read your closed trades: ${patternForecastIntroStats.userTrades} now, ${patternForecastIntroStats.minTrades} minimum to run.` }}
                  </span>
                </li>
                <li class="grid grid-cols-[32px_1fr] gap-3">
                  <span class="font-black opacity-35">02</span>
                  <span>
                    {{ locale === 'ru'
                      ? `Сравниваем вашу динамику, риск, длительность сделок, серии win/loss и структурные блоки с ${patternForecastIntroStats.historicalProfiles} историями других трейдеров.`
                      : `We compare your performance path, risk, trade duration, win/loss streaks, and structural blocks with ${patternForecastIntroStats.historicalProfiles} histories from other traders.` }}
                  </span>
                </li>
                <li class="grid grid-cols-[32px_1fr] gap-3">
                  <span class="font-black opacity-35">03</span>
                  <span>
                    {{ locale === 'ru'
                      ? `Выбираем до ${patternForecastIntroStats.maxMatches} ближайших исторических совпадений и строим прогноз на ${patternForecastIntroStats.horizonsLabel} следующих сделок.`
                      : `We select up to ${patternForecastIntroStats.maxMatches} closest historical matches and build a forecast for the next ${patternForecastIntroStats.horizonsLabel} trades.` }}
                  </span>
                </li>
                <li class="grid grid-cols-[32px_1fr] gap-3 opacity-70">
                  <span class="font-black opacity-45">04</span>
                  <span>
                    {{ locale === 'ru'
                      ? 'На выходе вы получите вероятный диапазон капитала, confidence, похожие исторические сценарии и слабые места модели. Это проверка сценария, не торговый сигнал.'
                      : 'Output: probable capital range, confidence, similar historical scenarios, and weak points in the model. This is scenario review, not a trade signal.' }}
                  </span>
                </li>
              </ol>
            </div>

            <div class="mt-7 flex items-center justify-end gap-3">
              <ExButton variant="ghost" class="!px-5 !py-2 text-[10px] uppercase tracking-[0.24em]" @click="rejectCapitalForecastIntro">
                {{ locale === 'ru' ? 'Отклонить' : 'Decline' }}
              </ExButton>
              <ExButton variant="solid" class="!px-5 !py-2 text-[10px] uppercase tracking-[0.24em]" @click="acceptCapitalForecastIntro">
                {{ locale === 'ru' ? 'Принять' : 'Accept' }}
              </ExButton>
            </div>
          </div>
        </ExPanel>
      </div>
    </Transition>
  </Teleport>

  <ExPaywallOverlay :isOpen="showPaywall" @close="showPaywall = false" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useStrategyTradesStore } from '~/features/store/useStrategyTrades'
import { useThemeStore } from '~/features/store/useTheme'
import ExPanel from '~/shared/ui/ExPanel.vue'
import ExGothicCorners from '~/shared/ui/ExGothicCorners.vue'
import ExButton from '~/shared/ui/ExButton.vue'
import { calculateTacticalHistory } from '~/shared/utils/tacticalHistory'
import { tradeMatchesProtocol } from '~/shared/utils/scenarioConditionScope'
import ExTradeAnalysisPanel from '~/widgets/genesis/ui/ExTradeAnalysisPanel.vue'
import globalAssets from '~/shared/data/global_assets.json'
import { getIconForAsset } from '~/shared/api/asset.service'
import ExTacticalNodeMap from '~/widgets/genesis/ui/ExTacticalNodeMap.vue'
import ExTradeEntry from '~/widgets/genesis/ui/ExTradeEntry.vue'
import ExVerticalTradeList from '~/widgets/genesis/ui/ExVerticalTradeList.vue'
import { useI18n } from '~/shared/i18n/useI18n'
import ExTradeShareCardPreview from '~/widgets/genesis/ui/ExTradeShareCardPreview.vue'
import ExPaywallOverlay from '~/widgets/genesis/ui/ExPaywallOverlay.vue'
import ExPatternForecastPanel from '~/widgets/genesis/ui/ExPatternForecastPanel.vue'
import { PATTERN_FORECAST_LIMITS } from '~/widgets/genesis/model/patternForecast'
import { useAuthStore } from '~/entities/user/auth.store'
import OpenStrategyMetrics from '~/widgets/genesis/ui/Open_Strategy_Metrics.vue'
import type { MetricConfig } from '~/widgets/genesis/ui/Open_Strategy_Metrics.vue'
import { resolveRiskManagementForStrategy, riskValueToDollars } from '~/widgets/genesis/model/riskManagement'
import { SystemProtocolSelect } from '~/widgets/system-protocol-select'
import { useMatrixState } from '~/widgets/genesis/model/matrix/useMatrixState'
import {
  filterTradesBySelectedStrategyVersion,
  getSelectedStrategyVersionSnapshot
} from '~/shared/utils/strategyVersionScope'

const emit = defineEmits(['exit', 'nodeMapState', 'hudState', 'openNote', 'openTrade'])

const themeStore = useThemeStore()
const isDark = computed(() => themeStore?.settings?.isDark ?? false)
const { t, locale } = useI18n()
const authStore = useAuthStore()
const {
  nodes: matrixStateNodes,
  connections: matrixStateConnections,
  strategyVersions,
  selectedStrategyVersionId,
  ensureMatrixDataRestored
} = useMatrixState()

const selectedMatrixSnapshot = computed(() => {
  return getSelectedStrategyVersionSnapshot(strategyVersions.value || [], selectedStrategyVersionId.value)
})

const matrixNodes = computed(() => {
  const allNodes: any[] = []
  const flatten = (nodes: any[]) => {
    nodes.forEach(node => {
      allNodes.push(node)
      if (node.subGraph?.nodes) flatten(node.subGraph.nodes)
    })
  }

  flatten(selectedMatrixSnapshot.value?.nodes || matrixStateNodes.value || [])
  return allNodes
})

const matrixConnections = computed(() => {
  const allConnections: any[] = []
  const flatten = (nodes: any[], connections: any[]) => {
    allConnections.push(...connections)
    nodes.forEach(node => {
      if (node.subGraph) {
        flatten(node.subGraph.nodes || [], node.subGraph.connections || [])
      }
    })
  }

  flatten(
    selectedMatrixSnapshot.value?.nodes || matrixStateNodes.value || [],
    selectedMatrixSnapshot.value?.connections || matrixStateConnections.value || []
  )
  return allConnections
})

const scopeTradesToSelectedVersion = <T,>(trades: T[]) => {
  if (selectedStrategyId.value === 'MAIN_DIARY') return trades
  return filterTradesBySelectedStrategyVersion(
    trades,
    strategyVersions.value || [],
    selectedStrategyVersionId.value
  )
}

const showShareCardModal = ref(false)
const isGeneratingPng = ref(false)
const showCapitalForecast = ref(false)
const showCapitalForecastIntro = ref(false)
const patternForecastLoading = ref(false)

const tradeEfficiency = computed(() => {
  return mappedTradeForAnalysis.value?.percentileRank ?? 0
})

const tradeDuration = computed(() => {
  if (!selectedTrade.value) return '0.0 Hours'
  return calculateDuration(selectedTrade.value)
})

const tradeEntryPrice = computed(() => {
  if (!selectedTrade.value || selectedTrade.value.entry === undefined) return '$0.00'
  return `$${Number(selectedTrade.value.entry).toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
})

const tradeExitPrice = computed(() => {
  if (!selectedTrade.value || selectedTrade.value.exit === undefined) return '$0.00'
  return `$${Number(selectedTrade.value.exit).toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
})

const EMOTION_WEIGHTS_STABILITY = {
  'CALMNESS': 15,
  'DISCIPLINE': 25,
  'FOCUS': 20,
  'PATIENCE': 15,
  'CONFIDENCE': 15,
  'HOPE': -10,
  'BOREDOM': -10,
  'FATIGUE': -15,
  'FOMO': -20,
  'REVENGE': -30,
  'GREED': -20,
  'FEAR': -20,
  'TILT': -40,
  'ANXIETY': -15
} as Record<string, number>

const tradeEmotionalState = computed(() => {
  if (!selectedTrade.value) return '60%'
  const emotions = selectedTrade.value.emotions || []
  if (emotions.length === 0) {
    return '60%'
  }
  
  let score = 60 // Baseline stability
  emotions.forEach((e: any) => {
    const key = (typeof e === 'string' ? e : (e.name || '')).toUpperCase()
    const weight = EMOTION_WEIGHTS_STABILITY[key] || 0
    score += weight
  })
  
  const val = Math.min(Math.max(Math.round(score), 0), 100)
  return `${val}%`
})

const tradeNetResult = computed(() => {
  if (!selectedTrade.value) return '+$0.00'
  const profit = selectedTrade.value.profitInCurrency || 0
  const sign = profit >= 0 ? '+' : '-'
  const absProfit = Math.abs(profit).toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${sign}$${absProfit}`
})

const hasMultipleEntries = computed(() => {
  if (!selectedTrade.value || !selectedTrade.value.executions) return false
  return selectedTrade.value.executions.filter((e: any) => e.type === 'entry').length > 1
})

const hasMultipleExits = computed(() => {
  if (!selectedTrade.value || !selectedTrade.value.executions) return false
  return selectedTrade.value.executions.filter((e: any) => e.type === 'exit').length > 1
})

const methodLabels = computed(() => {
  if (!selectedTrade.value || !selectedTrade.value.executions) return []
  const labels = new Set<string>()
  selectedTrade.value.executions.forEach((e: any) => {
    if (e.label && e.label !== 'SINGLE') {
      labels.add(e.label.replace('_DOWN', ''))
    }
  })
  return Array.from(labels)
})

const downloadCardPng = async () => {
  const cardElement = document.querySelector('#share-card-export-target') as HTMLElement
  if (!cardElement) return
  isGeneratingPng.value = true
  
  try {
    const htmlToImage = await import('html-to-image')
    
    const url = await htmlToImage.toPng(cardElement, {
      pixelRatio: 2,
      backgroundColor: '#0a0a0a',
      width: 1200,
      height: 675,
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left',
        width: '1200px',
        height: '675px'
      }
    })
    
    const link = document.createElement('a')
    link.download = `trade-share-${selectedTrade.value?.asset?.replaceAll('/', '-') || 'card'}.png`
    link.href = url
    link.click()
  } catch (err) {
    console.error('Error generating card image:', err)
  } finally {
    isGeneratingPng.value = false
  }
}

const viewType = ref<'cube' | 'list' | 'timeTree' | 'distribution'>('cube')
const listResultDisplayMode = ref<'currency' | 'percent'>('percent')
const listColorMode = ref<'monochrome' | 'colorful'>('colorful')
const isTimeTreeFullscreen = ref(false)
const showTimeTreeFullscreenHint = ref(false)
const selectedTradeId = ref<string | null>(null)
const editingTrade = ref<any>(undefined)
let timeTreeFullscreenHintTimeout: ReturnType<typeof setTimeout> | null = null

const editTrade = (trade: any) => {
  editingTrade.value = trade
  isTradeEntryOpen.value = true
}

const showExtraDetails = ref(false)
const panelInitialPage = ref<number | undefined>(undefined)
const panelInitialNoteId = ref<string | undefined>(undefined)
const showNodeMap = ref(false)
const isHudVisible = ref(true)
const showComplianceStatus = ref(false)
const activeComplianceMetricKey = ref('riskPerTrade')
const isTradeEntryOpen = ref(false)
const showAssetMenu = ref(false)
const imageLoadError = ref(false)

watch(isHudVisible, (val) => {
  emit('hudState', val)
})
const showPaywall = ref(false)
const canOpenCapitalForecast = computed(() => {
  return true
})

const openNodeMap = () => {
  showNodeMap.value = true
}

const handleOpenNote = (payload: { tradeId: string; noteId: string }) => {
  selectedTradeId.value = payload.tradeId
  panelInitialPage.value = 5
  panelInitialNoteId.value = payload.noteId
  showExtraDetails.value = true
  showNodeMap.value = true
  emit('openNote', payload)
}

const handleOpenTrade = (payload: { tradeId: string }) => {
  selectedTradeId.value = payload.tradeId
  panelInitialPage.value = undefined
  panelInitialNoteId.value = undefined
  showExtraDetails.value = false
  showNodeMap.value = false
  emit('openTrade', payload)
}

watch(showNodeMap, (val) => {
  emit('nodeMapState', val)
})

const formatFullDate = (d: any) => {
  if (!d) return t('genesis.virtualLog.notAvailable')
  const date = new Date(d)
  const datePart = date.toLocaleDateString(locale.value === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
  const timePart = date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  })
  return `${datePart}\n${timePart}`
}

const getTradeTimeZone = (trade: any) => {
  return String(trade?.timeZone || trade?.timezone || '').trim()
}

const getTimeZoneOffsetLabel = (timeZone: string, dateLike?: any) => {
  const zone = String(timeZone || '').trim()
  if (!zone) return ''
  try {
    const date = dateLike ? new Date(dateLike) : new Date()
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'shortOffset'
    }).formatToParts(Number.isNaN(date.getTime()) ? new Date() : date)
    return parts.find(part => part.type === 'timeZoneName')?.value || ''
  } catch (e) {
    return ''
  }
}

const selectedTradeTimeZone = computed(() => getTradeTimeZone(selectedTrade.value))

const formatTradeTimeZone = (trade: any) => {
  const zone = getTradeTimeZone(trade)
  if (!zone) return ''
  const offset = getTimeZoneOffsetLabel(zone, trade?.date || trade?.dateExit)
  return offset ? `${zone} (${offset})` : zone
}

const formatFullPrice = (value: unknown) => {
  if (value === undefined || value === null || value === '') return '0'
  const number = Number(value)
  if (!Number.isFinite(number)) return String(value)
  return Number.isInteger(number) ? String(number) : number.toString()
}

const formatOptionalTradePrice = (value: unknown) => {
  if (value === undefined || value === null || value === '') return 'NaN'
  const number = Number(value)
  if (!Number.isFinite(number) || number === 0) return 'NaN'
  return Number.isInteger(number) ? String(number) : number.toString()
}

const formatTradeDirection = (trade: any) => {
  const rawDirection = String(trade?.side || trade?.direction || '').trim().toLowerCase()
  const isShort = rawDirection.includes('short') || rawDirection.includes('sell')
  return locale.value === 'ru'
    ? (isShort ? 'КОРОТКАЯ' : 'ДЛИННАЯ')
    : (isShort ? 'SHORT' : 'LONG')
}

const getDynamicPriceClass = (price: unknown) => {
  const str = formatFullPrice(price)
  const len = str.length
  if (len > 14) return 'text-[10px]'
  if (len > 11) return 'text-xs'
  if (len > 8) return 'text-sm'
  if (len > 6) return 'text-base'
  return 'text-xl'
}

const translateTemporalUnit = (unit: string) => t(`genesis.virtualLog.units.${unit}`)


const currentTrades = computed(() => {
  return scopeTradesToSelectedVersion(tradeStore.getTradesForStrategy(selectedStrategyId.value))
})

const currentTradesForList = computed(() => {
  return scopeTradesToSelectedVersion(tradeStore.getAllTradesForStrategy(selectedStrategyId.value))
})

const timeTreeFilteredTrades = ref<any[] | null>(null)

const setListViewMode = (mode: 'list' | 'timeTree') => {
  viewType.value = mode
}

const clearTimeTreeFullscreenHintTimer = () => {
  if (!timeTreeFullscreenHintTimeout) return
  clearTimeout(timeTreeFullscreenHintTimeout)
  timeTreeFullscreenHintTimeout = null
}

const enterTimeTreeFullscreen = () => {
  if (viewType.value !== 'timeTree') return
  isTimeTreeFullscreen.value = true
  showTimeTreeFullscreenHint.value = true
  clearTimeTreeFullscreenHintTimer()
  timeTreeFullscreenHintTimeout = setTimeout(() => {
    showTimeTreeFullscreenHint.value = false
    timeTreeFullscreenHintTimeout = null
  }, 4000)
}

const exitTimeTreeFullscreen = () => {
  if (!isTimeTreeFullscreen.value) return
  isTimeTreeFullscreen.value = false
  showTimeTreeFullscreenHint.value = false
  clearTimeTreeFullscreenHintTimer()
}

const handleTimeTreeFullscreenKeydown = (e: KeyboardEvent) => {
  if (!isTimeTreeFullscreen.value || e.key !== 'Escape') return
  e.preventDefault()
  e.stopPropagation()
  e.stopImmediatePropagation()
  exitTimeTreeFullscreen()
}

const handleTimeTreeFilteredTrades = (trades: any[]) => {
  timeTreeFilteredTrades.value = Array.isArray(trades) ? trades : []
}

const handleListDisplaySettingsChange = (settings: { resultDisplayMode: 'currency' | 'percent'; colorMode: 'monochrome' | 'colorful' }) => {
  listResultDisplayMode.value = settings.resultDisplayMode
  listColorMode.value = settings.colorMode
}

const timeTreeSourceTrades = computed(() => timeTreeFilteredTrades.value ?? currentTradesForList.value)

const getTradeTimelineTimestamp = (trade: any) => {
  const rawDate = trade?.date || trade?.dateObj || trade?.createdAt || trade?.dateExit || trade?.dateEntryStr || trade?.dateTime
  const timestamp = new Date(rawDate).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

const formatTimeTreeDayKey = (timestamp: number) => {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatTimeTreeDayLabel = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).replace('.', '')
}

const formatTimeTreeWeekday = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    weekday: 'short'
  }).replace('.', '')
}

const formatTimeTreeTime = (timestamp: number) => {
  if (!timestamp) return '--:--'
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

const getTimeTreeSide = (side: unknown) => {
  const normalized = String(side || '').toLowerCase()
  if (normalized.includes('short') || normalized.includes('sell')) return 'SHORT'
  return 'LONG'
}

const formatSignedPercent = (value: number) => {
  if (!Number.isFinite(value)) return 'NaN%'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

const getTradeResultPercent = (trade: any) => {
  const explicitResult = Number(trade?.result)
  if (Number.isFinite(explicitResult)) return explicitResult

  const pnl = getTradePnlValue(trade)
  const strategyId = trade?.strategyId || selectedStrategyId.value
  const deposit = tradeStore.getInitialDeposit(strategyId) || 1000
  return deposit > 0 ? (pnl / deposit) * 100 : Number.NaN
}

const normalizeAssetSymbol = (asset: unknown) => String(asset || '').trim().toUpperCase()

const getAssetSymbolVariants = (asset: unknown) => {
  const symbol = normalizeAssetSymbol(asset)
  const compact = symbol.replace(/[^A-Z0-9]/g, '')
  const variants = new Set([symbol, compact])

  if (/^[A-Z]{6}$/.test(compact)) {
    variants.add(`${compact.slice(0, 3)}/${compact.slice(3)}`)
  }

  return variants
}

const resolveTimeTreeAssetIcon = (trade: any) => {
  const variants = getAssetSymbolVariants(trade?.asset || trade?.symbol || trade?.ticker)
  const assetData = (globalAssets as any[]).find((asset) => {
    const symbol = normalizeAssetSymbol(asset?.symbol)
    const name = normalizeAssetSymbol(asset?.name)
    const compactSymbol = symbol.replace(/[^A-Z0-9]/g, '')
    return variants.has(symbol) || variants.has(name) || variants.has(compactSymbol)
  })

  if (assetData?.icon) return assetData.icon

  const symbol = normalizeAssetSymbol(trade?.asset || trade?.symbol || trade?.ticker)
  return getIconForAsset(symbol, trade?.assetType || 'Crypto')
}

const getTimeTreeResultColor = (value: number) => {
  if (listColorMode.value !== 'colorful') return 'currentColor'
  if (!Number.isFinite(value) || value === 0) return 'currentColor'
  const intensity = Math.min(Math.abs(value) / 5, 1)
  if (value > 0) return `hsl(145 72% ${42 + intensity * 16}%)`
  return `hsl(350 78% ${48 + intensity * 12}%)`
}

const formatTimeTreeResult = (percentValue: number, currencyValue: number) => {
  if (listResultDisplayMode.value === 'currency') return formatDistributionCurrency(currencyValue)
  return formatSignedPercent(percentValue)
}

const hideBrokenAssetIcon = (event: Event) => {
  const image = event.currentTarget as HTMLImageElement | null
  if (image) image.style.display = 'none'
}

const timeTreeGroups = computed(() => {
  const groups = new Map<string, { key: string, timestamp: number, trades: any[] }>()

  timeTreeSourceTrades.value.forEach((trade: any) => {
    const timestamp = getTradeTimelineTimestamp(trade)
    if (!timestamp) return
    const key = formatTimeTreeDayKey(timestamp)
    if (!groups.has(key)) {
      groups.set(key, { key, timestamp, trades: [] })
    }
    const pnl = getTradePnlValue(trade)
    const resultValue = getTradeResultPercent(trade)
    groups.get(key)!.trades.push({
      id: String(trade?.id || `${key}-${groups.get(key)!.trades.length}`),
      asset: String(trade?.asset || 'UNKNOWN').toUpperCase(),
      assetIcon: resolveTimeTreeAssetIcon(trade),
      side: getTimeTreeSide(trade?.side || trade?.direction),
      pnl,
      resultLabel: formatTimeTreeResult(resultValue, pnl),
      resultColor: getTimeTreeResultColor(listResultDisplayMode.value === 'currency' ? pnl : resultValue),
      time: formatTimeTreeTime(timestamp),
      timestamp
    })
  })

  return Array.from(groups.values())
    .sort((left, right) => left.timestamp - right.timestamp)
    .map((group, index) => ({
      key: group.key,
      side: index % 2 === 0 ? 'left' : 'right',
      label: formatTimeTreeDayLabel(group.timestamp),
      weekday: formatTimeTreeWeekday(group.timestamp),
      trades: group.trades.sort((left, right) => left.timestamp - right.timestamp)
    }))
})

const patternForecastClosedTradesCount = computed(() => {
  return currentTrades.value.filter((trade: any) => {
    return Number.isFinite(new Date(trade?.date).getTime()) &&
      Number.isFinite(new Date(trade?.dateExit).getTime()) &&
      Number.isFinite(Number(trade?.profitInCurrency))
  }).length
})

const patternForecastIntroStats = computed(() => ({
  userTrades: patternForecastClosedTradesCount.value,
  minTrades: PATTERN_FORECAST_LIMITS.minUserTrades,
  historicalProfiles: PATTERN_FORECAST_LIMITS.historicalProfiles,
  maxMatches: PATTERN_FORECAST_LIMITS.maxMatches,
  horizonsLabel: PATTERN_FORECAST_LIMITS.horizons.join('/')
}))

const getTradePnlValue = (trade: any) => {
  const raw = trade?.profitInCurrency ?? trade?.pnl ?? trade?.result ?? 0
  const value = typeof raw === 'string' ? Number.parseFloat(raw) : Number(raw)
  return Number.isFinite(value) ? value : 0
}

const distributionMetricMode = ref<'pnl' | 'score'>('pnl')

const formatDistributionCurrency = (value: number) => {
  const sign = value > 0 ? '+' : ''
  return `${sign}$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

const formatDistributionValue = (value: number, withMetricLabel = false) => {
  if (distributionMetricMode.value === 'score') {
    const score = Math.min(Math.max(Math.round(value), 0), 100)
    return `${withMetricLabel ? 'SCORE ' : ''}${score}%`
  }
  return formatDistributionCurrency(value)
}

const tradeOverallScoreMap = computed(() => {
  const strategyId = selectedStrategyId.value
  const deposit = tradeStore.getInitialDeposit(strategyId) || 1000
  const scoredTrades = currentTrades.value
    .map((trade) => ({
      id: String(trade?.id || ''),
      rawScore: getTradeScore(trade, deposit)
    }))
    .filter(item => item.id && Number.isFinite(item.rawScore))

  if (scoredTrades.length === 0) return new Map<string, number>()

  const rawScores = scoredTrades.map(item => item.rawScore).sort((a, b) => a - b)

  return new Map(scoredTrades.map((item) => {
    const lowerScores = rawScores.filter(score => score < item.rawScore).length
    const overallScore = Math.round((lowerScores / scoredTrades.length) * 100)
    return [item.id, Math.min(Math.max(overallScore, 0), 100)]
  }))
})

const getTradeOverallScorePercent = (trade: any) => {
  const id = String(trade?.id || '')
  if (!id) return 0
  return tradeOverallScoreMap.value.get(id) ?? 0
}

const tradeDistributionBars = computed(() => {
  const getDistributionValue = (trade: any) => {
    if (distributionMetricMode.value === 'score') {
      return getTradeOverallScorePercent(trade)
    }
    return getTradePnlValue(trade)
  }

  const sortedTrades = [...filteredTrades.value]
    .map((trade) => ({
      trade,
      pnl: getTradePnlValue(trade),
      value: getDistributionValue(trade)
    }))
    .sort((a, b) => distributionMetricMode.value === 'score' ? b.value - a.value : a.value - b.value)

  const maxAbsValue = Math.max(1, ...sortedTrades.map(item => Math.abs(item.value)))

  return sortedTrades.map((item, index) => {
    const normalized = distributionMetricMode.value === 'score'
      ? Math.min(Math.max(item.value / 100, 0), 1)
      : Math.abs(item.value) / maxAbsValue
    const height = Math.max(3, normalized * 100)
    const asset = String(item.trade?.asset || 'UNKNOWN').toUpperCase()
    return {
      id: item.trade?.id || `${asset}-${index}`,
      trade: item.trade,
      pnl: item.pnl,
      value: item.value,
      asset,
      height,
      opacity: distributionMetricMode.value === 'score'
        ? Math.min(1, 0.18 + normalized * 0.72)
        : Math.min(1, 0.45 + normalized * 0.55),
      label: `${asset} ${formatDistributionValue(item.value, distributionMetricMode.value === 'score')}`
    }
  })
})

const tradeDistributionStats = computed(() => {
  const values = tradeDistributionBars.value.map(bar => bar.value)
  if (!values.length) {
    return { count: 0, min: 0, max: 0 }
  }
  return {
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values)
  }
})

const distributionCanvasRef = ref<HTMLCanvasElement | null>(null)
const INITIAL_DISTRIBUTION_ROTATION = { x: 0.087, y: 0 }
const INITIAL_DISTRIBUTION_SCALE = 1.35
const distributionRotation = ref({ ...INITIAL_DISTRIBUTION_ROTATION })
const distributionTargetRotation = ref({ ...INITIAL_DISTRIBUTION_ROTATION })
const distributionScale = ref(INITIAL_DISTRIBUTION_SCALE)
const isDistributionDragging = ref(false)
const didDistributionDrag = ref(false)
const distributionLastMousePos = ref({ x: 0, y: 0 })
const distributionMousePos = ref({ x: 0, y: 0 })
const hoveredDistributionBar = ref<any | null>(null)
const distributionHitAreas: Array<{ bar: any, x1: number, y1: number, x2: number, y2: number, depth: number }> = []

const resetDistributionView = () => {
  distributionRotation.value = { ...INITIAL_DISTRIBUTION_ROTATION }
  distributionTargetRotation.value = { ...INITIAL_DISTRIBUTION_ROTATION }
  distributionScale.value = INITIAL_DISTRIBUTION_SCALE
  hoveredDistributionBar.value = null
  isDistributionDragging.value = false
  didDistributionDrag.value = false
  distributionHitAreas.length = 0
}

watch(viewType, (next) => {
  if (next === 'distribution') resetDistributionView()
  if (next !== 'timeTree') exitTimeTreeFullscreen()
  if (next !== 'cube') clearCubeRevealAnimation()
})

const distributionTooltipStyle = computed(() => {
  const canvas = distributionCanvasRef.value
  const width = canvas?.clientWidth || 260
  const height = canvas?.clientHeight || 180
  const left = Math.min(Math.max(distributionMousePos.value.x + 14, 12), Math.max(12, width - 226))
  const top = Math.min(Math.max(distributionMousePos.value.y - 58, 12), Math.max(12, height - 74))
  return {
    left: `${left}px`,
    top: `${top}px`
  }
})

const activeMatrixNodes = computed(() => {
  const stratId = selectedStrategyId.value;
  return resolveRiskManagementForStrategy(matrixNodes.value, matrixConnections.value, stratId);
});

const getTradeRiskComponents = (trade: any) => {
  const configuredRisk = Number(trade?.risk)
  const hasConfiguredRisk = Number.isFinite(configuredRisk) && configuredRisk > 0
  const entryPrice = Number(trade?.entry)
  const stopPrice = Number(trade?.stopLoss)
  const size = Number(trade?.size) || 1
  const priceRisk = Number.isFinite(entryPrice) && Number.isFinite(stopPrice)
    ? Math.abs(entryPrice - stopPrice) * size
    : 0
  const positionRisk = Math.max(hasConfiguredRisk ? configuredRisk : 0, Number.isFinite(priceRisk) ? priceRisk : 0)
  const pnl = Number(trade?.profitInCurrency)
  const realizedLoss = Number.isFinite(pnl) && pnl < 0 ? Math.abs(pnl) : 0

  return {
    configuredRisk: hasConfiguredRisk ? configuredRisk : 0,
    priceRisk,
    positionRisk,
    realizedLoss
  }
}

const tradeViolatesRiskLimit = (trade: any, limit: number) => {
  if (!Number.isFinite(limit)) return false
  const risk = getTradeRiskComponents(trade)
  return risk.realizedLoss > limit || risk.positionRisk > limit
}

const complianceStats = computed<{ riskPerTrade: number, riskPerSession: number, tradingStyle: number }>(() => {
  const trades = currentTrades.value;
  if (trades.length === 0) return { riskPerTrade: 100, riskPerSession: 100, tradingStyle: 100 };

  let compliantTradeCount = 0;
  let compliantStyleCount = 0;

  const initDep = tradeStore.getInitialDeposit(selectedStrategyId.value) || 1000;
  
  const riskUnit = activeMatrixNodes.value.riskPerTradeUnit;
  const riskVal = activeMatrixNodes.value.riskPerTradeValue;

  const sessionRiskUnit = activeMatrixNodes.value.riskPerSessionUnit;
  const sessionRiskVal = activeMatrixNodes.value.riskPerSessionValue;

  const styleLimits: Record<number, { max?: number, min?: number }> = {
    0: { max: 1 },
    1: { min: 1, max: 14 },
    2: { min: 14 }
  };
  const extraType = activeMatrixNodes.value.tradingStyleExtraType;

  const sessionRiskMap: Record<string, { realizedLoss: number, positionRisk: number, balanceAtStart: number }> = {};

  const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let currentBalance = initDep;

  sortedTrades.forEach(t => {
    const maxRiskDollars = riskValueToDollars(riskVal, riskUnit, currentBalance);
    if (!tradeViolatesRiskLimit(t, maxRiskDollars)) compliantTradeCount++;

    // Trading Style
    let durationMins = 0;
    if (t.date && t.dateExit) {
      durationMins = (new Date(t.dateExit).getTime() - new Date(t.date).getTime()) / 60000;
    }
    const durationDays = durationMins / 60 / 24;
    let styleCompliant = true;
    if (extraType != null && styleLimits[extraType as keyof typeof styleLimits]) {
      const limit = styleLimits[extraType as keyof typeof styleLimits];
      if (limit) {
        if (limit.min !== undefined && durationDays < limit.min) styleCompliant = false;
        if (limit.max !== undefined && durationDays > limit.max) styleCompliant = false;
      }
    }
    if (styleCompliant) compliantStyleCount++;

    const risk = getTradeRiskComponents(t);
    const pnl = Number((t as any).profitInCurrency) || 0;
    const dateStr = new Date(t.date).toDateString();
    
    if (!sessionRiskMap[dateStr]) {
      sessionRiskMap[dateStr] = { realizedLoss: 0, positionRisk: 0, balanceAtStart: currentBalance };
    }
    sessionRiskMap[dateStr].realizedLoss += risk.realizedLoss;
    sessionRiskMap[dateStr].positionRisk += risk.positionRisk;

    currentBalance += pnl;
  });

  let validSessions = 0;
  const sessionKeys = Object.keys(sessionRiskMap);
  sessionKeys.forEach(k => {
    const sessionData = sessionRiskMap[k];
    if (!sessionData) return;
    const maxSessionRiskDollars = riskValueToDollars(sessionRiskVal, sessionRiskUnit, sessionData.balanceAtStart);
    if (sessionData.realizedLoss <= maxSessionRiskDollars && sessionData.positionRisk <= maxSessionRiskDollars) validSessions++;
  });

  return {
    riskPerTrade: (compliantTradeCount / trades.length) * 100,
    riskPerSession: sessionKeys.length > 0 ? (validSessions / sessionKeys.length) * 100 : 100,
    tradingStyle: (compliantStyleCount / trades.length) * 100
  };
});

const complianceViolations = computed(() => {
  const trades = currentTrades.value;
  if (trades.length === 0) return { violatingTrades: [], violatingSessions: [], violatingStyleTrades: [], violatingNeuralTrades: [] };

  const initDep = tradeStore.getInitialDeposit(selectedStrategyId.value) || 1000;
  
  const riskUnit = activeMatrixNodes.value.riskPerTradeUnit;
  const riskVal = activeMatrixNodes.value.riskPerTradeValue;

  const sessionRiskUnit = activeMatrixNodes.value.riskPerSessionUnit;
  const sessionRiskVal = activeMatrixNodes.value.riskPerSessionValue;

  const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let currentBalance = initDep;

  const styleLimits: Record<number, { max?: number, min?: number }> = {
    0: { max: 1 },
    1: { min: 1, max: 14 },
    2: { min: 14 }
  };
  const extraType = activeMatrixNodes.value.tradingStyleExtraType;

  const violatingTrades: any[] = [];
  const sessionRiskMap: Record<string, { date: string, realizedLoss: number, positionRisk: number, balanceAtStart: number, trades: any[] }> = {};
  const violatingStyleTrades: any[] = [];
  const violatingNeuralTrades: any[] = [];

  sortedTrades.forEach(t => {
    const maxRiskDollars = riskValueToDollars(riskVal, riskUnit, currentBalance);
    const risk = getTradeRiskComponents(t);

    if (risk.realizedLoss > maxRiskDollars || risk.positionRisk > maxRiskDollars) {
      violatingTrades.push({
        ...t,
        _realizedLoss: risk.realizedLoss,
        _positionRisk: risk.positionRisk,
        _maxRiskDollars: maxRiskDollars
      });
    }

    let durationMins = 0;
    if (t.date && t.dateExit) {
      durationMins = (new Date(t.dateExit).getTime() - new Date(t.date).getTime()) / 60000;
    }
    const durationDays = durationMins / 60 / 24;
    let styleCompliant = true;
    if (extraType != null && styleLimits[extraType as keyof typeof styleLimits]) {
      const limit = styleLimits[extraType as keyof typeof styleLimits];
      if (limit) {
        if (limit.min !== undefined && durationDays < limit.min) styleCompliant = false;
        if (limit.max !== undefined && durationDays > limit.max) styleCompliant = false;
      }
    }
    if (!styleCompliant) {
      violatingStyleTrades.push({
        ...t,
        _durationStr: (t as any).duration || 'N/A',
        _expectedStyle: extraType === 0 ? '< 1D (Scalping)' : (extraType === 1 ? '1-14D (Intraday)' : '> 14D (Swing)'),
      });
    }

    const emotions = t.emotions || [];
    if (emotions.length === 0) {
      violatingNeuralTrades.push({
        ...t,
        _neuralScore: 0,
        _neuralReason: 'NO EMOTIONS',
      });
    } else {
      let tradeScore = 60;
      emotions.forEach((e: any) => {
        const key = (typeof e === 'string' ? e : (e.name || '')).toUpperCase();
        const weight = EMOTION_WEIGHTS_STABILITY[key as keyof typeof EMOTION_WEIGHTS_STABILITY] || 0;
        tradeScore += weight;
      });
      const finalScore = Math.min(Math.max(Math.round(tradeScore), 0), 100);
      if (finalScore < 50) {
        violatingNeuralTrades.push({
          ...t,
          _neuralScore: finalScore,
          _neuralReason: 'SCORE < 50%',
        });
      }
    }

    const pnl = Number((t as any).profitInCurrency) || 0;
    const dateStr = new Date(t.date).toDateString();
    
    if (!sessionRiskMap[dateStr]) {
      sessionRiskMap[dateStr] = { date: dateStr, realizedLoss: 0, positionRisk: 0, balanceAtStart: currentBalance, trades: [] };
    }
    sessionRiskMap[dateStr].realizedLoss += risk.realizedLoss;
    sessionRiskMap[dateStr].positionRisk += risk.positionRisk;
    sessionRiskMap[dateStr].trades.push({
      ...t,
      _realizedLoss: risk.realizedLoss,
      _positionRisk: risk.positionRisk,
      _maxRiskDollars: maxRiskDollars
    });

    currentBalance += pnl;
  });

  const violatingSessions: any[] = [];
  Object.values(sessionRiskMap).forEach(sessionData => {
    const maxSessionRiskDollars = riskValueToDollars(sessionRiskVal, sessionRiskUnit, sessionData.balanceAtStart);
    if (sessionData.realizedLoss > maxSessionRiskDollars || sessionData.positionRisk > maxSessionRiskDollars) {
      const sViolatingTrades = sessionData.trades.filter((t: any) => t._realizedLoss > 0 || t._positionRisk > 0);
      violatingSessions.push({
        ...sessionData,
        _maxSessionRiskDollars: maxSessionRiskDollars,
        violatingTrades: sViolatingTrades
      });
    }
  });

  return {
    violatingTrades: violatingTrades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    violatingSessions: violatingSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    violatingStyleTrades: violatingStyleTrades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    violatingNeuralTrades: violatingNeuralTrades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  };
});

const expandedSessions = ref<Set<string>>(new Set());
const toggleSession = (date: string) => {
  const newSet = new Set(expandedSessions.value);
  if (newSet.has(date)) newSet.delete(date);
  else newSet.add(date);
  expandedSessions.value = newSet;
};

const emotionalStatus = computed(() => {
  const trades = currentTrades.value;
  
  if (trades.length === 0) return { score: 60, label: 'NEUTRAL', colorClass: 'bg-yellow-500', textClass: 'text-yellow-500' };

  let totalScore = 0;
  let count = 0;

  trades.forEach(t => {
    const emotions = t.emotions || [];
    if (emotions.length > 0) {
      let tradeScore = 60;
      emotions.forEach((e: any) => {
        const key = (typeof e === 'string' ? e : (e.name || '')).toUpperCase();
        const weight = EMOTION_WEIGHTS_STABILITY[key] || 0;
        tradeScore += weight;
      });
      totalScore += tradeScore;
      count++;
    }
  });

  if (count === 0) return { score: 60, label: 'NEUTRAL', colorClass: 'bg-yellow-500', textClass: 'text-yellow-500' };
  
  const avg = totalScore / count;
  
  if (avg < 40) return { score: avg, label: 'NEGATIVE', colorClass: 'bg-rose-500', textClass: 'text-rose-500' };
  if (avg > 70) return { score: avg, label: 'POSITIVE', colorClass: 'bg-emerald-500', textClass: 'text-emerald-500' };
  return { score: avg, label: 'NEUTRAL', colorClass: 'bg-yellow-500', textClass: 'text-yellow-500' };
});

const complianceMetricsConfigs = computed<MetricConfig[]>(() => [
  {
    key: 'riskPerTrade',
    label: locale.value === 'ru' ? 'РИСК_НА_СДЕЛКУ' : 'Risk_Per_Trade',
    sub: 'Compliance',
    desc: 'Adherence to max risk per trade.',
    formula: 'actual / limit',
    valStr: (m) => `${Math.round(m.riskPerTrade)}%`,
    colorClass: () => '',
    colorVal: (m, isDark) => {
      if (m.riskPerTrade >= 85) return isDark ? '#ffffff' : '#000000';
      if (m.riskPerTrade >= 40) return isDark ? '#fcd34d' : '#fbbf24';
      return isDark ? '#f87171' : '#dc2626';
    },
    evalStr: (m) => m.riskPerTrade >= 85 ? 'Optimal' : 'Violation',
    evalClass: () => '',
    benchmarks: [],
    category: 'Compliance'
  },
  {
    key: 'riskPerSession',
    label: locale.value === 'ru' ? 'РИСК_НА_СЕССИЮ' : 'Risk_Per_Session',
    sub: 'Compliance',
    desc: 'Adherence to session risk limits.',
    formula: 'actual / limit',
    valStr: (m) => `${Math.round(m.riskPerSession)}%`,
    colorClass: () => '',
    colorVal: (m, isDark) => {
      if (m.riskPerSession >= 85) return isDark ? '#ffffff' : '#000000';
      if (m.riskPerSession >= 40) return isDark ? '#fcd34d' : '#fbbf24';
      return isDark ? '#f87171' : '#dc2626';
    },
    evalStr: (m) => m.riskPerSession >= 85 ? 'Optimal' : 'Violation',
    evalClass: () => '',
    benchmarks: [],
    category: 'Compliance'
  },
  {
    key: 'tradingStyle',
    label: locale.value === 'ru' ? 'СТИЛЬ_ТОРГОВЛИ' : 'Trading_Style',
    sub: 'Compliance',
    desc: 'Adherence to defined trading style.',
    formula: 'actual / limit',
    valStr: (m) => `${Math.round(m.tradingStyle)}%`,
    colorClass: () => '',
    colorVal: (m, isDark) => {
      if (m.tradingStyle >= 85) return isDark ? '#ffffff' : '#000000';
      if (m.tradingStyle >= 40) return isDark ? '#fcd34d' : '#fbbf24';
      return isDark ? '#f87171' : '#dc2626';
    },
    evalStr: (m) => m.tradingStyle >= 85 ? 'Aligned' : 'Drifting',
    evalClass: () => '',
    benchmarks: [],
    category: 'Compliance'
  },
  {
    key: 'emotionalState',
    label: locale.value === 'ru' ? 'НЕЙРОСТАТУС' : 'Neural_Status',
    sub: 'Overall',
    desc: 'Emotional stability.',
    formula: 'avg(emotions)',
    valStr: (m) => m.emotionalStateLabel,
    colorClass: () => '',
    colorVal: (m, isDark) => {
      if (m.emotionalStateScore > 60) return isDark ? '#ffffff' : '#000000';
      if (m.emotionalStateScore > 40) return isDark ? '#fcd34d' : '#fbbf24';
      return isDark ? '#f87171' : '#dc2626';
    },
    evalStr: (m) => m.emotionalStateLabel,
    evalClass: () => '',
    benchmarks: [],
    category: 'Compliance'
  }
])

const complianceMetricsValues = computed(() => {
  return {
    riskPerTrade: complianceStats.value.riskPerTrade,
    riskPerSession: complianceStats.value.riskPerSession,
    tradingStyle: complianceStats.value.tradingStyle,
    emotionalStateScore: emotionalStatus.value.score || 50,
    emotionalStateLabel: locale.value === 'ru' 
      ? (emotionalStatus.value.label === 'NEGATIVE' ? 'НЕГАТИВНЫЙ' : emotionalStatus.value.label === 'POSITIVE' ? 'ПОЗИТИВНЫЙ' : 'НЕЙТРАЛЬНЫЙ') 
      : emotionalStatus.value.label
  }
})

const complianceDotColor = computed(() => {
  const v = complianceMetricsValues.value;
  // Check for red (critical)
  if (v.riskPerTrade < 40 || v.riskPerSession < 40 || v.tradingStyle < 40 || v.emotionalStateScore < 40) return 'bg-[#dc2626] dark:bg-[#f87171]';
  // Check for yellow (warning)
  if (v.riskPerTrade < 85 || v.riskPerSession < 85 || v.tradingStyle < 85 || v.emotionalStateScore < 60) return 'bg-[#fbbf24] dark:bg-[#fcd34d]';
  return null;
})

const toggleCapitalForecast = () => {
  if (!canOpenCapitalForecast.value) {
    showPaywall.value = true
    return
  }

  if (showCapitalForecast.value) {
    showCapitalForecast.value = false
    return
  }

  showCapitalForecastIntro.value = true
}

const acceptCapitalForecastIntro = () => {
  showCapitalForecastIntro.value = false
  showCapitalForecast.value = true
}

const rejectCapitalForecastIntro = () => {
  showCapitalForecastIntro.value = false
}

const calculateRR = (trade: any) => {
  if (!trade || !trade.entry || !trade.stopLoss || !trade.takeProfit) return '0.00'
  const entry = +trade.entry
  const sl = +trade.stopLoss
  const tp = +trade.takeProfit
  const risk = Math.abs(entry - sl)
  const reward = Math.abs(tp - entry)
  if (risk === 0) return '∞'
  return (reward / risk).toFixed(2)
}

const getEntryFeeDisplay = (trade: any) => {
  if (!trade || (!trade.entryFee && trade.entryFee !== 0)) return '0$'
  if (trade.feeType === '%') {
    return parseFloat((((+trade.entry * +trade.entryFee) / 100)).toFixed(8)).toString() + '$'
  }
  return parseFloat((+trade.entryFee).toFixed(8)).toString() + '$'
}

const getExitFeeDisplay = (trade: any) => {
  if (!trade || (!trade.exitFee && trade.exitFee !== 0)) return '0$'
  if (trade.feeType === '%') {
    return parseFloat((((+trade.exit * +trade.exitFee) / 100)).toFixed(8)).toString() + '$'
  }
  return parseFloat((+trade.exitFee).toFixed(8)).toString() + '$'
}

const calculateDuration = (trade: any) => {
  if (!trade || !trade.date || !trade.dateExit) return t('genesis.virtualLog.notAvailable')
  const start = new Date(trade.date).getTime()
  const end = new Date(trade.dateExit).getTime()
  const diff = end - start
  if (diff < 0) return '0M'
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}D ${hours % 24}H`
  if (hours > 0) return `${hours}H ${minutes % 60}M`
  return `${minutes}M`
}

const filterSide = ref<'ALL' | 'Long' | 'Short'>('ALL')
const filterAsset = ref<string>('ALL')
const filterPnL = ref<'ALL' | 'PROFIT' | 'LOSS'>('ALL')
const filterRR = ref<'ALL' | '> 2R' | '> 3R' | '< 1R'>('ALL')
const filterDate = ref<'ALL' | 'TODAY' | '7D' | '30D' | 'CUSTOM'>('ALL')
const filterTime = ref<'ALL' | 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'CUSTOM'>('ALL')
const searchQuery = ref<string>('')

const cubeSearchQuery = ref('')
const showCubeSearchText = ref(false)
let cubeSearchTimeout: any = null

const handleGlobalKeydown = (e: KeyboardEvent) => {
  if (showNodeMap.value || showExtraDetails.value || viewType.value !== 'cube') return
  
  const target = e.target as HTMLElement
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

  if (e.key === 'Backspace') {
    if (!showCubeSearchText.value && cubeSearchQuery.value.length > 0) {
      cubeSearchQuery.value = ''
    } else {
      cubeSearchQuery.value = cubeSearchQuery.value.slice(0, -1)
    }
    showCubeSearchText.value = true
  } else if (e.key === 'Escape') {
    cubeSearchQuery.value = ''
    showCubeSearchText.value = true
  } else if (e.key.length === 1 && /[a-zA-Z0-9 ]/.test(e.key)) {
    if (!showCubeSearchText.value && cubeSearchQuery.value.length > 0) {
      cubeSearchQuery.value = '' // Clear if they start typing a new query after the old one disappeared
    }
    cubeSearchQuery.value += e.key
    showCubeSearchText.value = true
  } else {
    return
  }
  
  if (cubeSearchTimeout) clearTimeout(cubeSearchTimeout)
  if (cubeSearchQuery.value.length > 0) {
    cubeSearchTimeout = setTimeout(() => {
      showCubeSearchText.value = false
    }, 2000)
  } else {
    showCubeSearchText.value = false
  }
}

// Temporal Filter State
const customDate = ref(new Date())
const isTemporalOpen = ref(false)
const activeTemporalTarget = ref('open') // Reused for modal title/mode consistency
const tempDateParts = ref<Record<string, string>>({ day: '01', month: '01', year: '2024', hour: '00', minute: '00' })

const formatPart = (date: any, unit: string) => {
  const d = new Date(date)
  if (unit === 'year') return d.getFullYear()
  if (unit === 'month') return (d.getMonth() + 1).toString().padStart(2, '0')
  if (unit === 'day') return d.getDate().toString().padStart(2, '0')
  if (unit === 'hour') return d.getHours().toString().padStart(2, '0')
  if (unit === 'minute') return d.getMinutes().toString().padStart(2, '0')
  return ''
}

const syncTempParts = () => {
  const d = customDate.value
  const parts: Record<string, string> = {
    day: formatPart(d, 'day') as string,
    month: formatPart(d, 'month') as string,
    year: formatPart(d, 'year').toString(),
    hour: formatPart(d, 'hour') as string,
    minute: formatPart(d, 'minute') as string
  }
  Object.keys(parts).forEach(k => {
    if (parseInt(tempDateParts.value[k]!) !== parseInt(parts[k]!)) {
      tempDateParts.value[k] = parts[k]!
    }
  })
}

const openTemporal = (target = 'open') => {
  activeTemporalTarget.value = target
  syncTempParts()
  isTemporalOpen.value = true
}

const adjustDate = (target: string, unit: string, delta: number) => {
  const d = new Date(customDate.value)
  if (unit === 'year') d.setFullYear(d.getFullYear() + delta)
  if (unit === 'month') {
    let m = d.getMonth() + delta
    if (m > 11) m = 0
    if (m < 0) m = 11
    const currentDay = d.getDate()
    d.setDate(1)
    d.setMonth(m)
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(currentDay, lastDay))
  }
  if (unit === 'day') {
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    let day = d.getDate() + delta
    if (day > lastDay) day = 1
    if (day < 1) day = lastDay
    d.setDate(day)
  }
  if (unit === 'hour') {
    let h = d.getHours() + delta
    if (h > 23) h = 0
    if (h < 0) h = 23
    d.setHours(h)
  }
  if (unit === 'minute') {
    let m = d.getMinutes() + delta
    if (m > 59) m = 0
    if (m < 0) m = 59
    d.setMinutes(m)
  }
  customDate.value = new Date(d)
  syncTempParts()
}

const handleManualDate = (target: string, unit: string, val: string) => {
  let processedVal = val
  let v = parseInt(val)

  if (!isNaN(v)) {
    if (unit === 'month') {
      if (v > 12) { v = 12; processedVal = '12' }
    }
    if (unit === 'day') {
      const p = tempDateParts.value as any
      const year = parseInt(p.year) || new Date().getFullYear()
      const month = parseInt(p.month) || 1
      const lastDay = new Date(year, month, 0).getDate()
      if (v > lastDay) { v = lastDay; processedVal = lastDay.toString().padStart(2, '0') }
    }
    if (unit === 'hour') { if (v > 23) { v = 23; processedVal = '23' } }
    if (unit === 'minute') { if (v > 59) { v = 59; processedVal = '59' } }
  }

  (tempDateParts.value as any)[unit] = processedVal
  
  const p = tempDateParts.value as any
  const year = parseInt(p.year)
  const month = parseInt(p.month)
  const day = parseInt(p.day)
  const hour = parseInt(p.hour)
  const minute = parseInt(p.minute)
  
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) return
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) return

  const d = new Date(year, month - 1, 1, hour, minute)
  const lastDay = new Date(year, month, 0).getDate()
  d.setDate(Math.min(day, lastDay))

  customDate.value = d
}

const availableAssets = computed(() => {
  const assets = new Set(currentTrades.value.map(t => t.asset).filter((a): a is string => Boolean(a)))
  return ['ALL', ...Array.from(assets)]
})

const filteredTrades = computed(() => {
  return currentTrades.value.filter(t => {
    // Side Filter
    if (filterSide.value !== 'ALL' && t.side !== filterSide.value) return false
    
    // Asset Filter
    if (filterAsset.value !== 'ALL' && t.asset !== filterAsset.value) return false
    
    // PnL Filter
    const pnl = t.profitInCurrency || 0
    if (filterPnL.value === 'PROFIT' && pnl < 0) return false
    if (filterPnL.value === 'LOSS' && pnl >= 0) return false

    // R:R Filter
    if (filterRR.value !== 'ALL') {
      const rrVal = parseFloat(calculateRR(t))
      if (!isNaN(rrVal)) {
        if (filterRR.value === '> 2R' && rrVal <= 2) return false
        if (filterRR.value === '> 3R' && rrVal <= 3) return false
        if (filterRR.value === '< 1R' && rrVal >= 1) return false
      } else {
        return false
      }
    }

    // Date Horizon Filter
    if (filterDate.value !== 'ALL') {
      if (!t.date) return false
      const tradeDate = new Date(t.date)
      if (filterDate.value === 'CUSTOM') {
        const custom = customDate.value
        if (tradeDate.getFullYear() !== custom.getFullYear() ||
            tradeDate.getMonth() !== custom.getMonth() ||
            tradeDate.getDate() !== custom.getDate()) {
          return false
        }
      } else {
        const now = new Date()
        const diffTime = now.getTime() - tradeDate.getTime()
        const diffDays = diffTime / (1000 * 3600 * 24)
        
        if (filterDate.value === 'TODAY' && diffDays > 1) return false
        if (filterDate.value === '7D' && diffDays > 7) return false
        if (filterDate.value === '30D' && diffDays > 30) return false
      }
    }

    // Time of Day Filter (based on execution hour)
    if (filterTime.value !== 'ALL') {
      if (!t.date) return false
      const hour = new Date(t.date).getHours()
      if (filterTime.value === 'CUSTOM') {
        const customHour = customDate.value.getHours()
        if (hour !== customHour) return false
      } else {
        if (filterTime.value === 'MORNING' && (hour < 6 || hour >= 12)) return false
        if (filterTime.value === 'AFTERNOON' && (hour < 12 || hour >= 18)) return false
        if (filterTime.value === 'NIGHT' && (hour >= 6 && hour < 18)) return false
      }
    }

    // Search Query
    if (searchQuery.value.trim() !== '') {
      const q = searchQuery.value.toLowerCase()
      const assetMatch = (t.asset || '').toLowerCase().includes(q)
      const notesMatch = (t.notes || '').toLowerCase().includes(q)
      if (!assetMatch && !notesMatch) return false
    }

    // Cube Typed Query
    if (cubeSearchQuery.value.trim() !== '') {
      const q = cubeSearchQuery.value.toLowerCase()
      const assetMatch = (t.asset || '').toLowerCase().includes(q)
      const notesMatch = (t.notes || '').toLowerCase().includes(q)
      if (!assetMatch && !notesMatch) return false
    }

    return true
  })
})

const hasActiveFilters = computed(() => {
  return filterSide.value !== 'ALL' || 
         filterAsset.value !== 'ALL' || 
         filterPnL.value !== 'ALL' || 
         filterRR.value !== 'ALL' || 
         filterDate.value !== 'ALL' || 
         filterTime.value !== 'ALL' || 
         searchQuery.value.trim() !== ''
})

const resetAllFilters = () => {
  filterSide.value = 'ALL'
  filterAsset.value = 'ALL'
  filterPnL.value = 'ALL'
  filterRR.value = 'ALL'
  filterDate.value = 'ALL'
  filterTime.value = 'ALL'
  searchQuery.value = ''
}

const selectedTrade = computed(() => {
  if (!selectedTradeId.value) return null
  return currentTrades.value.find(t => t.id === selectedTradeId.value) ||
    currentTradesForList.value.find(t => t.id === selectedTradeId.value) ||
    null
})

watch(selectedTradeId, () => {
  imageLoadError.value = false
})

const assetIcon = computed(() => {
  const trade = selectedTrade.value
  if (!trade) return null
  
  const assetName = trade.asset || ""
  const assetData = (globalAssets as any[]).find(a => 
    a.symbol.toUpperCase() === assetName.toUpperCase() ||
    a.name.toUpperCase() === assetName.toUpperCase()
  )
  
  if (assetData?.icon) return assetData.icon
  return getIconForAsset(assetName, trade.assetType || 'Crypto')
})

// --- 3D MATH TYPES --- //
interface Point3D { x: number; y: number; z: number }
interface Point2D { x: number; y: number; opacity: number; depth: number }

interface TradeNode {
  id: string
  label: string
  faceIndex: number
  localPos: { x: number; y: number } // -100 to 100
  worldPos: Point3D
  neighbors?: number[]
  date?: string | Date
  isNote?: boolean
  parentId?: string
}

// --- STATE --- //
const canvasRef = ref<HTMLCanvasElement | null>(null)
const currentFace = ref(0)
const isTransitioning = ref(false)

// Cube rotation state
const targetRotation = ref({ x: 0, y: 0 }) 
const currentRotation = ref({ x: 0, y: 0 })

// Trade mapping
const facesTrades = ref<TradeNode[][]>([[], [], [], [], [], []])
const internalNodes = ref<TradeNode[]>([])

const revealProgress = ref(0)
const cubeRevealAnimationStart = ref<number | null>(null)
const cubeRevealAnimationFace = ref<number | null>(null)
const cubeRevealAnimationOrder = ref<string[]>([])
let cubeRevealAnimationTimeout: ReturnType<typeof setTimeout> | null = null
const tradeStore = useStrategyTradesStore()
const selectedStrategyId = computed({
  get: () => tradeStore.selectedStrategyId,
  set: (val) => { tradeStore.selectedStrategyId = val }
})

const isMainDiaryStrategy = computed(() => selectedStrategyId.value === 'MAIN_DIARY')

watch(isMainDiaryStrategy, (isMainDiary) => {
  if (isMainDiary && distributionMetricMode.value === 'score') {
    distributionMetricMode.value = 'pnl'
  }
}, { immediate: true })

const formatCubeTradeAssetLabel = (asset?: string) => {
  return String(asset || '').toUpperCase()
}

const isMatrixLoading = ref(true)
const showStrategyMenu = ref(false)

const getStats = (id: string, allTrades: any[], scenarioId?: string | null) => {
  const presentIn = allTrades.filter(tr => tradeMatchesProtocol(tr, id, scenarioId))
  const count = presentIn.length
  const freq = allTrades.length > 0 ? count / allTrades.length : 0
  
  let gProf = 0, gLoss = 0
  presentIn.forEach(tr => {
    const p = tr.profitInCurrency || 0
    if (p > 0) gProf += p
    else gLoss += Math.abs(p)
  })
  const pf = gLoss === 0 ? (gProf > 0 ? 5.0 : 1.0) : gProf / gLoss
  return { freq, pf }
}

const getHistory = (id: string, allTrades: any[], scenarioId?: string | null) => {
  return calculateTacticalHistory(id, allTrades, scenarioId)
}




const selectStrategy = (id: string) => {
  selectedStrategyId.value = id
  showStrategyMenu.value = false
  const riskManagement = resolveRiskManagementForStrategy(matrixNodes.value, matrixConnections.value, id)
}

const strategies = computed(() => tradeStore.strategies)

const selectedStrategy = computed(() => {
  return tradeStore.strategies.find(s => s.id === selectedStrategyId.value) || tradeStore.strategies[0] || { id: 'MAIN_DIARY', name: 'MAIN_DIARY' }
})
const selectedStrategyLabel = computed(() => {
  const name = selectedStrategy.value?.name || 'MAIN_DIARY'
  return name === 'MAIN_DIARY' ? t('genesis.virtualLog.mainDiary') : name
})

const shareCardProtocol = computed(() => {
  const stratId = selectedStrategyId.value
  if (!stratId || stratId === 'MAIN_DIARY') return 'ANY'

  const label = resolveRiskManagementForStrategy(matrixNodes.value, matrixConnections.value, stratId).tradingStyle
  if (!label) return 'ANY'

  if (label.includes('SWING')) return 'SWING'
  if (label.includes('INVEST')) return 'INVESTING'
  if (label.includes('DAY')) return 'DAYTRADING'
  return label
})

const EMOTION_WEIGHTS_LOCAL = {
  'CONFIDENCE': 10, 'PATIENCE': 15, 'DISCIPLINE': 20,
  'FOMO': -20, 'GREED': -25, 'REVENGE': -30, 'FEAR': -15, 'TILT': -40, 'ANXIETY': -15
} as Record<string, number>

const getNormalizedPnl = (tr: any, initialDeposit = 1000) => {
  let p = tr.profitInCurrency
  if (p === undefined || p === null || p === 0) {
    p = tr.result ?? tr.pnl ?? 0
  }
  const val = Number(p)
  if (isNaN(val)) return 0
  
  if ((tr.profitInCurrency === undefined || tr.profitInCurrency === null || tr.profitInCurrency === 0) && 
      Math.abs(val) < 100 && initialDeposit > 1000) {
    return (val / 100) * initialDeposit
  }
  return val
}

const getTradeScore = (tr: any, initialDeposit = 1000) => {
  const pnl = getNormalizedPnl(tr, initialDeposit)
  let emotionalScore = 0
  if (tr && tr.emotions && Array.isArray(tr.emotions)) {
    tr.emotions.forEach((e: any) => {
      const key = (typeof e === 'string' ? e : (e.name || '')).toUpperCase()
      emotionalScore += EMOTION_WEIGHTS_LOCAL[key] || 0
    })
  }
  return pnl + emotionalScore
}

const mappedTradeForAnalysis = computed(() => {
  const t = selectedTrade.value as any
  if (!t) return undefined
  
  const allTrades = currentTrades.value
  const totalCount = allTrades.length

  const stratId = t.strategyId || selectedStrategyId.value
  const deposit = tradeStore.getInitialDeposit(stratId)
  const currentScore = getTradeScore(t, deposit)
  const scores = allTrades.map(tr => getTradeScore(tr, deposit)).sort((a, b) => a - b)
  const lowerScores = scores.filter(s => s < currentScore).length
  const percentileRank = totalCount > 0 ? Math.round((lowerScores / totalCount) * 100) : 0

  return {
    ...t,
    percentileRank,
    pnl: t.profitInCurrency || 0,
    scenarios: [
      ...(t.boardScenarioEntry ? [{ ...t.boardScenarioEntry, type: 'entry' }] : []),
      ...(t.boardScenarioExit ? [{ ...t.boardScenarioExit, type: 'exit' }] : [])
    ].map(s => {
      const sStats = getStats(s.id, allTrades)
      const sHistory = getHistory(s.id, allTrades)
      return {
        id: s.id,
        name: (s as any).info?.name || 'Unknown Protocol',
        type: (s as any).type as 'entry' | 'exit',
        frequency: sStats.freq,
        profitability: sStats.pf,
        history: sHistory,
        conditions: ((s as any).info?.conditions || []).map((c: any) => {
          const cId = typeof c === 'object' ? c.id : String(c)
          const cStats = getStats(cId, allTrades, s.id)
          const cHistory = getHistory(cId, allTrades, s.id)
          return {
            id: cId,
            name: typeof c === 'object' ? c.info?.name : String(c),
            frequency: cStats.freq,
            profitability: cStats.pf,
            history: cHistory
          }
        })
      }
    }),
    emotions: (t.emotions || []).map((name: string) => {
      const stats = getStats(name, allTrades)
      const history = getHistory(name, allTrades)
      return {
        name,
        frequency: stats.freq,
        profitability: stats.pf,
        history
      }
    }),
    rr: +calculateRR(t)
  }
})

const handleRemoveTrade = async (tradeId: string) => {
  if (!selectedStrategyId.value) return
  await tradeStore.removeTrade(selectedStrategyId.value, tradeId)
  if (selectedTradeId.value === tradeId) {
    selectedTradeId.value = null
  }
}

watch([matrixNodes, () => tradeStore.isLoading], ([nodes, loading]) => {
  if (loading) return
  const cores = (nodes as any[])
    .filter(n => n.type === 'strategy' || n.type === 'system')
    .map(n => ({
      id: n.id,
      name: (n.params?.customName || n.label).toUpperCase()
    }))
  tradeStore.syncStrategies(cores)
}, { immediate: true, deep: true })

const activeFaceIndices = computed(() => {
  return facesTrades.value
    .map((face, index) => face.some(n => !n.id.startsWith('ghost_')) ? index : -1)
    .filter(index => index !== -1)
})

const isCubeRevealAnimating = computed(() => cubeRevealAnimationStart.value !== null)

const easeOutCubic = (value: number) => {
  const clamped = Math.min(1, Math.max(0, value))
  return 1 - Math.pow(1 - clamped, 3)
}

const clearCubeRevealAnimation = () => {
  if (cubeRevealAnimationTimeout) {
    clearTimeout(cubeRevealAnimationTimeout)
    cubeRevealAnimationTimeout = null
  }
  cubeRevealAnimationStart.value = null
  cubeRevealAnimationFace.value = null
  cubeRevealAnimationOrder.value = []
}

const getCubeRevealProgress = (node: TradeNode) => {
  const start = cubeRevealAnimationStart.value
  if (start === null || cubeRevealAnimationFace.value !== currentFace.value || node.faceIndex !== cubeRevealAnimationFace.value) {
    return { icon: 1, label: 1 }
  }

  const lookupId = node.isNote && node.parentId ? node.parentId : node.id
  const index = cubeRevealAnimationOrder.value.indexOf(lookupId)
  if (index === -1) return { icon: 1, label: 1 }

  const elapsed = performance.now() - start
  const nodeDelay = 2000 + index * 1000
  const icon = easeOutCubic((elapsed - nodeDelay) / 650)
  const label = easeOutCubic((elapsed - nodeDelay - 360) / 650)
  return { icon, label }
}

const startCubeRevealAnimation = () => {
  if (viewType.value !== 'cube') return

  const pageTradeNodes = chronologicalPathNodes.value
    .filter(node => node.faceIndex === currentFace.value && !node.isNote)

  if (pageTradeNodes.length === 0) return

  clearCubeRevealAnimation()
  cubeRevealAnimationFace.value = currentFace.value
  cubeRevealAnimationOrder.value = pageTradeNodes.map(node => node.id)
  cubeRevealAnimationStart.value = performance.now()

  const totalDuration = 2000 + Math.max(0, pageTradeNodes.length - 1) * 1000 + 1200
  cubeRevealAnimationTimeout = setTimeout(() => {
    clearCubeRevealAnimation()
  }, totalDuration)
}

const toggleCubeRevealAnimation = () => {
  if (isCubeRevealAnimating.value) {
    clearCubeRevealAnimation()
    return
  }

  startCubeRevealAnimation()
}


// Immediate update when trades are added, strategy changes, or filters are modified
watch([selectedStrategyId, filteredTrades, cubeSearchQuery], () => {
  clearCubeRevealAnimation()
  initTrades()
}, { deep: true })

const viewScale = ref(2.2) 
const isPanning = ref(false)
const draggedNode = ref<TradeNode | null>(null)
const lastMousePos = ref({ x: 0, y: 0 })
const viewOffset = ref({ x: 0, y: 0 })

// --- INITIALIZATION --- //
const calculateWorldPos = (faceIndex: number, localX: number, localY: number): Point3D => {
  const S = 100
  switch(faceIndex) {
    case 0: return { x: localX, y: localY, z: -S } // Front
    case 1: return { x: S, y: localY, z: localX }  // Right
    case 2: return { x: -localX, y: localY, z: S } // Back
    case 3: return { x: -S, y: localY, z: -localX } // Left
    case 4: return { x: localX, y: -S, z: localY } // Top
    case 5: return { x: localX, y: S, z: -localY } // Bottom
    default: return { x: 0, y: 0, z: 0 }
  }
}

const switchFace = (newIndex: number) => {
  clearCubeRevealAnimation()
  currentFace.value = newIndex
  isTransitioning.value = true
  
  const orientation = ((newIndex % 6) + 6) % 6
  switch(orientation) {
    case 0: targetRotation.value.x = 0; targetRotation.value.y = 0; break;
    case 1: targetRotation.value.x = 0; targetRotation.value.y = Math.PI / 2; break;
    case 2: targetRotation.value.x = 0; targetRotation.value.y = Math.PI; break;
    case 3: targetRotation.value.x = 0; targetRotation.value.y = -Math.PI / 2; break;
    case 4: targetRotation.value.x = Math.PI / 2; targetRotation.value.y = 0; break;
    case 5: targetRotation.value.x = -Math.PI / 2; targetRotation.value.y = 0; break;
  }
  
  setTimeout(() => { isTransitioning.value = false }, 800)
}

const prevCubePage = () => {
  const totalPages = facesTrades.value.length || 1
  const newIndex = (currentFace.value - 1 + totalPages) % totalPages
  switchFace(newIndex)
}

const nextCubePage = () => {
  const totalPages = facesTrades.value.length || 1
  const newIndex = (currentFace.value + 1) % totalPages
  switchFace(newIndex)
}

const initTrades = () => {
  // --- CUBE INITIALIZATION --- //
  const tradesForCube = [...filteredTrades.value].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  // Build pages based on the 30-node maximum limit rule
  const cubePages: any[][] = []
  let currentCubePageTrades: any[] = []
  let currentNodeCount = 0

  for (const t of tradesForCube) {
    const noteCount = t.notesList ? t.notesList.length : 0
    const nodesForTrade = 1 + noteCount

    currentCubePageTrades.push(t)
    currentNodeCount += nodesForTrade

    if (currentNodeCount >= 30) {
      cubePages.push(currentCubePageTrades)
      currentCubePageTrades = []
      currentNodeCount = 0
    }
  }
  if (currentCubePageTrades.length > 0) {
    cubePages.push(currentCubePageTrades)
  }
  if (cubePages.length === 0) {
    cubePages.push([])
  }

  facesTrades.value = []
  cubePages.forEach((realTradesForThisFace, i) => {
    const nodes: TradeNode[] = []
    
    realTradesForThisFace.forEach((t) => {
      let localX = 0
      let localY = 0
      let attempts = 0
      const minDistance = 25

      while (attempts < 100) {
         localX = (Math.random() - 0.5) * 160
         localY = (Math.random() - 0.5) * 160
         
         let collision = false
         for (const existingNode of nodes) {
            const dist = Math.sqrt((localX - existingNode.localPos.x) ** 2 + (localY - existingNode.localPos.y) ** 2)
            if (dist < minDistance) {
               collision = true
               break
            }
         }
         
         if (!collision) break
         attempts++
      }

      nodes.push({
        id: t.id!,
        label: `${formatCubeTradeAssetLabel(t.asset)} [${(t.profitInCurrency ?? 0) >= 0 ? '+' : ''}${Number(t.profitInCurrency ?? 0).toFixed(2)}$]`,
        faceIndex: i,
        localPos: { x: localX, y: localY },
        worldPos: calculateWorldPos(i, localX, localY),
        date: t.date,
        isNote: false
      })

      // Add child nodes for notes
      if (t.notesList && t.notesList.length > 0) {
        t.notesList.forEach((note: any, noteIdx: number) => {
          const offsetRadius = 25 + Math.random() * 10
          const angle = (Math.PI * 2 / t.notesList!.length) * noteIdx
          
          const nLocalX = localX + Math.cos(angle) * offsetRadius
          const nLocalY = localY + Math.sin(angle) * offsetRadius

          nodes.push({
             id: `note_${t.id}_${note.id}`,
             label: note.title || 'POST_MORTEM',
             faceIndex: i,
             localPos: { x: nLocalX, y: nLocalY },
             worldPos: calculateWorldPos(i, nLocalX, nLocalY),
             isNote: true,
             parentId: t.id
          })
        })
      }
    })

    facesTrades.value[i] = nodes
  })

  // --- INTERNAL NEURAL CORE NETWORK --- //
  const innerNodes: TradeNode[] = []
  for (let i = 0; i < 60; i++) {
    const rx = (Math.random() - 0.5) * 140
    const ry = (Math.random() - 0.5) * 140
    const rz = (Math.random() - 0.5) * 140
    innerNodes.push({
      id: `inner_${i}`,
      label: `CORE_VULT_${i}`,
      faceIndex: -1,
      localPos: { x: 0, y: 0 },
      worldPos: { x: rx, y: ry, z: rz },
      neighbors: []
    })
  }

  innerNodes.forEach((node, i) => {
    const distances = innerNodes
      .map((other, idx) => ({ 
        idx, 
        dist: i === idx ? Infinity : Math.sqrt(
          (node.worldPos.x - other.worldPos.x)**2 + 
          (node.worldPos.y - other.worldPos.y)**2 + 
          (node.worldPos.z - other.worldPos.z)**2
        ) 
      }))
      .sort((a, b) => a.dist - b.dist)
    node.neighbors = distances.slice(0, 3).map(d => d.idx)
  })
  
  internalNodes.value = innerNodes



  if (activeFaceIndices.value.length > 0 && !activeFaceIndices.value.includes(currentFace.value)) {
    currentFace.value = activeFaceIndices.value[0]!
    switchFace(currentFace.value)
  }
}

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

const projectDistributionPoint = (p: Point3D, width: number, height: number): Point2D => {
  const focalLength = 900
  const z = Math.max(-850, p.z)
  const scale = focalLength / (focalLength + z)
  return {
    x: p.x * scale + width / 2,
    y: p.y * scale + height * 0.68,
    opacity: Math.max(0.18, (900 - z) / 1300),
    depth: p.z
  }
}

const getDistributionFaceColor = (pnl: number, face: 'front' | 'back' | 'side' | 'top' | 'bottom', active: boolean, scoreOpacity?: number) => {
  const boost = active ? 0.14 : 0
  if (distributionMetricMode.value === 'score') {
    const opacity = Math.min(1, (scoreOpacity ?? 0.45) + boost)
    if (face === 'top') return `rgba(255, 255, 255, ${Math.min(1, opacity + 0.08)})`
    if (face === 'bottom') return `rgba(255, 255, 255, ${Math.max(0.06, opacity - 0.2)})`
    if (face === 'back') return `rgba(255, 255, 255, ${Math.max(0.07, opacity - 0.16)})`
    if (face === 'side') return `rgba(255, 255, 255, ${Math.max(0.08, opacity - 0.12)})`
    return `rgba(255, 255, 255, ${opacity})`
  }
  if (pnl < 0) {
    if (face === 'top') return `rgba(251, 113, 133, ${0.34 + boost})`
    if (face === 'bottom') return `rgba(127, 29, 29, ${0.18 + boost})`
    if (face === 'back') return `rgba(159, 18, 57, ${0.24 + boost})`
    if (face === 'side') return `rgba(190, 18, 60, ${0.26 + boost})`
    return `rgba(244, 63, 94, ${0.38 + boost})`
  }
  if (pnl > 0) {
    if (face === 'top') return `rgba(110, 231, 183, ${0.34 + boost})`
    if (face === 'bottom') return `rgba(6, 78, 59, ${0.18 + boost})`
    if (face === 'back') return `rgba(4, 120, 87, ${0.24 + boost})`
    if (face === 'side') return `rgba(5, 150, 105, ${0.26 + boost})`
    return `rgba(16, 185, 129, ${0.38 + boost})`
  }
  return isDark.value ? `rgba(255, 255, 255, ${0.16 + boost})` : `rgba(0, 0, 0, ${0.14 + boost})`
}

const drawDistributionPoly = (
  ctx: CanvasRenderingContext2D,
  points: Point2D[],
  fill: string,
  stroke: string
) => {
  if (!points.length) return
  ctx.beginPath()
  ctx.moveTo(points[0]!.x, points[0]!.y)
  points.slice(1).forEach(point => ctx.lineTo(point.x, point.y))
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 0.65
  ctx.stroke()
}

const renderDistributionChart = () => {
  const canvas = distributionCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (width <= 0 || height <= 0) return

  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  distributionRotation.value.x += (distributionTargetRotation.value.x - distributionRotation.value.x) * 0.08
  distributionRotation.value.y += (distributionTargetRotation.value.y - distributionRotation.value.y) * 0.08

  const bars = tradeDistributionBars.value
  distributionHitAreas.length = 0
  if (!bars.length) return

  const chartWidth = Math.max(320, width * 0.92)
  const slot = Math.min(26, Math.max(2.4, chartWidth / bars.length))
  const barWidth = Math.max(1.4, slot * 0.68)
  const barDepth = Math.min(30, Math.max(8, slot * 1.25))
  const maxWorldHeight = Math.min(300, Math.max(120, height * 0.42))
  const worldScale = distributionScale.value
  const stroke = isDark.value ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)'

  const transform = (point: Point3D) => {
    let p = rotateY(point, distributionRotation.value.y)
    p = rotateX(p, distributionRotation.value.x)
    p.x *= worldScale
    p.y *= worldScale
    p.z *= worldScale
    return p
  }
  const projectLocal = (point: Point3D) => projectDistributionPoint(transform(point), width, height)

  ctx.save()
  const gridColor = isDark.value ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const axisColor = isDark.value ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'
  const gridHalfWidth = chartWidth / 2 + 40
  const gridDepth = 130
  ctx.lineWidth = 0.7
  for (let i = -4; i <= 4; i++) {
    const x = (gridHalfWidth / 4) * i
    const a = projectLocal({ x, y: 0, z: -gridDepth })
    const b = projectLocal({ x, y: 0, z: gridDepth })
    ctx.strokeStyle = i === 0 ? axisColor : gridColor
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
  for (let i = -2; i <= 2; i++) {
    const z = (gridDepth / 2) * i
    const a = projectLocal({ x: -gridHalfWidth, y: 0, z })
    const b = projectLocal({ x: gridHalfWidth, y: 0, z })
    ctx.strokeStyle = i === 0 ? axisColor : gridColor
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
  ctx.restore()

  const faces: Array<{ depth: number, points: Point2D[], fill: string, stroke: string }> = []
  const waveTime = performance.now() * 0.001
  bars.forEach((bar, index) => {
    const xCenter = (index - (bars.length - 1) / 2) * slot
    const randomPhase = (Math.sin(index * 12.9898) * 43758.5453) % (Math.PI * 2)
    const pulseA = Math.max(0, Math.sin(waveTime * (0.75 + (index % 5) * 0.11) + randomPhase))
    const pulseB = Math.max(0, Math.sin(waveTime * (1.18 + (index % 7) * 0.07) + randomPhase * 1.7))
    const wavePulse = Math.max(pulseA, pulseB * 0.7)
    const waveBoost = 1 + Math.pow(wavePulse, 10) * 0.04
    const h = (bar.height / 100) * maxWorldHeight * waveBoost
    const animatedBarWidth = barWidth * (1 + (waveBoost - 1) * 0.65)
    const animatedBarDepth = barDepth * (1 + (waveBoost - 1) * 0.65)
    const x0 = xCenter - animatedBarWidth / 2
    const x1 = xCenter + animatedBarWidth / 2
    const y0 = 0
    const y1 = -h
    const z0 = -animatedBarDepth / 2
    const z1 = animatedBarDepth / 2
    const active = hoveredDistributionBar.value?.id === bar.id
    const vertices = {
      fbl: { x: x0, y: y0, z: z1 },
      fbr: { x: x1, y: y0, z: z1 },
      ftl: { x: x0, y: y1, z: z1 },
      ftr: { x: x1, y: y1, z: z1 },
      bbl: { x: x0, y: y0, z: z0 },
      bbr: { x: x1, y: y0, z: z0 },
      btl: { x: x0, y: y1, z: z0 },
      btr: { x: x1, y: y1, z: z0 }
    }
    const screenVertices = Object.fromEntries(
      Object.entries(vertices).map(([key, value]) => [key, projectLocal(value)])
    ) as Record<keyof typeof vertices, Point2D>
    const allScreen = Object.values(screenVertices)
    const xValues = allScreen.map(point => point.x)
    const yValues = allScreen.map(point => point.y)
    distributionHitAreas.push({
      bar,
      x1: Math.min(...xValues) - 5,
      y1: Math.min(...yValues) - 5,
      x2: Math.max(...xValues) + 5,
      y2: Math.max(...yValues) + 5,
      depth: allScreen.reduce((sum, point) => sum + point.depth, 0) / allScreen.length
    })

    const faceGroups: Array<{ kind: 'front' | 'back' | 'side' | 'top' | 'bottom', points: Point2D[] }> = [
      { kind: 'back', points: [screenVertices.fbl, screenVertices.ftl, screenVertices.ftr, screenVertices.fbr] },
      { kind: 'front', points: [screenVertices.bbl, screenVertices.bbr, screenVertices.btr, screenVertices.btl] },
      { kind: 'side', points: [screenVertices.fbr, screenVertices.bbr, screenVertices.btr, screenVertices.ftr] },
      { kind: 'side', points: [screenVertices.bbl, screenVertices.fbl, screenVertices.ftl, screenVertices.btl] },
      { kind: 'top', points: [screenVertices.ftl, screenVertices.ftr, screenVertices.btr, screenVertices.btl] },
      { kind: 'bottom', points: [screenVertices.bbl, screenVertices.fbl, screenVertices.fbr, screenVertices.bbr] }
    ]
    faceGroups.forEach(face => {
      faces.push({
        depth: face.points.reduce((sum, point) => sum + point.depth, 0) / face.points.length,
        points: face.points,
        fill: getDistributionFaceColor(bar.value, face.kind, active, bar.opacity),
        stroke
      })
    })
  })

  faces
    .sort((a, b) => b.depth - a.depth)
    .forEach(face => drawDistributionPoly(ctx, face.points, face.fill, face.stroke))

  const hovered = hoveredDistributionBar.value
  if (hovered) {
    const area = distributionHitAreas.find(item => item.bar.id === hovered.id)
    if (area) {
      ctx.strokeStyle = isDark.value ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.62)'
      ctx.lineWidth = 1
      ctx.strokeRect(area.x1, area.y1, area.x2 - area.x1, area.y2 - area.y1)
    }
  }
}

const navigateFace = (dir: number) => {
  if (isTransitioning.value || activeFaceIndices.value.length === 0) return
  const currentIndex = activeFaceIndices.value.indexOf(currentFace.value)
  const nextIndex = (currentIndex + dir + activeFaceIndices.value.length) % activeFaceIndices.value.length
  switchFace(activeFaceIndices.value[nextIndex]!)
}

// Extract expensive path computation out of RAF loop
const chronologicalPathNodes = computed(() => {
  const scopedTrades = currentTrades.value
  const allTradeNodes = facesTrades.value.flat().filter(n => !n.isNote)
  const nodeMap = new Map(allTradeNodes.map(n => [n.id, n]))
  
  // Use exact diary order
  return scopedTrades.map(t => nodeMap.get(t.id!)).filter(Boolean) as TradeNode[]
})

let rafId: number
const update = () => {
  if (viewType.value === 'distribution') {
    renderDistributionChart()
    rafId = requestAnimationFrame(update)
    return
  }

  if (viewType.value !== 'cube') {
    rafId = requestAnimationFrame(update)
    return
  }

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
    if (canvas.clientWidth > 0 && canvas.clientHeight > 0) {
      canvas.width = canvas.clientWidth
      canvas.height = canvas.clientHeight
    }
  }

  const w = canvas.width, h = canvas.height
  if (w === 0 || h === 0) {
    rafId = requestAnimationFrame(update)
    return
  }

  ctx.clearRect(0, 0, w, h)

  if (revealProgress.value < 1) {
    revealProgress.value += 0.015
  }
  
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'

  currentRotation.value.x += (targetRotation.value.x - currentRotation.value.x) * 0.08
  currentRotation.value.y += (targetRotation.value.y - currentRotation.value.y) * 0.08

  // --- RENDER CUBE STRUCTURE (ETHEREAL TESSERACT) --- //
  const S = 140
  const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]
  const cubeVertices: Point3D[] = [
    {x:-S, y:-S, z:-S}, {x:S, y:-S, z:-S}, {x:S, y:S, z:-S}, {x:-S, y:S, z:-S},
    {x:-S, y:-S, z:S}, {x:S, y:-S, z:S}, {x:S, y:S, z:S}, {x:-S, y:S, z:S}
  ]
  const transformedCube = cubeVertices.map(v => {
    let p = rotateY(v, currentRotation.value.y)
    p = rotateX(p, currentRotation.value.x)
    p.x *= viewScale.value; p.y *= viewScale.value; p.z *= viewScale.value
    return project(p, w, h)
  })

  // --- CHRONOLOGICAL TRADE PATH REMOVED PER USER REQUEST --- //

  // Draw Full Borders with 50% opacity for structure
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)'
  ctx.lineWidth = 0.5
  edges.forEach(edge => {
    const v1 = transformedCube[edge[0]!]!; const v2 = transformedCube[edge[1]!]!
    if (v1.depth < -850 || v2.depth < -850) return
    ctx.beginPath(); ctx.moveTo(v1.x, v1.y); ctx.lineTo(v2.x, v2.y); ctx.stroke()
  })

  // Draw Tactical Corner Brackets (High visibility)
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)'
  ctx.lineWidth = 1.4
  edges.forEach(edge => {
    const v1 = transformedCube[edge[0]!]!; const v2 = transformedCube[edge[1]!]!
    if (v1.depth < -850 || v2.depth < -850) return
    
    const bracketSize = 0.15
    ctx.beginPath()
    ctx.moveTo(v1.x, v1.y); ctx.lineTo(v1.x + (v2.x - v1.x) * bracketSize, v1.y + (v2.y - v1.y) * bracketSize)
    ctx.moveTo(v2.x, v2.y); ctx.lineTo(v2.x + (v1.x - v2.x) * bracketSize, v2.y + (v1.y - v2.y) * bracketSize)
    ctx.stroke()
  })


  // --- RENDER INTERNAL NEURAL CORE --- //
  const pulse = (Math.sin(Date.now() * 0.002) + 1) * 0.5
  const sweepY = Math.sin(Date.now() * 0.0004) * 140 
  
  ctx.lineWidth = 0.4
  internalNodes.value.forEach((node, idx) => {
     const p1_orig = rotateY(node.worldPos, currentRotation.value.y)
     const p1_rot = rotateX(p1_orig, currentRotation.value.x)
     const p1 = { x: p1_rot.x * viewScale.value, y: p1_rot.y * viewScale.value, z: p1_rot.z * viewScale.value }
     const pr1 = project(p1, w, h)

     const distToSweep = Math.abs(p1_rot.y - (sweepY / viewScale.value))
     const isSwept = distToSweep < 15
     const sweepIntensity = isSwept ? (1 - distToSweep / 15) : 0

     if (node.neighbors) {
       node.neighbors.forEach(nIdx => {
         const other = internalNodes.value[nIdx]!
         let p2_orig = rotateY(other.worldPos, currentRotation.value.y)
         let p2_rot = rotateX(p2_orig, currentRotation.value.x)
         let p2 = { x: p2_rot.x * viewScale.value, y: p2_rot.y * viewScale.value, z: p2_rot.z * viewScale.value }
         const pr2 = project(p2, w, h)

         const edgeOpacity = Math.min(pr1.opacity, pr2.opacity) * (0.05 + pulse * 0.1 + sweepIntensity * 0.2)
         ctx.globalAlpha = edgeOpacity
         ctx.strokeStyle = isSwept ? (isDark.value ? '#ffffff' : '#0f172a') : (isDark.value ? '#475569' : '#64748b')
         ctx.beginPath(); ctx.moveTo(pr1.x, pr1.y); ctx.lineTo(pr2.x, pr2.y); ctx.stroke()
       })
     }

     ctx.shadowBlur = isSwept ? 12 : 4
     ctx.shadowColor = isSwept ? (isDark.value ? '#ffffff' : '#000000') : (isDark.value ? '#334155' : '#64748b')
     ctx.globalAlpha = Math.min(1, pr1.opacity * (0.3 + pulse * 0.4 + sweepIntensity * 0.3))
     ctx.fillStyle = isSwept ? (isDark.value ? '#ffffff' : '#0f172a') : (isDark.value ? '#475569' : '#64748b')
     const nodeSize = 1.5 + sweepIntensity * 0.8
     ctx.beginPath(); ctx.arc(pr1.x, pr1.y, nodeSize, 0, Math.PI * 2); ctx.fill()
     ctx.shadowBlur = 0
  })



  facesTrades.value.forEach((face, fIdx) => {
    const isCurrentFace = fIdx === currentFace.value
    if (!isCurrentFace) return

    // Pass 1: Draw connections for notes
    face.forEach(node => {
      if (node.isNote && node.parentId) {
        const parentNode = face.find(n => n.id === node.parentId)
        if (parentNode) {
           const nodeReveal = getCubeRevealProgress(node)
           const parentReveal = getCubeRevealProgress(parentNode)
           const connectionReveal = Math.min(nodeReveal.icon, parentReveal.icon)
           if (connectionReveal <= 0.01) return

           let p1 = rotateY(node.worldPos, currentRotation.value.y)
           p1 = rotateX(p1, currentRotation.value.x)
           p1.x *= viewScale.value; p1.y *= viewScale.value; p1.z *= viewScale.value
           const proj1 = project(p1, w, h)

           let p2 = rotateY(parentNode.worldPos, currentRotation.value.y)
           p2 = rotateX(p2, currentRotation.value.x)
           p2.x *= viewScale.value; p2.y *= viewScale.value; p2.z *= viewScale.value
           const proj2 = project(p2, w, h)

           if (p1.z >= -850 && p2.z >= -850) {
             ctx.beginPath()
             ctx.moveTo(proj1.x, proj1.y)
             ctx.lineTo(proj2.x, proj2.y)
             ctx.globalAlpha = connectionReveal
             ctx.strokeStyle = isDark.value ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'
             ctx.lineWidth = 1 * (viewScale.value / 2.2)
             ctx.stroke()
           }
        }
      }
    })

    // Pass 2: Draw nodes
    face.forEach(node => {
      let p = rotateY(node.worldPos, currentRotation.value.y)
      p = rotateX(p, currentRotation.value.x)
      p.x *= viewScale.value; p.y *= viewScale.value; p.z *= viewScale.value
      if (p.z < -850) return

      const proj = project(p, w, h); const isCurrentFace = fIdx === currentFace.value
      const focusMultiplier = viewScale.value / 2.2 // Smooth linear scaling based on initial viewScale (2.2)
      const reveal = getCubeRevealProgress(node)

      if (node.isNote) {
        if (isCurrentFace) {
           if (reveal.icon <= 0.01) return
           ctx.globalAlpha = Math.min(1, proj.opacity) * reveal.icon
           const radius = 3 * focusMultiplier * (0.74 + reveal.icon * 0.26)
           ctx.fillStyle = isDark.value ? '#ffffff' : '#000000'
           ctx.beginPath()
           ctx.arc(proj.x, proj.y + (1 - reveal.icon) * 5, radius, 0, Math.PI * 2)
           ctx.fill()
           
           if (proj.opacity > 0.5 && reveal.label > 0.01) {
             ctx.globalAlpha = reveal.label; ctx.fillStyle = isDark.value ? '#94a3b8' : '#475569'
             const dynamicFontSize = Math.floor(8 * focusMultiplier)
             ctx.font = `${dynamicFontSize}px Inter`
             ctx.fillText(node.label, proj.x + (6 * focusMultiplier), proj.y + (3 * focusMultiplier) + (1 - reveal.label) * 4)
           }
        } else {
           ctx.globalAlpha = proj.opacity * 0.3
           ctx.fillStyle = isDark.value ? '#ffffff' : '#000000'
           ctx.beginPath()
           ctx.arc(proj.x, proj.y, 1.5 * focusMultiplier, 0, Math.PI * 2)
           ctx.fill()
        }
      } else {
        if (isCurrentFace) {
          if (reveal.icon <= 0.01) return
          ctx.globalAlpha = Math.min(1, proj.opacity * 1.5) * reveal.icon
          const revealLift = (1 - reveal.icon) * 8
          const baseSize = 8 * focusMultiplier * (0.72 + reveal.icon * 0.28)
          const thinWidth = baseSize * 0.6
          
          ctx.fillStyle = isDark.value ? '#ffffff' : '#334155' 
          ctx.beginPath()
          ctx.moveTo(proj.x, proj.y - revealLift - baseSize)
          ctx.lineTo(proj.x + thinWidth, proj.y - revealLift)
          ctx.lineTo(proj.x, proj.y - revealLift + baseSize)
          ctx.lineTo(proj.x - thinWidth, proj.y - revealLift)
          ctx.closePath()
          ctx.fill()
          
          ctx.fillStyle = isDark.value ? '#94a3b8' : '#94a3b8'
          ctx.beginPath()
          const offX = proj.x + 1
          ctx.moveTo(offX, proj.y - revealLift - baseSize)
          ctx.lineTo(offX + thinWidth, proj.y - revealLift)
          ctx.lineTo(offX, proj.y - revealLift + baseSize)
          ctx.lineTo(offX - thinWidth, proj.y - revealLift)
          ctx.closePath()
          ctx.fill()
        } else {
          ctx.globalAlpha = proj.opacity * 0.4; ctx.fillStyle = isDark.value ? '#64748b' : '#334155'
          const baseSize = 4 * focusMultiplier
          const thinWidth = baseSize * 0.6
          ctx.beginPath()
          ctx.moveTo(proj.x, proj.y - baseSize)
          ctx.lineTo(proj.x + thinWidth, proj.y)
          ctx.lineTo(proj.x, proj.y + baseSize)
          ctx.lineTo(proj.x - thinWidth, proj.y)
          ctx.closePath()
          ctx.fill()
        }
        
        if (isCurrentFace && proj.opacity > 0.5 && reveal.label > 0.01) {
          ctx.globalAlpha = reveal.label; ctx.fillStyle = isDark.value ? '#ffffff' : '#1e293b'
          const dynamicFontSize = Math.floor(12 * focusMultiplier)
          ctx.font = `bold ${dynamicFontSize}px Inter`
          ctx.fillText(node.label, proj.x + (14 * focusMultiplier), proj.y + (5 * focusMultiplier) + (1 - reveal.label) * 6)
        }
      }
    })
  })

  rafId = requestAnimationFrame(update)
}

const handleMouseDown = (e: MouseEvent) => {
  // 3D Point Selection Logic
  if (viewType.value === 'cube' && !isTransitioning.value) {
     const rect = canvasRef.value?.getBoundingClientRect()
     if (rect) {
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        
        // Find nearest point on current face
        let nearest: { id: string, dist: number, node: TradeNode } | null = null
        const currentFaceNodes = facesTrades.value[currentFace.value] || []
        
        for (const node of currentFaceNodes) {
           if (getCubeRevealProgress(node).icon <= 0.2) continue
           let p = rotateY(node.worldPos, currentRotation.value.y)
           p = rotateX(p, currentRotation.value.x)
           p.x *= viewScale.value; p.y *= viewScale.value; p.z *= viewScale.value
           const proj = project(p, rect.width, rect.height)
           
           const d = Math.sqrt((proj.x - mouseX)**2 + (proj.y - mouseY)**2)
           if (d < 15 * (viewScale.value / 2.2)) {
              if (!nearest || d < nearest.dist) nearest = { id: node.id, dist: d, node }
           }
        }
        
        if (nearest) {
           if (nearest.node.isNote && nearest.node.parentId) {
              selectedTradeId.value = nearest.node.parentId
              const noteId = nearest.node.id.split('_').slice(2).join('_')
              panelInitialPage.value = 5
              panelInitialNoteId.value = noteId
              showExtraDetails.value = true
              showNodeMap.value = true
           } else {
              selectedTradeId.value = nearest.id
              showExtraDetails.value = false
           }
           draggedNode.value = nearest.node
           lastMousePos.value = { x: e.clientX, y: e.clientY }
           return // Don't start panning if we clicked a point
        }
     }
  }

  isPanning.value = true; lastMousePos.value = { x: e.clientX, y: e.clientY }
}

const handleDoubleClick = (e: MouseEvent) => {
  if (viewType.value === 'cube' && !isTransitioning.value) {
     const rect = canvasRef.value?.getBoundingClientRect()
     if (rect) {
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        
        let nearest: { id: string, dist: number, node: TradeNode } | null = null
        const currentFaceNodes = facesTrades.value[currentFace.value] || []
        
        for (const node of currentFaceNodes) {
           if (getCubeRevealProgress(node).icon <= 0.2) continue
           let p = rotateY(node.worldPos, currentRotation.value.y)
           p = rotateX(p, currentRotation.value.x)
           p.x *= viewScale.value; p.y *= viewScale.value; p.z *= viewScale.value
           const proj = project(p, rect.width, rect.height)
           
           const d = Math.sqrt((proj.x - mouseX)**2 + (proj.y - mouseY)**2)
           if (d < 15 * (viewScale.value / 2.2)) {
              if (!nearest || d < nearest.dist) nearest = { id: node.id, dist: d, node }
           }
        }
        
        if (nearest && nearest.node.isNote && nearest.node.parentId) {
           selectedTradeId.value = nearest.node.parentId
           // Extract actual note ID from the composed string "note_tradeId_noteId"
           const noteId = nearest.node.id.split('_').slice(2).join('_')
           panelInitialPage.value = 5
           panelInitialNoteId.value = noteId
           showExtraDetails.value = true
        }
     }
  }
}

const handleMouseMove = (e: MouseEvent) => {
  if (draggedNode.value) {
    const dx = e.clientX - lastMousePos.value.x
    const dy = e.clientY - lastMousePos.value.y
    
    let p = rotateY(draggedNode.value.worldPos, currentRotation.value.y)
    p = rotateX(p, currentRotation.value.x)
    p.x *= viewScale.value; p.y *= viewScale.value; p.z *= viewScale.value
    const z = Math.max(-999, p.z)
    
    const scale = 1000 / (1000 + z)
    
    const adjustedDx = (dx / scale) / viewScale.value
    const adjustedDy = (dy / scale) / viewScale.value
    
    let inv = rotateX({ x: adjustedDx, y: adjustedDy, z: 0 }, -currentRotation.value.x)
    inv = rotateY(inv, -currentRotation.value.y)
    
    draggedNode.value.worldPos.x += inv.x
    draggedNode.value.worldPos.y += inv.y
    draggedNode.value.worldPos.z += inv.z
    
    lastMousePos.value = { x: e.clientX, y: e.clientY }
    return
  }

  if (isPanning.value) {
    const dx = e.clientX - lastMousePos.value.x; const dy = e.clientY - lastMousePos.value.y
    
    if (e.shiftKey) {
      viewOffset.value.x += dx
      viewOffset.value.y += dy
    } else {
      targetRotation.value.y += dx * 0.005; targetRotation.value.x += dy * 0.005
    }
    
    lastMousePos.value = { x: e.clientX, y: e.clientY }
  }
}
const handleMouseUp = () => { 
  isPanning.value = false 
  draggedNode.value = null
}
const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  viewScale.value = Math.max(0.5, Math.min(6, viewScale.value - e.deltaY * 0.001))
}

const updateDistributionHover = (e: MouseEvent) => {
  const rect = distributionCanvasRef.value?.getBoundingClientRect()
  if (!rect) return
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top
  distributionMousePos.value = { x: mouseX, y: mouseY }

  const hit = distributionHitAreas
    .filter(area => mouseX >= area.x1 && mouseX <= area.x2 && mouseY >= area.y1 && mouseY <= area.y2)
    .sort((a, b) => a.depth - b.depth)[0]
  hoveredDistributionBar.value = hit?.bar || null
}

const handleDistributionMouseDown = (e: MouseEvent) => {
  isDistributionDragging.value = true
  didDistributionDrag.value = false
  distributionLastMousePos.value = { x: e.clientX, y: e.clientY }
  updateDistributionHover(e)
}

const handleDistributionMouseMove = (e: MouseEvent) => {
  updateDistributionHover(e)
  if (!isDistributionDragging.value) return

  const dx = e.clientX - distributionLastMousePos.value.x
  const dy = e.clientY - distributionLastMousePos.value.y
  if (Math.abs(dx) + Math.abs(dy) > 3) didDistributionDrag.value = true
  distributionTargetRotation.value.y += dx * 0.01
  distributionTargetRotation.value.x += dy * 0.004
  distributionLastMousePos.value = { x: e.clientX, y: e.clientY }
}

const handleDistributionMouseUp = () => {
  if (!didDistributionDrag.value && hoveredDistributionBar.value?.trade?.id) {
    selectedTradeId.value = hoveredDistributionBar.value.trade.id
    showExtraDetails.value = false
  }
  isDistributionDragging.value = false
}

const handleDistributionMouseLeave = () => {
  isDistributionDragging.value = false
  hoveredDistributionBar.value = null
}

const handleDistributionWheel = (e: WheelEvent) => {
  e.preventDefault()
  distributionScale.value = Math.max(0.65, Math.min(2.2, distributionScale.value - e.deltaY * 0.001))
}

onMounted(async () => {
  window.addEventListener('keydown', handleTimeTreeFullscreenKeydown, true)
  window.addEventListener('keydown', handleGlobalKeydown)
  isMatrixLoading.value = true
  await Promise.all([
    ensureMatrixDataRestored(),
    tradeStore.init()
  ])
  isMatrixLoading.value = false
  initTrades()
  switchFace(0)
  update()
})
onUnmounted(() => { 
  window.removeEventListener('keydown', handleTimeTreeFullscreenKeydown, true)
  window.removeEventListener('keydown', handleGlobalKeydown)
  clearTimeTreeFullscreenHintTimer()
  clearCubeRevealAnimation()
  cancelAnimationFrame(rafId) 
})
</script>

<style scoped>
.diary-3d-hub { font-family: 'Inter', sans-serif; }
canvas { image-rendering: pixelated; }

.protocol-slide-enter-active, .protocol-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.protocol-slide-enter-from, .protocol-slide-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.time-tree-fullscreen-hint-enter-active,
.time-tree-fullscreen-hint-leave-active {
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.time-tree-fullscreen-hint-enter-from,
.time-tree-fullscreen-hint-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}

.time-tree-scroll--fullscreen,
:global(.time-tree-scroll--fullscreen.custom-scrollbar) {
  -ms-overflow-style: none;
  scrollbar-width: none !important;
}

.time-tree-scroll--fullscreen::-webkit-scrollbar,
:global(.time-tree-scroll--fullscreen.custom-scrollbar::-webkit-scrollbar) {
  display: none !important;
  height: 0 !important;
  width: 0 !important;
  background: transparent !important;
}

.time-tree-scroll--fullscreen::-webkit-scrollbar-track,
.time-tree-scroll--fullscreen::-webkit-scrollbar-thumb,
:global(.time-tree-scroll--fullscreen.custom-scrollbar::-webkit-scrollbar-track),
:global(.time-tree-scroll--fullscreen.custom-scrollbar::-webkit-scrollbar-thumb) {
  background: transparent !important;
  border: 0 !important;
}
.protocol-slide-enter-to, .protocol-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.panel-slide-enter-active, .panel-slide-leave-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-slide-enter-from, .panel-slide-leave-to {
  transform: translateX(100%) translateY(-50%);
  opacity: 0;
}
.panel-slide-enter-to, .panel-slide-leave-from {
  transform: translateX(0) translateY(-50%);
  opacity: 1;
}

.page-reify-enter-active,
.page-reify-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.page-reify-enter-from,
.page-reify-leave-to {
  opacity: 0;
  transform: translateY(20px);
  filter: blur(10px);
}

.fade-blur-enter-active, .fade-blur-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-blur-enter-from, .fade-blur-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
}
.fade-blur-enter-to, .fade-blur-leave-from {
  opacity: 1;
  backdrop-filter: blur(12px);
}

.forecast-loading-bar {
  width: 42%;
  animation: forecast-loading-shift 1.2s ease-in-out infinite;
}

@keyframes forecast-loading-shift {
  0% {
    transform: translateX(-115%);
  }
  50% {
    transform: translateX(95%);
  }
  100% {
    transform: translateX(220%);
  }
}
</style>
