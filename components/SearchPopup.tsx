"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getAllCards } from "@/lib/vocab";
import { searchCards, type SearchResult } from "@/lib/search";
import { kanaToRomaji, cleanReading } from "@/lib/romaji";

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-indigo/20 px-0.5 font-semibold not-italic text-indigo">
        {text.slice(idx, idx + query.trim().length)}
      </mark>
      {text.slice(idx + query.trim().length)}
    </>
  );
}

export default function SearchPopup() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const dq = useDebounce(query, 150);
  const cards = getAllCards();
  const results: SearchResult[] = dq.trim().length > 0 ? searchCards(cards, dq, 12) : [];

  useEffect(() => { setActiveIdx(-1); }, [dq]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      const card = results[activeIdx].card;
      window.location.href = `/${card.course}/${card.lesson}`;
      setOpen(false);
    }
  };

  return (
    <>
      {/* Floating search button — bottom-left, mirrors ThemeToggle */}
      <button
        onClick={() => setOpen(true)}
        title="Tìm kiếm từ vựng (⌘K)"
        style={{ position: "fixed", bottom: "1.25rem", left: "1.25rem", zIndex: 9999 }}
        className="flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-2 text-xs font-semibold text-sub shadow-card transition hover:border-indigo hover:text-indigo"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        Tìm kiếm
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col" onClick={() => setOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />

          {/* Panel — slides down from top */}
          <div
            className="relative mx-auto mt-16 w-full max-w-lg px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-lift">
              {/* Input */}
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <svg className="shrink-0 text-sub/50" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Tìm từ vựng (tiếng Nhật, romaji, nghĩa)…"
                  className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-sub/50"
                />
                {query ? (
                  <button onClick={() => setQuery("")} className="shrink-0 text-sub/50 hover:text-ink">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                ) : (
                  <kbd className="shrink-0 rounded bg-line px-1.5 py-0.5 text-xs text-sub/50">Esc</kbd>
                )}
              </div>

              {/* Results */}
              {dq.trim().length > 0 && (
                <div className="max-h-[60vh] overflow-y-auto">
                  {results.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-sub">
                      Không tìm thấy &ldquo;{dq}&rdquo;
                    </p>
                  ) : (
                    <>
                      <ul>
                        {results.map(({ card }, idx) => {
                          const romaji = kanaToRomaji(cleanReading(card.reading || card.word));
                          const isActive = idx === activeIdx;
                          return (
                            <li key={card.id}>
                              <Link
                                href={`/${card.course}/${card.lesson}`}
                                onClick={() => setOpen(false)}
                                onMouseEnter={() => setActiveIdx(idx)}
                                className={`flex items-center gap-3 px-4 py-3 transition ${isActive ? "bg-indigo-soft" : "hover:bg-paper"}`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-baseline gap-2">
                                    <span className="font-jp text-base font-bold text-ink">
                                      {highlight(card.reading || card.word, dq)}
                                    </span>
                                    {card.reading && card.reading !== card.word && (
                                      <span className="font-jp text-xs text-sub/60">
                                        {highlight(card.word, dq)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-sub/60">{highlight(romaji, dq)}</p>
                                </div>
                                <div className="min-w-0 flex-1 text-right">
                                  <p className="truncate text-sm text-sub">{highlight(card.meaning, dq)}</p>
                                  <p className="text-xs text-sub/40">{card.course.toUpperCase()} · Bài {card.lesson}</p>
                                </div>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="border-t border-line px-4 py-2 text-xs text-sub/40">
                        {results.length} kết quả · ↑↓ điều hướng · Enter mở bài
                      </div>
                    </>
                  )}
                </div>
              )}

              {dq.trim().length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-sub/40">
                  Gõ để tìm từ vựng trong toàn bộ {cards.length} thẻ
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
