const preloadedImageUrls = new Set<string>()

type MatrixImagePreloadOptions = {
  timeoutMs?: number
  concurrency?: number
}

function isPreloadableImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const url = value.trim()
  if (!url) return false
  return /^(data:image\/|blob:|https?:\/\/|file:\/\/)/i.test(url)
}

function preloadImageUrl(url: string, timeoutMs: number) {
  if (preloadedImageUrls.has(url)) return Promise.resolve()
  if (typeof Image === 'undefined') return Promise.resolve()

  return new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      preloadedImageUrls.add(url)
      resolve()
    }

    const img = new Image()
    const timeout = window.setTimeout(finish, timeoutMs)
    img.onload = () => {
      window.clearTimeout(timeout)
      finish()
    }
    img.onerror = () => {
      window.clearTimeout(timeout)
      finish()
    }
    img.decoding = 'async'
    img.src = url

    if (img.decode) {
      img.decode()
        .then(() => {
          window.clearTimeout(timeout)
          finish()
        })
        .catch(() => undefined)
    }
  })
}

export async function preloadImageUrls(
  urls: unknown[],
  options: MatrixImagePreloadOptions = {}
) {
  const timeoutMs = options.timeoutMs ?? 2500
  const concurrency = options.concurrency ?? 8
  const queue = Array.from(new Set(urls.filter(isPreloadableImageUrl)))
  if (!queue.length) return

  let index = 0
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (index < queue.length) {
      const nextUrl = queue[index++]
      await preloadImageUrl(nextUrl, timeoutMs)
    }
  })

  await Promise.all(workers)
}

export function collectMatrixImageUrls(nodes: any[], urls = new Set<string>()) {
  nodes.forEach(node => {
    const params = node?.params || {}
    if (isPreloadableImageUrl(params.logo)) urls.add(params.logo.trim())
    if (isPreloadableImageUrl(params.imageUrl)) urls.add(params.imageUrl.trim())
    if (node?.type === 'embed-panel' && isPreloadableImageUrl(params.embedUrl)) {
      urls.add(params.embedUrl.trim())
    }
    if (node?.subGraph?.nodes?.length) {
      collectMatrixImageUrls(node.subGraph.nodes, urls)
    }
  })
  return Array.from(urls)
}
