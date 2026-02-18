export const textarea = ref<HTMLTextAreaElement | null>(null)

export function autoGrow(e?: Event) {
  const el = (e?.target as HTMLTextAreaElement) || textarea.value
  if (!el) return

  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}
