# JLJ payload updates

This is the League/Genshin-style updater layer for the web payload.

The installed Tauri app acts as the stable shell. The update payload is the
generated frontend output from `.output/public`. On startup or from UI, the app
can download a remote payload manifest, reuse files that already match by
SHA-256, download missing/changed files, verify the final tree, and activate it
through the existing `jljpatch://localhost/index.html` protocol.

## Create a payload manifest

Build the frontend:

```bash
npm run build
```

Generate a manifest:

```bash
npm run payload:manifest -- \
  --version 1.0.6 \
  --platform macos-universal \
  --dir .output/public \
  --base-url https://example.com/releases/1.0.6/public/ \
  --tauri-signer-key-path .secrets/hotfix/jlj-hotfix.key \
  --out dist/payload/1.0.6/payload-manifest.json
```

Upload the complete `.output/public` tree, `payload-manifest.json`, and
`payload-manifest.json.minisig` to the same hosted release directory. The app
verifies the manifest signature first, then uses the manifest as the source of
truth: every file listed there must exist locally after install, with the exact
listed size and SHA-256.

## Runtime commands

- `payload_update_get_state`
- `payload_update_install_from_feed`
- `payload_update_clear`

`payload_update_install_from_feed` accepts a `manifestUrl`. It downloads the
manifest, validates app id/platform/version, stages the target tree, verifies all
hashes, then atomically replaces `JLJData/patches/active-web`.

## Enable startup auto-check

Set the manifest URL at build time:

```bash
NUXT_PUBLIC_PAYLOAD_MANIFEST_URL=https://example.com/releases/stable/payload-manifest.json \
  npm run build
```

`ExInitialization` calls `payload_update_install_from_feed` before the login or
registration form is shown. If files were downloaded and activated, it relaunches
the app so the next start loads the updated payload. If no manifest URL is
configured, the app is not running inside Tauri, no update is available, or the
check fails, the initialization screen shows a synthetic 3-4 second update
progress bar before continuing.

## Current scope

This updates the frontend payload fully. Native/Rust/Tauri shell changes still
require a normal Tauri full update.
