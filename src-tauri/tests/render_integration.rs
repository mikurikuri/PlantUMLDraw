//! 実際の Java と plantuml.jar を使う結合テスト。
//! 実行: `cargo test --features integration`（事前に `npm run fetch:plantuml`）
#![cfg(feature = "integration")]

use plantumldraw_lib::renderer::{resolve_java, LocalJarRenderer, RenderError, Renderer};
use std::path::{Path, PathBuf};
use std::time::Instant;

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("..")
}

fn renderer() -> LocalJarRenderer {
    let jar = std::env::var_os("PLANTUML_JAR")
        .map(PathBuf::from)
        .unwrap_or_else(|| root().join("vendor/plantuml.jar"));
    assert!(
        jar.is_file(),
        "plantuml.jar がありません。npm run fetch:plantuml を実行してください: {}",
        jar.display()
    );
    LocalJarRenderer::new(resolve_java(None, std::env::var_os("JAVA_HOME")), jar)
}

fn fixture(name: &str) -> String {
    std::fs::read_to_string(root().join("tests/fixtures").join(name)).unwrap()
}

#[test]
fn renders_sequence_diagram_with_japanese_text() {
    let svg = renderer().render(&fixture("sequence.puml")).unwrap();
    assert!(svg.starts_with("<svg"));
    assert!(svg.contains("認証サービス"), "日本語が SVG に含まれること");
}

/// 性能の目安に掛ける係数。開発 PC では 1（受け入れ基準そのもの）。
/// 遅い CI では環境変数 `PERF_BUDGET_SCALE` で緩め、大きな劣化だけを検出する（docs/test-strategy.md）。
fn perf_budget_scale() -> f64 {
    std::env::var("PERF_BUDGET_SCALE")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(1.0)
}

#[test]
fn renders_100_line_class_diagram_within_budget() {
    let start = Instant::now();
    let svg = renderer().render(&fixture("class-100-lines.puml")).unwrap();
    let elapsed = start.elapsed().as_secs_f64();
    assert!(svg.contains("Entity20"));
    // AC1-1 の目安は 3 秒
    let budget = 3.0 * perf_budget_scale();
    println!("100 行クラス図の描画: {elapsed:.2} 秒（上限 {budget:.1} 秒）");
    assert!(
        elapsed < budget,
        "描画に {elapsed:.2} 秒かかった（上限 {budget:.1} 秒）"
    );
}

#[test]
fn reports_syntax_error_with_line_number() {
    let err = renderer()
        .render(&fixture("syntax-error.puml"))
        .unwrap_err();
    match err {
        RenderError::Syntax { line, .. } => assert_eq!(line, Some(3)),
        other => panic!("構文エラーになるはず: {other:?}"),
    }
}
