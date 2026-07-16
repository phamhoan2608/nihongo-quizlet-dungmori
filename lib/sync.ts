"use client";

import type { SyncPayload } from "./sync-types";
import { EMPTY_PAYLOAD } from "./sync-types";
import type { CardProgress } from "./types";

// Các localStorage key sync (khớp với storage.ts)
const K = {
  progress:    "minna-srs-v1",
  important:   "minna-important-v1",
  streak:      "minna-streak-v1",
  daily:       "minna-daily-v1",
  lastStudied: "minna-last-studied-v1",
  autoPlay:    "minna-autoplay-v1",
  onlyVocab:   "minna-only-vocab-v1",
  lastSync:    "minna-last-sync",  // Timestamp của lần sync cuối
};

// ── Đọc từ localStorage ra SyncPayload ───────────────────────────────────
function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function collectLocal(): SyncPayload {
  if (typeof window === "undefined") return EMPTY_PAYLOAD;
  const progress = safeParse<Record<number, CardProgress>>(localStorage.getItem(K.progress), {});
  const important = safeParse<number[]>(localStorage.getItem(K.important), []);
  const streak = safeParse<{streak: number; lastDate: string}>(
    localStorage.getItem(K.streak), { streak: 0, lastDate: "" });
  const daily = safeParse<Record<string, number>>(localStorage.getItem(K.daily), {});
  const lastStudied = safeParse<SyncPayload["lastStudied"]>(localStorage.getItem(K.lastStudied), null);
  const autoPlay = localStorage.getItem(K.autoPlay) === "true";
  const onlyVocab = localStorage.getItem(K.onlyVocab) === "true";
  return {
    version: 1,
    updatedAt: Number(localStorage.getItem(K.lastSync)) || 0,
    progress,
    important,
    streak,
    daily,
    lastStudied,
    prefs: { autoPlay, onlyVocab },
  };
}

// ── Ghi SyncPayload → localStorage ───────────────────────────────────────
export function applyRemote(remote: SyncPayload): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(K.progress, JSON.stringify(remote.progress ?? {}));
  localStorage.setItem(K.important, JSON.stringify(remote.important ?? []));
  localStorage.setItem(K.streak, JSON.stringify(remote.streak ?? { streak: 0, lastDate: "" }));
  localStorage.setItem(K.daily, JSON.stringify(remote.daily ?? {}));
  if (remote.lastStudied) localStorage.setItem(K.lastStudied, JSON.stringify(remote.lastStudied));
  else localStorage.removeItem(K.lastStudied);
  localStorage.setItem(K.autoPlay, String(remote.prefs?.autoPlay ?? false));
  localStorage.setItem(K.onlyVocab, String(remote.prefs?.onlyVocab ?? false));
  localStorage.setItem(K.lastSync, String(remote.updatedAt));
  // Bắn event để các component đang mount re-read localStorage
  window.dispatchEvent(new Event("minna-sync-applied"));
}

// ── Merge: local + remote → chọn cái mới hơn per-card ────────────────────
export function mergePayloads(a: SyncPayload, b: SyncPayload): SyncPayload {
  const progress: Record<number, CardProgress> = { ...a.progress };
  for (const [idStr, p] of Object.entries(b.progress ?? {})) {
    const id = Number(idStr);
    const existing = progress[id];
    // Chọn card có lastSeen mới hơn
    if (!existing || (p.lastSeen ?? 0) > (existing.lastSeen ?? 0)) progress[id] = p;
  }
  const daily: Record<string, number> = { ...a.daily };
  for (const [date, count] of Object.entries(b.daily ?? {})) {
    daily[date] = Math.max(daily[date] ?? 0, count);
  }
  const important = Array.from(new Set([...(a.important ?? []), ...(b.important ?? [])]));
  const streak = (a.streak.lastDate >= b.streak.lastDate) ? a.streak : b.streak;
  const lastStudied = (a.updatedAt >= b.updatedAt) ? a.lastStudied : b.lastStudied;
  const prefs = (a.updatedAt >= b.updatedAt) ? a.prefs : b.prefs;
  return {
    version: 1,
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
    progress, important, streak, daily, lastStudied, prefs,
  };
}

// ── API calls ────────────────────────────────────────────────────────────
export async function pullRemote(): Promise<SyncPayload | null> {
  const res = await fetch("/api/sync", { cache: "no-store" });
  if (!res.ok) return null;
  const j = await res.json();
  return (j.data as SyncPayload) ?? null;
}

export async function pushRemote(payload: SyncPayload): Promise<boolean> {
  const res = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

// ── Debounced auto-upload sau mỗi thay đổi localStorage ──────────────────
let uploadTimer: ReturnType<typeof setTimeout> | null = null;
let uploadInFlight = false;
type SyncStatus = "idle" | "syncing" | "error" | "done";
let statusListeners: Array<(s: SyncStatus) => void> = [];

export function onSyncStatus(cb: (s: SyncStatus) => void): () => void {
  statusListeners.push(cb);
  return () => { statusListeners = statusListeners.filter((f) => f !== cb); };
}
function emit(s: SyncStatus) { statusListeners.forEach((f) => f(s)); }

export function scheduleUpload(delayMs = 2000): void {
  if (uploadTimer) clearTimeout(uploadTimer);
  uploadTimer = setTimeout(async () => {
    if (uploadInFlight) { scheduleUpload(500); return; }
    uploadInFlight = true;
    emit("syncing");
    const payload = collectLocal();
    payload.updatedAt = Date.now();
    localStorage.setItem(K.lastSync, String(payload.updatedAt));
    const ok = await pushRemote(payload);
    emit(ok ? "done" : "error");
    uploadInFlight = false;
  }, delayMs);
}

/** Gọi khi user login lần đầu: pull remote + merge với local + push lại. */
export async function initialSync(): Promise<{ merged: boolean; error?: string }> {
  emit("syncing");
  try {
    const remote = await pullRemote();
    const local = collectLocal();
    const hasLocal = Object.keys(local.progress).length > 0;
    const hasRemote = remote && Object.keys(remote.progress ?? {}).length > 0;

    if (!hasRemote && !hasLocal) {
      emit("done");
      return { merged: false };
    }
    if (!hasRemote) {
      // Upload local lên
      local.updatedAt = Date.now();
      await pushRemote(local);
      localStorage.setItem(K.lastSync, String(local.updatedAt));
      emit("done");
      return { merged: false };
    }
    if (!hasLocal) {
      // Chỉ pull xuống
      applyRemote(remote!);
      emit("done");
      return { merged: false };
    }
    // Cả 2 đều có data → merge
    const merged = mergePayloads(local, remote!);
    merged.updatedAt = Date.now();
    applyRemote(merged);
    await pushRemote(merged);
    emit("done");
    return { merged: true };
  } catch (e) {
    emit("error");
    return { merged: false, error: (e as Error).message };
  }
}
