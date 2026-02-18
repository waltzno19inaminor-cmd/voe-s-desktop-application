export function timeAgo(date: any): string {
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
