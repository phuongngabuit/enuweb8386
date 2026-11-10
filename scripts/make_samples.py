"""Sinh bộ dữ liệu thử: samples/mau.docx, mau.pdf, mau.mp4 (ảnh giả lập màn hình, không chứa dữ liệu thật)."""
import io
import unicodedata
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

STEPS = [("Mở ứng dụng ENumber Chấm Công", "Nhấn vào biểu tượng ứng dụng trên màn hình chính của điện thoại."),
         ("Chọn mục Chấm công", "Tại màn hình chính, nhấn nút Chấm công."),
         ("Quét khuôn mặt", "Đưa khuôn mặt vào khung hình và giữ yên 1-2 giây."),
         ("Xem kết quả", "Ứng dụng thông báo chấm công thành công.")]
COLORS = ["#1F6FEB", "#0B8A5F", "#B4541A", "#6D3BD1"]


def screen(i, size=(540, 960)):
    im = Image.new("RGB", size, "white")
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, size[0], 90], fill="#0B1F3A")
    for k in range(4):
        d.rounded_rectangle([40, 150 + k * 60, 300 + (k * 53 + i * 37) % 180, 175 + k * 60], 8, fill="#E3E9F2")
    y = 420 + i * 110
    d.rounded_rectangle([40, y, size[0] - 40, y + 80], 14, fill=COLORS[i % 4])
    d.text((60, y + 30), f"Buoc {i + 1}", fill="white")
    return im


def plain(t):
    t = t.replace('đ', 'd').replace('Đ', 'D')
    return ''.join(c for c in unicodedata.normalize('NFD', t) if unicodedata.category(c) != 'Mn')


def png(im):
    b = io.BytesIO(); im.save(b, "PNG"); return b.getvalue()


def make(out: Path):
    out.mkdir(parents=True, exist_ok=True)
    import docx
    from docx.shared import Inches
    d = docx.Document()
    d.add_heading("Hướng dẫn chấm công bằng khuôn mặt", 0)
    d.add_paragraph("Tài liệu hướng dẫn cán bộ chấm công hằng ngày trên điện thoại.")
    for i, (t, b) in enumerate(STEPS):
        d.add_paragraph(f"Bước {i + 1}: {t}")
        d.add_paragraph(b)
        d.add_picture(io.BytesIO(png(screen(i))), width=Inches(2.5))
    d.add_paragraph(f"Bước 5: {STEPS[0][0]}")  # bước trùng để thử khử trùng lặp
    d.add_paragraph(STEPS[0][1])
    d.save(out / "mau.docx")

    import pymupdf as fitz
    pdf = fitz.open()
    page = pdf.new_page()
    page.insert_text((60, 70), "Huong dan cham cong bang khuon mat", fontsize=20)
    y = 110
    for i, (t, b) in enumerate(STEPS):
        if y > 600:
            page = pdf.new_page(); y = 70
        page.insert_text((60, y), f"Buoc {i + 1}: {plain(t)}", fontsize=13)
        page.insert_text((60, y + 20), plain(b), fontsize=11)
        page.insert_image(fitz.Rect(60, y + 35, 200, y + 285), stream=png(screen(i)))
        y += 310
    pdf.save(out / "mau.pdf")

    frames = out / "_frames"; frames.mkdir(exist_ok=True)
    n = 0
    for i in range(len(STEPS)):
        for _ in range(4):  # mỗi màn hình giữ 4 giây
            screen(i).save(frames / f"{n:03d}.png"); n += 1
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-framerate", "1", "-i", str(frames / "%03d.png"), "-r", "10",
                    "-pix_fmt", "yuv420p", "-c:v", "libx264", str(out / "mau.mp4")], check=True)
    for f in frames.iterdir():
        f.unlink()
    frames.rmdir()
    return out


if __name__ == "__main__":
    print("Đã tạo:", make(Path(sys.argv[1] if len(sys.argv) > 1 else "samples")))
