<template>
  <Transition name="exforum-page-reify" appear>
    <div 
      class="w-full h-full flex flex-col items-center text-theme-text font-mono transition-colors duration-300 select-none relative scroll-minimal"
      :class="selectedEvent ? 'justify-start overflow-y-auto pt-6 pb-24' : 'justify-center overflow-hidden'"
    >
      
      <Transition name="fade-slide" mode="out-in">
        <!-- CAROUSEL MODE: PURE BANNER VIEW -->
        <div v-if="!selectedEvent" key="carousel" class="w-full max-w-[1400px] mx-auto flex flex-col items-center justify-center my-auto px-3 sm:px-6">
      
      <!-- EMPTY STATE IF NO EVENTS -->
      <div v-if="!activeEvent" class="p-12 text-center text-theme-text/60 font-mono text-sm uppercase tracking-widest border border-theme-border/40">
        [ SYSTEM // NO COMPETITION PROTOCOLS ACTIVE ]
      </div>

      <!-- CAROUSEL WRAPPER -->
      <div v-else class="w-full flex items-center justify-between gap-3 sm:gap-6 md:gap-8">
        <!-- PREV BUTTON (OUTSIDE CONTAINER, NO BORDER) -->
        <button
          @click.stop="prevSlide"
          :disabled="isSingleEvent"
          class="w-10 sm:w-12 h-20 flex items-center justify-center text-theme-text/60 hover:text-theme-text transition-all duration-300 disabled:opacity-15 disabled:cursor-default cursor-pointer group/prev shrink-0 focus:outline-none"
          title="Previous Event"
        >
          <svg class="w-7 sm:w-8 h-7 sm:h-8 transform group-hover/prev:-translate-x-1.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>

        <!-- CAROUSEL BANNER STAGE (STRICTLY CENTERED) -->
        <div class="flex-1 w-full min-w-0 overflow-hidden">
          <Transition :name="slideDirection" mode="out-in">
            <div 
              :key="activeEvent.id || 'slide'" 
              class="relative w-full h-[460px] min-h-[460px] sm:h-[500px] sm:min-h-[500px] md:h-[540px] md:min-h-[540px] lg:h-[580px] lg:min-h-[580px] shrink-0 border border-theme-border overflow-hidden bg-black group shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col justify-end"
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
              <div class="relative z-20 p-8 sm:p-12 md:p-16 max-w-4xl flex flex-col items-start space-y-4">
                <!-- EVENT TYPE BADGE -->
                <div v-if="activeEvent.type !== 'classic'" class="flex items-center gap-3">
                  <span class="px-3 py-1 text-[11px] sm:text-xs font-mono uppercase tracking-[0.25em] border border-white/40 bg-black/40 text-white/90 backdrop-blur-sm">
                    {{ activeEvent.type === 'classic' ? (t('tournament.types.classic') || 'CLASSIC') : (t('tournament.types.limited') || 'LIMITED') }}
                  </span>
                </div>

                <!-- EVENT TITLE -->
                <ExHeading 
                  level="h1" 
                  variant="cinematic" 
                  class="!text-3xl sm:!text-4xl md:!text-5xl lg:!text-6xl !text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] !leading-tight !mb-0"
                >
                  {{ getEventTitle(activeEvent) }}
                </ExHeading>

                <!-- TRUNCATED DESCRIPTION -->
                <p class="text-xs sm:text-sm md:text-base font-mono text-white/85 line-clamp-2 sm:line-clamp-3 overflow-hidden text-ellipsis leading-relaxed tracking-wide max-w-3xl drop-shadow">
                  {{ getEventDescription(activeEvent) }}
                </p>

                <!-- ENTER EVENT BUTTON ("ПЕРЕЙТИ В СОБЫТИЕ") -->
                <div class="pt-4">
                  <button
                    @click="selectEvent(activeEvent)"
                    class="px-8 py-4 border-2 border-white bg-white text-black font-mono text-xs sm:text-sm uppercase font-black tracking-[0.25em] transition-all duration-300 hover:bg-black/80 hover:text-white hover:border-white shadow-[0_0_30px_rgba(255,255,255,0.4)] cursor-pointer flex items-center space-x-3.5 group/enter"
                  >
                    <span>{{ t('tournament.enterEvent') || 'ENTER EVENT' }}</span>
                    <svg class="w-4 h-4 transform group-hover/enter:translate-x-1.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
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
          class="w-10 sm:w-12 h-20 flex items-center justify-center text-theme-text/60 hover:text-theme-text transition-all duration-300 disabled:opacity-15 disabled:cursor-default cursor-pointer group/next shrink-0 focus:outline-none"
          title="Next Event"
        >
          <svg class="w-7 sm:w-8 h-7 sm:h-8 transform group-hover/next:translate-x-1.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </div>

        <!-- DETAIL MODE: TACTICAL EVENT BRIEFING -->
        <div v-else key="detail" class="w-full max-w-[1400px] mx-auto flex flex-col px-3 sm:px-6">
      
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

      <!-- CENTERED REGISTRATION & AGREEMENT STAGE (Monochrome White & Black) -->
      <div class="w-full flex flex-col items-center justify-center pt-12 mt-6 border-t border-theme-border/30 text-center">
        
        <!-- CUSTOM CHECKBOX FOR AGREEMENT -->
        <label 
          v-if="!isUserRegistered"
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
          
          <!-- REGISTERED STATE -->
          <div 
            v-if="isUserRegistered" 
            class="px-10 py-4 border border-theme-text bg-theme-text text-theme-bg font-mono text-xs sm:text-sm uppercase font-black tracking-[0.25em]"
          >
            {{ locale === 'ru' ? 'ВЫ ЗАРЕГИСТРИРОВАНЫ' : 'REGISTERED' }}
          </div>

          <!-- REGISTER BUTTON (Dark in light theme, White in dark theme) -->
          <button
            v-else
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
import { useI18n } from '~/shared/i18n/useI18n'
import { useAuthStore } from '~/entities/user/auth.store'
import { useThemeStore } from '~/features/store/useTheme'
import type { TournamentEvent } from '~/widgets/tournament/model/tournament.types'
import {
  allTournaments,
  isTournamentLoading,
  isRegistering,
  isUserRegistered,
  checkRegistrationOpen,
  toMillis,
  initTournamentListener,
  initParticipantListener,
  terminateTournamentListeners,
  registerForTournament
} from '~/widgets/tournament/model/useTournament'

const emit = defineEmits(['exit'])
const { t, locale } = useI18n()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const showAllRules = ref(false)
const isAgreed = ref(false)
const nowMillis = ref(Date.now())
let timerInterval: any = null

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

const activeEvent = computed(() => {
  if (!allTournaments.value || allTournaments.value.length === 0) return null
  return allTournaments.value[activeSlide.value] || allTournaments.value[0] || null
})

const targetEvent = computed(() => {
  return selectedEvent.value || activeEvent.value || null
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

const selectEvent = (ev: TournamentEvent | null) => {
  if (ev) selectedEvent.value = ev
}

const prevSlide = () => {
  if (isSingleEvent.value || !allTournaments.value) return
  slideDirection.value = 'slide-right'
  activeSlide.value = (activeSlide.value - 1 + allTournaments.value.length) % allTournaments.value.length
}

const nextSlide = () => {
  if (isSingleEvent.value || !allTournaments.value) return
  slideDirection.value = 'slide-left'
  activeSlide.value = (activeSlide.value + 1) % allTournaments.value.length
}

const goToSlide = (idx: number) => {
  if (isSingleEvent.value || !allTournaments.value || idx === activeSlide.value) return
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
    await registerForTournament(user.uid, user.email ?? undefined, event.id)
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
  if (newUid && newEventId) {
    initParticipantListener(newUid, newEventId)
  }
}, { immediate: true })

onUnmounted(() => {
  terminateTournamentListeners()
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<style scoped>
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
