//! Brand kits: colors, fonts and a logo that motion scenes use. Kits are app-wide and live in
//! `Capturita/Brand/` (kits.json plus logo files), inside the folder the webview may read. A project
//! that uses a kit's logo gets its own copy in `<project>/brand/`, so the project folder holds
//! everything its scenes draw.

use std::path::PathBuf;

use serde_json::Value;
use tauri::AppHandle;

use crate::recording::{project_dir, recordings_root};

fn brand_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = recordings_root(app)?.join("Brand");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// A logo file name as `import_brand_logo` makes it: no folders, nothing hidden.
fn check_logo(name: &str) -> Result<(), String> {
    if name.starts_with("logo-") && !name.contains(['/', '\\']) && !name.contains("..") {
        Ok(())
    } else {
        Err("Invalid logo file".into())
    }
}

/// The saved kits (a JSON array), or an empty list.
#[tauri::command]
pub fn brand_kits(app: AppHandle) -> Result<Value, String> {
    let file = brand_dir(&app)?.join("kits.json");
    let Ok(text) = std::fs::read_to_string(file) else {
        return Ok(Value::Array(vec![]));
    };
    Ok(serde_json::from_str::<Value>(&text).ok().filter(Value::is_array).unwrap_or(Value::Array(vec![])))
}

#[tauri::command]
pub fn save_brand_kits(app: AppHandle, kits: Value) -> Result<(), String> {
    if !kits.is_array() {
        return Err("Expected a list of brand kits".into());
    }
    let dir = brand_dir(&app)?;
    // Write next to the file and rename, so a crash never leaves half a file.
    let partial = dir.join("kits.json.part");
    std::fs::write(&partial, serde_json::to_vec_pretty(&kits).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    std::fs::rename(partial, dir.join("kits.json")).map_err(|e| e.to_string())
}

/// Copies an image into the brand folder as `logo-<time>.<ext>` and returns that name. A new
/// name each time keeps the webview and the scene cache from reusing an earlier logo.
#[tauri::command]
pub fn import_brand_logo(app: AppHandle, request: tauri::ipc::Request<'_>) -> Result<String, String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("Expected raw bytes".into());
    };
    let name = request.headers().get("name").and_then(|v| v.to_str().ok()).unwrap_or_default().replace("%2E", ".").replace("%2e", ".");
    let ext = std::path::Path::new(&name)
        .extension()
        .and_then(|e| e.to_str())
        .map(str::to_ascii_lowercase)
        .filter(|e| ["png", "jpg", "jpeg", "webp", "svg"].contains(&e.as_str()))
        .ok_or("Choose an image (PNG, JPEG, WebP, SVG)")?;
    let file = format!("logo-{}.{ext}", chrono::Local::now().timestamp_millis());
    std::fs::write(brand_dir(&app)?.join(&file), bytes).map_err(|e| e.to_string())?;
    Ok(file)
}

/// Makes sure the project has its copy of a kit's logo; returns its path inside the project.
#[tauri::command]
pub fn use_brand_logo(app: AppHandle, id: String, logo: String) -> Result<String, String> {
    check_logo(&logo)?;
    let source = brand_dir(&app)?.join(&logo);
    if !source.is_file() {
        return Err("The brand kit's logo is missing".into());
    }
    let dir = project_dir(&app, &id)?.join("brand");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let target = dir.join(&logo);
    if !target.is_file() {
        std::fs::copy(&source, &target).map_err(|e| e.to_string())?;
    }
    Ok(format!("brand/{logo}"))
}

/// Copies a file a scene shows (screenshot, logo, avatar, GIF, Lottie .json, Rive .riv, video, audio) into
/// `<project>/images/` as `img-<time>.<ext>` and returns its path inside the project. Headers:
/// `id` (the project) and `name` (the original file name, for its extension).
#[tauri::command]
pub fn import_scene_image(app: AppHandle, request: tauri::ipc::Request<'_>) -> Result<String, String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("Expected raw bytes".into());
    };
    let header = |key: &str| request.headers().get(key).and_then(|v| v.to_str().ok()).map(str::to_string);
    let id = header("id").ok_or("Missing id header")?;
    let name = header("name").unwrap_or_default().replace("%2E", ".").replace("%2e", ".");
    let ext = std::path::Path::new(&name)
        .extension()
        .and_then(|e| e.to_str())
        .map(str::to_ascii_lowercase)
        .filter(|e| ["png", "jpg", "jpeg", "webp", "svg", "gif", "json", "riv", "mp4", "mov", "webm", "m4a", "mp3", "wav"].contains(&e.as_str()))
        .ok_or("Choose an image (PNG, JPEG, WebP, SVG, GIF), a Lottie .json, a Rive .riv, a video (MP4, MOV, WebM) or audio (M4A, MP3, WAV)")?;
    if ext == "json" && serde_json::from_slice::<Value>(bytes).map(|v| v.get("layers").is_none()).unwrap_or(true) {
        return Err("That .json isn't a Lottie animation".into());
    }
    let dir = project_dir(&app, &id)?.join("images");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let file = format!("img-{}.{ext}", chrono::Local::now().timestamp_millis());
    std::fs::write(dir.join(&file), bytes).map_err(|e| e.to_string())?;
    Ok(format!("images/{file}"))
}

/// GETs a web page or image for "brand kit from a website", up to `limit` bytes. Only http(s).
async fn download(url: &str, limit: usize) -> Result<(Vec<u8>, String), String> {
    let url = reqwest::Url::parse(url).map_err(|_| "That isn't a web address".to_string())?;
    if !["http", "https"].contains(&url.scheme()) {
        return Err("Use an http or https address".into());
    }
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15")
        .build()
        .map_err(|e| e.to_string())?;
    let mut response = client.get(url).send().await.map_err(|e| format!("Couldn't reach the site: {e}"))?;
    if !response.status().is_success() {
        return Err(format!("The site answered {}", response.status()));
    }
    let kind = response.headers().get(reqwest::header::CONTENT_TYPE).and_then(|v| v.to_str().ok()).unwrap_or_default().to_ascii_lowercase();
    let mut bytes = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(|e| e.to_string())? {
        bytes.extend_from_slice(&chunk);
        if bytes.len() > limit {
            return Err("That file is too big".into());
        }
    }
    Ok((bytes, kind))
}

/// A web page's HTML (first 3 MB), for reading its name, colours, fonts and logo.
#[tauri::command]
pub async fn fetch_site(url: String) -> Result<String, String> {
    let (bytes, _) = download(&url, 3 << 20).await?;
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

/// Downloads a site's logo into the brand folder, like `import_brand_logo`, and returns its name.
#[tauri::command]
pub async fn import_brand_logo_url(app: AppHandle, url: String) -> Result<String, String> {
    let (bytes, kind) = download(&url, 5 << 20).await?;
    let ext = match kind.split(';').next().unwrap_or_default().trim() {
        "image/png" => "png",
        "image/jpeg" => "jpg",
        "image/webp" => "webp",
        "image/svg+xml" => "svg",
        _ => return Err("The site's logo isn't a PNG, JPEG, WebP or SVG".into()),
    };
    let file = format!("logo-{}.{ext}", chrono::Local::now().timestamp_millis());
    std::fs::write(brand_dir(&app)?.join(&file), bytes).map_err(|e| e.to_string())?;
    Ok(file)
}
