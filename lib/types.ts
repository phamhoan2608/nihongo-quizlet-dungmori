export type CardType = "vocab" | "expression";

export interface Card {
  id: number;
  course: string;   // "n5", "n4", etc. — injected by lib/vocab.ts, not stored in JSON
  lesson: number;
  section: string;
  type: CardType;
  word: string;
  reading: string;
  pos: string;
  meaning: string;
  note: string;
  image?: string;   // URL from data/images.json, merged at load time
}

export type Grade = "again" | "hard" | "good" | "easy";

/** flashcard = nhận diện mặt chữ (cap box 2). exercise = luyện tập thực sự (cap box 4). */
export type GradeSource = "flashcard" | "exercise";

export interface CardProgress {
  box: number; // Leitner box 0..5
  ease: number; // SM-2 ease factor
  interval: number; // days
  due: number; // epoch ms
  reps: number;
  correct: number;
  wrong: number;
  lastSeen: number;
}

export type Mode = "flashcard" | "quiz" | "match" | "typing" | "listen" | "spell" | "test";
