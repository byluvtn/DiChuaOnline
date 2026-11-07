#!/usr/bin/env python3
"""Sinh icon PWA (PNG) bằng Python thuần - không cần Pillow."""
import math, os, struct, zlib

W = H = 512
SS = 2  # supersampling


def lerp(a, b, t):
    return a + (b - a) * t


def mix(c1, c2, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(round(lerp(c1[i], c2[i], t))) for i in range(3))


CREAM = (255, 249, 226)
GOLD_HI = (255, 228, 160)
GOLD = (232, 183, 96)
GOLD_LO = (158, 104, 36)
GOLD_DK = (110, 68, 22)


def in_ellipse(x, y, cx, cy, rx, ry):
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0


def petal_local(px, py, bx, by, h, w, rot):
    """Trả về (u, v) nếu điểm nằm trong cánh sen, ngược lại None.
    u: -1..1 theo bề ngang, v: 0 (đáy) .. 1 (đỉnh nhọn)."""
    dx, dy = px - bx, by - py
    ca, sa = math.cos(-rot), math.sin(-rot)
    lx = dx * ca - dy * sa
    ly = dx * sa + dy * ca
    if ly < 0 or ly > h:
        return None
    v = ly / h
    hw = w * (math.sin(math.pi * (v ** 0.72)) ** 0.9)
    if hw <= 0.4:
        return None
    if abs(lx) > hw:
        return None
    return lx / hw, v


# đáy chung của các cánh
BASE_Y = 372

# (lệch x, chiều cao, nửa rộng, góc xoay) - vẽ từ ngoài vào trong
PETALS = [
    (-96, 160, 36, 0.85),
    (96, 160, 36, -0.85),
    (-58, 200, 46, 0.45),
    (58, 200, 46, -0.45),
    (0, 244, 62, 0.0),
]


def petal_color(u, v, layer):
    """Màu trong cánh: sáng ở đỉnh, đậm ở đáy, tối ở mép, gân giữa sáng."""
    t = v ** 0.85
    col = mix(GOLD_LO, GOLD_HI, t)
    if t > 0.62:
        col = mix(col, CREAM, (t - 0.62) / 0.38 * 0.55)

    # khối 3D: mép tối dần
    edge = abs(u) ** 2.2
    col = mix(col, GOLD_DK, edge * 0.30)

    # gân giữa
    if abs(u) < 0.10:
        col = mix(col, CREAM, (1 - abs(u) / 0.10) * 0.20 * (0.4 + v * 0.6))

    # viền cánh
    if abs(u) > 0.90:
        col = mix(col, CREAM, (abs(u) - 0.90) / 0.10 * 0.55)

    # cánh trong cùng sáng hơn cho nổi khối
    col = mix(col, CREAM, layer * 0.05)
    return col


# Hệ số thu nhỏ hoạ tiết. = 1.0 cho icon thường; < 1.0 cho icon maskable
# (Android cắt tròn/vuông góc nên hoa sen phải nằm trong vùng an toàn 80%).
CONTENT_SCALE = 1.0


def shade(px, py):
    cx, cy = W / 2, H / 2

    # nền gradient tối - luôn phủ kín toàn khung (full-bleed, bắt buộc cho maskable)
    d = min(1.0, math.hypot(px - cx, py - cy) / (W * 0.70))
    r, g, b = mix((66, 30, 16), (10, 5, 4), d)

    # thu nhỏ riêng phần hoạ tiết quanh tâm, nền vẫn phủ kín
    if CONTENT_SCALE != 1.0:
        px = cx + (px - cx) / CONTENT_SCALE
        py = cy + (py - cy) / CONTENT_SCALE

    # quầng sáng ấm phía sau hoa
    gd = math.hypot(px - cx, (py - 250) * 0.85) / 200
    if gd < 1:
        glow = (1 - gd) ** 2.3
        r, g, b = mix((r, g, b), (255, 168, 76), glow * 0.40)

    # đài sen (vẽ trước để cánh đè lên trên)
    if in_ellipse(px, py, cx, BASE_Y + 6, 152, 26):
        r, g, b = mix((r, g, b), GOLD_LO, 0.92)
    if in_ellipse(px, py, cx, BASE_Y + 16, 168, 13):
        r, g, b = mix((r, g, b), GOLD, 0.95)
    if in_ellipse(px, py, cx, BASE_Y + 26, 120, 7):
        r, g, b = mix((r, g, b), GOLD_HI, 0.95)

    # các cánh
    for layer, (ox, h, w, rot) in enumerate(PETALS):
        hit = petal_local(px, py, cx + ox, BASE_Y, h, w, rot)
        if hit:
            u, v = hit
            col = petal_color(u, v, layer)
            r, g, b = mix((r, g, b), col, 0.97)

    return r, g, b


def render(size):
    scale = W / size
    rows = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            ar = ag = ab = 0
            for sy in range(SS):
                for sx in range(SS):
                    px = (x + (sx + 0.5) / SS) * scale
                    py = (y + (sy + 0.5) / SS) * scale
                    rr, gg, bb = shade(px, py)
                    ar += rr
                    ag += gg
                    ab += bb
            n = SS * SS
            row += bytes((ar // n, ag // n, ab // n, 255))
        rows.append(bytes(row))
    return rows


def write_png(path, size, content_scale=1.0):
    global CONTENT_SCALE
    CONTENT_SCALE = content_scale
    rows = render(size)
    raw = b''.join(b'\x00' + r for r in rows)

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(raw, 9))
    png += chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)
    print('wrote', path, os.path.getsize(path), 'bytes')


if __name__ == '__main__':
    os.makedirs('icons', exist_ok=True)
    write_png('icons/icon-512.png', 512)
    write_png('icons/icon-192.png', 192)
    # maskable: nền phủ kín khung, hoạ tiết sen thu về 80% để Android cắt không mất hoa
    write_png('icons/icon-maskable-512.png', 512, content_scale=0.78)
