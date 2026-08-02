<template>
  <Teleport to="body">
    <Transition name="fade-blur">
      <div v-if="isOpen"
           class="fixed inset-0 z-[10050] flex flex-col items-center justify-center backdrop-blur-xl p-4 sm:p-8 overflow-hidden transition-colors duration-500"
           :class="isDark
            ? 'bg-black/80 text-white'
            : 'bg-[#f3f1ea]/85 text-[#171411]'"
           @click.self="closeOverlay">

        <!-- Decorative Background Elements -->
        <div class="absolute inset-0 pointer-events-none opacity-40">
          <div
            class="absolute left-1/2 top-1/2 h-[72vh] w-[72vw] max-w-[980px] -translate-x-1/2 -translate-y-1/2 border transition-colors duration-500"
            :class="isDark ? 'border-white/5' : 'border-black/[0.06]'"
          ></div>
          <div
            class="absolute left-1/2 top-1/2 h-[52vh] w-[52vw] max-w-[720px] -translate-x-1/2 -translate-y-1/2 border transition-colors duration-500"
            :class="isDark ? 'border-[#FF424D]/10' : 'border-[#FF424D]/20'"
          ></div>
          <div
            class="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gradient-to-r from-transparent to-transparent transition-colors duration-500"
            :class="isDark ? 'via-[#FF424D]/20' : 'via-[#171411]/12'"
          ></div>
          <div
            class="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent to-transparent transition-colors duration-500"
            :class="isDark ? 'via-white/5' : 'via-black/[0.08]'"
          ></div>
        </div>

        <!-- Main Panel -->
        <ExPanel
          variant="light"
          :show-corners="true"
          class="relative w-full max-w-2xl group z-10 transition-all duration-500"
          :class="isDark
            ? '!border-white/10 shadow-[0_0_100px_rgba(255,66,77,0.10)]'
            : '!border-black/15 shadow-[0_24px_90px_rgba(23,20,17,0.16)]'"
        >
          <div class="flex flex-col items-center w-full h-full relative z-10">
            <div class="mb-8 flex flex-col items-center text-center">
              <div
                class="mb-5 flex items-center gap-3 text-[8px] font-mono font-black uppercase tracking-[0.55em]"
                :class="isDark ? 'text-white/45' : 'text-black/45'"
              >
                <span
                  class="h-1.5 w-1.5 rotate-45"
                  :class="isDark ? 'bg-[#FF424D]' : 'bg-[#c7343d]'"
                ></span>
                <span>{{ locale === 'ru' ? 'DEMO_BUILD_ACCESS' : 'DEMO_BUILD_ACCESS' }}</span>
                <span
                  class="h-1.5 w-1.5 rotate-45"
                  :class="isDark ? 'bg-[#FF424D]' : 'bg-[#c7343d]'"
                ></span>
              </div>
              <h2
                class="font-serif text-3xl sm:text-4xl font-light uppercase tracking-[0.22em]"
                :class="isDark ? 'text-white' : 'text-[#171411]'"
              >
                {{ locale === 'ru' ? 'ПОЛНЫЙ ДОСТУП' : 'FULL ACCESS' }}
              </h2>
            </div>

            <!-- Action Area -->
            <div class="w-full flex flex-col sm:flex-row items-center gap-4 mt-2">
              <button
                @click="openPatreon"
                class="relative flex-1 group/btn w-full overflow-hidden border transition-all duration-500 py-5 px-6 flex items-center justify-center gap-4"
                :class="'border-[#FF424D]/50 hover:border-[#FF424D] bg-[#FF424D]/5 hover:bg-[#FF424D]/15'"
              >
                <div
                  class="absolute inset-0 bg-gradient-to-r from-transparent to-transparent -translate-x-[100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000 pointer-events-none"
                  :class="isDark ? 'via-[#FF424D]/20' : 'via-white/35'"
                ></div>
                <svg
                  class="w-6 h-6 relative z-10 transition-all duration-500"
                  :class="'fill-[#FF424D] drop-shadow-[0_0_8px_rgba(255,66,77,0.8)]'"
                  viewBox="0 0 512 512"
                  xmlns="http://www.w3.org/2000/svg"
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  stroke-linejoin="round"
                  stroke-miterlimit="2"
                ><g transform="matrix(.47407 0 0 .47407 .383 .422)"><clipPath id="prefix__a"><path d="M0 0h1080v1080H0z"/></clipPath><g clip-path="url(#prefix__a)"><path d="M1033.05 324.45c-.19-137.9-107.59-250.92-233.6-291.7-156.48-50.64-362.86-43.3-512.28 27.2-181.1 85.46-237.99 272.66-240.11 459.36-1.74 153.5 13.58 557.79 241.62 560.67 169.44 2.15 194.67-216.18 273.07-321.33 55.78-74.81 127.6-95.94 216.01-117.82 151.95-37.61 255.51-157.53 255.29-316.38z" fill-rule="nonzero"/></g></g></svg>
                <span
                  class="text-xs sm:text-sm font-black tracking-[0.2em] uppercase transition-colors relative z-10"
                  :class="isDark ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : 'text-[#171411]'"
                >
                  {{ locale === 'ru' ? 'КУПИТЬ КЛЮЧ НА PATREON' : 'GET THE FULL APP ON PATREON' }}
                </span>
              </button>

              <button
                @click="closeOverlay"
                class="flex-none px-10 py-5 border transition-all uppercase tracking-[0.2em] font-bold text-xs"
                :class="isDark
                  ? 'border-white/20 text-white/60 hover:text-white hover:bg-white/5'
                  : 'border-black/15 text-black/55 hover:text-black hover:bg-black/[0.04]'"
              >
                {{ locale === 'ru' ? 'ЗАКРЫТЬ' : 'CLOSE' }}
              </button>
            </div>

            <p
              class="text-[9px] font-mono tracking-widest uppercase mt-8 text-center max-w-md leading-relaxed"
              :class="isDark ? 'text-white/40' : 'text-black/45'"
            >
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
import { computed } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import { useThemeStore } from '~/features/store/useTheme'
import ExPanel from '~/shared/ui/ExPanel.vue'

const { locale } = useI18n()
const themeStore = useThemeStore()
const isDark = computed(() => themeStore?.settings?.isDark ?? false)

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
