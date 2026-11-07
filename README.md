# Niệm Phật Online (Bản Mobile 3D PWA)

Ứng dụng web 3D hỗ trợ niệm Phật, gõ mõ, tụng kinh, tự động lần nhịp và tích lũy công đức dành cho điện thoại Android & iOS (chạy dưới dạng Progressive Web App - PWA).

## Cập nhật giao diện khuôn viên

- Nhân vật chibi đầu lớn, áo vàng, tai tròn và tràng hạt; nút **Nhân vật** mở bản xem 3D sử dụng cùng mô hình với trong sân.
- Camera góc cao; thông tin cá nhân bên trái, công cụ bên phải, bảng đèn nguyện không khóa di chuyển và thanh thực hành phía dưới.
- Bảng tụng kinh mặc định thu gọn để không che khuôn viên. Có thể mở lại bằng nút **Tụng kinh**.

### Nguồn dữ liệu và giới hạn

**Bản này chưa kết nối dữ liệu cộng đồng từ https://chuaonline.org.** Việc kiểm tra tài nguyên frontend công khai chưa xác minh được API đọc dữ liệu được hỗ trợ cho ứng dụng bên ngoài. Không sử dụng giao thức đăng nhập hay tự kết nối vào hệ thống realtime chưa được xác nhận.

- Số online ở bản trước là số ngẫu nhiên trên máy, không phải số người thực. Đã bỏ bộ giả lập; hiện hiển thị **Chưa kết nối dữ liệu online**.
- Nhân vật khác trong cảnh là NPC trang trí, không đại diện người dùng đang kết nối.
- Lời nguyện và công đức chỉ lưu trong trình duyệt. Thả đèn không gửi lời nguyện tới trang gốc.
- Đã bỏ lời nguyện mẫu mặc định. Khi đọc dữ liệu bản cũ, giữ lời nguyện có mã do người dùng tạo và bỏ các mẫu không có mã.
- Liên kết **Cộng đồng thật** mở trang gốc, không phải đồng bộ dữ liệu. Muốn tích hợp thực cần API được chủ hệ thống cho phép, định nghĩa dữ liệu và chính sách CORS hoặc backend được cấp quyền. Không nhúng khóa bí mật trong frontend.

### Kiểm tra

Chạy bộ kiểm tra bằng lệnh: node tools/check-ui.mjs

Bộ kiểm tra xác nhận các id giao diện, tài nguyên cục bộ, sáu nút thực hành, việc loại bỏ số online giả và chuyển đổi dữ liệu lời nguyện cũ. Đây không phải kiểm tra hình ảnh/WebGL trên trình duyệt.

---

## 🌟 Tính năng chính

- **Không gian 3D Chùa Hương Sen**: Chú tiểu tọa đài sen cử động nhịp nhàng, hào quang tỏa sáng, không gian thanh tịnh.
- **Tiếng gõ mõ & chuông chân thực**: Tạo âm thanh bằng Web Audio API không cần tải file ngoài, mô phỏng đúng tần số âm học.
- **Hệ thống kinh chú đầy đủ**:
  - Chú Đại Bi (chuẩn 84 câu)
  - Bát Nhã Ba La Mật Đa Tâm Kinh
  - Chú Vãng Sanh
  - Kệ Hồi Hướng
  - Niệm Phật (Nam Mô A Di Đà Phật)
- **Giọng đọc (AI)**: Sử dụng Web Speech API tiếng Việt để tụng từng câu theo nhịp.
- **Mõ tự động**: Tự động gõ và chuyển câu theo tốc độ tùy chỉnh (1 - 10).
- **Rung phản hồi (Haptic)**: Cảm ứng rung trên điện thoại khi gõ mõ.
- **Tích lũy công đức & Cấp bậc**: 9 cấp tu học từ _Khách Hành Hương_ đến _Bồ Tát Đạo_, lưu tiến trình vào máy (localStorage).
- **Cài đặt như App Native**: Hỗ trợ PWA, cài trực tiếp lên màn hình chính mà không cần tải qua App Store / Google Play.

---

## 📲 Hướng dẫn cài đặt và sử dụng trên Điện thoại

### 1. Dành cho iPhone / iPad (iOS Safari)

1. Mở trình duyệt **Safari** và truy cập vào đường link của game.
2. Bấm vào nút **Chia sẻ** (biểu tượng hình vuông có mũi tên chỉ lên ở thanh dưới cùng Safari).
3. Cuộn xuống và chọn **Thêm vào MH chính** (_Add to Home Screen_).
4. Đặt tên là **Niệm Phật** rồi bấm **Thêm** (_Add_).
5. Mở icon hoa sen vàng ngoài màn hình chính để trải nghiệm toàn màn hình như một app độc lập.

> **Mẹo trên iOS**: Khi vừa vào ứng dụng, bấm nút **"Vào chùa"** để mở khóa âm thanh theo quy định bảo mật của trình duyệt iOS.

---

### 2. Dành cho Android (Google Chrome / Brave / Edge)

1. Mở trình duyệt **Chrome** và truy cập vào liên kết.
2. Nhấn vào biểu tượng **3 dấu chấm** ở góc trên bên phải màn hình.
3. Chọn **Thêm vào màn hình chính** (_Add to Home screen_) hoặc **Cài đặt ứng dụng** (_Install app_).
4. Xác nhận cài đặt. Biểu tượng ứng dụng sẽ xuất hiện trên màn hình chính và trong danh sách app.

---

## 💻 Cách chạy thử trên máy tính (Local)

Yêu cầu máy tính có cài sẵn Python hoặc Node.js:

```bash
# Di chuyển vào thư mục niem-phat
cd niem-phat

# Chạy server với Python 3
python3 -m http.server 8080
```

Sau đó mở trình duyệt và truy cập: `http://localhost:8080` (hoặc `http://<IP-máy-tính>:8080` trên điện thoại cùng mạng Wi-Fi).

---

## 📁 Cấu trúc thư mục

```
niem-phat/
├── index.html            # Khung giao diện UI di động, importmap Three.js
├── manifest.webmanifest  # Cấu hình PWA cài đặt lên màn hình chính
├── sw.js                 # Service Worker hỗ trợ offline cache
├── css/
│   └── app.css           # Giao diện responsive mobile, hiệu ứng ánh sáng
├── js/
│   ├── app.js            # Điều khiển vòng lặp, tương tác mõ, tự động
│   ├── audio.js          # Bộ tổng hợp âm thanh Web Audio & Web Speech
│   ├── kinh.js           # Dữ liệu 5 bài kinh, 9 cấp bậc công đức
│   ├── scene.js          # Sân khấu 3D Three.js, chú tiểu, đài sen, ánh sáng
│   └── storage.js        # Lưu trữ điểm công đức, tùy chọn cá nhân
├── icons/
│   ├── icon-192.png      # Icon PWA cỡ 192x192
│   └── icon-512.png      # Icon PWA cỡ 512x512
└── tools/
    └── make-icons.py     # Script Python thuần tạo icon hoa sen
```


## Khuôn viên và nhân vật chibi (bản mở rộng)

- Ba mẫu nhân vật: tiểu tăng áo vàng/tràng hạt, Phật tử nam áo lam/tóc ngắn và Phật tử nữ tóc búi/trâm cài. Mở Nhân vật để chọn; lựa chọn được lưu trên thiết bị.
- Khuôn viên nền 84 × 100 đơn vị, sân lễ 38 × 31, trục giữa rộng 5 đơn vị. Chánh điện ở cuối sân, hai hành lang có mái, tam quan, cây và đèn lồng dọc biên.
- 120 đệm tương tác: 96 đệm ở sân đại chúng và 24 đệm trong hai vườn bên hông. Đây là vị trí ngồi, không phải số người online.
- Bấm đệm hoặc nút Ngồi thiền để nhân vật đi đến ngồi. WASD/phím mũi tên, joystick hoặc bấm chỗ khác để đứng dậy. Cuộn chuột để xem rộng hơn; điều hướng nhanh có Sân thiền và Vườn thiền.
- Map tự dựng bằng hình học, không tải hoặc sao chép map Minecraft; không sử dụng tài nguyên chưa rõ giấy phép.
- Kiểm tra bổ sung: node tools/check-campus.mjs. Chưa đối chiếu ảnh chụp kết quả WebGL trên trình duyệt thực tế.
