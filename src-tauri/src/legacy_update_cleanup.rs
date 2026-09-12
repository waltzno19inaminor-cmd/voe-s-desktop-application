use std::fs;
use tauri::{Manager, Runtime};

const JLJ_DATA_DIR: &str = "JLJData";
const LEGACY_PATCHES_DIR: &str = "patches";
const LEGACY_PAYLOAD_DIR: &str = "payload-updates";

/// Removes the retired partial-update layers so the webview always loads the
/// frontend embedded in the currently installed, signed Tauri application.
pub fn clear<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<(), String> {
    let app_data = app.path().app_data_dir().map_err(|error| error.to_string())?;
    let data_root = app_data.join(JLJ_DATA_DIR);

    for path in [
        data_root.join(LEGACY_PATCHES_DIR),
        data_root.join(LEGACY_PAYLOAD_DIR),
    ] {
        if path.exists() {
            fs::remove_dir_all(&path)
                .map_err(|error| format!("remove legacy update data {}: {error}", path.display()))?;
        }
    }

    Ok(())
}
