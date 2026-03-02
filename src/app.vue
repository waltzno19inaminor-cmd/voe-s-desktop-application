<template>
  <div
    class="min-h-screen bg-[#f7f5fa] bg-center bg-cover dark:bg-none dark:bg-[#121212]"
  >
    <template v-if="updaterDone">
      <NuxtPage />
    </template>
    <template v-else>
      <Updater @done="updaterDone = true" />
    </template>
  </div>
</template>


<script setup>
import { ref, watchEffect } from 'vue'
import Updater from '~/widgets/updater/Updater.vue'
import { useAuthStore } from '~/entities/user/auth.store'
import { useAuthInit } from '~/features/auth/useAuthInit'
import { useRoute } from 'vue-router'

const route = useRoute()
const auth = useAuthStore()

const updaterDone = ref(false)

await useAuthInit()


watchEffect(() => {
  if (!auth.authReady) return
  if (route.meta.public) return

  if (!auth.isAuthenticated) {
    navigateTo({
      path: '/login',
      query: { redirect: route.fullPath }
    })
  }
})
</script>

<style>


*::-webkit-scrollbar {
  width: 0px;
  height: 0px;
}

* {
  scrollbar-width: none;
}

* {
  -ms-overflow-style: none;
}
</style>
