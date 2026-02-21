<template>
  <div class="space-y-6">
    <div v-for="(block, index) in blocks"   @mouseup="handleSelection(index, block.type)" :key="index" :data-thesis-block="index">
      
   
      <component
        :is="`h${block.level}`"
        v-if="block.type === 'heading'"
        class="font-serif text-[#111] dark:text-[#eee] mt-8 mb-4"
        :class="{
          'text-2xl': block.level === 2,
          'text-xl': block.level === 3
        }"
      >
        {{ block.text }}
      </component>


      <p
        v-else-if="block.type === 'paragraph'"
        class="text-sm leading-relaxed text-[#333] dark:text-[#ccc]"
      >
        {{ block.text }}
      </p>


      <ul
        v-else-if="block.type === 'list'"
        class="list-disc list-outside ml-5 space-y-1 text-sm text-[#333] dark:text-[#ccc] marker:text-[#999]"
      >
        <li v-for="(item, i) in block.items" :key="i" class="pl-1">
          {{ item }}
        </li>
      </ul>


      <blockquote
        v-else-if="block.type === 'quote'"
        class="pl-4 border-l-2 border-[#ccc] dark:border-[#444] text-sm italic text-[#555] dark:text-[#999] my-6"
      >
        "{{ block.text }}"
      </blockquote>


      <figure v-else-if="block.type === 'image'" class="my-8">
        <img
          :src="block.src"
          :alt="block.caption || 'Thread image'"
          class="w-full rounded bg-gray-100 dark:bg-white/5 border border-black/5 dark:border-white/10"
        />
        <figcaption
          v-if="block.caption"
          class="mt-2 text-center text-xs text-[#777] tracking-wide"
        >
          {{ block.caption }} 
        </figcaption>
      </figure>

      
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ContentBlock } from '../model/thread.types';

const props = defineProps<{
  blocks: ContentBlock[];
  isQuote: boolean
}>();

const emit = defineEmits<{
  (
    e: 'textSelected',
    payload: {
      text: string
      blockIndex: number,
      type: string
    }
  ): void
}>()

function handleSelection(index: number, blockType: string) {
  if (!props.isQuote) return;
  const selection = window.getSelection()
  if (!selection) return

  const text = selection.toString().trim()
  if (!text) return

  emit('textSelected', {
    text: text.replace(/["']/g, ''),
    blockIndex: index,
    type: blockType
  })



}


</script>
