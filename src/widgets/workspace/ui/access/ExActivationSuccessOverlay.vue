<template>
  <Teleport to="body">
    <Transition name="activation-success">
      <div v-if="isOpen"
           class="activation-success fixed inset-0 z-[10050] flex flex-col items-center justify-center overflow-hidden p-4 sm:p-8"
           @click.self="closeOverlay">

        <!-- Static darkened workspace behind the congratulations card. -->
        <div class="activation-success__shade" aria-hidden="true"></div>

        <ExPanel 
          variant="light" 
          :show-corners="false"
          class="activation-success__panel relative z-10 mx-auto w-full max-w-xl text-[#141414] dark:text-black"
        >
          <ExGothicCorners variant="light" :opacity="0.9" class="text-white" />

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
import ExGothicCorners from '~/shared/ui/ExGothicCorners.vue'

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
.activation-success-enter-active,
.activation-success-leave-active {
  transition: none;
}

.activation-success__shade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  backface-visibility: hidden;
  transform: translateZ(0);
}

.activation-success__panel {
  opacity: 0;
  transform: translateY(14px) scale(0.985);
  animation: activation-success-panel-in 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.activation-success-leave-active .activation-success__panel {
  animation: activation-success-panel-out 300ms cubic-bezier(0.7, 0, 0.84, 0) both;
}

@keyframes activation-success-panel-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.985);
    filter: blur(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes activation-success-panel-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
  to {
    opacity: 0;
    transform: translateY(8px) scale(0.99);
    filter: blur(5px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .activation-success__panel {
    animation-duration: 1ms;
    animation-delay: 0ms;
  }
}
</style>
