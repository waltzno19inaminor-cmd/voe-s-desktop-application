<template>
  <div
    class="app-shell relative h-full min-h-full bg-center bg-cover transition-colors duration-500"
    :style="{ backgroundColor: 'var(--theme-bg)' }"
  >
    <EtherealBackground
      :is-dark="isDark"
      :is-assembled="true"
      :show-bloom="false"
    />

    <!-- Ambient Background Layer -->
    <div 
      v-if="themeStore.settings.isImageBg && themeStore.settings.bgImage"
      class="fixed inset-0 pointer-events-none transition-all duration-[800ms] ease-in-out bg-center bg-cover"
      :style="{ 
        backgroundImage: `url('${themeStore.settings.bgImage}')`, 
        filter: `blur(${themeStore.settings.bgImageBlur}px) brightness(${themeStore.settings.bgImageBrightness / 100})`,
        opacity: themeStore.settings.bgImageOpacity / 100,
        transform: `scale(${themeStore.settings.bgImageZoom / 100})`,
        zIndex: 0
      }"
    ></div>

    <div class="relative z-10 h-full min-h-0 box-border flex flex-col transition-all duration-300" :class="isFullscreen || route.meta.hideChrome ? '' : 'pt-10'">
      <CustomTitleBar v-if="!route.meta.hideChrome" />
      <main class="flex-1 min-h-0 overflow-hidden">
        <NuxtPage />
      </main>
    </div>
    
 

    <Transition name="settings">
      <SettingsModal v-if="isSettingsOpen" />
    </Transition>
  </div>
</template>

<script setup>
import { computed, ref, watchEffect, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '~/entities/user/auth.store'
import { useAuthInit } from '~/features/auth/useAuthInit'
import { useRoute } from 'vue-router'
import { useThemeStore } from '~/features/store/useTheme'
import SettingsModal from '~/widgets/settings/ui/SettingsModal.vue'
import { isSettingsOpen } from '~/widgets/settings/model/useSettings'
import CustomTitleBar from '~/widgets/titlebar/ui/CustomTitleBar.vue'
import { useBoardStore } from '~/features/store/useBoard'
import EtherealBackground from '~/widgets/style/ui/EtherealBackground.vue'

const route = useRoute()
const auth = useAuthStore()
const themeStore = useThemeStore()
const boardStore = useBoardStore()
const isDark = computed(() => themeStore.settings.isDark)
const isFullscreen = useState('isFullscreen', () => false)

// Initialize theme
themeStore.init()

const updaterDone = ref(false)

useAuthInit()

watchEffect(() => {
  if (!auth.authReady) return
  
  if (auth.isAuthenticated) {
    boardStore.loadBoardFromLocal()
  }

  if (route.meta.public) return

  // if (!auth.isAuthenticated) {
  //   navigateTo({
  //     path: '/login',
  //     query: { redirect: route.fullPath }
  //   })
  // }
})

const isEditableTarget = (target) => {
  if (!(target instanceof HTMLElement)) return false

  const editableRoot = target.closest(
    'input, textarea, select, option, [contenteditable="true"], [data-text-editable="true"], .select-text'
  )

  if (!editableRoot) return false

  if (editableRoot instanceof HTMLInputElement) {
    return /^(text|password|search|email|number|tel|url)$/i.test(editableRoot.type)
  }

  return true
}

// Disable backspace navigation globally
const handleGlobalBackspace = (event) => {
  if (event.key === 'Backspace') {
    if (!isEditableTarget(event.target)) {
      event.preventDefault();
    }
  }
};

// Disable context menu globally to hide browser options like Reload, Back, etc.
const handleGlobalContextMenu = (event) => {
  // Allow context menu only if the user is holding Shift (optional developer override)
  if (!event.shiftKey) {
    event.preventDefault();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleGlobalBackspace);
  window.addEventListener('contextmenu', handleGlobalContextMenu);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalBackspace);
  window.removeEventListener('contextmenu', handleGlobalContextMenu);
});
</script>

<style>
:root {
  --header-bg: transparent;
  --footer-bg: transparent;
  --content-bg: #FFFFFF;
  --theme-bg: #FFFFFF;
  --theme-bg-rgb: 255 255 255;
  --theme-panel: rgba(255, 255, 255, 0.92);
  --theme-panel-rgb: 255 255 255;
  --theme-text: #2c2c2a;
  --theme-text-rgb: 44 44 42;
  --theme-muted: rgba(44, 44, 42, 0.58);
  --theme-border: rgba(44, 44, 42, 0.12);
  --theme-border-rgb: 44 44 42;
  --theme-border-strong: rgba(44, 44, 42, 0.28);
  --theme-accent: #8d7f61;
  --theme-accent-rgb: 141 127 97;
  --theme-grid-dot: rgba(44, 44, 42, 0.24);
  --theme-tooltip-bg: #F9F9F9;
  --theme-tooltip-text: #2c2c2a;
  --theme-tooltip-muted: rgba(44, 44, 42, 0.62);
  --theme-tooltip-border: rgba(44, 44, 42, 0.18);
  --text-heading: #050505;
  --text-description: rgba(18, 18, 18, 0.45);
  --icon-color-mode: black;
}

html.dark {
  --header-bg: transparent;
  --footer-bg: transparent;
  --content-bg: #000000;
  --theme-bg: #000000;
  --theme-bg-rgb: 0 0 0;
  --theme-panel: rgba(5, 5, 5, 0.92);
  --theme-panel-rgb: 5 5 5;
  --theme-text: #F9F6F0;
  --theme-text-rgb: 249 246 240;
  --theme-muted: rgba(249, 246, 240, 0.56);
  --theme-border: rgba(249, 246, 240, 0.12);
  --theme-border-rgb: 249 246 240;
  --theme-border-strong: rgba(249, 246, 240, 0.28);
  --theme-accent: #c7b98f;
  --theme-accent-rgb: 199 185 143;
  --theme-grid-dot: rgba(249, 246, 240, 0.16);
  --theme-tooltip-bg: #0a0a0a;
  --theme-tooltip-text: #F9F6F0;
  --theme-tooltip-muted: rgba(249, 246, 240, 0.62);
  --theme-tooltip-border: rgba(249, 246, 240, 0.18);
  --text-heading: rgba(255, 255, 255, 0.95);
  --text-description: rgba(255, 255, 255, 0.45);
  --icon-color-mode: white;
}

* {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body,
body * {
  -webkit-user-select: none;
  user-select: none;
}

input,
textarea,
select,
option,
[contenteditable="true"],
[contenteditable="true"] *,
[data-text-editable="true"],
[data-text-editable="true"] *,
.select-text,
.select-text * {
  -webkit-user-select: text;
  user-select: text;
}

h1, h2, h3, h4, h5, h6 {
  color: var(--text-heading);
  transition: color 0.5s ease;
}

::placeholder {
  color: var(--text-description);
  opacity: 0.6;
}

html, body, #__nuxt {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background-color: var(--theme-bg);
  color: var(--text-description);
  transition: color 0.5s ease;
  overflow: hidden; /* Prevent accidental document-level scrolling */
}

html.dark body {
  background-color: var(--theme-bg);
}

.app-shell {
  isolation: isolate;
  background-color: var(--theme-bg);
}

*::-webkit-scrollbar {
  width: 0px;
  height: 0px;
}

* {
  scrollbar-width: none;
}

* {
  -ms-overflow-style: none;
}

.theme-surface,
.ethereal-void {
  background-color: var(--theme-bg);
  color: var(--theme-text);
  transition: background-color 0.5s ease, color 0.5s ease, border-color 0.5s ease;
}

.theme-panel,
.nier-bg-panel {
  background-color: var(--theme-panel);
}

.theme-panel-backdrop {
  background-color: var(--theme-panel);
}

.theme-grid,
.grid-light,
.grid-dark {
  background-image: radial-gradient(var(--theme-grid-dot) 1px, transparent 1px);
  background-size: 24px 24px;
  background-position: center;
}

.bg-theme-bg { background-color: var(--theme-bg); }
.bg-theme-text { background-color: var(--theme-text); }
.bg-theme-panel { background-color: var(--theme-panel); }
.text-theme-text { color: var(--theme-text); }
.text-theme-accent { color: var(--theme-accent); }
.border-theme-border { border-color: var(--theme-border); }
.border-theme-text { border-color: var(--theme-text); }
.bg-theme-accent { background-color: var(--theme-accent); }

.nier-text-primary {
  color: var(--theme-text);
}

.nier-text-secondary {
  color: var(--theme-muted);
}

.nier-text-inverted {
  color: var(--theme-bg);
}

.nier-bg-primary {
  background-color: var(--theme-bg);
}

.nier-bg-inverted {
  background-color: var(--theme-text);
}

.nier-border-primary {
  border-color: var(--theme-border);
}

.nier-bg-inverted.nier-text-primary,
.nier-bg-inverted .nier-text-primary {
  color: var(--theme-bg);
}

.theme-tooltip-panel {
  background-color: var(--theme-tooltip-bg);
  border-color: var(--theme-tooltip-border);
  color: var(--theme-tooltip-text);
}

.theme-tooltip-light {
  --theme-tooltip-bg: #F9F9F9;
  --theme-tooltip-text: #2c2c2a;
  --theme-tooltip-muted: rgba(44, 44, 42, 0.62);
  --theme-tooltip-border: rgba(44, 44, 42, 0.18);
}

.theme-tooltip-dark {
  --theme-tooltip-bg: #0a0a0a;
  --theme-tooltip-text: #F9F6F0;
  --theme-tooltip-muted: rgba(249, 246, 240, 0.62);
  --theme-tooltip-border: rgba(249, 246, 240, 0.18);
}

.theme-tooltip-panel :where(h1, h2, h3, h4, h5, h6),
.theme-tooltip-panel :where(
  .nier-text-primary,
  .text-theme-text,
  .text-black,
  .text-white,
  [class~="dark:text-black"],
  [class~="dark:text-white"]
) {
  color: var(--theme-tooltip-text) !important;
}

.theme-tooltip-panel :where(
  .nier-text-secondary,
  [class*="text-black/"],
  [class*="text-white/"],
  [class*="text-theme-text/"]
) {
  color: var(--theme-tooltip-muted) !important;
}

.theme-tooltip-panel :where(.nier-border-primary) {
  border-color: var(--theme-tooltip-border) !important;
}

.theme-tooltip-stem {
  background-color: var(--theme-tooltip-bg);
  border-color: var(--theme-tooltip-border);
}

.theme-tooltip-divider {
  border-color: var(--theme-tooltip-border);
}

/* Hide Native Number Spinners */
.hide-spinners::-webkit-outer-spin-button,
.hide-spinners::-webkit-inner-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}
.hide-spinners {
  -moz-appearance: textfield;
  appearance: textfield;
}

.settings-enter-active,
.settings-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.settings-enter-from,
.settings-leave-to {
  opacity: 0;
  filter: blur(8px);
  transform: translateY(15px);
}
</style>
