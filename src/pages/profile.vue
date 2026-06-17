<template>
  <div class="ethereal-void h-screen relative overflow-y-auto transition-all duration-1000"
       :class="[isDark ? 'is-dark dark theme-dark' : 'theme-light']">
    <EtherealBackground :is-dark="isDark" :is-assembled="true" :show-bloom="false" />
    <DesignVignette :is-dark="isDark" />

    <div class="relative z-10 min-h-screen p-6 lg:p-10 text-theme-text">
      <div class="max-w-6xl mx-auto space-y-8">
        <header class="border-b border-theme-border pb-6"></header>

        <div class="grid grid-cols-1 lg:grid-cols-[240px_1fr] border border-theme-border bg-theme-bg shadow-[0_20px_60px_rgba(0,0,0,0.14)] overflow-hidden min-h-[720px]">
          <aside class="border-b lg:border-b-0 lg:border-r border-theme-border p-6 lg:p-8 bg-theme-text/[0.015]">
            <div class="flex items-center gap-3 pb-6 border-b border-theme-border">
              <div class="w-10 h-10 rounded-full border border-theme-border bg-theme-text text-theme-bg flex items-center justify-center font-serif italic text-lg">
                {{ profileInitial }}
              </div>
              <div class="flex flex-col">
                <span class="text-[9px] font-mono uppercase tracking-[0.35em] opacity-35">Profile</span>
                <span class="text-[10px] font-mono uppercase tracking-[0.25em] opacity-50">Settings</span>
              </div>
            </div>

            <nav class="mt-6 flex flex-col gap-2">
              <button
                v-for="tab in profileTabs"
                :key="tab.key"
                type="button"
                @click="activeProfileTab = tab.key"
                class="flex items-center justify-between px-4 py-3 border text-left transition-colors duration-300 text-theme-text"
                :class="activeProfileTab === tab.key ? 'border-theme-text bg-theme-text/[0.06] shadow-[inset_3px_0_0_var(--theme-text)]' : 'border-transparent bg-transparent hover:border-theme-border hover:bg-theme-text/[0.02]'"
              >
                <span class="text-[10px] font-mono uppercase tracking-[0.3em] font-black text-theme-text">{{ tab.label }}</span>
                <span class="text-[8px] font-mono uppercase tracking-[0.22em] text-theme-text" :class="activeProfileTab === tab.key ? 'opacity-60' : 'opacity-35'">
                  {{ tab.note }}
                </span>
              </button>
            </nav>

            <div class="mt-8 pt-6 border-t border-theme-border space-y-2">
              <div class="text-[8px] font-mono uppercase tracking-[0.35em] opacity-30">Signed in as</div>
              <div class="text-[10px] font-mono tracking-[0.12em] text-theme-text break-all">
                {{ profileEmail }}
              </div>
            </div>
          </aside>

          <main class="p-6 lg:p-10 min-h-[720px]">
            <div v-if="activeProfileTab === 'profile'" class="max-w-2xl space-y-8">
              <div class="space-y-2">
                <h2 class="text-3xl lg:text-4xl font-serif tracking-[0.05em] text-theme-text leading-tight">Personal details</h2>
                <p class="text-sm leading-7 opacity-65 text-theme-text max-w-lg">
                  Keep the core identity fields visible and unobtrusive.
                </p>
              </div>

              <div class="space-y-5">
                <div class="space-y-2">
                  <span class="text-[9px] font-mono uppercase tracking-[0.35em] opacity-35">Display name</span>
                  <div class="px-4 py-3 border border-theme-border bg-theme-bg font-mono tracking-[0.12em] text-theme-text">
                    {{ profileDisplayName }}
                  </div>
                </div>

                <div class="space-y-2">
                  <span class="text-[9px] font-mono uppercase tracking-[0.35em] opacity-35">Email address</span>
                  <div class="px-4 py-3 border border-theme-border bg-theme-bg font-mono tracking-[0.08em] text-theme-text break-all">
                    {{ profileEmail }}
                  </div>
                </div>

                <div class="space-y-2">
                  <span class="text-[9px] font-mono uppercase tracking-[0.35em] opacity-35">Description</span>
                  <textarea
                    v-model="profileDescriptionDraft"
                    rows="6"
                    placeholder="Short description about the user"
                    class="w-full px-4 py-3 border border-theme-border bg-theme-bg text-[13px] leading-7 text-theme-text placeholder:opacity-25 focus:outline-none focus:border-theme-text resize-none"
                  ></textarea>
                </div>
              </div>
            </div>

            <div v-else class="max-w-2xl space-y-8">
              <div class="space-y-2">
                <h2 class="text-3xl lg:text-4xl font-serif tracking-[0.05em] text-theme-text leading-tight">App theme</h2>
                <p class="text-sm leading-7 opacity-65 text-theme-text max-w-lg">
                  Minimal theme controls with a few restrained accent choices.
                </p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  v-for="mode in appearanceModes"
                  :key="mode.key"
                  type="button"
                  @click="setAppearanceMode(mode.key)"
                  class="p-4 border text-left transition-colors duration-300 text-theme-text cursor-pointer"
                  :class="mode.active ? 'border-theme-text bg-theme-text/[0.06] shadow-[inset_3px_0_0_var(--theme-text)]' : 'border-theme-border bg-theme-bg hover:border-theme-text/40'"
                >
                  <span class="block text-[9px] font-mono uppercase tracking-[0.35em] font-black text-theme-text">{{ mode.label }}</span>
                  <span class="block text-[8px] font-mono uppercase tracking-[0.25em] mt-2 text-theme-text" :class="mode.active ? 'opacity-60' : 'opacity-40'">
                    {{ mode.note }}
                  </span>
                </button>
              </div>

              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-[9px] font-mono uppercase tracking-[0.35em] opacity-40">Accent</span>
                  <span class="text-[8px] font-mono uppercase tracking-[0.25em] opacity-30">Presets</span>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div v-for="tone in appearanceTones" :key="tone.name" class="flex flex-col gap-2">
                    <div class="h-12 border border-theme-border bg-theme-bg" :style="{ backgroundColor: tone.value }"></div>
                    <span class="text-[8px] font-mono uppercase tracking-[0.18em] opacity-50">{{ tone.name }}</span>
                  </div>
                </div>
              </div>

              <div class="space-y-4 pt-2">
                <div class="flex items-center justify-between">
                  <span class="text-[9px] font-mono uppercase tracking-[0.35em] opacity-40">Background image</span>
                  <span class="text-[8px] font-mono uppercase tracking-[0.25em] opacity-30">Upload</span>
                </div>

                <label class="block border border-theme-border bg-theme-bg px-4 py-4 cursor-pointer hover:border-theme-text/40 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleBackgroundUpload"
                  />
                  <div class="flex items-center justify-between gap-4">
                    <div class="flex flex-col space-y-1 min-w-0">
                      <span class="text-[10px] font-mono uppercase tracking-[0.3em] text-theme-text font-black">Choose image</span>
                      <span class="text-[8px] font-mono uppercase tracking-[0.25em] opacity-35 truncate">
                        {{ backgroundFileName || 'No file selected' }}
                      </span>
                    </div>
                    <span class="px-3 py-1 border border-theme-border text-[8px] font-mono uppercase tracking-[0.25em] opacity-60 shrink-0">
                      Browse
                    </span>
                  </div>
                </label>

                <div class="border border-theme-border overflow-hidden bg-theme-bg">
                  <div class="px-4 py-3 border-b border-theme-border flex items-center justify-between">
                    <span class="text-[9px] font-mono uppercase tracking-[0.35em] opacity-40">Preview</span>
                    <span class="text-[8px] font-mono uppercase tracking-[0.25em] opacity-30">Wallpaper</span>
                  </div>
                  <div class="h-28 bg-cover bg-center bg-theme-bg" :style="backgroundImageStyle">
                    <div class="h-full w-full bg-theme-bg/35"></div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'
import EtherealBackground from '~/widgets/style/ui/EtherealBackground.vue'
import DesignVignette from '~/widgets/style/ui/DesignVignette.vue'
import { useAuthStore } from '~/entities/user/auth.store'
import { useThemeStore } from '~/features/store/useTheme'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const isDark = computed(() => themeStore.settings.isDark)

const profileDisplayName = computed(() => authStore.user?.displayName?.trim() || 'Operator_0x4F')
const profileEmail = computed(() => authStore.user?.email?.trim() || 'operator@genesis.app')
const profileInitial = computed(() => (profileDisplayName.value[0] || 'O').toUpperCase())

const activeProfileTab = ref<'profile' | 'appearance'>('profile')

const profileTabs = [
  { key: 'profile', label: 'Profile', note: 'Core' },
  { key: 'appearance', label: 'Appearance', note: 'Theme' }
] as const

const profileDescriptionDraft = ref(
  authStore.user?.displayName
    ? `${authStore.user.displayName} keeps the profile minimal, readable, and aligned with the app's overall tone.`
    : 'Keep the profile minimal, readable, and aligned with the app\'s overall tone.'
)

const appearanceModes = computed(() => {
  const currentMode = themeStore.settings.themeMode || (themeStore.settings.isDark ? 'dark' : 'light')
  return [
    {
      key: 'dark' as const,
      label: 'Dark',
      note: currentMode === 'dark' ? 'Active' : 'Available',
      active: currentMode === 'dark'
    },
    {
      key: 'light' as const,
      label: 'Light',
      note: currentMode === 'light' ? 'Active' : 'Available',
      active: currentMode === 'light'
    },
    {
      key: 'system' as const,
      label: 'System',
      note: currentMode === 'system' ? 'Active' : 'Auto',
      active: currentMode === 'system'
    }
  ]
})

function setAppearanceMode(mode: 'light' | 'dark' | 'system') {
  themeStore.setTheme({ themeMode: mode })
}

const appearanceTones = [
  { name: 'Ink', value: 'var(--theme-text)' },
  { name: 'Paper', value: 'var(--theme-bg)' },
  { name: 'Sky', value: 'rgba(56, 189, 248, 0.7)' },
  { name: 'Mint', value: 'rgba(16, 185, 129, 0.7)' }
]

const backgroundFileName = ref('')

const backgroundImageStyle = computed(() => ({
  backgroundImage: themeStore.settings.bgImage ? `url(${themeStore.settings.bgImage})` : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0))'
}))

const handleBackgroundUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const base64 = e.target?.result as string
    themeStore.setTheme({
      bgImage: base64,
      isImageBg: true,
      themeName: 'Custom'
    })
    backgroundFileName.value = file.name
  }
  reader.readAsDataURL(file)
}
</script>
