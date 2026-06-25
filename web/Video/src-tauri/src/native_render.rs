use serde::{Deserialize, Serialize};
use std::{
  collections::HashMap,
  fs,
  path::{Path, PathBuf},
  sync::{Arc, Mutex},
  thread,
  time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::Manager;

#[derive(Default, Clone)]
pub struct NativeRenderState {
  jobs: Arc<Mutex<HashMap<String, NativeRenderStatus>>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeRenderRequest {
  pub job_id: String,
  pub project_title: String,
  pub format: String,
  pub preset: String,
  pub duration: f64,
  pub width: u32,
  pub height: u32,
  pub fps: u32,
  pub layer_count: u32,
  pub output_name: String,
  pub estimated_output_bytes: u64,
  pub render_graph: serde_json::Value,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeRenderStatus {
  pub job_id: String,
  pub status: String,
  pub progress: u8,
  pub detail: String,
  pub output: Option<NativeRenderOutput>,
  pub error: Option<String>,
  pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeRenderOutput {
  pub filename: String,
  pub format: String,
  pub mime_type: String,
  pub size: u64,
  pub path: String,
  pub saved_at: u64,
  pub artifact_kind: String,
  pub requested_format: String,
  pub manifest_path: Option<String>,
}

#[tauri::command]
pub fn start_native_render(
  app: tauri::AppHandle,
  state: tauri::State<'_, NativeRenderState>,
  request: NativeRenderRequest,
) -> Result<NativeRenderStatus, String> {
  validate_request(&request)?;

  let job_id = request.job_id.clone();
  let output_name = request.output_name.clone();
  let status = NativeRenderStatus {
    job_id: job_id.clone(),
    status: "rendering".to_string(),
    progress: 10,
    detail: "Native render job accepted.".to_string(),
    output: None,
    error: None,
    updated_at: timestamp_ms(),
  };

  {
    let mut jobs = state.jobs.lock().map_err(|_| "Native render state is unavailable.")?;
    jobs.insert(job_id.clone(), status.clone());
  }

  let jobs = state.jobs.clone();
  let app_local_data_dir = app.path().app_local_data_dir().ok();
  thread::spawn(move || {
    for progress in [25_u8, 45, 65, 82, 96] {
      thread::sleep(Duration::from_millis(180));
      if is_cancelled(&jobs, &job_id) {
        return;
      }
      update_job(&jobs, &job_id, progress, "Native render worker is processing timeline metadata.", None);
    }

    thread::sleep(Duration::from_millis(180));
    if is_cancelled(&jobs, &job_id) {
      return;
    }

    update_job(&jobs, &job_id, 98, "Native render worker is preparing desktop output.", None);
    let render_result = render_native_output(&jobs, &job_id, &request, &output_name, app_local_data_dir.as_deref());
    if is_cancelled(&jobs, &job_id) {
      return;
    }

    let mut jobs = match jobs.lock() {
      Ok(jobs) => jobs,
      Err(_) => return,
    };

    match render_result {
      Ok((output, detail)) => {
        jobs.insert(
          job_id.clone(),
          NativeRenderStatus {
            job_id,
            status: "complete".to_string(),
            progress: 100,
            detail,
            output: Some(output),
            error: None,
            updated_at: timestamp_ms(),
          },
        );
      }
      Err(error) => {
        jobs.insert(
          job_id.clone(),
          NativeRenderStatus {
            job_id,
            status: "failed".to_string(),
            progress: 100,
            detail: "Native compositor manifest could not be written.".to_string(),
            output: None,
            error: Some(error),
            updated_at: timestamp_ms(),
          },
        );
      }
    }
  });

  Ok(status)
}

#[tauri::command]
pub fn get_native_render_status(
  state: tauri::State<'_, NativeRenderState>,
  job_id: String,
) -> Result<NativeRenderStatus, String> {
  let jobs = state.jobs.lock().map_err(|_| "Native render state is unavailable.")?;
  jobs
    .get(job_id.trim())
    .cloned()
    .ok_or_else(|| "Native render job was not found.".to_string())
}

#[tauri::command]
pub fn cancel_native_render(
  state: tauri::State<'_, NativeRenderState>,
  job_id: String,
) -> Result<NativeRenderStatus, String> {
  let mut jobs = state.jobs.lock().map_err(|_| "Native render state is unavailable.")?;
  let job = jobs
    .get_mut(job_id.trim())
    .ok_or_else(|| "Native render job was not found.".to_string())?;

  if job.status == "complete" {
    return Ok(job.clone());
  }

  job.status = "cancelled".to_string();
  job.progress = 100;
  job.detail = "Native render job was cancelled.".to_string();
  job.updated_at = timestamp_ms();

  Ok(job.clone())
}

fn validate_request(request: &NativeRenderRequest) -> Result<(), String> {
  if request.job_id.trim().is_empty() {
    return Err("Native render job id is required.".to_string());
  }
  if request.output_name.trim().is_empty() {
    return Err("Native render output name is required.".to_string());
  }
  if request.width == 0 || request.height == 0 || request.fps == 0 {
    return Err("Native render output dimensions and FPS must be positive.".to_string());
  }
  if request.duration <= 0.0 {
    return Err("Native render duration must be positive.".to_string());
  }
  if !matches!(
    request.format.as_str(),
    "mp4" | "webm" | "mov" | "avi" | "mpeg" | "gif" | "png" | "jpg" | "webp" | "wav" | "mp3" | "m4a" | "json"
  ) {
    return Err("Native render format is not supported.".to_string());
  }
  if request.render_graph.get("version").and_then(|value| value.as_u64()) != Some(1) {
    return Err("Native render graph version is not supported.".to_string());
  }
  if request.render_graph.get("layers").and_then(|value| value.as_array()).is_none() {
    return Err("Native render graph layers are required.".to_string());
  }

  Ok(())
}

fn is_cancelled(jobs: &Arc<Mutex<HashMap<String, NativeRenderStatus>>>, job_id: &str) -> bool {
  jobs
    .lock()
    .ok()
    .and_then(|jobs| jobs.get(job_id).map(|job| job.status == "cancelled"))
    .unwrap_or(true)
}

fn update_job(
  jobs: &Arc<Mutex<HashMap<String, NativeRenderStatus>>>,
  job_id: &str,
  progress: u8,
  detail: &str,
  error: Option<String>,
) {
  if let Ok(mut jobs) = jobs.lock() {
    if let Some(job) = jobs.get_mut(job_id) {
      job.progress = progress;
      job.detail = detail.to_string();
      job.error = error;
      job.updated_at = timestamp_ms();
    }
  }
}

fn render_native_output(
  jobs: &Arc<Mutex<HashMap<String, NativeRenderStatus>>>,
  job_id: &str,
  request: &NativeRenderRequest,
  output_name: &str,
  app_local_data_dir: Option<&std::path::Path>,
) -> Result<(NativeRenderOutput, String), String> {
  let manifest_output = write_native_render_manifest(request, job_id, output_name)?;
  let manifest_path = manifest_output.path.clone();
  let output_dir = native_render_spool_dir(job_id);
  let Some(rendered) = crate::native_ffmpeg::render_with_ffmpeg(jobs, job_id, request, output_name, &output_dir, app_local_data_dir)? else {
    return Ok((
      manifest_output,
      "Native compositor manifest created. Install FFmpeg or set ESSENCE_FFMPEG_PATH to render final media bytes.".to_string(),
    ));
  };

  Ok((
    NativeRenderOutput {
      filename: rendered.filename,
      format: request.format.clone(),
      mime_type: mime_type_for_format(&request.format).to_string(),
      size: rendered.size,
      path: rendered.path,
      saved_at: timestamp_ms(),
      artifact_kind: "media-file".to_string(),
      requested_format: request.format.clone(),
      manifest_path: Some(manifest_path),
    },
    format!(
      "Native FFmpeg renderer completed {} for {} at {}x{} across {} layers.",
      request.preset, request.project_title, request.width, request.height, request.layer_count
    ),
  ))
}

fn write_native_render_manifest(
  request: &NativeRenderRequest,
  job_id: &str,
  output_name: &str,
) -> Result<NativeRenderOutput, String> {
  let output_dir = native_render_spool_dir(job_id);
  fs::create_dir_all(&output_dir).map_err(|error| format!("Could not create native render spool directory: {error}"))?;

  let manifest_filename = format!("{}.render-manifest.json", sanitize_path_segment(output_name));
  let manifest_path = output_dir.join(&manifest_filename);
  let saved_at = timestamp_ms();
  let requested_mime_type = mime_type_for_format(&request.format);
  let manifest = serde_json::json!({
    "version": 1,
    "jobId": &request.job_id,
    "projectTitle": &request.project_title,
    "requestedOutput": {
      "filename": output_name,
      "format": &request.format,
      "mimeType": requested_mime_type,
      "preset": &request.preset,
      "estimatedOutputBytes": request.estimated_output_bytes
    },
    "timeline": {
      "duration": request.duration,
      "width": request.width,
      "height": request.height,
      "fps": request.fps,
      "visibleLayerCount": request.layer_count
    },
    "renderGraph": &request.render_graph,
    "compositor": {
      "engine": "native-ffmpeg",
      "status": "manifest-ready",
      "nextStep": "spawn-ffmpeg-with-render-graph"
    },
    "createdAt": saved_at
  });

  let bytes = serde_json::to_vec_pretty(&manifest).map_err(|error| format!("Could not serialize native render manifest: {error}"))?;
  fs::write(&manifest_path, &bytes).map_err(|error| format!("Could not write native render manifest: {error}"))?;
  let size = fs::metadata(&manifest_path)
    .map(|metadata| metadata.len())
    .unwrap_or(bytes.len() as u64);

  Ok(NativeRenderOutput {
    filename: manifest_filename,
    format: "json".to_string(),
    mime_type: "application/json".to_string(),
    size,
    path: manifest_path.to_string_lossy().to_string(),
    saved_at,
    artifact_kind: "render-manifest".to_string(),
    requested_format: request.format.clone(),
    manifest_path: Some(manifest_path.to_string_lossy().to_string()),
  })
}

fn native_render_spool_dir(job_id: &str) -> PathBuf {
  std::env::temp_dir()
    .join("essence-studio-native-render")
    .join(sanitize_path_segment(job_id))
}

fn mime_type_for_format(format: &str) -> &str {
  match format {
    "mp4" => "video/mp4",
    "webm" => "video/webm",
    "mov" => "video/quicktime",
    "avi" => "video/x-msvideo",
    "mpeg" => "video/mpeg",
    "gif" => "image/gif",
    "png" => "image/png",
    "jpg" => "image/jpeg",
    "webp" => "image/webp",
    "wav" => "audio/wav",
    "mp3" => "audio/mpeg",
    "m4a" => "audio/mp4",
    _ => "application/json",
  }
}

pub(crate) fn run_native_render_smoke(app_local_data_dir: Option<&Path>) -> Result<NativeRenderOutput, String> {
  let job_id = format!("desktop-smoke-{}", timestamp_ms());
  let request = NativeRenderRequest {
    job_id: job_id.clone(),
    project_title: "Desktop diagnostics".to_string(),
    format: "png".to_string(),
    preset: "desktop-smoke".to_string(),
    duration: 0.25,
    width: 320,
    height: 180,
    fps: 24,
    layer_count: 0,
    output_name: "desktop-smoke.png".to_string(),
    estimated_output_bytes: 180_000,
    render_graph: serde_json::json!({
      "version": 1,
      "canvas": {
        "width": 320,
        "height": 180,
        "fps": 24,
        "duration": 0.25,
        "background": "#111827",
        "transparentBackground": false
      },
      "layers": [],
      "media": [],
      "fonts": []
    }),
  };
  validate_request(&request)?;

  let jobs = Arc::new(Mutex::new(HashMap::from([(
    job_id.clone(),
    NativeRenderStatus {
      job_id: job_id.clone(),
      status: "rendering".to_string(),
      progress: 10,
      detail: "Desktop render smoke accepted.".to_string(),
      output: None,
      error: None,
      updated_at: timestamp_ms(),
    },
  )])));
  let (output, _) = render_native_output(&jobs, &job_id, &request, &request.output_name, app_local_data_dir)?;

  Ok(output)
}

fn sanitize_path_segment(value: &str) -> String {
  value
    .chars()
    .map(|character| {
      if character.is_ascii_alphanumeric() || matches!(character, '.' | '-' | '_') {
        character
      } else {
        '-'
      }
    })
    .collect()
}

fn timestamp_ms() -> u64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_millis() as u64)
    .unwrap_or_default()
}
