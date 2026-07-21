"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Card, Mode } from "@/lib/types";
import { getDueCards, getAutoPlay, setAutoPlay, saveSessionMode, loadSessionMode } from "@/lib/storage";

import QuizMode from "./QuizMode";
import TypingMode from "./TypingMode";
import ListenMode from "./ListenMode";
import SpellMode from "./SpellMode";

interface ModeInfo {
  id: Mode;
  label: string;
  desc: string;
  iconBg: string;
  icon: React.ReactNode;
}

const REVIEW_MODES: ModeInfo[] = [
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
    desc: "Nghe âm thanh, chọn nghĩa",
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
];

const SESSION_KEY = "review";

export default function ReviewSession({ allCards }: { allCards: Card[] }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [autoPlay, setAutoPlayState] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dueCards, setDueCards] = useState<typeof allCards>([]);

  useEffect(() => {
    setDueCards(getDueCards(allCards));
    setAutoPlayState(getAutoPlay());
    const saved = loadSessionMode(SESSION_KEY) as Mode | null;
    if (saved && REVIEW_MODES.some((m) => m.id === saved)) setMode(saved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pickMode = (m: Mode) => {
    setMode(m);
    saveSessionMode(SESSION_KEY, m);
  };

  const toggleAutoPlay = () => {
    const next = !autoPlay;
    setAutoPlayState(next);
    setAutoPlay(next);
  };

  const currentMode = REVIEW_MODES.find((m) => m.id === mode);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  // ── Mode picker ───────────────────────────────────────────────────────────
  if (!mode) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 pb-10">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 text-sm font-semibold text-indigo hover:underline"
        >
          <span>←</span> Trang chủ
        </Link>

        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-shu">Ôn tập SRS</p>
          <h1 className="mt-1 font-jp text-3xl font-bold text-ink">
            Ôn tập hôm nay
          </h1>
          <p className="mt-1 text-sm text-sub">
            {dueCards.length} từ cần ôn · Chọn chế độ để bắt đầu
          </p>
        </div>

        {dueCards.length === 0 ? (
          <div className="rounded-2xl border border-line bg-card p-8 text-center">
            <p className="text-4xl">🎉</p>
            <p className="mt-3 font-semibold text-ink">Tất cả đã ôn rồi!</p>
            <p className="mt-1 text-sm text-sub">Không có từ nào đến hạn hôm nay.</p>
            <Link
              href="/"
              className="mt-5 inline-block rounded-full bg-indigo px-6 py-2.5 font-semibold text-white hover:bg-indigo-deep"
            >
              Về trang chủ
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {REVIEW_MODES.map((m) => (
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
        )}
      </main>
    );
  }

  // ── Study view ────────────────────────────────────────────────────────────
  return (
    <main className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-5xl flex-col px-4">
      <div className="flex flex-none items-center justify-between gap-2 pt-3 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={() => setMode(null)}
            className="shrink-0 text-sm font-semibold text-indigo hover:underline"
          >
            ← Ôn tập
          </button>

          <span className="text-sub/40">·</span>

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
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`shrink-0 transition-transform ${menuOpen ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute left-0 top-full z-50 mt-1.5 min-w-[200px] overflow-hidden rounded-2xl border border-line bg-card py-1.5 shadow-lift">
                {REVIEW_MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { pickMode(m.id); setMenuOpen(false); }}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition ${
                      mode === m.id ? "bg-indigo-soft font-semibold text-indigo" : "text-ink hover:bg-indigo-soft hover:text-indigo"
                    }`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center [&_svg]:h-4 [&_svg]:w-4">{m.icon}</span>
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

          <span className="hidden truncate text-sm text-sub sm:inline">· {dueCards.length} thẻ</span>
        </div>

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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-3">
        {dueCards.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-line bg-card p-10 text-center shadow-card">
            <p className="text-3xl">🎉</p>
            <p className="mt-3 font-semibold text-ink">Tất cả đã ôn rồi!</p>
            <Link href="/" className="mt-4 rounded-full bg-indigo px-6 py-2.5 font-semibold text-white hover:bg-indigo-deep">
              Về trang chủ
            </Link>
          </div>
        ) : (
          <div key={mode}>
            {mode === "quiz"   && <QuizMode   cards={dueCards} autoPlay={autoPlay} sessionKey={SESSION_KEY} distractorPool={allCards} />}
            {mode === "typing" && <TypingMode cards={dueCards} autoPlay={autoPlay} sessionKey={SESSION_KEY} />}
            {mode === "listen" && <ListenMode cards={dueCards} sessionKey={SESSION_KEY} distractorPool={allCards} />}
            {mode === "spell"  && <SpellMode  cards={dueCards} />}
          </div>
        )}
      </div>
    </main>
  );
}
