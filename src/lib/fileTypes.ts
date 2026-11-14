/** PlantUML ファイルとして扱う拡張子（小文字・ドットなし） */
export const PLANTUML_EXTENSIONS = ["puml", "plantuml", "pu", "iuml"] as const;

/** パスまたはファイル名が PlantUML ファイルかどうかを判定する（大文字小文字は区別しない） */
export function isPlantUmlFile(path: string): boolean {
  const name = path.split(/[\\/]/).pop() ?? "";
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return false;
  const ext = name.slice(dot + 1).toLowerCase();
  return (PLANTUML_EXTENSIONS as readonly string[]).includes(ext);
}
