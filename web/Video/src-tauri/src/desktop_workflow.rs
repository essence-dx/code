use std::{
    fs,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::Manager;

use crate::desktop_diagnostics::{DesktopDiagnosticReport, DesktopDiagnosticStep};

const SAMPLE_PNG: &[u8] = &[
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0,
    0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 248, 15, 4, 0, 9, 251, 3,
    253, 167, 234, 118, 56, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
];

#[tauri::command]
pub fn run_desktop_workflow_smoke(app: tauri::AppHandle) -> DesktopDiagnosticReport {
    let steps = vec![
        file_backed_media_recovery_step(&app),
        native_export_output_step(&app),
    ];

    DesktopDiagnosticReport {
        status: report_status(&steps),
        checked_at: timestamp_ms(),
        steps,
    }
}

fn file_backed_media_recovery_step(app: &tauri::AppHandle) -> DesktopDiagnosticStep {
    let Ok(data_dir) = app.path().app_local_data_dir() else {
        return step(
            "file-backed-media",
            "File-backed media",
            "failed",
            "Desktop media storage is unavailable.",
        );
    };

    let media_dir = data_dir.join("media");
    if fs::create_dir_all(&media_dir).is_err() {
        return step(
            "file-backed-media",
            "File-backed media",
            "failed",
            "Desktop media storage could not be prepared.",
        );
    }

    let media_path = media_dir.join(format!("desktop-workflow-smoke-{}.png", timestamp_ms()));
    if fs::write(&media_path, SAMPLE_PNG).is_err() {
        return step(
            "file-backed-media",
            "File-backed media",
            "failed",
            "Desktop media could not be written.",
        );
    }

    let read_back = fs::read(&media_path).ok();
    let _ = fs::remove_file(&media_path);

    if read_back.as_deref() != Some(SAMPLE_PNG) {
        return step(
            "file-backed-media",
            "File-backed media",
            "failed",
            "Desktop media could not be reopened.",
        );
    }

    step(
        "file-backed-media",
        "File-backed media",
        "ready",
        "A file-backed media item was written, reopened, validated, and cleaned up.",
    )
}

fn native_export_output_step(app: &tauri::AppHandle) -> DesktopDiagnosticStep {
    let app_local_data_dir = app.path().app_local_data_dir().ok();
    match crate::native_render::run_native_render_smoke(app_local_data_dir.as_deref()) {
        Ok(output) if output.artifact_kind == "media-file" && output_exists(&output.path, output.size) => step(
            "native-export-output",
            "Native export output",
            "ready",
            "Desktop export output was created and validated.",
        ),
        Ok(output) if output.artifact_kind == "render-manifest" && output_exists(&output.path, output.size) => step(
            "native-export-output",
            "Native export output",
            "limited",
            "Desktop export handoff was created; final media output needs the optional local renderer.",
        ),
        Ok(_) => step("native-export-output", "Native export output", "failed", "Desktop export output was not usable."),
        Err(_) => step(
            "native-export-output",
            "Native export output",
            "failed",
            "Desktop export output could not be created.",
        ),
    }
}

fn output_exists(path: &str, expected_size: u64) -> bool {
    fs::metadata(Path::new(path))
        .map(|metadata| metadata.is_file() && metadata.len() == expected_size && metadata.len() > 0)
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
