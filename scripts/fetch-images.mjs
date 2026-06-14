/**
 * Auto-fetch vocabulary images from Pixabay free API.
 *
 * Usage:
 *   node scripts/fetch-images.mjs --key=YOUR_PIXABAY_KEY
 *
 * Get a free API key at: https://pixabay.com/api/docs/
 * (Register → My Account → API key)
 *
 * Results are saved to data/images.json as { "cardId": "imageUrl", ... }
 * Run again any time to fill in missing entries without re-fetching existing ones.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Parse args ──────────────────────────────────────────────────────────────
const apiKey = process.argv.find((a) => a.startsWith("--key="))?.slice(6);
if (!apiKey) {
  console.error("Usage: node scripts/fetch-images.mjs --key=YOUR_PIXABAY_KEY");
  process.exit(1);
}

// ── Load data ────────────────────────────────────────────────────────────────
const n5 = JSON.parse(fs.readFileSync(path.join(ROOT, "data/n5.json"), "utf-8"));
const imagesPath = path.join(ROOT, "data/images.json");
const existing = fs.existsSync(imagesPath)
  ? JSON.parse(fs.readFileSync(imagesPath, "utf-8"))
  : {};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract a clean keyword from Vietnamese meaning for image search. */
function extractKeyword(meaning) {
  return meaning
    .split(/[,，;；/、]/)[0]          // take first alternative
    .replace(/[（(][^）)]*[）)]/g, "") // strip parentheses
    .replace(/[~～。・]/g, " ")
    .trim();
}

/** Fetch best image URL from Pixabay for a keyword. Returns null if not found. */
async function fetchImage(keyword) {
  const params = new URLSearchParams({
    key: apiKey,
    q: keyword,
    image_type: "photo",
    safesearch: "true",
    per_page: "5",
    min_width: "300",
  });
  const url = `https://pixabay.com/api/?${params}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // Prefer landscape photos with good resolution
    const hit = data.hits?.find((h) => h.imageWidth >= h.imageHeight) ?? data.hits?.[0];
    return hit?.webformatURL ?? null;
  } catch (err) {
    console.error(`  ✗ fetch error for "${keyword}": ${err.message}`);
    return null;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
const result = { ...existing };
const cards = n5.filter((c) => !result[String(c.id)]); // skip already-fetched

console.log(`Found ${n5.length} cards, ${cards.length} need images.\n`);

let fetched = 0;
let skipped = 0;

for (const card of cards) {
  const keyword = extractKeyword(card.meaning);
  process.stdout.write(`[${card.id}] "${card.reading || card.word}" → "${keyword}" … `);

  const imageUrl = await fetchImage(keyword);
  if (imageUrl) {
    result[String(card.id)] = imageUrl;
    fetched++;
    console.log("✓");
  } else {
    skipped++;
    console.log("— no result");
  }

  // Pixabay free tier: 100 requests/min → ~600ms gap is safe
  await new Promise((r) => setTimeout(r, 650));
}

// ── Save ─────────────────────────────────────────────────────────────────────
fs.writeFileSync(imagesPath, JSON.stringify(result, null, 2) + "\n");
console.log(`\nDone. Fetched: ${fetched}, skipped: ${skipped}.`);
console.log(`Saved to data/images.json (${Object.keys(result).length} total entries).`);
