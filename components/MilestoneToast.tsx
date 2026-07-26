"use client";

import { useEffect, useState } from "react";

/**
 * Toast animation khi user đạt streak milestone (3/7/14/30/100/365/1000 ngày).
 * Listen event "minna-milestone" từ storage.recordStudyToday.
 * Tự đóng sau 5s hoặc user click.
 */
export default function MilestoneToast() {
  const [milestone, setMilestone] = useState<number | null>(null);

  useEffect(() => {
    const onHit = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === "number") setMilestone(detail);
    };
    window.addEventListener("minna-milestone", onHit);
    return () => window.removeEventListener("minna-milestone", onHit);
  }, []);

  useEffect(() => {
    if (milestone == null) return;
    const t = setTimeout(() => setMilestone(null), 5000);
    return () => clearTimeout(t);
  }, [milestone]);

  if (milestone == null) return null;

  const emoji =
    milestone >= 1000 ? "👑" :
    milestone >= 365  ? "🏆" :
    milestone >= 100  ? "💎" :
    milestone >= 30   ? "🌟" :
    milestone >= 14   ? "🎉" :
    milestone >= 7    ? "🔥" : "✨";

  const label =
    milestone === 3   ? "Khởi đầu tốt!" :
    milestone === 7   ? "Một tuần liên tiếp!" :
    milestone === 14  ? "Hai tuần đỉnh cao!" :
    milestone === 30  ? "Một tháng chăm chỉ!" :
    milestone === 100 ? "100 ngày huyền thoại!" :
    milestone === 365 ? "1 năm — không tưởng!" :
    milestone === 1000? "1000 ngày — bậc thầy!" :
                        `${milestone} ngày liên tiếp!`;

  return (
    <div
      onClick={() => setMilestone(null)}
      className="fixed inset-0 z-[100] flex cursor-pointer items-center justify-center bg-ink/40 backdrop-blur-sm"
    >
      <div className="relative animate-slide-up rounded-3xl border-2 border-shu bg-card px-10 py-8 text-center shadow-lift">
        <p className="text-8xl">{emoji}</p>
        <p className="mt-4 font-jp text-4xl font-bold text-shu">{milestone}</p>
        <p className="mt-1 text-sm font-semibold uppercase tracking-widest text-sub">NGÀY LIÊN TIẾP</p>
        <p className="mt-3 text-lg font-bold text-ink">{label}</p>
        <p className="mt-4 text-xs text-sub/60">Chạm để đóng</p>
      </div>
    </div>
  );
}
