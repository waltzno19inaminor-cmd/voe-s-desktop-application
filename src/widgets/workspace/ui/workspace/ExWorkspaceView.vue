<template>
  <div ref="workspaceRoot" class="ethereal-void h-full min-h-0 relative overflow-hidden transition-all duration-1000"
       :class="{ 'is-dark': isDark }">

    <Transition name="fade">
       <ExInitialization v-if="showInitialization" @initiate="handleInitializationComplete" />
    </Transition>

    <Transition name="page-reify" mode="out-in">
      <ExAccessGate
        v-if="showAccessGate"
        key="access-gate"
        :state="visibleAccessState"
        :error="accessError"
        :is-submitting="isActivatingAccess"
        :lock-remaining-seconds="accessLockRemainingSeconds"
        :locale="locale"
        @activate="activateAccess"
        @retry="retryAccessCheck"
      />
    </Transition>

    <TesseractCanvas v-if="canEnterWorkspace && isTesseractEnabled" :is-dark="isDark" />
    <DesignVignette v-if="canEnterWorkspace" :is-dark="isDark" />
     <div 
        v-if="canEnterWorkspace"
        class="absolute inset-0 opacity-[0.2] transition-opacity duration-1000 theme-grid"
      ></div>
   
    <div
      v-if="canEnterWorkspace"
      class="relative z-10 flex inset-0 h-full min-h-0"
      :class="!activeTab ? 'items-start justify-center pt-0 pb-0' : (activeTab === 'forum' || activeTab === 'genesis' ? 'items-start justify-center py-0' : 'items-center justify-center py-20')"
    >
       <Transition name="page-reify" mode="out-in">
         <!-- Dashboard Hub (No Tab) -->
         <div v-if="isAssembled && !activeTab" key="hub" class="w-full h-full">
            <ExDashboard
              :is-music-muted="isDashboardMusicMuted"
              @navigate="handleDashboardNavigate"
              @signed-out="handleSignedOut"
              @toggle-music="toggleDashboardMusic"
            />
         </div>

         <!-- Genesis Module -->
          <div v-else-if="isAssembled && activeTab === 'genesis'" key="genesis" class="w-full h-full min-h-0 relative overflow-hidden">
             <div
               class="w-full min-h-0 transition-[height] duration-500 ease-[var(--nier-ease)]"
               :style="{ height: isGenesisBottomBarHidden ? '100%' : `calc(100% - ${genesisBottomBarHeight}px)` }"
             >
             <Transition name="page-reify" mode="out-in">
                <!-- Equity Curve -->
                <div v-if="currentGenesisMode === 'diary'" key="diary" class="w-full h-full">
                   <ExEquityCurve3D @exit="goToHub" />
                </div>

                <!-- Matrix -->
                <div v-else-if="currentGenesisMode === 'matrix'" key="matrix" class="w-full h-full">
                   <ExGenesisMatrix :active-tab="activeTab" :is-dark="isDark" @exit="goToHub" />
                </div>

                <!-- Log -->
                <div v-else-if="currentGenesisMode === 'log'" key="log" class="w-full h-full">
                   <ExGenesisLog @exit="goToHub" @nodeMapState="isNodeMapActive = $event" @hudState="isHudActive = $event" />
                </div>
             </Transition>
             </div>

             <div
               v-if="isGenesisBottomBarHidden"
               class="fixed bottom-0 left-1/2 z-[6999] -translate-x-1/2"
             >
               <button
                 type="button"
                 class="genesis-bottom-show-line"
                 :aria-label="genesisBottomTooltip('show')"
                 @click="showGenesisBottomBar"
               ></button>
             </div>

             <nav
               class="genesis-bottom-bar absolute bottom-0 left-0 z-[7000] flex w-full items-center justify-center border-t border-theme-border bg-theme-bg/90 px-4 backdrop-blur-md transition-transform duration-500 ease-[var(--nier-ease)]"
               :class="isGenesisBottomBarHidden ? 'translate-y-full' : 'translate-y-0'"
               :style="{ height: `${genesisBottomBarHeight}px` }"
               aria-label="Genesis pages"
             >
               <div class="absolute left-4 flex h-full items-center">
                 <div class="genesis-bottom-tool">
                   <button
                     type="button"
                     class="genesis-bottom-icon-button text-theme-text opacity-35 hover:opacity-100"
                     :aria-label="genesisBottomTooltip('dashboard')"
                     @click="goToHub"
                   >
                     <svg
                       viewBox="0 0 24 24"
                       fill="none"
                       stroke="currentColor"
                       stroke-width="1.7"
                       stroke-linecap="square"
                       stroke-linejoin="miter"
                       class="h-5 w-5"
                       aria-hidden="true"
                     >
                       <path d="M9 4.5H5.5v15H9" />
                       <path d="M13 8l4 4-4 4" />
                       <path d="M17 12H8" />
                     </svg>
                   </button>
                   <span class="genesis-bottom-tooltip tooltip-left">{{ genesisBottomTooltip('dashboard') }}</span>
                 </div>
               </div>

               <div class="flex h-full items-center justify-center gap-2">
                 <div
                   v-for="item in genesisModeItems"
                   :key="item.id"
                   class="genesis-bottom-tool"
                 >
                 <button
                   type="button"
                   class="genesis-bottom-icon-button group"
                   :class="currentGenesisMode === item.id
                     ? 'text-theme-text opacity-100'
                     : 'text-theme-text opacity-35 hover:opacity-100'"
                   :aria-label="genesisBottomTooltip(item.id)"
                   :aria-current="currentGenesisMode === item.id ? 'page' : undefined"
                   @click="switchGenesisMode(item.id)"
                 >
                   <svg
                     v-if="item.id === 'diary'"
                     viewBox="0 0 24 24"
                     fill="none"
                     stroke="currentColor"
                     stroke-width="1.7"
                     stroke-linecap="square"
                     stroke-linejoin="miter"
                     class="h-5 w-5"
                     aria-hidden="true"
                   >
                     <path d="M3.5 17.5H21" />
                     <path d="M4 15.5 8 11l3 2.5 4.5-7 4.5 4" />
                     <path d="M8 11v6.5M15.5 6.5v11" opacity=".45" />
                   </svg>

                   <svg
                     v-else-if="item.id === 'matrix'"
                     viewBox="0 0 24 24"
                     fill="none"
                     stroke="currentColor"
                     stroke-width="1.7"
                     stroke-linecap="square"
                     class="h-5 w-5"
                     aria-hidden="true"
                   >
                     <path d="M4 4h16v16H4z" />
                     <path d="M4 9.5h16M4 14.5h16M9.5 4v16M14.5 4v16" opacity=".7" />
                     <path d="M9.5 9.5h5v5h-5z" />
                   </svg>

                   <svg
                     v-else
                     viewBox="0 0 24 24"
                     fill="none"
                     stroke="currentColor"
                     stroke-width="1.7"
                     stroke-linecap="square"
                     stroke-linejoin="miter"
                     class="h-5 w-5"
                     aria-hidden="true"
                   >
                     <path d="M7 3.5h8l3 3V20H7z" />
                     <path d="M15 3.5V7h3" />
                     <path d="M10 11h5M10 14h4M10 17h6" opacity=".7" />
                   </svg>
                 </button>
                 <span class="genesis-bottom-tooltip">{{ genesisBottomTooltip(item.id) }}</span>
                 </div>
               </div>

               <div class="absolute right-4 flex h-full items-center gap-2">
                 <div class="genesis-bottom-tool">
                   <div class="genesis-bottom-language-switch" role="group" :aria-label="genesisBottomTooltip('language')">
                     <button
                       type="button"
                       class="genesis-bottom-language-button text-theme-text"
                       :class="locale === 'ru' ? 'opacity-100' : 'opacity-35 hover:opacity-100'"
                       :aria-pressed="locale === 'ru'"
                       @click="setLocale('ru')"
                     >
                       RU
                     </button>
                     <button
                       type="button"
                       class="genesis-bottom-language-button text-theme-text"
                       :class="locale === 'en' ? 'opacity-100' : 'opacity-35 hover:opacity-100'"
                       :aria-pressed="locale === 'en'"
                       @click="setLocale('en')"
                     >
                       EN
                     </button>
                   </div>
                   <span class="genesis-bottom-tooltip tooltip-right">{{ genesisBottomTooltip('language') }}</span>
                 </div>

                 <div class="genesis-bottom-tool">
                   <button
                     type="button"
                     class="genesis-bottom-icon-button text-theme-text opacity-35 hover:opacity-100"
                     :aria-label="genesisBottomTooltip('hide')"
                     @click="hideGenesisBottomBar"
                   >
                     <svg
                       viewBox="0 0 24 24"
                       fill="none"
                       stroke="currentColor"
                       stroke-width="1.7"
                       stroke-linecap="square"
                       stroke-linejoin="miter"
                       class="h-5 w-5"
                       aria-hidden="true"
                     >
                       <path d="M5 8.5 12 15.5 19 8.5" />
                       <path d="M5 18.5H19" opacity=".55" />
                     </svg>
                   </button>
                   <span class="genesis-bottom-tooltip tooltip-right">{{ genesisBottomTooltip('hide') }}</span>
                 </div>
               </div>
             </nav>
          </div>

         <!-- Activity Module -->
         <div v-else-if="isAssembled && activeTab === 'activity'" key="activity" class="w-full h-full flex flex-col items-center justify-center">
            <ExActivityMonitor @exit="goToHub" />
         </div>
       </Transition>
    </div>

    <ExPaywallOverlay v-if="canEnterWorkspace" :isOpen="showPaywall" @close="showPaywall = false" />
    <ExActivationSuccessOverlay v-if="canEnterWorkspace" :isOpen="showSuccessOverlay" @close="showSuccessOverlay = false" />
  </div>
</template>

<script setup>
import { ref, watch, computed, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ExDashboard from '~/widgets/dashboard/ui/main/ExDashboard.vue'
import TesseractCanvas from '~/widgets/style/ui/TesseractCanvas.vue'
import DesignVignette from '~/widgets/style/ui/DesignVignette.vue'
import ExInitialization from '~/widgets/workspace/ui/init/ExInitialization.vue'
import ExAccessGate from '~/widgets/workspace/ui/access/ExAccessGate.vue'

import ExGenesisMatrix from '~/widgets/genesis/ui/matrix/ExGenesisMatrix.vue'
import ExEquityCurve3D from '~/widgets/genesis/ui/analytics/ExEquityCurve3D.vue'
import ExGenesisLog from '~/widgets/genesis/ui/diary/ExGenesisLog.vue'
import ExActivityMonitor from '~/widgets/dashboard/ui/activity/ExActivityMonitor.vue'
import ExPaywallOverlay from '~/widgets/genesis/ui/common/ExPaywallOverlay.vue'
import ExActivationSuccessOverlay from '~/widgets/workspace/ui/access/ExActivationSuccessOverlay.vue'

import { useThemeStore } from '~/features/store/useTheme'
import { useWorkspaceStore } from '~/widgets/workspace/model/useWorkspace'
import { useAuthStore } from '~/entities/user/auth.store'
import { useNotificationStore } from '~/features/store/useNotifications'
import { storeToRefs } from 'pinia'
import { useDomI18n } from '~/shared/i18n/useDomI18n'
import { useI18n } from '~/shared/i18n/useI18n'
import { useAccessActivation } from '~/features/access/model/useAccessActivation'
const themeStore = useThemeStore()
const { locale, setLocale } = useI18n()
const isDark = computed({
  get: () => themeStore.settings.isDark,
  set: () => themeStore.toggleDark()
})

const route = useRoute()
const router = useRouter()

const genesisBasePath = '/genesis'
const defaultGenesisMode = 'diary'
const genesisBottomBarHeight = 56
const validTabs = ['activity', 'genesis', 'matrix']
const genesisModeItems = [
  { id: 'diary', title: 'Ex Equity Curve 3D' },
  { id: 'matrix', title: 'Ex Genesis Matrix' },
  { id: 'log', title: 'Ex Genesis Log' }
]

const genesisBottomTooltip = (key) => {
  const ru = {
    dashboard: 'Тактическая панель',
    diary: 'Кривая капитала',
    matrix: 'Матрица генезиса',
    log: 'Журнал генезиса',
    language: 'Язык интерфейса',
    hide: 'Скрыть панель',
    show: 'Показать панель'
  }
  const en = {
    dashboard: 'Tactical Dashboard',
    diary: 'Ex Equity Curve 3D',
    matrix: 'Ex Genesis Matrix',
    log: 'Ex Genesis Log',
    language: 'Interface Language',
    hide: 'Hide Bar',
    show: 'Show Bar'
  }
  return (locale.value === 'ru' ? ru : en)[key] || key
}
const genesisModeAliases = {
  diary: 'diary',
  'equity-curve': 'diary',
  'genesis-diary': 'diary',
  matrix: 'matrix',
  log: 'log'
}

const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const { hasInitialized, isAssembled, showBloom, isTesseractEnabled, isNodeMapActive } = storeToRefs(workspaceStore)
const activeTab = ref('')
const showPaywall = ref(false)
const workspaceRoot = ref(null)
const isHudActive = ref(true)
const isGenesisBottomBarHidden = ref(false)
const isDashboardMusicMuted = ref(false)
const isActivatingAccess = ref(false)
const showSuccessOverlay = ref(false)
const {
  accessState,
  accessError,
  accessLockRemainingSeconds,
  beginAccessListener,
  stopAccessListener,
  retryAccessCheck,
  activateAccessKey
} = useAccessActivation()
useDomI18n(workspaceRoot, 'genesis.dom', { includeBody: true })

const authenticatedUserId = computed(() => authStore.user?.uid || '')
const hasAccessGranted = computed(() => Boolean(authenticatedUserId.value) && accessState.value === 'granted')
const showInitialization = computed(() => !hasInitialized.value)
const showAccessGate = computed(() => (
  hasInitialized.value
  && Boolean(authenticatedUserId.value)
  && accessState.value !== 'granted'
))
const canEnterWorkspace = computed(() => hasInitialized.value && hasAccessGranted.value)
const visibleAccessState = computed(() => {
  if (!authStore.authReady || !authenticatedUserId.value) return 'checking'
  return accessState.value
})
const isGenesisPath = computed(() => route.path === genesisBasePath || route.path.startsWith(`${genesisBasePath}/`))
const isDashboardHubActive = computed(() => (
  canEnterWorkspace.value
  && hasInitialized.value
  && isAssembled.value
  && !activeTab.value
))
const shouldPlayDashboardScore = computed(() => isDashboardHubActive.value && !isDashboardMusicMuted.value)

let dashboardScore = null
const dashboardScoreVolume = 0.03
const dashboardScoreFadeInMs = 1800
const dashboardScoreFadeOutMs = 900
let dashboardScoreFadeFrame = 0

const ensureDashboardScore = () => {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null
  if (!dashboardScore && window.__exDashboardScore instanceof HTMLAudioElement) {
    dashboardScore = window.__exDashboardScore
  }
  if (!dashboardScore) {
    const audio = new Audio('/audio/score.mp3')
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = 0
    dashboardScore = audio
    window.__exDashboardScore = audio
  }
  dashboardScore.loop = true
  dashboardScore.volume = Math.min(dashboardScore.volume, dashboardScoreVolume)
  return dashboardScore
}

const cancelDashboardScoreFade = () => {
  if (!dashboardScoreFadeFrame || typeof window === 'undefined') return
  window.cancelAnimationFrame(dashboardScoreFadeFrame)
  dashboardScoreFadeFrame = 0
}

const fadeDashboardScore = (targetVolume, durationMs, onComplete) => {
  const audio = ensureDashboardScore()
  if (!audio || typeof window === 'undefined') return

  cancelDashboardScoreFade()
  const fromVolume = audio.volume
  const startedAt = window.performance.now()

  const step = (timestamp) => {
    const progress = durationMs <= 0 ? 1 : Math.min(1, (timestamp - startedAt) / durationMs)
    audio.volume = fromVolume + (targetVolume - fromVolume) * progress

    if (progress < 1) {
      dashboardScoreFadeFrame = window.requestAnimationFrame(step)
      return
    }

    dashboardScoreFadeFrame = 0
    onComplete?.()
  }

  dashboardScoreFadeFrame = window.requestAnimationFrame(step)
}

const playDashboardScore = async (fadeIn = true) => {
  if (isDashboardMusicMuted.value) return
  const audio = ensureDashboardScore()
  if (!audio) return

  cancelDashboardScoreFade()
  audio.loop = true
  audio.volume = Math.min(audio.volume, dashboardScoreVolume)
  if (audio.paused) {
    audio.volume = fadeIn ? 0 : audio.volume
    try {
      await audio.play()
    } catch {
      return
    }
  }

  if (fadeIn) {
    fadeDashboardScore(dashboardScoreVolume, dashboardScoreFadeInMs)
  } else {
    audio.volume = Math.min(audio.volume, dashboardScoreVolume)
  }
}

const primeDashboardScore = () => {
  if (isDashboardMusicMuted.value) return
  const audio = ensureDashboardScore()
  if (!audio) return
  audio.volume = 0
  audio.play().catch(() => {})
}

const stopDashboardScore = (fadeOut = true) => {
  const audio = dashboardScore
  if (!audio) return

  if (!fadeOut) {
    cancelDashboardScoreFade()
    audio.pause()
    audio.volume = 0
    return
  }

  fadeDashboardScore(0, dashboardScoreFadeOutMs, () => {
    audio.pause()
  })
}

const toggleDashboardMusic = () => {
  isDashboardMusicMuted.value = !isDashboardMusicMuted.value
  if (isDashboardMusicMuted.value) {
    stopDashboardScore(true)
    return
  }
  if (isDashboardHubActive.value) {
    playDashboardScore(true)
  }
}

const activateAccess = async (key) => {
  if (isActivatingAccess.value) return
  isActivatingAccess.value = true
  try {
    await activateAccessKey(key)
    showSuccessOverlay.value = true
  } finally {
    isActivatingAccess.value = false
  }
}

const getRouteMode = () => {
  const workspaceParams = route.params.workspace
  const workspaceArray = Array.isArray(workspaceParams) ? workspaceParams : [workspaceParams]
  const modeFromPath = workspaceArray.length > 1 ? workspaceArray[1] : ''
  if (modeFromPath) return modeFromPath

  const queryMode = route.query.mode
  return typeof queryMode === 'string' ? queryMode : ''
}

const normalizeGenesisMode = (mode) => genesisModeAliases[mode] || ''
const routeGenesisMode = computed(() => getRouteMode())
const currentGenesisMode = computed(() => {
  const normalizedMode = normalizeGenesisMode(routeGenesisMode.value)
  if (normalizedMode) return normalizedMode
  return isGenesisPath.value || route.query.tab === 'genesis' ? defaultGenesisMode : ''
})

const getRouteTab = () => {
  const queryTab = route.query.tab
  if (typeof queryTab === 'string' && validTabs.includes(queryTab)) return queryTab
  if (isGenesisPath.value || routeGenesisMode.value) return 'genesis'
  return ''
}

const setScrollLock = (tab) => {
  if (tab === 'genesis') {
    document.body.style.overflow = 'hidden'
    document.body.style.height = '100vh'
  } else {
    document.body.style.overflow = ''
    document.body.style.height = ''
  }
}

const canonicalizeGenesisRoute = () => {
  if (activeTab.value !== 'genesis') return

  const mode = currentGenesisMode.value
  const targetPath = `${genesisBasePath}/${mode || defaultGenesisMode}`
  const query = { ...route.query, tab: 'genesis' }

  query.mode = mode || defaultGenesisMode

  if (route.path !== targetPath || route.query.tab !== 'genesis' || route.query.mode !== query.mode) {
    router.replace({ path: targetPath, query })
  }
}

const canonicalizeActivityRoute = () => {
  if (activeTab.value !== 'activity') return

  const targetPath = '/'
  const query = { ...route.query, tab: 'activity' }
  delete query.mode

  if (route.path !== targetPath || route.query.tab !== 'activity') {
    router.replace({ path: targetPath, query })
  }
}

const syncTabFromRoute = () => {
  activeTab.value = getRouteTab()
  

  canonicalizeGenesisRoute()
  canonicalizeActivityRoute()
}

const handleDashboardNavigate = (tab) => {
  if (!tab) {
    goToHub()
    return
  }

  activeTab.value = tab
  const query = { ...route.query, tab }
  delete query.mode

  let path = '/'
  if (tab === 'genesis') {
    path = `${genesisBasePath}/${defaultGenesisMode}`
    query.mode = defaultGenesisMode
    isGenesisBottomBarHidden.value = false
  }

  router.push({
    path,
    query
  })
}

const switchGenesisMode = (modeId) => {
  const mode = normalizeGenesisMode(modeId) || defaultGenesisMode

  router.push({
    path: `${genesisBasePath}/${mode}`,
    query: {
      ...route.query,
      tab: 'genesis',
      mode
    }
  })
}

const hideGenesisBottomBar = () => {
  isGenesisBottomBarHidden.value = true
}

const showGenesisBottomBar = () => {
  isGenesisBottomBarHidden.value = false
}

const goToHub = () => {
  activeTab.value = ''
  isGenesisBottomBarHidden.value = false
  const query = { ...route.query }
  delete query.tab
  delete query.mode

  router.push({
    path: '/',
    query
  })
}

watch(() => [route.path, route.params.workspace, route.query.tab, route.query.mode], syncTabFromRoute, { immediate: true })

watch(activeTab, (newTab) => {
  setScrollLock(newTab)
}, { immediate: true })

watch(authenticatedUserId, (userId) => {
  beginAccessListener(userId)
  if (!userId) {
    stopDashboardScore(false)
    notificationStore.unsubscribeFromNotifications()
    hasInitialized.value = false
    isAssembled.value = false
    showBloom.value = true
    isNodeMapActive.value = false
    activeTab.value = ''
    isGenesisBottomBarHidden.value = false
  }
}, { immediate: true })

watch(canEnterWorkspace, (isGranted) => {
  if (!isGranted) {
    stopDashboardScore(false)
    notificationStore.unsubscribeFromNotifications()
    isAssembled.value = false
    showBloom.value = true
    isNodeMapActive.value = false
    activeTab.value = ''
    isGenesisBottomBarHidden.value = false
    return
  }

  syncTabFromRoute()
  if (authenticatedUserId.value) {
    notificationStore.subscribe(authenticatedUserId.value)
  }
}, { immediate: true })

watch(shouldPlayDashboardScore, (shouldPlay) => {
  if (shouldPlay) {
    playDashboardScore(true)
  } else {
    stopDashboardScore(true)
  }
}, { immediate: true })

const handleInitializationComplete = () => {
  if (!activeTab.value) primeDashboardScore()
  hasInitialized.value = true
  // Mount the destination before the initialization overlay finishes leaving,
  // so the transition never exposes the workspace background between screens.
  isAssembled.value = true
  setTimeout(() => {
    showBloom.value = false
  }, 500)
}

const handleSignedOut = () => {
  stopDashboardScore(false)
  hasInitialized.value = false
  isAssembled.value = false
  showBloom.value = true
  isNodeMapActive.value = false
  activeTab.value = ''

  router.replace({ path: '/' })
}

onUnmounted(() => {
  stopDashboardScore(false)
  stopAccessListener()
  notificationStore.unsubscribeFromNotifications()
  document.body.style.overflow = ''
  document.body.style.height = ''
})
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap');
.ethereal-void {
  font-family: 'Cormorant Garamond', serif;
}

/* Animation: Page Reify */
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--theme-border-strong); }

.genesis-bottom-bar {
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.12);
}

.genesis-bottom-icon-button {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  transition: opacity 240ms ease, color 240ms ease, transform 240ms ease;
}

.genesis-bottom-icon-button:hover {
  transform: translateY(-1px);
}

.genesis-bottom-language-switch {
  align-items: center;
  display: grid;
  grid-template-columns: repeat(2, 2rem);
  height: 2.5rem;
}

.genesis-bottom-language-button {
  display: grid;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 9px;
  font-weight: 900;
  height: 2.5rem;
  letter-spacing: 0.16em;
  line-height: 1;
  place-items: center;
  transition: opacity 240ms ease, transform 240ms ease;
  width: 2rem;
}

.genesis-bottom-language-button:hover {
  transform: translateY(-1px);
}

.genesis-bottom-tool {
  position: relative;
  display: grid;
  place-items: center;
}

.genesis-bottom-tooltip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  z-index: 7010;
  max-width: min(240px, calc(100vw - 32px));
  transform: translateX(-50%) translateY(4px);
  border: 1px solid var(--theme-border);
  background: var(--theme-bg);
  color: var(--theme-text);
  padding: 5px 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.18em;
  line-height: 1;
  opacity: 0;
  pointer-events: none;
  text-transform: uppercase;
  transition: opacity 140ms ease, transform 140ms ease;
  white-space: nowrap;
}

.genesis-bottom-tooltip.tooltip-left {
  left: 0;
  transform: translateX(0) translateY(4px);
}

.genesis-bottom-tooltip.tooltip-right {
  right: 0;
  left: auto;
  transform: translateX(0) translateY(4px);
}

.genesis-bottom-tool:hover .genesis-bottom-tooltip,
.genesis-bottom-tool:focus-within .genesis-bottom-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.genesis-bottom-tool:hover .genesis-bottom-tooltip.tooltip-left,
.genesis-bottom-tool:focus-within .genesis-bottom-tooltip.tooltip-left,
.genesis-bottom-tool:hover .genesis-bottom-tooltip.tooltip-right,
.genesis-bottom-tool:focus-within .genesis-bottom-tooltip.tooltip-right {
  transform: translateX(0) translateY(0);
}

.genesis-bottom-show-line {
  display: block;
  width: 96px;
  height: 14px;
  position: relative;
}

.genesis-bottom-show-line::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: #fff;
  opacity: 0.78;
  transition: opacity 220ms ease, transform 220ms ease;
}

.genesis-bottom-show-line:hover::after {
  opacity: 1;
  transform: translateY(-2px);
}
</style>
