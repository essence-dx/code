use crate::{
  native_ffmpeg_graph::{
    append_media_inputs, audio_filtergraph, ffmpeg_color_from_graph, filter_complex_graph,
    format_supports_audio, has_audio_inputs, native_layer_filtergraph, native_media_inputs,
    NativeMediaKind,
  },
  native_render::{NativeRenderRequest, NativeRenderStatus},
};
use std::{
  collections::HashMap,
  env,
  fs,
  path::{Path, PathBuf},
  process::{Command, Stdio},
  sync::{Arc, Mutex},
  thread,
  time::Duration,
};

pub struct NativeFfmpegOutput {
  pub filename: String,
  pub path: String,
  pub size: u64,
}

pub fn render_with_ffmpeg(
  jobs: &Arc<Mutex<HashMap<String, NativeRenderStatus>>>,
  job_id: &str,
  request: &NativeRenderRequest,
  output_name: &str,
  output_dir: &Path,
  app_local_data_dir: Option<&Path>,
) -> Result<Option<NativeFfmpegOutput>, String> {
  let Some(ffmpeg) = ffmpeg_binary() else {
    return Ok(None);
  };

  update_job(jobs, job_id, 99, "Native FFmpeg renderer is producing output bytes.");
  let output_path = output_dir.join(media_output_filename(output_name, &request.format));
  let args = native_ffmpeg_args(request, &output_path, app_local_data_dir)?;
  run_ffmpeg_command(jobs, job_id, &ffmpeg, &args)?;
  let size = fs::metadata(&output_path)
    .map_err(|error| format!("Native FFmpeg output was not readable: {error}"))?
    .len();

  Ok(Some(NativeFfmpegOutput {
    filename: output_path
      .file_name()
      .and_then(|name| name.to_str())
      .unwrap_or(output_name)
      .to_string(),
    path: output_path.to_string_lossy().to_string(),
    size,
  }))
}

fn ffmpeg_binary() -> Option<String> {
  if let Ok(path) = env::var("ESSENCE_FFMPEG_PATH") {
    if !path.trim().is_empty() && can_start_ffmpeg(path.trim()) {
      return Some(path);
    }
  }

  if can_start_ffmpeg("ffmpeg") {
    Some("ffmpeg".to_string())
  } else {
    None
  }
}

fn can_start_ffmpeg(binary: &str) -> bool {
  Command::new(binary)
    .arg("-version")
    .stdout(Stdio::null())
    .stderr(Stdio::null())
    .status()
    .map(|status| status.success())
    .unwrap_or(false)
}

fn run_ffmpeg_command(
  jobs: &Arc<Mutex<HashMap<String, NativeRenderStatus>>>,
  job_id: &str,
  binary: &str,
  args: &[String],
) -> Result<(), String> {
  let mut child = Command::new(binary)
    .args(args)
    .stdout(Stdio::null())
    .stderr(Stdio::null())
    .spawn()
    .map_err(|error| format!("Native FFmpeg could not start: {error}"))?;

  loop {
    if is_cancelled(jobs, job_id) {
      let _ = child.kill();
      let _ = child.wait();
      return Err("Native FFmpeg render was cancelled.".to_string());
    }

    match child.try_wait() {
      Ok(Some(status)) if status.success() => return Ok(()),
      Ok(Some(status)) => return Err(format!("Native FFmpeg render failed with status {status}.")),
      Ok(None) => thread::sleep(Duration::from_millis(120)),
      Err(error) => return Err(format!("Native FFmpeg status could not be read: {error}")),
    }
  }
}

fn native_ffmpeg_args(
  request: &NativeRenderRequest,
  output_path: &PathBuf,
  app_local_data_dir: Option<&Path>,
) -> Result<Vec<String>, String> {
  if request.format == "json" {
    return Err("Native FFmpeg does not render project bundle JSON exports.".to_string());
  }

  let duration = format!("{:.3}", request.duration.max(0.1));
  let size = format!("{}x{}", request.width, request.height);
  let fps = request.fps.max(1).to_string();
  let color = ffmpeg_color_from_graph(&request.render_graph);
  let layer_filtergraph = native_layer_filtergraph(&request.render_graph, app_local_data_dir);
  let media_inputs = native_media_inputs(&request.render_graph, app_local_data_dir);
  let transparent_canvas = request.format == "png" && transparent_background(&request.render_graph);
  let output = output_path.to_string_lossy().to_string();

  let mut args = vec!["-y".to_string()];

  if audio_output_format(&request.format) {
    let audio_inputs = media_inputs
      .iter()
      .filter(|input| input.kind == NativeMediaKind::Audio)
      .cloned()
      .collect::<Vec<_>>();
    append_media_inputs(&mut args, &audio_inputs);
    if let Some(audio_filtergraph) = audio_filtergraph(&audio_inputs, 0) {
      args.extend(["-filter_complex".to_string(), audio_filtergraph]);
      args.extend(["-map".to_string(), "[aout]".to_string()]);
    } else {
      args.extend([
        "-f".to_string(),
        "lavfi".to_string(),
        "-i".to_string(),
        "anullsrc=channel_layout=stereo:sample_rate=44100".to_string(),
      ]);
    }
    args.extend(["-t".to_string(), duration]);
    args.extend(audio_codec_args(&request.format));
    args.push(output);
    return Ok(args);
  }

  args.extend([
    "-f".to_string(),
    "lavfi".to_string(),
    "-i".to_string(),
    background_input(&color, &size, &fps, &duration, transparent_canvas),
  ]);
  append_media_inputs(&mut args, &media_inputs);

  let include_audio = format_supports_audio(&request.format) && has_audio_inputs(&media_inputs);
  if let Some(filtergraph) = filter_complex_graph(&media_inputs, layer_filtergraph.as_deref(), include_audio) {
    args.extend(["-filter_complex".to_string(), filtergraph]);
    args.extend(["-map".to_string(), "[vout]".to_string()]);
    if include_audio {
      args.extend(["-map".to_string(), "[aout]".to_string()]);
    } else {
      args.push("-an".to_string());
    }
  } else if let Some(filtergraph) = layer_filtergraph {
    args.extend(["-vf".to_string(), filtergraph, "-an".to_string()]);
  } else {
    args.push("-an".to_string());
  }

  match request.format.as_str() {
    "png" => {
      args.extend(["-frames:v".to_string(), "1".to_string()]);
      if transparent_canvas {
        args.extend(["-pix_fmt".to_string(), "rgba".to_string()]);
      }
      args.push(output);
    }
    "jpg" => args.extend(["-frames:v".to_string(), "1".to_string(), "-q:v".to_string(), "2".to_string(), output]),
    "webp" => args.extend(["-frames:v".to_string(), "1".to_string(), "-q:v".to_string(), "82".to_string(), output]),
    "gif" => args.extend(["-t".to_string(), duration, output]),
    "webm" => args.extend([
      "-t".to_string(),
      duration,
      "-c:v".to_string(),
      "libvpx".to_string(),
      "-pix_fmt".to_string(),
      "yuv420p".to_string(),
      output,
    ]),
    "mp4" => args.extend([
      "-t".to_string(),
      duration,
      "-c:v".to_string(),
      "mpeg4".to_string(),
      "-q:v".to_string(),
      "5".to_string(),
      "-pix_fmt".to_string(),
      "yuv420p".to_string(),
      output,
    ]),
    "mov" => args.extend([
      "-t".to_string(),
      duration,
      "-c:v".to_string(),
      "mpeg4".to_string(),
      "-q:v".to_string(),
      "5".to_string(),
      "-c:a".to_string(),
      "aac".to_string(),
      "-b:a".to_string(),
      "128k".to_string(),
      output,
    ]),
    "avi" => args.extend([
      "-t".to_string(),
      duration,
      "-c:v".to_string(),
      "mpeg4".to_string(),
      "-q:v".to_string(),
      "5".to_string(),
      "-c:a".to_string(),
      "mp3".to_string(),
      "-b:a".to_string(),
      "128k".to_string(),
      output,
    ]),
    "mpeg" => args.extend([
      "-t".to_string(),
      duration,
      "-c:v".to_string(),
      "mpeg1video".to_string(),
      "-b:v".to_string(),
      "2500k".to_string(),
      "-c:a".to_string(),
      "mp2".to_string(),
      "-b:a".to_string(),
      "192k".to_string(),
      output,
    ]),
    _ => return Err("Native FFmpeg format is not supported.".to_string()),
  }

  Ok(args)
}

fn background_input(color: &str, size: &str, fps: &str, duration: &str, transparent_background: bool) -> String {
  let source = format!("color=c={color}:s={size}:r={fps}:d={duration}");
  if transparent_background {
    format!("{source},format=rgba")
  } else {
    source
  }
}

fn transparent_background(render_graph: &serde_json::Value) -> bool {
  render_graph
    .get("canvas")
    .and_then(|canvas| canvas.get("transparentBackground"))
    .and_then(|value| value.as_bool())
    .unwrap_or(false)
}

fn media_output_filename(output_name: &str, format: &str) -> String {
  let sanitized = sanitize_path_segment(output_name);
  let extension = export_extension(format);
  if sanitized.ends_with(&format!(".{extension}")) {
    sanitized
  } else {
    format!("{sanitized}.{extension}")
  }
}

fn export_extension(format: &str) -> &str {
  match format {
    "mp4" => "mp4",
    "webm" => "webm",
    "mov" => "mov",
    "avi" => "avi",
    "mpeg" => "mpeg",
    "gif" => "gif",
    "png" => "png",
    "jpg" => "jpg",
    "webp" => "webp",
    "wav" => "wav",
    "mp3" => "mp3",
    "m4a" => "m4a",
    _ => "json",
  }
}

fn audio_output_format(format: &str) -> bool {
  matches!(format, "wav" | "mp3" | "m4a")
}

fn audio_codec_args(format: &str) -> Vec<String> {
  match format {
    "wav" => vec!["-c:a".to_string(), "pcm_s16le".to_string()],
    "mp3" => vec!["-c:a".to_string(), "libmp3lame".to_string(), "-b:a".to_string(), "192k".to_string()],
    "m4a" => vec!["-c:a".to_string(), "aac".to_string(), "-b:a".to_string(), "192k".to_string()],
    _ => vec!["-c:a".to_string(), "aac".to_string(), "-b:a".to_string(), "128k".to_string()],
  }
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

fn update_job(
  jobs: &Arc<Mutex<HashMap<String, NativeRenderStatus>>>,
  job_id: &str,
  progress: u8,
  detail: &str,
) {
  if let Ok(mut jobs) = jobs.lock() {
    if let Some(job) = jobs.get_mut(job_id) {
      job.progress = progress;
      job.detail = detail.to_string();
      job.error = None;
      job.updated_at = timestamp_ms();
    }
  }
}

fn is_cancelled(jobs: &Arc<Mutex<HashMap<String, NativeRenderStatus>>>, job_id: &str) -> bool {
  jobs
    .lock()
    .ok()
    .and_then(|jobs| jobs.get(job_id).map(|job| job.status == "cancelled"))
    .unwrap_or(true)
}

fn timestamp_ms() -> u64 {
  std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .map(|duration| duration.as_millis() as u64)
    .unwrap_or_default()
}
