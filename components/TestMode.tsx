"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Card } from "@/lib/types";
import { grade, prioritizeCards } from "@/lib/storage";
import { cleanReading } from "@/lib/romaji";
import { shuffle, sample } from "@/lib/shuffle";
import { speak } from "@/lib/tts";
import Seal from "./Seal";
import Speaker from "./Speaker";

type QType = "mc" | "typing";

interface Q {
  card: Card;
  qtype: QType;
  options?: string[];
}

interface WrongItem {
  q: Q;
  answer: string;
}

function isKanaMatch(input: string, reading: string): boolean {
  const want = cleanReading(reading).trim();
  const got = input.trim();
  if (!got || !want) return false;
  return got === want;
}

function buildTest(cards: Card[]): Q[] {
  const pool = prioritizeCards(cards);
  return pool.map((card, idx) => {
    const qtype: QType = idx % 2 === 0 ? "mc" : "typing";
    if (qtype === "mc") {
      const distractors = sample(
        cards.filter((c) => c.id !== card.id && c.meaning !== card.meaning),
        3
      ).map((c) => c.meaning);
      return { card, qtype, options: shuffle([card.meaning, ...distractors]) };
    }
    return { card, qtype };
  });
}

export default function TestMode({ cards }: { cards: Card[] }) {
  const [qs, setQs] = useState<Q[]>([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [typingState, setTypingState] = useState<"idle" | "right" | "wrong">("idle");
  const [score, setScore] = useState(0);
  const [wrongs, setWrongs] = useState<WrongItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQs(buildTest(cards));
    setI(0);
    setPicked(null);
    setValue("");
    setTypingState("idle");
    setScore(0);
    setWrongs([]);
  }, [cards]);

  const q = qs[i];
  const finished = qs.length > 0 && i >= qs.length;
  const answered = q ? (q.qtype === "mc" ? picked !== null : typingState !== "idle") : false;

  useEffect(() => {
    if (q?.qtype === "typing" && !finished) inputRef.current?.focus();
  }, [i, q, finished]);

  const chooseMC = useCallback((opt: string) => {
    if (picked || !q) return;
    setPicked(opt);
    const ok = opt === q.card.meaning;
    if (ok) setScore((s) => s + 1);
    else setWrongs((w) => [...w, { q, answer: opt }]);
    grade(q.card.id, ok ? "good" : "again", "exercise");
  }, [picked, q]);

  const checkTyping = useCallback(() => {
    if (typingState !== "idle" || !value.trim() || !q) return;
    const ok = isKanaMatch(value, q.card.reading || q.card.word);
    setTypingState(ok ? "right" : "wrong");
    if (ok) setScore((s) => s + 1);
    else setWrongs((w) => [...w, { q, answer: value }]);
    grade(q.card.id, ok ? "good" : "again", "exercise");
  }, [typingState, value, q]);

  const next = useCallback(() => {
    setPicked(null);
    setValue("");
    setTypingState("idle");
    setI((x) => x + 1);
  }, []);

  const restart = () => {
    setQs(buildTest(cards));
    setI(0);
    setPicked(null);
    setValue("");
    setTypingState("idle");
    setScore(0);
    setWrongs([]);
  };

  // Keyboard shortcuts for MC
  useEffect(() => {
    if (!q || q.qtype !== "mc" || finished) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if (!picked) {
        const idx = ["1", "2", "3", "4"].indexOf(e.key);
        if (idx !== -1 && q.options?.[idx]) { e.preventDefault(); chooseMC(q.options[idx]); }
      } else {
        if (e.key === "Enter") { e.preventDefault(); next(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, finished, picked, chooseMC, next]);

  const progress = Math.round((i / Math.max(qs.length, 1)) * 100);

  if (qs.length === 0) return null;

  if (finished) {
    const pct = Math.round((score / qs.length) * 100);
    return (
      <div>
        <div className="flex flex-col items-center rounded-3xl border border-line bg-card p-10 text-center shadow-card">
          <p className="text-sm font-semibold uppercase tracking-widest text-sub">Kết quả kiểm tra</p>
          <p className="mt-2 font-jp text-5xl font-bold text-indigo">
            {score}<span className="text-2xl text-sub">/{qs.length}</span>
          </p>
          <p className="mt-2 text-sub">Đúng {pct}%</p>
          <button
            onClick={restart}
            className="mt-6 rounded-full bg-indigo px-6 py-2.5 font-semibold text-white transition hover:bg-indigo-deep"
          >
            Làm lại
          </button>
        </div>

        {wrongs.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-shu">Từ cần ôn lại ({wrongs.length})</p>
            <div className="flex flex-col gap-2">
              {wrongs.map(({ q: wq, answer }, idx) => (
                <div key={idx} className="rounded-2xl border border-shu/30 bg-shu-soft px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Speaker text={wq.card.reading || wq.card.word} />
                    <span className="font-jp text-lg font-bold text-ink">{wq.card.reading || wq.card.word}</span>
                    {wq.card.reading !== wq.card.word && (
                      <span className="font-jp text-sm text-sub/60">{wq.card.word}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-ink">{wq.card.meaning}</p>
                  <p className="mt-0.5 text-xs text-shu">
                    Bạn trả lời: <span className="font-jp">{answer || "(bỏ trống)"}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm text-sub">
        <span>
          Câu {i + 1} / {qs.length}
          <span className="ml-2 text-xs opacity-60">
            {q.qtype === "mc" ? "Trắc nghiệm" : "Gõ kana"}
          </span>
        </span>
        <span>Đúng {score}</span>
      </div>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full bg-indigo transition-all" style={{ width: `${progress}%` }} />
      </div>

      {q.qtype === "mc" ? (
        <>
          <div className="relative mb-4 flex flex-col items-center rounded-3xl border border-line bg-card px-6 py-6 shadow-card">
            <Speaker text={q.card.reading || q.card.word} className="absolute right-4 top-4" />
            <p className="font-jp text-5xl font-bold text-ink">{q.card.reading || q.card.word}</p>
            {q.card.reading !== q.card.word && (
              <p className="mt-2 font-jp text-base text-sub/60">{q.card.word}</p>
            )}
            {picked === q.card.meaning && <span className="absolute -right-2 -top-2"><Seal /></span>}
          </div>
          <div className="grid gap-3">
            {q.options!.map((opt, idx) => {
              const isCorrect = opt === q.card.meaning;
              const isPicked = opt === picked;
              let cls = "border-line bg-card hover:border-indigo hover:bg-indigo-soft";
              if (picked) {
                if (isCorrect) cls = "border-moss bg-moss/10 text-moss";
                else if (isPicked) cls = "border-shu bg-shu-soft text-shu";
                else cls = "border-line bg-card opacity-60";
              }
              return (
                <button
                  key={opt}
                  onClick={() => chooseMC(opt)}
                  disabled={!!picked}
                  className={`rounded-xl border-2 px-5 py-3.5 text-left font-medium text-ink transition ${cls}`}
                >
                  <span className="mr-2 text-xs opacity-40">[{idx + 1}]</span>
                  {opt}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="relative mb-4 flex flex-col items-center rounded-3xl border border-line bg-card px-6 py-6 shadow-card">
            <Speaker text={q.card.reading || q.card.word} className="absolute right-4 top-4" />
            <p className="text-2xl font-semibold text-ink">{q.card.meaning}</p>
            {typingState !== "idle" && (
              <p className="mt-2 font-jp text-3xl font-bold text-indigo">
                {q.card.reading || q.card.word}
              </p>
            )}
            {typingState === "right" && <span className="absolute -right-2 -top-2"><Seal /></span>}
          </div>

          <p className="mb-1.5 text-sm text-sub">Gõ cách đọc bằng kana:</p>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") typingState === "idle" ? checkTyping() : next();
            }}
            disabled={typingState !== "idle"}
            placeholder="Nhập hiragana / katakana rồi nhấn Enter"
            className={`w-full rounded-xl border-2 bg-card px-4 py-3.5 font-jp text-lg outline-none transition ${
              typingState === "right"
                ? "border-moss text-moss"
                : typingState === "wrong"
                  ? "border-shu text-shu"
                  : "border-line focus:border-indigo"
            }`}
          />

          {typingState === "wrong" && (
            <p className="mt-2 animate-slide-up text-sm">
              Đáp án: <span className="font-jp font-semibold text-ink">{cleanReading(q.card.reading || q.card.word)}</span>
            </p>
          )}

          {typingState === "idle" && (
            <button
              onClick={checkTyping}
              disabled={!value.trim()}
              className="mt-3 w-full rounded-xl bg-indigo py-3 font-semibold text-white transition hover:bg-indigo-deep disabled:opacity-40"
            >
              Kiểm tra
            </button>
          )}
        </>
      )}

      {answered && (
        <button
          onClick={next}
          className="mt-3 w-full animate-slide-up rounded-xl bg-ink py-3 font-semibold text-white transition hover:opacity-90"
        >
          {i + 1 === qs.length ? "Xem kết quả" : "Câu tiếp theo"}
          <span className="ml-1.5 text-xs opacity-50">[Enter]</span>
        </button>
      )}
      {q.qtype === "mc" && (
        <p className="mt-2 text-center text-xs text-sub/50">1–4 chọn đáp án · Enter tiếp theo</p>
      )}
    </div>
  );
}
