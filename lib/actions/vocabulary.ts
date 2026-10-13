"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";

export interface WordLookupResult {
  word: string;
  phonetic: string | null;
  meaningVi: string | null;
}

interface DictionaryApiPhonetic {
  text?: string;
}

interface DictionaryApiEntry {
  phonetic?: string;
  phonetics?: DictionaryApiPhonetic[];
}

interface MyMemoryResponse {
  responseData?: { translatedText?: string };
}

/** Tra phiên âm IPA (dictionaryapi.dev, miễn phí) + nghĩa tiếng Việt (MyMemory,
 * miễn phí) cho 1 từ tiếng Anh — dùng cho tính năng chạm-vào-từ-để-tra-nghĩa. */
export async function lookupWordAction(rawWord: string): Promise<WordLookupResult> {
  // Mỗi lượt tra gọi 2 dịch vụ bên ngoài — chỉ cho người đã đăng nhập dùng.
  const session = await auth();
  if (!session?.user?.id) {
    return { word: String(rawWord).slice(0, 40), phonetic: null, meaningVi: null };
  }
  const word = String(rawWord).toLowerCase().replace(/[^a-z'-]/g, "").slice(0, 40);
  if (word && !(await consumeRateLimit("lookupUser", session.user.id))) {
    return { word, phonetic: null, meaningVi: null };
  }
  if (!word) {
    return { word: rawWord, phonetic: null, meaningVi: null };
  }

  const [phonetic, meaningVi] = await Promise.all([
    fetchPhonetic(word),
    fetchMeaningVi(word),
  ]);

  return { word, phonetic, meaningVi };
}

async function fetchPhonetic(word: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as DictionaryApiEntry[];
    const entry = data[0];
    return entry?.phonetic ?? entry?.phonetics?.find((p) => p.text)?.text ?? null;
  } catch {
    // Hết thời gian chờ hoặc lỗi mạng — vẫn trả về nghĩa nếu tra được, không
    // chặn cả tính năng.
    return null;
  }
}

async function fetchMeaningVi(word: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|vi`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as MyMemoryResponse;
    return data.responseData?.translatedText ?? null;
  } catch {
    return null;
  }
}

export async function saveWordAction(
  word: string,
  phonetic: string | null,
  meaningVi: string | null
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Bạn cần đăng nhập để lưu từ vựng.");
  }
  word = String(word).trim().slice(0, 60);
  phonetic = phonetic == null ? null : String(phonetic).slice(0, 100);
  meaningVi = meaningVi == null ? null : String(meaningVi).slice(0, 500);
  if (!word) throw new Error("Từ không hợp lệ.");
  await prisma.savedWord.upsert({
    where: { userId_word: { userId: session.user.id, word } },
    update: { phonetic, meaningVi },
    create: { userId: session.user.id, word, phonetic, meaningVi },
  });
}

export async function deleteWordAction(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Bạn cần đăng nhập.");
  }
  await prisma.savedWord.deleteMany({ where: { id, userId: session.user.id } });
}
