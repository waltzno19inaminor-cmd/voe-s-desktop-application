import { ref, computed, onMounted, onUnmounted, nextTick, type Ref } from 'vue'

export interface UseExForumTextEditorOptions {
  modelValue?: Ref<string>
  placeholder?: Ref<string> | string
  locale?: Ref<'ru' | 'en'> | 'ru' | 'en'
  mode?: 'rich' | 'markdown'
}

export function useExForumTextEditor(options: UseExForumTextEditorOptions = {}) {
  const {
    modelValue,
    placeholder = 'Введите текст статьи...',
    locale = 'ru',
    mode = 'rich'
  } = options

  // Main Editor Element Ref (contenteditable or textarea)
  const editorRef = ref<HTMLElement | null>(null)
  
  // Internal content state if modelValue is not passed
  const internalContent = ref('')
  const content = computed({
    get: () => (modelValue ? modelValue.value : internalContent.value),
    set: (val: string) => {
      if (modelValue) {
        modelValue.value = val
      } else {
        internalContent.value = val
      }
    }
  })

  // Selection & Toolbar state
  const isToolbarVisible = ref(false)
  const toolbarPosition = ref({ x: 0, y: 0 })
  const savedRange = ref<Range | null>(null)
  const activeColor = ref('#000000')

  // Formatting state for HUD buttons
  const activeFormats = ref({
    bold: false,
    italic: false,
    strikethrough: false,
    underline: false,
    code: false,
    h1: false,
    h2: false,
    blockquote: false,
    unorderedList: false,
    alignLeft: false,
    alignCenter: false,
    alignRight: false,
    alignJustify: false
  })

  // Selected text snippet (for context menu information)
  const selectedText = ref('')

  // Text statistics
  const charCount = computed(() => {
    const text = content.value.replace(/<[^>]*>/g, '').trim()
    return text.length
  })

  const wordCount = computed(() => {
    const text = content.value.replace(/<[^>]*>/g, '').trim()
    if (!text) return 0
    return text.split(/\s+/).length
  })

  const readingTimeMins = computed(() => {
    return Math.max(1, Math.ceil(wordCount.value / 200))
  })

  /**
   * Save the current user selection inside the editor
   */
  function saveSelection() {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    if (editorRef.value && editorRef.value.contains(range.commonAncestorContainer)) {
      savedRange.value = range.cloneRange()
      selectedText.value = selection.toString()
      updateActiveFormats()
    }
  }

  /**
   * Restore the saved user selection
   */
  function restoreSelection() {
    if (!savedRange.value) return
    const selection = window.getSelection()
    if (!selection) return
    selection.removeAllRanges()
    selection.addRange(savedRange.value)
  }

  /**
   * Check currently active formatting states at cursor / selection
   */
  function updateActiveFormats() {
    if (typeof document === 'undefined') return

    // If editor text content is completely empty, reset all active format states
    if (editorRef.value) {
      const rawText = editorRef.value.textContent?.replace(/[\n\r\t\s]/g, '') || ''
      if (rawText.length === 0) {
        activeFormats.value = {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          h1: false,
          h2: false,
          blockquote: false,
          unorderedList: false,
          alignLeft: false,
          alignCenter: false,
          alignRight: false,
          alignJustify: false
        }
        return
      }
    }

    activeFormats.value = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      strikethrough: document.queryCommandState('strikeThrough'),
      underline: document.queryCommandState('underline'),
      code: document.queryCommandValue('formatBlock') === 'pre',
      h1: document.queryCommandValue('formatBlock') === 'h1',
      h2: document.queryCommandValue('formatBlock') === 'h2',
      blockquote: document.queryCommandValue('formatBlock') === 'blockquote',
      unorderedList: document.queryCommandState('insertUnorderedList'),
      alignLeft: document.queryCommandState('justifyLeft'),
      alignCenter: document.queryCommandState('justifyCenter'),
      alignRight: document.queryCommandState('justifyRight'),
      alignJustify: document.queryCommandState('justifyFull')
    }
  }

  /**
   * Handle Context Menu (Right Click) on Editor
   */
  function handleContextMenu(event: MouseEvent) {
    const selection = window.getSelection()
    const text = selection ? selection.toString().trim() : ''

    if (!selection || selection.isCollapsed || !text) {
      isToolbarVisible.value = false
      return
    }

    // Verify selection is inside our editor
    const range = selection.getRangeAt(0)
    if (editorRef.value && !editorRef.value.contains(range.commonAncestorContainer)) {
      isToolbarVisible.value = false
      return
    }

    // Prevent default context menu and save selection
    event.preventDefault()
    savedRange.value = range.cloneRange()
    selectedText.value = text
    updateActiveFormats()

    // Calculate position: center toolbar under selection bounding box
    const rangeRect = range.getBoundingClientRect()
    const containerRect = editorRef.value ? editorRef.value.getBoundingClientRect() : null

    if (rangeRect.width > 0) {
      // Position relative to viewport
      toolbarPosition.value = {
        x: Math.max(120, Math.min(window.innerWidth - 120, rangeRect.left + rangeRect.width / 2)),
        y: Math.min(window.innerHeight - 80, rangeRect.bottom + 12)
      }
    } else {
      // Fallback to mouse pointer position
      toolbarPosition.value = {
        x: event.clientX,
        y: event.clientY + 12
      }
    }

    isToolbarVisible.value = true
  }

  /**
   * Close floating context toolbar
   */
  function closeToolbar() {
    isToolbarVisible.value = false
  }

  /**
   * Synchronize DOM innerHTML changes back to content ref
   * If all text characters are deleted, clear residual HTML format tags (blockquote, h1, etc.)
   */
  function syncContentFromDom() {
    if (!editorRef.value) return

    const rawText = editorRef.value.textContent?.replace(/[\n\r\t\s]/g, '') || ''

    // If user deleted all text characters, wipe residual DOM formatting wrapper elements
    if (rawText.length === 0) {
      if (editorRef.value.innerHTML !== '') {
        editorRef.value.innerHTML = ''
      }
      content.value = ''
      isToolbarVisible.value = false
      updateActiveFormats()
      return
    }

    content.value = editorRef.value.innerHTML
  }

  /**
   * Apply formatting command to current selection
   */
  function applyFormat(command: string, value: string = '') {
    if (!editorRef.value) return
    
    // Focus editor and restore range selection
    editorRef.value.focus()
    restoreSelection()

    document.execCommand('styleWithCSS', false, 'true')

    switch (command) {
      case 'bold':
        document.execCommand('bold', false)
        break
      case 'italic':
        document.execCommand('italic', false)
        break
      case 'strikethrough':
        document.execCommand('strikeThrough', false)
        break
      case 'underline':
        document.execCommand('underline', false)
        break
      case 'code':
        const isCode = activeFormats.value.code
        document.execCommand('formatBlock', false, isCode ? '<p>' : '<pre>')
        break
      case 'h1':
        const isH1 = activeFormats.value.h1
        document.execCommand('formatBlock', false, isH1 ? '<p>' : '<h1>')
        break
      case 'h2':
        const isH2 = activeFormats.value.h2
        document.execCommand('formatBlock', false, isH2 ? '<p>' : '<h2>')
        break
      case 'blockquote':
        const isQuote = activeFormats.value.blockquote
        document.execCommand('formatBlock', false, isQuote ? '<p>' : '<blockquote>')
        break
      case 'unorderedList':
        document.execCommand('insertUnorderedList', false)
        break
      case 'alignLeft':
        document.execCommand('justifyLeft', false)
        break
      case 'alignCenter':
        document.execCommand('justifyCenter', false)
        break
      case 'alignRight':
        document.execCommand('justifyRight', false)
        break
      case 'alignJustify':
        document.execCommand('justifyFull', false)
        break
      case 'color':
        if (value) {
          activeColor.value = value
          document.execCommand('foreColor', false, value)
        }
        break
      case 'clear':
        document.execCommand('removeFormat', false)
        break
      default:
        if (command) {
          document.execCommand(command, false, value)
        }
        break
    }

    syncContentFromDom()
    saveSelection()
    updateActiveFormats()
  }

  /**
   * Handle Click anywhere to dismiss context formatting toolbar
   */
  function handleClickOutside(event: MouseEvent) {
    if (!isToolbarVisible.value) return

    // Dismiss only on left clicks
    if (event.button !== 0) return

    const target = event.target as HTMLElement | null
    if (!target) return

    // If click is inside context toolbar buttons, do not close
    if (target.closest('[data-text-toolbar]')) {
      return
    }

    isToolbarVisible.value = false
  }

  /**
   * Initialize editor content into element
   */
  function setEditorRef(el: any) {
    if (el) {
      editorRef.value = el
      if (el.innerHTML !== content.value) {
        el.innerHTML = content.value
      }
    }
  }

  onMounted(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('selectionchange', saveSelection)
    }
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('selectionchange', saveSelection)
    }
  })

  return {
    editorRef,
    setEditorRef,
    content,
    isToolbarVisible,
    toolbarPosition,
    activeFormats,
    activeColor,
    selectedText,
    charCount,
    wordCount,
    readingTimeMins,
    handleContextMenu,
    closeToolbar,
    applyFormat,
    syncContentFromDom,
    saveSelection
  }
}
