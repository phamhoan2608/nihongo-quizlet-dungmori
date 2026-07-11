"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Card } from "@/lib/types";
import { grade, prioritizeCards } from "@/lib/storage";
import { cleanReading } from "@/lib/romaji";
import { speak } from "@/lib/tts";
import Seal from "./Seal";

interface Sentence {
  jp: string;         // Câu với markup furigana + target <<>>
  vi: string;         // Bản dịch
  fromCache?: boolean;
}

// ── Fallback: chọn 1 câu từ examples cache ───────────────────────────────
function fallbackFromExamples(card: Card): Sentence | null {
  if (!card.examples || card.examples.length === 0) return null;
  const pool = card.examples.filter(
    (ex) => ex.jp.includes(card.word) || ex.jp.includes(card.reading)
  );
  if (pool.length === 0) return null;
  const ex = pool[Math.floor(Math.random() * pool.length)];
  // Cache examples không có furigana markup, chỉ bọc target
  const wordInSentence = ex.jp.includes(card.word) ? card.word : card.reading;
  const jp = ex.jp.replace(wordInSentence, `<<${wordInSentence}>>`);
  return { jp, vi: ex.vi ?? ex.en ?? "", fromCache: true };
}

// ── Parse sentence markup → segments ─────────────────────────────────────
interface Segment {
  text: string;
  reading?: string;
  isTarget?: boolean;
}

function parseSentence(jp: string): Segment[] {
  const segs: Segment[] = [];
  // Match ORDER matters: <<...>> first, then kanji[reading], then plain
  const re = /<<([^>]+)>>|([一-龯々ヶ]+)\[([ぁ-んァ-ヶー]+)\]|([^\[\]<>]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(jp)) !== null) {
    if (m[1] !== undefined) {
      const inner = m[1];
      // Target có thể là: kanji[reading] hoặc kana thuần
      const kr = inner.match(/^([一-龯々ヶ]+)\[([ぁ-んァ-ヶー]+)\]$/);
      if (kr) segs.push({ text: kr[1], reading: kr[2], isTarget: true });
      else segs.push({ text: inner, isTarget: true });
    } else if (m[2] !== undefined) {
      segs.push({ text: m[2], reading: m[3] });
    } else if (m[4] !== undefined) {
      segs.push({ text: m[4] });
    }
  }
  return segs;
}

// ── Answer check ─────────────────────────────────────────────────────────
function isCorrect(input: string, targetSeg: Segment | undefined, card: Card): boolean {
  const got = input.trim();
  if (!got || !targetSeg) return false;
  if (got === targetSeg.text) return true;
  if (targetSeg.reading && got === targetSeg.reading) return true;
  if (got === card.word) return true;
  if (got === cleanReading(card.reading).trim()) return true;
  return false;
}

// ── Component ────────────────────────────────────────────────────────────
export default function FillMode({ cards }: { cards: Card[]; sessionKey?: string }) {
  const [deck, setDeck] = useState<Card[]>([]);
  const [i, setI] = useState(0);
  const [sentences, setSentences] = useState<Map<number, Sentence | null>>(new Map());
  const [preloadDone, setPreloadDone] = useState(0);
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "right" | "wrong">("idle");
  const [score, setScore] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const card = deck[i];
  const finished = deck.length > 0 && i >= deck.length;
  const currentSentence = card ? sentences.get(card.id) : undefined;
  const segments = currentSentence ? parseSentence(currentSentence.jp) : [];
  const targetSeg = segments.find((s) => s.isTarget);

  // ── Preload tất cả câu trong section khi mount ──────────────────────────
  useEffect(() => {
    const newDeck = prioritizeCards(cards);
    setDeck(newDeck);
    setI(0);
    setValue("");
    setState("idle");
    setScore(0);
    setSentences(new Map());
    setPreloadDone(0);

    if (newDeck.length === 0) return;

    const lessonWords = cards
      .filter((c) => c.type === "vocab")
      .slice(0, 25)
      .map((c) => `${c.word}(${c.reading})`);

    let cancelled = false;
    let cursor = 0;
    const CONCURRENCY = 3;

    async function generateOne(c: Card): Promise<Sentence | null> {
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
        });
        if (!res.ok) return fallbackFromExamples(c);
        const data = await res.json();
        if (!data.jp) return fallbackFromExamples(c);
        return { jp: data.jp, vi: data.vi };
      } catch {
        return fallbackFromExamples(c);
      }
    }

    async function worker() {
      while (!cancelled) {
        const idx = cursor++;
        if (idx >= newDeck.length) return;
        const c = newDeck[idx];
        const s = await generateOne(c);
        if (cancelled) return;
        setSentences((prev) => {
          const next = new Map(prev);
          next.set(c.id, s);
          return next;
        });
        setPreloadDone((d) => d + 1);
      }
    }

    Promise.all(Array(Math.min(CONCURRENCY, newDeck.length)).fill(0).map(() => worker()));

    return () => {
      cancelled = true;
    };
  }, [cards]);

  // Focus input khi có câu
  useEffect(() => {
    if (currentSentence && !finished && state === "idle") {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [currentSentence, finished, state, i]);

  const next = useCallback(() => {
    setValue("");
    setState("idle");
    setI((x) => x + 1);
  }, []);

  const check = () => {
    if (state !== "idle" || !value.trim() || !card || !currentSentence || !targetSeg) return;
    const ok = isCorrect(value, targetSeg, card);
    setState(ok ? "right" : "wrong");
    if (ok) setScore((s) => s + 1);
    grade(card.id, ok ? "good" : "again", "exercise");
  };

  const restart = () => {
    // Giữ nguyên sentences cache, chỉ reset trạng thái
    setI(0);
    setValue("");
    setState("idle");
    setScore(0);
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
  const preloadPct = Math.round((preloadDone / deck.length) * 100);
  const cardStillLoading = currentSentence === undefined;

  // Render sentence with furigana + blanked target
  const renderSentence = () => {
    if (!currentSentence) return null;
    // Bỏ ký tự khoảng trắng đầu segment ngôn ngữ Nhật
    return (
      <p className="font-jp text-2xl leading-[3.2rem] text-ink sm:text-3xl">
        {segments.map((seg, idx) => {
          if (seg.isTarget) {
            if (state === "idle") {
              return (
                <span
                  key={idx}
                  className="mx-1 inline-block min-w-[3.5em] rounded border-b-2 border-dashed border-indigo px-2 pb-0.5 text-center align-baseline text-lg text-indigo/70"
                >
                  ?
                </span>
              );
            }
            const cls = state === "right" ? "text-moss" : "text-shu";
            return (
              <span key={idx} className={`mx-0.5 font-bold ${cls}`}>
                {seg.reading ? (
                  <ruby>
                    {seg.text}
                    <rt className="text-[0.5em] font-normal">{seg.reading}</rt>
                  </ruby>
                ) : seg.text}
              </span>
            );
          }
          if (seg.reading) {
            return (
              <ruby key={idx}>
                {seg.text}
                <rt className="text-[0.5em] text-sub">{seg.reading}</rt>
              </ruby>
            );
          }
          return <span key={idx}>{seg.text}</span>;
        })}
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

      {/* Preload progress bar */}
      {preloadDone < deck.length && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-sub">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo border-t-transparent" />
          <span>Đang tải câu: {preloadDone}/{deck.length} ({preloadPct}%)</span>
          <div className="ml-auto h-1 w-24 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-indigo transition-all" style={{ width: `${preloadPct}%` }} />
          </div>
        </div>
      )}

      {/* Đề */}
      <div className="relative mb-4 rounded-3xl border border-line bg-card px-5 py-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-widest text-sub">Điền từ có nghĩa</p>
        <p className="mt-1 mb-4 text-lg font-semibold text-ink">
          &ldquo;{card.meaning}&rdquo;
        </p>

        {cardStillLoading && (
          <div className="flex items-center gap-2 py-6 text-sub">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo border-t-transparent" />
            <span className="text-sm">Đang tạo câu...</span>
          </div>
        )}
        {!cardStillLoading && currentSentence === null && (
          <p className="py-6 text-center text-sm text-shu">
            Không tạo được câu cho từ này. <button
              onClick={next}
              className="ml-2 font-semibold text-indigo hover:underline"
            >Bỏ qua</button>
          </p>
        )}
        {!cardStillLoading && currentSentence && (
          <>
            <div className="flex items-start gap-2">
              <button
                onClick={() => speak(currentSentence.jp.replace(/\[[^\]]*\]/g, "").replace(/<<|>>/g, ""))}
                aria-label="Phát âm"
                className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo text-white transition hover:bg-indigo-deep"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                </svg>
              </button>
              <div className="flex-1">{renderSentence()}</div>
            </div>
            {currentSentence.vi && (
              <p className="mt-3 border-l-2 border-line pl-3 text-sm italic text-sub">
                {currentSentence.vi}
              </p>
            )}
            {currentSentence.fromCache && (
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
        disabled={state !== "idle" || cardStillLoading || !currentSentence}
        key={i}
        placeholder="Điền từ vào chỗ trống (kanji hoặc kana)"
        className={`w-full rounded-xl border-2 bg-card px-4 py-3.5 font-jp text-lg outline-none transition ${
          state === "right"
            ? "border-moss text-moss"
            : state === "wrong"
              ? "border-shu text-shu"
              : "border-line focus:border-indigo"
        }`}
      />

      {state === "wrong" && targetSeg && (
        <p className="mt-2 animate-slide-up text-sm">
          Đáp án: <span className="font-jp font-semibold text-ink">{targetSeg.text}</span>
          {targetSeg.reading && (
            <span className="ml-2 font-jp text-sub">({targetSeg.reading})</span>
          )}
        </p>
      )}

      <div className="mt-3">
        <button
          onClick={state === "idle" ? check : next}
          disabled={(state === "idle" && !value.trim()) || cardStillLoading || !currentSentence}
          className="w-full rounded-xl bg-indigo py-3 font-semibold text-white transition hover:bg-indigo-deep disabled:opacity-40"
        >
          {state === "idle" ? "Kiểm tra" : i + 1 === deck.length ? "Xem kết quả" : "Câu tiếp theo"}
        </button>
      </div>

      <p className="mt-2 text-center text-xs text-sub/50">
        Câu sinh mới mỗi lần bằng Gemini · Enter để kiểm tra / tiếp theo
      </p>
    </div>
  );
}
