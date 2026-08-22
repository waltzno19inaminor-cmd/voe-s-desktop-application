<template>
  <div class="diary-3d-hub h-full w-full relative overflow-hidden bg-transparent nier-text-primary" ref="container">
    
    

    <Transition name="page-reify" mode="out-in">
      <ExTimeTreeTradeEntry
        v-if="showTimeTreeTradeDetails"
        :key="`trade-details-${selectedTimeTreeTradeForDetails?.id || 'empty'}-${timeTreeEntryMode}`"
        class="absolute inset-0 z-[2000]"
        :is-dark="isDark"
        :trade="selectedTimeTreeTradeForDetails"
        :mode="timeTreeEntryMode"
        :forecast-trades="currentTrades"
        :forecast-initial-capital="tradeStore.getInitialDeposit(selectedStrategyId) || 1000"
        :forecast-strategy-id="String(selectedStrategyId || 'MAIN_DIARY')"
        :forecast-strategy-name="selectedStrategy.name"
      />
    </Transition>

    <div
      v-show="!showNodeMap && !isTradeEntryOpen"
      class="absolute inset-0"
    >

      <div v-show="viewType === 'cube'" class="absolute inset-0">
      <!-- FORCE GRAPH LAYER -->
      <ExTradeForceGraph
        class="z-30 transition-all duration-300"
        :class="showCapitalForecast ? 'blur-sm brightness-75 saturate-75 scale-[1.01]' : ''"
        :nodes="tradeForceGraphNodes"
        :links="tradeForceGraphLinks"
        :is-dark="isDark"
        :cache-key="tradeForceGraphCacheKey"
        :pnl-min="tradeNodePnlRange.min"
        :pnl-max="tradeNodePnlRange.max"
        @node-click="handleForceGraphNodeClick"
        @ready="handleTradeForceGraphReady"
      />

      <div
        v-if="isCubeGraphLoading"
        class="pointer-events-none absolute inset-0 z-[120] flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div class="flex flex-col items-center gap-3 font-mono text-[9px] uppercase tracking-[0.28em] nier-text-primary">
          <span class="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80"></span>
          <span class="opacity-55">{{ locale === 'ru' ? 'ЗАГРУЗКА УЗЛОВ' : 'LOADING NODES' }}</span>
        </div>
      </div>

      <!-- CUBE LAYER (UI ONLY) -->
      <div
        v-show="viewType === 'cube'"
        class="w-full h-full absolute inset-0 transition-all duration-300 pointer-events-none opacity-100 z-40"
      >
        
        <!-- Cube Search Query Overlay -->
        <Transition name="fade">
          <div v-if="showCubeSearchText && cubeSearchQuery && isHudVisible" class="absolute inset-0 flex items-center justify-center pointer-events-none z-[50]">
            <span class="text-[15vw] font-bold text-white opacity-30 tracking-widest uppercase font-mono break-all text-center px-12 leading-none" style="text-shadow: 0 0 40px rgba(255,255,255,0.2);">
              {{ cubeSearchQuery }}
            </span>
          </div>
        </Transition>
      </div>
      </div>

      <div v-show="viewType === 'timeTree'" class="absolute inset-0">
          <ExTrades
            :trades="timeTreeSourceTrades"
            :show-capital-forecast="showCapitalForecast"
            :is-fullscreen="isTimeTreeFullscreen"
            @trade-context-menu="handleArchiveTradeClick"
          />
      </div>

      <!-- STRATEGY TREE LAYER -->
      <div
        v-if="hasOpenedGenesisTree"
        v-show="viewType === 'tree'"
        class="absolute inset-0 z-40 overflow-hidden theme-surface backdrop-blur-3xl pointer-events-auto"
        :class="showCapitalForecast ? 'blur-sm brightness-75 saturate-75 scale-[1.01]' : ''"
      >
        <div class="absolute inset-0 theme-grid opacity-30 pointer-events-none"></div>
        <template v-if="!isMainDiaryStrategy">
          <ExGenesisTree ref="genesisTreeRef" />
        </template>
        <template v-else>
          <div class="flex h-full w-full items-center justify-center px-8 text-center">
            <p class="max-w-xl text-[10px] font-mono font-bold uppercase leading-loose tracking-[0.25em] text-white/50 dark:text-white/50">
              {{ locale === 'ru' ? 'Прежде нужно выбрать стратегию' : 'Please select a strategy first' }}
            </p>
          </div>
        </template>
      </div>

      <!-- PNL DISTRIBUTION LAYER -->
      <div
        v-show="viewType === 'distribution'"
        class="absolute inset-0 z-40 flex flex-col overflow-hidden theme-surface backdrop-blur-3xl pointer-events-auto transition-all duration-300"
        :class="showCapitalForecast ? 'blur-sm brightness-75 saturate-75 scale-[1.01]' : ''"
      >
        <div class="absolute inset-0 theme-grid opacity-30 pointer-events-none"></div>
        <div class="relative z-10 flex h-full w-full flex-col py-20 md:py-28">
          <div class="mx-10 mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-black/10 pb-5 dark:border-white/10 md:mx-20">
            <div class="flex flex-col gap-2">
              <span class="text-[9px] font-mono uppercase tracking-[0.45em] opacity-40">
                {{ distributionMetricMode === 'pnl' ? (locale === 'ru' ? 'Распределение сделок' : 'Trade Distribution') : (locale === 'ru' ? 'Распределение score' : 'Score Distribution') }}
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
              {{ locale === 'ru' ? 'Нет сделок для графика' : 'No trades for chart' }}
            </div>
          </div>
        </div>
      </div>

    </div>

      <!-- TRADE NODE CONTEXT MENU -->
      <Teleport to="body">
        <Transition name="nt-tooltip-fade">
          <div
            v-if="tradeContextMenu"
            data-trade-context-menu
            class="fixed z-[100000000] pointer-events-auto context-menu-container"
            :style="{ left: `${tradeContextMenu.x}px`, top: `${tradeContextMenu.y}px` }"
            @click.stop
          >
            <div class="flex flex-col space-y-1.5">
              <div class="absolute -left-1 -top-1 h-2 w-2 rotate-45 bg-nier-text-light animate-pulse dark:bg-nier-text-dark"></div>

              <div
                v-for="(action, index) in tradeContextMenuActions"
                :key="action.id"
                class="group relative"
                :style="{ marginLeft: `${index * 12}px` }"
              >
                <button
                  type="button"
                  class="relative flex min-w-[180px] items-center justify-between overflow-hidden border border-nier-border-light bg-nier-white px-6 py-2.5 text-left transition-all duration-500 hover:translate-x-4 hover:border-nier-text-light dark:border-nier-border-dark dark:bg-nier-black dark:hover:border-nier-text-dark"
                  @click="action.action()"
                >
                  <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-[0.03]"></div>
                  <span class="relative z-10 text-[9px] font-mono font-black uppercase tracking-[0.5em] text-nier-text-light transition-all duration-500 group-hover:tracking-[0.8em] dark:text-nier-text-dark">{{ action.label }}</span>
                  <span class="relative z-10 text-[7px] font-mono opacity-20 transition-opacity group-hover:opacity-100 text-nier-text-light dark:text-nier-text-dark">[{{ action.id }}]</span>
                  <div class="absolute inset-y-0 left-0 w-0 bg-nier-text-light transition-all duration-500 group-hover:w-1.5 dark:bg-nier-text-dark"></div>
                </button>
                <div class="pointer-events-none absolute -bottom-4 left-6 opacity-0 transition-all duration-500 group-hover:opacity-40">
                  <span class="text-[7px] font-mono uppercase tracking-[0.3em] text-nier-text-light dark:text-nier-text-dark">{{ locale === 'ru' ? 'Исполнение торгового протокола // Готово' : 'Trade Protocol Execution // Ready' }}</span>
                </div>
              </div>

              <div class="group relative pt-2" :style="{ marginLeft: `${tradeContextMenuActions.length * 12}px` }">
                <button
                  type="button"
                  class="relative flex min-w-[180px] items-center justify-between overflow-hidden border border-red-500/30 bg-nier-white px-6 py-3 text-left transition-all duration-500 hover:translate-x-4 hover:border-red-500 hover:bg-red-500/10 dark:bg-nier-black"
                  @click="deleteTradeFromContextMenu"
                >
                  <span class="text-[9px] font-mono font-black uppercase tracking-[0.5em] text-red-500 transition-colors group-hover:text-red-400">{{ locale === 'ru' ? 'УДАЛИТЬ' : 'DELETE' }}</span>
                  <span class="text-[7px] font-mono text-red-500 opacity-40">[DEL]</span>
                  <div class="absolute inset-y-0 left-0 w-0 bg-red-500 transition-all duration-500 group-hover:w-1.5"></div>
                </button>
                <div class="pointer-events-none absolute -bottom-4 left-6 opacity-0 transition-all duration-500 group-hover:opacity-40">
                  <span class="text-[7px] font-mono uppercase tracking-[0.3em] text-red-500">{{ locale === 'ru' ? 'Предупреждение: безвозвратное удаление сделки' : 'Warning: Permanent Trade Erasure' }}</span>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <div
        v-if="false"
      class="absolute inset-0 z-[10020] flex items-center justify-center bg-black/20 p-4 backdrop-blur-[2px] dark:bg-black/45 md:p-8"
      @click.self="closeTimeTreeTradeDetails"
    >
      <div class="relative flex h-[72vh] max-h-[calc(100%-2rem)] w-full max-w-5xl">
          <ExPanel variant="light" :title="locale === 'ru' ? 'Детали сделки' : 'Trade details'" :no-padding="true" :show-corners="false" :no-shadow="true" class="!h-full !w-full overflow-hidden !border-black/15 dark:!border-white/15">
              <div class="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-5 pb-5 md:px-8">
                <ExVerticalTradeList
                :trades="selectedTimeTreeTrade ? [selectedTimeTreeTrade] : []"
                :details-only="true"
                :hide-filters="true"
                view-mode="list"
                :result-display-mode="listResultDisplayMode"
                  :color-mode="listColorMode"
                />
              </div>
              <div class="flex items-center gap-2 border-t border-black/10 px-5 py-3 dark:border-white/10 md:px-7">
                <ExButton
                  variant="ghost"
                  class="!flex-1 !px-3 !py-2 text-[9px] tracking-[0.18em]"
                  @click="showSelectedTimeTreeTradeDetails"
                >
                  {{ locale === 'ru' ? 'Подробности' : 'Details' }}
                </ExButton>
                <ExButton
                  variant="solid"
                  class="!h-[38px] !w-[38px] !shrink-0 !p-0"
                  :aria-label="locale === 'ru' ? 'Поделиться' : 'Share'"
                  :title="locale === 'ru' ? 'Поделиться' : 'Share'"
                  @click="shareSelectedTimeTreeTrade"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </ExButton>
                <ExButton
                  variant="solid"
                  class="!h-[38px] !w-[38px] !shrink-0 !p-0"
                  :aria-label="locale === 'ru' ? 'Редактировать' : 'Edit'"
                  :title="locale === 'ru' ? 'Редактировать' : 'Edit'"
                  @click="editSelectedTimeTreeTrade"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </ExButton>
                <ExButton
                  variant="solid"
                  class="!h-[38px] !w-[38px] !shrink-0 !border-red-600 !bg-red-600 !p-0 !text-white"
                  :aria-label="locale === 'ru' ? 'Удалить' : 'Delete'"
                  :title="locale === 'ru' ? 'Удалить' : 'Delete'"
                  @click="removeSelectedTimeTreeTrade"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </ExButton>
              </div>
            </ExPanel>
      </div>
    </div>

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
    <div v-if="!showNodeMap && viewType === 'timeTree' && showComplianceStatus && !showCapitalForecast && isHudVisible" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9000] w-[1100px] max-w-[95vw] pointer-events-auto">
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
                    strategy-name="Protocol Compliance"
            :is-live="true"
            :editable="false"
            @metric-select="activeComplianceMetricKey = $event"
          />
          <div class="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-6">
            <!-- RISK PER TRADE VIOLATIONS -->
            <div v-if="activeComplianceMetricKey === 'riskPerTrade'" class="flex flex-col font-mono text-xs pt-2 select-none">
              <div class="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10 text-[10px] opacity-40 uppercase tracking-widest px-2">
                <div class="w-[15%] flex items-center space-x-3">
                  <span>{{ locale === 'ru' ? 'Направление' : 'Direction' }}</span>
                </div>
                <span class="w-[15%]">{{ locale === 'ru' ? 'Актив' : 'Asset' }}</span>
                <span class="w-[22%] text-center">{{ locale === 'ru' ? 'Дата входа' : 'Entry Date' }}</span>
                <span class="w-[16%] text-right">{{ locale === 'ru' ? 'Реализованный убыток' : 'Realized Loss' }}</span>
                <span class="w-[16%] text-right">{{ locale === 'ru' ? 'Плановый риск' : 'Planned Risk' }}</span>
                <span class="w-[16%] text-right">{{ locale === 'ru' ? 'Результат' : 'Result' }}</span>
              </div>

              <div v-if="complianceViolations.violatingTrades.length === 0" class="py-16 text-center opacity-40 text-xs uppercase tracking-widest">
                {{ locale === 'ru' ? 'Нарушений риска на сделку не обнаружено' : 'No risk per trade violations detected' }}
              </div>

              <div v-else class="flex flex-col space-y-3.5 pt-2">
                <div v-for="trade in complianceViolations.violatingTrades" :key="trade.id" class="flex flex-col group transition-opacity duration-150 border-b border-black/5 dark:border-white/5 pb-2">
                  <div class="flex items-center justify-between py-3 px-2 opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer" @click="handleOpenTrade({ tradeId: trade.id })">
                    <div class="w-[15%] flex items-center space-x-3 truncate">
                      <span
                        class="w-1 h-1 rounded-full shrink-0"
                        :class="getTradePnlValue(trade) >= 0 ? 'bg-black dark:bg-[#F9F6F0]' : 'bg-black/30 dark:bg-white/30'"
                      ></span>
                      <span class="font-bold uppercase tracking-widest">{{ trade.side || trade.direction || 'N/A' }}</span>
                    </div>
                    <span class="w-[15%] opacity-60 uppercase tracking-wider truncate">{{ trade.asset }}</span>
                    <div class="w-[22%] flex flex-col items-center min-w-0">
                      <span class="mt-1 text-[10px] opacity-80 font-bold uppercase tracking-wider truncate">
                        {{ new Date(trade.date).toLocaleDateString() }}
                      </span>
                      <span class="mt-0.5 text-[9px] opacity-40 uppercase tracking-wider truncate">
                        {{ locale === 'ru' ? 'МАКС РИСК: $' : 'MAX RISK: $' }}{{ trade._maxRiskDollars.toFixed(2) }}
                      </span>
                    </div>
                    <span class="w-[16%] text-right tracking-wider truncate" :class="trade._realizedLoss > trade._maxRiskDollars ? '!text-red-500 !opacity-80 font-bold' : '!text-green-500 !opacity-80 font-bold'">
                      {{ trade._realizedLoss > 0 ? '-$' + trade._realizedLoss.toFixed(2) : '$0.00' }}
                      <span v-if="trade._realizedLoss > trade._maxRiskDollars" class="text-[9px] opacity-60 ml-0.5">(-${{ (trade._realizedLoss - trade._maxRiskDollars).toFixed(2) }})</span>
                    </span>
                    <span class="w-[16%] text-right tracking-wider truncate" :class="trade._positionRisk > trade._maxRiskDollars ? '!text-red-500 !opacity-80 font-bold' : '!text-green-500 !opacity-80 font-bold'">
                      {{ trade._positionRisk > 0 ? '-$' + trade._positionRisk.toFixed(2) : '$0.00' }}
                      <span v-if="trade._positionRisk > trade._maxRiskDollars" class="text-[9px] opacity-60 ml-0.5">(-${{ (trade._positionRisk - trade._maxRiskDollars).toFixed(2) }})</span>
                    </span>
                    <span class="w-[16%] font-bold text-right tracking-wider" :class="getTradePnlValue(trade) >= 0 ? 'text-green-500' : 'text-red-500'">
                      {{ getTradePnlValue(trade) >= 0 ? '+$' : '-$' }}{{ Math.abs(getTradePnlValue(trade)).toFixed(2) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- RISK PER SESSION VIOLATIONS -->
            <div v-if="activeComplianceMetricKey === 'riskPerSession'" class="flex flex-col font-mono text-xs pt-2 select-none">
              <div class="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10 text-[10px] opacity-40 uppercase tracking-widest px-2">
                <div class="w-[15%] flex items-center space-x-3">
                  <span>{{ locale === 'ru' ? 'Тип' : 'Type' }}</span>
                </div>
                <span class="w-[15%]">{{ locale === 'ru' ? 'Дата' : 'Date' }}</span>
                <span class="w-[22%] text-center">{{ locale === 'ru' ? 'Нарушения' : 'Violations' }}</span>
                <span class="w-[16%] text-right">{{ locale === 'ru' ? 'Реализованный убыток' : 'Realized Loss' }}</span>
                <span class="w-[16%] text-right">{{ locale === 'ru' ? 'Плановый риск' : 'Planned Risk' }}</span>
                <span class="w-[16%] text-right">{{ locale === 'ru' ? 'Раскрыть' : 'Expand' }}</span>
              </div>

              <div v-if="complianceViolations.violatingSessions.length === 0" class="py-16 text-center opacity-40 text-xs uppercase tracking-widest">
                {{ locale === 'ru' ? 'Нарушений риска на сессию не обнаружено' : 'No risk per session violations detected' }}
              </div>
              <div v-else class="flex flex-col space-y-3.5 pt-2">
                <div v-for="session in complianceViolations.violatingSessions" :key="session.date" class="flex flex-col group transition-opacity duration-150 border-b border-black/5 dark:border-white/5 pb-2">
                  <div class="relative flex items-center justify-between py-3 transition-all cursor-pointer" 
                       :class="expandedSessions.has(session.date) ? '-mx-6 px-8 bg-black text-[#F9F6F0] dark:bg-[#F9F6F0] dark:text-black opacity-100 shadow-md' : 'px-2 opacity-80 group-hover:opacity-100'"
                       @click="toggleSession(session.date)">
                    <!-- Tactical Corners -->
                    <template v-if="expandedSessions.has(session.date)">
                      <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#F9F6F0] dark:border-black opacity-50 pointer-events-none"></div>
                      <div class="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#F9F6F0] dark:border-black opacity-50 pointer-events-none"></div>
                      <div class="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#F9F6F0] dark:border-black opacity-50 pointer-events-none"></div>
                      <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#F9F6F0] dark:border-black opacity-50 pointer-events-none"></div>
                    </template>
                    <div class="w-[15%] flex items-center space-x-3 truncate">
                      <span class="w-1 h-1 rounded-full shrink-0"
                            :class="expandedSessions.has(session.date) ? 'bg-[#F9F6F0] dark:bg-black' : 'bg-black dark:bg-[#F9F6F0]'"></span>
                      <span class="font-bold uppercase tracking-widest">{{ locale === 'ru' ? 'СЕССИЯ' : 'SESSION' }}</span>
                    </div>
                    <div class="w-[15%] flex flex-col min-w-0">
                      <span class="opacity-60 uppercase tracking-wider truncate">
                        {{ new Date(session.date).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) }}
                      </span>
                      <span class="mt-0.5 text-[9px] opacity-40 uppercase tracking-wider truncate">
                        {{ locale === 'ru' ? 'МАКС РИСК: $' : 'MAX RISK: $' }}{{ session._maxSessionRiskDollars.toFixed(2) }}
                      </span>
                    </div>
                    <div class="w-[22%] flex flex-col items-center min-w-0">
                      <span class="px-2 py-0.5 bg-red-500/20 text-red-500 rounded text-[10px] font-bold tracking-widest">
                        {{ session.violatingTrades.length }} {{ locale === 'ru' ? 'НАРУШЕНИЙ' : 'VIOLATIONS' }}
                      </span>
                    </div>
                    <span class="w-[16%] text-right tracking-wider truncate" :class="session.realizedLoss > session._maxSessionRiskDollars ? '!text-red-500 !opacity-80 font-bold' : '!text-green-500 !opacity-80 font-bold'">
                      {{ session.realizedLoss > 0 ? '-$' + session.realizedLoss.toFixed(2) : '$0.00' }}
                    </span>
                    <span class="w-[16%] text-right tracking-wider truncate" :class="session.positionRisk > session._maxSessionRiskDollars ? '!text-red-500 !opacity-80 font-bold' : '!text-green-500 !opacity-80 font-bold'">
                      {{ session.positionRisk > 0 ? '-$' + session.positionRisk.toFixed(2) : '$0.00' }}
                    </span>
                    <span class="w-[16%] flex justify-end opacity-40">
                      <svg v-if="expandedSessions.has(session.date)" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
                      <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                    </span>
                  </div>
                  <!-- Session Violating Trades -->
                  <div v-if="expandedSessions.has(session.date)" class="my-2 -mx-6 px-6 flex flex-col space-y-3.5 py-3 opacity-80 animate-[fadeIn_0.2s_ease-out]">
                    <div class="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10 text-[10px] opacity-40 uppercase tracking-widest px-2">
                      <div class="w-[15%] flex items-center space-x-3">
                        <span>{{ locale === 'ru' ? 'Направление' : 'Direction' }}</span>
                      </div>
                      <span class="w-[15%]">{{ locale === 'ru' ? 'Актив' : 'Asset' }}</span>
                      <span class="w-[22%] text-center">{{ locale === 'ru' ? 'Дата входа' : 'Entry Date' }}</span>
                      <span class="w-[16%] text-right">{{ locale === 'ru' ? 'Реализованный убыток' : 'Realized Loss' }}</span>
                      <span class="w-[16%] text-right">{{ locale === 'ru' ? 'Плановый риск' : 'Planned Risk' }}</span>
                      <span class="w-[16%] text-right">{{ locale === 'ru' ? 'Результат' : 'Result' }}</span>
                    </div>
                    <div v-for="trade in session.violatingTrades" :key="trade.id" class="flex flex-col group transition-opacity duration-150 border-b border-black/5 dark:border-white/5 pb-2">
                      <div class="flex items-center justify-between py-3 px-2 opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer" @click="handleOpenTrade({ tradeId: trade.id })">
                        <div class="w-[15%] flex items-center space-x-3 truncate">
                          <span
                            class="w-1 h-1 rounded-full shrink-0"
                            :class="getTradePnlValue(trade) >= 0 ? 'bg-black dark:bg-[#F9F6F0]' : 'bg-black/30 dark:bg-white/30'"
                          ></span>
                          <span class="font-bold uppercase tracking-widest">{{ trade.side || trade.direction || 'N/A' }}</span>
                        </div>
                        <span class="w-[15%] opacity-60 uppercase tracking-wider truncate">{{ trade.asset }}</span>
                        <div class="w-[22%] flex flex-col items-center min-w-0">
                          <span class="mt-1 text-[10px] opacity-80 font-bold uppercase tracking-wider truncate">
                            {{ new Date(trade.date).toLocaleDateString() }}
                          </span>
                          <span class="mt-0.5 text-[9px] opacity-40 uppercase tracking-wider truncate">
                            {{ locale === 'ru' ? 'МАКС РИСК: $' : 'MAX RISK: $' }}{{ trade._maxRiskDollars.toFixed(2) }}
                          </span>
                        </div>
                        <span class="w-[16%] text-right tracking-wider truncate" :class="trade._realizedLoss > trade._maxRiskDollars ? '!text-red-500 !opacity-80 font-bold' : '!text-green-500 !opacity-80 font-bold'">
                          {{ trade._realizedLoss > 0 ? '-$' + trade._realizedLoss.toFixed(2) : '$0.00' }}
                          <span v-if="trade._realizedLoss > trade._maxRiskDollars" class="text-[9px] opacity-60 ml-0.5">(-${{ (trade._realizedLoss - trade._maxRiskDollars).toFixed(2) }})</span>
                        </span>
                        <span class="w-[16%] text-right tracking-wider truncate" :class="trade._positionRisk > trade._maxRiskDollars ? '!text-red-500 !opacity-80 font-bold' : '!text-green-500 !opacity-80 font-bold'">
                          {{ trade._positionRisk > 0 ? '-$' + trade._positionRisk.toFixed(2) : '$0.00' }}
                          <span v-if="trade._positionRisk > trade._maxRiskDollars" class="text-[9px] opacity-60 ml-0.5">(-${{ (trade._positionRisk - trade._maxRiskDollars).toFixed(2) }})</span>
                        </span>
                        <span class="w-[16%] font-bold text-right tracking-wider" :class="getTradePnlValue(trade) >= 0 ? 'text-green-500' : 'text-red-500'">
                          {{ getTradePnlValue(trade) >= 0 ? '+$' : '-$' }}{{ Math.abs(getTradePnlValue(trade)).toFixed(2) }}
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
                  <span>{{ locale === 'ru' ? 'Направление' : 'Direction' }}</span>
                </div>
                <span class="w-[15%]">{{ locale === 'ru' ? 'Актив' : 'Asset' }}</span>
                <span class="w-[22%] text-center">{{ locale === 'ru' ? 'Дата входа' : 'Entry Date' }}</span>
                <span class="w-[16%] text-right">{{ locale === 'ru' ? 'Длительность' : 'Duration' }}</span>
                <span class="w-[16%] text-right">{{ locale === 'ru' ? 'Ожидание' : 'Expected' }}</span>
                <span class="w-[16%] text-right">{{ locale === 'ru' ? 'Результат' : 'Result' }}</span>
              </div>

              <div v-if="complianceViolations.violatingStyleTrades.length === 0" class="py-16 text-center opacity-40 text-xs uppercase tracking-widest">
                {{ locale === 'ru' ? 'Нарушений стиля торговли не обнаружено' : 'No trading style violations detected' }}
              </div>

              <div v-else class="flex flex-col space-y-3.5 pt-2">
                <div v-for="trade in complianceViolations.violatingStyleTrades" :key="trade.id" class="flex flex-col group transition-opacity duration-150 border-b border-black/5 dark:border-white/5 pb-2">
                  <div class="flex items-center justify-between py-3 px-2 opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer" @click="handleOpenTrade({ tradeId: trade.id })">
                    <div class="w-[15%] flex items-center space-x-3 truncate">
                      <span
                        class="w-1 h-1 rounded-full shrink-0"
                        :class="getTradePnlValue(trade) >= 0 ? 'bg-black dark:bg-[#F9F6F0]' : 'bg-black/30 dark:bg-white/30'"
                      ></span>
                      <span class="font-bold uppercase tracking-widest">{{ trade.side || trade.direction || 'N/A' }}</span>
                    </div>
                    <span class="w-[15%] opacity-60 uppercase tracking-wider truncate">{{ trade.asset }}</span>
                    <div class="w-[22%] flex flex-col items-center min-w-0">
                      <span class="mt-1 text-[10px] opacity-80 font-bold uppercase tracking-wider truncate">
                        {{ new Date(trade.date).toLocaleDateString() }}
                      </span>
                    </div>
                    <span class="w-[16%] opacity-80 font-bold text-red-500 text-right tracking-wider truncate">
                      {{ trade._durationStr }}
                    </span>
                    <span class="w-[16%] opacity-60 text-right tracking-wider truncate">
                      {{ trade._expectedStyle }}
                    </span>
                    <span class="w-[16%] font-bold text-right tracking-wider" :class="getTradePnlValue(trade) >= 0 ? 'text-green-500' : 'text-red-500'">
                      {{ getTradePnlValue(trade) >= 0 ? '+$' : '-$' }}{{ Math.abs(getTradePnlValue(trade)).toFixed(2) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- NEURAL STATUS VIOLATIONS -->
            <div v-if="activeComplianceMetricKey === 'emotionalState'" class="flex flex-col font-mono text-xs pt-2 select-none">
              <div class="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10 text-[10px] opacity-40 uppercase tracking-widest px-2">
                <div class="w-[15%] flex items-center space-x-3">
                  <span>{{ locale === 'ru' ? 'Направление' : 'Direction' }}</span>
                </div>
                <span class="w-[15%]">{{ locale === 'ru' ? 'Актив' : 'Asset' }}</span>
                <span class="w-[22%] text-center">{{ locale === 'ru' ? 'Дата входа' : 'Entry Date' }}</span>
                <span class="w-[16%] text-right">{{ locale === 'ru' ? 'Причина' : 'Reason' }}</span>
                <span class="w-[16%] text-right">{{ locale === 'ru' ? 'Балл' : 'Score' }}</span>
                <span class="w-[16%] text-right">{{ locale === 'ru' ? 'Результат' : 'Result' }}</span>
              </div>

              <div v-if="complianceViolations.violatingNeuralTrades.length === 0" class="py-16 text-center opacity-40 text-xs uppercase tracking-widest">
                {{ locale === 'ru' ? 'Нарушений нейростатуса не обнаружено' : 'No neural status violations detected' }}
              </div>

              <div v-else class="flex flex-col space-y-3.5 pt-2">
                <div v-for="trade in complianceViolations.violatingNeuralTrades" :key="trade.id" class="flex flex-col group transition-opacity duration-150 border-b border-black/5 dark:border-white/5 pb-2">
                  <div class="relative flex items-center justify-between py-3 transition-all cursor-pointer" 
                       :class="expandedNeuralTrades.has(trade.id) ? '-mx-6 px-8 bg-black text-[#F9F6F0] dark:bg-[#F9F6F0] dark:text-black opacity-100 shadow-md' : 'px-2 opacity-80 group-hover:opacity-100'"
                       @click="handleOpenTrade({ tradeId: trade.id })">
                    <!-- Tactical Corners -->
                    <template v-if="expandedNeuralTrades.has(trade.id)">
                      <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#F9F6F0] dark:border-black opacity-50 pointer-events-none"></div>
                      <div class="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#F9F6F0] dark:border-black opacity-50 pointer-events-none"></div>
                      <div class="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#F9F6F0] dark:border-black opacity-50 pointer-events-none"></div>
                      <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#F9F6F0] dark:border-black opacity-50 pointer-events-none"></div>
                    </template>
                    <div class="w-[15%] flex items-center space-x-3 truncate relative z-10">
                      <span
                        class="w-1 h-1 rounded-full shrink-0"
                        :class="expandedNeuralTrades.has(trade.id) ? (getTradePnlValue(trade) >= 0 ? 'bg-[#F9F6F0] dark:bg-black' : 'bg-[#F9F6F0]/30 dark:bg-black/30') : (getTradePnlValue(trade) >= 0 ? 'bg-black dark:bg-[#F9F6F0]' : 'bg-black/30 dark:bg-white/30')"
                      ></span>
                      <span class="font-bold uppercase tracking-widest">{{ trade.side || trade.direction || 'N/A' }}</span>
                    </div>
                    <span class="w-[15%] opacity-60 uppercase tracking-wider truncate">{{ trade.asset }}</span>
                    <div class="w-[22%] flex flex-col items-center min-w-0">
                      <span class="mt-1 text-[10px] opacity-80 font-bold uppercase tracking-wider truncate">
                        {{ new Date(trade.date).toLocaleDateString() }}
                      </span>
                    </div>
                    <span class="w-[16%] opacity-60 font-bold text-red-500 text-right tracking-wider truncate">
                      {{ trade._neuralReason }}
                    </span>
                    <span class="w-[16%] opacity-80 font-bold text-red-500 text-right tracking-wider truncate">
                      {{ trade._neuralScore }}%
                    </span>
                    <div class="w-[16%] flex items-center justify-end space-x-2">
                      <span class="font-bold text-right tracking-wider" :class="getTradePnlValue(trade) >= 0 ? 'text-green-500' : 'text-red-500'">
                        {{ getTradePnlValue(trade) >= 0 ? '+$' : '-$' }}{{ Math.abs(getTradePnlValue(trade)).toFixed(2) }}
                      </span>
                      <button @click.stop="toggleNeuralTrade(trade.id)" class="w-6 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="expandedNeuralTrades.has(trade.id) ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <!-- EXPANDED EMOTIONS -->
                  <div v-if="expandedNeuralTrades.has(trade.id)" class="my-2 -mx-6 px-6 flex flex-col space-y-3.5 py-3 opacity-80 animate-[fadeIn_0.2s_ease-out]">
                    <div class="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10 text-[10px] opacity-40 uppercase tracking-widest px-2">
                      <div class="w-[25%] flex items-center space-x-3">
                        <span>{{ locale === 'ru' ? 'Эмоция' : 'Emotion' }}</span>
                      </div>
                      <span class="w-[25%]">{{ locale === 'ru' ? 'Тип' : 'Type' }}</span>
                      <span class="w-[25%] text-right">{{ locale === 'ru' ? 'Частота' : 'Frequency' }}</span>
                      <span class="w-[25%] text-right">{{ locale === 'ru' ? 'Профит фактор' : 'Profit Factor' }}</span>
                    </div>

                    <div v-for="emotion in (trade.emotions || [])" :key="typeof emotion === 'string' ? emotion : emotion.name" class="flex flex-col group transition-opacity duration-150 border-b border-black/5 dark:border-white/5 pb-2">
                      <div class="flex items-center justify-between py-3 px-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <div class="w-[25%] flex items-center space-x-3 truncate">
                          <span
                            class="w-1 h-1 rounded-full shrink-0"
                            :class="getEmotionWeight(emotion) >= 0 ? 'bg-black dark:bg-[#F9F6F0]' : 'bg-red-500'"
                          ></span>
                          <span class="font-bold uppercase tracking-widest"
                                :class="getEmotionWeight(emotion) < 0 ? 'text-red-500' : 'nier-text-primary'">
                            {{ typeof emotion === 'string' ? emotion : emotion.name }}
                          </span>
                        </div>
                        <span class="w-[25%] font-bold uppercase tracking-wider truncate text-[10px]"
                              :class="getEmotionWeight(emotion) > 0 ? 'text-green-500 opacity-60' : getEmotionWeight(emotion) < 0 ? 'text-red-500 opacity-80' : 'text-yellow-500 opacity-60'">
                          {{ getEmotionWeight(emotion) > 0
                            ? (locale === 'ru' ? 'ПОЗИТИВНО' : 'POSITIVE')
                            : getEmotionWeight(emotion) < 0
                              ? (locale === 'ru' ? 'НЕГАТИВНО' : 'NEGATIVE')
                              : (locale === 'ru' ? 'НЕЙТРАЛЬНО' : 'NEUTRAL') }}
                        </span>
                        <span class="w-[25%] text-right font-mono font-bold text-[11px] uppercase tracking-wider truncate opacity-80">
                          {{ (getStats(typeof emotion === 'string' ? emotion : emotion.name, closedCurrentTrades).freq * 100).toFixed(1) }}%
                        </span>
                        <span class="w-[25%] text-right font-mono font-bold text-[11px] tracking-wider truncate" :class="getStats(typeof emotion === 'string' ? emotion : emotion.name, closedCurrentTrades).pf >= 1 ? 'text-green-500' : 'text-red-500'">
                          {{ getStats(typeof emotion === 'string' ? emotion : emotion.name, closedCurrentTrades).pf.toFixed(2) }}
                        </span>
                      </div>
                    </div>
                    <div v-if="!(trade.emotions || []).length" class="py-4 text-center opacity-40 text-[10px] uppercase tracking-widest">
                      {{ locale === 'ru' ? 'ЭМОЦИИ НЕ ЗАФИКСИРОВАНЫ' : 'NO EMOTIONS LOGGED' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- OTHER METRICS FALLBACK -->
            <div v-if="activeComplianceMetricKey !== 'riskPerTrade' && activeComplianceMetricKey !== 'riskPerSession' && activeComplianceMetricKey !== 'tradingStyle' && activeComplianceMetricKey !== 'emotionalState'" class="flex items-center justify-center h-full opacity-30 font-mono text-sm uppercase text-center px-4">
              {{ locale === 'ru' ? 'ВЫБЕРИТЕ СЕКЦИЮ ВЫШЕ ДЛЯ ПРОСМОТРА НАРУШЕНИЙ' : 'SELECT A SECTION ABOVE TO VIEW VIOLATIONS' }}
            </div>
          </div>
         </div>
       </ExPanel>
    </div>

    <div
      v-if="!showNodeMap && (viewType === 'cube' || viewType === 'timeTree') && showCapitalForecast && isHudVisible && canOpenCapitalForecast"
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

    <div
      v-if="!showNodeMap && (viewType === 'cube' || viewType === 'timeTree') && isHudVisible && !isTradeEntryOpen && !isTimeTreeFullscreen"
      v-show="showFiltersPanel"
      class="pointer-events-auto absolute left-1/2 top-8 z-[10010] w-[562px] -translate-x-1/2"
    >
      <ExPanel variant="light" :no-padding="true" :show-corners="false" class="!w-full overflow-visible">
        <ExVerticalTradeList
          :trades="currentTrades"
          :filters-only="true"
          :filters-panel-mode="true"
          view-mode="list"
          :result-display-mode="listResultDisplayMode"
          :color-mode="listColorMode"
          @filtered-trades-change="handleTimeTreeFilteredTrades"
          @filters-active-change="handleTradeFiltersActiveChange"
        />
      </ExPanel>
    </div>

    <!-- CENTERED BOTTOM NAVIGATION -->
    <div
      v-if="!showNodeMap && isHudVisible && !isTradeEntryOpen && !isTimeTreeFullscreen && viewType !== 'distribution' && viewType !== 'tree'"
      class="pointer-events-none absolute bottom-12 left-0 right-0 z-[10000] flex items-center justify-center transition-all duration-300"
      :class="showCapitalForecast ? 'blur-sm brightness-75 saturate-75' : ''"
    >
      <ExGenesisHudPanel>
        <button
          v-if="showTimeTreeTradeDetails"
          type="button"
          class="group relative flex h-10 w-10 items-center justify-center border border-white bg-white text-black transition-all hover:bg-white/85"
          :aria-label="locale === 'ru' ? 'Назад к архиву' : 'Back to archive'"
          @click="closeTimeTreeTradeDetails"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6" stroke-linecap="square" stroke-linejoin="miter" />
          </svg>
          <span class="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap border border-white/20 bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">[ {{ locale === 'ru' ? 'НАЗАД' : 'BACK' }} ]</span>
        </button>

        <button
          type="button"
          class="group relative flex h-10 w-10 items-center justify-center border transition-all"
          :class="viewType === 'timeTree' && !showTimeTreeTradeDetails ? 'border-white/30 bg-white/10 text-white' : 'border-transparent text-white/60 hover:border-white/20 hover:bg-white/5 hover:text-white'"
          :aria-label="locale === 'ru' ? 'Сделки' : 'Trades'"
          @click="activateBottomView('timeTree')"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            class="h-5 w-5"
            :class="isGenesisTreePresetPanelOpen ? 'text-black' : ''"
            aria-hidden="true"
          >
            <rect x="4" y="4" width="16" height="16" rx="1" />
            <path d="M8 9h8M8 12h8M8 15h5" stroke-linecap="square" />
          </svg>
          <span class="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap border border-white/20 bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">[ {{ locale === 'ru' ? 'Сделки' : 'Trades' }} ]</span>
        </button>

        <button
          type="button"
          class="group relative flex h-10 w-10 items-center justify-center border border-transparent text-white/70 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white"
          :aria-label="locale === 'ru' ? 'Фильтры' : 'Filters'"
          :class="showFiltersPanel || hasActiveTradeFilters ? 'border-white/70 bg-white/10 text-white' : ''"
          :aria-expanded="showFiltersPanel"
          @click="toggleFiltersPanel"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" class="h-5 w-5" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
            <circle cx="9" cy="6" r="1.8" fill="currentColor" stroke="none" />
            <circle cx="15" cy="12" r="1.8" fill="currentColor" stroke="none" />
            <circle cx="11" cy="18" r="1.8" fill="currentColor" stroke="none" />
          </svg>
          <span class="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap border border-white/20 bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">[ {{ locale === 'ru' ? 'ФИЛЬТРЫ' : 'FILTERS' }} ]</span>
        </button>

        <div class="mx-1 h-7 w-px bg-white/15"></div>

        <button
          type="button"
          class="group relative flex h-10 w-10 items-center justify-center border border-transparent text-white/70 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white"
          :class="showToolsMenu ? 'border-white/30 bg-white/10 text-white' : ''"
          :aria-label="locale === 'ru' ? 'Меню' : 'Menu'"
          :aria-expanded="showToolsMenu"
          @click="openToolsMenuFromBottomBar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          <span class="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap border border-white/20 bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">[ {{ locale === 'ru' ? 'МЕНЮ' : 'MENU' }} ]</span>
        </button>
      </ExGenesisHudPanel>
    </div>

    <div
      v-if="!showNodeMap && isHudVisible && !isTradeEntryOpen && !isTimeTreeFullscreen && viewType === 'tree'"
      class="pointer-events-none absolute bottom-12 left-0 right-0 z-[10000] flex items-center justify-center transition-all duration-300"
      :class="showCapitalForecast ? 'blur-sm brightness-75 saturate-75' : ''"
    >
      <div class="pointer-events-auto relative flex items-center gap-1.5 rounded-sm border border-white/20 bg-[#0a0a0a]/90 p-1.5 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          class="group relative flex h-10 w-10 items-center justify-center border border-white bg-white text-black transition-all hover:bg-white/85"
          :aria-label="locale === 'ru' ? 'Выйти из дерева' : 'Exit tree'"
          @click="exitTreeView"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6" stroke-linecap="square" stroke-linejoin="miter" />
          </svg>
          <span class="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap border border-white/20 bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">[ {{ locale === 'ru' ? 'НАЗАД' : 'BACK' }} ]</span>
        </button>

        <button
          type="button"
          class="group relative flex h-10 w-10 items-center justify-center border border-transparent text-white/70 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white"
          :class="isGenesisTreePresetPanelOpen ? '!border-white !bg-white !text-black hover:!bg-white/85 hover:!text-black' : ''"
          :aria-label="locale === 'ru' ? 'Пресеты' : 'Presets'"
          :aria-pressed="isGenesisTreePresetPanelOpen"
          @click="openGenesisTreePresets"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            class="h-5 w-5"
            :class="isGenesisTreePresetPanelOpen ? '!text-black' : ''"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
            <circle cx="8" cy="7" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="10" cy="17" r="1.5" fill="currentColor" stroke="none" />
          </svg>
          <span class="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap border border-white/20 bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">[ {{ locale === 'ru' ? 'ПРЕСЕТЫ' : 'PRESETS' }} ]</span>
        </button>

        <button
          type="button"
          class="group relative flex h-10 w-10 items-center justify-center border border-transparent text-white/70 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white"
          :aria-label="locale === 'ru' ? 'Центрировать дерево' : 'Center tree'"
          @click="centerGenesisTree"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" class="h-5 w-5" aria-hidden="true">
            <circle cx="12" cy="12" r="7" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
          <span class="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap border border-white/20 bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">[ {{ locale === 'ru' ? 'ЦЕНТР' : 'CENTER' }} ]</span>
        </button>

        <ExTradeEntryVersionButton
          v-if="!isMainDiaryStrategy"
          :model-value="selectedStrategyVersionId"
          :versions="strategyVersions"
          :strategy-name="selectedStrategyLabel"
          :is-loading="isMatrixLoading"
          :close-signal="protocolMenuCloseSignal"
          @update:model-value="selectStrategyVersion($event)"
        />
      </div>
    </div>

    <div
      v-if="!showNodeMap && isHudVisible && !isTradeEntryOpen && !isTimeTreeFullscreen && viewType === 'distribution'"
      class="pointer-events-none absolute bottom-12 left-0 right-0 z-[10000] flex items-center justify-center transition-all duration-300"
      :class="showCapitalForecast ? 'blur-sm brightness-75 saturate-75' : ''"
    >
      <div class="pointer-events-auto relative flex items-center gap-1.5 rounded-sm border border-white/20 bg-[#0a0a0a]/90 p-1.5 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          class="group relative flex h-10 w-10 items-center justify-center border border-white bg-white text-black transition-all hover:bg-white/85"
          :aria-label="locale === 'ru' ? 'Выйти из распределения' : 'Exit distribution'"
          @click="exitDistributionView"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6" stroke-linecap="square" stroke-linejoin="miter" />
          </svg>
          <span class="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap border border-white/20 bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">[ {{ locale === 'ru' ? 'НАЗАД' : 'BACK' }} ]</span>
        </button>

        <button
          type="button"
          aria-label="PnL"
          class="group relative flex h-10 w-10 items-center justify-center border transition-all duration-300"
          :class="distributionMetricMode === 'pnl' ? 'border-white/30 bg-white/10 text-white' : 'border-transparent text-white/45 hover:border-white/20 hover:bg-white/5 hover:text-white'"
          @click="distributionMetricMode = 'pnl'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
            <path d="M4 19h16M6 16l3.5-5 3.5 3 5-8M18 6h-4M18 6v4" />
          </svg>
          <span class="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap border border-white/20 bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">[ {{ locale === 'ru' ? 'МАКС УБЫТОК → ПРИБЫЛЬ' : 'MAX LOSS → PROFIT' }} ]</span>
        </button>

        <button
          type="button"
          :disabled="isMainDiaryStrategy"
          aria-label="Score"
          class="group relative flex h-10 w-10 items-center justify-center border transition-all duration-300"
          :class="isMainDiaryStrategy
            ? 'cursor-not-allowed border-transparent text-white/20'
            : (distributionMetricMode === 'score' ? 'border-white/30 bg-white/10 text-white' : 'border-transparent text-white/45 hover:border-white/20 hover:bg-white/5 hover:text-white')"
          @click="distributionMetricMode = 'score'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
            <circle cx="12" cy="12" r="8" />
            <path d="M8.5 15.5l7-7" />
            <circle cx="9" cy="9" r="1" />
            <circle cx="15" cy="15" r="1" />
          </svg>
          <span class="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap border border-white/20 bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">[ {{ locale === 'ru' ? 'МАКС SCORE → МИН SCORE' : 'MAX SCORE → MIN SCORE' }} ]</span>
        </button>
      </div>
    </div>

    <!-- MAIN TOOLS MENU -->
    <Teleport to="body">
      <Transition name="protocol-slide">
        <div
          v-if="!isTradeEntryOpen && !showTimeTreeTradeDetails && showToolsMenu"
          @click.self="closeToolsMenu"
          class="tools-menu-overlay fixed inset-0 z-[10005] flex items-center justify-center p-12 backdrop-blur-md"
        >
          <div class="relative w-full max-w-xl">
            <ExPanel class="tools-menu-panel w-full" noPadding variant="light" :show-corners="true">
              <div class="grid grid-cols-5 gap-0 p-4 [&>button]:!h-14">
                <button
                  type="button"
                  class="group relative flex h-20 items-center justify-center border-0 bg-transparent text-white/55 transition-all hover:bg-white/5 hover:text-white"
                  :class="viewType === 'cube' ? 'bg-white/10 text-white' : ''"
                  @click="viewType === 'cube' ? activateBottomView('timeTree') : activateBottomView('cube')"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-6 w-6" aria-hidden="true">
                    <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" />
                  </svg>
                  <span class="pointer-events-none absolute left-1/2 top-full z-20 -translate-x-1/2 whitespace-nowrap bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                    {{ locale === 'ru' ? 'ТЕПЛОВАЯ КАРТА' : 'HEATMAP' }}
                  </span>
                </button>

                <button
                  type="button"
                  class="group relative flex h-20 items-center justify-center border-0 bg-transparent text-white/55 transition-all hover:bg-white/5 hover:text-white"
                  :class="viewType === 'distribution' ? 'bg-white/10 text-white' : ''"
                  @click="openProjectionView('distribution')"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-6 w-6">
                    <path d="M4 19h16M6 16V9M10 16V5M14 16v-3M18 16V7" />
                  </svg>
                  <span class="pointer-events-none absolute left-1/2 top-full z-20 -translate-x-1/2 whitespace-nowrap bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                    {{ locale === 'ru' ? 'РАСПРЕДЕЛЕНИЕ' : 'DISTRIBUTION' }}
                  </span>
                </button>

                <button
                  type="button"
                  class="group relative flex h-20 items-center justify-center border-0 bg-transparent text-white/55 transition-all hover:bg-white/5 hover:text-white"
                  :class="viewType === 'tree' ? 'bg-white/10 text-white' : ''"
                  @click="openProjectionView('tree')"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-6 w-6">
                    <path d="M12 4v5M6 15v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M6 15v3M18 15v3" />
                    <circle cx="12" cy="4" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="19" r="2" />
                  </svg>
                  <span class="pointer-events-none absolute left-1/2 top-full z-20 -translate-x-1/2 whitespace-nowrap bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                    {{ locale === 'ru' ? 'Дерево Генезиса' : 'Genesis tree' }}
                  </span>
                </button>

                <button
                  type="button"
                  class="group relative flex h-20 items-center justify-center border-0 bg-transparent text-white/55 transition-all hover:bg-white/5 hover:text-white"
                  :class="showCapitalForecast ? 'bg-white/10 text-white' : ''"
                  @click="openCapitalForecastFromMenu"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-6 w-6">
                    <path d="M3 17l5-5 4 4 8-9" /><path d="M17 7h3v3" />
                  </svg>
                  <span class="pointer-events-none absolute left-1/2 top-full z-20 -translate-x-1/2 whitespace-nowrap bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                    {{ locale === 'ru' ? 'ПРОГНОЗ' : 'FORECAST' }}
                  </span>
                </button>

                <button
                  type="button"
                  class="group relative flex h-20 items-center justify-center border-0 bg-transparent text-white/55 transition-all hover:bg-white/5 hover:text-white"
                  :class="showComplianceStatus ? 'bg-white/10 text-white' : ''"
                  @click="openComplianceFromMenu"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-6 w-6">
                    <rect x="18" y="3" width="4" height="18" /><rect x="10" y="8" width="4" height="13" /><rect x="2" y="13" width="4" height="8" />
                  </svg>
                  <span class="pointer-events-none absolute left-1/2 top-full z-20 -translate-x-1/2 whitespace-nowrap bg-white px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                    {{ locale === 'ru' ? 'Статус соответствия' : 'Compliance status' }}
                  </span>
                </button>
              </div>
            </ExPanel>
          </div>
        </div>
      </Transition>
    </Teleport>

  <Transition name="page-reify">
    <ExTradeEntry v-if="isTradeEntryOpen"
                  ref="tradeEntryRef"
                  class="absolute inset-0 z-[2000]"
                  :key="editingTrade?.id || 'new-trade-entry'"
                  :initial-trade="editingTrade"
                  @close="closeTradeEntry"
                  @addTrade="closeTradeEntry"
                  @updateTrade="closeTradeEntry"
                  @panel-change="handleTradeEntryPanelChange" />
  </Transition>

  <ExTradeEntryBottomBar
    v-if="isTradeEntryOpen"
    :is-trade-entry-open="isTradeEntryOpen"
    :is-editing="Boolean(editingTrade?.id)"
    :is-close-mode-active="isTradeEntryCloseModeActive"
    :commit-state="tradeEntryCommitState"
    :active-panel="activeTradeEntryPanel"
    :strategies="strategies"
    :selected-strategy-id="selectedStrategyId"
    :is-matrix-loading="isMatrixLoading"
    :protocol-close-signal="protocolMenuCloseSignal"
    @toggle-entry="closeTradeEntry"
    @save-trade="saveTradeEntry"
    @toggle-close-mode="toggleTradeEntryPanel('close')"
    @open-panel="toggleTradeEntryPanel"
    @update-strategy="updateTradeEntryStrategy"
  />


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
                  {{ locale === 'ru' ? 'Прогноз паттернов' : 'Pattern forecast' }}
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
              <div class="grid grid-cols-1 gap-3 border-b border-black/10 pb-4 dark:border-white/10">
                <div class="text-center">
                  <div class="opacity-40">{{ locale === 'ru' ? 'Ваши сделки' : 'Your trades' }}</div>
                  <div class="mt-1 text-base font-black">{{ patternForecastIntroStats.userTrades }}</div>
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
                      ? 'Сравниваем вашу динамику, риск, длительность сделок, серии win/loss и структурные блоки с историями других трейдеров.'
                      : 'We compare your performance path, risk, trade duration, win/loss streaks, and structural blocks with histories from other traders.' }}
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

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useStrategyTradesStore } from '~/features/store/useStrategyTrades'
import { useGenesisTrades, useGenesisMatrixData } from '~/entities/genesis'
import { useThemeStore } from '~/features/store/useTheme'
import ExPanel from '~/shared/ui/ExPanel.vue'
import ExGothicCorners from '~/shared/ui/ExGothicCorners.vue'
import ExButton from '~/shared/ui/ExButton.vue'
import { calculateTacticalHistory } from '~/shared/utils/tacticalHistory'
import { tradeMatchesProtocol } from '~/shared/utils/scenarioConditionScope'
import ExTradeAnalysisPanel from '~/widgets/genesis/ui/analytics/ExTradeAnalysisPanel.vue'
import globalAssets from '~/shared/data/global_assets.json'
import { getIconForAsset } from '~/shared/api/asset.service'
import ExTacticalNodeMap from '~/widgets/genesis/ui/analytics/ExTacticalNodeMap.vue'
import ExTradeEntry from '~/widgets/genesis/ui/trade-entry/ExTradeEntry.vue'
import ExTimeTreeTradeEntry from '~/widgets/genesis/ui/trade-entry/ExTimeTreeTradeEntry.vue'
import ExTradeEntryBottomBar from '~/widgets/genesis/ui/trade-entry/ExTradeEntryBottomBar.vue'
import ExGenesisHudPanel from '../common/ExGenesisHudPanel.vue'
import ExTradeEntryVersionButton from '~/widgets/genesis/ui/trade-entry/ExTradeEntryVersionButton.vue'
import ExTradeForceGraph from '~/widgets/genesis/ui/analytics/ExTradeForceGraph.vue'
import ExTrades from '~/widgets/genesis/ui/common/ExTrades.vue'
import ExVerticalTradeList from '~/widgets/genesis/ui/diary/ExVerticalTradeList.vue'
import ExGenesisTree from '~/widgets/genesis/tree/ui/ExGenesisTree.vue'
import { useI18n } from '~/shared/i18n/useI18n'
import { useDomI18n } from '~/shared/i18n/useDomI18n'
import ExTradeShareCardPreview from '~/widgets/genesis/ui/common/ExTradeShareCardPreview.vue'
import ExPaywallOverlay from '~/widgets/genesis/ui/common/ExPaywallOverlay.vue'
import ExPatternForecastPanel from '~/widgets/genesis/ui/analytics/ExPatternForecastPanel.vue'
import { PATTERN_FORECAST_LIMITS } from '~/widgets/genesis/model/patternForecast'
import { buildTradeProfitabilityScoreIndex, getTradePnlForScore } from '~/widgets/genesis/model/tradeProfitabilityScore'
import { hasFiniteTradePnl, isClosedTradeForMetrics } from '~/widgets/genesis/model/tradePnl'
import {
  buildComplianceAudit,
  buildTradeDistributionBars,
  getDistributionStats,
  getEmotionWeight as getGenesisEmotionWeight,
  getTradePnl as getGenesisTradePnl,
  getTradeResultPercent as getGenesisTradeResultPercent,
  resolveTradeBalanceBefore,
  getTradeRiskReward,
  formatTradeDurationCompact,
  getTradeTimelineTimestamp as getGenesisTradeTimelineTimestamp,
  GENESIS_EMOTION_WEIGHTS
} from '~/widgets/genesis/model/metrics'
import { useAuthStore } from '~/entities/user/auth.store'
import OpenStrategyMetrics from '~/widgets/genesis/ui/analytics/ExStrategyMetricsPanel.vue'
import type { MetricConfig } from '~/widgets/genesis/ui/analytics/ExStrategyMetricsPanel.vue'
import { resolveRiskManagementForStrategy } from '~/widgets/genesis/model/riskManagement'
import { useMatrixState } from '~/widgets/genesis/model/matrix/useMatrixState'
import {
  filterTradesBySelectedStrategyVersion,
  getSelectedStrategyVersionSnapshot
} from '~/shared/utils/strategyVersionScope'

const emit = defineEmits(['exit', 'nodeMapState', 'hudState', 'openNote', 'openTrade'])

const themeStore = useThemeStore()
const isDark = computed(() => themeStore?.settings?.isDark ?? false)
const { t, locale } = useI18n()
const container = ref<HTMLElement | null>(null)
useDomI18n(container, 'genesis.dom')
const numberLocale = computed(() => locale.value === 'ru' ? 'ru-RU' : 'en-US')
const openTradeText = () => locale.value === 'ru' ? 'НЕЗАКР. СД.' : 'OPEN TRD.'
const authStore = useAuthStore()
const {
  nodes: matrixStateNodes,
  connections: matrixStateConnections,
  strategyVersions,
  selectedStrategyVersionId,
  selectStrategyVersion,
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
  return `$${Number(selectedTrade.value.entry).toLocaleString(numberLocale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
})

const tradeExitPrice = computed(() => {
  if (!selectedTrade.value || selectedTrade.value.exit === undefined) return '$0.00'
  return `$${Number(selectedTrade.value.exit).toLocaleString(numberLocale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
})

const tradeEmotionalState = computed(() => {
  if (!selectedTrade.value) return '60%'
  const emotions = selectedTrade.value.emotions || []
  if (emotions.length === 0) {
    return '60%'
  }
  
  let score = 60 // Baseline stability
  emotions.forEach((e: any) => {
    const key = (typeof e === 'string' ? e : (e.name || '')).toUpperCase()
    const weight = GENESIS_EMOTION_WEIGHTS[key] || 0
    score += weight
  })
  
  const val = Math.min(Math.max(Math.round(score), 0), 100)
  return `${val}%`
})

const tradeNetResult = computed(() => {
  if (!selectedTrade.value) return '+$0.00'
  const profit = getTradePnlValue(selectedTrade.value)
  const sign = profit >= 0 ? '+' : '-'
  const absProfit = Math.abs(profit).toLocaleString(numberLocale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${sign}$${absProfit}`
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

const viewType = ref<'cube' | 'timeTree' | 'distribution' | 'tree'>('timeTree')
const hasOpenedGenesisTree = ref(false)
const genesisTreeRef = ref<any>(null)
const isGenesisTreePresetPanelOpen = ref(false)
const listResultDisplayMode = ref<'currency' | 'percent'>('percent')
const listColorMode = ref<'monochrome' | 'colorful'>('colorful')
const isTimeTreeFullscreen = ref(false)
const selectedTradeId = ref<string | null>(null)
const tradeContextMenu = ref<{ x: number; y: number; tradeId: string; source: 'canvas' | 'timeTree' | 'archive' } | null>(null)
const editingTrade = ref<any>(undefined)
const tradeEntryRef = ref<any>(null)
const isTradeEntryCloseModeActive = ref(true)
const activeTradeEntryPanel = ref<'matrix' | 'journal' | 'method' | null>(null)
const tradeEntryCommitState = computed(() => {
  const exposedState = tradeEntryRef.value?.commitState
  if (exposedState && typeof exposedState === 'object' && 'value' in exposedState) {
    return exposedState.value || 'idle'
  }
  return exposedState || 'idle'
})

const editTrade = (trade: any) => {
  editingTrade.value = trade
  isTradeEntryCloseModeActive.value = trade?.isClosed !== false && String(trade?.status || '').toLowerCase() !== 'open'
  activeTradeEntryPanel.value = null
  isTradeEntryOpen.value = true
}

const showExtraDetails = ref(false)
const panelInitialPage = ref<number | undefined>(undefined)
const panelInitialNoteId = ref<string | undefined>(undefined)
const showNodeMap = ref(false)
const isHudVisible = ref(true)
const showComplianceStatus = ref(false)
const showToolsMenu = ref(false)
const showFiltersPanel = ref(false)
const hasActiveTradeFilters = ref(false)
const protocolMenuCloseSignal = ref(0)
const activeComplianceMetricKey = ref('riskPerTrade')
const isTradeEntryOpen = ref(false)
const showAssetMenu = ref(false)
const closeTradeEntryPanels = () => {
  tradeEntryRef.value?.closePanels?.()
  activeTradeEntryPanel.value = null
}

const closeTradeEntry = () => {
  isTradeEntryOpen.value = false
  editingTrade.value = undefined
  isTradeEntryCloseModeActive.value = true
  activeTradeEntryPanel.value = null
}

const saveTradeEntry = () => {
  if (!isTradeEntryOpen.value) return
  tradeEntryRef.value?.saveTrade?.()
}

const toggleTradeEntryPanel = (panel: 'close' | 'matrix' | 'journal' | 'method') => {
  if (!isTradeEntryOpen.value) return

  protocolMenuCloseSignal.value += 1
  const result = tradeEntryRef.value?.openPanel?.(panel)
  if (panel === 'close') {
    isTradeEntryCloseModeActive.value = result !== false
    activeTradeEntryPanel.value = null
    return
  }

  if ((panel === 'journal' || panel === 'method') && activeTradeEntryPanel.value === panel) {
    activeTradeEntryPanel.value = null
    return
  }

  activeTradeEntryPanel.value = panel
}

const handleTradeEntryPanelChange = (panel: 'matrix' | 'journal' | 'method' | null) => {
  activeTradeEntryPanel.value = panel
}

const updateTradeEntryStrategy = (strategyId: string) => {
  selectedStrategyId.value = strategyId
}

const closeNavigationOverlays = (keepProtocol = false) => {
  if (!keepProtocol) protocolMenuCloseSignal.value += 1
  showFiltersPanel.value = false
  showToolsMenu.value = false
  showCapitalForecast.value = false
  showCapitalForecastIntro.value = false
  genesisTreeRef.value?.closePresetPanel?.()
  isGenesisTreePresetPanelOpen.value = false
  if (showTimeTreeTradeDetails.value) closeTimeTreeTradeDetails()
}

const activateBottomView = (nextView: 'cube' | 'timeTree') => {
  closeNavigationOverlays()
  viewType.value = nextView
}

const toggleFiltersPanel = () => {
  const shouldOpen = !showFiltersPanel.value
  closeNavigationOverlays()
  showFiltersPanel.value = shouldOpen
}

const handleTradeFiltersActiveChange = (isActive: boolean) => {
  hasActiveTradeFilters.value = isActive
}

const openToolsMenuFromBottomBar = () => {
  closeNavigationOverlays()
  showToolsMenu.value = true
}

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

const handleForceGraphNodeClick = (payload: { node: any; event: MouseEvent }) => {
  if (viewType.value !== 'cube' || isTransitioning.value) return
  selectTradeNode(payload.node, payload.event)
}

const handleTradeForceGraphReady = () => {
  if (viewType.value === 'cube') isTradeGraphLoading.value = false
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

const translateTemporalUnit = (unit: string) => t(`genesis.virtualLog.units.${unit}`)

const isClosedDiaryTrade = (trade: any) => isClosedTradeForMetrics(trade)

const currentTrades = computed(() => {
  return scopeTradesToSelectedVersion(tradeStore.getTradesForStrategy(selectedStrategyId.value))
})

const closedCurrentTrades = computed(() => {
  return currentTrades.value.filter(isClosedDiaryTrade)
})

const currentTradesForList = computed(() => {
  return scopeTradesToSelectedVersion(tradeStore.getAllTradesForStrategy(selectedStrategyId.value))
})

const timeTreeFilteredTrades = ref<any[] | null>(null)
const timeTreeSelectedTradeId = ref<string | null>(null)
const selectedTimeTreeTradeForDetails = ref<Record<string, any> | null>(null)
const showTimeTreeTradeDetails = ref(false)
const timeTreeEntryMode = ref<'trade' | 'forecast'>('trade')

const enterTimeTreeFullscreen = () => {
  if (viewType.value !== 'timeTree') return
  isTimeTreeFullscreen.value = true
}

const exitTimeTreeFullscreen = () => {
  if (!isTimeTreeFullscreen.value) return
  isTimeTreeFullscreen.value = false
}

const handleTimeTreeFullscreenKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return

  if (showTimeTreeTradeDetails.value) {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
    closeTimeTreeTradeDetails()
    return
  }

  if (tradeContextMenu.value) {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
    closeTradeContextMenu()
    return
  }

  if (!isTimeTreeFullscreen.value) return
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

const selectedTimeTreeTrade = computed(() => {
  const selectedId = timeTreeSelectedTradeId.value
  if (!selectedId) return null

  return currentTradesForList.value.find((trade: any) => String(trade?.id || '') === selectedId)
    || timeTreeSourceTrades.value.find((trade: any) => String(trade?.id || '') === selectedId)
    || null
})

const timeTreeTradeDetailsOpen = computed(() => Boolean(selectedTimeTreeTrade.value))

const handleTimeTreeTradeClick = (payload: { tradeId: string; event?: MouseEvent }) => {
  if (!payload?.tradeId) return
  const event = payload.event
  const viewportWidth = typeof window === 'undefined' ? 0 : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? 0 : window.innerHeight
  const menuWidth = 230
  const menuHeight = 260
  const x = event?.clientX ?? Math.max(16, viewportWidth / 2 - menuWidth / 2)
  const y = event?.clientY ?? Math.max(16, viewportHeight / 2 - menuHeight / 2)

  showTimeTreeTradeDetails.value = false
  timeTreeSelectedTradeId.value = String(payload.tradeId)
  tradeContextMenu.value = {
    x: Math.min(Math.max(8, x), Math.max(8, viewportWidth - menuWidth)),
    y: Math.min(Math.max(8, y), Math.max(8, viewportHeight - menuHeight)),
    tradeId: String(payload.tradeId),
    source: 'timeTree'
  }
}

const handleArchiveTradeClick = (payload: { tradeId: string; event?: MouseEvent }) => {
  if (!payload?.tradeId) return

  const event = payload.event
  const viewportWidth = typeof window === 'undefined' ? 0 : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? 0 : window.innerHeight
  const menuWidth = 230
  const menuHeight = 260
  const x = event?.clientX ?? Math.max(16, viewportWidth / 2 - menuWidth / 2)
  const y = event?.clientY ?? Math.max(16, viewportHeight / 2 - menuHeight / 2)

  selectedTradeId.value = String(payload.tradeId)
  showTimeTreeTradeDetails.value = false
  tradeContextMenu.value = {
    x: Math.min(Math.max(8, x), Math.max(8, viewportWidth - menuWidth)),
    y: Math.min(Math.max(8, y), Math.max(8, viewportHeight - menuHeight)),
    tradeId: String(payload.tradeId),
    source: 'archive'
  }
}

const closeTimeTreeTradeDetails = () => {
  timeTreeSelectedTradeId.value = null
  selectedTimeTreeTradeForDetails.value = null
  timeTreeEntryMode.value = 'trade'
  showTimeTreeTradeDetails.value = false
}

const editSelectedTimeTreeTrade = () => {
  const trade = selectedTimeTreeTrade.value
  if (!trade) return
  closeTimeTreeTradeDetails()
  editTrade(trade)
}

const showSelectedTimeTreeTradeDetails = () => {
  const trade = selectedTimeTreeTrade.value
  if (!trade?.id) return

  openTimeTreeTradeDetailsForTrade(trade)
}

const shareSelectedTimeTreeTrade = () => {
  const trade = selectedTimeTreeTrade.value
  if (!trade?.id) return

  selectedTradeId.value = String(trade.id)
  closeTimeTreeTradeDetails()
  showShareCardModal.value = true
}

const removeSelectedTimeTreeTrade = async () => {
  const tradeId = selectedTimeTreeTrade.value?.id
  if (!tradeId) return

  closeTimeTreeTradeDetails()
  await handleRemoveTrade(String(tradeId))
}

const closeTradeContextMenu = () => {
  tradeContextMenu.value = null
}

const openTimeTreeTradeDetailsForTrade = (trade: any) => {
  if (!trade?.id) return

  // The archive can keep a filtered snapshot of the trades. Resolve the
  // selected item from the store first so newly saved tradeStudyMetrics,
  // including generatedMarketData, are passed to the details view.
  const freshTrade = currentTradesForList.value.find((candidate: any) => (
    String(candidate?.id || '') === String(trade.id)
  )) || currentTrades.value.find((candidate: any) => (
    String(candidate?.id || '') === String(trade.id)
  )) || trade

  const positiveOrNull = (value: unknown) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }
  const detailEntry = positiveOrNull(freshTrade.entry)
  const detailStopLoss = positiveOrNull(freshTrade.stopLoss)
  const detailTakeProfit = positiveOrNull(freshTrade.takeProfit)
  const hasValidRiskRewardLevels = detailEntry !== null && detailStopLoss !== null && detailTakeProfit !== null

  closeNavigationOverlays()
  selectedTradeId.value = String(freshTrade.id)
  timeTreeSelectedTradeId.value = String(freshTrade.id)
  selectedTimeTreeTradeForDetails.value = {
    ...freshTrade,
    entry: detailEntry ?? freshTrade.entry,
    stopLoss: detailStopLoss,
    takeProfit: detailTakeProfit,
    rr: hasValidRiskRewardLevels ? freshTrade.rr : null,
    riskReward: hasValidRiskRewardLevels ? freshTrade.riskReward : null,
    realizedRr: hasValidRiskRewardLevels ? freshTrade.realizedRr : null,
    assetIcon: freshTrade.assetIcon || resolveTimeTreeAssetIcon(freshTrade)
  }
  timeTreeEntryMode.value = 'trade'
  panelInitialPage.value = undefined
  panelInitialNoteId.value = undefined
  showExtraDetails.value = false
  showNodeMap.value = false
  showTimeTreeTradeDetails.value = true
  closeTradeContextMenu()
}

const getTradeForContextMenu = (tradeId: string) => {
  return currentTrades.value.find((trade: any) => String(trade?.id || '') === tradeId)
    || currentTradesForList.value.find((trade: any) => String(trade?.id || '') === tradeId)
    || null
}

const openTradeDetailsFromContextMenu = () => {
  const menu = tradeContextMenu.value
  const tradeId = menu?.tradeId
  if (!tradeId) return

  if (menu.source === 'timeTree') {
    const trade = selectedTimeTreeTrade.value
      || getTradeForContextMenu(tradeId)

    openTimeTreeTradeDetailsForTrade(trade)
    return
  }

  openTimeTreeTradeDetailsForTrade(getTradeForContextMenu(tradeId))
}

const shareTradeFromContextMenu = () => {
  const tradeId = tradeContextMenu.value?.tradeId
  if (!tradeId) return

  selectedTradeId.value = tradeId
  closeTradeContextMenu()
  showShareCardModal.value = true
}

const editTradeFromContextMenu = () => {
  const trade = tradeContextMenu.value ? getTradeForContextMenu(tradeContextMenu.value.tradeId) : null
  if (!trade) return

  closeTradeContextMenu()
  editTrade(trade)
}

const deleteTradeFromContextMenu = async () => {
  const tradeId = tradeContextMenu.value?.tradeId
  if (!tradeId) return

  closeTradeContextMenu()
  await handleRemoveTrade(tradeId)
}

const tradeContextMenuActions = computed(() => [
  {
    label: locale.value === 'ru' ? 'ПОДРОБНОСТИ' : 'DETAILS',
    id: '0x01',
    action: openTradeDetailsFromContextMenu
  },
  {
    label: locale.value === 'ru' ? 'ПОДЕЛИТЬСЯ' : 'SHARE',
    id: '0x02',
    action: shareTradeFromContextMenu
  },
  {
    label: locale.value === 'ru' ? 'РЕДАКТИРОВАТЬ' : 'EDIT',
    id: '0x03',
    action: editTradeFromContextMenu
  }
])

const getTradeTimelineTimestamp = getGenesisTradeTimelineTimestamp

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
  if (!isClosedDiaryTrade(trade)) return Number.NaN
  const strategyId = trade?.strategyId || selectedStrategyId.value
  const deposit = tradeStore.getInitialDeposit(strategyId) || 1000
  const balanceBefore = resolveTradeBalanceBefore(trade, timeTreeSourceTrades.value, deposit)
  return getGenesisTradeResultPercent(trade, balanceBefore, deposit)
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
  if (!Number.isFinite(percentValue) && !Number.isFinite(currencyValue)) return openTradeText()
  if (listResultDisplayMode.value === 'currency') return formatDistributionCurrency(currencyValue)
  return formatSignedPercent(percentValue)
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
    const isClosedTrade = isClosedDiaryTrade(trade)
    const pnl = isClosedTrade ? getTradePnlValue(trade) : Number.NaN
    const resultValue = getTradeResultPercent(trade)
    groups.get(key)!.trades.push({
      id: String(trade?.id || `${key}-${groups.get(key)!.trades.length}`),
      asset: String(trade?.asset || 'UNKNOWN').toUpperCase(),
      assetIcon: resolveTimeTreeAssetIcon(trade),
      side: getTimeTreeSide(trade?.side || trade?.direction),
      pnl,
      resultLabel: formatTimeTreeResult(resultValue, pnl),
      resultColor: isClosedTrade
        ? getTimeTreeResultColor(listResultDisplayMode.value === 'currency' ? pnl : resultValue)
        : (listColorMode.value === 'colorful' ? 'hsl(45 80% 58%)' : 'currentColor'),
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
  return closedCurrentTrades.value.filter((trade: any) => {
    return Number.isFinite(new Date(trade?.date).getTime()) &&
      Number.isFinite(new Date(trade?.dateExit).getTime()) &&
      hasFiniteTradePnl(trade)
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
  const strategyId = trade?.strategyId || selectedStrategyId.value
  return getGenesisTradePnl(trade, tradeStore.getInitialDeposit(strategyId) || 1000)
}

// Keep the node palette consistent with the complete visible diary, even when
// the canvas is filtered down to only winners or only losers.
const tradeNodePnlRange = computed(() => {
  const values = currentTrades.value
    .filter(isClosedDiaryTrade)
    .map(getTradePnlValue)
    .filter(value => Number.isFinite(value))

  if (!values.length) return { min: 0, max: 0 }
  return { min: Math.min(...values), max: Math.max(...values) }
})

const getTradeNodeColor = (node: TradeNode) => {
  if (node.isOpenTrade) return isDark.value ? '#facc15' : '#ca8a04'
  if (node.isCore) return isDark.value ? '#f8fafc' : '#0f172a'
  if (node.isScenario) return isDark.value ? '#cbd5e1' : '#475569'
  if (node.isNote) return isDark.value ? '#94a3b8' : '#64748b'

  const pnl = Number(node.pnl)
  const { min, max } = tradeNodePnlRange.value

  // Keep the two signs visually separate: winners are white/grey shades,
  // while only losing trades are allowed to use the red scale.
  if (pnl > 0) {
    const intensity = max > 0 ? Math.min(1, pnl / max) : 1
    const channel = Math.round(174 + (255 - 174) * intensity)
    return `rgb(${channel} ${channel} ${channel})`
  }

  if (pnl < 0) {
    const intensity = min < 0 ? Math.min(1, Math.abs(pnl) / Math.abs(min)) : 1
    const red = Math.round(254 - (254 - 239) * intensity)
    const green = Math.round(202 - (202 - 68) * intensity)
    const blue = Math.round(202 - (202 - 68) * intensity)
    return `rgb(${red} ${green} ${blue})`
  }

  return 'rgb(210 210 210)'
}

const distributionMetricMode = ref<'pnl' | 'score'>('pnl')
const previousProjectionView = ref<'cube' | 'timeTree' | 'tree'>('cube')

const distributionClosedTrades = computed(() => {
  return filteredTrades.value.filter(isClosedDiaryTrade)
})

const formatDistributionCurrency = (value: number) => {
  const sign = value > 0 ? '+' : ''
  return `${sign}$${value.toLocaleString(numberLocale.value, {
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
  const scoreIndex = buildTradeProfitabilityScoreIndex(distributionClosedTrades.value, deposit)
  const scoreMap = new Map<any, number>()
  scoreIndex.forEach((value, key) => {
    scoreMap.set(key, value.score)
  })
  return scoreMap
})

const getTradeOverallScorePercent = (trade: any) => {
  const id = String(trade?.id || '')
  if (id && tradeOverallScoreMap.value.has(id)) {
    return tradeOverallScoreMap.value.get(id) ?? 0
  }
  if (trade && typeof trade === 'object') {
    return tradeOverallScoreMap.value.get(trade) ?? 0
  }
  return 0
}

const tradeDistributionBars = computed(() => {
  return buildTradeDistributionBars({
    trades: distributionClosedTrades.value,
    mode: distributionMetricMode.value,
    getPnl: getTradePnlValue,
    getScore: getTradeOverallScorePercent,
    formatValue: formatDistributionValue
  })
})

const tradeDistributionStats = computed(() => {
  return getDistributionStats(tradeDistributionBars.value)
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
  closeTradeContextMenu()
  if (next === 'distribution') resetDistributionView()
  if (next !== 'timeTree') {
    exitTimeTreeFullscreen()
    closeTimeTreeTradeDetails()
  }
  if (next === 'cube') isTradeGraphLoading.value = false
  scheduleRender()
})

watch(showTimeTreeTradeDetails, (isOpen) => {
  if (!isOpen && viewType.value === 'cube') isTradeGraphLoading.value = false
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

const complianceAudit = computed(() => buildComplianceAudit({
  trades: closedCurrentTrades.value,
  initialCapital: tradeStore.getInitialDeposit(selectedStrategyId.value) || 1000,
  riskManagement: activeMatrixNodes.value,
  emotionWeights: GENESIS_EMOTION_WEIGHTS,
  getDurationLabel: (trade) => calculateDuration(trade),
  getExpectedStyleLabel: (extraType) => extraType === 0
    ? (locale.value === 'ru' ? '< 1Д' : '< 1D')
    : extraType === 1
      ? (locale.value === 'ru' ? '1-14Д (ВНУТРИДНЕВНАЯ)' : '1-14D (Intraday)')
      : (locale.value === 'ru' ? '> 14Д (СВИНГ)' : '> 14D (Swing)'),
  getNeuralReason: (kind, count) => kind === 'no-emotions'
    ? (locale.value === 'ru' ? 'НЕТ ЭМОЦИЙ' : 'NO EMOTIONS')
    : kind === 'negative-emotions'
      ? (locale.value === 'ru' ? `${count} НЕГАТИВНЫХ ЭМОЦИЙ` : `${count} NEGATIVE EMOTIONS`)
      : (locale.value === 'ru' ? 'БАЛЛ < 50%' : 'SCORE < 50%')
}))

const complianceStats = computed(() => complianceAudit.value.stats)
const complianceViolations = computed(() => complianceAudit.value.violations)

const expandedSessions = ref<Set<string>>(new Set());
const toggleSession = (date: string) => {
  const newSet = new Set(expandedSessions.value);
  if (newSet.has(date)) newSet.delete(date);
  else newSet.add(date);
  expandedSessions.value = newSet;
};

const expandedNeuralTrades = ref<Set<string>>(new Set());
const toggleNeuralTrade = (tradeId: string) => {
  const newSet = new Set(expandedNeuralTrades.value);
  if (newSet.has(tradeId)) newSet.delete(tradeId);
  else newSet.add(tradeId);
  expandedNeuralTrades.value = newSet;
};

const getEmotionWeight = (emotion: any) => {
  return getGenesisEmotionWeight(emotion)
};

const emotionalStatus = computed(() => {
  const { score, label } = complianceAudit.value.emotional;
  const appearance = label === 'NEGATIVE'
    ? { colorClass: 'bg-rose-500', textClass: 'text-rose-500' }
    : label === 'POSITIVE'
      ? { colorClass: 'bg-emerald-500', textClass: 'text-emerald-500' }
      : { colorClass: 'bg-yellow-500', textClass: 'text-yellow-500' };
  return { score, label, ...appearance };
});

const complianceMetricsConfigs = computed<MetricConfig[]>(() => [
  {
    key: 'riskPerTrade',
    label: locale.value === 'ru' ? 'Риск на сделку' : 'Risk Per Trade',
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
    label: locale.value === 'ru' ? 'Риск на сессию' : 'Risk Per Session',
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
    label: locale.value === 'ru' ? 'Стиль торговли' : 'Trading Style',
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
    label: locale.value === 'ru' ? 'Нейростатус' : 'Neural Status',
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

const closeToolsMenu = () => {
  showToolsMenu.value = false
}

const openProjectionView = (nextView: 'distribution' | 'tree') => {
  if (nextView === 'distribution' && viewType.value !== 'distribution') {
    previousProjectionView.value = viewType.value
  }
  if (nextView === 'tree') hasOpenedGenesisTree.value = true
  closeNavigationOverlays()
  viewType.value = nextView
}

const exitDistributionView = () => {
  closeNavigationOverlays()
  viewType.value = previousProjectionView.value
}

const openGenesisTreePresets = () => {
  const shouldOpen = !isGenesisTreePresetPanelOpen.value
  closeNavigationOverlays()

  if (shouldOpen) {
    isGenesisTreePresetPanelOpen.value = genesisTreeRef.value?.openPresetPanel?.() ?? true
  }
}

const centerGenesisTree = () => {
  protocolMenuCloseSignal.value += 1
  genesisTreeRef.value?.resetView?.()
}

const exitTreeView = () => {
  closeNavigationOverlays()
  viewType.value = 'timeTree'
}

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

const openCapitalForecastFromMenu = () => {
  closeNavigationOverlays()
  viewType.value = 'timeTree'
  toggleCapitalForecast()
}

const openComplianceFromMenu = () => {
  const shouldOpen = !showComplianceStatus.value
  closeNavigationOverlays()
  viewType.value = 'timeTree'
  showComplianceStatus.value = shouldOpen
}

const acceptCapitalForecastIntro = () => {
  showCapitalForecastIntro.value = false
  showCapitalForecast.value = false
  viewType.value = 'timeTree'
  selectedTradeId.value = null
  timeTreeSelectedTradeId.value = null
  selectedTimeTreeTradeForDetails.value = null
  timeTreeEntryMode.value = 'forecast'
  showTimeTreeTradeDetails.value = true
  closeTradeContextMenu()
}

const rejectCapitalForecastIntro = () => {
  showCapitalForecastIntro.value = false
}

const calculateRR = (trade: any) => {
  const ratio = getTradeRiskReward(trade)
  return Number.isFinite(ratio) ? ratio.toFixed(2) : '0.00'
}

const calculateDuration = (trade: any) => {
  return formatTradeDurationCompact(trade, t('genesis.virtualLog.notAvailable'))
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
  if (timeTreeFilteredTrades.value) return timeTreeFilteredTrades.value

  return currentTrades.value.filter(t => {
    // Side Filter
    if (filterSide.value !== 'ALL' && t.side !== filterSide.value) return false
    
    // Asset Filter
    if (filterAsset.value !== 'ALL' && t.asset !== filterAsset.value) return false
    
    // PnL Filter
    if (!isClosedDiaryTrade(t) && filterPnL.value !== 'ALL') return false
    const pnl = getTradePnlValue(t)
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

// --- 3D MATH TYPES --- //
interface Point3D { x: number; y: number; z: number }
interface Point2D { x: number; y: number; opacity: number; depth: number }

interface TradeNode {
  id: string
  label: string
  faceIndex: number
  seedPos: Point3D
  graphPos: { x: number; y: number }
  velocity: { x: number; y: number }
  date?: string | Date
  pnl?: number
  isNote?: boolean
  isCore?: boolean
  isScenario?: boolean
  scenarioTradeCount?: number
  isOpenTrade?: boolean
  parentId?: string
  anchorPosition?: { x: number; y: number }
}

interface GraphEdge {
  source: string
  target: string
  kind: 'chronological' | 'scenario' | 'note' | 'core'
  distance: number
  strength: number
}

// --- STATE --- //
const currentFace = ref(0)
const isTransitioning = ref(false)

// Trade mapping
const facesTrades = ref<TradeNode[][]>([[]])
const graphEdges = ref<GraphEdge[]>([])
const tradeStore = useStrategyTradesStore()
const genesisTrades = useGenesisTrades()
const genesisMatrix = useGenesisMatrixData()

const selectedStrategyId = computed({
  get: () => tradeStore.selectedStrategyId,
  set: (val) => { tradeStore.selectedStrategyId = val }
})

watch(selectedStrategyId, () => {
  timeTreeFilteredTrades.value = null
})

const tradeForceGraphNodes = computed(() => facesTrades.value[currentFace.value] || [])
const tradeForceGraphLinks = computed(() => graphEdges.value)
const tradeForceGraphCacheKey = computed(() => {
  const nodeIds = tradeForceGraphNodes.value.map(node => node.id).sort().join(',')
  const edgeIds = tradeForceGraphLinks.value
    .map(edge => `${edge.kind}:${edge.source}:${edge.target}`)
    .sort()
    .join(',')
  return `${selectedStrategyId.value}|${isMainDiaryStrategy.value ? 'main' : 'strategy'}|${nodeIds}|${edgeIds}`
})

watch(selectedStrategyId, () => {
  timeTreeFilteredTrades.value = null
  selectedTradeId.value = null
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
const isTradeGraphLoading = ref(true)
const isCubeGraphLoading = computed(() => viewType.value === 'cube' && (isMatrixLoading.value || isTradeGraphLoading.value))
const showStrategyMenu = ref(false)

const getStats = (id: string, allTrades: any[], scenarioId?: string | null) => {
  const presentIn = allTrades.filter(tr => tradeMatchesProtocol(tr, id, scenarioId))
  const count = presentIn.length
  const freq = allTrades.length > 0 ? count / allTrades.length : 0
  
  let gProf = 0, gLoss = 0
  presentIn.forEach(tr => {
    const p = getTradePnlValue(tr)
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

const getNormalizedPnl = (tr: any, initialDeposit = 1000) => {
  return getTradePnlForScore(tr, initialDeposit)
}

const mappedTradeForAnalysis = computed(() => {
  const t = selectedTrade.value as any
  if (!t) return undefined
  
  const allTrades = closedCurrentTrades.value
  const totalCount = allTrades.length

  const stratId = t.strategyId || selectedStrategyId.value
  const deposit = tradeStore.getInitialDeposit(stratId)
  const scoreIndex = buildTradeProfitabilityScoreIndex(allTrades, deposit || 1000)
  const percentileRank = scoreIndex.get(String(t.id || ''))?.score ?? scoreIndex.get(t)?.score ?? getTradeOverallScorePercent(t)

  return {
    ...t,
    percentileRank,
    pnl: getTradePnlValue(t),
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

// Immediate update when trades are added, strategy changes, or filters are modified
watch([selectedStrategyId, filteredTrades, cubeSearchQuery], () => {
  if (viewType.value === 'cube') isTradeGraphLoading.value = true
  initTrades()
}, { deep: true })

const GRAPH_SEED_RADIUS = 75
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
// Deterministic initial positions keep the graph stable before the force layout settles.
const getGraphSeedPosition = (index: number, total: number): Point3D => {
  if (total <= 1) return { x: 0, y: 0, z: 0 }

  const normalizedY = 1 - (index / (total - 1)) * 2
  const ringRadius = Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY))
  const angle = index * GOLDEN_ANGLE

  return {
    x: Math.cos(angle) * ringRadius * GRAPH_SEED_RADIUS,
    y: normalizedY * GRAPH_SEED_RADIUS,
    z: Math.sin(angle) * ringRadius * GRAPH_SEED_RADIUS
  }
}

const flattenMatrixNodesForGraph = (items: any[] = []) => {
  const result: any[] = []
  const walk = (nodes: any[]) => {
    nodes.forEach(node => {
      result.push(node)
      if (node.subGraph?.nodes) walk(node.subGraph.nodes)
    })
  }
  walk(items)
  return result
}

const getTradeScenarioSnapshots = (trade: any) => {
  const snapshots: any[] = []
  const append = (snapshot: any, rawId: unknown, phase: 'ENTRY' | 'EXIT') => {
    const id = String(snapshot?.id || rawId || '').trim()
    if (!id || snapshots.some(item => item.id === id)) return

    const name = String(
      snapshot?.info?.name ||
      snapshot?.params?.customName ||
      snapshot?.label ||
      `ARCHIVED_SCENARIO_${id}`
    ).toUpperCase()

    snapshots.push({
      id,
      label: name,
      type: 'scenario',
      params: {
        ...(snapshot?.params || {}),
        customName: name,
        phase
      },
      isArchived: true
    })
  }

  append(trade?.boardScenarioEntry, trade?.boardScenarioEntryId, 'ENTRY')
  append(trade?.boardScenarioExit, trade?.boardScenarioExitId, 'EXIT')
  if (Array.isArray(trade?.scenarios)) {
    trade.scenarios.forEach((scenario: any) => append(scenario, scenario?.id, scenario?.type === 'exit' ? 'EXIT' : 'ENTRY'))
  }
  return snapshots
}

const strategyScenarioNodes = computed(() => {
  if (isMainDiaryStrategy.value) return []

  const allNodes = matrixNodes.value as any[]
  const strategyNode = allNodes.find(node => node.id === selectedStrategyId.value)
  const scenarioIds = new Set<string>()
  if (strategyNode) {
    flattenMatrixNodesForGraph(strategyNode.subGraph?.nodes || [])
      .filter(node => String(node.type).toLowerCase() === 'scenario')
      .forEach(node => scenarioIds.add(String(node.id)))

    const visited = new Set<string>([String(strategyNode.id)])
    const queue = [String(strategyNode.id)]
    while (queue.length) {
      const currentId = queue.shift()!
      matrixConnections.value
        .filter(connection => String(connection.fromId) === currentId)
        .forEach(connection => {
          const nextId = String(connection.toId)
          if (visited.has(nextId)) return
          visited.add(nextId)
          queue.push(nextId)
          const node = allNodes.find(candidate => String(candidate.id) === nextId)
          if (String(node?.type).toLowerCase() === 'scenario') scenarioIds.add(nextId)
        })
    }
  }

  const scenariosById = new Map<string, any>()
  allNodes
    .filter(node => scenarioIds.has(String(node.id)))
    .forEach(node => scenariosById.set(String(node.id), node))

  // A deleted Matrix node is reconstructed from the immutable scenario
  // snapshot stored on its trades. It remains present while any trade keeps
  // referencing that scenario.
  currentTrades.value.forEach(trade => {
    getTradeScenarioSnapshots(trade).forEach(snapshot => {
      if (!scenariosById.has(snapshot.id)) scenariosById.set(snapshot.id, snapshot)
    })
  })

  return Array.from(scenariosById.values())
})

watch(strategyScenarioNodes, () => {
  if (!isLogComponentMounted) return
  if (viewType.value === 'cube') isTradeGraphLoading.value = true
  initTrades()
}, { deep: true })

const getTradeScenarioIds = (trade: any, knownScenarioIds: Set<string>) => {
  const ids: string[] = []
  const add = (value: unknown) => {
    const id = String(value || '').trim()
    if (id && knownScenarioIds.has(id) && !ids.includes(id)) ids.push(id)
  }

  add(trade?.boardScenarioEntry?.id)
  add(trade?.boardScenarioEntryId)
  add(trade?.boardScenarioExit?.id)
  add(trade?.boardScenarioExitId)
  if (Array.isArray(trade?.scenarios)) trade.scenarios.forEach((scenario: any) => add(scenario?.id))
  return ids
}

const getScenarioCanvasId = (scenarioId: string) => `matrix_scenario_${scenarioId}`

const getScenarioTradeOrbitRadius = (tradeCount: number) => {
  if (tradeCount <= 0) return 0
  return tradeCount === 1 ? 28 : 22 + Math.sqrt(tradeCount) * 5
}

// Keep the same deterministic 3D distribution, but use the compact radius
// reserved for a scenario cluster instead of the full Main Diary seed radius.
const getScenarioTradeSeedPosition = (index: number, total: number): Point3D => {
  const seed = getGraphSeedPosition(index, total)
  const compactRadius = getScenarioTradeOrbitRadius(total)
  const radiusScale = GRAPH_SEED_RADIUS > 0 ? compactRadius / GRAPH_SEED_RADIUS : 0

  return {
    x: seed.x * radiusScale,
    y: seed.y * radiusScale,
    z: seed.z * radiusScale
  }
}

const getScenarioClusterRadius = (tradeCount: number) => {
  return Math.max(18, getScenarioTradeOrbitRadius(tradeCount) + 16)
}

const getScenarioAngles = (count: number) => {
  return Array.from({ length: count }, (_, index) => 0.38 + index * GOLDEN_ANGLE)
}

const getScenarioOrbitRadius = (clusters: Array<{ tradeCount: number }>) => {
  if (clusters.length <= 1) return 126

  const angles = getScenarioAngles(clusters.length)
  let requiredOrbitRadius = 126

  // Size the common orbit against the actual free-flowing angles, rather than
  // assuming evenly spaced 90°/cardinal positions.
  for (let leftIndex = 0; leftIndex < clusters.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < clusters.length; rightIndex += 1) {
      const rawDelta = Math.abs(angles[rightIndex]! - angles[leftIndex]!) % (Math.PI * 2)
      const angularDelta = Math.min(rawDelta, Math.PI * 2 - rawDelta)
      const chordFactor = Math.max(0.18, 2 * Math.sin(angularDelta / 2))
      const requiredDistance = getScenarioClusterRadius(clusters[leftIndex]!.tradeCount) +
        getScenarioClusterRadius(clusters[rightIndex]!.tradeCount) + 28
      requiredOrbitRadius = Math.max(requiredOrbitRadius, requiredDistance / chordFactor)
    }
  }

  return requiredOrbitRadius
}

const initTrades = () => {
  const uniqueTrades = new Map<string, any>()
  filteredTrades.value.forEach((trade: any) => {
    const tradeId = String(trade?.id || '').trim()
    if (tradeId && !uniqueTrades.has(tradeId)) uniqueTrades.set(tradeId, trade)
  })
  const tradesForCanvas = [...uniqueTrades.values()]
    .filter((trade) => isClosedDiaryTrade(trade) && Number.isFinite(getTradePnlValue(trade)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const nodes: TradeNode[] = []
  graphEdges.value = []
  const isMainDiary = isMainDiaryStrategy.value
  const rootId = isMainDiary ? 'main_diary_core' : `strategy_core_${selectedStrategyId.value}`

  nodes.push({
    id: rootId,
    label: selectedStrategyLabel.value,
    faceIndex: 0,
    seedPos: { x: 0, y: 0, z: 0 },
    graphPos: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    isCore: true
  })

  if (isMainDiary) {
    tradesForCanvas.forEach((trade, tradeIndex) => {
      const tradeSeedPos = getGraphSeedPosition(tradeIndex, tradesForCanvas.length)
      const isOpenTrade = !isClosedDiaryTrade(trade)

      nodes.push({
        id: trade.id!,
        label: isOpenTrade
          ? `${formatCubeTradeAssetLabel(trade.asset)} [${openTradeText()}]`
          : `${formatCubeTradeAssetLabel(trade.asset)} [${getTradePnlValue(trade) >= 0 ? '+' : ''}${getTradePnlValue(trade).toFixed(2)}$]`,
        faceIndex: 0,
        seedPos: tradeSeedPos,
        graphPos: { x: tradeSeedPos.x * 0.55, y: tradeSeedPos.y * 0.55 },
        velocity: { x: 0, y: 0 },
        date: trade.date,
        pnl: isOpenTrade ? undefined : getTradePnlValue(trade),
        isNote: false,
        isOpenTrade
      })

      if (trade.notesList && trade.notesList.length > 0) {
        trade.notesList.forEach((note: any, noteIdx: number) => {
          const offsetRadius = 18 + noteIdx * 4
          const angle = (Math.PI * 2 / trade.notesList!.length) * noteIdx
          const noteSeedPos = {
            x: tradeSeedPos.x + Math.cos(angle) * offsetRadius,
            y: tradeSeedPos.y + Math.sin(angle) * offsetRadius,
            z: tradeSeedPos.z + (noteIdx % 2 === 0 ? offsetRadius * 0.35 : -offsetRadius * 0.35)
          }

          nodes.push({
            id: `note_${trade.id}_${note.id}`,
            label: note.title || (locale.value === 'ru' ? 'Послесессионный разбор' : 'Post Mortem'),
            faceIndex: 0,
            seedPos: noteSeedPos,
            graphPos: { x: noteSeedPos.x * 0.55, y: noteSeedPos.y * 0.55 },
            velocity: { x: 0, y: 0 },
            isNote: true,
            parentId: trade.id
          })
          graphEdges.value.push({
            source: trade.id!,
            target: `note_${trade.id}_${note.id}`,
            kind: 'note',
            distance: 72,
            strength: 0.22
          })
        })
      }
    })

    tradesForCanvas.forEach(trade => {
      graphEdges.value.push({
        source: rootId,
        target: trade.id!,
        kind: 'core',
        distance: GRAPH_SEED_RADIUS,
        strength: 0
      })
    })
  } else {
    const scenarioModels = strategyScenarioNodes.value.map((scenario: any) => ({
      id: String(scenario.id),
      label: String(scenario.params?.customName || scenario.label || scenario.id).toUpperCase(),
      tradeIds: [] as string[],
      tradeCount: 0,
      position: { x: 0, y: 0 }
    }))
    const scenarioById = new Map(scenarioModels.map(model => [model.id, model]))
    const knownScenarioIds = new Set(scenarioModels.map(model => model.id))
    const tradeScenarioIds = new Map<string, string[]>()

    tradesForCanvas.forEach(trade => {
      const ids = getTradeScenarioIds(trade, knownScenarioIds)
      tradeScenarioIds.set(String(trade.id), ids)
      ids.forEach(scenarioId => {
        const model = scenarioById.get(scenarioId)
        if (!model || model.tradeIds.includes(String(trade.id))) return
        model.tradeIds.push(String(trade.id))
        model.tradeCount += 1
      })
    })

    const scenarioOrbitRadius = getScenarioOrbitRadius(scenarioModels)
    const scenarioAngles = getScenarioAngles(scenarioModels.length)
    scenarioModels.forEach((model, index) => {
      const angle = scenarioAngles[index] || 0.38
      model.position = {
        x: Math.cos(angle) * scenarioOrbitRadius,
        y: Math.sin(angle) * scenarioOrbitRadius
      }

      const scenarioCanvasId = getScenarioCanvasId(model.id)
      nodes.push({
        id: scenarioCanvasId,
        label: model.label,
        faceIndex: 0,
        seedPos: { x: model.position.x, y: model.position.y, z: 0 },
        graphPos: { ...model.position },
        velocity: { x: 0, y: 0 },
        isScenario: true,
        scenarioTradeCount: model.tradeCount,
        parentId: rootId
      })
      graphEdges.value.push({
        source: rootId,
        target: scenarioCanvasId,
        kind: 'core',
        distance: scenarioOrbitRadius,
        strength: 0
      })
    })

    tradesForCanvas.forEach((trade, tradeIndex) => {
      const ids = tradeScenarioIds.get(String(trade.id)) || []
      const primaryScenario = scenarioById.get(ids[0] || '')
      const memberIndex = primaryScenario?.tradeIds.indexOf(String(trade.id)) ?? -1
      const tradeSeedPos = primaryScenario
        ? getScenarioTradeSeedPosition(Math.max(0, memberIndex), primaryScenario.tradeCount)
        : getGraphSeedPosition(tradeIndex, tradesForCanvas.length)
      const tradeAnchor = primaryScenario?.position
      const isOpenTrade = !isClosedDiaryTrade(trade)

      nodes.push({
        id: trade.id!,
        label: isOpenTrade
          ? `${formatCubeTradeAssetLabel(trade.asset)} [${openTradeText()}]`
          : `${formatCubeTradeAssetLabel(trade.asset)} [${getTradePnlValue(trade) >= 0 ? '+' : ''}${getTradePnlValue(trade).toFixed(2)}$]`,
        faceIndex: 0,
        seedPos: tradeSeedPos,
        graphPos: { x: tradeSeedPos.x * 0.55, y: tradeSeedPos.y * 0.55 },
        velocity: { x: 0, y: 0 },
        date: trade.date,
        pnl: isOpenTrade ? undefined : getTradePnlValue(trade),
        isNote: false,
        isOpenTrade,
        anchorPosition: tradeAnchor
      })

      if (ids.length) {
        ids.forEach(scenarioId => {
          const model = scenarioById.get(scenarioId)
          if (!model) return
          graphEdges.value.push({
            source: getScenarioCanvasId(scenarioId),
            target: trade.id!,
            kind: 'scenario',
            distance: getScenarioTradeOrbitRadius(model.tradeCount),
            strength: 0
          })
        })
      } else {
        graphEdges.value.push({
          source: rootId,
          target: trade.id!,
          kind: 'core',
          distance: GRAPH_SEED_RADIUS,
          strength: 0
        })
      }

      if (trade.notesList && trade.notesList.length > 0) {
        trade.notesList.forEach((note: any, noteIdx: number) => {
          const offsetRadius = 18 + noteIdx * 4
          const angle = (Math.PI * 2 / trade.notesList!.length) * noteIdx
          const noteSeedPos = {
            x: tradeSeedPos.x + Math.cos(angle) * offsetRadius,
            y: tradeSeedPos.y + Math.sin(angle) * offsetRadius,
            z: tradeSeedPos.z + (noteIdx % 2 === 0 ? offsetRadius * 0.35 : -offsetRadius * 0.35)
          }
          const noteId = `note_${trade.id}_${note.id}`
          nodes.push({
            id: noteId,
            label: note.title || (locale.value === 'ru' ? 'Послесессионный разбор' : 'Post Mortem'),
            faceIndex: 0,
            seedPos: noteSeedPos,
            graphPos: { x: noteSeedPos.x * 0.55, y: noteSeedPos.y * 0.55 },
            velocity: { x: 0, y: 0 },
            isNote: true,
            parentId: trade.id,
            anchorPosition: tradeAnchor
          })
          graphEdges.value.push({
            source: trade.id!,
            target: noteId,
            kind: 'note',
            distance: offsetRadius,
            strength: 0
          })
        })
      }
    })
  }

  const uniqueNodes = [...new Map(nodes.map(node => [node.id, node])).values()]
  graphEdges.value = [...new Map(
    graphEdges.value.map(edge => [`${edge.kind}:${edge.source}:${edge.target}`, edge])
  ).values()]
  facesTrades.value = [uniqueNodes]
  currentFace.value = 0
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

/* Legacy trade-canvas projection and collision solver replaced by ExTradeForceGraph.
const projectTradeNode = (node: TradeNode, width: number, height: number): Point2D => {
  const zoom = viewScale.value

  if (usesMainDiaryNodePositioning(node)) {
    const focalLength = 900
    const depth = node.isCore ? 0 : node.seedPos.z
    const perspective = focalLength / (focalLength + depth)
    const anchorX = node.isCore ? 0 : (node.anchorPosition?.x || 0)
    const anchorY = node.isCore ? 0 : (node.anchorPosition?.y || 0)
    const localX = node.isCore ? 0 : node.seedPos.x
    const localY = node.isCore ? 0 : node.seedPos.y
    return {
      x: anchorX * zoom + localX * zoom * perspective + width / 2 + viewOffset.value.x,
      y: anchorY * zoom + localY * zoom * perspective + height / 2 + viewOffset.value.y,
      opacity: node.isCore ? 1 : Math.max(0.28, Math.min(1, 0.42 + (depth + GRAPH_SEED_RADIUS) / (GRAPH_SEED_RADIUS * 2) * 0.58)),
      depth
    }
  }

  return {
    x: node.graphPos.x * zoom + width / 2 + viewOffset.value.x,
    y: node.graphPos.y * zoom + height / 2 + viewOffset.value.y,
    opacity: 1,
    depth: 0
  }
}

// Resolve collisions in screen space so the guarantee still holds for the
// perspective layout used by the main diary and for the flat strategy graph.
const resolveProjectedTradeNodeOverlaps = (
  nodes: TradeNode[],
  width: number,
  height: number,
  degreeMap: Map<string, number>
) => {
  if (nodes.length < 2) return

  const zoom = Math.max(0.5, viewScale.value)
  const iterations = Math.min(12, Math.max(3, nodes.length))

  const moveNodeInScreenSpace = (node: TradeNode, dx: number, dy: number) => {
    if (usesMainDiaryNodePositioning(node)) {
      const focalLength = 900
      const depth = node.isCore ? 0 : node.seedPos.z
      const perspective = focalLength / (focalLength + depth)
      node.seedPos.x += dx / (zoom * perspective)
      node.seedPos.y += dy / (zoom * perspective)
      return
    }

    node.graphPos.x += dx / zoom
    node.graphPos.y += dy / zoom
  }

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let moved = false
    const projected = nodes.map(node => projectTradeNode(node, width, height))

    for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
      const left = nodes[leftIndex]!
      const leftPoint = projected[leftIndex]!
      const leftRadius = getTradeNodeScreenRadius(left, degreeMap.get(left.id) || 1)

      for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
        const right = nodes[rightIndex]!
        const rightPoint = projected[rightIndex]!
        const rightRadius = getTradeNodeScreenRadius(right, degreeMap.get(right.id) || 1)
        let dx = rightPoint.x - leftPoint.x
        let dy = rightPoint.y - leftPoint.y
        let distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 0.01) {
          const angle = (leftIndex * 1.7 + rightIndex * 2.3) % (Math.PI * 2)
          dx = Math.cos(angle)
          dy = Math.sin(angle)
          distance = 1
        }

        const requiredDistance = leftRadius + rightRadius + 3
        if (distance >= requiredDistance) continue

        const correction = requiredDistance - distance
        const nx = dx / distance
        const ny = dy / distance
        moved = true

        const leftIsAnchor = isTradeClusterAnchor(left)
        const rightIsAnchor = isTradeClusterAnchor(right)

        if (leftIsAnchor && !rightIsAnchor) {
          moveNodeInScreenSpace(right, nx * correction, ny * correction)
        } else if (rightIsAnchor && !leftIsAnchor) {
          moveNodeInScreenSpace(left, -nx * correction, -ny * correction)
        } else if (!leftIsAnchor && !rightIsAnchor) {
          moveNodeInScreenSpace(left, -nx * correction * 0.5, -ny * correction * 0.5)
          moveNodeInScreenSpace(right, nx * correction * 0.5, ny * correction * 0.5)
        }
      }
    }

    if (!moved) break
  }
}

*/

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

/* Legacy trade-canvas renderer replaced by ExTradeForceGraph.
// Extract expensive path computation out of RAF loop
const chronologicalPathNodes = computed(() => {
  const scopedTrades = [...currentTrades.value].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const allTradeNodes = facesTrades.value.flat().filter(n => !n.isNote)
  const nodeMap = new Map(allTradeNodes.map(n => [n.id, n]))
  
  // Use exact diary order
  return scopedTrades.map(t => nodeMap.get(t.id!)).filter(Boolean) as TradeNode[]
})

// Obsidian-style force layout. Linked nodes behave like springs, while every
// node repels the others and a light center force keeps the graph in view.
const simulateGraph = () => {
  if (isMainDiaryStrategy.value) return
  const nodes = facesTrades.value[currentFace.value] || []
  if (nodes.length < 2 || graphAlpha.value <= 0.001) return

  const forces = new Map(nodes.map(node => [node.id, { x: 0, y: 0 }]))
  const alpha = graphAlpha.value

  for (let i = 0; i < nodes.length; i += 1) {
    const left = nodes[i]!
    for (let j = i + 1; j < nodes.length; j += 1) {
      const right = nodes[j]!
      let dx = right.graphPos.x - left.graphPos.x
      let dy = right.graphPos.y - left.graphPos.y
      const distanceSquared = dx * dx + dy * dy
      if (distanceSquared < 0.01) {
        dx = (i + 1) * 0.7
        dy = (j + 1) * 0.4
      }

      const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy))
      const repulsion = Math.min(28, 1450 / (distance * distance)) * alpha
      const forceX = (dx / distance) * repulsion
      const forceY = (dy / distance) * repulsion
      forces.get(left.id)!.x -= forceX
      forces.get(left.id)!.y -= forceY
      forces.get(right.id)!.x += forceX
      forces.get(right.id)!.y += forceY
    }

    const centerForce = 0.004 * alpha
    forces.get(left.id)!.x -= left.graphPos.x * centerForce
    forces.get(left.id)!.y -= left.graphPos.y * centerForce
  }

  const nodeMap = new Map(nodes.map(node => [node.id, node]))
  graphEdges.value.forEach(edge => {
    const source = nodeMap.get(edge.source)
    const target = nodeMap.get(edge.target)
    if (!source || !target) return

    const dx = target.graphPos.x - source.graphPos.x
    const dy = target.graphPos.y - source.graphPos.y
    const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy))
    const spring = (distance - edge.distance) * edge.strength * alpha
    const forceX = (dx / distance) * spring
    const forceY = (dy / distance) * spring
    forces.get(source.id)!.x += forceX
    forces.get(source.id)!.y += forceY
    forces.get(target.id)!.x -= forceX
    forces.get(target.id)!.y -= forceY
  })

  nodes.forEach(node => {
    const force = forces.get(node.id)!
    node.velocity.x = (node.velocity.x + force.x) * 0.86
    node.velocity.y = (node.velocity.y + force.y) * 0.86
    const speed = Math.sqrt(node.velocity.x ** 2 + node.velocity.y ** 2)
    if (speed > 8) {
      node.velocity.x = (node.velocity.x / speed) * 8
      node.velocity.y = (node.velocity.y / speed) * 8
    }
    node.graphPos.x += node.velocity.x * 0.22
    node.graphPos.y += node.velocity.y * 0.22
  })

  graphAlpha.value *= 0.992
}

let rafId: number | null = null
let renderScheduled = false
let isLogComponentMounted = false
let nodeLayoutDebounceTimeout: ReturnType<typeof setTimeout> | null = null
const renderFrame = () => {
  if (viewType.value === 'distribution') {
    renderDistributionChart()
    return
  }

  if (viewType.value !== 'cube') return

  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    if (width > 0 && height > 0) {
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
    }
  }

  const w = width, h = height
  if (w === 0 || h === 0) return

  isTradeGraphLoading.value = false

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  if (revealProgress.value < 1) {
    revealProgress.value += 0.015
  }
  
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'

  simulateGraph()
  const face = facesTrades.value[currentFace.value] || []
  const nodeMap = new Map(face.map(node => [node.id, node]))
  const degreeMap = nodeDegreeMap
  if (nodeLayoutDirty) {
    // The minimum scale is the most collision-heavy state. Do this pass
    // synchronously so the first frame at max zoom-out already has the final
    // positions instead of waiting for the worker response.
    const requiresImmediateLayout = viewScale.value <= MIN_TRADE_GRAPH_SCALE
    if (requiresImmediateLayout && face.length > 1) {
      resolveProjectedTradeNodeOverlaps(face, w, h, degreeMap)
      nodeLayoutDirty = false
      saveTradeLayoutToCache(face, graphEdges.value)
    } else if (tradeLayoutWorker && !tradeLayoutWorkerBusy && face.length > 1) {
      nodeLayoutDirty = false
      requestTradeLayoutWorker(face, w, h)
    } else if (!tradeLayoutWorker || face.length <= 1) {
      resolveProjectedTradeNodeOverlaps(face, w, h, degreeMap)
      nodeLayoutDirty = false
      saveTradeLayoutToCache(face, graphEdges.value)
    }
  }
  const connectedToHovered = (id: string) => {
    if (!hoveredTradeNodeId.value) return true
    if (id === hoveredTradeNodeId.value) return true
    return graphEdges.value.some(edge =>
      (edge.source === hoveredTradeNodeId.value && edge.target === id) ||
      (edge.target === hoveredTradeNodeId.value && edge.source === id)
    )
  }

  // Links are rendered first, like Obsidian's graph view. Hovering a node
  // keeps its neighborhood bright and softly fades unrelated connections.
  graphEdges.value.forEach(edge => {
    const source = nodeMap.get(edge.source)
    const target = nodeMap.get(edge.target)
    if (!source || !target) return
    const sourceReveal = getCubeRevealProgress(source).icon
    const targetReveal = getCubeRevealProgress(target).icon
    if (Math.min(sourceReveal, targetReveal) <= 0.01) return

    const sourcePoint = projectTradeNode(source, w, h)
    const targetPoint = projectTradeNode(target, w, h)
    const active = !hoveredTradeNodeId.value || edge.source === hoveredTradeNodeId.value || edge.target === hoveredTradeNodeId.value
    ctx.save()
    const depthOpacity = Math.min(sourcePoint.opacity, targetPoint.opacity)
    ctx.globalAlpha = Math.min(sourceReveal, targetReveal) * depthOpacity * (active
      ? (edge.kind === 'core' || edge.kind === 'scenario' ? 0.10 : 0.30)
      : 0.03)
    ctx.strokeStyle = isDark.value ? '#cbd5e1' : '#334155'
    ctx.lineWidth = edge.kind === 'core'
      ? Math.max(0.8, viewScale.value * 0.12)
      : edge.kind === 'scenario'
        ? Math.max(0.9, viewScale.value * 0.18)
      : edge.kind === 'chronological'
        ? Math.max(1, viewScale.value * 0.22)
        : Math.max(0.8, viewScale.value * 0.14)
    ctx.beginPath()
    ctx.moveTo(sourcePoint.x, sourcePoint.y)
    ctx.lineTo(targetPoint.x, targetPoint.y)
    ctx.stroke()
    ctx.restore()
  })

  face.forEach(node => {
    const proj = projectTradeNode(node, w, h)
    const reveal = getCubeRevealProgress(node)
    if (reveal.icon <= 0.01) return

    const degree = degreeMap.get(node.id) || 1
    const focusMultiplier = getTradeNodeFocusMultiplier()
    const isHovered = hoveredTradeNodeId.value === node.id
    const isDimmed = hoveredTradeNodeId.value !== null && !connectedToHovered(node.id)
    const radius = getTradeNodeScreenRadius(node, degree)
    const color = getTradeNodeColor(node)

    ctx.save()
    ctx.globalAlpha = reveal.icon * (isDimmed ? 0.18 : 1)
    ctx.fillStyle = color
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.beginPath()
    ctx.arc(proj.x, proj.y, radius * (0.72 + reveal.icon * 0.28), 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Keep the graph clean: labels are shown only for the node currently under the cursor.
    const shouldShowLabel = isHovered
    if (shouldShowLabel && !isDimmed && reveal.label > 0.01) {
      ctx.save()
      ctx.globalAlpha = reveal.label
      ctx.fillStyle = node.isCore
        ? (isDark.value ? '#f8fafc' : '#0f172a')
        : node.isNote
        ? (isDark.value ? '#94a3b8' : '#475569')
        : node.isOpenTrade
          ? (isDark.value ? '#fde68a' : '#a16207')
          : getTradeNodeColor(node)
      const dynamicFontSize = Math.max(node.isCore ? 10 : node.isNote ? 8 : 10, Math.floor((node.isCore ? 10 : node.isNote ? 8 : 11) * focusMultiplier))
      ctx.font = `bold ${dynamicFontSize}px Inter`
      if (node.isCore) {
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(node.label, proj.x, proj.y - radius - 8 * focusMultiplier)
      } else {
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(node.label, proj.x + radius + 7 * focusMultiplier, proj.y + dynamicFontSize * 0.35)
      }
      ctx.restore()
    }
  })

}

const shouldContinuouslyRender = () => {
  return viewType.value === 'distribution' || isCubeRevealAnimating.value
}

const scheduleRender = () => {
  if (!isLogComponentMounted || renderScheduled) return
  renderScheduled = true
  rafId = requestAnimationFrame(() => {
    renderScheduled = false
    rafId = null
    renderFrame()
    if (shouldContinuouslyRender()) scheduleRender()
  })
}

const applyTradeLayoutWorkerResult = (updates: Array<{
  id: string
  seedPos: Point3D
  graphPos: { x: number; y: number }
}>) => {
  const nodes = facesTrades.value[currentFace.value] || []
  const nodeMap = new Map(nodes.map(node => [node.id, node]))

  updates.forEach(update => {
    const node = nodeMap.get(update.id)
    if (!node || !isValidCachedTradeLayoutNode(update)) return
    node.seedPos = { ...update.seedPos }
    node.graphPos = { ...update.graphPos }
    node.velocity = { x: 0, y: 0 }
  })
}

const requestTradeLayoutWorker = (nodes: TradeNode[], width: number, height: number) => {
  if (!tradeLayoutWorker || tradeLayoutWorkerBusy) return false

  tradeLayoutWorkerBusy = true
  tradeLayoutWorkerRequestId += 1
  tradeLayoutWorkerRevision = tradeLayoutRevision

  tradeLayoutWorker.postMessage({
    type: 'resolve',
    requestId: tradeLayoutWorkerRequestId,
    width,
    height,
    zoom: viewScale.value,
    isMainDiary: isMainDiaryStrategy.value,
    degreeMap: Array.from(nodeDegreeMap.entries()),
    nodes: nodes.map(node => ({
      id: node.id,
      isCore: node.isCore,
      isScenario: node.isScenario,
      seedPos: { ...node.seedPos },
      graphPos: { ...node.graphPos },
      anchorPosition: node.anchorPosition ? { ...node.anchorPosition } : undefined
    }))
  })
  return true
}

const handleTradeLayoutWorkerMessage = (event: MessageEvent<any>) => {
  const result = event.data
  if (result?.type !== 'resolved' || result.requestId !== tradeLayoutWorkerRequestId) return

  tradeLayoutWorkerBusy = false
  if (viewType.value !== 'cube') return

  if (tradeLayoutWorkerRevision !== tradeLayoutRevision) {
    scheduleRender()
    return
  }

  applyTradeLayoutWorkerResult(result.nodes || [])
  const nodes = facesTrades.value[currentFace.value] || []
  nodeLayoutDirty = false
  saveTradeLayoutToCache(nodes, graphEdges.value)
  scheduleRender()
}

const initTradeLayoutWorker = () => {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return

  try {
    tradeLayoutWorker = new Worker(new URL('./workers/trade-layout.worker.ts', import.meta.url), { type: 'module' })
    tradeLayoutWorker.onmessage = handleTradeLayoutWorkerMessage
    tradeLayoutWorker.onerror = () => {
      tradeLayoutWorker?.terminate()
      tradeLayoutWorker = null
      tradeLayoutWorkerBusy = false
      nodeLayoutDirty = true
      scheduleRender()
    }
  } catch {
    tradeLayoutWorker = null
  }
}

let graphLayoutRequestId = 0
let graphResizeObserver: ResizeObserver | null = null

const waitForNextFrame = () => new Promise<void>((resolve) => {
  requestAnimationFrame(() => resolve())
})

const refreshCubeGraphLayout = async () => {
  const requestId = ++graphLayoutRequestId
  await nextTick()
  await waitForNextFrame()
  await waitForNextFrame()

  if (requestId !== graphLayoutRequestId || viewType.value !== 'cube') return

  const canvas = canvasRef.value
  if (!canvas || canvas.clientWidth <= 0 || canvas.clientHeight <= 0) return

  renderFrame()
  scheduleRender()
}

const handleCanvasResize = () => {
  tradeLayoutRevision += 1
  nodeLayoutDirty = true
  scheduleRender()
}

const handleTradeContextMenuPointerDown = (event: PointerEvent) => {
  const target = event.target as HTMLElement | null
  if (!target?.closest('[data-trade-context-menu]')) closeTradeContextMenu()
}

watch(isDark, () => scheduleRender())

const findNearestTradeNode = (e: MouseEvent) => {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return null

  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top
  const hitRadius = Math.max(18, 15 * (viewScale.value / 2.2))
  let nearest: { id: string, dist: number, node: TradeNode } | null = null

  for (const node of facesTrades.value[currentFace.value] || []) {
    if (getCubeRevealProgress(node).icon <= 0.2) continue
    const proj = projectTradeNode(node, rect.width, rect.height)
    const dist = Math.sqrt((proj.x - mouseX) ** 2 + (proj.y - mouseY) ** 2)
    if (dist < hitRadius && (!nearest || dist < nearest.dist)) {
      nearest = { id: node.id, dist, node }
    }
  }

  return nearest
}

*/

let rafId: number | null = null
let renderScheduled = false
let isLogComponentMounted = false

const renderFrame = () => {
  if (viewType.value === 'distribution') renderDistributionChart()
}

const shouldContinuouslyRender = () => viewType.value === 'distribution'

const scheduleRender = () => {
  if (!isLogComponentMounted || renderScheduled) return
  renderScheduled = true
  rafId = requestAnimationFrame(() => {
    renderScheduled = false
    rafId = null
    renderFrame()
    if (shouldContinuouslyRender()) scheduleRender()
  })
}

const handleCanvasResize = () => scheduleRender()

const handleTradeContextMenuPointerDown = (event: PointerEvent) => {
  const target = event.target as HTMLElement | null
  if (!target?.closest('[data-trade-context-menu]')) closeTradeContextMenu()
}

watch(isDark, () => scheduleRender())

const selectTradeNode = (trade: any, event?: MouseEvent) => {
  if (!trade) return
  if (trade.isCore) return

  const tradeId = trade.isNote && trade.parentId
    ? trade.parentId
    : trade.id

  selectedTradeId.value = tradeId
  showExtraDetails.value = false

  if (event) {
    tradeContextMenu.value = {
      x: event.clientX,
      y: event.clientY,
      tradeId,
      source: 'canvas'
    }
  }
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
  isLogComponentMounted = true
  window.addEventListener('keydown', handleTimeTreeFullscreenKeydown, true)
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('pointerdown', handleTradeContextMenuPointerDown)
  window.addEventListener('resize', handleCanvasResize)
  isMatrixLoading.value = true
  await Promise.all([
    ensureMatrixDataRestored(),
    tradeStore.init()
  ])
  if (!isLogComponentMounted) return
  isMatrixLoading.value = false
  initTrades()
  scheduleRender()
})
onUnmounted(() => { 
  isLogComponentMounted = false
  window.removeEventListener('keydown', handleTimeTreeFullscreenKeydown, true)
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('pointerdown', handleTradeContextMenuPointerDown)
  window.removeEventListener('resize', handleCanvasResize)
  if (cubeSearchTimeout) {
    clearTimeout(cubeSearchTimeout)
    cubeSearchTimeout = null
  }
  if (rafId !== null) cancelAnimationFrame(rafId)
  rafId = null
  renderScheduled = false
})
</script>

<style scoped>
.diary-3d-hub { font-family: 'Inter', sans-serif; }
canvas {
  image-rendering: pixelated;
  transform: translateZ(0);
  will-change: transform;
}

.protocol-slide-enter-active, .protocol-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.protocol-slide-enter-from, .protocol-slide-leave-to {
  opacity: 0;
  transform: translateY(20px);
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
  transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
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
