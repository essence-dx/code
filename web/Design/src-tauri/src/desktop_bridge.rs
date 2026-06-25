use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::{
  fs,
  path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager};

const DESIGN_FILE_VERSION: u8 = 1;
const RECENT_PROJECT_LIMIT: usize = 12;
const MAX_OFFLINE_ASSET_BYTES: usize = 25 * 1024 * 1024;

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DesktopDesignFile {
  version: u8,
  project_id: String,
  project_name: String,
  exported_at: String,
  document: serde_json::Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveDesignFileRequest {
  file_path: String,
  file: DesktopDesignFile,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopDesignFileResult {
  file_path: String,
  file: DesktopDesignFile,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DesktopRecentProject {
  project_id: String,
  project_name: String,
  file_path: String,
  updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenDesignFileRequest {
  file_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveRecentDesignFileRequest {
  file_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OfflineAssetCacheRequest {
  cache_key: String,
  file_name: String,
  mime_type: String,
  data_url: String,
  source_page_id: Option<String>,
  source_element_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheOfflineAssetsRequest {
  assets: Vec<OfflineAssetCacheRequest>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OfflineAssetCacheEntry {
  cache_key: String,
  file_name: String,
  mime_type: String,
  size_bytes: usize,
  file_path: String,
  source_page_id: Option<String>,
  source_element_id: Option<String>,
}

#[tauri::command]
pub fn save_design_file(
  app: AppHandle,
  request: SaveDesignFileRequest,
) -> Result<DesktopDesignFileResult, String> {
  validate_design_file(&request.file)?;
  let file_path = normalize_file_path(&request.file_path)?;

  if let Some(parent) = file_path.parent() {
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
  }

  let json = serde_json::to_string_pretty(&request.file).map_err(|error| error.to_string())?;
  fs::write(&file_path, json).map_err(|error| error.to_string())?;
  upsert_recent_project(&app, recent_project_from_file(&request.file, &file_path)?)?;

  Ok(DesktopDesignFileResult {
    file_path: file_path_to_string(&file_path),
    file: request.file,
  })
}

#[tauri::command]
pub fn open_design_file(
  app: AppHandle,
  request: OpenDesignFileRequest,
) -> Result<DesktopDesignFileResult, String> {
  let file_path = normalize_file_path(&request.file_path)?;
  let json = fs::read_to_string(&file_path).map_err(|error| error.to_string())?;
  let file: DesktopDesignFile = serde_json::from_str(&json).map_err(|error| error.to_string())?;

  validate_design_file(&file)?;
  upsert_recent_project(&app, recent_project_from_file(&file, &file_path)?)?;

  Ok(DesktopDesignFileResult {
    file_path: file_path_to_string(&file_path),
    file,
  })
}

#[tauri::command]
pub fn list_recent_design_files(app: AppHandle) -> Result<Vec<DesktopRecentProject>, String> {
  read_recent_projects(&app)
}

#[tauri::command]
pub fn remove_recent_design_file(
  app: AppHandle,
  request: RemoveRecentDesignFileRequest,
) -> Result<Vec<DesktopRecentProject>, String> {
  let remove_path = normalize_file_path(&request.file_path)?;
  let remove_path = file_path_to_string(&remove_path);
  let recent_projects = read_recent_projects(&app)?
    .into_iter()
    .filter(|project| project.file_path != remove_path)
    .collect::<Vec<_>>();

  write_recent_projects(&app, &recent_projects)?;
  Ok(recent_projects)
}

#[tauri::command]
pub fn cache_offline_assets(
  app: AppHandle,
  request: CacheOfflineAssetsRequest,
) -> Result<Vec<OfflineAssetCacheEntry>, String> {
  let cache_dir = bridge_dir(&app)?.join("offline-assets");
  fs::create_dir_all(&cache_dir).map_err(|error| error.to_string())?;
  let mut entries = Vec::with_capacity(request.assets.len());

  for asset in request.assets {
    let bytes = decode_data_url(&asset.data_url)?;

    if bytes.len() > MAX_OFFLINE_ASSET_BYTES {
      return Err(format!(
        "Offline asset {} is larger than the 25 MB limit",
        asset.file_name
      ));
    }

    let cache_key = sanitize_file_segment(&asset.cache_key);
    let mime_type = normalize_mime_type(&asset.mime_type);
    let file_name = with_mime_extension(&sanitize_file_segment(&asset.file_name), &mime_type);
    let asset_dir = cache_dir.join(&cache_key);
    let file_path = asset_dir.join(&file_name);

    fs::create_dir_all(&asset_dir).map_err(|error| error.to_string())?;
    fs::write(&file_path, &bytes).map_err(|error| error.to_string())?;

    entries.push(OfflineAssetCacheEntry {
      cache_key,
      file_name,
      mime_type,
      size_bytes: bytes.len(),
      file_path: file_path_to_string(&file_path),
      source_page_id: asset.source_page_id,
      source_element_id: asset.source_element_id,
    });
  }

  Ok(entries)
}

fn validate_design_file(file: &DesktopDesignFile) -> Result<(), String> {
  if file.version != DESIGN_FILE_VERSION {
    return Err("Unsupported Essence design file version".to_string());
  }

  if file.project_id.trim().is_empty() {
    return Err("Design file is missing a project id".to_string());
  }

  if file.project_name.trim().is_empty() {
    return Err("Design file is missing a project name".to_string());
  }

  let document = file
    .document
    .as_object()
    .ok_or_else(|| "Design file document must be an object".to_string())?;

  if document.get("version").and_then(|value| value.as_u64()) != Some(1) {
    return Err("Design file document version is unsupported".to_string());
  }

  if !document
    .get("pages")
    .map(|value| value.is_array())
    .unwrap_or(false)
  {
    return Err("Design file document is missing pages".to_string());
  }

  Ok(())
}

fn bridge_dir(app: &AppHandle) -> Result<PathBuf, String> {
  let dir = app
    .path()
    .app_data_dir()
    .map_err(|error| error.to_string())?
    .join("desktop-bridge");

  fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
  Ok(dir)
}

fn recent_projects_path(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(bridge_dir(app)?.join("recent-projects.json"))
}

fn read_recent_projects(app: &AppHandle) -> Result<Vec<DesktopRecentProject>, String> {
  let path = recent_projects_path(app)?;

  if !path.exists() {
    return Ok(Vec::new());
  }

  let json = fs::read_to_string(path).map_err(|error| error.to_string())?;
  let recent_projects = serde_json::from_str(&json).unwrap_or_default();

  Ok(recent_projects)
}

fn write_recent_projects(
  app: &AppHandle,
  recent_projects: &[DesktopRecentProject],
) -> Result<(), String> {
  let json = serde_json::to_string_pretty(recent_projects).map_err(|error| error.to_string())?;
  fs::write(recent_projects_path(app)?, json).map_err(|error| error.to_string())
}

fn upsert_recent_project(app: &AppHandle, project: DesktopRecentProject) -> Result<(), String> {
  let mut recent_projects = read_recent_projects(app)?
    .into_iter()
    .filter(|recent| recent.file_path != project.file_path)
    .collect::<Vec<_>>();

  recent_projects.insert(0, project);
  recent_projects.truncate(RECENT_PROJECT_LIMIT);
  write_recent_projects(app, &recent_projects)
}

fn recent_project_from_file(
  file: &DesktopDesignFile,
  path: &Path,
) -> Result<DesktopRecentProject, String> {
  Ok(DesktopRecentProject {
    project_id: file.project_id.clone(),
    project_name: file.project_name.clone(),
    file_path: file_path_to_string(path),
    updated_at: file.exported_at.clone(),
  })
}

fn normalize_file_path(path: &str) -> Result<PathBuf, String> {
  let trimmed_path = path.trim();

  if trimmed_path.is_empty() {
    return Err("File path is required".to_string());
  }

  Ok(PathBuf::from(trimmed_path))
}

fn decode_data_url(data_url: &str) -> Result<Vec<u8>, String> {
  let (_, payload) = data_url
    .split_once(',')
    .ok_or_else(|| "Offline asset must be a data URL".to_string())?;

  general_purpose::STANDARD
    .decode(payload.trim())
    .map_err(|error| error.to_string())
}

fn normalize_mime_type(mime_type: &str) -> String {
  let trimmed = mime_type.trim();

  if trimmed.is_empty() {
    return "application/octet-stream".to_string();
  }

  trimmed.to_string()
}

fn with_mime_extension(file_name: &str, mime_type: &str) -> String {
  let extension = mime_extension(mime_type);

  if Path::new(file_name).extension().is_some() {
    return file_name.to_string();
  }

  format!("{file_name}.{extension}")
}

fn mime_extension(mime_type: &str) -> &'static str {
  match mime_type {
    "image/jpeg" => "jpg",
    "image/png" => "png",
    "image/svg+xml" => "svg",
    "image/webp" => "webp",
    "audio/mpeg" => "mp3",
    "audio/wav" => "wav",
    "video/mp4" => "mp4",
    "application/pdf" => "pdf",
    _ => "bin",
  }
}

fn sanitize_file_segment(value: &str) -> String {
  let mut sanitized = value
    .chars()
    .map(|character| {
      if character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.') {
        character
      } else {
        '-'
      }
    })
    .collect::<String>();

  while sanitized.contains("..") {
    sanitized = sanitized.replace("..", "-");
  }

  let sanitized = sanitized
    .trim_matches(|character| character == '-' || character == '.')
    .to_string();

  if sanitized.is_empty() {
    "asset".to_string()
  } else {
    sanitized
  }
}

fn file_path_to_string(path: &Path) -> String {
  path.to_string_lossy().to_string()
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn sanitizes_file_segments() {
    assert_eq!(sanitize_file_segment("../Launch Poster!.png"), "Launch-Poster-.png");
    assert_eq!(sanitize_file_segment(""), "asset");
  }

  #[test]
  fn preserves_existing_extensions() {
    assert_eq!(with_mime_extension("photo.jpg", "image/png"), "photo.jpg");
    assert_eq!(with_mime_extension("photo", "image/png"), "photo.png");
  }

  #[test]
  fn validates_design_file_shape() {
    let file = DesktopDesignFile {
      version: 1,
      project_id: "project-1".to_string(),
      project_name: "Launch".to_string(),
      exported_at: "2026-05-15T10:00:00.000Z".to_string(),
      document: serde_json::json!({
        "version": 1,
        "width": 1080,
        "height": 1080,
        "activePageId": "page-1",
        "pages": []
      }),
    };

    assert!(validate_design_file(&file).is_ok());
  }
}
