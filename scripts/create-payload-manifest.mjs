#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
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

for (const required of ['channel', 'version', 'platform', 'dir', 'out']) {
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
  platform: args.platform,
  baseUrl: args.baseUrl || null,
  files,
}

mkdirSync(dirname(args.out), { recursive: true })
writeFileSync(args.out, `${JSON.stringify(manifest, null, 2)}\n`)
writeSignature(args.out)

console.log(`Created ${args.out}`)
if (existsSync(`${args.out}.minisig`)) console.log(`Signature: ${args.out}.minisig`)
console.log(`Files: ${files.length}`)

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
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      } else if (entry.isFile()) {
        files.push(relative(root, full).replaceAll('\\', '/'))
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

  const password = args.tauriSignerPassword ?? process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD
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
    --version 1.0.6 \\
    --platform macos-universal \\
    --dir .output/public \\
    --base-url https://example.com/releases/1.0.6/public/ \\
    --tauri-signer-key-path .secrets/hotfix/jlj-hotfix.key \\
    --out dist/payload/1.0.6/payload-manifest.json

The manifest lists every file in the generated frontend payload. The app
downloads only files whose sha256 is not already present in the active payload
or bundled assets, then activates the complete target tree atomically. If
--tauri-signer-key-path, TAURI_SIGNING_PRIVATE_KEY_PATH, or --minisign-key is
provided, the script also writes payload-manifest.json.minisig.`)
}
