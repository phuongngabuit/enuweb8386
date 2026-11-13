"""Dữ liệu MẪU để chạy thử giao diện. Tên chức năng phải được đối chiếu tài liệu sản phẩm thật trước khi dùng chính thức.
Ảnh là hình vẽ minh hoạ (SVG) do hệ thống tự sinh, không phải ảnh chụp sản phẩm."""
import json
from html import escape

from . import config, db

M, W = "mobile", "web"


def mock_svg(platform, screen, target, pos):
    """Vẽ khung màn hình giản lược + nút cần nhấn. Trả về (svg, hotspot)."""
    if platform == M:
        w, h, pad = 390, 760, 24
        bx, bw, bh = pad, w - 2 * pad, 52
    else:
        w, h, pad = 1200, 700, 40
        bx, bw, bh = 260 + pad, 300, 48
    by = int(h * pos)
    rows = "".join(f'<rect x="{bx}" y="{y}" width="{(w - bx - pad) * f:.0f}" height="14" rx="7" fill="#E3E9F2"/>'
                   for y, f in ((120, .6), (150, .85), (180, .45), (by + bh + 40, .7), (by + bh + 70, .5)) if y < h - 30 and not (by - 30 < y < by + bh + 20))
    side = "" if platform == M else (
        f'<rect x="0" y="64" width="260" height="{h}" fill="#F1F4F9"/>' +
        "".join(f'<rect x="28" y="{100 + i * 44}" width="{150 + (i % 3) * 20}" height="14" rx="7" fill="#CFD8E6"/>' for i in range(6)))
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" font-family="system-ui,sans-serif">
<rect width="{w}" height="{h}" fill="#fff"/><rect width="{w}" height="64" fill="#0B1F3A"/>
<text x="{pad}" y="40" fill="#fff" font-size="18" font-weight="600">{escape(screen)}</text>{side}{rows}
<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" rx="10" fill="#1F6FEB"/>
<text x="{bx + bw / 2}" y="{by + bh / 2 + 6}" fill="#fff" font-size="16" font-weight="600" text-anchor="middle">{escape(target)}</text>
<text x="{w - pad}" y="{h - 14}" fill="#9AA7BA" font-size="11" text-anchor="end">Ảnh minh hoạ mẫu</text></svg>'''
    hot = {"x": (bx - 8) / w, "y": (by - 8) / h, "w": (bw + 16) / w, "h": (bh + 16) / h, "label": target}
    return svg, hot


# (tiêu đề bước, nội dung, màn hình, nút, vị trí dọc, lưu ý, cảnh báo)
GUIDES = [
    dict(title="Cài đặt ứng dụng và đăng nhập lần đầu", platform=M, category="bat-dau", beginner=True, featured=True,
         summary="Tải ứng dụng ENumber Chấm Công về điện thoại và đăng nhập bằng tài khoản được cơ quan cấp.",
         keywords=["cài app", "tải ứng dụng", "đăng nhập lần đầu", "người mới"],
         steps=[("Tải ứng dụng về điện thoại", "Mở App Store (iPhone) hoặc CH Play (Android), tìm “ENumber Chấm Công” và nhấn Cài đặt.", "Cửa hàng ứng dụng", "Cài đặt", .32, "Nên dùng Wi-Fi để tải nhanh hơn.", ""),
                ("Mở ứng dụng và cấp quyền", "Mở ứng dụng, chọn Cho phép khi được hỏi quyền Máy ảnh và Vị trí. Hai quyền này cần cho việc chấm công.", "Cấp quyền truy cập", "Cho phép", .62, "", "Nếu từ chối quyền Vị trí hoặc Máy ảnh, bạn sẽ không chấm công được."),
                ("Nhập tài khoản", "Nhập tên đăng nhập và mật khẩu do cơ quan cung cấp, sau đó nhấn Đăng nhập.", "Đăng nhập", "Đăng nhập", .55, "", ""),
                ("Kiểm tra thông tin cá nhân", "Sau khi vào màn hình chính, kiểm tra họ tên và đơn vị hiển thị đã đúng chưa.", "Trang chủ", "Xem hồ sơ", .40, "Nếu thông tin sai, hãy báo người quản trị của đơn vị.", "")]),
    dict(title="Đăng ký khuôn mặt để chấm công", platform=M, category="khuon-mat", beginner=True, featured=True,
         summary="Đăng ký khuôn mặt một lần để dùng cho các lần chấm công sau.",
         keywords=["đăng ký khuôn mặt", "face id", "chụp ảnh khuôn mặt", "lấy mẫu khuôn mặt"],
         steps=[("Mở mục Khuôn mặt", "Tại màn hình chính, vào Tài khoản rồi chọn Đăng ký khuôn mặt.", "Tài khoản", "Đăng ký khuôn mặt", .36, "", ""),
                ("Chuẩn bị trước khi chụp", "Đứng ở nơi đủ sáng, tháo khẩu trang và kính râm, giữ điện thoại ngang tầm mắt.", "Hướng dẫn chụp", "Bắt đầu", .70, "Tránh đứng ngược sáng (lưng quay về cửa sổ).", ""),
                ("Chụp khuôn mặt theo hướng dẫn", "Đưa khuôn mặt vào khung tròn và giữ yên đến khi ứng dụng báo hoàn tất.", "Chụp khuôn mặt", "Chụp", .78, "", "Không dùng ảnh chụp sẵn hoặc ảnh trên màn hình khác."),
                ("Xác nhận kết quả", "Kiểm tra ảnh rõ nét rồi nhấn Lưu. Nếu ảnh mờ, nhấn Chụp lại.", "Xác nhận", "Lưu", .72, "", "")]),
    dict(title="Chấm công bằng khuôn mặt", platform=M, category="cham-cong", featured=True, beginner=True,
         summary="Chấm công vào/ra hằng ngày bằng nhận diện khuôn mặt trên điện thoại.",
         keywords=["chấm công", "điểm danh", "check in", "chấm vào", "chấm ra"],
         steps=[("Mở màn hình Chấm công", "Mở ứng dụng và nhấn nút Chấm công ở màn hình chính.", "Trang chủ", "Chấm công", .46, "", ""),
                ("Kiểm tra vị trí", "Chờ ứng dụng xác định vị trí. Bạn cần ở trong khu vực chấm công của cơ quan.", "Chấm công", "Lấy lại vị trí", .34, "Bật GPS và đứng gần cửa sổ nếu vị trí chưa chính xác.", ""),
                ("Quét khuôn mặt", "Đưa khuôn mặt vào khung hình và giữ yên trong 1–2 giây.", "Nhận diện khuôn mặt", "Xác nhận", .78, "", ""),
                ("Xem kết quả", "Ứng dụng báo chấm công thành công kèm giờ ghi nhận. Bạn có thể xem lại trong Lịch sử chấm công.", "Kết quả", "Xem lịch sử", .58, "", "")]),
    dict(title="Đăng ký công tác trên điện thoại", platform=M, category="don-tu",
         summary="Tạo đơn đăng ký đi công tác để được ghi nhận công khi không có mặt tại cơ quan.",
         keywords=["công tác", "đơn công tác", "đi công tác", "đăng ký"],
         steps=[("Mở mục Đơn từ", "Tại màn hình chính, chọn Đơn từ rồi nhấn Tạo đơn mới.", "Đơn từ", "Tạo đơn mới", .30, "", ""),
                ("Chọn loại đơn Công tác", "Trong danh sách loại đơn, chọn Công tác.", "Chọn loại đơn", "Công tác", .40, "", ""),
                ("Nhập thời gian và nội dung", "Chọn ngày bắt đầu, ngày kết thúc, nơi công tác và nhập lý do.", "Đơn công tác", "Tiếp tục", .76, "", "Kiểm tra kỹ ngày tháng: đơn sai ngày có thể bị từ chối."),
                ("Gửi đơn", "Nhấn Gửi đơn. Đơn sẽ chuyển tới người phê duyệt và bạn theo dõi trạng thái trong mục Đơn từ.", "Xác nhận gửi", "Gửi đơn", .72, "", "")]),
    dict(title="Không nhận diện được khuôn mặt khi chấm công", platform=M, category="khuon-mat", kind="fix", featured=True,
         summary="Ứng dụng báo không nhận diện được hoặc khuôn mặt không khớp khi chấm công.",
         keywords=["không nhận khuôn mặt", "khuôn mặt không khớp", "lỗi face", "nhận diện thất bại", "không quét được mặt"],
         quick=["Lau sạch camera trước, đứng nơi đủ sáng.", "Tháo khẩu trang, kính râm, mũ.", "Vẫn lỗi: đăng ký lại khuôn mặt.", "Cập nhật ứng dụng lên bản mới nhất."],
         steps=[("Kiểm tra ánh sáng và camera", "Lau sạch camera trước. Đứng ở nơi đủ sáng, không ngược sáng, giữ điện thoại ngang tầm mắt.", "Nhận diện khuôn mặt", "Thử lại", .78, "Phần lớn trường hợp lỗi là do thiếu sáng hoặc camera bị bẩn.", ""),
                ("Tháo vật che khuôn mặt", "Tháo khẩu trang, kính râm, mũ rồi thử lại.", "Nhận diện khuôn mặt", "Thử lại", .78, "", ""),
                ("Đăng ký lại khuôn mặt", "Nếu vẫn không được, vào Tài khoản → Đăng ký khuôn mặt để chụp lại mẫu mới.", "Tài khoản", "Đăng ký khuôn mặt", .36, "Nên đăng ký lại nếu ngoại hình thay đổi nhiều (đổi kiểu tóc, đeo kính mới).", ""),
                ("Cập nhật ứng dụng", "Mở cửa hàng ứng dụng và cập nhật ENumber Chấm Công lên phiên bản mới nhất.", "Cửa hàng ứng dụng", "Cập nhật", .32, "", "")]),
    dict(title="Không đăng nhập được ứng dụng", platform=M, category="dang-nhap", kind="fix", featured=True,
         summary="Ứng dụng báo sai tài khoản, sai mật khẩu hoặc không kết nối được khi đăng nhập.",
         keywords=["không đăng nhập được", "sai mật khẩu", "quên mật khẩu", "lỗi đăng nhập", "không vào được app"],
         quick=["Kiểm tra Wi-Fi/4G.", "Gõ lại tài khoản, chú ý chữ hoa và dấu cách.", "Quên mật khẩu: liên hệ quản trị đơn vị để cấp lại."],
         steps=[("Kiểm tra kết nối mạng", "Mở thử một trang web bất kỳ. Nếu không vào được, hãy đổi giữa Wi-Fi và 4G.", "Đăng nhập", "Thử lại", .62, "", ""),
                ("Nhập lại tài khoản và mật khẩu", "Gõ lại cẩn thận, chú ý chữ hoa/chữ thường và không để thừa dấu cách. Nhấn biểu tượng con mắt để xem mật khẩu đang gõ.", "Đăng nhập", "Đăng nhập", .55, "", "Nhập sai nhiều lần liên tiếp có thể khiến tài khoản bị tạm khoá."),
                ("Yêu cầu cấp lại mật khẩu", "Nếu quên mật khẩu, liên hệ người quản trị của đơn vị để được đặt lại.", "Đăng nhập", "Quên mật khẩu?", .68, "", "")]),
    dict(title="Báo ngoài phạm vi hoặc sai vị trí khi chấm công", platform=M, category="cham-cong", kind="fix",
         summary="Bạn đang ở cơ quan nhưng ứng dụng báo ngoài phạm vi chấm công.",
         keywords=["sai vị trí", "ngoài phạm vi", "gps", "định vị", "không lấy được vị trí"],
         quick=["Bật GPS ở chế độ chính xác cao.", "Cấp quyền Vị trí cho ứng dụng.", "Ra gần cửa sổ, nhấn Lấy lại vị trí."],
         steps=[("Bật định vị (GPS)", "Vuốt thanh trạng thái xuống và bật Vị trí. Trên Android nên chọn chế độ Độ chính xác cao.", "Cài đặt nhanh", "Vị trí", .30, "", ""),
                ("Cấp quyền Vị trí cho ứng dụng", "Vào Cài đặt điện thoại → Ứng dụng → ENumber Chấm Công → Quyền → Vị trí → Cho phép khi dùng ứng dụng.", "Quyền ứng dụng", "Cho phép khi dùng", .44, "", ""),
                ("Lấy lại vị trí", "Quay lại màn hình Chấm công, ra gần cửa sổ hoặc nơi thoáng rồi nhấn Lấy lại vị trí.", "Chấm công", "Lấy lại vị trí", .34, "Trong nhà nhiều tầng, GPS có thể lệch vài chục mét.", "Không dùng ứng dụng giả lập vị trí: tài khoản có thể bị khoá.")]),
    dict(title="Đăng nhập Web quản trị", platform=W, category="dang-nhap", beginner=True,
         summary="Đăng nhập trang quản trị ENumber Chấm Công trên máy tính.",
         keywords=["đăng nhập web", "trang quản trị", "máy tính"],
         steps=[("Mở trang quản trị", "Mở trình duyệt Chrome hoặc Edge và truy cập địa chỉ trang quản trị do eNumber cung cấp.", "Trình duyệt", "Truy cập", .28, "", ""),
                ("Nhập tài khoản quản trị", "Nhập tên đăng nhập, mật khẩu rồi nhấn Đăng nhập.", "Đăng nhập hệ thống", "Đăng nhập", .56, "", "Không lưu mật khẩu trên máy tính dùng chung."),
                ("Chọn đơn vị làm việc", "Nếu tài khoản quản lý nhiều đơn vị, chọn đơn vị cần thao tác ở góc trên.", "Bảng điều khiển", "Chọn đơn vị", .22, "", "")]),
    dict(title="Xem thống kê và xuất báo cáo chấm công", platform=W, category="bao-cao", featured=True,
         summary="Xem bảng công theo tháng và xuất báo cáo ra tệp Excel.",
         keywords=["báo cáo", "bảng công", "xuất excel", "thống kê", "tổng hợp công"],
         steps=[("Mở mục Báo cáo", "Tại thanh bên trái, chọn Báo cáo → Bảng chấm công.", "Bảng điều khiển", "Báo cáo", .26, "", ""),
                ("Chọn thời gian và phòng ban", "Chọn tháng cần xem và phòng ban, sau đó nhấn Xem.", "Bảng chấm công", "Xem", .30, "", ""),
                ("Kiểm tra dữ liệu", "Rà soát các ngày thiếu công hoặc đi muộn được tô màu trong bảng.", "Bảng chấm công", "Chi tiết", .52, "Nhấn vào một ô để xem giờ vào/ra cụ thể.", ""),
                ("Xuất Excel", "Nhấn Xuất Excel để tải tệp báo cáo về máy.", "Bảng chấm công", "Xuất Excel", .22, "", "")]),
    dict(title="Phê duyệt đơn công tác, nghỉ phép", platform=W, category="phe-duyet",
         summary="Người quản lý duyệt hoặc từ chối đơn do cán bộ gửi lên.",
         keywords=["duyệt đơn", "phê duyệt", "từ chối đơn", "đơn nghỉ phép"],
         steps=[("Mở danh sách đơn chờ duyệt", "Chọn Phê duyệt → Đơn chờ duyệt ở thanh bên trái.", "Bảng điều khiển", "Phê duyệt", .30, "", ""),
                ("Xem chi tiết đơn", "Nhấn vào đơn để xem thời gian, lý do và người gửi.", "Đơn chờ duyệt", "Xem chi tiết", .40, "", ""),
                ("Duyệt hoặc từ chối", "Nhấn Duyệt để chấp thuận, hoặc Từ chối và nhập lý do.", "Chi tiết đơn", "Duyệt", .68, "", "Đơn đã duyệt sẽ được tính công ngay; hãy kiểm tra kỹ trước khi xác nhận.")]),
]

SYMPTOMS = [
    {"id": "login", "label": "Không đăng nhập được", "platform": M, "causes": [
        {"label": "Báo sai tài khoản hoặc mật khẩu", "guide": "khong-dang-nhap-duoc-ung-dung", "step": 1},
        {"label": "Quên mật khẩu", "guide": "khong-dang-nhap-duoc-ung-dung", "step": 2},
        {"label": "Báo lỗi kết nối / quay mãi không vào", "guide": "khong-dang-nhap-duoc-ung-dung", "step": 0}]},
    {"id": "face", "label": "Chấm công không nhận khuôn mặt", "platform": M, "causes": [
        {"label": "Quét mãi không nhận", "guide": "khong-nhan-dien-duoc-khuon-mat-khi-cham-cong", "step": 0},
        {"label": "Báo khuôn mặt không khớp", "guide": "khong-nhan-dien-duoc-khuon-mat-khi-cham-cong", "step": 2},
        {"label": "Chưa từng đăng ký khuôn mặt", "guide": "dang-ky-khuon-mat-de-cham-cong", "step": 0}]},
    {"id": "gps", "label": "Báo sai vị trí / ngoài phạm vi", "platform": M, "causes": [
        {"label": "Điện thoại chưa bật GPS", "guide": "bao-ngoai-pham-vi-hoac-sai-vi-tri-khi-cham-cong", "step": 0},
        {"label": "Ứng dụng chưa được cấp quyền Vị trí", "guide": "bao-ngoai-pham-vi-hoac-sai-vi-tri-khi-cham-cong", "step": 1},
        {"label": "Đang ở cơ quan nhưng vẫn báo ngoài phạm vi", "guide": "bao-ngoai-pham-vi-hoac-sai-vi-tri-khi-cham-cong", "step": 2}]},
    {"id": "report", "label": "Không thấy dữ liệu báo cáo", "platform": W, "causes": [
        {"label": "Chưa biết xem bảng công ở đâu", "guide": "xem-thong-ke-va-xuat-bao-cao-cham-cong", "step": 0},
        {"label": "Cần xuất ra Excel", "guide": "xem-thong-ke-va-xuat-bao-cao-cham-cong", "step": 3}]},
]


def symptoms():
    f = config.DATA_DIR / "symptoms.json"
    if not f.exists():
        f.write_text(json.dumps(SYMPTOMS, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        return json.loads(f.read_text(encoding="utf-8"))
    except ValueError:
        return SYMPTOMS


def run():
    """Chỉ nạp khi CSDL trống."""
    if db.all_guides():
        return 0
    folder = config.MEDIA_DIR / "seed"
    folder.mkdir(parents=True, exist_ok=True)
    for n, g in enumerate(GUIDES):
        steps = []
        for i, (title, body, screen, target, pos, note, warn) in enumerate(g["steps"]):
            svg, hot = mock_svg(g["platform"], screen, target, pos)
            name = f"g{n + 1}-s{i + 1}.svg"
            (folder / name).write_text(svg, encoding="utf-8")
            steps.append({"title": title, "body": body, "image": f"seed/{name}", "hotspot": hot, "note": note, "warning": warn})
        gid = db.create_guide({**g, "steps": steps}, source={"filename": "Dữ liệu mẫu", "type": "seed", "imported_at": None})
        db.publish(gid)
    db.ann_save({"title": "Chào mừng đến với SupportFlow", "level": "info", "pinned": True, "published": True,
                 "body": "Đây là thông báo mẫu. Người biên tập có thể sửa hoặc xoá trong Studio, mục Thông báo."})
    return len(GUIDES)
