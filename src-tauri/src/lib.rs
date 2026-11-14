//! PlantUMLDraw のバックエンド。
//!
//! 方針（docs/test-strategy.md 6章）：ロジックは Tauri に依存しない純粋な関数としてモジュールに置き、
//! `#[tauri::command]` は薄いラッパーにとどめる。

pub mod app_info;
pub mod document;
pub mod file_type;
pub mod renderer;
pub mod settings;

use app_info::AppInfo;
use document::{DocumentError, LoadedDocument, TextFormat};
use renderer::{LocalJarRenderer, RenderError, Renderer};
use serde::Serialize;
use settings::Settings;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{Manager, State};

struct AppState {
    settings: Mutex<Settings>,
    settings_path: PathBuf,
    bundled_jar: Option<PathBuf>,
    /// コマンドライン引数で渡されたファイル（起動時に開く）
    initial_file: Option<String>,
}

impl AppState {
    fn renderer(&self) -> Result<LocalJarRenderer, RenderError> {
        let s = self.settings.lock().unwrap().clone();
        let java = renderer::resolve_java(s.java_path.as_deref(), std::env::var_os("JAVA_HOME"));
        let jar = renderer::resolve_jar(
            s.plantuml_jar.as_deref(),
            std::env::var_os("PLANTUML_JAR"),
            self.bundled_jar.clone(),
        )
        .ok_or_else(|| RenderError::JarNotFound {
            path: "（未設定）".into(),
        })?;
        Ok(LocalJarRenderer::new(java, jar))
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RendererStatus {
    java_path: String,
    java_version: Result<String, RenderError>,
    jar_path: Option<String>,
    jar_found: bool,
}

#[tauri::command]
fn app_info() -> AppInfo {
    AppInfo::current()
}

#[tauri::command]
fn initial_file(state: State<'_, AppState>) -> Option<String> {
    state.initial_file.clone()
}

#[tauri::command]
fn open_document(path: String) -> Result<LoadedDocument, DocumentError> {
    document::load(Path::new(&path))
}

#[tauri::command]
fn save_document(path: String, content: String, format: TextFormat) -> Result<(), DocumentError> {
    document::save(Path::new(&path), &content, format)
}

/// 描画は時間がかかるため、UI を止めないよう別スレッドで実行する
#[tauri::command]
async fn render(source: String, state: State<'_, AppState>) -> Result<String, RenderError> {
    let r = state.renderer()?;
    tauri::async_runtime::spawn_blocking(move || r.render(&source))
        .await
        .map_err(|e| RenderError::Failed {
            message: e.to_string(),
        })?
}

#[tauri::command]
async fn renderer_status(state: State<'_, AppState>) -> Result<RendererStatus, String> {
    let s = state.settings.lock().unwrap().clone();
    let java = renderer::resolve_java(s.java_path.as_deref(), std::env::var_os("JAVA_HOME"));
    let jar = state.renderer().ok().map(|r| r.jar);
    tauri::async_runtime::spawn_blocking(move || RendererStatus {
        java_version: renderer::java_version(&java),
        java_path: java.display().to_string(),
        jar_found: jar.as_ref().is_some_and(|j| j.is_file()),
        jar_path: jar.map(|j| j.display().to_string()),
    })
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_settings(state: State<'_, AppState>) -> Settings {
    state.settings.lock().unwrap().clone()
}

#[tauri::command]
fn set_settings(settings: Settings, state: State<'_, AppState>) -> Result<Settings, String> {
    let settings = settings.normalized();
    settings::save(&state.settings_path, &settings)
        .map_err(|e| format!("設定を保存できません: {e}"))?;
    *state.settings.lock().unwrap() = settings.clone();
    Ok(settings)
}

/// コマンドライン引数から開くファイルを取り出す（先頭の存在するファイル）。
///
/// Windows の E2E テストでは msedgedriver が引数を `--c:\path\file.puml` のように
/// 「`--` 付き・小文字」に変えて渡すため、その形も受け付ける（Windows のパスは大文字小文字を区別しない）。
fn initial_file_from_args(args: impl IntoIterator<Item = String>) -> Option<String> {
    args.into_iter().skip(1).find_map(|a| {
        [a.as_str(), a.trim_start_matches("--")]
            .into_iter()
            .find(|p| !p.is_empty() && Path::new(p).is_file())
            .map(str::to_string)
    })
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let settings_path = app.path().app_config_dir()?.join("settings.json");
            let bundled_jar = app
                .path()
                .resource_dir()
                .ok()
                .map(|d| d.join("plantuml.jar"));
            app.manage(AppState {
                settings: Mutex::new(settings::load(&settings_path)),
                settings_path,
                bundled_jar,
                initial_file: initial_file_from_args(std::env::args()),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_info,
            initial_file,
            open_document,
            save_document,
            render,
            renderer_status,
            get_settings,
            set_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn initial_file_skips_program_name_and_missing_paths() {
        let existing = tempfile::NamedTempFile::new().unwrap();
        let existing = existing.path().to_string_lossy().into_owned();
        assert_eq!(
            initial_file_from_args(vec![
                "app.exe".into(),
                "no/such.puml".into(),
                existing.clone()
            ]),
            Some(existing)
        );
        assert_eq!(initial_file_from_args(vec!["app.exe".into()]), None);
    }

    #[test]
    fn initial_file_accepts_switch_style_path_from_msedgedriver() {
        let file = tempfile::NamedTempFile::new().unwrap();
        let path = file.path().to_string_lossy().into_owned();
        assert_eq!(
            initial_file_from_args(vec![
                "app.exe".into(),
                "--remote-debugging-port=9222".into(),
                format!("--{path}")
            ]),
            Some(path)
        );
    }
}
