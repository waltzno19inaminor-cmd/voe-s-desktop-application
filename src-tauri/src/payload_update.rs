use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager, Runtime};
use walkdir::WalkDir;

use crate::patch::{
    active_manifest_path_from_root, active_signature_path_from_root, active_web_dir_from_root,
    app_data_dir, current_platform, hash_eq, jlj_data_root_from_data_dir, patches_root,
    sanitize_relative_path, sha256_bytes_hex, sha256_file_hex, state_path_from_root,
    verify_minisign, APP_IDENTIFIER,
};

const PAYLOAD_STATE_FILE: &str = "payload-state.json";
const PAYLOAD_MANIFEST_FILE: &str = "payload-manifest.json";
const PAYLOAD_SIGNATURE_FILE: &str = "payload-manifest.minisig";
const PAYLOAD_STAGING_PREFIX: &str = "payload-staging";
const MAX_PAYLOAD_FILE_BYTES: u64 = 100 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PayloadFile {
    pub path: String,
    pub sha256: String,
    pub size: u64,
    pub url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PayloadManifest {
    pub app_identifier: String,
    pub version: String,
    pub platform: String,
    pub base_url: Option<String>,
    pub files: Vec<PayloadFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PayloadState {
    pub version: Option<String>,
    pub platform: String,
    pub active: bool,
    pub installed_at: Option<String>,
    pub manifest_sha256: Option<String>,
    pub file_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PayloadInstallResult {
    pub state: PayloadState,
    pub downloaded_files: usize,
    pub reused_files: usize,
}

#[tauri::command]
pub fn payload_update_get_state(app: AppHandle) -> Result<PayloadState, String> {
    let root = payload_root(&app)?;
    if let Some(state) = read_payload_state_from_root(&root)? {
        Ok(state)
    } else {
        Ok(empty_payload_state())
    }
}

#[tauri::command]
pub fn payload_update_clear(app: AppHandle) -> Result<(), String> {
    let root = payload_root(&app)?;
    let patches = patches_root(&app)?;
    let active_web = active_web_dir_from_root(&patches);
    if active_web.exists() {
        fs::remove_dir_all(&active_web).map_err(|err| format!("remove active payload: {err}"))?;
    }
    for path in [
        root.join(PAYLOAD_STATE_FILE),
        root.join(PAYLOAD_MANIFEST_FILE),
        root.join(PAYLOAD_SIGNATURE_FILE),
        state_path_from_root(&patches),
        active_manifest_path_from_root(&patches),
        active_signature_path_from_root(&patches),
    ] {
        if path.exists() {
            fs::remove_file(&path).map_err(|err| format!("remove {}: {err}", path.display()))?;
        }
    }
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn payload_update_install_from_feed(
    app: AppHandle,
    manifest_url: String,
) -> Result<PayloadInstallResult, String> {
    let manifest_url = reqwest::Url::parse(&manifest_url)
        .map_err(|err| format!("invalid payload manifest URL: {err}"))?;
    if !matches!(manifest_url.scheme(), "https" | "http") {
        return Err("Payload manifest URL must use http or https.".to_string());
    }

    let manifest_bytes = reqwest::get(manifest_url.clone())
        .await
        .map_err(|err| format!("download payload manifest: {err}"))?
        .error_for_status()
        .map_err(|err| format!("download payload manifest: {err}"))?
        .bytes()
        .await
        .map_err(|err| format!("read payload manifest: {err}"))?
        .to_vec();
    let signature_text = download_manifest_signature(&manifest_url).await?;
    verify_minisign(&manifest_bytes, &signature_text)?;

    let manifest: PayloadManifest = serde_json::from_slice(&manifest_bytes)
        .map_err(|err| format!("parse payload manifest: {err}"))?;
    let base_url = match manifest.base_url.as_deref() {
        Some(value) => {
            reqwest::Url::parse(value).map_err(|err| format!("invalid payload baseUrl: {err}"))?
        }
        None => manifest_url
            .join(".")
            .map_err(|err| format!("resolve payload base URL: {err}"))?,
    };

    install_payload_manifest(app, manifest, manifest_bytes, signature_text, base_url).await
}

async fn install_payload_manifest<R: Runtime>(
    app: AppHandle<R>,
    manifest: PayloadManifest,
    manifest_bytes: Vec<u8>,
    signature_text: String,
    base_url: reqwest::Url,
) -> Result<PayloadInstallResult, String> {
    validate_manifest(&manifest)?;

    let payload_root = payload_root(&app)?;
    let patches = patches_root(&app)?;
    fs::create_dir_all(&payload_root).map_err(|err| format!("create payload root: {err}"))?;
    fs::create_dir_all(&patches).map_err(|err| format!("create patches root: {err}"))?;

    if let Some(existing) = read_payload_state_from_root(&payload_root)? {
        if existing.active && existing.version.as_deref() == Some(manifest.version.as_str()) {
            return Ok(PayloadInstallResult {
                state: existing,
                downloaded_files: 0,
                reused_files: manifest.files.len(),
            });
        }
    }

    let active_web = active_web_dir_from_root(&patches);
    let staging = patches.join(format!(
        "{}-{}",
        PAYLOAD_STAGING_PREFIX,
        sanitize_version_for_path(&manifest.version)
    ));
    if staging.exists() {
        fs::remove_dir_all(&staging).map_err(|err| format!("remove old payload staging: {err}"))?;
    }
    fs::create_dir_all(&staging).map_err(|err| format!("create payload staging: {err}"))?;

    let mut downloaded_files = 0;
    let mut reused_files = 0;
    for file in &manifest.files {
        let relative = sanitize_relative_path(&file.path)?;
        let bytes = reusable_file_bytes(&app, &active_web, &relative, &file.sha256)?;
        let bytes = match bytes {
            Some(bytes) => {
                reused_files += 1;
                bytes
            }
            None => {
                downloaded_files += 1;
                download_payload_file(file, &base_url).await?
            }
        };
        if bytes.len() as u64 != file.size {
            return Err(format!("payload size mismatch for {}", file.path));
        }
        let actual = sha256_bytes_hex(&bytes);
        if !hash_eq(&file.sha256, &actual) {
            return Err(format!("payload hash mismatch for {}", file.path));
        }
        let target = staging.join(relative);
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|err| format!("create payload dir: {err}"))?;
        }
        fs::write(&target, bytes).map_err(|err| format!("write {}: {err}", target.display()))?;
    }

    verify_payload_tree(&staging, &manifest)?;

    if active_web.exists() {
        fs::remove_dir_all(&active_web).map_err(|err| format!("remove old active web: {err}"))?;
    }
    fs::rename(&staging, &active_web).map_err(|err| format!("activate payload: {err}"))?;

    clear_hotfix_metadata(&patches)?;
    fs::write(payload_root.join(PAYLOAD_MANIFEST_FILE), &manifest_bytes)
        .map_err(|err| format!("write payload manifest: {err}"))?;
    fs::write(payload_root.join(PAYLOAD_SIGNATURE_FILE), signature_text)
        .map_err(|err| format!("write payload manifest signature: {err}"))?;

    let state = PayloadState {
        version: Some(manifest.version.clone()),
        platform: current_platform(),
        active: true,
        installed_at: Some(current_timestamp()),
        manifest_sha256: Some(sha256_bytes_hex(&manifest_bytes)),
        file_count: manifest.files.len(),
    };
    fs::write(
        payload_root.join(PAYLOAD_STATE_FILE),
        serde_json::to_string_pretty(&state).map_err(|err| err.to_string())?,
    )
    .map_err(|err| format!("write payload state: {err}"))?;

    Ok(PayloadInstallResult {
        state,
        downloaded_files,
        reused_files,
    })
}

pub fn navigate_to_active_payload<R: Runtime>(app: &tauri::App<R>) {
    let handle = app.handle().clone();
    let Ok(payload_root) = payload_root(&handle) else {
        return;
    };
    let Ok(Some(state)) = read_payload_state_from_root(&payload_root) else {
        return;
    };
    if !state.active {
        return;
    }
    let Ok(patches) = patches_root(&handle) else {
        return;
    };
    if !active_web_dir_from_root(&patches)
        .join("index.html")
        .exists()
    {
        return;
    }
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(url) = tauri::Url::parse("jljpatch://localhost/index.html") {
            let _ = window.navigate(url);
        }
    }
}

fn validate_manifest(manifest: &PayloadManifest) -> Result<(), String> {
    if manifest.app_identifier != APP_IDENTIFIER {
        return Err("Payload manifest is for a different app identifier.".to_string());
    }
    if manifest.version.trim().is_empty() {
        return Err("Payload manifest version is empty.".to_string());
    }
    if manifest.platform != current_platform() && manifest.platform != "any" {
        return Err(format!(
            "Payload manifest is for {}, but this app is {}.",
            manifest.platform,
            current_platform()
        ));
    }
    if manifest.files.is_empty() {
        return Err("Payload manifest has no files.".to_string());
    }
    for file in &manifest.files {
        sanitize_relative_path(&file.path)?;
        if file.sha256.len() != 64 || !file.sha256.chars().all(|ch| ch.is_ascii_hexdigit()) {
            return Err(format!("Invalid sha256 for {}", file.path));
        }
        if file.size > MAX_PAYLOAD_FILE_BYTES {
            return Err(format!("Payload file is too large: {}", file.path));
        }
    }
    Ok(())
}

fn reusable_file_bytes<R: Runtime>(
    app: &AppHandle<R>,
    active_web: &Path,
    relative: &Path,
    expected_sha256: &str,
) -> Result<Option<Vec<u8>>, String> {
    let active = active_web.join(relative);
    if active.exists() {
        let actual = sha256_file_hex(&active)?;
        if hash_eq(expected_sha256, &actual) {
            return fs::read(&active)
                .map(Some)
                .map_err(|err| format!("read reusable active file: {err}"));
        }
    }

    let asset_path = relative.to_string_lossy().replace('\\', "/");
    if let Some(asset) = app.asset_resolver().get(asset_path) {
        let bytes = asset.bytes.to_vec();
        let actual = sha256_bytes_hex(&bytes);
        if hash_eq(expected_sha256, &actual) {
            return Ok(Some(bytes));
        }
    }

    Ok(None)
}

async fn download_payload_file(
    file: &PayloadFile,
    base_url: &reqwest::Url,
) -> Result<Vec<u8>, String> {
    let url = match file.url.as_deref() {
        Some(value) => reqwest::Url::parse(value).or_else(|_| base_url.join(value)),
        None => base_url.join(&file.path),
    }
    .map_err(|err| format!("resolve URL for {}: {err}", file.path))?;

    let response = reqwest::get(url)
        .await
        .map_err(|err| format!("download {}: {err}", file.path))?
        .error_for_status()
        .map_err(|err| format!("download {}: {err}", file.path))?;
    if let Some(length) = response.content_length() {
        if length > MAX_PAYLOAD_FILE_BYTES {
            return Err(format!("Payload file is too large: {}", file.path));
        }
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|err| format!("read {}: {err}", file.path))?;
    Ok(bytes.to_vec())
}

async fn download_manifest_signature(manifest_url: &reqwest::Url) -> Result<String, String> {
    let mut signature_url = manifest_url.clone();
    signature_url.set_path(&format!("{}.minisig", manifest_url.path()));
    signature_url.set_query(None);

    reqwest::get(signature_url)
        .await
        .map_err(|err| format!("download payload manifest signature: {err}"))?
        .error_for_status()
        .map_err(|err| format!("download payload manifest signature: {err}"))?
        .text()
        .await
        .map_err(|err| format!("read payload manifest signature: {err}"))
}

fn verify_payload_tree(root: &Path, manifest: &PayloadManifest) -> Result<(), String> {
    let mut expected = manifest
        .files
        .iter()
        .map(|file| file.path.as_str())
        .collect::<Vec<_>>();
    expected.sort_unstable();

    let mut actual = Vec::new();
    for entry in WalkDir::new(root).into_iter().filter_map(Result::ok) {
        if !entry.file_type().is_file() {
            continue;
        }
        let rel = entry
            .path()
            .strip_prefix(root)
            .map_err(|err| format!("strip payload root: {err}"))?
            .to_string_lossy()
            .replace('\\', "/");
        actual.push(rel);
    }
    actual.sort_unstable();

    if actual != expected {
        return Err("Payload tree does not match manifest file list.".to_string());
    }

    for file in &manifest.files {
        let path = root.join(sanitize_relative_path(&file.path)?);
        let actual = sha256_file_hex(&path)?;
        if !hash_eq(&file.sha256, &actual) {
            return Err(format!("Payload tree hash mismatch for {}", file.path));
        }
    }

    Ok(())
}

fn payload_root<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    Ok(jlj_data_root_from_data_dir(&app_data_dir(app)?).join("payload-updates"))
}

fn read_payload_state_from_root(root: &Path) -> Result<Option<PayloadState>, String> {
    let path = root.join(PAYLOAD_STATE_FILE);
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&path).map_err(|err| format!("read payload state: {err}"))?;
    serde_json::from_str(&content)
        .map(Some)
        .map_err(|err| format!("parse payload state: {err}"))
}

fn empty_payload_state() -> PayloadState {
    PayloadState {
        version: None,
        platform: current_platform(),
        active: false,
        installed_at: None,
        manifest_sha256: None,
        file_count: 0,
    }
}

fn clear_hotfix_metadata(patches_root: &Path) -> Result<(), String> {
    for path in [
        state_path_from_root(patches_root),
        active_manifest_path_from_root(patches_root),
        active_signature_path_from_root(patches_root),
    ] {
        if path.exists() {
            fs::remove_file(&path).map_err(|err| format!("remove {}: {err}", path.display()))?;
        }
    }
    Ok(())
}

fn sanitize_version_for_path(value: &str) -> String {
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

fn current_timestamp() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    format!("{seconds}")
}
