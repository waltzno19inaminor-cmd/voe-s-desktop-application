use reqwest::header::{HeaderMap, HeaderValue};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

const BINANCE_SPOT_BASE_URL: &str = "https://api.binance.com";
const BINANCE_USDM_FUTURES_BASE_URL: &str = "https://fapi.binance.com";

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BinanceCredentials {
    api_key: String,
    api_secret: String,
    base_url: Option<String>,
    futures_base_url: Option<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BinanceSignedRequestInput {
    credentials: BinanceCredentials,
    market: Option<String>,
    method: Option<String>,
    path: String,
    params: Option<HashMap<String, Value>>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BinanceSignedRequestOutput {
    status: u16,
    payload: Value,
}

#[tauri::command]
pub async fn binance_signed_request(
    input: BinanceSignedRequestInput,
) -> Result<BinanceSignedRequestOutput, String> {
    let method = input
        .method
        .unwrap_or_else(|| "GET".to_string())
        .to_uppercase();
    let base_url = match input.market.as_deref() {
        Some("usdm-futures") => input
            .credentials
            .futures_base_url
            .as_deref()
            .unwrap_or(BINANCE_USDM_FUTURES_BASE_URL),
        _ => input
            .credentials
            .base_url
            .as_deref()
            .unwrap_or(BINANCE_SPOT_BASE_URL),
    };
    let mut params = input.params.unwrap_or_default();

    params.insert(
        "timestamp".to_string(),
        Value::from(current_timestamp_ms()?),
    );
    params
        .entry("recvWindow".to_string())
        .or_insert_with(|| Value::from(5000));

    let query_string = to_query_string(&params);
    let signature = create_signature(&query_string, &input.credentials.api_secret)?;
    let url = format!(
        "{}{}?{}&signature={}",
        base_url.trim_end_matches('/'),
        input.path,
        query_string,
        signature
    );

    let mut headers = HeaderMap::new();
    headers.insert(
        "X-MBX-APIKEY",
        HeaderValue::from_str(&input.credentials.api_key).map_err(|err| err.to_string())?,
    );

    let client = reqwest::Client::new();
    let request = match method.as_str() {
        "POST" => client.post(&url),
        "DELETE" => client.delete(&url),
        _ => client.get(&url),
    };

    let response = request
        .headers(headers)
        .send()
        .await
        .map_err(|err| format!("Binance network request failed: {}", err))?;
    let status = response.status().as_u16();
    let text = response
        .text()
        .await
        .map_err(|err| format!("Binance response read failed: {}", err))?;
    let payload = serde_json::from_str::<Value>(&text).unwrap_or_else(|_| Value::String(text));

    if status >= 400 {
        let message = payload
            .get("msg")
            .or_else(|| payload.get("message"))
            .and_then(Value::as_str)
            .unwrap_or("Binance request failed");
        return Err(format!("{} ({})", message, status));
    }

    Ok(BinanceSignedRequestOutput { status, payload })
}

fn current_timestamp_ms() -> Result<u64, String> {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|err| err.to_string())?;

    Ok(duration.as_millis() as u64)
}

fn create_signature(query_string: &str, api_secret: &str) -> Result<String, String> {
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
    inner.update(query_string.as_bytes());
    let inner_hash = inner.finalize();

    let mut outer = Sha256::new();
    outer.update(outer_key_pad);
    outer.update(inner_hash);

    Ok(to_hex(&outer.finalize()))
}

fn to_query_string(params: &HashMap<String, Value>) -> String {
    params
        .iter()
        .filter_map(|(key, value)| value_to_query_string(value).map(|value| (key, value)))
        .filter(|(_, value)| !value.is_empty())
        .map(|(key, value)| format!("{}={}", percent_encode(key), percent_encode(&value)))
        .collect::<Vec<_>>()
        .join("&")
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
