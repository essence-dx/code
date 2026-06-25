use std::{
  collections::HashMap,
  path::Path,
};

#[derive(Clone, Copy, PartialEq)]
pub enum NativeMediaKind {
  Video,
  Image,
  Audio,
}

#[derive(Clone)]
pub struct NativeMediaInput {
  pub kind: NativeMediaKind,
  pub path: String,
  pub timing: LayerTiming,
  pub trim_start: f64,
  pub source_duration: f64,
  pub speed: LayerSpeed,
  pub rect: Option<LayerRect>,
  pub volume: f64,
  pub fade_in: f64,
  pub fade_out: f64,
}

#[derive(Clone, Copy)]
pub struct LayerRect {
  pub x: i64,
  pub y: i64,
  pub width: i64,
  pub height: i64,
}

#[derive(Clone, Copy)]
pub struct LayerTiming {
  pub start: f64,
  pub end: f64,
}

impl LayerTiming {
  pub fn duration(self) -> f64 {
    (self.end - self.start).max(0.001)
  }
}

#[derive(Clone, Copy)]
pub struct LayerSpeed {
  pub playback_rate: f64,
  pub reversed: bool,
  pub preserve_pitch: bool,
  pub ramp_enabled: bool,
  pub ramp_start_rate: f64,
  pub ramp_end_rate: f64,
}

pub fn native_media_inputs(render_graph: &serde_json::Value, app_local_data_dir: Option<&Path>) -> Vec<NativeMediaInput> {
  let media = render_graph
    .get("media")
    .and_then(|value| value.as_array())
    .into_iter()
    .flatten()
    .filter_map(|asset| {
      let id = asset.get("id").and_then(|value| value.as_str())?;
      Some((id, asset))
    })
    .collect::<HashMap<_, _>>();
  let canvas = render_graph.get("canvas");
  let canvas_width = canvas.and_then(|value| json_number(value.get("width"))).unwrap_or(1920.0);
  let canvas_height = canvas.and_then(|value| json_number(value.get("height"))).unwrap_or(1080.0);

  render_graph
    .get("layers")
    .and_then(|layers| layers.as_array())
    .into_iter()
    .flatten()
    .filter_map(|layer| {
      let asset_id = layer.get("assetId").and_then(|value| value.as_str())?;
      let asset = media.get(asset_id)?;
      let kind = native_media_kind(layer.get("kind").and_then(|value| value.as_str())?)?;
      if kind == NativeMediaKind::Audio && layer.get("muted").and_then(|value| value.as_bool()).unwrap_or(false) {
        return None;
      }
      let path = resolve_media_path(asset, app_local_data_dir)?;
      let timing = layer_timing(layer);
      let speed = layer_speed(layer);
      Some(NativeMediaInput {
        kind,
        path,
        timing,
        trim_start: layer
          .get("timing")
          .and_then(|value| json_number(value.get("trimStart")))
          .unwrap_or(0.0)
          .max(0.0),
        source_duration: source_duration(layer, timing, speed, kind),
        speed,
        rect: if kind == NativeMediaKind::Audio {
          None
        } else {
          layer_rect(layer, canvas_width, canvas_height)
        },
        volume: json_number(layer.get("volume")).unwrap_or(1.0).clamp(0.0, 4.0),
        fade_in: json_number(layer.get("fadeIn")).unwrap_or(0.0).max(0.0),
        fade_out: json_number(layer.get("fadeOut")).unwrap_or(0.0).max(0.0),
      })
    })
    .collect()
}

pub fn append_media_inputs(args: &mut Vec<String>, media_inputs: &[NativeMediaInput]) {
  for input in media_inputs {
    append_media_input(args, input);
  }
}

pub fn filter_complex_graph(
  media_inputs: &[NativeMediaInput],
  layer_filtergraph: Option<&str>,
  include_audio: bool,
) -> Option<String> {
  if media_inputs.is_empty() && layer_filtergraph.is_none() {
    return None;
  }

  let mut segments = Vec::new();
  let mut current_video = "[0:v]".to_string();
  let mut visual_index = 0usize;

  for (input_index, input) in media_inputs.iter().enumerate() {
    if !matches!(input.kind, NativeMediaKind::Video | NativeMediaKind::Image) {
      continue;
    }
    let Some(rect) = input.rect else {
      continue;
    };
    let source_index = input_index + 1;
    let media_label = format!("[media{visual_index}]");
    let next_video = format!("[v{visual_index}]");
    let speed_filters = video_speed_filters(input);
    segments.push(format!(
      "[{source_index}:v]{speed_filters},scale={}:{}:force_original_aspect_ratio=decrease,pad={}:{}:(ow-iw)/2:(oh-ih)/2,setsar=1{}",
      rect.width, rect.height, rect.width, rect.height, media_label
    ));
    segments.push(format!(
      "{}{}overlay=x={}:y={}:enable='between(t,{:.3},{:.3})'{}",
      current_video, media_label, rect.x, rect.y, input.timing.start, input.timing.end, next_video
    ));
    current_video = next_video;
    visual_index += 1;
  }

  if let Some(layer_filtergraph) = layer_filtergraph {
    segments.push(format!("{current_video}{layer_filtergraph}[vout]"));
  } else if current_video != "[0:v]" {
    segments.push(format!("{current_video}copy[vout]"));
  } else {
    segments.push("[0:v]copy[vout]".to_string());
  }

  if include_audio {
    if let Some(audio) = audio_filtergraph(media_inputs, 1) {
      segments.push(audio);
    }
  }

  Some(segments.join(";"))
}

pub fn audio_filtergraph(media_inputs: &[NativeMediaInput], input_offset: usize) -> Option<String> {
  let audio_inputs = media_inputs
    .iter()
    .enumerate()
    .filter(|(_, input)| input.kind == NativeMediaKind::Audio)
    .collect::<Vec<_>>();
  if audio_inputs.is_empty() {
    return None;
  }

  let mut segments = Vec::new();
  let mut labels = Vec::new();
  for (audio_index, (media_index, input)) in audio_inputs.iter().enumerate() {
    let source_index = media_index + input_offset;
    let label = format!("[a{audio_index}]");
    labels.push(label.clone());
    let delay_ms = (input.timing.start * 1000.0).round().max(0.0) as u64;
    let fade_out_start = (input.timing.duration() - input.fade_out).max(0.0);
    let mut filters = format!(
      "[{source_index}:a]atrim=0:{},asetpts=PTS-STARTPTS",
      seconds(input.source_duration),
    );
    if input.speed.reversed {
      filters.push_str(",areverse");
    }
    for filter in audio_speed_filters(input.speed) {
      filters.push(',');
      filters.push_str(&filter);
    }
    filters.push_str(&format!(
      ",atrim=0:{},asetpts=PTS-STARTPTS,adelay={delay_ms}|{delay_ms},volume={:.3}",
      seconds(input.timing.duration()),
      input.volume
    ));
    if input.fade_in > 0.0 {
      filters.push_str(&format!(",afade=t=in:st=0:d={}", seconds(input.fade_in.min(input.timing.duration()))));
    }
    if input.fade_out > 0.0 {
      filters.push_str(&format!(
        ",afade=t=out:st={}:d={}",
        seconds(fade_out_start),
        seconds(input.fade_out.min(input.timing.duration()))
      ));
    }
    filters.push_str(&label);
    segments.push(filters);
  }

  segments.push(format!(
    "{}amix=inputs={}:duration=longest:normalize=0[aout]",
    labels.join(""),
    labels.len()
  ));

  Some(segments.join(";"))
}

pub fn has_audio_inputs(media_inputs: &[NativeMediaInput]) -> bool {
  media_inputs.iter().any(|input| input.kind == NativeMediaKind::Audio)
}

pub fn format_supports_audio(format: &str) -> bool {
  matches!(format, "mp4" | "webm" | "mov" | "avi" | "mpeg" | "wav" | "mp3" | "m4a")
}

pub fn native_layer_filtergraph(render_graph: &serde_json::Value, app_local_data_dir: Option<&Path>) -> Option<String> {
  let canvas = render_graph.get("canvas")?;
  let canvas_width = json_number(canvas.get("width")).unwrap_or(1920.0);
  let canvas_height = json_number(canvas.get("height")).unwrap_or(1080.0);
  let fonts = native_font_files(render_graph, app_local_data_dir);
  let filters = render_graph
    .get("layers")
    .and_then(|layers| layers.as_array())
    .into_iter()
    .flatten()
    .filter_map(|layer| layer_filter(layer, canvas_width, canvas_height, &fonts))
    .collect::<Vec<_>>();

  if filters.is_empty() {
    None
  } else {
    Some(filters.join(","))
  }
}

pub fn ffmpeg_color_from_graph(render_graph: &serde_json::Value) -> String {
  if render_graph
    .get("canvas")
    .and_then(|canvas| canvas.get("transparentBackground"))
    .and_then(|value| value.as_bool())
    .unwrap_or(false)
  {
    return "0x000000@0.000".to_string();
  }

  render_graph
    .get("canvas")
    .and_then(|canvas| canvas.get("background"))
    .and_then(|background| background.as_str())
    .map(|value| ffmpeg_color(Some(value), 1.0, "0x111827"))
    .unwrap_or_else(|| "0x111827".to_string())
}

fn append_media_input(args: &mut Vec<String>, input: &NativeMediaInput) {
  match input.kind {
    NativeMediaKind::Image => args.extend([
      "-loop".to_string(),
      "1".to_string(),
      "-t".to_string(),
      seconds(input.timing.duration()),
      "-i".to_string(),
      input.path.clone(),
    ]),
    NativeMediaKind::Video | NativeMediaKind::Audio => args.extend([
      "-ss".to_string(),
      seconds(input.trim_start),
      "-t".to_string(),
      seconds(input.source_duration),
      "-i".to_string(),
      input.path.clone(),
    ]),
  }
}

fn native_font_files(render_graph: &serde_json::Value, app_local_data_dir: Option<&Path>) -> HashMap<String, String> {
  render_graph
    .get("fonts")
    .and_then(|fonts| fonts.as_array())
    .into_iter()
    .flatten()
    .filter_map(|font| {
      let family = font.get("family").and_then(|value| value.as_str())?.trim();
      if family.is_empty() {
        return None;
      }

      resolve_media_path(font, app_local_data_dir).map(|path| (family.to_string(), path))
    })
    .collect()
}

fn video_speed_filters(input: &NativeMediaInput) -> String {
  if input.kind == NativeMediaKind::Image {
    return format!("setpts=PTS-STARTPTS+{:.6}/TB", input.timing.start.max(0.0));
  }

  let mut filters = Vec::new();
  if input.speed.reversed {
    filters.push("reverse".to_string());
  }
  filters.push(video_pts_filter(input));
  filters.join(",")
}

fn video_pts_filter(input: &NativeMediaInput) -> String {
  let duration = input.timing.duration();
  let start = input.timing.start.max(0.0);
  if input.speed.ramp_enabled && (input.speed.ramp_end_rate - input.speed.ramp_start_rate).abs() >= 0.001 {
    let start_rate = input.speed.ramp_start_rate.max(0.001);
    let delta = input.speed.ramp_end_rate - input.speed.ramp_start_rate;
    return format!(
      "setpts='(({duration:.6}*(-{start_rate:.6}+sqrt({start_rate:.6}*{start_rate:.6}+2*{delta:.6}*T/{duration:.6}))/{delta:.6})+{start:.6})/TB'"
    );
  }

  format!("setpts=(PTS-STARTPTS)/{:.6}+{start:.6}/TB", input.speed.playback_rate.max(0.001))
}

fn audio_speed_filters(speed: LayerSpeed) -> Vec<String> {
  let mut playback_rate = speed.playback_rate.max(0.001);
  if speed.ramp_enabled {
    playback_rate = ((speed.ramp_start_rate + speed.ramp_end_rate) / 2.0).max(0.001);
  }

  let mut filters = Vec::new();
  if (playback_rate - 1.0).abs() < 0.001 {
    return filters;
  }

  if speed.preserve_pitch {
    let mut remaining = playback_rate;
    while remaining > 2.0 {
      filters.push("atempo=2.000".to_string());
      remaining /= 2.0;
    }
    while remaining < 0.5 {
      filters.push("atempo=0.500".to_string());
      remaining /= 0.5;
    }
    filters.push(format!("atempo={remaining:.3}"));
  } else {
    let pitched_sample_rate = (44100.0 * playback_rate).round().clamp(8000.0, 384000.0) as u32;
    filters.push(format!("asetrate={pitched_sample_rate}"));
    filters.push("aresample=44100".to_string());
  }

  filters
}

fn native_media_kind(kind: &str) -> Option<NativeMediaKind> {
  match kind {
    "video" => Some(NativeMediaKind::Video),
    "image" => Some(NativeMediaKind::Image),
    "audio" => Some(NativeMediaKind::Audio),
    _ => None,
  }
}

fn resolve_media_path(asset: &serde_json::Value, app_local_data_dir: Option<&Path>) -> Option<String> {
  let source = asset.get("source").and_then(|value| value.as_str())?;
  let storage_key = asset.get("storageKey").and_then(|value| value.as_str())?.trim();
  if storage_key.is_empty() {
    return None;
  }

  if source == "self-hosted-url" && (storage_key.starts_with("http://") || storage_key.starts_with("https://")) {
    return Some(storage_key.to_string());
  }

  if let Some(file_path) = storage_key.strip_prefix("file://") {
    return Some(file_path.to_string());
  }

  if source == "tauri-fs" {
    let path = Path::new(storage_key);
    if path.is_absolute() {
      return Some(storage_key.to_string());
    }

    return app_local_data_dir.map(|dir| dir.join(storage_key).to_string_lossy().to_string());
  }

  None
}

fn layer_filter(
  layer: &serde_json::Value,
  canvas_width: f64,
  canvas_height: f64,
  fonts: &HashMap<String, String>,
) -> Option<String> {
  let kind = layer.get("kind").and_then(|value| value.as_str())?;
  match kind {
    "text" | "subtitle" | "timer" => text_layer_filter(layer, canvas_width, canvas_height, fonts),
    "shape" | "sticker" => box_layer_filter(layer, canvas_width, canvas_height, false),
    "progress" => box_layer_filter(layer, canvas_width, canvas_height, true),
    _ => None,
  }
}

fn text_layer_filter(
  layer: &serde_json::Value,
  canvas_width: f64,
  canvas_height: f64,
  fonts: &HashMap<String, String>,
) -> Option<String> {
  let rect = layer_rect(layer, canvas_width, canvas_height)?;
  let timing = layer_timing(layer);
  let style = layer.get("style")?;
  let opacity = json_number(style.get("opacity")).unwrap_or(1.0).clamp(0.0, 1.0);
  let text = layer
    .get("text")
    .and_then(|value| value.as_str())
    .or_else(|| layer.get("name").and_then(|value| value.as_str()))
    .unwrap_or("Text");
  let fill = ffmpeg_color(style.get("fill").and_then(|value| value.as_str()), opacity, "0xffffff");
  let background = ffmpeg_color(style.get("background").and_then(|value| value.as_str()), opacity, "0x000000@0");
  let font_size = json_number(style.get("fontSize")).unwrap_or(42.0).clamp(8.0, 320.0).round() as u32;
  let mut filter = format!(
    "drawtext=text='{}':x={}:y={}:fontsize={}:fontcolor={}:enable='between(t,{:.3},{:.3})'",
    escape_filter_text(text),
    rect.x,
    rect.y,
    font_size,
    fill,
    timing.start,
    timing.end
  );

  if let Some(font_file) = style
    .get("fontFamily")
    .and_then(|value| value.as_str())
    .and_then(|family| fonts.get(family.trim()))
  {
    filter.push_str(&format!(":fontfile='{}'", escape_filter_path(font_file)));
  }

  if color_is_visible(&background) {
    filter.push_str(&format!(":box=1:boxcolor={background}:boxborderw=12"));
  }

  Some(filter)
}

fn box_layer_filter(
  layer: &serde_json::Value,
  canvas_width: f64,
  canvas_height: f64,
  use_fill_color: bool,
) -> Option<String> {
  let rect = layer_rect(layer, canvas_width, canvas_height)?;
  let timing = layer_timing(layer);
  let style = layer.get("style")?;
  let opacity = json_number(style.get("opacity")).unwrap_or(1.0).clamp(0.0, 1.0);
  let color_key = if use_fill_color { "fill" } else { "background" };
  let color = style
    .get(color_key)
    .and_then(|value| value.as_str())
    .or_else(|| style.get("fill").and_then(|value| value.as_str()));
  let color = ffmpeg_color(color, opacity, "0x38bdf8");

  Some(format!(
    "drawbox=x={}:y={}:w={}:h={}:color={}:t=fill:enable='between(t,{:.3},{:.3})'",
    rect.x, rect.y, rect.width, rect.height, color, timing.start, timing.end
  ))
}

fn layer_rect(layer: &serde_json::Value, canvas_width: f64, canvas_height: f64) -> Option<LayerRect> {
  let transform = layer.get("transform")?;
  let scale = json_number(transform.get("scale")).unwrap_or(1.0).max(0.01);
  let width = json_number(transform.get("width")).unwrap_or(canvas_width).mul_add(scale, 0.0).max(1.0);
  let height = json_number(transform.get("height")).unwrap_or(canvas_height).mul_add(scale, 0.0).max(1.0);
  let center_x = layer_position(json_number(transform.get("x")).unwrap_or(0.5), canvas_width);
  let center_y = layer_position(json_number(transform.get("y")).unwrap_or(0.5), canvas_height);

  Some(LayerRect {
    x: (center_x - width / 2.0).round() as i64,
    y: (center_y - height / 2.0).round() as i64,
    width: width.round() as i64,
    height: height.round() as i64,
  })
}

fn layer_position(value: f64, canvas_size: f64) -> f64 {
  if (-1.0..=1.0).contains(&value) {
    value * canvas_size
  } else {
    value
  }
}

fn layer_timing(layer: &serde_json::Value) -> LayerTiming {
  let timing = layer.get("timing");
  let start = timing
    .and_then(|value| json_number(value.get("start")))
    .unwrap_or(0.0)
    .max(0.0);
  let duration = timing
    .and_then(|value| json_number(value.get("duration")))
    .unwrap_or(1.0)
    .max(0.001);

  LayerTiming {
    start,
    end: start + duration,
  }
}

fn layer_speed(layer: &serde_json::Value) -> LayerSpeed {
  let timing = layer.get("timing");
  let speed = timing.and_then(|value| value.get("speed"));
  let ramp = speed.and_then(|value| value.get("ramp"));
  let playback_rate = timing
    .and_then(|value| json_number(value.get("playbackRate")))
    .unwrap_or(1.0)
    .clamp(0.001, 16.0);
  let ramp_start_rate = ramp
    .and_then(|value| json_number(value.get("startRate")))
    .unwrap_or(playback_rate)
    .clamp(0.001, 16.0);
  let ramp_end_rate = ramp
    .and_then(|value| json_number(value.get("endRate")))
    .unwrap_or(playback_rate)
    .clamp(0.001, 16.0);

  LayerSpeed {
    playback_rate,
    reversed: speed.and_then(|value| value.get("reversed")).and_then(|value| value.as_bool()).unwrap_or(false),
    preserve_pitch: speed
      .and_then(|value| value.get("preservePitch"))
      .and_then(|value| value.as_bool())
      .unwrap_or(true),
    ramp_enabled: ramp
      .and_then(|value| value.get("enabled"))
      .and_then(|value| value.as_bool())
      .unwrap_or(false),
    ramp_start_rate,
    ramp_end_rate,
  }
}

fn source_duration(layer: &serde_json::Value, timing: LayerTiming, speed: LayerSpeed, kind: NativeMediaKind) -> f64 {
  if kind == NativeMediaKind::Image {
    return timing.duration();
  }

  layer
    .get("timing")
    .and_then(|value| json_number(value.get("sourceDuration")))
    .unwrap_or_else(|| {
      if speed.ramp_enabled {
        ((speed.ramp_start_rate + speed.ramp_end_rate) / 2.0) * timing.duration()
      } else {
        speed.playback_rate * timing.duration()
      }
    })
    .max(0.001)
}

fn ffmpeg_color(value: Option<&str>, opacity: f64, fallback: &str) -> String {
  let Some(value) = value.map(str::trim) else {
    return fallback.to_string();
  };

  if value.eq_ignore_ascii_case("transparent") {
    return "0x000000@0.000".to_string();
  }

  let hex = value.trim_start_matches('#');
  let (rgb, alpha) = match hex.len() {
    6 if hex.chars().all(|character| character.is_ascii_hexdigit()) => (hex.to_string(), 1.0),
    8 if hex.chars().all(|character| character.is_ascii_hexdigit()) => {
      let rgb = hex[0..6].to_string();
      let alpha = u8::from_str_radix(&hex[6..8], 16)
        .map(|value| f64::from(value) / 255.0)
        .unwrap_or(1.0);
      (rgb, alpha)
    }
    _ => return fallback.to_string(),
  };

  let alpha = (alpha * opacity.clamp(0.0, 1.0)).clamp(0.0, 1.0);
  if alpha >= 0.999 {
    format!("0x{rgb}")
  } else {
    format!("0x{rgb}@{alpha:.3}")
  }
}

fn json_number(value: Option<&serde_json::Value>) -> Option<f64> {
  value.and_then(|value| value.as_f64()).filter(|value| value.is_finite())
}

fn seconds(value: f64) -> String {
  format!("{:.3}", value.max(0.0))
}

fn color_is_visible(value: &str) -> bool {
  !matches!(value.rsplit_once('@'), Some((_, "0" | "0.000")))
}

fn escape_filter_text(value: &str) -> String {
  value
    .replace('\\', "\\\\")
    .replace('\n', " ")
    .replace('\r', " ")
    .replace('\'', "\\'")
    .replace(':', "\\:")
    .replace('%', "\\%")
    .replace('[', "\\[")
    .replace(']', "\\]")
    .replace(',', "\\,")
}

fn escape_filter_path(value: &str) -> String {
  value
    .replace('\\', "/")
    .replace('\'', "\\'")
    .replace(':', "\\:")
    .replace('%', "\\%")
    .replace('[', "\\[")
    .replace(']', "\\]")
    .replace(',', "\\,")
}
