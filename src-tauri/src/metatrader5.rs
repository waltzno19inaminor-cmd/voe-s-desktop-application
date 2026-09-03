use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashSet;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
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

fn advisor_source_files(app: &AppHandle) -> Result<Vec<(String, PathBuf)>, String> {
    let mut directories = Vec::new();
    if let Ok(resource_dir) = app.path().resource_dir() {
        directories.push(resource_dir.join("resources").join("mt5"));
        directories.push(resource_dir.join("mt5"));
    }
    directories.push(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("resources")
            .join("mt5"),
    );

    let mut files = Vec::new();
    for name in ["ExportTrades.ex5", "ExportTrades.mq5"] {
        if let Some(path) = directories
            .iter()
            .map(|directory| directory.join(name))
            .find(|path| path.is_file())
        {
            files.push((name.to_string(), path));
        }
    }

    if files.is_empty() {
        Err("Файлы советника ExportTrades не найдены в ресурсах приложения.".to_string())
    } else {
        Ok(files)
    }
}

fn copy_advisor_files(
    sources: &[(String, PathBuf)],
    destination: &Path,
) -> Result<Vec<PathBuf>, String> {
    fs::create_dir_all(destination).map_err(|error| {
        format!(
            "Не удалось создать папку {}: {error}",
            destination.display()
        )
    })?;

    sources
        .iter()
        .map(|(name, source)| {
            let target = destination.join(name);
            fs::copy(source, &target)
                .map_err(|error| format!("Не удалось скопировать {}: {error}", target.display()))?;
            Ok(target)
        })
        .collect()
}

#[cfg(target_os = "windows")]
fn windows_mt5_advisor_directories(connection: &Mt5Connection) -> Vec<PathBuf> {
    let mut mql5_roots = HashSet::new();

    if let Some(terminal_path) = connection.path.as_deref() {
        if let Some(terminal_dir) = Path::new(terminal_path).parent() {
            let mql5 = terminal_dir.join("MQL5");
            if mql5.is_dir() {
                mql5_roots.insert(mql5);
            }
        }
    }

    if let Some(app_data) = std::env::var_os("APPDATA") {
        let terminals = PathBuf::from(app_data).join("MetaQuotes").join("Terminal");
        if let Ok(entries) = fs::read_dir(terminals) {
            for entry in entries.flatten() {
                let mql5 = entry.path().join("MQL5");
                if mql5.is_dir() {
                    mql5_roots.insert(mql5);
                }
            }
        }
    }

    for variable in ["ProgramFiles", "ProgramFiles(x86)"] {
        let Some(program_files) = std::env::var_os(variable) else {
            continue;
        };
        if let Ok(entries) = fs::read_dir(program_files) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_ascii_lowercase();
                if name.contains("metatrader") {
                    let mql5 = entry.path().join("MQL5");
                    if mql5.is_dir() {
                        mql5_roots.insert(mql5);
                    }
                }
            }
        }
    }

    mql5_roots
        .into_iter()
        .map(|root| root.join("Experts").join("Advisors"))
        .collect()
}

fn install_advisor(app: &AppHandle, connection: &Mt5Connection) -> Result<Value, String> {
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app, connection);
        return Err("Автоматическая установка советника доступна только в Windows.".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        let sources = advisor_source_files(app)?;
        let destinations = windows_mt5_advisor_directories(connection);
        if destinations.is_empty() {
            return Err(
                "Не удалось найти каталог MQL5 установленного MetaTrader 5. Запустите терминал хотя бы один раз."
                    .to_string(),
            );
        }

        let mut copied = Vec::new();
        let mut errors = Vec::new();
        for destination in destinations {
            match copy_advisor_files(&sources, &destination) {
                Ok(paths) => copied.extend(paths),
                Err(error) => errors.push(error),
            }
        }
        if copied.is_empty() {
            return Err(errors.join(" "));
        }

        Ok(serde_json::json!({
            "installed": true,
            "copiedCount": copied.len(),
            "copied": copied,
            "message": "Советник ExportTrades установлен. Перезапустите навигатор MT5 и добавьте советник на график."
        }))
    }
}

fn download_advisor_to_desktop(app: &AppHandle) -> Result<Value, String> {
    let sources = advisor_source_files(app)?;
    let desktop = dirs::desktop_dir()
        .ok_or_else(|| "Windows не вернул путь к рабочему столу пользователя.".to_string())?;
    let copied = copy_advisor_files(&sources, &desktop)?;

    Ok(serde_json::json!({
        "downloaded": true,
        "copied": copied,
        "message": format!("Файлы советника сохранены в {}", desktop.display())
    }))
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
        Some(mut stdin) => stdin.write_all(&payload).map_err(|error| error.to_string()),
        None => Err("Could not open Python bridge stdin".to_string()),
    };
    if let Err(error) = write_result {
        let _ = child.kill();
        if let Ok(mut active) = processes.lock() {
            active.remove(&pid);
        }
        return Err(format!(
            "Could not send request to MetaTrader 5 bridge: {error}"
        ));
    }

    let output = child.wait_with_output();
    if let Ok(mut active) = processes.lock() {
        active.remove(&pid);
    }
    let output = output.map_err(|error| format!("MetaTrader 5 Python bridge failed: {error}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    if stdout.trim().is_empty() {
        let details = if stderr.trim().is_empty() {
            "Python завершился без вывода. Проверьте, что выбран python.exe, а не pythonw.exe или Windows Store alias."
                .to_string()
        } else {
            stderr.trim().to_string()
        };
        return Err(format!(
            "MetaTrader 5 Python bridge returned no response (exit code: {}). {details}",
            output
                .status
                .code()
                .map(|code| code.to_string())
                .unwrap_or_else(|| "unknown".to_string())
        ));
    }
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
    if request.action == "install_advisor" {
        return install_advisor(&app, &request.connection);
    }
    if request.action == "download_desktop" {
        return download_advisor_to_desktop(&app);
    }

    let script = script_path(&app)?;
    let python = python_executable(&request);

    let processes = state.0.clone();
    tauri::async_runtime::spawn_blocking(move || run_bridge(script, python, request, processes))
        .await
        .map_err(|error| format!("MetaTrader 5 bridge task failed: {error}"))?
}
