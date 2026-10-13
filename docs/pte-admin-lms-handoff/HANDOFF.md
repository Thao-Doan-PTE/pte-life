# PTE-Life Admin LMS — Handoff cho Claude Code

> Người yêu cầu: Thảo Đoàn (Trưởng phòng Marketing, PTE-Life)
> Ngày: 12/10/2026
> Prototype tham chiếu: `prototype/admin-lms-prototype.html` (mở trực tiếp bằng trình duyệt, dữ liệu mẫu, toàn bộ logic UI nằm trong 1 file)

## 1. Mục tiêu

Thay trang `/admin` hiện tại (chỉ là danh sách thẻ "Quản lý gói học & bảo lưu") bằng một **Admin LMS** điều hành toàn bộ vòng đời học viên:

**Test đầu vào → Xếp lớp → Giao bài → Chấm bài → Gia hạn / Bảo lưu**

Ba nhóm người dùng nội bộ: **Admin**, **Giáo viên**, **Vận hành/CSKH**. Mỗi nhóm chỉ thấy phần việc của mình.

## 2. Hiện trạng (đã quan sát trên localhost:3000/admin)

- App Next.js (dev badge "N"), route `/admin`.
- Trang hiện có: danh sách học viên dạng thẻ, mỗi thẻ có: tên, email, gói (PTE Academic / PTE Core), ngày hết hạn, số lượt bảo lưu còn lại; thao tác **Đổi gói + Lưu**, **Gia hạn (ngày)**, **Dùng 1 lượt bảo lưu**.
- Cuối trang có **Nhật ký thao tác gần đây** (VD: "Trần Minh — Dùng 1 lượt bảo lưu, gia hạn 30 ngày (hạn mới: 15/12/2026)").
- Có link sang các trang: **Người dùng**, **Lớp học**, **Quản lý ngân hàng đề** → cần kiểm tra trong repo xem đã có model/API nào, **tái sử dụng thay vì viết lại**.
- Website học viên có các khu: Test đầu vào PTE, Luyện đề PTE, Luyện đề Tủ.

⚠️ Không được làm mất hoặc thay đổi hành vi của 3 thao tác hiện có (đổi gói, gia hạn, bảo lưu) và dữ liệu nhật ký cũ.

## 3. Cấu trúc điều hướng

Sidebar trái (nền than ấm), nhóm theo chức năng:

| Nhóm | Mục | Route đề xuất | Admin | Giáo viên | CSKH |
|---|---|---|:-:|:-:|:-:|
| Vận hành | Tổng quan | `/admin` | ✓ | ✓ (chỉ lớp mình) | ✓ |
| Vận hành | Học viên & gói học | `/admin/students` | ✓ | – | ✓ |
| Vận hành | Test đầu vào | `/admin/entry-tests` | ✓ | ✓ (xem) | ✓ |
| Đào tạo | Lớp học | `/admin/classes` | ✓ | ✓ (lớp mình) | ✓ (xem) |
| Đào tạo | Giao bài tập | `/admin/assignments` | ✓ | ✓ (lớp mình) | – |
| Đào tạo | Chấm bài | `/admin/grading` | ✓ | ✓ (lớp mình) | – |
| Đào tạo | Giáo viên | `/admin/teachers` | ✓ | – | – |
| Nội dung | Ngân hàng đề | `/admin/question-bank` | ✓ (sửa) | ✓ (xem) | – |
| Nội dung | Nhật ký thao tác | `/admin/logs` | ✓ | – | ✓ |

**Phân quyền phải kiểm tra ở server (API/server action/middleware), không chỉ ẩn menu.** Trong prototype có ô "Đang xem với vai trò" chỉ để demo — bản thật lấy role từ session.

Menu hiện badge đỏ đếm việc tồn: Học viên (hết hạn + sắp hết hạn), Test đầu vào (chưa xếp lớp), Chấm bài (chờ chấm).

## 4. Đặc tả từng màn hình

### 4.1 Tổng quan
- 4 KPI (bấm được, dẫn tới màn tương ứng): Học viên đang học · Hết hạn/sắp hết hạn ≤14 ngày · Bài chờ chấm · Tỷ lệ nộp bài tuần này (tổng đã nộp / tổng phải nộp của các bài đang mở).
- Panel **Cần xử lý**: gộp 3 loại việc, mỗi dòng có thanh màu trạng thái + nút hành động:
  - Học viên hết hạn / sắp hết hạn → "Xử lý" (mở hồ sơ). *Ẩn với Giáo viên.*
  - Bài chờ chấm (cũ nhất lên trước) → "Chấm". *Ẩn với CSKH.*
  - Người test đầu vào chưa xếp lớp → "Xếp lớp".
- Panel **Tiến độ lớp**: buổi đã học/tổng buổi, tỷ lệ nộp bài (đỏ nếu < 60%).

### 4.2 Học viên & gói học
- Bảng: Học viên (avatar chữ cái, tên, email) · Gói · Lớp · Hết hạn · Bảo lưu còn · Đầu vào → mục tiêu · Tiến độ · Trạng thái.
- Tìm theo tên/email; lọc gói (Tất cả/Academic/Core); lọc trạng thái (Đang học/Sắp hết hạn/Hết hạn/Bảo lưu). Mặc định sắp xếp theo hạn gần nhất.
- Bấm dòng → **drawer hồ sơ** bên phải:
  - Chips: gói, trạng thái, lớp + giáo viên.
  - Ô số: Hết hạn · Bảo lưu còn · Đầu vào → mục tiêu.
  - **Gói học & thời hạn**: Đổi gói + Lưu; Gia hạn với nút nhanh +30/+60/+90 và ô nhập số ngày; Dùng 1 lượt bảo lưu (xác nhận 2 bước, ẩn khi hết lượt).
  - **Xếp lớp**: dropdown chỉ hiện lớp cùng gói.
  - **Tiến độ theo kỹ năng** (Speaking/Writing/Reading/Listening) + hoạt động gần nhất.
  - **Lịch sử thao tác** của riêng học viên (5 dòng gần nhất).
  - Đóng bằng ✕, click nền mờ, hoặc phím Esc.

### 4.3 Test đầu vào
- Bảng: người làm test (học viên hoặc khách tiềm năng) · ngày · Overall · S/W/R/L · Lộ trình đề xuất + lớp gợi ý · hành động.
- Học viên chưa xếp lớp → nút "Xếp vào <lớp>". Khách tiềm năng (chưa có tài khoản học viên) → nhãn "Khách tiềm năng" + nút "Chuyển tư vấn" (tạo lead cho Sales — tích hợp CRM tuỳ hệ thống hiện có; nếu chưa có thì ghi log + TODO).

### 4.4 Lớp học
- Thẻ lớp: tên, gói, mã lớp, giáo viên, lịch học, ngày khai giảng, sĩ số, số bài đang mở, thanh tiến độ buổi học, tiến độ luyện đề TB, avatar học viên.
- Nút "Giao bài cho lớp" (mở Giao bài tập với lớp chọn sẵn), "Danh sách HV" (mở Học viên lọc theo lớp — prototype chưa lọc, bản thật cần lọc).

### 4.5 Giao bài tập
- Trái: bảng bài đang mở — tên, hình thức (Luyện đề / Luyện đề Tủ / Mock test), mã dạng bài, số câu, lớp, hạn nộp (hiện "Quá hạn N ngày" màu đỏ), đã nộp/tổng.
- Phải: form giao bài mới — tên, lớp, hình thức, dạng bài (checkbox, **lọc theo gói của lớp**), số câu, hạn nộp, tick "Gửi thông báo cho học viên".
- Bản thật: chọn câu cụ thể từ ngân hàng đề (ngẫu nhiên theo dạng hoặc chọn tay; ưu tiên câu Tủ nếu hình thức = Luyện đề Tủ).

### 4.6 Chấm bài
- Trái: hàng chờ (chờ chấm, cũ nhất trước) + danh sách đã chấm.
- Phải: bài làm — Writing hiện văn bản + số từ; Speaking hiện trình phát audio + điểm AI sơ bộ để giáo viên xác nhận/điều chỉnh.
- Form điểm theo tiêu chí của dạng bài, tổng tự cộng, ô nhận xét, nút "Lưu điểm & trả bài" → tự chuyển sang bài kế tiếp.

### 4.7 Giáo viên
- Bảng: giáo viên · chuyên môn · lớp phụ trách · số học viên · số bài chờ chấm.

### 4.8 Ngân hàng đề
- 4 thẻ tổng: Speaking & Writing · Reading · Listening · Câu thuộc đề Tủ. Bấm thẻ kỹ năng để lọc.
- Bảng dạng bài: mã · tên · áp dụng (Academic/Core/cả hai) · tổng câu (hoặc câu Tủ khi tick "Chỉ xem số câu Tủ") · tỷ lệ Tủ · cách chấm (Tự động / AI / Giáo viên) · "Xem câu".
- Admin có "+ Thêm câu hỏi". Nếu repo đã có trang "Quản lý ngân hàng đề" thì gắn vào đó.

### 4.9 Nhật ký thao tác
- Danh sách: ngày · nội dung · vai trò người thao tác. Bản thật cần lưu cả user id, IP/time đầy đủ, dữ liệu trước/sau (JSON).

## 5. Quy tắc nghiệp vụ

**Trạng thái học viên** (ưu tiên từ trên xuống):
1. Có `reservedUntil` trong tương lai → "Bảo lưu đến dd/mm/yyyy"
2. `expiresAt < hôm nay` → "Hết hạn"
3. Còn ≤ 14 ngày → "Còn N ngày" (cảnh báo)
4. Còn lại → "Đang học"

**Gia hạn**: số ngày nguyên > 0; `expiresAt += N ngày`; ghi log `"<Tên> — Gia hạn N ngày (hạn mới: dd/mm/yyyy)"` (giữ đúng format log hiện có).

**Bảo lưu**: chỉ khi `reserveLeft > 0`; `reserveLeft -= 1`, `expiresAt += 30 ngày`; log `"<Tên> — Dùng 1 lượt bảo lưu, gia hạn 30 ngày (hạn mới: …)"`. → **Kiểm tra lại logic hiện có trong repo, giữ nguyên nếu khác.**

**Đổi gói**: nếu lớp hiện tại không cùng gói mới → gỡ khỏi lớp. Log `"<Tên> — Đổi gói học sang PTE <Gói>"`.

**Xếp lớp**: chỉ vào lớp cùng gói.

**Đề xuất lộ trình từ test đầu vào** (⚠️ ngưỡng tạm, cần chị Thảo/đội chuyên môn xác nhận, nên để cấu hình được):
| Overall | Lộ trình | Lớp gợi ý |
|---|---|---|
| < 36 | Foundation | — |
| 36–49 | PTE 50+ | Core K05 / Academic K13 |
| 50–57 | PTE 58+ | Academic K13 |
| ≥ 58 | PTE 65+ | Academic K12 |

**Giao bài**: bắt buộc tên + ≥1 dạng bài; số học viên phải nộp = sĩ số lớp tại thời điểm giao.

**Chấm bài**: mỗi tiêu chí trong `0..max`, đủ tất cả tiêu chí mới lưu; tổng = cộng các tiêu chí; ghi log.

**Rubric trong prototype** (⚠️ bản tham khảo, phải đối chiếu rubric Pearson hiện hành trước khi dùng; nên lưu dạng cấu hình/bảng DB, không hard-code):
- WE: Content 6, Form 2, Development/structure/coherence 6, Grammar 2, General linguistic range 6, Vocabulary range 2, Spelling 2
- SWT: Content 4, Form 1, Grammar 2, Vocabulary 2
- Write Email (Core): Content 3, Formal requirements 2, Grammar 2, Vocabulary 2, Spelling 2, Email conventions 2, Organization 2
- RA: Content 5, Oral fluency 5, Pronunciation 5
- DI: Content 6, Oral fluency 5, Pronunciation 5
- RTS: Appropriacy 3, Oral fluency 5, Pronunciation 5

**Dạng bài trong ngân hàng đề** (mã dùng trong UI):
- Speaking & Writing: RA, RS, DI, RL (Academic), ASQ, SGD (Academic), RTS, SWT (Academic), WE (Academic), WEM (Core)
- Reading: RWFIB, RMCM, RO, RFIB, RMCS
- Listening: SST, LMCM, LFIB, HCS (Academic), LMCS, SMW, HIW, WFD
- ⚠️ Danh sách dạng bài theo Academic/Core cần đối chiếu cấu trúc đề Pearson hiện hành.

## 6. Mô hình dữ liệu đề xuất

Chỉ là gợi ý — **ưu tiên khớp với schema/ORM đang có trong repo**.

```
User            id, name, email, role: ADMIN | TEACHER | CSKH | STUDENT
StudentPlan     userId, package: ACADEMIC | CORE, expiresAt, reserveLeft, reservedUntil?, entryScore?, targetScore?
Teacher         userId, specialty
Class           id(code), name, package, targetScore, teacherId, schedule, startDate, sessionsDone, sessionsTotal
ClassMember     classId, userId, joinedAt
QuestionType    code, name, skill: SW | R | L, appliesTo: ACADEMIC | CORE | BOTH, gradingMode: AUTO | AI | TEACHER
Question        id, typeCode, content(json), isTu(bool), source, updatedAt
Assignment      id, title, classId, kind: PRACTICE | TU | MOCK, dueAt, createdBy, notify(bool)
AssignmentItem  assignmentId, questionId
Submission      id, assignmentId?, userId, questionId, answerText?, audioUrl?, aiScore(json)?, status: PENDING | GRADED, submittedAt
Grade           submissionId, criteria(json), total, maxTotal, comment, gradedBy, gradedAt
Rubric          typeCode, criteria(json: [{name,max}])
EntryTest       id, userId? | leadName/leadEmail, takenAt, overall, s, w, r, l, placed(bool)
AuditLog        id, actorId, actorRole, targetUserId?, action, message, before(json), after(json), createdAt
```

## 7. Thiết kế (Hệ màu PTE-Life v3)

- 60-30-10: nền trắng/kem 60% · than ấm (chữ, sidebar) 30% · đỏ thương hiệu 10% chỉ cho CTA, trạng thái active, cảnh báo, tiến độ.
- **Không dùng xanh dương/navy** (v3 hợp mệnh Hỏa). Màu thông tin dùng **plum**.
- Nút đỏ: hover đậm hơn ~10%, focus có viền; chữ thân bài tương phản ≥ 4.5:1.
- Token (lấy từ prototype, có cả dark mode):
  - `--bg #FFFFFF`, `--surface #FBF8F3`, `--surface-2 #F3EDE4`, `--line #E7DED2`
  - `--ink #2A2421`, `--ink-2 #5D534C`, `--ink-3 #8A7F76`
  - `--brand #D0202B` (⚠️ thay bằng mã đỏ logo chính xác nếu repo đã có), `--brand-hover #B21A24`, `--brand-soft #FCEAE8`
  - `--plum #7B3F6E`, `--ok #2C7647`, `--warn #9A5B0E`
- Font: Be Vietnam Pro (UI), IBM Plex Mono (số liệu, tabular-nums). Nếu repo đã có font/theme, dùng của repo.
- Responsive: < 860px sidebar thành menu trượt; bảng cuộn ngang trong khung.

## 8. Lộ trình triển khai đề xuất

1. **Khảo sát repo**: stack, ORM/schema, auth/role, các trang Người dùng / Lớp học / Ngân hàng đề hiện có. Báo lại trước khi sửa schema.
2. **Khung admin**: layout sidebar + topbar, phân quyền theo role (middleware + check ở server), design tokens.
3. **Học viên & gói học**: chuyển 3 thao tác hiện có vào bảng + drawer, giữ nguyên API/logic cũ, giữ format nhật ký.
4. **Tổng quan** + **Nhật ký**.
5. **Lớp học** + **Giáo viên**.
6. **Ngân hàng đề** (gắn trang cũ) → **Giao bài tập**.
7. **Chấm bài** (rubric cấu hình được).
8. **Test đầu vào** + xếp lớp + chuyển tư vấn.

Mỗi giai đoạn nên là 1 commit/PR riêng, có seed dữ liệu demo.

## 9. Tiêu chí nghiệm thu

- [ ] Đổi gói / gia hạn / bảo lưu hoạt động như trang cũ, log đúng format cũ, dữ liệu cũ còn nguyên.
- [ ] Giáo viên gọi API học viên/gói học bị chặn (403), không chỉ bị ẩn menu.
- [ ] Giáo viên chỉ thấy lớp, bài giao, bài chấm của lớp mình.
- [ ] Bộ lọc + tìm kiếm học viên đúng; trạng thái tính đúng theo mục 5.
- [ ] Không gia hạn được với số ngày ≤ 0; không bảo lưu được khi hết lượt.
- [ ] Xếp lớp chỉ cho lớp cùng gói; đổi gói khác loại tự gỡ khỏi lớp.
- [ ] Giao bài bắt buộc tên + dạng bài; dạng bài lọc theo gói lớp.
- [ ] Chấm bài chặn điểm ngoài khoảng; lưu xong chuyển bài kế tiếp.
- [ ] Mọi thao tác thay đổi dữ liệu đều có AuditLog.
- [ ] Giao diện dùng được ở màn hình 390px, không cuộn ngang trang.
- [ ] Đủ light/dark mode.

## 10. Việc còn mở (cần chị Thảo quyết)

1. Ngưỡng điểm đề xuất lộ trình test đầu vào.
2. Rubric chấm chính thức cho từng dạng bài.
3. "Chuyển tư vấn" đẩy lead sang đâu CRM?
4. Điểm AI cho Speaking: đã có engine chấm chưa, hay giai đoạn đầu giáo viên chấm tay?
5. Gửi thông báo bài tập qua kênh nào thông báo trong app và Zalo
