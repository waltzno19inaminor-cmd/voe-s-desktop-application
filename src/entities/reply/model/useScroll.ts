export function scrollToSource(source: { threadId: string; blockIndex: number }) {
  if (!source) return

  const el = document.querySelector(
    `[data-thesis-block="${source.blockIndex}"]`
  )

  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('ring-1', 'ring-black', 'dark:ring-white' )
    setTimeout(() => {
      el.classList.remove('ring-1', 'ring-black', 'dark:ring-white' )
    }, 2500)
  }
}