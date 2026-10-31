//! AI editing: a language model on this Mac turns a request like "cut the part about pricing"
//! into edits. It runs with llama.cpp's server, bundled with Capturita and started in the
//! background on a local port only while it's needed. Models download once; Settings picks one.

use std::io::Write;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager, State};

pub struct Model {
    id: &'static str,
    name: &'static str,
    file: &'static str,
    url: &'static str,
    size_mb: u32,
    min_ram_gb: u64,
    note: &'static str,
}

/// Models that follow the edit format reliably, 4-bit GGUFs. The first is the default on small Macs (see `active_model`).
const MODELS: [Model; 4] = [
    Model {
        id: "qwen3-4b",
        name: "Qwen3 4B",
        file: "qwen3-4b-instruct-2507-q4_k_m.gguf",
        url: "https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF/resolve/main/Qwen3-4B-Instruct-2507-Q4_K_M.gguf",
        size_mb: 2382,
        min_ram_gb: 8,
        note: "Quick, and good at most edits. Runs on any Apple silicon Mac.",
    },
    Model {
        id: "gemma-4-12b",
        name: "Gemma 4 12B",
        file: "gemma-4-12b-it-qat-ud-q4_k_xl.gguf",
        url: "https://huggingface.co/unsloth/gemma-4-12B-it-qat-GGUF/resolve/main/gemma-4-12B-it-qat-UD-Q4_K_XL.gguf",
        size_mb: 6405,
        min_ram_gb: 16,
        note: "Follows longer, more detailed requests more closely. Slower.",
    },
    Model {
        id: "gemma-4-26b-a4b",
        name: "Gemma 4 26B A4B",
        file: "gemma-4-26b-a4b-it-qat-ud-q4_k_xl.gguf",
        url: "https://huggingface.co/unsloth/gemma-4-26B-A4B-it-qat-GGUF/resolve/main/gemma-4-26B-A4B-it-qat-UD-Q4_K_XL.gguf",
        size_mb: 14250,
        min_ram_gb: 32,
        note: "Large but quick: only 4B of its parameters work on each word. Better scene writing.",
    },
    Model {
        id: "qwen3.8-27b",
        name: "Qwen3.8 27B",
        file: "qwen3.8-27b-ud-q4_k_m.gguf",
        url: "https://huggingface.co/unsloth/Qwen3.8-27B-GGUF/resolve/main/Qwen3.8-27B-UD-Q4_K_M.gguf",
        size_mb: 16460,
        min_ram_gb: 32,
        note: "The most capable here, best for long requests and whole-video drafts. Slowest.",
    },
];
const SETTINGS_FILE: &str = "ai-settings.json";
/// Room for the transcript of a long recording (~30 minutes of speech).
const CONTEXT_TOKENS: u32 = 16384;
const START_TIMEOUT: Duration = Duration::from_secs(90);
/// The model holds 3–16 GB of memory; give it back after this long without a request.
const IDLE_STOP: Duration = Duration::from_secs(10 * 60);

struct Running {
    child: Child,
    port: u16,
    model: &'static str,
}

#[derive(Default)]
pub struct Ai {
    running: Mutex<Option<Running>>,
    last_used: Mutex<Option<Instant>>,
    downloading: Mutex<Option<&'static str>>,
    cancel: Arc<AtomicBool>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStatus {
    id: &'static str,
    name: &'static str,
    downloaded: bool,
    size_mb: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    id: &'static str,
    name: &'static str,
    note: &'static str,
    size_mb: u32,
    min_ram_gb: u64,
    downloaded: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Models {
    models: Vec<ModelInfo>,
    active: &'static str,
    /// The model downloading right now, if any.
    downloading: Option<&'static str>,
    ram_gb: u64,
}

/// One request to the model: instructions, the recording's details, and the JSON shape to answer in.
#[derive(Deserialize)]
pub struct EditRequest {
    system: String,
    user: String,
    schema: Value,
    /// Defaults to 0.2: edits should follow the request, not be creative.
    temperature: Option<f32>,
    /// Defaults to 1500.
    max_tokens: Option<u32>,
    /// JPEG pictures (base64) for the model to look at. Only Claude can; the local model ignores them.
    #[serde(default)]
    images: Vec<String>,
}

fn model(id: &str) -> Result<&'static Model, String> {
    MODELS.iter().find(|m| m.id == id).ok_or_else(|| format!("Unknown AI model: {id}"))
}

fn model_path(app: &AppHandle, model: &Model) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("models");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(model.file))
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(SETTINGS_FILE))
}

/// All saved settings (model, provider); empty when there are none yet.
fn read_settings(app: &AppHandle) -> Value {
    settings_path(app)
        .ok()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|text| serde_json::from_str::<Value>(&text).ok())
        .filter(Value::is_object)
        .unwrap_or_else(|| json!({}))
}

/// Changes one setting and keeps the rest.
fn write_setting(app: &AppHandle, key: &str, value: Value) -> Result<(), String> {
    let mut settings = read_settings(app);
    settings[key] = value;
    std::fs::write(settings_path(app)?, settings.to_string()).map_err(|e| e.to_string())
}

/// The model chosen in Settings (the default until one is chosen).
fn active_model(app: &AppHandle) -> &'static Model {
    let chosen = settings_path(app)
        .ok()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|text| serde_json::from_str::<Value>(&text).ok())
        .and_then(|v| v["model"].as_str().map(str::to_string));
    // Until one is chosen: one already downloaded (so an existing install keeps working), else the 12B on
    // Macs with 16 GB or more (it follows the scene formats better), else the 4B.
    let default = if ram_gb() >= MODELS[1].min_ram_gb { &MODELS[1] } else { &MODELS[0] };
    let fallback = MODELS.iter().find(|m| model_path(app, m).is_ok_and(|p| p.exists())).unwrap_or(default);
    chosen.and_then(|id| model(&id).ok()).unwrap_or(fallback)
}

/// The Mac's memory in GB.
fn ram_gb() -> u64 {
    extern "C" {
        fn sysctlbyname(name: *const std::ffi::c_char, old: *mut std::ffi::c_void, oldlen: *mut usize, new: *const std::ffi::c_void, newlen: usize) -> i32;
    }
    let mut bytes: u64 = 0;
    let mut len = std::mem::size_of::<u64>();
    let ok = unsafe { sysctlbyname(c"hw.memsize".as_ptr(), &mut bytes as *mut u64 as *mut _, &mut len, std::ptr::null(), 0) } == 0;
    if ok {
        bytes / (1 << 30)
    } else {
        8
    }
}

fn progress(app: &AppHandle, value: f32) {
    let _ = app.emit("ai-progress", value);
}

impl Ai {
    /// Port of a running server, if it's still alive.
    fn alive_port(&self) -> Option<u16> {
        let mut running = self.running.lock().unwrap();
        let r = running.as_mut()?;
        match r.child.try_wait() {
            Ok(None) => Some(r.port),
            _ => {
                *running = None;
                None
            }
        }
    }

    pub fn stop(&self) {
        if let Some(mut r) = self.running.lock().unwrap().take() {
            let _ = r.child.kill();
            let _ = r.child.wait();
        }
    }

    /// Stops the server once it has been idle for a while (called periodically).
    pub fn stop_if_idle(&self) {
        let idle = self.last_used.lock().unwrap().is_some_and(|t| t.elapsed() >= IDLE_STOP);
        if idle && self.alive_port().is_some() {
            self.stop();
        }
    }

    /// Starts the bundled server with the model and waits until it's ready.
    async fn ensure_server(&self, app: &AppHandle) -> Result<u16, String> {
        *self.last_used.lock().unwrap() = Some(Instant::now());
        let active = active_model(app);
        if let Some(port) = self.alive_port() {
            if self.running.lock().unwrap().as_ref().is_some_and(|r| r.model == active.id) {
                return Ok(port);
            }
            // A different model was chosen in Settings since this one started.
            self.stop();
        }
        let model = model_path(app, active)?;
        if !model.exists() {
            return Err(format!("{} isn't downloaded yet. Download it in Settings → AI editing.", active.name));
        }
        // Sidecars sit next to Capturita's own executable.
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let server = exe.parent().ok_or("No app folder")?.join("llama-server");
        if !server.exists() {
            return Err("AI editing is missing from this copy of Capturita".into());
        }
        let port = std::net::TcpListener::bind("127.0.0.1:0").and_then(|l| l.local_addr()).map_err(|e| e.to_string())?.port();
        let log_path = app.path().app_log_dir().map_err(|e| e.to_string())?;
        std::fs::create_dir_all(&log_path).map_err(|e| e.to_string())?;
        let log = std::fs::File::create(log_path.join("llama-server.log")).map_err(|e| e.to_string())?;
        let child = Command::new(server)
            .args(["--model", &model.to_string_lossy()])
            .args(["--host", "127.0.0.1", "--port", &port.to_string()])
            .args(["--ctx-size", &CONTEXT_TOKENS.to_string(), "--n-gpu-layers", "999", "--parallel", "1", "--jinja"])
            // Edits should come straight away, not after the model thinks out loud.
            .args(["--reasoning-budget", "0"])
            .stdin(Stdio::null())
            .stdout(log.try_clone().map_err(|e| e.to_string())?)
            .stderr(log)
            .spawn()
            .map_err(|e| format!("Could not start the AI: {e}"))?;
        *self.running.lock().unwrap() = Some(Running { child, port, model: active.id });

        let started = Instant::now();
        while started.elapsed() < START_TIMEOUT {
            if self.alive_port().is_none() {
                return Err("The AI stopped while starting".into());
            }
            let health = reqwest::get(format!("http://127.0.0.1:{port}/health")).await;
            if health.is_ok_and(|r| r.status().is_success()) {
                return Ok(port);
            }
            tokio::time::sleep(Duration::from_millis(200)).await;
        }
        self.stop();
        Err("The AI took too long to start".into())
    }
}

/// The model AI editing uses now.
#[tauri::command]
pub fn ai_model_status(app: AppHandle) -> Result<ModelStatus, String> {
    let m = active_model(&app);
    Ok(ModelStatus { id: m.id, name: m.name, downloaded: model_path(&app, m)?.exists(), size_mb: m.size_mb })
}

/// Every model, for Settings.
#[tauri::command]
pub fn ai_models(app: AppHandle, ai: State<'_, Ai>) -> Result<Models, String> {
    let models = MODELS
        .iter()
        .map(|m| Ok(ModelInfo { id: m.id, name: m.name, note: m.note, size_mb: m.size_mb, min_ram_gb: m.min_ram_gb, downloaded: model_path(&app, m)?.exists() }))
        .collect::<Result<_, String>>()?;
    Ok(Models { models, active: active_model(&app).id, downloading: *ai.downloading.lock().unwrap(), ram_gb: ram_gb() })
}

/// Chooses the model AI editing uses. A running model is stopped, so the next request uses the new one.
#[tauri::command]
pub fn set_ai_model(app: AppHandle, ai: State<'_, Ai>, id: String) -> Result<(), String> {
    let m = model(&id)?;
    write_setting(&app, "model", json!(m.id))?;
    if ai.running.lock().unwrap().as_ref().is_some_and(|r| r.model != m.id) {
        ai.stop();
    }
    Ok(())
}

/// Deletes a downloaded model to free disk space.
#[tauri::command]
pub fn delete_ai_model(app: AppHandle, ai: State<'_, Ai>, id: String) -> Result<(), String> {
    let m = model(&id)?;
    if *ai.downloading.lock().unwrap() == Some(m.id) {
        return Err("Cancel the download first.".into());
    }
    if ai.running.lock().unwrap().as_ref().is_some_and(|r| r.model == m.id) {
        ai.stop();
    }
    match std::fs::remove_file(model_path(&app, m)?) {
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(e.to_string()),
        _ => Ok(()),
    }
}

/// Downloads a model once (the chosen one if no `id`), with `ai-progress` events (0–1).
/// Cancel with `cancel_ai_download`.
#[tauri::command]
pub async fn download_ai_model(app: AppHandle, ai: State<'_, Ai>, id: Option<String>) -> Result<(), String> {
    let m = match id {
        Some(id) => model(&id)?,
        None => active_model(&app),
    };
    let path = model_path(&app, m)?;
    if path.exists() {
        return Ok(());
    }
    {
        let mut downloading = ai.downloading.lock().unwrap();
        if downloading.is_some() {
            return Err("Another AI model is already downloading".into());
        }
        *downloading = Some(m.id);
    }
    ai.cancel.store(false, Ordering::SeqCst);
    let result = async {
        let part = path.with_extension("part");
        let mut response = reqwest::get(m.url).await.map_err(|e| format!("Could not download the AI model: {e}"))?;
        if !response.status().is_success() {
            return Err(format!("Could not download the AI model ({})", response.status()));
        }
        let total = response.content_length().unwrap_or(0);
        let mut file = std::fs::File::create(&part).map_err(|e| e.to_string())?;
        let (mut done, mut reported) = (0u64, 0u64);
        progress(&app, 0.0);
        while let Some(chunk) = response.chunk().await.map_err(|e| format!("The AI model download failed: {e}"))? {
            if ai.cancel.load(Ordering::SeqCst) {
                drop(file);
                let _ = std::fs::remove_file(&part);
                return Err("Cancelled".into());
            }
            file.write_all(&chunk).map_err(|e| e.to_string())?;
            done += chunk.len() as u64;
            if done - reported >= 4 << 20 && total > 0 {
                reported = done;
                progress(&app, done as f32 / total as f32);
            }
        }
        file.flush().map_err(|e| e.to_string())?;
        if total > 0 && done != total {
            let _ = std::fs::remove_file(&part);
            return Err("The AI model download was incomplete. Please try again.".into());
        }
        std::fs::rename(&part, &path).map_err(|e| e.to_string())
    }
    .await;
    *ai.downloading.lock().unwrap() = None;
    result
}

#[tauri::command]
pub fn cancel_ai_download(ai: State<'_, Ai>) {
    ai.cancel.store(true, Ordering::SeqCst);
}

// ---- Claude in the cloud (optional): better planning than a small local model. The key lives in
// the Keychain; the README and page text it works on are sent to Anthropic, so it is opt-in. ----

const CLOUD_URL: &str = "https://api.anthropic.com/v1/messages";
const CLOUD_MODEL: &str = "claude-opus-5-5";
const CLOUD_SERVICE: &str = "com.capturita.app.ai";
const CLOUD_ACCOUNT: &str = "anthropic-api-key";

fn keychain_key(account: &str) -> Option<String> {
    let bytes = security_framework::passwords::get_generic_password(CLOUD_SERVICE, account).ok()?;
    String::from_utf8(bytes).ok().filter(|key| !key.is_empty())
}

fn cloud_key() -> Option<String> {
    keychain_key(CLOUD_ACCOUNT)
}

/// Whether requests go to Claude: chosen in Settings, and a key is saved.
fn use_cloud(app: &AppHandle) -> bool {
    read_settings(app)["provider"] == "anthropic" && cloud_key().is_some()
}

/// A failed cloud request: a bad key must be fixed by the user; anything else can fall back to the local model.
enum CloudFailure {
    Key(String),
    Other(String),
}

/// Structured outputs reject length, count and range limits and need every object closed. The
/// app checks those limits itself after the answer (the local model enforces them as it writes).
fn strip_unsupported(node: &mut Value) {
    const UNSUPPORTED: [&str; 8] = ["minLength", "maxLength", "minItems", "maxItems", "minimum", "maximum", "multipleOf", "pattern"];
    let Some(map) = node.as_object_mut() else { return };
    for key in UNSUPPORTED {
        map.remove(key);
    }
    if map.contains_key("properties") || map.get("type").is_some_and(|t| t == "object") {
        map.insert("additionalProperties".into(), Value::Bool(false));
    }
    // `properties` maps names to schemas: the names themselves are never keywords.
    if let Some(properties) = map.get_mut("properties").and_then(Value::as_object_mut) {
        properties.values_mut().for_each(strip_unsupported);
    }
    if let Some(items) = map.get_mut("items") {
        strip_unsupported(items);
    }
    for key in ["anyOf", "allOf", "oneOf"] {
        if let Some(options) = map.get_mut(key).and_then(Value::as_array_mut) {
            options.iter_mut().for_each(strip_unsupported);
        }
    }
    for key in ["$defs", "definitions"] {
        if let Some(defs) = map.get_mut(key).and_then(Value::as_object_mut) {
            defs.values_mut().for_each(strip_unsupported);
        }
    }
}

/// One Messages API call. `fallbacks: "default"` lets Anthropic re-run a request its safety
/// classifiers declined on another model. No temperature: this API version rejects it.
async fn cloud_call(key: &str, mut body: Value) -> Result<Value, CloudFailure> {
    body["model"] = json!(CLOUD_MODEL);
    body["fallbacks"] = json!("default");
    let response = reqwest::Client::new()
        .post(CLOUD_URL)
        .timeout(Duration::from_secs(180))
        .header("x-api-key", key)
        .header("anthropic-version", "2026-10-21")
        .header("anthropic-beta", "server-side-fallback-2026-07-01")
        .json(&body)
        .send()
        .await
        .map_err(|e| CloudFailure::Other(format!("Claude didn't answer: {e}")))?;
    let status = response.status();
    if !status.is_success() {
        let detail = response.text().await.unwrap_or_default();
        let message = serde_json::from_str::<Value>(&detail).ok().and_then(|v| v["error"]["message"].as_str().map(str::to_string)).unwrap_or(detail);
        return Err(if status.as_u16() == 401 || status.as_u16() == 403 {
            CloudFailure::Key(format!("Claude rejected the API key ({status}): {message}"))
        } else {
            CloudFailure::Other(format!("Claude failed ({status}): {message}"))
        });
    }
    let reply: Value = response.json().await.map_err(|e| CloudFailure::Other(e.to_string()))?;
    match reply["stop_reason"].as_str() {
        Some("refusal") => Err(CloudFailure::Other("Claude declined this request".into())),
        Some("max_tokens") => Err(CloudFailure::Other("Claude's answer was cut off".into())),
        _ => Ok(reply),
    }
}

/// The user message: the pictures (if any), then the text.
fn user_content(request: &EditRequest) -> Value {
    if request.images.is_empty() {
        return json!(request.user);
    }
    let mut blocks: Vec<Value> = request
        .images
        .iter()
        .map(|data| json!({ "type": "image", "source": { "type": "base64", "media_type": "image/jpeg", "data": data } }))
        .collect();
    blocks.push(json!({ "type": "text", "text": request.user }));
    Value::Array(blocks)
}

async fn cloud_edit(key: &str, request: &EditRequest) -> Result<Value, CloudFailure> {
    let mut schema = request.schema.clone();
    strip_unsupported(&mut schema);
    // Thinking is always on for this model and counts against max_tokens, so leave it room.
    let max_tokens = (request.max_tokens.unwrap_or(1500) * 4).clamp(8000, 16000);
    let reply = cloud_call(
        key,
        json!({
            "max_tokens": max_tokens,
            "system": request.system,
            "messages": [{ "role": "user", "content": user_content(request) }],
            "output_config": { "effort": "medium", "format": { "type": "json_schema", "schema": schema } },
        }),
    )
    .await?;
    let text: String = reply["content"].as_array().into_iter().flatten().filter(|b| b["type"] == "text").filter_map(|b| b["text"].as_str()).collect();
    serde_json::from_str(&text).map_err(|e| CloudFailure::Other(format!("Claude's answer couldn't be read: {e}")))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudStatus {
    enabled: bool,
    has_key: bool,
    model: &'static str,
}

#[tauri::command]
pub fn ai_cloud_status(app: AppHandle) -> CloudStatus {
    CloudStatus { enabled: read_settings(&app)["provider"] == "anthropic", has_key: cloud_key().is_some(), model: CLOUD_MODEL }
}

/// Turns Claude on or off. A new key is tried with a tiny request before it is saved.
#[tauri::command]
pub async fn ai_cloud_save(app: AppHandle, enabled: bool, key: Option<String>) -> Result<(), String> {
    if let Some(key) = key.as_deref().map(str::trim).filter(|k| !k.is_empty()) {
        let probe = json!({ "max_tokens": 1024, "messages": [{ "role": "user", "content": "Reply with OK." }], "output_config": { "effort": "low" } });
        cloud_call(key, probe).await.map_err(|e| match e {
            CloudFailure::Key(m) | CloudFailure::Other(m) => m,
        })?;
        security_framework::passwords::set_generic_password(CLOUD_SERVICE, CLOUD_ACCOUNT, key.as_bytes()).map_err(|e| format!("Couldn't save to the Keychain: {e}"))?;
    }
    if enabled && cloud_key().is_none() {
        return Err("Add your Claude API key first.".into());
    }
    write_setting(&app, "provider", json!(if enabled { "anthropic" } else { "local" }))
}

/// Forgets the key and goes back to the local model.
#[tauri::command]
pub fn ai_cloud_remove_key(app: AppHandle) -> Result<(), String> {
    let _ = security_framework::passwords::delete_generic_password(CLOUD_SERVICE, CLOUD_ACCOUNT);
    write_setting(&app, "provider", json!("local"))
}

// ---- Any OpenAI-compatible cloud (OpenAI, Gemini, OpenRouter, Ollama…): base URL + model + key. ----

const OPENAI_ACCOUNT: &str = "openai-compatible-key";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenAiStatus {
    enabled: bool,
    has_key: bool,
    base_url: String,
    model: String,
}

#[tauri::command]
pub fn ai_openai_status(app: AppHandle) -> OpenAiStatus {
    let settings = read_settings(&app);
    OpenAiStatus {
        enabled: settings["provider"] == "openai",
        has_key: keychain_key(OPENAI_ACCOUNT).is_some(),
        base_url: settings["openaiBaseUrl"].as_str().unwrap_or("https://api.openai.com/v1").to_string(),
        model: settings["openaiModel"].as_str().unwrap_or("").to_string(),
    }
}

/// One chat-completions call. Only a bad key (401/403) is a user-fixable failure.
async fn openai_call(base_url: &str, key: &str, mut body: Value, model: &str) -> Result<Value, CloudFailure> {
    body["model"] = json!(model);
    let response = reqwest::Client::new()
        .post(format!("{}/chat/completions", base_url.trim_end_matches('/')))
        .timeout(Duration::from_secs(180))
        .bearer_auth(key)
        .json(&body)
        .send()
        .await
        .map_err(|e| CloudFailure::Other(format!("The cloud model didn't answer: {e}")))?;
    let status = response.status();
    if !status.is_success() {
        let detail = response.text().await.unwrap_or_default();
        let message = serde_json::from_str::<Value>(&detail).ok().and_then(|v| v["error"]["message"].as_str().map(str::to_string)).unwrap_or(detail);
        return Err(if status.as_u16() == 401 || status.as_u16() == 403 {
            CloudFailure::Key(format!("The API key was rejected ({status}): {message}"))
        } else {
            CloudFailure::Other(format!("The cloud model failed ({status}): {message}"))
        });
    }
    response.json().await.map_err(|e| CloudFailure::Other(e.to_string()))
}

async fn openai_edit(app: &AppHandle, key: &str, request: &EditRequest) -> Result<Value, CloudFailure> {
    let settings = read_settings(app);
    let base_url = settings["openaiBaseUrl"].as_str().unwrap_or_default();
    let model = settings["openaiModel"].as_str().unwrap_or_default();
    let mut schema = request.schema.clone();
    strip_unsupported(&mut schema);
    let user: Value = if request.images.is_empty() {
        json!(request.user)
    } else {
        let mut parts: Vec<Value> =
            request.images.iter().map(|data| json!({ "type": "image_url", "image_url": { "url": format!("data:image/jpeg;base64,{data}") } })).collect();
        parts.push(json!({ "type": "text", "text": request.user }));
        Value::Array(parts)
    };
    // No temperature or token limit: reasoning models reject them, and the defaults are generous.
    let reply = openai_call(
        base_url,
        key,
        json!({
            "messages": [{ "role": "system", "content": request.system }, { "role": "user", "content": user }],
            "response_format": { "type": "json_schema", "json_schema": { "name": "edits", "schema": schema } },
        }),
        model,
    )
    .await?;
    let content = reply["choices"][0]["message"]["content"].as_str().ok_or_else(|| CloudFailure::Other("The cloud model gave an empty answer".into()))?;
    serde_json::from_str(content).map_err(|e| CloudFailure::Other(format!("The cloud model's answer couldn't be read: {e}")))
}

/// Saves the endpoint and turns it on or off. A new key is tried with a tiny request first.
#[tauri::command]
pub async fn ai_openai_save(app: AppHandle, enabled: bool, base_url: String, model: String, key: Option<String>) -> Result<(), String> {
    let (base_url, model) = (base_url.trim().to_string(), model.trim().to_string());
    if enabled && (base_url.is_empty() || model.is_empty()) {
        return Err("Fill in the base URL and the model name.".into());
    }
    if let Some(key) = key.as_deref().map(str::trim).filter(|k| !k.is_empty()) {
        if base_url.is_empty() || model.is_empty() {
            return Err("Fill in the base URL and the model name.".into());
        }
        let probe = json!({ "messages": [{ "role": "user", "content": "Reply with OK." }] });
        openai_call(&base_url, key, probe, &model).await.map_err(|e| match e {
            CloudFailure::Key(m) | CloudFailure::Other(m) => m,
        })?;
        security_framework::passwords::set_generic_password(CLOUD_SERVICE, OPENAI_ACCOUNT, key.as_bytes()).map_err(|e| format!("Couldn't save to the Keychain: {e}"))?;
    }
    if enabled && keychain_key(OPENAI_ACCOUNT).is_none() {
        return Err("Add your API key first.".into());
    }
    write_setting(&app, "openaiBaseUrl", json!(base_url))?;
    write_setting(&app, "openaiModel", json!(model))?;
    write_setting(&app, "provider", json!(if enabled { "openai" } else { "local" }))
}

#[tauri::command]
pub fn ai_openai_remove_key(app: AppHandle) -> Result<(), String> {
    let _ = security_framework::passwords::delete_generic_password(CLOUD_SERVICE, OPENAI_ACCOUNT);
    write_setting(&app, "provider", json!("local"))
}

/// Asks Cloudflare's Clef decision model typed questions about `state`. Returns the raw `answers`
/// object keyed by question id; the keychain holds the Workers AI token and account id.
#[tauri::command]
pub async fn ai_decide(state: String, questions: Value) -> Result<Value, String> {
    crate::license::require_pro()?;
    let token = keychain_key("cloudflare-api-token").ok_or("No Cloudflare token saved")?;
    let account = keychain_key("cloudflare-account-id").ok_or("No Cloudflare account id saved")?;
    let response = reqwest::Client::new()
        .post(format!("https://api.cloudflare.com/client/v4/accounts/{account}/ai/run/@cf/cloudflare/clef-flash"))
        .timeout(Duration::from_secs(30))
        .bearer_auth(token)
        .json(&json!({ "model": "clef-flash", "state": state, "questions": questions }))
        .send()
        .await
        .map_err(|e| format!("Clef didn't answer: {e}"))?;
    let status = response.status();
    let reply: Value = response.json().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("Clef failed ({status}): {reply}"));
    }
    // Workers AI wraps the model's output in `result`.
    let out = if reply["result"].is_null() { &reply } else { &reply["result"] };
    Ok(out["answers"].clone())
}

/// Asks the model for edits. Its answer is forced into `schema` (llama.cpp turns the JSON schema
/// into a grammar), so it's always valid JSON in the expected shape.
#[tauri::command]
pub async fn ai_edit(app: AppHandle, ai: State<'_, Ai>, request: EditRequest) -> Result<Value, String> {
    crate::license::require_pro()?;
    // Tells the UI who planned this, so a silent fallback to the local model is never a surprise.
    let announce = |by: &str, detail: &str| {
        let _ = app.emit("ai-planner", json!({ "by": by, "detail": detail }));
    };
    let mut fell_back: Option<(&str, String)> = None;
    if let Some(key) = cloud_key().filter(|_| use_cloud(&app)) {
        match cloud_edit(&key, &request).await {
            Ok(answer) => {
                announce("Claude", CLOUD_MODEL);
                return Ok(answer);
            }
            Err(CloudFailure::Key(message)) => return Err(message),
            // Offline, rate limited or declined: the local model can still do the job.
            Err(CloudFailure::Other(message)) => fell_back = Some(("Claude", message)),
        }
    }
    if let Some(key) = keychain_key(OPENAI_ACCOUNT).filter(|_| read_settings(&app)["provider"] == "openai") {
        match openai_edit(&app, &key, &request).await {
            Ok(answer) => {
                let settings = read_settings(&app);
                announce("Cloud", settings["openaiModel"].as_str().unwrap_or_default());
                return Ok(answer);
            }
            Err(CloudFailure::Key(message)) => return Err(message),
            Err(CloudFailure::Other(message)) => fell_back = Some(("Cloud", message)),
        }
    }
    let port = match ai.ensure_server(&app).await {
        Ok(port) => port,
        // The local model can't take over: say why the cloud one failed, not only why this one can't run.
        Err(local) => return Err(match &fell_back {
            Some((cloud, why)) => format!("{cloud} failed: {why} (and the local AI isn't available: {local})"),
            None => local,
        }),
    };
    let body = json!({
        "messages": [
            { "role": "system", "content": request.system },
            { "role": "user", "content": request.user },
        ],
        "temperature": request.temperature.unwrap_or(0.2).clamp(0.0, 1.5),
        "max_tokens": request.max_tokens.unwrap_or(1500).clamp(64, 4096),
        "response_format": { "type": "json_schema", "json_schema": { "name": "edits", "schema": request.schema } },
    });
    let client = reqwest::Client::new();
    let response = client
        .post(format!("http://127.0.0.1:{port}/v1/chat/completions"))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("The AI didn't answer: {e}"))?;
    if !response.status().is_success() {
        let status = response.status();
        return Err(format!("The AI failed ({status}): {}", response.text().await.unwrap_or_default()));
    }
    let reply: Value = response.json().await.map_err(|e| e.to_string())?;
    *ai.last_used.lock().unwrap() = Some(Instant::now());
    match &fell_back {
        Some((cloud, why)) => announce("Local (fallback)", &format!("{cloud} failed: {why}")),
        None => announce("Local", active_model(&app).name),
    }
    let content = reply["choices"][0]["message"]["content"].as_str().ok_or("The AI gave an empty answer")?;
    serde_json::from_str(content).map_err(|e| format!("The AI's answer couldn't be read: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_limits_and_closes_objects_but_keeps_property_names() {
        let mut schema = json!({
            "type": "object",
            "required": ["maxLength"],
            "properties": {
                "maxLength": { "type": "string", "maxLength": 20, "pattern": "^#" },
                "list": { "type": "array", "maxItems": 3, "items": { "type": "object", "properties": { "n": { "type": "number", "minimum": 0 } } } },
                "kind": { "enum": ["a", "b"] },
            }
        });
        strip_unsupported(&mut schema);
        assert_eq!(schema["additionalProperties"], false);
        assert_eq!(schema["properties"]["maxLength"], json!({ "type": "string" }));
        assert!(schema["properties"]["list"].get("maxItems").is_none());
        assert_eq!(schema["properties"]["list"]["items"]["additionalProperties"], false);
        assert!(schema["properties"]["list"]["items"]["properties"]["n"].get("minimum").is_none());
        assert_eq!(schema["properties"]["kind"]["enum"], json!(["a", "b"]));
    }
}
