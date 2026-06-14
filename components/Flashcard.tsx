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
          className={`flip-inner relative h-52 w-full sm:h-60 ${
            flipped ? "is-flipped" : ""
          }`}
        >
          {/* Front */}
          <div className="flip-face absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-line bg-card px-6 shadow-card">
            <div className="absolute left-5 top-5 flex gap-1.5">
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
              <div className="relative mb-3 h-20 w-32 overflow-hidden rounded-xl opacity-90 sm:h-24 sm:w-36">
                <Image src={card.image} alt={primary} fill className="object-cover" sizes="144px" />
              </div>
            )}

            {/* Kana — primary */}
            <p className={`font-jp font-bold text-ink ${card.image ? "text-4xl sm:text-5xl" : "text-5xl sm:text-6xl"}`}>
              {primary}
            </p>

            {/* Kanji — secondary reference */}
            {secondary && (
              <p className="mt-2 font-jp text-base text-sub/60">{secondary}</p>
            )}

            {/* Romaji */}
            {romaji && (
              <p className="mt-1 text-sm tracking-wide text-sub/50">{romaji}</p>
            )}

            <p className="absolute bottom-5 text-xs text-sub">Chạm để xem nghĩa</p>
          </div>

          {/* Back */}
          <div className="flip-face flip-back absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-indigo bg-indigo px-6 text-center shadow-lift">
            {card.image && (
              <div className="relative mb-2 h-16 w-28 overflow-hidden rounded-xl opacity-80 sm:h-20 sm:w-32">
                <Image src={card.image} alt={primary} fill className="object-cover" sizes="128px" />
              </div>
            )}
            <p className="font-jp text-2xl font-medium text-white/80">{primary}</p>
            {secondary && (
              <p className="font-jp text-sm text-white/50">{secondary}</p>
            )}
            <p className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
              {card.meaning}
            </p>
            {card.note && (
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
                {card.note}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
