"use client";

import { useEffect, useRef, useState } from "react";
import type { Card } from "@/lib/types";
import { grade, prioritizeCards } from "@/lib/storage";
import { cleanReading } from "@/lib/romaji";
import { speak } from "@/lib/tts";
import Seal from "./Seal";

function isKanaMatch(input: string, reading: string): boolean {
  const want = cleanReading(reading).trim();
  const got = input.trim();
  if (!got || !want) return false;
  return got === want;
}

export default function SpellMode({ cards }: { cards: Card[] }) {
  const [deck, setDeck] = useState<Card[]>([]);
  const [i, setI] = useState(0);
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "right" | "wrong">("idle");
  const [score, setScore] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDeck(prioritizeCards(cards));
    setI(0);
    setValue("");
    setState("idle");
    setScore(0);
  }, [cards]);

  const card = deck[i];
  const finished = deck.length > 0 && i >= deck.length;

  useEffect(() => {
    if (!card || finished) return;
    const t = setTimeout(() => speak(card.reading || card.word), 400);
    return () => clearTimeout(t);
  }, [i, deck.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!finished) inputRef.current?.focus();
  }, [i, finished]);

  // Replay with R key when input is disabled (after answering)
  useEffect(() => {
    if (state === "idle" || !card) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") { e.preventDefault(); speak(card.reading || card.word); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, card]);

  const check = () => {
    if (state !== "idle" || !value.trim() || !card) return;
    const ok = isKanaMatch(value, card.reading || card.word);
    setState(ok ? "right" : "wrong");
    if (ok) setScore((s) => s + 1);
    grade(card.id, ok ? "good" : "again", "exercise");
  };

  const next = () => {
    setValue("");
    setState("idle");
    setI((x) => x + 1);
  };

  const restart = () => {
    setDeck(prioritizeCards(cards));
    setI(0);
    setValue("");
    setState("idle");
    setScore(0);
  };

  const progress = Math.round((i / Math.max(deck.length, 1)) * 100);

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

  const correctReading = cleanReading(card?.reading || card?.word || "");

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm text-sub">
        <span>{i + 1} / {deck.length}</span>
        <span>Đúng {score}</span>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full bg-indigo transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="relative mb-4 flex flex-col items-center gap-3 rounded-3xl border border-line bg-card px-6 py-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-widest text-sub">Nghe và gõ cách đọc</p>
        <button
          onClick={() => speak(card.reading || card.word)}
          aria-label="Phát âm"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo text-white shadow-lift transition hover:bg-indigo-deep active:scale-95"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        </button>

        <p className="text-xl font-semibold text-ink">{card.meaning}</p>

        {state !== "idle" && (
          <p className="font-jp text-3xl font-bold text-indigo">
            {card.reading || card.word}
            {card.reading !== card.word && (
              <span className="ml-2 text-base text-sub/60">{card.word}</span>
            )}
          </p>
        )}

        {state === "right" && <span className="absolute -right-2 -top-2"><Seal /></span>}
      </div>

      <p className="mb-1.5 text-sm text-sub">Gõ cách đọc bằng kana:</p>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") state === "idle" ? check() : next();
        }}
        disabled={state !== "idle"}
        placeholder="Nhập hiragana / katakana rồi nhấn Enter"
        className={`w-full rounded-xl border-2 bg-card px-4 py-3.5 font-jp text-lg outline-none transition ${
          state === "right"
            ? "border-moss text-moss"
            : state === "wrong"
              ? "border-shu text-shu"
              : "border-line focus:border-indigo"
        }`}
      />

      {state === "wrong" && (
        <p className="mt-2 animate-slide-up text-sm">
          Đáp án: <span className="font-jp font-semibold text-ink">{correctReading}</span>
        </p>
      )}

      <button
        onClick={state === "idle" ? check : next}
        disabled={state === "idle" && !value.trim()}
        className="mt-3 w-full rounded-xl bg-indigo py-3 font-semibold text-white transition hover:bg-indigo-deep disabled:opacity-40"
      >
        {state === "idle" ? "Kiểm tra" : i + 1 === deck.length ? "Xem kết quả" : "Tiếp theo"}
      </button>
      <p className="mt-2 text-center text-xs text-sub/50">R phát lại · Enter kiểm tra / tiếp theo</p>
    </div>
  );
}
