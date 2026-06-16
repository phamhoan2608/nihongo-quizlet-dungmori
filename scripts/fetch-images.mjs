/**
 * Auto-fetch vocabulary images from Pixabay (free API).
 * Uses Jisho.org (free, no key) to get English meanings from Japanese words,
 * then searches Pixabay with the English keyword for accurate results.
 *
 * Usage:
 *   node scripts/fetch-images.mjs --key=YOUR_PIXABAY_KEY [--reset]
 *
 * --reset  : clear existing images.json and re-fetch everything
 *
 * Get a free Pixabay key at: https://pixabay.com/api/docs/
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

/** HTTP GET via curl (more reliable than Node fetch in restricted envs). */
function curlGet(url) {
  try {
    const out = execSync(`curl -s --max-time 15 "${url}"`, { encoding: "utf-8" });
    return JSON.parse(out);
  } catch {
    return null;
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Args ─────────────────────────────────────────────────────────────────────
const apiKey = process.argv.find((a) => a.startsWith("--key="))?.slice(6);
const reset  = process.argv.includes("--reset");

if (!apiKey) {
  console.error("Usage: node scripts/fetch-images.mjs --key=YOUR_PIXABAY_KEY [--reset]");
  process.exit(1);
}

// ── Load data ─────────────────────────────────────────────────────────────────
const n5 = JSON.parse(fs.readFileSync(path.join(ROOT, "data/n5.json"), "utf-8"));
const imagesPath = path.join(ROOT, "data/images.json");

const existing = (!reset && fs.existsSync(imagesPath))
  ? JSON.parse(fs.readFileSync(imagesPath, "utf-8"))
  : {};

if (reset) console.log("--reset: clearing existing images.\n");

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(seconds) {
  execSync(`sleep ${seconds}`);
}

/** Strip Japanese prefix/suffix markers before looking up. */
function cleanWord(w) {
  return w
    .replace(/[～~]/g, "")
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/[、。]/g, " ")
    .trim()
    .split(/\s+/)[0];
}

/** Extract the first clean term from a Vietnamese meaning string. */
function cleanMeaning(meaning) {
  return meaning
    .split(/[,，;；/]/)[0]
    .replace(/[①②③④⑤]/g, "")
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/[~～]/g, "")
    .trim();
}

/**
 * Look up Japanese word on Jisho and return the first English definition.
 * Returns null if not found.
 */
function getEnglishFromJisho(word) {
  const q = cleanWord(word);
  if (!q) return null;
  const url = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(q)}`;
  const data = curlGet(url);
  const defs = data?.data?.[0]?.senses?.[0]?.english_definitions;
  return defs?.[0] ?? null;
}

/**
 * Translate Vietnamese meaning → English using MyMemory free API.
 * Returns null on failure.
 */
function translateViToEn(meaning) {
  const text = cleanMeaning(meaning);
  if (!text) return null;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=vi|en`;
  const data = curlGet(url);
  const result = data?.responseData?.translatedText;
  // MyMemory returns the input unchanged if it can't translate
  if (!result || result.toLowerCase() === text.toLowerCase()) return null;
  return result;
}

/**
 * Fetch a relevant image URL from Pixabay for the given English keyword.
 * Returns null if nothing found.
 */
function fetchPixabayImage(keyword) {
  const params = new URLSearchParams({
    key: apiKey,
    q: keyword,
    image_type: "photo",
    safesearch: "true",
    per_page: "5",
    min_width: "300",
  });
  const data = curlGet(`https://pixabay.com/api/?${params}`);
  if (!data) return null;
  const hit = data.hits?.find((h) => h.imageWidth >= h.imageHeight) ?? data.hits?.[0];
  return hit?.previewURL ?? null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const result = { ...existing };
const todo = n5.filter((c) => !result[String(c.id)]);

console.log(`${n5.length} cards total, ${todo.length} need images.\n`);

let fetched = 0, noEn = 0, noImg = 0;

for (const card of todo) {
  const jp = cleanWord(card.reading || card.word);
  process.stdout.write(`[${card.id}] ${jp} … `);

  // Step 1a: Japanese → English via Jisho
  let english = getEnglishFromJisho(jp);
  sleep(0.5);

  // Step 1b: fallback — translate Vietnamese meaning via MyMemory
  if (!english) {
    english = translateViToEn(card.meaning);
    sleep(0.4);
    if (english) process.stdout.write(`[vi→en] `);
  }

  if (!english) {
    noEn++;
    console.log("— no English found");
    continue;
  }

  process.stdout.write(`"${english}" → `);

  // Step 2: English → image via Pixabay
  const imageUrl = fetchPixabayImage(english);
  sleep(0.7); // Pixabay free: 100 req/min

  if (imageUrl) {
    result[String(card.id)] = imageUrl;
    fetched++;
    console.log("✓");
  } else {
    noImg++;
    console.log("— no image");
  }

  // Save incrementally every 20 words in case of interruption
  if ((fetched + noEn + noImg) % 20 === 0) {
    fs.writeFileSync(imagesPath, JSON.stringify(result, null, 2) + "\n");
  }
}

// ── Final save ────────────────────────────────────────────────────────────────
fs.writeFileSync(imagesPath, JSON.stringify(result, null, 2) + "\n");
console.log(`\nDone. ✓ ${fetched} images  — ${noEn} no EN translation  — ${noImg} no image`);
console.log(`Saved to data/images.json (${Object.keys(result).length} total).`);
