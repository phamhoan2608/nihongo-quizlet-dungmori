import { NextRequest, NextResponse } from "next/server";

// Proxy Tatoeba search-sentences API, trả về 1-2 câu ví dụ (JP + EN).
// Fallback runtime khi cache data/examples.json chưa có từ đó.

interface TatoebaTranslation {
  text: string;
  lang: string;
}

interface TatoebaResult {
  text: string;
  translations?: TatoebaTranslation[][];
}

interface TatoebaResponse {
  results?: TatoebaResult[];
}

export async function GET(req: NextRequest) {
  const word = req.nextUrl.searchParams.get("word");
  if (!word) return NextResponse.json({ examples: [] }, { status: 400 });

  try {
    const url = `https://tatoeba.org/en/api_v0/search?query=${encodeURIComponent(word)}&from=jpn&to=eng&sort=relevance`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) return NextResponse.json({ examples: [] });

    const data = (await res.json()) as TatoebaResponse;
    const examples = (data.results ?? [])
      .slice(0, 3)
      .map((r) => {
        const allTranslations = (r.translations ?? []).flat();
        const en = allTranslations.find((t) => t.lang === "eng")?.text;
        return { jp: r.text, en };
      })
      .filter((e) => e.jp && e.en)
      .slice(0, 2);

    return NextResponse.json(
      { examples },
      { headers: { "Cache-Control": "public, max-age=86400" } }
    );
  } catch {
    return NextResponse.json({ examples: [] }, { status: 502 });
  }
}
