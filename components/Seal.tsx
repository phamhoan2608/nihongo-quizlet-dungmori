"use client";

// Hanko-style circular seal shown when an answer is correct.
export default function Seal({ label = "正" }: { label?: string }) {
  return (
    <span className="seal pointer-events-none inline-flex h-14 w-14 animate-stamp items-center justify-center rounded-full border-[3px] border-shu text-2xl font-bold text-shu">
      {label}
    </span>
  );
}
