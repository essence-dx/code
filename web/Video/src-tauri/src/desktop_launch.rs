use serde::Serialize;
use std::{
  env,
  time::{SystemTime, UNIX_EPOCH},
};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopLaunchSession {
  pub id: String,
  pub started_at: u64,
  pub auto_verify: bool,
}

#[tauri::command]
pub fn read_desktop_launch_session(session: tauri::State<'_, DesktopLaunchSession>) -> DesktopLaunchSession {
  session.inner().clone()
}

pub fn create_desktop_launch_session() -> DesktopLaunchSession {
  let started_at = timestamp_ms();
  DesktopLaunchSession {
    id: format!("desktop-launch-{started_at}"),
    started_at,
    auto_verify: desktop_auto_verify_enabled(),
  }
}

fn desktop_auto_verify_enabled() -> bool {
  env::var("ESSENCE_DESKTOP_AUTO_VERIFY")
    .ok()
    .map(|value| matches!(value.trim().to_ascii_lowercase().as_str(), "1" | "true" | "yes"))
    .unwrap_or(false)
}

fn timestamp_ms() -> u64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_millis() as u64)
    .unwrap_or_default()
}
