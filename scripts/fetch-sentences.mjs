/**
 * Fetch example sentences for each vocabulary word from Tatoeba.
 * Output: data/sentences.json — { [cardId: string]: [{ jp: string; vi: string }] }
 *
 * Usage:
 *   node scripts/fetch-sentences.mjs
 *
 * Tatoeba API: https://api.tatoeba.org/unstable/sentences?lang=jpn&q=<word>&limit=3
 * Returns Japanese sentences. Translations are fetched separately if available.
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const cards = JSON.parse(readFileSync(path.join(ROOT, "data/n5.json"), "utf-8"));
const outPath = path.join(ROOT, "data/sentences.json");

const existing = existsSync(outPath)
  ? JSON.parse(readFileSync(outPath, "utf-8"))
  : {};

function fetchJson(url) {
  try {
    const result = execSync(
      `curl -s --max-time 10 -H "Accept: application/json" "${url}"`,
      { encoding: "utf-8" }
    );
    return JSON.parse(result);
  } catch {
    return null;
  }
}

// Fetch Japanese sentences containing the word from Tatoeba.
// Returns up to `limit` sentences as { jp, vi? } objects.
function fetchSentences(word, limit = 3) {
  const encoded = encodeURIComponent(word);

  // Search Japanese sentences that contain this word
  const data = fetchJson(
    `https://api.tatoeba.org/unstable/sentences?lang=jpn&q=${encoded}&limit=${limit}`
  );
  if (!data || !Array.isArray(data.results)) return [];

  const results = [];
  for (const s of data.results) {
    const jp = s.text;
    // Look for a Vietnamese translation among the translations
    let vi = null;
    if (Array.isArray(s.translations)) {
      for (const group of s.translations) {
        for (const t of group) {
          if (t.lang === "vie") { vi = t.text; break; }
        }
        if (vi) break;
      }
    }
    // Only include if the word actually appears in the sentence
    if (jp && jp.includes(word)) {
      results.push(vi ? { jp, vi } : { jp });
    }
  }
  return results;
}

// Filter to vocab-type cards only (expressions don't need fill-in-blank)
const vocabCards = cards.filter((c) => c.type === "vocab" && c.word.trim());

let saved = 0;
let skipped = 0;
const total = vocabCards.length;

for (let idx = 0; idx < vocabCards.length; idx++) {
  const card = vocabCards[idx];
  const key = String(card.id);

  if (existing[key] !== undefined) {
    skipped++;
    continue;
  }

  const word = card.word;
  const sentences = fetchSentences(word, 3);
  existing[key] = sentences;
  saved++;

  const pct = Math.round(((idx + 1) / total) * 100);
  console.log(`[${idx + 1}/${total}] ${pct}% | ${word} → ${sentences.length} câu`);

  // Save every 20 words to avoid losing progress on crash
  if (saved % 20 === 0) {
    writeFileSync(outPath, JSON.stringify(existing, null, 2));
    console.log(`  → saved ${Object.keys(existing).length} entries so far`);
  }

  // Polite delay to avoid hammering the API
  execSync("sleep 0.5");
}

writeFileSync(outPath, JSON.stringify(existing, null, 2));
console.log(`\nDone. ${saved} fetched, ${skipped} skipped. Total: ${Object.keys(existing).length} entries.`);
