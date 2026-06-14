// Primary: Google Translate TTS — natural Japanese voice, no API key needed.
// Fallback: Web Speech API (browser built-in) if Google TTS is blocked.

let jpVoice: SpeechSynthesisVoice | null = null;
let currentAudio: HTMLAudioElement | null = null;

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
  window.speechSynthesis.onvoiceschanged = () => { jpVoice = null; pickVoice(); };
}

function cleanText(text: string): string {
  return text
    .replace(/[（(].*?[）)]/g, "")
    .replace(/[～~()、。]/g, "")
    .trim();
}

function speakWebSpeech(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  u.rate = 0.85;
  const v = pickVoice();
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

export function speak(text: string): void {
  if (typeof window === "undefined") return;
  const clean = cleanText(text);
  if (!clean) return;

  // Stop any currently playing audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();

  // Google Translate TTS — significantly better quality than Web Speech API
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ja&client=tw-ob&q=${encodeURIComponent(clean)}`;
  const audio = new Audio(url);
  currentAudio = audio;
  audio.play().catch(() => {
    // Google TTS blocked or unavailable — fall back to browser voice
    speakWebSpeech(clean);
  });
}

export function ttsSupported(): boolean {
  return typeof window !== "undefined" &&
    ("speechSynthesis" in window || typeof Audio !== "undefined");
}
