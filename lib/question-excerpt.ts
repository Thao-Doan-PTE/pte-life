/** Hàm thuần, không đụng Prisma — an toàn để import từ client component. */
export function questionExcerpt(content: Record<string, unknown>): string {
  let text =
    (content.passage as string) ??
    (content.prompt as string) ??
    (content.transcript as string) ??
    (content.situationText as string) ??
    (content.question as string) ??
    (content.sentence as string) ??
    (content.referenceText as string) ??
    (content.referenceAnswer as string) ??
    "";

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

  if (typeof text !== "string" || text.length === 0) return "(không có nội dung xem trước)";
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}
