"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Card, Mode } from "@/lib/types";
import { resetLesson } from "@/lib/storage";
import FlashcardMode from "./FlashcardMode";
import QuizMode from "./QuizMode";
import MatchMode from "./MatchMode";
import TypingMode from "./TypingMode";
import WordList from "./WordList";

const MODES: { id: Mode; label: string }[] = [
  { id: "flashcard", label: "Lật thẻ" },
  { id: "quiz",      label: "Trắc nghiệm" },
  { id: "match",     label: "Nối cặp" },
  { id: "typing",    label: "Gõ đáp án" },
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
  const [showWordList, setShowWordList] = useState(false);

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

  const deckKey = `${mode}-${section}-${onlyVocab}-${filtered.length}`;

  return (
    <main className="mx-auto flex h-dvh max-w-5xl flex-col px-4">

      {/* ── Header row ── */}
      <div className="flex flex-none items-center justify-between gap-2 pt-3 pb-2">
        <Link
          href={`/${course}`}
          className="flex min-w-0 items-baseline gap-2 text-sm font-semibold text-indigo hover:underline"
        >
          <span>←</span>
          <span className="font-jp text-xl font-bold text-ink">Bài {lesson}</span>
          <span className="truncate font-normal text-sub">· {filtered.length} thẻ</span>
        </Link>
        <div className="flex shrink-0 items-center gap-3">
          {/* Word list toggle — visible on mobile only */}
          <button
            onClick={() => setShowWordList((v) => !v)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition lg:hidden ${
              showWordList
                ? "border-indigo bg-indigo-soft text-indigo"
                : "border-line text-sub"
            }`}
          >
            Danh sách từ
          </button>
          <button
            onClick={() => {
              if (confirm("Xoá tiến độ đã lưu của bài này?")) {
                resetLesson(cards.map((c) => c.id));
                location.reload();
              }
            }}
            className="text-xs text-sub hover:text-shu"
          >
            Đặt lại
          </button>
        </div>
      </div>

      {/* ── Mode tabs ── */}
      <div className="flex flex-none gap-1.5 pb-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              mode === m.id
                ? "bg-ink text-white"
                : "bg-card text-sub hover:bg-indigo-soft hover:text-indigo"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ── Section filters ── */}
      <div className="flex flex-none flex-wrap items-center gap-1.5 pb-2 text-xs">
        <button
          onClick={() => setSection("all")}
          className={`rounded-lg border px-2.5 py-1 transition ${
            section === "all"
              ? "border-indigo bg-indigo-soft text-indigo"
              : "border-line text-sub"
          }`}
        >
          Tất cả
        </button>
        {sections.map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`rounded-lg border px-2.5 py-1 transition ${
              section === s
                ? "border-indigo bg-indigo-soft text-indigo"
                : "border-line text-sub"
            }`}
          >
            Phần {s}
          </button>
        ))}
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-sub">
          <input
            type="checkbox"
            checked={onlyVocab}
            onChange={(e) => setOnlyVocab(e.target.checked)}
            className="h-3.5 w-3.5 accent-indigo"
          />
          Chỉ từ vựng
        </label>
      </div>

      {/* ── Main content: game + word list sidebar ── */}
      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">

        {/* Game area */}
        <div className="min-w-0 flex-1 overflow-y-auto pb-3 lg:pr-4">
          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-line bg-card p-8 text-center text-sub">
              Không có thẻ nào khớp bộ lọc.
            </p>
          ) : (
            <div key={deckKey}>
              {mode === "flashcard" && <FlashcardMode cards={filtered} />}
              {mode === "quiz"      && <QuizMode      cards={filtered} />}
              {mode === "match"     && <MatchMode      cards={filtered} />}
              {mode === "typing"    && <TypingMode     cards={filtered} />}
            </div>
          )}
        </div>

        {/* Word list — desktop sidebar (always visible), mobile drawer (toggle) */}
        <div
          className={`flex-col overflow-hidden border-l border-line bg-card lg:flex lg:w-60 xl:w-64 ${
            showWordList ? "flex w-full absolute inset-0 z-10 lg:relative lg:inset-auto" : "hidden"
          }`}
        >
          {/* Mobile close button */}
          <div className="flex flex-none items-center justify-between px-3 pt-2 lg:hidden">
            <span className="text-xs font-semibold uppercase tracking-widest text-sub">
              Danh sách từ
            </span>
            <button
              onClick={() => setShowWordList(false)}
              className="p-1 text-sub hover:text-ink"
            >
              ✕
            </button>
          </div>
          <WordList cards={filtered} />
        </div>
      </div>
    </main>
  );
}
