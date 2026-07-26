<template>
  <div class="tournament-stage w-full h-full flex flex-col items-center justify-between p-4 md:p-6 lg:p-10 relative overflow-y-auto custom-scrollbar min-h-0">
    <!-- Background Futuristic Glows & Scanlines -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <div class="absolute top-0 left-1/4 w-[500px] h-[300px] bg-theme-accent/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div class="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-purple-500/5 dark:bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none"></div>
      <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none opacity-50"></div>
    </div>

    <div v-if="isTournamentLoading || !currentTournament" class="flex flex-col items-center justify-center h-96 z-10 space-y-4">
      <div class="relative w-12 h-12 flex items-center justify-center">
        <div class="absolute inset-0 border-2 border-theme-text/20 animate-ping rounded-full"></div>
        <div class="absolute inset-2 border-2 border-t-theme-text border-r-transparent border-b-theme-text border-l-transparent animate-spin rounded-full"></div>
      </div>
      <span class="text-xs font-mono uppercase tracking-[0.3em] opacity-60">{{ t('common.loading') }}</span>
    </div>

    <!-- Main Content Container -->
    <div v-else class="w-full max-w-6xl flex flex-col items-center z-10 space-y-8 pb-12">
      
      <!-- Top Header Strip -->
      <div class="w-full flex flex-col md:flex-row items-center justify-between gap-4 border-b border-theme-border pb-6 relative">
        <div class="flex flex-col items-center md:items-start text-center md:text-left">
          <div class="flex items-center space-x-3 mb-2">
            <span class="px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-widest nier-bg-inverted text-white dark:text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]">
              [ {{ currentTournament.status.toUpperCase() }} // 0x88_REV ]
            </span>
            <span class="text-[9px] font-mono uppercase tracking-[0.25em] opacity-50">GENESIS MATRIX // SPECIAL EVENT</span>
          </div>
          <h1 class="text-3xl sm:text-4xl md:text-5xl font-serif uppercase tracking-[0.15em] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-theme-text via-theme-text/90 to-theme-text/50 chromatic-glow">
            {{ currentTournament.title }}
          </h1>
          <p class="text-xs md:text-sm font-mono uppercase tracking-[0.25em] opacity-60 mt-2 max-w-3xl">
            {{ currentTournament.subtitle }}
          </p>
        </div>

        <!-- Prize Pool Box -->
        <div v-if="currentTournament.prizePool" class="shrink-0 relative group p-4 border border-theme-border bg-theme-text/5 backdrop-blur-md rounded-sm overflow-hidden flex flex-col items-center md:items-end">
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <span class="text-[8px] font-mono uppercase tracking-[0.3em] opacity-40 mb-1">{{ t('tournament.prizePool') || 'TOTAL ALLOCATION_PRIZE' }}</span>
          <span class="text-xs md:text-sm font-mono font-bold uppercase tracking-[0.15em] text-theme-text shadow-sm">
            {{ currentTournament.prizePool }}
          </span>
        </div>
      </div>

      <!-- Center Grid: Visual Banner & Chrono Matrix + Rules -->
      <div class="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        <!-- Left: Visual Asset & Chrono Matrix (7 cols) -->
        <div class="lg:col-span-7 flex flex-col space-y-4">
          
          <!-- High-Tech Image Container -->
          <div class="relative w-full h-[240px] md:h-[300px] border border-theme-border rounded-sm overflow-hidden group shadow-[0_10px_30px_rgba(0,0,0,0.3)] bg-black/40">
            <img 
              :src="currentTournament.imageUrl || currentTournament.bannerUrl" 
              :alt="currentTournament.title" 
              class="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700 ease-out opacity-85 group-hover:opacity-100"
            />
            
            <!-- Tech HUD Overlay -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"></div>
            <div class="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-white/40 pointer-events-none"></div>
            <div class="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-white/40 pointer-events-none"></div>
            <div class="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-white/40 pointer-events-none"></div>
            <div class="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-white/40 pointer-events-none"></div>
            
            <div class="absolute bottom-4 left-4 right-4 flex justify-between items-end z-10 pointer-events-none">
              <div class="flex flex-col">
                <span class="text-[8px] font-mono text-white/50 tracking-[0.3em]">TELEMETRY FEED</span>
                <span class="text-[11px] font-mono text-white font-bold tracking-[0.2em]">LIVE VOLUMETRIC EVALUATION</span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                <span class="text-[9px] font-mono text-emerald-400 font-black uppercase tracking-widest">LINK READY</span>
              </div>
            </div>
          </div>

          <!-- Chronological Timeline Coordinates -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <!-- Announce Date -->
            <div class="p-3.5 border border-theme-border bg-theme-text/5 flex flex-col justify-between rounded-sm relative overflow-hidden group hover:border-theme-text/40 transition-all duration-300">
              <span class="text-[8px] font-mono uppercase tracking-[0.25em] opacity-45 mb-1.5">{{ t('tournament.dates.announce') || 'ANNOUNCE_DATE' }}</span>
              <span class="text-xs font-mono font-black uppercase tracking-[0.15em] text-theme-text">{{ formatDate(currentTournament.announceDate) }}</span>
              <div class="mt-2 flex items-center space-x-1.5 opacity-70">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span class="text-[7.5px] font-mono tracking-widest uppercase">ACTIVE RE-FEED</span>
              </div>
            </div>

            <!-- Start Date -->
            <div class="p-3.5 border border-theme-border bg-theme-text/5 flex flex-col justify-between rounded-sm relative overflow-hidden group hover:border-theme-text/40 transition-all duration-300">
              <span class="text-[8px] font-mono uppercase tracking-[0.25em] opacity-45 mb-1.5">{{ t('tournament.dates.start') || 'REGISTRATION / START' }}</span>
              <span class="text-xs font-mono font-black uppercase tracking-[0.15em] text-theme-text">{{ formatDate(currentTournament.startDate) }}</span>
              <div class="mt-2 flex items-center space-x-1.5" :class="isRegistrationOpen ? 'text-emerald-400' : 'text-amber-400'">
                <span class="w-1.5 h-1.5 rounded-full" :class="isRegistrationOpen ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'"></span>
                <span class="text-[7.5px] font-mono tracking-widest uppercase font-bold">{{ isRegistrationOpen ? (t('tournament.status.open') || 'OPEN') : (t('tournament.status.locked') || 'LOCKED') }}</span>
              </div>
            </div>

            <!-- End Date -->
            <div class="p-3.5 border border-theme-border bg-theme-text/5 flex flex-col justify-between rounded-sm relative overflow-hidden group hover:border-theme-text/40 transition-all duration-300">
              <span class="text-[8px] font-mono uppercase tracking-[0.25em] opacity-45 mb-1.5">{{ t('tournament.dates.end') || 'CONCLUSION_DATE' }}</span>
              <span class="text-xs font-mono font-black uppercase tracking-[0.15em] text-theme-text">{{ formatDate(currentTournament.endDate) }}</span>
              <div class="mt-2 flex items-center space-x-1.5 opacity-50">
                <span class="w-1.5 h-1.5 rounded-full bg-theme-text/40"></span>
                <span class="text-[7.5px] font-mono tracking-widest uppercase">TERMINATION</span>
              </div>
            </div>
          </div>

        </div>

        <!-- Right: Description & Operational Rules (5 cols) -->
        <div class="lg:col-span-5 flex flex-col justify-between p-5 border border-theme-border bg-theme-text/[0.02] rounded-sm relative">
          <div class="flex flex-col space-y-4">
            <div class="flex items-center justify-between border-b border-theme-border/50 pb-3">
              <span class="text-[9px] font-mono uppercase tracking-[0.3em] opacity-60 font-black">// PROTOCOL_BRIEFING</span>
              <div class="w-1.5 h-1.5 rotate-45 border border-theme-text opacity-40"></div>
            </div>

            <!-- Description Text -->
            <p class="text-xs font-mono leading-relaxed opacity-80 tracking-wide text-justify">
              {{ currentTournament.description }}
            </p>

            <div class="h-[1px] w-full bg-theme-border/30 my-2"></div>

            <!-- Key Parameters Checklist -->
            <div class="flex flex-col space-y-2.5">
              <span class="text-[8px] font-mono uppercase tracking-[0.3em] opacity-40">SYSTEM EVALUATION PARAMETERS</span>
              <div class="flex items-start space-x-3 text-[10px] font-mono">
                <span class="text-theme-text font-black opacity-80 shrink-0">[01]</span>
                <span class="opacity-75 tracking-wider">{{ t('tournament.rules.param1') || 'Autonomous scenario & risk execution precision.' }}</span>
              </div>
              <div class="flex items-start space-x-3 text-[10px] font-mono">
                <span class="text-theme-text font-black opacity-80 shrink-0">[02]</span>
                <span class="opacity-75 tracking-wider">{{ t('tournament.rules.param2') || 'Maximum adherence to predefined stop-loss protocols.' }}</span>
              </div>
              <div class="flex items-start space-x-3 text-[10px] font-mono">
                <span class="text-theme-text font-black opacity-80 shrink-0">[03]</span>
                <span class="opacity-75 tracking-wider">{{ t('tournament.rules.param3') || 'Minimal cognitive friction during volatile market phases.' }}</span>
              </div>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t border-theme-border/40 flex items-center justify-between text-[8px] font-mono opacity-40 uppercase tracking-[0.25em]">
            <span>ENCRYPTION: QUANTUM_SHA</span>
            <span>NODE: APEX_VOL_26</span>
          </div>
        </div>

      </div>

      <!-- Registration Tactical Action Box -->
      <div class="w-full mt-6 flex flex-col items-center justify-center p-6 border border-theme-border bg-theme-text/[0.04] relative overflow-hidden group">
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-theme-text/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

        <!-- STATE 1: ALREADY REGISTERED -->
        <div v-if="isUserRegistered" class="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-6 z-10 text-center sm:text-left">
          <div class="w-10 h-10 border border-emerald-500/60 bg-emerald-500/10 rounded-sm flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="flex flex-col">
            <span class="text-[9px] font-mono font-black tracking-[0.3em] text-emerald-400 uppercase">{{ t('tournament.registration.registeredTitle') || 'REIFIED OPERATOR // REGISTERED' }}</span>
            <span class="text-[11px] font-mono uppercase tracking-[0.18em] text-theme-text opacity-80 mt-0.5">{{ t('tournament.registration.registeredSubtitle') || 'Your trading credentials have been synchronized for this cup.' }}</span>
          </div>
        </div>

        <!-- STATE 2: REGISTRATION LOCKED (CURRENT DATE < START DATE) -->
        <div v-else-if="!isRegistrationOpen" class="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-6 z-10 text-center sm:text-left">
          <div class="w-10 h-10 border border-amber-500/50 bg-amber-500/10 rounded-sm flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.15)] animate-pulse">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div class="flex flex-col">
            <span class="text-[10px] font-mono font-black tracking-[0.3em] text-amber-400 uppercase flex items-center gap-2">
              <span>[ {{ t('tournament.registration.lockedTitle') || 'REGISTRATION PROTOCOL LOCKED' }} ]</span>
            </span>
            <span class="text-[11px] font-mono uppercase tracking-[0.15em] text-theme-text/80 mt-1">
              {{ t('tournament.registration.lockedSubtitle') || 'Access opens strictly on start date:' }} <strong class="text-amber-300 font-bold ml-1">{{ formatDate(currentTournament.startDate) }}</strong>
            </span>
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

    <!-- Bottom Return Action -->
    <div class="w-full mt-auto pt-6 flex justify-center z-10 shrink-0">
      <ExButton 
        variant="ghost" 
        @click="$emit('exit')" 
        class="text-[10px] font-mono uppercase tracking-[0.3em] px-6 py-2.5 opacity-60 hover:opacity-100 transition-opacity"
      >
        <div class="flex items-center space-x-2">
          <svg class="w-3.5 h-3.5 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          <span>{{ t('common.back') || 'Return_to_Nexus' }}</span>
        </div>
      </ExButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import ExButton from '~/shared/ui/ExButton.vue'
import { useI18n } from '~/shared/i18n/useI18n'
import { useAuthStore } from '~/entities/user/auth.store'
import {
  currentTournament,
  isTournamentLoading,
  isRegistering,
  isUserRegistered,
  isRegistrationOpen,
  initTournamentListener,
  initParticipantListener,
  terminateTournamentListeners,
  registerForTournament
} from '~/widgets/tournament/model/useTournament'

const emit = defineEmits(['exit'])
const { t } = useI18n()
const authStore = useAuthStore()

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
  if (!userId) {
    console.warn('[Tournament] User must be logged in to register.')
    return
  }
  try {
    await registerForTournament(userId, userEmail)
  } catch (err) {
    console.error('[Tournament] Registration failure:', err)
  }
}

onMounted(() => {
  initTournamentListener()
  if (authStore.user?.uid) {
    initParticipantListener(authStore.user.uid)
  }
})

watch(() => authStore.user?.uid, (newUid) => {
  initParticipantListener(newUid)
})

onUnmounted(() => {
  terminateTournamentListeners()
})
</script>

<style scoped>
.chromatic-glow {
  text-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
}
</style>
