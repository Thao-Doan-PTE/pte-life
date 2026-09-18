/** Xem trước nội dung câu hỏi — KHÔNG hiển thị đáp án đúng (dùng cho Bước A, học viên chưa làm bài). */
export function QuestionContentPreview({ content }: { content: unknown }) {
  const c = content as Record<string, unknown>;

  if (typeof c.question === "string" && Array.isArray(c.options)) {
    return (
      <div className="flex flex-col gap-2 text-sm">
        {typeof c.passage === "string" && (
          <p className="whitespace-pre-line text-muted-foreground">
            {c.passage}
          </p>
        )}
        {typeof c.audioUrl !== "undefined" && (
          <p className="text-xs text-muted-foreground">
            Câu hỏi dạng nghe — audio sẽ phát khi bắt đầu luyện tập.
          </p>
        )}
        <p className="font-medium">{c.question}</p>
        <ul className="flex flex-col gap-1 text-muted-foreground">
          {c.options.map((opt, i) => (
            <li key={i}>{String(opt)}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (typeof c.prompt === "string") {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <p>{c.prompt}</p>
        {typeof c.minWords === "number" && typeof c.maxWords === "number" && (
          <p className="text-xs text-muted-foreground">
            {c.minWords}–{c.maxWords} từ · {String(c.timeLimitMinutes)} phút
          </p>
        )}
      </div>
    );
  }
  if (typeof c.situationText === "string") {
    return <p className="text-sm">{c.situationText}</p>;
  }
  if (typeof c.imageUrl === "string") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={c.imageUrl}
        alt="Hình ảnh cần mô tả"
        className="h-auto w-full rounded-lg border"
      />
    );
  }
  if (Array.isArray(c.paragraphs)) {
    return (
      <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        {(c.paragraphs as { text: string }[]).map((p, i) => (
          <li key={i}>{p.text}</li>
        ))}
      </ul>
    );
  }
  if (Array.isArray(c.segments)) {
    return (
      <p className="whitespace-pre-line text-sm">
        {(c.segments as { type: string; value?: string }[])
          .map((seg) => (seg.type === "text" ? seg.value : "___"))
          .join("")}
      </p>
    );
  }
  if (Array.isArray(c.words)) {
    return (
      <p className="text-sm">
        {(c.words as string[]).join(" ")}
      </p>
    );
  }
  if (typeof c.passage === "string") {
    return <p className="whitespace-pre-line text-sm">{c.passage}</p>;
  }
  if (typeof c.audioUrl !== "undefined") {
    return (
      <p className="text-sm text-muted-foreground">
        Câu hỏi dạng nghe — nội dung audio sẽ phát khi bắt đầu luyện tập.
      </p>
    );
  }
  return null;
}
