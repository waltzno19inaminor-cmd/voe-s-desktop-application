import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const STORAGE_KEY_PATTERN = /^[a-zA-Z0-9_-]+$/

function getStoragePath(key: string) {
  if (!STORAGE_KEY_PATTERN.test(key)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid storage key' })
  }

  return join(homedir(), 'Library', 'Application Support', 'JLJData', `${key}.json`)
}

export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key') || ''
  const filePath = getStoragePath(key)

  try {
    return JSON.parse(await readFile(filePath, 'utf8'))
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      throw createError({ statusCode: 404, statusMessage: 'Storage file not found' })
    }
    throw createError({ statusCode: 500, statusMessage: 'Unable to read storage JSON' })
  }
})
