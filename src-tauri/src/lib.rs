use tauri::{Emitter, Manager};

mod audio_recorder;
mod avatar_cache;
mod benchmark;
mod binance;
mod bybit;
mod ibkr;
mod kraken;
mod metatrader5;
pub mod patch;
pub mod payload_update;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Tauri requires single-instance to be the first plugin so Windows/Linux
    // deep-link command-line arguments can be forwarded to the running app.
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            let _ = app.emit("single-instance", (args, cwd));
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_deep_link::init());
    let builder = patch::register_patch_protocol(builder);

    let app = builder
        .manage(audio_recorder::NativeAudioRecorder::default())
        .manage(metatrader5::Mt5ProcessState::default())
        .manage(benchmark::BenchmarkState::default())
        .invoke_handler(tauri::generate_handler![
            audio_recorder::native_audio_start,
            audio_recorder::native_audio_pause,
            audio_recorder::native_audio_resume,
            audio_recorder::native_audio_stop,
            avatar_cache::cache_google_avatar,
            benchmark::get_benchmark_and_beta,
            benchmark::get_historical_curves,
            binance::binance_signed_request,
            bybit::bybit_signed_request,
            ibkr::ibkr_fetch_xml,
            kraken::kraken_signed_request,
            kraken::kraken_futures_signed_request,
            metatrader5::mt5_request,
            patch::patch_get_state,
            patch::patch_verify_active,
            patch::patch_clear_active,
            patch::patch_install_from_upload,
            payload_update::payload_update_get_state,
            payload_update::payload_update_clear,
            payload_update::payload_update_fetch_manifest,
            payload_update::payload_update_install_from_feed
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            app.handle().plugin(tauri_plugin_shell::init())?;
            #[cfg(windows)]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                // Keep the protocol association valid for dev, installed, and
                // updater-replaced executables. NSIS registration alone can be
                // absent or stale after an application update.
                app.deep_link().register_all()?;
            }
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;
            app.handle().plugin(tauri_plugin_dialog::init())?;
            app.handle().plugin(tauri_plugin_process::init())?;
            app.handle().plugin(tauri_plugin_fs::init())?;
            // Development must always use Tauri's devUrl. A previously installed
            // production payload shares the same app identifier and would otherwise
            // replace the Nuxt dev server with jljpatch:// content.
            if !cfg!(debug_assertions) {
                patch::navigate_to_active_resource_patch(app);
                payload_update::navigate_to_active_payload(app);
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Tauri application");

    app.run(|app, event| {
            if matches!(event, tauri::RunEvent::Exit) {
                if let Some(state) = app.try_state::<metatrader5::Mt5ProcessState>() {
                    metatrader5::terminate_all_processes(&state);
                }
            }
        });
}
