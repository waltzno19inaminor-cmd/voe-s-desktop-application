<template>
  <header
  >
    <div class=" max-w-6xl w-full mx-auto px-8 pb-5 pt-8">
      <nav class="flex justify-between items-center ">
        <NuxtLink to="/" class="w-20 h-8">
          <img src="/logo.svg" class="dark:hidden w-20"  alt="" />
          <img src="/logo-dark.svg" class="dark:flex hidden" alt="" />
        </NuxtLink>

        <div class="hidden md:flex absolute left-1/2 -translate-x-1/2" v-if="authReady">
          <ul
            class="flex gap-10 text-sm font-serif uppercase tracking-widest dark:text-white text-[#121212]"
          >
            <NuxtLink to="/forum/main">Forum</NuxtLink>
            <NuxtLink to="/forum/creation">Creation</NuxtLink>
             <NuxtLink :to="{
                          path: '/forum/diary',
                          query: { uid: auth.user.uid }
                        }" v-if="auth.user">Diary</NuxtLink>
              <NuxtLink :to="{
                          path: '/login',
                          query: { redirect: '/forum/main' }
                        }" v-else>Diary</NuxtLink>
              <NuxtLink to="/forum/chronicles">Chronicles</NuxtLink>
           
          </ul>
        </div>

        <div class="space-x-4 flex items-center ">
          <button class="w-10 opacity-30 hover:opacity-100 transition-opacity duration-300 relative" @click="reloadPage">
            <img src="/assets/refresh-black.svg" alt="" class="w-6 dark:hidden block">
            <img src="/assets/refresh-white.svg" alt="" class="w-6 dark:block hidden">

          </button>
          <Notifications v-if="auth.user" />
          

          <div v-if="!authReady">
              <div class="text-sm text-white/50 rounded-full flex justify-center items-center px-5 py-3">
                <div class="w-8 h-8 rounded-full">

                </div>
            </div>
          </div>
          <NuxtLink v-else-if="authReady && !auth.user" to="/register">
            <button class="text-sm text-white bg-black px-5 py-3 rounded-full">
              Sign In
            </button>
          </NuxtLink>
          <div v-else-if="authReady && auth.user" class="relative">
            <NuxtLink>
              <button
                @click="showMethods"
                class="text-sm text-white rounded-full flex justify-center items-center px-5 py-3"
              >
                <img
                v-if="auth.user?.photoURL"
                  :src="auth.user.photoURL"
                  class="w-8 h-8 rounded-full"
                  alt="user's photo1"
                  loading="lazy"
                  decoding="async"
                  referrerpolicy="no-referrer"

                />
              
               
              </button>
              <DropdownMenu v-if="methods"/>
            </NuxtLink>
          </div>
          <button
            class="w-6"
            @click="changeTheme"
          >
            <img
              alt=""
              src="/assets/dark-mode-switcher.svg"
              class="dark:hidden"
            />
            <img
              src="/assets/light-mode-switcher.svg"
              class="dark:flex hidden"
              alt=""
            />
          </button>
         
        </div>
      </nav>
    </div>
    <div v-if="auth.error" class="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 animate-bounce">
      <span>{{ auth.error }}</span>
      <button @click="auth.setError(null)" class="hover:bg-red-700 rounded-full p-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup> 
import { useAuthStore } from "~/entities/user/auth.store";
import { storeToRefs } from "pinia";
import { changeTheme } from "~/composables/changeTheme";
import Notifications from "~/widgets/notifications/ui/Notifications.vue";
import { useNotificationStore } from '~/features/store/useNotifications';
import { methods, showMethods, reloadPage, handleScroll, scrollY } from '~/widgets/header/model/useHeader';
import DropdownMenu from "./DropdownMenu.vue";

const auth = useAuthStore();
const { user, authReady } = storeToRefs(auth);
const notification = useNotificationStore();



watch(
  () => auth.user?.uid,
  (uid) => {
    if (!uid) return

    notification.subscribe(uid)

  },
  { immediate: true }
)
</script>
