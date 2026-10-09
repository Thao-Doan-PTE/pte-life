# Câu lệnh mẫu dán vào Claude Code

Chép thư mục `pte-life-design-handoff/` vào gốc repo PTE-Life (ví dụ `docs/pte-life-design-handoff/`), mở Claude Code trong repo đó rồi dán lần lượt:

---

**Bước 1 — khảo sát, chưa sửa gì**

```
Đọc docs/pte-life-design-handoff/README.md và mở 2 file trong reference/.
Sau đó khảo sát repo: framework đang dùng, nơi đặt CSS/theme, các chỗ đang hard-code màu
(#1A2530, #1565C0, #5C6670, #F8F9FA, #F1F3F5, #DEE2E6, token "navy"), và component nào đang render
màn "Tổng quan của tôi". Báo lại kế hoạch áp dụng theo từng bước, chưa sửa code.
```

**Bước 2 — áp hệ màu v3**

```
Áp hệ màu v3: đưa tokens/tokens.css (và tailwind preset nếu repo dùng Tailwind) vào theme của dự án,
thay toàn bộ màu v2 bằng token v3 theo bảng trong README mục 1. Không đổi bố cục ở bước này.
Chạy build/lint và liệt kê các file đã đổi.
```

**Bước 3 — làm lại màn Tổng quan**

```
Làm lại màn "Tổng quan của tôi" theo README mục 2 và reference/dashboard-desktop.html,
tách thành component theo cấu trúc repo, dùng icon trong docs/pte-life-design-handoff/icons.
Nối dữ liệu thật theo mục 3; chỗ nào backend chưa có dữ liệu thì làm trạng thái trống và ghi TODO.
Cuối cùng tự kiểm tra theo checklist mục 4 và báo kết quả.
```
