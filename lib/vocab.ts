import type { Card, Example } from "./types";
import n5raw from "@/data/n5.json";
import imagesRaw from "@/data/images.json";
import examplesRaw from "@/data/examples.json";

const IMAGES = imagesRaw as Record<string, string>;
const EXAMPLES = examplesRaw as Record<string, Example[]>;

// ── Data registry ─────────────────────────────────────────────────────────
// To add a new course: import its JSON here and add an entry below.
//
//   import n4raw from "@/data/n4.json";
//
const RAW: Record<string, object[]> = {
  n5: n5raw as object[],
  // n4: n4raw as object[],
};

// ── Types ─────────────────────────────────────────────────────────────────

export interface LessonInfo {
  course: string;
  lesson: number;
  total: number;
  vocab: number;
  expression: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function courseCards(course: string): Card[] {
  return (RAW[course] ?? []).map((c) => {
    const raw = c as { id: number };
    return {
      ...c,
      course,
      image: IMAGES[String(raw.id)],
      examples: EXAMPLES[String(raw.id)],
    } as Card;
  });
}

// ── Public API ────────────────────────────────────────────────────────────

export function getLessons(course: string): LessonInfo[] {
  const map = new Map<number, LessonInfo>();
  for (const c of courseCards(course)) {
    const e = map.get(c.lesson) ?? {
      course,
      lesson: c.lesson,
      total: 0,
      vocab: 0,
      expression: 0,
    };
    e.total++;
    if (c.type === "vocab") e.vocab++;
    else e.expression++;
    map.set(c.lesson, e);
  }
  return [...map.values()].sort((a, b) => a.lesson - b.lesson);
}

export function getCards(course: string, lesson: number): Card[] {
  return courseCards(course).filter((c) => c.lesson === lesson);
}

export function countCards(course: string): number {
  return (RAW[course] ?? []).length;
}

export function getAllCards(): Card[] {
  return Object.keys(RAW).flatMap((course) => courseCards(course));
}
