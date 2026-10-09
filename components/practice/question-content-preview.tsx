/** Xem trước nội dung câu hỏi — KHÔNG hiển thị đáp án đúng (dùng cho Bước A, học viên chưa làm bài). */
export function QuestionContentPreview({ content }: { content: unknown }) {
  const c = content as Record<string, unknown>;

  if (typeof c.question === "string" && Array.isArray(c.options)) {
    return (
      <div className="font-passage flex flex-col gap-2 text-[17px]">
        {typeof c.passage === "string" && (
          <p className="whitespace-pre-line text-muted-foreground">
            {c.passage}
          </p>
        )}
        {typeof c.audioUrl !== "undefined" && (
          <p className="text-[13px] text-muted-foreground">
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
      <div className="font-passage flex flex-col gap-2 text-[17px]">
        <p>{c.prompt}</p>
        {typeof c.minWords === "number" && typeof c.maxWords === "number" && (
          <p className="text-[13px] text-muted-foreground">
            {c.minWords}–{c.maxWords} từ · {String(c.timeLimitMinutes)} phút
          </p>
        )}
      </div>
    );
  }
  if (typeof c.situationText === "string") {
    return <p className="font-passage text-[17px]">{c.situationText}</p>;
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
      <ul className="flex flex-col gap-1.5 text-[15px] text-muted-foreground">
        {(c.paragraphs as { text: string }[]).map((p, i) => (
          <li key={i}>{p.text}</li>
        ))}
      </ul>
    );
  }
  if (Array.isArray(c.segments)) {
    return (
      <p className="whitespace-pre-line text-[15px]">
        {(c.segments as { type: string; value?: string }[])
          .map((seg) => (seg.type === "text" ? seg.value : "___"))
          .join("")}
      </p>
    );
  }
  if (Array.isArray(c.words)) {
    return (
      <p className="text-[15px]">
        {(c.words as string[]).join(" ")}
      </p>
    );
  }
  if (typeof c.passage === "string") {
    return <p className="font-passage whitespace-pre-line text-[17px]">{c.passage}</p>;
  }
  if (typeof c.audioUrl !== "undefined") {
    return (
      <p className="text-[15px] text-muted-foreground">
        Câu hỏi dạng nghe — nội dung audio sẽ phát khi bắt đầu luyện tập.
      </p>
    );
  }
  return null;
}
