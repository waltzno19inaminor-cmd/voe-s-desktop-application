use tauri::Manager;
#[cfg(not(target_os = "macos"))]
use tauri::Emitter;

mod audio_recorder;
mod avatar_cache;
mod benchmark;
mod binance;
mod bybit;
mod ibkr;
mod kraken;
mod legacy_update_cleanup;
mod metatrader5;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Tauri requires single-instance to be the first plugin so Windows/Linux
    // deep-link command-line arguments can be forwarded to the running app.
    let builder = tauri::Builder::default();

    #[cfg(not(target_os = "macos"))]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
        let _ = app.emit("single-instance", (args, cwd));
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }));

    let builder = builder.plugin(tauri_plugin_deep_link::init());

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
            metatrader5::mt5_request
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
            // Signed Tauri releases are the only update mechanism. Remove old
            // partial-update data so it cannot mask the bundled frontend.
            if let Err(error) = legacy_update_cleanup::clear(app.handle()) {
                log::error!("failed to clear legacy update data: {error}");
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
