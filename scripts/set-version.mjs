#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'

const version = String(process.argv[2] || '').trim().replace(/^[vV]/, '')
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error('Usage: npm run version:set -- 1.1.5')
  process.exit(1)
}

updateJson('package.json', (data) => {
  data.version = version
})
updateJson('package-lock.json', (data) => {
  data.version = version
  if (data.packages?.['']) data.packages[''].version = version
})
updateJson('src-tauri/tauri.conf.json', (data) => {
  data.version = version
})

replaceVersionInToml('src-tauri/Cargo.toml', /(\[package\][\s\S]*?^version\s*=\s*)"[^"]+"/m)
replaceVersionInToml('src-tauri/Cargo.lock', /(\[\[package\]\]\s*\nname\s*=\s*"app"\s*\nversion\s*=\s*)"[^"]+"/m)

console.log(`Unified application version set to ${version}`)

function updateJson(path, mutate) {
  const data = JSON.parse(readFileSync(path, 'utf8'))
  mutate(data)
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

function replaceVersionInToml(path, pattern) {
  const source = readFileSync(path, 'utf8')
  if (!pattern.test(source)) throw new Error(`Version field not found in ${path}`)
  const updated = source.replace(pattern, `$1"${version}"`)
  writeFileSync(path, updated)
}
