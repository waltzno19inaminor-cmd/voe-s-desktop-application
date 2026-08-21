use app_lib::patch::{
    active_manifest_path_from_root, active_signature_path_from_root, active_web_dir_from_root,
    current_platform, hash_eq, jlj_data_root_from_data_dir, patches_root_from_data_dir,
    read_state_from_root, sanitize_relative_path, save_state_to_root, sha256_bytes_hex,
    sha256_file_hex, verify_active_from_root, verify_minisign, PatchManifest, PatchOpKind,
    PatchOperation, PatchScope, PatchState, VerifiedFileHash, RELEASE_APP_IDENTIFIER,
    RELEASE_CHANNEL, RELEASE_DEMO_APP_IDENTIFIER, RELEASE_DEMO_CHANNEL,
};
use std::{
    env, fs,
    io::Read,
    path::{Path, PathBuf},
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};
use tempfile::TempDir;
use walkdir::WalkDir;
use zip::ZipArchive;

const PATCH_MANIFEST_ENTRY: &str = "manifest.json";
const PATCH_SIGNATURE_ENTRY: &str = "manifest.minisig";
const PRODUCT_NAME: &str = "J.L.JÖRMUNGANDR";
const LEGACY_PRODUCT_NAME: &str = "JLJ";

#[derive(Debug)]
struct Args {
    channel: ReleaseChannel,
    patch_path: PathBuf,
    app_path: Option<PathBuf>,
    dry_run: bool,
}

#[derive(Debug, Clone, Copy)]
enum ReleaseChannel {
    Release,
    ReleaseDemo,
}

impl ReleaseChannel {
    fn parse(value: &str) -> Result<Self, String> {
        match value {
            RELEASE_CHANNEL => Ok(Self::Release),
            RELEASE_DEMO_CHANNEL => Ok(Self::ReleaseDemo),
            _ => Err(format!(
                "unknown --channel {value}; expected {RELEASE_CHANNEL} or {RELEASE_DEMO_CHANNEL}"
            )),
        }
    }

    fn name(self) -> &'static str {
        match self {
            Self::Release => RELEASE_CHANNEL,
            Self::ReleaseDemo => RELEASE_DEMO_CHANNEL,
        }
    }

    fn app_identifier(self) -> &'static str {
        match self {
            Self::Release => RELEASE_APP_IDENTIFIER,
            Self::ReleaseDemo => RELEASE_DEMO_APP_IDENTIFIER,
        }
    }

    fn product_name(self) -> &'static str {
        match self {
            Self::Release => PRODUCT_NAME,
            Self::ReleaseDemo => "J.L.JÖRMUNGANDR Demo",
        }
    }
}

fn main() {
    if let Err(err) = run() {
        eprintln!("JLJ hotfix patch failed: {err}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let args = parse_args()?;
    let app_path = match args.app_path {
        Some(path) => path,
        None => locate_installed_app(args.channel)?,
    };

    if !app_path.exists() {
        return Err(format!(
            "installed app was not found: {}",
            app_path.display()
        ));
    }

    let file = fs::File::open(&args.patch_path)
        .map_err(|err| format!("open patch {}: {err}", args.patch_path.display()))?;
    let mut archive = ZipArchive::new(file).map_err(|err| format!("read patch archive: {err}"))?;

    let manifest_bytes = read_zip_entry(&mut archive, PATCH_MANIFEST_ENTRY)?;
    let signature_text = String::from_utf8(read_zip_entry(&mut archive, PATCH_SIGNATURE_ENTRY)?)
        .map_err(|err| format!("manifest signature is not UTF-8: {err}"))?;
    verify_minisign(&manifest_bytes, &signature_text)?;

    let manifest: PatchManifest =
        serde_json::from_slice(&manifest_bytes).map_err(|err| format!("parse manifest: {err}"))?;
    validate_manifest(&manifest, args.channel)?;
    validate_install(&manifest, &app_path)?;

    let data_dir = dirs::data_dir()
        .ok_or_else(|| "system data directory is unavailable".to_string())?
        .join(args.channel.app_identifier());
    let jlj_data = jlj_data_root_from_data_dir(&data_dir);
    let patches_root = patches_root_from_data_dir(&data_dir);
    fs::create_dir_all(&patches_root).map_err(|err| format!("create patches dir: {err}"))?;

    validate_patch_chain(&manifest, &patches_root)?;

    if args.dry_run {
        println!(
            "Patch {} is valid for {} on {}. Dry run complete.",
            manifest.patch_id,
            app_path.display(),
            current_platform()
        );
        return Ok(());
    }

    println!("Applying JLJ hotfix {}...", manifest.patch_id);
    println!("App: {}", app_path.display());
    println!("Data: {}", jlj_data.display());

    let temp = TempDir::new().map_err(|err| format!("create temp dir: {err}"))?;
    let backup_dir = patches_root.join("backups").join(&manifest.patch_id);
    if backup_dir.exists() {
        fs::remove_dir_all(&backup_dir).map_err(|err| format!("remove old backup: {err}"))?;
    }
    fs::create_dir_all(&backup_dir).map_err(|err| format!("create backup dir: {err}"))?;

    let apply_result = apply_patch(
        &mut archive,
        &manifest,
        &signature_text,
        &manifest_bytes,
        &app_path,
        &patches_root,
        temp.path(),
        &backup_dir,
    );

    if let Err(err) = apply_result {
        let _ = rollback_native_backups(&backup_dir, &app_path);
        return Err(err);
    }

    verify_native_code_signature(&app_path)?;
    let verify = verify_active_from_root(&patches_root, Some(manifest.base_version.clone()))?;
    if !verify.valid {
        return Err(format!(
            "post-apply verification failed: {}",
            verify.message
        ));
    }

    println!("JLJ hotfix {} applied successfully.", manifest.patch_id);
    Ok(())
}

fn parse_args() -> Result<Args, String> {
    let mut channel = None;
    let mut patch_path = None;
    let mut app_path = None;
    let mut dry_run = false;
    let mut iter = env::args().skip(1);

    while let Some(arg) = iter.next() {
        match arg.as_str() {
            "--channel" => {
                channel = iter
                    .next()
                    .map(|value| ReleaseChannel::parse(&value))
                    .transpose()?;
            }
            "--patch" => {
                patch_path = iter.next().map(PathBuf::from);
            }
            "--app" => {
                app_path = iter.next().map(PathBuf::from);
            }
            "--dry-run" => {
                dry_run = true;
            }
            "--help" | "-h" => {
                print_help();
                std::process::exit(0);
            }
            value if patch_path.is_none() => {
                patch_path = Some(PathBuf::from(value));
            }
            value => return Err(format!("unknown argument: {value}")),
        }
    }

    Ok(Args {
        channel: channel.ok_or_else(|| "missing --channel release|release-demo".to_string())?,
        patch_path: patch_path
            .ok_or_else(|| "missing --patch path/to/file.jljpatch".to_string())?,
        app_path,
        dry_run,
    })
}

fn print_help() {
    println!(
        "J.L.JÖRMUNGANDR hotfix patcher\n\nUsage:\n  hotfix_patcher --channel release|release-demo --patch JLJ-1.0.4-hotfix.1.jljpatch [--app /path/to/J.L.JÖRMUNGANDR.app|J.L.JÖRMUNGANDR.exe] [--dry-run]"
    );
}

fn locate_installed_app(channel: ReleaseChannel) -> Result<PathBuf, String> {
    let mut candidates = Vec::new();

    #[cfg(target_os = "macos")]
    {
        candidates.push(PathBuf::from(format!(
            "/Applications/{}.app",
            channel.product_name()
        )));
        if matches!(channel, ReleaseChannel::Release) {
            candidates.push(PathBuf::from(format!(
                "/Applications/{LEGACY_PRODUCT_NAME}.app"
            )));
        }
        if let Some(home) = dirs::home_dir() {
            let applications = home.join("Applications");
            candidates.push(applications.join(format!("{}.app", channel.product_name())));
            if matches!(channel, ReleaseChannel::Release) {
                candidates.push(applications.join(format!("{LEGACY_PRODUCT_NAME}.app")));
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        for root in ["ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA"] {
            if let Some(value) = env::var_os(root) {
                let root = PathBuf::from(value);
                let mut app_names = vec![channel.product_name()];
                if matches!(channel, ReleaseChannel::Release) {
                    app_names.push(LEGACY_PRODUCT_NAME);
                }
                for app_name in app_names {
                    candidates.push(root.join(app_name).join(format!("{app_name}.exe")));
                    candidates.push(
                        root.join(app_name)
                            .join(format!("{LEGACY_PRODUCT_NAME}.exe")),
                    );
                }
            }
        }
    }

    candidates
        .into_iter()
        .find(|path| path.exists())
        .ok_or_else(|| "could not locate JLJ automatically; pass --app".to_string())
}

fn read_zip_entry<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
    name: &str,
) -> Result<Vec<u8>, String> {
    let mut file = archive
        .by_name(name)
        .map_err(|err| format!("missing {name}: {err}"))?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes)
        .map_err(|err| format!("read {name}: {err}"))?;
    Ok(bytes)
}

fn validate_manifest(manifest: &PatchManifest, channel: ReleaseChannel) -> Result<(), String> {
    if manifest.app_identifier != channel.app_identifier() {
        return Err("patch is for a different app identifier".to_string());
    }
    if manifest.channel != channel.name() {
        return Err("patch is for a different release channel".to_string());
    }
    if !manifest.platforms.iter().any(|p| p == &current_platform()) {
        return Err(format!(
            "patch does not support platform {}",
            current_platform()
        ));
    }
    if manifest.base_version.trim().is_empty()
        || manifest.patch_id.trim().is_empty()
        || manifest.to_patch_level.trim().is_empty()
    {
        return Err("patch manifest has empty version fields".to_string());
    }
    Ok(())
}

fn validate_install(manifest: &PatchManifest, app_path: &Path) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let plist = app_path.join("Contents").join("Info.plist");
        if plist.exists() {
            let content =
                fs::read_to_string(&plist).map_err(|err| format!("read Info.plist: {err}"))?;
            if !content.contains(&format!("<string>{}</string>", manifest.app_identifier)) {
                return Err("installed app identifier does not match patch channel".to_string());
            }
            if !content.contains(&format!("<string>{}</string>", manifest.base_version)) {
                return Err(format!(
                    "installed app does not look like base version {}",
                    manifest.base_version
                ));
            }
        }
    }

    if let Some(expected) = manifest.old_sha256.as_deref() {
        let actual = sha256_file_hex(&app_executable_path(app_path)?)?;
        if !hash_eq(expected, &actual) {
            return Err("installed executable hash does not match patch base".to_string());
        }
    }

    Ok(())
}

fn validate_patch_chain(manifest: &PatchManifest, patches_root: &Path) -> Result<(), String> {
    let state = read_state_from_root(patches_root)?;
    match (manifest.from_patch_level.as_deref(), state.as_ref()) {
        (None, None) => Ok(()),
        (None, Some(existing)) if existing.patch_level.is_none() => Ok(()),
        (Some(expected), Some(existing)) if existing.patch_level.as_deref() == Some(expected) => {
            Ok(())
        }
        (Some(expected), _) => Err(format!("patch requires existing patch level {expected}")),
        (None, Some(existing)) => Err(format!(
            "patch requires unpatched base, but current patch level is {:?}",
            existing.patch_level
        )),
    }
}

#[allow(clippy::too_many_arguments)]
fn apply_patch<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
    manifest: &PatchManifest,
    signature_text: &str,
    manifest_bytes: &[u8],
    app_path: &Path,
    patches_root: &Path,
    temp_root: &Path,
    backup_dir: &Path,
) -> Result<(), String> {
    let active_web = active_web_dir_from_root(patches_root);
    let staging_web = temp_root.join("active-web");

    if active_web.exists() {
        copy_dir(&active_web, &staging_web)?;
    } else {
        fs::create_dir_all(&staging_web).map_err(|err| format!("create staging web: {err}"))?;
    }

    let mut verified = Vec::new();
    for operation in &manifest.operations {
        apply_operation(
            archive,
            operation,
            app_path,
            &staging_web,
            backup_dir,
            &mut verified,
        )?;
    }

    if active_web.exists() {
        fs::remove_dir_all(&active_web).map_err(|err| format!("remove old active web: {err}"))?;
    }
    fs::rename(&staging_web, &active_web).map_err(|err| format!("activate web patch: {err}"))?;

    fs::write(active_manifest_path_from_root(patches_root), manifest_bytes)
        .map_err(|err| format!("write active manifest: {err}"))?;
    fs::write(
        active_signature_path_from_root(patches_root),
        signature_text,
    )
    .map_err(|err| format!("write active signature: {err}"))?;

    let state = PatchState {
        base_version: manifest.base_version.clone(),
        patch_level: Some(manifest.to_patch_level.clone()),
        patch_id: Some(manifest.patch_id.clone()),
        platform: current_platform(),
        applied_at: Some(current_timestamp()),
        manifest_sha256: Some(sha256_bytes_hex(manifest_bytes)),
        verified_file_hashes: verified,
    };
    save_state_to_root(patches_root, &state)?;

    Ok(())
}

fn apply_operation<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
    operation: &PatchOperation,
    app_path: &Path,
    staging_web: &Path,
    backup_dir: &Path,
    verified: &mut Vec<VerifiedFileHash>,
) -> Result<(), String> {
    let target_rel = sanitize_relative_path(&operation.target)?;
    let target = match operation.scope {
        PatchScope::Resource => staging_web.join(&target_rel),
        PatchScope::Native => resolve_native_target(app_path, &target_rel)?,
    };

    match operation.op {
        PatchOpKind::Delete => {
            if target.exists() {
                backup_file(&target, app_path, backup_dir)?;
                fs::remove_file(&target)
                    .map_err(|err| format!("delete {}: {err}", target.display()))?;
            }
        }
        PatchOpKind::Replace => {
            let payload = read_payload(archive, operation)?;
            if let Some(expected) = operation.payload_sha256.as_deref() {
                let actual = sha256_bytes_hex(&payload);
                if !hash_eq(expected, &actual) {
                    return Err(format!("payload hash mismatch for {}", operation.target));
                }
            }
            if let Some(parent) = target.parent() {
                fs::create_dir_all(parent).map_err(|err| format!("create target dir: {err}"))?;
            }
            if target.exists() {
                if let Some(expected) = operation.old_sha256.as_deref() {
                    let actual = sha256_file_hex(&target)?;
                    if !hash_eq(expected, &actual) {
                        return Err(format!("old hash mismatch for {}", target.display()));
                    }
                }
                backup_file(&target, app_path, backup_dir)?;
            }
            fs::write(&target, payload)
                .map_err(|err| format!("write {}: {err}", target.display()))?;
        }
        PatchOpKind::Bsdiff => {
            let patch = read_payload(archive, operation)?;
            if let Some(expected) = operation.payload_sha256.as_deref() {
                let actual = sha256_bytes_hex(&patch);
                if !hash_eq(expected, &actual) {
                    return Err(format!("delta hash mismatch for {}", operation.target));
                }
            }
            if !target.exists() {
                return Err(format!("bsdiff target missing: {}", target.display()));
            }
            if let Some(expected) = operation.old_sha256.as_deref() {
                let actual = sha256_file_hex(&target)?;
                if !hash_eq(expected, &actual) {
                    return Err(format!("old hash mismatch for {}", target.display()));
                }
            }
            backup_file(&target, app_path, backup_dir)?;
            let old =
                fs::read(&target).map_err(|err| format!("read {}: {err}", target.display()))?;
            let mut new = Vec::new();
            bsdiff::patch(&old, &mut patch.as_slice(), &mut new)
                .map_err(|err| format!("apply bsdiff to {}: {err}", target.display()))?;
            fs::write(&target, new).map_err(|err| format!("write {}: {err}", target.display()))?;
        }
    }

    if let Some(expected) = operation.new_sha256.as_deref() {
        let actual = sha256_file_hex(&target)?;
        if !hash_eq(expected, &actual) {
            return Err(format!("new hash mismatch for {}", target.display()));
        }
        verified.push(VerifiedFileHash {
            path: operation.target.clone(),
            sha256: actual,
        });
    }

    Ok(())
}

fn read_payload<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
    operation: &PatchOperation,
) -> Result<Vec<u8>, String> {
    let payload = operation
        .payload
        .as_deref()
        .ok_or_else(|| format!("operation {} has no payload", operation.target))?;
    let payload = sanitize_relative_path(payload)?;
    let entry = format!("payload/{}", payload.to_string_lossy().replace('\\', "/"));
    read_zip_entry(archive, &entry)
}

fn app_executable_path(app_path: &Path) -> Result<PathBuf, String> {
    #[cfg(target_os = "macos")]
    {
        if app_path.extension().and_then(|s| s.to_str()) == Some("app") {
            let macos_dir = app_path.join("Contents").join("MacOS");
            for executable_name in [PRODUCT_NAME, LEGACY_PRODUCT_NAME, "app"] {
                let candidate = macos_dir.join(executable_name);
                if candidate.exists() {
                    return Ok(candidate);
                }
            }
            return Ok(macos_dir.join(PRODUCT_NAME));
        }
    }

    #[cfg(target_os = "windows")]
    {
        if app_path.is_dir() {
            for executable_name in [PRODUCT_NAME, LEGACY_PRODUCT_NAME] {
                let candidate = app_path.join(format!("{executable_name}.exe"));
                if candidate.exists() {
                    return Ok(candidate);
                }
            }
            return Ok(app_path.join(format!("{PRODUCT_NAME}.exe")));
        }
    }

    Ok(app_path.to_path_buf())
}

fn resolve_native_target(app_path: &Path, target_rel: &Path) -> Result<PathBuf, String> {
    if target_rel == Path::new("app-executable") {
        return app_executable_path(app_path);
    }

    #[cfg(target_os = "windows")]
    {
        if app_path.is_file() {
            let root = app_path
                .parent()
                .ok_or_else(|| "app executable has no parent directory".to_string())?;
            return Ok(root.join(target_rel));
        }
    }

    Ok(app_path.join(target_rel))
}

fn backup_file(path: &Path, app_path: &Path, backup_dir: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }

    let rel = if path == app_executable_path(app_path)?.as_path() {
        PathBuf::from("app-executable")
    } else if let Ok(stripped) = path.strip_prefix(app_path) {
        stripped.to_path_buf()
    } else if let Some(parent) = app_path.parent() {
        path.strip_prefix(parent).unwrap_or(path).to_path_buf()
    } else {
        path.to_path_buf()
    };

    let dest = backup_dir.join(rel);
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|err| format!("create backup dir: {err}"))?;
    }
    fs::copy(path, &dest).map_err(|err| format!("backup {}: {err}", path.display()))?;
    Ok(())
}

fn rollback_native_backups(backup_dir: &Path, app_path: &Path) -> Result<(), String> {
    if !backup_dir.exists() {
        return Ok(());
    }
    for entry in WalkDir::new(backup_dir).into_iter().filter_map(Result::ok) {
        if !entry.file_type().is_file() {
            continue;
        }
        let rel = entry
            .path()
            .strip_prefix(backup_dir)
            .map_err(|err| format!("backup strip prefix: {err}"))?;
        let dest = if rel == Path::new("app-executable") {
            app_executable_path(app_path)?
        } else {
            let app_root = if app_path.is_file() {
                app_path
                    .parent()
                    .ok_or_else(|| "app executable has no parent directory".to_string())?
            } else {
                app_path
            };
            app_root.join(rel)
        };
        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent).map_err(|err| format!("rollback create dir: {err}"))?;
        }
        fs::copy(entry.path(), &dest)
            .map_err(|err| format!("rollback {}: {err}", dest.display()))?;
    }
    Ok(())
}

fn copy_dir(from: &Path, to: &Path) -> Result<(), String> {
    for entry in WalkDir::new(from).into_iter().filter_map(Result::ok) {
        let rel = entry
            .path()
            .strip_prefix(from)
            .map_err(|err| format!("copy strip prefix: {err}"))?;
        let dest = to.join(rel);
        if entry.file_type().is_dir() {
            fs::create_dir_all(&dest).map_err(|err| format!("copy create dir: {err}"))?;
        } else if entry.file_type().is_file() {
            if let Some(parent) = dest.parent() {
                fs::create_dir_all(parent).map_err(|err| format!("copy create parent: {err}"))?;
            }
            fs::copy(entry.path(), &dest)
                .map_err(|err| format!("copy {}: {err}", entry.path().display()))?;
        }
    }
    Ok(())
}

fn verify_native_code_signature(app_path: &Path) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if app_path.extension().and_then(|s| s.to_str()) == Some("app") {
            let status = Command::new("codesign")
                .args(["--verify", "--deep", "--strict"])
                .arg(app_path)
                .status()
                .map_err(|err| format!("run codesign verification: {err}"))?;
            if !status.success() {
                return Err("codesign verification failed after patch".to_string());
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    let _ = app_path;

    Ok(())
}

fn current_timestamp() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    format!("{seconds}")
}
