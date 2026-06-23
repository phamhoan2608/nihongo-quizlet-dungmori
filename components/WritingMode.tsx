"use client";

import { useState, useMemo } from "react";
import type { Card } from "@/lib/types";
import { sample } from "@/lib/shuffle";
import type { WritingResult } from "@/app/api/writing-check/route";

const TOPICS: Record<number, string> = {
  1: "Tự giới thiệu bản thân",
  2: "Mô tả đồ vật xung quanh bạn",
  3: "Nói về vị trí và địa điểm",
  4: "Kế hoạch và thời gian biểu",
  5: "Mua sắm và chi tiêu",
  6: "Ăn uống hàng ngày",
  7: "Nơi chốn quen thuộc",
  8: "Hoạt động hàng ngày",
};

const WORD_COUNT = 7;

export default function WritingMode({ cards }: { cards: Card[] }) {
  const words = useMemo(() => {
    const vocab = cards.filter((c) => c.type === "vocab" && c.reading && c.word !== c.reading);
    return sample(vocab.length >= WORD_COUNT ? vocab : cards, WORD_COUNT);
  }, [cards]);

  const topic = TOPICS[words[0]?.lesson] ?? "Chủ đề tự do";
  const minWords = Math.max(3, Math.floor(WORD_COUNT * 0.5));

  const [text, setText] = useState("");
  const [result, setResult] = useState<WritingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/writing-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, words, topic }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setText("");
    setResult(null);
    setError(null);
  };

  if (result) {
    const usedSet = new Set(result.wordsUsed);
    const scoreColor =
      result.score >= 8 ? "text-moss" : result.score >= 5 ? "text-indigo" : "text-shu";

    return (
      <div className="space-y-4">
        {/* Score */}
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-card p-5 shadow-card">
          <div className="text-center">
            <p className={`text-5xl font-bold ${scoreColor}`}>{result.score}</p>
            <p className="text-xs text-sub">/10</p>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">Chủ đề: {topic}</p>
            <p className="mt-1 text-sm text-sub">{result.feedback}</p>
          </div>
        </div>

        {/* Word usage */}
        <div className="rounded-2xl border border-line bg-card p-4 shadow-card">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-sub">Từ đã dùng</p>
          <div className="flex flex-wrap gap-2">
            {words.map((w) => {
              const used = usedSet.has(w.word) || usedSet.has(w.reading);
              return (
                <span
                  key={w.id}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                    used
                      ? "bg-moss/10 text-moss"
                      : "bg-line/60 text-sub line-through opacity-60"
                  }`}
                >
                  {used ? "✓" : "✗"} {w.word}
                  <span className="opacity-60">({w.reading})</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Sentence feedback */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-sub">Nhận xét từng câu</p>
          {result.sentences.map((s, i) => (
            <div
              key={i}
              className={`rounded-xl border-l-4 bg-card p-4 shadow-card ${
                s.correct ? "border-moss" : "border-shu"
              }`}
            >
              <p className="font-jp text-base font-semibold text-ink">{s.text}</p>
              <p className={`mt-1 text-sm ${s.correct ? "text-moss" : "text-shu"}`}>
                {s.correct ? "✓ " : "✗ "}
                {s.note}
              </p>
            </div>
          ))}
        </div>

        {/* Bài viết gốc */}
        <details className="rounded-xl border border-line bg-card p-4">
          <summary className="cursor-pointer text-sm text-sub hover:text-ink">Bài viết của bạn</summary>
          <p className="mt-3 whitespace-pre-wrap font-jp text-sm text-ink">{text}</p>
        </details>

        <button
          onClick={reset}
          className="w-full rounded-xl bg-indigo py-3 font-semibold text-white transition hover:bg-indigo-deep"
        >
          Viết lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Topic + instructions */}
      <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-widest text-shu">Chủ đề</p>
        <p className="mt-1 text-xl font-bold text-ink">{topic}</p>
        <p className="mt-2 text-sm text-sub">
          Viết <strong className="text-ink">3–5 câu</strong> tiếng Nhật về chủ đề trên.
          Cố gắng dùng ít nhất <strong className="text-ink">{minWords}</strong> trong số các từ sau:
        </p>
      </div>

      {/* Word chips */}
      <div className="flex flex-wrap gap-2">
        {words.map((w) => (
          <div
            key={w.id}
            className="rounded-xl border border-line bg-card px-3 py-2 shadow-card"
          >
            <p className="font-jp font-semibold text-ink">{w.word}</p>
            <p className="text-xs text-sub">{w.reading} · {w.meaning}</p>
          </div>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Nhập bài viết tiếng Nhật ở đây…&#10;Ví dụ: 私は学生です。毎日日本語を勉強します。"
        rows={7}
        className="w-full rounded-xl border-2 border-line bg-card px-4 py-3 font-jp text-base text-ink outline-none transition placeholder:text-sub/50 focus:border-indigo"
      />

      {error && (
        <p className="rounded-lg bg-shu-soft px-4 py-2 text-sm text-shu">{error}</p>
      )}

      <button
        onClick={submit}
        disabled={!text.trim() || loading}
        className="w-full rounded-xl bg-indigo py-3 font-semibold text-white transition hover:bg-indigo-deep disabled:opacity-40"
      >
        {loading ? "Đang chấm bài…" : "Nộp bài"}
      </button>

      <p className="text-center text-xs text-sub/50">
        Bài được chấm bằng AI · Kết quả chỉ mang tính tham khảo
      </p>
    </div>
  );
}
