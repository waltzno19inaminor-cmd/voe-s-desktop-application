<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'

const props = withDefaults(defineProps<{
  image: Record<string, any>
  index: number
  canEdit?: boolean
  isPersisting?: boolean
}>(), {
  canEdit: false,
  isPersisting: false
})

const emit = defineEmits<{
  (event: 'upload', index: number, payload: Event): void
  (event: 'remove', index: number): void
  (event: 'name-change', index: number, payload: Event): void
  (event: 'remove-tag', index: number, tag: string): void
  (event: 'view', index: number): void
}>()

const { locale } = useI18n()
const fileInput = ref<HTMLInputElement | null>(null)
const tagColors = ref<Record<string, string>>({})

const TAG_COLORS = [
  '#7c3aed',
  '#2563eb',
  '#0891b2',
  '#0f766e',
  '#15803d',
  '#ca8a04',
  '#c2410c',
  '#be123c',
  '#9333ea',
  '#0369a1',
  '#4338ca',
  '#9f1239'
]

const getTagColor = (tag: string) => {
  if (tagColors.value[tag]) return tagColors.value[tag]

  const usedColors = new Set(Object.values(tagColors.value))
  const availableColors = TAG_COLORS.filter(color => !usedColors.has(color))
  const color = availableColors.length
    ? availableColors[Math.floor(Math.random() * availableColors.length)]
    : `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`

  tagColors.value[tag] = color
  return color
}

const triggerUpload = () => {
  fileInput.value?.click()
}

</script>

<template>
  <figure class="group relative flex h-fit self-start flex-col bg-black/[0.01] px-4 pt-2 transition-all duration-500 dark:bg-white/[0.01]">
    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="emit('upload', props.index, $event)" />
    <div class="group/img relative flex aspect-video w-full items-center justify-center overflow-hidden bg-black/5 dark:bg-white/5">
      <div v-if="props.image.url" class="h-full w-full">
        <img :src="props.image.url" :alt="props.image.name || `Trade image ${props.index + 1}`" class="h-full w-full object-cover transition-transform duration-700 group-hover/img:scale-110" />
      </div>
      <button
        v-else
        type="button"
        :disabled="!props.canEdit || props.isPersisting"
        class="flex h-full w-full cursor-pointer flex-col items-center justify-center space-y-4 disabled:cursor-default disabled:opacity-40"
        :aria-label="locale === 'ru' ? 'Загрузить изображение' : 'Upload image'"
        @click="triggerUpload"
      >
        <span class="text-[8px] font-mono uppercase tracking-[0.4em] text-white/30 transition-opacity group-hover/img:text-white">
          {{ locale === 'ru' ? 'ЗАГРУЗИТЬ' : 'UPLOAD' }}
        </span>
      </button>
    </div>

    <div class="flex flex-col space-y-3 py-3">
      <div class="relative">
        <input
          :value="props.image.name || ''"
          type="text"
          :placeholder="locale === 'ru' ? 'НАЗВАНИЕ' : 'NAME'"
          class="w-full border border-white/10 bg-transparent px-2 py-2 text-[9px] font-mono font-black uppercase tracking-[0.15em] text-white outline-none transition-all placeholder:text-white/20 focus:border-white/30"
          @change="emit('name-change', props.index, $event)"
        />
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          :disabled="!props.image.url"
          class="grid h-8 w-8 place-items-center border border-white/15 text-white/60 transition-colors hover:bg-white hover:text-black disabled:cursor-default disabled:opacity-20"
          :aria-label="locale === 'ru' ? 'Посмотреть изображение' : 'View image'"
          :title="locale === 'ru' ? 'Посмотреть' : 'View'"
          @click.stop.prevent="emit('view', props.index)"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" stroke-width="1.6" />
            <circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="1.6" />
          </svg>
        </button>
        <button
          type="button"
          :disabled="!props.image.url || !props.canEdit || props.isPersisting"
          class="grid h-8 w-8 place-items-center border border-white/15 text-white/60 transition-colors hover:bg-white hover:text-black disabled:cursor-default disabled:opacity-20"
          :aria-label="locale === 'ru' ? 'Заменить изображение' : 'Replace image'"
          :title="locale === 'ru' ? 'Заменить' : 'Replace'"
          @click="triggerUpload"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h10M4 7l3-3M4 7l3 3M20 17H10m10 0-3-3m3 3-3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter" />
          </svg>
        </button>
        <button
          type="button"
          :disabled="!props.canEdit || props.isPersisting"
          class="grid h-8 w-8 place-items-center border border-white/15 text-white/60 transition-colors hover:bg-red-500 hover:text-white disabled:cursor-default disabled:opacity-20"
          :aria-label="locale === 'ru' ? 'Удалить изображение' : 'Remove image'"
          :title="locale === 'ru' ? 'Удалить' : 'Remove'"
          @click="emit('remove', props.index)"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 7h14M10 11v6m4-6v6M9 7V4h6v3m-9 0 1 13h10l1-13" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter" />
          </svg>
        </button>
      </div>

      <div class="flex flex-col gap-3">
        <div v-if="(props.image.tags || []).length" class="flex min-h-7 flex-wrap gap-2">
          <span
            v-for="tag in (props.image.tags || [])"
            :key="tag"
            class="flex items-center gap-2 border px-2 py-1 text-[8px] font-mono uppercase tracking-widest text-white"
            :style="{ backgroundColor: `${getTagColor(tag)}26`, borderColor: `${getTagColor(tag)}99` }"
          >
            {{ tag }}
            <button type="button" class="text-[9px] leading-none opacity-40 transition-all hover:text-red-500 hover:opacity-100" @click="emit('remove-tag', props.index, tag)">
              x
            </button>
          </span>
        </div>

      </div>
    </div>
  </figure>
</template>
