"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Card } from "@/lib/types";
import {
  getStreakInfo, getTodayCount, getDueCards, loadLastStudied,
  getDailyGoal, setDailyGoal, GOAL_OPTIONS, MAX_FREEZES,
} from "@/lib/storage";

interface Props {
  allCards: Card[];
}

export default function HomeClient({ allCards }: Props) {
  const [streak, setStreak] = useState(0);
  const [freezes, setFreezes] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [goal, setGoal] = useState(5);
  const [dueCount, setDueCount] = useState(0);
  const [lastStudied, setLastStudied] = useState<{ course: string; lesson: number; section: string } | null>(null);
  const [goalMenuOpen, setGoalMenuOpen] = useState(false);

  const refresh = () => {
    const s = getStreakInfo();
    setStreak(s.streak);
    setFreezes(s.freezes);
    setTodayCount(getTodayCount());
    setGoal(getDailyGoal());
    setDueCount(getDueCards(allCards).length);
    setLastStudied(loadLastStudied());
  };

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("minna-local-updated", onChange);
    window.addEventListener("minna-sync-applied", onChange);
    return () => {
      window.removeEventListener("minna-local-updated", onChange);
      window.removeEventListener("minna-sync-applied", onChange);
    };
  }, [allCards]); // eslint-disable-line react-hooks/exhaustive-deps

  const goalMet = todayCount >= goal;
  const progressPct = Math.min(100, Math.round((todayCount / Math.max(goal, 1)) * 100));

  return (
    <div className="mb-8 space-y-3">
      {/* Row chính: streak + hôm nay (có progress bar) + due + continue */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Streak card với freeze count */}
        <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2.5 shadow-card">
          <span className="text-lg">{streak > 0 ? "🔥" : "💤"}</span>
          <div>
            <p className="text-xs text-sub">Streak</p>
            <p className={`text-sm font-bold ${streak > 0 ? "text-shu" : "text-sub"}`}>{streak} ngày</p>
          </div>
          {MAX_FREEZES > 0 && (
            <div
              className="ml-1 flex items-center gap-0.5 border-l border-line pl-2"
              title={`Còn ${freezes}/${MAX_FREEZES} Streak Freeze — tự cứu chuỗi khi bỏ 1 ngày`}
            >
              {Array.from({ length: MAX_FREEZES }).map((_, i) => (
                <span key={i} className={`text-sm ${i < freezes ? "opacity-100" : "opacity-25"}`}>❄️</span>
              ))}
            </div>
          )}
        </div>

        {/* Today progress → goal */}
        <div className="relative rounded-xl border border-line bg-card px-4 py-2.5 shadow-card">
          <div className="flex items-center gap-2">
            <span className="text-lg">{goalMet ? "✅" : "📚"}</span>
            <div className="min-w-[110px]">
              <div className="flex items-center gap-2">
                <p className="text-xs text-sub">Hôm nay</p>
                <button
                  onClick={() => setGoalMenuOpen((v) => !v)}
                  className="text-[10px] text-sub/60 underline decoration-dotted hover:text-indigo"
                  title="Đổi mục tiêu ngày"
                >
                  đổi mục tiêu
                </button>
              </div>
              <p className={`text-sm font-bold ${goalMet ? "text-moss" : "text-indigo"}`}>
                {todayCount}/{goal} thẻ
              </p>
            </div>
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line">
            <div
              className={`h-full transition-all ${goalMet ? "bg-moss" : "bg-indigo"}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {goalMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[140px] overflow-hidden rounded-xl border border-line bg-card shadow-lift">
              <p className="border-b border-line px-3 py-1.5 text-[10px] uppercase tracking-widest text-sub">Mục tiêu/ngày</p>
              {GOAL_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => { setDailyGoal(n); setGoal(n); setGoalMenuOpen(false); }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-indigo-soft ${
                    goal === n ? "font-bold text-indigo" : "text-ink"
                  }`}
                >
                  <span>{n} thẻ</span>
                  {goal === n && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Due review */}
        {dueCount > 0 && (
          <Link
            href="/review"
            className="group flex items-center gap-2 rounded-xl border border-shu bg-shu-soft px-4 py-2.5 shadow-card transition hover:bg-shu"
          >
            <span className="text-lg">⏰</span>
            <div>
              <p className="text-xs font-semibold text-shu group-hover:text-white">Ôn tập hôm nay</p>
              <p className="text-sm font-bold text-shu group-hover:text-white">{dueCount} từ đến hạn</p>
            </div>
          </Link>
        )}

        {/* Continue studying */}
        {lastStudied && (
          <Link
            href={`/${lastStudied.course}/vocab/${lastStudied.lesson}`}
            className="group flex items-center gap-2 rounded-xl border border-indigo bg-indigo-soft px-4 py-2.5 shadow-card transition hover:bg-indigo"
          >
            <span className="text-lg">▶</span>
            <div>
              <p className="text-xs font-semibold text-indigo group-hover:text-white">Tiếp tục</p>
              <p className="text-sm font-bold text-indigo group-hover:text-white">
                Bài {lastStudied.lesson} · Phần {lastStudied.section}
              </p>
            </div>
          </Link>
        )}

        {/* Stats link */}
        <Link
          href="/stats"
          className="flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2.5 shadow-card transition hover:border-indigo hover:text-indigo"
        >
          <span className="text-lg">📊</span>
          <div>
            <p className="text-xs text-sub">Thống kê</p>
            <p className="text-sm font-bold text-ink">Chi tiết</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
