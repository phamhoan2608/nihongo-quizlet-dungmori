"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Card, Mode } from "@/lib/types";
import { resetLesson, getAutoPlay, setAutoPlay, saveSessionMode, loadSessionMode, saveSessionSection, loadSessionSection, clearSessionPos, lessonStats } from "@/lib/storage";
import FlashcardMode from "./FlashcardMode";
import QuizMode from "./QuizMode";
import MatchMode from "./MatchMode";
import TypingMode from "./TypingMode";
import ListenMode from "./ListenMode";

const MODES: { id: Mode; label: string }[] = [
  { id: "flashcard", label: "Lật thẻ" },
  { id: "quiz",      label: "Trắc nghiệm" },
  { id: "match",     label: "Nối cặp" },
  { id: "typing",    label: "Gõ đáp án" },
  { id: "listen",    label: "Nghe" },
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
  const sessionKey = `${course}-${lesson}`;

  const [mode, setMode] = useState<Mode>("flashcard");
  const [section, setSection] = useState<string | null>(null);
  const [onlyVocab, setOnlyVocab] = useState(false);
  const [autoPlay, setAutoPlayState] = useState(false);

  useEffect(() => {
    setAutoPlayState(getAutoPlay());
    const savedMode = loadSessionMode(sessionKey) as Mode | null;
    if (savedMode && MODES.some((m) => m.id === savedMode)) setMode(savedMode);
    const savedSection = loadSessionSection(sessionKey);
    if (savedSection) setSection(savedSection);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const switchMode = (m: Mode) => {
    setMode(m);
    saveSessionMode(sessionKey, m);
  };

  const toggleAutoPlay = () => {
    const next = !autoPlay;
    setAutoPlayState(next);
    setAutoPlay(next);
  };

  const sections = useMemo(
    () => [...new Set(cards.map((c) => c.section))].sort(),
    [cards]
  );

  const sectionTotals = useMemo(() =>
    sections.map((s) => ({ id: s, total: cards.filter((c) => c.section === s).length })),
    [sections, cards]
  );

  const [sectionStats, setSectionStats] = useState<Record<string, { seen: number; mastered: number }>>({});

  useEffect(() => {
    const stats: Record<string, { seen: number; mastered: number }> = {};
    sections.forEach((s) => {
      const ids = cards.filter((c) => c.section === s).map((c) => c.id);
      stats[s] = lessonStats(ids);
    });
    setSectionStats(stats);
  }, [sections, cards]);

  const filtered = useMemo(() => {
    if (!section) return [];
    let r = cards.filter((c) => c.section === section);
    if (onlyVocab) r = r.filter((c) => c.type === "vocab");
    return r;
  }, [cards, section, onlyVocab]);

  const deckKey = `${mode}-${section}-${onlyVocab}-${filtered.length}`;

  // ── Section picker ────────────────────────────────────────────────────────
  if (!section) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-10">
        <Link
          href={`/${course}`}
          className="mb-8 flex items-center gap-2 text-sm font-semibold text-indigo hover:underline"
        >
          <span>←</span> Danh sách bài
        </Link>

        <h1 className="font-jp text-3xl font-bold text-ink">Bài {lesson}</h1>
        <p className="mt-1 text-sm text-sub">Chọn phần để bắt đầu học</p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectionTotals.map(({ id, total }) => {
            const stats = sectionStats[id] ?? { seen: 0, mastered: 0 };
            const pct = total > 0 ? Math.round((stats.seen / total) * 100) : 0;
            return (
              <button
                key={id}
                onClick={() => { setSection(id); saveSessionSection(sessionKey, id); }}
                className="group flex flex-col rounded-2xl border border-line bg-card p-6 text-left shadow-card transition hover:-translate-y-1 hover:border-indigo hover:shadow-lift"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-sub">Phần</p>
                <p className="font-jp text-5xl font-bold text-ink">{id}</p>

                <p className="mt-3 text-sm text-sub">{total} thẻ</p>

                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-indigo transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-sub">
                  {stats.seen}/{total} đã học
                  {stats.mastered > 0 && (
                    <span className="ml-2 text-moss">· {stats.mastered} thuộc</span>
                  )}
                </p>

                <p className="mt-4 text-sm font-semibold text-indigo transition group-hover:underline">
                  Bắt đầu →
                </p>
              </button>
            );
          })}
        </div>
      </main>
    );
  }

  // ── Study interface ───────────────────────────────────────────────────────
  return (
    <main className="mx-auto flex h-dvh max-w-5xl flex-col px-4">

      {/* Header */}
      <div className="flex flex-none items-center justify-between gap-2 pt-3 pb-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <button
            onClick={() => { setSection(null); saveSessionSection(sessionKey, ""); }}
            className="text-sm font-semibold text-indigo hover:underline"
          >
            ← Bài {lesson}
          </button>
          <span className="font-jp text-lg font-bold text-ink">· Phần {section}</span>
          <span className="truncate text-sm font-normal text-sub">· {filtered.length} thẻ</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Auto-play */}
          <button
            onClick={toggleAutoPlay}
            title={autoPlay ? "Tắt tự động phát âm" : "Bật tự động phát âm"}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              autoPlay ? "border-indigo bg-indigo-soft text-indigo" : "border-line text-sub"
            }`}
          >
            {autoPlay ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            )}
            <span className="hidden sm:inline">Tự phát âm</span>
          </button>

          {/* Only vocab */}
          <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-sub">
            <input
              type="checkbox"
              checked={onlyVocab}
              onChange={(e) => setOnlyVocab(e.target.checked)}
              className="h-3.5 w-3.5 accent-indigo"
            />
            <span className="hidden sm:inline">Chỉ từ vựng</span>
          </label>

          <button
            onClick={() => {
              if (confirm("Xoá tiến độ đã lưu của bài này?")) {
                resetLesson(cards.map((c) => c.id));
                clearSessionPos(sessionKey);
                location.reload();
              }
            }}
            className="text-xs text-sub hover:text-shu"
          >
            Đặt lại
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex flex-none gap-1.5 pb-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => switchMode(m.id)}
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

      {/* Main content */}
      <div className="min-h-0 flex-1 overflow-y-auto pb-3">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-line bg-card p-8 text-center text-sub">
            Không có thẻ nào khớp bộ lọc.
          </p>
        ) : (
          <div key={deckKey}>
            {mode === "flashcard" && <FlashcardMode cards={filtered} autoPlay={autoPlay} sessionKey={sessionKey} />}
            {mode === "quiz"      && <QuizMode      cards={filtered} autoPlay={autoPlay} sessionKey={sessionKey} />}
            {mode === "match"     && <MatchMode      cards={filtered} />}
            {mode === "typing"    && <TypingMode     cards={filtered} autoPlay={autoPlay} sessionKey={sessionKey} />}
            {mode === "listen"    && <ListenMode     cards={filtered} sessionKey={sessionKey} />}
          </div>
        )}
      </div>
    </main>
  );
}
