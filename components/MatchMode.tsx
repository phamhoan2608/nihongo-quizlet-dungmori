"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Card } from "@/lib/types";
import { shuffle } from "@/lib/shuffle";
import { speak } from "@/lib/tts";
import { grade, prioritizeCards } from "@/lib/storage";

type Side = "word" | "meaning";
interface Tile {
  key: string;
  cardId: number;
  side: Side;
  text: string;
}

const ROUND = 6;

function buildTiles(cards: Card[]): Tile[] {
  const chosen = prioritizeCards(cards).slice(0, Math.min(ROUND, cards.length));
  const tiles: Tile[] = [];
  for (const c of chosen) {
    tiles.push({ key: `w${c.id}`, cardId: c.id, side: "word", text: c.reading || c.word });
    tiles.push({ key: `m${c.id}`, cardId: c.id, side: "meaning", text: c.meaning });
  }
  return shuffle(tiles);
}

export default function MatchMode({ cards }: { cards: Card[] }) {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [sel, setSel] = useState<Tile | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongKeys, setWrongKeys] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const startRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  const total = tiles.length / 2;
  const allMatched = matched.size === total && total > 0;

  useEffect(() => {
    setTiles(buildTiles(cards));
    setSel(null);
    setMatched(new Set());
    setMoves(0);
  }, [cards]);

  useEffect(() => {
    if (allMatched) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 250);
    return () => clearInterval(t);
  }, [allMatched]);

  const onTile = (tile: Tile) => {
    if (matched.has(tile.cardId)) return;
    if (tile.side === "word") speak(cards.find((c) => c.id === tile.cardId)?.reading || tile.text);
    if (!sel) {
      setSel(tile);
      return;
    }
    if (sel.key === tile.key) {
      setSel(null);
      return;
    }
    setMoves((m) => m + 1);
    if (sel.cardId === tile.cardId && sel.side !== tile.side) {
      setMatched((prev) => new Set(prev).add(tile.cardId));
      grade(tile.cardId, "good", "exercise");
      setSel(null);
    } else {
      const keys = [sel.key, tile.key];
      setWrongKeys(keys);
      setTimeout(() => setWrongKeys([]), 450);
      setSel(null);
    }
  };

  const newRound = () => {
    startRef.current = Date.now();
    setTiles(buildTiles(cards));
    setSel(null);
    setMatched(new Set());
    setMoves(0);
    setElapsed(0);
  };

  const accuracy = useMemo(
    () => (moves ? Math.round((total / moves) * 100) : 100),
    [moves, total]
  );

  if (tiles.length === 0) return null;

  if (allMatched) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-line bg-card p-10 text-center shadow-card">
        <p className="font-jp text-3xl font-bold text-ink">クリア！</p>
        <p className="mt-2 text-sub">
          {elapsed}s · {moves} lượt · chính xác {accuracy}%
        </p>
        <button
          onClick={newRound}
          className="mt-6 rounded-full bg-indigo px-6 py-2.5 font-semibold text-white transition hover:bg-indigo-deep"
        >
          Ván mới
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm text-sub">
        <span>Đã nối {matched.size}/{total}</span>
        <span>{elapsed}s · Chạm từ tiếng Nhật rồi chạm nghĩa</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map((tile) => {
          const isMatched = matched.has(tile.cardId);
          const isSel = sel?.key === tile.key;
          const isWrong = wrongKeys.includes(tile.key);
          let cls =
            "border-line bg-card hover:border-indigo text-ink cursor-pointer";
          if (isMatched) cls = "border-moss/30 bg-moss/5 text-moss/40 cursor-default";
          else if (isWrong) cls = "border-shu bg-shu-soft text-shu";
          else if (isSel) cls = "border-indigo bg-indigo-soft text-indigo";
          return (
            <button
              key={tile.key}
              onClick={() => onTile(tile)}
              disabled={isMatched}
              className={`flex min-h-[4rem] items-center justify-center rounded-2xl border-2 p-2 text-center text-sm font-medium transition ${cls} ${
                tile.side === "word" ? "font-jp text-lg" : ""
              }`}
            >
              {isMatched ? "✓" : tile.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
