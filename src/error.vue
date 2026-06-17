<template>
  <div class="min-h-screen flex flex-col bg-[#FFFFFF] bg-center bg-cover dark:bg-none dark:bg-[#050505]">
  
    
    <main class="flex-grow flex flex-col items-center justify-center text-center px-4">
      <h1 class="text-9xl font-serif nier-text-primary opacity-10 mb-4">
        {{ error?.statusCode || '404' }}
      </h1>
      
      <h2 class="text-3xl md:text-4xl font-serif nier-text-primary mb-6">
        {{ error?.message || t('error.pageNotFound') }}
      </h2>
      

      <button 
        @click="handleError"
        class="text-sm text-white nier-bg-inverted dark:text-black px-8 py-3 rounded-full hover:opacity-80 transition-opacity"
      >
        {{ t('error.goBackHome') }}
      </button>
    </main>

 
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '~/shared/i18n/useI18n'

const { t } = useI18n()
const error = useError()

const handleError = () => {
  clearError({ redirect: '/' })
}
</script>