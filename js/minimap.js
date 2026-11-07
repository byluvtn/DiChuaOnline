/**
 * Minimap tròn vẽ bằng Canvas 2D — vẽ trực tiếp từ hình học khuôn viên chùa,
 * không dùng ảnh tĩnh. Kiến trúc lấy theo bản tham chiếu chuaonline.org:
 *   scene  = { bounds: {minX,maxX,minZ,maxZ}, shapes: [...] }
 *   shape  = { k:'rect', x0,x1,z0,z1 } | { k:'circle'|'mark', x,z,r }
 *   actor  = { x, z, npc }
 *   player = { x, z, ry }   (ry: hướng xoay quanh trục Y)
 *
 * Hàm vẽ chạy mỗi frame nên phải rẻ: chỉ arc/fillRect, không tạo gradient.
 */

const MAX_DPR = 2;

let canvas = null;
let ctx = null;
let scene = null;
let enabled = true;
let size = 148;
let dpr = 1;

/* Bảng màu bản đồ — tông đêm ấm giống ảnh tham chiếu */
const C = {
    void: 'rgba(14,11,10,.82)',
    ground: 'rgba(60,46,30,.75)',
    path: 'rgba(122,100,68,.55)',
    water: 'rgba(46,86,104,.72)',
    hall: 'rgba(150,60,48,.85)',
    pavilion: 'rgba(120,96,64,.8)',
    structure: 'rgba(150,120,72,.8)',
    green: 'rgba(52,92,64,.8)',
    npc: 'rgba(220,205,180,.6)',
    self: '#9fe8ff',
    player: '#ffd27a',
    ring: 'rgba(255,200,120,.45)',
    border: 'rgba(226,186,110,.85)'
};

function isNightOk() { return typeof ctx !== 'undefined'; }

/**
 * Gắn minimap vào một thẻ <canvas>.
 * @param {HTMLCanvasElement} el
 * @param {number} cssSize Cạnh hiển thị (px CSS).
 */
export function initMinimap(el, cssSize = 148) {
    if (!el || typeof el.getContext !== 'function') return null;
    canvas = el;
    size = cssSize;
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Bản đồ nhỏ khuôn viên chùa');
    return api;
}

/** Nạp hình học khuôn viên để vẽ nền bản đồ. */
export function setMinimapScene(next) {
    if (!next || !next.bounds) return;
    scene = next;
}

/** Bật/tắt vẽ (không xoá canvas, chỉ ngưng cập nhật). */
export function setMinimapEnabled(on) {
    enabled = on !== false;
}

/** Đảo trạng thái hiển thị, trả về trạng thái mới. */
export function toggleMinimap() {
    enabled = !enabled;
    if (canvas) canvas.style.opacity = enabled ? '1' : '.25';
    return enabled;
}

export function isMinimapEnabled() { return enabled; }

/**
 * Vẽ một khung bản đồ.
 * @param {{x:number,z:number,ry:number}} player
 * @param {Array<{x:number,z:number,npc?:boolean}>} actors
 */
export function drawMinimap(player, actors) {
    if (!ctx || !scene || !enabled) return;
    const G = size;
    const scale = G * 0.86 / Math.max(scene.bounds.maxX - scene.bounds.minX, scene.bounds.maxZ - scene.bounds.minZ);
    const offX = G / 2 - (scene.bounds.minX + scene.bounds.maxX) / 2 * scale;
    const offZ = G / 2 - (scene.bounds.minZ + scene.bounds.maxZ) / 2 * scale;
    const px = (x) => offX + x * scale;
    const pz = (z) => offZ + z * scale;

    ctx.clearRect(0, 0, G, G);
    ctx.save();
    // Cắt hình tròn
    ctx.beginPath();
    ctx.arc(G / 2, G / 2, G / 2 - 1, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = C.void;
    ctx.fillRect(0, 0, G, G);

    // Nền đất khuôn viên
    const w = (scene.bounds.maxX - scene.bounds.minX) * scale;
    const h = (scene.bounds.maxZ - scene.bounds.minZ) * scale;
    ctx.fillStyle = C.ground;
    ctx.fillRect(px(scene.bounds.minX), pz(scene.bounds.minZ), w, h);

    // Hình học tĩnh
    for (const s of scene.shapes || []) {
        ctx.fillStyle = s.fill || C.structure;
        if (s.k === 'rect') {
            const x = px(Math.min(s.x0, s.x1));
            const y = pz(Math.min(s.z0, s.z1));
            ctx.fillRect(x, y, Math.abs(s.x1 - s.x0) * scale, Math.abs(s.z1 - s.z0) * scale);
        } else {
            const r = Math.max(s.k === 'mark' ? 2 : 0, (s.r || 0) * scale);
            if (r <= 0) continue;
            ctx.beginPath();
            ctx.arc(px(s.x), pz(s.z), r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Chấm NPC sống
    for (const a of actors || []) {
        ctx.fillStyle = a.npc ? C.npc : C.self;
        ctx.beginPath();
        ctx.arc(px(a.x), pz(a.z), a.npc ? 1.6 : 2.1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Người chơi: chấm vàng + véc-tơ hướng nhìn
    if (player) {
        const cx = px(player.x), cy = pz(player.z);
        ctx.fillStyle = C.player;
        ctx.beginPath();
        ctx.arc(cx, cy, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.sin(player.ry) * 7, cy + Math.cos(player.ry) * 7);
        ctx.strokeStyle = C.player;
        ctx.lineWidth = 1.4;
        ctx.stroke();
    }
    ctx.restore();

    // Viền tròn
    ctx.beginPath();
    ctx.arc(G / 2, G / 2, G / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

/** Gỡ tham chiếu, dùng khi tắt cảnh 3D. */
export function destroyMinimap() {
    canvas = null; ctx = null; scene = null;
}

const api = {
    setScene: setMinimapScene,
    draw: drawMinimap,
    toggle: toggleMinimap,
    visible: () => enabled,
    destroy: destroyMinimap
};

export default api;

// Tránh cảnh báo biến không dùng ở môi trường không có DOM.
void isNightOk;
