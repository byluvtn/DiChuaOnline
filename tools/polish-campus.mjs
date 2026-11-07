import fs from 'node:fs';
const edit = (path, transform) => fs.writeFileSync(path, transform(fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n')));
edit('js/characters.js', s => s.replace(
    'const x = positions.getX(i), y = positions.getY(i);\n        positions.setZ(i, Math.sqrt(Math.max(.015, .438 ** 2 - x * x - y * y)) * .91);',
    'const x = positions.getX(i), y = (positions.getY(i) - .025) / 1.04;\n        positions.setZ(i, Math.sqrt(Math.max(.015, .442 ** 2 - x * x - y * y)) * .91);'
));
edit('index.html', s => s.replace('>🧘 Sân thiền</button>', '><i>🧘</i> Sân thiền</button>').replace('>🌿 Vườn thiền</button>', '><i>🌿</i> Vườn thiền</button>'));
edit('css/garden-hud.css', s => s + `
/* Ba mẫu nhân vật chibi và điều hướng khuôn viên rộng. */
.character-card { max-height: calc(100dvh - 24px); overflow-y: auto; }
.avatar-options { display: flex; gap: 8px; margin: 16px 0; }
.avatar-options button { flex: 1; padding: 11px 5px; border: 1px solid #c8ae80; border-radius: 12px; background: #f4e6cb; color: #745834; cursor: pointer; font: inherit; font-size: 12px; }
.avatar-options button.active { background: #ac7735; color: #fff8e8; box-shadow: 0 3px 10px #8d612533; }
#quickNav { max-width: calc(100vw - 40px); overflow-x: auto; flex-wrap: nowrap; }
#quickNav button { flex-shrink: 0; }
@media (max-width: 700px) {
  #quickNav { max-width: calc(100vw - 190px); }
  #characterPreview { height: min(330px, 45dvh); }
}
`);
edit('README.md', s => s + `

## Khuôn viên và nhân vật chibi (bản mở rộng)

- Ba mẫu nhân vật: tiểu tăng áo vàng/tràng hạt, Phật tử nam áo lam/tóc ngắn và Phật tử nữ tóc búi/trâm cài. Mở Nhân vật để chọn; lựa chọn được lưu trên thiết bị.
- Khuôn viên nền 84 × 100 đơn vị, sân lễ 38 × 31, trục giữa rộng 5 đơn vị. Chánh điện ở cuối sân, hai hành lang có mái, tam quan, cây và đèn lồng dọc biên.
- 120 đệm tương tác: 96 đệm ở sân đại chúng và 24 đệm trong hai vườn bên hông. Đây là vị trí ngồi, không phải số người online.
- Bấm đệm hoặc nút Ngồi thiền để nhân vật đi đến ngồi. WASD/phím mũi tên, joystick hoặc bấm chỗ khác để đứng dậy. Cuộn chuột để xem rộng hơn; điều hướng nhanh có Sân thiền và Vườn thiền.
- Map tự dựng bằng hình học, không tải hoặc sao chép map Minecraft; không sử dụng tài nguyên chưa rõ giấy phép.
- Kiểm tra bổ sung: node tools/check-campus.mjs. Chưa đối chiếu ảnh chụp kết quả WebGL trên trình duyệt thực tế.
`);
console.log('Polished face surface, responsive avatar UI and documentation');
