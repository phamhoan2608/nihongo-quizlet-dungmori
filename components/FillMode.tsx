"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Card } from "@/lib/types";
import { grade, prioritizeCards } from "@/lib/storage";
import { cleanReading } from "@/lib/romaji";
import { speak } from "@/lib/tts";
import Seal from "./Seal";

interface Sentence { jp: string; vi: string; word: string; }

// Fallback: chọn 1 câu từ examples cache của card
function fallbackFromExamples(card: Card): Sentence | null {
  if (!card.examples || card.examples.length === 0) return null;
  const pool = card.examples.filter(
    (ex) => ex.jp.includes(card.word) || ex.jp.includes(card.reading)
  );
  if (pool.length === 0) return null;
  const ex = pool[Math.floor(Math.random() * pool.length)];
  const word = ex.jp.includes(card.word) ? card.word : card.reading;
  return { jp: ex.jp, vi: ex.vi ?? ex.en ?? "", word };
}

function isCorrect(input: string, expected: string, altReading: string): boolean {
  const got = input.trim();
  if (!got) return false;
  return got === expected || got === cleanReading(altReading).trim();
}

export default function FillMode({ cards, sessionKey }: { cards: Card[]; sessionKey?: string }) {
  const [deck, setDeck] = useState<Card[]>([]);
  const [i, setI] = useState(0);
  const [sentence, setSentence] = useState<Sentence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "right" | "wrong">("idle");
  const [score, setScore] = useState(0);
  const [source, setSource] = useState<"gemini" | "cache">("gemini");
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Preload lesson vocab list (giới hạn 30 từ) để gửi kèm cho LLM
  const lessonWords = cards
    .filter((c) => c.type === "vocab")
    .slice(0, 30)
    .map((c) => `${c.word}(${c.reading})`);

  const card = deck[i];
  const finished = deck.length > 0 && i >= deck.length;

  useEffect(() => {
    setDeck(prioritizeCards(cards));
    setI(0);
    setValue("");
    setState("idle");
    setScore(0);
    setSentence(null);
  }, [cards]);

  const generate = useCallback(async (c: Card) => {
    setLoading(true);
    setError(null);
    setSentence(null);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/fill-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: c.word,
          reading: c.reading,
          meaning: c.meaning,
          lessonWords,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const wordMatch = data.jp.includes(c.word) ? c.word : c.reading;
      setSentence({ jp: data.jp, vi: data.vi, word: wordMatch });
      setSource("gemini");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      // Fallback: dùng câu Tatoeba cache
      const fb = fallbackFromExamples(c);
      if (fb) {
        setSentence(fb);
        setSource("cache");
      } else {
        setError("Không tạo được câu ví dụ cho từ này.");
      }
    } finally {
      setLoading(false);
    }
  }, [lessonWords]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!card || finished) return;
    generate(card);
    return () => abortRef.current?.abort();
  }, [card?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading && sentence && !finished) inputRef.current?.focus();
  }, [loading, sentence, finished, i]);

  const next = useCallback(() => {
    setValue("");
    setState("idle");
    setI((x) => x + 1);
  }, []);

  const check = () => {
    if (state !== "idle" || !value.trim() || !sentence || !card) return;
    const ok = isCorrect(value, sentence.word, card.reading);
    setState(ok ? "right" : "wrong");
    if (ok) setScore((s) => s + 1);
    grade(card.id, ok ? "good" : "again", "exercise");
  };

  const skip = () => {
    if (!card) return;
    generate(card);
    setValue("");
    setState("idle");
  };

  const restart = () => {
    setDeck(prioritizeCards(cards));
    setI(0);
    setValue("");
    setState("idle");
    setScore(0);
    setSentence(null);
  };

  // Enter to advance after answering
  useEffect(() => {
    if (state === "idle" || finished) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "BUTTON" || t.isContentEditable) return;
      if (e.key === "Enter") { e.preventDefault(); next(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, finished, next]);

  if (deck.length === 0) return null;

  if (finished) {
    const pct = Math.round((score / deck.length) * 100);
    return (
      <div className="flex flex-col items-center rounded-3xl border border-line bg-card p-10 text-center shadow-card">
        <p className="text-sm font-semibold uppercase tracking-widest text-sub">Hoàn thành</p>
        <p className="mt-2 font-jp text-5xl font-bold text-indigo">
          {score}<span className="text-2xl text-sub">/{deck.length}</span>
        </p>
        <p className="mt-2 text-sub">Đúng {pct}%</p>
        <button
          onClick={restart}
          className="mt-6 rounded-full bg-indigo px-6 py-2.5 font-semibold text-white transition hover:bg-indigo-deep"
        >
          Làm lại
        </button>
      </div>
    );
  }

  const progress = Math.round((i / Math.max(deck.length, 1)) * 100);

  // Split sentence around blanked word (chỉ blank khi state = idle)
  const renderSentence = () => {
    if (!sentence) return null;
    const parts = sentence.jp.split(sentence.word);
    const blank = state === "idle"
      ? <span className="mx-1 inline-block min-w-[3em] rounded border-b-2 border-dashed border-indigo px-2 text-center align-baseline text-indigo/70">?</span>
      : <span className={`mx-1 rounded px-1 font-bold ${state === "right" ? "text-moss" : "text-shu"}`}>{sentence.word}</span>;
    return (
      <p className="font-jp text-xl leading-relaxed text-ink sm:text-2xl">
        {parts.map((p, idx) => (
          <span key={idx}>
            {p}
            {idx < parts.length - 1 && blank}
          </span>
        ))}
      </p>
    );
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm text-sub">
        <span>{i + 1} / {deck.length}</span>
        <span>Đúng {score}</span>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full bg-indigo transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Đề */}
      <div className="relative mb-4 rounded-3xl border border-line bg-card px-5 py-6 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sub">Điền từ thích hợp</p>
            <p className="mt-1 text-sm text-ink">
              <span className="font-semibold">{card.meaning}</span>
              <span className="ml-2 font-jp text-sub/70">({card.word} · {card.reading})</span>
            </p>
          </div>
          <button
            onClick={skip}
            disabled={loading || state !== "idle"}
            title="Đổi câu khác"
            className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-sub transition hover:border-indigo hover:text-indigo disabled:opacity-30"
          >
            🔄 Câu khác
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-4 text-sub">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo border-t-transparent" />
            <span className="text-sm">Đang tạo câu mới...</span>
          </div>
        )}
        {error && !loading && (
          <div className="py-4 text-center text-sm text-shu">
            {error}
            <button onClick={() => card && generate(card)} className="ml-2 font-semibold text-indigo hover:underline">Thử lại</button>
          </div>
        )}
        {!loading && sentence && (
          <>
            <div className="flex items-start gap-2">
              <button
                onClick={() => speak(sentence.jp)}
                aria-label="Phát âm"
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo text-white transition hover:bg-indigo-deep"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                </svg>
              </button>
              <div className="flex-1">{renderSentence()}</div>
            </div>
            {sentence.vi && (
              <p className="mt-3 border-l-2 border-line pl-3 text-sm italic text-sub">{sentence.vi}</p>
            )}
            {source === "cache" && (
              <p className="mt-2 text-[10px] uppercase tracking-widest text-sub/50">Nguồn: Tatoeba (Gemini lỗi)</p>
            )}
          </>
        )}
        {state === "right" && <span className="absolute -right-2 -top-2"><Seal /></span>}
      </div>

      {/* Nhập */}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === "Enter" && state === "idle") check();
        }}
        disabled={state !== "idle" || loading || !sentence}
        key={i}
        placeholder="Nhập từ điền vào chỗ trống (kanji hoặc kana)"
        className={`w-full rounded-xl border-2 bg-card px-4 py-3.5 font-jp text-lg outline-none transition ${
          state === "right"
            ? "border-moss text-moss"
            : state === "wrong"
              ? "border-shu text-shu"
              : "border-line focus:border-indigo"
        }`}
      />

      {state === "wrong" && sentence && (
        <p className="mt-2 animate-slide-up text-sm">
          Đáp án: <span className="font-jp font-semibold text-ink">{sentence.word}</span>
          {sentence.word !== card.reading && (
            <span className="ml-2 font-jp text-sub">({card.reading})</span>
          )}
        </p>
      )}

      <div className="mt-3">
        <button
          onClick={state === "idle" ? check : next}
          disabled={(state === "idle" && !value.trim()) || loading}
          className="w-full rounded-xl bg-indigo py-3 font-semibold text-white transition hover:bg-indigo-deep disabled:opacity-40"
        >
          {state === "idle" ? "Kiểm tra" : i + 1 === deck.length ? "Xem kết quả" : "Câu tiếp theo"}
        </button>
      </div>

      <p className="mt-2 text-center text-xs text-sub/50">
        Câu sinh mới mỗi lần bằng Gemini · Enter để kiểm tra/tiếp theo
      </p>
    </div>
  );
}
