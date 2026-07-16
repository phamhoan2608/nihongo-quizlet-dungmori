import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { kv } from "@vercel/kv";
import { authOptions } from "@/lib/auth";
import type { SyncPayload } from "@/lib/sync-types";

// Key trong Vercel KV = user:{email}:data → JSON blob toàn bộ tiến độ.
// Đơn giản, atomic đọc/ghi. ~100KB max cho user học nhiều.

function userKey(email: string): string {
  return `user:${email.toLowerCase()}:data`;
}

async function getUserEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.email ?? null;
}

export async function GET() {
  const email = await getUserEmail();
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const data = await kv.get<SyncPayload>(userKey(email));
    return NextResponse.json({ data: data ?? null });
  } catch (err) {
    console.error("[sync GET]", err);
    return NextResponse.json({ error: "kv read failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const email = await getUserEmail();
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const body = (await req.json()) as SyncPayload;
    if (!body || typeof body !== "object" || body.version !== 1) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }
    // Overwrite - client là source of truth (đã merge trước khi POST)
    await kv.set(userKey(email), body);
    return NextResponse.json({ ok: true, updatedAt: body.updatedAt });
  } catch (err) {
    console.error("[sync POST]", err);
    return NextResponse.json({ error: "kv write failed" }, { status: 500 });
  }
}
