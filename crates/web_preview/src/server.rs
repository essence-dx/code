use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::atomic::{AtomicU16, AtomicU64, Ordering},
    sync::{Arc, OnceLock},
    thread,
};

use assets::Assets;
use axum::{
    body::Body,
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path as AxumPath,
    },
    http::{header::CONTENT_TYPE, StatusCode},
    response::IntoResponse,
    routing::get,
    Router,
};
use futures::stream::StreamExt;
use futures::SinkExt;
use gpui::AssetSource;
use tiny_http::{Header, Response, Server};
use tokio::runtime::Runtime;
use tokio::sync::broadcast;
use tracing::{error, info, warn};

const DX_PREVIEW_PORT: u16 = 3737;

/// Maximum concurrent WebSocket connections for the agent cursor relay.
const MAX_WS_CONNECTIONS: usize = 16;

/// Maximum size of a single WebSocket message in bytes (1 MB).
const MAX_WS_MESSAGE_BYTES: usize = 1 << 20;

/// Actual port in use (fixed or fallback). Updated by the server starter.
static DX_PREVIEW_ACTUAL_PORT: AtomicU16 = AtomicU16::new(0);

/// Get or create a shared multi-threaded Tokio runtime for all async tasks
/// in this module (static file servers, WS relay, etc.).
fn shared_tokio_runtime() -> &'static Runtime {
    static RT: OnceLock<Runtime> = OnceLock::new();
    RT.get_or_init(|| Runtime::new().expect("failed to create shared tokio runtime"))
}

/// Maps a DX web tool id (as used by the chat-input logo strip and the
/// `OpenWebPreview` action) to the on-disk project directory name under the
/// DX web root. The directory names are matched case-insensitively, so this
/// table only needs to exist for ids whose folder name differs from the id.
fn project_dir_name(tool_id: &str) -> &str {
    match tool_id {
        "3d" => "3d",
        "design" => "Design",
        "graphics" => "Graphics",
        "presentations" => "Presentations",
        "spreadsheets" => "Spreadsheets",
        "video" => "Video",
        "music" => "Music",
        "whiteboard" => "whiteboard",
        "shader" => "shader",
        other => other,
    }
}

/// Discover the DX web root: the directory that contains the bundled web tool
/// projects (`shader`, `whiteboard`, the Next.js apps, ...). Each project is
/// expected to expose its static output under `<project>/.dx/www/output`.
///
/// Resolution order:
/// 1. `DX_WEB_ROOT` environment override.
/// 2. A `web` directory found by walking ancestors of the current dir and the
///    running executable (also checking `<ancestor>/web` and
///    `<ancestor>/code/web`).
/// 3. The `G:\Dx\code\web` fallback used by the canonical DX dev layout.
fn find_dx_web_root() -> Option<PathBuf> {
    if let Ok(env) = std::env::var("DX_WEB_ROOT") {
        let p = PathBuf::from(env);
        if is_dx_web_root(&p) {
            return Some(p);
        }
    }

    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd);
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.push(parent.to_path_buf());
        }
    }

    for start in candidates {
        let mut dir = Some(start.as_path());
        while let Some(d) = dir {
            if is_dx_web_root(d) {
                return Some(d.to_path_buf());
            }
            for nested in [d.join("web"), d.join("code").join("web")] {
                if is_dx_web_root(&nested) {
                    return Some(nested);
                }
            }
            dir = d.parent();
        }
    }

    let fallback = PathBuf::from(r"G:\Dx\code\web");
    if is_dx_web_root(&fallback) {
        return Some(fallback);
    }

    None
}

fn is_dx_web_root(p: &Path) -> bool {
    p.is_dir() && (p.join("shader").is_dir() || p.join("whiteboard").is_dir())
}

fn web_root() -> Option<&'static Path> {
    static WEB_ROOT: OnceLock<Option<PathBuf>> = OnceLock::new();
    WEB_ROOT
        .get_or_init(find_dx_web_root)
        .as_deref()
}

/// Resolve the static output directory for a tool id, matching the project
/// folder case-insensitively and requiring a built `index.html`.
fn project_output_dir(tool_id: &str) -> Option<PathBuf> {
    let wanted = project_dir_name(tool_id);

    // Per task: support professional folders with built static exports (HTML/CSS/JS from next export)
    // copied to assets/web/<professional-name>/ (index.html directly under it). These take precedence
    // for the 7 nextjs projects so clicking their icons in AI input opens webpreview to localhost url
    // serving the copied static (served at own origin for asset paths).
    if let Some(assets_root) = find_assets_web_root() {
        let mut p = assets_root.join(wanted);
        if p.join("index.html").is_file() {
            return Some(p);
        }
        // case-insensitive
        if let Ok(rd) = std::fs::read_dir(&assets_root) {
            if let Some(found) = rd.flatten().map(|e| e.path()).find(|pp| {
                pp.is_dir()
                    && pp.file_name().and_then(|n| n.to_str()).is_some_and(|n| n.eq_ignore_ascii_case(wanted))
                    && pp.join("index.html").is_file()
            }) {
                return Some(found);
            }
        }
    }

    // Original: for 2 www framework (whiteboard/shader) and any built inside web sources under <name>/.dx/www/output
    let root = web_root()?;
    let mut project_dir = root.join(wanted);
    if !project_dir.is_dir() {
        project_dir = std::fs::read_dir(root)
            .ok()?
            .flatten()
            .map(|entry| entry.path())
            .find(|path| {
                path.is_dir()
                    && path
                        .file_name()
                        .and_then(|name| name.to_str())
                        .is_some_and(|name| name.eq_ignore_ascii_case(wanted))
            })?;
    }

    let output_dir = project_dir.join(".dx").join("www").join("output");
    output_dir.join("index.html").is_file().then_some(output_dir)
}

/// Find assets/web professional static outputs root (for copied nextjs exports).
/// Walks similar to web root, prefers <cwd>/assets/web , exe parent/assets/web , G:\Dx\code\assets\web
fn find_assets_web_root() -> Option<PathBuf> {
    if let Ok(env) = std::env::var("DX_ASSETS_WEB_ROOT") {
        let p = PathBuf::from(env);
        if p.is_dir() { return Some(p); }
    }

    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.join("assets").join("web"));
        candidates.push(cwd);
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.push(parent.join("assets").join("web"));
            candidates.push(parent.to_path_buf());
        }
    }

    for start in candidates {
        let mut dir = Some(start.as_path());
        while let Some(d) = dir {
            let candidate = d.join("assets").join("web");
            if candidate.is_dir() && has_output_subdirs(&candidate) {
                return Some(candidate);
            }
            // Also check if `start` itself is assets/web
            if d.file_name().map_or(false, |n| n == "web")
                && d.parent().map_or(false, |pp| pp.file_name().map_or(false, |n| n == "assets"))
                && has_output_subdirs(d)
            {
                return Some(d.to_path_buf());
            }
            dir = d.parent();
        }
    }

    // fallback
    let fb = PathBuf::from(r"G:\Dx\code\assets\web");
    if fb.is_dir() { Some(fb) } else { None }
}

fn has_output_subdirs(p: &Path) -> bool {
    std::fs::read_dir(p).map_or(false, |rd| {
        rd.flatten()
            .any(|e| e.path().is_dir() && e.path().join("index.html").is_file())
    })
}

#[derive(Default)]
struct ProjectServers {
    ports: HashMap<String, u16>,
}

static PROJECT_SERVERS: std::sync::LazyLock<std::sync::Mutex<ProjectServers>> =
    std::sync::LazyLock::new(|| std::sync::Mutex::new(ProjectServers::default()));

fn lock_project_servers() -> std::sync::MutexGuard<'static, ProjectServers> {
    PROJECT_SERVERS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
}

pub fn local_preview_url(tool_id: &str) -> Option<String> {
    let mut servers = lock_project_servers();
    if let Some(&port) = servers.ports.get(tool_id) {
        return Some(format!("http://127.0.0.1:{}/", port));
    }

    let root = match project_output_dir(tool_id) {
        Some(r) => r,
        None => {
            warn!(tool = tool_id, "no output directory for tool");
            return None;
        }
    };
    match start_axum_static_server_for_tool(tool_id.to_string(), root) {
        Some(port) => {
            servers.ports.insert(tool_id.to_string(), port);
            Some(format!("http://127.0.0.1:{}/", port))
        }
        None => {
            warn!(tool = tool_id, "failed to start static file server");
            None
        }
    }
}

pub fn ensure_dx_preview_server_running() {
    static STARTED: OnceLock<()> = OnceLock::new();
    STARTED.get_or_init(|| {
        start_agent_cursor_ws_relay();
        let ids = [
            "design", "graphics", "presentations", "spreadsheets", "video", "music",
            "whiteboard", "3d", "shader", "dx-web",
        ];
        for id in ids {
            let _ = local_preview_url(id);
        }
    });
}

/// Tracks the number of active WebSocket connections for rate-limiting purposes.
static WS_ACTIVE_CONNECTIONS: AtomicU64 = AtomicU64::new(0);
static WS_CONN_ID: AtomicU64 = AtomicU64::new(0);

/// Start a shared WebSocket relay for the agent cursor system.
/// AI agents connect here and send JSON commands; the server relays
/// them to all connected browser clients.
/// Port is configured via `AGENT_CURSOR_PORT` env var (default: 3001).
pub fn start_agent_cursor_ws_relay() -> Option<u16> {
    static STARTED: OnceLock<Option<u16>> = OnceLock::new();
    *STARTED.get_or_init(|| start_agent_cursor_ws_relay_inner())
}

fn start_agent_cursor_ws_relay_inner() -> Option<u16> {
    let port: u16 = std::env::var("AGENT_CURSOR_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3001);

    let addr = format!("127.0.0.1:{}", port);
    let listener = match std::net::TcpListener::bind(&addr) {
        Ok(l) => l,
        Err(e) => {
            error!(%e, port, "failed to bind agent cursor WS relay");
            return None;
        }
    };
    let actual_port = listener.local_addr().ok()?.port();

    let (tx, _) = broadcast::channel::<String>(256);

    let app = Router::new().route(
        "/",
        get({
            let tx = tx.clone();
            move |ws: WebSocketUpgrade| async move {
                ws.on_upgrade(move |socket| handle_agent_cursor_ws(socket, tx.clone()))
            }
        }),
    );

    let rt = shared_tokio_runtime();
    thread::Builder::new()
        .name("agent-cursor-ws-relay".to_string())
        .spawn(move || {
            rt.block_on(async move {
                info!(
                    port = actual_port,
                    "agent cursor relay listening"
                );
                if let Ok(server) = axum::Server::from_tcp(listener) {
                    if let Err(e) = server.serve(app.into_make_service()).await {
                        error!(%e, "agent cursor relay server error");
                    }
                }
            });
        })
        .ok()?;

    Some(actual_port)
}

async fn handle_agent_cursor_ws(socket: WebSocket, tx: broadcast::Sender<String>) {
    let conn_id = WS_CONN_ID.fetch_add(1, Ordering::Relaxed);
    let active = WS_ACTIVE_CONNECTIONS.fetch_add(1, Ordering::Relaxed) + 1;

    if active > MAX_WS_CONNECTIONS {
        warn!(conn_id, active, "dropping connection — too many concurrent connections");
        WS_ACTIVE_CONNECTIONS.fetch_sub(1, Ordering::Relaxed);
        return;
    }

    info!(conn_id, active, "agent cursor WS connected");

    let (mut write, read) = socket.split();
    let mut rx = tx.subscribe();
    let (pong_tx, mut pong_rx) = tokio::sync::mpsc::unbounded_channel::<String>();

    // Send welcome message
    let welcome = r#"{"type":"connected","message":"Agent cursor relay connected"}"#.to_string();
    let _ = write.send(Message::Text(welcome)).await;

    let read_task = tokio::spawn(async move {
        let mut read = read;
        while let Some(msg) = read.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if text.len() > MAX_WS_MESSAGE_BYTES {
                        warn!(
                            conn_id,
                            size = text.len(),
                            "dropping oversized text message"
                        );
                        continue;
                    }
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&text) {
                        if parsed.get("type").and_then(|t| t.as_str()) == Some("ping") {
                            let _ = pong_tx.send(r#"{"type":"pong"}"#.to_string());
                        } else {
                            let _ = tx.send(text);
                        }
                    } else {
                        let _ = tx.send(text);
                    }
                }
                Ok(Message::Binary(data)) => {
                    if data.len() > MAX_WS_MESSAGE_BYTES {
                        warn!(
                            conn_id,
                            size = data.len(),
                            "dropping oversized binary message"
                        );
                        continue;
                    }
                    if let Ok(text) = String::from_utf8(data) {
                        let _ = tx.send(text);
                    }
                }
                Ok(Message::Close(_)) | Err(_) => break,
                _ => {}
            }
        }
    });

    let write_task = tokio::spawn(async move {
        loop {
            tokio::select! {
                msg = rx.recv() => {
                    match msg {
                        Ok(text) => {
                            if write.send(Message::Text(text)).await.is_err() {
                                break;
                            }
                        }
                        Err(broadcast::error::RecvError::Closed) => break,
                        Err(broadcast::error::RecvError::Lagged(n)) => {
                            warn!(conn_id, lagged = n, "dropped messages in WS broadcast");
                            continue;
                        }
                    }
                }
                Some(text) = pong_rx.recv() => {
                    if write.send(Message::Text(text)).await.is_err() {
                        break;
                    }
                }
            }
        }
    });

    let _ = tokio::join!(read_task, write_task);

    WS_ACTIVE_CONNECTIONS.fetch_sub(1, Ordering::Relaxed);
    info!(conn_id, "agent cursor WS disconnected");
}

fn start_axum_static_server_for_tool(tool: String, root: PathBuf) -> Option<u16> {
    let listener = std::net::TcpListener::bind("127.0.0.1:0").ok()?;
    let port = listener.local_addr().ok()?.port();

    let root_arc = Arc::new(root);

    let app = Router::new()
        .route("/", get({
            let root = root_arc.clone();
            let tool = tool.clone();
            move || async move {
                serve_dx_file_direct(root, tool.clone(), "index.html".to_string()).await
            }
        }))
        .route("/*path", get({
            let root = root_arc.clone();
            let tool = tool.clone();
            move |AxumPath(path): AxumPath<String>| async move {
                serve_dx_file_direct(root, tool.clone(), path).await
            }
        }))
        .fallback(get(|| async { (StatusCode::NOT_FOUND, "Not Found") }));

    let rt = shared_tokio_runtime();
    thread::Builder::new()
        .name(format!("dx-preview-{tool}"))
        .spawn(move || {
            rt.block_on(async move {
                info!(tool, port, "static file server started");
                if let Ok(server) = axum::Server::from_tcp(listener) {
                    if let Err(e) = server.serve(app.into_make_service()).await {
                        error!(tool, %e, "static file server error");
                    }
                }
            });
        })
        .ok()?;

    Some(port)
}

async fn serve_dx_file_direct(root: Arc<PathBuf>, tool: String, mut req_path: String) -> impl axum::response::IntoResponse {
    if req_path.is_empty() || req_path == "/" {
        req_path = "index.html".to_string();
    }
    if req_path.contains("..") || req_path.contains('\\') || req_path.contains(':') {
        return (StatusCode::BAD_REQUEST, "Invalid path").into_response();
    }

    let mut target = root.join(req_path.trim_start_matches('/'));
    if target.is_dir() {
        target = target.join("index.html");
    }

    if !target.is_file() {
        let idx = root.join("index.html");
        if idx.is_file() {
            target = idx;
        } else {
            let placeholder = placeholder_html(&tool);
            return axum::http::Response::builder()
                .header(CONTENT_TYPE, "text/html; charset=utf-8")
                .body(Body::from(placeholder))
                .unwrap()
                .into_response();
        }
    }

    match std::fs::read(&target) {
        Ok(bytes) => {
            let mime = mime_type_for(&target);
            axum::http::Response::builder()
                .header(CONTENT_TYPE, mime)
                .body(Body::from(bytes))
                .unwrap()
                .into_response()
        }
        Err(_) => (StatusCode::NOT_FOUND, "Not Found").into_response(),
    }
}

fn placeholder_html(tool: &str) -> String {
    let safe: String = tool
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    let safe = if safe.is_empty() { "tool".to_string() } else { safe };
    format!(
        r#"<!doctype html>
<html lang="en">
<head>
  <base href="/dx/{safe}/">
  <meta charset="utf-8">
  <title>{safe}</title>
  <style>
    body {{ margin:0; height:100vh; display:flex; align-items:center; justify-content:center; background:#0a0a0a; color:#aaa; font-family: system-ui, sans-serif; }}
    .box {{ text-align:center; }}
    h1 {{ font-weight:300; letter-spacing:1px; }}
    p {{ opacity:0.7; font-size:14px; }}
  </style>
</head>
<body>
  <div class="box">
    <h1>{safe}</h1>
    <p>DX web tool preview<br>Place your built static site (index.html + assets) under assets/web/{safe}/ or the project's .dx/www/output</p>
  </div>
</body>
</html>"#,
        tool, safe = safe
    )
}

fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            let hi = (bytes[i + 1] as char).to_digit(16);
            let lo = (bytes[i + 2] as char).to_digit(16);
            if let (Some(hi), Some(lo)) = (hi, lo) {
                out.push((hi * 16 + lo) as u8);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn mime_type_for(path: &Path) -> &'static str {
    let ext = path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    get_mime_type(&format!(".{ext}"))
}

/// Legacy embedded server that serves the bundled `assets/web` tree. Kept as a
/// fallback for callers (and the `OpenWebPreview` action) that still build
/// `http://127.0.0.1:<port>/<project>` URLs. New code should prefer
/// [`local_preview_url`], which serves each project at its own origin root.
pub fn start_embedded_web_server() -> u16 {
    let server = Server::http("127.0.0.1:0").unwrap();
    let port = server.server_addr().to_ip().unwrap().port();
    let server = Arc::new(server);

    let _ = thread::Builder::new()
        .name("dx-embedded-web-server".to_string())
        .spawn(move || {
        for request in server.incoming_requests() {
            let mut path = request.url().to_string();
            if let Some(idx) = path.find('?') {
                path = path[..idx].to_string();
            }
            path = path.trim_start_matches('/').to_string();

            let mut asset_path = format!("web/{}", path);
            let assets = Assets;

            let mut bytes_opt = assets.load(&asset_path).ok().flatten();

            if bytes_opt.is_none() {
                let index_path = format!("{}/index.html", asset_path.trim_end_matches('/'));
                if let Ok(Some(bytes)) = assets.load(&index_path) {
                    bytes_opt = Some(bytes);
                    asset_path = index_path;
                }
            }

            if let Some(bytes) = bytes_opt {
                let mime_type = get_mime_type(&asset_path);
                let response = Response::from_data(bytes.into_owned())
                    .with_status_code(200)
                    .with_header(
                        Header::from_bytes(&b"Content-Type"[..], mime_type.as_bytes()).unwrap(),
                    );
                let _ = request.respond(response);
            } else {
                let response = Response::empty(404);
                let _ = request.respond(response);
            }
        }
    });

    port
}

fn get_mime_type(path: &str) -> &'static str {
    if path.ends_with(".html") {
        "text/html; charset=utf-8"
    } else if path.ends_with(".css") {
        "text/css; charset=utf-8"
    } else if path.ends_with(".mjs") || path.ends_with(".js") {
        "application/javascript; charset=utf-8"
    } else if path.ends_with(".json") || path.ends_with(".map") {
        "application/json; charset=utf-8"
    } else if path.ends_with(".wasm") {
        "application/wasm"
    } else if path.ends_with(".svg") {
        "image/svg+xml"
    } else if path.ends_with(".png") {
        "image/png"
    } else if path.ends_with(".jpg") || path.ends_with(".jpeg") {
        "image/jpeg"
    } else if path.ends_with(".gif") {
        "image/gif"
    } else if path.ends_with(".webp") {
        "image/webp"
    } else if path.ends_with(".ico") {
        "image/x-icon"
    } else if path.ends_with(".woff2") {
        "font/woff2"
    } else if path.ends_with(".woff") {
        "font/woff"
    } else if path.ends_with(".ttf") {
        "font/ttf"
    } else if path.ends_with(".txt") {
        "text/plain; charset=utf-8"
    } else {
        "application/octet-stream"
    }
}
