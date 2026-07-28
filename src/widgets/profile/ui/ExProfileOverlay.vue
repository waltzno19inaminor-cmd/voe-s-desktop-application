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

                  <div class="relative space-y-2">
                    <label for="profile-overlay-status" class="block text-[9px] font-mono uppercase tracking-[0.35em] opacity-35">{{ locale === 'ru' ? 'Статус' : 'Status' }}</label>
                    <button
                      id="profile-overlay-status"
                      type="button"
                      :disabled="isLoadingStatuses || !profileStatuses.length"
                      :aria-expanded="isStatusDropdownOpen"
                      class="group flex w-full items-center justify-between gap-4 border nier-border-primary bg-black/[0.03] px-4 py-3 text-left transition-colors duration-300 dark:bg-white/[0.03] hover:bg-black/[0.055] dark:hover:bg-white/[0.075] disabled:cursor-default disabled:opacity-45"
                      @click="isStatusDropdownOpen = !isStatusDropdownOpen"
                    >
                      <span v-if="isLoadingStatuses" class="status-input-loader" role="status" :aria-label="locale === 'ru' ? 'Загрузка статусов' : 'Loading statuses'">
                        <span class="status-input-loader__ring"></span>
                      </span>
                      <span
                        v-else-if="selectedProfileStatus"
                        class="status-token"
                        :class="getStatusPresetClass(selectedProfileStatus.visualPreset)"
                      >
                        {{ selectedProfileStatus.name }}
                      </span>
                      <span v-else class="text-[9px] font-mono uppercase tracking-[0.25em] opacity-35">
                        {{ profileStatuses.length ? (locale === 'ru' ? 'Не выбран' : 'Not selected') : (locale === 'ru' ? 'Нет доступных статусов' : 'No statuses granted') }}
                      </span>
                      <svg class="h-3 w-3 shrink-0 opacity-45 transition-transform duration-300" :class="isStatusDropdownOpen ? 'rotate-180' : ''" viewBox="0 0 12 12" aria-hidden="true">
                        <path d="M2 4.25 6 8l4-3.75" fill="none" stroke="currentColor" stroke-linecap="square" stroke-width="1.25" />
                      </svg>
                    </button>

                    <Transition name="status-dropdown">
                      <div v-if="isStatusDropdownOpen" class="absolute z-30 mt-2 w-full overflow-hidden border nier-border-primary bg-theme-bg/95 shadow-[0_18px_45px_rgba(0,0,0,0.16)] backdrop-blur-xl dark:bg-[#090909]/95">
                        <button
                          v-for="status in profileStatuses"
                          :key="getStatusKey(status)"
                          type="button"
                          :disabled="isSelectingStatus"
                          class="flex w-full items-center justify-between gap-4 border-b nier-border-primary px-4 py-3 text-left last:border-b-0 transition-colors duration-200 hover:bg-black/[0.055] dark:hover:bg-white/[0.075] disabled:cursor-wait"
                          :class="status.isSelected ? 'bg-black/[0.045] dark:bg-white/[0.065]' : ''"
                          @click="selectStatus(status.name)"
                        >
                          <span class="flex min-w-0 items-center gap-3">
                            <span class="status-token" :class="getStatusPresetClass(status.visualPreset)">{{ status.name }}</span>
                            <span v-if="status.isSelected" class="text-[8px] font-mono uppercase tracking-[0.24em] opacity-45">{{ locale === 'ru' ? 'Активен' : 'Active' }}</span>
                          </span>
                          <time class="shrink-0 text-[8px] font-mono uppercase tracking-[0.18em] opacity-45">{{ formatStatusGrantedAt(status.granted) }}</time>
                        </button>
                      </div>
                    </Transition>
                    <p v-if="statusSelectionMessage" class="text-[8px] font-mono uppercase tracking-[0.22em] opacity-55">
                      {{ statusSelectionMessage }}
                    </p>
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
  profileStatuses,
  isLoadingStatuses,
  isSelectingStatus,
  statusSelectionMessage,
  loadProfile,
  saveProfile,
  selectProfileStatus,
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
const isStatusDropdownOpen = ref(false)
const selectedProfileStatus = computed(() => profileStatuses.value.find((status) => status.isSelected) || null)

const getStatusPresetClass = (preset: number) => `status-token--${Math.min(3, Math.max(0, Math.trunc(preset)))}`

const getStatusKey = (status: { name: string; granted?: unknown }) => {
  const granted = status.granted as { toMillis?: () => number } | undefined
  return `${status.name}:${typeof granted?.toMillis === 'function' ? granted.toMillis() : String(status.granted || '')}`
}

const formatStatusGrantedAt = (value: unknown) => {
  const timestamp = value as { toDate?: () => Date; toMillis?: () => number } | undefined
  const date = typeof timestamp?.toDate === 'function'
    ? timestamp.toDate()
    : typeof timestamp?.toMillis === 'function'
      ? new Date(timestamp.toMillis())
      : value instanceof Date
        ? value
        : typeof value === 'number' || typeof value === 'string'
          ? new Date(value)
          : null

  if (!date || Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

const selectStatus = async (statusName: string) => {
  await selectProfileStatus(statusName)
  isStatusDropdownOpen.value = false
}

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
    isStatusDropdownOpen.value = false
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

.status-dropdown-enter-active,
.status-dropdown-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
  transform-origin: top;
}

.status-dropdown-enter-from,
.status-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px) scaleY(0.98);
}

.status-token {
  position: relative;
  display: inline-flex;
  min-width: 0;
  max-width: 100%;
  align-items: center;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.22);
  padding: 0.28rem 0.5rem 0.25rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.58rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.status-input-loader {
  display: inline-flex;
  height: 1.05rem;
  width: 1.05rem;
  align-items: center;
  justify-content: center;
}

.status-input-loader__ring {
  height: 0.74rem;
  width: 0.74rem;
  border: 1px solid rgba(0, 0, 0, 0.22);
  border-top-color: rgba(0, 0, 0, 0.88);
  border-radius: 999px;
  animation: status-loader-spin 620ms linear infinite;
}

:global(.dark) .status-input-loader__ring {
  border-color: rgba(255, 255, 255, 0.24);
  border-top-color: rgba(255, 255, 255, 0.92);
}

.status-token--0 {
  border-color: rgba(255, 255, 255, 0.78);
  background: linear-gradient(112deg, #070707 0%, #221338 32%, #75628d 49%, #24123a 68%, #080808 100%);
  background-size: 240% 100%;
  color: #fff;
  box-shadow: 0 0 18px rgba(233, 219, 255, 0.38);
  animation: status-monarch 4.8s ease-in-out infinite;
}

.status-token--1 {
  border-color: rgba(135, 206, 255, 0.56);
  background: linear-gradient(112deg, #09131d 0%, #164f79 47%, #a9dfff 100%);
  background-size: 180% 100%;
  color: #f7fcff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
  animation: status-prism 6.4s ease-in-out infinite;
}

.status-token--2 {
  border-color: rgba(234, 157, 92, 0.52);
  background: linear-gradient(112deg, #24110a 0%, #8b3c1b 52%, #e0a15a 100%);
  color: #fff9f1;
  box-shadow: inset 0 1px 0 rgba(255, 225, 190, 0.2);
}

.status-token--3 {
  border-color: rgba(126, 147, 166, 0.42);
  background: linear-gradient(112deg, #1a2128 0%, #35424e 100%);
  color: #eaf0f5;
}

@keyframes status-monarch {
  0%,
  100% {
    background-position: 0% 50%;
    box-shadow: 0 0 11px rgba(233, 219, 255, 0.2);
  }
  50% {
    background-position: 100% 50%;
    box-shadow: 0 0 24px rgba(255, 255, 255, 0.55);
  }
}

@keyframes status-prism {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes status-loader-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
