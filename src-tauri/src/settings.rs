//! 利用者設定（JSON ファイルに保存）

use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::Path;

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    /// java 実行ファイルのパス。未設定なら JAVA_HOME → PATH の順に探す
    pub java_path: Option<String>,
    /// plantuml.jar のパス。未設定なら環境変数 PLANTUML_JAR → 同梱版の順に探す
    pub plantuml_jar: Option<String>,
}

impl Settings {
    /// 空文字や空白だけの値を「未設定」に揃える
    pub fn normalized(self) -> Self {
        fn clean(v: Option<String>) -> Option<String> {
            v.map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
        }
        Self {
            java_path: clean(self.java_path),
            plantuml_jar: clean(self.plantuml_jar),
        }
    }
}

/// 設定ファイルを読む。ファイルがない・壊れている場合は既定値を返す（起動を妨げない）
pub fn load(path: &Path) -> Settings {
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str::<Settings>(&s).ok())
        .unwrap_or_default()
        .normalized()
}

pub fn save(path: &Path, settings: &Settings) -> io::Result<()> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir)?;
    }
    let json = serde_json::to_string_pretty(settings).map_err(io::Error::other)?;
    fs::write(path, json)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_file_gives_default() {
        assert_eq!(
            load(Path::new("no/such/settings.json")),
            Settings::default()
        );
    }

    #[test]
    fn broken_file_gives_default() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        fs::write(&path, "{ not json").unwrap();
        assert_eq!(load(&path), Settings::default());
    }

    #[test]
    fn save_and_load_round_trip_in_new_directory() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nested/settings.json");
        let s = Settings {
            java_path: Some("C:\\java\\bin\\java.exe".into()),
            plantuml_jar: None,
        };
        save(&path, &s).unwrap();
        assert_eq!(load(&path), s);
        assert!(fs::read_to_string(&path).unwrap().contains("javaPath"));
    }

    #[test]
    fn blank_values_are_treated_as_unset() {
        let s = Settings {
            java_path: Some("  ".into()),
            plantuml_jar: Some(" a.jar ".into()),
        }
        .normalized();
        assert_eq!(s.java_path, None);
        assert_eq!(s.plantuml_jar.as_deref(), Some("a.jar"));
    }
}
