/**
 * Three.js 3D Engine - Chùa Online (chuaonline.org style)
 * - Môi trường: Chánh Điện lớn, Quán Âm Các, Tháp Chuông, Hồ Sen cầu kiều, Đèn lồng, Cây bồ đề
 * - Chú tiểu di chuyển tự do: Click-to-move, phím WASD/mũi tên, Joystick ảo
 * - Camera 3rd person góc nhìn thứ 3 theo dõi nhân vật mượt mà
 * - Hệ thống Thả Đèn Nguyện nổi trên mặt hồ sen
 * - Các đại chúng / Phật tử cùng tụng kinh trong Chánh Điện
 */

import * as THREE from './three.module.js';
import { createCharacter, poseChibi, disposeCharacter, updateCharacter, normalizeCharacterType, switchCharacter } from './characters.js';
import { buildCampus, CAMPUS_BOUNDS } from './campus.js';
import { mergeStaticMeshes } from './static-merge.js';
import { createGlowSprite, updateGlowPulses, glowPulses, setGlowPulsesEnabled } from './glow.js';

let meditationSeats = [];
let pendingSeat = null;
let selectedAvatar = 'chutieu';

function createMonkCharacter(options = {}) {
  return createCharacter(options.type || selectedAvatar, options);
}

export function setPlayerAvatar(type) {
  selectedAvatar = normalizeCharacterType(type);
  if (!player) return;
  player = switchCharacter(selectedAvatar);
}

// Đệm thiền luôn để trống; không sinh NPC trang trí.
function standUp() {
  if (player?.userData.seated) poseChibi(player, false);
}

export function meditateNearest() {
  if (!player || !meditationSeats.length) return;
  const seat = meditationSeats.reduce((best, item) =>
    item.position.distanceToSquared(player.position) < best.position.distanceToSquared(player.position) ? item : best);
  pendingSeat = seat;
  standUp();
  targetPosition = new THREE.Vector3(seat.position.x, 0, seat.position.z);
}


let scene, camera, renderer, clock;
let terrain, groundPlane, skyDome;
let player, playerNameTag;
let clickMarker;
let lanternsInPond = [];
let smokeParticles = [];
const terrainMeshes = [];
const pondLeaves = [];
const hallSmokeSprites = [];
const bridgeLights = [];
const lotusMaterials = [];
const terrainRaycaster = new THREE.Raycaster();
const terrainOrigin = new THREE.Vector3();
const terrainDown = new THREE.Vector3(0, -1, 0);

function registerWalkable(mesh) {
  mesh.userData.isWalkable = true;
  terrainMeshes.push(mesh);
  return mesh;
}

function groundPlayer(dt, snap = false) {
  if (!player || player.userData.seated) return;
  terrainOrigin.set(player.position.x, player.position.y + 3, player.position.z);
  terrainRaycaster.set(terrainOrigin, terrainDown);
  const hit = terrainRaycaster.intersectObjects(terrainMeshes, false)[0];
  if (!hit) return;
  // Tương đương lerp 0.25 tại 60 FPS, không phụ thuộc tốc độ khung hình.
  const alpha = snap ? 1 : 1 - Math.pow(0.75, Math.max(0, dt) * 60);
  player.position.y = THREE.MathUtils.lerp(player.position.y, hit.point.y, alpha);
}

function updatePondEffects(time) {
  // Khói hương Chánh Điện: cuộn khói mỏng bay lên từ lư hương, mờ dần ở 2 đầu chu kỳ.
  hallSmokeSprites.forEach(({ sprite, baseX, baseZ, phase, speed }) => {
    const t = (time * speed + phase) % 1;
    sprite.position.y = 1.45 + t * 1.7;
    sprite.position.x = baseX + Math.sin(time * 0.6 + phase * 9.0) * 0.09 * (0.4 + t);
    sprite.position.z = baseZ + Math.cos(time * 0.45 + phase * 7.0) * 0.05 * (0.4 + t);
    sprite.material.opacity = 0.13 * Math.sin(Math.PI * t);
    const s = 0.55 + t * 0.8;
    sprite.scale.set(s, s, 1);
  });
  pondLeaves.forEach(({ mesh, baseY, phase }) => {
    mesh.position.y = baseY + Math.sin(time * 1.4 + phase) * 0.008;
  });
  bridgeLights.forEach(({ light, material, phase }) => {
    const pulse = 1 + Math.sin(time * 5.3 + phase) * 0.08 + Math.sin(time * 9.1 + phase) * 0.04;
    light.intensity = 1.5 * pulse;
    material.emissiveIntensity = 0.9 * pulse;
  });
  lotusMaterials.forEach((material, i) => {
    material.emissiveIntensity = 0.22 + Math.sin(time * 2 + i) * 0.045;
  });
}
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
let camDistance = 17;
let camPitch = 0.52; // Nghiêng ~30° từ trên xuống: thấy hồ sen, đèn trôi và cổng tam quan.
let camYaw = -0.35;
let isDragging = false;
let prevPointer = { x: 0, y: 0 };

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Vị trí các khu vực chính
export const LOCATIONS = {
  meditation: { x: 0, z: -18, name: 'Sân thiền đại chúng', desc: '96 đệm thiền · Bấm đệm để ngồi' },
  garden: { x: -26, z: 9, name: 'Vườn thiền', desc: '24 chỗ ngồi giữa vườn cây' },
  entrance: { x: 0, z: 26, name: 'Sân chùa', desc: 'Lối vào trang nghiêm' },
  pond: { x: 0, z: 2.5, name: 'Hồ Sen Ánh Sáng', desc: 'Thả đèn nguyện cầu an' },
  mainHall: { x: 0, z: -37, name: 'Chánh Điện Vô Lượng', desc: 'Thiền viện chính - Đại chúng tụng kinh' },
  quanAm: { x: -28, z: -8, name: 'Quán Âm Các', desc: 'Thiền viện phụ - Bồ Tát Quán Thế Âm' },
  bellTower: { x: 28, z: -8, name: 'Lầu Chuông Đại Hồng', desc: 'Thiền viện phụ - Thỉnh chuông cầu phước' }
};

export function initScene(canvas, quality = 'mid') {
  terrainMeshes.length = pondLeaves.length = bridgeLights.length = lotusMaterials.length = hallSmokeSprites.length = 0;
  scene = new THREE.Scene();
  // Nền hoàng hôn ấm: tím mận chuyển cam, không còn bầu trời đen lạnh.
  scene.background = new THREE.Color(0x2c1a32);
  // Sương mù tuyến tính (DESIGN 8.4): màu nâu sẫm ấm 0x2a1408. Khuôn viên sâu ~100m,
  // tầm nhìn cổng → Chánh Điện ~65m nên near/far nới theo khuôn viên: 28 → 115.
  scene.fog = new THREE.Fog(0x2a1408, 28, 115);

  const aspect = canvas.clientWidth / canvas.clientHeight || 1;
  // Góc nhìn hẹp (tele nhẹ) cho cảm giác chibi 2.5D / isometric như ảnh mẫu.
  camera = new THREE.PerspectiveCamera(42, aspect, 0.2, 260);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: quality !== 'low',
    alpha: false,
    powerPreference: 'high-performance'
  });
  const pixelRatio = quality === 'high' ? Math.min(window.devicePixelRatio, 2) : 1;
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.setClearColor(0x2c1a32, 1);
  renderer.shadowMap.enabled = quality !== 'low';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Tone mapping điện ảnh: giữ chi tiết vùng sáng của đèn lồng, không bệt trắng.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  else if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;

  clock = new THREE.Clock();

  // Ánh sáng bầu không khí ban đêm/hoàng hôn chùa lung linh
  setupLighting();
  // Vòm trời gradient hoàng hôn (thay cho nền phẳng tối om)
  buildSkyDome();

  // Địa hình & cảnh quan
  buildGroundAndPaths();
  buildLotusPond();
  buildMainTempleHall();
  buildQuanAmPavilion();
  buildBellTower();
  // Đèn lồng giăng dọc trục hành lễ, tỏa quầng sáng ấm.
  buildEnvironmentDecorations();
  // Cảnh quan và đèn dọc sân do buildCampus dựng.
  meditationSeats = buildCampus(scene, registerWalkable);
  // Chỉ giữ một Player, sử dụng rig chung với phần xem trước.
  if (player) {
    player.removeFromParent();
    disposeCharacter(player);
  }
  player = createCharacter(selectedAvatar, { isSelf: true });
  player.position.set(0, 0, -5);
  scene.add(player);
  scene.updateMatrixWorld(true);
  groundPlayer(0, true);
  camera.position.set(-6, 13, 21);

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
  // 1. Ánh sáng môi trường ấm: trời vàng mật ong, đất nâu son.
  //    Đây là thứ thay đổi cảm giác khung hình nhiều nhất so với bản cũ.
  // DESIGN 8.4: ambient #FFD9A0 cường độ 0.55 (giữ màu đất nâu son cho phản chiếu nền).
  const ambient = new THREE.HemisphereLight(0xffd9a0, 0x4a2a22, 0.55);
  scene.add(ambient);

  // 2. Ánh sáng chủ đạo mô phỏng hoàng hôn chiếu xiên từ tây-bắc.
  // DESIGN 8.4: directional #FFB066 cường độ 1.1, shadow map 2048 (PCFSoft đã bật ở renderer).
  const sunLight = new THREE.DirectionalLight(0xffb066, 1.1);
  sunLight.position.set(-26, 30, 18);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 90;
  sunLight.shadow.camera.left = -30;
  sunLight.shadow.camera.right = 30;
  sunLight.shadow.camera.top = 30;
  sunLight.shadow.camera.bottom = -30;
  sunLight.shadow.bias = -0.0012;
  scene.add(sunLight);
  // Ánh phản chiếu ấm trái ngược để vùng bóng không chết đen.
  const fillLight = new THREE.DirectionalLight(0xff9f6b, 0.35);
  fillLight.position.set(22, 12, -20);
  scene.add(fillLight);

  // 3. Đèn nội thất Chánh Điện rực vàng
  const hallLight = new THREE.PointLight(0xffb457, 3.4, 30, 1.25);
  hallLight.position.set(0, 5.2, -38);
  hallLight.castShadow = true;
  scene.add(hallLight);
  const hallWarm = new THREE.PointLight(0xff8a3c, 2.0, 22, 1.5);
  hallWarm.position.set(0, 2.6, -44);
  scene.add(hallWarm);

  // 4. Hồ sen phát sáng dịu: đèn đỏ-hồng dưới mặt nước
  const pondLight = new THREE.PointLight(0xffa070, 2.2, 14, 1.4);
  pondLight.position.set(0, 1.4, 2.5);
  scene.add(pondLight);
  const pondGlow = new THREE.PointLight(0xffd38a, 1.1, 9, 1.6);
  pondGlow.position.set(0, 0.6, 2.5);
  scene.add(pondGlow);

  // 5. Quán Âm Các ánh trắng ấm (không còn xanh lạnh)
  const qaLight = new THREE.PointLight(0xffe6c4, 2.3, 16, 1.2);
  qaLight.position.set(-28, 3.4, -8);
  scene.add(qaLight);

  // 6. Tháp Chuông ám kim ấm
  const bellLight = new THREE.PointLight(0xffbe6b, 2.3, 16, 1.2);
  bellLight.position.set(28, 3.4, -8);
  scene.add(bellLight);

  // 7. Đèn cổng tam quan phía nam: luồng sáng người chơi đi qua
  const gateLight = new THREE.PointLight(0xffa855, 2.0, 18, 1.3);
  gateLight.position.set(0, 4.2, 30);
  scene.add(gateLight);

  // 8. Trục hành lễ giữa sân: dải đèn ấm dẫn mắt từ cổng vào Chánh Điện
  for (const z of [18, 10, -18, -26]) {
    const strip = new THREE.PointLight(0xffb066, 1.5, 12, 1.6);
    strip.position.set(0, 2.6, z);
    scene.add(strip);
  }
}

/**
 * Vòm trời gradient hoàng hôn: đỉnh tím mận → chân trời cam cháy.
 * Dùng SphereGeometry lật mặt trong + CanvasTexture dọc, không tính sương mù,
 * nên khung hình luôn có nền ấm thay vì mảng đen của `setClearColor` cũ.
 */
function buildSkyDome() {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.00, '#241430'); // đỉnh trời tím mận
  grad.addColorStop(0.34, '#43253a'); // tím hồng
  grad.addColorStop(0.60, '#8a4a3c'); // cam cháy tối
  grad.addColorStop(0.80, '#d8814a'); // đường chân trời cam
  grad.addColorStop(1.00, '#f6b871'); // ráng vàng phía sau chùa
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 8, 256);

  const texture = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in texture) texture.colorSpace = THREE.SRGBColorSpace;
  else if ('encoding' in texture) texture.encoding = THREE.sRGBEncoding;

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(150, 24, 16),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, fog: false, depthWrite: false })
  );
  dome.name = 'Sunset sky dome';
  dome.renderOrder = -1;
  scene.add(dome);
  skyDome = dome;
}

/* ========================================================
   HỆ THỐNG VẼ TEXTURE PROCEDURAL CHẤT LƯỢNG CAO (CANVAS 2D)
   - Sân gạch nung đỏ cổ kính Bát Tràng
   - Đường đá xanh lát phiến tự nhiên
   - Nền cỏ đêm sinh động
   - Tranh tường hoa sen 2D Phật giáo linh thiêng
   - Mặt chú tiểu Chibi mắt tròn long lanh đáng yêu (Ảnh 2)
   ======================================================== */

// Texture gạch nung đỏ chùa Bát Tràng
function createTempleBrickTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Nền vữa xi măng xám đất
  ctx.fillStyle = '#3a2d28';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 8;
  const cols = 8;
  const w = 512 / cols;
  const h = 512 / rows;
  const gap = 3;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * w + gap;
      const y = r * h + gap;
      const bw = w - gap * 2;
      const bh = h - gap * 2;

      // Biến thiên màu gạch đất nung cổ kính
      const hue = 12 + Math.random() * 8; // 12-20
      const sat = 52 + Math.random() * 16; // 52-68%
      const lum = 32 + Math.random() * 14; // 32-46%
      ctx.fillStyle = `hsl(${hue}, ${sat}%, ${lum}%)`;
      ctx.fillRect(x, y, bw, bh);

      // Gradient sáng ở góc trên viên gạch
      const grad = ctx.createLinearGradient(x, y, x + bw, y + bh);
      grad.addColorStop(0, 'rgba(255, 200, 160, 0.16)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, bw, bh);

      // Chấm hạt gốm nung tự nhiên
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,220,180,0.14)';
        ctx.fillRect(x + Math.random() * bw, y + Math.random() * bh, 1.5, 1.5);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Texture đường đá xanh lát phiến tự nhiên
function createStonePaverTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Mạch nối sâu
  ctx.fillStyle = '#222527';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 10;
  const rowH = 512 / rows;
  const gap = 3;

  for (let r = 0; r < rows; r++) {
    const shift = (r % 2) * 28;
    let curX = -shift;
    while (curX < 512) {
      const stoneW = 55 + Math.sin(r * 4 + curX) * 15;
      const x = Math.max(0, curX + gap);
      const y = r * rowH + gap;
      const bw = Math.min(512 - x, stoneW - gap * 2);
      const bh = rowH - gap * 2;

      if (bw > 2) {
        const lum = 32 + (Math.sin(curX * 0.1) * 6 + Math.random() * 8);
        ctx.fillStyle = `hsl(210, 10%, ${lum}%)`;
        ctx.fillRect(x, y, bw, bh);

        // Nổi gờ đá
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(x, y, bw, 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.fillRect(x, y + bh - 2, bw, 2);

        // Vết rêu nhẹ ở mép khe đá
        if (Math.random() > 0.6) {
          ctx.fillStyle = 'rgba(45, 75, 40, 0.25)';
          ctx.fillRect(x, y + bh - 4, bw, 4);
        }
      }
      curX += stoneW;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Texture cỏ rêu sân chùa ban đêm
function createTempleGrassTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Nền cỏ ấm: ô-liu ngả vàng thay vì xanh rêu đen.
  ctx.fillStyle = '#3c4a26';
  ctx.fillRect(0, 0, 256, 256);

  // Đốm cỏ non bắt nắng, cỏ già trong bóng và vệt đất son.
  for (let i = 0; i < 460; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const rad = 2 + Math.random() * 5;
    const roll = Math.random();
    ctx.fillStyle = roll > 0.62
      ? 'rgba(94, 116, 46, 0.40)'
      : roll > 0.30
        ? 'rgba(52, 62, 30, 0.45)'
        : 'rgba(122, 84, 44, 0.30)';
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Tranh tường Phật giáo 2D: hoa sen, mây cát tường, sóng nước trên nền đỏ son (như ảnh 3)
 */
function createLotusMuralTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Nền đỏ thẫm truyền thống Phật giáo
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
  bgGrad.addColorStop(0, '#3a0c0c');
  bgGrad.addColorStop(0.5, '#611717');
  bgGrad.addColorStop(1, '#250707');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Hoa văn mây cuộn cát tường màu vàng kim
  ctx.strokeStyle = 'rgba(218, 165, 32, 0.32)';
  ctx.lineWidth = 3;
  const drawCloud = (cx, cy, scale) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.arc(-26, 0, 15, Math.PI, 0);
    ctx.arc(0, -11, 21, Math.PI, 0);
    ctx.arc(26, 0, 15, Math.PI, 0);
    ctx.stroke();
    ctx.restore();
  };
  for (let x = 70; x < 1024; x += 170) {
    drawCloud(x, 70, 1.15);
    drawCloud(x + 75, 165, 0.85);
  }

  // Sóng nước xanh thẫm phía dưới
  const waveGrad = ctx.createLinearGradient(0, 350, 0, 512);
  waveGrad.addColorStop(0, 'rgba(15, 45, 60, 0.85)');
  waveGrad.addColorStop(1, 'rgba(5, 18, 26, 0.96)');
  ctx.fillStyle = waveGrad;
  ctx.beginPath();
  ctx.moveTo(0, 420);
  for (let x = 0; x <= 1024; x += 60) {
    ctx.quadraticCurveTo(x + 30, 395 + ((x / 60) % 2 ? 18 : -10), x + 60, 420);
  }
  ctx.lineTo(1024, 512);
  ctx.lineTo(0, 512);
  ctx.closePath();
  ctx.fill();

  // Vẽ đóa sen 2D truyền thống
  const drawMuralLotus = (x, y, scale, isPink) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Lá sen
    ctx.fillStyle = '#1e5428';
    ctx.beginPath();
    ctx.ellipse(0, 42, 56, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3fa04e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cánh sen
    const cols = isPink
      ? ['#ea759a', '#f59eb7', '#fce2e8']
      : ['#daaa32', '#f0cf65', '#fff1b0'];
    [-0.65, -0.35, 0, 0.35, 0.65].forEach((ang) => {
      ctx.save();
      ctx.rotate(ang);
      const pGrad = ctx.createLinearGradient(0, 20, 0, -45);
      pGrad.addColorStop(0, cols[0]);
      pGrad.addColorStop(0.6, cols[1]);
      pGrad.addColorStop(1, cols[2]);
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.moveTo(0, 15);
      ctx.bezierCurveTo(-16, 0, -14, -35, 0, -48);
      ctx.bezierCurveTo(14, -35, 16, 0, 0, 15);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    });

    // Nhụy sen
    ctx.fillStyle = '#f9d342';
    ctx.beginPath();
    ctx.arc(0, 5, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  drawMuralLotus(175, 392, 1.3, true);
  drawMuralLotus(340, 412, 1.0, true);
  drawMuralLotus(512, 380, 1.45, false);
  drawMuralLotus(684, 412, 1.0, true);
  drawMuralLotus(849, 392, 1.3, true);

  // Hào quang vàng phía sau tượng trung tâm
  const sunGrad = ctx.createRadialGradient(512, 210, 20, 512, 210, 250);
  sunGrad.addColorStop(0, 'rgba(255, 225, 120, 0.55)');
  sunGrad.addColorStop(0.5, 'rgba(220, 160, 40, 0.22)');
  sunGrad.addColorStop(1, 'rgba(120, 40, 10, 0)');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(512, 210, 250, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

/**
 * Texture khuôn mặt Chú Tiểu Chibi: mắt to long lanh, má ửng hồng, miệng cười (như ảnh 2)
 */
let _monkFaceTexCache = null;
function createMonkFaceTexture() {
  // Dùng chung 1 texture cho tất cả nhân vật (người chơi + NPC quỳ) để tiết kiệm bộ nhớ
  if (_monkFaceTexCache) return _monkFaceTexCache;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Da mặt hồng hào mịn màng
  ctx.fillStyle = '#fce4c8';
  ctx.fillRect(0, 0, 512, 512);

  // Má ửng hồng
  const blush = (cx) => {
    const g = ctx.createRadialGradient(cx, 322, 5, cx, 322, 52);
    g.addColorStop(0, 'rgba(255, 128, 128, 0.55)');
    g.addColorStop(1, 'rgba(255, 128, 128, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, 322, 52, 0, Math.PI * 2);
    ctx.fill();
  };
  blush(150);
  blush(362);

  // Lông mày thanh tú
  ctx.strokeStyle = '#6d4527';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(165, 188, 45, Math.PI * 1.15, Math.PI * 1.72);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(347, 188, 45, Math.PI * 1.28, Math.PI * 1.85);
  ctx.stroke();

  // Đôi mắt Chibi to tròn long lanh
  const drawChibiEye = (cx, cy) => {
    ctx.save();
    ctx.translate(cx, cy);

    const eyeGrad = ctx.createLinearGradient(0, -52, 0, 52);
    eyeGrad.addColorStop(0, '#1c1514');
    eyeGrad.addColorStop(0.55, '#3b2518');
    eyeGrad.addColorStop(0.85, '#84502d');
    eyeGrad.addColorStop(1, '#c28549');

    ctx.fillStyle = eyeGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 42, 58, 0, 0, Math.PI * 2);
    ctx.fill();

    // Viền mi trên đậm
    ctx.strokeStyle = '#1a100a';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(0, -4, 44, 58, 0, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    // Đốm sáng lớn
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-14, -22, 16, 22, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Đốm sáng phụ
    ctx.beginPath();
    ctx.arc(14, 20, 9, 0, Math.PI * 2);
    ctx.fill();

    // Điểm sáng li ti
    ctx.beginPath();
    ctx.arc(-8, 26, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };
  drawChibiEye(165, 252);
  drawChibiEye(347, 252);

  // Mũi chúm chím
  ctx.fillStyle = '#d39973';
  ctx.beginPath();
  ctx.arc(256, 322, 4, 0, Math.PI * 2);
  ctx.fill();

  // Nụ cười mỉm
  ctx.strokeStyle = '#9e4638';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(256, 352, 24, 0.15 * Math.PI, 0.85 * Math.PI, false);
  ctx.stroke();

  _monkFaceTexCache = new THREE.CanvasTexture(canvas);
  return _monkFaceTexCache;
}

/* ========================================================
   MẶT ĐẤT, ĐƯỜNG ĐÁ & SÂN CHÙA (NÂNG CẤP GẠCH ĐÁ TRANG NGHIÊM)
   ======================================================== */
function buildGroundAndPaths() {
  terrain = new THREE.Group();
  const texture = createTempleGrassTexture();
  texture.repeat.set(20, 24);
  groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(84, 100),
    new THREE.MeshStandardMaterial({ map: texture, color: 0xa8b070, roughness: .92 }));
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.y = -.025;
  groundPlane.receiveShadow = true;
  terrain.add(registerWalkable(groundPlane));
  // Vòng dạo bộ quanh hồ, không để sân cũ hoặc bó vỉa cắt qua đệm thiền.
  // Vòng dạo bộ đá mài ấm, như đá hoa cương đánh bóng dưới đèn lồng.
  const ring = new THREE.Mesh(new THREE.RingGeometry(4.5, 7, 64),
    new THREE.MeshStandardMaterial({ color: 0xb8a086, roughness: .55, metalness: .08 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, .07, 2.5);
  ring.receiveShadow = true;
  terrain.add(registerWalkable(ring));
  scene.add(terrain);
}

function buildLotusPond() {
  const pondGroup = new THREE.Group();
  pondGroup.position.set(0, 0, 2.5);

  // Bờ hồ sen tròn bằng đá viền
  const rimGeo = new THREE.TorusGeometry(4.3, 0.22, 16, 48);
  // Bờ hồ đá ong ấm, hắt sáng nhẹ từ đèn dưới nước.
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x8d7a63, roughness: 0.62, metalness: 0.05, emissive: 0x2a1608, emissiveIntensity: 0.5
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.14;
  rim.castShadow = true;
  rim.receiveShadow = true;
  pondGroup.add(rim);

  // Mặt nước hồ sen trong biếc phản chiếu
  const waterGeo = new THREE.CircleGeometry(4.25, 40);
  // Mặt nước phản chiếu hoàng hôn: xanh mòng két ấm, hơi tự phát sáng
  // để hồ sen trông như đang giữ ánh đèn lồng bên trong.
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0b3d36,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.85
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.08;
  pondGroup.add(water);

  const bridge = new THREE.Group();
  bridge.name = 'Arched ironwood bridge';
  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = 256; grainCanvas.height = 64;
  const ctx = grainCanvas.getContext('2d');
  ctx.fillStyle = '#b0b0b0'; ctx.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 24; i++) {
    ctx.strokeStyle = i % 3 ? '#8a8a8a' : '#dddddd';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let x = 0; x <= 256; x += 8) {
      const y = i * 2.7 + Math.sin(x * 0.045 + i) * 0.8;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const grain = new THREE.CanvasTexture(grainCanvas);
  const plankMat = new THREE.MeshStandardMaterial({ color: 0x4a2614, roughness: 0.7, bumpMap: grain, bumpScale: 0.025 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x4a2614, roughness: 0.48 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0xa67c42, roughness: 0.38, metalness: 0.72 });
  const grooveMat = new THREE.MeshStandardMaterial({ color: 0x211008, roughness: 0.9 });
  const length = 9.4, count = 40, step = length / count;
  const deckY = z => 0.16 + 0.74 * Math.cos(z / length * Math.PI);
  // Ván khít, đỉnh mỗi đầu theo cùng đường cong; không có khe raycast xuyên xuống đất.
  // Chặng 7 (8.5): gom mesh cầu để gộp tĩnh ở cuối phần cầu.
  const planks = [];
  const bridgeParts = [];
  for (let i = 0; i < count; i++) {
    const z0 = -length / 2 + i * step, z1 = z0 + step;
    // Chồng mép 1 mm để sai số Float32 không tạo khe raycast ở đường nối.
    const geometry = new THREE.BoxGeometry(1.7, 0.12, step + 0.002);
    const positions = geometry.attributes.position;
    for (let v = 0; v < positions.count; v++) {
      const z = positions.getZ(v) < 0 ? z0 : z1;
      positions.setY(v, positions.getY(v) + deckY(z) - 0.06);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    const plank = new THREE.Mesh(geometry, plankMat);
    plank.name = 'Bridge plank';
    plank.position.z = (z0 + z1) / 2;
    bridge.add(registerWalkable(plank));
    planks.push(plank);
    // Rãnh tối nằm trên mặt ván, không làm thủng bề mặt đi bộ.
    const groove = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.002, 0.012), grooveMat);
    groove.position.set(0, deckY(z0 + 0.015) + 0.001, z0 + 0.015);
    bridge.add(groove);
    bridgeParts.push(groove);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i <= 8; i++) {
      const z = -length / 2 + length * i / 8, y = deckY(z);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.8, 12), railMat);
      post.position.set(side * 0.8, y + 0.4, z); bridge.add(post);
      bridgeParts.push(post);
      const bud = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), bronze);
      bud.scale.set(0.85, 1.45, 0.85);
      bud.position.set(side * 0.8, y + 0.88, z); bridge.add(bud);
      bridgeParts.push(bud);
      if (i === 0 || i === 8) {
        const material = new THREE.MeshStandardMaterial({ color: 0xf26327, emissive: 0xff4815, emissiveIntensity: 0.9, roughness: 0.45 });
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), material);
        lantern.scale.set(1, 1.3, 1);
        lantern.position.set(side * 0.8, y + 1.2, z); bridge.add(lantern);
        for (const dy of [-0.2, 0.2]) {
          const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.035, 12), bronze);
          cap.position.set(side * 0.8, y + 1.2 + dy, z); bridge.add(cap);
          bridgeParts.push(cap);
        }
        const light = new THREE.PointLight(0xff6a28, 1.5, 3.5, 2);
        light.position.copy(lantern.position); bridge.add(light);
        bridgeLights.push({ light, material, phase: i + side });
      }
    }
    for (const height of [0.34, 0.75]) {
      const points = Array.from({ length: 33 }, (_, i) => {
        const z = -length / 2 + length * i / 32;
        return new THREE.Vector3(side * 0.8, deckY(z) + height, z);
      });
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, 0.045, 10, false), railMat);
      bridge.add(tube);
      bridgeParts.push(tube);
    }
  }
  // Chặng 7 (8.5): gộp ván cầu — mesh gộp thay 40 ván lẻ làm bề mặt đi
  // (registerWalkable), raycast cho cùng điểm chạm nên hành vi đi lại không đổi.
  // Gộp TRƯỚC traverse để traverse vẫn đặt castShadow/receiveShadow cho mesh gộp.
  const plankMerged = mergeStaticMeshes(bridge, planks).merged[0];
  if (plankMerged) {
    for (let i = terrainMeshes.length - 1; i >= 0; i--) {
      if (planks.includes(terrainMeshes[i])) terrainMeshes.splice(i, 1);
    }
    registerWalkable(plankMerged);
  }
  mergeStaticMeshes(bridge, bridgeParts);
  bridge.traverse(object => {
    if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; }
  });
  pondGroup.add(bridge);

  // Lá sen và hoa sen nổi
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x2f7a3e, roughness: 0.55, emissive: 0x0d2412, emissiveIntensity: 0.5
  });
  // Hoa sen tự phát sáng để nổi bật trong khung hình ấm.
  const flowerPink = new THREE.MeshStandardMaterial({
    color: 0xffb7c5, roughness: 0.4, emissive: 0xffb7c5, emissiveIntensity: 0.22
  });
  const flowerWhite = new THREE.MeshStandardMaterial({
    color: 0xffd6df, roughness: 0.4, emissive: 0xffb7c5, emissiveIntensity: 0.22
  });

  lotusMaterials.push(flowerPink, flowerWhite);
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
    leaf.position.y = 0.105;
    pondLeaves.push({ mesh: leaf, baseY: 0.105, phase: i * 1.7 });
    pondGroup.add(leaf);

    // Bèo tấm li ti quanh lá sen: lớp "thảm xanh" như ảnh mẫu.
    if (i % 4 === 0) {
      const algae = createGlowSprite(0.55 + Math.random() * 0.3, 0x7fd08a, 0.15, true);
      algae.position.set(lx, 0.1, lz);
      pondGroup.add(algae);
    }

    // Có hoa sen, kèm quầng sáng quanh bông đang nở.
    if (i % 3 === 0) {
      const isPink = i % 2 === 0;
      const lotus = createLotusMesh(isPink ? flowerPink : flowerWhite);
      lotus.position.set(lx, 0.12, lz);
      lotus.scale.setScalar(0.7 + Math.random() * 0.3);
      pondGroup.add(lotus);
      // Chặng 7 (8.5): gộp mesh con của từng bông sen hồ — hình ảnh giữ nguyên.
      const lotusMeshes = [];
      lotus.traverse((o) => { if (o.isMesh) lotusMeshes.push(o); });
      mergeStaticMeshes(lotus, lotusMeshes);

      const bloom = createGlowSprite(1.05, isPink ? 0xff7fb2 : 0xffd9a8, 0.5, true);
      bloom.position.set(lx, 0.26, lz);
      pondGroup.add(bloom);
    }
  }

  scene.add(pondGroup);
}

function createLotusMesh(petalMat) {
  const g = new THREE.Group();
  const petalGeo = new THREE.SphereGeometry(1, 12, 12);
  for (let layer = 0; layer < 2; layer++) {
    for (let p = 0; p < 8; p++) {
      const pivot = new THREE.Group();
      const ang = (p / 8) * Math.PI * 2 + layer * Math.PI / 8;
      pivot.rotation.y = ang;
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.scale.set(0.075, layer ? 0.15 : 0.17, 0.025);
      petal.rotation.x = layer ? 0.3 : 0.65;
      petal.position.set(0, 0.12, layer ? 0.055 : 0.105);
      petal.castShadow = petal.receiveShadow = true;
      pivot.add(petal); g.add(pivot);
    }
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
   TƯỢNG PHẬT DÁT VÀNG TRANG NGHIÊM (THEO ẢNH 3)
   - Đài sen đa tầng cánh tím viền vàng
   - Tóc ốc nhục kế, tai dài, tay kết ấn
   - Hào quang lá đề tia sáng
   ======================================================== */
function createGoldenBuddha(scale = 1) {
  const g = new THREE.Group();

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd24d,
    roughness: 0.25,
    metalness: 0.85,
    emissive: 0x7a4a08,
    emissiveIntensity: 0.55
  });
  const goldBrightMat = new THREE.MeshStandardMaterial({
    color: 0xffe89a,
    roughness: 0.2,
    metalness: 0.9,
    emissive: 0x9a6608,
    emissiveIntensity: 0.7
  });
  const purpleMat = new THREE.MeshStandardMaterial({
    color: 0x7b4fb5,
    roughness: 0.45,
    metalness: 0.25,
    emissive: 0x1d0f33
  });
  const purpleLightMat = new THREE.MeshStandardMaterial({
    color: 0x9a6fd6,
    roughness: 0.4,
    metalness: 0.3,
    emissive: 0x2a1650
  });

  // ---- ĐÀI SEN ĐA TẦNG TÍM VIỀN VÀNG ----
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.1, 0.22, 24), goldMat);
  base.position.y = 0.11;
  g.add(base);

  const tierDefs = [
    { y: 0.34, r: 0.88, petalH: 0.34, petalR: 0.14, count: 14, mat: purpleMat },
    { y: 0.58, r: 0.7, petalH: 0.3, petalR: 0.12, count: 12, mat: purpleLightMat },
    { y: 0.8, r: 0.52, petalH: 0.26, petalR: 0.1, count: 10, mat: purpleMat }
  ];
  tierDefs.forEach((t) => {
    // Vành vàng ôm mỗi tầng cánh sen
    const rim = new THREE.Mesh(new THREE.TorusGeometry(t.r, 0.035, 10, 32), goldBrightMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = t.y + 0.1;
    g.add(rim);

    for (let i = 0; i < t.count; i++) {
      const ang = (i / t.count) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.ConeGeometry(t.petalR, t.petalH, 6), t.mat);
      petal.position.set(Math.cos(ang) * t.r * 0.92, t.y, Math.sin(ang) * t.r * 0.92);
      petal.rotation.z = Math.cos(ang) * 0.5;
      petal.rotation.x = -Math.sin(ang) * 0.5;
      g.add(petal);
    }
  });

  // Mặt ngồi sen vàng
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.14, 20), goldMat);
  seat.position.y = 0.92;
  g.add(seat);

  // ---- THÂN PHẬT NGỒI THIỀN ----
  // Đùi xếp bằng (kiềm già)
  const lap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), goldMat);
  lap.scale.set(1.25, 0.5, 1.0);
  lap.position.y = 1.05;
  g.add(lap);

  // Thân trên thon gọn
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.62, 16), goldMat);
  torso.position.y = 1.42;
  g.add(torso);

  // Ngực & vai tròn đầy
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 14), goldMat);
  chest.scale.set(1.15, 0.9, 0.9);
  chest.position.y = 1.72;
  g.add(chest);

  // Vạt áo choàng chéo qua vai
  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.05, 8, 24, Math.PI * 0.9), goldBrightMat);
  sash.position.set(0, 1.62, 0.05);
  sash.rotation.set(Math.PI / 2.4, 0, 0.6);
  g.add(sash);

  // Hai tay kết ấn thiền định trước bụng
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), goldMat);
  handL.position.set(-0.09, 1.28, 0.26);
  g.add(handL);
  const handR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), goldMat);
  handR.position.set(0.09, 1.28, 0.26);
  g.add(handR);
  const mudra = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), goldBrightMat);
  mudra.scale.set(1.4, 0.7, 0.8);
  mudra.position.set(0, 1.27, 0.3);
  g.add(mudra);

  // Cổ
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 10), goldMat);
  neck.position.y = 1.92;
  g.add(neck);

  // ---- ĐẦU PHẬT & TÓC ỐC NHỤC KẾ ----
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 18), goldMat);
  head.scale.set(1, 1.08, 1);
  head.position.y = 2.12;
  g.add(head);

  // Tai dài thanh thoát
  [-1, 1].forEach((s) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 10), goldMat);
    ear.scale.set(0.6, 1.8, 0.5);
    ear.position.set(s * 0.26, 2.08, 0.02);
    g.add(ear);
  });

  // Búi nhục kế trên đỉnh đầu
  const ushnisha = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), goldMat);
  ushnisha.position.y = 2.42;
  g.add(ushnisha);

  // Vòng tóc ốc xoắn nhỏ quanh đầu
  const curlGeo = new THREE.SphereGeometry(0.035, 8, 8);
  for (let row = 0; row < 3; row++) {
    const rr = 0.24 - row * 0.055;
    const yy = 2.2 + row * 0.075;
    const n = 10 - row * 2;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const curl = new THREE.Mesh(curlGeo, goldBrightMat);
      curl.position.set(Math.cos(ang) * rr, yy, Math.sin(ang) * rr);
      g.add(curl);
    }
  }

  // ---- HÀO QUANG LÁ ĐỀ TIA SÁNG ----
  const haloGroup = new THREE.Group();
  haloGroup.position.set(0, 1.9, -0.42);

  // Lá đề: hình lá nhọn đầu bằng 2 đường cong Bezier
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, -1.35);
  leafShape.bezierCurveTo(0.85, -0.7, 0.85, 0.7, 0, 1.55);
  leafShape.bezierCurveTo(-0.85, 0.7, -0.85, -0.7, 0, -1.35);
  const leafGeo = new THREE.ShapeGeometry(leafShape, 24);
  const leafMat = new THREE.MeshBasicMaterial({
    color: 0xffe27a,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.32
  });
  const leaf = new THREE.Mesh(leafGeo, leafMat);
  haloGroup.add(leaf);

  // Vòng hào quang tròn sau đầu
  const innerHalo = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.42, 32),
    new THREE.MeshBasicMaterial({
      color: 0xfff3b0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    })
  );
  innerHalo.position.set(0, 0.25, 0.02);
  haloGroup.add(innerHalo);

  // Tia sáng răng cưa phóng ra xung quanh lá đề
  const rayGeo = new THREE.ConeGeometry(0.035, 0.3, 6);
  const rayMat = new THREE.MeshBasicMaterial({ color: 0xffdf6d, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 15; i++) {
    const ang = (i / 15) * Math.PI * 2;
    const ray = new THREE.Mesh(rayGeo, rayMat);
    ray.position.set(Math.sin(ang) * 0.78, Math.cos(ang) * 1.32 + 0.1, 0);
    ray.rotation.z = -ang;
    haloGroup.add(ray);
  }

  g.add(haloGroup);

  // Chặng 7 (8.5): gộp mesh tĩnh của tượng theo vật liệu — giữ riêng leaf và
  // innerHalo để nguyên thứ tự trộn trong suốt của hào quang. Hình ảnh không đổi.
  const buddhaParts = [];
  g.traverse((obj) => {
    if (obj.isMesh && obj !== leaf && obj !== innerHalo) {
      buddhaParts.push(obj);
    }
  });
  mergeStaticMeshes(g, buddhaParts);

  g.scale.setScalar(scale);
  return g;
}

/* ========================================================
   CHÁNH ĐIỆN VÔ LƯỢNG (THIỀN VIỆN CHÍNH)
   - Bàn thờ Tam Thế Phật dát vàng trên đài sen tím, tranh tường hoa sen
   - Đèn lồng, nến, bình sen trang trí như ảnh 3
   - Hàng chục Phật tử quỳ tụng kinh trang nghiêm
   ======================================================== */
/**
 * DESIGN 8.4 — Texture gạch hoa Chánh Điện, sinh bằng canvas.
 * 512px = 1 viên gạch = 1.2m thế giới. Nền #97683E, hoa văn kim cương
 * 8 cánh màu gỗ sẫm #36160C, viền viên gạch đôi. RepeatWrapping để lát lưới.
 * (Từ Vilao Call 1a — tcl/claude-opus-4-8, đã duyệt.)
 */
function createHallTileTexture() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');

  // Nền gạch vàng đất
  ctx.fillStyle = '#97683E';
  ctx.fillRect(0, 0, S, S);

  // Vân đá nhẹ (chấm ngẫu nhiên cùng tông, tạo chất gạch cũ)
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(54,22,12,0.05)' : 'rgba(245,231,206,0.05)';
    ctx.beginPath();
    ctx.arc(Math.random() * S, Math.random() * S, Math.random() * 3 + 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Viền viên gạch: nét đậm ngoài + nét mảnh trong
  ctx.strokeStyle = '#36160C';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, S - 10, S - 10);
  ctx.strokeStyle = 'rgba(54,22,12,0.45)';
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, S - 44, S - 44);

  // Hoa văn trung tâm: hai hình thoi xoay tạo hoa 8 cánh + nhụy son sẫm
  const cx = S / 2, cy = S / 2;
  ctx.save();
  ctx.translate(cx, cy);

  ctx.strokeStyle = '#36160C';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, -150); ctx.lineTo(150, 0); ctx.lineTo(0, 150); ctx.lineTo(-150, 0);
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(54,22,12,0.55)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -106); ctx.lineTo(106, 0); ctx.lineTo(0, 106); ctx.lineTo(-106, 0);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = '#36160C';
  ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(245,231,206,0.35)';
  ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();

  // 4 chấm góc trong viên — khớp mối nối hoa giữa các viên khi lát lưới
  ctx.fillStyle = 'rgba(54,22,12,0.5)';
  for (const [gx, gy] of [[70, 70], [-70, 70], [70, -70], [-70, -70]]) {
    ctx.beginPath(); ctx.arc(gx, gy, 14, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Texture khói hương: radial mềm trắng-kem, dùng với NormalBlending và
 * opacity thấp (khác glow texture vốn là AdditiveBlending cho quầng sáng).
 */
let smokeTextureCache = null;
function createSmokeTexture() {
  if (smokeTextureCache) return smokeTextureCache;
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, 'rgba(255,250,238,0.85)');
  grad.addColorStop(0.45, 'rgba(255,250,238,0.38)');
  grad.addColorStop(1, 'rgba(255,250,238,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  smokeTextureCache = new THREE.CanvasTexture(c);
  return smokeTextureCache;
}

function buildMainTempleHall() {
  const hall = new THREE.Group();
  hall.position.set(0, 0, -40);

  const woodColMat = new THREE.MeshStandardMaterial({ color: 0x822116, roughness: 0.5 }); // Cột gỗ son đỏ
  // DESIGN 8.2: mái tối màu (đỏ nâu sẫm pha wood-dark), cấm đỏ tươi phẳng phủ kín trời.
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x5f2015, roughness: 0.7 }); // Ngói đỏ sẫm cong
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd24d,
    roughness: 0.25,
    metalness: 0.85,
    emissive: 0x3d2806
  });
  // Chặng 7 (8.5): danh sách mesh tĩnh của điện sẽ gộp ở cuối buildMainTempleHall.
  const hallMergeParts = [];

  // Bệ tam cấp đá
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(15, 0.6, 9),
    new THREE.MeshStandardMaterial({ color: 0x5e5a5f, roughness: 0.8 })
  );
  plinth.position.y = 0.3;
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  hall.add(registerWalkable(plinth));

  // DESIGN 8.4 — Sàn gạch hoa phủ mặt bệ (bệ cao 0.6, sàn nổi 5mm chống z-fighting).
  // Không registerWalkable: plinth đã là bề mặt đi, sàn chỉ là lớp phủ hình ảnh.
  const hallFloorTex = createHallTileTexture();
  hallFloorTex.repeat.set(12, 7); // 14.4/1.2 x 8.4/1.2 viên
  const hallFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(14.4, 8.4),
    new THREE.MeshStandardMaterial({ map: hallFloorTex, roughness: 0.55 })
  );
  hallFloor.rotation.x = -Math.PI / 2;
  hallFloor.position.y = 0.605;
  hallFloor.receiveShadow = true;
  hall.add(hallFloor);

  // Thảm đỏ son trục hành lễ: rộng 2.4m, từ mép trước bệ (z +4.2) đến chân bàn thờ (z -1.5).
  const altarCarpet = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.012, 5.7),
    new THREE.MeshStandardMaterial({ color: 0x7a0506, roughness: 0.85 }) // #970006 sẫm hơn một chút
  );
  altarCarpet.position.set(0, 0.611, 1.35); // mặt thảm cao hơn sàn gạch 0.012m
  altarCarpet.receiveShadow = true;
  hall.add(altarCarpet);

  // Chặng 6 (điểm 4): sân gạch hoa trước bệ — trước đây là nền đất trơn
  // chiếm ~1/3 dưới khung hình. Texture MỚI (createHallTileTexture trả
  // CanvasTexture mới mỗi lần gọi) vì repeat của sàn điện đã đặt riêng.
  const apronTex = createHallTileTexture();
  apronTex.repeat.set(12, 6); // gạch ~1.2m/viên như sàn điện
  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(14.4, 7),
    new THREE.MeshStandardMaterial({ map: apronTex, roughness: 0.55 })
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(0, 0.02, 8.0); // từ mép trước bệ z +4.5 tới z +11.5
  apron.receiveShadow = true;
  hall.add(apron);

  // Dải thảm đỏ son nối lối đi từ chân bệ xuống sân
  const apronCarpet = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.012, 7),
    new THREE.MeshStandardMaterial({ color: 0x7a0506, roughness: 0.85 })
  );
  apronCarpet.position.set(0, 0.026, 8.0);
  apronCarpet.receiveShadow = true;
  hall.add(apronCarpet);

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
    hallMergeParts.push(col);
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

  // Xà ngang gỗ sẫm dưới mép mái tầng 1 (DESIGN 8.2): 3 xà bậc thang theo độ dốc mái,
  // tạo lớp mái có chiều sâu thay vì một khối nón trơn.
  const eaveBeamMat = new THREE.MeshStandardMaterial({ color: 0x4a1408, roughness: 0.75 });
  [
    { len: 12.4, y: 4.78, z: 3.3 },
    { len: 11.0, y: 5.18, z: 1.7 },
    { len: 9.6, y: 5.58, z: 0.1 }
  ].forEach((b) => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(b.len, 0.2, 0.26), eaveBeamMat);
    beam.position.set(0, b.y, b.z);
    beam.castShadow = true;
    hall.add(beam);
    hallMergeParts.push(beam);
  });

  // Đỉnh tháp vàng
  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.25, 1.2, 8), goldMat);
  finial.position.y = 8.5;
  hall.add(finial);
  hallMergeParts.push(finial);

  // ===== BỨC TRANH TƯỜNG HOA SEN 2D PHẬT GIÁO (ảnh 3) =====
  const muralTex = createLotusMuralTexture();
  const mural = new THREE.Mesh(
    new THREE.PlaneGeometry(11.5, 5.6),
    new THREE.MeshBasicMaterial({ map: muralTex })
  );
  mural.position.set(0, 3.1, -4.45);
  hall.add(mural);

  // Khung viền vàng bao quanh bức tranh tường
  const frameBars = [
    { w: 11.9, h: 0.18, x: 0, y: 5.95 },
    { w: 11.9, h: 0.18, x: 0, y: 0.25 },
    { w: 0.18, h: 5.9, x: -5.85, y: 3.1 },
    { w: 0.18, h: 5.9, x: 5.85, y: 3.1 }
  ];
  frameBars.forEach((b) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, 0.1), goldMat);
    bar.position.set(b.x, b.y, -4.45);
    hall.add(bar);
    hallMergeParts.push(bar);
  });

  // ===== BÀN THỜ CHÁNH ĐIỆN =====
  const altarMat = new THREE.MeshStandardMaterial({ color: 0x5e1512, roughness: 0.5, metalness: 0.15 });
  const altar = new THREE.Mesh(new THREE.BoxGeometry(9, 1.1, 1.6), altarMat);
  altar.position.set(0, 1.15, -2.4);
  altar.castShadow = true;
  altar.receiveShadow = true;
  hall.add(altar);

  // Yếm bàn thờ thêu vàng óng
  const altarFront = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.8, 0.06), goldMat);
  altarFront.position.set(0, 1.0, -1.58);
  hall.add(altarFront);
  hallMergeParts.push(altarFront);

  // ===== TAM THẾ PHẬT DÁT VÀNG TRÊN ĐÀI SEN TÍM (ảnh 3) =====
  const buddhaCenter = createGoldenBuddha(1.0);
  buddhaCenter.position.set(0, 1.7, -3.5);
  hall.add(buddhaCenter);

  const buddhaLeft = createGoldenBuddha(0.68);
  buddhaLeft.position.set(-2.7, 1.7, -3.8);
  hall.add(buddhaLeft);

  const buddhaRight = createGoldenBuddha(0.68);
  buddhaRight.position.set(2.7, 1.7, -3.8);
  hall.add(buddhaRight);

  // Hào quang mềm sau tượng Phật giữa (DESIGN 8.2/8.4): quầng glow lớn + đĩa sáng
  // cộng sáng rất nhẹ, đặt trước tranh tường (z -4.45) và sau tượng (z -3.5).
  const buddhaHalo = createGlowSprite(5.4, 0xffc978, 0.5, true);
  buddhaHalo.position.set(0, 3.3, -4.0);
  hall.add(buddhaHalo);
  const haloDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.55, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffd98a, transparent: true, opacity: 0.16,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    })
  );
  haloDisc.position.set(0, 3.55, -4.12);
  hall.add(haloDisc);

  // Ánh sáng vàng rực ấm tỏa từ bàn thờ
  const altarLight = new THREE.PointLight(0xffc35c, 2.2, 14, 1.4);
  altarLight.position.set(0, 3.4, -2.2);
  hall.add(altarLight);

  // ===== ĐÈN LỒNG QUẢ NHÓT TREO HAI BÊN BÀN THỜ (ảnh 3) =====
  const lanternBodyMat = new THREE.MeshStandardMaterial({
    color: 0xff8a3d,
    roughness: 0.38,
    emissive: 0xff5a12,
    emissiveIntensity: 1.7
  });
  const tasselMat = new THREE.MeshStandardMaterial({ color: 0xd8451c, roughness: 0.6 });
  [-3.9, 3.9].forEach((lx) => {
    const string = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 1.0, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a1a10 })
    );
    string.position.set(lx, 4.6, -3.0);
    hall.add(string);

    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), lanternBodyMat);
    lamp.scale.set(1, 1.2, 1);
    lamp.position.set(lx, 4.0, -3.0);
    hall.add(lamp);

    // Quầng sáng giả bloom quanh đèn lồng chính điện.
    const lampHalo = createGlowSprite(2.1, 0xffb257, 0.68, true);
    lampHalo.position.set(lx, 4.0, -3.0);
    hall.add(lampHalo);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.1, 10), goldMat);
    cap.position.set(lx, 4.32, -3.0);
    hall.add(cap);
    hallMergeParts.push(cap);

    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 8), tasselMat);
    tassel.rotation.x = Math.PI;
    tassel.position.set(lx, 3.72, -3.0);
    hall.add(tassel);

    const lampGlow = new THREE.PointLight(0xff8833, 0.9, 7, 1.8);
    lampGlow.position.set(lx, 4.0, -3.0);
    hall.add(lampGlow);
  });

  // ===== ĐÈN NẾN SÁNG HAI BÊN BÀN THỜ =====
  [-3.4, 3.4].forEach((cx) => {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.5, 10), goldMat);
    stick.position.set(cx, 1.95, -2.4);
    hall.add(stick);
    hallMergeParts.push(stick);

    const candle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.3, 10),
      new THREE.MeshStandardMaterial({ color: 0xffe9b8, emissive: 0x664411 })
    );
    candle.position.set(cx, 2.35, -2.4);
    hall.add(candle);

    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffbb33 })
    );
    flame.scale.set(0.7, 1.6, 0.7);
    flame.position.set(cx, 2.58, -2.4);
    hall.add(flame);
  });

  // ===== BÌNH SEN CẤP TRÊN BÀN THỜ =====
  [-1.8, 1.8].forEach((vx) => {
    const vase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.2, 0.42, 12),
      new THREE.MeshStandardMaterial({ color: 0x274a63, roughness: 0.3, metalness: 0.4 })
    );
    vase.position.set(vx, 1.9, -2.5);
    hall.add(vase);

    const bloom = createLotusMesh(new THREE.MeshStandardMaterial({ color: 0xff6ba3, roughness: 0.4 }));
    bloom.position.set(vx, 2.2, -2.5);
    bloom.scale.setScalar(1.4);
    hall.add(bloom);
    // Chặng 7 (8.5): gộp riêng từng bông sen bàn thờ theo vật liệu.
    const bloomParts = [];
    bloom.traverse((obj) => {
      if (obj.isMesh) {
        bloomParts.push(obj);
      }
    });
    mergeStaticMeshes(bloom, bloomParts);
  });

  // LƯ HƯƠNG ĐỒNG KHÓI NGHI NGÚT TRƯỚC BÀN THỜ
  const censer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.45, 0.8, 16),
    new THREE.MeshStandardMaterial({ color: 0x8a6230, metalness: 0.7, roughness: 0.3 })
  );
  censer.position.set(0, 0.9, 0.5);
  censer.castShadow = true;
  hall.add(censer);

  // Khói hương (DESIGN 8.2): 5 sprite khói mỏng bay lên từ miệng lư, cập nhật
  // trong updatePondEffects. Mỗi sprite một material riêng để opacity độc lập.
  for (let i = 0; i < 5; i++) {
    const smoke = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createSmokeTexture(),
      color: 0xf5e7ce,
      transparent: true,
      opacity: 0,
      depthWrite: false
    }));
    const baseX = (i - 2) * 0.07;
    const baseZ = 0.5 + ((i % 2) - 0.5) * 0.08;
    smoke.position.set(baseX, 1.45, baseZ);
    smoke.scale.set(0.55, 0.55, 1);
    hall.add(smoke);
    hallSmokeSprites.push({
      sprite: smoke, baseX, baseZ,
      phase: i / 5, speed: 0.05 + (i % 3) * 0.012
    });
  }

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

  // Đệm ngồi + đám đông NPC trong Chánh Điện do buildHallCrowd() dựng bằng
  // InstancedMesh (Chặng 3, DESIGN 8.2/8.3) — thay cho vòng đệm trống cũ.

  // Biển hiệu "CHÁNH ĐIỆN VÔ LƯỢNG"
  const signBoard = createSignboard('CHÁNH ĐIỆN VÔ LƯỢNG');
  signBoard.position.set(0, 4.4, 3.6);
  hall.add(signBoard);

  // ===== CỘT TIỀN CẢNH + XÀ NGANG + 2 ĐÈN LỒNG TREO (DESIGN 8.2) =====
  // "Khung tranh" tạo chiều sâu ở miệng Chánh Điện (từ Vilao Call 1b — tcl/claude-opus-4-8, đã duyệt).
  const fgColumnMat = new THREE.MeshStandardMaterial({ color: 0x970006, roughness: 0.44, metalness: 0.02 });
  const fgDarkWoodMat = new THREE.MeshStandardMaterial({ color: 0x36160c, roughness: 0.74 });
  const fgGoldMat = new THREE.MeshStandardMaterial({ color: 0xd3ac7e, roughness: 0.34, metalness: 0.55 });
  const fgStringMat = new THREE.MeshStandardMaterial({ color: 0x36160c, roughness: 0.8 });
  const fgLanternBodyMat = new THREE.MeshStandardMaterial({
    color: 0x970006, roughness: 0.38, emissive: 0xef5f29, emissiveIntensity: 1.6
  });
  const fgTasselMat = new THREE.MeshStandardMaterial({ color: 0x970006, roughness: 0.6 });

  // 2 cột tiền cảnh sơn son đứng trên mặt đất (y 0 → 4.8), phía trước bệ
  [-3.4, 3.4].forEach((fx) => {
    const fgBase = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.9), fgDarkWoodMat);
    fgBase.position.set(fx, 0.175, 5.2);
    fgBase.castShadow = true;
    fgBase.receiveShadow = true;
    hall.add(fgBase);
    hallMergeParts.push(fgBase);

    const fgColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 4.8, 18), fgColumnMat);
    fgColumn.position.set(fx, 2.4, 5.2);
    fgColumn.castShadow = true;
    fgColumn.receiveShadow = true;
    hall.add(fgColumn);
    hallMergeParts.push(fgColumn);

    // Vành vàng nhỏ ở đầu cột
    const fgCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.12, 18), fgGoldMat);
    fgCollar.position.set(fx, 4.56, 5.2);
    fgCollar.castShadow = true;
    hall.add(fgCollar);
    hallMergeParts.push(fgCollar);
  });

  // Xà ngang gỗ sẫm nối 2 cột
  const fgBeam = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.16, 0.32), fgDarkWoodMat);
  fgBeam.position.set(0, 4.7, 5.2);
  fgBeam.castShadow = true;
  fgBeam.receiveShadow = true;
  hall.add(fgBeam);
  hallMergeParts.push(fgBeam);

  // Chốt vàng 2 đầu xà
  [-3.8, 3.8].forEach((fx) => {
    const fgBeamCap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 0.36), fgGoldMat);
    fgBeamCap.position.set(fx, 4.7, 5.2);
    fgBeamCap.castShadow = true;
    hall.add(fgBeamCap);
    hallMergeParts.push(fgBeamCap);
  });

  // 2 đèn lồng treo dưới xà ngang: emissive #EF5F29 + glow sprite + PointLight (8.4)
  // Chặng 6 (điểm 5): đèn thu vào ±1.35 và hạ 0.1 để lọt vào khung portrait
  // (ở ±2.6 chúng nằm ngoài trường nhìn dọc ~20° nên không bao giờ hiện).
  [-1.35, 1.35].forEach((lx) => {
    const fgString = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), fgStringMat);
    fgString.position.set(lx, 4.52, 5.2);
    hall.add(fgString);

    const fgLantern = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), fgLanternBodyMat);
    fgLantern.scale.set(1, 1.15, 1);
    fgLantern.position.set(lx, 4.3, 5.2);
    hall.add(fgLantern);

    const fgCap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.07, 10), fgGoldMat);
    fgCap.position.set(lx, 4.565, 5.2);
    hall.add(fgCap);
    hallMergeParts.push(fgCap);

    const fgTassel = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 8), fgTasselMat);
    fgTassel.rotation.x = Math.PI;
    fgTassel.position.set(lx, 3.92, 5.2);
    hall.add(fgTassel);

    const fgHalo = createGlowSprite(2.2, 0xffb257, 0.6, true);
    fgHalo.position.set(lx, 4.3, 5.2);
    hall.add(fgHalo);

    const fgLampLight = new THREE.PointLight(0xef5f29, 1.2, 7, 1.8);
    fgLampLight.position.set(lx, 4.3, 5.2);
    hall.add(fgLampLight);
  });

  // Chặng 7 (8.5): gộp mesh tĩnh của điện theo vật liệu + cờ bóng đổ.
  mergeStaticMeshes(hall, hallMergeParts);

  // Chặng 3: đám đông NPC ngồi trên bệ (InstancedMesh, DESIGN 8.3).
  buildHallCrowd(hall);
  buildCrowdPills();

  scene.add(hall);
}

/* ========================================================
   ĐÁM ĐÔNG NPC CHÁNH ĐIỆN (Chặng 3 — DESIGN 8.2, 8.3, 8.5)
   InstancedMesh theo bộ phận: 6 draw call cho cả đám đông.
   ======================================================== */
// ===== Đám đông NPC trong Chánh Điện =====
let hallCrowd = null;

// RNG có hạt giống cố định (mulberry32)
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Biến tạm dùng chung (tránh cấp phát mỗi frame)
const _ccV = new THREE.Vector3();
const _ccP = new THREE.Vector3();
const _ccS = new THREE.Vector3();
const _ccQ = new THREE.Quaternion();
const _ccE = new THREE.Euler();

// Compose ma trận cho 1 bộ phận của 1 nhân vật
// part: {mesh, offset:Vector3, scale:Vector3, upper:boolean, robe?:boolean}
function composeCrowdPart(fig, part, bob, bow, out) {
  const o = _ccV.copy(part.offset);
  if (part.upper) {
    // thở: nâng hạ theo bob
    o.y += bob;
    // cúi người quanh trục x tại pivot py = 0.455 (không gian hình)
    const py = 0.455;
    const oy = o.y - py;
    const ny = py + oy * Math.cos(bow) - o.z * Math.sin(bow);
    const nz = oy * Math.sin(bow) + o.z * Math.cos(bow);
    o.y = ny; o.z = nz;
  }
  // xoay offset quanh Y theo yaw của nhân vật
  const c = Math.cos(fig.yaw), s = Math.sin(fig.yaw);
  const nx = o.x * c + o.z * s;
  const nz2 = -o.x * s + o.z * c;
  o.x = nx; o.z = nz2;
  o.multiplyScalar(fig.scale);
  _ccP.set(fig.x, 0.605, fig.z).add(o);
  _ccE.set(part.upper ? bow : 0, fig.yaw, 0, 'YXZ');
  _ccQ.setFromEuler(_ccE);
  _ccS.copy(part.scale).multiplyScalar(fig.scale);
  if (part.robe) _ccS.y *= (1 + bob * 0.55); // áo chỉ "thở" theo scaleY
  out.compose(_ccP, _ccQ, _ccS);
}

// Dựng đám đông ngồi trong Chánh Điện (InstancedMesh theo bộ phận)
function buildHallCrowd(hall) {
  const rng = mulberry32(20261107);
  const group = new THREE.Group();
  group.name = 'hallCrowd';
  const figures = [];

  // --- Danh sách 92 ghế ---
  const seats = [];
  for (let r = 0; r < 7; r++) {
    const z = -1.05 + 0.85 * r;
    const even = r % 2 === 0;
    const n = even ? 7 : 6;
    const base = even ? 1.55 : 1.99;
    for (let k = 0; k < n; k++) {
      for (const side of [-1, 1]) { // -1 = trái, +1 = phải (nhìn hướng -z)
        seats.push({ r, side, k, x: side * (base + 0.88 * k), z });
      }
    }
  }
  // 2 ghế bỏ trống (vẫn có đệm)
  const empty = new Set(['3:-1:2', '5:1:4']);
  const isEmpty = (st) => empty.has(st.r + ':' + st.side + ':' + st.k);

  // --- Xáo trộn thứ tự ghế để chia màu áo theo tỉ lệ ---
  const order = seats.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = order[i]; order[i] = order[j]; order[j] = t;
  }
  const rank = new Array(seats.length);
  order.forEach((seatIdx, p) => { rank[seatIdx] = p; });
  const nSaffron = Math.floor(seats.length * 0.55); // 55% cà sa
  const nBrown = Math.floor(seats.length * 0.30);   // 30% nâu/xám

  // Màu áo theo hạng sau xáo trộn
  const robeColorOf = (rk) => {
    const c = new THREE.Color();
    if (rk < nSaffron) c.setHex(0xe8a020);
    else if (rk < nSaffron + nBrown) c.setHex(rng() < 0.5 ? 0x8a5a33 : 0x6f7280);
    else c.setHex(rng() < 0.5 ? 0x66704f : 0x3d4a6b);
    c.offsetHSL(0, 0, (rng() * 2 - 1) * 0.04);
    return c;
  };

  // --- 6 InstancedMesh ---
  const parts = {};
  const mkPart = (name, geo, ox, oy, oz, sx, sy, sz, count, dynamic, upper, robe) => {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.85 });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    if (dynamic) mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    parts[name] = {
      mesh,
      offset: new THREE.Vector3(ox, oy, oz),
      scale: new THREE.Vector3(sx, sy, sz),
      upper: !!upper,
      robe: !!robe,
    };
    group.add(mesh);
  };

  mkPart('cushion', new THREE.CylinderGeometry(0.30, 0.34, 0.11, 14),
    0, 0.055, 0, 1, 1, 1, seats.length, false, false, false);
  const robePts = [
    new THREE.Vector2(0.001, 0), new THREE.Vector2(0.36, 0),
    new THREE.Vector2(0.345, 0.08), new THREE.Vector2(0.285, 0.28),
    new THREE.Vector2(0.225, 0.46), new THREE.Vector2(0.19, 0.58),
  ];
  mkPart('robe', new THREE.LatheGeometry(robePts, 18),
    0, 0.035, 0, 1, 1, 1, 90, true, false, true);
  mkPart('shoulders', new THREE.SphereGeometry(0.185, 18, 12),
    0, 0.63, 0, 1, 0.72, 0.9, 90, true, true, false);
  // Chặng 6 (điểm 3): đầu to hơn (0.155 → 0.175) cho tỉ lệ chibi như ảnh gốc.
  mkPart('head', new THREE.SphereGeometry(0.175, 20, 14),
    0, 0.86, 0, 1, 1.06, 0.94, 90, true, true, false);
  mkPart('cap', new THREE.SphereGeometry(0.163, 20, 12, 0, Math.PI * 2, 0, 1.35),
    0, 0.865, 0, 1, 1, 1, 90, true, true, false);
  mkPart('hands', new THREE.SphereGeometry(0.055, 10, 8),
    0, 0.525, 0.235, 0.8, 1.5, 0.8, 90, true, true, false);

  // Chặng 6 (điểm 3): vũng hào quang vàng dưới chân mỗi NPC như ảnh gốc —
  // 1 InstancedMesh tĩnh (+1 draw call), dựng thủ công vì mkPart ép
  // MeshStandardMaterial. KHÔNG đưa vào `parts` để updateHallCrowd không
  // bao giờ cập nhật nó theo frame. CircleGeometry sinh đứng (mặt +Z) nên
  // bake phép nằm ngang vào geometry; composeCrowdPart không xoay part.
  const glowPoolGeo = new THREE.CircleGeometry(0.46, 24);
  glowPoolGeo.rotateX(-Math.PI / 2);
  const glowPoolMesh = new THREE.InstancedMesh(
    glowPoolGeo,
    new THREE.MeshBasicMaterial({
      color: 0xffc978, transparent: true, opacity: 0.30,
      blending: THREE.AdditiveBlending, depthWrite: false
    }),
    90
  );
  glowPoolMesh.frustumCulled = false;
  glowPoolMesh.renderOrder = 1;
  group.add(glowPoolMesh);
  const glowPoolPart = {
    mesh: glowPoolMesh,
    offset: new THREE.Vector3(0, 0.012, 0),
    scale: new THREE.Vector3(1, 1, 1),
    upper: false, robe: false
  };

  const capPalette = [0x3a2a20, 0x8e9aa5, 0x6b7280];
  const m = new THREE.Matrix4();
  const zeroFig = { x: 0, z: 0, yaw: 0, scale: 0 }; // ẩn instance (scale 0)
  const D2R = Math.PI / 180;

  seats.forEach((seat, i) => {
    // Đệm: đặt cho cả 92 ghế (kể cả ghế trống), tĩnh
    const cCol = new THREE.Color(0xa83222);
    cCol.offsetHSL(0, 0, (rng() * 2 - 1) * 0.05);
    parts.cushion.mesh.setColorAt(i, cCol);
    composeCrowdPart({ x: seat.x, z: seat.z, yaw: Math.PI, scale: 1 }, parts.cushion, 0, 0, m);
    parts.cushion.mesh.setMatrixAt(i, m);

    if (isEmpty(seat)) return; // ghế trống: không đặt nhân vật

    // Thuộc tính nhân vật
    const fig = {
      x: seat.x + (rng() * 2 - 1) * 0.09,
      z: seat.z + (rng() * 2 - 1) * 0.09,
      yaw: Math.PI + (rng() * 2 - 1) * 10 * D2R,
      scale: 0.95 + rng() * 0.10,
      amp: 0.008 + rng() * 0.007,
      period: 2.6 + rng() * 1.2,
      phase: rng() * Math.PI * 2,
      devout: rng() < 0.45,
      row: seat.r,
      hasCap: false,
    };
    const idx = figures.length;
    figures.push(fig);

    // Màu áo + vai (chung màu áo)
    const robeCol = robeColorOf(rank[i]);
    parts.robe.mesh.setColorAt(idx, robeCol);
    parts.shoulders.mesh.setColorAt(idx, robeCol);

    // Màu da đầu + tay (tay sẫm hơn ×0.92)
    const skin = new THREE.Color(0xf2c7a0);
    skin.offsetHSL(0, 0, (rng() * 2 - 1) * 0.025);
    parts.head.mesh.setColorAt(idx, skin);
    parts.hands.mesh.setColorAt(idx, skin.clone().multiplyScalar(0.92));

    // Khăn/tóc: ~45% có (ghi fig.hasCap để updateHallCrowd giữ ẩn số còn lại),
    // còn lại ẩn bằng scale 0
    if (rng() < 0.45) {
      fig.hasCap = true;
      parts.cap.mesh.setColorAt(idx, new THREE.Color(capPalette[Math.floor(rng() * 3)]));
      composeCrowdPart(fig, parts.cap, 0, 0, m);
      parts.cap.mesh.setMatrixAt(idx, m);
    } else {
      parts.cap.mesh.setColorAt(idx, new THREE.Color(0x000000));
      composeCrowdPart(zeroFig, parts.cap, 0, 0, m);
      parts.cap.mesh.setMatrixAt(idx, m);
    }

    // Ma trận ban đầu (bob = 0, bow = 0)
    composeCrowdPart(fig, parts.robe, 0, 0, m);
    parts.robe.mesh.setMatrixAt(idx, m);
    composeCrowdPart(fig, parts.shoulders, 0, 0, m);
    parts.shoulders.mesh.setMatrixAt(idx, m);
    composeCrowdPart(fig, parts.head, 0, 0, m);
    parts.head.mesh.setMatrixAt(idx, m);
    composeCrowdPart(fig, parts.hands, 0, 0, m);
    parts.hands.mesh.setMatrixAt(idx, m);
    // Vũng hào quang tĩnh theo figure (ghế trống đã return ở trên nên
    // chỉ 90 figure có người mới tới được đây — khớp count 90).
    composeCrowdPart(fig, glowPoolPart, 0, 0, m);
    glowPoolMesh.setMatrixAt(idx, m);
  });

  // Cập nhật buffer màu instance
  Object.values(parts).forEach((p) => {
    if (p.mesh.instanceColor) p.mesh.instanceColor.needsUpdate = true;
  });

  hall.add(group);
  hallCrowd = { group, figures, parts, count: figures.length };
}

// ── Biến tạm dùng chung cho đám đông (không cấp phát trong vòng lặp) ──
const TWO_PI = Math.PI * 2;
const _crowdMat = new THREE.Matrix4();          // ma trận tạm cho mọi instance
const ZERO_FIG = { x: 0, z: 0, yaw: 0, scale: 0 }; // figure giả để ẩn cap (scale 0)

// Cập nhật đám đông mỗi frame: nhịp thở lệch pha + sóng cúi lạy khi tụng kinh.
function updateHallCrowd(time, dt) {
  // 1. Không có đám đông hoặc đang ẩn thì bỏ qua
  if (!hallCrowd || !hallCrowd.group || !hallCrowd.group.visible) return;

  const figures = hallCrowd.figures;
  const parts = hallCrowd.parts;
  const n = figures.length;

  for (let i = 0; i < n; i++) {
    const fig = figures[i];

    // 2. Nhún thở
    const bob = fig.amp * Math.sin(TWO_PI * time / fig.period + fig.phase);

    // 3. Cúi lạy: tính đích rồi tiến/lui mượt
    if (fig.bowCur === undefined) fig.bowCur = 0;
    let bowTarget = 0;
    if (isChanting && fig.devout) {
      // sóng lạy lan từ hàng trước ra sau, lệch pha theo hàng
      const w = 0.5 + 0.5 * Math.sin(TWO_PI * time / 4.6 - fig.row * 0.55 + (fig.phase % 1.0));
      bowTarget = 0.52 * Math.pow(w, 1.6);
    }
    fig.bowCur += (bowTarget - fig.bowCur) * Math.min(1, dt * 3.5);
    const bow = fig.bowCur;

    // 4. Các part động của figure thật
    composeCrowdPart(fig, parts.robe, bob, bow, _crowdMat);
    parts.robe.mesh.setMatrixAt(i, _crowdMat);

    composeCrowdPart(fig, parts.shoulders, bob, bow, _crowdMat);
    parts.shoulders.mesh.setMatrixAt(i, _crowdMat);

    composeCrowdPart(fig, parts.head, bob, bow, _crowdMat);
    parts.head.mesh.setMatrixAt(i, _crowdMat);

    composeCrowdPart(fig, parts.hands, bob, bow, _crowdMat);
    parts.hands.mesh.setMatrixAt(i, _crowdMat);

    // cap: figure không đội nón phải giữ ẩn bằng ZERO_FIG (scale 0)
    composeCrowdPart(fig.hasCap ? fig : ZERO_FIG, parts.cap, bob, bow, _crowdMat);
    parts.cap.mesh.setMatrixAt(i, _crowdMat);
  }

  // 5. Đánh dấu cập nhật cho 5 mesh động (cushion tĩnh, không đụng)
  parts.robe.mesh.instanceMatrix.needsUpdate = true;
  parts.shoulders.mesh.instanceMatrix.needsUpdate = true;
  parts.head.mesh.instanceMatrix.needsUpdate = true;
  parts.hands.mesh.instanceMatrix.needsUpdate = true;
  parts.cap.mesh.instanceMatrix.needsUpdate = true;
}

/* ── Pill tên: factory vẽ canvas theo DESIGN mục 3 ───────────────────────── */
// Tạo sprite pill tên nhân vật (canvas 256x64, hiển thị 64x16 world-scaled)
function createNamePillSprite(name, level, isPlayer) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // Nền pill bo tròn tối đa (bán kính 32), màu tối trong suốt
  ctx.fillStyle = 'rgba(29,15,8,0.72)';
  ctx.beginPath();
  ctx.moveTo(32, 0);
  ctx.lineTo(224, 0);
  ctx.arc(224, 32, 32, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(32, 64);
  ctx.arc(32, 32, 32, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
  ctx.fill();

  // Viền 3px (≈0.5px thật) màu đồng nhạt
  ctx.strokeStyle = 'rgba(211,172,126,0.5)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Ô vuông vàng chứa level, đầu trái pill
  ctx.fillStyle = '#D3AC7E';
  ctx.beginPath();
  const rx = 8, ry = 14, rs = 36, rr = 8;
  ctx.moveTo(rx + rr, ry);
  ctx.lineTo(rx + rs - rr, ry);
  ctx.arcTo(rx + rs, ry, rx + rs, ry + rr, rr);
  ctx.lineTo(rx + rs, ry + rs - rr);
  ctx.arcTo(rx + rs, ry + rs, rx + rs - rr, ry + rs, rr);
  ctx.lineTo(rx + rr, ry + rs);
  ctx.arcTo(rx, ry + rs, rx, ry + rs - rr, rr);
  ctx.lineTo(rx, ry + rr);
  ctx.arcTo(rx, ry, rx + rr, ry, rr);
  ctx.closePath();
  ctx.fill();

  // Số level canh giữa ô vuông
  ctx.fillStyle = '#3A2415';
  ctx.font = 'bold 24px "Be Vietnam Pro", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(level), rx + rs / 2, ry + rs / 2 + 1);

  // Tên pháp danh: bóng đổ giả lệch 1px rồi chữ chính
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '600 27px "Be Vietnam Pro", sans-serif';
  const nameX = rx + rs + 10;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillText(name, nameX + 1, 33);
  ctx.fillStyle = '#F5E7CE';
  ctx.fillText(name, nameX, 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(mat);
  if (isPlayer) {
    sprite.scale.set(1.3, 0.325, 1);
    sprite.visible = true;
  } else {
    sprite.scale.set(1.06, 0.265, 1);
    sprite.visible = false;
  }
  return sprite;
}

// Gắn pill tên cho toàn bộ đám đông Chánh Điện
function buildCrowdPills() {
  if (!hallCrowd) return;
  const rng = mulberry32(20261108); // RNG riêng, không đụng buildHallCrowd
  const first = ['Quảng', 'Tâm', 'Minh', 'Diệu', 'Hạnh', 'An', 'Trí', 'Đức', 'Hiền', 'Thanh', 'Từ', 'Phúc', 'Thiện', 'Chân', 'Ngộ'];
  const second = ['An', 'Lạc', 'Tâm', 'Đức', 'Hiền', 'Ngộ', 'Châu', 'Liên', 'Nguyệt', 'Sơn', 'Hải', 'Quang', 'Tịnh', 'Bình', 'Hòa'];
  for (const fig of hallCrowd.figures) {
    const name = first[Math.floor(rng() * 15)] + ' ' + second[Math.floor(rng() * 15)];
    const level = 1 + Math.floor(rng() * 9);
    const sprite = createNamePillSprite(name, level, false);
    sprite.position.set(fig.x, 1.86, fig.z);
    sprite.visible = false; // chờ hàm cập nhật hiển thị bật khi gần camera
    hallCrowd.group.add(sprite);
    fig.pill = sprite;
    fig.pillName = name;
  }
}

/* ── Pill tên NPC: chỉ hiện khi ở gần nhân vật chính (DESIGN 8.3) ───────────
   Kiểm tra lại mỗi 0.2s: NPC trong bán kính 7.5m quanh NGƯỜI CHƠI mới hiện
   pill, tối đa 10 pill gần nhất để khỏi rối mắt như bản gốc hiện tên tất cả.
   Vì sao đo từ người chơi mà không phải camera: camera bám theo ở khoảng
   cách mặc định 17m nên nếu đo từ camera thì pill không bao giờ hiện trong
   lối chơi thường; người chơi chính là điểm camera nhìn vào, NPC "ở gần"
   theo đúng ý của spec là NPC quanh nhân vật. */
let _pillNextAt = 0;
const _pillCands = [];
function updateCrowdPills() {
  if (!hallCrowd || !player) return;
  const t = clock.getElapsedTime();
  if (t < _pillNextAt) return;
  _pillNextAt = t + 0.2;

  const figures = hallCrowd.figures;
  const limit = hallCrowd.activeCount ?? figures.length;
  _pillCands.length = 0;
  if (hallCrowd.group.visible) {
    for (let i = 0; i < limit; i++) {
      const fig = figures[i];
      if (!fig.pill) continue;
      // hall đặt ở world (0, 0, -40), không xoay → world = local + (0,0,-40)
      const dx = fig.x - player.position.x;
      const dz = (fig.z - 40) - player.position.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < 7.5 * 7.5) _pillCands.push([d2, fig]);
    }
    _pillCands.sort((a, b) => a[0] - b[0]);
  }
  const shown = new Set(_pillCands.slice(0, 10).map((c) => c[1]));
  for (let i = 0; i < figures.length; i++) {
    const fig = figures[i];
    if (fig.pill) fig.pill.visible = shown.has(fig);
  }
  hallCrowd._pillDbg = {
    anchor: [Math.round(player.position.x * 10) / 10, Math.round(player.position.z * 10) / 10],
    cands: _pillCands.length,
    groupVisible: hallCrowd.group.visible,
    firstFig: figures[0] ? [figures[0].x, figures[0].z, !!figures[0].pill] : null,
  };
}

/* ── Nhân vật chính: vòng sáng dưới chân + pill pháp danh luôn hiện (8.3) ── */
let playerRing = null, playerPill = null, _markersScene = null;
const _headWorld = new THREE.Vector3();

function readPlayerDisplayName() {
  let raw = 'Quảng Hạnh 55';
  try {
    const data = JSON.parse(localStorage.getItem('niemphat.v2') || 'null');
    if (data && typeof data.playerName === 'string' && data.playerName.trim()) raw = data.playerName.trim();
  } catch { /* giữ mặc định */ }
  const m = raw.match(/^(.*?)\s*(\d+)\s*$/);
  return m && m[1] ? { name: m[1], level: Math.max(1, parseInt(m[2], 10) || 1) } : { name: raw, level: 1 };
}

function ensurePlayerMarkers() {
  if (_markersScene === scene && playerRing && playerPill) return;
  // Vòng sáng vàng dưới chân (DESIGN 8.3: opacity 0.35, pulsing nhẹ)
  playerRing = new THREE.Mesh(
    new THREE.RingGeometry(0.40, 0.54, 40),
    new THREE.MeshBasicMaterial({
      color: 0xd3ac7e, transparent: true, opacity: 0.35,
      side: THREE.DoubleSide, depthWrite: false
    })
  );
  playerRing.rotation.x = -Math.PI / 2;
  playerRing.renderOrder = 2;
  scene.add(playerRing);
  // Pill pháp danh: đọc tên người dùng thật từ localStorage (kho chung với app)
  const disp = readPlayerDisplayName();
  playerPill = createNamePillSprite(disp.name, disp.level, true);
  playerPill.visible = true;
  scene.add(playerPill);
  _markersScene = scene;
}

function updatePlayerMarkers(t) {
  if (!player || !scene) return;
  ensurePlayerMarkers();
  playerRing.position.set(player.position.x, player.position.y + 0.03, player.position.z);
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
  playerRing.scale.setScalar(1 + pulse * 0.07);
  playerRing.material.opacity = 0.28 + pulse * 0.13;
  if (player.userData.head) {
    player.userData.head.getWorldPosition(_headWorld);
    playerPill.position.set(player.position.x, _headWorld.y + 0.52, player.position.z);
  } else {
    playerPill.position.set(player.position.x, player.position.y + 2.3, player.position.z);
  }
  playerPill.visible = true;
}

/* ── Tự hạ chất lượng theo DESIGN 8.5 ──────────────────────────────────────
   fps trung bình < 28 trong 3 giây → giảm NPC còn 70 + pixelRatio 1.25.
   Ngoại lệ có chủ đích: nếu renderer là phần mềm (SwiftShader/llvmpipe —
   môi trường test ảo hoá) thì fps không phản ánh máy thật nên chỉ ghi log,
   không hạ chất lượng. Cơ chế vẫn chạy thật trên GPU thật. */
let crowdStepDownApplied = false;
let _qualityFor = null, _qTime = 0, _fpsEma = 60, _lowFpsSecs = 0;

export function setCrowdCount(n) {
  if (!hallCrowd) return;
  const c = Math.max(0, Math.min(n, hallCrowd.figures.length));
  for (const key of ['robe', 'shoulders', 'head', 'cap', 'hands']) {
    hallCrowd.parts[key].mesh.count = c;
  }
  hallCrowd.activeCount = c;
}

function isSoftwareRenderer() {
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '') : '';
    return /swiftshader|llvmpipe|software/i.test(name);
  } catch { return false; }
}

/** Chẩn đoán đám đông (dùng cho probe kiểm chứng và debug các chặng sau). */
export function getCrowdStats() {
  if (!hallCrowd) return null;
  const c = new THREE.Color();
  const robeColors = [];
  const robeMesh = hallCrowd.parts.robe.mesh;
  for (let i = 0; i < hallCrowd.figures.length; i++) {
    robeMesh.getColorAt(i, c);
    robeColors.push('#' + c.getHexString());
  }
  return {
    figures: hallCrowd.figures.length,
    activeCount: hallCrowd.activeCount ?? hallCrowd.figures.length,
    cushions: hallCrowd.parts.cushion.mesh.count,
    parts: Object.fromEntries(Object.entries(hallCrowd.parts).map(([k, p]) => [k, p.mesh.count])),
    devout: hallCrowd.figures.filter((f) => f.devout).length,
    withCap: hallCrowd.figures.filter((f) => f.hasCap).length,
    pillsVisible: hallCrowd.figures.filter((f) => f.pill && f.pill.visible).length,
    pillDebug: hallCrowd._pillDbg || null,
    bowingCount: hallCrowd.figures.filter((f) => (f.bowCur || 0) > 0.1).length,
    maxBow: Math.max(0, ...hallCrowd.figures.map((f) => f.bowCur || 0)),
    robeColors,
  };
}

function monitorCrowdQuality(dt) {
  if (!hallCrowd || !renderer) return;
  if (_qualityFor !== hallCrowd) { // đám đông mới (initScene lại) → đặt lại bộ đo
    _qualityFor = hallCrowd; _qTime = 0; _fpsEma = 60; _lowFpsSecs = 0; crowdStepDownApplied = false;
  }
  if (crowdStepDownApplied) return;
  _qTime += dt;
  if (_qTime < 6) return; // 6 giây đầu: chờ scene ổn định
  const fps = 1 / Math.max(dt, 1e-4);
  _fpsEma += (fps - _fpsEma) * 0.05;
  _lowFpsSecs = _fpsEma < 28 ? _lowFpsSecs + dt : 0;
  if (_lowFpsSecs < 3) return;
  crowdStepDownApplied = true;
  if (isSoftwareRenderer()) {
    console.info('[crowd] fps thấp do render bằng phần mềm (SwiftShader) — không áp hạ chất lượng 8.5 trong môi trường này.');
    return;
  }
  setCrowdCount(70);
  // 8.5: pixelRatio hạ về 1.25 — nhưng không bao giờ NÂNG lên nếu máy đang thấp hơn.
  renderer.setPixelRatio(Math.min(renderer.getPixelRatio(), 1.25));
  // 8.5: "tắt bloom" — bloom ở bản này là quầng sáng sprite cộng sáng (glow.js).
  setGlowPulsesEnabled(false);
  console.info('[crowd] Đã hạ chất lượng theo DESIGN 8.5: NPC còn 70, pixelRatio ≤ 1.25, tắt quầng sáng pulse.');
}

/** Trạng thái cơ chế hạ chất lượng 8.5 (dùng cho probe kiểm chứng). */
export function getQualityStepDownState() {
  return {
    applied: crowdStepDownApplied,
    crowdCount: hallCrowd ? (hallCrowd.activeCount ?? hallCrowd.figures.length) : null,
    pixelRatio: renderer ? renderer.getPixelRatio() : null
  };
}
function buildQuanAmPavilion() {
  const g = new THREE.Group();
  g.position.set(-28, 0, -8);

  // Bệ bát giác
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.4, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x5a585e, roughness: 0.8 })
  );
  base.position.y = 0.25;
  base.receiveShadow = true;
  g.add(registerWalkable(base));

  // 6 Cột
  const colMat = new THREE.MeshStandardMaterial({ color: 0x7c261e });
  const qaCols = [];
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 3.8, 12), colMat);
    col.position.set(Math.cos(ang) * 2.4, 2.15, Math.sin(ang) * 2.4);
    col.castShadow = true;
    g.add(col);
    qaCols.push(col);
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

  // Chặng 7 (8.5): gộp 6 cột đình thành 1 mesh tĩnh.
  mergeStaticMeshes(g, qaCols);
  scene.add(g);
}

/* ========================================================
   THÁP CHUÔNG ĐẠI HỒNG (THIỀN VIỆN PHỤ 2)
   ======================================================== */
function buildBellTower() {
  const g = new THREE.Group();
  g.position.set(28, 0, -8);

  // Bệ đá
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.5, 5.2),
    new THREE.MeshStandardMaterial({ color: 0x5a585e, roughness: 0.8 })
  );
  base.position.y = 0.25;
  base.receiveShadow = true;
  g.add(registerWalkable(base));

  // 4 Cột lớn
  const colMat = new THREE.MeshStandardMaterial({ color: 0x5c2b18 });
  const bellCols = [];
  [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]].forEach(([cx, cz]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 4.4, 12), colMat);
    col.position.set(cx, 2.45, cz);
    col.castShadow = true;
    g.add(col);
    bellCols.push(col);
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

  // Chặng 7 (8.5): gộp 4 cột tháp thành 1 mesh tĩnh.
  mergeStaticMeshes(g, bellCols);
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

  // Chặng 7 (8.5): material cột đèn dùng chung + danh sách gộp tĩnh môi trường.
  const postMat = new THREE.MeshStandardMaterial({ color: 0x332219 });
  const envMergeParts = [];
  const envTreeGroups = [];
  lanternPositions.forEach(([lx, ly, lz]) => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, ly, 8),
      postMat
    );
    post.position.set(lx, ly / 2, lz);
    scene.add(post);
    envMergeParts.push(post);

    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), lanternMat);
    lantern.scale.set(1, 1.25, 1);
    lantern.position.set(lx, ly + 0.15, lz);
    scene.add(lantern);
    envMergeParts.push(lantern);

    // Quầng sáng giả bloom (additive sprite) tạo ảo giác phát sáng ấm.
    const halo = createGlowSprite(1.7, 0xffa64d, 0.62, true);
    halo.position.set(lx, ly + 0.15, lz);
    scene.add(halo);

    // Nguồn sáng nhẹ tỏa ra từ đèn lồng
    const pl = new THREE.PointLight(0xff8a3c, 1.5, 8, 1.6);
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
      envMergeParts.push(frond);
    }
    scene.add(tree);
    envTreeGroups.push(tree);
    envMergeParts.push(trunk);
  });
  // Chặng 7 (8.5): gộp trang trí tĩnh môi trường; nhóm cây đã rỗng, dọn bỏ.
  mergeStaticMeshes(scene, envMergeParts);
  envTreeGroups.forEach((t) => t.removeFromParent());
}

/* ========================================================
   TẠO MÔ HÌNH NHÂN VẬT CHÚ TIỂU (CHUẨN THEO ẢNH 2)
   - Mặt Chibi mắt to tròn long lanh, má ửng hồng
   - Tràng hạt gỗ quanh cổ, áo tràng vạt chéo nơ thắt lưng
   - Tay áo thụng, tất trắng, hài đen viền trắng
   ======================================================== */
export function createCharacterPreview(canvas, type = selectedAvatar) {
  const previewScene = new THREE.Scene();
  previewScene.background = new THREE.Color(0xfff5df);
  const previewCamera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
  previewCamera.position.set(0, 1.8, 5.3);
  previewCamera.lookAt(0, 1.2, 0);
  const previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  previewScene.add(new THREE.HemisphereLight(0xffffff, 0xd0ad71, 2));
  const keyLight = new THREE.DirectionalLight(0xffefcf, 2.4);
  keyLight.position.set(-3, 5, 4);
  previewScene.add(keyLight);
  const monk = createMonkCharacter({ isSelf: false, type });
  previewScene.add(monk);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.8, 48), new THREE.MeshStandardMaterial({ color: 0xf0dfbc }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  previewScene.add(floor);
  let frame;
  let disposed = false;
  function draw(time = 0) {
    if (disposed) return;
    const width = canvas.clientWidth || 300;
    const height = canvas.clientHeight || 330;
    previewRenderer.setSize(width, height, false);
    previewCamera.aspect = width / height;
    previewCamera.updateProjectionMatrix();
    monk.rotation.y = Math.sin(time * 0.0004) * 0.15;
    // Nhịp thở nhẹ trong khung xem trước để nhân vật trông còn sống.
    updateCharacter(monk, 1 / 60);
    previewRenderer.render(previewScene, previewCamera);
    frame = requestAnimationFrame(draw);
  }
  draw();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    disposeCharacter(monk);
    floor.geometry.dispose();
    floor.material.dispose();
    previewRenderer.dispose();
  };
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
  clickMarker.position.set(pos.x, pos.y + 0.025, pos.z);
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
  // Không điều khiển nhân vật khi người dùng đang nhập nội dung.
  const clearMovementKeys = () => {
    Object.keys(keysDown).forEach((code) => { keysDown[code] = false; });
    setJoystickMove(0, 0);
    targetPosition = null;
    pendingSeat = null;
    if (player) player.userData.isMoving = false;
  };
  window.addEventListener('blur', clearMovementKeys);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearMovementKeys();
  });
  window.addEventListener('focusin', (e) => {
    if (e.target?.matches?.('input, textarea, select') || e.target?.isContentEditable) {
      clearMovementKeys();
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.target?.matches?.('input, textarea, select') || e.target?.isContentEditable) return;
    keysDown[e.code] = true;
    // Bỏ target position khi bấm phím
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.code)) {
      targetPosition = null; pendingSeat = null;
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
      const seatHit = raycaster.intersectObjects(meditationSeats)[0];
      pendingSeat = seatHit?.object || null;
      standUp();
      const intersects = seatHit ? [seatHit] : raycaster.intersectObjects(terrainMeshes, false);
      if (intersects.length > 0) {
        const hit = intersects[0].point;
        // Giới hạn phạm vi di chuyển trong khuôn viên chùa
        const clampedX = Math.max(-CAMPUS_BOUNDS.x, Math.min(CAMPUS_BOUNDS.x, hit.x));
        const clampedZ = Math.max(CAMPUS_BOUNDS.minZ, Math.min(CAMPUS_BOUNDS.maxZ, hit.z));

        targetPosition = new THREE.Vector3(clampedX, hit.y, clampedZ);
        showClickEffect(targetPosition);
      }
    }
  });

  // Zoom camera bằng lăn chuột
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    camDistance = Math.max(4.0, Math.min(42.0, camDistance + e.deltaY * 0.012));
  }, { passive: false });
}

export function setJoystickMove(x, y) {
  joystickVector.x = x;
  joystickVector.y = y;
  if (Math.hypot(x, y) > 0.05) {
    targetPosition = null; pendingSeat = null; // Ưu tiên joystick
  }
}

// Chặng 6 (điểm 1): đặt camera ngay vào vị trí bám theo hiện tại — dùng đúng
// công thức của vòng lặp animate để khung hình sau teleport không bị "nhảy".
function snapCameraToFollowTarget() {
  if (!camera || !player) return;
  const cosPitch = Math.cos(camPitch);
  const targetX = player.position.x + Math.sin(camYaw) * camDistance * cosPitch;
  const targetY = player.position.y + 1.2 + Math.sin(camPitch) * camDistance;
  const targetZ = player.position.z + Math.cos(camYaw) * camDistance * cosPitch;
  camera.position.set(targetX, targetY, targetZ);
  camera.lookAt(player.position.x, player.position.y + 1.1, player.position.z);
}

export function teleportTo(locKey) {
  const loc = LOCATIONS[locKey];
  if (!loc || !player) return;
  targetPosition = null;
  pendingSeat = null;
  standUp();
  player.position.set(loc.x, 0, loc.z);
  groundPlayer(0, true);

  if (locKey === 'mainHall') {
    // Chặng 6 (điểm 1): khung hình mặc định riêng cho Chánh Điện — camera nằm
    // trong lòng điện dưới mái, sau hàng người, nhìn dọc lối đi về ban thờ.
    // camYaw=0.12: chéo nhẹ, tránh đối xứng hoàn toàn (DESIGN 8.1).
    // camPitch=0.34 + camDistance=9.5: camera ở z local ≈ +11.9, y ≈ 5.0 —
    // ngay ngoài mép nắp mái; tia nhìn tới người chơi/ban thờ lọt dưới mép
    // nắp và mặt dốc mái nên không còn bị mái che như khung mặc định cũ.
    camYaw = 0.12;
    camPitch = 0.34;
    camDistance = 9.5;
    snapCameraToFollowTarget();
  }
}

export function setChantingState(chanting) {
  isChanting = !!chanting;
}

export function setAura(active) {
  isChanting = !!active;
}

/** A8 — Kết xuất tức thời một khung hình rồi trả về ảnh PNG (data URL). */
export function captureScene() {
  if (!renderer || !scene || !camera) return null;
  try {
    // Vẽ lại ngay trong cùng một tác vụ để bộ đệm vẽ còn nguyên vẹn
    // (không cần bật preserveDrawingBuffer, tránh tốn VRAM).
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png');
  } catch (err) {
    console.warn('Không chụp được khung hình 3D:', err);
    return null;
  }
}

/** A14 — Ẩn/hiện toàn bộ NPC trong chánh điện để giảm tải GPU. */
export function setNpcsVisible(visible) {
  const on = visible !== false;
  onlineMonks.forEach((npc) => {
    if (npc) npc.visible = on;
  });
  // Chặng 3: đám đông InstancedMesh của Chánh Điện
  if (hallCrowd && hallCrowd.group) hallCrowd.group.visible = on;
}

export function onZoneChange(cb) {
  onZoneChangeCallback = cb;
}

/* ========================================================
   DỮ LIỆU CHO MINIMAP (Canvas 2D, xem js/minimap.js)
   - shapes: hình học tĩnh của khuôn viên, toạ độ thế giới
   - Không dùng ảnh: bản đồ vẽ lại từ chính hình học đã dựng.
   ======================================================== */
const MM_COLORS = {
  path: 'rgba(122,100,68,.55)',
  stone: 'rgba(104,106,96,.62)',
  corridor: 'rgba(120,96,64,.8)',
  hall: 'rgba(150,60,48,.85)',
  roof: 'rgba(84,116,112,.9)',
  water: 'rgba(46,86,104,.72)',
  green: 'rgba(52,92,64,.8)',
  cushion: 'rgba(168,50,34,.72)',
  gate: 'rgba(150,120,72,.85)'
};

let minimapSceneCache = null;
const _mmTmp = new THREE.Vector3();

/** Hình học tĩnh của khuôn viên, dựng một lần rồi dùng lại. */
export function getMinimapScene() {
  if (minimapSceneCache) return minimapSceneCache;
  const shapes = [];
  const rect = (fill, x0, x1, z0, z1) => shapes.push({ k: 'rect', fill, x0, x1, z0, z1 });
  const disc = (fill, x, z, r, k = 'circle') => shapes.push({ k, fill, x, z, r });

  // Nền sân đá chính và trục hành lễ giữa sân
  rect(MM_COLORS.stone, -19, 19, -35.5, -4.5);
  rect(MM_COLORS.path, -2.5, 2.5, -41.5, 31.5);
  // Vòng dạo bộ quanh hồ sen
  disc(MM_COLORS.stone, 0, 2.5, 7);

  // Hai hành lang bên có mái
  for (const side of [-1, 1]) {
    rect(MM_COLORS.corridor, side < 0 ? -21.6 : 18, side < 0 ? -18 : 21.6, -37.5, 27.5);
    rect(MM_COLORS.stone, side < 0 ? -34.5 : 15.5, side < 0 ? -15.5 : 34.5, 7.3, 10.7);
    rect(MM_COLORS.stone, side < 0 ? -34 : 18, side < 0 ? -18 : 34, 9, 23);
    rect(MM_COLORS.stone, side < 0 ? -34.5 : 15.5, side < 0 ? -15.5 : 34.5, -13.5, -10.5);
  }

  // Đệm thiền: cụm giữa sân và hai cụm vườn bên
  rect(MM_COLORS.cushion, -15.5, 15.5, -30.6, -8.4);
  for (const side of [-1, 1]) {
    rect(MM_COLORS.cushion, side < 0 ? -30 : 20.4, side < 0 ? -20.4 : 30, 11.4, 18.6);
  }

  // Hồ sen và hai vòng tiểu cảnh vườn thiền
  disc(MM_COLORS.water, 0, 2.5, 4.3);
  for (const side of [-1, 1]) disc(MM_COLORS.green, side * 26, 26, 4.5);

  // Công trình: Chánh Điện (gốc z = -40), Quán Âm Các, Lầu Chuông
  rect(MM_COLORS.hall, -12, 12, -48, -32);
  rect(MM_COLORS.roof, -13.5, 13.5, -49, -47.6);
  disc(MM_COLORS.hall, -28, -8, 4);
  disc(MM_COLORS.roof, -28, -8, 2.2);
  disc(MM_COLORS.hall, 28, -8, 4);
  disc(MM_COLORS.roof, 28, -8, 2.2);

  // Tam quan phía nam và tường khuôn viên
  rect(MM_COLORS.gate, -5.5, 5.5, 30.2, 33.8);
  rect('rgba(226,186,110,.35)', -40, 40, -48.4, -47.8);
  rect('rgba(226,186,110,.35)', -40.4, -39.8, -48, 38);
  rect('rgba(226,186,110,.35)', 39.8, 40.4, -48, 38);

  minimapSceneCache = {
    bounds: {
      minX: -CAMPUS_BOUNDS.x - 2,
      maxX: CAMPUS_BOUNDS.x + 2,
      minZ: CAMPUS_BOUNDS.minZ - 2,
      maxZ: CAMPUS_BOUNDS.maxZ + 2
    },
    shapes
  };
  return minimapSceneCache;
}

/** Vị trí người chơi + các chú tiểu đang ngồi, cập nhật mỗi frame. */
export function getMinimapFrame() {
  if (!player) return null;
  const actors = [];
  for (const npc of onlineMonks) {
    if (!npc || !npc.visible) continue;
    npc.getWorldPosition(_mmTmp);
    actors.push({ x: _mmTmp.x, z: _mmTmp.z, npc: true });
  }
  return {
    player: { x: player.position.x, z: player.position.z, ry: player.rotation.y },
    actors
  };
}

/* ========================================================
   HỆ THỐNG THẢ ĐÈN NGUYỆN (HOA ĐĂNG HỒ SEN)
   ======================================================== */
export function spawnLantern(message) {
  if (!scene) return;
  const g = new THREE.Group();
  // Đèn sen thả từ mép hồ gần nhân vật nhất
  const px = player ? player.position.x : 0;
  const pz = player ? player.position.z : 8;
  const startAngle = Math.atan2(pz - 2.5, px);
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
   ĐÈN TRỜI BAY LÊN (Chặng 4 — thả từ Sheet Đèn nguyện)
   Khác đèn hoa đăng trôi trên hồ: đèn giấy bay thẳng lên trời,
   lắc nhẹ, mờ dần rồi tự huỷ (gỡ cả sprite khỏi glowPulses).
   ======================================================== */
const skyLanterns = [];

export function releaseSkyLantern(message) {
  if (!scene) return;
  const group = new THREE.Group();
  const base = player ? player.position : new THREE.Vector3(0, 0, 0);
  group.position.set(base.x + 0.8, base.y + 1.1, base.z + (player ? -0.5 : 7.5));

  const paperMat = new THREE.MeshStandardMaterial({ color: 0xffb45e, emissive: 0xff7a26, emissiveIntensity: 1.15, transparent: true, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.21, 0.36, 10, 1, true), paperMat);
  group.add(body);

  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), paperMat);
  cap.rotation.x = -Math.PI / 2;
  cap.position.y = 0.18;
  group.add(cap);

  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe899 }));
  flame.position.y = -0.05;
  group.add(flame);

  const glow = createGlowSprite(1.5, 0xffb45e, 0.75);
  group.add(glow);

  const light = new THREE.PointLight(0xff9933, 1.2, 6, 2);
  light.position.y = 0;
  group.add(light);

  skyLanterns.push({ mesh: group, life: 0, swayPhase: Math.random() * Math.PI * 2, message, startX: group.position.x, startZ: group.position.z });
  scene.add(group);
}

function updateSkyLanterns(time, dt) {
  for (let i = skyLanterns.length - 1; i >= 0; i--) {
    const l = skyLanterns[i];
    l.life += dt;
    const speed = 0.5 + Math.min(l.life * 0.02, 0.25);
    l.mesh.position.y += speed * dt;
    l.mesh.position.x = l.startX + Math.sin(time * 0.9 + l.swayPhase) * 0.12;
    l.mesh.position.z = l.startZ + Math.cos(time * 0.7 + l.swayPhase) * 0.12;

    if (l.life > 13) {
      const fade = Math.max(0, 1 - (l.life - 13) / 2.5);
      l.mesh.children.forEach(c => {
        if (c.material && c.material.transparent) c.material.opacity = fade;
        if (c.isSprite) c.material.opacity = 0.75 * fade;
        if (c.isPointLight) c.intensity = 1.2 * fade;
      });
    }

    if (l.life > 15.5 || l.mesh.position.y > 26) {
      scene.remove(l.mesh);
      l.mesh.traverse(c => {
        if (c.isSprite) {
          const idx = glowPulses.findIndex(g => g.sprite === c);
          if (idx >= 0) glowPulses.splice(idx, 1);
        }
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
      skyLanterns.splice(i, 1);
    }
  }
}

export function getSkyLanternStats() {
  return { active: skyLanterns.length };
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
      targetPosition = null;
      if (pendingSeat) {
        player.position.set(pendingSeat.position.x, .29, pendingSeat.position.z);
        player.rotation.y = Math.PI;
        poseChibi(player, true);
        pendingSeat = null;
      }
    }
  }

  const isMoving = Math.hypot(moveX, moveZ) > 0.05;

  if (isMoving) {
    standUp();
    const dir = new THREE.Vector2(moveX, moveZ).normalize();
    player.position.x += dir.x * playerSpeed * dt;
    player.position.z += dir.y * playerSpeed * dt;

    // Giới hạn trong khuôn viên chùa
    player.position.x = Math.max(-CAMPUS_BOUNDS.x, Math.min(CAMPUS_BOUNDS.x, player.position.x));
    player.position.z = Math.max(CAMPUS_BOUNDS.minZ, Math.min(CAMPUS_BOUNDS.maxZ, player.position.z));

    // Xoay nhân vật mượt mà theo hướng đi
    const targetAngle = Math.atan2(dir.x, dir.y);
    player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, targetAngle, 14 * dt);
  }

  // Gán sau standUp(): poseChibi đặt lại isMoving khi đổi tư thế.
  // Cập nhật cả khi nhả phím/joystick để tay chân trở về tư thế nghỉ.
  groundPlayer(dt);
  player.userData.isMoving = isMoving;
  updateCharacter(player, dt);

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

  // Nhịp "thở" của toàn bộ quầng sáng (đèn lồng, hoa sen, đèn nguyện).
  updateGlowPulses(clock.getElapsedTime());
  updatePondEffects(clock.getElapsedTime());

  // Chặng 3: đám đông Chánh Điện — nhịp thở, sóng cúi lạy, pill tên, vòng sáng.
  updateHallCrowd(clock.getElapsedTime(), dt);
  updateCrowdPills();
  updatePlayerMarkers(clock.getElapsedTime());
  monitorCrowdQuality(dt);

  // Cập nhật đèn nguyện trôi trên hồ sen
  lanternsInPond.forEach((item) => {
    item.life += dt;
    item.mesh.position.x += item.driftVx * dt;
    item.mesh.position.z += item.driftVz * dt;
    // Nhấp nhô nhẹ trên sóng nước
    item.mesh.position.y = 0.09 + Math.sin(item.life * 2.0) * 0.015;
  });

  // Chặng 4: đèn trời bay lên từ Sheet Đèn nguyện
  updateSkyLanterns(clock.getElapsedTime(), dt);

  // Kiểm tra khu vực chú tiểu đang đứng
  checkPlayerZone();
}

function checkPlayerZone() {
  if (!player) return;
  let detectedZone = null;
  for (const [key, loc] of Object.entries(LOCATIONS)) {
    const dist = Math.hypot(player.position.x - loc.x, player.position.z - loc.z);
    const radius = key === 'pond' ? 5.2 : key === 'meditation' ? 16 : key === 'garden' ? 12 : 3.8;
    if (dist < radius) {
      detectedZone = { key, ...loc };
      break;
    }
  }

  if (detectedZone?.key !== currentZone?.key) {
    currentZone = detectedZone;
    if (onZoneChangeCallback) {
      onZoneChangeCallback(currentZone?.key, currentZone);
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
