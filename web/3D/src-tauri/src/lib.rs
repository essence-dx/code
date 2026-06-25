use base64::{engine::general_purpose, Engine as _};
use std::fs;
use std::path::Path;

fn safe_file_stem(value: &str) -> String {
    let mut stem = String::with_capacity(value.len());

    for character in value.to_lowercase().chars() {
        if character.is_ascii_alphanumeric() {
            stem.push(character);
        } else if !stem.ends_with('-') {
            stem.push('-');
        }
    }

    let stem = stem.trim_matches('-').to_string();

    if stem.is_empty() {
        "scene".to_string()
    } else {
        stem
    }
}

fn is_scene_document_path(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| matches!(extension.to_lowercase().as_str(), "essencescene" | "json"))
        .unwrap_or(false)
}

#[tauri::command]
fn read_startup_scene_document() -> Result<Option<String>, String> {
    let scene_path = std::env::args_os()
        .skip(1)
        .map(std::path::PathBuf::from)
        .find(|path| is_scene_document_path(path));

    match scene_path {
        Some(path) => fs::read_to_string(path).map(Some).map_err(|error| error.to_string()),
        None => Ok(None),
    }
}

#[tauri::command]
fn open_scene_document() -> Result<Option<String>, String> {
    let path = rfd::FileDialog::new()
        .set_title("Open Essence Spline Scene")
        .add_filter("Essence Spline Scene", &["essencescene", "json"])
        .pick_file();

    match path {
        Some(path) => fs::read_to_string(path).map(Some).map_err(|error| error.to_string()),
        None => Ok(None),
    }
}

#[tauri::command]
fn save_scene_document(file_name: String, contents: String) -> Result<bool, String> {
    let path = rfd::FileDialog::new()
        .set_title("Save Essence Spline Scene")
        .add_filter("Essence Spline Scene", &["essencescene", "json"])
        .set_file_name(format!("{}.essencescene", safe_file_stem(&file_name)))
        .save_file();

    match path {
        Some(path) => fs::write(path, contents)
            .map(|_| true)
            .map_err(|error| error.to_string()),
        None => Ok(false),
    }
}

#[tauri::command]
fn export_png_image(file_name: String, data_url: String) -> Result<bool, String> {
    let Some((_, encoded)) = data_url.split_once(',') else {
        return Err("PNG export data is invalid.".to_string());
    };
    let bytes = general_purpose::STANDARD
        .decode(encoded)
        .map_err(|error| error.to_string())?;
    let path = rfd::FileDialog::new()
        .set_title("Export Essence Spline PNG")
        .add_filter("PNG Image", &["png"])
        .set_file_name(format!("{}.png", safe_file_stem(&file_name)))
        .save_file();

    match path {
        Some(path) => fs::write(path, bytes)
            .map(|_| true)
            .map_err(|error| error.to_string()),
        None => Ok(false),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            export_png_image,
            open_scene_document,
            read_startup_scene_document,
            save_scene_document
        ])
        .run(tauri::generate_context!())
        .expect("error while running Essence Spline");
}
