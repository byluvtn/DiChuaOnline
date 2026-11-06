/**
 * Engine 3D (Three.js): chùa đơn giản + chú tiểu ngồi trên đệm sen.
 * Chạy trên mobile, không cần model ngoài.
 */

import * as THREE from 'three';

let scene, camera, renderer, clock;
let monk, cushion, aura, floor, pillar;
let time = 0;
let rafId;
let auraOn = false;

const QUALITY = { high: 1, mid: 0.75, low: 0.5 };

export function initScene(canvas, quality = 'mid') {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x080403, 0.018);

  camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 2.6, 4.6);
  camera.lookAt(0, 0.6, 0);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY[quality] ? QUALITY[quality] : 1));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setClearColor(0x080403, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  clock = new THREE.Clock();

  // ---------- ánh sáng ----------
  const amb = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(amb);

  const dir = new THREE.DirectionalLight(0xffd8a0, 0.9);
  dir.position.set(2, 6, 2);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.near = 0.5;
  dir.shadow.camera.far = 20;
  dir.shadow.camera.left = -6;
  dir.shadow.camera.right = 6;
  dir.shadow.camera.top = 6;
  dir.shadow.camera.bottom = -6;
  scene.add(dir);

  const spot = new THREE.SpotLight(0xffb86b, 12, 14, 0.45, 0.5, 1);
  spot.position.set(0, 3.2, 0);
  spot.angle = Math.PI / 4;
  spot.penumbra = 0.6;
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  scene.add(spot);
  scene.add(spot.target);

  // ---------- sàn gạch ----------
  const grid = new THREE.GridHelper(14, 14, 0x5a2a1a, 0x2a120c);
  grid.position.y = 0.01;
  scene.add(grid);

  const floorGeo = new THREE.PlaneGeometry(14, 14);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x4a2212,
    roughness: 0.85,
    metalness: 0.15
  });
  floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- cột chùa ----------
  const colGeo = new THREE.CylinderGeometry(0.42, 0.42, 3.6, 24);
  const colMat = new THREE.MeshStandardMaterial({ color: 0x9b1b1b, roughness: 0.5 });
  pillar = new THREE.Mesh(colGeo, colMat);
  pillar.position.set(-2.2, 1.8, 0);
  pillar.castShadow = true;
  pillar.receiveShadow = true;
  scene.add(pillar);

  const baseGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.5, 24);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x7a4a1a, roughness: 0.6 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.copy(pillar.position);
  base.position.y = 0.25;
  base.castShadow = true;
  base.receiveShadow = true;
  scene.add(base);

  // ---------- đệm sen ----------
  cushion = new THREE.Group();
  cushion.position.set(0, 0.05, 0);

  const padGeo = new THREE.CylinderGeometry(1.15, 1.15, 0.28, 32);
  const padMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 });
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.y = 0.14;
  pad.receiveShadow = true;
  cushion.add(pad);

  const lotusGeo = new THREE.ConeGeometry(0.95, 0.55, 12, 1, true);
  const lotusMat = new THREE.MeshStandardMaterial({ color: 0xd8a05a, roughness: 0.6 });
  for (let i = 0; i < 8; i++) {
    const petal = new THREE.Mesh(lotusGeo, lotusMat);
    petal.position.y = 0.14;
    petal.rotation.x = Math.PI / 2;
    petal.rotation.z = (i / 8) * Math.PI * 2;
    petal.position.x = Math.cos(petal.rotation.z) * 0.55;
    petal.position.z = Math.sin(petal.rotation.z) * 0.55;
    petal.castShadow = true;
    cushion.add(petal);
  }

  scene.add(cushion);

  // ---------- chú tiểu ----------
  monk = buildMonk();
  monk.position.set(0, 0.42, 0);
  scene.add(monk);

  // ---------- aura ----------
  const auraGeo = new THREE.SphereGeometry(0.75, 32, 32);
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xffd98a,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  aura = new THREE.Mesh(auraGeo, auraMat);
  aura.position.y = 0.42;
  scene.add(aura);

  // ---------- đèn ----------
  const lampGeo = new THREE.SphereGeometry(0.14, 16, 16);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd98a });
  const lamp = new THREE.Mesh(lampGeo, lampMat);
  lamp.position.set(0, 2.6, 0);
  scene.add(lamp);

  // ---------- camera ----------
  const target = new THREE.Vector3(0, 0.55, 0);
  let camAngle = 0;

  function animate() {
    rafId = requestAnimationFrame(animate);
    const dt = clock.getDelta();
    time += dt;

    // camera quay chậm quanh chùa
    camAngle += dt * 0.18;
    const r = 4.6;
    camera.position.set(Math.sin(camAngle) * r, 2.4 + Math.sin(time * 0.7) * 0.12, Math.cos(camAngle) * r);
    camera.lookAt(target);

    // chú thở nhẹ
    if (monk) {
      const breath = Math.sin(time * 2.2) * 0.018;
      monk.position.y = 0.42 + breath;
      const head = monk.userData.head;
      if (head) head.rotation.x = Math.sin(time * 2.2) * 0.04;
    }

    // aura: luôn nhấp nháy nhẹ, sáng hơn khi đang tụng
    if (aura) {
      const pulse = 0.5 + Math.sin(time * 2.6) * 0.5;
      const base = auraOn ? 0.30 : 0.06;
      aura.material.opacity = base + pulse * (auraOn ? 0.22 : 0.05);
      aura.scale.setScalar(1 + Math.sin(time * 2) * 0.03 + (auraOn ? 0.06 : 0));
    }

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', onResize);
  return onResize;
}

function onResize() {
  if (!renderer || !camera) return;
  const canvas = renderer.domElement;
  const dpr = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
}

function buildMonk() {
  const g = new THREE.Group();

  // thân (áo nâu)
  const bodyGeo = new THREE.CylinderGeometry(0.28, 0.22, 0.75, 16);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.8 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.38;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // tay chắp
  const armGeo = new THREE.CylinderGeometry(0.07, 0.05, 0.42, 12);
  const armMat = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.8 });
  const lArm = new THREE.Mesh(armGeo, armMat);
  lArm.position.set(-0.16, 0.62, 0.05);
  lArm.rotation.z = 0.55;
  lArm.castShadow = true;
  g.add(lArm);

  const rArm = new THREE.Mesh(armGeo, armMat);
  rArm.position.set(0.16, 0.62, 0.05);
  rArm.rotation.z = -0.55;
  rArm.castShadow = true;
  g.add(rArm);

  // đầu
  const headGeo = new THREE.SphereGeometry(0.22, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0x1a120e, roughness: 0.9 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 0.82;
  head.castShadow = true;
  g.add(head);
  g.userData.head = head;

  // trán
  const dotGeo = new THREE.SphereGeometry(0.035, 8, 8);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xffd98a });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  dot.position.set(0, 0.01, 0.215);
  head.add(dot);

  // ánh sáng trên đầu
  const haloGeo = new THREE.TorusGeometry(0.3, 0.025, 8, 24);
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.55 });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.position.y = 0.95;
  halo.rotation.x = Math.PI / 2;
  g.add(halo);

  return g;
}

export function setAura(active) {
  auraOn = !!active;
}

export function dispose() {
  if (rafId) cancelAnimationFrame(rafId);
  window.removeEventListener('resize', onResize);
}
