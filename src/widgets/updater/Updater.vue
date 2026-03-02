<template>
  <div class="fixed inset-0 z-[99999] bg-[#f7f5fa] dark:bg-[#121212] flex flex-col items-center justify-center px-6 text-center backdrop-blur-lg">
    
    <div class="w-full max-w-md mx-auto my-auto rounded-xl px-8 py-12">
      <!-- Loading Animation -->
      <div v-if="isChecking || isInstalling" class="flex flex-col items-center justify-center space-y-8">
        <div class="relative w-12 h-12">
          <div class="absolute inset-0 rounded-full border border-black/20 dark:border-white/20"></div>
          <div class="absolute inset-0 rounded-full border border-black dark:border-white border-t-transparent animate-spin"></div>
        </div>
        <div class="space-y-2">
          <h2 class="text-2xl font-serif tracking-wide text-[#121212] dark:text-white">
            {{ isInstalling ? 'Installing Update...' : 'Checking for Updates...' }}
          </h2>
          <p class="text-sm text-[#666] dark:text-[#aaa]">
            {{ isInstalling ? 'Please wait while we prepare the new version.' : 'Making sure you have the latest features.' }}
          </p>
        </div>
      </div>

      <!-- Update Available UI -->
      <div v-else-if="updateAvailable" class="flex flex-col items-center animate-in fade-in zoom-in duration-300">
        
        <h2 class="mb-2 text-2xl font-serif tracking-wide text-[#121212] dark:text-white">New Version Available</h2>
        <p class="mb-8 text-sm text-[#666] dark:text-[#aaa]">
          Version {{ update?.version }} is ready to be installed.
        </p>
        
        <div class="w-full text-left bg-transparent border border-black/10 dark:border-white/10 rounded-lg p-5 mb-8 max-h-48 overflow-y-auto custom-scrollbar">
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

      <!-- Fallback -->
      <div v-else class="text-sm text-[#666] dark:text-[#aaa]">
        Loading...
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

const checkForUpdates = async () => {
  // Check if running in Tauri. Under Tauri plugin v2, `__TAURI_INTERNALS__` or `__TAURI_OS__` are reliable,
  // but let's make it broad enough to catch dev versions too.
  const isTauri = typeof window !== 'undefined' && 
                 ('__TAURI_INTERNALS__' in window || '__TAURI__' in window || window.navigator.userAgent.includes('Tauri'))
  
  if (!isTauri) {
    console.log('Not running in Tauri, skipping update check')
    finish()
    return
  }
  
  isChecking.value = true
  try {
    const fetchedUpdate = await check()
    if (fetchedUpdate) {
      update.value = fetchedUpdate
      updateAvailable.value = true
    } else {
      // No updates found, continue to app
      finish()
    }
  } catch (error) {
    console.error('Failed to check for updates:', error)
    // On error (e.g., no internet), fail gracefully and let user into app
    finish()
  } finally {
    isChecking.value = false
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

const finish = () => {
  emit('done')
}

// Check for updates on mount
onMounted(() => {
  // Add a small artificial delay so the splash screen doesn't just flash instantly
  // if internet is fast or no update check is needed. (optional, adjust as needed)
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
