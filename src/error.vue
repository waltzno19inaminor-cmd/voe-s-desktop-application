<template>
  <div class="min-h-screen flex flex-col bg-[#f7f5fa] bg-center bg-cover dark:bg-none dark:bg-[#121212]">
    <Header />
    
    <main class="flex-grow flex flex-col items-center justify-center text-center px-4">
      <h1 class="text-9xl font-serif text-black dark:text-white opacity-10 mb-4">
        {{ error?.statusCode || '404' }}
      </h1>
      
      <h2 class="text-3xl md:text-4xl font-serif text-black dark:text-white mb-6">
        {{ error?.message || 'Page not found' }}
      </h2>
      
      <p class="text-black/60 dark:text-white/60 mb-10 max-w-md mx-auto">
        We can't seem to find the page you're looking for. It might have been moved or doesn't exist.
      </p>

      <button 
        @click="handleError"
        class="text-sm text-white bg-black dark:bg-white dark:text-black px-8 py-3 rounded-full hover:opacity-80 transition-opacity"
      >
        Go Back Home
      </button>
    </main>

    <Footer />
  </div>
</template>

<script setup lang="ts">
import Header from '~/widgets/header/ui/Header.vue'
import Footer from '~/widgets/footer/Footer.vue'

const error = useError()

const handleError = () => {
  clearError({ redirect: '/' })
}
</script>