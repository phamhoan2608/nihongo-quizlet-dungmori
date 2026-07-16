"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthButton from "./AuthButton";

const NAV = [
  { href: "/review", label: "Ôn tập" },
  { href: "/stats", label: "Thống kê" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-line bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-80">
          <span className="font-jp text-xl font-bold text-ink">みんな</span>
          <span className="rounded-md bg-shu-soft px-2 py-0.5 text-xs font-bold text-shu">N5</span>
        </Link>

        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                  pathname.startsWith(n.href)
                    ? "bg-indigo-soft text-indigo"
                    : "text-sub hover:bg-indigo-soft hover:text-indigo"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
