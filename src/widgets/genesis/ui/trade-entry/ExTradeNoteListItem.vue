<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'

const props = withDefaults(defineProps<{
  note: Record<string, any>
  expanded?: boolean
  canEdit?: boolean
  isPersisting?: boolean
  renderContent?: (note: Record<string, any>) => string
}>(), {
  expanded: false,
  canEdit: false,
  isPersisting: false,
  renderContent: undefined
})

const emit = defineEmits<{
  (event: 'toggle', id: string): void
  (event: 'edit-content', note: Record<string, any>): void
  (event: 'update-title', payload: { id: string; title: string }): void
  (event: 'remove', id: string): void
}>()

const { locale } = useI18n()
const isEditingTitle = ref(false)
const titleDraft = ref('')

const startTitleEdit = (event: MouseEvent) => {
  event.stopPropagation()
  isEditingTitle.value = true
  titleDraft.value = props.note.title || (locale.value === 'ru' ? 'Архивная запись' : 'Archived record')
}

const saveTitle = () => {
  if (!isEditingTitle.value) return
  isEditingTitle.value = false
  emit('update-title', { id: String(props.note.id), title: titleDraft.value })
}

const formatDate = (dateValue: unknown) => {
  if (!dateValue) return 'DATE_UNASSIGNED'
  const date = new Date(String(dateValue))
  if (Number.isNaN(date.getTime())) return 'DATE_UNASSIGNED'
  const day = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${day} // ${time}`
}
</script>

<template>
  <article
    class="group/note relative flex w-full cursor-pointer flex-col bg-black/[0.01] p-6 transition-colors hover:bg-black/[0.03] dark:bg-white/[0.01] dark:hover:bg-white/[0.03]"
    @click="emit('toggle', String(props.note.id))"
    @dblclick.stop="emit('edit-content', props.note)"
  >
    <div class="mb-2 flex items-center justify-between pb-2" :class="props.expanded ? 'border-b border-white/10' : ''">
      <div class="flex items-center space-x-4">
        <div class="h-1.5 w-1.5 rotate-45 bg-white transition-transform duration-300" :class="props.expanded ? 'rotate-[135deg]' : 'rotate-45'"></div>
        <div v-if="isEditingTitle" class="flex items-center gap-2" @click.stop>
          <input
            v-model="titleDraft"
            class="border-b border-white/30 bg-transparent font-mono text-[9px] font-black uppercase tracking-[0.2em] text-white outline-none"
            autofocus
            @keydown.enter.prevent="saveTitle"
            @blur="saveTitle"
          />
          <span class="font-mono text-[7px] uppercase tracking-widest text-white/40">
            {{ locale === 'ru' ? '(Enter для сохранения)' : '(Enter to save)' }}
          </span>
        </div>
        <span
          v-else
          class="cursor-text font-mono text-[9px] font-black uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-50"
          @click.stop="startTitleEdit"
        >
          {{ props.note.title || (locale === 'ru' ? 'Архивная запись' : 'Archived record') }}
        </span>
      </div>

      <div class="flex items-center space-x-4">
        <span class="text-right font-mono text-[10px] font-bold tracking-wider text-white/60">
          {{ formatDate(props.note.date) }}
        </span>
        <button
          type="button"
          :disabled="!props.canEdit || props.isPersisting"
          class="text-rose-500 opacity-0 transition-opacity group-hover/note:opacity-40 hover:!opacity-100 disabled:cursor-not-allowed disabled:opacity-20"
          @click.stop="emit('remove', String(props.note.id))"
        >
          <span class="font-mono text-[9px] font-black uppercase tracking-widest">
            {{ locale === 'ru' ? '[Удалить]' : '[Delete]' }}
          </span>
        </button>
      </div>
    </div>

    <div
      v-if="props.expanded && props.renderContent"
      class="trade-note-rich mt-2 font-mono text-[12px] leading-relaxed text-white/70"
      v-html="props.renderContent ? props.renderContent(props.note) : props.note.html"
    ></div>
    <p v-else-if="props.expanded" class="mt-2 whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-white/70">
      {{ props.note.content || '--' }}
    </p>
  </article>
</template>
