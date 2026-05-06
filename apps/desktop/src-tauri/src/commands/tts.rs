//! Optional integration with a user-installed `kokoro` TTS CLI.
//!
//! Writer is an ultralight markdown editor — we deliberately do NOT bundle,
//! download, or install third-party TTS engines. If the user has installed
//! the Python `kokoro` package themselves (e.g. via `uv tool install kokoro`
//! or `pipx install kokoro-onnx`), we detect it and offer it as an extra
//! engine in the narrator picker. If not, the engine is silently absent.
//!
//! macOS GUI apps launched from Finder/Dock do NOT inherit the shell's
//! PATH — only `/etc/paths` entries. So `which kokoro` from a packaged
//! .app would fail even when the binary exists in `~/.local/bin/`. We
//! probe a curated list of standard install locations directly, then fall
//! back to PATH lookup for unusual setups. The resolved absolute path is
//! returned to the frontend and threaded back into `kokoro_synth` so the
//! synth call doesn't re-hit the same broken PATH lookup.

use std::path::{Path, PathBuf};
use std::process::Stdio;
use tauri::{AppHandle, Manager};
use tokio::io::AsyncReadExt;
use tokio::process::Command;
use uuid::Uuid;

/// Standard locations where `kokoro` ends up depending on how it was
/// installed. Checked first because GUI-launched apps don't inherit the
/// user's shell PATH on macOS.
fn standard_kokoro_candidates() -> Vec<PathBuf> {
    let mut out = Vec::new();
    if let Ok(home) = std::env::var("HOME") {
        // uv tool install kokoro / pipx install kokoro-onnx (user install)
        out.push(PathBuf::from(&home).join(".local/bin/kokoro"));
    }
    // Apple Silicon Homebrew default
    out.push(PathBuf::from("/opt/homebrew/bin/kokoro"));
    // Intel Homebrew + classic /usr/local installs (pipx --global, manual)
    out.push(PathBuf::from("/usr/local/bin/kokoro"));
    out
}

/// Resolve the absolute path to the user's `kokoro` binary, or `None` if
/// no install can be found.
fn resolve_kokoro_path() -> Option<PathBuf> {
    for candidate in standard_kokoro_candidates() {
        if candidate.exists() {
            return Some(candidate);
        }
    }
    // Fallback: shell-out to `which` for unusual install locations on PATH.
    // Uses absolute /usr/bin/which so we don't loop on the same PATH-lookup
    // problem we're trying to work around.
    let output = std::process::Command::new("/usr/bin/which")
        .arg("kokoro")
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if raw.is_empty() {
        None
    } else {
        Some(PathBuf::from(raw))
    }
}

/// Returns the absolute path to a usable `kokoro` binary, or `None` if
/// nothing matches. The frontend caches the result for the session.
#[tauri::command]
pub async fn kokoro_probe() -> Option<String> {
    resolve_kokoro_path().map(|p| p.to_string_lossy().to_string())
}

/// Spawn `kokoro` to synthesize one block of text to a temp WAV in the app's
/// cache dir, read the bytes, delete the file, return the bytes.
///
/// `binary_path` is the value returned from `kokoro_probe` — we use the
/// absolute path explicitly so we don't re-hit macOS's GUI-PATH problem.
#[tauri::command]
pub async fn kokoro_synth(
    app: AppHandle,
    binary_path: String,
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
    let bin = Path::new(&binary_path);

    let output = Command::new(bin)
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
        .output()
        .await
        .map_err(|e| format!("spawn {}: {e}", bin.display()))?;

    if !output.status.success() {
        let _ = tokio::fs::remove_file(&out_path).await;
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "kokoro exited with {}: {}",
            output.status,
            stderr.trim()
        ));
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
