/** 編集中ドキュメントの状態（純粋な reducer。UI から独立してテストする） */
import type { LoadedDocument, TextFormat } from "./ipc";
import { isPlantUmlFile } from "./fileTypes";

export const NEW_DOCUMENT_TEMPLATE = "@startuml\n\n@enduml\n";
export const DEFAULT_FORMAT: TextFormat = { lineEnding: "lf", bom: false };

export interface DocumentState {
  /** 保存先。新規（未保存）なら null */
  path: string | null;
  content: string;
  /** 最後に読み込み・保存したときの内容（未保存判定に使う） */
  savedContent: string;
  format: TextFormat;
}

export type DocumentAction =
  | { type: "new" }
  | { type: "loaded"; doc: LoadedDocument }
  | { type: "edited"; content: string }
  | { type: "saved"; path: string; content: string };

export const initialDocumentState: DocumentState = {
  path: null,
  content: NEW_DOCUMENT_TEMPLATE,
  savedContent: NEW_DOCUMENT_TEMPLATE,
  format: DEFAULT_FORMAT,
};

export function documentReducer(state: DocumentState, action: DocumentAction): DocumentState {
  switch (action.type) {
    case "new":
      return initialDocumentState;
    case "loaded":
      return {
        path: action.doc.path,
        content: action.doc.content,
        savedContent: action.doc.content,
        format: action.doc.format,
      };
    case "edited":
      return action.content === state.content ? state : { ...state, content: action.content };
    case "saved":
      // 保存中に入力された分は未保存のまま残す
      return { ...state, path: action.path, savedContent: action.content };
  }
}

export const isDirty = (s: DocumentState) => s.content !== s.savedContent;

export function fileName(s: DocumentState): string {
  return s.path ? (s.path.split(/[\\/]/).pop() ?? s.path) : "無題";
}

export function windowTitle(s: DocumentState): string {
  return `${isDirty(s) ? "● " : ""}${fileName(s)} - PlantUMLDraw`;
}

/** 保存ダイアログで拡張子なしの名前が入力されたら .puml を付ける */
export function withPlantUmlExtension(path: string): string {
  return isPlantUmlFile(path) ? path : `${path}.puml`;
}
