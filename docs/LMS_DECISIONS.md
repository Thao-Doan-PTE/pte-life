# LMS — Các giả định đã tự quyết (Giai đoạn 1)

Theo mục 0.7 của spec ("chọn phương án đơn giản, hợp lý nhất... chỉ dừng lại
hỏi khi quyết định đó khó đảo ngược"). Các quyết định dưới đây là loại có thể
đảo ngược dễ dàng, nên đã tự quyết mà không hỏi lại. Quyết định về hệ thống
role (đổi `role` đơn → `roles[]`) là loại khó đảo ngược nên **đã hỏi và được
xác nhận** trước khi làm — không liệt kê lại ở đây.

## 1. Audit log — model mới, không tái sử dụng `ReservationLog`

`ReservationLog` hiện có chỉ dành riêng cho 3 hành động: `extend`,
`reservation`, `change_package` trên `User` (đổi gói/gia hạn/bảo lưu). Thay vì
mở rộng nó thành audit log tổng quát (rủi ro hơn vì nhiều nơi khác đang phụ
thuộc đúng 3 action string này), đã tạo model `AuditLog` mới, tổng quát hơn
(`actorId`, `action`, `entityType`, `entityId`, `detail`) — dùng cho mọi thao
tác Class/ClassTeacher/ClassEnrollment và quản lý role/status user. Hai bảng
tồn tại song song, mỗi bảng phụ trách 1 domain riêng.

## 2. Không thêm `middleware.ts`

Codebase hiện tại không có `middleware.ts` — mọi trang admin tự kiểm tra
quyền ở đầu file (`if (!session?.user || !isAdmin(...)) redirect("/")`). Các
trang LMS mới (`/admin/users`, `/admin/classes`, `/admin/classes/[id]`) tiếp
tục đúng pattern này thay vì giới thiệu middleware toàn cục, để không ảnh
hưởng các route khác không liên quan.

## 3. Import CSV/Excel cho trang Người dùng — hoãn

Mục A2 của spec có nhắc "import học viên từ file CSV/Excel". Giai đoạn 1 tập
trung làm xong CRUD role/status qua UI trước; import hàng loạt sẽ làm ở lượt
sau khi có nhu cầu thực tế cụ thể hơn (Giai đoạn 5 của spec cũng liệt kê "Import
học viên hàng loạt nâng cao" là việc làm sau).

## 4. Seed demo dùng tài khoản ADMIN thay OPS khi test quyền OPS

Ma trận quyền của spec cho OPS gần như trùng với ADMIN ở phạm vi Giai đoạn 1
(tạo/sửa lớp, gán giáo viên, thêm học viên). Seed chưa tạo riêng 1 tài khoản
OPS demo — dùng `admin@ptelife.vn` (role ADMIN, đã là superset của OPS trong
`OPS_ROLES = ["ADMIN", "OPS", "ACADEMIC_LEAD"]`) để nghiệm thu các luồng OPS.
Có thể thêm tài khoản OPS demo riêng nếu cần phân biệt rõ hơn ở giai đoạn sau.
