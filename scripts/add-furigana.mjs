/**
 * Add furigana markup vào toàn bộ examples.json bằng kuromoji (offline JS tokenizer).
 * Không call API - chạy 1 lần cho toàn bộ 966 entries trong vài phút.
 *
 * Input:  {"1": [{"jp": "私は本を読みます。", "vi": "..."}]}
 * Output: {"1": [{"jp": "私[わたし]は本[ほん]を読[よ]みます。", "vi": "..."}]}
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const kuromoji = require("kuromoji");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const examplesPath = path.join(ROOT, "data/examples.json");
const data = JSON.parse(fs.readFileSync(examplesPath, "utf-8"));

// ── Helpers ───────────────────────────────────────────────────────────────
function katakanaToHiragana(str) {
  return str.replace(/[ァ-ヶ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60)
  );
}

const KANJI_RE = /[一-龯々ヶ]/;
const HAS_MARKUP = /\[[ぁ-んァ-ヶー]+\]/;

/** Thêm furigana cho các token có kanji. Bỏ qua token đã có markup sẵn. */
function addFurigana(tokenizer, jp) {
  if (HAS_MARKUP.test(jp)) return jp; // đã có furigana rồi

  const tokens = tokenizer.tokenize(jp);
  let out = "";
  for (const t of tokens) {
    const surf = t.surface_form;
    if (KANJI_RE.test(surf) && t.reading && t.reading !== "*") {
      const hira = katakanaToHiragana(t.reading);
      // Nếu reading trùng surface (surface là kana thuần) thì không cần
      if (hira !== surf) {
        out += `${surf}[${hira}]`;
        continue;
      }
    }
    out += surf;
  }
  return out;
}

// ── Main ──────────────────────────────────────────────────────────────────
console.log("Đang load kuromoji dictionary...");

kuromoji.builder({ dicPath: path.join(ROOT, "node_modules/kuromoji/dict") })
  .build((err, tokenizer) => {
    if (err) { console.error(err); process.exit(1); }

    console.log("Bắt đầu xử lý...\n");

    const ids = Object.keys(data);
    let processed = 0, addedFurigana = 0, alreadyHad = 0;

    for (const id of ids) {
      for (const ex of data[id]) {
        if (!ex.jp) continue;
        if (HAS_MARKUP.test(ex.jp)) {
          alreadyHad++;
          continue;
        }
        const withFuri = addFurigana(tokenizer, ex.jp);
        if (withFuri !== ex.jp) {
          ex.jp = withFuri;
          addedFurigana++;
        }
      }
      processed++;
      if (processed % 100 === 0) {
        process.stdout.write(`Đã xử lý ${processed}/${ids.length}\r`);
      }
    }

    fs.writeFileSync(examplesPath, JSON.stringify(data, null, 2) + "\n");
    console.log(`\nDone. ✓ ${addedFurigana} câu được thêm furigana | ${alreadyHad} đã có sẵn.`);
    console.log(`Lưu vào ${examplesPath}`);
  });
