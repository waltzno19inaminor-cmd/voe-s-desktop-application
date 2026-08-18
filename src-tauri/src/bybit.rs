use reqwest::header::{HeaderMap, HeaderValue};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

const BYBIT_BASE_URL: &str = "https://api.bybit.com";

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BybitCredentials {
    api_key: String,
    api_secret: String,
    base_url: Option<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BybitSignedRequestInput {
    credentials: BybitCredentials,
    method: Option<String>,
    path: String,
    params: Option<HashMap<String, Value>>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BybitSignedRequestOutput {
    status: u16,
    payload: Value,
}

#[tauri::command]
pub async fn bybit_signed_request(
    input: BybitSignedRequestInput,
) -> Result<BybitSignedRequestOutput, String> {
    let method = input
        .method
        .unwrap_or_else(|| "GET".to_string())
        .to_uppercase();
    let base_url = input
        .credentials
        .base_url
        .as_deref()
        .unwrap_or(BYBIT_BASE_URL);
    let params = input.params.unwrap_or_default();

    let timestamp = current_timestamp_ms()?.to_string();
    let recv_window = "5000";
    let api_key = &input.credentials.api_key;

    let (query_string, body_string, final_url) = if method == "GET" || method == "DELETE" {
        let qs = to_query_string(&params);
        let url = if qs.is_empty() {
            format!("{}{}", base_url.trim_end_matches('/'), input.path)
        } else {
            format!("{}{}?{}", base_url.trim_end_matches('/'), input.path, qs)
        };
        (qs, String::new(), url)
    } else {
        let body = if params.is_empty() {
            String::new()
        } else {
            serde_json::to_string(&params).unwrap_or_default()
        };
        let url = format!("{}{}", base_url.trim_end_matches('/'), input.path);
        (String::new(), body, url)
    };

    let payload_to_sign = if method == "GET" || method == "DELETE" {
        format!("{}{}{}{}", timestamp, api_key, recv_window, query_string)
    } else {
        format!("{}{}{}{}", timestamp, api_key, recv_window, body_string)
    };

    let signature = create_signature(&payload_to_sign, &input.credentials.api_secret)?;

    let mut headers = HeaderMap::new();
    headers.insert(
        "X-BAPI-API-KEY",
        HeaderValue::from_str(api_key).map_err(|err| err.to_string())?,
    );
    headers.insert(
        "X-BAPI-TIMESTAMP",
        HeaderValue::from_str(&timestamp).map_err(|err| err.to_string())?,
    );
    headers.insert(
        "X-BAPI-RECV-WINDOW",
        HeaderValue::from_str(recv_window).map_err(|err| err.to_string())?,
    );
    headers.insert(
        "X-BAPI-SIGN",
        HeaderValue::from_str(&signature).map_err(|err| err.to_string())?,
    );

    if method == "POST" {
        headers.insert("Content-Type", HeaderValue::from_static("application/json"));
    }

    let client = reqwest::Client::new();
    let mut request_builder = match method.as_str() {
        "POST" => client.post(&final_url),
        "DELETE" => client.delete(&final_url),
        _ => client.get(&final_url),
    };

    if method == "POST" && !body_string.is_empty() {
        request_builder = request_builder.body(body_string);
    }

    let response = request_builder
        .headers(headers)
        .send()
        .await
        .map_err(|err| format!("Bybit network request failed: {}", err))?;

    let status = response.status().as_u16();
    let text = response
        .text()
        .await
        .map_err(|err| format!("Bybit response read failed: {}", err))?;

    let payload = serde_json::from_str::<Value>(&text).unwrap_or_else(|_| Value::String(text));

    if status >= 400 {
        let message = payload
            .get("retMsg")
            .and_then(Value::as_str)
            .unwrap_or("Bybit request failed");
        return Err(format!("{} ({})", message, status));
    }

    if let Some(ret_code) = payload.get("retCode").and_then(Value::as_i64) {
        if ret_code != 0 {
            let message = payload
                .get("retMsg")
                .and_then(Value::as_str)
                .unwrap_or("Bybit API error");
            return Err(format!("{} (code {})", message, ret_code));
        }
    }

    Ok(BybitSignedRequestOutput { status, payload })
}

fn current_timestamp_ms() -> Result<u64, String> {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|err| err.to_string())?;

    Ok(duration.as_millis() as u64)
}

fn create_signature(payload: &str, api_secret: &str) -> Result<String, String> {
    let mut key = api_secret.as_bytes().to_vec();

    if key.len() > 64 {
        key = Sha256::digest(&key).to_vec();
    }

    key.resize(64, 0);

    let mut outer_key_pad = [0x5c; 64];
    let mut inner_key_pad = [0x36; 64];

    for (index, byte) in key.iter().enumerate() {
        outer_key_pad[index] ^= byte;
        inner_key_pad[index] ^= byte;
    }

    let mut inner = Sha256::new();
    inner.update(inner_key_pad);
    inner.update(payload.as_bytes());
    let inner_hash = inner.finalize();

    let mut outer = Sha256::new();
    outer.update(outer_key_pad);
    outer.update(inner_hash);

    Ok(to_hex(&outer.finalize()))
}

fn to_query_string(params: &HashMap<String, Value>) -> String {
    let mut pairs: Vec<_> = params
        .iter()
        .filter_map(|(key, value)| value_to_query_string(value).map(|value| (key, value)))
        .filter(|(_, value)| !value.is_empty())
        .map(|(key, value)| format!("{}={}", percent_encode(key), percent_encode(&value)))
        .collect();

    pairs.sort();
    pairs.join("&")
}

fn value_to_query_string(value: &Value) -> Option<String> {
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

fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{:02x}", byte)).collect()
}
