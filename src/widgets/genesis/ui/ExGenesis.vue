<template>
  <div ref="genesisContainer" class="genesis-container h-full flex flex-col relative overflow-hidden text-current">
    
    <!-- Transition between Mode Selection and Active Modes -->
    <Transition name="matrix-shift" mode="out-in">
      
      <!-- MODE SELECTION SCREEN -->
      <div v-if="!currentMode" key="selection" class="flex flex-col items-center justify-center h-full space-y-16">
        <div class="flex flex-col items-center space-y-4">
          <div class="text-[10px] font-mono tracking-[0.8em] opacity-30 uppercase animate-pulse">0x00 // {{ tr('ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ', 'SYSTEM INITIALIZATION') }}</div>
          <h2 class="text-4xl font-serif italic tracking-tight opacity-80 pr-2">Genesis Protocol</h2>
        </div>

        <div class="flex flex-col md:flex-row items-center space-y-8 md:space-y-0 md:space-x-12">
          <!-- Selection: Simple Diary -->
          <button @click="navigateToMode('diary')" 
                  class="selection-card group relative overflow-hidden border border-current/20 p-12 transition-all duration-700 hover:border-current/60">
            <div class="flex flex-col items-center space-y-6 relative z-10 w-48">
              <div class="w-2 h-2 border border-current rotate-45 mb-4 group-hover:bg-current transition-colors"></div>
              <span class="text-[11px] font-mono tracking-[0.4em] uppercase opacity-40 group-hover:opacity-100">0x01 // {{ tr('ВРЕМЕННЫЙ ЖУРНАЛ', 'VIRTUAL LOG') }}</span>
              <p class="text-[9px] font-serif italic opacity-20 text-center leading-relaxed group-hover:opacity-60 transition-opacity">
                "Simple recording of tactical thoughts and daily reflections."
              </p>
            </div>
            <div class="absolute inset-0 bg-current/[0.02] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
          </button>

          <div class="hidden md:block w-px h-24 bg-current/10"></div>

          <!-- Selection: Genesis Diary -->
          <button @click="navigateToMode('genesis-diary')" 
                  class="selection-card group relative overflow-hidden border border-current/20 p-12 transition-all duration-700 hover:border-current/60">
            <div class="flex flex-col items-center space-y-6 relative z-10 w-48">
              <div class="flex space-x-1 mb-4">
                 <div class="w-1.5 h-1.5 border border-current rotate-45"></div>
                 <div class="w-1.5 h-1.5 border border-current rotate-45"></div>
              </div>
              <span class="text-[11px] font-mono tracking-[0.4em] uppercase opacity-40 group-hover:opacity-100">0x02 // {{ tr('ДНЕВНИК ГЕНЕЗИСА', 'GENESIS DIARY') }}</span>
              <p class="text-[9px] font-serif italic opacity-20 text-center leading-relaxed group-hover:opacity-60 transition-opacity">
                "Chronological narrative of strategy evolution and core journal."
              </p>
            </div>
            <div class="absolute inset-0 bg-current/[0.02] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
          </button>

          <div class="hidden md:block w-px h-24 bg-current/10"></div>

          <!-- Selection: Strategy Matrix -->
          <button @click="navigateToMode('matrix')" 
                  class="selection-card group relative overflow-hidden border border-current/20 p-12 transition-all duration-700 hover:border-current/60">
            <div class="flex flex-col items-center space-y-6 relative z-10 w-48">
              <div class="flex space-x-2 mb-4 group-hover:scale-110 transition-transform">
                <div class="w-2 h-2 border border-current rotate-45"></div>
                <div class="w-2 h-2 border border-current rotate-45"></div>
                <div class="w-2 h-2 border border-current rotate-45"></div>
              </div>
              <span class="text-[11px] font-mono tracking-[0.4em] uppercase opacity-40 group-hover:opacity-100">0x03 // {{ tr('МАТРИЦА ГЕНЕЗИСА', 'GENESIS MATRIX') }}</span>
              <p class="text-[9px] font-serif italic opacity-20 text-center leading-relaxed group-hover:opacity-60 transition-opacity">
                "Advanced reification of skill-based trading protocols."
              </p>
            </div>
            <div class="absolute inset-0 bg-current/[0.02] transform translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
          </button>
        </div>

        <div class="flex flex-col items-center space-y-2 opacity-10">
          <div class="w-px h-16 bg-current"></div>
          <span class="text-[8px] font-mono tracking-widest uppercase italic">{{ tr('Ожидание ввода пользователя...', 'Wait for user input...') }}</span>
        </div>
      </div>

      <!-- ACTIVE MODES -->
      <div v-else key="active" class="h-full flex flex-col relative">
        <header v-if="currentMode" class="flex items-center justify-between border-b border-current/10 py-4 px-8">
          <div class="flex items-center space-x-6">
            <span class="text-[10px] font-mono tracking-widest uppercase opacity-60">
              {{ 
                currentMode === 'diary' ? tr('ВРЕМЕННЫЙ ЖУРНАЛ', 'VIRTUAL LOG') :
                currentMode === 'genesis-diary' ? tr('ДНЕВНИК ГЕНЕЗИСА', 'GENESIS DIARY') :
                tr('МАТРИЦА ГЕНЕЗИСА', 'GENESIS MATRIX')
              }}
            </span>
          </div>
          

        </header>

        <!-- Stealth Left-Side Archive Trigger (To Cube) -->
        <div v-if="currentMode === 'genesis-diary' && diaryViewMode === 'stats'" 
             class="fixed left-0 top-1/2 -translate-y-1/2 z-[110] group w-24 h-64 flex items-center justify-center">
           <div @click="setDiaryViewMode('cube')"
                class="cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-500 hover:scale-110 bg-black p-2 shadow-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                 <path d="M15 18L9 12L15 6" stroke="white" stroke-width="2" stroke-linecap="square"/>
              </svg>
           </div>
        </div>

        <!-- Stealth Right-Side Stats Trigger (To Stats) -->
        <div v-if="currentMode === 'genesis-diary' && diaryViewMode === 'cube'" 
             class="fixed right-0 top-1/2 -translate-y-1/2 z-[110] group w-24 h-64 flex items-center justify-center">
           <div @click="setDiaryViewMode('stats')"
                class="cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-500 hover:scale-110 bg-black p-2 shadow-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                 <path d="M9 18L15 12L9 6" stroke="white" stroke-width="2" stroke-linecap="square"/>
              </svg>
           </div>
        </div>

        <!-- Stealth Right-Side Matrix Trigger (To Matrix) -->
        <div v-if="currentMode === 'genesis-diary' && diaryViewMode === 'stats'" 
             class="fixed right-0 top-1/2 -translate-y-1/2 z-[110] group w-24 h-64 flex items-center justify-center">
           <div @click="navigateToMode('matrix')"
                class="cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-500 hover:scale-110 bg-black p-2 shadow-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                 <path d="M9 18L15 12L9 6" stroke="white" stroke-width="2" stroke-linecap="square"/>
              </svg>
           </div>
        </div>

        <!-- Stealth Left-Side Diary Trigger (To Diary) -->
        <div v-if="currentMode === 'matrix'" 
             class="fixed left-0 top-1/2 -translate-y-1/2 z-[110] group w-24 h-64 flex items-center justify-center">
           <div @click="navigateToMode('genesis-diary'); setDiaryViewMode('stats')"
                class="cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-500 hover:scale-110 bg-black p-2 shadow-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                 <path d="M15 18L9 12L15 6" stroke="white" stroke-width="2" stroke-linecap="square"/>
              </svg>
           </div>
        </div>

        <div class="flex-grow overflow-hidden">
          <!-- DIARY MODES -->
          <Transition name="page-reify" mode="out-in">
             <ExGenesisVirtualLog v-if="currentMode === 'diary'" />
          </Transition>
          
           <Transition name="page-reify" mode="out-in">
              <ExGenesisDiary v-if="currentMode === 'genesis-diary'" :viewMode="diaryViewMode" />
           </Transition>
          
           <Transition name="page-reify" mode="out-in">
              <ExGenesisMatrix v-if="currentMode === 'matrix'" 
                               :activeTab="activeTab" 
                               :isDark="themeStore.settings.isDark"
                               @exit="$emit('exit')" 
                               @back="backToOrigin" />
           </Transition>
        </div>

        <!-- Bottom Left Label -->
        <div v-if="currentMode" class="fixed bottom-8 left-8 text-[10px] font-mono tracking-widest uppercase opacity-40 pointer-events-none z-[100]">
          {{ tr('Нажмите левую стрелку, чтобы вернуться', 'Click the left arrow to go back') }}
        </div>
      </div>

    </Transition>

    <ExPaywallOverlay :isOpen="showPaywall" @close="showPaywall = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ExGenesisDiary from './diary/ExGenesisDiary.vue'
import ExGenesisMatrix from './matrix/ExGenesisMatrix.vue'
import ExGenesisVirtualLog from './diary/ExGenesisVirtualLog.vue'
import ExPaywallOverlay from './common/ExPaywallOverlay.vue'
import { useThemeStore } from '@/features/store/useTheme'
import { useDomI18n } from '~/shared/i18n/useDomI18n'
import { useI18n } from '~/shared/i18n/useI18n'
import { useAuthStore } from '~/entities/user/auth.store'
import { useGenesisTrades, useGenesisMatrixData } from '~/entities/genesis'

const genesisTrades = useGenesisTrades()
const genesisMatrix = useGenesisMatrixData()


const themeStore = useThemeStore()
const authStore = useAuthStore()
const { locale } = useI18n()
const tr = (ru: string, en: string) => locale.value === 'ru' ? ru : en
const genesisContainer = ref<HTMLElement | null>(null)
useDomI18n(genesisContainer, 'genesis.dom')

const route = useRoute()
const router = useRouter()

const props = defineProps<{
  activeTab: string
}>()

const emit = defineEmits(['exit'])

const currentMode = ref<'diary' | 'matrix' | 'genesis-diary' | null>(null)
const diaryViewMode = ref<'stats' | 'cube'>('stats')
const showPaywall = ref(false)

// --- QUERY SYNC --- //
const modeToSection: Record<'diary' | 'matrix' | 'genesis-diary', string> = {
  diary: 'virtual-log',
  matrix: 'matrix',
  'genesis-diary': 'diary'
}

const sectionToMode: Record<string, 'diary' | 'matrix' | 'genesis-diary'> = {
  'virtual-log': 'diary',
  log: 'diary',
  matrix: 'matrix',
  diary: 'genesis-diary',
  'genesis-diary': 'genesis-diary'
}

const getModeFromRoute = () => {
  const section = route.params.section
  const sectionKey = Array.isArray(section) ? section[0] : section
  if (sectionKey && sectionToMode[sectionKey]) return sectionToMode[sectionKey]

  const queryMode = route.query.mode
  if (typeof queryMode === 'string' && (queryMode === 'diary' || queryMode === 'matrix' || queryMode === 'genesis-diary')) {
    return queryMode
  }

  return null
}

const syncModeFromRoute = () => {
  const mode = getModeFromRoute()
  

  currentMode.value = mode
  diaryViewMode.value = route.query.view === 'cube' ? 'cube' : 'stats'
}

const navigateToMode = (mode: 'diary' | 'matrix' | 'genesis-diary') => {


  currentMode.value = mode
  const query = {
    ...route.query,
    tab: 'genesis',
    mode,
    ...(mode === 'genesis-diary' ? { view: diaryViewMode.value } : {})
  }

  if (mode !== 'genesis-diary') delete (query as Record<string, any>).view

  router.push({
    path: `/genesis/${modeToSection[mode]}`,
    query
  })
}

const setDiaryViewMode = (view: 'stats' | 'cube') => {
  diaryViewMode.value = view
  if (currentMode.value !== 'genesis-diary') return

  router.replace({
    path: route.path,
    query: {
      ...route.query,
      tab: 'genesis',
      mode: 'genesis-diary',
      view
    }
  })
}

const backToOrigin = () => {
  currentMode.value = null
  diaryViewMode.value = 'stats'
  // Also clear route query params
  const { mode, view, ...restQuery } = route.query
  router.push({ path: '/genesis', query: { ...restQuery, tab: 'genesis' } })
}

onMounted(() => {
  genesisTrades.init()
  genesisMatrix.loadMatrix()
  syncModeFromRoute()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowLeft' && currentMode.value) {
    backToOrigin()
  }
}
watch(() => [route.params.section, route.query.mode, route.query.view], syncModeFromRoute)
</script>

<style scoped>
.genesis-container {
  background: transparent;
}

.matrix-shift-enter-active, .matrix-shift-leave-active {
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.matrix-shift-enter-from { opacity: 0; transform: scale(1.02); filter: blur(20px); }
.matrix-shift-leave-to { opacity: 0; transform: scale(0.98); filter: blur(20px); }

.selection-card:hover {
  box-shadow: 0 0 50px -20px rgba(205, 205, 205, 0.1);
}
.page-reify-enter-active,
.page-reify-leave-active {
  transition: all 0.8s cubic-bezier(0.19, 1, 0.22, 1);
}

.page-reify-enter-from {
  opacity: 0;
  transform: scale(0.98) translateY(10px);
}

.page-reify-leave-to {
  opacity: 0;
  transform: scale(1.02) translateY(-10px);
}
</style>
