use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

pub fn create_tray(app: &AppHandle) -> Result<TrayIcon, tauri::Error> {
    let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray-icon.png"))
        .expect("failed to load tray icon");

    // Right-click menu with Quit
    let quit = MenuItem::with_id(app, "quit", "Quit Claude X2", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&quit])?;

    let tray = TrayIconBuilder::with_id("main")
        .icon(icon)
        .icon_as_template(true)
        .title("×2")
        .tooltip("Claude X2 Tracker")
        .menu(&menu)
        .menu_on_left_click(false)
        .on_menu_event(|app, event| {
            if event.id.as_ref() == "quit" {
                app.exit(0);
            }
        })
        .on_tray_icon_event(|tray_icon: &TrayIcon, event: TrayIconEvent| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray_icon.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                        position_window_near_tray(&window);
                    }
                }
            }
        })
        .build(app)?;

    Ok(tray)
}

fn position_window_near_tray(window: &tauri::WebviewWindow) {
    if let Ok(monitor) = window.current_monitor() {
        if let Some(monitor) = monitor {
            let screen_size = monitor.size();
            let scale = monitor.scale_factor();
            let window_width = 360.0;
            let x = (screen_size.width as f64 / scale) - window_width - 8.0;
            let y = 28.0;
            let _ = window.set_position(tauri::Position::Logical(
                tauri::LogicalPosition::new(x, y),
            ));
        }
    }
}

#[tauri::command]
pub fn update_tray_status(app: AppHandle, status: String, pct: Option<u32>) -> Result<(), String> {
    let pct_str = pct.map(|p| format!(" {}%", p)).unwrap_or_default();

    let title = match status.as_str() {
        "green" => format!("×2{}", pct_str),
        "orange" => format!("plan{}", pct_str),
        "gray" => "×2".to_string(),
        _ => "×2".to_string(),
    };

    if let Some(tray) = app.tray_by_id("main") {
        tray.set_title(Some(&title)).map_err(|e| e.to_string())?;
    }
    Ok(())
}
