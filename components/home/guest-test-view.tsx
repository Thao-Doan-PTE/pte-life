import { EntryTestLeadForm } from "@/components/home/entry-test-lead-form";
import { ScoreScale } from "@/components/home/score-scale";

const STEPS = [
  { title: "Làm bài kiểm tra nhanh", desc: "Đủ các kỹ năng Speaking, Writing, Listening, Reading ở dạng rút gọn." },
  { title: "Giáo viên chấm trực tiếp", desc: "Giáo viên chuyên môn PTE-Life nhận xét từng phần bài làm của bạn." },
  {
    title: "Nhận lộ trình Dynamic™ by PTELife tinh gọn",
    desc: "Giáo viên xây dựng lộ trình bám sát theo năng lực, target và deadline điểm của bạn.",
  },
];

export function GuestTestView() {
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div>
        <h2
          className="mb-4 text-[clamp(26px,3vw,36px)] leading-[1.15] font-bold tracking-tight text-balance"
          style={{ color: "var(--rail-charcoal)" }}
        >
          Biết mình đang ở đâu trên thang điểm PTE{" "}
          <span className="whitespace-nowrap" style={{ color: "var(--rail-red)" }}>
            10–90
          </span>
        </h2>
        <p className="mb-6 max-w-[46ch]" style={{ color: "var(--rail-ink-dim)" }}>
          Làm một bài kiểm tra ngắn, giáo viên chuyên môn PTE-Life chấm trực tiếp và gửi lại lộ trình học phù hợp với mức
          điểm hiện tại và mục tiêu của bạn.
        </p>

        <ScoreScale />

        <ol className="m-0 flex max-w-[460px] list-none flex-col gap-5 p-0">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex items-start gap-3">
              <span
                className="grid size-6 shrink-0 place-items-center rounded-full text-[13px] font-bold"
                style={{ background: "var(--rail-charcoal)", color: "var(--rail-cta-text)" }}
              >
                {i + 1}
              </span>
              <div>
                <p className="m-0 text-[15px] font-bold" style={{ color: "var(--rail-charcoal)" }}>
                  {s.title}
                </p>
                <p className="m-0 mt-0.5 text-[14px]" style={{ color: "var(--rail-ink-dim)" }}>
                  {s.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <EntryTestLeadForm />
    </div>
  );
}
