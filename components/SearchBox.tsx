"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Card } from "@/lib/types";
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
      <mark className="rounded bg-indigo/20 text-indigo px-0.5 not-italic font-semibold">
        {text.slice(idx, idx + query.trim().length)}
      </mark>
      {text.slice(idx + query.trim().length)}
    </>
  );
}

export default function SearchBox({ cards }: { cards: Card[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const dq = useDebounce(query, 200);
  const results: SearchResult[] = dq.trim().length > 0 ? searchCards(cards, dq) : [];

  // Reset active index when results change
  useEffect(() => { setActiveIdx(-1); }, [dq]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
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
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const courseLabel = (course: string) => course.toUpperCase();

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sub/50"
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder="Tìm từ vựng (tiếng Nhật, romaji, nghĩa tiếng Việt)…"
          className="w-full rounded-2xl border-2 border-line bg-card py-3.5 pl-11 pr-10 text-sm text-ink outline-none transition placeholder:text-sub/50 focus:border-indigo"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-sub/50 hover:text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-card shadow-lift">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-sub">
              Không tìm thấy kết quả cho &ldquo;{query}&rdquo;
            </p>
          ) : (
            <ul role="listbox">
              {results.map(({ card }, idx) => {
                const romaji = kanaToRomaji(cleanReading(card.reading || card.word));
                const isActive = idx === activeIdx;
                return (
                  <li key={card.id} role="option" aria-selected={isActive}>
                    <Link
                      href={`/${card.course}/${card.lesson}`}
                      onClick={() => { setOpen(false); setQuery(""); }}
                      className={`flex items-center gap-4 px-4 py-3 transition ${
                        isActive ? "bg-indigo-soft" : "hover:bg-paper"
                      }`}
                      onMouseEnter={() => setActiveIdx(idx)}
                    >
                      {/* Japanese */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-jp text-lg font-bold text-ink">
                            {highlight(card.reading || card.word, query)}
                          </span>
                          {card.reading !== card.word && (
                            <span className="font-jp text-sm text-sub/60">
                              {highlight(card.word, query)}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-sub/60">
                          <span>{highlight(romaji, query)}</span>
                          {card.pos && (
                            <>
                              <span>·</span>
                              <span>{card.pos}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Meaning */}
                      <span className="min-w-0 flex-1 truncate text-sm text-sub">
                        {highlight(card.meaning, query)}
                      </span>

                      {/* Badge */}
                      <span className="shrink-0 rounded-full bg-indigo-soft px-2 py-0.5 text-xs font-semibold text-indigo">
                        {courseLabel(card.course)} · Bài {card.lesson}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-line px-4 py-2 text-xs text-sub/40">
            {results.length > 0 && `${results.length} kết quả · `}↑↓ điều hướng · Enter mở · Esc đóng
          </div>
        </div>
      )}
    </div>
  );
}
