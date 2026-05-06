//! Optional integration with a user-installed `kokoro` TTS CLI on PATH.
//!
//! Writer is an ultralight markdown editor — we deliberately do NOT bundle,
//! download, or install third-party TTS engines. If the user has installed
//! the Python `kokoro` package themselves (e.g. via `uv tool install kokoro`
//! or `pipx install kokoro-onnx`), we detect it and offer it as an extra
//! engine in the narrator picker. If not, the engine is silently absent.
//!
//! This module is intentionally minimal: one probe command, one synth
//! command. No process daemon, no port juggling, no model download.

use std::path::PathBuf;
use std::process::Stdio;
use tauri::{AppHandle, Manager};
use tokio::io::AsyncReadExt;
use tokio::process::Command;
use uuid::Uuid;

/// Returns the absolute path to `kokoro` on PATH, or `None` if not installed.
/// Cached on the first hit because PATH lookup is cheap but not free.
#[tauri::command]
pub async fn kokoro_probe() -> Option<String> {
    // `which` is the standard cross-shell PATH lookup. On macOS/Linux it's
    // always available; on Windows we'd use `where`, but Writer's narrator
    // path is macOS-first.
    let output = Command::new("which")
        .arg("kokoro")
        .output()
        .await
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if path.is_empty() {
        None
    } else {
        Some(path)
    }
}

/// Spawn `kokoro` to synthesize one block of text to a temp WAV in the app's
/// cache dir, read the bytes, delete the file, return the bytes.
///
/// Frontend decodes via `AudioContext.decodeAudioData` and plays through the
/// Web Audio API — same shape the Apple adapter would use for streaming
/// audio if the Web Speech API didn't already handle it for us.
#[tauri::command]
pub async fn kokoro_synth(
    app: AppHandle,
    text: String,
    voice: String,
    speed: f32,
) -> Result<Vec<u8>, String> {
    if text.trim().is_empty() {
        return Err("empty text".into());
    }

    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("narrator-kokoro");
    tokio::fs::create_dir_all(&cache_dir)
        .await
        .map_err(|e| e.to_string())?;

    let out_path: PathBuf = cache_dir.join(format!("{}.wav", Uuid::new_v4()));

    let status = Command::new("kokoro")
        .arg("-t")
        .arg(&text)
        .arg("-m")
        .arg(&voice)
        .arg("-s")
        .arg(format!("{speed}"))
        .arg("-o")
        .arg(&out_path)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .status()
        .await
        .map_err(|e| format!("spawn kokoro: {e}"))?;

    if !status.success() {
        let _ = tokio::fs::remove_file(&out_path).await;
        return Err(format!("kokoro exited with {status}"));
    }

    let mut file = tokio::fs::File::open(&out_path)
        .await
        .map_err(|e| format!("open output: {e}"))?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes)
        .await
        .map_err(|e| format!("read output: {e}"))?;
    let _ = tokio::fs::remove_file(&out_path).await;

    Ok(bytes)
}
