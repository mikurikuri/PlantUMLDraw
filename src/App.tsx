import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Editor } from "./components/Editor";
import { Preview } from "./components/Preview";
import { SettingsDialog } from "./components/SettingsDialog";
import { SplitPane } from "./components/SplitPane";
import { useLivePreview } from "./hooks/useLivePreview";
import { confirmDiscard, pickOpenPath, pickSavePath } from "./lib/dialogs";
import {
  documentReducer,
  fileName,
  initialDocumentState,
  isDirty,
  windowTitle,
  withPlantUmlExtension,
} from "./lib/documentState";
import {
  getInitialFile,
  getSettings,
  onCloseRequested,
  openDocument,
  renderDiagram,
  saveDocument,
  setSettings,
  setWindowTitle,
  type Settings,
} from "./lib/ipc";

export default function App() {
  const [doc, dispatch] = useReducer(documentReducer, initialDocumentState);
  const [notice, setNotice] = useState<string | null>(null);
  const [settings, setSettingsState] = useState<Settings | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const preview = useLivePreview(doc.content, renderDiagram, undefined, refreshKey);

  // 非同期の操作（ダイアログ表示中など）からも最新の状態を参照するため
  const docRef = useRef(doc);
  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  /** 未保存の変更があれば破棄してよいか確認する。続けてよければ true */
  const canDiscard = useCallback(
    async () => !isDirty(docRef.current) || (await confirmDiscard()),
    [],
  );

  const openPath = useCallback(async (path: string) => {
    try {
      dispatch({ type: "loaded", doc: await openDocument(path) });
      setNotice(null);
    } catch (e) {
      setNotice(`${path} を開けませんでした：${String(e)}`);
    }
  }, []);

  const writeTo = useCallback(async (path: string) => {
    const { content, format } = docRef.current;
    try {
      await saveDocument(path, content, format);
      dispatch({ type: "saved", path, content });
      setNotice(null);
    } catch (e) {
      setNotice(`保存できませんでした：${String(e)}`);
    }
  }, []);

  const saveAs = useCallback(async () => {
    const picked = await pickSavePath(docRef.current.path ?? "untitled.puml");
    if (picked) await writeTo(withPlantUmlExtension(picked));
  }, [writeTo]);

  const save = useCallback(async () => {
    const path = docRef.current.path;
    if (path) await writeTo(path);
    else await saveAs();
  }, [writeTo, saveAs]);

  const newFile = useCallback(async () => {
    if (await canDiscard()) dispatch({ type: "new" });
  }, [canDiscard]);

  const openFile = useCallback(async () => {
    if (!(await canDiscard())) return;
    const path = await pickOpenPath();
    if (path) await openPath(path);
  }, [canDiscard, openPath]);

  // 起動時：コマンドライン引数のファイルを開く
  useEffect(() => {
    getInitialFile().then(
      (p) => (p ? openPath(p) : undefined),
      () => undefined,
    );
  }, [openPath]);

  // ウィンドウタイトルにファイル名と未保存マークを出す
  const title = windowTitle(doc);
  useEffect(() => {
    setWindowTitle(title).catch(() => undefined);
  }, [title]);

  // 未保存のまま閉じるときの確認（AC1-5）
  useEffect(() => {
    const unlisten = onCloseRequested(async (event) => {
      if (!(await canDiscard())) event.preventDefault();
    });
    return () => void unlisten.then((f) => f()).catch(() => undefined);
  }, [canDiscard]);

  // キーボードショートカット
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      const action =
        key === "s"
          ? e.shiftKey
            ? saveAs
            : save
          : key === "o"
            ? openFile
            : key === "n"
              ? newFile
              : null;
      if (action) {
        e.preventDefault();
        void action();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, saveAs, openFile, newFile]);

  const openSettings = async () => setSettingsState(await getSettings());
  const saveSettings = async (s: Settings) => {
    await setSettings(s);
    setRefreshKey((k) => k + 1);
  };

  const dirty = isDirty(doc);

  return (
    <div className="app">
      <header className="toolbar">
        <div className="toolbar-actions">
          <button type="button" onClick={newFile} title="新規 (Ctrl+N)">
            新規
          </button>
          <button type="button" onClick={openFile} title="開く (Ctrl+O)">
            開く
          </button>
          <button type="button" onClick={save} title="保存 (Ctrl+S)">
            保存
          </button>
          <button type="button" onClick={saveAs} title="名前を付けて保存 (Ctrl+Shift+S)">
            名前を付けて保存
          </button>
        </div>
        <div className="toolbar-title" title={doc.path ?? undefined}>
          <span data-testid="file-name">{fileName(doc)}</span>
          {dirty && (
            <span className="dirty" aria-label="未保存の変更あり" data-testid="dirty-mark">
              ●
            </span>
          )}
        </div>
        <button type="button" onClick={openSettings}>
          設定
        </button>
      </header>

      {notice && (
        <div className="notice" role="alert">
          {notice}
          <button type="button" onClick={() => setNotice(null)} aria-label="閉じる">
            ×
          </button>
        </div>
      )}

      <main className="workspace">
        <SplitPane
          left={
            <Editor
              value={doc.content}
              onChange={(c) => dispatch({ type: "edited", content: c })}
            />
          }
          right={<Preview {...preview} onOpenSettings={openSettings} />}
        />
      </main>

      <footer className="statusbar">
        <span>{doc.format.bom ? "UTF-8 (BOM 付き)" : "UTF-8"}</span>
        <span>{doc.format.lineEnding === "crlf" ? "CRLF" : "LF"}</span>
        <span className="statusbar-render" data-testid="render-status">
          {preview.rendering ? "描画中…" : preview.error ? "エラー" : preview.svg ? "描画済み" : ""}
        </span>
      </footer>

      {settings && (
        <SettingsDialog
          initial={settings}
          onSave={saveSettings}
          onClose={() => setSettingsState(null)}
        />
      )}
    </div>
  );
}
