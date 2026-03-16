mod api;
mod keychain;
mod tray;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Hide dock icon — this is a menu bar-only app
            #[cfg(target_os = "macos")]
            {
                eprintln!("[x2] Setting activation policy to Accessory...");
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            eprintln!("[x2] Creating tray icon...");
            match tray::create_tray(app.handle()) {
                Ok(_) => eprintln!("[x2] Tray icon created successfully"),
                Err(e) => eprintln!("[x2] ERROR creating tray: {:?}", e),
            }

            if let Some(window) = app.get_webview_window("main") {
                eprintln!("[x2] Hiding main window...");
                let _ = window.hide();

                let w = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        let _ = w.hide();
                    }
                });
            } else {
                eprintln!("[x2] WARNING: main window not found!");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            keychain::check_auth,
            api::get_usage,
            tray::update_tray_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
