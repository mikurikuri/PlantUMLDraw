// plantuml.jar（MIT 版）を Maven Central から取得し、vendor/plantuml.jar に置く。
// 既に正しいファイルがあれば何もしない。SHA-256 が一致しなければ失敗する。
//
// 使い方: npm run fetch:plantuml
// バージョンを上げるときは VERSION と SHA256 を両方更新し、ADR-0004 / THIRD_PARTY_NOTICES を確認すること。
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "1.2026.10";
const SHA256 = "b0387a5d8edf062a288017fa1b52aa1774ae6f7e90705194eaecff5ab8b80662";
const URL = `https://repo1.maven.org/maven2/net/sourceforge/plantuml/plantuml-mit/${VERSION}/plantuml-mit-${VERSION}.jar`;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "vendor", "plantuml.jar");

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

if (existsSync(dest) && sha256(readFileSync(dest)) === SHA256) {
  console.log(`plantuml-mit ${VERSION} は取得済みです: ${dest}`);
  process.exit(0);
}

console.log(`plantuml-mit ${VERSION} を取得しています: ${URL}`);
const res = await fetch(URL);
if (!res.ok) {
  console.error(`ダウンロードに失敗しました: HTTP ${res.status}`);
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
const actual = sha256(buf);
if (actual !== SHA256) {
  console.error(`SHA-256 が一致しません。期待値 ${SHA256} / 実際 ${actual}`);
  process.exit(1);
}
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, buf);
console.log(`保存しました: ${dest}（${buf.length} bytes）`);
