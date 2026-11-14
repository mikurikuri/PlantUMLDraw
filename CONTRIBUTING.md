# 開発ガイド

## 1. 開発環境の準備

### 必要なもの

| ツール                                  | バージョン                             | 用途                                                                 |
| --------------------------------------- | -------------------------------------- | -------------------------------------------------------------------- |
| Git                                     | 2.40 以降                              | ソース管理                                                           |
| Node.js                                 | 22 以降の LTS                          | フロントエンドのビルド・テスト                                       |
| Rust                                    | stable（rustup で導入）                | バックエンド                                                         |
| Java                                    | 17 以降（Temurin 推奨）                | PlantUML の実行（イテレーション 1 以降）                             |
| Windows のみ：Visual Studio Build Tools | 2022（「C++ によるデスクトップ開発」） | Rust のリンカー                                                      |
| Windows のみ：WebView2 Runtime          | 最新                                   | 画面表示（Windows 11 は導入済み）                                    |
| Linux のみ                              | `libwebkit2gtk-4.1-dev` など           | [Tauri の前提条件](https://v2.tauri.app/start/prerequisites/) を参照 |

### Windows（winget を使う場合）

PowerShell で実行します。

```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Rustlang.Rustup -e
winget install --id EclipseAdoptium.Temurin.21.JDK -e
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

インストール後、**ターミナルを開き直して**から確認します。

```powershell
node --version
cargo --version
java -version
```

> macOS は対象外です（[ADR-0005](docs/adr/0005-drop-macos.md)）。macOS 向けの手順・不具合対応は提供しません。

## 2. 起動とテスト

```bash
npm install          # 依存関係の導入（初回のみ）
npm run tauri dev    # 開発モードで起動
npm test             # フロントエンドの単体テスト
npm run check        # lint・型チェック・フォーマット・Rust テストをまとめて実行
```

Rust 側だけを操作する場合は `src-tauri/` で `cargo test` / `cargo clippy` を実行します。
※ Rust のビルドには `dist/`（フロントエンドのビルド結果）が必要です。先に `npm run build` を実行してください。

## 3. フォルダ構成

```
.
├─ src/            フロントエンド（React + TS）
├─ src-tauri/      バックエンド（Rust / Tauri）
├─ tests/fixtures/ テスト用の .puml サンプル（公開可能なもののみ）
├─ docs/           設計書・ADR・イテレーション記録
└─ .github/        CI 設定
```

## 4. ブランチと PR

- `main` は常にビルド・テストが通る状態を保ちます。
- 作業は `feature/<内容>`、`fix/<内容>` ブランチで行い、PR でマージします。
- コミットメッセージは [Conventional Commits](https://www.conventionalcommits.org/ja/) 形式（`feat:` `fix:` `docs:` `test:` `chore:` など）。
- PR は[完了の定義](docs/development-plan.md#32-全イテレーション共通の完了の定義definition-of-done)を満たしていることを確認してから出します。

## 5. 守ってほしいこと

- **社内の実際の設計図・社内 URL・社内パスをコミットしない**でください。テストには `tests/fixtures/` の公開可能なサンプルを使います。
- 設計判断を変えるときは ADR（`docs/adr/`）を追加します。
