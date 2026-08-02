<template>
  <Transition name="exforum-page-reify" appear>
    <div
      ref="journalWrapperRef"
      class="journal-wrapper force-light-theme bg-theme-bg text-theme-text h-full flex flex-col min-w-0 overflow-y-auto scroll-minimal relative pt-4 md:pt-6"
      :class="{
        'exforum-transparent-bg': isForumLightTheme,
        'exforum-edge-shadows': showForumEdgeShadows,
        '!overflow-hidden': isBoardFullscreen || isCreatingArticle
      }"
    >
    <Transition name="fade-slide">
      <section
        v-if="isBoardFullscreen"
        ref="boardViewportRef"
        class="fixed z-[9000] cursor-grab select-none overflow-hidden bg-white bg-[radial-gradient(circle,rgba(0,0,0,0.1)_1px,transparent_1.6px)] bg-[length:28px_28px] bg-center text-[#2c2c2a] active:cursor-grabbing"
        :style="boardFullscreenViewportStyle"
        :aria-label="articleLabels.fullscreenBoard"
        @pointerdown="startBoardPan"
      >
        <button
          class="absolute left-1/2 top-5 z-20 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 border border-black/20 bg-white/90 px-4 py-3 text-center font-mono text-[10px] uppercase leading-relaxed tracking-[0.2em] text-black/65 shadow-[0_8px_22px_rgba(0,0,0,0.08)] transition-colors hover:border-black/40 hover:text-black sm:px-5"
          type="button"
          @click.stop="closeBoardFullscreen"
        >
          {{ fullscreenExitLabel }}
        </button>

        <div
          class="absolute left-2 top-32 z-30 flex items-start gap-3 text-black pointer-events-none"
          data-board-chrome
          @pointerdown.stop
          @click.stop
        >
          <div class="relative ml-3 flex flex-col items-center gap-2">
            <div class="article-board-tool">
              <button
                type="button"
                class="pointer-events-auto flex h-8 w-8 items-center justify-center border border-black/20 bg-white text-[10px] font-mono italic opacity-70 transition-colors hover:bg-black/5 hover:opacity-100"
                :aria-label="locale === 'ru' ? 'Сбросить вид' : 'Reset view'"
                @click.stop="resetArticleBoardFullscreenView"
              >
                [R]
              </button>
              <span class="article-board-tool-tooltip">{{ locale === 'ru' ? 'Сбросить вид' : 'Reset view' }}</span>
            </div>
          </div>

          <div class="flex flex-col gap-6 border-l border-black/20 py-1 pl-4">
            <div class="flex flex-col">
              <span class="text-[8px] font-mono uppercase tracking-widest opacity-40">
                Viewport_Telemetry
              </span>
              <span class="text-[12px] font-mono uppercase tracking-widest opacity-80">
                {{ (boardScale * 100).toFixed(0) }}% // FOCUS
              </span>
            </div>

            <div class="flex flex-col space-y-1">
              <button
                v-for="zoom in boardScaleOptions"
                :key="zoom"
                type="button"
                class="pointer-events-auto relative flex h-5 w-12 items-center justify-center overflow-hidden border border-black/20 bg-white text-[9px] font-mono tracking-tighter transition-all"
                :class="Math.round(boardScale * 100) === zoom ? '!border-black !bg-black !text-white opacity-100' : 'text-black/55 opacity-70 hover:bg-black/5 hover:text-black hover:opacity-100'"
                @click.stop="setArticleBoardScale(zoom / 100)"
              >
                <div v-if="Math.round(boardScale * 100) === zoom" class="absolute inset-0 bg-white/10 animate-pulse"></div>
                <span class="relative z-10" :class="Math.round(boardScale * 100) === zoom ? '!text-white' : ''">{{ zoom }}%</span>
                <div class="absolute right-0 top-0 h-1 w-1 bg-current opacity-20"></div>
              </button>
            </div>
          </div>
        </div>

        <div
          class="absolute left-0 top-0 origin-top-left"
          :style="[boardWorldStyle, boardTransformStyle]"
        >
          <svg class="pointer-events-none absolute left-0 top-0 h-full w-full overflow-visible text-black/35">
            <path
              v-for="connection in boardConnections"
              :key="connection.id"
              :d="getBoardConnectionPath(connection)"
              fill="none"
              stroke="currentColor"
              stroke-width="1.2"
              vector-effect="non-scaling-stroke"
              class="opacity-70"
            />
          </svg>
          <article
            v-for="node in boardNodes"
            :key="node.id"
            data-board-node
            class="absolute box-border overflow-hidden border border-black/20 bg-white/90 shadow-[0_16px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm"
            :style="getBoardNodeStyle(node)"
          >
              <div v-if="node.type === 'text'" class="flex h-full flex-col" :style="getBoardTextShellStyle()">
                <h3
                  v-if="!node.isQuestion"
                  class="font-serif italic text-black/80"
                  :style="getBoardTextTitleStyle()"
                  v-html="node.title || boardUiLabels.untitled"
                ></h3>
                <div
                  class="min-h-0 overflow-hidden font-serif italic break-words"
                  :class="node.isQuestion ? 'text-black/80' : 'text-black/55'"
                  :style="getBoardTextBodyStyle(node)"
                  v-html="node.text"
                ></div>
              </div>

            <div v-else-if="node.type === 'image'" class="flex h-full flex-col">
              <img :src="node.src" :alt="node.alt" class="min-h-0 flex-1 object-cover" draggable="false" />
              <p
                v-if="node.caption"
                class="border-t border-black/10 font-mono uppercase tracking-[0.28em] text-black/35"
                :style="getBoardCaptionStyle()"
              >
                {{ node.caption }}
              </p>
            </div>

            <div v-else-if="node.type === 'drawing'" class="flex h-full w-full flex-col relative bg-transparent overflow-hidden">
              <img v-if="node.params?.preview" :src="node.params.preview" alt="" class="absolute inset-0 h-full w-full object-fill pointer-events-none" draggable="false" />
              <svg v-else class="absolute inset-0 w-full h-full pointer-events-none text-black" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline v-for="stroke in node.params?.strokes || []" :key="stroke.id" :points="drawing.formatDrawingStroke(stroke)" fill="none" :stroke="stroke.color || 'currentColor'" :stroke-width="stroke.size || 2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" class="opacity-90" />
              </svg>
            </div>

            <div v-else-if="node.type === 'price'" class="flex h-full w-full flex-col items-center justify-center bg-white/80 font-mono" :style="getBoardPriceShellStyle()">
              <span class="font-black uppercase tracking-[0.2em] text-black/40" :style="getBoardPriceLabelStyle()">
                {{ node.priceKind === 'current' ? (locale === 'ru' ? 'ТЕКУЩАЯ ЦЕНА' : 'CURRENT PRICE') : (locale === 'ru' ? 'ПРЕДПОЛАГАЕМАЯ ЦЕНА' : 'PROJECTED PRICE') }}
              </span>
              <span
                class="truncate text-center font-black"
                :class="getPriceNodeValueClass(node)"
                :style="getBoardPriceValueStyle()"
              >
                <template v-if="getPriceNodeArrow(node)">{{ getPriceNodeArrow(node) }} </template>{{ node.value || priceNodePlaceholder(node) }}
              </span>
            </div>

            <div v-else-if="node.type === 'asset'" class="flex h-full w-full items-center justify-center bg-white/80 font-mono" :style="getBoardAssetShellStyle()">
              <div class="flex min-w-0 flex-col items-center justify-center text-center" :style="getBoardAssetInnerStyle()">
                <span class="max-w-full truncate font-black uppercase tracking-widest text-black/75" :style="getBoardAssetLabelStyle()">
                  {{ getAssetNodeLabel(node) }}
                </span>
                <span v-if="getAssetNodeTypeLabel(node)" class="max-w-full truncate font-black uppercase tracking-[0.3em] text-black/35" :style="getBoardAssetTypeStyle()">
                  {{ getAssetNodeTypeLabel(node) }}
                </span>
              </div>
            </div>

            <div v-else-if="node.type === 'strategy'" class="flex h-full w-full flex-col justify-center bg-white/80 font-mono" :style="getBoardDataShellStyle(12, 16)">
              <span class="truncate font-black uppercase tracking-widest text-black/80" :style="getBoardDataTitleStyle(16)">{{ getStrategyNodeLabel(node) }}</span>
              <div v-if="getStrategyNodeMetrics(node)" class="grid grid-cols-5 text-center uppercase" :style="getBoardDataGridStyle(6)">
                <span class="flex min-w-0 flex-col border border-black/10" :style="getBoardDataCellStyle(6, 4)">
                  <small class="font-black tracking-[0.18em] text-black/40" :style="getBoardDataLabelStyle(8)">{{ boardUiLabels.profitFactorShort }}</small>
                  <strong class="truncate font-black text-black/85" :style="getBoardDataValueStyle(14)">{{ formatProfitFactor(getStrategyNodeMetrics(node)!.profitFactor) }}</strong>
                </span>
                <span class="flex min-w-0 flex-col border border-black/10" :style="getBoardDataCellStyle(6, 4)">
                  <small class="font-black tracking-[0.18em] text-black/40" :style="getBoardDataLabelStyle(8)">{{ boardUiLabels.winRateShort }}</small>
                  <strong class="truncate font-black text-black/85" :style="getBoardDataValueStyle(14)">{{ formatCompactNumber(getStrategyNodeMetrics(node)!.winRate, 1) }}%</strong>
                </span>
                <span class="flex min-w-0 flex-col border border-black/10" :style="getBoardDataCellStyle(6, 4)">
                  <small class="font-black tracking-[0.18em] text-black/40" :style="getBoardDataLabelStyle(8)">{{ boardUiLabels.resultShort }}</small>
                  <strong class="truncate font-black" :class="getResultToneClass(getStrategyNodeMetrics(node)!.resultCurrency)" :style="getBoardDataValueStyle(14)">{{ formatSignedCurrency(getStrategyNodeMetrics(node)!.resultCurrency) }}</strong>
                </span>
                <span class="flex min-w-0 flex-col border border-black/10" :style="getBoardDataCellStyle(6, 4)">
                  <small class="font-black tracking-[0.18em] text-black/40" :style="getBoardDataLabelStyle(8)">{{ boardUiLabels.startShort }}</small>
                  <strong class="truncate font-black text-black/85" :style="getBoardDataValueStyle(14)">{{ formatCurrencyValue(getStrategyNodeMetrics(node)!.initialCapital) }}</strong>
                </span>
                <span class="flex min-w-0 flex-col border border-black/10" :style="getBoardDataCellStyle(6, 4)">
                  <small class="font-black tracking-[0.18em] text-black/40" :style="getBoardDataLabelStyle(8)">{{ boardUiLabels.endShort }}</small>
                  <strong class="truncate font-black" :class="getResultToneClass(getStrategyNodeMetrics(node)!.finalCapital - getStrategyNodeMetrics(node)!.initialCapital)" :style="getBoardDataValueStyle(14)">{{ formatCurrencyValue(getStrategyNodeMetrics(node)!.finalCapital) }}</strong>
                </span>
              </div>
            </div>

            <div v-else-if="node.type === 'trade'" class="flex h-full w-full flex-col justify-center bg-white/80 font-mono" :style="getBoardDataShellStyle(12, 16)">
              <div class="flex items-start justify-between" :style="getBoardDataGridStyle(12)">
                <div class="flex min-w-0 flex-col text-left">
                  <span class="truncate font-black uppercase tracking-widest text-black/80" :style="getBoardDataTitleStyle(16)">{{ getTradeNodeAssetLabel(node) }}</span>
                  <span class="truncate font-black uppercase tracking-[0.24em]" :class="getTradeNodeVectorClass(node)" :style="getBoardDataLabelStyle(9)">{{ getTradeNodeVector(node) }}</span>
                </div>
                <span class="max-w-[45%] truncate text-right font-black uppercase tracking-[0.16em]" :class="getTradeNodeResultClass(node)" :style="getBoardDataValueStyle(12)">
                  {{ getTradeNodeResult(node) || boardUiLabels.select }}
                </span>
              </div>
              <div class="grid grid-cols-2 text-center uppercase" :style="getBoardDataGridStyle(6)">
                <span class="flex min-w-0 flex-col border border-black/10" :style="getBoardDataCellStyle(6, 4)">
                  <small class="font-black tracking-[0.16em] text-black/40" :style="getBoardDataLabelStyle(8)">{{ boardUiLabels.entryShort }}</small>
                  <strong class="truncate font-black text-black/80" :style="getBoardDataValueStyle(11)">{{ getTradeNodeEntryDate(node) }}</strong>
                </span>
                <span class="flex min-w-0 flex-col border border-black/10" :style="getBoardDataCellStyle(6, 4)">
                  <small class="font-black tracking-[0.16em] text-black/40" :style="getBoardDataLabelStyle(8)">{{ boardUiLabels.exitShort }}</small>
                  <strong class="truncate font-black text-black/80" :style="getBoardDataValueStyle(11)">{{ getTradeNodeExitDate(node) }}</strong>
                </span>
              </div>
            </div>

          </article>
        </div>
        <div class="pointer-events-none absolute inset-0 bg-black/[0.025]"></div>
      </section>
    </Transition>

    <Transition name="fade-slide" mode="out-in">
    <!-- READER VIEW: Detailed Content -->
    <article v-if="selectedArticle" class="journal-article-reader relative isolate flex flex-col min-h-full" key="reader">
      <div class="pointer-events-none absolute inset-x-0 -top-96 bottom-0 z-0 overflow-hidden">
        <img
          src="/assets/ui/eves.svg"
          alt=""
          aria-hidden="true"
          class="exforum-frontpage-bg-image absolute inset-y-0 left-0 h-full min-h-screen w-auto max-w-none select-none object-contain opacity-[0.06]"
        />
      </div>

      <header class="article-reader-header relative z-10">
        <div class="article-reader-toolbar">
          <button
            @click="closeReader"
            class="article-reader-back group"
            :aria-label="articleLabels.returnToJournal"
          >
            <span class="article-reader-back-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter">
                <path d="M15 6L9 12L15 18" />
                <path d="M9 12H21" />
              </svg>
            </span>
            <span class="article-reader-back-label">{{ locale === 'ru' ? 'НАЗАД' : 'BACK' }}</span>
          </button>
        </div>

        <div class="article-reader-title-row">
          <div class="min-w-0">
            <span class="text-[10px] font-mono tracking-widest uppercase text-current/40 mb-1 block">{{ locale === 'ru' ? 'Название' : 'Title' }}</span>
            <h1>{{ selectedArticle.title }}</h1>
            <div class="mt-6 mb-5 flex w-3/4 max-w-md items-center gap-4">
              <div class="h-[1px] w-8 bg-current/10 shrink-0"></div>
              <span class="text-[9px] font-mono tracking-[0.3em] uppercase text-current/40 shrink-0">
                {{ locale === 'ru' ? 'АВТОР' : 'BY' }} <span class="text-current/70 font-bold ml-1">{{ selectedArticle.author }}</span><ExUserStatusBadge v-if="selectedArticleAuthorStatus" :status="selectedArticleAuthorStatus" class="ml-2 align-middle" />
              </span>
              <div class="h-[1px] flex-1 bg-current/10"></div>
            </div>
            <p class="text-current/90 leading-relaxed">{{ selectedArticle.description }}</p>
          </div>

          <div class="article-reader-metrics" :aria-label="articleLabels.metrics">
            <div v-for="metric in selectedArticle.metrics" :key="metric.id" class="article-reader-metric">
              <span>{{ getMetricLabel(metric.label) }}</span>
              <strong>{{ metric.value }}</strong>
            </div>
          </div>
        </div>
      </header>

      <main class="relative z-10 box-border flex w-full max-w-full flex-col flex-none overflow-hidden py-6 gap-6">
        
        <!-- MODE SWITCHER -->
        <div class="flex justify-center w-full shrink-0">
          <div class="flex items-center bg-current/5 border border-current/10 p-1 font-mono text-[10px] uppercase tracking-widest text-current/60">
            <button class="px-6 py-2 transition-colors" :class="articleViewMode === 'board' ? 'bg-current/10 font-bold text-current' : 'hover:bg-current/5'" @click="articleViewMode = 'board'">
              {{ locale === 'ru' ? 'ДОСКА' : 'BOARD' }}
            </button>
            <button class="px-6 py-2 transition-colors" :class="articleViewMode === 'text' ? 'bg-current/10 font-bold text-current' : 'hover:bg-current/5'" @click="articleViewMode = 'text'">
              {{ locale === 'ru' ? 'ТЕКСТ' : 'TEXT' }}
            </button>
          </div>
        </div>

        <section
          v-if="articleViewMode === 'board'"
          class="article-reader-board group relative box-border h-[68vh] min-h-[460px] w-full max-w-full flex-1 cursor-pointer select-none overflow-hidden border-y border-x-0 border-current/10 bg-[radial-gradient(circle,rgba(0,0,0,0.1)_1px,transparent_1.6px)] bg-[length:22px_22px] bg-center shadow-inner sm:min-h-[min(72vh,780px)] sm:bg-[length:28px_28px]"
          :aria-label="articleLabels.board"
          @click="openBoardFullscreen"
        >
          <div
            class="pointer-events-none absolute left-0 top-0 origin-top-left"
            :style="[boardWorldStyle, boardPreviewTransformStyle]"
          >
            <svg class="pointer-events-none absolute left-0 top-0 h-full w-full overflow-visible text-current/35">
              <path
                v-for="connection in boardConnections"
                :key="connection.id"
                :d="getBoardConnectionPath(connection)"
                fill="none"
                stroke="currentColor"
                stroke-width="1.2"
                vector-effect="non-scaling-stroke"
                class="opacity-70"
              />
            </svg>
            <article
              v-for="node in boardNodes"
              :key="node.id"
              data-board-node
              class="absolute box-border overflow-hidden border border-current/20 bg-white/85 shadow-[0_16px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm"
              :style="getBoardNodeStyle(node)"
            >
              <div v-if="node.type === 'text'" class="flex h-full flex-col gap-3 p-4">
                <h3 v-if="!node.isQuestion" class="font-serif text-xl italic leading-none text-current/80" v-html="node.title || boardUiLabels.untitled"></h3>
                <div class="min-h-0 overflow-hidden font-serif italic break-words" :class="node.isQuestion ? 'text-3xl leading-tight text-current/80' : 'text-sm leading-relaxed text-current/55'" v-html="node.text"></div>
              </div>

              <div v-else-if="node.type === 'image'" class="flex h-full flex-col">
                <img :src="node.src" :alt="node.alt" class="min-h-0 flex-1 object-cover" draggable="false" />
                <p v-if="node.caption" class="border-t border-current/10 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.28em] text-current/35">
                  {{ node.caption }}
                </p>
              </div>

              <div v-else-if="node.type === 'drawing'" class="flex h-full w-full flex-col relative bg-transparent overflow-hidden">
                <img v-if="node.params?.preview" :src="node.params.preview" alt="" class="absolute inset-0 h-full w-full object-fill pointer-events-none" draggable="false" />
                <svg v-else class="absolute inset-0 w-full h-full pointer-events-none text-current" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polyline v-for="stroke in node.params?.strokes || []" :key="stroke.id" :points="drawing.formatDrawingStroke(stroke)" fill="none" :stroke="stroke.color || 'currentColor'" :stroke-width="stroke.size || 2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" class="opacity-90" />
                </svg>
              </div>

              <div v-else-if="node.type === 'price'" class="flex h-full w-full flex-col items-center justify-center bg-white/70 px-3 font-mono text-current">
                <span class="mb-1 text-[8px] font-black uppercase tracking-[0.2em] text-current/40">
                  {{ node.priceKind === 'current' ? (locale === 'ru' ? 'ТЕКУЩАЯ ЦЕНА' : 'CURRENT PRICE') : (locale === 'ru' ? 'ПРЕДПОЛАГАЕМАЯ ЦЕНА' : 'PROJECTED PRICE') }}
                </span>
                <span
                  class="truncate text-center text-lg font-black leading-none"
                  :class="getPriceNodeValueClass(node)"
                >
                  <template v-if="getPriceNodeArrow(node)">{{ getPriceNodeArrow(node) }} </template>{{ node.value || priceNodePlaceholder(node) }}
                </span>
              </div>

              <div v-else-if="node.type === 'asset'" class="flex h-full w-full items-center justify-center bg-white/70 px-3 font-mono text-current">
                <div class="flex min-w-0 flex-col items-center justify-center gap-1 text-center">
                  <span class="max-w-full truncate text-base font-black uppercase tracking-widest text-current/75">
                    {{ getAssetNodeLabel(node) }}
                  </span>
                  <span v-if="getAssetNodeTypeLabel(node)" class="max-w-full truncate text-[7px] font-black uppercase tracking-[0.28em] text-current/35">
                    {{ getAssetNodeTypeLabel(node) }}
                  </span>
                </div>
              </div>

              <div v-else-if="node.type === 'strategy'" class="flex h-full w-full flex-col justify-center gap-2 bg-white/70 px-4 font-mono text-current">
                <span class="truncate text-sm font-black uppercase tracking-widest text-current/80">{{ getStrategyNodeLabel(node) }}</span>
                <div v-if="getStrategyNodeMetrics(node)" class="grid grid-cols-5 gap-1 text-center uppercase">
                  <span class="flex min-w-0 flex-col border border-current/10 px-1 py-1">
                    <small class="text-[7px] font-black tracking-[0.16em] text-current/40">{{ boardUiLabels.profitFactorShort }}</small>
                    <strong class="truncate text-[11px] font-black text-current/85">{{ formatProfitFactor(getStrategyNodeMetrics(node)!.profitFactor) }}</strong>
                  </span>
                  <span class="flex min-w-0 flex-col border border-current/10 px-1 py-1">
                    <small class="text-[7px] font-black tracking-[0.16em] text-current/40">{{ boardUiLabels.winRateShort }}</small>
                    <strong class="truncate text-[11px] font-black text-current/85">{{ formatCompactNumber(getStrategyNodeMetrics(node)!.winRate, 1) }}%</strong>
                  </span>
                  <span class="flex min-w-0 flex-col border border-current/10 px-1 py-1">
                    <small class="text-[7px] font-black tracking-[0.16em] text-current/40">{{ boardUiLabels.resultShort }}</small>
                    <strong class="truncate text-[11px] font-black" :class="getResultToneClass(getStrategyNodeMetrics(node)!.resultCurrency)">{{ formatSignedCurrency(getStrategyNodeMetrics(node)!.resultCurrency) }}</strong>
                  </span>
                  <span class="flex min-w-0 flex-col border border-current/10 px-1 py-1">
                    <small class="text-[7px] font-black tracking-[0.16em] text-current/40">{{ boardUiLabels.startShort }}</small>
                    <strong class="truncate text-[11px] font-black text-current/85">{{ formatCurrencyValue(getStrategyNodeMetrics(node)!.initialCapital) }}</strong>
                  </span>
                  <span class="flex min-w-0 flex-col border border-current/10 px-1 py-1">
                    <small class="text-[7px] font-black tracking-[0.16em] text-current/40">{{ boardUiLabels.endShort }}</small>
                    <strong class="truncate text-[11px] font-black" :class="getResultToneClass(getStrategyNodeMetrics(node)!.finalCapital - getStrategyNodeMetrics(node)!.initialCapital)">{{ formatCurrencyValue(getStrategyNodeMetrics(node)!.finalCapital) }}</strong>
                  </span>
                </div>
              </div>

              <div v-else-if="node.type === 'trade'" class="flex h-full w-full flex-col justify-center gap-2 bg-white/70 px-4 font-mono text-current">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex min-w-0 flex-col text-left">
                    <span class="truncate text-sm font-black uppercase tracking-widest text-current/80">{{ getTradeNodeAssetLabel(node) }}</span>
                    <span class="truncate text-[8px] font-black uppercase tracking-[0.2em]" :class="getTradeNodeVectorClass(node)">{{ getTradeNodeVector(node) }}</span>
                  </div>
                  <span class="max-w-[45%] truncate text-right text-[10px] font-black uppercase tracking-[0.14em]" :class="getTradeNodeResultClass(node)">
                    {{ getTradeNodeResult(node) || boardUiLabels.select }}
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-1 text-center uppercase">
                  <span class="flex min-w-0 flex-col border border-current/10 px-1 py-1">
                    <small class="text-[7px] font-black tracking-[0.14em] text-current/40">{{ boardUiLabels.entryShort }}</small>
                    <strong class="truncate text-[9px] font-black text-current/80">{{ getTradeNodeEntryDate(node) }}</strong>
                  </span>
                  <span class="flex min-w-0 flex-col border border-current/10 px-1 py-1">
                    <small class="text-[7px] font-black tracking-[0.14em] text-current/40">{{ boardUiLabels.exitShort }}</small>
                    <strong class="truncate text-[9px] font-black text-current/80">{{ getTradeNodeExitDate(node) }}</strong>
                  </span>
                </div>
              </div>
            </article>
          </div>

          <div class="pointer-events-none absolute inset-0 bg-black/[0.025]"></div>
          <div class="pointer-events-none absolute right-4 top-4 border border-current/10 bg-white/85 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.28em] text-current/35">
            {{ articleLabels.openBoard }}
          </div>
        </section>

        <!-- TEXT SECTION -->
        <section v-else class="flex-1 w-full overflow-y-auto scroll-minimal px-6 pb-12">
          <div class="max-w-[800px] mx-auto flex flex-col items-center gap-12 text-black">
            <template v-for="(node, index) in selectedArticleTextBlocks" :key="node.id || index">
              
              <div class="w-full flex flex-col items-center">
                <!-- LEGACY BLOCKS -->
                <div v-if="node.type === 'heading'" class="w-full flex flex-col gap-4 font-serif italic break-words">
                  <h2 class="font-bold text-current" :class="node.level === 2 ? 'text-5xl leading-none text-center' : 'text-3xl'">
                    {{ node.text }}
                  </h2>
                </div>
                <div v-else-if="node.type === 'paragraph'" class="w-full flex flex-col gap-4 font-serif italic break-words">
                  <div class="text-current/90 whitespace-pre-wrap text-base leading-relaxed" v-html="node.text"></div>
                </div>
                <div v-else-if="node.type === 'image'" class="w-full flex flex-col items-center">
                  <img :src="(node as any).src" class="max-w-full h-auto rounded-sm border border-current/10 shadow-sm object-contain max-h-[600px]" />
                  <p v-if="(node as any).caption" class="text-[10px] font-mono tracking-widest uppercase text-current/40 text-center mt-2">{{ (node as any).caption }}</p>
                </div>

                <div v-else-if="node.type === 'text'" class="w-full flex flex-col gap-4 font-serif italic break-words">
                  <h2 v-if="(node as any).title" class="font-bold text-current"
                      :class="(node as any).isQuestion ? 'text-5xl leading-none text-center' : 'text-3xl'">
                    {{ (node as any).title }}
                  </h2>
                  <div v-if="(node as any).text" class="text-current/90 whitespace-pre-wrap"
                       :class="(node as any).isQuestion ? 'text-3xl text-center' : 'text-base leading-relaxed'"
                       v-html="(node as any).text">
                  </div>
                </div>

                <!-- SIGNAL HEADER -->
                <div v-else-if="(node as any).type === 'signal-header'" class="w-full flex justify-center py-6">
                  <div class="flex flex-row items-center justify-between w-full max-w-[800px] border border-current/10 bg-white shadow-sm overflow-hidden text-black">
                    <!-- Current Price -->
                    <div class="flex flex-col items-center justify-center flex-1 py-8 px-4" :class="getSignalHeaderCurrentPrice(node) ? 'bg-blue-50/50' : ''">
                      <span class="text-[9px] uppercase tracking-[0.3em] font-black text-black/40 mb-2">{{ locale === 'ru' ? 'ТЕКУЩАЯ ЦЕНА' : 'CURRENT PRICE' }}</span>
                      <div class="flex items-center gap-2" v-if="getSignalHeaderCurrentPrice(node)">
                        <span v-if="getPriceNodeArrow(getSignalHeaderCurrentPrice(node))" class="text-xl font-black" :class="getPriceNodeValueClass(getSignalHeaderCurrentPrice(node))">{{ getPriceNodeArrow(getSignalHeaderCurrentPrice(node)) }}</span>
                        <span class="text-3xl font-mono font-black tracking-widest text-black/90" :class="getPriceNodeValueClass(getSignalHeaderCurrentPrice(node))">{{ getSignalHeaderCurrentPrice(node)?.value || '0.00' }}</span>
                      </div>
                      <span v-else class="text-3xl font-mono font-black tracking-widest text-black/20">---</span>
                    </div>
                    <!-- Asset -->
                    <div class="flex flex-col items-center justify-center flex-1 py-8 px-4 border-l border-r border-black/10 bg-white z-10 shadow-[0_0_20px_rgba(0,0,0,0.05)]">
                       <span class="text-[9px] uppercase tracking-[0.3em] font-black text-black/40 mb-2">{{ locale === 'ru' ? 'АКТИВ' : 'ASSET' }}</span>
                       <span class="max-w-full truncate text-4xl font-black uppercase tracking-widest text-black/90" v-if="getSignalHeaderAsset(node)">{{ getSignalHeaderAsset(node)?.asset || '---' }}</span>
                       <span v-else class="text-4xl font-mono font-black tracking-widest text-black/20">---</span>
                    </div>
                    <!-- Target Price -->
                    <div class="flex flex-col items-center justify-center flex-1 py-8 px-4" :class="getSignalHeaderTargetPrice(node) ? 'bg-green-50/50' : ''">
                      <span class="text-[9px] uppercase tracking-[0.3em] font-black text-black/40 mb-2">{{ locale === 'ru' ? 'ЦЕЛЬ' : 'TARGET' }}</span>
                      <div class="flex items-center gap-2" v-if="getSignalHeaderTargetPrice(node)">
                        <span v-if="getPriceNodeArrow(getSignalHeaderTargetPrice(node))" class="text-xl font-black" :class="getPriceNodeValueClass(getSignalHeaderTargetPrice(node))">{{ getPriceNodeArrow(getSignalHeaderTargetPrice(node)) }}</span>
                        <span class="text-3xl font-mono font-black tracking-widest text-black/90" :class="getPriceNodeValueClass(getSignalHeaderTargetPrice(node))">{{ getSignalHeaderTargetPrice(node)?.value || '0.00' }}</span>
                      </div>
                      <span v-else class="text-3xl font-mono font-black tracking-widest text-black/20">---</span>
                    </div>
                  </div>
                </div>

                <div v-else-if="node.type === 'asset'" class="w-full p-8 border border-current/10 bg-current/5 flex flex-col items-center">
                  <span class="text-[9px] uppercase tracking-[0.3em] font-black text-current/40 mb-2">{{ locale === 'ru' ? 'АКТИВ' : 'ASSET' }}</span>
                  <span class="text-4xl font-mono font-black uppercase tracking-widest text-current/90">{{ (node as any).asset || '---' }}</span>
                </div>

                <div v-else-if="node.type === 'price'" class="w-full p-8 border border-current/10 flex flex-col items-center text-black" :class="(node as any).priceKind === 'current' ? 'bg-blue-50/50' : 'bg-green-50/50'">
                  <span class="text-[9px] uppercase tracking-[0.3em] font-black text-black/40 mb-2">{{ (node as any).priceKind === 'current' ? (locale === 'ru' ? 'ТЕКУЩАЯ ЦЕНА' : 'CURRENT PRICE') : (locale === 'ru' ? 'ПРЕДПОЛАГАЕМАЯ ЦЕНА' : 'TARGET PRICE') }}</span>
                  <div class="flex items-center gap-2">
                    <span v-if="getPriceNodeArrow(node)" class="text-xl font-black" :class="getPriceNodeValueClass(node)">{{ getPriceNodeArrow(node) }}</span>
                    <span class="text-4xl font-mono font-black tracking-widest text-black/90" :class="getPriceNodeValueClass(node)">{{ (node as any).value || '0.00' }}</span>
                  </div>
                </div>

                <div v-else-if="node.type === 'strategy'" class="w-full flex justify-center py-6">
                  <div class="flex min-w-[300px] max-w-[450px] w-full flex-col items-center justify-center gap-4 text-center border border-current/10 bg-white p-6 shadow-sm text-black">
                    <span class="text-[9px] font-black uppercase tracking-[0.3em] text-black/40">{{ locale === 'ru' ? 'СТРАТЕГИЯ' : 'STRATEGY' }}</span>
                    <span class="max-w-full truncate text-2xl font-black uppercase tracking-widest text-black/80">{{ getStrategyNodeLabel(node) || '---' }}</span>
                    <span v-if="getStrategyNodeMetrics(node)" class="grid w-full grid-cols-5 gap-2 text-center uppercase pt-4 border-t border-black/5 mt-2">
                      <span class="flex min-w-0 flex-col px-1.5">
                        <small class="text-[8px] font-black tracking-[0.18em] text-black/40">{{ boardUiLabels.profitFactorShort }}</small>
                        <strong class="truncate text-[14px] font-black text-black/85">{{ formatProfitFactor(getStrategyNodeMetrics(node)!.profitFactor) }}</strong>
                      </span>
                      <span class="flex min-w-0 flex-col px-1.5 border-l border-black/5">
                        <small class="text-[8px] font-black tracking-[0.18em] text-black/40">{{ boardUiLabels.winRateShort }}</small>
                        <strong class="truncate text-[14px] font-black text-black/85">{{ formatCompactNumber(getStrategyNodeMetrics(node)!.winRate, 1) }}%</strong>
                      </span>
                      <span class="flex min-w-0 flex-col px-1.5 border-l border-black/5">
                        <small class="text-[8px] font-black tracking-[0.18em] text-black/40">{{ boardUiLabels.resultShort }}</small>
                        <strong class="truncate text-[14px] font-black" :class="getResultToneClass(getStrategyNodeMetrics(node)!.resultCurrency)">{{ formatSignedCurrency(getStrategyNodeMetrics(node)!.resultCurrency) }}</strong>
                      </span>
                      <span class="flex min-w-0 flex-col px-1.5 border-l border-black/5">
                        <small class="text-[8px] font-black tracking-[0.18em] text-black/40">{{ boardUiLabels.startShort }}</small>
                        <strong class="truncate text-[14px] font-black text-black/85">{{ formatCurrencyValue(getStrategyNodeMetrics(node)!.initialCapital) }}</strong>
                      </span>
                      <span class="flex min-w-0 flex-col px-1.5 border-l border-black/5">
                        <small class="text-[8px] font-black tracking-[0.18em] text-black/40">{{ boardUiLabels.endShort }}</small>
                        <strong class="truncate text-[14px] font-black" :class="getResultToneClass(getStrategyNodeMetrics(node)!.finalCapital - getStrategyNodeMetrics(node)!.initialCapital)">{{ formatCurrencyValue(getStrategyNodeMetrics(node)!.finalCapital) }}</strong>
                      </span>
                    </span>
                  </div>
                </div>

                <div v-else-if="node.type === 'trade'" class="w-full flex justify-center py-6">
                  <div class="flex min-w-[300px] max-w-[450px] w-full flex-col justify-center gap-4 text-left border border-current/10 bg-white p-6 shadow-sm text-black">
                    <span class="text-[9px] font-black uppercase tracking-[0.3em] text-black/40 text-center">{{ locale === 'ru' ? 'СДЕЛКА' : 'TRADE' }}</span>
                    <span class="flex w-full items-start justify-between gap-3 border-t border-black/5 pt-4">
                      <span class="flex min-w-0 flex-col">
                        <span class="max-w-full truncate text-2xl font-black uppercase tracking-widest text-black/80">{{ getTradeNodeAssetLabel(node) }}</span>
                        <span class="max-w-full truncate text-[10px] font-black uppercase tracking-[0.24em]" :class="getTradeNodeVectorClass(node)">{{ getTradeNodeVector(node) }}</span>
                      </span>
                      <span class="max-w-[45%] truncate text-right text-xl font-black uppercase tracking-[0.16em]" :class="getTradeNodeResultClass(node)">{{ getTradeNodeResult(node) || '---' }}</span>
                    </span>
                    <span class="grid w-full grid-cols-2 gap-2 text-center uppercase pt-2">
                      <span class="flex min-w-0 flex-col border-t border-black/5 px-1.5 py-2">
                        <small class="text-[8px] font-black tracking-[0.16em] text-black/40">{{ boardUiLabels.entryShort }}</small>
                        <strong class="truncate text-[14px] font-black text-black/80">{{ getTradeNodeEntryDate(node) }}</strong>
                      </span>
                      <span class="flex min-w-0 flex-col border-t border-l border-black/5 px-1.5 py-2">
                        <small class="text-[8px] font-black tracking-[0.16em] text-black/40">{{ boardUiLabels.exitShort }}</small>
                        <strong class="truncate text-[14px] font-black text-black/80">{{ getTradeNodeExitDate(node) }}</strong>
                      </span>
                    </span>
                  </div>
                </div>

                <div v-else-if="node.type === 'drawing'" class="w-full flex justify-center bg-white p-4 border border-current/10 shadow-sm relative" :style="{ minHeight: '100px' }">
                  <img v-if="(node as any).params?.preview" :src="(node as any).params.preview" alt="Drawing" class="w-full h-auto max-h-[400px] object-contain pointer-events-none" />
                  <svg v-else class="w-full h-auto max-h-[400px] pointer-events-none text-black" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                    <polyline v-for="(stroke, i) in (node as any).params?.strokes || []" :key="i" :points="drawing.formatDrawingStroke(stroke)" fill="none" :stroke="stroke.color || 'currentColor'" :stroke-width="stroke.size || 2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" class="opacity-90" />
                  </svg>
                </div>

              </div>
            </template>
          </div>
        </section>
      </main>

      <div class="flex items-center gap-3 px-6 pb-6">
        <button 
          :disabled="isArticleLikePending"
          class="flex items-center gap-2 px-5 py-2.5 border border-current/10 bg-white/50 text-[10px] font-mono tracking-widest uppercase hover:bg-black/5 hover:border-current/30 transition-all active:scale-95 group disabled:opacity-60"
          @click="toggleLike"
        >
          <svg class="w-4 h-4 transition-transform group-active:scale-75" :class="isLiked ? 'fill-red-500 text-red-500' : 'fill-transparent text-current/50'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"></path></svg>
          <span>{{ isLiked ? (locale === 'ru' ? 'Понравилось' : 'Liked') : (locale === 'ru' ? 'Нравится' : 'Like') }}</span>
        </button>
        <button 
          class="flex items-center gap-2 px-5 py-2.5 border border-current/10 bg-white/50 text-[10px] font-mono tracking-widest uppercase hover:bg-black/5 hover:border-current/30 transition-all active:scale-95 group"
          @click="toggleBookmark"
        >
          <svg class="w-4 h-4 transition-transform group-active:scale-75" :class="isBookmarked ? 'fill-amber-500 text-amber-500' : 'fill-transparent text-current/50'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"></path></svg>
          <span>{{ isBookmarked ? (locale === 'ru' ? 'В закладках' : 'Saved') : (locale === 'ru' ? 'В закладки' : 'Save') }}</span>
        </button>
      </div>

      <footer class="article-comments-footer relative z-10">
        <div class="article-comments-heading">
          <div>
            <span>{{ articleLabels.comments }}</span>
          </div>
          <strong>{{ articleLabels.published }}: {{ articleComments.length }}</strong>
        </div>

        <form class="article-comment-composer" @submit.prevent="() => submitComment()">
          <div class="article-comment-composer-title">
            <div>
              <span>{{ articleLabels.newComment }}</span>
              <h3>{{ articleLabels.leaveComment }}</h3>
            </div>
            <span v-if="!isAuthenticated" class="article-comment-composer-status">{{ articleLabels.signInRequired }}</span>
          </div>
          <div class="article-comment-composer-meta">
            <span>{{ articleLabels.commentingAs }}</span>
            <strong>{{ currentUserName }}</strong>
          </div>
          <textarea
            ref="commentInputRef"
            id="article-comment-input"
            v-model="commentDraft"
            class="article-comment-input"
            rows="1"
            maxlength="1000"
            :disabled="!isAuthenticated"
            :placeholder="isAuthenticated ? articleLabels.writeComment : articleLabels.signInToComment"
            @input="resizeCommentInput"
          ></textarea>
          <div class="article-comment-composer-actions">
            <span>{{ commentDraft.length }}/1000</span>
            <button
              class="article-comment-submit"
              type="submit"
              :disabled="!isAuthenticated || !commentDraft.trim()"
            >
              {{ articleLabels.postComment }}
            </button>
          </div>
        </form>

        <div v-if="nestedComments.length" class="article-comments-list !gap-0">
          <!-- Level 1 -->
          <div v-for="(comment, index) in (expandedComments.has('root') ? nestedComments : nestedComments.slice(0, 5))" :key="comment.id" class="flex flex-col">
            <article class="article-comment !pb-2 !border-none">
              <div class="article-comment-head">
                <div>
                  <h3 :class="{'opacity-50': comment.status === 'hidden'}">{{ comment.author || 'Anonymous' }}<ExUserStatusBadge v-if="getSelectedAuthorStatus(comment.authorId)" :status="getSelectedAuthorStatus(comment.authorId)!" class="ml-2 align-middle" /></h3>
                </div>
                <div class="article-comment-meta">
                  <span>{{ formatCommentDate(comment.createdAt) }}</span>
                  <span v-if="comment.status !== 'hidden'">{{ comment.likes || 0 }} {{ articleLabels.likes }}</span>
                </div>
              </div>
              <p :class="{'italic opacity-50': comment.status === 'hidden'}">{{ comment.content?.text }}</p>
              
              <div v-if="comment.status !== 'hidden'" class="mt-2 flex justify-end items-center">
                <button type="button" :disabled="!isAuthenticated || isReplyLikePending(comment.id)" class="article-comment-like" :class="{ 'article-comment-like--active': isReplyLiked(comment.id) }" :aria-pressed="isReplyLiked(comment.id)" @click="toggleCommentLike(comment)">
                  <svg class="article-comment-like__heart" :class="isReplyLiked(comment.id) ? 'fill-rose-500 text-rose-500' : 'fill-transparent'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                  {{ isReplyLiked(comment.id) ? articleLabels.liked : articleLabels.like }}
                </button>
                <button @click="toggleReplyForm(comment.id)" class="text-[9px] font-mono tracking-widest uppercase opacity-40 hover:opacity-100 transition-opacity">
                  {{ replyingToId === comment.id ? (locale === 'ru' ? 'Отмена' : 'Cancel') : (locale === 'ru' ? 'Ответить' : 'Reply') }}
                </button>
                <button v-if="comment.authorId === authStore.user?.uid" @click="deleteComment(comment)" class="text-[9px] font-mono tracking-widest uppercase opacity-40 hover:opacity-100 hover:text-red-500 transition-opacity ml-4">
                  {{ locale === 'ru' ? 'Удалить' : 'Delete' }}
                </button>
              </div>

              <!-- Level 1 Reply Form -->
              <form v-if="replyingToId === comment.id" class="mt-3 ml-4 border-l-2 border-current/20 pl-4 flex flex-col gap-2" @submit.prevent="submitComment(comment.id)">
                <textarea v-model="commentDraft" class="bg-black/5 p-3 text-xs w-full outline-none resize-none" rows="2" :placeholder="locale === 'ru' ? 'Написать ответ...' : 'Write a reply...'"></textarea>
                <div class="flex justify-end gap-3 items-center">
                  <span class="text-[9px] font-mono opacity-40">{{ commentDraft.length }}/1000</span>
                  <button type="submit" :disabled="!commentDraft.trim()" class="text-[9px] font-mono uppercase bg-black text-white px-3 py-1.5 disabled:opacity-50">
                    {{ locale === 'ru' ? 'Отправить' : 'Send' }}
                  </button>
                </div>
              </form>
            </article>

            <!-- Level 2 -->
            <div v-if="comment.children.length > 0" class="pl-4 md:pl-8 border-l border-current/10 mt-4 flex flex-col gap-6">
              <div v-for="reply in (expandedComments.has(comment.id) ? comment.children : comment.children.slice(0, 5))" :key="reply.id" class="flex flex-col">
                <article class="article-comment !pb-2 !border-none">
                  <div class="article-comment-head">
                    <div>
                      <h3 :class="{'opacity-50': reply.status === 'hidden'}">{{ reply.author || 'Anonymous' }}<ExUserStatusBadge v-if="getSelectedAuthorStatus(reply.authorId)" :status="getSelectedAuthorStatus(reply.authorId)!" class="ml-2 align-middle" /></h3>
                    </div>
                    <div class="article-comment-meta">
                      <span>{{ formatCommentDate(reply.createdAt) }}</span>
                      <span v-if="reply.status !== 'hidden'">{{ reply.likes || 0 }} {{ articleLabels.likes }}</span>
                    </div>
                  </div>
                  <p :class="{'italic opacity-50': reply.status === 'hidden'}">{{ reply.content?.text }}</p>
                  
                  <div v-if="reply.status !== 'hidden'" class="mt-2 flex justify-end items-center">
                    <button type="button" :disabled="!isAuthenticated || isReplyLikePending(reply.id)" class="article-comment-like" :class="{ 'article-comment-like--active': isReplyLiked(reply.id) }" :aria-pressed="isReplyLiked(reply.id)" @click="toggleCommentLike(reply)">
                      <svg class="article-comment-like__heart" :class="isReplyLiked(reply.id) ? 'fill-rose-500 text-rose-500' : 'fill-transparent'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                      {{ isReplyLiked(reply.id) ? articleLabels.liked : articleLabels.like }}
                    </button>
                    <button @click="toggleReplyForm(reply.id)" class="text-[9px] font-mono tracking-widest uppercase opacity-40 hover:opacity-100 transition-opacity">
                      {{ replyingToId === reply.id ? (locale === 'ru' ? 'Отмена' : 'Cancel') : (locale === 'ru' ? 'Ответить' : 'Reply') }}
                    </button>
                    <button v-if="reply.authorId === authStore.user?.uid" @click="deleteComment(reply)" class="text-[9px] font-mono tracking-widest uppercase opacity-40 hover:opacity-100 hover:text-red-500 transition-opacity ml-4">
                      {{ locale === 'ru' ? 'Удалить' : 'Delete' }}
                    </button>
                  </div>

                  <!-- Level 2 Reply Form -->
                  <form v-if="replyingToId === reply.id" class="mt-3 ml-4 border-l-2 border-current/20 pl-4 flex flex-col gap-2" @submit.prevent="submitComment(reply.id)">
                    <textarea v-model="commentDraft" class="bg-black/5 p-3 text-xs w-full outline-none resize-none" rows="2" :placeholder="locale === 'ru' ? 'Написать ответ...' : 'Write a reply...'"></textarea>
                    <div class="flex justify-end gap-3 items-center">
                      <span class="text-[9px] font-mono opacity-40">{{ commentDraft.length }}/1000</span>
                      <button type="submit" :disabled="!commentDraft.trim()" class="text-[9px] font-mono uppercase bg-black text-white px-3 py-1.5 disabled:opacity-50">
                        {{ locale === 'ru' ? 'Отправить' : 'Send' }}
                      </button>
                    </div>
                  </form>
                </article>

                <!-- Level 3 -->
                <div v-if="reply.children.length > 0" class="pl-4 md:pl-8 border-l border-current/10 mt-4 flex flex-col gap-6">
                  <div v-for="subreply in (expandedComments.has(reply.id) ? reply.children : reply.children.slice(0, 5))" :key="subreply.id">
                    <article class="article-comment !pb-2 !border-none">
                      <div class="article-comment-head">
                        <div>
                          <h3 :class="{'opacity-50': subreply.status === 'hidden'}">{{ subreply.author || 'Anonymous' }}<ExUserStatusBadge v-if="getSelectedAuthorStatus(subreply.authorId)" :status="getSelectedAuthorStatus(subreply.authorId)!" class="ml-2 align-middle" /></h3>
                        </div>
                        <div class="article-comment-meta">
                          <span>{{ formatCommentDate(subreply.createdAt) }}</span>
                          <span v-if="subreply.status !== 'hidden'">{{ subreply.likes || 0 }} {{ articleLabels.likes }}</span>
                        </div>
                      </div>
                      <p :class="{'italic opacity-50': subreply.status === 'hidden'}">{{ subreply.content?.text }}</p>
                      
                      <div v-if="subreply.status !== 'hidden'" class="mt-2 flex justify-end items-center">
                        <button type="button" :disabled="!isAuthenticated || isReplyLikePending(subreply.id)" class="article-comment-like" :class="{ 'article-comment-like--active': isReplyLiked(subreply.id) }" :aria-pressed="isReplyLiked(subreply.id)" @click="toggleCommentLike(subreply)">
                          <svg class="article-comment-like__heart" :class="isReplyLiked(subreply.id) ? 'fill-rose-500 text-rose-500' : 'fill-transparent'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                          {{ isReplyLiked(subreply.id) ? articleLabels.liked : articleLabels.like }}
                        </button>
                        <button @click="toggleReplyForm(subreply.id)" class="text-[9px] font-mono tracking-widest uppercase opacity-40 hover:opacity-100 transition-opacity">
                          {{ replyingToId === subreply.id ? (locale === 'ru' ? 'Отмена' : 'Cancel') : (locale === 'ru' ? 'Ответить' : 'Reply') }}
                        </button>
                        <button v-if="subreply.authorId === authStore.user?.uid" @click="deleteComment(subreply)" class="text-[9px] font-mono tracking-widest uppercase opacity-40 hover:opacity-100 hover:text-red-500 transition-opacity ml-4">
                          {{ locale === 'ru' ? 'Удалить' : 'Delete' }}
                        </button>
                      </div>

                      <!-- Level 3 Reply Form -->
                      <form v-if="replyingToId === subreply.id" class="mt-3 ml-4 border-l-2 border-current/20 pl-4 flex flex-col gap-2" @submit.prevent="submitComment(subreply.id)">
                        <textarea v-model="commentDraft" class="bg-black/5 p-3 text-xs w-full outline-none resize-none" rows="2" :placeholder="locale === 'ru' ? 'Написать ответ...' : 'Write a reply...'"></textarea>
                        <div class="flex justify-end gap-3 items-center">
                          <span class="text-[9px] font-mono opacity-40">{{ commentDraft.length }}/1000</span>
                          <button type="submit" :disabled="!commentDraft.trim()" class="text-[9px] font-mono uppercase bg-black text-white px-3 py-1.5 disabled:opacity-50">
                            {{ locale === 'ru' ? 'Отправить' : 'Send' }}
                          </button>
                        </div>
                      </form>
                    </article>
                  </div>
                  <button v-if="reply.children.length > 5" @click="toggleCommentExpand(reply.id)" class="text-[9px] font-mono uppercase tracking-widest opacity-50 hover:opacity-100 text-left py-2">
                    {{ expandedComments.has(reply.id) ? (locale === 'ru' ? 'Скрыть' : 'Hide') : (locale === 'ru' ? `Показать еще ${reply.children.length - 5}` : `Show ${reply.children.length - 5} more`) }}
                  </button>
                </div>
              </div>
              <button v-if="comment.children.length > 5" @click="toggleCommentExpand(comment.id)" class="text-[9px] font-mono uppercase tracking-widest opacity-50 hover:opacity-100 text-left py-2">
                {{ expandedComments.has(comment.id) ? (locale === 'ru' ? 'Скрыть' : 'Hide') : (locale === 'ru' ? `Показать еще ${comment.children.length - 5}` : `Show ${comment.children.length - 5} more`) }}
              </button>
            </div>
            
            <hr v-if="index !== nestedComments.length - 1" class="w-full border-current/10 my-8" />
          </div>
          
          <button v-if="nestedComments.length > 5" @click="toggleCommentExpand('root')" class="text-[10px] font-mono uppercase tracking-widest bg-current/5 py-4 hover:bg-current/10 transition-colors w-full border border-current/10 mt-8">
            {{ expandedComments.has('root') ? (locale === 'ru' ? 'Скрыть комментарии' : 'Hide comments') : (locale === 'ru' ? `Показать еще ${nestedComments.length - 5} комментариев` : `Show ${nestedComments.length - 5} more comments`) }}
          </button>
        </div>

        <p v-else class="article-comments-empty">{{ articleLabels.noComments }}</p>
      </footer>

    </article>

    <!-- ARTICLE CREATION VIEW -->
    <div v-else-if="isCreatingArticle" class="absolute inset-0 z-50 bg-theme-bg overflow-hidden flex flex-col w-full" key="creator">
      <Transition name="fade-slide" mode="out-in">
        
        <!-- METADATA STEP -->
        <div v-if="creationStep === 'metadata'" class="flex flex-col h-full px-8 md:px-16 xl:px-32 py-10 relative overflow-hidden w-full max-w-7xl mx-auto" key="metadata">
          <!-- DRAFT METADATA HEADER -->
          <div class="relative z-20 flex flex-col md:flex-row justify-between md:items-end border-b-2 border-current/20 pb-4 mb-6 mt-6 space-y-4 md:space-y-0 shrink-0">
            <div class="flex flex-col space-y-2">
              <span class="text-[10px] font-mono tracking-[0.4em] uppercase opacity-70 font-bold">
                {{ locale === 'ru' ? 'Редактор' : 'Editor' }} // {{ formatJournalDate() }}
              </span>
              <span class="font-serif italic text-2xl text-current/80">{{ currentUserName }}</span>
            </div>
            
            <!-- INLINE CATEGORY SELECTOR -->
            <div class="flex flex-col md:items-end space-y-4">
              <span class="text-xs md:text-sm font-mono tracking-[0.4em] uppercase opacity-70 font-bold">
                {{ locale === 'ru' ? 'Выберите категорию' : 'Choose Category' }}
              </span>
              <div class="flex flex-wrap gap-4 md:space-x-6 md:gap-0">
                <button
                  v-for="type in articleTypes"
                  :key="type.value"
                  type="button"
                  :data-article-type="type.value"
                  class="text-[11px] font-mono tracking-widest uppercase transition-all duration-300 border-b"
                  :class="newArticleForm.type === type.value ? 'opacity-100 border-current pb-1 font-bold' : 'opacity-50 border-transparent hover:opacity-100 pb-1'"
                  @pointerdown.stop.prevent="selectArticleType(type.value)"
                  @click.stop.prevent="selectArticleType(type.value)"
                >
                  {{ type.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- MAIN EDITORIAL CANVAS -->
          <div class="relative z-10 flex-grow flex flex-col justify-center w-full max-w-5xl mx-auto space-y-6 min-h-0 pt-2 pb-6">
            
            <!-- Huge Title Input -->
            <div class="flex flex-col items-center group/title relative w-full shrink-0 pt-4">
              <span class="text-xs md:text-sm font-sans tracking-[0.2em] font-light uppercase transition-opacity duration-300 mb-2" :class="newArticleForm.title ? 'opacity-30' : 'opacity-60 group-focus-within/title:opacity-100'">
                {{ locale === 'ru' ? 'Введите заголовок' : 'Enter Title' }}
              </span>
              <input
                v-model="newArticleForm.title"
                type="text"
                maxlength="60"
                class="w-full bg-transparent text-4xl md:text-6xl lg:text-7xl font-serif italic tracking-tighter text-center focus:outline-none transition-colors placeholder:text-current/20"
                :placeholder="locale === 'ru' ? 'Заголовок...' : 'Title...'"
              />
              <div class="absolute -bottom-6 w-full flex justify-end px-4">
                <span class="text-[9px] font-mono transition-opacity duration-300" :class="newArticleForm.title.length > 0 ? 'opacity-40' : 'opacity-0 group-focus-within/title:opacity-40'">
                  {{ newArticleForm.title.length }} / 60
                </span>
              </div>
            </div>
            
            <div class="w-16 h-px bg-current/30 mx-auto my-2 shrink-0"></div>

            <!-- Description Textarea -->
            <div class="flex flex-col items-center group/desc relative w-full flex-grow min-h-[8.5rem]">
              <span class="text-xs md:text-sm font-sans tracking-[0.2em] font-light uppercase transition-opacity duration-300 mb-4 shrink-0" :class="newArticleForm.description ? 'opacity-30' : 'opacity-60 group-focus-within/desc:opacity-100'">
                {{ locale === 'ru' ? 'Введите описание' : 'Enter Description' }}
              </span>
              <textarea
                v-model="newArticleForm.description"
                @input="newArticleForm.description = newArticleForm.description.replace(/[\r\n]+/g, ' ')"
                maxlength="200"
                class="w-full h-full flex-grow min-h-[6.5rem] bg-transparent text-lg md:text-xl lg:text-2xl font-serif text-center focus:outline-none transition-colors resize-none placeholder:text-current/20 leading-normal text-current/90"
                :placeholder="locale === 'ru' ? 'Краткое описание или тезис вашей статьи...' : 'Brief description or thesis of your article...'"
              ></textarea>
              <div class="absolute bottom-2 w-full flex justify-end px-4 shrink-0 pointer-events-none">
                <span class="text-[9px] font-mono transition-opacity duration-300" :class="newArticleForm.description.length > 0 ? 'opacity-40' : 'opacity-0 group-focus-within/desc:opacity-40'">
                  {{ newArticleForm.description.length }} / 200
                </span>
              </div>
            </div>
          </div>

          <!-- LAUNCH FOOTER -->
          <div class="relative z-20 border-t-2 border-current/20 pt-4 mt-auto flex justify-between items-center shrink-0">
            <!-- Cancel / Delete Draft Button (Bottom Left) -->
            <button type="button" class="text-[11px] font-mono tracking-widest uppercase opacity-60 hover:opacity-100 transition-opacity flex items-center gap-2 group/cancel"
                    @click="hasDraft ? (clearDraft(), isCreatingArticle = false) : isCreatingArticle = false">
              <svg class="w-4 h-4 transition-transform group-hover/cancel:-translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path v-if="!hasDraft" d="M19 12H5M5 12l7-7M5 12l7 7"></path>
                <path v-else stroke-linecap="square" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              <span>{{ hasDraft ? (locale === 'ru' ? 'УДАЛИТЬ ЧЕРНОВИК' : 'DELETE DRAFT') : (locale === 'ru' ? 'ОТМЕНА' : 'CANCEL') }}</span>
            </button>

            <button
              class="group relative flex h-12 w-64 items-center justify-center gap-3 overflow-hidden border-2 px-5 transition-all duration-500"
              :class="isNewArticleFormValid && !isSubmittingArticle ? 'border-black hover:bg-black cursor-pointer' : 'border-current/20 cursor-not-allowed'"
              :disabled="!isNewArticleFormValid || isSubmittingArticle"
              @click="submitNewArticle"
            >
              <span class="text-[11px] font-mono tracking-[0.4em] uppercase relative z-10 font-bold transition-all duration-500" 
                    :class="[
                      isSubmittingArticle ? 'opacity-0' : '',
                      isNewArticleFormValid ? 'text-black opacity-100 group-hover:text-white' : 'text-current opacity-30'
                    ]">
                {{ locale === 'ru' ? 'ПРОДОЛЖИТЬ' : 'CONTINUE' }}
              </span>
              <span class="relative z-10 shrink-0 text-xl font-light leading-none transition-all duration-500"
                    :class="[
                      isSubmittingArticle ? 'opacity-0' : 'opacity-100',
                      isNewArticleFormValid ? 'text-black group-hover:text-white group-hover:translate-x-1' : 'text-current opacity-30'
                    ]">
                →
              </span>
              <svg class="w-5 h-5 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 animate-spin text-white transition-opacity duration-300" 
                   :class="isSubmittingArticle ? 'opacity-100' : 'opacity-0'"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
              </svg>
            </button>
          </div>
        </div>

        <!-- BOARD STEP -->
        <div v-else-if="creationStep === 'board'"
             ref="boardStageRef"
             class="absolute inset-0 z-[100] overflow-hidden bg-white bg-[radial-gradient(circle,rgba(0,0,0,0.1)_1px,transparent_1.6px)] bg-[length:28px_28px] text-[#2c2c2a]"
             :class="isSpacePressed ? 'cursor-grab active:cursor-grabbing' : (activeBoardTool === 'pencil' ? 'cursor-none' : (activeBoardTool ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'))"
             @pointermove="handleBoardHover"
             @pointerdown="startBoardPan"
             key="board"
        >
          <!-- Darkening overlay -->
          <div class="absolute inset-0 bg-black/10 pointer-events-none"></div>

          <!-- Freehand Board Drawing Layer -->
          <canvas
            ref="boardDrawingCanvasRef"
            class="absolute inset-0 z-20 h-full w-full pointer-events-none"
          ></canvas>

          <!-- Board World (Pan Only) -->
          <div class="absolute left-0 top-0 origin-top-left z-10" :style="[boardWorldStyle, boardTransformStyle]" ref="boardWorldRef"
               @pointerleave="boardDrawing.isBoardDrawingCursorVisible.value = false">
            <svg class="pointer-events-none absolute left-0 top-0 h-full w-full overflow-visible text-black/40">
              <path
                v-for="connection in boardConnections"
                :key="connection.id"
                :d="getBoardConnectionPath(connection)"
                fill="none"
                stroke="currentColor"
                stroke-width="1.2"
                vector-effect="non-scaling-stroke"
                class="opacity-75"
              />
              <path
                v-if="activeBoardWire"
                :d="getActiveBoardWirePath()"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-dasharray="4 8"
                vector-effect="non-scaling-stroke"
                class="opacity-70"
              />
            </svg>
            <article
              v-for="node in boardNodes"
              :key="node.id"
              data-board-node
              :data-node-id="node.id"
              class="absolute box-border overflow-visible bg-white/90 shadow-[0_16px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm group/node transition-all border"
              :class="[
                selectedBoardNodeId === node.id ? 'border-black/60 ring-2 ring-black/10' : 'border-black/20',
                activeBoardTool === 'pencil' ? 'pointer-events-none select-none' : ''
              ]"
              :style="getBoardNodeStyle(node)"
              @contextmenu.prevent.stop="handleNodeContextMenu($event, node.id)"
            >
              <!-- Drag Handle -->
              <div 
                data-board-node-handle 
                :data-node-id="node.id"
                class="absolute top-0 left-0 w-full h-4 bg-black/5 hover:bg-black/10 cursor-move opacity-0 group-hover/node:opacity-100 transition-opacity z-10"
              ></div>

              <div v-if="node.type === 'text'" class="flex h-full w-full flex-col relative bg-transparent p-4 pt-6 gap-2">
                 <template v-if="!node.isQuestion">
                   <div :ref="(el) => setTitleEditorRef(el, node.id)"
                        :data-title-node-id="node.id"
                        contenteditable="true"
                        @mousedown.stop
                        @click.stop
                        @focus="selectedBoardNodeId = node.id; activeEditorField = 'title'"
                        @input="updateNodeTitle($event, node)"
                        @keydown.enter.prevent
                        class="relative z-10 font-serif text-xl italic leading-none text-black/80 break-words outline-none bg-transparent cursor-text"
                        :data-placeholder="boardUiLabels.untitled">
                   </div>
                   <span
                     v-if="isTextNodeTitleEmpty(node)"
                     class="pointer-events-none absolute left-4 right-4 top-6 z-0 font-serif text-xl italic leading-none text-black/40"
                   >
                     {{ boardUiLabels.untitled }}
                   </span>
                 </template>
                 <div :ref="(el) => setTextEditorRef(el, node.id)"
                      :data-text-node-id="node.id"
                      contenteditable="true"
                      @mousedown.stop
                      @click.stop
                      @focus="selectedBoardNodeId = node.id; activeEditorField = 'text'"
                      @input="updateNodeText($event, node)"
                      class="relative z-10 w-full flex-1 font-serif italic bg-transparent outline-none overflow-y-auto cursor-text break-words whitespace-pre-wrap min-h-0 matrix-text-rich"
                      :class="node.isQuestion ? 'text-5xl leading-none text-black/80' : 'text-sm leading-relaxed text-black/55'"
                      :data-placeholder="node.isQuestion ? boardQuestionPlaceholder : boardTextPlaceholder">
                 </div>
                 <span
                   v-if="isTextNodeBodyEmpty(node)"
                   class="pointer-events-none absolute left-4 right-4 z-0 font-serif italic"
                   :class="node.isQuestion ? 'top-6 text-5xl leading-none text-black/40' : 'top-[58px] text-sm leading-relaxed text-black/25'"
                 >
                   {{ node.isQuestion ? boardQuestionPlaceholder : boardTextPlaceholder }}
                 </span>
              </div>
              <div v-else-if="node.type === 'image'" class="flex h-full flex-col pt-4">
                <img v-if="node.src" :src="node.src" :alt="node.alt" class="min-h-0 flex-1 object-contain cursor-pointer hover:opacity-90 transition-opacity" draggable="false" @click.stop="triggerImageUpload(node.id)" />
                <div v-else class="flex-1 flex flex-col items-center justify-center cursor-pointer border border-dashed border-black/20 m-4 hover:border-black/40 hover:bg-black/5 transition-all" @click.stop="triggerImageUpload(node.id)">
                   <svg class="w-8 h-8 opacity-40 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                   <span class="text-[10px] font-mono tracking-[0.2em] uppercase opacity-40 text-center px-4">{{ boardUiLabels.uploadImage }}</span>
                </div>
                <p v-if="node.caption" class="border-t border-black/10 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.28em] text-black/35">
                  {{ node.caption }}
                </p>
              </div>
              <div v-else-if="node.type === 'drawing'" class="flex h-full w-full flex-col relative bg-transparent overflow-hidden" @dblclick.stop="drawing.openDrawingFullscreen(node)">
                <img v-if="node.params?.preview"
                     :src="node.params.preview"
                     alt=""
                     class="absolute inset-0 h-full w-full object-fill pointer-events-none"
                     draggable="false" />
                <svg v-else
                     class="absolute inset-0 w-full h-full pointer-events-none text-black"
                     viewBox="0 0 100 100"
                     preserveAspectRatio="none">
                  <polyline v-for="stroke in node.params?.strokes || []"
                            :key="stroke.id"
                            :points="drawing.formatDrawingStroke(stroke)"
                            fill="none"
                            :stroke="stroke.color || 'currentColor'"
                            :stroke-width="stroke.size || 2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            vector-effect="non-scaling-stroke"
                            class="opacity-90" />
                </svg>
                <div v-if="!node.params?.strokes?.length" class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 text-[10px] font-mono tracking-widest uppercase text-center px-4">
                   {{ boardUiLabels.dblClickToDraw }}
                </div>
              </div>

              <div v-else-if="node.type === 'price'" class="flex h-full w-full flex-col items-center justify-center bg-white/80 px-3 font-mono">
                <span class="mb-1 text-[8px] font-black uppercase tracking-[0.2em] text-black/40 pointer-events-none select-none">
                  {{ node.priceKind === 'current' ? (locale === 'ru' ? 'ТЕКУЩАЯ ЦЕНА' : 'CURRENT PRICE') : (locale === 'ru' ? 'ПРЕДПОЛАГАЕМАЯ ЦЕНА' : 'PROJECTED PRICE') }}
                </span>
                <div class="flex min-w-0 items-center justify-center gap-2">
                  <span
                    v-if="getPriceNodeArrow(node)"
                    class="text-xl font-black leading-none"
                    :class="getPriceNodeValueClass(node)"
                  >
                    {{ getPriceNodeArrow(node) }}
                  </span>
                  <input
                    :value="node.value"
                    inputmode="decimal"
                    type="text"
                    class="min-w-0 w-full bg-transparent text-center text-2xl font-black leading-none outline-none"
                    :class="getPriceNodeValueClass(node)"
                    :placeholder="priceNodePlaceholder(node)"
                    @pointerdown.stop
                    @click.stop
                    @input="updatePriceNodeValue($event, node)"
                  />
                </div>
              </div>

              <div v-else-if="node.type === 'asset'" class="flex h-full w-full items-center justify-center bg-white/80 px-3 font-mono">
                <button
                  class="flex min-w-0 flex-col items-center justify-center gap-1 text-center outline-none transition-colors"
                  :class="node.asset ? 'text-black/80 hover:text-black' : 'text-black/35 hover:text-black/70'"
                  @pointerdown.stop
                  @click.stop="openAssetPicker(node)"
                >
                  <span class="max-w-full truncate text-xl font-black uppercase tracking-widest">
                    {{ getAssetNodeLabel(node) }}
                  </span>
                  <span v-if="getAssetNodeTypeLabel(node)" class="max-w-full truncate text-[8px] font-black uppercase tracking-[0.3em] text-black/35">
                    {{ getAssetNodeTypeLabel(node) }}
                  </span>
                </button>
              </div>

              <div v-else-if="node.type === 'strategy'" class="flex h-full w-full items-center justify-center bg-white/80 px-3 font-mono">
                <button
                  class="flex min-w-0 w-full flex-col items-center justify-center gap-3 text-center outline-none transition-colors"
                  :class="node.strategyId ? 'text-black/80 hover:text-black' : 'text-black/35 hover:text-black/70'"
                  @pointerdown.stop
                  @click.stop="openStrategyPicker(node)"
                >
                  <span class="max-w-full truncate text-xl font-black uppercase tracking-widest">
                    {{ getStrategyNodeLabel(node) }}
                  </span>
                  <span v-if="getStrategyNodeMetrics(node)" class="grid w-full grid-cols-5 gap-1.5 text-center uppercase">
                    <span class="flex min-w-0 flex-col border border-black/10 px-1.5 py-1">
                      <small class="text-[8px] font-black tracking-[0.18em] text-black/40">{{ boardUiLabels.profitFactorShort }}</small>
                      <strong class="truncate text-[14px] font-black text-black/85">{{ formatProfitFactor(getStrategyNodeMetrics(node)!.profitFactor) }}</strong>
                    </span>
                    <span class="flex min-w-0 flex-col border border-black/10 px-1.5 py-1">
                      <small class="text-[8px] font-black tracking-[0.18em] text-black/40">{{ boardUiLabels.winRateShort }}</small>
                      <strong class="truncate text-[14px] font-black text-black/85">{{ formatCompactNumber(getStrategyNodeMetrics(node)!.winRate, 1) }}%</strong>
                    </span>
                    <span class="flex min-w-0 flex-col border border-black/10 px-1.5 py-1">
                      <small class="text-[8px] font-black tracking-[0.18em] text-black/40">{{ boardUiLabels.resultShort }}</small>
                      <strong class="truncate text-[14px] font-black" :class="getResultToneClass(getStrategyNodeMetrics(node)!.resultCurrency)">{{ formatSignedCurrency(getStrategyNodeMetrics(node)!.resultCurrency) }}</strong>
                    </span>
                    <span class="flex min-w-0 flex-col border border-black/10 px-1.5 py-1">
                      <small class="text-[8px] font-black tracking-[0.18em] text-black/40">{{ boardUiLabels.startShort }}</small>
                      <strong class="truncate text-[14px] font-black text-black/85">{{ formatCurrencyValue(getStrategyNodeMetrics(node)!.initialCapital) }}</strong>
                    </span>
                    <span class="flex min-w-0 flex-col border border-black/10 px-1.5 py-1">
                      <small class="text-[8px] font-black tracking-[0.18em] text-black/40">{{ boardUiLabels.endShort }}</small>
                      <strong class="truncate text-[14px] font-black" :class="getResultToneClass(getStrategyNodeMetrics(node)!.finalCapital - getStrategyNodeMetrics(node)!.initialCapital)">{{ formatCurrencyValue(getStrategyNodeMetrics(node)!.finalCapital) }}</strong>
                    </span>
                  </span>
                </button>
              </div>

              <div v-else-if="node.type === 'trade'" class="flex h-full w-full items-center justify-center bg-white/80 px-3 font-mono">
                <button
                  class="flex min-w-0 w-full flex-col justify-center gap-3 text-left outline-none transition-colors"
                  :class="node.tradeId ? 'text-black/80 hover:text-black' : 'text-black/35 hover:text-black/70'"
                  @pointerdown.stop
                  @click.stop="openTradePicker(node)"
                >
                  <span class="flex w-full items-start justify-between gap-3">
                    <span class="flex min-w-0 flex-col">
                      <span class="max-w-full truncate text-xl font-black uppercase tracking-widest">
                        {{ getTradeNodeAssetLabel(node) }}
                      </span>
                      <span class="max-w-full truncate text-[9px] font-black uppercase tracking-[0.24em]" :class="getTradeNodeVectorClass(node)">
                        {{ getTradeNodeVector(node) }}
                      </span>
                    </span>
                    <span class="max-w-[45%] truncate text-right text-[12px] font-black uppercase tracking-[0.16em]" :class="getTradeNodeResultClass(node)">
                      {{ getTradeNodeResult(node) || boardUiLabels.select }}
                    </span>
                  </span>
                  <span class="grid w-full grid-cols-2 gap-1.5 text-center uppercase">
                    <span class="flex min-w-0 flex-col border border-black/10 px-1.5 py-1">
                      <small class="text-[8px] font-black tracking-[0.16em] text-black/40">{{ boardUiLabels.entryShort }}</small>
                      <strong class="truncate text-[11px] font-black text-black/80">{{ getTradeNodeEntryDate(node) }}</strong>
                    </span>
                    <span class="flex min-w-0 flex-col border border-black/10 px-1.5 py-1">
                      <small class="text-[8px] font-black tracking-[0.16em] text-black/40">{{ boardUiLabels.exitShort }}</small>
                      <strong class="truncate text-[11px] font-black text-black/80">{{ getTradeNodeExitDate(node) }}</strong>
                    </span>
                  </span>
                </button>
              </div>

              <!-- Matrix-style ports -->
              <div
                class="absolute top-1/2 -left-[6px] z-30 h-[12px] w-[12px] -translate-y-1/2 rotate-45 border-[2px] border-black bg-white shadow-[0_0_20px_rgba(44,44,42,0.3)] transition-all"
                :class="isHighlightedPassiveBoardPort(node) ? 'opacity-100 scale-125' : 'opacity-0 group-hover/node:opacity-100'"
                @pointerdown.stop.prevent="pickupBoardInput(node, 'left')"
                @pointerup.stop.prevent="dropBoardWire(node, 'left')"
                @dblclick.stop.prevent="clearBoardInput(node)"
              ></div>
              <div
                class="absolute top-1/2 -right-[6px] z-30 h-[12px] w-[12px] -translate-y-1/2 rotate-45 border-[2px] border-black bg-white opacity-0 shadow-[0_0_20px_rgba(44,44,42,0.3)] transition-all hover:bg-black group-hover/node:opacity-100"
                @pointerdown.stop.prevent="startBoardWire(node, 'right', $event)"
                @dblclick.stop.prevent="clearBoardOutput(node)"
              ></div>
              <div
                class="absolute -top-[6px] left-1/2 z-30 h-[12px] w-[12px] -translate-x-1/2 rotate-45 border-[2px] border-black bg-white shadow-[0_0_20px_rgba(44,44,42,0.3)] transition-all"
                :class="isHighlightedPassiveBoardPort(node) ? 'opacity-100 scale-125' : 'opacity-0 group-hover/node:opacity-100'"
                @pointerdown.stop.prevent="pickupBoardInput(node, 'top')"
                @pointerup.stop.prevent="dropBoardWire(node, 'top')"
                @dblclick.stop.prevent="clearBoardInput(node)"
              ></div>
              <div
                class="absolute -bottom-[6px] left-1/2 z-30 h-[12px] w-[12px] -translate-x-1/2 rotate-45 border-[2px] border-black bg-white opacity-0 shadow-[0_0_20px_rgba(44,44,42,0.3)] transition-all hover:bg-black group-hover/node:opacity-100"
                @pointerdown.stop.prevent="startBoardWire(node, 'bottom', $event)"
                @dblclick.stop.prevent="clearBoardOutput(node)"
              ></div>

              <!-- Resize Handle -->
              <div 
                data-board-resize 
                :data-node-id="node.id"
                class="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover/node:opacity-100 transition-opacity z-10 flex items-end justify-end p-1"
              >
                <div class="w-2 h-2 border-r-2 border-b-2 border-black/40"></div>
              </div>
            </article>
          </div>

          <!-- OFFSCREEN ORIGIN INDICATOR -->
          <div v-if="outOfBoundsIndicator"
               class="absolute pointer-events-auto flex flex-col items-center transition-all duration-300 z-[150]"
               :style="{ left: outOfBoundsIndicator.x + 'px', top: outOfBoundsIndicator.y + 'px', transform: 'translate(-50%, -50%)' }">
            <div class="w-10 h-10 flex items-center justify-center transition-transform duration-100 cursor-pointer group"
                 :style="{ transform: `rotate(${outOfBoundsIndicator.angle}deg)` }"
                 @click="focusBoardNode(outOfBoundsIndicator.id)">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="drop-shadow-sm transition-transform group-hover:scale-125 text-black">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="flex flex-col items-center mt-1">
              <span class="text-[8px] font-mono font-bold tracking-widest uppercase truncate max-w-[100px] text-black">{{ outOfBoundsIndicator.name }}</span>
              <span class="text-[7px] font-mono opacity-60 font-bold text-black">{{ outOfBoundsIndicator.dist }}px</span>
            </div>
          </div>

          <!-- Custom Cursor for Board Drawing -->
          <div v-if="activeBoardTool === 'pencil' && boardDrawing.isBoardDrawingCursorVisible.value && !isSpacePressed"
               class="absolute rounded-full pointer-events-none z-40 shadow-[0_0_0_1px_rgba(255,255,255,0.8)]"
               :class="boardDrawing.boardDrawingTool.value === 'eraser' ? 'border-2 border-red-500 bg-red-500/10' : 'border-2 border-black bg-black/5'"
               :style="boardDrawing.boardDrawingCursorStyle.value">
          </div>

          <!-- Tooltip at the top center -->
          <div 
            v-if="activeBoardTool && activeBoardTool !== 'pencil'"
            class="pointer-events-none absolute top-8 left-1/2 transform -translate-x-1/2 z-[9999] px-4 py-2 bg-black text-white text-[10px] font-mono tracking-widest uppercase shadow-lg"
          >
            {{ locale === 'ru' ? 'Кликните чтобы добавить' : 'Click to add node' }}
          </div>

          <!-- Left Vertical Toolbar -->
          <div data-board-chrome class="absolute left-6 top-1/2 z-50 w-fit -translate-y-1/2 cursor-auto"
               @pointerdown.stop
               @pointermove.stop
               @pointerenter="boardDrawing.isBoardDrawingCursorVisible.value = false">
          <ExPanel variant="light" :no-padding="true" :show-corners="true" :no-shadow="true" class="flex flex-col items-center py-2 px-1 border-black/20 !w-fit">
            <button class="p-2 transition-colors group relative" 
                    :class="activeBoardTool === 'text' ? 'bg-black/10' : 'hover:bg-black/5'"
                    @click.stop="activeBoardTool = activeBoardTool === 'text' ? null : 'text'">
              <svg class="w-5 h-5 transition-colors" :class="activeBoardTool === 'text' ? 'text-black' : 'text-black/60 group-hover:text-black'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M4 7V4h16v3M9 20h6M12 4v16" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <div class="w-6 h-px bg-black/10 my-1"></div>
            <button class="p-2 transition-colors group relative" 
                    :class="activeBoardTool === 'image' ? 'bg-black/10' : 'hover:bg-black/5'"
                    @click.stop="activeBoardTool = activeBoardTool === 'image' ? null : 'image'">
              <svg class="w-5 h-5 transition-colors" :class="activeBoardTool === 'image' ? 'text-black' : 'text-black/60 group-hover:text-black'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="8.5" cy="8.5" r="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="21 15 16 10 5 21" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <div class="w-6 h-px bg-black/10 my-1"></div>
            <button class="p-2 transition-colors group relative" 
                    :class="activeBoardTool === 'drawing' ? 'bg-black/10' : 'hover:bg-black/5'"
                    @click.stop="activeBoardTool = activeBoardTool === 'drawing' ? null : 'drawing'">
              <svg class="w-5 h-5 transition-colors" :class="activeBoardTool === 'drawing' ? 'text-black' : 'text-black/60 group-hover:text-black'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                <path d="M2 2l7.586 7.586"/>
                <circle cx="11" cy="11" r="2"/>
              </svg>
            </button>
            <div class="w-6 h-px bg-black/10 my-1"></div>
            <button class="p-2 transition-colors group relative" 
                    :class="activeBoardTool === 'pencil' ? 'bg-black/10' : 'hover:bg-black/5'"
                    @click.stop="activeBoardTool = activeBoardTool === 'pencil' ? null : 'pencil'">
              <svg class="w-5 h-5 transition-colors" :class="activeBoardTool === 'pencil' ? 'text-black' : 'text-black/60 group-hover:text-black'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
              </svg>
            </button>
            <template v-if="!isSignalArticle">
              <div class="w-6 h-px bg-black/10 my-1"></div>
              <button
                class="flex h-9 w-9 items-center justify-center font-mono text-[9px] font-black uppercase tracking-widest transition-colors"
                :class="activeBoardTool === 'strategy-node' ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'"
                @click.stop="activeBoardTool = activeBoardTool === 'strategy-node' ? null : 'strategy-node'"
              >
                {{ boardUiLabels.strategyTool }}
              </button>
              <div class="w-6 h-px bg-black/10 my-1"></div>
              <button
                class="flex h-9 w-9 items-center justify-center font-mono text-[9px] font-black uppercase tracking-widest transition-colors"
                :class="activeBoardTool === 'trade-node' ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'"
                @click.stop="activeBoardTool = activeBoardTool === 'trade-node' ? null : 'trade-node'"
              >
                {{ boardUiLabels.tradeTool }}
              </button>
            </template>
          </ExPanel>
          </div>
          
          <!-- Right Vertical Toolbar (Pencil Settings) -->
          <div v-if="activeBoardTool === 'pencil'" data-board-chrome class="absolute right-6 top-1/2 -translate-y-1/2 z-50 w-12 cursor-auto"
               @pointerdown.stop
               @pointermove.stop
               @pointerenter="boardDrawing.isBoardDrawingCursorVisible.value = false">
            <ExPanel variant="light" :no-padding="true" :show-corners="true" :no-shadow="true" class="flex flex-col items-center py-2 px-1 border-black/20 w-full">
               <!-- Brush Tool -->
               <button class="p-2 transition-colors group relative"
                       :class="boardDrawing.boardDrawingTool.value === 'pencil' ? 'bg-black/10' : 'hover:bg-black/5'"
                       @click="boardDrawing.boardDrawingTool.value = 'pencil'">
                  <div class="w-5 h-5 flex items-center justify-center">
                    <div class="w-2 h-2 rounded-full bg-black"></div>
                  </div>
               </button>

               <div class="w-6 h-px bg-black/10 my-1"></div>

               <!-- Eraser Tool -->
               <button class="p-2 transition-colors group relative"
                       :class="boardDrawing.boardDrawingTool.value === 'eraser' ? 'bg-black/10' : 'hover:bg-black/5'"
                       @click="boardDrawing.boardDrawingTool.value = 'eraser'">
                  <div class="w-5 h-5 flex items-center justify-center">
                    <div class="w-2 h-2 rounded-full border-2" :class="boardDrawing.boardDrawingTool.value === 'eraser' ? 'border-black' : 'border-black/60 group-hover:border-black'"></div>
                  </div>
               </button>

               <div class="w-6 h-px bg-black/10 my-1"></div>

               <!-- Size Slider (Vertical) -->
               <div class="flex flex-col items-center py-2 w-full gap-2">
                  <div class="w-5 h-5 flex items-center justify-center pointer-events-none">
                    <div class="rounded-full border border-black/40"
                         :style="{ width: `${Math.min(18, Math.max(5, boardDrawing.boardDrawingSize.value))}px`, height: `${Math.min(18, Math.max(5, boardDrawing.boardDrawingSize.value))}px`, backgroundColor: boardDrawing.boardDrawingColor.value }"></div>
                  </div>
                  <div class="relative h-32 w-10 touch-none select-none cursor-ns-resize group/slider" @pointerdown.stop.prevent="boardDrawing.startBoardDrawingSizeDrag">
                     <div class="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-black/10 rounded-full group-hover/slider:bg-black/20 transition-colors"></div>
                     <div class="absolute left-1/2 w-2 h-2 bg-white border border-black/30 rounded-full shadow-sm pointer-events-none transition-transform group-active/slider:scale-110"
                          :style="{ bottom: `${boardDrawing.boardDrawingSizePercent.value}%`, transform: 'translate(-50%, 50%)' }">
                     </div>
                  </div>
               </div>

               <div class="w-6 h-px bg-black/10 my-1"></div>

               <!-- Color Picker -->
               <div class="flex flex-col items-center py-2 w-full">
                  <label class="w-5 h-5 rounded-full cursor-pointer border border-black/20 overflow-hidden hover:scale-110 transition-transform relative">
                     <input type="color" v-model="boardDrawing.boardDrawingColor.value" class="w-full h-full opacity-0 cursor-pointer absolute inset-0" />
                     <div class="w-full h-full" :style="{ backgroundColor: boardDrawing.boardDrawingColor.value }"></div>
                  </label>
               </div>
            </ExPanel>
          </div>

          <!-- Bottom Right Actions -->
          <div data-board-chrome class="absolute bottom-6 right-6 z-50 flex items-center gap-4 cursor-auto"
               @pointerdown.stop
               @pointermove.stop
               @pointerenter="boardDrawing.isBoardDrawingCursorVisible.value = false">
            <template v-if="isEditingArticle">
              <button class="px-6 py-3 border border-black/20 bg-white/90 shadow-sm text-[10px] font-mono uppercase tracking-widest hover:border-black/50 hover:bg-white transition-colors"
                      @click="cancelArticleEditing">
                {{ locale === 'ru' ? 'ОТМЕНИТЬ РЕДАКТИРОВАНИЕ' : 'CANCEL EDITING' }}
              </button>
            </template>
            <template v-else>
              <button class="px-6 py-3 border border-black/20 bg-white/90 shadow-sm text-[10px] font-mono uppercase tracking-widest hover:border-black/50 hover:bg-white transition-colors"
                      @click="creationStep = 'metadata'">
                {{ locale === 'ru' ? 'НАЗАД' : 'BACK' }}
              </button>
              <button class="px-6 py-3 border border-black/20 bg-white/90 shadow-sm text-[10px] font-mono uppercase tracking-widest hover:border-black/50 hover:bg-white transition-colors"
                      @click="saveDraftAndExit">
                {{ locale === 'ru' ? 'СОХРАНИТЬ ЧЕРНОВИК' : 'SAVE DRAFT' }}
              </button>
            </template>
            <button class="px-8 py-3 border border-black/20 bg-black text-white shadow-sm text-[10px] font-mono uppercase tracking-[0.2em] hover:bg-black/80 transition-colors"
                    :class="!isSignalBoardValid ? 'cursor-not-allowed opacity-35 hover:bg-black' : ''"
                    :disabled="!isSignalBoardValid"
                    @click="publishArticle">
              {{ locale === 'ru' ? 'ПРОДОЛЖИТЬ' : 'CONTINUE' }}
            </button>
          </div>
          <ExForumDrawingPanel :drawing="drawing" />
          <Teleport to="body">
            <Transition name="fade">
              <div
                v-if="activeAssetNodeId"
                class="fixed inset-0 z-[100000] flex items-center justify-center bg-black/20"
                @click.self="closeAssetPicker"
              >
                <div class="w-[800px] max-w-[95vw] max-h-[80vh] flex flex-col relative" @click.stop>
                  <ExPanel variant="light" :no-padding="true" :no-shadow="true" class="h-[500px] max-h-[80vh] flex flex-col bg-black/85 text-white border-white/10">
                    <div class="p-6 border-b border-white/10 flex items-center gap-4 shrink-0 bg-black/20">
                      <input
                        v-model="assetSearch"
                        :placeholder="boardUiLabels.searchAssets"
                        class="w-full uppercase text-xl font-black tracking-widest bg-transparent border-0 outline-none text-white placeholder-white/20 font-mono"
                        autofocus
                      />
                    </div>
                    <div class="flex items-center gap-6 px-6 py-4 border-b border-white/10 overflow-x-auto scroll-minimal shrink-0 bg-black/20">
                      <button
                        v-for="assetType in assetTypeOptions"
                        :key="assetType"
                        class="text-[9px] uppercase tracking-[0.3em] font-bold transition-all whitespace-nowrap"
                        :class="assetTypeFilter === assetType ? 'text-white border-b border-white pb-0.5' : 'text-white/40 hover:text-white/70'"
                        @click="assetTypeFilter = assetType"
                      >
                        {{ getAssetTypeLoc(assetType) }}
                      </button>
                    </div>
                    <div class="flex-1 overflow-y-auto scroll-minimal py-2">
                      <div
                        v-for="asset in filteredAssets"
                        :key="asset.symbol"
                        class="group/asset flex items-center justify-start gap-4 px-6 py-4 cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/10 transition-all text-left w-full"
                        @click="selectBoardAsset(asset)"
                      >
                        <div
                          class="w-10 h-10 rounded-full overflow-hidden border border-white/10 group-hover/asset:border-white/40 flex items-center justify-center shrink-0 transition-colors"
                          :class="asset.type === 'US Equities' || asset.type === 'Stocks' ? 'bg-white' : 'bg-white/5'"
                        >
                          <img
                            v-if="asset.icon && !failedAssetIcons.has(asset.symbol)"
                            :src="asset.icon"
                            class="w-full h-full object-contain"
                            @error="handleAssetIconError(asset.symbol)"
                          />
                          <span v-else class="text-[14px] font-black uppercase transition-colors" :class="asset.type === 'US Equities' || asset.type === 'Stocks' ? 'text-black' : 'text-white'">
                            {{ asset.symbol[0] }}
                          </span>
                        </div>
                        <div class="flex flex-col min-w-0 flex-1 gap-0.5">
                          <span class="text-[14px] font-bold tracking-widest text-white">{{ asset.symbol }}</span>
                          <span class="text-[10px] text-white/40 truncate uppercase tracking-tighter">{{ asset.name }}</span>
                        </div>
                        <div class="shrink-0 text-[8px] uppercase tracking-[0.2em] text-white/20 group-hover/asset:text-white/60 border border-white/10 px-2 py-1 transition-colors">
                          {{ getAssetTypeLoc(asset.type) }}
                        </div>
                      </div>
                      <div v-if="filteredAssets.length === 0" class="flex flex-col items-center justify-center h-full text-white/30 uppercase tracking-[0.3em] font-mono text-[10px] mt-10">
                        {{ boardUiLabels.noAssetsFound }}
                      </div>
                    </div>
                  </ExPanel>
                </div>
              </div>
            </Transition>
          </Teleport>
          <Transition name="fade">
              <div
                v-if="activeStrategyNodeId"
                data-board-chrome
                class="absolute inset-0 z-[90] flex items-center justify-center bg-black/20 px-6 py-8"
                @click.self="closeStrategyPicker"
                @pointerdown.stop
                @pointermove.stop
              >
                <div class="relative flex h-full max-h-[520px] w-[760px] max-w-full flex-col" @click.stop>
                  <ExPanel variant="light" :no-padding="true" :show-corners="true" :no-shadow="true" class="flex h-full flex-col border-black/20 bg-white text-black">
                    <div class="flex items-center border-b border-black/10 px-6 py-5">
                      <div class="flex flex-col gap-1">
                        <span class="font-mono text-[9px] font-black uppercase tracking-[0.35em] text-black/35">
                          {{ locale === 'ru' ? 'ЛОКАЛЬНЫЕ СТРАТЕГИИ' : 'LOCAL STRATEGIES' }}
                        </span>
                        <strong class="font-mono text-xl font-black uppercase tracking-widest">
                          {{ locale === 'ru' ? 'Выберите стратегию' : 'Select strategy' }}
                        </strong>
                      </div>
                    </div>
                    <div class="grid grid-cols-[1fr_0.45fr_0.45fr_0.75fr] gap-3 border-b border-black/10 px-6 py-3 font-mono text-[8px] font-black uppercase tracking-[0.25em] text-black/35">
                      <span>{{ locale === 'ru' ? 'Стратегия' : 'Strategy' }}</span>
                      <span>{{ boardUiLabels.profitFactorShort }}</span>
                      <span>{{ boardUiLabels.winRateShort }}</span>
                      <span class="text-right">{{ locale === 'ru' ? 'Результат' : 'Result' }}</span>
                    </div>
                    <div class="flex-1 overflow-y-auto scroll-minimal py-2">
                      <button
                        v-for="strategy in localStrategies"
                        :key="strategy.id"
                        class="grid w-full grid-cols-[1fr_0.45fr_0.45fr_0.75fr] items-center gap-3 border-b border-black/5 px-6 py-4 text-left font-mono transition-colors hover:bg-black/5"
                        @click="selectBoardStrategy(strategy)"
                      >
                        <span class="min-w-0">
                          <span class="block truncate text-[13px] font-black uppercase tracking-widest text-black/80">{{ strategy.name }}</span>
                          <span class="mt-1 block text-[8px] uppercase tracking-[0.2em] text-black/30">
                            {{ getStrategyMetrics(strategy).tradesCount }} {{ locale === 'ru' ? 'сделок' : 'trades' }}
                          </span>
                        </span>
                        <span class="text-[12px] font-black text-black/60">{{ formatProfitFactor(getStrategyMetrics(strategy).profitFactor) }}</span>
                        <span class="text-[12px] font-black text-black/60">{{ formatCompactNumber(getStrategyMetrics(strategy).winRate, 1) }}%</span>
                        <span class="text-right text-[12px] font-black" :class="getResultToneClass(getStrategyMetrics(strategy).resultCurrency)">
                          {{ formatSignedCurrency(getStrategyMetrics(strategy).resultCurrency) }} ({{ formatSignedPercent(getStrategyMetrics(strategy).resultPercent) }})
                        </span>
                      </button>
                      <div v-if="localStrategies.length === 0" class="flex h-64 items-center justify-center font-mono text-[10px] uppercase tracking-[0.3em] text-black/30">
                        {{ boardUiLabels.noStrategiesFound }}
                      </div>
                    </div>
                  </ExPanel>
                </div>
              </div>
          </Transition>
          <Transition name="fade">
              <div
                v-if="activeTradeNodeId"
                data-board-chrome
                class="absolute inset-0 z-[90] flex items-center justify-center bg-black/20 px-6 py-8"
                @click.self="closeTradePicker"
                @pointerdown.stop
                @pointermove.stop
              >
                <div class="relative flex h-full max-h-[620px] w-[980px] max-w-full flex-col" @click.stop>
                  <ExPanel variant="light" :no-padding="true" :show-corners="true" :no-shadow="true" class="flex h-full flex-col border-black/20 bg-white text-black">
                    <div class="flex items-center border-b border-black/10 px-6 py-5">
                      <div class="flex flex-col gap-1">
                        <span class="font-mono text-[9px] font-black uppercase tracking-[0.35em] text-black/35">
                          {{ locale === 'ru' ? 'EXGENESISLOG // СПИСОК' : 'EXGENESISLOG // LIST' }}
                        </span>
                        <strong class="font-mono text-xl font-black uppercase tracking-widest">
                          {{ locale === 'ru' ? 'Выберите сделку' : 'Select trade' }}
                        </strong>
                      </div>
                    </div>
                    <div class="flex-1 overflow-y-auto scroll-minimal py-2">
                      <div
                        v-for="strategy in tradePickerStrategies"
                        :key="strategy.id"
                        class="border-b border-black/5 last:border-0"
                      >
                        <button
                          class="grid w-full grid-cols-[1fr_0.4fr_0.4fr_0.7fr_auto] items-center gap-3 px-6 py-4 text-left font-mono transition-colors hover:bg-black/5"
                          @click="toggleTradeStrategy(strategy.id)"
                        >
                          <span class="min-w-0">
                            <span class="block truncate text-[13px] font-black uppercase tracking-widest text-black/80">{{ strategy.name }}</span>
                            <span class="mt-1 block text-[8px] uppercase tracking-[0.2em] text-black/30">
                              {{ getTradePickerStrategyTrades(strategy.id).length }} {{ locale === 'ru' ? 'сделок' : 'trades' }}
                            </span>
                          </span>
                          <span class="text-[11px] font-black text-black/55">{{ boardUiLabels.profitFactorShort }} {{ formatProfitFactor(getStrategyMetrics(strategy).profitFactor) }}</span>
                          <span class="text-[11px] font-black text-black/55">{{ boardUiLabels.winRateShort }} {{ formatCompactNumber(getStrategyMetrics(strategy).winRate, 1) }}%</span>
                          <span class="text-right text-[11px] font-black" :class="getResultToneClass(getStrategyMetrics(strategy).resultCurrency)">
                            {{ formatSignedCurrency(getStrategyMetrics(strategy).resultCurrency) }} ({{ formatSignedPercent(getStrategyMetrics(strategy).resultPercent) }})
                          </span>
                          <span class="flex h-6 w-6 items-center justify-center border border-black/10 text-[12px] font-black text-black/35 transition-colors" :class="expandedTradeStrategyId === strategy.id ? 'bg-black text-white' : ''">
                            {{ expandedTradeStrategyId === strategy.id ? '−' : '+' }}
                          </span>
                        </button>

                        <div v-if="expandedTradeStrategyId === strategy.id" class="border-t border-black/10 bg-black/[0.025]">
                          <div class="grid grid-cols-[1fr_0.8fr_1.35fr_1fr_1fr] gap-2 border-b border-black/10 px-6 py-3 pl-10 font-mono text-[8px] font-black uppercase tracking-[0.25em] text-black/35">
                            <span>{{ boardUiLabels.direction }}</span>
                            <span>{{ boardUiLabels.asset }}</span>
                            <span>{{ boardUiLabels.dates }}</span>
                            <span class="text-right">{{ boardUiLabels.duration }}</span>
                            <span class="text-right">{{ boardUiLabels.result }}</span>
                          </div>
                          <button
                            v-for="trade in getTradePickerStrategyTrades(strategy.id)"
                            :key="trade.id"
                            class="grid w-full grid-cols-[1fr_0.8fr_1.35fr_1fr_1fr] items-center gap-2 border-b border-black/5 px-6 py-3 pl-10 text-left font-mono transition-colors last:border-0 hover:bg-black/5"
                            @click="selectBoardTrade(trade)"
                          >
                            <span class="flex min-w-0 items-center gap-3">
                              <span class="h-1.5 w-1.5 rounded-full" :class="getResultDotClass(getTradeCurrencyProfit(trade))"></span>
                              <span class="truncate text-[12px] font-black uppercase tracking-widest">{{ getTradeSideLabel(trade.side) }}</span>
                            </span>
                            <span class="truncate text-[11px] uppercase tracking-wider text-black/60">{{ trade.asset || boardUiLabels.assetFallback }}</span>
                            <span class="flex min-w-0 flex-col">
                              <span class="truncate text-[9px] uppercase tracking-wider text-black/35">{{ locale === 'ru' ? 'Вход' : 'Entry' }}: {{ formatTradeDate(trade.date) }}</span>
                              <span class="truncate text-[9px] uppercase tracking-wider text-black/35">{{ locale === 'ru' ? 'Выход' : 'Exit' }}: {{ formatTradeDate(trade.dateExit) }}</span>
                            </span>
                            <span class="truncate text-right text-[11px] uppercase tracking-wider text-black/40">{{ formatTradeDuration(trade) }}</span>
                            <span class="truncate text-right text-[12px] font-black tracking-wider" :class="getResultToneClass(getTradeCurrencyProfit(trade))">
                              {{ formatSignedCurrency(getTradeCurrencyProfit(trade)) }} ({{ formatSignedPercent(getTradePercentProfit(trade, trade.strategyId || strategy.id)) }})
                            </span>
                          </button>
                          <div v-if="getTradePickerStrategyTrades(strategy.id).length === 0" class="px-10 py-8 text-center font-mono text-[9px] uppercase tracking-[0.25em] text-black/25">
                            {{ boardUiLabels.noTradesInStrategy }}
                          </div>
                        </div>
                      </div>
                      <div v-if="tradePickerStrategies.length === 0" class="flex h-64 items-center justify-center font-mono text-[10px] uppercase tracking-[0.3em] text-black/30">
                        {{ boardUiLabels.noTradesFound }}
                      </div>
                    </div>
                  </ExPanel>
                </div>
              </div>
          </Transition>
        </div>
        

        <!-- PREVIEW STEP -->
        <!-- Note: This logic is bypassed, user sees the ExPanel instead -->
        <div v-else-if="creationStep === 'preview'" class="flex-1 flex flex-col bg-[#F4F4F4] overflow-hidden relative font-mono">
          <!-- Header -->
          <header class="flex-shrink-0 flex items-center justify-between px-12 py-6 border-b border-black/10 z-10 bg-[#F4F4F4]">
            <button class="px-6 py-3 border border-black/20 bg-white shadow-sm text-[10px] font-mono uppercase tracking-widest hover:border-black/50 transition-colors"
                    @click="creationStep = 'board'">
              {{ locale === 'ru' ? 'НАЗАД В РЕДАКТОР' : 'BACK TO EDITOR' }}
            </button>
            <div class="text-[10px] uppercase tracking-[0.3em] font-black opacity-40">
              {{ locale === 'ru' ? 'ФИНАЛЬНЫЙ РЕЗУЛЬТАТ' : 'FINAL RESULT' }}
            </div>
            <button class="px-8 py-3 border border-black/20 bg-black text-white shadow-sm text-[10px] font-mono uppercase tracking-[0.2em] hover:bg-black/80 transition-colors"
                    :disabled="isPublishingArticle"
                    :class="isPublishingArticle ? 'cursor-wait opacity-60' : ''"
                    @click="showPublishConfirmation = true">
              {{ isPublishingArticle ? boardUiLabels.publishing : (isEditingArticle ? (locale === 'ru' ? 'ОБНОВИТЬ' : 'UPDATE') : (locale === 'ru' ? 'ОПУБЛИКОВАТЬ' : 'PUBLISH')) }}
            </button>
          </header>

          <!-- Scrollable Content -->
          <div class="flex-1 overflow-y-auto scroll-minimal px-12 py-16">
            <div class="max-w-[800px] mx-auto flex flex-col items-center">
              <!-- Title & Description -->
              <h1 class="text-5xl font-serif italic text-black/90 text-center mb-8 break-words leading-tight w-full">
                {{ newArticleForm.title }}
              </h1>
              <p class="text-sm font-mono text-black/60 text-center leading-loose mb-16 max-w-[600px] whitespace-pre-wrap">
                {{ newArticleForm.description }}
              </p>

              <!-- Nodes -->
              <div class="flex flex-col w-full gap-12">
                <template v-for="(node, index) in previewNodes" :key="node.id">
                  
                  <!-- NODE WRAPPER WITH CONTROLS -->
                  <div class="group relative w-full flex flex-col items-center">
                    
                    <!-- NODE CONTENT -->
                    <div class="w-full">
                      <!-- TEXT -->
                      <div v-if="node.type === 'text'" class="w-full flex flex-col gap-4 font-serif italic break-words">
                        <h2 v-if="(node as any).title" class="font-bold text-black/90"
                            :class="(node as any).isQuestion ? 'text-5xl leading-none text-center' : 'text-3xl'">
                          {{ (node as any).title }}
                        </h2>
                        <div v-if="(node as any).text" class="text-black/80 whitespace-pre-wrap"
                             :class="(node as any).isQuestion ? 'text-3xl text-center' : 'text-base leading-relaxed'"
                             v-html="(node as any).text">
                        </div>
                      </div>

                      <!-- SIGNAL HEADER -->
                      <div v-else-if="(node as any).type === 'signal-header'" class="w-full flex justify-center py-6">
                        <div class="flex flex-row items-center justify-between w-full max-w-[800px] border border-black/10 bg-white shadow-sm overflow-hidden">
                          
                          <!-- Current Price -->
                          <div class="flex flex-col items-center justify-center flex-1 py-8 px-4" :class="(node as any).cp ? 'bg-blue-50/50' : ''">
                            <span class="text-[9px] uppercase tracking-[0.3em] font-black text-black/40 mb-2">
                              {{ locale === 'ru' ? 'ТЕКУЩАЯ ЦЕНА' : 'CURRENT PRICE' }}
                            </span>
                            <div class="flex items-center gap-2" v-if="(node as any).cp">
                              <span v-if="getPriceNodeArrow((node as any).cp)" class="text-xl font-black" :class="getPriceNodeValueClass((node as any).cp)">{{ getPriceNodeArrow((node as any).cp) }}</span>
                              <span class="text-3xl font-mono font-black tracking-widest text-black/90" :class="getPriceNodeValueClass((node as any).cp)">
                                {{ (node as any).cp.value || '0.00' }}
                              </span>
                            </div>
                            <span v-else class="text-3xl font-mono font-black tracking-widest text-black/20">---</span>
                          </div>

                          <!-- Asset -->
                          <div class="flex flex-col items-center justify-center flex-1 py-8 px-4 border-l border-r border-black/10 bg-white z-10 shadow-[0_0_20px_rgba(0,0,0,0.05)]">
                             <span class="text-[9px] uppercase tracking-[0.3em] font-black text-black/40 mb-2">
                               {{ locale === 'ru' ? 'АКТИВ' : 'ASSET' }}
                             </span>
                             <span class="max-w-full truncate text-4xl font-black uppercase tracking-widest text-black/90" v-if="(node as any).asset">
                               {{ (node as any).asset.asset || '---' }}
                             </span>
                             <span v-else class="text-4xl font-mono font-black tracking-widest text-black/20">---</span>
                          </div>

                          <!-- Target Price -->
                          <div class="flex flex-col items-center justify-center flex-1 py-8 px-4" :class="(node as any).tp ? 'bg-green-50/50' : ''">
                            <span class="text-[9px] uppercase tracking-[0.3em] font-black text-black/40 mb-2">
                              {{ locale === 'ru' ? 'ЦЕЛЬ' : 'TARGET' }}
                            </span>
                            <div class="flex items-center gap-2" v-if="(node as any).tp">
                              <span v-if="getPriceNodeArrow((node as any).tp)" class="text-xl font-black" :class="getPriceNodeValueClass((node as any).tp)">{{ getPriceNodeArrow((node as any).tp) }}</span>
                              <span class="text-3xl font-mono font-black tracking-widest text-black/90" :class="getPriceNodeValueClass((node as any).tp)">
                                {{ (node as any).tp.value || '0.00' }}
                              </span>
                            </div>
                            <span v-else class="text-3xl font-mono font-black tracking-widest text-black/20">---</span>
                          </div>

                        </div>
                      </div>

                      <!-- ASSET (Standalone, if any left) -->
                      <div v-else-if="node.type === 'asset'" class="w-full p-8 border border-black/10 bg-black/5 flex flex-col items-center">
                        <span class="text-[9px] uppercase tracking-[0.3em] font-black text-black/40 mb-2">
                          {{ locale === 'ru' ? 'АКТИВ' : 'ASSET' }}
                        </span>
                        <span class="text-4xl font-mono font-black uppercase tracking-widest text-black/90">
                          {{ (node as any).asset || '---' }}
                        </span>
                      </div>

                      <!-- PRICE (Standalone, if any left) -->
                      <div v-else-if="node.type === 'price'" class="w-full p-8 border border-black/10 flex flex-col items-center"
                           :class="(node as any).priceKind === 'current' ? 'bg-blue-50/50' : 'bg-green-50/50'">
                        <span class="text-[9px] uppercase tracking-[0.3em] font-black text-black/40 mb-2">
                          {{ (node as any).priceKind === 'current' ? (locale === 'ru' ? 'ТЕКУЩАЯ ЦЕНА' : 'CURRENT PRICE') : (locale === 'ru' ? 'ПРЕДПОЛАГАЕМАЯ ЦЕНА' : 'TARGET PRICE') }}
                        </span>
                        <span class="text-4xl font-mono font-black tracking-widest text-black/90">
                          {{ (node as any).value || '0.00' }}
                        </span>
                      </div>

                      <!-- STRATEGY / TRADE -->
                      <div v-else-if="node.type === 'strategy'" class="w-full flex justify-center py-6">
                        <div class="flex min-w-[300px] max-w-[450px] w-full flex-col items-center justify-center gap-4 text-center border border-black/10 bg-white p-6 shadow-sm">
                          <span class="text-[9px] font-black uppercase tracking-[0.3em] text-black/40">
                            {{ locale === 'ru' ? 'СТРАТЕГИЯ' : 'STRATEGY' }}
                          </span>
                          <span class="max-w-full truncate text-2xl font-black uppercase tracking-widest text-black/80">
                            {{ getStrategyNodeLabel(node) || '---' }}
                          </span>
                          <span v-if="getStrategyNodeMetrics(node)" class="grid w-full grid-cols-5 gap-2 text-center uppercase pt-4 border-t border-black/5 mt-2">
                            <span class="flex min-w-0 flex-col px-1.5">
                              <small class="text-[8px] font-black tracking-[0.18em] text-black/40">{{ boardUiLabels.profitFactorShort }}</small>
                              <strong class="truncate text-[14px] font-black text-black/85">{{ formatProfitFactor(getStrategyNodeMetrics(node)!.profitFactor) }}</strong>
                            </span>
                            <span class="flex min-w-0 flex-col px-1.5 border-l border-black/5">
                              <small class="text-[8px] font-black tracking-[0.18em] text-black/40">{{ boardUiLabels.winRateShort }}</small>
                              <strong class="truncate text-[14px] font-black text-black/85">{{ formatCompactNumber(getStrategyNodeMetrics(node)!.winRate, 1) }}%</strong>
                            </span>
                            <span class="flex min-w-0 flex-col px-1.5 border-l border-black/5">
                              <small class="text-[8px] font-black tracking-[0.18em] text-black/40">{{ boardUiLabels.resultShort }}</small>
                              <strong class="truncate text-[14px] font-black" :class="getResultToneClass(getStrategyNodeMetrics(node)!.resultCurrency)">{{ formatSignedCurrency(getStrategyNodeMetrics(node)!.resultCurrency) }}</strong>
                            </span>
                            <span class="flex min-w-0 flex-col px-1.5 border-l border-black/5">
                              <small class="text-[8px] font-black tracking-[0.18em] text-black/40">{{ boardUiLabels.startShort }}</small>
                              <strong class="truncate text-[14px] font-black text-black/85">{{ formatCurrencyValue(getStrategyNodeMetrics(node)!.initialCapital) }}</strong>
                            </span>
                            <span class="flex min-w-0 flex-col px-1.5 border-l border-black/5">
                              <small class="text-[8px] font-black tracking-[0.18em] text-black/40">{{ boardUiLabels.endShort }}</small>
                              <strong class="truncate text-[14px] font-black" :class="getResultToneClass(getStrategyNodeMetrics(node)!.finalCapital - getStrategyNodeMetrics(node)!.initialCapital)">{{ formatCurrencyValue(getStrategyNodeMetrics(node)!.finalCapital) }}</strong>
                            </span>
                          </span>
                        </div>
                      </div>

                      <div v-else-if="node.type === 'trade'" class="w-full flex justify-center py-6">
                        <div class="flex min-w-[300px] max-w-[450px] w-full flex-col justify-center gap-4 text-left border border-black/10 bg-white p-6 shadow-sm">
                          <span class="text-[9px] font-black uppercase tracking-[0.3em] text-black/40 text-center">
                            {{ locale === 'ru' ? 'СДЕЛКА' : 'TRADE' }}
                          </span>
                          
                          <span class="flex w-full items-start justify-between gap-3 border-t border-black/5 pt-4">
                            <span class="flex min-w-0 flex-col">
                              <span class="max-w-full truncate text-2xl font-black uppercase tracking-widest text-black/80">
                                {{ getTradeNodeAssetLabel(node) }}
                              </span>
                              <span class="max-w-full truncate text-[10px] font-black uppercase tracking-[0.24em]" :class="getTradeNodeVectorClass(node)">
                                {{ getTradeNodeVector(node) }}
                              </span>
                            </span>
                            <span class="max-w-[45%] truncate text-right text-xl font-black uppercase tracking-[0.16em]" :class="getTradeNodeResultClass(node)">
                              {{ getTradeNodeResult(node) || '---' }}
                            </span>
                          </span>

                          <span class="grid w-full grid-cols-2 gap-2 text-center uppercase pt-2">
                            <span class="flex min-w-0 flex-col border-t border-black/5 px-1.5 py-2">
                              <small class="text-[8px] font-black tracking-[0.16em] text-black/40">{{ boardUiLabels.entryShort }}</small>
                              <strong class="truncate text-[14px] font-black text-black/80">{{ getTradeNodeEntryDate(node) }}</strong>
                            </span>
                            <span class="flex min-w-0 flex-col border-t border-l border-black/5 px-1.5 py-2">
                              <small class="text-[8px] font-black tracking-[0.16em] text-black/40">{{ boardUiLabels.exitShort }}</small>
                              <strong class="truncate text-[14px] font-black text-black/80">{{ getTradeNodeExitDate(node) }}</strong>
                            </span>
                          </span>
                        </div>
                      </div>

                      <!-- DRAWING -->
                      <div v-else-if="node.type === 'drawing'" class="w-full flex justify-center bg-white p-4 border border-black/10 shadow-sm relative" :style="{ minHeight: '100px' }">
                        <img v-if="(node as any).params?.preview"
                             :src="(node as any).params.preview"
                             alt="Drawing"
                             class="w-full h-auto max-h-[400px] object-contain pointer-events-none" />
                        <svg v-else
                             class="w-full h-auto max-h-[400px] pointer-events-none text-black"
                             viewBox="0 0 100 100"
                             preserveAspectRatio="xMidYMid meet">
                          <polyline v-for="(stroke, i) in (node as any).params?.strokes || []" :key="i"
                                    :points="stroke.points.map((p: any) => `${p.x},${p.y}`).join(' ')"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="1" />
                        </svg>
                      </div>

                      <!-- IMAGE -->
                      <div v-else-if="node.type === 'image'" class="w-full flex flex-col items-center gap-4">
                        <img :src="(node as any).src" class="max-w-full h-auto rounded-sm border border-black/10 shadow-sm object-contain max-h-[600px]" />
                        <p v-if="(node as any).caption" class="text-[10px] font-mono tracking-widest uppercase text-black/40 text-center">{{ (node as any).caption }}</p>
                      </div>
                    </div>

                    <!-- REORDER CONTROLS -->
                    <div class="absolute -right-16 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button class="w-8 h-8 flex items-center justify-center border border-black/20 bg-white shadow-sm hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              :disabled="index === 0"
                              @click="movePreviewNodeUp(index)">
                        <svg class="w-4 h-4 text-black/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M18 15l-6-6-6 6"/></svg>
                      </button>
                      <button class="w-8 h-8 flex items-center justify-center border border-black/20 bg-white shadow-sm hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              :disabled="index === previewNodes.length - 1"
                              @click="movePreviewNodeDown(index)">
                        <svg class="w-4 h-4 text-black/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M6 9l6 6 6-6"/></svg>
                      </button>
                    </div>

                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

      </Transition>

      <!-- PUBLISH CONFIRMATION MODAL -->
      <Transition name="fade">
        <div
          v-if="showPublishConfirmation && isCreatingArticle"
          data-board-chrome
          class="absolute inset-0 z-[99999] flex items-center justify-center bg-black/35 p-6 backdrop-blur-sm cursor-auto"
          @click.self="showPublishConfirmation = false"
          @pointerdown.stop
          @pointermove.stop
        >
          <div class="relative w-full max-w-[520px]" @click.stop>
            <ExPanel
              variant="light"
              :show-corners="false"
              :no-padding="true"
              :no-shadow="true"
              class="w-full overflow-hidden border-black/15 bg-[#fbfaf7] text-black"
            >
              <div class="px-8 pb-5 pt-7">
                <span class="block text-[10px] font-mono font-semibold uppercase tracking-[0.24em] text-black/35">
                  {{ boardUiLabels.publishConfirmKicker }}
                </span>
                <h3 class="mt-3 font-serif text-[28px] italic leading-tight text-black/90">
                  {{ isEditingArticle ? (locale === 'ru' ? 'Обновить статью?' : 'Update article?') : boardUiLabels.publishConfirmTitle }}
                </h3>
              </div>

              <div class="mx-8 border-y border-black/10 font-mono">
                <div class="grid grid-cols-[108px_1fr] items-baseline gap-6 py-4">
                  <span class="text-[10px] font-semibold tracking-[0.18em] text-black/40">
                    {{ boardUiLabels.articleTitleLabel }}
                  </span>
                  <strong class="min-w-0 break-words text-[15px] font-semibold leading-relaxed tracking-normal text-black/90">
                    {{ newArticleForm.title || boardUiLabels.untitled }}
                  </strong>
                </div>

                <div class="grid grid-cols-[108px_1fr] items-baseline gap-6 border-t border-black/10 py-4">
                  <span class="text-[10px] font-semibold tracking-[0.18em] text-black/40">
                    {{ boardUiLabels.articleCategoryLabel }}
                  </span>
                  <strong class="min-w-0 break-words text-[15px] font-semibold leading-relaxed tracking-normal text-black/90">
                    {{ selectedTypeLabel }}
                  </strong>
                </div>
              </div>

              <div class="flex flex-wrap justify-end gap-2 px-8 pb-7 pt-5">
                <button
                  class="border border-transparent px-5 py-2.5 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-black/45 transition-colors hover:border-black/10 hover:bg-black/[0.03] hover:text-black/70"
                  @click="showPublishConfirmation = false"
                >
                  {{ boardUiLabels.cancelPublish }}
                </button>
                <button
                  class="border border-black bg-black px-6 py-2.5 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-black/85"
                  :disabled="isPublishingArticle"
                  :class="isPublishingArticle ? 'cursor-wait opacity-60' : ''"
                  @click="confirmPublishArticle"
                >
                  {{ isPublishingArticle ? boardUiLabels.publishing : (isEditingArticle ? (locale === 'ru' ? 'Обновить' : 'Update') : boardUiLabels.confirmPublish) }}
                </button>
              </div>
            </ExPanel>
            <ExGothicCorners variant="light" :opacity="0.9" class="text-black" />
          </div>
        </div>
      </Transition>
    </div>

    <!-- JOURNAL VIEW: Front Page & Archive -->
    <div v-else class="relative isolate flex flex-col min-h-full overflow-visible px-4 md:px-6 xl:px-8" :key="`page-${currentPage}`">
      <div v-if="currentPage === 1" class="pointer-events-none absolute inset-x-0 -top-96 bottom-0 z-0 overflow-hidden">
        <img
          src="/assets/ui/eves.svg"
          alt=""
          aria-hidden="true"
          class="exforum-frontpage-bg-image absolute inset-y-0 left-0 h-full min-h-screen w-auto max-w-none select-none object-contain opacity-[0.06]"
        />
      </div>
      
      <!-- Masthead -->
      <header
        class="border-b-4 border-double border-current/20 flex flex-col items-center px-8 relative z-10"
        :class="currentPage === 1 ? 'pt-8 pb-4 space-y-4' : 'pt-3 pb-4'"
      >
        <template v-if="currentPage === 1">
          <div class="flex items-center justify-between w-full text-[8px] font-mono tracking-[0.6em] opacity-40 uppercase">
            <span>{{ journalLabels.volume }}</span>
            <span class="text-[10px] tracking-[1em] italic font-serif">{{ journalLabels.edition }}</span>
            <span>{{ journalLabels.datePrefix }} {{ formatJournalDate() }}</span>
          </div>

          <div class="relative flex w-full items-center justify-center overflow-visible px-14 py-6 md:px-20">
            <h1 class="cursor-pointer px-4 text-6xl font-serif italic tracking-tighter text-current opacity-90 text-center drop-shadow-sm" @click="navigateToPage(1)">
              The Eve's Apple
            </h1>
          </div>
        </template>

        <div class="journal-masthead-tools flex flex-wrap lg:flex-nowrap items-center justify-between w-full border-t border-current/10 pt-4 px-4 gap-4">
          <!-- Filters (Left) -->
          <div class="journal-filter-list flex items-center space-x-2 flex-1 justify-start">
            <button
              class="journal-filter-button !px-2"
              :class="{ 'is-active': activeJournalFilter === 'LIKED' }"
              type="button"
              @click="setJournalFilter('LIKED')"
            >
              <svg class="w-4 h-4" :class="activeJournalFilter === 'LIKED' ? 'fill-current' : 'fill-transparent'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"></path></svg>
            </button>
            <button
              class="journal-filter-button !px-2"
              :class="{ 'is-active': activeJournalFilter === 'BOOKMARKED' }"
              type="button"
              @click="setJournalFilter('BOOKMARKED')"
            >
              <svg class="w-4 h-4" :class="activeJournalFilter === 'BOOKMARKED' ? 'fill-current' : 'fill-transparent'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"></path></svg>
            </button>
            <div class="w-px h-4 bg-current/20 mx-1"></div>
            <button
              v-for="filter in journalFilters"
              :key="filter.mode"
              class="journal-filter-button"
              :class="{ 'is-active': activeJournalFilter === filter.mode }"
              type="button"
              @click="setJournalFilter(filter.mode)"
            >
              {{ filter.label }}
            </button>
          </div>

          <!-- Search Bar (Center) -->
          <div class="flex-1 flex justify-center">
            <label class="journal-search-shell group/search flex items-center gap-2" for="journal-search">
              <svg class="w-3.5 h-3.5 text-current/40 group-focus-within/search:text-current/80 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                id="journal-search"
                v-model="searchQuery"
                type="search"
                :placeholder="journalLabels.searchPlaceholder"
                class="journal-search-input"
              />
            </label>
          </div>

          <!-- Create Article Button (Right) -->
          <div class="flex-1 flex justify-end items-center gap-3">
            <button
              class="flex items-center space-x-2 px-4 py-2 border transition-all text-[9px] font-mono tracking-widest uppercase rounded-sm"
              :class="journalViewMode === 'mine' ? 'border-black bg-black text-white shadow-md' : 'border-current/20 text-current/70 hover:border-current/40 hover:bg-current/5 hover:text-current/90'"
              type="button"
              @click="toggleMyArticles"
            >
              <svg class="w-3.5 h-3.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5V5a2 2 0 0 1 2-2h11.5" />
                <path d="M8 7h8M8 11h8M8 15h5" />
                <path d="M18 3v18l-3-2-3 2V3" />
              </svg>
              <span>{{ locale === 'ru' ? 'МОИ СТАТЬИ' : 'MY ARTICLES' }}</span>
            </button>
            <button
              v-if="hasDraft && !isCreatingArticle"
              class="flex items-center space-x-2 px-4 py-2 mr-4 border border-black bg-black text-white hover:bg-black/80 transition-all text-[9px] font-mono tracking-widest uppercase rounded-sm shadow-md"
              @click="loadDraft"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              <span>{{ locale === 'ru' ? 'ПРОДОЛЖИТЬ ЧЕРНОВИК' : 'CONTINUE DRAFT' }}</span>
            </button>
            <button
              class="flex items-center space-x-2 px-4 py-2 border border-current/20 hover:border-current/40 hover:bg-current/5 transition-all text-[9px] font-mono tracking-widest uppercase rounded-sm text-current/70 hover:text-current/90"
              @click="isCreatingArticle ? cancelArticleEditing() : startCreateArticle()"
            >
              <svg v-if="!isCreatingArticle" class="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 5v14M5 12h14"></path>
              </svg>
              <svg v-else class="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6L6 18M6 6l12 12"></path>
              </svg>
              <span>{{ isCreatingArticle ? (locale === 'ru' ? 'Отмена' : 'Cancel') : (locale === 'ru' ? 'Создать статью' : 'Create Article') }}</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Main Journal Body -->
      <div class="flex-grow relative z-10 pb-0">
        
        <!-- Loading State -->
        <div v-if="forumStore.loading" class="flex flex-col items-center justify-center py-32 opacity-50 space-y-4">
          <svg class="w-8 h-8 animate-spin text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path stroke-linecap="round" stroke-linejoin="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
          </svg>
          <span class="text-[10px] font-mono tracking-[0.4em] uppercase">{{ locale === 'ru' ? 'Загрузка...' : 'Loading...' }}</span>
        </div>

        <!-- MY ARTICLES LIST -->
        <section v-else-if="journalViewMode === 'mine'" class="px-6 py-8 md:px-12">
          <div class="mx-auto flex max-w-5xl flex-col border-y border-current/15">
            <article
              v-for="thread in myArticleThreads"
              :key="thread.id"
              class="group grid grid-cols-[1fr_auto] items-center gap-6 border-b border-current/10 py-5 last:border-b-0"
            >
              <button class="min-w-0 text-left" type="button" @click="navigateToNode(thread.id)">
                <span class="mb-2 block font-mono text-[8px] uppercase tracking-[0.35em] text-current/35">
                  {{ thread.categoryLabel || thread.subcategory || getThreadMode(thread) }} // {{ formatArticleListDate(thread.publishedAt || thread.createdAt) }}
                </span>
                <strong class="block truncate font-serif text-2xl italic text-current/90">
                  {{ thread.title || boardUiLabels.untitled }}
                </strong>
                <span class="mt-2 block line-clamp-2 text-sm leading-relaxed text-current/55">
                  {{ getThreadDescription(thread) }}
                </span>
              </button>
              <button
                class="flex h-11 w-11 items-center justify-center border border-current/15 text-current/45 transition-all opacity-0 group-hover:opacity-100 hover:border-current/40 hover:bg-current/5 hover:text-current"
                type="button"
                @click="startEditArticle(thread)"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
              </button>
            </article>

            <div v-if="myArticleThreads.length === 0" class="flex flex-col items-center justify-center gap-4 py-24 text-center">
              <h2 class="font-serif text-3xl italic text-current/35">
                {{ locale === 'ru' ? 'У вас пока нет статей' : 'No articles yet' }}
              </h2>
              <button
                class="border border-current/20 px-6 py-3 font-mono text-[9px] uppercase tracking-[0.35em] text-current/60 transition-colors hover:bg-current/5 hover:text-current"
                type="button"
                @click="startCreateArticle"
              >
                {{ locale === 'ru' ? 'Создать статью' : 'Create article' }}
              </button>
            </div>
          </div>
        </section>

        <!-- DYNAMIC MAGAZINE LAYOUT -->
        <div v-else-if="pagedNodes.length > 0" class="flex flex-col">
          <!-- SECTION 1: Top Row (Lead Analysis + Signal Sidebar) -->
          <div class="grid grid-cols-12 border-b-[2px] border-solid border-current/20">
            <section
              v-if="pagedAnalysis.length > 0"
              class="journal-sector px-12 pb-12 pt-6"
              :class="[pagedSignals.length > 0 ? 'col-span-12 lg:col-span-8 lg:border-r-[2px] border-solid border-current/20' : 'col-span-12']"
            >
              <div class="flex flex-col space-y-12">
                <div class="flex items-center justify-between pb-4">
                  <div class="flex items-center space-x-3">
                    <div class="w-1.5 h-1.5 bg-current opacity-30 transform rotate-45"></div>
                    <h2 class="text-sm font-mono tracking-[0.4em] uppercase opacity-60">{{ journalLabels.analysis }}</h2>
                  </div>
                  <span v-if="currentPage > 1" class="text-[9px] font-mono opacity-20 uppercase tracking-widest">{{ journalLabels.editionPrefix }}{{ currentPage }}</span>
                </div>
                <ExJournalSpotlight v-if="pagedAnalysis[0]" :node="pagedAnalysis[0]" @click="navigateToNode(pagedAnalysis[0].id)" />
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                  <ExNodeCard v-for="node in pagedAnalysis.slice(1, 3)" :key="node.id" :node="node" />
                </div>
              </div>
            </section>
            
            <section
              v-if="pagedSignals.length > 0"
              class="journal-sector px-8 pb-8 pt-6"
              :class="[pagedAnalysis.length > 0 ? 'col-span-12 lg:col-span-4' : 'col-span-12']"
            >
              <div class="space-y-4">
                 <div class="flex items-center space-x-3 pb-2">
                   <div class="w-1 h-1 bg-current opacity-20"></div>
                   <h2 class="text-xs font-mono tracking-[0.3em] uppercase opacity-50">{{ journalLabels.signals }}</h2>
                </div>
                <div class="space-y-1">
                  <ExNodeCard
                    v-for="node in pagedSignals.slice(0, 4)"
                    :key="node.id"
                    :node="node"
                    class="journal-signal-card"
                  />
                </div>
              </div>
            </section>
          </div>

          <!-- SECTION 2: Middle Horizontal (Research) -->
          <section v-if="pagedResearch.length > 0" class="journal-sector p-12 border-b-[2px] border-solid border-current/20">
            <div class="flex flex-col space-y-12">
              <div class="flex items-center justify-between pb-4">
                <div class="flex items-center space-x-3">
                  <div class="w-1.5 h-1.5 bg-current opacity-30 transform rotate-45"></div>
                  <h2 class="text-sm font-mono tracking-[0.4em] uppercase opacity-60">{{ journalLabels.research }}</h2>
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                <ExNodeCard v-for="node in pagedResearch.slice(0, 3)" :key="node.id" :node="node" />
              </div>
            </div>
          </section>

          <!-- SECTION 3: Bottom Strip (Strategy) -->
          <section v-if="pagedStrategies.length > 0" class="journal-sector p-12">
            <div class="flex flex-col space-y-12">
              <div class="flex items-center justify-between pb-4">
                  <div class="flex items-center space-x-3">
                    <div class="w-1.5 h-1.5 bg-current opacity-30 transform rotate-45"></div>
                    <h2 class="text-sm font-mono tracking-[0.4em] uppercase opacity-60">{{ journalLabels.strategy }}</h2>
                  </div>
              </div>
              <div class="flex overflow-x-auto space-x-12 scroll-minimal pb-4">
                <div v-for="node in pagedStrategies.slice(0, 3)" :key="node.id" class="min-w-[400px]">
                  <ExNodeCard :node="node" class="!border-none" />
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- NO CONTENT WARNING: The Reification Void -->
        <div v-else class="flex flex-col items-center justify-center py-48 px-12 space-y-8 animate-pulse text-center">
            <div class="text-4xl font-serif italic tracking-tighter opacity-20">
               {{ journalLabels.emptyTitle }}
            </div>
            <div class="w-12 h-px bg-current opacity-10"></div>
            <p class="max-w-md text-[10px] font-mono tracking-[0.3em] uppercase opacity-30 leading-loose">
               {{ journalLabels.emptyDescription }}
            </p>
            <button @click="navigateToPage(1)" class="mt-8 text-[9px] font-mono tracking-[0.4em] uppercase border border-current/20 px-8 py-3 hover:bg-current/5 transition-all">
               {{ journalLabels.returnToOrigin }}
            </button>
        </div>

        <!-- Pagination Controls -->
        <div v-if="hasJournalPagination" class="p-12 flex flex-col items-center space-y-8 border-t border-current/10 mt-12">
           <div class="flex items-center space-x-12">
              <button v-if="currentPage > 1" @click="navigateToPage(currentPage - 1)" 
                      class="px-8 py-3 border border-current/10 text-[9px] font-mono tracking-[0.4em] uppercase opacity-40 hover:opacity-100 hover:bg-current/[0.02] transition-all">
                {{ journalLabels.previousPage }}
              </button>
              <button v-if="hasNextJournalPage" @click="navigateToPage(currentPage + 1)"
                      class="px-8 py-3 bg-zinc-800 text-white text-[9px] font-mono tracking-[0.4em] uppercase hover:shadow-[0_0_30px_rgba(var(--text-primary-rgb),0.1)] transition-all">
                {{ journalLabels.nextPage }} // {{ journalLabels.archivePrefix }}0{{ currentPage + 1 }} ]
              </button>
           </div>
           
           <div class="text-[7px] font-mono opacity-20 uppercase tracking-[0.8em]">{{ journalLabels.endOfArchive }}</div>
        </div>

        <!-- Journal Footer -->
        <footer class="py-4 text-center opacity-10 hover:opacity-100 transition-opacity duration-700">
          <div class="flex flex-col items-center space-y-4">
            <div class="text-[10px] font-serif italic tracking-widest text-current">{{ journalLabels.footerQuote }}</div>
            <div class="w-24 h-px bg-current/20 mx-auto text-current"></div>
            <div class="text-[7px] font-mono tracking-[0.8em] uppercase text-current">{{ journalLabels.footerBrand }}</div>
          </div>
        </footer>

      </div>
    </div>
    </Transition>

    <!-- NODE CONTEXT MENU Overlay -->
    <Teleport to="body">
      <Transition name="fade-slide">
        <div v-if="nodeContextMenu" 
             class="fixed z-[100000000] pointer-events-auto"
             :style="{ left: nodeContextMenu.x + 'px', top: nodeContextMenu.y + 'px' }"
             @pointerdown.stop
             @contextmenu.prevent.stop>
            
            <div class="flex flex-col space-y-1.5">
              <div class="w-2 h-2 bg-black rotate-45 absolute -left-1 -top-1 animate-pulse"></div>

              <div class="group relative pt-2">
                 <button @click="removeBoardNode(nodeContextMenu.nodeId)"
                         class="bg-white border border-red-500/30 px-6 py-3 min-w-[180px] text-left transition-all duration-500 hover:border-red-500 hover:bg-red-500/10 hover:translate-x-4 flex items-center justify-between relative overflow-hidden shadow-[10px_10px_0_rgba(0,0,0,0.1)] text-[#2c2c2a]">
                   <span class="text-[9px] font-mono tracking-[0.5em] uppercase font-black text-red-500 group-hover:text-red-400">{{ boardUiLabels.removeNode }}</span>
                   <span class="text-[7px] font-mono text-red-500 opacity-40">[DEL]</span>
                   <div class="absolute inset-y-0 left-0 w-0 bg-red-500 group-hover:w-1.5 transition-all duration-500"></div>
                 </button>
                 <div class="absolute -bottom-4 left-6 opacity-0 group-hover:opacity-40 transition-all duration-500 pointer-events-none">
                  <span class="text-[7px] font-mono uppercase tracking-[0.3em] text-red-500">{{ boardUiLabels.removeWarning }}</span>
                </div>
              </div>
            </div>
        </div>
      </Transition>
    </Teleport>

    <!-- BOTTOM TEXT EDITOR PANEL (Matrix Style) -->
      <Transition name="fade-slide">
        <div v-if="selectedBoardNodeId && selectedBoardNode?.type === 'text'"
             class="absolute bottom-8 left-1/2 -translate-x-1/2 z-[100000] flex flex-col items-center w-full max-w-3xl bg-white/90 backdrop-blur-md border border-black/10 shadow-[0_20px_40px_rgba(0,0,0,0.08)] pointer-events-auto text-[#2c2c2a] transition-colors duration-500"
             @pointerdown.stop
             @contextmenu.prevent.stop>
             
          <!-- Accent corners -->
          <div class="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-black opacity-30"></div>
          <div class="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-black opacity-30"></div>

          <!-- Content -->
          <div class="w-full flex justify-center py-4">
            <div class="flex flex-wrap items-center justify-center gap-4 px-4 w-full">
              <div class="flex items-center border border-black/10">
                <button @mousedown.stop.prevent="applyTextCommand('bold')"
                        class="h-9 w-11 flex items-center justify-center font-mono text-[13px] font-black opacity-60 hover:opacity-100 hover:bg-black/5 transition-all">B</button>
                <button @mousedown.stop.prevent="applyTextCommand('italic')"
                        class="h-9 w-11 border-l border-black/10 flex items-center justify-center font-serif italic text-[15px] opacity-60 hover:opacity-100 hover:bg-black/5 transition-all">I</button>
                <button @mousedown.stop.prevent="applyTextCommand('underline')"
                        class="h-9 w-11 border-l border-black/10 flex items-center justify-center font-mono text-[13px] underline opacity-60 hover:opacity-100 hover:bg-black/5 transition-all">U</button>
              </div>

              <div class="flex items-center border border-black/10">
                <button @mousedown.stop.prevent="applyTextCommand('insertUnorderedList')"
                        class="h-9 w-11 flex items-center justify-center font-mono text-[13px] font-black opacity-60 hover:opacity-100 hover:bg-black/5 transition-all">•</button>
                <button @mousedown.stop.prevent="applyTextBlock('quote')"
                        class="h-9 w-11 border-l border-black/10 flex items-center justify-center font-serif text-[18px] opacity-60 hover:opacity-100 hover:bg-black/5 transition-all">“</button>
              </div>

              <label class="h-9 w-11 border border-black/10 flex items-center justify-center cursor-pointer relative overflow-hidden hover:bg-black/5">
                <span class="w-5 h-5 border border-black/10"
                      :style="{ backgroundColor: activeTextColor }"></span>
                <input :value="activeTextColor === 'currentColor' ? '#ffffff' : activeTextColor"
                       type="color"
                       class="absolute inset-0 opacity-0 cursor-pointer"
                       @mousedown.stop
                       @input="applyTextColor($event)" />
              </label>
              <button @mousedown.stop.prevent="resetTextColor"
                      class="h-9 w-11 border border-black/10 flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/5 transition-all"
                      aria-label="Default text color">
                <span class="w-5 h-5 border border-black/10 bg-white relative">
                  <span class="absolute left-1/2 top-[-3px] h-[26px] w-px bg-red-500 rotate-45 origin-center"></span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
      <input type="file" ref="globalImageInput" class="hidden" accept="image/*" @change="handleGlobalImageUpload" />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useForumDrawing } from '../model/useForumDrawing'
import { useBoardDrawing } from '../model/useBoardDrawing'
import ExForumDrawingPanel from './ExForumDrawingPanel.vue'
import { useThemeStore } from '~/features/store/useTheme'
import { useForumStore } from '~/features/store/useForum'
import { useStrategyTradesStore } from '~/features/store/useStrategyTrades'
import { useI18n } from '~/shared/i18n/useI18n'
import { useAuthStore } from '~/entities/user/auth.store'
import allAssets from '~/shared/data/global_assets.json'
import type { Comment } from '~/entities/comment/types/comment.types'
import type { Reply } from '~/entities/reply/model/reply.types'
import { isReplyLikedByUser, toggleReplyLike } from '~/entities/reply/model/likesManagement'
import type { DiaryEntry } from '~/entities/diary/model/diary.types'
import type { ExNode, ExNodeMode, ExNodeSignal } from '~/entities/exnode/model/exnode.types'
import type { StrategyProfile } from '~/features/store/useStrategyTrades'
import type { Thread } from '~/entities/thread/model/thread.types'
import { normalizeUserProfileStatuses, type UserProfileStatus } from '~/entities/user/model/user-status.types'
import type { JournalArticle, JournalArticleBoard, JournalArticleBoardConnection, JournalArticleBoardNode, JournalArticleBoardPort } from '~/entities/journal-article/types/journal-article.types'
import ExUserStatusBadge from '~/entities/user/ui/ExUserStatusBadge.vue'
import ExNodeCard from '~/entities/exnode/ui/ExNodeCard.vue'
import ExJournalSpotlight from '~/widgets/exforum/ui/ExJournalSpotlight.vue'
import ExPanel from '~/shared/ui/ExPanel.vue'
import ExGothicCorners from '~/shared/ui/ExGothicCorners.vue'

const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const themeStore = useThemeStore()
const authStore = useAuthStore()
const forumStore = useForumStore()
const strategyTradesStore = useStrategyTradesStore()

// Archival State
const searchQuery = ref('')
const journalLabels = computed(() => locale.value === 'ru'
  ? {
      volume: 'Том XXIV // № 12',
      edition: 'Издание Реализации',
      datePrefix: 'Опубликовано',
      search: 'Поиск',
      searchPlaceholder: 'ПОИСК В АРХИВЕ',
      signals: 'Сигналы',
      research: 'Исследования',
      strategy: 'Стратегии',
      analysis: 'Аналитика',
      editionPrefix: 'Выпуск_0',
      emptyTitle: 'Пустота архива',
      emptyDescription: 'Внимание: вы достигли края индексированного архива. Для этой позиции нет тактических данных или публикаций.',
      returnToOrigin: '[ Вернуться_к_началу ]',
      previousPage: '[ ПРЕДЫДУЩАЯ_СТРАНИЦА ]',
      nextPage: '[ СЛЕДУЮЩАЯ_СТРАНИЦА',
      archivePrefix: 'АРХ_',
      endOfArchive: 'Конец индексированного архива',
      footerQuote: '"Знание реализовано. Ценность извлечена."',
      footerBrand: 'The Eve\'s Apple // Распределенный центр аналитики'
    }
  : {
      volume: 'Vol. XXIV // No. 12',
      edition: 'Reification Edition',
      datePrefix: 'Reified on',
      search: 'Search',
      searchPlaceholder: 'INDEX REIFICATION',
      signals: 'Signals',
      research: 'Research',
      strategy: 'Strategy',
      analysis: 'Analysis',
      editionPrefix: 'Edition_0',
      emptyTitle: 'The Reification Void',
      emptyDescription: 'Caution: You have reached the edge of the indexed registry. No tactical intelligence or archival nodes have been reified at this temporal coordinate.',
      returnToOrigin: '[ Return_to_Origin ]',
      previousPage: '[ PREV_PAGE ]',
      nextPage: '[ NEXT_PAGE',
      archivePrefix: 'ARV_',
      endOfArchive: 'End of Indexed Reification',
      footerQuote: '"Knowledge Reified. Value Extracted."',
      footerBrand: 'The Eve\'s Apple // Distributed Intel Hub'
    })
const journalFilters = computed(() => locale.value === 'ru'
  ? [
      { label: 'СИГНАЛЫ', mode: 'SETUP' },
      { label: 'ИССЛЕДОВАНИЯ', mode: 'RESEARCH' },
      { label: 'СТРАТЕГИИ', mode: 'LESSON' },
      { label: 'ВОПРОСЫ', mode: 'QUESTION' }
    ]
  : [
      { label: 'SIGNALS', mode: 'SETUP' },
      { label: 'RESEARCH', mode: 'RESEARCH' },
      { label: 'STRATEGY', mode: 'LESSON' },
      { label: 'QUESTIONS', mode: 'QUESTION' }
    ])
const activeJournalFilter = ref<string | null>(null)
const journalViewMode = ref<'journal' | 'mine'>('journal')
const isForumLightTheme = computed(() => !themeStore.settings.isDark)
const showForumEdgeShadows = computed(() => themeStore.settings.isDark)
const articleLabels = computed(() => locale.value === 'ru'
  ? {
      returnToJournal: 'Вернуться в журнал',
      fullscreenBoard: 'Полноэкранная доска статьи',
      metrics: 'Метрики статьи',
      board: 'Доска статьи',
      openBoard: 'Открыть доску',
      comments: 'Комментарии',
      published: 'Опубликовано',
      newComment: 'Новый комментарий',
      leaveComment: 'Оставить комментарий',
      signInRequired: 'Требуется войти',
      commentingAs: 'Автор комментария',
      writeComment: 'Напишите комментарий...',
      signInToComment: 'Войдите, чтобы оставить комментарий.',
      postComment: 'Опубликовать комментарий',
      like: 'Нравится',
      liked: 'Понравилось',
      likes: 'лайков',
      noComments: 'Комментариев пока нет',
      leaveFullscreen: 'Покинуть полноэкранный режим'
    }
  : {
      returnToJournal: 'Return to The Journal',
      fullscreenBoard: 'Fullscreen article board',
      metrics: 'Article metrics',
      board: 'Article board',
      openBoard: 'Open Board',
      comments: 'Comments',
      published: 'Published',
      newComment: 'New comment',
      leaveComment: 'Leave a comment',
      signInRequired: 'Sign in required',
      commentingAs: 'Commenting as',
      writeComment: 'Write a comment...',
      signInToComment: 'Sign in to join the discussion.',
      postComment: 'Post comment',
      like: 'Like',
      liked: 'Liked',
      likes: 'Likes',
      noComments: 'No comments yet.',
      leaveFullscreen: 'Leave fullscreen mode'
    })
const formatJournalDate = () => new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US').format(new Date())
const formatArticleListDate = (value: any) => new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
}).format(new Date(normalizeFirestoreDate(value)))
const fullscreenExitLabel = computed(() => articleLabels.value.leaveFullscreen)

const getMetricLabel = (label: string) => {
  if (locale.value !== 'ru') return label

  return {
    Likes: 'Лайки',
    Comments: 'Комментарии'
  }[label] || label
}

const journalModeValues = new Set<ExNodeMode>(['SETUP', 'RESEARCH', 'LESSON', 'QUESTION'])

const normalizeFirestoreDate = (value: any) => {
  if (!value) return new Date().toISOString()
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value?.toDate === 'function') return value.toDate().toISOString()
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000).toISOString()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

const getThreadMode = (thread: Thread & Record<string, any>): ExNodeMode => {
  const candidate = String(thread.journalMode || thread.articleType || thread.mode || thread.category || '').toUpperCase()
  return journalModeValues.has(candidate as ExNodeMode) ? candidate as ExNodeMode : 'RESEARCH'
}

const getThreadAuthorName = (thread: Thread & Record<string, any>) => {
  return thread.author
    || thread.authorData?.displayName
    || thread.user?.displayName
    || thread.userData?.displayName
    || 'Anonymous'
}

const getThreadDescription = (thread: Thread & Record<string, any>) => {
  const firstTextBlock = (thread.thesis?.blocks?.find((block: any) => block?.text) as any)?.text
  return thread.description || thread.summary || firstTextBlock || ''
}

const getThreadPublishedAt = (thread: Thread & Record<string, any>) => {
  return normalizeFirestoreDate(thread.publishedAt || thread.createdAt || thread.lastActivityAt)
}

const createFallbackArticleBoard = (thread: Thread & Record<string, any>): JournalArticleBoard => ({
  gridSize: 28,
  magnet: { enabled: true, mode: 'grid' },
  size: { width: 72, height: 44 },
  nodes: [
    {
      id: `${thread.id}-fallback-text`,
      type: 'text',
      title: thread.title || boardUiLabels.value.untitled,
      text: getThreadDescription(thread),
      position: { x: 4, y: 4 },
      size: { width: 24, height: 10 }
    }
  ],
  connections: [],
  strokes: []
})

const getThreadBoard = (thread: Thread & Record<string, any>): JournalArticleBoard => {
  const board = thread.board || thread.journalArticle?.board || thread.content?.board
  if (board?.nodes && Array.isArray(board.nodes)) {
    return {
      gridSize: board.gridSize || 28,
      magnet: board.magnet || { enabled: true, mode: 'grid' },
      size: board.size || { width: 72, height: 44 },
      nodes: board.nodes || [],
      connections: board.connections || [],
      strokes: board.strokes || []
    }
  }

  return createFallbackArticleBoard(thread)
}

const sortArticleTextBlocks = (blocks: any[]) => {
  return [...blocks].sort((a, b) => {
    const aOrder = Number.isFinite(Number(a?.order)) ? Number(a.order) : Number.POSITIVE_INFINITY
    const bOrder = Number.isFinite(Number(b?.order)) ? Number(b.order) : Number.POSITIVE_INFINITY
    if (aOrder !== bOrder) return aOrder - bOrder
    return 0
  })
}

const getThreadTextBlocks = (thread: Thread & Record<string, any>) => {
  const explicitBlocks = Array.isArray(thread.textBlocks)
    ? thread.textBlocks
    : Array.isArray(thread.articleTextBlocks)
      ? thread.articleTextBlocks
      : null

  if (explicitBlocks?.length) return sortArticleTextBlocks(explicitBlocks)

  const thesisBlocks = Array.isArray(thread.thesis?.blocks)
    ? thread.thesis.blocks
    : Array.isArray(thread.content?.thesis?.blocks)
      ? thread.content.thesis.blocks
      : Array.isArray(thread.content?.blocks)
        ? thread.content.blocks
        : null

  if (thesisBlocks?.length) return sortArticleTextBlocks(thesisBlocks)

  const board = getThreadBoard(thread)
  if (board.nodes.length) return sortArticleTextBlocks(board.nodes.map((node: any, index) => ({ ...node, order: index })))

  return []
}

const getThreadSignal = (thread: Thread & Record<string, any>): ExNodeSignal | undefined => {
  if (thread.signal) return thread.signal as ExNodeSignal
  if (getThreadMode(thread) !== 'SETUP') return undefined

  const board = getThreadBoard(thread)
  const assetNode = board.nodes.find((node: any) => node.type === 'asset') as any
  const currentNode = board.nodes.find((node: any) => node.type === 'price' && node.priceKind === 'current') as any
  const targetNode = board.nodes.find((node: any) => node.type === 'price' && node.priceKind === 'target') as any
  const entryPrice = parsePriceValue(currentNode?.value)
  const targetPrice = parsePriceValue(targetNode?.value)

  if (!assetNode?.asset || entryPrice === null || targetPrice === null) return undefined

  return {
    asset: assetNode.asset,
    entryPrice,
    targetPrice,
    direction: targetPrice >= entryPrice ? 'up' : 'down',
    description: getThreadDescription(thread),
    pricePrecision: Math.max(String(currentNode?.value || '').split('.')[1]?.length || 0, String(targetNode?.value || '').split('.')[1]?.length || 0)
  }
}

const threadToJournalNode = (thread: Thread & Record<string, any>): ExNode => {
  const mode = getThreadMode(thread)
  const description = getThreadDescription(thread)

  return {
    id: thread.id,
    mode,
    title: thread.title || boardUiLabels.value.untitled,
    author: getThreadAuthorName(thread),
    authorStatus: getSelectedAuthorStatus(thread.authorId),
    category: thread.categoryLabel || thread.subcategory || thread.category || mode,
    thesis_brief: description,
    tags: Array.isArray(thread.tags) ? thread.tags : [],
    likesCount: Number(thread.likesCount || 0),
    repliesCount: Number(thread.repliesCount || 0),
    lastActivityAt: getThreadPublishedAt(thread),
    signal: getThreadSignal(thread),
    metrics: Array.isArray(thread.metrics) ? thread.metrics : undefined,
    steps: Array.isArray(thread.steps) ? thread.steps : undefined,
    blocks: Array.isArray(thread.blocks) ? thread.blocks : undefined
  }
}

const threadToJournalArticle = (thread: Thread & Record<string, any>): JournalArticle => {
  const createdAt = getThreadPublishedAt(thread)
  const commentsCount = Number(thread.repliesCount || 0)
  const likesCount = Number(thread.likesCount || 0)
  const textBlocks = getThreadTextBlocks(thread)

  return {
    id: thread.id,
    sourceNodeId: thread.id,
    title: thread.title || boardUiLabels.value.untitled,
    subtitle: thread.categoryLabel || thread.subcategory || getThreadMode(thread),
    description: getThreadDescription(thread),
    category: thread.categoryLabel || thread.category || getThreadMode(thread),
    author: getThreadAuthorName(thread),
    publishedAt: createdAt,
    metrics: [
      { id: 'likes', label: 'Likes', value: likesCount },
      { id: 'comments', label: 'Comments', value: commentsCount }
    ],
    board: getThreadBoard(thread),
    boardBlocks: Array.isArray(thread.boardBlocks) ? thread.boardBlocks : [],
    thesis: {
      text: thread.thesis?.text || thread.content?.thesis?.text || thread.description || '',
      blocks: textBlocks
    },
    textBlocks
  }
}

// Pagination Logic
const currentPage = computed(() => Number(route.query.page) || 1)
const nodesPerPage = 12

const journalThreads = computed(() => {
  return Array.from(forumStore.threads.values()) as Array<Thread & Record<string, any>>
})
const myArticleThreads = computed(() => {
  const userId = authStore.user?.uid
  if (!userId) return []
  return journalThreads.value
    .filter(thread => thread.authorId === userId)
    .sort((a, b) => new Date(getThreadPublishedAt(b)).getTime() - new Date(getThreadPublishedAt(a)).getTime())
})
const journalNodes = computed(() => journalThreads.value
  .map(threadToJournalNode)
  .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()))

const filteredNodes = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return journalNodes.value.filter((n: ExNode) => {
    let matchesFilter = true
    if (activeJournalFilter.value === 'LIKED') {
      matchesFilter = forumStore.userLikedThreadIds.has(n.id)
    } else if (activeJournalFilter.value === 'BOOKMARKED') {
      matchesFilter = forumStore.userSavedThreadIds.has(n.id)
    } else if (activeJournalFilter.value) {
      matchesFilter = n.mode === activeJournalFilter.value
    }
    const matchesSearch = !q
      || n.title.toLowerCase().includes(q)
      || n.thesis_brief?.toLowerCase().includes(q)
      || n.category.toLowerCase().includes(q)
      || n.signal?.asset.toLowerCase().includes(q)
      || n.signal?.description.toLowerCase().includes(q)
    return matchesFilter && matchesSearch
  })
})

const pagedNodes = computed(() => {
  const start = (currentPage.value - 1) * nodesPerPage
  return filteredNodes.value.slice(start, start + nodesPerPage)
})
const totalJournalPages = computed(() => Math.ceil(filteredNodes.value.length / nodesPerPage))
const hasNextJournalPage = computed(() => currentPage.value < totalJournalPages.value)
const hasJournalPagination = computed(() => currentPage.value > 1 || hasNextJournalPage.value)

const pagedSignals = computed(() => pagedNodes.value.filter((n: any) => n.mode === 'SETUP'))
const pagedResearch = computed(() => pagedNodes.value.filter((n: any) => n.mode === 'RESEARCH'))
const pagedStrategies = computed(() => pagedNodes.value.filter((n: any) => n.mode === 'LESSON'))
const pagedAnalysis = computed(() => pagedNodes.value.filter((n: any) => n.mode === 'QUESTION'))

const navigateToPage = (page: number) => {
  const query = { ...route.query, page: page === 1 ? undefined : page.toString() }
  router.replace({ query })
}

const setJournalFilter = (mode: string) => {
  journalViewMode.value = 'journal'
  activeJournalFilter.value = activeJournalFilter.value === mode ? null : mode
  navigateToPage(1)
}

const toggleMyArticles = () => {
  journalViewMode.value = journalViewMode.value === 'mine' ? 'journal' : 'mine'
  if (journalViewMode.value === 'mine') {
    activeJournalFilter.value = null
    navigateToPage(1)
  }
}

// Reader Logic
const selectedNodeId = computed(() => route.query.nodeId as string | undefined)
const selectedNode = computed(() => journalNodes.value.find((n: ExNode) => n.id === selectedNodeId.value))
const selectedThread = computed(() => {
  if (!selectedNodeId.value) return undefined
  return journalThreads.value.find(thread => thread.id === selectedNodeId.value)
})

const articleViewMode = ref<'board' | 'text'>('board')

const selectedArticle = computed(() => {
  if (!selectedThread.value) return undefined
  return threadToJournalArticle(selectedThread.value)
})
const selectedArticleTextBlocks = computed(() => selectedArticle.value?.textBlocks || selectedArticle.value?.thesis?.blocks || [])
const comments = computed(() => {
  if (!selectedArticle.value) return []
  return forumStore.replies.get(selectedArticle.value.id) || []
})
function getSelectedAuthorStatus(authorId?: string): UserProfileStatus | null {
  if (!authorId) return null
  const user = forumStore.users.get(authorId)
  return normalizeUserProfileStatuses(user?.status).find((status) => status.isSelected) || null
}
const selectedArticleAuthorStatus = computed(() => getSelectedAuthorStatus(selectedThread.value?.authorId))
const forumAuthorIds = computed(() => {
  const authorIds = new Set<string>()
  journalThreads.value.forEach((thread) => {
    if (thread.authorId) authorIds.add(thread.authorId)
  })
  if (selectedThread.value?.authorId) authorIds.add(selectedThread.value.authorId)
  comments.value.forEach((comment) => {
    if (comment.authorId) authorIds.add(comment.authorId)
  })
  return [...authorIds]
})
const commentDraft = ref('')
const commentInputRef = ref<HTMLTextAreaElement | null>(null)
const isAuthenticated = computed(() => authStore.isAuthenticated)
const currentUserName = computed(() => authStore.user?.displayName?.trim() || authStore.user?.email?.trim() || 'Authenticated user')
const likedReplyIds = ref<Set<string>>(new Set())
const pendingReplyLikeIds = ref<Set<string>>(new Set())
let replyLikeLoadRequestId = 0
const articleComments = computed(() => {
  return comments.value
})

const isReplyLiked = (replyId: string) => likedReplyIds.value.has(replyId)
const isReplyLikePending = (replyId: string) => pendingReplyLikeIds.value.has(replyId)

const loadReplyLikeStates = async () => {
  const requestId = ++replyLikeLoadRequestId
  const userId = authStore.user?.uid
  const replyIds = comments.value
    .filter((reply) => reply.status !== 'hidden')
    .map((reply) => reply.id)

  if (!userId || !replyIds.length) {
    if (requestId === replyLikeLoadRequestId) likedReplyIds.value = new Set()
    return
  }

  const results = await Promise.all(replyIds.map(async (replyId) => {
    try {
      return (await isReplyLikedByUser(replyId, userId)) ? replyId : null
    } catch (error) {
      console.warn('[Forum] Failed to load reply like state:', error)
      return null
    }
  }))

  if (requestId !== replyLikeLoadRequestId || authStore.user?.uid !== userId) return
  likedReplyIds.value = new Set(results.filter((replyId): replyId is string => replyId !== null))
}

const toggleCommentLike = async (reply: Reply) => {
  const userId = authStore.user?.uid
  if (!userId || reply.status === 'hidden' || isReplyLikePending(reply.id)) return

  const wasLiked = isReplyLiked(reply.id)
  pendingReplyLikeIds.value = new Set(pendingReplyLikeIds.value).add(reply.id)

  try {
    const isLiked = await toggleReplyLike(reply.id, userId)
    const nextLikedReplyIds = new Set(likedReplyIds.value)
    if (isLiked) nextLikedReplyIds.add(reply.id)
    else nextLikedReplyIds.delete(reply.id)
    likedReplyIds.value = nextLikedReplyIds
    forumStore.updateReplyLikeState(reply.threadId, reply.id, isLiked, wasLiked)
  } catch (error) {
    console.error('[Forum] Failed to toggle reply like:', error)
  } finally {
    const nextPendingReplyLikeIds = new Set(pendingReplyLikeIds.value)
    nextPendingReplyLikeIds.delete(reply.id)
    pendingReplyLikeIds.value = nextPendingReplyLikeIds
  }
}

watch(forumAuthorIds, (authorIds) => {
  void Promise.all(authorIds.map((authorId) => forumStore.fetchUser(authorId)))
}, { immediate: true })

watch([
  () => authStore.user?.uid,
  () => comments.value.map((reply) => reply.id).join('|')
], () => {
  void loadReplyLikeStates()
}, { immediate: true })

type CommentNode = Reply & { children: CommentNode[] }

const nestedComments = computed(() => {
  const allComments = comments.value
  const map = new Map<string, CommentNode>()
  const roots: CommentNode[] = []

  allComments.forEach(c => map.set(c.id, { ...c, children: [] }))

  allComments.forEach(c => {
    const node = map.get(c.id)!
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  const getMs = (date: any) => {
    if (!date) return 0
    if (date.toMillis) return date.toMillis()
    if (date.seconds) return date.seconds * 1000
    return new Date(date).getTime()
  }

  const sortByDate = (a: CommentNode, b: CommentNode) => getMs(a.createdAt) - getMs(b.createdAt)

  roots.forEach((root: CommentNode) => {
    root.children.forEach((level2: CommentNode) => {
      const flattenedLevel3: CommentNode[] = []
      
      const extractLevel3 = (nodes: CommentNode[]) => {
        nodes.forEach(n => {
          flattenedLevel3.push(n)
          if (n.children.length > 0) {
            extractLevel3(n.children)
          }
        })
      }
      
      extractLevel3(level2.children)
      flattenedLevel3.sort(sortByDate)
      level2.children = flattenedLevel3
    })
    root.children.sort(sortByDate)
  })
  
  return roots
})

const replyingToId = ref<string | null>(null)
const expandedComments = ref<Set<string>>(new Set())

const toggleCommentExpand = (id: string) => {
  const newSet = new Set(expandedComments.value)
  if (newSet.has(id)) newSet.delete(id)
  else newSet.add(id)
  expandedComments.value = newSet
}

const toggleReplyForm = (id: string) => {
  if (replyingToId.value === id) {
    replyingToId.value = null
  } else {
    replyingToId.value = id
    commentDraft.value = ''
    nextTick(resizeCommentInput)
  }
}

const journalWrapperRef = ref<HTMLElement | null>(null)
const boardViewportRef = ref<HTMLElement | null>(null)
const boardStageRef = ref<HTMLElement | null>(null)
const boardWorldRef = ref<HTMLElement | null>(null)
const boardDrawingCanvasRef = ref<HTMLCanvasElement | null>(null)
const boardNodes = ref<JournalArticleBoardNode[]>([])
const boardConnections = ref<JournalArticleBoardConnection[]>([])
const boardStrokes = ref<any[]>([])
const boardPan = ref({ x: 48, y: 36 })
const boardScale = ref(1)
const boardScaleOptions = [25, 50, 75, 100, 150, 200]
const isBoardFullscreen = ref(false)
const boardFullscreenViewportStyle = ref<Record<string, string>>({})
const activeBoardWire = ref<{
  fromId: string
  fromPort: JournalArticleBoardPort
  originalToId?: string
  originalToPort?: JournalArticleBoardPort
  current: { x: number; y: number }
} | null>(null)
const passivePortRevealDistance = 96
const activeAssetNodeId = ref<string | null>(null)
const activeStrategyNodeId = ref<string | null>(null)
const activeTradeNodeId = ref<string | null>(null)
const expandedTradeStrategyId = ref<string | null>(null)
const assetSearch = ref('')
const assetTypeFilter = ref('ALL')
const failedAssetIcons = ref(new Set<string>())
const assetTypeLocales: Record<string, { en: string; ru: string }> = {
  ALL: { en: 'ALL', ru: 'ВСЕ' },
  'US Equities': { en: 'US Equities', ru: 'АКЦИИ' },
  Crypto: { en: 'Crypto', ru: 'КРИПТО' },
  Forex: { en: 'Forex', ru: 'ФОРЕКС' },
  Commodities: { en: 'Commodities', ru: 'СЫРЬЕ' },
  Indices: { en: 'Indices', ru: 'ИНДЕКСЫ' },
  Stocks: { en: 'Stocks', ru: 'АКЦИИ' }
}
const assetTypeOptions = ['ALL', 'US Equities', 'Crypto', 'Forex', 'Commodities', 'Indices']
const filteredAssets = computed(() => {
  const query = assetSearch.value.trim().toLowerCase()
  let assets = allAssets as any[]
  if (assetTypeFilter.value !== 'ALL') {
    assets = assets.filter(asset => String(asset.type || '').toUpperCase() === assetTypeFilter.value.toUpperCase())
  }
  if (!query) return assets.slice(0, 50)
  return assets
    .filter(asset => String(asset.symbol || '').toLowerCase().includes(query) || String(asset.name || '').toLowerCase().includes(query))
    .sort((a, b) => {
      const aSymbol = String(a.symbol || '').toUpperCase()
      const bSymbol = String(b.symbol || '').toUpperCase()
      const exact = assetSearch.value.trim().toUpperCase()
      if (aSymbol === exact) return -1
      if (bSymbol === exact) return 1
      if (aSymbol.startsWith(exact) && !bSymbol.startsWith(exact)) return -1
      if (!aSymbol.startsWith(exact) && bSymbol.startsWith(exact)) return 1
      return aSymbol.localeCompare(bSymbol)
    })
    .slice(0, 20)
})

// Article Creation State
const isCreatingArticle = ref(false)
const creationStep = ref<'metadata' | 'board' | 'preview'>('metadata')
const showPublishConfirmation = ref(false)
const editingArticleId = ref<string | null>(null)
const drawing = useForumDrawing()
const boardDrawing = useBoardDrawing()

const DRAFT_STORAGE_KEY = 'exforum_draft'
const hasDraft = ref(false)
if (typeof localStorage !== 'undefined') {
  hasDraft.value = !!localStorage.getItem(DRAFT_STORAGE_KEY)
}

const newArticleForm = ref({
  title: '',
  description: '',
  type: ''
})

const isEditingArticle = computed(() => !!editingArticleId.value)
const editingArticleThread = computed(() => {
  if (!editingArticleId.value) return null
  return journalThreads.value.find(thread => thread.id === editingArticleId.value) || null
})

const resetArticleEditorState = () => {
  stopBoardDrawingMode()
  showPublishConfirmation.value = false
  editingArticleId.value = null
  newArticleForm.value = { title: '', description: '', type: '' }
  boardNodes.value = []
  boardConnections.value = []
  boardStrokes.value = []
  previewNodeOrder.value = []
  creationStep.value = 'metadata'
}

const loadDraft = () => {
  const draftStr = localStorage.getItem(DRAFT_STORAGE_KEY)
  if (draftStr) {
    try {
      editingArticleId.value = null
      const draft = JSON.parse(draftStr)
      newArticleForm.value = draft.form
      boardNodes.value = draft.nodes
      boardConnections.value = draft.connections || []
      boardStrokes.value = draft.strokes || []
      creationStep.value = draft.step || 'metadata'
      hasDraft.value = true
      isCreatingArticle.value = true
    } catch(e) {}
  }
}

const clearDraft = () => {
  localStorage.removeItem(DRAFT_STORAGE_KEY)
  hasDraft.value = false
  resetArticleEditorState()
}

const saveDraftAndExit = () => {
  stopBoardDrawingMode()
  showPublishConfirmation.value = false
  isCreatingArticle.value = false
}

watch(isCreatingArticle, (newVal) => {
  if (!newVal) {
    stopBoardDrawingMode()
    showPublishConfirmation.value = false
    editingArticleId.value = null
    creationStep.value = 'metadata'
  }
})

watch(creationStep, (step) => {
  if (step !== 'board') {
    // The pencil hides the native cursor on <html> and <body>. Always restore
    // it when leaving the board, including the direct Back → metadata route.
    stopBoardDrawingMode()
    activeBoardTool.value = null
    activeBoardInteraction.value = null
    isSpacePressed.value = false
    return
  }

  if (step === 'board') {
    renderBoardDrawingCanvas()

    const idsToRemove = new Set<string>()
    boardNodes.value.forEach((n: any) => {
      const isSignalNode = n.type === 'asset' || (n.type === 'price' && (n.priceKind === 'current' || n.priceKind === 'target'))
      const isQuestionNode = n.type === 'text' && n.isQuestion

      if (!isSignalArticle.value && isSignalNode) idsToRemove.add(n.id)
      if (!isQuestionArticle.value && isQuestionNode) idsToRemove.add(n.id)
    })

    if (idsToRemove.size > 0) {
      boardNodes.value = boardNodes.value.filter((n: any) => !idsToRemove.has(n.id))
      boardConnections.value = boardConnections.value.filter((c: any) => !idsToRemove.has(c.sourceNodeId) && !idsToRemove.has(c.targetNodeId))
    }

    if (isSignalArticle.value) {
      const hasCurrentPrice = boardNodes.value.some((n: any) => n.type === 'price' && n.priceKind === 'current')
      const hasAsset = boardNodes.value.some((n: any) => n.type === 'asset')
      const hasTargetPrice = boardNodes.value.some((n: any) => n.type === 'price' && n.priceKind === 'target')

      if (!hasCurrentPrice) {
        boardNodes.value.push({
          id: `node_cp_${Date.now()}`,
          type: 'price',
          priceKind: 'current',
          value: '',
          position: { x: 2, y: 2 },
          size: { width: 8, height: 3 }
        } as any)
      }
      
      if (!hasAsset) {
        boardNodes.value.push({
          id: `node_asset_${Date.now()}`,
          type: 'asset',
          asset: '',
          position: { x: 11, y: 2 },
          size: { width: 9, height: 3 }
        } as any)
      }
      
      if (!hasTargetPrice) {
        boardNodes.value.push({
          id: `node_tp_${Date.now()}`,
          type: 'price',
          priceKind: 'target',
          value: '',
          position: { x: 21, y: 2 },
          size: { width: 8, height: 3 }
        } as any)
      }
    } else if (isQuestionArticle.value) {
      const hasQuestionNode = boardNodes.value.some((n: any) => n.type === 'text' && n.isQuestion)
      if (!hasQuestionNode) {
        boardNodes.value.push({
          id: `node_text_${Date.now()}`,
          type: 'text',
          isQuestion: true,
          title: '',
          text: '',
          position: { x: 2, y: 2 },
          size: { width: 12, height: 8 }
        } as any)
      }
    }
  }
})

let draftSaveTimer: number | null = null

const persistDraft = () => {
  if (isCreatingArticle.value && !isEditingArticle.value) {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
      form: newArticleForm.value,
      nodes: JSON.parse(JSON.stringify(boardNodes.value)),
      connections: JSON.parse(JSON.stringify(boardConnections.value)),
      strokes: JSON.parse(JSON.stringify(boardStrokes.value)),
      step: creationStep.value
    }))
    hasDraft.value = true
  }
}

watch([newArticleForm, boardNodes, boardConnections, boardStrokes, creationStep], () => {
  if (!isCreatingArticle.value || isEditingArticle.value) return
  if (draftSaveTimer) window.clearTimeout(draftSaveTimer)
  draftSaveTimer = window.setTimeout(persistDraft, 250)
}, { deep: true })

const isDropdownOpen = ref(false)
const isSubmittingArticle = ref(false)
const isPublishingArticle = ref(false)

const articleTypes = computed(() => journalFilters.value.map(filter => ({
  value: filter.mode,
  label: filter.label
})))
const isSignalArticle = computed(() => newArticleForm.value.type === 'SETUP')
const isQuestionArticle = computed(() => newArticleForm.value.type === 'QUESTION')

const selectedTypeLabel = computed(() => {
  const t = articleTypes.value.find(t => t.value === newArticleForm.value.type)
  return t ? t.label : ''
})

const selectArticleType = (type: string) => {
  newArticleForm.value.type = type
}

const isNewArticleFormValid = computed(() => {
  return newArticleForm.value.title.trim() !== '' &&
         newArticleForm.value.description.trim() !== '' &&
         newArticleForm.value.type !== ''
})

const startCreateArticle = () => {
  resetArticleEditorState()
  isCreatingArticle.value = true
}

const getArticleTextBlockOrder = (thread: Thread & Record<string, any>) => {
  if (Array.isArray(thread.textBlockOrder) && thread.textBlockOrder.length) return [...thread.textBlockOrder]

  const textBlocks = getThreadTextBlocks(thread)
  if (textBlocks.length) return textBlocks.map((block: any) => block.id).filter(Boolean)

  return getThreadBoard(thread).nodes.map(node => node.id)
}

const startEditArticle = (thread: Thread & Record<string, any>) => {
  if (!authStore.user || thread.authorId !== authStore.user.uid) return

  closeReader()
  resetArticleEditorState()
  editingArticleId.value = thread.id
  newArticleForm.value = {
    title: thread.title || '',
    description: thread.description || thread.summary || '',
    type: getThreadMode(thread)
  }

  const board = getThreadBoard(thread)
  boardNodes.value = cloneBoardNodes(board.nodes)
  boardConnections.value = board.connections ? JSON.parse(JSON.stringify(board.connections)) : []
  boardStrokes.value = board.strokes ? JSON.parse(JSON.stringify(board.strokes)) : []
  previewNodeOrder.value = getArticleTextBlockOrder(thread)
  isCreatingArticle.value = true
  creationStep.value = 'board'

  nextTick(() => {
    centerBoardOnMainNode()
    renderBoardDrawingCanvas()
  })
}

const cancelArticleEditing = () => {
  if (!isEditingArticle.value) {
    localStorage.removeItem(DRAFT_STORAGE_KEY)
    hasDraft.value = false
  }
  resetArticleEditorState()
  isCreatingArticle.value = false
}

const submitNewArticle = () => {
  if (!isNewArticleFormValid.value) return
  isSubmittingArticle.value = true
  
  // Animation duration matches the 700ms in CSS, user asked to not add actual saving logic yet
  setTimeout(() => {
    isSubmittingArticle.value = false
    creationStep.value = 'board'
  }, 1000)
}

const publishArticle = () => {
  if (isSignalArticle.value && !isSignalBoardValid.value) {
    alert(locale.value === 'ru' ? 'Заполните данные актива и обе цены перед публикацией сигнала.' : 'Fill out asset data and both prices before publishing a signal.')
    return
  }
  stopBoardDrawingMode()
  initializePreviewOrder()
  creationStep.value = 'preview'
}

const toSerializable = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
const ARTICLE_TEXT_BLOCK_SCHEMA_VERSION = 1

const stripBoardNodeEditorState = (node: any) => {
  if (!node) return null
  const { isEditing, ...rest } = node
  return rest
}

const createArticleTextBlockLabel = (node: any) => {
  if (node?.type === 'signal-header') return locale.value === 'ru' ? 'СИГНАЛ' : 'SIGNAL'
  if (node?.type === 'text' && node.isQuestion) return locale.value === 'ru' ? 'ВОПРОС' : 'QUESTION'
  if (node?.type === 'text') return locale.value === 'ru' ? 'ТЕКСТ' : 'TEXT'
  if (node?.type === 'price' && node.priceKind === 'current') return locale.value === 'ru' ? 'ТЕКУЩАЯ ЦЕНА' : 'CURRENT PRICE'
  if (node?.type === 'price' && node.priceKind === 'target') return locale.value === 'ru' ? 'ПРЕДПОЛАГАЕМАЯ ЦЕНА' : 'TARGET PRICE'
  if (node?.type === 'asset') return locale.value === 'ru' ? 'АКТИВ' : 'ASSET'
  if (node?.type === 'strategy') return locale.value === 'ru' ? 'СТРАТЕГИЯ' : 'STRATEGY'
  if (node?.type === 'trade') return locale.value === 'ru' ? 'СДЕЛКА' : 'TRADE'
  if (node?.type === 'drawing') return locale.value === 'ru' ? 'РИСУНОК' : 'DRAWING'
  if (node?.type === 'image') return locale.value === 'ru' ? 'ИЗОБРАЖЕНИЕ' : 'IMAGE'
  return locale.value === 'ru' ? 'БЛОК' : 'BLOCK'
}

const createArticleTextBlockFromNode = (node: any, order: number) => {
  const cleanNode = stripBoardNodeEditorState(node)
  if (!cleanNode) return null

  return {
    ...cleanNode,
    order,
    schemaVersion: ARTICLE_TEXT_BLOCK_SCHEMA_VERSION,
    sourceNodeId: cleanNode.id,
    label: createArticleTextBlockLabel(cleanNode),
    data: cleanNode
  }
}

const createSignalHeaderTextBlock = (board: JournalArticleBoard, order: number) => {
  const currentPrice = stripBoardNodeEditorState(board.nodes.find((node: any) => node.type === 'price' && node.priceKind === 'current'))
  const assetNode = stripBoardNodeEditorState(board.nodes.find((node: any) => node.type === 'asset'))
  const targetPrice = stripBoardNodeEditorState(board.nodes.find((node: any) => node.type === 'price' && node.priceKind === 'target'))

  return {
    id: 'signal-header',
    type: 'signal-header',
    order,
    schemaVersion: ARTICLE_TEXT_BLOCK_SCHEMA_VERSION,
    sourceNodeId: null,
    label: createArticleTextBlockLabel({ type: 'signal-header' }),
    currentPrice,
    assetNode,
    targetPrice,
    data: {
      currentPrice,
      assetNode,
      targetPrice
    },
    cp: currentPrice,
    asset: assetNode,
    tp: targetPrice
  }
}

const createArticleBoardSnapshot = (): JournalArticleBoard => {
  const nodes = toSerializable(boardNodes.value.map((node: any) => {
    const { isEditing, ...rest } = node
    return rest
  })) as JournalArticleBoardNode[]
  const connections = toSerializable(boardConnections.value) as JournalArticleBoardConnection[]
  const strokes = toSerializable(boardStrokes.value)
  const maxNodeX = nodes.reduce((max, node) => Math.max(max, node.position.x + node.size.width + 4), 72)
  const maxNodeY = nodes.reduce((max, node) => Math.max(max, node.position.y + node.size.height + 4), 44)

  return {
    gridSize: 28,
    magnet: { enabled: true, mode: 'grid' },
    size: { width: maxNodeX, height: maxNodeY },
    nodes,
    connections,
    strokes
  }
}

const createArticleContentBlocks = (board: JournalArticleBoard) => {
  const sourceBlocks = previewNodeOrder.value.length
    ? previewNodeOrder.value
        .map((id, index) => {
          if (id === 'signal-header' && isSignalArticle.value) return createSignalHeaderTextBlock(board, index)
          const node = board.nodes.find(item => item.id === id)
          return node ? createArticleTextBlockFromNode(node, index) : null
        })
        .filter(Boolean)
    : [...board.nodes]
        .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
        .map((node, index) => createArticleTextBlockFromNode(node, index))
        .filter(Boolean)

  const blocks = toSerializable(sourceBlocks) as any[]

  if (blocks.length === 0 && newArticleForm.value.description.trim()) {
    blocks.push({
      id: 'article-description',
      type: 'text',
      order: 0,
      schemaVersion: ARTICLE_TEXT_BLOCK_SCHEMA_VERSION,
      label: createArticleTextBlockLabel({ type: 'text' }),
      title: '',
      text: newArticleForm.value.description.trim(),
      data: {
        title: '',
        text: newArticleForm.value.description.trim()
      }
    })
  }

  return blocks
}

const createThreadPayloadFromArticle = () => {
  const user = authStore.user
  if (!user) return null

  const sourceThread = editingArticleThread.value
  const now = new Date().toISOString()
  const createdAt = sourceThread ? normalizeFirestoreDate(sourceThread.createdAt) : now
  const publishedAt = sourceThread ? normalizeFirestoreDate(sourceThread.publishedAt || sourceThread.createdAt) : now
  const board = createArticleBoardSnapshot()
  const textBlocks = createArticleContentBlocks(board)
  const textBlockOrder = textBlocks.map((block: any) => block.id).filter(Boolean)
  const thesis = {
    text: newArticleForm.value.description.trim(),
    blocks: textBlocks
  }
  const authorName = currentUserName.value
  const categoryMode = newArticleForm.value.type
  const categoryLabel = selectedTypeLabel.value
  const signal = getThreadSignal({
    id: 'pending',
    title: newArticleForm.value.title,
    description: newArticleForm.value.description,
    category: categoryMode,
    subcategory: categoryLabel,
    author: authorName,
    authorId: user.uid,
    createdAt,
    publishedAt,
    lastActivityAt: now,
    lastMeaningfulAt: now,
    repliesCount: sourceThread?.repliesCount || 0,
    status: 'active',
    thesis,
    board
  } as Thread & Record<string, any>)

  return {
    title: newArticleForm.value.title.trim(),
    description: newArticleForm.value.description.trim(),
    category: categoryMode,
    subcategory: categoryLabel,
    categoryLabel,
    journalMode: categoryMode,
    articleType: categoryMode,
    author: authorName,
    authorId: user.uid,
    authorData: sourceThread?.authorData || {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || user.email || null,
      avatarUrl: user.avatarUrl || null,
      photoURL: user.photoURL || null,
      type: user.type || 'common'
    },
    createdAt,
    publishedAt,
    updatedAt: now,
    lastActivityAt: now,
    lastMeaningfulAt: now,
    repliesCount: sourceThread?.repliesCount || 0,
    likesCount: sourceThread?.likesCount || 0,
    status: sourceThread?.status || 'active',
    thesis,
    summary: newArticleForm.value.description.trim(),
    board,
    boardNodes: board.nodes,
    boardConnections: board.connections,
    boardStrokes: board.strokes,
    textBlocks,
    textBlockOrder,
    content: {
      type: 'exforum-article-board',
      board,
      thesis,
      textBlocks,
      textBlockOrder
    },
    signal: signal || null,
    tags: []
  }
}

const confirmPublishArticle = async () => {
  if (isPublishingArticle.value) return
  if (isSignalArticle.value && !isSignalBoardValid.value) {
    showPublishConfirmation.value = false
    alert(locale.value === 'ru' ? 'Заполните данные актива и обе цены перед публикацией сигнала.' : 'Fill out asset data and both prices before publishing a signal.')
    return
  }

  const payload = createThreadPayloadFromArticle()
  if (!payload) {
    alert(locale.value === 'ru' ? 'Войдите в аккаунт, чтобы опубликовать статью.' : 'Sign in to publish an article.')
    return
  }

  isPublishingArticle.value = true

  try {
    const savedThread = isEditingArticle.value && editingArticleId.value
      ? await forumStore.updateThread(editingArticleId.value, payload as Partial<Thread> & Record<string, any>)
      : await forumStore.createThread(payload as Omit<Thread, 'id'> & Record<string, any>)

    showPublishConfirmation.value = false
    if (!isEditingArticle.value) {
      clearDraft()
    } else {
      resetArticleEditorState()
    }
    isCreatingArticle.value = false
    creationStep.value = 'metadata'
    navigateToNode(savedThread.id)
  } catch (error) {
    console.error('Failed to publish ExForum article:', error)
    alert(locale.value === 'ru' ? 'Не удалось опубликовать статью. Проверьте подключение и попробуйте снова.' : 'Could not publish the article. Check your connection and try again.')
  } finally {
    isPublishingArticle.value = false
  }
}

const previewNodeOrder = ref<string[]>([])

const initializePreviewOrder = () => {
  const nodes = [...boardNodes.value]
  const orderedIds: string[] = []
  
  if (isQuestionArticle.value) {
    const qNodeIdx = nodes.findIndex((n: any) => n.type === 'text' && n.isQuestion)
    if (qNodeIdx > -1) orderedIds.push(nodes.splice(qNodeIdx, 1)[0]!.id)
  }

  if (isSignalArticle.value) {
    const cpIdx = nodes.findIndex((n: any) => n.type === 'price' && n.priceKind === 'current')
    const aIdx = nodes.findIndex((n: any) => n.type === 'asset')
    const tpIdx = nodes.findIndex((n: any) => n.type === 'price' && n.priceKind === 'target')

    if (cpIdx > -1 || aIdx > -1 || tpIdx > -1) {
      if (!previewNodeOrder.value.includes('signal-header')) {
        orderedIds.push('signal-header')
      }
      
      const idsToRemove = [
        cpIdx > -1 ? nodes[cpIdx]!.id : null,
        aIdx > -1 ? nodes[aIdx]!.id : null,
        tpIdx > -1 ? nodes[tpIdx]!.id : null
      ].filter(Boolean)

      for (let i = nodes.length - 1; i >= 0; i--) {
        if (idsToRemove.includes(nodes[i]!.id)) {
          nodes.splice(i, 1)
        }
      }
    }
  }

  for (const id of previewNodeOrder.value) {
    if (id === 'signal-header' && isSignalArticle.value) {
      if (!orderedIds.includes('signal-header')) orderedIds.push('signal-header')
      continue
    }
    const idx = nodes.findIndex(n => n.id === id)
    if (idx > -1) {
      orderedIds.push(nodes.splice(idx, 1)[0]!.id)
    }
  }

  orderedIds.push(...nodes.filter((n: any) => n.type === 'text').map(n => n.id))
  orderedIds.push(...nodes.filter((n: any) => n.type === 'trade' || n.type === 'strategy').map(n => n.id))
  orderedIds.push(...nodes.filter((n: any) => n.type === 'drawing').map(n => n.id))
  orderedIds.push(...nodes.filter((n: any) => n.type === 'image').map(n => n.id))

  previewNodeOrder.value = orderedIds
}

const previewNodes = computed(() => {
  return previewNodeOrder.value
    .map(id => {
      if (id === 'signal-header') {
        return {
          id: 'signal-header',
          type: 'signal-header',
          cp: boardNodes.value.find((n: any) => n.type === 'price' && n.priceKind === 'current'),
          asset: boardNodes.value.find((n: any) => n.type === 'asset'),
          tp: boardNodes.value.find((n: any) => n.type === 'price' && n.priceKind === 'target')
        } as any
      }
      return boardNodes.value.find(n => n.id === id)
    })
    .filter(n => n !== undefined) as JournalArticleBoardNode[]
})

const movePreviewNodeUp = (index: number) => {
  if (index > 0) {
    const temp = previewNodeOrder.value[index - 1]!
    previewNodeOrder.value[index - 1] = previewNodeOrder.value[index]!
    previewNodeOrder.value[index] = temp
  }
}

const movePreviewNodeDown = (index: number) => {
  if (index < previewNodeOrder.value.length - 1) {
    const temp = previewNodeOrder.value[index + 1]!
    previewNodeOrder.value[index + 1] = previewNodeOrder.value[index]!
    previewNodeOrder.value[index] = temp
  }
}

// Node Context Menu Logic
const nodeContextMenu = ref<{ x: number, y: number, nodeId: string } | null>(null)

const handleNodeContextMenu = (e: MouseEvent, nodeId: string) => {
  if (isSignalArticle.value) {
    const node = boardNodes.value.find((n: any) => n.id === nodeId)
    if (node && (node.type === 'asset' || node.type === 'price')) {
      return
    }
  }

  if (isQuestionArticle.value) {
    const node = boardNodes.value.find((n: any) => n.id === nodeId)
    if (node && node.type === 'text' && node.isQuestion) {
      return
    }
  }
  
  nodeContextMenu.value = {
    x: e.clientX,
    y: e.clientY,
    nodeId
  }
}

const closeNodeContextMenu = () => {
  nodeContextMenu.value = null
}

const removeBoardNode = (nodeId: string) => {
  boardNodes.value = boardNodes.value.filter(n => n.id !== nodeId)
  boardConnections.value = boardConnections.value.filter(connection => connection.fromId !== nodeId && connection.toId !== nodeId)
  if (selectedBoardNodeId.value === nodeId) selectedBoardNodeId.value = null
  closeNodeContextMenu()
}

// Node Selection logic
const selectedBoardNodeId = ref<string | null>(null)
const selectedBoardNode = computed(() => boardNodes.value.find((n: any) => n.id === selectedBoardNodeId.value) || null)
const activeEditorField = ref<'title' | 'text' | null>(null)
const boardTextPlaceholder = computed(() => locale.value === 'ru' ? 'Введите текст...' : 'Enter text...')
const boardQuestionPlaceholder = computed(() => locale.value === 'ru' ? 'Задайте свой вопрос...' : 'Ask your question...')
const boardUiLabels = computed(() => locale.value === 'ru'
  ? {
      untitled: 'Без названия',
      uploadImage: 'Загрузить изображение',
      dblClickToDraw: 'Дважды кликните, чтобы рисовать',
      profitFactorShort: 'ПФ',
      winRateShort: 'ВИН',
      resultShort: 'РЕЗ',
      startShort: 'СТАРТ',
      endShort: 'ФИН',
      entryShort: 'ВХОД',
      exitShort: 'ВЫХОД',
      select: 'ВЫБОР',
      signalTool: 'СИГ',
      currentPriceTool: 'ТЦ',
      targetPriceTool: 'ПЦ',
      strategyTool: 'СТР',
      tradeTool: 'СДЛ',
      searchAssets: 'ПОИСК_АКТИВОВ...',
      noAssetsFound: 'АКТИВЫ НЕ НАЙДЕНЫ',
      noStrategiesFound: 'СТРАТЕГИИ НЕ НАЙДЕНЫ',
      noTradesFound: 'СДЕЛКИ НЕ НАЙДЕНЫ',
      noTradesInStrategy: 'В ЭТОЙ СТРАТЕГИИ НЕТ СДЕЛОК',
      removeNode: 'УДАЛИТЬ_УЗЕЛ',
      removeWarning: 'Внимание: безвозвратное удаление',
      publishConfirmKicker: 'ПОДТВЕРЖДЕНИЕ',
      publishConfirmTitle: 'Опубликовать статью?',
      articleTitleLabel: 'Название',
      articleCategoryLabel: 'Категория',
      cancelPublish: 'Отмена',
      confirmPublish: 'Опубликовать',
      publishing: 'Публикация...',
      assetFallback: 'АКТИВ',
      direction: 'Направление',
      asset: 'Актив',
      dates: 'Даты',
      duration: 'Длительность',
      result: 'Результат',
      currentPrice: 'Текущая',
      targetPrice: 'Прогноз',
      noAsset: 'БЕЗ АКТИВА',
      noStrategy: 'БЕЗ СТРАТЕГИИ',
      noTrade: 'БЕЗ СДЕЛКИ',
      selectTrade: 'ВЫБЕРИТЕ СДЕЛКУ',
      long: 'ЛОНГ',
      short: 'ШОРТ'
    }
  : {
      untitled: 'Untitled',
      uploadImage: 'Upload image',
      dblClickToDraw: 'Dbl-click to draw',
      profitFactorShort: 'PF',
      winRateShort: 'WR',
      resultShort: 'RES',
      startShort: 'START',
      endShort: 'END',
      entryShort: 'ENTRY',
      exitShort: 'EXIT',
      select: 'SELECT',
      signalTool: 'SIG',
      currentPriceTool: 'CP',
      targetPriceTool: 'TP',
      strategyTool: 'STR',
      tradeTool: 'TRD',
      searchAssets: 'SEARCH_ASSETS...',
      noAssetsFound: 'NO_ASSETS_FOUND',
      noStrategiesFound: 'NO_STRATEGIES_FOUND',
      noTradesFound: 'NO_TRADES_FOUND',
      noTradesInStrategy: 'NO TRADES IN THIS STRATEGY',
      removeNode: 'REMOVE_NODE',
      removeWarning: 'Warning: Permanent_Archive_Erasure',
      publishConfirmKicker: 'CONFIRMATION',
      publishConfirmTitle: 'Publish article?',
      articleTitleLabel: 'Title',
      articleCategoryLabel: 'Category',
      cancelPublish: 'Cancel',
      confirmPublish: 'Publish',
      publishing: 'Publishing...',
      assetFallback: 'ASSET',
      direction: 'Direction',
      asset: 'Asset',
      dates: 'Dates',
      duration: 'Duration',
      result: 'Result',
      currentPrice: 'Current',
      targetPrice: 'Target',
      noAsset: 'NO ASSET',
      noStrategy: 'NO STRATEGY',
      noTrade: 'NO TRADE',
      selectTrade: 'SELECT TRADE',
      long: 'LONG',
      short: 'SHORT'
    })

const getPlainEditorText = (value: string) => {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

const isTextNodeTitleEmpty = (node: any) => {
  return node?.type === 'text' && getPlainEditorText(node.title || '') === ''
}

const isTextNodeBodyEmpty = (node: any) => {
  return node?.type === 'text' && getPlainEditorText(node.text || '') === ''
}

// --- Text Formatting Logic ---
const activeTextColor = ref('currentColor')
const textEditorRefs = ref<Record<string, HTMLElement>>({})
const titleEditorRefs = ref<Record<string, HTMLElement>>({})

const setTitleEditorRef = (el: any, id: string) => {
  if (el) {
    titleEditorRefs.value[id] = el
    const node = boardNodes.value.find(n => n.id === id)
    const nodeTitle = (node?.type === 'text' ? node.title : '') || ''
    if (el.innerHTML !== nodeTitle) {
      el.innerHTML = nodeTitle
    }
  }
}

const updateNodeTitle = (event: Event, node: any) => {
  if (node.type === 'text') {
    const editor = event.target as HTMLElement
    node.title = getPlainEditorText(editor.innerHTML) === '' ? '' : editor.innerHTML
    if (node.title === '' && editor.innerHTML !== '') editor.innerHTML = ''
  }
}

const setTextEditorRef = (el: any, id: string) => {
  if (el) {
    textEditorRefs.value[id] = el
    const node = boardNodes.value.find(n => n.id === id)
    const nodeText = (node?.type === 'text' ? node.text : '') || ''
    if (el.innerHTML !== nodeText) {
      el.innerHTML = nodeText
    }
  }
}

const updateNodeText = (event: Event, node: any) => {
  node.text = (event.target as HTMLElement).innerHTML
}

function getActiveTextEditor() {
  if (!selectedBoardNodeId.value) return null
  if (activeEditorField.value === 'title') {
    return document.querySelector(`[data-title-node-id="${selectedBoardNodeId.value}"]`) as HTMLElement | null
  } else {
    return document.querySelector(`[data-text-node-id="${selectedBoardNodeId.value}"]`) as HTMLElement | null
  }
}

const savedTextSelection = ref<Range | null>(null)

function saveTextSelection() {
  const selection = window.getSelection()
  if (!selection?.rangeCount) return
  const range = selection.getRangeAt(0)
  const editor = getActiveTextEditor()
  if (!editor || !editor.contains(range.commonAncestorContainer)) return
  savedTextSelection.value = range.cloneRange()
}

function restoreTextSelection() {
  const editor = getActiveTextEditor()
  if (!editor) return
  editor.focus()
  const selection = window.getSelection()
  if (!selection) return
  selection.removeAllRanges()
  if (savedTextSelection.value) {
    selection.addRange(savedTextSelection.value)
  }
}

function syncActiveTextHtml() {
  const node = selectedBoardNode.value
  const editor = getActiveTextEditor()
  if (!node || !editor) return
  if (node.type === 'text') {
    if (activeEditorField.value === 'title') {
      node.title = editor.innerHTML
    } else {
      node.text = editor.innerHTML
    }
  }
}

function applyTextCommand(command: string, value?: string) {
  if (!selectedBoardNode.value) return
  restoreTextSelection()
  document.execCommand('styleWithCSS', false, 'true')
  document.execCommand(command, false, value)
  syncActiveTextHtml()
  saveTextSelection()
}

function applyTextBlock(preset: string) {
  if (preset === 'quote') {
    applyTextCommand('formatBlock', 'blockquote')
  }
}

function applyTextColor(event?: Event) {
  activeTextColor.value = (event?.target as HTMLInputElement | undefined)?.value || activeTextColor.value
  applyTextCommand('foreColor', activeTextColor.value)
}

function resetTextColor() {
  activeTextColor.value = 'currentColor'
  applyTextCommand('foreColor', '#000000')
}

onMounted(() => {
  void forumStore.fetchThreadList(100, 'createdAt').catch((error) => {
    console.error('Failed to load ExForum threads:', error)
  })
  void strategyTradesStore.init()
  window.addEventListener('pointerdown', closeNodeContextMenu)
  document.addEventListener('selectionchange', saveTextSelection)
  window.addEventListener('keydown', handleSpaceDown)
  window.addEventListener('keyup', handleSpaceUp)
})

onUnmounted(() => {
  window.removeEventListener('pointerdown', closeNodeContextMenu)
  document.removeEventListener('selectionchange', saveTextSelection)
  window.removeEventListener('keydown', handleSpaceDown)
  window.removeEventListener('keyup', handleSpaceUp)
})

watch(() => authStore.user, (user) => {
  if (user) {
    forumStore.fetchUserInteractions(user.uid)
  }
}, { immediate: true })

// v-click-outside directive logic setup inside component (or via vueuse if available, 
// but since we are in a single file, a simple window event listener is better for the dropdown, 
// but we'll use a standard workaround if v-click-outside isn't registered globally. Let's assume it might not be. 
// Wait, I used v-click-outside in the template, I should replace it with a simple @click.away or similar if it's not available.
// Actually VueUse `onClickOutside` is safer. Let's just use a transparent overlay for the dropdown instead to be safe.)

type BoardInteraction = 
  | { type: 'pan'; startClientX: number; startClientY: number; startPanX: number; startPanY: number }
  | { type: 'moveNode'; node: any; startClientX: number; startClientY: number; startNodeX: number; startNodeY: number }
  | { type: 'resizeNode'; node: any; startClientX: number; startClientY: number; startNodeW: number; startNodeH: number }

const activeBoardInteraction = ref<BoardInteraction | null>(null)
const activeBoardTool = ref<'text' | 'image' | 'drawing' | 'pencil' | 'asset-node' | 'current-price' | 'target-price' | 'strategy-node' | 'trade-node' | null>(null)

watch(activeBoardTool, (tool, previousTool) => {
  if (previousTool === 'pencil' && tool !== 'pencil') {
    stopBoardDrawingMode()
  }

  if (tool === 'pencil') {
    selectedBoardNodeId.value = null
    activeEditorField.value = null
    closeNodeContextMenu()
    window.getSelection()?.removeAllRanges()
  }
})

watch(() => newArticleForm.value.type, (type) => {
  if (type !== 'SETUP' && (activeBoardTool.value === 'asset-node' || activeBoardTool.value === 'current-price' || activeBoardTool.value === 'target-price')) {
    activeBoardTool.value = null
  }
  if (type === 'SETUP' && (activeBoardTool.value === 'strategy-node' || activeBoardTool.value === 'trade-node')) {
    activeBoardTool.value = null
  }
})

const globalImageInput = ref<HTMLInputElement | null>(null)
let imageUploadTargetNodeId: string | null = null

const triggerImageUpload = (nodeId: string) => {
  imageUploadTargetNodeId = nodeId
  globalImageInput.value?.click()
}

const handleGlobalImageUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !imageUploadTargetNodeId) return

  const targetId = imageUploadTargetNodeId

  const reader = new FileReader()
  reader.onload = (re) => {
    const url = re.target?.result as string
    const node = boardNodes.value.find((n: any) => n.id === targetId)
    if (node && node.type === 'image') {
      node.src = url
      const img = new Image()
      img.onload = () => {
        const aspect = img.width / img.height
        node.size.height = Math.max(1, Math.round(node.size.width / aspect))
      }
      img.src = url
    }
  }
  reader.readAsDataURL(file)
  
  if (globalImageInput.value) {
    globalImageInput.value.value = ''
  }
  imageUploadTargetNodeId = null
}
const boardPointerPos = ref({ x: 0, y: 0 })
const boardGridSize = computed(() => selectedArticle.value?.board.gridSize || 28)
const boardRenderScale = computed(() => isBoardFullscreen.value ? boardScale.value : 1)
const boardRenderGridSize = computed(() => boardGridSize.value * boardRenderScale.value)
const boardUnitSize = computed(() => selectedArticle.value?.board.size || { width: 72, height: 44 })
const boardBaseWorldSize = computed(() => ({
  width: boardUnitSize.value.width * boardRenderGridSize.value,
  height: boardUnitSize.value.height * boardRenderGridSize.value
}))
const boardWorldStyle = computed(() => ({
  width: `${boardBaseWorldSize.value.width}px`,
  height: `${boardBaseWorldSize.value.height}px`
}))
const boardTransformStyle = computed(() => ({
  transform: `translate3d(${boardPan.value.x}px, ${boardPan.value.y}px, 0)`,
  willChange: 'transform'
}))
const boardPreviewTransformStyle = computed(() => ({
  transform: `translate(${boardPan.value.x}px, ${boardPan.value.y}px) scale(0.82)`
}))

const cloneBoardNodes = (nodes: JournalArticleBoardNode[]) => JSON.parse(JSON.stringify(nodes || [])) as JournalArticleBoardNode[]

const resizeCommentInput = () => {
  const input = commentInputRef.value
  if (!input) return

  input.style.height = 'auto'
  const maxHeight = 220
  input.style.height = `${Math.min(input.scrollHeight, maxHeight)}px`
  input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden'
}

const centerBoardOnMainNode = (isFullScreen = false) => {
  if (!boardNodes.value || boardNodes.value.length === 0) {
    boardPan.value = { x: 48, y: 36 }
    return
  }
  let mainNode = boardNodes.value.find((n: any) => n.type === 'asset' || (n.type === 'text' && n.isQuestion))
  if (!mainNode) mainNode = boardNodes.value[0]
  if (!mainNode) return
  
  const grid = boardGridSize.value
  const nodeCenterX = (mainNode.position.x + (mainNode.size.width / 2)) * grid
  const nodeCenterY = (mainNode.position.y + (mainNode.size.height / 2)) * grid
  
  const viewportRect = isFullScreen ? getArticleBoardViewportRect() : null
  const vWidth = viewportRect?.width ?? (typeof window !== 'undefined' ? window.innerWidth : 1200)
  const vHeight = viewportRect?.height ?? (typeof window !== 'undefined' ? (isFullScreen ? window.innerHeight : window.innerHeight * 0.68) : 800)
  const scale = isFullScreen ? boardScale.value : 0.82
  
  boardPan.value = {
    x: (vWidth / 2) - (nodeCenterX * scale),
    y: (vHeight / 2.5) - (nodeCenterY * scale)
  }
}

const getArticleBoardViewportRect = () => {
  return boardViewportRef.value?.getBoundingClientRect() || journalWrapperRef.value?.getBoundingClientRect() || null
}

const setArticleBoardScale = (nextScale: number) => {
  const scale = Math.max(0.25, Math.min(2, nextScale))
  if (!Number.isFinite(scale) || scale === boardScale.value) return

  const rect = getArticleBoardViewportRect()
  if (!rect) {
    boardScale.value = scale
    return
  }

  const oldScale = boardScale.value || 1
  const screenCenter = {
    x: rect.width / 2,
    y: rect.height / 2
  }
  const worldCenter = {
    x: (screenCenter.x - boardPan.value.x) / oldScale,
    y: (screenCenter.y - boardPan.value.y) / oldScale
  }

  boardScale.value = scale
  boardPan.value = {
    x: screenCenter.x - worldCenter.x * scale,
    y: screenCenter.y - worldCenter.y * scale
  }
}

const resetArticleBoardFullscreenView = () => {
  centerBoardOnMainNode(true)
}

const isLiked = ref(false)
const isBookmarked = ref(false)
const isArticleLikePending = ref(false)
let articleInteractionLoadRequestId = 0

const toggleLike = async () => {
  const userId = authStore.user?.uid
  const articleId = selectedArticle.value?.id
  if (!userId || !articleId || isArticleLikePending.value) return

  const operationId = ++articleInteractionLoadRequestId
  isArticleLikePending.value = true

  try {
    const result = await forumStore.toggleThreadLike(userId, articleId)
    if (selectedArticle.value?.id === articleId) {
      isLiked.value = result.isLiked
    }
  } catch (error) {
    console.error('[Forum] Failed to toggle thread like:', error)
  } finally {
    if (operationId === articleInteractionLoadRequestId) {
      isArticleLikePending.value = false
    }
  }
}

const toggleBookmark = async () => {
  if (!authStore.user || !selectedArticle.value) return
  isBookmarked.value = !isBookmarked.value
  try {
    await forumStore.toggleThreadSave(authStore.user.uid, selectedArticle.value.id, isBookmarked.value)
  } catch (error) {
    isBookmarked.value = !isBookmarked.value // revert
  }
}

watch([
  () => selectedArticle.value?.id,
  () => authStore.user?.uid
], async ([articleId, userId]) => {
  const requestId = ++articleInteractionLoadRequestId
  isArticleLikePending.value = false
  const article = selectedArticle.value
  boardNodes.value = article ? cloneBoardNodes(article.board.nodes) : []
  boardConnections.value = article?.board.connections ? JSON.parse(JSON.stringify(article.board.connections)) : []
  boardStrokes.value = article?.board.strokes ? JSON.parse(JSON.stringify(article.board.strokes)) : []
  commentDraft.value = ''
  isLiked.value = false
  isBookmarked.value = false

  if (article) {
    forumStore.fetchReplies(article.id) // Fetch replies from Firestore
  }

  if (article && userId) {
    const [liked, saved] = await Promise.all([
      forumStore.isThreadLiked(userId, article.id),
      forumStore.isThreadSaved(userId, article.id)
    ])
    if (requestId === articleInteractionLoadRequestId && selectedArticle.value?.id === articleId && authStore.user?.uid === userId) {
      isLiked.value = liked
      isBookmarked.value = saved
    }
  }

  nextTick(() => {
    resizeCommentInput()
    centerBoardOnMainNode()
  })
}, { immediate: true })

const submitComment = async (parentId?: string) => {
  const article = selectedArticle.value
  const user = authStore.user
  const text = commentDraft.value.trim()

  if (!article || !user || !text) return

  const replyData: any = {
    authorId: user.uid,
    author: currentUserName.value,
    status: 'published' as any,
    type: 'extension' as any,
    meaningful: true,
    likes: 0,
    content: {
      text,
      blocks: []
    }
  }

  if (parentId) {
    replyData.parentId = parentId
  }

  try {
    await forumStore.createReply(article.id, replyData)
    commentDraft.value = ''
    if (parentId) {
      replyingToId.value = null
      expandedComments.value.add(parentId)
    }
    nextTick(resizeCommentInput)
  } catch (error) {
    console.error(error)
  }
}

const deleteComment = async (reply: any) => {
  if (reply.authorId !== authStore.user?.uid) return
  await forumStore.softDeleteReply(reply)
}

const closeReader = () => {
  closeBoardFullscreen()
  const query = { ...route.query }
  delete query.nodeId
  router.replace({ query })
}

const syncBoardFullscreenViewport = () => {
  const wrapper = journalWrapperRef.value
  if (!wrapper) return

  const rect = wrapper.getBoundingClientRect()
  boardFullscreenViewportStyle.value = {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`
  }
}

const openBoardFullscreen = () => {
  isBoardFullscreen.value = true
  syncBoardFullscreenViewport()
  centerBoardOnMainNode(true)
}

const closeBoardFullscreen = () => {
  isBoardFullscreen.value = false
  stopBoardInteraction()
  centerBoardOnMainNode(false)
}

const navigateToNode = (id: string) => {
  router.replace({
    query: {
      ...route.query,
      nodeId: id
    }
  })
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const scaledBoardNumber = (value: number, min = 1) => Math.max(min, value * boardRenderScale.value)
const scaledBoardPx = (value: number, min = 1) => `${scaledBoardNumber(value, min)}px`

const getBoardTextShellStyle = () => ({
  gap: scaledBoardPx(12),
  padding: scaledBoardPx(16)
})

const getBoardTextTitleStyle = () => ({
  fontSize: scaledBoardPx(20),
  lineHeight: scaledBoardPx(20)
})

const getBoardTextBodyStyle = (node: JournalArticleBoardNode) => ({
  fontSize: scaledBoardPx((node as any).isQuestion ? 30 : 14),
  lineHeight: scaledBoardPx((node as any).isQuestion ? 36 : 22)
})

const getBoardCaptionStyle = () => ({
  padding: `${scaledBoardPx(8)} ${scaledBoardPx(12)}`,
  fontSize: scaledBoardPx(8),
  lineHeight: scaledBoardPx(12)
})

const getBoardPriceShellStyle = () => ({
  paddingLeft: scaledBoardPx(12),
  paddingRight: scaledBoardPx(12)
})

const getBoardPriceLabelStyle = () => ({
  marginBottom: scaledBoardPx(4),
  fontSize: scaledBoardPx(8),
  lineHeight: scaledBoardPx(10)
})

const getBoardPriceValueStyle = () => ({
  fontSize: scaledBoardPx(20),
  lineHeight: scaledBoardPx(20)
})

const getBoardAssetShellStyle = () => ({
  paddingLeft: scaledBoardPx(12),
  paddingRight: scaledBoardPx(12)
})

const getBoardAssetInnerStyle = () => ({
  gap: scaledBoardPx(4)
})

const getBoardAssetLabelStyle = () => ({
  fontSize: scaledBoardPx(18),
  lineHeight: scaledBoardPx(22)
})

const getBoardAssetTypeStyle = () => ({
  fontSize: scaledBoardPx(8),
  lineHeight: scaledBoardPx(10)
})

const getBoardDataShellStyle = (gap: number, paddingX: number) => ({
  gap: scaledBoardPx(gap),
  paddingLeft: scaledBoardPx(paddingX),
  paddingRight: scaledBoardPx(paddingX)
})

const getBoardDataGridStyle = (gap: number) => ({
  gap: scaledBoardPx(gap)
})

const getBoardDataCellStyle = (paddingX: number, paddingY: number) => ({
  padding: `${scaledBoardPx(paddingY)} ${scaledBoardPx(paddingX)}`
})

const getBoardDataTitleStyle = (fontSize: number) => ({
  fontSize: scaledBoardPx(fontSize),
  lineHeight: scaledBoardPx(fontSize + 4)
})

const getBoardDataLabelStyle = (fontSize: number) => ({
  fontSize: scaledBoardPx(fontSize),
  lineHeight: scaledBoardPx(fontSize + 3)
})

const getBoardDataValueStyle = (fontSize: number) => ({
  fontSize: scaledBoardPx(fontSize),
  lineHeight: scaledBoardPx(fontSize + 3)
})

const getBoardNodeStyle = (node: JournalArticleBoardNode) => ({
  left: `${node.position.x * boardRenderGridSize.value}px`,
  top: `${node.position.y * boardRenderGridSize.value}px`,
  width: `${node.size.width * boardRenderGridSize.value}px`,
  height: `${node.size.height * boardRenderGridSize.value}px`
})

const getBoardNodeRect = (node: JournalArticleBoardNode) => ({
  left: node.position.x * boardRenderGridSize.value,
  top: node.position.y * boardRenderGridSize.value,
  right: (node.position.x + node.size.width) * boardRenderGridSize.value,
  bottom: (node.position.y + node.size.height) * boardRenderGridSize.value
})

const getDistanceToBoardNode = (point: { x: number; y: number }, node: JournalArticleBoardNode) => {
  const rect = getBoardNodeRect(node)
  const dx = point.x < rect.left ? rect.left - point.x : point.x > rect.right ? point.x - rect.right : 0
  const dy = point.y < rect.top ? rect.top - point.y : point.y > rect.bottom ? point.y - rect.bottom : 0
  return Math.hypot(dx, dy)
}

const closestBoardWireTargetId = computed(() => {
  const wire = activeBoardWire.value
  if (!wire) return null
  let closestId: string | null = null
  let closestDistance = passivePortRevealDistance

  boardNodes.value.forEach((node) => {
    if (node.id === wire.fromId) return
    const distance = getDistanceToBoardNode(wire.current, node)
    if (distance <= closestDistance) {
      closestDistance = distance
      closestId = node.id
    }
  })

  return closestId
})

const isHighlightedPassiveBoardPort = (node: JournalArticleBoardNode) => {
  return !!activeBoardWire.value && closestBoardWireTargetId.value === node.id
}

const parsePriceValue = (value: string | number | undefined | null) => {
  const normalized = String(value ?? '').replace(',', '.').trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const priceNodePlaceholder = (node: any) => {
  if (node?.priceKind === 'current') return boardUiLabels.value.currentPrice
  return boardUiLabels.value.targetPrice
}

const getReferenceCurrentPrice = () => {
  const currentNode = boardNodes.value.find((node: any) => node.type === 'price' && node.priceKind === 'current' && parsePriceValue(node.value) !== null) as any
  return parsePriceValue(currentNode?.value)
}

const getPriceNodeDirection = (node: any) => {
  if (node?.type !== 'price' || node.priceKind !== 'target') return null
  const currentPrice = getReferenceCurrentPrice()
  const targetPrice = parsePriceValue(node.value)
  if (currentPrice === null || targetPrice === null || targetPrice === currentPrice) return null
  return targetPrice > currentPrice ? 'up' : 'down'
}

const getPriceNodeArrow = (node: any) => {
  const direction = getPriceNodeDirection(node)
  if (direction === 'up') return '↑'
  if (direction === 'down') return '↓'
  return ''
}

const getPriceNodeValueClass = (node: any) => {
  const direction = getPriceNodeDirection(node)
  if (direction === 'up') return 'text-emerald-500'
  if (direction === 'down') return 'text-red-500'
  return 'text-black/75'
}

const getSignalHeaderCurrentPrice = (node: any) => {
  return node?.currentPrice || node?.cp || null
}

const getSignalHeaderAsset = (node: any) => {
  return node?.assetNode || node?.asset || null
}

const getSignalHeaderTargetPrice = (node: any) => {
  return node?.targetPrice || node?.tp || null
}

const updatePriceNodeValue = (event: Event, node: any) => {
  const input = event.target as HTMLInputElement
  const sanitized = input.value
    .replace(',', '.')
    .replace(/[^\d.]/g, '')
    .replace(/(\..*)\./g, '$1')
  input.value = sanitized
  node.value = sanitized
}

const getAssetTypeLoc = (type: string) => {
  if (!type) return ''
  return assetTypeLocales[type]?.[locale.value === 'ru' ? 'ru' : 'en'] || type
}

const getAssetNodeLabel = (node: any) => {
  return node?.asset || boardUiLabels.value.noAsset
}

const getAssetNodeData = (node: any) => {
  if (!node?.asset) return null
  return (allAssets as any[]).find(asset => asset.symbol === node.asset) || null
}

const getAssetNodeTypeLabel = (node: any) => {
  const asset = getAssetNodeData(node)
  return asset?.type ? getAssetTypeLoc(asset.type) : ''
}

const openAssetPicker = (node: any) => {
  if (node?.type !== 'asset') return
  activeAssetNodeId.value = node.id
  assetSearch.value = ''
  assetTypeFilter.value = 'ALL'
}

const closeAssetPicker = () => {
  activeAssetNodeId.value = null
}

const selectBoardAsset = (asset: any) => {
  const node = boardNodes.value.find((item: any) => item.id === activeAssetNodeId.value)
  if (node && node.type === 'asset') {
    node.asset = asset.symbol
  }
  closeAssetPicker()
}

const handleAssetIconError = (symbol: string) => {
  const next = new Set(failedAssetIcons.value)
  next.add(symbol)
  failedAssetIcons.value = next
}

const isSignalBoardValid = computed(() => {
  if (!isSignalArticle.value) return true
  
  const hasValidAsset = boardNodes.value.some((node: any) => node.type === 'asset' && String(node.asset || '').trim())
  const hasValidCurrentPrice = boardNodes.value.some((node: any) => node.type === 'price' && node.priceKind === 'current' && String(node.value || '').trim())
  const hasValidTargetPrice = boardNodes.value.some((node: any) => node.type === 'price' && node.priceKind === 'target' && String(node.value || '').trim())
  
  return hasValidAsset && hasValidCurrentPrice && hasValidTargetPrice
})

const localStrategies = computed(() => (strategyTradesStore.strategies || []).filter(strategy => strategy.id !== 'MAIN_DIARY'))
const localTrades = computed(() => {
  return Object.values(strategyTradesStore.tradesByStrategy || {}).flat() as DiaryEntry[]
})
const tradePickerStrategies = computed(() => strategyTradesStore.strategies || [])

const getStrategyTrades = (strategyId: string) => {
  return (strategyTradesStore.getTradesForStrategy(strategyId) || []) as DiaryEntry[]
}

const getTradePickerStrategyTrades = (strategyId: string) => {
  return getStrategyTrades(strategyId).slice().sort((left: DiaryEntry, right: DiaryEntry) => {
    const leftTime = left.date ? new Date(left.date).getTime() : 0
    const rightTime = right.date ? new Date(right.date).getTime() : 0
    return rightTime - leftTime
  })
}

const toggleTradeStrategy = (strategyId: string) => {
  expandedTradeStrategyId.value = expandedTradeStrategyId.value === strategyId ? null : strategyId
}

const getTradeCurrencyProfit = (trade: any) => {
  const value = trade?.profitInCurrency ?? trade?.pnl ?? trade?.result ?? 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const getTradePercentProfit = (trade: any, strategyId?: string) => {
  const explicit = Number(trade?.profitValue ?? trade?.resultPercent)
  if (Number.isFinite(explicit)) return explicit
  const result = Number(trade?.result)
  if (Number.isFinite(result) && Math.abs(result) <= 1000 && trade?.profitInCurrency === undefined) return result
  const deposit = strategyId ? strategyTradesStore.getInitialDeposit(strategyId) : 1000
  const base = deposit > 0 ? deposit : 1000
  return (getTradeCurrencyProfit(trade) / base) * 100
}

const formatCompactNumber = (value: number, digits = 2) => {
  if (!Number.isFinite(value)) return '0'
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, notation: 'compact' }).format(value)
  }
  return value.toFixed(digits)
}

const formatSignedCurrency = (value: number) => {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}$${formatCompactNumber(Math.abs(value), 2)}`
}

const formatCurrencyValue = (value: number) => {
  const sign = value < 0 ? '-' : ''
  return `${sign}$${formatCompactNumber(Math.abs(value), 2)}`
}

const formatSignedPercent = (value: number) => {
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatCompactNumber(value, 2)}%`
}

const getResultToneClass = (value: number) => {
  if (value > 0) return 'text-emerald-500'
  if (value < 0) return 'text-red-500'
  return 'text-black/55'
}

const getResultDotClass = (value: number) => {
  if (value > 0) return 'bg-emerald-500'
  if (value < 0) return 'bg-red-500'
  return 'bg-black/40'
}

const getStrategyMetrics = (strategy: StrategyProfile | any) => {
  const trades = getStrategyTrades(strategy.id)
  const profits = trades.map(getTradeCurrencyProfit)
  const grossProfit = profits.filter(value => value > 0).reduce((sum, value) => sum + value, 0)
  const grossLoss = Math.abs(profits.filter(value => value < 0).reduce((sum, value) => sum + value, 0))
  const wins = profits.filter(value => value > 0).length
  const total = profits.length
  const resultCurrency = profits.reduce((sum, value) => sum + value, 0)
  const initialDeposit = strategyTradesStore.getInitialDeposit(strategy.id)
  const resultPercent = initialDeposit > 0 ? (resultCurrency / initialDeposit) * 100 : 0

  return {
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0),
    winRate: total > 0 ? (wins / total) * 100 : 0,
    resultCurrency,
    resultPercent,
    initialCapital: initialDeposit,
    finalCapital: initialDeposit + resultCurrency,
    tradesCount: total
  }
}

const formatProfitFactor = (value: number) => {
  if (value === Infinity) return '∞'
  return formatCompactNumber(value, 2)
}

const getStrategyNodeLabel = (node: any) => {
  if (node?.strategyName) return node.strategyName
  const strategy = localStrategies.value.find(strategy => strategy.id === node?.strategyId)
  return strategy?.name || boardUiLabels.value.noStrategy
}

const getStrategyNodeMetrics = (node: any) => {
  const strategy = localStrategies.value.find(strategy => strategy.id === node?.strategyId)
  if (!strategy) return null
  return getStrategyMetrics(strategy)
}

const getTradeNodeData = (node: any) => {
  if (node?.tradeSnapshot) return node.tradeSnapshot
  if (!node?.tradeId) return null
  return localTrades.value.find((trade: any) => trade.id === node.tradeId) || null
}

const getTradeNodeLabel = (node: any) => {
  const trade = getTradeNodeData(node)
  if (!trade) return boardUiLabels.value.noTrade
  return `${getTradeSideLabel(trade.side)} ${trade.asset || boardUiLabels.value.assetFallback}`
}

const getTradeNodeAssetLabel = (node: any) => {
  const trade = getTradeNodeData(node)
  return trade?.asset || boardUiLabels.value.noTrade
}

const getTradeNodeVector = (node: any) => {
  const trade = getTradeNodeData(node)
  if (!trade) return boardUiLabels.value.selectTrade
  return getTradeSideLabel(trade.side)
}

const getTradeNodeVectorClass = (node: any) => {
  const trade = getTradeNodeData(node)
  const side = String(trade?.side || '').toUpperCase()
  if (side.includes('LONG')) return 'text-emerald-500'
  if (side.includes('SHORT')) return 'text-red-500'
  return 'text-black/35'
}

const getTradeSideLabel = (side: any) => {
  const normalized = String(side || 'LONG').toUpperCase()
  return normalized.includes('SHORT') ? boardUiLabels.value.short : boardUiLabels.value.long
}

const getTradeNodeResult = (node: any) => {
  const trade = getTradeNodeData(node)
  if (!trade) return ''
  const strategyId = trade.strategyId || strategyTradesStore.selectedStrategyId
  return `${formatSignedCurrency(getTradeCurrencyProfit(trade))} (${formatSignedPercent(getTradePercentProfit(trade, strategyId))})`
}

const getTradeNodeResultClass = (node: any) => {
  const trade = getTradeNodeData(node)
  return trade ? getResultToneClass(getTradeCurrencyProfit(trade)) : 'text-black/35'
}

const formatTradeDate = (value: any) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const formatTradeNodeDateTime = (value: any) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const formatTradeDuration = (trade: any) => {
  const start = trade?.date ? new Date(trade.date).getTime() : 0
  const end = trade?.dateExit ? new Date(trade.dateExit).getTime() : start
  if (!start || !end || end < start) return '—'
  const diffMins = Math.floor((end - start) / 60000)
  const hours = Math.floor(diffMins / 60)
  return hours > 0 ? `${hours}h ${diffMins % 60}m` : `${diffMins}m`
}

const getTradeNodeEntryDate = (node: any) => {
  const trade = getTradeNodeData(node)
  return trade ? formatTradeNodeDateTime(trade.date) : '—'
}

const getTradeNodeExitDate = (node: any) => {
  const trade = getTradeNodeData(node)
  return trade ? formatTradeNodeDateTime(trade.dateExit) : '—'
}

const getTradeNodeDuration = (node: any) => {
  const trade = getTradeNodeData(node)
  return trade ? formatTradeDuration(trade) : '—'
}

const openStrategyPicker = (node: any) => {
  if (node?.type !== 'strategy') return
  activeStrategyNodeId.value = node.id
}

const closeStrategyPicker = () => {
  activeStrategyNodeId.value = null
}

const selectBoardStrategy = (strategy: StrategyProfile) => {
  const node = boardNodes.value.find((item: any) => item.id === activeStrategyNodeId.value)
  if (node && node.type === 'strategy') {
    node.strategyId = strategy.id
    node.strategyName = strategy.name
  }
  closeStrategyPicker()
}

const openTradePicker = (node: any) => {
  if (node?.type !== 'trade') return
  activeTradeNodeId.value = node.id
  expandedTradeStrategyId.value = null
}

const closeTradePicker = () => {
  activeTradeNodeId.value = null
  expandedTradeStrategyId.value = null
}

const selectBoardTrade = (trade: DiaryEntry) => {
  const node = boardNodes.value.find((item: any) => item.id === activeTradeNodeId.value)
  if (node && node.type === 'trade') {
    node.tradeId = trade.id || ''
    node.tradeSnapshot = JSON.parse(JSON.stringify(trade))
  }
  closeTradePicker()
}

const getBoardNodePortPoint = (node: JournalArticleBoardNode, port: JournalArticleBoardPort = 'left') => {
  const x = node.position.x * boardRenderGridSize.value
  const y = node.position.y * boardRenderGridSize.value
  const width = node.size.width * boardRenderGridSize.value
  const height = node.size.height * boardRenderGridSize.value
  if (port === 'top') return { x: x + width / 2, y }
  if (port === 'bottom') return { x: x + width / 2, y: y + height }
  if (port === 'right') return { x: x + width, y: y + height / 2 }
  return { x, y: y + height / 2 }
}

const getBoardConnectionPathFromPoints = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromPort: JournalArticleBoardPort = 'right',
  toPort: JournalArticleBoardPort = 'left'
) => {
  const distance = Math.max(80 * boardRenderScale.value, Math.hypot(to.x - from.x, to.y - from.y) * 0.35)
  const cp1 = { ...from }
  const cp2 = { ...to }
  if (fromPort === 'right') cp1.x += distance
  else if (fromPort === 'left') cp1.x -= distance
  else if (fromPort === 'top') cp1.y -= distance
  else cp1.y += distance
  if (toPort === 'right') cp2.x += distance
  else if (toPort === 'left') cp2.x -= distance
  else if (toPort === 'top') cp2.y -= distance
  else cp2.y += distance
  return `M ${from.x} ${from.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${to.x} ${to.y}`
}

const getBoardConnectionPath = (connection: JournalArticleBoardConnection) => {
  const fromNode = boardNodes.value.find(node => node.id === connection.fromId)
  const toNode = boardNodes.value.find(node => node.id === connection.toId)
  if (!fromNode || !toNode) return ''
  const fromPort = connection.fromPort || 'right'
  const toPort = connection.toPort || 'left'
  return getBoardConnectionPathFromPoints(
    getBoardNodePortPoint(fromNode, fromPort),
    getBoardNodePortPoint(toNode, toPort),
    fromPort,
    toPort
  )
}

const getActiveBoardWirePath = () => {
  if (!activeBoardWire.value) return ''
  const fromNode = boardNodes.value.find(node => node.id === activeBoardWire.value?.fromId)
  if (!fromNode) return ''
  const fromPort = activeBoardWire.value.fromPort || 'right'
  return getBoardConnectionPathFromPoints(
    getBoardNodePortPoint(fromNode, fromPort),
    activeBoardWire.value.current,
    fromPort,
    'left'
  )
}

const checkNodeOverlap = (x: number, y: number, w: number, h: number, ignoreNodeId?: string) => {
  return boardNodes.value.some((node: any) => {
    if (node.id === ignoreNodeId) return false
    return (
      x < node.position.x + node.size.width &&
      x + w > node.position.x &&
      y < node.position.y + node.size.height &&
      y + h > node.position.y
    )
  })
}

const startWindowTracking = () => {
  window.addEventListener('pointermove', handleBoardPointerMove)
  window.addEventListener('pointerup', stopBoardInteraction)
  window.addEventListener('pointercancel', stopBoardInteraction)
  
  if (boardDrawing.isBoardDrawingPointerDown.value) {
     window.addEventListener('pointermove', handleGlobalBoardDrawingMove)
     window.addEventListener('pointerup', handleGlobalBoardDrawingUp)
  }
}

const stopWindowTracking = () => {
  window.removeEventListener('pointermove', handleBoardPointerMove)
  window.removeEventListener('pointerup', stopBoardInteraction)
  window.removeEventListener('pointercancel', stopBoardInteraction)
  window.removeEventListener('pointermove', handleGlobalBoardDrawingMove)
  window.removeEventListener('pointerup', handleGlobalBoardDrawingUp)
}

const getBoardWorldPointFromEvent = (event: PointerEvent | MouseEvent) => {
  const rect = boardWorldRef.value?.getBoundingClientRect()
  if (!rect) return { x: 0, y: 0 }
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
}

const moveBoardWire = (event: PointerEvent) => {
  if (!activeBoardWire.value) return
  activeBoardWire.value.current = getBoardWorldPointFromEvent(event)
}

const cancelBoardWire = () => {
  activeBoardWire.value = null
  window.removeEventListener('pointermove', moveBoardWire)
  window.removeEventListener('pointerup', cancelBoardWire)
  window.removeEventListener('pointercancel', cancelBoardWire)
}

const startBoardWire = (node: JournalArticleBoardNode, port: JournalArticleBoardPort, event: PointerEvent) => {
  activeBoardWire.value = {
    fromId: node.id,
    fromPort: port,
    current: getBoardWorldPointFromEvent(event)
  }
  window.addEventListener('pointermove', moveBoardWire)
  window.addEventListener('pointerup', cancelBoardWire)
  window.addEventListener('pointercancel', cancelBoardWire)
}

const pickupBoardInput = (node: JournalArticleBoardNode, port: JournalArticleBoardPort) => {
  const index = boardConnections.value.findLastIndex(connection => connection.toId === node.id && (connection.toPort || 'left') === port)
  if (index === -1) return
  const connection = boardConnections.value[index]
  if (!connection) return
  boardConnections.value.splice(index, 1)
  activeBoardWire.value = {
    fromId: connection.fromId,
    fromPort: connection.fromPort || 'right',
    originalToId: connection.toId,
    originalToPort: connection.toPort || 'left',
    current: getBoardNodePortPoint(node, port)
  }
  window.addEventListener('pointermove', moveBoardWire)
  window.addEventListener('pointerup', cancelBoardWire)
  window.addEventListener('pointercancel', cancelBoardWire)
}

const dropBoardWire = (node: JournalArticleBoardNode, port: JournalArticleBoardPort) => {
  if (!activeBoardWire.value) return
  if (activeBoardWire.value.fromId === node.id) {
    cancelBoardWire()
    return
  }
  const nextConnection: JournalArticleBoardConnection = {
    id: 'bc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    fromId: activeBoardWire.value.fromId,
    toId: node.id,
    fromPort: activeBoardWire.value.fromPort,
    toPort: port
  }
  boardConnections.value = boardConnections.value.filter(connection => !(connection.toId === node.id && (connection.toPort || 'left') === port))
  boardConnections.value.push(nextConnection)
  cancelBoardWire()
}

const clearBoardInput = (node: JournalArticleBoardNode) => {
  boardConnections.value = boardConnections.value.filter(connection => connection.toId !== node.id)
}

const clearBoardOutput = (node: JournalArticleBoardNode) => {
  boardConnections.value = boardConnections.value.filter(connection => connection.fromId !== node.id)
}

function stopBoardDrawingMode() {
  boardDrawing.finishBoardDrawing()
  boardDrawing.restoreNativeCursor()
  boardDrawing.isBoardDrawingCursorVisible.value = false
  cancelBoardWire()
  stopWindowTracking()
  if (activeBoardTool.value === 'pencil') {
    activeBoardTool.value = null
  }
}

const isSpacePressed = ref(false)

const handleSpaceDown = (e: KeyboardEvent) => {
  if (e.code === 'Space' && (e.target === document.body || !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) && !(e.target as HTMLElement).isContentEditable)) {
    isSpacePressed.value = true
    if (creationStep.value === 'board') e.preventDefault()
  }
}

const handleSpaceUp = (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    isSpacePressed.value = false
  }
}

const handleGlobalBoardDrawingMove = (e: MouseEvent) => {
  if (activeBoardTool.value !== 'pencil' || !boardDrawing.isBoardDrawingPointerDown.value || isSpacePressed.value) return
  const elementAtPointer = document.elementFromPoint(e.clientX, e.clientY)
  if (isBoardChromeTarget(elementAtPointer)) return
  boardDrawing.moveBoardDrawing(e, boardStrokes.value)
}

const handleGlobalBoardDrawingUp = () => {
   boardDrawing.finishBoardDrawing()
   stopWindowTracking()
}

const syncBoardDrawingRefs = () => {
  boardDrawing.boardViewport.value = boardStageRef.value
  boardDrawing.boardCursorViewport.value = boardStageRef.value
  boardDrawing.boardCanvas.value = boardDrawingCanvasRef.value
  boardDrawing.boardContentSize.value = {
    width: boardBaseWorldSize.value.width,
    height: boardBaseWorldSize.value.height
  }
  boardDrawing.boardTransform.value = {
    x: boardPan.value.x,
    y: boardPan.value.y
  }
}

let boardDrawingRenderFrame: number | null = null

const renderBoardDrawingCanvas = () => {
  nextTick(() => {
    if (boardDrawingRenderFrame !== null) return
    boardDrawingRenderFrame = window.requestAnimationFrame(() => {
      boardDrawingRenderFrame = null
      syncBoardDrawingRefs()
      boardDrawing.renderBoardDrawing(boardStrokes.value)
    })
  })
}

const isBoardChromeTarget = (target: EventTarget | null) => {
  return target instanceof HTMLElement && !!target.closest('[data-board-chrome]')
}

const outOfBoundsIndicator = computed(() => {
  if (creationStep.value !== 'board') return null
  if (boardNodes.value.length === 0) return null

  let targetNode = null
  if (isSignalArticle.value) {
    targetNode = boardNodes.value.find((n: any) => n.type === 'asset')
  } else if (isQuestionArticle.value) {
    targetNode = boardNodes.value.find((n: any) => n.type === 'text' && n.isQuestion)
  }
  if (!targetNode) {
    targetNode = boardNodes.value[0]
  }
  if (!targetNode) return null

  const nodeWidth = targetNode.size.width * boardGridSize.value
  const nodeHeight = targetNode.size.height * boardGridSize.value

  const screenX = (targetNode.position.x * boardGridSize.value) + boardPan.value.x
  const screenY = (targetNode.position.y * boardGridSize.value) + boardPan.value.y

  const winW = typeof window !== 'undefined' ? window.innerWidth : 1000
  const winH = typeof window !== 'undefined' ? window.innerHeight : 1000

  const isOffScreen = 
    screenX + nodeWidth < 0 || 
    screenX > winW || 
    screenY + nodeHeight < 0 || 
    screenY > winH

  if (!isOffScreen) return null

  const padding = 60
  const clampedX = Math.max(padding, Math.min(winW - padding, screenX + nodeWidth / 2))
  const clampedY = Math.max(padding, Math.min(winH - padding, screenY + nodeHeight / 2))

  const dx = screenX + nodeWidth / 2 - clampedX
  const dy = screenY + nodeHeight / 2 - clampedY
  const dist = Math.round(Math.sqrt(dx * dx + dy * dy))
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)

  let name = ''
  if (targetNode.type === 'asset') name = locale.value === 'ru' ? 'АКТИВ' : 'ASSET'
  else if ((targetNode as any).isQuestion) name = locale.value === 'ru' ? 'ВОПРОС' : 'QUESTION'
  else name = locale.value === 'ru' ? 'УЗЕЛ' : 'NODE'

  return { id: targetNode.id, x: clampedX, y: clampedY, dist, angle, name }
})

const focusBoardNode = (id: string) => {
  const node = boardNodes.value.find((n: any) => n.id === id)
  if (node && boardStageRef.value) {
    const rect = boardStageRef.value.getBoundingClientRect()
    boardPan.value = {
      x: (rect.width / 2) - (node.position.x * boardGridSize.value) - ((node.size.width * boardGridSize.value) / 2),
      y: (rect.height / 2) - (node.position.y * boardGridSize.value) - ((node.size.height * boardGridSize.value) / 2)
    }
  }
}

watch([
  boardDrawingCanvasRef,
  boardStageRef,
  creationStep,
  () => boardGridSize.value,
  () => boardUnitSize.value.width,
  () => boardUnitSize.value.height,
  () => boardPan.value.x,
  () => boardPan.value.y
], () => {
  if (creationStep.value === 'board') renderBoardDrawingCanvas()
}, { flush: 'post' })

const startBoardPan = (event: PointerEvent) => {
  const target = event.target as HTMLElement | null
  if (creationStep.value === 'board' && isBoardChromeTarget(target)) return
  
  if (creationStep.value === 'board' && activeBoardTool.value) {
    if (activeBoardTool.value === 'pencil' && !isSpacePressed.value) {
      syncBoardDrawingRefs()
      boardDrawing.startBoardDrawing(event, boardStrokes.value)
      startWindowTracking()
      return
    }
    
    if (!isSpacePressed.value) {
      // Click to add node
      const rect = boardWorldRef.value?.getBoundingClientRect()
      if (!rect) return
      const worldX = event.clientX - rect.left
      const worldY = event.clientY - rect.top

      // Snap to grid
      const gridX = Math.round(worldX / boardGridSize.value)
      const gridY = Math.round(worldY / boardGridSize.value)

      // Check overlap
      const isPriceTool = activeBoardTool.value === 'current-price' || activeBoardTool.value === 'target-price'
      const isAssetTool = activeBoardTool.value === 'asset-node'
      const isStrategyTool = activeBoardTool.value === 'strategy-node'
      const isTradeTool = activeBoardTool.value === 'trade-node'
      const newW = isStrategyTool ? 18 : (isTradeTool ? 16 : (isAssetTool ? 9 : (isPriceTool ? 8 : (activeBoardTool.value === 'text' ? 10 : (activeBoardTool.value === 'image' ? 10 : 12)))))
      const newH = isStrategyTool ? 7 : (isTradeTool ? 6 : (isAssetTool ? 3 : (isPriceTool ? 3 : (activeBoardTool.value === 'text' ? 6 : (activeBoardTool.value === 'image' ? 10 : 12)))))

      if (checkNodeOverlap(gridX, gridY, newW, newH)) {
        alert(locale.value === 'ru' ? 'Недостаточно места для размещения узла!' : 'Not enough space to place node!')
        activeBoardTool.value = null
        return
      }

      if (activeBoardTool.value === 'text') {
        const newNode = {
          id: `node_${Date.now()}`,
          type: 'text',
          title: '',
          text: '',
          position: { x: gridX, y: gridY },
          size: { width: 10, height: 6 },
          isEditing: true
        }
        boardNodes.value.push(newNode as any)
      } else if (activeBoardTool.value === 'image') {
        const newNode = {
          id: `node_${Date.now()}`,
          type: 'image',
          src: '',
          alt: 'Uploaded Image',
          caption: '',
          position: { x: gridX, y: gridY },
          size: { width: 10, height: 10 }
        }
        boardNodes.value.push(newNode as any)
      } else if (activeBoardTool.value === 'drawing') {
        const newNode = {
          id: `node_${Date.now()}`,
          type: 'drawing',
          params: { strokes: [] },
          position: { x: gridX, y: gridY },
          size: { width: 12, height: 12 }
        }
        boardNodes.value.push(newNode as any)
      } else if (isPriceTool) {
        const newNode = {
          id: `node_${Date.now()}`,
          type: 'price',
          priceKind: activeBoardTool.value === 'current-price' ? 'current' : 'target',
          value: '',
          position: { x: gridX, y: gridY },
          size: { width: 8, height: 3 }
        }
        boardNodes.value.push(newNode as any)
      } else if (isAssetTool) {
        const newNode = {
          id: `node_${Date.now()}`,
          type: 'asset',
          asset: '',
          position: { x: gridX, y: gridY },
          size: { width: 9, height: 3 }
        }
        boardNodes.value.push(newNode as any)
      } else if (isStrategyTool) {
        const newNode = {
          id: `node_${Date.now()}`,
          type: 'strategy',
          strategyId: '',
          strategyName: '',
          position: { x: gridX, y: gridY },
          size: { width: 18, height: 7 }
        }
        boardNodes.value.push(newNode as any)
      } else if (isTradeTool) {
        const newNode = {
          id: `node_${Date.now()}`,
          type: 'trade',
          tradeId: '',
          tradeSnapshot: null,
          position: { x: gridX, y: gridY },
          size: { width: 16, height: 6 }
        }
        boardNodes.value.push(newNode as any)
      }

      activeBoardTool.value = null
      return
    }
  }

  const resizeHandle = target?.closest('[data-board-resize]') as HTMLElement | null
  if (resizeHandle) {
    event.preventDefault()
    const nodeId = resizeHandle.dataset.nodeId
    selectedBoardNodeId.value = nodeId || null
    const node = boardNodes.value.find((n: any) => n.id === nodeId)
    if (node) {
      activeBoardInteraction.value = {
        type: 'resizeNode',
        node,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startNodeW: node.size.width,
        startNodeH: node.size.height
      }
      startWindowTracking()
      return
    }
  }

  const nodeHandle = target?.closest('[data-board-node-handle]') as HTMLElement | null
  if (nodeHandle) {
    event.preventDefault()
    const nodeId = nodeHandle.dataset.nodeId
    selectedBoardNodeId.value = nodeId || null
    const node = boardNodes.value.find((n: any) => n.id === nodeId)
    if (node) {
      activeBoardInteraction.value = {
        type: 'moveNode',
        node,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startNodeX: node.position.x,
        startNodeY: node.position.y
      }
      startWindowTracking()
      return
    }
  }

  const clickedNodeEl = target?.closest('[data-board-node]') as HTMLElement | null
  if (clickedNodeEl) {
    const nodeId = clickedNodeEl.dataset.nodeId
    if (nodeId) selectedBoardNodeId.value = nodeId
    return
  }

  event.preventDefault()
  selectedBoardNodeId.value = null

  activeBoardInteraction.value = {
    type: 'pan',
    startClientX: event.clientX,
    startClientY: event.clientY,
    startPanX: boardPan.value.x,
    startPanY: boardPan.value.y
  }
  startWindowTracking()
}

const handleBoardHover = (event: PointerEvent) => {
  if (creationStep.value === 'board') {
    if (isBoardChromeTarget(event.target)) {
      boardDrawing.isBoardDrawingCursorVisible.value = false
      return
    }

    if (activeBoardTool.value === 'pencil') {
      syncBoardDrawingRefs()
      boardDrawing.updateBoardDrawingCursor(event)
    }
    if (activeBoardTool.value) {
      const rect = boardWorldRef.value?.getBoundingClientRect()
      if (rect) {
        boardPointerPos.value = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        }
      }
    }
  }
}

const handleBoardPointerMove = (event: PointerEvent) => {
  const interaction = activeBoardInteraction.value
  if (!interaction) return

  if (interaction.type === 'pan') {
    boardPan.value = {
      x: interaction.startPanX + event.clientX - interaction.startClientX,
      y: interaction.startPanY + event.clientY - interaction.startClientY
    }
  } else if (interaction.type === 'moveNode') {
    const deltaWorldX = event.clientX - interaction.startClientX
    const deltaWorldY = event.clientY - interaction.startClientY
    
    // Smooth fractional position
    const freeX = interaction.startNodeX + deltaWorldX / boardGridSize.value
    const freeY = interaction.startNodeY + deltaWorldY / boardGridSize.value
    
    interaction.node.position.x = freeX
    interaction.node.position.y = freeY
  } else if (interaction.type === 'resizeNode') {
    const deltaWorldX = event.clientX - interaction.startClientX
    const deltaWorldY = event.clientY - interaction.startClientY
    
    // Smooth fractional size
    const freeW = interaction.startNodeW + deltaWorldX / boardGridSize.value
    const newWidth = Math.max(4, freeW)
    
    let newHeight = interaction.node.size.height
    if (interaction.node.type === 'image') {
      const aspect = interaction.startNodeW / interaction.startNodeH
      newHeight = Math.max(4, newWidth / aspect)
    } else {
      const freeH = interaction.startNodeH + deltaWorldY / boardGridSize.value
      newHeight = Math.max(4, freeH)
    }

    interaction.node.size.width = newWidth
    interaction.node.size.height = newHeight
  }
}

const stopBoardInteraction = () => {
  const interaction = activeBoardInteraction.value
  if (interaction) {
    if (interaction.type === 'moveNode') {
      // Snap to grid on drop
      const snappedX = Math.round(interaction.node.position.x)
      const snappedY = Math.round(interaction.node.position.y)
      
      // Check overlap
      if (!checkNodeOverlap(snappedX, snappedY, Math.round(interaction.node.size.width), Math.round(interaction.node.size.height), interaction.node.id)) {
        interaction.node.position.x = snappedX
        interaction.node.position.y = snappedY
      } else {
        // Revert if invalid
        interaction.node.position.x = interaction.startNodeX
        interaction.node.position.y = interaction.startNodeY
      }
    } else if (interaction.type === 'resizeNode') {
      // Snap to grid on drop
      const snappedW = Math.round(interaction.node.size.width)
      const snappedH = Math.round(interaction.node.size.height)
      
      if (!checkNodeOverlap(Math.round(interaction.node.position.x), Math.round(interaction.node.position.y), snappedW, snappedH, interaction.node.id)) {
        interaction.node.size.width = snappedW
        interaction.node.size.height = snappedH
      } else {
        // Revert if invalid
        interaction.node.size.width = interaction.startNodeW
        interaction.node.size.height = interaction.startNodeH
      }
    }
  }

  activeBoardInteraction.value = null
  stopWindowTracking()
}

const handleBoardKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isBoardFullscreen.value) {
    closeBoardFullscreen()
  }
}

const handleWindowResize = () => {
  if (isBoardFullscreen.value) syncBoardFullscreenViewport()
  if (creationStep.value === 'board') {
    renderBoardDrawingCanvas()
  }
}

onMounted(() => {
  boardDrawing.restoreNativeCursor()
  nextTick(resizeCommentInput)
  window.addEventListener('keydown', handleBoardKeydown)
  window.addEventListener('resize', handleWindowResize)
})

onUnmounted(() => {
  stopBoardDrawingMode()
  if (boardDrawingRenderFrame !== null) {
    window.cancelAnimationFrame(boardDrawingRenderFrame)
    boardDrawingRenderFrame = null
  }
  if (draftSaveTimer) {
    window.clearTimeout(draftSaveTimer)
    persistDraft()
    draftSaveTimer = null
  }
  window.removeEventListener('keydown', handleBoardKeydown)
  window.removeEventListener('resize', handleWindowResize)
})

const formatCommentDate = (value: any) => {
  if (!value) return ''
  let date: Date
  if (value.toDate) date = value.toDate()
  else if (value.toMillis) date = new Date(value.toMillis())
  else if (value.seconds) date = new Date(value.seconds * 1000)
  else date = new Date(value)
  
  return new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  }).format(date)
}

// Scroll to Top Logic
watch(() => [route.query.nodeId, route.query.page], () => {
  nextTick(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    const scrollContainers = document.querySelectorAll('.scroll-minimal, .overflow-y-auto, main, .ethereal-void')
    scrollContainers.forEach(container => {
      container.scrollTo({ top: 0, behavior: 'smooth' })
    })
  })
}, { immediate: true })

// Sectional Intelligence Logic (Inherited by paged computed)
</script>

<style scoped>
.force-light-theme {
  --theme-bg: #FFFFFF !important;
  --theme-panel: rgba(255, 255, 255, 0.92) !important;
  --theme-text: #2c2c2a !important;
  --theme-muted: rgba(44, 44, 42, 0.58) !important;
  --theme-border: rgba(44, 44, 42, 0.12) !important;
  --theme-border-strong: rgba(44, 44, 42, 0.28) !important;
  --theme-accent: #8d7f61 !important;
  --theme-grid-dot: rgba(44, 44, 42, 0.24) !important;
  --theme-tooltip-bg: #F9F9F9 !important;
  --theme-tooltip-text: #2c2c2a !important;
  --theme-tooltip-muted: rgba(44, 44, 42, 0.62) !important;
  --theme-tooltip-border: rgba(44, 44, 42, 0.18) !important;
  --text-heading: #050505 !important;
  --text-description: rgba(18, 18, 18, 0.45) !important;
  --icon-color-mode: black !important;
  
  background-color: var(--theme-bg) !important;
  color: var(--theme-text) !important;
}

.force-light-theme.exforum-transparent-bg {
  background-color: transparent !important;
}

.force-light-theme * {
  border-color: var(--theme-border);
}
</style>

<style scoped>
.journal-wrapper {
  color: var(--text-primary);
}

.exforum-frontpage-bg-image {
  transform: translate(clamp(-32rem, -34vw, -10rem), 2.5rem);
}

.article-reader-board {
  z-index: 2;
  background-color: rgba(255, 255, 255, 0.94);
}

.exforum-page-reify-enter-active,
.exforum-page-reify-leave-active {
  transition:
    opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1),
    transform 1.2s cubic-bezier(0.16, 1, 0.3, 1),
    filter 1.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.exforum-page-reify-leave-active {
  position: absolute;
  inset: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.exforum-page-reify-enter-from,
.exforum-page-reify-leave-to {
  opacity: 0;
  transform: translateY(20px);
  filter: blur(10px);
}

@media (prefers-reduced-motion: reduce) {
  .exforum-page-reify-enter-active,
  .exforum-page-reify-leave-active {
    transition: opacity 0.2s ease;
  }

  .exforum-page-reify-enter-from,
  .exforum-page-reify-leave-to {
    opacity: 0;
    transform: none;
    filter: none;
  }
}

.article-board-tool {
  position: relative;
  pointer-events: auto;
}

.article-board-tool-tooltip {
  position: absolute;
  top: 50%;
  left: calc(100% + 10px);
  z-index: 9001;
  border: 1px solid rgba(44, 44, 42, 0.18);
  padding: 4px 7px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.08);
  color: #2c2c2a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.16em;
  line-height: 1;
  opacity: 0;
  pointer-events: none;
  text-transform: uppercase;
  transform: translateY(-50%) translateX(-4px);
  transition: opacity 140ms ease, transform 140ms ease;
  white-space: nowrap;
}

.article-board-tool:hover .article-board-tool-tooltip,
.article-board-tool:focus-within .article-board-tool-tooltip {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.journal-wrapper.exforum-edge-shadows {
  background-attachment: local, local, local, local;
  background-image:
    radial-gradient(ellipse 120% 86% at 50% 0%, rgba(0, 0, 0, 0.11) 0%, rgba(0, 0, 0, 0.07) 28%, rgba(0, 0, 0, 0.026) 58%, rgba(0, 0, 0, 0) 82%),
    linear-gradient(to bottom, rgba(0, 0, 0, 0.07) 0%, rgba(0, 0, 0, 0.038) 34%, rgba(0, 0, 0, 0.014) 68%, rgba(0, 0, 0, 0) 100%),
    radial-gradient(ellipse 120% 86% at 50% 100%, rgba(0, 0, 0, 0.11) 0%, rgba(0, 0, 0, 0.07) 28%, rgba(0, 0, 0, 0.026) 58%, rgba(0, 0, 0, 0) 82%),
    linear-gradient(to top, rgba(0, 0, 0, 0.07) 0%, rgba(0, 0, 0, 0.038) 34%, rgba(0, 0, 0, 0.014) 68%, rgba(0, 0, 0, 0) 100%);
  background-position: top, top, bottom, bottom;
  background-repeat: no-repeat;
  background-size: 100% 260px, 100% 260px, 100% 260px, 100% 260px;
}

.journal-sector {
  position: relative;
}

:deep(.journal-signal-card) {
  border: 0 !important;
}

.journal-filter-list {
  flex-wrap: wrap;
}

.journal-filter-button {
  position: relative;
  min-height: 30px;
  border: 0;
  border-bottom: 1px solid transparent;
  padding: 7px 5px 8px;
  background: transparent;
  color: rgba(44, 44, 42, 0.52);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.2em;
  line-height: 1;
  text-transform: uppercase;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.journal-filter-button:hover {
  border-bottom-color: rgba(44, 44, 42, 0.42);
  color: rgba(44, 44, 42, 0.95);
}

.journal-filter-button.is-active {
  border-bottom-color: rgba(44, 44, 42, 0.88);
  color: rgba(44, 44, 42, 0.95);
}

.journal-filter-button.is-active::after {
  position: absolute;
  bottom: -3px;
  left: 50%;
  width: 4px;
  height: 4px;
  background: rgba(44, 44, 42, 0.88);
  content: '';
  transform: translateX(-50%) rotate(45deg);
}

.journal-search-shell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 36px;
  border: 0;
  border-bottom: 1px solid rgba(44, 44, 42, 0.28);
  padding: 0 2px;
  background: transparent;
  transition: border-color 0.2s ease;
}

.journal-search-shell:focus-within {
  border-bottom-color: rgba(44, 44, 42, 0.78);
}

.journal-search-label {
  flex: 0 0 auto;
  color: rgba(44, 44, 42, 0.64);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.journal-search-input {
  width: 210px;
  border: 0;
  padding: 9px 0;
  background: transparent;
  color: rgba(44, 44, 42, 0.9);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  outline: none;
  text-transform: uppercase;
  transition: width 0.2s ease;
}

.journal-search-input:focus {
  width: 290px;
}

.journal-search-input::placeholder {
  color: rgba(44, 44, 42, 0.5);
  opacity: 1;
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-slide-enter-from { opacity: 0; transform: translateY(20px); filter: blur(20px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-20px); filter: blur(20px); }

.scroll-minimal::-webkit-scrollbar { display: none; }
.scroll-minimal { scrollbar-width: none; }

.grid-auto-flow-dense {
  grid-auto-flow: dense;
}

/* Double border for masthead authority */
.border-double {
  border-style: double;
}

.journal-article-reader {
  color: var(--text-primary);
}

.article-reader-header {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 0 clamp(20px, 4vw, 64px) 28px;
  border-bottom: 1px solid color-mix(in srgb, currentColor 9%, transparent);
}

.article-reader-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 calc(clamp(20px, 4vw, 64px) * -1);
  padding: 24px clamp(20px, 4vw, 64px);
  border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent);
  background: color-mix(in srgb, currentColor 1%, transparent);
}

.article-reader-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 0;
  padding: 0;
  background: transparent;
  box-shadow: none;
  color: rgba(44, 44, 42, 0.9);
  transition: color 0.3s ease, opacity 0.3s ease, transform 0.3s ease;
}

.article-reader-back:hover {
  color: rgba(44, 44, 42, 1);
}

.article-reader-back-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.24em;
  line-height: 1;
  text-transform: uppercase;
}

.article-reader-back-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  opacity: 0.75;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.article-reader-back-icon svg {
  display: block;
  width: 100%;
  height: 100%;
}

.article-reader-back:hover .article-reader-back-icon {
  opacity: 1;
  transform: translateX(-4px);
}

.article-reader-kicker {
  display: flex;
  align-items: center;
  gap: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 8px;
  letter-spacing: 0.48em;
  text-transform: uppercase;
  opacity: 0.35;
}

.article-reader-title-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
  gap: clamp(28px, 5vw, 72px);
  align-items: end;
}

.article-reader-title-row h1 {
  max-width: 980px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(2.4rem, 5vw, 5.8rem);
  font-style: italic;
  line-height: 0.98;
  letter-spacing: 0;
  color: currentColor;
}

.article-reader-title-row p {
  max-width: 720px;
  margin-top: 22px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(1rem, 1.25vw, 1.25rem);
  font-style: italic;
  line-height: 1.65;
  color: color-mix(in srgb, currentColor 54%, transparent);
}

.article-reader-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  border-left: 1px solid color-mix(in srgb, currentColor 12%, transparent);
}

.article-reader-metric {
  min-height: 82px;
  padding: 16px 18px;
  border-right: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  background: color-mix(in srgb, currentColor 1.5%, transparent);
}

.article-reader-metric span {
  display: block;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 8px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  opacity: 0.35;
}

.article-reader-metric strong {
  display: block;
  margin-top: 12px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.55rem;
  font-style: italic;
  font-weight: 400;
  line-height: 1;
  color: color-mix(in srgb, currentColor 76%, transparent);
}

.article-comments-footer {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 34px clamp(20px, 4vw, 64px) 46px;
  border-top: 1px solid color-mix(in srgb, currentColor 10%, transparent);
}

.article-comments-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
}

.article-comments-heading span,
.article-comments-heading strong,
.article-comment span,
.article-comment-meta {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 8px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  opacity: 0.35;
}

.article-comments-heading span,
.article-comments-heading strong {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.24em;
  opacity: 0.72;
}

.article-comment-composer {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  padding: 22px;
  border: 1px solid rgba(44, 44, 42, 0.24);
  border-left: 3px solid rgba(44, 44, 42, 0.72);
  background: rgba(248, 248, 246, 0.96);
  box-shadow: 0 12px 30px rgba(44, 44, 42, 0.08);
}

.article-comment-composer-title {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 2px;
}

.article-comment-composer-title > div > span {
  display: block;
  margin-bottom: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(44, 44, 42, 0.58);
}

.article-comment-composer-title h3 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.45rem;
  font-style: italic;
  font-weight: 400;
  line-height: 1;
  color: rgba(44, 44, 42, 0.88);
}

.article-comment-composer-status {
  flex: 0 0 auto;
  border: 1px solid rgba(44, 44, 42, 0.18);
  padding: 7px 9px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 8px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(44, 44, 42, 0.56);
}

.article-comment-composer-meta,
.article-comment-composer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.article-comment-composer-meta span,
.article-comment-composer-actions span {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 8px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(44, 44, 42, 0.52);
}

.article-comment-composer-meta strong {
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
  color: rgba(44, 44, 42, 0.8);
}

.article-comment-input {
  width: 100%;
  min-height: 42px;
  max-height: 220px;
  resize: none;
  overflow-y: hidden;
  border: 1px solid rgba(44, 44, 42, 0.24);
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.98);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 0.95rem;
  font-style: italic;
  line-height: 1.45;
  color: rgba(44, 44, 42, 0.9);
  box-shadow: inset 0 1px 2px rgba(44, 44, 42, 0.04);
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.article-comment-input::placeholder {
  color: rgba(44, 44, 42, 0.6);
  opacity: 1;
}

.article-comment-input:focus {
  border-color: rgba(44, 44, 42, 0.62);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(44, 44, 42, 0.08);
}

.article-comment-input:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.article-comment-submit {
  border: 1px solid rgba(44, 44, 42, 0.82);
  padding: 11px 15px;
  background: rgba(44, 44, 42, 0.88);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 8px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #ffffff;
  transition: background 0.2s ease, opacity 0.2s ease;
}

.article-comment-submit:hover:not(:disabled) {
  background: rgba(44, 44, 42, 1);
}

.article-comment-submit:disabled {
  cursor: not-allowed;
  background: rgba(44, 44, 42, 0.42);
  border-color: rgba(44, 44, 42, 0.42);
  opacity: 1;
}

.article-comments-list {
  display: grid;
  gap: 12px;
}

.article-comment {
  padding: 20px 22px;
  border: 1px solid color-mix(in srgb, currentColor 10%, transparent);
  background: color-mix(in srgb, currentColor 1.5%, transparent);
}

.article-comment-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 14px;
}

.article-comment h3 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.5rem;
  font-style: italic;
  line-height: 1;
  color: color-mix(in srgb, currentColor 96%, transparent);
}

.article-comment span {
  display: block;
  margin-top: 8px;
}

.article-comment :deep(.user-status-badge) {
  display: inline-flex;
  margin-top: 0;
  opacity: 1;
}

.article-comment-meta {
  display: flex;
  gap: 18px;
  text-align: right;
  white-space: nowrap;
  color: color-mix(in srgb, currentColor 88%, transparent);
  opacity: 0.88;
}

.article-comment-meta span {
  margin-top: 0;
  opacity: 1;
}

.article-comment-like {
  margin-right: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  padding: 0.38rem 0.58rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.2em;
  line-height: 1;
  opacity: 0.58;
  text-transform: uppercase;
  transition: color 180ms ease, background-color 180ms ease, border-color 180ms ease, opacity 180ms ease;
}

.article-comment-like:hover:not(:disabled) {
  border-color: color-mix(in srgb, currentColor 60%, transparent);
  background: color-mix(in srgb, currentColor 8%, transparent);
  opacity: 1;
}

.article-comment-like--active {
  border-color: #090909;
  background: #090909;
  color: #fff;
  box-shadow: 0 0 16px rgba(9, 9, 9, 0.18);
  opacity: 1;
}

:global(.dark) .article-comment-like--active {
  border-color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.92);
  color: #090909;
  box-shadow: 0 0 16px rgba(255, 255, 255, 0.15);
}

.article-comment-like__heart {
  width: 0.82rem;
  height: 0.82rem;
  flex: 0 0 auto;
  transition: color 180ms ease, fill 180ms ease, filter 180ms ease, transform 180ms ease;
}

.article-comment-like--active .article-comment-like__heart {
  filter: drop-shadow(0 0 5px rgba(244, 63, 94, 0.82));
  transform: scale(1.08);
}

.article-comment-like:disabled {
  cursor: default;
  opacity: 0.3;
}

.article-comment p,
.article-comments-empty {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1rem;
  font-style: italic;
  line-height: 1.65;
  color: color-mix(in srgb, currentColor 56%, transparent);
}

@media (max-width: 1023px) {
  .article-reader-title-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 639px) {
  .journal-masthead-tools {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }

  .journal-filter-list {
    width: 100%;
  }

  .journal-search-shell,
  .journal-search-input,
  .journal-search-input:focus {
    width: 100%;
  }

  .article-reader-header {
    padding-top: 28px;
  }

  .article-reader-kicker {
    flex-wrap: wrap;
    letter-spacing: 0.32em;
  }

  .article-reader-metrics {
    grid-template-columns: 1fr;
  }

  .article-comments-heading,
  .article-comment-head,
  .article-comment-meta,
  .article-comment-composer-title,
  .article-comment-composer-meta,
  .article-comment-composer-actions {
    align-items: start;
    flex-direction: column;
    text-align: left;
    white-space: normal;
  }
}
</style>
