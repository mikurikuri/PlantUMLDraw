# ADR-0001: 技術スタックに Tauri 2 + Rust を採用する

- 状態: 承認
- 日付: 2026-11-15

## 背景

PlantUML の設計図を編集するデスクトップアプリを作る。社内でも使うため、配布が軽く、Windows / macOS / Linux で動くことが必要。社内試作を Tauri + Rust で作り、モダンな見た目と軽さが好評だった。

## 決定

- デスクトップ基盤に **Tauri 2**、バックエンドに **Rust（stable）** を採用する。
- 画面は Web 技術（TypeScript）で作り、OS の WebView（Windows は WebView2）で表示する。

## 検討した代替案

| 案                   | 評価                                                       |
| -------------------- | ---------------------------------------------------------- |
| Electron             | 実績は豊富だが、配布サイズ・メモリ使用量が大きい           |
| VS Code 拡張         | 既存拡張があり、作る価値が薄い。独自 UI の自由度も低い     |
| Java（Swing/JavaFX） | PlantUML と同じ JVM で動かせるが、モダンな UI を作りにくい |

## 影響

- 開発者は Rust と Node.js の両方の環境が必要になる（`CONTRIBUTING.md` に手順を記載）。
- Windows では Visual Studio Build Tools（C++）と WebView2 が必要。
