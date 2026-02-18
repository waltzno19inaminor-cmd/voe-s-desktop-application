<template>
    <div class="relative">
       
        <button
            @click="showNotifications"
            class="w-5 h-5 flex items-center justify-center relative" :class="isAllNotificationsRead ? 'animate-none' : 'animate-bounce'"
        >
        
            <img src="/assets/alert-black.svg" class="block dark:hidden" />
            <img src="/assets/alert-white.svg" class="hidden dark:block z-40" />

           
        </button>


        <div
            v-if="isNotificationOpen"
            class="fixed mr-4 right-0 md:mr-auto md:left-auto md:translate-x-0 md:absolute mt-10 md:mt-6 w-80 dark:shadow-black 
                bg-white dark:bg-[#121212]
                border border-black/10 dark:border-white/10
                dark:shadow-md  shadow-md shadow-black/20 rounded-xl
                z-50 min-h-0 max-h-[calc(100vh-64px)] overflow-y-auto"
        >

        
            <div class="px-5 py-4 border-b border-black/10 dark:border-white/10">
                <div class="flex items-center justify-between">
                    <h3 class="text-xs uppercase tracking-widest text-[#777]">
                        Notifications
                    </h3>
                    <button @click="readAllNotifications" class="text-xs text-[#777] hover:text-black dark:hover:text-white">Read All</button>
                </div>
           
            </div>

            <div class="max-h-80 overflow-y-auto divide-y dark:divide-white/10 divide-black/5 flex flex-col-reverse">

          
            <div v-if="notifications.length === 0" class="px-5 py-8 text-sm text-[#777] italic text-center">
                Nothing to see yet
            </div>

            <Notification v-else
                v-for="notification in notifications"
                :key="notification.id"
                :notification="notification"
            />

            
            

            </div>
        </div>

    </div>

</template>

<script setup lang="ts">
import { isNotificationOpen } from '../model/useNotifications';
import Notification from '~/entities/notification/ui/Notification.vue';
import { onBeforeMount, computed } from 'vue';
import { useNotificationStore } from '~/features/store/useNotifications';
import { methods } from '~/widgets/header/model/useHeader';
import { useAuthStore } from '~/entities/user/auth.store';

const auth = useAuthStore();

const notification = useNotificationStore();

const notifications = computed(() => notification.notifications);


const showNotifications = () => {
    isNotificationOpen.value = !isNotificationOpen.value;
    methods.value = false;
}

onBeforeMount(() =>{
    isNotificationOpen.value = false;
})


const isAllNotificationsRead = computed(() => {
    return notifications.value.every(notification => notification.isRead);
})

async function readAllNotifications() {
    if(!auth.user?.uid) return;

    await notification.readAllNotifications(auth.user.uid);
}
</script>