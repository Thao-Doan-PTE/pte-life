import { StageIntro, StageCard, GhostLink, RedLink } from "@/components/home/stage-intro";

const GROUPS: { title: string; chips: string[] }[] = [
  {
    title: "Speaking & Writing",
    chips: [
      "Read Aloud",
      "Repeat Sentence",
      "Describe Image",
      "Re-tell Lecture",
      "Answer Short Question",
      "Summarize Group Discussion",
      "Respond to a Situation",
      "Summarize Written Text",
      "Write Essay",
    ],
  },
  {
    title: "Reading",
    chips: ["R&W Fill in the Blanks", "Multiple Choice (Multiple)", "Re-order Paragraphs", "Fill in the Blanks", "Multiple Choice (Single)"],
  },
  {
    title: "Listening",
    chips: [
      "Summarize Spoken Text",
      "Multiple Choice (Multiple)",
      "Fill in the Blanks",
      "Highlight Correct Summary",
      "Multiple Choice (Single)",
      "Select Missing Word",
      "Highlight Incorrect Words",
      "Write from Dictation",
    ],
  },
];

export function GuestPracticeView() {
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <StageIntro
        eyebrow="Luyện đề PTE"
        title="Luyện từng dạng câu, rồi thi thử cả bài"
        lead="Ngân hàng câu hỏi luyện tập chia theo 3 phần thi PTE Academic. Chọn dạng còn yếu để luyện riêng, hoặc làm Mock test full có tính giờ."
        ticks={[
          "Mô phỏng giao diện và thời gian làm bài theo cấu trúc đề PTE Academic",
          "Có điểm ước lượng và giải thích đáp án từng câu",
          "Giáo viên giao bài và xem lại bài làm của lớp",
        ]}
        cta={
          <>
            <RedLink href="/login">Vào luyện đề →</RedLink>
            <GhostLink href="/login">Làm Mock test</GhostLink>
          </>
        }
      />
      <StageCard>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <b className="text-[16px]" style={{ color: "var(--rail-charcoal)" }}>
            Chọn dạng câu hỏi
          </b>
          <span className="rounded-none px-2 py-0.5 text-xs font-semibold tracking-wide uppercase" style={{ background: "var(--rail-surface)", color: "var(--rail-ink-dim)" }}>
            Đăng nhập để luyện
          </span>
        </div>
        {GROUPS.map((g) => (
          <div key={g.title} className="mt-3.5 first:mt-0">
            <h4 className="mb-2 text-[13px] font-semibold tracking-wide uppercase" style={{ color: "var(--rail-ink-dim)" }}>
              {g.title}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {g.chips.map((c) => (
                <span key={c} className="px-2.5 py-1.5 text-[13px]" style={{ background: "var(--rail-surface)", color: "var(--rail-ink)" }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        ))}
        <p className="mt-3.5 text-xs" style={{ color: "var(--rail-ink-dim)" }}>
          Điểm trên hệ thống là điểm ước lượng để luyện tập, không phải điểm thi chính thức của Pearson.
        </p>
      </StageCard>
    </div>
  );
}
