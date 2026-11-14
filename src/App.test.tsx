import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EditorView } from "@codemirror/view";
import App from "./App";
import * as ipc from "./lib/ipc";
import * as dialogs from "./lib/dialogs";

vi.mock("./lib/ipc", async (orig) => ({
  ...(await orig<typeof import("./lib/ipc")>()),
  getInitialFile: vi.fn(),
  getSettings: vi.fn(),
  setSettings: vi.fn(),
  getRendererStatus: vi.fn(),
  onCloseRequested: vi.fn(),
  openDocument: vi.fn(),
  renderDiagram: vi.fn(),
  saveDocument: vi.fn(),
  setWindowTitle: vi.fn(),
}));
vi.mock("./lib/dialogs", () => ({
  pickOpenPath: vi.fn(),
  pickSavePath: vi.fn(),
  confirmDiscard: vi.fn(),
  showError: vi.fn(),
}));

const m = vi.mocked(ipc);
const d = vi.mocked(dialogs);
type CloseHandler = Parameters<typeof ipc.onCloseRequested>[0];
let closeHandler: CloseHandler | undefined;

const CRLF_DOC = {
  path: "C:\\work\\seq.puml",
  content: "@startuml\nA -> B\n@enduml\n",
  format: { lineEnding: "crlf" as const, bom: false },
};

/** CodeMirror に文字を入力したのと同じ変更を加える */
function typeInEditor(text: string) {
  const el = screen.getByTestId("editor").querySelector(".cm-editor") as HTMLElement;
  const view = EditorView.findFromDOM(el)!;
  act(() => view.dispatch({ changes: { from: view.state.doc.length, insert: text } }));
}

beforeEach(() => {
  vi.resetAllMocks();
  m.getInitialFile.mockResolvedValue(null);
  m.renderDiagram.mockResolvedValue("<svg/>");
  m.setWindowTitle.mockResolvedValue(undefined);
  m.saveDocument.mockResolvedValue(undefined);
  m.getRendererStatus.mockReturnValue(new Promise(() => undefined));
  m.onCloseRequested.mockImplementation((h) => {
    closeHandler = h;
    return Promise.resolve(() => undefined);
  });
});

describe("App", () => {
  it("起動引数のファイルを開き、内容と書式を表示する", async () => {
    m.getInitialFile.mockResolvedValue(CRLF_DOC.path);
    m.openDocument.mockResolvedValue(CRLF_DOC);
    render(<App />);
    expect(await screen.findByTestId("file-name")).toHaveTextContent("seq.puml");
    expect(screen.getByText("CRLF")).toBeInTheDocument();
    expect(screen.getByTestId("editor")).toHaveTextContent("A -> B");
  });

  it("編集すると未保存マークが付き、Ctrl+S で元の書式のまま保存する（AC1-4）", async () => {
    m.getInitialFile.mockResolvedValue(CRLF_DOC.path);
    m.openDocument.mockResolvedValue(CRLF_DOC);
    render(<App />);
    await screen.findByText("seq.puml");
    typeInEditor("' memo\n");
    expect(screen.getByTestId("dirty-mark")).toBeInTheDocument();
    expect(m.setWindowTitle).toHaveBeenLastCalledWith("● seq.puml - PlantUMLDraw");

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => expect(screen.queryByTestId("dirty-mark")).not.toBeInTheDocument());
    expect(m.saveDocument).toHaveBeenCalledWith(
      CRLF_DOC.path,
      `${CRLF_DOC.content}' memo\n`,
      CRLF_DOC.format,
    );
  });

  it("新規ファイルの保存は保存先を尋ね、拡張子が無ければ .puml を付ける", async () => {
    d.pickSavePath.mockResolvedValue("C:\\work\\new-design");
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() =>
      expect(m.saveDocument).toHaveBeenCalledWith("C:\\work\\new-design.puml", expect.any(String), {
        lineEnding: "lf",
        bom: false,
      }),
    );
    expect(await screen.findByText("new-design.puml")).toBeInTheDocument();
  });

  it("保存ダイアログをキャンセルしたら何もしない", async () => {
    d.pickSavePath.mockResolvedValue(null);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "名前を付けて保存" }));
    await waitFor(() => expect(d.pickSavePath).toHaveBeenCalled());
    expect(m.saveDocument).not.toHaveBeenCalled();
  });

  it("開けないファイルはメッセージを出し、編集中の内容は残す", async () => {
    d.pickOpenPath.mockResolvedValue("C:\\sjis.puml");
    m.openDocument.mockRejectedValue("UTF-8 のファイルではないため開けません。");
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "開く" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("UTF-8 のファイルではない");
    expect(screen.getByTestId("file-name")).toHaveTextContent("無題");
  });

  it("未保存の変更があるとき、開く前に確認し、キャンセルなら開かない", async () => {
    d.confirmDiscard.mockResolvedValue(false);
    render(<App />);
    typeInEditor("x");
    fireEvent.click(screen.getByRole("button", { name: "開く" }));
    await waitFor(() => expect(d.confirmDiscard).toHaveBeenCalled());
    expect(d.pickOpenPath).not.toHaveBeenCalled();
  });

  it("未保存で閉じようとすると確認し、キャンセルなら閉じない（AC1-5）", async () => {
    d.confirmDiscard.mockResolvedValue(false);
    render(<App />);
    typeInEditor("x");
    const event = { preventDefault: vi.fn() } as unknown as Parameters<CloseHandler>[0];
    await act(() => closeHandler!(event));
    expect(d.confirmDiscard).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("未保存の変更が無ければ確認せずに閉じる", async () => {
    render(<App />);
    const event = { preventDefault: vi.fn() } as unknown as Parameters<CloseHandler>[0];
    await act(() => closeHandler!(event));
    expect(d.confirmDiscard).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("Java が見つからない場合は案内を表示し、設定を保存すると描き直す（AC1-6）", async () => {
    m.renderDiagram.mockRejectedValueOnce({ kind: "javaNotFound", java: "java" });
    m.getSettings.mockResolvedValue({ javaPath: null, plantumlJar: null });
    m.setSettings.mockImplementation(async (s) => s);
    render(<App />);
    expect(await screen.findByText("Java が見つかりません")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "設定を開く" }));
    const input = await screen.findByLabelText("java のパス");
    fireEvent.change(input, { target: { value: "D:\\jdk\\bin\\java.exe" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "保存" }));
    await waitFor(() =>
      expect(m.setSettings).toHaveBeenCalledWith({
        javaPath: "D:\\jdk\\bin\\java.exe",
        plantumlJar: null,
      }),
    );
    await waitFor(() => expect(m.renderDiagram).toHaveBeenCalledTimes(2));
    expect(await screen.findByAltText("プレビュー")).toBeInTheDocument();
  });
});
