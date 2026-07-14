/**
 * Sinh câu ví dụ N5 (đơn giản, có furigana + dịch VI) cho mỗi thẻ, dùng Gemini.
 * Lưu vào data/examples.json (id → [{jp, vi}]).
 *
 * Usage:
 *   node scripts/fetch-examples.mjs [--reset] [--max=N] [--only-missing]
 *
 * --reset        : xoá examples.json cũ và fetch lại toàn bộ
 * --max=N        : chỉ xử lý N thẻ đầu tiên (để test)
 * --only-missing : chỉ fetch các thẻ chưa có, hoặc thẻ có jp cũ không có furigana
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Args ──────────────────────────────────────────────────────────────────
const reset = process.argv.includes("--reset");
const onlyMissing = process.argv.includes("--only-missing");
const maxArg = process.argv.find((a) => a.startsWith("--max="));
const MAX = maxArg ? parseInt(maxArg.slice(6), 10) : Infinity;

// ── Load .env.local (Node không auto-load) ────────────────────────────────
function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}
loadEnv();

if (!process.env.GEMINI_API_KEY) {
  console.error("Thiếu GEMINI_API_KEY trong .env.local");
  process.exit(1);
}

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genai.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: { temperature: 1.1, topP: 0.95 },
});

// ── Data ──────────────────────────────────────────────────────────────────
const n5 = JSON.parse(fs.readFileSync(path.join(ROOT, "data/n5.json"), "utf-8"));
const examplesPath = path.join(ROOT, "data/examples.json");

const existing = !reset && fs.existsSync(examplesPath)
  ? JSON.parse(fs.readFileSync(examplesPath, "utf-8"))
  : {};

if (reset) console.log("--reset: xoá dữ liệu cũ.\n");

// ── Helpers ───────────────────────────────────────────────────────────────
function hasBareKanji(jp) {
  const stripped = jp
    .replace(/<<|>>/g, "")
    .replace(/[一-龯々ヶ]+\[[ぁ-んァ-ヶー]+\]/g, "");
  return /[一-龯々ヶ]/.test(stripped);
}

function hasFurigana(entries) {
  return Array.isArray(entries)
    && entries.length > 0
    && entries.every((e) => e.jp && e.vi && !hasBareKanji(e.jp));
}

function buildPrompt(word, reading, meaning) {
  return `Bạn là giáo viên tiếng Nhật N5. Tạo 1-2 câu ví dụ đơn giản trình độ N5 dùng từ "${word}" (${reading}: ${meaning}).

Yêu cầu:
- Ngữ pháp N5 (dạng masu, です/ます), 10-25 ký tự mỗi câu
- HẠN CHẾ kanji khó, chỉ dùng kanji + từ vựng N5
- Từ "${word}" xuất hiện tự nhiên trong câu
- Kết thúc bằng 。

FURIGANA BẮT BUỘC:
- MỌI kanji trong câu (KHÔNG NGOẠI LỆ) có furigana ngay sau: 漢字[かんじ]
- Cụm kanji liền nhau gộp: 毎日[まいにち] (KHÔNG tách 毎[まい]日[にち])
- Kana và dấu câu giữ nguyên

Ví dụ ĐÚNG: 私[わたし]は毎日[まいにち]本[ほん]を読[よ]みます。
Ví dụ SAI (thiếu furigana): 私は本[ほん]を読[よ]みます。

Trả về JSON thuần (không markdown, không giải thích):
{"examples":[{"jp":"câu 1 có furigana","vi":"dịch tiếng Việt"},{"jp":"câu 2","vi":"dịch"}]}`;
}

async function generateFor(card) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await model.generateContent(buildPrompt(card.word, card.reading, card.meaning));
      const raw = res.response.text();
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) continue;
      const parsed = JSON.parse(m[0]);
      const valid = (parsed.examples ?? [])
        .filter((e) => e.jp && e.vi && !hasBareKanji(e.jp))
        .slice(0, 2);
      if (valid.length > 0) return valid;
    } catch { /* thử lại */ }
  }
  return null;
}

async function sleepMs(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ── Main ──────────────────────────────────────────────────────────────────
const result = { ...existing };

const todo = n5.filter((c) => {
  if (onlyMissing) return !hasFurigana(result[String(c.id)]);
  return !result[String(c.id)] || !hasFurigana(result[String(c.id)]);
}).slice(0, MAX);

console.log(`${n5.length} thẻ, cần sinh ${todo.length} thẻ.\n`);

let done = 0, failed = 0;
const CONCURRENCY = 3;   // gemini free tier ~10 RPM, để CONCURRENCY thấp
const RATE_LIMIT_MS = 250; // delay giữa các request

let cursor = 0;
async function worker(id) {
  while (cursor < todo.length) {
    const idx = cursor++;
    const card = todo[idx];
    await sleepMs(RATE_LIMIT_MS * id); // stagger workers
    process.stdout.write(`[${card.id}] ${card.word} … `);
    const exs = await generateFor(card);
    if (exs) {
      result[String(card.id)] = exs;
      done++;
      console.log(`✓ ${exs.length} câu`);
    } else {
      failed++;
      console.log("— thất bại");
    }
    // Save periodically
    if ((done + failed) % 10 === 0) {
      fs.writeFileSync(examplesPath, JSON.stringify(result, null, 2) + "\n");
    }
  }
}

await Promise.all(
  Array(Math.min(CONCURRENCY, todo.length)).fill(0).map((_, i) => worker(i))
);

fs.writeFileSync(examplesPath, JSON.stringify(result, null, 2) + "\n");
console.log(`\nDone. ✓ ${done} thành công — ${failed} thất bại`);
console.log(`Tổng examples.json: ${Object.keys(result).length} thẻ.`);
