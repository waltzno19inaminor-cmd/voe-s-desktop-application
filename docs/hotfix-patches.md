# JLJ hotfix patches

JLJ supports maintenance hotfixes for an already-installed public version.
The public version can stay `1.0.4`, while the internal patch level becomes
`1.0.4-hotfix.1`, `1.0.4-hotfix.2`, and so on.

## Package format

A `.jljpatch` file is a zip archive with:

- `manifest.json`
- `manifest.minisig`
- `payload/**`

The manifest is signed with Minisign. The app and the standalone patcher verify
the manifest with the public key in `src-tauri/tauri.conf.json.pub`.

Resource patches are intentionally small. They contain only changed Nuxt output
files. At runtime, `jljpatch://localhost/...` serves patched files from
`dataDir/JLJData/patches/active-web` and falls back to the bundled Tauri assets
for unchanged files.

Native patches can use `replace` or `bsdiff` operations. The patcher verifies
old and new SHA-256 hashes and keeps a backup for rollback.

## Create a resource hotfix

Build the fixed frontend:

```bash
npm run build
```

Create a signed patch:

```bash
npm run hotfix:package -- \
  --base-version 1.0.4 \
  --patch-id 1.0.4-hotfix.1 \
  --to-patch-level hotfix.1 \
  --platform windows-x64,macos-universal \
  --base-dir artifacts/1.0.4/public \
  --fixed-dir .output/public \
  --minisign-key "$MINISIGN_KEY_PATH" \
  --out dist/hotfix/JLJ-1.0.4-hotfix.1.jljpatch
```

`--base-dir` should point to the original `.output/public` for the public base
version. If it is omitted, every file in `--fixed-dir` is packaged as a replace
operation.

## Build the standalone patcher

```bash
cd src-tauri
cargo build --release --bin hotfix_patcher
```

Run it:

```bash
./target/release/hotfix_patcher \
  --patch ../dist/hotfix/JLJ-1.0.4-hotfix.1.jljpatch \
  --app /Applications/JLJ.app
```

On Windows, pass the installed `JLJ.exe` path if auto-detection does not find it.
If the app is installed under `Program Files`, run the patcher with admin rights.

## Native operations file

Use `--operations native-ops.json` to append native operations to the generated
manifest. Example:

```json
[
  {
    "op": "bsdiff",
    "scope": "native",
    "target": "app-executable",
    "payload": "native/JLJ.exe.bsdiff",
    "oldSha256": "...",
    "newSha256": "...",
    "payloadSha256": "..."
  }
]
```

Pass `--extra-payload-dir path/to/payload` so those files are included under
`payload/**` in the final `.jljpatch`.

## CI secrets

Required:

- `MINISIGN_PRIVATE_KEY`: private key text or path material used by the workflow
  to sign `manifest.json`.
- `MINISIGN_PRIVATE_KEY_PASSWORD`: if the key is password-protected.
- Existing Tauri release secrets for full app releases remain unchanged.

Never commit private signing keys. `*.key`, `*.minisig`, and `.hotfix-work/` are
ignored by git.
