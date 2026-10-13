import { cn } from "@/lib/utils";

/** Thanh tiến độ có tên cho trình đọc màn hình (role="progressbar" bắt buộc có
 * aria-label). Dùng cùng class .adm-bar với ProgressBar trong admin-ui. */
export function LabeledProgress({
  value,
  max,
  label,
  valueText,
  red = false,
  className,
}: {
  value: number;
  max: number;
  /** Tên thanh, vd "Buổi đã học lớp K12". */
  label: string;
  /** Giá trị đọc ra, vd "8 trên 24 buổi". */
  valueText?: string;
  red?: boolean;
  className?: string;
}) {
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.max(0, Math.min(value, safeMax));
  const pct = Math.round((100 * clamped) / safeMax);
  return (
    <div
      className={cn("adm-bar", red && "adm-bar-red", className)}
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuetext={valueText}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Dòng "Buổi đã học done/total" + thanh tiến độ; chưa nhập tổng số buổi thì hiện chữ mờ. */
export function SessionProgress({
  done,
  total,
  classLabel,
}: {
  done: number;
  total: number | null;
  /** Mã lớp — để đặt tên thanh tiến độ cho trình đọc màn hình. */
  classLabel: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
        <span style={{ color: "var(--adm-ink-3)" }}>Buổi đã học</span>
        {total ? (
          <span className="adm-num">
            {done}/{total}
          </span>
        ) : (
          <span style={{ color: "var(--adm-ink-3)" }}>Chưa nhập số buổi</span>
        )}
      </div>
      {total ? (
        <div className="flex">
          <LabeledProgress
            value={done}
            max={total}
            label={`Buổi đã học lớp ${classLabel}`}
            valueText={`${done} trên ${total} buổi`}
          />
        </div>
      ) : null}
    </div>
  );
}
