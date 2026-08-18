use base64::{engine::general_purpose, Engine as _};
use reqwest::header::{HeaderMap, HeaderValue};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256, Sha512};
use std::collections::BTreeMap;
use std::time::{SystemTime, UNIX_EPOCH};

const KRAKEN_BASE_URL: &str = "https://api.kraken.com";

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct KrakenCredentials {
    api_key: String,
    api_secret: String,
    base_url: Option<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct KrakenSignedRequestInput {
    credentials: KrakenCredentials,
    path: String,
    params: Option<BTreeMap<String, Value>>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct KrakenFuturesSignedRequestInput {
    credentials: KrakenCredentials,
    path: String,
    params: Option<BTreeMap<String, Value>>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct KrakenSignedRequestOutput {
    status: u16,
    payload: Value,
}

#[tauri::command]
pub async fn kraken_signed_request(
    input: KrakenSignedRequestInput,
) -> Result<KrakenSignedRequestOutput, String> {
    let base_url = input
        .credentials
        .base_url
        .as_deref()
        .unwrap_or(KRAKEN_BASE_URL);
    let nonce = current_nonce()?;
    let mut params = input.params.unwrap_or_default();
    params.insert("nonce".to_string(), Value::String(nonce.clone()));

    let post_data = to_form_body(&params);
    let signature = create_signature(
        &input.path,
        &nonce,
        &post_data,
        &input.credentials.api_secret,
    )?;
    let final_url = format!("{}{}", base_url.trim_end_matches('/'), input.path);

    let mut headers = HeaderMap::new();
    headers.insert(
        "API-Key",
        HeaderValue::from_str(&input.credentials.api_key).map_err(|err| err.to_string())?,
    );
    headers.insert(
        "API-Sign",
        HeaderValue::from_str(&signature).map_err(|err| err.to_string())?,
    );
    headers.insert(
        "Content-Type",
        HeaderValue::from_static("application/x-www-form-urlencoded"),
    );

    let client = reqwest::Client::new();
    let response = client
        .post(&final_url)
        .headers(headers)
        .body(post_data)
        .send()
        .await
        .map_err(|err| format!("Kraken network request failed: {}", err))?;

    let status = response.status().as_u16();
    let text = response
        .text()
        .await
        .map_err(|err| format!("Kraken response read failed: {}", err))?;

    let payload = serde_json::from_str::<Value>(&text).unwrap_or_else(|_| Value::String(text));

    if status >= 400 {
        return Err(format!("Kraken request failed ({})", status));
    }

    if let Some(errors) = payload.get("error").and_then(Value::as_array) {
        if !errors.is_empty() {
            let message = errors
                .iter()
                .filter_map(Value::as_str)
                .collect::<Vec<_>>()
                .join(", ");
            return Err(if message.is_empty() {
                "Kraken API error".to_string()
            } else {
                message
            });
        }
    }

    Ok(KrakenSignedRequestOutput { status, payload })
}

#[tauri::command]
pub async fn kraken_futures_signed_request(
    input: KrakenFuturesSignedRequestInput,
) -> Result<KrakenSignedRequestOutput, String> {
    let base_url = input
        .credentials
        .base_url
        .as_deref()
        .unwrap_or("https://futures.kraken.com");
    let nonce = current_nonce()?;
    let params = input.params.unwrap_or_default();
    let query_string = to_form_body(&params);
    let final_url = if query_string.is_empty() {
        format!("{}{}", base_url.trim_end_matches('/'), input.path)
    } else {
        format!(
            "{}{}?{}",
            base_url.trim_end_matches('/'),
            input.path,
            query_string
        )
    };
    let client = reqwest::Client::new();
    let mut signature_paths = vec![futures_signature_path(&input.path)];
    if signature_paths[0] != input.path {
        signature_paths.push(input.path.clone());
    }

    let mut last_error = "Kraken Futures API error".to_string();

    for signature_path in signature_paths {
        let signature = create_futures_signature(
            &signature_path,
            &nonce,
            &query_string,
            &input.credentials.api_secret,
        )?;

        let mut headers = HeaderMap::new();
        headers.insert(
            "APIKey",
            HeaderValue::from_str(&input.credentials.api_key).map_err(|err| err.to_string())?,
        );
        headers.insert(
            "Authent",
            HeaderValue::from_str(&signature).map_err(|err| err.to_string())?,
        );
        headers.insert(
            "Nonce",
            HeaderValue::from_str(&nonce).map_err(|err| err.to_string())?,
        );

        let response = client
            .get(&final_url)
            .headers(headers)
            .send()
            .await
            .map_err(|err| format!("Kraken Futures network request failed: {}", err))?;

        let status = response.status().as_u16();
        let text = response
            .text()
            .await
            .map_err(|err| format!("Kraken Futures response read failed: {}", err))?;

        let payload = serde_json::from_str::<Value>(&text).unwrap_or_else(|_| Value::String(text));

        if status >= 400 {
            let message = payload
                .get("error")
                .and_then(Value::as_str)
                .unwrap_or("Kraken Futures request failed");
            last_error = format!("{} ({})", message, status);
            if is_futures_auth_error(&last_error) {
                continue;
            }
            return Err(last_error);
        }

        if payload.get("result").and_then(Value::as_str) == Some("error") {
            let message = payload
                .get("error")
                .and_then(Value::as_str)
                .or_else(|| {
                    payload
                        .get("errors")
                        .and_then(Value::as_array)
                        .and_then(|items| items.first())
                        .and_then(Value::as_str)
                })
                .unwrap_or("Kraken Futures API error");
            last_error = message.to_string();
            if is_futures_auth_error(&last_error) {
                continue;
            }
            return Err(last_error);
        }

        return Ok(KrakenSignedRequestOutput { status, payload });
    }

    Err(last_error)
}

fn current_nonce() -> Result<String, String> {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|err| err.to_string())?;

    Ok(duration.as_micros().to_string())
}

fn create_signature(
    path: &str,
    nonce: &str,
    post_data: &str,
    api_secret: &str,
) -> Result<String, String> {
    let decoded_secret = general_purpose::STANDARD
        .decode(api_secret.trim())
        .map_err(|_| "Kraken API secret must be base64 encoded.".to_string())?;

    let mut sha = Sha256::new();
    sha.update(nonce.as_bytes());
    sha.update(post_data.as_bytes());
    let hashed_post_data = sha.finalize();

    let mut payload = Vec::with_capacity(path.len() + hashed_post_data.len());
    payload.extend_from_slice(path.as_bytes());
    payload.extend_from_slice(&hashed_post_data);

    let digest = hmac_sha512(&decoded_secret, &payload);
    Ok(general_purpose::STANDARD.encode(digest))
}

fn create_futures_signature(
    path: &str,
    nonce: &str,
    post_data: &str,
    api_secret: &str,
) -> Result<String, String> {
    let decoded_secret = general_purpose::STANDARD
        .decode(api_secret.trim())
        .map_err(|_| "Kraken Futures API secret must be base64 encoded.".to_string())?;

    let mut sha = Sha256::new();
    sha.update(post_data.as_bytes());
    sha.update(nonce.as_bytes());
    sha.update(path.as_bytes());
    let hashed_payload = sha.finalize();

    let digest = hmac_sha512(&decoded_secret, &hashed_payload);
    Ok(general_purpose::STANDARD.encode(digest))
}

fn futures_signature_path(path: &str) -> String {
    if let Some(stripped) = path.strip_prefix("/derivatives") {
        return stripped.to_string();
    }

    if let Some(stripped) = path.strip_prefix("/api/auth/v1") {
        return stripped.to_string();
    }

    path.to_string()
}

fn is_futures_auth_error(message: &str) -> bool {
    let normalized = message.to_ascii_lowercase();
    normalized.contains("auth")
        || normalized.contains("signature")
        || normalized.contains("unauthorized")
}

fn hmac_sha512(key: &[u8], payload: &[u8]) -> Vec<u8> {
    let mut normalized_key = key.to_vec();

    if normalized_key.len() > 128 {
        normalized_key = Sha512::digest(&normalized_key).to_vec();
    }

    normalized_key.resize(128, 0);

    let mut outer_key_pad = [0x5c; 128];
    let mut inner_key_pad = [0x36; 128];

    for (index, byte) in normalized_key.iter().enumerate() {
        outer_key_pad[index] ^= byte;
        inner_key_pad[index] ^= byte;
    }

    let mut inner = Sha512::new();
    inner.update(inner_key_pad);
    inner.update(payload);
    let inner_hash = inner.finalize();

    let mut outer = Sha512::new();
    outer.update(outer_key_pad);
    outer.update(inner_hash);
    outer.finalize().to_vec()
}

fn to_form_body(params: &BTreeMap<String, Value>) -> String {
    let mut pairs: Vec<String> = Vec::new();

    if let Some(nonce) = params.get("nonce").and_then(value_to_form_string) {
        pairs.push(format!("nonce={}", percent_encode(&nonce)));
    }

    for (key, value) in params.iter().filter(|(key, _)| key.as_str() != "nonce") {
        if let Some(value) = value_to_form_string(value) {
            if !value.is_empty() {
                pairs.push(format!(
                    "{}={}",
                    percent_encode(key),
                    percent_encode(&value)
                ));
            }
        }
    }

    pairs.join("&")
}

fn value_to_form_string(value: &Value) -> Option<String> {
    match value {
        Value::Null => None,
        Value::Bool(value) => Some(value.to_string()),
        Value::Number(value) => Some(value.to_string()),
        Value::String(value) => Some(value.clone()),
        _ => Some(value.to_string()),
    }
}

fn percent_encode(value: &str) -> String {
    value
        .bytes()
        .flat_map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                vec![byte as char]
            }
            _ => format!("%{:02X}", byte).chars().collect(),
        })
        .collect()
}
