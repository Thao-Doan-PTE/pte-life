import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  isAzureTtsConfigured,
  isKnownVoice,
  pickRandomVoice,
  synthesizeSpeech,
} from "@/lib/azure-tts";

const MAX_TEXT_LENGTH = 400;

// Cache theo (voice::text) trong bộ nhớ server — các câu trong đề tủ WFD là
// cố định và được nhiều học viên nghe lại nhiều lần, nên cache giúp giảm
// đáng kể số ký tự tính phí/quota Azure.
const audioCache = new Map<string, ArrayBuffer>();

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAzureTtsConfigured()) {
    return NextResponse.json(
      { error: "Azure TTS chưa được cấu hình (AZURE_SPEECH_KEY / AZURE_SPEECH_REGION)." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const requestedVoice = typeof body?.voiceName === "string" ? body.voiceName : null;

  if (!text) {
    return NextResponse.json({ error: "Thiếu text." }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: "Text quá dài." }, { status: 400 });
  }
  if (requestedVoice && !isKnownVoice(requestedVoice)) {
    return NextResponse.json({ error: "voiceName không hợp lệ." }, { status: 400 });
  }

  const voiceName = requestedVoice ?? pickRandomVoice().name;
  const cacheKey = `${voiceName}::${text}`;

  try {
    let audio = audioCache.get(cacheKey);
    if (!audio) {
      audio = await synthesizeSpeech(text, voiceName);
      audioCache.set(cacheKey, audio);
    }

    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=86400",
        "X-Tts-Voice": voiceName,
      },
    });
  } catch (error) {
    console.error("Azure TTS error:", error);
    return NextResponse.json({ error: "Không thể tạo audio." }, { status: 502 });
  }
}
