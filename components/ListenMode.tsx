"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Card } from "@/lib/types";
import { shuffle, sample } from "@/lib/shuffle";
import { grade, prioritizeCards, saveSessionCardId, loadSessionCardId } from "@/lib/storage";
import { speak } from "@/lib/tts";
import Seal from "./Seal";

interface Q {
  card: Card;
  options: string[];
}

function buildQuestions(cards: Card[]): Q[] {
  const pool = cards;
  return prioritizeCards(cards).map((card) => {
    const distractors = sample(
      pool.filter((c) => c.id !== card.id && c.meaning !== card.meaning),
      3
    ).map((c) => c.meaning);
    return { card, options: shuffle([card.meaning, ...distractors]) };
  });
}

export default function ListenMode({ cards, sessionKey }: { cards: Card[]; sessionKey?: string }) {
  const [qs, setQs] = useState<Q[]>([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const newQs = buildQuestions(cards);
    const savedId = sessionKey ? loadSessionCardId(sessionKey, "listen") : null;
    const initialI = savedId != null ? Math.max(0, newQs.findIndex((q) => q.card.id === savedId)) : 0;
    setQs(newQs);
    setI(initialI);
    setPicked(null);
    setScore(0);
  }, [cards]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sessionKey && qs[i]) saveSessionCardId(sessionKey, "listen", qs[i].card.id);
  }, [i, sessionKey, qs]);

  const q = qs[i];
  const finished = qs.length > 0 && i >= qs.length;

  // Auto-play on each new question
  useEffect(() => {
    if (!q || finished || qs.length === 0) return;
    const t = setTimeout(() => speak(q.card.reading || q.card.word), 400);
    return () => clearTimeout(t);
  }, [i, qs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = useCallback((opt: string) => {
    if (picked || !q) return;
    setPicked(opt);
    const ok = opt === q.card.meaning;
    if (ok) setScore((s) => s + 1);
    grade(q.card.id, ok ? "good" : "again", "exercise");
  }, [picked, q]);

  const next = useCallback(() => {
    setPicked(null);
    setI((x) => x + 1);
  }, []);

  const restart = () => {
    setQs(buildQuestions(cards));
    setI(0);
    setPicked(null);
    setScore(0);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (finished || !q) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "BUTTON" || t.isContentEditable) return;
      if (!picked) {
        const idx = ["1", "2", "3", "4"].indexOf(e.key);
        if (idx !== -1 && q.options[idx]) { e.preventDefault(); choose(q.options[idx]); }
        if (e.key === " " || e.key === "r") { e.preventDefault(); speak(q.card.reading || q.card.word); }
      } else {
        if (e.key === "Enter") { e.preventDefault(); next(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, q, picked, choose, next]);

  const progress = useMemo(
    () => Math.round((i / Math.max(qs.length, 1)) * 100),
    [i, qs.length]
  );

  if (qs.length === 0) return null;

  if (finished) {
    const pct = Math.round((score / qs.length) * 100);
    return (
      <div className="flex flex-col items-center rounded-3xl border border-line bg-card p-10 text-center shadow-card">
        <p className="text-sm font-semibold uppercase tracking-widest text-sub">Kết quả</p>
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
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm text-sub">
        <span>Câu {i + 1} / {qs.length}</span>
        <span>Đúng {score}</span>
      </div>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full bg-indigo transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Audio card */}
      <div className="relative mb-4 flex flex-col items-center gap-3 rounded-3xl border border-line bg-card px-6 py-8 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-widest text-sub">
          Nghe và chọn nghĩa đúng
        </p>
        <button
          onClick={() => speak(q.card.reading || q.card.word)}
          aria-label="Phát âm"
          className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo text-white shadow-lift transition hover:bg-indigo-deep active:scale-95"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        </button>

        {/* Reveal word after answering */}
        {picked && (
          <p className="font-jp text-3xl font-bold text-ink">
            {q.card.reading || q.card.word}
            {q.card.reading !== q.card.word && (
              <span className="ml-2 text-base text-sub/60">{q.card.word}</span>
            )}
          </p>
        )}

        {picked === q.card.meaning && (
          <span className="absolute -right-2 -top-2"><Seal /></span>
        )}
      </div>

      <div className="grid gap-3">
        {q.options.map((opt, idx) => {
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
              onClick={() => choose(opt)}
              disabled={!!picked}
              className={`rounded-xl border-2 px-5 py-3.5 text-left font-medium text-ink transition ${cls}`}
            >
              <span className="mr-2 text-xs opacity-40">[{idx + 1}]</span>
              {opt}
            </button>
          );
        })}
      </div>

      {picked && (
        <button
          onClick={next}
          className="mt-3 w-full animate-slide-up rounded-xl bg-ink py-3 font-semibold text-white transition hover:opacity-90"
        >
          {i + 1 === qs.length ? "Xem kết quả" : "Câu tiếp theo"}
          <span className="ml-1.5 text-xs opacity-50">[Enter]</span>
        </button>
      )}

      <p className="mt-2 text-center text-xs text-sub/50">
        Space/R phát lại · 1–4 chọn đáp án · Enter tiếp theo
      </p>
    </div>
  );
}
