"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  ClipboardList,
  FolderOpen,
  Headphones,
  Info,
  LayoutGrid,
  Layers,
  Mic,
  PenLine,
  RotateCcw,
  Shuffle,
  Target,
} from "lucide-react";
import { createFullTestSession, createQuestionTestSession, createSectionTestSession } from "@/lib/actions/mocktest";
import {
  QUESTION_TYPES,
  SKILL_LABELS_VI,
  type ExamPackage,
  type Skill,
} from "@/lib/question-types";
import { PRACTICE_INSTRUCTIONS } from "@/lib/practice-config";

type Mode = "full" | "section" | "question";
const SKILLS: Skill[] = ["listening", "speaking", "reading", "writing"];

const SKILL_ICONS: Record<Skill, typeof Mic> = {
  speaking: Mic,
  writing: PenLine,
  reading: BookOpen,
  listening: Headphones,
};

const MODE_META: Record<
  Mode,
  {
    icon: typeof Mic;
    title: string;
    badge?: string;
    description: string;
    chips: { icon: typeof Mic; label: string }[];
    accent: string;
    accentTint: string;
    panelGradient: string;
  }
> = {
  full: {
    icon: ClipboardList,
    title: "Full Test",
    badge: "Phổ biến nhất",
    description: "Làm bài thi mô phỏng đầy đủ 4 kỹ năng với thời gian và áp lực như thi thật.",
    chips: [
      { icon: Clock, label: "~2 giờ" },
      { icon: Layers, label: "4 kỹ năng" },
      { icon: CheckCircle2, label: "Chuẩn cấu trúc thi thật" },
    ],
    accent: "var(--wfd-red)",
    accentTint: "var(--wfd-red-tint)",
    panelGradient: "linear-gradient(120deg, #2b0b0d 0%, #5c161c 55%, #8a232b 100%)",
  },
  section: {
    icon: LayoutGrid,
    title: "Section Test",
    description: "Luyện tập theo từng kỹ năng riêng biệt. Tập trung cải thiện điểm yếu của bạn.",
    chips: [
      { icon: Clock, label: "20–30 phút" },
      { icon: Layers, label: "1 kỹ năng" },
      { icon: CheckCircle2, label: "Theo từng dạng bài" },
    ],
    accent: "#7C3AED",
    accentTint: "#EDE9FE",
    panelGradient: "linear-gradient(120deg, #1e1033 0%, #3a1f66 55%, #5b2e99 100%)",
  },
  question: {
    icon: Target,
    title: "Question Test",
    description: "Luyện tập từng dạng câu hỏi cụ thể. Nắm vững chiến thuật làm bài hiệu quả.",
    chips: [
      { icon: Clock, label: "10–20 phút" },
      { icon: Layers, label: "1 dạng câu" },
      { icon: CheckCircle2, label: "Luyện chuyên sâu" },
    ],
    accent: "var(--wfd-green)",
    accentTint: "var(--wfd-green-tint)",
    panelGradient: "linear-gradient(120deg, #0c2417 0%, #14432b 55%, #1f6b42 100%)",
  },
};

/** Phút ước tính cho 1 câu — lấy từ thời gian thật của dạng bài (chuẩn bị + ghi
 * âm / giới hạn thời gian) nếu có, không thì dùng mốc trung bình chung. */
function estimateMinutesPerQuestion(typeId: string): number {
  const ins = PRACTICE_INSTRUCTIONS[typeId];
  if (!ins) return 1.5;
  const seconds = (ins.prepSeconds ?? 0) + (ins.recordSeconds ?? ins.timeLimitSeconds ?? 0);
  return seconds > 0 ? Math.round((seconds / 60) * 10) / 10 : 1.5;
}

function StepHeader({ n, label, aside }: { n: number; label: string; aside?: string }) {
  return (
    <div className="relative z-10 flex items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        <span
          className="flex size-6 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
          style={{ background: "var(--wfd-black-sem)" }}
        >
          {n}
        </span>
        <p className="text-[15px] font-bold" style={{ color: "var(--wfd-ink)" }}>
          {label}
        </p>
      </div>
      {aside && (
        <span className="text-[13px] font-semibold" style={{ color: "var(--wfd-muted)" }}>
          {aside}
        </span>
      )}
    </div>
  );
}

function ModePill({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Mic;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[15px] font-bold transition-colors"
      style={active ? { background: "var(--wfd-surface)", color: "var(--wfd-ink)" } : { color: "var(--wfd-muted)" }}
    >
      <Icon className="size-3.5" style={active ? { color: "var(--wfd-red)" } : undefined} /> {label}
    </button>
  );
}

export function MocktestWizard({
  examPackage,
}: {
  examPackage: ExamPackage;
}) {
  const [mode, setMode] = useState<Mode>("full");
  const [modeChosen, setModeChosen] = useState(false);

  // Question Test state
  const [qSkill, setQSkill] = useState<Skill>("listening");
  const typesForQSkill = useMemo(
    () => QUESTION_TYPES.filter((t) => t.skill === qSkill && t.availableIn.includes(examPackage)),
    [qSkill, examPackage]
  );
  const [qTypeId, setQTypeId] = useState(typesForQSkill[0]?.id ?? "");
  const qType = QUESTION_TYPES.find((t) => t.id === qTypeId);
  const [qRandomize, setQRandomize] = useState(false);
  const qCount = 20;

  function handleQSkillChange(next: Skill) {
    setQSkill(next);
    const first = QUESTION_TYPES.find((t) => t.skill === next && t.availableIn.includes(examPackage));
    setQTypeId(first?.id ?? "");
  }

  // Section Test state
  const [sSkill, setSSkill] = useState<Skill>("listening");
  const [sRandomize, setSRandomize] = useState(false);
  const typesForSSkill = QUESTION_TYPES.filter((t) => t.skill === sSkill && t.availableIn.includes(examPackage));

  // Full Test state
  const [fRandomize, setFRandomize] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const fullTypes = QUESTION_TYPES.filter((t) => t.availableIn.includes(examPackage));
  const CHECKS = [
    { id: "env", label: "Tai nghe và micro đã sẵn sàng" },
    { id: "quiet", label: "Phòng yên tĩnh, đã tắt thông báo" },
    { id: "time", label: "Tôi có đủ khoảng 2 tiếng liên tục" },
  ];
  const readyCount = CHECKS.filter((c) => checks[c.id]).length;
  const allReady = readyCount === CHECKS.length;

  const packageLabel = examPackage === "academic" ? "PTE Academic" : "PTE Core";

  return (
    <div className="flex flex-col gap-5 sm:gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-extrabold sm:text-2xl" style={{ color: "var(--wfd-black-sem)" }}>
            Lựa chọn chế độ luyện thi của bạn
          </h1>
          <p className="mt-1 text-[15px]" style={{ color: "var(--wfd-muted)" }}>
            Chọn 1 trong 3 chế độ phù hợp với giai đoạn ôn luyện của bạn
          </p>
        </div>
        {/* Tạm ẩn theo yêu cầu — giữ lại để bật lại sau nếu cần.
        <div className="flex rounded-full border p-1 text-[13px] font-bold" style={{ borderColor: "var(--wfd-border)" }}>
          <span
            className="rounded-full px-3 py-1.5"
            style={
              examPackage === "academic"
                ? { background: "var(--wfd-black-sem)", color: "var(--wfd-surface)" }
                : { color: "var(--wfd-muted)" }
            }
          >
            PTE Academic
          </span>
          <span
            className="rounded-full px-3 py-1.5"
            style={examPackage === "core" ? { background: "var(--wfd-black-sem)", color: "var(--wfd-surface)" } : { color: "var(--wfd-muted)" }}
          >
            PTE Core
          </span>
        </div>
        */}
      </div>

      {modeChosen && (
        <button
          type="button"
          onClick={() => setModeChosen(false)}
          className="flex w-fit items-center gap-2 rounded-md px-5 py-2.5 text-[17px] font-bold shadow-md transition-all hover:scale-[1.03] hover:shadow-lg active:scale-[0.98]"
          style={{ color: "#fff", background: "#4B2A96" }}
        >
          <RotateCcw className="size-4" /> Đổi chế độ luyện thi
        </button>
      )}

      {!modeChosen && (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {(Object.keys(MODE_META) as Mode[]).map((m) => {
          const meta = MODE_META[m];
          const Icon = meta.icon;
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setModeChosen(true);
              }}
              className="flex flex-col gap-3 rounded-2xl border p-5 text-left shadow-sm transition-all active:scale-[0.97]"
              style={{
                borderColor: active ? meta.accent : "var(--wfd-border)",
                background:
                  m === "full"
                    ? "linear-gradient(135deg, rgba(228,34,43,0.08), var(--wfd-surface) 65%)"
                    : "var(--wfd-surface)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: meta.accentTint, color: meta.accent }}
                  >
                    <Icon className="size-5" />
                  </span>
                  <p className="flex flex-wrap items-center gap-2 text-[17px] font-bold leading-snug" style={{ color: "var(--wfd-ink)" }}>
                    {meta.title}
                    {meta.badge && (
                      <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: meta.accentTint, color: meta.accent }}>
                        {meta.badge}
                      </span>
                    )}
                  </p>
                </div>
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full"
                  style={{ background: meta.accentTint, color: meta.accent }}
                >
                  <ArrowRight className="size-4" />
                </span>
              </div>

              <p className="text-[15px] leading-relaxed" style={{ color: "var(--wfd-muted)" }}>
                {meta.description}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-medium" style={{ color: "var(--wfd-muted)" }}>
                {meta.chips.map((chip, i) => {
                  const ChipIcon = chip.icon;
                  return (
                    <span key={i} className="flex items-center gap-1.5">
                      <ChipIcon className="size-3.5" />
                      {chip.label}
                    </span>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
      )}

      <div className="grid grid-cols-1 overflow-hidden rounded-2xl border lg:grid-cols-[320px_1fr]" style={{ borderColor: "var(--wfd-border)" }}>
        {/* Cột trái: thông tin chế độ đang chọn */}
        <div className="flex flex-col gap-4 p-6 transition-[background] duration-300" style={{ background: MODE_META[mode].panelGradient }}>
          <div className="flex flex-wrap gap-1.5">
            {(mode === "full"
              ? [`~2 tiếng`, `${fullTypes.length} dạng bài`, `4 kỹ năng`]
              : mode === "section"
                ? [`~${Math.max(1, Math.round(typesForSSkill.reduce((s, t) => s + estimateMinutesPerQuestion(t.id), 0)))} phút`, `${typesForSSkill.length} dạng bài`, `1 kỹ năng`]
                : [`≈ ${qType ? Math.max(1, Math.round(qCount * estimateMinutesPerQuestion(qType.id))) : 0} phút`, `${qCount} câu`, `1 dạng bài`]
            ).map((chip) => (
              <span key={chip} className="rounded-full px-2.5 py-1 text-[13px] font-semibold text-white" style={{ background: "rgba(255,255,255,0.12)" }}>
                {chip}
              </span>
            ))}
          </div>

          <p className="text-2xl font-bold text-white">{MODE_META[mode].title}</p>

          <p className="text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
            {mode === "full" &&
              `Bài thi thử trọn bộ 4 kỹ năng (${fullTypes.length} dạng câu hỏi), mỗi dạng 1 câu theo đúng cấu trúc thi thật. Chấm điểm bằng AI theo tiêu chí công bố của PTE Academic.`}
            {mode === "section" &&
              `Thi toàn bộ ${typesForSSkill.length} dạng bài kỹ năng ${SKILL_LABELS_VI[sSkill]}, đồng hồ đếm ngược tổng thời gian để rèn cách phân bổ thời gian.`}
            {mode === "question" &&
              `Luyện nhiều câu liên tiếp theo đúng 1 dạng câu hỏi, hệ thống tự động ghi âm và bấm giờ như thi thật.`}
          </p>

          <div className="flex flex-col gap-2 rounded-xl p-4 text-[15px] leading-relaxed" style={{ background: "rgba(255,255,255,0.08)" }}>
            <p className="flex items-center gap-2 text-[17px] font-bold text-white">
              <Info className="size-4" />
              {mode === "full" ? "Quy định phòng thi" : "Mẹo làm bài"}
            </p>
            {mode === "full" ? (
              <>
                <p style={{ color: "rgba(255,255,255,0.7)" }}>
                  <b className="text-white">Kỷ luật:</b> thi liên tục khoảng 2 tiếng, không thể tạm dừng giữa chừng.
                </p>
                <p style={{ color: "rgba(255,255,255,0.7)" }}>
                  <b className="text-white">Lưu ý:</b> không bấm F5 hay tải lại trang — làm vậy sẽ mất tiến trình
                  đang làm.
                </p>
              </>
            ) : mode === "section" ? (
              <>
                <p style={{ color: "rgba(255,255,255,0.7)" }}>
                  <b className="text-white">Quy tắc:</b> đồng hồ tính cho cả phần — không sa đà vào 1 câu khó.
                </p>
                <p style={{ color: "rgba(255,255,255,0.7)" }}>
                  <b className="text-white">Mẹo:</b> bấm sang câu tiếp theo ngay khi làm xong để tránh mất thời gian
                  chờ.
                </p>
              </>
            ) : (
              <>
                <p style={{ color: "rgba(255,255,255,0.7)" }}>
                  <b className="text-white">Mục tiêu:</b> tăng phản xạ cho từng dạng bài đơn lẻ (RA, RS, WFD…).
                </p>
                <p style={{ color: "rgba(255,255,255,0.7)" }}>
                  <b className="text-white">Mẹo:</b> sửa triệt để lỗi phát âm/ngữ pháp trước khi tăng tốc độ.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Cột phải: các bước cấu hình theo chế độ đang chọn */}
        <div className="flex flex-col gap-6 p-6" style={{ background: "var(--wfd-surface)" }}>
          <div className="flex flex-col gap-6">

          {mode === "question" && (
            <div className="flex flex-col gap-3">
              <StepHeader n={1} label="Chọn kỹ năng" />
              <div className="grid grid-cols-2 gap-1.5 pl-9 sm:grid-cols-4">
                {SKILLS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleQSkillChange(s)}
                    className="rounded-xl border py-1.5 text-center text-[15px] font-bold transition-colors"
                    style={
                      qSkill === s
                        ? { background: "var(--wfd-red)", borderColor: "var(--wfd-red)", color: "#fff" }
                        : { background: "transparent", borderColor: "var(--wfd-border)", color: "var(--wfd-muted)" }
                    }
                  >
                    {SKILL_LABELS_VI[s]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === "question" && (
            <div className="flex flex-col gap-3">
              <StepHeader n={2} label="Chọn dạng bài" aside={`${typesForQSkill.length} dạng`} />
              <div className="flex flex-wrap gap-2 pl-9">
                {typesForQSkill.map((t) => {
                  const selected = t.id === qTypeId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setQTypeId(t.id)}
                      className="rounded-full border px-4 py-2 text-[15px] font-semibold transition-colors"
                      style={
                        selected
                          ? { background: "var(--wfd-black-sem)", borderColor: "var(--wfd-black-sem)", color: "var(--wfd-surface)" }
                          : { background: "var(--wfd-surface)", borderColor: "var(--wfd-border)", color: "var(--wfd-ink)" }
                      }
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {mode === "section" && (
            <div className="flex flex-col gap-3">
              <StepHeader n={1} label="Chọn kỹ năng" />
              <div className="grid grid-cols-2 gap-1.5 pl-9 sm:grid-cols-4">
                {SKILLS.map((s) => {
                  const Icon = SKILL_ICONS[s];
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSSkill(s)}
                      className="flex flex-col items-center gap-1 rounded-xl border py-2.5 text-center text-[15px] font-bold transition-colors"
                      style={
                        sSkill === s
                          ? { background: "var(--wfd-red)", borderColor: "var(--wfd-red)", color: "#fff" }
                          : { background: "transparent", borderColor: "var(--wfd-border)", color: "var(--wfd-muted)" }
                      }
                    >
                      <Icon className="size-4" />
                      {SKILL_LABELS_VI[s]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <StepHeader n={mode === "question" ? 3 : mode === "section" ? 2 : 1} label="Chế độ đề" />
            <div className="ml-9 flex rounded-xl p-1" style={{ background: "var(--wfd-code-bg)" }}>
              <ModePill
                active={mode === "full" ? !fRandomize : mode === "section" ? !sRandomize : !qRandomize}
                onClick={() => (mode === "full" ? setFRandomize(false) : mode === "section" ? setSRandomize(false) : setQRandomize(false))}
                icon={FolderOpen}
                label="Có sẵn"
              />
              <ModePill
                active={mode === "full" ? fRandomize : mode === "section" ? sRandomize : qRandomize}
                onClick={() => (mode === "full" ? setFRandomize(true) : mode === "section" ? setSRandomize(true) : setQRandomize(true))}
                icon={Shuffle}
                label="Trộn đề"
              />
            </div>
          </div>

          {mode === "full" && (
            <div className="flex flex-col gap-3">
              <StepHeader n={2} label="Chuẩn bị trước khi thi" aside={`Hoàn tất ${readyCount}/${CHECKS.length}`} />
              <div className="ml-9 flex flex-col gap-0.5 rounded-xl p-1.5" style={{ background: "var(--wfd-code-bg)" }}>
                {CHECKS.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-black/5">
                    <input
                      type="checkbox"
                      checked={!!checks[c.id]}
                      onChange={(e) => setChecks((prev) => ({ ...prev, [c.id]: e.target.checked }))}
                      className="size-4 shrink-0 accent-[var(--wfd-red)]"
                    />
                    <span className="text-[15px]" style={{ color: "var(--wfd-ink)" }}>
                      {c.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
          </div>

          <div className="flex flex-col items-stretch justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center" style={{ borderColor: "var(--wfd-border)" }}>
            <div>
              <p className="text-[13px] font-bold tracking-wider uppercase" style={{ color: "var(--wfd-muted-2)" }}>
                Lựa chọn của bạn
              </p>
              <p className="text-[15px] font-semibold" style={{ color: "var(--wfd-ink)" }}>
                {packageLabel} ·{" "}
                {mode === "full" && `Full Test · Đề ${fRandomize ? "ngẫu nhiên" : "có sẵn"}`}
                {mode === "section" && `Section Test · ${SKILL_LABELS_VI[sSkill]} · Đề ${sRandomize ? "ngẫu nhiên" : "có sẵn"}`}
                {mode === "question" && qType && `Question Test · ${qType.code} · Đề ${qRandomize ? "ngẫu nhiên" : "có sẵn"}`}
              </p>
            </div>

            {mode === "full" && (
              <form action={createFullTestSession}>
                <input type="hidden" name="randomize" value={String(fRandomize)} />
                <button
                  type="submit"
                  disabled={fullTypes.length === 0 || !allReady}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[15px] font-bold text-white shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 sm:w-auto"
                  style={{ background: "var(--wfd-red)" }}
                >
                  Bắt đầu Full Test <ArrowRight className="size-4" />
                </button>
              </form>
            )}
            {mode === "section" && (
              <form action={createSectionTestSession}>
                <input type="hidden" name="skill" value={sSkill} />
                <input type="hidden" name="randomize" value={String(sRandomize)} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[15px] font-bold text-white shadow-sm transition-all active:scale-[0.99] sm:w-auto"
                  style={{ background: "var(--wfd-red)" }}
                >
                  Bắt đầu thi phần <ArrowRight className="size-4" />
                </button>
              </form>
            )}
            {mode === "question" && (
              <form action={createQuestionTestSession}>
                <input type="hidden" name="questionTypeId" value={qTypeId} />
                <input type="hidden" name="randomize" value={String(qRandomize)} />
                <input type="hidden" name="count" value={qCount} />
                <button
                  type="submit"
                  disabled={!qTypeId}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[15px] font-bold text-white shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 sm:w-auto"
                  style={{ background: "var(--wfd-red)" }}
                >
                  Bắt đầu luyện <ArrowRight className="size-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
