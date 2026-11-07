import * as THREE from './three.module.js';
import { createGlowSprite } from './glow.js';

export const CAMPUS_BOUNDS = { x: 38, minZ: -46, maxZ: 38 };
export const SEAT_LAYOUT = [];
for (let row = 0; row < 8; row++) {
    for (const side of [-1, 1]) {
        for (let col = 0; col < 6; col++) {
            SEAT_LAYOUT.push({ x: side * (4.2 + col * 2.25), z: -9 - row * 3 });
        }
    }
}
for (const side of [-1, 1]) {
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
            SEAT_LAYOUT.push({ x: side * (21 + col * 3), z: 12 + row * 3 });
        }
    }
}

/* ========================================================
   TEXTURE ĐỆM CÓI DỆT
   - Mặt bên: sợi cói đan ngang dọc, màu rơm ấm.
   - Mặt trên: viền chỉ vàng + hoa văn hoa sen ở giữa.
   ======================================================== */
function createSedgeWeaveTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#b8873f';
    ctx.fillRect(0, 0, size, size);
    // Sợi đan ngang
    for (let y = 0; y < size; y += 5) {
        ctx.fillStyle = (y / 5) % 2 === 0 ? 'rgba(214,168,94,.85)' : 'rgba(140,96,44,.85)';
        ctx.fillRect(0, y, size, 3);
        ctx.fillStyle = 'rgba(88,56,24,.28)';
        ctx.fillRect(0, y + 3, size, 1);
    }
    // Sợi dọc thưa
    for (let x = 0; x < size; x += 18) {
        ctx.fillStyle = 'rgba(120,80,36,.35)';
        ctx.fillRect(x, 0, 2, size);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 1);
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    else if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding;
    return tex;
}

function createCushionTopTexture() {
    const size = 256;
    const c = size / 2;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Nền cói
    ctx.fillStyle = '#c9a05a';
    ctx.fillRect(0, 0, size, size);

    // Vòng đan đồng tâm
    for (let r = 8; r < c; r += 7) {
        ctx.strokeStyle = (r / 7) % 2 < 1 ? 'rgba(226,186,116,.75)' : 'rgba(132,90,40,.55)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(c, c, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Viền chỉ vàng quanh mép đệm
    ctx.strokeStyle = '#f2c654';
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.arc(c, c, c * 0.86, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,228,146,.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(c, c, c * 0.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(150,96,30,.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c, c, c * 0.79, 0, Math.PI * 2);
    ctx.stroke();

    // Hoa văn hoa sen (8 cánh)
    const petal = (ang, len, wid, fill, stroke) => {
        ctx.save();
        ctx.translate(c, c);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.ellipse(0, -len * 0.55, wid, len * 0.55, 0, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    };
    for (let i = 0; i < 8; i++) {
        petal((i / 8) * Math.PI * 2 + 0.39, c * 0.56, c * 0.15, '#e98bb0', '#b0476e');
    }
    for (let i = 0; i < 6; i++) {
        petal((i / 6) * Math.PI * 2, c * 0.36, c * 0.11, '#f7b9cd', '#c46a89');
    }
    // Nhụy sen
    ctx.fillStyle = '#f4c95c';
    ctx.beginPath();
    ctx.arc(c, c, c * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a97418';
    ctx.lineWidth = 2;
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    else if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding;
    return tex;
}

export function buildCampus(scene, registerWalkable = mesh => { mesh.userData.isWalkable = true; return mesh; }) {
    const group = new THREE.Group();
    group.name = 'Expanded temple campus';
    const stone = new THREE.MeshStandardMaterial({ color: 0x9a8a76, roughness: .94 });
    const border = new THREE.MeshStandardMaterial({ color: 0xd0c3a2, roughness: .84 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a4a30, roughness: .88 });
    const roof = new THREE.MeshStandardMaterial({ color: 0x3d4a42, roughness: .8 });
    const grass = new THREE.MeshStandardMaterial({ color: 0x3c4a26, roughness: 1 });
    const leaves = new THREE.MeshStandardMaterial({ color: 0x4a7a46, roughness: 1 });
    const glow = new THREE.MeshStandardMaterial({
        color: 0xffd48a,
        emissive: 0xffa842,
        emissiveIntensity: 1.7,
        roughness: .3
    });
    function box(w, h, d, material, x, y, z) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        m.position.set(x, y, z); m.receiveShadow = true; group.add(m); return m;
    }
    registerWalkable(box(84, .12, 100, grass, 0, -.1, -4));
    registerWalkable(box(38, .12, 31, stone, 0, .01, -20));
    // Chừa khoảng hồ: đường đá không xuyên qua mặt nước.
    registerWalkable(box(5, .14, 39.5, border, 0, .015, -21.75));
    registerWalkable(box(5, .14, 24.5, border, 0, .015, 19.25));
    // Mạch lát ngang, chừa trục hành lễ giữa sân.
    for (let z = -34; z <= -5; z += 3) box(38, .015, .045, border, 0, .08, z);
    for (let x = -18; x <= 18; x += 3) box(.035, .015, 31, border, x, .08, -20);
    for (const side of [-1, 1]) {
        registerWalkable(box(3.6, .14, 65, stone, side * 19.8, .015, -5));
        registerWalkable(box(19, .14, 3.4, stone, side * 25, .015, 9));
        registerWalkable(box(16, .14, 14, stone, side * 26, .015, 16));
        registerWalkable(box(19, .14, 3, stone, side * 25, .015, -12));
        // Hành lang có mái, cột gỗ, ghế dài bên sân.
        registerWalkable(box(3.8, .18, 31, border, side * 21.5, .12, -22));
        for (let z = -36; z <= -8; z += 4) {
            box(.22, 3.6, .22, wood, side * 20.1, 1.95, z);
            box(.22, 3.6, .22, wood, side * 22.9, 1.95, z);
            box(1.1, .2, 2.3, wood, side * 22.1, .65, z + 1.4);
        }
        const canopy = box(4.6, .35, 32, roof, side * 21.5, 3.9, -22);
        canopy.rotation.z = side * .07;
    }
    // Tường khuôn viên và tam quan ở phía nam.
    box(80, 1.25, .45, border, 0, .62, -48);
    for (const side of [-1, 1]) {
        box(.45, 1.25, 86, border, side * 40, .62, -5);
        box(32, 1.25, .45, border, side * 24, .62, 38);
        box(.8, 5, .8, wood, side * 4, 2.5, 32);
    }
    box(11, .5, 3.6, roof, 0, 5, 32);
    box(8.4, .35, 3, roof, 0, 5.9, 32);
    box(7.8, .65, .35, wood, 0, 4.4, 32);
    // Cây, đèn lồng và bồn hoa dọc khuôn viên, không chắn lối giữa sân.
    for (const side of [-1, 1]) {
        for (let z = -40; z <= 30; z += 7) {
            const x = side * 35;
            box(.45, 2.7, .45, wood, x, 1.35, z);
            const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 1), leaves);
            crown.position.set(x, 3.6, z); crown.scale.y = 1.25; group.add(crown);
            box(.12, 2.6, .12, wood, side * 18, 1.3, z);
            const lantern = new THREE.Mesh(new THREE.SphereGeometry(.32, 10, 8), glow);
            lantern.scale.y = 1.4; lantern.position.set(side * 18, 2.7, z); group.add(lantern);
            // Chụp đèn giấy phát sáng quanh bóng đèn lồng
            const shade = new THREE.Mesh(new THREE.CylinderGeometry(.30, .24, .62, 10, 1, true), glow);
            shade.position.set(side * 18, 2.7, z); group.add(shade);
            // Quầng sáng mềm quanh đèn (giả bloom)
            const halo = createGlowSprite(2.0, 0xffb45e, 0.55, true);
            halo.position.set(side * 18, 2.7, z); group.add(halo);
        }
    }
    // Cọ cao điểm xuyết hai bên sân và trước cổng (dáng cọ như ảnh mẫu).
    const palmLeafMat = new THREE.MeshStandardMaterial({
        color: 0x4d8450, roughness: 1, side: THREE.DoubleSide
    });
    const frondGeo = new THREE.ConeGeometry(.44, 3.6, 4, 1, true);
    function buildPalm(x, z, height) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.17, .34, height, 8), wood);
        trunk.position.set(x, height / 2, z);
        trunk.rotation.z = (Math.random() - .5) * .07;
        trunk.castShadow = true;
        group.add(trunk);
        for (let f = 0; f < 7; f++) {
            const ang = (f / 7) * Math.PI * 2;
            const frond = new THREE.Mesh(frondGeo, palmLeafMat);
            frond.position.set(x + Math.cos(ang) * 1.2, height - .05, z + Math.sin(ang) * 1.2);
            frond.rotation.set(Math.PI / 2 - .6, Math.PI / 2 - ang, 0);
            frond.scale.set(1, 1, .38);
            group.add(frond);
        }
    }
    for (const [px, pz, ph] of [
        [-30, 30, 8.6], [30, 30, 9.2], [-30, -34, 8.2], [30, -34, 8.8],
        [-11.5, 25, 7.4], [11.5, 25, 7.9], [-24, 20, 7.2], [24, 20, 7.6]
    ]) buildPalm(px, pz, ph);
    // Hai vòng tiểu cảnh quanh vườn thiền.
    for (const side of [-1, 1]) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(4.5, .16, 8, 40), border);
        rim.rotation.x = Math.PI / 2; rim.position.set(side * 26, .2, 26); group.add(rim);
        const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 0), stone);
        rock.scale.set(1.7, 1, 1); rock.position.set(side * 26, .7, 26); group.add(rock);
    }
    // Đệm cói dệt: mặt trên viền vàng + hoa sen, thân đệm đan sợi.
    const seatSideMat = new THREE.MeshStandardMaterial({
        map: createSedgeWeaveTexture(),
        color: 0xffe9c9,
        roughness: .95
    });
    const seatTopMat = new THREE.MeshStandardMaterial({
        map: createCushionTopTexture(),
        color: 0xffffff,
        roughness: .92
    });
    const trimMat = new THREE.MeshStandardMaterial({
        color: 0xf0c04a,
        roughness: .7,
        metalness: .12,
        emissive: 0x6a4a08,
        emissiveIntensity: .35
    });
    const seatGeo = new THREE.CylinderGeometry(.64, .7, .18, 20);
    const trimGeo = new THREE.TorusGeometry(.59, .035, 6, 20);
    // Cylinder nhận mảng material theo thứ tự: mặt bên, mặt trên, mặt dưới.
    const seatMaterials = [seatSideMat, seatTopMat, seatSideMat];
    const seats = SEAT_LAYOUT.map((position, index) => {
        const seat = new THREE.Mesh(seatGeo, seatMaterials);
        seat.position.set(position.x, .18, position.z);
        seat.userData.seatIndex = index; seat.receiveShadow = true; group.add(seat);
        const seam = new THREE.Mesh(trimGeo, trimMat);
        seam.rotation.x = Math.PI / 2; seam.position.set(position.x, .276, position.z); group.add(seam);
        return seat;
    });
    scene.add(group);
    return seats;
}
