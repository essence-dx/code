mod desktop_file_api;
mod desktop_menu;
mod desktop_recent_documents;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            desktop_file_api::desktop_file_bridge_capabilities,
            desktop_file_api::desktop_pick_and_read_file,
            desktop_file_api::desktop_save_file,
            desktop_recent_documents::desktop_register_recent_document,
        ])
        .setup(|app| {
            desktop_menu::install(app)?;

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
