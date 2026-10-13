"use client";

import { useState, type ReactNode } from "react";
import { TriangleAlert, X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { InitialsAvatar, PackageTag, ProgressBar } from "@/components/admin/admin-ui";
import { PlanBox } from "@/components/admin/students/plan-box";
import { PlaceClassBox } from "@/components/admin/students/place-class-box";
import { TargetScoreBox } from "@/components/admin/students/target-score-box";
import { classWithTeacher, entryTargetLabel, targetSourceLabel } from "@/components/admin/students/student-format";
import { PACKAGE_LABEL } from "@/lib/admin/student-status";
import type { PlaceableClass, StudentDetail, StudentRow } from "@/lib/admin/student-queries";

/** Drawer "Hồ sơ học viên" (HANDOFF mục 4.2). Đóng bằng ✕, bấm nền mờ hoặc Esc
 * (Sheet = base-ui Dialog lo phần bẫy focus, Esc và trả focus về dòng đã bấm). */
export function StudentDrawer({
  openId,
  row,
  detail,
  detailMissing,
  placeableClasses,
  canManagePlans,
  canPlace,
  onClose,
}: {
  openId: string | null;
  row: StudentRow | null;
  detail: StudentDetail | null;
  detailMissing: boolean;
  placeableClasses: PlaceableClass[];
  canManagePlans: boolean;
  canPlace: boolean;
  onClose: () => void;
}) {
  // Giữ nội dung lần mở gần nhất trong lúc drawer đang trượt ra (đóng), tránh
  // nháy sang trạng thái "Đang tải". Khi đang mở thì luôn dùng dữ liệu mới nhất.
  const current = { row, detail, detailMissing, placeableClasses };
  const [last, setLast] = useState(current);
  if (
    openId !== null &&
    (last.row !== row || last.detail !== detail || last.detailMissing !== detailMissing || last.placeableClasses !== placeableClasses)
  ) {
    setLast(current);
  }
  const view = openId === null ? last : current;

  return (
    <Sheet
      open={openId !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        className="gap-0 bg-transparent p-0 shadow-none data-[side=right]:w-[min(520px,100%)] data-[side=right]:border-l-0 data-[side=right]:sm:max-w-none"
      >
        <div
          className="admin-theme flex h-full min-h-0 flex-col pt-[env(safe-area-inset-top,0px)]"
          style={{ background: "var(--adm-bg)", boxShadow: "var(--adm-shadow)" }}
        >
          {view.row ? (
            <DrawerContent
              row={view.row}
              detail={view.detail}
              detailMissing={view.detailMissing}
              placeableClasses={view.placeableClasses}
              canManagePlans={canManagePlans}
              canPlace={canPlace}
            />
          ) : (
            <>
              <DrawerHeader title="Hồ sơ học viên" />
              <p className="px-5 py-6 text-[13.5px]" style={{ color: "var(--adm-ink-3)" }} role="status">
                {view.detailMissing ? "Không tìm thấy học viên này hoặc bạn không có quyền xem." : "Đang tải hồ sơ…"}
              </p>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DrawerHeader({ title, sub, avatarName }: { title: string; sub?: string; avatarName?: string }) {
  return (
    <div className="flex items-center gap-3 border-b px-5 py-[18px]" style={{ borderColor: "var(--adm-line)" }}>
      {avatarName && <InitialsAvatar name={avatarName} size={42} />}
      <div className="min-w-0 flex-1">
        <SheetTitle className="truncate text-[17px] font-bold" style={{ color: "var(--adm-ink)" }}>
          {title}
        </SheetTitle>
        {sub && (
          <SheetDescription className="truncate text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
            {sub}
          </SheetDescription>
        )}
      </div>
      <SheetClose className="adm-btn adm-btn-ghost shrink-0" aria-label="Đóng hồ sơ">
        <X className="size-4" aria-hidden="true" />
      </SheetClose>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[12px] font-semibold tracking-[0.07em] uppercase" style={{ color: "var(--adm-ink-3)" }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return (
    <p className="text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
      {children}
    </p>
  );
}

function Fact({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-[10px] px-3 py-2.5" style={{ background: "var(--adm-surface)" }}>
      <span className="block text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
        {label}
      </span>
      <b className="adm-num block truncate text-[15px]">{value}</b>
      {hint && (
        <span className="mt-0.5 block text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
          {hint}
        </span>
      )}
    </div>
  );
}

function DrawerContent({
  row,
  detail,
  detailMissing,
  placeableClasses,
  canManagePlans,
  canPlace,
}: {
  row: StudentRow;
  detail: StudentDetail | null;
  detailMissing: boolean;
  placeableClasses: PlaceableClass[];
  canManagePlans: boolean;
  canPlace: boolean;
}) {
  const classLabel = classWithTeacher(row);
  const mismatched = row.activeClasses.filter((c) => c.examType !== row.examPackage);
  const loadingText = detailMissing ? "Không tải được chi tiết học viên." : "Đang tải…";

  return (
    <>
      <DrawerHeader title={row.name} sub={row.email} avatarName={row.name} />

      <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-5 py-[18px]">
        <div className="flex flex-wrap items-center gap-2">
          <PackageTag pkg={row.examPackage} />
          <span className={`adm-pill ${row.status.pill}`}>{row.status.label}</span>
          <span className="adm-tag">{classLabel ?? "Chưa xếp lớp"}</span>
          {row.activeClasses.length > 1 && (
            <span className="adm-tag" title={row.activeClasses.map((c) => c.code).join(", ")}>
              +{row.activeClasses.length - 1} lớp khác
            </span>
          )}
          {row.locked && <span className="adm-pill adm-pill-mute">Tài khoản đã khoá</span>}
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Fact
            label="Hết hạn"
            value={row.expiresLabel}
            // Nhãn "Bảo lưu" che mất số ngày còn lại của gói → nhắc lại ở đây.
            hint={
              row.status.key === "reserved"
                ? row.status.daysLeft < 0
                  ? "Gói đã hết hạn"
                  : `Gói còn ${row.status.daysLeft} ngày`
                : undefined
            }
          />
          <Fact label="Bảo lưu còn" value={`${row.reservationsLeft} lượt`} />
          <Fact
            label="Đầu vào → mục tiêu"
            value={entryTargetLabel(row)}
            hint={
              <>
                {row.entryTest
                  ? `${row.entryTest.scoreTotal ?? "—"} điểm tự chấm${row.entryTest.submittedLabel ? ` · ${row.entryTest.submittedLabel}` : ""}`
                  : "Chưa làm test đầu vào"}
                <br />
                {targetSourceLabel(row)}
              </>
            }
          />
        </div>

        {mismatched.length > 0 && (
          <p
            className="flex items-start gap-2 rounded-[10px] px-3 py-2.5 text-[12.5px]"
            style={{ background: "var(--adm-warn-soft)", color: "var(--adm-warn)" }}
          >
            <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
            <span>
              Lớp {mismatched.map((c) => `${c.code} (${PACKAGE_LABEL[c.examType]})`).join(", ")} khác gói hiện tại của học
              viên ({PACKAGE_LABEL[row.examPackage]}). Hệ thống không tự gỡ khỏi lớp — hãy xếp lại lớp cùng gói.
            </span>
          </p>
        )}

        {canManagePlans && (
          <Section title="Gói học & thời hạn">
            <PlanBox key={row.id} row={row} />
          </Section>
        )}

        {canManagePlans && (
          <Section title="Mục tiêu">
            <TargetScoreBox key={row.id} row={row} />
          </Section>
        )}

        {canPlace && (
          <Section title="Xếp lớp">
            {detail ? <PlaceClassBox key={row.id} row={row} classes={placeableClasses} /> : <Muted>{loadingText}</Muted>}
          </Section>
        )}

        <Section title="Tiến độ theo kỹ năng">
          {detail ? (
            <>
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2 text-[13px]">
                {detail.skills.map((s) => (
                  <SkillLine key={s.skill} {...s} />
                ))}
              </div>
              <p className="mt-1.5 text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
                % = số câu đã luyện trên ngân hàng đề · TB = điểm PTE trung bình (10–90)
              </p>
            </>
          ) : (
            <Muted>{loadingText}</Muted>
          )}
        </Section>

        <Section title="Hoạt động gần nhất">
          <Muted>
            {row.practice.lastLabel
              ? `Luyện tập gần nhất: ${row.practice.lastLabel} · ${row.practice.attempts} lượt làm bài`
              : "Chưa luyện tập."}
          </Muted>
          {detail && detail.recent.length > 0 && (
            <ul className="mt-1.5">
              {detail.recent.map((a) => (
                <li
                  key={a.id}
                  className="flex items-baseline gap-2 border-b py-1.5 text-[13px] last:border-b-0"
                  style={{ borderColor: "var(--adm-line)" }}
                >
                  <span className="adm-num shrink-0 text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
                    {a.atLabel}
                  </span>
                  <span className="adm-tag shrink-0">{a.typeCode}</span>
                  <span className="min-w-0 flex-1 truncate">{a.typeName}</span>
                  <span className="adm-num shrink-0 font-semibold">{a.scorePct}%</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Lịch sử thao tác">
          {!detail ? (
            <Muted>{loadingText}</Muted>
          ) : detail.history.length === 0 ? (
            <Muted>Chưa có thao tác.</Muted>
          ) : (
            <ul>
              {detail.history.map((h) => (
                <li
                  key={h.id}
                  className="flex flex-col gap-0.5 border-b py-2 text-[13px] last:border-b-0"
                  style={{ borderColor: "var(--adm-line)" }}
                >
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
                    <span className="adm-tag">{h.label}</span>
                    <span className="adm-num">{h.atLabel}</span>
                    {h.actorName && <span className="min-w-0 truncate">bởi {h.actorName}</span>}
                  </span>
                  <span className="break-words">{h.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}

function SkillLine({
  label,
  progressPct,
  practicedQuestions,
  totalQuestions,
  avgPteScore,
}: StudentDetail["skills"][number]) {
  return (
    <>
      <span>{label}</span>
      <ProgressBar value={progressPct} />
      <span className="adm-num text-[12.5px]" title={`${practicedQuestions}/${totalQuestions} câu đã luyện`}>
        {progressPct}%
      </span>
      <span className="adm-num text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
        TB {avgPteScore ?? "—"}
      </span>
    </>
  );
}
