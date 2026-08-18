<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'

const props = withDefaults(defineProps<{
  modelValue: string
  isPersisting?: boolean
  images?: Array<{ url?: string; name?: string }>
}>(), {
  isPersisting: false,
  images: () => []
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'save'): void
  (event: 'cancel'): void
}>()

const { locale } = useI18n()
const editor = ref<HTMLElement | null>(null)
const savedSelection = ref<Range | null>(null)
const activeTextColor = ref('currentColor')
const isAttachMenuOpen = ref(false)
const visualRevision = ref(0)

const attachableImages = () => props.images.filter(image => Boolean(image?.url))

const syncEditor = () => {
  if (!editor.value) return
  emit('update:modelValue', editor.value.innerHTML)
}

const syncEditorFromModel = () => {
  if (!editor.value) return
  const modelHtml = replaceVisualReferences(props.modelValue)
  if (editor.value.innerHTML === modelHtml) return
  editor.value.innerHTML = modelHtml
  visualRevision.value += 1
}

const saveSelection = () => {
  const selection = window.getSelection()
  if (!selection?.rangeCount || !editor.value) return
  const range = selection.getRangeAt(0)
  if (!editor.value.contains(range.commonAncestorContainer)) return
  savedSelection.value = range.cloneRange()
}

const restoreSelection = () => {
  if (!editor.value) return
  editor.value.focus()
  const selection = window.getSelection()
  if (!selection) return
  selection.removeAllRanges()
  if (savedSelection.value) selection.addRange(savedSelection.value)
}

const applyCommand = (command: string, value?: string) => {
  if (!editor.value) return
  restoreSelection()
  document.execCommand('styleWithCSS', false, 'true')
  document.execCommand(command, false, value)
  syncEditor()
  saveSelection()
}

const applyBlock = (block: 'h1' | 'h2' | 'h3' | 'blockquote') => {
  applyCommand('formatBlock', block)
}

const applyColor = (color: string) => {
  activeTextColor.value = color
  applyCommand('foreColor', color)
}

const handleColorInput = (event: Event) => {
  const color = (event.target as HTMLInputElement)?.value
  if (color) applyColor(color)
}

const escapeHtml = (value: unknown) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

const getVisualHtml = (image: { url?: string; name?: string }, index: number) => {
  return [
    `<div class="trade-note-visual" data-trade-visual-ref="${index}" contenteditable="false">`,
    `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.name || `Visual_Node_${index}`)}">`,
    '</div>',
    '<p><br></p>'
  ].join('')
}

const replaceVisualReferences = (html: string) => String(html).replace(/\[VISUAL_REF:(\d+)\]/gim, (match, indexValue) => {
  const index = Number.parseInt(indexValue, 10)
  const image = attachableImages()[index]
  return image?.url ? getVisualHtml(image, index) : match
})

const insertVisualReference = (index: number) => {
  const image = attachableImages()[index]
  if (!image?.url || !editor.value) return

  restoreSelection()
  const selection = window.getSelection()
  if (!selection?.rangeCount) return

  const range = selection.getRangeAt(0)
  if (!editor.value.contains(range.commonAncestorContainer)) return

  range.deleteContents()
  const template = document.createElement('template')
  template.innerHTML = getVisualHtml(image, index)
  const fragment = template.content
  const lastNode = fragment.lastElementChild
  range.insertNode(fragment)

  const nextRange = document.createRange()
  if (lastNode) {
    nextRange.selectNodeContents(lastNode)
    nextRange.collapse(false)
  } else {
    nextRange.setStartAfter(range.startContainer)
    nextRange.collapse(true)
  }
  selection.removeAllRanges()
  selection.addRange(nextRange)
  syncEditor()
  visualRevision.value += 1
  saveSelection()
  isAttachMenuOpen.value = false
}

const hasVisualReference = (index: number) => {
  visualRevision.value
  return Boolean(editor.value?.querySelector(`.trade-note-visual[data-trade-visual-ref="${index}"]`))
}

const removeVisualReference = (index: number) => {
  if (!editor.value) return
  const visuals = Array.from(editor.value.querySelectorAll(`.trade-note-visual[data-trade-visual-ref="${index}"]`))
  if (!visuals.length) return

  visuals.forEach((visual) => {
    const spacer = visual.nextElementSibling
    visual.remove()
    if (spacer?.tagName === 'P' && spacer.innerHTML === '<br>') spacer.remove()
  })

  syncEditor()
  visualRevision.value += 1
  saveSelection()
  isAttachMenuOpen.value = false
}

const toggleVisualReference = (index: number) => {
  if (hasVisualReference(index)) removeVisualReference(index)
  else insertVisualReference(index)
}

const handleBeforeInput = (event: InputEvent) => {
  if (event.inputType !== 'insertText' || !event.data || event.isComposing) return
  if (activeTextColor.value === 'currentColor') return

  const selection = window.getSelection()
  if (!editor.value || !selection?.rangeCount) return
  const range = selection.getRangeAt(0)
  if (!editor.value.contains(range.commonAncestorContainer)) return

  event.preventDefault()
  range.deleteContents()

  const span = document.createElement('span')
  span.style.color = activeTextColor.value
  span.appendChild(document.createTextNode(event.data))
  range.insertNode(span)

  const nextRange = document.createRange()
  nextRange.setStartAfter(span)
  nextRange.collapse(true)
  selection.removeAllRanges()
  selection.addRange(nextRange)
  syncEditor()
  saveSelection()
}

const handleCancel = () => {
  savedSelection.value = null
  isAttachMenuOpen.value = false
  emit('cancel')
}

onMounted(async () => {
  await nextTick()
  syncEditorFromModel()
  editor.value?.focus()
})
</script>

<template>
  <div class="relative flex w-full flex-col gap-4 border border-white/10 bg-white/[0.03] p-5">
    <button
      type="button"
      class="absolute right-3 top-3 z-10 px-3 py-2 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-white/50 transition-colors hover:text-white"
      @click="handleCancel"
    >
      {{ locale === 'ru' ? 'ОТМЕНА' : 'CANCEL' }}
    </button>

    <div class="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4 pr-24">
      <button type="button" class="border border-white/10 px-3 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors hover:bg-white hover:text-black" @mousedown.stop.prevent="applyBlock('h1')">H1</button>
      <button type="button" class="border border-white/10 px-3 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors hover:bg-white hover:text-black" @mousedown.stop.prevent="applyBlock('h2')">H2</button>
      <button type="button" class="border border-white/10 px-3 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors hover:bg-white hover:text-black" @mousedown.stop.prevent="applyBlock('h3')">H3</button>
      <button type="button" class="border border-white/10 px-3 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors hover:bg-white hover:text-black" @mousedown.stop.prevent="applyCommand('bold')">B</button>
      <button type="button" class="border border-white/10 px-3 py-2 font-mono text-[9px] font-black italic uppercase tracking-[0.24em] transition-colors hover:bg-white hover:text-black" @mousedown.stop.prevent="applyCommand('italic')">I</button>
      <button type="button" class="border border-white/10 px-3 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] underline transition-colors hover:bg-white hover:text-black" @mousedown.stop.prevent="applyCommand('underline')">U</button>
      <button type="button" class="border border-white/10 px-3 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors hover:bg-white hover:text-black" @mousedown.stop.prevent="applyCommand('insertUnorderedList')">LIST</button>
      <button type="button" class="border border-white/10 px-3 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors hover:bg-white hover:text-black" @mousedown.stop.prevent="applyBlock('blockquote')">QUOTE</button>
      <label class="relative flex h-7 w-8 cursor-pointer items-center justify-center border border-white/10" aria-label="Choose text color">
        <span class="h-4 w-4 border border-white/20" :style="{ backgroundColor: activeTextColor === 'currentColor' ? '#ffffff' : activeTextColor }"></span>
        <input
          type="color"
          :value="activeTextColor === 'currentColor' ? '#ffffff' : activeTextColor"
          class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Choose text color"
          @mousedown.stop
          @input="handleColorInput"
        />
      </label>
      <div class="relative inline-block">
        <button type="button" class="flex items-center gap-2 border border-white/10 px-3 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors hover:bg-white hover:text-black" @click.stop="isAttachMenuOpen = !isAttachMenuOpen">
          {{ locale === 'ru' ? 'ПРИКРЕПИТЬ' : 'ATTACH' }}
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7" />
          </svg>
        </button>
        <div v-if="isAttachMenuOpen" class="absolute left-0 top-full z-50 flex max-h-[360px] min-w-[280px] flex-col overflow-y-auto border border-white/10 bg-black shadow-xl">
          <div v-if="!attachableImages().length" class="px-4 py-4 font-mono text-[8px] uppercase tracking-[0.16em] opacity-50">
            {{ locale === 'ru' ? 'Нет сохраненных материалов' : 'No visuals archived' }}
          </div>
          <button
            v-for="(image, index) in attachableImages()"
            v-else
            :key="image.url || index"
            type="button"
            :class="hasVisualReference(index) ? 'bg-white text-black' : 'text-white hover:bg-white/10'"
            class="flex min-h-14 items-center justify-between gap-4 px-4 py-3 text-left font-mono text-[9px] font-black uppercase tracking-[0.12em] transition-colors"
            :aria-pressed="hasVisualReference(index)"
            @mousedown.stop.prevent="toggleVisualReference(index)"
          >
            <span class="flex min-w-0 items-center gap-3">
              <img :src="image.url" :alt="image.name || `Visual Node ${index}`" class="h-10 w-14 shrink-0 object-cover" />
              <span class="truncate">{{ image.name || `Visual Node ${index}` }}</span>
            </span>
            <span v-if="hasVisualReference(index)" aria-hidden="true">✓</span>
          </button>
        </div>
      </div>
    </div>

    <div
      ref="editor"
      contenteditable="true"
      data-text-editable="true"
      data-placeholder="WRITE YOUR TRADE NOTE..."
      :placeholder="locale === 'ru' ? 'ЗАПИШИТЕ МЫСЛИ ПО СДЕЛКЕ...' : 'WRITE YOUR TRADE NOTE...'"
      class="trade-note-rich min-h-[320px] w-full resize-none overflow-y-auto bg-transparent p-4 font-mono text-sm leading-relaxed text-white outline-none"
      @beforeinput="handleBeforeInput"
      @input="syncEditor"
      @mouseup="saveSelection"
      @keyup="saveSelection"
      @focus="saveSelection"
    ></div>

    <div class="flex items-center justify-end gap-3">
      <button
        type="button"
        :disabled="!props.modelValue.replace(/<[^>]*>/g, '').trim() || props.isPersisting"
        class="border border-white bg-white px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
        @click="emit('save')"
      >
        {{ locale === 'ru' ? 'СОХРАНИТЬ' : 'SAVE' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.trade-note-rich {
  line-height: 1.5;
  text-transform: none;
  user-select: text;
  cursor: text;
  white-space: normal;
}

.trade-note-rich:empty::before {
  content: attr(data-placeholder);
  opacity: 0.25;
}

.trade-note-rich :deep(h1) {
  margin: 0.4em 0 0.7em;
  font-size: 1.8em;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: 0.08em;
}

.trade-note-rich :deep(h2) {
  margin: 0.35em 0 0.6em;
  border-bottom: 1px solid rgb(255 255 255 / 0.2);
  padding-bottom: 0.25em;
  font-size: 1.45em;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 0.08em;
}

.trade-note-rich :deep(h3) {
  margin: 0.3em 0 0.5em;
  font-size: 1.15em;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: 0.06em;
}

.trade-note-rich :deep(p) {
  margin: 0 0 0.55em;
}

.trade-note-rich :deep(blockquote) {
  margin: 0.45em 0;
  border-left: 2px solid currentColor;
  padding-left: 0.8em;
  opacity: 0.78;
}

.trade-note-rich :deep(ul),
.trade-note-rich :deep(ol) {
  margin: 0.35em 0;
  padding-left: 1.5em;
}

.trade-note-rich :deep(ul) {
  list-style-type: disc;
}

.trade-note-rich :deep(ol) {
  list-style-type: decimal;
}

.trade-note-rich :deep(li) {
  margin: 0.18em 0;
}

.trade-note-rich :deep(.trade-note-visual) {
  position: relative;
  margin: 1rem 0;
  border: 1px solid rgb(255 255 255 / 0.12);
  background: rgb(255 255 255 / 0.04);
  padding: 0.5rem;
}

.trade-note-rich :deep(.trade-note-visual img) {
  display: block;
  width: 100%;
  max-height: 400px;
  object-fit: contain;
}

.trade-note-rich :deep(.trade-note-visual > div) {
  display: none;
}
</style>
