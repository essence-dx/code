import re

with open('crates/web_preview/src/server.rs', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace start_axum_static_server_for_tool
old_code = """fn start_axum_static_server_for_tool(tool: String, root: PathBuf) -> Option<u16> {
    let s = axum::Server::bind(&"127.0.0.1:0".parse().unwrap());
    let port = s.local_addr().port();
    
    let root_arc = Arc::new(root);"""

new_code = """fn start_axum_static_server_for_tool(tool: String, root: PathBuf) -> Option<u16> {
    let listener = std::net::TcpListener::bind("127.0.0.1:0").ok()?;
    let port = listener.local_addr().ok()?.port();
    
    let root_arc = Arc::new(root);"""

text = text.replace(old_code, new_code)

old_serve = """            let rt = tokio::runtime::Runtime::new().expect("failed to create tokio runtime for axum");
            rt.block_on(async move {
                if let Err(e) = s.serve(app.into_make_service()).await {
                    eprintln!("dx preview axum server error for {}: {}", tool, e);
                }
            });"""

new_serve = """            let rt = tokio::runtime::Runtime::new().expect("failed to create tokio runtime for axum");
            rt.block_on(async move {
                if let Ok(server) = axum::Server::from_tcp(listener) {
                    if let Err(e) = server.serve(app.into_make_service()).await {
                        eprintln!("dx preview axum server error for {}: {}", tool, e);
                    }
                }
            });"""

text = text.replace(old_serve, new_serve)

with open('crates/web_preview/src/server.rs', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced!")
