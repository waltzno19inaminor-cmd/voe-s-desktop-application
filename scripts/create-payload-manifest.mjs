#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const RELEASE_CHANNELS = {
  release: { appIdentifier: 'com.voe.app' },
  'release-demo': { appIdentifier: 'com.voe.app.demo' },
}

const args = parseArgs(process.argv.slice(2))

if (args.help) {
  printHelp()
  process.exit(0)
}

for (const required of ['channel', 'version', 'minimumNativeVersion', 'platform', 'dir', 'out']) {
  if (!args[required]) fail(`Missing --${kebab(required)}`)
}

const channel = resolveReleaseChannel(args.channel)

if (!existsSync(args.dir)) fail(`Input directory does not exist: ${args.dir}`)

const files = []
for (const file of await listFiles(args.dir)) {
  const path = join(args.dir, file)
  const bytes = readFileSync(path)
  files.push({
    path: file.replaceAll('\\', '/'),
    sha256: sha256(bytes),
    size: bytes.length,
    url: args.fileUrlPrefix ? `${args.fileUrlPrefix.replace(/\/+$/, '')}/${file}` : file,
  })
}

const manifest = {
  channel: args.channel,
  appIdentifier: channel.appIdentifier,
  version: args.version,
  minimumNativeVersion: args.minimumNativeVersion,
  platform: args.platform,
  baseUrl: args.baseUrl || null,
  files,
}

mkdirSync(dirname(args.out), { recursive: true })
writeFileSync(args.out, `${JSON.stringify(manifest, null, 2)}\n`)
writeSignature(args.out)
createPayloadZip(args.dir, dirname(args.out), files)

console.log(`Created ${args.out}`)
if (existsSync(`${args.out}.minisig`)) console.log(`Signature: ${args.out}.minisig`)
const zipPath = resolve(dirname(args.out), 'payload.zip')
if (existsSync(zipPath)) console.log(`Archive: ${zipPath}`)
const patchPath = resolve(dirname(args.out), 'patch.zip')
if (existsSync(patchPath)) console.log(`Patch Archive: ${patchPath}`)
console.log(`Files: ${files.length}`)

function createPayloadZip(sourceDir, targetDir, currentFiles) {
  const targetZip = resolve(targetDir, 'payload.zip')
  const patchZip = resolve(targetDir, 'patch.zip')
  const changedFilesList = join(targetDir, '.changed_files_list.txt')

  // `zip` updates an existing archive in place, retaining files that disappeared
  // from the new build. Always create release archives from a clean slate.
  rmSync(targetZip, { force: true })
  rmSync(patchZip, { force: true })
  rmSync(changedFilesList, { force: true })

  // Persist manifest to .payload-history folder
  const historyDir = resolve(process.cwd(), '.payload-history')
  mkdirSync(historyDir, { recursive: true })
  const currentManifestFile = join(historyDir, `${args.version}.json`)
  writeFileSync(currentManifestFile, JSON.stringify(manifest, null, 2))

  let changedFiles = currentFiles
  try {
    const historyFiles = readdirSync(historyDir)
      .filter(f => f.endsWith('.json') && f !== `${args.version}.json`)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))

    let baseFile = null
    if (args.fromVersion) {
      const targetName = args.fromVersion.endsWith('.json') ? args.fromVersion : `${args.fromVersion}.json`
      if (historyFiles.includes(targetName)) {
        baseFile = targetName
      } else {
        console.warn(`Specified --from-version file "${targetName}" not found in .payload-history, falling back to earliest version.`)
      }
    }

    if (!baseFile && historyFiles.length > 0) {
      // Default to the earliest version in history for cumulative patch compatibility
      baseFile = historyFiles[0]
    }

    if (baseFile) {
      const prevManifest = JSON.parse(readFileSync(join(historyDir, baseFile), 'utf8'))
      const prevMap = new Map(prevManifest.files.map(f => [f.path, f.sha256]))
      changedFiles = currentFiles.filter(f => !prevMap.has(f.path) || prevMap.get(f.path) !== f.sha256)
      console.log(`Differential Analysis (compared with ${baseFile}): ${changedFiles.length} files changed out of ${currentFiles.length}`)
    }
  } catch (err) {
    console.warn('Failed to compare previous version manifest:', err)
  }

  try {
    const res1 = spawnSync('zip', [
      '-q', '-r', targetZip, '.',
      '-x', 'payload/*', '-x', './payload/*',
      '-x', '.DS_Store', '-x', '*/.DS_Store',
      '-x', '._*', '-x', '*/._*',
      '-x', '__MACOSX/*',
      '-x', 'Thumbs.db', '-x', '*/Thumbs.db',
    ], { cwd: sourceDir })
    if (res1.error) console.error('Full payload zip error:', res1.error)
  } catch (err) {
    console.error('Full payload zip failed:', err)
  }

  if (changedFiles.length > 0) {
    const changedPaths = changedFiles.map(f => f.path)
    writeFileSync(changedFilesList, changedPaths.join('\n'))
    try {
      const inputBuffer = readFileSync(changedFilesList)
      const res2 = spawnSync('zip', ['-q', patchZip, '-@'], { cwd: sourceDir, input: inputBuffer })
      if (res2.error) console.error('Patch zip error:', res2.error)
    } catch (err) {
      console.error('Patch zip failed:', err)
    }
  }
}

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      out.help = true
      continue
    }
    if (!arg.startsWith('--')) fail(`Unexpected argument ${arg}`)
    const key = camel(arg.slice(2))
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      out[key] = true
    } else {
      out[key] = next
      i += 1
    }
  }
  return out
}

async function listFiles(root) {
  const files = []
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === '.DS_Store' || entry.name === 'Thumbs.db' || entry.name.startsWith('._') || entry.name === '__MACOSX' || entry.name === 'payload' || entry.name === 'dist' || entry.name.endsWith('.zip') || entry.name.endsWith('.jljpatch')) {
        continue
      }
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      } else if (entry.isFile()) {
        try {
          if (existsSync(full)) {
            files.push(relative(root, full).replaceAll('\\', '/'))
          }
        } catch {}
      }
    }
  }
  await walk(root)
  return files.sort()
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function resolveReleaseChannel(value) {
  const channel = RELEASE_CHANNELS[value]
  if (!channel) {
    fail(`Unknown --channel ${value}. Expected one of: ${Object.keys(RELEASE_CHANNELS).join(', ')}`)
  }
  return channel
}

function writeSignature(manifestPath) {
  const signaturePath = `${manifestPath}.minisig`
  if (args.minisignKey) {
    const minisignArgs = ['-S', '-s', args.minisignKey, '-m', manifestPath, '-x', signaturePath]
    const result = spawnSync('minisign', minisignArgs, { stdio: 'inherit' })
    if (result.status !== 0) fail('minisign failed')
    return
  }

  const keyPath = args.tauriSignerKeyPath || process.env.TAURI_SIGNING_PRIVATE_KEY_PATH
  if (!keyPath) return

  let password = args.tauriSignerPassword ?? process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD
  if (password === undefined && existsSync('.secrets/hotfix/jlj-hotfix.password')) {
    password = readFileSync('.secrets/hotfix/jlj-hotfix.password', 'utf8').trim()
  }
  const generatedSignaturePath = `${manifestPath}.sig`
  const signerArgs = ['tauri', 'signer', 'sign', '--private-key-path', keyPath]
  if (password !== undefined) signerArgs.push('--password', password)
  signerArgs.push(manifestPath)

  const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', signerArgs, { stdio: 'inherit' })
  if (result.status !== 0) fail('tauri signer failed')
  if (!existsSync(generatedSignaturePath)) fail(`tauri signer did not create ${generatedSignaturePath}`)
  writeFileSync(signaturePath, normalizeTauriSignature(readFileSync(generatedSignaturePath, 'utf8')))
}

function normalizeTauriSignature(signatureText) {
  const trimmed = signatureText.trim()
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8')
    if (decoded.includes('untrusted comment:') && decoded.includes('trusted comment:')) {
      return `${decoded.trim()}\n`
    }
  } catch {}

  return `${trimmed}\n`
}

function camel(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

function kebab(value) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

function fail(message) {
  console.error(`create-payload-manifest: ${message}`)
  process.exit(1)
}

function printHelp() {
  console.log(`Usage:
  npm run payload:manifest -- \\
    --channel release \\
    --version 1.0.95 \\
    --minimum-native-version 1.0.89 \\
    --platform any \\
    --dir .output/public \\
    --base-url https://example.com/releases/1.0.95/public/ \\
    --tauri-signer-key-path .secrets/hotfix/jlj-hotfix.key \\
    --out dist/payload/1.0.95/payload-manifest.json

The manifest lists every file in the generated frontend payload. The app
downloads only files whose sha256 is not already present in the active payload
or bundled assets, then activates the complete target tree atomically. If
--tauri-signer-key-path, TAURI_SIGNING_PRIVATE_KEY_PATH, or --minisign-key is
provided, the script also writes payload-manifest.json.minisig.`)
}
