<template>
  <Teleport to="body">
    <Transition name="profile-overlay">
      <div
        v-if="open"
        class="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-black/45"
        @click.self="emit('close')"
      >
        <ExPanel
          variant="light"
          noPadding
          class="!w-full !max-w-6xl !h-[74vh] !overflow-visible nier-border-primary nier-text-primary"
        >
          <button
            @click="emit('close')"
            class="absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-40 bg-theme-bg dark:bg-[#070707] border-t border-r border-b border-black/20 dark:border-white/20 flex items-center justify-center group/close-tab cursor-pointer hover:bg-theme-surface dark:hover:bg-[#111] transition-colors z-[100]"
          >
            <div class="w-[1px] h-16 bg-black/10 dark:bg-white/10 group-hover/close-tab:bg-black/40 dark:group-hover/close-tab:bg-white/40 transition-all duration-300"></div>
            <span class="absolute text-[7px] font-mono tracking-[0.4em] uppercase text-black/10 dark:text-white/10 group-hover/close-tab:text-black/40 dark:group-hover/close-tab:text-white/40 rotate-90 whitespace-nowrap">{{ locale === 'ru' ? 'ЗАКРЫТЬ_ПРОФИЛЬ' : 'Close_Profile' }}</span>
          </button>

          <template #telemetry>
            <span class="sr-only">{{ locale === 'ru' ? 'Панель настроек профиля' : 'Profile settings panel' }}</span>
          </template>
          <div class="grid grid-cols-1 lg:grid-cols-[240px_1fr] h-full min-h-0 overflow-hidden">
            <aside class="h-full border-b lg:border-b-0 lg:border-r nier-border-primary p-6 lg:p-8 bg-black/[0.03] dark:bg-white/[0.03] overflow-hidden">
              <div class="flex items-center gap-3 pb-6 border-b nier-border-primary">
                <div class="w-10 h-10 rounded-full border nier-border-primary bg-white text-[#0a0a0a] flex items-center justify-center font-serif italic text-lg overflow-hidden">
                  <img
                    v-if="profileAvatarUrl"
                    :src="profileAvatarUrl"
                    alt="User avatar"
                    class="w-full h-full object-cover"
                    referrerpolicy="no-referrer"
                  />
                  <span v-else>{{ profileInitial }}</span>
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="text-[9px] font-mono uppercase tracking-[0.35em] opacity-35">{{ locale === 'ru' ? 'Профиль' : 'Profile' }}</span>
                  <span class="text-[10px] font-mono uppercase tracking-[0.25em] opacity-50 truncate">{{ locale === 'ru' ? 'Настройки' : 'Settings' }}</span>
                </div>
              </div>

              <nav class="mt-6 flex flex-col gap-2">
                <button
                  v-for="tab in profileTabs"
                  :key="tab.key"
                  type="button"
                  @click="activeTab = tab.key"
                  class="flex items-center justify-between px-4 py-3 border text-left transition-colors duration-300"
                  :class="activeTab === tab.key ? 'border-black dark:border-white bg-black/5 dark:bg-white/10 shadow-[inset_3px_0_0_rgba(0,0,0,0.9)] dark:shadow-[inset_3px_0_0_rgba(255,255,255,0.9)] nier-text-primary' : 'border-transparent bg-transparent hover:border-black/10 dark:hover:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-black/60 dark:text-white/60'"
                >
                  <span class="text-[10px] font-mono uppercase tracking-[0.3em] font-black">{{ tab.label }}</span>
                  <span class="text-[8px] font-mono uppercase tracking-[0.22em]" :class="activeTab === tab.key ? 'opacity-70' : 'opacity-35'">
                    {{ tab.note }}
                  </span>
                </button>
              </nav>

              <div class="mt-8 pt-6 border-t nier-border-primary space-y-2">
                <div class="text-[8px] font-mono uppercase tracking-[0.35em] opacity-30">{{ locale === 'ru' ? 'Вы вошли как' : 'Signed in as' }}</div>
                <div class="text-[10px] font-mono tracking-[0.12em] text-black/85 dark:text-white/85 break-all">
                  {{ profileEmail }}
                </div>
              </div>

              <div class="mt-6 pt-6 border-t nier-border-primary space-y-2">
                <div class="text-[8px] font-mono uppercase tracking-[0.35em] opacity-30">{{ locale === 'ru' ? 'Тип аккаунта' : 'Account type' }}</div>
                <div class="text-[10px] font-mono uppercase tracking-[0.25em] text-black/85 dark:text-white/85">
                  {{ profileAccountType }}
                </div>
              </div>
            </aside>

            <main class="h-full min-h-0 overflow-y-auto p-6 lg:p-10">
              <div class="flex items-start gap-6 border-b nier-border-primary pb-6 mb-8">
                <div class="space-y-2">
                  <span class="text-[10px] font-mono uppercase tracking-[0.35em] opacity-35">
                    {{ activeTab === 'profile' ? (locale === 'ru' ? 'Аккаунт' : 'Account') : (locale === 'ru' ? 'Внешний вид' : 'Appearance') }}
                  </span>
                  <h2 class="text-3xl lg:text-4xl font-serif tracking-[0.05em] nier-text-primary leading-tight">
                    {{ activeTab === 'profile' ? (locale === 'ru' ? 'Личные данные' : 'Personal details') : (locale === 'ru' ? 'Тема приложения' : 'App theme') }}
                  </h2>
                  <p class="text-sm leading-7 text-black/65 dark:text-white/65 max-w-lg">
                    {{ activeTab === 'profile' ? (locale === 'ru' ? 'Держите основные поля идентификации видимыми и ненавязчивыми.' : 'Keep the core identity fields visible and unobtrusive.') : (locale === 'ru' ? 'Минималистичное управление темой с несколькими сдержанными акцентами.' : 'Minimal theme controls with a few restrained accent choices.') }}
                  </p>
                </div>
              </div>

              <form v-if="activeTab === 'profile'" class="max-w-2xl space-y-8" @submit.prevent="saveProfile">
                <div class="space-y-5">
                  <div class="space-y-2">
                    <label for="profile-overlay-display-name" class="block text-[9px] font-mono uppercase tracking-[0.35em] opacity-35">{{ locale === 'ru' ? 'Отображаемое имя' : 'Display name' }}</label>
                    <input
                      id="profile-overlay-display-name"
                      v-model="displayName"
                      type="text"
                      autocomplete="name"
                      :placeholder="locale === 'ru' ? 'Оператор_0x4F' : 'Operator_0x4F'"
                      class="w-full px-4 py-3 border nier-border-primary bg-black/[0.03] dark:bg-white/[0.03] font-mono tracking-[0.12em] nier-text-primary placeholder:text-black/25 dark:placeholder:text-white/25 focus:outline-none focus:border-black/50 dark:focus:border-white/50"
                    />
                  </div>

                  <div class="space-y-2">
                    <label for="profile-overlay-email" class="block text-[9px] font-mono uppercase tracking-[0.35em] opacity-35">{{ locale === 'ru' ? 'Адрес электронной почты' : 'Email address' }}</label>
                    <div class="relative">
                      <input
                        id="profile-overlay-email"
                        :value="profileEmail"
                        type="email"
                        readonly
                        tabindex="-1"
                        class="w-full px-4 py-3 border nier-border-primary bg-black/[0.03] dark:bg-white/[0.03] font-mono tracking-[0.08em] text-black/90 dark:text-white/90 break-all focus:outline-none"
                      />
                      <div class="absolute inset-0 flex items-center justify-end border nier-border-primary bg-gray-100/45 dark:bg-[#0a0a0a]/45 px-4 backdrop-blur-[1px] pointer-events-none">
                        <span class="text-[8px] font-mono uppercase tracking-[0.3em] text-black/55 dark:text-white/55">
                          {{ emailLockedLabel }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <label for="profile-overlay-description" class="block text-[9px] font-mono uppercase tracking-[0.35em] opacity-35">{{ locale === 'ru' ? 'Описание' : 'Description' }}</label>
                    <textarea
                      id="profile-overlay-description"
                      v-model="description"
                      rows="6"
                      :placeholder="locale === 'ru' ? 'Краткое описание пользователя' : 'Short description about the user'"
                      class="w-full px-4 py-3 border nier-border-primary bg-black/[0.03] dark:bg-white/[0.03] text-[13px] leading-7 nier-text-primary placeholder:text-black/25 dark:placeholder:text-white/25 focus:outline-none focus:border-black/50 dark:focus:border-white/50 resize-none"
                    ></textarea>
                  </div>
                </div>

                <div class="flex items-center gap-4 border-t nier-border-primary pt-6">
                  <button
                    type="submit"
                    :disabled="isSubmitting"
                    class="border border-black/15 dark:border-white/15 bg-black text-white dark:bg-white dark:text-[#0a0a0a] px-6 py-3 text-[9px] font-mono uppercase tracking-[0.35em] font-black transition-colors duration-300 hover:bg-black/85 dark:hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {{ isSubmitting ? savingLabel : saveLabel }}
                  </button>
                  <div v-if="errorMessage || successMessage" class="text-[9px] font-mono uppercase tracking-[0.25em] nier-text-primary">
                    {{ errorMessage || successMessage }}
                  </div>
                </div>
              </form>

              <div v-else class="max-w-2xl space-y-8">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    v-for="mode in appearanceModes"
                    :key="mode.key"
                    type="button"
                    @click="setAppearanceMode(mode.key)"
                    class="p-4 border text-left transition-colors duration-300 cursor-pointer"
                    :class="mode.active ? 'border-black dark:border-white bg-black/5 dark:bg-white/10 shadow-[inset_3px_0_0_rgba(0,0,0,0.9)] dark:shadow-[inset_3px_0_0_rgba(255,255,255,0.9)] nier-text-primary' : 'nier-border-primary bg-black/[0.03] dark:bg-white/[0.03] hover:border-black/30 dark:hover:border-white/30 text-black/60 dark:text-white/60'"
                  >
                    <span class="block text-[9px] font-mono uppercase tracking-[0.35em] font-black">{{ mode.label }}</span>
                    <span class="block text-[8px] font-mono uppercase tracking-[0.25em] mt-2" :class="mode.active ? 'opacity-70' : 'opacity-40'">
                      {{ mode.note }}
                    </span>
                  </button>
                </div>

                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <span class="text-[9px] font-mono uppercase tracking-[0.35em] opacity-40">{{ locale === 'ru' ? 'Акцент' : 'Accent' }}</span>
                    <span class="text-[8px] font-mono uppercase tracking-[0.25em] opacity-30">{{ locale === 'ru' ? 'Пресеты' : 'Presets' }}</span>
                  </div>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div v-for="tone in appearanceTones" :key="tone.name" class="flex flex-col gap-2">
                      <div class="h-12 border nier-border-primary bg-[#0a0a0a]" :style="{ backgroundColor: tone.value }"></div>
                      <span class="text-[8px] font-mono uppercase tracking-[0.18em] text-black/55 dark:text-white/55">{{ tone.name }}</span>
                    </div>
                  </div>
                </div>

              </div>
            </main>
          </div>
        </ExPanel>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount, watch } from 'vue'
import { useAuthStore } from '~/entities/user/auth.store'
import { useProfile } from '~/widgets/profile/model/useProfile'
import ExPanel from '~/shared/ui/ExPanel.vue'
import { useThemeStore } from '~/features/store/useTheme'

const themeStore = useThemeStore()
const isDark = computed(() => themeStore.settings.isDark)

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const authStore = useAuthStore()
const {
  displayName,
  description,
  isSubmitting,
  errorMessage,
  successMessage,
  loadProfile,
  saveProfile,
  locale
} = useProfile()

const profileDisplayName = computed(() => displayName.value.trim() || authStore.user?.displayName?.trim() || 'Operator_0x4F')
const profileEmail = computed(() => authStore.user?.email?.trim() || 'operator@genesis.app')
const profileAvatarUrl = computed(() => authStore.user?.photoURL || '')
const profileInitial = computed(() => (profileDisplayName.value[0] || 'O').toUpperCase())
const profileAccountType = computed(() => String(authStore.user?.type || 'common').toUpperCase())
const emailLockedLabel = computed(() => locale.value === 'ru' ? 'ПОЧТА НЕИЗМЕНЯЕМА' : 'EMAIL LOCKED')
const saveLabel = computed(() => locale.value === 'ru' ? 'СОХРАНИТЬ' : 'SAVE')
const savingLabel = computed(() => locale.value === 'ru' ? 'СОХРАНЕНИЕ' : 'SAVING')

const activeTab = ref<'profile' | 'appearance'>('profile')

const profileTabs = computed(() => [
  { key: 'profile' as const, label: locale.value === 'ru' ? 'Профиль' : 'Profile', note: locale.value === 'ru' ? 'Основа' : 'Core' },
  { key: 'appearance' as const, label: locale.value === 'ru' ? 'Внешний вид' : 'Appearance', note: locale.value === 'ru' ? 'Тема' : 'Theme' }
])

const appearanceModes = computed(() => {
  const currentMode = themeStore.settings.themeMode || (themeStore.settings.isDark ? 'dark' : 'light')
  return [
    {
      key: 'dark' as const,
      label: locale.value === 'ru' ? 'Темная' : 'Dark',
      note: currentMode === 'dark'
        ? (locale.value === 'ru' ? 'Активна' : 'Active')
        : (locale.value === 'ru' ? 'Доступна' : 'Available'),
      active: currentMode === 'dark'
    },
    {
      key: 'light' as const,
      label: locale.value === 'ru' ? 'Светлая' : 'Light',
      note: currentMode === 'light'
        ? (locale.value === 'ru' ? 'Активна' : 'Active')
        : (locale.value === 'ru' ? 'Доступна' : 'Available'),
      active: currentMode === 'light'
    },
    {
      key: 'system' as const,
      label: locale.value === 'ru' ? 'Системная' : 'System',
      note: currentMode === 'system'
        ? (locale.value === 'ru' ? 'Активна' : 'Active')
        : (locale.value === 'ru' ? 'Авто' : 'Auto'),
      active: currentMode === 'system'
    }
  ]
})

function setAppearanceMode(mode: 'light' | 'dark' | 'system') {
  themeStore.setTheme({ themeMode: mode })
}

const appearanceTones = computed(() => [
  { name: locale.value === 'ru' ? 'Чернила' : 'Ink', value: '#ffffff' },
  { name: locale.value === 'ru' ? 'Бумага' : 'Paper', value: '#111111' },
  { name: locale.value === 'ru' ? 'Небо' : 'Sky', value: '#7dd3fc' },
  { name: locale.value === 'ru' ? 'Мята' : 'Mint', value: '#6ee7b7' }
])



const hydrateProfile = async () => {
  await loadProfile()
  if (!displayName.value.trim()) {
    displayName.value = authStore.user?.displayName?.trim() || 'Operator_0x4F'
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    activeTab.value = 'profile'
    void hydrateProfile()
  },
  { immediate: true }
)

// No cleanup needed since we use base64 data URLs
</script>

<style scoped>
.profile-overlay-enter-active,
.profile-overlay-leave-active {
  transition: opacity 0.25s ease;
}
.profile-overlay-enter-from,
.profile-overlay-leave-to {
  opacity: 0;
}
</style>
