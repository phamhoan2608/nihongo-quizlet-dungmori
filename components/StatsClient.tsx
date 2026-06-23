"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllProgress, getWeeklyActivity, getStreakInfo, getTodayCount, MEMORY_LEVELS, effectiveBox } from "@/lib/storage";
import { getAllCards } from "@/lib/vocab";

interface Stats {
  total: number;
  seen: number;
  levels: number[];        // count per box 0..5
  totalCorrect: number;
  totalWrong: number;
  weekly: Array<{ date: string; count: number }>;
  streak: number;
  todayCount: number;
  weakCards: Array<{ word: string; reading: string; meaning: string; wrongRate: number; wrong: number; reps: number }>;
}

export default function StatsClient() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const allCards = getAllCards();
    const progress = getAllProgress();
    const weekly = getWeeklyActivity();
    const { streak } = getStreakInfo();
    const todayCount = getTodayCount();

    const levels = [0, 0, 0, 0, 0, 0];
    let seen = 0;
    let totalCorrect = 0;
    let totalWrong = 0;

    for (const card of allCards) {
      const p = progress[card.id];
      if (!p || p.reps === 0) { levels[0]++; continue; }
      seen++;
      totalCorrect += p.correct;
      totalWrong += p.wrong;
      levels[Math.min(effectiveBox(p), 5)]++;
    }

    // Weak cards: studied, wrong rate > 20%, sorted by wrong rate desc
    const weakCards = allCards
      .filter((c) => {
        const p = progress[c.id];
        return p && p.reps >= 3 && p.wrong > 0;
      })
      .map((c) => {
        const p = progress[c.id];
        return {
          word: c.word,
          reading: c.reading,
          meaning: c.meaning,
          wrong: p.wrong,
          reps: p.reps,
          wrongRate: p.wrong / p.reps,
        };
      })
      .sort((a, b) => b.wrongRate - a.wrongRate)
      .slice(0, 20);

    setStats({ total: allCards.length, seen, levels, totalCorrect, totalWrong, weekly, streak, todayCount, weakCards });
  }, []);

  if (!stats) return null;

  const accuracy = stats.totalCorrect + stats.totalWrong > 0
    ? Math.round((stats.totalCorrect / (stats.totalCorrect + stats.totalWrong)) * 100)
    : 0;

  const weekMax = Math.max(...stats.weekly.map((d) => d.count), 1);

  const dayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  return (
    <main className="mx-auto max-w-3xl px-5 pb-10">
      <Link href="/" className="mb-8 flex items-center gap-2 text-sm font-semibold text-indigo hover:underline">
        <span>←</span> Trang chủ
      </Link>

      <h1 className="mb-6 font-jp text-3xl font-bold text-ink">Thống kê học tập</h1>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-widest text-sub">Hôm nay</p>
          <p className="mt-1 text-3xl font-bold text-indigo">{stats.todayCount}</p>
          <p className="text-xs text-sub">thẻ</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-widest text-sub">Streak</p>
          <p className="mt-1 text-3xl font-bold text-shu">{stats.streak}</p>
          <p className="text-xs text-sub">ngày liên tục</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-widest text-sub">Đã học</p>
          <p className="mt-1 text-3xl font-bold text-moss">{stats.seen}</p>
          <p className="text-xs text-sub">/ {stats.total} thẻ</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-widest text-sub">Độ chính xác</p>
          <p className="mt-1 text-3xl font-bold text-ink">{accuracy}%</p>
          <p className="text-xs text-sub">{stats.totalCorrect}✓ {stats.totalWrong}✗</p>
        </div>
      </div>

      {/* Weekly activity chart */}
      <div className="mb-6 rounded-2xl border border-line bg-card p-6 shadow-card">
        <p className="mb-4 text-sm font-semibold text-ink">Hoạt động 7 ngày qua</p>
        <div className="flex items-end gap-2">
          {stats.weekly.map((day, idx) => {
            const heightPct = weekMax > 0 ? (day.count / weekMax) * 100 : 0;
            const d = new Date(day.date + "T00:00:00");
            const label = dayLabels[d.getDay()];
            const isToday = idx === 6;
            return (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs text-sub/60">{day.count > 0 ? day.count : ""}</span>
                <div className="w-full rounded-t-md bg-line" style={{ height: "64px", position: "relative" }}>
                  <div
                    className={`absolute bottom-0 w-full rounded-t-md transition-all ${isToday ? "bg-indigo" : "bg-indigo/50"}`}
                    style={{ height: `${Math.max(heightPct, day.count > 0 ? 8 : 0)}%` }}
                  />
                </div>
                <span className={`text-xs ${isToday ? "font-semibold text-indigo" : "text-sub"}`}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mastery breakdown */}
      <div className="mb-6 rounded-2xl border border-line bg-card p-6 shadow-card">
        <p className="mb-4 text-sm font-semibold text-ink">Phân bổ mức nhớ</p>
        <div className="space-y-2.5">
          {MEMORY_LEVELS.map((lvl, box) => {
            const count = stats.levels[box] ?? 0;
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={box} className="flex items-center gap-3">
                <span className={`w-24 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold ${lvl.cls}`}>
                  {lvl.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-indigo transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm text-sub">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weak cards */}
      {stats.weakCards.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-6 shadow-card">
          <p className="mb-4 text-sm font-semibold text-ink">Từ cần ôn thêm</p>
          <div className="space-y-2">
            {stats.weakCards.map((c, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-line px-4 py-2.5">
                <div className="min-w-0">
                  <span className="font-jp font-semibold text-ink">{c.reading || c.word}</span>
                  {c.reading !== c.word && (
                    <span className="ml-2 font-jp text-sm text-sub/60">{c.word}</span>
                  )}
                  <span className="ml-2 text-sm text-sub">{c.meaning}</span>
                </div>
                <span className="ml-3 shrink-0 rounded-full bg-shu-soft px-2 py-0.5 text-xs font-semibold text-shu">
                  {Math.round(c.wrongRate * 100)}% sai
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
