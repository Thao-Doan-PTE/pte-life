"use client";

/**
 * Client helper để phát audio câu WFD — ưu tiên Azure Neural TTS (giọng thật,
 * xoay vòng accent) qua /api/tts; nếu backend chưa cấu hình Azure hoặc lỗi
 * mạng, fallback về giọng đọc máy của trình duyệt (Web Speech API) để tính
 * năng không bị gãy trong lúc chưa có Azure Speech resource.
 */

export interface TtsResult {
  url: string;
  voiceName: string;
}

export async function fetchAzureTts(text: string, voiceName?: string): Promise<TtsResult | null> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceName }),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    const pickedVoice = res.headers.get("X-Tts-Voice") ?? voiceName ?? "";
    return { url: URL.createObjectURL(blob), voiceName: pickedVoice };
  } catch {
    return null;
  }
}

export function isBrowserTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakWithBrowserTts(text: string, onEnd: () => void, rate = 0.95): void {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = rate;
  utterance.onend = onEnd;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
