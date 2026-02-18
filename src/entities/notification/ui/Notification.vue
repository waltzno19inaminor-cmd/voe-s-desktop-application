<template>
     <div @click="goToSource()" v-if="notification" class="px-5 py-4 hover:bg-black/5 text-black dark:text-white space-y-1 dark:hover:bg-white/5 transition cursor-pointer">
                <span class="font-serif opacity-60 text-sm">{{ notification.context?.threadTitle }} by {{ notification.context?.threadAuthor }}</span>
                <p class="text-sm leading-snug">
                <span>{{ notification.actorLabel }}</span> {{ convertNotificationType(notification.type) }} 
                </p>
                <span class="text-xs text-[#999] mt-1 block">
                {{ timeAgo(notification.createdAt) }}
                </span>
        </div>
</template>

<script lang="ts" setup>
import { timeAgo } from '~/composables/timeAgo';
import type { Notification } from '~/entities/notification/model/notification.types';
import { convertNotificationType } from '~/utils/convertNotificationType';
import { useForumStore } from "~/features/store/useForum";
import { onMounted, computed } from 'vue';

import { useRouter } from 'vue-router';

const router = useRouter()

const goToSource = () => {
    switch(props.notification.target?.entity as string){
        case 'reply':
            router.push({ path: `/forum/thread/${props.notification.context?.threadId}`, query: { replyId: props.notification.target.id} })
            break;
        case 'thread':
            router.push({ path: `/forum/thread/${props.notification.context?.threadId}` })
            break;
        case 'user':
            router.push({ path: `/profile/${props.notification.target.id}` })
            break;
        default:
            break;
    }
}

const forum = useForumStore()
interface Props {
    notification: Notification
}

const props = defineProps<Props>();

onMounted(async () => {
    if (props.notification.actorId){
        await forum.fetchUser(props.notification.actorId);
    }
})

const actor = computed(() => {
    if (!props.notification.actorId) return null;
    return forum.users.get(props.notification.actorId);
})
</script>