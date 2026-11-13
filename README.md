# SupportFlow 2.0 — Trung tâm hướng dẫn ENumber Chấm Công

Website hướng dẫn sử dụng và khắc phục lỗi (Mobile App + Web App), đọc công khai không cần đăng nhập.
Nội dung được dựng bằng **AI Import**: tải DOCX / PDF / MP4 lên, Gemini tách bước, ghép ảnh, đánh dấu nút cần nhấn; người biên tập duyệt rồi mới xuất bản.

> **Lưu ý:** 10 bài có sẵn là **dữ liệu mẫu** với ảnh minh hoạ tự vẽ. Tên chức năng cần đối chiếu tài liệu sản phẩm thật trước khi dùng chính thức. Đặt `SF_SEED=0` để không nạp bài mẫu.

## Điểm nổi bật

| Tính năng | Mô tả |
|---|---|
| Tìm kiếm ngôn ngữ tự nhiên | Gõ không dấu, sai chính tả nhẹ, từ đồng nghĩa ("face", "gps", "mk"…). Kết quả **trỏ thẳng tới bước** khớp nhất. `Ctrl K` mở tìm nhanh ở mọi trang. |
| Hỏi AI (tuỳ chọn) | Gemini trả lời ngắn gọn **chỉ dựa trên bài đã xuất bản**, kèm liên kết tới bài/bước nguồn. Có giới hạn tần suất và hạn mức ngày. |
| Chẩn đoán theo triệu chứng | Chọn hiện tượng → chọn tình huống → tới đúng bước xử lý. Sửa cây triệu chứng tại `data/symptoms.json`. |
| Hướng dẫn từng bước | Chế độ toàn màn hình, một bước một màn, nút Tiếp tục / phím ← →. |
| Điểm nhấn trên ảnh | Khung đỏ + nhãn "Nhấn: …" là lớp phủ, **ảnh gốc không bị sửa**. AI đề xuất, biên tập viên kéo chuột vẽ lại được. |
| AI Import | DOCX, PDF, MP4 → bản nháp có cấu trúc. Bước AI chưa chắc chắn bị chặn xuất bản cho tới khi được kiểm tra. |
| Phiên bản | Sửa bài đã xuất bản không ảnh hưởng bản công khai cho tới khi bấm xuất bản lại; khôi phục được phiên bản cũ. |

## Kiến trúc

```
Trình duyệt ──► :8080  API công khai (chỉ đọc) + giao diện React      ← mở ra mạng
Biên tập   ──► :8081  Studio + /editor/api (import, sửa, xuất bản)   ← chỉ 127.0.0.1 (mặc định)
                 │
                 ├─ SQLite  data/supportflow.db   (bản nháp, bản xuất bản, phiên bản, phản hồi)
                 ├─ Media   data/media/           (ảnh WebP, video nguồn)
                 └─ Gemini API (khoá chỉ nằm ở máy chủ)
```

- `backend/app/api.py` — hai ứng dụng FastAPI tách biệt; cổng công khai **không chứa** route tải tệp/xuất bản.
- `backend/app/importer/` — `extract.py` (DOCX/PDF/FFmpeg), `gemini.py`, `pipeline.py` (kiểm tra đầu ra AI, khử trùng lặp).
- `backend/app/search.py`, `textnorm.py` — tìm kiếm không dấu, đồng nghĩa.
- `frontend/src/` — React + Vite. `pages/Studio.jsx` là công cụ biên tập.

## Triển khai trên Mac mini M4 (dành cho người mới)

1. Cài **Docker Desktop for Mac (Apple Silicon)** từ docker.com, mở ứng dụng và chờ biểu tượng cá voi báo "running".
   Trong Docker Desktop → Settings → General, bật **Start Docker Desktop when you sign in**.
2. Mở **Terminal**, tải mã nguồn về và vào thư mục dự án:
   ```bash
   cd ~ && git clone <địa-chỉ-repo> supportflow && cd supportflow
   ```
3. Tạo tệp cấu hình và điền khoá Gemini:
   ```bash
   cp .env.example .env && open -e .env
   ```
4. Build và chạy:
   ```bash
   docker compose up -d --build
   ```
5. Kiểm tra:
   - Website: `http://localhost:8080` (máy khác trong mạng: `http://<IP-Mac-mini>:8080`)
   - Studio biên tập: `http://localhost:8081/studio` (chỉ mở được trên chính Mac mini)

Container có `restart: unless-stopped` nên tự chạy lại sau sự cố hoặc khi máy khởi động lại (miễn là Docker Desktop tự mở).
Để Mac mini không ngủ: System Settings → Energy → bật *Prevent automatic sleeping* và *Start up automatically after a power failure*.

### Cho biên tập viên dùng Studio từ máy khác trong mạng nội bộ

Trong `.env` đặt `EDITOR_BIND=0.0.0.0` **và** một `EDITOR_TOKEN` dài, ngẫu nhiên (`openssl rand -hex 24`), rồi `docker compose up -d`.
Không chuyển tiếp (port-forward) cổng 8081 ra Internet. Nếu đưa website ra Internet, chỉ công bố cổng 8080 qua reverse proxy có HTTPS.

## Studio có bốn mục

| Mục | Dùng để |
|---|---|
| Hướng dẫn | AI Import DOCX/PDF/MP4 thành bài từng bước, sửa, xem trước, xuất bản. |
| Tài liệu | Tải PDF/DOCX/XLSX/PPTX lên để người dùng **tải về nguyên tệp** (trang `/tai-lieu`). Ẩn/hiện, xoá, xem lượt tải. |
| Yêu cầu | Xem yêu cầu hỗ trợ người dùng gửi (SĐT, nội dung, ảnh chụp màn hình), đổi trạng thái, ghi chú, gửi lại Zalo. |
| Thông báo | Soạn thông báo (Thông tin / Cập nhật / Quan trọng), ghim, hẹn ngày tự ẩn. Hiện ở đầu trang chủ, chuông trên thanh điều hướng và trang `/thong-bao`. |

## Yêu cầu hỗ trợ và Zalo Bot

Người dùng gửi yêu cầu tại trang `/ho-tro` (nút nổi ở mọi trang): số điện thoại, nội dung, và nút chèn ảnh chụp màn hình lỗi (chọn tệp, kéo thả hoặc dán Ctrl+V). Mỗi yêu cầu được lưu vào Studio và gửi ngay vào Zalo.

Kết nối Zalo Bot (làm một lần):

1. Trên Zalo, tìm và mở **Zalo Bot Manager**, tạo bot mới, chép **Bot Token**.
2. Mở `.env`, điền `ZALO_BOT_TOKEN=...`, chạy `docker compose up -d`.
3. Dùng tài khoản Zalo sẽ nhận thông báo, **nhắn một tin bất kỳ cho bot**.
4. Vào Studio > Yêu cầu > **Tìm chat_id**, chép mã hiện ra vào `ZALO_CHAT_ID=...` trong `.env`, chạy lại `docker compose up -d`.
5. Bấm **Gửi tin thử**. Thấy tin trong Zalo là xong.

Muốn Zalo nhận cả ảnh: đặt `PUBLIC_BASE_URL=https://ten-mien-cua-ban` (Zalo phải tải được ảnh từ Internet qua HTTPS). Không đặt thì Zalo chỉ nhận chữ, ảnh xem trong Studio.

Lưu ý: "Tìm chat_id" dùng `getUpdates`, không chạy được nếu bot đang bật webhook. Máy chủ phải truy cập được `bot-api.zaloplatforms.com`. Nếu Zalo lỗi, yêu cầu vẫn được lưu và có nút **Gửi lại Zalo**.

Bảo vệ: tối đa 5 yêu cầu/giờ mỗi địa chỉ IP, ảnh ≤ 8 MB và được giải mã lại, có ô bẫy bot. Số điện thoại và ảnh chỉ xem được ở cổng Studio.

## Quy trình biên tập

1. Mở Studio → kéo thả DOCX/PDF/MP4 → theo dõi 5 chặng xử lý.
2. Xem ghi chú của AI, sửa nội dung, đổi ảnh từ kho ảnh trích được, vẽ điểm nhấn.
3. Bấm **Đã kiểm tra** ở từng bước AI chưa chắc chắn. Kiểm tra ảnh không chứa thông tin cá nhân/nội bộ.
4. **Xem trước** → **Xuất bản**. Bài xuất hiện ngay ở thư viện công khai.

Giới hạn: DOCX/PDF ≤ 25 MB, MP4 ≤ 80 MB và ≤ 10 phút, tối đa 12 ảnh và 20 bước mỗi bài.

## Sao lưu, khôi phục, cập nhật

```bash
./scripts/backup.sh
```
```bash
./scripts/restore.sh backups/supportflow-YYYYMMDD-HHMMSS.tar.gz
```
```bash
./scripts/update.sh
```

Sao lưu tự động 2 giờ sáng hằng ngày: chạy `crontab -e` và thêm dòng
`0 2 * * * cd ~/supportflow && ./scripts/backup.sh >> backups/backup.log 2>&1`.
Nên chép thư mục `backups/` sang ổ ngoài hoặc NAS định kỳ. Mọi dữ liệu nằm trong `./data` — cập nhật container không làm mất.

## Phát triển và kiểm thử

```bash
python3 -m venv .venv && .venv/bin/pip install -r backend/requirements.txt pytest
```
```bash
cd backend && ../.venv/bin/python -m pytest -q
```
```bash
cd frontend && npm install && npm run build
```
```bash
cd backend && SF_DATA_DIR=../data ../.venv/bin/python -m app.main
```
```bash
.venv/bin/python scripts/make_samples.py samples
```

Lệnh cuối sinh bộ tệp thử `samples/mau.docx`, `mau.pdf`, `mau.mp4`. Máy phát triển cần có `ffmpeg`.

## Đối chiếu tiêu chí nghiệm thu

| Kiểm thử | Bằng chứng |
|---|---|
| Không cần đăng nhập | `test_no_login_needed` |
| Tìm kiếm, không dấu | `test_search_no_accents`, `test_search_natural_language`, `test_search_typo_and_step_hit` |
| Nhập DOCX / PDF / MP4 | `test_docx_heuristic`, `test_pdf_order`, `test_mp4_frames` |
| Kiểm soát đầu ra AI | `test_gemini_mode_validates_ai_output`, `test_gemini_failure_falls_back` |
| Sửa trước/sau xuất bản, phiên bản | `test_docx_heuristic` |
| Không xuất bản được qua API công khai | `test_public_has_no_write_api`, `test_editor_token` |
| Tệp không tin cậy | `test_rejects_bad_files` |
