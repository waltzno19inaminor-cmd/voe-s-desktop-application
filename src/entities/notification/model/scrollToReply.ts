export function scrollToReply( replyId: string) {
  if (!replyId) return

  const el = document.querySelector(
    `[data-reply-index="${replyId}"]`
  )


  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })

  }
}