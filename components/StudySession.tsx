"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Card, Mode } from "@/lib/types";
import { resetLesson } from "@/lib/storage";
import FlashcardMode from "./FlashcardMode";
import QuizMode from "./QuizMode";
import MatchMode from "./MatchMode";
import TypingMode from "./TypingMode";

const MODES: { id: Mode; label: string }[] = [
  { id: "flashcard", label: "Lật thẻ" },
  { id: "quiz", label: "Trắc nghiệm" },
  { id: "match", label: "Nối cặp" },
  { id: "typing", label: "Gõ đáp án" },
];

export default function StudySession({
  course,
  lesson,
  cards,
}: {
  course: string;
  lesson: number;
  cards: Card[];
}) {
  const [mode, setMode] = useState<Mode>("flashcard");
  const [section, setSection] = useState<string>("all");
  const [onlyVocab, setOnlyVocab] = useState(false);

  const sections = useMemo(
    () => [...new Set(cards.map((c) => c.section))].sort(),
    [cards]
  );

  const filtered = useMemo(() => {
    let r = cards;
    if (section !== "all") r = r.filter((c) => c.section === section);
    if (onlyVocab) r = r.filter((c) => c.type === "vocab");
    return r;
  }, [cards, section, onlyVocab]);

  // key forces each mode to reset when the filtered deck changes.
  const deckKey = `${mode}-${section}-${onlyVocab}-${filtered.length}`;

  return (
    <main className="mx-auto max-w-2xl px-5 py-8 sm:py-12">
      <header className="mb-6">
        <Link href={`/${course}`} className="text-sm font-semibold text-indigo hover:underline">
          ← Tất cả bài
        </Link>
        <div className="mt-3 flex items-end justify-between">
          <h1 className="font-jp text-3xl font-bold text-ink">
            Bài {lesson}
            <span className="ml-3 text-base font-normal text-sub">
              {filtered.length} thẻ
            </span>
          </h1>
          <button
            onClick={() => {
              if (confirm("Xoá tiến độ đã lưu của bài này?")) {
                resetLesson(cards.map((c) => c.id));
                location.reload();
              }
            }}
            className="text-xs text-sub hover:text-shu"
          >
            Đặt lại tiến độ
          </button>
        </div>
      </header>

      {/* Mode tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              mode === m.id
                ? "bg-ink text-white"
                : "bg-card text-sub hover:bg-indigo-soft hover:text-indigo"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-7 flex flex-wrap items-center gap-2 text-sm">
        <button
          onClick={() => setSection("all")}
          className={`rounded-lg border px-3 py-1.5 transition ${
            section === "all" ? "border-indigo bg-indigo-soft text-indigo" : "border-line text-sub"
          }`}
        >
          Tất cả phần
        </button>
        {sections.map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`rounded-lg border px-3 py-1.5 transition ${
              section === s ? "border-indigo bg-indigo-soft text-indigo" : "border-line text-sub"
            }`}
          >
            Phần {s}
          </button>
        ))}
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sub">
          <input
            type="checkbox"
            checked={onlyVocab}
            onChange={(e) => setOnlyVocab(e.target.checked)}
            className="h-4 w-4 accent-indigo"
          />
          Chỉ từ vựng
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-line bg-card p-8 text-center text-sub">
          Không có thẻ nào khớp bộ lọc.
        </p>
      ) : (
        <div key={deckKey}>
          {mode === "flashcard" && <FlashcardMode cards={filtered} />}
          {mode === "quiz" && <QuizMode cards={filtered} />}
          {mode === "match" && <MatchMode cards={filtered} />}
          {mode === "typing" && <TypingMode cards={filtered} />}
        </div>
      )}
    </main>
  );
}
