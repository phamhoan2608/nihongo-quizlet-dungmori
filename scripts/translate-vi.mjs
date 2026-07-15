/**
 * Dịch EN → VI cho các entry trong examples.json còn thiếu `vi`.
 * Dùng Google Translate unofficial endpoint (dùng cùng như /api/tts).
 *
 * Usage: node scripts/translate-vi.mjs [--max=N]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const examplesPath = path.join(ROOT, "data/examples.json");

const maxArg = process.argv.find((a) => a.startsWith("--max="));
const MAX = maxArg ? parseInt(maxArg.slice(6), 10) : Infinity;

function curlGet(url) {
  try {
    const out = execSync(`curl -s --max-time 12 "${url.replace(/"/g, '\\"')}"`, { encoding: "utf-8" });
    return JSON.parse(out);
  } catch { return null; }
}

function sleep(seconds) { execSync(`sleep ${seconds}`); }

// Google Translate unofficial - trả về mảng lồng nhau: [[["dịch","gốc",...]],...]
function translate(en) {
  if (!en) return null;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(en)}`;
  const data = curlGet(url);
  const parts = data?.[0];
  if (!Array.isArray(parts)) return null;
  const joined = parts.map((p) => p?.[0] ?? "").join("").trim();
  if (!joined || joined.toLowerCase() === en.toLowerCase()) return null;
  return joined;
}

// ── Main ──────────────────────────────────────────────────────────────────
const data = JSON.parse(fs.readFileSync(examplesPath, "utf-8"));

// Collect tasks
const tasks = [];
for (const id of Object.keys(data)) {
  for (const ex of data[id]) {
    if (!ex.vi && ex.en) tasks.push(ex);
  }
}

const todo = tasks.slice(0, MAX);
console.log(`Có ${tasks.length} câu cần dịch, xử lý ${todo.length} câu.\n`);

let done = 0, saved = 0;
for (const ex of todo) {
  process.stdout.write(`[${done + 1}/${todo.length}] "${ex.en.slice(0, 40)}..." → `);
  const vi = translate(ex.en);
  sleep(0.3);
  if (vi) {
    ex.vi = vi;
    console.log(vi.slice(0, 60));
    saved++;
  } else {
    console.log("— skip");
  }
  done++;
  if (done % 20 === 0) {
    fs.writeFileSync(examplesPath, JSON.stringify(data, null, 2) + "\n");
  }
}

fs.writeFileSync(examplesPath, JSON.stringify(data, null, 2) + "\n");
console.log(`\nDone. ✓ ${saved} câu đã dịch VI.`);
