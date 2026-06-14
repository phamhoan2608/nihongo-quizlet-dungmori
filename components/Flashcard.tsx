"use client";

import Image from "next/image";
import type { Card } from "@/lib/types";
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

  return (
    <div className="flip w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={onFlip}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onFlip(); }}
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
  );
}
