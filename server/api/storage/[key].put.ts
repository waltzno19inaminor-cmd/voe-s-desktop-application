import { mkdir, rename, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import { join } from 'node:path'

const STORAGE_KEY_PATTERN = /^[a-zA-Z0-9_-]+$/

function getStoragePath(key: string) {
  if (!STORAGE_KEY_PATTERN.test(key)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid storage key' })
  }

  const directory = join(homedir(), 'Library', 'Application Support', 'JLJData')
  return { directory, filePath: join(directory, `${key}.json`) }
}

export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key') || ''
  const { directory, filePath } = getStoragePath(key)
  const payload = await readBody(event)

  if (payload === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'JSON payload is required' })
  }

  await mkdir(directory, { recursive: true })
  // A unique name prevents concurrent saves of the same JSON file from
  // overwriting each other's temporary file before the atomic rename.
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, filePath)

  return { ok: true }
})
