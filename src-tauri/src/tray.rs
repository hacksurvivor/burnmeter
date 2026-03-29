use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

pub fn create_tray(app: &AppHandle) -> Result<TrayIcon, tauri::Error> {
    let quit = MenuItem::with_id(app, "quit", "Quit Burnmeter", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&quit])?;

    // 1x1 transparent pixel — we only show text in the tray
    let transparent: &[u8] = &[0, 0, 0, 0];
    let icon = tauri::image::Image::new(transparent, 1, 1);

    let mut builder = TrayIconBuilder::with_id("main")
        .icon(icon)
        .title("×2")
        .tooltip("Burnmeter")
        .menu(&menu)
        .show_menu_on_left_click(false)
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
        });

    // macOS template icon rendering
    #[cfg(target_os = "macos")]
    {
        builder = builder.icon_as_template(true);
    }

    let tray = builder.build(app)?;
    Ok(tray)
}

fn position_window_near_tray(window: &tauri::WebviewWindow) {
    if let Ok(monitor) = window.current_monitor() {
        if let Some(monitor) = monitor {
            let screen_size = monitor.size();
            let scale = monitor.scale_factor();
            let window_width = 380.0;
            let x = (screen_size.width as f64 / scale) - window_width - 8.0;
            let y = 28.0;
            let _ = window.set_position(tauri::Position::Logical(
                tauri::LogicalPosition::new(x, y),
            ));
        }
    }
}

#[tauri::command]
pub fn update_tray_status(
    app: AppHandle,
    status: String,
    five_hour_pct: Option<u32>,
    seven_day_pct: Option<u32>,
) -> Result<(), String> {
    let pct_str = match (five_hour_pct, seven_day_pct) {
        (Some(h), Some(d)) => format!(" {}·{}", h, d),
        (Some(h), None) => format!(" {}", h),
        _ => String::new(),
    };

    let title = match status.as_str() {
        "green" => format!("🟢{}", pct_str),
        "orange" => format!("🟠{}", pct_str),
        "gray" => "⚪".to_string(),
        _ => "⚪".to_string(),
    };

    if let Some(tray) = app.tray_by_id("main") {
        tray.set_title(Some(&title)).map_err(|e| e.to_string())?;
    }
    Ok(())
}
