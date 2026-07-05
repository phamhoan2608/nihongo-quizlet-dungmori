/**
 * Auto-fetch example sentences (Tatoeba) for each vocab card.
 * Saves to data/examples.json (id → [{jp, en, vi?}]).
 * Also translates EN → VI via MyMemory (free, no key).
 *
 * Usage:
 *   node scripts/fetch-examples.mjs [--reset] [--max=N]
 *
 * --reset : clear existing examples.json and re-fetch everything
 * --max=N : only process first N pending cards (for testing)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const reset = process.argv.includes("--reset");
const viRefill = process.argv.includes("--vi-refill");
const maxArg = process.argv.find((a) => a.startsWith("--max="));
const MAX = maxArg ? parseInt(maxArg.slice(6), 10) : Infinity;

// ── HTTP ──────────────────────────────────────────────────────────────────
function curlGet(url) {
  try {
    const out = execSync(`curl -s --max-time 15 "${url.replace(/"/g, '\\"')}"`, { encoding: "utf-8" });
    return JSON.parse(out);
  } catch {
    return null;
  }
}

function sleep(seconds) {
  execSync(`sleep ${seconds}`);
}

// ── Data ──────────────────────────────────────────────────────────────────
const n5 = JSON.parse(fs.readFileSync(path.join(ROOT, "data/n5.json"), "utf-8"));
const examplesPath = path.join(ROOT, "data/examples.json");

const existing = !reset && fs.existsSync(examplesPath)
  ? JSON.parse(fs.readFileSync(examplesPath, "utf-8"))
  : {};

if (reset) console.log("--reset: clearing existing examples.\n");

// ── Clean the search query for Tatoeba ────────────────────────────────────
function cleanWord(w) {
  return w
    .replace(/[～~]/g, "")
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/する$/, "")
    .replace(/[、。！？]/g, "")
    .trim();
}

// ── Fetch from Tatoeba ────────────────────────────────────────────────────
function fetchTatoeba(word) {
  const q = cleanWord(word);
  if (!q) return [];
  const url = `https://tatoeba.org/en/api_v0/search?query=${encodeURIComponent(q)}&from=jpn&to=eng&sort=relevance`;
  const data = curlGet(url);
  const results = (data?.results ?? []).slice(0, 3);
  return results
    .map((r) => {
      const allTranslations = (r.translations ?? []).flat();
      const en = allTranslations.find((t) => t.lang === "eng")?.text;
      return { jp: r.text, en };
    })
    .filter((e) => e.jp && e.en)
    .slice(0, 2);
}

// ── Translate EN → VI via MyMemory ────────────────────────────────────────
let mymemoryExhausted = false;

function translateEnToVi(text) {
  if (!text || mymemoryExhausted) return null;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|vi`;
  const data = curlGet(url);
  const result = data?.responseData?.translatedText;
  if (!result) return null;
  // Detect quota-exhausted response
  if (result.includes("MYMEMORY WARNING")) {
    mymemoryExhausted = true;
    console.log("\n⚠ MyMemory quota exhausted. Skipping VI translation for remaining cards.");
    return null;
  }
  if (result.toLowerCase() === text.toLowerCase()) return null;
  return result;
}

// ── Main ──────────────────────────────────────────────────────────────────
const result = { ...existing };

// Mode 1: --vi-refill — chỉ dịch bổ sung VI cho entry đã có (không fetch lại Tatoeba)
if (viRefill) {
  console.log("VI-refill mode: only translating existing entries missing 'vi'.\n");
  let filled = 0, quotaHit = false;
  for (const id of Object.keys(result)) {
    if (quotaHit) break;
    for (const ex of result[id]) {
      if (ex.vi || !ex.en) continue;
      const vi = translateEnToVi(ex.en);
      sleep(0.4);
      if (mymemoryExhausted) { quotaHit = true; break; }
      if (vi) { ex.vi = vi; filled++; }
    }
    if (filled % 20 === 0 && filled > 0) {
      fs.writeFileSync(examplesPath, JSON.stringify(result, null, 2) + "\n");
    }
  }
  fs.writeFileSync(examplesPath, JSON.stringify(result, null, 2) + "\n");
  console.log(`\nDone. ✓ ${filled} câu đã dịch bổ sung VI.`);
  process.exit(0);
}

// Mode 2: default — fetch Tatoeba + translate cho các từ chưa có entry
const todo = n5.filter((c) => !result[String(c.id)]).slice(0, MAX);

console.log(`${n5.length} cards total, ${todo.length} need examples.\n`);

let done = 0, skipped = 0;

for (const card of todo) {
  const jp = cleanWord(card.word);
  process.stdout.write(`[${card.id}] ${jp} … `);

  const examples = fetchTatoeba(card.word);
  sleep(1.0); // Tatoeba rate limit

  if (examples.length === 0) {
    skipped++;
    console.log("— no sentences");
    continue;
  }

  // Translate first sentence's EN to VI
  for (const ex of examples) {
    if (ex.en) {
      const vi = translateEnToVi(ex.en);
      if (vi) ex.vi = vi;
      sleep(0.4);
    }
  }

  result[String(card.id)] = examples;
  done++;
  console.log(`✓ ${examples.length} câu`);

  // Save incrementally every 10 cards
  if (done % 10 === 0) {
    fs.writeFileSync(examplesPath, JSON.stringify(result, null, 2) + "\n");
  }
}

fs.writeFileSync(examplesPath, JSON.stringify(result, null, 2) + "\n");
console.log(`\nDone. ✓ ${done} có ví dụ  — ${skipped} không có`);
console.log(`Saved to data/examples.json (${Object.keys(result).length} total).`);
