<template>
  <Teleport to="body">
    <Transition name="fade-blur">
      <div v-if="isOpen" 
           class="fixed inset-0 z-[10050] flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-8 overflow-hidden"
           @click.self="closeOverlay">
        
        <!-- Decorative Background Elements -->
        <div class="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
          <div class="w-[800px] h-[800px] rounded-full border border-white/5 animate-spin-slow"></div>
          <div class="absolute w-[600px] h-[600px] rounded-full border border-[#FF424D]/10 animate-reverse-spin"></div>
          <div class="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#FF424D]/20 to-transparent top-1/2"></div>
        </div>

        <!-- Main Panel -->
        <ExPanel 
          variant="light" 
          :title="locale === 'ru' ? 'ПОЛНЫЙ ДОСТУП' : 'FULL ACCESS'" 
          class="relative w-full max-w-2xl shadow-[0_0_100px_rgba(255,66,77,0.1)] group z-10 border-white/10"
        >
          <div class="flex flex-col items-center w-full h-full relative z-10">
            
            <!-- Action Area -->
            <div class="w-full flex flex-col sm:flex-row items-center gap-4 mt-2">
              <button
                @click="openPatreon"
                class="relative flex-1 group/btn w-full overflow-hidden border border-[#FF424D]/50 hover:border-[#FF424D] bg-[#FF424D]/5 hover:bg-[#FF424D]/15 transition-all duration-500 py-5 px-6 flex items-center justify-center gap-4"
              >
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-[#FF424D]/20 to-transparent -translate-x-[100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>
                <svg class="w-6 h-6 fill-[#FF424D] drop-shadow-[0_0_8px_rgba(255,66,77,0.8)]" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2"><g transform="matrix(.47407 0 0 .47407 .383 .422)"><clipPath id="prefix__a"><path d="M0 0h1080v1080H0z"/></clipPath><g clip-path="url(#prefix__a)"><path d="M1033.05 324.45c-.19-137.9-107.59-250.92-233.6-291.7-156.48-50.64-362.86-43.3-512.28 27.2-181.1 85.46-237.99 272.66-240.11 459.36-1.74 153.5 13.58 557.79 241.62 560.67 169.44 2.15 194.67-216.18 273.07-321.33 55.78-74.81 127.6-95.94 216.01-117.82 151.95-37.61 255.51-157.53 255.29-316.38z" fill-rule="nonzero"/></g></g></svg>
                <span class="text-xs sm:text-sm font-black tracking-[0.2em] uppercase text-white group-hover/btn:text-white transition-colors relative z-10 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                  {{ locale === 'ru' ? 'ОФОРМИТЬ ПОДПИСКУ НА PATREON' : 'GET THE FULL APP ON PATREON' }}
                </span>
              </button>
              
              <button 
                @click="closeOverlay"
                class="flex-none px-10 py-5 border border-white/20 text-white/60 hover:text-white hover:bg-white/5 transition-all uppercase tracking-[0.2em] font-bold text-xs"
              >
                {{ locale === 'ru' ? 'ЗАКРЫТЬ' : 'CLOSE' }}
              </button>
            </div>
            
            <p class="text-[9px] font-mono tracking-widest text-white/40 uppercase mt-8 text-center max-w-md leading-relaxed">
              {{ locale === 'ru' ? 'После оформления подписки полный доступ к продвинутым инструментам будет открыт автоматически.' : 'Access to all advanced tools and the analytical matrix will be unlocked immediately upon subscription.' }}
            </p>

          </div>
        </ExPanel>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { open } from '@tauri-apps/plugin-shell'
import { useI18n } from '~/shared/i18n/useI18n'
import ExPanel from '~/shared/ui/ExPanel.vue'

const { locale } = useI18n()

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['close'])

const openPatreon = async () => {
  try {
    await open('https://www.patreon.com/cw/jlgandr')
  } catch (error) {
    console.error('Failed to open external link', error)
  }
}

const closeOverlay = () => {
  emit('close')
}
</script>

<style scoped>
.fade-blur-enter-active, .fade-blur-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-blur-enter-from, .fade-blur-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
}
.fade-blur-enter-to, .fade-blur-leave-from {
  opacity: 1;
  backdrop-filter: blur(24px);
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes reverse-spin {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

.animate-spin-slow {
  animation: spin-slow 20s linear infinite;
}

.animate-reverse-spin {
  animation: reverse-spin 15s linear infinite;
}
</style>
