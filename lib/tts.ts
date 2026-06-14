let jpVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (jpVoice) return jpVoice;
  const voices = window.speechSynthesis.getVoices();
  jpVoice =
    voices.find((v) => v.lang === "ja-JP") ??
    voices.find((v) => v.lang.startsWith("ja")) ??
    null;
  return jpVoice;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    jpVoice = null;
    pickVoice();
  };
}

export function speak(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const clean = text.replace(/[（(].*?[）)]/g, "").replace(/[～()]/g, "").trim();
  if (!clean) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = "ja-JP";
  u.rate = 0.9;
  const v = pickVoice();
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
