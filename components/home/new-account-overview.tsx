import Link from "next/link";
import { ArrowRight, Check, Lock, LockOpen } from "lucide-react";
import { ConsultationDialog } from "@/components/entry-test/consultation-dialog";
import { COURSE_GOALS } from "@/lib/course-goals";
import { ScoreConversionTable } from "@/components/home/score-conversion-table";

type TestStatus = "none" | "in_progress" | "submitted";

const CARD_SHADOW = "0 10px 30px -14px rgba(43,33,32,.28), 0 2px 6px rgba(43,33,32,.06)";

const HERO_COPY: Record<TestStatus, { pill: string; cta: string; note: string }> = {
  none: { pill: "Bước 1 · Chưa làm", cta: "Làm Test đầu vào ngay", note: "Khoảng 5 - 40 phút · làm 1 lần" },
  in_progress: { pill: "Bước 1 · Đang làm dở", cta: "Tiếp tục làm Test đầu vào", note: "Bài làm của bạn được lưu, vào lại để làm tiếp" },
  submitted: { pill: "Bước 1 · Đã nộp bài", cta: "Xem kết quả Test đầu vào", note: "Giáo viên PTE-Life sẽ chấm và gửi kết quả cho bạn" },
};

const SKILLS = [
  { label: "Nói", width: "62%" },
  { label: "Viết", width: "48%" },
  { label: "Đọc", width: "72%" },
  { label: "Nghe", width: "55%" },
];

/** Key "tu": mục duy nhất mở sớm cho tài khoản trong danh sách mời dùng thử Tủ. */
const LOCKED_FEATURES = [
  { title: "Luyện đề PTE", desc: "Đề thi thử theo cấu trúc PTE Academic, chấm tự động." },
  { key: "tu", title: "Luyện đề Tủ", desc: "Bộ câu hỏi luyện tập trọng tâm, cập nhật hằng tuần." },
  { title: "Bài giáo viên giao", desc: "Nhận bài được giao, hạn nộp và nhận xét của giáo viên." },
  { title: "Lịch học và tiến độ", desc: "Lịch lớp, mục tiêu tuần và biểu đồ luyện tập của bạn." },
];

function SectionTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-4">
      <h2 className="m-0 mb-1 text-[clamp(20px,2.2vw,26px)] leading-[1.15] font-bold" style={{ color: "var(--rail-charcoal)" }}>
        {title}
      </h2>
      <p className="m-0 text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
        {sub}
      </p>
    </div>
  );
}

function LockedPreview() {
  return (
    <div className="relative px-4 pt-5 pb-4" style={{ background: "var(--rail-surface-card)" }} aria-hidden="true">
      <span className="absolute top-3 right-3 grid size-8 place-items-center rounded-full" style={{ background: "var(--rail-red-tint)", color: "var(--rail-red)" }}>
        <Lock className="size-3.5" />
      </span>
      <div className="mb-2 h-2.5 w-[85%] rounded-full" style={{ background: "var(--rail-line)" }} />
      <div className="mb-4 h-2.5 w-[55%] rounded-full" style={{ background: "var(--rail-line)" }} />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-7 rounded-md" style={{ background: "var(--rail-bg)" }} />
        <div className="h-7 rounded-md" style={{ background: "var(--rail-red-soft)" }} />
        <div className="h-7 rounded-md" style={{ background: "var(--rail-bg)" }} />
      </div>
    </div>
  );
}

function UnlockedPreview() {
  return (
    <div className="relative px-4 pt-5 pb-4" style={{ background: "var(--rail-ok-tint)" }} aria-hidden="true">
      <span className="absolute top-3 right-3 grid size-8 place-items-center rounded-full" style={{ background: "var(--rail-bg)", color: "var(--rail-ok)" }}>
        <LockOpen className="size-3.5" />
      </span>
      <div className="mb-2 h-2.5 w-[85%] rounded-full" style={{ background: "var(--rail-bg)" }} />
      <div className="mb-4 h-2.5 w-[55%] rounded-full" style={{ background: "var(--rail-bg)" }} />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-7 rounded-md" style={{ background: "var(--rail-bg)" }} />
        <div className="h-7 rounded-md" style={{ background: "var(--rail-red-soft)" }} />
        <div className="h-7 rounded-md" style={{ background: "var(--rail-bg)" }} />
      </div>
    </div>
  );
}

/** Thẻ mời dùng thử Luyện đề Tủ — chỉ hiện cho tài khoản trong danh sách mời. */
function TuTrialInviteCard({ untilLabel }: { untilLabel: string }) {
  return (
    <section
      data-card
      className="flex flex-col items-start gap-5 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7"
      style={{ background: "var(--rail-red-tint)", borderColor: "var(--rail-red-soft)", boxShadow: CARD_SHADOW }}
    >
      <div className="min-w-0">
        <span
          className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-[0.1em] uppercase"
          style={{ background: "var(--rail-bg)", color: "var(--rail-red-text)" }}
        >
          <LockOpen className="size-3.5" /> Dùng thử
        </span>
        <h2 className="m-0 mb-1.5 text-[clamp(20px,2.4vw,26px)] leading-[1.2] font-bold text-balance" style={{ color: "var(--rail-charcoal)" }}>
          Bạn được mời dùng thử Luyện đề Tủ đến {untilLabel}
        </h2>
        <p className="m-0 max-w-[60ch] text-[15px]" style={{ color: "var(--rail-charcoal-2)" }}>
          Luyện Write From Dictation, Repeat Sentence theo bộ câu hỏi Tủ và làm bài thi thử Đề Tủ, chấm tự động.
        </p>
      </div>
      <Link
        href="/de-tu"
        className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--rail-red)] px-6 py-3 text-[16px] font-bold transition-colors hover:bg-[var(--rail-red-hover)] sm:w-auto"
        style={{ color: "var(--rail-cta-text)" }}
      >
        Vào Luyện đề Tủ <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}

export function NewAccountOverview({
  name,
  email,
  testStatus,
  tuTrialUntilLabel = null,
}: {
  name: string;
  email: string;
  testStatus: TestStatus;
  /** Hạn dùng thử Luyện đề Tủ (dd/mm/yyyy) khi tài khoản nằm trong danh sách
   * mời và còn hạn; null = không được mời — giữ nguyên giao diện cũ. */
  tuTrialUntilLabel?: string | null;
}) {
  const displayName = name.trim() || "bạn";
  const copy = HERO_COPY[testStatus];
  const tuTrial = tuTrialUntilLabel !== null;

  return (
    <div className="flex flex-col gap-10">
      {tuTrial && <TuTrialInviteCard untilLabel={tuTrialUntilLabel} />}

      <section>
        <h2 className="m-0 mb-2 text-[clamp(26px,3.2vw,38px)] leading-[1.15] font-bold text-balance" style={{ color: "var(--rail-charcoal)" }}>
          Chào {displayName}, bắt đầu hành trình PTE của bạn
        </h2>
        <p className="m-0 mb-6 text-[16px]" style={{ color: "var(--rail-ink-dim)" }}>
          Làm bài Test đầu vào để biết mình đang ở đâu, rồi chọn lộ trình phù hợp với mục tiêu.
        </p>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div data-card className="flex flex-col items-start rounded-2xl p-7" style={{ background: "#d1eaec", color: "var(--rail-charcoal)" }}>
            <span className="mb-5 rounded-full px-3 py-1 text-xs font-bold tracking-[0.1em] uppercase" style={{ background: "rgba(43,33,32,.1)", color: "var(--rail-charcoal)" }}>
              {copy.pill}
            </span>
            <h3 className="m-0 mb-2 text-[clamp(22px,2.4vw,28px)] leading-[1.15] font-bold" style={{ color: "var(--rail-charcoal)" }}>Bạn đang ở mức điểm PTE nào?</h3>
            <p className="m-0 mb-5 max-w-[42ch] text-[16px]" style={{ color: "var(--rail-charcoal-2)" }}>
              Bài Test đầu vào mô phỏng đủ 4 kỹ năng, chấm tự động ngay khi nộp bài.
            </p>
            <ul className="m-0 mb-6 flex list-none flex-col gap-2.5 p-0 text-[16px]">
              {["Điểm ước lượng cho Nói, Viết, Đọc, Nghe", "Chỉ ra dạng câu hỏi bạn đang mất điểm nhiều nhất", "Gợi ý khóa học sát với mục tiêu của bạn"].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0" style={{ color: "var(--rail-red)" }} strokeWidth={2.5} />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/test-dau-vao"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--rail-red)] px-6 py-3 text-[16px] font-bold text-white transition-colors hover:bg-[var(--rail-red-hover)]"
            >
              {copy.cta} <ArrowRight className="size-4" />
            </Link>
            <p className="m-0 mt-4 text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
              {copy.note}
            </p>
          </div>

          <div data-card className="rounded-2xl border p-7" style={{ background: "var(--rail-bg)", borderColor: "var(--rail-line)", boxShadow: CARD_SHADOW }}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="m-0 text-[20px] font-bold" style={{ color: "var(--rail-charcoal)" }}>
                Điểm ước lượng của bạn
              </h3>
              <span className="rounded-full px-3 py-1 text-[13px] font-bold" style={{ background: "var(--rail-warning-tint)", color: "var(--rail-warning)" }}>
                {testStatus === "submitted" ? "Chờ giáo viên chấm" : "Chờ bài test"}
              </span>
            </div>
            <p className="m-0 mb-5 flex items-baseline gap-2">
              <span className="text-[56px] leading-none font-extrabold tracking-wide" style={{ color: "var(--rail-line)" }}>
                ??
              </span>
              <span className="text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
                / 90 điểm tổng
              </span>
            </p>
            <div className="flex flex-col gap-3.5">
              {SKILLS.map((s) => (
                <div key={s.label}>
                  <div className="mb-1 flex items-center justify-between text-[15px]">
                    <span style={{ color: "var(--rail-ink)" }}>{s.label}</span>
                    <span className="font-semibold" style={{ color: "var(--rail-ink-dim)" }}>
                      ?
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--rail-surface-card)" }}>
                    <div className="h-full rounded-full blur-[2px]" style={{ width: s.width, background: "var(--rail-red-soft)" }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="m-0 mt-5 text-[14px] leading-relaxed" style={{ color: "var(--rail-ink-dim)" }}>
              Hiện ra sau khi bạn nộp bài Test đầu vào. Đây là điểm ước lượng trên hệ thống, không phải điểm thi chính thức của Pearson.
            </p>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle
          title="Học viên PTE-Life được dùng thêm"
          sub={
            tuTrial
              ? "Luyện đề Tủ đã mở cho bạn dùng thử. Các mục còn khóa trong menu sẽ mở khi bạn ghi danh khóa học."
              : "Những mục đang khóa trong menu sẽ mở ngay khi bạn ghi danh khóa học."
          }
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {LOCKED_FEATURES.map((f) => {
            const unlocked = tuTrial && f.key === "tu";
            return (
              <div
                key={f.title}
                data-card
                className="flex flex-col overflow-hidden rounded-xl border"
                style={{ background: "var(--rail-bg)", borderColor: unlocked ? "var(--rail-ok)" : "var(--rail-line)" }}
              >
                {unlocked ? <UnlockedPreview /> : <LockedPreview />}
                <div className="flex flex-1 flex-col p-4">
                  <p className="m-0 mb-1 flex flex-wrap items-center gap-2 text-[16px] font-bold" style={{ color: "var(--rail-charcoal)" }}>
                    {f.title}
                    {unlocked && (
                      <span className="rounded-full px-2.5 py-0.5 text-[12px] font-bold" style={{ background: "var(--rail-ok-tint)", color: "var(--rail-ok)" }}>
                        Đã mở · đến {tuTrialUntilLabel}
                      </span>
                    )}
                  </p>
                  <p className="m-0 text-[14px] leading-relaxed" style={{ color: "var(--rail-ink-dim)" }}>
                    {f.desc}
                  </p>
                  {unlocked && (
                    <Link
                      href="/de-tu"
                      className="mt-3 inline-flex w-fit items-center gap-1.5 text-[14px] font-bold hover:underline"
                      style={{ color: "var(--rail-red-text)" }}
                    >
                      Vào luyện ngay <ArrowRight className="size-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle title="Bảng quy đổi điểm PTE ↔ IELTS" sub="Đối chiếu điểm PTE Academic với band IELTS Academic để chọn mục tiêu phù hợp hồ sơ của bạn." />
        <ScoreConversionTable />
      </section>

      <section>
        <SectionTitle title="Khóa luyện thi PTE" sub="Chọn theo điểm mục tiêu. Sau bài test, hệ thống gợi ý khóa hợp với bạn nhất." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COURSE_GOALS.map((c) => (
            <div key={c.target} data-card className="flex flex-col rounded-xl border p-5" style={{ background: "var(--rail-bg)", borderColor: "var(--rail-line)", boxShadow: CARD_SHADOW }}>
              <div className="mb-3 flex items-center justify-between gap-2 text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
                <span>Mục tiêu</span>
                <span className="rounded-full px-2.5 py-0.5 text-[13px] font-semibold" style={{ background: "var(--rail-surface)", color: "var(--rail-ink-dim)" }}>
                  {c.tag}
                </span>
              </div>
              <p className="m-0 mb-2 text-[38px] leading-none font-extrabold" style={{ color: "var(--rail-red-text)" }}>
                {c.target}+
              </p>
              {c.name && (
                <p className="m-0 mb-1 text-[17px] font-bold" style={{ color: "var(--rail-charcoal)" }}>
                  {c.name}
                </p>
              )}
              <p className="m-0 mb-4 text-[14px] leading-relaxed" style={{ color: "var(--rail-ink-dim)" }}>
                {c.desc}
              </p>
              <dl className="m-0 mb-4 grid grid-cols-2 gap-3 border-y py-3 text-[14px]" style={{ borderColor: "var(--rail-line)" }}>
                <div>
                  <dt style={{ color: "var(--rail-ink-dim)" }}>Thời lượng</dt>
                  <dd className="m-0 font-bold" style={{ color: "var(--rail-charcoal)" }}>
                    {c.duration ?? "Đang cập nhật"}
                  </dd>
                </div>
                <div>
                  <dt style={{ color: "var(--rail-ink-dim)" }}>Học phí</dt>
                  <dd className="m-0 font-bold" style={{ color: "var(--rail-charcoal)" }}>
                    {c.fee ?? "Đang cập nhật"}
                  </dd>
                </div>
              </dl>
              <div className="mt-auto">
                <ConsultationDialog
                  defaultName={name}
                  defaultEmail={email}
                  label="Xem chi tiết khóa"
                  buttonClassName="flex w-full items-center justify-center rounded-full border px-4 py-2.5 text-[15px] font-bold transition-colors hover:bg-[var(--rail-surface)]"
                  buttonStyle={{ borderColor: "var(--rail-charcoal)", color: "var(--rail-charcoal)", background: "var(--rail-bg)" }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col items-start justify-between gap-4 rounded-2xl px-7 py-6 sm:flex-row sm:items-center" style={{ background: "var(--rail-red)" }}>
          <div>
            <h3 className="m-0 mb-1 text-[20px] font-bold text-white">Chưa chắc nên chọn khóa nào?</h3>
            <p className="m-0 text-[15px] text-white/90">
              Tư vấn viên PTE-Life xem kết quả test cùng bạn và gợi ý lộ trình theo mục tiêu, thời gian của bạn.
            </p>
          </div>
          <ConsultationDialog
            defaultName={name}
            defaultEmail={email}
            label="Đăng ký học thử miễn phí"
            topic="trial"
            title="Đăng ký học thử miễn phí"
            intro="Chọn ngày và khung giờ bạn tiện, tư vấn viên sẽ liên hệ để sắp xếp buổi học thử."
            successTitle="Đã đăng ký học thử!"
            successText="Tư vấn viên PTE-Life sẽ liên hệ bạn đúng khung giờ đã hẹn để sắp xếp buổi học thử miễn phí."
            buttonClassName="shrink-0 rounded-full px-6 py-2.5 text-[15px] font-bold transition-colors hover:bg-[var(--rail-surface)]"
            buttonStyle={{ background: "var(--rail-bg)", color: "var(--rail-red-text)" }}
          />
        </div>
      </section>
    </div>
  );
}
