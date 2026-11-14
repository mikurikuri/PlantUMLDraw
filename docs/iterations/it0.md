# イテレーション 0：基盤整備

| 項目 | 内容                     |
| ---- | ------------------------ |
| 期間 | 2026-11-15 〜 2026-11-15 |
| 状態 | 完了                     |

## 決定事項

開発計画 5章の未決事項 D1〜D6 は推奨案で決定（2026-11-15）。ADR 0001〜0004 に記録。
D6（公開アカウント）は個人アカウントで公開：https://github.com/mikurikuri/PlantUMLDraw
追加決定：macOS をサポート対象外とする（ADR-0005）。

## 目的

以降のイテレーションで「書いてテストして出す」が回る状態を作る。

## タスク

- [x] 未決事項 D1〜D6 の決定（[開発計画 5章](../development-plan.md)）
- [x] 開発環境の導入（Rust / Node.js / Java / Visual Studio Build Tools / WebView2）
- [x] Git 初期化
- [x] GitHub リポジトリ作成・push
- [x] Tauri 2 + React + TS の雛形作成
- [x] Lint・フォーマッター設定（ESLint / Prettier / rustfmt / clippy）
- [x] サンプルテスト（Rust：`app_info` `file_type`、TS：`fileTypes` `App`）
- [x] GitHub Actions CI（Windows / Linux）定義
- [x] アプリアイコン生成（`npm run tauri icon app-icon.svg`。モバイル用は削除）
- [x] ADR 0001〜0005 作成
- [x] `CONTRIBUTING.md` 作成

## 受け入れ確認

| ID    | 基準                                                  | 結果 | 確認日     | 備考                                                                                                                                                           |
| ----- | ----------------------------------------------------- | ---- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC0-1 | 手順書どおりに `npm run tauri dev` でウィンドウが開く | 合格 | 2026-11-15 | Windows 11。winget で導入後に起動、IPC 経由で v0.1.0 表示を確認                                                                                                |
| AC0-2 | Rust・TS のサンプルテストが成功する                   | 合格 | 2026-11-15 | Vitest 13 件、cargo test 4 件。lint・clippy・fmt も指摘なし                                                                                                    |
| AC0-3 | CI が Windows・Linux で成功する                       | 合格 | 2026-11-15 | [Run 43611513684](https://github.com/mikurikuri/PlantUMLDraw/actions/runs/43611513684)（68cfd89）で windows-latest・ubuntu-22.04 とも成功。README にバッジ追加 |
| AC0-4 | ADR 0001〜0004 が承認済み                             | 合格 | 2026-11-15 | 推奨案で承認                                                                                                                                                   |

## 確認時の環境

Node.js 26.13 / npm 11.20 / Rust 1.100 / Temurin JDK 21.0.13 / VS 2022 Build Tools / WebView2 157

## メモ

- 計画時のバージョン指定（Vite 6・Vitest 3）は脆弱性（tinypool 等）があったため、Vite 8・Vitest 5・jsdom 31 に更新した。
- Vite 8 は esbuild を同梱しないため、`build.minify` は既定（oxc）を使う。
- 残る `npm audit` 指摘は開発用の typescript-eslint 内の minimatch（中程度）のみ。配布物には含まれないため、上流の更新待ちとする。

## 振り返り

**良かった点**

- 受け入れ基準を先に決めていたので、何をもって完了とするかで迷わなかった。
- `npm run check` 1 回でローカルと CI が同じ確認をする形にでき、CI の初回実行から成功した。

**課題**

- 計画時に指定したパッケージのバージョンが古く、脆弱性への対応で手戻りが出た。
- 初回の CI 実行は途中でキャンセルされ、確認が 1 回分遅れた。
- 途中で対象 OS が変わった（macOS 対象外）。

**次のイテレーションでの改善**

- 依存パッケージを追加するときは、その場で最新版と `npm audit` を確認する。
- イテレーション開始時に、前提（対象 OS・利用環境）に変更がないか確認する。
- イテレーション 1 では PlantUML を実際に動かすため、CI に Java と plantuml.jar を用意する手順を最初に作る。
