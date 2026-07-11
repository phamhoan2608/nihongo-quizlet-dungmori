import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// Sinh câu tiếng Nhật mới mỗi lần dùng Gemini.
// Câu chứa từ target, dùng từ vựng N5. Trả về {jp, vi}.

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SCENES = [
  "gia đình", "trường học", "công ty", "nhà hàng", "cửa hàng",
  "công viên", "trên tàu điện", "buổi sáng", "cuối tuần", "đi du lịch",
  "sinh nhật", "mua sắm", "nấu ăn", "gặp bạn", "học tiếng Nhật",
];

export interface FillResult {
  jp: string;   // Câu tiếng Nhật
  vi: string;   // Bản dịch tiếng Việt
}

export async function POST(req: NextRequest) {
  try {
    const { word, reading, meaning, lessonWords } = await req.json();
    if (!word) return NextResponse.json({ error: "missing word" }, { status: 400 });

    const scene = SCENES[Math.floor(Math.random() * SCENES.length)];
    const lessonVocab = Array.isArray(lessonWords) && lessonWords.length > 0
      ? `\nƯu tiên dùng các từ N5 sau khi cần: ${lessonWords.slice(0, 20).join(", ")}`
      : "";

    const prompt = `Bạn là giáo viên tiếng Nhật N5. Tạo 1 câu tiếng Nhật ngắn (10-30 ký tự) trong bối cảnh "${scene}", dùng từ "${word}" (${reading}: ${meaning}).

Yêu cầu:
- Câu tự nhiên, đúng ngữ pháp N5 (dạng masu, có です/ます)
- Từ "${word}" PHẢI xuất hiện nguyên vẹn trong câu (không đổi kanji sang kana, không chia thể phức tạp)
- Chỉ dùng từ vựng N5 cơ bản${lessonVocab}
- Kết thúc câu bằng 。
- KHÔNG dùng furigana, KHÔNG giải thích

Trả về JSON thuần (không markdown, không giải thích):
{"jp": "câu tiếng Nhật ở đây", "vi": "bản dịch tiếng Việt"}`;

    const model = genai.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 1.2, topP: 0.95 },
    });
    const response = await model.generateContent(prompt);
    const raw = response.response.text();

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const result: FillResult = JSON.parse(jsonMatch[0]);
    if (!result.jp || !result.vi) throw new Error("Invalid result");

    // Verify target word appears; if not, return error so client can retry/fallback
    if (!result.jp.includes(word) && !result.jp.includes(reading)) {
      return NextResponse.json({ error: "word not in generated sentence" }, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[fill-generate]", err);
    return NextResponse.json({ error: "Không tạo được câu. Thử lại sau." }, { status: 500 });
  }
}
