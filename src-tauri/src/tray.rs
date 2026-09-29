use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

// Clicking the tray icon blurs the popover before the click event arrives, so the
// blur handler has already hidden it. Remember when that happened so the click
// closes the popover instead of reopening it.
static LAST_BLUR_HIDE: Mutex<Option<Instant>> = Mutex::new(None);
const BLUR_CLICK_WINDOW: Duration = Duration::from_millis(400);

pub fn hide_on_blur(window: &tauri::WebviewWindow) {
    if window.is_visible().unwrap_or(false) {
        *LAST_BLUR_HIDE.lock().unwrap() = Some(Instant::now());
    }
    let _ = window.hide();
}

fn hidden_by_this_click() -> bool {
    LAST_BLUR_HIDE
        .lock()
        .unwrap()
        .take()
        .is_some_and(|at| at.elapsed() < BLUR_CLICK_WINDOW)
}

pub fn create_tray(app: &AppHandle) -> Result<TrayIcon, tauri::Error> {
    let quit = MenuItem::with_id(app, "quit", "Quit Burnmeter", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&quit])?;

    let icon = tauri::include_image!("icons/tray-claude.png");

    let builder = TrayIconBuilder::with_id("main")
        .icon(icon)
        .title("LLM")
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
                rect,
                ..
            } = event
            {
                let app = tray_icon.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else if !hidden_by_this_click() {
                        position_window_under_tray(&window, rect);
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        });

    let tray = builder.build(app)?;
    Ok(tray)
}

const TRAY_GAP: f64 = 6.0;
const SCREEN_MARGIN: f64 = 8.0;

/// Centers the popover under the clicked tray icon, clamped to the icon's monitor.
fn position_window_under_tray(window: &tauri::WebviewWindow, tray_rect: tauri::Rect) {
    let Ok(Some(monitor)) = window.primary_monitor() else {
        return;
    };
    let scale = monitor.scale_factor();
    let icon_pos = tray_rect.position.to_physical::<f64>(scale);
    let icon_size = tray_rect.size.to_physical::<f64>(scale);
    let icon_center_x = icon_pos.x + icon_size.width / 2.0;

    let monitor = window
        .monitor_from_point(icon_center_x / scale, icon_pos.y / scale)
        .ok()
        .flatten()
        .unwrap_or(monitor);
    let scale = monitor.scale_factor();
    let Ok(window_size) = window.outer_size() else {
        return;
    };

    let screen_left = monitor.position().x as f64;
    let screen_right = screen_left + monitor.size().width as f64;
    let margin = SCREEN_MARGIN * scale;
    let max_x = (screen_right - window_size.width as f64 - margin).max(screen_left + margin);
    let x = (icon_center_x - window_size.width as f64 / 2.0).clamp(screen_left + margin, max_x);
    let y = icon_pos.y + icon_size.height + TRAY_GAP * scale;

    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(
        x.round() as i32,
        y.round() as i32,
    )));
}

#[tauri::command]
pub fn update_tray_status(
    app: AppHandle,
    status: String,
    summary: Option<String>,
    tooltip: Option<String>,
    icon_provider: Option<String>,
) -> Result<(), String> {
    let title = summary
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "LLM".to_string());

    let status_label = match status.as_str() {
        "green" => "Off-peak boost active",
        "orange" => "Peak window",
        "gray" => "Standard limits",
        _ => "Usage status",
    };
    let tooltip = tooltip
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .map(|value| format!("Burnmeter\n{}\n{}", status_label, value))
        .unwrap_or_else(|| format!("Burnmeter\n{}", status_label));

    if let Some(tray) = app.tray_by_id("main") {
        if let Some(icon) = icon_provider.as_deref().and_then(provider_icon) {
            tray.set_icon(Some(icon)).map_err(|e| e.to_string())?;
        }
        tray.set_title(Some(&title)).map_err(|e| e.to_string())?;
        tray.set_tooltip(Some(&tooltip))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn provider_icon(provider: &str) -> Option<tauri::image::Image<'static>> {
    match provider {
        "claude" => Some(tauri::include_image!("icons/tray-claude.png")),
        "codex" => Some(tauri::include_image!("icons/tray-codex.png")),
        _ => None,
    }
}
