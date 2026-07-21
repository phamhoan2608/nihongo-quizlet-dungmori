"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Card } from "@/lib/types";
import { shuffle, sample } from "@/lib/shuffle";
import { grade, prioritizeCards, saveSessionCardId, loadSessionCardId } from "@/lib/storage";
import { speak } from "@/lib/tts";
import Seal from "./Seal";
import Speaker from "./Speaker";

interface Q {
  card: Card;
  options: string[];
}

function buildQuestions(cards: Card[], distractorPool: Card[]): Q[] {
  // Pool cho distractors: dùng distractorPool nếu lớn hơn, fallback về cards.
  const pool = distractorPool.length >= cards.length ? distractorPool : cards;
  return prioritizeCards(cards).map((card) => {
    const others = pool.filter((c) => c.id !== card.id && c.meaning !== card.meaning);
    const samePOS = others.filter((c) => c.pos === card.pos);
    const diffPOS = others.filter((c) => c.pos !== card.pos);
    const needed = 3;
    const fromSame = sample(samePOS, Math.min(needed, samePOS.length));
    const fromDiff = sample(diffPOS, Math.max(0, needed - fromSame.length));
    const distractors = [...fromSame, ...fromDiff].map((c) => c.meaning);
    return { card, options: shuffle([card.meaning, ...distractors]) };
  });
}

export default function QuizMode({
  cards, autoPlay, sessionKey, distractorPool,
}: {
  cards: Card[]; autoPlay?: boolean; sessionKey?: string; distractorPool?: Card[];
}) {
  const [qs, setQs] = useState<Q[]>([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const newQs = buildQuestions(cards, distractorPool ?? cards);
    const savedId = sessionKey ? loadSessionCardId(sessionKey, "quiz") : null;
    const initialI = savedId != null ? Math.max(0, newQs.findIndex((q) => q.card.id === savedId)) : 0;
    setQs(newQs);
    setI(initialI);
    setPicked(null);
    setScore(0);
  }, [cards, distractorPool]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sessionKey && qs[i]) saveSessionCardId(sessionKey, "quiz", qs[i].card.id);
  }, [i, sessionKey, qs]);

  const q = qs[i];
  const finished = qs.length > 0 && i >= qs.length;

  useEffect(() => {
    if (!autoPlay || !q || finished) return;
    const t = setTimeout(() => speak(q.card.reading || q.card.word), 300);
    return () => clearTimeout(t);
  }, [i, autoPlay, qs.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setQs(buildQuestions(cards, distractorPool ?? cards));
    setI(0);
    setPicked(null);
    setScore(0);
  };

  useEffect(() => {
    if (finished || !q) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "BUTTON" || t.isContentEditable) return;
      if (!picked) {
        const idx = ["1", "2", "3", "4"].indexOf(e.key);
        if (idx !== -1 && q.options[idx]) { e.preventDefault(); choose(q.options[idx]); }
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
        <p className="text-sm font-semibold uppercase tracking-widest text-sub">
          Kết quả
        </p>
        <p className="mt-2 font-jp text-5xl font-bold text-indigo">
          {score}
          <span className="text-2xl text-sub">/{qs.length}</span>
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
        <span>
          Câu {i + 1} / {qs.length}
        </span>
        <span>Đúng {score}</span>
      </div>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full bg-indigo transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="relative mb-4 flex flex-col items-center rounded-3xl border border-line bg-card px-6 py-6 shadow-card">
        <Speaker text={q.card.reading || q.card.word} className="absolute right-4 top-4" />
        <p className="font-jp text-5xl font-bold text-ink">{q.card.reading || q.card.word}</p>
        {q.card.reading !== q.card.word && (
          <p className="mt-2 font-jp text-base text-sub/60">{q.card.word}</p>
        )}
        {picked && (
          <span className="absolute -right-2 -top-2">
            {picked === q.card.meaning ? <Seal /> : null}
          </span>
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
    </div>
  );
}
