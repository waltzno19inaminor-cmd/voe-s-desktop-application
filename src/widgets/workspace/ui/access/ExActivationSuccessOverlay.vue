<template>
  <Teleport to="body">
    <Transition name="fade-blur">
      <div v-if="isOpen" 
           class="fixed inset-0 z-[10050] flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden bg-black/40 backdrop-blur-md"
           @click.self="closeOverlay">
        
        <ExPanel 
          variant="light" 
          class="relative w-full max-w-xl group z-10 mx-auto"
        >
          <!-- BACKGROUND DECORATIONS -->
          <div class="absolute inset-0 pointer-events-none overflow-hidden select-none z-0 opacity-20 dark:opacity-40">
            <div class="absolute -top-20 -right-20 w-64 h-64 sm:w-96 sm:h-96 border nier-border-primary rounded-full animate-[spin_60s_linear_infinite]">
               <div class="absolute inset-10 border border-black/5 dark:border-white/5 rotate-45 animate-[pulse_4s_ease-in-out_infinite]"></div>
               <div class="absolute inset-20 border border-black/5 dark:border-white/5 -rotate-12 animate-[spin_40s_linear_infinite_reverse]"></div>
            </div>
            <div class="absolute top-1/4 left-5 w-8 h-8 sm:w-12 sm:h-12 border border-black/20 dark:border-white/20 rotate-12 animate-[spin_20s_linear_infinite]"></div>
            <div class="absolute bottom-1/4 right-10 w-16 h-16 sm:w-24 sm:h-24 border nier-border-primary -rotate-45 animate-[spin_30s_linear_infinite_reverse]"></div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-black/[0.03] dark:border-white/[0.03] rounded-full animate-[pulse_6s_ease-in-out_infinite]"></div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-black/[0.02] dark:border-white/[0.02] rounded-full animate-[pulse_4s_ease-in-out_infinite]"></div>
            <div class="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,transparent_0%,currentColor_1px,transparent_1px)] bg-[length:40px_40px] animate-[pulse_8s_ease-in-out_infinite]"></div>
          </div>

          <div class="flex flex-col items-center w-full relative z-10 px-6 py-6 sm:px-12 sm:py-6 text-center">
            
            <ExHeading level="h2" variant="cinematic" class="mb-2 text-theme-text text-3xl sm:text-4xl tracking-widest px-4">
              {{ locale === 'ru' ? 'ПОЗДРАВЛЯЕМ' : 'CONGRATULATIONS' }}
            </ExHeading>
            
            <p class="text-[11px] sm:text-[12px] font-mono tracking-[0.2em] text-theme-text opacity-70 w-full max-w-xl leading-relaxed mb-4">
              {{ locale === 'ru' ? 'Благодарим вас за приобретение полной версии. Пусть Змей благоволит вам.' : 'Thank you for purchasing the full version. May the Serpent favor you.' }}
            </p>

            <img :src="isDark ? '/assets/signature-dark.svg' : '/assets/signature-light.svg'" alt="Signature" class="w-32 sm:w-36 h-auto opacity-80" />
            
            <ExButton variant="ghost" class="mt-6" @click="closeOverlay">
              {{ locale === 'ru' ? 'ПРОДОЛЖИТЬ' : 'CONTINUE' }}
            </ExButton>
          </div>
        </ExPanel>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useI18n } from '~/shared/i18n/useI18n'
import { useThemeStore } from '~/features/store/useTheme'
import { computed } from 'vue'
import ExPanel from '~/shared/ui/ExPanel.vue'
import ExHeading from '~/shared/ui/ExHeading.vue'
import ExButton from '~/shared/ui/ExButton.vue'

const { locale } = useI18n()
const themeStore = useThemeStore()
const isDark = computed(() => themeStore.settings.isDark)

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['close'])

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
  backdrop-filter: blur(12px);
}
</style>
