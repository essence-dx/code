import re

with open('crates/sidebar/src/sidebar.rs', 'r', encoding='utf-8') as f:
    text = f.read()

old_code = "WebPreviewView::open_new_url_in_active_pane(workspace, url, window, cx);"
new_code = "WebPreviewView::open_url_in_active_pane(workspace, url, window, cx);"

if old_code in text:
    text = text.replace(old_code, new_code)
    with open('crates/sidebar/src/sidebar.rs', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced!")
else:
    print("Not found")
