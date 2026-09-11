use std::fs;
use tauri::{AppHandle, Runtime};

use crate::patch::{
    active_manifest_path_from_root, active_signature_path_from_root, active_web_dir_from_root,
    app_data_dir, jlj_data_root_from_data_dir, patches_root, state_path_from_root,
};

const LEGACY_PAYLOAD_DIR: &str = "payload-updates";
const LEGACY_STAGING_PREFIX: &str = "payload-staging";
const LEGACY_BACKUP_DIR: &str = "active-web-backup";

/// Removes the retired web-payload update layer before the application loads
/// its UI. Current releases are served only from the signed native bundle.
pub fn clear_legacy_payload_updates<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let payload_root =
        jlj_data_root_from_data_dir(&app_data_dir(app)?).join(LEGACY_PAYLOAD_DIR);
    let patches = patches_root(app)?;
    // Always discard every previously activated web layer. Otherwise an old
    // resource patch can keep masking the frontend embedded in the newly
    // installed native application.
    remove_dir_if_present(&active_web_dir_from_root(&patches))?;
    for path in [
        state_path_from_root(&patches),
        active_manifest_path_from_root(&patches),
        active_signature_path_from_root(&patches),
    ] {
        remove_file_if_present(&path)?;
    }

    if patches.exists() {
        for entry in fs::read_dir(&patches)
            .map_err(|error| format!("read legacy patches directory: {error}"))?
        {
            let entry = entry.map_err(|error| format!("read legacy patch entry: {error}"))?;
            let name = entry.file_name();
            let name = name.to_string_lossy();
            if entry.path().is_dir()
                && (name.starts_with(LEGACY_STAGING_PREFIX) || name == LEGACY_BACKUP_DIR)
            {
                remove_dir_if_present(&entry.path())?;
            }
        }
    }

    remove_dir_if_present(&payload_root)
}

fn remove_file_if_present(path: &std::path::Path) -> Result<(), String> {
    if path.exists() {
        fs::remove_file(path).map_err(|error| format!("remove {}: {error}", path.display()))?;
    }
    Ok(())
}

fn remove_dir_if_present(path: &std::path::Path) -> Result<(), String> {
    if path.exists() {
        fs::remove_dir_all(path).map_err(|error| format!("remove {}: {error}", path.display()))?;
    }
    Ok(())
}
