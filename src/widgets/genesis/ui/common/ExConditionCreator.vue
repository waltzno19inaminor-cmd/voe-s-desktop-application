<template>
  <Teleport to="body">
    <Transition name="creator-fade">
      <div v-if="isOpen" 
           class="fixed inset-0 z-[10000] flex items-center justify-center p-6 overflow-y-auto bg-nier-white/80 dark:bg-nier-black/80"
           style="-webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); transform: translateZ(0);">
        
        
          <div class="flex flex-col w-full lg:flex-row gap-16 items-start justify-center">
             <!-- EDITOR PANEL -->
             <ExPanel class="w-full max-w-xl" noPadding variant="light">
                <template #header>
                   {{ t('matrix.conditionCreatorTitle') }}
                </template>

                <div class="p-10 flex flex-col space-y-10">
                   <!-- Field: Name -->
                   <div class="flex flex-col space-y-4">
                      <div class="flex items-center justify-between">
                        <ExText variant="telemetry" class="opacity-40">{{ t('matrix.protocolIdentity') }}</ExText>
                         <span class="text-[8px] font-mono opacity-20 uppercase tracking-widest">REQ_001</span>
                      </div>
                      <ExInput v-model="customCondition.name" :placeholder="t('matrix.enterConditionName')" variant="standard" class="!py-5 !pl-6 !text-lg" />
                   </div>

                   <!-- Field: Description -->
                    <div class="flex flex-col space-y-4">
                       <div class="flex items-center justify-between">
                         <ExText variant="telemetry" class="opacity-40">{{ t('matrix.narrativeRegistry') }}</ExText>
                          <span class="text-[8px] font-mono opacity-20 uppercase tracking-widest">REQ_002</span>
                       </div>
                       <div class="relative group">
                          <textarea 
                            v-model="customCondition.description"
                            :placeholder="t('matrix.conditionDescriptionPlaceholder')"
                            class="w-full h-32 bg-nier-white dark:bg-nier-black border border-nier-border-light dark:border-nier-border-dark p-6 text-xs font-mono tracking-widest focus:outline-none focus:border-nier-text-light dark:focus:border-nier-text-dark transition-all text-nier-text-light dark:text-nier-text-dark placeholder:opacity-20 uppercase resize-none leading-relaxed"
                          ></textarea>
                          <!-- Gothic Corners for Textarea -->
                          <ExGothicCorners variant="light" :opacity="0.2" class="group-focus-within:opacity-80 transition-opacity duration-500" />
                       </div>
                    </div>

                   <!-- Field: Color Swatch -->
                    <div class="flex flex-col space-y-4">
                       <ExText variant="telemetry" class="opacity-40 mb-2">{{ t('matrix.chromaticIndex') }}</ExText>
                       <div class="flex flex-wrap gap-4">
                          <button v-for="color in colors" 
                                  :key="color"
                                  @click="customCondition.color = color"
                                  class="w-10 h-10 border relative group transition-all hover:scale-110"
                                  :class="customCondition.color === color ? 'border-nier-text-light dark:border-nier-text-dark scale-110' : 'border-nier-border-light dark:border-nier-border-dark'"
                                  :style="{ backgroundColor: color }">
                             <div class="absolute inset-0 border-2 border-nier-white dark:border-nier-black opacity-0 group-hover:opacity-100 transition-opacity"></div>
                             <div class="absolute -inset-1 border border-nier-text-light dark:border-nier-text-dark opacity-0 group-hover:opacity-100 transition-opacity"
                                  :class="{ 'opacity-100': customCondition.color === color }"></div>
                          </button>
                       </div>
                    </div>

                    <!-- Footer Actions -->
                    <div class="pt-10 border-t border-nier-border-light dark:border-nier-border-dark flex items-center justify-between">
                       <div @click="$emit('close')" class="flex items-center space-x-3 opacity-20 group cursor-pointer hover:opacity-100 transition-opacity">
                          <div class="w-1.5 h-1.5 border border-nier-text-light dark:border-nier-text-dark rotate-45"></div>
                          <span class="text-[9px] font-mono uppercase tracking-[0.3em]">{{ t('matrix.discardDraft') }}</span>
                       </div>
                       <ExButton variant="tactical" @click="handleCreate">{{ t('matrix.create') }}</ExButton>
                    </div>
                </div>
             </ExPanel>

              <!-- INFORMATIONAL ASIDE & PREVIEW -->
              <div class="flex flex-col space-y-12 max-w-sm pt-8">
                 <!-- LIVE PREVIEW SECTION -->
                 <div class="flex flex-col space-y-6">
                    <ExText variant="telemetry" class="opacity-40">{{ t('matrix.protocolPreview') }}</ExText>
                    <div class="relative w-48 h-48 border border-nier-border-light dark:border-nier-border-dark bg-nier-text-light/[0.01] dark:bg-nier-text-dark/[0.01] flex items-center justify-center overflow-hidden group">
                       <!-- Grid hint -->
                       <div class="absolute inset-0 opacity-10 pointer-events-none" 
                            :style="{ backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`, backgroundSize: '20px 20px' }"></div>
                       
                       <!-- THE NODE PREVIEW -->
                       <div class="relative w-16 h-16 border-[2px] flex items-center justify-center bg-nier-white dark:bg-nier-black transition-all duration-700 group-hover:scale-110"
                           :style="{ borderColor: customCondition.color, boxShadow: `0 0 30px ${customCondition.color}20` }">
                         <div class="absolute inset-0 opacity-[0.03]" :style="{ backgroundColor: customCondition.color }"></div>
                         <!-- Dynamic Text Identification -->
                         <div class="flex flex-col items-center">
                            <span class="text-[20px] font-mono font-black tracking-tighter uppercase transition-all duration-500"
                                  :style="{ color: customCondition.color }">
                               {{ customCondition.name.slice(0, 3) || 'IDN' }}
                            </span>
                         </div>

                          <!-- Connection points -->
                          <div class="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 border-2 bg-nier-white dark:bg-nier-black rotate-45 transition-colors duration-500"
                               :style="{ borderColor: customCondition.color }"></div>
                          <div class="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 border-2 bg-nier-white dark:bg-nier-black rotate-45 transition-colors duration-500"
                               :style="{ borderColor: customCondition.color }"></div>

                         <!-- Subtle Glow layer based on picked color -->
                         <div class="absolute -inset-2 border opacity-10 transition-colors duration-500" :style="{ borderColor: customCondition.color }"></div>
                      </div>

                      <div class="absolute bottom-4 left-0 w-full flex justify-center">
                         <span class="text-[7px] font-mono uppercase tracking-[0.4em] opacity-30">{{ t('matrix.renderMatrix') }}</span>
                      </div>
                   </div>
                </div>

                 <div class="flex items-center space-x-4">
                    <div class="w-px h-12 bg-nier-text-light dark:bg-nier-text-dark"></div>
                    <ExText variant="body" class="italic opacity-80 leading-relaxed">
                       {{ t('matrix.conditionCreatorQuote') }}
                    </ExText>
                 </div>
                 
             </div>
          </div>

      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import ExGothicCorners from '~/shared/ui/ExGothicCorners.vue'
import ExPanel from '~/shared/ui/ExPanel.vue'
import ExButton from '~/shared/ui/ExButton.vue'
import ExInput from '~/shared/ui/ExInput.vue'
import ExText from '~/shared/ui/ExText.vue'
import { useI18n } from '~/shared/i18n/useI18n'
import { useGenesisMatrixData } from '~/entities/genesis'

const genesisMatrix = useGenesisMatrixData()
const { t } = useI18n()

const props = withDefaults(defineProps<{
  isOpen: boolean
  isDark?: boolean
}>(), {
  isDark: true
})

const emit = defineEmits(['close', 'create'])

const colors = computed(() => [
  props.isDark ? '#ffffff' : '#000000',
  '#fb7185', 
  '#38bdf8', 
  '#10b981', 
  '#f59e0b', 
  '#a78bfa'
])

const customCondition = reactive({
  name: '',
  description: '',
  color: props.isDark ? '#ffffff' : '#000000'
})

// Reset form when opening
watch(() => props.isOpen, (val) => {
  if (val) {
    customCondition.name = ''
    customCondition.description = ''
    customCondition.color = props.isDark ? '#ffffff' : '#000000'
  }
})

const handleCreate = () => {
  if (!customCondition.name.trim()) return
  
  emit('create', {
    type: 'indicator',
    label: customCondition.name.toUpperCase(),
    params: {
       description: customCondition.description,
       color: customCondition.color,
       isCustom: true
    }
  })
  emit('close')
}
</script>

<style scoped>
.creator-fade-enter-active,
.creator-fade-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.creator-fade-enter-from,
.creator-fade-leave-to {
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
