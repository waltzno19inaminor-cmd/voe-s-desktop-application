<template>
  <div class="h-full flex flex-col p-12 max-w-7xl mx-auto space-y-12 relative">
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

    <!-- 1. Header / Global Status -->
    <header class="flex justify-between items-start z-[200] relative">
      <div class="flex flex-col space-y-2">
        <ExHeading level="h1" variant="cinematic" class="!text-3xl">{{ t('dashboard.title') }}</ExHeading>
        <div class="flex items-center space-x-4">
           <ExTag>v{{ pkg.version.toUpperCase().replace('-', '_') }}</ExTag>
           <ExTag v-if="patchBadge">HOTFIX_{{ patchBadge }}</ExTag>
         
        </div>
      </div>

      <div class="flex items-center space-x-12">
        <!-- Language Selector -->
        <div class="flex items-center space-x-4 border-r border-theme-border pr-8">
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
        <div class="flex items-center space-x-6">
          <!-- User Identity (clickable → sign-out popover) -->
          <div class="relative" ref="identityRef">
            <button @click="toggleMenu" class="focus:outline-none cursor-pointer">
              <ExIdentity
                :name="displayName"
                :avatar-url="authStore.user?.photoURL ?? undefined"
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

          <!-- Theme Toggle -->
          <!-- <button
            class="w-5 opacity-30 hover:opacity-100 transition-all duration-300"
            @click="themeStore.toggleDark"
          >
            <template v-if="themeStore.isReady">
              <img
                alt="Toggle Theme"
                :src="themeStore.settings.isDark ? '/assets/light-mode-switcher.svg' : '/assets/dark-mode-switcher.svg'"
                class="block"
              />
            </template>
          </button> -->
        </div>

      </div>
    </header>

    <!-- 2. The Module Grid (Central Hub) -->
    <main class="flex-grow grid grid-cols-1 md:grid-cols-3 gap-8 z-10">
      <div v-for="module in dashboardModules" :key="module.id" class="relative group h-full ">
        <button 
          @click="$emit('navigate', module.id)"
          class="w-full h-full text-left flex flex-col p-8 border border-theme-border bg-theme-bg/40 backdrop-blur-sm transition-all duration-700 hover:border-theme-text/40 hover:bg-theme-bg/60 relative overflow-hidden"
        >
          <!-- Background Accents -->
          <div class="absolute -top-12 -right-12 w-32 h-32 border border-theme-text opacity-60 rotate-45 group-hover:rotate-[135deg] transition-transform duration-1000"></div>
          
          <div class="flex flex-col h-full space-y-8 relative z-10">
            <div class="flex justify-between items-start">
               <div class="w-10 h-10 border border-theme-border flex items-center justify-center group-hover:border-theme-text transition-colors">
                  <ExText variant="telemetry" class="!opacity-100 text-[#2C3E50]/45 dark:text-white/40 group-hover:text-[#2C3E50] dark:group-hover:text-white/90">{{ module.code }}</ExText>
               </div>
               <div class="w-1.5 h-1.5 bg-theme-accent rotate-45 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>

            <div class="flex flex-col space-y-2">
              <ExHeading level="h3" variant="cinematic" class="!text-xl !opacity-100 text-[#2C3E50]/60 dark:text-white/50 group-hover:text-[#2C3E50] dark:group-hover:text-white/90 transition-all duration-700 whitespace-pre-line">{{ t(module.titleKey) }}</ExHeading>
              <ExText variant="small" class="!opacity-100 leading-relaxed text-[#2C3E50]/45 dark:text-white/40">{{ t(module.descriptionKey) }}</ExText>
            </div>

            <div class="mt-auto pt-6 border-t border-theme-border opacity-0 group-hover:opacity-100 transition-opacity duration-700">
               <div class="flex items-center space-x-2">
                  <div class="w-1 h-1 bg-theme-text"></div>
                  <ExText variant="telemetry" class="!opacity-100 tracking-widest text-[#2C3E50]/45 dark:text-white/45">{{ t('dashboard.ui.accessProtocol') }}</ExText>
               </div>
            </div>
          </div>
          
          <!-- Hover Edge Slide -->
          <div class="absolute bottom-0 left-0 w-full h-0.5 bg-theme-text transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left"></div>
        </button>
      </div>
    </main>

    <!-- 3. Bottom Utility Bar -->
    <footer class="flex justify-between items-center z-10 opacity-100 pt-8 border-t border-theme-border">
      
      <div class="flex space-x-4">
         <div v-for="i in 4" :key="i" class="w-1 h-1 border border-theme-text rotate-45"></div>
      </div>
    </footer>

    <ExProfileOverlay :open="showProfileOverlay" @close="closeProfileOverlay" />

    <!-- Premium Unlocked Overlay -->
    <Teleport to="body">
      <Transition name="premium-modal">
        <div v-if="showPremiumUnlocked" 
             class="fixed inset-0 z-[10050] flex flex-col items-center justify-center p-8 backdrop-blur-xl bg-white/30 dark:bg-black/60 transition-all duration-700"
             @click.self="dismissPremiumUnlocked">
          
          <div class="w-full max-w-lg transform scale-100 transition-all duration-700">
            <ExPanel 
              :title="locale === 'ru' ? 'СИСТЕМНОЕ УВЕДОМЛЕНИЕ' : 'SYSTEM NOTIFICATION'" 
              :telemetry="locale === 'ru' ? 'ПРИВИЛЕГИИ' : 'PRIVILEGES'"
              variant="standard"
            >
              <div class="flex flex-col items-center py-8">
                <!-- Diamond Icon -->
                <div class="relative w-4 h-4 mb-8">
                  <div class="absolute inset-0 bg-emerald-500 rotate-45 animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.6)]"></div>
                  <div class="absolute inset-1 nier-bg-panel rotate-45"></div>
                  <div class="absolute inset-[3px] bg-emerald-500 rotate-45"></div>
                </div>

                <ExHeading level="h2" variant="cinematic" class="!text-2xl mb-6 text-center text-emerald-600 dark:text-emerald-400">
                  {{ locale === 'ru' ? 'ДОСТУП ПРЕДОСТАВЛЕН' : 'ACCESS GRANTED' }}
                </ExHeading>
                
                <div class="relative h-px w-24 bg-gradient-to-r from-transparent via-black/20 dark:via-white/20 to-transparent mb-8"></div>

                <ExText class="text-center mb-12 !text-[11px] !leading-[2.5] uppercase tracking-widest text-black/70 dark:text-white/60">
                  <span v-if="locale === 'ru'">
                    ПРОТОКОЛ АУТЕНТИФИКАЦИИ УСПЕШНО ЗАВЕРШЕН.<br/><br/>
                    <span class="nier-text-primary font-bold tracking-[0.4em]">ПРЕМИУМ-СТАТУС ПОДТВЕРЖДЕН.</span><br/><br/>
                    ПОЛНЫЙ ДОСТУП К МАТРИЦЕ ГЕНЕЗИСА И ПРОДВИНУТОЙ АНАЛИТИКЕ ДНЕВНИКА АКТИВИРОВАН.
                  </span>
                  <span v-else>
                    AUTHENTICATION PROTOCOL SUCCESSFULLY COMPLETED.<br/><br/>
                    <span class="nier-text-primary font-bold tracking-[0.4em]">PREMIUM STATUS CONFIRMED.</span><br/><br/>
                    FULL ACCESS TO THE GENESIS MATRIX AND ADVANCED DIARY ANALYTICS HAS BEEN ACTIVATED.
                  </span>
                </ExText>
                
                <ExButton class="w-full" variant="tactical" @click="dismissPremiumUnlocked">
                  {{ locale === 'ru' ? 'ПОДТВЕРДИТЬ' : 'CONFIRM' }}
                </ExButton>
              </div>
            </ExPanel>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { getAuth, signOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '~/shared/firebase.client'
import { open } from '@tauri-apps/plugin-shell'
import { invoke } from '@tauri-apps/api/core'
import { useI18n } from '~/shared/i18n/useI18n'
import pkg from '../../../../package.json'
import ExHeading from "~/shared/ui/ExHeading.vue"
import ExText from "~/shared/ui/ExText.vue"
import ExTag from "~/shared/ui/ExTag.vue"
import ExIdentity from "~/shared/ui/ExIdentity.vue"
import ExPanel from "~/shared/ui/ExPanel.vue"
import ExButton from "~/shared/ui/ExButton.vue"
import { useAuthStore } from '~/entities/user/auth.store'
import { useThemeStore } from '~/features/store/useTheme'
import ExProfileOverlay from '~/widgets/profile/ui/ExProfileOverlay.vue'

const emit = defineEmits(['navigate', 'signed-out'])

const { t, locale, setLocale } = useI18n()
const authStore = useAuthStore()
const themeStore = useThemeStore()

// User menu
const userMenuOpen = ref(false)
const identityRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const menuStyle = ref<Record<string, string>>({})
const showProfileOverlay = ref(false)

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
const patchState = ref<{ patchLevel?: string | null; patchId?: string | null } | null>(null)
const patchBadge = computed(() => patchState.value?.patchLevel?.replace(/^hotfix\./i, '') || '')
let unsubUpdate: any = null
let unsubUser: any = null
const showPremiumUnlocked = ref(false)
const premiumUpdatedAt = ref<number | null>(null)

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
  document.addEventListener('mousedown', handleOutsideClick)

  invoke('patch_get_state')
    .then((state: any) => {
      patchState.value = state
    })
    .catch((err) => {
      console.debug('Patch state unavailable outside Tauri runtime:', err)
    })


  unsubUpdate = onSnapshot(doc(db, 'app_settings', 'update_notification'), (docSnap) => {
    if (docSnap.exists()) {
      updateNotification.value = docSnap.data() as any
    }
  })

  if (authStore.user?.uid) {
    const userId = authStore.user.uid
    unsubUser = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        if (data.type === 'premium' || data.role === 'premium') {
          let fsUpdatedAt = 0
          if (data.updatedAt) {
            if (typeof data.updatedAt.toMillis === 'function') {
              fsUpdatedAt = data.updatedAt.toMillis()
            } else if (data.updatedAt instanceof Date) {
              fsUpdatedAt = data.updatedAt.getTime()
            } else if (typeof data.updatedAt === 'number') {
              fsUpdatedAt = data.updatedAt
            } else if (typeof data.updatedAt === 'string') {
              fsUpdatedAt = new Date(data.updatedAt).getTime()
            }
          }
          
          if (fsUpdatedAt > 0) {
            const ackKey = `premium_ack_time_${userId}`
            const localAck = localStorage.getItem(ackKey)
            
            if (localAck !== String(fsUpdatedAt)) {
              premiumUpdatedAt.value = fsUpdatedAt
              showPremiumUnlocked.value = true
            }
          }
        }
      }
    })
  }
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
  if (unsubUpdate) unsubUpdate()
  if (unsubUser) unsubUser()
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
    id: 'genesis', 
    code: 'G3', 
    titleKey: 'dashboard.modules.genesis_protocol', 
    descriptionKey: 'dashboard.descriptions.genesis_protocol' 
  }
]

// Premium Unlocked Logic
const dismissPremiumUnlocked = () => {
  if (authStore.user && premiumUpdatedAt.value) {
    const ackKey = `premium_ack_time_${authStore.user.uid}`
    localStorage.setItem(ackKey, String(premiumUpdatedAt.value))
  }
  showPremiumUnlocked.value = false
}

</script>

<style scoped>
.menu-drop-enter-active,
.menu-drop-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.menu-drop-enter-from,
.menu-drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.premium-modal-enter-active,
.premium-modal-leave-active {
  transition: opacity 0.8s ease, backdrop-filter 0.8s ease;
}
.premium-modal-enter-active > div,
.premium-modal-leave-active > div {
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.premium-modal-enter-from,
.premium-modal-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
}
.premium-modal-enter-from > div,
.premium-modal-leave-to > div {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}
</style>
