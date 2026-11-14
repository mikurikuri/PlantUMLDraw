# アーキテクチャ

イテレーション 1 時点の構成です。図のソースは [diagrams/architecture.puml](diagrams/architecture.puml)（このエディターで編集できます）。

## 1. 全体構成

- **フロントエンド**（`src/`）：React + TypeScript。OS の WebView で表示する。
- **バックエンド**（`src-tauri/`）：Rust。ファイル I/O、PlantUML の呼び出し、設定の保存を担当する。
- **描画**：Rust から `java -jar plantuml.jar -pipe -tsvg -charset UTF-8` を起動し、標準入力で図のソースを渡して SVG を受け取る（[ADR-0003](adr/0003-rendering.md)）。設計図を外部へ送信しない。

## 2. モジュールの責務

### フロントエンド

| モジュール                      | 責務                                                                      |
| ------------------------------- | ------------------------------------------------------------------------- |
| `App.tsx`                       | 画面全体。ファイル操作、ショートカット、閉じる前の確認、設定ダイアログ    |
| `components/Editor.tsx`         | CodeMirror 6 のラッパー                                                   |
| `components/Preview.tsx`        | SVG を `<img>` で表示（スクリプトを実行させない）、エラーと導入案内の表示 |
| `components/SplitPane.tsx`      | 左右 2 ペインと境界のドラッグ                                             |
| `components/SettingsDialog.tsx` | Java・plantuml.jar のパス設定と現在の状態表示                             |
| `hooks/useLivePreview.ts`       | 入力停止 300ms 後に描画。古い要求の結果は捨て、エラー時も前の図を残す     |
| `lib/documentState.ts`          | 編集状態の reducer（未保存判定・タイトル・拡張子補完）                    |
| `lib/ipc.ts`                    | Rust コマンドとウィンドウ API の窓口（テストではモックする）              |
| `lib/dialogs.ts`                | OS ネイティブのダイアログ（開く・保存・確認）                             |

### バックエンド

| モジュール    | 責務                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------- |
| `lib.rs`      | Tauri コマンドの定義、アプリ状態（設定・同梱 jar の場所・起動引数）                         |
| `document.rs` | 読み込み時に BOM と改行コード（LF / CRLF）を記録し、保存時に戻す。UTF-8 以外は開かない      |
| `renderer.rs` | `Renderer` トレイト、ローカル jar 実装、エラー解析、Java・jar の検出、タイムアウト（30 秒） |
| `settings.rs` | `settings.json` の読み書き（壊れていても既定値で起動）                                      |

## 3. IPC コマンド一覧

| コマンド          | 引数                    | 戻り値                        | 用途                     |
| ----------------- | ----------------------- | ----------------------------- | ------------------------ |
| `app_info`        | —                       | `{ name, version }`           | バージョン表示           |
| `initial_file`    | —                       | パス または `null`            | 起動引数のファイルを開く |
| `open_document`   | `path`                  | `{ path, content, format }`   | ファイルを開く           |
| `save_document`   | `path, content, format` | —                             | 元の書式で保存           |
| `render`          | `source`                | SVG 文字列 / `RenderError`    | 図の描画                 |
| `renderer_status` | —                       | Java のバージョン、jar の場所 | 設定ダイアログの状態表示 |
| `get_settings`    | —                       | `Settings`                    | 設定の取得               |
| `set_settings`    | `settings`              | `Settings`                    | 設定の保存               |

`RenderError` は `kind` で種類を区別する：`javaNotFound` / `jarNotFound` / `syntax`（`line` は 1 始まり）/ `timeout` / `failed`。

## 4. 検出の順序

| 対象         | 順序                                                  |
| ------------ | ----------------------------------------------------- |
| java         | 設定 → `JAVA_HOME/bin/java` → PATH 上の `java`        |
| plantuml.jar | 設定 → 環境変数 `PLANTUML_JAR` → アプリ同梱のリソース |

## 5. 既知の制約

- 描画のたびに JVM を起動する（1 回 約 0.5 秒）。遅さが問題になれば JVM 常駐方式を検討する。
- 1 ファイルに複数の図がある場合は先頭の図だけを表示する。
- Windows の拡張パス表記（`\\?\C:\...`）は Java が扱えないため、起動前に通常のパスへ戻している。
