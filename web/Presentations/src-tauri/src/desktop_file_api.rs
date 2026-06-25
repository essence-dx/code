use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};
use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, FilePath};

const MAX_FILE_BYTES: u64 = 150 * 1024 * 1024;

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum DesktopFilePermissionScope {
    ReadDeckFile,
    ReadImageFiles,
    ReadOutlineFile,
    ReadPresentationFile,
    ReadRecentHandle,
    ReadRecoveryStorage,
    WriteDeckFile,
    WriteExportFile,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum DesktopFileDialogMode {
    Open,
    OpenMany,
    Save,
    Storage,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopFileDialogRequest {
    accept_extensions: Vec<String>,
    mode: DesktopFileDialogMode,
    permission_scope: DesktopFilePermissionScope,
    suggested_extension: Option<String>,
    suggested_name: Option<String>,
    title: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopReadFileRequest {
    dialog: DesktopFileDialogRequest,
    path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopWriteFileRequest {
    data_url: Option<String>,
    dialog: DesktopFileDialogRequest,
    path: Option<String>,
    text: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopNativeFile {
    data_url: Option<String>,
    extension: String,
    last_modified: u128,
    mime_type: String,
    name: String,
    path: String,
    size: u64,
    text: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopReadFileResponse {
    files: Vec<DesktopNativeFile>,
    permission_scope: DesktopFilePermissionScope,
    status: &'static str,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopWriteFileResponse {
    bytes_written: usize,
    extension: String,
    file_name: String,
    path: String,
    permission_scope: DesktopFilePermissionScope,
    status: &'static str,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopFileScopeCapability {
    accept_extensions: Vec<&'static str>,
    can_read: bool,
    can_write: bool,
    permission_scope: DesktopFilePermissionScope,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopFileBridgeCapabilities {
    max_file_bytes: u64,
    scopes: Vec<DesktopFileScopeCapability>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopFileApiError {
    code: &'static str,
    message: String,
}

type DesktopFileApiResult<T> = Result<T, DesktopFileApiError>;

impl DesktopFileApiError {
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

impl DesktopFilePermissionScope {
    fn allowed_extensions(self) -> &'static [&'static str] {
        match self {
            Self::ReadDeckFile | Self::ReadRecentHandle | Self::WriteDeckFile => {
                &["essdeck", "json"]
            }
            Self::ReadImageFiles => &["apng", "avif", "gif", "jpeg", "jpg", "png", "svg", "webp"],
            Self::ReadOutlineFile => &["md", "outline", "txt"],
            Self::ReadPresentationFile => &["gslides", "odp", "pptx"],
            Self::ReadRecoveryStorage => &["json"],
            Self::WriteExportFile => &["pdf", "png", "pptx", "svg"],
        }
    }

    fn can_read(self) -> bool {
        matches!(
            self,
            Self::ReadDeckFile
                | Self::ReadImageFiles
                | Self::ReadOutlineFile
                | Self::ReadPresentationFile
                | Self::ReadRecentHandle
                | Self::ReadRecoveryStorage
        )
    }

    fn can_write(self) -> bool {
        matches!(self, Self::WriteDeckFile | Self::WriteExportFile)
    }

    fn returns_text(self) -> bool {
        matches!(
            self,
            Self::ReadDeckFile | Self::ReadOutlineFile | Self::ReadRecentHandle
        )
    }
}

#[tauri::command]
pub fn desktop_file_bridge_capabilities() -> DesktopFileBridgeCapabilities {
    let scopes = [
        DesktopFilePermissionScope::ReadDeckFile,
        DesktopFilePermissionScope::ReadImageFiles,
        DesktopFilePermissionScope::ReadOutlineFile,
        DesktopFilePermissionScope::ReadPresentationFile,
        DesktopFilePermissionScope::ReadRecentHandle,
        DesktopFilePermissionScope::ReadRecoveryStorage,
        DesktopFilePermissionScope::WriteDeckFile,
        DesktopFilePermissionScope::WriteExportFile,
    ]
    .map(|scope| DesktopFileScopeCapability {
        accept_extensions: scope.allowed_extensions().to_vec(),
        can_read: scope.can_read(),
        can_write: scope.can_write(),
        permission_scope: scope,
    })
    .to_vec();

    DesktopFileBridgeCapabilities {
        max_file_bytes: MAX_FILE_BYTES,
        scopes,
    }
}

#[tauri::command]
pub async fn desktop_pick_and_read_file(
    app: AppHandle,
    request: DesktopReadFileRequest,
) -> DesktopFileApiResult<DesktopReadFileResponse> {
    if !request.dialog.permission_scope.can_read() {
        return Err(DesktopFileApiError::new(
            "scope-not-readable",
            "This desktop file scope cannot read files.",
        ));
    }

    let paths = if let Some(path) = request.path {
        vec![PathBuf::from(path)]
    } else {
        let extensions = requested_extensions(&request.dialog);
        let extension_refs = extensions.iter().map(String::as_str).collect::<Vec<_>>();
        let dialog = app
            .dialog()
            .file()
            .set_title(request.dialog.title.clone())
            .add_filter("Supported files", &extension_refs);

        match request.dialog.mode {
            DesktopFileDialogMode::Open => match dialog.blocking_pick_file() {
                Some(path) => vec![file_path_to_path_buf(path)?],
                None => {
                    return Ok(cancelled_read_response(request.dialog.permission_scope));
                }
            },
            DesktopFileDialogMode::OpenMany => match dialog.blocking_pick_files() {
                Some(paths) => paths
                    .into_iter()
                    .map(file_path_to_path_buf)
                    .collect::<DesktopFileApiResult<Vec<_>>>()?,
                None => {
                    return Ok(cancelled_read_response(request.dialog.permission_scope));
                }
            },
            DesktopFileDialogMode::Save | DesktopFileDialogMode::Storage => {
                return Err(DesktopFileApiError::new(
                    "invalid-dialog-mode",
                    "Read commands require an open-file dialog mode.",
                ));
            }
        }
    };

    let files = paths
        .into_iter()
        .map(|path| read_native_file(path, &request.dialog))
        .collect::<DesktopFileApiResult<Vec<_>>>()?;

    Ok(DesktopReadFileResponse {
        files,
        permission_scope: request.dialog.permission_scope,
        status: "picked",
    })
}

#[tauri::command]
pub async fn desktop_save_file(
    app: AppHandle,
    request: DesktopWriteFileRequest,
) -> DesktopFileApiResult<DesktopWriteFileResponse> {
    if !request.dialog.permission_scope.can_write() {
        return Err(DesktopFileApiError::new(
            "scope-not-writable",
            "This desktop file scope cannot write files.",
        ));
    }

    let bytes = write_payload_bytes(&request)?;
    let path = if let Some(path) = request.path.clone() {
        PathBuf::from(path)
    } else {
        let extensions = requested_extensions(&request.dialog);
        let extension_refs = extensions.iter().map(String::as_str).collect::<Vec<_>>();
        let mut dialog = app
            .dialog()
            .file()
            .set_title(request.dialog.title.clone())
            .add_filter("Supported files", &extension_refs);

        if let Some(name) = request.dialog.suggested_name.clone() {
            dialog = dialog.set_file_name(name);
        }

        let Some(path) = dialog.blocking_save_file() else {
            return Ok(cancelled_write_response(request.dialog.permission_scope));
        };

        file_path_to_path_buf(path)?
    };
    let path = path_with_suggested_extension(path, &request.dialog);

    ensure_scope_extension(&path, &request.dialog)?;
    fs::write(&path, &bytes).map_err(|error| {
        DesktopFileApiError::new(
            "write-failed",
            format!("Could not write the selected file: {error}"),
        )
    })?;

    Ok(DesktopWriteFileResponse {
        bytes_written: bytes.len(),
        extension: file_extension(&path).unwrap_or_default(),
        file_name: file_name(&path),
        path: path.to_string_lossy().to_string(),
        permission_scope: request.dialog.permission_scope,
        status: "saved",
    })
}

fn cancelled_read_response(
    permission_scope: DesktopFilePermissionScope,
) -> DesktopReadFileResponse {
    DesktopReadFileResponse {
        files: Vec::new(),
        permission_scope,
        status: "cancelled",
    }
}

fn cancelled_write_response(
    permission_scope: DesktopFilePermissionScope,
) -> DesktopWriteFileResponse {
    DesktopWriteFileResponse {
        bytes_written: 0,
        extension: String::new(),
        file_name: String::new(),
        path: String::new(),
        permission_scope,
        status: "cancelled",
    }
}

fn file_path_to_path_buf(path: FilePath) -> DesktopFileApiResult<PathBuf> {
    path.simplified()
        .into_path()
        .map_err(|error| DesktopFileApiError::new("path-unavailable", error.to_string()))
}

fn requested_extensions(request: &DesktopFileDialogRequest) -> Vec<String> {
    let allowed = request.dialog_scope_extensions();
    let requested = request
        .accept_extensions
        .iter()
        .filter_map(|extension| normalize_extension(extension))
        .filter(|extension| allowed.iter().any(|allowed| allowed == extension))
        .collect::<Vec<_>>();

    if requested.is_empty() {
        allowed
            .iter()
            .map(|extension| extension.to_string())
            .collect()
    } else {
        requested
    }
}

impl DesktopFileDialogRequest {
    fn dialog_scope_extensions(&self) -> &'static [&'static str] {
        self.permission_scope.allowed_extensions()
    }
}

fn normalize_extension(extension: &str) -> Option<String> {
    let normalized = extension
        .trim()
        .trim_start_matches('.')
        .to_ascii_lowercase();

    if normalized.is_empty()
        || !normalized
            .chars()
            .all(|character| character.is_ascii_alphanumeric())
    {
        return None;
    }

    Some(normalized)
}

fn file_extension(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_ascii_lowercase())
}

fn file_name(path: &Path) -> String {
    path.file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Untitled")
        .to_string()
}

fn ensure_scope_extension(
    path: &Path,
    request: &DesktopFileDialogRequest,
) -> DesktopFileApiResult<()> {
    let Some(extension) = file_extension(path) else {
        return Err(DesktopFileApiError::new(
            "missing-extension",
            "The selected file needs a supported extension.",
        ));
    };

    if !requested_extensions(request)
        .iter()
        .any(|allowed| allowed == &extension)
    {
        return Err(DesktopFileApiError::new(
            "extension-not-allowed",
            format!("The .{extension} file extension is not allowed for this operation."),
        ));
    }

    Ok(())
}

fn path_with_suggested_extension(mut path: PathBuf, request: &DesktopFileDialogRequest) -> PathBuf {
    if path.extension().is_none() {
        if let Some(extension) = request
            .suggested_extension
            .as_deref()
            .and_then(normalize_extension)
        {
            path.set_extension(extension);
        }
    }

    path
}

fn read_native_file(
    path: PathBuf,
    request: &DesktopFileDialogRequest,
) -> DesktopFileApiResult<DesktopNativeFile> {
    ensure_scope_extension(&path, request)?;
    let metadata = fs::metadata(&path).map_err(|error| {
        DesktopFileApiError::new(
            "read-failed",
            format!("Could not inspect the selected file: {error}"),
        )
    })?;

    if !metadata.is_file() {
        return Err(DesktopFileApiError::new(
            "not-a-file",
            "The selected path is not a file.",
        ));
    }

    if metadata.len() > MAX_FILE_BYTES {
        return Err(DesktopFileApiError::new(
            "file-too-large",
            format!(
                "The selected file is larger than the {} MB desktop handoff limit.",
                MAX_FILE_BYTES / 1024 / 1024
            ),
        ));
    }

    let bytes = fs::read(&path).map_err(|error| {
        DesktopFileApiError::new(
            "read-failed",
            format!("Could not read the selected file: {error}"),
        )
    })?;
    let extension = file_extension(&path).unwrap_or_default();
    let mime_type = mime_type_for_extension(&extension).to_string();
    let last_modified = metadata
        .modified()
        .ok()
        .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis())
        .unwrap_or(0);

    let (text, data_url) = if request.permission_scope.returns_text() {
        (
            Some(String::from_utf8(bytes).map_err(|error| {
                DesktopFileApiError::new(
                    "invalid-text-file",
                    format!("The selected file is not valid UTF-8 text: {error}"),
                )
            })?),
            None,
        )
    } else {
        (
            None,
            Some(format!(
                "data:{mime_type};base64,{}",
                general_purpose::STANDARD.encode(bytes)
            )),
        )
    };

    Ok(DesktopNativeFile {
        data_url,
        extension,
        last_modified,
        mime_type,
        name: file_name(&path),
        path: path.to_string_lossy().to_string(),
        size: metadata.len(),
        text,
    })
}

fn write_payload_bytes(request: &DesktopWriteFileRequest) -> DesktopFileApiResult<Vec<u8>> {
    if let Some(text) = request.text.as_ref() {
        return Ok(text.as_bytes().to_vec());
    }

    if let Some(data_url) = request.data_url.as_ref() {
        return bytes_from_data_url(data_url);
    }

    Err(DesktopFileApiError::new(
        "missing-payload",
        "No file payload was provided.",
    ))
}

fn bytes_from_data_url(data_url: &str) -> DesktopFileApiResult<Vec<u8>> {
    let Some((header, payload)) = data_url.split_once(',') else {
        return Err(DesktopFileApiError::new(
            "invalid-data-url",
            "The file payload is not a data URL.",
        ));
    };

    if !header.ends_with(";base64") {
        return Err(DesktopFileApiError::new(
            "invalid-data-url",
            "Only base64 data URLs can be written by the desktop file bridge.",
        ));
    }

    general_purpose::STANDARD.decode(payload).map_err(|error| {
        DesktopFileApiError::new(
            "invalid-data-url",
            format!("Could not decode the file payload: {error}"),
        )
    })
}

fn mime_type_for_extension(extension: &str) -> &'static str {
    match extension {
        "apng" => "image/apng",
        "avif" => "image/avif",
        "gif" => "image/gif",
        "jpeg" | "jpg" => "image/jpeg",
        "essdeck" => "application/vnd.essence.powerpoint.deck+json",
        "json" => "application/json",
        "md" => "text/markdown",
        "odp" => "application/vnd.oasis.opendocument.presentation",
        "pdf" => "application/pdf",
        "png" => "image/png",
        "pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "svg" => "image/svg+xml",
        "txt" | "outline" => "text/plain",
        "webp" => "image/webp",
        _ => "application/octet-stream",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dialog_request(
        permission_scope: DesktopFilePermissionScope,
        accept_extensions: Vec<&str>,
    ) -> DesktopFileDialogRequest {
        DesktopFileDialogRequest {
            accept_extensions: accept_extensions.into_iter().map(String::from).collect(),
            mode: DesktopFileDialogMode::Open,
            permission_scope,
            suggested_extension: None,
            suggested_name: None,
            title: "Test".to_string(),
        }
    }

    #[test]
    fn filters_requested_extensions_to_the_permission_scope() {
        let request = dialog_request(
            DesktopFilePermissionScope::ReadPresentationFile,
            vec![".pptx", ".exe", "ODP"],
        );

        assert_eq!(requested_extensions(&request), vec!["pptx", "odp"]);
    }

    #[test]
    fn falls_back_to_scope_extensions_when_request_is_empty() {
        let request = dialog_request(DesktopFilePermissionScope::ReadDeckFile, vec![".exe"]);

        assert_eq!(requested_extensions(&request), vec!["essdeck", "json"]);
    }

    #[test]
    fn allows_app_owned_deck_files_and_legacy_json_decks() {
        let request = dialog_request(
            DesktopFilePermissionScope::ReadDeckFile,
            vec![".essdeck", ".json", ".pptx"],
        );

        assert_eq!(requested_extensions(&request), vec!["essdeck", "json"]);
        assert_eq!(
            mime_type_for_extension("essdeck"),
            "application/vnd.essence.powerpoint.deck+json"
        );
    }

    #[test]
    fn rejects_extensions_outside_the_scope() {
        let request = dialog_request(DesktopFilePermissionScope::WriteDeckFile, vec![".json"]);

        let result = ensure_scope_extension(Path::new("deck.pptx"), &request);

        assert!(result.is_err());
    }

    #[test]
    fn appends_a_safe_suggested_extension_for_save_dialogs() {
        let mut request =
            dialog_request(DesktopFilePermissionScope::WriteExportFile, vec![".pptx"]);
        request.suggested_extension = Some(".pptx".to_string());

        let path = path_with_suggested_extension(PathBuf::from("Quarterly"), &request);

        assert_eq!(
            path.file_name().and_then(|name| name.to_str()),
            Some("Quarterly.pptx")
        );
    }

    #[test]
    fn decodes_base64_data_urls() {
        let bytes = bytes_from_data_url("data:text/plain;base64,SGVsbG8=").unwrap();

        assert_eq!(bytes, b"Hello");
    }
}
