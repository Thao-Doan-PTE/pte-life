> **Cập nhật khi đang làm (12/10/2026):** theo yêu cầu "thiết kế lại trang admin", em đã bắt đầu các màn **không cần sửa cơ sở dữ liệu** và tạm chọn theo đề xuất ở các câu sau. Chị đổi ý ở câu nào thì em sửa lại:
> - **Đã áp dụng:** 1A (CSKH = OPS), 2A, 3A (mở Đổi gói/Gia hạn/Bảo lưu cho OPS), 6A (chỉ nhận số ngày nguyên > 0), 10, 20A, 21.
> - **Tạm theo hướng an toàn hơn:**
>   - **Câu 4:** OPS vẫn giữ quyền quản lý lớp như hiện tại (4B), để không cắt quyền đang dùng.
>   - **Câu 7:** chưa tự gỡ lớp khi đổi gói (7B), chỉ cảnh báo, vì gỡ lớp sẽ làm học viên mất quyền luyện tập.
> - **Chặn xếp lớp khác gói:** đã áp dụng theo tài liệu.
> - **Các câu còn lại** và **cả 3 đợt migration** vẫn **chờ chị duyệt**.

# Báo cáo khảo sát Giai đoạn 1: Admin LMS PTE-Life

Gửi chị Thảo. Ngày 12/10/2026.
Phạm vi: em chỉ đọc mã nguồn, không sửa file nào, không đụng vào cơ sở dữ liệu và không commit.

## Tóm tắt nhanh

- **Hệ thống đã có khá nhiều phần dùng lại được:** tài khoản và vai trò, 3 thao tác gói học (đổi gói, gia hạn, bảo lưu), quản lý lớp, ngân hàng đề, AI chấm Writing/Speaking và bài test đầu vào. Làm Admin LMS chủ yếu là gom các phần này về một chỗ và làm giao diện mới, không phải viết lại.
- **Chưa có:** Giao bài tập, Chấm bài của giáo viên, màn hình Test đầu vào cho nhân viên, trang Nhật ký đầy đủ.
- **Giai đoạn 2 không cần sửa cơ sở dữ liệu.** Giai đoạn này làm khung admin: sidebar, menu theo vai trò, chế độ sáng/tối. Em có thể làm ngay khi chị đồng ý.
- **Có 21 điểm tài liệu khác với hệ thống** cần chị chọn (mục 3). Cần quyết sớm nhất là câu 1–4 (vai trò, quyền) và câu 5 (bảo lưu).
- **Đề xuất sửa cơ sở dữ liệu chia 3 đợt** và chỉ thêm mới, không xóa hay đổi dữ liệu cũ. Phần này **CHỜ DUYỆT** (mục 4).
- **Có một lỗi đang tồn tại:** tài khoản chỉ có vai trò Vận hành (OPS) hoặc Trưởng chuyên môn (ACADEMIC_LEAD) bị chuyển trang qua lại vô tận, không vào được đâu. Tài khoản mẫu `lead@ptelife.vn` bị lỗi này. Khung admin mới ở giai đoạn 2 sẽ sửa.

---

## 1. Đã có gì (dùng lại được)

| Hạng mục | Hiện có trong hệ thống | Dùng lại thế nào |
|---|---|---|
| Đăng nhập & vai trò | Một người có thể giữ nhiều vai trò: ADMIN, OPS (Vận hành), ACADEMIC_LEAD (Trưởng chuyên môn), TEACHER, STUDENT. Có khóa/mở tài khoản. Đổi vai trò có hiệu lực ngay lần tải trang sau. | Giữ nguyên. Không cần thêm vai trò "CSKH" mới, dùng OPS. |
| 3 thao tác gói học | Đổi gói, Gia hạn N ngày, Dùng 1 lượt bảo lưu (trừ 1 lượt, cộng 30 ngày). Mỗi lần đều ghi nhật ký. | **Giữ nguyên logic và câu chữ nhật ký**, chỉ chuyển nút bấm vào drawer hồ sơ mới. |
| Nhật ký gói học | Bảng `ReservationLog`. Trang `/admin` hiện 20 dòng mới nhất dạng "Tên — Dùng 1 lượt bảo lưu…". | Giữ bảng và câu chữ cũ, hiển thị lại y như cũ. |
| Nhật ký chung | Bảng `AuditLog` đang ghi thao tác lớp học và vai trò, nhưng chưa có trang nào để xem. | Mở rộng thêm cột, làm trang Nhật ký. |
| Lớp học | Trang `/admin/classes`: tạo lớp, lưu trữ lớp, gán giáo viên chính/phụ, thêm/gỡ học viên. Giáo viên chỉ thấy lớp có tên mình. | Dùng lại toàn bộ, bổ sung thông tin. |
| Người dùng | Trang `/admin/users`: phân vai trò, khóa/mở tài khoản. | Giữ trong menu Admin. Tài liệu không nhắc trang này. |
| Ngân hàng đề | Trang `/admin/questions`: nhập câu hỏi từ file CSV, xóa hàng loạt, tải file mẫu. Phân biệt câu "Tủ" và câu thường. | Gắn vào khung mới, thêm thẻ tổng và cột. |
| AI chấm bài | Claude đang chấm Writing (WE, SWT, SST) và Speaking (RA, RS, DI, RL, ASQ, SGD, RTS). Điểm AI đã được lưu lại. Reading/Listening chấm tự động theo đáp án. | Điểm AI được điền sẵn cho giáo viên xác nhận. Câu hỏi mở số 4 trong tài liệu ("đã có engine chấm Speaking chưa") đã có câu trả lời: **có rồi**. |
| Test đầu vào | Bài test cố định, lưu bài làm và file ghi âm câu Speaking. Form đăng ký tạo luôn tài khoản học viên và thông tin khách. | Dùng lại dữ liệu. Phần màn hình cho nhân viên thì phải làm mới. |
| Yêu cầu tư vấn | Bảng `ConsultationRequest` (trạng thái Mới / Đã liên hệ / Xong). | Dùng làm đích cho nút "Chuyển tư vấn". |
| Giao diện | Bảng màu sẵn có rất gần prototype: than ấm, đỏ thương hiệu `#d32f2f`, tím, xanh lá. Font Google Sans Flex. Đã có sẵn các khối: drawer trượt, ô chọn, nút, ô nhập, avatar, nhãn. | Dùng màu và font của hệ thống, theo đúng chỉ dẫn trong tài liệu. Cần làm thêm vài khối nhỏ: bảng, nút chọn dạng đoạn, ô tick, thông báo nổi, thanh tiến độ. |

## 2. Cần thêm gì (theo từng màn hình)

| Màn hình | Đã có | Cần làm thêm | Cần sửa cơ sở dữ liệu? |
|---|---|---|---|
| **Khung admin** (sidebar, topbar, phân quyền) | Mỗi trang tự kiểm tra quyền riêng, chưa có khung chung | Sidebar nền than với menu theo vai trò, số đỏ báo việc tồn, menu trượt trên điện thoại, chế độ sáng/tối riêng cho admin, một bộ quy tắc phân quyền dùng chung. Server phải chặn thật, không chỉ ẩn menu. | **Không** |
| **Tổng quan** | Chưa có | 4 KPI, khung "Cần xử lý", khung "Tiến độ lớp". Phần nào đã có dữ liệu thì hiện trước; "Bài chờ chấm" và "Tỷ lệ nộp bài" hiện sau khi xong Giao bài và Chấm bài. | Có (đợt 1, đợt 2) |
| **Học viên & gói học** | 3 thao tác, danh sách dạng thẻ | Bảng có tìm kiếm và bộ lọc, tính trạng thái, sắp xếp theo hạn, drawer hồ sơ, xác nhận 2 bước khi bảo lưu, lịch sử riêng từng học viên, tiến độ 4 kỹ năng (lấy từ dữ liệu luyện tập thật), cột Đầu vào → Mục tiêu. | Có, nhẹ (đợt 1: `reservedUntil`, `targetScore`) |
| **Test đầu vào** | Dữ liệu bài làm, chưa có màn hình cho nhân viên | Danh sách người làm test, giáo viên chấm phần Speaking/Listening, quy đổi sang điểm PTE, lộ trình đề xuất, nút "Xếp vào lớp", nút "Chuyển tư vấn". | Có (đợt 3) |
| **Lớp học** | Có đầy đủ phần quản lý | Số buổi đã học / tổng buổi, số bài đang mở, tiến độ luyện đề trung bình, avatar học viên, nút "Danh sách HV" lọc đúng theo lớp. | Có (đợt 1: số buổi) |
| **Giao bài tập** | Trang "Sắp ra mắt" | Làm toàn bộ: form giao bài, chọn câu từ ngân hàng đề, bảng bài đang mở, đếm đã nộp / phải nộp. **Phía học viên cũng cần chỗ để thấy và làm bài được giao** (xem câu 11). | Có (đợt 2) |
| **Chấm bài** | Trang "Sắp ra mắt" | Hàng chờ theo lớp của giáo viên, form điểm theo tiêu chí, điểm AI điền sẵn, lưu xong chuyển sang bài kế tiếp. **Hiện bài luyện Speaking chưa lưu file ghi âm, chỉ lưu chữ**, nên cần thêm phần lưu ghi âm. | Có (đợt 2) |
| **Giáo viên** | Một phần, nằm trong trang Người dùng | Bảng giáo viên: chuyên môn, lớp phụ trách, số học viên, số bài chờ chấm. | Có (đợt 1: chuyên môn) |
| **Ngân hàng đề** | Có trang | 4 thẻ tổng, số câu Tủ, cột "cách chấm", giáo viên chỉ được xem, ghi nhật ký khi xóa hoặc nhập câu hỏi. | Nhẹ (đợt 2: nguồn đề) |
| **Nhật ký thao tác** | Chỉ có 20 dòng trên `/admin` | Trang đầy đủ gộp 2 bảng nhật ký, lọc theo người / ngày / loại thao tác, lưu thêm người làm, vai trò, IP, dữ liệu trước/sau. | Có (đợt 1) |

---

## 3. Những chỗ tài liệu khác với hệ thống hiện tại cần chị quyết

Chị trả lời ngắn theo dạng "1A, 2B…". Câu nào chị đồng ý với đề xuất của em thì ghi "OK".

### A. Vai trò và quyền (cần trước Giai đoạn 2)

**1. "CSKH" trong tài liệu là vai trò nào?**
Hệ thống không có vai trò CSKH, chỉ có OPS (Vận hành).
- A) CSKH = OPS
- B) Tạo vai trò mới

Em đề xuất **A**: không phải sửa cơ sở dữ liệu.

**2. "Trưởng chuyên môn" (ACADEMIC_LEAD) được làm gì?**
Tài liệu không nhắc vai trò này. Hiện nó có quyền về lớp học giống OPS.
- A) Như Admin ở các mục Đào tạo, Nội dung và Test đầu vào (xem mọi lớp, giao bài, chấm bài, quản lý giáo viên, ngân hàng đề), nhưng không đổi gói học và không xem nhật ký
- B) Như Admin toàn quyền
- C) Như Giáo viên

Em đề xuất **A**. Người có nhiều vai trò thì được cộng dồn quyền.

**3. Ai được Đổi gói / Gia hạn / Bảo lưu?**
Hiện chỉ Admin. Tài liệu cho cả CSKH.
- A) Mở cho OPS. Mỗi thao tác chỉ sửa đúng 1 dòng kiểm tra quyền, logic giữ nguyên.
- B) Giữ chỉ Admin

Em đề xuất **A**.

**4. CSKH làm được gì ở Lớp học?**
Hiện OPS có toàn quyền: tạo lớp, lưu trữ, gán giáo viên, thêm/gỡ học viên. Tài liệu nói CSKH "chỉ xem", nhưng lại cho CSKH xếp lớp từ hồ sơ học viên.
- A) CSKH xếp/gỡ học viên được; tạo lớp, lưu trữ lớp, gán giáo viên chỉ Admin và Trưởng chuyên môn làm
- B) Giữ như hiện tại (toàn quyền)
- C) Chỉ xem, không xếp lớp

Em đề xuất **A**.

### B. Gói học và học viên

**5. "Bảo lưu" nghĩa là gì?**
Hiện tại bảo lưu là trừ 1 lượt và cộng ngay 30 ngày vào hạn. Không có trạng thái "đang bảo lưu", học viên vẫn học bình thường. Tài liệu lại có nhãn "Bảo lưu đến dd/mm/yyyy" và bộ lọc "Bảo lưu", dựa trên một ngày `reservedUntil` mà hệ thống chưa có. Tài liệu cũng dặn "giữ nguyên logic cũ nếu khác".
- A) Giữ nguyên hoàn toàn, bỏ nhãn và bộ lọc "Bảo lưu". Không cần sửa cơ sở dữ liệu.
- B) Giữ nguyên phần trừ lượt, cộng 30 ngày và câu nhật ký; chỉ ghi thêm "bảo lưu đến = hôm nay + 30 ngày" để hiện nhãn. Học viên vẫn vào học được.
- C) Bảo lưu thật: tạm khóa quyền luyện tập đến hết ngày đó. Cách này thay đổi hành vi nên em không khuyên làm lúc này.

Em đề xuất **B**: vẫn đáp ứng tiêu chí "hoạt động như trang cũ" mà vẫn có nhãn trạng thái. Dữ liệu cũ không suy ra lại, nên các học viên đã bảo lưu trước đây sẽ không có nhãn.

**6. Gia hạn bằng số ngày ≤ 0**
Hiện hệ thống cho nhập số âm (để rút ngắn hạn khi nhập nhầm) và cả số lẻ như 1,5. Tài liệu cấm việc này.
- A) Chặn theo tài liệu: chỉ nhận số nguyên > 0
- B) Giữ như cũ

Em đề xuất **A**. Nếu sau này cần sửa hạn nhập nhầm, em làm riêng một nút "Điều chỉnh hạn" chỉ Admin dùng được.

**7. Đổi sang gói khác có tự gỡ học viên khỏi lớp không?**
Tài liệu yêu cầu có. Lưu ý: hiện quyền luyện tập phụ thuộc vào việc học viên đang ở trong một lớp. Gỡ khỏi lớp thì **học viên mất quyền luyện tập** cho đến khi được xếp lớp mới.
- A) Tự gỡ, nhưng hiện cảnh báo trước khi lưu và ghi thêm một dòng nhật ký "Rời lớp X (do đổi gói)". Dòng nhật ký đổi gói giữ nguyên câu chữ.
- B) Không tự gỡ, chỉ cảnh báo để CSKH tự xếp lớp mới

Em đề xuất **A**.

**8. Mỗi học viên chỉ học 1 lớp tại một thời điểm?**
Hiện một học viên có thể đang ở nhiều lớp, và khi xếp lớp hệ thống không kiểm tra lớp có cùng gói hay không.
- A) Xếp vào lớp mới thì tự chuyển khỏi lớp cũ, và chặn lớp khác gói
- B) Cho nhiều lớp, chỉ chặn lớp khác gói

Em đề xuất **A**.

**9. Tài khoản tạo từ form test đầu vào**
Hiện ai làm test cũng được tạo một tài khoản học viên hạn 30 ngày, nên những người này đang nằm lẫn trong danh sách học viên. Họ sẽ làm số báo "sắp hết hạn" bị đếm cao sai.
- A) Danh sách Học viên & gói học và số báo chỉ tính người đã từng được xếp lớp. Người chưa từng có lớp coi là "Khách tiềm năng" và nằm ở màn Test đầu vào.
- B) Tính tất cả

Em đề xuất **A**. Không cần sửa cơ sở dữ liệu.

### C. Lớp học, Giao bài, Chấm bài

**10. "Lớp mình" của giáo viên gồm những lớp nào?**
Em đề xuất: các lớp giáo viên làm giáo viên chính **hoặc** phụ, giống hiện tại.
- Giáo viên chỉ thấy bài giao và bài chờ chấm của học viên trong các lớp đó. Prototype đang cho giáo viên thấy toàn bộ bài; đây là lỗi, em sẽ không làm theo.
- Ở màn Test đầu vào, giáo viên chỉ xem, không có nút xếp lớp.

**11. Học viên làm bài được giao ở đâu?**
Tài liệu chưa nói tới phía học viên. Nếu học viên không thấy bài được giao thì cột "đã nộp" luôn bằng 0.
Em đề xuất: ở Giai đoạn 6 làm thêm danh sách "Bài được giao" trong trang của học viên, bấm vào thì mở đúng câu cần làm. Chị đồng ý cho thêm phần này không?

**12. Chấm bài gồm những bài nào, và điểm giáo viên có thay điểm AI không?**
- A) Chỉ chấm bài nằm trong bài tập được giao. Học viên thấy cả điểm AI lẫn điểm và nhận xét của giáo viên. Điểm giáo viên không ghi đè điểm AI trong các biểu đồ cũ, để số liệu không bị nhảy.
- B) Chấm mọi bài Speaking/Writing học viên tự luyện. Giáo viên sẽ bị quá tải.

Em đề xuất **A**.

**13. Rubric chấm điểm**
- Rubric AI đang dùng khác rubric trong tài liệu. Ví dụ với WE: AI chấm 6 tiêu chí theo %, còn tài liệu có 7 tiêu chí theo điểm.
- Tài liệu chưa có rubric cho SST, RS, RL, ASQ, SGD.

Em đề xuất: lưu rubric trong cơ sở dữ liệu để sửa được mà không cần lập trình, nạp trước bản trong tài liệu và gắn nhãn "chưa đối chiếu Pearson". Giai đoạn đầu giáo viên chỉ chấm các dạng có rubric: WE, SWT, WEM, RA, DI, RTS. Cột "Cách chấm" sẽ ghi theo thực tế, ví dụ "AI + GV xác nhận". Prototype ghi ASQ là "Tự động", nhưng thực tế ASQ đang được AI chấm.

Câu mở số 2 (rubric chính thức) vẫn cần chị hoặc đội chuyên môn chốt.

**14. Mã dạng bài**
- 7 mã khác nhau giữa hệ thống và tài liệu: hệ thống dùng FIB-RW, MCMA-R, FIB-R, MCSA-R, MCMA-L, FIB-L, MCSA-L; tài liệu dùng RWFIB, RMCM, RFIB, RMCS, LMCM, LFIB, LMCS.
- SWT: hệ thống cho cả Academic và Core, tài liệu ghi chỉ Academic.

Em đề xuất: giữ mã hiện tại vì học viên đã quen. Riêng SWT cần đội chuyên môn xác nhận theo đề Pearson hiện hành.

**15. Gửi thông báo bài tập (trong app và Zalo)**
Hiện chưa có hệ thống thông báo (trang Thông báo đang "Sắp ra mắt") và chưa kết nối Zalo.
Em đề xuất: lần này chỉ lưu lựa chọn "Gửi thông báo". Thông báo trong app và Zalo làm thành một dự án riêng sau.

**16. Xóa câu hỏi**
Hiện xóa câu hỏi là xóa hẳn, kéo theo mất luôn bài làm của học viên với câu đó. Sau này sẽ mất cả điểm giáo viên đã chấm.
- A) Đổi sang "ẩn / lưu trữ" thay vì xóa hẳn
- B) Giữ xóa hẳn

Em đề xuất **A**.

### D. Test đầu vào

**17. Thang điểm và ngưỡng lộ trình**
- Bài test hiện tại chấm trên thang thô 100 điểm: Speaking 30, Từ vựng/Ngữ pháp 20, Reading 20, Listening 30.
- **Không có phần Writing** và **không có điểm PTE 10–90**.
- Phần Speaking ghi 30 điểm nhưng chỉ có 1 câu 15 điểm.
- Phần Speaking và Listening chưa có ai chấm, vì chưa có màn hình chấm.
- Ngưỡng trong tài liệu (<36 / 36–49 / 50–57 / ≥58) tính trên thang 10–90, nên cần một bảng quy đổi.

Em đề xuất:
- Lưu bảng quy đổi và các ngưỡng trong phần "cài đặt" để đội chuyên môn tự chỉnh.
- Cột "W" tạm hiển thị là "Từ vựng/Ngữ pháp" cho đến khi bài test có phần Writing.
- Lớp gợi ý chọn theo gói của học viên. Prototype đang gợi ý lớp Academic cho cả học viên Core; đây là lỗi.

Chị cần cung cấp: bảng quy đổi điểm (câu mở số 1), và Speaking tối đa 15 hay 30 điểm.

**18. "Chuyển tư vấn" đẩy lead đi đâu? (câu mở số 3)**
Hiện chưa có CRM.
Em đề xuất: tạo một "Yêu cầu tư vấn" ngay trong hệ thống và ghi nhật ký; màn hình danh sách cho Sales làm sau. Khi nào có CRM thì nối thêm.

### E. Khác

**19. Nhật ký**
- **Giữ cả 2 bảng nhật ký.** Bảng gói học giữ nguyên câu chữ; trang Nhật ký đọc gộp cả hai.
- **Đề xuất sửa: giữ nhật ký khi xóa tài khoản nhân viên.** Hiện xóa tài khoản một nhân viên thì nhật ký của người đó cũng bị xóa theo, trái với yêu cầu "dữ liệu cũ còn nguyên".
- **Ngày trong nhật ký cũ:** đang ghi dạng "5/12/2026" (không có số 0 đứng trước) theo giờ máy chủ, nên có thể lệch 1 ngày so với giờ Việt Nam. Em đề xuất giữ nguyên định dạng cũ theo tiêu chí nghiệm thu. Chị có muốn cố định theo giờ Việt Nam không?

**20. Màu và font**
- Em đề xuất dùng đỏ `#d32f2f` có sẵn của hệ thống thay cho `#D0202B` trong prototype, và dùng font Google Sans Flex thay Be Vietnam Pro. Tài liệu cũng dặn ưu tiên màu và font của hệ thống.
- Màu chữ xám nhạt trong prototype không đủ độ tương phản, em sẽ dùng màu đậm hơn.
- Nút đỏ ở chế độ tối:
  - A) Đỏ đậm chữ trắng, giống bộ màu v3
  - B) Đỏ sáng chữ tối, giống prototype

  Em đề xuất **A**.

**21. Trang Người dùng (phân vai trò)**
Tài liệu không có trang này trong menu. Em đề xuất giữ trong menu Admin, vì nếu bỏ thì không còn chỗ nào để phân vai trò.

---

## 4. ĐỀ XUẤT MIGRATION — ⚠️ CHỜ DUYỆT (chưa áp dụng)

**Nguyên tắc:**
- **Chỉ thêm mới**, không xóa hay đổi tên cột cũ, dữ liệu cũ giữ nguyên.
- Mọi cột mới đều được phép để trống hoặc có giá trị mặc định, nên chạy rất nhanh và không khóa hệ thống lâu.
- Chia **3 đợt** gắn với từng giai đoạn; chị duyệt từng đợt. Nếu chị chọn khác ở mục 3, em điều chỉnh lại danh sách.
- **Giai đoạn 2 không cần migration nào.**

### Đợt 1: `admin_lms_p1_plan_audit_class` (cho Giai đoạn 3–5)

| Thay đổi | Giải thích | Phụ thuộc câu |
|---|---|---|
| `User.reservedUntil` (ngày, có thể trống) | Ngày hết bảo lưu, để hiện nhãn "Bảo lưu đến…". | 5 |
| `User.targetScore` (số, có thể trống) | Điểm mục tiêu PTE của học viên, cho cột "Đầu vào → mục tiêu". | |
| Bảng mới `TeacherProfile` (`userId`, `specialty`, `skills`) | Chuyên môn của giáo viên, ví dụ "Speaking · Writing". | |
| `Class.sessionsTotal`, `Class.sessionsDone` (mặc định 0) | Tổng số buổi và số buổi đã học, nhân viên vận hành nhập tay. | |
| `AuditLog` thêm `actorRoles`, `targetUserId`, `before`, `after`, `ip`, `userAgent` và 2 chỉ mục | Nhật ký ghi đủ: ai làm, với vai trò gì, tác động lên học viên nào, dữ liệu trước/sau, IP. | |
| *(Tùy chọn)* `AuditLog.actorId` cho phép trống và đổi cách xóa sang SetNull | Giữ nhật ký khi xóa tài khoản nhân viên. Đây là nới lỏng một ràng buộc chứ không phải chỉ thêm mới, nên cần chị duyệt riêng. | 19 |

### Đợt 2: `admin_lms_p2_assignments_grading` (cho Giai đoạn 6–7)

| Thay đổi | Giải thích | Phụ thuộc câu |
|---|---|---|
| Kiểu mới `AssignmentKind` (PRACTICE / TU / MOCK), `AssignmentStatus`, `ReviewStatus` | Các loại bài tập và trạng thái chấm. | |
| Bảng `Assignment` | Bài tập giao cho lớp: tên, lớp, hình thức, các dạng bài, hạn nộp, có gửi thông báo hay không, người giao. | |
| Bảng `AssignmentItem` | Danh sách câu hỏi cụ thể trong một bài tập. | |
| Bảng `AssignmentRecipient` | Danh sách học viên phải nộp, chốt lúc giao bài (đúng quy tắc "số HV phải nộp = sĩ số lúc giao"). | |
| `PracticeAttempt.assignmentId`, `reviewStatus`, `audioUrl` | Gắn bài làm với bài tập, đánh dấu chờ chấm / đã chấm, lưu link file ghi âm Speaking. Bài làm cũ để trống nên **không bài cũ nào rơi vào hàng chờ**. | |
| `MockTestSession.assignmentId` | Gắn lượt làm Mock test với bài tập được giao. | |
| Bảng `GradingRubric` | Rubric chấm theo từng dạng bài, có đánh số phiên bản, sửa được. | 13 |
| Bảng `AttemptGrade` | Điểm của giáo viên: điểm từng tiêu chí, tổng, nhận xét, người chấm, ngày chấm. Lưu riêng, không ghi đè điểm AI. | 12 |
| `Question.source` | Nguồn đề, ví dụ "Pearson" hoặc "Tủ T10/2026". | |
| *(Tùy chọn)* `Question.archivedAt` | Ẩn câu hỏi thay vì xóa hẳn. | 16 |

### Đợt 3: `admin_lms_p3_entry_test` (cho Giai đoạn 8)

| Thay đổi | Giải thích | Phụ thuộc câu |
|---|---|---|
| `EntryTestAttempt.scoreListening` | Điểm giáo viên chấm phần Listening. | |
| `EntryTestAttempt.estOverall`, `estSpeaking`, `estWriting`, `estReading`, `estListening` | Điểm PTE 10–90 ước tính sau khi quy đổi, dùng để so với ngưỡng lộ trình. | 17 |
| `EntryTestAttempt.pathway` | Lưu lại lộ trình được đề xuất tại thời điểm chấm. | |
| `EntryTestLead.userId`, `handedOffAt`, `handedOffById` | Nối thông tin khách với tài khoản; ghi lại ai chuyển tư vấn và lúc nào. | 18 |
| `ConsultationRequest.createdById`; *(tùy chọn)* cho phép trống `preferredDate`, `timeSlot` | Yêu cầu tư vấn do nhân viên tạo, lúc đó chưa có ngày hẹn. Phân biệt loại bằng cột `topic` đã có sẵn (thêm giá trị "entry_test_handoff"), không cần cột mới. | 18 |
| Bảng `AppSetting` | Nơi lưu cài đặt: ngưỡng lộ trình, bảng quy đổi điểm. Đội chuyên môn sửa được mà không cần lập trình. | 17 |

### Chi tiết Prisma (chưa áp dụng)

```prisma
// ===================== PROPOSAL — NOT APPLIED =====================
// ---------- ĐỢT 1 ----------
model User {
  // ...các trường hiện có giữ nguyên...
+ reservedUntil DateTime?   // bảo lưu đến ngày (null = không bảo lưu)
+ targetScore   Int?        // điểm mục tiêu PTE 10–90
- auditLogs            AuditLog[]
+ auditLogs            AuditLog[]            @relation("AuditLogActor")   // chỉ đặt tên quan hệ, DB không đổi
+ auditLogsAboutMe     AuditLog[]            @relation("AuditLogTarget")
+ teacherProfile       TeacherProfile?
+ assignmentsCreated   Assignment[]          @relation("AssignmentCreatedBy")   // đợt 2
+ assignmentRecipients AssignmentRecipient[]                                     // đợt 2
+ gradesGiven          AttemptGrade[]        @relation("AttemptGradedBy")       // đợt 2
+ entryTestLeads       EntryTestLead[]                                           // đợt 3
}

+model TeacherProfile {
+  userId    String   @id
+  specialty String?
+  skills    Skill[]  @default([])
+  createdAt DateTime @default(now())
+  updatedAt DateTime @updatedAt
+  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
+}

model Class {
+ sessionsTotal Int?
+ sessionsDone  Int  @default(0)
+ assignments   Assignment[]   // đợt 2
}

model AuditLog {
  // id, actorId, action, entityType, entityId, detail, createdAt giữ nguyên
+ actorRoles   Role[]  @default([])
+ targetUserId String?
+ before       Json?
+ after        Json?
+ ip           String?
+ userAgent    String?
- actor User @relation(fields: [actorId], references: [id], onDelete: Cascade)
+ actor      User  @relation("AuditLogActor", fields: [actorId], references: [id], onDelete: Cascade)
+ targetUser User? @relation("AuditLogTarget", fields: [targetUserId], references: [id], onDelete: SetNull)
+ @@index([targetUserId, createdAt])
+ @@index([createdAt])
}
// TÙY CHỌN (câu 19): actorId String? + onDelete: SetNull

// ---------- ĐỢT 2 ----------
+enum AssignmentKind   { PRACTICE TU MOCK }
+enum AssignmentStatus { OPEN CLOSED ARCHIVED }
+enum ReviewStatus     { PENDING GRADED }

+model Assignment {
+  id              String           @id @default(cuid())
+  classId         String
+  title           String
+  kind            AssignmentKind
+  questionTypeIds String[]                 // id trong lib/question-types.ts
+  mockMode        MockTestMode?            // chỉ khi kind = MOCK
+  note            String?
+  dueAt           DateTime?
+  notify          Boolean          @default(false)
+  status          AssignmentStatus @default(OPEN)
+  createdById     String
+  createdAt       DateTime         @default(now())
+  updatedAt       DateTime         @updatedAt
+  class        Class                 @relation(fields: [classId], references: [id], onDelete: Cascade)
+  createdBy    User                  @relation("AssignmentCreatedBy", fields: [createdById], references: [id])
+  items        AssignmentItem[]
+  recipients   AssignmentRecipient[]
+  attempts     PracticeAttempt[]
+  mockSessions MockTestSession[]
+  @@index([classId, status])
+  @@index([dueAt])
+}

+model AssignmentItem {
+  id           String @id @default(cuid())
+  assignmentId String
+  questionId   String
+  position     Int    @default(0)
+  assignment Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
+  question   Question   @relation(fields: [questionId], references: [id], onDelete: Cascade)
+  @@unique([assignmentId, questionId])
+  @@index([questionId])
+}

+model AssignmentRecipient {
+  id           String    @id @default(cuid())
+  assignmentId String
+  studentId    String
+  completedAt  DateTime?
+  assignment Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
+  student    User       @relation(fields: [studentId], references: [id], onDelete: Cascade)
+  @@unique([assignmentId, studentId])
+  @@index([studentId])
+}

model PracticeAttempt {
+ assignmentId String?
+ reviewStatus ReviewStatus?     // null = không cần GV chấm (mọi bài cũ)
+ audioUrl     String?
+ assignment Assignment?   @relation(fields: [assignmentId], references: [id], onDelete: SetNull)
+ grade      AttemptGrade?
+ @@index([assignmentId])
+ @@index([reviewStatus, createdAt])
}

model MockTestSession {
+ assignmentId String?
+ assignment   Assignment? @relation(fields: [assignmentId], references: [id], onDelete: SetNull)
+ @@index([assignmentId])
}

+model GradingRubric {
+  id             String   @id @default(cuid())
+  questionTypeId String
+  version        Int      @default(1)
+  criteria       Json                 // [{key,label,max}]
+  isActive       Boolean  @default(true)
+  note           String?
+  createdById    String?
+  createdAt      DateTime @default(now())
+  updatedAt      DateTime @updatedAt
+  grades AttemptGrade[]
+  @@unique([questionTypeId, version])
+  @@index([questionTypeId, isActive])
+}

+model AttemptGrade {
+  id         String   @id @default(cuid())
+  attemptId  String   @unique
+  rubricId   String?
+  criteria   Json                // [{key,label,max,score}] — bản chụp lúc chấm
+  total      Int
+  maxTotal   Int
+  comment    String?
+  gradedById String
+  gradedAt   DateTime @default(now())
+  updatedAt  DateTime @updatedAt
+  attempt  PracticeAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)
+  rubric   GradingRubric?  @relation(fields: [rubricId], references: [id], onDelete: SetNull)
+  gradedBy User            @relation("AttemptGradedBy", fields: [gradedById], references: [id])
+  @@index([gradedById])
+}

model Question {
+ source          String?
+ archivedAt      DateTime?        // TÙY CHỌN (câu 16)
+ assignmentItems AssignmentItem[]
}

// ---------- ĐỢT 3 ----------
model EntryTestAttempt {
+ scoreListening Int?
+ estOverall     Int?
+ estSpeaking    Int?
+ estWriting     Int?
+ estReading     Int?
+ estListening   Int?
+ pathway        String?
}

model EntryTestLead {
+ userId        String?
+ handedOffAt   DateTime?
+ handedOffById String?
+ user User? @relation(fields: [userId], references: [id], onDelete: SetNull)
+ @@index([userId])
}

model ConsultationRequest {
+ createdById String?
  // TÙY CHỌN: preferredDate DateTime? / timeSlot String? (yêu cầu do nhân viên tạo chưa có ngày hẹn)
  // topic dùng thêm giá trị "entry_test_handoff" — không cần cột mới
}

+model AppSetting {
+  key         String   @id      // "placement_thresholds", "entry_test_score_map"
+  value       Json
+  updatedById String?
+  updatedAt   DateTime @updatedAt
+}
```

### Điền dữ liệu cho bản ghi cũ (backfill)

| Mục | Cách xử lý |
|---|---|
| `reservedUntil` | **Không điền cho dữ liệu cũ.** Trước đây bảo lưu không thật sự tạm dừng việc học, nên suy ngược ra sẽ gắn nhãn sai cho học viên đang học. |
| `targetScore` | Lấy từ form test đầu vào, khớp theo email. Ví dụ "65+" thành 65; câu trả lời "Chưa rõ" để trống. |
| `EntryTestLead.userId` | Nối với tài khoản theo email, không phân biệt hoa thường. Khách không để lại email thì để trống. |
| `TeacherProfile` | Tạo khi cần (khi Admin nhập chuyên môn lần đầu), hoặc tạo sẵn một dòng trống cho mỗi giáo viên. |
| Số buổi lớp | Để trống, vận hành nhập tay. |
| Nhật ký cũ | `actorRoles` để trống, nghĩa là "không rõ". Không điền bằng vai trò hiện tại, vì như vậy là ghi sai lịch sử. **Không sao chép** dữ liệu từ bảng nhật ký gói học sang, để tránh hiện trùng 2 lần. |
| Bài làm cũ | Các cột mới để trống, nên không có bài cũ nào rơi vào hàng chờ chấm. |
| Rubric, ngưỡng lộ trình | Nạp bằng dữ liệu mẫu (seed), không nằm trong migration. Lấy theo mục 5 của tài liệu và gắn nhãn "chưa đối chiếu Pearson". |

**Lưu ý an toàn:**
- 3 thao tác gói học vẫn ghi vào bảng nhật ký cũ y như hiện tại; ngoài ra ghi thêm một dòng vào nhật ký chung với dữ liệu trước/sau.
- Trước khi chạy em sẽ kiểm tra lại trên bản sao cơ sở dữ liệu. Em chưa kiểm tra được độ lệch giữa schema và các migration đã chạy, vì việc đó cần một cơ sở dữ liệu tạm.

---

## 5. Kế hoạch các giai đoạn tiếp theo (theo mục 8)

Mỗi giai đoạn là 1 commit/PR riêng, có dữ liệu demo để chị xem thử.

| Giai đoạn | Chị nhận được gì | Sửa cơ sở dữ liệu |
|---|---|---|
| **1. Khảo sát** | Báo cáo này. | — |
| **2. Khung admin** | Giao diện mới theo prototype: sidebar than ấm, topbar, menu hiện theo vai trò, số đỏ báo việc tồn, menu trượt trên điện thoại (màn 390px không cuộn ngang), sáng/tối. Một bộ quy tắc quyền dùng chung, server chặn thật. Sửa lỗi vòng lặp chuyển trang của tài khoản OPS/Trưởng chuyên môn. Các trang cũ vẫn chạy trong khung mới; mục chưa làm hiện "Đang xây dựng". | **Không** |
| **3. Học viên & gói học** | Trang `/admin/students`: bảng, tìm kiếm, lọc, trạng thái, drawer hồ sơ. **3 thao tác cũ giữ nguyên logic và câu nhật ký.** Xác nhận 2 bước khi bảo lưu, lịch sử riêng từng học viên, tiến độ 4 kỹ năng thật. | Đợt 1 (phần lớn làm được trước khi có migration) |
| **4. Tổng quan + Nhật ký** | 4 KPI, "Cần xử lý", "Tiến độ lớp". Trang Nhật ký đầy đủ có bộ lọc, gộp cả nhật ký cũ. | Đợt 1 |
| **5. Lớp học + Giáo viên** | Thẻ lớp mới (buổi học, sĩ số, avatar), danh sách học viên theo lớp, chặn xếp lớp khác gói. Trang Giáo viên: chuyên môn, lớp, số học viên, bài chờ chấm. | Đợt 1 |
| **6. Ngân hàng đề → Giao bài** | Ngân hàng đề trong khung mới: thẻ tổng, số câu Tủ, cách chấm, giáo viên chỉ xem. Giao bài cho lớp: chọn câu ngẫu nhiên hoặc chọn tay, ưu tiên câu Tủ. Bảng bài đang mở. Phía học viên có danh sách "Bài được giao" (nếu chị duyệt câu 11). | Đợt 2 |
| **7. Chấm bài** | Hàng chờ theo lớp (bài cũ nhất lên trước), điểm AI điền sẵn, form tiêu chí theo rubric sửa được, chặn điểm ngoài khoảng, lưu xong tự chuyển bài kế tiếp. Học viên thấy điểm và nhận xét. Bắt đầu lưu file ghi âm Speaking; việc này tốn thêm dung lượng lưu trữ. | Đợt 2 |
| **8. Test đầu vào** | Danh sách người làm test, giáo viên chấm Speaking/Listening, quy đổi điểm và lộ trình theo cài đặt, "Xếp vào lớp" đúng gói, "Chuyển tư vấn". | Đợt 3 |

**Để bắt đầu, em cần chị:**
1. Đồng ý cho làm **Giai đoạn 2** (không sửa cơ sở dữ liệu).
2. Trả lời câu **1–4**.
3. Duyệt **Đợt 1** của migration và trả lời câu **5–9** trước khi xong Giai đoạn 3.

---
---

# Appendix (English): file references for the implementer

All paths are relative to `/Users/admin/PTELife`. Line numbers are from the working tree on 2026-10-12.

## Spec and prototype
- `docs/pte-admin-lms-handoff/HANDOFF.md`:
  - L25-43: nav and role matrix
  - L45-94: screens
  - L96-136: business rules (status L98-102, extend L104, reservation L106, package change L108, thresholds L112-118, rubrics L124-130, type codes L132-136)
  - L138-157: data model
  - L159-170: design
  - L172-183: phases
  - L185-197: acceptance
  - L199-205: open questions
- `docs/pte-admin-lms-handoff/prototype/admin-lms-prototype.html`:
  - Tokens: L11-32
  - Shell: L38-61, L190-201
  - `ROLES` / `NAV` / `TITLES`: L296-314
  - Helpers and `status()`: L316-334 (status at L320-326, `rec()` at L331)
  - Screens: L352-472
  - Handlers: L476-544
  - Bugs not to copy:
    - L416: `||true` gives teachers every submission.
    - L331: Core students are sent to AC-K13; below 36 the button reads "Xếp vào —".
    - L321: `reservedUntil` has no future check.
    - Pending queue is not sorted oldest-first.
    - Assignment rate `r` has no zero guard.
    - L537: next-item selection is not scoped.

## Auth, roles, routing
- `prisma/schema.prisma`:
  - L22-28: `enum Role` (ADMIN, OPS, ACADEMIC_LEAD, TEACHER, STUDENT)
  - L78: `User.roles Role[]`
  - L79: `status`
  - L80-82: `examPackage`, `expiresAt`, `reservationsLeft @default(2)`
  - L88-99: User relations; L96 is `auditLogs AuditLog[]` and needs a relation name once a second AuditLog→User relation is added
- `auth.ts:98-130`: the JWT callback reloads status, roles and plan fields every request (L113).
- `lib/auth-helpers.ts`:
  - L8 `hasRole`, L12 `hasAnyRole`, L16 `isAdmin`, L22 `requireRole` (throws Error; never returns 403)
  - L6-7: TODO for `can()`
- `proxy.ts`: auth-only, no role checks. The matcher (L37) excludes `/api`.
- **OPS / ACADEMIC_LEAD redirect loop:**
  - `app/page.tsx:31` redirects non-students with ADMIN/OPS/ACADEMIC_LEAD to `/admin`.
  - `app/admin/page.tsx:12-13` redirects non-ADMIN to `/`.
  - The same `/admin` redirect also appears in `luyen-de-pte:24`, `de-tu:24`, `test-dau-vao:27`, `tai-khoan:29`, `lop-hoc:15`, `lich-hoc:16`, `thong-bao:15`, `giao-bai:14`, `bai-cho-cham:14`.
  - Seed account: `prisma/seed.ts:56-62` (`lead@ptelife.vn`).
- Next 16 docs:
  - `node_modules/next/dist/docs/01-app/02-guides/authentication.md:1350-1356`: layouts don't re-run on navigation; check in every page and action.
  - `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/forbidden.md:17-24`: `forbidden()` needs `experimental.authInterrupts`. L185: the status is fixed once streaming starts.
  - For the literal 403 in acceptance criterion 9, use route handlers under `/api/admin/*` (pattern: `app/api/admin/questions/template/route.ts:8-11`), or `forbidden()`.
- Labels: `components/admin/user-role-row.tsx:12` (`OPS: "Vận hành (OPS)"`).
- Navigation:
  - `components/layout/navbar.tsx:60-85`
  - Teacher rail: `components/home/rail-shell.tsx:26-31`
  - `components/home/rail-nav.tsx`: badge slot at L14/L97, styled for a light rail

## The 3 legacy plan actions (behaviour must not change)
- `lib/actions/admin.ts`:
  - L9-11: `requireAdmin`. Changing it to `requireRole(["ADMIN","OPS"])` is the single-line change per function, pending decision 3.
  - L13-30: `getAllUsersForAdmin` (orders by `createdAt desc`) and `getRecentReservationLogs` (take 20)
  - L32-50: `changePackageAction`. Logs even when nothing changed; no enrollment side-effect.
  - L52-74: `extendExpiryAction`. L56 rejects only `days === 0`; negatives and fractions are accepted.
  - L76-107: `useReservationAction`. L83 guard; +30 days from the current `expiresAt`.
  - None of the three runs in a transaction. `useReservation` reads then writes (race on the last reservation). `revalidatePath("/admin")` at L49/73/106: also revalidate `/admin/students`.
  - Log `detail` uses `toLocaleDateString("vi-VN")`: unpadded `d/m/yyyy`, server time zone.
- FormData field names to preserve: `userId`, `examPackage`, `days`. Current form: `components/admin/admin-user-row.tsx:56-107`; the reservation button is disabled at L103.
- Display: `app/admin/page.tsx:80-81` renders `{log.user.name} — {log.detail}` (U+2014, name added at render time). Time format: `lib/format.ts:1-19` (`formatRelativeOrDate`).
- Schema: `ReservationLog` at `prisma/schema.prisma:172-183`. `performedById` has no FK. Decision record: `docs/LMS_DECISIONS.md:9-17` (keep ReservationLog and AuditLog separate).
- Recommended addition: wrap each action in `prisma.$transaction`. Keep the ReservationLog write verbatim, and append an AuditLog with before/after, `actorRoles` and `ip` from `getRequestIp()` (`lib/rate-limit.ts:189`). If decision 6A is approved, add integer validation `days > 0`.

## Classes, enrollment, practice access
- `prisma/schema.prisma`:
  - L104-122: `Class` (code, name, examType, targetScore, startDate, endDate, schedule, meetingUrl, status)
  - L124-136: `ClassTeacher` MAIN/ASSISTANT
  - L138-151: `ClassEnrollment` with `@@unique([classId, studentId])`. PAUSED is in the enum at L47-51 but unused.
- `lib/actions/classes.ts`:
  - L9: `OPS_ROLES`
  - L17-29: `getClassesForCurrentUser` (teacher scoping via `teachers.some.teacherId`)
  - L31-49: `getClassDetail`
  - L51-72: `createClassAction` (collects code, name, examType, targetScore, schedule only)
  - L113-130: `enrollStudentAction` (no package check, no single-active check)
  - L51-143: all mutations use `requireRole(OPS_ROLES)` and write AuditLog
- Pages:
  - `app/admin/classes/page.tsx:16-23`
  - `app/admin/classes/[id]/page.tsx:12-37`: its catch at L20-25 swallows unrelated errors
  - `components/admin/create-class-form.tsx`
- `lib/practice-access.ts:14-26`: staff pass; students need an ACTIVE enrollment, so setting LEFT locks practice. `lib/require-class-student.ts:9-15` redirects to `/test-dau-vao`.
- `lib/student-overview-queries.ts`:
  - L13-36: `getActiveClassInfo` (newest ACTIVE enrollment)
  - L38-49: schedule parse
  - L61: `getClassWeekSchedule`

## Student drawer data
- `lib/dashboard-queries.ts`:
  - L41 `getRecentAttempts`
  - L71 `getSkillProgress`: use it for real per-skill progress instead of the prototype formulas at L457
  - L59 `getQuestionCountsByType`

## Question bank and question types
- `prisma/schema.prisma`:
  - L219-237: `Question` (`bank QuestionBank @default(PTE)` = isTu)
  - L63-66: `enum QuestionBank`
- `lib/question-types.ts`:
  - L77-387: 23 static types (IDs and codes differ from HANDOFF for 7 R/L types)
  - L182: SWT in Academic and Core
  - L200-213: WEM placeholder
  - L393: `getQuestionTypesForPackage`
  - Imported by about 44 files: keep it static and add `scorer` / `teacherReview` fields there.
- `lib/actions/admin-questions.ts`:
  - L13, 28, 37, 45, 71: `requireAdmin`
  - L36-52: hard delete, cascading to PracticeAttempt and Favorite (`schema.prisma:252, 267`)
  - No audit on delete or import
  - Split reads (ADMIN + TEACHER) from writes (ADMIN)
- Page: `app/admin/questions/page.tsx:20-23`. CSV template: `app/api/admin/questions/template/route.ts`.
- Scorers:
  - Rule-based: `lib/scoring/rule-based.ts:149-176`
  - AI writing: `lib/scoring/ai/rubric.ts:6-17` (SWT/WE/SST, percentage criteria; **uncommitted changes in the working tree**), `lib/scoring/ai/anthropic-grader.ts`
  - AI speaking: `lib/actions/speaking.ts:79-98` (stores transcript and grade in `response`, **no audio**), `lib/scoring/ai/anthropic-speaking-grader.ts`, criteria in `speaking-types.ts:15-23`
  - Writing stores `{text, grade}`: `lib/actions/writing.ts:83` (uncommitted changes)
- Do not overwrite `PracticeAttempt.scorePct` / `pteScore` with the teacher grade. Those fields are read by dashboards and the mock GSE score (`lib/actions/mocktest.ts` around L220).

## Entry test, leads, consultation
- `prisma/schema.prisma`:
  - L299-314: `EntryTestLead` (email is optional; no userId)
  - L331-350: `EntryTestAttempt` (`scoreSpeaking`, `gradedById`, `gradedAt`, GRADED: never written)
  - L354-368: `EntryTestAnswer`
  - L378-395: `ConsultationRequest` (`preferredDate` and `timeSlot` NOT NULL; `topic` default "consult")
- `lib/entry-test-data.ts`:
  - L104-237: sections speaking 30 (L110; only S1 = 15 at L115), word 20 (L128), reading 20 (L201), listening 30 (L220)
  - L246-251: level bands
- `lib/entry-test-grading.ts`: L68 marks S/L as teacher-graded; L76-100 level calculation.
- `lib/actions/entry-test-attempt.ts`:
  - L72-84: audio upload (Vercel Blob, or `public/uploads` as a fallback, which does not persist on Vercel). Reuse this for practice speaking audio.
  - L138-148: submit
- `lib/actions/entry-test.ts:66-91`: the lead form creates a User (STUDENT, academic, +30 days) and an EntryTestLead in one transaction.
- `lib/entry-test-queries.ts:51`: `getEntryTestResultDetail` has no auth check; wrap it.
- `lib/actions/consultation.ts:18-67`: the only writer of ConsultationRequest. The only other reader of `preferredDate` / `timeSlot` is `components/entry-test/consultation-dialog.tsx`, so making them nullable is low-risk.

## Placeholders to replace or redirect
- `app/giao-bai/page.tsx:12-15`, `app/bai-cho-cham/page.tsx:12-15`, `app/thong-bao/page.tsx:13-17`

## Theme and UI
- `app/layout.tsx`:
  - L39-46: next-themes with `attribute="class"`
  - L6-9: Google Sans Flex
  - L16-19: Geist Mono
- `app/globals.css`:
  - L5: `@custom-variant dark (&:is(.dark *))`
  - L80: `--radius: 0.625rem`
  - L145-206: the `.wfd-theme` / `.dark .wfd-theme` pattern; copy it for `.admin-theme`
  - L247-279: `.rail-theme`, light-only
  - L281: focus ring
  - L119: dark shadcn `--sidebar-primary` is blue; do not use it
  - L13: `font-passage` (Lexend) for essay and answer text
- `docs/pte-life-design-handoff/tokens/tokens.css:43-71`: v3 dark palette, unused in the app; the reference for `.dark .admin-theme`.
- `components/ui/`: avatar, badge, button, card, dropdown-menu, input, label, navigation-menu, select, separator, sheet (needs `sm:max-w-[520px]` for the drawer; `side="left"` for the mobile nav), textarea.
  - Missing: table, segmented control / toggle group, checkbox, toast, progress.
- Contrast fixes:
  - Prototype `--ink-3 #8A7F76` fails AA (3.36-3.90). Use about `#766B62` or `--rail-ink-dim`.
  - `--rail-warning #ef6c00` fails as text (3.08). Add a text-safe warn colour (about `#9A5B0E`).
  - Dark `.p-bad` (brand on brand-soft) is 4.17; adjust it.

## Migrations
- Latest existing migration: `prisma/migrations/20261012050215_rate_limit_counter`.
- Proposed names: `admin_lms_p1_plan_audit_class`, `admin_lms_p2_assignments_grading`, `admin_lms_p3_entry_test`.
- `npx prisma validate` passes on the current schema. Drift was not checked (needs a shadow database).
- The `AuditLog.actor` relation rename is Prisma-only; the FK `AuditLog_actorId_fkey` is unchanged.
- **Optional, not purely additive:** `AuditLog.actorId` nullable with `onDelete: SetNull` (today it cascades, `schema.prisma:165`), and `ConsultationRequest.preferredDate` / `timeSlot` nullable.
- One-active-enrollment rule (decision 8A): enforce it in the server action. A partial unique index needs raw SQL and fails if any student already has two ACTIVE rows, so query for that first.