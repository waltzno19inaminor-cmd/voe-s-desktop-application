use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashSet;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};

pub struct Mt5ProcessState(pub Arc<Mutex<HashSet<u32>>>);

impl Default for Mt5ProcessState {
    fn default() -> Self {
        Self(Arc::new(Mutex::new(HashSet::new())))
    }
}

pub fn terminate_all_processes(state: &Mt5ProcessState) {
    let pids = state
        .0
        .lock()
        .map(|mut pids| pids.drain().collect::<Vec<_>>())
        .unwrap_or_default();

    for pid in pids {
        #[cfg(target_os = "windows")]
        let _ = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .status();

        #[cfg(not(target_os = "windows"))]
        let _ = Command::new("kill")
            .args(["-TERM", &pid.to_string()])
            .status();
    }
}

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

fn run_bridge(
    script: PathBuf,
    python: String,
    request: Mt5Request,
    processes: Arc<Mutex<HashSet<u32>>>,
) -> Result<Value, String> {
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

    let pid = child.id();
    if let Ok(mut active) = processes.lock() {
        active.insert(pid);
    }

    let write_result = match child.stdin.take() {
        Some(mut stdin) => stdin
            .write_all(&payload)
            .map_err(|error| error.to_string()),
        None => Err("Could not open Python bridge stdin".to_string()),
    };
    if let Err(error) = write_result {
        let _ = child.kill();
        if let Ok(mut active) = processes.lock() {
            active.remove(&pid);
        }
        return Err(format!("Could not send request to MetaTrader 5 bridge: {error}"));
    }

    let output = child.wait_with_output();
    if let Ok(mut active) = processes.lock() {
        active.remove(&pid);
    }
    let output = output.map_err(|error| format!("MetaTrader 5 Python bridge failed: {error}"))?;
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
pub async fn mt5_request(
    app: AppHandle,
    state: tauri::State<'_, Mt5ProcessState>,
    request: Mt5Request,
) -> Result<Value, String> {
    let script = script_path(&app)?;
    let python = python_executable(&request);

    let processes = state.0.clone();
    tauri::async_runtime::spawn_blocking(move || run_bridge(script, python, request, processes))
        .await
        .map_err(|error| format!("MetaTrader 5 bridge task failed: {error}"))?
}
