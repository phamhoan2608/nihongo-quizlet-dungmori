// Parse câu tiếng Nhật có markup furigana kiểu "漢字[かんじ]" thành segments.
// Hỗ trợ cả markup <<...>> (target trong FillMode) và chuỗi thuần (không markup).

export interface FurSegment {
  text: string;
  reading?: string;
  isTarget?: boolean;
}

const RE_FULL = /<<([^>]+)>>|([一-龯々ヶ]+)\[([ぁ-んァ-ヶー]+)\]|([^\[\]<>]+)/g;

export function parseFurigana(jp: string): FurSegment[] {
  const segs: FurSegment[] = [];
  let m: RegExpExecArray | null;
  RE_FULL.lastIndex = 0;
  while ((m = RE_FULL.exec(jp)) !== null) {
    if (m[1] !== undefined) {
      const inner = m[1];
      const kr = inner.match(/^([一-龯々ヶ]+)\[([ぁ-んァ-ヶー]+)\]$/);
      if (kr) segs.push({ text: kr[1], reading: kr[2], isTarget: true });
      else segs.push({ text: inner, isTarget: true });
    } else if (m[2] !== undefined) {
      segs.push({ text: m[2], reading: m[3] });
    } else if (m[4] !== undefined) {
      segs.push({ text: m[4] });
    }
  }
  return segs;
}

/** Bỏ toàn bộ [reading] và <<>> để lấy câu thuần cho TTS. */
export function stripFurigana(jp: string): string {
  return jp.replace(/\[[ぁ-んァ-ヶー]+\]/g, "").replace(/<<|>>/g, "");
}
