# PlantUMLDraw

[![CI](https://github.com/mikurikuri/PlantUMLDraw/actions/workflows/ci.yml/badge.svg)](https://github.com/mikurikuri/PlantUMLDraw/actions/workflows/ci.yml)

PlantUML の設計図を快適に書くためのデスクトップエディター（Tauri + Rust）。

> 🚧 開発中です。イテレーション 0（基盤整備）が完了し、次はイテレーション 1（最小限の編集・プレビュー機能）です。開発に参加する方は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## 特長（予定）

- 書いたそばから更新されるライブプレビュー
- エラー行の表示とジャンプ
- ローカルでレンダリング（設計図を外部サーバーへ送信しない）
- SVG / PNG 書き出し、`!include` を含むワークスペース対応

## 対応 OS

| OS      | 対応状況                                              |
| ------- | ----------------------------------------------------- |
| Windows | ✅ 対応（Windows 10 / 11）                            |
| Linux   | ✅ 対応（Ubuntu 22.04 以降を想定）                    |
| macOS   | ❌ **対象外**（動作確認・不具合対応・配布はしません） |

macOS を対象外にした理由は [ADR-0005](docs/adr/0005-drop-macos.md) を参照してください。

## ドキュメント

- [開発計画](docs/development-plan.md)
- [テスト戦略](docs/test-strategy.md)
- [変更履歴](CHANGELOG.md)

## ライセンス

[MIT](LICENSE)
