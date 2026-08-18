<template>
  <div class="relative flex flex-col w-full h-full bg-[#f8f8f7] text-[#2c2c2a] selection:bg-black selection:text-white overflow-hidden exforum-edge-shadows">
    <!-- Hidden File Input for Image Selection -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/svg+xml, image/*"
      multiple
      class="hidden"
      @change="handleImageFileSelect"
    />

    <!-- Top & Bottom Edge Gradient Shadow Overlays (Matching ExForum Edge Shadows) -->
    <div class="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/15 via-black/[0.04] to-transparent z-20"></div>
    <div class="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/15 via-black/[0.04] to-transparent z-20"></div>

    <!-- Background Decorative Elements & Shadows -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
      <div class="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-black/[0.04] blur-3xl"></div>
      <div class="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-black/[0.05] blur-3xl"></div>
    </div>

    <!-- Static Header Row (Title is static at top, centered in max-w-4xl) -->
    <div class="relative z-20 w-full shrink-0 pt-10 sm:pt-14 px-6 sm:px-12 border-b border-black/10 pb-4">
      <div class="max-w-4xl mx-auto w-full">
        <div class="flex items-center justify-between mb-2 select-none">
          <span class="block text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 font-bold">
            {{ locale === 'ru' ? 'Заголовок' : 'Title' }}
          </span>
          <span class="text-[10px] font-mono font-bold text-black/40">
            {{ (title?.length || 0) }} / 60
          </span>
        </div>
        <input
          :value="title"
          type="text"
          maxlength="60"
          class="w-full bg-transparent text-3xl sm:text-4xl md:text-5xl font-serif italic font-normal tracking-tight text-left text-black/90 outline-none placeholder:text-black/20"
          :placeholder="locale === 'ru' ? 'Заголовок статьи...' : 'Article Title...'"
          @input="handleTitleInput"
        />
      </div>
    </div>

    <!-- Full-Width Scroll Viewport (Scrollbar is at the rightmost edge of screen!) -->
    <div class="relative z-10 flex-1 min-h-0 w-full overflow-y-auto scrollbar-thin px-6 sm:px-12">
      <!-- Centered Document Body (Content stays centered in max-w-4xl) -->
      <div class="max-w-4xl mx-auto w-full flex flex-col pt-6 pb-28">
        <!-- Main Contenteditable Text Area -->
        <div class="relative w-full min-h-[300px] shrink-0 mb-6">
          <div
            :ref="setEditorRef"
            data-text-editor
            contenteditable="true"
            class="w-full h-full outline-none font-serif text-lg md:text-xl leading-relaxed text-black/85 break-words whitespace-pre-wrap cursor-text selection:bg-black selection:text-white editor-rich-content relative z-10"
            :data-placeholder="placeholder"
            @contextmenu="handleContextMenu"
            @input="syncContentFromDom"
          ></div>

          <!-- Placeholder Overlay -->
          <div
            v-if="isContentEmpty"
            class="pointer-events-none absolute left-0 top-0 z-0 font-serif text-lg md:text-xl italic text-black/30 select-none"
          >
            {{ placeholder }}
          </div>
        </div>

        <!-- Attached Images Horizontal Carousel (Max 5 images) -->
        <div v-if="attachedImages.length > 0" class="w-full shrink-0 pt-6 border-t border-black/10 relative z-20 mb-8">
          <div class="flex items-center justify-between mb-3">
            <span class="text-[10px] font-mono uppercase tracking-[0.2em] text-black/50 font-bold select-none flex items-center gap-2">
              <svg class="w-3.5 h-3.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              {{ locale === 'ru' ? 'Прикрепленные изображения' : 'Attached Images' }}
            </span>
            <span class="text-[10px] font-mono font-bold text-black/40">
              {{ attachedImages.length }} / 5
            </span>
          </div>

          <!-- Horizontal Scrollable Carousel -->
          <div class="flex items-center gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin">
            <div
              v-for="(imgSrc, index) in attachedImages"
              :key="index"
              class="group relative shrink-0 w-36 h-28 sm:w-44 sm:h-32 bg-black/5 border border-black/15 rounded overflow-hidden shadow-sm hover:border-black/40 transition-all cursor-pointer"
            >
              <img :src="imgSrc" alt="Attached preview" class="w-full h-full object-cover" />
              <!-- Delete Button Overlay -->
              <button
                type="button"
                class="absolute top-2 right-2 w-6 h-6 rounded-none bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                :title="locale === 'ru' ? 'Удалить изображение' : 'Remove image'"
                @click.stop="removeAttachedImage(index)"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <!-- Add More Thumbnail Button if < 5 -->
            <button
              v-if="attachedImages.length < 5"
              type="button"
              class="shrink-0 w-28 h-28 sm:w-32 sm:h-32 border-2 border-dashed border-black/20 hover:border-black/50 rounded flex flex-col items-center justify-center gap-1.5 text-black/40 hover:text-black/80 transition-colors bg-white/50 hover:bg-white"
              @click="triggerImageUpload"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span class="text-[9px] font-mono uppercase tracking-widest font-bold">
                {{ locale === 'ru' ? 'ЕЩЕ' : 'ADD' }}
              </span>
            </button>
          </div>
        </div>

        <!-- Attached Trades Horizontal Carousel (Max 5 trades, placed below images carousel) -->
        <div v-if="attachedTrades.length > 0" class="w-full shrink-0 pt-6 border-t border-black/10 relative z-20 mb-8">
          <div class="flex items-center justify-between mb-3">
            <span class="text-[10px] font-mono uppercase tracking-[0.2em] text-black/50 font-bold select-none flex items-center gap-2">
              <svg class="w-3.5 h-3.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M3 3v18h18" />
                <path d="M18 9l-5 5-4-4-5 5" />
              </svg>
              {{ locale === 'ru' ? 'Прикрепленные сделки' : 'Attached Trades' }}
            </span>
            <span class="text-[10px] font-mono font-bold text-black/40">
              {{ attachedTrades.length }} / 5
            </span>
          </div>

          <!-- Horizontal Scrollable Carousel -->
          <div class="flex items-center gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin">
            <div
              v-for="(trade, index) in attachedTrades"
              :key="trade.id || index"
              class="group relative shrink-0 w-44 h-28 sm:w-52 sm:h-32 bg-white border border-black/15 rounded p-3.5 shadow-sm hover:border-black/40 transition-all flex flex-col justify-between cursor-pointer select-none"
            >
              <!-- Header: Side badge & Delete button -->
              <div class="flex items-center justify-between">
                <span
                  class="px-1.5 py-0.5 text-[9px] font-mono font-black rounded uppercase tracking-wider"
                  :class="getTradeSideLabel(trade.side) === 'LONG' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'"
                >
                  {{ getTradeSideLabel(trade.side) }}
                </span>

                <!-- Delete Button -->
                <button
                  type="button"
                  class="w-5 h-5 rounded-none bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                  :title="locale === 'ru' ? 'Удалить сделку' : 'Remove trade'"
                  @click.stop="removeAttachedTrade(index)"
                >
                  <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <!-- Ticker Symbol -->
              <div class="my-auto">
                <span class="block font-mono text-lg sm:text-xl font-black uppercase tracking-widest text-black/90 truncate">
                  {{ trade.asset || 'N/A' }}
                </span>
              </div>

              <!-- Result in % -->
              <div class="flex items-center justify-between border-t border-black/5 pt-2">
                <span class="text-[9px] font-mono font-bold uppercase text-black/40 tracking-wider">
                  {{ locale === 'ru' ? 'РЕЗУЛЬТАТ' : 'RESULT' }}
                </span>
                <span
                  class="font-mono text-sm sm:text-base font-black tracking-wider"
                  :class="getResultToneClass(getTradePercentProfit(trade, trade.strategyId))"
                >
                  {{ formatSignedPercent(getTradePercentProfit(trade, trade.strategyId)) }}
                </span>
              </div>
            </div>

            <!-- Add More Trade Button if < 5 -->
            <button
              v-if="attachedTrades.length < 5"
              type="button"
              class="shrink-0 w-32 h-28 sm:w-36 sm:h-32 border-2 border-dashed border-black/20 hover:border-black/50 rounded flex flex-col items-center justify-center gap-1.5 text-black/40 hover:text-black/80 transition-colors bg-white/50 hover:bg-white"
              @click="triggerTradeUpload"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span class="text-[9px] font-mono uppercase tracking-widest font-bold">
                {{ locale === 'ru' ? 'СДЕЛКА' : 'TRADE' }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Left Vertical Side Toolbar (Image & Deal buttons) -->
    <div
      class="absolute left-6 top-1/2 -translate-y-1/2 z-50 flex items-center cursor-auto pointer-events-auto"
    >
      <ExGenesisHudPanel orientation="vertical">
        <!-- Add Image Button -->
        <ExGenesisHudButton
          :tooltip="locale === 'ru' ? 'Изображение' : 'Image'"
          tooltip-position="right"
          @click="triggerImageUpload"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="8.5" cy="8.5" r="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <polyline points="21 15 16 10 5 21" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </ExGenesisHudButton>

        <!-- Add Deal Button -->
        <ExGenesisHudButton
          :tooltip="locale === 'ru' ? 'Сделка' : 'Trade'"
          tooltip-position="right"
          @click="triggerTradeUpload"
        >
          <span class="font-mono text-[10px] font-black uppercase tracking-wider text-current">
            {{ locale === 'ru' ? 'СДЛ' : 'TRD' }}
          </span>
        </ExGenesisHudButton>
      </ExGenesisHudPanel>
    </div>

    <!-- Bottom Left Actions (Back to Mode Select) -->
    <div
      class="absolute bottom-6 left-6 z-50 flex items-center gap-4 cursor-auto pointer-events-auto"
    >
      <button
        type="button"
        class="px-6 py-3 border border-black/20 bg-white/90 shadow-sm text-[10px] font-mono uppercase tracking-widest hover:border-black/50 hover:bg-white transition-colors"
        @click="emit('back')"
      >
        {{ locale === 'ru' ? 'НАЗАД К ВЫБОРУ РЕЖИМА' : 'BACK TO MODE SELECT' }}
      </button>
    </div>

    <!-- Bottom Right Actions (Save Draft & Continue) -->
    <div
      class="absolute bottom-6 right-6 z-50 flex items-center gap-4 cursor-auto pointer-events-auto"
    >
      <button
        type="button"
        class="px-6 py-3 border border-black/20 bg-white/90 shadow-sm text-[10px] font-mono uppercase tracking-widest hover:border-black/50 hover:bg-white transition-colors"
        @click="isEditingArticle ? emit('cancelEdit') : emit('saveDraft')"
      >
        {{ isEditingArticle ? (locale === 'ru' ? 'ВЫЙТИ' : 'EXIT') : (locale === 'ru' ? 'СОХРАНИТЬ ЧЕРНОВИК' : 'SAVE DRAFT') }}
      </button>
      <button
        type="button"
        class="px-8 py-3 border border-black/20 bg-black text-white shadow-sm text-[10px] font-mono uppercase tracking-[0.2em] hover:bg-black/80 transition-colors"
        @click="emit('continue')"
      >
        {{ locale === 'ru' ? 'ПРОДОЛЖИТЬ' : 'CONTINUE' }}
      </button>
    </div>

    <!-- Trade Picker Modal -->
    <Transition name="fade">
      <div
        v-if="isTradePickerOpen"
        class="fixed inset-0 z-[99999] flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm cursor-auto pointer-events-auto"
        @click.self="isTradePickerOpen = false"
      >
        <div class="relative flex h-full max-h-[620px] w-[980px] max-w-full flex-col" @click.stop>
          <ExPanel variant="light" :no-padding="true" :show-corners="true" :no-shadow="true" class="flex h-full flex-col border-black/20 bg-white text-black shadow-2xl">
            <div class="flex items-center justify-between border-b border-black/10 px-6 py-5">
              <div class="flex flex-col gap-1">
                <span class="font-mono text-[9px] font-black uppercase tracking-[0.35em] text-black/35">
                  EXGENESISLOG // {{ locale === 'ru' ? 'СПИСОК СДЕЛОК' : 'TRADE LIST' }}
                </span>
                <strong class="font-mono text-xl font-black uppercase tracking-widest">
                  {{ locale === 'ru' ? 'Выберите сделку' : 'Select trade' }}
                </strong>
              </div>
            </div>

          <div class="flex-1 overflow-y-auto scroll-minimal py-2">
            <div v-for="strategy in tradePickerStrategies" :key="strategy.id" class="border-b border-black/5 last:border-0">
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
                <span class="text-[11px] font-black text-black/55">PF {{ formatProfitFactor(getStrategyMetrics(strategy).profitFactor) }}</span>
                <span class="text-[11px] font-black text-black/55">WR {{ formatCompactNumber(getStrategyMetrics(strategy).winRate, 1) }}%</span>
                <span class="text-right text-[11px] font-black" :class="getResultToneClass(getStrategyMetrics(strategy).resultCurrency)">
                  {{ formatSignedCurrency(getStrategyMetrics(strategy).resultCurrency) }} ({{ formatSignedPercent(getStrategyMetrics(strategy).resultPercent) }})
                </span>
                <span
                  class="flex h-6 w-6 items-center justify-center border border-black/10 text-[12px] font-black text-black/35 transition-colors"
                  :class="expandedTradeStrategyId === strategy.id ? 'bg-black text-white' : ''"
                >
                  {{ expandedTradeStrategyId === strategy.id ? '−' : '+' }}
                </span>
              </button>

              <div v-if="expandedTradeStrategyId === strategy.id" class="border-t border-black/10 bg-black/[0.025]">
                <div class="grid grid-cols-[1fr_0.8fr_1.35fr_1fr_1fr] gap-2 border-b border-black/10 px-6 py-3 pl-10 font-mono text-[8px] font-black uppercase tracking-[0.25em] text-black/35">
                  <span>{{ locale === 'ru' ? 'НАПРАВЛЕНИЕ' : 'DIRECTION' }}</span>
                  <span>{{ locale === 'ru' ? 'АКТИВ' : 'ASSET' }}</span>
                  <span>{{ locale === 'ru' ? 'ДАТЫ' : 'DATES' }}</span>
                  <span class="text-right">{{ locale === 'ru' ? 'ДЛИТЕЛЬНОСТЬ' : 'DURATION' }}</span>
                  <span class="text-right">{{ locale === 'ru' ? 'РЕЗУЛЬТАТ' : 'RESULT' }}</span>
                </div>
                <button
                  v-for="trade in getTradePickerStrategyTrades(strategy.id)"
                  :key="trade.id"
                  class="grid w-full grid-cols-[1fr_0.8fr_1.35fr_1fr_1fr] items-center gap-2 border-b border-black/5 px-6 py-3 pl-10 text-left font-mono transition-colors last:border-0 hover:bg-black/5"
                  @click="selectTrade(trade)"
                >
                  <span class="flex min-w-0 items-center gap-3">
                    <span class="h-1.5 w-1.5 rounded-full" :class="getResultDotClass(getTradeCurrencyProfit(trade))"></span>
                    <span class="truncate text-[12px] font-black uppercase tracking-widest">{{ getTradeSideLabel(trade.side) }}</span>
                  </span>
                  <span class="truncate text-[11px] uppercase tracking-wider text-black/60">{{ trade.asset || 'N/A' }}</span>
                  <span class="flex min-w-0 flex-col">
                    <span class="truncate text-[9px] uppercase tracking-wider text-black/35">{{ locale === 'ru' ? 'Вход' : 'Entry' }}: {{ formatTradeDate(trade.date) }}</span>
                    <span class="truncate text-[9px] uppercase tracking-wider text-black/35">{{ locale === 'ru' ? 'Выход' : 'Exit' }}: {{ formatTradeDate(trade.dateExit) }}</span>
                  </span>
                  <span class="truncate text-right text-[11px] uppercase tracking-wider text-black/40">{{ formatTradeDuration(trade) }}</span>
                  <span class="truncate text-right text-[11px] font-black" :class="getResultToneClass(getTradeCurrencyProfit(trade))">
                    {{ formatSignedCurrency(getTradeCurrencyProfit(trade)) }} ({{ formatSignedPercent(getTradePercentProfit(trade, strategy.id)) }})
                  </span>
                </button>
                <div v-if="getTradePickerStrategyTrades(strategy.id).length === 0" class="px-10 py-6 text-center font-mono text-xs text-black/40">
                  {{ locale === 'ru' ? 'В этой стратегии нет сделок' : 'No trades in this strategy' }}
                </div>
              </div>
            </div>
          </div>
        </ExPanel>
      </div>
    </div>
  </Transition>

    <!-- Floating Context Formatting Panel (ExGenesis HUD style) -->
    <Transition name="hud-pop">
      <div
        v-if="isToolbarVisible"
        data-text-toolbar
        class="fixed z-[9999] -translate-x-1/2 cursor-auto pointer-events-auto"
        :style="{ left: `${toolbarPosition.x}px`, top: `${toolbarPosition.y}px` }"
        @click.stop
        @contextmenu.prevent.stop
      >
        <ExGenesisHudPanel orientation="horizontal" class="shadow-[0_20px_50px_rgba(0,0,0,0.35)] border-white/20">
          <!-- Bold -->
          <ExGenesisHudButton
            :active="activeFormats.bold"
            :tooltip="locale === 'ru' ? 'Жирный' : 'Bold'"
            @click="applyFormat('bold')"
          >
            <span class="font-black text-sm">B</span>
          </ExGenesisHudButton>

          <!-- Italic -->
          <ExGenesisHudButton
            :active="activeFormats.italic"
            :tooltip="locale === 'ru' ? 'Курсив' : 'Italic'"
            @click="applyFormat('italic')"
          >
            <span class="font-serif italic font-bold text-sm">I</span>
          </ExGenesisHudButton>

          <!-- Strikethrough -->
          <ExGenesisHudButton
            :active="activeFormats.strikethrough"
            :tooltip="locale === 'ru' ? 'Зачеркнутый' : 'Strikethrough'"
            @click="applyFormat('strikethrough')"
          >
            <span class="line-through text-sm font-bold">S</span>
          </ExGenesisHudButton>

          <!-- Underline -->
          <ExGenesisHudButton
            :active="activeFormats.underline"
            :tooltip="locale === 'ru' ? 'Подчеркнутый' : 'Underline'"
            @click="applyFormat('underline')"
          >
            <span class="underline text-sm font-bold">U</span>
          </ExGenesisHudButton>

          <div class="w-px h-5 bg-white/15 my-auto"></div>

          <!-- Heading 1 -->
          <ExGenesisHudButton
            :active="activeFormats.h1"
            :tooltip="locale === 'ru' ? 'Заголовок H1' : 'Heading 1'"
            @click="applyFormat('h1')"
          >
            <span class="font-mono text-xs font-bold">H1</span>
          </ExGenesisHudButton>

          <!-- Heading 2 -->
          <ExGenesisHudButton
            :active="activeFormats.h2"
            :tooltip="locale === 'ru' ? 'Заголовок H2' : 'Heading 2'"
            @click="applyFormat('h2')"
          >
            <span class="font-mono text-xs font-bold">H2</span>
          </ExGenesisHudButton>

          <!-- Blockquote -->
          <ExGenesisHudButton
            :active="activeFormats.blockquote"
            :tooltip="locale === 'ru' ? 'Цитата' : 'Quote'"
            @click="applyFormat('blockquote')"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h3c0 4-2 6-4 6z" />
              <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h3c0 4-2 6-4 6z" />
            </svg>
          </ExGenesisHudButton>

          <!-- Unordered List (LI) -->
          <ExGenesisHudButton
            :active="activeFormats.unorderedList"
            :tooltip="locale === 'ru' ? 'Список' : 'Bullet List'"
            @click="applyFormat('unorderedList')"
          >
            <span class="font-mono text-xs font-bold lowercase">li</span>
          </ExGenesisHudButton>

          <div class="w-px h-5 bg-white/15 my-auto"></div>

          <!-- Align Left -->
          <ExGenesisHudButton
            :active="activeFormats.alignLeft"
            :tooltip="locale === 'ru' ? 'По левому краю' : 'Align Left'"
            @click="applyFormat('alignLeft')"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="17" y1="10" x2="3" y2="10" />
              <line x1="21" y1="6" x2="3" y2="6" />
              <line x1="21" y1="14" x2="3" y2="14" />
              <line x1="17" y1="18" x2="3" y2="18" />
            </svg>
          </ExGenesisHudButton>

          <!-- Align Center -->
          <ExGenesisHudButton
            :active="activeFormats.alignCenter"
            :tooltip="locale === 'ru' ? 'По центру' : 'Align Center'"
            @click="applyFormat('alignCenter')"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="10" x2="6" y2="10" />
              <line x1="21" y1="6" x2="3" y2="6" />
              <line x1="21" y1="14" x2="3" y2="14" />
              <line x1="18" y1="18" x2="6" y2="18" />
            </svg>
          </ExGenesisHudButton>

          <!-- Align Right -->
          <ExGenesisHudButton
            :active="activeFormats.alignRight"
            :tooltip="locale === 'ru' ? 'По правому краю' : 'Align Right'"
            @click="applyFormat('alignRight')"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="21" y1="10" x2="7" y2="10" />
              <line x1="21" y1="6" x2="3" y2="6" />
              <line x1="21" y1="14" x2="3" y2="14" />
              <line x1="21" y1="18" x2="7" y2="18" />
            </svg>
          </ExGenesisHudButton>
        </ExGenesisHudPanel>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRefs } from 'vue'
import { useExForumTextEditor } from '../model/useExForumTextEditor'
import { useStrategyTradesStore } from '~/features/store/useStrategyTrades'
import type { DiaryEntry } from '~/entities/diary/model/diary.types'
import ExPanel from '~/shared/ui/ExPanel.vue'
import ExGenesisHudPanel from '~/widgets/genesis/ui/common/ExGenesisHudPanel.vue'
import ExGenesisHudButton from '~/widgets/genesis/ui/common/ExGenesisHudButton.vue'
import { uploadToCloudinary } from '~/shared/lib/cloudinary'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    title?: string
    images?: string[]
    trades?: any[]
    placeholder?: string
    isEditingArticle?: boolean
    locale?: 'ru' | 'en'
  }>(),
  {
    modelValue: '',
    title: '',
    images: () => [],
    trades: () => [],
    placeholder: 'Текст статьи...',
    isEditingArticle: false,
    locale: 'ru'
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
  (e: 'update:title', val: string): void
  (e: 'update:images', val: string[]): void
  (e: 'update:trades', val: any[]): void
  (e: 'back'): void
  (e: 'saveDraft'): void
  (e: 'cancelEdit'): void
  (e: 'continue'): void
}>()

const { modelValue, title, images, trades, placeholder, locale } = toRefs(props)

// Sync modelValue prop with v-model emit
const contentModel = computed({
  get: () => modelValue.value || '',
  set: (val: string) => emit('update:modelValue', val)
})

const handleTitleInput = (e: Event) => {
  const input = e.target as HTMLInputElement
  let val = input.value || ''
  if (val.length > 60) {
    val = val.slice(0, 60)
    input.value = val
  }
  emit('update:title', val)
}

// File Input & Image Attachments State
const fileInputRef = ref<HTMLInputElement | null>(null)
const internalImages = ref<string[]>([])

const attachedImages = computed({
  get: () => (images.value && images.value.length > 0 ? images.value : internalImages.value),
  set: (val: string[]) => {
    internalImages.value = val
    emit('update:images', val)
  }
})

function triggerImageUpload() {
  if (attachedImages.value.length >= 5) {
    return
  }
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

async function handleImageFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return

  const remainingSlots = 5 - attachedImages.value.length
  if (remainingSlots <= 0) return

  const filesToProcess = Array.from(files).slice(0, remainingSlots)

  for (const file of filesToProcess) {
    if (attachedImages.value.length >= 5) break
    try {
      const res = await uploadToCloudinary(file)
      if (res?.secure_url && attachedImages.value.length < 5) {
        attachedImages.value = [...attachedImages.value, res.secure_url]
        continue
      }
    } catch (err) {
      console.warn('[ExForumTextEditor] Cloudinary upload failed, falling back to local data URL:', err)
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      if (result && attachedImages.value.length < 5) {
        attachedImages.value = [...attachedImages.value, result]
      }
    }
    reader.readAsDataURL(file)
  }

  target.value = ''
}

function removeAttachedImage(index: number) {
  const updated = [...attachedImages.value]
  updated.splice(index, 1)
  attachedImages.value = updated
}

// Strategy & Trade Selection State
const strategyTradesStore = useStrategyTradesStore()
const internalTrades = ref<any[]>([])
const isTradePickerOpen = ref(false)
const expandedTradeStrategyId = ref<string | null>(null)

const attachedTrades = computed({
  get: () => (trades.value && trades.value.length > 0 ? trades.value : internalTrades.value),
  set: (val: any[]) => {
    internalTrades.value = val
    emit('update:trades', val)
  }
})

const tradePickerStrategies = computed(() => strategyTradesStore.strategies || [])

const getStrategyTrades = (strategyId: string) => {
  return (strategyTradesStore.getTradesForStrategy(strategyId) || []) as DiaryEntry[]
}

const getTradePickerStrategyTrades = (strategyId: string) => {
  return getStrategyTrades(strategyId)
    .slice()
    .sort((left: any, right: any) => {
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

const formatSignedPercent = (value: number) => {
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatCompactNumber(value, 2)}%`
}

const getResultToneClass = (value: number) => {
  if (value > 0) return 'text-emerald-600'
  if (value < 0) return 'text-red-600'
  return 'text-black/55'
}

const getResultDotClass = (value: number) => {
  if (value > 0) return 'bg-emerald-500'
  if (value < 0) return 'bg-red-500'
  return 'bg-black/40'
}

const getStrategyMetrics = (strategy: any) => {
  const trades = getStrategyTrades(strategy.id)
  const profits = trades.map(getTradeCurrencyProfit)
  const grossProfit = profits.filter((v) => v > 0).reduce((sum, v) => sum + v, 0)
  const grossLoss = Math.abs(profits.filter((v) => v < 0).reduce((sum, v) => sum + v, 0))
  const wins = profits.filter((v) => v > 0).length
  const total = profits.length
  const resultCurrency = profits.reduce((sum, v) => sum + v, 0)
  const initialDeposit = strategyTradesStore.getInitialDeposit(strategy.id)
  const resultPercent = initialDeposit > 0 ? (resultCurrency / initialDeposit) * 100 : 0

  return {
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
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

const getTradeSideLabel = (side: any) => {
  const str = String(side || '').toLowerCase()
  if (str.includes('buy') || str.includes('long') || str === 'b' || str === 'l') return 'LONG'
  if (str.includes('sell') || str.includes('short') || str === 's') return 'SHORT'
  return String(side || 'LONG').toUpperCase()
}

const formatTradeDate = (d: any) => {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  })
}

const formatTradeDuration = (trade: any) => {
  const start = trade?.date ? new Date(trade.date).getTime() : 0
  const end = trade?.dateExit ? new Date(trade.dateExit).getTime() : start
  if (!start || !end || end < start) return '—'
  const diffMs = end - start
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return `${days}${locale.value === 'ru' ? 'д' : 'd'}`
  }
  return `${hours}${locale.value === 'ru' ? 'ч' : 'h'}`
}

function triggerTradeUpload() {
  if (attachedTrades.value.length >= 5) {
    return
  }
  isTradePickerOpen.value = true
  expandedTradeStrategyId.value = null
}

function selectTrade(trade: DiaryEntry) {
  if (attachedTrades.value.length >= 5) return
  const exists = attachedTrades.value.some(t => t.id === trade.id)
  if (!exists) {
    attachedTrades.value = [...attachedTrades.value, JSON.parse(JSON.stringify(trade))]
  }
  isTradePickerOpen.value = false
}

function removeAttachedTrade(index: number) {
  const updated = [...attachedTrades.value]
  updated.splice(index, 1)
  attachedTrades.value = updated
}

const {
  setEditorRef,
  content,
  isToolbarVisible,
  toolbarPosition,
  activeFormats,
  handleContextMenu,
  applyFormat,
  syncContentFromDom
} = useExForumTextEditor({
  modelValue: contentModel,
  placeholder: placeholder.value,
  locale: locale.value
})

const isContentEmpty = computed(() => {
  const plainText = content.value.replace(/<[^>]*>/g, '').trim()
  return plainText.length === 0
})
</script>

<style scoped>
.exforum-edge-shadows {
  background-attachment: local, local, local, local;
  background-image:
    radial-gradient(ellipse 120% 86% at 50% 0%, rgba(0, 0, 0, 0.12) 0%, rgba(0, 0, 0, 0.08) 28%, rgba(0, 0, 0, 0.03) 58%, rgba(0, 0, 0, 0) 82%),
    linear-gradient(to bottom, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.04) 34%, rgba(0, 0, 0, 0.015) 68%, rgba(0, 0, 0, 0) 100%),
    radial-gradient(ellipse 120% 86% at 50% 100%, rgba(0, 0, 0, 0.12) 0%, rgba(0, 0, 0, 0.08) 28%, rgba(0, 0, 0, 0.03) 58%, rgba(0, 0, 0, 0) 82%),
    linear-gradient(to top, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.04) 34%, rgba(0, 0, 0, 0.015) 68%, rgba(0, 0, 0, 0) 100%);
  background-position: top, top, bottom, bottom;
  background-repeat: no-repeat;
  background-size: 100% 280px, 100% 280px, 100% 280px, 100% 280px;
}

.hud-pop-enter-active,
.hud-pop-leave-active {
  transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.hud-pop-enter-from,
.hud-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px) scale(0.95);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

:deep(.editor-rich-content h1) {
  font-size: 2.25rem;
  font-weight: 400;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  line-height: 1.2;
}

:deep(.editor-rich-content h2) {
  font-size: 1.65rem;
  font-weight: 400;
  margin-top: 1rem;
  margin-bottom: 0.4rem;
  line-height: 1.25;
}

:deep(.editor-rich-content blockquote) {
  border-left: 3px solid #000;
  padding-left: 1.25rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
  font-style: italic;
  opacity: 0.85;
}

:deep(.editor-rich-content pre) {
  background: #f4f4f5;
  border-radius: 4px;
  padding: 0.85rem 1.15rem;
  font-family: monospace;
  font-size: 0.95rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
  overflow-x: auto;
}

:deep(.editor-rich-content ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}
</style>
