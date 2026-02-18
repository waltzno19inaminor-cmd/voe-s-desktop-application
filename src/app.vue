<template>
  <div
    class="min-h-screen bg-[#f7f5fa] bg-center bg-cover dark:bg-none dark:bg-[#121212]"
  >
    <NuxtPage />
  </div>
</template>


<script setup>
import { useAuthStore } from '~/entities/user/auth.store'
import { useAuthInit } from '~/features/auth/useAuthInit'
import { watchEffect } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const auth = useAuthStore()

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
