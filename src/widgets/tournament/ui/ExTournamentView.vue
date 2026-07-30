<template>
  <Transition name="exforum-page-reify" appear>
    <div 
      class="w-full h-full flex flex-col items-center text-theme-text font-mono transition-colors duration-300 select-none relative scroll-minimal"
      :class="showLeaderboard ? 'justify-start pt-6 pb-24' : selectedEvent ? 'justify-start overflow-y-auto pt-6 pb-24' : 'justify-center overflow-hidden'"
    >
      
      <Transition name="fade-slide" mode="out-in">
        <!-- LEADERBOARD MODE: SEPARATE PAGE -->
        <div
          v-if="showLeaderboard"
          key="leaderboard-page"
          class="leaderboard-page relative flex min-h-[70vh] h-full w-full max-w-[1400px] flex-1 flex-col px-4 py-6 sm:px-8 sm:py-8"
          :class="themeStore.settings.isDark ? 'leaderboard-page--dark' : 'leaderboard-page--light'"
        >
          <div class="relative z-10 flex min-h-0 w-full flex-1 flex-col">
            <div class="relative z-10 mb-4 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4">
              <button
                type="button"
                class="leaderboard-page__muted justify-self-start font-mono text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
                @click.stop="showLeaderboard = false"
              >
                {{ locale === 'ru' ? 'Назад' : 'Back' }}
              </button>
              <div class="leaderboard-page__season-pagination flex items-center justify-center gap-3">
                <button
                  type="button"
                  class="leaderboard-page__season-button"
                  :disabled="!canShowPreviousLeaderboardSeason"
                  :aria-label="locale === 'ru' ? 'Предыдущий сезон' : 'Previous season'"
                  @click="showAdjacentLeaderboardSeason(-1)"
                >
                  ←
                </button>
                <span class="leaderboard-page__muted whitespace-nowrap font-mono text-[10px] font-black uppercase tracking-[0.2em]">
                  {{ locale === 'ru' ? 'СЕЗОН' : 'SEASON' }} {{ leaderboardSeasonRoman }}
                </span>
                <button
                  type="button"
                  class="leaderboard-page__season-button"
                  :disabled="!canShowNextLeaderboardSeason"
                  :aria-label="locale === 'ru' ? 'Следующий сезон' : 'Next season'"
                  @click="showAdjacentLeaderboardSeason(1)"
                >
                  →
                </button>
              </div>
              <span aria-hidden="true"></span>
            </div>

            <div class="relative z-10 shrink-0 text-center">
              <ExHeading level="h1" variant="cinematic" class="leaderboard-page__heading !text-3xl !leading-tight !tracking-[0.14em] sm:!text-5xl">
                {{ locale === 'ru' ? 'ЛИДЕРЫ' : 'LEADERS' }}
              </ExHeading>
            </div>

            <div v-if="!isLeaderboardNamesReady" class="relative z-10 flex min-h-0 flex-1 items-center justify-center">
              <div class="leaderboard-page__spinner h-8 w-8 animate-spin rounded-full border-2" aria-label="Loading"></div>
            </div>

            <div v-else class="leaderboard-page__table relative z-10 mt-4 flex min-h-0 flex-1 flex-col overflow-visible font-mono">
              <img
                v-if="targetEvent?.bannerUrl"
                :src="targetEvent.bannerUrl"
                alt=""
                class="leaderboard-page__image absolute inset-0 z-0 h-full w-full object-cover"
                aria-hidden="true"
              >
              <div class="leaderboard-page__table-overlay absolute inset-0 pointer-events-none" aria-hidden="true"></div>
              <ExDivider variant="tactical" spacing="none" class="leaderboard-page__table-edge-divider leaderboard-page__table-edge-divider--top" />
              <div v-if="leaderboardEntries.length" class="leaderboard-page__rows relative z-10 min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
                <div class="leaderboard-page__table-header sticky top-0 z-10">
                  <div class="leaderboard-page__table-row leaderboard-page__table-grid leaderboard-page__muted min-w-0 py-2 text-[8px] font-black uppercase tracking-[0.12em]">
                    <span>#</span>
                    <span class="text-left">{{ locale === 'ru' ? 'УЧАСТНИК' : 'PARTICIPANT' }}</span>
                    <span class="text-right">{{ locale === 'ru' ? 'ПРЕДИКТЫ' : 'PREDICTS' }}</span>
                    <span class="text-right">{{ locale === 'ru' ? 'ВЕРНЫЕ' : 'CORRECT' }}</span>
                    <span class="text-right">{{ locale === 'ru' ? 'ОЧКИ' : 'POINTS' }}</span>
                    <span class="text-right">{{ locale === 'ru' ? 'ПРИЗ' : 'PRIZE' }}</span>
                  </div>
                  <ExDivider variant="simple" spacing="none" class="leaderboard-page__table-divider" />
                </div>
                <div
                  v-for="(entry, index) in leaderboardEntries"
                  :key="entry.userId"
                  class="leaderboard-page__table-row leaderboard-page__table-grid leaderboard-page__participant min-w-0 items-center py-3 text-xs sm:text-sm"
                  :class="{
                    'leaderboard-page__top-row': index < 3,
                    'leaderboard-page__top-row--first': index === 0,
                    'leaderboard-page__top-row--second': index === 1,
                    'leaderboard-page__top-row--third': index === 2
                  }"
                >
                  <span class="leaderboard-page__muted">{{ String(index + 1).padStart(2, '0') }}</span>
                  <div class="leaderboard-page__participant-identity min-w-0 flex items-center gap-3">
                    <div class="leaderboard-page__participant-avatar shrink-0 overflow-hidden">
                      <img
                        v-if="hasLeaderboardAvatar(entry.userId)"
                        :src="leaderboardPhotoUrls[entry.userId]"
                        :alt="leaderboardDisplayNames[entry.userId] || entry.userId"
                        referrerpolicy="no-referrer"
                        @error="markLeaderboardAvatarFailed(entry.userId)"
                        class="h-full w-full object-cover"
                      >
                      <span v-else>
                        {{ (leaderboardDisplayNames[entry.userId] || entry.userId).charAt(0).toUpperCase() }}
                      </span>
                    </div>
                    <div class="min-w-0">
                      <span
                        class="block min-w-0 truncate text-left font-black tracking-[0.06em]"
                        :class="index < 2 ? 'leaderboard-page__top-name' : ''"
                      >
                        {{ leaderboardDisplayNames[entry.userId] || entry.userId }}
                      </span>
                      <span v-if="getLeaderboardAssetStats(entry).length" class="leaderboard-page__asset-stats">
                        <span v-for="assetStat in getLeaderboardAssetStats(entry)" :key="assetStat.assetId">
                          {{ assetStat.asset }} {{ assetStat.correctPredictions }}/{{ assetStat.totalPredictions }}
                        </span>
                      </span>
                    </div>
                  </div>
                  <span class="text-right font-black tracking-[0.1em]">{{ getLeaderboardTotalPredictions(entry) }}</span>
                  <span class="text-right font-black tracking-[0.1em]">{{ getLeaderboardCorrectPredictions(entry) }}</span>
                  <span class="text-right font-black tracking-[0.1em]">{{ entry.points }}</span>
                  <span class="text-right font-black tracking-[0.1em]">{{ entry.prize || '—' }}</span>
                </div>
              </div>
              <div v-else class="leaderboard-page__muted relative z-10 flex min-h-0 flex-1 items-center justify-center text-[9px] font-black uppercase tracking-[0.18em]">
                {{ locale === 'ru' ? 'Пока нет участников' : 'No participants yet' }}
              </div>
              <ExDivider variant="tactical" spacing="none" class="leaderboard-page__table-edge-divider leaderboard-page__table-edge-divider--bottom" />
            </div>
          </div>
        </div>

        <!-- CAROUSEL MODE: PURE BANNER VIEW -->
        <div v-else-if="!selectedEvent" key="carousel" class="w-full max-w-[1400px] mx-auto flex flex-col items-center justify-center my-auto px-3 sm:px-6">
      
      <!-- INITIAL DATA LOADING -->
      <div v-if="!isEventDataReady" class="flex min-h-[280px] w-full items-center justify-center">
        <div
          class="h-10 w-10 animate-spin rounded-full border-2"
          :class="themeStore.settings.isDark ? 'border-white/20 border-t-white' : 'border-black/20 border-t-black'"
          aria-label="Loading"
        ></div>
      </div>

      <div v-else class="contents">
        <!-- EMPTY STATE IF NO EVENTS -->
        <div v-if="!activeEvent" key="empty-state" class="p-12 text-center text-theme-text/60 font-mono text-sm uppercase tracking-widest border border-theme-border/40">
          [ SYSTEM // NO COMPETITION PROTOCOLS ACTIVE ]
        </div>

        <!-- CAROUSEL WRAPPER -->
        <div v-else key="event-carousel" class="w-full flex items-center justify-between gap-3 sm:gap-6 md:gap-8">
        <!-- PREV BUTTON (OUTSIDE CONTAINER, NO BORDER) -->
        <button
          @click.stop="prevSlide"
          :disabled="isSingleEvent"
          class="carousel-event-nav flex items-center justify-center text-theme-text/60 hover:text-theme-text transition-all duration-300 disabled:opacity-15 disabled:cursor-default cursor-pointer group/prev shrink-0 focus:outline-none"
        >
          <svg class="carousel-event-nav-icon transform group-hover/prev:-translate-x-1.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>

        <!-- CAROUSEL BANNER STAGE (STRICTLY CENTERED) -->
        <div class="flex-1 w-full min-w-0 overflow-hidden">
          <Transition :name="slideDirection" mode="out-in">
            <div 
              :key="activeEvent.id || 'slide'" 
              class="carousel-event-card relative w-full shrink-0 border border-theme-border overflow-hidden bg-black group shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col justify-end"
            >
              <!-- BACKGROUND IMAGE -->
              <img 
                :src="activeEvent.bannerUrl || activeEvent.imageUrl" 
                :alt="getEventTitle(activeEvent)"
                class="absolute inset-0 w-full h-full object-cover object-center transform transition-transform duration-1000 group-hover:scale-105 opacity-85"
              />

              <!-- DARK TECH GRADIENT & SCANLINES -->
              <div class="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/20 pointer-events-none"></div>
              <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none opacity-40"></div>

              <!-- HUD CORNERS (Tactical Gothic Decor) -->
              <div class="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-white/50 pointer-events-none z-10"></div>
              <div class="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-white/50 pointer-events-none z-10"></div>
              <div class="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-white/50 pointer-events-none z-10"></div>
              <div class="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-white/50 pointer-events-none z-10"></div>

              <!-- BANNER OVERLAY CONTENT -->
              <div key="banner-content" class="carousel-event-content relative z-20 max-w-4xl flex flex-col items-start">
                <!-- EVENT TYPE BADGE -->
                <div v-if="activeEvent.type !== 'classic'" class="flex items-center gap-3">
                  <span class="carousel-event-badge font-mono uppercase border border-white/40 bg-black/40 text-white/90 backdrop-blur-sm">
                    {{ activeEvent.type === 'classic' ? (t('tournament.types.classic') || 'CLASSIC') : (t('tournament.types.limited') || 'LIMITED') }}
                  </span>
                </div>

                <!-- CURRENT SEASON -->
                <div v-if="openedSeason?.id" class="carousel-event-season font-mono font-black uppercase text-white/75">
                  {{ locale === 'ru' ? 'СЕЗОН' : 'SEASON' }} {{ currentSeasonRoman }}
                </div>

                <!-- EVENT TITLE -->
                <ExHeading 
                  level="h1" 
                  variant="cinematic" 
                  class="carousel-event-title !text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] !leading-tight !mb-0"
                >
                  {{ getEventTitle(activeEvent) }}
                </ExHeading>

                <!-- TRUNCATED DESCRIPTION -->
                <p class="carousel-event-description font-mono text-white/85 line-clamp-2 sm:line-clamp-3 overflow-hidden text-ellipsis leading-relaxed tracking-wide max-w-3xl drop-shadow">
                  {{ getEventDescription(activeEvent) }}
                </p>

                <!-- ENTER EVENT BUTTON ("ПЕРЕЙТИ В СОБЫТИЕ") -->
                <div class="carousel-event-actions flex flex-wrap items-center">
                  <button
                    @click="selectEvent(activeEvent)"
                    class="carousel-event-button border-2 border-white bg-white text-black font-mono uppercase font-black transition-all duration-300 hover:bg-black/80 hover:text-white hover:border-white shadow-[0_0_30px_rgba(255,255,255,0.4)] cursor-pointer flex items-center group/enter"
                  >
                    <span>{{ t('tournament.enterEvent') || 'ENTER EVENT' }}</span>
                    <svg class="carousel-event-button-icon transform group-hover/enter:translate-x-1.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>

                  <button
                    v-if="isUserRegistered"
                    type="button"
                    class="carousel-event-button border-2 border-white/75 bg-black/25 font-mono font-black uppercase text-white backdrop-blur-sm transition-all duration-300 hover:bg-white hover:text-black hover:border-white"
                    @click.stop="showLeaderboard = true"
                  >
                    {{ locale === 'ru' ? 'ЛИДЕРЫ' : 'LEADERS' }}
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- NEXT BUTTON (OUTSIDE CONTAINER, NO BORDER) -->
        <button
          @click.stop="nextSlide"
          :disabled="isSingleEvent"
          class="carousel-event-nav flex items-center justify-center text-theme-text/60 hover:text-theme-text transition-all duration-300 disabled:opacity-15 disabled:cursor-default cursor-pointer group/next shrink-0 focus:outline-none"
        >
          <svg class="carousel-event-nav-icon transform group-hover/next:translate-x-1.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        </div>
      </div>
    </div>

        <!-- DETAIL MODE: TACTICAL EVENT BRIEFING -->
        <div v-else key="detail" class="w-full h-full min-h-0 max-w-[1400px] mx-auto flex flex-col px-3 sm:px-6">
      <div v-if="!isEventDataReady" class="flex min-h-[70vh] w-full flex-1 items-center justify-center">
        <div
          class="h-10 w-10 animate-spin rounded-full border-2"
          :class="themeStore.settings.isDark ? 'border-white/20 border-t-white' : 'border-black/20 border-t-black'"
          aria-label="Loading"
        ></div>
      </div>

      <template v-if="isEventDataReady && !isUserRegistered">
      
      <!-- TOP NAVIGATION -->
      <div class="mb-4 flex items-center justify-between">
        <button 
          @click="selectedEvent = null" 
          class="inline-flex items-center space-x-2 text-xs font-mono text-theme-text/70 hover:text-theme-text transition-colors uppercase tracking-[0.2em] font-bold group/back cursor-pointer"
        >
          <svg class="w-4 h-4 transform group-hover/back:-translate-x-1 transition-transform shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span>{{ locale === 'ru' ? 'НАЗАД' : 'BACK' }}</span>
        </button>
        <span 
          v-if="targetEvent?.type !== 'classic'"
          class="px-3 py-1 text-[10px] font-mono font-black uppercase tracking-[0.25em] border border-theme-text/30 text-theme-text"
        >
          {{ targetEvent?.type === 'classic' ? (t('tournament.types.classic') || 'CLASSIC') : (t('tournament.types.limited') || 'LIMITED') }}
        </span>
      </div>

      <!-- CROPPED TOP BANNER (~75px) -->
      <div class="relative w-full h-[75px] min-h-[75px] shrink-0 border border-theme-border overflow-hidden mb-14 bg-black/80">
        <img 
          :src="targetEvent?.bannerUrl || targetEvent?.imageUrl" 
          :alt="getEventTitle(targetEvent)" 
          class="block w-full h-full object-cover object-center opacity-90"
        />
        <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none opacity-40"></div>
      </div>

      <!-- TOURNAMENT TITLE & SUBTITLE (Centered) -->
      <div class="mb-14 flex flex-col items-center justify-center text-center space-y-4 w-full mx-auto">
        <ExHeading 
          level="h1" 
          variant="cinematic" 
          class="!text-3xl sm:!text-4xl md:!text-5xl !text-theme-text !leading-tight !mb-1 !p-0 !text-center w-full"
        >
          {{ getEventTitle(targetEvent) }}
        </ExHeading>
        <p v-if="getEventSubtitle(targetEvent)" class="text-xs sm:text-sm font-mono uppercase tracking-[0.18em] text-theme-text/70 text-center">
          {{ getEventSubtitle(targetEvent) }}
        </p>
      </div>

      <!-- DESCRIPTION -->
      <div class="mb-16">
        <p class="text-sm sm:text-base font-mono leading-relaxed text-theme-text/85 text-justify tracking-wide">
          {{ getEventDescription(targetEvent) }}
        </p>
      </div>

      <!-- PRIZE POOL (Centered with ExDividers & Pearlescent Animated Gradient) -->
      <div class="mb-20 w-full">
        <ExDivider variant="tactical" spacing="none" />
        <div 
          class="py-12 flex flex-col items-center justify-center text-center relative px-4 overflow-hidden transition-colors duration-300"
          :class="!themeStore.settings.isDark ? 'bg-black/[0.55]' : ''"
        >
          <!-- Ambient Pearlescent Glow -->
          <div class="absolute inset-0 w-3/4 h-full mx-auto pearlescent-bg blur-3xl opacity-20 pointer-events-none -z-10"></div>
          
          <span 
            class="text-[10px] sm:text-xs font-mono uppercase tracking-[0.35em] font-bold mb-3 block transition-colors duration-300"
            :class="!themeStore.settings.isDark ? 'text-white' : 'text-theme-text/60'"
          >
            {{ locale === 'ru' ? 'ПРИЗОВОЙ ФОНД // НАГРАДЫ И АЛЛОКАЦИИ' : 'PRIZE POOL // REWARDS & ALLOCATION' }}
          </span>

          <div class="text-xl sm:text-2xl md:text-3xl font-mono font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] leading-relaxed max-w-4xl pearlescent-text px-2">
            {{ getEventPrizePool(targetEvent) }}
          </div>
        </div>
        <ExDivider variant="tactical" spacing="none" />
      </div>

      <!-- RULES (Unboxed minimalist typography with blur gradient when collapsed) -->
      <div class="mb-20 space-y-6">
        <div class="text-xs font-mono uppercase tracking-[0.2em] font-bold text-theme-text/60">
          {{ locale === 'ru' ? 'ПРАВИЛА И РЕГЛАМЕНТ:' : 'RULES & REGULATIONS:' }}
        </div>
        <div class="relative">
          <div class="space-y-4 font-mono text-xs sm:text-sm text-theme-text/85">
            <div 
              v-for="(rule, idx) in visibleRules" 
              :key="idx" 
              class="flex items-start space-x-3"
              :class="(!showAllRules && idx === 1) ? 'blur-[2px] opacity-35 select-none pointer-events-none' : ''"
            >
              <span class="text-theme-text/50 font-bold shrink-0 mt-0.5">0{{ idx + 1 }}.</span>
              <span class="leading-relaxed">{{ rule }}</span>
            </div>
          </div>
        </div>
        <div v-if="getEventRules(targetEvent).length > 2">
          <button 
            @click="showAllRules = !showAllRules" 
            class="text-xs font-mono uppercase text-theme-text/70 hover:text-theme-text underline decoration-theme-text/30 underline-offset-4 tracking-widest cursor-pointer transition-colors mt-1"
          >
            {{ showAllRules ? (locale === 'ru' ? 'СКРЫТЬ' : 'HIDE') : (locale === 'ru' ? 'ПОКАЗАТЬ ВСЕ' : 'SHOW ALL') }}
          </button>
        </div>
      </div>

      <!-- REGISTRATION STAGE OR PARTICIPANT PAGE -->
      <Transition name="registration-stage" mode="out-in">
        <!-- CENTERED REGISTRATION & AGREEMENT STAGE (Monochrome White & Black) -->
        <div v-if="!isUserRegistered" key="registration" class="w-full flex flex-col items-center justify-center pt-12 pb-12 mt-6 border-t border-theme-border/30 text-center">
          <!-- CUSTOM CHECKBOX FOR AGREEMENT -->
          <label
            class="flex items-center space-x-3 cursor-pointer select-none mb-6 text-xs font-mono uppercase tracking-[0.1em] text-theme-text/80 hover:text-theme-text transition-colors"
          >
            <div
              class="w-4 h-4 border border-theme-text/60 flex items-center justify-center transition-colors duration-200 shrink-0"
              :class="isAgreed ? 'bg-theme-text text-theme-bg' : 'bg-transparent text-transparent'"
            >
              <svg class="w-3 h-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
            </div>
            <input type="checkbox" v-model="isAgreed" class="hidden" />
            <span>{{ locale === 'ru' ? 'Я соглашаюсь с правилами турнира' : 'I agree to the tournament rules' }}</span>
          </label>

          <!-- CENTERED BUTTON & TIMER TO THE RIGHT -->
          <div class="flex flex-col sm:flex-row items-center justify-center gap-6">
            <!-- REGISTER BUTTON (Dark in light theme, White in dark theme) -->
            <button
              @click="handleRegister"
              :disabled="isRegistering || !isAgreed || !isEventStarted"
              class="px-10 py-4 font-mono text-xs sm:text-sm uppercase font-black tracking-[0.25em] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-sm border"
              :class="!themeStore.settings.isDark ? 'bg-black text-white border-black hover:bg-white hover:text-black hover:border-black' : 'bg-white text-black border-white hover:bg-black hover:text-white hover:border-white'"
            >
              {{ !isEventStarted ? (locale === 'ru' ? 'ДОСТУПНО ПОСЛЕ СТАРТА' : 'LOCKED UNTIL START') : isRegistering ? (locale === 'ru' ? 'РЕГИСТРАЦИЯ...' : 'REGISTERING...') : (locale === 'ru' ? 'ЗАРЕГИСТРИРОВАТЬСЯ' : 'REGISTER') }}
            </button>

            <!-- COUNTDOWN TIMER (if event hasn't started yet) -->
            <div
              v-if="!isEventStarted && timeUntilStart > 0"
              class="flex flex-col items-start text-left font-mono border-l border-theme-text/30 pl-4 py-1"
            >
              <span class="text-[9px] uppercase tracking-[0.2em] text-theme-text/50">{{ locale === 'ru' ? 'ДО НАЧАЛА СОБЫТИЯ:' : 'STARTS IN:' }}</span>
              <span class="text-sm font-black text-theme-text tracking-[0.15em] mt-0.5">{{ formattedCountdown }}</span>
            </div>
          </div>
        </div>

        <!-- EMPTY PARTICIPANT PAGE; CONTENT WILL BE ADDED LATER -->
        <div v-else key="participant-page" class="w-full min-h-[420px] mt-6 border-t border-theme-border/30" aria-label="Participant page"></div>
      </Transition>

      </template>
      <div v-if="isEventDataReady && isUserRegistered" class="contents">
      <div v-if="!isVotingDataReady" class="flex min-h-[70vh] w-full flex-1 items-center justify-center">
        <div
          class="h-10 w-10 animate-spin rounded-full border-2"
          :class="themeStore.settings.isDark ? 'border-white/20 border-t-white' : 'border-black/20 border-t-black'"
          aria-label="Loading"
        ></div>
      </div>

      <div
        v-if="isVotingDataReady"
        key="registered-event-page"
        class="registered-event-page relative flex h-full w-full flex-1 min-h-0 flex-col px-4 sm:px-8 md:px-12"
        :class="themeStore.settings.isDark ? 'registered-event-page--dark text-white' : 'registered-event-page--light text-black'"
        aria-label="Participant page"
      >
        <div class="relative z-20 mb-4 flex shrink-0 items-start">
          <button
            type="button"
            class="registered-back-button registered-muted font-mono text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
            @click.stop="selectedEvent = null"
          >
            {{ locale === 'ru' ? 'Назад' : 'Back' }}
          </button>
        </div>

        <div
          v-if="!displayedRound || isRoundCancellationRequested"
          class="registered-fg relative z-10 flex min-h-[420px] w-full flex-1 items-center justify-center px-4 text-center"
        >
          <div class="font-mono text-3xl font-black uppercase leading-tight tracking-[0.12em] sm:text-5xl lg:text-6xl">
            <span class="block">
              {{
                isRoundCancellationRequested
                  ? (locale === 'ru' ? 'РАУНД ОТМЕНЕН' : 'ROUND CANCELLED')
                  : (locale === 'ru' ? 'СОБЫТИЕ ЗАВЕРШЕНО' : 'EVENT COMPLETED')
              }}
            </span>
            <span class="registered-muted mt-5 block text-[0.52em] tracking-[0.18em]">
              {{
                isRoundCancellationRequested
                  ? (locale === 'ru' ? 'СЛЕДУЮЩИЙ РАУНД НАЧНЕТСЯ СОВСЕМ СКОРО' : 'NEXT ROUND STARTS SOON')
                  : (locale === 'ru' ? 'НОВОЕ СОБЫТИЕ НА ПОДХОДЕ' : 'NEW EVENT INCOMING')
              }}
            </span>
          </div>
        </div>

        <div v-if="displayedRound && !isRoundCancellationRequested && entranceDecisionReady && !showEntranceAnimation && targetEvent?.imageUrl" class="registered-voting-backdrop absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <img
            :src="targetEvent.imageUrl"
            alt=""
            class="h-full w-full object-cover"
          >
        </div>

        <Transition v-if="displayedRound && !isRoundCancellationRequested" name="season-entry" mode="out-in">
          <div v-if="!entranceDecisionReady" key="season-entry-wait" class="absolute inset-0 h-full w-full"></div>
          <div
            v-else-if="showEntranceAnimation"
            key="season-entry-animation"
            class="absolute inset-0 z-10 flex min-h-[420px] w-full items-center justify-center text-center"
            :class="themeStore.settings.isDark ? 'text-white' : 'text-black'"
          >
            <Transition name="season-stage" mode="out-in">
              <div v-if="introStage === 'season'" key="season-stage" class="flex flex-col items-center">
                <ExHeading
                  level="h1"
                  variant="cinematic"
                  class="!text-7xl !leading-none !tracking-[0.12em] sm:!text-9xl"
                  :class="themeStore.settings.isDark ? '!text-white' : '!text-black'"
                >
                  {{ locale === 'ru' ? 'СЕЗОН' : 'SEASON' }} {{ currentSeasonRoman }}
                </ExHeading>
              </div>
              <div v-else key="round-stage" class="flex flex-col items-center">
                <ExHeading
                  level="h1"
                  variant="technical"
                  class="!text-8xl !leading-none !tracking-[0.12em] sm:!text-[10rem]"
                  :class="themeStore.settings.isDark ? '!text-white' : '!text-black'"
                >
                  {{ locale === 'ru' ? 'РАУНД' : 'ROUND' }} {{ currentRound }}
                </ExHeading>
              </div>
            </Transition>
          </div>
        </Transition>

        <div class="hidden">
          <div class="flex items-center justify-between gap-4">
            <ExTag variant="outline" class="!border-white/40 !text-white !opacity-100">
              {{ locale === 'ru' ? 'УЧАСТНИК ПОДТВЕРЖДЕН' : 'PARTICIPANT CONFIRMED' }}
            </ExTag>
            <ExText variant="small" class="!text-white !opacity-40 text-right">
              {{ locale === 'ru' ? 'СЕРВЕРНЫЕ ДАННЫЕ // UTC' : 'SERVER DATA // UTC' }}
            </ExText>
          </div>

          <ExDivider variant="tactical" spacing="lg" />

          <div class="space-y-5">
            <ExText variant="telemetry" class="!text-white !opacity-45">
              {{ locale === 'ru' ? 'ТЕКУЩЕЕ СОБЫТИЕ' : 'CURRENT EVENT' }}
            </ExText>
            <ExHeading level="h1" variant="cinematic" class="!text-3xl !leading-tight !tracking-[0.18em] !text-white sm:!text-5xl">
              {{ getEventTitle(targetEvent) }}
            </ExHeading>
          </div>

          <ExDivider variant="tactical" spacing="lg" />

          <div class="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div class="border-l border-white/25 pl-5">
              <ExText variant="telemetry" class="!text-white !opacity-45">
                {{ locale === 'ru' ? 'ТЕКУЩИЙ РАУНД' : 'CURRENT ROUND' }}
              </ExText>
              <div class="mt-4 font-mono text-5xl font-black tracking-[0.12em] text-white">{{ currentRound }}</div>
              <ExText variant="small" class="mt-3 !text-white !opacity-40">
                {{ locale === 'ru' ? '24 ЧАСА // СЕРВЕРНЫЙ ЦИКЛ' : '24 HOURS // SERVER CYCLE' }}
              </ExText>
            </div>

            <div class="border-l border-white/25 pl-5">
              <ExText variant="telemetry" class="!text-white !opacity-45">
                {{ locale === 'ru' ? 'ТЕКУЩИЙ СЕЗОН' : 'CURRENT SEASON' }}
              </ExText>
              <div class="mt-4 font-mono text-2xl font-black uppercase tracking-[0.12em] text-white">{{ currentSeasonRoman }}</div>
              <div class="mt-5 space-y-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/65">
                <div class="flex items-center justify-between gap-4 border-b border-white/15 pb-2">
                  <span>{{ locale === 'ru' ? 'НАЧАЛО' : 'STARTS' }}</span>
                  <span class="text-right text-white">{{ formattedSeasonStart }}</span>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <span>{{ locale === 'ru' ? 'ОКОНЧАНИЕ' : 'ENDS' }}</span>
                  <span class="text-right text-white">{{ formattedSeasonEnd }}</span>
                </div>
              </div>
            </div>
          </div>

          <ExDivider variant="simple" spacing="lg" />

          <div class="flex flex-col gap-2 font-mono sm:flex-row sm:items-center sm:justify-between">
            <ExText variant="telemetry" class="!text-white !opacity-45">
              {{ locale === 'ru' ? 'ТЕКУЩЕЕ СЕРВЕРНОЕ ВРЕМЯ' : 'CURRENT SERVER TIME' }}
            </ExText>
            <span class="text-xs font-black tracking-[0.18em] text-white sm:text-sm">{{ formattedServerDate }}</span>
          </div>
        </div>

        <div v-if="displayedRound && !isRoundCancellationRequested && entranceDecisionReady && !showEntranceAnimation" class="relative z-0 flex h-full w-full min-h-0 flex-1 flex-col items-start text-left">
          <div class="registered-fg font-mono text-4xl font-black uppercase tracking-[0.12em] sm:text-6xl">
            {{ locale === 'ru' ? 'СЕЗОН' : 'SEASON' }} {{ currentSeasonRoman }}
          </div>

          <div class="registered-fg mt-8 font-mono text-sm font-black uppercase tracking-[0.16em] sm:text-base">
            {{ locale === 'ru' ? 'ДО' : 'UNTIL' }} {{ formattedSeasonEnd }}
          </div>

          <div class="registered-fg absolute right-0 top-0 text-right font-mono text-4xl font-black uppercase tracking-[0.12em] sm:text-6xl">
            {{ locale === 'ru' ? 'РАУНД' : 'ROUND' }} {{ currentRound }}
            <div v-if="votingCompleted" class="registered-muted mt-3 font-mono text-[10px] font-black uppercase tracking-[0.22em] sm:text-xs">
              {{ locale === 'ru' ? 'ГОЛОСОВАНИЕ ЗАВЕРШЕНО' : 'VOTING COMPLETED' }}
            </div>
          </div>

          <div class="mt-20 flex w-full min-h-0 flex-1 flex-col items-stretch gap-4 sm:flex-row sm:justify-between">
            <div class="registered-voting-panel-column min-w-0 w-full sm:w-1/2 sm:flex-none">
              <ExPanel
                variant="light"
                :show-corners="true"
                :no-padding="true"
                :no-shadow="true"
                :style="{ backgroundColor: votingSurfaceColor }"
                class="registered-voting-panel w-full"
              >
              <div class="flex h-full min-h-[280px] flex-col px-4 py-3">
                <div class="mb-3 flex flex-wrap items-center gap-5">
                  <span class="registered-fg font-mono text-[10px] font-black tracking-[0.12em]">
                    {{ locale === 'ru' ? 'Выберите актив' : 'Select asset' }}
                  </span>

                  <div class="registered-muted flex items-center gap-1.5 font-mono text-[9px] font-black tracking-[0.08em]">
                    <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                      <circle cx="12" cy="12" r="8.5" />
                      <path d="M12 7v5l3.5 2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <span v-if="votingCompleted">{{ locale === 'ru' ? 'Закрыто' : 'Closed' }}</span>
                    <span v-else>
                      {{
                        votingPending
                          ? (locale === 'ru' ? 'Откроется через' : 'Opens in')
                          : (locale === 'ru' ? 'Закроется через' : 'Closes in')
                      }}
                      {{ formattedVotingCountdown }}
                    </span>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <div
                    v-for="asset in allowedTournamentAssets"
                    :key="asset.key"
                    class="registered-asset-chip group flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 border px-1.5 py-2 text-center"
                    :class="[
                      selectedAssetKey === asset.key ? 'registered-asset-chip--selected' : '',
                      getAssetVoteClass(asset)
                    ]"
                    :aria-pressed="selectedAssetKey === asset.key"
                    role="button"
                    tabindex="0"
                    @click="selectAsset(asset.key)"
                    @keydown.enter.prevent="selectAsset(asset.key)"
                    @keydown.space.prevent="selectAsset(asset.key)"
                  >
                    <span
                      v-if="asset.isForex"
                      class="registered-forex-icon registered-forex-icon--small shrink-0"
                      :aria-label="asset.name"
                    >
                      <img
                        v-if="asset.baseIcon"
                        :src="asset.baseIcon"
                        :alt="asset.baseCurrency"
                        class="registered-forex-flag registered-forex-flag--base"
                      >
                      <img
                        v-if="asset.quoteIcon"
                        :src="asset.quoteIcon"
                        :alt="asset.quoteCurrency"
                        class="registered-forex-flag registered-forex-flag--quote"
                      >
                    </span>
                    <img
                      v-else-if="asset.icon"
                      :src="asset.icon"
                      :alt="asset.name"
                      class="registered-asset-icon h-7 w-7 shrink-0 object-contain"
                    >
                    <span v-else class="registered-muted flex h-7 w-7 shrink-0 items-center justify-center font-mono text-[10px] font-black">
                      {{ asset.name.charAt(0) }}
                    </span>
                    <span class="registered-fg max-w-full line-clamp-2 font-mono text-[8px] font-black uppercase leading-tight tracking-[0.12em]">
                      {{ asset.name }}
                    </span>
                  </div>

                  <div
                    class="registered-asset-chip registered-asset-chip--soon flex h-20 w-20 shrink-0 flex-col items-center justify-center border px-1.5 py-2 text-center"
                    aria-disabled="true"
                  >
                    <span class="font-mono text-[8px] font-black uppercase tracking-[0.12em]">
                      {{ locale === 'ru' ? 'Скоро' : 'Soon' }}
                    </span>
                  </div>
                </div>

              </div>
              </ExPanel>

              <button
                type="button"
                class="registered-rules-button mt-3 border px-2.5 py-1.5 font-mono text-[8px] font-black uppercase tracking-[0.18em] transition-all duration-200"
                :aria-pressed="showVotingRules"
                @click="showVotingRules = !showVotingRules"
              >
                {{ showVotingRules
                  ? (locale === 'ru' ? 'К голосованию' : 'Back to voting')
                  : (locale === 'ru' ? 'Правила' : 'Rules')
                }}
              </button>
            </div>

            <div
              class="registered-selected-asset-card min-w-0 w-full sm:w-2/5 sm:flex-none"
              :class="showVotingRules ? 'registered-selected-asset-card--rules' : ''"
            >
              <Transition name="registered-rules-reveal" mode="out-in">
              <div v-if="showVotingRules" key="voting-rules" class="registered-rules-card scroll-minimal flex h-full min-h-[280px] flex-col overflow-y-auto">
                <div class="registered-fg font-mono text-xl font-black uppercase tracking-[0.12em] sm:text-2xl">
                  {{ locale === 'ru' ? 'Правила оценки' : 'Scoring rules' }}
                </div>
                <ol v-if="votingRules.length" class="mt-6 space-y-0">
                  <li v-for="rule in votingRules" :key="rule.number" class="registered-rule flex gap-4 py-4">
                    <span class="registered-muted shrink-0 font-mono text-[10px] font-black tracking-[0.14em]">{{ rule.number }}</span>
                    <span class="registered-fg font-mono text-sm font-semibold leading-relaxed tracking-[0.035em] sm:text-base">
                      {{ rule.text }}
                    </span>
                  </li>
                </ol>
                <p v-else class="registered-muted mt-6 font-mono text-xs font-semibold uppercase tracking-[0.12em]">
                  {{ locale === 'ru' ? 'Правила сезона не добавлены' : 'Season rules are not configured' }}
                </p>
              </div>

              <div v-else-if="selectedAsset" key="selected-asset" class="flex h-full min-h-[280px] flex-col">
                <div class="flex items-start gap-5">
                <span
                  v-if="selectedAsset.isForex"
                  class="registered-forex-icon registered-forex-icon--large shrink-0"
                  :aria-label="selectedAsset.name"
                >
                  <img
                    v-if="selectedAsset.baseIcon"
                    :src="selectedAsset.baseIcon"
                    :alt="selectedAsset.baseCurrency"
                    class="registered-forex-flag registered-forex-flag--base"
                  >
                  <img
                    v-if="selectedAsset.quoteIcon"
                    :src="selectedAsset.quoteIcon"
                    :alt="selectedAsset.quoteCurrency"
                    class="registered-forex-flag registered-forex-flag--quote"
                  >
                </span>
                <img
                  v-else-if="selectedAsset.icon"
                  :src="selectedAsset.icon"
                  :alt="selectedAsset.name"
                  class="h-20 w-20 shrink-0 object-contain"
                >
                <span v-else class="registered-muted flex h-20 w-20 shrink-0 items-center justify-center font-mono text-2xl font-black">
                  {{ selectedAsset.name.charAt(0) }}
                </span>
                <span class="registered-fg max-w-full pt-1 font-mono text-xl font-black leading-tight tracking-[0.1em] sm:text-2xl">
                  {{ selectedAsset.name }}
                  <span v-if="selectedAsset.type" class="registered-muted mt-1 block text-sm font-medium uppercase tracking-[0.16em] opacity-65">
                    {{ selectedAsset.type }}
                  </span>
                </span>
                </div>

                <div class="mt-4">
                  <div class="registered-vote-track relative mx-1 h-[20px]">
                    <div
                      class="registered-vote-long absolute inset-y-0 left-0"
                      :style="{ width: `${longVotePercentage}%` }"
                    ></div>
                    <div
                      class="registered-vote-short absolute inset-y-0 right-0"
                      :style="{ width: `${shortVotePercentage}%` }"
                    ></div>
                    <div
                      class="registered-vote-marker absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2"
                      :style="{ left: `${voteSplitPercentage}%` }"
                    ></div>
                  </div>

                  <div class="mt-3 flex items-center justify-between px-1 font-mono text-[10px] font-black tracking-[0.12em]">
                    <span class="registered-vote-long-text">{{ longVotePercentage }}% Long</span>
                    <span class="registered-vote-short-text">Short {{ shortVotePercentage }}%</span>
                  </div>

                  <p class="registered-vote-guidance mt-3 px-1 font-mono text-[20px] font-bold leading-relaxed tracking-[0.08em]">
                    {{ votingGuidance }}
                  </p>

                </div>

                <div class="mt-auto flex w-full gap-2 pt-6">
                  <button
                    type="button"
                    class="registered-vote-action min-w-0 flex-1 border px-3 py-3 font-mono text-xs font-black uppercase tracking-[0.2em] transition-all duration-200"
                    :class="currentUserPrediction === 'LONG' ? 'registered-vote-action--selected' : ''"
                    :style="getVoteButtonStyle('LONG')"
                    :aria-pressed="currentUserPrediction === 'LONG'"
                    :disabled="!isVotingOpen || isSubmittingPrediction || Boolean(currentUserPrediction)"
                    @click="handleVote('LONG')"
                  >
                    Long
                  </button>
                  <button
                    type="button"
                    class="registered-vote-action min-w-0 flex-1 border px-3 py-3 font-mono text-xs font-black uppercase tracking-[0.2em] transition-all duration-200"
                    :class="currentUserPrediction === 'SHORT' ? 'registered-vote-action--selected' : ''"
                    :style="getVoteButtonStyle('SHORT')"
                    :aria-pressed="currentUserPrediction === 'SHORT'"
                    :disabled="!isVotingOpen || isSubmittingPrediction || Boolean(currentUserPrediction)"
                    @click="handleVote('SHORT')"
                  >
                    Short
                  </button>
                </div>
              </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>

    </div>
      </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import ExButton from '~/shared/ui/ExButton.vue'
import ExDivider from '~/shared/ui/ExDivider.vue'
import ExHeading from '~/shared/ui/ExHeading.vue'
import ExPanel from '~/shared/ui/ExPanel.vue'
import ExTag from '~/shared/ui/ExTag.vue'
import ExText from '~/shared/ui/ExText.vue'
import { useI18n } from '~/shared/i18n/useI18n'
import { useAuthStore } from '~/entities/user/auth.store'
import { useThemeStore } from '~/features/store/useTheme'
import globalAssets from '~/shared/data/global_assets.json'
import type {
  TournamentEvent,
  TournamentLeaderboardEntry,
  TournamentPrediction,
  TournamentRound
} from '~/widgets/tournament/model/tournament.types'
import type { TournamentPredictionDirection } from '~/entities/tournament/model/tournament-prediction.types'
import {
  allTournaments,
  openedSeason,
  tournamentSeasons,
  selectedLeaderboardSeasonId,
  openedSeasonRounds,
  isTournamentLoading,
  isRegistering,
  isUserRegistered,
  leaderboardEntries,
  leaderboardDisplayNames,
  leaderboardPhotoUrls,
  isLeaderboardNamesReady,
  isSeasonsReady,
  isRoundsReady,
  isLeaderboardReady,
  isParticipantStatusReady,
  participantServerTimeOffset,
  isParticipantServerTimeReady,
  checkRegistrationOpen,
  toMillis,
  initTournamentListener,
  initSeasonsListener,
  initParticipantListener,
  selectLeaderboardSeason,
  terminateTournamentListeners,
  registerForTournament
} from '~/widgets/tournament/model/useTournament'
import {
  initTournamentPredictionsListener,
  isPredictionsReady,
  predictionsForRound,
  submitTournamentPrediction,
  terminateTournamentPredictionsListener
} from '~/entities/tournament/model/useTournamentPredictions'

const emit = defineEmits(['exit'])
const { t, locale } = useI18n()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const votingSurfaceColor = computed(() => {
  return themeStore.settings.isDark
    ? 'rgba(0, 0, 0, 0.55)'
    : 'rgba(255, 255, 255, 0.55)'
})

const showAllRules = ref(false)
const isAgreed = ref(false)
const nowMillis = ref(Date.now())
const isSubmittingPrediction = ref(false)
const failedLeaderboardAvatarUrls = ref<Record<string, string>>({})
const submittedPrediction = ref<{
  assetKey: string
  direction: TournamentPredictionDirection
  seasonId: string
  roundId: string
} | null>(null)

const hasLeaderboardAvatar = (userId: string) => {
  const photoURL = leaderboardPhotoUrls.value[userId]
  return Boolean(photoURL && failedLeaderboardAvatarUrls.value[userId] !== photoURL)
}

const markLeaderboardAvatarFailed = (userId: string) => {
  const photoURL = leaderboardPhotoUrls.value[userId]
  if (!photoURL) return
  failedLeaderboardAvatarUrls.value = {
    ...failedLeaderboardAvatarUrls.value,
    [userId]: photoURL
  }
}

const getLeaderboardAssetStats = (entry: TournamentLeaderboardEntry) => {
  return (entry.assetStats || []).filter((stat) => (
    Boolean(stat?.assetId)
    && Number.isFinite(stat.totalPredictions)
    && Number.isFinite(stat.correctPredictions)
  ))
}

const getLeaderboardTotalPredictions = (entry: TournamentLeaderboardEntry) => {
  const assetStats = getLeaderboardAssetStats(entry)
  if (assetStats.length) {
    return assetStats.reduce((total, stat) => total + Math.max(0, stat.totalPredictions), 0)
  }
  return entry.totalPredictions ?? entry.predictionsCount ?? 0
}

const getLeaderboardCorrectPredictions = (entry: TournamentLeaderboardEntry) => {
  const assetStats = getLeaderboardAssetStats(entry)
  if (assetStats.length) {
    return assetStats.reduce((total, stat) => total + Math.max(0, stat.correctPredictions), 0)
  }
  return entry.correctPredictions ?? 0
}
let timerInterval: any = null
const INTRO_INITIAL_DELAY = 1000
const INTRO_STAGE_DURATION = 2600
const showEntranceAnimation = ref(false)
const entranceDecisionReady = ref(false)
const introStage = ref<'season' | 'round'>('season')
let introTimers: ReturnType<typeof setTimeout>[] = []
let activeIntroSignature = ''

const getEventTitle = (ev: TournamentEvent | null | undefined) => {
  if (!ev) return 'TOURNAMENT PROTOCOL'
  return (locale.value === 'ru' && ev.titleRu) ? ev.titleRu : ev.title
}

const getEventSubtitle = (ev: TournamentEvent | null | undefined) => {
  if (!ev) return 'TACTICAL EVALUATION'
  return (locale.value === 'ru' && ev.subtitleRu) ? ev.subtitleRu : ev.subtitle
}

const getEventDescription = (ev: TournamentEvent | null | undefined) => {
  if (!ev) return ''
  return (locale.value === 'ru' && ev.descriptionRu) ? ev.descriptionRu : ev.description
}

const getEventPrizePool = (ev: TournamentEvent | null | undefined) => {
  if (!ev) return '$250,000 ARCHIVE ALLOCATION'
  return (locale.value === 'ru' && ev.prizePoolRu) ? ev.prizePoolRu : ev.prizePool
}

const defaultRulesEn = [
  "Autonomous scenario & risk execution precision: All operations must adhere strictly to predefined algorithmic risk boundaries and scenario trees.",
  "Maximum adherence to predefined stop-loss protocols: Breaching daily drawdown or stop-loss parameters results in immediate synchronization lock and tactical disqualification.",
  "Minimal cognitive friction during volatile market phases: Emotional overrides and manual impulse actions penalize the operator's evaluation score.",
  "Verified credential synchronization: Participants must maintain verified exchange credential linkage throughout the evaluation window.",
  "Transparent volumetric telemetry: All executed trades must broadcast full execution logs, entry hypotheses, and exit criteria to the Genesis archive."
]

const defaultRulesRu = [
  "Точное исполнение автономных сценариев и риск-менеджмента: Все операции должны строго соответствовать заданным алгоритмическим границам риска и деревьям сценариев.",
  "Безусловное соблюдение протоколов стоп-лосс: Превышение дневной просадки или нарушение стоп-лосс параметров ведет к немедленной блокировке синхронизации и дисквалификации.",
  "Минимальное когнитивное трение в фазах волатильного рынка: Эмоциональное вмешательство и импульсивные ручные действия снижают итоговый оценочный балл оператора.",
  "Подтверждённая синхронность учетных данных: Участники обязаны поддерживать верифицированную привязку биржевых аккаунтов на протяжении всего периода оценки.",
  "Прозрачная объемная телеметрия: Все совершенные сделки должны транслировать полные логи исполнения, торговые гипотезы и критерии выхода в архив Genesis."
]

const getEventRules = (ev: TournamentEvent | null | undefined): string[] => {
  if (locale.value === 'ru') {
    return (ev?.rulesRu && ev.rulesRu.length > 0) ? ev.rulesRu : defaultRulesRu
  }
  return (ev?.rules && ev.rules.length > 0) ? ev.rules : defaultRulesEn
}

const activeSlide = ref(0)
const slideDirection = ref('slide-left')
const selectedEvent = ref<TournamentEvent | null>(null)
const showLeaderboard = ref(false)

const activeEvent = computed(() => {
  if (!allTournaments.value || allTournaments.value.length === 0) return null
  return allTournaments.value[activeSlide.value] || allTournaments.value[0] || null
})

const targetEvent = computed(() => {
  return selectedEvent.value || activeEvent.value || null
})

const isEventDataReady = computed(() => {
  if (
    !authStore.authReady
    || isTournamentLoading.value
    || !isSeasonsReady.value
    || !isLeaderboardReady.value
  ) return false

  return !authStore.user?.uid || isParticipantStatusReady.value
})

const isVotingDataReady = computed(() => {
  return isEventDataReady.value
    && isRoundsReady.value
    && isPredictionsReady.value
})

const isSingleEvent = computed(() => {
  return !allTournaments.value || allTournaments.value.length <= 1
})

const isOpen = computed(() => {
  return checkRegistrationOpen(targetEvent.value)
})

const visibleRules = computed(() => {
  const all = getEventRules(targetEvent.value)
  if (showAllRules.value) return all
  return all.slice(0, 2)
})

const isEventStarted = computed(() => {
  const start = toMillis(targetEvent.value?.startDate)
  if (!start) return true
  return nowMillis.value >= start
})

const timeUntilStart = computed(() => {
  const start = toMillis(targetEvent.value?.startDate)
  if (!start || nowMillis.value >= start) return 0
  return start - nowMillis.value
})

const formattedCountdown = computed(() => {
  const diff = timeUntilStart.value
  if (diff <= 0) return '00:00:00:00'
  const seconds = Math.floor((diff / 1000) % 60)
  const minutes = Math.floor((diff / 1000 / 60) % 60)
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  const pad = (n: number) => String(n).padStart(2, '0')
  if (locale.value === 'ru') {
    return `${days}д ${pad(hours)}ч ${pad(minutes)}м ${pad(seconds)}с`
  }
  return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
})

const serverNowMillis = computed(() => nowMillis.value + participantServerTimeOffset.value)

const seasonRounds = computed(() => {
  return openedSeasonRounds.value.map((round, index) => ({
    ordinal: index + 1,
    round,
    startsAtMillis: toMillis(round?.startsAt),
    endsAtMillis: toMillis(round?.endsAt)
  }))
})

const displayedRound = computed<{ ordinal: number; round: TournamentRound; startsAtMillis: number; endsAtMillis: number } | null>(() => {
  const rounds = seasonRounds.value
  if (!rounds.length) return null

  return rounds.find((round) => {
    return String(round.round.status || '').toLowerCase() === 'opened'
  }) || null
})

const currentRound = computed(() => {
  if (!displayedRound.value) return '—'
  return String(displayedRound.value.ordinal).padStart(2, '0')
})

const currentRoundId = computed(() => {
  return displayedRound.value?.round.id || ''
})

const isRoundCancellationRequested = computed(() => {
  return String(displayedRound.value?.round.settlementAction || '').trim().toLowerCase() === 'cancel'
})

const isDisplayedRoundOpened = computed(() => {
  return String(displayedRound.value?.round.status || '').toLowerCase() === 'opened'
})

const isVotingOpen = computed(() => {
  const round = displayedRound.value
  if (!round || !isParticipantServerTimeReady.value) return false

  return isDisplayedRoundOpened.value && !isRoundCancellationRequested.value
    && round.startsAtMillis > 0
    && round.endsAtMillis > round.startsAtMillis
    && serverNowMillis.value >= round.startsAtMillis
    && serverNowMillis.value < round.endsAtMillis
})

const votingCompleted = computed(() => {
  const round = displayedRound.value
  return Boolean(
    round
    && isParticipantServerTimeReady.value
    && round.endsAtMillis > 0
    && serverNowMillis.value >= round.endsAtMillis
  )
})

const votingPending = computed(() => {
  const round = displayedRound.value
  return Boolean(
    round
    && isParticipantServerTimeReady.value
    && round.startsAtMillis > 0
    && round.endsAtMillis > round.startsAtMillis
    && serverNowMillis.value < round.startsAtMillis
  )
})

const allowedTournamentAssets = computed(() => {
  const allowedAssets = targetEvent.value?.allowedAssets
  if (!Array.isArray(allowedAssets)) return []

  return allowedAssets.map((allowedAsset, index) => {
    const rawAsset = typeof allowedAsset === 'string' ? { symbol: allowedAsset } : allowedAsset
    const requestedSymbol = String(rawAsset?.symbol || rawAsset?.name || '').trim()
    const normalizedSymbol = requestedSymbol.toUpperCase()
    const globalAsset = (globalAssets as Array<Record<string, any>>).find((asset) => {
      const symbol = String(asset.symbol || '').toUpperCase()
      return symbol === normalizedSymbol
        || symbol.replace(/[^A-Z0-9]/g, '') === normalizedSymbol.replace(/[^A-Z0-9]/g, '')
    })
    const type = rawAsset?.type || globalAsset?.type || ''
    const isForex = String(type).toLowerCase() === 'forex'
    const forexCurrencies = isForex
      ? normalizedSymbol.replace(/[^A-Z]/g, '').match(/^([A-Z]{3})([A-Z]{3})$/)
      : null
    const baseCurrency = forexCurrencies?.[1] || ''
    const quoteCurrency = forexCurrencies?.[2] || ''
    const getCurrencyIcon = (currency: string) => currency
      ? `/assets_icons/currency-${currency.toLowerCase()}.svg`
      : ''

    return {
      key: `${requestedSymbol || 'asset'}-${index}`,
      symbol: rawAsset?.symbol || requestedSymbol,
      name: rawAsset?.name || rawAsset?.symbol || requestedSymbol,
      type,
      icon: globalAsset?.icon || '',
      isForex: Boolean(isForex && baseCurrency && quoteCurrency),
      baseCurrency,
      quoteCurrency,
      baseIcon: getCurrencyIcon(baseCurrency),
      quoteIcon: getCurrencyIcon(quoteCurrency)
    }
  }).filter((asset) => asset.name)
})

const selectedAssetKey = ref('')
const showVotingRules = ref(false)

const selectAsset = (assetKey: string) => {
  selectedAssetKey.value = assetKey
}

const selectedAsset = computed(() => {
  return allowedTournamentAssets.value.find((asset) => asset.key === selectedAssetKey.value) || allowedTournamentAssets.value[0] || null
})

const roundPredictions = computed<TournamentPrediction[]>(() => {
  return predictionsForRound.value
})

const normalizeAssetIdentifier = (value: unknown) => {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

const getPredictionAssetIdentifier = (prediction: TournamentPrediction) => {
  const candidates = [
    prediction.assetId,
    prediction.assetSymbol,
    prediction.symbol,
    prediction.asset
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    if (typeof candidate === 'object') {
      const nestedCandidate = candidate.symbol || candidate.name || ''
      if (nestedCandidate) return nestedCandidate
      continue
    }
    if (String(candidate).trim()) return candidate
  }

  const predictionId = String(prediction.id || '')
  const predictionUserId = getPredictionUserId(prediction)
  const idPrefix = predictionUserId ? `${predictionUserId}_` : ''
  return idPrefix && predictionId.startsWith(idPrefix)
    ? predictionId.slice(idPrefix.length)
    : ''
}

const getPredictionUserId = (prediction: TournamentPrediction) => {
  if (String(prediction.userId || '').trim()) return String(prediction.userId).trim()

  const predictionId = String(prediction.id || '')
  const separatorIndex = predictionId.indexOf('_')
  return separatorIndex > 0 ? predictionId.slice(0, separatorIndex) : ''
}

const selectedAssetPredictions = computed(() => {
  const predictions = roundPredictions.value
  const asset = selectedAsset.value
  if (!asset) return []

  const assetIdentifiers = new Set([
    normalizeAssetIdentifier(asset.symbol),
    normalizeAssetIdentifier(asset.name)
  ].filter(Boolean))

  const predictionsWithAsset = predictions.filter((prediction) => {
    return Boolean(normalizeAssetIdentifier(getPredictionAssetIdentifier(prediction)))
  })

  if (!predictionsWithAsset.length) return predictions

  return predictions.filter((prediction) => {
    return assetIdentifiers.has(normalizeAssetIdentifier(getPredictionAssetIdentifier(prediction)))
  })
})

const getPredictionDirection = (prediction: TournamentPrediction) => {
  const rawPrediction = prediction as TournamentPrediction & { side?: string; prediction?: string; type?: string }
  return String(prediction.predict || prediction.direction || rawPrediction.side || rawPrediction.prediction || rawPrediction.type || '').toUpperCase()
}

const currentUserPrediction = computed(() => {
  const userId = authStore.user?.uid
  if (!userId || !selectedAsset.value) return ''

  const prediction = selectedAssetPredictions.value.find((item) => getPredictionUserId(item) === userId)
  if (prediction) return getPredictionDirection(prediction)

  return submittedPrediction.value?.seasonId === openedSeason.value?.id
    && submittedPrediction.value.roundId === currentRoundId.value
    && submittedPrediction.value.assetKey === selectedAsset.value.key
    ? submittedPrediction.value.direction
    : ''
})

const getAssetPredictionDirection = (asset: { key: string; symbol?: unknown; name: string }) => {
  const userId = authStore.user?.uid
  if (!userId) return ''

  const assetIdentifiers = new Set([
    normalizeAssetIdentifier(asset.symbol),
    normalizeAssetIdentifier(asset.name)
  ].filter(Boolean))

  const prediction = roundPredictions.value.find((item) => {
    if (getPredictionUserId(item) !== userId) return false
    return assetIdentifiers.has(normalizeAssetIdentifier(getPredictionAssetIdentifier(item)))
  })

  if (prediction) return getPredictionDirection(prediction)

  return submittedPrediction.value?.seasonId === openedSeason.value?.id
    && submittedPrediction.value.roundId === currentRoundId.value
    && submittedPrediction.value.assetKey === asset.key
    ? submittedPrediction.value.direction
    : ''
}

const getAssetVoteClass = (asset: { key: string; symbol?: unknown; name: string }) => {
  const direction = getAssetPredictionDirection(asset)
  if (direction === 'LONG') return 'registered-asset-chip--long-voted'
  if (direction === 'SHORT') return 'registered-asset-chip--short-voted'
  return ''
}

const getVoteButtonStyle = (direction: TournamentPredictionDirection) => {
  if (currentUserPrediction.value === direction) {
    return {
      backgroundColor: themeStore.settings.isDark ? '#ffffff' : '#000000',
      color: themeStore.settings.isDark ? '#000000' : '#ffffff'
    }
  }

  return { backgroundColor: votingSurfaceColor.value }
}

const longVoteCount = computed(() => {
  return selectedAssetPredictions.value.filter((prediction) => getPredictionDirection(prediction) === 'LONG').length
})

const shortVoteCount = computed(() => {
  return selectedAssetPredictions.value.filter((prediction) => getPredictionDirection(prediction) === 'SHORT').length
})

const longVotePercentage = computed(() => {
  const totalVotes = longVoteCount.value + shortVoteCount.value
  if (!totalVotes) return 0
  return Math.round((longVoteCount.value / totalVotes) * 100)
})

const shortVotePercentage = computed(() => {
  if (!longVoteCount.value && !shortVoteCount.value) return 0
  return 100 - longVotePercentage.value
})

const formatLocalTime = (millis: number) => {
  return new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23'
  }).format(new Date(millis))
}

const timeWindowMinutes = computed(() => {
  const value = Number(openedSeason.value?.timeWindow)
  return Number.isSafeInteger(value) && value > 0 ? value : 0
})

const votingResolutionEndMillis = computed(() => {
  const endsAtMillis = displayedRound.value?.endsAtMillis || 0
  if (!endsAtMillis || !timeWindowMinutes.value) return 0
  return endsAtMillis + timeWindowMinutes.value * 60 * 1000
})

const localVotingResolutionEnd = computed(() => {
  return votingResolutionEndMillis.value ? formatLocalTime(votingResolutionEndMillis.value) : ''
})

const normalizeJudgeRules = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return value.split(/\r?\n/).map((rule) => rule.trim()).filter(Boolean)
  }

  if (Array.isArray(value)) {
    return value.flatMap((rule) => normalizeJudgeRules(rule))
  }

  if (!value || typeof value !== 'object') return []

  const ruleObject = value as Record<string, unknown>
  for (const key of ['text', 'rule', 'content', 'value']) {
    if (key in ruleObject) return normalizeJudgeRules(ruleObject[key])
  }

  return Object.keys(ruleObject)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
    .flatMap((key) => normalizeJudgeRules(ruleObject[key]))
}

const replaceRuleTimeWindow = (rule: string) => {
  const timeWindow = String(timeWindowMinutes.value || '—')
  return rule.replace(/\{\{\s*timeWindow\s*\}\}|\{\s*timeWindow\s*\}|\[\s*timeWindow\s*\]|\btimeWindow\b/gi, timeWindow)
}

const votingRules = computed(() => {
  const source = locale.value === 'ru'
    ? targetEvent.value?.judgeRulesRu
    : targetEvent.value?.judgeRulesEn

  return normalizeJudgeRules(source).map((text, index) => ({
    number: String(index + 1).padStart(2, '0'),
    text: replaceRuleTimeWindow(text)
  }))
})

const votingGuidance = computed(() => {
  const resolutionTime = localVotingResolutionEnd.value
  if (!resolutionTime) {
    return locale.value === 'ru'
      ? 'Выберите направление актива в окне раунда'
      : 'Choose the asset direction within the round window'
  }

  return locale.value === 'ru'
    ? `Выберите направление цены к ${resolutionTime} (ваше местное время)`
    : `Choose the price direction by ${resolutionTime} (your local time)`
})

const voteSplitPercentage = computed(() => {
  return longVoteCount.value + shortVoteCount.value ? longVotePercentage.value : 50
})

const handleVote = async (direction: TournamentPredictionDirection) => {
  const userId = authStore.user?.uid
  const eventId = targetEvent.value?.id
  const seasonId = openedSeason.value?.id
  const roundId = currentRoundId.value
  const asset = selectedAsset.value

  if (
    !isVotingOpen.value
    || !userId
    || !eventId
    || !seasonId
    || !roundId
    || !asset
  ) return

  isSubmittingPrediction.value = true
  try {
    await submitTournamentPrediction({
      tournamentId: eventId,
      seasonId,
      roundId,
      userId,
      assetId: normalizeAssetIdentifier(String(asset.symbol || asset.name)),
      asset: String(asset.symbol || asset.name),
      predict: direction
    })

    submittedPrediction.value = {
      assetKey: asset.key,
      direction,
      seasonId,
      roundId
    }
  } catch (err) {
    console.error('[Tournament] Failed to submit prediction:', err)
  } finally {
    isSubmittingPrediction.value = false
  }
}

const formattedVotingCountdown = computed(() => {
  const round = displayedRound.value
  const targetMillis = votingPending.value
    ? round?.startsAtMillis || 0
    : round?.endsAtMillis || 0

  if (!isParticipantServerTimeReady.value || !targetMillis || serverNowMillis.value >= targetMillis) {
    return '00:00:00'
  }

  const totalSeconds = Math.max(0, Math.ceil((targetMillis - serverNowMillis.value) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
})

watch(allowedTournamentAssets, (assets) => {
  if (!assets.some((asset) => asset.key === selectedAssetKey.value)) {
    selectedAssetKey.value = assets[0]?.key || ''
  }
}, { immediate: true })

const toRomanNumeral = (value: number) => {
  if (!Number.isFinite(value) || value < 1) return '—'
  const numerals: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ]
  let remainder = Math.floor(value)
  return numerals.reduce((result, [unit, symbol]) => {
    const count = Math.floor(remainder / unit)
    remainder %= unit
    return result + symbol.repeat(count)
  }, '')
}

const currentSeasonRoman = computed(() => {
  const ordinal = openedSeason.value?.ordinal
  return ordinal ? toRomanNumeral(ordinal) : '—'
})

const leaderboardSeasonIndex = computed(() => {
  return tournamentSeasons.value.findIndex(
    (season) => season.id === selectedLeaderboardSeasonId.value
  )
})

const leaderboardSeason = computed(() => {
  return leaderboardSeasonIndex.value >= 0
    ? tournamentSeasons.value[leaderboardSeasonIndex.value]
    : openedSeason.value
})

const leaderboardSeasonRoman = computed(() => {
  const ordinal = leaderboardSeasonIndex.value >= 0
    ? leaderboardSeasonIndex.value + 1
    : leaderboardSeason.value?.ordinal
  return ordinal ? toRomanNumeral(ordinal) : '—'
})

const canShowPreviousLeaderboardSeason = computed(() => leaderboardSeasonIndex.value > 0)
const canShowNextLeaderboardSeason = computed(() => (
  leaderboardSeasonIndex.value >= 0
  && leaderboardSeasonIndex.value < tournamentSeasons.value.length - 1
))

const showAdjacentLeaderboardSeason = (direction: -1 | 1) => {
  const nextIndex = leaderboardSeasonIndex.value + direction
  const nextSeason = tournamentSeasons.value[nextIndex]
  if (nextSeason) selectLeaderboardSeason(nextSeason.id)
}

watch(currentRoundId, () => {
  showVotingRules.value = false
})

const formatSeasonDate = (dateValue: any) => {
  const millis = toMillis(dateValue)
  if (!millis) return '—'

  return new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  }).format(new Date(millis)).toUpperCase()
}

const formattedSeasonStart = computed(() => formatSeasonDate(openedSeason.value?.startsAt))
const formattedSeasonEnd = computed(() => formatSeasonDate(openedSeason.value?.endsAt))

const introStorageKey = computed(() => {
  const userId = authStore.user?.uid
  const eventId = targetEvent.value?.id
  return userId && eventId ? `exgenesis:season-entry:v5:${userId}:${eventId}` : ''
})

const introSignature = computed(() => {
  if (!targetEvent.value?.id || !openedSeason.value?.id || currentRound.value === '—') return ''
  return [
    openedSeason.value.id,
    openedSeason.value.ordinal,
    toMillis(openedSeason.value.startsAt),
    toMillis(openedSeason.value.endsAt),
    currentRound.value,
    displayedRound.value?.startsAtMillis,
    displayedRound.value?.endsAtMillis,
    displayedRound.value?.round.status
  ].join(':')
})

const clearIntroTimers = () => {
  introTimers.forEach((timer) => clearTimeout(timer))
  introTimers = []
}

const resetEntranceAnimation = () => {
  clearIntroTimers()
  activeIntroSignature = ''
  showEntranceAnimation.value = false
  entranceDecisionReady.value = false
  introStage.value = 'season'
}

const evaluateEntranceAnimation = () => {
  if (!import.meta.client || !isUserRegistered.value || !introStorageKey.value || !introSignature.value) return

  const storageKey = introStorageKey.value
  const signature = introSignature.value
  const lastShownSignature = localStorage.getItem(storageKey)

  if (lastShownSignature === signature) {
    clearIntroTimers()
    activeIntroSignature = signature
    entranceDecisionReady.value = true
    showEntranceAnimation.value = false
    return
  }

  if (showEntranceAnimation.value && activeIntroSignature === signature) return

  clearIntroTimers()
  activeIntroSignature = signature
  const shouldShowSeasonIntro = currentRound.value === '01'
  introStage.value = shouldShowSeasonIntro ? 'season' : 'round'
  entranceDecisionReady.value = false
  showEntranceAnimation.value = false

  introTimers.push(setTimeout(() => {
    if (activeIntroSignature !== signature) return

    entranceDecisionReady.value = true
    showEntranceAnimation.value = true

    if (shouldShowSeasonIntro) {
      introTimers.push(setTimeout(() => {
        if (activeIntroSignature === signature) introStage.value = 'round'
      }, INTRO_STAGE_DURATION))
    }

    introTimers.push(setTimeout(() => {
      if (activeIntroSignature !== signature) return
      localStorage.setItem(storageKey, signature)
      showEntranceAnimation.value = false
    }, INTRO_STAGE_DURATION * (shouldShowSeasonIntro ? 2 : 1)))
  }, INTRO_INITIAL_DELAY))
}

const formattedServerDate = computed(() => {
  if (!isParticipantServerTimeReady.value) {
    return locale.value === 'ru' ? 'СИНХРОНИЗАЦИЯ СЕРВЕРА...' : 'SYNCHRONIZING SERVER...'
  }

  return formatSeasonDate(serverNowMillis.value)
})

const selectEvent = (ev: TournamentEvent | null) => {
  showLeaderboard.value = false
  if (ev) selectedEvent.value = ev
}

const prevSlide = () => {
  if (isSingleEvent.value || !allTournaments.value) return
  showLeaderboard.value = false
  slideDirection.value = 'slide-right'
  activeSlide.value = (activeSlide.value - 1 + allTournaments.value.length) % allTournaments.value.length
}

const nextSlide = () => {
  if (isSingleEvent.value || !allTournaments.value) return
  showLeaderboard.value = false
  slideDirection.value = 'slide-left'
  activeSlide.value = (activeSlide.value + 1) % allTournaments.value.length
}

const goToSlide = (idx: number) => {
  if (isSingleEvent.value || !allTournaments.value || idx === activeSlide.value) return
  showLeaderboard.value = false
  slideDirection.value = idx > activeSlide.value ? 'slide-left' : 'slide-right'
  activeSlide.value = idx
}

const formatDate = (dateVal?: any) => {
  if (!dateVal) return 'N/A'
  try {
    let millis = 0
    if (typeof dateVal === 'number') millis = dateVal
    else if (typeof dateVal === 'object' && 'seconds' in dateVal) millis = dateVal.seconds * 1000
    else if (typeof dateVal === 'object' && typeof dateVal.toDate === 'function') millis = dateVal.toDate().getTime()
    else millis = new Date(dateVal).getTime()

    if (isNaN(millis) || !millis) return String(dateVal)
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(millis)).toUpperCase()
  } catch {
    return String(dateVal)
  }
}

const handleRegister = async () => {
  const user = authStore.user
  const event = targetEvent.value

  if (!user?.uid || !event?.id || !isAgreed.value || !isEventStarted.value) return

  isRegistering.value = true
  try {
    await registerForTournament(user.uid, user.email ?? undefined, event.id, openedSeason.value?.id)
    isAgreed.value = false
  } catch (err) {
    console.error('[Tournament] Failed to register participant:', err)
  } finally {
    isRegistering.value = false
  }
}

onMounted(() => {
  initTournamentListener()
  if (authStore.user?.uid && targetEvent.value?.id) {
    initParticipantListener(authStore.user.uid, targetEvent.value.id)
  }
  timerInterval = setInterval(() => {
    nowMillis.value = Date.now()
  }, 1000)
})

watch([() => authStore.user?.uid, () => targetEvent.value?.id], ([newUid, newEventId]) => {
  showAllRules.value = false
  isAgreed.value = false
  submittedPrediction.value = null
  selectedAssetKey.value = ''
  resetEntranceAnimation()
  if (newEventId) {
    initSeasonsListener(newEventId)
  }
  if (newUid && newEventId) {
    initParticipantListener(newUid, newEventId)
  }
}, { immediate: true })

watch([() => openedSeason.value?.id, currentRoundId], () => {
  submittedPrediction.value = null
})

watch(
  [roundPredictions, allowedTournamentAssets, () => authStore.user?.uid, currentRoundId],
  () => {
    const userId = authStore.user?.uid
    if (!userId || !allowedTournamentAssets.value.length) return

    const votedAsset = allowedTournamentAssets.value.find((asset) => (
      Boolean(getAssetPredictionDirection(asset))
    ))

    if (votedAsset) selectedAssetKey.value = votedAsset.key
  },
  { immediate: true }
)

watch(
  [() => targetEvent.value?.id, () => openedSeason.value?.id, currentRoundId, () => authStore.user?.uid],
  ([eventId, seasonId, roundId, userId]) => {
    initTournamentPredictionsListener({
      tournamentId: eventId,
      seasonId,
      roundId,
      userId
    })
  },
  { immediate: true }
)

watch([() => isUserRegistered.value, introSignature], ([isRegistered]) => {
  if (isRegistered) {
    evaluateEntranceAnimation()
  } else {
    resetEntranceAnimation()
  }
}, { immediate: true })

onUnmounted(() => {
  clearIntroTimers()
  terminateTournamentPredictionsListener()
  terminateTournamentListeners()
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<style scoped>
.registered-event-page {
  --theme-bg: #000000;
  --theme-bg-rgb: 0 0 0;
  --theme-text: #ffffff;
  --theme-text-rgb: 255 255 255;
  --theme-border: rgba(255, 255, 255, 0.2);
  --theme-border-rgb: 255 255 255;
  --registered-bg: #000000;
  --registered-fg: #ffffff;
  --registered-muted: rgba(255, 255, 255, 0.5);
  --registered-border: rgba(255, 255, 255, 0.2);
  color: var(--registered-fg);
}

.registered-event-page--light {
  --registered-bg: #ffffff;
  --registered-fg: #000000;
  --registered-muted: rgba(0, 0, 0, 0.5);
  --registered-border: rgba(0, 0, 0, 0.2);
}

.registered-voting-backdrop img {
  opacity: 0.34;
  filter: grayscale(0.35) contrast(0.95);
}

.registered-fg {
  color: var(--registered-fg);
}

.registered-muted {
  color: var(--registered-muted);
}

.registered-back-button:hover {
  color: var(--registered-fg);
}

.registered-voting-panel {
  border-color: var(--registered-border) !important;
  box-shadow: none !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  min-height: max(280px, calc(100% - 12rem));
}

.registered-asset-chip {
  border-color: var(--registered-border);
  background-color: transparent;
  transition: background-color 240ms ease, border-color 240ms ease, color 240ms ease;
}

.registered-asset-chip:hover {
  background-color: color-mix(in srgb, var(--registered-fg) 5%, transparent);
  border-color: color-mix(in srgb, var(--registered-fg) 65%, transparent);
}

.registered-asset-icon {
  opacity: 1;
  transition: transform 240ms ease;
}

.registered-forex-icon {
  position: relative;
  display: block;
  overflow: visible;
  transition: transform 240ms ease;
}

.registered-forex-icon--small {
  width: 2rem;
  height: 2rem;
}

.registered-forex-icon--large {
  width: 5rem;
  height: 5rem;
}

.registered-forex-flag {
  position: absolute;
  width: 68%;
  height: 68%;
  object-fit: cover;
  border: 2px solid var(--registered-bg);
  border-radius: 9999px;
  box-sizing: border-box;
}

.registered-forex-flag--base {
  top: 0;
  left: 0;
  z-index: 2;
}

.registered-forex-flag--quote {
  right: 0;
  bottom: 0;
  z-index: 1;
}

.registered-asset-chip:hover .registered-asset-icon {
  transform: scale(1.05);
}

.registered-asset-chip:hover .registered-forex-icon {
  transform: scale(1.05);
}

.registered-asset-chip--selected,
.registered-asset-chip--selected:hover {
  background-color: rgba(248, 248, 248, 0.94);
  border-color: rgba(20, 20, 20, 0.36);
  color: #111111;
}

.registered-asset-chip--selected .registered-fg,
.registered-asset-chip--selected .registered-muted {
  color: #111111;
}

.registered-event-page--light .registered-asset-chip--selected,
.registered-event-page--light .registered-asset-chip--selected:hover {
  background-color: #000000;
  border-color: #000000;
  color: #ffffff;
}

.registered-event-page--light .registered-asset-chip--selected .registered-fg,
.registered-event-page--light .registered-asset-chip--selected .registered-muted {
  color: #ffffff;
}

.registered-asset-chip--long-voted,
.registered-asset-chip--long-voted:hover {
  background-color: rgba(134, 239, 172, 0.24);
}

.registered-asset-chip--short-voted,
.registered-asset-chip--short-voted:hover {
  background-color: rgba(252, 165, 165, 0.26);
}

.registered-asset-chip--selected.registered-asset-chip--long-voted,
.registered-asset-chip--selected.registered-asset-chip--long-voted:hover,
.registered-asset-chip--selected.registered-asset-chip--short-voted,
.registered-asset-chip--selected.registered-asset-chip--short-voted:hover {
  background-color: rgba(248, 248, 248, 0.94);
}

.registered-event-page--light .registered-asset-chip--selected.registered-asset-chip--long-voted,
.registered-event-page--light .registered-asset-chip--selected.registered-asset-chip--long-voted:hover,
.registered-event-page--light .registered-asset-chip--selected.registered-asset-chip--short-voted,
.registered-event-page--light .registered-asset-chip--selected.registered-asset-chip--short-voted:hover {
  background-color: #000000;
}

.registered-asset-chip--soon {
  color: var(--registered-muted);
  cursor: default;
  opacity: 0.65;
}

.registered-asset-chip--soon:hover {
  background-color: transparent;
  border-color: var(--registered-border);
}

.registered-rules-button {
  border-color: var(--registered-border);
  color: var(--registered-muted);
}

.registered-rules-button:hover {
  border-color: var(--registered-fg);
  background-color: color-mix(in srgb, var(--registered-fg) 6%, transparent);
  color: var(--registered-fg);
}

.registered-rules-button:focus-visible {
  outline: 1px solid var(--registered-fg);
  outline-offset: 3px;
}

.registered-selected-asset-card {
  background-color: transparent;
  box-shadow: none;
  min-height: max(280px, calc(100% - 12rem));
  padding: 1rem 1.5rem;
}

.registered-rules-card {
  padding: 0;
  background-color: transparent;
  box-shadow: none;
}

@media (min-width: 640px) {
  .registered-selected-asset-card--rules {
    transform: translateY(-2rem);
  }
}

.registered-rule + .registered-rule {
  border-top: 1px solid color-mix(in srgb, var(--registered-border) 72%, transparent);
}

.registered-rules-reveal-enter-active,
.registered-rules-reveal-leave-active {
  transition: opacity 260ms ease, transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
}

.registered-rules-reveal-enter-from,
.registered-rules-reveal-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.registered-vote-track {
  background-color: var(--registered-border);
}

.registered-vote-long {
  background-color: #5c9f78;
}

.registered-vote-short {
  background-color: #ef4444;
}

.registered-vote-marker {
  background-color: var(--registered-fg);
}

.registered-vote-long-text {
  color: #5c9f78;
}

.registered-vote-short-text {
  color: #ef4444;
}

.registered-vote-guidance {
  color: var(--registered-muted);
  opacity: 0.82;
}

.registered-vote-action {
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.registered-vote-action {
  border-color: var(--registered-fg);
  color: var(--registered-fg);
}

.registered-vote-action:disabled:not(.registered-vote-action--selected) {
  filter: grayscale(1);
  opacity: 0.28;
}

.registered-vote-action:not(:disabled):hover {
  box-shadow: 0 0 0 1px var(--registered-fg), 0 8px 18px rgba(0, 0, 0, 0.12);
  opacity: 0.82;
  transform: translateY(-1px);
}

.registered-vote-action:not(:disabled):active {
  opacity: 0.68;
  transform: translateY(1px) scale(0.985);
}

.registered-vote-action:focus-visible {
  outline: 1px solid var(--registered-fg);
  outline-offset: 3px;
}

.registered-vote-action--selected {
  border-width: 2px;
  filter: none;
  opacity: 1;
  box-shadow: 0 0 0 1px var(--registered-fg), inset 0 -3px 0 var(--registered-fg);
}

.registered-voting-panel :deep(.theme-panel-backdrop) {
  background-color: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.leaderboard-page {
  --leaderboard-fg: #ffffff;
  --leaderboard-muted: rgba(255, 255, 255, 0.58);
  --leaderboard-border: rgba(255, 255, 255, 0.2);
  --leaderboard-table-bg: rgba(8, 8, 8, 0.55);
  --leaderboard-image-opacity: 0.25;
  color: var(--leaderboard-fg);
}

.leaderboard-page--light {
  --leaderboard-fg: #111111;
  --leaderboard-muted: rgba(17, 17, 17, 0.54);
  --leaderboard-border: rgba(17, 17, 17, 0.2);
  --leaderboard-table-bg: rgba(255, 255, 255, 0.55);
  --leaderboard-image-opacity: 0.12;
}

.leaderboard-page__image {
  opacity: var(--leaderboard-image-opacity);
  pointer-events: none;
}

.leaderboard-page__muted {
  color: var(--leaderboard-muted);
}

.leaderboard-page__muted:hover {
  color: var(--leaderboard-fg);
}

.leaderboard-page__heading {
  color: var(--leaderboard-fg) !important;
}

.leaderboard-page__season-button {
  display: inline-flex;
  width: 1.4rem;
  height: 1.4rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--leaderboard-border);
  color: var(--leaderboard-fg);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
  line-height: 1;
  transition: background-color 180ms ease, color 180ms ease, border-color 180ms ease;
}

.leaderboard-page__season-button:not(:disabled):hover {
  border-color: var(--leaderboard-fg);
  background-color: var(--leaderboard-fg);
  color: var(--leaderboard-table-bg);
}

.leaderboard-page__season-button:disabled {
  cursor: default;
  opacity: 0.28;
}

.leaderboard-page__season-button:focus-visible {
  outline: 1px solid var(--leaderboard-fg);
  outline-offset: 3px;
}

.leaderboard-page--light .leaderboard-page__table {
  --leaderboard-fg: #111111;
  --leaderboard-muted: rgba(17, 17, 17, 0.54);
  --leaderboard-border: rgba(17, 17, 17, 0.2);
  --leaderboard-table-bg: rgba(255, 255, 255, 0.68);
  --leaderboard-image-opacity: 0.12;
  color: var(--leaderboard-fg);
}

.leaderboard-page--light :deep(.leaderboard-page__table-divider .bg-theme-border),
.leaderboard-page--light :deep(.leaderboard-page__table-edge-divider .bg-theme-border) {
  background-color: rgba(17, 17, 17, 0.2) !important;
}

.leaderboard-page--light :deep(.leaderboard-page__table-divider .bg-theme-text),
.leaderboard-page--light :deep(.leaderboard-page__table-edge-divider .bg-theme-text) {
  background-color: #111111 !important;
}

.leaderboard-page__table {
  isolation: isolate;
  background-color: var(--leaderboard-table-bg);
  height: min(55vh, 30rem);
  max-height: calc(100vh - 16rem);
  min-height: 180px;
}

.leaderboard-page__table-row {
  padding-inline: clamp(1.5rem, 4vw, 4rem);
}

.leaderboard-page__table-grid {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr) 3.25rem 3.25rem 3.25rem 3.25rem;
  gap: 0.65rem;
}

@media (min-width: 640px) {
  .leaderboard-page__table-grid {
    grid-template-columns: 3rem minmax(10rem, 20rem) 5rem 5rem 5rem 5rem;
    gap: 1rem;
    justify-content: center;
  }
}

.leaderboard-page__participant-avatar {
  display: flex;
  width: clamp(1.75rem, 3vw, 2.5rem);
  height: clamp(1.75rem, 3vw, 2.5rem);
  align-items: center;
  justify-content: center;
  border: 1px solid var(--leaderboard-border);
  background-color: var(--leaderboard-fg);
  color: var(--leaderboard-table-bg);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: clamp(0.7rem, 1vw, 0.9rem);
  font-weight: 900;
  text-transform: uppercase;
}

.leaderboard-page__asset-stats {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.2rem;
  min-width: 0;
  overflow: hidden;
  color: currentColor;
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.2;
  opacity: 0.52;
  white-space: nowrap;
}

.leaderboard-page__asset-stats span + span::before {
  content: '·';
  margin-right: 0.35rem;
}

.leaderboard-page__top-name {
  display: inline-block;
  color: inherit;
  background: none;
  -webkit-text-fill-color: currentColor;
  animation: leaderboard-top-name-glow 4.5s ease-in-out infinite;
}

@keyframes leaderboard-top-name-glow {
  0%, 100% {
    text-shadow:
      0 0 3px rgba(255, 255, 255, 0.24),
      0 0 8px rgba(214, 240, 239, 0.12);
  }
  50% {
    text-shadow:
      0 0 5px rgba(255, 238, 252, 0.72),
      0 0 12px rgba(198, 238, 239, 0.42),
      0 0 20px rgba(250, 218, 237, 0.24);
  }
}

.leaderboard-page--dark .leaderboard-page__top-row--first {
  background-color: rgba(255, 255, 255, 1);
  color: #000000;
}

.leaderboard-page--dark .leaderboard-page__top-row--second {
  background-color: rgba(255, 255, 255, 0.78);
  color: #000000;
}

.leaderboard-page--dark .leaderboard-page__top-row--third {
  background-color: rgba(255, 255, 255, 0.56);
  color: #000000;
}

.leaderboard-page--light .leaderboard-page__top-row--first {
  background-color: rgba(17, 17, 17, 1);
  color: #ffffff;
}

.leaderboard-page--light .leaderboard-page__top-row--second {
  background-color: rgba(17, 17, 17, 0.78);
  color: #ffffff;
}

.leaderboard-page--light .leaderboard-page__top-row--third {
  background-color: rgba(17, 17, 17, 0.56);
  color: #ffffff;
}

.leaderboard-page__top-row .leaderboard-page__muted {
  color: inherit;
  opacity: 0.65;
}

.leaderboard-page__top-row .leaderboard-page__participant-avatar {
  border-color: currentColor;
}

.leaderboard-page__table-overlay {
  z-index: 1;
}

.leaderboard-page--light .leaderboard-page__table-overlay {
  background-color: rgba(255, 255, 255, 0.68);
}

.leaderboard-page :deep(.leaderboard-page__table-divider .bg-theme-border),
.leaderboard-page :deep(.leaderboard-page__table-edge-divider .bg-theme-border) {
  background-color: var(--leaderboard-border);
}

.leaderboard-page :deep(.leaderboard-page__table-divider .bg-theme-text),
.leaderboard-page :deep(.leaderboard-page__table-edge-divider .bg-theme-text) {
  background-color: var(--leaderboard-fg);
}

.leaderboard-page :deep(.leaderboard-page__table-edge-divider) {
  position: relative;
  z-index: 10;
}

.leaderboard-page :deep(.leaderboard-page__table-edge-divider--top) {
  transform: translateY(-4px);
}

.leaderboard-page :deep(.leaderboard-page__table-edge-divider--bottom) {
  transform: translateY(4px);
}

.leaderboard-page__participant + .leaderboard-page__participant {
  border-top: 1px solid color-mix(in srgb, var(--leaderboard-border) 55%, transparent);
}

.leaderboard-page__rows > :not([hidden]) ~ :not([hidden]) {
  border-color: color-mix(in srgb, var(--leaderboard-border) 55%, transparent);
}

.leaderboard-page__spinner {
  border-color: color-mix(in srgb, var(--leaderboard-fg) 18%, transparent);
  border-top-color: var(--leaderboard-fg);
}

.season-entry-enter-active,
.season-entry-leave-active,
.season-stage-enter-active,
.season-stage-leave-active {
  transition: opacity 0.7s ease, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.season-entry-enter-from,
.season-entry-leave-to,
.season-stage-enter-from,
.season-stage-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
}

.leaderboard-page-enter-active,
.leaderboard-page-leave-active {
  transition: opacity 0.55s ease, transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
}

.leaderboard-page-enter-from,
.leaderboard-page-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.985);
}

.leaderboard-card-enter-active,
.leaderboard-card-leave-active {
  transition: opacity 0.55s ease, transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
}

.leaderboard-card-enter-from,
.leaderboard-card-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.985);
}

.leaderboard-page__table {
  transform-origin: top center;
  animation: leaderboard-table-unfold 1.15s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes leaderboard-table-unfold {
  0% {
    opacity: 0.35;
    transform: scaleY(0.08);
  }
  100% {
    opacity: 1;
    transform: scaleY(1);
  }
}

.carousel-event-card {
  height: clamp(280px, 42vw, 580px);
  min-height: 280px;
  box-sizing: border-box;
}

.carousel-event-nav {
  width: clamp(2rem, 3.2vw, 3rem);
  height: clamp(3.5rem, 7vw, 5rem);
}

.carousel-event-nav-icon {
  width: clamp(1.35rem, 2.1vw, 2rem);
  height: clamp(1.35rem, 2.1vw, 2rem);
}

.carousel-event-content {
  width: min(100%, 64rem);
  padding: clamp(1rem, 4vw, 4rem);
  gap: clamp(0.45rem, 1.1vw, 1rem);
}

.carousel-event-badge {
  padding: clamp(0.25rem, 0.55vw, 0.5rem) clamp(0.55rem, 1vw, 0.75rem);
  font-size: clamp(0.5rem, 0.75vw, 0.75rem);
  letter-spacing: clamp(0.12em, 0.25vw, 0.25em);
}

.carousel-event-season {
  font-size: clamp(0.6rem, 0.8vw, 0.75rem);
  letter-spacing: clamp(0.14em, 0.28vw, 0.28em);
}

.carousel-event-title {
  font-size: clamp(1.35rem, 4vw, 3.75rem) !important;
}

.carousel-event-description {
  font-size: clamp(0.65rem, 1.1vw, 1rem);
}

.carousel-event-actions {
  gap: clamp(0.45rem, 0.9vw, 0.75rem);
  padding-top: clamp(0.25rem, 1.1vw, 1rem);
}

.carousel-event-button {
  gap: clamp(0.45rem, 0.9vw, 0.875rem);
  padding: clamp(0.55rem, 1.25vw, 1rem) clamp(0.8rem, 2.2vw, 2rem);
  font-size: clamp(0.5rem, 0.8vw, 0.875rem);
  letter-spacing: clamp(0.1em, 0.2vw, 0.25em);
}

.carousel-event-button-icon {
  width: clamp(0.75rem, 1.2vw, 1rem);
  height: clamp(0.75rem, 1.2vw, 1rem);
}

.pearlescent-bg {
  background: linear-gradient(
    270deg,
    #ffffff 0%,
    #ebd9eb 15%,
    #cbebeb 30%,
    #fbedc4 45%,
    #d1dffb 60%,
    #f8d2e5 75%,
    #ccebeb 90%,
    #ffffff 100%
  );
  background-size: 400% 400%;
  animation: nacre-shimmer 7s ease-in-out infinite alternate;
}

.pearlescent-text {
  background: linear-gradient(
    270deg,
    #ffffff 0%,
    #eed6ee 15%,
    #c4edee 30%,
    #fcf2d4 45%,
    #cde0ff 60%,
    #fad6e9 75%,
    #d4f0ef 90%,
    #ffffff 100%
  );
  background-size: 400% 400%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
  animation: nacre-shimmer 7s ease-in-out infinite alternate;
}

@keyframes nacre-shimmer {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.chromatic-glow {
  text-shadow: 0 0 15px rgba(255, 255, 255, 0.25);
}

.slide-left-enter-active, .slide-left-leave-active,
.slide-right-enter-active, .slide-right-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-left-enter-from { opacity: 0; transform: translateX(40px); }
.slide-left-leave-to { opacity: 0; transform: translateX(-40px); }

.slide-right-enter-from { opacity: 0; transform: translateX(-40px); }
.slide-right-leave-to { opacity: 0; transform: translateX(40px); }

/* ExForum style transitions & minimal scrollbars */
.scroll-minimal::-webkit-scrollbar { display: none; }
.scroll-minimal { scrollbar-width: none; }

.exforum-page-reify-enter-active,
.exforum-page-reify-leave-active {
  transition:
    opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
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
  transform: translateY(16px);
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
  }
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
}
.fade-slide-enter-from { opacity: 0; transform: translateY(16px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-16px); }
</style>
