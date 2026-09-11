# Application updates

JLJ has one update mechanism: a signed, complete Tauri application update.
Every release replaces the native Rust application and the bundled Nuxt
frontend together on Windows and macOS.

There are no payload versions, minimum native versions, differential web
archives, or separately published frontend updates.

## Publish a new version

1. Set the same version in:
   - `package.json`
   - `package-lock.json` (the root package entries)
   - `src-tauri/Cargo.toml`
   - `src-tauri/Cargo.lock` (the `app` package entry)
   - `src-tauri/tauri.conf.json`
2. Commit and push the source.
3. Run the GitHub Actions workflow `publish` for the required channel.
4. Do not manually create or edit `latest.json`. The Tauri action generates it
   from the signed Windows and macOS updater artifacts.
5. The workflow succeeds only if the published `latest.json` contains signed
   updater entries for both Windows and macOS.

The updater signing key must not be rotated casually. Installed `1.1.0`
clients trust key `38F98BF6CE29CAB3`, so the release workflow rejects a
different public key. GitHub secrets `TAURI_SIGNING_PRIVATE_KEY` and
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` must contain its matching private key and
password.

The installed application checks `latest.json`, downloads the full signed
package for its operating system, installs it, and relaunches. For example,
version `1.1.0` updates directly to `1.1.1`; the update contains all Rust and
frontend changes.

## Test an update

A real self-update must be tested from an installed application bundle. Tauri
cannot reliably replace a `tauri dev` process because that process is not an
installed NSIS application on Windows or an installed `.app` bundle on macOS.

1. Publish and install a baseline version on both systems.
2. Increment all version files to the next version.
3. Run `publish` again.
4. Start the baseline applications and accept the offered update.
5. Confirm that each application relaunches and reports the new version.

`npx tauri dev` remains useful for developing and checking the update UI, but
the final installer replacement must be tested with installed builds.
