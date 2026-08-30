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
  --channel release \
  --version 1.0.95 \
  --minimum-native-version 1.0.89 \
  --platform any \
  --dir .output/public \
  --base-url https://example.com/releases/1.0.95/public/ \
  --tauri-signer-key-path .secrets/hotfix/jlj-hotfix.key \
  --out dist/payload/1.0.95/payload-manifest.json
```

`minimumNativeVersion` is the oldest Rust/Tauri shell that is allowed to run
the payload. Upload `payload.zip`, `patch.zip`, `payload-manifest.json`, and
`payload-manifest.json.minisig` to the same hosted release directory. The app
verifies the manifest signature first, then uses the manifest as the source of
truth: every file listed there must exist locally after install, with the exact
listed size and SHA-256.

## Runtime commands

- `payload_update_get_state`
- `payload_update_install_from_feed`
- `payload_update_clear`

`payload_update_install_from_feed` accepts a `manifestUrl`. It downloads the
manifest, validates app id/platform/version and `minimumNativeVersion`, stages
the target tree, verifies all hashes, then atomically replaces
`JLJData/patches/active-web`.

## Release channels

Payloads are channel-bound and cannot be installed by the other application:

| Git branch / release tag | App identifier | Manifest argument |
| --- | --- | --- |
| `release` | `com.voe.app` | `--channel release` |
| `release-demo` | `com.voe.app.demo` | `--channel release-demo` |

The demo app has its own Tauri app-data directory (`…/com.voe.app.demo`), so its
active payload and patch state are isolated from the full app. Every manifest
includes both the channel and app identifier; the runtime verifies both before
downloading any files.

## Enable startup auto-check

Set the manifest URL at build time:

```bash
NUXT_PUBLIC_PAYLOAD_MANIFEST_URL=https://github.com/jorudr/JLJ/releases/download/release/payload-manifest.json \
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
use the normal signed Tauri update. Startup always checks that update first. If
the installed native version is `1.0.88`, the channel contains native `1.0.89`,
and payload `1.0.95` requires native `1.0.89`, the app installs native `1.0.89`,
restarts, and only then offers payload `1.0.95`. Rust validates the same rule,
so the payload cannot bypass it.

The release workflow publishes both update layers to the same channel release.
Tauri's `latest.json` selects the signed updater artifact for the running OS and
architecture. Manual installer assets such as `.dmg` and `.exe` may coexist in
the release, but the app uses Tauri updater bundles (`.app.tar.gz`, NSIS updater
packages, and future supported platform packages) instead of guessing by file
extension. `bundle.createUpdaterArtifacts` must remain enabled in
`src-tauri/tauri.conf.json`; `bundle.targets: "all"` alone only creates manual
installer bundles.
