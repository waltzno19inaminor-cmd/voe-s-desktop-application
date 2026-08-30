use base64::{engine::general_purpose::STANDARD, Engine as _};
use futures_util::StreamExt;
use reqwest::header::{CONTENT_LENGTH, CONTENT_TYPE, USER_AGENT};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::Path;
use std::time::Duration;
use tauri::{AppHandle, Manager};

const MAX_AVATAR_BYTES: usize = 2 * 1024 * 1024;
const AVATAR_USER_AGENT: &str = "JLJAvatarCache/1.0";

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AvatarCacheMetadata {
    source_url: String,
    content_type: String,
}

#[tauri::command]
pub async fn cache_google_avatar(app: AppHandle, source_url: String) -> Result<String, String> {
    let source_url = source_url.trim().to_string();
    validate_google_avatar_url(&source_url)?;

    let cache_root = app
        .path()
        .app_cache_dir()
        .map_err(|err| format!("Avatar cache directory is unavailable: {err}"))?
        .join("avatars");
    fs::create_dir_all(&cache_root)
        .map_err(|err| format!("Failed to create avatar cache directory: {err}"))?;

    let cache_key = hex_digest(source_url.as_bytes());
    let image_path = cache_root.join(format!("{cache_key}.bin"));
    let metadata_path = cache_root.join(format!("{cache_key}.json"));

    if let Some(data_url) = read_cached_avatar(&image_path, &metadata_path, &source_url)? {
        return Ok(data_url);
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|err| format!("Failed to initialize avatar downloader: {err}"))?;
    let response = client
        .get(&source_url)
        .header(USER_AGENT, AVATAR_USER_AGENT)
        .send()
        .await
        .map_err(|err| format!("Google avatar download failed: {err}"))?;

    validate_google_avatar_url(response.url().as_str())?;
    if !response.status().is_success() {
        return Err(format!(
            "Google avatar download failed with HTTP {}.",
            response.status().as_u16()
        ));
    }

    if let Some(content_length) = response
        .headers()
        .get(CONTENT_LENGTH)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<usize>().ok())
    {
        if content_length > MAX_AVATAR_BYTES {
            return Err("Google avatar exceeds the 2 MB local cache limit.".to_string());
        }
    }

    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .and_then(normalize_image_content_type)
        .ok_or_else(|| "Google avatar response is not a supported image.".to_string())?;

    let mut image = Vec::new();
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|err| format!("Failed to read Google avatar: {err}"))?;
        if image.len() + chunk.len() > MAX_AVATAR_BYTES {
            return Err("Google avatar exceeds the 2 MB local cache limit.".to_string());
        }
        image.extend_from_slice(&chunk);
    }
    if image.is_empty() {
        return Err("Google avatar response is empty.".to_string());
    }

    let metadata = AvatarCacheMetadata {
        source_url,
        content_type: content_type.to_string(),
    };
    fs::write(&image_path, &image)
        .map_err(|err| format!("Failed to save cached avatar: {err}"))?;
    fs::write(
        &metadata_path,
        serde_json::to_vec(&metadata)
            .map_err(|err| format!("Failed to encode avatar cache metadata: {err}"))?,
    )
    .map_err(|err| format!("Failed to save avatar cache metadata: {err}"))?;

    Ok(to_data_url(&metadata.content_type, &image))
}

fn read_cached_avatar(
    image_path: &Path,
    metadata_path: &Path,
    source_url: &str,
) -> Result<Option<String>, String> {
    if !image_path.is_file() || !metadata_path.is_file() {
        return Ok(None);
    }

    let metadata = match fs::read(metadata_path)
        .ok()
        .and_then(|bytes| serde_json::from_slice::<AvatarCacheMetadata>(&bytes).ok())
    {
        Some(metadata) if metadata.source_url == source_url => metadata,
        _ => return Ok(None),
    };
    let Some(content_type) = normalize_image_content_type(&metadata.content_type) else {
        return Ok(None);
    };
    let image = fs::read(image_path)
        .map_err(|err| format!("Failed to read cached avatar: {err}"))?;
    if image.is_empty() || image.len() > MAX_AVATAR_BYTES {
        return Ok(None);
    }

    Ok(Some(to_data_url(content_type, &image)))
}

fn normalize_image_content_type(value: &str) -> Option<&'static str> {
    match value.split(';').next()?.trim().to_ascii_lowercase().as_str() {
        "image/jpeg" | "image/jpg" => Some("image/jpeg"),
        "image/png" => Some("image/png"),
        "image/webp" => Some("image/webp"),
        "image/gif" => Some("image/gif"),
        "image/avif" => Some("image/avif"),
        _ => None,
    }
}

fn validate_google_avatar_url(value: &str) -> Result<(), String> {
    let url = reqwest::Url::parse(value).map_err(|_| "Google avatar URL is invalid.".to_string())?;
    let host = url
        .host_str()
        .ok_or_else(|| "Google avatar URL has no host.".to_string())?
        .to_ascii_lowercase();
    if url.scheme() != "https"
        || !(host == "lh3.googleusercontent.com" || host.ends_with(".googleusercontent.com"))
    {
        return Err("Only HTTPS Google avatar URLs can be cached.".to_string());
    }
    Ok(())
}

fn hex_digest(value: &[u8]) -> String {
    Sha256::digest(value)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

fn to_data_url(content_type: &str, image: &[u8]) -> String {
    format!("data:{content_type};base64,{}", STANDARD.encode(image))
}

