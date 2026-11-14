# PlantUMLDraw

[![CI](https://github.com/mikurikuri/PlantUMLDraw/actions/workflows/ci.yml/badge.svg)](https://github.com/mikurikuri/PlantUMLDraw/actions/workflows/ci.yml)

PlantUML の設計図を快適に書くためのデスクトップエディター（Tauri + Rust）。

> 🚧 開発中です。イテレーション 1（最小限の編集・プレビュー機能）まで実装済みで、ここからは実際に使いながらユースケース単位で作り込みます。開発に参加する方は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## できること

- 書いたそばから更新されるライブプレビュー
- 構文エラーの行番号表示（直前の図は残したまま）
- ローカルでレンダリング（設計図を外部サーバーへ送信しない。PlantUML は MIT 版を同梱、Java 17 以降が必要）
- 文字コード（BOM の有無）と改行コードを保ったままの保存

今後の作り込みの候補（シンタックスハイライト、ズーム、書き出し、`!include` 対応など）は [要件・ユースケース](docs/requirements.md) で管理しています。

## 対応 OS

| OS      | 対応状況                                              |
| ------- | ----------------------------------------------------- |
| Windows | ✅ 対応（Windows 10 / 11）                            |
| Linux   | ✅ 対応（Ubuntu 22.04 以降を想定）                    |
| macOS   | ❌ **対象外**（動作確認・不具合対応・配布はしません） |

macOS を対象外にした理由は [ADR-0005](docs/adr/0005-drop-macos.md) を参照してください。

## ドキュメント

- [ユーザーガイド](docs/user-guide.md)
- [要件・ユースケース](docs/requirements.md)
- [開発計画](docs/development-plan.md)
- [アーキテクチャ](docs/architecture.md)
- [テスト戦略](docs/test-strategy.md)
- [変更履歴](CHANGELOG.md)

## ライセンス

[MIT](LICENSE)
