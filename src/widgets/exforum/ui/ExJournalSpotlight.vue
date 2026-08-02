<template>
  <div class="journal-spotlight group cursor-pointer" @click="$emit('click')">
    <div class="flex flex-col space-y-8">
      <!-- Spotlight Header -->
      <div v-if="node.author" class="flex items-center space-x-4 text-[10px] font-mono tracking-[0.2em] font-semibold text-current/80 uppercase">
        <div class="flex items-center space-x-2">
           <span>{{ node.author }}</span>
        </div>
      </div>

      <!-- Main Headline -->
      <h2 class="text-5xl lg:text-6xl font-serif italic text-current leading-[1.02] tracking-tighter group-hover:opacity-80 transition-opacity duration-700">
        {{ node.title }}
      </h2>

      <!-- Abstract -->
      <p class="text-xl font-serif italic text-current/50 leading-relaxed line-clamp-3 max-w-3xl">
        "{{ node.thesis_brief }}"
      </p>

      <!-- Footer Info -->
      <div class="flex items-center justify-between pt-8">
        <div class="flex flex-wrap items-center gap-x-10 gap-y-3 text-[10px] tracking-wide">
          <span class="font-mono uppercase tracking-[0.28em] text-current/35">
            {{ spotlightLabels.published }} {{ formatSpotlightDate(node.lastActivityAt) }}
          </span>
          <span class="font-serif italic text-current/60">
            {{ node.repliesCount }} {{ spotlightLabels.comments }}
          </span>
          <span class="font-mono text-[12px] font-semibold text-current/90">
            {{ node.likesCount }} {{ spotlightLabels.likes }}
          </span>
        </div>
        
        <div class="flex items-center space-x-4 group-hover:translate-x-2 transition-transform duration-700">
          <span class="text-[9px] font-mono tracking-[0.4em] opacity-30 uppercase group-hover:opacity-100 transition-all duration-300 transform origin-left group-hover:scale-110 inline-block">{{ spotlightLabels.accessNode }}</span>
          <span class="text-2xl opacity-20 group-hover:opacity-100 pb-1">→</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import type { ExNode } from '../../../entities/exnode/model/exnode.types'

defineProps<{
  node: ExNode
}>()

defineEmits(['click'])

const { locale } = useI18n()
const spotlightLabels = computed(() => locale.value === 'ru'
  ? {
      featuredAnalysis: 'Избранная_аналитика',
      comments: 'комментов',
      likes: 'лайков',
      published: 'Опубл.',
      accessNode: 'Открыть_узел'
    }
  : {
      featuredAnalysis: 'Featured_Analysis',
      comments: 'comments',
      likes: 'likes',
      published: 'Pub.',
      accessNode: 'Access_Node'
    })

const formatSpotlightDate = (value: string) => new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
}).format(new Date(value))
</script>

<style scoped>
.journal-spotlight {
  transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

h2 {
  font-feature-settings: "ss01", "ss02", "cv01";
}
</style>
