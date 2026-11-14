/**
 * Rust 側コマンド呼び出しの窓口。
 * フロントエンドは `invoke` を直接使わず、必ずこのモジュール経由で呼ぶ（テストでモックしやすくするため）。
 */
import { invoke } from "@tauri-apps/api/core";

export interface AppInfo {
  name: string;
  version: string;
}

export function getAppInfo(): Promise<AppInfo> {
  return invoke<AppInfo>("app_info");
}
