"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { onSyncStatus, type SyncStatus } from "@/lib/sync";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sync, setSync] = useState<SyncStatus>("idle");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => onSyncStatus(setSync), []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  if (status === "loading") {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-line" />;
  }

  if (!session?.user) {
    return (
      <button
        onClick={() => signIn("google")}
        title="Đăng nhập để đồng bộ tiến độ giữa các thiết bị"
        className="flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-indigo hover:text-indigo"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        <span className="hidden sm:inline">Đăng nhập</span>
      </button>
    );
  }

  const initials = (session.user.name ?? session.user.email ?? "?").charAt(0).toUpperCase();
  const syncDot =
    sync === "syncing" ? "bg-indigo animate-pulse" :
    sync === "error"   ? "bg-shu" :
    sync === "quota"   ? "bg-amber-500 animate-pulse" :
    sync === "done"    ? "bg-moss" :
                         "bg-line";
  const syncLabel =
    sync === "syncing" ? "Đang đồng bộ..." :
    sync === "error"   ? "Đồng bộ lỗi" :
    sync === "quota"   ? "⚠ Hết dung lượng KV" :
    sync === "done"    ? "Đã đồng bộ" : "Sẵn sàng";

  return (
    <>
      {sync === "quota" && (
        <div className="fixed left-1/2 top-16 z-[60] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 rounded-xl border border-amber-500 bg-amber-50 px-4 py-3 shadow-lift dark:bg-amber-950/40">
          <div className="flex items-start gap-2 text-sm">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-amber-900 dark:text-amber-200">Đã hết dung lượng Upstash Redis free tier</p>
              <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                500k requests/tháng hoặc 256MB storage đã hết. Tiến độ vẫn được lưu local nhưng không đồng bộ được lên cloud. Vào Upstash console để upgrade hoặc chờ sang tháng.
              </p>
            </div>
          </div>
        </div>
      )}

      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          title={session.user.email ?? ""}
          className="relative flex h-8 w-8 items-center justify-center rounded-full bg-indigo font-semibold text-white transition hover:bg-indigo-deep"
        >
          {session.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="" className="h-8 w-8 rounded-full" />
          ) : (
            initials
          )}
          <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${syncDot}`} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[220px] overflow-hidden rounded-2xl border border-line bg-card py-1.5 shadow-lift">
            <div className="border-b border-line px-4 py-2.5">
              <p className="truncate text-sm font-semibold text-ink">{session.user.name}</p>
              <p className="truncate text-xs text-sub">{session.user.email}</p>
              <p className={`mt-1 text-[10px] uppercase tracking-widest ${sync === "quota" ? "font-semibold text-amber-600" : "text-sub/60"}`}>
                {syncLabel}
              </p>
            </div>
            <button
              onClick={() => { setMenuOpen(false); signOut(); }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink transition hover:bg-shu-soft hover:text-shu"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </>
  );
}
