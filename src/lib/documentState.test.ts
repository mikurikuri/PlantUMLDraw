import {
  documentReducer,
  fileName,
  initialDocumentState,
  isDirty,
  windowTitle,
  withPlantUmlExtension,
  type DocumentState,
} from "./documentState";

const loaded: DocumentState = documentReducer(initialDocumentState, {
  type: "loaded",
  doc: { path: "C:\\work\\seq.puml", content: "A", format: { lineEnding: "crlf", bom: true } },
});

describe("documentReducer", () => {
  it("新規状態は未保存の変更なし・ファイル名は「無題」", () => {
    expect(isDirty(initialDocumentState)).toBe(false);
    expect(fileName(initialDocumentState)).toBe("無題");
    expect(windowTitle(initialDocumentState)).toBe("無題 - PlantUMLDraw");
  });

  it("読み込むと内容と書式を引き継ぎ、未保存の変更なしになる", () => {
    expect(loaded).toMatchObject({ path: "C:\\work\\seq.puml", content: "A", savedContent: "A" });
    expect(loaded.format).toEqual({ lineEnding: "crlf", bom: true });
    expect(isDirty(loaded)).toBe(false);
    expect(fileName(loaded)).toBe("seq.puml");
  });

  it("編集すると未保存になり、タイトルに ● が付く", () => {
    const edited = documentReducer(loaded, { type: "edited", content: "AB" });
    expect(isDirty(edited)).toBe(true);
    expect(windowTitle(edited)).toBe("● seq.puml - PlantUMLDraw");
  });

  it("同じ内容の edited は状態を変えない", () => {
    expect(documentReducer(loaded, { type: "edited", content: "A" })).toBe(loaded);
  });

  it("保存中に入力された分は未保存として残る", () => {
    const typed = documentReducer(loaded, { type: "edited", content: "ABC" });
    const saved = documentReducer(typed, { type: "saved", path: "x.puml", content: "AB" });
    expect(saved.path).toBe("x.puml");
    expect(isDirty(saved)).toBe(true);
    expect(isDirty(documentReducer(typed, { type: "saved", path: "x.puml", content: "ABC" }))).toBe(
      false,
    );
  });

  it("new で初期状態に戻る", () => {
    expect(documentReducer(loaded, { type: "new" })).toEqual(initialDocumentState);
  });
});

describe("withPlantUmlExtension", () => {
  it("拡張子が無ければ .puml を付ける", () => {
    expect(withPlantUmlExtension("C:\\a\\design")).toBe("C:\\a\\design.puml");
    expect(withPlantUmlExtension("design.pu")).toBe("design.pu");
  });
});
