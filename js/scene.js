/**
 * Three.js 3D Engine - Chùa Online (chuaonline.org style)
 * - Môi trường: Chánh Điện lớn, Quán Âm Các, Tháp Chuông, Hồ Sen cầu kiều, Đèn lồng, Cây bồ đề
 * - Chú tiểu di chuyển tự do: Click-to-move, phím WASD/mũi tên, Joystick ảo
 * - Camera 3rd person góc nhìn thứ 3 theo dõi nhân vật mượt mà
 * - Hệ thống Thả Đèn Nguyện nổi trên mặt hồ sen
 * - Các đại chúng / Phật tử cùng tụng kinh trong Chánh Điện
 */

import * as THREE from 'three';

let scene, camera, renderer, clock;
let terrain, groundPlane;
let player, playerNameTag;
let clickMarker;
let lanternsInPond = [];
let smokeParticles = [];
let onlineMonks = [];
let bellMesh = null;

// Điều khiển
const keysDown = {};
let joystickVector = { x: 0, y: 0 };
let targetPosition = null; // Dành cho click-to-move
const playerSpeed = 4.2;
let isChanting = false;
let currentZone = null;
let onZoneChangeCallback = null;

// Camera orbit
let camDistance = 8.5;
let camPitch = 0.55; // góc nhìn từ trên xuống (radian)
let camYaw = 0; // góc quay quanh nhân vật
let isDragging = false;
let prevPointer = { x: 0, y: 0 };

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Vị trí các khu vực chính
export const LOCATIONS = {
  entrance: { x: 0, z: 9, name: 'Sân chùa', desc: 'Lối vào trang nghiêm' },
  pond: { x: 0, z: 2.5, name: 'Hồ Sen Ánh Sáng', desc: 'Thả đèn nguyện cầu an' },
  mainHall: { x: 0, z: -10, name: 'Chánh Điện Vô Lượng', desc: 'Thiền viện chính - Đại chúng tụng kinh' },
  quanAm: { x: -9.5, z: -4, name: 'Quán Âm Các', desc: 'Thiền viện phụ - Bồ Tát Quán Thế Âm' },
  bellTower: { x: 9.5, z: -4, name: 'Lầu Chuông Đại Hồng', desc: 'Thiền viện phụ - Thỉnh chuông cầu phước' }
};

export function initScene(canvas, quality = 'mid') {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0604, 0.024);

  const aspect = canvas.clientWidth / canvas.clientHeight || 1;
  camera = new THREE.PerspectiveCamera(48, aspect, 0.2, 120);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: quality !== 'low',
    alpha: false,
    powerPreference: 'high-performance'
  });
  const pixelRatio = quality === 'high' ? Math.min(window.devicePixelRatio, 2) : 1;
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.setClearColor(0x090504, 1);
  renderer.shadowMap.enabled = quality !== 'low';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  clock = new THREE.Clock();

  // Ánh sáng bầu không khí ban đêm/hoàng hôn chùa lung linh
  setupLighting();

  // Địa hình & cảnh quan
  buildGroundAndPaths();
  buildLotusPond();
  buildMainTempleHall();
  buildQuanAmPavilion();
  buildBellTower();
  buildEnvironmentDecorations();

  // Tạo nhân vật Chú Tiểu
  player = createMonkCharacter({ isSelf: true, robeColor: 0xba7c38 });
  player.position.set(0, 0, 8);
  scene.add(player);

  // Tạo vòng tròn chỉ điểm click di chuyển
  createClickMarker();

  // Bắt sự kiện tương tác
  setupControls(canvas);

  // Animation Loop
  let rafId;
  function animate() {
    rafId = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);
    updateGame(dt);
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', onResize);

  return {
    destroy: () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    }
  };
}

/* ========================================================
   ÁNH SÁNG & KHÔNG GIAN
   ======================================================== */
function setupLighting() {
  const ambient = new THREE.AmbientLight(0xffecd0, 0.42);
  scene.add(ambient);

  // Ánh trăng / hoàng hôn dịu mát chiếu xiên
  const moonLight = new THREE.DirectionalLight(0xa5c6ff, 0.4);
  moonLight.position.set(15, 25, 15);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(1024, 1024);
  moonLight.shadow.camera.near = 1;
  moonLight.shadow.camera.far = 60;
  moonLight.shadow.camera.left = -22;
  moonLight.shadow.camera.right = 22;
  moonLight.shadow.camera.top = 22;
  moonLight.shadow.camera.bottom = -22;
  scene.add(moonLight);

  // Ánh sáng vàng rực ấm áp từ Chánh Điện
  const hallLight = new THREE.PointLight(0xffaa44, 2.8, 25, 1.2);
  hallLight.position.set(0, 4.5, -9.5);
  hallLight.castShadow = true;
  scene.add(hallLight);

  // Ánh sáng Hồ Sen
  const pondLight = new THREE.PointLight(0xff9977, 1.6, 12, 1.5);
  pondLight.position.set(0, 1.2, 2.5);
  scene.add(pondLight);

  // Ánh sáng Quán Âm Các
  const qaLight = new THREE.PointLight(0xcfe8ff, 1.8, 14, 1.2);
  qaLight.position.set(-9.5, 3.2, -4);
  scene.add(qaLight);

  // Ánh sáng Tháp Chuông
  const bellLight = new THREE.PointLight(0xffbe6b, 1.8, 14, 1.2);
  bellLight.position.set(9.5, 3.2, -4);
  scene.add(bellLight);
}

/* ========================================================
   MẶT ĐẤT, ĐƯỜNG ĐÁ & SÂN CHÙA
   ======================================================== */
function buildGroundAndPaths() {
  terrain = new THREE.Group();

  // Nền cỏ sân chùa
  const groundGeo = new THREE.PlaneGeometry(55, 55, 1, 1);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1e361b, // Cỏ xanh đêm
    roughness: 0.9,
    metalness: 0.05
  });
  groundPlane = new THREE.Mesh(groundGeo, groundMat);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.receiveShadow = true;
  terrain.add(groundPlane);

  // Lối đi lát đá (Trục chính từ cổng z=14 tới Chánh Điện z=-12)
  const pathMat = new THREE.MeshStandardMaterial({
    color: 0x48444a, // Đá xanh lát đường xám xanh
    roughness: 0.8,
    metalness: 0.1
  });

  // Đường chính giữa
  const mainRoad = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 26), pathMat);
  mainRoad.rotation.x = -Math.PI / 2;
  mainRoad.position.set(0, 0.015, 1);
  mainRoad.receiveShadow = true;
  terrain.add(mainRoad);

  // Vòng sân lớn quanh hồ sen
  const plazaGeo = new THREE.RingGeometry(4.3, 7.8, 36);
  const plaza = new THREE.Mesh(plazaGeo, pathMat);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.016, 2.5);
  plaza.receiveShadow = true;
  terrain.add(plaza);

  // Đường rẽ sang Quán Âm Các bên trái
  const leftRoad = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 2.8), pathMat);
  leftRoad.rotation.x = -Math.PI / 2;
  leftRoad.position.set(-5.5, 0.015, -4);
  leftRoad.receiveShadow = true;
  terrain.add(leftRoad);

  // Đường rẽ sang Tháp Chuông bên phải
  const rightRoad = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 2.8), pathMat);
  rightRoad.rotation.x = -Math.PI / 2;
  rightRoad.position.set(5.5, 0.015, -4);
  rightRoad.receiveShadow = true;
  terrain.add(rightRoad);

  // Sân Chánh Điện lát gạch đỏ nâu cổ kính
  const templeYardMat = new THREE.MeshStandardMaterial({
    color: 0x6e2c1c, // Gạch tàu đỏ chùa
    roughness: 0.7,
    metalness: 0.15
  });
  const templeYard = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), templeYardMat);
  templeYard.rotation.x = -Math.PI / 2;
  templeYard.position.set(0, 0.018, -10.5);
  templeYard.receiveShadow = true;
  terrain.add(templeYard);

  scene.add(terrain);
}

/* ========================================================
   HỒ SEN & CẦU KIỀU GỖ (Hệt như hình https://chuaonline.org/)
   ======================================================== */
function buildLotusPond() {
  const pondGroup = new THREE.Group();
  pondGroup.position.set(0, 0, 2.5);

  // Bờ hồ sen tròn bằng đá viền
  const rimGeo = new THREE.TorusGeometry(4.3, 0.22, 16, 48);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x5a5558, roughness: 0.7 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.14;
  rim.castShadow = true;
  rim.receiveShadow = true;
  pondGroup.add(rim);

  // Mặt nước hồ sen trong biếc phản chiếu
  const waterGeo = new THREE.CircleGeometry(4.25, 40);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x12384a,
    roughness: 0.12,
    metalness: 0.75,
    transparent: true,
    opacity: 0.92
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.08;
  pondGroup.add(water);

  // Cầu vòm gỗ bắc ngang qua hồ sen (như hình mẫu)
  const bridge = new THREE.Group();
  const plankMat = new THREE.MeshStandardMaterial({ color: 0x7c4323, roughness: 0.75 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0xe0d6cf, roughness: 0.5 }); // Lan can sơn trắng/gỗ

  const numPlanks = 16;
  const bridgeLength = 8.2;
  for (let i = 0; i < numPlanks; i++) {
    const frac = i / (numPlanks - 1);
    const zOffset = (frac - 0.5) * bridgeLength;
    const archY = Math.sin(frac * Math.PI) * 0.42 + 0.18;

    // Ván gỗ lát cầu
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.45), plankMat);
    plank.position.set(0, archY, zOffset);
    plank.rotation.x = -Math.cos(frac * Math.PI) * 0.12;
    plank.castShadow = true;
    plank.receiveShadow = true;
    bridge.add(plank);

    // Trụ lan can 2 bên
    if (i % 3 === 0) {
      const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), railMat);
      postL.position.set(-0.75, archY + 0.35, zOffset);
      postL.castShadow = true;
      bridge.add(postL);

      const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), railMat);
      postR.position.set(0.75, archY + 0.35, zOffset);
      postR.castShadow = true;
      bridge.add(postR);
    }
  }

  // Tay vịn lan can cầu uốn nhẹ
  [-0.75, 0.75].forEach((sideX) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sideX, 0.55, -4.1),
      new THREE.Vector3(sideX, 0.95, 0),
      new THREE.Vector3(sideX, 0.55, 4.1)
    ]);
    const railGeo = new THREE.TubeGeometry(curve, 20, 0.035, 8, false);
    const railMesh = new THREE.Mesh(railGeo, railMat);
    railMesh.castShadow = true;
    bridge.add(railMesh);
  });
  pondGroup.add(bridge);

  // Lá sen và hoa sen nổi
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x226b38, roughness: 0.6 });
  const flowerPink = new THREE.MeshStandardMaterial({ color: 0xff6ba3, roughness: 0.4 });
  const flowerWhite = new THREE.MeshStandardMaterial({ color: 0xffeedd, roughness: 0.3 });

  for (let i = 0; i < 22; i++) {
    const angle = (i / 22) * Math.PI * 2 + Math.random() * 0.2;
    const r = 1.3 + Math.random() * 2.6;
    const lx = Math.cos(angle) * r;
    const lz = Math.sin(angle) * r;

    // Không đè lên cầu ở giữa (lx hẹp)
    if (Math.abs(lx) < 1.1) continue;

    const leafSize = 0.25 + Math.random() * 0.25;
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(leafSize, 14), leafMat);
    leaf.rotation.x = -Math.PI / 2;
    leaf.position.set(lx, 0.09, lz);
    pondGroup.add(leaf);

    // Có hoa sen
    if (i % 3 === 0) {
      const lotus = createLotusMesh(i % 2 === 0 ? flowerPink : flowerWhite);
      lotus.position.set(lx, 0.12, lz);
      lotus.scale.setScalar(0.7 + Math.random() * 0.3);
      pondGroup.add(lotus);
    }
  }

  scene.add(pondGroup);
}

function createLotusMesh(petalMat) {
  const g = new THREE.Group();
  const petalGeo = new THREE.ConeGeometry(0.12, 0.28, 6, 1);
  for (let p = 0; p < 8; p++) {
    const petal = new THREE.Mesh(petalGeo, petalMat);
    const ang = (p / 8) * Math.PI * 2;
    petal.rotation.x = 0.7;
    petal.rotation.y = ang;
    petal.position.x = Math.sin(ang) * 0.08;
    petal.position.z = Math.cos(ang) * 0.08;
    g.add(petal);
  }
  // Nhụy vàng
  const center = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.04, 0.12, 10),
    new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0x443300 })
  );
  center.position.y = 0.06;
  g.add(center);
  return g;
}

/* ========================================================
   CHÁNH ĐIỆN VÔ LƯỢNG (THIỀN VIỆN CHÍNH)
   - Tượng Phật A Di Đà lớn dát vàng, đài sen, lư hương
   - Hàng chục Phật tử quỳ tụng kinh trang nghiêm
   ======================================================== */
function buildMainTempleHall() {
  const hall = new THREE.Group();
  hall.position.set(0, 0, -11.5);

  const woodColMat = new THREE.MeshStandardMaterial({ color: 0x822116, roughness: 0.5 }); // Cột gỗ son đỏ
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x942d1e, roughness: 0.6 }); // Ngói đỏ cong
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd24d,
    roughness: 0.25,
    metalness: 0.85,
    emissive: 0x3d2806
  });

  // Bệ tam cấp đá
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(15, 0.6, 9),
    new THREE.MeshStandardMaterial({ color: 0x5e5a5f, roughness: 0.8 })
  );
  plinth.position.y = 0.3;
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  hall.add(plinth);

  // 8 Cột chùa lớn
  const colPositions = [
    [-6.5, -3.5], [-2.2, -3.5], [2.2, -3.5], [6.5, -3.5],
    [-6.5, 3.5], [-2.2, 3.5], [2.2, 3.5], [6.5, 3.5]
  ];
  colPositions.forEach(([cx, cz]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 4.8, 16), woodColMat);
    col.position.set(cx, 2.7, cz);
    col.castShadow = true;
    hall.add(col);
  });

  // Mái chùa cong 2 tầng truyền thống
  // Tầng 1
  const roof1 = new THREE.Mesh(new THREE.ConeGeometry(9.5, 2.2, 4), roofMat);
  roof1.rotation.y = Math.PI / 4;
  roof1.position.y = 5.6;
  roof1.scale.set(1.4, 0.7, 1);
  roof1.castShadow = true;
  hall.add(roof1);

  // Tầng 2 (chóp đỉnh)
  const roof2 = new THREE.Mesh(new THREE.ConeGeometry(7.2, 1.8, 4), roofMat);
  roof2.rotation.y = Math.PI / 4;
  roof2.position.y = 7.1;
  roof2.scale.set(1.3, 0.65, 0.95);
  roof2.castShadow = true;
  hall.add(roof2);

  // Đỉnh tháp vàng
  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.25, 1.2, 8), goldMat);
  finial.position.y = 8.5;
  hall.add(finial);

  // TƯỢNG PHẬT A DI ĐÀ DÁT VÀNG UY NGHIÊM Ở TRUNG TÂM BÀN THỜ
  const buddhaGroup = new THREE.Group();
  buddhaGroup.position.set(0, 1.4, -2.8);

  // Tòa sen Phật
  const lotusBase = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.7, 24), goldMat);
  buddhaGroup.add(lotusBase);

  // Thân Phật
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.9, 1.5, 16), goldMat);
  body.position.y = 1.1;
  buddhaGroup.add(body);

  // Đầu Phật & nhục kế
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 20, 20), goldMat);
  head.position.y = 2.15;
  buddhaGroup.add(head);

  const ushnisha = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), goldMat);
  ushnisha.position.y = 2.65;
  buddhaGroup.add(ushnisha);

  // Hào quang vàng rực sau lưng Phật
  const haloGeo = new THREE.RingGeometry(0.4, 1.8, 36);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xffdf6d,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.position.set(0, 2.1, -0.6);
  buddhaGroup.add(halo);

  hall.add(buddhaGroup);

  // LƯ HƯƠNG ĐỒNG KHÓI NGHI NGÚT TRƯỚC BÀN THỜ
  const censer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.45, 0.8, 16),
    new THREE.MeshStandardMaterial({ color: 0x8a6230, metalness: 0.7, roughness: 0.3 })
  );
  censer.position.set(0, 0.9, 0.5);
  censer.castShadow = true;
  hall.add(censer);

  // 3 nén nhang phát sáng đỏ
  [-0.08, 0, 0.08].forEach((ix, idx) => {
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6),
      new THREE.MeshBasicMaterial({ color: 0xcc3311 })
    );
    stick.position.set(ix, 1.45, 0.5 + (idx - 1) * 0.04);
    hall.add(stick);

    // Đốm lửa nhang
    const ember = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffaa22 })
    );
    ember.position.set(ix, 1.7, 0.5 + (idx - 1) * 0.04);
    hall.add(ember);
  });

  // HÀNG PHẬT TỬ / CHÚ TIỂU QUỲ TỤNG KINH (Giống hình trang chủ https://chuaonline.org/)
  const cushionMat = new THREE.MeshStandardMaterial({ color: 0xa83222, roughness: 0.7 });
  const monkColors = [0x5078a0, 0x8899aa, 0x4a6a50, 0xba7c38, 0x906040];

  for (let row = 0; row < 3; row++) {
    for (let col = -3; col <= 3; col++) {
      if (Math.abs(col) === 0 && row === 0) continue; // Chừa chỗ lư hương

      const mx = col * 1.55;
      const mz = 2.0 + row * 1.45;

      // Đệm ngồi quỳ
      const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.12, 16), cushionMat);
      cushion.position.set(mx, 0.65, mz);
      cushion.receiveShadow = true;
      hall.add(cushion);

      // Chú tiểu / Phật tử quỳ tụng kinh
      const robeColor = monkColors[Math.abs(col + row * 2) % monkColors.length];
      const npc = createMonkCharacter({ isSelf: false, robeColor });
      npc.position.set(mx, 0.7, mz);
      // Xoay mặt nhìn về phía tượng Phật (z âm)
      npc.rotation.y = Math.PI;

      // Thêm vòng hào quang nhỏ trên đầu các Phật tử như trong ảnh
      const npchalo = new THREE.Mesh(
        new THREE.TorusGeometry(0.26, 0.02, 8, 20),
        new THREE.MeshBasicMaterial({ color: 0xffea9f, transparent: true, opacity: 0.65 })
      );
      npchalo.rotation.x = Math.PI / 2;
      npchalo.position.y = 1.05;
      npc.add(npchalo);

      hall.add(npc);
      onlineMonks.push(npc);
    }
  }

  // Biển hiệu "CHÁNH ĐIỆN VÔ LƯỢNG"
  const signBoard = createSignboard('CHÁNH ĐIỆN VÔ LƯỢNG');
  signBoard.position.set(0, 4.4, 3.6);
  hall.add(signBoard);

  scene.add(hall);
}

/* ========================================================
   QUÁN ÂM CÁC (THIỀN VIỆN PHỤ 1)
   ======================================================== */
function buildQuanAmPavilion() {
  const g = new THREE.Group();
  g.position.set(-9.5, 0, -4);

  // Bệ bát giác
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.4, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x5a585e, roughness: 0.8 })
  );
  base.position.y = 0.25;
  base.receiveShadow = true;
  g.add(base);

  // 6 Cột
  const colMat = new THREE.MeshStandardMaterial({ color: 0x7c261e });
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 3.8, 12), colMat);
    col.position.set(Math.cos(ang) * 2.4, 2.15, Math.sin(ang) * 2.4);
    col.castShadow = true;
    g.add(col);
  }

  // Mái đình
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(3.6, 1.8, 6),
    new THREE.MeshStandardMaterial({ color: 0x942d1e, roughness: 0.6 })
  );
  roof.position.y = 4.8;
  roof.castShadow = true;
  g.add(roof);

  // Tượng Bồ Tát Quán Thế Âm trắng từ bi
  const qaStatue = new THREE.Group();
  qaStatue.position.y = 0.5;

  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf5f8ff,
    roughness: 0.35,
    metalness: 0.1,
    emissive: 0x112233
  });

  // Tòa sen Bồ Tát
  const lotus = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.45, 18), whiteMat);
  lotus.position.y = 0.25;
  qaStatue.add(lotus);

  // Thân Bồ Tát áo trắng đứng đoan nghiêm
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 1.9, 14), whiteMat);
  body.position.y = 1.35;
  qaStatue.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), whiteMat);
  head.position.y = 2.45;
  qaStatue.add(head);

  // Hào quang Quán Âm sáng trắng ngà
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.9, 24),
    new THREE.MeshBasicMaterial({ color: 0xe0f2fe, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
  );
  halo.position.set(0, 2.45, -0.2);
  qaStatue.add(halo);

  g.add(qaStatue);

  const sign = createSignboard('QUÁN ÂM CÁC');
  sign.position.set(0, 3.8, 2.2);
  g.add(sign);

  scene.add(g);
}

/* ========================================================
   THÁP CHUÔNG ĐẠI HỒNG (THIỀN VIỆN PHỤ 2)
   ======================================================== */
function buildBellTower() {
  const g = new THREE.Group();
  g.position.set(9.5, 0, -4);

  // Bệ đá
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.5, 5.2),
    new THREE.MeshStandardMaterial({ color: 0x5a585e, roughness: 0.8 })
  );
  base.position.y = 0.25;
  base.receiveShadow = true;
  g.add(base);

  // 4 Cột lớn
  const colMat = new THREE.MeshStandardMaterial({ color: 0x5c2b18 });
  [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]].forEach(([cx, cz]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 4.4, 12), colMat);
    col.position.set(cx, 2.45, cz);
    col.castShadow = true;
    g.add(col);
  });

  // Mái tháp chuông
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(3.6, 2.0, 4),
    new THREE.MeshStandardMaterial({ color: 0x942d1e, roughness: 0.6 })
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 5.4;
  roof.castShadow = true;
  g.add(roof);

  // ĐẠI HỒNG CHUNG (Quả chuông đồng lớn treo ở giữa)
  const bellGroup = new THREE.Group();
  bellGroup.position.set(0, 2.8, 0);

  const bellBronzeMat = new THREE.MeshStandardMaterial({
    color: 0x9e6f32,
    roughness: 0.35,
    metalness: 0.85
  });
  const bellBody = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 1.3, 18), bellBronzeMat);
  bellBody.castShadow = true;
  bellGroup.add(bellBody);

  const bellRim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.08, 12, 24), bellBronzeMat);
  bellRim.rotation.x = Math.PI / 2;
  bellRim.position.y = -0.65;
  bellGroup.add(bellRim);

  // Giá treo xích
  const chain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8),
    new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9 })
  );
  chain.position.y = 0.9;
  bellGroup.add(chain);

  // Chày gõ chuông bằng gỗ treo bên cạnh
  const striker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 1.4, 10),
    new THREE.MeshStandardMaterial({ color: 0x6e3c1e })
  );
  striker.rotation.z = Math.PI / 2;
  striker.position.set(0.9, -0.1, 0);
  bellGroup.add(striker);

  bellMesh = bellGroup;
  g.add(bellGroup);

  const sign = createSignboard('LẦU CHUÔNG ĐẠI HỒNG');
  sign.position.set(0, 4.2, 2.3);
  g.add(sign);

  scene.add(g);
}

/* ========================================================
   BIỂN HIỆU CHÙA VÀNG CHỮ HÁN/VIỆT
   ======================================================== */
function createSignboard(text) {
  const g = new THREE.Group();

  // Khung bảng gỗ
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.65, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x421b10, roughness: 0.6 })
  );
  g.add(board);

  // Viền vàng
  const border = new THREE.Mesh(
    new THREE.BoxGeometry(2.46, 0.71, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xe5a93b, metalness: 0.8, roughness: 0.3 })
  );
  g.add(border);

  // Canvas vẽ chữ nét vàng
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const c = canvas.getContext('2d');
  c.fillStyle = '#4a1d12';
  c.fillRect(0, 0, 512, 128);
  c.lineWidth = 10;
  c.strokeStyle = '#e5a93b';
  c.strokeRect(8, 8, 496, 112);

  c.fillStyle = '#ffdf7a';
  c.font = 'bold 36px "Segoe UI", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, 256, 64);

  const tex = new THREE.CanvasTexture(canvas);
  const textMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 0.58),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  textMesh.position.z = 0.07;
  g.add(textMesh);

  return g;
}

/* ========================================================
   CÂY CẢNH, ĐÈN LỒNG, ĐÈN ĐÁ DỌC LỐI ĐI
   ======================================================== */
function buildEnvironmentDecorations() {
  // Hàng đèn lồng ấm áp giăng ngang
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xff6622,
    roughness: 0.4,
    emissive: 0xaa3300,
    emissiveIntensity: 0.8
  });

  const lanternPositions = [
    [-3.2, 2.2, 8.5], [3.2, 2.2, 8.5],
    [-4.5, 2.2, 6.0], [4.5, 2.2, 6.0],
    [-4.5, 2.2, -1.0], [4.5, 2.2, -1.0],
    [-2.8, 2.5, -6.5], [2.8, 2.5, -6.5],
    [-7.0, 2.2, -4.0], [7.0, 2.2, -4.0]
  ];

  lanternPositions.forEach(([lx, ly, lz]) => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, ly, 8),
      new THREE.MeshStandardMaterial({ color: 0x332219 })
    );
    post.position.set(lx, ly / 2, lz);
    scene.add(post);

    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), lanternMat);
    lantern.scale.set(1, 1.25, 1);
    lantern.position.set(lx, ly + 0.15, lz);
    scene.add(lantern);

    // Nguồn sáng nhẹ tỏa ra từ đèn lồng
    const pl = new THREE.PointLight(0xff7722, 0.6, 6, 1.8);
    pl.position.set(lx, ly, lz);
    scene.add(pl);
  });

  // Hàng cây cau / dừa thẳng tắp (như hình mẫu https://chuaonline.org/)
  const palmMat = new THREE.MeshStandardMaterial({ color: 0x544030, roughness: 0.9 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x1d5225, roughness: 0.7 });

  const treeCoords = [
    [-6.5, 10], [6.5, 10],
    [-8.0, 4.5], [8.0, 4.5],
    [-11, 1], [11, 1],
    [-12, -8], [12, -8]
  ];

  treeCoords.forEach(([tx, tz]) => {
    const tree = new THREE.Group();
    tree.position.set(tx, 0, tz);

    // Thân cây cau cao
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 5.5, 8), palmMat);
    trunk.position.y = 2.75;
    trunk.castShadow = true;
    tree.add(trunk);

    // Tán lá xòe rộng
    for (let f = 0; f < 6; f++) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.4, 4), frondMat);
      const ang = (f / 6) * Math.PI * 2;
      frond.position.set(Math.sin(ang) * 0.8, 5.3, Math.cos(ang) * 0.8);
      frond.rotation.x = 0.9;
      frond.rotation.y = ang;
      frond.castShadow = true;
      tree.add(frond);
    }
    scene.add(tree);
  });
}

/* ========================================================
   TẠO MÔ HÌNH NHÂN VẬT CHÚ TIỂU
   ======================================================== */
function createMonkCharacter({ isSelf = false, robeColor = 0xba7c38 } = {}) {
  const g = new THREE.Group();

  const robeMat = new THREE.MeshStandardMaterial({ color: robeColor, roughness: 0.75 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5cfb0, roughness: 0.6 });

  // Thân áo cà sa nâu/vàng
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.7, 16), robeMat);
  body.position.y = 0.55;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  g.userData.body = body;

  // Đầu chú tiểu tròn trĩnh đáng yêu (cạo nhẵn)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), skinMat);
  head.position.y = 1.05;
  head.castShadow = true;
  g.add(head);
  g.userData.head = head;

  // Chấm chấm điểm chuỗi chấm trên đỉnh đầu (giới điệp)
  for (let d = -1; d <= 1; d++) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    dot.position.set(d * 0.04, 1.25, 0.05);
    g.add(dot);
  }

  // Hai tay chắp trước ngực tụng kinh / niệm Phật
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.35, 10), robeMat);
  armL.position.set(-0.16, 0.75, 0.12);
  armL.rotation.set(0.7, 0, 0.45);
  g.add(armL);
  g.userData.armL = armL;

  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.35, 10), robeMat);
  armR.position.set(0.16, 0.75, 0.12);
  armR.rotation.set(0.7, 0, -0.45);
  g.add(armR);
  g.userData.armR = armR;

  // Hai chân bước đi
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.32, 10), robeMat);
  legL.position.set(-0.11, 0.16, 0);
  legL.castShadow = true;
  g.add(legL);
  g.userData.legL = legL;

  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.32, 10), robeMat);
  legR.position.set(0.11, 0.16, 0);
  legR.castShadow = true;
  g.add(legR);
  g.userData.legR = legR;

  // Hào quang tỏa sáng khi tụng kinh
  const auraGeo = new THREE.SphereGeometry(0.85, 24, 24);
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xffd269,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const aura = new THREE.Mesh(auraGeo, auraMat);
  aura.position.y = 0.75;
  g.add(aura);
  g.userData.aura = aura;

  g.userData.walkCycle = 0;
  g.userData.isMoving = false;

  return g;
}

/* ========================================================
   VÒNG CHỈ ĐIỂM CLICK DI CHUYỂN
   ======================================================== */
function createClickMarker() {
  const ringGeo = new THREE.RingGeometry(0.2, 0.4, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffdd66,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0
  });
  clickMarker = new THREE.Mesh(ringGeo, ringMat);
  clickMarker.rotation.x = -Math.PI / 2;
  clickMarker.position.y = 0.03;
  scene.add(clickMarker);
}

function showClickEffect(pos) {
  clickMarker.position.set(pos.x, 0.04, pos.z);
  clickMarker.scale.set(0.3, 0.3, 0.3);
  clickMarker.material.opacity = 0.9;
}

/* ========================================================
   HỆ THỐNG ĐIỀU KHIỂN & CAMERA
   - Click to Move
   - Phím WASD / Mũi tên
   - Cần ảo Joystick
   - Kéo xoay camera góc nhìn thứ 3
   ======================================================== */
function setupControls(canvas) {
  window.addEventListener('keydown', (e) => {
    keysDown[e.code] = true;
    // Bỏ target position khi bấm phím
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.code)) {
      targetPosition = null;
    }
  });

  window.addEventListener('keyup', (e) => {
    keysDown[e.code] = false;
  });

  // Tương tác chuột / chạm trên Canvas
  let pointerDownPos = { x: 0, y: 0 };
  let hasMovedFar = false;

  canvas.addEventListener('pointerdown', (e) => {
    // Chỉ nhận click chuột trái hoặc touch
    if (e.button !== undefined && e.button !== 0) return;
    isDragging = true;
    hasMovedFar = false;
    pointerDownPos = { x: e.clientX, y: e.clientY };
    prevPointer = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - prevPointer.x;
    const dy = e.clientY - prevPointer.y;

    if (Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y) > 7) {
      hasMovedFar = true;
    }

    // Xoay góc nhìn camera quanh nhân vật
    camYaw -= dx * 0.006;
    camPitch = Math.max(0.2, Math.min(1.2, camPitch + dy * 0.004));

    prevPointer = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;

    // Nếu chỉ là cú nhấp chuột/chạm nhẹ (không kéo xoay camera) -> Click-to-move!
    if (!hasMovedFar) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(groundPlane);
      if (intersects.length > 0) {
        const hit = intersects[0].point;
        // Giới hạn phạm vi di chuyển trong khuôn viên chùa
        const clampedX = Math.max(-16, Math.min(16, hit.x));
        const clampedZ = Math.max(-14, Math.min(14, hit.z));

        targetPosition = new THREE.Vector3(clampedX, 0, clampedZ);
        showClickEffect(targetPosition);
      }
    }
  });

  // Zoom camera bằng lăn chuột
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    camDistance = Math.max(4.0, Math.min(18.0, camDistance + e.deltaY * 0.012));
  }, { passive: false });
}

export function setJoystickMove(x, y) {
  joystickVector.x = x;
  joystickVector.y = y;
  if (Math.abs(x) > 0.05 || Math.abs(y) > 0.05) {
    targetPosition = null; // Ưu tiên joystick
  }
}

export function teleportTo(locKey) {
  const loc = LOCATIONS[locKey];
  if (!loc || !player) return;
  targetPosition = null;
  player.position.set(loc.x, 0, loc.z);
}

export function setChantingState(chanting) {
  isChanting = !!chanting;
}

export function onZoneChange(cb) {
  onZoneChangeCallback = cb;
}

/* ========================================================
   HỆ THỐNG THẢ ĐÈN NGUYỆN (HOA ĐĂNG HỒ SEN)
   ======================================================== */
export function spawnLantern(message) {
  const g = new THREE.Group();
  // Đèn sen thả từ mép hồ gần nhân vật nhất
  const startAngle = Math.atan2(player.position.z - 2.5, player.position.x);
  const startX = Math.cos(startAngle) * 3.8;
  const startZ = Math.sin(startAngle) * 3.8 + 2.5;

  g.position.set(startX, 0.09, startZ);

  // Cánh hoa sen phát sáng
  const petalMat = new THREE.MeshStandardMaterial({
    color: 0xff6b8b,
    emissive: 0xaa2244,
    roughness: 0.3
  });
  const lotus = createLotusMesh(petalMat);
  lotus.scale.setScalar(1.2);
  g.add(lotus);

  // Ngọn nến lung linh
  const candle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe899 })
  );
  candle.position.y = 0.18;
  g.add(candle);

  // Ánh sáng ngọn nến
  const flameLight = new THREE.PointLight(0xff9933, 1.2, 5, 2);
  flameLight.position.y = 0.3;
  g.add(flameLight);

  scene.add(g);

  // Đèn từ từ trôi lững lờ vào tâm hồ
  lanternsInPond.push({
    mesh: g,
    driftVx: (Math.random() - 0.5) * 0.15 - (startX / 8) * 0.1,
    driftVz: (Math.random() - 0.5) * 0.15 - ((startZ - 2.5) / 8) * 0.1,
    life: 0,
    message
  });
}

/* ========================================================
   CẬP NHẬT GAME LOOP MỖI FRAME
   ======================================================== */
function updateGame(dt) {
  if (!player) return;

  // Tính vector di chuyển
  let moveX = 0;
  let moveZ = 0;

  // 1. Phím bàn phím (theo hướng camera tương đối)
  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), camYaw);
  const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), camYaw);

  if (keysDown['KeyW'] || keysDown['ArrowUp']) {
    moveX += forward.x;
    moveZ += forward.z;
  }
  if (keysDown['KeyS'] || keysDown['ArrowDown']) {
    moveX -= forward.x;
    moveZ -= forward.z;
  }
  if (keysDown['KeyA'] || keysDown['ArrowLeft']) {
    moveX -= right.x;
    moveZ -= right.z;
  }
  if (keysDown['KeyD'] || keysDown['ArrowRight']) {
    moveX += right.x;
    moveZ += right.z;
  }

  // 2. Virtual Joystick
  if (Math.hypot(joystickVector.x, joystickVector.y) > 0.05) {
    moveX += right.x * joystickVector.x - forward.x * joystickVector.y;
    moveZ += right.z * joystickVector.x - forward.z * joystickVector.y;
  }

  // 3. Click to move
  if (targetPosition) {
    const toTarget = new THREE.Vector3().subVectors(targetPosition, player.position);
    toTarget.y = 0;
    const dist = toTarget.length();
    if (dist > 0.25) {
      toTarget.normalize();
      moveX = toTarget.x;
      moveZ = toTarget.z;
    } else {
      targetPosition = null; // Đã tới nơi
    }
  }

  const isMoving = Math.hypot(moveX, moveZ) > 0.05;
  player.userData.isMoving = isMoving;

  if (isMoving) {
    const dir = new THREE.Vector2(moveX, moveZ).normalize();
    player.position.x += dir.x * playerSpeed * dt;
    player.position.z += dir.y * playerSpeed * dt;

    // Giới hạn trong khuôn viên chùa
    player.position.x = Math.max(-17, Math.min(17, player.position.x));
    player.position.z = Math.max(-15, Math.min(14, player.position.z));

    // Xoay nhân vật mượt mà theo hướng đi
    const targetAngle = Math.atan2(dir.x, dir.y);
    player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, targetAngle, 14 * dt);

    // Animation bước chân
    player.userData.walkCycle += dt * 14;
    const cycle = player.userData.walkCycle;
    player.userData.legL.rotation.x = Math.sin(cycle) * 0.55;
    player.userData.legR.rotation.x = -Math.sin(cycle) * 0.55;
    player.userData.body.position.y = 0.55 + Math.abs(Math.sin(cycle)) * 0.05;
    player.userData.armL.rotation.x = 0.6 + Math.cos(cycle) * 0.25;
    player.userData.armR.rotation.x = 0.6 - Math.cos(cycle) * 0.25;
  } else {
    // Đứng yên: tư thế chắp tay niệm Phật trang nghiêm
    const t = clock.getElapsedTime();
    player.userData.legL.rotation.x = THREE.MathUtils.lerp(player.userData.legL.rotation.x, 0, 10 * dt);
    player.userData.legR.rotation.x = THREE.MathUtils.lerp(player.userData.legR.rotation.x, 0, 10 * dt);
    player.userData.body.position.y = 0.55 + Math.sin(t * 2.2) * 0.015;
    player.userData.head.rotation.x = Math.sin(t * 2.2) * 0.03;
    player.userData.armL.rotation.set(0.7, 0, 0.45);
    player.userData.armR.rotation.set(0.7, 0, -0.45);
  }

  // Hiệu ứng Hào quang khi tụng kinh
  const aura = player.userData.aura;
  if (aura) {
    const t = clock.getElapsedTime();
    const targetOpacity = isChanting ? 0.35 + Math.sin(t * 3.5) * 0.15 : 0.05;
    aura.material.opacity = THREE.MathUtils.lerp(aura.material.opacity, targetOpacity, 8 * dt);
    aura.scale.setScalar(1 + Math.sin(t * 2.5) * 0.05 + (isChanting ? 0.12 : 0));
  }

  // Hiệu ứng marker click di chuyển mờ dần
  if (clickMarker && clickMarker.material.opacity > 0) {
    clickMarker.scale.addScalar(dt * 0.6);
    clickMarker.material.opacity -= dt * 1.5;
  }

  // Cập nhật vị trí Camera bám theo chú tiểu (Third-Person View)
  const targetCamPos = new THREE.Vector3(
    player.position.x + Math.sin(camYaw) * camDistance * Math.cos(camPitch),
    player.position.y + 1.2 + Math.sin(camPitch) * camDistance,
    player.position.z + Math.cos(camYaw) * camDistance * Math.cos(camPitch)
  );
  camera.position.lerp(targetCamPos, 9 * dt);
  camera.lookAt(player.position.x, player.position.y + 1.1, player.position.z);

  // Cập nhật đèn nguyện trôi trên hồ sen
  lanternsInPond.forEach((item) => {
    item.life += dt;
    item.mesh.position.x += item.driftVx * dt;
    item.mesh.position.z += item.driftVz * dt;
    // Nhấp nhô nhẹ trên sóng nước
    item.mesh.position.y = 0.09 + Math.sin(item.life * 2.0) * 0.015;
  });

  // Kiểm tra khu vực chú tiểu đang đứng
  checkPlayerZone();
}

function checkPlayerZone() {
  let detectedZone = null;
  for (const [key, loc] of Object.entries(LOCATIONS)) {
    const dist = Math.hypot(player.position.x - loc.x, player.position.z - loc.z);
    const radius = key === 'pond' ? 5.2 : 3.8;
    if (dist < radius) {
      detectedZone = { key, ...loc };
      break;
    }
  }

  if (detectedZone?.key !== currentZone?.key) {
    currentZone = detectedZone;
    if (onZoneChangeCallback) {
      onZoneChangeCallback(currentZone);
    }
  }
}

function onResize() {
  if (!renderer || !camera) return;
  const canvas = renderer.domElement;
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
}
