import type { ReactNode } from "react";
import { ClipboardCheck, LineChart, Gem, LayoutDashboard, ClipboardList, GraduationCap, Users, Calendar, Bell, UserCog } from "lucide-react";
import { SiteHeader } from "@/components/home/site-header";
import { SiteFooterLegal } from "@/components/home/site-footer-legal";
import { RailNav, type RailEntry, type RailBlock } from "@/components/home/rail-nav";
import { GreetingText } from "@/components/home/greeting-text";

type Role = "guest" | "student" | "teacher";

const ICONS = {
  test: ClipboardCheck,
  practice: LineChart,
  tu: Gem,
  overview: LayoutDashboard,
  tclass: GraduationCap,
  assign: ClipboardList,
  grade: ClipboardCheck,
  lop: Users,
  lich: Calendar,
  thongbao: Bell,
  taikhoan: UserCog,
};

function buildEntries(role: Role, hasActiveClass: boolean): RailEntry[] {
  const iconClass = "size-5";
  if (role === "teacher") {
    return [
      { view: "tclass", href: "/", title: "Tổng quan lớp", icon: <ICONS.tclass className={iconClass} strokeWidth={1.8} /> },
      { view: "assign", href: "/giao-bai", title: "Giao bài mới", icon: <ICONS.assign className={iconClass} strokeWidth={1.8} /> },
      { view: "grade", href: "/bai-cho-cham", title: "Bài chờ chấm", icon: <ICONS.grade className={iconClass} strokeWidth={1.8} /> },
      { view: "tu", href: "/de-tu", title: "Luyện đề Tủ", icon: <ICONS.tu className={iconClass} strokeWidth={1.8} /> },
    ];
  }
  if (role === "guest") {
    return [
      { view: "test", href: "/test-dau-vao", title: "Test đầu vào PTE", icon: <ICONS.test className={iconClass} strokeWidth={1.8} /> },
      { view: "practice", href: "/", title: "Luyện đề PTE", icon: <ICONS.practice className={iconClass} strokeWidth={1.8} /> },
      { view: "tu", href: "/de-tu", title: "Luyện đề Tủ", icon: <ICONS.tu className={iconClass} strokeWidth={1.8} /> },
    ];
  }
  return [
    ...(hasActiveClass
      ? []
      : [{ view: "test", href: "/test-dau-vao", title: "Test đầu vào", icon: <ICONS.test className={iconClass} strokeWidth={1.8} />, group: "Học tập" }]),
    { view: "overview", href: "/", title: "Tổng quan của tôi", icon: <ICONS.overview className={iconClass} strokeWidth={1.8} />, group: "Học tập" },
    { view: "practice", href: "/luyen-de-pte", title: "Luyện đề PTE", icon: <ICONS.practice className={iconClass} strokeWidth={1.8} />, group: "Học tập", locked: !hasActiveClass },
    { view: "tu", href: "/de-tu", title: "Luyện đề Tủ", icon: <ICONS.tu className={iconClass} strokeWidth={1.8} />, group: "Học tập", locked: !hasActiveClass },
    { view: "lop-hoc", href: "/lop-hoc", title: "Lớp của tôi", icon: <ICONS.lop className={iconClass} strokeWidth={1.8} />, group: "Lớp học", locked: !hasActiveClass },
    {
      view: "bai-giao",
      href: "/#bai-giao-vien-giao",
      title: "Bài giáo viên giao",
      icon: <ICONS.assign className={iconClass} strokeWidth={1.8} />,
      group: "Lớp học",
      locked: !hasActiveClass,
    },
    { view: "lich-hoc", href: "/lich-hoc", title: "Lịch học", icon: <ICONS.lich className={iconClass} strokeWidth={1.8} />, group: "Lớp học", locked: !hasActiveClass },
    { view: "thong-bao", href: "/thong-bao", title: "Thông báo", icon: <ICONS.thongbao className={iconClass} strokeWidth={1.8} />, group: "Hệ thống" },
    { view: "tai-khoan", href: "/tai-khoan", title: "Hồ sơ & cài đặt", icon: <ICONS.taikhoan className={iconClass} strokeWidth={1.8} />, group: "Hệ thống" },
  ];
}

function buildBlocks(role: Role): RailBlock[] {
  if (role === "teacher") {
    return [
      { href: "#", label: "Ngân hàng đề", description: "Thêm, sửa câu hỏi Luyện đề PTE — sắp ra mắt" },
      { href: "#", label: "Báo cáo học viên", description: "Xuất điểm theo lớp, theo tuần — sắp ra mắt" },
    ];
  }
  if (role === "guest") {
    return [
      { href: "/login", label: "Dành cho giáo viên", description: "Quản lý lớp, giao bài và theo dõi điểm học viên" },
      {
        href: "#",
        label: "Liên hệ tư vấn",
        description: (
          <>
            Hotline: <span className="tabular-nums">[số hotline PTE-Life]</span>
            <br />
            Zalo OA: <span>[PTE-Life]</span>
          </>
        ),
      },
    ];
  }
  return [{ href: "#", label: "Cần hỗ trợ?", description: "Nhắn Zalo OA để được hỗ trợ nhanh nhất", variant: "dark" }];
}

export function RailShell({
  role,
  headline,
  user,
  hasActiveClass = false,
  fullBleed = false,
  children,
}: {
  role: Role;
  headline: ReactNode;
  user: { name: string; avatarUrl: string | null } | null;
  /** Học viên đã được xếp vào 1 lớp đang học (ACTIVE) — ẩn mục "Test đầu vào"
   * vì bài test này chỉ dành cho học viên mới/chưa xếp lớp (xem mục đích ở
   * SPEC_TestDauVao_PTE.md: đánh giá trình độ TRƯỚC khi tư vấn khóa). Không
   * ảnh hưởng guest/teacher. */
  hasActiveClass?: boolean;
  /** Vùng nội dung tràn hết chiều rộng, nền trắng, không padding — trang tự lo khoảng đệm bên trong. */
  fullBleed?: boolean;
  children: ReactNode;
}) {
  const entries = buildEntries(role, hasActiveClass);
  const blocks = buildBlocks(role);

  return (
    <div className="rail-theme flex min-h-svh flex-col">
      <SiteHeader user={user} />
      <div className="relative flex-1 overflow-hidden" style={{ background: fullBleed ? "var(--rail-bg)" : "var(--rail-surface-card)" }}>
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 md:grid-cols-[264px_1fr]">
          <aside
            className="flex flex-col gap-6 px-5 pt-8 pb-8"
            style={{ background: fullBleed ? "var(--rail-surface-card)" : "var(--rail-bg)", color: "var(--rail-ink)" }}
          >
            {user && <GreetingText name={user.name} />}
            <RailNav entries={entries} blocks={blocks} />
          </aside>

          <section className={fullBleed ? "min-w-0" : "min-w-0 px-6 py-10 sm:px-8 sm:py-12"}>
            <div className={fullBleed ? undefined : "mx-auto max-w-[1240px]"}>
              <h1 className="sr-only">{headline}</h1>
              {children}
            </div>
          </section>
        </div>
      </div>
      <SiteFooterLegal />
    </div>
  );
}
