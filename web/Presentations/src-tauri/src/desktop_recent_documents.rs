use crate::desktop_file_api::DesktopFilePermissionScope;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopRegisterRecentDocumentRequest {
    path: String,
    permission_scope: DesktopFilePermissionScope,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopRegisterRecentDocumentResponse {
    file_name: String,
    path: String,
    permission_scope: DesktopFilePermissionScope,
    platform: &'static str,
    status: &'static str,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopRecentDocumentApiError {
    code: &'static str,
    message: String,
}

type DesktopRecentDocumentApiResult<T> = Result<T, DesktopRecentDocumentApiError>;

impl DesktopRecentDocumentApiError {
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

#[tauri::command]
pub fn desktop_register_recent_document(
    request: DesktopRegisterRecentDocumentRequest,
) -> DesktopRecentDocumentApiResult<DesktopRegisterRecentDocumentResponse> {
    let path = validate_recent_document_request(&request)?;
    let platform = register_recent_document_with_os(&path)?;

    Ok(DesktopRegisterRecentDocumentResponse {
        file_name: file_name(&path),
        path: path.to_string_lossy().to_string(),
        permission_scope: request.permission_scope,
        platform,
        status: "registered",
    })
}

fn validate_recent_document_request(
    request: &DesktopRegisterRecentDocumentRequest,
) -> DesktopRecentDocumentApiResult<PathBuf> {
    if request.permission_scope != DesktopFilePermissionScope::ReadRecentHandle {
        return Err(DesktopRecentDocumentApiError::new(
            "scope-not-recent-handle",
            "OS recent-document registration requires the stored recent-handle scope.",
        ));
    }

    let path = PathBuf::from(&request.path);

    validate_recent_document_path_shape(&path)?;

    let metadata = fs::metadata(&path).map_err(|error| {
        DesktopRecentDocumentApiError::new(
            "path-unavailable",
            format!("Could not inspect the selected recent document: {error}"),
        )
    })?;

    if !metadata.is_file() {
        return Err(DesktopRecentDocumentApiError::new(
            "not-a-file",
            "Only files can be registered as recent documents.",
        ));
    }

    Ok(path)
}

fn validate_recent_document_path_shape(path: &Path) -> DesktopRecentDocumentApiResult<()> {
    if !path.is_absolute() {
        return Err(DesktopRecentDocumentApiError::new(
            "path-not-absolute",
            "Recent-document registration requires an absolute native path.",
        ));
    }

    let extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_ascii_lowercase());

    if extension.as_deref() != Some("essdeck") {
        return Err(DesktopRecentDocumentApiError::new(
            "extension-not-allowed",
            "Only app-owned .essdeck files can be registered as OS recent documents.",
        ));
    }

    Ok(())
}

fn file_name(path: &Path) -> String {
    path.file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Untitled.essdeck")
        .to_string()
}

#[cfg(target_os = "windows")]
fn register_recent_document_with_os(path: &Path) -> DesktopRecentDocumentApiResult<&'static str> {
    use std::{ffi::c_void, os::windows::ffi::OsStrExt};

    const SHARD_PATHW: u32 = 0x00000003;

    #[link(name = "Shell32")]
    unsafe extern "system" {
        #[link_name = "SHAddToRecentDocs"]
        fn sh_add_to_recent_docs(u_flags: u32, pv: *const c_void);
    }

    let mut wide_path = path.as_os_str().encode_wide().collect::<Vec<_>>();
    wide_path.push(0);

    unsafe {
        sh_add_to_recent_docs(SHARD_PATHW, wide_path.as_ptr().cast::<c_void>());
    }

    Ok("windows-shell")
}

#[cfg(not(target_os = "windows"))]
fn register_recent_document_with_os(_path: &Path) -> DesktopRecentDocumentApiResult<&'static str> {
    Err(DesktopRecentDocumentApiError::new(
        "unsupported-platform",
        "OS recent-document registration is currently implemented for Windows shell builds.",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(target_os = "windows")]
    fn absolute_path(name: &str) -> PathBuf {
        PathBuf::from(format!("C:\\Decks\\{name}"))
    }

    #[cfg(not(target_os = "windows"))]
    fn absolute_path(name: &str) -> PathBuf {
        PathBuf::from(format!("/tmp/{name}"))
    }

    #[test]
    fn accepts_app_owned_absolute_deck_paths() {
        assert!(validate_recent_document_path_shape(&absolute_path("Quarterly.essdeck")).is_ok());
    }

    #[test]
    fn rejects_legacy_json_paths_for_os_recent_documents() {
        let result = validate_recent_document_path_shape(&absolute_path("legacy.json"));

        assert!(result.is_err());
    }

    #[test]
    fn rejects_relative_paths_for_os_recent_documents() {
        let result = validate_recent_document_path_shape(Path::new("Quarterly.essdeck"));

        assert!(result.is_err());
    }
}
