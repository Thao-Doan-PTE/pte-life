"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
  const word = rawWord.toLowerCase().replace(/[^a-z'-]/g, "");
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
