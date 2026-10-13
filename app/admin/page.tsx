import { AdminContent, AdminPageHeader, Kpi } from "@/components/admin/admin-ui";
import { ClassOverviewPanel } from "@/components/admin/overview/class-overview-panel";
import { NeedsActionPanel, TODO_LIMIT } from "@/components/admin/overview/needs-action-panel";
import { can, getScopedClassIdsFor, hasUnscopedAccess, isTeacherOnly, requireAdminPage } from "@/lib/admin/permissions";
import { countPendingGrading, countUnplacedEntryTests } from "@/lib/admin/nav-queries";
import {
  getExpiringStudentCounts,
  getExpiringStudentTodos,
  getOpenClassCounts,
  getOpenClassRows,
  getPendingGradingTodos,
  getStudyingStudentStats,
  getUnplacedEntryTestTodos,
  getWeeklySubmissionStats,
} from "@/lib/admin/overview-queries";
import { formatVnDate } from "@/lib/admin/student-status";

const CLASS_ROWS_LIMIT = 10;
const NO_EXPIRING = { expired: 0, soon: 0, total: 0 };
/** Bộ lọc "Cần xử lý" ở trang Học viên dùng đúng expiringStudentsWhere → cùng số với KPI. */
const EXPIRING_HREF = "/admin/students?status=attention";
/** Tỷ lệ nộp bài dưới ngưỡng này thì tô đỏ (HANDOFF mục 4.1). */
const LOW_SUBMISSION_PCT = 60;

/** Lưới KPI theo số ô đang hiện để không bị trống chỗ: 4 ô → 2×2 rồi 1 hàng 4;
 * 3 ô → 2 cột với ô cuối trải hết hàng, từ 860px là 1 hàng 3. */
const KPI_GRID: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 max-[860px]:[&>*:last-child]:col-span-2 min-[860px]:grid-cols-3",
  4: "grid-cols-2 min-[1100px]:grid-cols-4",
};

/** Tổng quan Admin LMS (HANDOFF.md mục 4.1). Giáo viên thuần chỉ thấy số liệu
 * lớp mình (giới hạn trong truy vấn qua getScopedClassIdsFor). Phạm vi lớp đi theo
 * quyền của từng phần: số liệu lớp/học viên theo viewOverview, bài chờ chấm theo
 * gradeSubmissions, tỷ lệ nộp bài theo manageAssignments — tài khoản OPS + TEACHER
 * thấy mọi lớp nhưng bài chờ chấm / bài tập chỉ của lớp mình phụ trách. Mỗi KPI /
 * loại việc chỉ hiện khi người xem có quyền tương ứng. */
export default async function AdminOverviewPage() {
  const user = await requireAdminPage("viewOverview");
  const teacherOnly = isTeacherOnly(user);

  const canStudents = can(user, "viewStudents");
  const canEntryTests = can(user, "viewEntryTests");
  const canClasses = can(user, "viewClasses");
  const canGrade = can(user, "gradeSubmissions");
  const canAssignments = can(user, "manageAssignments");

  const [classIds, gradingClassIds, manageAssignmentClassIds] = await Promise.all([
    getScopedClassIdsFor(user, "viewOverview"),
    canGrade ? getScopedClassIdsFor(user, "gradeSubmissions") : Promise.resolve<string[]>([]),
    canAssignments ? getScopedClassIdsFor(user, "manageAssignments") : Promise.resolve(null),
  ]);
  // Tỷ lệ nộp bài: người giao bài thấy đúng phạm vi bài tập mình quản lý (khớp trang
  // /admin/assignments mà ô KPI dẫn tới); người chỉ xem số liệu (vận hành thuần)
  // giữ phạm vi Tổng quan như trước.
  const assignmentClassIds = canAssignments ? manageAssignmentClassIds : classIds;
  // Việc gia hạn/xếp lớp là của vận hành — giáo viên thuần không thấy.
  const showPlanKpi = !teacherOnly;
  // Người chưa xếp lớp không thuộc lớp nào → chỉ người xem test đầu vào mọi lớp mới thấy (khớp badge menu).
  const showEntryTests = hasUnscopedAccess(user, "viewEntryTests");
  // Dòng "Xử lý" chỉ hiện cho người mở được hồ sơ học viên để xử lý gói học.
  const showExpiringTodos = canStudents;
  // Bài chờ chấm: chỉ người chấm bài (Admin, Trưởng học thuật, Giáo viên) — CSKH không thấy.
  const showPending = canGrade;
  // Ẩn panel khi người xem không phụ trách loại việc nào (tránh báo "Không còn việc tồn" sai).
  const showNeedsAction = showExpiringTodos || showPending || showEntryTests;

  const now = new Date();
  const [
    studentStats,
    classCounts,
    classRows,
    expiringCounts,
    pendingTotal,
    weekly,
    unplacedTotal,
    expiring,
    pending,
    unplaced,
  ] = await Promise.all([
    getStudyingStudentStats(classIds),
    getOpenClassCounts(classIds),
    getOpenClassRows(classIds, CLASS_ROWS_LIMIT),
    showPlanKpi || showExpiringTodos ? getExpiringStudentCounts(now) : Promise.resolve(NO_EXPIRING),
    showPending ? countPendingGrading(gradingClassIds) : Promise.resolve(0),
    getWeeklySubmissionStats(assignmentClassIds, now),
    showEntryTests ? countUnplacedEntryTests() : Promise.resolve(0),
    showExpiringTodos ? getExpiringStudentTodos(TODO_LIMIT, now) : Promise.resolve(null),
    showPending ? getPendingGradingTodos(gradingClassIds, TODO_LIMIT) : Promise.resolve(null),
    showEntryTests ? getUnplacedEntryTestTodos(TODO_LIMIT) : Promise.resolve(null),
  ]);

  const today = formatVnDate(now);
  const studentsHref = canStudents ? "/admin/students" : canClasses ? "/admin/classes" : undefined;
  const openClasses = classCounts.active + classCounts.upcoming;
  const oldestPending = pending?.[0]?.submittedAt;
  const kpiCount = 2 + (showPlanKpi ? 1 : 0) + (showPending ? 1 : 0);
  const lowSubmission = weekly.rate !== null && weekly.rate < LOW_SUBMISSION_PCT;

  return (
    <>
      <AdminPageHeader
        title="Tổng quan"
        sub={teacherOnly ? `Lớp của bạn · ${today}` : `Việc cần xử lý hôm nay, ${today}`}
      />
      <AdminContent>
        <div className={`grid gap-3 ${KPI_GRID[kpiCount] ?? KPI_GRID[4]}`}>
          <Kpi
            label="Học viên đang học"
            value={studentStats.studying}
            hint={
              studentStats.total !== null ? `Trên ${studentStats.total} tài khoản học viên` : "Trong các lớp bạn phụ trách"
            }
            href={studentsHref}
          />
          {showPlanKpi && (
            <Kpi
              label="Hết hạn / sắp hết hạn ≤14 ngày"
              value={expiringCounts.total}
              hint={`${expiringCounts.expired} đã hết hạn · ${expiringCounts.soon} sắp hết hạn`}
              href={canStudents ? EXPIRING_HREF : undefined}
              alert={expiringCounts.total > 0}
            />
          )}
          {showPending && (
            <Kpi
              label="Bài chờ chấm"
              value={pendingTotal}
              hint={oldestPending ? `Cũ nhất nộp ${formatVnDate(oldestPending)}` : "Speaking & Writing được giao"}
              href="/admin/grading"
              alert={pendingTotal > 0}
            />
          )}
          <Kpi
            label="Tỷ lệ nộp bài tuần này"
            value={
              weekly.rate === null ? (
                <>
                  <span aria-hidden="true">—</span>
                  <span className="sr-only">Chưa có lượt phải nộp</span>
                </>
              ) : (
                `${weekly.rate}%`
              )
            }
            // Không chỉ báo bằng màu đỏ (WCAG 1.4.1) — ghi rõ ngưỡng trong dòng phụ.
            hint={`${weekly.assignments} bài tập đang mở${lowSubmission ? ` · dưới ${LOW_SUBMISSION_PCT}%` : ""}`}
            href={canAssignments ? "/admin/assignments" : undefined}
            alert={lowSubmission}
          />
        </div>

        {showNeedsAction ? (
          <div className="grid gap-5 min-[1100px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] min-[1100px]:items-start">
            <NeedsActionPanel
              expiring={expiring}
              expiringCounts={expiringCounts}
              expiringAllHref={canStudents ? EXPIRING_HREF : null}
              pending={pending}
              pendingTotal={pendingTotal}
              pendingAllHref={showPending ? "/admin/grading" : null}
              unplaced={unplaced}
              unplacedTotal={unplacedTotal}
              unplacedAllHref={canEntryTests ? "/admin/entry-tests" : null}
              canOpenStudent={canStudents}
              unplacedFallbackHref={canEntryTests ? "/admin/entry-tests" : null}
            />
            <ClassOverviewPanel rows={classRows} total={openClasses} teacherOnly={teacherOnly} />
          </div>
        ) : (
          <ClassOverviewPanel rows={classRows} total={openClasses} teacherOnly={teacherOnly} />
        )}
      </AdminContent>
    </>
  );
}
