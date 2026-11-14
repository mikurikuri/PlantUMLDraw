# Changelog

このプロジェクトの主な変更は本ファイルに記録します。
形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/)、バージョンは [Semantic Versioning](https://semver.org/lang/ja/) に従います。

## [Unreleased]

### Added

- 開発計画書・テスト戦略を追加
- ADR 0001〜0004（技術スタック・フロントエンド・レンダリング・ライセンス）
- Tauri 2 + React + TypeScript のプロジェクト雛形、サンプルテスト、GitHub Actions CI
- ADR 0005（macOS をサポート対象外とする）
- エディター（CodeMirror 6）とプレビューの 2 ペイン画面。境界のドラッグで幅を変更
- 新規 / 開く / 保存 / 名前を付けて保存（Ctrl+N / Ctrl+O / Ctrl+S / Ctrl+Shift+S）、起動引数のファイルを開く
- ライブプレビュー：入力停止 300ms 後に、ローカルの Java + plantuml.jar（MIT 版を同梱）で SVG を描画
- 構文エラーの行番号とメッセージを表示し、直前の図を残す
- 保存時に BOM の有無と改行コード（LF / CRLF）を保持。UTF-8 以外のファイルは開かずに案内
- 未保存の変更があるときの確認（閉じる・開く・新規）、タイトルとツールバーの未保存マーク
- Java / plantuml.jar が見つからないときの案内と設定ダイアログ（java・plantuml.jar のパス）
- 結合テスト（実際の Java）と E2E テスト（WebdriverIO + tauri-driver）、CI で実行
- ユーザーガイド、アーキテクチャ、要件・ユースケース一覧

### Changed

- 対応 OS を Windows / Linux に限定し、macOS を対象外にした（CI・配布物・手順書から削除）
- 開発計画 v0.2：イテレーション 2 以降を、実際に動かしながら要件を出すユースケース駆動に変更（テストは正常系の確認が中心）
