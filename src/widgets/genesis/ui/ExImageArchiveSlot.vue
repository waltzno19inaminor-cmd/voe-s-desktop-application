<script setup lang="ts">
import { computed, ref } from 'vue'
import ExButton from "~/shared/ui/ExButton.vue"

const props = defineProps<{
  imageUrl?: string
  timestamp?: string
  id?: string | number
  name?: string
  tags?: string[]
}>()

const emit = defineEmits(['remove', 'fullscreen', 'edit', 'upload', 'update:name', 'update:tags'])

const isEditingName = ref(false)
const localName = ref(props.name || `Archive_Node_${props.id || '0x42'}`)

const isAddingTag = ref(false)
const newTag = ref('')

const displayTimestamp = computed(() => {
  if (!props.timestamp || props.timestamp.includes('Invalid Date')) return 'DATE_UNASSIGNED'
  return props.timestamp
})

function saveName() {
  isEditingName.value = false
  emit('update:name', localName.value)
}

function addTag() {
  if (newTag.value.trim()) {
    const currentTags = props.tags || []
    const tagToAdd = newTag.value.trim().toUpperCase()
    if (!currentTags.includes(tagToAdd)) {
      emit('update:tags', [...currentTags, tagToAdd])
    }
    newTag.value = ''
    isAddingTag.value = false
  }
}

function removeTag(tagToRemove: string) {
  const currentTags = props.tags || []
  emit('update:tags', currentTags.filter(t => t !== tagToRemove))
}

const tagColors = [
  'border-emerald-500/50 text-emerald-600 dark:text-emerald-400',
  'border-indigo-500/50 text-indigo-600 dark:text-indigo-400',
  'border-rose-500/50 text-rose-600 dark:text-rose-400',
  'border-amber-500/50 text-amber-600 dark:text-amber-400',
  'border-cyan-500/50 text-cyan-600 dark:text-cyan-400',
  'border-purple-500/50 text-purple-600 dark:text-purple-400',
  'border-fuchsia-500/50 text-fuchsia-600 dark:text-fuchsia-400',
]

function getTagColor(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % tagColors.length
  return tagColors[index]
}
</script>

<template>
  <div class="relative group border nier-border-primary nier-bg-panel overflow-hidden transition-all duration-500 hover:border-black/40 dark:hover:border-white/40 shadow-lg">
    <!-- Image Preview Area -->
    <div class="aspect-video relative overflow-hidden bg-black/5 dark:bg-white/5">
      <template v-if="imageUrl">
        <img :src="imageUrl" class="w-full h-full object-cover opacity-90 dark:opacity-80 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-105" alt="Archived Visual" />
        
        <!-- Overlay Gradient -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 dark:from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <!-- Tactical Corner Brackets -->
        <div class="absolute top-4 left-4 w-4 h-4 border-t border-l border-black/20 dark:border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <div class="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-black/20 dark:border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

        <!-- Centered Actions -->
        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-700 pointer-events-none group-hover:pointer-events-auto z-50">
          <ExButton variant="ghost" size="sm" @click="$emit('fullscreen')">FULL_SCREEN_REVIEW</ExButton>
        </div>
      </template>

      <!-- Empty State -->
      <div v-else @click="$emit('upload')" class="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all group/empty">
        <div class="w-12 h-12 border border-dashed border-black/20 dark:border-white/20 flex items-center justify-center rotate-45 group-hover/empty:rotate-[135deg] transition-transform duration-700">
           <span class="text-2xl font-light -rotate-45 group-hover/empty:-rotate-[135deg] transition-transform duration-700">+</span>
        </div>
        <span class="text-[8px] font-mono uppercase tracking-[0.4em] mt-6 opacity-30 group-hover/empty:opacity-100 transition-opacity">Upload_Evidence</span>
      </div>
    </div>

    <!-- Metadata Panel -->
    <div class="p-4 flex items-center justify-between border-t border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] backdrop-blur-sm">
      <div class="flex flex-col space-y-1 w-full mr-4">
        <div class="flex flex-col space-y-2">
            <!-- Name editing -->
            <div class="flex items-center space-x-2 w-full">
              <div class="w-1.5 h-1.5 nier-bg-inverted rotate-45 opacity-60 shrink-0"></div>
              
              <template v-if="isEditingName">
                <input 
                  v-model="localName" 
                  @blur="saveName"
                  @keyup.enter="saveName"
                  class="bg-transparent border-b border-black/20 dark:border-white/20 outline-none text-[9px] font-mono uppercase tracking-[0.2em] font-black nier-text-primary w-full"
                  autofocus
                />
              </template>
              <template v-else>
                <span 
                  @click="isEditingName = true" 
                  class="text-[9px] font-mono uppercase tracking-[0.2em] font-black opacity-60 nier-text-primary cursor-text hover:opacity-100 transition-opacity truncate"
                >
                  {{ name || `Archive_Node_${id || '0x42'}` }}
                </span>
              </template>
            </div>
            
            <!-- Tags -->
            <div v-if="imageUrl" class="flex flex-wrap gap-2 items-center pl-3">
               <span v-for="tag in tags" :key="tag" class="text-[9px] font-mono px-2 py-1 border opacity-80 flex items-center gap-1.5 group/tag transition-colors" :class="getTagColor(tag)">
                 {{ tag }}
                 <button @click="removeTag(tag)" class="opacity-0 group-hover/tag:opacity-100 hover:text-current transition-all font-black">×</button>
               </span>
               
               <template v-if="isAddingTag">
                 <input 
                   v-model="newTag"
                   @blur="addTag"
                   @keyup.enter="addTag"
                   @keyup.esc="isAddingTag = false"
                   class="bg-transparent border-b border-black/20 dark:border-white/20 outline-none text-[9px] font-mono px-2 py-1 w-20 nier-text-primary uppercase"
                   placeholder="TAG..."
                   autofocus
                 />
               </template>
               <button v-else @click="isAddingTag = true" class="text-[9px] font-mono px-2 py-1 border border-dashed border-black/20 dark:border-white/20 opacity-30 hover:opacity-100 nier-text-primary transition-opacity uppercase tracking-widest">
                 + Tag
               </button>
            </div>
        </div>
        <span class="text-[8px] font-mono opacity-30 uppercase tracking-[0.3em] pl-3 nier-text-primary mt-1">{{ displayTimestamp }}</span>
      </div>
      
      <!-- Remove Button -->
      <button 
        @click="$emit('remove')" 
        class="group relative p-2 nier-text-primary opacity-20 hover:opacity-100 transition-all duration-300 shrink-0 self-start"
        title="REMOVE_ARCHIVE"
      >
        <div class="absolute inset-0 border border-red-500/0 group-hover:border-red-500/20 scale-0 group-hover:scale-100 transition-transform duration-500"></div>
        <svg class="w-4 h-4 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>

    <!-- Scanning Line Animation (Hover) -->
    <div class="absolute top-0 left-0 w-full h-px bg-black/20 dark:bg-white/20 -translate-y-full group-hover:animate-scan pointer-events-none"></div>
  </div>
</template>

<style scoped>
@keyframes scan {
  0% { transform: translateY(0); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(200px); opacity: 0; }
}
.animate-scan {
  animation: scan 3s linear infinite;
}
</style>
