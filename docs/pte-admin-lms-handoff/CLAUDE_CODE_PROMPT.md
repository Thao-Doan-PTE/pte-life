# Prompt dán vào Claude Code

Chép thư mục `pte-admin-lms-handoff/` vào gốc repo (VD: `docs/pte-admin-lms-handoff/`), mở Claude Code tại repo rồi dán đoạn dưới:

---

Mình cần làm lại trang `/admin` của PTE-Life thành Admin LMS.

Tài liệu đặc tả: `docs/pte-admin-lms-handoff/HANDOFF.md`
Prototype giao diện (mở bằng trình duyệt để xem, đọc code để lấy layout/token/logic UI): `docs/pte-admin-lms-handoff/prototype/admin-lms-prototype.html`

Yêu cầu:
1. Đọc kỹ HANDOFF.md và prototype trước.
2. Khảo sát repo: stack, schema/ORM, auth & role, trang /admin hiện tại và các trang Người dùng, Lớp học, Quản lý ngân hàng đề. Báo lại cho mình: cái gì đã có, cái gì cần thêm, đề xuất thay đổi schema (migration) — **chờ mình duyệt rồi mới sửa schema**.
3. Triển khai theo lộ trình ở mục 8 của HANDOFF.md, mỗi giai đoạn dừng lại cho mình xem.
4. Bắt buộc: giữ nguyên hành vi đổi gói / gia hạn / bảo lưu và dữ liệu nhật ký cũ; phân quyền kiểm tra ở server; dùng component/theme có sẵn trong repo nếu có, chỉ thêm token màu v3 khi thiếu.
5. Prototype dùng dữ liệu mẫu và vanilla JS — không copy nguyên, hãy viết lại theo kiến trúc của repo (component, server action/API, ORM).
6. Những điểm đánh dấu ⚠️ trong HANDOFF.md (rubric, ngưỡng điểm, mã màu đỏ, danh sách dạng bài) → làm dạng cấu hình, đừng hard-code.
7. Kết thúc mỗi giai đoạn: chạy lint/typecheck/test có sẵn và tự đối chiếu checklist mục 9.
