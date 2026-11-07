import * as THREE from './three.module.js';

// Bảng avatar: màu sắc, kích thước, tỷ lệ cơ thể từng loại nhân vật
export const AVATARS = {
    chutieu: { label: 'Chú tiểu', robe: 0xd88224, radius: .34, headY: 1.53, shoulder: 1.15, hip: .52, width: .24 },
    sunam: { label: 'Sư nam', robe: 0x5a3d28, radius: .29, headY: 1.97, shoulder: 1.61, hip: .72, width: .23 },
    sunu: { label: 'Sư nữ', robe: 0x9aafbd, radius: .30, headY: 1.76, shoulder: 1.39, hip: .63, width: .22 }
};
const ALIASES = { novice: 'chutieu', male: 'sunam', female: 'sunu' };
export function normalizeCharacterType(type) {
    return Object.hasOwn(AVATARS, type) ? type : (Object.hasOwn(ALIASES, type) ? ALIASES[type] : 'chutieu');
}

// Bảng màu áo và dây sash để ngẫu nhiên hoá nhân vật phụ
export const ROBE_COLORS = [0xc96a2a, 0xe8832b, 0x8a6a3a, 0x6b7280, 0x4a6fa5, 0xa04848, 0x5a8a5a, 0xb8742a, 0x7a4a7a, 0xd9a74a, 0xc98f30, 0x9db3bb, 0x6f4529, 0x7d95a8];
export const SASH_COLORS = [0xb8742a, 0xd9a74a, 0x7a3b1e, 0x4a4a5a];

const faces = new Map();
let gradient, activeCharacter = null;

function cycleColor(list, index, fallback) {
    return Number.isInteger(index) ? list[((index % list.length) + list.length) % list.length] : fallback;
}

// ─── Gradient toon 5-bước: tối → đậm → giữa → sáng → highlight ──────────────
function getToonGradient() {
    if (gradient) return gradient;
    // 5 mức sáng: 60, 130, 185, 220, 255 → tạo viền toon rõ ràng hơn 3-step
    gradient = new THREE.DataTexture(
        new Uint8Array([60, 130, 185, 220, 255]),
        5, 1, THREE.RedFormat
    );
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.generateMipmaps = false;
    gradient.needsUpdate = true;
    return gradient;
}

// ─── Vật liệu Toon với gradient 5-step ───────────────────────────────────────
function material(color, emissive = 0x000000, emissiveIntensity = 0) {
    const mat = new THREE.MeshToonMaterial({
        color,
        gradientMap: getToonGradient(),
        emissive,
        emissiveIntensity,
    });
    return mat;
}

// ─── Helper tạo Mesh với shadow ───────────────────────────────────────────────
function mesh(parent, geometry, mat, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
}

function sphere(parent, mat, radius, x, y, z, scale = [1, 1, 1]) {
    // 28 segments ngang × 18 dọc — mịn hơn bản cũ (20×14)
    const object = mesh(parent, new THREE.SphereGeometry(radius, 28, 18), mat, x, y, z);
    object.scale.set(...scale);
    return object;
}

function group(parent, name, x = 0, y = 0, z = 0) {
    const object = new THREE.Group();
    object.name = name;
    object.position.set(x, y, z);
    parent.add(object);
    return object;
}

// ─── Face texture vẽ trên canvas ─────────────────────────────────────────────
function faceTexture(type) {
    if (faces.has(type)) return faces.get(type);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, 512, 512);

    // Má hồng cho chú tiểu — gradient radial mềm hơn
    if (type === 'chutieu') {
        for (const x of [100, 412]) {
            const blush = c.createRadialGradient(x, 335, 4, x, 335, 68);
            blush.addColorStop(0, 'rgba(242,116,128,.70)');
            blush.addColorStop(0.5, 'rgba(242,116,128,.35)');
            blush.addColorStop(1, 'rgba(242,116,128,0)');
            c.fillStyle = blush;
            c.fillRect(x - 70, 277, 140, 120);
        }
    }

    c.lineCap = 'round';
    for (const x of [155, 357]) {
        // Lông mày
        c.strokeStyle = '#513124';
        c.lineWidth = type === 'chutieu' ? 10 : 6;
        c.beginPath();
        c.moveTo(x - 42, 182);
        c.quadraticCurveTo(x, 160, x + 36, 180);
        c.stroke();

        if (type === 'sunam') {
            // Sư nam: mắt nhắm thanh thản
            c.lineWidth = 9;
            c.strokeStyle = '#38251f';
            c.beginPath();
            c.moveTo(x - 40, 248);
            c.quadraticCurveTo(x, 270, x + 40, 244);
            c.stroke();
            // Râu mảnh
            c.lineWidth = 3;
            c.strokeStyle = '#6b4c38';
            for (let i = -1; i <= 1; i++) {
                c.beginPath();
                c.moveTo(x + i * 16, 340);
                c.lineTo(x + i * 22, 385);
                c.stroke();
            }
        } else {
            // Chú tiểu & Sư nữ: mắt tròn to
            const ry = type === 'chutieu' ? 60 : 28;
            // Tròng đen
            c.fillStyle = '#38251f';
            c.beginPath();
            c.ellipse(x, 255, 38, ry, 0, 0, Math.PI * 2);
            c.fill();
            // Tròng nâu
            c.fillStyle = '#98643a';
            c.beginPath();
            c.ellipse(x, 272, 24, ry * .46, 0, 0, Math.PI * 2);
            c.fill();
            // Điểm sáng chính
            c.fillStyle = '#fffaf0';
            c.beginPath();
            c.ellipse(x - 13, 237, 11, 14, 0, 0, Math.PI * 2);
            c.fill();
            // Điểm sáng phụ nhỏ
            c.beginPath();
            c.arc(x + 14, 268, 6, 0, Math.PI * 2);
            c.fill();
        }
    }

    // Mũi — nét cong nhẹ
    c.strokeStyle = '#ae7057';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(248, 308);
    c.quadraticCurveTo(240, 328, 260, 330);
    c.stroke();
    c.beginPath();
    c.moveTo(264, 308);
    c.quadraticCurveTo(272, 328, 252, 330);
    c.stroke();

    // Miệng cười
    c.strokeStyle = '#854a3d';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(218, 370);
    c.quadraticCurveTo(256, 396, 294, 370);
    c.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    faces.set(type, texture);
    return texture;
}

// ─── Hạt tròn poly thấp — 10×7 đủ tròn ở cỡ hạt, tiết kiệm cho 120 NPC ───────
function beadSphere(parent, mat, radius, x, y, z) {
    return mesh(parent, new THREE.SphereGeometry(radius, 10, 7), mat, x, y, z);
}

// ─── Chuỗi hạt bồ đề quàng cổ — vòng 3D thật, ôm cổ rồi rủ xuống ngực ────────
/**
 * Vòng hạt dựng theo công thức tham số 3D (KHÔNG dàn phẳng trên mặt XY như bản
 * cũ, khi mọi hạt đều có z = 0 nên tràng hạt dán bết vào ngực như huy hiệu):
 *
 *     x = sin(a) · radiusX
 *     z = cos(a) ≥ 0 ? cos(a) · frontZ : cos(a) · backZ     (z < 0 = sau lưng)
 *     y = −dropY · max(0, cos(a))^exponent
 *
 * Vì cos(a) dương ở nửa trước nên chỉ đoạn trước ngực mới trễ xuống, và trễ
 * rất tập trung quanh a = 0 (số mũ càng lớn càng dốc). Nửa sau lưng giữ nguyên
 * cao độ chân cổ, nhờ vậy chuỗi hạt luồn ra sau gáy đúng như thật.
 *
 * Số đo đã cân theo tỷ lệ chibi trong AVATARS, kiểm bằng script hình học để
 * bảo đảm mọi hạt đều nằm NGOÀI vạt áo, ngoài ống tay và ngoài quả đầu:
 *   vòm cổ đặt trên đường vai một đoạn (vai là chỗ hai ống tay chĩa ra, hạ
 *   ngang vai sẽ xuyên thẳng vào tay áo), bán kính XZ luôn lớn hơn bán kính
 *   vạt áo tại cùng cao độ ít nhất 3cm.
 *
 * Gốc group nằm đúng đáy cổ và gắn vào bodyGroup, nên khi thân nhún (bobbing)
 * hay lắc lư, chuỗi hạt chuyển động đồng bộ với vạt áo.
 */
function createCollarBeads(parent, mat, {
    neckY,                  // cao độ vòng cổ, tính từ gốc nhân vật
    radiusX,                // độ bè ngang — ôm quanh cổ
    frontZ,                 // độ vươn ra trước ngực
    backZ,                  // độ vươn ra sau lưng (giá trị dương, dùng cho z âm)
    dropY,                  // độ trễ của hạt guru trước ngực
    exponent = 3,           // độ dốc của đoạn rủ trước ngực
    count = 21,
    beadR = .027,
    guruR = .042,
} = {}) {
    const beadsGroup = group(parent, 'prayerBeads', 0, neckY, 0);

    // Hàm lấy toạ độ hạt trên vòng cổ theo góc a (a = 0 là điểm thấp nhất ngực)
    const collarPoint = (a) => {
        const c = Math.cos(a), s = Math.sin(a);
        return new THREE.Vector3(
            s * radiusX,
            -dropY * Math.pow(Math.max(0, c), exponent),
            c >= 0 ? c * frontZ : c * backZ
        );
    };

    // Lấy mẫu dày rồi nội suy Catmull-Rom khép kín → có TubeGeometry làm dây quàng
    const loop = [];
    for (let i = 0; i < 72; i++) loop.push(collarPoint(i / 72 * Math.PI * 2));
    const curve = new THREE.CatmullRomCurve3(loop, true, 'catmullrom', .5);

    // Dây quàng mảnh nối liền các hạt, chạy đúng theo đường cong 3D
    mesh(beadsGroup, new THREE.TubeGeometry(curve, 56, .009, 4, true), mat).castShadow = false;

    // Rải hạt đều theo độ dài cung thực tế (getPointAt) nên khoảng cách luôn đều
    for (let i = 1; i < count; i++) {
        const p = curve.getPointAt(i / count);
        beadSphere(beadsGroup, mat, beadR, p.x, p.y, p.z);
    }

    // Hạt guru to hơn nằm đúng điểm thấp nhất trước ngực (a = 0)
    const low = collarPoint(0);
    beadSphere(beadsGroup, mat, guruR, low.x, low.y, low.z);

    // Nút thắt nhỏ + tua rua buông xuôi theo vạt áo
    beadSphere(beadsGroup, mat, guruR * .62, low.x, low.y - guruR * 1.55, low.z + .006);
    const tassel = mesh(beadsGroup, new THREE.ConeGeometry(guruR * .72, guruR * 3.1, 10), mat,
        low.x, low.y - guruR * 3.05, low.z + .012);
    tassel.rotation.x = Math.PI - .10;

    return beadsGroup;
}

// ─── Vòng hạt đeo cổ tay — vành tròn trong mặt phẳng XZ ôm quanh cổ tay ──────
function createWristBeads(parent, mat, { y, radius, count = 18, beadR = .022 } = {}) {
    const mala = group(parent, 'wristBeads', 0, y, 0);
    for (let i = 0; i < count; i++) {
        const a = i / count * Math.PI * 2;
        beadSphere(mala, mat, beadR, Math.cos(a) * radius, 0, Math.sin(a) * radius);
    }
    // Hạt guru nhỏ buông xuống phía trước cổ tay
    beadSphere(mala, mat, beadR * 1.5, 0, -beadR * 1.9, radius);
    return mala;
}

// ─── Áo robe hình chuông (LatheGeometry) — tự nhiên hơn CylinderGeometry ─────
function buildRobe(parent, robeW, hemY, torsoH, mat) {
    // Các điểm cắt ngang từ hem → shoulder tạo hình chuông nhẹ
    const points = [
        new THREE.Vector2(robeW * 1.52, 0),          // viền áo dưới — rộng nhất
        new THREE.Vector2(robeW * 1.38, torsoH * .25),
        new THREE.Vector2(robeW * 1.18, torsoH * .55),
        new THREE.Vector2(robeW * 1.05, torsoH * .82),
        new THREE.Vector2(robeW * 1.00, torsoH),      // vai — bằng chiều rộng gốc
    ];
    const geo = new THREE.LatheGeometry(points, 24);
    const m = mesh(parent, geo, mat, 0, hemY);
    return m;
}

// ─── Tạo nhân vật ─────────────────────────────────────────────────────────────
/** Shared rig. Legacy IDs remain observable in userData.type. Only isSelf owns the shorthand animation API. */
export function createCharacter(type = 'chutieu', options = {}) {
    const classType = normalizeCharacterType(type);
    const cfg = AVATARS[classType];
    const root = new THREE.Group();
    root.name = 'rootGroup';
    const body = group(root, 'bodyGroup');

    // Màu vật liệu
    const skin = material(0xf2c7a0);
    const robe = material(options.robeColor ?? cycleColor(ROBE_COLORS, options.robeIndex, cfg.robe));
    const trim = material(classType === 'sunu' ? 0x708090 : 0x4a2e1d);
    const sash = material(cycleColor(SASH_COLORS, options.sashIndex, classType === 'sunam' ? 0x96734d : cfg.robe));

    const r = cfg.radius;
    const hemY = classType === 'sunam' ? .30 : cfg.hip - .12;
    const torsoH = cfg.shoulder - hemY;

    // Thân áo hình chuông
    const bodyMesh = buildRobe(body, cfg.width, hemY, torsoH, robe);

    // Dải cổ áo chéo (sash collar)
    for (const side of [-1, 1]) {
        const collar = mesh(body,
            new THREE.BoxGeometry(.080, .40, .048), sash,
            side * .065, cfg.shoulder - .13, cfg.width + .013
        );
        collar.rotation.z = side * .55;
    }

    // Chú tiểu & Sư nam: dải cà-sa chéo ngực
    if (classType === 'sunam') {
        const diagonal = mesh(body,
            new THREE.BoxGeometry(.16, .98, .058), sash,
            .01, cfg.shoulder - .44, .27
        );
        diagonal.rotation.z = -.42;
    }

    // Sư nữ: 3 nút trang trí
    if (classType === 'sunu') {
        for (let i = 0; i < 3; i++) {
            sphere(body, trim, .020, .10, cfg.shoulder - .18 - i * .077, .248);
        }
    }

    // ─── Đầu ─────────────────────────────────────────────────────────────────
    const head = group(body, 'head', 0, cfg.headY);

    // Đầu hơi oval, cao hơn rộng
    sphere(head, skin, r, 0, 0, 0, [1, 1.06, .92]);

    // Tai — hình oval dẹt
    for (const side of [-1, 1]) {
        sphere(head, skin, r * .25, side * r * .97, -.01, 0, [.72, 1.15, .55]);
    }

    // Mặt phẳng cong chiếu texture
    const faceGeo = new THREE.PlaneGeometry(r * 1.66, r * 1.60, 28, 22);
    const positions = faceGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const fx = positions.getX(i);
        const fy = positions.getY(i) / 1.06;
        positions.setZ(i, Math.sqrt(Math.max(.001, (r + .008) ** 2 - fx * fx - fy * fy)) * .92);
    }
    faceGeo.computeVertexNormals();
    mesh(head, faceGeo,
        new THREE.MeshBasicMaterial({ map: faceTexture(classType), transparent: true, depthWrite: false })
    );

    // Sư nữ: khăn choàng đầu
    if (classType === 'sunu') {
        const scarf = material(0x8e9aa5);
        mesh(head,
            new THREE.SphereGeometry(r * 1.06, 30, 16, 0, Math.PI * 2, 0, Math.PI * .42),
            scarf, 0, .018
        );
        sphere(head, scarf, r, 0, -.09, -.16, [1.07, 1.14, .58]);
        const brim = mesh(head,
            new THREE.TorusGeometry(r * 1.00, .026, 8, 32, Math.PI),
            trim, 0, .11, .065
        );
        brim.rotation.x = Math.PI / 2;
    }

    // Sư nam: nón lá
    if (classType === 'sunam' && options.hat !== false) {
        const hatParent = options.hat === 'back' ? body : head;
        const hat = mesh(
            hatParent,
            new THREE.ConeGeometry(.50, .25, 32),
            material(0xc6a36b),
            0,
            options.hat === 'back' ? 1.25 : .38,
            options.hat === 'back' ? -.32 : 0
        );
        if (options.hat === 'back') hat.rotation.x = Math.PI / 2;
    }

    // ─── Tay ─────────────────────────────────────────────────────────────────
    const arms = [], legs = [];
    const armLength = classType === 'chutieu' ? .40 : .52;

    for (const side of [-1, 1]) {
        const arm = group(body, side < 0 ? 'leftShoulder' : 'rightShoulder',
            side * cfg.width, cfg.shoulder
        );
        // Ống tay — thuôn từ vai xuống cổ tay
        mesh(arm, new THREE.CylinderGeometry(.10, .155, armLength, 20), robe, 0, -armLength / 2);
        // Viền cổ tay (trim cuff)
        mesh(arm, new THREE.CylinderGeometry(.155, .155, .052, 20), trim, 0, -armLength + .025);
        // Bàn tay
        sphere(arm, skin, .076, 0, -armLength - .036, .016, [.84, 1.16, .84]);
        arms.push(arm);

        // ─── Chân ────────────────────────────────────────────────────────────
        const leg = group(body, side < 0 ? 'leftHip' : 'rightHip', side * .13, cfg.hip);
        sphere(leg, robe, .155, 0, -(cfg.hip - .14) / 2, 0, [1, (cfg.hip - .14) / .28, .94]);
        mesh(leg, new THREE.CylinderGeometry(.096, .096, .078, 18), robe, 0, -cfg.hip + .155);
        // Đầu ngón chân / giày sandal
        sphere(leg, trim, .122, 0, -cfg.hip + .078, .068, [1, .60, 1.58]);
        legs.push(leg);
    }

    // ─── Chuỗi hạt bồ đề ─────────────────────────────────────────────────────
    // Chú tiểu: vòng 3D quàng qua cổ/vai rồi rủ xuống trước ngực
    if (classType === 'chutieu') {
        createCollarBeads(body, trim, {
            // Vòng cổ phải nằm TRÊN đường vai: ngay cao độ vai là hai ống tay
            // chĩa ngang ra, hạ ngang tầm đó chuỗi hạt sẽ xuyên vào tay áo.
            neckY: cfg.shoulder + .06,
            radiusX: cfg.width * 1.04,        // ôm quanh cổ, không chạm ống tay
            frontZ: cfg.width * 1.54,         // vươn ra trước ngực, ngoài mặt vải
            backZ: cfg.width * 1.08,          // lùi ra sau gáy
            dropY: .27,                       // hạt guru trễ xuống giữa ngực
            exponent: 3,                      // dốc tập trung giữa ngực, hai bên cao
            count: 21,
        });
    }
    // Sư nam: vòng hạt đeo cổ tay, ôm quanh cổ tay trong mặt phẳng XZ.
    // Cổ tay có bán kính .155 (viền tay áo) nên vành hạt phải lớn hơn thế,
    // nếu không các hạt sẽ chui tụt vào bên trong ống tay.
    if (classType === 'sunam') {
        createWristBeads(arms[1], trim, { y: -armLength + .022, radius: .178, count: 18 });
    }

    // ─── Vầng hào quang (aura) cho nhân vật chính ────────────────────────────
    const aura = mesh(
        root,
        new THREE.SphereGeometry(.96, 24, 14),
        new THREE.MeshBasicMaterial({
            color: 0xffcf68, transparent: true, opacity: 0,
            depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide
        }),
        0, 1
    );
    // Vầng sáng nhỏ bên trong — glow thêm tầng sâu
    const innerGlow = mesh(
        root,
        new THREE.SphereGeometry(.62, 18, 10),
        new THREE.MeshBasicMaterial({
            color: 0xffe8a0, transparent: true, opacity: 0,
            depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide
        }),
        0, .90
    );

    // ─── userData rig contract (không được thay đổi key nào) ─────────────────
    Object.assign(root.userData, {
        type: Object.hasOwn(ALIASES, type) ? type : classType,
        classType,
        body, bodyBaseY: 0, bodyMesh, head,
        armSplay: .16, armRestX: .06,
        leftArmPivot: arms[0], rightArmPivot: arms[1],
        armL: arms[0], armR: arms[1],
        leftFootPivot: legs[0], rightFootPivot: legs[1],
        legL: legs[0], legR: legs[1],
        leftFootBaseZ: 0, rightFootBaseZ: 0,
        aura, innerGlow,
        walkTime: 0, walkCycle: 0,
        isMoving: false, isSelf: !!options.isSelf,
        seated: false, foldedLegs: null,
    });

    poseChibi(root, false);
    if (options.isSelf) activeCharacter = root;
    return root;
}

// Alias để tương thích với test và code cũ
export function createChibi({ type = 'novice', ...options } = {}) {
    return createCharacter(type, options);
}

// ─── Giải phóng tài nguyên WebGL ─────────────────────────────────────────────
export function disposeCharacter(root) {
    if (!root || root.userData.disposed) return;
    const geometries = new Set(), materials = new Set();
    root.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) {
            for (const mat of Array.isArray(object.material) ? object.material : [object.material]) {
                materials.add(mat);
            }
        }
    });
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    root.userData.disposed = true;
    if (activeCharacter === root) activeCharacter = null;
}

// ─── Thay avatar tại chỗ, giữ nguyên root reference và hướng quay ─────────────
/** Replace the active player's visuals in place, preserving external root references and heading. */
export function switchCharacter(type) {
    if (!activeCharacter) return createCharacter(type, { isSelf: true });
    const root = activeCharacter;
    const old = root.userData;
    const next = createCharacter(type, { isSelf: false });
    disposeCharacter(root);
    root.clear();
    for (const child of [...next.children]) root.add(child);
    root.userData = { ...old, ...next.userData, isSelf: true, disposed: false };
    activeCharacter = root;
    poseChibi(root, old.seated);
    root.userData.isMoving = old.isMoving;
    return root;
}

// ─── Tư thế ngồi / đứng ──────────────────────────────────────────────────────
export function poseChibi(root, seated = false) {
    const u = root?.userData;
    if (!u?.body) return;
    u.seated = seated;
    u.isMoving = false;
    u.legL.visible = u.legR.visible = !seated;
    root.scale.y = seated ? .83 : 1;
    u.body.position.y = u.bodyBaseY;
    u.body.rotation.z = 0;
    u.head.rotation.set(0, 0, 0);
    u.armL.rotation.set(seated ? -.72 : u.armRestX, 0, seated ? .34 : -u.armSplay);
    u.armR.rotation.set(seated ? -.72 : u.armRestX, 0, seated ? -.34 : u.armSplay);
    u.legL.rotation.set(0, 0, 0);
    u.legR.rotation.set(0, 0, 0);
    u.legL.position.z = u.leftFootBaseZ;
    u.legR.position.z = u.rightFootBaseZ;

    // Khởi tạo chân gấp khi ngồi lần đầu
    if (seated && !u.foldedLegs) {
        u.foldedLegs = group(u.body, 'foldedLegs');
        for (const side of [-1, 1]) {
            sphere(u.foldedLegs, u.bodyMesh.material, .225, side * .155, .185, .125, [1.2, .50, .84]);
        }
    }
    if (u.foldedLegs) u.foldedLegs.visible = seated;
}

// ─── Cập nhật animation mỗi frame ────────────────────────────────────────────
/** Supports updateCharacter(root, delta) and updateCharacter(delta, isMoving) for the active player. */
export function updateCharacter(rootOrDelta, deltaOrMoving) {
    const shorthand = typeof rootOrDelta === 'number';
    const root = shorthand ? activeCharacter : rootOrDelta;
    const u = root?.userData;
    if (!u?.body || u.disposed) return;

    if (shorthand) u.isMoving = !!deltaOrMoving;
    const delta = shorthand ? rootOrDelta : deltaOrMoving;
    // Giới hạn dt để tránh giật khi tab ẩn
    const dt = Number.isFinite(delta) ? Math.max(0, Math.min(delta, .05)) : 0;

    u.walkTime += dt;
    const t = u.walkTime;
    const moving = u.isMoving && !u.seated;

    // Hàm tiếp cận mềm — exponential lerp ở 12 Hz
    const ease = 1 - Math.exp(-12 * dt);
    const approach = (object, key, value) => { object[key] += (value - object[key]) * ease; };

    // Swing chính theo chu kỳ bước chân
    const swing = Math.sin(t * 8);
    u.walkCycle = moving ? swing : 0;

    // ── Tay ──────────────────────────────────────────────────────────────────
    approach(u.armL.rotation, 'x', u.seated ? -.72 : moving ? swing * .46 : u.armRestX);
    approach(u.armR.rotation, 'x', u.seated ? -.72 : moving ? -swing * .46 : u.armRestX);
    approach(u.armL.rotation, 'z', u.seated ? .34 : -u.armSplay);
    approach(u.armR.rotation, 'z', u.seated ? -.34 : u.armSplay);

    // ── Chân ─────────────────────────────────────────────────────────────────
    approach(u.legL.rotation, 'x', moving ? -swing * .42 : 0);
    approach(u.legR.rotation, 'x', moving ? swing * .42 : 0);

    // ── Thân lắc lư khi đi, thở nhẹ khi đứng ────────────────────────────────
    const breathBob = Math.sin(t * 1.8) * .014;   // nhịp thở ~0.9 Hz
    approach(u.body.position, 'y', u.bodyBaseY + (moving ? Math.abs(swing) * .063 : breathBob));
    approach(u.body.rotation, 'z',
        moving ? Math.sin(t * 4) * (u.classType === 'chutieu' ? .046 : .016) : 0
    );

    // ── Đầu: idle drift nhẹ, khi đi hướng về phía trước ─────────────────────
    approach(u.head.rotation, 'x', moving ? -.015 : Math.sin(t * 1.3) * .014);
    // Xoay đầu nhẹ trái/phải khi idle
    approach(u.head.rotation, 'y', moving ? 0 : Math.sin(t * .7) * .018);
}
