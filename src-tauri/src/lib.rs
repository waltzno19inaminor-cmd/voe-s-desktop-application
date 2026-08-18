use tauri::Emitter;

mod audio_recorder;
mod benchmark;
mod binance;
mod bybit;
mod ibkr;
mod kraken;
pub mod patch;
pub mod payload_update;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    let builder = patch::register_patch_protocol(builder);

    builder
        .manage(audio_recorder::NativeAudioRecorder::default())
        .manage(benchmark::BenchmarkState::default())
        .invoke_handler(tauri::generate_handler![
            audio_recorder::native_audio_start,
            audio_recorder::native_audio_pause,
            audio_recorder::native_audio_resume,
            audio_recorder::native_audio_stop,
            benchmark::get_benchmark_and_beta,
            benchmark::get_historical_curves,
            binance::binance_signed_request,
            bybit::bybit_signed_request,
            ibkr::ibkr_fetch_xml,
            kraken::kraken_signed_request,
            kraken::kraken_futures_signed_request,
            patch::patch_get_state,
            patch::patch_verify_active,
            patch::patch_clear_active,
            patch::patch_install_from_upload,
            payload_update::payload_update_get_state,
            payload_update::payload_update_clear,
            payload_update::payload_update_install_from_feed
        ])
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            let _ = app.emit("single-instance", (args, cwd));
        }))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            app.handle().plugin(tauri_plugin_shell::init())?;
            app.handle().plugin(tauri_plugin_deep_link::init())?;
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;
            app.handle().plugin(tauri_plugin_dialog::init())?;
            app.handle().plugin(tauri_plugin_process::init())?;
            app.handle().plugin(tauri_plugin_fs::init())?;
            patch::navigate_to_active_resource_patch(app);
            payload_update::navigate_to_active_payload(app);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
