use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use minisign_verify::{PublicKey, Signature};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    borrow::Cow,
    fs,
    io::{Cursor, Read},
    path::{Component, Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{http, AppHandle, Manager, Runtime};
use walkdir::WalkDir;
use zip::ZipArchive;

pub const RELEASE_CHANNEL: &str = "release";
pub const RELEASE_DEMO_CHANNEL: &str = "release-demo";
pub const RELEASE_APP_IDENTIFIER: &str = "com.voe.app";
pub const RELEASE_DEMO_APP_IDENTIFIER: &str = "com.voe.app.demo";
pub const JLJ_DATA_DIR: &str = "JLJData";
pub const PATCHES_DIR: &str = "patches";
pub const MAX_PATCH_UPLOAD_BYTES: usize = 50 * 1024 * 1024;
pub const STATE_FILE: &str = "state.json";
pub const ACTIVE_MANIFEST_FILE: &str = "active-manifest.json";
pub const ACTIVE_SIGNATURE_FILE: &str = "active-manifest.minisig";
pub const ACTIVE_WEB_DIR: &str = "active-web";
pub const PATCH_PROTOCOL: &str = "jljpatch";
pub const PATCH_PUBLIC_KEY: &str = include_str!("../tauri.conf.json.pub");
const DELETE_TOMBSTONES_DIR: &str = ".deleted";
const PATCH_MANIFEST_ENTRY: &str = "manifest.json";
const PATCH_SIGNATURE_ENTRY: &str = "manifest.minisig";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum PatchKind {
    Resource,
    Native,
    Mixed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum PatchScope {
    Resource,
    Native,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum PatchOpKind {
    Replace,
    Bsdiff,
    Delete,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatchOperation {
    pub op: PatchOpKind,
    pub scope: PatchScope,
    pub target: String,
    pub payload: Option<String>,
    pub old_sha256: Option<String>,
    pub new_sha256: Option<String>,
    pub payload_sha256: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatchManifest {
    #[serde(default)]
    pub channel: String,
    pub patch_id: String,
    pub base_version: String,
    pub from_patch_level: Option<String>,
    pub to_patch_level: String,
    pub app_identifier: String,
    pub platforms: Vec<String>,
    pub kind: PatchKind,
    #[serde(default)]
    pub operations: Vec<PatchOperation>,
    pub old_sha256: Option<String>,
    pub new_sha256: Option<String>,
    pub payload_sha256: Option<String>,
}

pub fn release_channel_for_identifier(identifier: &str) -> Option<&'static str> {
    match identifier {
        RELEASE_APP_IDENTIFIER => Some(RELEASE_CHANNEL),
        RELEASE_DEMO_APP_IDENTIFIER => Some(RELEASE_DEMO_CHANNEL),
        _ => None,
    }
}

pub fn app_release_channel<R: Runtime>(app: &AppHandle<R>) -> Result<&'static str, String> {
    release_channel_for_identifier(&app.config().identifier).ok_or_else(|| {
        format!(
            "Unsupported application identifier for patch updates: {}",
            app.config().identifier
        )
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatchState {
    pub base_version: String,
    pub patch_level: Option<String>,
    pub patch_id: Option<String>,
    pub platform: String,
    pub applied_at: Option<String>,
    pub manifest_sha256: Option<String>,
    #[serde(default)]
    pub verified_file_hashes: Vec<VerifiedFileHash>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerifiedFileHash {
    pub path: String,
    pub sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatchVerifyResult {
    pub active: bool,
    pub valid: bool,
    pub state: Option<PatchState>,
    pub message: String,
}

pub fn current_platform() -> String {
    let os = if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "linux") {
        "linux"
    } else {
        std::env::consts::OS
    };

    let arch = if cfg!(target_arch = "x86_64") {
        "x64"
    } else if cfg!(target_arch = "aarch64") {
        "arm64"
    } else {
        std::env::consts::ARCH
    };

    if os == "macos" {
        "macos-universal".to_string()
    } else {
        format!("{os}-{arch}")
    }
}

pub fn jlj_data_root_from_data_dir(data_dir: &Path) -> PathBuf {
    data_dir.join(JLJ_DATA_DIR)
}

pub fn patches_root_from_data_dir(data_dir: &Path) -> PathBuf {
    jlj_data_root_from_data_dir(data_dir).join(PATCHES_DIR)
}

pub fn app_data_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    app.path().app_data_dir().map_err(|err| err.to_string())
}

pub fn patches_root<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    Ok(patches_root_from_data_dir(&app_data_dir(app)?))
}

pub fn state_path_from_root(patches_root: &Path) -> PathBuf {
    patches_root.join(STATE_FILE)
}

pub fn active_manifest_path_from_root(patches_root: &Path) -> PathBuf {
    patches_root.join(ACTIVE_MANIFEST_FILE)
}

pub fn active_signature_path_from_root(patches_root: &Path) -> PathBuf {
    patches_root.join(ACTIVE_SIGNATURE_FILE)
}

pub fn active_web_dir_from_root(patches_root: &Path) -> PathBuf {
    patches_root.join(ACTIVE_WEB_DIR)
}

pub fn read_state_from_root(patches_root: &Path) -> Result<Option<PatchState>, String> {
    let path = state_path_from_root(patches_root);
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&path).map_err(|err| format!("read state: {err}"))?;
    serde_json::from_str(&content)
        .map(Some)
        .map_err(|err| format!("parse state: {err}"))
}

pub fn save_state_to_root(patches_root: &Path, state: &PatchState) -> Result<(), String> {
    fs::create_dir_all(patches_root).map_err(|err| format!("create patches dir: {err}"))?;
    let content = serde_json::to_string_pretty(state).map_err(|err| err.to_string())?;
    fs::write(state_path_from_root(patches_root), content)
        .map_err(|err| format!("write state: {err}"))
}

pub fn read_active_manifest_from_root(
    patches_root: &Path,
) -> Result<Option<PatchManifest>, String> {
    let path = active_manifest_path_from_root(patches_root);
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read(&path).map_err(|err| format!("read manifest: {err}"))?;
    let signature_path = active_signature_path_from_root(patches_root);
    let signature = fs::read_to_string(&signature_path)
        .map_err(|err| format!("read manifest signature: {err}"))?;
    verify_minisign(&content, &signature)?;
    serde_json::from_slice(&content)
        .map(Some)
        .map_err(|err| format!("parse manifest: {err}"))
}

#[tauri::command]
pub fn patch_get_state(app: AppHandle) -> Result<PatchState, String> {
    let root = patches_root(&app)?;
    if let Some(state) = read_state_from_root(&root)? {
        Ok(state)
    } else {
        Ok(PatchState {
            base_version: app.package_info().version.to_string(),
            patch_level: None,
            patch_id: None,
            platform: current_platform(),
            applied_at: None,
            manifest_sha256: None,
            verified_file_hashes: Vec::new(),
        })
    }
}

#[tauri::command]
pub fn patch_verify_active(app: AppHandle) -> Result<PatchVerifyResult, String> {
    let root = patches_root(&app)?;
    verify_active_from_root(&root, Some(app.package_info().version.to_string()))
}

#[tauri::command]
pub fn patch_clear_active(app: AppHandle) -> Result<(), String> {
    let root = patches_root(&app)?;
    clear_active_from_root(&root)
}

#[tauri::command(rename_all = "camelCase")]
pub fn patch_install_from_upload(
    app: AppHandle,
    file_name: String,
    bytes: Vec<u8>,
) -> Result<PatchState, String> {
    if !file_name.to_lowercase().ends_with(".jljpatch") {
        return Err("Only .jljpatch files can be installed.".to_string());
    }
    if bytes.is_empty() {
        return Err("Patch file is empty.".to_string());
    }
    if bytes.len() > MAX_PATCH_UPLOAD_BYTES {
        return Err(format!(
            "Patch file is too large. Maximum size is {} MB.",
            MAX_PATCH_UPLOAD_BYTES / 1024 / 1024
        ));
    }

    let mut archive =
        ZipArchive::new(Cursor::new(bytes)).map_err(|err| format!("read patch archive: {err}"))?;
    let manifest_bytes = read_zip_entry(&mut archive, PATCH_MANIFEST_ENTRY)?;
    let signature_text = String::from_utf8(read_zip_entry(&mut archive, PATCH_SIGNATURE_ENTRY)?)
        .map_err(|err| format!("manifest signature is not UTF-8: {err}"))?;
    verify_minisign(&manifest_bytes, &signature_text)?;

    let manifest: PatchManifest =
        serde_json::from_slice(&manifest_bytes).map_err(|err| format!("parse manifest: {err}"))?;
    validate_installable_resource_manifest(&manifest, &app)?;

    let root = patches_root(&app)?;
    fs::create_dir_all(&root).map_err(|err| format!("create patches dir: {err}"))?;
    validate_patch_chain(&manifest, &root)?;

    install_resource_patch_from_archive(
        &mut archive,
        &manifest,
        &signature_text,
        &manifest_bytes,
        &root,
    )?;
    let verify = verify_active_from_root(&root, Some(app.package_info().version.to_string()))?;
    if !verify.valid {
        return Err(format!(
            "post-install verification failed: {}",
            verify.message
        ));
    }

    read_state_from_root(&root)?.ok_or_else(|| "patch installed but state is missing".to_string())
}

pub fn verify_active_from_root(
    patches_root: &Path,
    current_base_version: Option<String>,
) -> Result<PatchVerifyResult, String> {
    let Some(state) = read_state_from_root(patches_root)? else {
        return Ok(PatchVerifyResult {
            active: false,
            valid: true,
            state: None,
            message: "No hotfix patch is active.".to_string(),
        });
    };

    let Some(manifest) = read_active_manifest_from_root(patches_root)? else {
        return Ok(PatchVerifyResult {
            active: true,
            valid: false,
            state: Some(state),
            message: "Patch state exists but active manifest is missing.".to_string(),
        });
    };

    if release_channel_for_identifier(&manifest.app_identifier) != Some(manifest.channel.as_str()) {
        return Ok(invalid(
            state,
            "Patch release channel does not match its app identifier.",
        ));
    }
    if let Some(version) = current_base_version {
        if manifest.base_version != version {
            return Ok(invalid(
                state,
                "Patch base version does not match this app.",
            ));
        }
    }
    if !manifest.platforms.iter().any(|p| p == &current_platform()) {
        return Ok(invalid(state, "Patch platform does not match this app."));
    }
    if state.patch_level.as_deref() != Some(manifest.to_patch_level.as_str()) {
        return Ok(invalid(state, "Patch state level does not match manifest."));
    }

    let active_web_dir = active_web_dir_from_root(patches_root);
    for op in manifest
        .operations
        .iter()
        .filter(|op| op.scope == PatchScope::Resource)
    {
        let target = sanitize_relative_path(&op.target)?;
        let target_path = active_web_dir.join(target);
        match op.op {
            PatchOpKind::Delete => {
                if target_path.exists() {
                    return Ok(invalid(
                        state,
                        "Deleted resource still exists in patch layer.",
                    ));
                }
            }
            PatchOpKind::Replace | PatchOpKind::Bsdiff => {
                if let Some(expected) = op.new_sha256.as_deref() {
                    let actual = sha256_file_hex(&target_path)?;
                    if !hash_eq(expected, &actual) {
                        return Ok(invalid(state, "Resource patch hash verification failed."));
                    }
                }
            }
        }
    }

    Ok(PatchVerifyResult {
        active: true,
        valid: true,
        state: Some(state),
        message: "Hotfix patch is active and verified.".to_string(),
    })
}

fn invalid(state: PatchState, message: &str) -> PatchVerifyResult {
    PatchVerifyResult {
        active: true,
        valid: false,
        state: Some(state),
        message: message.to_string(),
    }
}

pub fn clear_active_from_root(patches_root: &Path) -> Result<(), String> {
    let active_web = active_web_dir_from_root(patches_root);
    if active_web.exists() {
        fs::remove_dir_all(&active_web).map_err(|err| format!("remove active web patch: {err}"))?;
    }

    for path in [
        active_manifest_path_from_root(patches_root),
        active_signature_path_from_root(patches_root),
        state_path_from_root(patches_root),
    ] {
        if path.exists() {
            fs::remove_file(&path).map_err(|err| format!("remove {}: {err}", path.display()))?;
        }
    }

    Ok(())
}

fn validate_installable_resource_manifest<R: Runtime>(
    manifest: &PatchManifest,
    app: &AppHandle<R>,
) -> Result<(), String> {
    if manifest.app_identifier != app.config().identifier {
        return Err("Patch is for a different app identifier.".to_string());
    }
    if manifest.channel != app_release_channel(app)? {
        return Err("Patch is for a different release channel.".to_string());
    }
    if manifest.base_version != app.package_info().version.to_string() {
        return Err(format!(
            "Patch requires base version {}, but this app is {}.",
            manifest.base_version,
            app.package_info().version
        ));
    }
    if !manifest.platforms.iter().any(|p| p == &current_platform()) {
        return Err(format!(
            "Patch does not support platform {}.",
            current_platform()
        ));
    }
    if manifest.patch_id.trim().is_empty() || manifest.to_patch_level.trim().is_empty() {
        return Err("Patch manifest has empty patch identifiers.".to_string());
    }
    if manifest
        .operations
        .iter()
        .any(|operation| operation.scope == PatchScope::Native)
    {
        return Err(
            "Native patches cannot be installed from inside the running app. Use the standalone patcher."
                .to_string(),
        );
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
        (Some(expected), _) => Err(format!("Patch requires existing patch level {expected}.")),
        (None, Some(existing)) => Err(format!(
            "Patch requires unpatched base, but current patch level is {:?}.",
            existing.patch_level
        )),
    }
}

fn install_resource_patch_from_archive<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
    manifest: &PatchManifest,
    signature_text: &str,
    manifest_bytes: &[u8],
    patches_root: &Path,
) -> Result<(), String> {
    let active_web = active_web_dir_from_root(patches_root);
    let staging_web = patches_root.join(format!(
        "staging-web-{}",
        sanitize_patch_id_for_path(&manifest.patch_id)
    ));
    if staging_web.exists() {
        fs::remove_dir_all(&staging_web)
            .map_err(|err| format!("remove old staging web patch: {err}"))?;
    }

    if active_web.exists() {
        copy_dir(&active_web, &staging_web)?;
    } else {
        fs::create_dir_all(&staging_web).map_err(|err| format!("create staging web: {err}"))?;
    }

    let install_result = apply_resource_operations(archive, manifest, &staging_web);
    if let Err(err) = install_result {
        let _ = fs::remove_dir_all(&staging_web);
        return Err(err);
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

    let verified_file_hashes = manifest
        .operations
        .iter()
        .filter(|operation| operation.scope == PatchScope::Resource)
        .filter_map(|operation| {
            operation
                .new_sha256
                .as_ref()
                .map(|sha256| VerifiedFileHash {
                    path: operation.target.clone(),
                    sha256: sha256.clone(),
                })
        })
        .collect();

    let state = PatchState {
        base_version: manifest.base_version.clone(),
        patch_level: Some(manifest.to_patch_level.clone()),
        patch_id: Some(manifest.patch_id.clone()),
        platform: current_platform(),
        applied_at: Some(current_timestamp()),
        manifest_sha256: Some(sha256_bytes_hex(manifest_bytes)),
        verified_file_hashes,
    };
    save_state_to_root(patches_root, &state)?;

    Ok(())
}

fn apply_resource_operations<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
    manifest: &PatchManifest,
    staging_web: &Path,
) -> Result<(), String> {
    for operation in manifest
        .operations
        .iter()
        .filter(|operation| operation.scope == PatchScope::Resource)
    {
        let target_rel = sanitize_relative_path(&operation.target)?;
        let target = staging_web.join(&target_rel);
        let tombstone = deleted_resource_tombstone_path(staging_web, &target_rel);

        match operation.op {
            PatchOpKind::Delete => {
                if target.exists() {
                    fs::remove_file(&target)
                        .map_err(|err| format!("delete {}: {err}", target.display()))?;
                }
                if let Some(parent) = tombstone.parent() {
                    fs::create_dir_all(parent)
                        .map_err(|err| format!("create delete tombstone dir: {err}"))?;
                }
                fs::write(&tombstone, b"deleted").map_err(|err| {
                    format!("write delete tombstone {}: {err}", tombstone.display())
                })?;
            }
            PatchOpKind::Replace => {
                let payload = read_payload(archive, operation)?;
                if let Some(expected) = operation.payload_sha256.as_deref() {
                    let actual = sha256_bytes_hex(&payload);
                    if !hash_eq(expected, &actual) {
                        return Err(format!("payload hash mismatch for {}", operation.target));
                    }
                }
                if target.exists() {
                    if let Some(expected) = operation.old_sha256.as_deref() {
                        let actual = sha256_file_hex(&target)?;
                        if !hash_eq(expected, &actual) {
                            return Err(format!("old hash mismatch for {}", target.display()));
                        }
                    }
                }
                if let Some(parent) = target.parent() {
                    fs::create_dir_all(parent)
                        .map_err(|err| format!("create target dir: {err}"))?;
                }
                if tombstone.exists() {
                    fs::remove_file(&tombstone).map_err(|err| {
                        format!("remove delete tombstone {}: {err}", tombstone.display())
                    })?;
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
                let old =
                    fs::read(&target).map_err(|err| format!("read {}: {err}", target.display()))?;
                let mut new = Vec::new();
                bsdiff::patch(&old, &mut patch.as_slice(), &mut new)
                    .map_err(|err| format!("apply bsdiff to {}: {err}", target.display()))?;
                if tombstone.exists() {
                    fs::remove_file(&tombstone).map_err(|err| {
                        format!("remove delete tombstone {}: {err}", tombstone.display())
                    })?;
                }
                fs::write(&target, new)
                    .map_err(|err| format!("write {}: {err}", target.display()))?;
            }
        }

        if let Some(expected) = operation.new_sha256.as_deref() {
            let actual = sha256_file_hex(&target)?;
            if !hash_eq(expected, &actual) {
                return Err(format!("new hash mismatch for {}", target.display()));
            }
        }
    }

    Ok(())
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

fn sanitize_patch_id_for_path(value: &str) -> String {
    value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || matches!(ch, '.' | '-' | '_') {
                ch
            } else {
                '_'
            }
        })
        .collect()
}

pub fn register_patch_protocol<R: Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder.register_uri_scheme_protocol(PATCH_PROTOCOL, move |ctx, request| {
        patch_protocol_response(ctx.app_handle(), request)
    })
}

pub fn navigate_to_active_resource_patch<R: Runtime>(app: &tauri::App<R>) {
    let handle = app.handle().clone();
    let Ok(root) = patches_root(&handle) else {
        return;
    };
    let Ok(verify) = verify_active_from_root(&root, Some(app.package_info().version.to_string()))
    else {
        return;
    };
    if !verify.active || !verify.valid {
        return;
    }

    if let Some(window) = app.get_webview_window("main") {
        if let Ok(url) = tauri::Url::parse("jljpatch://localhost/index.html") {
            let _ = window.navigate(url);
        }
    }
}

fn patch_protocol_response<R: Runtime>(
    app: &AppHandle<R>,
    request: http::Request<Vec<u8>>,
) -> http::Response<Cow<'static, [u8]>> {
    match resolve_patch_protocol(app, request.uri().path()) {
        Ok((bytes, mime)) => http::Response::builder()
            .status(http::StatusCode::OK)
            .header(http::header::CONTENT_TYPE, mime)
            .body(Cow::Owned(bytes))
            .unwrap(),
        Err(status) => http::Response::builder()
            .status(status)
            .header(http::header::CONTENT_TYPE, "text/plain; charset=utf-8")
            .body(Cow::Owned(
                format!("patch asset error: {status}").into_bytes(),
            ))
            .unwrap(),
    }
}

fn resolve_patch_protocol<R: Runtime>(
    app: &AppHandle<R>,
    uri_path: &str,
) -> Result<(Vec<u8>, String), http::StatusCode> {
    let relative = sanitize_relative_path(uri_path.trim_start_matches('/'))
        .map_err(|_| http::StatusCode::BAD_REQUEST)?;
    let root = patches_root(app).map_err(|_| http::StatusCode::INTERNAL_SERVER_ERROR)?;
    let active_web = active_web_dir_from_root(&root);
    let patched_path = active_web.join(&relative);

    if patched_path.exists() {
        let bytes = fs::read(&patched_path).map_err(|_| http::StatusCode::INTERNAL_SERVER_ERROR)?;
        let mime = mime_guess::from_path(&patched_path)
            .first_or_octet_stream()
            .essence_str()
            .to_string();
        return Ok((bytes, mime));
    }

    if deleted_resource_tombstone_path(&active_web, &relative).exists() {
        return Err(http::StatusCode::NOT_FOUND);
    }

    let asset_path = relative.to_string_lossy().replace('\\', "/");
    if let Some(asset) = app.asset_resolver().get(asset_path) {
        return Ok((asset.bytes.to_vec(), asset.mime_type.to_string()));
    }

    Err(http::StatusCode::NOT_FOUND)
}

fn deleted_resource_tombstone_path(active_web: &Path, relative: &Path) -> PathBuf {
    active_web.join(DELETE_TOMBSTONES_DIR).join(relative)
}

pub fn sanitize_relative_path(path: &str) -> Result<PathBuf, String> {
    let path = Path::new(path);
    if path.is_absolute() {
        return Err("absolute paths are not allowed".to_string());
    }

    let mut out = PathBuf::new();
    for component in path.components() {
        match component {
            Component::Normal(value) => out.push(value),
            Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err("path escapes patch root".to_string())
            }
        }
    }

    if out.as_os_str().is_empty() {
        Ok(PathBuf::from("index.html"))
    } else {
        Ok(out)
    }
}

pub fn sha256_file_hex(path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(path).map_err(|err| format!("open {}: {err}", path.display()))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = file
            .read(&mut buffer)
            .map_err(|err| format!("read {}: {err}", path.display()))?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(hex_lower(&hasher.finalize()))
}

pub fn sha256_bytes_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hex_lower(&hasher.finalize())
}

pub fn hash_eq(expected: &str, actual: &str) -> bool {
    expected.eq_ignore_ascii_case(actual)
}

pub fn verify_minisign(content: &[u8], signature_text: &str) -> Result<(), String> {
    let public_key = PublicKey::from_base64(&extract_minisign_public_key(PATCH_PUBLIC_KEY)?)
        .map_err(|err| format!("decode public key: {err}"))?;
    let signature =
        Signature::decode(signature_text).map_err(|err| format!("decode signature: {err}"))?;
    public_key
        .verify(content, &signature, false)
        .map_err(|err| format!("verify signature: {err}"))
}

fn extract_minisign_public_key(raw: &str) -> Result<String, String> {
    let trimmed = raw.trim();
    if trimmed.starts_with("RW") || trimmed.starts_with("RWT") {
        return Ok(trimmed.to_string());
    }

    if let Ok(decoded) = BASE64.decode(trimmed) {
        if let Ok(decoded_text) = String::from_utf8(decoded) {
            for line in decoded_text.lines() {
                let line = line.trim();
                if line.starts_with("RW") || line.starts_with("RWT") {
                    return Ok(line.to_string());
                }
            }
        }
    }

    for line in trimmed.lines() {
        let line = line.trim();
        if line.starts_with("RW") || line.starts_with("RWT") {
            return Ok(line.to_string());
        }
    }

    Err("minisign public key line was not found".to_string())
}

fn hex_lower(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push(HEX[(byte >> 4) as usize] as char);
        out.push(HEX[(byte & 0x0f) as usize] as char);
    }
    out
}

fn current_timestamp() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    format!("{seconds}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitize_relative_path_accepts_normal_assets() {
        assert_eq!(
            sanitize_relative_path("_nuxt/app.js").unwrap(),
            PathBuf::from("_nuxt/app.js")
        );
        assert_eq!(
            sanitize_relative_path("").unwrap(),
            PathBuf::from("index.html")
        );
    }

    #[test]
    fn sanitize_relative_path_rejects_escape_attempts() {
        assert!(sanitize_relative_path("../secret").is_err());
        assert!(sanitize_relative_path("/absolute/path").is_err());
    }

    #[test]
    fn sha256_bytes_hex_is_stable() {
        assert_eq!(
            sha256_bytes_hex(b"jlj"),
            "6570739fdc1f5834a4f82a3bc781ea13043e49d768e36d99beb16700b34c3fec"
        );
    }
}
