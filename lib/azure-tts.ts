/**
 * Wrapper cho Microsoft Azure AI Speech (Cognitive Services) Neural TTS —
 * CHỈ chạy phía server (route handler) — key không bao giờ lộ ra trình duyệt.
 *
 * Setup (xem thêm README trong app/api/tts/route.ts):
 * 1. Azure Portal -> Create a resource -> "Speech" -> Create resource của
 *    riêng PTE-Life (KHÔNG dùng lại key của site khác).
 * 2. Resource -> "Keys and Endpoint" -> copy KEY + REGION vào .env:
 *      AZURE_SPEECH_KEY=...
 *      AZURE_SPEECH_REGION=...
 */

export interface TtsVoice {
  name: string;
  accent: string;
  gender: "female" | "male";
}

// Xoay vòng giọng theo accent, mô phỏng cách đề thi PTE Academic thật đổi
// giọng đọc giữa các câu (US/UK/Australia/Canada/New Zealand).
export const PTE_VOICE_POOL: TtsVoice[] = [
  { name: "en-US-JennyNeural", accent: "US", gender: "female" },
  { name: "en-US-GuyNeural", accent: "US", gender: "male" },
  { name: "en-GB-SoniaNeural", accent: "UK", gender: "female" },
  { name: "en-GB-RyanNeural", accent: "UK", gender: "male" },
  { name: "en-AU-NatashaNeural", accent: "Australia", gender: "female" },
  { name: "en-AU-WilliamNeural", accent: "Australia", gender: "male" },
  { name: "en-CA-ClaraNeural", accent: "Canada", gender: "female" },
  { name: "en-CA-LiamNeural", accent: "Canada", gender: "male" },
  { name: "en-NZ-MollyNeural", accent: "New Zealand", gender: "female" },
  { name: "en-NZ-MitchellNeural", accent: "New Zealand", gender: "male" },
];

const VOICE_NAME_SET = new Set(PTE_VOICE_POOL.map((v) => v.name));

export function isKnownVoice(name: string): boolean {
  return VOICE_NAME_SET.has(name);
}

export function pickRandomVoice(): TtsVoice {
  return PTE_VOICE_POOL[Math.floor(Math.random() * PTE_VOICE_POOL.length)];
}

export function isAzureTtsConfigured(): boolean {
  return Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);
}

function escapeSSML(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Gọi Azure TTS, trả về audio (mp3) dạng ArrayBuffer. Chỉ gọi từ server. */
export async function synthesizeSpeech(text: string, voiceName: string): Promise<ArrayBuffer> {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) {
    throw new Error("AZURE_SPEECH_KEY / AZURE_SPEECH_REGION chưa được cấu hình trong .env");
  }

  const ssml = `<speak version='1.0' xml:lang='en-US'><voice name='${voiceName}'>${escapeSSML(text)}</voice></speak>`;
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-48khz-96kbitrate-mono-mp3",
    },
    body: ssml,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Azure TTS request failed (${response.status}): ${errText}`);
  }

  return response.arrayBuffer();
}
