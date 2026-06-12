/**
 * sync-standards.mjs — 開発標準（CodeAppsDevelopmentStandard）をこのプロジェクトに同期する
 *
 * CodeAppsDevelopmentStandard を shallow clone し、エージェント・スキル・共有ファイルを
 * このプロジェクトにコピーする。テーマ固有のコード（src/ 等）には一切触れない。
 *
 * Usage:
 *   node scripts/sync-standards.mjs                 # 標準を同期
 *   node scripts/sync-standards.mjs --setup         # 同期後に bootstrap（環境チェック）も実行
 *   node scripts/sync-standards.mjs --with-samples  # サンプル実装（skills/＊/samples/）も取得
 *
 * 同期対象（標準リポ → このプロジェクト）:
 *   .github/   … エージェント・スキル（samples/ はデフォルト除外）
 *   .claude/   … Claude Code エージェント定義（存在する場合）
 *   auth_helper.py / patch-nameutils.cjs … スキルが参照する共有ヘルパー
 *   public/maps/ … japan-map スキルの共有 SVG アセット
 *   scripts/bootstrap.mjs / scripts/pre-deploy-check.mjs … 標準スクリプト
 *   work/input/ … spec-to-markdown の入力ディレクトリ（空で作成）
 *   .env.example … 存在しない場合のみコピー
 *
 * 同期 *しない* もの:
 *   skills/＊/samples/（--with-samples 指定時を除く）
 *   .power/ / src/generated/ / power.config.json … pac code init / add-data-source で SDK が生成する
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const STANDARD_REPO =
  process.env.CODEAPPS_STANDARD_REPO ||
  "https://github.com/geekfujiwara/CodeAppsDevelopmentStandard.git";

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), "..");
const withSamples = process.argv.includes("--with-samples");
const runSetup = process.argv.includes("--setup");

// skills/<name>/samples/ 配下を判定（--with-samples 指定がなければ除外）
const SAMPLES_RE = /(^|[\\/])skills[\\/][^\\/]+[\\/]samples([\\/]|$)/;

function copyTree(src, dest, { excludeSamples = false } = {}) {
  if (!fs.existsSync(src)) return false;
  fs.cpSync(src, dest, {
    recursive: true,
    force: true,
    filter: (s) => !(excludeSamples && SAMPLES_RE.test(path.relative(src, s))),
  });
  return true;
}

function copyFile(src, dest, { skipIfExists = false } = {}) {
  if (!fs.existsSync(src)) return false;
  if (skipIfExists && fs.existsSync(dest)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

// ── 1. 標準リポを shallow clone ──────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sync-standards-"));
console.log(`開発標準を取得: ${STANDARD_REPO}`);
const clone = spawnSync("git", ["clone", "--depth", "1", STANDARD_REPO, tmp], {
  stdio: ["ignore", "inherit", "inherit"],
});
if (clone.status !== 0) {
  console.error("clone に失敗しました。ネットワークとリポジトリ URL を確認してください。");
  process.exit(1);
}

// ── 2. 同期 ──────────────────────────────────────────
const results = [];
const sync = (label, fn) => results.push([label, fn()]);

sync(`.github/ ${withSamples ? "（samples 含む）" : "（samples 除外）"}`, () =>
  copyTree(path.join(tmp, ".github"), path.join(projectRoot, ".github"), {
    excludeSamples: !withSamples,
  }),
);
sync(".claude/", () => copyTree(path.join(tmp, ".claude"), path.join(projectRoot, ".claude")));
sync("auth_helper.py", () => copyFile(path.join(tmp, "auth_helper.py"), path.join(projectRoot, "auth_helper.py")));
sync("patch-nameutils.cjs", () => copyFile(path.join(tmp, "patch-nameutils.cjs"), path.join(projectRoot, "patch-nameutils.cjs")));
sync("public/maps/", () => copyTree(path.join(tmp, "public", "maps"), path.join(projectRoot, "public", "maps")));
sync("scripts/bootstrap.mjs", () => copyFile(path.join(tmp, "scripts", "bootstrap.mjs"), path.join(projectRoot, "scripts", "bootstrap.mjs")));
sync("scripts/pre-deploy-check.mjs", () => copyFile(path.join(tmp, "scripts", "pre-deploy-check.mjs"), path.join(projectRoot, "scripts", "pre-deploy-check.mjs")));
sync(".env.example（なければ）", () => copyFile(path.join(tmp, ".env.example"), path.join(projectRoot, ".env.example"), { skipIfExists: true }));
sync("work/input/", () => {
  fs.mkdirSync(path.join(projectRoot, "work", "input"), { recursive: true });
  return true;
});

for (const [label, done] of results) {
  console.log(`  ${done ? "✓" : "−"} ${label}${done ? "" : "（ソースに存在せずスキップ）"}`);
}

// ── 3. 後片付け ──────────────────────────────────────
try {
  fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 3 });
} catch {
  console.warn(`一時ディレクトリの削除に失敗しました（無害）: ${tmp}`);
}

console.log("開発標準の同期が完了しました。git diff で差分を確認してからコミットしてください。");

// ── 4. --setup: bootstrap（環境チェック + Python venv）──
if (runSetup) {
  const bootstrap = path.join(projectRoot, "scripts", "bootstrap.mjs");
  if (fs.existsSync(bootstrap)) {
    console.log("\n環境セットアップ（bootstrap --setup）を実行します...");
    const r = spawnSync(process.execPath, [bootstrap, "--setup"], { stdio: "inherit", cwd: projectRoot });
    process.exit(r.status ?? 0);
  } else {
    console.warn("scripts/bootstrap.mjs が見つからないため環境セットアップをスキップしました。");
  }
}
