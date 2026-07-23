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
  notifyChange();
}

/** Bắn event để SyncManager pick up và schedule upload lên KV. */
function notifyChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("minna-local-updated"));
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
  incrementDailyCount();
  recordStudyToday();
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
  incrementDailyCount();
  recordStudyToday();
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

// ── Due cards (SRS review) ─────────────────────────────────────────────────

/** Return cards that are due for review (box > 0 and due <= now). */
export function getDueCards(cards: Card[]): Card[] {
  const store = read();
  const now = Date.now();
  return cards.filter((c) => {
    const p = store[c.id];
    return p && p.reps > 0 && effectiveBox(p) > 0 && p.due <= now;
  });
}

// ── Streak & daily count ───────────────────────────────────────────────────

const STREAK_KEY = "minna-streak-v1";
const DAILY_KEY  = "minna-daily-v1";

/** YYYY-MM-DD theo LOCAL timezone (không phải UTC — quan trọng cho VN UTC+7). */
function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayStr(): string {
  return dateStr(new Date());
}

export interface StreakInfo {
  streak: number;
  lastDate: string;
}

export function getStreakInfo(): StreakInfo {
  if (typeof window === "undefined") return { streak: 0, lastDate: "" };
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY) || "{}") as StreakInfo;
  } catch {
    return { streak: 0, lastDate: "" };
  }
}

/** Ghi nhận user học hôm nay (bất kỳ hoạt động nào: grade, mark mastered, viết bài...). */
export function recordStudyToday(): void {
  if (typeof window === "undefined") return;
  const today = todayStr();
  const data = getStreakInfo();
  if (data.lastDate === today) return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = dateStr(yesterday);
  const newStreak = data.lastDate === yStr ? data.streak + 1 : 1;
  localStorage.setItem(STREAK_KEY, JSON.stringify({ streak: newStreak, lastDate: today }));
  notifyChange();
}

/** Increment the count of cards studied today. */
export function incrementDailyCount(): void {
  if (typeof window === "undefined") return;
  try {
    const daily = JSON.parse(localStorage.getItem(DAILY_KEY) || "{}") as Record<string, number>;
    const today = todayStr();
    daily[today] = (daily[today] ?? 0) + 1;
    localStorage.setItem(DAILY_KEY, JSON.stringify(daily));
    notifyChange();
  } catch {}
}

/** Last 7 days of study counts for the activity chart. */
export function getWeeklyActivity(): Array<{ date: string; count: number }> {
  if (typeof window === "undefined") return [];
  try {
    const daily = JSON.parse(localStorage.getItem(DAILY_KEY) || "{}") as Record<string, number>;
    const result: Array<{ date: string; count: number }> = [];
    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      const date = dateStr(d);
      result.push({ date, count: daily[date] ?? 0 });
    }
    return result;
  } catch { return []; }
}

export function getTodayCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const daily = JSON.parse(localStorage.getItem(DAILY_KEY) || "{}") as Record<string, number>;
    return daily[todayStr()] ?? 0;
  } catch { return 0; }
}

// ── Last studied ───────────────────────────────────────────────────────────

const LAST_STUDIED_KEY = "minna-last-studied-v1";

export interface LastStudied {
  course: string;
  lesson: number;
  section: string;
}

export function saveLastStudied(info: LastStudied): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_STUDIED_KEY, JSON.stringify(info));
  notifyChange();
}

export function loadLastStudied(): LastStudied | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(LAST_STUDIED_KEY);
    return v ? (JSON.parse(v) as LastStudied) : null;
  } catch { return null; }
}

// ── Persistent onlyVocab filter ────────────────────────────────────────────

const ONLY_VOCAB_KEY = "minna-only-vocab-v1";

export function getOnlyVocab(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONLY_VOCAB_KEY) === "true";
}

export function setOnlyVocabPref(v: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONLY_VOCAB_KEY, String(v));
  notifyChange();
}

// ── Auto-play setting ─────────────────────────────────────────────────────

const AUTOPLAY_KEY = "minna-autoplay-v1";

export function getAutoPlay(): boolean {
  if (typeof window === "undefined") return false;
  const v = localStorage.getItem(AUTOPLAY_KEY);
  return v === null ? false : v === "true"; // default: off
}

export function setAutoPlay(v: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTOPLAY_KEY, String(v));
  notifyChange();
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
  notifyChange();
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
