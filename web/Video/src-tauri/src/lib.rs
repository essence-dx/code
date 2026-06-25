mod desktop_diagnostics;
mod desktop_launch;
mod desktop_workflow;
mod native_ffmpeg;
mod native_ffmpeg_graph;
mod native_render;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(native_render::NativeRenderState::default())
    .manage(desktop_launch::create_desktop_launch_session())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
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
      desktop_launch::read_desktop_launch_session,
      desktop_diagnostics::run_desktop_diagnostics,
      desktop_workflow::run_desktop_workflow_smoke,
      native_render::start_native_render,
      native_render::get_native_render_status,
      native_render::cancel_native_render
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
