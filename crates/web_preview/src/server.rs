use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{Arc, OnceLock},
    thread,
};

use assets::Assets;
use axum::{
    body::Body,
    extract::Path as AxumPath,
    http::{header::CONTENT_TYPE, StatusCode},
    response::IntoResponse,
    routing::get,
    Router,
};
use gpui::AssetSource;
use tiny_http::{Header, Response, Server};
use tokio::runtime::Runtime;

const DX_PREVIEW_PORT: u16 = 3737;
const DX_SLUG: &str = "dx";

/// Actual port in use (fixed or fallback). Updated by the server starter.
static DX_PREVIEW_ACTUAL_PORT: std::sync::atomic::AtomicU16 = std::sync::atomic::AtomicU16::new(0);

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
            if candidate.is_dir() {
                // has at least one sub with index or known
                if let Ok(rd) = std::fs::read_dir(&candidate) {
                    if rd.flatten().any(|e| {
                        let p = e.path();
                        p.is_dir() && p.join("index.html").is_file()
                    }) || candidate.join("design").is_dir() || candidate.join("whiteboard").is_dir() {
                        return Some(candidate);
                    }
                }
            }
            // also direct if the start itself is assets/web
            if d.file_name().map_or(false, |n| n == "web") && d.parent().map_or(false, |pp| pp.file_name().map_or(false, |n| n == "assets")) {
                if d.join("index.html").is_file() || std::fs::read_dir(d).map_or(false, |mut it| it.any(|e| e.map_or(false, |ee| ee.path().is_dir() && ee.path().join("index.html").is_file() ))) {
                    return Some(d.to_path_buf());
                }
            }
            dir = d.parent();
        }
    }

    // fallback
    let fb = PathBuf::from(r"G:\Dx\code\assets\web");
    if fb.is_dir() { Some(fb) } else { None }
}

#[derive(Default)]
struct ProjectServers {
    ports: HashMap<String, u16>,
}

static PROJECT_SERVERS: std::sync::LazyLock<std::sync::Mutex<ProjectServers>> = std::sync::LazyLock::new(|| std::sync::Mutex::new(ProjectServers::default()));

pub fn local_preview_url(tool_id: &str) -> Option<String> {
    let mut servers = PROJECT_SERVERS.lock().unwrap();
    if let Some(&port) = servers.ports.get(tool_id) {
        return Some(format!("http://127.0.0.1:{}/", port));
    }
    
    let root = project_output_dir(tool_id)?;
    if let Some(port) = start_axum_static_server_for_tool(tool_id.to_string(), root) {
        servers.ports.insert(tool_id.to_string(), port);
        Some(format!("http://127.0.0.1:{}/", port))
    } else {
        None
    }
}

pub fn ensure_dx_preview_server_running() {
    static STARTED: std::sync::OnceLock<()> = std::sync::OnceLock::new();
    STARTED.get_or_init(|| {
        let ids = [
            "design", "graphics", "presentations", "spreadsheets", "video", "music",
            "whiteboard", "3d", "shader", "dx-web",
        ];
        for id in ids {
            let _ = local_preview_url(id);
        }
    });
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
                serve_dx_file_direct(root, tool, "index.html".to_string()).await
            }
        }))
        .route("/*path", get({
            let root = root_arc.clone();
            let tool = tool.clone();
            move |AxumPath(path): AxumPath<String>| async move {
                serve_dx_file_direct(root, tool, path).await
            }
        }))
        .fallback(get(|| async { (StatusCode::NOT_FOUND, "Not Found") }));
        
    std::thread::Builder::new()
        .name(format!("dx-preview-{}", tool))
        .spawn(move || {
            let rt = tokio::runtime::Runtime::new().expect("failed to create tokio runtime for axum");
            rt.block_on(async move {
                if let Ok(server) = axum::Server::from_tcp(listener) {
                    if let Err(e) = server.serve(app.into_make_service()).await {
                        eprintln!("dx preview axum server error for {}: {}", tool, e);
                    }
                }
            });
        })
        .ok()?;
        
    Some(port)
}

async fn serve_dx_file_direct(root: Arc<PathBuf>, tool: String, mut req_path: String) -> impl axum::response::IntoResponse {
    use axum::body::Body;
    use axum::http::{header::CONTENT_TYPE, Response as AxumResponse};

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
    let safe: String = tool.chars().filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_').collect();
    format!(
        r#"<!doctype html>
<html lang="en">
<head>
  <base href="/dx/{}/">
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

/// Start a static file server bound to an ephemeral loopback port, serving the
/// contents of `root` (a project's `.dx/www/output` directory). Returns the
/// bound port.
fn start_static_file_server(root: PathBuf) -> Option<u16> {
    let server = Server::http("127.0.0.1:0").ok()?;
    let port = server.server_addr().to_ip()?.port();
    let server = Arc::new(server);
    let root = Arc::new(root);

    thread::Builder::new()
        .name(format!("dx-web-preview-{port}"))
        .spawn(move || {
            for request in server.incoming_requests() {
                let response = build_file_response(&root, request.url());
                let _ = request.respond(response);
            }
        })
        .ok()?;

    Some(port)
}

fn build_file_response(root: &Path, url: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let Some(path) = resolve_request_path(root, url) else {
        return Response::from_data(b"Not Found".to_vec()).with_status_code(404);
    };

    match std::fs::read(&path) {
        Ok(bytes) => {
            let mime = mime_type_for(&path);
            Response::from_data(bytes).with_status_code(200).with_header(
                Header::from_bytes(&b"Content-Type"[..], mime.as_bytes())
                    .expect("static content-type header is valid"),
            )
        }
        Err(_) => Response::from_data(b"Not Found".to_vec()).with_status_code(404),
    }
}

/// Map a request URL to a file under `root`, defending against path traversal
/// and falling back to `index.html` for directory requests.
fn resolve_request_path(root: &Path, url: &str) -> Option<PathBuf> {
    let mut path = url;
    if let Some(idx) = path.find(['?', '#']) {
        path = &path[..idx];
    }
    let decoded = percent_decode(path);
    let trimmed = decoded.trim_start_matches('/');

    // Reject traversal and absolute/parent components.
    let mut relative = PathBuf::new();
    for component in trimmed.split('/') {
        match component {
            "" | "." => continue,
            ".." => return None,
            other => {
                if other.contains('\\') || other.contains(':') {
                    return None;
                }
                relative.push(other);
            }
        }
    }

    let mut target = root.join(&relative);
    if target.is_dir() {
        target = target.join("index.html");
    }
    if target.is_file() {
        return Some(target);
    }

    // Directory-style or extensionless request that did not resolve to a file:
    // serve the project's root index.html so single-entry static apps still load.
    if relative.extension().is_none() {
        let index = root.join("index.html");
        if index.is_file() {
            return Some(index);
        }
    }

    None
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

    let server_clone = server.clone();
    thread::spawn(move || {
        for request in server_clone.incoming_requests() {
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
