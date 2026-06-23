"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HomeButton() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-10 items-center border-b border-line bg-card/90 px-4 backdrop-blur-sm">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm font-semibold text-sub transition hover:text-indigo"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        Trang chủ
      </Link>
    </header>
  );
}
