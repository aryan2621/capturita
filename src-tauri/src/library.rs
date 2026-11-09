use std::time::Duration;

use serde_json::{json, Value};
use tauri::{AppHandle, State};

use crate::ai::{ai_local, Ai};
use crate::helper::Helper;
use crate::recording::project_dir;

const MAX_TEXT: usize = 4000;
const MIN_TEXT_FOR_AI: usize = 12;

const SYSTEM: &str = "You label screenshots from the text found in them. Give a short, specific title (at most 6 words, no quotes, no file extension) and 3 to 6 lowercase tags (single words or short phrases) that someone would search for.";

fn schema() -> Value {
    json!({
        "type": "object",
        "properties": {
            "title": { "type": "string" },
            "tags": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["title", "tags"]
    })
}

fn clean_tags(tags: &Value) -> Vec<String> {
    let mut clean: Vec<String> = Vec::new();
    for tag in tags.as_array().into_iter().flatten().filter_map(Value::as_str) {
        let tag = tag.trim().to_lowercase();
        if !tag.is_empty() && !clean.contains(&tag) {
            clean.push(tag);
        }
    }
    clean.truncate(6);
    clean
}

fn read_project(dir: &std::path::Path) -> Result<Value, String> {
    let text = std::fs::read_to_string(dir.join("project.json")).map_err(|e| e.to_string())?;
    serde_json::from_str(&text).map_err(|e| e.to_string())
}

fn write_project(dir: &std::path::Path, project: &Value) -> Result<(), String> {
    let mut stored = project.clone();
    stored.as_object_mut().map(|o| o.remove("path"));
    let text = serde_json::to_string_pretty(&stored).map_err(|e| e.to_string())?;
    let temp = dir.join("project.json.tmp");
    std::fs::write(&temp, text).map_err(|e| e.to_string())?;
    std::fs::rename(temp, dir.join("project.json")).map_err(|e| e.to_string())
}

/// Reads the text in a screenshot (Apple's Vision, on this Mac) and, when the local AI is available,
/// gives it a title and tags. Saves `text`, `title` and `tags` in project.json for the library to search.
#[tauri::command]
pub async fn analyze_screenshot(app: AppHandle, helper: State<'_, Helper>, ai: State<'_, Ai>, id: String) -> Result<Value, String> {
    crate::license::require_pro()?;
    let dir = project_dir(&app, &id)?;
    let image = dir.join("screenshot.png");
    let recognized = helper.call(&app, "ocr", json!({ "path": image.to_string_lossy() }), Some(Duration::from_secs(60))).await?;
    let text: String = recognized.as_str().unwrap_or_default().trim().chars().take(MAX_TEXT).collect();

    let mut project = read_project(&dir)?;
    project["text"] = json!(text);
    write_project(&dir, &project)?;

    if text.chars().count() >= MIN_TEXT_FOR_AI {
        let excerpt: String = text.chars().take(1500).collect();
        if let Ok(answer) = ai_local(&app, &ai, SYSTEM, &excerpt, schema()).await {
            let title = answer["title"].as_str().unwrap_or_default().trim().to_string();
            if !title.is_empty() {
                project["title"] = json!(title);
            }
            project["tags"] = json!(clean_tags(&answer["tags"]));
            write_project(&dir, &project)?;
        }
    }
    project["path"] = json!(dir.to_string_lossy());
    Ok(project)
}
