<template>
  <section class="access-gate flex h-full w-full items-center justify-center px-5 py-10 sm:px-8 relative overflow-hidden ethereal-void" :class="{ 'is-dark': isDark }">
    <!-- Gradflow Background -->
    <GradflowBackground preset="mystic" :config="accessGradflowConfig" />

    <!-- Ethereal Background -->
    <div class="access-gate__ethereal-layer" aria-hidden="true">
      <EtherealBackground :is-dark="isDark" :is-assembled="true" :show-bloom="false" />
    </div>
    <DesignVignette v-if="!isDark" :is-dark="isDark" />

    <div class="access-gate__panel w-full max-w-[34rem] overflow-visible relative z-10">
      <div class="px-7 py-9 sm:px-11 sm:py-12">

      <div v-if="state === 'checking'" class="flex min-h-48 flex-col items-center justify-center text-center">
        <span class="access-gate__spinner mb-6" aria-hidden="true"></span>
        <p class="access-gate__eyebrow">{{ isRussian ? 'ПРОВЕРКА ДОСТУПА' : 'VERIFYING ACCESS' }}</p>
      </div>

      <div v-else class="text-center">
        <ExHeading level="h1" variant="cinematic" class="access-gate__title">
          {{ isRussian ? 'АКТИВАЦИЯ ДОСТУПА' : 'ACCESS ACTIVATION' }}
        </ExHeading>
        <p class="access-gate__description">
          {{ isRussian
            ? 'Введите ключ активации'
            : 'Enter your activation key.' }}
        </p>

        <form class="mt-9" @submit.prevent="submit">
          <label class="sr-only" for="access-key-input">
            {{ isRussian ? 'Ключ доступа' : 'Access key' }}
          </label>
          <input
            id="access-key-input"
            v-model="accessKey"
            class="access-gate__input"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            maxlength="48"
            :disabled="isSubmitting || isLocked"
            :placeholder="isRussian ? 'EXG-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX' : 'EXG-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX'"
            @input="formatKey"
          >

          <p v-if="visibleError" class="access-gate__error mt-4" role="alert">{{ visibleError }}</p>

          <div class="access-gate__actions mt-6">
            <button
              type="submit"
              class="access-gate__submit"
              :disabled="isSubmitting || isLocked || !accessKey"
            >
              <span v-if="isSubmitting" class="access-gate__button-spinner" aria-hidden="true"></span>
              <span>{{ isSubmitting ? (isRussian ? 'АКТИВАЦИЯ...' : 'ACTIVATING...') : (isRussian ? 'АКТИВИРОВАТЬ' : 'ACTIVATE') }}</span>
            </button>
            <a
              :href="PATREON_URL"
              target="_blank"
              rel="noreferrer"
              class="access-gate__patreon"
              @click="openPatreon"
            >
              {{ isRussian ? 'НЕТ КЛЮЧА?' : 'NO KEY?' }}
            </a>
          </div>
        </form>

        <button
          v-if="state === 'error'"
          type="button"
          class="access-gate__retry mt-5"
          @click="$emit('retry')"
        >
          {{ isRussian ? 'ПОВТОРИТЬ ПРОВЕРКУ' : 'RETRY CHECK' }}
        </button>
      </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ExHeading from '~/shared/ui/ExHeading.vue'
import type { AccessActivationState } from '~/features/access/model/useAccessActivation'
import EtherealBackground from '~/widgets/style/ui/EtherealBackground.vue'
import GradflowBackground from '~/widgets/style/ui/GradflowBackground.vue'
import DesignVignette from '~/widgets/style/ui/DesignVignette.vue'
import { useThemeStore } from '~/features/store/useTheme'

const themeStore = useThemeStore()
const isDark = computed(() => themeStore.settings.isDark)
const PATREON_URL = 'https://www.patreon.com/cw/jlgandr'
const accessGradflowConfig = {
  color1: { r: 2, g: 145, b: 135 },
  color2: { r: 165, g: 249, b: 193 },
  color3: { r: 153, g: 151, b: 231 },
  speed: 0.55,
  scale: 2.2,
  type: 'smoke' as const,
  noise: 0.18
}

const props = withDefaults(defineProps<{
  state: AccessActivationState
  error?: string
  isSubmitting?: boolean
  lockRemainingSeconds?: number
  locale?: string
}>(), {
  error: '',
  isSubmitting: false,
  lockRemainingSeconds: 0,
  locale: 'en'
})

const emit = defineEmits<{
  activate: [key: string]
  retry: []
}>()

const accessKey = ref('')
const isRussian = computed(() => props.locale === 'ru')
const isLocked = computed(() => props.lockRemainingSeconds > 0)
const lockDurationText = computed(() => {
  const totalSeconds = Math.max(0, Math.ceil(props.lockRemainingSeconds))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const localizedAccessError = (error: string) => {
  const normalized = error.trim().toLowerCase()

  if (
    normalized.includes('invalid access key') ||
    normalized.includes('invalid key') ||
    normalized.includes('key is invalid') ||
    normalized.includes('access key invalid')
  ) {
    return isRussian.value
      ? 'Неверный ключ доступа. Проверьте код и попробуйте снова.'
      : 'Invalid access key. Check the code and try again.'
  }

  if (
    normalized.includes('too many activation attempts') ||
    normalized.includes('too many invalid attempts') ||
    normalized.includes('too many attempts') ||
    normalized.includes('rate limit') ||
    normalized.includes('rate-limited')
  ) {
    return isRussian.value
      ? 'Слишком много неверных попыток. Подождите и попробуйте снова.'
      : 'Too many invalid attempts. Please wait and try again.'
  }

  if (
    normalized.includes('temporarily locked') ||
    normalized.includes('please wait before trying again') ||
    normalized.includes('locked')
  ) {
    return isRussian.value
      ? `Ввод временно заблокирован. Попробуйте снова через ${lockDurationText.value}.`
      : `Activation is temporarily locked. Try again in ${lockDurationText.value}.`
  }

  if (
    normalized.includes('authentication session has expired') ||
    normalized.includes('session has expired') ||
    normalized.includes('sign in again')
  ) {
    return isRussian.value
      ? 'Сессия авторизации истекла. Войдите в аккаунт снова.'
      : 'Your authentication session has expired. Please sign in again.'
  }

  if (
    normalized.includes('unable to verify') ||
    normalized.includes('verify your access status')
  ) {
    return isRussian.value
      ? 'Не удалось проверить статус доступа. Повторите проверку.'
      : 'Unable to verify your access status. Please retry the check.'
  }

  if (
    normalized.includes('unable to reach') ||
    normalized.includes('access service') ||
    normalized.includes('network') ||
    normalized.includes('fetch')
  ) {
    return isRussian.value
      ? 'Не удалось подключиться к сервису активации. Попробуйте снова.'
      : 'Unable to reach the access service. Please try again.'
  }

  if (normalized.includes('unable to activate')) {
    return isRussian.value
      ? 'Не удалось активировать доступ. Попробуйте снова.'
      : 'Unable to activate access. Please try again.'
  }

  return error.trim()
}

const visibleError = computed(() => {
  if (isLocked.value) {
    return isRussian.value
      ? `Ввод временно заблокирован. Попробуйте снова через ${lockDurationText.value}.`
      : `Activation is temporarily locked. Try again in ${lockDurationText.value}.`
  }

  const normalizedError = props.error.trim().toLowerCase()
  if (!normalizedError) return ''

  return localizedAccessError(props.error)
})

const formatKey = () => {
  const normalized = accessKey.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!normalized.startsWith('EXG')) {
    accessKey.value = normalized.slice(0, 35)
    return
  }

  const chunks = normalized.slice(3, 35).match(/.{1,8}/g) || []
  accessKey.value = `EXG${chunks.length ? `-${chunks.join('-')}` : ''}`
}

const submit = () => {
  if (props.isSubmitting || isLocked.value || !accessKey.value) return
  emit('activate', accessKey.value)
}

const openPatreon = async (event: MouseEvent) => {
  event.preventDefault()

  if (typeof window === 'undefined') return
  const isTauri = Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)

  if (!isTauri) {
    const opened = window.open(PATREON_URL, '_blank', 'noopener,noreferrer')
    if (!opened) window.location.href = PATREON_URL
    return
  }

  try {
    const { open } = await import('@tauri-apps/plugin-shell')
    await open(PATREON_URL)
  } catch (error) {
    console.error('Failed to open Patreon link', error)
    const opened = window.open(PATREON_URL, '_blank', 'noopener,noreferrer')
    if (!opened) window.location.href = PATREON_URL
  }
}
</script>

<style scoped>
.access-gate {
  min-height: 100vh;
  min-height: 100dvh;
  background:
    radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 0.58), transparent 42%),
    var(--theme-bg);
}

.access-gate.is-dark {
  background:
    radial-gradient(circle at 50% 45%, rgba(246, 240, 230, 0.08), transparent 44%),
    #050505;
}

.access-gate :deep(.gradflow-background),
.access-gate :deep(.gradflow-canvas),
.access-gate :deep(.gradflow-canvas canvas) {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
}

.access-gate :deep(.gradflow-background) {
  position: fixed;
  inset: 0;
}

.access-gate__ethereal-layer {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  opacity: 0.42;
}

.access-gate__panel {
  background: transparent;
  border: 0;
  box-shadow: none;
}

.access-gate__eyebrow,
.access-gate__retry,
.access-gate__error {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.22em;
}

.access-gate__eyebrow {
  color: #000000;
  opacity: 1;
}

.access-gate__title {
  color: var(--theme-text) !important;
  font-size: clamp(2rem, 7vw, 3.5rem) !important;
  letter-spacing: 0.1em !important;
  line-height: 1.04 !important;
}

.access-gate__description {
  color: #171717;
  font-size: 15px;
  line-height: 1.8;
  margin: 1.4rem auto 0;
  max-width: 25rem;
}

.access-gate.is-dark .access-gate__description {
  color: #171717;
}

.access-gate__input {
  background: transparent;
  border: 0;
  border-bottom: 1px solid rgba(23, 23, 23, 0.72);
  color: #171717;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  outline: none;
  padding: 1rem 0;
  text-align: center;
  transition: border-color 180ms ease;
  width: 100%;
}

.access-gate__input::placeholder {
  color: #171717;
  font-size: 8px;
  letter-spacing: 0.04em;
  opacity: 0.48;
}

.access-gate__input:focus {
  border-color: #171717;
}

.access-gate__actions {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: minmax(0, 1fr) auto;
}

.access-gate__submit {
  align-items: center;
  background: var(--theme-text);
  border: 1px solid var(--theme-text);
  color: var(--theme-bg);
  display: inline-flex;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10px;
  font-weight: 900;
  gap: 0.55rem;
  justify-content: center;
  letter-spacing: 0.2em;
  min-height: 2.85rem;
  padding: 0.75rem 1.6rem;
  transition: opacity 180ms ease, transform 180ms ease;
  width: 100%;
}

.access-gate__patreon {
  align-items: center;
  background: transparent;
  border: 1px solid rgba(23, 23, 23, 0.72);
  color: #171717;
  display: inline-flex;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 9px;
  font-weight: 900;
  justify-content: center;
  letter-spacing: 0.16em;
  min-height: 2.85rem;
  padding: 0.75rem 1rem;
  transition: background-color 180ms ease, color 180ms ease, opacity 180ms ease, transform 180ms ease;
  white-space: nowrap;
}

.access-gate__submit:hover:not(:disabled) {
  opacity: 0.78;
  transform: translateY(-1px);
}

.access-gate__patreon:hover {
  background: #ffffff;
  border-color: #ffffff;
  color: #000000;
  transform: translateY(-1px);
}

.access-gate__submit:disabled {
  cursor: default;
  opacity: 0.38;
}

@media (max-width: 520px) {
  .access-gate__actions {
    grid-template-columns: 1fr;
  }
}

.access-gate__error {
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(23, 23, 23, 0.35);
  color: #171717;
  line-height: 1.55;
  padding: 0.8rem 1rem;
  text-align: center;
  backdrop-filter: blur(14px);
}

.access-gate__retry {
  color: var(--theme-text);
  opacity: 0.55;
  transition: opacity 180ms ease;
}

.access-gate__retry:hover {
  opacity: 1;
}

.access-gate__spinner,
.access-gate__button-spinner {
  animation: access-gate-spin 800ms linear infinite;
  border-radius: 999px;
  display: inline-block;
  height: 1.4rem;
  width: 1.4rem;
}

.access-gate__spinner {
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-top-color: #000000;
}

.access-gate__button-spinner {
  border-color: color-mix(in srgb, var(--theme-bg) 45%, transparent);
  border-top-color: var(--theme-bg);
  height: 0.9rem;
  width: 0.9rem;
}

@keyframes access-gate-spin {
  to { transform: rotate(360deg); }
}
</style>
