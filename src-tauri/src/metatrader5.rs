use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::{AppHandle, Manager};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Mt5Connection {
    pub mode: Option<String>,
    pub path: Option<String>,
    pub login: Option<u64>,
    pub password: Option<String>,
    pub server: Option<String>,
    pub timeout: Option<u64>,
    pub portable: Option<bool>,
    pub bridge_host: Option<String>,
    pub bridge_port: Option<u16>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Mt5Request {
    pub action: String,
    pub connection: Mt5Connection,
    pub params: Option<Value>,
    pub python_path: Option<String>,
}

fn script_path(app: &AppHandle) -> Result<PathBuf, String> {
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("python").join("mt5_service.py");
        if bundled.exists() {
            return Ok(bundled);
        }
    }

    let source = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("python")
        .join("mt5_service.py");
    if source.exists() {
        return Ok(source);
    }

    Err("MetaTrader 5 Python bridge script was not found".to_string())
}

fn python_executable(request: &Mt5Request) -> String {
    request
        .python_path
        .clone()
        .or_else(|| std::env::var("MT5_PYTHON").ok())
        .unwrap_or_else(|| {
            if cfg!(target_os = "windows") {
                "python.exe".to_string()
            } else {
                "python3".to_string()
            }
        })
}

fn run_bridge(script: PathBuf, python: String, request: Mt5Request) -> Result<Value, String> {
    let payload = serde_json::to_vec(&request)
        .map_err(|error| format!("Could not serialize MetaTrader 5 request: {error}"))?;

    let mut child = Command::new(&python)
        .arg(&script)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| {
            format!(
                "Could not start Python ({python}). Install Python and MetaTrader5, or set MT5_PYTHON: {error}"
            )
        })?;

    child
        .stdin
        .take()
        .ok_or_else(|| "Could not open Python bridge stdin".to_string())?
        .write_all(&payload)
        .map_err(|error| format!("Could not send request to MetaTrader 5 bridge: {error}"))?;

    let output = child
        .wait_with_output()
        .map_err(|error| format!("MetaTrader 5 Python bridge failed: {error}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let response: Value = serde_json::from_str(stdout.trim()).map_err(|error| {
        let details = if stderr.trim().is_empty() {
            stdout.trim().to_string()
        } else {
            stderr.trim().to_string()
        };
        format!("Invalid response from MetaTrader 5 bridge: {error}. {details}")
    })?;

    if response.get("ok").and_then(Value::as_bool) != Some(true) || !output.status.success() {
        return Err(response
            .get("error")
            .and_then(Value::as_str)
            .unwrap_or("MetaTrader 5 request failed")
            .to_string());
    }

    Ok(response.get("data").cloned().unwrap_or(Value::Null))
}

#[tauri::command(rename_all = "camelCase")]
pub async fn mt5_request(app: AppHandle, request: Mt5Request) -> Result<Value, String> {
    let script = script_path(&app)?;
    let python = python_executable(&request);

    tauri::async_runtime::spawn_blocking(move || run_bridge(script, python, request))
        .await
        .map_err(|error| format!("MetaTrader 5 bridge task failed: {error}"))?
}
