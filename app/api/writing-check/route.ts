import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface WritingResult {
  sentences: { text: string; correct: boolean; note: string }[];
  wordsUsed: string[];
  score: number;
  feedback: string;
}

export async function POST(req: NextRequest) {
  try {
    const { text, words, topic } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "Chưa có bài viết" }, { status: 400 });
    }

    const wordList = (words as { word: string; reading: string; meaning: string }[])
      .map((w) => `${w.word} (${w.reading}): ${w.meaning}`)
      .join("\n");

    const prompt = `Bạn là giáo viên tiếng Nhật, đánh giá bài viết của học sinh trình độ N5 (sơ cấp).

Chủ đề bài viết: ${topic}

Từ vựng yêu cầu (học sinh nên dùng ít nhất 4 từ):
${wordList}

Bài viết của học sinh:
"""
${text.trim()}
"""

Trả về JSON (chỉ JSON thuần, không markdown):
{
  "sentences": [
    { "text": "câu gốc học sinh viết", "correct": true, "note": "nhận xét ngắn tiếng Việt" }
  ],
  "wordsUsed": ["từ1", "từ2"],
  "score": 7,
  "feedback": "nhận xét tổng thể 2-3 câu tiếng Việt"
}

Quy tắc:
- Tách bài thành từng câu theo 。hoặc xuống dòng
- "correct": true nếu câu đúng ngữ pháp N5 cơ bản, false nếu có lỗi rõ ràng
- "note": tiếng Việt, ngắn. Nếu đúng: khen 1 điểm hay. Nếu sai: chỉ lỗi cụ thể + gợi ý sửa
- "wordsUsed": chỉ liệt kê các từ trong danh sách yêu cầu xuất hiện trong bài
- "score": 1-10, dựa trên ngữ pháp + số từ dùng đúng + độ tự nhiên
- "feedback": khuyến khích, bằng tiếng Việt`;

    const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const response = await model.generateContent(prompt);
    const raw = response.response.text();

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const result: WritingResult = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[writing-check]", err);
    return NextResponse.json({ error: "Không thể chấm bài. Thử lại sau." }, { status: 500 });
  }
}
