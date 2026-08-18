#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative } from 'node:path'
import { spawnSync } from 'node:child_process'
import JSZip from 'jszip'

const APP_IDENTIFIER = 'com.voe.app'

const args = parseArgs(process.argv.slice(2))

if (args.help) {
  printHelp()
  process.exit(0)
}

for (const required of ['baseVersion', 'patchId', 'toPatchLevel', 'platform', 'fixedDir', 'out']) {
  if (!args[required]) fail(`Missing --${kebab(required)}`)
}

const fromPatchLevel = args.fromPatchLevel || null
const baseDir = args.baseDir || null
const fixedDir = args.fixedDir
const outPath = args.out
const workDir = args.workDir || join('.hotfix-work', args.patchId)
const payloadRoot = join(workDir, 'payload')
const manifestPath = join(workDir, 'manifest.json')
const signaturePath = join(workDir, 'manifest.minisig')

rmSync(workDir, { recursive: true, force: true })
mkdirSync(payloadRoot, { recursive: true })

const operations = []
const fixedFiles = await listFiles(fixedDir)
const baseFiles = baseDir && existsSync(baseDir) ? new Set(await listFiles(baseDir)) : new Set()

for (const file of fixedFiles) {
  const fixedPath = join(fixedDir, file)
  const fixedBytes = await readFile(fixedPath)
  const newSha256 = sha256(fixedBytes)
  const basePath = baseDir ? join(baseDir, file) : null
  const oldSha256 = basePath && existsSync(basePath) ? sha256(await readFile(basePath)) : null

  if (oldSha256 && oldSha256 === newSha256) continue

  const payloadName = file.replaceAll('\\', '/')
  const payloadPath = join(payloadRoot, payloadName)
  mkdirSync(dirname(payloadPath), { recursive: true })
  await writeFile(payloadPath, fixedBytes)

  operations.push({
    op: 'replace',
    scope: 'resource',
    target: payloadName,
    payload: payloadName,
    oldSha256,
    newSha256,
    payloadSha256: newSha256,
  })
}

for (const file of baseFiles) {
  if (fixedFiles.includes(file)) continue
  operations.push({
    op: 'delete',
    scope: 'resource',
    target: file.replaceAll('\\', '/'),
    payload: null,
    oldSha256: sha256(readFileSync(join(baseDir, file))),
    newSha256: null,
    payloadSha256: null,
  })
}

const extraOperations = args.operations ? JSON.parse(readFileSync(args.operations, 'utf8')) : []
operations.push(...extraOperations)

const manifest = {
  patchId: args.patchId,
  baseVersion: args.baseVersion,
  fromPatchLevel,
  toPatchLevel: args.toPatchLevel,
  appIdentifier: APP_IDENTIFIER,
  platforms: args.platform.split(',').map((value) => value.trim()).filter(Boolean),
  kind: args.kind || inferKind(operations),
  operations,
  oldSha256: args.oldSha256 || null,
  newSha256: args.newSha256 || null,
  payloadSha256: null,
}

mkdirSync(dirname(manifestPath), { recursive: true })
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

if (args.minisignKey) {
  const minisignArgs = ['-S', '-s', args.minisignKey, '-m', manifestPath, '-x', signaturePath]
  if (args.minisignTrustedComment) {
    minisignArgs.push('-t', args.minisignTrustedComment)
  }
  const result = spawnSync('minisign', minisignArgs, { stdio: 'inherit' })
  if (result.status !== 0) fail('minisign failed')
} else if (args.tauriSignerKeyPath || process.env.TAURI_SIGNING_PRIVATE_KEY_PATH) {
  const keyPath = args.tauriSignerKeyPath || process.env.TAURI_SIGNING_PRIVATE_KEY_PATH
  const password = args.tauriSignerPassword ?? process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD
  const generatedSignaturePath = `${manifestPath}.sig`
  rmSync(generatedSignaturePath, { force: true })

  const signerArgs = ['tauri', 'signer', 'sign', '--private-key-path', keyPath]
  if (password !== undefined) {
    signerArgs.push('--password', password)
  }
  signerArgs.push(manifestPath)

  const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', signerArgs, { stdio: 'inherit' })
  if (result.status !== 0) fail('tauri signer failed')
  if (!existsSync(generatedSignaturePath)) fail(`tauri signer did not create ${generatedSignaturePath}`)
  writeFileSync(signaturePath, normalizeTauriSignature(readFileSync(generatedSignaturePath, 'utf8')))
} else if (args.signature) {
  writeFileSync(signaturePath, readFileSync(args.signature))
} else {
  fail('Provide --minisign-key, --tauri-signer-key-path, TAURI_SIGNING_PRIVATE_KEY_PATH, or --signature. Patches must be signed.')
}

const zip = new JSZip()
zip.file('manifest.json', readFileSync(manifestPath))
zip.file('manifest.minisig', readFileSync(signaturePath))

for (const file of await listFiles(payloadRoot)) {
  zip.file(`payload/${file.replaceAll('\\', '/')}`, await readFile(join(payloadRoot, file)))
}
if (args.extraPayloadDir) {
  for (const file of await listFiles(args.extraPayloadDir)) {
    zip.file(`payload/${file.replaceAll('\\', '/')}`, await readFile(join(args.extraPayloadDir, file)))
  }
}

mkdirSync(dirname(outPath), { recursive: true })
const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
writeFileSync(outPath, buffer)

console.log(`Created ${outPath}`)
console.log(`Operations: ${operations.length}`)
console.log(`Manifest: ${manifestPath}`)

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
  if (!existsSync(root)) return []
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

function inferKind(operations) {
  const hasResource = operations.some((operation) => operation.scope === 'resource')
  const hasNative = operations.some((operation) => operation.scope === 'native')
  if (hasResource && hasNative) return 'mixed'
  if (hasNative) return 'native'
  return 'resource'
}

function camel(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

function kebab(value) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

function fail(message) {
  console.error(`create-hotfix-patch: ${message}`)
  process.exit(1)
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

function printHelp() {
  console.log(`
Create a signed JLJ .jljpatch package.

Resource patch example:
  node scripts/create-hotfix-patch.mjs \\
    --base-version 1.0.4 \\
    --patch-id 1.0.4-hotfix.1 \\
    --to-patch-level hotfix.1 \\
    --platform windows-x64,macos-universal \\
    --base-dir artifacts/1.0.4/public \\
    --fixed-dir .output/public \\
    --minisign-key "$MINISIGN_KEY_PATH" \\
    --out dist/JLJ-1.0.4-hotfix.1.jljpatch

Tauri signer example:
  node scripts/create-hotfix-patch.mjs \\
    --base-version 1.0.4 \\
    --patch-id 1.0.4-hotfix.1 \\
    --to-patch-level hotfix.1 \\
    --platform windows-x64,macos-universal \\
    --base-dir artifacts/1.0.4/public \\
    --fixed-dir .output/public \\
    --tauri-signer-key-path .secrets/hotfix/jlj-hotfix.key \\
    --tauri-signer-password "$TAURI_SIGNING_PRIVATE_KEY_PASSWORD" \\
    --out dist/JLJ-1.0.4-hotfix.1.jljpatch

Native operations can be appended with --operations native-ops.json and --extra-payload-dir path/to/payload.
The JSON file must contain PatchOperation objects compatible with the Rust patcher.
`)
}
