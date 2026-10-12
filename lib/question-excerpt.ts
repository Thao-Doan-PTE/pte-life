/** Hàm thuần, không đụng Prisma — an toàn để import từ client component. */

/** Trích văn bản đầy đủ (không cắt ngắn) của 1 câu hỏi — dùng để xem trước lẫn để
 * tính toán (vd. phân loại độ khó), nơi cần giữ nguyên số từ thật của câu hỏi. */
export function extractQuestionText(content: Record<string, unknown>): string {
  let text =
    (content.passage as string) ??
    (content.prompt as string) ??
    (content.transcript as string) ??
    (content.situationText as string) ??
    (content.question as string) ??
    (content.sentence as string) ??
    (content.referenceText as string) ??
    "";
  // Không dùng referenceAnswer (đáp án Answer Short Question) — xem trước
  // trong danh sách câu sẽ lộ đáp án.

  if (!text && Array.isArray(content.paragraphs)) {
    text = (content.paragraphs as { text: string }[]).map((p) => p.text).join(" ");
  }
  if (!text && Array.isArray(content.segments)) {
    text = (content.segments as { type: string; value?: string }[])
      .map((s) => (s.type === "text" ? s.value : "___"))
      .join("");
  }
  if (!text && Array.isArray(content.words)) {
    text = (content.words as string[]).join(" ");
  }
  if (!text && typeof content.imageUrl === "string") {
    text = "(câu hỏi dạng hình ảnh)";
  }
  if (!text && typeof content.audioUrl === "string") {
    text = "(câu hỏi dạng audio)";
  }

  return typeof text === "string" ? text : "";
}

export function questionExcerpt(content: Record<string, unknown>): string {
  const text = extractQuestionText(content);
  if (text.length === 0) return "(không có nội dung xem trước)";
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}
