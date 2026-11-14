# イテレーション 0：基盤整備

| 項目 | 内容          |
| ---- | ------------- |
| 期間 | 2026-11-15 〜 |
| 状態 | 進行中        |

## 決定事項

開発計画 5章の未決事項 D1〜D6 は推奨案で決定（2026-11-15）。ADR 0001〜0004 に記録。
D6（公開アカウント）は会社の OSS 公開ポリシー確認後に GitHub リポジトリを作成する。

## 目的

以降のイテレーションで「書いてテストして出す」が回る状態を作る。

## タスク

- [x] 未決事項 D1〜D6 の決定（[開発計画 5章](../development-plan.md)）
- [x] 開発環境の導入（Rust / Node.js / Java / Visual Studio Build Tools / WebView2）
- [x] Git 初期化
- [ ] GitHub リポジトリ作成・push
- [x] Tauri 2 + React + TS の雛形作成
- [x] Lint・フォーマッター設定（ESLint / Prettier / rustfmt / clippy）
- [x] サンプルテスト（Rust：`app_info` `file_type`、TS：`fileTypes` `App`）
- [x] GitHub Actions CI（Windows / Linux）定義
- [x] アプリアイコン生成（`npm run tauri icon app-icon.svg`。モバイル用は削除）
- [x] ADR 0001〜0004 作成
- [x] `CONTRIBUTING.md` 作成

## 受け入れ確認

| ID    | 基準                                                  | 結果 | 確認日     | 備考                                                            |
| ----- | ----------------------------------------------------- | ---- | ---------- | --------------------------------------------------------------- |
| AC0-1 | 手順書どおりに `npm run tauri dev` でウィンドウが開く | 合格 | 2026-11-15 | Windows 11。winget で導入後に起動、IPC 経由で v0.1.0 表示を確認 |
| AC0-2 | Rust・TS のサンプルテストが成功する                   | 合格 | 2026-11-15 | Vitest 13 件、cargo test 4 件。lint・clippy・fmt も指摘なし     |
| AC0-3 | CI が Windows・Linux で成功する                       | 未   |            | GitHub リポジトリ作成待ち（D6）                                 |
| AC0-4 | ADR 0001〜0004 が承認済み                             | 合格 | 2026-11-15 | 推奨案で承認                                                    |

## 確認時の環境

Node.js 26.13 / npm 11.20 / Rust 1.100 / Temurin JDK 21.0.13 / VS 2022 Build Tools / WebView2 157

## メモ

- 計画時のバージョン指定（Vite 6・Vitest 3）は脆弱性（tinypool 等）があったため、Vite 8・Vitest 5・jsdom 31 に更新した。
- Vite 8 は esbuild を同梱しないため、`build.minify` は既定（oxc）を使う。
- 残る `npm audit` 指摘は開発用の typescript-eslint 内の minimatch（中程度）のみ。配布物には含まれないため、上流の更新待ちとする。

## 振り返り

（イテレーション終了時に記入）
