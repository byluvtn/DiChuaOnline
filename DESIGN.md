# DESIGN.md — DiChuaOnline

> File này là nguồn sự thật duy nhất về giao diện. Mọi agent (Roo Code / Sonnet / Antigravity)
> phải đọc file này TRƯỚC khi viết code UI hoặc scene 3D, và không được tự ý thêm màu,
> font, khoảng cách hay kiểu nút ngoài những gì định nghĩa ở đây.
> Ảnh tham chiếu: `references/chuaonline.png` (chụp từ chuaonline.org) — khi mâu thuẫn
> giữa trí nhớ của model và ảnh tham chiếu, ảnh tham chiếu thắng.

## 1. Định hướng sản phẩm

- App đi chùa online cho **iOS / Android**, dùng chính trên điện thoại **dọc (portrait)**.
- Cảm giác cần đạt: ấm, đông vui, trang nghiêm nhưng gần gũi — như đang đứng trong
  chánh điện giờ lễ, KHÔNG phải game chiến đấu, KHÔNG phải app thiền tối giản kiểu Tây.
- Nhân vật phong cách chibi 3D (đầu to, áo cà sa / áo tràng), scene 3D bằng Three.js,
  UI là lớp HTML/CSS phủ lên trên canvas — 2 lớp tách biệt hoàn toàn, không vẽ UI trong canvas.
- Nguyên tắc vàng: **ít nút, nút to, một hành động chính mỗi màn hình.**

## 2. Màu sắc

Màu dưới đây được lấy mẫu trực tiếp từ ảnh tham chiếu (`references/chuaonline.png`).
Không dùng màu ngoài bảng này cho UI. Màu cho scene 3D có thể biến thiên theo ánh sáng
nhưng phải xuất phát từ các màu gốc này.

### 2.1 Màu thương hiệu / scene

| Token | Hex | Lấy từ | Dùng cho |
|---|---|---|---|
| `--lacquer-red` | `#970006` | Cột chánh điện | Cột, mái, khung chính, điểm nhấn trang trọng |
| `--lantern` | `#EF5F29` | Đèn lồng | Đèn lồng, glow ấm, badge thông báo |
| `--gold` | `#D3AC7E` | Sàn / ánh sáng ấm | Chữ tiêu đề, viền vàng, icon nổi bật |
| `--gold-deep` | `#A77B58` | Sàn bóng / gỗ | Gradient vàng, hover/pressed |
| `--wood` | `#885634` | Gỗ / sàn tối vừa | Bệ, bàn thờ, panel gỗ |
| `--wood-dark` | `#36160C` | Vùng tối nhất của scene | Nền trời chạng vạng, bóng đổ |
| `--floor` | `#97683E` | Gạch sàn | Sàn chánh điện (trước khi phủ texture) |
| `--panel` | `#3E2718` | Panel UI của bản gốc | Nền thẻ/panel bán trong suốt |
| `--robe-saffron` | `#E8A020` | Áo cà sa (màu chuẩn hoá) | Áo NPC tăng |
| `--robe-brown` | `#8A5A33` | Áo tràng cư sĩ | Áo NPC cư sĩ |
| `--cream` | `#F5E7CE` | Giấy / ánh nến | Chữ trên nền tối, nền thẻ sáng |

### 2.2 Màu UI

| Token | Hex | Dùng cho |
|---|---|---|
| `--bg-app` | `#1D0F08` | Nền app ngoài scene (màn hình phụ, loading) |
| `--surface` | `rgba(62,39,24,0.92)` | Panel, bottom sheet, thẻ — luôn có nền mờ `backdrop-filter: blur(8px)` |
| `--surface-light` | `#F8EFDD` | Thẻ sáng (kinh, bài viết) |
| `--text-on-dark` | `#F5E7CE` | Chữ chính trên nền tối |
| `--text-on-dark-dim` | `rgba(245,231,206,0.65)` | Chữ phụ trên nền tối |
| `--text-on-light` | `#3A2415` | Chữ trên thẻ sáng |
| `--accent` | `#EF5F29` | Nút chính, trạng thái đang chọn |
| `--accent-gold` | `#D3AC7E` | Viền chọn, cấp bậc, công đức |
| `--success` | `#7FB069` | Hoàn thành nhiệm vụ, đã lạy xong |
| `--danger` | `#C0392B` | Báo lỗi (hiếm dùng) |

Cấm: gradient tím/xanh dương kiểu app SaaS, màu neon, nền xám lạnh (`#262627` là lỗi
đã gặp ở bản cũ — tuyệt đối không để xám lạnh chiếm diện tích lớn).

## 3. Typography

- Font chính: **Be Vietnam Pro** (Google Fonts, hỗ trợ tiếng Việt đầy đủ).
  Dự phòng: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- Font tiêu đề trang trọng (tên chùa, câu đối, kinh): **Playfair Display** hoặc
  **Noto Serif** (có hỗ trợ tiếng Việt ở Noto Serif) — chỉ dùng cho tiêu đề lớn, không dùng cho nút.
- Thang chữ (px): `12 / 14 / 16 / 18 / 22 / 28`. Chữ thân bài mặc định 16.
- Tên nhân vật nổi trên đầu NPC: 11–12px, đậm (600), chữ `--cream`, nền pill
  `rgba(29,15,8,0.72)`, bo tròn 999px, viền 1px `rgba(211,172,126,0.5)`.
  Cấp bậc nằm trong ô vuông nhỏ màu `--gold` ở đầu pill.

## 4. Khoảng cách, bo góc, đổ bóng

- Lưới khoảng cách 4px: chỉ dùng `4 / 8 / 12 / 16 / 20 / 24 / 32`.
- Bo góc: thẻ `16px`, bottom sheet `24px` (2 góc trên), nút pill `999px`, nút vuông `12px`, avatar `50%`.
- Viền: 1px `rgba(211,172,126,0.35)` cho panel tối — viền vàng mờ là dấu hiệu nhận diện, giữ nhất quán.
- Bóng: `0 8px 24px rgba(0,0,0,0.45)` cho panel nổi; chữ trên scene luôn có
  `text-shadow: 0 1px 4px rgba(0,0,0,0.6)`.
- Vùng chạm: mọi nút/icon bấm được tối thiểu **44×44px**. Đây là luật cứng cho mobile.

## 5. Layout khung cho mọi màn hình scene

Khung chuẩn portrait 390×844 (thiết kế và kiểm thử ở đúng kích thước này, sau đó mới
kiểm tra 360×800 và 430×932):

```
┌─────────────────────────────┐
│ TopBar (cao 56, trong suốt) │  avatar+pháp danh+cấp | chuông, thư, cài đặt
│                             │
│                             │
│          SCENE 3D           │  chiếm toàn màn, UI nổi lên trên
│                             │
│  [Hành động chính dạng pill]│  tối đa 3 nút, nổi trên bottom nav
│ BottomNav (cao 64 + safe)   │  đúng 5 mục
└─────────────────────────────┘
```

- TopBar: nền gradient từ `rgba(29,15,8,0.75)` về trong suốt, không dùng thanh đặc che scene.
- Panel phụ (đèn nguyện, bảng xếp hạng, chat cộng đồng) mở dạng **bottom sheet**
  trượt từ dưới lên, cao tối đa 70% màn hình, có tay nắm kéo và nút đóng rõ ràng.
  KHÔNG mở panel cố định 2 bên như bản desktop.
- Toast/thông báo nhỏ nằm ngay trên BottomNav, tự ẩn sau 3 giây.

## 6. Điều hướng — BottomNav đúng 5 mục

| Mục | Icon | Màn hình |
|---|---|---|
| Sân chùa | chùa | Scene tổng quan, chọn khu vực |
| Thiền | ngồi thiền | Phòng thiền / vườn thiền |
| **Lễ Phật** | chắp tay | **Nút giữa, nổi lên, đường kính 56px, nền `--accent`, là hành động chính của app** |
| Tụng kinh | sách | Danh sách kinh + máy tụng |
| Cá nhân | người | Pháp danh, cấp, công đức, nhiệm vụ |

Mọi tính năng khác (bản đồ chùa, xin xăm, cách chơi, cửa hàng, túi đồ, xếp hạng,
cộng đồng...) đi qua nút "Thêm" ở TopBar hoặc qua Sân chùa — KHÔNG đưa xuống BottomNav.
Bản cũ có ~14 nút ở thanh dưới: đó là lỗi số 1 cần tránh lặp lại.

## 7. Các thành phần (components) — dùng lại, không chế mới

1. **Pill hành động**: nền `--surface`, viền vàng mờ, icon trái + chữ 14px/600.
   Trạng thái đang hoạt động (đang lạy, đang tụng): nền `--accent`, thêm thời gian đếm ở cuối pill.
2. **Thẻ nhiệm vụ / thẻ kinh**: nền `--surface-light`, bo 16, tiêu đề 16/700 màu `--text-on-light`,
   mô tả 14px, nút hành động pill nhỏ bên phải.
3. **Sheet đèn nguyện**: danh sách điều nguyện dạng thẻ tối xếp dọc, mỗi thẻ có nút tim ở phải,
   nút chính "Thả đèn nguyện" full-width nền `--accent` dính đáy sheet.
4. **Hàng chat cộng đồng**: chỉ 1 dòng chat rút gọn ở góc dưới-trái (cao tối đa 96px, mờ dần),
   bấm vào mới mở full sheet. Không để khung chat to cố định che scene như bản desktop.
5. **Thanh công đức / cấp**: pill nhỏ trong TopBar: icon xu + số, cập nhật có animation +số bay lên.

## 8. Scene 3D — thông số bắt buộc (Three.js)

Đây là phần làm bản cũ "trống". Các con số dưới đây là điểm khởi đầu đã cân theo ảnh
tham chiếu; chỉ tinh chỉnh từng thông số một mỗi vòng lặp, không sửa hàng loạt.

### 8.1 Camera

- Góc nhìn chính diện **hơi chéo**: vị trí `(6.5, 9, 13.5)` nhìn về `(0, 0.8, -1.5)`
  (đơn vị mét trong scene), `fov: 42`. Tránh camera chính diện đối xứng tuyệt đối
  `(0, y, z)` — đó là nguyên nhân bản cũ trông như sơ đồ lớp học.
- Portrait: kéo camera lùi thêm ~20% và hạ góc xuống một chút để thấy cả mái + sàn.
- Giới hạn OrbitControls (nếu cho xoay): azimuth ±28°, polar 55°–72°, tắt zoom mặc định.

### 8.2 Bố cục chánh điện

- Lối đi giữa rộng **2.4m** (bản cũ ~4m nên trống), hai dãy bồ đoàn so le nhau.
- Bồ đoàn: đường kính 0.55m, khoảng cách ngang 0.95m, dọc 1.05m, hàng sau lệch 0.45m so với hàng trước.
- **Tiền cảnh bắt buộc có**: 2 cột đỏ đường kính 0.7m ở x = ±3.4, z = 6.5 (gần camera,
  bị cắt một phần khung hình là đúng ý đồ) + 2 đèn lồng treo x = ±2.6, y = 4.4, z = 6.
  Đây là "khung tranh" tạo chiều sâu giống ảnh gốc — thiếu nó scene sẽ phẳng.
- Bàn thờ ở z = -7.5: bệ cao 0.8m, tượng Phật vàng phát sáng nhẹ, 2 lư hương có khói (sprite mờ bay lên).
- Mái: dùng mặt phẳng cong/vòm tối màu `--wood-dark` với xà ngang đỏ, KHÔNG dùng
  mái phẳng đỏ tươi phủ kín trời như bản cũ. Chừa khoảng trời chạng vạng phía xa.

### 8.3 NPC — mật độ và sự sống

- Số NPC trong chánh điện: **90–130** (bản cũ ~35 nên vắng). Ngoài khả năng hiển thị
  thì dùng `InstancedMesh` cho thân/đầu hoặc merge geometry; không tạo 130 Group riêng lẻ nếu máy yếu.
- Mỗi NPC được ngẫu nhiên hoá trong biên độ nhỏ (đây là chi tiết làm scene "thật"):
  vị trí ±0.09m, xoay Y ±10°, tỉ lệ thân 0.95–1.05, tông áo lệch ±8% độ sáng.
- Tỉ lệ màu áo: 55% cà sa (`--robe-saffron` và biến thể), 30% áo tràng nâu/xám,
  15% áo màu trầm khác (xanh rêu, chàm tối). Không dùng màu tươi ngoài bảng.
- Animation: bob nhẹ (nhịp thở) biên độ 0.008–0.015m, chu kỳ 2.6–3.8s lệch pha nhau;
  một số NPC có động tác chắp tay/lạy theo vòng lặp khi người dùng bấm Lễ Phật.
- Người dùng: 1 nhân vật chính nổi bật hơn — vòng sáng dưới chân (vòng tròn vàng,
  opacity 0.35, pulsing nhẹ), pháp danh luôn hiển thị, NPC chỉ hiện tên khi ở gần camera (z > -2)
  hoặc khi được chạm vào — tránh rối mắt như bản gốc hiện tên tất cả.

### 8.4 Ánh sáng, không khí, hậu kỳ

- `scene.fog = new THREE.Fog(0x2a1408, 18, 38)` — sương ấm, không dùng fog xám.
- Ánh sáng: ambient `#FFD9A0` cường độ 0.55; directional (nắng chiều qua cửa) `#FFB066`, 1.1,
  có shadow map 2048, soft shadow; mỗi đèn lồng 1 PointLight `#EF5F29`, 0.7, distance 7 —
  tối đa 6 point light, còn lại giả bằng emissive.
- Vật liệu phát sáng: đèn lồng và tượng Phật dùng `emissive` + sprite glow;
  nếu dùng post-processing thì chỉ bật Bloom nhẹ (strength 0.35, threshold 0.85) —
  mục tiêu là "hào quang" quanh NPC đang hành lễ giống ảnh gốc, không phải cháy sáng.
- Sàn: texture gạch hoa lặp (tile 1.2m) tự sinh bằng canvas hoặc ảnh texture,
  độ bóng nhẹ (`roughness 0.55`) để phản chiếu ánh đèn. Cấm sàn trơn một màu.
- Vignette CSS phủ trên canvas: radial-gradient trong suốt ở giữa → `rgba(20,8,2,0.42)` ở mép.

### 8.5 Hiệu năng (mobile là đích chính)

- Mục tiêu 60fps trên máy tầm trung (Snapdragon 7xx / iPhone 11 trở lên), chấp nhận 30fps tối thiểu.
- Tổng draw call < 120, tổng tam giác scene < 350k. Bóng đổ chỉ cho NPC hàng trước + cột + bàn thờ.
- Có mức chất lượng tự hạ: nếu fps < 28 trong 3 giây → tắt bloom, giảm pixelRatio xuống 1.25,
  giảm NPC còn 70. `pixelRatio = min(devicePixelRatio, 2)`.

## 9. Chuyển động của UI

- Sheet mở/đóng: 260ms, `cubic-bezier(0.32, 0.72, 0, 1)`.
- Bấm nút: scale 0.97 trong 90ms. Chuyển màn: fade scene 200ms, không slide kiểu web.
- Tôn trọng `prefers-reduced-motion` và có tuỳ chọn tắt hiệu ứng trong Cài đặt.

## 10. Nội dung & ngôn ngữ

- Toàn bộ UI tiếng Việt có dấu, văn phong kính cẩn vừa phải: "Thả đèn nguyện",
  "Lạy Phật", "Tụng kinh", "Công đức" — tránh ngôn ngữ game ("quẩy", "farm", "buff").
- Số đếm dùng dấu chấm ngăn nghìn kiểu Việt Nam: `1.294`, `17.085`.
- Thời lượng hiển thị dạng `30:33`, không dùng "30m 33s" trong pill hành động.

## 11. Những lỗi của bản hiện tại — danh sách cấm lặp lại

1. Thanh dưới ~14 nút nhỏ → chỉ còn BottomNav 5 mục (mục 6).
2. NPC xếp hàng thẳng tắp, mật độ thưa → áp dụng mục 8.3.
3. Camera chính diện đối xứng, lối đi quá rộng → áp dụng mục 8.1–8.2.
4. Sàn trơn, mái phẳng đỏ tươi, trời đen xám lạnh → áp dụng mục 2 và 8.4.
5. Panel/chat cố định che scene hai bên kiểu desktop → chuyển hết sang bottom sheet (mục 5).
6. Mỗi màn hình một kiểu nút/màu tự chế → chỉ dùng components ở mục 7 và token ở mục 2/4.

## 12. Quy trình kiểm tra trước khi báo "xong"

- Chụp màn hình ở 390×844, đặt cạnh `references/chuaonline.png`, tự liệt kê
  **5 điểm khác biệt lớn nhất còn lại** và mức độ giống ước lượng (%).
- Nếu điểm giống < 80% ở màn hình đang làm: tiếp tục sửa, không chuyển màn hình mới.
- Kiểm tra: không nút nào nhỏ hơn 44px, không màu nào ngoài bảng mục 2,
  BottomNav đúng 5 mục, fps trên bản build thử không dưới 30.
