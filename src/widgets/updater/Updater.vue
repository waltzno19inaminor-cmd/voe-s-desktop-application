<template>
  <div v-if="updateAvailable" class="fixed bottom-4 right-4 z-50 bg-white dark:bg-[#1e1e1e] p-4 rounded-xl shadow-2xl border border-black/10 dark:border-white/10 max-w-sm">
    <div class="flex items-start gap-4">
      <div class="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
      <div class="flex-1">
        <h3 class="font-bold text-lg mb-1 dark:text-white">Update Available</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-2">Version {{ update?.version }} is ready to install.</p>
        <p v-if="update?.body" class="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-3">{{ update.body }}</p>
        
        <div class="flex gap-2">
          <button 
            @click="installUpdate" 
            :disabled="isInstalling"
            class="flex-1 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isInstalling ? 'Installing...' : 'Install Now' }}
          </button>
          <button 
            @click="dismissUpdate" 
            class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ask, message } from '@tauri-apps/plugin-dialog'
import { check, type DownloadEvent } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { ref, onMounted } from 'vue'

const updateAvailable = ref(false)
const update = ref<any>(null)
const isInstalling = ref(false)

const checkForUpdates = async () => {
  try {
    const fetchedUpdate = await check()
    if (fetchedUpdate) {
      update.value = fetchedUpdate
      updateAvailable.value = true
    }
  } catch (error) {
    console.error('Failed to check for updates:', error)
  }
}

const installUpdate = async () => {
  if (!update.value) return

  isInstalling.value = true
  try {
    let downloaded = 0
    let contentLength = 0
    
    await update.value.downloadAndInstall((event: DownloadEvent) => {
      switch (event.event) {
        case 'Started':
          contentLength = event.data.contentLength || 0
          console.log(`started downloading ${contentLength} bytes`)
          break
        case 'Progress':
          downloaded += event.data.chunkLength
          console.log(`downloaded ${downloaded} from ${contentLength}`)
          break
        case 'Finished':
          console.log('download finished')
          break
      }
    })

    console.log('Update installed')
    await relaunch()
  } catch (error) {
    console.error('Failed to install update:', error)
    await message('Failed to install update. Please try again later.', { title: 'Update Error', kind: 'error' })
    isInstalling.value = false
  }
}

const dismissUpdate = () => {
  updateAvailable.value = false
}

// Check for updates on mount
onMounted(() => {
  checkForUpdates()
})

defineExpose({
  checkForUpdates
})
</script>
