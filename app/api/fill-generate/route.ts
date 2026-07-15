import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// Sinh câu tiếng Nhật mới mỗi lần dùng Gemini.
// Câu chứa từ target, dùng từ vựng N5. Trả về {jp, vi}.
// Format `jp`:
//   - Kanji đi kèm reading: 漢字[かんじ]
//   - Từ target bọc trong <<>>: <<本[ほん]>> hoặc <<ドライブ>>
//   - Kana + dấu câu để nguyên
//   Ví dụ: 私[わたし]は<<本[ほん]>>を読[よ]みます。

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SCENES = [
  "gia đình", "trường học", "công ty", "nhà hàng", "cửa hàng",
  "công viên", "trên tàu điện", "buổi sáng", "cuối tuần", "đi du lịch",
  "sinh nhật", "mua sắm", "nấu ăn", "gặp bạn", "học tiếng Nhật",
  "cuộc họp", "gọi điện", "đi bộ", "làm bài tập", "xem phim",
];

export interface FillResult {
  jp: string;   // Câu tiếng Nhật với markup furigana + target
  vi: string;   // Bản dịch tiếng Việt
}

export async function POST(req: NextRequest) {
  try {
    const { word, reading, meaning, lessonWords } = await req.json();
    if (!word) return NextResponse.json({ error: "missing word" }, { status: 400 });

    const scene = SCENES[Math.floor(Math.random() * SCENES.length)];
    const seed = Math.floor(Math.random() * 10000);
    const lessonVocab = Array.isArray(lessonWords) && lessonWords.length > 0
      ? `\nCó thể dùng thêm các từ N5 sau nếu phù hợp: ${lessonWords.slice(0, 20).join(", ")}`
      : "";

    const prompt = `Bạn là giáo viên tiếng Nhật N5. Tạo 1 câu tiếng Nhật ngắn (10-30 ký tự) trong bối cảnh "${scene}" (seed:${seed}), sử dụng từ "${word}" (${reading}: ${meaning}).

Yêu cầu về nội dung:
- Câu tự nhiên, ngữ pháp N5 (dạng masu, có です/ます)
- Từ "${word}" phải xuất hiện NGUYÊN VẸN (không đổi thể, không thay kanji sang kana)
- Chỉ dùng từ vựng N5 cơ bản${lessonVocab}
- Kết thúc câu bằng 。

QUY TẮC BẮT BUỘC VỀ FURIGANA:
- MỌI kanji trong câu (KHÔNG NGOẠI LỆ) đều phải có furigana đi kèm ngay sau, dạng: 漢字[かんじ]
- Cụm nhiều kanji liền nhau gộp thành 1 cặp: đúng "毎日[まいにち]", sai "毎[まい]日[にち]"
- Nếu quên furigana ở dù chỉ 1 kanji thì câu bị coi là SAI, phải sinh lại
- Kana (hiragana/katakana) và dấu câu KHÔNG bọc []
- Từ target "${word}" bọc thêm <<>>: <<${word.match(/[一-龯々]/) ? `${word}[${reading}]` : word}>>

Ví dụ đúng: 私[わたし]は毎日[まいにち]<<本[ほん]>>を読[よ]みます。
Ví dụ SAI (thiếu furigana): 私は本を読みます。
Ví dụ SAI (thiếu 1 kanji): 私[わたし]は本を読[よ]みます。 (thiếu 本[ほん])

Trả về JSON thuần (không markdown):
{"jp": "câu với đầy đủ furigana và <<>> quanh target", "vi": "bản dịch tiếng Việt (bắt buộc có, dùng nội bộ)"}`;

    const model = genai.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 1.3, topP: 0.95 },
    });

    // Retry tối đa 2 lần nếu thiếu furigana ở kanji nào đó
    let result: FillResult | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await model.generateContent(prompt);
      const raw = response.response.text();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      try {
        const parsed = JSON.parse(jsonMatch[0]) as FillResult;
        if (!parsed.jp) continue;
        if (!parsed.jp.includes("<<") || !parsed.jp.includes(">>")) continue;
        // Kiểm tra mọi kanji đều có [reading]:
        // Xoá tất cả pattern 漢字[からな] khỏi chuỗi, kanji nào còn sót là thiếu furigana
        const stripped = parsed.jp
          .replace(/<<|>>/g, "")
          .replace(/[一-龯々ヶ]+\[[ぁ-んァ-ヶー]+\]/g, "");
        if (/[一-龯々ヶ]/.test(stripped)) continue; // vẫn còn kanji không có furigana
        result = parsed;
        break;
      } catch { continue; }
    }

    if (!result) {
      return NextResponse.json({ error: "no valid sentence after retries" }, { status: 422 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[fill-generate]", err);
    return NextResponse.json({ error: "Không tạo được câu. Thử lại sau." }, { status: 500 });
  }
}
