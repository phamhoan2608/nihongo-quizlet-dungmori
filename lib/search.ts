import type { Card } from "./types";
import { kanaToRomaji, cleanReading } from "./romaji";

export interface SearchResult {
  card: Card;
  score: number; // higher = more relevant
}

function norm(s: string): string {
  return s.toLowerCase().trim();
}

// Score a single card against the query. Returns 0 if no match.
function scoreCard(card: Card, q: string): number {
  if (!q) return 0;
  const query = norm(q);

  const word     = norm(card.word);
  const reading  = norm(card.reading || card.word);
  const meaning  = norm(card.meaning);
  const romaji   = norm(kanaToRomaji(cleanReading(card.reading || card.word)));

  // Exact match → highest priority
  if (word === query || reading === query || meaning === query || romaji === query) return 100;

  // Starts-with
  if (word.startsWith(query))    return 80;
  if (reading.startsWith(query)) return 75;
  if (romaji.startsWith(query))  return 70;
  if (meaning.startsWith(query)) return 65;

  // Contains
  if (word.includes(query))    return 40;
  if (reading.includes(query)) return 38;
  if (romaji.includes(query))  return 35;
  if (meaning.includes(query)) return 30;

  return 0;
}

/**
 * Search cards from one or more courses.
 * Returns up to `limit` results sorted by relevance.
 */
export function searchCards(
  cards: Card[],
  query: string,
  limit = 10
): SearchResult[] {
  const q = query.trim();
  if (q.length < 1) return [];

  const results: SearchResult[] = [];
  for (const card of cards) {
    const score = scoreCard(card, q);
    if (score > 0) results.push({ card, score });
  }

  return results
    .sort((a, b) => b.score - a.score || a.card.lesson - b.card.lesson)
    .slice(0, limit);
}
