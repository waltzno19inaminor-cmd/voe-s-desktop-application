interface Cluster {
  key: string
  radius: number
}

function createLayoutRandom(keys: string[]) {
  let seed = 2166136261
  for (const key of keys) {
    for (const char of key) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619)
  }
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0
    return (seed >>> 0) / 4294967296
  }
}

/** Random offsets stay stable during zooming and differ between assets. */
export function layoutTradeNodes(asset: string, count: number, parentRadius = 42) {
  const random = createLayoutRandom([asset])
  const positions: { x: number; y: number }[] = []
  const cells = new Map<string, { x: number; y: number }[]>()
  const spacing = 60 // Two maximum child radii (25) and a 10px gap.
  // Keep every expanded trade clear of its parent, whose radius varies with
  // the number of trades for that asset.
  const innerRadius = parentRadius + 25 + 12
  let extent = 130
  for (let index = 0; index < count; index++) {
    const outerRadius = Math.sqrt(innerRadius ** 2 + (index + 1) * 40 ** 2)
    let position: { x: number; y: number } | undefined
    for (let attempt = 0; attempt < 96; attempt++) {
      const angle = random() * Math.PI * 2
      const radius = Math.sqrt(innerRadius ** 2 + random() * (outerRadius ** 2 - innerRadius ** 2))
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      const col = Math.floor(x / spacing)
      const row = Math.floor(y / spacing)
      let overlaps = false
      for (let dx = -1; dx <= 1 && !overlaps; dx++) {
        for (let dy = -1; dy <= 1 && !overlaps; dy++) {
          overlaps = (cells.get(`${col + dx}:${row + dy}`) ?? []).some(other =>
            (other.x - x) ** 2 + (other.y - y) ** 2 < spacing ** 2)
        }
      }
      if (!overlaps) { position = { x, y }; break }
    }
    if (!position) {
      // A random point beyond the occupied envelope is always free.
      const angle = random() * Math.PI * 2
      position = { x: Math.cos(angle) * (extent + 35), y: Math.sin(angle) * (extent + 35) }
    }
    positions.push(position)
    const key = `${Math.floor(position.x / spacing)}:${Math.floor(position.y / spacing)}`
    if (!cells.has(key)) cells.set(key, [])
    cells.get(key)!.push(position)
    extent = Math.max(extent, Math.hypot(position.x, position.y) + 25)
  }
  return { positions, extent }
}

/** Seeded placement keeps the same assets still across reactive updates. */
export function layoutAssetClusters(clusters: Cluster[]) {
  const random = createLayoutRandom(clusters.map(cluster => cluster.key))
  const placed: { x: number; y: number; radius: number }[] = []
  for (const { radius } of clusters) {
    if (!placed.length) {
      placed.push({ x: 0, y: 0, radius })
      continue
    }
    let best: { x: number; y: number; radius: number } | undefined
    let bestDistance = Infinity
    for (let attempt = 0; attempt < 96; attempt++) {
      const anchor = placed[Math.floor(random() * placed.length)]!
      const angle = random() * Math.PI * 2
      const distance = anchor.radius + radius + 12 + random() * 12
      const x = anchor.x + Math.cos(angle) * distance
      const y = anchor.y + Math.sin(angle) * distance
      if (x * x + y * y >= bestDistance) continue
      if (placed.some(other => Math.hypot(x - other.x, y - other.y) < radius + other.radius + 12)) continue
      best = { x, y, radius }
      bestDistance = x * x + y * y
    }
    // Guaranteed free position if the sampled gaps are all occupied.
    placed.push(best ?? { x: Math.max(...placed.map(node => node.x + node.radius)) + radius + 12, y: 0, radius })
  }
  if (!placed.length) return { positions: placed, extent: 130 }
  const left = Math.min(...placed.map(node => node.x - node.radius))
  const right = Math.max(...placed.map(node => node.x + node.radius))
  const top = Math.min(...placed.map(node => node.y - node.radius))
  const bottom = Math.max(...placed.map(node => node.y + node.radius))
  for (const node of placed) {
    node.x -= (left + right) / 2
    node.y -= (top + bottom) / 2
  }
  return { positions: placed, extent: Math.max(right - left, bottom - top) / 2 }
}
