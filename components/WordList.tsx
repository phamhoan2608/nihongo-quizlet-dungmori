"use client";

import { useState } from "react";
import Image from "next/image";
import type { Card } from "@/lib/types";
import {
  getProgress,
  effectiveBox,
  MEMORY_LEVELS,
  toggleImportant,
  getAllImportant,
} from "@/lib/storage";

export default function WordList({ cards }: { cards: Card[] }) {
  // tick forces re-render after toggling important
  const [tick, setTick] = useState(0);
  const important = getAllImportant();

  const handleToggle = (id: number) => {
    toggleImportant(id);
    setTick((t) => t + 1);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-none border-b border-line px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-sub">
          {cards.length} từ trong bài
        </p>
      </div>
      <ul className="flex-1 overflow-y-auto">
        {cards.map((card) => {
          const p = getProgress(card.id);
          const unseen = p.reps === 0;
          const box = unseen ? -1 : effectiveBox(p);
          const level = unseen ? null : MEMORY_LEVELS[Math.min(box, MEMORY_LEVELS.length - 1)];
          const imp = important.has(card.id);

          return (
            <li
              key={card.id}
              className="flex items-center gap-2 border-b border-line/40 px-3 py-2 transition hover:bg-paper"
            >
              {/* Important star */}
              <button
                onClick={() => handleToggle(card.id)}
                title={imp ? "Bỏ đánh dấu quan trọng" : "Đánh dấu quan trọng"}
                className={`shrink-0 text-base leading-none transition ${
                  imp ? "text-shu" : "text-sub/25 hover:text-sub/60"
                }`}
              >
                {imp ? "★" : "☆"}
              </button>

              {/* Thumbnail */}
              {card.image && (
                <div className="relative h-8 w-10 shrink-0 overflow-hidden rounded-md">
                  <Image src={card.image} alt={card.reading || card.word} fill className="object-cover" sizes="40px" />
                </div>
              )}

              {/* Word */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-jp text-sm font-semibold text-ink">
                  {card.reading || card.word}
                  {card.reading !== card.word && (
                    <span className="ml-1.5 font-normal text-sub/50">{card.word}</span>
                  )}
                </p>
                <p className="truncate text-xs text-sub">{card.meaning}</p>
              </div>

              {/* Mastery badge */}
              {level ? (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${level.cls}`}
                >
                  {level.label}
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-line px-2 py-0.5 text-xs text-sub/50">
                  Mới
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
