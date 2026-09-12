#!/usr/bin/env node
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const command = process.argv[2] || 'help'
const releaseRepository = process.env.UPDATE_REPOSITORY || 'jorudr/JLJ'
const releaseTag = process.env.UPDATE_CHANNEL || 'release'
const expectedUpdaterKeyId = '3E4432970578851F'
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

process.chdir(root)

const version = verifyProjectConfiguration()
const outputDirectory = join(root, 'dist', 'update', version)
const artifacts = {
  macos: {
    fileName: `JLJ_${version}_universal.app.tar.gz`,
    sourceDirectory: join(root, 'src-tauri', 'target', 'universal-apple-darwin', 'release', 'bundle', 'macos'),
    sourceSuffix: '.app.tar.gz',
  },
  windows: {
    fileName: `JLJ_${version}_windows-x86_64-setup.exe`,
    sourceDirectory: join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis'),
    sourceSuffix: '-setup.exe',
  },
}

switch (command) {
  case 'verify':
    if (process.env.TAURI_SIGNING_PRIVATE_KEY || process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
      requireSigningEnvironment()
    }
    console.log(`Configuration verified: ${version}; updater key ${expectedUpdaterKeyId}`)
    break
  case 'build-mac':
    await buildMac()
    break
  case 'build-windows':
    await buildWindows()
    break
  case 'upload-mac':
    uploadPlatform('macos')
    break
  case 'upload-windows':
    uploadPlatform('windows')
    break
  case 'publish':
    publishManifest()
    break
  default:
    printHelp()
    if (command !== 'help' && command !== '--help' && command !== '-h') process.exitCode = 1
}

function verifyProjectConfiguration() {
  const packageJson = readJson('package.json')
  const tauriConfig = readJson('src-tauri/tauri.conf.json')
  const cargoToml = readFileSync('src-tauri/Cargo.toml', 'utf8')
  const cargoLock = readFileSync('src-tauri/Cargo.lock', 'utf8')
  const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1]
  const lockVersion = cargoLock.match(/name = "app"\nversion = "([^"]+)"/)?.[1]
  const versions = [packageJson.version, tauriConfig.version, cargoVersion, lockVersion]

  if (!versions[0] || versions.some((value) => value !== versions[0])) {
    fail(`Versions do not match: package=${versions[0]}, tauri=${versions[1]}, cargo=${versions[2]}, lock=${versions[3]}`)
  }
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(versions[0])) {
    fail(`Invalid application version: ${versions[0]}`)
  }
  if (tauriConfig.bundle?.createUpdaterArtifacts !== true) {
    fail('src-tauri/tauri.conf.json must set bundle.createUpdaterArtifacts to true')
  }
  const endpoint = tauriConfig.plugins?.updater?.endpoints?.[0]
  const expectedEndpoint = `https://github.com/${releaseRepository}/releases/download/${releaseTag}/latest.json`
  if (endpoint !== expectedEndpoint) {
    fail(`Updater endpoint must be ${expectedEndpoint}; found ${endpoint || 'nothing'}`)
  }
  const publicKey = decodeBase64(tauriConfig.plugins?.updater?.pubkey || '', 'updater public key')
  if (!publicKey.includes(`minisign public key: ${expectedUpdaterKeyId}`)) {
    fail(`Updater key must remain ${expectedUpdaterKeyId} so installed 1.1.0 clients can update`)
  }

  return versions[0]
}

async function buildMac() {
  requireHost('darwin', 'macOS')
  requireSigningEnvironment()
  const buildStartedAt = Date.now()
  await runTauriBuild(['tauri', 'build', '--target', 'universal-apple-darwin', '--bundles', 'app'])
  stageArtifact('macos', buildStartedAt)
}

async function buildWindows() {
  requireHost('win32', 'Windows')
  if (process.arch !== 'x64') fail(`Windows updater target must be x64; current architecture is ${process.arch}`)
  requireSigningEnvironment()
  const buildStartedAt = Date.now()
  await runTauriBuild(['tauri', 'build', '--bundles', 'nsis'])
  stageArtifact('windows', buildStartedAt)
}

function stageArtifact(platform, buildStartedAt) {
  const artifact = artifacts[platform]
  if (!existsSync(artifact.sourceDirectory)) {
    fail(`Tauri output directory does not exist: ${artifact.sourceDirectory}`)
  }

  const candidates = readdirSync(artifact.sourceDirectory)
    .filter((name) => name.endsWith(artifact.sourceSuffix))
    .map((name) => join(artifact.sourceDirectory, name))
    .filter((path) => existsSync(`${path}.sig`))
    .filter((path) => Math.min(statSync(path).mtimeMs, statSync(`${path}.sig`).mtimeMs) >= buildStartedAt - 2_000)
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)

  const source = candidates[0]
  if (!source) {
    fail(`No signed Tauri updater artifact found in ${artifact.sourceDirectory}`)
  }

  mkdirSync(outputDirectory, { recursive: true })
  const destination = join(outputDirectory, artifact.fileName)
  copyFileSync(source, destination)
  copyFileSync(`${source}.sig`, `${destination}.sig`)
  validateSignature(readFileSync(`${destination}.sig`, 'utf8'), `${destination}.sig`)

  console.log(`Prepared ${platform} updater:`)
  console.log(`  ${destination}`)
  console.log(`  ${destination}.sig`)
}

function uploadPlatform(platform) {
  requireGitHubCli()
  const artifact = artifacts[platform]
  const file = join(outputDirectory, artifact.fileName)
  const signature = `${file}.sig`
  requireFile(file)
  requireFile(signature)
  validateSignature(readFileSync(signature, 'utf8'), signature)
  ensureRelease()
  run('gh', [
    'release', 'upload', releaseTag,
    '--repo', releaseRepository,
    '--clobber',
    file,
    signature,
  ])
  console.log(`Uploaded ${platform} updater ${version} to ${releaseRepository}`)
  console.log('Do not publish latest.json until both platforms have been uploaded.')
}

function publishManifest() {
  requireGitHubCli()
  ensureRelease()

  const release = JSON.parse(capture('gh', [
    'release', 'view', releaseTag,
    '--repo', releaseRepository,
    '--json', 'assets',
  ]))
  const assetsByName = new Map((release.assets || []).map((asset) => [asset.name, asset]))
  const mac = requireRemotePair(assetsByName, artifacts.macos.fileName)
  const windows = requireRemotePair(assetsByName, artifacts.windows.fileName)
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'jlj-tauri-update-'))

  try {
    run('gh', [
      'release', 'download', releaseTag,
      '--repo', releaseRepository,
      '--dir', temporaryDirectory,
      '--clobber',
      '--pattern', `${artifacts.macos.fileName}.sig`,
      '--pattern', `${artifacts.windows.fileName}.sig`,
    ])

    const macSignature = readSignature(join(temporaryDirectory, `${artifacts.macos.fileName}.sig`))
    const windowsSignature = readSignature(join(temporaryDirectory, `${artifacts.windows.fileName}.sig`))
    const manifest = {
      version,
      notes: process.env.UPDATE_NOTES || `Full application update ${version}`,
      pub_date: new Date().toISOString(),
      platforms: {
        'windows-x86_64': { signature: windowsSignature, url: assetUrl(windows.fileName) },
        'darwin-x86_64': { signature: macSignature, url: assetUrl(mac.fileName) },
        'darwin-aarch64': { signature: macSignature, url: assetUrl(mac.fileName) },
      },
    }

    mkdirSync(outputDirectory, { recursive: true })
    const manifestPath = join(outputDirectory, 'latest.json')
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    run('gh', [
      'release', 'upload', releaseTag,
      '--repo', releaseRepository,
      '--clobber',
      manifestPath,
    ])
    console.log(`Published ${manifestPath}`)
    console.log(`Clients on Windows and macOS can now update to ${version}.`)
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true })
  }
}

function requireRemotePair(assetsByName, fileName) {
  const file = assetsByName.get(fileName)
  const signature = assetsByName.get(`${fileName}.sig`)
  if (!file || !signature) {
    fail(`Release ${releaseTag} does not contain both ${fileName} and ${fileName}.sig`)
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || !Number.isFinite(signature.size) || signature.size <= 0) {
    fail(`Release assets for ${fileName} are empty`)
  }
  return { fileName, file, signature }
}

function ensureRelease() {
  const view = spawnSync('gh', ['release', 'view', releaseTag, '--repo', releaseRepository], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
  })
  if (view.status === 0) return

  run('gh', [
    'release', 'create', releaseTag,
    '--repo', releaseRepository,
    '--title', `JLJ ${releaseTag}`,
    '--notes', 'Signed Tauri desktop updates for Windows and macOS.',
  ])
}

function requireSigningEnvironment() {
  const key = String(process.env.TAURI_SIGNING_PRIVATE_KEY || '').trim()
  const password = String(process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD || '')
  if (!key) fail('TAURI_SIGNING_PRIVATE_KEY is not set')
  if (!password) fail('TAURI_SIGNING_PRIVATE_KEY_PASSWORD is not set')

  if (existsSync(key)) {
    if (!existsSync(`${key}.pub`)) {
      fail(`Public key file is missing: ${key}.pub`)
    }

    verifyUpdaterPublicKey(readFileSync(`${key}.pub`, 'utf8').trim(), `${key}.pub`)
    return
  }

  // Tauri accepts the private key contents directly, including its base64
  // representation. The Tauri signer performs the authoritative validation.
  const optionalPublicKey = String(process.env.TAURI_SIGNING_PUBLIC_KEY || '').trim()
  if (optionalPublicKey) {
    const publicKeyValue = existsSync(optionalPublicKey)
      ? readFileSync(optionalPublicKey, 'utf8').trim()
      : optionalPublicKey
    verifyUpdaterPublicKey(publicKeyValue, 'TAURI_SIGNING_PUBLIC_KEY')
  }
}

function verifyUpdaterPublicKey(value, source) {
  const decoded = tryDecodeBase64(value) || value
  if (!decoded.includes(`minisign public key: ${expectedUpdaterKeyId}`)) {
    fail(`${source} does not match installed clients (${expectedUpdaterKeyId})`)
  }
}

function requireGitHubCli() {
  const result = spawnSync('gh', ['auth', 'status'], { cwd: root, encoding: 'utf8', stdio: 'pipe' })
  if (result.status !== 0) {
    fail('GitHub CLI is not authenticated. Run gh auth login or set GH_TOKEN.')
  }
}

function requireHost(expected, label) {
  if (process.platform !== expected) fail(`This command must run on ${label}; current platform is ${process.platform}`)
}

function requireFile(path) {
  if (!existsSync(path) || statSync(path).size <= 0) fail(`Required file is missing or empty: ${path}`)
}

function readSignature(path) {
  requireFile(path)
  const signature = readFileSync(path, 'utf8').trim()
  validateSignature(signature, path)
  return signature
}

function validateSignature(signature, source) {
  const trimmed = String(signature || '').trim()
  if (!trimmed) fail(`Updater signature is empty: ${source}`)
  const decoded = decodeBase64(trimmed, source)
  if (!decoded.includes('untrusted comment:') || !decoded.includes('trusted comment:')) {
    fail(`Updater signature has an unexpected format: ${source}`)
  }
  const lines = decoded.trim().split('\n')
  if (lines.length >= 2) {
    const sigBytes = Buffer.from(lines[1].trim(), 'base64')
    if (sigBytes.length >= 10) {
      const keyId = sigBytes.subarray(2, 10)
      const keyIdHex = Buffer.from(keyId).reverse().toString('hex').toUpperCase()
      if (keyIdHex !== expectedUpdaterKeyId) {
        fail(`Signature in ${source} was generated with key ${keyIdHex}, but expected ${expectedUpdaterKeyId}`)
      }
    }
  }
}

function decodeBase64(value, label) {
  try {
    const decoded = Buffer.from(String(value).trim(), 'base64').toString('utf8')
    if (!decoded) throw new Error('empty')
    return decoded
  } catch {
    fail(`Invalid base64 in ${label}`)
  }
}

function tryDecodeBase64(value) {
  try {
    const normalized = String(value).trim()
    if (!normalized || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized) || normalized.length % 4 !== 0) return ''
    return Buffer.from(normalized, 'base64').toString('utf8')
  } catch {
    return ''
  }
}

function assetUrl(fileName) {
  return `https://github.com/${releaseRepository}/releases/download/${releaseTag}/${encodeURIComponent(fileName)}`
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'))
}

function run(executable, args) {
  const result = spawnSync(executable, args, { cwd: root, env: process.env, stdio: 'inherit' })
  if (result.error) fail(`${executable} failed to start: ${result.error.message}`)
  if (result.status !== 0) fail(`${executable} exited with code ${result.status}`)
}

function runTauriBuild(args) {
  return new Promise((resolvePromise) => {
    const child = spawn(npx, args, { cwd: root, env: process.env, stdio: ['inherit', 'pipe', 'pipe'] })
    let outputTail = ''
    let keyMismatch = false

    const forward = (destination) => (chunk) => {
      destination.write(chunk)
      outputTail = `${outputTail}${chunk.toString()}`.slice(-4_000)
      if (outputTail.toLowerCase().includes('does not match the public key from')) keyMismatch = true
    }

    child.stdout.on('data', forward(process.stdout))
    child.stderr.on('data', forward(process.stderr))
    child.on('error', (error) => fail(`${npx} failed to start: ${error.message}`))
    child.on('close', (code) => {
      if (code !== 0) fail(`${npx} exited with code ${code}`)
      if (keyMismatch) {
        fail(`The private updater key does not match configured key ${expectedUpdaterKeyId}; artifacts were not staged`)
      }
      resolvePromise()
    })
  })
}

function capture(executable, args) {
  const result = spawnSync(executable, args, { cwd: root, env: process.env, encoding: 'utf8', stdio: 'pipe' })
  if (result.error) fail(`${executable} failed to start: ${result.error.message}`)
  if (result.status !== 0) fail(result.stderr?.trim() || `${executable} exited with code ${result.status}`)
  return result.stdout
}

function fail(message) {
  console.error(`update: ${message}`)
  process.exit(1)
}

function printHelp() {
  console.log(`
Local signed Tauri update commands:
  npm run update:verify
  npm run update:build:mac
  npm run update:upload:mac
  npm run update:build:windows
  npm run update:upload:windows
  npm run update:publish

Build commands require TAURI_SIGNING_PRIVATE_KEY (a key value or file path) and
TAURI_SIGNING_PRIVATE_KEY_PASSWORD. Upload and publish commands require an
authenticated GitHub CLI (gh auth login) or GH_TOKEN.
`)
}
