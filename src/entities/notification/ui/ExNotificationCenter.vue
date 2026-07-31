<template>
  <div ref="centerRef" class="notification-center relative">
    <button
      type="button"
      class="notification-trigger relative flex h-8 w-8 items-center justify-center transition-opacity duration-200 hover:opacity-100"
      :class="unreadCount ? 'opacity-100' : 'opacity-45'"
      :aria-label="locale === 'ru' ? 'Уведомления' : 'Notifications'"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="square" aria-hidden="true" class="h-[19px] w-[19px]">
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
      <span v-if="unreadCount" class="notification-trigger__signal" aria-hidden="true">
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <Transition name="notification-panel">
      <section
        v-if="isOpen"
        class="notification-panel absolute right-0 top-[calc(100%+12px)] z-[10020] flex w-[min(370px,calc(100vw-32px))] flex-col overflow-hidden border border-theme-border bg-theme-bg shadow-[0_22px_50px_rgba(0,0,0,0.16)] dark:shadow-[0_22px_50px_rgba(0,0,0,0.5)]"
        :aria-label="locale === 'ru' ? 'Список уведомлений' : 'Notification list'"
      >
        <header class="flex items-center justify-between gap-4 border-b border-theme-border px-5 py-4">
          <div class="min-w-0">
            <p class="font-mono text-[10px] font-black uppercase tracking-[0.25em]">
              {{ locale === 'ru' ? 'Уведомления' : 'Notifications' }}
            </p>
            <p class="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-theme-text/45">
              {{ unreadCount ? (locale === 'ru' ? `Новых: ${unreadCount}` : `${unreadCount} unread`) : (locale === 'ru' ? 'Всё прочитано' : 'All caught up') }}
            </p>
          </div>
          <button
            v-if="unreadCount"
            type="button"
            class="shrink-0 font-mono text-[8px] font-black uppercase tracking-[0.13em] text-theme-text/65 transition-opacity hover:opacity-100"
            @click="markAllAsRead"
          >
            {{ locale === 'ru' ? 'Прочитать все' : 'Mark all read' }}
          </button>
        </header>

        <div v-if="userId && !isReady" class="flex h-28 items-center justify-center">
          <span class="notification-loader" aria-label="Loading" />
        </div>

        <div v-else-if="notifications.length" class="notification-list max-h-[min(420px,calc(100vh-150px))] overflow-y-auto">
          <button
            v-for="notification in notifications"
            :key="notification.id"
            type="button"
            class="notification-item relative block w-full border-b border-theme-border px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-theme-text/[0.045]"
            :class="notification.isRead ? 'opacity-55' : 'opacity-100'"
            @click="markAsRead(notification.id)"
          >
            <span v-if="!notification.isRead" class="notification-item__unread" aria-hidden="true" />
            <span class="block pr-4 font-mono text-[8px] font-black uppercase tracking-[0.16em] text-theme-text/45">
              {{ notification.type === 'event' ? eventMeta(notification) : typeLabel(notification.type) }} · {{ timeAgo(notification.createdAt) }}
            </span>
            <span class="mt-2 block pr-4 font-mono text-[11px] leading-relaxed tracking-[0.04em] text-theme-text/90">
              {{ notificationContent(notification) }}
              <strong v-if="notification.type === 'event'" class="notification-item__award ml-1.5 font-black tracking-[0.08em]">
                {{ eventAward(notification) }}
              </strong>
            </span>
          </button>
        </div>

        <div v-else class="flex h-36 items-center justify-center px-8 text-center">
          <p class="font-mono text-[9px] font-black uppercase tracking-[0.17em] text-theme-text/40">
            {{ locale === 'ru' ? 'Новых уведомлений нет' : 'No notifications yet' }}
          </p>
        </div>
      </section>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { timeAgo } from '~/composables/timeAgo'
import type { EventNotification, Notification, NotificationType } from '~/entities/notification/model/notification.types'
import { useNotificationStore } from '~/features/store/useNotifications'

const props = defineProps<{
  userId?: string | null
  locale: 'ru' | 'en'
}>()

const notificationStore = useNotificationStore()
const centerRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const notifications = computed(() => notificationStore.notifications)
const unreadCount = computed(() => notificationStore.unreadCount)
const isReady = computed(() => notificationStore.isReady)

const markAsRead = async (notificationId: string) => {
  await notificationStore.markNotificationAsRead(notificationId)
}

const markAllAsRead = async () => {
  await notificationStore.readAllNotifications(props.userId || '')
}

const typeLabel = (type: NotificationType) => {
  const labels: Record<NotificationType, [string, string]> = {
    reply_to_you: ['Ответ', 'Reply'],
    reply_to_thread: ['Обсуждение', 'Thread'],
    thread_created: ['Статья', 'Article'],
    mentioned: ['Упоминание', 'Mention'],
    saved: ['Сохранено', 'Saved'],
    followed: ['Подписка', 'Follow'],
    system: ['Система', 'System'],
    tournament: ['Событие', 'Event'],
    leaderboard: ['Лидеры', 'Leaders'],
    event: ['Событие', 'Event'],
  }

  return labels[type]?.[props.locale === 'ru' ? 0 : 1] || type
}

const eventMeta = (notification: EventNotification) => (
  `${props.locale === 'ru' ? notification.eventNameRu : notification.eventNameEn} · ${props.locale === 'ru' ? 'СЕЗОН' : 'SEASON'} ${notification.season} · ${props.locale === 'ru' ? 'РАУНД' : 'ROUND'} ${notification.round}`
)

const notificationContent = (notification: Notification) => (
  props.locale === 'ru' ? notification.contentRu : notification.contentEn
)

const eventAward = (notification: EventNotification) => {
  if (notification.subtype === 'points') {
    return `${notification.points >= 0 ? '+' : ''}${notification.points} ${props.locale === 'ru' ? 'ОЧКОВ' : 'POINTS'}`
  }

  return notification.prize
}

const handleOutsideClick = (event: MouseEvent) => {
  if (centerRef.value && !centerRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
})
</script>

<style scoped>
.notification-trigger__signal {
  align-items: center;
  animation: notification-signal-pulse 2.2s ease-in-out infinite;
  background: var(--theme-text);
  border: 2px solid var(--theme-bg);
  color: var(--theme-bg);
  display: inline-flex;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 7px;
  font-weight: 900;
  height: 16px;
  justify-content: center;
  line-height: 1;
  min-width: 16px;
  padding: 0 3px;
  position: absolute;
  right: -4px;
  top: 1px;
}

.notification-item__unread {
  background: var(--theme-text);
  height: 5px;
  position: absolute;
  right: 15px;
  top: 17px;
  transform: rotate(45deg);
  width: 5px;
}

.notification-item__award {
  color: var(--theme-text);
  white-space: nowrap;
}

.notification-loader {
  animation: notification-loader-spin 850ms linear infinite;
  border: 1px solid rgb(from var(--theme-text) r g b / 0.18);
  border-top-color: var(--theme-text);
  border-radius: 999px;
  height: 18px;
  width: 18px;
}

.notification-panel-enter-active,
.notification-panel-leave-active {
  transition: opacity 180ms ease, transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

.notification-panel-enter-from,
.notification-panel-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@keyframes notification-signal-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgb(from var(--theme-text) r g b / 0); }
  50% { box-shadow: 0 0 0 4px rgb(from var(--theme-text) r g b / 0.12); }
}

@keyframes notification-loader-spin {
  to { transform: rotate(360deg); }
}
</style>
