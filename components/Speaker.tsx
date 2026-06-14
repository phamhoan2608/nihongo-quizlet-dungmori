"use client";

import { speak } from "@/lib/tts";

export default function Speaker({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label="Phát âm"
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sub transition hover:bg-indigo-soft hover:text-indigo ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H2v6h4l5 4z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.5 5.5a9 9 0 0 1 0 13" />
      </svg>
    </button>
  );
}
