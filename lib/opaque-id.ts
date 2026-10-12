import { createHmac } from "node:crypto";

/** Đổi mã đoạn văn Reorder Paragraphs (p1, p2, …) thành chuỗi ngẫu nhiên khó
 * đoán trước khi gửi xuống trình duyệt — mã gốc đánh số theo đúng thứ tự đáp án
 * nên lộ ra là học viên mở DevTools đọc được đáp án. Cùng câu hỏi + cùng mã
 * luôn ra cùng 1 chuỗi, nên server tự đổi ngược lại được khi chấm. */
export function toOpaqueParagraphId(questionId: string, id: string): string {
  const secret = process.env.AUTH_SECRET ?? "pte-life";
  return createHmac("sha256", secret).update(`${questionId}:${id}`).digest("base64url").slice(0, 12);
}
