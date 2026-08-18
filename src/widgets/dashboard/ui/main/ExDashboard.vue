<template>
  <div class="dashboard-shell h-full min-h-0 w-full relative overflow-hidden py-1.5 pb-4 lg:py-2 lg:pb-4" :class="activeDashboardPanel === 'forum' ? 'px-0' : 'px-6 lg:px-10'">
    <div
      class="pointer-events-none absolute inset-0 transition-opacity duration-[900ms] ease-in-out"
      :class="isEventsPanelActive ? 'opacity-0' : 'opacity-100'"
    >
      <GradflowBackground preset="mystic" :config="dashboardGradflowConfig" />
    </div>

    <!-- Update Notification Widget -->
    <div v-if="updateNotification.showUpdate" class="absolute top-0 left-12 right-12 z-[250] nier-bg-inverted p-5 flex justify-between items-center overflow-hidden group shadow-[0_10px_40px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_40px_rgba(255,255,255,0.2)]">
      
      <!-- Animated Background Scanline -->
      <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-black/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1500ms] ease-in-out"></div>
      
      <!-- Decorative Tactical Elements -->
      <div class="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-white/20 dark:border-black/20 pointer-events-none"></div>
      <div class="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-white/20 dark:border-black/20 pointer-events-none"></div>
      
      <!-- Left side: Text & Icon -->
      <div class="flex items-center space-x-6 relative z-10">
        <div class="flex flex-col items-center space-y-1.5">
          <div class="w-2 h-2 bg-theme-accent animate-pulse shadow-[0_0_8px_rgba(var(--theme-accent-rgb),0.8)]"></div>
          <div class="text-[6px] text-white/40 dark:text-black/40 font-mono tracking-widest">SYS</div>
        </div>
        
        <div class="flex flex-col">
          <div class="flex items-center space-x-3">
            <ExText variant="telemetry" class="!opacity-100 uppercase tracking-[0.2em] !text-white dark:!text-black font-bold">
              {{ t('dashboard.ui.newVersionAvailable') }}
            </ExText>
            <span class="px-2 py-0.5 border border-theme-accent nier-text-primary text-[9px] font-mono font-bold shadow-[0_0_5px_rgba(var(--theme-accent-rgb),0.3)]" v-if="updateNotification.version">
              v{{ updateNotification.version }}
            </span>
          </div>
          <div class="flex items-center space-x-2 mt-1.5 opacity-60">
            <div class="h-[1px] w-12 nier-bg-panel"></div>
            <span class="text-[7.5px] font-mono tracking-widest nier-text-primary uppercase opacity-70">Your data will be saved.</span>
          </div>
        </div>
      </div>

      <!-- Right side: Download Button -->
      <div class="relative z-10 flex items-center space-x-6">
        <!-- Hash/Code decorative -->
        <div class="flex flex-col space-y-1 text-right hidden md:flex">
           <span class="text-[7px] font-mono text-white/30 dark:text-black/30 tracking-[0.3em]">0xUPDATE_SEQ_INIT</span>
           <span class="text-[7px] font-mono text-white/30 dark:text-black/30 tracking-[0.3em]">{{ new Date().toISOString().split('T')[1]?.substring(0, 8) }}Z</span>
        </div>
        
        <button 
          @click="handleDownload(updateNotification.downloadLink)" 
          class="relative px-8 py-3.5 bg-transparent border border-white/20 dark:border-black/20 nier-text-primary text-[10px] font-mono uppercase tracking-[0.25em] overflow-hidden group/btn hover:border-white dark:hover:border-black transition-colors duration-300 cursor-pointer"
        >
          <!-- Button background slide -->
          <div class="absolute inset-0 nier-bg-panel transform scale-x-0 group-hover/btn:scale-x-100 transition-transform duration-500 origin-left"></div>
          
          <span class="relative z-10 flex items-center space-x-3 group-hover/btn:text-black dark:group-hover/btn:text-white transition-colors duration-500 font-bold">
            <span>{{ t('dashboard.ui.download') }}</span>
            <svg class="w-3.5 h-3.5 transform group-hover/btn:translate-y-0.5 transition-all duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </span>
        </button>
      </div>
    </div>

    <div class="absolute inset-x-0 top-0 z-[190] h-[84px] bg-black" aria-hidden="true"></div>

    <header class="dashboard-top-bar absolute left-6 right-6 top-0 z-[200] flex h-[84px] items-center justify-between bg-black px-4 backdrop-blur-md lg:left-10 lg:right-10 lg:px-5">
      <div class="flex items-center gap-4">
        <ExTag class="shrink-0">v{{ appVersion.toUpperCase().replace('-', '_') }}</ExTag>
      </div>

      <div class="flex shrink-0 items-center gap-4 sm:gap-8">
        <!-- Language Selector -->
        <div class="flex items-center gap-3 border-r border-theme-border pr-4 sm:gap-4 sm:pr-6">
          <button 
            v-for="l in ['en', 'ru']" 
            :key="l"
            @click="setLocale(l)"
            class="text-[10px] font-mono tracking-widest uppercase transition-all duration-300"
            :class="locale === l ? 'text-[#2C3E50] dark:text-white/70 font-bold underline underline-offset-4' : 'opacity-30 hover:opacity-100'"
          >
            {{ l }}
          </button>
        </div>



        <!-- Utility Group: Identity, Report, Theme -->
        <div class="flex items-center gap-4 sm:gap-6">
          <!-- User Identity (clickable → sign-out popover) -->
          <div class="relative" ref="identityRef">
            <button @click="toggleMenu" class="focus:outline-none cursor-pointer">
              <ExIdentity
                :name="displayName"
                :avatar-url="authStore.user?.avatarUrl || authStore.user?.photoURL || undefined"
                rank="Operator"
              />
            </button>

            <!-- Teleport dropdown to body to escape any overflow:hidden ancestors -->
            <Teleport to="body">
              <Transition name="menu-drop">
                <div
                  v-if="userMenuOpen"
                  ref="menuRef"
                  :style="menuStyle"
                  class="fixed z-[9999] min-w-[200px] border border-theme-border bg-theme-bg shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
                >
                  <!-- User info strip -->
                  <div class="px-5 py-3 border-b border-theme-border">
                    <p class="text-[8px] font-mono uppercase tracking-[0.4em] opacity-40">{{ t('dashboard.ui.signedInAs') }}</p>
                    <p class="text-[10px] font-mono font-black uppercase tracking-widest truncate">{{ authStore.user?.email }}</p>
                  </div>
                  <!-- Settings -->
                  <button
                    @click="goProfile"
                    class="w-full flex items-center space-x-3 px-5 py-3 border-b border-theme-border text-[9px] font-mono uppercase tracking-[0.4em] transition-all duration-300"
                  >
                    <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.05V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.05-.33H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1.05V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 .6 1 1.65 1.65 0 0 0 1.05.33H21a2 2 0 0 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15z"/>
                    </svg>
                    <span>{{ locale === 'ru' ? 'НАСТРОЙКИ' : 'SETTINGS' }}</span>
                  </button>
                  <!-- Sign out -->
                  <button
                    @click="doSignOut"
                    class="w-full flex items-center space-x-3 px-5 py-3 text-[9px] font-mono uppercase tracking-[0.4em] transition-all duration-300"
                  >
                    <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    <span>{{ t('dashboard.ui.signOut') }}</span>
                  </button>
                </div>
              </Transition>
            </Teleport>
          </div>

          <ExNotificationCenter :user-id="authStore.user?.uid" :locale="locale" />

          <!-- Music Toggle -->
          <button
            type="button"
            class="dashboard-icon-toggle opacity-30 hover:opacity-100 transition-all duration-300"
            :aria-label="props.isMusicMuted ? (locale === 'ru' ? 'Включить музыку' : 'Enable music') : (locale === 'ru' ? 'Отключить музыку' : 'Disable music')"
            @click="$emit('toggle-music')"
          >
            <svg
              v-if="props.isMusicMuted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="square"
              stroke-linejoin="miter"
              class="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M11 5 6 9H3v6h3l5 4V5z" />
              <path d="m17 9 4 4" />
              <path d="m21 9-4 4" />
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="square"
              stroke-linejoin="miter"
              class="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M11 5 6 9H3v6h3l5 4V5z" />
              <path d="M15 9.5a4 4 0 0 1 0 5" />
              <path d="M18 7a8 8 0 0 1 0 10" />
            </svg>
          </button>

        </div>

      </div>
    </header>

    <!-- 2. Central Stage -->
    <main
      class="dashboard-center-stage absolute inset-0 z-10 flex items-center justify-center"
      :class="[
        isDashboardFullBleedPanel ? 'px-0' : 'px-8',
        activeDashboardPanel === 'activity' ? 'is-activity' : ''
      ]"
    >
      <Transition
        name="dashboard-center-fade"
        mode="out-in"
        @before-leave="handleDashboardCenterBeforeLeave"
        @after-leave="handleDashboardCenterAfterLeave"
        @leave-cancelled="handleDashboardCenterAfterLeave"
      >
        <div
          v-if="isOfflineRestrictedPanel"
          key="offline-panel-loader"
          class="dashboard-offline-panel-loader pointer-events-none"
          data-dashboard-panel="offline-loader"
          role="status"
          aria-live="polite"
        >
          <div class="dashboard-offline-loader-content">
            <div class="dashboard-offline-spinner" aria-hidden="true"></div>
            <p class="dashboard-offline-label">
              {{ locale === 'ru' ? 'Вы оффлайн' : 'You are offline' }}
            </p>
          </div>
        </div>

        <div
          v-else-if="activeDashboardPanel === 'activity'"
          key="activity-monitor"
          class="dashboard-activity-stage pointer-events-auto h-full w-full"
          data-dashboard-panel="activity"
        >
          <ExActivityMonitor @exit="activeDashboardPanel = null" />
        </div>

        <div
          v-else-if="activeDashboardPanel === 'forum'"
          key="forum-monitor"
          class="pointer-events-auto h-full w-full"
          data-dashboard-panel="forum"
        >
          <ExForum />
        </div>

        <div
          v-else-if="activeDashboardPanel === 'tournament'"
          key="tournament-monitor"
          class="pointer-events-auto h-full w-full"
          data-dashboard-panel="tournament"
        >
          <ExTournamentView @exit="activeDashboardPanel = null" />
        </div>

        <div v-else key="dashboard-logo" class="dashboard-core-logo pointer-events-none flex flex-col items-center text-center" data-dashboard-panel="logo">
          <div class="relative flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14">
            <div class="absolute inset-0 border-2 border-theme-text/40 animate-[spin_10s_linear_infinite]"></div>
            <div class="absolute inset-4 border border-theme-text/60 animate-[spin_6s_linear_infinite_reverse]"></div>
            <div class="h-2 w-2 rotate-45 animate-pulse nier-bg-inverted"></div>
            <div class="absolute -left-2 -top-2 h-3 w-3 border-l-2 border-t-2 border-theme-text"></div>
            <div class="absolute -bottom-2 -right-2 h-3 w-3 border-b-2 border-r-2 border-theme-text"></div>
          </div>
        </div>
      </Transition>
    </main>

    <!-- 3. Bottom Navigation Bar -->
    <nav
      class="dashboard-bottom-nav absolute bottom-0 left-0 z-[200] flex w-full items-center justify-center bg-black px-6 py-[22px] backdrop-blur-md lg:px-10"
      aria-label="Tactical dashboard pages"
    >
      <div class="flex w-[min(920px,calc(100vw-48px))] items-center justify-center gap-2">
        <ExButton
          v-for="module in dashboardModules"
          :key="module.id"
          variant="ghost"
          size="none"
          class="dashboard-page-button min-h-10 flex-1 !border-transparent !bg-transparent px-4 py-2 text-center text-[9px] tracking-[0.26em]"
          :class="activeDashboardPanel === module.id ? ['is-active opacity-100', themeStore.settings.isDark ? 'is-active-dark' : ''] : 'opacity-50 hover:opacity-100'"
          @click="handleDashboardModuleClick(module.id)"
        >
          {{ t(module.titleKey) }}
        </ExButton>
      </div>
    </nav>

    <ExProfileOverlay :open="showProfileOverlay" @close="closeProfileOverlay" />

  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { getAuth, signOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '~/shared/firebase.client'
import { open } from '@tauri-apps/plugin-shell'
import { useI18n } from '~/shared/i18n/useI18n'
import tauriConfig from '../../../../../src-tauri/tauri.conf.json'
import ExHeading from "~/shared/ui/ExHeading.vue"
import ExText from "~/shared/ui/ExText.vue"
import ExTag from "~/shared/ui/ExTag.vue"
import ExButton from "~/shared/ui/ExButton.vue"
import ExIdentity from "~/shared/ui/ExIdentity.vue"
import ExNotificationCenter from '~/entities/notification/ui/ExNotificationCenter.vue'
import { useAuthStore } from '~/entities/user/auth.store'
import { useThemeStore } from '~/features/store/useTheme'
import ExProfileOverlay from '~/widgets/profile/ui/ExProfileOverlay.vue'
import ExActivityMonitor from '~/widgets/dashboard/ui/activity/ExActivityMonitor.vue'
import ExForum from '~/widgets/exforum/ui/ExForum.vue'
import ExTournamentView from '~/widgets/tournament/ui/ExTournamentView.vue'
import { initTournamentListener } from '~/widgets/tournament/model/useTournament'
import GradflowBackground from '~/widgets/style/ui/GradflowBackground.vue'

const props = withDefaults(defineProps<{
  isMusicMuted?: boolean
}>(), {
  isMusicMuted: false
})

const emit = defineEmits(['navigate', 'signed-out', 'toggle-music'])

const { t, locale, setLocale } = useI18n()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const appVersion = String(tauriConfig.version || '0.0.0')

const dashboardGradflowConfig = {
  color1: { r: 2, g: 145, b: 135 },
  color2: { r: 165, g: 249, b: 193 },
  color3: { r: 153, g: 151, b: 231 },
  speed: 0.5,
  scale: 2,
  type: 'smoke' as const,
  noise: 0.22
}

// User menu
const userMenuOpen = ref(false)
const identityRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const menuStyle = ref<Record<string, string>>({})
const showProfileOverlay = ref(false)
const activeDashboardPanel = ref<string | null>(null)
const isDashboardForumLeaving = ref(false)
const isEventsPanelActive = computed(() => activeDashboardPanel.value === 'tournament')
const isOfflineRestrictedPanel = computed(() => (
  authStore.isOffline &&
  ['forum', 'activity', 'tournament'].includes(activeDashboardPanel.value || '')
))
const isDashboardFullBleedPanel = computed(() => (
  activeDashboardPanel.value === 'forum' ||
  activeDashboardPanel.value === 'activity' ||
  activeDashboardPanel.value === 'tournament' ||
  isDashboardForumLeaving.value
))

const toggleMenu = () => {
  if (!userMenuOpen.value && identityRef.value) {
    const rect = identityRef.value.getBoundingClientRect()
    const themeRoot = identityRef.value.closest('.theme-dark, .theme-light') as HTMLElement | null
    const themeStyle = themeRoot ? getComputedStyle(themeRoot) : null
    const themeBg = themeStyle?.getPropertyValue('--theme-bg').trim() || '#0a0a0a'
    const themeText = themeStyle?.getPropertyValue('--theme-text').trim() || 'rgba(255, 255, 255, 0.7)'
    const themeBorder = themeStyle?.getPropertyValue('--theme-border').trim() || 'rgba(255, 255, 255, 0.1)'

    menuStyle.value = {
      top: `${rect.bottom + 8}px`,
      right: `${window.innerWidth - rect.right}px`,
      backgroundColor: themeBg,
      color: themeText,
      borderColor: themeBorder,
      '--theme-bg': themeBg,
      '--theme-text': themeText,
      '--theme-border': themeBorder,
    }
  }
  userMenuOpen.value = !userMenuOpen.value
}

const doSignOut = async () => {
  userMenuOpen.value = false
  await signOut(getAuth())
  authStore.setUser(null as any)
  emit('signed-out')
}

const goProfile = () => {
  userMenuOpen.value = false
  showProfileOverlay.value = true
}

const closeProfileOverlay = () => {
  showProfileOverlay.value = false
}

// Close on outside click
const handleOutsideClick = (e: MouseEvent) => {
  const target = e.target as Node

  if (
    identityRef.value &&
    !identityRef.value.contains(target) &&
    !menuRef.value?.contains(target)
  ) {
    userMenuOpen.value = false
  }
}
const updateNotification = ref({ showUpdate: false, downloadLink: '', version: '' })
let unsubUpdate: any = null

const handleDownload = async (url: string) => {
  if (!url) return
  try {
    await open(url)
  } catch (err) {
    console.error("Failed to open via tauri:", err)
    window.open(url, '_blank')
  }
}

onMounted(() => {
  initTournamentListener()
  document.addEventListener('mousedown', handleOutsideClick)

  unsubUpdate = onSnapshot(doc(db, 'app_settings', 'update_notification'), (docSnap) => {
    if (docSnap.exists()) {
      updateNotification.value = docSnap.data() as any
    }
  }, (error) => {
    if (error?.code !== 'permission-denied') {
      console.warn('[Dashboard] Update notification listener stopped:', error)
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
  if (unsubUpdate) unsubUpdate()
})

const displayName = computed(() => {
  const u = authStore.user
  if (!u) return 'Operator'
  return u.displayName || u.email?.split('@')[0] || 'Operator'
})

const dashboardModules = [
  { 
    id: 'forum', 
    code: 'F1', 
    titleKey: 'dashboard.modules.knowledge_matrix', 
    descriptionKey: 'dashboard.descriptions.knowledge_matrix' 
  },
  { 
    id: 'activity', 
    code: 'A2', 
    titleKey: 'dashboard.modules.activity_monitor', 
    descriptionKey: 'dashboard.descriptions.activity_monitor' 
  },
  { 
    id: 'tournament', 
    code: 'T3', 
    titleKey: 'dashboard.modules.events', 
    descriptionKey: 'dashboard.descriptions.events' 
  },
  { 
    id: 'genesis', 
    code: 'G4', 
    titleKey: 'dashboard.modules.genesis_protocol', 
    descriptionKey: 'dashboard.descriptions.genesis_protocol' 
  }
]

const handleDashboardModuleClick = (moduleId: string) => {
  if (moduleId === 'activity' || moduleId === 'forum' || moduleId === 'tournament') {
    activeDashboardPanel.value = activeDashboardPanel.value === moduleId ? null : moduleId
    return
  }

  activeDashboardPanel.value = null
  emit('navigate', moduleId)
}

const getDashboardPanelFromTransitionElement = (el: Element) => (
  (el as HTMLElement).dataset.dashboardPanel || ''
)

const handleDashboardCenterBeforeLeave = (el: Element) => {
  const panel = getDashboardPanelFromTransitionElement(el)
  if (panel === 'forum' || panel === 'tournament') {
    isDashboardForumLeaving.value = true
  }
}

const handleDashboardCenterAfterLeave = (el: Element) => {
  const panel = getDashboardPanelFromTransitionElement(el)
  if (panel === 'forum' || panel === 'tournament') {
    isDashboardForumLeaving.value = false
  }
}

</script>

<style scoped>
.dashboard-page-button {
  transition: opacity 260ms ease, transform 260ms ease, box-shadow 260ms ease;
}

.dashboard-page-button:hover {
  transform: translateY(-1px);
  box-shadow: inset 0 -1px 0 var(--theme-text);
}

.dashboard-page-button:active {
  transform: translateY(0);
}

.dashboard-page-button.is-active {
  box-shadow: 0 0 18px rgb(var(--theme-accent-rgb) / 0.18);
  color: var(--theme-text);
}

.dashboard-page-button.is-active :deep(> div) {
  transform: translateX(0) !important;
}

.dashboard-page-button.is-active :deep(> span) {
  color: rgb(0 0 0) !important;
}

.dashboard-page-button.is-active-dark :deep(> span) {
  color: rgb(0 0 0) !important;
}

.dashboard-center-stage {
  padding-bottom: 84px;
  padding-top: 84px;
}

.dashboard-center-stage.is-activity {
  padding-bottom: 96px;
  padding-top: 28px;
}

.dashboard-activity-stage {
  align-items: center;
  display: flex;
  justify-content: center;
  max-width: min(1500px, calc(100vw - 48px));
}

.dashboard-center-fade-enter-active,
.dashboard-center-fade-leave-active {
  transition: opacity 260ms ease, transform 260ms ease;
}

.dashboard-center-fade-enter-from,
.dashboard-center-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.dashboard-offline-panel-loader {
  align-items: center;
  display: flex;
  inset: 0;
  justify-content: center;
  position: absolute;
}

.dashboard-offline-loader-content {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: center;
}

.dashboard-offline-spinner {
  animation: dashboard-offline-spin 900ms linear infinite;
  border: 2px solid var(--theme-text);
  border-radius: 999px;
  border-top-color: transparent;
  box-sizing: border-box;
  height: 2.75rem;
  opacity: 0.8;
  width: 2.75rem;
}

.dashboard-offline-label {
  color: var(--theme-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.28em;
  line-height: 1;
  opacity: 0.55;
  text-transform: uppercase;
}

@keyframes dashboard-offline-spin {
  to { transform: rotate(360deg); }
}

.dashboard-icon-toggle {
  align-items: center;
  color: var(--theme-text);
  display: inline-flex;
  height: 20px;
  justify-content: center;
  width: 20px;
}

.dashboard-icon-toggle img {
  display: block;
  height: 20px;
  width: 20px;
}

.menu-drop-enter-active,
.menu-drop-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.menu-drop-enter-from,
.menu-drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
