# PTE-Life — Gói bàn giao giao diện (Design handoff v3)

Gói này dùng để Claude Code (hoặc dev) áp **hệ màu PTE-Life v3** và **màn "Tổng quan của tôi" mới** vào code của nền tảng luyện thi PTE-Life (LMS).

> Đọc hết file này trước khi sửa code. Mọi giá trị màu/khoảng cách lấy từ `tokens/`, **không gõ mã hex trực tiếp** trong component.

## Cấu trúc gói

| Thư mục / file | Nội dung |
| --- | --- |
| `tokens/tokens.json` | Nguồn gốc duy nhất của hệ màu v3 (màu sáng/tối, chữ, spacing, bo góc) kèm ghi chú cách dùng từng token |
| `tokens/tokens.css` | Biến CSS sinh từ tokens.json (`--brand-red`, `--charcoal`…). Import 1 lần ở file CSS gốc |
| `tokens/pte-life.tailwind.preset.js` | Preset Tailwind trỏ vào biến CSS (chỉ dùng nếu dự án có Tailwind) |
| `icons/*.svg` | 23 icon nét mảnh 24×24, `stroke="currentColor"`, nét 1.8 — đổi màu bằng `color` |
| `reference/dashboard-desktop.html` | Bản tham chiếu màn Tổng quan (desktop, co giãn tới mobile). Mở bằng trình duyệt để xem |
| `reference/dashboard-mobile.html` | Bản tham chiếu mobile 390px có thanh tab dưới |
| `reference/assets/ptelife-logo.png` | Logo **tạm** (cắt từ ảnh chụp màn hình) — thay bằng SVG gốc của dự án |

Hai file HTML tham chiếu viết inline style để dễ đối chiếu, **không copy nguyên xi vào sản phẩm**: hãy tách thành component theo cấu trúc dự án và thay hex bằng token.

## 1. Hệ màu v3 — quy tắc bắt buộc

**60-30-10**
- **60% nền:** `surface-page` #FFFFFF, `surface-card` #FAF6F2 (kem), `surface-muted` #F3ECE6, `border-default` #E7DDD5
- **30% chữ & khối nhận diện:** `charcoal` / `text-primary` #2B2120 (nâu than), `text-secondary` #6B5E58
- **10% đỏ thương hiệu:** `brand-red` / `cta-red` #D32F2F — chỉ cho CTA chính, trạng thái active, thanh tiến độ

**Thay đổi so với v2 (tìm & thay toàn dự án):**

| v2 | v3 |
| --- | --- |
| `#1A2530` navy, token `navy` | `#2B2120`, token `charcoal` |
| `on-navy`, `on-navy-secondary` | `on-charcoal`, `on-charcoal-secondary` |
| `#5C6670` | `#6B5E58` |
| `#F8F9FA` / `#F1F3F5` / `#DEE2E6` | `#FAF6F2` / `#F3ECE6` / `#E7DDD5` |
| `#A9B4BF` (chữ phụ trên nền tối) | `#BFB1A8` |
| info `#1565C0` (xanh dương) | `#6A3D9A` (tím mận) |
| — | token mới: `charcoal-line`, `red-soft`, `warning-tint` |

**Lý do (đừng "sửa lại" về xanh dương/navy):** thương hiệu theo mệnh Hỏa — xanh dương, navy, đen lạnh thuộc Thủy nên **không dùng** trong giao diện thương hiệu. Xanh lá (`success`) chỉ dùng diện tích nhỏ.

**Hành vi:**
- **Mỗi màn hình chỉ 1 nút CTA đỏ.** Nút phụ = outline `secondary-btn-border` (nâu than).
- CTA: mặc định `cta-red` → hover `cta-red-hover` → nhấn `cta-red-active`; focus luôn có `outline: 2px solid var(--focus-ring); outline-offset: 2px`.
- Chữ đỏ cỡ nhỏ trên nền kem dùng `brand-red-text` #B71C1C (không dùng #D32F2F).
- `warning` (cam) không làm màu chữ — chỉ icon hoặc nền badge `warning-tint` + chữ `text-primary`.
- `error` luôn đi kèm icon ✕ + chữ ("Sai") để không lẫn với CTA đỏ.
- **Màn làm bài PTE luôn Light**, nền trắng #FFFFFF.
- Chữ nội dung tối thiểu tương phản 4.5:1. Vùng bấm tối thiểu 44×44px.
- Font: Inter (Google Fonts, có tiếng Việt), dự phòng Segoe UI / system-ui.

## 2. Màn "Tổng quan của tôi" — cấu trúc

**Bố cục desktop:** sidebar trắng 264px (sticky) + vùng chính `max-width: 1240px`, nền `surface-card`.

**Sidebar** — 3 nhóm, nhãn nhóm chữ in hoa 11px `text-secondary`:
- *Học tập:* Tổng quan của tôi (`dashboard`), Luyện đề PTE (`luyen-de-pte`), Luyện đề Tủ (`luyen-de-tu`), Test đầu vào (`test-dau-vao`)
- *Lớp học:* Lớp của tôi (`lop-hoc`), Bài giáo viên giao (`bai-giao`, nhãn "Sắp có"), Lịch học (`lich`)
- *Hệ thống:* Thông báo (`thong-bao`, badge số đỏ), Hồ sơ & cài đặt (`tai-khoan`)
- Mục đang mở: nền `red-tint`, chữ `brand-red-text`, icon `brand-red`, `aria-current="page"`
- Đáy: khối "Cần hỗ trợ? Nhắn Zalo OA" nền `charcoal` + thẻ người dùng (avatar chữ cái đầu)

**Header vùng chính:** nhãn "TỔNG QUAN CỦA TÔI" (đỏ chữ nhỏ) · H1 "Chào {tên học viên}" · mô tả · nút tìm kiếm · chọn ngôn ngữ · **CTA đỏ duy nhất "Vào luyện đề"**.

**Lưới 3 cột** (`repeat(3, minmax(0,1fr))`, gap 20px):
1. **Mục tiêu tuần** — nền `charcoal`, số buổi đã luyện / mục tiêu, 5 vạch tiến độ (`#EF5350` đã xong, `charcoal-line` chưa), chuỗi ngày liên tiếp.
2. **Hoạt động luyện tập** — biểu đồ cột 7 ngày (T2→CN): ngày đã qua `red-soft`, hôm nay `brand-red`, ngày chưa tới khung nét đứt; số phút in trên mỗi cột; đường nét đứt "TB" = trung bình các ngày đã qua.
3. **Lớp học của tôi** — chiếm 2 hàng: tên lớp, chip mục tiêu + giờ học, giáo viên, dải 7 ngày trong tuần (hôm nay nền đỏ, ngày có lớp có chấm), danh sách buổi trong tuần (đã học = check xanh `success`; buổi tiếp theo nền `red-tint` + nhãn "Ngày mai"/ngày), nút outline "Xem lịch cả khoá".
4. **Điểm ước lượng so với mục tiêu** — chiếm 2 cột: 4 kỹ năng Nói/Viết/Đọc/Nghe (icon `ky-nang-*`), thanh tiến độ thang 10–90, vạch mục tiêu, điểm + "cần +X". Kỹ năng chưa có dữ liệu: hiện link "Chưa có · Luyện ngay" thay vì "—". **Giữ nguyên câu miễn trừ:** "Điểm ước lượng dựa trên các câu đã luyện trên hệ thống, không phải điểm thi chính thức của Pearson." (yêu cầu tuân thủ Luật Quảng cáo — không được bỏ).

**Luyện đề của tôi** — 3 thẻ: Luyện đề PTE, Luyện đề Tủ (thanh tiến độ 10 đoạn + "Đã làm x/y" + %), Test đầu vào (badge "Chưa làm" `warning-tint` + nút outline "Làm test đầu vào").

**Bài giáo viên giao** — khung viền nét đứt, nhãn "Sắp ra mắt" cho tới khi tính năng có.

**Responsive:** ≤1180px lưới 2 cột; ≤880px ẩn sidebar, 1 cột, padding 16px, dùng thanh tab dưới (Tổng quan / Luyện đề / Đề Tủ / Lớp học / Tài khoản) như `dashboard-mobile.html`.

## 3. Dữ liệu cần nối (bản tham chiếu đang dùng số mẫu)

Các con số sau là **dữ liệu mẫu**, phải lấy từ backend: số buổi luyện/mục tiêu tuần, chuỗi ngày, số phút luyện theo ngày, lịch buổi học và trạng thái đã học, điểm ước lượng từng kỹ năng, mục tiêu điểm của lớp, số đề đã làm/tổng mỗi loại, thời điểm làm gần nhất, số thông báo chưa đọc. Thiếu dữ liệu thì hiện trạng thái trống có hướng dẫn hành động, không hiện số 0 giả.

## 4. Checklist nghiệm thu

- [ ] Không còn mã `#1A2530`, `#1565C0`, `#5C6670`, `#F8F9FA`, `#F1F3F5`, `#DEE2E6` hoặc token `navy` trong code
- [ ] Mọi màu lấy qua biến CSS / Tailwind preset, không hard-code hex trong component
- [ ] Mỗi màn chỉ 1 nút nền đỏ; focus ring hiện khi dùng bàn phím
- [ ] Icon dùng bộ `icons/`, không dùng emoji; nút chỉ có icon có `aria-label`
- [ ] Câu miễn trừ Pearson còn nguyên dưới khối điểm ước lượng
- [ ] Màn làm bài thi vẫn nền trắng, Light mode
- [ ] Desktop, tablet (≤1180px), mobile (≤880px) đều không cuộn ngang
- [ ] Logo dùng file SVG gốc, không dùng `ptelife-logo.png` tạm
