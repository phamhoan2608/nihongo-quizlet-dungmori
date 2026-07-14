import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// Fallback runtime cho flashcard example khi cache examples.json thiếu.
// Dùng Gemini sinh câu N5 có furigana + dịch VI.

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface Example { jp: string; vi: string; }

function buildPrompt(word: string, reading: string, meaning: string): string {
  return `Bạn là giáo viên tiếng Nhật N5. Tạo 1-2 câu ví dụ đơn giản trình độ N5 dùng từ "${word}" (${reading}: ${meaning}).

Yêu cầu:
- Ngữ pháp N5 (dạng masu, です/ます), 10-25 ký tự mỗi câu
- HẠN CHẾ kanji khó, ưu tiên chỉ dùng kanji + từ vựng N5
- Từ "${word}" xuất hiện tự nhiên (không bắt buộc bọc <<>>)
- Kết thúc bằng 。

FURIGANA BẮT BUỘC:
- Mọi kanji trong câu (KHÔNG NGOẠI LỆ) đều có furigana ngay sau: 漢字[かんじ]
- Cụm kanji liền nhau gộp thành 1 cặp: 毎日[まいにち] (KHÔNG tách 毎[まい]日[にち])
- Kana và dấu câu giữ nguyên

Ví dụ ĐÚNG: 私[わたし]は毎日[まいにち]本[ほん]を読[よ]みます。
Ví dụ SAI (thiếu furigana ở 私): 私は本[ほん]を読[よ]みます。

Trả về JSON thuần (không markdown):
{"examples":[{"jp":"câu 1 có furigana","vi":"dịch tiếng Việt"},{"jp":"câu 2","vi":"dịch"}]}`;
}

/** Trả về true nếu chuỗi có kanji không đi kèm [reading]. */
function hasBareKanji(jp: string): boolean {
  const stripped = jp
    .replace(/<<|>>/g, "")
    .replace(/[一-龯々ヶ]+\[[ぁ-んァ-ヶー]+\]/g, "");
  return /[一-龯々ヶ]/.test(stripped);
}

export async function POST(req: NextRequest) {
  try {
    const { word, reading, meaning } = await req.json();
    if (!word) return NextResponse.json({ examples: [] }, { status: 400 });

    const model = genai.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 1.1, topP: 0.95 },
    });

    // Retry 2 lần nếu format sai
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await model.generateContent(buildPrompt(word, reading, meaning));
        const raw = res.response.text();
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) continue;
        const parsed = JSON.parse(match[0]) as { examples?: Example[] };
        const valid = (parsed.examples ?? [])
          .filter((e) => e.jp && e.vi && !hasBareKanji(e.jp))
          .slice(0, 2);
        if (valid.length > 0) {
          return NextResponse.json(
            { examples: valid },
            { headers: { "Cache-Control": "public, max-age=86400" } }
          );
        }
      } catch { continue; }
    }
    return NextResponse.json({ examples: [] }, { status: 502 });
  } catch (err) {
    console.error("[example]", err);
    return NextResponse.json({ examples: [] }, { status: 500 });
  }
}

