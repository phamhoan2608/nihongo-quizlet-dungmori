import type { CardProgress } from "./types";

/** Cấu trúc dữ liệu đồng bộ giữa client (localStorage) và Vercel KV. */
export interface SyncPayload {
  version: 1;
  updatedAt: number;                          // Timestamp lần update cuối
  progress: Record<number, CardProgress>;     // SRS state per card
  important: number[];                        // Danh sách card ID đã đánh dấu quan trọng
  streak: {
    streak: number;
    lastDate: string;
    freezes: number;        // Streak freeze còn (0-2)
    milestones: number[];   // Các mốc đã hiện animation
  };
  daily: Record<string, number>;              // "YYYY-MM-DD" → số card học
  lastStudied: { course: string; lesson: number; section: string } | null;
  prefs: {
    autoPlay: boolean;
    onlyVocab: boolean;
    dailyGoal: number;      // Số thẻ tối thiểu/ngày để giữ streak
  };
}

export const EMPTY_PAYLOAD: SyncPayload = {
  version: 1,
  updatedAt: 0,
  progress: {},
  important: [],
  streak: { streak: 0, lastDate: "", freezes: 2, milestones: [] },
  daily: {},
  lastStudied: null,
  prefs: { autoPlay: false, onlyVocab: false, dailyGoal: 5 },
};
