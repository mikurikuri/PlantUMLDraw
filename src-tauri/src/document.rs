//! テキストファイルの読み込み・保存。
//!
//! エディターの内部表現は常に LF・BOM なし。読み込み時に元の改行コードと BOM の有無を
//! [`TextFormat`] として記録し、保存時に元へ戻す（AC1-4）。

use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

const BOM: &[u8] = b"\xEF\xBB\xBF";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LineEnding {
    Lf,
    Crlf,
}

/// ファイルのバイト表現に関する情報（内容以外）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextFormat {
    pub line_ending: LineEnding,
    pub bom: bool,
}

impl Default for TextFormat {
    /// 新規ファイルは LF・BOM なし
    fn default() -> Self {
        Self {
            line_ending: LineEnding::Lf,
            bom: false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadedDocument {
    pub path: String,
    pub content: String,
    pub format: TextFormat,
}

#[derive(Debug, thiserror::Error)]
pub enum DocumentError {
    #[error("ファイルにアクセスできません: {0}")]
    Io(#[from] io::Error),
    #[error("UTF-8 のファイルではないため開けません。UTF-8 で保存し直してから開いてください。")]
    NotUtf8,
}

impl Serialize for DocumentError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

/// バイト列をエディター用の文字列（LF・BOM なし）と書式情報に分解する
pub fn decode(bytes: &[u8]) -> Result<(String, TextFormat), DocumentError> {
    let (bom, body) = match bytes.strip_prefix(BOM) {
        Some(rest) => (true, rest),
        None => (false, bytes),
    };
    let text = std::str::from_utf8(body).map_err(|_| DocumentError::NotUtf8)?;
    let line_ending = if text.contains("\r\n") {
        LineEnding::Crlf
    } else {
        LineEnding::Lf
    };
    Ok((text.replace("\r\n", "\n"), TextFormat { line_ending, bom }))
}

/// エディターの文字列を、書式情報に従ってバイト列にする
pub fn encode(content: &str, format: TextFormat) -> Vec<u8> {
    let normalized = content.replace("\r\n", "\n");
    let body = match format.line_ending {
        LineEnding::Lf => normalized,
        LineEnding::Crlf => normalized.replace('\n', "\r\n"),
    };
    let mut out = Vec::with_capacity(body.len() + BOM.len());
    if format.bom {
        out.extend_from_slice(BOM);
    }
    out.extend_from_slice(body.as_bytes());
    out
}

pub fn load(path: &Path) -> Result<LoadedDocument, DocumentError> {
    let bytes = fs::read(path)?;
    let (content, format) = decode(&bytes)?;
    Ok(LoadedDocument {
        path: path.to_string_lossy().into_owned(),
        content,
        format,
    })
}

/// 一時ファイルに書いてから置き換える（書き込み途中で失敗しても元ファイルを壊さない）
pub fn save(path: &Path, content: &str, format: TextFormat) -> Result<(), DocumentError> {
    let tmp = temp_path_for(path);
    fs::write(&tmp, encode(content, format))?;
    if let Err(e) = fs::rename(&tmp, path) {
        let _ = fs::remove_file(&tmp);
        return Err(e.into());
    }
    Ok(())
}

fn temp_path_for(path: &Path) -> PathBuf {
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();
    path.with_file_name(format!(".{name}.plantumldraw-tmp"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture(name: &str) -> PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../tests/fixtures")
            .join(name)
    }

    #[test]
    fn decode_lf_without_bom() {
        let (text, fmt) = decode(b"a\nb\n").unwrap();
        assert_eq!(text, "a\nb\n");
        assert_eq!(fmt, TextFormat::default());
    }

    #[test]
    fn decode_crlf_normalizes_to_lf() {
        let (text, fmt) = decode(b"a\r\nb\r\n").unwrap();
        assert_eq!(text, "a\nb\n");
        assert_eq!(fmt.line_ending, LineEnding::Crlf);
    }

    #[test]
    fn decode_strips_bom() {
        let (text, fmt) = decode(b"\xEF\xBB\xBF@startuml").unwrap();
        assert_eq!(text, "@startuml");
        assert!(fmt.bom);
    }

    #[test]
    fn decode_rejects_non_utf8() {
        assert!(matches!(decode(b"\x82\xa0"), Err(DocumentError::NotUtf8)));
    }

    #[test]
    fn encode_restores_crlf_and_bom() {
        let fmt = TextFormat {
            line_ending: LineEnding::Crlf,
            bom: true,
        };
        assert_eq!(encode("a\nb\n", fmt), b"\xEF\xBB\xBFa\r\nb\r\n");
    }

    #[test]
    fn encode_does_not_double_crlf() {
        let fmt = TextFormat {
            line_ending: LineEnding::Crlf,
            bom: false,
        };
        assert_eq!(encode("a\r\nb", fmt), b"a\r\nb");
    }

    #[test]
    fn fixtures_round_trip_byte_for_byte() {
        for name in [
            "sequence.puml",
            "sequence-crlf.puml",
            "sequence-bom.puml",
            "class-100-lines.puml",
        ] {
            let original = fs::read(fixture(name)).unwrap();
            let (text, fmt) = decode(&original).unwrap();
            assert_eq!(encode(&text, fmt), original, "{name}");
        }
    }

    #[test]
    fn load_reports_format_of_fixtures() {
        let crlf = load(&fixture("sequence-crlf.puml")).unwrap();
        assert_eq!(crlf.format.line_ending, LineEnding::Crlf);
        assert!(!crlf.content.contains('\r'));
        assert!(load(&fixture("sequence-bom.puml")).unwrap().format.bom);
        assert!(matches!(
            load(&fixture("not-utf8.puml")),
            Err(DocumentError::NotUtf8)
        ));
    }

    #[test]
    fn save_writes_with_original_format_and_leaves_no_temp_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("日本語.puml");
        let fmt = TextFormat {
            line_ending: LineEnding::Crlf,
            bom: true,
        };
        save(&path, "@startuml\nA -> B\n@enduml\n", fmt).unwrap();
        assert_eq!(
            fs::read(&path).unwrap(),
            b"\xEF\xBB\xBF@startuml\r\nA -> B\r\n@enduml\r\n"
        );
        // 上書き保存
        save(&path, "x\n", fmt).unwrap();
        assert_eq!(fs::read(&path).unwrap(), b"\xEF\xBB\xBFx\r\n");
        assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 1);
    }

    #[test]
    fn load_missing_file_is_io_error() {
        let err = load(Path::new("no/such/file.puml")).unwrap_err();
        assert!(matches!(err, DocumentError::Io(_)));
        assert!(err.to_string().starts_with("ファイルにアクセスできません"));
    }
}
