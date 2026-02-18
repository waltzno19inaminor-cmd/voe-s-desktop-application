<template>
    <div class="absolute mt-2 w-36 right-0 dark:shadow-black  shadow-black/20
                  bg-white dark:bg-[#121212]
                  border border-black/10 dark:border-white/10
                  shadow-md rounded-xl
                  z-50 py-2">
                  <div
                  class="flex flex-col gap-1 px-4 py-2
                        text-sm font-serif
                        text-[#121212] dark:text-white"
                >
                  <NuxtLink  :to="{
                          path: '/profile',
                          query: { uid: auth.user?.uid }
                        }"
                  class="text-left px-2 py-2 rounded-md
                            hover:bg-black/5 dark:hover:bg-white/10
                            transition">
                    <button
                    @click="methods = !methods"
                      >
                      Profile
                     </button>
                  </NuxtLink>

                  <div class="border-t border-black/10 dark:border-white/10"></div>

                  <button
                  @click="auth.clearUser(), methods = !methods"
                  class="text-left px-2 py-2 rounded-md
                        text-[#777]
                        hover:text-[#121212]
                        hover:bg-black/5
                        dark:hover:bg-white/10
                        transition"
                >
                  Logout
                </button>

                </div>

              
    </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/entities/user/auth.store';
import { methods } from '~/widgets/header/model/useHeader';

const auth = useAuthStore()
</script>