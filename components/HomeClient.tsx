"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Card } from "@/lib/types";
import {
  getStreakInfo, getTodayCount, getDueCards, loadLastStudied,
} from "@/lib/storage";

interface Props {
  allCards: Card[];
}

export default function HomeClient({ allCards }: Props) {
  const [streak, setStreak] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [lastStudied, setLastStudied] = useState<{ course: string; lesson: number; section: string } | null>(null);

  useEffect(() => {
    const { streak } = getStreakInfo();
    setStreak(streak);
    setTodayCount(getTodayCount());
    setDueCount(getDueCards(allCards).length);
    setLastStudied(loadLastStudied());
  }, [allCards]);

  return (
    <div className="mb-8 flex flex-wrap items-center gap-3">
      {/* Streak */}
      <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2.5 shadow-card">
        <span className="text-lg">🔥</span>
        <div>
          <p className="text-xs text-sub">Streak</p>
          <p className="text-sm font-bold text-shu">{streak} ngày</p>
        </div>
      </div>

      {/* Today */}
      <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2.5 shadow-card">
        <span className="text-lg">📚</span>
        <div>
          <p className="text-xs text-sub">Hôm nay</p>
          <p className="text-sm font-bold text-indigo">{todayCount} thẻ</p>
        </div>
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
  );
}
