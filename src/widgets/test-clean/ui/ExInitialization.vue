<template>
  <div
    class="fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden ethereal-void nier-text-primary"
    :class="{ 'is-dark': isDark }"
    style="font-family: 'Cormorant Garamond', serif;"
  >
    <!-- Ethereal Background -->
    <EtherealBackground :is-dark="isDark" :is-assembled="true" :show-bloom="false" />
    <!-- Background Ambience -->
    <!-- <div class="absolute inset-0 opacity-20 pointer-events-none">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--theme-text)_0%,transparent_70%)] opacity-5"></div>
      <div class="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.5)_100%)]"></div>
    </div> -->
    <DesignVignette v-if="!isDark" :is-dark="isDark" />

    <!-- ── LANGUAGE SWITCH (top-left) ── -->
    <div
      v-if="shouldShowAuthLanguageSwitch"
      class="fixed left-8 top-16 z-[100] flex items-center border border-theme-border bg-theme-bg/30 backdrop-blur-sm"
      role="group"
      :aria-label="locale === 'ru' ? 'Смена языка' : 'Language switcher'"
    >
      <button
        type="button"
        class="px-3 py-2 text-[8px] font-mono uppercase tracking-[0.35em] transition-all duration-300"
        :class="locale === 'ru' ? 'bg-theme-text text-theme-bg opacity-100' : 'text-theme-text opacity-35 hover:opacity-100'"
        :aria-pressed="locale === 'ru'"
        @click="setLocale('ru')"
      >
        RU
      </button>
      <button
        type="button"
        class="border-l border-theme-border px-3 py-2 text-[8px] font-mono uppercase tracking-[0.35em] transition-all duration-300"
        :class="locale === 'en' ? 'bg-theme-text text-theme-bg opacity-100' : 'text-theme-text opacity-35 hover:opacity-100'"
        :aria-pressed="locale === 'en'"
        @click="setLocale('en')"
      >
        EN
      </button>
    </div>

    <!-- ── SIGN OUT (top-right, only when authenticated) ── -->
    <Transition name="fade-quick">
	      <button
	        v-if="isAuthenticated && phase === 'auth'"
	        @click="doSignOut"
	        class="fixed top-16 right-8 z-[100] text-[8px] font-mono uppercase tracking-[0.4em] border border-theme-border px-4 py-2 transition-all duration-300 text-theme-text opacity-30 hover:opacity-100"
	        @mouseenter="(e) => (e.currentTarget as HTMLElement).style.opacity = '1'"
	        @mouseleave="(e) => (e.currentTarget as HTMLElement).style.opacity = '0.3'"
	      >Sign_Out</button>
    </Transition>

    <!-- Center Assembly -->
    <div class="relative flex flex-col items-center space-y-10 z-10 w-full max-w-sm px-8">

      <!-- Core Icon -->
	      <div class="relative w-20 h-20 flex items-center justify-center mb-2 shrink-0">
	        <div class="absolute inset-0 border-2 animate-[spin_10s_linear_infinite] border-theme-text/40"></div>
	        <div class="absolute inset-3 border animate-[spin_6s_linear_infinite_reverse] border-theme-text/60"></div>
	        <div class="w-3 h-3 rotate-45 animate-pulse nier-bg-inverted"></div>
	        <div class="absolute -top-3 -left-3 w-5 h-5 border-t-2 border-l-2 border-theme-text"></div>
	        <div class="absolute -bottom-3 -right-3 w-5 h-5 border-b-2 border-r-2 border-theme-text"></div>
	      </div>

      <!-- Identity -->
      <div class="flex flex-col items-center space-y-1 text-center">
        <h1 class="text-3xl tracking-[0.5em] uppercase font-light animate-glitch" >J.L.Jörmungandr</h1>
        <p class="text-[8px] font-mono tracking-[0.6em] uppercase opacity-30">{{ locale === 'ru' ? 'УНИВЕРСАЛЬНАЯ_АНАЛИТИЧЕСКАЯ_ПЛАТФОРМА' : 'Universal_Analytical_Platform' }}</p>
      </div>

      <!-- ── PHASE SWITCHER ── -->
      <Transition name="step-fade" mode="out-in">
        <!-- ── AUTH CHECK: keep forms hidden until Firebase resolves persisted session ── -->
        <div v-if="isAuthResolving" key="auth-check" class="w-full flex min-h-20 items-center justify-center">
          <div class="relative h-5 w-5">
            <div class="absolute inset-0 rounded-full border border-theme-text/20"></div>
            <div class="absolute inset-0 animate-spin rounded-full border border-transparent border-t-theme-text"></div>
          </div>
        </div>

        <!-- ── AUTHENTICATED: boot prompt ── -->
        <div v-else-if="isAuthenticated && phase === 'auth'" key="authenticated" class="w-full flex flex-col items-center space-y-5">
	          <div class="w-full border border-theme-border bg-theme-text/[0.05] p-4 flex items-center space-x-4">
            <div class="w-2 h-2 nier-bg-inverted rounded-full animate-pulse shrink-0"></div>
            <div class="flex flex-col min-w-0">
              <span class="text-[8px] font-mono uppercase tracking-[0.4em] opacity-50">Operator_Authenticated</span>
              <span class="text-[11px] font-mono font-black uppercase tracking-widest truncate" >{{ authStore.user?.email }}</span>
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
	          <div class="flex border border-theme-border">
            <button
              @click="authTab = 'login'"
              class="flex-1 py-2.5 text-[9px] font-mono uppercase tracking-[0.4em] transition-all duration-300"
              :style="authTab === 'login'
	                ? activeTabStyle
	                : 'color: var(--theme-muted);'"
            >Sign_In</button>
            <button
              @click="authTab = 'register'"
              class="flex-1 py-2.5 text-[9px] font-mono uppercase tracking-[0.4em] transition-all duration-300"
              :style="authTab === 'register'
	                ? activeTabStyle
	                : 'color: var(--theme-muted);'"
            >Register</button>
          </div>

          <!-- Error display -->
          <Transition name="fade-quick">
            <div v-if="authError" class="border border-red-500/40 bg-red-500/10 px-4 py-2">
              <span class="text-[9px] font-mono text-red-400 uppercase tracking-widest">{{ authError }}</span>
            </div>
          </Transition>

          <!-- Form -->
          <form @submit.prevent="authTab === 'login' ? doLogin() : doRegister()" class="flex flex-col space-y-4">
            <div class="flex flex-col space-y-1.5">
              <span class="text-[8px] font-mono uppercase tracking-[0.4em]" style="opacity: 0.4; ">Email_Address</span>
              <input
                v-model="authEmail"
                type="email"
                required
                autocomplete="email"
                placeholder="OPERATOR@SYSTEM.IO"
	                class="bg-transparent border border-theme-border px-4 py-2.5 text-[11px] font-mono tracking-widest focus:outline-none focus:border-theme-text transition-all uppercase text-theme-text placeholder:opacity-20"
              />
            </div>

            <div class="flex flex-col space-y-1.5">
              <span class="text-[8px] font-mono uppercase tracking-[0.4em]" style="opacity: 0.4; ">Access_Code</span>
              <input
                v-model="authPassword"
                type="password"
                required
                autocomplete="current-password"
                placeholder="••••••••"
	                class="bg-transparent border border-theme-border px-4 py-2.5 text-[11px] font-mono tracking-widest focus:outline-none focus:border-theme-text transition-all text-theme-text placeholder:opacity-20"
              />
            </div>

            <div v-if="authTab === 'register'" class="flex flex-col space-y-1.5">
              <span class="text-[8px] font-mono uppercase tracking-[0.4em]" style="opacity: 0.4; ">Confirm_Code</span>
              <input
                v-model="authPasswordConfirm"
                type="password"
                required
                placeholder="••••••••"
	                class="bg-transparent border border-theme-border px-4 py-2.5 text-[11px] font-mono tracking-widest focus:outline-none focus:border-theme-text transition-all text-theme-text placeholder:opacity-20"
              />
            </div>

            <button
              type="submit"
              :disabled="authLoading"
              class="w-full py-3 font-mono text-[9px] tracking-[0.5em] uppercase font-black transition-all mt-1 disabled:opacity-40 hover:opacity-90"
              :style="primaryButtonStyle"
            >
              <span v-if="authLoading">Processing...</span>
              <span v-else-if="authTab === 'login'">Access_System</span>
              <span v-else>Create_Operator</span>
            </button>
          </form>

          <!-- Divider -->
          <div class="flex items-center space-x-4">
            <div class="flex-1 h-px" style="background: var(--theme-text); opacity: 0.1;"></div>
            <span class="text-[8px] font-mono uppercase tracking-widest" style="opacity: 0.3; ">or</span>
            <div class="flex-1 h-px" style="background: var(--theme-text); opacity: 0.1;"></div>
          </div>

          <!-- Google sign-in -->
          <button
            @click="doGoogleLogin"
            :disabled="authLoading"
	            class="w-full border border-theme-border py-3 font-mono text-[9px] tracking-[0.4em] uppercase transition-all duration-300 flex items-center justify-center space-x-3 disabled:opacity-40 text-theme-text opacity-60 hover:opacity-100 hover:border-theme-text"
          >
            <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>{{ locale === 'ru' ? 'Продолжить_С_Google' : 'Continue_With_Google' }}</span>
          </button>
        </div>

        <!-- ── BOOT PROGRESS ── -->
        <div v-else-if="phase === 'boot'" key="boot" class="w-full flex flex-col items-center space-y-6">
          <div class="w-full flex flex-col space-y-3">
            <div class="flex justify-between items-end">
              <span class="text-[9px] font-mono uppercase tracking-widest" style="opacity: 0.4; ">System_Initialization</span>
              <span class="text-[9px] font-mono font-black" >{{ Math.floor(progress) }}%</span>
            </div>
            <div class="h-px w-full relative overflow-hidden" style="background: var(--theme-text); opacity: 0.1;">
              <div
                class="absolute top-0 left-0 h-full transition-all duration-300"
                style="background: var(--theme-text); opacity: 1;"
                :style="{ width: `${progress}%` }"
              ></div>
              <div class="absolute inset-y-0 left-0 w-8 blur-sm animate-scan" style="background: var(--theme-text); opacity: 0.4;"></div>
            </div>
          </div>

          <div class="h-8 overflow-hidden relative w-full">
            <Transition name="log-slide" mode="out-in">
              <p :key="currentLog" class="text-center lowercase italic text-[10px] font-mono" style="opacity: 0.2; ">
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
          <p class="text-[8px] font-mono lowercase italic" style="opacity: 0.2; ">Operator authenticated. System ready.</p>
        </div>

      </Transition>
    </div>

    <!-- Bottom Telemetry -->
    <div class="fixed bottom-10 left-0 right-0 px-12 flex justify-between items-center pointer-events-none">
      <span class="text-[8px] font-mono uppercase tracking-widest" style="opacity: 0.2; ">ID: {{ appVersion }} // VOSHE COMPANY D.O.O</span>
      <span class="text-[8px] font-mono uppercase tracking-widest" style="opacity: 0.2; ">ALPHA VERSION</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import EtherealBackground from '~/widgets/style/ui/EtherealBackground.vue'
import tauriConfig from '../../../../src-tauri/tauri.conf.json'
import { useI18n } from '~/shared/i18n/useI18n'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { useAuthStore } from '~/entities/user/auth.store'
import { auth as firebaseAuth, db } from '~/shared/firebase.client'
import { useThemeStore } from '~/features/store/useTheme'
import DesignVignette from '~/widgets/style/ui/DesignVignette.vue'

const appVersion = String(tauriConfig.version || '0.0.0')

const emit = defineEmits(['initiate'])
const { locale, setLocale } = useI18n()

const themeStore = useThemeStore()
const isDark = computed(() => themeStore.settings.isDark)
const primaryButtonStyle = computed(() => ({
  background: 'var(--theme-text)',
  color: 'var(--theme-bg)'
}))
const activeTabStyle = computed(() => ({
  ...primaryButtonStyle.value,
  fontWeight: '900'
}))

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)
const isAuthResolving = computed(() => phase.value === 'auth' && !authStore.authReady)
const shouldShowAuthLanguageSwitch = computed(() => (
  phase.value === 'auth' &&
  authStore.authReady &&
  !isAuthenticated.value
))

// ── Auth state ──
const authTab = ref<'login' | 'register'>('login')
const authEmail = ref('')
const authPassword = ref('')
const authPasswordConfirm = ref('')
const authError = ref<string | null>(null)
const authLoading = ref(false)

// ── Phase ──
const phase = ref<'auth' | 'boot' | 'ready'>('auth')

import { useAppBootStore } from '~/features/store/useAppBoot'
import { getCachedAvatarUrl } from '~/entities/user/model/user-avatar'

const appBootStore = useAppBootStore()

// ── Boot progress ──
const progress = computed(() => appBootStore.bootProgress)
const currentLog = computed(() => appBootStore.currentLog)

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
  const userRef = doc(db, 'users', user.uid)
  const snap = await getDoc(userRef)
  if (!snap.exists()) {
    await setDoc(userRef, {
      displayName: user.displayName || user.email,
      email: user.email,
      photoURL: user.photoURL || null,
      role: 'member',
      joinedAt: serverTimestamp()
    })
  }
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
      const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link')
      const clientId = '79915571390-v910mjv94lmgod0nrcu1vj9ctb3tdm22.apps.googleusercontent.com'
      const reversedClientId = 'com.googleusercontent.apps.79915571390-v910mjv94lmgod0nrcu1vj9ctb3tdm22'
      const redirectUri = `${reversedClientId}:/oauth2callback`
      const scope = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid'

      const rand = (n: number) => { let s = ''; const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'; for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)]; return s }
      const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const codeVerifier = rand(128)
      const codeChallenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier)))
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}&code_challenge=${codeChallenge}&code_challenge_method=S256`

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

            if (error) {
              fail(new Error(`Google Error: ${error}`))
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
  if (isAuthenticated.value) startBoot()
})
</script>

<style scoped>
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
