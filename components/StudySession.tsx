"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Card, Mode } from "@/lib/types";
import {
  resetLesson, getAutoPlay, setAutoPlay,
  saveSessionMode, loadSessionMode,
  saveSessionSection, loadSessionSection,
  clearSessionPos, lessonStats,
  getOnlyVocab, setOnlyVocabPref,
  saveLastStudied,
} from "@/lib/storage";
import FlashcardMode from "./FlashcardMode";
import QuizMode from "./QuizMode";
import MatchMode from "./MatchMode";
import TypingMode from "./TypingMode";
import ListenMode from "./ListenMode";
import SpellMode from "./SpellMode";
import TestMode from "./TestMode";

interface ModeInfo {
  id: Mode;
  label: string;
  desc: string;
  iconBg: string;
  icon: React.ReactNode;
}

const MODES: ModeInfo[] = [
  {
    id: "flashcard",
    label: "Lật thẻ",
    desc: "Nhìn từ, lật thẻ xem nghĩa",
    iconBg: "bg-indigo-soft text-indigo",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <rect x="2" y="5" width="15" height="11" rx="2" />
        <rect x="7" y="9" width="15" height="11" rx="2" fill="currentColor" opacity="0.2" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "quiz",
    label: "Trắc nghiệm",
    desc: "Xem từ, chọn nghĩa đúng",
    iconBg: "bg-shu-soft text-shu",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <circle cx="5" cy="7" r="1.5" fill="currentColor" stroke="none" />
        <line x1="9" y1="7" x2="20" y2="7" />
        <circle cx="5" cy="13" r="1.5" fill="currentColor" stroke="none" />
        <line x1="9" y1="13" x2="20" y2="13" />
        <circle cx="5" cy="19" r="1.5" fill="currentColor" stroke="none" />
        <line x1="9" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
  {
    id: "match",
    label: "Nối cặp",
    desc: "Ghép từ Nhật với nghĩa tiếng Việt",
    iconBg: "bg-moss/10 text-moss",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <circle cx="6" cy="8" r="3" fill="currentColor" opacity="0.15" />
        <circle cx="6" cy="8" r="3" />
        <circle cx="18" cy="16" r="3" fill="currentColor" opacity="0.15" />
        <circle cx="18" cy="16" r="3" />
        <line x1="9" y1="9.5" x2="15" y2="14.5" />
      </svg>
    ),
  },
  {
    id: "typing",
    label: "Gõ đáp án",
    desc: "Xem từ, gõ nghĩa hoặc kana",
    iconBg: "bg-indigo-soft text-indigo",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01" />
        <path d="M8 14h8" />
      </svg>
    ),
  },
  {
    id: "listen",
    label: "Nghe",
    desc: "Nghe âm thanh, chọn nghĩa đúng",
    iconBg: "bg-shu-soft text-shu",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
        <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
    ),
  },
  {
    id: "spell",
    label: "Chính tả",
    desc: "Nghe âm thanh, gõ kana",
    iconBg: "bg-moss/10 text-moss",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </svg>
    ),
  },
  {
    id: "test",
    label: "Kiểm tra",
    desc: "Bài kiểm tra tổng hợp",
    iconBg: "bg-indigo-soft text-indigo",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
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

  const [mode, setMode] = useState<Mode | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [onlyVocab, setOnlyVocab] = useState(false);
  const [autoPlay, setAutoPlayState] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setAutoPlayState(getAutoPlay());
    setOnlyVocab(getOnlyVocab());
    const savedSection = loadSessionSection(sessionKey);
    if (savedSection) {
      setSection(savedSection);
      const savedMode = loadSessionMode(sessionKey) as Mode | null;
      if (savedMode && MODES.some((m) => m.id === savedMode)) setMode(savedMode);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pickMode = (m: Mode) => {
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
  const currentMode = MODES.find((m) => m.id === mode);

  // Close mode menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

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
                onClick={() => { setSection(id); saveSessionSection(sessionKey, id); saveLastStudied({ course, lesson, section: id }); }}
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

  // ── Mode picker ───────────────────────────────────────────────────────────
  if (!mode) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-10">
        <button
          onClick={() => { setSection(null); saveSessionSection(sessionKey, ""); }}
          className="mb-8 flex items-center gap-2 text-sm font-semibold text-indigo hover:underline"
        >
          <span>←</span> Bài {lesson} · Phần {section}
        </button>

        <h1 className="font-jp text-3xl font-bold text-ink">Phần {section}</h1>
        <p className="mt-1 text-sm text-sub">Chọn chế độ học</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => pickMode(m.id)}
              className="group flex flex-col rounded-2xl border border-line bg-card p-5 text-left shadow-card transition hover:-translate-y-1 hover:border-indigo hover:shadow-lift"
            >
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${m.iconBg}`}>
                {m.icon}
              </div>
              <p className="font-semibold text-ink">{m.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-sub">{m.desc}</p>
            </button>
          ))}
        </div>
      </main>
    );
  }

  // ── Study interface ───────────────────────────────────────────────────────
  return (
    <main className="mx-auto flex h-dvh max-w-5xl flex-col px-4">

      {/* Header */}
      <div className="flex flex-none items-center justify-between gap-2 pt-3 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          {/* Back to section picker */}
          <button
            onClick={() => { setMode(null); setSection(null); saveSessionSection(sessionKey, ""); }}
            className="shrink-0 text-sm font-semibold text-indigo hover:underline"
          >
            ← Phần {section}
          </button>

          <span className="text-sub/40">·</span>

          {/* Mode dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition ${
                menuOpen
                  ? "border-indigo bg-indigo-soft text-indigo"
                  : "border-line bg-card text-ink hover:border-indigo hover:bg-indigo-soft hover:text-indigo"
              }`}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center [&_svg]:h-3.5 [&_svg]:w-3.5">
                {currentMode?.icon}
              </span>
              <span className="hidden sm:inline">{currentMode?.label}</span>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`shrink-0 transition-transform ${menuOpen ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute left-0 top-full z-50 mt-1.5 min-w-[200px] overflow-hidden rounded-2xl border border-line bg-card py-1.5 shadow-lift">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { pickMode(m.id); setMenuOpen(false); }}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition ${
                      mode === m.id
                        ? "bg-indigo-soft font-semibold text-indigo"
                        : "text-ink hover:bg-indigo-soft hover:text-indigo"
                    }`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center [&_svg]:h-4 [&_svg]:w-4">
                      {m.icon}
                    </span>
                    <span>{m.label}</span>
                    {mode === m.id && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto shrink-0">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="hidden truncate text-sm text-sub sm:inline">· {filtered.length} thẻ</span>
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
              onChange={(e) => { setOnlyVocab(e.target.checked); setOnlyVocabPref(e.target.checked); }}
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
            {mode === "spell"     && <SpellMode      cards={filtered} />}
            {mode === "test"      && <TestMode       cards={filtered} />}
          </div>
        )}
      </div>
    </main>
  );
}
