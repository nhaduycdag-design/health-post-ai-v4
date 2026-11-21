# Health Post AI V4 — bản thử nghiệm độc lập

## Mục tiêu
Một chủ đề sức khỏe với hai bài viết Facebook/TikTok, hai lịch đăng và trạng thái độc lập; ghi nguồn kiểm chứng, lưu thống kê thủ công, sao lưu JSON.

## Cài lên GitHub Pages
1. Tạo repository **mới** `health-post-ai-v4` (KHÔNG sửa repo V3).
2. Giải nén ZIP, tải toàn bộ 5 file ở thư mục gốc lên repo mới: `index.html`, `style.css`, `app.js`, `manifest.webmanifest`, `icon.svg`.
3. Vào Settings → Pages → Deploy from a branch → `main` / `(root)` → Save.
4. Đợi GitHub Pages xuất bản rồi mở `https://<ten-tai-khoan>.github.io/health-post-ai-v4/`.

## Bảo vệ dữ liệu V3
- V4 sử dụng localStorage riêng với khóa `health-post-ai-v4-experiment-topics`.
- V4 KHÔNG kết nối Firebase V3, KHÔNG dùng OAuth V3, KHÔNG thay đổi repo V3.
- Dữ liệu V4 lưu trong từng trình duyệt, **chưa đồng bộ giữa điện thoại và máy tính**. Hãy dùng nút Xuất/Nhập JSON để sao lưu/chuyển dữ liệu.
- Không xóa dữ liệu trình duyệt khi chưa xuất sao lưu.

## Chức năng chưa triển khai
- AI sinh bài thực sự (nút “Tạo khung nội dung mẫu” chỉ tạo dàn ý, không gọi AI).
- Tự kiểm chứng kiến thức sức khỏe.
- Google Calendar và Firebase (cần dự án/cấu hình riêng cho V4).
- Tự đăng lên Facebook/TikTok hoặc tự lấy số liệu từ nền tảng.

## Quy tắc an toàn nội dung
Luôn kiểm tra nguồn đáng tin cậy, ngày kiểm chứng và các giới hạn của khuyến nghị trước khi duyệt. Không coi bản nháp tự động là lời khuyên y tế đã xác minh.
