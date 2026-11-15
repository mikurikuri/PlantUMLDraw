/**
 * E2E テスト（WebdriverIO + tauri-driver）。
 * 実行: npm run test:e2e
 *   - 事前に `npm run tauri build -- --debug --no-bundle` でアプリをビルドしておく（test:e2e が行う）
 *   - Windows: vendor/msedgedriver/msedgedriver.exe（npm run fetch:msedgedriver）
 *   - Linux:   WebKitWebDriver（webkit2gtk-driver パッケージ）と xvfb
 *
 * テストごとに、フィクスチャをコピーした一時ファイルをコマンドライン引数で渡してアプリを起動する。
 */
import { spawn, type ChildProcess } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const isWindows = process.platform === "win32";

/**
 * テスト対象のアプリ。既定は `src-tauri/target/debug`。
 * 別の場所にビルドした場合（CARGO_TARGET_DIR を変えた場合）は環境変数 `CARGO_TARGET_DIR` に合わせる。
 */
export const APP_PATH = path.join(
  process.env.CARGO_TARGET_DIR
    ? path.resolve(process.env.CARGO_TARGET_DIR)
    : path.join(root, "src-tauri", "target"),
  "debug",
  isWindows ? "plantumldraw.exe" : "plantumldraw",
);
/** テスト中に編集・保存するファイルの置き場（毎回作り直す） */
export const WORK_DIR = path.join(os.tmpdir(), "plantumldraw-e2e");
const FIXTURES = path.join(root, "tests", "fixtures");

let tauriDriver: ChildProcess | undefined;

function tauriDriverPath() {
  const exe = isWindows ? "tauri-driver.exe" : "tauri-driver";
  return path.join(os.homedir(), ".cargo", "bin", exe);
}

export const config: WebdriverIO.Config = {
  runner: "local",
  specs: ["./specs/**/*.e2e.ts"],
  maxInstances: 1,
  hostname: "127.0.0.1",
  port: 4444,
  capabilities: [
    {
      // 各テストで browser.reloadSession() により引数を変えて起動し直す
      // @ts-expect-error tauri-driver 独自の capability
      "tauri:options": { application: APP_PATH },
    },
  ],
  logLevel: "warn",
  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: { ui: "bdd", timeout: 60_000 },

  onPrepare() {
    rmSync(WORK_DIR, { recursive: true, force: true });
    mkdirSync(WORK_DIR, { recursive: true });
    cpSync(FIXTURES, WORK_DIR, { recursive: true });
  },

  beforeSession() {
    const args = isWindows
      ? ["--native-driver", path.join(root, "vendor", "msedgedriver", "msedgedriver.exe")]
      : [];
    tauriDriver = spawn(tauriDriverPath(), args, { stdio: [null, process.stdout, process.stderr] });
  },

  afterSession() {
    tauriDriver?.kill();
  },
};
