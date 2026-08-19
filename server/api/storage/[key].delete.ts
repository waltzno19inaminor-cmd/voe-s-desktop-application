import { rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const STORAGE_KEY_PATTERN = /^[a-zA-Z0-9_-]+$/

export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key') || ''
  if (!STORAGE_KEY_PATTERN.test(key)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid storage key' })
  }

  const filePath = join(homedir(), 'Library', 'Application Support', 'JLJData', `${key}.json`)
  await rm(filePath, { force: true })
  return { ok: true }
})
