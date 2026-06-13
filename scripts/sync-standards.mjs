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
 *   .github/                  … エージェント・スキル（template-root/ と samples/ は除外）
 *   .claude/                  … Claude Code エージェント定義（存在する場合）
 *   .github/template-root/*   … テーマのルートに展開される共有ファイル:
 *                                 auth_helper.py / patch-nameutils.cjs / .env.example /
 *                                 public/maps/ / scripts/（bootstrap.mjs・pre-deploy-check.mjs）
 *   work/input/               … spec-to-markdown の入力ディレクトリ（空で作成）
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
// .github 直下の template-root（テーマのルートへ別途展開するため .github コピーからは除外）
const TEMPLATE_ROOT_RE = /(^|[\\/])template-root([\\/]|$)/;

function copyTree(src, dest, { filter } = {}) {
  if (!fs.existsSync(src)) return false;
  fs.cpSync(src, dest, { recursive: true, force: true, filter });
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

const githubSrc = path.join(tmp, ".github");
sync(`.github/ ${withSamples ? "（samples 含む）" : "（samples 除外）"} / template-root 除外`, () =>
  copyTree(githubSrc, path.join(projectRoot, ".github"), {
    filter: (s) => {
      const rel = path.relative(githubSrc, s);
      if (TEMPLATE_ROOT_RE.test(rel)) return false;
      if (!withSamples && SAMPLES_RE.test(rel)) return false;
      return true;
    },
  }),
);

sync(".claude/", () => copyTree(path.join(tmp, ".claude"), path.join(projectRoot, ".claude")));

// 共有ファイルをテーマのルートへ展開（.env.example は既存なら上書きしない）
const keepEnvExample = (s, d) => !(path.basename(s) === ".env.example" && fs.existsSync(d));
const templateRootSrc = path.join(tmp, ".github", "template-root");
if (fs.existsSync(templateRootSrc)) {
  // 新レイアウト: .github/template-root/* をまとめて展開
  sync("template-root/* → プロジェクトルート（.env.example は既存を保持）", () =>
    copyTree(templateRootSrc, projectRoot, { filter: keepEnvExample }),
  );
} else {
  // 旧レイアウト（template-root 導入前の main）へのフォールバック: ルート直下から個別取得
  const copyFile = (rel, { skipIfExists = false } = {}) => {
    const src = path.join(tmp, rel);
    const dest = path.join(projectRoot, rel);
    if (!fs.existsSync(src)) return false;
    if (skipIfExists && fs.existsSync(dest)) return false;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    return true;
  };
  sync("auth_helper.py（旧レイアウト）", () => copyFile("auth_helper.py"));
  sync("patch-nameutils.cjs（旧レイアウト）", () => copyFile("patch-nameutils.cjs"));
  sync("public/maps/（旧レイアウト）", () => copyTree(path.join(tmp, "public", "maps"), path.join(projectRoot, "public", "maps")));
  sync("scripts/bootstrap.mjs（旧レイアウト）", () => copyFile(path.join("scripts", "bootstrap.mjs")));
  sync("scripts/pre-deploy-check.mjs（旧レイアウト）", () => copyFile(path.join("scripts", "pre-deploy-check.mjs")));
  sync(".env.example（旧レイアウト・なければ）", () => copyFile(".env.example", { skipIfExists: true }));
}

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
