//! Renders Studio motion scenes (Remotion compositions) to video files, so export can draw them
//! like any other video. The studio renderer (`studio-renderer/render.mjs`) runs in Node and
//! prints `{"progress": 0-1}` lines, which are passed on as `studio-render-progress` events, and
//! `{"download": 0-1}` lines while Chrome Headless Shell downloads (first export only), passed on
//! as `studio-browser-download`.
//!
//! Release builds ship everything: Node as a sidecar (`binaries/studio-node`, next to the app's
//! binary) and `studio-renderer/` in the resources with the scenes prebuilt and only
//! `@remotion/renderer` in its node_modules (scripts/build-studio-renderer.sh). Chrome Headless
//! Shell is downloaded into the app's data folder, never into the signed bundle.

use std::io::{BufRead, BufReader, Read};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

use serde::Deserialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::recording::{project_dir, recordings_root};

#[derive(Default)]
pub struct Studio {
    child: Mutex<Option<Child>>,
}

/// One scene to render. `out` is an absolute path inside the recordings folder.
#[derive(Deserialize, serde::Serialize)]
pub struct SceneJob {
    composition: String,
    props: Value,
    frames: u32,
    fps: u32,
    width: u32,
    height: u32,
    /// Render with a transparent background: VP9 WebM (yuva420p) for overlays, ProRes 4444
    /// (yuva444p10le) when `out` is a `.mov`, for transparent export.
    #[serde(default)]
    alpha: bool,
    out: String,
    /// Render only this frame, as a JPEG picture (`out` ends in .jpg).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    still: Option<u32>,
    /// Inclusive frame ranges to render (transparent timeline); the rest is written as empty frames.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    ranges: Option<Vec<[u32; 2]>>,
}

/// Exit code of render.mjs when Chrome Headless Shell couldn't be downloaded.
const NO_BROWSER: i32 = 3;

struct Renderer {
    dir: PathBuf,
    /// The prebuilt scenes; None means render.mjs bundles them from source each run.
    bundle: Option<PathBuf>,
}

/// Development builds render from the source folder, so scene edits show up without a rebuild;
/// release builds use the copy in the app's resources.
fn renderer(app: &AppHandle) -> Result<Renderer, String> {
    #[cfg(debug_assertions)]
    {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../studio-renderer");
        if dir.join("render.mjs").exists() && dir.join("node_modules").exists() {
            return Ok(Renderer { dir, bundle: None });
        }
    }
    let dir = app.path().resource_dir().map_err(|e| e.to_string())?.join("studio-renderer");
    let bundle = dir.join("bundle");
    if dir.join("render.mjs").is_file() && bundle.join("index.html").is_file() {
        Ok(Renderer { dir, bundle: Some(bundle) })
    } else {
        Err("This copy of Capturita is missing its motion scene renderer. Reinstall the app.".into())
    }
}

/// The bundled Node (a Tauri sidecar next to the app's binary, in development too); otherwise
/// the system's. Apps opened from Finder don't get the shell's PATH, so ask a login shell.
fn find_node() -> Result<PathBuf, String> {
    let bundled = std::env::current_exe().ok().and_then(|exe| exe.parent().map(|dir| dir.join("studio-node")));
    if let Some(node) = bundled.filter(|path| path.is_file()) {
        return Ok(node);
    }
    if let Ok(output) = Command::new("/bin/zsh").args(["-lc", "command -v node"]).output() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !path.is_empty() && Path::new(&path).exists() {
            return Ok(PathBuf::from(path));
        }
    }
    ["/opt/homebrew/bin/node", "/usr/local/bin/node"]
        .iter()
        .map(PathBuf::from)
        .find(|p| p.exists())
        .ok_or_else(|| "Motion scenes need Node.js to render. Install it from nodejs.org and try again.".into())
}

/// Remotion keeps Chrome Headless Shell beside the working directory's package.json. The
/// shipped renderer runs from the data folder, so the download lands there (once, outside
/// the signed bundle); the development one keeps using studio-renderer/.
fn work_dir(app: &AppHandle, renderer: &Renderer) -> Result<PathBuf, String> {
    if renderer.bundle.is_none() {
        return Ok(renderer.dir.clone());
    }
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("studio-renderer");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let manifest = dir.join("package.json");
    if !manifest.exists() {
        std::fs::write(&manifest, r#"{ "name": "capturita-studio-cache", "private": true }"#).map_err(|e| e.to_string())?;
    }
    Ok(dir)
}

/// Renders the scenes whose files don't exist yet. Finished files are kept as a cache, so an
/// unchanged scene renders once. `project` is the project folder; the renderer serves it over
/// local http so scenes can show the recording and the brand logo.
#[tauri::command]
pub async fn studio_render(app: AppHandle, jobs: Vec<SceneJob>, project: String) -> Result<(), String> {
    let root = recordings_root(&app)?;
    for job in &jobs {
        if !Path::new(&job.out).starts_with(&root) {
            return Err(format!("Scene files must go in the recordings folder: {}", job.out));
        }
    }
    let project = PathBuf::from(project);
    if !project.starts_with(&root) || !project.join("project.json").is_file() {
        return Err("Scenes can only read from a recording's folder".into());
    }
    let pending: Vec<&SceneJob> = jobs.iter().filter(|job| !Path::new(&job.out).exists()).collect();
    if pending.is_empty() {
        let _ = app.emit("studio-render-progress", 1.0);
        return Ok(());
    }

    let renderer = renderer(&app)?;
    let node = find_node()?;
    let log_dir = app.path().app_log_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&log_dir).map_err(|e| e.to_string())?;
    let jobs_file = log_dir.join("studio-render-jobs.json");
    std::fs::write(&jobs_file, serde_json::to_vec(&pending).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;

    let work_dir = work_dir(&app, &renderer)?;

    let mut command = Command::new(node);
    command.arg(renderer.dir.join("render.mjs")).arg("--jobs").arg(&jobs_file).arg("--root").arg(&project);
    if let Some(bundle) = &renderer.bundle {
        command.arg("--bundle").arg(bundle);
    }
    let mut child = command
        .current_dir(&work_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Could not start the studio renderer: {e}"))?;
    let stdout = child.stdout.take().ok_or("No renderer output")?;
    let mut stderr = child.stderr.take().ok_or("No renderer output")?;
    *app.state::<Studio>().child.lock().unwrap() = Some(child);

    let handle = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        // Collect errors on another thread, so a chatty stderr can't block the renderer.
        let errors = std::thread::spawn(move || {
            let mut text = String::new();
            let _ = stderr.read_to_string(&mut text);
            text
        });
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            let Ok(update) = serde_json::from_str::<Value>(&line) else { continue };
            if let Some(progress) = update["progress"].as_f64() {
                let _ = handle.emit("studio-render-progress", progress);
            } else if let Some(download) = update["download"].as_f64() {
                let _ = handle.emit("studio-browser-download", download);
            }
        }
        let errors = errors.join().unwrap_or_default();
        let status = handle.state::<Studio>().child.lock().unwrap().take().map(|mut child| child.wait());
        (status, errors)
    })
    .await
    .map_err(|e| e.to_string())?;

    let (status, errors) = result;
    let _ = std::fs::write(log_dir.join("studio-render.log"), &errors);
    match status {
        Some(Ok(status)) if status.success() => Ok(()),
        // Cancelled: the child was taken and killed by `studio_render_cancel`.
        None => Err("cancelled".into()),
        // The renderer's own words say what to do (connect and export again).
        Some(Ok(status)) if status.code() == Some(NO_BROWSER) => {
            let lines: Vec<&str> = errors.lines().filter(|l| !l.trim().is_empty()).collect();
            Err(lines[lines.len().saturating_sub(2)..].join("\n"))
        }
        _ => {
            let last = errors.lines().filter(|l| !l.trim().is_empty()).rev().take(6).collect::<Vec<_>>().into_iter().rev().collect::<Vec<_>>().join("\n");
            Err(format!("A motion scene couldn't be rendered.\n{last}"))
        }
    }
}

/// Looks at a product's web page (screenshots down the page, logo, share image, colour, text) for
/// a launch video, saving the images in the project's images/ folder. Returns the renderer's
/// `capture` report: file names are relative to images/.
#[tauri::command]
pub async fn studio_capture_url(app: AppHandle, url: String, project: String) -> Result<Value, String> {
    let url = reqwest::Url::parse(url.trim()).map_err(|_| "That isn't a web address".to_string())?;
    if !matches!(url.scheme(), "http" | "https") {
        return Err("Enter a web address starting with http:// or https://".into());
    }
    let images = project_dir(&app, &project)?.join("images");
    std::fs::create_dir_all(&images).map_err(|e| e.to_string())?;
    let prefix = format!("capture-{}-", chrono::Local::now().timestamp_millis());
    let renderer = renderer(&app)?;
    let node = find_node()?;
    let work = work_dir(&app, &renderer)?;
    let script = renderer.dir.join("render.mjs");
    let output = tauri::async_runtime::spawn_blocking(move || {
        Command::new(node)
            .arg(script)
            .args(["--capture", url.as_str(), "--out"])
            .arg(images)
            .args(["--prefix", &prefix])
            .current_dir(work)
            .stdin(Stdio::null())
            .output()
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| format!("Could not start the page capture: {e}"))?;
    let errors = String::from_utf8_lossy(&output.stderr);
    let last = |count: usize| errors.lines().filter(|l| !l.trim().is_empty()).rev().take(count).collect::<Vec<_>>().into_iter().rev().collect::<Vec<_>>().join("\n");
    if !output.status.success() {
        return Err(if output.status.code() == Some(NO_BROWSER) { last(2) } else { last(3) });
    }
    String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter_map(|line| serde_json::from_str::<Value>(line).ok())
        .find_map(|v| v.get("capture").cloned())
        .ok_or_else(|| "The page capture returned nothing".to_string())
}

#[tauri::command]
pub fn studio_render_cancel(studio: State<'_, Studio>) {
    if let Some(mut child) = studio.child.lock().unwrap().take() {
        let _ = child.kill();
        let _ = child.wait();
    }
}
