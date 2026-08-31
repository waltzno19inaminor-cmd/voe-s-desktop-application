<template>
  <div class="dashboard-feedback-stage absolute inset-x-0 bottom-[84px] top-[84px] z-30 overflow-y-auto bg-black px-5 py-7 text-white sm:px-8 sm:py-10 lg:px-14">
    <section
      class="dashboard-feedback-panel relative mx-auto min-h-full w-full max-w-3xl text-white"
      role="dialog"
      aria-modal="true"
      :aria-label="locale === 'ru' ? 'Обратная связь' : 'Feedback'"
    >
      <div class="relative z-10 flex justify-start border-b border-white/10 py-5 text-left">
        <div class="flex w-full flex-col items-start">
          <h2 class="text-base font-mono font-black uppercase tracking-[0.24em]">
            {{ locale === 'ru' ? 'Оставить отзыв' : 'Leave feedback' }}
          </h2>
          <p class="mt-2 max-w-lg text-xs font-mono leading-relaxed text-white/65">
            {{ locale === 'ru' ? 'Сообщите, что работает плохо, чего не хватает или что стоит изменить.' : 'Tell us what is not working, what is missing, or what should change.' }}
          </p>
        </div>
      </div>

      <div v-if="feedbackSubmitted" class="relative z-10 flex min-h-[390px] flex-col items-center justify-center px-6 py-12 text-center sm:px-12">
        <div class="flex h-14 w-14 items-center justify-center border border-white/40">
          <svg class="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
            <path d="m5 12 4.5 4.5L19 7" />
          </svg>
        </div>
        <p class="mt-7 text-[10px] font-mono uppercase tracking-[0.32em] text-white/65">
          {{ locale === 'ru' ? 'Передача завершена' : 'Transmission complete' }}
        </p>
        <h3 class="mt-3 text-lg font-mono font-black uppercase tracking-[0.18em]">
          {{ locale === 'ru' ? 'Спасибо за обратную связь' : 'Thank you for your feedback' }}
        </h3>
        <p class="mt-4 max-w-md text-xs font-mono leading-relaxed text-white/70">
          {{ locale === 'ru' ? 'Ваше сообщение сохранено и передано в систему поддержки.' : 'Your message was saved and sent to the support system.' }}
        </p>
        <button type="button" class="mt-8 border border-white bg-white px-6 py-3 text-[10px] font-mono font-black uppercase tracking-[0.24em] text-black transition-colors hover:bg-transparent hover:text-white" @click="emit('close')">
          {{ locale === 'ru' ? 'Закрыть' : 'Close' }}
        </button>
      </div>

      <form v-else novalidate class="relative z-10 flex flex-col gap-7 px-0 py-8 sm:py-10" @submit.prevent="submitFeedback">
        <div>
          <div class="flex items-center justify-between gap-3">
            <label for="feedback-title" class="text-[10px] font-mono font-medium uppercase tracking-[0.28em] text-white/65">
              {{ locale === 'ru' ? 'Заголовок' : 'Title' }}
            </label>
            <span class="text-[10px] font-mono text-white/50">{{ feedbackForm.title.length }}/80</span>
          </div>
          <input
            id="feedback-title"
            v-model="feedbackForm.title"
            maxlength="80"
            type="text"
            :placeholder="locale === 'ru' ? 'Коротко опишите проблему или идею' : 'Briefly describe the problem or idea'"
            :aria-invalid="Boolean(feedbackFieldErrors.title)"
            class="feedback-field mt-3 w-full"
            @input="feedbackFieldErrors.title = ''"
          />
          <p v-if="feedbackFieldErrors.title" class="mt-2 text-[11px] font-mono text-red-200">
            {{ feedbackFieldErrors.title }}
          </p>
        </div>

        <div>
          <div class="flex items-center justify-between gap-3">
            <label for="feedback-message" class="text-[10px] font-mono font-medium uppercase tracking-[0.28em] text-white/65">
              {{ locale === 'ru' ? 'Сообщение' : 'Message' }}
            </label>
            <span class="text-[10px] font-mono text-white/50">{{ feedbackForm.message.length }}/1000</span>
          </div>
          <textarea
            id="feedback-message"
            v-model="feedbackForm.message"
            maxlength="1000"
            rows="10"
            :placeholder="locale === 'ru' ? 'Опишите подробнее, что произошло и какой результат вы ожидаете' : 'Describe what happened and what result you expected'"
            :aria-invalid="Boolean(feedbackFieldErrors.message)"
            class="feedback-field mt-3 min-h-[250px] w-full resize-none"
            @input="feedbackFieldErrors.message = ''"
          ></textarea>
          <p v-if="feedbackFieldErrors.message" class="mt-2 text-[11px] font-mono text-red-200">
            {{ feedbackFieldErrors.message }}
          </p>
        </div>

        <div v-if="feedbackAttachments.length" class="grid gap-3 sm:grid-cols-3">
          <div v-for="(attachment, index) in feedbackAttachments" :key="attachment.url" class="flex min-w-0 items-center gap-3 border border-white/10 bg-white/[0.03] p-2.5">
            <img :src="attachment.url" alt="" class="h-12 w-16 shrink-0 object-cover" />
            <span class="min-w-0 flex-1 truncate text-[11px] font-mono text-white/70">{{ attachment.name }}</span>
            <button type="button" class="shrink-0 text-[11px] font-mono uppercase tracking-widest text-white/55 hover:text-white" @click="removeFeedbackAttachment(index)">×</button>
          </div>
        </div>

        <p v-if="feedbackError" role="alert" aria-live="polite" class="border border-red-400/30 bg-red-400/5 px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-red-200">
          {{ feedbackError }}
        </p>

        <div class="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <label
            class="feedback-attachment-button inline-flex min-h-11 cursor-pointer items-center justify-center gap-3 border border-white/30 bg-white/[0.03] px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-white/75 transition-all hover:border-white/70 hover:bg-white/[0.08] hover:text-white"
            :class="feedbackAttachments.length >= 3 || feedbackUploading ? 'pointer-events-none opacity-40' : ''"
          >
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple :disabled="feedbackAttachments.length >= 3 || feedbackUploading" class="sr-only" @change="handleFeedbackAttachment" />
            <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <path d="m21.4 11.6-8.8 8.8a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 1 1-2.8-2.8l8.5-8.5" />
            </svg>
            {{ feedbackUploading ? (locale === 'ru' ? `Загрузка ${feedbackUploadProgress}%...` : `Uploading ${feedbackUploadProgress}%...`) : (locale === 'ru' ? 'Прикрепить изображения' : 'Attach images') }} · {{ feedbackAttachments.length }}/3
          </label>
          <button type="submit" class="flex min-h-11 items-center justify-center gap-3 border border-white bg-white px-7 py-3 text-[10px] font-mono font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-transparent hover:text-white disabled:cursor-not-allowed disabled:opacity-45" :disabled="feedbackSubmitting || feedbackUploading || feedbackDailyLimitReached">
            <span v-if="feedbackSubmitting" class="h-3 w-3 animate-spin border border-current border-t-transparent"></span>
            {{ feedbackDailyLimitReached ? (locale === 'ru' ? 'Лимит на 24 часа' : '24-hour limit reached') : (feedbackSubmitting ? (locale === 'ru' ? 'Сохранение...' : 'Saving...') : (locale === 'ru' ? 'Отправить отзыв' : 'Submit feedback')) }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import { useDashboardFeedback } from '~/widgets/dashboard/model/useDashboardFeedback'

const props = defineProps<{
  appVersion: string
}>()

const emit = defineEmits<{
  (event: 'close'): void
}>()

const {
  locale,
  feedbackSubmitted,
  feedbackSubmitting,
  feedbackDailyLimitReached,
  feedbackUploading,
  feedbackUploadProgress,
  feedbackError,
  feedbackAttachments,
  feedbackFieldErrors,
  feedbackForm,
  handleFeedbackAttachment,
  removeFeedbackAttachment,
  submitFeedback
} = useDashboardFeedback(toRef(props, 'appVersion'))
</script>

<style scoped>
.feedback-field {
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
  background: transparent;
  color: #fff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.04em;
  outline: none;
  padding: 0.65rem 0;
  -webkit-font-smoothing: antialiased;
  transition: border-color 180ms ease, background-color 180ms ease;
}

.feedback-field::placeholder {
  color: rgba(255, 255, 255, 0.52);
  font-size: 13px;
  font-weight: 500;
  opacity: 1;
}

.feedback-field:focus {
  border-bottom-color: rgba(255, 255, 255, 0.72);
  background: transparent;
}

.feedback-field[aria-invalid="true"] {
  border-bottom-color: rgba(248, 113, 113, 0.8);
}
</style>
