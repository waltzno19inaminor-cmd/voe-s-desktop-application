<template>
  <div
    class="ex-initialization fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden ethereal-void nier-text-primary"
    :class="{ 'is-dark': isDark, 'is-startup': isStartupView, 'is-gradflow-ready': isGradflowReady }"
    style="font-family: 'Cormorant Garamond', serif;"
  >
    <EtherealBackground :is-dark="isDark" :is-assembled="true" :show-bloom="false" />
    <div
      class="pointer-events-none absolute inset-0 z-[1] bg-[#050505] transition-opacity duration-500"
      :class="isGradflowReady ? 'opacity-0' : 'opacity-100'"
      aria-hidden="true"
    ></div>
    <!-- Background Ambience -->
    <!-- <div class="absolute inset-0 opacity-20 pointer-events-none">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--theme-text)_0%,transparent_70%)] opacity-5"></div>
      <div class="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.5)_100%)]"></div>
    </div> -->
    <DesignVignette v-if="!isDark" :is-dark="isDark" />

    <!-- ── LANGUAGE SWITCH (top-left) ── -->
    <div
      class="fixed left-8 top-14 z-[100] flex items-center gap-4"
      role="group"
      :aria-label="locale === 'ru' ? 'Смена языка' : 'Language switcher'"
    >
      <button
        type="button"
        class="px-1 py-2 text-[8px] font-mono uppercase tracking-[0.35em] text-black transition-all duration-300"
        :class="locale === 'ru' ? 'font-bold opacity-100' : 'opacity-35 hover:opacity-100'"
        :aria-pressed="locale === 'ru'"
        @click="setLocale('ru')"
      >
        RU
      </button>
      <button
        type="button"
        class="px-1 py-2 text-[8px] font-mono uppercase tracking-[0.35em] text-black transition-all duration-300"
        :class="locale === 'en' ? 'font-bold opacity-100' : 'opacity-35 hover:opacity-100'"
        :aria-pressed="locale === 'en'"
        @click="setLocale('en')"
      >
        EN
      </button>
    </div>

    <!-- ── SIGN OUT (top-right, only when authenticated) ── -->
    <Transition name="fade-quick">
	      <button
	        v-if="isAuthenticated"
	        @click="doSignOut"
	        class="initialization-sign-out-button fixed top-14 right-8 z-[100] text-[8px] font-mono uppercase tracking-[0.4em] border border-black px-4 py-2 transition-all duration-300 text-black opacity-30 hover:opacity-100"
	      >{{ locale === 'ru' ? 'Выйти' : 'Sign Out' }}</button>
    </Transition>

    <!-- Center Assembly -->
    <div class="relative flex flex-col items-center space-y-10 z-10 w-full max-w-sm px-8">

      <!-- Core Icon -->
	      <div class="relative w-20 h-20 flex items-center justify-center mb-2 shrink-0">
	        <div class="initialization-logo-line absolute inset-0 border-2 animate-[spin_10s_linear_infinite]"></div>
	        <div class="initialization-logo-line absolute inset-3 border animate-[spin_6s_linear_infinite_reverse]"></div>
	        <div class="initialization-logo-core w-3 h-3 rotate-45 animate-pulse"></div>
	        <div class="initialization-logo-line absolute -top-3 -left-3 w-5 h-5 border-t-2 border-l-2"></div>
	        <div class="initialization-logo-line absolute -bottom-3 -right-3 w-5 h-5 border-b-2 border-r-2"></div>
	      </div>

      <!-- Identity -->
      <div class="flex flex-col items-center space-y-1 text-center">
        <h1 class="text-3xl tracking-[0.5em] uppercase font-light text-black animate-glitch" >J.L.Jörmungandr</h1>
        <p class="text-[8px] font-mono tracking-[0.6em] uppercase text-black">{{ locale === 'ru' ? 'УНИВЕРСАЛЬНАЯ АНАЛИТИЧЕСКАЯ ПЛАТФОРМА' : 'Universal Analytical Platform' }}</p>
      </div>

      <!-- ── PHASE SWITCHER ── -->
      <Transition name="step-fade" mode="out-in">
        <!-- ── UPDATE INSTALLED (Restart Required) ── -->
        <div v-if="isUpdateInstalled" key="update-installed" class="w-full max-w-xs flex flex-col items-center space-y-3 my-2">
          <button
            @click="forceRelaunchApp"
            class="w-full py-3.5 font-mono text-[10px] tracking-[0.3em] uppercase font-black transition-all hover:opacity-90 flex items-center justify-center space-x-2 bg-white !text-black shadow-lg animate-pulse"
          >
            <span>{{ locale === 'ru' ? 'ПЕРЕЗАПУСТИТЬ ПРИЛОЖЕНИЕ' : 'RESTART APPLICATION' }}</span>
          </button>
          <p class="text-[8px] font-mono lowercase italic text-black/60 text-center">
            {{ locale === 'ru' ? 'обновление успешно установлено. нажмите для перезапуска' : 'update successfully installed. click to restart' }}
          </p>
        </div>

        <!-- ── UPDATE CONFIRMATION CARD (when update is found) ── -->
        <div v-else-if="phase === 'update' && pendingUpdate" key="update-confirmation" class="w-full max-w-xs flex flex-col items-center space-y-3 my-2">
          <!-- Install Button (Full Width) -->
          <button
            @click="confirmAndInstallUpdate"
            :disabled="pendingUpdate.isSuitable === false"
            class="w-full py-3 font-mono text-[9px] tracking-[0.3em] uppercase font-black transition-all hover:opacity-90 flex items-center justify-center space-x-2 bg-white !text-black shadow-lg"
            :class="{ 'cursor-not-allowed opacity-40': pendingUpdate.isSuitable === false }"
          >
            <span v-if="pendingUpdate.isSuitable === false">{{ locale === 'ru' ? 'Сначала обновите приложение' : 'Update the application first' }}</span>
            <span v-else>{{ locale === 'ru' ? 'Установить обновление' : 'Install Update' }}</span>
          </button>

          <p v-if="pendingUpdate.reason" class="text-center text-[9px] font-mono text-red-700/80">
            {{ pendingUpdate.reason }}
          </p>

          <!-- Skip Text Link (Below Install Button) -->
          <button
            @click="skipUpdate"
            class="initialization-skip-button font-mono text-[9px] tracking-[0.3em] uppercase font-bold text-black opacity-50 hover:opacity-100 transition-opacity py-1"
          >
            <span>{{ locale === 'ru' ? 'Пропустить' : 'Skip' }}</span>
          </button>
        </div>

        <!-- ── UPDATE CHECK / INSTALLING PROGRESS ── -->
        <div v-else-if="phase === 'update'" key="update-check" class="w-full flex flex-col items-center space-y-6">
          <div class="w-full flex flex-col space-y-3">
            <div class="flex justify-between items-end">
              <span class="text-[9px] font-mono uppercase tracking-widest text-black/60">
                {{ updateTitle }}
              </span>
              <span class="text-[10px] font-mono font-black text-black">{{ Math.floor(updateProgress) }}%</span>
            </div>
            
            <div class="h-2 w-full relative overflow-hidden rounded-full border border-black/15 bg-black/10">
              <div
                class="absolute top-0 left-0 h-full bg-black transition-all duration-300 rounded-full"
                :style="{ width: `${updateProgress}%` }"
              ></div>
              <div class="absolute inset-y-0 left-0 w-12 bg-white/40 blur-sm animate-scan"></div>
            </div>

            <!-- Download Speed & Remaining MB Subtext -->
            <div v-if="downloadSpeedText || remainingSizeText" class="flex justify-between items-center text-[8px] font-mono uppercase tracking-widest text-black/60 pt-1">
              <span>{{ downloadSpeedText }}</span>
              <span>{{ remainingSizeText }}</span>
            </div>
          </div>

          <div class="h-8 overflow-hidden relative w-full">
            <Transition name="log-slide" mode="out-in">
              <p :key="updateLog" class="text-center lowercase italic text-[10px] font-mono text-black/70">
                {{ updateLog }}
              </p>
            </Transition>
          </div>
        </div>

        <!-- ── AUTH CHECK: keep forms hidden until Firebase resolves persisted session ── -->
        <div v-else-if="isAuthResolving" key="auth-check" class="w-full flex min-h-20 items-center justify-center">
          <div class="relative h-5 w-5">
            <div class="absolute inset-0 rounded-full border border-theme-text/20"></div>
            <div class="absolute inset-0 animate-spin rounded-full border border-transparent border-t-theme-text"></div>
          </div>
        </div>

        <!-- ── AUTHENTICATED: boot prompt ── -->
        <div v-else-if="isAuthenticated && phase === 'auth'" key="authenticated" class="w-full flex flex-col items-center space-y-5">
	          <div class="initialization-auth-card w-full border bg-black/[0.05] p-4 flex items-center space-x-4">
            <div class="w-2 h-2 bg-white rounded-full animate-pulse shrink-0"></div>
            <div class="flex flex-col min-w-0">
              <span class="text-[8px] font-mono uppercase tracking-[0.4em] text-white">Operator Authenticated</span>
              <span class="text-[11px] font-mono font-black uppercase tracking-widest truncate text-white" >{{ authStore.user?.email }}</span>
            </div>
          </div>
          <button
            @click="startBoot"
            class="w-full py-3 font-mono text-[9px] tracking-[0.5em] uppercase font-black transition-all duration-300 hover:opacity-90"
            :style="primaryButtonStyle"
          >{{ locale === 'ru' ? 'Продолжить' : 'Continue' }}</button>
        </div>

        <!-- ── NOT AUTHENTICATED: login / register ── -->
        <div v-else-if="authStore.authReady && !isAuthenticated && phase === 'auth'" key="auth-panel" class="w-full flex flex-col space-y-5">

          <!-- Tab switcher -->
	          <div class="initialization-auth-tabs flex border border-theme-border">
            <button
              @click="authTab = 'login'"
              class="initialization-auth-tab flex-1 py-2.5 text-[9px] font-mono uppercase tracking-[0.4em] transition-all duration-300"
              :class="{ 'is-active': authTab === 'login' }"
              :style="getAuthTabStyle('login')"
            >{{ locale === 'ru' ? 'Войти' : 'Sign In' }}</button>
            <button
              @click="authTab = 'register'"
              class="initialization-auth-tab flex-1 py-2.5 text-[9px] font-mono uppercase tracking-[0.4em] transition-all duration-300"
              :class="{ 'is-active': authTab === 'register' }"
              :style="getAuthTabStyle('register')"
            >{{ locale === 'ru' ? 'Регистрация' : 'Register' }}</button>
          </div>

          <!-- Error display -->
          <Transition name="fade-quick">
            <div v-if="authError" class="border border-red-500/40 bg-red-500/10 px-4 py-2">
              <span class="text-[9px] font-mono text-red-400 uppercase tracking-widest">{{ authError }}</span>
            </div>
          </Transition>

          <!-- Form -->
          <form @submit.prevent="authTab === 'login' ? doLogin() : doRegister()" class="flex flex-col space-y-4">
            <div class="flex flex-col">
              <input
                v-model="authEmail"
                type="email"
                required
                autocomplete="email"
                :placeholder="locale === 'ru' ? 'Email адрес' : 'Email Address'"
	                class="initialization-auth-input px-4 py-2.5 text-[11px] font-mono tracking-widest focus:outline-none transition-all uppercase"
              />
            </div>

            <div class="flex flex-col">
              <input
                v-model="authPassword"
                type="password"
                required
                autocomplete="current-password"
                :placeholder="locale === 'ru' ? 'ПАРОЛЬ' : 'PASSWORD'"
	                class="initialization-auth-input px-4 py-2.5 text-[11px] font-mono tracking-widest focus:outline-none transition-all"
              />
            </div>

            <div v-if="authTab === 'register'" class="flex flex-col">
              <input
                v-model="authPasswordConfirm"
                type="password"
                required
                :placeholder="locale === 'ru' ? 'ПАРОЛЬ' : 'PASSWORD'"
	                class="initialization-auth-input px-4 py-2.5 text-[11px] font-mono tracking-widest focus:outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              :disabled="authLoading"
              class="initialization-auth-submit-button w-full py-3 font-mono text-[9px] tracking-[0.5em] uppercase font-black transition-all mt-1 disabled:opacity-40 hover:opacity-90"
              :style="primaryButtonStyle"
            >
              <span v-if="authLoading">{{ locale === 'ru' ? 'Обработка...' : 'Processing...' }}</span>
              <span v-else-if="authTab === 'login'">{{ locale === 'ru' ? 'Войти в систему' : 'Access System' }}</span>
              <span v-else>{{ locale === 'ru' ? 'Создать оператора' : 'Create Operator' }}</span>
            </button>
          </form>

          <!-- Divider -->
          <div class="flex items-center space-x-4">
            <div class="initialization-auth-divider-line flex-1 h-px"></div>
            <span class="initialization-auth-divider-text text-[8px] font-mono uppercase tracking-widest">{{ locale === 'ru' ? 'или' : 'or' }}</span>
            <div class="initialization-auth-divider-line flex-1 h-px"></div>
          </div>

          <!-- Google sign-in -->
          <button
            @click="doGoogleLogin"
            :disabled="authLoading"
	            class="initialization-google-button w-full border py-3 font-mono text-[9px] tracking-[0.5em] uppercase font-black transition-all duration-300 flex items-center justify-center space-x-3 disabled:opacity-40"
          >
            <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>{{ locale === 'ru' ? 'Продолжить С Google' : 'Continue With Google' }}</span>
          </button>
        </div>

        <!-- ── BOOT PROGRESS ── -->
        <div v-else-if="phase === 'boot'" key="boot" class="w-full flex flex-col items-center space-y-6">
          <div class="w-full flex flex-col space-y-3">
            <div class="flex justify-between items-end">
              <span class="text-[9px] font-mono uppercase tracking-widest text-black/60">System_Initialization</span>
              <span class="text-[10px] font-mono font-black text-black">{{ Math.floor(progress) }}%</span>
            </div>

            <div class="h-2 w-full relative overflow-hidden rounded-full border border-black/15 bg-black/10">
              <div
                class="absolute top-0 left-0 h-full bg-black transition-all duration-300 rounded-full"
                :style="{ width: `${progress}%` }"
              ></div>
              <div class="absolute inset-y-0 left-0 w-12 bg-white/40 blur-sm animate-scan"></div>
            </div>
          </div>

          <div class="h-8 overflow-hidden relative w-full">
            <Transition name="log-slide" mode="out-in">
              <p :key="currentLog" class="text-center lowercase italic text-[10px] font-mono text-black" style="opacity: 0.2; ">
                {{ currentLog }}
              </p>
            </Transition>
          </div>
        </div>

        <!-- ── READY: INITIATE ── -->
        <div v-else-if="phase === 'ready'" key="ready" class="flex flex-col items-center space-y-4 pt-4">
          <button
            @click="$emit('initiate')"
            class="px-10 py-3 font-mono text-[9px] tracking-[0.5em] uppercase font-black transition-all hover:opacity-90"
            :style="primaryButtonStyle"
          >{{ locale === 'ru' ? 'Продолжить' : 'Continue' }}</button>
          <p class="text-[8px] font-mono lowercase italic text-black" style="opacity: 0.2; ">
            {{ locale === 'ru' ? 'оператор авторизован. система готова.' : 'Operator authenticated. System ready.' }}
          </p>
        </div>

      </Transition>
    </div>

    <!-- Bottom Telemetry -->
    <div class="fixed bottom-10 left-0 right-0 px-12 flex justify-between items-center pointer-events-none">
      <span class="text-[8px] font-mono uppercase tracking-widest text-black">ID: {{ appVersion }} // VOSHE COMPANY D.O.O</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useRuntimeConfig } from '#imports'
import EtherealBackground from '~/widgets/style/ui/EtherealBackground.vue'
import tauriConfig from '../../../../../src-tauri/tauri.conf.json'
import pkg from '../../../../../package.json'
import { useI18n } from '~/shared/i18n/useI18n'
import ExPanel from '~/shared/ui/ExPanel.vue'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { useAuthStore } from '~/entities/user/auth.store'
import { auth as firebaseAuth, db } from '~/shared/firebase.client'
import { useThemeStore } from '~/features/store/useTheme'
import DesignVignette from '~/widgets/style/ui/DesignVignette.vue'

type PayloadInstallResult = {
  downloadedFiles: number
  reusedFiles: number
  state: {
    version?: string | null
    active: boolean
  }
}

interface AvailableUpdate {
  type: 'native' | 'payload'
  version: string
  notes?: string
  nativeUpdateObj?: any
  manifestUrl?: string
  minimumNativeVersion?: string
  isSuitable?: boolean
  reason?: string
}

const baseVersion = String(tauriConfig.version || pkg.version || '1.1.0')
const installedNativeVersion = ref(baseVersion)
const activePayloadVersion = ref<string | null>(null)
const appVersion = computed(() => activePayloadVersion.value || installedNativeVersion.value)

const isVersionNewer = (remoteVer: string, currentVer: string): boolean => {
  const normalize = (value: string) => value.replace(/^[vV]/, '').trim().split('+')[0]
  const [remoteCore, remotePrerelease = ''] = normalize(remoteVer).split('-', 2)
  const [currentCore, currentPrerelease = ''] = normalize(currentVer).split('-', 2)
  const remoteParts = remoteCore.split('.').map(part => Number.parseInt(part, 10) || 0)
  const currentParts = currentCore.split('.').map(part => Number.parseInt(part, 10) || 0)
  const length = Math.max(remoteParts.length, currentParts.length)

  for (let index = 0; index < length; index += 1) {
    const remote = remoteParts[index] || 0
    const current = currentParts[index] || 0
    if (remote > current) return true
    if (remote < current) return false
  }

  if (!remotePrerelease && currentPrerelease) return true
  if (remotePrerelease && !currentPrerelease) return false
  return remotePrerelease.localeCompare(currentPrerelease, undefined, { numeric: true }) > 0
}

const currentPlatformFamily = (): 'macos' | 'windows' | 'linux' | null => {
  if (typeof navigator === 'undefined') return null
  const platform = `${navigator.platform || ''} ${navigator.userAgent || ''}`.toLowerCase()
  if (platform.includes('mac')) return 'macos'
  if (platform.includes('win')) return 'windows'
  if (platform.includes('linux')) return 'linux'
  return null
}

const emit = defineEmits(['initiate'])
const { locale, setLocale } = useI18n()

const themeStore = useThemeStore()
const isDark = computed(() => themeStore.settings.isDark)
const isGradflowReady = useState('isAccessGradflowReady', () => false)
const isInitializationGradflowVisible = useState('isInitializationGradflowVisible', () => false)
const FORCE_STARTUP_PREVIEW = false
const isStartupIntro = ref(true)
const isStartupView = computed(() => FORCE_STARTUP_PREVIEW || isStartupIntro.value)
let startupIntroTimer: ReturnType<typeof setTimeout> | null = null

watch(isStartupView, (isStartup) => {
  isInitializationGradflowVisible.value = !isStartup
  if (!isStartup) isGradflowReady.value = false
}, { immediate: true })
const primaryButtonStyle = computed(() => ({
  background: '#171717',
  color: '#ffffff'
}))
const activeTabStyle = computed(() => ({
  ...primaryButtonStyle.value,
  fontWeight: '900'
}))
const getAuthTabStyle = (tab: 'login' | 'register') => {
  const isActive = authTab.value === tab

  if (isStartupView.value) {
    return isActive
      ? {
          background: '#eee9df',
          color: '#10110f',
          fontWeight: '900'
        }
      : {
          background: 'transparent',
          color: '#eee9df'
        }
  }

  return isActive
    ? activeTabStyle.value
    : { color: '#171717' }
}

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)
const isAuthResolving = computed(() => phase.value === 'auth' && !authStore.authReady)

// ── Auth state ──
const authTab = ref<'login' | 'register'>('login')
const authEmail = ref('')
const authPassword = ref('')
const authPasswordConfirm = ref('')
const authError = ref<string | null>(null)
const authLoading = ref(false)

// ── Phase ──
const phase = ref<'update' | 'auth' | 'boot' | 'ready'>('update')

import { useAppBootStore } from '~/features/store/useAppBoot'
import { getCachedAvatarUrl } from '~/entities/user/model/user-avatar'
import { syncGoogleProfile } from '~/entities/user/model/sync-google-profile'

const appBootStore = useAppBootStore()

// ── Boot progress ──
const progress = computed(() => appBootStore.bootProgress)
const currentLog = computed(() => appBootStore.currentLog)

// ── Startup update check ──
const updateProgress = ref(0)
const updateTitle = ref('ПРОВЕРКА_ОБНОВЛЕНИЙ')
const updateLog = ref('проверка доступных обновлений')
let updateProgressTimer: ReturnType<typeof setInterval> | null = null

const pendingUpdate = ref<AvailableUpdate | null>(null)
const isUpdateInstalled = ref(false)
const isRelaunching = ref(false)

const forceRelaunchApp = async () => {
  if (isRelaunching.value) return
  isRelaunching.value = true
  setUpdateCopy('ПЕРЕЗАПУСК', locale.value === 'ru' ? 'выполняется перезапуск приложения...' : 'restarting application...')

  try {
    const { relaunch } = await import('@tauri-apps/plugin-process')
    await relaunch()
  } catch (err) {
    console.warn('[Updater] Relaunch plugin call failed:', err)
  }

  // Fallback 1: reload location after 400ms if process relaunch didn't exit app
  setTimeout(() => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }, 400)

  // Fallback 2: hard redirect after 800ms
  setTimeout(() => {
    if (typeof window !== 'undefined') {
      window.location.href = window.location.href
    }
  }, 800)
}

const clearUpdateProgressTimer = () => {
  if (!updateProgressTimer) return
  clearInterval(updateProgressTimer)
  updateProgressTimer = null
}

const setUpdateCopy = (title: string, message: string) => {
  updateTitle.value = title
  updateLog.value = message
}

const finishUpdatePhase = () => {
  if (isUpdateInstalled.value) return
  clearUpdateProgressTimer()
  updateProgress.value = 100
  setTimeout(() => {
    if (isAuthenticated.value) {
      startBoot()
      return
    }
    phase.value = 'auth'
  }, 260)
}

const runArtificialUpdateProgress = async () => {
  clearUpdateProgressTimer()
  setUpdateCopy('СИНХРОНИЗАЦИЯ_ПАКЕТА', 'синхронизация локального пакета')
  updateProgress.value = 0

  await new Promise<void>((resolve) => {
    const startedAt = Date.now()
    const duration = 3600
    updateProgressTimer = setInterval(() => {
      const elapsed = Date.now() - startedAt
      const ratio = Math.min(1, elapsed / duration)
      updateProgress.value = Math.min(99, Math.round((1 - Math.pow(1 - ratio, 2.4)) * 100))
      if (ratio >= 1) {
        clearUpdateProgressTimer()
        resolve()
      }
    }, 80)
  })

  finishUpdatePhase()
}

const checkNativeUpdate = async (): Promise<AvailableUpdate | null> => {
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check()
    if (!update || !update.version) return null
    return {
      type: 'native',
      version: update.version,
      notes: update.body,
      nativeUpdateObj: update,
      isSuitable: true
    }
  } catch (err: any) {
    console.info('[NativeUpdater] No compatible native update binary found:', err)
    return null
  }
}

const checkPayloadUpdate = async (manifestUrl: string): Promise<AvailableUpdate | null> => {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    let manifest: any = null

    try {
      manifest = await invoke('payload_update_fetch_manifest', { manifestUrl })
    } catch (invokeErr) {
      const res = await fetch(manifestUrl)
      if (!res.ok) return null
      manifest = await res.json()
    }

    if (!manifest || !manifest.version) return null

    const localState = await invoke<{ version?: string | null; active: boolean }>('payload_update_get_state').catch(() => null)

    if (localState?.active && localState?.version) {
      activePayloadVersion.value = localState.version
    }
    const activeVersion = activePayloadVersion.value || installedNativeVersion.value

    let isSuitable = true
    let reason = ''

    if (manifest.appIdentifier && manifest.appIdentifier !== tauriConfig.identifier) {
      isSuitable = false
      reason = locale.value === 'ru'
        ? `Идентификатор приложения (${manifest.appIdentifier}) не совпадает с установленным (${tauriConfig.identifier})`
        : `App identifier (${manifest.appIdentifier}) does not match installed (${tauriConfig.identifier})`
    } else if (manifest.platform && manifest.platform !== 'any' && currentPlatformFamily() && !String(manifest.platform).startsWith(currentPlatformFamily()!)) {
      isSuitable = false
      reason = locale.value === 'ru'
        ? `Версия релиза предназначена для платформы ${manifest.platform}`
        : `Release version is built for platform ${manifest.platform}`
    }

    const minimumNativeVersion = String(manifest.minimumNativeVersion || '').trim()
    if (isSuitable && minimumNativeVersion && isVersionNewer(minimumNativeVersion, installedNativeVersion.value)) {
      isSuitable = false
      reason = locale.value === 'ru'
        ? `Payload требует приложение ${minimumNativeVersion} или новее. Сейчас установлено ${installedNativeVersion.value}`
        : `Payload requires application ${minimumNativeVersion} or newer. ${installedNativeVersion.value} is installed`
    }

    if (isVersionNewer(manifest.version, activeVersion) || !isSuitable) {
      return {
        type: 'payload',
        version: manifest.version,
        notes: locale.value === 'ru' ? 'Обновление веб-интерфейса и аналитики' : 'UI payload & analytics update',
        manifestUrl,
        minimumNativeVersion: minimumNativeVersion || undefined,
        isSuitable,
        reason
      }
    }
    return null
  } catch (err) {
    console.warn('[PayloadUpdater] Check failed:', err)
    return null
  }
}

const performNativeInstall = async (update: any) => {
  setUpdateCopy('ЗАГРУЗКА_ОБНОВЛЕНИЯ', `загрузка версии ${update.version}`)
  updateProgress.value = 18
  let downloadedBytes = 0
  let totalBytes: number | undefined

  await update.downloadAndInstall((event: any) => {
    if (event.event === 'Started') {
      totalBytes = event.data.contentLength
      return
    }
    if (event.event === 'Progress') {
      downloadedBytes += event.data.chunkLength
      if (totalBytes) {
        updateProgress.value = Math.min(94, Math.max(18, Math.round((downloadedBytes / totalBytes) * 94)))
      }
    }
  })
  await update.close()

  clearUpdateProgressTimer()
  updateProgress.value = 100
  downloadSpeedText.value = ''
  remainingSizeText.value = ''
  isUpdateInstalled.value = true
  setUpdateCopy('ОБНОВЛЕНИЕ_ГОТОВО', locale.value === 'ru' ? 'обновление установлено. требуется перезапуск' : 'update installed. restart required')
  setTimeout(() => {
    void forceRelaunchApp()
  }, 450)
}

const downloadSpeedText = ref('')
const remainingSizeText = ref('')

const performPayloadInstall = async (manifestUrl: string) => {
  setUpdateCopy('ПОДГОТОВКА_К_ЗАГРУЗКЕ', 'инициализация потока скачивания')
  updateProgress.value = 5

  const { invoke } = await import('@tauri-apps/api/core')
  const { listen } = await import('@tauri-apps/api/event')

  let unlistenProgress: (() => void) | null = null

  try {
    unlistenProgress = await listen<any>('payload-download-progress', (event) => {
      const data = event.payload
      if (!data) return

      if (data.stage === 'downloading') {
        const speedMB = (data.speedBytesPerSec / (1024 * 1024)).toFixed(1)
        const remainingMB = (data.remainingBytes / (1024 * 1024)).toFixed(1)
        const downloadedMB = (data.downloadedBytes / (1024 * 1024)).toFixed(1)
        const totalMB = (data.totalBytes / (1024 * 1024)).toFixed(1)

        downloadSpeedText.value = locale.value === 'ru' ? `СКОРОСТЬ: ${speedMB} МБ/с` : `SPEED: ${speedMB} MB/s`
        remainingSizeText.value = locale.value === 'ru'
          ? `ОСТАЛОСЬ: ${remainingMB} МБ (${downloadedMB}/${totalMB} МБ)`
          : `REMAINING: ${remainingMB} MB (${downloadedMB}/${totalMB} MB)`

        updateProgress.value = Math.min(90, Math.max(5, Math.round(data.percentage)))
        setUpdateCopy('ЗАГРУЗКА_ОБНОВЛЕНИЯ', locale.value === 'ru' ? 'скачивание пакета ресурсов' : 'downloading update payload')
      } else if (data.stage === 'extracting' || data.stage === 'verifying') {
        downloadSpeedText.value = ''
        remainingSizeText.value = ''
        updateProgress.value = 95
        setUpdateCopy('РАСПАКОВКА_И_ПРОВЕРКА', locale.value === 'ru' ? 'установка и проверка целостности файлов' : 'unpacking and verifying files')
      }
    })

    const result = await invoke<PayloadInstallResult>('payload_update_install_from_feed', {
      manifestUrl,
    })

    if (unlistenProgress) unlistenProgress()

    if ((result.downloadedFiles > 0 || result.reusedFiles > 0) && result.state.active) {
      updateProgress.value = 100
      downloadSpeedText.value = ''
      remainingSizeText.value = ''
      isUpdateInstalled.value = true
      setUpdateCopy('ОБНОВЛЕНИЕ_ГОТОВО', locale.value === 'ru' ? 'обновление установлено. требуется перезапуск' : 'update installed. restart required')
      setTimeout(() => {
        void forceRelaunchApp()
      }, 450)
      return
    }
  } catch (err) {
    if (unlistenProgress) unlistenProgress()
    downloadSpeedText.value = ''
    remainingSizeText.value = ''
    console.warn('[Updater] Installation failed:', err)
    throw err
  }
}

const confirmAndInstallUpdate = async () => {
  if (!pendingUpdate.value || pendingUpdate.value.isSuitable === false) return
  const updateToInstall = { ...pendingUpdate.value }
  pendingUpdate.value = null

  try {
    setUpdateCopy('ПОДГОТОВКА_К_ОБНОВЛЕНИЮ', 'инициализация процесса установки')
    updateProgress.value = 10

    if (updateToInstall.type === 'native' && updateToInstall.nativeUpdateObj) {
      await performNativeInstall(updateToInstall.nativeUpdateObj)
    } else if (updateToInstall.type === 'payload' && updateToInstall.manifestUrl) {
      await performPayloadInstall(updateToInstall.manifestUrl || 'https://github.com/jorudr/JLJ/releases/download/release/payload-manifest.json')
    } else {
      await runArtificialUpdateProgress()
    }
  } catch (err) {
    console.warn('[Updater] Installation failed:', err)
    await runArtificialUpdateProgress()
  }
}

const skipUpdate = () => {
  pendingUpdate.value = null
  finishUpdatePhase()
}

const startUpdateCheck = async () => {
  phase.value = 'update'
  const config = useRuntimeConfig()
  const manifestUrl = String(config.public.payloadManifestUrl || '').trim()
  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__

  if (!isTauri) {
    await runArtificialUpdateProgress()
    return
  }

  try {
    const { getVersion } = await import('@tauri-apps/api/app')
    installedNativeVersion.value = await getVersion()

    setUpdateCopy('ПРОВЕРКА_ОБНОВЛЕНИЙ', 'проверка доступных обновлений')
    updateProgress.value = 8

    // 1. Check Native Update
    const nativeUpdate = await checkNativeUpdate()
    if (nativeUpdate) {
      pendingUpdate.value = nativeUpdate
      return
    }

    // 2. Check Payload Update
    if (manifestUrl) {
      const payloadUpdate = await checkPayloadUpdate(manifestUrl)
      if (payloadUpdate) {
        pendingUpdate.value = payloadUpdate
        return
      }
    }

    // If no real update found
    await runArtificialUpdateProgress()
  } catch (error) {
    console.warn('[updater] initialization update check failed', error)
    await runArtificialUpdateProgress()
  }
}

const startBoot = async () => {
  phase.value = 'boot'
  
  if (authStore.user?.uid) {
    await appBootStore.executeBootSequence(authStore.user.uid)
  }
  
  // Add a slight visual delay for high fidelity transition after 100%
  setTimeout(() => {
    phase.value = 'ready'
  }, 600)
}

// ── Helpers ──
const ensureUserDocument = async (user: any) => {
  await syncGoogleProfile(user)
  await authStore.setUser({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    avatarUrl: await getCachedAvatarUrl(user.photoURL).catch(() => null),
    joinedAt: user.metadata.creationTime ?? null
  })
}

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

const getPasswordValidationError = (password: string) => {
  if (password.length < 8) return 'Password must contain at least 8 characters.'
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter.'
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter.'
  if (!/\d/.test(password)) return 'Password must contain a number.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain a special character.'
  return null
}

// ── Email/password login ──
const doLogin = async () => {
  authError.value = null
  authLoading.value = true
  try {
    const result = await signInWithEmailAndPassword(firebaseAuth, authEmail.value.trim(), authPassword.value)
    const user = result.user
    authStore.setUser({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      joinedAt: user.metadata.creationTime ?? null
    })
    startBoot()
  } catch (e: any) {
    authError.value = e.message?.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim() ?? 'Login failed.'
  } finally {
    authLoading.value = false
  }
}

// ── Email/password register ──
const doRegister = async () => {
  authError.value = null
  const email = authEmail.value.trim()
  if (!isValidEmail(email)) {
    authError.value = 'Email must be valid and contain @.'
    return
  }
  const passwordError = getPasswordValidationError(authPassword.value)
  if (passwordError) {
    authError.value = passwordError
    return
  }
  if (authPassword.value !== authPasswordConfirm.value) {
    authError.value = 'Passwords do not match.'
    return
  }
  authLoading.value = true
  try {
    const result = await createUserWithEmailAndPassword(firebaseAuth, email, authPassword.value)
    const user = result.user
    authStore.setUser({
      uid: user.uid,
      email: user.email,
      displayName: user.email,
      photoURL: null,
      joinedAt: user.metadata.creationTime ?? null
    })
    await setDoc(doc(db, 'users', user.uid), {
      displayName: user.email,
      email: user.email,
      role: 'member',
      joinedAt: serverTimestamp()
    })
    await authStore.setUser({
      uid: user.uid,
      email: user.email,
      displayName: user.email,
      photoURL: null,
      joinedAt: user.metadata.creationTime ?? null
    })
    startBoot()
  } catch (e: any) {
    authError.value = e.message?.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim() ?? 'Registration failed.'
  } finally {
    authLoading.value = false
  }
}

// ── Google login ──
const doGoogleLogin = async () => {
  authError.value = null
  authLoading.value = true
  try {
    const isTauri = !!(window as any).__TAURI_INTERNALS__
    if (isTauri) {
      // Tauri: deep-link PKCE flow
      const { open } = await import('@tauri-apps/plugin-shell')
      const { getCurrent, onOpenUrl } = await import('@tauri-apps/plugin-deep-link')
      const clientId = '79915571390-v910mjv94lmgod0nrcu1vj9ctb3tdm22.apps.googleusercontent.com'
      const reversedClientId = 'com.googleusercontent.apps.79915571390-v910mjv94lmgod0nrcu1vj9ctb3tdm22'
      const redirectUri = `${reversedClientId}:/oauth2callback`
      const scope = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid'

      const rand = (n: number) => { let s = ''; const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'; for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)]; return s }
      const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const codeVerifier = rand(128)
      const codeChallenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier)))
      const oauthState = rand(48)
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${encodeURIComponent(oauthState)}`

      const code = await new Promise<string>((resolve, reject) => {
        let settled = false
        const cleanupCallbacks: Array<() => void> = []
        const timeoutId = window.setTimeout(() => {
          fail(new Error('Login timed out.'))
        }, 180000)

        const cleanup = () => {
          window.clearTimeout(timeoutId)
          cleanupCallbacks.splice(0).forEach((cleanupCallback) => cleanupCallback())
        }

        const finish = (value: string) => {
          if (settled) return
          settled = true
          cleanup()
          resolve(value)
        }

        const fail = (error: unknown) => {
          if (settled) return
          settled = true
          cleanup()
          reject(error)
        }

        const parseDeepLinkUrl = (url: string) => {
          if (!url.startsWith(reversedClientId)) return

          try {
            const parsedUrl = new URL(url)
            const error = parsedUrl.searchParams.get('error')
            const authorizationCode = parsedUrl.searchParams.get('code')
            const returnedState = parsedUrl.searchParams.get('state')

            if (error) {
              fail(new Error(`Google Error: ${error}`))
              return
            }

            if (returnedState !== oauthState) {
              fail(new Error('Google login callback state mismatch.'))
              return
            }

            if (authorizationCode) finish(authorizationCode)
          } catch (error) {
            fail(error)
          }
        }

        const collectDeepLinkUrls = (value: unknown): string[] => {
          if (typeof value === 'string') return [value]
          if (Array.isArray(value)) return value.flatMap(collectDeepLinkUrls)
          if (value && typeof value === 'object') {
            return Object.values(value as Record<string, unknown>).flatMap(collectDeepLinkUrls)
          }
          return []
        }

        onOpenUrl((urls: string[]) => {
          urls.forEach(parseDeepLinkUrl)
        })
          .then((unlisten) => {
            if (settled) unlisten()
            else cleanupCallbacks.push(unlisten)
          })
          .catch(fail)

        // Handles Windows cold starts where the callback URL was supplied as
        // the process argument before the JavaScript listener was attached.
        getCurrent()
          .then((urls) => urls?.forEach(parseDeepLinkUrl))
          .catch(fail)

        import('@tauri-apps/api/event')
          .then(({ listen }) => listen('single-instance', (event: { payload: unknown }) => {
            collectDeepLinkUrls(event.payload).forEach(parseDeepLinkUrl)
          }))
          .then((unlisten) => {
            if (settled) unlisten()
            else cleanupCallbacks.push(unlisten)
          })
          .catch(fail)

        open(authUrl).catch(fail)
      })

      const data = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: clientId, redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: codeVerifier }) })).json()
      const credential = GoogleAuthProvider.credential(data.id_token, data.access_token)
      const result = await signInWithCredential(firebaseAuth, credential)
      const user = result.user
      authStore.setUser({ uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL, joinedAt: user.metadata.creationTime ?? null })
      await ensureUserDocument(user)
    } else {
      const result = await signInWithPopup(firebaseAuth, new GoogleAuthProvider())
      const user = result.user
      authStore.setUser({ uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL, joinedAt: user.metadata.creationTime ?? null })
      await ensureUserDocument(user)
    }
    startBoot()
  } catch (e: any) {
    authError.value = e.message?.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim() ?? 'Google login failed.'
  } finally {
    authLoading.value = false
  }
}

// ── Sign out ──
const doSignOut = async () => {
  await signOut(firebaseAuth)
  authStore.setUser(null as any)
  authEmail.value = ''
  authPassword.value = ''
  authPasswordConfirm.value = ''
  authError.value = null
  appBootStore.bootProgress = 0
  phase.value = 'auth'
}

onMounted(() => {
  if (FORCE_STARTUP_PREVIEW) return

  startupIntroTimer = setTimeout(() => {
    isStartupIntro.value = false
    startupIntroTimer = null
  }, 2200)

  startUpdateCheck()
})

onBeforeUnmount(() => {
  isInitializationGradflowVisible.value = false
  clearUpdateProgressTimer()
  if (!startupIntroTimer) return
  clearTimeout(startupIntroTimer)
  startupIntroTimer = null
})
</script>

<style scoped>
.ex-initialization {
  background-color: #050505 !important;
  transition: background-color 900ms ease, color 900ms ease;
}

.ex-initialization.is-gradflow-ready {
  background-color: transparent !important;
}

.initialization-logo-line {
  border-color: #2c2c2a !important;
  transition: border-color 900ms ease;
}

.initialization-logo-core {
  background-color: #2c2c2a !important;
  transition: background-color 900ms ease;
}

.ex-initialization :deep(.gradflow-background),
.ex-initialization :deep(.gradflow-canvas),
.ex-initialization :deep(.gradflow-canvas canvas) {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
}

.ex-initialization :deep(.gradflow-background) {
  position: fixed;
  inset: 0;
}

.ex-initialization.is-startup {
  --startup-dark: #050505;
  --startup-light: #eee9df;
  --startup-light-rgb: 238, 233, 223;
  --theme-bg: var(--startup-dark);
  --theme-text: var(--startup-light);
  --theme-muted: rgba(var(--startup-light-rgb), 0.56);
  --theme-border: rgba(var(--startup-light-rgb), 0.22);
  --theme-border-strong: rgba(var(--startup-light-rgb), 0.55);
  background: var(--startup-dark);
  color: var(--startup-light);
}

.ex-initialization.is-startup :deep(.gradflow-background),
.ex-initialization.is-startup :deep(.background-system),
.ex-initialization.is-startup :deep(.vignette-system) {
  opacity: 0 !important;
}

.initialization-auth-card {
  border-color: rgba(255, 255, 255, 0.1);
}

.initialization-auth-input {
  appearance: none;
  -webkit-appearance: none;
  background: rgba(17, 22, 20, 0.08);
  border: 0;
  border-bottom: 1px solid rgba(17, 22, 20, 0.42);
  border-radius: 0;
  color: #111614;
  box-shadow: none !important;
  outline: none !important;
}

.initialization-auth-input:focus,
.initialization-auth-input:focus-visible,
.initialization-auth-input:active {
  appearance: none;
  -webkit-appearance: none;
  background: rgba(17, 22, 20, 0.08);
  border-bottom-color: rgba(17, 22, 20, 0.42);
  box-shadow: none !important;
  outline: none !important;
}

.initialization-auth-input::placeholder {
  color: #111614;
  opacity: 0.52;
}

.initialization-google-button {
  background: #171717;
  border-color: #171717;
  color: #ffffff;
  opacity: 1;
}

.initialization-google-button:hover:not(:disabled) {
  background: #171717;
  border-color: #171717;
  color: #ffffff;
  opacity: 0.86;
}

.initialization-auth-divider-line {
  background: #000000;
  opacity: 0.22;
}

.initialization-auth-divider-text {
  color: #000000;
  opacity: 0.46;
}

.ex-initialization.is-startup .initialization-auth-input {
  background: transparent;
  border-bottom-color: rgba(var(--startup-light-rgb), 0.42);
  color: var(--startup-light);
  opacity: 0.8;
}

.ex-initialization.is-startup .initialization-auth-input:focus,
.ex-initialization.is-startup .initialization-auth-input:focus-visible,
.ex-initialization.is-startup .initialization-auth-input:active {
  border-bottom-color: rgba(var(--startup-light-rgb), 0.42);
  box-shadow: none !important;
  outline: none !important;
}

.ex-initialization.is-startup .initialization-auth-input::placeholder {
  color: var(--startup-light);
  opacity: 0.52;
}

.ex-initialization.is-startup .initialization-auth-divider-line {
  background: var(--startup-light);
  opacity: 0.1;
}

.ex-initialization.is-startup .initialization-auth-divider-text {
  color: var(--startup-light);
  opacity: 0.3;
}

.ex-initialization.is-startup .text-black,
.ex-initialization.is-startup .text-theme-text,
.ex-initialization.is-startup .nier-text-primary {
  color: var(--startup-light) !important;
}

.ex-initialization.is-startup .initialization-logo-line {
  border-color: var(--startup-light) !important;
}

.ex-initialization.is-startup .initialization-logo-core {
  background-color: var(--startup-light) !important;
}

.ex-initialization.is-startup h1,
.ex-initialization.is-startup p,
.ex-initialization.is-startup span,
.ex-initialization.is-startup input {
  color: var(--startup-light) !important;
}

.ex-initialization.is-startup button {
  background: var(--startup-light) !important;
  border-color: var(--startup-light) !important;
  color: var(--startup-dark) !important;
}

.ex-initialization.is-startup button span {
  color: var(--startup-dark) !important;
}

.ex-initialization.is-startup [aria-label="Смена языка"] button,
.ex-initialization.is-startup [aria-label="Language switcher"] button {
  background: transparent !important;
  border-color: transparent !important;
  color: var(--startup-light) !important;
}

.ex-initialization.is-startup .initialization-sign-out-button,
.ex-initialization.is-startup .initialization-skip-button {
  background: transparent !important;
  border-color: transparent !important;
  color: var(--startup-light) !important;
}

.ex-initialization.is-startup .initialization-skip-button span {
  color: var(--startup-light) !important;
}

.ex-initialization.is-startup .initialization-auth-tab {
  opacity: 0.8 !important;
}

.ex-initialization.is-startup .initialization-auth-submit-button,
.ex-initialization.is-startup .initialization-google-button {
  opacity: 0.8 !important;
}

.ex-initialization.is-startup .initialization-auth-tabs {
  border-color: rgba(var(--startup-light-rgb), 0.28) !important;
}

.ex-initialization.is-startup .initialization-auth-tab:not(.is-active) {
  background: transparent !important;
  color: var(--startup-light) !important;
}

.ex-initialization.is-startup .initialization-auth-tab.is-active {
  background: var(--startup-light) !important;
  color: var(--startup-dark) !important;
  opacity: 0.8 !important;
}

.ex-initialization.is-startup .initialization-auth-tab.is-active span {
  color: var(--startup-dark) !important;
}

.ex-initialization.is-startup .bg-black,
.ex-initialization.is-startup .nier-bg-inverted {
  background-color: var(--startup-light) !important;
}

.ex-initialization.is-startup .border-black,
.ex-initialization.is-startup .border-theme-text,
.ex-initialization.is-startup .border-theme-border {
  border-color: rgba(var(--startup-light-rgb), 0.75) !important;
}

.step-fade-enter-active, .step-fade-leave-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.step-fade-enter-from { opacity: 0; transform: translateY(14px); }
.step-fade-leave-to   { opacity: 0; transform: translateY(-10px); }

.fade-quick-enter-active, .fade-quick-leave-active {
  transition: opacity 0.3s ease;
}
.fade-quick-enter-from, .fade-quick-leave-to { opacity: 0; }

.log-slide-enter-active, .log-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.log-slide-enter-from { opacity: 0; transform: translateY(10px); }
.log-slide-leave-to   { opacity: 0; transform: translateY(-10px); }

@keyframes scan {
  0%   { transform: translateX(-100%); opacity: 0; }
  50%  { opacity: 1; }
  100% { transform: translateX(100%); opacity: 0; }
}
.animate-scan { animation: scan 2.5s linear infinite; }

@keyframes glitch-interval {
  0%, 2%, 100% { transform: translate(0); text-shadow: none; opacity: 1; filter: none; }
  0.4% { transform: translate(-2px, 1px) skewX(2deg); opacity: 0.8; text-shadow: 2px 0px rgba(255,0,0,0.6), -2px 0px rgba(0,255,255,0.6); }
  0.8% { transform: translate(2px, -1px) skewX(-2deg); opacity: 0.9; text-shadow: -2px 0px rgba(255,0,0,0.6), 2px 0px rgba(0,255,255,0.6); }
  1.2% { transform: translate(-1px, 2px) skewX(1deg); opacity: 0.8; text-shadow: 1px 0px rgba(255,0,0,0.6), -1px 0px rgba(0,255,255,0.6); }
  1.6% { transform: translate(1px, -2px) skewX(-1deg); opacity: 0.9; text-shadow: -1px 0px rgba(255,0,0,0.6), 1px 0px rgba(0,255,255,0.6); }
}
.animate-glitch {
  animation: glitch-interval 10s infinite;
}
</style>
