<template>
  <section class="access-gate flex h-full w-full items-center justify-center px-5 py-10 sm:px-8 relative overflow-hidden" :class="{ 'is-dark': isDark }">
    <div
      class="fixed left-8 top-14 z-[100] flex items-center gap-4"
      role="group"
      :aria-label="isRussian ? 'Смена языка' : 'Language switcher'"
    >
      <button
        type="button"
        class="px-1 py-2 text-[8px] font-mono uppercase tracking-[0.35em] text-black transition-all duration-300"
        :class="isRussian ? 'font-bold opacity-100' : 'opacity-35 hover:opacity-100'"
        :aria-pressed="isRussian"
        @click="emit('changeLocale', 'ru')"
      >
        RU
      </button>
      <button
        type="button"
        class="px-1 py-2 text-[8px] font-mono uppercase tracking-[0.35em] text-black transition-all duration-300"
        :class="!isRussian ? 'font-bold opacity-100' : 'opacity-35 hover:opacity-100'"
        :aria-pressed="!isRussian"
        @click="emit('changeLocale', 'en')"
      >
        EN
      </button>
    </div>
    <button
      type="button"
      class="access-gate__sign-out-corner fixed right-8 top-14 z-[100] border border-black px-4 py-2 text-[8px] font-mono uppercase tracking-[0.4em] text-black opacity-30 transition-all duration-300 hover:opacity-100"
      @click="emit('signOut')"
    >
      {{ isRussian ? 'Выйти' : 'Sign Out' }}
    </button>

    <div class="access-gate__panel w-full max-w-[54rem] overflow-visible relative z-10">
      <div class="px-7 py-9 sm:px-11 sm:py-12">

      <div v-if="state === 'checking'" class="flex min-h-48 flex-col items-center justify-center text-center">
        <span class="access-gate__spinner mb-6" aria-hidden="true"></span>
        <p class="access-gate__eyebrow">{{ isRussian ? 'ПРОВЕРКА ДОСТУПА' : 'VERIFYING ACCESS' }}</p>
      </div>

      <div v-else-if="isAccountBlocked" class="access-gate__blocked text-center">
        <p class="access-gate__eyebrow">{{ isRussian ? 'ДОСТУП ОГРАНИЧЕН' : 'ACCESS RESTRICTED' }}</p>
        <ExHeading level="h1" variant="cinematic" class="access-gate__title mt-5">
          {{ isRussian ? 'АККАУНТ ВРЕМЕННО ЗАБЛОКИРОВАН' : 'ACCOUNT TEMPORARILY BLOCKED' }}
        </ExHeading>
        <p class="access-gate__description">
          {{ isRussian
            ? `Доступ к аккаунту ограничен до ${blockedUntilText}.`
            : `Access to this account is restricted until ${blockedUntilText}.` }}
        </p>
        <p class="access-gate__blocked-note">
          {{ isRussian ? 'Если вы считаете это ошибкой, обратитесь в поддержку.' : 'If you believe this is a mistake, please contact support.' }}
        </p>
      </div>

      <div v-else-if="helpView === 'purchase'" class="access-gate__help text-center">
        <p class="access-gate__eyebrow">{{ isRussian ? 'ПОЛУЧЕНИЕ КЛЮЧА' : 'GET YOUR ACCESS KEY' }}</p>
        <ExHeading level="h1" variant="cinematic" class="access-gate__title mt-5">
          {{ isRussian ? 'ОПЛАТИТЕ ПОДПИСКУ' : 'PURCHASE A SUBSCRIPTION' }}
        </ExHeading>
        <p class="access-gate__help-copy">
          {{ isRussian
            ? 'Для получения ключа оплатите подписку на Patreon. После оплаты ключ будет отправлен на почту вашего аккаунта Patreon.'
            : 'To receive an access key, purchase a Patreon subscription. After payment, the key will be sent to the email address of your Patreon account.' }}
        </p>

        <div class="access-gate__help-actions">
          <button type="button" class="access-gate__patreon access-gate__help-button" @click="openPatreon">
            {{ isRussian ? 'ПРИОБРЕСТИ' : 'PURCHASE' }}
          </button>
          <button type="button" class="access-gate__support-link" @click="helpView = 'support'">
            {{ isRussian ? 'НЕ ПОЛУЧИЛИ КЛЮЧ?' : 'DIDN\'T RECEIVE YOUR KEY?' }}
          </button>
          <button type="button" class="access-gate__back" @click="helpView = 'none'">
            {{ isRussian ? 'НАЗАД' : 'BACK' }}
          </button>
        </div>
      </div>

      <div v-else-if="helpView === 'support'" class="access-gate__help text-center">
        <p class="access-gate__eyebrow">{{ isRussian ? 'ПОДДЕРЖКА' : 'SUPPORT' }}</p>
        <ExHeading level="h1" variant="cinematic" class="access-gate__title mt-5">
          {{ isRussian ? 'КЛЮЧ НЕ ПРИШЁЛ?' : 'DIDN\'T GET YOUR KEY?' }}
        </ExHeading>
        <div v-if="supportRequestSubmitted" class="access-gate__support-success">
          <button type="button" disabled class="access-gate__submit access-gate__support-submit access-gate__support-sent">
            {{ isRussian ? 'Отправлено' : 'Sent' }}
          </button>
        </div>
        <form id="key-support-form" v-else class="access-gate__support-form" novalidate @submit.prevent="submitKeySupportRequest">
          <label class="access-gate__support-label" for="patreon-account-email">
            {{ isRussian ? 'ПОЧТА АККАУНТА PATREON' : 'PATREON ACCOUNT EMAIL' }}
          </label>
          <input
            id="patreon-account-email"
            v-model="patreonEmail"
            class="access-gate__input access-gate__support-input"
            type="email"
            autocomplete="email"
            maxlength="160"
            :disabled="supportRequestSubmitting || supportRequestDailyLimitReached"
            :placeholder="isRussian ? 'Почта, на которую оформлена подписка' : 'Email used for the subscription'"
            :aria-invalid="Boolean(supportFieldErrors.patreonEmail)"
            @input="supportFieldErrors.patreonEmail = ''"
          >
          <p v-if="supportFieldErrors.patreonEmail" class="access-gate__support-field-error">
            {{ supportFieldErrors.patreonEmail }}
          </p>

          <label class="access-gate__support-label" for="patreon-payment-date">
            {{ isRussian ? 'ДАТА ОПЛАТЫ' : 'PAYMENT DATE' }}
          </label>
          <input
            id="patreon-payment-date"
            v-model="paymentDate"
            class="access-gate__input access-gate__support-input"
            type="date"
            :disabled="supportRequestSubmitting || supportRequestDailyLimitReached"
            :aria-invalid="Boolean(supportFieldErrors.paymentDate)"
            @input="supportFieldErrors.paymentDate = ''"
          >
          <p v-if="supportFieldErrors.paymentDate" class="access-gate__support-field-error">
            {{ supportFieldErrors.paymentDate }}
          </p>

          <p v-if="supportRequestErrorText" class="access-gate__support-error" role="alert" aria-live="polite">
            {{ supportRequestErrorText }}
          </p>
        </form>

        <div v-if="!supportRequestSubmitted" class="access-gate__support-actions">
          <button type="button" class="access-gate__back" @click="helpView = 'purchase'">
            {{ isRussian ? 'НАЗАД' : 'BACK' }}
          </button>
          <button
            type="submit"
            form="key-support-form"
            class="access-gate__submit access-gate__support-submit"
            :disabled="supportRequestSubmitting || supportRequestDailyLimitReached"
          >
            <span v-if="supportRequestSubmitting" class="access-gate__button-spinner" aria-hidden="true"></span>
            {{ supportRequestSubmitting ? (isRussian ? 'ОТПРАВКА...' : 'SENDING...') : (isRussian ? 'ОТПРАВИТЬ ОБРАЩЕНИЕ' : 'SUBMIT REQUEST') }}
          </button>
        </div>
        <div v-else class="access-gate__help-actions">
          <button type="button" class="access-gate__back" @click="helpView = 'purchase'">
            {{ isRussian ? 'НАЗАД' : 'BACK' }}
          </button>
        </div>
      </div>

      <div v-else class="text-center">
        <div v-if="accessMode === 'choices'" class="access-gate__choice-grid">
          <article class="access-gate__choice-card access-gate__choice-card--trial">
            <span class="access-gate__choice-index">01 / TRIAL</span>
            <ExHeading level="h2" variant="cinematic" class="access-gate__choice-title">
              {{ isRussian ? 'ПРОБНАЯ ВЕРСИЯ · 7 ДНЕЙ' : '7-DAY TRIAL VERSION' }}
            </ExHeading>
            <p class="access-gate__choice-description">
              {{ isRussian
                ? 'Полный доступ ко всем возможностям приложения на 7 дней.'
                : 'Full access to all app features for 7 days.' }}
            </p>
            <button
              v-if="isTrialStatusKnown && !isTrialUsed"
              type="button"
              class="access-gate__trial access-gate__trial--card access-gate__choice-action"
              :disabled="isSubmitting || isLocked"
              @click="emit('startTrial')"
            >
              {{ isRussian ? 'НАЧАТЬ ПРОБНЫЙ ПЕРИОД' : 'START 7-DAY TRIAL' }}
            </button>
            <button
              v-else-if="isTrialStatusKnown && isTrialUsed"
              type="button"
              class="access-gate__choice-status access-gate__choice-status--button"
              disabled
            >
              {{ isRussian ? 'УЖЕ АКТИВИРОВАНО' : 'ALREADY ACTIVATED' }}
            </button>
          </article>

          <article class="access-gate__choice-card access-gate__choice-card--key">
            <span class="access-gate__choice-index">02 / KEY</span>
            <ExHeading level="h2" variant="cinematic" class="access-gate__choice-title">
              {{ isRussian ? 'У МЕНЯ ЕСТЬ КЛЮЧ' : 'I HAVE A KEY' }}
            </ExHeading>
            <p class="access-gate__choice-description">
              {{ isRussian
                ? 'Активируйте полную версию приложения с помощью ключа.'
                : 'Activate the full version of the app with your access key.' }}
            </p>
            <button type="button" class="access-gate__submit access-gate__choice-action" @click="accessMode = 'key'">
              {{ isRussian ? 'ВВЕСТИ КЛЮЧ' : 'ENTER KEY' }}
            </button>
          </article>
        </div>

        <button
          v-if="accessMode === 'choices'"
          type="button"
          class="access-gate__free-continue"
          :disabled="isSubmitting || isLocked"
          @click="emit('startFreePlan')"
        >
          {{ isRussian ? 'ПРОДОЛЖИТЬ С БЕСПЛАТНОЙ ВЕРСИЕЙ' : 'CONTINUE WITH FREE VERSION' }}
        </button>

        <div v-if="accessMode !== 'choices'" class="access-gate__key-panel">
          <ExHeading level="h1" variant="cinematic" class="access-gate__title mt-7">
            {{ isRussian ? 'ВВЕДИТЕ КЛЮЧ' : 'ENTER KEY' }}
          </ExHeading>

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

            <div class="access-gate__actions mt-6">
              <button
                type="submit"
                class="access-gate__submit"
                :disabled="isSubmitting || isLocked || !accessKey"
              >
                <span v-if="isSubmitting" class="access-gate__button-spinner" aria-hidden="true"></span>
                <span>{{ isSubmitting ? (isRussian ? 'АКТИВАЦИЯ...' : 'ACTIVATING...') : (isRussian ? 'АКТИВИРОВАТЬ' : 'ACTIVATE') }}</span>
              </button>
              <button type="button" class="access-gate__patreon" @click="helpView = 'purchase'">
                {{ isRussian ? 'НЕТ КЛЮЧА?' : 'NO KEY?' }}
              </button>
            </div>
          </form>

          <button type="button" class="access-gate__back access-gate__key-back mt-6" @click="accessMode = 'choices'">
            {{ isRussian ? 'НАЗАД К ВЫБОРУ' : 'BACK TO OPTIONS' }}
          </button>
        </div>

        <p v-if="visibleError" class="access-gate__error mt-5" role="alert">{{ visibleError }}</p>
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
import { useThemeStore } from '~/features/store/useTheme'
import { useDashboardFeedback } from '~/widgets/dashboard/model/useDashboardFeedback'
import pkg from '../../../../../package.json'

const themeStore = useThemeStore()
const isDark = computed(() => themeStore.settings.isDark)
const PATREON_URL = 'https://www.patreon.com/cw/jlgandr'
const props = withDefaults(defineProps<{
  state: AccessActivationState
  error?: string
  isSubmitting?: boolean
  isTrialUsed?: boolean
  isTrialStatusKnown?: boolean
  lockRemainingSeconds?: number
  isAccountBlocked?: boolean
  blockedUntil?: number | null
  locale?: string
}>(), {
  error: '',
  isSubmitting: false,
  isTrialUsed: false,
  isTrialStatusKnown: false,
  lockRemainingSeconds: 0,
  isAccountBlocked: false,
  blockedUntil: null,
  locale: 'en'
})

const emit = defineEmits<{
  activate: [key: string]
  startTrial: []
  startFreePlan: []
  changeLocale: [locale: 'ru' | 'en']
  retry: []
  signOut: []
}>()

const accessKey = ref('')
const accessMode = ref<'choices' | 'key'>('choices')
const helpView = ref<'none' | 'purchase' | 'support'>('none')
const patreonEmail = ref('')
const paymentDate = ref('')
const supportFieldErrors = ref({ patreonEmail: '', paymentDate: '' })
const supportAppVersion = ref(String(pkg.version || ''))
const isRussian = computed(() => props.locale === 'ru')
const isLocked = computed(() => props.lockRemainingSeconds > 0)
const isTrialUsed = computed(() => props.isTrialUsed)
const isTrialStatusKnown = computed(() => props.isTrialStatusKnown)
const isAccountBlocked = computed(() => props.isAccountBlocked)
const {
  feedbackSubmitted: supportRequestSubmitted,
  feedbackSubmitting: supportRequestSubmitting,
  feedbackDailyLimitReached: supportRequestDailyLimitReached,
  feedbackError: supportRequestError,
  submitFeedbackRequest
} = useDashboardFeedback(supportAppVersion)
const supportRequestErrorText = computed(() => {
  if (supportRequestDailyLimitReached.value) {
    return isRussian.value
      ? 'Вы уже отправляли обращение за последние 24 часа. Попробуйте позже.'
      : 'You have already sent a request within the last 24 hours. Please try again later.'
  }
  return supportRequestError.value
})
const blockedUntilText = computed(() => {
  if (!props.blockedUntil) return isRussian.value ? 'дальнейшего уведомления' : 'further notice'
  return new Intl.DateTimeFormat(isRussian.value ? 'ru-RU' : 'en-GB', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(props.blockedUntil))
})

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

  if (normalized.includes('access period has expired') || normalized.includes('access key has expired')) {
    return isRussian.value
      ? 'Срок действия доступа истёк. Введите новый ключ активации.'
      : 'Your access period has expired. Please enter a new activation key.'
  }

  if (normalized.includes('free trial has already been used')) {
    return isRussian.value
      ? 'Бесплатный период для этого аккаунта уже был использован.'
      : 'The free trial has already been used for this account.'
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

  if (normalized.includes('verify your email') || normalized.includes('verified email')) {
    return isRussian.value
      ? 'Подтвердите адрес email по ссылке из письма, затем повторите попытку.'
      : 'Verify your email using the link we sent, then try again.'
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

const submitKeySupportRequest = async () => {
  const email = patreonEmail.value.trim()
  const date = paymentDate.value.trim()
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  supportFieldErrors.value = {
    patreonEmail: validEmail ? '' : (isRussian.value ? 'Введите корректную почту Patreon.' : 'Enter a valid Patreon email.'),
    paymentDate: date ? '' : (isRussian.value ? 'Укажите дату оплаты.' : 'Enter the payment date.')
  }

  if (!validEmail || !date) return

  await submitFeedbackRequest({
    type: '?',
    title: isRussian.value ? 'Ключ доступа не получен' : 'Access key not received',
    message: isRussian.value
      ? `Почта аккаунта Patreon: ${email}\nДата оплаты: ${date}`
      : `Patreon account email: ${email}\nPayment date: ${date}`
  })
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
  min-height: 100%;
  background: transparent;
}

.access-gate__panel {
  background: transparent;
  border: 0;
  box-shadow: none;
  animation: access-gate-content-reveal 560ms cubic-bezier(0.16, 1, 0.3, 1) 80ms both;
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
  color: #000000 !important;
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

.access-gate__choice-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 2.5rem auto 0;
  max-width: 46rem;
}

.access-gate__choice-card {
  align-items: stretch;
  border: 1px solid rgba(23, 23, 23, 0.55);
  display: flex;
  flex-direction: column;
  min-height: 27rem;
  padding: 2.25rem;
  text-align: left;
  transform: scale(1);
  transform-origin: center;
  transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 360ms ease;
  will-change: transform;
}

.access-gate__choice-card:hover {
  box-shadow: 0 1.25rem 2.5rem rgba(23, 23, 23, 0.12);
  transform: scale(1.025);
}

.access-gate__choice-card--trial {
  background: #171717;
  border-color: #171717;
  color: #ffffff;
}

.access-gate__choice-card--key {
  background: rgba(255, 255, 255, 0.34);
}

.access-gate__choice-index {
  color: #171717;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.2em;
  opacity: 0.58;
}

.access-gate__choice-card--trial .access-gate__choice-index,
.access-gate__choice-card--trial .access-gate__choice-description {
  color: #ffffff;
}

.access-gate__choice-card--trial .access-gate__choice-title {
  color: #ffffff !important;
}

.access-gate__choice-title {
  color: #000000 !important;
  font-size: clamp(1.35rem, 3.5vw, 2rem) !important;
  letter-spacing: 0.08em !important;
  line-height: 1.08 !important;
  margin-top: 2rem;
}

.access-gate__choice-description {
  color: #171717;
  font-size: 13px;
  line-height: 1.65;
  margin-top: 1.1rem;
  max-width: 19rem;
}

.access-gate__choice-action {
  margin-top: auto;
  min-height: 3rem;
}

.access-gate__choice-status {
  align-items: center;
  border: 1px solid rgba(23, 23, 23, 0.28);
  color: #171717;
  display: flex;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 8px;
  font-weight: 900;
  justify-content: center;
  letter-spacing: 0.12em;
  line-height: 1.5;
  margin-top: auto;
  min-height: 3rem;
  padding: 0.75rem;
  text-align: center;
}

.access-gate__choice-card--trial .access-gate__choice-status {
  border-color: rgba(255, 255, 255, 0.38);
  color: #ffffff;
}

.access-gate__trial--card {
  min-height: 3rem;
  width: 100%;
}

.access-gate__choice-card--trial .access-gate__trial--card {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.65);
  color: #ffffff;
}

.access-gate__choice-card--trial .access-gate__trial--card:hover:not(:disabled) {
  background: #ffffff;
  border-color: #ffffff;
  color: #171717;
}

.access-gate__choice-status--button {
  appearance: none;
  background: transparent;
  border-color: rgba(255, 255, 255, 0.38);
  color: #ffffff !important;
  cursor: default;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10px;
  width: 100%;
}

.access-gate__free-continue {
  align-items: center;
  background: transparent;
  border: 1px solid rgba(23, 23, 23, 0.52);
  color: #171717;
  display: inline-flex;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10px;
  font-weight: 900;
  justify-content: center;
  letter-spacing: 0.16em;
  margin: 1.5rem auto 0;
  min-height: 2.85rem;
  padding: 0.75rem 1.6rem;
  text-align: center;
  transition: background-color 180ms ease, color 180ms ease, opacity 180ms ease, transform 180ms ease;
}

.access-gate__free-continue:hover:not(:disabled) {
  background: #171717;
  color: #ffffff;
  transform: translateY(-1px);
}

.access-gate__free-continue:disabled {
  cursor: default;
  opacity: 0.38;
}

.access-gate__key-panel {
  margin: 0 auto;
  max-width: 34rem;
}

.access-gate__key-back {
  width: auto;
}

.access-gate__sign-out-corner {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.access-gate__blocked-note {
  color: #171717;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 9px;
  letter-spacing: 0.12em;
  line-height: 1.7;
  margin: 2rem auto 0;
  max-width: 27rem;
  text-transform: uppercase;
}

.access-gate__blocked {
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 0 auto;
  min-height: 18rem;
  width: 100%;
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
  font-size: 10px;
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

.access-gate__help {
  margin: 0 auto;
  max-width: 34rem;
}

.access-gate__help-copy {
  color: #171717;
  font-size: clamp(1.05rem, 2.8vw, 1.35rem);
  font-weight: 700;
  line-height: 1.65;
  margin: 2rem auto 0;
  max-width: 31rem;
}

.access-gate__support-form {
  margin: 2.5rem auto 0;
  max-width: 30rem;
  text-align: left;
}

.access-gate__support-label {
  color: #171717;
  display: block;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.16em;
  margin-top: 1.5rem;
}

.access-gate__support-label:first-child {
  margin-top: 0;
}

.access-gate__support-input {
  text-align: left;
}

.access-gate__support-field-error,
.access-gate__support-error {
  color: #8b1e1e;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 9px;
  line-height: 1.5;
  margin-top: 0.55rem;
}

.access-gate__support-submit {
  margin-top: 0;
}

.access-gate__support-success {
  margin: 2.5rem auto 0;
  max-width: 30rem;
}

.access-gate__support-sent {
  background: #ffffff;
  border-color: #ffffff;
  color: #171717;
  opacity: 1 !important;
}

.access-gate__support-actions {
  display: flex;
  gap: 0.85rem;
  margin: 2rem auto 0;
  max-width: 30rem;
}

.access-gate__support-actions .access-gate__support-submit,
.access-gate__support-actions .access-gate__back {
  flex: 1 1 0;
  width: auto;
}

.access-gate__help-actions {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin: 2.5rem auto 0;
  max-width: 22rem;
}

.access-gate__help-button,
.access-gate__support-link,
.access-gate__back {
  min-height: 3rem;
  width: 100%;
}

.access-gate__help-button {
  background: #171717;
  border-color: #171717;
  color: #ffffff;
}

.access-gate__help-button:hover {
  background: #303030;
  border-color: #303030;
  color: #ffffff;
}

.access-gate__support-link,
.access-gate__back {
  background: transparent;
  border: 1px solid rgba(23, 23, 23, 0.62);
  color: #171717;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.16em;
  padding: 0.8rem 1rem;
  transition: background-color 180ms ease, color 180ms ease, transform 180ms ease;
}

.access-gate__support-link:hover,
.access-gate__back:hover {
  background: #171717;
  color: #ffffff;
  transform: translateY(-1px);
}

.access-gate__submit:disabled {
  cursor: default;
  opacity: 0.38;
}

.access-gate__trial {
  background: #000000;
  border: 1px solid #000000;
  color: #ffffff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.2em;
  opacity: 1;
  padding: 0.72rem 1rem;
  transition: background-color 180ms ease, border-color 180ms ease;
}

.access-gate__trial:hover:not(:disabled) { background: #252525; border-color: #252525; }
.access-gate__trial:disabled { cursor: default; opacity: 0.28; }

@media (max-width: 520px) {
  .access-gate__choice-grid {
    grid-template-columns: 1fr;
  }

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

@keyframes access-gate-content-reveal {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

</style>
