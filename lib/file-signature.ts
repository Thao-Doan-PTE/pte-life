/** Nhận diện loại file thật qua vài byte đầu ("magic bytes") thay vì tin vào
 * `file.type` do trình duyệt gửi lên — kẻ xấu có thể đổi `file.type` tuỳ ý để
 * upload file HTML/JS giả làm ảnh/ghi âm. */

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((b, i) => bytes[offset + i] === b);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

async function readHead(file: File, length = 16): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(0, length).arrayBuffer());
}

export type ImageKind = { ext: "jpg" | "png" | "webp"; contentType: string };

export async function detectImage(file: File): Promise<ImageKind | null> {
  const b = await readHead(file);
  if (startsWith(b, [0xff, 0xd8, 0xff])) return { ext: "jpg", contentType: "image/jpeg" };
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ext: "png", contentType: "image/png" };
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return { ext: "webp", contentType: "image/webp" };
  return null;
}

export type AudioKind = { ext: "webm" | "mp4" | "ogg" | "wav" | "mp3"; contentType: string };

export async function detectAudio(file: File): Promise<AudioKind | null> {
  const b = await readHead(file);
  if (startsWith(b, [0x1a, 0x45, 0xdf, 0xa3])) return { ext: "webm", contentType: "audio/webm" };
  if (ascii(b, 4, 4) === "ftyp") return { ext: "mp4", contentType: "audio/mp4" };
  if (ascii(b, 0, 4) === "OggS") return { ext: "ogg", contentType: "audio/ogg" };
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WAVE") return { ext: "wav", contentType: "audio/wav" };
  if (ascii(b, 0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return { ext: "mp3", contentType: "audio/mpeg" };
  return null;
}
