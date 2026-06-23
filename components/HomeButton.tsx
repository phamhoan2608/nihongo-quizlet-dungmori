"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HomeButton() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <Link
      href="/"
      title="Về trang chủ"
      aria-label="Về trang chủ"
      style={{ position: "fixed", bottom: "1.25rem", left: "1.25rem", zIndex: 9999 }}
      className="flex items-center justify-center rounded-full border border-line bg-card p-2.5 shadow-card transition hover:border-indigo hover:text-indigo text-sub"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    </Link>
  );
}
