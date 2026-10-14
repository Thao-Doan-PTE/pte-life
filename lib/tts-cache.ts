import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";
import { TTS_OUTPUT_FORMAT } from "@/lib/azure-tts";

/**
 * Lưu lâu dài file đọc mẫu Azure TTS theo (giọng, câu) — mỗi câu chỉ trả phí
 * Azure 1 lần cho mỗi giọng. Bộ nhớ đệm trong RAM ở app/api/tts/route.ts mất
 * mỗi khi Vercel tắt/khởi động lại server, nên không đủ để tiết kiệm.
 *
 * Nơi lưu (cùng cách với ghi âm bài nộp): Vercel Blob khi có
 * BLOB_READ_WRITE_TOKEN; chạy local thì public/uploads/tts-cache (đã gitignore);
 * trên Vercel mà thiếu token thì không lưu (chỉ còn bộ nhớ đệm RAM).
 *
 * Mọi lỗi ở đây chỉ ghi log và coi như chưa có file — không bao giờ làm hỏng
 * việc phát audio cho học viên.
 */

const LOCAL_DIR = path.join(process.cwd(), "public", "uploads", "tts-cache");
// Blob chậm/treo thì bỏ qua và gọi Azure luôn, học viên không phải chờ lâu.
const READ_TIMEOUT_MS = 3000;
// Nội dung file không bao giờ đổi với cùng 1 đường dẫn (đường dẫn = hash nội dung yêu cầu).
const CDN_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

type Backend = "blob" | "local" | "none";

function backend(): Backend {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  return process.env.VERCEL ? "none" : "local";
}

/** Đường dẫn file theo hash (định dạng + giọng + câu): không lộ nội dung câu,
 * và đổi định dạng audio thì tự sang đường dẫn mới. `voiceName` đã được kiểm
 * tra thuộc danh sách giọng hợp lệ trước khi gọi. */
export function ttsCachePathname(voiceName: string, text: string): string {
  const hash = createHash("sha256").update(`${TTS_OUTPUT_FORMAT}\n${voiceName}\n${text}`).digest("hex");
  return `tts-cache/${voiceName}/${hash}.mp3`;
}

/** Đọc file đã lưu; chưa có hoặc lỗi thì trả null. */
export async function readCachedTts(pathname: string): Promise<ArrayBuffer | null> {
  const where = backend();
  if (where === "none") return null;
  try {
    if (where === "blob") {
      const result = await get(pathname, { access: "public", abortSignal: AbortSignal.timeout(READ_TIMEOUT_MS) });
      if (!result || result.statusCode !== 200) return null;
      const audio = await new Response(result.stream).arrayBuffer();
      return audio.byteLength > 0 ? audio : null;
    }
    const file = await readFile(path.join(LOCAL_DIR, pathname.replace(/^tts-cache\//, "")));
    return file.byteLength > 0 ? new Uint8Array(file).buffer : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
      console.error("[tts-cache] Không đọc được file đọc mẫu đã lưu", error);
    }
    return null;
  }
}

/** Lưu file vừa tạo từ Azure. Gọi qua `after()` để không làm chậm phản hồi.
 * 2 yêu cầu cùng lúc cho cùng 1 câu sẽ ghi đè cùng nội dung — không sao. */
export async function writeCachedTts(pathname: string, audio: ArrayBuffer): Promise<void> {
  const where = backend();
  if (where === "none" || audio.byteLength === 0) return;
  try {
    if (where === "blob") {
      await put(pathname, Buffer.from(audio), {
        access: "public",
        contentType: "audio/mpeg",
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: CDN_MAX_AGE_SECONDS,
      });
      return;
    }
    const file = path.join(LOCAL_DIR, pathname.replace(/^tts-cache\//, ""));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, Buffer.from(audio));
  } catch (error) {
    console.error("[tts-cache] Không lưu được file đọc mẫu", error);
  }
}
