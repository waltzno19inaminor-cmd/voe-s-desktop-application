<template>
  <div class="w-full flex flex-col min-h-[calc(100vh-140px)] justify-between text-theme-text font-mono transition-colors duration-300 pb-8 select-none">
    
    <!-- CAROUSEL MODE: PURE BANNER VIEW -->
    <div v-if="!selectedEvent" class="w-full max-w-6xl mx-auto flex flex-col items-center justify-center my-auto py-4">
      
      <!-- EMPTY STATE IF NO EVENTS -->
      <div v-if="!activeEvent" class="p-12 text-center text-theme-text/60 font-mono text-sm uppercase tracking-widest border border-theme-border/40">
        [ SYSTEM // NO COMPETITION PROTOCOLS ACTIVE ]
      </div>

      <!-- CAROUSEL BANNER STAGE -->
      <Transition :name="slideDirection" mode="out-in" v-else>
        <div 
          :key="activeEvent.id || 'slide'" 
          class="relative w-full h-[460px] sm:h-[500px] md:h-[540px] lg:h-[580px] border border-theme-border overflow-hidden bg-black group shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col justify-end"
        >
          <!-- BACKGROUND IMAGE -->
          <img 
            :src="activeEvent.bannerUrl || activeEvent.imageUrl" 
            :alt="activeEvent.title"
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

          <!-- NAVIGATION CONTROLS (INSIDE BANNER ON SIDES, LOCKED/DISABLED IF SINGLE EVENT) -->
          <button
            @click.stop="prevSlide"
            :disabled="isSingleEvent"
            class="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-16 border border-white/20 bg-black/60 backdrop-blur-md flex items-center justify-center text-white/80 hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-15 disabled:cursor-not-allowed disabled:hover:bg-black/60 disabled:hover:text-white/80 group/prev shadow-lg"
            title="Previous Event"
          >
            <svg class="w-5 h-5 transform group-hover/prev:-translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>

          <button
            @click.stop="nextSlide"
            :disabled="isSingleEvent"
            class="absolute right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-16 border border-white/20 bg-black/60 backdrop-blur-md flex items-center justify-center text-white/80 hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-15 disabled:cursor-not-allowed disabled:hover:bg-black/60 disabled:hover:text-white/80 group/next shadow-lg"
            title="Next Event"
          >
            <svg class="w-5 h-5 transform group-hover/next:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>

          <!-- BANNER OVERLAY CONTENT -->
          <div class="relative z-20 p-8 sm:p-12 md:p-16 max-w-4xl flex flex-col items-start space-y-4">
            <!-- EVENT TYPE BADGE -->
            <div class="flex items-center gap-3">
              <span 
                class="px-3.5 py-1 text-[11px] sm:text-xs font-mono font-black uppercase tracking-[0.25em] shadow-xl border"
                :class="activeEvent.type === 'classic' ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse'"
              >
                [ {{ activeEvent.type === 'classic' ? (t('tournament.types.classic') || 'CLASSIC') : (t('tournament.types.limited') || 'LIMITED') }} ]
              </span>
            </div>

            <!-- EVENT TITLE -->
            <h1 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif uppercase tracking-[0.08em] font-extrabold text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] leading-tight">
              {{ activeEvent.title }}
            </h1>

            <!-- TRUNCATED DESCRIPTION -->
            <p class="text-xs sm:text-sm md:text-base font-mono text-white/85 line-clamp-2 sm:line-clamp-3 overflow-hidden text-ellipsis leading-relaxed tracking-wide max-w-3xl drop-shadow">
              {{ activeEvent.description }}
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

    <!-- DETAIL MODE: TACTICAL EVENT BRIEFING -->
    <div v-else class="w-full max-w-6xl mx-auto flex flex-col pt-2 sm:pt-4">
      
      <!-- TOP NAVIGATION BAR INSIDE EVENT -->
      <div class="mb-6 flex items-center justify-between border-b border-theme-border/40 pb-4">
        <button 
          @click="selectedEvent = null" 
          class="flex items-center space-x-2.5 text-xs font-mono text-theme-text/80 hover:text-theme-text transition-colors uppercase tracking-[0.2em] group/back font-bold"
        >
          <svg class="w-4 h-4 rotate-180 transform group-hover/back:-translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          <span>[ {{ t('tournament.backToEvents') || 'ALL EVENTS' }} ]</span>
        </button>
        <span 
          class="px-3 py-1 text-[10px] font-mono font-black uppercase tracking-[0.25em] border"
          :class="targetEvent?.type === 'classic' ? 'border-cyan-400/80 bg-cyan-500/10 text-cyan-400' : 'border-amber-400/80 bg-amber-500/10 text-amber-400'"
        >
          [ {{ targetEvent?.type === 'classic' ? (t('tournament.types.classic') || 'CLASSIC') : (t('tournament.types.limited') || 'LIMITED') }} // PROTOCOL ]
        </span>
      </div>

      <!-- HEADER STRIP -->
      <div class="relative w-full border border-theme-border p-6 sm:p-8 bg-theme-panel dark:bg-[#121214] mb-8 shadow-sm">
        <!-- Corner Accents -->
        <div class="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2 border-theme-text pointer-events-none"></div>
        <div class="absolute -top-[1px] -right-[1px] w-4 h-4 border-t-2 border-r-2 border-theme-text pointer-events-none"></div>
        <div class="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b-2 border-l-2 border-theme-text pointer-events-none"></div>
        <div class="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2 border-theme-text pointer-events-none"></div>

        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <!-- Title Group -->
          <div class="flex flex-col space-y-2 max-w-3xl">
            <span class="text-[10px] font-mono tracking-[0.3em] text-theme-text/60 uppercase flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>{{ t('tournament.indicator') || 'PARTICIPATE IN EVENT:' }} #{{ targetEvent?.id?.toUpperCase() || 'CUP_2026' }}</span>
            </span>
            <h1 class="text-2xl sm:text-3xl md:text-4xl font-serif uppercase tracking-[0.12em] font-bold text-theme-text chromatic-glow">
              {{ targetEvent?.title || 'TOURNAMENT PROTOCOL' }}
            </h1>
            <p class="text-xs sm:text-sm font-mono uppercase tracking-[0.18em] text-theme-text/70">
              {{ targetEvent?.subtitle || 'TACTICAL EVALUATION' }}
            </p>
          </div>

          <!-- Prize Pool Tag -->
          <div class="flex flex-col border border-theme-border bg-theme-bg p-4 min-w-[260px] text-left lg:text-right shrink-0">
            <span class="text-[9px] font-mono uppercase tracking-[0.25em] text-theme-text/60">{{ t('tournament.prizePool') || 'TOTAL ALLOCATION_PRIZE' }}</span>
            <span class="text-sm sm:text-base font-mono uppercase tracking-[0.1em] font-extrabold text-amber-500 dark:text-amber-400 mt-1">
              {{ targetEvent?.prizePool || 'ARCHIVE ALLOCATION' }}
            </span>
          </div>
        </div>
      </div>

      <!-- MAIN COMPETITION DETAILS GRID -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        
        <!-- Left: Visual Asset & Chrono Matrix (5 cols) -->
        <div class="lg:col-span-5 flex flex-col space-y-6">
          <div class="relative w-full h-64 sm:h-72 border border-theme-border overflow-hidden group bg-black/40">
            <img 
              :src="targetEvent?.imageUrl || targetEvent?.bannerUrl" 
              :alt="targetEvent?.title" 
              class="w-full h-full object-cover object-center filter contrast-125 transition-transform duration-700 group-hover:scale-105 opacity-90"
            />
            <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none"></div>
            <div class="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 to-transparent flex justify-between items-end">
              <span class="text-[10px] font-mono uppercase text-white/80 tracking-widest">[ VISUAL_TELEMETRY // LIVE ]</span>
              <span class="text-[10px] font-mono uppercase text-cyan-400 tracking-widest">{{ targetEvent?.status?.toUpperCase() || 'ANNOUNCED' }}</span>
            </div>
          </div>

          <!-- Chrono Coordinate Matrix -->
          <div class="border border-theme-border p-5 bg-theme-panel dark:bg-[#121214] space-y-4">
            <div class="text-[11px] font-mono uppercase tracking-[0.2em] font-bold text-theme-text border-b border-theme-border/40 pb-2">
              // CHRONO_COORDINATE_MATRIX
            </div>

            <div class="flex items-center justify-between text-xs font-mono py-1">
              <span class="text-theme-text/60 uppercase tracking-[0.1em]">{{ t('tournament.dates.announce') || 'ANNOUNCE_DATE' }}:</span>
              <span class="font-bold text-theme-text uppercase tracking-widest">{{ formatDate(targetEvent?.announceDate) }}</span>
            </div>

            <div class="flex items-center justify-between text-xs font-mono py-1 border-t border-theme-border/20">
              <span class="text-theme-text/60 uppercase tracking-[0.1em]">{{ t('tournament.dates.start') || 'REGISTRATION / START' }}:</span>
              <span class="font-bold text-amber-500 dark:text-amber-400 uppercase tracking-widest">{{ formatDate(targetEvent?.startDate) }}</span>
            </div>

            <div class="flex items-center justify-between text-xs font-mono py-1 border-t border-theme-border/20">
              <span class="text-theme-text/60 uppercase tracking-[0.1em]">{{ t('tournament.dates.end') || 'CONCLUSION_DATE' }}:</span>
              <span class="font-bold text-theme-text uppercase tracking-widest">{{ formatDate(targetEvent?.endDate) }}</span>
            </div>
          </div>
        </div>

        <!-- Right: Description & Rules Briefing (7 cols) -->
        <div class="lg:col-span-7 flex flex-col space-y-6">
          <div class="border border-theme-border p-6 sm:p-8 bg-theme-panel dark:bg-[#121214] flex-1 flex flex-col justify-between relative">
            <div class="absolute top-0 right-0 p-3 opacity-20 pointer-events-none font-mono text-2xl font-extrabold select-none">///</div>
            
            <div class="space-y-6">
              <div class="text-xs font-mono uppercase tracking-[0.25em] font-extrabold text-theme-text flex items-center gap-2">
                <span class="w-1.5 h-4 bg-theme-text inline-block"></span>
                <span>PROTOCOL BRIEFING & LORE</span>
              </div>
              
              <p class="text-sm font-mono leading-relaxed text-theme-text/85 text-justify tracking-wide">
                {{ targetEvent?.description }}
              </p>

              <div class="border-t border-theme-border/40 pt-6 space-y-4">
                <div class="text-[11px] font-mono uppercase tracking-[0.2em] font-bold text-theme-text/80">
                  // SYSTEM_EVALUATION_PARAMETERS:
                </div>
                <ul class="space-y-2.5 text-xs font-mono text-theme-text/80">
                  <li class="flex items-start space-x-3">
                    <span class="text-amber-500 dark:text-amber-400 font-bold mt-0.5">&gt;</span>
                    <span>{{ t('tournament.rules.param1') || 'Autonomous scenario & risk execution precision.' }}</span>
                  </li>
                  <li class="flex items-start space-x-3">
                    <span class="text-amber-500 dark:text-amber-400 font-bold mt-0.5">&gt;</span>
                    <span>{{ t('tournament.rules.param2') || 'Maximum adherence to predefined stop-loss protocols.' }}</span>
                  </li>
                  <li class="flex items-start space-x-3">
                    <span class="text-amber-500 dark:text-amber-400 font-bold mt-0.5">&gt;</span>
                    <span>{{ t('tournament.rules.param3') || 'Minimal cognitive friction during volatile market phases.' }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- BOTTOM REGISTRATION TACTICAL STAGE -->
      <div class="w-full border-2 border-theme-text p-6 sm:p-8 bg-theme-bg relative mt-auto shadow-lg overflow-hidden">
        <!-- Decorative Background Pattern -->
        <div class="absolute -right-12 -bottom-12 text-[140px] font-serif font-extrabold text-theme-text/5 select-none pointer-events-none">APEX</div>

        <div class="flex items-center justify-center w-full min-h-[64px]">
          
          <!-- STATE 1: ALREADY REGISTERED -->
          <div v-if="isUserRegistered" class="flex flex-col sm:flex-row items-center justify-between w-full max-w-3xl z-10 gap-6">
            <div class="flex items-center space-x-4">
              <div class="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
              <div class="flex flex-col">
                <span class="text-xs font-mono font-black tracking-[0.25em] text-emerald-500 dark:text-emerald-400 uppercase">{{ t('tournament.registration.registeredTitle') || 'REIFIED OPERATOR // REGISTERED' }}</span>
                <span class="text-xs font-mono uppercase tracking-[0.1em] text-theme-text/80 mt-1">{{ t('tournament.registration.registeredSubtitle') || 'Your trading credentials have been synchronized for this cup.' }}</span>
              </div>
            </div>
            <div class="px-6 py-2.5 border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-mono text-[11px] uppercase tracking-widest font-bold">
              [ LINK_VERIFIED // ACTIVE ]
            </div>
          </div>

          <!-- STATE 2: REGISTRATION LOCKED -->
          <div v-else-if="!isOpen" class="flex flex-col sm:flex-row items-center justify-between w-full max-w-3xl z-10 gap-6 text-center sm:text-left">
            <div class="flex items-center space-x-4">
              <div class="w-3 h-3 rounded-full bg-amber-500/40 border border-amber-500 shrink-0">
                <svg class="w-3 h-3 text-amber-500 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
              <div class="flex flex-col">
                <span class="text-[10px] font-mono font-black tracking-[0.3em] text-amber-400 uppercase flex items-center justify-center sm:justify-start gap-2">
                  <span>[ {{ t('tournament.registration.lockedTitle') || 'REGISTRATION PROTOCOL LOCKED' }} ]</span>
                </span>
                <span class="text-[11px] font-mono uppercase tracking-[0.15em] text-theme-text/80 mt-1">
                  {{ t('tournament.registration.lockedSubtitle') || 'Access opens strictly on start date:' }} <strong class="text-amber-300 font-bold ml-1">{{ formatDate(targetEvent?.startDate) }}</strong>
                </span>
              </div>
            </div>
            <div class="px-6 py-2.5 border border-amber-500/30 bg-amber-500/5 text-amber-400/80 font-mono text-[10px] uppercase tracking-widest font-bold">
              [ STATUS: STANDBY ]
            </div>
          </div>

          <!-- STATE 3: REGISTRATION OPEN -->
          <div v-else class="flex flex-col sm:flex-row items-center justify-between w-full max-w-3xl z-10 gap-6">
            <div class="flex flex-col text-center sm:text-left">
              <span class="text-[9px] font-mono font-black tracking-[0.3em] text-cyan-400 dark:text-cyan-300 uppercase animate-pulse">{{ t('tournament.registration.openTitle') || 'PROTOCOL ACCESS // OPEN' }}</span>
              <span class="text-sm font-mono uppercase font-bold tracking-[0.18em] text-theme-text mt-1">{{ t('tournament.registration.openSubtitle') || 'Initiate link to enter tactical competition' }}</span>
            </div>
            <button
              @click="handleRegister"
              :disabled="isRegistering"
              class="relative px-8 py-3.5 border-2 border-theme-text bg-theme-text text-theme-bg font-mono text-xs uppercase tracking-[0.25em] font-extrabold overflow-hidden group/btn hover:bg-transparent hover:text-theme-text transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer disabled:opacity-50"
            >
              <span class="relative z-10">{{ isRegistering ? (t('common.loading') || 'REIFYING...') : (t('tournament.registration.actionButton') || 'REGISTER FOR TOURNAMENT') }}</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import ExButton from '~/shared/ui/ExButton.vue'
import { useI18n } from '~/shared/i18n/useI18n'
import { useAuthStore } from '~/entities/user/auth.store'
import type { TournamentEvent } from '~/widgets/tournament/model/tournament.types'
import {
  allTournaments,
  isTournamentLoading,
  isRegistering,
  isUserRegistered,
  checkRegistrationOpen,
  initTournamentListener,
  initParticipantListener,
  terminateTournamentListeners,
  registerForTournament
} from '~/widgets/tournament/model/useTournament'

const emit = defineEmits(['exit'])
const { t } = useI18n()
const authStore = useAuthStore()

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
  const userId = authStore.user?.uid
  const userEmail = authStore.user?.email || undefined
  const eventId = targetEvent.value?.id
  if (!userId || !eventId) {
    console.warn('[Tournament] User must be logged in and event must exist to register.')
    return
  }
  try {
    await registerForTournament(userId, userEmail, eventId)
  } catch (err) {
    console.error('[Tournament] Registration failure:', err)
  }
}

onMounted(() => {
  initTournamentListener()
  if (authStore.user?.uid && targetEvent.value?.id) {
    initParticipantListener(authStore.user.uid, targetEvent.value.id)
  }
})

watch([() => authStore.user?.uid, () => targetEvent.value?.id], ([newUid, newEventId]) => {
  if (newUid && newEventId) {
    initParticipantListener(newUid, newEventId)
  }
}, { immediate: true })

onUnmounted(() => {
  terminateTournamentListeners()
})
</script>

<style scoped>
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
</style>
