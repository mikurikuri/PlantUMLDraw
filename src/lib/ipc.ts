/**
 * Rust 側コマンド・ウィンドウ API の窓口。
 * フロントエンドは `invoke` などを直接使わず、必ずこのモジュール経由で呼ぶ（テストでモックしやすくするため）。
 */
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, type CloseRequestedEvent } from "@tauri-apps/api/window";

export interface AppInfo {
  name: string;
  version: string;
}

export type LineEnding = "lf" | "crlf";

export interface TextFormat {
  lineEnding: LineEnding;
  bom: boolean;
}

export interface LoadedDocument {
  path: string;
  content: string;
  format: TextFormat;
}

/** Rust の `RenderError` と対応する */
export type RenderError =
  | { kind: "javaNotFound"; java: string }
  | { kind: "jarNotFound"; path: string }
  | { kind: "syntax"; line: number | null; message: string }
  | { kind: "timeout"; seconds: number }
  | { kind: "failed"; message: string };

export interface Settings {
  javaPath: string | null;
  plantumlJar: string | null;
}

export interface RendererStatus {
  javaPath: string;
  javaVersion: { Ok: string } | { Err: RenderError };
  jarPath: string | null;
  jarFound: boolean;
}

export const getAppInfo = () => invoke<AppInfo>("app_info");
export const getInitialFile = () => invoke<string | null>("initial_file");
export const openDocument = (path: string) => invoke<LoadedDocument>("open_document", { path });
export const saveDocument = (path: string, content: string, format: TextFormat) =>
  invoke<void>("save_document", { path, content, format });
export const renderDiagram = (source: string) => invoke<string>("render", { source });
export const getRendererStatus = () => invoke<RendererStatus>("renderer_status");
export const getSettings = () => invoke<Settings>("get_settings");
export const setSettings = (settings: Settings) => invoke<Settings>("set_settings", { settings });

export const setWindowTitle = (title: string) => getCurrentWindow().setTitle(title);

/** ウィンドウを閉じる前に呼ばれる。`event.preventDefault()` で閉じるのを止められる */
export const onCloseRequested = (handler: (event: CloseRequestedEvent) => Promise<void>) =>
  getCurrentWindow().onCloseRequested(handler);

/** invoke の失敗値を RenderError に揃える */
export function toRenderError(e: unknown): RenderError {
  if (e && typeof e === "object" && "kind" in e) return e as RenderError;
  return { kind: "failed", message: String(e) };
}
