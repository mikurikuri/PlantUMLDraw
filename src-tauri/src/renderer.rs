//! PlantUML のレンダリング（ADR-0003）。
//!
//! [`Renderer`] トレイトで方式を差し替えられるようにし、既定はローカルの plantuml.jar を
//! `java -jar plantuml.jar -pipe -tsvg` で呼び出す [`LocalJarRenderer`]。

use serde::Serialize;
use std::ffi::OsString;
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

/// PlantUML が構文エラー時に返す終了コード
const EXIT_SYNTAX_ERROR: i32 = 200;
pub const DEFAULT_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum RenderError {
    #[error("Java が見つかりません（{java}）")]
    JavaNotFound { java: String },
    #[error("plantuml.jar が見つかりません（{path}）")]
    JarNotFound { path: String },
    #[error("構文エラー（{line:?} 行目）: {message}")]
    Syntax {
        /// 1 始まりの行番号
        line: Option<u32>,
        message: String,
    },
    #[error("描画が {seconds} 秒以内に終わりませんでした")]
    Timeout { seconds: u64 },
    #[error("描画に失敗しました: {message}")]
    Failed { message: String },
}

pub trait Renderer: Send + Sync {
    /// PlantUML のソースを SVG に変換する。複数の図がある場合は先頭の図を返す
    fn render(&self, source: &str) -> Result<String, RenderError>;
}

#[derive(Debug, Clone)]
pub struct LocalJarRenderer {
    pub java: PathBuf,
    pub jar: PathBuf,
    pub timeout: Duration,
}

impl LocalJarRenderer {
    pub fn new(java: PathBuf, jar: PathBuf) -> Self {
        Self {
            java,
            jar,
            timeout: DEFAULT_TIMEOUT,
        }
    }

    fn command(&self) -> Command {
        let mut cmd = Command::new(simplify_path(&self.java));
        cmd.args([
            "-Djava.awt.headless=true",
            "-Dfile.encoding=UTF-8",
            // Java 18 以降：標準出力・標準エラーを UTF-8 にする（日本語 Windows での文字化け防止）
            "-Dstdout.encoding=UTF-8",
            "-Dstderr.encoding=UTF-8",
            "-jar",
        ])
        .arg(simplify_path(&self.jar))
        .args(["-pipe", "-tsvg", "-charset", "UTF-8"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
        hide_console_window(&mut cmd);
        cmd
    }
}

impl Renderer for LocalJarRenderer {
    fn render(&self, source: &str) -> Result<String, RenderError> {
        if !self.jar.is_file() {
            return Err(RenderError::JarNotFound {
                path: self.jar.display().to_string(),
            });
        }
        let out = run_with_timeout(self.command(), source.as_bytes(), self.timeout).map_err(
            |e| match e {
                RunError::Spawn(e) if e.kind() == io::ErrorKind::NotFound => {
                    RenderError::JavaNotFound {
                        java: self.java.display().to_string(),
                    }
                }
                RunError::Spawn(e) | RunError::Io(e) => RenderError::Failed {
                    message: e.to_string(),
                },
                RunError::Timeout => RenderError::Timeout {
                    seconds: self.timeout.as_secs(),
                },
            },
        )?;
        interpret_output(out.code, &out.stdout, &out.stderr)
    }
}

/// プロセスの終了コードと出力から結果を判定する（プロセスを起動せずにテストできるよう分離）
pub fn interpret_output(
    code: Option<i32>,
    stdout: &str,
    stderr: &str,
) -> Result<String, RenderError> {
    match code {
        Some(0) => first_svg(stdout).ok_or_else(|| RenderError::Failed {
            message: "PlantUML の出力に SVG が含まれていません".into(),
        }),
        Some(EXIT_SYNTAX_ERROR) => {
            let (line, message) = parse_syntax_error(stderr);
            Err(RenderError::Syntax { line, message })
        }
        _ => Err(RenderError::Failed {
            message: if stderr.trim().is_empty() {
                format!("PlantUML が終了コード {code:?} で終了しました")
            } else {
                stderr.trim().to_string()
            },
        }),
    }
}

/// `-pipe` モードの標準エラー出力から行番号（1 始まり）とメッセージを取り出す。
///
/// 出力例:
/// ```text
/// ERROR
/// 2
/// Syntax Error? (Assumed diagram type: sequence)
/// Error line 3 in standard input
/// ```
pub fn parse_syntax_error(stderr: &str) -> (Option<u32>, String) {
    let mut line = None;
    let mut message = Vec::new();
    for l in stderr.lines().map(str::trim).filter(|l| !l.is_empty()) {
        if let Some(rest) = l.strip_prefix("Error line ") {
            line = rest.split_whitespace().next().and_then(|n| n.parse().ok());
        } else if l == "ERROR" || l.chars().all(|c| c.is_ascii_digit()) {
            continue;
        } else {
            message.push(l);
        }
    }
    let message = if message.is_empty() {
        "構文エラーがあります".to_string()
    } else {
        message.join(" ")
    };
    (line, message)
}

/// 出力から最初の `<svg ...>...</svg>` を取り出す
pub fn first_svg(stdout: &str) -> Option<String> {
    let start = stdout.find("<svg")?;
    let end = stdout[start..].find("</svg>")? + start + "</svg>".len();
    Some(stdout[start..end].to_string())
}

// ---- Java / plantuml.jar の検出 ----

/// 使う java 実行ファイルを決める：設定 → JAVA_HOME/bin/java → PATH 上の `java`
pub fn resolve_java(configured: Option<&str>, java_home: Option<OsString>) -> PathBuf {
    if let Some(p) = configured {
        return PathBuf::from(p);
    }
    if let Some(home) = java_home {
        let candidate = Path::new(&home).join("bin").join(java_exe_name());
        if candidate.is_file() {
            return candidate;
        }
    }
    PathBuf::from("java")
}

/// 使う plantuml.jar を決める：設定 → 環境変数 PLANTUML_JAR → 同梱版
pub fn resolve_jar(
    configured: Option<&str>,
    env_jar: Option<OsString>,
    bundled: Option<PathBuf>,
) -> Option<PathBuf> {
    configured
        .map(PathBuf::from)
        .or_else(|| env_jar.filter(|v| !v.is_empty()).map(PathBuf::from))
        .or(bundled)
}

/// Windows の拡張パス表記 `\\?\C:\...` を通常の `C:\...` に戻す。
/// Tauri のリソースパスはこの表記になることがあり、Java は `-jar \\?\...` を読み込めないため。
/// ネットワークパス（`\\?\UNC\...`）はそのまま残す。
pub fn simplify_path(path: &Path) -> PathBuf {
    let s = path.to_string_lossy();
    match s.strip_prefix(r"\\?\") {
        Some(rest) if !rest.starts_with(r"UNC\") => PathBuf::from(rest),
        _ => path.to_path_buf(),
    }
}

fn java_exe_name() -> &'static str {
    if cfg!(windows) {
        "java.exe"
    } else {
        "java"
    }
}

/// `java -version` を実行してバージョン表記（1 行目）を返す
pub fn java_version(java: &Path) -> Result<String, RenderError> {
    let mut cmd = Command::new(java);
    cmd.arg("-version")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    hide_console_window(&mut cmd);
    let out = run_with_timeout(cmd, b"", Duration::from_secs(10)).map_err(|e| match e {
        RunError::Spawn(e) if e.kind() == io::ErrorKind::NotFound => RenderError::JavaNotFound {
            java: java.display().to_string(),
        },
        RunError::Timeout => RenderError::Timeout { seconds: 10 },
        RunError::Spawn(e) | RunError::Io(e) => RenderError::Failed {
            message: e.to_string(),
        },
    })?;
    // java -version は標準エラーに出力する
    let text = if out.stderr.trim().is_empty() {
        out.stdout
    } else {
        out.stderr
    };
    Ok(text.lines().next().unwrap_or("").trim().to_string())
}

// ---- プロセス実行 ----

struct ProcessOutput {
    code: Option<i32>,
    stdout: String,
    stderr: String,
}

enum RunError {
    Spawn(io::Error),
    Io(io::Error),
    Timeout,
}

/// 標準入力を渡してプロセスを実行し、タイムアウトしたら強制終了する。
/// 標準入出力はパイプが詰まらないよう別スレッドで読み書きする。
fn run_with_timeout(
    mut cmd: Command,
    input: &[u8],
    timeout: Duration,
) -> Result<ProcessOutput, RunError> {
    let mut child = cmd.spawn().map_err(RunError::Spawn)?;

    let stdin = child.stdin.take();
    let input = input.to_vec();
    let writer = thread::spawn(move || {
        if let Some(mut stdin) = stdin {
            // 相手が先に終了した場合の書き込みエラーは無視する（結果は終了コードで判断）
            let _ = stdin.write_all(&input);
        }
    });
    let stdout = read_in_thread(child.stdout.take());
    let stderr = read_in_thread(child.stderr.take());

    let deadline = Instant::now() + timeout;
    let status = loop {
        if let Some(status) = child.try_wait().map_err(RunError::Io)? {
            break status;
        }
        if Instant::now() >= deadline {
            let _ = child.kill();
            let _ = child.wait();
            return Err(RunError::Timeout);
        }
        thread::sleep(Duration::from_millis(10));
    };
    let _ = writer.join();
    Ok(ProcessOutput {
        code: status.code(),
        stdout: stdout.join().unwrap_or_default(),
        stderr: stderr.join().unwrap_or_default(),
    })
}

fn read_in_thread<R: Read + Send + 'static>(pipe: Option<R>) -> thread::JoinHandle<String> {
    thread::spawn(move || {
        let mut buf = Vec::new();
        if let Some(mut p) = pipe {
            let _ = p.read_to_end(&mut buf);
        }
        String::from_utf8_lossy(&buf).into_owned()
    })
}

#[cfg(windows)]
fn hide_console_window(cmd: &mut Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    cmd.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn hide_console_window(_cmd: &mut Command) {}

#[cfg(test)]
mod tests {
    use super::*;

    const STDERR_SAMPLE: &str = "ERROR\n2\nSyntax Error? (Assumed diagram type: sequence)\nError line 3 in standard input\n";

    #[test]
    fn parses_line_and_message_from_pipe_stderr() {
        let (line, msg) = parse_syntax_error(STDERR_SAMPLE);
        assert_eq!(line, Some(3));
        assert_eq!(msg, "Syntax Error? (Assumed diagram type: sequence)");
    }

    #[test]
    fn parse_tolerates_unknown_format() {
        assert_eq!(
            parse_syntax_error(""),
            (None, "構文エラーがあります".to_string())
        );
        assert_eq!(
            parse_syntax_error("something odd").1,
            "something odd".to_string()
        );
    }

    #[test]
    fn first_svg_takes_only_the_first_diagram() {
        let out = "<?xml?><svg a>1</svg><svg b>2</svg>";
        assert_eq!(first_svg(out).as_deref(), Some("<svg a>1</svg>"));
        assert_eq!(first_svg("no svg"), None);
        assert_eq!(first_svg("<svg unterminated"), None);
    }

    #[test]
    fn interpret_success_syntax_error_and_failure() {
        assert_eq!(
            interpret_output(Some(0), "<svg>x</svg>", ""),
            Ok("<svg>x</svg>".into())
        );
        assert_eq!(
            interpret_output(Some(200), "<svg>err</svg>", STDERR_SAMPLE),
            Err(RenderError::Syntax {
                line: Some(3),
                message: "Syntax Error? (Assumed diagram type: sequence)".into()
            })
        );
        assert!(matches!(
            interpret_output(Some(0), "", ""),
            Err(RenderError::Failed { .. })
        ));
        assert_eq!(
            interpret_output(Some(1), "", "boom\n"),
            Err(RenderError::Failed {
                message: "boom".into()
            })
        );
    }

    #[test]
    fn render_error_serializes_with_kind_tag() {
        let json = serde_json::to_value(RenderError::Syntax {
            line: Some(3),
            message: "m".into(),
        })
        .unwrap();
        assert_eq!(json["kind"], "syntax");
        assert_eq!(json["line"], 3);
        let json = serde_json::to_value(RenderError::JavaNotFound { java: "j".into() }).unwrap();
        assert_eq!(json["kind"], "javaNotFound");
    }

    #[test]
    fn resolve_java_prefers_setting_then_java_home_then_path() {
        assert_eq!(
            resolve_java(Some("C:/x/java.exe"), None),
            PathBuf::from("C:/x/java.exe")
        );
        let home = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(home.path().join("bin")).unwrap();
        let exe = home.path().join("bin").join(java_exe_name());
        std::fs::write(&exe, b"").unwrap();
        assert_eq!(resolve_java(None, Some(home.path().into())), exe);
        // JAVA_HOME に java が無ければ PATH に任せる
        let empty = tempfile::tempdir().unwrap();
        assert_eq!(
            resolve_java(None, Some(empty.path().into())),
            PathBuf::from("java")
        );
        assert_eq!(resolve_java(None, None), PathBuf::from("java"));
    }

    #[test]
    fn simplify_path_strips_verbatim_prefix_but_keeps_unc() {
        assert_eq!(
            simplify_path(Path::new(r"\\?\C:\app\plantuml.jar")),
            PathBuf::from(r"C:\app\plantuml.jar")
        );
        assert_eq!(
            simplify_path(Path::new(r"\\?\UNC\server\share\a.jar")),
            PathBuf::from(r"\\?\UNC\server\share\a.jar")
        );
        assert_eq!(
            simplify_path(Path::new("/usr/share/a.jar")),
            PathBuf::from("/usr/share/a.jar")
        );
    }

    #[test]
    fn resolve_jar_order() {
        let bundled = Some(PathBuf::from("res/plantuml.jar"));
        assert_eq!(
            resolve_jar(Some("a.jar"), Some("b.jar".into()), bundled.clone()),
            Some(PathBuf::from("a.jar"))
        );
        assert_eq!(
            resolve_jar(None, Some("b.jar".into()), bundled.clone()),
            Some(PathBuf::from("b.jar"))
        );
        assert_eq!(resolve_jar(None, Some("".into()), bundled.clone()), bundled);
        assert_eq!(resolve_jar(None, None, None), None);
    }

    #[test]
    fn missing_jar_is_reported_before_starting_java() {
        let r = LocalJarRenderer::new("java".into(), "no/such/plantuml.jar".into());
        assert!(matches!(
            r.render("@startuml\n@enduml"),
            Err(RenderError::JarNotFound { .. })
        ));
    }

    #[test]
    fn missing_java_is_reported_as_java_not_found() {
        let jar = tempfile::NamedTempFile::new().unwrap();
        let r = LocalJarRenderer::new("definitely-not-a-java-binary-xyz".into(), jar.path().into());
        assert_eq!(
            r.render("@startuml\n@enduml"),
            Err(RenderError::JavaNotFound {
                java: "definitely-not-a-java-binary-xyz".into()
            })
        );
        assert!(matches!(
            java_version(Path::new("definitely-not-a-java-binary-xyz")),
            Err(RenderError::JavaNotFound { .. })
        ));
    }
}
