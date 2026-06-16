import { NextRequest, NextResponse } from "next/server";

// Proxy Google Translate TTS server-side.
// Uses the same URL parameters the translate.google.com website uses when you click the speaker icon:
//   total=1, idx=0, textlen=<n>, client=gtx, prev=input, ttsspeed=1
// These params trigger the newer neural TTS engine, which sounds better than client=tw-ob.

export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get("text");
  if (!text) return new NextResponse("missing text", { status: 400 });

  const url = new URL("https://translate.googleapis.com/translate_tts");
  url.searchParams.set("ie", "UTF-8");
  url.searchParams.set("q", text);
  url.searchParams.set("tl", "ja");
  url.searchParams.set("total", "1");
  url.searchParams.set("idx", "0");
  url.searchParams.set("textlen", String(text.length));
  url.searchParams.set("client", "gtx");
  url.searchParams.set("prev", "input");
  url.searchParams.set("ttsspeed", "1");

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://translate.google.com/",
        "Accept": "audio/mpeg,audio/*;q=0.9",
      },
    });

    if (!res.ok) return new NextResponse(null, { status: 502 });

    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
