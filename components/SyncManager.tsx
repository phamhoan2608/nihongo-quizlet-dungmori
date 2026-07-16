"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { initialSync, scheduleUpload } from "@/lib/sync";

// Chạy 1 lần trong app, không render gì.
// - Khi user login → pull remote + merge local + push lên
// - Sau mỗi thay đổi localStorage (event "minna-local-updated") → debounced upload
export default function SyncManager() {
  const { status } = useSession();
  const initialDone = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") {
      initialDone.current = false;
      return;
    }
    if (initialDone.current) return;
    initialDone.current = true;
    // Chạy initial sync
    initialSync().catch(() => { /* silent, có UI status */ });
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const handler = () => scheduleUpload();
    window.addEventListener("minna-local-updated", handler);
    return () => window.removeEventListener("minna-local-updated", handler);
  }, [status]);

  return null;
}
