<template>
  <div ref="workspaceRoot" class="ethereal-void h-full min-h-full relative overflow-hidden transition-all duration-1000"
       :class="{ 'is-dark': isDark }">

    <Transition name="fade">
       <ExInitialization v-if="!hasInitialized" @initiate="handleInitializationComplete" />
    </Transition>

    <EtherealBackground :is-dark="isDark" :is-assembled="isAssembled" :show-bloom="showBloom" />
    <TesseractCanvas v-if="isTesseractEnabled" :is-dark="isDark" />
    <DesignVignette :is-dark="isDark" />
     <div 
        class="absolute inset-0 opacity-[0.2] transition-opacity duration-1000 theme-grid"
      ></div>
   
    <div
      class="relative z-10 flex inset-0 h-full"
      :class="activeTab === 'forum' ? 'items-start justify-center py-0' : 'items-center justify-center py-20'"
    >
       <Transition name="page-reify" mode="out-in">
         <!-- Dashboard Hub (No Tab) -->
         <div v-if="isAssembled && !activeTab" key="hub" class="w-full h-full">
            <ExDashboard @navigate="handleDashboardNavigate" @signed-out="handleSignedOut" />
         </div>

         <!-- Genesis Module -->
          <div v-else-if="isAssembled && activeTab === 'genesis'" key="genesis" class="w-full h-screen">
             <Transition name="page-reify" mode="out-in">
                <!-- Menu -->
                <div v-if="!currentGenesisMode" key="menu" class="w-full h-full pt-10">
                   <ExGenesisMenu @select="handleGenesisSelect" @back="goToHub" />
                </div>

                <!-- Matrix -->
                <div v-else-if="currentGenesisMode === 'matrix'" key="matrix" class="w-full h-screen">
                   <ExGenesisMatrix :active-tab="activeTab" :is-dark="isDark" @exit="clearMode" />
                </div>

                <!-- Diary -->
                <div v-else-if="currentGenesisMode === 'diary'" key="diary" class="w-full h-full">
                   <ExEquityCurve3D @exit="clearMode" />
                </div>

                <!-- Log -->
                <div v-else-if="currentGenesisMode === 'log'" key="log" class="w-full h-full">
                   <ExGenesisLog @exit="clearMode" @nodeMapState="isNodeMapActive = $event" @hudState="isHudActive = $event" />
                </div>

                <!-- Default Placeholder -->
                <div v-else key="fallback" class="w-full h-full flex flex-col items-center justify-center space-y-8">
                   <ExHeading level="h2" variant="cinematic" class="!text-3xl uppercase tracking-[0.2em]">Module_{{ currentGenesisMode }}_Reification</ExHeading>
                   <ExText class="opacity-40 italic">Structural matrix not yet stabilized in laboratory environment.</ExText>
                   <button @click="clearMode" class="mt-8 px-8 py-3 border border-theme-text/20 hover:border-theme-text transition-colors text-[10px] font-mono tracking-[0.4em] uppercase">
                     [ ESC_TO_MODULE_ORIGIN ]
                   </button>
                </div>
             </Transition>
          </div>

         <!-- Forum Module -->
         <div v-else-if="isAssembled && activeTab === 'forum'" key="forum" class="w-full h-full overflow-y-auto">
            <ExForum />
         </div>

         <!-- Activity Module -->
         <div v-else-if="isAssembled && activeTab === 'activity'" key="activity" class="w-full h-full flex flex-col items-center justify-center">
            <ExActivityMonitor @exit="goToHub" />
         </div>
       </Transition>
    </div>

     <!-- Global Bottom Right Label -->
     <button 
       v-if="activeTab && !isNodeMapActive && isHudActive" 
       @click="goBack"
       class="fixed bottom-8 right-8 text-[10px] font-mono tracking-widest uppercase opacity-40 hover:opacity-100 transition-opacity cursor-pointer z-[5000] outline-none"
     >
       Click Left Arrow to Go back
     </button>

    <ExPaywallOverlay :isOpen="showPaywall" @close="showPaywall = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ExDashboard from '~/widgets/dashboard/ui/ExDashboard.vue'
import EtherealBackground from '~/widgets/style/ui/EtherealBackground.vue'
import TesseractCanvas from '~/widgets/style/ui/TesseractCanvas.vue'
import DesignVignette from '~/widgets/style/ui/DesignVignette.vue'
import ExHeading from '~/shared/ui/ExHeading.vue'
import ExText from '~/shared/ui/ExText.vue'
import ExGenesisMenu from '~/widgets/genesis/ui/ExGenesisMenu.vue'
import ExInitialization from '~/widgets/test-clean/ui/ExInitialization.vue'

import ExGenesisMatrix from '~/widgets/genesis/ui/ExGenesisMatrix.vue'
import ExEquityCurve3D from '~/widgets/genesis/ui/ExEquityCurve3D.vue'
import ExGenesisLog from '~/widgets/genesis/ui/ExGenesisLog.vue'
import ExForum from '~/widgets/exforum/ui/ExForum.vue'
import ExActivityMonitor from '~/widgets/dashboard/ui/ExActivityMonitor.vue'
import ExPaywallOverlay from '~/widgets/genesis/ui/ExPaywallOverlay.vue'

import { useThemeStore } from '~/features/store/useTheme'
import { useWorkspaceStore } from '~/widgets/test-clean/model/useWorkspace'
import { useAuthStore } from '~/entities/user/auth.store'
import { storeToRefs } from 'pinia'
import { useDomI18n } from '~/shared/i18n/useDomI18n'
const themeStore = useThemeStore()
const isDark = computed({
  get: () => themeStore.settings.isDark,
  set: () => themeStore.toggleDark()
})

const route = useRoute()
const router = useRouter()

const genesisBasePath = '/genesis'
const validTabs = ['activity', 'forum', 'genesis', 'matrix']
const modeMap = {
  diary: 'log',
  'genesis-diary': 'diary',
  matrix: 'matrix'
}

const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore()
const { hasInitialized, isAssembled, showBloom, isTesseractEnabled, isNodeMapActive } = storeToRefs(workspaceStore)
const activeTab = ref('')
const showPaywall = ref(false)
const workspaceRoot = ref(null)
const isHudActive = ref(true)
useDomI18n(workspaceRoot, 'genesis.dom', { includeBody: true })

const isGenesisPath = computed(() => route.path === genesisBasePath || route.path.startsWith(`${genesisBasePath}/`))

const getRouteMode = () => {
  const workspaceParams = route.params.workspace
  const workspaceArray = Array.isArray(workspaceParams) ? workspaceParams : [workspaceParams]
  const modeFromPath = workspaceArray.length > 1 ? workspaceArray[1] : ''
  if (modeFromPath) return modeFromPath

  const queryMode = route.query.mode
  return typeof queryMode === 'string' ? queryMode : ''
}

const currentGenesisMode = computed(() => getRouteMode())

const getRouteTab = () => {
  const queryTab = route.query.tab
  if (typeof queryTab === 'string' && validTabs.includes(queryTab)) return queryTab
  if (isGenesisPath.value || currentGenesisMode.value) return 'genesis'
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
  const targetPath = mode ? `${genesisBasePath}/${mode}` : genesisBasePath
  const query = { ...route.query, tab: 'genesis' }

  if (mode) {
    query.mode = mode
  } else {
    delete query.mode
  }

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
    path = genesisBasePath
  }

  router.push({
    path,
    query
  })
}

const handleGenesisSelect = (moduleId) => {
  const mode = modeMap[moduleId] || moduleId
  

  router.push({
    path: `${genesisBasePath}/${mode}`,
    query: {
      ...route.query,
      tab: 'genesis',
      mode
    }
  })
}

const clearMode = () => {
  const query = { ...route.query, tab: 'genesis' }
  delete query.mode

  router.push({
    path: genesisBasePath,
    query
  })
}

const goToHub = () => {
  activeTab.value = ''
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

const goBack = () => {
  if (currentGenesisMode.value) {
    clearMode()
  } else if (activeTab.value) {
    goToHub()
  }
}

const handleGlobalKeydown = (e) => {
  // Prevent back navigation if user is typing in an input field
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
    return
  }
  
  if (e.key === 'ArrowLeft') {
    goBack()
  }
}

const handleInitializationComplete = () => {
  hasInitialized.value = true
  
  setTimeout(() => {
    showBloom.value = false
    setTimeout(() => {
      isAssembled.value = true
    }, 400)
  }, 500)
}

const handleSignedOut = () => {
  hasInitialized.value = false
  isAssembled.value = false
  showBloom.value = true
  isNodeMapActive.value = false
  activeTab.value = ''

  router.replace({ path: '/' })
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
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
</style>
