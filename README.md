# Health Post AI V4 – Firebase + Google Calendar (thử nghiệm)

Đây là **bản V4 riêng**. Không thay đổi repository, Firebase hoặc OAuth của V3. Chưa có AI tự tạo nội dung. CSV ChatGPT V3/V4 vẫn dùng được.

## A. Cài đặt mã nguồn

Tải toàn bộ 8 file trong ZIP lên repository `health-post-ai-v4` (thay các file cũ). File `firebase-config.js` mới chứa giá trị `null` và `''` nên website vẫn chạy ở chế độ thiết bị trước khi cấu hình. Không đưa **client secret**, service account JSON hay API key máy chủ vào GitHub.

## B. Tạo Firebase RIÊNG cho V4

1. Vào https://console.firebase.google.com/ → Add project → tạo `health-post-ai-v4` (tên hiển thị tùy ý).
2. Project settings (biểu tượng bánh răng) → Your apps → Web `</>` → đăng ký app. Sao chép `firebaseConfig` gồm `apiKey`, `authDomain`, `projectId`, `appId`, ...
3. Build → Authentication → Get started → Sign-in method → Google → Enable → Save. Thêm domain `nhaduycdag-design.github.io` vào **Authorized domains** (nếu chưa có).
4. Build → Firestore Database → Create database → chọn vùng phù hợp → tạo. Vào **Rules**, dán toàn bộ nội dung `firestore.rules` từ ZIP, bấm Publish. Rules này chỉ cho người đăng nhập đọc/ghi dữ liệu của chính họ trong `v4_users/{uid}/topics`.
5. GitHub repo V4 → `firebase-config.js` → Edit: thay `null` bằng object Firebase Web config (giữ `window.HEALTH_POST_V4_FIREBASE_CONFIG = {...};`). **Không sao chép cấu hình Firebase của V3.**
6. Mở website V4, nhấn **Đăng nhập Google V4**. Kiểm tra trạng thái `Firebase V4 · email`. Dữ liệu trên thiết bị không tự tải lên cloud. Nếu muốn chuyển các chủ đề V4 đang lưu cục bộ, nhấn **Chép dữ liệu thiết bị lên V4 Cloud** một lần, sau khi sao lưu JSON.

## C. Google Calendar riêng cho V4

1. Vào https://console.cloud.google.com/ → tạo **Google Cloud project V4 riêng** hoặc chọn project Google Cloud V4 đã tạo. Bật **Google Calendar API** ở APIs & Services → Library.
2. Google Auth Platform → Branding / Audience: cấu hình consent screen, External; trong Testing thêm tài khoản Google của bạn vào **Test users**. Nếu có thể, để Testing khi chỉ thử nghiệm. Thêm scope `https://www.googleapis.com/auth/calendar.events` tại Data Access nếu giao diện yêu cầu. Scope có thể yêu cầu Google xác minh khi công khai cho nhiều người.
3. Clients → Create client → OAuth client ID → **Web application**. Authorized JavaScript origins: `https://nhaduycdag-design.github.io` (không có đường dẫn `/health-post-ai-v4/`). Không cần redirect URI cho luồng popup token này.
4. Sao chép **Client ID** (đuôi `.apps.googleusercontent.com`) vào `firebase-config.js` ở `window.HEALTH_POST_V4_CALENDAR_CLIENT_ID = '...';`. **KHÔNG** đưa Client Secret lên GitHub.
5. Commit file, chờ GitHub Pages cập nhật, tải lại website. Mở một chủ đề, nhập **nguồn + ngày kiểm chứng**, nội dung, giờ đăng, chọn trạng thái **Đã duyệt** cho ít nhất một nền tảng; nhấn **Lưu toàn bộ thay đổi**. Sau đó nhấn **Đồng bộ Google Calendar (2 bài)** và cấp quyền Google. Chỉ những phiên bản đã duyệt có giờ đăng mới được đồng bộ, nhắc trước 2 phút.
6. Vào https://calendar.google.com/ → lịch chính của đúng tài khoản đã cấp quyền → kiểm tra sự kiện ở ngày giờ đã đặt. Nếu không thấy, xem thông báo lỗi trong ứng dụng hoặc F12 → Console / Network.

**Quan trọng:** Đồng bộ Calendar là thao tác thủ công, không tự chạy mỗi lần lưu. Nếu đổi giờ hoặc nội dung của một bài đã đồng bộ, hãy **Lưu** rồi **Đồng bộ Google Calendar** lại để cập nhật sự kiện. Nếu bỏ duyệt/xóa chủ đề, sự kiện cũ **không tự xóa**; hãy xóa sự kiện đó trong Google Calendar. Chưa tự đăng Facebook/TikTok.

## D. Sao lưu và an toàn

Trước khi thay mã, bấm **Xuất sao lưu JSON**. Dữ liệu Firebase V4 nằm trong project mới và collection riêng, không liên quan V3. Đừng dùng chung cấu hình V3. Khi thử nghiệm, nên dùng bài giả và kiểm tra riêng 1–2 chủ đề trước khi nhập hàng trăm bài. Nếu Google Calendar hiện màn hình ứng dụng chưa được xác minh, chỉ tiếp tục nếu đây đúng là OAuth client bạn vừa tạo và bạn hiểu quyền đã yêu cầu.
