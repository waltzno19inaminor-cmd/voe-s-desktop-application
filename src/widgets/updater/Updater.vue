<template>
  <div v-if="updateAvailable || isInstalling" class="fixed inset-0 z-[99999] bg-[#f7f5fa]/90 dark:bg-[#121212]/90 flex flex-col items-center justify-center px-6 text-center backdrop-blur-md transition-all duration-500">
    
    <div class="w-full max-w-md mx-auto my-auto rounded-xl px-8 py-12 bg-white dark:bg-[#1a1a1a] shadow-2xl border border-black/5 dark:border-white/5">
      
      <!-- Installing Animation -->
      <div v-if="isInstalling" class="flex flex-col items-center justify-center space-y-8 py-8">
        <div class="relative w-12 h-12">
          <div class="absolute inset-0 rounded-full border border-black/20 dark:border-white/20"></div>
          <div class="absolute inset-0 rounded-full border border-black dark:border-white border-t-transparent animate-spin"></div>
        </div>
        <div class="space-y-2">
          <h2 class="text-2xl font-serif tracking-wide text-[#121212] dark:text-white">
            Installing Update...
          </h2>
          <p class="text-sm text-[#666] dark:text-[#aaa]">
            Please wait while we prepare the new version.
          </p>
        </div>
      </div>

      <!-- Update Available UI -->
      <div v-else-if="updateAvailable" class="flex flex-col items-center animate-in fade-in zoom-in duration-300">
        
        <h2 class="mb-2 text-2xl font-serif tracking-wide text-[#121212] dark:text-white">New Version Available</h2>
        <p class="mb-8 text-sm text-[#666] dark:text-[#aaa]">
          Version {{ update?.version }} is ready to be installed.
        </p>
        
        <div class="w-full text-left bg-[#f9f9f9] dark:bg-[#111] border border-black/10 dark:border-white/10 rounded-lg p-5 mb-8 max-h-48 overflow-y-auto custom-scrollbar">
          <h4 class="text-xs uppercase tracking-widest text-[#555] dark:text-[#aaa] mb-4">
            Release Notes
          </h4>
          <div class="text-sm text-[#333] dark:text-[#ddd] whitespace-pre-wrap leading-relaxed">{{ update?.body || 'No release notes provided.' }}</div>
        </div>
        
        <div class="flex flex-col gap-4 w-full">
          <button 
            @click="installUpdate" 
            class="w-full rounded-full border border-black bg-black px-6 py-3 text-sm font-serif uppercase tracking-widest text-white transition hover:bg-transparent hover:text-black dark:border-white dark:bg-white dark:text-black dark:hover:bg-transparent dark:hover:text-white"
          >
            Download & Install
          </button>
          <button 
            @click="dismissUpdate" 
            class="w-full mt-2 text-xs font-serif uppercase tracking-widest text-[#666] dark:text-[#aaa] hover:text-black dark:hover:text-white transition"
          >
            Skip for now
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ask, message } from '@tauri-apps/plugin-dialog'
import { check } from '@tauri-apps/plugin-updater'
import type { DownloadEvent } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { ref, shallowRef, onMounted } from 'vue'

const emit = defineEmits(['done'])

const isChecking = ref(true)
const updateAvailable = ref(false)
const update = shallowRef<any>(null)
const isInstalling = ref(false)

const finish = () => {
  emit('done')
}


const checkForUpdates = async () => {
  const isTauri = typeof window !== 'undefined' && 
                 ('__TAURI_INTERNALS__' in window || '__TAURI__' in window || window.navigator.userAgent.includes('Tauri'))
  
  if (!isTauri) {
    finish()
    return
  }
  
  try {
    const fetchedUpdate = await check();
    
    if (fetchedUpdate) {
      update.value = fetchedUpdate;
      updateAvailable.value = true;
    } else {
      finish();
    }
  } catch (error) {
    // SILENT FAIL! No UI, no loading screens. Just abort.
    finish();
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
    // Allow the user to enter normal app if installation failed
    finish()
  }
}

const dismissUpdate = () => {
  updateAvailable.value = false
  finish()
}

// Check for updates on mount
onMounted(() => {
  setTimeout(() => {
    checkForUpdates()
  }, 1000)
})

defineExpose({
  checkForUpdates
})
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5); /* gray-400 */
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(75, 85, 99, 0.5); /* gray-600 */
}
</style>
