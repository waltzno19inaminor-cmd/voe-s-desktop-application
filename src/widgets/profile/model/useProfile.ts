import { ref, watch } from 'vue'
import { getAuth, updateProfile, signOut } from 'firebase/auth'
import { doc, getDoc, runTransaction, setDoc } from 'firebase/firestore'
import { db } from '~/shared/firebase.client'
import { useAuthStore } from '~/entities/user/auth.store'
import { useI18n } from '~/shared/i18n/useI18n'
import { useRouter } from 'vue-router'
import { normalizeUserProfileStatuses, type UserProfileStatus } from '~/entities/user/model/user-status.types'

export type ProfileTab = 'PROFILE' | 'APPEARANCE'

export function useProfile() {
  const { locale } = useI18n()
  const authStore = useAuthStore()
  const router = useRouter()

  const activeTab = ref<ProfileTab>('PROFILE')
  const displayName = ref('')
  const description = ref('')
  const isSubmitting = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')
  const profileStatuses = ref<UserProfileStatus[]>([])
  const isLoadingStatuses = ref(false)
  const isSelectingStatus = ref(false)
  const statusSelectionMessage = ref('')
  let profileLoadRequestId = 0

  const loadProfile = async () => {
    const requestId = ++profileLoadRequestId
    const userId = authStore.user?.uid

    if (!userId) {
      profileStatuses.value = []
      isLoadingStatuses.value = false
      return
    }

    isLoadingStatuses.value = true
    profileStatuses.value = []
    statusSelectionMessage.value = ''

    try {
      displayName.value = authStore.user.displayName || ''
      try {
        const userDoc = await getDoc(doc(db, 'users', userId))
        if (requestId !== profileLoadRequestId) return

        if (userDoc.exists()) {
          const data = userDoc.data()
          if (data.description) {
            description.value = data.description
          }
          profileStatuses.value = normalizeUserProfileStatuses(data.status)
        }
      } catch (e) {
        if (requestId !== profileLoadRequestId) return
        console.error('Failed to load user profile description', e)
      }
    } finally {
      if (requestId === profileLoadRequestId) {
        isLoadingStatuses.value = false
      }
    }
  }

  const selectProfileStatus = async (statusName: string) => {
    statusSelectionMessage.value = ''
    if (!authStore.user || !statusName) {
      statusSelectionMessage.value = locale.value === 'ru' ? 'Не удалось выбрать статус.' : 'Unable to select status.'
      return
    }

    isSelectingStatus.value = true
    try {
      const userRef = doc(db, 'users', authStore.user.uid)
      const selectedStatuses = await runTransaction(db, async (transaction) => {
        const userSnapshot = await transaction.get(userRef)
        if (!userSnapshot.exists()) {
          throw new Error('User profile does not exist.')
        }

        const currentStatuses = normalizeUserProfileStatuses(userSnapshot.data().status)
        const targetIndex = currentStatuses.findIndex((status) => status.name === statusName)
        if (targetIndex < 0) {
          throw new Error('This status is no longer available.')
        }

        const updatedStatuses = currentStatuses.map((status, index) => ({
          ...status,
          isSelected: index === targetIndex
        }))

        transaction.set(userRef, { status: updatedStatuses }, { merge: true })
        return updatedStatuses
      })

      profileStatuses.value = selectedStatuses
      statusSelectionMessage.value = locale.value === 'ru' ? 'Статус активирован.' : 'Status activated.'
    } catch (error) {
      console.error('Failed to select profile status:', error)
      statusSelectionMessage.value = locale.value === 'ru'
        ? 'Не удалось обновить статус.'
        : 'Unable to update status.'
    } finally {
      isSelectingStatus.value = false
    }
  }

  const navigateBack = () => {
    router.push('/')
  }

  const handleSignOut = async () => {
    try {
      const auth = getAuth()
      await signOut(auth)
      authStore.clearUser()
      navigateBack()
    } catch (error: any) {
      console.error('Failed to sign out', error)
    }
  }

  const saveProfile = async () => {
    errorMessage.value = ''
    successMessage.value = ''
    
    if (!authStore.user) {
      errorMessage.value = locale.value === 'ru' ? 'Ошибка аутентификации' : 'Authentication error'
      return
    }

    const trimmedName = displayName.value.trim()
    const trimmedDesc = description.value.trim()
    
    if (!trimmedName) {
      errorMessage.value = locale.value === 'ru' ? 'Никнейм обязателен' : 'Nickname is required'
      return
    }

    isSubmitting.value = true

    try {
      const auth = getAuth()
      const currentUser = auth.currentUser
      
      if (currentUser) {
        await updateProfile(currentUser, {
          displayName: trimmedName
        })
      }
      
      const userRef = doc(db, 'users', authStore.user.uid)
      await setDoc(userRef, {
        displayName: trimmedName,
        description: trimmedDesc
      }, { merge: true })
      
      if (authStore.user) {
        authStore.user.displayName = trimmedName
      }

      successMessage.value = locale.value === 'ru' ? 'ПРОФИЛЬ УСПЕШНО ОБНОВЛЕН' : 'PROFILE SUCCESSFULLY UPDATED'
      
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)

    } catch (error: any) {
      console.error('Failed to update profile:', error)
      errorMessage.value = `${locale.value === 'ru' ? 'ОШИБКА' : 'ERROR'}: ${error.message}`
    } finally {
      isSubmitting.value = false
    }
  }

  watch(() => authStore.user?.uid, (userId) => {
    if (userId) {
      void loadProfile()
      return
    }

    profileLoadRequestId += 1
    profileStatuses.value = []
    isLoadingStatuses.value = false
  }, { immediate: true })

  return {
    activeTab,
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
    handleSignOut,
    navigateBack,
    locale
  }
}
