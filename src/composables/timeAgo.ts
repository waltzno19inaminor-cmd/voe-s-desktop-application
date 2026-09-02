export function timeAgo(date: any, locale: 'ru' | 'en' = 'en'): string {
  const now = new Date()

  let parsedDate: Date


  if (date?.seconds) {
    parsedDate = new Date(date.seconds * 1000)
  }
  
  else if (typeof date === 'string') {
    parsedDate = new Date(date)
  }

  else if (date instanceof Date) {
    parsedDate = date
  }

  else {
    return 'unknown time'
  }

  const seconds = Math.floor((now.getTime() - parsedDate.getTime()) / 1000)

  if (locale === 'ru') {
    const formatter = new Intl.RelativeTimeFormat('ru-RU', { numeric: 'always' })

    if (seconds < 60) return 'только что'

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return formatter.format(-minutes, 'minute')

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return formatter.format(-hours, 'hour')

    const days = Math.floor(hours / 24)
    if (days < 7) return formatter.format(-days, 'day')

    const weeks = Math.floor(days / 7)
    if (weeks < 4) return formatter.format(-weeks, 'week')

    const months = Math.floor(days / 30)
    if (months < 12) return formatter.format(-months, 'month')

    const years = Math.floor(days / 365)
    return formatter.format(-years, 'year')
  }

  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hours ago`

  const days = Math.floor(hours / 24)
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`

  const weeks = Math.floor(days / 7)
  if (weeks === 1) return '1 week ago'
  if (weeks < 4) return `${weeks} weeks ago`

  const months = Math.floor(days / 30)
  if (months === 1) return '1 month ago'
  if (months < 12 && months > 0) return `${months} months ago`
  if (months === 0 || months < 0) return 'less than a month ago'

  const years = Math.floor(days / 365)
  if (years === 1) return '1 year ago'
  return `${years} years ago`
}
