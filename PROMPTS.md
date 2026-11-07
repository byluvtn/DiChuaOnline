# PROMPTS.md — Bộ prompt theo chặng cho DiChuaOnline

Cách dùng với Roo Code trong Antigravity IDE (API Vilao, model Sonnet):

- Copy `DESIGN.md` vào gốc project, copy ảnh chụp chuaonline.org vào `references/chuaonline.png`.
- Chạy **đúng thứ tự từng prompt một**. Mỗi prompt = một phiên làm việc riêng.
  Hết prompt, xem kết quả, duyệt rồi mới dán prompt tiếp theo. Tuyệt đối không gộp chặng.
- Mỗi phiên nên đính kèm ảnh `references/chuaonline.png` (profile Vilao của bạn có hỗ trợ ảnh).
- Dùng chế độ Plan trước để model trình bày kế hoạch, duyệt xong mới cho Act/code.
- Sau mỗi chặng, chụp màn hình localhost ở khung 390×844 (DevTools → Device Toolbar)
  để dùng cho Prompt 6 — vòng lặp đối chiếu.

---

## Prompt 0 — Nạp luật chơi (dán một lần duy nhất ở phiên đầu, và dán lại khi mở phiên mới)

```
Từ nay trong project này, trước mọi nhiệm vụ về giao diện hoặc scene 3D, hãy đọc
DESIGN.md ở gốc project và ảnh references/chuaonline.png.

Luật cứng:
1. Không dùng màu, font, bo góc, khoảng cách ngoài DESIGN.md.
2. Không tự thêm nút/màn hình ngoài phạm vi nhiệm vụ được giao trong phiên.
3. Mỗi phiên chỉ làm ĐÚNG một nhiệm vụ tôi giao. Xong thì dừng và báo cáo,
   không tự "làm luôn phần tiếp theo cho tiện".
4. Khi không chắc một chi tiết trông thế nào, hãy mô tả lại từ ảnh tham chiếu
   thay vì tự tưởng tượng.
5. Báo cáo cuối phiên gồm: file đã sửa, thông số đã áp dụng, và 5 điểm còn khác
   ảnh tham chiếu nhất theo nhận định của bạn.

Xác nhận bạn đã đọc DESIGN.md bằng cách tóm tắt trong tối đa 8 dòng: bảng màu chính,
số mục của BottomNav, mật độ NPC yêu cầu, và góc camera quy định.
```

## Prompt 1 — Khung UI tĩnh (chưa logic, chưa đụng scene)

```
Đọc DESIGN.md (mục 2–7) và references/chuaonline.png.

Nhiệm vụ DUY NHẤT: dựng khung UI tĩnh phủ trên canvas cho màn Chánh Điện.
- Khung portrait 390×844, có safe-area top/bottom.
- TopBar trong suốt: avatar + pháp danh "Quảng Hạnh" + Cấp 1 + thanh công đức ở trái;
  bên phải chỉ 2 nút icon: chuông và thư. Nút tròn 44×44.
- Hàng pill khu vực ngay dưới TopBar: Sân chùa, Chánh Điện (đang chọn), Hồ Sen, Lầu Chuông —
  pill đang chọn nền accent theo DESIGN.md.
- BottomNav đúng 5 mục theo mục 6 của DESIGN.md, nút Lễ Phật ở giữa nổi 56px.
- 3 pill hành động nổi trên BottomNav bên phải: Lạy Phật, Gõ Mõ, Thắp Đèn — dùng component
  "Pill hành động" ở mục 7, chưa cần gắn sự kiện thật, bấm vào chỉ console.log.
- Canvas phía dưới tạm thời là một div nền gradient từ --wood-dark sang --panel,
  ghi chữ "SCENE 3D" ở giữa. Chưa viết Three.js trong phiên này.

Xong thì dừng. Báo cáo theo luật ở Prompt 0.
```

## Prompt 2 — Đổ nền scene: kiến trúc + ánh sáng (chưa NPC)

```
Đọc DESIGN.md (mục 8.1, 8.2, 8.4) và references/chuaonline.png.

Nhiệm vụ DUY NHẤT: thay div tạm bằng scene Three.js gồm kiến trúc và ánh sáng:
- Camera, fog, hệ ánh sáng đúng thông số mục 8.1 và 8.4.
- Sàn có texture gạch hoa tự sinh bằng canvas (tile 1.2m), lối đi giữa rộng 2.4m
  trải thảm đỏ son. (Nếu không trải thảm được, giữ sàn gạch và ghi chú lại.)
- 2 cột tiền cảnh + 2 đèn lồng treo đúng vị trí mục 8.2. Đèn lồng phát sáng emissive
  kèm PointLight theo đúng giới hạn ở mục 8.4.
- Bàn thờ + tượng Phật ở z = -7.5, có hào quang nhẹ.
- Mái và trời chạng vạng phía xa theo mục 8.2, không dùng mái phẳng đỏ tươi.
- Vignette CSS phủ trên canvas theo mục 8.4.
Chưa thêm NPC. Chưa sửa UI của Prompt 1.

Đối chiếu ảnh tham chiếu: scene phải trông ấm và có chiều sâu ngay cả khi chưa có người.
Xong thì dừng và báo cáo.
```

## Prompt 3 — NPC: mật độ + sự sống

```
Đọc DESIGN.md (mục 8.3 và 8.5) và references/chuaonline.png.

Nhiệm vụ DUY NHẤT: thêm NPC vào chánh điện.
- 90–130 NPC ngồi trên bồ đoàn theo lưới ở mục 8.2, dùng InstancedMesh hoặc giải pháp
  tương đương để giữ draw call < 120 — trình bày cách bạn chọn trước khi code.
- Ngẫu nhiên hoá vị trí/xoay/tỉ lệ/tông áo đúng biên độ mục 8.3. Tỉ lệ màu áo đúng mục 8.3.
- Animation nhịp thở lệch pha theo mục 8.3.
- Nhân vật chính của người dùng: vòng sáng dưới chân + pill pháp danh luôn hiện.
  NPC chỉ hiện pill tên khi ở gần camera (z > -2).
- Đo và ghi lại fps khi chạy thử vào cuối phiên; nếu dưới 30, áp dụng bậc hạ chất lượng
  ở mục 8.5 và ghi rõ đã hạ những gì.

Cấm xếp NPC thẳng hàng tuyệt đối — nếu ảnh chụp ra vẫn thấy hàng lối ngay ngắn như
sơ đồ lớp học thì phiên này chưa đạt. Xong thì dừng và báo cáo.
```

## Prompt 4 — Bottom sheet: Đèn nguyện + Chat rút gọn

```
Đọc DESIGN.md (mục 5 và 7) và references/chuaonline.png (panel Đèn nguyện bên phải
và khung Cộng đồng sân chùa bên trái của bản desktop — ta chuyển chúng thành sheet mobile).

Nhiệm vụ DUY NHẤT:
- Component BottomSheet dùng chung (mở 260ms theo easing ở mục 9, cao tối đa 70%,
  có tay nắm + nút đóng, bấm ra ngoài thì đóng).
- Sheet Đèn nguyện: mở khi bấm pill "Thắp Đèn". Bên trong là component "Sheet đèn nguyện"
  ở mục 7 với dữ liệu mẫu 6 điều nguyện, nút "Thả đèn nguyện" dính đáy. Bấm nút này thì
  đóng sheet và bay một chiếc đèn lên trong scene (một sprite/điểm sáng bay lên đơn giản là đủ).
- Chat rút gọn: 1 dòng chat mờ ở góc dưới-trái theo mục 7, bấm vào mở sheet chat với
  dữ liệu mẫu. Chưa nối backend, dữ liệu để trong file mock riêng.

Không sửa BottomNav, không sửa NPC. Xong thì dừng và báo cáo.
```

## Prompt 5 — Màn Tụng kinh (màn thứ hai, để kiểm chứng design system)

```
Đọc DESIGN.md (toàn bộ) và references/chuaonline.png.

Nhiệm vụ DUY NHẤT: màn Tụng Kinh (mục thứ 4 của BottomNav).
- Header trang trọng: chữ "Tụng Kinh" font serif theo mục 3, nền --bg-app.
- Danh sách kinh dạng "Thẻ nhiệm vụ / thẻ kinh" ở mục 7: Chú Đại Bi, Kinh A Di Đà,
  Kinh Phổ Môn, Bát Nhã Tâm Kinh — mỗi thẻ có thời lượng và số người đang tụng.
- Khi chọn một bài: mở player dạng bottom sheet — chữ kinh chạy trên thẻ sáng
  --surface-light, nút play/pause 56px, pill thời gian đang chạy giống pill hành động.
- Toàn bộ màu/nút/khoảng cách phải tái sử dụng token và component đã có.
  Nếu bạn thấy cần component mới, dừng lại và hỏi tôi trước khi tự chế.

Mục tiêu của phiên này là kiểm chứng: nhìn màn này phải biết ngay là cùng một app
với màn Chánh Điện. Xong thì dừng và báo cáo.
```

## Prompt 6 — Vòng lặp đối chiếu (dùng lặp lại sau mỗi chặng, đính kèm 2 ảnh)

```
Tôi đính kèm 2 ảnh: ảnh A là bản gốc references/chuaonline.png,
ảnh B là ảnh chụp bản hiện tại của tôi ở 390×844.

Hãy làm chính xác 3 việc:
1. Liệt kê 5 điểm khác biệt LỚN NHẤT giữa B và A, xếp theo mức ảnh hưởng thị giác
   giảm dần. Mỗi điểm ghi: hiện tại (B) đang như thế nào — bản gốc (A) như thế nào —
   thông số cụ thể cần đổi là gì, đối chiếu DESIGN.md nếu có.
2. Chỉ sửa đúng 5 điểm đó trong phiên này. Không sửa thêm bất cứ thứ gì khác,
   không refactor, không đổi cấu trúc file.
3. Cuối phiên: ước lượng mức độ giống tổng thể của B so với A theo %,
   và nêu điểm khác biệt lớn nhất còn lại để xử lý ở vòng sau.
```

## Prompt 7 — Tối ưu hiệu năng mobile (chạy khi scene đã đẹp)

```
Đọc DESIGN.md (mục 8.5).

Nhiệm vụ DUY NHẤT: tối ưu hiệu năng, KHÔNG thay đổi hình ảnh cảm nhận được:
- Đo và báo cáo: draw call, tổng tam giác, fps trên khung 390×844 trước khi sửa.
- Kiểm tra pixelRatio, shadow map, số PointLight, việc dùng InstancedMesh.
- Áp dụng cơ chế tự hạ chất lượng ở mục 8.5 (fps < 28 trong 3 giây → hạ bậc).
- Báo cáo số liệu sau khi sửa, kèm danh sách những gì đã đổi và ảnh hưởng hình ảnh
  của từng thay đổi (phải là "không đáng kể" — nếu đáng kể thì đừng làm, hãy hỏi tôi).
```

---

## Mẹo vận hành (không phải prompt)

- **Một phiên = một prompt.** Context Vilao của bạn là 80k token — nhồi nhiều chặng
  vào một phiên là model sẽ quên DESIGN.md ở cuối phiên và bắt đầu tự chế.
- **Phiên mới luôn bắt đầu bằng Prompt 0 rút gọn:** "Đọc lại DESIGN.md và
  references/chuaonline.png, xác nhận BottomNav có mấy mục và mật độ NPC yêu cầu là bao nhiêu."
  Nếu nó trả lời sai, đừng giao việc — bắt đọc lại.
- **Ảnh chụp là sự thật.** Sau mỗi prompt, tự mở localhost, chụp 390×844 và chạy Prompt 6.
  Đừng tin câu "đã hoàn thành theo đúng thiết kế" của model.
- **Khi model làm sai 2 lần liên tiếp ở cùng một điểm:** đừng prompt lại lần 3 giống hệt.
  Hãy chỉ đích danh thông số: "đèn lồng hiện ở y=3.2, DESIGN.md yêu cầu y=4.4, chỉ sửa số này".
- **Git:** commit sau mỗi chặng đạt. Tên commit gợi ý: `ui-shell`, `scene-architecture`,
  `npc-density`, `sheets`, `kinh-screen`. Xấu thì quay lại được ngay, khỏi cãi nhau với model.
