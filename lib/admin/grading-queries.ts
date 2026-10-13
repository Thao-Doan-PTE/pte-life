import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { ReviewStatus } from "@/lib/generated/prisma/enums";
import { QUESTION_TYPES, type Skill } from "@/lib/question-types";
import { CRITERION_LABELS } from "@/lib/scoring/ai/rubric";
import { countWords } from "@/lib/scoring/writing-form";
import { DEFAULT_RUBRICS, getActiveRubric, parseCriteria, type Rubric, type RubricCriterion } from "@/lib/admin/rubrics";

/** Truy vấn cho trang Chấm bài (HANDOFF §4.6). Module chỉ chạy ở server — KHÔNG
 * phải server action; trang/action gọi nó PHẢI kiểm tra quyền gradeSubmissions
 * (hoặc editRubrics cho phần rubric) và truyền đúng phạm vi lớp từ
 * getScopedClassIdsFor(user, "gradeSubmissions") trước.
 * Chỉ bài nằm trong bài tập được giao mới vào hàng chờ (quyết định 12A) — giáo
 * viên (kể cả kiêm vận hành) chỉ thấy bài của các lớp mình phụ trách (lọc ngay
 * trong truy vấn). */

/** Số bài chờ chấm hiển thị tối đa trong hàng chờ (cũ nhất trước). */
export const PENDING_QUEUE_LIMIT = 100;
/** Số bài đã chấm gần nhất hiển thị. */
export const GRADED_LIST_LIMIT = 30;

export interface GradingFilters {
  assignmentId: string | null;
  classId: string | null;
}

export const NO_GRADING_FILTERS: GradingFilters = { assignmentId: null, classId: null };

/** Id lấy từ URL/form: chỉ nhận chuỗi kiểu cuid, còn lại bỏ qua. */
export function parseEntityId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return /^[A-Za-z0-9_-]{1,64}$/.test(v) ? v : null;
}

/** Điều kiện phạm vi: bài thuộc bài tập được giao, lớp của bài tập nằm trong phạm
 * vi (null = mọi lớp), cộng bộ lọc lớp/bài tập (luôn AND với phạm vi — lọc lớp
 * ngoài phạm vi chỉ ra rỗng). */
export function attemptScopeWhere(classIds: string[] | null, filters: GradingFilters): Prisma.PracticeAttemptWhereInput {
  const assignmentConds: Prisma.AssignmentWhereInput[] = [];
  if (classIds) assignmentConds.push({ classId: { in: classIds } });
  if (filters.classId) assignmentConds.push({ classId: filters.classId });
  return {
    assignmentId: filters.assignmentId ?? { not: null },
    ...(assignmentConds.length > 0 ? { assignment: { is: { AND: assignmentConds } } } : {}),
  };
}

export function findQuestionType(typeId: string) {
  return QUESTION_TYPES.find((t) => t.id === typeId) ?? null;
}

function typeCode(typeId: string): string {
  return findQuestionType(typeId)?.code ?? typeId;
}

// ===== Hàng chờ =====

export interface QueueItem {
  id: string;
  studentName: string;
  typeCode: string;
  assignmentTitle: string;
  classCode: string;
  submittedAt: Date;
  /** null = đang chờ chấm. */
  graded: { total: number; maxTotal: number; gradedAt: Date } | null;
}

export interface GradingQueue {
  pending: QueueItem[];
  pendingTotal: number;
  graded: QueueItem[];
}

const queueSelect = {
  id: true,
  questionTypeId: true,
  createdAt: true,
  user: { select: { name: true } },
  assignment: { select: { title: true, class: { select: { code: true } } } },
} satisfies Prisma.PracticeAttemptSelect;

type QueueRow = Prisma.PracticeAttemptGetPayload<{ select: typeof queueSelect }>;

function toQueueItem(row: QueueRow, graded: QueueItem["graded"]): QueueItem {
  return {
    id: row.id,
    studentName: row.user.name,
    typeCode: typeCode(row.questionTypeId),
    assignmentTitle: row.assignment?.title ?? "",
    classCode: row.assignment?.class.code ?? "",
    submittedAt: row.createdAt,
    graded,
  };
}

export async function getGradingQueue(classIds: string[] | null, filters: GradingFilters): Promise<GradingQueue> {
  if (classIds && classIds.length === 0) return { pending: [], pendingTotal: 0, graded: [] };
  const where = attemptScopeWhere(classIds, filters);
  const [pendingRows, pendingTotal, gradedRows] = await Promise.all([
    prisma.practiceAttempt.findMany({
      where: { ...where, reviewStatus: "PENDING" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: PENDING_QUEUE_LIMIT,
      select: queueSelect,
    }),
    prisma.practiceAttempt.count({ where: { ...where, reviewStatus: "PENDING" } }),
    prisma.attemptGrade.findMany({
      where: { attempt: { ...where, reviewStatus: "GRADED" } },
      orderBy: { gradedAt: "desc" },
      take: GRADED_LIST_LIMIT,
      select: { total: true, maxTotal: true, gradedAt: true, attempt: { select: queueSelect } },
    }),
  ]);
  return {
    pending: pendingRows.map((r) => toQueueItem(r, null)),
    pendingTotal,
    graded: gradedRows.map((g) => toQueueItem(g.attempt, { total: g.total, maxTotal: g.maxTotal, gradedAt: g.gradedAt })),
  };
}

/** Bài chờ chấm cũ nhất kế tiếp trong phạm vi (bỏ qua bài vừa chấm và bài của
 * chính người chấm — không được tự chấm). */
export async function getNextPendingAttemptId(
  classIds: string[] | null,
  filters: GradingFilters,
  excludeId: string,
  graderId: string
): Promise<string | null> {
  if (classIds && classIds.length === 0) return null;
  const row = await prisma.practiceAttempt.findFirst({
    where: {
      ...attemptScopeWhere(classIds, filters),
      reviewStatus: "PENDING",
      id: { not: excludeId },
      userId: { not: graderId },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  return row?.id ?? null;
}

export interface GradingFilterOptions {
  classes: { id: string; code: string }[];
  assignments: { id: string; title: string; classId: string; classCode: string; pending: number }[];
}

/** Số bài tập gần nhất chỉ còn bài đã chấm (không còn bài chờ) đưa vào ô lọc. */
const GRADED_ONLY_ASSIGNMENT_LIMIT = 100;

const filterAssignmentSelect = {
  id: true,
  title: true,
  classId: true,
  createdAt: true,
  class: { select: { code: true } },
  _count: { select: { attempts: { where: { reviewStatus: "PENDING" } } } },
} satisfies Prisma.AssignmentSelect;

/** Lớp và bài tập (trong phạm vi) cho ô lọc: MỌI bài tập còn bài chờ chấm + tối
 * đa GRADED_ONLY_ASSIGNMENT_LIMIT bài tập gần nhất chỉ còn bài đã chấm.
 * `selected` (bộ lọc trên URL, vd. link "Chấm bài" từ trang bài tập) luôn được
 * thêm vào nếu nằm trong phạm vi, kể cả khi chưa có bài nộp — để ô chọn hiển thị
 * đúng bộ lọc đang áp dụng. Không có trong kết quả = không tồn tại / ngoài phạm vi. */
export async function getGradingFilterOptions(
  classIds: string[] | null,
  selected: GradingFilters = NO_GRADING_FILTERS
): Promise<GradingFilterOptions> {
  if (classIds && classIds.length === 0) return { classes: [], assignments: [] };
  const scope: Prisma.AssignmentWhereInput = classIds ? { classId: { in: classIds } } : {};
  const [withPending, gradedOnly] = await Promise.all([
    prisma.assignment.findMany({
      where: { ...scope, attempts: { some: { reviewStatus: "PENDING" } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: filterAssignmentSelect,
    }),
    prisma.assignment.findMany({
      where: { ...scope, attempts: { some: { reviewStatus: "GRADED" }, none: { reviewStatus: "PENDING" } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: GRADED_ONLY_ASSIGNMENT_LIMIT,
      select: filterAssignmentSelect,
    }),
  ]);
  const rows = [...withPending, ...gradedOnly];
  if (selected.assignmentId && !rows.some((r) => r.id === selected.assignmentId)) {
    const extra = await prisma.assignment.findFirst({
      where: { ...scope, id: selected.assignmentId },
      select: filterAssignmentSelect,
    });
    if (extra) rows.push(extra);
  }
  rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1));

  const classes = new Map<string, string>();
  for (const r of rows) classes.set(r.classId, r.class.code);
  if (selected.classId && !classes.has(selected.classId) && (!classIds || classIds.includes(selected.classId))) {
    const cls = await prisma.class.findUnique({ where: { id: selected.classId }, select: { id: true, code: true } });
    if (cls) classes.set(cls.id, cls.code);
  }
  return {
    classes: [...classes.entries()].map(([id, code]) => ({ id, code })).sort((a, b) => a.code.localeCompare(b.code, "vi")),
    assignments: rows.map((r) => ({
      id: r.id,
      title: r.title,
      classId: r.classId,
      classCode: r.class.code,
      pending: r._count.attempts,
    })),
  };
}

// ===== Chi tiết 1 bài =====

/** Tiêu chí rubric (key) → tiêu chí AI tương ứng để gợi ý điểm. */
const AI_KEY_FOR_RUBRIC: Record<string, string> = {
  content: "content",
  form: "form",
  grammar: "grammar",
  vocabulary: "vocabulary",
  spelling: "spelling",
  fluency: "fluency",
  pronunciation: "pronunciation",
  development: "structureDevelopment",
  linguisticRange: "vocabulary",
  appropriacy: "content",
  formal: "form",
  conventions: "form",
  organization: "structureDevelopment",
};

const AI_LABELS: Record<string, string> = {
  ...CRITERION_LABELS,
  pronunciation: "Phát âm",
  fluency: "Độ trôi chảy",
};

export interface PromptView {
  label: string;
  text: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
}

export type AnswerView =
  | { kind: "text"; text: string; wordCount: number }
  | {
      kind: "speech";
      audioUrl: string | null;
      transcript: string | null;
      durationSeconds: number | null;
      wordsPerMinute: number | null;
    };

export interface AiCriterionView {
  key: string;
  label: string;
  scorePct: number;
  feedback: string;
}

export interface AiGradeView {
  scorePct: number;
  pteScore: number;
  criteria: AiCriterionView[];
  generalFeedback: string | null;
  appliedRules: string[];
  formCheck: { wordCount: number; sentenceCount: number; reason: string } | null;
}

export interface GradeCriterionInput extends RubricCriterion {
  /** Điểm AI gợi ý (đã quy về thang của tiêu chí), null = AI không có tiêu chí tương ứng. */
  aiHint: number | null;
}

export interface SavedGradeView {
  criteria: (RubricCriterion & { score: number })[];
  total: number;
  maxTotal: number;
  comment: string | null;
  gradedAt: Date;
  gradedByName: string;
  /** Phiên bản rubric lúc chấm (0 = bản mặc định). */
  rubricVersion: number;
}

export interface GradingDetail {
  id: string;
  reviewStatus: ReviewStatus;
  student: { id: string; name: string; email: string };
  classCode: string;
  assignmentTitle: string;
  submittedAt: Date;
  type: { id: string; code: string; name: string; skill: Skill | null };
  questionCode: string;
  prompt: PromptView;
  answer: AnswerView;
  ai: AiGradeView | null;
  rubric: Rubric | null;
  /** Tiêu chí rubric đang dùng + gợi ý AI (rỗng khi dạng bài chưa có rubric). */
  criteria: GradeCriterionInput[];
  saved: SavedGradeView | null;
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function str(obj: JsonRecord | null, key: string): string | null {
  const v = obj?.[key];
  return typeof v === "string" && v.trim() ? v : null;
}

function num(obj: JsonRecord | null, key: string): number | null {
  const v = obj?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Chỉ nhận đường dẫn nội bộ (/uploads/...) hoặc https — không render URL lạ. */
export function safeMediaUrl(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  try {
    return new URL(v).protocol === "https:" ? v : null;
  } catch {
    return null;
  }
}

function buildPrompt(typeId: string, content: JsonRecord | null): PromptView {
  const view = (label: string, text: string | null, imageUrl: string | null = null, audioUrl: string | null = null): PromptView => ({
    label,
    text,
    imageUrl: safeMediaUrl(imageUrl),
    audioUrl: safeMediaUrl(audioUrl),
  });
  switch (typeId) {
    case "write-essay":
      return view("Đề bài", str(content, "prompt") ?? str(content, "passage"));
    case "summarize-written-text":
      return view("Đoạn văn cần tóm tắt", str(content, "passage") ?? str(content, "prompt"));
    case "write-email":
      return view("Đề bài", str(content, "prompt") ?? str(content, "situationText") ?? str(content, "passage"));
    case "read-aloud":
      return view("Đoạn văn cần đọc", str(content, "passage"));
    case "describe-image":
      return view("Hình ảnh cần mô tả", str(content, "description"), str(content, "imageUrl"));
    case "respond-to-situation":
      return view("Tình huống", str(content, "situationText"));
    case "repeat-sentence":
      return view("Câu gốc", str(content, "referenceText") ?? str(content, "transcript"), null, str(content, "audioUrl"));
    case "retell-lecture":
    case "answer-short-question":
    case "summarize-group-discussion":
    case "summarize-spoken-text":
      return view(
        "Bài nghe",
        str(content, "transcript") ?? str(content, "question") ?? str(content, "referenceText"),
        null,
        str(content, "audioUrl")
      );
    default:
      return view(
        "Đề bài",
        str(content, "prompt") ??
          str(content, "passage") ??
          str(content, "situationText") ??
          str(content, "question") ??
          str(content, "referenceText") ??
          str(content, "transcript"),
        str(content, "imageUrl"),
        str(content, "audioUrl")
      );
  }
}

function buildAnswer(skill: Skill | null, response: JsonRecord | null, audioUrl: string | null): AnswerView {
  const text = typeof response?.text === "string" ? response.text : null;
  if (text !== null || (skill !== "speaking" && typeof response?.transcript !== "string")) {
    const t = text ?? "";
    return { kind: "text", text: t, wordCount: countWords(t) };
  }
  return {
    kind: "speech",
    audioUrl: safeMediaUrl(audioUrl),
    transcript: str(response, "transcript"),
    durationSeconds: num(response, "durationSeconds"),
    wordsPerMinute: num(response, "wordsPerMinute"),
  };
}

function buildAi(response: JsonRecord | null, scorePct: number, pteScore: number): AiGradeView | null {
  const grade = asRecord(response?.grade);
  if (!grade) return null;
  const criteriaObj = asRecord(grade.criteria);
  const criteria: AiCriterionView[] = criteriaObj
    ? Object.entries(criteriaObj).flatMap(([key, value]) => {
        const c = asRecord(value);
        const pct = num(c, "scorePct");
        if (pct === null) return [];
        return [{ key, label: AI_LABELS[key] ?? key, scorePct: Math.round(Math.max(0, Math.min(100, pct))), feedback: str(c, "feedback") ?? "" }];
      })
    : [];
  const rules = Array.isArray(grade.appliedRules) ? grade.appliedRules.filter((r): r is string => typeof r === "string" && r.trim() !== "") : [];
  const fc = asRecord(grade.formCheck);
  const wc = num(fc, "wordCount");
  const sc = num(fc, "sentenceCount");
  return {
    scorePct,
    pteScore,
    criteria,
    generalFeedback: str(grade, "generalFeedback"),
    appliedRules: rules,
    formCheck: fc && wc !== null && sc !== null ? { wordCount: wc, sentenceCount: sc, reason: str(fc, "reason") ?? "" } : null,
  };
}

/** Gợi ý điểm từng tiêu chí rubric từ điểm % của AI: round(scorePct/100 × max). */
export function buildCriteriaWithHints(criteria: RubricCriterion[], ai: AiGradeView | null): GradeCriterionInput[] {
  const pctByKey = new Map((ai?.criteria ?? []).map((c) => [c.key, c.scorePct]));
  return criteria.map((c) => {
    const aiKey = AI_KEY_FOR_RUBRIC[c.key];
    const pct = aiKey ? pctByKey.get(aiKey) : undefined;
    return { ...c, aiHint: pct === undefined ? null : Math.round((pct / 100) * c.max) };
  });
}

/** Bản chụp điểm đã lưu [{key,label,max,score}] — đọc an toàn từ JSON. */
export function parseGradeCriteria(value: unknown): (RubricCriterion & { score: number })[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const c = asRecord(item);
    const key = str(c, "key");
    const label = str(c, "label");
    const max = num(c, "max");
    const score = num(c, "score");
    return key && label && max !== null && score !== null ? [{ key, label, max, score }] : [];
  });
}

/** Chi tiết 1 bài — null nếu không tồn tại, ngoài phạm vi lớp, hoặc không phải bài giáo viên chấm. */
export async function getGradingDetail(attemptId: string, classIds: string[] | null): Promise<GradingDetail | null> {
  if (classIds && classIds.length === 0) return null;
  const row = await prisma.practiceAttempt.findFirst({
    where: { id: attemptId, reviewStatus: { in: ["PENDING", "GRADED"] }, ...attemptScopeWhere(classIds, NO_GRADING_FILTERS) },
    select: {
      id: true,
      questionTypeId: true,
      scorePct: true,
      pteScore: true,
      response: true,
      audioUrl: true,
      createdAt: true,
      reviewStatus: true,
      user: { select: { id: true, name: true, email: true } },
      assignment: { select: { title: true, class: { select: { code: true } } } },
      question: { select: { code: true, content: true } },
      grade: {
        select: {
          criteria: true,
          total: true,
          maxTotal: true,
          comment: true,
          gradedAt: true,
          rubric: { select: { version: true } },
          gradedBy: { select: { name: true } },
        },
      },
    },
  });
  if (!row || !row.reviewStatus) return null;

  const qt = findQuestionType(row.questionTypeId);
  const response = asRecord(row.response);
  const ai = buildAi(response, row.scorePct, row.pteScore);
  const rubric = await getActiveRubric(row.questionTypeId);

  return {
    id: row.id,
    reviewStatus: row.reviewStatus,
    student: row.user,
    classCode: row.assignment?.class.code ?? "",
    assignmentTitle: row.assignment?.title ?? "",
    submittedAt: row.createdAt,
    type: { id: row.questionTypeId, code: qt?.code ?? row.questionTypeId, name: qt?.name ?? row.questionTypeId, skill: qt?.skill ?? null },
    questionCode: row.question.code,
    prompt: buildPrompt(row.questionTypeId, asRecord(row.question.content)),
    answer: buildAnswer(qt?.skill ?? null, response, row.audioUrl),
    ai,
    rubric,
    criteria: rubric ? buildCriteriaWithHints(rubric.criteria, ai) : [],
    saved: row.grade
      ? {
          criteria: parseGradeCriteria(row.grade.criteria),
          total: row.grade.total,
          maxTotal: row.grade.maxTotal,
          comment: row.grade.comment,
          gradedAt: row.grade.gradedAt,
          gradedByName: row.grade.gradedBy.name,
          rubricVersion: row.grade.rubric?.version ?? 0,
        }
      : null,
  };
}

// ===== Cài đặt rubric =====

/** Dạng bài được phép cấu hình rubric giáo viên chấm: Speaking, Writing và
 * Summarize Spoken Text (bài viết tự do của phần Listening). */
export function isRubricEligibleType(typeId: string): boolean {
  const qt = findQuestionType(typeId);
  return !!qt && (qt.skill === "speaking" || qt.skill === "writing" || qt.id === "summarize-spoken-text");
}

export interface RubricOverviewRow {
  questionTypeId: string;
  code: string;
  name: string;
  skill: Skill;
  rubric: Rubric;
  isDefault: boolean;
  updatedAt: Date | null;
  updatedByName: string | null;
}

export interface RubricOverview {
  rows: RubricOverviewRow[];
  /** Dạng bài Speaking/Writing chưa có rubric — để thêm mới. */
  addableTypes: { id: string; code: string; name: string }[];
}

export async function getRubricOverview(): Promise<RubricOverview> {
  const dbRows = await prisma.gradingRubric.findMany({
    where: { isActive: true },
    orderBy: [{ questionTypeId: "asc" }, { version: "desc" }],
  });
  const latestByType = new Map<string, (typeof dbRows)[number]>();
  for (const r of dbRows) if (!latestByType.has(r.questionTypeId)) latestByType.set(r.questionTypeId, r);

  const creatorIds = [...new Set([...latestByType.values()].map((r) => r.createdById).filter((id): id is string => !!id))];
  const creators = creatorIds.length
    ? await prisma.user.findMany({ where: { id: { in: creatorIds } }, select: { id: true, name: true } })
    : [];
  const creatorName = new Map(creators.map((u) => [u.id, u.name]));

  const typeIds = new Set([...Object.keys(DEFAULT_RUBRICS), ...latestByType.keys()]);
  const rows: RubricOverviewRow[] = [];
  for (const qt of QUESTION_TYPES) {
    if (!typeIds.has(qt.id)) continue;
    const db = latestByType.get(qt.id);
    if (db) {
      rows.push({
        questionTypeId: qt.id,
        code: qt.code,
        name: qt.name,
        skill: qt.skill,
        rubric: { id: db.id, questionTypeId: qt.id, version: db.version, criteria: parseCriteria(db.criteria), note: db.note },
        isDefault: false,
        updatedAt: db.createdAt,
        updatedByName: db.createdById ? (creatorName.get(db.createdById) ?? null) : null,
      });
    } else {
      rows.push({
        questionTypeId: qt.id,
        code: qt.code,
        name: qt.name,
        skill: qt.skill,
        rubric: {
          id: null,
          questionTypeId: qt.id,
          version: 0,
          criteria: DEFAULT_RUBRICS[qt.id] ?? [],
          note: "Bản mặc định — chưa đối chiếu Pearson",
        },
        isDefault: true,
        updatedAt: null,
        updatedByName: null,
      });
    }
  }

  const addableTypes = QUESTION_TYPES.filter((qt) => !typeIds.has(qt.id) && isRubricEligibleType(qt.id)).map((qt) => ({
    id: qt.id,
    code: qt.code,
    name: qt.name,
  }));
  return { rows, addableTypes };
}
