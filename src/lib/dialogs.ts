/** OS ネイティブのダイアログ（テストでモックしやすいよう 1 か所にまとめる） */
import { ask, message, open, save } from "@tauri-apps/plugin-dialog";
import { PLANTUML_EXTENSIONS } from "./fileTypes";

const filters = [
  { name: "PlantUML", extensions: [...PLANTUML_EXTENSIONS] },
  { name: "すべてのファイル", extensions: ["*"] },
];

export async function pickOpenPath(): Promise<string | null> {
  const p = await open({ multiple: false, directory: false, filters });
  return typeof p === "string" ? p : null;
}

export async function pickSavePath(defaultPath?: string): Promise<string | null> {
  return (await save({ defaultPath, filters })) ?? null;
}

/** 未保存の変更を破棄してよいか確認する。破棄してよければ true */
export function confirmDiscard(): Promise<boolean> {
  return ask("保存されていない変更があります。変更を破棄しますか？", {
    title: "PlantUMLDraw",
    kind: "warning",
    okLabel: "破棄する",
    cancelLabel: "キャンセル",
  });
}

export async function showError(text: string): Promise<void> {
  await message(text, { title: "PlantUMLDraw", kind: "error" });
}
