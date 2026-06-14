"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Card, Grade } from "@/lib/types";
import { shuffle } from "@/lib/shuffle";
import { grade, markMastered, getProgress, getMemoryLevel, prioritizeCards } from "@/lib/storage";
import { speak } from "@/lib/tts";
import Flashcard from "./Flashcard";

const GRADES: { g: Grade; label: string; hint: string; cls: string }[] = [
  { g: "again", label: "Chưa thuộc", hint: "1", cls: "border-shu text-shu hover:bg-shu-soft" },
  { g: "hard",  label: "Khó",        hint: "2", cls: "border-line text-ink hover:bg-paper"   },
  { g: "good",  label: "Được",       hint: "3", cls: "border-line text-ink hover:bg-paper"   },
  { g: "easy",  label: "Dễ",         hint: "4", cls: "border-moss text-moss hover:bg-moss/10"},
];

export default function FlashcardMode({ cards, autoPlay }: { cards: Card[]; autoPlay?: boolean }) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [deck, setDeck] = useState<Card[]>([]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const [againCards, setAgainCards] = useState<Card[]>([]);
  const [round, setRound] = useState(1);

  // ── Derived (no hooks) ────────────────────────────────────────────────────
  const card = deck[i];
  const finished = deck.length > 0 && i >= deck.length;

  // ── Callbacks (all hooks before any early return) ─────────────────────────
  const handleGrade = useCallback((g: Grade) => {
    if (!card) return;
    grade(card.id, g, "flashcard");
    setDone((d) => d + 1);
    setFlipped(false);
    if (g === "again") setAgainCards((prev) => [...prev, card]);
    setI((x) => x + 1);
  }, [card]);

  const handleMastered = useCallback(() => {
    if (!card) return;
    markMastered(card.id);
    setDone((d) => d + 1);
    setFlipped(false);
    setI((x) => x + 1);
  }, [card]);

  const goPrev = useCallback(() => {
    if (i > 0) { setFlipped(false); setI((x) => x - 1); }
  }, [i]);

  const goNext = useCallback(() => {
    if (!flipped) setFlipped(true);
    else handleGrade("good");
  }, [flipped, handleGrade]);

  const continueWithAgain = useCallback(() => {
    setDeck(shuffle(againCards));
    setAgainCards([]);
    setI(0);
    setFlipped(false);
    setRound((r) => r + 1);
  }, [againCards]);

  const restart = useCallback(() => {
    setDeck(prioritizeCards(cards));
    setI(0);
    setFlipped(false);
    setDone(0);
    setAgainCards([]);
    setRound(1);
  }, [cards]);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setDeck(prioritizeCards(cards));
    setI(0);
    setFlipped(false);
    setDone(0);
    setAgainCards([]);
    setRound(1);
  }, [cards]);

  useEffect(() => {
    if (!autoPlay || !card || deck.length === 0 || finished) return;
    const t = setTimeout(() => speak(card.reading || card.word), 300);
    return () => clearTimeout(t);
  }, [i, autoPlay, deck.length]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (finished || deck.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      switch (e.key) {
        case "ArrowLeft":  e.preventDefault(); goPrev(); break;
        case "ArrowRight":
        case "Enter":      e.preventDefault(); goNext(); break;
        case " ":          e.preventDefault(); setFlipped((f) => !f); break;
        case "1": if (flipped) { e.preventDefault(); handleGrade("again");   } break;
        case "2": if (flipped) { e.preventDefault(); handleGrade("hard");   } break;
        case "3": if (flipped) { e.preventDefault(); handleGrade("good");   } break;
        case "4": if (flipped) { e.preventDefault(); handleGrade("easy");   } break;
        case "5": if (flipped) { e.preventDefault(); handleMastered();      } break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, deck.length, flipped, goPrev, goNext, handleGrade, handleMastered]);

  // ── Memo ──────────────────────────────────────────────────────────────────
  const progress = useMemo(
    () => Math.min(100, Math.round((i / Math.max(deck.length, 1)) * 100)),
    [i, deck.length]
  );

  // ── Early returns (after ALL hooks) ───────────────────────────────────────
  if (deck.length === 0) return null;

  if (finished) {
    if (againCards.length > 0) {
      return (
        <div className="flex flex-col items-center rounded-3xl border border-line bg-card p-10 text-center shadow-card">
          <p className="text-sm font-semibold uppercase tracking-widest text-sub">
            Xong vòng {round}
          </p>
          <p className="mt-2 font-jp text-5xl font-bold text-shu">
            {againCards.length}
            <span className="text-2xl text-sub">/{deck.length}</span>
          </p>
          <p className="mt-1 text-sm text-sub">thẻ chưa thuộc</p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={continueWithAgain}
              className="rounded-full bg-indigo px-6 py-2.5 font-semibold text-white transition hover:bg-indigo-deep"
            >
              Ôn lại thẻ chưa thuộc
            </button>
            <button
              onClick={restart}
              className="rounded-full border border-line bg-card px-6 py-2.5 font-semibold text-ink transition hover:bg-paper"
            >
              Làm lại từ đầu
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center rounded-3xl border border-line bg-card p-10 text-center shadow-card">
        <p className="font-jp text-3xl font-bold text-ink">お疲れさま！</p>
        <p className="mt-2 text-sub">Bạn vừa ôn {done} lượt thẻ trong bộ này.</p>
        <button
          onClick={restart}
          className="mt-6 rounded-full bg-indigo px-6 py-2.5 font-semibold text-white transition hover:bg-indigo-deep"
        >
          Ôn lại
        </button>
      </div>
    );
  }

  // ── Main study view ───────────────────────────────────────────────────────
  return (
    <div>
      {/* Counter + nav */}
      <div className="mb-3 flex items-center gap-3 text-sm text-sub">
        <button
          onClick={goPrev}
          disabled={i === 0}
          aria-label="Thẻ trước"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-card transition hover:border-indigo hover:text-indigo disabled:opacity-30"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <span className="flex-1 text-center">
          {i + 1} / {deck.length}
          {round > 1 && (
            <span className="ml-2 rounded-full bg-indigo-soft px-2 py-0.5 text-xs font-semibold text-indigo">
              Vòng {round}
            </span>
          )}
        </span>

        <button
          onClick={goNext}
          aria-label="Thẻ tiếp"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-card transition hover:border-indigo hover:text-indigo"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <span className="w-10 text-right">{progress}%</span>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full bg-indigo transition-all" style={{ width: `${progress}%` }} />
      </div>

      <Flashcard
        card={card}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
        level={getMemoryLevel(getProgress(card.id))}
      />

      {/* Action buttons */}
      <div className="mt-4">
        {flipped ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {GRADES.map((b) => (
                <button
                  key={b.g}
                  onClick={() => handleGrade(b.g)}
                  className={`rounded-xl border-2 bg-card py-3 text-sm font-semibold transition ${b.cls}`}
                >
                  {b.label}
                  <span className="ml-1.5 text-xs font-normal opacity-40">[{b.hint}]</span>
                </button>
              ))}
            </div>
            <button
              onClick={handleMastered}
              className="mt-2 w-full rounded-xl bg-moss py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Tôi đã thuộc từ này ✓
              <span className="ml-1.5 text-xs font-normal opacity-60">[5]</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => setFlipped(true)}
            className="w-full rounded-xl bg-indigo py-3.5 font-semibold text-white transition hover:bg-indigo-deep"
          >
            Xem nghĩa
          </button>
        )}
      </div>

      {/* Keyboard hints */}
      <p className="mt-2 text-center text-xs text-sub/50">
        ← → điều hướng · Space lật · Enter tiếp · 1–4 đánh giá · 5 đã thuộc
      </p>
    </div>
  );
}
