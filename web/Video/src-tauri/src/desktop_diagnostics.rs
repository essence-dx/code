use serde::Serialize;
use std::{
  env, fs,
  path::{Path, PathBuf},
  process::{Command, Stdio},
  time::{SystemTime, UNIX_EPOCH},
};
use tauri::Manager;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopDiagnosticReport {
  pub status: String,
  pub checked_at: u64,
  pub steps: Vec<DesktopDiagnosticStep>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopDiagnosticStep {
  pub id: String,
  pub label: String,
  pub status: String,
  pub detail: String,
}

#[tauri::command]
pub fn run_desktop_diagnostics(app: tauri::AppHandle) -> DesktopDiagnosticReport {
  let steps = vec![
    app_local_storage_step(&app),
    media_library_step(&app),
    native_render_spool_step(),
    native_render_smoke_step(&app),
    native_media_engine_step(),
  ];
  let status = report_status(&steps);

  DesktopDiagnosticReport {
    status,
    checked_at: timestamp_ms(),
    steps,
  }
}

fn app_local_storage_step(app: &tauri::AppHandle) -> DesktopDiagnosticStep {
  match app.path().app_local_data_dir() {
    Ok(dir) => read_write_probe(
      &dir.join("diagnostics"),
      "desktop-storage",
      "Local storage",
      "Local workspace storage can write and read files.",
    ),
    Err(_) => step("desktop-storage", "Local storage", "failed", "Local workspace storage is unavailable."),
  }
}

fn media_library_step(app: &tauri::AppHandle) -> DesktopDiagnosticStep {
  let Ok(dir) = app.path().app_local_data_dir() else {
    return step("media-library", "Media library", "failed", "Media and font storage is unavailable.");
  };

  for folder in ["media", "fonts"] {
    if fs::create_dir_all(dir.join(folder)).is_err() {
      return step("media-library", "Media library", "failed", "Media and font storage could not be prepared.");
    }
  }

  step("media-library", "Media library", "ready", "Media and font storage is writable.")
}

fn native_render_spool_step() -> DesktopDiagnosticStep {
  read_write_probe(
    &env::temp_dir().join("essence-studio-native-render"),
    "render-spool",
    "Render spool",
    "Desktop render handoff storage can write and read files.",
  )
}

fn native_render_smoke_step(app: &tauri::AppHandle) -> DesktopDiagnosticStep {
  let app_local_data_dir = app.path().app_local_data_dir().ok();
  match crate::native_render::run_native_render_smoke(app_local_data_dir.as_deref()) {
    Ok(output) if output.artifact_kind == "media-file" && output.size > 0 => step(
      "native-render-smoke",
      "Native render smoke",
      "ready",
      "Desktop render smoke created media output.",
    ),
    Ok(output) if output.artifact_kind == "render-manifest" && output.size > 0 => step(
      "native-render-smoke",
      "Native render smoke",
      "limited",
      "Desktop render smoke created a handoff manifest; final media rendering needs the optional local engine.",
    ),
    Ok(_) => step("native-render-smoke", "Native render smoke", "failed", "Desktop render smoke did not create a usable output."),
    Err(_) => step("native-render-smoke", "Native render smoke", "failed", "Desktop render smoke could not complete."),
  }
}

fn native_media_engine_step() -> DesktopDiagnosticStep {
  if native_media_engine_available() {
    return step("native-media-engine", "Native media engine", "ready", "Native media rendering is available.");
  }

  step(
    "native-media-engine",
    "Native media engine",
    "limited",
    "Desktop handoff can create render manifests; final media rendering needs the optional local engine.",
  )
}

fn read_write_probe(dir: &Path, id: &str, label: &str, ready_detail: &str) -> DesktopDiagnosticStep {
  if fs::create_dir_all(dir).is_err() {
    return step(id, label, "failed", "Required local storage could not be prepared.");
  }

  let path = diagnostic_file_path(dir);
  let content = format!("essence-studio-desktop-check-{}", timestamp_ms());
  if fs::write(&path, content.as_bytes()).is_err() {
    return step(id, label, "failed", "Required local storage could not be written.");
  }

  let read_back = fs::read_to_string(&path).ok();
  let _ = fs::remove_file(&path);
  if read_back.as_deref() != Some(content.as_str()) {
    return step(id, label, "failed", "Required local storage could not be read back.");
  }

  step(id, label, "ready", ready_detail)
}

fn diagnostic_file_path(dir: &Path) -> PathBuf {
  dir.join(format!("check-{}.txt", timestamp_ms()))
}

fn native_media_engine_available() -> bool {
  env::var("ESSENCE_FFMPEG_PATH")
    .ok()
    .map(|path| path.trim().to_string())
    .filter(|path| !path.is_empty())
    .map(|path| can_start_media_engine(&path))
    .unwrap_or(false)
    || can_start_media_engine("ffmpeg")
}

fn can_start_media_engine(binary: &str) -> bool {
  Command::new(binary)
    .arg("-version")
    .stdout(Stdio::null())
    .stderr(Stdio::null())
    .status()
    .map(|status| status.success())
    .unwrap_or(false)
}

fn report_status(steps: &[DesktopDiagnosticStep]) -> String {
  if steps.iter().any(|step| step.status == "failed") {
    return "failed".to_string();
  }

  if steps.iter().any(|step| step.status == "limited") {
    return "limited".to_string();
  }

  "ready".to_string()
}

fn step(id: &str, label: &str, status: &str, detail: &str) -> DesktopDiagnosticStep {
  DesktopDiagnosticStep {
    id: id.to_string(),
    label: label.to_string(),
    status: status.to_string(),
    detail: detail.to_string(),
  }
}

fn timestamp_ms() -> u64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_millis() as u64)
    .unwrap_or_default()
}
