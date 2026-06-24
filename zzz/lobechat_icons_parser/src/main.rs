use serde_json::json;
use std::fs;

fn main() {
    let source_dir = r"G:\Dx\icon\data\lobe-icons\packages\static-svg\icons";
    let output_file = r"G:\Dx\icon\data\lobechat.json";

    let mut icons = serde_json::Map::new();

    let paths = fs::read_dir(source_dir).expect("Failed to read dir");
    for path in paths {
        let entry = path.unwrap();
        let p = entry.path();
        if p.extension().and_then(|e| e.to_str()) != Some("svg") {
            continue;
        }

        let file_stem = p.file_stem().unwrap().to_str().unwrap().to_string();
        let content = fs::read_to_string(&p).unwrap();

        // Extract inner SVG
        let start_tag_end = content.find('>').unwrap();
        let end_tag_start = content.rfind("</svg>").unwrap_or(content.len());
        
        if start_tag_end < end_tag_start {
            let body = content[start_tag_end + 1..end_tag_start].trim().to_string();
            
            // Extract viewBox
            let mut width = 24;
            let mut height = 24;
            if let Some(vb_start) = content.find("viewBox=\"") {
                let vb_str = &content[vb_start + 9..];
                if let Some(vb_end) = vb_str.find("\"") {
                    let parts: Vec<&str> = vb_str[..vb_end].split_whitespace().collect();
                    if parts.len() == 4 {
                        width = parts[2].parse().unwrap_or(24);
                        height = parts[3].parse().unwrap_or(24);
                    }
                }
            }

            let mut icon_data = serde_json::Map::new();
            icon_data.insert("body".to_string(), json!(body));
            if width != 24 {
                icon_data.insert("width".to_string(), json!(width));
            }
            if height != 24 {
                icon_data.insert("height".to_string(), json!(height));
            }

            icons.insert(file_stem, json!(icon_data));
        }
    }

    let result = json!({
        "prefix": "lobechat",
        "info": {
            "name": "LobeChat",
            "total": icons.len()
        },
        "icons": icons
    });

    let json_string = serde_json::to_string(&result).unwrap();
    fs::write(output_file, json_string).unwrap();
    println!("Processed {} icons", icons.len());
}
