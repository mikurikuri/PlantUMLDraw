// Windows で E2E テストを動かすための msedgedriver を取得する。
// インストール済みの WebView2 Runtime と同じバージョンを Microsoft 公式から取得し、
// vendor/msedgedriver/msedgedriver.exe に置く。
//
// 使い方: npm run fetch:msedgedriver（Windows のみ）
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "win32") {
  console.log("msedgedriver は Windows でのみ必要です（Linux は WebKitWebDriver を使います）。");
  process.exit(0);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "vendor", "msedgedriver");
const exe = join(dir, "msedgedriver.exe");
const versionFile = join(dir, "version.txt");

function webview2Version() {
  const keys = [
    "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
    "HKCU\\Software\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
  ];
  for (const key of keys) {
    try {
      const out = execFileSync("reg", ["query", key, "/v", "pv"], { encoding: "utf8" });
      const m = out.match(/pv\s+REG_SZ\s+([\d.]+)/);
      if (m) return m[1];
    } catch {
      // 次の場所を探す
    }
  }
  throw new Error("WebView2 Runtime のバージョンが見つかりません。");
}

const version = webview2Version();
if (existsSync(exe) && existsSync(versionFile) && readFileSync(versionFile, "utf8") === version) {
  console.log(`msedgedriver ${version} は取得済みです: ${exe}`);
  process.exit(0);
}

const url = `https://msedgedriver.microsoft.com/${version}/edgedriver_win64.zip`;
console.log(`msedgedriver ${version} を取得しています: ${url}`);
const res = await fetch(url);
if (!res.ok) {
  console.error(`ダウンロードに失敗しました: HTTP ${res.status}`);
  process.exit(1);
}
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const zip = join(dir, "edgedriver.zip");
writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
execFileSync("powershell", [
  "-NoProfile",
  "-Command",
  `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${dir}' -Force`,
]);
rmSync(zip);
writeFileSync(versionFile, version);
console.log(`保存しました: ${exe}`);
