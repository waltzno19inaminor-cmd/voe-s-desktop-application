export type AuthFailureAction = 'login' | 'register' | 'google'

const RU_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'Этот email уже зарегистрирован. Перейдите на вкладку «Вход».',
  'auth/invalid-email': 'Укажите корректный адрес email.',
  'auth/weak-password': 'Пароль недостаточно надёжный. Используйте не менее 8 символов.',
  'auth/wrong-password': 'Неверный email или пароль.',
  'auth/user-not-found': 'Неверный email или пароль.',
  'auth/invalid-credential': 'Неверный email или пароль.',
  'auth/too-many-requests': 'Слишком много попыток. Попробуйте немного позже.'
}

const EN_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'This email is already registered. Switch to the Sign in tab.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/weak-password': 'This password is not strong enough. Use at least 8 characters.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Please try again shortly.'
}

export function getAuthFailureMessage(
  error: unknown,
  locale: 'ru' | 'en',
  action: AuthFailureAction = 'login'
): string {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: unknown }).code || '')
    : ''
  const detail = error instanceof Error ? error.message.trim() : ''
  const messages = locale === 'ru' ? RU_MESSAGES : EN_MESSAGES
  const mappedMessage = messages[code]
  if (mappedMessage) return mappedMessage
  if (action === 'google' && detail) {
    return locale === 'ru' ? `Не удалось войти через Google: ${detail}` : `Google sign-in failed: ${detail}`
  }
  return locale === 'ru'
    ? (action === 'register' ? 'Не удалось создать аккаунт. Попробуйте ещё раз.' : 'Что-то пошло не так. Попробуйте ещё раз.')
    : (action === 'register' ? 'Unable to create the account. Please try again.' : 'Something went wrong. Please try again.')
}
