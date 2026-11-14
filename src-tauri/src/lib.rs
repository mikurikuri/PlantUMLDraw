//! PlantUMLDraw のバックエンド。
//!
//! 方針（docs/test-strategy.md 5章）：ロジックは Tauri に依存しない純粋な関数としてモジュールに置き、
//! `#[tauri::command]` は薄いラッパーにとどめる。

pub mod app_info;
pub mod file_type;

use app_info::AppInfo;

#[tauri::command]
fn app_info() -> AppInfo {
    AppInfo::current()
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_info])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
