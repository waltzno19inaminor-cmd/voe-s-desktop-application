<template>
  <Teleport to="body">
    <Transition name="config-fade">
      <div v-if="isOpen" 
           class="fixed inset-0 z-[10000] flex items-center justify-center p-6 overflow-y-auto bg-nier-white/80 dark:bg-nier-black/80"
           style="-webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); transform: translateZ(0);">
        
          <div class="flex flex-col w-full justify-center lg:flex-row gap-16 items-start">
             <!-- EDITOR PANEL -->
             <ExPanel class="w-full max-w-xl" noPadding variant="light">
                <template #header>
                   IDENTIFY_NEW_PROTOCOL // CONFIGURATION_SETTER
                </template>

                <div class="p-10 flex flex-col space-y-10">
                   <!-- Field: Configuration Text -->
                   <div class="flex flex-col space-y-4">
                      <div class="flex items-center justify-between">
                         <ExText variant="telemetry" class="opacity-40">{{ isRu ? 'Логика_Конфигурации' : 'Configuration_Logic' }}</ExText>
                         <span class="text-[8px] font-mono opacity-20 uppercase tracking-widest">REQ_001</span>
                      </div>
                      <ExInput
                        v-model="configText"
                        :placeholder="isRu ? 'ВВЕДИТЕ_ЛОГИКУ_КОНФИГУРАЦИИ...' : 'ENTER_CONFIGURATION_LOGIC...'"
                        variant="standard"
                        class="!py-5 !pl-6 !text-lg"
                      />
                   </div>

                   <!-- Field: Description (Optional) -->
                    <div class="flex flex-col space-y-4">
                       <div class="flex items-center justify-between">
                          <ExText variant="telemetry" class="opacity-40">{{ isRu ? 'Тактический_Контекст' : 'Tactical_Context' }}</ExText>
                          <span class="text-[8px] font-mono opacity-20 uppercase tracking-widest">REQ_002</span>
                       </div>
                       <div class="relative group">
                          <textarea 
                            v-model="description"
                            :placeholder="isRu ? 'ОПИШИТЕ_ТАКТИЧЕСКОЕ_ЗНАЧЕНИЕ_ЭТОЙ_КОНФИГУРАЦИИ...' : 'DESCRIBE_THE_TACTICAL_SIGNIFICANCE_OF_THIS_CONFIGURATION...'"
                            class="w-full h-64 bg-nier-white dark:bg-nier-black border border-nier-border-light dark:border-nier-border-dark p-6 text-xs font-mono tracking-widest focus:outline-none focus:border-nier-text-light dark:focus:border-nier-text-dark transition-all text-nier-text-light dark:text-nier-text-dark placeholder:opacity-20 uppercase resize-none leading-relaxed"
                          ></textarea>
                          <ExGothicCorners variant="light" :opacity="0.2" class="group-focus-within:opacity-80 transition-opacity duration-500" />
                       </div>
                    </div>

                    <!-- Footer Actions -->
                    <div class="pt-10 border-t border-nier-border-light dark:border-nier-border-dark flex items-center justify-between">
                       <div @click="$emit('close')" class="flex items-center space-x-3 opacity-20 group cursor-pointer hover:opacity-100 transition-opacity">
                          <div class="w-1.5 h-1.5 border border-nier-text-light dark:border-nier-text-dark rotate-45"></div>
                          <span class="text-[9px] font-mono uppercase tracking-[0.3em]">{{ isRu ? 'Сбросить_Черновик' : 'Discard_Draft' }}</span>
                       </div>
                      <ExButton variant="tactical" @click="handleCreate">Create</ExButton>
                   </div>
                </div>
             </ExPanel>

              <!-- INFORMATIONAL ASIDE & PREVIEW -->
              <div class="flex flex-col space-y-12 max-w-sm pt-8">
                 <!-- LIVE PREVIEW SECTION -->
                 <div class="flex flex-col space-y-6">
                    <ExText variant="telemetry" class="opacity-40">{{ isRu ? 'Предпросмотр_Узла_Конфигурации' : 'Configuration_Node_Preview' }}</ExText>
                    <div class="relative w-48 h-48 border border-nier-border-light dark:border-nier-border-dark bg-nier-text-light/[0.01] dark:bg-nier-text-dark/[0.01] flex items-center justify-center overflow-hidden group">
                       <!-- Grid hint -->
                       <div class="absolute inset-0 opacity-10 pointer-events-none" 
                            :style="{ backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`, backgroundSize: '20px 20px' }"></div>
                       
                       <!-- THE NODE PREVIEW -->
                       <div class="relative w-16 h-16 border-[2px] flex items-center justify-center bg-nier-white dark:bg-nier-black transition-all duration-700 group-hover:scale-110"
                            :style="{ borderColor: color, boxShadow: `0 0 30px ${color}20` }">
                         <div class="absolute inset-0 opacity-[0.03]" :style="{ backgroundColor: color }"></div>
                         <!-- Dynamic Text Identification -->
                         <div class="flex flex-col items-center">
                            <span class="text-[20px] font-mono font-black tracking-tighter uppercase transition-all duration-500"
                                  :style="{ color: color }">
                               {{ configText.slice(0, 3) || 'CFG' }}
                            </span>
                         </div>

                          <!-- Connection points -->
                          <div class="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 border-2 bg-nier-white dark:bg-nier-black rotate-45 transition-colors duration-500"
                               :style="{ borderColor: color }"></div>
                          <div class="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 border-2 bg-nier-white dark:bg-nier-black rotate-45 transition-colors duration-500"
                               :style="{ borderColor: color }"></div>

                         <!-- Subtle Glow layer -->
                         <div class="absolute -inset-2 border opacity-10 transition-colors duration-500" :style="{ borderColor: color }"></div>
                       </div>
                    </div>
                 </div>

                 <!-- Info Block -->
                 <div class="p-6 border border-nier-border-light dark:border-nier-border-dark bg-nier-text-light/[0.02] dark:bg-nier-text-dark/[0.02] flex flex-col space-y-4">
                    <span class="text-[9px] font-mono uppercase tracking-widest font-black opacity-50">{{ isRu ? 'Правило_Конфигурации' : 'Configuration_Rule' }}</span>
                    <p class="text-[10px] opacity-40 leading-relaxed font-mono italic">
                      "{{ isRu ? 'Узлы конфигурации служат тактическими уточнениями для технических индикаторов. Объединение создает материализованный составной протокол.' : 'Configuration nodes serve as tactical qualifiers for technical indicators. Merging creates a reified composite protocol.' }}"
                    </p>
                 </div>
              </div>
          </div>

      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ExGothicCorners from '~/shared/ui/ExGothicCorners.vue'
import ExPanel from '~/shared/ui/ExPanel.vue'
import ExButton from '~/shared/ui/ExButton.vue'
import ExInput from '~/shared/ui/ExInput.vue'
import ExText from '~/shared/ui/ExText.vue'
import { useI18n } from '~/shared/i18n/useI18n'

const props = withDefaults(defineProps<{
  isOpen: boolean
  color?: string
}>(), {
  color: '#9b9b9b'
})

const emit = defineEmits(['close', 'create'])

const { locale } = useI18n()
const isRu = computed(() => locale.value === 'ru')

const configText = ref('')
const description = ref('')

watch(() => props.isOpen, (val) => {
  if (val) {
    configText.value = ''
    description.value = ''
  }
})

const handleCreate = () => {
  if (!configText.value.trim()) return
  
  emit('create', {
    label: configText.value.toUpperCase(),
    description: description.value
  })
}
</script>

<style scoped>
.config-fade-enter-active,
.config-fade-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.config-fade-enter-from,
.config-fade-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
}

textarea::-webkit-scrollbar {
  width: 4px;
}
textarea::-webkit-scrollbar-track {
  background: transparent;
}
textarea::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 2px;
}
</style>
