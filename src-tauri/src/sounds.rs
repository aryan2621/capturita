//! Voiceovers and sound effects. Imported voiceovers are copied straight into the project's
//! `audio/` folder. Sound effects come from the user's licensed pack in `Capturita/Sounds/`
//! (app-wide, inside the folder the webview may read); a project gets its own copy of each pack
//! sound it uses, so the project folder holds everything its mix plays.

use std::path::PathBuf;

use tauri::AppHandle;

use crate::recording::{project_dir, recordings_root};

const AUDIO_EXTENSIONS: [&str; 9] = ["mp3", "m4a", "aac", "wav", "aif", "aiff", "caf", "flac", "ogg"];

fn sounds_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = recordings_root(app)?.join("Sounds");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// The extension of an audio file name, lowercased, if it's one the webview can decode.
fn audio_extension(name: &str) -> Option<String> {
    std::path::Path::new(name)
        .extension()
        .and_then(|e| e.to_str())
        .map(str::to_ascii_lowercase)
        .filter(|e| AUDIO_EXTENSIONS.contains(&e.as_str()))
}

/// A plain file name inside one folder: no folders, nothing hidden.
fn check_name(name: &str) -> Result<(), String> {
    if !name.is_empty() && !name.starts_with('.') && !name.contains(['/', '\\']) && !name.contains("..") {
        Ok(())
    } else {
        Err("Invalid sound file".into())
    }
}

fn header_name(request: &tauri::ipc::Request<'_>) -> String {
    // URL-encoded by the webview (headers must be ASCII).
    let raw = request.headers().get("name").and_then(|v| v.to_str().ok()).unwrap_or_default();
    percent_decode(raw)
}

fn percent_decode(text: &str) -> String {
    let bytes = text.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(value) = u8::from_str_radix(&text[i + 1..i + 3], 16) {
                out.push(value);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// Copies an audio file into `<project>/audio/<kind>-<time>.<ext>` (kind is `voice` or `sfx`)
/// and returns its path inside the project.
#[tauri::command]
pub fn import_audio(app: AppHandle, request: tauri::ipc::Request<'_>) -> Result<String, String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("Expected raw bytes".into());
    };
    let header = |key: &str| request.headers().get(key).and_then(|v| v.to_str().ok()).map(str::to_string);
    let id = header("id").ok_or("Missing id header")?;
    let kind = match header("kind").as_deref() {
        Some("sfx") => "sfx",
        _ => "voice",
    };
    let ext = audio_extension(&header_name(&request)).ok_or("Choose an audio file (MP3, M4A, AAC, WAV, AIFF, FLAC)")?;
    let dir = project_dir(&app, &id)?.join("audio");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let file = format!("{kind}-{}.{ext}", chrono::Local::now().timestamp_millis());
    std::fs::write(dir.join(&file), bytes).map_err(|e| e.to_string())?;
    Ok(format!("audio/{file}"))
}

#[derive(serde::Serialize)]
pub struct Voice {
    name: String,
    /// Locale, e.g. "en_US".
    language: String,
}

/// The Mac's text-to-speech voices (`say -v ?`), sorted by name.
#[tauri::command]
pub fn speech_voices() -> Result<Vec<Voice>, String> {
    let output = std::process::Command::new("/usr/bin/say").args(["-v", "?"]).output().map_err(|e| e.to_string())?;
    // Each line: "<name, may hold spaces>  <locale>  # <sample sentence>".
    let mut voices: Vec<Voice> = String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter_map(|line| {
            let (left, _) = line.split_once('#')?;
            let (name, language) = left.trim_end().rsplit_once(char::is_whitespace)?;
            Some(Voice { name: name.trim().to_string(), language: language.to_string() })
        })
        .collect();
    voices.sort_by_key(|v| v.name.to_lowercase());
    Ok(voices)
}

/// Reads `text` aloud with a Mac voice into the project's `audio/` folder (AAC in .m4a, offline)
/// and returns the project-relative file, like an imported voiceover.
#[tauri::command]
pub async fn speak(app: AppHandle, id: String, text: String, voice: String) -> Result<String, String> {
    if text.trim().is_empty() {
        return Err("Type something for the voice to read".into());
    }
    let dir = project_dir(&app, &id)?.join("audio");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let file = format!("voice-{}.m4a", chrono::Local::now().timestamp_millis());
    let out = dir.join(&file);
    let output = tauri::async_runtime::spawn_blocking(move || {
        let mut command = std::process::Command::new("/usr/bin/say");
        if !voice.is_empty() {
            command.args(["-v", &voice]);
        }
        // "--" so a script starting with "-" isn't read as an option.
        command.arg("-o").arg(&out).args(["--file-format=m4af", "--data-format=aac", "--", &text]).output()
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| format!("Could not start the Mac's speech: {e}"))?;
    if !output.status.success() {
        return Err(format!("The voice couldn't read that: {}", String::from_utf8_lossy(&output.stderr).trim()));
    }
    Ok(format!("audio/{file}"))
}

#[derive(serde::Serialize)]
pub struct SoundPack {
    /// Absolute path of the pack folder, for previewing sounds.
    dir: String,
    /// File names in the pack, sorted.
    files: Vec<String>,
}

/// The sounds in the pack folder.
#[tauri::command]
pub fn list_sounds(app: AppHandle) -> Result<SoundPack, String> {
    let dir = sounds_dir(&app)?;
    let mut files: Vec<String> = std::fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .flatten()
        .filter(|entry| entry.path().is_file())
        .filter_map(|entry| entry.file_name().to_str().map(str::to_string))
        .filter(|name| !name.starts_with('.') && audio_extension(name).is_some())
        .collect();
    files.sort_by_key(|name| name.to_lowercase());
    Ok(SoundPack { dir: dir.to_string_lossy().into_owned(), files })
}

/// Adds a sound to the pack under its own name (with a number added if the name is taken).
/// Returns the name it got.
#[tauri::command]
pub fn import_sound(app: AppHandle, request: tauri::ipc::Request<'_>) -> Result<String, String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("Expected raw bytes".into());
    };
    let name = header_name(&request);
    let name = name.rsplit(['/', '\\']).next().unwrap_or_default().trim().to_string();
    let ext = audio_extension(&name).ok_or("Choose an audio file (MP3, M4A, AAC, WAV, AIFF, FLAC)")?;
    check_name(&name)?;
    let dir = sounds_dir(&app)?;
    let stem = std::path::Path::new(&name).file_stem().and_then(|s| s.to_str()).unwrap_or("sound").to_string();
    let mut file = name.clone();
    let mut n = 2;
    while dir.join(&file).exists() {
        file = format!("{stem} {n}.{ext}");
        n += 1;
    }
    std::fs::write(dir.join(&file), bytes).map_err(|e| e.to_string())?;
    Ok(file)
}

/// Makes sure the project has its copy of a pack sound; returns its path inside the project.
#[tauri::command]
pub fn use_sound(app: AppHandle, id: String, sound: String) -> Result<String, String> {
    check_name(&sound)?;
    let ext = audio_extension(&sound).ok_or("Invalid sound file")?;
    let source = sounds_dir(&app)?.join(&sound);
    if !source.is_file() {
        return Err("That sound is no longer in the sound pack".into());
    }
    let dir = project_dir(&app, &id)?.join("audio");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    // Spaces and other characters are kept out of the project's name so URLs stay simple.
    let stem: String = std::path::Path::new(&sound)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("sound")
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect();
    let target = format!("sfx-pack-{stem}.{ext}");
    let path = dir.join(&target);
    let same = std::fs::metadata(&path).ok().zip(std::fs::metadata(&source).ok()).is_some_and(|(a, b)| a.len() == b.len());
    if !same {
        std::fs::copy(&source, &path).map_err(|e| e.to_string())?;
    }
    Ok(format!("audio/{target}"))
}
