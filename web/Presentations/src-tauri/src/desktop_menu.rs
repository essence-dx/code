use tauri::{
    menu::{MenuBuilder, SubmenuBuilder},
    Manager,
};

const DOM_MENU_COMMAND_EVENT: &str = "essence-powerpoint:desktop-menu-command";
const MAIN_WINDOW_LABEL: &str = "main";

const FILE_COMMANDS: &[(&str, &str)] = &[
    ("file.open", "Open deck"),
    ("file.save", "Save"),
    ("file.saveAsJson", "Save as deck file"),
    ("file.recentLocalDecks", "Recent local decks"),
];

const IMPORT_COMMANDS: &[(&str, &str)] = &[
    ("file.importOutline", "Import outline"),
    ("file.importPresentation", "Import PPTX or ODP"),
    ("file.importImageSlides", "Import image slides"),
];

const EXPORT_COMMANDS: &[(&str, &str)] = &[
    ("file.exportPptx", "Export PowerPoint PPTX"),
    ("file.exportPdf", "Export PDF"),
    ("file.exportSlideSvg", "Export slide SVG"),
    ("file.exportSlidePng", "Export slide PNG"),
];

const RECOVER_COMMANDS: &[(&str, &str)] = &[("file.recoverySnapshots", "Recovery snapshots")];

fn is_desktop_menu_command_id(command_id: &str) -> bool {
    FILE_COMMANDS
        .iter()
        .chain(IMPORT_COMMANDS)
        .chain(EXPORT_COMMANDS)
        .chain(RECOVER_COMMANDS)
        .any(|(id, _)| *id == command_id)
}

fn escape_js_string(value: &str) -> String {
    value.replace('\\', "\\\\").replace('\'', "\\'")
}

fn desktop_menu_dispatch_script(command_id: &str) -> String {
    format!(
    "window.dispatchEvent(new CustomEvent('{event}', {{ detail: {{ commandId: '{command}' }} }}));",
    event = escape_js_string(DOM_MENU_COMMAND_EVENT),
    command = escape_js_string(command_id),
  )
}

pub fn install(app: &tauri::App) -> tauri::Result<()> {
    let file_menu = SubmenuBuilder::new(app, "File")
        .text("file.open", "Open deck")
        .text("file.save", "Save")
        .text("file.saveAsJson", "Save as deck file")
        .text("file.recentLocalDecks", "Recent local decks")
        .build()?;
    let import_menu = SubmenuBuilder::new(app, "Import")
        .text("file.importOutline", "Import outline")
        .text("file.importPresentation", "Import PPTX or ODP")
        .text("file.importImageSlides", "Import image slides")
        .build()?;
    let export_menu = SubmenuBuilder::new(app, "Export")
        .text("file.exportPptx", "Export PowerPoint PPTX")
        .text("file.exportPdf", "Export PDF")
        .text("file.exportSlideSvg", "Export slide SVG")
        .text("file.exportSlidePng", "Export slide PNG")
        .build()?;
    let recover_menu = SubmenuBuilder::new(app, "Recover")
        .text("file.recoverySnapshots", "Recovery snapshots")
        .build()?;
    let menu = MenuBuilder::new(app)
        .items(&[&file_menu, &import_menu, &export_menu, &recover_menu])
        .build()?;

    app.set_menu(menu)?;
    app.on_menu_event(move |app_handle, event| {
        let command_id = event.id().0.as_str();
        if !is_desktop_menu_command_id(command_id) {
            return;
        }

        let Some(window) = app_handle.get_webview_window(MAIN_WINDOW_LABEL) else {
            log::warn!("Desktop menu command {command_id} could not find the main webview window");
            return;
        };

        if let Err(error) = window.eval(&desktop_menu_dispatch_script(command_id)) {
            log::warn!("Desktop menu command {command_id} could not reach the web app: {error}");
        }
    });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_known_desktop_menu_commands() {
        assert!(is_desktop_menu_command_id("file.open"));
        assert!(is_desktop_menu_command_id("file.exportSlidePng"));
        assert!(is_desktop_menu_command_id("file.recoverySnapshots"));
        assert!(!is_desktop_menu_command_id("file.unknown"));
    }

    #[test]
    fn dispatch_script_targets_the_web_command_contract() {
        let script = desktop_menu_dispatch_script("file.saveAsJson");

        assert!(script.contains(DOM_MENU_COMMAND_EVENT));
        assert!(script.contains("commandId: 'file.saveAsJson'"));
        assert!(script.contains("window.dispatchEvent"));
    }

    #[test]
    fn dispatch_script_escapes_command_values() {
        let script = desktop_menu_dispatch_script("file.test'quote");

        assert!(script.contains("file.test\\'quote"));
    }
}
