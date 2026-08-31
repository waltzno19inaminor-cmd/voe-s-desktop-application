import { onUnmounted, ref, type Ref } from 'vue'
import { getAuth } from 'firebase/auth'
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '~/shared/firebase.client'
import { useAuthStore } from '~/entities/user/auth.store'
import { useI18n } from '~/shared/i18n/useI18n'
import { uploadToCloudinary } from '~/shared/lib/cloudinary'

type FeedbackAttachment = {
  name: string
  url: string
  publicId: string
}

export function useDashboardFeedback(appVersion: Ref<string>) {
  const { locale } = useI18n()
  const authStore = useAuthStore()

  const feedbackSubmitted = ref(false)
  const feedbackSubmitting = ref(false)
  const feedbackDailyLimitReached = ref(false)
  const feedbackUploading = ref(false)
  const feedbackUploadProgress = ref(0)
  const feedbackUploadRequestId = ref(0)
  const feedbackError = ref('')
  const feedbackAttachments = ref<FeedbackAttachment[]>([])
  const feedbackFieldErrors = ref({
    title: '',
    message: ''
  })
  const feedbackForm = ref({
    title: '',
    message: ''
  })

  const revokeFeedbackAttachments = () => {
    feedbackAttachments.value.forEach(attachment => {
      if (attachment.url.startsWith('blob:')) URL.revokeObjectURL(attachment.url)
    })
  }

  const resetFeedbackForm = () => {
    feedbackUploadRequestId.value += 1
    revokeFeedbackAttachments()
    feedbackForm.value = { title: '', message: '' }
    feedbackAttachments.value = []
    feedbackUploading.value = false
    feedbackUploadProgress.value = 0
    feedbackDailyLimitReached.value = false
    feedbackFieldErrors.value = { title: '', message: '' }
    feedbackError.value = ''
    feedbackSubmitted.value = false
  }

  const handleFeedbackAttachment = (event: Event) => {
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files ?? [])
    if (!files.length) return

    const availableSlots = 3 - feedbackAttachments.value.length
    if (availableSlots <= 0) {
      feedbackError.value = locale.value === 'ru' ? 'Можно прикрепить не более 3 изображений.' : 'You can attach no more than 3 images.'
      input.value = ''
      return
    }

    if (files.some(file => file.size > 5 * 1024 * 1024)) {
      feedbackError.value = locale.value === 'ru' ? 'Каждый файл должен быть меньше 5 МБ.' : 'Each file must be smaller than 5 MB.'
      input.value = ''
      return
    }

    if (files.some(file => !file.type.startsWith('image/'))) {
      feedbackError.value = locale.value === 'ru' ? 'Можно прикреплять только изображения.' : 'Only image files can be attached.'
      input.value = ''
      return
    }

    input.value = ''

    const filesToUpload = files.slice(0, availableSlots)
    const uploadRequestId = ++feedbackUploadRequestId.value
    feedbackError.value = files.length > availableSlots
      ? (locale.value === 'ru' ? 'Можно прикрепить не более 3 изображений.' : 'You can attach no more than 3 images.')
      : ''
    feedbackUploading.value = true
    feedbackUploadProgress.value = 0

    void (async () => {
      try {
        for (let index = 0; index < filesToUpload.length; index += 1) {
          const file = filesToUpload[index]
          const result = await uploadToCloudinary(file, progress => {
            if (uploadRequestId !== feedbackUploadRequestId.value) return
            const completedFilesProgress = index * 100
            feedbackUploadProgress.value = Math.round((completedFilesProgress + progress) / filesToUpload.length)
          })

          if (uploadRequestId !== feedbackUploadRequestId.value) return
          if (!result?.secure_url) throw new Error('Cloudinary did not return an image URL')
          feedbackAttachments.value.push({
            name: file.name,
            url: result.secure_url,
            publicId: result.public_id || ''
          })
        }
        feedbackUploadProgress.value = 100
      } catch (error) {
        if (uploadRequestId !== feedbackUploadRequestId.value) return
        console.error('[ExDashboardFeedback] Cloudinary upload failed:', error)
        feedbackError.value = locale.value === 'ru'
          ? 'Не удалось загрузить изображение. Попробуйте еще раз.'
          : 'Image upload failed. Please try again.'
      } finally {
        if (uploadRequestId === feedbackUploadRequestId.value) {
          feedbackUploading.value = false
        }
      }
    })()
  }

  const removeFeedbackAttachment = (index: number) => {
    const attachment = feedbackAttachments.value[index]
    if (!attachment) return
    if (attachment.url.startsWith('blob:')) URL.revokeObjectURL(attachment.url)
    feedbackAttachments.value.splice(index, 1)
  }

  const submitFeedback = async () => {
    if (feedbackDailyLimitReached.value) return

    const title = feedbackForm.value.title.trim()
    const message = feedbackForm.value.message.trim()
    feedbackFieldErrors.value = {
      title: title ? '' : (locale.value === 'ru' ? 'Введите заголовок отзыва.' : 'Enter a feedback title.'),
      message: message ? '' : (locale.value === 'ru' ? 'Введите сообщение.' : 'Enter a message.')
    }

    if (!title || !message) {
      feedbackError.value = ''
      return
    }

    if (feedbackUploading.value) {
      feedbackError.value = locale.value === 'ru' ? 'Дождитесь завершения загрузки изображений.' : 'Wait for the images to finish uploading.'
      return
    }

    const firebaseUser = getAuth().currentUser
    const userId = authStore.user?.uid || firebaseUser?.uid
    if (!userId) {
      feedbackError.value = locale.value === 'ru' ? 'Не удалось определить пользователя. Войдите в аккаунт и повторите попытку.' : 'Unable to identify the user. Sign in and try again.'
      return
    }

    feedbackError.value = ''
    feedbackSubmitting.value = true
    const feedbackRef = doc(collection(db, 'feedback'))
    const feedbackLimitRef = doc(db, 'feedbackLimits', userId)

    try {
      await runTransaction(db, async transaction => {
        const limitSnapshot = await transaction.get(feedbackLimitRef)

        if (limitSnapshot.exists()) {
          const lastSubmittedAt = limitSnapshot.data().lastSubmittedAt
          if (
            lastSubmittedAt &&
            typeof lastSubmittedAt.toMillis === 'function' &&
            Date.now() - lastSubmittedAt.toMillis() < 24 * 60 * 60 * 1000
          ) {
            throw new Error('FEEDBACK_DAILY_LIMIT')
          }
        }

        transaction.set(feedbackRef, {
          title,
          message,
          attachments: feedbackAttachments.value.map(({ name, url, publicId }) => ({ name, url, publicId })),
          userId,
          user: {
            displayName: authStore.user?.displayName || firebaseUser?.displayName || null,
            email: authStore.user?.email || firebaseUser?.email || null
          },
          source: 'dashboard',
          appVersion: appVersion.value,
          status: 'new',
          createdAt: serverTimestamp()
        })

        transaction.set(feedbackLimitRef, {
          userId,
          lastSubmittedAt: serverTimestamp(),
          lastFeedbackId: feedbackRef.id
        })
      })
      feedbackSubmitted.value = true
    } catch (error) {
      console.error('[ExDashboardFeedback] Feedback write failed:', error)
      if (error instanceof Error && error.message === 'FEEDBACK_DAILY_LIMIT') {
        feedbackDailyLimitReached.value = true
        feedbackError.value = locale.value === 'ru'
          ? 'Вы уже отправляли отзыв за последние 24 часа. Новая отправка будет доступна позже.'
          : 'You have already submitted feedback within the last 24 hours. You can send another one later.'
      } else {
        feedbackError.value = locale.value === 'ru'
          ? 'Не удалось сохранить отзыв. Попробуйте еще раз.'
          : 'Could not save the feedback. Please try again.'
      }
    } finally {
      feedbackSubmitting.value = false
    }
  }

  onUnmounted(() => {
    feedbackUploadRequestId.value += 1
    revokeFeedbackAttachments()
  })

  return {
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
    submitFeedback,
    resetFeedbackForm
  }
}
