import re

with open('crates/web_preview/src/server.rs', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace ensure_dx_preview_server_running and everything up to serve_dx_file
# Actually, I'll just find the line for `#[derive(Default)]`
start_idx = text.find('#[derive(Default)]\nstruct ProjectServers {')
end_idx = text.find('fn placeholder_html(tool: &str) -> String {')

if start_idx != -1 and end_idx != -1:
    new_code = """#[derive(Default)]
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
    let s = axum::Server::bind(&"127.0.0.1:0".parse().unwrap());
    let port = s.local_addr().port();
    
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
                if let Err(e) = s.serve(app.into_make_service()).await {
                    eprintln!("dx preview axum server error for {}: {}", tool, e);
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
    if req_path.contains("..") || req_path.contains('\\\\') || req_path.contains(':') {
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

"""
    text = text[:start_idx] + new_code + text[end_idx:]
    with open('crates/web_preview/src/server.rs', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced!")
else:
    print("Not found indices", start_idx, end_idx)
