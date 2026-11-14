use std::path::Path;

/// PlantUML ファイルとして扱う拡張子（小文字）。フロントエンドの `src/lib/fileTypes.ts` と揃えること。
pub const PLANTUML_EXTENSIONS: &[&str] = &["puml", "plantuml", "pu", "iuml"];

/// パスが PlantUML ファイルかどうかを拡張子で判定する（大文字小文字は区別しない）
pub fn is_plantuml_file(path: impl AsRef<Path>) -> bool {
    path.as_ref()
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| PLANTUML_EXTENSIONS.contains(&e.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_plantuml_extensions() {
        for p in [
            "a.puml",
            "a.plantuml",
            "a.pu",
            "a.iuml",
            "A.PUML",
            "dir/x.Puml",
        ] {
            assert!(is_plantuml_file(p), "{p} should be accepted");
        }
    }

    #[test]
    fn rejects_other_files() {
        for p in ["a.txt", "puml", ".puml", "a.puml.bak", ""] {
            assert!(!is_plantuml_file(p), "{p} should be rejected");
        }
    }
}
