// TTS chain:
//   1. VOICEVOX via /api/tts proxy — natural pitch accent, best quality
//   2. Google Translate TTS         — decent fallback, no key needed
//   3. Web Speech API               — browser built-in, last resort

const VOICEVOX_TIMEOUT_MS = 5000;

let jpVoice: SpeechSynthesisVoice | null = null;
let currentAudio: HTMLAudioElement | null = null;
let currentGen = 0;

function stopAll(): number {
  currentGen++;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  return currentGen;
}

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

function speakGoogleTTS(text: string, gen: number): void {
  if (gen !== currentGen) return;
  const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=ja&client=gtx&q=${encodeURIComponent(text)}`;
  const audio = new Audio(url);
  currentAudio = audio;
  audio.play().catch(() => speakWebSpeech(text));
}

// Calls our Next.js proxy (/api/tts) which forwards to VOICEVOX community API server-side,
// avoiding CORS issues in the browser.
function tryVoicevox(text: string, gen: number): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio(`/api/tts?text=${encodeURIComponent(text)}`);

    const fail = () => { audio.src = ""; resolve(false); };
    const tid = setTimeout(fail, VOICEVOX_TIMEOUT_MS);

    audio.oncanplaythrough = () => {
      clearTimeout(tid);
      if (gen !== currentGen) { audio.src = ""; resolve(true); return; }
      currentAudio = audio;
      audio.play().then(() => resolve(true)).catch(fail);
    };

    audio.onerror = () => { clearTimeout(tid); resolve(false); };
  });
}

export async function speak(text: string): Promise<void> {
  if (typeof window === "undefined") return;
  const clean = cleanText(text);
  if (!clean) return;

  const gen = stopAll();

  const ok = await tryVoicevox(clean, gen);
  if (!ok) speakGoogleTTS(clean, gen);
}

export function ttsSupported(): boolean {
  return typeof window !== "undefined" &&
    ("speechSynthesis" in window || typeof Audio !== "undefined");
}
