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

Yêu cầu:
- Câu tự nhiên, ngữ pháp N5 (dạng masu, có です/ます)
- Từ "${word}" phải xuất hiện NGUYÊN VẸN (không đổi thể, không thay kanji sang kana)
- Chỉ dùng từ vựng N5 cơ bản${lessonVocab}
- Kết thúc câu bằng 。

Format output đặc biệt:
- Mọi kanji trong câu (kể cả từ target) BẮT BUỘC đi kèm reading dạng "漢字[かんじ]"
- Nếu 1 từ có nhiều kanji liền nhau, gộp reading: "毎日[まいにち]" chứ không phải "毎[まい]日[にち]"
- Từ "${word}" bọc thêm <<>>: <<${word.match(/[一-龯々]/) ? `${word}[${reading}]` : word}>>
- Ví dụ: 私[わたし]は<<本[ほん]>>を読[よ]みます。
- Kana và dấu câu giữ nguyên, KHÔNG bọc []

Trả về JSON thuần (không markdown):
{"jp": "câu với markup", "vi": "bản dịch tiếng Việt"}`;

    const model = genai.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 1.3, topP: 0.95 },
    });
    const response = await model.generateContent(prompt);
    const raw = response.response.text();

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const result: FillResult = JSON.parse(jsonMatch[0]);
    if (!result.jp || !result.vi) throw new Error("Invalid result");

    // Verify: phải có <<...>> markup cho target
    if (!result.jp.includes("<<") || !result.jp.includes(">>")) {
      return NextResponse.json({ error: "missing target markup" }, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[fill-generate]", err);
    return NextResponse.json({ error: "Không tạo được câu. Thử lại sau." }, { status: 500 });
  }
}
