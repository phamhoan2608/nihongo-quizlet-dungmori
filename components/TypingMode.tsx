"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Card } from "@/lib/types";
import { grade, prioritizeCards } from "@/lib/storage";
import { cleanReading } from "@/lib/romaji";
import Speaker from "./Speaker";
import Seal from "./Seal";

type AnswerMode = "meaning" | "kana";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFC")
    .replace(/[（(].*?[）)]/g, "")
    .replace(/[~～、,.;!?·・…]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Accept any one of the comma/slash separated meanings.
function isMeaningMatch(input: string, meaning: string): boolean {
  const want = meaning.split(/[,/／;]/).map(normalize).filter(Boolean);
  const got = normalize(input);
  if (!got) return false;
  return want.some((w) => w === got || w.includes(got) || got.includes(w));
}

// Exact kana match (hiragana or katakana typed directly).
function isKanaMatch(input: string, reading: string): boolean {
  const want = cleanReading(reading).trim();
  const got = input.trim();
  if (!got || !want) return false;
  return got === want;
}

export default function TypingMode({ cards }: { cards: Card[] }) {
  const [answerMode, setAnswerMode] = useState<AnswerMode>("meaning");
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
  }, [cards, answerMode]);

  const card = deck[i];
  const finished = deck.length > 0 && i >= deck.length;

  useEffect(() => {
    if (!finished) inputRef.current?.focus();
  }, [i, finished]);

  const check = () => {
    if (state !== "idle" || !value.trim()) return;
    const ok =
      answerMode === "kana"
        ? isKanaMatch(value, card.reading || card.word)
        : isMeaningMatch(value, card.meaning);
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

  const progress = useMemo(
    () => Math.round((i / Math.max(deck.length, 1)) * 100),
    [i, deck.length]
  );

  if (deck.length === 0) return null;

  if (finished) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-line bg-card p-10 text-center shadow-card">
        <p className="text-sm font-semibold uppercase tracking-widest text-sub">
          Hoàn thành
        </p>
        <p className="mt-2 font-jp text-5xl font-bold text-indigo">
          {score}
          <span className="text-2xl text-sub">/{deck.length}</span>
        </p>
        <button
          onClick={restart}
          className="mt-6 rounded-full bg-indigo px-6 py-2.5 font-semibold text-white transition hover:bg-indigo-deep"
        >
          Làm lại
        </button>
      </div>
    );
  }

  const correctAnswer =
    answerMode === "kana"
      ? cleanReading(card?.reading || card?.word || "")
      : card?.meaning ?? "";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm text-sub">
        <span>
          {i + 1} / {deck.length}
        </span>
        <span>Đúng {score}</span>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full bg-indigo transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Answer mode toggle */}
      <div className="mb-3 flex rounded-xl border border-line bg-card p-1">
        {(["meaning", "kana"] as AnswerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setAnswerMode(m)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition ${
              answerMode === m
                ? "bg-indigo text-white shadow-sm"
                : "text-sub hover:text-ink"
            }`}
          >
            {m === "meaning" ? "Gõ tiếng Việt" : "Gõ kana"}
          </button>
        ))}
      </div>

      {/* Card — hiển thị theo chiều ngược nhau tùy mode */}
      <div className="relative mb-3 flex flex-col items-center rounded-3xl border border-line bg-card px-6 py-5 shadow-card">
        {answerMode === "meaning" ? (
          <>
            <Speaker text={card.reading || card.word} className="absolute right-4 top-4" />
            <p className="font-jp text-5xl font-bold text-ink">{card.reading || card.word}</p>
            {card.reading !== card.word && (
              <p className="mt-2 font-jp text-base text-sub/60">{card.word}</p>
            )}
          </>
        ) : (
          <>
            <p className="text-2xl font-semibold text-ink">{card.meaning}</p>
          </>
        )}
        {state === "right" && (
          <span className="absolute -right-2 -top-2">
            <Seal />
          </span>
        )}
      </div>

      <p className="mb-1.5 text-sm text-sub">
        {answerMode === "kana" ? "Gõ cách đọc bằng kana:" : "Gõ nghĩa tiếng Việt:"}
      </p>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (state === "idle" ? check() : next());
        }}
        disabled={state !== "idle"}
        placeholder={
          answerMode === "kana"
            ? "Nhập hiragana / katakana rồi nhấn Enter"
            : "Nhập đáp án rồi nhấn Enter"
        }
        className={`w-full rounded-xl border-2 bg-card px-4 py-3.5 font-jp text-lg outline-none transition ${
          state === "right"
            ? "border-moss text-moss"
            : state === "wrong"
              ? "border-shu text-shu"
              : "border-line focus:border-indigo"
        }`}
      />

      {state === "wrong" && (
        <p className="mt-3 animate-slide-up text-sm">
          Đáp án: <span className="font-semibold text-ink">{correctAnswer}</span>
        </p>
      )}

      <button
        onClick={state === "idle" ? check : next}
        disabled={state === "idle" && !value.trim()}
        className="mt-3 w-full rounded-xl bg-indigo py-3 font-semibold text-white transition hover:bg-indigo-deep disabled:opacity-40"
      >
        {state === "idle" ? "Kiểm tra" : i + 1 === deck.length ? "Xem kết quả" : "Tiếp theo"}
      </button>
    </div>
  );
}
