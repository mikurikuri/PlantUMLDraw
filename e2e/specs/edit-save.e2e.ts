import { browser, $, expect } from "@wdio/globals";
import { Key } from "webdriverio";
import { copyFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { APP_PATH, WORK_DIR } from "../wdio.conf";

/** フィクスチャのコピーを引数にしてアプリを起動し直す。コピーしたファイルのパスを返す */
async function launchWith(fixture: string, copyName = fixture): Promise<string> {
  const file = path.join(WORK_DIR, copyName);
  copyFileSync(path.join(WORK_DIR, fixture), file);
  await browser.reloadSession({
    // @ts-expect-error tauri-driver 独自の capability
    "tauri:options": { application: APP_PATH, args: [file] },
  });
  await expect($("[data-testid='file-name']")).toHaveText(copyName, { wait: 10_000 });
  return file;
}

const previewImg = () => $("img[alt='プレビュー']");

/** プレビュー画像が出るまで待つ。出なければ、プレビュー欄の表示内容を添えて失敗させる */
async function waitForPreview(timeout = 10_000) {
  try {
    await previewImg().waitForExist({ timeout });
  } catch {
    const shown = await $(".preview").getText();
    throw new Error(`プレビューが表示されませんでした。表示内容: ${shown}`);
  }
}

/**
 * `@enduml` の直前に 1 行入力する（フィクスチャは最終行が `@enduml` + 改行）。
 * `@enduml` より後ろに書いても図は変わらないため、必ず図の中に入れる。
 */
async function typeLineBeforeEnduml(text: string) {
  await $(".cm-content").click();
  await browser.keys([Key.Ctrl, Key.End]);
  await browser.keys([Key.ArrowUp, Key.Home]);
  await browser.keys([...text.split(""), Key.Enter]);
}

describe("開く → 編集 → 保存（UC-01）", () => {
  it("AC1-1：100 行のクラス図を開くと 3 秒以内にプレビューが表示される", async () => {
    await launchWith("class-100-lines.puml");
    const start = Date.now();
    await waitForPreview();
    const elapsed = Date.now() - start;
    console.log(`  AC1-1 計測値: ファイル表示からプレビュー表示まで ${elapsed} ms`);
    expect(elapsed).toBeLessThan(3_000);
  });

  it("AC1-2：入力が止まってから 1 秒以内にプレビューが更新される", async () => {
    await launchWith("sequence.puml", "ac1-2.puml");
    await waitForPreview();
    const before = await previewImg().getAttribute("src");

    await typeLineBeforeEnduml("Web -> Auth : ログ記録");
    const start = Date.now();
    await browser.waitUntil(async () => (await previewImg().getAttribute("src")) !== before, {
      timeout: 5_000,
      interval: 20,
    });
    const elapsed = Date.now() - start;
    console.log(`  AC1-2 計測値: 入力停止からプレビュー更新まで ${elapsed} ms`);
    expect(elapsed).toBeLessThan(1_000);
  });

  it("AC1-3：構文エラーの行番号を表示し、直前の図は残す", async () => {
    await launchWith("sequence.puml", "ac1-3.puml");
    await waitForPreview();

    // 2 行目の末尾に改行して 3 行目に不正な行を入れる
    await $(".cm-content").click();
    await browser.keys([Key.Ctrl, Key.Home]);
    await browser.keys([Key.ArrowDown, Key.End]);
    await browser.keys("\nthis is wrong".split(""));

    const alert = $(".preview-error");
    await expect(alert).toHaveText(expect.stringContaining("3 行目"), { wait: 5_000 });
    await expect(previewImg()).toBeExisting();
  });

  it("AC1-4：CRLF のファイルを編集して Ctrl+S すると、CRLF のまま保存される", async () => {
    const file = await launchWith("sequence-crlf.puml", "ac1-4-crlf.puml");
    await typeLineBeforeEnduml("' 追記した行");
    await expect($("[data-testid='dirty-mark']")).toBeExisting();

    await browser.keys([Key.Ctrl, "s"]);
    await expect($("[data-testid='dirty-mark']")).not.toBeExisting({ wait: 5_000 });

    const saved = readFileSync(file);
    const text = saved.toString("utf8");
    expect(text).toContain("' 追記した行");
    expect(text.replace(/\r\n/g, "")).not.toContain("\n"); // LF 単独の改行が無い
    expect(saved.subarray(0, 3).toString("hex")).not.toBe("efbbbf"); // BOM は付けない
  });

  it("AC1-4：BOM 付きのファイルは BOM を付けたまま保存される", async () => {
    const file = await launchWith("sequence-bom.puml", "ac1-4-bom.puml");
    await typeLineBeforeEnduml("' BOM 確認");
    await browser.keys([Key.Ctrl, "s"]);
    await expect($("[data-testid='dirty-mark']")).not.toBeExisting({ wait: 5_000 });

    const saved = readFileSync(file);
    expect(saved.subarray(0, 3).toString("hex")).toBe("efbbbf");
    expect(saved.toString("utf8")).toContain("' BOM 確認");
  });
});
