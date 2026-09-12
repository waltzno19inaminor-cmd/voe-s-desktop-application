# Local application updates

JLJ uses only the official signed Tauri updater. Every update contains the
complete Rust application, bundled Nuxt frontend, and application resources.
There are no payload, hotfix, or `.jljpatch` update paths.

Source code remains in the private `jorudr/voe-s` repository. Completed update
files are uploaded manually from the build computers to the public
`jorudr/JLJ` GitHub Release with tag `release`. No GitHub Actions runner is
used.

## One-time setup on both computers

Install Node.js, Rust, the Tauri prerequisites for the operating system, and
GitHub CLI. Authenticate GitHub CLI with an account allowed to update releases
in `jorudr/JLJ`:

```sh
gh auth login
```

Copy the same updater private key and its adjacent `.pub` file securely to both
computers. Never add either key or the password to Git. Before building, set:

macOS:

```sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
export TAURI_SIGNING_PRIVATE_KEY="$PWD/.secrets/tauri/jlj-signing-private.txt"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="YOUR_KEY_PASSWORD"
```

Windows PowerShell:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY="C:\secure\jlj-signing-private.txt"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD="YOUR_KEY_PASSWORD"
```

Installed `1.1.0` clients trust updater key `38F98BF6CE29CAB3`. The local tools
reject a different configured public key.

## Publish an update

On macOS, change the source and set the new version once:

```sh
npm run version:set -- 1.1.5
npm run update:verify
git add -A
git commit -m "chore: release 1.1.5"
git push origin release
npm run update:build:mac
npm run update:upload:mac
```

On Windows, pull exactly that commit and build the same version:

```powershell
git pull origin release
npm install
npm run update:verify
npm run update:build:windows
npm run update:upload:windows
npm run update:publish
```

`update:publish` refuses to create `latest.json` unless the `release` contains
both signed platform packages for the current version. It uploads
`latest.json` last, so clients never see a half-published update.

The installed application reads:

```text
https://github.com/jorudr/JLJ/releases/download/release/latest.json
```

It downloads the complete package for its own operating system, verifies the
signature, installs it over the old application, removes temporary updater
files, and relaunches.

## Test

A real update test requires an installed old application. `npx tauri dev` is
not an installed NSIS application or macOS `.app` and cannot verify replacement
of the installed executable.

After publishing, start an installed older version on Windows and macOS,
accept the update, and verify that each application relaunches and displays the
new native version.
