"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Card, Example } from "@/lib/types";
import type { MemoryLevelInfo } from "@/lib/storage";
import { kanaToRomaji } from "@/lib/romaji";
import Speaker from "./Speaker";

export default function Flashcard({
  card,
  flipped,
  onFlip,
  level,
}: {
  card: Card;
  flipped: boolean;
  onFlip: () => void;
  level?: MemoryLevelInfo;
}) {
  // For N5: kana (reading) is the primary text; kanji (word) is a secondary reference.
  const primary = card.reading || card.word;
  const secondary = card.word !== card.reading ? card.word : null;
  const romaji = kanaToRomaji(primary);

  // ── Examples ────────────────────────────────────────────────────────────
  const [showExamples, setShowExamples] = useState(false);
  const [examples, setExamples] = useState<Example[] | null>(card.examples ?? null);
  const [loading, setLoading] = useState(false);
  const hasCached = !!card.examples && card.examples.length > 0;

  // Reset khi đổi thẻ
  useEffect(() => {
    setShowExamples(false);
    setExamples(card.examples ?? null);
    setLoading(false);
  }, [card.id, card.examples]);

  const toggleExamples = async () => {
    if (showExamples) { setShowExamples(false); return; }
    setShowExamples(true);
    if (!examples || examples.length === 0) {
      setLoading(true);
      try {
        const res = await fetch(`/api/example?word=${encodeURIComponent(card.word)}`);
        const data = await res.json();
        setExamples(data.examples ?? []);
      } catch {
        setExamples([]);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="w-full">
      <div className="flip w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={onFlip}
        onKeyDown={(e) => { if (e.key === "Enter") onFlip(); }}
        aria-label="Lật thẻ"
        className="block w-full cursor-pointer text-left outline-none"
      >
        <div
          className={`flip-inner relative w-full ${
            card.image ? "h-72 sm:h-80" : "h-52 sm:h-60"
          } ${flipped ? "is-flipped" : ""}`}
        >
          {/* Front */}
          <div className="flip-face absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-line bg-card px-6 py-10 shadow-card">
            <div className="absolute left-5 top-4 flex gap-1.5">
              <span className="rounded-full bg-indigo-soft px-2.5 py-1 text-xs font-semibold text-indigo">
                {card.pos || (card.type === "expression" ? "Mẫu câu" : "Từ")}
              </span>
              {level && (
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${level.cls}`}>
                  {level.label}
                </span>
              )}
            </div>
            <Speaker text={primary} className="absolute right-4 top-4" />

            {/* Image */}
            {card.image && (
              <div className="relative mb-2 h-20 w-36 shrink-0 overflow-hidden rounded-xl opacity-90">
                <Image src={card.image} alt={primary} fill className="object-cover" sizes="144px" />
              </div>
            )}

            {/* Kana — primary */}
            <p className={`font-jp font-bold leading-tight text-ink ${card.image ? "text-3xl sm:text-4xl" : "text-5xl sm:text-6xl"}`}>
              {primary}
            </p>

            {/* Kanji — secondary reference */}
            {secondary && (
              <p className="mt-1 font-jp text-sm text-sub/60">{secondary}</p>
            )}

            {/* Romaji */}
            {romaji && (
              <p className="mt-1 text-xs tracking-wide text-sub/50">{romaji}</p>
            )}

            <p className="absolute bottom-4 text-xs text-sub/60">Chạm để xem nghĩa</p>
          </div>

          {/* Back */}
          <div className="flip-face flip-back absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-indigo bg-indigo px-6 py-10 text-center shadow-lift">
            {card.image && (
              <div className="relative mb-2 h-16 w-28 shrink-0 overflow-hidden rounded-xl opacity-80">
                <Image src={card.image} alt={primary} fill className="object-cover" sizes="112px" />
              </div>
            )}
            <p className="font-jp text-xl font-medium text-white/80">{primary}</p>
            {secondary && (
              <p className="font-jp text-xs text-white/50">{secondary}</p>
            )}
            <p className="mt-2 text-2xl font-semibold leading-tight text-white sm:text-3xl">
              {card.meaning}
            </p>
            {card.note && (
              <p className="mt-2 max-w-md text-xs leading-relaxed text-white/70">
                {card.note}
              </p>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Ví dụ câu — chỉ hiện khi lật thẻ */}
      {flipped && (
        <div className="mt-3">
          <button
            onClick={toggleExamples}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-semibold text-indigo transition hover:border-indigo hover:bg-indigo-soft"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
            {showExamples ? "Ẩn ví dụ" : hasCached ? "Xem ví dụ" : "Xem ví dụ (Tatoeba)"}
          </button>

          {showExamples && (
            <div className="mt-2 animate-slide-up rounded-2xl border border-line bg-card p-4 shadow-card">
              {loading && (
                <p className="text-center text-sm text-sub">Đang tải…</p>
              )}
              {!loading && examples && examples.length === 0 && (
                <p className="text-center text-sm text-sub">Chưa có ví dụ cho từ này.</p>
              )}
              {!loading && examples && examples.length > 0 && (
                <ul className="space-y-3">
                  {examples.map((ex, idx) => (
                    <li key={idx} className="flex flex-col gap-1">
                      <div className="flex items-start gap-2">
                        <Speaker text={ex.jp} />
                        <p className="font-jp text-base leading-relaxed text-ink">{ex.jp}</p>
                      </div>
                      {ex.vi && (
                        <p className="pl-8 text-sm text-sub">{ex.vi}</p>
                      )}
                      {!ex.vi && ex.en && (
                        <p className="pl-8 text-sm italic text-sub/80">{ex.en}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
