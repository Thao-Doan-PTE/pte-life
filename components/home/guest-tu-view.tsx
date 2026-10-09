import { StageIntro, StageCard, GhostLink } from "@/components/home/stage-intro";

export function GuestTuView({ loggedIn = false }: { loggedIn?: boolean }) {
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <StageIntro
        eyebrow="Luyện đề Tủ"
        title="Câu hỏi thường gặp, giáo viên cập nhật mỗi tuần"
        lead="Bộ đề Tủ do giáo viên PTE-Life tổng hợp từ phản hồi của học viên sau mỗi kỳ thi. Dùng để làm quen chủ đề và dạng câu trước ngày thi."
        ticks={["Lọc theo dạng câu và số lần được học viên nhắc đến", "Có bài mẫu, đáp án tham khảo và audio", "Đánh dấu câu đã luyện, theo dõi tiến độ"]}
        cta={!loggedIn ? <GhostLink href="/login">Đăng nhập để xem đề Tủ</GhostLink> : undefined}
      />
      <StageCard>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <b className="text-[16px]" style={{ color: "var(--rail-charcoal)" }}>
            Đề Tủ theo tuần
          </b>
          <span className="px-2 py-0.5 text-xs font-semibold tracking-wide uppercase" style={{ background: "var(--rail-surface)", color: "var(--rail-ink-dim)" }}>
            Sắp ra mắt
          </span>
        </div>
        <p style={{ color: "var(--rail-ink-dim)" }}>
          Đội học thuật PTE-Life đang tổng hợp danh sách câu hỏi Tủ theo tuần. Tính năng sẽ sớm ra mắt cho học viên.
        </p>
        <p className="mt-3.5 text-xs" style={{ color: "var(--rail-ink-dim)" }}>
          Đề Tủ là tài liệu luyện tập do PTE-Life tổng hợp. PTE-Life không cam kết các câu hỏi này sẽ xuất hiện trong đề
          thi chính thức.
        </p>
      </StageCard>
    </div>
  );
}
