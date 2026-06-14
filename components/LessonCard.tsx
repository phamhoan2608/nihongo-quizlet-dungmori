"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LessonInfo } from "@/lib/vocab";
import { getCards } from "@/lib/vocab";
import { lessonStats } from "@/lib/storage";

export default function LessonCard({ info }: { info: LessonInfo }) {
  const [pct, setPct] = useState(0);
  const [seen, setSeen] = useState(0);

  useEffect(() => {
    const ids = getCards(info.course, info.lesson).map((c) => c.id);
    const s = lessonStats(ids);
    setSeen(s.seen);
    setPct(info.total ? Math.round((s.mastered / info.total) * 100) : 0);
  }, [info.course, info.lesson, info.total]);

  return (
    <Link
      href={`/${info.course}/${info.lesson}`}
      className="group relative flex flex-col rounded-2xl border border-line bg-card p-5 shadow-card transition hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-sub">
            Bài
          </p>
          <p className="font-jp text-4xl font-bold leading-none text-ink">
            {info.lesson}
          </p>
        </div>
        <span className="rounded-full bg-indigo-soft px-2.5 py-1 text-xs font-semibold text-indigo">
          {info.total} thẻ
        </span>
      </div>

      <p className="mt-4 text-sm text-sub">
        {info.vocab} từ vựng · {info.expression} mẫu câu
      </p>

      <div className="mt-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-indigo transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-sub">
          {pct}% thuộc · đã học {seen}/{info.total}
        </p>
      </div>
    </Link>
  );
}
