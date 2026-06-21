import type { Card, CardProgress, Grade, GradeSource } from "./types";
import { shuffle } from "./shuffle";

const KEY = "minna-srs-v1";
const IMPORTANT_KEY = "minna-important-v1";

type Store = Record<number, CardProgress>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function write(s: Store): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

const DAY = 86_400_000;

// Box caps per source:
//   flashcard  → max box 2 ("Đang ôn") — recognition only, not real recall
//   exercise   → max box 4 ("Thuộc")   — requires active recall
//   markMastered() → box 5 ("Thành thạo") — explicit user confirmation only
const BOX_CAP: Record<GradeSource, number> = {
  flashcard: 2,
  exercise: 4,
};

function fresh(): CardProgress {
  return {
    box: 0,
    ease: 2.5,
    interval: 0,
    due: 0,
    reps: 0,
    correct: 0,
    wrong: 0,
    lastSeen: 0,
  };
}

/**
 * Decay the box when the card is overdue.
 * Uses a log₂ curve: each doubling of (overdueDays / interval) costs one box.
 *   ratio 0–1  → decay 0
 *   ratio 1–3  → decay 1
 *   ratio 3–7  → decay 2
 *   ratio 7–15 → decay 3  … and so on.
 */
export function effectiveBox(p: CardProgress): number {
  if (p.reps === 0 || p.box <= 0 || p.interval <= 0) return p.box;
  const now = Date.now();
  if (now <= p.due) return p.box;
  const overdueRatio = (now - p.due) / (p.interval * DAY);
  const decay = Math.floor(Math.log2(overdueRatio + 1));
  return Math.max(0, p.box - decay);
}

/**
 * Named memory levels matching the 6 Leitner boxes (0–5).
 * Box 0–2 reachable via flashcard. Box 3–4 via exercises. Box 5 via explicit confirmation.
 */
export const MEMORY_LEVELS = [
  { label: "Mới",         cls: "bg-line text-sub"           },
  { label: "Nhìn quen",  cls: "bg-shu-soft text-shu"       },
  { label: "Đang ôn",    cls: "bg-indigo-soft text-indigo" },
  { label: "Nhớ khá",   cls: "bg-indigo text-white"       },
  { label: "Thuộc",     cls: "bg-moss/10 text-moss"       },
  { label: "Thành thạo", cls: "bg-moss text-white"         },
] as const;

export type MemoryLevelInfo = (typeof MEMORY_LEVELS)[number];

export function getMemoryLevel(p: CardProgress): MemoryLevelInfo {
  if (p.reps === 0) return MEMORY_LEVELS[0];
  const box = effectiveBox(p);
  return MEMORY_LEVELS[Math.min(box, MEMORY_LEVELS.length - 1)];
}

export function getProgress(id: number): CardProgress {
  return read()[id] ?? fresh();
}

export function getAllProgress(): Store {
  return read();
}

/**
 * Grade a card after a study session.
 * source="flashcard" caps box at 2 (recognition only).
 * source="exercise"  caps box at 4 (active recall).
 * Box 5 is only reachable via markMastered().
 */
export function grade(id: number, g: Grade, source: GradeSource = "exercise"): CardProgress {
  const store = read();
  const p = store[id] ?? fresh();
  const now = Date.now();
  p.reps++;
  p.lastSeen = now;

  // Apply decay so a long absence takes effect immediately.
  p.box = effectiveBox(p);

  const cap = BOX_CAP[source];

  if (g === "again") {
    p.wrong++;
    p.box = Math.max(0, p.box - 1);
    p.ease = Math.max(1.3, p.ease - 0.2);
    p.interval = 0;
  } else {
    p.correct++;
    p.box = Math.min(cap, p.box + (g === "easy" ? 2 : 1));
    if (g === "hard") p.ease = Math.max(1.3, p.ease - 0.15);
    if (g === "easy") p.ease += 0.15;
    if (p.interval === 0) p.interval = g === "easy" ? 3 : 1;
    else p.interval = Math.round(p.interval * p.ease * (g === "hard" ? 0.6 : 1));
  }
  p.due = now + p.interval * DAY;
  store[id] = p;
  write(store);
  return p;
}

/** User explicitly confirms they have mastered this word — sets box to 5. */
export function markMastered(id: number): CardProgress {
  const store = read();
  const p = store[id] ?? fresh();
  const now = Date.now();
  p.box = 5;
  p.ease = Math.max(p.ease, 2.5);
  p.interval = 60; // review again in ~2 months
  p.due = now + p.interval * DAY;
  p.lastSeen = now;
  if (p.reps === 0) { p.reps = 1; p.correct = 1; }
  store[id] = p;
  write(store);
  return p;
}

export function resetLesson(ids: number[]): void {
  const store = read();
  for (const id of ids) delete store[id];
  write(store);
}

export interface LessonStats {
  seen: number;
  mastered: number; // effectiveBox >= 4 (Thuộc or Thành thạo)
}

export function lessonStats(ids: number[]): LessonStats {
  const store = read();
  let seen = 0;
  let mastered = 0;
  for (const id of ids) {
    const p = store[id];
    if (p && p.reps > 0) seen++;
    if (p && effectiveBox(p) >= 4) mastered++;
  }
  return { seen, mastered };
}

// ── Session position (restore card on reload) ─────────────────────────────

const SP = "minna-session";

export function saveSessionMode(key: string, mode: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${SP}:${key}:mode`, mode);
}

export function loadSessionMode(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`${SP}:${key}:mode`);
}

export function saveSessionCardId(key: string, mode: string, cardId: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${SP}:${key}:${mode}:pos`, String(cardId));
}

export function loadSessionCardId(key: string, mode: string): number | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(`${SP}:${key}:${mode}:pos`);
  return v !== null ? Number(v) : null;
}

export function saveSessionDeck(key: string, mode: string, ids: number[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${SP}:${key}:${mode}:deck`, JSON.stringify(ids));
}

export function loadSessionDeck(key: string, mode: string): number[] | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(`${SP}:${key}:${mode}:deck`);
    return v ? (JSON.parse(v) as number[]) : null;
  } catch { return null; }
}

export function saveSessionSection(key: string, section: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${SP}:${key}:section`, section);
}

export function loadSessionSection(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`${SP}:${key}:section`);
}

export function clearSessionPos(key: string): void {
  if (typeof window === "undefined") return;
  const prefix = `${SP}:${key}:`;
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith(prefix)) localStorage.removeItem(k);
  }
}

// ── Auto-play setting ─────────────────────────────────────────────────────

const AUTOPLAY_KEY = "minna-autoplay-v1";

export function getAutoPlay(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(AUTOPLAY_KEY);
  return v === null ? true : v === "true"; // default: on
}

export function setAutoPlay(v: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTOPLAY_KEY, String(v));
}

// ── Important words ────────────────────────────────────────────────────────

function readImportant(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(IMPORTANT_KEY) || "[]") as number[]);
  } catch {
    return new Set();
  }
}

function writeImportant(s: Set<number>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(IMPORTANT_KEY, JSON.stringify([...s]));
}

export function isImportant(id: number): boolean {
  return readImportant().has(id);
}

/** Toggle the important flag. Returns the new state (true = important). */
export function toggleImportant(id: number): boolean {
  const s = readImportant();
  if (s.has(id)) s.delete(id); else s.add(id);
  writeImportant(s);
  return s.has(id);
}

export function getAllImportant(): Set<number> {
  return readImportant();
}

// ── Priority sort ──────────────────────────────────────────────────────────

/**
 * Return cards sorted for study: unseen first, then by effective box ascending,
 * mastered last. Important cards get priority within each group.
 * Within each priority bucket the order is shuffled for variety.
 */
export function prioritizeCards(cards: Card[]): Card[] {
  const store = read();
  const important = readImportant();

  // priority score: lower = study first
  // boxGroup: 0=unseen, 1=box1-2, 2=box3-4, 3=mastered(5)
  // impOffset: 0=important, 1=regular
  const score = (card: Card): number => {
    const p = store[card.id];
    const box = p && p.reps > 0 ? effectiveBox(p) : -1;
    const boxGroup = box < 0 ? 0 : box <= 2 ? 1 : box <= 4 ? 2 : 3;
    const impOffset = important.has(card.id) ? 0 : 1;
    return boxGroup * 2 + impOffset;
  };

  const buckets = new Map<number, Card[]>();
  for (const card of cards) {
    const s = score(card);
    if (!buckets.has(s)) buckets.set(s, []);
    buckets.get(s)!.push(card);
  }

  const result: Card[] = [];
  for (const [, group] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
    result.push(...shuffle(group));
  }
  return result;
}
