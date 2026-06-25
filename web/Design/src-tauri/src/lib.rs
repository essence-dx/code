mod desktop_bridge;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      desktop_bridge::save_design_file,
      desktop_bridge::open_design_file,
      desktop_bridge::list_recent_design_files,
      desktop_bridge::remove_recent_design_file,
      desktop_bridge::cache_offline_assets
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
