"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Card } from "@/lib/types";
import { getProgress, getMemoryLevel, prioritizeCards, saveSessionCardId, loadSessionCardId } from "@/lib/storage";
import { speak } from "@/lib/tts";
import Flashcard from "./Flashcard";

export default function FlashcardMode({
  cards,
  autoPlay,
  sessionKey,
}: {
  cards: Card[];
  autoPlay?: boolean;
  sessionKey?: string;
}) {
  const [deck, setDeck] = useState<Card[]>([]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = deck[i];
  const finished = deck.length > 0 && i >= deck.length;

  const goPrev = useCallback(() => {
    if (i > 0) { setFlipped(false); setI((x) => x - 1); }
  }, [i]);

  const goNext = useCallback(() => {
    setFlipped(false);
    setI((x) => x + 1);
  }, []);

  const restart = useCallback(() => {
    setDeck(prioritizeCards(cards));
    setI(0);
    setFlipped(false);
  }, [cards]);

  useEffect(() => {
    const newDeck = prioritizeCards(cards);
    const savedId = sessionKey ? loadSessionCardId(sessionKey, "flashcard") : null;
    const initialI = savedId != null ? Math.max(0, newDeck.findIndex((c) => c.id === savedId)) : 0;
    setDeck(newDeck);
    setI(initialI);
    setFlipped(false);
  }, [cards]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sessionKey && deck[i]) saveSessionCardId(sessionKey, "flashcard", deck[i].id);
  }, [i, sessionKey, deck]);

  useEffect(() => {
    if (!autoPlay || !card || deck.length === 0 || finished) return;
    const t = setTimeout(() => speak(card.reading || card.word), 300);
    return () => clearTimeout(t);
  }, [i, autoPlay, deck.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, deck.length, goPrev, goNext]);

  const progress = useMemo(
    () => Math.min(100, Math.round((i / Math.max(deck.length, 1)) * 100)),
    [i, deck.length]
  );

  if (deck.length === 0) return null;

  if (finished) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-line bg-card p-10 text-center shadow-card">
        <p className="font-jp text-3xl font-bold text-ink">お疲れさま！</p>
        <p className="mt-2 text-sub">Bạn đã lật qua {deck.length} thẻ.</p>
        <button
          onClick={restart}
          className="mt-6 rounded-full bg-indigo px-6 py-2.5 font-semibold text-white transition hover:bg-indigo-deep"
        >
          Xem lại
        </button>
      </div>
    );
  }

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

        <span className="flex-1 text-center">{i + 1} / {deck.length}</span>

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

      <div className="mt-4">
        {flipped ? (
          <button
            onClick={goNext}
            className="w-full rounded-xl bg-indigo py-3.5 font-semibold text-white transition hover:bg-indigo-deep"
          >
            Tiếp theo →
          </button>
        ) : (
          <button
            onClick={() => setFlipped(true)}
            className="w-full rounded-xl bg-indigo py-3.5 font-semibold text-white transition hover:bg-indigo-deep"
          >
            Xem nghĩa
          </button>
        )}
      </div>

      <p className="mt-2 text-center text-xs text-sub/50">
        ← → điều hướng · Space lật thẻ
      </p>
    </div>
  );
}
